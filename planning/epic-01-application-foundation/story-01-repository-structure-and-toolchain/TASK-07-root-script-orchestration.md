# Task 1.1.7 — Root script orchestration

**Status:** Not started
**Story:** [1.1 Repository Structure & TypeScript Toolchain](STORY.md)
**Depends on:** Task 1.1.6

## Objective

Deliver the story's consistent-scripts criterion: the same verbs mean the same thing in every package, and all of them run from the root.

## Work

- Ensure every package exposes the same script names where applicable: `dev`, `build`, `test`, `lint`, `typecheck`, `clean`. All three packages now have real `build`, `typecheck`, `lint`, `lint:fix` and `clean` scripts — the `lint` placeholder is gone as of Task 1.1.5. None has `dev` or `test` — add whatever placeholders the convention requires. `dev` is the one that cannot be a placeholder for long: the backend's arrives in Story 1.2 and the frontend's in Story 1.3. Decide whether `lint:fix` is part of the convention or an extra; it exists in all three today
- Add root scripts that fan out across the workspace, respecting dependency order so `packages/shared` builds before its consumers. `build` has the same shape as `typecheck` here: each app's `tsc -b` already builds `packages/shared` itself, so `pnpm -r run build` is correct but redundant. A single root `tsc -b` over the app projects is the simpler thing that does exactly the right amount of work
- **`lint` should not fan out either, for a different reason.** Each package's script is `eslint .` resolving the single root config, so `pnpm -r run lint` starts three ESLint processes that each build their own typescript-eslint project service over the same solution — three times the setup for the same result. A root `eslint .` covers the whole workspace in one process; measured at ~0.85 s warm in Task 1.1.5. Keep the per-package scripts for working on one package, but make the root script the direct call, not the fan-out
- **Consolidate the TypeScript pin — but the reasoning recorded here was wrong, so re-decide rather than execute it.** `typescript@6.0.3` is still declared in four places (the root and all three packages). This bullet previously asserted that each package genuinely needs its own declaration, because pnpm's strict linking puts `tsc` on a package's path only if that package depends on it. **That is false, and Task 1.1.5 disproved it directly**: pnpm puts the workspace root's `node_modules/.bin` on the PATH of _every_ workspace package script, and a throwaway package declaring no `typescript` at all resolved `tsc` from the root `.bin` at the correct version 6.0.3. So there are two real options, not one:
  - **Root-only.** Drop `typescript` from all three packages and rely on the root declaration — which is exactly what Task 1.1.5 did for ESLint, and consistency with that is a genuine argument. Cheapest, and the version then lives in one place by construction.
  - **Catalog.** Keep the declarations but make them `"typescript": "catalog:"` with the version in `pnpm-workspace.yaml`. More ceremony, but the packages stay self-describing — a reader of `apps/backend/package.json` can still see that it needs TypeScript, and the package does not silently depend on a root that happens to hoist.
    The trade is self-description against ceremony; pick one and apply it to ESLint too, so the workspace has a single rule rather than two conventions. What must not survive is the version living in four editable places, because Task 1.1.2's ceiling has a documented expiry — _raise the pin when typescript-eslint admits TS 7_ — and a four-place edit is one that gets done partially. Same treatment for any other dependency that ends up everywhere
- **`typecheck` is the one verb that cannot simply fan out.** Consumers typecheck against `packages/shared/dist/*.d.ts`, so an independent per-package `--noEmit` pass either fails (no declarations yet) or silently passes against stale ones. Root `typecheck` should therefore be a solution-wide `tsc -b`, which typechecks by building in dependency order, rather than `pnpm -r run typecheck`. Decide at the same time whether the per-package `typecheck` scripts stay: `packages/shared`'s `tsc --noEmit -p tsconfig.json` is correct only because shared references nothing, and keeping a script whose meaning differs per package undercuts the consistency this task exists to deliver. Task 1.1.4 made this concrete rather than hypothetical: both apps set `typecheck` to `tsc -b` because `--noEmit` provably passes against stale declarations there (exit 0 on a rename that `tsc -b` catches), while shared kept `--noEmit`. That divergence was left in place deliberately for this task to resolve
- Make sure a failure in any package fails the root script with a non-zero exit code
- Add a single `verify` (or equivalent) script running typecheck, lint, format check and build — the command CI will run in Story 1.10. Order it so the build happens before lint. Type-aware linting reads the same project graph as `tsc`, but it does **not** share typecheck's silent-staleness failure: Task 1.1.5 verified that with `packages/shared/dist` deleted entirely, lint on `apps/backend` returned the _identical_ findings it returns on a built tree, and an unresolved cross-package type surfaces as a `no-unsafe-*` error rather than a false pass. So lint on an unbuilt tree errs toward noise, not toward false confidence — which is the safe direction, but still a reason to build first once the tree is big enough for that noise to bury a real finding

## Done when

- Each of `build`, `lint` and `typecheck` runs from the root across all packages
- Build ordering respects the shared package dependency
- Root `typecheck` catches a cross-package type error on a tree where `dist/` does not exist — the case an independent fan-out gets wrong
- A failure anywhere surfaces as a root-level failure
- Script names are identical across packages

## Notes

`test` can be a passing placeholder at this point; Story 1.9 makes it real. Leave the script name in place now so the convention is set.

Task 1.1.3 flagged this ordering constraint forward twice. This is where it gets encoded — if it is not solved here, it resurfaces as a confusing CI failure in Story 1.10.
