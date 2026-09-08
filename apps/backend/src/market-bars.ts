// The bar store's write path, and the ledger that answers "what do I have"
// (Task 2.8.4).
//
// Two things in one module because they are one transaction. A bar written
// without its ledger row is a system that under-reports what it holds and
// re-fetches it forever, on a metered API, in a command slow enough that nobody
// investigates it because it works. A ledger row written without its bars is one
// that over-reports and leaves a permanent hole. **Both look like a healthy
// system**, neither is detectable from the ledger alone, and both are detectable
// by comparing the ledger against the bars — which is why the expensive
// `min/max/count` query exists in this module's test suite and nowhere else.
//
// ## The seam, and why it does real work here for the first time
//
// `securities.ts` set the arrangement at Task 2.4.1 and this is the second
// instance of it: **build the `Kysely` instance here, do not export it, export
// functions that return domain objects.** Invariant 4 requires Epic 13's
// temporal isolation to be enforced in the data layer so that
// future-information leakage is *structurally impossible* rather than
// instructed; `DATA-LAYER.md` measured that Kysely exposes the query AST to a
// plugin, which can rewrite a call site that asked for no time filter into one
// carrying `observed_at <= $replayClock`, and can **refuse** the raw
// `` sql`…` `` it cannot rewrite. `withPlugin` returns a *different object*, so
// the guarantee is worth nothing if an unplugged handle can be imported.
//
// **The guarantee this module is under is not the one `securities.ts` is
// under.** That table has no `observed_at`, so nothing it does would ever be
// filtered — the seam was established there precisely because breaking it had
// no symptom at all. `market_bars` is the first table where the plugin will do
// real work, and every query below reads or writes the column it rewrites. So:
//
//   * **Nothing here issues raw SQL against `market_bars`.** Every read and
//     write goes through the builder, so Epic 13 has an AST to rewrite. The two
//     raw fragments in this file are `now()` and a boolean predicate inside an
//     `on conflict` clause on `bar_coverage`, which is not a temporal table —
//     neither is a `select` and neither touches `observed_at`.
//   * A new read is a new **function** on {@link MarketBarsRepository}. If a
//     caller needs something no function here provides, the answer is a
//     function and never an exported handle.
//
// ## What this module does not do
//
// It does not fetch, page, pace, retry or decide which window to ask for: that
// is Task 2.8.6's command, and `PROVIDER.md` §8.8 puts pacing there
// deliberately. It does not serve HTTP — Story 2.9 owns the wire contract, and
// {@link MarketBarsRepository.readBars} exists here because a write path whose
// round trip is untested is a write path nobody has checked.

import { Kysely, PostgresDialect, sql, type RawBuilder } from "kysely";
import type pg from "pg";

import {
  marketDateAt,
  marketSessionsBetween,
  toTicker,
  toTimeRange,
  type Bar,
  type BarSeries,
  type Ticker,
  type Timeframe,
  type TimeRange,
} from "@marketpulse/shared";

import type { Database, MarketBarsTable } from "./schema.js";

/**
 * Postgres's ceiling on bind parameters in one statement.
 *
 * `load-universe.ts` carries the same constant for the same reason, and it
 * matters more here: that loader writes hundreds of rows and this one writes
 * millions, so a hard-coded batch size would be a number that works until the
 * day somebody adds a column.
 */
const MAX_BIND_PARAMETERS = 65_535;

/**
 * The columns this writer supplies for a bar. **Eight**, not nine.
 *
 * `recorded_at` is deliberately absent: it defaults to `now()`, which is
 * transaction start time, so every bar written by one batch shares one value —
 * and `migrations/0004_market_bars.sql` records that as correct rather than as
 * an artefact, because the batch *is* the retrieval and invariant 5 wants the
 * retrieval timestamp rather than a per-row clock reading. Supplying it
 * explicitly would take the count to nine and the chunk from 8,191 rows to
 * 7,281 for nothing.
 *
 * It **is** written on the correction path below, as a `now()` expression
 * rather than a bind parameter, so the count above is unaffected.
 */
