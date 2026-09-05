// The loader: how `apps/backend/src/universe.ts` becomes rows in `securities`
// (Task 2.3.5).
//
// **The shape is `migrate.ts`'s and the reasons are the same ones.** The
// mechanism is TypeScript under `src/`, so it is typechecked, linted under the
// full type-aware pass, formatted and testable; `scripts/load-universe.mjs` is a
// thin wrapper whose three jobs are the name (`pnpm universe`), the guard naming
// `pnpm build`, and **the exit code**. Nothing here calls `process.exit`, for
// the reason `config.ts` throws rather than exiting: a function that exits
// cannot be tested.
//
// **It is a separate command and not a phase of `pnpm migrate`**, which follows
// from Task 2.3.1's decision that the universe is a seed script rather than a
// migration, and is stated rather than assumed because it has a cost somebody
// else pays. A migration and a seed mean different things by *idempotent*: a
// migration does nothing the second time, and this has to **converge on the
// file** — an edited sector, a corrected name and an added symbol are all picked
// up on the next run. Those are different programs, and only one of them is
// useful here. The cost is that a deploy now has **two** things to remember
// rather than one, which is Task 2.3.7's problem and is written here so that
// task meets it as a fact rather than as a surprise.
//
// ## The three levels that hold this list, and which one this is
//
//  1. **The compiler**, in `universe.ts`. `Security` is a discriminated union,
//     so an equity without a sector, a sector outside `SECTORS` and an index
//     proxy carrying one all fail to compile.
//  2. **This program**, for the rules a type cannot express because they are
//     statements about the whole list rather than about a row — a duplicate
//     symbol, a sector with no proxy, a proxy that disagrees with
//     `SECTOR_ETFS`.
//  3. **The database**, through `securities_kind_check`,
//     `securities_status_check`, `securities_sector_check` and
//     `securities_sector_matches_kind`.
//
// **`0003` moved the row-level half of acceptance criterion 3 into level 3, and
// that changes what level 2 is FOR rather than making it redundant.** The
// database refuses an equity with no sector — so the criterion has a backstop —
// but a Postgres constraint error names **one** row, by an identifier nobody
// wrote, from inside a transaction the operator did not open. A loader that let
// the database do the refusing would satisfy the criterion and be unusable
// against a curated file with three bad rows in it. So this fails **first**, and
// names every offending symbol in one run.
//
// **What has no backstop at any level is the set-level half**, and one member of
// it is worth reading before touching {@link validateUniverse}: see
// {@link duplicateSymbolViolations}.
//
// ## What it does about a symbol in the database and not in the file
//
// **Nothing, and that is a seam rather than an answer.** It counts them and says
// so; it does not delete them, does not change their `status`, and does not
// refuse. Task 2.3.6 chooses between those three, and the choice is not free:
// one of them destroys data Story 2.7 will have stored against the row, which is
// exactly what a loader does by default if nobody decides. Leaving the row
// untouched is the only option that is reversible by whichever answer 2.3.6
// picks.

import { Kysely, PostgresDialect, sql } from "kysely";

import {
  SECTOR_ETFS,
  SECTORS,
  SECURITY_KINDS,
  isSecurity,
  type Security,
} from "@marketpulse/shared";

import { ConfigError, loadConfig, loadEnvFile } from "./config.js";
import { createDatabasePool, type DatabaseLogger } from "./database.js";
import type { Database } from "./schema.js";
import { UNIVERSE, UNIVERSE_PROVENANCE } from "./universe.js";

/** What `universe.ts` states about where its data came from. */
export type UniverseProvenance = typeof UNIVERSE_PROVENANCE;

/**
 * `YYYY-MM-DD`, which is what a person edits and reviews in a diff.
 *
 * Anchored at both ends: `new Date("2026-09-05 and some nonsense")` is an
 * `Invalid Date` rather than a throw, so an unanchored pattern would let the
 * nonsense through to Postgres as `null`-shaped garbage.
 */
