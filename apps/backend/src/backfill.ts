// `pnpm backfill` — the command that fills the store (Task 2.8.6).
//
// **This is the first thing in this repository that runs for tens of minutes,
// spends a metered budget, and can be interrupted halfway.** Everything below
// follows from those three facts rather than from a preference.
//
// The shape is `migrate.ts`, `load-universe.ts` and `fetch-bars.ts`': the
// mechanism is TypeScript under `src/`, so it is typechecked, linted under the
// full type-aware pass, formatted and testable, and `scripts/run-backfill.mjs`
// is a thin wrapper carrying the name, the built-output guard and **the exit
// code**. Nothing here calls `process.exit`, for `config.ts`'s reason: a
// function that exits cannot be tested.
//
// ## The three properties, each of which is a decision
//
// **1. Session-shaped windows.** Task 2.7.5 measured a span-shaped minute
// request at **2.35× the regular-hours bar count**, 57.5% of it pre- and
// post-market prints across the nights the span covers. A backfill that stored
// those would store 14.2 GB a year against ~6.1, and would put bars in the
// table that `market-session.ts` says should not exist — which is exactly the
// distinction acceptance criterion 4 is about. So a **minute** request is
// **one session**, `[open, close)`, measured at exactly 1.00×. See
// {@link SESSIONS_PER_REQUEST} for why a daily request is not.
//
// **2. Pacing, and it lives here rather than in the provider.** `PROVIDER.md`
// §8.8 puts retry in a wrapper and pacing in the caller, and Task 2.7.7
// measured why in the sharpest available form: driven 320-concurrent, the bare
// provider answered 91 calls in 320 HTTP requests, and the retry wrapper at a
// 20-second deadline answered 263 in **1,473** — sustaining 73 req/s against a
// measured **3.23/s** token refill and still leaving 57 refused. **Retry helps
// one caller and does not help a crowd. What fixes it is asking less often.**
//
// **3. Resumability, from the ledger and never from a bookmark of its own.**
// A backfill that cannot be resumed is one that gets run from scratch
// repeatedly, and a backfill that keeps its own progress file has two claims
// about what is stored that can disagree. `bar_coverage` is the one claim, it
// is written in the same transaction as the bars, and this command reads it.
//
// ## Sequential, and the ledger is what settles it
//
// The obvious optimisation is ~8 requests in flight, which would take a
// full-universe year from ~3.6 hours of wall clock down to the ~26-minute
// rate-limit floor. **It is refused, and not on caution.** The batch loop is
// `for each session { fetch all symbols }`, so eight in flight is eight
// *sessions* in flight, and they do not complete in order. Session `N` commits,
// then `N−3` commits before `N−1` — and `N−3`'s write is disjoint from the
// stored range with two trading sessions in the gap, so `market-bars.ts`
// **refuses it by name** with a `CoverageGapError`. Task 2.8.4 built that check
// deliberately; a concurrent design here would need a completion buffer to put
// the commits back in order, which is the pacer's complexity twice over, in
// front of a design the ledger was built to refuse.
//
// Concurrency across *symbols* buys nothing, because the batch already collapses
// all 518 into one request.
//
// ## What it stores, and the one argument that is not this task's
//
// **`raw`, always, and adjustment is deliberately not an argument.** Story
// 2.8's open decision 1 settled that this store is the system's record of what
// was observed rather than a cache, and `PROVIDER.md` §3 carries the
// consequence: a stored *adjusted* series is retroactively wrong the moment a
// split happens, so storing one makes the store a cache by the back door. An
// adjusted series is *requested from a provider* on read.

import process from "node:process";

import {
  lastMarketSessions,
  marketDateAt,
  marketSessionsBetween,
  toMarketDate,
  toTicker,
  type MarketDate,
  type MarketSession,
  type Ticker,
  type Timeframe,
  TIMEFRAMES,
} from "@marketpulse/shared";

import { createAlpacaProvider } from "./alpaca-provider.js";
import {
  attemptOutcomeFor,
  createBarAttemptsRepository,
  type BarAttemptRecord,
  type BarAttemptsRepository,
} from "./bar-attempts.js";
import { windowFor } from "./bar-window.js";
import { ConfigError, loadConfig, loadEnvFile } from "./config.js";
import { closeDatabasePool, createDatabasePool } from "./database.js";
import type { DatabaseLogger } from "./database.js";
import {
  CoverageGapError,
  createMarketBarsRepository,
  type BarCoverage,
  type MarketBarsRepository,
} from "./market-bars.js";
import type { MarketDataProvider } from "./market-data-provider.js";
import { isWholeBatchFailure } from "./market-data-provider.js";
import { createSecuritiesRepository } from "./securities.js";
import { withRetry } from "./retry-provider.js";

/**
 * How many sessions go into one request, per timeframe — **and the two numbers
 * are answers to two different questions.**
 *
 * **`1m` is 1, and it is the whole of property 1 above.** More than one session
 * in a minute-bar window spans the nights between them, which SIP fills with
 * extended-hours prints at 2.35×. This is the number most likely to be
 * "optimised" by somebody reasoning about request counts, and Task 2.7.5's
 * table is the answer: 25 sessions in one request is 22,952 bars where the
 * calendar says 9,750.
 *
 * **`1d` is 20, and the inflation argument simply does not apply to it.** A
 * daily bar is one bar per session whatever the window's shape, so there are no
 * overnight prints to collect — the only ceiling is the page budget. 20 sessions
 * × 518 symbols is 10,360 rows against a measured 10,000-row page, so a daily
 * chunk is about two pages and roughly a calendar month. Session-by-session
 * would be 251 requests for a year of data that fits in 13.
 */
