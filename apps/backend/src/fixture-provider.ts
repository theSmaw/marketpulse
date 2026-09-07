/**
 * The whole {@link MarketDataProvider} interface, offline and deterministic
 * (Task 2.6.6).
 *
 * This is the task Story 2.6 is actually met by: acceptance criteria 2, 4 and 6
 * are all properties of this file. It is also what keeps `pnpm test` free of
 * network access for the rest of the project — a property that has survived
 * thirteen stories and that a single test reaching a vendor would break all at
 * once.
 *
 * ## It ships, and its selection is configuration whose default is the loud one
 *
 * `PROVIDER.md` §5: this lives in `apps/backend/src`, inside the container
 * image, and `MARKET_DATA_PROVIDER` chooses it. **The default is `none` and
 * emphatically not `fixture`**, which is the safety decision in this story and
 * the one to resist "simplifying": a backend serving fixture bars is serving
 * invented prices, which is §35's *"manufacture missing observations"*
 * verbatim, so a default that quietly works is a default that quietly ships
 * fabricated market data to whatever is pointed at it. Task 1.8.3's
 * `CORS_ORIGIN` note is the precedent — **a default that is convenient in
 * development is a decision about production.**
 *
 * A developer opts in by writing one line in `apps/backend/.env`. The
 * deliberateness of that act is the property being bought.
 *
 * ## Why a fixture-backed screen can never be mistaken for a product
 *
 * Not by a banner somebody has to remember. Every series this file returns
 * carries `provider: "fixture"` and `feed: "synthetic"`, and
 * `MARKET_FEED_DESCRIPTIONS.synthetic` renders as *"Generated test data. Not a
 * market feed."* — so the chrome of a screenshot says so structurally. That is
 * Task 2.6.3's provenance record earning its place on its first consumer.
 *
 * ## What it is NOT allowed to do
 *
 * - **No retry.** A provider makes exactly one attempt; retry is a wrapper's,
 *   and `market-data-provider.ts` argues where and why. A provider that retried
 *   would make a caller's deadline a lie and would stop a fixture-backed test
 *   meaning anything.
 * - **No cache.** Story 2.8 owns storage. A provider that memoised would behave
 *   differently on the second call than the first, which is the same problem.
 *   Generation is cheap and repeatable, which is what makes that free.
 * - **No clock.** Every instant it returns comes from the request or from the
 *   trading calendar. See `fixture-corpus.ts`.
 */

import {
  type Adjustment,
  type Bar,
  type BarSeries,
  marketDateAt,
  marketSessionsBetween,
  type Timeframe,
  type TimeRange,
  toBarSeries,
  toSeriesProvenance,
  toTimeRange,
} from "@marketpulse/shared";

import {
  FIXTURE_CORPUS,
  FIXTURE_FIRST_DATE,
  FIXTURE_LAST_DATE,
  FIXTURE_RETRIEVED_AT,
  type FixtureEntry,
  fixtureSessionOn,
  generateSessionBars,
} from "./fixture-corpus.js";
import {
  type BarsRequest,
  type BarsRequestOptions,
  type BarsResult,
  DEFAULT_BARS_DEADLINE_MS,
  type MarketDataProvider,
} from "./market-data-provider.js";

/**
 * The window this corpus has anything at all to say about, as instants.
 *
 * Built from real session bounds rather than written out, so it is the calendar
 * that decides where the corpus starts and stops — and so `toTimeRange` refuses
 * it at module load if a calendar edit ever made the two dates cross.
 */
export const FIXTURE_COVERAGE: TimeRange = toTimeRange(
  fixtureSessionOn(FIXTURE_FIRST_DATE).open,
  fixtureSessionOn(FIXTURE_LAST_DATE).close,
);

/**
 * A provider that answers from {@link FIXTURE_CORPUS} and never touches a
 * network.
 *
 * A factory rather than an exported object literal, so a test can hold two of
 * them and so nothing can mutate a shared instance. It takes no arguments
 * today; the corpus is a module constant because there is exactly one fixture
 * world and a second would be two things to keep honest.
 */
export function createFixtureProvider(): MarketDataProvider {
  return {
    id: "fixture",
    fetchBars,
  };
}

