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
  MarketFeed,
  ProviderId,
  ReturnBaselineRefusal,
  Sector,
  SecurityKind,
  SecurityStatus,
  Timeframe,
} from "@marketpulse/shared";

import type { BarAttemptOutcome } from "./bar-attempts.js";
import type { VolumeBaselineStoredRefusal } from "./volume-baseline.js";

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
   * Which tape this bar was observed on — `sip`, `iex`, `synthetic` or
   * `replay`. See `../migrations/0010_market_bars_feed.sql` and ADR 0034.
   *
   * **The invariant-6 column, per bar, and the reversal of `0004`'s decision
   * at its own trigger.** Until Story 3.7 the tape lived one row per series in
   * {@link BarCoverageTable.feed}; the day a second feed writes into this
   * table that row cannot state the series' tape honestly, and Story 3.8 is
   * that day.
   *
   * **The union rather than `string`**, backed by `market_bars_feed_check`,
   * exactly as {@link timeframe} is — and the check is deliberately `NOT
   * VALID` (the migration says why; `pnpm test:database` asserts it stays so).
   *
   * **Required on insert, so the database's default is unreachable from
   * shipped code** — `BarCoverageTable.feed`'s arrangement, and `0007`'s. The
   * default (`'sip'`) exists for the deploy window, in which the migration has
   * run and the previous backfill has not yet rolled and inserts without the
   * column, and for the rows that predate the column; a writer built from
   * this interface that omits the tape is a compile error. Task 3.7.2 shipped
   * this as `MarketFeed | undefined` for exactly one task, so the writer it
   * did not yet touch could omit the column; Task 3.7.3 narrowed it the moment
   * every writer stamped the tape from the series' own provenance
   * (`market-bars.ts`, `writeBatch`). Update is `never`, for
   * {@link BarCoverageTable.feed}'s reason: a bar's tape is a fact about where
   * it was observed and does not change afterwards — which is also why a
   * correction moves the numbers and not the tape, `TAPE.md` §6.
   */
  feed: ColumnType<MarketFeed, MarketFeed, never>;

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
 * `(security_id, timeframe)`, one contiguous covered window, a count, and —
 * **since `0007_bar_coverage_provenance.sql` (Task 2.9.4, 2026-09-09)** — the
 * {@link BarCoverageTable.provider} and {@link BarCoverageTable.feed} that
 * window came from. That last pair is what lets a served series carry
 * provenance the bars themselves deliberately do not hold.
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
   * Who sold us the bars in that window — and, since Task 3.7.4, **only
   * that**: the tape column beside it is the tape the window was opened
   * with and no more. See `../migrations/0007_bar_coverage_provenance.sql`
   * for the shape and `TAPE.md` §7 for what each column means now.
   *
   * **The unions rather than `string`**, backed by `bar_coverage_provider_check`
   * and `bar_coverage_feed_check`, exactly as {@link timeframe} is.
   *
   * **`provider` is a read and a rule.** A window has one provider — the row
   * on {@link MarketBarsTable} carries the tape and nothing else (ADR 0034's
   * reversal trigger is the first per-bar field beyond it), so this is the
   * only place a window's provider is written and the only place a served
   * series can take it from. `recordSeries` refuses a series naming a
   * different one (`ForeignSourceError`, reason `provider`).
   *
   * **`feed` is withdrawn from every decision.** Until Story 3.7 it was the
   * one tape of the whole window and a series naming another was refused;
   * since `0010_market_bars_feed.sql` every bar carries its own and a window
   * may hold two, which this column cannot say. It holds the tape the window
   * was **opened** with, the write path neither reads nor updates it, and
   * `readSeries` is its last reader until Task 3.7.5 derives a window's
   * sources from the rows. It stays here because a contract is a second
   * deploy (`../migrations/README.md`, expand then contract) and because
   * dropping a column from a live ledger is not this story's to do.
   *
   * **Plain rather than `ColumnType` on the insert side, and that is still
   * load-bearing.** Both columns carry a database default, which
   * `0002_securities.sql` refused for `profile_source` on the argument that a
   * default silently attributes one source's data to another. The default
   * exists only so the *previous* backfill survives the window between the
   * deploy's migrate step and its code roll. Both are **required on insert**,
   * so a writer that omits one is a compile error and the database's default
   * is unreachable from any shipped writer.
   *
   * **Update is `never`** on both. The provider of a window does not change,
   * and the tape column is not relabelled when a second tape extends the
   * window — that is what *withdrawn* means — so an `update` touching either
   * is a bug, and here it is a compile error. The database would allow it.
   */
  provider: ColumnType<ProviderId, ProviderId, never>;
  feed: ColumnType<MarketFeed, MarketFeed, never>;

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
 * `bar_attempts` — what happened on a session that left no bars (Task 2.8.7).
 *
 * The third and last table in this story, and the one that makes acceptance
 * criterion 4 answerable. `market_bars` is the data, {@link BarCoverageTable} is
 * how far it reaches, and this is what happened on a particular session that is
 * inside that reach and holds nothing — which without it is indistinguishable
 * from a session nobody ever asked about.
 *
 * **Sparse by construction.** A session that stored bars has no row here, and a
 * later success deletes any row that was here. When everything is well this
 * table is empty.
 */
