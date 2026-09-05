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
// `database.ts` gained nothing at all. Story 2.4 writes the first `selectFrom`
// and owns where the *isolated* handle lives.
//
// **Forward-only.** There is no `down` and no `migrateDown`. A `down` that has
// never been executed is a claim rather than a mechanism, and the one that
// matters — reversing a migration that dropped a column with data in it —
// cannot be written at all. The answer to a migration we regret is always a new
// forward migration. Kysely makes `down` optional, checked rather than assumed.

import { createHash } from "node:crypto";
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
 * Where the checksum of each applied migration is recorded (Task 2.2.7).
 *
 * **Task 2.2.5 declined this and named Task 2.2.7 as the trigger; 2.2.6 then
 * produced the consequence rather than arguing it.** An index appended to an
 * already-applied `0002_securities.sql` — the realistic edit, because nothing
 * in the database suite asserts on indexes — took `pnpm migrate` to `Already up
 * to date` at **exit 0** with the index absent, and `pnpm test:database` to 23
 * passed at exit 0, because that suite migrates a database of its own from
 * empty and never looks at the one that is wrong. Two green instruments over a
 * broken database. The only recovery that worked was dropping it and
 * re-migrating, and from Task 2.2.7 onward there is a managed server with a
 * `CanNotDelete` lock on it where that is not an available answer.
 *
 * **Singular, mirroring `kysely_migration` rather than the plural rule in
 * `../migrations/README.md`.** That rule is about domain tables; this is
 * bookkeeping, it is read next to Kysely's two tables in `\dt`, and matching
 * the neighbours it belongs with is worth more here than matching a convention
 * about rows describing things in the world.
 *
 * **It is created by this runner rather than by a migration**, which is the one
 * thing about it that looks wrong. A migration cannot create it, because the
 * first migration that records into it is `0001`, which on every existing
 * database has already run — so a migration-created table would be recorded as
 * applied on precisely the databases that never got the table. `create table if
 * not exists` from the runner is the same shape Kysely uses for its own two
 * tables, which is the strongest available argument that it is not a novelty.
 */
const MIGRATION_CHECKSUM_TABLE = "migration_checksum";

/**
 * The identity of a migration's contents.
 *
 * SHA-256 of the file's bytes as UTF-8, hex. Not a cryptographic requirement —
 * the threat is a developer editing an applied file, not an adversary forging
 * one — but there is no reason to pick something weaker, and a hex digest is
 * something a human can compare in an error message.
 */
export function checksumOf(body: string): string {
  return createHash("sha256").update(body, "utf8").digest("hex");
}

/** One `.sql` file on disk, read once and used by both the provider and the checksum pass. */
export interface MigrationFile {
  /** The basename without `.sql`, which is Kysely's bookkeeping key. */
  readonly name: string;
  /** The whole file body, executed as one statement inside one transaction. */
  readonly body: string;
  /** {@link checksumOf} the body. */
  readonly checksum: string;
}

/**
 * Read and validate the migration directory.
 *
 * Lifted out of {@link SqlFileMigrationProvider} in Task 2.2.7 because the
 * checksum pass needs the same bodies the provider executes, and reading them
 * twice through two code paths is how the hash stops being a hash of what ran.
 *
 * Two things it refuses rather than tolerates, because both are silent
 * otherwise. A filename that does not match {@link MIGRATION_NAME} is an error
 * rather than a skipped file — a skipped migration is the failure this whole
 * mechanism exists to prevent, and a typo'd name is the cheapest way to cause
 * one. And an empty directory is an error too: "no migrations found" and "every
 * migration already applied" both print nothing useful otherwise, and only one
 * of them means the runner is looking in the wrong place.
 */
