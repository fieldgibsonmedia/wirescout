# Code style

Core rule, adapted for Wirescout. Last edited: 2026-10-27.

## Keep it simple

- Write for the human who maintains it next: a block should be understandable in under 30 seconds.
- Make the smallest diff:
    - Extend the existing code instead of restructuring it.
    - Keep existing function bodies unless a refactor is asked for.
- One concern per change.
- Nothing outside the task: no drive-by refactors, renames, reformatting or "improvements".
- No defensive layers, helpers or abstractions the task doesn't need.

## Names and comments

- Use descriptive names. Never abbreviate domain variables: write `query`, not `q`.
- Make code shorter by simplifying it, not by shortening names.
- Comment only where the "why" isn't obvious, and match the density of the comments around it.

## Fit the codebase

- Follow the repo's existing patterns, and put things where their kind already lives. Example: constants go next to the other constants.
- Fix at the right layer, where the data is created or filtered, not with patches further down.
- Before changing shared code (middleware, utils), check every caller.

## When something doesn't work

One ladder:

1. 2 failed attempts on the same approach: remove it completely, go back to the last good version, and try a different approach.
2. 3 failed attempts in total, whatever the approach: stop, go back to the last good version, and ask Ken, saying what you tried.

- After editing a long or fragile file, check it right away before the next edit: run the project's lint or a syntax check, or start the app.
