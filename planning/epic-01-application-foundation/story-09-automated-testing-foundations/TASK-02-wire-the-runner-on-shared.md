# Task 1.9.2 — Wire the runner and prove it on `packages/shared`

**Status:** Complete (2026-09-02)
**Story:** [1.9 Automated Testing Foundations](STORY.md)
**Depends on:** Task 1.9.1

## Objective

Install the chosen runner, decide where its configuration lives, and make the first of the three placeholder `test` scripts real — in the package with no DOM, no server and no framework, so the wiring is the only thing under test.

## Work

- **Install the runner at the workspace root**, under the rule settled in Task 1.1.7 and restated in ADR 0001 §6: shared tooling lives at the root, packages declare only what they import. pnpm puts the root's `node_modules/.bin` on every package script's PATH, so the runner resolves from a package directory without that package declaring it — verified for `tsc`, `eslint` and `prettier` in Task 1.1.8. The counter-example still binds: anything a _test_ imports — a DOM environment, a matcher library — is a dependency of that package's code and goes in that package. Task 1.9.4 is where that distinction gets exercised
- **Record the install's cost the way this repository records every install:** package count, disk size, whether `allowBuilds` fired, and what the lockfile gained. `esbuild` is currently the only install script in the tree; say whether that is still true afterwards
- **Two of this task's decisions were pre-empted by Task 1.9.1's spike and should be recorded rather than re-derived.** The runner is **Vitest 4.1.11**, marginal cost **+22 packages / +4 MB** against the 327-package baseline, `allowBuilds` untouched — re-take those figures on the real install rather than copying them, but expect them. And `@marketpulse/shared` is resolved **through its `exports` map**, never through a source alias: the alias was built and rejected because it stayed green with `packages/shared/dist` deleted entirely and green again with the package's own `exports` map broken. Note this costs `packages/shared`'s _own_ suite nothing — its tests import `./api-error.js` relatively, not by package name — so the build-ordering consequence lands on Tasks 1.9.3 and 1.9.4, not here
- **Test files must live inside a tsconfig's `include`, and Task 1.9.1 has a measurement behind that rather than a preference.** Vitest transpiles and strips types; it does not check them. A spike test calling `buildServer()` with a field missing ran, and failed as two 500s with a runtime log line — while `tsc -b` reported `TS2345: Property 'corsOrigin' is missing` immediately, **but only because the file sat inside `include`**. That is ADR 0003's dev-server failure mode arriving in a second place: a green runner is not evidence of a compiling tree. It makes the location decision below a correctness question rather than a tidiness one
- **Decide where configuration lives and say why.** One root config with per-package projects, or one config per package, or none at all if the runner needs none. Weigh it against the existing pattern rather than the runner's template: `eslint.config.mjs` and `prettier.config.mjs` are single root files on purpose, and `apps/frontend` has a `vite.config.ts` that a Vitest-shaped runner would reuse rather than fork — which is the same containment argument `.storybook/main.ts` already makes by reusing it. Whatever the answer, a new top-level config file needs an entry in this task's write-up and possibly in `eslint.config.mjs`'s trailing `disableTypeChecked` block, which is now protecting four files for exactly this reason. Task 1.9.1 established the frontend's half of this by measurement — `mergeConfig(viteConfig, { test: { environment: "jsdom" } })` renders the real components with the build's own hashed CSS Module class names — so the reuse argument is settled and only the root's shape is open. **If a root config exists at all, name it `.mts`**: a root `vitest.config.ts` is loaded as CommonJS, because the root `package.json` has no `"type": "module"`, and Vite warns under a config loader it says is planned to become the default. `.mts` takes it to zero warnings
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

## Outcome

**Vitest 4.1.11 installed at the root, configured per package, tests living in `src/` beside their subject — and `packages/shared`'s placeholder replaced by a real suite of 7 tests across 2 files that exits 1 when one fails.** `pnpm verify` exits 0 in **10.45 s** against a **10.00 s** baseline taken on the same tree immediately before the install.

### The install, and its cost

`pnpm add -D -w -E vitest@4.1.11`, pinned exactly like every other devDependency here, at exit 0.

|                           | Before      | After       | Marginal  |
| ------------------------- | ----------- | ----------- | --------- |
| Virtual store entries     | 342         | 364         | **+22**   |
| `node_modules` (`du -sh`) | 246 MB      | 250 MB      | **+4 MB** |
| `pnpm-lock.yaml`          | 3,888 lines | 4,111 lines | +223      |

Task 1.9.1's forecast of +22 packages and +4 MB reproduced exactly, re-taken rather than copied. **`allowBuilds` did not fire and `pnpm-workspace.yaml` is byte-unchanged** — a sweep of the whole installed tree for `preinstall`/`install`/`postinstall` scripts returns `esbuild@0.28.2` and nothing else, so that statement is still true.

