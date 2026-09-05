// The migration runner: how a change to the description of this database
// reaches a running one (Task 2.2.2).
//
// **What this file is.** Kysely's `Migrator`, driving the plain `.sql` files in
// `apps/backend/migrations/` through a provider we own, over the pool
// `database.ts` already builds. Task 2.2.1 measured five candidates and
// recorded the arguments in the story's `DATA-LAYER.md`; the short version is
// that Kysely is one store entry with no dependencies, no build step and
// nothing generated, and that a hand-rolled runner is the `@fastify/cors` case
// rather than the `react-error-boundary` case — a plausible one, differing from
// a correct one only by recording its bookkeeping row outside the transaction,
// printed `applied 0002_partial.sql` at **exit 0** over a database whose tables
// did not exist.
//
// **The single most important line in it is the exit code.** `migrateToLatest()`
// does not throw — it *resolves* to `{ error, results }`, and the node process
// exits 0 whatever happened. So a wrapper that does not read `error` and fail
// on it is a green migration step that applied nothing, which is the same
// failure the hand-rolled runner had, reintroduced from the other side. That is
// why {@link summariseMigration} is a pure function with its own tests rather
// than a `console.log` inline: the property "a failure exits non-zero" is
// reachable from an assembled instance, and this repository's rule is that a
// test beats another `verify` step when it is.
//
// **Where migrations live, and why here.** `apps/backend/migrations/`. The
// question that decides it is which package the runner is a dependency of, and
// the answer is forced: `kysely` is imported by TypeScript that `tsc -b`
// compiles, and pnpm links a workspace dependency only into the package that
// declares it — Task 1.13.1 found out expensively that a bare root-level
// directory fails twice, on `TS1295` because the nearest `package.json` is the
// root's, and on `MODULE_NOT_FOUND`. A fifth workspace package would be a
// package whose only consumer is this one. And `apps/backend` is the only thing
// in this repository that connects to the database at all, so the schema it
// depends on lives beside it. The root script `pnpm migrate` is the name the
// mechanism is invoked by — acceptance criterion 1, and Story 1.10's rule that
// the pipeline must not define its own database steps.
//
// **The `Kysely` instance is constructed here and is not exported**, which is
// the whole of Task 2.2.1's query-layer decision rather than an implementation
// detail. Epic 13 enforces temporal isolation with a `KyselyPlugin` attached by
// `withPlugin`, and because that returns a *different object*, the seam holds
// only if there is no unplugged handle anywhere to import. There is not one:
// this module builds one, uses it for the migration and destroys it, and
// `database.ts` gained nothing at all. Story 2.8 writes the first `selectFrom`
// and owns where the *isolated* handle lives.
//
// **Forward-only.** There is no `down` and no `migrateDown`. A `down` that has
// never been executed is a claim rather than a mechanism, and the one that
// matters — reversing a migration that dropped a column with data in it —
// cannot be written at all. The answer to a migration we regret is always a new
// forward migration. Kysely makes `down` optional, checked rather than assumed.

import { readFile, readdir } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { inspect } from "node:util";

import { Kysely, PostgresDialect, sql } from "kysely";
// The migrator is a **separate subpath export**, and this is not what the
// documentation examples show. `import { Migrator } from "kysely"` is a hard
// `SyntaxError: The requested module 'kysely' does not provide an export named
// 'Migrator'` at run time — and worse at compile time, because the root does
// still export the *names*: they resolve to `KyselyTypeError<"import from
// 'kysely/migration' instead">` stubs, so the mistake is a confusing type error
// rather than a missing one. Types come from here too, for the same reason.
import { Migrator } from "kysely/migration";
import type {
  Migration,
  MigrationProvider,
  MigrationResultSet,
} from "kysely/migration";

import { ConfigError, loadConfig, loadEnvFile } from "./config.js";
import { createDatabasePool } from "./database.js";
import type { DatabaseLogger } from "./database.js";

/**
 * Where the `.sql` files are, resolved from this module rather than from the
 * working directory.
 *
 * This file is compiled to `dist/migrate.js`, so `..` is the package root and
 * the directory is `apps/backend/migrations`. Resolving from `process.cwd()`
 * instead would make `pnpm migrate` and a migration run from anywhere else two
 * different commands, which is the class of bug `config.ts` avoids by resolving
 * `.env` from `import.meta.dirname` too.
 *
 * **Consequence handed to Task 2.2.7, stated rather than left to be
 * discovered:** `apps/backend/package.json`'s `files` field is `["dist",
 * "!dist/**\/*.test.*"]`, so `pnpm deploy` — and therefore the container image
 * — does **not** carry this directory. That is not a defect today, because
 * nothing has migrated a deployed database yet; it is the fact that decides
 * between "a step in `deploy.yml` before the container rolls" and "a job the
 * container runs at boot", and the second of those needs `migrations` added to
 * `files` in the same change.
 */