export interface BarAttemptsTable {
  /** `bigint generated always as identity`. {@link SecuritiesTable.id}'s reasoning. */
  id: GeneratedAlways<string>;

  /** `securities.id`. `string` because it is a `bigint`. */
  security_id: string;

  /** The union rather than `string`, backed by `bar_attempts_timeframe_check`. */
  timeframe: Timeframe;

  /**
   * The market date, as a label rather than as an instant.
   *
   * `string` and never `Date`, and the migration explains why at length: `pg`
   * hands a Postgres `date` back as a `Date` at local midnight, so a row written
   * as 2026-09-03 reads back as 2026-09-02 in any process east of UTC — the
   * same silent reinterpretation §2 forbids a naive `timestamp` for.
   *
   * It is a plain `string` here rather than `MarketDate` for the reason
   * {@link SecuritiesTable} keeps `symbol` a plain `string`: a brand asserts a
   * check happened, and a value that arrived from a database has been checked by
   * nothing in this process. `bar-attempts.ts` re-validates it through
   * `toMarketDate` on the way out.
   */
  session_date: string;

  /**
   * The union rather than `string`, backed by `bar_attempts_outcome_check`.
   *
   * Nine members: `BarsResult`'s eight, where `ok` means *answered and left no
   * bars*, plus `coverage-gap`, which is our own refusal rather than a vendor
   * outcome.
   */
  outcome: BarAttemptOutcome;

  /** A short human note. Nullable, and never parsed by anything. */
  detail: ColumnType<string | null, string | null, string | null>;

  /** When we first recorded an attempt at this session. Update is `never`. */
  recorded_at: ColumnType<Date, Date | undefined, never>;

  /**
   * When the outcome last changed. Maintained by the writer with the
   * `is distinct from` idiom, so a re-run that fails the same way twice leaves
   * this table byte-identical.
   */
  updated_at: Generated<Date>;
}

/**
 * `security_memberships` — when each security entered and left the tracked
 * universe (Task 5.1.5). See `../migrations/0012_security_memberships.sql`,
 * which is the source of truth this mirrors and which carries the decisions.
 *
 * **Append-only, and the type system is where that is enforced.** Every column
 * below has `never` as its update parameter, so there is no `updateTable` call
 * against this table that compiles — which is the one property a history table
 * has that `securities` does not. A correction is a further row.
 *
 * **It is read by nothing in this repository yet, and that is the point rather
 * than a loose end.** Epic 13 is the reader: *which securities were tracked on
 * this session date* is a range query against this table, and the answer cannot
 * be reconstructed for any date before the first row — which is why the table
 * is written now rather than when it is first read.
 */
export interface SecurityMembershipsTable {
  /** `bigint generated always as identity`. {@link SecuritiesTable.id}'s reasoning. */
  id: GeneratedAlways<string>;

  /**
   * `securities.id`, a real foreign key with no `on delete`. `string` because
   * it is a `bigint` — {@link MarketBarsTable.security_id}'s note applies
   * unchanged, including that converting it to a `number` to tidy it is what
   * `../migrations/README.md` §4 forbids.
   */
  security_id: ColumnType<string, string, never>;

  /**
   * What the membership **became** at {@link effective_from}, backed by
   * `security_memberships_status_check`.
   *
   * The union rather than `string`, exactly as {@link SecuritiesTable.status}
   * is, and from the same source of truth in `packages/shared`. Note it is a
   * statement about a past interval rather than about the row's present, so
   * unlike `securities.status` it is **not** an invisible predicate: a reader
   * of this table is asking what was true then, which is the whole subject.
   */
  status: ColumnType<SecurityStatus, SecurityStatus, never>;

