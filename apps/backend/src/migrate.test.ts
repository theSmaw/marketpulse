// The migration mechanism's fast tests (Task 2.2.2).
//
// **What is in here, and why it is in the fast suite at all.** The thing this
// task most needs to hold is that a *failed migration exits non-zero*, and
// Kysely makes that a property of our code rather than of the library:
// `migrateToLatest()` never throws, it resolves to `{ error, results }`, and a
// runner that does not read `error` is green over a database whose tables do
// not exist. That is reachable without a database — the result set is a plain
// object — so it is a unit test, and this repository's rule is that a test
// beats another `verify` step when the thing being checked is reachable from an
// assembled instance.
//
// **This file opens no socket and needs no database.** `runMigrations()` is
// deliberately not called here; what is called is the pure summariser and the
// provider, which reads files. Story 1.9's property that `pnpm test` needs no
// build and no socket survives Story 2.2's first task intact, and Task 2.2.5
// owns the level that does talk to a real database.

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { MigrationResultSet } from "kysely/migration";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SqlFileMigrationProvider, summariseMigration } from "./migrate.js";

describe("summariseMigration", () => {
  it("exits 0 and says so when there was nothing to apply", () => {
    const outcome = summariseMigration({ results: [] });

    expect(outcome.exitCode).toBe(0);
    expect(outcome.errors).toEqual([]);
    expect(outcome.lines.join("\n")).toContain("Already up to date");
  });

  it("exits 0 and names each migration it applied", () => {
    const outcome = summariseMigration({
      results: [
        { migrationName: "0001_baseline", direction: "Up", status: "Success" },
        {
          migrationName: "0002_securities",
          direction: "Up",
          status: "Success",
        },
      ],
    });

    expect(outcome.exitCode).toBe(0);
    expect(outcome.lines.join("\n")).toContain("0001_baseline");
    expect(outcome.lines.join("\n")).toContain("0002_securities");
    expect(outcome.lines.join("\n")).toContain("Applied 2 migrations");
  });

  // The one that matters. A failed migration arrives as a *return value*, with
  // every other field looking exactly like a run that worked, and Task 2.2.1
  // produced this bug twice — once in a hand-rolled runner and once in Kysely
  // itself. Break the `error` check in `summariseMigration` and this is what
  // goes red.
  it("exits 1 when a migration failed, even though nothing threw", () => {
    const resultSet: MigrationResultSet = {
      error: new Error(
        'duplicate key value violates unique constraint "x_pkey"',
      ),
      results: [
        { migrationName: "0001_baseline", direction: "Up", status: "Success" },
        { migrationName: "0002_broken", direction: "Up", status: "Error" },
        { migrationName: "0003_later", direction: "Up", status: "NotExecuted" },
      ],
    };

    const outcome = summariseMigration(resultSet);

    expect(outcome.exitCode).toBe(1);
    expect(outcome.errors.join("\n")).toContain("0002_broken");
    expect(outcome.errors.join("\n")).toContain("duplicate key value");
  });

  // The half a check written over `results` alone would miss: Kysely can fail
  // before it has worked out what to run — a corrupted migration list, a file
  // the provider refused, an unreachable database — and then `results` is
  // undefined and there is no `status: "Error"` anywhere to find.
  it("exits 1 when the run failed before any migration was executed", () => {
    const outcome = summariseMigration({
      error: new Error(
        "corrupted migrations: previously executed migration 0003 is missing",
      ),
    });

    expect(outcome.exitCode).toBe(1);
    expect(outcome.errors.join("\n")).toContain("corrupted migrations");
    expect(outcome.errors.join("\n")).toContain(
      "failed before any migration was executed",
    );
    // And it must not claim a rollback that did not happen.
    expect(outcome.errors.join("\n")).not.toContain("rolled back");
  });

  // `error` is `unknown` in Kysely's own type, because it is whatever a
  // migration threw. `String()` on a plain object is `[object Object]`, which
  // would turn the one line naming the cause into nothing at all.
  it("renders a thrown value that is not an Error", () => {
    const outcome = summariseMigration({ error: { code: "42P07" } });

    expect(outcome.exitCode).toBe(1);
    expect(outcome.errors.join("\n")).toContain("42P07");
  });
});

describe("SqlFileMigrationProvider", () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "marketpulse-migrations-"));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it("keys each migration on the file's basename", async () => {
    await writeFile(join(directory, "0001_baseline.sql"), "-- nothing\n");
    await writeFile(join(directory, "0002_securities.sql"), "select 1;\n");

    const migrations = await new SqlFileMigrationProvider(
      directory,
    ).getMigrations();

    expect(Object.keys(migrations).sort()).toEqual([
      "0001_baseline",
      "0002_securities",
    ]);
  });

  // Forward-only, checked rather than stated. A `down` that has never been
  // executed is a claim rather than a mechanism.
  it("declares no down migration", async () => {
    await writeFile(join(directory, "0001_baseline.sql"), "-- nothing\n");

    const migrations = await new SqlFileMigrationProvider(
      directory,
    ).getMigrations();

    // Asserted as "the object has exactly one key" rather than by reading
    // `.down`, because referencing a method without calling it is
    // `@typescript-eslint/unbound-method` at error — and this is the stronger
    // assertion anyway.
    expect(Object.keys(migrations["0001_baseline"] ?? {})).toEqual(["up"]);
  });

  // A skipped migration is the failure the whole mechanism exists to prevent,
  // and a typo'd filename is the cheapest way to cause one — so a name that
  // does not match is an error rather than a file quietly left out.
  it("refuses a file that is not NNNN_lower_snake_case.sql", async () => {
    await writeFile(join(directory, "0001_baseline.sql"), "-- nothing\n");
    await writeFile(join(directory, "add-securities.sql"), "select 1;\n");

    await expect(
      new SqlFileMigrationProvider(directory).getMigrations(),
    ).rejects.toThrow("add-securities.sql");
  });

  // "No migrations found" and "every migration already applied" both print
  // nothing useful, and only one of them means the runner is looking in the
  // wrong directory.
  it("refuses a directory with no migrations in it", async () => {
    await expect(
      new SqlFileMigrationProvider(directory).getMigrations(),
    ).rejects.toThrow("No .sql migrations found");
  });

  it("ignores files that are not .sql", async () => {
    await writeFile(join(directory, "0001_baseline.sql"), "-- nothing\n");
    await writeFile(join(directory, "README.md"), "notes\n");

    const migrations = await new SqlFileMigrationProvider(
      directory,
    ).getMigrations();

    expect(Object.keys(migrations)).toEqual(["0001_baseline"]);
  });
});