const BAR_COLUMNS = [
  "security_id",
  "timeframe",
  "observed_at",
  "open",
  "high",
  "low",
  "close",
  "volume",
] as const satisfies readonly (keyof MarketBarsTable)[];

/**
 * The five values that make a bar the same *observation* rather than the same
 * *slot*.
 *
 * The key — `(security_id, timeframe, observed_at)` — says which slot a bar
 * occupies. These say what was observed in it, and a difference between the
 * stored row and an arriving one is the **only** way this system can learn that
 * a vendor corrected a bar. See {@link BarWriteResult.corrected}.
 */
const BAR_VALUE_COLUMNS = [
  "open",
  "high",
  "low",
  "close",
  "volume",
] as const satisfies readonly (keyof MarketBarsTable)[];

/** How many rows fit in one statement, given how many columns each one needs. */
function chunkSize(columns: number): number {
  return Math.max(1, Math.floor(MAX_BIND_PARAMETERS / columns));
}

/**
 * What we hold for one security at one timeframe — the ledger's statement, as a
 * domain object.
 *
 * **The resume point is a field of this rather than a field of its own.**
 * Walking forwards it is `covered.end`; walking backwards it is
 * `covered.start`. Task 2.7.5 measured why it must never be the *requested*
 * end: this plan refuses SIP data from the last ~16 minutes with a flat `403`
 * keyed on `end` alone, so the client clamps the window before the request and
 * reports the clamp as `covered`. A backfill bookmarking what it asked for
 * either re-fetches or leaves a permanent 16-minute hole, renewed every run, in
 * the most recent data every chart opens on.
 */
export interface BarCoverage {
  readonly symbol: Ticker;
  readonly timeframe: Timeframe;

  /**
   * The contiguous window we have asked for and been answered for. Half-open.
   *
   * **How far the answer reaches, not whether it is dense.** Task 2.8.5
   * measured that only 8 of 28 S&P 500 constituents returned a full 390 bars on
   * an ordinary session, so a bar count below `minuteBars` inside this window is
   * a fact about **liquidity** and not about our ingestion. Completeness is a
   * question about this range; thinness is a question about the bars. Task
   * 2.8.7 keeps them in separate columns and this is why it can.
   */
  readonly covered: TimeRange;

  /** How many bars we hold inside {@link covered}. A read, never a `count(*)`. */
  readonly barCount: number;

  /** When this statement last changed — not when it was last confirmed. */
  readonly updatedAt: Date;
}

/**
 * What one write did, in the three categories that are worth telling apart.
 */
export interface BarWriteResult {
  /** Bars the store did not hold. The ordinary case for a backfill. */
  readonly inserted: number;

  /**
   * Bars the store already held whose numbers had **changed**, overwritten.
   *
   * **This is the number Story 2.8's open decision 1 hangs its reversal trigger
   * on, and reporting it is the point rather than a nicety.** V1 stores one row
   * per bar: a correction overwrites, `recorded_at` moves, and Epic 13 therefore
   * replays a bar as currently known rather than as known at the time. That is a
   * real gap in the replay guarantee, recorded rather than papered over, and its
   * trigger is **the first observed correction** — not a story number.
   *
   * A plain `on conflict do nothing` would make that trigger unfireable: it is
   * the cheaper statement, it is what "never `UPDATE` a bar in the ordinary
   * case" sounds like, and it silently discards a changed bar so the first
   * correction goes unnoticed forever. So the write is
   * `do update … where (open, high, low, close, volume) is distinct from
   * (excluded.…)` — `load-universe.ts`'s idiom, borrowed for a different
   * reason. There it keeps `updated_at` honest; here it makes an otherwise
   * undetectable event detectable.
   */
  readonly corrected: number;

  /** Bars already held, identical. A re-run is all of these and nothing else. */
  readonly unchanged: number;

  /**
   * The ledger row as it now stands, or `undefined` when the series was empty
   * and there was nothing to record.
   *
   * See {@link MarketBarsRepository.recordSeries} for what an empty answer does
   * and does not do to the ledger.
   */
  readonly coverage: BarCoverage | undefined;
}

