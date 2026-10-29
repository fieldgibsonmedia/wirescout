import assert from "node:assert/strict";
import { test } from "node:test";
import { readProblem } from "./read-source.js";

const httpError = (status) => Object.assign(new Error(`HTTP ${status}`), { status });

test("tells why a source couldn't be read", () => {
  assert.equal(readProblem(httpError(404)), "not_found");
  assert.equal(readProblem(httpError(410)), "not_found");
  assert.equal(readProblem(httpError(401)), "blocked");
  assert.equal(readProblem(httpError(403)), "blocked");
  assert.equal(readProblem(httpError(429)), "blocked");
  assert.equal(readProblem(httpError(500)), "unreachable");
  assert.equal(readProblem(httpError(503)), "unreachable");
});

test("a site that's down or too slow can't be reached", () => {
  const certificateError = new TypeError("fetch failed", { cause: Object.assign(new Error(), { code: "CERT_HAS_EXPIRED" }) });
  assert.equal(readProblem(certificateError), "unreachable");
  // Deno, where the check-links function runs, gives no cause.
  assert.equal(readProblem(new TypeError("error sending request: invalid peer certificate: Expired")), "unreachable");
  assert.equal(readProblem(new DOMException("The operation was aborted due to timeout", "TimeoutError")), "unreachable");
});

test("other errors have no reason", () => {
  assert.equal(readProblem(httpError(400)), null);
  assert.equal(readProblem(new Error("Something else")), null);
});
