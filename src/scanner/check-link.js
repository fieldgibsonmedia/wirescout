// Checks a link before a journalist adds it, with the scanner's own reading code: the app's
// check-links function runs it, so a link is judged the same way as in the hourly scan.
import { readProblem, readSource } from "./read-source.js";

// A whole check, every fetch included: long enough for a slow site, short enough to wait for.
const CHECK_TIMEOUT_MS = 15_000;

// Addresses on the function's own network: the check only fetches public sites.
const PRIVATE_HOST =
  /^(localhost|.*\.local|.*\.internal|0\.0\.0\.0|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|\[.*\])$/i;

// Returns { url, problem }: problem is null when the scanner finds stories on the link, else
// "not_found", "blocked", "unreachable" or "no_stories".
export async function checkLink(url) {
  if (!isPublicAddress(url)) return { url, problem: "unreachable" };
  return readLink(url, CHECK_TIMEOUT_MS);
}

// checkLink without the public address rule, so the tests can use a local server.
export async function readLink(url, timeoutMs) {
  try {
    const result = await readSource({ url }, AbortSignal.timeout(timeoutMs));
    return { url, problem: result.stories.length ? null : "no_stories" };
  } catch (error) {
    return { url, problem: readProblem(error) ?? "no_stories" };
  }
}

export function isPublicAddress(url) {
  if (!URL.canParse(url)) return false;
  const { protocol, hostname } = new URL(url);
  return ["http:", "https:"].includes(protocol) && hostname.includes(".") && !PRIVATE_HOST.test(hostname);
}
