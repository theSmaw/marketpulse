# Task 1.1.2 — Shared TypeScript configuration

**Status:** Not started
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