### Where configuration lives — one file per package, and no root config

Root `test` is `pnpm -r run test`, one of only two verbs that genuinely fan out. A root config with a `projects` list would be a **second entry point meaning "run the tests"**, which this story says explicitly not to introduce, and it would compete with the fan-out rather than describe it. So the shape matches the shape the workspace already has, and it differs from `eslint.config.mjs` and `prettier.config.mjs` for a reason those two do not share: their tools run **once from the root**, and this one does not.

Because no root config exists, **Task 1.9.1's `.mts` finding does not apply here**. `packages/shared/vitest.config.ts` is a `.ts`: the CommonJS config-loader warning is a property of the _root_, whose `package.json` has no `"type": "module"`. Every workspace package is ESM, so a `.ts` config loads as ESM — verified, zero warnings. If a root config is ever added, `.mts` still stands.

It is the **fifth** file needing `eslint.config.mjs`'s trailing `disableTypeChecked` block, joining `eslint.config.mjs`, `vite.config.ts` and the two `.storybook/` files for the identical reason — a `.ts` file in a package whose tsconfig `include` is `src/**/*`. Without the entry it is a hard `was not found by the project service` parsing error, exit 1, not a silent skip. That block's comment now says Tasks 1.9.3 and 1.9.4 add one line each, so the cost of a config file stays attributed to the task that introduces it.

### File naming and location — `src/<subject>.test.ts`, and it is forced rather than chosen

`packages/shared/src/api-error.test.ts` beside `api-error.ts`. The three constraints the task asked to be named:

- **Inside `src/`, tests are inside `tsc -b`'s program**, so they typecheck, they lint under the full type-aware pass, and they must carry `.js` extensions on relative imports. That is the point — Task 1.9.1 measured that a green runner is not evidence of a compiling tree
- **Outside it, they get none of that**, and the failure is loud rather than silent. The alternative was **built before being rejected**: a `packages/shared/tsconfig.test.json` with `noEmit`, referencing `./tsconfig.json`, with `src/**/*.test.ts` excluded from the main project. It **typechecks correctly** — `tsc -b` on it is exit 0, and a deliberate `const bad: number = REQUEST_ID_HEADER` is `TS2322` at exit 2 — and it **fails `pnpm lint`**, because ESLint's project service only ever discovers a `tsconfig.json` and there is no per-package way to point it at another. Both test files came back as `Parsing error: … was not found by the project service`. So the choice is a test file with type-aware linting or a clean `dist/`, and this workspace takes the linting
- **`packages/shared` is consumed as built output, so the tests emit** — answered below

Everything after this copies the convention, so Tasks 1.9.3 and 1.9.4 inherit the location rather than re-deciding it, and Task 1.9.6 documents it.

**One convention was taken here without being argued, and it should be, because it is load-bearing for Task 1.9.4.** Vitest's `globals` option is **off** — the default — so every test file opens with `import { describe, expect, it } from "vitest"`. The alternative is `globals: true` plus `"vitest/globals"` in each package's tsconfig `types` array, and that is the specific thing `apps/frontend` must not do: its `types: ["vite/client"]` is explicit so that server-side APIs do not typecheck in browser code, and the array's value is that it is a deliberate list rather than that it is short. Explicit imports mean **no package's `types` array is touched at all** to make tests typecheck, which is exactly the pressure Task 1.9.4 was warned to resist. It also costs nothing: three named imports at the top of a file that already carries import statements.

### The emitted-into-`dist` question, answered — and the second half of it is a live defect, not a tidiness one

`tsc -b` emits **8 files for 2 test files** (`.js`, `.d.ts` and both maps), into the directory that _is_ this package's contract.

**The harmless half, measured rather than assumed.** A consumer cannot reach them: `import("@marketpulse/shared/dist/api-error.test.js")` from `apps/backend` is **`ERR_PACKAGE_PATH_NOT_EXPORTED`**, because the `exports` map declares `"."` and nothing else. And the frontend artefact is byte-identical with them in the tree — **271 modules / 343,658 B / 10,926 B / three files / md5 `cba2825c…`**, unchanged since Task 1.7.7 — so no test string reaches either bundle.

