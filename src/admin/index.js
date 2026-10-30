// Emails to the Wirescout team (ADMIN_EMAIL), every hour: new access requests, and the monthly usage report
// once the month is over. Each is sent once: requests get notified_at, reports a row in usage_reports.
// The logs only show totals: the emails hold real names and addresses.
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { buildAccessRequestsEmail, buildUsageReport } from "./emails.js";
import { nextMonth, reportMonth, reportMonths } from "./months.js";

const CONFIG = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY,
  emailHost: process.env.EMAIL_HOST,
  emailPort: process.env.EMAIL_PORT,
  emailUser: process.env.EMAIL_USER,
  emailPass: process.env.EMAIL_PASS,
  adminEmail: process.env.ADMIN_EMAIL,
};

// Stories in the report's top list.
const TOP_STORIES = 5;
// Supabase returns at most 1000 rows per request: bigger tables are read in pages.
const PAGE_SIZE = 1000;

// The secret key bypasses row-level security: only it can read the usage tables.
const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseSecretKey, {
  auth: { persistSession: false },
});

const transporter = nodemailer.createTransport({
  host: CONFIG.emailHost,
  port: Number(CONFIG.emailPort),
  secure: Number(CONFIG.emailPort) === 465,
  auth: CONFIG.emailUser ? { user: CONFIG.emailUser, pass: CONFIG.emailPass } : undefined,
});

function send(email) {
  return transporter.sendMail({
    from: `Wirescout <${CONFIG.emailUser || "admin@wirescout.local"}>`,
    to: CONFIG.adminEmail,
    ...email,
  });
}

// Every row of a query, page by page. query() builds the query afresh for each page.
async function selectAll(query) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await query().range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE_SIZE) return rows;
  }
}

async function sendAccessRequests() {
  const { data: requests, error } = await supabase
    .from("access_requests")
    .select("id, name, email, reason, created_at")
    .is("notified_at", null)
    .is("handled_at", null)
    .order("created_at");
  if (error) throw error;
  if (!requests.length) return 0;

  await send(buildAccessRequestsEmail(requests));
  const updated = await supabase
    .from("access_requests")
    .update({ notified_at: new Date().toISOString() })
    .in("id", requests.map((request) => request.id));
  if (updated.error) throw updated.error;
  return requests.length;
}

// Returns whether a report was sent.
async function sendUsageReport(now) {
  const month = reportMonth(now);
  const sent = await supabase.from("usage_reports").select("month").eq("month", `${month}-01`).maybeSingle();
  if (sent.error) throw sent.error;
  if (sent.data) return false;

  const months = reportMonths(month);
  const start = `${months[0]}-01`;
  const monthStart = `${month}-01`;
  const monthEnd = `${nextMonth(month)}-01`;

  const [profiles, activeDays, events] = await Promise.all([
    selectAll(() => supabase.from("profiles").select("id, email, full_name").order("id")),
    selectAll(() => supabase.from("active_days").select("user_id, day").gte("day", start).lt("day", monthEnd).order("day")),
    selectAll(() =>
      supabase
        .from("usage_events")
        .select("user_id, action, article_id")
        .gte("created_at", monthStart)
        .lt("created_at", monthEnd)
        .order("id"),
    ),
  ]);

  const people = profiles.map((profile) => {
    const counts = {};
    for (const row of activeDays.filter((row) => row.user_id === profile.id)) {
      const key = row.day.slice(0, 7);
      counts[key] = (counts[key] ?? 0) + 1;
    }
    const own = events.filter((event) => event.user_id === profile.id);
    return {
      name: profile.full_name || profile.email,
      email: profile.email,
      activeDays: counts,
      shares: own.filter((event) => event.action.startsWith("share_")).length,
      digestClicks: own.filter((event) => event.action === "digest_click").length,
    };
  });

  const shareCounts = new Map();
  for (const event of events.filter((event) => event.action.startsWith("share_") && event.article_id)) {
    shareCounts.set(event.article_id, (shareCounts.get(event.article_id) ?? 0) + 1);
  }
  const top = [...shareCounts].sort((a, b) => b[1] - a[1]).slice(0, TOP_STORIES);
  const articles = top.length
    ? await supabase.from("articles").select("id, title, url, sources (url, name)").in("id", top.map(([id]) => id))
    : { data: [] };
  if (articles.error) throw articles.error;
  const topStories = top.map(([id, shares]) => {
    const article = articles.data.find((row) => row.id === id);
    return {
      title: article.title,
      url: article.url,
      source: article.sources.name ?? new URL(article.sources.url).hostname.replace(/^www\./, ""),
      shares,
    };
  });

  await send(buildUsageReport({ months, people, topStories }));
  const recorded = await supabase.from("usage_reports").insert({ month: monthStart });
  if (recorded.error) throw recorded.error;
  return true;
}

if (!CONFIG.adminEmail) {
  console.log("No ADMIN_EMAIL is set, so nothing was sent.");
} else {
  let failed = false;
  // Each part runs even if the other fails, and is retried by the next run.
  try {
    console.log(`Access requests: ${await sendAccessRequests()} sent.`);
  } catch (sendError) {
    failed = true;
    console.error(`Couldn't send the access requests: ${sendError.code ?? sendError.name}`);
  }
  try {
    console.log(`Usage report: ${(await sendUsageReport(new Date())) ? "sent" : "nothing due"}.`);
  } catch (sendError) {
    failed = true;
    console.error(`Couldn't send the usage report: ${sendError.code ?? sendError.name}`);
  }
  // A failure fails the run, so GitHub shows it in red and emails the repo owner.
  if (failed) process.exitCode = 1;
}
