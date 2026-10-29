import * as cheerio from "cheerio";
import { cleanLink, cleanText, clipSummary, parseDate, uniqueStories } from "./story.js";

// The feeds a page names in its <head>, e.g. <link rel="alternate" type="application/rss+xml" href="/feed">.
export function findFeedLinks(html, pageUrl) {
  const $ = cheerio.load(html);
  return $('link[rel~="alternate"][type]')
    .filter((_, link) => /rss|atom/i.test($(link).attr("type")))
    .map((_, link) => cleanLink($(link).attr("href"), pageUrl))
    .get()
    // WordPress also links a feed of comments: those aren't stories.
    .filter((url) => url && !/comments/i.test(url));
}

// The stories in an RSS or Atom feed, or null if the text isn't a feed.
export function readFeed(xml, feedUrl) {
  const $ = cheerio.load(xml, { xml: true });
  if ($("rss, feed, rdf\\:RDF").length === 0) return null;

  const stories = $("channel > item, rdf\\:RDF > item, feed > entry")
    .map((_, item) => {
      const $item = $(item);
      const field = (names) => $item.children(names).first().text();
      return {
        url: cleanLink(findLink($item), feedUrl),
        title: cleanText(plainText(field("title"))),
        summary: clipSummary(plainText(field("description, summary, content"))),
        published_at: feedDate(field("pubDate, published, updated, dc\\:date")),
      };
    })
    .get();

  return uniqueStories(stories);
}

// RSS has <link>url</link>, Atom has <link rel="alternate" href="url"/>, and some RSS feeds only a <guid>.
function findLink($item) {
  const atomLink = $item.children('link[rel="alternate"], link:not([rel])').attr("href");
  if (atomLink) return atomLink;

  const rssLink = $item.children("link").first().text();
  if (rssLink) return rssLink;

  const guid = $item.children("guid").first();
  return guid.attr("isPermaLink") === "false" ? null : guid.text();
}

// Feed titles and summaries often hold HTML: keep only its text.
function plainText(html) {
  return cheerio.load(html).text();
}

// Feeds use standard date formats, which Date reads directly.
function feedDate(text) {
  const date = new Date(cleanText(text));
  return isNaN(date.getTime()) ? parseDate(text) : date.toISOString();
}
