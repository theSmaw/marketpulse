# Story 1.10 — Continuous Integration Pipeline

**Status:** Not started
**Epic:** [Epic 1 — Application Foundation](../EPIC.md)
**Depends on:** Story 1.9
**Epic scope covered:** CI pipeline

## Description

Automated verification on every change, so the repository stays green and the portfolio audience sees a maintained project rather than a snapshot.

## Prerequisite — resolved

This story previously opened by saying the repository had no remote and that a hosted origin was needed first. That is no longer true: `origin` is `github.com/theSmaw/marketpulse`, and Story 1.1 was delivered through pull requests against it. The prerequisite is met; the default CI provider assumption below is now the obvious one rather than a guess.

## Conventions from Story 1.1

Story 1.1 is complete, and these four bind this story. They are stated in every Epic 1 story so each one can be read on its own; the full reasoning is in `docs/adr/0001-repository-structure-and-typescript-toolchain.md`.

- **`pnpm verify` is the acceptance command** — `build && lint && format:check && stories && test`, chained with `&&` so the first failure is the exit code. It took its fifth step in Task 1.4.5: `stories` fails if a component has no stories file, and `build` now also produces the Storybook bundle. This story passes it from the repository root. Prettier owns Markdown as well as code, so an unformatted planning document fails it too
- **Six verbs, identical in every package** — `dev`, `build`, `test`, `lint`, `typecheck`, `clean`. Only `test` and `dev` fan out with `pnpm -r`; the rest run their tool once from the root, because the reference graph and ESLint's project service already cover the workspace in one pass. Changing what a verb means in one package means changing it everywhere, or saying why not
- **Shared tooling lives at the workspace root; packages declare only what they actually import.** ESLint, Prettier and TypeScript are root-only devDependencies, and pnpm puts the root's `node_modules/.bin` on every package script's PATH. A library the code imports belongs in the package that imports it — `@types/node` in `apps/backend` is the counter-example that keeps the rule from being over-applied
- **The module setup is ESM-only and single-file-safe** — `"type": "module"`, `module: nodenext`, `isolatedModules`, `verbatimModuleSyntax`, and relative imports carrying `.js` extensions from `.ts` files (TS2835 without one). `packages/shared` is consumed as **built output**, so it must be built before any consumer can be typechecked; `tsc -b` orders that itself, which is why `typecheck` and `build` are the same command

One thing that is true today and will not be forever: until Story 1.9 lands, **`pnpm test` passes because there are no tests** — all three `test` scripts are `echo` placeholders that exit 0, and they are now the only placeholders left. The companion note about both apps' `dev` scripts being placeholders is **no longer true** — Stories 1.2 and 1.3 made all three real.

## What that means for this story

More directly than for any other story in the epic: **this pipeline runs `pnpm verify` and defines nothing of its own.** Story 1.1 built `verify` to be the single acceptance command precisely so that CI and a developer's machine cannot disagree about what "green" means, and Task 1.1.8 confirmed it works from a clean clone with an empty pnpm store and an empty Corepack home — which is exactly the environment a CI runner is.

Everything else this story adds is around that one command: triggers, toolchain pinning, caching and visibility. The criteria below spell those out.

**The exit code CI reads is the child's, not pnpm's own.** Measured in Tasks 1.2.5 and 1.2.6 rather than assumed: `pnpm run` waits for the script to finish and propagates its exit code — 7 from a probe, 1 from the real server on a busy port — printing `ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL` alongside it. So a non-zero from anything `verify` runs, at any nesting depth, reaches the runner intact. That is the mechanism this whole story leans on, and it holds.

## Acceptance criteria