export const SESSIONS_PER_REQUEST: Readonly<Record<Timeframe, number>> = {
  "1m": 1,
  "1d": 20,
};

/**
 * This command's request deadline, and it is passed explicitly because
 * `DEFAULT_BARS_DEADLINE_MS` is wrong here by two orders of magnitude.
 *
 * That default is **3,000 ms**, derived against a *single* request inside a
 * browser's 5-second budget. Task 2.8.5 measured what this command actually
 * asks for: 518 symbols × 390 bars is 202,020 rows for one session, which at a
 * 10,000-row page is **21 pages** at 2.52–2.65 s each — **~55 s**.
 *
 * So the arithmetic is: one walk ~55 s, and `retry-provider.ts` needs room for a
 * retried walk plus backoff before it will attempt one at all — its recorded
 * unchecked precondition is that a caller with a tight deadline **silently gets
 * no retries**, and then receives the real cause rather than an error saying "I
 * did not try". Two walks plus backoff is ~115 s. **180 s** leaves headroom for
 * a slower link than the one this was measured on, and is short enough that a
 * hung request is caught in three minutes rather than never.
 */
export const BACKFILL_REQUEST_DEADLINE_MS = 180_000;

/**
 * The shortest gap between the *starts* of two consecutive requests.
 *
 * Task 2.7.7 measured the limiter as a **token bucket refilling at ~3.23
 * requests a second** rather than a punished sixty-second window, so one token
 * is **~310 ms** and a backoff has to outlast a token rather than a minute. 350
 * ms is one token plus margin: it holds the sustained rate just under the
 * refill, which is the condition under which a burst never accumulates and
 * therefore never has to be recovered from.
 *
 * **It is a floor and not a delay**, measured from the *start* of the previous
 * request, so it costs nothing at all on the case it is not needed for: a
 * full-universe page walk already takes ~55 s and the floor has long since
 * elapsed. Where it earns its place is a small `--symbols` run, where a request
 * is ~200 ms and an unpaced loop would run at 5/s against a 3.23/s refill.
 *
 * The budget is **per API** (Task 2.7.7): a second `data` endpoint competes for
 * the same tokens, and the *trading* API is separate — which is why
 * `pnpm universe:check` costs this command nothing.
 *
 * ## What it does NOT pace, stated rather than discovered
 *
 * This floor sits between **provider calls**, and one call is a whole page
 * walk: `fetchManyBars` pages internally with no pacing between pages. So the
 * pages inside a walk are unpaced, which Task 2.8.5's amendment warns about —
 * *"a retry re-runs from page 1, so the pacer must count requests rather than
 * walks"*. Measured 2026-09-08 rather than assumed: a 518-symbol session is
 * ~21 pages in 15.8 s, which is **~1.3 pages a second against a 3.23/s
 * refill**, so it does not breach the limiter and the floor between walks is
 * what actually binds. **The reversal trigger is a `rate-limited` outcome on a
 * run this pacer was supposed to keep under the limit**, at which point the
 * pace belongs inside the walk — which means inside the provider, and
 * `PROVIDER.md` §8.8 would have to be revisited rather than worked around here.
 */
export const BACKFILL_PACE_MS = 350;

/**
 * The earliest date this command will ask for, and it is the trading calendar's
 * bound stated in this command's own vocabulary.
 *
 * `market-calendar.ts` covers 2024–2028 and **refuses** outside it rather than
 * truncating (ADR 0017 decision 9), because a short list of sessions is a wrong
 * answer wearing the shape of a right one. `BARS.md` §2 therefore capped the
 * daily depth here rather than at the ~2016 the plan originally assumed.
 *
 * The refusal is propagated rather than clamped: a backfill asked for more
 * history than the calendar covers says so and stops.
 */
export const EARLIEST_BACKFILL_DATE = "2024-01-01";

/** How many sessions a run covers when nobody says. */
const DEFAULT_SESSIONS = 5;

/** A symbol that cannot be extended any further in this run, and why. */
export interface BlockedSymbol {
  readonly symbol: Ticker;
  readonly reason: string;
}

/** Why a run stopped. */
export type BackfillStop = "completed" | "interrupted" | "failed";

/** What a run did. Every counter here is a finding rather than ceremony. */
export interface BackfillReport {
  /**
   * Calls to the provider — **not HTTP requests**, and the distinction matters
   * for anyone reading this against a rate limit.
   *
   * One call is one *page walk*: `fetchManyBars` pages internally until the
   * vendor's `next_page_token` is null, so a whole-universe minute session is
   * one call and about twenty-one HTTP requests. Measured 2026-09-08 at
   * **188,726 bars in 15.8 s** for 518 securities over one session — ~1.3
   * pages a second against a 3.23/s token refill, so the unpaced pages inside a
   * walk do not breach the limiter today. See {@link BACKFILL_PACE_MS}.
   */
  readonly requests: number;
  readonly sessionsFetched: number;
  readonly sessionsAlreadyHeld: number;
  readonly inserted: number;
  readonly corrected: number;
  readonly unchanged: number;
  /** Symbols that answered `ok` with no bars at all, summed over requests. */
  readonly emptyAnswers: number;
  readonly blocked: readonly BlockedSymbol[];
  readonly stoppedBy: BackfillStop;
  /** The `BarsResult` outcome that ended the run, when one did. */
  readonly failedWith?: string;
}