const MIGRATIONS_DIR = resolve(import.meta.dirname, "../migrations");

/**
 * What a migration file may be called.
 *
 * **A four-digit sequence number, not a timestamp, and the reason is which
 * failure is loud.** The two differ in exactly one situation that matters: two
 * developers on two branches, each adding a migration.
 *
 *   - A **sequence number collides**. Both branches write `0002_*`, and the
 *     second to merge is a merge conflict on a filename — loud, resolved by a
 *     human before it reaches any database, and resolved in the pull request
 *     where both changes are visible.
 *   - A **timestamp interleaves**. Both merge cleanly, and the migrations then
 *     apply in an order neither author tested, on every database, silently.
 *
 * Timestamps are the more common convention precisely because they never
 * conflict, which is the property being rejected here. This repository has
 * three ports, one lockfile and one `pnpm-workspace.yaml` and takes the same
 * position on all of them: a merge conflict is a cheap way to be told two
 * changes met.
 *
 * The case that breaks a sequence number is a branch that merges *after* its
 * number was taken by someone else and is renamed rather than conflicting —
 * which is only reachable if the two migrations were added to different
 * numbers. Kysely catches that one too, and by name: a migration inserted
 * before an already-applied one fails with *"corrupted migrations: expected
 * previously executed migration 0003 to be at index 1 but 0002 was found in its
 * place"* rather than being applied out of order. So the loud failure has a
 * backstop at the database as well as in git.
 *
 * The name after the number is lower snake case so it is stable across
 * filesystems that disagree about case, and the whole basename is the
 * bookkeeping key — Kysely sorts by it with `localeCompare` and records it in
 * `kysely_migration.name`.
 */
const MIGRATION_NAME = /^\d{4}_[a-z0-9]+(?:_[a-z0-9]+)*$/;

/**
 * Read `apps/backend/migrations/*.sql` and hand Kysely one migration per file.
 *
 * About fifteen lines, which is the whole of what was bought rather than
 * written. Kysely ships a `FileMigrationProvider`, and it is not this: that one
 * imports JavaScript modules, which is the TypeScript-migration shape Task
 * 2.2.1 rejected because a TypeScript migration compiles into `dist/` and the
 * artefact reviewed in a pull request is then not the artefact executed.
 *
 * The whole file body goes through `sql.raw()` as one statement, inside the
 * transaction Kysely opens per migration — verified in the spike with a
 * multi-statement body, and it is what makes Postgres's transactional DDL do
 * the work: a file that fails half way leaves nothing behind and records
 * nothing.
 *
 * Two things it refuses rather than tolerates, because both are silent
 * otherwise. A filename that does not match {@link MIGRATION_NAME} is an error
 * rather than a skipped file — a skipped migration is the failure this whole
 * mechanism exists to prevent, and a typo'd name is the cheapest way to cause
 * one. And an empty directory is an error too: "no migrations found" and "every
 * migration already applied" both print nothing useful otherwise, and only one
 * of them means the runner is looking in the wrong place.
 */
export class SqlFileMigrationProvider implements MigrationProvider {
  readonly #directory: string;

  constructor(directory: string = MIGRATIONS_DIR) {
    this.#directory = directory;
  }

