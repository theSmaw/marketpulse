// Vitest for @marketpulse/backend.
//
// The shape is Task 1.9.2's, copied deliberately rather than re-decided: one
// config per package, beside the package it configures, and no root config —
// root `test` is `pnpm -r run test`, and a root `projects` list would be a
// second entry point meaning "run the tests".
//
// A `.ts` and not a `.mts` for the same reason as the shared package's: that
// finding was about the *root*, whose package.json has no `"type": "module"`.
// Every workspace package is ESM, so this loads as ESM and warns about nothing.

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Scoped to `src`, and it matters more here than it did in
    // `packages/shared`.
    //
    // Vitest 4's `defaultExclude` is `['**/node_modules/**', '**/.git/**']` and
    // nothing else — `dist/` is not on it. Test files live inside this
    // package's tsconfig `include` (forced: ESLint's project service only
    // discovers a `tsconfig.json`, and a test outside `include` is a hard
    // "was not found by the project service" parsing error), so `tsc -b` emits
    // `dist/*.test.js` beside the real output. Left unscoped, every test would
    // run twice — measured at 4 files / 14 tests against 2 / 7 in
    // `packages/shared` — with the second copy coming from whatever the last
    // build emitted rather than from the source just edited.
    //
    // Worse here than there: a backend test builds a server, so the duplicate
    // is a second `buildServer()` running against a stale `dist/`.
    //
    // An `include` rather than an `exclude` of `dist/`, for the reason
    // `config.ts` gives for rejecting `redact`: a denylist's failure mode is
    // the entry nobody added.
    include: ["src/**/*.test.ts"],

    // The only exclude in this file, and both entries are the complement of an
    // allowlist rather than a denylist (Tasks 1.10.5 and 2.2.5). The process
    // suite is `src/**/*.process.test.ts` under `vitest.process.config.ts` and
    // the database suite is `src/**/*.database.test.ts` under
    // `vitest.database.config.ts`, whose `include`s are those same two globs —
    // so the **three** configs partition `src/**/*.test.ts` between them and
    // have to be read as one decision. It is here rather than as a narrower
    // `include` because a narrower include is the trap Task 1.9.4 measured:
    // `apps/frontend`'s glob silently skipped every `.tsx` test, and a shallow
    // `src/*.test.ts` here would silently skip the first nested one.
    //
    // **Nothing enforces the naming**, and the failure is silent both ways: a
    // slow test named `foo.test.ts` lands in this suite, and a
    // `foo.database.test.ts` in a package with no such config runs nowhere at
    // all. The comments in all three files are the only mitigation there has
    // ever been for that class.
    //
    // What this protects is this suite's speed and its independence. It is the
    // one developers run all day — it needs no build and no socket, and since
    // Task 2.2.5 it must also stay independent of a running database, which is
    // the property `pnpm test` is measured against with the database stopped.
    exclude: ["src/**/*.process.test.ts", "src/**/*.database.test.ts"],

    // Coverage (Task 1.9.5). Same shape as `packages/shared`'s and for the same
    // reasons; only the honest hole below is this package's own. Runs under
    // `pnpm coverage` only — never in `test`, never in `verify`.
    coverage: {
      // Vitest's own provider, which does not rewrite the sources it measures.
      // Measured against `@vitest/coverage-istanbul`: identical statements,
      // functions and lines across the workspace, one branch of difference
      // (istanbul counts a default parameter, v8 does not), and no meaningful
      // difference in install cost or runtime.
      provider: "v8",

      // Explicit, because Vitest 4 reports only the files a test loaded when
      // `include` is undefined — which would quietly drop every module no test
      // imports and report a flattering number over what is left. Scoped to
      // `src` for the same reason `test.include` is: `tsc -b` emits a compiled
      // copy of all of this into `dist/`, and a provider pointed at those
      // reports coverage of generated output as if it were source.
      include: ["src/**/*.ts"],

      // Only the tests — and note `coverageConfigDefaults.exclude` is `[]` in
      // Vitest 4, so nothing is excluded that this file does not exclude.
      // **`index.ts` is deliberately not excluded**, and it is
      // the most important line in this block: it is the process — `listen`,
      // both signal handlers, the shutdown ceiling and both crash handlers —
      // and `app.inject()` reaches none of it, so it reports 0% and drags the
      // package's figure down. That is the correct behaviour. Excluding it
      // would hide the one part of this server that no runner in the workspace
      // can currently reach; Story 1.10 owns a process-level test, and until it
      // exists the hole should be visible in the number.
      exclude: ["src/**/*.test.ts"],

      reporter: ["text", "html"],

      // No threshold. See the story write-up: a minimum here would be met by
      // testing what is easy, and half of what is untested is untestable by
      // this runner.
    },
  },
});