const CHECKED_ON = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Postgres's ceiling on bind parameters in one statement.
 *
 * The reason this constant exists at all is `UNIVERSE.md` §8, which lists the
 * places a hard-coded 100 could hide and names this one: a single multi-row
 * `insert` built as one statement stops working somewhere between here and 500
 * securities × 13 columns. It does not, because {@link chunkSize} derives the
 * batch from the ceiling and the column count rather than from a number
 * somebody picked. **Nothing in this file knows how many securities there are.**
 */
const MAX_BIND_PARAMETERS = 65_535;

/** How many rows fit in one statement, given how many columns each one needs. */
function chunkSize(columns: number): number {
  return Math.max(1, Math.floor(MAX_BIND_PARAMETERS / columns));
}

/** The columns this loader writes. `updated_at` is handled by the upsert. */
const WRITTEN_COLUMNS = [
  "symbol",
  "name",
  "exchange",
  "kind",
  "sector",
  "industry",
  "status",
  "cik",
  "profile_source",
  "profile_retrieved_at",
  "classification_source",
  "classification_retrieved_at",
] as const;

/**
 * Every way the provenance constant can be wrong.
 *
 * Separate from the list checks because it is a different subject, and taken as
 * a **parameter** for the same reason the list is: a test that could only ever
 * be handed the real constant could only ever watch it pass.
 */
function provenanceViolations(provenance: UniverseProvenance): string[] {
  const violations: string[] = [];

  for (const [group, entry] of Object.entries(provenance)) {
    if (entry.source.trim() === "") {
      violations.push(
        `UNIVERSE_PROVENANCE.${group}.source is empty. Every row's provenance is written from it, and \`0003\` makes the column not null with no default precisely so a load cannot decline to say where the data came from.`,
      );
    }

    if (!CHECKED_ON.test(entry.checkedOn)) {
      violations.push(
        `UNIVERSE_PROVENANCE.${group}.checkedOn is \`${entry.checkedOn}\`, which is not a YYYY-MM-DD date.`,
      );
      continue;
    }

    if (Number.isNaN(parseCheckedOn(entry.checkedOn).getTime())) {
      violations.push(
        `UNIVERSE_PROVENANCE.${group}.checkedOn is \`${entry.checkedOn}\`, which is shaped like a date and is not one.`,
      );
    }
  }

  return violations;
}

/**
 * `YYYY-MM-DD` as UTC midnight, so a load run in any timezone stores the same
 * instant.
 *
 * The bare `new Date("2026-09-05")` already parses as UTC under the spec, and
 * the `T00:00:00Z` is written out anyway because the date-only form is the one
 * part of `Date` parsing people remember wrongly — and reading it wrongly here
 * would move every row's provenance by a day in one direction or the other,
 * silently, in a column whose whole job is to be believed.
 */
function parseCheckedOn(checkedOn: string): Date {
  return new Date(`${checkedOn}T00:00:00Z`);
}

/**
 * Symbols that appear more than once.
 *
 * **The reflex about this one is that the database already catches it, and the
 * reflex is half wrong — which is worse than being wrong, because the half that
 * holds is the half you can see today.** `symbol` is `unique`, so the reflex is
 * that a duplicate is refused there and this only has to fail first with a
 * better message, which is exactly the argument the header makes for every
 * *other* constraint. The complication is the upsert: a write that converges on
 * the file has to be `on conflict (symbol) do update`, and an upsert does not
 * violate a unique index — it satisfies it twice.
 *
 * **Both halves were produced rather than argued, with this check disabled and a
 * second `NVDA` in the list, and the answer depends on something nobody would
 * think to look at: whether the two copies land in the same `insert` statement.**
 *
 *   * **Same statement** — Postgres refuses it outright, `21000`, *"ON CONFLICT
 *     DO UPDATE command cannot affect row a second time"*. Exit 1, table
 *     unchanged, nothing lost. This is what happens **today**, because 101 rows
 *     fit in one statement (see {@link chunkSize}).
 *   * **Different statements** — completely silent. The load printed
 *     **`✓ 102 securities in the universe`** at **exit 0** while `securities`
 *     held **101 rows**, and it counted the second write as *unchanged*. Which
 *     of the two copies survives depends on chunk ordering, which nobody
 *     controls and nothing reports.
 *
 * So the honest statement is that the database's protection here is **a property
 * of the list being small**, and it disappears somewhere past 5,461 securities —
 * or the first time anybody changes the batching, which is a performance edit
 * nobody would review as a correctness one. That is the worst shape a guarantee
 * can have, and it is why this check is in the program rather than left to the
 * index. It is also invisible to the other two levels regardless: the compiler
 * sees two valid rows, and the count is one short of the file's length with
 * nothing saying so. Task 2.3.4 left every cross-row rule here and named this
 * one as unowned; this is where it is owned.
 */
