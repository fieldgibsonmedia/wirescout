# Progress

Newest first. One entry per job: date, what was done, what's next.

## 2026-11-04: The robot with the name, v0.5.5

- Ken's points: the name "Wirescout" goes with the robot icon wherever possible, and that's a rule (`docs/mvp-plan.md`, Decisions, "Brand").
- Sign-in screens (one layout, `FormLayout.vue`): the robot and "Wirescout" at the top of the card, then the screen title. "Sign in to Wirescout" is now "Sign in", "Create your Wirescout account" now "Sign up".
- Digest email and the 3 account emails: the robot before "Wirescout" at the top. A PNG made from the same drawing (`public/brand-icon.png`, served at `wirescout.app/brand-icon.png`): most email apps don't show SVG. Where images are blocked (Outlook, until allowed), the name still shows, with no broken-image box (`alt=""`).
- Not done: the scanner and access request emails (plain text, developer only). The browser tab icon: offered, not agreed yet.
- Version 0.5.5 with its "What's new".
- Checked: 66 unit tests (the digest test now expects the robot), type-check, build (the PNG is in it). In the browser: Sign in, Sign up, Forgot password, Request access; the digest and the 3 account emails written with made-up data, the robot loading from the local app.
- Not checked: Confirm and Set password (need an email link; same layout); dark mode and phone width; real email apps (Gmail, Outlook).
- Release: the web app and digest go live with the merge. Then Ken pastes the 3 updated templates (`supabase/templates/`) into the cloud dashboard (Authentication → Emails), after the merge, so the image is live first.

## 2026-11-04: Privacy policy on what recordings show, v0.5.4

- Ken's point, from watching replays: people may fear the recording sees more than Wirescout. The policy now adds: "Recordings show only Wirescout's own pages, as they appear in its tab. They never capture your computer or phone, its screen, other apps, other tabs or websites, or anything else in your browser." (Ken's wording change: the computer named, not only the browser.) True of PostHog's recorder: it records the page's own content in its tab only.
- Version 0.5.4 with its "What's new".
- Checked: 66 unit tests, type-check, build; in the browser, the policy from the sign-up page (the new sentence, the dialog still fits without scrolling).
- Release: web app only, together with v0.5.3 in one release PR.
- Released with v0.5.3: PR #28, merged by Ken at 15:32 UTC; the web app deploy passed, and `wirescout.app` serves v0.5.4 with the new policy sentence (checked in its code). `analytics` was redeployed before the merge.
- Next: Ken's pick. Open in `docs/known-issues.md`: the access request email still points to the Table Editor, and a source can show "failing" right after its check passed.

## 2026-11-04: Analytics always fresh (fix), v0.5.3

- Found on live by Ken: his replay showed under 1 Day and 1 Week, not 1 Month. Cause, from PostHog's source code (`hogql_query_runner.py`, `caching/utils.py`): a HogQL query sent with the default `refresh` gets PostHog's cached answer for up to 6 hours. The 1 Month query had first run before the replay existed. This hit every section and period.
- Fix: `runQueries` (`src/analytics/posthog.js`) sends `refresh: "force_blocking"`, so every load runs the queries. Version 0.5.3 with its "What's new".
- Checked: the unit test's new check fails on the old code and passes now; 66 unit tests, type-check, build.
- Not checked: the real PostHog with the new setting (only on live, after Ken redeploys `analytics`). `delete-account` uses the same file but not the changed function: no redeploy needed.
- Release, in this order (Ken): redeploy `analytics` (`npx supabase functions deploy analytics`), then merge the release PR.
- Done by Ken on 2026-11-04: `analytics` redeployed from `mvp` (with the fix).
- Checked on live by Ken, right after the redeploy: his replay now shows under 1 Month too.

## 2026-11-04: Replay script bundled (fix), v0.5.2

- uBlock Origin blocked the replay script even through the proxy (its file name, `posthog-recorder.js`, is blocked on every site). `analytics.ts` now bundles it (`posthog-js/dist/posthog-recorder`), and PostHog uses the bundled copy instead of loading it. Version 0.5.2 with its "What's new".
- Checked: 66 unit tests, type-check, build; the bundle registers the recorder (`__PosthogExtensions__.rrweb` and `initSessionRecording`), which posthog-js checks before loading the script. First load: 292 → 357 kB gzipped.
- Not checked: a replay in the browser (the block needs uBlock and the real PostHog). On live (Ken), with uBlock on: Network, filter `recorder`, nothing blocked; a new replay in Analytics.
- Released: PR #27, merged by Ken at 15:12 UTC; the web app deploy passed, and `wirescout.app` serves v0.5.2 with the bundled recorder (checked in its code).
- Checked on live by Ken, with Privacy Badger and uBlock Origin on: nothing blocked (Network, filter `recorder`), and his replay shows in Analytics → 1 Day. Events, Analytics and replays all work through the add-ons now; the ad blocker entry left `docs/known-issues.md`.
- Next: Ken's pick. Open in `docs/known-issues.md`: the access request email still points to the Table Editor, and a source can show "failing" right after its check passed.

## 2026-11-04: PostHog reverse proxy (fix), v0.5.1

- Ad blockers stopped all PostHog analytics (`docs/known-issues.md`). Fix: PostHog's managed reverse proxy at `relay.wirescout.app` (plan in `docs/mvp-plan.md`, "PostHog reverse proxy", approved by Ken).
- Done by Ken on 2026-11-04, before any code: the managed proxy `relay.wirescout.app` created in PostHog, and its CNAME record `relay` added at Namecheap. Checked from here: Namecheap's servers answer with PostHog's EU proxy (`*.cf-prod-eu-proxy.europehog.com`). That name isn't in EasyPrivacy, uBlock Origin's privacy list or Privacy Badger's seed list, so uBlock's CNAME uncloaking shouldn't catch it.
- Code: `.env.production` sets `VITE_POSTHOG_HOST=https://relay.wirescout.app`; `analytics.ts` sets `ui_host` to `https://eu.posthog.com`. Version 0.5.1 with its "What's new".
- Checked: 66 unit tests, type-check, build (the bundle has the new host, `ui_host` and 0.5.1).
- The proxy went live a few minutes after the record: `https://relay.wirescout.app/static/array.js` answers 200 with a valid certificate (a public file, no data sent).
- Not checked: sending events through the proxy before the release (that would send data to the real PostHog).
- Released: PR #26, merged by Ken at 14:56 UTC; the web app deploy passed, and `wirescout.app` serves v0.5.1 with `relay.wirescout.app` as the PostHog host (checked in its code). Nothing to run on live before the merge (the proxy was live).
- Checked on live by Ken, with Privacy Badger and uBlock Origin on: events reach PostHog through `relay` (page views in Activity), and Analytics → 1 Day shows his activity. Still blocked: the replay script, `relay.wirescout.app/static/1.438.13/posthog-recorder.js`, because EasyPrivacy blocks that file name on any site (`/posthog-recorder.js`). So uBlock users send no replays. My plan was wrong to say the script loads as `lazy-recorder.js`. After it (Ken), with both add-ons on: DevTools → Network, filter `relay`, 200s and nothing to `posthog.com`; then Analytics → 1 Day.