  async getMigrations(): Promise<Record<string, Migration>> {
    // `readdir` returns the filesystem's order, which is not an order. Kysely
    // sorts by name itself before executing, so this sort is for the error
    // message below and for anything reading this record; the guarantee comes
    // from the migrator.
    const files = (await readdir(this.#directory)).filter((file) =>
      file.endsWith(".sql"),
    );
    files.sort();

    if (files.length === 0) {
      throw new Error(`No .sql migrations found in ${this.#directory}.`);
    }

    const migrations: Record<string, Migration> = {};

    for (const file of files) {
      const name = basename(file, ".sql");

      if (!MIGRATION_NAME.test(name)) {
        throw new Error(
          `Migration file \`${file}\` is not named \`NNNN_lower_snake_case.sql\`. ` +
            "The name is the bookkeeping key and the ordering, so it is checked rather " +
            "than guessed at.",
        );
      }

      const body = await readFile(resolve(this.#directory, file), "utf8");

      migrations[name] = {
        // Declared with our own parameter type rather than Kysely's
        // `Kysely<any>`, so nothing in this file is `any` and the strict lint
        // pass has nothing to say. `Migration.up` is a method, so its parameter
        // is bivariant and this is assignable.
        up: async (db: Kysely<unknown>): Promise<void> => {
          await sql.raw(body).execute(db);
        },
        // No `down`, deliberately. See the header.
      };
    }

    return migrations;
  }
}

/** What a run produced, in the form the caller needs to exit on. */
export interface MigrationOutcome {
  /** Exactly the process exit code. 0 only when nothing went wrong. */
  readonly exitCode: 0 | 1;
  /** Lines for stdout. */
  readonly lines: readonly string[];
  /** Lines for stderr. Empty when `exitCode` is 0. */
  readonly errors: readonly string[];
}

/**
 * Render whatever a migration threw.
 *
 * Kysely types `error` as `unknown`, which is honest — it is whatever the file
 * threw, and a `.sql` file's failure arrives as a `DatabaseError` from `pg`
 * carrying the SQLSTATE in its message. `String()` on an `unknown` is
 * `@typescript-eslint/no-base-to-string` at error, and it deserves to be: a
 * plain object stringifies to `[object Object]`, which would turn the one line
 * telling somebody why their migration failed into nothing at all.
 */
function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  // Not an `Error`. `inspect` rather than `String()` or `JSON.stringify()`:
  // the first is `@typescript-eslint/no-base-to-string` at error and deserves
  // to be, because a plain object stringifies to `[object Object]` and would
  // turn the one line telling somebody why their migration failed into nothing
  // at all; the second returns `undefined` for a function or a symbol and
  // throws on a cycle. `inspect` always returns a string.
  return typeof error === "string" ? error : inspect(error);
}

/**
 * Turn Kysely's `{ error, results }` into an exit code and something to print.
 *
 * **This function exists so that the exit code is a tested property rather than
 * a remembered one.** `migrateToLatest()` never throws; a failed migration
 * arrives as a *return value*, with `results` carrying
 * `status: "Error"` for the one that failed, and a runner that only looks at
 * `results` — or at nothing — is green. Task 2.2.1 produced exactly that bug
 * twice, once in a hand-rolled runner and once in Kysely itself, and handed
 * this task the obligation to make it fail once and be seen to.
 *
 * `error` is checked first and on its own. Both halves matter: an error can
 * arrive with `results` **undefined**, when Kysely failed before working out
 * what to run — a corrupted migration list, a missing file, an unreachable
 * database — so a check written over `results` alone misses the whole class.
 *
 * `error` is `unknown` in Kysely's own type, which is honest: it is whatever a
 * migration threw. It is rendered rather than re-thrown, because a stack from
 * inside a SQL driver is not what tells someone which file to look at.
 */
export function summariseMigration(
  resultSet: MigrationResultSet,
): MigrationOutcome {
  const lines: string[] = [];
  const errors: string[] = [];

  const results = resultSet.results ?? [];

  for (const result of results) {
    const mark =
      result.status === "Success" ? "✓" : result.status === "Error" ? "✗" : "○";
    lines.push(`  ${mark} ${result.migrationName}`);
  }

  if (resultSet.error === undefined) {
    lines.push(
      results.length === 0
        ? "\n  Already up to date — no migrations to apply.\n"
        : `\n  Applied ${String(results.length)} migration${results.length === 1 ? "" : "s"}.\n`,
    );

    return { exitCode: 0, lines, errors };
  }

  const failed = results.find((result) => result.status === "Error");
  const detail = describeError(resultSet.error);

  // The two halves say different things because they *are* different failures,
  // and telling a reader "it was rolled back" when nothing ran is how a
  // diagnostic becomes a red herring. `results` undefined or holding no
  // `Error` means Kysely never got as far as executing anything — a corrupted
  // migration list, a file this provider refused, an unreachable database.
  if (failed === undefined) {
    errors.push(
      "\nThe migration run failed before any migration was executed, so the database is\n" +
        "exactly as it was.",
      `\n  ${detail}\n`,
    );
  } else {
    errors.push(
      `\nMigration \`${failed.migrationName}\` failed and was rolled back.`,
      `\n  ${detail}\n`,
      // Said here rather than in a document, because this is where somebody is
      // reading when they need it. It is a property of Postgres's transactional
      // DDL plus Kysely putting the bookkeeping row in the same transaction,
      // and Task 2.2.6 is where every failure class gets produced and recorded.
      "It ran inside a transaction, so it left nothing behind and was not recorded. Fix\n" +
        "the file and run `pnpm migrate` again.\n",
    );
  }

  return { exitCode: 1, lines, errors };
}

/**
 * A logger for a command-line run.
 *
 * `createDatabasePool` takes one because it has no business deciding where a
 * message goes. The pool's `warn` records a dropped connection and its `debug`
 * records an Entra token mint — the second is worth seeing when a deployed
 * migration cannot authenticate and is noise otherwise, so it follows
 * `LOG_LEVEL` the way everything else in this application does. Both go to
 * stderr, so stdout carries the migration list and nothing else.
 */
function createConsoleLogger(verbose: boolean): DatabaseLogger {
  const write = (object: object, message: string): void => {
    process.stderr.write(`  ${message} ${JSON.stringify(object)}\n`);
  };

  return {
    warn: write,
    debug: verbose ? write : (): void => undefined,
  };
}

/**
 * Migrate the configured database to the latest migration.
 *
 * Returns an exit code rather than calling `process.exit` itself, for the
 * reason `config.ts` throws rather than exiting: a function that exits cannot
 * be tested and cannot be reused. `scripts/run-migrations.mjs` is what turns
 * this into a process result.
 *
 * **Where the database is comes from one place** — the backend's own
 * `loadConfig()`, which is what `scripts/local-database.mjs`,
 * `scripts/pair-addresses.mjs` and `scripts/check-ready.mjs` already read. A
 * migration runner with its own copy of the connection settings has forked the
 * definition of where the database is on day one. It also means both
 * `DATABASE_AUTH` modes work with no code here at all: `createDatabasePool`
 * resolves a password locally and mints a Microsoft Entra access token per
 * connection deployed, which is exactly the thing Task 2.2.7 would otherwise
 * have to invent.
 */
export async function runMigrations(): Promise<MigrationOutcome> {
  loadEnvFile();

  let config;

  try {
    config = loadConfig();
  } catch (error) {
    return {
      exitCode: 1,
      lines: [],
      errors: [
        `\n${error instanceof ConfigError ? error.message : String(error)}\n`,
      ],
    };
  }

  const pool = createDatabasePool(
    config.database,
    createConsoleLogger(
      config.logLevel === "debug" || config.logLevel === "trace",
    ),
  );

  // The one `Kysely` instance in this repository, and it does not leave this
  // function. See the header.
  //
  // **`unknown` and not `Database`, decided in Task 2.2.4 rather than left at a
  // default.** `apps/backend/src/schema.ts` now exists and names `securities`,
  // so the tidy-up presents itself; it is wrong three times over. That
  // interface describes the schema **after** every migration has run, so a
  // migrator typed with it asserts a shape that is false for the whole duration
  // of the thing it is doing — during `0002` there is no `securities` table. It
  // would buy nothing, because a migration body goes through `sql.raw()` and no
  // `selectFrom` exists in this file. And it would make the runner depend at
  // compile time on the description of its own output, so a future migration
  // that dropped a table would break the compilation of the runner that has to
  // apply it. A migrator is the one place in this repository that should not
  // know the schema.
  const db = new Kysely<unknown>({ dialect: new PostgresDialect({ pool }) });

  const migrator = new Migrator({
    db,
    provider: new SqlFileMigrationProvider(),
    // `allowUnorderedMigrations` is left at its default of `false`
    // deliberately, and it is the setting that makes the sequence-number rule
    // above enforceable at the database rather than only in git: with it off,
    // a migration inserted before an already-applied one, or an applied one
    // deleted from the tree, fails by name as `corrupted migrations: …`.
    // `migrationTableName` and `migrationLockTableName` are left at their
    // defaults too — `kysely_migration` and `kysely_migration_lock` — because a
    // rename buys nothing and gives every reader of this database two names to
    // reconcile.
  });

  try {
    return summariseMigration(await migrator.migrateToLatest());
  } finally {
    // `destroy()` ends the underlying pool, so `closeDatabasePool` must not
    // also be called — `pg` rejects a second `end()`.
    await db.destroy();
  }
}
