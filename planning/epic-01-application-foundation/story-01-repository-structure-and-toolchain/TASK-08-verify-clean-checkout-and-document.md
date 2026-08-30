# Task 1.1.8 — Verify from a clean checkout and document

**Status:** Not started
**Story:** [1.1 Repository Structure & TypeScript Toolchain](STORY.md)
**Depends on:** Task 1.1.7

## Objective

Prove the story's headline criterion — a clean checkout installs and verifies with documented commands — and write down what was decided.

## Work

* Clone or copy the repository to a fresh location and install from scratch, with no reuse of existing `node_modules` or store state
* Run the full verification chain and confirm it passes
* Document prerequisites and the setup commands. Specifically: **Node 24.x and `corepack enable`**. Node 23 is not merely discouraged — its bundled Corepack (0.29.4) has a stale npm signing keyset and cannot fetch the pinned pnpm at all, failing with `Cannot find matching keyid`. State the required version, not a minimum.
* Note that pnpm settings live in `pnpm-workspace.yaml`, not `.npmrc`; pnpm 11 silently ignores workspace settings left in `.npmrc`, so a future contributor putting them there will be quietly confused.
* Fill in the **Commands** section of `CLAUDE.md`. It is no longer empty — Tasks 1.1.1–1.1.3 have been adding to it as they landed — so this is a review and completion pass, not a first draft. It must end up describing the real root scripts from Task 1.1.7 and how to run one package's, and the per-package `pnpm --filter` examples added in Task 1.1.3 should be re-checked against what actually exists by then
* Record the workspace decisions as a short ADR draft — pnpm workspaces, the `apps/` + `packages/` layout, project references, strictness settings, the TypeScript version ceiling below, and the install-script policy below, each with its reasoning (PRODUCT_SPEC.md §39)
* The project-references entry should record its consequence, not just the choice: consumers compile against emitted declarations, so `packages/shared` must be built before anything that imports it, and root `typecheck` is a `tsc -b` for that reason. Note the fallback too — exporting raw `.ts` source — so a future reader knows the decision was made with an exit, not by default
* `module: nodenext` has two consequences that look like mistakes on first encounter and belong in the ADR rather than in tribal memory: every package needs `"type": "module"`, and relative imports carry `.js` extensions from `.ts` files
* Mark Story 1.1 complete

## Done when

* A fresh checkout reaches a passing verification run by following the written instructions only
* No step required knowledge that exists solely in this session
* `CLAUDE.md` documents the real commands, including how to run them for a single package
* The ADR draft exists and explains *why*, not just *what*

## TypeScript version ceiling

TypeScript is pinned to **6.0.3** while npm's `latest` is 7.x, and the ADR needs to say why or the next person will "fix" it: `typescript-eslint` does not yet support the native TS 7 compiler (peer range `<6.1.0` as of 8.68.0), and this repository uses type-aware linting. The pin is a dependency constraint with a known release gate, not a preference.

State the gate explicitly — *when typescript-eslint's peer range admits TS 7, raise the pin* — so the decision has a documented expiry rather than becoming folklore.

## Install-script policy

pnpm 11 refuses to run any dependency's install scripts unless that dependency is named in `allowBuilds` in `pnpm-workspace.yaml`, and an un-allowlisted one is a **hard install failure (exit 1)**, not a warning — verified during Task 1.1.1. The setting replaces pnpm 10's `onlyBuiltDependencies`, which pnpm 11 accepts in config but no longer acts on.

Nothing installed in this story has an install script, so there is nothing to allowlist yet and no configuration to write. The first dependency that trips it is likely esbuild, arriving via Vite in Story 1.3, where it will fail CI as readily as it fails locally.

The ADR should record this as a deliberate supply-chain position — dependencies do not get to execute code at install time unless someone names them — rather than leaving the next person to discover it as an obstruction and reach for a blanket disable.

## Notes

This is the acceptance test for the whole story. If a step turns out to be undocumented or machine-specific, fix it here rather than noting it — Story 1.10 will run the same sequence in CI and Story 1.11 in a deployment environment.
