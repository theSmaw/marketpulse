# Task 1.1.8 — Verify from a clean checkout and document

**Status:** Not started
**Story:** [1.1 Repository Structure & TypeScript Toolchain](STORY.md)
**Depends on:** Task 1.1.7

## Objective

Prove the story's headline criterion — a clean checkout installs and verifies with documented commands — and write down what was decided.

## Work

- Clone or copy the repository to a fresh location and install from scratch, with no reuse of existing `node_modules` or store state. This is the one environment guaranteed to have no `dist/` anywhere, which makes it the real test of the build-before-typecheck ordering — every local run after the first has stale declarations lying around to hide a mistake. Note the ordering matters for `typecheck` specifically: Task 1.1.5 verified that lint behaves correctly on an unbuilt tree (identical findings with `packages/shared/dist` deleted), so a fresh-checkout failure in lint is a real failure, not an ordering artefact
- Run the full verification chain and confirm it passes — including `format:check`, which as of Task 1.1.6 covers `planning/` Markdown as well as code, so an unformatted task document fails the same run a badly formatted source file does
- Document prerequisites and the setup commands. Specifically: **Node 24.x and `corepack enable`**. Node 23 is not merely discouraged — its bundled Corepack (0.29.4) has a stale npm signing keyset and cannot fetch the pinned pnpm at all, failing with `Cannot find matching keyid`. State the required version, not a minimum.
- Note that pnpm settings live in `pnpm-workspace.yaml`, not `.npmrc`; pnpm 11 silently ignores workspace settings left in `.npmrc`, so a future contributor putting them there will be quietly confused.
- Fill in the **Commands** section of `CLAUDE.md`. It is no longer empty — Tasks 1.1.1–1.1.3 have been adding to it as they landed — so this is a review and completion pass, not a first draft. Task 1.1.6 added a large Prettier section to it that should be re-read and trimmed to what a newcomer needs, and the root `format`/`format:check` entries already there must survive the Task 1.1.7 rewrite rather than being folded into a fan-out that does not exist. It must end up describing the real root scripts from Task 1.1.7 and how to run one package's, and the per-package `pnpm --filter` examples added in Task 1.1.3 should be re-checked against what actually exists by then
- Record the workspace decisions as a short ADR draft — pnpm workspaces, the `apps/` + `packages/` layout, project references, strictness settings, the TypeScript version ceiling below, and the install-script policy below, each with its reasoning (PRODUCT_SPEC.md §39)
- The project-references entry should record its consequence, not just the choice: consumers compile against emitted declarations, so `packages/shared` must be built before anything that imports it, and root `typecheck` is a `tsc -b` for that reason. Note the fallback too — exporting raw `.ts` source — so a future reader knows the decision was made with an exit, not by default
- The apps' `types` settings belong in the ADR for the same reason — both look removable and neither is. The frontend's `types: []` is what stops TypeScript auto-discovering every reachable `@types` package and letting `process` typecheck in browser code, and `@types/node` tracks the runtime major (24.x) rather than npm's `latest`, which types a Node this project does not run
- **Record where development tooling is declared, and why**, because Task 1.1.5 established a pattern that looks like an oversight and Task 1.1.6 repeated it: ESLint, its plugins and Prettier are declared _only_ at the workspace root, not in each package, yet every package's `lint` script calls `eslint` directly. That works because pnpm puts the root's `node_modules/.bin` on the PATH of every workspace package script — verified, including for `tsc` in a package declaring no `typescript`. Whatever Task 1.1.7 settles for the TypeScript pin (root-only or `catalog:`), the ADR should state the rule once so the next person neither adds redundant declarations nor deletes load-bearing ones
- **The ESLint globals entry is worth an ADR line precisely because it currently changes nothing.** The per-package `globals` mirror the tsconfig `types` split, but `no-undef` — the only rule they feed — is switched off for `.ts` files by typescript-eslint, so on a TypeScript-only tree they are inert; undefined-global errors come from `tsc`, not ESLint. They exist for the per-package JS tooling files that Stories 1.2 and 1.3 will bring. Without this written down it reads as either redundant config to delete or working protection to rely on, and it is neither yet
- **The absence of `eslint-config-prettier` needs an ADR line, precisely because it is an absence.** Task 1.1.6 measured the conflict surface with `eslint --print-config` rather than assuming it: 138 rules enabled on a `.ts` file, zero of them formatting rules, and one "special rule" (`no-unexpected-multiline`) that guards hand-written code rather than fighting Prettier's output. Without this written down, the next person adds the package as boilerplate and no one can say what it is doing. Record the _check_, not the numbers, as the durable part — and record where it goes if a real conflict ever appears: last in the flat config array
- **Record that LF is asserted in three files that must agree**, and which one binds: `endOfLine: "lf"` in `prettier.config.mjs`, `end_of_line = lf` in `.editorconfig`, and `* text=auto eol=lf` in `.gitattributes`. Only the last actually delivers the story's no-spurious-diffs criterion, because `.editorconfig` binds editors while git normalises on checkout by its own rules. The lockfile's `linguist-generated=true -diff` belongs in the same entry
- **Editor setup is checked in, not per-machine.** `.idea/prettier.xml` ships with `AUTOMATIC` mode plus format-on-save and format-on-reformat, so WebStorm resolves the same `prettier` package and the same config file the CLI does and there is no second copy of the configuration to drift. Say so in the docs — otherwise "formatting on save works without extra configuration" reads as a claim about someone's local settings. The clean-checkout verification itself must not require an editor
- `module: nodenext` has two consequences that look like mistakes on first encounter and belong in the ADR rather than in tribal memory: every package needs `"type": "module"`, and relative imports carry `.js` extensions from `.ts` files
- Mark Story 1.1 complete

