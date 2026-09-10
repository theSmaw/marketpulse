// The bar store's write path, and the ledger that answers "what do I have"
// (Task 2.8.4).
//
// **Amended 2026-09-10 at Story 2.9's close: it is also the SERVING read.**
// Task 2.9.4 grew {@link MarketBarsRepository.readBars} into the query
// `GET /market-data/bars` answers from, and Task 2.9.7 added
// {@link MarketBarsRepository.readLastCloses}, which `GET /securities`
// answers from. The first line is therefore short by the thing most readers
// now arrive here for. What is still true, and is the distinction worth
// keeping, is that this module does not *serve HTTP* — no route, no status,
// no schema lives here — it returns domain objects and `routes/` puts them on
// a wire.
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
//
// **Amended 2026-09-10 at Story 2.9's close.** That last clause records why
// `readBars` was *originally* here and is no longer why it is here: Story 2.9
// took it as the served read rather than writing a second one, which is the
// outcome the seam exists to produce. "It does not serve HTTP" is still true
// in the narrow sense — the route, the status and the schema are in
// `routes/market-data.ts` — and false in the sense a reader would take from
// it, which is that nothing on this path is user-facing.

import { Kysely, PostgresDialect, sql, type RawBuilder } from "kysely";
import type pg from "pg";

import {
  marketDateAt,
  marketSessionsBetween,
  toBarSeries,
  toSeriesProvenance,
  toTicker,
  toTimeRange,
  type Adjustment,
  type Bar,
  type BarSeries,
  type MarketFeed,
  type ProviderId,
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

  /**
   * Who sold us the bars in {@link covered}, and which venues are in them
   * (`0007_bar_coverage_provenance.sql`).
   *
   * **The fact `market_bars` deliberately does not store, held once per series
   * instead of once per row.** It is what lets {@link toStoredSeries} build a
   * `BarSeries` out of stored rows at all, and it is a stored fact rather than
   * an assertion at the read boundary — which matters because a store holding
   * `fixture`/`synthetic` bars is something this repository creates on purpose.
   *
   * Not a `BarSource`: that type also carries `retrievedAt` and `barCount`, and
   * both are answers about a *served window* rather than about the ledger's.
   */
  readonly source: { readonly provider: ProviderId; readonly feed: MarketFeed };

  /** How many bars we hold inside {@link covered}. A read, never a `count(*)`. */
  readonly barCount: number;

  /** When this statement last changed — not when it was last confirmed. */
  readonly updatedAt: Date;
}

/**
 * The last close we hold for one security, and the close before it (Task
 * 2.9.7).
 *
 * The domain answer behind `SecurityLastClose` on the `/securities` wire, and
 * it stops one field short of it: this carries the **instant** the daily bar is
 * observed at, and the route converts that to a market date through
 * `marketDateAt`. That split is `toWireCoverage`'s and it is the same rule —
 * `market-time.ts` is the one module permitted to convert, and putting the
 * conversion in the mapper beside the query means it happens once rather than
 * at every reader.
 *
 * **`previous` is nullable and the null is a real answer**, not a missing one:
 * a security we hold exactly one daily bar for has a close and nothing to
 * compare it against. A security we hold *no* daily bars for is absent from
 * {@link MarketBarsRepository.readLastCloses}' map entirely, which is
 * `listCoverage`'s spelling of the same distinction.
 *
 * **No provenance.** The ledger holds a source per `(security, timeframe)` and
 * this read deliberately does not join it: a close is a price, and Task 2.6.7's
 * rule is that no second thing may answer *which feed*. The reader that wants
 * that answer asks the market-data route for a series.
 */
export interface LastClose {
  readonly symbol: Ticker;

  /**
   * The instant the closing bar is observed at — for a `1d` bar, the session's
   * own label rather than its close time.
   */
  readonly observedAt: Date;

  /** The session's closing price. */
  readonly close: number;