  /**
   * When this membership became true — the curated file's own `checkedOn` date
   * at UTC midnight, never the clock.
   *
   * `Date` on insert and **no default anywhere**, which is this type restating
   * the column's most important property, exactly as
   * {@link MarketBarsTable.observed_at} does: a `default now()` here would turn
   * the column a replay keys on into a record of when a script ran, invisibly.
   *
   * It is deliberately not named `observed_at`, because a membership change is
   * a fact about **us** rather than about the market — the migration's §4 has
   * the argument and the constraint it puts on Epic 13's temporal plugin.
   */
  effective_from: ColumnType<Date, Date, never>;

  /**
   * When we wrote the row: `timestamptz not null default now()`.
   *
   * Optional on insert because of the default and `never` on update, which is
   * {@link SecuritiesTable.recorded_at}'s arrangement for its reason: "when we
   * wrote it" is not a fact that changes.
   */
  recorded_at: ColumnType<Date, Date | undefined, never>;
}

/**
 * Every table, by the name Postgres knows it by.
 *
 * `snake_case` keys because these are the database's identifiers rather than
 * ours; Kysely uses them verbatim in the SQL it builds. Story 2.4's mapping
 * layer is where they become domain vocabulary.
 */
/**
 * `return_baselines` — the 60-session distribution of 5-minute returns, per
 * security, keyed by the session it is FOR (Task 5.3.2). See
 * `../migrations/0013_return_baselines.sql`, which is the source of truth this
 * mirrors and which carries the decisions, and
 * [ADR 0044](../../../docs/adr/0044-a-derived-aggregate-is-computed-nightly-and-keyed-by-the-session-it-is-for.md).
 *
 * ## **DERIVED AND RECOMPUTABLE. Recompute with `pnpm baselines`.**
 *
 * This is the **first derived table in this schema** and the label is
 * load-bearing rather than descriptive: every other table here holds something
 * we were told — a bar, a membership, a coverage claim — and this one holds
 * something computed from `market_bars`. Dropping every row loses nothing, and
 * the nightly job in `.github/workflows/backfill.yml` rebuilds the newest
 * generation the following night.
 *
 * Said in three places — here, in the migration's §1 and in the ADR — because a
 * table nobody has labelled is a table the next reader treats as primary. The
 * named cost of that mistake: a later story changing the breakpoint grid, the
 * lookback or the split ceiling would believe it had to migrate the rows, and
 * would write an expensive backfill against a cache.
 *
 * ## It is the one table in this schema whose rows are UPDATED
 *
 * `securities` aside, every other table here is append-only or rewritten by a
 * conflict on its natural key. A second pass over a window that is already
 * stored **updates** it, which is what makes `pnpm baselines` re-runnable and
 * convergent in `pnpm universe`'s sense. So the update parameters below are not
 * uniformly `never` the way `SecurityMembershipsTable`'s are — but the two
 * columns that identify a generation are, because a row that could change which
 * security or which window it describes is a row a replay cannot trust.
 */
export interface ReturnBaselinesTable {
  /** `bigint generated always as identity`. {@link SecuritiesTable.id}'s reasoning. */
  id: GeneratedAlways<string>;

  /**
   * `securities.id`, a real foreign key with no `on delete`. `string` because
   * it is a `bigint` — {@link MarketBarsTable.security_id}'s note applies
   * unchanged, including that converting it to a `number` to tidy it is what
   * `../migrations/README.md` §4 forbids.
   *
   * `never` on update: a row does not change which security it describes.
   */
  security_id: ColumnType<string, string, never>;

  /**
   * **The window's END** — the instant the last session this distribution was
   * computed over closed, and the coordinate a replay keys on.
   *
   * `Date` on insert and **no default anywhere**, exactly as
   * {@link MarketBarsTable.observed_at} has none: a `default now()` would turn
   * *when the window ended* into *when a script ran*, invisibly, because every
   * row would look plausible.
   *
   * **It carries `README.md` §2's reserved name deliberately, diverging from
   * `0012`'s `effective_from` in the opposite direction.** A membership change
   * is a fact about us; a baseline's window end **names a session of market
   * data**, so the reserved name is the correct one — and taking it means Epic
   * 13's temporal plugin covers this table with its generic
   * `where "observed_at" <= $clock` and no explicit clock argument, which is
   * invariant 4's own bar.
   *
   * `never` on update, with `security_id`: together they are the generation.
   */
  observed_at: ColumnType<Date, Date, never>;

