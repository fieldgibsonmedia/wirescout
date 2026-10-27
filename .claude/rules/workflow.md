# How a job runs

Core rule, adapted for Wirescout. Last edited: 2026-10-27.

"Ask Ken" means ask in the chat and wait for his answer. Never guess just to keep going.

## Before writing code

1. Read the docs `CLAUDE.md` points to for this kind of task ("Read when").
2. Say the task in 1–2 lines: what's wrong or wanted, and what "done" looks like. If you can't, the task is unclear: ask Ken.
3. For a bug:
    - Reproduce it first: a failing test, or a failing request.
    - Find the cause, not just the symptom.
4. Check who could be affected on live (see "Live impact" in `communication.md`).

**Projects, features and upgrades:**

- Write a plan first and stop.
- Start coding only after Ken says "approve" in the chat.
- Anything else, like "looks good", is not an approval.
- Ken can forget the keyword: whenever you wait for an approval, end the message with what it unlocks, e.g. `Say "approve" to commit and push.`

## Doing the work

- One job = one branch = one PR.
- Branch from the latest `origin/main`.
- Make the smallest change that fully solves the task.
- Problems found along the way: note them where `CLAUDE.md` says. Don't fix them in this branch.
- Dependencies:
    - Add or upgrade one only when the task needs it, and say why in the PR.
    - Install from the lockfile with the command README names. Change the lockfile only when changing dependencies.
    - Never run a tool that rewrites dependencies on its own (e.g. a forced audit fix).
- Stage files by name (`git add <path>`), never `git add -A` or `git add .`. The repo folder can hold personal files.
- Make small commits, each with a message that says why.
- Never commit before Ken has reviewed the changes. Leave them unstaged, list the changed files, and commit only when he says so. An "approve" to start coding is not an approval to commit.

## Testing

- Run every command README lists under "Before a PR" before opening one. Other checks: only when README says they apply.
- For a bug, add a test that fails before the fix and passes after, where that's feasible.
- Never weaken, skip, delete or rewrite a test just to make it pass. If a test looks wrong, say so and ask Ken.
- When the app or API can be run, check the change there too, not only in the unit tests.
- Report only what actually ran: the commands and their results. Say plainly what wasn't tested, and why.

## When to stop and ask Ken

- The task is unclear, or it needs a decision on product, money, data or direction.
- 3 attempts have failed (the ladder in `code-style.md`, "When something doesn't work").
- You can't reproduce the bug, can't run the tests, or can't verify the fix.
- The branch conflicts with `main`, or another open branch changes the same code.
- The change touches any of these:
    - database schema, content types or migrations
    - login, permissions or security
    - API response shapes (live apps depend on them)
    - payments or billing
    - dependency major upgrades
    - CI or deploy workflows
    - env variables or server config
    - crons, agents, or anything else that contacts users
    - deleting data, or files that production or Ken's local setup uses

## Changes to a live server file

When a fix needs a change to a file on a live server (for example the nginx site config), Ken applies it himself. Prepare the change and the exact steps.

## The pull request

- **When to open one:** once per job, when the job is done and Ken says "approve". Changes agreed along the way collect on the job's branch; don't push or open a PR for each one.
- **One concern per PR:** a PR holds only changes for its own job. Something unrelated found along the way (e.g. a bug in another feature) is a separate job: note it (see "Doing the work"), never fold it in.
- **The PR description, in this order:**
    1. **What and why:** 2–3 lines.
    2. **Live impact:** who could be affected, and what you checked.
    3. **Tested:** the commands and their results.
    4. **Not tested:** what, and why.
    5. **Before you merge:** everything that happens on live at merge, or "nothing special". That covers the deploy itself, migrations, schema changes, new env variables and crons.
    6. **How to undo:** revert the PR, plus any extra step.
- If the branch fell behind `main`, merge `origin/main` into it (no rebase: on a pushed branch that needs a force-push) and run the checks again before asking for review.

## Finishing (housekeeping)

- Delete what the task made that neither production nor future work needs: scratch scripts, debug output, temporary data, one-off docs.
- Commit only files that production or future work uses. Tests and reusable scripts count.
- Stop the servers and background jobs you started.
- Deleting files you didn't create: see "Irreversible actions" in `safety.md`.
- Branches:
    - Delete a branch once it's merged, locally and on GitHub.
    - Ask before deleting an unmerged branch.
    - Never delete `main`.
