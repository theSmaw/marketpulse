// The process suite's runner (Task 1.10.5).
//
// A second config in this package, which is a shape this repository has
// rejected before — Task 1.9.4 turned down `@storybook/addon-vitest` partly
// because it made `apps/frontend` the only package with two test projects. The
// difference is what the second thing is. That was a second *source of
// assertions* over the same components; this is the same subject driven the one
// way `app.inject()` cannot reach it, and the reason it is separate is
// operational rather than aesthetic:
//
//   - `src/**/*.test.ts` is the suite developers run all day. It is 49 tests in
//     ~200 ms, it needs no build and no socket, and Story 1.9 said explicitly
//     that putting spawn-and-signal tests in the same `vitest run` would make
//     that suite conditional on a build and occasionally flaky.
//   - This suite spawns real processes, binds real ports and waits on real
//     exits. Its shutdown-ceiling test alone takes five seconds, because five
//     seconds is what `SHUTDOWN_TIMEOUT_MS` is.
//
// So there are two configs and two commands, and both are in `pnpm verify` —
// see the root `package.json`. What is NOT acceptable is a suite that only runs
// in CI: `pnpm test:process` runs it locally, from the root, in one command.
//
// A `.ts` and not a `.mts`, like the other two: every workspace package is ESM.
// It is the seventh file needing `eslint.config.mjs`'s trailing
// `disableTypeChecked` block, for the same reason as the sixth — a `.ts` file in
// a package whose tsconfig `include` is `src/**/*`.

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The complement of the unit config's allowlist, and the two are written as
    // one decision: `src/**/*.test.ts` minus `src/**/*.process.test.ts` there,
    // `src/**/*.process.test.ts` here. The `dist/` duplication trap Task 1.9.2
    // measured applies to this file too — `tsc -b` emits a compiled copy of it —
    // so this is scoped to `src` for the same reason.
    include: ["src/**/*.process.test.ts"],

    // Every assertion here waits on a process: for a listener, for an exit, for
    // a drain. The shutdown ceiling is 5 s by design, so the default 5 s test
    // timeout would fail the one test that is behaving correctly. 30 s is a
    // ceiling on a hang rather than a threshold on a measurement — every wait
    // inside the suite has its own bounded deadline and fails naming what it
    // was waiting for, because a Vitest timeout on its own says only that
    // something took too long.
    //
    // Deliberately generous: the runner-to-runner spread on identical work in
    // this repository's own CI is 13.6 s (Task 1.10.3), so a deadline set
    // against one observed laptop run is a deadline set against the fast end of
    // the distribution.
    testTimeout: 30_000,
    hookTimeout: 30_000,

    // One file, one process, no concurrency between files — but the real
    // constraint is inside the file: `describe`/`it` bodies here bind ports and
    // send signals, and Vitest runs tests within a file sequentially by default.
    // Nothing here shares a port with anything else (every test probes for its
    // own), so this is belt and braces rather than load-bearing.
    fileParallelism: false,

    // No coverage block, and that is the finding rather than an omission. V8
    // coverage instruments the code *this* process loads; this suite's subject
    // runs in a child process the runner never sees, and the file it runs is
    // `dist/index.js` while `coverage.include` is `src/**/*.ts`. So closing the
    // testing hole moves the coverage figure by zero. See the write-up in the
    // suite itself.
  },
});