## Done when

- A fresh checkout reaches a passing verification run by following the written instructions only
- No step required knowledge that exists solely in this session
- `CLAUDE.md` documents the real commands, including how to run them for a single package
- The ADR draft exists and explains _why_, not just _what_

## TypeScript version ceiling

TypeScript is pinned to **6.0.3** while npm's `latest` is 7.x, and the ADR needs to say why or the next person will "fix" it: `typescript-eslint` does not yet support the native TS 7 compiler (peer range `<6.1.0` as of 8.68.0), and this repository uses type-aware linting. The pin is a dependency constraint with a known release gate, not a preference.

State the gate explicitly — _when typescript-eslint's peer range admits TS 7, raise the pin_ — so the decision has a documented expiry rather than becoming folklore.

Re-checked at Task 1.1.5 before installing: typescript-eslint 8.68.0 is still `latest` and its range is still `>=4.8.4 <6.1.0`. The gate has not opened. Record the check as _repeatable_, not as a settled fact with a date attached.

One adjacent trap belongs here too: **`@eslint/js` no longer shares a version line with `eslint`** — 10.0.1 against eslint's 10.9.1 — so pinning the two in lockstep fails the install outright. It looks like a typo in the lockfile and is not one.

## Install-script policy

pnpm 11 refuses to run any dependency's install scripts unless that dependency is named in `allowBuilds` in `pnpm-workspace.yaml`, and an un-allowlisted one is a **hard install failure (exit 1)**, not a warning — verified during Task 1.1.1. The setting replaces pnpm 10's `onlyBuiltDependencies`, which pnpm 11 accepts in config but no longer acts on.

Nothing installed in this story has an install script, so there is nothing to allowlist yet and no configuration to write. The first dependency that trips it is likely esbuild, arriving via Vite in Story 1.3, where it will fail CI as readily as it fails locally.

The ADR should record this as a deliberate supply-chain position — dependencies do not get to execute code at install time unless someone names them — rather than leaving the next person to discover it as an obstruction and reach for a blanket disable.

## Notes

This is the acceptance test for the whole story. If a step turns out to be undocumented or machine-specific, fix it here rather than noting it — Story 1.10 will run the same sequence in CI and Story 1.11 in a deployment environment.
