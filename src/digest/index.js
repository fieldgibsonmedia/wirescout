// The daily digest: every 15 minutes, emails each user whose digest is due the new stories in their watch
// lists (through the keywords, as in the app) and the sources that fail. No email when nothing is new.
// The logs only show totals: the repo is public, and who reads what is theirs.
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { isDue, safeTimeZone, since } from "./due.js";
import { buildDigest, STORIES_PER_LIST } from "./email.js";

const CONFIG = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY,
  emailHost: process.env.EMAIL_HOST,
  emailPort: process.env.EMAIL_PORT,
  emailUser: process.env.EMAIL_USER,
  emailPass: process.env.EMAIL_PASS,
  appUrl: process.env.APP_URL,
};

// The secret key bypasses row-level security: the digest reads every user's lists.
const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseSecretKey, {
  auth: { persistSession: false },
});

const transporter = nodemailer.createTransport({
  host: CONFIG.emailHost,
  port: Number(CONFIG.emailPort),
  secure: Number(CONFIG.emailPort) === 465,
  auth: CONFIG.emailUser ? { user: CONFIG.emailUser, pass: CONFIG.emailPass } : undefined,
});

// The user's watch lists, each with its new stories (since → now) and its failing sources.
async function loadLists(profile, from, now) {
  const { data: lists, error } = await supabase
    .from("watch_lists")
    .select("id, name, watch_list_sources (sources (id, url, name, last_checked_at, stories_found))")
    .eq("user_id", profile.id)
    .order("created_at");
  if (error) throw error;

  return Promise.all(
    lists.map(async (list) => {
      const sources = list.watch_list_sources.map((link) => link.sources);
      const stories = await supabase
        .from("watch_list_articles")
        .select("id, title, summary, published_at, first_seen_at, source_id", { count: "exact" })
        .eq("watch_list_id", list.id)
        .gt("first_seen_at", from.toISOString())
        .lte("first_seen_at", now.toISOString())
        .order("first_seen_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(STORIES_PER_LIST);
      if (stories.error) throw stories.error;

      return {
        id: list.id,
        name: list.name,
        newCount: stories.count,
        // Failing as in the app's Sources tab: checked, and no stories found.
        problemCount: sources.filter((source) => source.last_checked_at && !source.stories_found).length,
        stories: stories.data.map((story) => ({
          id: story.id,
          title: story.title,
          summary: story.summary,
          source: sourceLabel(sources.find((source) => source.id === story.source_id)),
          date: story.published_at ?? story.first_seen_at,
        })),
      };
    }),
  );
}

// As in the app: the source's name, or its site.
function sourceLabel(source) {
  return source.name ?? new URL(source.url).hostname.replace(/^www\./, "");
}

// Sends one user's digest if anything is new, then records it as done for today. Returns whether it sent one.
async function sendDigest(profile, now) {
  const lists = await loadLists(profile, since(profile, now), now);
  const sent = lists.some((list) => list.newCount > 0);
  if (sent) {
    const email = buildDigest({ lists, profile, appUrl: CONFIG.appUrl });
    await transporter.sendMail({
      from: `Wirescout <${CONFIG.emailUser || "digest@wirescout.local"}>`,
      to: profile.email,
      ...email,
    });
  }

  // "now", not the end of the run: stories a scan saves while this runs go in the next digest.
  const updated = await supabase.from("profiles").update({ last_digest_at: now.toISOString() }).eq("id", profile.id);
  if (updated.error) throw updated.error;
  return sent;
}

const now = new Date();
const { data: profiles, error } = await supabase
  .from("profiles")
  .select("id, email, digest_time, time_zone, last_digest_at")
  .not("digest_time", "is", null);
if (error) throw error;

const due = profiles
  .map((profile) => ({ ...profile, time_zone: safeTimeZone(profile.time_zone) }))
  .filter((profile) => isDue(profile, now));

let sent = 0;
let failed = 0;
// One at a time: a handful of emails, and Gmail dislikes bursts.
for (const profile of due) {
  try {
    if (await sendDigest(profile, now)) sent++;
  } catch (sendError) {
    failed++;
    // The code only: an email server's message can include the address.
    console.error(`Couldn't send a digest: ${sendError.code ?? sendError.name}`);
  }
}

console.log(`Digests: ${due.length} due, ${sent} sent, ${due.length - sent - failed} with nothing new, ${failed} failed.`);

// A failed digest isn't marked as done, so the next run retries it. It also fails the run, so GitHub shows it
// in red and emails the repo owner.
if (failed) process.exitCode = 1;
