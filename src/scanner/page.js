import * as cheerio from "cheerio";
import { cleanLink, cleanText, clipSummary, parseDate, uniqueStories } from "./story.js";

// A list needs at least this many stories, so a few stray links aren't taken for one.
const MIN_STORIES = 3;
const MIN_AVERAGE_TITLE_LENGTH = 35;

// The stories on a news page, found without selectors: the biggest group of links that
// sit in the same kind of block and read like headlines.
export function readPage(html, pageUrl) {
  const $ = cheerio.load(html);
  const pageLink = cleanLink(pageUrl);
  const groups = new Map();

  $("a[href]").each((_, anchor) => {
    const $anchor = $(anchor);
    if (isSiteMenu($anchor)) return;

    const url = cleanLink($anchor.attr("href"), pageUrl);
    const title = findTitle($, $anchor);
    if (!url || url === pageLink || !looksLikeHeadline(title)) return;

    const key = blockKind($, anchor);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ anchor, url, title });
  });

  const lists = [...groups.values()].map((group) => uniqueStories(readStories($, group))).filter(isStoryList);
  lists.sort((a, b) => listScore(b) - listScore(a));
  return lists[0] ?? [];
}

function readStories($, group) {
  const urlOf = new Map(group.map((link) => [link.anchor, link.url]));
  return group.map(({ anchor, url, title }) => {
    const block = storyBlock($, anchor, urlOf);
    return { url, title, summary: findSummary($, block, title), published_at: findDate($, block, title) };
  });
}

// Menus have short labels ("About us", "Media relations statements"): headlines are longer.
function isStoryList(stories) {
  return stories.length >= MIN_STORIES && averageTitleLength(stories) >= MIN_AVERAGE_TITLE_LENGTH;
}

// The page's story list is the one with the most, longest and dated headlines.
function listScore(stories) {
  const datedShare = stories.filter((story) => story.published_at).length / stories.length;
  return stories.length * averageTitleLength(stories) * (1 + datedShare);
}

function averageTitleLength(stories) {
  return stories.reduce((total, story) => total + story.title.length, 0) / stories.length;
}

// Links in the site's menus, sidebars, header and footer aren't stories.
function isSiteMenu($anchor) {
  if ($anchor.closest("nav, [role=navigation], aside").length) return true;
  const headerOrFooter = $anchor.closest("header, footer");
  return headerOrFooter.length > 0 && headerOrFooter.closest("main, article").length === 0;
}

// When the whole card is the link, its headline is its longest heading: a shorter one is often a label ("Opinion").
function findTitle($, $anchor) {
  const headings = $anchor
    .find("h1, h2, h3, h4, h5, h6")
    .toArray()
    .map((heading) => cleanText($(heading).text()));
  return headings.sort((a, b) => b.length - a.length)[0] || cleanText($anchor.text());
}

function looksLikeHeadline(text) {
  return text.split(" ").length >= 3 && text.length >= 15 && text.length <= 250;
}

// The chain of tags and classes from the link up to <body>: links in the same list share it.
// Classes with numbers (post-1234) and odd/even/first/last differ per story, so they're left out.
function blockKind($, anchor) {
  return [anchor, ...$(anchor).parents().toArray()]
    .map((element) => {
      const classes = ($(element).attr("class") ?? "")
        .split(/\s+/)
        .filter((name) => name && !/\d/.test(name) && !/^(odd|even|first|last)$/i.test(name))
        .sort();
      return [element.tagName, ...classes].join(".");
    })
    .join(" < ");
}

// The story's block: the biggest element around its link that holds no other story.
function storyBlock($, anchor, urlOf) {
  const ownUrl = urlOf.get(anchor);
  let block = $(anchor);
  for (let parent = block.parent(); parent.length && !parent.is("body"); parent = parent.parent()) {
    const holdsAnotherStory = parent
      .find("a")
      .toArray()
      .some((other) => urlOf.has(other) && urlOf.get(other) !== ownUrl);
    if (holdsAnotherStory) break;
    block = parent;
  }
  return block;
}

function findDate($, block, title) {
  const time = block.find("time").first();
  const datetime = time.attr("datetime");
  if (datetime && !isNaN(new Date(datetime).getTime())) return new Date(datetime).toISOString();

  const dateText = time.text() || block.find('[class*="date" i]').first().text();
  // Without a marked date, look in the block's text, leaving out the headline: "Results for 30 June" isn't the date.
  return parseDate(dateText) ?? parseDate(cleanText(block.text()).replace(title, ""));
}

function findSummary($, block, title) {
  const paragraph = block
    .find("p")
    .toArray()
    .map((element) => cleanText($(element).text()))
    .find((text) => text.length >= 40 && text !== title);
  return clipSummary(paragraph);
}