**The half that is a real trap, and it was found by running the suite after a build rather than by reasoning.** **Vitest 4's `defaultExclude` is `['**/node_modules/**', '**/.git/**']` and nothing else** — read out of the package; `dist/` is not on it, and the list is shorter than Vitest 3's. So an unconfigured `vitest run` with `dist/` populated collects **4 files and 14 tests** against the 2 and 7 that exist. Every test runs twice, and the second copy comes from whatever the last build emitted rather than from the source just edited — so an edited test shows its old and new selves side by side, and a stale build can make a fixed test still look broken.

`test.include` is scoped to `src/**/*.test.ts`, which takes it back to 2 and 7 with `dist/` populated. It is an **allowlist rather than an `exclude` of `dist/`**, for the reason `config.ts` gives for rejecting `redact`: a denylist's failure mode is the entry nobody added.

One consequence to carry forward: **`tsc -b --clean` deletes the output of the sources that currently exist**, so deleting a test file first orphans its four `dist/` files permanently. That documented trap now applies to test files too, and an orphaned `dist/*.test.js` is exactly the file the paragraph above explains why you do not want lying around.

### The `.js`-extension convention in a test file — it works, and Vitest is a third resolver with the wrong opinion on the negative case

`import { apiError } from "./api-error.js"` from a `.ts` test, in a package with `"type": "module"` and `module: nodenext`, resolves **unconfigured** — 7 passed, no `resolve.alias`, no plugin. Task 1.9.1's decision holds on the real package.

The negative case is the finding. With the extension dropped:

|              | Result                                      |
| ------------ | ------------------------------------------- |
| `tsc -b`     | **TS2835**, exit 2, naming `./api-error.js` |
| `vitest run` | **7 passed, exit 0**                        |

That is the same asymmetry ADR 0003 records for Rolldown, arriving in a third place. `tsc` remains the **only** enforcer of the convention, and the new consequence is that **a green test suite is not evidence the convention was followed**, any more than a green `vite build` is. It is Task 1.9.1's rule from the other direction: the runner transpiles and strips types, it does not check them.

### `@marketpulse/shared` resolution

Nothing to configure. As Task 1.9.1 predicted, this package's own tests import `./api-error.js` **relatively**, not by package name, so the `exports`-versus-alias decision costs this task nothing and lands on Tasks 1.9.3 and 1.9.4. The decision itself is unchanged and unexercised here.

### The tests

Written against what already exists, not a fixture. `apiError()` is the subject and its **branch** is the assertion worth having: `expect("details" in error).toBe(false)` for the no-details path tests the `exactOptionalPropertyTypes` decision rather than the syntax — a spread-based constructor passes a `toEqual` of the three fields and fails that line. `API_ERROR_CODES` and `REQUEST_ID_HEADER` get one assertion each precisely because other packages import them rather than spelling them; the `REQUEST_ID_HEADER` lower-case test exists because Node lower-cases inbound header names, so an upper-case letter would break `request.headers` lookup silently.

### Breaking it on purpose

A check that has never failed is a check that has never been tested. `REQUEST_ID_HEADER` was pointed at the wrong string and the failure propagated at every level:

| Command                                  | Exit                                                                         |
| ---------------------------------------- | ---------------------------------------------------------------------------- |
| `pnpm --filter @marketpulse/shared test` | **1**, `AssertionError: expected 'x-request-id' to be 'nope'`                |
| `pnpm test` (root, through `pnpm -r`)    | **1**, `ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL`                                   |
| `pnpm verify`                            | **1**, after clearing build, lint, `format:check`, `stories` and `env:check` |

The first attempt at this is worth recording because it proved something else by accident: the broken line was long enough to fail **`format:check`**, so `verify` stopped one step early. Re-broken formatting-clean, it fails at `test` as intended.

### Exclusions

**Nothing new needed.** Vitest emits no cache directory and no results file — `git status --porcelain --ignored=matching` after a run shows only the files this task actually wrote. `coverage/` was already in `.gitignore`, `.prettierignore` and `eslint.config.mjs`'s ignores, and producing anything there remains Task 1.9.5's.

### `pnpm verify`, with the new step's duration alongside the existing six

Exit 0, **10.45 s** total against the **10.00 s** baseline measured on the same tree immediately before the install.

| Step           | Duration   | Note                                                                                                  |
| -------------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| `build`        | 3.55 s     |                                                                                                       |
| `lint`         | 3.67 s     |                                                                                                       |
| `format:check` | 2.83 s     |                                                                                                       |
| `stories`      | 0.28 s     |                                                                                                       |
| `env:check`    | 0.28 s     |                                                                                                       |
| **`test`**     | **0.80 s** | was 0.45 s as three `echo`s; Vitest's own reported duration is 92–131 ms, the rest is process startup |

Per `CLAUDE.md`'s standing instruction, read the per-step split rather than the total — the total has now gone up and down across five stories while the tree only grew.

### The placeholder

`packages/shared`'s `test` is `vitest run`. `apps/backend` and `apps/frontend` are still `echo`s, so root `pnpm test` is **one real suite and two placeholders**, and that is not "passing tests". `CLAUDE.md`, `README.md` and ADR 0001 §5 all carry the warning; the first two were updated to say what is now true rather than deleted, and all three are removed together in Task 1.9.7.
