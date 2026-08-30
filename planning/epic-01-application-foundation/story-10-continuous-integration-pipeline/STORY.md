# Story 1.10 — Continuous Integration Pipeline

**Status:** Not started
**Epic:** [Epic 1 — Application Foundation](../EPIC.md)
**Depends on:** Story 1.9
**Epic scope covered:** CI pipeline

## Description

Automated verification on every change, so the repository stays green and the portfolio audience sees a maintained project rather than a snapshot.

## Prerequisite — resolved

This story previously opened by saying the repository had no remote and that a hosted origin was needed first. That is no longer true: `origin` is `github.com/theSmaw/marketpulse`, and Story 1.1 was delivered through pull requests against it. The prerequisite is met; the default CI provider assumption below is now the obvious one rather than a guess.

## Acceptance criteria

- Pipeline runs on push and on pull request
- **The pipeline's verification step is `pnpm verify` and nothing else.** Story 1.1.7 wired it as `build && lint && format:check && test`, chained with `&&` so the first failure is the exit code, and Task 1.1.8 confirmed it exits 0 from a clean clone in about four seconds. Re-listing the individual tools in a workflow file forks the definition of "verified" between CI and the developer's machine, which is the specific failure this story exists to prevent
- **Formatting is part of verification, and this story's criteria previously omitted it.** `format:check` has been in `verify` since Task 1.1.7 and Prettier owns Markdown as well as code, so an unformatted `planning/` document fails CI exactly as an unformatted `.ts` file does. That is intended
- The pipeline pins the toolchain the same way local machines do: Node from `.nvmrc` (24.20.0 — `engineStrict` makes pnpm refuse any other major) and pnpm from `package.json`'s `packageManager` field via `corepack enable`. Do not install pnpm separately in the workflow; the pin is the point
- A failure in any stage fails the pipeline visibly
- Dependency and build caching keep runtimes reasonable — the pnpm **store**, not `node_modules`. Task 1.1.8 measured a cold install from an empty store at under a second once the packages are fetched, so cache the store and let pnpm link
- Status is visible from the repository
- The pipeline runs from a clean environment, catching anything that only works locally. Task 1.1.8 already did this by hand — clean clone, empty pnpm store, empty `COREPACK_HOME` — so a CI failure that a clean local clone does not reproduce points at the workflow, not the repository

## What CI going green will and will not mean

**`pnpm test` currently means "no tests exist", not "tests pass."** All three packages' `test` scripts are `echo` placeholders that exit 0 until Story 1.9. This story is what puts that green tick on a pull request, where it is indistinguishable from passing coverage.

Story 1.9 is a dependency for exactly this reason, so by the time the badge exists the tick should be real. If this story ships first for any reason, say so on the badge or in the workflow name — do not let a placeholder read as coverage.

Note also that `verify` covers three packages, not two: `apps/backend`, `apps/frontend` and `packages/shared`. The wording "both packages" predates `packages/shared` existing.

## Open decisions

- CI provider — GitHub Actions is the default assumption
