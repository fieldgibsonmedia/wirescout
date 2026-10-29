import assert from "node:assert/strict";
import { test } from "node:test";
import { findProblem } from "./health.js";

test("reports a source when it breaks, once", () => {
  assert.equal(findProblem(10, 0), "Stopped finding stories");
  assert.equal(findProblem(10, 4), "Found far fewer stories than usual");
  assert.equal(findProblem(null, 0), "Can't be read (first check)");
  // The next check starts from the new count, so it isn't reported again.
  assert.equal(findProblem(0, 0), null);
});

test("a working source is fine", () => {
  assert.equal(findProblem(10, 10), null);
  assert.equal(findProblem(10, 5), null);
  assert.equal(findProblem(null, 8), null);
  assert.equal(findProblem(0, 8), null);
});
