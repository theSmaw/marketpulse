// The read path the market-data API serves: what the store holds, joined to the
// uncovered tail, labelled with where each half came from (Task 2.9.5).
//
// **This is the first place this application makes a vendor network call while
// serving a user request.** Every previous one is a CLI command (`pnpm bars`)
// or the nightly backfill, both of which are things a person starts and waits
// for. A page load is not, and almost everything in this file is a consequence
// of that single change of property rather than of the arithmetic, which is
// four lines:
//
//   * the tail is the *uncovered* part of the window and never the whole of it
//     (`MARKET-DATA-API.md` §5, rule 1);
//   * it is bounded to the current session, so what it costs is a function of
//     what was asked for rather than of how stale the store happens to be
//     (rule 3);
//   * a tail that fails leaves the stored part served (rule 4, §36);
//   * and the two halves are joined through `mergeSeriesProvenance`, so the
//     response says which feed each of them came from (rule 5).
//
// ## Why this is a module and not four lines inside the route
//
// Task 2.9.6 registers `GET /market-data/bars` and owns every way a *request*
// can fail. What is here is every way a *fetch* can fail without failing the
// request, which is a different subject with a different test surface: it needs
// a stub provider, a frozen clock and a repository, and none of it needs an
// HTTP server. Splitting them is what lets the interesting half be exercised
// with no socket at all — `pnpm verify` runs with no server, no database, no
// network and no credentials, and this file's whole test suite runs inside it.
//
// ## What is deliberately NOT here: the clamp, and it was checked rather than
// assumed
//
// Task 2.9.5's brief said to clamp the tail to `alpacaServableEnd` — this
// plan's recency cliff refuses the *whole* request when `end` is newer than
// ~16 minutes, so an unclamped mid-session fetch was expected to return
// nothing. **Read against the tree on 2026-09-09, the premise is false and had
// already been false since Task 2.7.5.** `alpaca-provider.ts` applies
// `alpacaServableEnd` itself, before the first request is built, and reports
// the clamp as `coverage.covered`; a window lying *entirely* inside the
// withheld window costs no request at all. Neither `pnpm backfill` nor
// `pnpm bars` clamps — both get it transitively through the seam, which is
// where the brief's "what the backfill uses" actually points.
//
// So the clamp already exists exactly once, in the one implementation that has
// a cliff, and reusing it means **not** writing a second call to it here. Two
// things would be lost by importing it:
//
//   * `ALPACA_SIP_WITHHOLDING_MS` is a fact about one vendor's free plan, and
//     this module is read through the `MarketDataProvider` seam. Importing a
//     vendor constant into a provider-agnostic read path is invariant 7 going
//     in the wrong direction for no gain, since the request it would save is
//     one the provider already declines to make.
//   * §5's own reversal trigger says the clamp stops being necessary when
//     Epic 3's stream arrives. A clamp living in the provider disappears with
//     the provider; a clamp living here is something Epic 3 has to find.
//
// What this module owes instead is that the clamp be *visible in the answer*:
// the merged `coverage.covered` ends where the tail's covered ends, which on a
// mid-session request is `now − 16 min` rather than `now`. That is asserted
// either side of the boundary, against a stub that reports a short window the
// way the real client does.

import {
  marketDateAt,
  marketSessionStateAt,
  mergeSeriesProvenance,
  previousMarketSession,
  toBarSeries,
  toTimeRange,
  type Bar,
  type BarSeries,
  type MarketSession,
  type SeriesCoverage,
  type Ticker,
  type Timeframe,
  type TimeRange,
} from "@marketpulse/shared";

import { windowFor } from "./bar-window.js";
import {
  sessionsInGap,
  STORED_BAR_ADJUSTMENT,
  type BarCoverage,
  type MarketBarsRepository,
  type StoredSeries,
} from "./market-bars.js";
import type { BarsResult, MarketDataProvider } from "./market-data-provider.js";

