// The scanner: reads every followed source, saves the stories it hasn't seen before, records each
// source's status, and emails the developer about sources that broke. It sends nothing to journalists.
// The logs only show totals: the repo is public, and which sources people follow is theirs.
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { checkSource } from "./check-source.js";
import { findScannerBreak, sendHealthEmail } from "./health.js";

// Sources read at the same time: enough to finish in a few minutes, few enough to be polite.
const PARALLEL = 4;

const CONFIG = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY,
  emailHost: process.env.EMAIL_HOST,
  emailPort: process.env.EMAIL_PORT,
  emailUser: process.env.EMAIL_USER,
  emailPass: process.env.EMAIL_PASS,
  emailFrom: process.env.EMAIL_FROM,
  adminEmail: process.env.ADMIN_EMAIL,
};

// The secret key bypasses row-level security: the scanner writes stories and status for every user's sources.
const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseSecretKey, {
  auth: { persistSession: false },
});

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
      results.push(await checkSource(supabase, source));
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

const scannerBreak = findScannerBreak(results);
if (scannerBreak && CONFIG.adminEmail) {
  await sendHealthEmail(scannerBreak, CONFIG);
  console.log("The scanner may be broken: health email sent.");
} else if (scannerBreak) {
  console.log("The scanner may be broken, but no ADMIN_EMAIL is set, so no health email was sent.");
}

// A failed save fails the run, so GitHub shows it in red and emails the repo owner.
if (failed) process.exitCode = 1;