  /** The close of the session before it, or `null` when we hold only one. */
  readonly previousClose: number | null;
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
/**
 * One `numeric(18, 6)` column → one price, refusing anything that is not one.
 *
 * {@link toBar}'s parse, factored out because {@link
 * MarketBarsRepository.readLastCloses} needs the same judgement over a row that
 * is not a whole bar. `migrations/README.md` §6's rule survives that: this is
 * still a parse written beside the query rather than a generic row mapper, and
 * there is still one function per domain type above it.
 *
 * The blank check is not redundant with `isFinite`: `Number("")` is **0**, and
 * a zero price is the one wrong answer here that looks entirely plausible.
 */
function toPrice(observedAt: Date, raw: string): number {
  const value = Number(raw);
  if (raw.trim() === "" || !Number.isFinite(value)) {
    throw new BarMappingError(observedAt, "close", raw);
  }
  return value;
}

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
 * Who sold us a window's bars, and which venues are in them — the pair the
 * ledger stores and `market_bars` deliberately does not.
 *
 * A pair rather than a {@link BarSource}: that type also carries `retrievedAt`
 * and `barCount`, which are answers about a *served* window rather than about a
 * stored one.
 */
export interface SeriesSource {
  readonly provider: ProviderId;
  readonly feed: MarketFeed;
}

/**
 * What a series says it came from when the store has **no row** to say it with.
 *
 * Not the general answer, and the general answer is the interesting part. See
 * `0007_bar_coverage_provenance.sql`: `market_bars` stores no per-bar
 * provenance, `bar_coverage` stores it per `(security, timeframe)`, and
 * {@link toStoredSeries} reads it from there. This constant covers the one case
 * the ledger cannot: an answer holding **no bars at all**, for a pair the
 * ledger has never had a row for.
 *
 * `SeriesProvenance.sources` is a non-empty tuple, so such an answer still owes
 * one source — and that source's `barCount` is `0`, so what these two fields
 * describe is nothing. They are not a claim about data; a claim about data
 * requires data. The alternative was to make the field nullable throughout
 * `packages/shared` so that "we hold nothing" could be spelled with no source at
 * all, which is a change to the domain model of every series in the product to
 * express a case the wire already distinguishes with `bars: []` and
 * `coverage.covered: null`.
 */
const SOURCE_OF_NOTHING: SeriesSource = { provider: "alpaca", feed: "sip" };

/**
 * What has been done to the prices in this table: **nothing**.
 *
 * `market-provenance.ts` names the store as `raw`'s reader in terms — it holds
 * raw bars and never rewrites one because of a corporate action, which is what
 * Epic 13's replay needs and what Epic 5's percentile windows will have to
 * adjust for themselves. There is deliberately no default adjustment anywhere
 * in `packages/shared` (acceptance criterion 5 of Story 2.6), so this is a
 * statement about this table rather than a fallback.
 *
 * **Exported since Task 2.9.5**, which is the reader that makes it load-bearing
 * rather than local: the stitch asks a provider for the uncovered tail and
 * `mergeSeriesProvenance` *refuses* to join two adjustments, so the tail has to
 * be requested at whatever this table holds. A literal `"raw"` at that call
 * site would be a second statement about this table's contents, and the two
 * would agree only until one of them was edited.
 */
export const STORED_BAR_ADJUSTMENT: Adjustment = "raw";

/**
 * A series' source disagrees with the ledger row it would extend, or with
 * itself.
 *
 * **This is `0004_market_bars.sql`'s trigger firing per series rather than
 * being noticed later by a person.** That migration stores no per-bar
 * provenance and names its reversal condition as *a second feed writing into
 * this table*; `bar_coverage` holds one source per `(security, timeframe)`, so
 * the moment a second one writes into one series there is no row that can
 * describe it truthfully.
 *
 * A throw rather than a relabel and rather than a silent accept, because both
 * alternatives end in the same place: rows in `market_bars` that the ledger
 * then misdescribes to every reader, with nothing able to tell them apart from
 * the rows it describes correctly. That is invariant 6 failing without anything
 * going red — the shape this story's task file warns against resolving with a
 * shrug.
 *
 * It is **not** only a tripwire for Epic 3. It is what stops the case that
 * exists today: `pnpm backfill` under `MARKET_DATA_PROVIDER=fixture` stores
 * invented prices, and appending them to a window already filled from a real
 * feed would put both under one label.
 */
export class ForeignSourceError extends Error {
  readonly provider: ProviderId;
  readonly feed: MarketFeed;