/**
 * What this module needs to report a tail it could not fetch.
 *
 * A structural subset of `FastifyBaseLogger` rather than the type itself, for
 * `DatabaseLogger`'s stated reason: this module depends on the shape it uses
 * and not on the web framework. The route passes `request.log`, which is
 * Fastify's per-request child logger and therefore already carries the
 * correlation id — so *"the failure is logged under the request's `reqId`"* is
 * a property of the caller's logger rather than a field this file has to
 * remember to set.
 */
export interface SeriesLogger {
  warn: (object: object, message: string) => void;
  debug: (object: object, message: string) => void;
}

/** Everything {@link serveSeries} reads the world through. */
export interface SeriesDependencies {
  /** The store. */
  readonly bars: MarketBarsRepository;

  /**
   * The vendor, or **nothing at all**.
   *
   * `market-data.ts` returns `MarketDataProvider | undefined` on purpose:
   * `none` is absence rather than a null object. Absence here is not a failure
   * and is not a 503 — the store still answers, and a deployment configured to
   * read no provider is exactly a deployment that serves stored history and no
   * tail. The 503 that module hands to this story is for a route with *nothing*
   * to serve, which is not this path.
   */
  readonly provider: MarketDataProvider | undefined;

  /** Where a tail that failed is reported. */
  readonly log: SeriesLogger;
}

/**
 * Why no vendor request was made — **an enumeration, because "we did not ask"
 * is the assertion this task exists to make.**
 *
 * Rule 3 is invisible in a test that only checks the bars came back right: a
 * stitch that fetched two sessions instead of one returns the same bars, the
 * same order and a wider covered range, and costs a metered multi-day request
 * on every page load. So the decision is a *value* rather than a shape of
 * control flow, and the tests assert the value.
 *
 *  - **`covered`** — the store already reaches the end of the window. The
 *    common case, and every request for a closed session.
 *  - **`stale-store`** — a whole trading session lies between what the store
 *    holds and the current one. That is a gap the backfill owns; see
 *    {@link serveSeries} for why it is *also* a gap this contract cannot
 *    describe.
 *  - **`no-provider`** — none is configured.
 */
export const TAIL_DECLINE_REASONS = [
  "covered",
  "stale-store",
  "no-provider",
] as const;

/** One of {@link TAIL_DECLINE_REASONS}. */
export type TailDeclineReason = (typeof TAIL_DECLINE_REASONS)[number];

/**
 * What became of the tail — asked for and answered, asked for and refused, or
 * never asked for.
 *
 * Returned rather than logged and forgotten, because two different callers need
 * it and neither is a person reading a log line: Task 2.9.6 has to be able to
 * say *"live feed disconnected — displaying data through 15:42"* rather than
 * inventing that sentence from an empty tail, and this module's own tests have
 * to assert **no provider call** rather than assert its absence indirectly.
 */
export type TailOutcome =
  /** No request was made, and this is which of rule 3's cases it was. */
  | { readonly attempted: false; readonly reason: TailDeclineReason }
  /** A request was made over `range`, and this is what came back. */
  | {
      readonly attempted: true;
      readonly range: TimeRange;
      readonly result: BarsResult;
    };

/**
 * A served series: the answer, the ledger's own statement, and what the tail
 * did.
 *
 * `series` and `held` are {@link StoredSeries}' two fields unchanged, so the
 * route's three-way *"unknown symbol / we hold nothing / nothing traded"*
 * reading (`MARKET-DATA-API.md` §6) is the same reading it would make of an
 * unstitched read. **`held` remains the LEDGER's statement and is not widened
 * by the tail** — the store's row is a fact about the store, and a tail that
 * was served and deliberately not stored has not changed it.
 */
export interface ServedSeries extends StoredSeries {
  readonly tail: TailOutcome;
}

