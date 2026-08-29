# Task 1.1.3 — Create the shared package

**Status:** Not started
**Story:** [1.1 Repository Structure & TypeScript Toolchain](STORY.md)
**Depends on:** Task 1.1.2

## Objective

Create `packages/shared` and prove the cross-package wiring works while it is still trivial.

## Work

* Create `packages/shared` with a `package.json` scoped to the project (e.g. `@marketpulse/shared`), private and unpublishable
* **Set `"type": "module"`.** Not optional: Task 1.1.2 chose `module: nodenext` with `verbatimModuleSyntax`, and without it every export in the package fails with `TS1295`/`TS1287` (verified)
* Extend `tsconfig.base.json`; enable project-reference output (`composite`, `outDir`, `rootDir`). `composite` is inherited from the base config — set only the paths here
* Add `src/index.ts` exporting one or two placeholder domain types — a branded `Symbol`/ticker type is a genuinely useful first entry rather than a throwaway
* **Relative imports need explicit `.js` extensions** — `import { x } from "./types.js"` from `types.ts`. `nodenext` enforces this (`TS2835`, verified). It looks wrong and is correct; a comment saying so will save the next person a search
* Configure the `exports` map to point at built output, with types resolving correctly for consumers. Under `moduleResolution: nodenext` the `types` condition must come **first** in each entry, and legacy `main`/`typesVersions` fallbacks are ignored — so a wrong `exports` map fails outright rather than silently degrading
* Add `*.tsbuildinfo` to `.gitignore`. This is the first `composite` package, so it is the first point the file appears — and it lands next to the tsconfig as `tsconfig.tsbuildinfo`, **not** inside `dist/`, so the existing `dist/` rule does not catch it (verified)
* Add `build`, `typecheck` and `lint` scripts. See Task 1.1.7 before deciding what `typecheck` runs — with project references it cannot be a plain `--noEmit` pass over the whole tree

## Done when

* `packages/shared` builds to declaration output plus JavaScript
* Its `exports` and `types` resolve correctly for a consumer (verified in Task 1.1.4)
* It is marked private

## Approach note

Using **TypeScript project references** with built output, rather than exporting raw `.ts` source. It costs a build step before typechecking consumers, but it behaves identically locally and in CI, gives correct incremental builds, and keeps the backend's `tsc` build honest. If it proves to add more friction than value, exporting source is the fallback — record the change if so.

That cost is now measured rather than predicted. Task 1.1.2 confirmed it end to end on a throwaway two-project fixture: `tsc -b` builds in dependency order and catches a cross-package error, and a consumer can be typechecked on its own with `tsc --noEmit -p` **only after** this package's `dist/*.d.ts` exists. That is the whole friction — one ordering constraint, not a class of surprises. It does not change the approach, but Task 1.1.7 has to encode it.