function duplicateSymbolViolations(securities: readonly Security[]): string[] {
  const seen = new Set<string>();
  const duplicated = new Set<string>();

  for (const security of securities) {
    if (seen.has(security.symbol)) {
      duplicated.add(security.symbol);
    }
    seen.add(security.symbol);
  }

  return [...duplicated].map(
    (symbol) =>
      `${symbol} appears more than once. Nothing else in the system would catch this: the loader upserts on \`symbol\`, so the second row would silently overwrite the first and the load would report success.`,
  );
}

/**
 * Name a malformed row in a message, without trusting it to have a symbol.
 *
 * The value reaching {@link validateUniverse} through a cast is by definition
 * one nothing has vouched for, so reading `.symbol` off it and interpolating the
 * result is how a validator's own error message becomes `[object Object]` — the
 * `no-base-to-string` case `migrate.ts` already met from the other side.
 */
function describeSymbol(value: unknown): string {
  if (typeof value === "object" && value !== null && "symbol" in value) {
    const { symbol } = value;
    if (typeof symbol === "string") return symbol;
  }

  return "A row";
}

/**
 * Does this row claim a kind that needs a sector, and not have one?
 *
 * Reads the raw value rather than a {@link Security} because it runs before the
 * shape check — see the call site for why that ordering is forced.
 */
function missesSector(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;

  const row = value as { kind?: unknown; sector?: unknown };

  return (
    typeof row.kind === "string" &&
    row.kind !== "index_etf" &&
    SECURITY_KINDS.some((kind) => kind === row.kind) &&
    (row.sector === null || row.sector === undefined)
  );
}

/**
 * Validate the whole list before anything is written, as a **set** rather than
 * row by row.
 *
 * **It takes the list as a parameter and does not reach for `UNIVERSE`**, which
 * is the shape `loadConfig(env)` and `resolveApiBaseUrl(raw)` already have and
 * is what lets the fast suite hand it small deliberately-broken fixtures. A
 * validator that imported the module could only ever be tested against a list
 * that passes — and worse, the two checks below that are *vacuous against the
 * shipped file* could then never be seen to work at all.
 *
 * **Every violation, not the first**, in `config.ts`'s accumulator shape,
 * because a curated file with three unclassified symbols should take one run to
 * fix rather than three.
 *
 * **The one stated exception to "every violation": a malformed ticker.**
 * `universe.ts` wraps every symbol through `toTicker` in its constructors, so a
 * bad symbol is a `TypeError` at **module load** — before this function is ever
 * called with anything. It therefore arrives on its own, as an import failure
 * naming one value, and never beside the other violations. That is the right
 * trade (a boundary check at the boundary, one place to validate) and it is
 * written down because the promise above would otherwise be a lie.
 */
