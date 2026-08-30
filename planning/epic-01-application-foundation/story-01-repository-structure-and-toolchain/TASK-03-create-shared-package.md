# Task 1.1.3 — Create the shared package

**Status:** Complete — 2026-08-30
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

## Outcome

`packages/shared` exists as `@marketpulse/shared` — private, `"type": "module"`, ESM-only — and builds to `dist/` with declarations, declaration maps and source maps.

### The first domain type

`Ticker` is a branded string: `string & { readonly [brand]: "Ticker" }`, where `brand` is a `unique symbol` that exists only in the type system and is erased at runtime. A raw `string` cannot reach a function expecting a `Ticker` without passing through `toTicker`, which validates and throws, or `isTicker`, which narrows.

It is named `Ticker`, not `Symbol`, only to avoid shadowing the global. The domain word stays "symbol"; the type name is `Ticker`.

Validation is a format check and nothing more — `/^[A-Z]{1,5}(\.[A-Z])?$/`, matching Alpaca's US-equity shape including share classes (`BRK.B`). Whether a ticker is actually *listed* is a question for the security universe in Epic 2, not for a string predicate.

Throwing in `toTicker` is deliberate at this boundary: a malformed ticker is an ingestion or programming error, not a market condition the UI should degrade around.

### The three things that would have cost a search

All three were predicted by Task 1.1.2 and all three held:

* **`"type": "module"` is load-bearing.** Without it every export fails under `verbatimModuleSyntax`.
* **Relative imports carry `.js` extensions from `.ts` files** — `./ticker.js`, not `./ticker`. `nodenext` resolution wants the *emitted* filename. `src/index.ts` carries a comment saying so.
* **`tsconfig.tsbuildinfo` lands next to the tsconfig, not in `dist/`.** Confirmed by `git status --ignored`; `*.tsbuildinfo` is now in `.gitignore`.

### The exports map

```json
"exports": { ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" } }
```

`types` first, as `nodenext` requires. There is no `main` and no `typesVersions` — under this resolution mode they are ignored, so a wrong `exports` map fails loudly rather than degrading to a legacy fallback. That is the behaviour we want.

Verified against a throwaway consumer outside the workspace: `tsc --noEmit` resolved `Ticker`, `toTicker` and `isTicker` through the package root and correctly rejected `const bad: Ticker = "AAPL"`, while Node executed the same import at runtime. Task 1.1.4 verifies it in place.

### Scripts

`build` is `tsc -b`, `clean` is `tsc -b --clean`, `lint` is a placeholder until Task 1.1.5.

`typecheck` is `tsc --noEmit -p tsconfig.json`, which is fine *here* because `shared` references nothing. TypeScript 6 permits `--noEmit` on a composite project, so no `emitDeclarationOnly` workaround is needed. Consumers are the constrained case: they can only be typechecked this way once `packages/shared/dist/*.d.ts` exists. Task 1.1.7 has to encode that ordering.

### Approach note, settled

Project references with built output stayed. The one friction is the build-before-typecheck ordering, exactly as measured in Task 1.1.2 — no new surprises appeared at real use. Exporting raw source remains the fallback if that ordering becomes painful once apps exist.