## 2026-11-04: Analytics and privacy (after the first journalist, job 3), v0.5.0

- PostHog (EU, project 334525) replaces Wirescout's own usage counting. `src/app/lib/analytics.ts`: only while signed in, tied to the user id (never name or email); nothing kept in the browser; pages by screen name, the 7 main features, errors, and replays with typed text hidden. Names and emails the app shows (Account settings, the account menu, a colleague's name in the Send dialog) are masked in replays (`ph-mask`); Manager pages aren't recorded. The Privacy policy says "pseudonymised", never "anonymised" (Ken, 2026-11-04). Search terms are cut from addresses.
- Settings → Manager → Analytics: active users (with names from our database), features used, most shared stories, top pages, errors, replays (open in PostHog), over 1 Day, 1 Week, 1 Month, 6 Months, 1 Year or All. New function `analytics` (code and tests in `src/analytics/posthog.js`). "Download report": a PDF without errors and replays (jsPDF, loaded on click).
- Deleting an account also asks PostHog to delete the person, with their events and replays.
- Privacy policy link next to the version; the Usage section left Account settings. `usage.ts` removed; `admin.yml` sends only access requests (the monthly usage report and `months.js` removed). Old usage tables untouched.
- New dependencies: `posthog-js` 1.438.13 and `jspdf` 4.2.1 (no new audit issues). posthog-js adds about 107 kB gzipped to the first load.
- Privacy (Ken's changes while testing): professional wording; "pseudonymised", never "anonymised"; the MODX note in the magazine sign-in box matches the policy. Sign-up requires "I've read and agree to Wirescout's privacy policy" (the link opens the policy), and the database records when (`profiles.privacy_accepted_at`, set from the sign-up metadata with the database's clock; users can't change it). Accounts made before stay empty.
- Analytics periods (Ken): 1 Day, 1 Week, 1 Month, 6 Months, 1 Year, All.
- Version 0.5.0 with its "What's new". 1 migration (`20261104141440_privacy_accepted.sql`).
- Checked: 66 unit tests (6 new, against made-up PostHog answers), 138 database tests, db lint, type-check, build. In the browser with 2 made-up local accounts (Ken's ok) and a local stand-in for PostHog (nothing sent to the real one): each event arrives with the user id only; no PostHog cookies or storage; search terms cut; an error captured; replays with typed text as `***`, own name and email masked, no replay on Manager pages; nothing sent after sign-out; Analytics for the super admin with names and every section; a journalist sent away (and the function refuses: 403, and 401 signed out); the PDF (1 page, no errors or replays); the Privacy policy; deleting an account asks PostHog to delete the person. Fixed along the way: saving a story wasn't recorded. Test accounts and data deleted afterwards.
- Not checked: the real PostHog. Its answers to the HogQL queries (the error message field, the replays table) and the replay link format are checked only on live, by Ken, after release. Phone width and dark mode.
- Released: PR #25. Done by Ken on 2026-11-04, before the merge: migration `20261104141440_privacy_accepted.sql` pushed, PostHog's "Record user sessions" and "Discard client IP data" turned on, the secrets `POSTHOG_PROJECT_ID` and `POSTHOG_PERSONAL_API_KEY` set, `analytics` deployed and `delete-account` redeployed. PR merged at 14:25 UTC; the web app deploy passed, and `wirescout.app` serves v0.5.0 with PostHog's EU key (checked in its code). Not checked yet: Analytics against the real PostHog.
- Release, in this order (Ken): push the migration (`npx supabase db push`); in PostHog's project settings turn on "Record user sessions" and "Discard client IP data"; set the function secrets (`POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID`); deploy `analytics` and redeploy `delete-account`; then merge the release PR.
- Checked on live by Ken (14:35 UTC): Analytics loads every section from the real PostHog without errors (key, access and all 6 queries work), but shows "Nothing in this period". PostHog's Activity page had no events. Cause: Ken's Firefox add-ons (Privacy Badger, uBlock Origin) block every request to `*.posthog.com`; the app sends them (seen in his network log, retried 3 times). `docs/known-issues.md` has it.
- Should have been flagged in the plan (Ken, 2026-11-04): ad blockers stopping browser analytics is well known, and PostHog's docs recommend a reverse proxy.
- Next (Ken's go, 2026-11-04, new session): plan PostHog's managed reverse proxy (free for PostHog Cloud): one DNS record at Namecheap for a neutrally named `wirescout.app` subdomain, and the app's `api_host` pointing at it (`ui_host` stays `https://eu.posthog.com`). Ken's "approve" before coding. Ken agreed the proxy is right for an internal tool that discloses PostHog in its privacy policy. To confirm the rest works meanwhile: turn both add-ons off for `wirescout.app`, then check Analytics → 1 Day and PostHog's Activity page.

## 2026-11-04: System admins (after job 2's release), v0.4.0

- Ken's points after releasing v0.3.0: the only super admin could delete their account, and super admins could only be set with SQL.
- The database always keeps at least one super admin: a trigger refuses to remove or delete the last one (the System admins tab, deleting the account in the app or the dashboard, SQL).
- Delete account: the only super admin sees "You are the only super admin at the moment. Assign another super admin before deleting your account." with a link to System admins, instead of the confirmation. `delete-account` refuses too (409), before ending any MODX session.
- System settings has two tabs: Platform access (who can sign up, unchanged) and System admins (add by the email of an existing account, remove with a confirmation, yourself too while another is left). `?tab=admins` opens the second.
- 1 migration (`20261104120618_system_admins.sql`). Version 0.4.0 with its "What's new"; analytics moves to v0.5.0.
- Checked: 138 database tests (13 new), db lint, unit tests, type-check, build. In the browser with 2 made-up local accounts (Ken's ok): the message for the only super admin and its link; both tabs; adding an email without an account, an existing one and a duplicate; removing yourself (back to the dashboard, Manager gone); `delete-account` called as the only super admin (409, account kept); a normal Delete account. No console errors. Both test accounts deleted afterwards (the last one with the trigger off for that one delete).
- Not checked: phone width and dark mode.
- Release, in this order (Ken): push the migration (`npx supabase db push`), redeploy the function (`npx supabase functions deploy delete-account`), then merge the release PR.
- Released: PR #24. Done by Ken on 2026-11-04: migration `20261104120618_system_admins.sql` pushed, `delete-account` redeployed, then the PR merged at 12:16 UTC. The web app deploy passed and `wirescout.app` serves v0.4.0 (checked in its code). Not checked yet: the System admins tab and the only super admin's message on live.
- Next: job 3, analytics and privacy, v0.5.0 (plan in `docs/mvp-plan.md`; Ken's "approve" before coding).

## 2026-11-04: Accounts (after the first journalist, job 2), v0.3.0

- Super admin: `profiles.is_super_admin`, which users can't set. Ken sets it with one SQL line (`docs/project.md`, Admin tasks).
- Settings → Manager (Ken's change: the super admin's own section in the side nav, under Settings) → System settings: who can sign up, domains and single addresses, with Add and Remove (asks first). The database allows it for the super admin only; the page sends anyone else to the dashboard. Analytics (job 3) goes in Manager too.
- Delete account at the bottom of Account settings, with a confirmation. New function `delete-account`: ends the person's MODX sessions, then deletes the user; the database deletes their watch lists, saved stories, connections and usage.
- Ken's call: a deleted account's sent drafts stay in the publish log without the person, so colleagues still see "A former colleague already sent this story" (`publish_log.user_id` now nullable, `story_sends` updated).
- 1 migration (`20261104110801_accounts.sql`). Version 0.3.0 with its "What's new".
- Checked: 125 database tests (15 new), db lint, 63 unit tests, type-check, build; the function refuses calls without sign-in. In the browser with 2 made-up local accounts (Ken's ok): the Manager section for the super admin only, a bad entry, a made-up domain added (lower-cased) and refused a second time, removed after the question; the journalist without Manager and sent from System settings to the dashboard; Delete account (the account, its list and a fake connection gone, back to sign-in). Both test accounts deleted afterwards; the allowed list as before.
- Not checked: ending a real MODX session on delete (no magazine copy running; same `logout` call as Disconnect). Phone width and light mode.
- Also checked: the scanner's first run with the moved code (11:24 UTC) passed.
- Release, in this order (Ken): push the migration (`npx supabase db push`), deploy the function (`npx supabase functions deploy delete-account`), run the super admin SQL line, then merge the release PR.
- Release PR #23 opened. Done by Ken on 2026-11-04, before the merge: migration `20261104110801_accounts.sql` pushed, `delete-account` deployed, his profile set as super admin (checked: 1 super admin).
- Released: PR #23 merged by Ken at 11:52 UTC; the web app deploy passed, and `wirescout.app` serves v0.3.0 (checked in its code). Not checked yet: Manager and Delete account on live.
- Next: job 3, analytics and privacy (plan in `docs/mvp-plan.md`; Ken's "approve" before coding), in the next session. Proposed on top of the plan, not yet approved: PostHog gets only the user id, the Analytics screen adds names from our database; the PDF made in the browser with jsPDF, loaded on click; locally nothing goes to PostHog, and the Analytics function is tested against made-up PostHog answers.

## 2026-11-04: Sources and wording (after the first journalist, job 1), v0.2.0

- Paste error (point 1): the live `check-links` logs show "CPU Time exceeded" (2.2 s and 2.5 s, over the free plan's 2 s per call) on 3 Nov 19:11 and 4 Nov 09:16 UTC. Ten big news pages in one call need about 2.4 s. The empty line wasn't the cause. Fix: the app checks one link per call (5 at a time); a check that fails leaves out only that link ("couldn't be checked. Please try again"), and the rest are added.
- First stories right away (point 9): new function `scan-new-sources` reads each source just added, once, with the scanner's own code (moved into `src/scanner/check-source.js`, used by the hourly scanner too). Only never-checked sources in the user's own lists; private addresses are never fetched. The empty-list note now says all is well and that sources are checked every hour.
- Duplicates (point 3): the same address written differently (http/https, `www.`, a trailing `/`) counts once, in the paste, the file and against the list (also in Edit).
- Drop box back to its natural height (point 2); new Channels intro (point 4). Version 0.2.0 with its "What's new".
- Checked: 63 unit tests, type-check, build. Locally, as a made-up user: Ken's 20 links all checked in 3 s, none failed; 12 sources read for first stories in 2 s (394 stories); a checked source isn't read again; another user's source is refused (404); a private address isn't fetched; `npm run scan` still works (13 sources, 0 not saved). In the browser: 21 lines with 2 BBC repeats show "19 links ready", 12 added and 7 not added with reasons, stories on the Stories tab, a brand-new site (engadget.com) "Working" with stories straight after adding, the smaller upload box, the Channels text, the new note. Test account, lists, sources and stories deleted afterwards.
- Not checked: the 2-second limit itself (the local functions don't enforce it; the cloud logs and the measurement show the cause). An upload of a real file (same code path as paste).
- Noted in `docs/known-issues.md`: a shared source can show "failing" right after its check passed.
- Release: Ken deploys the new function first (`npx supabase functions deploy scan-new-sources`), then merges the release PR (the web app). `check-links` is unchanged: nothing to redeploy. The scanner picks up the moved code from `main` at its next run.
- Released (Ken): `scan-new-sources` deployed, then PR #22 merged at 10:55 UTC; the web app deploy passed, and `wirescout.app` serves v0.2.0. Not checked yet: a real add on live, and the scanner's next run (:17) with the moved code.
- Next: job 2, accounts (plan in `docs/mvp-plan.md`; Ken's "approve" before coding).

## 2026-11-04: After the first journalist (plan only, no code)

- Ken's 9 points from testing live, grouped into 3 jobs in `docs/mvp-plan.md` ("After the first journalist"): sources and wording (v0.2.0), accounts (v0.3.0), analytics and privacy (v0.4.0).
- Ken's calls: new sources' stories are saved right away, plus a note; PostHog replaces our own usage counting.
- Next: job 1, sources and wording.

## 2026-11-04: In production, and a version for every job

- Ken invited the first journalist on 2026-11-03: Wirescout is in production. `CLAUDE.md` ("What is live"), `docs/project.md` and the plan say so. The cloud project is now off limits to Claude: Ken runs every step on it (migration pushes, function deploys, dashboard settings).
- Ken's call: every job that changes what users get (app, digest, emails) raises the version, with a "What's new" entry: fixes 0.1.x, new features 0.x.0. Docs-only jobs don't. Written in the plan's Decisions, `docs/project.md` and `releaseNotes.ts`.
- First Brevo digest: the 07:11 UTC run says 1 sent, 0 failed. Not confirmed yet that it reached an inbox (it was probably the colleague's).
- Checked: type-check. Docs only, no version change.

## 2026-11-03: App emails through Brevo (own domain, part 2)

- The scanner health, digest and admin emails take their sender from a new `EMAIL_FROM` instead of `EMAIL_USER` (Brevo's SMTP login isn't an address). The 3 workflows set `EMAIL_FROM: no-reply@wirescout.app` as a plain value. `.env.example` and `docs/project.md` updated.
- Checked: 63 unit tests, type check, build; `npm run scan`, `npm run digest` and `npm run admin` against the local Supabase into Mailpit: all 4 emails (scanner break, digest, access request, usage report) came from `Wirescout <no-reply@wirescout.app>`. The made-up test data was removed afterwards.
- Not checked: a real send through Brevo (needs the release and the new secrets).
- Release (Ken, guided one at a time): merge the release PR (Gmail keeps sending until the secrets change); Brevo SMTP key `github`; set `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` between runs; check the next digest comes from `no-reply@wirescout.app`.
- Released (PR #21, merged by Ken at 18:37 UTC; deploy passed). Then, done by Ken: Brevo SMTP key `github`, and the 4 `EMAIL_*` GitHub secrets set to Brevo (around 18:45 UTC).
- Not checked yet: a real email through Brevo. Ken's digest for today had already gone out, so the first one is tomorrow's (Wed 4 Nov). Check: it arrives from `no-reply@wirescout.app`, not in junk, and the digest run log says "sent".
- Next: that check; then close the junk-folder entry in `docs/known-issues.md` if it lands in the inbox.

## 2026-11-03: Own domain planned (wirescout.app)

- A Corporate Disclosures colleague signed up on live and got no confirm email. Checked with Ken: right address, the sign-up check let it through, the Gmail sender's Sent folder has it, no bounce; not in his Junk, Other or Microsoft 365 quarantine. IT can't help yet.
- Brevo can't send as a Gmail address, so Ken registered `wirescout.app` at Namecheap (2026-11-03).
- Plan written: `docs/mvp-plan.md`, "Own domain". Part 1 (account emails through Brevo) is Ken's steps only, no code.
- Next: part 1, guiding Ken one step at a time; then the colleague signs up again. Parts 2 and 3 are one job each.
- Part 1 done by Ken, same day: Brevo account (his work address), `wirescout.app` authenticated (Brevo added its records through its Namecheap connection), Namecheap forwarder `no-reply@wirescout.app` → Ken, sender `Wirescout <no-reply@wirescout.app>` (the only one), SMTP key `supabase`, Supabase SMTP set to Brevo.
- Checked: a password-reset email from the live app reached Ken's inbox, and its link opened the Confirm page. Not checked: the colleague's sign-up (Ken dropped it).
- Brevo rewrites every link into a tracking link (`sendibt3.com`), with no switch on the free plan. Works, but filters may distrust it. If emails go missing again, the fallback is a provider that lets tracking be turned off (e.g. Resend); the DNS work carries over.
- Part 3, before the release, done by Ken the same day: `wirescout.app` verified for GitHub Pages (account settings, TXT record), Namecheap parking records removed, GitHub Pages A, AAAA and `www` CNAME records added (checked from here on Namecheap's servers), `https://wirescout.app/**` added to Supabase's Redirect URLs. Site URL and the Pages custom domain not changed yet.
- Part 3 released (PR #20, merged by Ken at 18:13 UTC; deploy passed). Ken set the Pages custom domain `wirescout.app` before the merge (certificate issued, Enforce HTTPS on) and the Supabase Site URL to `https://wirescout.app` after it. Checked from here: the new build at the root, deep links, the old `github.io/wirescout/…` addresses redirect with their path. Ken signed in at `https://wirescout.app`.
- Not checked: a password-reset email's link going to the new address. The old `github.io` entry stays in Supabase's Redirect URLs for now.
- Next: part 2 (digest, admin and scanner emails through Brevo), one job.

## 2026-11-03: Fallback boxes as warnings

- Released before this: PR #18, merged by Ken at 13:11 UTC; Ken had redeployed the 3 posting functions before it. On live, the French story's dialog showed the hourly-limit box: the cause was the 10 AI drafts an hour, used up by the day's testing.
- Both fallback boxes (hourly limit, AI couldn't write) are amber warnings now, like "already sent": the light blue was easy to miss (Ken).
- Checked: type-check, build. Not looked at in the browser: the same warning style the dialog already uses.
- Released: PR #19, merged by Ken at 13:39 UTC (web app only, nothing to redeploy).
- Next: all 12 items before the first journalist are live, at v0.1.0. Ken invites the first journalist when he's ready.

## 2026-11-03: Drafts still in French after the release (fix)

- Released before this: PR #17 (the 6 jobs), merged by Ken at 12:23 UTC; the web app deploy passed. Ken then redeployed the 3 posting functions (`npx supabase functions deploy draft-text magazine-connect post-draft`).
- Ken's French story still came back in French. Cause: when the story page can't be read (blocked, paywalled, JavaScript), the AI was skipped and the story's own text used, silently. Also the same after 10 AI drafts in an hour, or when the AI call fails.
- Fix: a page that can't be read no longer skips the AI: it writes from the story's own title and summary, in British English. The 2 remaining fallbacks show an info box in the Send dialog (Ken's idea): the hourly limit, or "couldn't write a suggested draft". Every fallback's cause is in the `draft-text` log (Supabase → Edge Functions → draft-text → Logs).
- Checked: 63 unit tests (a new one fails on the old code), type-check, build; in the browser with a made-up local account: the "couldn't write" box (no AI key locally), and the hourly-limit box after 10 drafts logged.
- Not checked: the real French story through the AI (no key locally).
- Release: the 3 posting functions need redeploying, and the web app needs a release PR.

## 2026-11-03: Admin source alerts (before the first journalist, job 6)

- The scanner's email to `ADMIN_EMAIL` now goes only when the scanner itself looks broken: in one scan, at least half of the sources that found stories last time find none, and at least 3 (`findScannerBreak` in `src/scanner/health.js`). Subject "Wirescout: the scanner may be broken", listing those sources. Once per break. One failing source emails nobody.
- A crash or a failed save still turns the run red, and GitHub emails the repo owner.
- Checked: 62 unit tests (4 new, the old per-source ones replaced); `npm run scan` against the local Supabase with email to Mailpit and 3 made-up working sources: one alert, and none on the next scan. Test data removed afterwards.
- Release: the scanner (`scanner.yml`) picks it up from `main` at its next hourly run; nothing to deploy. All 6 jobs are done: next, the release (merge `origin/main` into `mvp`, release PR, then Ken redeploys the 3 posting functions).

## 2026-11-03: Polish (before the first journalist, job 5)

- Brand: a robot head (option A of 3, Ken's pick), drawn in the brand blue before "Wirescout" in the side nav and the phone top bar (`components/BrandIcon.vue`).
- Side nav: watch lists A–Z, ignoring capitals ("New watch list" stays last); Settings: Channels, then Daily digest. The dashboard cards keep their order (creation).
- Settings → Channels: Share options Copy link, Email, LinkedIn. The magazines and the Share menu were already A–Z (by name), no change.
- Add sources dialog: the paste box's focus ring is no longer cut at the sides (room inside the scrolling box); the file drop box is square, and the dialog's fixed height grew to fit it without scrolling.
- Checked: type-check, build, 60 unit tests; in the browser with a made-up local account and 3 lists named out of order: the side nav, Settings, Channels, the paste box focused, the drop box measured 1:1 with no scroll. Not checked: the phone top bar (same component as the side nav).
- Release: web app only. Next: job 6, admin source alerts.

## 2026-11-03: Remember me (before the first journalist, job 4)

- Sign-in page: a "Remember me" checkbox, unticked by default. Ticked: signed in until sign-out, as before. Unticked: a flag in localStorage and a cookie with no expiry date (shared by every tab); the browser drops the cookie when it closes, and the next visit drops the stored session (`src/app/lib/supabase.ts`).
- Email-link sign-ins and sessions from before the release count as remembered, so nobody is signed out by the release. Signing out clears the choice. The browser's password manager keeps the email and password; Wirescout stores neither.
- Checked: type-check, build, 60 unit tests; in the browser with a made-up local account: unticked (a new tab stays signed in; with the cookie gone, the next load goes to sign-in), ticked (stays signed in), sign-out clears the choice, a password-reset link stays signed in. Not checked: quitting the whole browser (the cookie was deleted by hand instead); browsers that reopen the last tabs may keep the cookie.
- Release: web app only. Next: job 5, polish.

## 2026-11-03: Drafts to magazines (before the first journalist, job 3)

- Drafts are always in British English: the model is told so in its instructions, the title and brief fields and the request, whatever the story's language. The fallback keeps the story's own text (Ken's call). New unit test.
- Send dialog: the AI note sits right above Cancel and Send; after sending, "Open in <magazine>" is inside the "Draft sent" message. "What's new" and `docs/post-to-modx-plan.md` say both.
- Checked: 60 unit tests, type-check, build; in the browser, a draft sent to the local Corporate Disclosures copy (Ken signed in): the note above the buttons and the button inside the message. Not checked: a real French story through the model (no `ANTHROPIC_API_KEY` locally).
- Local setup on the way: a new local account for Ken (confirmed from Mailpit), the old local account's Corporate Disclosures connection deleted (Ken's ok). Start a magazine copy with `docker compose up -d` in its folder: without its database, MODX says every password is wrong.
- Release: redeploy all 3 posting functions. Next: job 4, Remember me (plan first).

## 2026-11-03: Missing digest (before the first journalist, job 2)

- Not a bug: the digests were sent and landed in Ken's junk folder. Run logs (totals only): Fri 30 Oct and Mon 2 Nov, 1 sent each; none at the weekend, by design; on Tue 3 Nov none due before 10:41 UTC.
- Noted in `docs/known-issues.md`: digests can land in junk (Gmail sender), and GitHub ran the digest about hourly, not every 15 minutes.
- No code change. Next: job 3, drafts to magazines.

## 2026-11-03: Version back to 0.1.0 (before the first journalist, job 1)

- `package.json` (and the lock file's own version) back to 0.1.0. "What's new" has one 0.1.0 entry: the drafts-to-magazines notes joined it.
- One source: the newest "What's new" entry takes `__APP_VERSION__` (from `package.json`), like the side nav. The rule is written in `releaseNotes.ts`, `docs/project.md` and the plan's Decisions.
- Checked: type-check, build (only `0.1.0` in the bundle), 59 unit tests; in the browser, the side nav and the "What's new" badge both show v0.1.0, with no "Earlier versions".
- Release: web app only. Next: job 2, the missing digest.

## 2026-11-03: Before the first journalist (plan only, no code)

- Released before this: PR #16 (fixes after the first look), merged by Ken on 2026-11-02; the web app deploy passed. Whether the 3 posting functions were redeployed after it wasn't recorded; the next release redeploys all 3. New rule: production steps are recorded here in the same session (`workflow.md`).
- Ken's 12 changes after testing live, grouped into 6 jobs in `docs/mvp-plan.md` ("Before the first journalist"). New decision: the version stays 0.1.0 until Ken says otherwise.
- Next: job 1, the version.

## 2026-11-02: Fixes after the first look at the release (step 6)

- Share menu: no more "Coming soon..." magazines. It lists only the magazines the user added, then Add a magazine. Channels still shows the 3 greyed out.
- Draft text: 100 to 250 characters (not words), 1 or 2 paragraphs, as Ken asked. The model is asked for that, and `shortenBrief` (`src/publish/draft.js`) cuts anything longer after the last whole sentence that fits. The fallback (the story's own summary) is cut the same way.
- Send dialog: a note under the buttons: "Wirescout uses AI to write drafts, and AI can make mistakes. Please check your draft before sending."
- Sign-in errors: a magazine that doesn't answer now says "<Magazine> isn't responding right now. Please try again in a few minutes." in a box above the buttons, not under the password field. A wrong username or password still shows under the field.
- Checked: 59 unit tests (5 new), type-check, build; in the browser: the Share menu, Channels, the Send dialog note, and both sign-in errors (local Corporate Disclosures copy stopped, then a made-up account). Not checked: a real AI draft (no `ANTHROPIC_API_KEY` locally).
- Release: `draft-text`, `magazine-connect` and `post-draft` use the changed code, so all 3 need redeploying.

## 2026-11-02: Post to MODX release, part 1, and "Coming soon..." magazines (step 6, job 5)

- Production steps run by Ken: both function secrets set, the 3 migrations pushed, the 3 functions deployed, the 4 `publications` rows filled with the live addresses and ids (checked on each live site).
- Release step 4 found a blocker: Environmental Finance, InsuranceERM and Insurance Asset Risk sit behind a Cloudflare bot check (HTTP 403 "Just a moment...", even on the home page), so the functions can't reach them. Corporate Disclosures answers (401, as expected).
- Ken's call: show those 3 greyed out with "Coming soon..." instead of hiding them, so the team asks for the Cloudflare allowance. New `publications.coming_soon` column (migration `20261102190249`), set for the 3; Settings → Channels and the Share menu show them disabled; `magazine-connect` (connect only), `post-draft` and `draft-text` refuse them. Turning one on: `update public.publications set coming_soon = false where slug = '<slug>';`
- Checked: all 110 database tests (3 new), lint, 55 unit tests, type-check, build; the 3 functions called locally as a made-up user (coming-soon magazine refused, disconnect still works, Corporate Disclosures passes); both screens looked at in the browser.
- Next: push this migration and redeploy the 3 functions, release `mvp` into `main`, then the trial with one journalist on Corporate Disclosures. Separately: a Cloudflare rule letting `/connectors/` through for Wirescout (whoever manages Cloudflare for the 3 sites).

## 2026-11-02: Post to MODX app (step 6, job 4)

- Settings → Channels: the 4 magazines, Add magazine (own MODX sign-in), Connected as …, Disconnect. Share menu: Send to each added magazine, then Add a magazine. Send dialog: suggested title and text, editable; Open in <magazine> after sending.
- Duplicates (Ken's idea, 2026-11-02): a warning when anyone already sent the story to that magazine, with Open existing story and Send anyway; "Sent to <magazine>" on the story card; a clear message when MODX refuses a same-title article. New function `story_sends`, 6 database tests.
- Also: an eye button on every password field; the sticky side nav no longer moves while a dialog is open; focus returns to Share after the dialog; MODX field errors are read from `data`.
- Ken tested end to end: signed in to the local Corporate Disclosures copy with `wirescout-test` and sent drafts.
- Next: job 5, the release (production steps in the plan).

## 2026-11-02: Post to MODX functions (step 6, job 3)

- 3 Edge Functions: `magazine-connect` (connect, disconnect; 3 failed sign-ins then a 15-minute wait), `post-draft`, `draft-text` (Claude Haiku 5.5, 10 per user per hour, falls back to the story's own text). Shared code in `src/publish/` (`modx.js`, `session-crypto.js`, `draft.js`), 19 new unit tests against a fake MODX and a fake model reply.
- New migration: `draft_text` as a `publish_log` action. Seed: the local magazines on their own ports, so the functions can reach them.
- Checked locally with a made-up user: every error answer, the fallback draft text, and real refusals from the local Corporate Disclosures copy (a made-up username) with the 4th try blocked.
- Not checked: a real sign-in and draft (needs Ken's test account password, in job 4's dialog), and a real Haiku call (needs the API key).
- Next: job 4, the app (Channels settings and the Share menu).

## 2026-11-02: Post to MODX database (step 6, job 2)

- One migration (`20261102131014_post_to_modx.sql`): posting settings on `publications` (`cms`, `cms_url`, `article_parent_id`, `article_template_id`, all or none), `magazine_connections` (users read their own rows without the session and never write them; one Wirescout user per MODX account, ignoring capitals), `publish_log` (insert-only, even with the secret key).
- Seed fills the 4 local `.test` magazines. The approved decisions are recorded in `docs/mvp-plan.md`.
- 17 new access tests; all 100 database tests pass. `database.types.ts` regenerated.
- Next: job 3, the Edge Functions.

## 2026-11-02: Step 6 decisions (plan only, no code)

- Ken answered the plan's 3 open questions (`docs/post-to-modx-plan.md`): the Send dialog with a Claude Haiku 5.5 suggested title and 100–250 word brief, editable, source link last, no mention of Wirescout; drafts go to In Brief (News on Corporate Disclosures), ids in the plan; own MODX accounts only. Also: all 4 magazines offered to everyone, the magazine's login is the gate; 3 failed connect attempts then a 15-minute wait; a new `draft-text` function and the `ANTHROPIC_API_KEY` secret.
- Noted in `docs/known-issues.md`: the sign-in screen has no "Stay signed in" option.
- Next: Ken's "approve" on job 2, the database.

## 2026-11-02: MODX posting research and staging test (step 6, job 1)

- Research: Wirescout can post drafts to a MODX magazine through the connector the MODX manager itself uses, as the journalist's own account, with no change to any magazine. Verified in the MODX 2.8.3 source (corporate-disclosures repo) and the 3.x branch. Report: `docs/modx-integration-research.md`.
- Plan for step 6, waiting for approval: `docs/post-to-modx-plan.md`. It replaces the "receive draft endpoint per site" decision with an Edge Function calling the MODX connector directly.
- Staging test: `src/publish/modx-staging-test.js` and `docs/modx-staging-test.md`, against the local corporate-disclosures Docker copy (`http://cd.test`). Its PHP container pointed at the repo's old folder and was recreated; the site and the connector now answer locally.
- Checked without any account: a wrong login returns MODX's JSON refusal; a connector call without the token returns 401. The script parses.
- Run with Ken's ok, on the test account `wirescout-test` (Editor role): **11 of 11 passed**. Login, draft create, read back, publish, unpublish, bin, logout, and refusals without a token, with a wrong token and after logout. Finding: MODX reports a refusal as HTTP 200 with `code: 401` unless the request carries `X-Requested-With: XMLHttpRequest`; the script sends it now and the plan records it.
- Then the same test on local copies of the other 3 magazines (environmental-finance.com, insuranceassetrisk.com, insuranceerm.com; MODX 2.8.1), each with its own `wirescout-test` account: **11 of 11 on each**. All 4 sites have the same layout; only the section and template ids differ (table in `docs/modx-staging-test.md`).
- Not tested: a MODX 3 site; template variables; an account without `publish_document`; image upload.
- Plain-words summary with a diagram, for anyone new to it: `docs/post-to-modx-in-plain-words.md`.
- Next: Ken's "approve" on `docs/post-to-modx-plan.md` (3 open questions at its end), then job 2, the database.

## 2026-10-30: UI amends after v0.1.0

- Released before this job: v0.1.0 (PR #13, merged by Ken). The 2 migrations were pushed to the cloud first; the web app deploy passed.
- From Ken's review:
    - Sources table: each source's name opens its page on the site in a new tab, failing ones too.
    - Stories tab: search on the left, All stories · Saved on the right.
    - Dashboard: "2 sources · ⚠ 1 failing" on one line (the failing link sat higher).
    - Search page: more space between results. A story opened from it links back to "Search results" (the same search), from the browser history, also after a reload; opened any other way, back to its list.
- No database change.
- Checked: type check, build, 35 unit tests. In the browser (dark, desktop; a made-up local user with the 2 seed sources, one marked "not found", Ken's ok): the source links' addresses, the Stories tab in both views, the dashboard line, the search spacing, back to the results (also after a reload), a story opened directly going back to its list. Phone width (390 px frames): the Stories tab and the dashboard.
- Not checked: a real phone; light mode (no colour changes).
- Next: step 6, post from Wirescout.

## 2026-10-30: Global search (polish stage, job 7 of 7)

- Top bar: "Search all watch lists". Enter opens the Search page (`/search?q=…`); the field keeps what was searched there. On phones, a magnifier icon opens the field over the bar, with Cancel (Esc closes it too and keeps the text).
- Search page (`SearchPage.vue`): **Sources** first (name or link contains the search, with their list and any problem in red; each opens its list's Sources tab), then **Stories** (the newest 50 whose title or summary contains it, through each list's keywords, with list, source and date; each opens its story page). More than 50: "Add a word to narrow the search".
- "What's new" has its line. No database change.
- Checked: db lint, type check, build, 35 unit tests. In the browser (dark, desktop; local seed data, nothing changed): a source search, a story search with capitals, a search with both, a story and a source result opening the right page, nothing found; phone width (a 390 px frame): open, search, Cancel, Esc; tablet width (768 px frame); light mode.
- Not checked: the database tests (no migration); a real phone; more than 50 results (no local data for it).
- Next: release v0.1.0 (merge `origin/main` into `mvp`, push the 2 migrations, release PR).

## 2026-10-30: Dashboard (polish stage, job 6 of 7)

- Each list's card: the new stories as a big number (or "No new stories"), a bar chart of stories per day over the last 7 days (`StoriesChart.vue`; today in blue, earlier days gray, each day's count on hover), "2 sources · ⚠ 1 failing" (the failing part links to the Sources tab), "3 saved · Latest story 2 h ago".
- The list name's link covers the card; the failing link and the chart sit above it, and a click on the chart still opens the list.
- "What's new" card after the lists, from `src/app/lib/releaseNotes.ts` (v0.1.0 so far; "Earlier versions" shows once there are two). Job 7 adds its line.
- 1 migration: the view `watch_list_stats` (sources, failing, saved, latest story, 7 daily counts in the user's time zone, through the keywords).
- Checked: 6 new database tests (all pass; the known profile-count test fails while the local database has test users), db lint, type check, build, 35 unit tests. In the browser (dark, desktop; no data changed): the card with the seed stories, the chart's label and hover target, the failing link opening the Sources tab, the card and the chart opening the list, the keyboard focus ring; light mode; phone width (a 375 px frame).
- Not checked: the saved count and a new-story number in the browser (no local saved or new stories; covered by the database tests); a real phone.
- Release order: push the migration to the cloud before Ken merges v0.1.0, or the dashboard can't load.
- Next: job 7, global search.

## 2026-10-30: Save stories (polish stage, job 5 of 7)

- Each story card has Save / Saved next to Share (`SaveButton.vue`), in the list and on the story page. Clicking Saved removes it. Ken chose "Save": the word news apps use for "keep for later".
- The Stories tab has a switch, **All stories · Saved**. Saved shows the list's saved stories, newest save first; a story removed there stays (with Save) until the view is opened again. The search box shows only with All stories.
- 1 migration: `saved_stories` (watch list, story, saved at), deleted with its list. Users save only stories from their own list's sources, and can't change `saved_at`.
- Checked: 10 new database tests (all pass; the known profile-count test fails while the local database has test users), db lint, type check, build, 35 unit tests. In the browser (dark, 606 px and desktop; local saved stories, Ken's ok): saving 2 stories, the Saved view in save order, removing one there, the story page showing and removing a save, the empty Saved view; light mode.
- Not checked: a real phone.
- Release order: push the migration to the cloud before Ken merges v0.1.0, or the live app can't load a watch list.
- Next: job 6, dashboard.

## 2026-10-30: Watch list settings (polish stage, job 4 of 7)

- Side nav: each watch list has a "⋯" menu (Edit, Delete), shown on hover and keyboard focus, always where the nav is a drawer. Same `WatchListMenu.vue` as the list page.
- Edit replaces Rename: one dialog with "Name" and "Only include stories that mention…". The Stories tab keeps only the search box; `KeywordsFilter.vue` is gone.
- The `watchLists` store now holds the keywords. The list page follows it (an edit from the nav updates the title and reloads the stories), and so do the dashboard's counts. Deleting another list from the nav leaves the open page alone.
- No database change.
- Checked: type check, build, 35 unit tests. In the browser (desktop, dark; local test data, Ken's ok): the "⋯" on hover and focus and white on the open list; renaming "QA list 2" with `flood,  Flood ,` from the nav (saved as `flood`); renaming "QA list" with a keyword from its page (title, nav and stories updated), clearing the keyword from the nav (stories back); deleting the other list from the nav (page stayed). Phone width (a 390 px frame): "⋯" always shown, its menu opens. Light mode: the nav on hover.
- Not checked: a real phone or tablet; the dashboard count after a keyword edit (no new stories locally).
- Next: job 5, save stories.

## 2026-10-30: Motion (polish stage, job 3 of 7)

- In `app.css`, no new dependency: menus grow from their button and fade out (`menu-pop`); dialogs fade in with the box rising a little, and fade out (`dialog-fade`, `dialog-pop`); one tab underline slides between tabs (Reka's `TabsIndicator`, class `tab-indicator`); buttons press in slightly; each new page fades in (a `Transition` around the layout's `RouterView`). Dashboard cards lift on hover.
- All of it stops with "Reduce motion".
- Checked: type check, build, 35 unit tests. In the browser (desktop and phone width, dark): each animation running on open and close, the underline sliding in the watch list and the Add sources dialog, the old page gone at once, the dashboard, watch list and Account settings layouts unchanged.
- Not checked: "Reduce motion" turned on (a system setting); the button press (CSS only).
- Next: job 4, watch list settings.

## 2026-10-30: Look and feel (polish stage, job 2 of 7)

- Blue: picking Light in Account settings showed DaisyUI's built-in indigo, because its light theme's selector beat ours. DaisyUI's built-in themes are off now; ours copy their values. #0071e3 in Light, Dark and Auto.
- Surfaces: the page is `base-200` (#f5f5f7 in light, a darker gray in dark), cards, tables, menus, dialogs, the side nav and the top bar `base-100`. The sources table now sits in a white box.
- 16 px corners on fields, buttons, cards, menus and dialogs. Icon buttons are round.
- Search boxes: new `ui/SearchField.vue` (Stories and Sources tabs), with the same focus border as the other fields, no gap.
- Failing sources: a light red row with a red edge. Text on it passes 4.5:1 (5.6 light, 4.9 dark).
- Checked: type check, build, 35 unit tests. In the browser (phone width, light and dark): the blue in all 3 theme settings, surfaces, the search focus, round buttons, a dialog, the side nav, the failing row, the Move dropdown's focus (no gap already). Local test data (Ken's ok): the 2 seed sources in "QA list", a second list, one source marked "not found".
- Not checked: desktop width (the browser window couldn't be resized this time).
- Next: job 3, motion.

## 2026-10-30: Quick fixes (polish stage, job 1 of 7)

- Released before this job: the usage report (PR #12, merged by Ken). Its migration was already in the cloud (checked).
- Polish stage planned from Ken's 18 changes (`docs/mvp-plan.md`, "Polish before step 6"), released together as v0.1.0. No Pinia: shared data stays in `src/app/lib/`.
- Account settings: the Email field starts with the current address; Change email works once it's different.
- Account menu: the avatar only, with the name's first letter (person icon without a name). The name is for screen readers.
- Dashboard: "No new stories". Side nav: the version under Settings (`v0.1.0`, from `package.json`).
- Checked: type check, build, 35 unit tests. In the browser (desktop, dark, with a made-up local account): the email pre-filled and Change email off until it differs, the name kept after a reload, "Q" in the avatar, "No new stories", `v0.1.0`; the dashboard in light mode.
- Not checked: the phone width (the browser window couldn't be resized); the database tests (no migration).
- Next: job 2, look and feel.

## 2026-10-30: Usage report

- Released before this job: the digest email layout (PR #11, merged by Ken).
- App: records each day a person opens it (`active_days`, one row per day), each Share click (LinkedIn, Email, Copy link) and each digest link opened (`usage_events`). Digest links carry `?from=digest`, dropped after counting so a reload doesn't count twice. One line about it on the sign-up page and in Account settings.
- `src/admin/` and `admin.yml` (hourly, :40): emails `ADMIN_EMAIL` new access requests (once each) and, once a month is over, the usage report (active days per person over 6 months as bars, last month's shares and digest clicks, the 5 most shared stories).
- 1 migration: `active_days`, `usage_events`, `record_active_day()`, `access_requests.notified_at`, `usage_reports` (September 2026 marked as sent: counting starts in October).
- Checked: 35 unit tests (4 new), 9 new database tests, db lint, type check, build. In the browser: a signed-out digest link → sign in → the story, recorded 1 day, 1 digest click (a reload didn't add one) and 1 Copy link share; the sign-up and Account settings lines. Local admin run to Mailpit: 1 access request and the usage report (made-up data), nothing on the second run.
- Not checked: the phone layout and light mode; LinkedIn and Email shares in the browser (same code path as Copy link); real Gmail sending.
- Release order: push the migration to the cloud before Ken merges, or recording and the admin emails fail.
- Next: step 6, post from Wirescout.

## 2026-10-30: Digest email layout

- Released before this job: the digest (PR #9) and the run times :05, :20, :35, :50 (PR #10), both merged by Ken. Ken ran the digest by hand and got his first one.
- From Ken's first digest: "Wirescout" above the cards, linking to the dashboard; each watch list in its own card; the list name as a real heading with "382 new stories" under it and the red warning on the right; a full-width blue button "See all new <list> stories on Wirescout".
- Checked: 31 unit tests; a local digest in Mailpit (desktop width).
- Not checked: the phone width, Outlook and Gmail rendering.
- Next: usage report job.

## 2026-10-30: Daily digest (build step 5)

- Released before this job (PR #8, merged by Ken): Keywords. Migration pushed first; the web app deploy passed.
- `src/digest/` and `digest.yml` (every 15 minutes): emails each user whose digest is due (Monday to Friday, their time passed in their time zone, none yet today). Stories since the last digest (7 days at most), through the keywords. No email when nothing is new.
- Email: one section per list, "Regulators · 5 new stories" and a red "⚠ 3 problematic sources" linking to the Sources tab; up to 5 stories, then "See all new stories on Wirescout". Stories link to their page in the app, never to the source site.
- App: a story page (`/lists/<list>/stories/<story>`) with "← list name", the story and its Share menu; `?tab=sources` opens the Sources tab; signing in returns to the link that was opened. The story card is now `StoryCard.vue`, shared by the list and the story page.
- 1 migration: `profiles.last_digest_at`, written only by the sender.
- Checked: 31 unit tests (14 new: due rule incl. time zones, weekends, clock change, catch-up; the email), 2 new database tests, db lint, type check, build. Local run to Mailpit: 1 digest sent, nothing on the second run; the email's story link, back link, Share menu, Sources tab link, a story from another list refused, signing in from a story link.
- Not checked: the phone layout (the browser window couldn't be resized); light mode; a real Gmail send (only Mailpit).
- Release order: push the migration to the cloud before Ken merges, or the digest fails writing `last_digest_at`.
- Next: usage report job.

## 2026-10-30: Keywords

- Released before this job (PR #7, merged by Ken on 2026-10-29): the sources fixes. The web app deploy passed.
- Stories tab: a search box (any part of a word, title and summary) and a line "All stories · Only show stories that mention…" or "Only stories that mention: flood, climate risk · Edit". The dialog takes words or phrases separated by commas; empty shows all stories.
- Keywords match whole words or phrases, ignoring capitals, in the title or summary. Up to 20.
- 1 migration: `watch_lists.keywords`, the function `mentions_any`, the view `watch_list_articles` (each list's matching stories), and `watch_list_new_counts` rebuilt on it, so the dashboard counts only matching stories. The digest (step 5) should read from the same view.
- Checked: 14 new database tests (all pass; the known profile-count test fails while the local database has a test user), db lint, type check, build, 17 scanner tests. In the browser (desktop, dark): search with capitals and part of a word, `%` searched as typed, "No stories match", saving keywords (spaces tidied, repeats dropped, "premium" not matching "premiums"), the 21-keyword error, the empty state, clearing the keywords, the dashboard.
- Not checked: the phone layout and light mode; the dashboard count with a new story hidden by keywords (covered by the database tests only).
- Release order: push the migration to the cloud before Ken merges, or the live app can't load stories.
- Next: step 5, the daily digest.

## 2026-10-29: Sources fixes after the live test

- Released before this job (PR #6, merged by Ken): Fix sources, Check links, Paste links, Select/move/remove, and the Sources tab. Migration pushed to the cloud right after the merge (16:21 UTC, before the next scan); Ken deployed `check-links`. Live test (Ken): 1 link added, 1 "page not found".
- From Ken's live test:
    - The Add sources dialog keeps one height on both tabs; its content scrolls inside.
    - Search on the left, Add sources on the right.
    - Move to… always shows. The Move dialog offers "New watch list…" with a name field: it creates the list and moves the sources in one go.
- Checked: type check, build. In the browser: both dialog tabs the same height, the toolbar, moving a source into a new list (it appeared in the side nav).
- Not checked: the phone layout and light mode.
- Next: Keywords job.

## 2026-10-29: Sources tab and table

- The watch list has two tabs: **Stories** (default) and **Sources**, with a red badge counting failing sources.
- Sources is a table (`SourcesTab.vue`, TanStack Table `@tanstack/vue-table` 9.3.1, new dependency, Ken's choice): tick box, Source, Status, Last checked, and Fix plus "⋯" (Edit, Move to…, Remove). Failing sources first; click a header to sort. Search box. Ticked sources get a bar with Move to…, Remove and Clear; the header tick box ticks the sources shown.
- **Add sources** opens a dialog (new `ui/Dialog.vue`) with Paste links and Upload a file; the single link field is gone.
- On a phone the header hides and each row stacks into a small card.
- Checked: type check, build, scanner tests. In the browser (desktop, dark): the tabs and badge, failing first, search, sorting by Last checked, ticking one and all, Clear, adding a link through the dialog.
- Not checked: the phone layout (the browser window couldn't be resized) and light mode.
- Next: Keywords job.

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
