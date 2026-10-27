# Progress

Newest first. One entry per job: date, what was done, what's next.

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