export function validateUniverse(
  securities: readonly Security[],
  provenance: UniverseProvenance,
): readonly string[] {
  const violations: string[] = [...provenanceViolations(provenance)];

  if (securities.length === 0) {
    // Returned rather than accumulated, which is the one place this function
    // does not report everything it could. An empty list fails every set-level
    // rule below — eleven sectors with no proxy — and all eleven are true
    // consequences of the one fact worth telling somebody. Burying a cause under
    // its own consequences is what an accumulator is supposed to prevent.
    violations.push(
      "The universe is empty. A load that wrote nothing and reported success is the failure this program exists to prevent.",
    );
    return violations;
  }

  violations.push(...duplicateSymbolViolations(securities));

  // Widened to `unknown` deliberately, and it is the one cast in this file.
  // `isSecurity` exists for values that are **not** what the declared type says
  // — something that arrived through a cast, or as parsed JSON from Story 2.8's
  // API — and narrowing an already-`Security` element gives the negative branch
  // the type `never`, so the check could not report what it found. The widening
  // is the honest statement of what is being checked.
  for (const candidate of securities as readonly unknown[]) {
    // Acceptance criterion 3's first half, checked **before** the shape check
    // rather than after it, and the ordering is forced rather than stylistic.
    // `isSecurity` already refuses an equity with no sector, so a check written
    // after it is provably dead — TypeScript says so, narrowing the branch to
    // `never`. Putting it first is what gives the criterion a message that says
    // what is wrong instead of one that says the row is malformed, which is the
    // whole reason this program fails before the database does.
    if (missesSector(candidate)) {
      violations.push(
        `${describeSymbol(candidate)} has no sector. Every equity and every sector proxy needs one — a security with no sector has no benchmark, which is what acceptance criterion 3 exists to prevent.`,
      );
      continue;
    }

    // Everything else about the row's shape. `isSecurity` ships beside the type
    // in `packages/shared` rather than being re-implemented here, for the reason
    // it exists: a validator written anywhere but beside its shape is the copy
    // that drifts.
    if (!isSecurity(candidate)) {
      violations.push(
        `${describeSymbol(candidate)} is not a well-formed security: its kind, status or sector is outside the vocabulary in \`packages/shared\`.`,
      );
    }
  }

  violations.push(...sectorCoverageViolations(securities));

  return violations;
}

/**
 * Acceptance criterion 3's **second half**, plus the mapping agreement Task
 * 2.3.1's decision created.
 *
 * The second half — every sector present has a corresponding sector ETF — is a
 * statement about the whole universe, which is precisely why Task 2.2.4 refused
 * to encode it as a row-level `check` and why it lands here.
 *
 * **Both of these are VACUOUS against the shipped file, and that is a reason to
 * be careful rather than a reason to skip them.** Task 2.3.4 generated the
 * eleven `sector_etf` rows from `SECTOR_ETFS` by mapping over `SECTORS`, so
 * today both halves are true by construction and **neither check can fail no
 * matter how it is written** — including if it is written wrongly. That is Task
 * 2.2.5's blind-check problem in a new place: a green result that certifies
 * nothing is indistinguishable from one that certifies something. So they are
 * made to fail against **hand-built lists** in `load-universe.test.ts` rather
 * than against the universe, and they are worth keeping because they guard the
 * two seams the derivation does not cover: somebody replacing the generated
 * block with typed rows, and somebody typing a sector proxy's symbol into an
 * equity block.
 */
function sectorCoverageViolations(securities: readonly Security[]): string[] {
  const violations: string[] = [];

  const proxiesBySector = new Map<string, Security[]>();

  for (const security of securities) {
    if (security.kind === "sector_etf") {
      const existing = proxiesBySector.get(security.sector) ?? [];
      existing.push(security);
      proxiesBySector.set(security.sector, existing);
    }
  }

  const sectorsInUse = new Map<string, number>();

  for (const security of securities) {
    // `typeof` rather than trusting the declared type, because a row that
    // reached here through a cast can carry a null sector — and counting that
    // null as a sector in use would report it twice, once as "AMD has no
    // sector" and once as "sector `null` has no ETF". The first message is the
    // one that helps.
    if (security.kind === "equity" && typeof security.sector === "string") {
      sectorsInUse.set(
        security.sector,
        (sectorsInUse.get(security.sector) ?? 0) + 1,
      );
    }
  }

  for (const [sector, count] of sectorsInUse) {
    if (!proxiesBySector.has(sector)) {
      violations.push(
        `Sector \`${sector}\` is on ${String(count)} ${count === 1 ? "security" : "securities"} and the universe has no sector_etf row for it. Epic 5 measures a security against its sector's ETF, so those ${String(count)} would have a sector and no benchmark.`,
      );
    }
  }

  for (const sector of SECTORS) {
    const proxies = proxiesBySector.get(sector) ?? [];
    const expected = SECTOR_ETFS[sector];

    if (proxies.length === 0) {
      violations.push(
        `The taxonomy names \`${sector}\`, SECTOR_ETFS maps it to ${expected}, and the universe has no sector_etf row for it.`,
      );
      continue;
    }

    if (proxies.length > 1) {
      violations.push(
        `\`${sector}\` has ${String(proxies.length)} sector_etf rows (${proxies.map((proxy) => proxy.symbol).join(", ")}). A sector has exactly one benchmark.`,
      );
    }

    for (const proxy of proxies) {
      if (proxy.symbol !== expected) {
        violations.push(
          `${proxy.symbol} is the sector_etf for \`${sector}\`, and SECTOR_ETFS maps that sector to ${expected}. The mapping in \`packages/shared\` is the source of truth; the row disagreeing with it means one of the two was hand-edited.`,
        );
      }
    }
  }

  return violations;
}