/**
 * The series names a security this database does not have.
 *
 * **A throw rather than a skip**, for `SecurityMappingError`'s reason: a
 * backfill that silently drops a symbol produces a store that is quietly one
 * security short, which is indistinguishable from a universe that is one
 * security smaller — and that is a claim this product makes on screen.
 *
 * The realistic cause is not a typo. Task 2.7.8 measured that **229 tickers in
 * the current catalogue carry both an active and an inactive row**, so a ticker
 * is not a permanent name for a company: `FB` today is an active ProShares ETF
 * rather than Meta. This error is what a symbol that is not in the tracked
 * universe looks like from here; a symbol that is in it but means a *different
 * company* than it did is not detectable at all, and `pnpm universe:check`
 * reports it to a person.
 */
export class UnknownSecurityError extends Error {
  readonly symbol: string;

  constructor(symbol: string) {
    super(
      `No security in this database has the symbol ${symbol}, so there is ` +
        `nothing to file its bars against. Load the tracked universe with ` +
        `\`pnpm universe\`, or check that the symbol is in \`universe.ts\`.`,
    );
    this.name = "UnknownSecurityError";
    this.symbol = symbol;
  }
}

/**
 * The write would leave the ledger claiming a window it does not hold.
 *
 * **This is the one-row/one-range decision made safe rather than merely
 * documented.** `0005_bar_coverage.sql` records that one row can express one
 * contiguous range, that the alternative (many rows merged on write) is more
 * machinery than it is worth, and that the cost is therefore that **the walk
 * must be monotonic**. Left as prose, a backfill that jumps around produces a
 * ledger over-reporting what it holds — the failure nothing downstream can
 * detect, because the bars it claims are simply absent and every instrument in
 * the story agrees the data is correctly missing.
 *
 * The check is exact rather than a threshold, and that is what makes it
 * possible at all. Two adjacent sessions are *disjoint* as intervals — the
 * overnight, the weekend, a holiday — so no interval arithmetic can tell "the
 * next session back" from "a month back". The trading calendar can: the gap
 * between the stored range and an arriving one is acceptable exactly when it
 * contains **no trading session** we would then be claiming without holding.
 */
export class CoverageGapError extends Error {
  readonly symbol: string;
  readonly missingSessions: readonly string[];

  constructor(
    symbol: string,
    timeframe: Timeframe,
    held: TimeRange,
    arriving: TimeRange,
    missingSessions: readonly string[],
  ) {
    super(
      `Writing ${symbol} ${timeframe} for ` +
        `[${arriving.start.toISOString()}, ${arriving.end.toISOString()}) ` +
        `would leave the ledger claiming ` +
        `[${held.start.toISOString()}, ${held.end.toISOString()}) joined to it, ` +
        `with ${String(missingSessions.length)} trading session(s) in the gap ` +
        `that were never fetched: ${missingSessions.slice(0, 5).join(", ")}` +
        `${missingSessions.length > 5 ? ", …" : ""}. ` +
        `The ledger holds one contiguous range per security and timeframe, so ` +
        `the walk has to be monotonic — extend from one end, session by ` +
        `session, rather than jumping.`,
    );
    this.name = "CoverageGapError";
    this.symbol = symbol;
    this.missingSessions = missingSessions;
  }
}

/** A stored row is not a well-formed bar. */
export class BarMappingError extends Error {
  constructor(observedAt: Date, field: string, value: string) {
    super(
      `The market_bars row observed at ${observedAt.toISOString()} has a ` +
        `${field} of ${JSON.stringify(value)}, which is not a number. Every ` +
        `price column is numeric(18, 6) and volume is a bigint, so the ` +
        `database should have refused this.`,
    );
    this.name = "BarMappingError";
  }
}

/** A `market_bars` row, narrowed to the columns {@link toBar} is handed. */
export type BarRow = {
  [
    Column in "observed_at" | (typeof BAR_VALUE_COLUMNS)[number]
  ]: Column extends "observed_at" ? Date : string;
};

