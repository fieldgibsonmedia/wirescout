import assert from "node:assert/strict";
import { test } from "node:test";
import { feedMatchesPage, readProblem, readSource } from "./read-source.js";

const httpError = (status) => Object.assign(new Error(`HTTP ${status}`), { status });

test("tells why a source couldn't be read", () => {
  assert.equal(readProblem(httpError(404)), "not_found");
  assert.equal(readProblem(httpError(410)), "not_found");
  assert.equal(readProblem(httpError(401)), "blocked");
  assert.equal(readProblem(httpError(403)), "blocked");
  assert.equal(readProblem(httpError(429)), "blocked");
  assert.equal(readProblem(httpError(500)), "unreachable");
  assert.equal(readProblem(httpError(503)), "unreachable");
});

test("a site that's down or too slow can't be reached", () => {
  const certificateError = new TypeError("fetch failed", { cause: Object.assign(new Error(), { code: "CERT_HAS_EXPIRED" }) });
  assert.equal(readProblem(certificateError), "unreachable");
  // Deno, where the check-links function runs, gives no cause.
  assert.equal(readProblem(new TypeError("error sending request: invalid peer certificate: Expired")), "unreachable");
  assert.equal(readProblem(new DOMException("The operation was aborted due to timeout", "TimeoutError")), "unreachable");
});

test("other errors have no reason", () => {
  assert.equal(readProblem(httpError(400)), null);
  assert.equal(readProblem(new Error("Something else")), null);
});

// A press page with 4 stories, naming a feed in its <head>.
const PAGE_URL = "https://www.example.com/press";
const PRESS_PAGE = `<html><head><link rel="alternate" type="application/rss+xml" href="/feed"></head><body><main>
  ${[1, 2, 3, 4].map((n) => `<article><h2><a href="/press/${n}">Press release number ${n} about the quarterly results</a></h2></article>`).join("")}
</main></body></html>`;

const feedOf = (paths) => `<rss><channel>${paths
  .map((path) => `<item><title>Story at ${path}</title><link>http://example.com${path}</link></item>`)
  .join("")}</channel></rss>`;

// Answers each address from a fixed list, like the sites would.
function withSites(sites, run) {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const response = url in sites ? new Response(sites[url]) : new Response("Not found", { status: 404 });
    // A real answer carries its address (after redirects).
    return Object.defineProperty(response, "url", { value: url });
  };
  return run().finally(() => {
    globalThis.fetch = realFetch;
  });
}

test("a site-wide feed that doesn't match the page is left out: the page is read", () =>
  withSites({ [PAGE_URL]: PRESS_PAGE, "https://www.example.com/feed": feedOf(["/blog/1", "/blog/2", "/press/1"]) }, async () => {
    const result = await readSource({ url: PAGE_URL, feed_url: "https://www.example.com/feed" });
    assert.equal(result.readFrom, "page");
    assert.equal(result.feedUrl, null);
    assert.equal(result.stories.length, 4);
  }));

test("a feed that matches the page is read, links written differently or not", () =>
  withSites({ [PAGE_URL]: PRESS_PAGE, "https://www.example.com/feed": feedOf(["/press/1", "/press/2/", "/press/3"]) }, async () => {
    const result = await readSource({ url: PAGE_URL, feed_url: null });
    assert.equal(result.readFrom, "feed");
    assert.equal(result.feedUrl, "https://www.example.com/feed");
  }));

test("a feed matches when at least half of the page's top stories are in it", () => {
  const stories = (paths) => paths.map((path) => ({ url: `https://example.com${path}` }));
  assert.equal(feedMatchesPage(stories(["/a", "/b"]), stories(["/a", "/b", "/c", "/d"])), true);
  assert.equal(feedMatchesPage(stories(["/a"]), stories(["/a", "/b", "/c", "/d"])), false);
  // Only the page's top 10 count: older stories may have left the feed.
  const page = stories(["/1", "/2", "/3", "/4", "/5", "/6", "/7", "/8", "/9", "/10", "/11", "/12", "/13", "/14", "/15"]);
  assert.equal(feedMatchesPage(stories(["/1", "/2", "/3", "/4", "/5"]), page), true);
  // A page with no stories of its own takes any feed.
  assert.equal(feedMatchesPage(stories(["/a"]), []), true);
});

test("a documents source reads the PDFs on the page, never the feed it names", () =>
  withSites(
    {
      [PAGE_URL]: PRESS_PAGE.replace("</main>", '<a href="/files/green-bond-report-2025.pdf">Green bond report 2025</a></main>'),
      "https://www.example.com/feed": feedOf(["/press/1", "/press/2", "/press/3"]),
    },
    async () => {
      const result = await readSource({ url: PAGE_URL, kind: "documents", feed_url: null });
      assert.equal(result.readFrom, "page");
      assert.equal(result.feedUrl, null);
      assert.deepEqual(result.stories.map((story) => story.url), ["https://www.example.com/files/green-bond-report-2025.pdf"]);
    },
  ));
