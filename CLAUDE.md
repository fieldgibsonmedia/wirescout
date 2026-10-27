# Wirescout — guide for Claude

Project facts (stack, layout, run, install, checks): @docs/project.md
Where the rules say "README", read `docs/project.md`.

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

- The scanner is live: `.github/workflows/scraper.yml` runs on `main` every 4 hours and emails real journalists.
    - Anything merged to `main` goes live on the next run.
    - Never trigger the workflow (`workflow_dispatch`) and never run `npm start` with real email settings: both email real people.
- The workflow commits `src/state.json` to `main` after each run ("Update state [skip ci]"). Expect those commits; never edit or revert them.
- The repo is public: everything committed is visible to anyone.
- When the MVP (UI, Supabase) goes live, update this section.

## Git hosting

- GitHub (`kennethzuniga/wirescout`), public. `main` is the live branch.
- Branch from the latest `origin/main`. `develop` is stale (behind `main`): don't use it.
- There is no `gh` CLI. To open a PR: push the branch, show Ken the PR title and description, and after he says "approve" give him the GitHub compare link to open it.
- No mention of Claude, Claude Code or AI in branch names, commits or PRs.

## Security rules

- `.env` is a secret: never read it into chat, never commit it.
- Production secrets live in the repo's GitHub Actions secrets (`EMAIL_*`). Never read or change them.
- Personal files in the repo folder are not project files: never read, commit, or reference them.
- Journalists' email addresses are real people's data: never print or commit them. Use made-up addresses in tests and examples.
