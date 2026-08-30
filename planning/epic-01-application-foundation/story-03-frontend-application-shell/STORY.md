# Story 1.3 — Frontend Application Shell

**Status:** Not started
**Epic:** [Epic 1 — Application Foundation](../EPIC.md)
**Depends on:** Story 1.1
**Epic scope covered:** React application shell

## Description

A React + TypeScript application that builds, runs in development with fast refresh, and renders a placeholder shell. No routing, no styling system, no state management yet — those arrive in Stories 1.4, 1.5 and Epic 2.

## Open decisions

Both are settled in **Task 1.3.1**, before any application code exists, and recorded as an ADR in Task 1.3.5.

- Build tool — Vite is the default assumption unless there is a reason to differ
- **What `build` means for this package once a bundler exists.** Today it is `tsc -b`, identical in all three packages, and the six-verb convention from Task 1.1.7 says a verb means the same thing everywhere. Vite makes that awkward: `vite build` emits static assets but does no typechecking, and `tsc -b` typechecks but emits the wrong artefact for a browser. The usual answer is `tsc -b && vite build`, which keeps the verb honest — decide it deliberately here rather than letting the two drift apart, and keep `typecheck` as the `tsc -b` half
- A third decision the tasks surfaced and the story did not: **`tsc` and Vite both default to writing into `apps/frontend/dist`**, and `tsc -b --clean` knows about only one of them. Two producers and one directory is a `clean` that quietly lies, so Task 1.3.1 settles the layout and Task 1.3.4 proves it empirically

## Conventions from Story 1.1

Story 1.1 is complete, and these four bind this story. They are stated in every Epic 1 story so each one can be read on its own; the full reasoning is in `docs/adr/0001-repository-structure-and-typescript-toolchain.md`.

- **`pnpm verify` is the acceptance command** — `build && lint && format:check && test`, chained with `&&` so the first failure is the exit code. This story passes it from the repository root. Prettier owns Markdown as well as code, so an unformatted planning document fails it too
- **Six verbs, identical in every package** — `dev`, `build`, `test`, `lint`, `typecheck`, `clean`. Only `test` and `dev` fan out with `pnpm -r`; the rest run their tool once from the root, because the reference graph and ESLint's project service already cover the workspace in one pass. Changing what a verb means in one package means changing it everywhere, or saying why not
- **Shared tooling lives at the workspace root; packages declare only what they actually import.** ESLint, Prettier and TypeScript are root-only devDependencies, and pnpm puts the root's `node_modules/.bin` on every package script's PATH. A library the code imports belongs in the package that imports it — `@types/node` in `apps/backend` is the counter-example that keeps the rule from being over-applied
- **The module setup is ESM-only and single-file-safe** — `"type": "module"`, `module: nodenext`, `isolatedModules`, `verbatimModuleSyntax`, and relative imports carrying `.js` extensions from `.ts` files (TS2835 without one). `packages/shared` is consumed as **built output**, so it must be built before any consumer can be typechecked; `tsc -b` orders that itself, which is why `typecheck` and `build` are the same command

Two more things that are true today and will not be forever. Until Story 1.9 lands, **`pnpm test` passes because there are no tests** — all three `test` scripts are `echo` placeholders that exit 0. Until Stories 1.2 and 1.3 land, both apps' `dev` scripts are placeholders too; only `packages/shared`'s (`tsc -b --watch`) is real.

## What that means for this story

