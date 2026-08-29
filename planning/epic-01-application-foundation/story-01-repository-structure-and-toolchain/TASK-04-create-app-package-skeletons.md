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
* Add a minimal `src/index.ts` to each that imports a type from `@marketpulse/shared`, proving the dependency resolves. Relative imports inside these packages need explicit `.js` extensions
* Declare the dependency using pnpm's `workspace:` protocol

## Done when

* Both packages typecheck, including the cross-package import
* `pnpm install` links the workspace dependency without network resolution
* Changing a type in `packages/shared` produces a type error in a consuming app when it should
* Neither package contains framework code yet

## Notes

That last check is the point of this task: it verifies the wiring end to end, which is exactly what silently breaks later if never tested while trivial.
