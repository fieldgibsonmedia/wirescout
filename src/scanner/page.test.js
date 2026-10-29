import assert from "node:assert/strict";
import { test } from "node:test";
import { readPage } from "./page.js";

const PAGE_URL = "https://news.example.com/press";

test("finds the list of stories and leaves out the menus", () => {
  const html = `<html><body>
    <header><nav>
      <a href="/about">About the example company</a>
      <a href="/careers">Careers at the example company</a>
      <a href="/contact">Contact the example press office</a>
      <a href="/investors">Investor relations and reports</a>
    </nav></header>
    <main>
      <article class="post post-101">
        <h2><a href="/press/1">Insurer posts record first-half results</a></h2>
        <time datetime="2026-10-28T09:30:00Z">28 October 2026</time>
        <p>Gross premiums rose 12% on strong property demand in Europe.</p>
      </article>
      <article class="post post-102">
        <h2><a href="/press/2">New chief risk officer appointed today</a></h2>
        <span class="news-date">27/10/2026</span>
      </article>
      <article class="post post-103">
        <h2><a href="/press/3">Green bond issuance passes its target</a></h2>
        <p>Short.</p>
      </article>
    </main>
    <footer>
      <a href="/privacy">Privacy and cookie policy</a>
      <a href="/terms">Terms and conditions of use</a>
      <a href="/slavery">Modern slavery act statement</a>
      <a href="/accessibility">Accessibility of this website</a>
    </footer>
  </body></html>`;

  assert.deepEqual(readPage(html, PAGE_URL), [
    {
      url: "https://news.example.com/press/1",
      title: "Insurer posts record first-half results",
      summary: "Gross premiums rose 12% on strong property demand in Europe.",
      published_at: "2026-10-28T09:30:00.000Z",
    },
    {
      url: "https://news.example.com/press/2",
      title: "New chief risk officer appointed today",
      summary: null,
      published_at: "2026-10-27T00:00:00.000Z",
    },
    {
      url: "https://news.example.com/press/3",
      title: "Green bond issuance passes its target",
      summary: null,
      published_at: null,
    },
  ]);
});

test("reads cards where the whole card is the link", () => {
  const html = `<html><body><div class="list">
    <a class="card" href="/press/1"><h3>Quarterly results beat analyst forecasts</h3><span>12 October 2026</span></a>
    <a class="card" href="/press/2"><h3>New underwriting office opens in Dublin</h3><span>5 October 2026</span></a>
    <a class="card" href="/press/3"><h3>Annual report published for investors</h3><span>1 October 2026</span></a>
  </div></body></html>`;

  const stories = readPage(html, PAGE_URL);
  assert.deepEqual(
    stories.map((story) => story.title),
    ["Quarterly results beat analyst forecasts", "New underwriting office opens in Dublin", "Annual report published for investors"],
  );
  assert.ok(stories.every((story) => story.published_at?.startsWith("2026-10")));
});

test("finds nothing on a page without a list of stories", () => {
  const html = `<html><body><p>Our press office is open from 9 to 5.</p><a href="/contact">Contact the press office</a></body></html>`;
  assert.deepEqual(readPage(html, PAGE_URL), []);
});
