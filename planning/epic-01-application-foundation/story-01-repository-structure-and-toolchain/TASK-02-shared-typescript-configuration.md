# Task 1.1.2 — Shared TypeScript configuration

**Status:** Complete — 2026-08-29
**Story:** [1.1 Repository Structure & TypeScript Toolchain](STORY.md)
**Depends on:** Task 1.1.1

## Objective

Define the single strict TypeScript baseline that every package extends.

## Work

* Create `tsconfig.base.json` at the root
* Enable `strict`, plus the checks strict does not include — `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`
* Enable `isolatedModules` and `verbatimModuleSyntax` so the config survives bundler-based builds
* Set `composite: true` and `declaration: true` to support project references
* Choose and record module/target settings appropriate to Node and the browser respectively, leaving package-specific overrides to each package — Task 1.1.1 pinned **Node 24.20.0**, so the backend can target a modern baseline rather than a defensive one, and `module`/`moduleResolution` of `nodenext` is available. The frontend's target is driven by the browser baseline, which Story 1.3 settles; keep it out of the base config.

## Done when

* `tsconfig.base.json` exists and is the only place shared compiler options are defined
* Strictness settings are deliberate, with a short comment on any non-obvious choice
* No package duplicates options already set in the base config

## Notes

`noUncheckedIndexedAccess` is worth the friction in this project specifically: much of the codebase indexes into arrays of bars, quotes and time-series points where an out-of-range access is a real bug, not a hypothetical one.

## Outcome

`tsconfig.base.json` exists at the root. `typescript` is a root devDependency (`pnpm add -Dw`), because a config that cannot be compiled cannot be verified.

### TypeScript 6.0.3, not 7.0.2

TypeScript 7 — the native Go compiler — is `latest` on npm. We are on **6.0.3** instead, and the reason is not caution: `typescript-eslint@8.68.0` declares `typescript: ">=4.8.4 <6.1.0"`, and no release, `rc` or `canary` tag supports TS 7 yet. Task 1.1.5 requires type-aware linting, so TS 7 would buy a faster compiler at the cost of the lint story this iteration is committed to.

6.0.3 is the newest release inside that range. It is the JS compiler aligned to 7.0's semantics, so it also front-loads the deprecation removals — moving to 7 later should be a version bump rather than a migration.

**Revisit when typescript-eslint widens its peer range.** That is the single gate; nothing else here blocks TS 7.

### Settings, and why each is there

Every setting is commented in the file itself. The choices worth restating:

* **`target: es2024`**, chosen for the pinned Node 24.20.0 rather than a defensive lower bound. `lib` is deliberately *unset* so it follows `target` — that keeps the frontend's Story 1.3 override to one coherent place instead of two settings that can drift apart.
* **`module`/`moduleResolution: nodenext`**, as anticipated above. `node20` was the alternative and is the stable fallback: it is a fixed target, but it does not model `require(esm)`, which the pinned Node 24 supports. Accepting a floating target is reasonable while every package is ESM-only; the cost is that a TypeScript upgrade can shift its meaning.
* **`skipLibCheck: true`** — skips internal consistency checks of `.d.ts` files. It does not weaken checking at use sites, and `packages/shared`'s declarations are still checked when shared itself is built.
* **`declarationMap` and `sourceMap`** beyond what the task asked for: without them, "go to definition" from an app into `@marketpulse/shared` lands in generated output rather than source. With project references (Task 1.1.3) that is a daily annoyance, not an edge case.

### Deliberately omitted

* **`erasableSyntaxOnly`** — would forbid enums, namespaces and parameter properties. Tempting, but it would quietly pre-decide Story 1.2's open Fastify-vs-NestJS question, since NestJS depends on parameter properties for injection. Reconsider once that decision is made.
* **`noUnusedLocals` / `noUnusedParameters`** — the same class of check belongs to ESLint (Task 1.1.5), which can distinguish an intentionally unused parameter by naming convention. Enabling both means two tools reporting one problem with different escape hatches.

### Verified, not assumed

Each strictness flag was tested against a fixture written to violate it, and each produced its own error: `TS2322` (`noUncheckedIndexedAccess`), `TS2375` (`exactOptionalPropertyTypes`), `TS4114` (`noImplicitOverride`), `TS7029` (`noFallthroughCasesInSwitch`), `TS1484` and `TS1205` (`verbatimModuleSyntax` / `isolatedModules`). The corrected fixture then compiled clean and emitted `.js`, `.d.ts`, `.d.ts.map` and `.js.map`, confirming the `composite` emit shape that Task 1.1.3 depends on.

The first `verbatimModuleSyntax` attempt was a false pass — it imported from `node:fs`, which failed to resolve without `@types/node` and masked the check. Re-run against a local module, it fired correctly. Worth remembering when testing config: an error is not evidence that *the intended* error occurred.

### Fed forward to Task 1.1.6

The file uses comments, so it is JSONC. Prettier 3.9.6 infers the plain `json` parser for `tsconfig.base.json` (its JSONC filename list does not match the `.base.` infix) — but that parser **preserves comments anyway**, verified directly. No parser override is needed. Do not add one speculatively.
