# Progress

Newest first. One entry per job: date, what was done, what's next.

## 2026-10-29: Select, move and remove sources

- A **Select** button above the source list shows a tick box on each row. With sources ticked: "3 selected", **Move to…** and **Remove**.
- Remove asks first ("Remove 3 sources?", Cancel focused, red Remove). Move to… opens a dialog with the user's other watch lists; the sources keep their stories. A source the other list already has is only taken out of this one.
- The row's "⋯" menu has **Move to…** too (only when the user has another list). No database change: it uses the access rule from Fix sources.
- Checked: type check, build, scanner tests. In the browser: moved 2 ticked sources, removed 2 ticked sources after the question, moved 1 from its menu into a list that already had it (checked in the database).
- Not checked: light mode and 320 px.
- Next: Keywords job.

## 2026-10-29: Paste links

- "Add many at once" has two tabs: **Paste links** (default) and **Upload a file**. The component is now `AddManySources.vue` (was `SourceFileImport.vue`).
- Paste: one link per line, text around them is fine, a bare domain on its own line gets `https://`. While typing: "4 links ready · 2 lines aren't links", with the bad lines listed. Add checks the links like the upload and clears the box.
- Checked: type check, build, scanner tests. In the browser: 6 pasted lines (4 links incl. a bare domain, 2 bad lines), Add gave 3 added and 1 "page not found"; the Upload tab with a 13-link file.
- Not checked: light mode and 320 px; no database or scanner change.
- Next: Select, move and remove sources job.

## 2026-10-29: Check links

- New Edge Function `check-links`: checks up to 10 links per call with the scanner's own code (`src/scanner/check-link.js`, imported from `src/scanner/`). Signed-in users only (`withSupabase`), public `http(s)` addresses only, at most 15 seconds per link.
- The single add field, the file upload and the Fix/Edit dialog check links first ("Validating source(s)…"). Working links are added; the others aren't, with one line per reason. Long lists go 10 per call, 3 calls at a time.
- Scanner: certificate and connection errors are "can't be reached" in Deno too (any fetch `TypeError`).
- Checked: 17 scanner tests (incl. a local test server: works, 404, 403, no stories, too slow, private addresses), db lint, type check, build. The function served locally: 6 real links in 4.4 s with the right reasons, 401 without sign-in, 11 links refused, CORS preflight OK. In the browser: one bad and one good link in each of the add field and Fix dialog, a 13-link file (8 added, 4 refused with reasons, 1 already in the list).
- Not checked: the database tests (no migration in this job; the local database has a test user, see `known-issues.md`); the deploy to the cloud.
- Release order: Ken deploys the function before merging (`npx supabase functions deploy check-links --use-api`), or adding links breaks on the live app.
- Next: Paste links job.

## 2026-10-29: Fix sources

