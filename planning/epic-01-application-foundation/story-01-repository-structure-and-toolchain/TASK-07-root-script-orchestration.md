# Task 1.1.7 — Root script orchestration

**Status:** Complete — 2026-08-30
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

## Outcome

Six verbs, identical in all three packages, and a root that runs each of them
once rather than three times.

### The script set

`dev`, `build`, `test`, `lint`, `typecheck`, `clean` — the story's list, in that
order in every `package.json`. `lint:fix` is kept as an **extra**, not part of
the convention: it is a local convenience with no root fan-out and no place in
`verify`, so requiring it of future packages would be ceremony. It exists in all
three today because all three have `lint`.

`test` and the apps' `dev` are `echo` placeholders naming the story that makes
them real (1.9 for tests, 1.2 and 1.3 for the two dev servers). They exit 0, so
the root fan-out stays green. `packages/shared`'s `dev` is not a placeholder —
it is `tsc -b --watch`, which is the genuinely correct dev script for a package
whose consumers compile against its emitted declarations.

### Most root scripts do not fan out, and only two genuinely should

| Root script    | Command                | Why not `pnpm -r`                                                                               |
| -------------- | ---------------------- | ----------------------------------------------------------------------------------------------- |
| `build`        | `tsc -b`               | The solution `tsconfig.json` already orders the graph; a fan-out would build shared three times |
| `typecheck`    | `tsc -b`               | Same command as `build`, deliberately — see below                                               |
| `lint`         | `eslint .`             | One process, one typescript-eslint project service, one pass over the whole workspace           |
| `format:check` | `prettier --check .`   | Prettier's unit of work was already the tree (Task 1.1.6)                                       |
| `test`         | `pnpm -r run test`     | Genuinely per-package; this one does fan out                                                    |
| `dev`          | `pnpm -r --parallel …` | Genuinely per-package, and the processes are meant to run concurrently                          |

The new root `tsconfig.json` is a solution file — `files: []` and three
`references`. It does not extend `tsconfig.base.json`: it compiles nothing, so
inheriting compiler options would misrepresent it.

### `typecheck` and `build` are the same command, and that is the honest answer

Both are `tsc -b`, at the root and in every package. Because consumers compile
against `packages/shared/dist/*.d.ts`, typechecking this workspace _is_
building it — there is no cheaper correct pass available, and pretending
otherwise is what produces the stale-declaration false pass Task 1.1.4
documented. `packages/shared`'s `tsc --noEmit -p tsconfig.json` was changed to
`tsc -b` to close that divergence: the verb now means the identical thing in all
three packages, which is the consistency criterion this task exists to deliver.
Keeping both names is worth it anyway — `typecheck` is what a developer reaches
for and what CI will call, and the two can diverge later without renaming
anything.

Verified against the acceptance criterion, on a tree with **no `dist/` and no
`*.tsbuildinfo` anywhere**: removing `toTicker` from `packages/shared`'s public
exports makes root `typecheck` exit 2 with the cross-package error reported in
both apps. Worth recording precisely, because the earlier note slightly
overstates the failure mode — on a tree with no `dist` at all, a per-package
`--noEmit` also catches it (exit 1). The silent pass needs a _stale_ `dist`, not
an absent one. The root `tsc -b` is correct in both cases, which is why it is
the one wired up.

### `verify`

> **The chain took a fifth step on 2026-08-31, in Task 1.4.5.** It is now
> `build && lint && format:check && stories && test`, where `stories` fails if a
> component under `apps/frontend/src/components/` has no sibling stories file,
> and `build` also produces the Storybook bundle. Nothing below is wrong — it is
> what this task wired, and the reasoning about ordering and about `typecheck`
> being the same command as `build` is unchanged. The current definition lives
> in the root `package.json`; do not maintain a copy here.

`build && lint && format:check && test`, sequential with `&&`, so the first
failure is the exit code. Build first, as specified. `typecheck` is not listed
separately only because it is the same command as `build`; running it twice
would be a no-op against the fresh `.tsbuildinfo`.

Failure propagation checked end to end: a package `test` exiting 3 surfaces as
`ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL` and root exit 3; an unformatted file fails
`verify` at `format:check` with exit 1.

### TypeScript is now root-only, like ESLint and Prettier

The four-place `typescript@6.0.3` pin is one place. All three packages dropped
their `typescript` devDependency and resolve `tsc` from the root
`node_modules/.bin`, exactly as Task 1.1.5 proved they could — confirmed again
here, `pnpm exec tsc --version` reports 6.0.3 from both `apps/frontend` and
`packages/shared` with neither declaring it.

Catalog was the alternative and was rejected: it keeps packages self-describing
but adds a second convention alongside the root-only tools, and the workspace is
better off with one rule — **shared tooling lives at the root; packages declare
only what they actually import**. `@types/node` accordingly stays in
`apps/backend`, because it is a real type dependency of that package's code, not
a tool.

The documented expiry in Task 1.1.2 — raise the pin when typescript-eslint
admits TS 7 — is now a one-line edit rather than a four-file edit that gets done
partially.

### One thing the root scripts broke, and the fix

`eslint .` and `prettier .` at the root walk into `.claude/worktrees/`, which
holds git worktrees — entire second checkouts of this repository nested inside
it. The first root `verify` run reported eight errors from another branch's
unbuilt tree. Both ignore lists now carry `.claude/worktrees/`, with a comment
in each pointing at the other. This is a cost of root-level tooling that the
per-package scripts did not have; anything else that nests a checkout inside the
repo needs the same treatment.