/**
 * Everything {@link runBackfill} needs, taken as parameters.
 *
 * **A parameter object rather than module state, and the clock and the sleep
 * are in it for a specific reason**: the pacer is the one thing here that is
 * defined in terms of elapsed time, and a pacer tested by waiting is a test
 * suite that takes as long as the thing it is testing. Both are injected so the
 * fast suite drives them against a fake clock.
 */
export interface BackfillDependencies {
  readonly provider: MarketDataProvider;
  readonly bars: MarketBarsRepository;
  /** Which securities. Already filtered — see {@link activeSymbols}. */
  readonly symbols: readonly Ticker[];
  readonly timeframe: Timeframe;
  /** The sessions to end up holding, oldest first. */
  readonly sessions: readonly MarketSession[];
  /** What the ledger already says, per symbol. */
  readonly coverage: ReadonlyMap<Ticker, BarCoverage>;
  /**
   * Where a session that left no bars is recorded, and where one that did is
   * forgotten.
   *
   * **Required rather than optional, and that is deliberate.** An optional
   * dependency here is one a future call site can leave out, and what it would
   * silently switch off is the only thing that tells a failed fetch from a
   * session nobody asked about — acceptance criterion 4, disabled by omission.
   */
  readonly attempts: BarAttemptsRepository;
  /** One line of progress. Written as it happens, not collected — see below. */
  readonly report: (line: string) => void;
  readonly now?: () => number;
  readonly sleep?: (ms: number) => Promise<void>;
  /**
   * Whether to stop after the request in flight.
   *
   * `SIGINT` sets this rather than aborting the request: a request already sent
   * has already been paid for, and abandoning it wastes it *and* leaves the
   * ledger one session further behind than it needs to be.
   */
  readonly shouldStop?: () => boolean;
  readonly deadlineMs?: number;
  readonly paceMs?: number;
}

/**
 * The window of sessions every symbol in the run already holds, or `undefined`
 * when at least one holds nothing.
 *
 * **The intersection and not the union, and the asymmetry is the point.** This
 * decides which sessions are *skipped*, and skipping is a spend optimisation
 * rather than a correctness mechanism — correctness is the upsert, which makes
 * re-writing a held session a no-op that changes no byte. So the conservative
 * direction is the right one: skip a session only when *every* symbol in the
 * batch already holds it, because a batch fetches one window for all of them
 * and there is no such thing as fetching it for some.
 *
 * The consequence to know: one symbol behind the rest drags the whole batch's
 * skip window back to its own, and the run re-writes sessions the others
 * already had. That is a handful of requests, and the alternative — planning
 * per symbol — is a different request per symbol, which is the ~130,000-request
 * design the batch exists to replace.
 */
export function commonCoverage(
  symbols: readonly Ticker[],
  coverage: ReadonlyMap<Ticker, BarCoverage>,
): { readonly start: Date; readonly end: Date } | undefined {
  let start: Date | undefined;
  let end: Date | undefined;

  for (const symbol of symbols) {
    const held = coverage.get(symbol);
    if (held === undefined) return undefined;
    if (start === undefined || held.covered.start > start) {
      start = held.covered.start;
    }
    if (end === undefined || held.covered.end < end) end = held.covered.end;
  }

  if (start === undefined || end === undefined) return undefined;
  // An empty intersection is no common window at all rather than a reversed
  // one, which is what `toTimeRange` would refuse to build anyway.
  return start < end ? { start, end } : undefined;
}

/**
 * The requests a run will make, in the order it will make them.
 *
 * **Two monotonic walks rather than one, and neither is optional.** The ledger
 * holds one contiguous range per security and timeframe, and `market-bars.ts`
 * refuses a write whose gap from that range contains a trading session — so
 * every request has to extend the stored range from one of its two ends.
 *
 *  - **Forward first**, from the end of what is held to the newest session
 *    asked for, oldest request first. This is the catch-up half: a run a week
 *    after the last one finds a week of newer sessions and fills them before
 *    doing anything else, because the recent end is what every chart opens on.
 *  - **Then backward**, from the start of what is held to the oldest session
 *    asked for, newest request first. This is the deepening half, and its
 *    direction is the reason an interrupted backfill leaves the product *more*
 *    useful rather than less: what it has is the recent history, contiguous.
 *
 * On a first run there is nothing held, so the whole thing is one backward
 * walk from the most recent session asked for.
 *
 * Each request's sessions are ascending, because {@link windowFor} takes the
 * first and the last and builds `[first.open, last.close)`.
 */
export function planRequests(
  sessions: readonly MarketSession[],
  common: { readonly start: Date; readonly end: Date } | undefined,
  perRequest: number,
): readonly (readonly MarketSession[])[] {
  const newer: MarketSession[] = [];
  const older: MarketSession[] = [];

  for (const session of sessions) {
    if (common === undefined) {
      older.push(session);
      continue;
    }
    // A session is held when it lies wholly inside the common window. The two
    // comparisons are against the session's own bounds rather than its date,
    // because the ledger stores instants and a market date is not one.
    if (session.open >= common.start && session.close <= common.end) continue;
    if (session.close > common.end) newer.push(session);
    else older.push(session);
  }

  const runs: (readonly MarketSession[])[] = [];

  for (let index = 0; index < newer.length; index += perRequest) {
    runs.push(newer.slice(index, index + perRequest));
  }

  // Chunked from the newest end, so a partial chunk lands at the *oldest* end
  // of the walk rather than at the frontier — an interrupted run then stops on
  // a chunk boundary that the next run's arithmetic reproduces exactly.
  for (let end = older.length; end > 0; end -= perRequest) {
    runs.push(older.slice(Math.max(0, end - perRequest), end));
  }

  return runs;
}

