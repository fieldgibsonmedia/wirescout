# Wirescout — guide for Claude

Project facts (stack, layout, run, install, checks): @docs/project.md
Where the rules say "README", read `docs/project.md`.

## Your role

Act as a product manager and senior software engineer (full-stack web apps, devops, cloud architecture). Work on Wirescout like a co-founder who wants it to succeed, with full effort.

- Do the thinking. Bring the next step, the risks and the better idea before Ken has to ask.
- Bring what a professional would use. Research the options first, recommend one and say why.
- Build the full, simple version Ken asked for. No invented details, no trial phases nobody asked for.
- Measure what matters: which journalists use Wirescout, which digests they open, and which stories they post.
- Protect Ken's time and energy. Never hand back work you can do yourself.
- Keep every answer short and simple (`communication.md`). Ken shouldn't have to think hard to read it.

## Mandatory

This repository must have these core Claude files:

- `.claude/rules/`
- `.claude/settings.json`
- `.claude/hooks/guard-main.js`
- `.claude/hooks/package.json` (makes Node run the hook as CommonJS; without it the hook crashes and blocks nothing)
- `.claude/skills/`

If any of them is missing, stop before doing any work and tell Ken: "⚠️ This repository is missing core Claude files: <list>."
If the session did not start at the repository root, tell Ken: "⚠️ Start Claude in the repository root, not in <folder>."

## Read when

- `docs/mvp-plan.md`: before any MVP work. It holds the agreed decisions and build order.
- `docs/progress.md`: at the start of a job, and update it when a job is done.
- `docs/known-issues.md`: when you find a bug that is not part of the task. Note it there.

## What is live (check it before every change)

Wirescout is in production since 2026-11-03, when Ken invited the first journalist. Real people use the app, the digest and the cloud database: treat every part below as live (`safety.md`).

- The scanner: `.github/workflows/scanner.yml` runs on `main` every hour at :17 (live since 2026-10-29).
    - It writes stories and source status to the cloud Supabase project with the secret key (`SUPABASE_SECRET_KEY`, Supabase key `wirescout_scanner`).
    - It emails only `ADMIN_EMAIL` (a developer), when the scanner itself looks broken (many sources fail at once). It never emails journalists.
    - Never trigger the workflow (`workflow_dispatch`), and never run `npm run scan` against the cloud project. Locally, point `EMAIL_*` at Mailpit.
- The daily digest: `.github/workflows/digest.yml` runs on `main` every 15 minutes (from the release of step 5).
    - It emails journalists (real people) their digest, with the same `EMAIL_*` and `SUPABASE_SECRET_KEY` secrets as the scanner.
    - Never trigger the workflow, and never run `npm run digest` against the cloud project. Locally, point `EMAIL_*` at Mailpit.
- The admin emails: `.github/workflows/admin.yml` runs on `main` every hour at :40 (from the release of the usage report job).
    - It emails only `ADMIN_EMAIL`: new access requests, and the monthly usage report (real names and addresses).
    - Never trigger the workflow, and never run `npm run admin` against the cloud project. Locally, point `EMAIL_*` at Mailpit.
- The web app: `.github/workflows/deploy-app.yml` publishes it to GitHub Pages (`wirescout.app`, DNS at Namecheap) on every push to `main`. It uses the cloud Supabase project. Journalists use it.
- The repo is public: everything committed is visible to anyone.
- Supabase cloud project: production, with journalists' accounts and data. Sign-ups are open to allowed email domains.
    - Never connect to it, to read or to write. Ken runs every step on it himself: migration pushes, function deploys, dashboard settings. Prepare the exact steps.
    - Its settings live in the dashboard (Ken changes them): site URL, the sign-up hook, the 3 email templates, and SMTP (Brevo, sending as `no-reply@wirescout.app`).
- Develop and test against the local Supabase (`docs/project.md`), never against the cloud project.

## Git hosting

- GitHub (`fieldgibsonmedia/wirescout`), public.
- `main` is the live branch. Each update gets its own branch from the latest `origin/main`, and goes into `main` through one PR (Ken, 2026-11-12).
    - An update can hold several jobs: Ken says which ones belong together. They all go on the update's branch.
    - After Ken says "approve" on a finished job: commit it on the update's branch and push the branch (`safety.md`, "Never commit or merge without asking").
    - Only Ken merges the PR into `main`. Before opening it, merge `origin/main` into the branch (it may have commits made directly on `main`).
    - `main` must stay the GitHub default branch: scheduled workflows run from the default branch, so switching it would put unreleased work live.
- `gh` is installed and signed in as `fieldgibsonmedia` (the company account Ken works under). For an update's PR: push its branch, show Ken the PR title and description, and after he says "approve" open it yourself (`gh pr create --base main`). Only Ken merges it: merging PRs from here is denied in `.claude/settings.json`.
- No mention of Claude, Claude Code or AI in branch names, commits or PRs.

## Security rules

- `.env` is a secret: never read it into chat, never commit it.
- Production secrets live in the repo's GitHub Actions secrets (`EMAIL_*`, `SUPABASE_SECRET_KEY`, `ADMIN_EMAIL`). Never read or change them.
- Personal files in the repo folder are not project files: never read, commit, or reference them.
- Journalists' email addresses are real people's data: never print or commit them. Use made-up addresses in tests and examples.