/** What one run did, per symbol, and in the form the caller needs to exit on. */
export interface LoadOutcome {
  /** Exactly the process exit code. 0 only when nothing went wrong. */
  readonly exitCode: 0 | 1;
  /** Lines for stdout. */
  readonly lines: readonly string[];
  /** Lines for stderr. Empty when `exitCode` is 0. */
  readonly errors: readonly string[];
}

/** What the write half counted. */
export interface LoadCounts {
  readonly inserted: number;
  readonly updated: number;
  readonly unchanged: number;
  /** In the database and not in the file. See the header — this is a seam. */
  readonly absentFromFile: readonly string[];
}

/**
 * Turn a list of violations into the thing the process exits on.
 *
 * A pure function with its own tests for the reason `summariseMigration` is one:
 * "a bad universe exits non-zero" is a property that has to be *checked* rather
 * than remembered, and the failure it guards against — a loader that reports
 * success having written nothing — is the one Task 2.2.2 spent three deliberate
 * breaks on.
 */
export function summariseValidationFailure(
  violations: readonly string[],
): LoadOutcome {
  return {
    exitCode: 1,
    lines: [],
    errors: [
      `\nThe universe was refused and nothing was written. ${String(violations.length)} problem${violations.length === 1 ? "" : "s"}:\n`,
      ...violations.map((violation) => `  ✗ ${violation}\n`),
      "\nFix `apps/backend/src/universe.ts` and run `pnpm universe` again. The table is exactly\n" +
        "as it was — validation runs before anything is written, and the write itself is one\n" +
        "transaction.\n",
    ],
  };
}

/** Render what a successful run did. */
export function summariseLoad(counts: LoadCounts): LoadOutcome {
  const total = counts.inserted + counts.updated + counts.unchanged;

  const lines = [
    `\n  ✓ ${String(total)} securities in the universe`,
    `      ${String(counts.inserted)} inserted`,
    // `updated` is the count of rows whose data actually differed, not the
    // count of rows the upsert touched. See {@link applyUniverse}: the
    // `on conflict ... where` clause is what makes those two different numbers,
    // and it is the whole reason `updated_at` means anything.
    `      ${String(counts.updated)} updated`,
    `      ${String(counts.unchanged)} unchanged`,
  ];

  if (counts.absentFromFile.length > 0) {
    lines.push(
      `\n  ○ ${String(counts.absentFromFile.length)} in the database and not in the file, left untouched:`,
      `      ${counts.absentFromFile.join(", ")}`,
      "\n    This loader does not delete, does not change `status`, and does not refuse.",
      "    What should happen to a removed symbol is Task 2.3.6's decision, and one of the",
      "    three answers destroys data Story 2.7 will have stored against the row.",
    );
  }

  lines.push("");

  return { exitCode: 0, lines, errors: [] };
}

