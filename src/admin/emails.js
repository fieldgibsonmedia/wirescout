// The emails to the Wirescout team (ADMIN_EMAIL): new access requests, and the monthly usage report.
// They hold real names and addresses, so they go only to the team, never to the logs.

const BLUE = "#0071e3";
const TEXT = "#1d1d1f";
const MUTED = "#6e6e73";
const LINE = "#e5e5ea";
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
// Pixels of bar per active day: a full month of weekdays (23) is about 70 px.
const BAR_PX_PER_DAY = 3;

const londonTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

// requests: [{ name, email, reason, created_at }], oldest first.
export function buildAccessRequestsEmail(requests) {
  const blocks = requests.map(
    (request) =>
      `Name: ${request.name}\nEmail: ${request.email}\nReason: ${request.reason}\nAsked: ${londonTime.format(new Date(request.created_at))} (London)`,
  );
  return {
    subject: `Wirescout: ${plural(requests.length, "new access request", "new access requests")}`,
    text:
      `${requests.length === 1 ? "Someone asked" : "These people asked"} for access to Wirescout:\n\n` +
      `${blocks.join("\n\n")}\n\n` +
      "To let someone in: Table Editor → allowed_email_domains → Insert row, with their address or domain (lower case). " +
      "Reply to them by email, then set handled_at on their request in access_requests.\n",
  };
}

// The month's name from its "2026-10" key.
export function monthName(month, length = "long") {
  return new Intl.DateTimeFormat("en-GB", { month: length, year: length === "long" ? "numeric" : undefined, timeZone: "UTC" }).format(
    new Date(`${month}-01T00:00:00Z`),
  );
}

// months: the 6 "2026-05" keys, oldest first; the last is the month reported on.
// people: [{ name, email, activeDays: { "2026-10": 12, … }, shares, digestClicks }], shares and clicks in the last month.
// topStories: [{ title, url, source, shares }], most shared first.
export function buildUsageReport({ months, people, topStories }) {
  const month = months.at(-1);
  const sorted = people.toSorted(
    (a, b) => (b.activeDays[month] ?? 0) - (a.activeDays[month] ?? 0) || a.name.localeCompare(b.name),
  );
  const subject = `Wirescout usage: ${monthName(month)}`;
  return {
    subject,
    text: buildReportText({ months, people: sorted, topStories, month }),
    html: buildReportHtml({ months, people: sorted, topStories, month, subject }),
  };
}

function buildReportText({ months, people, topStories, month }) {
  const rows = people.map(
    (person) =>
      `${person.name}: ${months.map((key) => `${monthName(key, "short")} ${person.activeDays[key] ?? 0}`).join(", ")}; ` +
      `${person.shares} shares, ${person.digestClicks} digest clicks`,
  );
  const stories = topStories.length
    ? topStories.map((story, index) => `${index + 1}. ${story.title} (${story.source}), shared ${times(story.shares)}\n   ${story.url}`)
    : [`No stories shared in ${monthName(month)}.`];

  return (
    `Active days per person, then shares and digest clicks in ${monthName(month)}:\n\n${rows.join("\n")}\n\n` +
    `Most shared stories in ${monthName(month)}:\n\n${stories.join("\n")}\n\n${legend()}\n`
  );
}

function buildReportHtml({ months, people, topStories, month, subject }) {
  const cell = `padding: 8px 6px; border-bottom: 1px solid ${LINE}; font-size: 13px;`;
  const header = `<tr>
    <th align="left" style="${cell} color: ${MUTED}; font-weight: 600;">Person</th>
    ${months.map((key) => `<th align="left" style="${cell} color: ${MUTED}; font-weight: 600;">${monthName(key, "short")}</th>`).join("")}
    <th align="right" style="${cell} color: ${MUTED}; font-weight: 600;">Shares</th>
    <th align="right" style="${cell} color: ${MUTED}; font-weight: 600;">Digest clicks</th>
  </tr>`;
  const rows = people
    .map(
      (person) => `<tr>
        <td style="${cell}"><div style="font-weight: 600;">${escape(person.name)}</div>${person.name === person.email ? "" : `<div style="color: ${MUTED};">${escape(person.email)}</div>`}</td>
        ${months.map((key) => `<td style="${cell}">${bar(person.activeDays[key] ?? 0)}</td>`).join("")}
        <td align="right" style="${cell}">${person.shares}</td>
        <td align="right" style="${cell}">${person.digestClicks}</td>
      </tr>`,
    )
    .join("");
  const stories = topStories.length
    ? `<ol style="margin: 0; padding-left: 20px;">${topStories
        .map(
          (story) => `<li style="margin-bottom: 8px; font-size: 14px;">
            <a href="${escape(story.url)}" style="color: ${BLUE}; font-weight: 600; text-decoration: none;">${escape(story.title)}</a>
            <div style="color: ${MUTED}; font-size: 13px;">${escape(story.source)} · shared ${times(story.shares)}</div>
          </li>`,
        )
        .join("")}</ol>`
    : `<p style="margin: 0; font-size: 14px; color: ${MUTED};">No stories shared in ${monthName(month)}.</p>`;

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(subject)}</title></head>
<body style="margin: 0; padding: 0; background: #f5f5f7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f7;">
    <tr><td align="center" style="padding: 24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 760px; font-family: ${FONT}; color: ${TEXT};">
        <tr><td style="padding: 0 4px 16px; font-size: 22px; font-weight: 700;">${escape(subject)}</td></tr>
        <tr><td style="padding: 24px; background: #ffffff; border-radius: 12px;">
          <div style="font-size: 17px; font-weight: 700;">Active days per person</div>
          <div style="margin: 2px 0 12px; font-size: 13px; color: ${MUTED};">Shares and digest clicks are for ${monthName(month)}.</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${header}${rows}</table>
        </td></tr>
        <tr><td style="height: 16px;"></td></tr>
        <tr><td style="padding: 24px; background: #ffffff; border-radius: 12px;">
          <div style="margin-bottom: 12px; font-size: 17px; font-weight: 700;">Most shared stories in ${monthName(month)}</div>
          ${stories}
        </td></tr>
        <tr><td style="padding: 20px 4px 0; font-size: 13px; color: ${MUTED};">${escape(legend())}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`;
}

// The number, with a bar made of a table cell (email apps ignore most CSS widths, but not a cell's).
function bar(days) {
  const fill = days
    ? `<td width="${days * BAR_PX_PER_DAY}" height="8" bgcolor="${BLUE}" style="font-size: 0; line-height: 0;">&nbsp;</td>`
    : "";
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr>${fill}<td style="padding-left: ${days ? 6 : 0}px; font-size: 13px;">${days}</td></tr></table>`;
}

function legend() {
  return "Active days: days the person opened Wirescout. Shares: LinkedIn, Email and Copy link. Digest clicks: links opened from the daily digest.";
}

function times(count) {
  return count === 1 ? "once" : `${count} times`;
}

function plural(count, one, many) {
  return `${count} ${count === 1 ? one : many}`;
}

function escape(text) {
  return String(text).replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);
}