  /**
   * How many trading sessions the window spanned — `60` today,
   * `BASELINE_LOOKBACK_SESSIONS`.
   *
   * Stored per row rather than assumed, so a generation taken at a different
   * depth is readable as such instead of silently comparable to one that was
   * not. Updatable, because a re-run at a new depth over the same window end is
   * a correction rather than a second generation.
   */
  lookback_sessions: ColumnType<number, number, number>;

  /**
   * **`n`, counted by the pass.** 78 grid anchors yield **77** increments, an
   * early close yields **41**, and median stored coverage is 82.8% so grid
   * pairs are routinely absent — which is why no constant can produce this.
   *
   * `string` on read because it is a `bigint`, which is
   * {@link BarCoverageTable.bar_count}'s arrangement exactly — and it is
   * `bigint` because `../migrations/README.md` §4 says a count is, enforced by
   * `migrate.database.test.ts` on every `_count` column. The mapping to a
   * `number` happens beside the query, as `toCoverage` already does for
   * `barCount`.
   */
  sample_count: ColumnType<string, string | number, string | number>;

  /**
   * The 101 magnitude breakpoints, `0th … 100th`, ascending — `null` exactly
   * when {@link refusal} is set, which `return_baselines_one_answer` enforces.
   *
   * `double precision[]`, and that is **not** a breach of
   * `../migrations/README.md` §4: that rule exists because float addition is
   * not associative, and nothing here is summed. Each sample is one division of
   * two `numeric` closes and the aggregation is a **sort** — order statistics,
   * exact and order-independent whatever the element type. The migration's §5
   * is the long version.
   */
  breakpoints: ColumnType<number[] | null, number[] | null, number[] | null>;

  /**
   * Why there is no distribution, or `null`. The vocabulary is
   * `RETURN_BASELINE_REFUSALS` in `packages/shared` and
   * `return_baselines_refusal_known` is the database's backstop.
   */
  refusal: ColumnType<
    ReturnBaselineRefusal | null,
    ReturnBaselineRefusal | null,
    ReturnBaselineRefusal | null
  >;

  /**
   * When we wrote the row: `timestamptz not null default now()`.
   *
   * Optional on insert because of the default, and **updatable here unlike
   * everywhere else in this schema** — it is what makes a stale generation
   * visible. A row whose `observed_at` is last Friday's close and whose
   * `recorded_at` is this morning was recomputed; the two together are the only
   * way to tell that from a row nobody has touched.
   */
  recorded_at: ColumnType<Date, Date | undefined, Date>;
}

/**
 * `session_return_percentiles` — where one security's **closing** 5-minute
 * return sat in its own 60-session history, for one completed session (Task
 * 5.4.5). See `../migrations/0014_session_return_percentiles.sql`, which is the
 * source of truth this mirrors and which carries the decisions, and
 * [ADR 0044](../../../docs/adr/0044-a-derived-aggregate-is-computed-nightly-and-keyed-by-the-session-it-is-for.md).
 *
 * ## **DERIVED AND RECOMPUTABLE. Recompute with `pnpm baselines`.**
 *
 * This is the **second derived table in this schema** — {@link
 * SessionReturnPercentilePassesTable} is the third — and the label is
 * load-bearing rather than descriptive: the row is computed from `market_bars`
 * and `return_baselines` by the nightly pass, as a by-product of a read that is
 * already running. Dropping every row loses nothing.
 *
 * Said in three places — here, in the migration's §1 and in the ADR — because a
 * table nobody has labelled is a table the next reader treats as primary, and
 * the named cost is a later story changing the ranking rule or which pair of
 * the session is scored and writing an expensive backfill against a cache.
 *
 * ## A row is a SCORE. A refused security has no row
 *
 * The migration's §4, which is where this diverges from `return_baselines`: a
 * baseline refusal is a row because it is safe to stop retrying, and a session
 * score is the input to a ranked list of ten, where ADR 0038 decision 5 drops
 * the whole row rather than carrying a `rank: null` that reads as `0` — a
 * plausible 0th percentile at the top of a region about unusual moves. The five
 * refusal kinds are counted on the pass row instead.
 */
export interface SessionReturnPercentilesTable {
  /** `bigint generated always as identity`. {@link SecuritiesTable.id}'s reasoning. */
  id: GeneratedAlways<string>;

  /**
   * `securities.id`, a real foreign key with no `on delete`. `string` because
   * it is a `bigint`. `never` on update: a row does not change which security
   * it describes.
   */
  security_id: ColumnType<string, string, never>;

