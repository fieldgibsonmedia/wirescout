import assert from "node:assert/strict";
import { test } from "node:test";
import { readDocuments } from "./documents.js";

const PAGE_URL = "https://www.issuer.example/investors/green-finance";

test("finds every PDF with the section heading above it, and leaves out the menus", () => {
  const html = `<html><body>
    <header><nav><a href="/files/cookie-policy.pdf">Cookie policy for the whole website</a></nav></header>
    <main>
      <h2>Green Financing Framework</h2>
      <ul>
        <li><a href="/files/green-financing-framework-2025.pdf">Green Financing Framework 2025 (pdf 2 Mb)</a></li>
        <li><a href="/files/spo-2025.pdf">Second Party Opinion [PDF:652KB]</a></li>
      </ul>
      <h2>Reporting</h2>
      <a href="/files/report-2025.pdf?modified=20260430">Green Financing Investor Report 2025</a>
      <a href="/investors/annual-report">Annual report web page</a>
    </main>
    <footer><a href="/files/privacy.pdf">Privacy notice of the issuer</a></footer>
  </body></html>`;

  assert.deepEqual(
    readDocuments(html, PAGE_URL).map(({ url, title, section }) => ({ url, title, section })),
    [
      {
        url: "https://www.issuer.example/files/green-financing-framework-2025.pdf",
        title: "Green Financing Framework 2025",
        section: "Green Financing Framework",
      },
      { url: "https://www.issuer.example/files/spo-2025.pdf", title: "Second Party Opinion", section: "Green Financing Framework" },
      // The query after ".pdf" is a cache key: the same file would otherwise come back as new.
      { url: "https://www.issuer.example/files/report-2025.pdf", title: "Green Financing Investor Report 2025", section: "Reporting" },
    ],
  );
});

test("uses the file's name when the link text says nothing", () => {
  const html = `<html><body><main><h3>Final terms</h3><table>
    <tr><td>EUR 500,000,000 1.25 per cent. Notes due 2031</td><td>15 March 2026</td><td><a href="/ft/final-terms_mtn-121.pdf">120</a></td></tr>
    <tr><td><a href="/ft/termsheet%20tranche%208.pdf">Download</a></td></tr>
  </table></main></body></html>`;

  const [first, second] = readDocuments(html, PAGE_URL);
  assert.equal(first.title, "final terms mtn 121");
  assert.equal(first.section, "Final terms");
  // The row around the link says more than its text.
  assert.equal(first.summary, "EUR 500,000,000 1.25 per cent. Notes due 2031 15 March 2026 120");
  assert.equal(first.published_at, "2026-03-15T12:00:00.000Z");
  assert.equal(second.title, "termsheet tranche 8");
  assert.equal(second.summary, null);
});

test("a link that says it's a PDF counts, without .pdf in its address", () => {
  const html = `<html><body><main>
    <a href="/download?id=51">Impact report 2025 (PDF)</a>
    <a href="/download?id=52">Impact report 2025 (Excel)</a>
  </main></body></html>`;

  assert.deepEqual(
    readDocuments(html, PAGE_URL).map((document) => document.url),
    ["https://www.issuer.example/download?id=51"],
  );
});

test("each PDF once, and none on a page without PDFs", () => {
  const html = `<html><body><main>
    <a href="/files/framework.pdf">Sustainability bond framework</a>
    <a href="/files/framework.pdf#page=2">Sustainability bond framework</a>
  </main></body></html>`;

  assert.equal(readDocuments(html, PAGE_URL).length, 1);
  assert.deepEqual(readDocuments("<html><body><a href='/news'>All the latest news</a></body></html>", PAGE_URL), []);
});

test("leaves out screen-reader text, and takes the table row around a link alone in its list", () => {
  const html = `<html><body><main><h2>History of sustainability bonds</h2><table><tr>
    <th>9th Sustainability Bond</th><td>2021/12/16</td><td>JPY 10.0 billion</td>
    <td><ul><li><a href="/pdf/009_release_en.pdf">Release<br><i>[PDF:98KB]</i><span class="util-visually-hidden">Opens a PDF file in a new window</span></a></li></ul></td>
  </tr></table></main></body></html>`;

  const [document] = readDocuments(html, PAGE_URL);
  assert.equal(document.title, "Release");
  assert.equal(document.summary, "9th Sustainability Bond 2021/12/16 JPY 10.0 billion Release [PDF:98KB]");
  assert.equal(document.section, "History of sustainability bonds");
});
