# MVP plan

Agreed with Ken on 2026-10-27. Turns the prototype into an internal MVP for more journalists.

## Goals

- Each journalist signs in and manages their own watch lists.
- No HTML selectors asked from users: sources are added by URL only.
- One daily digest email instead of an alert every few hours.
- Share a story: as a draft to the journalist's magazine, on LinkedIn, by email, or as a copied link.
- $0 running cost.

## Decisions

| Area | Decision | Why |
| --- | --- | --- |
| Frontend | Vue 3 + TypeScript, Vite, Tailwind + DaisyUI, Reka UI; static app on GitHub Pages | Same stack as hub, so any FGM dev can work on it; free hosting |
| Backend | Supabase free tier: login, Postgres, row-level security, Edge Functions | Free; no server of our own to run |
| Architecture | Decoupled but small: static app + Supabase + scanner | Each part is free to host; no API layer to maintain |
| Scanner | GitHub Actions on a schedule, state in Supabase | Free (public repo); stops committing `state.json` to `main` |
| Email | Brevo (free, 300 a day) over SMTP, sending from our own domain `wirescout.app` (decided 2026-11-03, "Own domain" below). Before: a Gmail account with an app password | Microsoft 365 quietly dropped a colleague's confirm email from the Gmail sender. We own `wirescout.app`, so we add the DNS records ourselves, without IT |
| Address | `wirescout.app` as the web app's address (GitHub Pages custom domain, decided 2026-11-03). Before: `fieldgibsonmedia.github.io/wirescout/` | Same domain as the emails' sender; a short, real address for journalists |
| Posting | A Supabase Edge Function posts straight to the magazine's MODX connector, signed in as the journalist's own MODX account (decided 2026-11-02, `docs/post-to-modx-plan.md`) | No endpoint to write on 4 sites; MODX enforces who may post where; the session stays server-side, encrypted |
| Sharing | LinkedIn and email through share links: LinkedIn's share window and the user's own email app | No setup, no logins to expire, free; the journalist posts or sends as themselves |
| Look | Apple's web blue (`#0071E3`) as the primary colour until Wirescout has a brand | Apple's system blue `#007AFF` is too light for white button text (4.0:1) |
| Brand | The robot icon always goes with the name "Wirescout", right before it: the app's screens (side nav, phone top bar, sign-in screens) and every HTML email (digest, account emails). The app draws it (`BrandIcon.vue`); emails use the PNG made from the same drawing, `public/brand-icon.png` (`wirescout.app/brand-icon.png`). Plain-text emails can't show it (Ken, 2026-11-04). The browser tab icon is the robot alone, in white on a brand blue square (`public/favicon.svg`, with PNGs for older browsers and iPhone; Ken, 2026-11-05) | One look everywhere journalists see Wirescout. Most email apps don't show SVG |
| Bulk sources | File upload (`.xlsx`, `.csv`, `.txt`) with `read-excel-file`, loaded only for `.xlsx` | People expect to upload a file; paste-only was rejected. Keeps the app small for everyone else |
| Analytics | PostHog, read in Wirescout's own Analytics screen (Ken, 2026-11-04, "After the first journalist", job 3). Before: our own usage report | Journalists use it now: Ken needs more than days and shares, without learning PostHog's UI |
| Version | Every job that changes what users get (app, digest, emails) raises it, with a "What's new" entry (Ken, 2026-11-04): a fix or small tweak the last number (0.1.0 → 0.1.1), a new feature the middle one (0.1.0 → 0.2.0). Docs-only jobs don't. Every place that shows it reads `package.json`. Before: 0.1.0 until real users were invited | Journalists use it now: the version tells them what changed |
| Release notes | List every change users get, security and dependency updates included. Most important first: security, then system, then features and fixes, looks (screens, icons) last (Ken, 2026-11-05) | v0.6.1 left out its security updates; journalists should see what matters most first |

## Scanning without selectors

For each source URL, in order:

1. **RSS/Atom feed:** auto-discover it from the page. Stable when the site's design changes.
2. **Automatic list detection:** Cheerio finds the repeated blocks of article links.
3. **Optional AI fallback:** only for sources the first two can't read. Pennies per month.
    - Not built in step 4 (Ken, 2026-10-29): first see how many sources journalists add can't be read.

**Health check:** when a source suddenly returns 0 articles, or far fewer than usual, a dev gets an email.

**Schedule:** the scanner runs every hour (Ken, 2026-10-29), so the app stays current through the day and the digest has everything up to about an hour before it's sent. Once a day was ruled out: the app would lag a day, and one failed run would lose a day.

## Data model (outline)

- **Users:** sign up and sign in through Supabase Auth. Only emails on the allowed list can sign up (self sign-up below).
    - Email + password, with a "Forgot password" link that opens a "Set your password" page.
    - Passwords, not emailed sign-in links: company email scanners "pre-click" links and break one-time sign-in links.
- **Publications:** Environmental Finance, InsuranceERM, Insurance Asset Risk, Corporate Disclosures.
- **User ↔ publication:** which magazines each user may post to (their magazine channels). Set by an admin by hand. Some users have none, some have several.
- **Watch lists:** owned by one user: a name plus its sources. Not tied to a magazine: the destination is picked per story when sharing.
- **User settings (on the profile):** name, digest time (any minute, or off), time zone, and which share options (LinkedIn, Email, Copy link) their Share menu shows.
    - The time zone isn't picked: the app takes it from the browser on every visit, London if it can't.
    - The theme (Auto, Light, Dark) is saved per device, not on the profile.
- **Sources:** one row per URL, shared by every watch list that uses it, so each URL is scanned once.
- **Articles:** found by the scanner, with the time they were first seen.
    - "New" on the dashboard = first seen after the user last opened that watch list.

## Screens (step 3)

- **Login:** sign in, sign up, forgot password, set your password (from the reset email), request access.
- **Layout:** same as hub. Side nav with Dashboard, then "Watch lists" (every list, plus "New watch list"), then Settings at the bottom. Top bar with the account menu (Account settings, Sign out).
- **Dashboard:** one box per watch list with its number of new items.
- **Watch list:** its articles, 50 at a time with "Load more", each with a Share menu, plus adding and removing sources by URL.
    - "⋯" menu next to the title: Rename (dialog) and Delete (confirm dialog, red Delete, Cancel focused first; then back to the dashboard).
    - Add many sources at once: drop or choose an `.xlsx`, `.csv` or `.txt` file. Every web address in it is found (no column picking), shown as "Found N addresses" with an Add button, then "12 added, 2 already in the list, 1 isn't a web address". Max 100 addresses and 1 MB. Apple Numbers files: "Export as Excel or CSV first".
- **New watch list:** a dialog with just a name.
- **Settings → Daily digest:** on/off and a time field that takes any minute (e.g. 7:15). Says it's sent Monday to Friday, at around that time. The time zone shows as text.
- **Settings → Channels:** the user's magazines (read-only, an admin adds them) and switches for each share option.
- **Account settings** (from the account menu): name, password change (current password required), theme Auto/Light/Dark.
- Look and behaviour follow hub's `DESIGN.md` (`../hub/DESIGN.md`): DaisyUI for looks, Reka UI for dialogs and menus.