  /**
   * **The scored session's close** — the coordinate a replay keys on, and
   * `README.md` §2's reserved name so Epic 13's plugin covers this table with
   * its generic predicate.
   *
   * `Date` on insert and **no default anywhere**: a `default now()` would turn
   * *the session this describes* into *when a script ran*, invisibly.
   *
   * `never` on update, with `security_id`: together they are the score.
   */
  observed_at: ColumnType<Date, Date, never>;

  /** The integer ordinal, `0`–`99`. `returnPercentileOf`'s own figure. */
  rank: ColumnType<number, number, number>;

  /**
   * Whether the magnitude is strictly above every sample the baseline holds.
   *
   * `false` on every row this pass writes today, because the window it ranks
   * against **contains** the sample being ranked — the migration's §5 states
   * that difference from the live path rather than leaving it to be noticed.
   */
  above_sample: ColumnType<boolean, boolean, boolean>;

  /**
   * **`n`, counted by the pass** — the same figure `return_baselines` stored
   * for this security and this window, beside the ordinal it was taken
   * against. `string` on read because it is a `bigint`, which
   * `../migrations/README.md` §4 requires of a count and
   * `migrate.database.test.ts` enforces on every `_count` column.
   */
  sample_count: ColumnType<string, string | number, string | number>;

  /**
   * **The SIGNED move, as a percentage** — `numeric(18, 6)`, so `string` on
   * read.
   *
   * The percentile ranks `Math.abs(percent)`, so the sign is **not recoverable
   * from the ordinal**: a −9% crash and a +9% spike are the identical rank, and
   * the drawn row's direction glyph reads this column.
   */
  percent: ColumnType<string, string | number, string | number>;

  /**
   * The two endpoints with their tape — `WireMeasuredReturn`'s rule stored: the
   * figure may not be read without the two instants it was measured between.
   * The instants are the bars' own `startsAt`.
   */
  from_at: ColumnType<Date, Date, Date>;
  from_price: ColumnType<string, string | number, string | number>;
  from_feed: ColumnType<MarketFeed, MarketFeed, MarketFeed>;
  to_at: ColumnType<Date, Date, Date>;
  to_price: ColumnType<string, string | number, string | number>;
  to_feed: ColumnType<MarketFeed, MarketFeed, MarketFeed>;

  /**
   * How many of the span's minutes we hold a close for, `1`–`span_minutes`.
   * `fiveMinuteReturn`'s `observed`, counted in the walk that picked the
   * endpoints.
   */
  observed_minutes: ColumnType<number, number, number>;

  /**
   * When we wrote the row: `timestamptz not null default now()`. Optional on
   * insert and **updatable**, as `ReturnBaselinesTable.recorded_at` is and for
   * its reason — a re-run of one session rewrites its rows, and the pair with
   * `observed_at` is the only way to tell a recomputed row from an untouched
   * one.
   */
  recorded_at: ColumnType<Date, Date | undefined, Date>;
}

/**
 * `session_return_percentile_passes` — one row per session recording **what the
 * pass was over, how much of it got past the line, and why the rest did not**
 * (Task 5.4.5).
 *
 * ## **DERIVED AND RECOMPUTABLE. Recompute with `pnpm baselines`.**
 *
 * The **third derived table in this schema**; see
 * {@link SessionReturnPercentilesTable} for the label's cost and the migration's
 * §1 for the command.
 *
 * ## Why it is a table rather than three columns on every score row
 *
 * Because a **refused** security has no score row (the migration's §4), so on a
 * session where nothing was rankable there are no rows at all — and that is
 * exactly the session whose footer has to stay honest. The three populations and
 * the five refusal counts are facts about the pass, and `Unusual activity`'s
 * whole claim is those figures rather than the ten rows above them.
 *
 * The reader establishes the pair by equality on `observed_at` and reads this
 * row **first**, so a partially-failed pass — scores written, no pass row — is
 * invisible rather than half-drawn.
 */
export interface SessionReturnPercentilePassesTable {
  id: GeneratedAlways<string>;

  /**
   * **The scored session's close**, and the natural key: one pass per session.
   * No default, `never` on update — {@link
   * SessionReturnPercentilesTable.observed_at}'s reasoning.
   */
  observed_at: ColumnType<Date, Date, never>;

  /**
   * **The three populations, which nest** — `tracked ⊇ eligible ⊇ scored`,
   * checked in the database and again by `readUnusual` at the browser's end,
   * because the region's cut sentence rests on the chain and a negative
   * remainder is a count of securities that cannot exist.
   *
   * `bigint`, so `string` on read: `../migrations/README.md` §4's rule for a
   * count.
   */
  tracked_count: ColumnType<string, string | number, string | number>;
  eligible_count: ColumnType<string, string | number, string | number>;
  scored_count: ColumnType<string, string | number, string | number>;