/**
 * One row → one {@link Bar}. **The parse, and it is the whole reason
 * `migrations/README.md` §6 forbids a generic row-to-object mapper.**
 *
 * `pg` hands a `numeric` and a `bigint` to JavaScript as **`string`**,
 * deliberately, because a JavaScript number is a double — and that is not a
 * thing to "fix" with a type parser, because fixing it globally would throw
 * away the exactness `numeric(18, 6)` was chosen for. `Bar` carries `number`
 * prices, on `bar.ts`'s stated guard that a single price at scale 6 is exact in
 * a double four orders of magnitude past any equity price and that **an
 * aggregate over prices is computed in SQL over `numeric`, never in JavaScript
 * over this type**.
 *
 * So the gap between the row and the domain object is a *parse*, and a generic
 * mapper is exactly where a parse gets skipped and a price silently becomes the
 * string `"189.234500"` on a chart axis — where it renders, sorts wrongly, and
 * fails no test that did not think to check the type.
 *
 * Exported so the fast suite can drive it: the mapping is a pure function over
 * a row and needs no socket, which keeps the expensive database suite for
 * claims only a database can settle. `toSecurity`'s precedent.
 */
export function toBar(row: BarRow): Bar {
  const parse = (field: (typeof BAR_VALUE_COLUMNS)[number]): number => {
    const raw = row[field];
    const value = Number(raw);
    // The blank check is not redundant with `isFinite`: `Number("")` is **0**,
    // and a zero price is the one wrong answer here that looks entirely
    // plausible on a chart. Every column is `not null`, so a blank cannot
    // arrive — which is the reason to refuse it rather than to allow it.
    if (raw.trim() === "" || !Number.isFinite(value)) {
      throw new BarMappingError(row.observed_at, field, raw);
    }
    return value;
  };

  return {
    // `observed_at` and never `recorded_at`. They are the same Postgres type
    // and mean opposite things, which is the whole reason
    // `migrations/README.md` §2 exists — and this is the mapping it says only
    // review can check.
    startsAt: row.observed_at,
    open: parse("open"),
    high: parse("high"),
    low: parse("low"),
    close: parse("close"),
    volume: parse("volume"),
  };
}

/**
 * Reading and writing bars.
 *
 * An interface rather than a class, for `SecuritiesRepository`'s reason: what a
 * caller depends on is the set of questions it can ask, and Task 2.8.6's
 * command has to be testable without a database.
 */
export interface MarketBarsRepository {
  /**
   * Write a series' bars and extend the ledger, in **one transaction**.
   *
   * One transaction because a partial result here is one of the two silent
   * failures this module exists to prevent — see the header. Produced rather
   * than reasoned about: the suite forces the ledger write to fail and asserts
   * the bars rolled back with it, and forces a bar write to fail and asserts
   * the ledger did not move.
   *
   * **Idempotent, and the mechanism is the key rather than a check.**
   * `(security_id, timeframe, observed_at)` is unique, so a re-run's rows
   * conflict; the `where` clause on the conflict makes the update happen only
   * when the numbers actually differ, so an ordinary re-run writes **nothing**
   * and leaves both tables byte-identical — which is what lets acceptance
   * criterion 2 be asserted on a checksum rather than on this function's own
   * report.
   *
   * ## What an empty series does, and does not, do
   *
   * `BarSeries` requires `coverage.covered` to be `null` exactly when there are
   * no bars, so an empty answer carries no window and **this extends the ledger
   * by nothing**. That is deliberate and its consequence is bounded rather than
   * hidden: a session that genuinely traded nothing, at the *frontier* of the
   * walk, is re-fetched on the next run. A session that traded nothing in the
   * *middle* of a walk is absorbed the moment the next session on the far side
   * of it succeeds, because the ledger's range is the union and the union spans
   * it.
   *
   * So the failure mode is one re-fetched session, which is the safe direction
   * — the alternative is inferring the window from what was *requested*, and
   * Task 2.7.5 measured exactly why that is the bug rather than the fix.
   */
  recordSeries(series: BarSeries): Promise<BarWriteResult>;

