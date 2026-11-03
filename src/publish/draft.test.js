import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { draftHtml, fetchStoryText, readableText, shortenBrief, suggestDraft } from "./draft.js";

const STORY = { title: "Insurer posts record results", summary: "Premiums rose 12%.", url: "https://news.example.com/press/1" };

// A fake Anthropic client: returns the given reply, or throws, and remembers the request.
function fakeClient(reply) {
  const client = {
    request: null,
    messages: {
      create: async (request) => {
        client.request = request;
        if (reply instanceof Error) throw reply;
        return reply;
      },
    },
  };
  return client;
}

const reply = (json, stop_reason = "end_turn") => ({ stop_reason, content: [{ type: "text", text: JSON.stringify(json) }] });

test("the suggested draft is the model's title and brief, with the source link last", async () => {
  const client = fakeClient(reply({ title: "Record half for insurer", brief: "Premiums rose.\n\nProfit doubled." }));
  const draft = await suggestDraft(client, STORY, "The page text");

  assert.deepEqual(draft, {
    title: "Record half for insurer",
    content: "Premiums rose.\n\nProfit doubled.\n\nSource: https://news.example.com/press/1",
    suggested: true,
  });
  assert.equal(client.request.model, "claude-haiku-5-5");
  assert.ok(client.request.messages[0].content.includes("The page text"));
});

test("the model is asked for 100 to 250 characters, and a longer brief is cut to fit", async () => {
  const longBrief = Array.from({ length: 5 }, (_, index) => `Paragraph ${index + 1} says the insurer's premiums rose sharply this year, driven by new business in Asia.`).join("\n\n");
  const client = fakeClient(reply({ title: "Record half for insurer", brief: longBrief }));
  const draft = await suggestDraft(client, STORY, "The page text");

  assert.ok(client.request.system.includes("100 to 250 characters"));
  const brief = draft.content.replace(/\n\nSource: .*$/, "");
  assert.ok(brief.length <= 250, `${brief.length} characters`);
  assert.equal(brief.split("\n\n").length, 2);
});

test("the model is asked for British English, whatever the story's language", async () => {
  const client = fakeClient(reply({ title: "Record half for insurer", brief: "Premiums rose." }));
  await suggestDraft(client, { ...STORY, title: "Un semestre record pour l'assureur" }, "Les primes ont augmenté.");

  assert.ok(client.request.system.includes("British English (en-GB), whatever the language of the article"));
  assert.ok(client.request.messages[0].content.includes("in British English"));
});

test("a brief over 250 characters keeps the whole sentences that fit", () => {
  const first = "Premiums rose 12% in the first half, the insurer said on Tuesday, as new business in Asia grew faster than expected.";
  const second = "Profit doubled to a record, helped by fewer large claims.";
  const third = "The company also raised its full-year outlook and announced a new share buyback programme worth several hundred million.";
  assert.equal(shortenBrief(`${first} ${second} ${third}`), `${first} ${second}`);
  assert.equal(shortenBrief("Short brief.\n\nSecond paragraph.\n\nThird paragraph."), "Short brief.\n\nSecond paragraph.");
});

test("a single sentence over 250 characters is cut after a whole word", () => {
  const brief = shortenBrief("word ".repeat(80).trim());
  assert.ok(brief.length <= 250);
  assert.ok(brief.endsWith("word…"));
});

test("without the model or a usable answer, the story's own title and summary are used, with the reason", async () => {
  const fallback = (failure) => ({
    title: STORY.title,
    content: "Premiums rose 12%.\n\nSource: https://news.example.com/press/1",
    suggested: false,
    failure,
  });

  assert.deepEqual(await suggestDraft(null, STORY, "The page text"), fallback("no model"));
  assert.deepEqual(await suggestDraft(fakeClient(new Error("overloaded")), STORY, "The page text"), fallback("model error Error"));
  assert.deepEqual(
    await suggestDraft(fakeClient(reply({ title: "x", brief: "y" }, "refusal")), STORY, "The page text"),
    fallback("stop reason refusal"),
  );
  assert.deepEqual(await suggestDraft(fakeClient(reply({ title: "", brief: "" })), STORY, "The page text"), fallback("empty answer"));
});

test("when the page can't be read, the model writes from the story's own title and summary, in British English", async () => {
  const story = { ...STORY, title: "Un semestre record pour l'assureur", summary: "Les primes ont augmenté de 12 %." };
  const client = fakeClient(reply({ title: "Record half for insurer", brief: "Premiums rose 12%." }));
  const draft = await suggestDraft(client, story, null);

  assert.equal(draft.suggested, true);
  assert.equal(draft.title, "Record half for insurer");
  assert.ok(client.request.messages[0].content.includes("Les primes ont augmenté de 12 %."));
  assert.ok(client.request.system.includes("British English"));
});

test("a long story summary used as the fallback is cut to 250 characters too", async () => {
  const summary = "Premiums rose 12% in the first half, the insurer said on Tuesday, as new business in Asia grew faster than expected. ".repeat(4).trim();
  const draft = await suggestDraft(null, { ...STORY, summary }, null);
  const brief = draft.content.replace(/\n\nSource: .*$/, "");
  assert.ok(brief.length <= 250, `${brief.length} characters`);
  assert.ok(draft.content.endsWith("Source: https://news.example.com/press/1"));
});

test("a story without a summary still ends with the source link", async () => {
  const draft = await suggestDraft(null, { ...STORY, summary: null }, null);
  assert.equal(draft.content, "Source: https://news.example.com/press/1");
});

test("the page text keeps the article and drops menus, scripts and footers", () => {
  const html = `<html><body><nav><a>Home</a></nav><header>Site name</header>
    <article><h1>Results</h1><p>Premiums   rose 12%.</p><script>track()</script><p>Profit doubled.</p></article>
    <footer>Cookies</footer></body></html>`;
  assert.equal(readableText(html), "Results\nPremiums rose 12%.\nProfit doubled.");
  assert.equal(readableText("<html><body><div>No paragraphs</div></body></html>"), null);
});

const server = createServer((request, response) => {
  if (request.url === "/story") return response.end("<html><body><main><p>The story.</p></main></body></html>");
  response.writeHead(404).end();
});
let site;

before(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  site = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.closeAllConnections() || server.close());

test("the story page is fetched, and a missing page gives nothing", async () => {
  assert.equal(await fetchStoryText(`${site}/story`, { allowPrivate: true }), "The story.");
  assert.equal(await fetchStoryText(`${site}/missing`, { allowPrivate: true }), null);
});

test("only public sites are fetched", async () => {
  assert.equal(await fetchStoryText(`${site}/story`), null);
});

test("the draft's HTML has a paragraph per block and the source as a link, with the text escaped", () => {
  const html = draftHtml("Profit <doubled> & more.\nSame paragraph.\n\nSource: https://news.example.com/press/1?a=1&b=2");
  assert.equal(
    html,
    '<p>Profit &lt;doubled&gt; &amp; more.<br>Same paragraph.</p>\n' +
      '<p>Source: <a href="https://news.example.com/press/1?a=1&amp;b=2">https://news.example.com/press/1?a=1&amp;b=2</a></p>',
  );
});