  /**
   * **Why the rest are not rows, by name.** The first three are
   * `ReturnRefusal`'s members and the last two are `PercentileRefusal`'s — five
   * facts with five repairs, which is why they are five columns and not one
   * `refused` total or a `jsonb` bag.
   */
  nothing_observed_count: ColumnType<string, string | number, string | number>;
  no_earlier_endpoint_count: ColumnType<
    string,
    string | number,
    string | number
  >;
  no_basis_count: ColumnType<string, string | number, string | number>;
  too_few_samples_count: ColumnType<string, string | number, string | number>;
  split_discontinuity_count: ColumnType<
    string,
    string | number,
    string | number
  >;

  /** The span each row's endpoints are apart — ADR 0043's measurement span. */
  span_minutes: ColumnType<number, number, number>;

  /**
   * **What the ordinals were measured against, as the pass applied it** — not
   * as a later bundle believes it. A rollback can put a runner and a reader two
   * values apart, which is `WireRefusedPercentile.minimumSampleCount`'s
   * recorded reason, and `baseline_feed` is invariant 6 in a column: the
   * distribution is `sip` and the live numerator is `iex`, and a comparison
   * whose tape nothing records is one the screen cannot attribute.
   */
  baseline_feed: ColumnType<MarketFeed, MarketFeed, MarketFeed>;
  baseline_span_minutes: ColumnType<number, number, number>;
  baseline_lookback_sessions: ColumnType<number, number, number>;
  minimum_sample_count: ColumnType<string, string | number, string | number>;

  recorded_at: ColumnType<Date, Date | undefined, Date>;
}

/**
 * `volume_baselines` — the 60-session median volume of one minute of each
 * 5-minute time of day, per security, **on the IEX tape** (Task 5.5.3). See
 * `../migrations/0015_volume_baselines.sql`, which is the source of truth this
 * mirrors and which carries the decisions, and
 * [ADR 0044](../../../docs/adr/0044-a-derived-aggregate-is-computed-nightly-and-keyed-by-the-session-it-is-for.md).
 *
 * ## **DERIVED AND RECOMPUTABLE. Recompute with `pnpm baselines`.**
 *
 * The **fourth derived table in this schema** — {@link
 * VolumeBaselinePassesTable} is the fifth — and the label is load-bearing
 * rather than descriptive: the row is computed from `market_bars` and
 * `return_baselines` by the nightly pass, as a second statement over the same
 * 538-block index range the price pass already reads. Dropping every row loses
 * nothing.
 *
 * Said in three places — here, in the migration's §1 and in the ADR — because a
 * table nobody has labelled is a table the next reader treats as primary, and
 * the named cost is a later story changing the bucket width, the tape, the
 * lookback or the precision target and writing an expensive backfill against a
 * cache.
 *
 * ## The tape is in the KEY, which is where this diverges from `0013`
 *
 * The migration's §4: the numerator is the live IEX socket's own volume, so the
 * baseline is same-tape or the figure is refused (Gate 1 decision 1) — and that
 * decision has a stated reversal trigger, so a flip would otherwise update
 * every row in place with nothing recording that the distribution changed tape.
 *
 * ## Three parallel arrays rather than a row per bucket
 *
 * The migration's §6: 78 buckets × 516 securities is ~322 KB an array and
 * ~966 KB for three, against 40,248 rows a session and ~10 M a year for the
 * per-bucket shape — which would break the no-index argument `0013` §6 rests
 * on. `volume_baselines_bucket_arity` holds all three to {@link bucket_count},
 * because an array column has no arity of its own and three that can disagree
 * is a bucket index meaning a different time of day in each.
 */
export interface VolumeBaselinesTable {
  /** `bigint generated always as identity`. {@link SecuritiesTable.id}'s reasoning. */
  id: GeneratedAlways<string>;

  /**
   * `securities.id`, a real foreign key with no `on delete`. `string` because
   * it is a `bigint`. `never` on update: a row does not change which security
   * it describes.
   */
  security_id: ColumnType<string, string, never>;

  /**
   * **The window's END** — the instant the last session it was computed over
   * closed, and the coordinate a replay keys on. `README.md` §2's reserved
   * name, so Epic 13's plugin covers this table with its generic predicate.
   *
   * `Date` on insert and **no default anywhere**: a `default now()` would turn
   * *when the window ended* into *when a script ran*, invisibly.
   *
   * `never` on update, with `security_id` and `feed`: the three are the
   * generation.
   */
  observed_at: ColumnType<Date, Date, never>;