export async function readMigrationFiles(
  directory: string = MIGRATIONS_DIR,
): Promise<readonly MigrationFile[]> {
  // `readdir` returns the filesystem's order, which is not an order. Kysely
  // sorts by name itself before executing, so this sort is for the error
  // message below and for anything reading this record; the guarantee comes
  // from the migrator.
  const files = (await readdir(directory)).filter((file) =>
    file.endsWith(".sql"),
  );
  files.sort();

  if (files.length === 0) {
    throw new Error(`No .sql migrations found in ${directory}.`);
  }

  const read: MigrationFile[] = [];

  for (const file of files) {
    const name = basename(file, ".sql");

    if (!MIGRATION_NAME.test(name)) {
      throw new Error(
        `Migration file \`${file}\` is not named \`NNNN_lower_snake_case.sql\`. ` +
          "The name is the bookkeeping key and the ordering, so it is checked rather " +
          "than guessed at.",
      );
    }

    const body = await readFile(resolve(directory, file), "utf8");

    read.push({ name, body, checksum: checksumOf(body) });
  }

  return read;
}

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
 * transaction the migrator opens for the run — verified in the spike with a
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
    const files = await readMigrationFiles(this.#directory);
    const migrations: Record<string, Migration> = {};

    for (const file of files) {
      migrations[file.name] = {
        // Declared with our own parameter type rather than Kysely's
        // `Kysely<any>`, so nothing in this file is `any` and the strict lint
        // pass has nothing to say. `Migration.up` is a method, so its parameter
        // is bivariant and this is assignable.
        up: async (db: Kysely<unknown>): Promise<void> => {
          await sql.raw(file.body).execute(db);
          // **The checksum row goes in HERE and not in the runner**, and that
          // is the whole reason this mechanism is worth having rather than a
          // second bookkeeping system that can disagree with the first. `db` is
          // the transaction the migrator is running in, and Kysely writes its
          // own `kysely_migration` row in that same transaction — so the change,
          // the record that it happened, and the record of what it said all
          // commit together or none of them do. Task 2.2.1 produced the
          // alternative: a runner that moved its bookkeeping outside the
          // transaction printed `applied 0002_partial.sql` at exit 0 over a
          // database whose tables did not exist.
          //
          // **That transaction is the RUN's and not this migration's**, which
          // Task 2.2.7 corrected by measurement: two migrations applied in one
          // run recorded an identical `recorded_at`, and `now()` is transaction
          // start time — confirmed against Kysely 0.29.5's own migrator, which
          // wraps every pending migration in a single
          // `db.transaction().execute(...)` when the adapter supports
          // transactional DDL. So a run of three migrations whose third fails
          // rolls back all three, which is stronger than "it left nothing
          // behind" per migration and is the sentence to keep.
          await recordChecksum(db, file.name, file.checksum);
        },
        // No `down`, deliberately. See the header.
      };
    }

    return migrations;
  }
}

/** Insert one checksum row. Separate so both the provider and the adopt pass use one statement. */
async function recordChecksum(
  db: Kysely<unknown>,
  name: string,
  checksum: string,
): Promise<void> {
  // `on conflict do nothing` rather than an upsert, and the difference is the
  // point: this row is written once, when the migration runs, and a second
  // write would be exactly the silent overwrite that turns a divergence into a
  // fresh baseline. The conflict path is reachable from the adopt pass in
  // {@link runMigrations}, where two runners can race to adopt the same row.
  await sql`
    insert into ${sql.table(MIGRATION_CHECKSUM_TABLE)} (name, checksum)
    values (${name}, ${checksum})
    on conflict (name) do nothing
  `.execute(db);
}

/** A migration whose file no longer hashes to what was recorded when it ran. */
export interface ChecksumDivergence {
  readonly name: string;
  /** What the file hashed to when it was applied. */
  readonly recorded: string;
  /** What it hashes to now. */
  readonly actual: string;
}

/** What the checksum pass found. */
export interface ChecksumReport {
  /** Applied migrations whose file has changed since. Any of these stops the run. */
  readonly diverged: readonly ChecksumDivergence[];
  /**
   * Applied migrations with no checksum row, whose current contents are
   * therefore **adopted** as the baseline rather than verified.
   *
   * This is the bootstrap, and calling it adoption rather than verification is
   * the honest half. Every database migrated before Task 2.2.7 — every
   * developer's, and the deployed one if it had been migrated first — has
   * `kysely_migration` rows and no checksum rows, so failing on a missing row
   * would fail every existing database on the first run. Adopting instead means
   * a file edited *before* this mechanism existed is silently blessed, exactly
   * once, and printed while it happens. There is no version of this that does
   * not have that hole; what there is, is saying so.
   */
  readonly adopt: readonly MigrationFile[];
  /** Applied migrations whose recorded checksum matches the file. */
  readonly verified: readonly string[];
}

/**
 * Compare what is on disk against what was recorded when each migration ran.
 *
 * A pure function of three inputs, for the reason {@link summariseMigration} is
 * one: the property worth holding is that a divergence stops the run, and that
 * is a property a test can assert without a database.
 *
 * **Migrations that have not been applied are not its business.** A file that
 * has never run can be edited freely — that is what a pull request is — and the
 * rule this enforces is narrower and is the one `../migrations/README.md` now
 * states as a convention: never edit a migration that has been applied.
 */
export function checkMigrationChecksums(
  files: readonly MigrationFile[],
  executed: ReadonlySet<string>,
  recorded: ReadonlyMap<string, string>,
): ChecksumReport {
  const diverged: ChecksumDivergence[] = [];
  const adopt: MigrationFile[] = [];
  const verified: string[] = [];

  for (const file of files) {
    if (!executed.has(file.name)) {
      continue;
    }

    const previous = recorded.get(file.name);

    if (previous === undefined) {
      adopt.push(file);
    } else if (previous === file.checksum) {
      verified.push(file.name);
    } else {
      diverged.push({
        name: file.name,
        recorded: previous,
        actual: file.checksum,
      });
    }
  }

  return { diverged, adopt, verified };
}

/**
 * What to print, and to exit with, when a file has changed under an applied
 * migration.
 *
 * **The recovery is deliberately not "run something".** There is no command
 * that repairs this, and inventing one would be worse than saying so: the
 * change the file now describes was never applied, so the database is missing
 * whatever was added to the file and holds whatever was removed from it.
 * Locally the answer is `pnpm db down -v && pnpm db && pnpm migrate`; against
 * the deployed server it is a new forward migration carrying the difference,
 * because that database has a `CanNotDelete` lock on it and dropping it is not
 * an available answer. Both are said here, because this is what somebody is
 * reading at the moment they need them.
 */
