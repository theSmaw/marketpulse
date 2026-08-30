# Task 1.1.8 — Verify from a clean checkout and document

**Status:** Not started
**Story:** [1.1 Repository Structure & TypeScript Toolchain](STORY.md)
**Depends on:** Task 1.1.7

## Objective

Prove the story's headline criterion — a clean checkout installs and verifies with documented commands — and write down what was decided.

## Work

- Clone or copy the repository to a fresh location and install from scratch, with no reuse of existing `node_modules` or store state. This is the one environment guaranteed to have no `dist/` anywhere, so it is the real test of the build-before-typecheck **ordering** — that `verify` builds before anything that needs declarations. Note the ordering matters for `typecheck` specifically: Task 1.1.5 verified that lint behaves correctly on an unbuilt tree (identical findings with `packages/shared/dist` deleted), so a fresh-checkout failure in lint is a real failure, not an ordering artefact
- **Be precise about what a fresh checkout does _not_ test.** This bullet previously called it the real test of the staleness trap as well, on the reasoning that every local run has stale declarations lying around to hide a mistake. Task 1.1.7 measured it and the two cases are different: with **no** `dist` at all, even a per-package `tsc --noEmit` correctly reports a cross-package error (exit 1) — it is a **stale** `dist` that produces the silent pass Task 1.1.4 recorded. A fresh checkout therefore cannot reproduce the failure mode `tsc -b` exists to prevent, and passing there is not evidence that the instrument is right. That evidence already exists in Tasks 1.1.4 and 1.1.7; cite it rather than expecting a clean clone to re-demonstrate it
- Run `pnpm verify` — `build && lint && format:check && test`, wired in Task 1.1.7 — and confirm it passes. This is the single command the written instructions should lead to, and the one Story 1.10 runs
- Document prerequisites and the setup commands. Specifically: **Node 24.x and `corepack enable`**. Node 23 is not merely discouraged — its bundled Corepack (0.29.4) has a stale npm signing keyset and cannot fetch the pinned pnpm at all, failing with `Cannot find matching keyid`. State the required version, not a minimum.
- Note that pnpm settings live in `pnpm-workspace.yaml`, not `.npmrc`; pnpm 11 silently ignores workspace settings left in `.npmrc`, so a future contributor putting them there will be quietly confused.
- Fill in the **Commands** section of `CLAUDE.md`. It is no longer empty and it is no longer a sketch — Task 1.1.7 rewrote it around the real root scripts, the six-verb convention and the `pnpm --filter` examples for a single package. So this is a **check against reality**, not a completion pass: run every command in it from the fresh checkout and delete or correct any that does not behave as written. The two most likely to have drifted by then are `pnpm dev` (see below) and `pnpm test` (placeholders until Story 1.9)
- **Do not document `dev` and `test` as if they work.** Task 1.1.7 set the convention with `echo` placeholders that exit 0: `test` in all three packages until Story 1.9, and `dev` in both apps until Stories 1.2 and 1.3. Only `packages/shared`'s `dev` (`tsc -b --watch`) is real. A green `pnpm test` on a fresh checkout means "no tests exist", not "tests pass", and Story 1.10 will make that green appear in CI — say so explicitly here, in `CLAUDE.md` and in the ADR, or it reads as coverage
- Record the workspace decisions as a short ADR draft — pnpm workspaces, the `apps/` + `packages/` layout, project references, strictness settings, the TypeScript version ceiling below, and the install-script policy below, each with its reasoning (PRODUCT_SPEC.md §39)
- The project-references entry should record its consequence, not just the choice: consumers compile against emitted declarations, so `packages/shared` must be built before anything that imports it, and root `typecheck` is a `tsc -b` for that reason. Note the fallback too — exporting raw `.ts` source — so a future reader knows the decision was made with an exit, not by default
- **The same entry has to explain why `typecheck` and `build` are the same command**, because they are, at the root and in all three packages as of Task 1.1.7, and that looks like a copy-paste error. Typechecking this workspace _is_ building it; there is no cheaper correct pass while consumers compile against `dist/*.d.ts`. Both names are kept so they can diverge later without a rename. Record the root `tsconfig.json` alongside it: a solution file, `files: []` plus three `references`, deliberately **not** extending `tsconfig.base.json` because it compiles nothing
- **Record which root scripts fan out and which do not, and why** — Task 1.1.7 made only `test` and `dev` use `pnpm -r`. `build`/`typecheck` are one `tsc -b` because the reference graph already orders the work, and `lint` is one `eslint .` because a fan-out starts three ESLint processes that each build their own typescript-eslint project service over the same solution. Without this, adding `pnpm -r` to a root script later looks like a consistency improvement
- The apps' `types` settings belong in the ADR for the same reason — both look removable and neither is. The frontend's `types: []` is what stops TypeScript auto-discovering every reachable `@types` package and letting `process` typecheck in browser code, and `@types/node` tracks the runtime major (24.x) rather than npm's `latest`, which types a Node this project does not run
- **Record where development tooling is declared, and why**, because it looks like an oversight: ESLint, Prettier and TypeScript are declared _only_ at the workspace root, not in any package, yet every package's `lint`, `build` and `typecheck` scripts call `eslint` and `tsc` directly. That works because pnpm puts the root's `node_modules/.bin` on the PATH of every workspace package script — verified in Task 1.1.5 with a throwaway package, and again in 1.1.7 with the real ones. Task 1.1.7 settled the open question in favour of **root-only** over `catalog:`, so the rule the ADR states is one sentence: **shared tooling lives at the workspace root; packages declare only what they actually import.** Give the counter-example in the same breath — `@types/node` stays in `apps/backend` because it is a type dependency of that package's code, not a tool — since the rule is otherwise easy to over-apply. Say why the catalog was rejected too (self-describing packages, at the cost of a second convention), so it is not re-proposed as an obvious improvement
- **The ESLint globals entry is worth an ADR line precisely because it currently changes nothing.** The per-package `globals` mirror the tsconfig `types` split, but `no-undef` — the only rule they feed — is switched off for `.ts` files by typescript-eslint, so on a TypeScript-only tree they are inert; undefined-global errors come from `tsc`, not ESLint. They exist for the per-package JS tooling files that Stories 1.2 and 1.3 will bring. Without this written down it reads as either redundant config to delete or working protection to rely on, and it is neither yet
- **The absence of `eslint-config-prettier` needs an ADR line, precisely because it is an absence.** Task 1.1.6 measured the conflict surface with `eslint --print-config` rather than assuming it: 138 rules enabled on a `.ts` file, zero of them formatting rules, and one "special rule" (`no-unexpected-multiline`) that guards hand-written code rather than fighting Prettier's output. Without this written down, the next person adds the package as boilerplate and no one can say what it is doing. Record the _check_, not the numbers, as the durable part — and record where it goes if a real conflict ever appears: last in the flat config array
- **Record that LF is asserted in three files that must agree**, and which one binds: `endOfLine: "lf"` in `prettier.config.mjs`, `end_of_line = lf` in `.editorconfig`, and `* text=auto eol=lf` in `.gitattributes`. Only the last actually delivers the story's no-spurious-diffs criterion, because `.editorconfig` binds editors while git normalises on checkout by its own rules. The lockfile's `linguist-generated=true -diff` belongs in the same entry
- **Editor setup is checked in, not per-machine.** `.idea/prettier.xml` ships with `AUTOMATIC` mode plus format-on-save and format-on-reformat, so WebStorm resolves the same `prettier` package and the same config file the CLI does and there is no second copy of the configuration to drift. Say so in the docs — otherwise "formatting on save works without extra configuration" reads as a claim about someone's local settings. The clean-checkout verification itself must not require an editor
- `module: nodenext` has two consequences that look like mistakes on first encounter and belong in the ADR rather than in tribal memory: every package needs `"type": "module"`, and relative imports carry `.js` extensions from `.ts` files
- **Note the cost of root-level tooling that the per-package scripts did not have.** `eslint .` and `prettier .` at the root walk into anything nested in the repository, including whole second checkouts: Task 1.1.7's first `verify` run reported eight errors from a git worktree under `.claude/worktrees/`, and a `pnpm format` would have rewritten another branch's files. Both ignore lists now carry that path and each comments the other. A fresh checkout has no worktrees, so this will _not_ reproduce during this task's verification — document it anyway, including the rule that the two lists must be changed together, because the next thing to nest a checkout here will hit it silently
- Mark Story 1.1 complete

