# Story 1.3 — Frontend Application Shell

**Status:** Not started
**Epic:** [Epic 1 — Application Foundation](../EPIC.md)
**Depends on:** Story 1.1
**Epic scope covered:** React application shell

## Description

A React + TypeScript application that builds, runs in development with fast refresh, and renders a placeholder shell. No routing, no styling system, no state management yet — those arrive in Stories 1.4, 1.5 and Epic 2.

## Open decisions

- Build tool — Vite is the default assumption unless there is a reason to differ
- **What `build` means for this package once a bundler exists.** Today it is `tsc -b`, identical in all three packages, and the six-verb convention from Task 1.1.7 says a verb means the same thing everywhere. Vite makes that awkward: `vite build` emits static assets but does no typechecking, and `tsc -b` typechecks but emits the wrong artefact for a browser. The usual answer is `tsc -b && vite build`, which keeps the verb honest — decide it deliberately here rather than letting the two drift apart, and keep `typecheck` as the `tsc -b` half

## What Story 1.1 hands this story, and what it will break

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

## Notes

Redux and RxJS are deliberately _not_ introduced here. Per PRODUCT_SPEC.md §25, add them when there is state and streaming to justify them — Epics 2 and 3.
