// **Index builds that cannot fit inside a migration, done before one runs.**
//
// `deploy.yml` gives `pnpm migrate` 120 seconds, and Kysely wraps the whole
// run in one transaction. Both are deliberate (`migrate.ts`, ADR 0034), and
// together they forbid the one operation Story 3.8 needs: building a unique
// index over a table with fifty million rows in it. A single pass over
// `market_bars`'s heap on the deployed tier is ~508 s at 10 MiB/s, and
// `create index concurrently` cannot run inside a transaction block at all.
//
// So the build happens **here**, in its own deploy step before the migration,
// and the migration only **adopts** the finished index — two catalogue writes,
// 0.11 s measured (`0011_market_bars_unique_bar_by_tape.sql`).
//
// ## Three properties this has to have, and each is a failure it prevents
//
// **Idempotent, and cheap when there is nothing to do.** It runs on every
// deploy forever for a need that is one-off, so the steady state must be a
// catalogue query. It is: once the constraint covers the new columns, this
// returns without touching the table.
//
// **It must clean up after itself.** `create index concurrently` is the one
// index build that can fail and leave something behind — an **invalid** index,
// which `if not exists` would then skip forever while the migration waits for
// an index it can adopt. So an invalid leftover is dropped and rebuilt rather
// than reported.
//
// **It must never be the thing that breaks a deploy that would otherwise
// work.** A failure here stops the deploy before the migration runs, which is
// the safe direction — nothing applied, no code rolled — and the message says
// which of the two it was.
import { Kysely, PostgresDialect, sql } from "kysely";

import { ConfigError, loadConfig, loadEnvFile } from "./config.js";
import { createDatabasePool, type DatabaseLogger } from "./database.js";

/** What the runner prints and exits with. `runMigrations`' shape, for its reason. */
export interface PrepareIndexesOutcome {
  readonly exitCode: 0 | 1;
  readonly lines: readonly string[];
  readonly errors: readonly string[];
}

/**
 * One index this step is responsible for.
 *
 * **A list rather than a single hard-coded statement**, because the next one
 * of these will arrive and the shape should already be here — but note it is
 * deliberately NOT a general mechanism: each entry names the migration that
 * adopts it, so an index built here with no adopter is visible as an entry
 * with nothing pointing at it.
 */
interface PreparedIndex {
  /** The index this step builds. The migration renames it on adoption. */
  readonly name: string;
  /** The constraint it becomes, and the columns it must end up covering. */
  readonly adoptedAs: string;
  readonly columns: readonly string[];
  readonly table: string;
  /** The migration that adopts it, for the message when it has not run yet. */
  readonly adoptedBy: string;
}

const PREPARED: readonly PreparedIndex[] = [
  {
    name: "market_bars_unique_bar_v2",
    adoptedAs: "market_bars_unique_bar",
    columns: ["security_id", "timeframe", "observed_at", "feed"],
    table: "market_bars",
    adoptedBy: "0011_market_bars_unique_bar_by_tape",
  },
];

export async function prepareIndexes(): Promise<PrepareIndexesOutcome> {
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
    consoleLogger(config.logLevel === "debug" || config.logLevel === "trace"),
  );
  const db = new Kysely<unknown>({ dialect: new PostgresDialect({ pool }) });

  const lines: string[] = [];
  const errors: string[] = [];

  try {
    for (const index of PREPARED) {
      lines.push(...(await prepareOne(db, index)));
    }
  } catch (error) {
    errors.push(
      `\n${error instanceof Error ? error.message : String(error)}\n`,
    );
    return { exitCode: 1, lines, errors };
  } finally {
    // `destroy()` ends the underlying pool, so `closeDatabasePool` must not
    // also be called — `pg` rejects a second `end()`. `migrate.ts` records the
    // same thing beside its own close.
    await db.destroy();
  }

  return { exitCode: 0, lines, errors };
}

async function prepareOne(
  db: Kysely<unknown>,
  index: PreparedIndex,
): Promise<readonly string[]> {
  // **Already adopted?** The constraint covering the target columns is the
  // finished state, and it is the commonest one — every deploy after the first.
  const adopted = await sql<{ definition: string }>`
    select pg_get_constraintdef(oid) as definition
      from pg_constraint
     where conrelid = ${sql.lit(index.table)}::regclass
       and conname = ${sql.lit(index.adoptedAs)}
  `.execute(db);

  const definition = adopted.rows[0]?.definition ?? "";
  if (index.columns.every((column) => definition.includes(column))) {
    return [
      `  ✓ ${index.adoptedAs} already covers ${index.columns.join(", ")}`,
    ];
  }

  // **An invalid leftover is the one failure mode a concurrent build has.**
  // `create index concurrently` that is interrupted leaves an index that is
  // present, unusable and un-adoptable, and `if not exists` would skip it
  // forever. Drop it and build again rather than reporting it.
  const existing = await sql<{ valid: boolean }>`
    select i.indisvalid as valid
      from pg_class c
      join pg_index i on i.indexrelid = c.oid
     where c.relname = ${sql.lit(index.name)}
  `.execute(db);

  const lines: string[] = [];
  const present = existing.rows[0];

  if (present !== undefined && !present.valid) {
    lines.push(
      `  ! ${index.name} exists and is INVALID — a previous concurrent build ` +
        `did not finish. Dropping it and building again.`,
    );
    await sql`drop index ${sql.ref(index.name)}`.execute(db);
  } else if (present !== undefined) {
    return [
      `  ✓ ${index.name} is built and valid, waiting for ${index.adoptedBy}`,
    ];
  }

  lines.push(
    `  … building ${index.name} concurrently on ${index.table} — reads and ` +
      `writes continue; this is minutes on a populated store`,
  );

  const started = Date.now();
  // Concurrently, and therefore outside any transaction: the point of this
  // whole step. It holds SHARE UPDATE EXCLUSIVE, so the nightly backfill keeps
  // writing while it runs.
  await sql`
    create unique index concurrently ${sql.ref(index.name)}
      on ${sql.ref(index.table)} (${sql.join(
        index.columns.map((column) => sql.ref(column)),
      )})
  `.execute(db);

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  lines.push(
    `  ✓ ${index.name} built in ${elapsed}s — ${index.adoptedBy} adopts it`,
  );
  return lines;
}

/**
 * Warnings to stderr, so stdout carries the index list and nothing else —
 * `migrate.ts`'s arrangement, repeated here for the same reason.
 */
function consoleLogger(verbose: boolean): DatabaseLogger {
  const write = (object: object, message: string): void => {
    process.stderr.write(`  ${message} ${JSON.stringify(object)}\n`);
  };

  return { warn: write, debug: verbose ? write : (): void => undefined };
}
