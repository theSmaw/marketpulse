// The database suite's runner (Task 2.2.5).
//
// **A third config in this package, and the argument is Task 1.10.5's rather
// than a new one.** Epic 1's five levels rest on a stated rule: `pnpm test` is
// fast, needs no build and needs no socket. A database-backed test breaks all
// three at once — it needs a built tree, it opens a socket, and it takes
// seconds rather than milliseconds. So it gets the `test:process` treatment:
// its own glob, its own config, its own command, and the reason written in both
// files.
//
// **The three globs are ONE decision and have to be read together**, which is
// the trap Task 1.10.5 named and this task doubles:
//
//   - `vitest.config.ts`          includes `src/**/*.test.ts`
//                                 excludes `src/**/*.process.test.ts`
//                                          `src/**/*.database.test.ts`
//   - `vitest.process.config.ts`  includes `src/**/*.process.test.ts`
//   - this file                   includes `src/**/*.database.test.ts`
//
// **Nothing enforces the naming**, and the failure is silent in both
// directions: a database test named `foo.test.ts` runs in the suite developers
// run all day — which would make that suite need a database — and a
// `foo.database.test.ts` added to `packages/shared` or `apps/frontend` runs
// **nowhere at all**, because no other package has this config. This comment is
// the only mitigation that has ever existed for that class.
//
// The neighbour that makes it live rather than theoretical: this package
// already holds `src/migrate.test.ts`, ten **fast** tests about the same
// mechanism that deliberately open no socket — the provider reads files from a
// temporary directory and the summariser is pure. So there are migration tests
// on both sides of the partition, and a file named a hair differently lands in
// the wrong one.
//
// A `.ts` and not a `.mts`, like the other two: every workspace package is ESM.
// It is the eighth file needing `eslint.config.mjs`'s trailing
// `disableTypeChecked` block, for the same reason as the seventh.

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // See the header: the complement of the unit config's second exclude.
    // Scoped to `src` because `tsc -b` emits a compiled copy of every test into
    // `dist/`, which is the duplication trap Task 1.9.2 measured.
    include: ["src/**/*.database.test.ts"],

    // Creating a database, migrating it and dropping it are each a round trip
    // to a real server, and the whole fixture runs inside one `beforeAll`. 30 s
    // is a ceiling on a hang rather than a threshold on a measurement — the
    // same figure and the same reasoning as the process config, including that
    // CI's runner-to-runner spread on identical work is 13.6 s, so a deadline
    // set against one observed laptop run is set against the fast end of the
    // distribution.
    testTimeout: 30_000,
    hookTimeout: 30_000,

    // Load-bearing here, unlike in the process config where it is belt and
    // braces. Every file in this suite would create and drop a database with
    // the **same name**, so two files in parallel is one of them dropping the
    // other's database mid-assertion. There is one file today; this is what
    // keeps a second one from being a race nobody predicted.
    fileParallelism: false,

    // No coverage block, for a reason that is *not* the process suite's. There,
    // the subject runs in a child process the runner never instruments, so
    // coverage is structurally zero. Here the subject is in-process and would
    // instrument fine — the reason is that `pnpm coverage` is
    // `pnpm -r run coverage`, which would then need a database, and Story 1.9's
    // whole point is that the everyday commands do not.
  },
});
