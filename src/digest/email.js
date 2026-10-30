// The digest email: one section per watch list with its new stories (5 at most) and its failing sources.
// Every link opens Wirescout, never the source site: a story opens its own page in the app, with the
// Share menu, so the activity stays in the app.

// Stories shown per list: "See all new stories on Wirescout" opens the rest.
export const STORIES_PER_LIST = 5;
const SUMMARY_LENGTH = 200;

// Inline styles: email apps drop style sheets. Apple's web blue, and a red with 6:1 contrast on white.
const BLUE = "#0071e3";
const RED = "#c81e1e";
const TEXT = "#1d1d1f";
const MUTED = "#6e6e73";
const LINE = "#e5e5ea";
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
// The text-style warning sign (U+FE0E): as an emoji it would turn yellow and ignore the red.
const WARNING = "⚠︎";

// lists: [{ id, name, newCount, problemCount, stories: [{ id, title, summary, source, date }] }],
// stories newest first, at most STORIES_PER_LIST. date is an ISO string.
// profile: digest_time ("07:15:00") and time_zone, for the dates and the footer.
export function buildDigest({ lists, profile, appUrl }) {
  const sections = lists.filter((list) => list.newCount > 0 || list.problemCount > 0);
  const totalNew = sections.reduce((total, list) => total + list.newCount, 0);
  const listsWithNew = sections.filter((list) => list.newCount > 0).length;
  const dateFormat = new Intl.DateTimeFormat("en-GB", {
    timeZone: profile.time_zone,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const links = {
    dashboard: `${appUrl}/`,
    list: (list) => `${appUrl}/lists/${list.id}`,
    sources: (list) => `${appUrl}/lists/${list.id}?tab=sources`,
    story: (list, story) => `${appUrl}/lists/${list.id}/stories/${story.id}`,
    settings: `${appUrl}/settings/digest`,
  };
  const subject = `Wirescout: ${plural(totalNew, "new story", "new stories")} in ${plural(listsWithNew, "watch list", "watch lists")}`;
  const footer = `Sent Monday to Friday at ${profile.digest_time.slice(0, 5)} (${profile.time_zone}).`;

  return {
    subject,
    text: buildText({ sections, links, footer, dateFormat }),
    html: buildHtml({ sections, links, footer, dateFormat, subject }),
  };
}

function buildText({ sections, links, footer, dateFormat }) {
  const blocks = sections.map((list) => {
    const lines = [`${list.name.toUpperCase()} · ${newStories(list)}`];
    if (list.problemCount > 0) {
      lines.push(`${WARNING} ${problems(list)}: ${links.sources(list)}`);
    }
    for (const story of list.stories) {
      lines.push("", story.title, `${story.source} · ${dateFormat.format(new Date(story.date))}`, links.story(list, story));
    }
    if (list.newCount > 0) {
      lines.push("", `${seeAll(list)}: ${links.list(list)}`);
    }
    return lines.join("\n");
  });

  return `Wirescout: ${links.dashboard}\n\n${blocks.join("\n\n---\n\n")}\n\n---\n\n${footer}\nChange the time or turn it off: ${links.settings}\n`;
}

function buildHtml({ sections, links, footer, dateFormat, subject }) {
  const blocks = sections.map((list) => {
    const warning =
      list.problemCount > 0
        ? `<a href="${links.sources(list)}" style="color: ${RED}; font-weight: 600; text-decoration: none;">${WARNING} ${problems(list)}</a>`
        : "";
    const stories = list.stories
      .map(
        (story) => `
          <tr><td style="padding: 12px 0; border-bottom: 1px solid ${LINE};">
            <div style="font-size: 13px; color: ${MUTED};">${escape(story.source)} · ${dateFormat.format(new Date(story.date))}</div>
            <a href="${links.story(list, story)}" style="display: block; margin-top: 4px; font-size: 16px; font-weight: 600; color: ${BLUE}; text-decoration: none;">${escape(story.title)}</a>
            ${story.summary ? `<div style="margin-top: 4px; font-size: 14px; color: ${TEXT};">${escape(shorten(story.summary))}</div>` : ""}
          </td></tr>`,
      )
      .join("");
    // A full-width button made of a table cell, so Outlook shows it as a button too.
    const button =
      list.newCount > 0
        ? `<tr><td style="padding-top: 20px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" bgcolor="${BLUE}" style="border-radius: 8px;">
                <a href="${links.list(list)}" style="display: block; padding: 14px 16px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none;">${escape(seeAll(list))}</a>
              </td></tr>
            </table>
          </td></tr>`
        : "";

    // Each list in its own card, with a gap above it.
    return `
      <tr><td style="padding-top: 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 12px;">
          <tr><td style="padding: 24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td valign="top">
                  <a href="${links.list(list)}" style="font-size: 20px; font-weight: 700; line-height: 1.3; color: ${TEXT}; text-decoration: none;">${escape(list.name)}</a>
                  <div style="margin-top: 2px; font-size: 14px; color: ${MUTED};">${newStories(list)}</div>
                </td>
                <td valign="top" align="right" style="padding: 4px 0 0 12px; font-size: 14px; white-space: nowrap;">${warning}</td>
              </tr>
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${stories}${button}</table>
          </td></tr>
        </table>
      </td></tr>`;
  });

  // The brand and the footer sit on the grey background, outside the cards.
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(subject)}</title></head>
<body style="margin: 0; padding: 0; background: #f5f5f7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f7;">
    <tr><td align="center" style="padding: 24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; font-family: ${FONT}; color: ${TEXT};">
        <tr><td style="padding: 0 4px;">
          <a href="${links.dashboard}" style="font-size: 22px; font-weight: 700; color: ${TEXT}; text-decoration: none;">Wirescout</a>
        </td></tr>
        ${blocks.join("")}
        <tr><td style="padding: 20px 4px 0; font-size: 13px; color: ${MUTED};">
          ${escape(footer)} <a href="${links.settings}" style="color: ${MUTED};">Change the time or turn it off</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`;
}

function newStories(list) {
  return list.newCount > 0 ? plural(list.newCount, "new story", "new stories") : "No new stories";
}

function seeAll(list) {
  return `See all new ${list.name} stories on Wirescout`;
}

function problems(list) {
  return plural(list.problemCount, "problematic source", "problematic sources");
}

function plural(count, one, many) {
  return `${count} ${count === 1 ? one : many}`;
}

// Cut at a word, so a long summary stays a preview.
function shorten(text) {
  if (text.length <= SUMMARY_LENGTH) return text;
  return `${text.slice(0, SUMMARY_LENGTH).replace(/\s+\S*$/, "")}…`;
}

function escape(text) {
  return text.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);
}