  /**
   * The bars we hold for one security, at one timeframe, in one window,
   * ascending.
   *
   * **Bars and not a `BarSeries`**, and the distinction is a decision. A series
   * cannot exist without provenance, and `0004_market_bars.sql` deliberately
   * stores none per bar — provenance travels with a series, and four provenance
   * fields on fifty million rows is fifty million copies of a constant. Building
   * a `BarSeries` out of stored rows therefore needs a `feed` this schema does
   * not have, and that column's trigger is written down: **a second feed writing
   * into this table**, which is Epic 3's live `iex` stream against this story's
   * historical `sip`.
   *
   * Story 2.9 owns the read contract and will meet that. What is here is the
   * round trip the write path's own tests need — a writer whose output has
   * never been read back is a writer nobody has checked.
   */
  readBars(
    symbol: Ticker,
    timeframe: Timeframe,
    range: TimeRange,
  ): Promise<readonly Bar[]>;

  /** What we hold for one security at one timeframe, or nothing. */
  readCoverage(
    symbol: Ticker,
    timeframe: Timeframe,
  ): Promise<BarCoverage | undefined>;

  /**
   * Every statement in the ledger, ordered by symbol then timeframe.
   *
   * This is criterion 5's whole point, and the cost is the point too: it is a
   * few hundred rows regardless of how many bars exist. Task 2.8.9 joins it to
   * the universe to render coverage on `/securities`; a page that `count(*)`s
   * fifty million rows to draw a list is the thing this table exists to
   * prevent.
   */
  listCoverage(): Promise<readonly BarCoverage[]>;
}

interface CoverageRow {
  readonly symbol: string;
  readonly timeframe: Timeframe;
  readonly covered_start: Date;
  readonly covered_end: Date;
  readonly bar_count: string;
  readonly updated_at: Date;
}

function toCoverage(row: CoverageRow): BarCoverage {
  return {
    // The symbol comes back off `securities` rather than being stored twice —
    // the ledger keys on `security_id` for `0004`'s reason, so a ticker change
    // is a one-row update rather than a rewrite. Re-validated through
    // `toTicker` rather than cast, because a brand asserts a check happened and
    // a value that arrived from a database has been checked by nothing here.
    symbol: toTicker(row.symbol),
    timeframe: row.timeframe,
    covered: toTimeRange(row.covered_start, row.covered_end),
    // `bar_count` is a `bigint` and therefore a string. Safe as a `number`:
    // 2^53 against a universe-wide ceiling of ~50.5M rows a year.
    barCount: Number(row.bar_count),
    updatedAt: row.updated_at,
  };
}

/**
 * The trading sessions that lie wholly inside a gap between two windows.
 *
 * Empty for the overnight, the weekend and a holiday between two adjacent
 * sessions — which is what makes a session-by-session walk in either direction
 * acceptable — and non-empty the moment a walk skips something.
 *
 * It reads the calendar rather than applying a threshold, so it has no number
 * in it to be wrong. Note the calendar covers 2024–2028 and **refuses** outside
 * it rather than truncating (ADR 0017), so a window outside that range throws
 * here by name rather than silently reporting no missing sessions — which is
 * the correct direction, and is why `BARS.md` §2 capped the daily depth at
 * 2024-01-01 in the first place.
 */
function sessionsInGap(gapStart: Date, gapEnd: Date): readonly string[] {
  if (gapEnd <= gapStart) return [];

  return marketSessionsBetween(marketDateAt(gapStart), marketDateAt(gapEnd))
    .filter((session) => session.open >= gapStart && session.close <= gapEnd)
    .map((session) => session.date);
}

/**
 * Build the repository over an existing pool.
 *
 * Takes a pool rather than opening one, and has **no `destroy()`**, for
 * `createSecuritiesRepository`'s stated reasons: `index.ts` owns the pool's
 * lifecycle, Kysely's `destroy()` would end it, and a repository that could be
 * destroyed is a second way to close the application's pool half-way through a
 * request.
 *
 * **This is where Epic 13 attaches its temporal plugin** — one `.withPlugin()`
 * on the line below, in the one place a handle is constructed, which is what
 * the seam described at the top of this file buys.
 */