/**
 * Serve a window, fetching only the part of it the store does not cover.
 *
 * ## The rule that decides everything: only the current session's tail
 *
 * `MARKET-DATA-API.md` §5 rule 3, and there are two independent arguments for
 * it that happen to give the same answer — which is why it is stated as one
 * rule rather than as a budget somebody could tune.
 *
 * **The cost argument.** Measured on 2026-09-09, the local store's
 * `covered_end` is `2026-09-04T20:00:00Z` for all 518 securities — two sessions
 * behind. Without a bound, one page load asking for "the last 5 sessions" turns
 * into a multi-day metered vendor fetch, and the amount it costs is a function
 * of how stale the store is rather than of what the user asked for. That is a
 * cost that grows while nobody is looking, on the read path, once per chart.
 *
 * **The truthfulness argument, which is the one that makes it structural.**
 * `SeriesCoverage.covered` is *one* half-open range. A stored half ending at
 * Friday's close and a tail starting at Wednesday's open cannot be described by
 * one range without claiming Tuesday — which is a false statement about data we
 * do not have, of exactly the kind `BarCoverage.covered` is documented to
 * avoid. So the contract cannot express a discontiguous stitch, and the bound
 * that keeps the cost down is the same bound that keeps the claim honest.
 *
 * The test is therefore about **sessions rather than hours**: {@link
 * sessionsInGap} reads the trading calendar, so the overnight, a weekend and a
 * holiday are all *no* gap — a store caught up to yesterday's close stitches
 * onto today, which is the steady state the nightly backfill produces — and a
 * single skipped session is a gap. No threshold, and therefore no number here
 * to be wrong across a half day.
 *
 * ## The symbol we hold nothing for
 *
 * `held` is `undefined` exactly when the ledger has no row for the pair, and it
 * is a **different request** from one whose store is two days behind rather
 * than a degenerate case of it: there is no `covered_end` to start from, and
 * "fetch from `undefined`" is the shape that quietly becomes "fetch the whole
 * window" — the option nobody chose.
 *
 * So it is answered explicitly and the answer is: **fetch the current session's
 * tail and nothing else.** The same bound, from the same session start, with no
 * gap test because there is nothing to be contiguous with. A security added to
 * the universe before its first backfill therefore charts today rather than
 * charting nothing, at a cost identical to every other request, and
 * `coverage.covered` says how little it reaches. The rejected alternative was
 * to serve nothing at all, which is cheaper by one request and answers a
 * legitimate question with silence.
 *
 * ## A tail that fails does not fail the request
 *
 * §36, and this is its first real instance in this epic. Every non-`ok`
 * outcome — including the two that are *answers* rather than failures — leaves
 * the stored part served, with `coverage.covered` ending where the store ends.
 * The provider's eight-member taxonomy is logged and does not reach the client;
 * Task 2.9.6 turns {@link ServedSeries.tail} into a 200 with an honest coverage
 * window, never a 5xx.
 *
 * ## The tail is SERVED and not STORED
 *
 * The instinct at the end of a metered fetch is to keep it. `recordSeries` will
 * refuse it — `0007_bar_coverage_provenance.sql` holds one source per
 * `(security, timeframe)` window, so a stitched series naming two sources
 * throws `ForeignSourceError`, which is `0004_market_bars.sql`'s trigger for a
 * per-bar `feed` column firing at the moment a second feed tries to enter the
 * store. That refusal is correct rather than an obstacle: storing the tail is
 * Epic 3's decision, and the metered request is bounded in front of the store
 * by Task 2.9.8's cache rather than inside it.
 *
 * `now` is injected rather than read from the clock, as `readSeries`' is: the
 * session bound is a function of it, and a bound that can only be exercised by
 * waiting for the market to open is a bound nobody exercises.
 */
export async function serveSeries(
  deps: SeriesDependencies,
  symbol: Ticker,
  timeframe: Timeframe,
  range: TimeRange,
  now: Date,
): Promise<ServedSeries> {
  const stored = await deps.bars.readSeries(symbol, timeframe, range, now);

  const tail = await fetchTail(deps, stored, symbol, timeframe, range, now);
  if (!tail.attempted || tail.result.outcome !== "ok") {
    return { ...stored, tail };
  }

  return {
    ...stitch(stored.series, tail.result.series),
    held: stored.held,
    tail,
  };
}

/**
 * The window to ask the provider for, or the reason we are not asking.
 *
 * Separated from the fetch so the decision can be read — and tested — without a
 * provider at all. Every bound in §5's rules 1 and 3 is in this function.
 */
