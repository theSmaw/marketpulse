// The database as Kysely sees it (Task 2.2.4): one interface per table, and one
// `Database` interface naming them.
//
// **Why this is hand-written.** Task 2.2.1 measured the alternatives and
// rejected all of them on one criterion: `kysely-codegen`, `drizzle-kit pull`
// and `prisma migrate dev` each introspect a **live** database, and Story 2.2's
// acceptance criterion 7 is that `pnpm verify` passes with no database running.
// Nothing is generated, no build step was added, and the schema — the `.sql`
// files next door — is the source of truth this file follows.
//
// **Why it lives in `apps/backend` rather than `packages/shared`**, decided by
// Task 2.2.3 and written out in `../migrations/README.md` §6. A row is not a
// domain object: this describes one process's transport, with `string` where
// Postgres has `numeric` and `bigint`, `Date` where it has `timestamptz`, and
// `null` where a column is nullable. `Security` — the domain type, with a
// sector rather than a `sector_id` and no nulls a caller has to think about —
// is Story 2.3's and goes in `packages/shared`. Two further reasons the row
// type does not: it carries Kysely's `ColumnType` helpers into whatever imports
// it, which would put the query builder in the frontend's type graph; and
// `packages/shared` is consumed as built output, so a column rename would mean
// rebuilding it before either app typechecks, for a type the frontend must
// never import.
//
// **What maps between the two lives beside the query**, one function per domain
// type and never a generic row-to-object mapper — because the mapping is
// exactly where a nullable column becomes an explicit domain answer, and a
// generic mapper is where that decision gets skipped. ~~Story 2.4 writes the
// first read and owns it. There is deliberately nothing of the kind here yet.~~
// **`securities.ts` is it (Task 2.4.1)**: `toSecurity` lives beside the query
// that produces the row, and there is still no generic mapper anywhere.
//
// ~~**Its only consumer is a test, and that is the point rather than a loose
// end.**~~ **That stopped being true at Story 2.3 rather than at Story 2.4, and
// nothing noticed.** `load-universe.ts` has imported `Database` since Task
// 2.3.5 and `securities.ts` imports both it and `SecuritiesTable`, so this
// interface has three consumers and two of them ship. `migrate.ts` still
// deliberately does not consume it (see below). What Task 2.2.5 added is
// `migrate.database.test.ts`, which declares its column expectation
// `satisfies Record<keyof SecuritiesTable, ExpectedColumn>` and then compares
// that expectation against `information_schema`. So the two directions are held
// by two different things: the compiler holds interface → spec (a column added
// here and not described there is `TS1360`), and `pnpm test:database` holds
// spec → database. A column renamed in a migration and not here still
// typechecks, lints and builds — and it is now a red `pnpm test:database`
// rather than a run-time failure.
//
// **Why `migrate.ts` stays on `Kysely<unknown>`.** The obvious tidy-up is to
// give the migrator `Kysely<Database>` now that there is something to name, and
// it is wrong for three reasons. This interface describes the schema **after**
// every migration has run, so a migrator typed with it claims a shape that is
// false for the entire duration of the thing it is doing — during `0002` there
// is no `securities` table. It would buy nothing, because migration bodies go
// through `sql.raw()` and no `selectFrom` exists in that file. And it would
// make the migrator depend at compile time on the description of its own
// output, so a migration that dropped a table would break the compilation of
// the runner that has to apply it. The generic stays `unknown`, and the comment
// there says so.

import type { ColumnType, Generated, GeneratedAlways } from "kysely";

import type {
  Sector,
  SecurityKind,
  SecurityStatus,
  Timeframe,
} from "@marketpulse/shared";

/**
 * `securities` — the tracked universe. See `../migrations/0002_securities.sql`,
 * which is the source of truth this mirrors.
 *
 * Read the column types against `../migrations/README.md` §4: `pg` hands a
 * `bigint` to JavaScript as a **string**, deliberately, because a JavaScript
 * `number` is a double and would stop round-tripping above 2^53. That is not a
 * thing to "fix" with a type parser.
 */
export interface SecuritiesTable {
  /**
   * `bigint generated always as identity`.
   *
   * `GeneratedAlways` rather than `Generated`, and the distinction is real
   * rather than cosmetic: it is `ColumnType<S, never, never>`, so an insert
   * that supplies an `id` is a **compile error**, which is precisely what the
   * column does at run time (`cannot insert a non-DEFAULT value into column
   * "id"`, produced). `Generated` would permit it and let the database refuse
   * it later. The two halves agree by construction here, which is rare enough
   * in this file to be worth the note.
   *
   * `string` because it is a `bigint`.
   */
  id: GeneratedAlways<string>;

