# Progress

Newest first. One entry per job: date, what was done, what's next.

## 2026-10-27: Watch lists web app and dashboard (build step 3)

- Vue web app in `src/app/`: sign in, set password (from invite or reset email), forgot password, dashboard, watch list.
- Layout like hub: side nav (Dashboard, Watch lists, Settings) and account menu. Apple blue as the primary colour.
- Dashboard: one box per watch list with its new-item count (new view `watch_list_new_counts`).
- Watch list: stories newest first with "New" markers and a Share menu (LinkedIn, Email, Copy link), sources added and removed by URL.
- Watch lists are no longer tied to a magazine. Settings pages: daily digest (hour or off, time zone, weekdays) and channels.
- 3 new migrations, 22 database tests. Checked in a browser against the local Supabase with made-up users: every flow, 320/768/1280 px, dark mode, keyboard.
- Not done yet: publishing the app (GitHub Pages) and pushing the new migrations to the cloud project.

### Where we left off (paused 2026-10-27)

All work above is **uncommitted** on branch `feature/watch-lists-ui` (Ken hasn't reviewed it yet). Ken's local test account is in the local database: ask before any `npx supabase db reset`, it deletes local users.

**Job 1 done (2026-10-28), same branch, still uncommitted:**

- Daily digest: on/off switch and a time field to the minute; time zone taken from the browser on every visit (London if it can't), shown as text. New migration `digest_time` (`digest_hour` becomes a time; `time_zone` defaults to London and can't be empty).
- Account menu on Reka's dropdown (closes on outside click), with "Account settings": name, password change (current password checked by signing in again), theme Auto/Light/Dark saved per device.
- Watch list: "⋯" menu with Rename and Delete (new `ConfirmDialog`), stories 50 at a time with "Load more", and "Add many at once" from an `.xlsx`, `.csv` or `.txt` file (`read-excel-file` 9.3.12, loaded only for `.xlsx`).
- Decisions and the new build order recorded in `mvp-plan.md`.
- Checked: database tests 23/24 (the 1 failure is the known one: Ken's local user), db lint clean, type check and build pass. Ken clicked through the changes in the browser.
- The current-password check runs in the app only. Supabase can also enforce it on the server; that's a cloud setting to decide with job 2.

**Waiting for Ken's "approve":**

1. Commit and push this branch, then the PR text.
2. Push the 4 new migrations to the cloud project.
3. Rule suggestion for `communication.md`: "Before changing any data, even locally (including a database reset), say what will change and how Ken can do it himself, and wait for his ok."

**Job 2 (next branch, agreed): self sign-up instead of invites**

- Sign-up page (email + password), linked from sign-in.
- Allowed list in a table `allowed_email_domains` (domains plus single full addresses, editable in Studio): fieldgibsonmedia.com, environmental-finance.com, insuranceassetrisk.com, insuranceerm.com, corporatedisclosures.org. Enforced by a Supabase "before user created" hook (check it's on the free plan first).
- Magazine linked automatically from the domain (fieldgibsonmedia.com gets none).
- Verification, password-reset and email-change emails: a link to a Wirescout page with a confirm button (token hash), so email scanners can't use up the link. Templates in `config.toml`; Ken pastes the cloud ones into the dashboard.
- "Account creation denied" message ends with "Request access": name, email, reason. Stored in `access_requests` (insert only, one open request per email, length limits, honeypot). Ken approves by adding the address to the allowed list and replying himself.
- Email change in Account settings moves here (it sends confirmation links).
- Leavers: their account stays until Ken deletes it in the dashboard (document it).

**Agreed for later jobs:**

- Step 4 (new scanner): show each source's status ("Working", "No stories found", "Last checked"); skip sources no list follows anymore.
- Usage report job, right after step 5: count active days per person (one row per person per day) and Share clicks; email on the 1st of each month with a table of the last 6 months per person (bars made of table cells). Recipient in GitHub secret `ADMIN_EMAIL` (Ken sets it; never commit the address). The same job emails Ken new access requests within a few hours. Tell journalists about the tracking in one line.
- Keywords job, right after step 4: optional "Only show stories that mention…" per watch list (title and summary, ignoring capitals), plus a search box in the list.
- Rejected: PostHog (too much for now); paste-only bulk add (people expect file upload).

**New build order:** finish step 3 (jobs 1 and 2) → deploy job (GitHub Pages) → step 4 scanner → keywords → step 5 digest → usage report → step 6 post to magazines.

- Next: Ken reviews and approves the commit, then job 2.

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