export function tailWindow(
  stored: BarCoverage | undefined,
  timeframe: Timeframe,
  range: TimeRange,
  now: Date,
): TimeRange | TailDeclineReason {
  // Rule 3's bound. The *start* of the window covering the session `now` falls
  // in — `windowFor` rather than `session.open`, because a daily bar is stamped
  // at midnight ET and a daily tail framed on the session's open contains no
  // daily bar at all. One definition of "the window for this session", shared
  // with `pnpm bars` and the backfill.
  const session = currentSession(now);
  const bound = windowFor(timeframe, session, session).start;

  // Rule 1: the tail starts where the store stops, never before it, and never
  // before what the caller asked for either — a request whose window begins
  // after `covered_end` must not be widened backwards into data the caller did
  // not ask for.
  const start = latest(range.start, bound, stored?.covered.end);

  if (start.getTime() >= range.end.getTime()) return "covered";

  // Rule 3, and the coverage claim. A whole session between what the store
  // holds and where the tail would begin is the backfill's gap: fetching across
  // it would either cost a multi-day metered request or produce two ranges this
  // contract can only describe as one. `held === undefined` has nothing to be
  // discontiguous with, so it skips this — see {@link serveSeries}.
  if (
    stored !== undefined &&
    sessionsInGap(stored.covered.end, start).length > 0
  ) {
    return "stale-store";
  }

  return toTimeRange(start, range.end);
}

/**
 * The session `now` belongs to, or the most recent one when it belongs to none.
 *
 * `marketSessionStateAt` distinguishes five states and three of them carry a
 * session. The two that do not — a weekend and a holiday — are answered with
 * the session before them, because the question this is asked for is *"which
 * session may we still be accumulating?"* and on a Saturday that is Friday's.
 *
 * `before_open` deliberately answers with **today's** session rather than
 * yesterday's, even though it has not started. It is the conservative answer:
 * the tail is then empty at 08:00 and no request is made, where yesterday's
 * session would make one across an overnight that cannot contain a bar.
 */
function currentSession(now: Date): MarketSession {
  const state = marketSessionStateAt(now);
  return "session" in state
    ? state.session
    : previousMarketSession(marketDateAt(now));
}

/** The latest of some instants; `undefined` entries do not participate. */
function latest(...instants: readonly (Date | undefined)[]): Date {
  let winner: Date | undefined;
  for (const instant of instants) {
    if (instant === undefined) continue;
    if (winner === undefined || instant.getTime() > winner.getTime()) {
      winner = instant;
    }
  }
  // Unreachable: every caller passes `range.start`, which is never absent.
  if (winner === undefined) throw new RangeError("No instant to compare.");
  return winner;
}

/** Ask the provider for the tail, or record why we did not. */
async function fetchTail(
  deps: SeriesDependencies,
  stored: StoredSeries,
  symbol: Ticker,
  timeframe: Timeframe,
  range: TimeRange,
  now: Date,
): Promise<TailOutcome> {
  if (deps.provider === undefined) {
    return { attempted: false, reason: "no-provider" };
  }

  const window = tailWindow(stored.held, timeframe, range, now);
  if (typeof window === "string") return { attempted: false, reason: window };

  const result = await deps.provider.fetchBars({
    symbol,
    range: window,
    timeframe,
    // Rule 5, and it is passed explicitly because there is deliberately no
    // default adjustment anywhere in `packages/shared` (Story 2.6's criterion
    // 5). `mergeSeriesProvenance` refuses a raw/split-adjusted join outright —
    // the two are different price scales, and every percentage change across
    // the seam would be wrong — so the tail is asked for at whatever the store
    // holds, from the store's own constant rather than from a literal here.
    adjustment: STORED_BAR_ADJUSTMENT,
  });

  if (result.outcome !== "ok") {
    report(deps.log, symbol, timeframe, window, result);
  }

  return { attempted: true, range: window, result };
}

/**
 * Which outcomes are worth a `warn`, and which are simply answers.
 *
 * `PROVIDER.md` §8.5's line, applied to a log level rather than to a union:
 * `unknown-symbol` and `range-not-available` are facts about the world that
 * this deployment cannot act on — a symbol this vendor does not carry, a window
 * it will never serve — and warning about them once per page load would train a
 * reader that the level means nothing. The other five are a dependency
 * misbehaving and are exactly what a person looking at a chart missing its last
 * hour needs to find.
 *
 * The message is written for whoever is reading logs; **none of it reaches the
 * client**, which is `errors.ts`' rule and §36's shape — the client is told how
 * far the answer reaches, not why it stops there.
 */