  /** The natural key, `unique` in the database. Format is unvalidated here and there. */
  symbol: string;

  name: string;
  exchange: string;

  /**
   * The union, not `string`. Three members since `0003` —
   * `equity | sector_etf | index_etf` — because a sector proxy and an index
   * proxy are what Epic 4 and Epic 5 have to tell apart.
   *
   * The two halves agree and **something checks that they do**, which was not
   * true when Task 2.2.4 wrote this comment: `pnpm test:database` parses
   * `securities_kind_check` out of `pg_constraint` and compares it against
   * `SECURITY_KINDS`. It is the check that caught this column and the
   * constraint disagreeing between Tasks 2.3.2 and 2.3.3, which is the only
   * evidence worth having that it works.
   */
  kind: SecurityKind;

  /**
   * The taxonomy union rather than `string` since `0003`, backed by
   * `securities_sector_check`.
   *
   * **Null exactly when {@link kind} is `index_etf`**, which the database holds
   * as `securities_sector_matches_kind` and which `Security` in
   * `packages/shared` holds as a discriminated union. This row type cannot
   * express it — a row is one interface with one nullable column, which is the
   * whole reason the domain type is a different type — so here the two meanings
   * of `null` are indistinguishable and the mapping Story 2.4 writes is where
   * they separate again.
   */
  sector: Sector | null;

  /**
   * Deliberately still an open `string` with no `check`, unlike {@link sector}.
   * There is no ETF per industry, therefore no benchmark, therefore no closed
   * set to be a source of truth for — and a constraint over a list nobody
   * maintains refuses correct data.
   */
  industry: string | null;

  /**
   * The union since `0003`, backed by `securities_status_check`. It was
   * `string` from Task 2.2.4 until then, deliberately, because Story 2.3 owned
   * the vocabulary and one invented earlier would have been a vocabulary that
   * story had to migrate rather than choose.
   *
   * Two members, `active` and `untracked`. It is what replaces a soft delete,
   * and it is an **invisible predicate**: a reader that forgets to filter on it
   * shows untracked securities.
   */
  status: SecurityStatus;

  /** The SEC's Central Index Key. Text, because its leading zeros are part of it. */
  cik: string | null;

  /**
   * When we wrote the row: `timestamptz not null default now()`.
   *
   * The three type parameters are each doing something, and writing it out
   * long-hand rather than as `Generated<Date>` is the point. **Select** is a
   * `Date` — never `timestamp`, because `pg` hands a naive one back as a `Date`
   * silently reinterpreted in the *reading process's* timezone, an error of
   * that process's UTC offset with nothing failing. **Insert** is optional,
   * because the column has a default. And **update is `never`**, which is this
   * type expressing the one thing `../migrations/README.md` §2 says about the
   * column that SQL cannot: "when we wrote it" is not a fact that changes, so
   * an `update` touching it is a bug, and here it is a compile error. The
   * database would happily allow it.
   */
  recorded_at: ColumnType<Date, Date | undefined, never>;

  /**
   * Where `symbol`, `name` and `exchange` came from, and when we asked.
   *
   * `not null` with **no default**, so a writer cannot insert a row without
   * saying where the data came from — which is acceptance criterion 6's
   * enforcement half rather than a schema that merely has somewhere to put it.
   * A `default 'curated'` would silently attribute a provider's row to a file.
   *
   * Plain `string` and `Date` rather than a `ColumnType`: both are supplied on
   * insert and both are updatable, because re-running the loader against a
   * newer source is exactly when they should change. Contrast
   * {@link recorded_at}, whose update parameter is `never`.
   *
   * `SECURITY_FIELD_GROUP` in `packages/shared` maps a field to its group, so
   * Story 2.14 can render "where did this come from" beside any field without
   * reverse-engineering which pair to read.
   */
  profile_source: string;
  profile_retrieved_at: Date;

  /**
   * Where `sector` and `industry` came from, and when we asked.
   *
   * The group whose staleness is a recorded gap: the curated file goes out of
   * date silently, and a sector reclassification has **no symptom at all** — it
   * simply benchmarks a security against the wrong ETF, indefinitely and
   * correctly-looking. This timestamp is the mitigation, and a weak one: it
   * makes the file's age visible on screen through Story 2.14 rather than only
   * in git history.
   */
  classification_source: string;
  classification_retrieved_at: Date;

