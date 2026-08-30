# Task 1.1.7 — Root script orchestration

**Status:** Not started
**Story:** [1.1 Repository Structure & TypeScript Toolchain](STORY.md)
**Depends on:** Task 1.1.6

## Objective

Deliver the story's consistent-scripts criterion: the same verbs mean the same thing in every package, and all of them run from the root.

## Work

* Ensure every package exposes the same script names where applicable: `dev`, `build`, `test`, `lint`, `typecheck`, `clean`. `packages/shared` already has `build` (`tsc -b`), `clean` (`tsc -b --clean`), `typecheck` and a `lint` placeholder, but no `dev` or `test` — add whatever placeholders the convention requires
* Add root scripts that fan out across the workspace, respecting dependency order so `packages/shared` builds before its consumers
* **`typecheck` is the one verb that cannot simply fan out.** Consumers typecheck against `packages/shared/dist/*.d.ts`, so an independent per-package `--noEmit` pass either fails (no declarations yet) or silently passes against stale ones. Root `typecheck` should therefore be a solution-wide `tsc -b`, which typechecks by building in dependency order, rather than `pnpm -r run typecheck`. Decide at the same time whether the per-package `typecheck` scripts stay: `packages/shared`'s `tsc --noEmit -p tsconfig.json` is correct only because shared references nothing, and keeping a script whose meaning differs per package undercuts the consistency this task exists to deliver
* Make sure a failure in any package fails the root script with a non-zero exit code
* Add a single `verify` (or equivalent) script running typecheck, lint, format check and build — the command CI will run in Story 1.10

## Done when

* Each of `build`, `lint` and `typecheck` runs from the root across all packages
* Build ordering respects the shared package dependency
* Root `typecheck` catches a cross-package type error on a tree where `dist/` does not exist — the case an independent fan-out gets wrong
* A failure anywhere surfaces as a root-level failure
* Script names are identical across packages

## Notes

`test` can be a passing placeholder at this point; Story 1.9 makes it real. Leave the script name in place now so the convention is set.

Task 1.1.3 flagged this ordering constraint forward twice. This is where it gets encoded — if it is not solved here, it resurfaces as a confusing CI failure in Story 1.10.