  constructor(
    symbol: Ticker,
    timeframe: Timeframe,
    provider: ProviderId,
    feed: MarketFeed,
    held: SeriesSource | "itself",
  ) {
    super(
      held === "itself"
        ? `This ${symbol} ${timeframe} series names more than one source, and ` +
            `one of them is ${provider}/${feed}. The ledger holds one source ` +
            `per security and timeframe, so a stitched series cannot be ` +
            `stored as one window — record each part against the window it ` +
            `actually covers.`
        : `This ${symbol} ${timeframe} series came from ${provider}/${feed} ` +
            `and the store already holds ${held.provider}/${held.feed} for the ` +
            `same series. \`market_bars\` stores no per-bar provenance, so the ` +
            `two would be indistinguishable afterwards and every bar in the ` +
            `window would be served under one label. If a second feed now ` +
            `writes here, this is the trigger \`0004_market_bars.sql\` records ` +
            `for a per-bar feed column.`,
    );
    this.name = "ForeignSourceError";
    this.provider = provider;
    this.feed = feed;
  }
}

/**
 * The one source a series names, or a refusal if it names more than one.
 *
 * A stitched series — `mergeSeriesProvenance`'s output, which Task 2.9.5
 * produces routinely — has several, and the honest way to store one is to
 * record each part against the window it actually covers. Silently taking the
 * first is how both halves end up under one label.
 */
function singleSourceOf(series: BarSeries): SeriesSource {
  const [first, ...rest] = series.provenance.sources;

  for (const other of rest) {
    if (other.provider !== first.provider || other.feed !== first.feed) {
      throw new ForeignSourceError(
        series.symbol,
        series.timeframe,
        other.provider,
        other.feed,
        "itself",
      );
    }
  }

  return { provider: first.provider, feed: first.feed };
}

/**
 * Bars exist for a window the ledger makes no statement about.
 *
 * The mirror of {@link CoverageGapError}, on the read side, and the reason it
 * is a throw is that the alternative is a **fabricated coverage claim**: with
 * no ledger row there is nothing to say how far the answer reaches, and the
 * only ways to produce one are to derive it from the bars themselves — which
 * turns a thin name's quiet hour into a partial answer, the exact conflation
 * `BarCoverage.covered` is documented to avoid — or to claim the whole
 * requested window, which is a false statement about data we do not have.
 *
 * It is unreachable through {@link MarketBarsRepository.recordSeries}, which
 * writes bars and ledger in one transaction. It is reachable by anything that
 * deletes from `bar_coverage` alone, and that is one of the two silent failures
 * this module's header exists to describe — so it becomes a 500 rather than a
 * plausible chart.
 */
export class MissingCoverageError extends Error {
  readonly symbol: Ticker;
  readonly timeframe: Timeframe;

  constructor(symbol: Ticker, timeframe: Timeframe, barCount: number) {
    super(
      `The store holds ${String(barCount)} ${timeframe} bar(s) for ${symbol} ` +
        `in this window and the ledger holds no row for the pair, so there is ` +
        `nothing that can say how far the answer reaches. Bars and ledger are ` +
        `written in one transaction, so this is a store that has been edited ` +
        `around the writer.`,
    );
    this.name = "MissingCoverageError";
    this.symbol = symbol;
    this.timeframe = timeframe;
  }
}

/**
 * A `market_bars` row with the one bookkeeping column the served read needs.
 *
 * `recorded_at` is not part of a {@link Bar} and never will be — a bar is what
 * the market did — but it is the only per-row fact in this schema that answers
 * *when did we fetch this*, and {@link toStoredSeries} turns it into the
 * series' `retrievedAt`.
 */
export type DatedBarRow = BarRow & { readonly recorded_at: Date };

/** Everything {@link toStoredSeries} needs, which is one query's worth of it. */
export interface StoredSeriesInput {
  readonly symbol: Ticker;
  readonly timeframe: Timeframe;

  /** The window the caller asked for. Reported back as `coverage.requested`. */
  readonly requested: TimeRange;

  /** The rows inside {@link requested}, ascending. */
  readonly rows: readonly DatedBarRow[];

  /** The ledger's statement about the pair, or `undefined` if there is none. */
  readonly held: BarCoverage | undefined;

