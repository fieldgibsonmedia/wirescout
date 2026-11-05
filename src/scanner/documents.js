// The PDFs on a page, for documents lists (docs/mvp-plan.md, "Document lists for bond alerts"): every PDF link
// outside the site's menus, with the section heading above it. Issuers list their bond reports, frameworks and
// final terms this way, often next to other files: the model labels them later (label-documents.js).
import * as cheerio from "cheerio";
import { isSiteMenu } from "./page.js";
import { cleanLink, cleanText, clipSummary, parseDate } from "./story.js";

// The longest page in EF Data's list had 583 PDFs: all of them are kept, so a new one is never cut off.
export const MAX_DOCUMENTS = 1000;

// Link texts that say nothing about the file: the file's name says more.
const GENERIC_TEXT =
  /^(pdf|download|downloaden|herunterladen|télécharger|telecharger|scarica|visualizza|ladda ner|last ned|hent|view|open|read|read more|more|here|click here|link|file|document|details)$/i;

// Size notes in link texts: "(pdf 2 Mb)", "[PDF:117KB]", "(997.0KB)".
const SIZE_NOTE = /\s*[[(]\s*(pdf[^\])]*|[\d.,]+\s*[kmg]i?b)\s*[\])]/gi;

// Returns { url, title, summary, published_at, section } for each PDF, in page order.
export function readDocuments(html, pageUrl) {
  const linked = linkedDocuments(html, pageUrl);
  return linked.length ? linked : documentsInPageData(html, pageUrl);
}

// The PDF links on the page.
function linkedDocuments(html, pageUrl) {
  const $ = cheerio.load(html);
  const documents = [];
  const seen = new Set();
  let section = null;

  // In page order, so each link gets the heading last seen above it.
  $("body *").each((_, element) => {
    const $element = $(element);
    if (isHeading($element) && !isSiteMenu($element)) {
      const heading = cleanText($element.text());
      if (heading && heading.length <= 150) section = heading;
      return;
    }
    if (element.tagName !== "a" || !$element.attr("href") || isSiteMenu($element)) return;

    const label = cleanText(spacedText(element)) || cleanText($element.attr("title")) || cleanText($element.attr("aria-label"));
    const url = pdfLink($element.attr("href"), pageUrl, label, $element.attr("type"));
    if (!url || seen.has(url) || documents.length >= MAX_DOCUMENTS) return;
    seen.add(url);

    const title = documentTitle(label, url);
    // The nearest row or item that says more than the link: a link alone in a list inside a table row
    // gets the row ("9th Sustainability Bond 2021/12/16 JPY 10.0 billion").
    const blocks = $element.parents("li, tr, dd, p").toArray().map((block) => cleanText(spacedText(block)));
    const blockText = blocks.find((text) => text.length > label.length + 10) ?? "";
    documents.push({
      url,
      title,
      // The row around the link ("EUR 500,000,000 1.25 per cent. Notes due 2031 | PDF") when it says more.
      summary: blockText.length > label.length + 10 ? clipSummary(blockText) : null,
      published_at: parseDate(blockText),
      section,
    });
  });
  return documents;
}