/**
 * Fill the store, one request at a time.
 *
 * Returns rather than throwing for every modelled outcome, including a run that
 * was interrupted and a run the vendor refused — the caller turns a report into
 * an exit code. It still throws for a programming error, which is the line
 * `market-bars.ts` and `bar-series.ts` already draw.
 */
export async function runBackfill(
  dependencies: BackfillDependencies,
): Promise<BackfillReport> {
  const {
    provider,
    bars,
    attempts,
    timeframe,
    sessions,
    coverage,
    report,
    now = () => Date.now(),
    sleep = defaultSleep,
    shouldStop = () => false,
    deadlineMs = BACKFILL_REQUEST_DEADLINE_MS,
    paceMs = BACKFILL_PACE_MS,
  } = dependencies;

  const perRequest = SESSIONS_PER_REQUEST[timeframe];
  const common = commonCoverage(dependencies.symbols, coverage);
  const runs = planRequests(sessions, common, perRequest);

  const planned = runs.reduce((total, run) => total + run.length, 0);
  const alreadyHeld = sessions.length - planned;

  let requests = 0;
  let fetched = 0;
  let inserted = 0;
  let corrected = 0;
  let unchanged = 0;
  let emptyAnswers = 0;
  const blocked = new Map<Ticker, string>();

  let stoppedBy: BackfillStop = "completed";
  let failedWith: string | undefined;
  let lastRequestStartedAt: number | undefined;
  let spentMs = 0;

  /**
   * The attempt rows this request will write, and the ones it will delete.
   *
   * **Queued and flushed once per request rather than written as they are
   * decided**, because the alternative is up to 518 round trips inside a loop
   * that already spends fifty seconds on the vendor — a log that costs more
   * than the thing it is logging is one somebody removes.
   */
  let pendingWrites: BarAttemptRecord[] = [];
  let pendingClears: { symbol: Ticker; sessions: readonly MarketSession[] }[] =
    [];

  function queueAttempts(
    symbols: readonly Ticker[],
    over: readonly MarketSession[],
    outcome: BarAttemptRecord["outcome"],
    detail?: string,
  ): void {
    for (const symbol of symbols) {
      for (const session of over) {
        pendingWrites.push({
          symbol,
          timeframe,
          sessionDate: session.date,
          outcome,
          ...(detail === undefined ? {} : { detail }),
        });
      }
    }
  }

  function queueClear(symbol: Ticker, over: readonly MarketSession[]): void {
    pendingClears.push({ symbol, sessions: over });
  }

  /**
   * Write what was queued, in as few statements as the shapes allow.
   *
   * The clears are grouped by the *set of sessions* rather than issued per
   * symbol: at `1m` a request is one session, so every symbol that stored bars
   * falls into one group and the whole batch is a single `delete`. At `1d` a
   * symbol can have traded on some of the twenty sessions and not others, so
   * there are as many groups as there are distinct patterns — still a handful,
   * and never one per symbol.
   */
  async function flushAttempts(): Promise<void> {
    const writes = pendingWrites;
    const clears = pendingClears;
    pendingWrites = [];
    pendingClears = [];

    const grouped = new Map<
      string,
      { symbols: Ticker[]; dates: readonly MarketDate[] }
    >();
    for (const entry of clears) {
      const dates = entry.sessions.map((session) => session.date);
      const key = dates.join(",");
      const group = grouped.get(key) ?? { symbols: [], dates };
      group.symbols.push(entry.symbol);
      grouped.set(key, group);
    }

    for (const group of grouped.values()) {
      await attempts.clearAttempts(group.symbols, timeframe, group.dates);
    }
    await attempts.recordAttempts(writes);
  }

  for (const run of runs) {
    if (shouldStop()) {
      stoppedBy = "interrupted";
      break;
    }

    // Every blocked symbol is dropped from the request rather than merely from
    // the write. A symbol whose ledger cannot be extended is a symbol whose
    // bars we would fetch, pay for, and then refuse to store.
    const active = dependencies.symbols.filter(
      (symbol) => !blocked.has(symbol),
    );
    if (active.length === 0) {
      stoppedBy = "failed";
      failedWith = "every symbol is blocked";
      break;
    }

    const first = run[0];
    const last = run.at(-1);
    /* c8 ignore next 3 -- planRequests never emits an empty run. */
    if (first === undefined || last === undefined) continue;

    // The pace floor, measured from the previous request's START. See
    // `BACKFILL_PACE_MS`: this is a rate ceiling rather than a delay, so it
    // costs nothing whenever the previous request took longer than the floor.
    if (lastRequestStartedAt !== undefined) {
      const waited = now() - lastRequestStartedAt;
      if (waited < paceMs) await sleep(paceMs - waited);
    }

    const startedAt = now();
    lastRequestStartedAt = startedAt;
    requests += 1;

    const results = await provider.fetchManyBars(
      {
        symbols: active,
        range: windowFor(timeframe, first, last),
        timeframe,
        // Never an argument. See the module header: an adjusted series stored
        // is a series that is retroactively wrong after the next split.
        adjustment: "raw",
      },
      { deadlineMs },
    );

    // **Success is per symbol; failure is per batch.** Task 2.8.5 shipped that
    // as `isWholeBatchFailure`, and the consequence here is that there is no
    // per-symbol divergence to record on a transport failure: the pages that
    // never arrived held symbols we cannot name, so every symbol in the request
    // carries the same outcome and the honest choices are to retry the request
    // or to stop. It is already retried — `withRetry` wraps the provider — so
    // this stops, because carrying on to the next session would leave a gap the
    // ledger refuses on the very next write anyway, for every symbol at once.
    const batchFailure = [...results.values()].find(isWholeBatchFailure);
    if (batchFailure !== undefined) {
      stoppedBy = "failed";
      failedWith = batchFailure.outcome;
      // **Recorded before the loop breaks, and that is the whole point of the
      // log.** A whole-batch failure is loud right now and completely silent the
      // moment this process exits: the sessions it did not fetch are then
      // indistinguishable in the database from sessions nobody ever asked
      // about. One row per active symbol per session in the run, cleared by the
      // next run that succeeds here.
      queueAttempts(active, run, attemptOutcomeFor(batchFailure));
      await flushAttempts();
      report(
        `  ✗ ${describeRun(run)}  ${batchFailure.outcome} — the whole request, ` +
          `so nothing was stored for any symbol. Re-run to continue from here.`,
      );
      break;
    }

    let runInserted = 0;
    let runBars = 0;
    // **Counted in symbol-SESSIONS rather than in symbols, which is what the
    // summary line calls it and what `bar_attempts` records.** The two agree
    // only because of the multiplication below: `queueAttempts` writes one row
    // per session in the request, so a daily request covering twenty sessions
    // logs twenty rows for one symbol that answered with nothing. Task 2.8.8's
    // first full-depth daily run is what found them disagreeing — 127 against
    // 2,537 — and the table was the half that was right.
    let runEmpty = 0;
    let runEmptySymbols = 0;

    for (const [symbol, result] of results) {
      if (result.outcome !== "ok") {
        // The three per-symbol outcomes that are not `ok` are answers about
        // that security rather than about the request — Task 2.7.6 measured
        // that this vendor produces neither of them from the bars endpoint, so
        // reaching here is a finding worth printing rather than a routine skip.
        blocked.set(symbol, result.outcome);
        queueAttempts([symbol], run, attemptOutcomeFor(result));
        report(
          `  · ${symbol} ${result.outcome} — dropped from the rest of this run.`,
        );
        continue;
      }

      if (result.series.bars.length === 0) {
        // A successful empty answer, which `PROVIDER.md` §8.2 makes an answer
        // rather than a failure. It extends the ledger by nothing, so the next
        // session on the far side of it is disjoint by one and will be refused
        // below — which is where an empty answer stops being free.
        //
        // **This is the one success the log has to record**, and it is the
        // correction Task 2.8.4 made to "failures only": it writes no bars and
        // extends no ledger, so it is recorded in neither table, and at the
        // frontier of a walk it reads as *never asked* when it was asked and was
        // told nothing happened.
        runEmpty += run.length;
        runEmptySymbols += 1;
        queueAttempts([symbol], run, "ok");
        continue;
      }

      try {
        const written = await bars.recordSeries(result.series);
        runInserted += written.inserted;
        inserted += written.inserted;
        corrected += written.corrected;
        unchanged += written.unchanged;
        runBars += result.series.bars.length;

        // **A later success clears the log**, which is not tidiness: without it
        // the log accumulates a permanent record of a transient failure and
        // every report from then on reads worse than the store is.
        //
        // The split is per session rather than per request, because a daily
        // request covers up to twenty of them and a symbol can genuinely have
        // traded on some and not others. A bar's session is
        // `marketDateAt(startsAt)` at both timeframes — a minute bar falls
        // inside `[open, close)` and a daily bar is stamped at midnight ET of
        // its own session date, and both map to the same market date.
        const traded = new Set(
          result.series.bars.map((bar) => marketDateAt(bar.startsAt) as string),
        );
        const held = run.filter((session) => traded.has(session.date));
        const missed = run.filter((session) => !traded.has(session.date));
        if (held.length > 0) queueClear(symbol, held);
        if (missed.length > 0) queueAttempts([symbol], missed, "ok");
      } catch (error) {
        if (error instanceof CoverageGapError) {
          // **Caught rather than ignored, and this is the one thing this
          // command must not swallow.** Task 2.8.4 built the check so that a
          // symbol which silently dropped out of a page — the one failure in
          // this story that survives every other instrument — is caught one
          // session later and named as a gap. Ending the whole run on it would
          // let one thin symbol stop 517 others; ignoring it would reopen the
          // hole. So the symbol stops and the run continues, and the report
          // names it.
          blocked.set(
            symbol,
            `coverage gap: ${error.missingSessions.join(", ")}`,
          );
          // Task 2.8.6 named this the concrete instance of "loud until the
          // command exits": the blocked set lives in memory, the symbol is now
          // permanently behind the rest of the universe with a shorter covered
          // range, and nothing anywhere says why. This is the row that says why.
          queueAttempts(
            [symbol],
            run,
            "coverage-gap",
            `missing ${error.missingSessions.slice(0, 5).join(", ")}` +
              (error.missingSessions.length > 5 ? ", …" : ""),
          );
          report(
            `  · ${symbol} blocked — the ledger will not join this window to ` +
              `what it holds, missing ${error.missingSessions.join(", ")}. ` +
              `Almost always an earlier session this symbol did not trade in.`,
          );
          continue;
        }
        throw error;
      }
    }

    await flushAttempts();

    fetched += run.length;
    emptyAnswers += runEmpty;
    spentMs += now() - startedAt;

    report(
      `  ✓ ${describeRun(run)}  ${String(runBars)} bars, ` +
        `${String(runInserted)} new` +
        (runEmptySymbols > 0
          ? `, ${String(runEmptySymbols)} symbols with nothing`
          : "") +
        `  ${remainingEstimate(requests, runs.length, spentMs)}`,
    );
  }

  return {
    requests,
    sessionsFetched: fetched,
    sessionsAlreadyHeld: alreadyHeld,
    inserted,
    corrected,
    unchanged,
    emptyAnswers,
    blocked: [...blocked].map(([symbol, reason]) => ({ symbol, reason })),
    stoppedBy,
    ...(failedWith === undefined ? {} : { failedWith }),
  };
}

