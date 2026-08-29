# Task 1.1.7 — Root script orchestration

**Status:** Not started
**Story:** [1.1 Repository Structure & TypeScript Toolchain](STORY.md)
**Depends on:** Task 1.1.6

## Objective

Deliver the story's consistent-scripts criterion: the same verbs mean the same thing in every package, and all of them run from the root.

## Work

* Ensure every package exposes the same script names where applicable: `dev`, `build`, `test`, `lint`, `typecheck`
* Add root scripts that fan out across the workspace, respecting dependency order so `packages/shared` builds before its consumers
* Make sure a failure in any package fails the root script with a non-zero exit code
* Add a single `verify` (or equivalent) script running typecheck, lint, format check and build — the command CI will run in Story 1.10

## Done when

* Each of `build`, `lint` and `typecheck` runs from the root across all packages
* Build ordering respects the shared package dependency
* A failure anywhere surfaces as a root-level failure
* Script names are identical across packages

## Notes

`test` can be a passing placeholder at this point; Story 1.9 makes it real. Leave the script name in place now so the convention is set.
