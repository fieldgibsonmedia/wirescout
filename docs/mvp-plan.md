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

### Keywords (job after step 4)

- Optional "Only show stories that mention…" per watch list: matches the title and summary, ignoring capitals.
- A search box in the watch list.

### Usage report (job after step 5)

- Counts active days per person (one row per person per day) and Share clicks.
- On the 1st of each month, emails a table of the last 6 months per person (bars made of table cells).
- Recipient in the GitHub secret `ADMIN_EMAIL` (Ken sets it; the address is never committed).
- The same job emails Ken new access requests within a few hours.
- Journalists are told about the tracking in one line.

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
    - Keywords job
5. Daily digest email
    - Usage report job
6. Post from Wirescout (last: it touches the live magazine sites)

## Known risks

- Supabase pauses free projects after a week with no activity. The scanner's runs keep it active.
- Some sources render articles with JavaScript or block bots. Feeds and the AI fallback cover part of this; see `docs/known-issues.md`.
- The repo is public: user data must live only in Supabase, never in the repo.
