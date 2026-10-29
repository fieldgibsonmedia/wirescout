// The scanner: reads every followed source, saves the stories it hasn't seen before, records each
// source's status, and emails the developer about sources that broke. It sends nothing to journalists.
// The logs only show totals: the repo is public, and which sources people follow is theirs.
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { readSource } from "./read-source.js";
import { findProblem, sendHealthEmail } from "./health.js";

// Sources read at the same time: enough to finish in a few minutes, few enough to be polite.
const PARALLEL = 4;

const CONFIG = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY,
  emailHost: process.env.EMAIL_HOST,
  emailPort: process.env.EMAIL_PORT,
  emailUser: process.env.EMAIL_USER,
  emailPass: process.env.EMAIL_PASS,
  adminEmail: process.env.ADMIN_EMAIL,
};

// The secret key bypasses row-level security: the scanner writes stories and status for every user's sources.
const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseSecretKey, {
  auth: { persistSession: false },
});

// Checks one source and saves the result. Returns its problem for the health email, or null.
async function checkSource(source) {
  let result;
  let error = null;
  try {
    result = await readSource(source);
  } catch (readError) {
    error = readError.cause?.code ?? readError.message;
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
    })
    .eq("id", source.id);
  if (updated.error) throw updated.error;

  const problem = findProblem(source.stories_found, result.stories.length);
  return {
    found: result.stories.length,
    saved,
    problem: problem && {
      url: source.url,
      problem,
      storiesBefore: source.stories_found,
      storiesNow: result.stories.length,
      error,
    },
  };
}

// Only the sources that at least one watch list follows.
const { data: sources, error } = await supabase
  .from("sources")
  .select("id, url, feed_url, read_from, stories_found, watch_list_sources!inner(source_id)");
if (error) throw error;

const results = [];
let next = 0;
let failed = 0;
async function worker() {
  while (next < sources.length) {
    const source = sources[next++];
    try {
      results.push(await checkSource(source));
    } catch (saveError) {
      failed++;
      console.error(`Couldn't save a source's check: ${saveError.message}`);
    }
  }
}
await Promise.all(Array.from({ length: PARALLEL }, worker));

const working = results.filter((result) => result.found > 0).length;
const newStories = results.reduce((total, result) => total + result.saved, 0);
console.log(
  `Checked ${sources.length} sources: ${working} working, ${results.length - working} with no stories, ` +
    `${failed} not saved. ${newStories} new stories.`,
);

const problems = results.map((result) => result.problem).filter(Boolean);
if (problems.length && CONFIG.adminEmail) {
  await sendHealthEmail(problems, CONFIG);
  console.log("Health email sent.");
} else if (problems.length) {
  console.log("Some sources need a look, but no ADMIN_EMAIL is set, so no health email was sent.");
}

// A failed save fails the run, so GitHub shows it in red and emails the repo owner.
if (failed) process.exitCode = 1;
