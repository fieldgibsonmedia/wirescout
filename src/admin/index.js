// Emails to the Wirescout team (ADMIN_EMAIL), every hour: new access requests, each once (notified_at).
// Usage is in Settings → Manager → Analytics (PostHog) since v0.5.0, which replaced the monthly usage report.
// The logs only show totals: the emails hold real names and addresses.
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { buildAccessRequestsEmail } from "./emails.js";

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

// The secret key bypasses row-level security: only it can read the access requests.
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
    from: `Wirescout <${CONFIG.emailFrom || "admin@wirescout.local"}>`,
    to: CONFIG.adminEmail,
    ...email,
  });
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

if (!CONFIG.adminEmail) {
  console.log("No ADMIN_EMAIL is set, so nothing was sent.");
} else {
  try {
    console.log(`Access requests: ${await sendAccessRequests()} sent.`);
  } catch (sendError) {
    console.error(`Couldn't send the access requests: ${sendError.code ?? sendError.name}`);
    // A failure fails the run, so GitHub shows it in red and emails the repo owner. The next run retries.
    process.exitCode = 1;
  }
}
