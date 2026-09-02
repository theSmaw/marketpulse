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
  },
});
