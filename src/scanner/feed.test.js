import assert from "node:assert/strict";
import { test } from "node:test";
import { findFeedLinks, readFeed } from "./feed.js";

test("finds the feeds a page names, but not its comments feed", () => {
  const html = `<html><head>
    <link rel="alternate" type="application/rss+xml" href="/feed/">
    <link rel="alternate" type="application/rss+xml" href="/comments/feed/">
    <link rel="alternate" hreflang="de" href="/de/">
  </head><body></body></html>`;
  assert.deepEqual(findFeedLinks(html, "https://news.example.com/press"), ["https://news.example.com/feed/"]);
});

test("reads an RSS feed", () => {
  const xml = `<?xml version="1.0"?>
    <rss version="2.0"><channel><title>Example News</title>
      <item>
        <title>Insurer posts record results</title>
        <link>https://news.example.com/press/1?utm_source=rss#top</link>
        <description><![CDATA[<p>Gross premiums rose <b>12%</b>.</p>]]></description>
        <pubDate>Wed, 28 Oct 2026 09:30:00 GMT</pubDate>
      </item>
      <item>
        <title>New chief risk officer &amp; board changes</title>
        <guid>https://news.example.com/press/2</guid>
      </item>
    </channel></rss>`;
  assert.deepEqual(readFeed(xml, "https://news.example.com/feed"), [
    {
      url: "https://news.example.com/press/1",
      title: "Insurer posts record results",
      summary: "Gross premiums rose 12%.",
      published_at: "2026-10-28T09:30:00.000Z",
    },
    {
      url: "https://news.example.com/press/2",
      title: "New chief risk officer & board changes",
      summary: null,
      published_at: null,
    },
  ]);
});

test("reads an Atom feed with relative links", () => {
  const xml = `<feed xmlns="http://www.w3.org/2005/Atom">
      <entry>
        <title type="html">Consultation on climate stress tests</title>
        <link rel="alternate" href="/updates/1"/>
        <summary>Responses are due by the end of the quarter.</summary>
        <updated>2026-10-27T12:00:00Z</updated>
      </entry>
    </feed>`;
  assert.deepEqual(readFeed(xml, "https://regulator.example.org/feed.atom"), [
    {
      url: "https://regulator.example.org/updates/1",
      title: "Consultation on climate stress tests",
      summary: "Responses are due by the end of the quarter.",
      published_at: "2026-10-27T12:00:00.000Z",
    },
  ]);
});

test("drops a summary that only repeats the headline", () => {
  const xml = `<rss><channel><item>
      <title>What separates the top-performing insurers?</title>
      <link>https://news.example.com/press/3</link>
      <description>What separates the top-performing insurers...</description>
    </item></channel></rss>`;
  assert.equal(readFeed(xml, "https://news.example.com/feed")[0].summary, null);
});

test("a web page isn't a feed", () => {
  assert.equal(readFeed("<html><body><p>Hello</p></body></html>", "https://news.example.com/"), null);
});
