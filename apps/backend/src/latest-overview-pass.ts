// **The latest pass the one producer computed, and nothing else** (Task
// 7.2.5) — a sibling of `current-market-state.ts` in exactly the sense ADR
// 0038's decision 1 means it: the join stays where it is, this holds its most
// recent answer so a consumer that cannot attach a WebSocket can read one.
//
// ## Why it exists at all
//
// ADR 0038's narrower reversal trigger — *the first consumer of the overview
// aggregate that is not a browser* — fired on Story 7.2's breadth step. The
// three alternatives and why this one was taken are in that ADR's 2026-11-19
// amendment; the two that matter here are the ones this file's shape rules
// out:
//
//  - **A second `buildMarketOverview` call site** is refused by
//    `one-producer-of-the-overview-aggregate`, and the guard is right rather
//    than in the way: a recomputed aggregate is exactly the call shape Epic
//    13's replay has to refuse (invariant 4's own named gap — a join over
//    `status = 'active'` is a statement about the market we track NOW).
//  - **Keeping it in `market-gateway.ts`** — where `lastBroadcastPass` lived
//    until this task — makes the gateway the owner of a fact. That gateway's
//    own stated rule is that it decides *when* a browser is told something and
//    must not decide *what* is true, and a tool reaching into it to read an
//    aggregate would be the second half of that rule going quietly.
//
// ## It records EVERY pass, not only the broadcast ones
//
// `lastBroadcastPass` was written on the per-batch broadcast path alone, so a
// process with no browser attached held nothing — and since Task 4.8.11 such a
// process genuinely does not run the join at all. The holder is written by the
// **producer**, so what it means is *the latest answer this process computed,
// and nothing about who was listening*. The gateway's own behaviour is
// unchanged by that widening in every case it had a value for; where it had
// none it now serves the cold-start join it had just computed, which is
// strictly more of the consistency Task 4.7.3 bought (two tabs of `/` agree).
//
// ## One writer
//
// {@link LatestOverviewPass.recordPass} returns the pass it was given, so the
// producer's own `return` statement is the write and there is no way to
// compute a pass without recording it. `one-writer-of-the-latest-overview-
// pass` counts the write SITES rather than the files, because the regression
// this guards is a second write added **beside** the existing one — the same
// shape `one-subscriber-on-the-upstream-socket` learned the expensive way.

import type { OverviewPass } from "./market-overview.js";

export interface LatestOverviewPass {
  /**
   * Records a pass and hands it straight back, so the producer writes it by
   * returning it. **The one write site**, held by `pnpm invariants`.
   */
  readonly recordPass: (pass: OverviewPass) => OverviewPass;
  /**
   * The latest pass, or `undefined` where this process has computed none.
   *
   * **`undefined` is a first-class answer, never an empty aggregate.** A
   * fabricated zero-figure pass here would be indistinguishable from a real
   * one computed over a quiet market, which is invariant 5's distinction
   * between *we have an answer and it is nothing* and *we have no answer*. CI
   * (zero bars, no provider), a cold deploy's first seconds and any process
   * with nobody attached are all in the second state.
   */
  readonly read: () => OverviewPass | undefined;
}

/**
 * Builds the holder. One per process, constructed beside `currentMarketState`.
 *
 * Nothing here may throw: `recordPass` is reached from the socket's own callback
 * through the producer, where an unhandled rejection is a crashed process. It
 * is one assignment of a value the caller already holds.
 */
export function createLatestOverviewPass(): LatestOverviewPass {
  let latest: OverviewPass | undefined;

  return {
    recordPass(pass) {
      latest = pass;
      return pass;
    },
    read: () => latest,
  };
}
