# Task 1.1.5 — ESLint configuration

**Status:** Not started
**Story:** [1.1 Repository Structure & TypeScript Toolchain](STORY.md)
**Depends on:** Task 1.1.4

## Objective

One lint configuration for the whole workspace, with the minimum necessary per-package variation.

## Work

* Install ESLint with TypeScript support and configure it using flat config. Root-level devDependencies need `pnpm add -Dw` — pnpm deliberately refuses a bare `pnpm add` at a workspace root.
* Check `typescript-eslint`'s `typescript` peer range before installing. Task 1.1.2 pinned **TypeScript 6.0.3** precisely because `typescript-eslint@8.68.0` caps at `<6.1.0`; if a newer typescript-eslint has since widened to TS 7, say so and raise the TypeScript pin as a separate change rather than silently mixing the two decisions.
* Leave `noUnusedLocals`/`noUnusedParameters` to ESLint — Task 1.1.2 deliberately omitted them from `tsconfig.base.json` so one problem is not reported by two tools with different escape hatches.
* Define a shared root configuration covering all packages
* Enable type-aware linting, wired to the project references from Task 1.1.4. Prefer typescript-eslint's project service over an explicit list of `tsconfig.json` paths — with references, a hand-maintained list drifts every time a package is added
* Check the branded-type pattern in `packages/shared/src/ticker.ts` survives the chosen rule set. `declare const brand: unique symbol` is referenced only inside a type, which is exactly the shape unused-variable and `no-unused-private-class-members`-style rules get wrong. If a rule flags it, that is a signal to reconsider the rule, not the type — the brand is load-bearing
* Add only the per-package variation genuinely required — browser globals and React rules for the frontend, Node globals for the backend
* Add a `lint` script to each package. `packages/shared` already has a **placeholder** — `echo "lint: no linter yet — Task 1.1.5"` — which must be replaced, not appended to. The apps will have the same placeholder from Task 1.1.4
* Add an ignore configuration covering build output and generated files — `dist/` and `*.tsbuildinfo` at minimum. Linting emitted `.d.ts`/`.js` is both slow and noisy, and the tsbuildinfo sits beside each package's tsconfig rather than inside `dist/`

## Done when

* Lint runs across every package and passes on the current tree
* Type-aware rules work (verified by a deliberate violation that gets caught, then removed)
* A rule set is chosen deliberately, not copied wholesale without review
* Lint is fast enough to run before every commit without being irritating

## Notes

Type-aware linting is slower but catches the class of mistake this project cares about — floating promises in the streaming and agent code, and unsafe `any` propagation across the tool boundary. Worth enabling now while the tree is small enough to tune.
