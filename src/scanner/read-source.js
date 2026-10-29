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
// signal (optional) stops every fetch at once, e.g. when a link check runs out of time.
export async function readSource(source, signal) {
  if (source.feed_url) {
    const stories = await tryFeed(source.feed_url, signal);
    if (stories) return { stories, readFrom: "feed", feedUrl: source.feed_url };
  }

  const page = await fetchText(source.url, signal);

  // The address is itself a feed.
  const ownFeed = readFeed(page.text, page.url);
  if (ownFeed?.length) return { stories: ownFeed, readFrom: "feed", feedUrl: source.url };

  for (const feedUrl of findFeedLinks(page.text, page.url)) {
    const stories = await tryFeed(feedUrl, signal);
    if (stories) return { stories, readFrom: "feed", feedUrl };
  }

  const pageStories = readPage(page.text, page.url);
  if (pageStories.length) return { stories: pageStories, readFrom: "page", feedUrl: null };

  // "feed" is next to the page (news/feed), "/feed" at the site's root. A trailing slash makes the first kind work.
  const base = page.url.endsWith("/") ? page.url : page.url + "/";
  for (const guess of GUESSED_FEEDS) {
    const feedUrl = new URL(guess, base).toString();
    const stories = await tryFeed(feedUrl, signal);
    if (stories) return { stories, readFrom: "feed", feedUrl };
  }

  return { stories: [], readFrom: null, feedUrl: null };
}

// Why a source couldn't be read, from the error readSource threw, for the app to show:
// "not_found", "blocked", "unreachable", or null for anything else.
export function readProblem(error) {
  if ([404, 410].includes(error.status)) return "not_found";
  if ([401, 403, 429].includes(error.status)) return "blocked";
  // fetch fails with a TypeError on connection and certificate errors (Node and Deno alike),
  // and with a TimeoutError when the site is too slow.
  if (error.status >= 500 || error instanceof TypeError || error.name === "TimeoutError") return "unreachable";
  return null;
}

// The feed's stories, or null if it can't be fetched, isn't a feed, or is empty.
async function tryFeed(feedUrl, signal) {
  try {
    const feed = await fetchText(feedUrl, signal);
    const stories = readFeed(feed.text, feed.url);
    return stories?.length ? stories : null;
  } catch {
    return null;
  }
}

// The text and final address (after redirects), which relative links are read against.
async function fetchText(url, signal) {
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
    signal: signal ? AbortSignal.any([timeout, signal]) : timeout,
  });
  if (!response.ok) throw Object.assign(new Error(`HTTP ${response.status}`), { status: response.status });
  return { text: await response.text(), url: response.url };
}
