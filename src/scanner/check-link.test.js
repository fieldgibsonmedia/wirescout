import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { isPublicAddress, readLink } from "./check-link.js";

const FEED = `<?xml version="1.0"?><rss version="2.0"><channel><title>News</title>
  <item><title>A story</title><link>https://example.com/story</link></item>
</channel></rss>`;

// A made-up site: a feed that works, a page that turns visitors away, one without stories, and a slow one.
// Every other page is missing.
const server = createServer((request, response) => {
  if (request.url === "/news.xml") return response.end(FEED);
  if (request.url === "/blocked") return response.writeHead(403).end();
  if (request.url === "/empty") return response.end("<html><body><p>Nothing here</p></body></html>");
  // /slow never answers.
  if (request.url !== "/slow") return response.writeHead(404).end();
});
let site;

before(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  site = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.closeAllConnections() || server.close());

test("a link with stories works", async () => {
  assert.deepEqual(await readLink(`${site}/news.xml`, 2000), { url: `${site}/news.xml`, problem: null });
});

test("a link without stories says why", async () => {
  assert.equal((await readLink(`${site}/missing`, 2000)).problem, "not_found");
  assert.equal((await readLink(`${site}/blocked`, 2000)).problem, "blocked");
  assert.equal((await readLink(`${site}/empty`, 2000)).problem, "no_stories");
});

test("a site that doesn't answer in time can't be reached", async () => {
  assert.equal((await readLink(`${site}/slow`, 300)).problem, "unreachable");
});

test("only public sites are checked", () => {
  assert.equal(isPublicAddress("https://news.example.com/press"), true);
  assert.equal(isPublicAddress("http://localhost:54321/rest"), false);
  assert.equal(isPublicAddress("http://127.0.0.1/"), false);
  assert.equal(isPublicAddress("http://192.168.1.1/"), false);
  assert.equal(isPublicAddress("http://172.20.0.5/"), false);
  assert.equal(isPublicAddress("http://[::1]/"), false);
  assert.equal(isPublicAddress("http://kong:8000/"), false);
  assert.equal(isPublicAddress("ftp://example.com/"), false);
});
