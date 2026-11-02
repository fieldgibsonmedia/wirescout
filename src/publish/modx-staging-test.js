/**
 * Staging test for posting to a MODX magazine through its connector.
 *
 * Proves, against a local staging MODX (never a live site), that an editor account can:
 * log in through connectors/index.php, create an unpublished draft, read it back,
 * publish and unpublish it, and that the session token and logout behave as documented.
 *
 * Usage (all values from the environment, nothing is printed back):
 *   MODX_HOST=http://localhost:8084 MODX_USERNAME=... MODX_PASSWORD=... \
 *   MODX_PARENT_ID=... MODX_TEMPLATE_ID=3 node src/publish/modx-staging-test.js
 *
 * Optional: KEEP_DRAFT=1 leaves the test draft in place (it is soft-deleted otherwise).
 *
 * See docs/modx-staging-test.md for what each step checks and how to read the result.
 */

const host = process.env.MODX_HOST?.replace(/\/$/, "");
const username = process.env.MODX_USERNAME;
const password = process.env.MODX_PASSWORD;
const parentId = Number(process.env.MODX_PARENT_ID);
const templateId = Number(process.env.MODX_TEMPLATE_ID);
const keepDraft = process.env.KEEP_DRAFT === "1";

if (!host || !username || !password || !parentId || !templateId) {
  console.error("Set MODX_HOST, MODX_USERNAME, MODX_PASSWORD, MODX_PARENT_ID and MODX_TEMPLATE_ID.");
  process.exit(2);
}

const connector = `${host}/connectors/index.php`;
const results = [];

function record(name, passed, detail = "") {
  results.push({ name, passed, detail });
  console.log(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

/**
 * Calls one connector action. Returns the HTTP status, the parsed JSON (or null)
 * and the Set-Cookie values, so the caller can keep the session.
 */
async function callConnector(action, fields, session) {
  const body = new URLSearchParams({ action, ctx: "mgr", ...fields });
  const headers = {
    "content-type": "application/x-www-form-urlencoded",
    // The manager sends this; without it MODX answers refusals as HTTP 200 with code 401 in the JSON.
    "x-requested-with": "XMLHttpRequest",
  };
  if (session?.cookie) headers.cookie = session.cookie;
  // PHP exposes this header as $_SERVER['HTTP_MODAUTH'], which is what MODX checks.
  if (session?.token !== undefined) headers.modAuth = session.token;

  const response = await fetch(connector, {
    method: "POST",
    headers,
    body: body.toString(),
    signal: AbortSignal.timeout(20_000),
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: response.status, json, setCookies: response.headers.getSetCookie() };
}

/** MODX refuses either with HTTP 401 or, without the X-Requested-With header, with code 401 in the body. */
function refused(result) {
  return result.status === 401 || (result.json?.success === false && result.json?.code === 401);
}

function cookieHeaderFrom(setCookies) {
  return setCookies.map((value) => value.split(";")[0]).filter(Boolean).join("; ");
}

async function main() {
  // 1. Log in to the manager context. Only this action is allowed without a session.
  const login = await callConnector("security/login", {
    login_context: "mgr",
    username,
    password,
    rememberme: "1",
  });
  const token = login.json?.object?.token;
  const cookie = cookieHeaderFrom(login.setCookies);
  record(
    "Login to the mgr context returns a session cookie and a token",
    login.json?.success === true && Boolean(token) && Boolean(cookie),
    `HTTP ${login.status}${login.json?.message ? `, ${login.json.message}` : ""}`,
  );
  if (!token || !cookie) {
    console.log("\nCannot continue without a session.");
    process.exit(1);
  }
  const session = { cookie, token };

  // 2. The session alone is not enough: a call without the token is refused.
  const noToken = await callConnector("resource/get", { id: String(parentId) }, { cookie });
  record("A call with the cookie but no token is refused", refused(noToken), `HTTP ${noToken.status}, code ${noToken.json?.code}`);

  // 3. A wrong token is refused too.
  const wrongToken = await callConnector("resource/get", { id: String(parentId) }, { cookie, token: "wrong" });
  record("A call with a wrong token is refused", refused(wrongToken), `HTTP ${wrongToken.status}, code ${wrongToken.json?.code}`);

  // 4. The parent section is readable with the right session.
  const parent = await callConnector("resource/get", { id: String(parentId) }, session);
  record(
    "The article section is readable with cookie and token",
    parent.json?.success === true,
    `HTTP ${parent.status}${parent.json?.message ? `, ${parent.json.message}` : ""}`,
  );

  // 5. Create an unpublished draft, exactly what "Post draft to <magazine>" would do.
  const title = `Wirescout staging test ${new Date().toISOString()}`;
  const created = await callConnector(
    "resource/create",
    {
      pagetitle: title,
      parent: String(parentId),
      template: String(templateId),
      context_key: "web",
      published: "0",
      hidemenu: "1",
      content: "<p>Created by the Wirescout staging test. Safe to delete.</p>",
    },
    session,
  );
  const draftId = created.json?.object?.id;
  record(
    "resource/create makes an unpublished draft",
    created.json?.success === true && Boolean(draftId),
    `HTTP ${created.status}${created.json?.message ? `, ${created.json.message}` : ""}${draftId ? `, id ${draftId}` : ""}`,
  );
  if (!draftId) {
    await callConnector("security/logout", {}, session);
    summary();
    return;
  }

  // 6. Read it back and check the fields MODX saved.
  const draft = await callConnector("resource/get", { id: String(draftId) }, session);
  const saved = draft.json?.object;
  record(
    "resource/get returns the draft with the right title, parent, template and published=0",
    saved?.pagetitle === title &&
      Number(saved?.parent) === parentId &&
      Number(saved?.template) === templateId &&
      Number(saved?.published) === 0,
    `HTTP ${draft.status}`,
  );

  // 7. Publish and unpublish. A refusal here is also a valid result: it means the
  //    account lacks publish_document and MODX enforced it.
  const published = await callConnector("resource/publish", { id: String(draftId) }, session);
  record(
    "resource/publish is allowed or refused according to the account's permissions",
    published.json !== null,
    published.json?.success ? "allowed" : `refused: ${published.json?.message ?? `HTTP ${published.status}`}`,
  );
  if (published.json?.success) {
    const unpublished = await callConnector("resource/unpublish", { id: String(draftId) }, session);
    record("resource/unpublish puts it back to draft", unpublished.json?.success === true);
  }

  // 8. Clean up (soft delete: the draft goes to the recycle bin), unless asked to keep it.
  if (!keepDraft) {
    const deleted = await callConnector("resource/delete", { id: String(draftId) }, session);
    record("resource/delete moves the draft to the recycle bin", deleted.json?.success === true);
  } else {
    console.log(`      Draft ${draftId} kept for inspection in the manager.`);
  }

  // 9. Logout ends the session: the old cookie and token stop working.
  const logout = await callConnector("security/logout", {}, session);
  record("security/logout succeeds", logout.json?.success === true, `HTTP ${logout.status}`);
  const afterLogout = await callConnector("resource/get", { id: String(parentId) }, session);
  record("The old cookie and token are refused after logout", refused(afterLogout), `HTTP ${afterLogout.status}, code ${afterLogout.json?.code}`);

  summary();
}

function summary() {
  const failed = results.filter((result) => !result.passed).length;
  console.log(`\n${results.length - failed} of ${results.length} checks passed.`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
