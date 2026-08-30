# Task 1.1.7 — Root script orchestration

**Status:** Not started
**Story:** [1.1 Repository Structure & TypeScript Toolchain](STORY.md)
**Depends on:** Task 1.1.6

## Objective

Deliver the story's consistent-scripts criterion: the same verbs mean the same thing in every package, and all of them run from the root.

## Work

* Ensure every package exposes the same script names where applicable: `dev`, `build`, `test`, `lint`, `typecheck`, `clean`. All three packages now have `build`, `typecheck`, `clean` and a `lint` placeholder; none has `dev` or `test` — add whatever placeholders the convention requires. `dev` is the one that cannot be a placeholder for long: the backend's arrives in Story 1.2 and the frontend's in Story 1.3
* Add root scripts that fan out across the workspace, respecting dependency order so `packages/shared` builds before its consumers. `build` has the same shape as `typecheck` here: each app's `tsc -b` already builds `packages/shared` itself, so `pnpm -r run build` is correct but redundant. A single root `tsc -b` over the app projects is the simpler thing that does exactly the right amount of work
* **Consolidate the TypeScript pin.** `typescript@6.0.3` is now declared in four places — the root and all three packages — and each package genuinely needs it, because pnpm's strict linking means `tsc` is only on a package's path if that package depends on it. Removal is not the fix; a pnpm `catalog:` entry in `pnpm-workspace.yaml` is, so the four declarations become `"typescript": "catalog:"` and the version lives in one place. This matters because Task 1.1.2's version ceiling has a documented expiry — *raise the pin when typescript-eslint admits TS 7* — and a four-place edit is one that gets done partially. Do the same for any other dependency that ends up in every package
* **`typecheck` is the one verb that cannot simply fan out.** Consumers typecheck against `packages/shared/dist/*.d.ts`, so an independent per-package `--noEmit` pass either fails (no declarations yet) or silently passes against stale ones. Root `typecheck` should therefore be a solution-wide `tsc -b`, which typechecks by building in dependency order, rather than `pnpm -r run typecheck`. Decide at the same time whether the per-package `typecheck` scripts stay: `packages/shared`'s `tsc --noEmit -p tsconfig.json` is correct only because shared references nothing, and keeping a script whose meaning differs per package undercuts the consistency this task exists to deliver. Task 1.1.4 made this concrete rather than hypothetical: both apps set `typecheck` to `tsc -b` because `--noEmit` provably passes against stale declarations there (exit 0 on a rename that `tsc -b` catches), while shared kept `--noEmit`. That divergence was left in place deliberately for this task to resolve
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