  /**
   * When it last changed. `Generated<Date>` — defaulted on insert and, unlike
   * {@link recorded_at}, **updatable**, which is the whole distinction between
   * the two columns rendered in the type system.
   *
   * That it is *actually* maintained is the writer's obligation and not this
   * type's: there is deliberately no trigger, so a writer that updates a row
   * and forgets this column leaves a stale value. Nothing catches that — it is
   * the "nothing can confirm a writer put the right value in the right column"
   * case the conventions document names, arriving on the first table.
   */
  updated_at: Generated<Date>;
}

/**
 * `market_bars` — one price observation per security, timeframe and interval.
 * See `../migrations/0004_market_bars.sql`, which is the source of truth this
 * mirrors.
 *
 * **Read this alongside `Bar` in `packages/shared` rather than instead of it.**
 * They describe the same thing at two levels and they deliberately disagree
 * about types: `Bar` carries `number` prices and a `volume`, because that is
 * what a chart axis and an anomaly calculation need, and this carries `string`,
 * because that is what `pg` hands JavaScript for a `numeric` and a `bigint`.
 * The gap between them is a **parse**, and per this file's own rule it lives
 * beside the query as one function per domain type — `toSecurity`'s precedent,
 * and Task 2.8.4 writes this one.
 *
 * The row type also carries three things `Bar` does not, and their absence
 * there is the decision rather than an omission: the security, the timeframe
 * and the bookkeeping. A bar carrying its own symbol and timeframe would be
 * fifty million copies of two constants (`bar.ts` says so); here they are the
 * key.
 */
export interface MarketBarsTable {
  /**
   * `bigint generated always as identity`. {@link SecuritiesTable.id}'s
   * reasoning applies unchanged, including that `GeneratedAlways` makes an
   * insert supplying an `id` a compile error as well as a run-time one.
   */
  id: GeneratedAlways<string>;

  /**
   * The security this bar was observed for — `securities.id`, so a ticker
   * change is a one-row update rather than a rewrite of every bar.
   *
   * `string` because it is a `bigint`, which means the write path carries the
   * id it read from `securities` around as a string rather than converting it.
   * That is the correct direction: converting it to a `number` to "tidy" it is
   * the exact thing `../migrations/README.md` §4 forbids.
   */
  security_id: string;

  /**
   * The union rather than `string`, backed by `market_bars_timeframe_check`.
   * `TIMEFRAMES` in `packages/shared` is the source of truth and the constraint
   * is the database's backstop; `pnpm test:database` is what stops the two
   * drifting, by parsing the constraint Postgres rewrote.
   */
  timeframe: Timeframe;

  /**
   * When the interval **begins in the market**. `Bar.startsAt`, with no shift.
   *
   * `Date` on all three parameters and **no default anywhere**, which is this
   * type restating the column's most important property: a writer must supply
   * it. `../migrations/0004_market_bars.sql` has the argument at length — a
   * `default now()` here would silently turn "when it happened" into "when we
   * wrote it" on the column Epic 13's temporal isolation filters on.
   *
   * Contrast {@link recorded_at} directly below, which is the same Postgres
   * type and means the opposite thing. That the two are indistinguishable by
   * type is exactly why `../migrations/README.md` §2 exists.
   */
  observed_at: Date;

  /**
   * The four prices, `numeric(18, 6)`.
   *
   * **Select is `string`**, and that is `pg` being right rather than awkward: a
   * JavaScript `number` is a double, so a type parser turning these into
   * numbers throws away the exactness the column type was chosen for. Any
   * arithmetic that has to be exact — Epic 5's aggregates — happens in SQL.
   *
   * **Insert and update accept a `number` as well**, because `Bar` carries
   * `number` prices and the write path is handed domain objects. That is safe
   * for a *single* price at scale 6, which is exact in a double four orders of
   * magnitude beyond any equity price; it is accumulation that is lossy, and
   * nothing accumulates on the way in.
   */
  open: ColumnType<string, string | number, string | number>;
  high: ColumnType<string, string | number, string | number>;
  low: ColumnType<string, string | number, string | number>;
  close: ColumnType<string, string | number, string | number>;

  /**
   * Shares traded in the interval. A **count**, so `bigint` and not
   * `numeric(18, 6)` — `../migrations/README.md` §4 draws that line explicitly,
   * and it is the one value in `Bar` that V1 does sum.
   *
   * `string` out for the same reason as the prices, `bigint` accepted in
   * alongside `number` and `string` because a caller that already has one
   * should not have to widen it.
   */
  volume: ColumnType<
    string,
    string | number | bigint,
    string | number | bigint
  >;

