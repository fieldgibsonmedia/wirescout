import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { createDraft, editLink, getResource, login, logout } from "./modx.js";

// A made-up MODX connector that behaves like the real one (docs/modx-staging-test.md): one editor account,
// a session cookie plus a token, HTTP 401 for a missing or wrong token (the caller sends X-Requested-With),
// and a login that ends with logout. "broken" answers an error page.
const ACCOUNT = { username: "editor", password: "right-password" };
const TOKEN = "made-up-token";
const COOKIE = "PHPSESSID=made-up-session";
let signedIn = false;
let lastCreate = null;

const server = createServer(async (request, response) => {
  if (request.url.startsWith("/broken")) return response.writeHead(500).end("<html>Error</html>");

  let body = "";
  for await (const chunk of request) body += chunk;
  const fields = Object.fromEntries(new URLSearchParams(body));
  const send = (status, json, headers = {}) =>
    response.writeHead(status, { "content-type": "application/json", ...headers }).end(JSON.stringify(json));

  if (fields.action === "security/login") {
    if (fields.username !== ACCOUNT.username || fields.password !== ACCOUNT.password) {
      return send(200, { success: false, message: "The username or password is incorrect." });
    }
    signedIn = true;
    return send(200, { success: true, object: { token: TOKEN } }, { "set-cookie": `${COOKIE}; path=/; HttpOnly` });
  }

  const authorised =
    signedIn && request.headers.cookie === COOKIE && request.headers.modauth === TOKEN && request.headers["x-requested-with"] === "XMLHttpRequest";
  if (!authorised) return send(401, { success: false, code: 401, message: "Access denied." });

  if (fields.action === "security/logout") {
    signedIn = false;
    return send(200, { success: true });
  }
  if (fields.action === "resource/create") {
    if (fields.parent === "999") return send(200, { success: false, message: "You do not have permission to create documents here." });
    lastCreate = fields;
    return send(200, { success: true, object: { id: 501 } });
  }
  if (fields.action === "resource/get") {
    return send(200, { success: true, object: { id: Number(fields.id), pagetitle: lastCreate?.pagetitle, published: 0 } });
  }
  send(404, { success: false, message: "No such action." });
});

let site;

before(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  site = { cms_url: `http://127.0.0.1:${server.address().port}`, article_parent_id: 19, article_template_id: 3 };
});
after(() => server.closeAllConnections() || server.close());

test("login with the right password gives a session", async () => {
  const result = await login(site, ACCOUNT.username, ACCOUNT.password);
  assert.deepEqual(result, { ok: true, session: { cookie: COOKIE, token: TOKEN } });
});

test("a wrong password is refused in MODX's words", async () => {
  const result = await login(site, ACCOUNT.username, "wrong");
  assert.deepEqual(result, { ok: false, reason: "refused", message: "The username or password is incorrect." });
});

test("a draft is created unpublished in the magazine's draft section, with the article template", async () => {
  const { session } = await login(site, ACCOUNT.username, ACCOUNT.password);
  const result = await createDraft(site, session, { title: "A title", content: "<p>Text</p>" });

  assert.deepEqual(result, { ok: true, id: 501 });
  assert.equal(lastCreate.pagetitle, "A title");
  assert.equal(lastCreate.content, "<p>Text</p>");
  assert.equal(lastCreate.parent, "19");
  assert.equal(lastCreate.template, "3");
  assert.equal(lastCreate.published, "0");
  assert.equal((await getResource(site, session, 501)).resource.pagetitle, "A title");
});

test("a permission refusal comes back in MODX's words", async () => {
  const { session } = await login(site, ACCOUNT.username, ACCOUNT.password);
  const result = await createDraft({ ...site, article_parent_id: 999 }, session, { title: "A title", content: "" });
  assert.deepEqual(result, { ok: false, reason: "refused", message: "You do not have permission to create documents here." });
});

test("an expired or wrong session is refused", async () => {
  const result = await createDraft(site, { cookie: COOKIE, token: "wrong" }, { title: "A title", content: "" });
  assert.deepEqual(result, { ok: false, reason: "signed_out", message: "Please sign in again." });
});

test("after logout the session stops working", async () => {
  const { session } = await login(site, ACCOUNT.username, ACCOUNT.password);
  assert.deepEqual(await logout(site, session), { ok: true });
  assert.equal((await getResource(site, session, 501)).reason, "signed_out");
});

test("a site that is down or broken is an error, not a refusal", async () => {
  const broken = await login({ ...site, cms_url: `${site.cms_url}/broken` }, ACCOUNT.username, ACCOUNT.password);
  assert.deepEqual(broken, { ok: false, reason: "error", message: "The magazine couldn't be reached." });
});

test("the edit link opens the draft in the MODX manager", () => {
  assert.equal(editLink({ cms_url: "https://www.example.org" }, 501), "https://www.example.org/manager/?a=resource/update&id=501");
});
