// **The live session, written down.** Story 3.8's writer: minute bars arriving
// on the socket become rows in `market_bars`, with their tape, and the ledger
// moves with them in the same transaction.
//
// ## Why this is a second consumer rather than a branch of the first
//
// `index.ts` has exactly one subscriber to the stream, and Task 3.5.1's rule is
// that the gateway broadcasts **what the current-market state applied** rather
// than what arrived — so a browser cannot receive a revision this process
// rejected. This writer hangs off the same applied list, which makes the store
// and the browser agree by construction rather than by agreement.
//
// **It deliberately sees the applied list and not the raw one**, and that is a
// task boundary rather than an oversight: Story 3.5's close recorded that a
// revision for a **superseded** minute is dropped by the live path and that
// only the store can apply it. Widening this writer's input to the raw list is
// Task 3.8.7's, and doing it here would mean taking that decision in passing.
//
// ## What it may never do
//
// **Never throw into the stream.** `onObservations` is called from the socket's
// own callback; an unhandled rejection there is a crashed process on a
// liveness-probed platform. Every failure is caught, counted and logged, and
// the next minute is unaffected.
//
// **Never block the broadcast.** The gateway publishes first and this runs
// after, so a slow database cannot hold up a browser's price.
import {
  toBarSeries,
  toSeriesProvenance,
  toTimeRange,
  type Bar,
  type Ticker,
  type Timeframe,
} from "@marketpulse/shared";

import type { LiveObservation } from "./market-data-stream.js";
import type { MarketBarsRepository } from "./market-bars.js";

/** One minute, in milliseconds — the width of the bars this writer stores. */
const MINUTE_MS = 60_000;

/** The timeframe the live stream carries. It is minute bars or nothing. */
const LIVE_TIMEFRAME: Timeframe = "1m";

/** What one call wrote, for the log line and for the tests. */
export interface LiveWriteReport {
  /** Securities this batch carried a storable bar for. */
  readonly securities: number;
  readonly inserted: number;
  readonly corrected: number;
  readonly unchanged: number;
  /**
   * Bars held back because their minute has not finished — see
   * {@link isComplete}. Normally zero.
   */
  readonly pending: number;
  /** Securities whose write was refused, by symbol and reason. */
  readonly refused: ReadonlyMap<Ticker, string>;
  /** How long the writes took, wall clock, for `LIVE-SESSION.md`'s figure. */
  readonly elapsedMs: number;
}

export interface LiveBarWriterOptions {
  readonly bars: MarketBarsRepository;
  /** Where a refusal goes. Never `throw` — see the header. */
  readonly warn: (fields: object, message: string) => void;
  /** Injected so a test can decide what "now" is. */
  readonly now?: () => number;
}

export interface LiveBarWriter {
  readonly store: (
    observations: readonly LiveObservation[],
  ) => Promise<LiveWriteReport>;
}

/**
 * A bar is storable when its minute has **ended**.
 *
 * **The partial-minute rule, and it is smaller than it looks.** The vendor
 * sends a bar for minute *M* at the end of *M* — `LIVE-DATA.md` §7.7's first
 * pre-market bar carries `t=08:43` and arrived at `08:43:59` — so a bar that
 * arrives is a finished minute, and a bar that is **superseded** is handled by
 * the correction path rather than by a completeness test (§7.8's
 * `updatedBars`, ~30 s later, which the writer's upsert applies).
 *
 * So this is not a clock deciding when a minute is done. It is a guard against
 * the one shape that would be a **false record rather than an early one**: a
 * bar stamped in the future, which no correction can ever fix because nothing
 * will arrive to correct it. It has never been observed and it is one
 * comparison.
 */
function isComplete(bar: Bar, now: number): boolean {
  return bar.startsAt.getTime() + MINUTE_MS <= now;
}