/**
 * How much longer, from the mean request so far.
 *
 * **An estimate is the one thing `pnpm migrate` and `pnpm universe` do not owe
 * and this does.** Those finish in a second; this runs for tens of minutes, and
 * a command with no end in sight is one people kill and restart — which against
 * a metered API is the most expensive possible response to a slow run.
 */
function remainingEstimate(
  done: number,
  total: number,
  spentMs: number,
): string {
  const left = total - done;
  if (left <= 0) return `(${String(done)}/${String(total)}, done)`;
  const eta = Math.round((spentMs / done) * left);
  return `(${String(done)}/${String(total)}, ~${formatDuration(eta)} left)`;
}

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 90) return `${String(seconds)}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 90) return `${String(minutes)}m`;
  return `${(minutes / 60).toFixed(1)}h`;
}

function describeRun(run: readonly MarketSession[]): string {
  const first = run[0];
  const last = run.at(-1);
  if (first === undefined || last === undefined) return "(empty)";
  return first.date === last.date ? first.date : `${first.date}→${last.date}`;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The tracked symbols this command will spend requests on.
 *
 * **`status === "active"`, and it is a decision rather than a filter that
 * happened.** `UNIVERSE.md` §12.2 names the seven readers of this schema's one
 * invisible predicate and which way each goes; this is one of the four that
 * filter, on Story 2.7's argument that a metered API is not spent on a security
 * nobody tracks.
 *
 * **The other side of the same table is the half to get right**: Story 2.9's
 * read path and Epic 13's replay must **not** filter, because bars stored for a
 * security we have since stopped tracking are still what happened, and a replay
 * filtering on today's `status` would silently rewrite history. That asymmetry
 * — write path filters, read path does not — is the whole of the cost of not
 * having a `deleted_at` column, and it is stated here because this is the write
 * path.
 */
export function activeSymbols(
  securities: readonly { symbol: Ticker; status: string }[],
): readonly Ticker[] {
  return securities
    .filter((security) => security.status === "active")
    .map((security) => security.symbol);
}

/** What a run produced, so the wrapper can turn it into a process result. */
export interface BackfillOutcome {
  readonly exitCode: 0 | 1;
  readonly lines: readonly string[];
  readonly errors: readonly string[];
}

/** How {@link backfillCommand} reaches the world. Every one is injected. */
export interface BackfillCommandOptions {
  readonly env?: NodeJS.ProcessEnv;
  /**
   * Where progress goes, **as it happens**.
   *
   * This is the one place this command's shape departs from `pnpm universe`'s,
   * and the reason is the runtime: that command collects its lines and hands
   * them to the wrapper at the end, which is right for something that finishes
   * in half a second and useless for something that runs for tens of minutes.
   * Silence over that long is indistinguishable from a hang, and a hang is what
   * makes somebody kill a metered run halfway.
   */
  readonly report?: (line: string) => void;
  readonly shouldStop?: () => boolean;
}

/**
 * `pnpm backfill` — fetch and store historical bars for the tracked universe.
 *
 * `argv` is a parameter rather than read from `process.argv`, for
 * `fetchBarsCommand`'s reason: it is what makes this testable at all.
 */
export async function backfillCommand(
  argv: readonly string[],
  options: BackfillCommandOptions = {},
): Promise<BackfillOutcome> {
  const report =
    options.report ??
    ((line: string) => {
      console.log(line);
    });

  const parsed = parseArguments(argv);
  if ("help" in parsed) {
    return { exitCode: 0, lines: [USAGE], errors: [] };
  }
  if ("problem" in parsed) {
    return { exitCode: 1, lines: [], errors: [parsed.problem, "", USAGE] };
  }

  // See `fetchBarsCommand`: supplying an environment means *this is the
  // environment*, so a file is not read over the top of it.
  const environment = options.env ?? (loadEnvFile(), process.env);

  let config;
  try {
    config = loadConfig(environment);
  } catch (error) {
    return {
      exitCode: 1,
      lines: [],
      errors: [error instanceof ConfigError ? error.message : String(error)],
    };
  }

  if (config.alpaca === undefined) {
    return {
      exitCode: 1,
      lines: [],
      errors: [
        "No Alpaca credential is configured, so there is nothing to fetch.",
        "Set ALPACA_API_KEY_ID and ALPACA_API_SECRET_KEY in apps/backend/.env.",
      ],
    };
  }

  // Sessions are resolved before a connection is opened and before a request is
  // made, for `load-universe.ts`'s reason: a range the calendar refuses is
  // refused whether or not a database is running, and finding out which one is
  // wrong first is worth a lot to whoever is reading the output.
  const resolved = resolveSessions(parsed);
  if ("problem" in resolved) {
    return { exitCode: 1, lines: [], errors: [resolved.problem] };
  }

  const log: DatabaseLogger = {
    warn: (object, message) => {
      process.stderr.write(`  ${message} ${JSON.stringify(object)}\n`);
    },
    debug: (): void => undefined,
  };

  const pool = createDatabasePool(config.database, log, "marketpulse-backfill");
  const bars = createMarketBarsRepository(pool);
  const attempts = createBarAttemptsRepository(pool);
  const securities = createSecuritiesRepository(pool);
  const provider = withRetry(createAlpacaProvider(config.alpaca));

  try {
    const symbols =
      parsed.symbols ?? activeSymbols(await securities.listSecurities());

    if (symbols.length === 0) {
      return {
        exitCode: 1,
        lines: [],
        errors: [
          "No tracked securities to back-fill. `pnpm universe` loads the list.",
        ],
      };
    }

    const coverage = new Map<Ticker, BarCoverage>();
    for (const held of await bars.listCoverage()) {
      if (held.timeframe === parsed.timeframe) coverage.set(held.symbol, held);
    }

    const firstSession = resolved.sessions[0];
    const lastSession = resolved.sessions.at(-1);
    /* c8 ignore next 3 -- resolveSessions refuses an empty list. */
    if (firstSession === undefined || lastSession === undefined) {
      return { exitCode: 1, lines: [], errors: ["No sessions to fetch."] };
    }

    report(
      `backfill  ${String(symbols.length)} ${symbols.length === 1 ? "security" : "securities"}` +
        `  ${parsed.timeframe}  raw` +
        `  ${firstSession.date} → ${lastSession.date}` +
        `  (${String(resolved.sessions.length)} sessions)`,
    );
    report(`  provider ${provider.id}  feed ${provider.feed}`);
    report("");

    const result = await runBackfill({
      provider,
      bars,
      attempts,
      symbols,
      timeframe: parsed.timeframe,
      sessions: resolved.sessions,
      coverage,
      report,
      ...(options.shouldStop === undefined
        ? {}
        : { shouldStop: options.shouldStop }),
    });

    return summarise(result);
  } catch (error) {
    return {
      exitCode: 1,
      lines: [],
      errors: [
        "",
        "The backfill stopped. Every session it did store is stored — each one is",
        "its own transaction, so nothing is half-written and a re-run continues.",
        "",
        `  ${error instanceof Error ? error.message : String(error)}`,
        "",
        "If the database is not running, `pnpm db` starts it. If `market_bars` does",
        "not exist, `pnpm migrate` creates it.",
      ],
    };
  } finally {
    await closeDatabasePool(pool);
  }
}

/**
 * The report a person reads, and **the counters are the finding rather than the
 * ceremony**.
 *
 * `0 new, N already held` on a re-run is acceptance criterion 2 visible without
 * a query: it says the store and the vendor agree about every session asked
 * for. A blocked symbol is printed with its reason rather than folded into a
 * count, because it is the one outcome here that needs a person.
 */
function summarise(result: BackfillReport): BackfillOutcome {
  const lines = [
    "",
    `  ${String(result.requests)} fetches, ${String(result.sessionsFetched)} sessions fetched, ` +
      `${String(result.sessionsAlreadyHeld)} already held`,
    `  ${String(result.inserted)} bars stored, ${String(result.corrected)} corrected, ` +
      `${String(result.unchanged)} unchanged`,
  ];

  if (result.emptyAnswers > 0) {
    lines.push(
      `  ${String(result.emptyAnswers)} symbol-sessions answered with no bars — a successful`,
      "  empty answer rather than a failure, and the ledger did not move for them.",
    );
  }

  if (result.blocked.length > 0) {
    lines.push("", `  ${String(result.blocked.length)} symbols stopped early:`);
    for (const entry of result.blocked.slice(0, 10)) {
      lines.push(`    ${entry.symbol}  ${entry.reason}`);
    }
    if (result.blocked.length > 10) {
      lines.push(`    … and ${String(result.blocked.length - 10)} more`);
    }
  }

  switch (result.stoppedBy) {
    case "completed":
      return { exitCode: 0, lines, errors: [] };
    case "interrupted":
      // **Exit 0, and that is a decision.** An interrupted run did exactly what
      // it was asked to do up to the point somebody asked it to stop, and every
      // session it stored is stored. A non-zero code here would make Ctrl-C
      // indistinguishable from a failure in any script that wraps this.
      lines.push(
        "",
        "  Interrupted. The session in flight finished and its ledger row is written,",
        "  so a re-run continues from exactly here.",
      );
      return { exitCode: 0, lines, errors: [] };
    case "failed":
      return {
        exitCode: 1,
        lines,
        errors: [
          "",
          `  The run stopped on: ${result.failedWith ?? "an unknown outcome"}.`,
          "  Everything stored before it is stored; re-run to continue.",
        ],
      };
    default: {
      const unhandled: never = result.stoppedBy;
      return unhandled;
    }
  }
}

interface ParsedArguments {
  readonly symbols?: readonly Ticker[];
  readonly timeframe: Timeframe;
  readonly sessions?: number;
  readonly from?: string;
  readonly to?: string;
}

/**
 * The sessions to end up holding, oldest first, or a refusal.
 *
 * **A refusal and never a clamp**, which is ADR 0017 decision 9 applied at the
 * one call site with a metered API behind it: the calendar covers 2024–2028 and
 * refuses outside it, and a backfill that quietly started at the bound would
 * store a year and report that it had stored two.
 */
function resolveSessions(
  parsed: ParsedArguments,
): { sessions: readonly MarketSession[] } | { problem: string } {
  try {
    if (parsed.from !== undefined && parsed.to !== undefined) {
      const from = toMarketDate(parsed.from);
      const to = toMarketDate(parsed.to);
      if (from > to) {
        return { problem: `--from ${parsed.from} is after --to ${parsed.to}.` };
      }
      if (from < EARLIEST_BACKFILL_DATE) {
        return {
          problem:
            `--from ${parsed.from} is before ${EARLIEST_BACKFILL_DATE}, which is as far ` +
            `back as the trading calendar reaches. Without it there is no way to tell a ` +
            `missing bar from a day the market was shut, so this refuses rather than ` +
            `starting at the bound and reporting a range it did not fetch.`,
        };
      }
      const sessions = marketSessionsBetween(from, to);
      if (sessions.length === 0) {
        return {
          problem: `The market was not open on any day between ${parsed.from} and ${parsed.to}.`,
        };
      }
      return { sessions };
    }

    // **The most recent COMPLETE session is the last one this does not
    // return**, which is why one extra is asked for and the newest dropped:
    // today's session may not have happened, may be in progress, and in any
    // case falls inside the plan's withheld recent window (ALPACA.md §10).
    const wanted = parsed.sessions ?? DEFAULT_SESSIONS;
    const sessions = lastMarketSessions(
      wanted + 1,
      marketDateAt(new Date()),
    ).slice(0, wanted);
    return { sessions };
  } catch (error) {
    // `MarketCalendarRangeError` names the range and the file to edit.
    // Propagated rather than swallowed — see this function's doc comment.
    return { problem: error instanceof Error ? error.message : String(error) };
  }
}

const USAGE = [
  "Usage: pnpm backfill [--symbols A,B] [--timeframe 1m|1d] [--sessions N]",
  "                     [--from YYYY-MM-DD --to YYYY-MM-DD]",
  "",
  "  Fetches historical bars and stores them. Bars are stored RAW — never",
  "  split-adjusted — because this store is the record of what was observed",
  "  rather than a cache, and an adjusted series is retroactively wrong after",
  "  the next split. Adjustment is asked for on read.",
  "",
  "  With no --symbols it is every security whose status is `active`.",
  `  With no range it is the last ${String(DEFAULT_SESSIONS)} complete sessions — deliberately small,`,
  "  because a default that spends an hour against a metered API is a trap.",
  "",
  "  It resumes from the ledger rather than from a bookmark of its own, so an",
  "  interrupted run continues from where it stopped and a re-run of a range",
  "  already held fetches nothing. Ctrl-C finishes the request in flight,",
  "  writes its ledger row and stops.",
  "",
  "  pnpm backfill --symbols NVDA --sessions 20",
  "  pnpm backfill --timeframe 1d --from 2024-01-02 --to 2026-09-04",
  "  pnpm backfill --sessions 251",
].join("\n");

function parseArguments(
  argv: readonly string[],
): ParsedArguments | { problem: string } | { help: true } {
  let symbols: readonly Ticker[] | undefined;
  let timeframe: Timeframe = "1m";
  let sessions: number | undefined;
  let from: string | undefined;
  let to: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];

    if (argument === undefined) continue;
    if (argument === "--help" || argument === "-h") return { help: true };
    if (!argument.startsWith("--")) {
      return {
        problem: `${JSON.stringify(argument)} is not an option. Every argument to this command is named.`,
      };
    }
    if (value === undefined || value.startsWith("--")) {
      return { problem: `${argument} needs a value.` };
    }
    index += 1;

    switch (argument) {
      case "--symbols": {
        const parsedSymbols: Ticker[] = [];
        for (const raw of value.split(",")) {
          const trimmed = raw.trim();
          if (trimmed === "") continue;
          try {
            parsedSymbols.push(toTicker(trimmed));
          } catch {
            return {
              problem: `${JSON.stringify(trimmed)} is not a well-formed ticker.`,
            };
          }
        }
        if (parsedSymbols.length === 0) {
          return { problem: "--symbols was given no symbols." };
        }
        symbols = parsedSymbols;
        break;
      }
      case "--timeframe": {
        if (!isTimeframe(value)) {
          return {
            problem: `${JSON.stringify(value)} is not a timeframe. Expected ${TIMEFRAMES.join(" or ")}.`,
          };
        }
        timeframe = value;
        break;
      }
      case "--sessions": {
        const count = Number(value);
        if (!Number.isInteger(count) || count < 1) {
          return {
            problem: `--sessions needs a positive whole number, not ${JSON.stringify(value)}.`,
          };
        }
        sessions = count;
        break;
      }
      case "--from":
        from = value;
        break;
      case "--to":
        to = value;
        break;
      default:
        return { problem: `${JSON.stringify(argument)} is not an option.` };
    }
  }

  // **A range needs both ends or neither**, for `pnpm bars`' reason: one end
  // alone is ambiguous, and guessing produces a window nobody asked for.
  if ((from === undefined) !== (to === undefined)) {
    return { problem: "--from and --to go together; give both or neither." };
  }
  if (from !== undefined && sessions !== undefined) {
    return {
      problem:
        "--sessions and --from/--to are two ways to say the same thing. Give one.",
    };
  }

  return {
    ...(symbols === undefined ? {} : { symbols }),
    timeframe,
    ...(sessions === undefined ? {} : { sessions }),
    ...(from === undefined ? {} : { from }),
    ...(to === undefined ? {} : { to }),
  };
}

/** `includes` on a `readonly T[]` narrows nothing, so this does. */
function isTimeframe(value: string): value is Timeframe {
  return (TIMEFRAMES as readonly string[]).includes(value);
}