/**
 * Write the universe, converging on the file.
 *
 * **The whole thing is one transaction**, so a failure leaves the table exactly
 * as it was — which is what acceptance criterion 3's "fails the load" has to
 * mean to be worth anything. Validation has already run by the time this is
 * called, so the transaction is not what catches a bad universe; it is what
 * catches everything else, and it is why "half the universe loaded" is not a
 * state this program can produce.
 *
 * **What that is worth today is smaller than it sounds, and saying so is more
 * useful than implying otherwise.** {@link chunkSize} puts 5,461 rows in one
 * statement, so at 101 securities the write is a **single statement** and would
 * be atomic with no transaction at all. The transaction is what keeps it atomic
 * past the chunk boundary — which is somewhere between 500 and 5,000
 * securities, i.e. exactly the expansion `UNIVERSE.md` §8 asks to be free.
 * Produced rather than reasoned about: with the ceiling temporarily lowered so
 * 101 rows became eleven statements, and a `check` constraint rejecting a symbol
 * in a middle chunk, `pnpm universe` exited **1** and left **0 rows** — the
 * earlier chunks rolled back.
 *
 * **The upsert's `where` clause is the load-bearing part and it looks like an
 * optimisation.** `updated_at` has **no trigger** — Task 2.2.4 decided that
 * deliberately, and recorded that maintaining it is the writer's obligation and
 * that nothing catches a writer who gets it wrong. This is that writer. A bare
 * `do update set ... , updated_at = now()` would move `updated_at` on all 101
 * rows on every run, which makes the column mean *when the loader last ran* —
 * the same failure `UNIVERSE_PROVENANCE` exists to avoid on the retrieval
 * timestamps, arriving through a different door. The row-wise
 * `is distinct from` is what makes the update happen **only when the data
 * actually changed**, so an unchanged row keeps its `updated_at` and a changed
 * one moves it. Note `is distinct from` rather than `<>`: `null <> null` is
 * `null`, so a `<>` comparison would treat every row with a null `industry` or
 * `cik` as unchanged forever.
 *
 * **One consequence worth knowing before somebody reads a gap in the sequence as
 * a fault:** `id` is `generated always as identity`, and an upsert consumes an
 * identity value **per row, on every run, whether or not anything changed** —
 * the default is evaluated before the conflict is detected, and sequences are
 * non-transactional in Postgres by design. Measured rather than assumed: after
 * four runs of 101 securities, `securities_id_seq.last_value` read **404** and
 * `max(id)` read **101**. Task 2.2.6 confirmed the same mechanism from the other
 * side on a rolled-back migration. So the ids are stable — a re-run does not
 * renumber anything, which is what matters — and the sequence runs ahead of them
 * by the number of rows loaded so far. That is correct, and it is why
 * `migrations/README.md` says ids are explicitly not contiguous.
 */
async function applyUniverse(
  db: Kysely<Database>,
  securities: readonly Security[],
  provenance: UniverseProvenance,
): Promise<LoadCounts> {
  const profileRetrievedAt = parseCheckedOn(provenance.profile.checkedOn);
  const classificationRetrievedAt = parseCheckedOn(
    provenance.classification.checkedOn,
  );

  const rows = securities.map((security) => ({
    symbol: security.symbol,
    name: security.name,
    exchange: security.exchange,
    kind: security.kind,
    sector: security.sector,
    industry: security.industry,
    status: security.status,
    cik: security.cik,
    profile_source: provenance.profile.source,
    profile_retrieved_at: profileRetrievedAt,
    classification_source: provenance.classification.source,
    classification_retrieved_at: classificationRetrievedAt,
  }));

  return db.transaction().execute(async (trx) => {
    const before = await trx
      .selectFrom("securities")
      .select("symbol")
      .execute();
    const existing = new Set(before.map((row) => row.symbol));

    const written = new Set<string>();
    const size = chunkSize(WRITTEN_COLUMNS.length);

    for (let index = 0; index < rows.length; index += size) {
      const batch = rows.slice(index, index + size);

      const returned = await trx
        .insertInto("securities")
        .values(batch)
        .onConflict((oc) =>
          oc
            .column("symbol")
            .doUpdateSet((eb) => ({
              name: eb.ref("excluded.name"),
              exchange: eb.ref("excluded.exchange"),
              kind: eb.ref("excluded.kind"),
              sector: eb.ref("excluded.sector"),
              industry: eb.ref("excluded.industry"),
              status: eb.ref("excluded.status"),
              cik: eb.ref("excluded.cik"),
              profile_source: eb.ref("excluded.profile_source"),
              profile_retrieved_at: eb.ref("excluded.profile_retrieved_at"),
              classification_source: eb.ref("excluded.classification_source"),
              classification_retrieved_at: eb.ref(
                "excluded.classification_retrieved_at",
              ),
              updated_at: sql<Date>`now()`,
            }))
            // See the doc comment. Row-wise, so adding a column to the loader
            // and forgetting this list means an edit to that column stops
            // moving `updated_at` — which is why the two lists are written one
            // above the other.
            .where(
              sql<boolean>`(
                securities.name, securities.exchange, securities.kind,
                securities.sector, securities.industry, securities.status,
                securities.cik,
                securities.profile_source, securities.profile_retrieved_at,
                securities.classification_source,
                securities.classification_retrieved_at
              ) is distinct from (
                excluded.name, excluded.exchange, excluded.kind,
                excluded.sector, excluded.industry, excluded.status,
                excluded.cik,
                excluded.profile_source, excluded.profile_retrieved_at,
                excluded.classification_source,
                excluded.classification_retrieved_at
              )`,
            ),
        )
        // A row the `where` excluded is not returned, which is what makes
        // "unchanged" a number this program can count rather than infer. The
        // alternative is the `xmax = 0` trick, which reads a system column to
        // learn the same thing and is a good deal less obvious to the next
        // reader.
        .returning("symbol")
        .execute();

      for (const row of returned) {
        written.add(row.symbol);
      }
    }

    const inFile = new Set<string>(rows.map((row) => row.symbol));

    return {
      inserted: [...written].filter((symbol) => !existing.has(symbol)).length,
      updated: [...written].filter((symbol) => existing.has(symbol)).length,
      unchanged: rows.length - written.size,
      absentFromFile: [...existing]
        .filter((symbol) => !inFile.has(symbol))
        .sort(),
    };
  });
}

