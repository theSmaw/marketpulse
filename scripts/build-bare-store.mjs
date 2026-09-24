// `pnpm store:bare` — CI's store, on this machine, in one command (2026-09-14).
//
// ## The divergence this exists for
//
// CI's `e2e` job runs `pnpm migrate` and then `pnpm universe`, and **never
// `pnpm backfill`** — the backfill is metered, paced and needs a vendor
// credential. So the store the browser suite runs against on a runner holds
// **518 securities and zero bars**, and every chart on it is a correct `empty`.
//
// A developer's store has bars, because a developer ran the backfill. Nothing
// on a laptop can see the difference, and the difference is load-bearing: an
// assertion about a *number* on the security page is an assertion about data
// the runner may not have.
//
// It has already cost a round trip. PR #314 added an assertion that read the
// `Close` label out of the price panel; locally it passed, and on CI all three
// `pressing a window does not move the chart` tests failed with `no Close label
// in the region`, because with no bars the panel renders no figures at all. A
// six-minute CI run plus the diagnosis, to learn something that was true of the
// runner from the first line of its own job definition.
//
// ## What this builds
//
// A **second** database — `marketpulse_bare` — beside the developer's own,
// which it never touches. Both exist on purpose: one to develop against, one to
// find out what CI will say.
//
// It is built with **the same two commands CI runs, by name**: `pnpm migrate`
// and then `pnpm universe`, with `DATABASE_NAME` pointed at it. That is what
// makes this a reproduction rather than an imitation — no SQL of its own, no
// seed fixture, no ordering this repository does not already use.
//
// ## What it proves before it reports success
//
// **Many securities, zero bars.** Counted rather than assumed: a script that
// claimed to reproduce CI while quietly holding bars would be worse than no
// script, because it would send somebody to CI confident about a run that
// proved nothing. If the counts disagree it refuses and says which.
//
// **And since 2026-09-24 it EMPTIES the bar tables rather than only refusing.**
// Found by Task 3.8.3 at the cost of two confusing browser-suite runs: a store
// the fixture feed had written to was no longer CI's shape, and re-running this
// command reported `already there — bringing it up to date` and converged the
// **universe** only, because `pnpm migrate` and `pnpm universe` are the only
// two things it runs and neither removes a bar. The old script did refuse at
// the end and name the `drop database` to type — but that arrived after two
// screens of migration output, and the one promise on the tin is *518
// securities and zero bars*. So it truncates `market_bars` and `bar_coverage`
// and says how many rows it removed. Safe because the target is the bare store
// by name: a database whose entire purpose is to hold no bars. The developer's
// own store is never opened.
//
// ## What it does NOT reproduce
//
//   1. **A runner.** Ubuntu, a shared CPU, a cold pnpm store and a service
//      container. This is the same laptop with a different database.
//   2. **A universe frozen at some other moment.** `pnpm universe` converges on
//      the checked-in file, so this holds whatever the file holds today — which
//      is what CI holds too, and is the point.
//   3. **Anything about the deployed store**, which is backfilled nightly and
//      is a third shape again.
//
// `pnpm db down -v` drops this database along with the developer's own: they
// share one volume, and `-v` is the flag that discards it.

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";

import { composeEnvironment, resolveLocalDatabase } from "./local-database.mjs";

const REPO_ROOT = resolve(import.meta.dirname, "..");

/** The bare store's name. A sibling of the developer's, never a replacement. */
const BARE_DATABASE = "marketpulse_bare";

/**
 * How few bars still counts as none.
 *
 * Zero. There is no tolerance here on purpose: "a few bars" is a third shape
 * that is neither CI's nor a developer's, and a check that admitted it would be
 * reporting a store nobody runs against.
 */
const EXPECTED_BARS = 0;

/**
 * How many securities is enough to call the universe loaded.
 *
 * A floor rather than the exact 518, because the curated file changes and this
 * script must not go red the day somebody adds a proxy. What it is really
 * asking is *did the loader run at all* — the failure it guards against is an
 * empty table, which would make "zero bars" true for the wrong reason.
 */
const MINIMUM_SECURITIES = 100;

const resolved = await resolveLocalDatabase();

if (!resolved.ok) {
  console.error(resolved.message);
  process.exit(1);
}

const { database } = resolved;

if (database.database === BARE_DATABASE) {
  console.error(
    `DATABASE_NAME is already \`${BARE_DATABASE}\`.\n\n` +
      "This script builds the bare store beside your own; with the two pointed\n" +
      "at one name there is nothing to build it beside. Unset DATABASE_NAME and\n" +
      "run it again.\n",
  );
  process.exit(1);
}

/** Run `docker compose ...` with the values `compose.yaml` requires. */
function compose(args, { capture = false } = {}) {
  return spawnSync("docker", ["compose", ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
    env: { ...process.env, ...composeEnvironment(database) },
  });
}

