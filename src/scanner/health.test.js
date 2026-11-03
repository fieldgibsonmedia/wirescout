import assert from "node:assert/strict";
import { test } from "node:test";
import { findScannerBreak } from "./health.js";

const source = (storiesBefore, storiesNow) => ({ url: "https://news.example.com/press", storiesBefore, storiesNow });

test("the scanner looks broken when half or more of the working sources find nothing, at least 3", () => {
  const results = [source(10, 0), source(8, 0), source(5, 0), source(12, 12), source(9, 9), source(7, 7)];
  const scannerBreak = findScannerBreak(results);

  assert.equal(scannerBreak.stopped.length, 3);
  assert.equal(scannerBreak.workedBefore, 6);
});

test("one or two failing sources are the journalists' to fix: no alert", () => {
  assert.equal(findScannerBreak([source(10, 0), source(8, 0)]), null);
  assert.equal(findScannerBreak([source(10, 0), source(8, 8), source(5, 5)]), null);
});

test("fewer than half of the working sources stopping is no alert", () => {
  const results = [source(10, 0), source(8, 0), source(5, 0), source(12, 12), source(9, 9), source(7, 7), source(6, 6)];
  assert.equal(findScannerBreak(results), null);
});

test("sources that found nothing last time don't count, so a break is reported once", () => {
  // The scan after a break: the same sources still at 0.
  const results = [source(0, 0), source(0, 0), source(0, 0), source(12, 12)];
  assert.equal(findScannerBreak(results), null);
  // New sources that can't be read on their first check are the journalists' to fix too.
  assert.equal(findScannerBreak([source(null, 0), source(null, 0), source(null, 0)]), null);
});