export function createMarketBarsRepository(
  pool: pg.Pool,
): MarketBarsRepository {
  // Not exported, not returned, not reachable. See the header.
  const db = new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  });

  async function coverageFor(
    symbol: Ticker,
    timeframe: Timeframe,
  ): Promise<BarCoverage | undefined> {
    const row = await db
      .selectFrom("bar_coverage")
      .innerJoin("securities", "securities.id", "bar_coverage.security_id")
      .select([
        "securities.symbol",
        "bar_coverage.timeframe",
        "bar_coverage.covered_start",
        "bar_coverage.covered_end",
        "bar_coverage.bar_count",
        "bar_coverage.updated_at",
      ])
      .where("securities.symbol", "=", symbol)
      .where("bar_coverage.timeframe", "=", timeframe)
      .executeTakeFirst();

    return row === undefined ? undefined : toCoverage(row);
  }

  return {
    async recordSeries(series: BarSeries): Promise<BarWriteResult> {
      const { symbol, timeframe, bars, coverage } = series;

      return db.transaction().execute(async (trx) => {
        const security = await trx
          .selectFrom("securities")
          .select("id")
          .where("symbol", "=", symbol)
          .executeTakeFirst();

        if (security === undefined) throw new UnknownSecurityError(symbol);
        const securityId = security.id;

        // The ledger row as it stands, locked for the length of this
        // transaction so a second writer extending the same series waits rather
        // than racing the contiguity check below. The residual, stated: two
        // concurrent *first* writes for one series both see no row and both
        // skip the check, and `on conflict` then resolves them correctly
        // because the update is expressed in terms of the stored row rather
        // than a value computed here. The backfill is serial by design
        // (Task 2.8.6), so that window is not one anything walks into.
        const held = await trx
          .selectFrom("bar_coverage")
          .select(["covered_start", "covered_end"])
          .where("security_id", "=", securityId)
          .where("timeframe", "=", timeframe)
          .forUpdate()
          .executeTakeFirst();

        // An empty answer carries no window, so there is nothing to write and
        // nothing to extend. See `recordSeries`'s doc comment for what that
        // costs and why the alternative is the bug rather than the fix.
        if (coverage.covered === null || bars.length === 0) {
          return {
            inserted: 0,
            corrected: 0,
            unchanged: 0,
            coverage: await readCoverageRow(trx, securityId, timeframe),
          };
        }

        const arriving = coverage.covered;

        if (held !== undefined) {
          // Disjoint in either direction, with sessions in the gap, means this
          // write would make the ledger claim a window it does not hold.
          const missing =
            arriving.end <= held.covered_start
              ? sessionsInGap(arriving.end, held.covered_start)
              : held.covered_end <= arriving.start
                ? sessionsInGap(held.covered_end, arriving.start)
                : [];

          if (missing.length > 0) {
            throw new CoverageGapError(
              symbol,
              timeframe,
              toTimeRange(held.covered_start, held.covered_end),
              arriving,
              missing,
            );
          }
        }

        let inserted = 0;
        let corrected = 0;

        const size = chunkSize(BAR_COLUMNS.length);

        for (let index = 0; index < bars.length; index += size) {
          const batch = bars.slice(index, index + size);
          const written = await writeBatch(trx, securityId, timeframe, batch);
          inserted += written.inserted;
          corrected += written.corrected;
        }

        const nextCoverage = await extendCoverage(
          trx,
          securityId,
          timeframe,
          arriving,
          inserted,
        );

        return {
          inserted,
          corrected,
          unchanged: bars.length - inserted - corrected,
          coverage: nextCoverage,
        };
      });
    },

    async readBars(symbol, timeframe, range) {
      const rows = await db
        .selectFrom("market_bars")
        .innerJoin("securities", "securities.id", "market_bars.security_id")
        .select([
          "market_bars.observed_at",
          "market_bars.open",
          "market_bars.high",
          "market_bars.low",
          "market_bars.close",
          "market_bars.volume",
        ])
        .where("securities.symbol", "=", symbol)
        .where("market_bars.timeframe", "=", timeframe)
        // Half-open, matching `TimeRange`, so adjacent windows tile without a
        // bar claimed by both. The `<` is the whole point and is asserted.
        .where("market_bars.observed_at", ">=", range.start)
        .where("market_bars.observed_at", "<", range.end)
        .orderBy("market_bars.observed_at")
        .execute();

      return rows.map(toBar);
    },

    readCoverage: coverageFor,

    async listCoverage() {
      const rows = await db
        .selectFrom("bar_coverage")
        .innerJoin("securities", "securities.id", "bar_coverage.security_id")
        .select([
          "securities.symbol",
          "bar_coverage.timeframe",
          "bar_coverage.covered_start",
          "bar_coverage.covered_end",
          "bar_coverage.bar_count",
          "bar_coverage.updated_at",
        ])
        .orderBy("securities.symbol")
        .orderBy("bar_coverage.timeframe")
        .execute();

      return rows.map(toCoverage);
    },
  };
}

