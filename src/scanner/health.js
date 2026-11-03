import nodemailer from "nodemailer";

// The developer is emailed only when the scanner itself looks broken, not when one source does: each journalist
// sees their own failing sources in the digest and the Sources tab (Ken, 2026-11-03).
// Broken: in one scan, at least half of the sources that found stories last time find none, and at least 3 do.
// That many at once points to our side (a reader bug, GitHub's servers blocked), not to the sites.
// It's reported once: the next scan starts from the new counts, which are 0.
export const MIN_STOPPED_SOURCES = 3;

// results: one { url, storiesBefore, storiesNow } per source checked. Returns the sources that stopped finding
// stories if the scanner looks broken, or null.
export function findScannerBreak(results) {
  const workedBefore = results.filter((result) => result.storiesBefore > 0);
  const stopped = workedBefore.filter((result) => result.storiesNow === 0);
  if (stopped.length < MIN_STOPPED_SOURCES || stopped.length < workedBefore.length / 2) return null;
  return { stopped, workedBefore: workedBefore.length };
}

// One email to the developer, listing the sources that stopped in this scan.
export async function sendHealthEmail({ stopped, workedBefore }, config) {
  const lines = stopped.map(
    ({ url, storiesBefore, error }) => `- ${url}\n  0 stories, was ${storiesBefore}${error ? ` (${error})` : ""}`,
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
    subject: "Wirescout: the scanner may be broken",
    text:
      `${stopped.length} of the ${workedBefore} sources that found stories last time found none in the last scan. ` +
      `That many at once usually means a problem in the scanner, not in the sites.\n\n${lines.join("\n\n")}\n`,
  });
}
