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
  },
});