function report(
  log: SeriesLogger,
  symbol: Ticker,
  timeframe: Timeframe,
  window: TimeRange,
  result: BarsResult,
): void {
  const detail = {
    symbol,
    timeframe,
    outcome: result.outcome,
    tailStart: window.start.toISOString(),
    tailEnd: window.end.toISOString(),
  };
  const message =
    "Live tail unavailable; serving the stored part of the window.";

  if (
    result.outcome === "unknown-symbol" ||
    result.outcome === "range-not-available"
  ) {
    log.debug(detail, message);
    return;
  }

  log.warn(detail, message);
}

/**
 * Join a stored half to a fetched tail, or refuse.
 *
 * ## A source describes bars, so a half with no bars contributes none
 *
 * `SeriesProvenance.sources` is a non-empty tuple, which means an *empty*
 * series still carries one source — with `barCount: 0`, and with a
 * `provider`/`feed` that, when the ledger has no row, come from a module
 * constant rather than from anything that knows. Merging such a source into a
 * real stitch produces a two-source record whose first entry describes nothing,
 * and Story 2.14 would render it in the feed strip beside the source that does.
 *
 * The rule that falls out is symmetric and is applied in both directions: **a
 * half that contributed no bars contributes no source.** An empty stored half
 * is dropped, and so is an empty tail — a tail refused for its whole window by
 * the recency cliff comes back `ok` with zero bars, and putting it on the wire
 * as a second feed would be the same fiction wearing the other hat.
 *
 * When neither half has bars the answer is the stored series unchanged, because
 * the domain type requires exactly one source and the store's is the one with a
 * ledger row behind it.
 *
 * ## The counts are what make getting this wrong loud
 *
 * `toBarSeries` asserts the sources' `barCount`s sum to the bars it holds, so a
 * stitch that concatenated two arrays and kept one provenance record throws
 * rather than serving a series claiming all its bars came from one feed. That
 * check is the reason this function builds through the constructor rather than
 * spreading the stored series and swapping two fields.
 */
function stitch(stored: BarSeries, tail: BarSeries): { series: BarSeries } {
  if (tail.bars.length === 0) return { series: stored };

  const bars: readonly Bar[] = [...stored.bars, ...tail.bars];

  const provenance =
    stored.bars.length === 0
      ? tail.provenance
      : mergeSeriesProvenance(stored.provenance, tail.provenance);

  return {
    series: toBarSeries({
      symbol: stored.symbol,
      timeframe: stored.timeframe,
      bars,
      provenance,
      // The window the caller asked for is unchanged by any of this: it is what
      // was asked, not what was answered.
      coverage: {
        requested: stored.coverage.requested,
        covered: span(stored.coverage, tail.coverage),
      },
    }),
  };
}

/**
 * The window the joined answer reaches.
 *
 * The union of two contiguous ranges, which they are by construction —
 * {@link tailWindow} starts the tail at or after `covered_end` and refuses
 * outright when a session lies between the two. A `null` half contributes
 * nothing, because an empty series covers nothing at all; both `null` cannot
 * happen here, since the tail is known to have bars.
 */
function span(stored: SeriesCoverage, tail: SeriesCoverage): TimeRange {
  const first = stored.covered;
  const second = tail.covered;

  if (second === null) {
    // Unreachable: `stitch` returns early for a tail with no bars, and
    // `toBarSeries` makes `covered` null exactly when a series is empty.
    throw new RangeError(
      "A tail holding bars must say what window it covers; this one covers " +
        "nothing, which means it holds no bars and should not have been " +
        "joined.",
    );
  }

  if (first === null) return second;

  return toTimeRange(
    first.start.getTime() <= second.start.getTime()
      ? first.start
      : second.start,
    first.end.getTime() >= second.end.getTime() ? first.end : second.end,
  );
}