export function summariseChecksumFailure(
  diverged: readonly ChecksumDivergence[],
): MigrationOutcome {
  const errors: string[] = [
    `\n${String(diverged.length)} applied migration${diverged.length === 1 ? " has" : "s have"} been edited since ${diverged.length === 1 ? "it was" : "they were"} applied.\n` +
      "Nothing was migrated. The database does not contain what these files now say.\n",
  ];

  for (const divergence of diverged) {
    errors.push(
      `  ✗ ${divergence.name}\n` +
        `      applied: ${divergence.recorded}\n` +
        `      on disk: ${divergence.actual}\n`,
    );
  }

  errors.push(
    "A migration is a record of what was done, so an applied one is not editable — see\n" +
      "`apps/backend/migrations/README.md` §8. Put the change in a NEW migration. If this\n" +
      "is a local database you would rather reset, `pnpm db down -v && pnpm db && pnpm\n" +
      "migrate` rebuilds it from the files; the deployed server cannot be reset and needs\n" +
      "the new migration.\n",
  );

  return { exitCode: 1, lines: [], errors };
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
      // DDL plus Kysely putting the bookkeeping row in the same transaction.
      //
      // **Task 2.2.6 produced every failure class against a real database and
      // confirmed this sentence, with one exception it deliberately does not
      // mention: a rolled-back migration consumes identity values.** Against a
      // `securities` holding ids 1–3, a migration that inserted two rows and
      // then failed left three rows with max id 3 — and the next insert got id
      // **6**. Sequences are non-transactional in Postgres by design and a
      // rollback does not give the numbers back, so "left nothing behind" is
      // not quite true.
      //
      // It is left as it is, decided rather than overlooked. This line is read
      // by somebody who has just had a migration fail and is deciding whether
      // to go and look at the database, and for *that* question it is correct:
      // a gap in a surrogate key's sequence is not something anyone can or
      // should act on, ids here are explicitly not contiguous, and lengthening
      // the sentence spends a reader's attention on a non-problem at the moment
      // they have least of it. The precise version lives in
      // `../migrations/README.md` §8, along with every class, what each leaves
      // behind, and the recovery for each.
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
    // ------------------------------------------------------------------
    // The checksum pass (Task 2.2.7). Before anything is applied, because
    // its whole purpose is to refuse to add to a database that already
    // disagrees with these files.
    // ------------------------------------------------------------------
    await sql`
      create table if not exists ${sql.table(MIGRATION_CHECKSUM_TABLE)} (
        name text primary key,
        checksum text not null,
        recorded_at timestamptz not null default now()
      )
    `.execute(db);

    const files = await readMigrationFiles();

    // `getMigrations()` is Kysely's own view of the pair — every migration the
    // provider offers, each carrying `executedAt` when the tracking table has a
    // row for it. Reading the executed set from here rather than from a query
    // of our own is what keeps this pass and the migrator agreeing about what
    // "applied" means.
    const known = await migrator.getMigrations();
    const executed = new Set(
      known
        .filter((migration) => migration.executedAt !== undefined)
        .map((migration) => migration.name),
    );

    const rows = await sql<{
      name: string;
      checksum: string;
    }>`select name, checksum from ${sql.table(MIGRATION_CHECKSUM_TABLE)}`.execute(
      db,
    );
    const recorded = new Map(rows.rows.map((row) => [row.name, row.checksum]));

    const report = checkMigrationChecksums(files, executed, recorded);

    if (report.diverged.length > 0) {
      return summariseChecksumFailure(report.diverged);
    }

    const lines: string[] = [];

    for (const file of report.adopt) {
      await recordChecksum(db, file.name, file.checksum);
      lines.push(
        `  ○ ${file.name} — checksum adopted (applied before this database recorded them)`,
      );
    }

    // **The pending list, and it is printed on every run rather than being a
    // mode.** Task 2.2.2 refused arguments to `pnpm migrate` and that still
    // stands — there is no `down`, no "migrate to 0003" and no dry run. What
    // Task 2.2.7 changed is that this now runs inside a deploy, and a deploy
    // step that cannot say what it is about to apply is a deploy step nobody
    // can review afterwards. It costs nothing, because `getMigrations()` had to
    // be called for the pass above anyway.
    const pending = known.filter(
      (migration) => migration.executedAt === undefined,
    );

    lines.push(
      pending.length === 0
        ? "\n  Nothing pending."
        : `\n  Pending: ${pending.map((migration) => migration.name).join(", ")}`,
    );

    const outcome = summariseMigration(await migrator.migrateToLatest());

    return { ...outcome, lines: [...lines, ...outcome.lines] };
  } finally {
    // `destroy()` ends the underlying pool, so `closeDatabasePool` must not
    // also be called — `pg` rejects a second `end()`.
    await db.destroy();
  }
}