## Code layout

- One project and one `package.json`. All code in `src/`: the web app in `src/app/`, the scanner in `src/scanner/` (moved there in step 4).
- `supabase/` stays at the root: the Supabase CLI expects it there.

## Features

### Daily digest

- The scanner runs every few hours and only saves new articles. It sends no email.
- Monday to Friday, each user gets **one** email at the time they picked, in their own time zone (7:00 unless they change it, or never if they turn it off): a section per watch list, the new-item counts, and a link to the dashboard.
    - The sender runs on a schedule and sends to everyone whose time has passed since its last run (how often: decided in step 5). GitHub's scheduled runs can start late, so it arrives "around" that time.
- This replaces the earlier idea of a separate email per list.
- Agreed with Ken on 2026-10-30:
    - Sent every 15 minutes to whoever is due; a skipped run is caught up the same day, never the next.
    - Stories found since the last digest (at most 7 days back), through the keywords. No email when nothing is new.
    - One section per list: "Regulators · 5 new stories", and on the right a red "⚠ 3 problematic sources" linking to the list's Sources tab. A list with failing sources but nothing new still shows.
    - Up to 5 stories per list, then "See all new stories on Wirescout". Each story links to its own page in the app (back link to its list, Share menu), never to the source site, so the activity stays in Wirescout.
    - Signing in returns to the link that was opened.

### Dashboard

- One box per watch list, showing its number of new items.
- Clicking a box opens that watch list.

### Post from Wirescout

- "Send to <magazine>" is an option in each story's Share menu: one entry per magazine. Not connected yet: the same dialog asks for the MODX sign-in first.
- The confirm step names the magazine ("Post draft to Insurance Asset Risk?").
- Stories go in as **drafts** so an editor still reviews them.
- All 4 magazines run on MODX today. No site changes: Wirescout calls the same connector the MODX manager uses, as the journalist (decided 2026-11-02, `docs/post-to-modx-plan.md`).
- All 4 are moving to Statamic (months away). Same function, a second adapter; the app doesn't change.
- **Decided 2026-11-02:** who may post to which magazine is whoever has their own MODX account there. A journalist connects a magazine once with their MODX username and password; the password is never stored. All 4 magazines are offered to everyone, and `user_publications` no longer gates posting.

### Self sign-up (job 2 of step 3)

- Sign-up page (email + password), linked from sign-in. Replaces invites.
- Allowed list in a table `allowed_email_domains` (domains plus single full addresses, editable in Studio): fieldgibsonmedia.com, environmental-finance.com, insuranceassetrisk.com, insuranceerm.com, corporatedisclosures.org. Enforced by a Supabase "before user created" hook (on the free plan).
- Signing up gives no magazine: see "Post from Wirescout".
- Verification, password-reset and email-change emails: a link to a Wirescout page with a confirm button (token hash), so email scanners can't use up the link. Templates in `supabase/templates/`; Ken pastes the cloud ones into the dashboard.
- "Account creation denied" ends with "Request access": name, email, reason. Stored in `access_requests` (insert only, one open request per email, length limits, honeypot). Ken approves by adding the address to the allowed list and replying himself.
- Email change in Account settings comes with this job (it sends confirmation links).
- Leavers: their account stays until Ken deletes it in the dashboard (documented).

### Source status (step 4)

- Each source shows its status: "Working", "No stories found", "Last checked".
- The scanner skips sources no watch list follows anymore.

### Fix sources (job after step 4, agreed 2026-10-29)

A wrong link is the journalist's to fix, so the app shows them which source fails, why, and lets them fix it.

- Each source row shows the domain and a status line: "Working · Last checked 10:40", or a warning icon with the reason. No full link in the list (it crowds it).
    - Two sources with the same domain also show the end of their path (`swissre.com · news_releases`).
- Reasons, from the scanner's last check (saved on the source):
    - "Page not found · check the address" (the site says 404).
    - "The site blocks Wirescout" (403, 429).
    - "The site can't be reached" (timeouts, certificate errors).
    - "No stories found" (anything else).
- A failing source has a **Fix** button. Every source has a "⋯" menu with **Edit** and **Remove**.
- Fix and Edit open the same dialog: the link field and Save. Fix adds one line explaining the problem.
- Save swaps the source in this watch list only (sources are shared, so the shared address never changes). The new link shows "Not checked yet" until the next scan.

### Check links before adding (job after fix sources, agreed 2026-10-29)

- Every way of adding a link (the single field, paste, file upload, the Fix and Edit dialog) checks it first: a spinner and "Validating source(s)…".
- The check runs the scanner's own reading code in a Supabase Edge Function (free plan): a browser can't fetch other sites.
- Links that work are added. The others aren't, with their reason:
    - "X, Y and Z return "page not found". Check the links and try again."
    - "A, B and C couldn't be added: the site blocks Wirescout."
    - "The site can't be reached" (down, timeouts, certificate errors), and "No stories found".
- The function runs on other servers than the hourly scan, so "blocks Wirescout" isn't always the same there: a link can pass and still be blocked on its first scan. The Fix button covers that.
- Production step: Ken deploys the function to the cloud project.

### Paste links (job after check links, agreed 2026-10-29)

- "Add many at once" has two tabs: **Paste links** (default) and **Upload a file** (the drop zone as before). Replaces the 2026-10-27 "file upload only": paste comes on top of it.
- Paste: a text area, one link per line; text around the links is fine, as in a file. Same finder and limit (100) as the upload.
- Checked while typing: "12 links ready · 2 lines aren't links", listing the bad lines so they can be fixed before adding.
- A bare domain (`presse.macif.fr`) counts: `https://` is added, as for `www.` today.
- **Add** adds only the good links, with the same result line as the upload.

### Select, move and remove sources (job after paste links, agreed 2026-10-29)

- A **Select** button above the source list shows a checkbox on each row.
- With sources ticked, a bar shows "3 selected" with **Move to…** and **Remove**.
- Remove asks first ("Remove 3 sources?", red Remove, Cancel focused first).
- Move to… lists the user's other watch lists; the sources move there and keep their stories.
- The row's "⋯" menu also has **Move to…** for one source.

### Keywords (job after step 4)

- Optional "Only show stories that mention…" per watch list: matches the title and summary, ignoring capitals.
    - Whole words or phrases (Ken, 2026-10-30): "AI" matches "New AI rules", not "said". Up to 20 keywords.
    - The database does the matching (`watch_list_articles`), so the app, the dashboard counts and the digest agree. Keywords only hide stories; the scanner still saves all of them.
- A search box in the watch list: any part of a word, within the stories the keywords let through.

### Usage report (job after step 5)