  /**
   * The instant of the read, used **only when the answer holds no bars**.
   *
   * Injected rather than read from the clock so the one branch that touches it
   * is visible at the call site and assertable in a test. See
   * {@link toStoredSeries} for why an empty answer is the one case where this
   * is not the trap `BarSource.retrievedAt` warns about.
   */
  readonly now: Date;
}

/**
 * Stored rows → a {@link BarSeries}, **including the provenance
 * `market_bars` does not hold** (Task 2.9.4).
 *
 * Pure, exported and unit-tested without a socket, for `toBar`'s reason: the
 * interesting half of this function is a set of decisions about what to claim,
 * and a decision that can only be exercised through a database is a decision
 * nobody exercises.
 *
 * ## `provider` and `feed` come off the ledger, not off a constant here
 *
 * `0004_market_bars.sql` stores no per-bar provenance and that is unchanged —
 * four columns on forty-eight million rows are forty-eight million copies of two
 * constants. `0007_bar_coverage_provenance.sql` stores them on `bar_coverage`
 * instead, ~1,036 rows, and the reason it is stored rather than asserted here is
 * a measurement rather than a preference: `backfill.database.test.ts` drives the
 * shipped backfill with the **fixture** provider into a real database, so a
 * store holding `fixture`/`synthetic` bars is something this repository creates
 * on purpose. A constant asserting `alpaca`/`sip` would label invented prices as
 * the full US consolidated tape.
 *
 * ## `retrievedAt` comes from `recorded_at`, and is never stamped now
 *
 * **The rule first, because it is the one that matters:** a read path that
 * stamps `retrievedAt` when it serves stored bars turns *"these bars were
 * fetched three weeks ago"* into *"these bars are current"*.
 * `market-provenance.ts` warns about it in terms, and Task 2.3.5 already found
 * the same trap once — a provenance date defaulted to `now()` is permanently
 * silent, unable to report the one thing it exists to report.
 *
 * So the value is `min(recorded_at)` **over the rows actually returned**, and
 * each half of that is a choice:
 *
 *  - **`recorded_at` rather than `bar_coverage.updated_at`.** The ledger's
 *    timestamp is scoped to the whole series, so a catch-up appending today's
 *    bars moves it for a window fetched a year earlier — it overstates the
 *    freshness of everything it covers. `recorded_at` is scoped to the window
 *    being served, and it is *already* per-retrieval rather than per-row:
 *    {@link BAR_COLUMNS} lets it default to `now()`, which is transaction start,
 *    so every bar one batch wrote shares one value and **the batch is the
 *    retrieval**. That is exactly what invariant 5 asks a provenance record to
 *    carry.
 *  - **`min` rather than `max`.** A window can span several batches — measured
 *    on 2026-09-09 against the local store, five sessions of `NVDA` minute bars
 *    are six batches spanning 13 seconds — and a single-source record has one
 *    timestamp for all of them. `max` reports the freshest and understates the
 *    staleness of the rest, which is the same failure as the ledger's, smaller.
 *    `min` cannot overstate freshness. The alternative that reports both truly
 *    is one source per batch, and it is refused: a year of daily backfill would
 *    put ~250 sources on the wire, and `sources` is the field Story 2.14 renders
 *    to say *part IEX, part consolidated tape*.
 *
 * **The empty answer is the one case that uses {@link StoredSeriesInput.now},
 * and it is not the trap above.** `SeriesProvenance.sources` is a non-empty
 * tuple, so a series with no bars still owes one source; the source's
 * `barCount` is then `0`, and a retrieval timestamp attached to zero bars can
 * misdate nothing. What it states is true: as of this instant, we looked and
 * held nothing. The rejected alternative was the ledger's `updated_at`, which
 * would attribute a real past retrieval to an answer that contains none of it.
 *
 * ## `covered` comes from the ledger, and `null` when the answer is empty
 *
 * `BARS.md` §9.1: coverage is read from `bar_coverage`, never by counting
 * `market_bars` — a page load that scanned forty-eight million rows would
 * arrive in Task 2.9.9's timings as a mystery with no obvious author. So a
 * non-empty answer covers the **intersection** of what was asked for with what
 * the ledger says we hold, which is *"how far this answer reaches"* rather than
 * *"where the bars happen to stop"*. The distinction is the one
 * {@link BarCoverage.covered} already draws and is not cosmetic: Task 2.8.5
 * measured that only 8 of 28 S&P 500 constituents print a full 390 minutes in a
 * session, so deriving `covered` from the bars would report a quiet hour in a
 * thinly traded name as a partial answer.
 *
 * An **empty** answer covers `null`, in both directions, because
 * {@link toBarSeries} requires exactly that — and Task 2.9.3 measured the wire
 * shape it produces (`covered: null`, never `""`, which the serialiser would
 * render as a covered window). The information that gets lost — *we do cover
 * this window and nothing traded in it* — is not lost from the caller, which
 * receives the ledger row beside the series as {@link StoredSeries.held}.
 */
export function toStoredSeries(input: StoredSeriesInput): BarSeries {
  const { symbol, timeframe, requested, rows, held, now } = input;

  const bars = rows.map(toBar);

  const provenance = toSeriesProvenance(STORED_BAR_ADJUSTMENT, {
    // From the ledger, which is where `0007_bar_coverage_provenance.sql` put
    // it. The constant is reached only when there is no ledger row at all,
    // which is an answer holding no bars — see `SOURCE_OF_NOTHING`.
    ...(held?.source ?? SOURCE_OF_NOTHING),
    retrievedAt: (earliestRecordedAt(rows) ?? now).toISOString(),
    barCount: bars.length,
  });

  if (bars.length === 0) {
    return toBarSeries({
      symbol,
      timeframe,
      bars,
      provenance,
      coverage: { requested, covered: null },
    });
  }

  if (held === undefined)
    throw new MissingCoverageError(symbol, timeframe, bars.length);

  // The intersection. `toTimeRange` refuses an inverted or zero-width range, and
  // that refusal is wanted here: bars inside a window the ledger says we do not
  // hold is the ledger under-reporting, which is one of the two silent failures
  // this module's header describes, and a served answer built on it would be a
  // false coverage claim. `toBarSeries` catches the narrower version of the same
  // disagreement — a bar outside the range this then claims.
  const covered = toTimeRange(
    later(requested.start, held.covered.start),
    earlier(requested.end, held.covered.end),
  );

  return toBarSeries({
    symbol,
    timeframe,
    bars,
    provenance,
    coverage: { requested, covered },
  });
}

/** The oldest write time among these rows, or `undefined` if there are none. */
function earliestRecordedAt(rows: readonly DatedBarRow[]): Date | undefined {
  let earliest: Date | undefined;
  for (const row of rows) {
    if (
      earliest === undefined ||
      row.recorded_at.getTime() < earliest.getTime()
    ) {
      earliest = row.recorded_at;
    }
  }
  return earliest;
}

function later(first: Date, second: Date): Date {
  return first.getTime() >= second.getTime() ? first : second;
}

function earlier(first: Date, second: Date): Date {
  return first.getTime() <= second.getTime() ? first : second;
}

/**
 * A served series, with the ledger's own statement beside it.
 *
 * **Two fields because the route needs to tell three empty answers apart**, and
 * a `BarSeries` alone can only express two of them. `MARKET-DATA-API.md` §6:
 * a symbol this system does not know is a **404**; a symbol we know and hold
 * nothing for, and a window inside which nothing traded, are both **200 with an
 * empty series**. The first of those three is answered by the securities lookup
 * (Task 2.9.6) and never by this read — `UNIVERSE.md` §12.2 and §7 are explicit
 * that `status` is **not** filtered here, so an `untracked` symbol returns its
 * stored history rather than a 404, which would be a lie about data we hold.
 * The other two are `held === undefined` and `held !== undefined` respectively.
 *
 * `held` is also what Task 2.9.5 stitches against: `held.covered.end` is where
 * the store stops and therefore the only part of the window worth asking a
 * metered provider for.
 */
export interface StoredSeries {
  /** The bars, with provenance and coverage. Possibly empty. */
  readonly series: BarSeries;

