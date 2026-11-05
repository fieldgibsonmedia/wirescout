// The scanner: reads every followed source, saves the stories it hasn't seen before, records each
// source's status, and emails the developer about sources that broke. It sends nothing to journalists.
// The logs only show totals: the repo is public, and which sources people follow is theirs.
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { checkSource } from "./check-source.js";
import { findScannerBreak, sendHealthEmail } from "./health.js";
import { labelDocuments } from "./label-documents.js";

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
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
};

// The secret key bypasses row-level security: the scanner writes stories and status for every user's sources.
const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseSecretKey, {
  auth: { persistSession: false },
});

// Only the sources that at least one watch list follows.
const { data: sources, error } = await supabase
  .from("sources")
  .select("id, url, kind, feed_url, read_from, stories_found, last_checked_at, watch_list_sources!inner(source_id)");
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
const brokenLinks = results.reduce((total, result) => total + result.broken, 0);
console.log(
  `Checked ${sources.length} sources: ${working} working, ${results.length - working} with no stories, ` +
    `${failed} not saved. ${newStories} new stories, ${brokenLinks} broken links left out.`,
);

const scannerBreak = findScannerBreak(results);
if (scannerBreak && CONFIG.adminEmail) {
  await sendHealthEmail(scannerBreak, CONFIG);
  console.log("The scanner may be broken: health email sent.");
} else if (scannerBreak) {
  console.log("The scanner may be broken, but no ADMIN_EMAIL is set, so no health email was sent.");
}

// Documents lists: the PDFs found this run (and any left from before) get their label.
// After the health check, so a labelling problem never stops the health email.
const anthropic = CONFIG.anthropicApiKey ? new Anthropic({ apiKey: CONFIG.anthropicApiKey, maxRetries: 1, timeout: 60_000 }) : null;
const labels = await labelDocuments(supabase, anthropic);
console.log(
  anthropic
    ? `Labelled ${labels.labelled} documents, ${labels.failed} left for the next run.`
    : "No ANTHROPIC_API_KEY: documents weren't labelled.",
);

// A failed save fails the run, so GitHub shows it in red and emails the repo owner.
if (failed) process.exitCode = 1;
