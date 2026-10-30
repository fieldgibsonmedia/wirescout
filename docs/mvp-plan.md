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
| Email | A Gmail account over SMTP, with an app password | Microsoft 365 ends password SMTP in December 2026, and a company-domain sender (e.g. Brevo) needs DNS records IT won't add |
| Posting | Supabase Edge Function calls a "receive draft" endpoint on each site | CMS credentials stay server-side |
| Sharing | LinkedIn and email through share links: LinkedIn's share window and the user's own email app | No setup, no logins to expire, free; the journalist posts or sends as themselves |
| Look | Apple's web blue (`#0071E3`) as the primary colour until Wirescout has a brand | Apple's system blue `#007AFF` is too light for white button text (4.0:1) |
| Bulk sources | File upload (`.xlsx`, `.csv`, `.txt`) with `read-excel-file`, loaded only for `.xlsx` | People expect to upload a file; paste-only was rejected. Keeps the app small for everyone else |
| Analytics | Our own usage report job, no PostHog | PostHog is too much for now |

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

- "Post draft to <magazine>" is an option in each story's Share menu: one entry per magazine the user may post to, and none for users without a magazine.
- The confirm step names the magazine ("Post draft to Insurance Asset Risk?").
- Stories go in as **drafts** so an editor still reviews them.
- All 4 magazines run on MODX today, and MODX has no ready-made API for creating articles. Each site needs one small "receive draft" endpoint.
- All 4 are moving to Statamic (months away). Its API is read-only, so it will need the same endpoint. Wirescout doesn't change: only the endpoint on each site is swapped.
- **Open, decided in step 6:** who may post to which magazine. A user can write for several magazines, and should only reach the ones where they have a writer or editor account in MODX (later Statamic, through the users-service). Until then an admin adds magazines by hand; nothing is linked from the email domain (decided 2026-10-29).

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

## Branches

- Every MVP job: a branch from `mvp`, merged into `mvp` after Ken's ok.
- Each finished stage is released: Ken merges `mvp` into `main` through a PR, and it goes live (decided 2026-10-29, so stages are tested live instead of waiting for the whole MVP).
- Merge `main` into `mvp` before each release, in case `main` has commits of its own.

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

## Known risks

- Supabase pauses free projects after a week with no activity. The scanner's runs keep it active.
- Some sources render articles with JavaScript or block bots. Feeds and the AI fallback cover part of this; see `docs/known-issues.md`.
- The repo is public: user data must live only in Supabase, never in the repo.