  /**
   * When we wrote the row: `timestamptz not null default now()`.
   *
   * Optional on insert because of the default, exactly as
   * {@link SecuritiesTable.recorded_at} is — and then the two **diverge on the
   * update parameter**, which is the one place this table deliberately departs
   * from that one.
   *
   * There it is `never`, because a loader converging on a file rewrites rows
   * routinely and `updated_at` carries the change. Here it is writable, because
   * Story 2.8's open decision 1 settled that a vendor **correction overwrites**
   * the bar rather than versioning it — so `recorded_at` moves with it, and
   * making that a compile error would make the decision unimplementable.
   *
   * There is no `updated_at` beside it for the same reason: the only event that
   * rewrites a bar is a correction, so this column moving *is* the record that
   * one happened. See `../migrations/0004_market_bars.sql`, which carries the
   * argument and the cost — Epic 13 replays a bar as currently known rather
   * than as known at the time.
   */
  recorded_at: ColumnType<Date, Date | undefined, Date>;
}

/**
 * `bar_coverage` — what we hold, per security and timeframe. See
 * `../migrations/0005_bar_coverage.sql`, which is the source of truth this
 * mirrors.
 *
 * **It is a statement about {@link MarketBarsTable} rather than more of it**,
 * and it exists because acceptance criterion 5 asks the system to say what it
 * holds without scanning fifty million rows. Read it as the ledger: one row per
 * `(security_id, timeframe)`, one contiguous covered window, and a count.
 *
 * The two silent failures it can have are mirror images and both look like a
 * healthy system — under-reporting re-fetches history already held, on a
 * metered API, in a command slow enough that nobody investigates it;
 * over-reporting skips a window forever and leaves a hole nothing downstream
 * can see. Neither is detectable from this table. Both are detectable by
 * comparing it against the bars, which is why the expensive query exists in
 * `market-bars.database.test.ts` and nowhere else.
 */
export interface BarCoverageTable {
  /** `bigint generated always as identity`. {@link SecuritiesTable.id}'s reasoning. */
  id: GeneratedAlways<string>;

  /** `securities.id`. `string` because it is a `bigint`. */
  security_id: string;

  /**
   * The union rather than `string`, backed by `bar_coverage_timeframe_check`.
   *
   * Part of the key rather than a plain column: minute and daily history are
   * backfilled to different depths by design, so one row per security would
   * have to pick one of the two to be right about.
   */
  timeframe: Timeframe;

  /**
   * The window we have asked for and been answered for, half-open.
   *
   * **`SeriesCoverage.covered` and never `.requested`** — see the migration.
   * Storing what was asked for rather than what was served is what leaves a
   * permanent 16-minute hole at the head of the data on every catch-up.
   *
   * `Date` on all three parameters and no default anywhere, for
   * {@link MarketBarsTable.observed_at}'s reason: a writer must supply it, and
   * cannot have it filled in on their behalf.
   */
  covered_start: Date;
  covered_end: Date;

  /**
   * Bars held inside that window. A **count**, so `bigint`, and `string` out
   * for {@link MarketBarsTable.volume}'s reason.
   *
   * Insert and update accept a `number` as well, because the writer adds a
   * per-batch row count to it and a batch is thousands rather than 2^53.
   */
  bar_count: ColumnType<string, string | number, string | number>;

  /**
   * When we first wrote this statement. Update is `never`, as it is on
   * `securities` and unlike `market_bars` — this row is *extended* rather than
   * corrected, so the instant it was created never stops being true.
   */
  recorded_at: ColumnType<Date, Date | undefined, never>;

  /**
   * When the statement last changed. Updatable, and that pair is the one
   * `market_bars` deliberately does not have: a row rewritten routinely needs
   * both, a row rewritten only by a correction does not.
   *
   * Maintained by the writer with no trigger, and it moves **only** when
   * something actually changed — which is what makes a no-op re-run leave this
   * table byte-identical, and therefore what lets criterion 2's checksum cover
   * the ledger as well as the bars.
   */
  updated_at: Generated<Date>;
}

/**
 * Every table, by the name Postgres knows it by.
 *
 * `snake_case` keys because these are the database's identifiers rather than
 * ours; Kysely uses them verbatim in the SQL it builds. Story 2.4's mapping
 * layer is where they become domain vocabulary.
 */
export interface Database {
  securities: SecuritiesTable;
  market_bars: MarketBarsTable;
  bar_coverage: BarCoverageTable;
}
