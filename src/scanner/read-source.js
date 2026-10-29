import { findFeedLinks, readFeed } from "./feed.js";
import { readPage } from "./page.js";

const TIMEOUT_MS = 20_000;

// A browser's User-Agent: some sites turn away anything else.
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

// Common feed addresses, tried only when the page itself shows no stories (e.g. it's built with JavaScript).
const GUESSED_FEEDS = ["feed", "rss", "/feed", "/rss"];

// Reads a source's stories: from its feed when it has one, else from the page itself.
// Returns { stories, readFrom: "feed" | "page" | null, feedUrl }. Throws if the page can't be fetched.
export async function readSource(source) {
  if (source.feed_url) {
    const stories = await tryFeed(source.feed_url);
    if (stories) return { stories, readFrom: "feed", feedUrl: source.feed_url };
  }

  const page = await fetchText(source.url);

  // The address is itself a feed.
  const ownFeed = readFeed(page.text, page.url);
  if (ownFeed?.length) return { stories: ownFeed, readFrom: "feed", feedUrl: source.url };

  for (const feedUrl of findFeedLinks(page.text, page.url)) {
    const stories = await tryFeed(feedUrl);
    if (stories) return { stories, readFrom: "feed", feedUrl };
  }

  const pageStories = readPage(page.text, page.url);
  if (pageStories.length) return { stories: pageStories, readFrom: "page", feedUrl: null };

  // "feed" is next to the page (news/feed), "/feed" at the site's root. A trailing slash makes the first kind work.
  const base = page.url.endsWith("/") ? page.url : page.url + "/";
  for (const guess of GUESSED_FEEDS) {
    const feedUrl = new URL(guess, base).toString();
    const stories = await tryFeed(feedUrl);
    if (stories) return { stories, readFrom: "feed", feedUrl };
  }

  return { stories: [], readFrom: null, feedUrl: null };
}

// The feed's stories, or null if it can't be fetched, isn't a feed, or is empty.
async function tryFeed(feedUrl) {
  try {
    const feed = await fetchText(feedUrl);
    const stories = readFeed(feed.text, feed.url);
    return stories?.length ? stories : null;
  } catch {
    return null;
  }
}

// The text and final address (after redirects), which relative links are read against.
async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return { text: await response.text(), url: response.url };
}