- **`apps/frontend`'s `dev` script is an `echo` placeholder that names this story.** Replacing it is part of the work. Root `pnpm dev` is `pnpm -r --parallel run dev` and already runs it
- **This is where the install-script policy fires.** Task 1.1.1 set `allowBuilds` in `pnpm-workspace.yaml` as an allowlist, and an un-allowlisted dependency with an install script is a **hard install failure (exit 1)**, not a warning. Nothing installed so far has one; esbuild, arriving with Vite, is the predicted first. Allowlist esbuild specifically — never disable the check. It will fail CI as readily as it fails locally
- **Do not remove `types: []` from `apps/frontend/tsconfig.json`.** It looks redundant and is not: without it TypeScript auto-discovers every reachable `@types` package, and pnpm's linking puts `@types/node` in reach, so `process` would typecheck in browser code. Adding React's types means adding them to that array, not emptying it
- **A `vite.config.ts` is not covered by any package's tsconfig**, so type-aware linting cannot run on it and will error if asked to. `eslint.config.mjs` already carries exactly this pattern for itself — a trailing config block applying `tseslint.configs.disableTypeChecked`. Extend that block rather than rediscovering the problem
- The same file makes the ESLint `globals` blocks live for the first time. They are inert on today's all-TypeScript tree because `no-undef` is off for `.ts` files, and they exist precisely for the per-package JS tooling this story brings — see ADR 0001 §8
- Relative imports carry `.js` extensions from `.ts` files (`./App.js` importing `./App.tsx`). `nodenext` resolution requires the emitted filename; Vite tolerates it, and dropping it fails `tsc` with TS2835
- Vite is a tool, so it is declared at the workspace root under the rule settled in Task 1.1.7 — but React, React DOM and their `@types` are imported by this package's code and belong in `apps/frontend`. The rule is easy to over-apply in exactly this story

## Acceptance criteria

- Development server runs with hot module replacement
- Application renders a placeholder shell in the browser
- Production build emits static assets
- **`pnpm verify` passes from the repository root** — build, lint, format:check, test, in that order. The original criterion said "typecheck and lint pass for the frontend package", which is now the weaker check: `verify` is the one CI runs and the one Story 1.1 established as the single acceptance command
- Browser target is documented (desktop-first per PRODUCT_SPEC.md §3), and `apps/frontend/tsconfig.json`'s `target`/`lib` overrides updated to match it — they are two of the four compiler options the apps are permitted to override, and were left provisional for this story

## Tasks

Tackled in order. The story is complete when all five are done.

| #     | Task                                                                                             | Status      |
| ----- | ------------------------------------------------------------------------------------------------ | ----------- |
| 1.3.1 | [Vite bootstrap and the browser baseline](TASK-01-vite-bootstrap-and-browser-baseline.md)        | Not started |
| 1.3.2 | [React, JSX and the placeholder shell](TASK-02-react-jsx-and-placeholder-shell.md)               | Not started |
| 1.3.3 | [Development mode: fast refresh and the root dev loop](TASK-03-development-mode-fast-refresh.md) | Not started |
| 1.3.4 | [Production build and static assets](TASK-04-production-build-and-static-assets.md)              | Not started |
| 1.3.5 | [Verify the story end to end and document](TASK-05-verify-and-document.md)                       | Not started |

Each task leaves the repository installable, typechecking and passing `pnpm verify`, so the tree is never broken between tasks — the same rule Stories 1.1 and 1.2 followed.

The split is toolchain-first on purpose. Task 1.3.1 stops deliberately short of React, so that every failure in it has exactly one candidate cause; Task 1.3.2 adds rendering and Task 1.3.3 adds hot reloading as separate steps, because they are separate mechanisms and a fault in one should not look like a fault in the other. Story 1.2 ordered its watcher second for the opposite reason — a server is easier to build against a restarting loop — which does not apply here: Vite's dev server exists from the first task, and only _fast refresh_ is deferred.

The five acceptance criteria map onto tasks 1.3.3, 1.3.2, 1.3.4, all of them (`pnpm verify` is a "done when" on every task) and 1.3.1 respectively. Task 1.3.5 runs all five together from a clean build rather than trusting each task's own claim.

## Notes

Redux and RxJS are deliberately _not_ introduced here. Per PRODUCT_SPEC.md §25, add them when there is state and streaming to justify them — Epics 2 and 3.