export function createLiveBarWriter(
  options: LiveBarWriterOptions,
): LiveBarWriter {
  const { bars, warn, now = () => Date.now() } = options;

  return {
    async store(observations) {
      const started = Date.now();
      const instant = now();
      const bySymbol = new Map<Ticker, LiveObservation[]>();
      let pending = 0;

      for (const observation of observations) {
        if (!isComplete(observation.bar, instant)) {
          pending += 1;
          continue;
        }
        const held = bySymbol.get(observation.symbol);
        if (held === undefined) bySymbol.set(observation.symbol, [observation]);
        else held.push(observation);
      }

      let inserted = 0;
      let corrected = 0;
      let unchanged = 0;
      const refused = new Map<Ticker, string>();

      for (const [symbol, group] of bySymbol) {
        // **One transaction per security, not one per batch.** Task 3.7.6
        // measured that a migration on `market_bars` queues behind any open
        // transaction and takes every reader of the table with it, and this
        // writer turns two cron windows a day into a whole session. A
        // transaction holding one security's minute is the shortest shape
        // `recordSeries` offers; a batch-wide one would hold the table for
        // the length of 518 writes.
        try {
          const written = await bars.recordSeries(seriesFor(symbol, group));
          inserted += written.inserted;
          corrected += written.corrected;
          unchanged += written.unchanged;
        } catch (error) {
          // **Caught per security, so one refusal does not cost the batch.**
          // A series this store will not take is a fact about that security —
          // a provider that disagrees with its ledger row, a gap the feed left
          // — and the other 517 are unaffected.
          refused.set(
            symbol,
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      if (refused.size > 0) {
        warn(
          {
            refused: refused.size,
            first: [...refused.entries()][0],
          },
          "live bars refused by the store",
        );
      }

      return {
        securities: bySymbol.size,
        inserted,
        corrected,
        unchanged,
        pending,
        refused,
        elapsedMs: Date.now() - started,
      };
    },
  };
}

/**
 * One security's observations as the series `recordSeries` takes.
 *
 * **The covered window ends at the last bar seen and NOT at the session
 * close**, which is the decision Task 3.8.1 found while pricing the shapes and
 * handed here. `planRequests` skips a session **wholly inside** the ledger's
 * covered window, and `commonCoverage` takes the intersection across symbols —
 * so a writer that claimed the whole session would stop tonight's backfill
 * ever fetching the consolidated version, and the store would keep a thin
 * one-venue session **permanently, with no collision, no error and nothing on
 * any screen**. Claiming only what is held keeps the ledger honest and the
 * backfill asking. `LIVE-SESSION.md` §3.
 *
 * **The instant is the bar's own**, carried through untouched: `observed_at`
 * has no default because `default now()` would silently turn *when it was true
 * in the market* into *when we wrote it*, and this is the first row in the
 * product where those differ by seconds rather than hours.
 */
function seriesFor(symbol: Ticker, group: readonly LiveObservation[]) {
  // **One bar per instant, the LAST one winning** (Task 3.8.7).
  //
  // A batch is one socket message and `observationsIn` flat-maps every
  // observation frame in it into one call, so nothing in the types stops a bar
  // and its revision for one minute arriving together. Handed that pair, the
  // writer reached `toBarSeries` with two bars stamped alike, which throws, and
  // the per-security catch turned it into a refusal: **the security lost the
  // bar as well as the revision**, silently, to a `warn` line. Demonstrated
  // against the shipped writer.
  //
  // **Whether the vendor ever sends that pair is NOT established, and the
  // measurement points the other way** — corrected here rather than left as
  // the overstatement it first was. `LIVE-DATA.md` §14.1 measured revisions
  // arriving **29.1–30.1 s** after their bar, and §9.5 measured **8.8
  // messages/min** at the open, so a revision is **four to five messages**
  // behind its bar; the recorded `b` and `u` fixtures are separate messages.
  // So this is a **guard on a shape the types permit**, not a repair of a
  // defect anybody has seen — and it costs one `Map`.
  //
  // Last wins because within one batch that is what a revision IS — the
  // frames arrive in the order the vendor sent them, and a later frame for a
  // minute already in the batch is the correction to it. This is the same
  // rule the store applies across batches through `on conflict`; here it is
  // applied before the series is built, because `toBarSeries` will not hold
  // two bars on one instant long enough for the store to decide.
  const byInstant = new Map<number, LiveObservation>();
  for (const observation of group) {
    byInstant.set(observation.bar.startsAt.getTime(), observation);
  }

  const sorted = [...byInstant.values()].sort(
    (a, b) => a.bar.startsAt.getTime() - b.bar.startsAt.getTime(),
  );

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (first === undefined || last === undefined) {
    // Unreachable: the caller only groups symbols it saw a bar for. Stated
    // rather than cast, which is `extendCoverage`'s reason.
    throw new Error(`No observations grouped for ${symbol}`);
  }

  const covered = toTimeRange(
    first.bar.startsAt,
    new Date(last.bar.startsAt.getTime() + MINUTE_MS),
  );

  return toBarSeries({
    symbol,
    timeframe: LIVE_TIMEFRAME,
    bars: sorted.map((observation) => observation.bar),
    // The observation's own provenance, per `TAPE.md` §6: never the stream's
    // standing feed and never a constant. `barCount` describes this answer.
    provenance: toSeriesProvenance("raw", {
      ...first.source,
      barCount: sorted.length,
    }),
    coverage: { requested: covered, covered },
  });
}