  /**
   * **The tape, in the key** — `VOLUME_BASELINE_FEED` is `iex` today, and the
   * migration's §4 is the argument. Invariant 6 in a column: a distribution
   * whose tape nothing records is one the screen cannot attribute.
   */
  feed: ColumnType<MarketFeed, MarketFeed, never>;

  /**
   * How many trading sessions the window spanned — 60 today,
   * `BASELINE_LOOKBACK_SESSIONS`, obtained through `baselineWindowEndingAt`
   * rather than counted a second time.
   */
  lookback_sessions: ColumnType<number, number, number>;

  /**
   * The grid's stride in minutes — `SAMPLE_SPAN_MINUTES`, the same five the
   * return baseline's anchors step by. **The sample inside a bucket is one
   * MINUTE**, not the bucket's sum, which is Gate 1 decision 4 and is what
   * puts `n` in the thousands.
   */
  bucket_minutes: ColumnType<number, number, number>;

  /**
   * The grid's size: the **maximum** over the window's sessions, so 78 for
   * regular sessions and 42 for half days. It is the three arrays' arity.
   *
   * `string` on read because it is a `bigint` — `../migrations/README.md` §4's
   * rule for a count.
   */
  bucket_count: ColumnType<string, string | number, string | number>;

  /**
   * **`n` over the whole window, counted by the pass.** `60 × 5` is wrong three
   * ways: an early close has 42 buckets, the `iex` tape's median per-symbol
   * minute presence is 65.1%, and the window reaches back past the live
   * writer's 2026-09-23. A refused row carries the count it reached.
   */
  sample_count: ColumnType<string, string | number, string | number>;

  /**
   * **The median volume of one minute of each time of day**, bucket 0 first —
   * `null` element for a bucket holding no sample at all, and the whole array
   * `null` exactly when {@link refusal} is set, which
   * `volume_baselines_one_answer` enforces.
   *
   * `double precision[]`, and that is **not** a breach of
   * `../migrations/README.md` §4: that rule exists because float addition is
   * not associative, and nothing here is summed in SQL — the aggregation is a
   * **sort**. The migration's §6 is the long version.
   */
  bucket_medians: ColumnType<
    (number | null)[] | null,
    (number | null)[] | null,
    (number | null)[] | null
  >;

  /**
   * Each bucket's counted `n`, aligned with the array above. A `bigint[]`
   * because these are counts, so the elements arrive as **strings**; the
   * mapping to numbers happens beside the query.
   */
  bucket_samples: ColumnType<string[] | null, string[] | null, string[] | null>;

  /**
   * Each bucket's achieved relative standard error — `√(π/2)·CV/√n` with the
   * CV measured over that bucket's own samples. `null` element for a bucket
   * with no measurable spread, which means **unknown** rather than *fine*: a
   * CV of zero is a licence to print any figure from any sample.
   *
   * The error rather than the CV, because the error is what the printed
   * precision is read against — and storing it is what lets the bound move in
   * a deploy rather than in a recompute of 516 securities.
   */
  bucket_errors: ColumnType<
    (number | null)[] | null,
    (number | null)[] | null,
    (number | null)[] | null
  >;

  /**
   * Why there is no distribution, or `null`. One member, **read from the price
   * pass rather than re-derived** — the migration's §5 — and
   * `VOLUME_BASELINE_STORED_REFUSALS` in `volume-baseline.ts` is the vocabulary
   * `volume_baselines_refusal_known` backstops.
   */
  refusal: ColumnType<
    VolumeBaselineStoredRefusal | null,
    VolumeBaselineStoredRefusal | null,
    VolumeBaselineStoredRefusal | null
  >;

  /**
   * When we wrote the row: `timestamptz not null default now()`. Optional on
   * insert and **updatable**, as {@link ReturnBaselinesTable.recorded_at} is
   * and for its reason — a re-run of a generation rewrites its rows, and the
   * pair with `observed_at` is the only way to tell a recomputed row from an
   * untouched one.
   */
  recorded_at: ColumnType<Date, Date | undefined, Date>;
}

