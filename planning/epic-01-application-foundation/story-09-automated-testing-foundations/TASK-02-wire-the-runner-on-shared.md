# Task 1.9.2 — Wire the runner and prove it on `packages/shared`

**Status:** Not started
**Story:** [1.9 Automated Testing Foundations](STORY.md)
**Depends on:** Task 1.9.1

## Objective

Install the chosen runner, decide where its configuration lives, and make the first of the three placeholder `test` scripts real — in the package with no DOM, no server and no framework, so the wiring is the only thing under test.

## Work

- **Install the runner at the workspace root**, under the rule settled in Task 1.1.7 and restated in ADR 0001 §6: shared tooling lives at the root, packages declare only what they import. pnpm puts the root's `node_modules/.bin` on every package script's PATH, so the runner resolves from a package directory without that package declaring it — verified for `tsc`, `eslint` and `prettier` in Task 1.1.8. The counter-example still binds: anything a _test_ imports — a DOM environment, a matcher library — is a dependency of that package's code and goes in that package. Task 1.9.4 is where that distinction gets exercised
- **Record the install's cost the way this repository records every install:** package count, disk size, whether `allowBuilds` fired, and what the lockfile gained. `esbuild` is currently the only install script in the tree; say whether that is still true afterwards
- **Decide where configuration lives and say why.** One root config with per-package projects, or one config per package, or none at all if the runner needs none. Weigh it against the existing pattern rather than the runner's template: `eslint.config.mjs` and `prettier.config.mjs` are single root files on purpose, and `apps/frontend` has a `vite.config.ts` that a Vitest-shaped runner would reuse rather than fork — which is the same containment argument `.storybook/main.ts` already makes by reusing it. Whatever the answer, a new top-level config file needs an entry in this task's write-up and possibly in `eslint.config.mjs`'s trailing `disableTypeChecked` block, which is now protecting four files for exactly this reason
- **Replace `packages/shared`'s `test` placeholder with the real command.** It is currently `echo "@marketpulse/shared: no tests yet — Story 1.9"`. Root `test` is `pnpm -r run test` and stays that way — this story replaces placeholders, it does not introduce a script name or a second command meaning "run the tests"
- **Write the first tests against something that already exists**, not a fixture invented for the runner. `packages/shared/src` holds `api-error.ts`, `request-id.ts`, `anomaly.ts`, `feed-status.ts` and `ticker.ts`. `apiError()` is the obvious first subject and it is a real one: its branch exists because `exactOptionalPropertyTypes` makes an absent `details` and an explicit `undefined` different types, so a test that asserts `"details" in error` is `false` for the no-details path is testing the decision rather than the syntax. `API_ERROR_CODES` and `REQUEST_ID_HEADER` are constants worth one assertion each precisely because other packages import them rather than spelling them
- **Prove the runner survives the module setup on real files**, not on the scratch tree from Task 1.9.1: a test importing `./api-error.js` from a `.ts` file, in a package with `"type": "module"` and `module: nodenext`. If it does not, the decision from 1.9.1 was wrong and this is where that is found out — say so rather than working around it
- **Decide the file naming and location conventions here, because everything after this copies them.** `src/api-error.test.ts` beside the source, or `test/api-error.test.ts`, or `__tests__/`. Three existing constraints bear on it and should be named in the write-up: files under `src/` are inside `tsc -b`'s program, so tests typecheck, lint under the full type-aware pass, and must carry `.js` extensions on relative imports; files outside it get none of that and would need their own tsconfig or an ESLint block; and `packages/shared` is consumed as built output, so a `*.test.ts` under `src/` **emits into `dist/`** unless it is excluded — check what ships and decide whether that matters. Task 1.9.6 documents the convention; this task is where it is chosen
- **Check the exclusions.** `coverage/` is already in `.gitignore`, `.prettierignore` and `eslint.config.mjs`'s ignores; anything else the runner emits (a cache directory, a results file) needs the same three entries or it needs to not be emitted
- **Confirm the placeholder is genuinely gone.** After this task, `pnpm test` at the root runs one real suite and two remaining `echo`s. Do not describe that as passing tests in the commit message — the standing rule in `CLAUDE.md` applies until Task 1.9.7 removes it

## Done when

- The runner is installed at the root, its cost recorded, and `allowBuilds` is either unchanged or the change is explained
- `packages/shared`'s `test` script runs real tests and exits non-zero when one fails — demonstrated by making one fail, not by reasoning about it
- The `.js`-extension convention works in a test file, on the real package
- Test file naming and location are decided, and the emitted-into-`dist` question is answered
- `pnpm verify` exits 0 from the root, with the new step's duration recorded alongside the existing six

## Notes

A check that has never failed is a check that has never been tested — the same sentence `CLAUDE.md` uses about `pnpm stories` and the placeholder `test` scripts. Break a test on purpose before closing this task, and confirm the failure propagates through `pnpm -r` to the root exit code, which Task 1.1.7 verified for a package script exiting 3.