async function fetchBars(
  request: BarsRequest,
  options: BarsRequestOptions = {},
): Promise<BarsResult> {
  const deadlineMs = options.deadlineMs ?? DEFAULT_BARS_DEADLINE_MS;

  // Two signals, composed rather than chosen between, and read off the
  // **signals themselves** rather than off a rejection — `api-client.ts`'s
  // arrangement, reused whole for its stated reason: a `DOMException` name is a
  // string comparison against a value from another realm, where these two flags
  // are facts this function owns. They also produce different members, so
  // getting it wrong is not cosmetic.
  const deadline = AbortSignal.timeout(deadlineMs);
  const signal =
    options.signal === undefined
      ? deadline
      : AbortSignal.any([deadline, options.signal]);

  // A caller that tore down before the call was even made. Checked first,
  // because answering it with data is the "resolved after unmount" bug Task
  // 1.12.3 closed at the one place it can be closed.
  if (signal.aborted)
    return classifyAbort(deadline, options.signal, deadlineMs);

  const entry = FIXTURE_CORPUS[request.symbol];
  if (entry === undefined) {
    // A well-formed ticker for a security this corpus does not carry. An
    // ANSWER rather than a failure, and it deliberately does not echo the
    // symbol back — the caller sent it.
    return { outcome: "unknown-symbol" };
  }

  const fault = await applyFault(entry, signal);
  if (fault !== undefined) {
    return fault.outcome === "signalled"
      ? classifyAbort(deadline, options.signal, deadlineMs)
      : fault.result;
  }

  const effective = intersect(request.range, FIXTURE_COVERAGE);
  if (effective === undefined) {
    // A window this provider will never serve, which is the fact
    // `range-not-available` names. A window that only PARTIALLY overlaps is
    // answered partially instead — see `intersect`.
    return { outcome: "range-not-available" };
  }

  return { outcome: "ok", series: buildSeries(request, entry, effective) };
}

/**
 * Which of the two signals fired.
 *
 * The deadline is checked first, following `api-client.ts` — if both have
 * fired, the deadline is the one that describes the request rather than the
 * caller. `aborted` carries nothing at all, because the caller's own teardown
 * is not a fact about the world; `timeout` carries the number, because a caller
 * that passed no `deadlineMs` does not otherwise know which one it was measured
 * against.
 */
function classifyAbort(
  deadline: AbortSignal,
  callerSignal: AbortSignal | undefined,
  deadlineMs: number,
): BarsResult {
  if (deadline.aborted) return { outcome: "timeout", deadlineMs };
  if (callerSignal?.aborted === true) return { outcome: "aborted" };

  // Unreachable: this is only called when one of the two composed signals has
  // aborted. `upstream-unavailable` rather than a throw would be laundering a
  // defect, which the interface's own comment forbids, so it throws.
  throw new Error(
    "fetchBars stopped without either its deadline or the caller's signal " +
      "having aborted, which cannot happen.",
  );
}

/** What an entry's fault produced, if it has one. */
type FaultOutcome =
  | { readonly outcome: "result"; readonly result: BarsResult }
  | { readonly outcome: "signalled" };

/**
 * Turns an entry's declared fault into a result.
 *
 * `PROVIDER.md` §8.7's mechanism: the corpus is what produces each cause, never
 * a `simulateError` parameter on the shipped interface.
 *
 * **This provider is the first thing anywhere to CONSTRUCT these members**, so
 * it is where the `rate-limited` idiom gets set — and the branch below is the
 * whole of it. Under `exactOptionalPropertyTypes` an omitted `retryAfterMs`
 * means the key is genuinely **absent**, which is the difference between *"the
 * vendor did not say"* and *"come back immediately"*; assigning a
 * possibly-`undefined` value would collapse the two. It is `apiError()`'s shape
 * with its `details`, reused for the same reason.
 */
async function applyFault(
  entry: FixtureEntry,
  signal: AbortSignal,
): Promise<FaultOutcome | undefined> {
  const fault = entry.fault;
  if (fault === undefined) return undefined;

  switch (fault.kind) {
    case "rate-limited":
      return {
        outcome: "result",
        result:
          fault.retryAfterMs === undefined
            ? { outcome: "rate-limited" }
            : { outcome: "rate-limited", retryAfterMs: fault.retryAfterMs },
      };
    case "unauthorised":
      return { outcome: "result", result: { outcome: "unauthorised" } };
    case "upstream-unavailable":
      return {
        outcome: "result",
        result: { outcome: "upstream-unavailable" },
      };
    case "slow": {
      // A real wait raced against the real signal, because the thing being
      // tested is the composition — a fake clock would test the fake. The
      // delay is far longer than any deadline a caller passes, so in practice
      // the signal always wins and nothing waits.
      await settleAt(fault.delayMs, signal);
      return signal.aborted ? { outcome: "signalled" } : undefined;
    }
    default: {
      const unhandled: never = fault satisfies never;
      return unhandled;
    }
  }
}