- Counts active days per person (one row per person per day) and Share clicks.
- On the 1st of each month, emails a table of the last 6 months per person (bars made of table cells).
- Recipient in the GitHub secret `ADMIN_EMAIL` (Ken sets it; the address is never committed).
- The same job emails Ken new access requests within a few hours.
- Journalists are told about the tracking in one line.
- Agreed with Ken on 2026-10-30:
    - Also counts digest clicks (links opened from the digest, tagged `?from=digest`), not opens: open tracking needs an image, which Apple Mail always loads and Outlook blocks.
    - The report also lists the 5 most shared stories of the month.
    - One hourly workflow (`admin.yml`, :40) sends both emails; each is sent once, and a skipped run is caught up.

### Polish before step 6 (agreed 2026-10-30)

Ken's 18 changes from using the live app, in 7 jobs (one branch each, from `origin/mvp`), released together as v0.1.0.
No Pinia: shared data stays in the small stores in `src/app/lib/` (`watchLists.ts`, `profile.ts`); looked at again in step 6.
Jobs 1–7 are done (`docs/progress.md`): quick fixes, look and feel, motion, watch list settings, save stories, dashboard, global search.

**Job 4, watch list settings (Ken's items 1, 12):**

- Side nav: each watch list shows a "⋯" button on hover and focus (always on phones), with **Edit** and **Delete**. Same menu as the list page (`WatchListMenu.vue`, reused). The list page reads its name from the `watchLists` store, so a rename from the nav updates the open page too.
- Keywords move out of the Stories tab into the Edit dialog ("Name" and "Only include stories that mention…"). Rename becomes Edit.
    - Ken thought keywords would make Wirescout scan only matching stories. They already do the same in effect: stories that don't match never show in the list, the dashboard count or the digest (`watch_list_articles`). The scanner still reads every story, because other lists may follow the same source.
    - The Stories tab keeps only the search box. `KeywordsFilter.vue` goes; its parsing and limits move into the Edit dialog.
- No database change.

**Job 5, save stories (item 13):**

- A Save button on each story card (in the list and on the story page): Save / Saved. "Save" is the word news apps use for "keep for later" (Ken, 2026-10-30).
- The Stories tab gets a switch, **All stories · Saved**. Saved shows only that list's saved stories, newest save first.
- Saved stories belong to the watch list, so deleting the list removes them.
- 1 migration: table `saved_stories` (watch list, article, saved at), with access rules (own lists only) and pgTAP tests.

**Job 6, dashboard (items 14, 16, 18):**

- Each list's card: a big number (new stories, or "No new stories"); a small bar chart of stories per day over the last 7 days (after keywords); "24 sources · ⚠ 2 failing" (failing in red, linking to the Sources tab, like the digest); "3 saved" and "Latest story 2 h ago".
- 1 migration: a view `watch_list_stats` (security invoker) with the source count, failing count, saved count, latest story and the 7-day counts.
- Release notes: a "What's new" card after the list cards (people come for their lists). It shows the latest version's notes; "Earlier versions" expands the rest. The notes live in `src/app/lib/releaseNotes.ts`, updated with each release; no database. The first entry is v0.1.0, listing this stage's changes.

**Job 7, global search (item 2):**

- A search field in the top bar (an icon that opens it on phones). Enter goes to a **Search** page (`/search?q=…`).
- Stories: every list's matching stories (title and summary, same matching as the list search), each with its list's name, opening its story page.
- Sources: sources whose name or link matches, each opening its list's Sources tab.
- No database change: `watch_list_articles` and `watch_list_sources` as they are.

**Release v0.1.0:** after job 7, merge `origin/main` into `mvp`, push the 2 migrations (jobs 5 and 6) to the cloud, then the release PR. Live impact: the web app only.

### Before the first journalist (agreed 2026-11-03)

Ken's 12 changes after testing step 6 live, in 6 jobs, in this order: one Claude session and one branch each, from `origin/mvp`. Ken invites the first journalist once all 6 are done. The version stays 0.1.0 (Decisions).

**Job 1, version (Ken's item 2):**

- Back to 0.1.0: `package.json` and the "What's new" card. A session set 0.2.0 on 2026-11-02 because the decision wasn't written down.
- The drafts-to-magazines notes, now under 0.2.0, join the 0.1.0 entry.
- One source: every place that shows the version (the side nav, the "What's new" badge) reads `package.json` (`__APP_VERSION__`). No version typed by hand in `releaseNotes.ts`.

**Job 2, missing digest (item 7):**

- Ken hadn't seen his daily digest since the last release. Done 2026-11-03, no code change: the digests were sent (run logs: Fri 30 Oct and Mon 2 Nov, 1 sent each; none at weekends, by design) and landed in Ken's junk folder (`docs/known-issues.md`).

**Job 3, drafts to magazines (items 3, 4, 5):**

- Everything sent to a magazine is in en-GB, whatever the story's language. Ken sent a French story to Corporate Disclosures and got a French title and text.
    - The fallback (no AI available) keeps the story's own text, whatever its language: nothing can translate it then (Ken, 2026-11-03).
- Send dialog: the note "Wirescout uses AI to write drafts…" moves above the buttons, not under them.
- After sending: "Open in <Magazine>" sits inside the "Draft sent to <Magazine>." message.
- Release: redeploy all 3 posting functions (`draft-text`, `magazine-connect`, `post-draft`). This also replaces whatever is live now: whether they were redeployed after PR #16 wasn't recorded.

**Job 4, Remember me (item 1):**

- A "Remember me" checkbox on the sign-in form. It touches sign-in: plan first, then Ken's "approve".
- The plan settles what it keeps: staying signed in after the browser closes (`docs/known-issues.md`, "Stay signed in"), and whether the email address is pre-filled. The password stays with the browser's password manager.

**Job 5, polish (items 8–12):**

- Side nav: Dashboard first, then Watch lists (A–Z, "+ New watch list" last), then Settings (its items A–Z).
- Settings → Channels: the magazines A–Z. Share menu: its options A–Z.
- Add sources dialog: the paste box's focus border shows in full on the left and right; the file drop box is square (1:1).
- Brand icon right before the name "Wirescout": 2–3 options (Ken thought of a robot head), Ken picks one at the start of the job.

**Job 6, admin source alerts (item 6):**

- Ken stops receiving "Wirescout: N sources need a look": each user already sees their failing sources (digest and Sources tab), and keeping their sources right is their job.
- Keep one alert, only when the scanner itself breaks (Ken, 2026-11-03). The job defines "breaks" (e.g. most sources fail in one run) and says it in one line before coding. Live impact: the scanner (`scanner.yml`), which emails `ADMIN_EMAIL` only.

**Release:** after job 6, merge `origin/main` into `mvp`, redeploy the 3 posting functions, then the release PR. Still v0.1.0. Done 2026-11-03: PR #17 (the 6 jobs), the 3 posting functions redeployed by Ken, then 2 fixes from live testing: PR #18 (British English when the page can't be read, fallback reasons) and PR #19 (fallback boxes as warnings). Details in `docs/progress.md`.

### Own domain: wirescout.app (agreed 2026-11-03)

Why: a Corporate Disclosures colleague signed up on live (`@insuranceassetrisk.com`) and never got the confirm email. The Gmail account's Sent folder has it, no bounce; it isn't in his Junk, Other or quarantine. Microsoft 365 dropped it, and IT can't help yet. Ken's digests land in junk for the same reason (`docs/known-issues.md`). Ken registered `wirescout.app` at Namecheap on 2026-11-03; he controls its DNS.

Brevo can't send as a `@gmail.com` address: it swaps the sender for a shared `@brevosend.com` one. So the sender must be our own domain.

**Done when:** every email (account emails from Supabase, digest, admin, scanner health) comes from `Wirescout <no-reply@wirescout.app>` through Brevo, passes DKIM and DMARC, and the app opens at `https://wirescout.app`.

Three parts, in this order. Part 1 has no code and fixes the colleague's sign-up, so it goes first.

**Part 1, account emails through Brevo (Ken's steps, no code, guided one at a time):**

1. Brevo: create a free account. Senders, Domains & Dedicated IPs → Domains → Add `wirescout.app`. Brevo lists its records (a `brevo-code` TXT, DKIM, DMARC).
2. Namecheap → Domain List → `wirescout.app` → Advanced DNS: delete the parking records (`www` CNAME to `parkingpage.namecheap.com`, the `@` URL redirect), add Brevo's records exactly as shown, then Authenticate in Brevo.
3. Namecheap → Mail Settings → Email Forwarding: forward `no-reply@` (or a catch-all) to Ken. It gives the domain MX records (filters distrust a sender domain that can't receive mail) and replies reach Ken.
4. Brevo: add the sender `Wirescout <no-reply@wirescout.app>`. SMTP & API → SMTP: note the login and create an SMTP key (Ken keeps it; never in chat or the repo).
5. Supabase dashboard → Authentication → Emails → SMTP settings: host `smtp-relay.brevo.com`, port 587, the Brevo login and SMTP key, sender `no-reply@wirescout.app`, name `Wirescout`.
6. Test: Ken creates an account or resets his password with his own address; the email arrives, and "Show original" says DKIM and DMARC pass for `wirescout.app`. Then the colleague signs up again with the same address (Supabase resends the confirm email to an unconfirmed account).
7. Record each step in `docs/progress.md`.

**Part 2, digest, admin and scanner emails through Brevo (one job, code; approved by Ken and built 2026-11-03):**

- Today the sender is `EMAIL_USER` (`src/scanner/health.js`, `src/digest/index.js`, `src/admin/index.js`): the login doubles as the From address. Brevo's SMTP login isn't a real address, so the 3 senders use a new `EMAIL_FROM` instead (keeping each one's `…@wirescout.local` fallback for local runs).
- The 3 workflows (`scanner.yml`, `digest.yml`, `admin.yml`) set `EMAIL_FROM: no-reply@wirescout.app` as a plain value, not a secret: it's on every email anyway, and Ken has one secret fewer. Add it to `.env.example`; update `docs/project.md` and `CLAUDE.md` (no Gmail left).
- Checks: unit tests, type-check, build; locally `npm run scan`, `npm run digest` and `npm run admin` into Mailpit, each showing `no-reply@wirescout.app` as sender. That needs a made-up user and data in the local database: ask Ken first (`communication.md`).
- It touches env variables, CI and crons that email people: Ken's "approve" before coding (`workflow.md`). Live impact: the digest (journalists; today only Ken), admin and scanner emails (`ADMIN_EMAIL`). A wrong setting makes sending fail and the run red; the digest isn't marked done, so the next run retries it.
- Release, in this order:
    1. Ken merges the release PR. Until the secrets change, Gmail still sends (it shows its own address as sender): nothing breaks.
    2. Brevo → SMTP & API → a second SMTP key named `github` (each key can be revoked on its own).
    3. Ken sets 4 GitHub secrets, guided one at a time, between runs (not around :05, :17, :20, :35, :40, :50): `EMAIL_HOST` `smtp-relay.brevo.com`, `EMAIL_PORT` `587`, `EMAIL_USER` the Brevo login, `EMAIL_PASS` the `github` key.
    4. Check: Ken's next digest arrives from `no-reply@wirescout.app`, and the run log says "sent".

**Part 3, the app at wirescout.app (one job, code plus Ken's steps):**

- Before the release (Ken, guided):
    1. GitHub, signed in as `fieldgibsonmedia` (a user account, not an org) → Settings → Pages (github.com/settings/pages) → Add a domain: `wirescout.app`. Add the TXT record it shows in Namecheap, then Verify (stops anyone else claiming the domain on Pages).
    2. Namecheap: `@` A records `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`; `@` AAAA records `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`; `www` CNAME `fieldgibsonmedia.github.io.`
    3. Supabase dashboard → Authentication → URL Configuration: add `https://wirescout.app/**` to Redirect URLs (keep the old one until the switch is done).
- Code, on the job branch:
    - `vite.config.ts`: build `base` becomes `/` (the app now sits at the domain's root). Router, session cookie and the forgot-password link read `BASE_URL`, so they follow.
    - `digest.yml`: `APP_URL: https://wirescout.app`.
    - Comments naming `fieldgibsonmedia.github.io/wirescout/` (`vite.config.ts`, `deploy-app.yml`).
    - Docs: `CLAUDE.md` ("What is live"), `docs/project.md` (Stack), the app's address wherever it's written.
    - No `CNAME` file: deploys use GitHub Actions, so the custom domain is set in the repo settings.
- At the release (Ken, a quiet time, in this order; the app is down for a few minutes):
    1. Repo → Settings → Pages → Custom domain `wirescout.app` → Save. Wait for the certificate, then tick Enforce HTTPS (`.app` works only over HTTPS).
    2. Merge the release PR; the deploy publishes the app at `/`.
    3. Supabase → URL Configuration: Site URL `https://wirescout.app` (account emails link to it).
    4. Check: `https://wirescout.app` opens, a deep link (`/lists/…`) opens, sign in, a password-reset email's link opens the Confirm page. The old `github.io/wirescout/` address should redirect; check it.
- Everyone signs in again once (the app's storage belongs to the old address). Today that's Ken and the colleague.
- Live impact: the web app (Ken, the colleague), the digest's links, the account emails' links.

### After the first journalist (agreed 2026-11-04)

Ken's 9 points from testing live, grouped into 3 jobs (one branch each, from `origin/mvp`), in this order. Each job raises the version (Decisions).

**Job 1, sources and wording (points 1, 2, 3, 4, 9), v0.2.0:**

- Paste error (point 1): Ken pasted 20 links and got "The sources couldn't be added"; the second try worked. Not the empty line: blank lines and repeats are dropped before anything is sent. Likely cause: the link check timed out on slow sites (Bloomberg, WSJ, FT, Reuters). Reproduce locally with the same 20 links first, then fix the cause. A failure must never hide which links did work.
- Upload a file (point 2): the drop box goes back to its natural height (undo `aspect-square` from "Before the first journalist", job 5), and the dialog's fixed height with it, so the found addresses show without scrolling past the box.
- Duplicates (point 3): one link pasted or uploaded twice is already added once, and links already in the list count as "already in the list". New: the same address written differently counts as one: `http://` or `https://`, with or without `www.`, a trailing `/`. Within the paste or file, and against the list.
- Channels (point 4): the intro reads "Connect your MODX account to send story drafts to Field Gibson Media magazines."
- First stories right away (point 9, Ken's pick of 2): after sources are added, Wirescout reads them once, with the scanner's own code and rules (newest 50, new links only), and saves their stories and status. A new list shows stories within seconds instead of after the next hourly scan. Plus a note on the list, while it has no stories yet: Wirescout checks the sources every hour and new stories appear on their own.
- Live impact: the web app, and an Edge Function (Ken deploys it). No migration expected; ask Ken if one turns out to be needed.

**Job 2, accounts (points 5, 6), v0.3.0:**

- Super admin: a flag on the profile that users can't set themselves. Ken sets it on his own account with one SQL line in the dashboard (his address stays out of the public repo).
- Settings → Manager → System settings (super admin only; Manager is the super admin's own section in the side nav, under Settings, Ken 2026-11-04): the allowed domains and single addresses (`allowed_email_domains`, already used by the sign-up check), with Add and Remove. The database allows it for the super admin only, not just the screen.
- Delete account (point 6): at the bottom of Account settings, with a confirmation. Deletes the account and everything in it: watch lists, magazine connections (their MODX sessions are ended first), usage. Needs an Edge Function (only the server may delete an account). Shared records other people rely on (e.g. "already sent to <magazine>") are checked during the job. Ken's call (2026-11-04): the drafts a deleted account sent stay in the publish log without the person, so colleagues still see "A former colleague already sent this story".
- Live impact: a migration, a new Edge Function and the SQL line (Ken runs all 3), then the web app. Touches login and permissions: Ken's "approve" before coding.

**Job 2b, system admins (Ken, 2026-11-04, after job 2's release), v0.4.0:**

- Wirescout always keeps at least one super admin. The database refuses to remove the last one, however it's done: the System admins tab, deleting the account (in the app or the dashboard), or SQL.
- Delete account: the only super admin sees "You are the only super admin at the moment. Assign another super admin before deleting your account." instead of the confirmation. The `delete-account` function refuses too.
- System settings gets two tabs, like a watch list's: Platform access (who can sign up) and System admins. A super admin adds another by the email of an existing account (no invitations), and removes one, themselves too, while another is left.
- The SQL line is only for the first super admin.
- Live impact: a migration and the `delete-account` redeploy (Ken runs both), then the web app. Only Ken is a super admin, so journalists see only the version change.

**Job 3, analytics and privacy (points 7, 8), v0.5.0:**

- PostHog replaces Wirescout's own usage counting (Ken, 2026-11-04). Free tier, EU hosting. Ken creates the account.
    - Tracked: page views, active users, the main features (add sources, share, send a draft, search, save, digest links opened, settings changed), errors. Each tied to the signed-in user, so the numbers show who uses Wirescout.
    - No cookies: PostHog keeps nothing in the browser between visits; each visit is tied to the user at sign-in. No cookie banner needed.
    - Replays on, with everything people type hidden.
- Settings → Manager → Analytics (super admin only): active users, top pages, top features, errors and replays, per day, week, month and year. An Edge Function reads PostHog with Ken's PostHog key, which never reaches the browser. Replays open in PostHog's player.
    - "Download report": a PDF of the usage numbers, without errors, for management. It replaces the monthly usage report email.
- The app stops its own counting (`usage.ts`), and `admin.yml` stops the monthly usage report; access request emails stay. The old tables and their data stay untouched.
- Privacy (point 7): the Usage section leaves Account settings. A "Privacy policy" link next to the version at the bottom of the side nav opens a dialog: what PostHog records (including replays, typed text hidden), who sees it, and that Wirescout never stores MODX passwords, only an encrypted sign-in session so drafts can be sent.
- Live impact: the web app (every user is tracked from the release), an Edge Function and its PostHog secret (Ken sets and deploys them), and `admin.yml`. Ken's "approve" before coding.
- Agreed with the plan (Ken's "approve", 2026-11-04):
    - PostHog gets only the user id; the Analytics screen adds names from our database. Only signed-in use is recorded.
    - The PDF is made in the browser with jsPDF, loaded on click.
    - Locally nothing goes to PostHog (no key), and the PostHog code is tested against made-up answers.
    - Deleting an account also deletes the person in PostHog, with their events and replays.
    - The usage report for November (due 1 December) isn't sent; November's first days stay in the old tables.
- Added while testing (Ken, 2026-11-04): Analytics periods 1 Day, 1 Week, 1 Month, 6 Months, 1 Year, All. Sign-up requires agreeing to the privacy policy, and `profiles.privacy_accepted_at` records when. The privacy policy says "pseudonymised", never "anonymised".
- PostHog: EU project 334525. Its project key is public (`.env.production`). Ken keeps the personal API key (scopes Query: Read, Person: Write) and sets it as the function secret `POSTHOG_PERSONAL_API_KEY`, with `POSTHOG_PROJECT_ID`.

**PostHog reverse proxy (agreed 2026-11-04, after the v0.5.0 release):**

- Why: ad blockers and privacy add-ons block `*.posthog.com`, so their users aren't counted (`docs/known-issues.md`). Should have been in job 3's plan.
- Direction (Ken's go): PostHog's managed reverse proxy, free for PostHog Cloud. Ken adds one DNS record at Namecheap for a `wirescout.app` subdomain with a neutral name (PostHog advises against names like `analytics`, `tracking` or `posthog`). The app's `api_host` then points at it; `ui_host` stays `https://eu.posthog.com`, so replay links still open in PostHog.
- Ken's call: getting around people's blockers is acceptable for an internal tool that discloses PostHog in its privacy policy.
- Plan (waiting for Ken's "approve"):
    - Subdomain: `relay.wirescout.app` (neutral; free, and `wirescout.app` has no CAA records that could stop the certificate).
    - Code: `.env.production` gets `VITE_POSTHOG_HOST=https://relay.wirescout.app` (`analytics.ts` already reads it), and `analytics.ts` sets `ui_host: 'https://eu.posthog.com'`, as PostHog asks for a proxy. Locally nothing changes (no key).
    - Errors and replays: posthog-js loads its add-on scripts (`lazy-recorder.js`, `exception-autocapture.js`) and feature settings from `api_host` when it isn't a posthog.com address, so they come through the proxy too (checked in posthog-js 1.438.13).
    - Privacy policy: no change. It names PostHog, hosted in the EU; the data still goes to PostHog's EU project. The proxy runs on Cloudflare, already one of PostHog's listed subprocessors.
    - Version 0.5.1, with a "What's new" line: "Fixed: usage statistics were missing for some browsers."
- Release, in this order (Ken):
    1. PostHog → Organization settings → Managed reverse proxy → New managed proxy: `relay.wirescout.app`. It shows a CNAME target.
    2. Namecheap → `wirescout.app` → Advanced DNS → add a CNAME record, host `relay`, value the target from step 1.
    3. Wait until PostHog shows the proxy "live" (usually 2–5 minutes, up to 30). Claude checks from here that `https://relay.wirescout.app/static/array.js` answers with a valid certificate (a public file, no data sent).
    4. Merge the release PR. Before the proxy is live, merging would stop all analytics.
- Check on live (Ken, after the deploy), with Privacy Badger and uBlock Origin on: DevTools → Network, filter `relay`: requests answer 200 and nothing goes to `posthog.com`; then Analytics → 1 Day shows his visit, and a replay plays.
- Risk: uBlock Origin on Firefox can look up a subdomain's DNS alias (CNAME uncloaking) and apply its lists to the real address (`*.proxy-eu.posthog.com`). Today's EasyPrivacy rules for `posthog.com` match only retried sends (`retry_count`) and old addresses, so normal sends should pass. If the live check still shows blocks, the fallback is a proxy of our own, which hides the alias: a separate job.
- Not possible to test before the release: the proxy itself (testing it from here would send data to the real PostHog). Locally: type-check, build, and the built app has the new host.
- How to undo: revert the PR (back to `eu.i.posthog.com`). The DNS record and the proxy can stay.
- Live impact: the web app (every user's analytics), and Ken's DNS record and PostHog setting. Ken's "approve" before coding.

### Pages built with JavaScript (proposed 2026-11-05, shelved the same day)

Shelved (Ken, 2026-11-05): on live, 0 sources showed "No stories found" (63 read, 8 blocked). Pick it up again if such sources show up.

Why: some sources show no stories, because their page is empty until a browser runs its JavaScript (`docs/known-issues.md`, "10 of the 23 old sources"). Ken picked this as the next fix (2026-11-05); to be done in a new session.

1. Measure first: Ken runs one read-only query on live that counts failing sources by reason (numbers only, no names or addresses). Claude prepares it.
2. When a page shows no stories, the scanner opens it in a hidden real browser (headless Chromium, e.g. Playwright, in the scanner's GitHub Actions run), waits for the stories to load, then reads the page as today. Free; a few seconds more per such source.
3. Sites that turn away robots (403, bot checks): not worked around. They stay "blocked", as today.
4. No AI fallback needed for this: the pages aren't hard to read, only empty without a browser.

- Catch: `scan-new-sources` (an Edge Function) can't run a browser, so a new JavaScript page shows its stories after the next hourly scan.
- Live impact: the scanner (`scanner.yml` installs the browser: a CI change, Ken's ok) and longer hourly runs.
- Open before coding: the numbers from step 1, then Ken's "approve".

### Email change must pass the allowed list (approved 2026-11-05, built in v0.6.2)

Why: the sign-up check (`hook_before_user_created`) runs only when an account is created. A signed-in user can change their email in Account settings to any address, after confirming from both (`docs/known-issues.md`). Ken picked this as the next job (2026-11-05); to be done in a new session.

1. The database refuses it: a trigger on `auth.users`, before update of `email_change` (the address waiting for confirmation), raises an error when the new address isn't in `allowed_email_domains` (same match as the sign-up check: the full address or its domain). Supabase has no hook for email changes, and this is the one place every change goes through.
2. A clear message in the app: an `email_allowed(address)` function (security definer, signed-in users only, returns true or false) that Account settings calls before `updateUser`. Not allowed: "This email isn't allowed on Wirescout. Ask a super admin to add it in Platform access." The trigger still stops anyone who skips the app.
3. pgTAP tests: an allowed and a refused change, and that signed-out users can't call `email_allowed`.
4. Version 0.6.2 (a fix), with a What's new note, security first (Decisions, "Release notes").

- Live impact: Account settings → change email, for everyone. Existing accounts and their emails are untouched. 1 migration (schema and security: Ken's ok, `workflow.md`).
- Production steps (Ken), in this order: push the migration (`npx supabase db push`), then merge the release PR. The app calls `email_allowed`, so it must exist before the app deploys.

### Daily digest on time (postponed 2026-11-05)

Why: GitHub starts scheduled runs when it has capacity. On 2026-11-05 the digest ran at 11:20 and then 12:29 UTC (4 runs skipped), so Ken's 11:30 digest arrived at 12:29 (`docs/known-issues.md`, "GitHub starts scheduled runs late"). To be done in a new session.

1. One migration: turn on `pg_cron` and `pg_net` (built into Supabase, free plan included). A function `public.start_digest()` (security definer, no execute for `public`, `anon`, `authenticated`) reads the secret `github_digest_token` from Vault (`vault.decrypted_secrets`) and, with `net.http_post`, calls GitHub's "run now" for the digest: `POST https://api.github.com/repos/fieldgibsonmedia/wirescout/actions/workflows/digest.yml/dispatches`, body `{"ref":"main"}`, headers `Authorization: Bearer <token>`, `Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2022-11-28`, `User-Agent: wirescout`. No secret: it does nothing. A `pg_cron` job runs it at :05, :20, :35, :50 (same times as `digest.yml`).
2. The local database has no secret, so it never contacts GitHub. Never put the token in the repo, a migration or the seed.
3. `digest.yml` stays as it is: it already has `workflow_dispatch`, and its own schedule stays as a backup. Both starting at once is safe: `concurrency: digest` runs one at a time, and `profiles.last_digest_at` stops a second digest the same day.
4. pgTAP tests: without the secret `start_digest()` queues no request (`net.http_request_queue` stays empty), signed-in users and visitors can't run it, the cron job exists with its schedule.
5. Version 0.6.3, What's new: "Your daily digest now arrives on time, a few minutes after the time you chose." (Decisions, "Release notes").
6. Docs: `docs/project.md` ("How the daily digest works", Layout's `digest.yml` line: started by the database every 15 minutes, GitHub's own schedule as backup), and the known issue updated.

- The scanner and admin emails keep GitHub's timer: an hour late doesn't matter for them.
- How to see a failed call: `select * from net._http_response order by created desc limit 5;` (SQL Editor). GitHub answers 204 when the run starts. A failed call costs nothing: GitHub's own schedule still sends the digest, late.
- Live impact: when digests arrive, for everyone. Their content and who gets them don't change. 1 migration (schema: Ken's ok, `workflow.md`).
- Production steps (Ken), in this order:
    1. Create a fine-grained GitHub token (account `fieldgibsonmedia`): Settings → Developer settings → Fine-grained tokens. Resource owner `fieldgibsonmedia`, only the `wirescout` repository, permission Actions: Read and write, nothing else. Expiry: the longest allowed; record the date in `docs/progress.md`. When it expires, digests fall back to GitHub's late timer until Ken saves a new one.
    2. Save it in the cloud project (SQL Editor): `select vault.create_secret('<token>', 'github_digest_token');`. A new token later: `select vault.update_secret((select id from vault.secrets where name = 'github_digest_token'), '<new token>');`.
    3. Push the migration (`npx supabase db push --linked`).
    4. Merge the release PR. Then check the next run in GitHub → Actions → Daily digest: its event is `workflow_dispatch`, a few seconds after :05, :20, :35 or :50.
- Postponed by Ken (2026-11-05): a digest late now and then is fine for now. Built and checked locally on branch `digest-on-time` (pushed, not merged). To pick it up: merge `origin/main` into that branch, run the checks again, then Ken's production steps above.

### Document lists for bond alerts (approved 2026-11-05)

Why: EF Data's team checks issuers' websites by hand for new bond PDFs. Their spreadsheet (402 issuers, 523 links, tested 2026-11-05): 456 links readable, 36 block the scanner, 9 dead, a few built with JavaScript. About 4 in 5 readable pages list their PDFs in plain HTML (11,000 PDFs in all, median 11 to 17 per page), mixed with other files and in many languages: a keyword list misses about 1 in 7 bond PDFs, so a model labels them.

What they want alerts for (Rishi, 2026-11-05): allocation reports, impact reports, frameworks, SPOs (second-party opinions), and new bond issues (final terms, pricing supplements). Not prospectuses, not general sustainability reports, nothing else.

1. Job 1, scanner and database (1 migration, no version: users see nothing new until job 2):
    - A watch list is "news" or "documents" (`watch_lists.kind`); so is a source (`sources.kind`, unique with its address, so one page can be both). News lists don't change.
    - A documents source: every PDF link on the page (outside menus), no 50 limit, with the section heading above it (`articles.section`). No feeds.
    - PDFs on the page at its first check are saved but aren't new (`articles.found_on_first_check`): not in the new counts, never in a digest.
    - Each PDF is labelled by Claude Haiku 5.5 from its title, file name and section (`articles.document_kind`): `allocation_report`, `impact_report`, `framework`, `spo`, `new_issue`, `other`. Empty = not checked yet: shown, so nothing is missed. The hourly scanner labels what's still empty, a few hundred at most per run, so a failed call is retried next hour. No `ANTHROPIC_API_KEY`: nothing is labelled.
    - New counts of a documents list leave out `other`.
2. Job 2, app (v0.7.0): create a list as News or Documents; a documents list shows title, label, section, date found and the PDF link, with a "Bond documents · All" switch; the bulk upload also reads links hidden behind cell text.
3. Job 3, digest (v0.7.1): a documents list's digest has every new bond document (up to 50, with "See all"), not 5, each with its label.

- Fix (Ken, 2026-11-05, v0.7.2): links are saved as the page writes them (dropping the part after ".pdf" broke Gothenburg's), and every new link, news and documents, is opened once before it's saved: "not found" waits for the next scan.
- Also in v0.7.2 (Ken, 2026-11-05): the Sources tab shows the total and 25 sources per page (or 50, 100); more space above "Follows" in New watch list.

Next jobs (agreed with Ken 2026-11-05, for a new session; each needs its own plan and "approve"):

- Job A, before the release, in v0.7.2:
    1. No repeat alerts for re-uploaded files: a new PDF with the same title and the same file name apart from its numbers (`1763545120-green-financing-framework.pdf`) as one already saved from that source doesn't count as new. Title and file name both, so a new "Press release" PDF still counts. Documents lists only.
    2. A spreadsheet for Rishi of the links from his file that weren't added, with issuer, link and reason (local test on 2026-11-05: 104 no PDFs found, 37 blocked, unreachable or not found). Made from `~/Downloads/EF Data - Issuer reporting with links.xlsx` with the scanner's link check; a file for Ken, never committed.
    3. Usage events say whether the list is news or documents (`sources_added` already does), so Analytics shows the bond team's use.
- Job A (approved 2026-11-05, built), v0.7.3, branch `document-repeats`:
    1. Re-uploads: when the scanner saves a new PDF for a documents source (not its first check), it looks for a PDF already saved from that source with the same title and section (capitals and spaces ignored; the section added by Ken, 2026-11-05, as different bonds' notices share titles) and the same file name once its numbers are taken out (`1763545120-green-financing-framework.pdf` → `green-financing-framework.pdf`; the `?…` part ignored). Found: saved with `articles.is_reupload = true`. 1 migration: that column (default false), and `counts_as_new` leaves re-uploads out. They still show under All PDFs, never as New or in the digest. A different title ("Impact report 2025" after "Impact report 2024") stays new. Unit tests with both cases; one pgTAP test for the view.
    2. Rishi's spreadsheet: a throwaway script in the scratchpad reads `~/Downloads/EF Data - Issuer reporting with links.xlsx`, checks each link with the scanner's `checkLink` (documents), and writes `~/Downloads/EF Data - links not added.xlsx`: issuer, link, reason (No PDFs found, Blocked, Unreachable, Not found). Only the links that fail. Never committed; the writing package goes in the scratchpad, not the project.
    3. Usage by list kind: `story_saved`, `story_shared`, `draft_sent` and `digest_link_opened` send `list_kind` (news or documents), as `sources_added` already does (`kind`). Analytics → Features used shows one row per feature and kind ("Stories saved · Bond documents"); events from before, and search and settings, count as news or have no kind. The PDF report the same.
    - Live impact: the scanner (documents sources only; news stories are saved exactly as now), the Analytics screen (super admins), the app's events. Nobody has a documents list on live yet. 1 migration (schema: Ken's ok).
    - Production steps (Ken), at the release: push the migration with the others, before merging; redeploy `analytics` (its query changes) along with `check-links` and `scan-new-sources`.
- Then the release (production steps above; PR text drafted in the session of 2026-11-05).
- Job B: issuer names instead of domains: the upload saves each link's issuer name (column A of their spreadsheet) as the source's name (`sources.name`).
    - Plan (approved 2026-11-05, built), v0.7.4, branch `issuer-names`. In the release with job A (Ken, 2026-11-05: B, C and D all go in this release).
    1. Excel upload to a documents list: each link takes the text in column A of its row (links behind cell text too: the sheet says which cell holds each), unless that text is empty, a number or itself a link. CSV the same, from the line's first field. Pasted links get no name, as now.
    2. The name is saved when the source is created (`sources.name`, which users may already set on insert). The app, the Sources tab, Search and the digest already show the name instead of the domain.
    3. Documents lists only: a news spreadsheet's column A may be anything, and a source's name is shared by everyone who follows it, with no way to change it from the app.
    4. A source someone added before keeps its name (or none). On live nobody has documents sources yet.
    5. A test with a made-up spreadsheet; then Rishi's whole file in the browser on the dev account.
    - Live impact: the bulk upload (all users; news lists unchanged). No migration.
- Job C: stories grouped and filtered by when they were found. Postponed (Ken, 2026-11-05): idea and reasons in `docs/ideas.md`. Instead, a `load_more` event measures whether anyone reads past the first 50 stories.
- Job D: research the 104 "no PDFs found" pages (a sample of 20): documents linked without ".pdf" (`/download?id=…`), built with JavaScript, or listed on another page. Then a plan.
    - Research (2026-11-05): 20 of the 97 "no PDFs found" pages (every 5th of Rishi's not-added list), read as the scanner reads them:
        - 10 (50%) are overview pages: the documents sit on other pages (Bank of China, Brazil, MuniFin, NRW.BANK, Swedbank…). 3 of them (Oslo, Swedbank, Flanders) may load their list with JavaScript; can't tell without a browser.
        - 5 (25%) have the PDFs inside the page's own data, not as links (Elopak, HDB, Singapore MOF, Luxembourg, Woori): readable without a browser.
        - 2 are bot checks (Radware at CDP, TAQA): really "blocked", wrongly called "no PDFs found".
        - 2 are disclaimer pages to accept first (LBBW, Credito Sportivo).
        - 1 links its PDFs without ".pdf" (AOFM `/media/1427`).
    - Plan (approved 2026-11-05, built), v0.7.5, branch `more-documents`:
        1. Documents reader: when a page has no PDF links, it also takes PDF addresses written in the page's own data (scripts, `data-` attributes, `onclick`), named from the file name and labelled as usual. Unit tests with the 5 pages' shapes; then the 5 pages read for real.
        2. Bot checks (Radware, Cloudflare's "Just a moment", Akamai) count as "blocked", not "no PDFs found", so the message says what happened. News and documents.
        3. Overview and disclaimer pages: no code. After 1 and 2, all 156 links are checked again, and Rishi's file gets a column "What to do": for "no PDFs found", "Send the page that lists the PDFs"; for blocked, unreachable and not found, the reason as now. Not committed.
        4. Not doing: accepting disclaimers for the user (they're legal notices meant for a person), links without ".pdf" (1 in 20), a hidden browser (shelved before; at most 3 in 20).
        5. A `load_more` event on "Load more" (with `list_kind`), for the postponed job C (`docs/ideas.md`).
        - Live impact: the scanner (documents sources only for 1; all sources for 2: a bot check page was "no stories" and becomes "blocked", nothing else changes), `check-links` and `scan-new-sources` (same code, already redeployed in this release). No migration.

- Release the 3 jobs together: nobody can make a documents list before job 2, and the digest needs job 3.
- Cost: under $1 a month (Haiku 5.5, $0.10 per million input tokens; the first labelling of a full list of 11,000 PDFs is about $0.10).
- Live impact: the scanner, the app's source adding and the digest are live for journalists; their news lists must work exactly as now. The migration changes the sources' unique key: push it just before merging, as source adding fails in between.
- Production steps (Ken): `ANTHROPIC_API_KEY` in GitHub secrets (done 2026-11-05); push the migrations; deploy the `check-links` and `scan-new-sources` functions (they run the scanner's code, which reads PDFs now); their email domain on the allowed list.

## Feedback from PostHog recordings (update `upload-feedback`, 2026-11-12)

Ken watched journalists' recordings. One update, one branch from `main`, released together:

1. Job 1 (v0.7.6, done): a file or pasted list adds every link, working or not; one short message with the counts; the failing ones show in the Sources tab with Fix. The red box only for a file that can't be added.
2. Job 2 (v0.7.7, done): a journalist scrolled endlessly looking for one source's stories. A "Sources" dropdown next to search (working sources only; several sources, its own search box), each with its new stories ("BBC (8)"), most new first, then A to Z; the search looks only in the picked sources. A story's source name filters to it; Sources tab → "See its stories". Event `source_filter`.
3. Job 3 (v0.7.8, done): date headings in news lists (Today, Yesterday, Last 7 days, Earlier), by date found, in the reader's time zone. Not in documents lists (nearly all PDFs are found on day one).
4. Job 4 (v0.7.9, done): New stays until seen. Opening the list cleared every New mark, so an interrupted visit lost them. A story loses New once its headline has been on screen about a second, or it's opened; "Mark all as read" clears the rest. The dashboard count, side nav badge and dropdown counts follow the same marks. A "seen stories" table (migration, pgTAP tests); stories seen before stay seen. Event `mark_all_read`.
    - Research behind it (Ken asked, 2026-11-12): notification screens clear the badge on open but keep each item unread (LinkedIn messaging); news readers mark read on open, "Mark all as read" or scroll (Feedly's "Auto-Mark As Read On Scroll", an option). Ken ruled out "read only when opened": journalists skim headlines and open few.

- Live impact: the watch list page and the dashboard counts for every journalist. The scanner changes only for job 1 (documents' first check). The digest doesn't change.
- Production steps (Ken), at release: push job 4's migration just before merging; redeploy `scan-new-sources` (job 1) and `analytics` (job 2's new event in Features used).

## Branches

- Since 2026-11-12 (Ken): no `mvp` branch. Each update is a branch from `main`, holding the jobs Ken groups into it, and goes live through one PR that Ken merges.
- Merge `origin/main` into the update's branch before its PR, in case `main` has commits of its own.
- Before 2026-11-12: jobs merged into `mvp`, and Ken merged `mvp` into `main` once per stage.

## Build order

Jobs added on 2026-10-27 sit between the steps, so the step numbers stay the same.

1. Docs and Claude setup
2. Supabase: database, login, publications per user
3. Watch lists UI and dashboard: job 1 (the screens), then job 2 (self sign-up)
    - Deploy job: publish the web app on GitHub Pages from `main`, and release each finished stage
4. New scanner (feeds, auto-detection, health check, source status)
    - Fix sources job
    - Check links job
    - Paste links job
    - Select, move and remove sources job
    - Keywords job
5. Daily digest email
    - Usage report job
    - Polish before step 6 (Ken's 18 changes, agreed 2026-10-30), released together as v0.1.0: quick fixes, look and feel, motion, watch list settings (Edit and Delete from the side nav, keywords in the Edit dialog), save stories, dashboard insights and release notes, global search
6. Post from Wirescout (last: it touches the live magazine sites)
    - Before the first journalist (Ken's 12 changes, agreed 2026-11-03), still v0.1.0: version, missing digest, drafts to magazines, Remember me, polish, admin source alerts
    - Own domain `wirescout.app` (agreed 2026-11-03): account emails through Brevo (Ken, no code), then app emails through Brevo, then the app at `wirescout.app`
    - In production since 2026-11-03: Ken invited the first journalist
    - After the first journalist (Ken's 9 points, agreed 2026-11-04), 3 jobs: sources and wording, accounts, analytics and privacy

## Known risks

- Supabase pauses free projects after a week with no activity. The scanner's runs keep it active.
- Some sources render articles with JavaScript or block bots. Feeds and the AI fallback cover part of this; see `docs/known-issues.md`.
- The repo is public: user data must live only in Supabase, never in the repo.
