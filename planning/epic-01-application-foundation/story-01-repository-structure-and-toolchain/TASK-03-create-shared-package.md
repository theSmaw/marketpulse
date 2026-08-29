# Task 1.1.3 — Create the shared package

**Status:** Not started
**Story:** [1.1 Repository Structure & TypeScript Toolchain](STORY.md)
**Depends on:** Task 1.1.2

## Objective

Create `packages/shared` and prove the cross-package wiring works while it is still trivial.

## Work

* Create `packages/shared` with a `package.json` scoped to the project (e.g. `@marketpulse/shared`), private and unpublishable
* Extend `tsconfig.base.json`; enable project-reference output (`composite`, `outDir`, `rootDir`)
* Add `src/index.ts` exporting one or two placeholder domain types — a branded `Symbol`/ticker type is a genuinely useful first entry rather than a throwaway
* Configure the `exports` map to point at built output, with types resolving correctly for consumers
* Add `build`, `typecheck` and `lint` scripts

## Done when

* `packages/shared` builds to declaration output plus JavaScript
* Its `exports` and `types` resolve correctly for a consumer (verified in Task 1.1.4)
* It is marked private

## Approach note

Using **TypeScript project references** with built output, rather than exporting raw `.ts` source. It costs a build step before typechecking consumers, but it behaves identically locally and in CI, gives correct incremental builds, and keeps the backend's `tsc` build honest. If it proves to add more friction than value, exporting source is the fallback — record the change if so.
