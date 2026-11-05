// Checks one source and saves what it found: its new stories and its status. The hourly scanner runs it
// for every followed source, and the scan-new-sources function for a source just added, so the first
// stories show right away. supabase must use the secret key: only the scanner writes stories and status.
import { reuploadKey } from "./documents.js";
import { readProblem, readSource, withoutBrokenLinks } from "./read-source.js";

// Links looked up per query: they travel in the request's address, which has a size limit.
const LOOKUP_BATCH = 25;

// Returns its counts, for the totals and the health check.
export async function checkSource(supabase, source) {
  let result;
  let error = null;
  let readFailure = null;
  try {
    result = await readSource(source);
  } catch (readError) {
    error = readError.cause?.code ?? readError.message;
    readFailure = readProblem(readError);
    // Keep the feed found earlier: the site may be down for a moment.
    result = { stories: [], readFrom: source.read_from, feedUrl: source.feed_url };
  }

  // A documents source's first check finds what was already on the page: kept, but not news.
  const firstCheck = source.kind === "documents" && !source.last_checked_at;

  // Each new link is opened once before it's saved: one the site says doesn't exist waits for the next scan,
  // so nobody gets a broken link.
  const newStories = await unsavedStories(supabase, source.id, result.stories);
  const working = await withoutBrokenLinks(newStories);

  // A PDF put up again under a new file name is kept, but isn't news either.
  const reuploads = source.kind === "documents" && !firstCheck && working.length ? await savedKeys(supabase, source.id) : new Set();

  // Saved oldest first: stories found in the same check show newest first in the app, which breaks ties by id.
  let saved = 0;
  if (working.length) {
    const inserted = await supabase
      .from("articles")
      .upsert(
        working.toReversed().map((story) => ({
          source_id: source.id,
          ...story,
          found_on_first_check: firstCheck,
          is_reupload: reuploads.has(reuploadKey(story)),
        })),
        { onConflict: "source_id,url", ignoreDuplicates: true },
      )
      .select("id");
    if (inserted.error) throw inserted.error;
    saved = inserted.data.length;
  }

  const updated = await supabase
    .from("sources")
    .update({
      last_checked_at: new Date().toISOString(),
      stories_found: result.stories.length,
      read_from: result.readFrom,
      feed_url: result.feedUrl,
      problem: readFailure,
    })
    .eq("id", source.id);
  if (updated.error) throw updated.error;

  return {
    found: result.stories.length,
    saved,
    url: source.url,
    storiesBefore: source.stories_found,
    storiesNow: result.stories.length,
    broken: newStories.length - working.length,
    error,
  };
}

// The re-upload keys of every PDF this source has saved, read a page at a time (Supabase sends 1,000 rows at most).
async function savedKeys(supabase, sourceId) {
  const keys = new Set();
  for (let start = 0; ; start += 1000) {
    const { data, error } = await supabase
      .from("articles")
      .select("title, url, section")
      .eq("source_id", sourceId)
      .order("id")
      .range(start, start + 999);
    if (error) throw error;
    for (const article of data) keys.add(reuploadKey(article));
    if (data.length < 1000) return keys;
  }
}

// The stories whose link this source hasn't saved yet.
async function unsavedStories(supabase, sourceId, stories) {
  const saved = new Set();
  for (let start = 0; start < stories.length; start += LOOKUP_BATCH) {
    const urls = stories.slice(start, start + LOOKUP_BATCH).map((story) => story.url);
    const { data, error } = await supabase.from("articles").select("url").eq("source_id", sourceId).in("url", urls);
    if (error) throw error;
    for (const article of data) saved.add(article.url);
  }
  return stories.filter((story) => !saved.has(story.url));
}
