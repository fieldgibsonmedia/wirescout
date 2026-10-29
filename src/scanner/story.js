import * as chrono from "chrono-node";

// Stories kept per source and check: the newest ones on its feed or page.
export const MAX_STORIES = 50;

const MAX_SUMMARY_LENGTH = 300;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// The story's full web address, without the #part and utm_ tracking, so the same story isn't saved twice.
// Returns null for anything that isn't a web page (mailto:, javascript:, …).
export function cleanLink(href, baseUrl) {
  if (!href || !URL.canParse(href.trim(), baseUrl)) return null;
  const url = new URL(href.trim(), baseUrl);
  if (!["http:", "https:"].includes(url.protocol)) return null;

  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (key.startsWith("utm_")) url.searchParams.delete(key);
  }
  return url.toString();
}

export function cleanText(text) {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

// Long summaries are cut at a word, so the watch list stays easy to scan.
export function clipSummary(text) {
  const summary = cleanText(text);
  if (!summary) return null;
  if (summary.length <= MAX_SUMMARY_LENGTH) return summary;
  return summary.slice(0, MAX_SUMMARY_LENGTH).replace(/\s+\S*$/, "") + "…";
}

// A date written on a page, as an ISO string, or null if there's none.
export function parseDate(text) {
  const clean = cleanText(text);
  if (!clean) return null;

  // UK format DD/MM/YYYY: chrono would read it as American.
  const ukMatch = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ukMatch) {
    const [, day, month, year] = ukMatch;
    const date = new Date(Date.UTC(year, month - 1, day));
    return isNaN(date.getTime()) ? null : date.toISOString();
  }

  // Strict: only full dates, so "Q3" or "Monday" in a headline isn't taken for one.
  // A date in the future is an event's date, not the story's.
  const parsed = chrono.strict.parseDate(clean);
  return parsed && parsed <= Date.now() + ONE_DAY_MS ? parsed.toISOString() : null;
}

// Keeps the first story for each link, up to MAX_STORIES.
export function uniqueStories(stories) {
  const seen = new Set();
  return stories
    .filter((story) => {
      if (!story.url || !story.title || seen.has(story.url)) return false;
      seen.add(story.url);
      return true;
    })
    .slice(0, MAX_STORIES)
    .map((story) => (repeatsTitle(story) ? { ...story, summary: null } : story));
}

// Some sites use the headline (or its start, cut with "…") as the summary: that adds nothing.
function repeatsTitle({ title, summary }) {
  const core = (text) => text.replace(/[\s.…?!:]+$/, "").toLowerCase();
  return summary !== null && core(title).startsWith(core(summary));
}
