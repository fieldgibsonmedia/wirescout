import assert from "node:assert/strict";
import { test } from "node:test";
import { labelBatch } from "./label-documents.js";

const DOCUMENTS = [
  { id: 1, url: "https://www.issuer.example/files/slutliga-villkor-lan-121.pdf", title: "Lån 121", summary: null, section: "MTN-program" },
  { id: 2, url: "https://www.issuer.example/files/q3.pdf", title: "Quarterly report <Q3>", summary: "Q3 2026", section: null },
];

// Answers like the model would, and keeps the request for the test to look at.
function fakeClient(answer) {
  const client = {
    messages: {
      create: async (request) => {
        client.request = request;
        if (answer instanceof Error) throw answer;
        return { stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(answer) }], ...answer.response };
      },
    },
  };
  return client;
}

test("labels each document from its text, file name and section", async () => {
  const client = fakeClient({ labels: [{ id: 1, kind: "new_issue" }, { id: 2, kind: "other" }] });
  const kinds = await labelBatch(client, DOCUMENTS);

  assert.deepEqual([...kinds], [[1, "new_issue"], [2, "other"]]);
  const sent = client.request.messages[0].content;
  assert.match(sent, /<document id="1">text: Lån 121 \| file: slutliga-villkor-lan-121\.pdf \| section: MTN-program<\/document>/);
  // A title can't close the tag.
  assert.match(sent, /text: Quarterly report  Q3  \| file: q3\.pdf \| row: Q3 2026/);
});

test("leaves out ids and kinds the model made up", async () => {
  const client = fakeClient({ labels: [{ id: 1, kind: "prospectus" }, { id: 99, kind: "spo" }, { id: 2, kind: "framework" }] });
  assert.deepEqual([...(await labelBatch(client, DOCUMENTS))], [[2, "framework"]]);
});

test("a failed call labels nothing, so the next run tries again", async () => {
  assert.equal(await labelBatch(fakeClient(new Error("overloaded")), DOCUMENTS), null);
  assert.equal(await labelBatch(fakeClient({ labels: [], response: { stop_reason: "max_tokens" } }), DOCUMENTS), null);
});
