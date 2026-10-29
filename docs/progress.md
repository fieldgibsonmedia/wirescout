# Progress

Newest first. One entry per job: date, what was done, what's next.

## 2026-10-29: Deploy from `main` (deploy job)

- Decided: each finished stage goes from `mvp` into `main` and is tested live, instead of one release at the end.
- `deploy-app.yml` publishes the web app to GitHub Pages on every push to `main`, at `/wirescout/`, with `404.html` so email links open the app. `.env.production` points it at the cloud Supabase.
- Scanner workflow: Node 22 and `npm ci --omit=dev`, so the web app's build tools (and the Supabase CLI download) stay out of the live scanner.
- Cloud database: the 5 new migrations pushed (all 6 match local).
- Checked: the scanner installed like the workflow (Node 22, `--omit=dev`) and ran once, emailing a throwaway local inbox; type check and build pass; the app built for `/wirescout/` and served like Pages (5 browser checks: deep links, email link, sign in, reload).
- Not checked: the real Pages deploy and the live app (Ken's steps).
- Next (Ken, guided): Pages source "GitHub Actions", merge `mvp` into `main`, Supabase dashboard settings, click through the live app. Then step 4.

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
