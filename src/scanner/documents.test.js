import assert from "node:assert/strict";
import { test } from "node:test";
import { readDocuments, reuploadKey } from "./documents.js";

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
      <a href="/files/report-2025.pdf?MOD=AJPERES">Green Financing Investor Report 2025</a>
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
      // The query after ".pdf" stays: some sites need it to serve the file.
      { url: "https://www.issuer.example/files/report-2025.pdf?MOD=AJPERES", title: "Green Financing Investor Report 2025", section: "Reporting" },
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

test("a PDF put up again under a new file name is a re-upload; a new title or section isn't", () => {
  const saved = reuploadKey({
    title: "Green Financing Framework",
    url: "https://issuer.example/files/green-financing-framework.pdf",
    section: "Green finance",
  });

  const renamed = {
    title: "Green financing  framework",
    url: "https://issuer.example/media/1763545120-green-financing-framework.pdf?v=2",
    section: "Green  Finance",
  };
  assert.equal(reuploadKey(renamed), saved);

  const nextYear = { title: "Impact report 2025", url: "https://issuer.example/files/impact-report-2025.pdf" };
  assert.notEqual(reuploadKey(nextYear), reuploadKey({ title: "Impact report 2024", url: "https://issuer.example/files/impact-report-2024.pdf" }));

  const otherFile = { title: "Green Financing Framework", url: "https://issuer.example/files/press-release.pdf", section: "Green finance" };
  assert.notEqual(reuploadKey(otherFile), saved);

  // The same notice for two different bonds.
  const bond2027 = { title: "Result notice", url: "https://issuer.example/files/result-notice.pdf", section: "2027 Bonds" };
  const bond2030 = { title: "Result notice", url: "https://issuer.example/files/result-notice-1.pdf", section: "2030 Bonds" };
  assert.notEqual(reuploadKey(bond2030), reuploadKey(bond2027));

  const accents = { title: "Rapport", url: "https://issuer.example/files/rapport-d%C3%A9taill%C3%A9-2024.pdf", section: null };
  assert.equal(reuploadKey(accents), "rapport\n\nrapport-détaillé-pdf");
});

test("a page without PDF links: the PDFs in its own data", () => {
  // Escaped HTML in a script (HDB): read like links, with their text and headings.
  const escapedHtml = `<html><body><div id="app"></div><script>self.__next_f.push([1,"\\u003ch2\\u003eGreen Finance Framework\\u003c/h2\\u003e\\u003ca href=\\"/media/hdb-green-finance-framework.pdf\\"\\u003eGreen Finance Framework dated 6 June 2025\\u003c/a\\u003e"])</script></body></html>`;
  assert.deepEqual(
    readDocuments(escapedHtml, PAGE_URL).map(({ url, title, section }) => ({ url, title, section })),
    [{ url: "https://www.issuer.example/media/hdb-green-finance-framework.pdf", title: "Green Finance Framework dated 6 June 2025", section: "Green Finance Framework" }],
  );

  // Plain addresses in page data (Elopak, Singapore's MOF) and a file opened by a script (Woori): named from the file.
  const pageData = `<html><body><div id="root"></div>
    <script>window.data = {"link":{"text":"Report","href":"/globalassets/green-bond-investor-report-2024.pdf"},
      "referenceLinkHref":"https://files.example/153/Singapore Green Bond Report for FY2025.pdf"}</script>
    <button onclick='window.open("/pot/jcc?sdiv=SD_FILES&fileName=ENG_2023_Woori_Bank_SPO.pdf")'>Download</button>
    <script>var types = "doc, pdf, txt";</script>
  </body></html>`;
  assert.deepEqual(
    readDocuments(pageData, PAGE_URL).map(({ url, title }) => ({ url, title })),
    [
      { url: "https://www.issuer.example/globalassets/green-bond-investor-report-2024.pdf", title: "green bond investor report 2024" },
      { url: "https://files.example/153/Singapore%20Green%20Bond%20Report%20for%20FY2025.pdf", title: "Singapore Green Bond Report for FY2025" },
      { url: "https://www.issuer.example/pot/jcc?sdiv=SD_FILES&fileName=ENG_2023_Woori_Bank_SPO.pdf", title: "ENG 2023 Woori Bank SPO" },
    ],
  );
});

test("a page with PDF links isn't searched further", () => {
  const html = `<html><body><main><a href="/files/impact-report-2025.pdf">Impact report 2025</a></main>
    <script>window.data = {"href":"/files/cookie-policy.pdf"}</script></body></html>`;
  assert.deepEqual(readDocuments(html, PAGE_URL).map((document) => document.title), ["Impact report 2025"]);
});