/** A transaction, or the handle itself — whichever the caller is holding. */
type Executor = Kysely<Database>;

/**
 * `open, high, low, close, volume`, qualified by a table — derived from
 * {@link BAR_VALUE_COLUMNS} so the list exists exactly once.
 *
 * `sql.ref` rather than string interpolation: the identifiers are quoted by the
 * builder, and the values in this clause are columns rather than parameters, so
 * there is nothing here to bind.
 */
function valueColumns(
  qualifier: "market_bars" | "excluded",
): RawBuilder<unknown> {
  return sql.join(
    BAR_VALUE_COLUMNS.map((column) => sql.ref(`${qualifier}.${column}`)),
  );
}

/**
 * One chunk of bars, upserted, with the two outcomes counted apart.
 *
 * The pre-read is what makes "inserted" and "corrected" separable without
 * reading a system column: the conflict's `returning` says *which rows were
 * written*, and the set of keys already present says which of those were
 * already there. `load-universe.ts` takes the same route and records the
 * alternative it declined — `xmax = 0`, which learns the same thing from
 * Postgres's own bookkeeping and is a good deal less obvious to the next
 * reader.
 *
 * It costs one extra round trip per chunk, over the same index range the
 * `insert` is about to use. A session is 390 rows.
 */
async function writeBatch(
  trx: Executor,
  securityId: string,
  timeframe: Timeframe,
  bars: readonly Bar[],
): Promise<{ inserted: number; corrected: number }> {
  const first = bars[0];
  const last = bars[bars.length - 1];
  if (first === undefined || last === undefined) {
    return { inserted: 0, corrected: 0 };
  }

  const present = new Set(
    (
      await trx
        .selectFrom("market_bars")
        .select("observed_at")
        .where("security_id", "=", securityId)
        .where("timeframe", "=", timeframe)
        .where("observed_at", ">=", first.startsAt)
        .where("observed_at", "<=", last.startsAt)
        .execute()
    ).map((row) => row.observed_at.getTime()),
  );

  const written = await trx
    .insertInto("market_bars")
    .values(
      bars.map((bar) => ({
        security_id: securityId,
        timeframe,
        observed_at: bar.startsAt,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
      })),
    )
    .onConflict((oc) =>
      oc
        .columns(["security_id", "timeframe", "observed_at"])
        .doUpdateSet((eb) => ({
          open: eb.ref("excluded.open"),
          high: eb.ref("excluded.high"),
          low: eb.ref("excluded.low"),
          close: eb.ref("excluded.close"),
          volume: eb.ref("excluded.volume"),
          // The correction path is the only thing that ever moves this column,
          // which is what makes it the record that a correction happened —
          // `0004_market_bars.sql` has the argument, and it is why there is no
          // `updated_at` on that table.
          recorded_at: sql<Date>`now()`,
        }))
        // **The clause that turns an undetectable event into a detectable
        // one.** Without it this is an ordinary upsert that rewrites every
        // re-fetched bar with identical numbers, moving `recorded_at` on all of
        // them and destroying the only signal a correction has. With it, an
        // unchanged bar is not written at all and is not returned, so
        // `corrected` counts exactly the bars whose numbers moved.
        //
        // `is distinct from` rather than `<>`: every column here is `not null`,
        // so the two agree today — and `<>` is the spelling that silently stops
        // working the day one of them is not, which is `load-universe.ts`'s
        // measured trap.
        //
        // **Both sides are derived from {@link BAR_VALUE_COLUMNS} rather than
        // written out**, which closes a gap `load-universe.ts` records and
        // could not close: there, the column list and the comparison list are
        // two hand-written lists placed one above the other, and a column added
        // to the first and forgotten in the second silently stops moving
        // `updated_at`. Here there is one list, so a sixth value column cannot
        // be added without this clause following it.
        .where(
          sql<boolean>`(${valueColumns("market_bars")}) is distinct from (${valueColumns("excluded")})`,
        ),
    )
    .returning("observed_at")
    .execute();

  let inserted = 0;
  let corrected = 0;
  for (const row of written) {
    if (present.has(row.observed_at.getTime())) corrected += 1;
    else inserted += 1;
  }

  return { inserted, corrected };
}

