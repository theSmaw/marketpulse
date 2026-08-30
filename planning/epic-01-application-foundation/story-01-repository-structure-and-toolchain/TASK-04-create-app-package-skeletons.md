# Task 1.1.4 — Create the app package skeletons

**Status:** Complete — 2026-08-30
**Story:** [1.1 Repository Structure & TypeScript Toolchain](STORY.md)
**Depends on:** Task 1.1.3

## Objective

Create `apps/backend` and `apps/frontend` as minimal typed packages that consume the shared package. Placeholders only — the real server and React application are Stories 1.2 and 1.3.

## Work

* Create both packages with private `package.json` files, each with `"type": "module"` — same hard requirement as Task 1.1.3, for the same reason
* Extend `tsconfig.base.json` in each, adding a project reference to `packages/shared`
* Apply package-appropriate overrides — Node types for the backend, DOM library for the frontend. Module resolution is inherited; only override it if a package genuinely needs to differ
* Install `@types/node` for the backend. Without it, `node:` imports fail as `TS2591 — Cannot find name 'node:fs'`, which reads like a typo rather than a missing `@types` package. Task 1.1.2 lost time to exactly this
* The frontend's `target`/`lib` override belongs to Story 1.3, which settles the browser baseline. Adding `"dom"` here means overriding `lib` wholesale (the base config leaves `lib` unset so it follows `target`) — keep that override minimal and expect Story 1.3 to revisit it
* Add a minimal `src/index.ts` to each that imports `Ticker`/`toTicker` from `@marketpulse/shared`, proving the dependency resolves. Relative imports inside these packages need explicit `.js` extensions
* **Build `packages/shared` before typechecking either app.** With built output, a consumer typechecks against `packages/shared/dist/*.d.ts`, so a consumer `tsc --noEmit -p` fails outright until that exists. `tsc -b` from the consumer resolves it by building the reference first — prefer it here. Task 1.1.3 confirmed this is the whole of the friction
* Declare the dependency using pnpm's `workspace:` protocol

## Done when

* Both packages typecheck, including the cross-package import
* `pnpm install` links the workspace dependency without network resolution
* Changing a type in `packages/shared` produces a type error in a consuming app when it should — **after shared is rebuilt**; see the note below
* `declarationMap` does its job: "go to definition" on an imported symbol lands in `packages/shared/src`, not in `dist`
* Neither package contains framework code yet

## Notes

The third check is the point of this task: it verifies the wiring end to end, which is exactly what silently breaks later if never tested while trivial.

Run it with `tsc -b`, not `tsc --noEmit`. Because consumers typecheck against emitted declarations rather than source, editing `packages/shared/src` changes nothing for a consumer until shared is rebuilt — a plain `--noEmit` pass will happily report success against stale `.d.ts` files and make the check look like it failed to fire. This staleness is inherent to the project-references decision, not a bug, and it is the single reason Task 1.1.7 cannot fan `typecheck` out across packages independently.

## Outcome

`apps/backend` (`@marketpulse/backend`) and `apps/frontend` (`@marketpulse/frontend`) exist as private, `"type": "module"` packages. Each depends on `@marketpulse/shared` via `workspace:*`, references it as a TypeScript project, and contains a single placeholder `src/index.ts` that imports `toTicker` and `Ticker`. No framework code, no server, no React.

### The staleness trap, demonstrated

The third Done-when check is the point of the task, and it behaves exactly as predicted. Renaming `toTicker` to `parseTicker` in `packages/shared/src` and then, from `apps/backend`:

* `tsc --noEmit -p tsconfig.json` — **exit 0**. It typechecked happily against the stale `dist/index.d.ts` that still exported the old name.
* `tsc -b` — **exit 2**, `TS2724: '"@marketpulse/shared"' has no exported member named 'toTicker'`.

So the wiring works, and `--noEmit` is the wrong instrument for a consumer. This is inherent to project references with built output, not a defect, and it is why both apps set `typecheck` to `tsc -b`.

That leaves `typecheck` meaning two different things across the workspace: `tsc -b` in the apps, `tsc --noEmit -p` in `packages/shared` (where it is safe, because shared references nothing). Deliberately left inconsistent rather than guessed at — **Task 1.1.7 owns the resolution**, and the simplest one is a single solution-wide `tsc -b` at the root.

### `declarationMap` verified

`packages/shared/dist/ticker.d.ts.map` carries `"sources": ["../src/ticker.ts"]`, so an editor jumping to the definition of `toTicker` from either app lands in the shared package's source, not its emitted declarations.

### Per-package overrides, and why each is there

Only four options are overridden between the two apps; everything else is inherited from `tsconfig.base.json`.

* **Backend `"types": ["node"]`** with `@types/node` pinned to `24.13.3` — matching the runtime major, not npm's `latest` (26.x, which types a Node we do not run). Setting `types` explicitly rather than relying on auto-discovery makes the ambient global surface a deliberate list.
* **Frontend `"types": []`** — the empty array is load-bearing. Left unset, TypeScript pulls in every `@types` package it can reach, and pnpm's linking puts `@types/node` within reach of the frontend. Verified: with `types: []`, a file referencing `process` fails with `TS2591`, which is the correct outcome for browser code.
* **Frontend `target`/`lib`** — the base config leaves `lib` unset so it follows `target`, so admitting the DOM means restating the language libraries beside it: `["es2024", "dom", "dom.iterable"]`. Minimal, and Story 1.3 is expected to revisit both when it settles the real browser baseline.

### Also confirmed

* `pnpm install` linked `@marketpulse/shared` as a symlink into each app's `node_modules` with no network resolution for it.
* `tsc -b` from either app builds `packages/shared` first, unprompted — the ordering constraint from Task 1.1.3 costs nothing at the call site.
* `node apps/backend/dist/index.js` runs and prints through the shared import, so the `exports` map resolves at runtime as well as at type level (Task 1.1.3 proved this outside the workspace; this proves it in place).
* Both apps' `dist/` and `tsconfig.tsbuildinfo` are caught by the existing `.gitignore` rules — no new entries needed.