// A page without PDF links may still carry them in its own data: sites built with JavaScript (Next.js and the like)
// keep the page's content in scripts, as escaped HTML (HDB) or as plain addresses (Elopak, Singapore's MOF), and some
// open their files from a script (Woori's window.open). In EF Data's list, about 1 in 4 of the pages with no PDF links.
// No sections here: the data seldom says which heading a file sits under.
function documentsInPageData(html, pageUrl) {
  const $ = cheerio.load(html);
  const scripts = $("script")
    .map((_, script) => unescapeData($(script).text()))
    .get()
    .join("\n");
  const linked = linkedDocuments(`<html><body>${scripts}</body></html>`, pageUrl);
  if (linked.length) return linked;

  const documents = [];
  const seen = new Set();
  // Quoted addresses ending in .pdf (maybe with a "?…"), anywhere in the page: scripts, data- attributes, onclick.
  for (const match of unescapeData(html).matchAll(/["'(]([^"'<>()\s][^"'<>()]{0,500}?\.pdf(?:\?[^"'<>()\s]*)?)["')]/gi)) {
    const address = match[1];
    if (!/[/=]/.test(address) || !URL.canParse(address, pageUrl)) continue;
    const url = new URL(address, pageUrl);
    if (!["http:", "https:"].includes(url.protocol) || seen.has(url.href) || documents.length >= MAX_DOCUMENTS) continue;
    seen.add(url.href);
    // The file's name, which may sit in the address's query (Woori: "…&fileName=ENG_2023_Woori_Bank_Framework.pdf").
    const fileName = (/\.pdf$/i.test(address) ? address : address.split("?")[0]).split(/[/=]/).pop();
    documents.push({ url: url.href, title: documentTitle("", `https://file.invalid/${fileName}`), summary: null, published_at: null, section: null });
  }
  return documents;
}

// Script text as the page would show it: \u003c → <, \" → ", \/ → /.
function unescapeData(text) {
  return text
    .replace(/\\u([0-9a-f]{4})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\(["'/])/g, "$1")
    .replace(/\\n/g, "\n");
}

// Text only screen readers get ("Opens a PDF file in a new window").
const SCREEN_READER_ONLY = /visually-?hidden|sr-only|screen-reader/i;

// An element's text with a space between its parts (cheerio's text() runs table cells together: "2031" + "15 March"),
// without screen-reader text.
function spacedText(node) {
  if (node.type === "text") return node.data;
  if (SCREEN_READER_ONLY.test(node.attribs?.class ?? "")) return "";
  return (node.children ?? []).map(spacedText).join(" ");
}

function isHeading($element) {
  return $element.is("h1, h2, h3, h4, h5, h6, [role=heading], summary, button[aria-expanded]");
}

// The PDF's full address, as the page writes it, or null if the link isn't a PDF. A query after ".pdf" stays:
// some sites need it to serve the file (Gothenburg's ?MOD=AJPERES).
function pdfLink(href, pageUrl, label, type) {
  const url = cleanLink(href, pageUrl);
  if (!url) return null;
  return /\.pdf$/i.test(new URL(url).pathname) || /\bpdf\b/i.test(label) || /pdf/i.test(type ?? "") ? url : null;
}

// The link's text without size notes, or the file's name when the text says nothing ("Download", "120").
function documentTitle(label, url) {
  const text = cleanText(label.replace(SIZE_NOTE, ""));
  if (/\p{L}{4}/u.test(text) && !GENERIC_TEXT.test(text)) return text.slice(0, 250);

  const rawName = new URL(url).pathname.split("/").pop() ?? "";
  let fileName = rawName;
  try {
    fileName = decodeURIComponent(rawName);
  } catch {
    // A stray "%" in the name: keep it as it is.
  }
  return cleanText(fileName.replace(/\.pdf$/i, "").replace(/[-_+]+/g, " ")) || text || url;
}

// What a re-uploaded PDF shares with the one already saved: its title and section (capitals and spaces ignored), and
// its file name without the numbers sites add to it (1763545120-green-financing-framework.pdf). The "?…" part is
// ignored. The section keeps apart different bonds' documents with the same title ("Result notice" under each bond).
export function reuploadKey({ title, url, section }) {
  let fileName = new URL(url).pathname.split("/").pop() ?? "";
  try {
    fileName = decodeURIComponent(fileName);
  } catch {
    // A stray "%" in the name: keep it as it is.
  }
  const name = fileName.toLowerCase().replace(/\d+/g, "").replace(/[^\p{L}]+/gu, "-").replace(/^-|-$/g, "");
  const plain = (text) => (text ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  return `${plain(title)}\n${plain(section)}\n${name}`;
}