/** Resolves after `ms`, or as soon as `signal` aborts, whichever is first. */
function settleAt(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(finish, ms);
    signal.addEventListener("abort", finish, { once: true });

    function finish(): void {
      clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      resolve();
    }
  });
}

/**
 * The overlap of two half-open windows, or `undefined` when they do not touch.
 *
 * **A partial overlap is answered partially rather than refused, and that is a
 * decision.** A request reaching past the end of what this provider holds is
 * exactly the shape `SeriesCoverage` exists for — *how far the answer reaches*
 * — and refusing it would make `range-not-available` mean two different things,
 * one of which has a perfectly good answer. `range-not-available` is reserved
 * for a window with **no** overlap at all, which is the one this provider will
 * never serve however it is narrowed.
 *
 * The comparison is `>=` because the ranges are half-open: two windows that
 * meet exactly at an instant share no minute, so they do not overlap.
 */
function intersect(
  requested: TimeRange,
  held: TimeRange,
): TimeRange | undefined {
  const start = Math.max(requested.start.getTime(), held.start.getTime());
  const end = Math.min(requested.end.getTime(), held.end.getTime());
  if (start >= end) return undefined;
  return toTimeRange(new Date(start), new Date(end));
}

/**
 * Builds the series for a window this corpus covers.
 *
 * The sessions come from `market-session.ts`, so weekends, holidays and half
 * days are all correct without this file knowing anything about any of them —
 * and a range covering only a holiday produces **no bars**, which is a
 * successful empty answer rather than a failure. `PROVIDER.md` §8.2 is explicit
 * that treating it as one is how Story 2.12 shows an error screen on a public
 * holiday, and it is the single most likely thing to be got wrong by whoever
 * writes the first `if (bars.length === 0)`.
 */
function buildSeries(
  request: BarsRequest,
  entry: FixtureEntry,
  effective: TimeRange,
): BarSeries {
  const bars = barsIn(entry, effective, request.timeframe, request.adjustment);

  return toBarSeries({
    symbol: request.symbol,
    timeframe: request.timeframe,
    bars,
    provenance: toSeriesProvenance(request.adjustment, {
      provider: "fixture",
      feed: "synthetic",
      retrievedAt: FIXTURE_RETRIEVED_AT,
      barCount: bars.length,
    }),
    coverage: {
      requested: request.range,
      // `null` exactly when there are no bars, which `toBarSeries` enforces
      // both ways round. Otherwise the window this answer reaches: what was
      // asked for, clipped to what is held.
      covered: bars.length === 0 ? null : effective,
    },
  });
}

/**
 * Every bar of every session the window touches, filtered to the window.
 *
 * ## The filter is half-open and the `<` is the whole point
 *
 * `b.startsAt >= range.start && b.startsAt < range.end`. Get the second
 * comparison wrong and adjacent windows **each claim the bar at the seam** —
 * `[09:30, 10:00)` and `[10:00, 10:30)` would both return the 10:00 bar, which
 * Story 2.8's backfill does thousands of times and which `market_bars`' unique
 * constraint would then reject, reporting a failure that was actually the
 * database being right.
 *
 * `time-range.ts` carries the rule; `timeRangeIncludes` was deliberately not
 * built there, because this is its first and only caller and Task 2.6.2 named
 * a second caller as the trigger for extracting it.
 */
function barsIn(
  entry: FixtureEntry,
  range: TimeRange,
  timeframe: Timeframe,
  adjustment: Adjustment,
): readonly Bar[] {
  // The last market date the half-open window touches — `end` itself is
  // excluded, so a window ending exactly at an open must not pull in that day.
  const sessions = marketSessionsBetween(
    marketDateAt(range.start),
    marketDateAt(new Date(range.end.getTime() - 1)),
  );

  const start = range.start.getTime();
  const end = range.end.getTime();

  return sessions.flatMap((session) =>
    generateSessionBars(entry, session, timeframe, adjustment).filter((bar) => {
      const at = bar.startsAt.getTime();
      return at >= start && at < end;
    }),
  );
}
