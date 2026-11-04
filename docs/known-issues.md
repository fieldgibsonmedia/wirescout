# Known issues

Bugs found while working on something else. One entry each: date, what, where, how to see it.

## 2026-11-04: A source can show "failing" right after its link check passed

- Sources are shared between watch lists. When someone adds a site that's already in Wirescout and failed its last hourly check, the link check can pass (the site answered this time), yet the list shows the old "failing" status and a Fix button until the next hourly scan. Seen with Bloomberg, which blocks Wirescout only some of the time.
- `scan-new-sources` reads only sources never checked before, so it doesn't refresh this one.
- See it: add a site that's already failing in another list, at a moment it answers.

## 2026-11-03: Microsoft 365 drops the confirm email from the Gmail sender

- A colleague at `insuranceassetrisk.com` signed up on live: the email is in the Gmail sender's Sent folder, with no bounce, but nowhere in his mailbox (not Junk, Other or his quarantine). Likely an admin-only quarantine; IT can't check yet.
- Fix planned: send from `wirescout.app` through Brevo (`docs/mvp-plan.md`, "Own domain").
- See it: sign up on live with an address at a company domain on Microsoft 365.

## 2026-11-03: The seed sources can't be added from the app

- `docs/project.md` ("Run the web app", step 4) says to add `https://news.example.com/press` to a watch list. The Add sources dialog refuses it ("the site can't be reached"): the link check (`check-links`) tries to open it, and `example.com` addresses don't exist.
- See it: Sources → Add sources → paste the link → Add. Today the only way is a row in `watch_list_sources` (Studio).

## 2026-11-03: Digests can land in the junk folder

- Ken's digest of Mon 2 Nov was sent (the run log says "1 sent") but went to his junk folder. The digest comes from a Gmail account over SMTP, not a company domain (`docs/mvp-plan.md`, Decisions, Email), so mail filters trust it less.
- Before the first journalist: tell them to mark it "Not junk" and add the sender to their contacts. A company-domain sender would fix it for good, but needs DNS records IT won't add.
- See it: the digest in the recipient's junk folder; GitHub → Actions → Daily digest → a run's "Digests: … sent" line.

## 2026-10-30: GitHub starts scheduled runs late

- The scanner, set for :17, ran at 09:58 and 10:54 UTC on 2026-10-30: about 40 minutes late. The digest's first scheduled run (11:19) didn't happen at all after the merge; Ken started it by hand.
- So a digest can arrive 30–60 minutes after the chosen time.
- 2026-11-03: the digest, set for every 15 minutes, ran only about once an hour on 2–3 November (35 runs in 35 hours). If that's too late, a more punctual trigger (an outside scheduler starting the workflow) is an option.
- See it: GitHub → Actions → a workflow's runs, against its cron times.

## 2026-10-29: 10 of the 23 old sources can't be read without a browser

- Munich Re, Lloyd's, Hannover Re, Bank of England, Gallagher Re, Zurich, AIG (global), Tokio Marine, BaFin, Geneva Association: their pages build the story list with JavaScript, or turn away anything that isn't a browser. (Count from 2026-10-29; BaFin and Munich Re have stories only in menus.)
- The scanner shows them as "No stories found" and the health email lists them on their first check.
- Waiting on the AI fallback decision (`docs/mvp-plan.md`, "Scanning without selectors"), once we know how many sources journalists add fail.

## 2026-10-29: The same page can be added twice, as `http://` and `https://`

- Sources are matched by their exact address, so `http://news.example.com/press` and `https://news.example.com/press` are two sources, scanned twice and shown twice in the list.

## 2026-10-29: A guessed or linked feed can hold more than the page

- When a page names a site-wide feed, or the scanner guesses `/feed`, the feed can include stories the page doesn't show (e.g. blog posts next to press releases). Seen on AXA XL and Capgemini.
- See it: the source's `feed_url` in Table Editor → `sources`.

## 2026-10-29: An email change isn't checked against the allowed list

- The sign-up check (`hook_before_user_created`) only runs when an account is created.
- A signed-in user can change their email to any address in Account settings, after confirming from both addresses.
- Low risk for an internal tool: they already had an allowed email.

## 2026-10-27: An access test fails when the local database has users

- `supabase/tests/database/access.test.sql`, "A profile is created for each new user", counts every profile and expects 2.
- Invite a local test user, then run `npx supabase test db`: it fails with "have: 4, want: 2". Passes after `npx supabase db reset`.

## 2026-10-27: `npm audit` reports high-severity issues in `nodemailer` and `undici`

- `nodemailer` 6.10.1 (direct dependency) and `undici` 7.18.2 (through `cheerio`). Already on `main`, not added by the Supabase work.
- See them with `npm audit`. Fixing `nodemailer` needs a major upgrade.