/**
 * `volume_baseline_passes` — one row per window per tape recording **what the
 * pass was over, how many securities and buckets got past the line, and why
 * the rest did not** (Task 5.5.3).
 *
 * ## **DERIVED AND RECOMPUTABLE. Recompute with `pnpm baselines`.**
 *
 * The **fifth derived table in this schema**; see {@link VolumeBaselinesTable}
 * for the label's cost and the migration's §1 for the command.
 *
 * ## Why it is a table, and why it bites harder here than it did at `0014`
 *
 * ADR 0044's own generalisation: *an aggregate keyed by its session needs a
 * companion row for what the pass saw, because the absence of rows is
 * indistinguishable from the absence of a pass.* A security with no `iex` bar
 * in the window gets **no row** (the migration's §5) — and on the `iex` tape
 * that is essentially every security for weeks, which Gate 1 decision 1
 * accepted explicitly. So the ordinary state of the table beside this one is
 * *empty*, and that is exactly the state the figure's depth sentence has to
 * stay honest in.
 *
 * ## The populations PARTITION rather than nest
 *
 * The difference from `0014`'s three nesting counts. Every tracked security
 * ends in exactly one of three: measured, refused for an inherited price
 * break, or never heard on this tape. The database holds the partition,
 * because a reader cannot subtract *how many securities can this figure be
 * drawn for* out of three figures that overlap.
 */
export interface VolumeBaselinePassesTable {
  id: GeneratedAlways<string>;

  /**
   * **The window's end**, and with {@link feed} the natural key: one pass per
   * window per tape. No default, `never` on update — {@link
   * VolumeBaselinesTable.observed_at}'s reasoning.
   */
  observed_at: ColumnType<Date, Date, never>;

  /** The tape the pass computed over. `never` on update, with `observed_at`. */
  feed: ColumnType<MarketFeed, MarketFeed, never>;

  /**
   * **The three security populations, which partition** — and the fourth
   * column is the total they sum to, checked in the database by
   * `volume_baseline_passes_securities_partition`.
   *
   * `bigint`, so `string` on read: `../migrations/README.md` §4's rule for a
   * count.
   */
  tracked_count: ColumnType<string, string | number, string | number>;
  measured_count: ColumnType<string, string | number, string | number>;
  split_discontinuity_count: ColumnType<
    string,
    string | number,
    string | number
  >;
  absent_count: ColumnType<string, string | number, string | number>;

  /**
   * **The bucket populations**, over the sample-bearing buckets of the measured
   * securities. A bucket is drawable, too thin to print to one decimal, or
   * typically empty of shares; `empty_bucket_count` is counted outside the
   * partition because a bucket with no sample at all is a fact about the
   * **grid** — an early close's afternoon — rather than about the security.
   */
  bucket_count: ColumnType<string, string | number, string | number>;
  measured_bucket_count: ColumnType<string, string | number, string | number>;
  too_few_sessions_bucket_count: ColumnType<
    string,
    string | number,
    string | number
  >;
  zero_volume_bucket_count: ColumnType<
    string,
    string | number,
    string | number
  >;
  empty_bucket_count: ColumnType<string, string | number, string | number>;

  /** What the pass applied, not what a later bundle believes — `0014` §5. */
  lookback_sessions: ColumnType<number, number, number>;
  bucket_minutes: ColumnType<number, number, number>;

  /**
   * **The precision target in force when the pass ran** —
   * `TARGET_RELATIVE_STANDARD_ERROR`, the owner's 2026-10-20 decision that the
   * figure keeps one decimal.
   *
   * The bound is applied when a row is **read**, so this is what the bucket
   * tallies above were counted against rather than a verdict binding any
   * reader — which is the one way to tell *the target moved* from *the depth
   * moved* between two passes.
   *
   * **`numeric(18, 6)`, so `string` on read** — and the migration's §6 records
   * why the array columns' `double precision` argument does not reach a
   * scalar: `migrate.database.test.ts` refuses a floating-point column
   * outright and the arrays escape it only because their `data_type` is
   * `ARRAY`. 0.05 is exact at six decimal places.
   */
  target_relative_standard_error: ColumnType<
    string,
    string | number,
    string | number
  >;

  recorded_at: ColumnType<Date, Date | undefined, Date>;
}

export interface Database {
  securities: SecuritiesTable;
  market_bars: MarketBarsTable;
  bar_coverage: BarCoverageTable;
  bar_attempts: BarAttemptsTable;
  security_memberships: SecurityMembershipsTable;
  return_baselines: ReturnBaselinesTable;
  session_return_percentiles: SessionReturnPercentilesTable;
  session_return_percentile_passes: SessionReturnPercentilePassesTable;
  volume_baselines: VolumeBaselinesTable;
  volume_baseline_passes: VolumeBaselinePassesTable;
}
