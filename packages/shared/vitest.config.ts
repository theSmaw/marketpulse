// Vitest for @marketpulse/shared.
//
// There is deliberately **no root vitest config**. Root `test` is
// `pnpm -r run test`, one of only two verbs that genuinely fan out, and a root
// config with a `projects` list would be a second entry point meaning "run the
// tests" — the thing Story 1.9 says explicitly not to introduce. So the shape
// here matches the shape the workspace already has: one config per package,
// beside the package it configures, and the fan-out stays the fan-out.
//
// This file is a `.ts` rather than the `.mts` Task 1.9.1 called for. That
// finding was about the *root*, whose package.json has no `"type": "module"`
// and which therefore loads a `.ts` config as CommonJS and warns about it.
// Every workspace package is ESM, so a `.ts` config here loads as ESM and
// warns about nothing — verified, zero warnings.

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Scoped to `src`, and this is load-bearing rather than tidy.
    //
    // Test files live beside their subject inside `src/`, which is forced
    // rather than chosen: ESLint's project service only discovers a
    // `tsconfig.json`, so a test file outside this package's `include` is a
    // hard parsing error ("was not found by the project service") and loses the
    // type-aware rules entirely. Measured in Task 1.9.2, along with the
    // alternative — a separate `tsconfig.test.json` with `noEmit` — which
    // typechecks correctly and fails lint for exactly that reason.
    //
    // The consequence is that `tsc -b` emits `dist/*.test.js` alongside the
    // real output. Those copies are unreachable to a consumer, because this
    // package's `exports` map declares "." and nothing else — but they are not
    // unreachable to the runner. **Vitest 4's `defaultExclude` is only
    // `['**/node_modules/**', '**/.git/**']`; `dist/` is not on it.** Left
    // unscoped, a build makes every test run twice — measured at 4 files and 14
    // tests against the 2 and 7 that exist — with the second copy coming from
    // whatever the last build emitted rather than from the source just edited.
    //
    // An `include` rather than an `exclude` of `dist/`, for the reason
    // `config.ts` gives for rejecting `redact`: a denylist's failure mode is
    // the entry nobody added. This says where tests are, which is also the
    // convention Task 1.9.6 documents.
    include: ["src/**/*.test.ts"],

    // Coverage (Task 1.9.5). Configured here rather than at the root for the
    // same reason the runner is: root `coverage` is a `pnpm -r` fan-out, so
    // each package answers for itself and there are three reports rather than
    // one merged one. It runs only under `pnpm coverage` — never in `test` and
    // never in `verify`.
    coverage: {
      // The v8 provider, which is Vitest's own and does not rewrite the
      // sources it measures. Measured against `@vitest/coverage-istanbul` on
      // this package and on `apps/frontend`: identical statements, functions
      // and lines, and one branch of difference — istanbul counts a default
      // parameter (`compact = false`) as a branch and v8 does not. Install cost
      // is a wash (+31 store entries against +29) and so is runtime.
      provider: "v8",

      // **An explicit `include` is the whole point, not tidiness.** Vitest 4
      // reports only the files a test actually loaded when `include` is left
      // undefined — so this package, whose `ticker.ts`, `anomaly.ts` and
      // `feed-status.ts` no test imports, reports **100%** with an empty file
      // table. That is the "green tick that means nothing" this story exists to
      // remove. Scoped to `src` for the reason `test.include` is: `dist/` holds
      // a compiled copy of every test and every source, and a provider
      // instrumenting those reports coverage of generated output as source.
      include: ["src/**/*.ts"],

      // The tests themselves are not the subject. This is belt-and-braces
      // rather than the only thing holding: Vitest withholds the files it ran
      // as tests on its own, and `coverageConfigDefaults.exclude` in Vitest 4
      // is **`[]`** — read out of the package, the same shape as Task 1.9.2's
      // finding about `defaultExclude`. So the runner's own list protects
      // nothing here, and every exclusion this workspace wants it has to say.
      // Everything else under `src` stays in — including `index.ts`, a pure
      // re-export barrel with no statements, which costs the percentage
      // nothing either way.
      exclude: ["src/**/*.test.ts"],

      // `text` for the terminal, `html` for the lines behind a number.
      // `coverage/` is already in .gitignore, .prettierignore and
      // eslint.config.mjs's ignores; anywhere else needs three new entries.
      reporter: ["text", "html"],

      // No threshold, deliberately — see the story write-up. A minimum set now
      // would be a number invented before there is anything to hold it to.
    },
  },
});