/** One scalar out of the bare database, as a string. */
function query(sql) {
  const run = compose(
    [
      "exec",
      "-T",
      "--env",
      `PGPASSWORD=${database.password}`,
      "postgres",
      "psql",
      "--username",
      database.user,
      "--dbname",
      BARE_DATABASE,
      "--no-align",
      "--tuples-only",
      "--command",
      sql,
    ],
    { capture: true },
  );

  if (run.status !== 0) {
    console.error(`\nCould not read the bare store:\n${run.stderr ?? ""}`);
    process.exit(1);
  }

  return (run.stdout ?? "").trim();
}

// 1. The database itself. `CREATE DATABASE` has no `IF NOT EXISTS`, so this
//    asks first — and re-running the whole script on an existing bare store is
//    a normal thing to do, not an error.
const exists = compose(
  [
    "exec",
    "-T",
    "--env",
    `PGPASSWORD=${database.password}`,
    "postgres",
    "psql",
    "--username",
    database.user,
    "--dbname",
    database.database,
    "--no-align",
    "--tuples-only",
    "--command",
    `select 1 from pg_database where datname = '${BARE_DATABASE}'`,
  ],
  { capture: true },
);

if (exists.status !== 0) {
  console.error(
    "\nThe local database is not reachable. Start it with `pnpm db`.\n\n" +
      (exists.stderr ?? ""),
  );
  process.exit(1);
}

if ((exists.stdout ?? "").trim() === "") {
  console.log(`Creating ${BARE_DATABASE}`);

  const created = compose([
    "exec",
    "-T",
    "--env",
    `PGPASSWORD=${database.password}`,
    "postgres",
    "psql",
    "--username",
    database.user,
    "--dbname",
    database.database,
    "--command",
    `create database ${BARE_DATABASE}`,
  ]);

  if (created.status !== 0) process.exit(created.status ?? 1);
} else {
  console.log(`${BARE_DATABASE} is already there — bringing it up to date.`);
}

// 2. CI's own two commands, by name, against that database.
for (const script of ["migrate", "universe"]) {
  console.log(`\n$ DATABASE_NAME=${BARE_DATABASE} pnpm ${script}`);

  const run = spawnSync("pnpm", ["run", script], {
    cwd: REPO_ROOT,
    stdio: "inherit",
    env: { ...process.env, DATABASE_NAME: BARE_DATABASE },
  });

  if (run.status !== 0) {
    console.error(`\n\`pnpm ${script}\` failed against ${BARE_DATABASE}.\n`);
    process.exit(run.status ?? 1);
  }
}

// 3. Empty the bar tables, because nothing above this line does.
//
//    `pnpm migrate` and `pnpm universe` converge the SCHEMA and the UNIVERSE;
//    a bar written by the fixture feed while the pair was pointed here
//    survives both, and the store then looks bare and is not. The ledger goes
//    with the bars on purpose — a `bar_coverage` row claiming a window whose
//    bars have gone is a worse shape than either.
const barsBefore = Number(query("select count(*) from market_bars"));

if (barsBefore > 0) {
  const ledgerBefore = Number(query("select count(*) from bar_coverage"));

  query("truncate market_bars, bar_coverage");

  console.log(
    `\nEmptied ${String(barsBefore)} bars and ${String(ledgerBefore)} ledger ` +
      "rows — neither `pnpm migrate` nor `pnpm universe` removes one, and\n" +
      "this store's one promise is that it holds none.",
  );
}

// 4. Prove the shape rather than assert it.
const securities = Number(query("select count(*) from securities"));
const bars = Number(query("select count(*) from market_bars"));

console.log(
  `\n${BARE_DATABASE}: ${String(securities)} securities, ${String(bars)} bars.`,
);

if (securities < MINIMUM_SECURITIES) {
  console.error(
    `\nOnly ${String(securities)} securities. The universe did not load, and ` +
      '"zero bars" would be\ntrue for the wrong reason — an empty store is ' +
      "not CI's store.\n",
  );
  process.exit(1);
}

if (bars !== EXPECTED_BARS) {
  console.error(
    `\n${String(bars)} bars, after the truncate above. CI's store has none, ` +
      "so this is a third shape\nrather than a reproduction of it, and " +
      "something is writing into " +
      `${BARE_DATABASE}\nfaster than this script empties it — check for a ` +
      "running pair pointed at it.\nDrop it and rebuild:\n\n" +
      `  pnpm db exec postgres psql -U ${database.user} -d ${database.database} ` +
      `-c 'drop database ${BARE_DATABASE}'\n`,
  );
  process.exit(1);
}

console.log(
  "\nThis is the shape CI runs against. Drive the pair at it:\n\n" +
    `  DATABASE_NAME=${BARE_DATABASE} pnpm dev\n` +
    "  pnpm e2e <spec>          # in another terminal\n\n" +
    `Your own store (${database.database}) is untouched — stop the pair and run\n` +
    "`pnpm dev` without the variable to go back to it.\n",
);