  /** The ledger's statement, or `undefined` when we hold nothing at all. */
  readonly held: BarCoverage | undefined;
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
   * ~~Story 2.9 owns the read contract and will meet that.~~ **Met by
   * {@link readSeries} (Task 2.9.4)**, which produces the missing `feed` from
   * {@link STORED_BAR_SOURCE} rather than from a column. This one stays: it is
   * the round trip the write path's own tests need — a writer whose output has
   * never been read back is a writer nobody has checked — and it is the cheaper
   * question when a caller genuinely wants bars rather than a series.
   */
  readBars(
    symbol: Ticker,
    timeframe: Timeframe,
    range: TimeRange,
  ): Promise<readonly Bar[]>;

  /**
   * The stored series for one security, timeframe and window — **the read the
   * market-data API serves** (Task 2.9.4).
   *
   * {@link readBars} with the two things a wire response cannot do without: the
   * provenance `0004_market_bars.sql` deliberately does not store, and the
   * ledger's statement of how far the answer reaches. See
   * {@link toStoredSeries} for where each of those comes from and what was
   * rejected, and {@link StoredSeries} for why the ledger row travels beside
   * the series rather than inside it.
   *
   * **`status` is not filtered**, deliberately — `UNIVERSE.md` §12.2's rule is
   * that we filter when computing over the market we track *now* and never when
   * showing something we *stored*. A symbol we have stopped tracking returns
   * its stored history; saying otherwise would be a lie about data we hold.
   *
   * `now` is used only when the answer holds no bars.
   */
  readSeries(
    symbol: Ticker,
    timeframe: Timeframe,
    range: TimeRange,
    now: Date,
  ): Promise<StoredSeries>;

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

