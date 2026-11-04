// Checks one source and saves what it found: its new stories and its status. The hourly scanner runs it
// for every followed source, and the scan-new-sources function for a source just added, so the first
// stories show right away. supabase must use the secret key: only the scanner writes stories and status.
import { readProblem, readSource } from "./read-source.js";

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

  // Stories already saved are skipped, so only new ones are returned.
  // Saved oldest first: stories found in the same check show newest first in the app, which breaks ties by id.
  let saved = 0;
  if (result.stories.length) {
    const inserted = await supabase
      .from("articles")
      .upsert(
        result.stories.toReversed().map((story) => ({ source_id: source.id, ...story })),
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
    error,
  };
}