## Done when

- A fresh checkout reaches a passing verification run by following the written instructions only
- No step required knowledge that exists solely in this session
- `CLAUDE.md` documents the real commands, including how to run them for a single package — and every command in that section was actually executed in the fresh checkout, not read
- The written instructions lead to `pnpm verify`, and it exits 0 there
- The ADR draft exists and explains _why_, not just _what_

## TypeScript version ceiling

TypeScript is pinned to **6.0.3** while npm's `latest` is 7.x, and the ADR needs to say why or the next person will "fix" it: `typescript-eslint` does not yet support the native TS 7 compiler (peer range `<6.1.0` as of 8.68.0), and this repository uses type-aware linting. The pin is a dependency constraint with a known release gate, not a preference.

State the gate explicitly — _when typescript-eslint's peer range admits TS 7, raise the pin_ — so the decision has a documented expiry rather than becoming folklore.

Since Task 1.1.7 the pin lives in the root `package.json` and nowhere else, so acting on that expiry is a one-line edit rather than the four-file edit that gets done partially. Say that in the ADR: it is the concrete payoff of the root-only rule above, and the reason the rule is worth stating at all.

Re-checked at Task 1.1.5 before installing: typescript-eslint 8.68.0 is still `latest` and its range is still `>=4.8.4 <6.1.0`. The gate has not opened. Record the check as _repeatable_, not as a settled fact with a date attached.

One adjacent trap belongs here too: **`@eslint/js` no longer shares a version line with `eslint`** — 10.0.1 against eslint's 10.9.1 — so pinning the two in lockstep fails the install outright. It looks like a typo in the lockfile and is not one.

## Install-script policy

pnpm 11 refuses to run any dependency's install scripts unless that dependency is named in `allowBuilds` in `pnpm-workspace.yaml`, and an un-allowlisted one is a **hard install failure (exit 1)**, not a warning — verified during Task 1.1.1. The setting replaces pnpm 10's `onlyBuiltDependencies`, which pnpm 11 accepts in config but no longer acts on.

Nothing installed in this story has an install script, so there is nothing to allowlist yet and no configuration to write. The first dependency that trips it is likely esbuild, arriving via Vite in Story 1.3, where it will fail CI as readily as it fails locally.

The ADR should record this as a deliberate supply-chain position — dependencies do not get to execute code at install time unless someone names them — rather than leaving the next person to discover it as an obstruction and reach for a blanket disable.

## Notes

This is the acceptance test for the whole story. If a step turns out to be undocumented or machine-specific, fix it here rather than noting it — Story 1.10 will run the same sequence in CI and Story 1.11 in a deployment environment.