- Pipeline runs on push and on pull request
- **`pnpm verify` now includes two bundlers, so CI's runtime and failure surface both grew.** Task 1.4.5 added the second: root `build` also runs `storybook build`, which is the slower half. ~~measured at ~8.3s for the whole chain against ~7.6s before~~ — **Task 1.4.6 measured it properly from a clean tree at 10.5s** against ~7.6s before the workshop, and **Task 1.5.6 re-measured it at 11.0s** with the router, the chrome and the regions in the tree — build 3.2s, lint 2.9s, `format:check` 1.6s, `stories` 0.25s, `test` 0.45s. Take 11.0s as the current figure and the shape as the durable part: **the build overtook lint as the most expensive step once a second bundler had real source to chew on**, which is the reverse of what Task 1.4.6 found, so re-measure before optimising rather than trusting either number. Task 1.4.6's warm split was build 2.2s, lint 3.3s, `format:check` 1.4s, `stories` 0.24s, `test` 0.45s; cold, its build split `tsc -b` 1.54s / `vite build` 0.49s / `storybook build` 1.38s. Storybook is still the slower bundler, its own output is 227 modules and 7.4 MB across 50 files, and none of it is shipped to a user. `storybook-static/` is a candidate CI artefact and this story owns whether it is published.
- **The first bundler, and the note this bullet started as.** Root `build` is `tsc -b && pnpm --filter @marketpulse/frontend exec vite build && pnpm --filter @marketpulse/frontend exec storybook build`, not the bare `tsc -b` this story was written against — and it names that one package **twice**, so a second frontend package would be missed twice over. From a clean clone with a cold store, install is ~1.3s and `verify` ~7.6s, of which the bundle is ~50 ms — so caching the pnpm store still dominates. The failure surface matters more than the timing: a build can now fail in Rolldown after passing `tsc`, and Task 1.3.5 measured a case where it goes the other way too (drop a `.js` import extension and `tsc` fails while the bundle emits byte-identically)
- **The pipeline's verification step is `pnpm verify` and nothing else.** Task 1.1.7 wired it as `build && lint && format:check && test`, chained with `&&` so the first failure is the exit code, and Task 1.1.8 confirmed it exits 0 from a clean clone in about four seconds. **It is a five-step chain since Task 1.4.5** — `build && lint && format:check && stories && test` — where `stories` fails if a component has no stories file. The point of this bullet is unchanged by that and is the reason it survives being edited: CI runs the chain by name, so a step added here reaches CI without a workflow change. Re-listing the individual tools in a workflow file forks the definition of "verified" between CI and the developer's machine, which is the specific failure this story exists to prevent
- **Formatting is part of verification, and this story's criteria previously omitted it.** `format:check` has been in `verify` since Task 1.1.7 and Prettier owns Markdown as well as code, so an unformatted `planning/` document fails CI exactly as an unformatted `.ts` file does. That is intended
- The pipeline pins the toolchain the same way local machines do: Node from `.nvmrc` (24.20.0 — `engineStrict` makes pnpm refuse any other major) and pnpm from `package.json`'s `packageManager` field via `corepack enable`. Do not install pnpm separately in the workflow; the pin is the point
- A failure in any stage fails the pipeline visibly
- Dependency and build caching keep runtimes reasonable — the pnpm **store**, not `node_modules`. Task 1.1.8 measured a cold install from an empty store at under a second once the packages are fetched, so cache the store and let pnpm link
- Status is visible from the repository
- **Know what `pnpm verify` does not cover, and say so rather than closing the gap here.** `apps/backend/scripts/dev.sh` is checked by nothing: ESLint sees only JS and TS, Prettier has no shell parser and skips it silently, and `tsc` has no view of it. It is the first file in the workspace outside the tooling net, and it is the file that starts the development server, so a syntax error in it is a real if minor failure mode. **There is now a second, smaller one of the same shape:** `apps/frontend`'s `clean` script contains an `rm -rf dist`, an unchecked shell fragment inside a JSON string, added by Task 1.3.1 — and Task 1.4.5 added `storybook-static` to that string and to the root's, so it is **two** scripts now rather than one. **Do not add `shellcheck` in this story** — one small shell file and two short strings do not justify a new root dependency and a further step in `verify`. Record both as a known and dated choice (2026-08-30) so the gap is not something CI is quietly assumed to catch. Note what is **not** a third gap: `scripts/check-stories.mjs`, added in Task 1.4.5, is plain JavaScript, so ESLint and Prettier both cover it

- **The pipeline runs on Linux and this repository has just acquired its first platform-specific native binding.** Rolldown — Vite 8's bundler — resolves `@rolldown/binding-darwin-arm64` on the development machine and `@rolldown/binding-linux-x64-gnu` on a GitHub Actions runner. The lockfile records all fifteen platform variants as optional dependencies, so this should just work, and Task 1.3.5 confirmed a cold 200-package install resolves the local one correctly. But it is the first time "works on my machine" has a real mechanism behind it in this repository, and CI is the first place the other side of it runs. If the first pipeline failure is an install or a `vite build` that has never failed locally, look here before anywhere else — and note that `--frozen-lockfile` (the CI default) is what keeps this honest
- The pipeline runs from a clean environment, catching anything that only works locally. Task 1.1.8 already did this by hand — clean clone, empty pnpm store, empty `COREPACK_HOME` — so a CI failure that a clean local clone does not reproduce points at the workflow, not the repository

## What CI going green will and will not mean

**`pnpm test` currently means "no tests exist", not "tests pass."** All three packages' `test` scripts are `echo` placeholders that exit 0 until Story 1.9. This story is what puts that green tick on a pull request, where it is indistinguishable from passing coverage.

Story 1.9 is a dependency for exactly this reason, so by the time the badge exists the tick should be real. If this story ships first for any reason, say so on the badge or in the workflow name — do not let a placeholder read as coverage.

Note also that `verify` covers three packages, not two: `apps/backend`, `apps/frontend` and `packages/shared`. The wording "both packages" predates `packages/shared` existing.

## Open decisions

- CI provider — GitHub Actions is the default assumption