- Scanner: saves why a source couldn't be read in `sources.problem`: `not_found` (404, 410), `blocked` (401, 403, 429), `unreachable` (timeouts, connection and certificate errors, 5xx), empty otherwise.
- Source list: the domain (plus the end of the path when two rows share a site), the status line with the reason in red and a warning icon, a Fix button on failing sources, and a "⋯" menu with Edit and Remove on every row.
- Fix/Edit dialog: the link field and Save; Fix adds one line on the problem. Save swaps the source in this list only and keeps its place; a link already in the list is refused.
- 1 migration: the `problem` column, plus an access rule letting users change the sources in their own lists (Ken, 2026-10-29; the Move job needs it too).
- Checked: 13 scanner tests, 42 database tests, db lint, type check, build. A local scan of real sites gave all 4 reasons; in the browser (dark mode, desktop): the rows, Fix with a duplicate and a new link, Edit, Remove.
- Not checked: 320 px and light mode (the browser window couldn't be resized).
- Release order: push the migration to the cloud before Ken merges, or the live scanner fails writing `problem`.
- Next: Check links job.

## 2026-10-29: New scanner (build step 4)

- `src/scanner/` replaces the prototype: no selectors. Each source is read from its feed (the address itself, one named in the page, or a guessed `/feed`), or else from the page's biggest list of headline links. Newest 50 per source.
- Saves new stories to Supabase (secret key); stories are never deleted, so a failing source no longer floods the next alert.
- Only sources that a watch list follows. `scanner.yml` runs every hour at :17, one run at a time.
- Source status on the watch list page: "Working · Last checked 10:40", "No stories found · …", "Not checked yet". New columns on `sources` (1 migration); users can only set `url` and `name`.
- Health email to `ADMIN_EMAIL` when a source just broke (0, under half of last time, or unreadable on its first check). Logs show totals only.
- Removed: `scraper.yml`, `src/index.js`, `sites.js`, `state.json`, `src/utils/`, `reset.js`.
- 13 of the 23 old sources read (the prototype: 9). The other 10 need JavaScript or block bots (`known-issues.md`). AI fallback: not built, decided after we see real failures.
- Checked: 10 scanner tests, 38 database tests, db lint, type check, build; two local scans (42 then 0 new stories, one health email in Mailpit, none on the second run); the 3 status texts in the browser.
- Released (PR #5, merged by Ken). Before the merge: migration pushed to the cloud; GitHub secrets `SUPABASE_SECRET_KEY` (Supabase key `wirescout_scanner`) and `ADMIN_EMAIL` added; `EMAIL_*` on the Gmail app password (Ken). The web app deploy passed.
- First live scan (Ken ran it by hand, 2026-10-29 14:51 UTC): passed in about 2 minutes. 56 sources, 20 working, 36 with no stories, 279 new stories; the health email arrived.
- Why the 36 fail: 16 wrong links (9 dead, checked in Chrome too; 7 home pages or redirects elsewhere), 8 block GitHub's servers (3 of them work from a normal connection), 5 down or with a broken certificate, 7 need JavaScript. Ken: a wrong link is the journalist's to fix, so the app must show why and let them fix it.
- Planned from this test and Ken's list (`docs/mvp-plan.md`): Fix sources, Check links, Paste links, Select, move and remove sources, then keywords.
- Next: the Fix sources job. Its plan, waiting for Ken's "approve":
    - Scanner: save why a source failed in a new `sources.problem` column (1 migration): `not_found` (404, 410), `blocked` (401, 403, 429), `unreachable` (timeouts, connection and certificate errors, 5xx), empty otherwise (0 stories shows "No stories found"). Unit test for the mapping.
    - Source list: the domain only (plus the end of the path when two rows share a domain), the status line, a warning icon with the reason and a Fix button on failing sources, and a "⋯" menu with Edit and Remove on every row.
    - Fix/Edit dialog: one line on the problem (Fix only), the link field, Save. Save swaps the source in this list only; a link already in the list is refused.
    - Release order: push the migration before Ken merges, or the live scanner fails writing the new column.

## 2026-10-29: Repo moved to the company GitHub account

- Ken transferred the repo from `kennethzuniga` to `fieldgibsonmedia` (a company user account, not an organization). Workflows and the `EMAIL_*` secrets moved with it.
- The web app is now at `fieldgibsonmedia.github.io/wirescout/` (GitHub doesn't redirect the old Pages address). Ken re-ran the deploy and set the Supabase site URL and redirect URL to the new address.
- Checked: the new address serves the app and its deep links; a password-reset email linked to the new address and worked (Ken).
- This Mac: `gh` and git use only `fieldgibsonmedia`; the `kennethzuniga` login and saved git password were removed. The old `gh` token was not revoked on GitHub, because Ken uses it on his personal machine.
- Docs and comments updated to the new account.
- Next: step 4, the new scanner.

## 2026-10-29: Deploy from `main` (deploy job)

- Decided: each finished stage goes from `mvp` into `main` and is tested live, instead of one release at the end.
- `deploy-app.yml` publishes the web app to GitHub Pages on every push to `main`, at `/wirescout/`, with `404.html` so email links open the app. `.env.production` points it at the cloud Supabase.
- Scanner workflow: Node 22 and `npm ci --omit=dev`, so the web app's build tools (and the Supabase CLI download) stay out of the live scanner.
- Cloud database: the 5 new migrations pushed (all 6 match local).
- Checked: the scanner installed like the workflow (Node 22, `--omit=dev`) and ran once, emailing a throwaway local inbox; type check and build pass; the app built for `/wirescout/` and served like Pages (5 browser checks: deep links, email link, sign in, reload).
- Not checked: the real Pages deploy and the live app (Ken's steps).
- Released (PR #4, merged by Ken): the deploy passed and the app is live.
- Cloud settings done by Ken: site URL, sign-up hook, 3 email templates, sign-ups on.
- Email: the cloud SMTP failed (Gmail no longer takes a normal password). Microsoft 365 was ruled out (password SMTP ends December 2026), and Brevo with the company domain needs DNS records IT won't add. Now Gmail with an app password.
- Ken signed up on the live app, confirmed by email and reached the dashboard.
- `gh` installed and signed in, so release PRs are opened from here. `EMAIL_RECIPIENTS` removed from GitHub secrets (the old scanner, failing since 2026-10-27, is a prototype).
- Next: step 4, the new scanner. When it or the digest sends email from GitHub, Ken updates the `EMAIL_*` secrets to the Gmail app password.

## 2026-10-29: Self sign-up (build step 3, job 2)

- Sign-up page linked from sign-in. Only emails in `allowed_email_domains` (5 company domains, or single addresses) get an account: a Supabase "before user created" hook (free plan) refuses the rest.
- Refused emails see "Account creation denied" and a Request access form (name, email, reason) that saves to `access_requests`: insert only, one open request per email, length limits, bot trap.
- Account, password-reset and email-change emails link to a Confirm page that acts only on click, so email scanners can't use the links up. Templates in `supabase/templates/`.
- Email change in Account settings (confirmed from both addresses); the profile follows the new email.
- Signing up gives no magazine: Ken decided to settle magazine access in step 6 (MODX/Statamic accounts).
- New rule in `communication.md`: ask before changing any data, even locally.
- Checked: 37 database tests pass, db lint clean, type check and build pass, 17 browser checks with made-up users (every flow, 320 px, dark mode).
- Cloud, after the deploy (Ken, guided): turn on sign-ups, email confirmations and the hook, paste the 3 templates, set the site URL.
- Next: deploy job (GitHub Pages).

## 2026-10-27: Watch lists web app and dashboard (build step 3)

- Vue web app in `src/app/`: sign in, set password (from invite or reset email), forgot password, dashboard, watch list.
- Layout like hub: side nav (Dashboard, Watch lists, Settings) and account menu. Apple blue as the primary colour.
- Dashboard: one box per watch list with its new-item count (new view `watch_list_new_counts`).
- Watch list: stories newest first with "New" markers and a Share menu (LinkedIn, Email, Copy link), sources added and removed by URL.
- Watch lists are no longer tied to a magazine. Settings pages: daily digest (hour or off, time zone, weekdays) and channels.
- 3 new migrations, 22 database tests. Checked in a browser against the local Supabase with made-up users: every flow, 320/768/1280 px, dark mode, keyboard.
- Not done yet: publishing the app (GitHub Pages) and pushing the new migrations to the cloud project.

Job 1 (2026-10-28): daily digest on/off and time to the minute, Account settings (name, password, theme), Rename and Delete for watch lists, 50 stories at a time, sources from an `.xlsx`, `.csv` or `.txt` file. Committed and merged into `mvp`.

**Agreed for later jobs:**

- Step 4 (new scanner): show each source's status ("Working", "No stories found", "Last checked"); skip sources no list follows anymore.
- Usage report job, right after step 5: count active days per person (one row per person per day) and Share clicks; email on the 1st of each month with a table of the last 6 months per person (bars made of table cells). Recipient in GitHub secret `ADMIN_EMAIL` (Ken sets it; never commit the address). The same job emails Ken new access requests within a few hours. Tell journalists about the tracking in one line.
- Keywords job, right after step 4: optional "Only show stories that mention…" per watch list (title and summary, ignoring capitals), plus a search box in the list.
- Rejected: PostHog (too much for now); paste-only bulk add (people expect file upload).

**New build order:** finish step 3 (jobs 1 and 2) → deploy job (GitHub Pages) → step 4 scanner → keywords → step 5 digest → usage report → step 6 post to magazines.

- Next: job 2, self sign-up.

## 2026-10-27: Supabase database and login (build step 2)

- Schema and access rules in `supabase/migrations/`, tested locally: 12 access tests pass.
- Login is invite-only: verified locally that strangers can't sign up and invited users can sign in.
- Cloud project created (West EU, Ireland), schema pushed, public sign-ups off.
- Login uses passwords: the invite opens a "Set your password" page (built in step 3).
- Cloud SMTP set to the scanner's mail account, for invites and password resets.
- Not tested yet: a real invite email from the cloud project. It needs the step 3 "Set your password" page.
- Next: step 3, watch lists UI and dashboard.

## 2026-10-27: Docs and Claude setup (build step 1)

- Added `docs/` (project facts, MVP plan, progress, known issues) and `README.md` listing them.
- Added `CLAUDE.md` and `.claude/` (rules, guard hook, settings), adapted from the hub repo.
- Created the `mvp` branch from `main`: all MVP work merges there until release.
- Next: step 2, Supabase setup.
