import { UNIVERSE } from "./universe.js";

import type { Bar, BarSource, Ticker } from "@marketpulse/shared";
import type { LiveObservation } from "./market-data-stream.js";

/**
 * **What this backend knows right now** — the latest observation per security
 * (Task 3.5.1).
 *
 * `LIVE-DATA.md` §10.3 settles the shape: one `Map`, latest only, **0.2 MB
 * measured** at universe scale, **one writer** (the socket) and **many
 * readers**. Three of those readers are outside this epic entirely — Epic 4's
 * overview, Epic 5's anomaly scores and Epic 7's analytical tools all want the
 * latest observation per security and **none of them wants to open a socket**.
 * That is why this object exists at all, rather than every consumer subscribing.
 *
 * ## It is a different object from a stream of frames
 *
 * Before this file, `index.ts` subscribed with `onObservations: () => undefined`
 * and **every observation this product received was discarded**. A price moved
 * on screen only because `market-gateway.ts` held a second subscription and
 * re-broadcast each batch without remembering it — so nothing in this process
 * could answer *what is NVDA's latest price* unless a browser happened to be
 * attached at the moment the bar arrived.
 *
 * ## Three properties that are easy to get wrong
 *
 * 1. **After a restart this is legitimately empty**, and it refills
 *    **unevenly** — within a minute for a liquid name, possibly hours for
 *    `ERIE` (§7.6: IEX covers 65.1% of minutes for a median symbol and **2.1%**
 *    for `ERIE`). So *nothing observed for this symbol* is an **ordinary
 *    answer rather than an error**, which is why {@link CurrentMarketState.read}
 *    returns `undefined` rather than throwing or inventing a zero.
 * 2. **It is not cleared on a session boundary.** At 09:31 on Monday it still
 *    holds Friday's bars, which is **correct** — and is only safe because every
 *    entry carries its own `startsAt` and **no reader may render a price
 *    without reading it**. That is enforced here by shape rather than by
 *    documentation: there is no way to read a price without receiving its
 *    instant in the same object.
 * 3. **A bar is not final for thirty seconds.** §14.1 measured revisions at
 *    **0.064%** of bars, arriving **29.1–30.1 s** after the bar they correct,
 *    **35.3%** of them changing the close and **not one** changing nothing.
 */

/**
 * One security's current state, as a reader receives it.
 *
 * **The price and its instant are one object, deliberately.** Criterion 4 asks
 * that reading a price and reading its instant be the *same call*, and the
 * reason is property 2 above: a reader holding a number with no instant beside
 * it will eventually render Friday's close as today's price. There is no
 * `priceOf(symbol)` on this interface and there should never be one.
 */
export interface CurrentObservation {
  readonly symbol: Ticker;
  /** Six fields, `startsAt` marking the interval's **start** (§7.3). */
  readonly bar: Bar;
  /** Per-observation provenance — invariant 6 is displayed, never implied. */
  readonly source: BarSource;
  /**
   * How old this observation is, in milliseconds, **computed on read**.
   *
   * Never stored: a stored age is wrong the instant after it is written, and
   * the bug it produces — a price that claims to be four seconds old for the
   * rest of the afternoon — looks exactly like a working feed.
   */
  readonly ageMs: number;
}

export interface CurrentMarketState {
  /** Apply a batch from the stream. The only writer. */
  observe: (observations: readonly LiveObservation[]) => void;
  /**
   * One security, or `undefined` for **nothing observed** — an ordinary
   * answer rather than an error, for property 1's reason.
   */
  read: (symbol: Ticker) => CurrentObservation | undefined;
  /** Everything held. Task 3.5.3 turns this into the gateway's snapshot. */
  all: () => ReadonlyMap<Ticker, CurrentObservation>;
  /** How many securities have been observed at all. */
  size: () => number;
}

export interface CurrentMarketStateOptions {
  /**
   * The clock, seamed so a test does not wait. Milliseconds since the epoch.
   */
  readonly now?: () => number;
  /**
   * Which securities this object is **about**. Defaults to the tracked
   * universe, `active` only — see {@link trackedSymbols}.
   */
  readonly tracked?: ReadonlySet<string>;
}

/**
 * The symbols this object accepts, and **the one place `status` is filtered**.
 *
 * `UNIVERSE.md` §12.2 makes `status` an *invisible predicate* and states the
 * rule for any reader not in its table: **filter when computing over the market
 * we track now, and never when showing something we stored.** This object is
 * the former — it is literally named *the current market state* — so it holds
 * `active` securities only.
 *
 * **Story 3.9's read path is deliberately NOT filtered**, and that asymmetry is
 * the point rather than an inconsistency: stored bars are history, and a
 * security we stopped tracking today was tracked when its bars were written.
 * A reader who "fixes" this by making both sides agree breaks one of them —
 * which one depends on which way they made them agree.
 */
export const trackedSymbols = (): ReadonlySet<string> =>
  new Set(
    UNIVERSE.filter((security) => security.status === "active").map(
      (security) => security.symbol,
    ),
  );

export function createCurrentMarketState(
  options: CurrentMarketStateOptions = {},
): CurrentMarketState {
  const { now = () => Date.now(), tracked = trackedSymbols() } = options;

  const latest = new Map<Ticker, LiveObservation>();

  const present = (observation: LiveObservation): CurrentObservation => ({
    symbol: observation.symbol,
    bar: observation.bar,
    source: observation.source,
    ageMs: now() - observation.bar.startsAt.getTime(),
  });

  return {
    observe(observations) {
      for (const observation of observations) {
        // The `status` filter, and the only gate on the write path. A symbol
        // outside the tracked universe is not an error — Task 3.5.2 keeps the
        // subscribe frame honest, and this is the belt to that brace.
        if (!tracked.has(observation.symbol)) continue;

        const held = latest.get(observation.symbol);

        // **Replace by `(symbol, minute)`, and never regress.**
        //
        // This is where `LiveObservation.supersedes` is finally acted on —
        // Task 3.2.4 carried the field across the seam and deliberately did
        // not act, because acting requires state and the state is this
        // object's.
        //
        // Three cases, and the third is the one that gets written wrong:
        //
        // - a **newer** minute supersedes what we hold — it is the latest;
        // - the **same** minute replaces it — that is the revision case, and
        //   the common one, because a revision arrives ~30 s after its bar
        //   while bars are 60 s apart, so it lands before the next bar does;
        // - an **older** minute does NOT replace it. A correction to a minute
        //   we have already moved past does not change what the *latest*
        //   observation is, and applying it would walk this object backwards
        //   in time. The correction is not lost to the product — Story 3.9's
        //   store is where a revision to a past minute belongs — it is simply
        //   not news about *now*.
        if (held !== undefined && observation.bar.startsAt < held.bar.startsAt)
          continue;

        latest.set(observation.symbol, observation);
      }
    },

    read(symbol) {
      const held = latest.get(symbol);
      return held === undefined ? undefined : present(held);
    },

    all() {
      const snapshot = new Map<Ticker, CurrentObservation>();
      for (const [symbol, observation] of latest) {
        snapshot.set(symbol, present(observation));
      }
      return snapshot;
    },

    size: () => latest.size,
  };
}
