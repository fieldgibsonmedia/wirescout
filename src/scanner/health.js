import nodemailer from "nodemailer";

// What went wrong with a source in this check, or null if nothing did.
// It's reported once, when it happens: the next checks start from the new count.
export function findProblem(storiesBefore, storiesNow) {
  if (storiesBefore === null && storiesNow === 0) return "Can't be read (first check)";
  if (storiesBefore > 0 && storiesNow === 0) return "Stopped finding stories";
  if (storiesBefore > 0 && storiesNow < storiesBefore / 2) return "Found far fewer stories than usual";
  return null;
}

// One email to the developer, listing the sources that broke in this run.
export async function sendHealthEmail(problems, config) {
  const lines = problems.map(
    ({ url, problem, storiesBefore, storiesNow, error }) =>
      `- ${url}\n  ${problem}: ${storiesNow} stories, was ${storiesBefore ?? "not checked"}${error ? ` (${error})` : ""}`,
  );

  const transporter = nodemailer.createTransport({
    host: config.emailHost,
    port: Number(config.emailPort),
    secure: Number(config.emailPort) === 465,
    auth: config.emailUser ? { user: config.emailUser, pass: config.emailPass } : undefined,
  });

  await transporter.sendMail({
    from: `Wirescout <${config.emailUser || "scanner@wirescout.local"}>`,
    to: config.adminEmail,
    subject: `Wirescout: ${problems.length} ${problems.length === 1 ? "source needs" : "sources need"} a look`,
    text: `These sources had a problem in the last scan:\n\n${lines.join("\n\n")}\n`,
  });
}