/**
 * Load the tracked universe into the configured database.
 *
 * Returns an exit code rather than exiting, for the reason
 * {@link runMigrations} does. `scripts/load-universe.mjs` is what turns this
 * into a process result.
 *
 * **Where the database is comes from one place** — the backend's own
 * `loadConfig()`, which `scripts/local-database.mjs`, `scripts/check-ready.mjs`
 * and `migrate.ts` all already read. A loader with its own copy of the
 * connection settings has forked the definition of where the database is on day
 * one, and it also means both `DATABASE_AUTH` modes work with no code here at
 * all: `createDatabasePool` resolves a password locally and mints an Entra token
 * per connection deployed.
 *
 * **The `Kysely` instance is built here and is not exported**, which is the
 * arrangement `migrate.ts` already has and is Task 2.2.1's query-layer seam:
 * Epic 13's temporal plugin is attached with `withPlugin`, which returns a
 * *different object*, so the guarantee is only worth anything while there is no
 * unplugged handle to import. `securities` has no `observed_at` and is not a
 * temporal table, so nothing here would be filtered — the seam is kept anyway,
 * because a seam with one exception in it is not a seam.
 */
export async function loadUniverse(): Promise<LoadOutcome> {
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

  // Validation first, and before a connection is opened. A bad universe is a
  // bad universe whether or not a database is running, and finding out which
  // one is wrong first is worth a great deal to whoever is reading the output.
  const violations = validateUniverse(UNIVERSE, UNIVERSE_PROVENANCE);

  if (violations.length > 0) {
    return summariseValidationFailure(violations);
  }

  const log: DatabaseLogger = {
    warn: (object, message) => {
      process.stderr.write(`  ${message} ${JSON.stringify(object)}\n`);
    },
    debug:
      config.logLevel === "debug" || config.logLevel === "trace"
        ? (object, message) => {
            process.stderr.write(`  ${message} ${JSON.stringify(object)}\n`);
          }
        : (): void => undefined,
  };

  const pool = createDatabasePool(config.database, log, "marketpulse-universe");
  const db = new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });

  try {
    return summariseLoad(
      await applyUniverse(db, UNIVERSE, UNIVERSE_PROVENANCE),
    );
  } catch (error) {
    return {
      exitCode: 1,
      lines: [],
      errors: [
        "\nThe universe was not loaded and the table is exactly as it was — the whole write is",
        "one transaction.\n",
        `  ${error instanceof Error ? error.message : String(error)}\n`,
        "If the database is not running, `pnpm db` starts it. If `securities` does not exist,\n" +
          "`pnpm migrate` creates it — this program applies no migration of its own.\n",
      ],
    };
  } finally {
    // `destroy()` ends the underlying pool, so `closeDatabasePool` must not also
    // be called — `pg` rejects a second `end()`.
    await db.destroy();
  }
}