/**
 * Extend the ledger to the union of what it held and what just arrived.
 *
 * **The union is computed in SQL rather than here**, with `least` and
 * `greatest` over the stored row, so the conflict path is correct even when the
 * row was written by somebody else between this transaction's read and its
 * write. Computing it in JavaScript from the row read at the top would be a
 * lost update wearing the shape of an optimisation.
 *
 * **The `where` is what keeps `updated_at` meaning "when the statement
 * changed".** Without it every write moves it, including a re-run that inserted
 * nothing — which makes the column mean *when the backfill last ran*, the same
 * failure `UNIVERSE_PROVENANCE` exists to avoid on the retrieval timestamps and
 * the reason `0005_bar_coverage.sql` refuses a "last attempted" column
 * outright. With it, an unchanged re-run leaves this table byte-identical, so
 * acceptance criterion 2's checksum covers the ledger as well as the bars.
 */
async function extendCoverage(
  trx: Executor,
  securityId: string,
  timeframe: Timeframe,
  arriving: TimeRange,
  inserted: number,
): Promise<BarCoverage> {
  await trx
    .insertInto("bar_coverage")
    .values({
      security_id: securityId,
      timeframe,
      covered_start: arriving.start,
      covered_end: arriving.end,
      bar_count: inserted,
    })
    .onConflict((oc) =>
      oc
        .columns(["security_id", "timeframe"])
        .doUpdateSet(() => ({
          covered_start: sql<Date>`least(bar_coverage.covered_start, excluded.covered_start)`,
          covered_end: sql<Date>`greatest(bar_coverage.covered_end, excluded.covered_end)`,
          bar_count: sql<string>`bar_coverage.bar_count + excluded.bar_count`,
          updated_at: sql<Date>`now()`,
        }))
        .where(
          sql<boolean>`
            excluded.covered_start < bar_coverage.covered_start
            or excluded.covered_end > bar_coverage.covered_end
            or excluded.bar_count <> 0`,
        ),
    )
    .execute();

  const row = await readCoverageRow(trx, securityId, timeframe);
  if (row === undefined) {
    // Unreachable: the insert above either wrote the row or found one to
    // conflict with. Stated rather than cast away, because a repository that
    // returns a coverage it did not read would be reporting an intention.
    throw new Error(
      `The ledger row for security ${securityId} at ${timeframe} is missing ` +
        `immediately after being written, inside the transaction that wrote it.`,
    );
  }
  return row;
}

/** The ledger row, read back through the same executor that wrote it. */
async function readCoverageRow(
  trx: Executor,
  securityId: string,
  timeframe: Timeframe,
): Promise<BarCoverage | undefined> {
  const row = await trx
    .selectFrom("bar_coverage")
    .innerJoin("securities", "securities.id", "bar_coverage.security_id")
    .select([
      "securities.symbol",
      "bar_coverage.timeframe",
      "bar_coverage.covered_start",
      "bar_coverage.covered_end",
      "bar_coverage.bar_count",
      "bar_coverage.updated_at",
    ])
    .where("bar_coverage.security_id", "=", securityId)
    .where("bar_coverage.timeframe", "=", timeframe)
    .executeTakeFirst();

  return row === undefined ? undefined : toCoverage(row);
}
