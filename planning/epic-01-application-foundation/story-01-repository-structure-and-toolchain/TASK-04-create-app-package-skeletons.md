# Task 1.1.4 — Create the app package skeletons

**Status:** Not started
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