  /**
   * The newest bar we hold for each security at one timeframe.
   *
   * **Read at the DAILY timeframe even when reporting on minute bars**, and that
   * is a cost decision rather than an approximation: a
   * `max(observed_at) group by security_id` over daily bars is ~130,000 rows for
   * a year of the tracked universe and finishes in milliseconds, where the same
   * query over minute bars is fifty million. Both answer the same question —
   * whether this security is still printing at all — which is Task 2.7.8's
   * `delisted` signal, moved here on the measurement that bars stopping
   * correlates with reality at 100% against the vendor's own flag at 92%.
   *
   * Keyed by symbol, and a security holding no bars is simply absent rather than
   * present with a null.
   */
  readLastBarDates(timeframe: Timeframe): Promise<ReadonlyMap<Ticker, Date>>;

  /**
   * The last two closes we hold for each security at one timeframe (Task
   * 2.9.7).
   *
   * **Two rows and not one, because the second is what makes the first mean
   * anything.** A price with no comparison is a number; a price beside the
   * session before it is a move, which is what `/securities` renders. The
   * previous close is *read* rather than derived — it is the stored preceding
   * session, never "the day before" by arithmetic on a calendar, so a security
   * that did not trade on a session compares against the session it actually
   * traded on.
   *
   * ## Read at `1d`, and the cost is the whole argument
   *
   * `readLastBarDates` above makes the same choice for the same reason and
   * states it: the daily half of `market_bars` is ~345k rows against ~47.7M
   * minute ones. This read goes further — it takes the two newest rows **per
   * security** through the existing `(security_id, timeframe, observed_at)`
   * index, one bounded backwards index scan each, so it never touches the
   * minute half of the index at all.
   *
   * Measured 2026-09-09 against the local store at full depth — 47,682,213
   * minute bars and 345,559 daily ones — with `explain (analyze, buffers)` over
   * the SQL this builder actually compiles:
   *
   * | Shape                                                   |   Rows |             Time |
   * | ------------------------------------------------------- | -----: | ---------------: |
   * | This query, cold                                        |  1,036 |        21.4 ms   |
   * | This query, warm, whole round trip from Node            |  1,036 | 4.8–8.2 ms       |
   * | `row_number() over (partition by …)`, cold              |  1,036 |       830.1 ms   |
   * | the same, warm                                          |  1,036 | 182–279 ms       |
   *
   * The window-function form is the one everybody writes first and it is 30–40×
   * worse warm, because it reads all 345,559 daily rows and sorts them to
   * return 1,036. This one reads **2,597 buffers** — 518 index searches of two
   * rows each — and its `Index Cond` pins `timeframe = '1d'`, which is what
   * makes "the minute half is not scanned" a property of the plan rather than a
   * hope. Re-measure rather than cite these; `BARS.md` §8.6 carries the method.
   *
   * ## What it does not do
   *
   * **No filter on `securities.status`.** `UNIVERSE.md` §12.2's rule: filter
   * when computing over the market we track *now*, never when showing something
   * we *stored*. A security we have stopped tracking still closed at a price on
   * the last session we hold, and the page renders the row.
   *
   * Keyed by symbol, and a security holding no bars at this timeframe is simply
   * **absent** rather than present with a zero — {@link listCoverage}'s
   * spelling, and the one that keeps "we hold nothing for this" and "it closed
   * at nothing" from becoming the same value.
   */
  readLastCloses(timeframe: Timeframe): Promise<ReadonlyMap<Ticker, LastClose>>;
}

interface CoverageRow {
  readonly symbol: string;
  readonly timeframe: Timeframe;
  readonly covered_start: Date;
  readonly covered_end: Date;
  readonly provider: ProviderId;
  readonly feed: MarketFeed;
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
    // Both columns are `check`-constrained to the shipped vocabularies, and
    // `pnpm test:database` compares the constraints against `PROVIDER_IDS` and
    // `MARKET_FEEDS` — so the narrowing here is held by the database rather than
    // asserted by this line.
    source: { provider: row.provider, feed: row.feed },
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
 *
 * **Exported since Task 2.9.5**, which asks the same question on the read side:
 * a stored half and a freshly fetched tail can be joined into one covered range
 * only if nothing the backfill owns lies between them. Same question, same
 * calendar, one definition — a second copy would be a threshold somewhere that
 * disagreed with this one about a half day.
 */
export function sessionsInGap(gapStart: Date, gapEnd: Date): readonly string[] {
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
        "bar_coverage.provider",
        "bar_coverage.feed",
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

      // **Before the transaction, before a round trip.** The ledger holds one
      // source per `(security, timeframe)` window, so a series naming two
      // cannot be recorded as one — see `ForeignSourceError`.
      const source = singleSourceOf(series);

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
          .select(["covered_start", "covered_end", "provider", "feed"])
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

          // **`0004_market_bars.sql`'s trigger, as a mechanism.** That
          // migration stores no per-bar provenance and names its reversal
          // condition as a second feed writing into this table; this row can
          // describe one source, so appending a second to the same series would
          // put both under one label with nothing able to tell them apart.
          if (held.provider !== source.provider || held.feed !== source.feed) {
            throw new ForeignSourceError(
              symbol,
              timeframe,
              source.provider,
              source.feed,
              held,
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
          source,
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

    async readSeries(symbol, timeframe, range, now) {
      // **Bars first, then the ledger, and the order is deliberate.** The two
      // statements run outside a transaction — `securities.ts` records the same
      // trade-off — so under READ COMMITTED each sees its own snapshot, and a
      // write landing between them is visible to the second only. Read this way
      // round, the ledger a concurrent write leaves is at least as wide as the
      // bars already in hand. The other way round it would be narrower, and
      // `toStoredSeries` would refuse a bar outside the range it then claims,
      // turning an ordinary race into a 500 on a page load.
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
          // The one column `readBars` does not select, and the whole reason
          // this is a separate query rather than a wrapper around it. See
          // `toStoredSeries`: it becomes the series' `retrievedAt`.
          "market_bars.recorded_at",
        ])
        // No filter on `securities.status`. See the interface.
        .where("securities.symbol", "=", symbol)
        .where("market_bars.timeframe", "=", timeframe)
        .where("market_bars.observed_at", ">=", range.start)
        .where("market_bars.observed_at", "<", range.end)
        .orderBy("market_bars.observed_at")
        .execute();

      const held = await coverageFor(symbol, timeframe);

      return {
        series: toStoredSeries({
          symbol,
          timeframe,
          requested: range,
          rows,
          held,
          now,
        }),
        held,
      };
    },

    readCoverage: coverageFor,

    async readLastBarDates(timeframe) {
      const rows = await db
        .selectFrom("market_bars")
        .innerJoin("securities", "securities.id", "market_bars.security_id")
        .select(({ fn }) => [
          "securities.symbol",
          fn.max("market_bars.observed_at").as("last_observed_at"),
        ])
        .where("market_bars.timeframe", "=", timeframe)
        .groupBy("securities.symbol")
        .execute();

      return new Map(
        rows.map(
          (row) => [toTicker(row.symbol), row.last_observed_at] as const,
        ),
      );
    },

    async readLastCloses(timeframe) {
      // **A lateral scan per security, not a window function over the
      // timeframe.** See the interface for the two timings; the shape here is
      // what produces the fast one. `limit 2` inside the lateral is what makes
      // the planner take a bounded backwards walk of
      // `(security_id, timeframe, observed_at)` — 518 index searches returning
      // two rows each — instead of reading every daily bar to rank it.
      //
      // `crossJoin` and not `leftJoin`: a security with no bars at this
      // timeframe contributes no rows and is therefore absent from the map,
      // which is the contract. A left join would give it one row of nulls, and
      // a null close is a value somebody would eventually render.
      const rows = await db
        .selectFrom("securities")
        .crossJoinLateral((eb) =>
          eb
            .selectFrom("market_bars")
            .select(["market_bars.observed_at", "market_bars.close"])
            .whereRef("market_bars.security_id", "=", "securities.id")
            .where("market_bars.timeframe", "=", timeframe)
            .orderBy("market_bars.observed_at", "desc")
            .limit(2)
            .as("recent"),
        )
        .select(["securities.symbol", "recent.observed_at", "recent.close"])
        // No filter on `securities.status`. See the interface.
        .orderBy("securities.symbol")
        // Newest first *within* a symbol, so the pair below is (last,
        // previous) by position rather than by comparing two instants. The
        // ordering is asserted rather than assumed: reversing it is what the
        // database suite's "compares against the session before" test fails on.
        .orderBy("recent.observed_at", "desc")
        .execute();

      const closes = new Map<Ticker, LastClose>();

      for (const row of rows) {
        const symbol = toTicker(row.symbol);
        const close = toPrice(row.observed_at, row.close);
        const held = closes.get(symbol);

        if (held === undefined) {
          closes.set(symbol, {
            symbol,
            observedAt: row.observed_at,
            close,
            previousClose: null,
          });
          continue;
        }

        // The second row of the pair. `limit 2` means there is never a third,
        // so this is an assignment rather than an accumulation.
        closes.set(symbol, { ...held, previousClose: close });
      }

      return closes;
    },

    async listCoverage() {
      const rows = await db
        .selectFrom("bar_coverage")
        .innerJoin("securities", "securities.id", "bar_coverage.security_id")
        .select([
          "securities.symbol",
          "bar_coverage.timeframe",
          "bar_coverage.covered_start",
          "bar_coverage.covered_end",
          "bar_coverage.provider",
          "bar_coverage.feed",
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
  source: SeriesSource,
): Promise<BarCoverage> {
  await trx
    .insertInto("bar_coverage")
    .values({
      security_id: securityId,
      timeframe,
      covered_start: arriving.start,
      covered_end: arriving.end,
      // Supplied rather than defaulted. Both columns carry a database default
      // so the *previous* backfill survives the window between the deploy's
      // migrate step and its code roll (`0007_bar_coverage_provenance.sql`);
      // `schema.ts` types them as required on insert so no shipped writer can
      // reach it.
      provider: source.provider,
      feed: source.feed,
      bar_count: inserted,
    })
    .onConflict((oc) =>
      oc
        .columns(["security_id", "timeframe"])
        .doUpdateSet(() => ({
          covered_start: sql<Date>`least(bar_coverage.covered_start, excluded.covered_start)`,
          covered_end: sql<Date>`greatest(bar_coverage.covered_end, excluded.covered_end)`,
          bar_count: sql<string>`bar_coverage.bar_count + excluded.bar_count`,
          // `provider` and `feed` are deliberately absent. The source of a
          // window does not change; a series claiming a different one is
          // refused above rather than relabelled here, and `schema.ts` makes
          // updating either a compile error.
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
      "bar_coverage.provider",
      "bar_coverage.feed",
      "bar_coverage.bar_count",
      "bar_coverage.updated_at",
    ])
    .where("bar_coverage.security_id", "=", securityId)
    .where("bar_coverage.timeframe", "=", timeframe)
    .executeTakeFirst();

  return row === undefined ? undefined : toCoverage(row);
}
