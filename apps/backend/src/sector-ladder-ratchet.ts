import {
  lastOpenedMarketSession,
  marketDateAt,
  ratchetSectorLadder,
} from "@marketpulse/shared";

import type {
  SectorLadder,
  SectorLadderStep,
  WireOverviewFigure,
} from "@marketpulse/shared";

/**
 * **The cell that remembers which rung the sector bars are drawn at** (Task
 * 4.3.4).
 *
 * `sector-ladder.ts` in `packages/shared` holds the arithmetic and is pure:
 * the previous rung goes in as an argument and the new one comes out. This
 * module holds the one `let` that makes it a ratchet, and it is deliberately
 * **not** in `market-overview.ts` — that module reads no clock, opens no
 * socket, holds no handle and now holds no state either, which is what makes
 * invariant 4 a property of its shape rather than a thing somebody remembered.
 *
 * ## Why the ratchet is on the SERVER, taken explicitly
 *
 * Two facts decide it, and both are asymmetries rather than preferences.
 *
 * **The aggregate is computed once per applied batch and broadcast identically
 * to every client** (ADR 0038). A rung computed here is therefore one value
 * every reader shares; a rung computed in a browser is **per tab**, so two
 * people looking at the same market at the same second can see two different
 * scales — and one of them can see a scale nobody else's screen agrees with
 * for the rest of the session, because the ratchet only steps outward.
 *
 * **A browser would be asked to step on partial information.** The vendor
 * batches a minute into 8.8 frames at the open, 6.8 at midday and 16.1 at the
 * close, and this product adds no coalescing — so a per-tab ratchet would be
 * asked to step up to sixteen times a minute, each time on the **subset** of
 * the eleven that happened to be in that frame, and a tab opened at 15:59
 * would start its ladder from one frame's worth of the day.
 *
 * **The alternative, recorded:** hold the rung in the browser, beside the
 * region that draws it. It is cheaper — no wire field, no state in a server
 * that is otherwise stateless about drawing — and it keeps a presentation
 * decision out of a protocol. What it costs is the shared scale, which is the
 * thing the printed rung exists to make checkable: `The ranked list.dc.html`
 * prints `±2%` under the bars, and two screenshots of the same minute printing
 * different rungs is a picture this product cannot explain. The reversal
 * trigger is a condition: **the first surface that needs a rung for a set the
 * server does not compute** — a reader's own selection of sectors, say — at
 * which point the ladder is per-view and the browser is the only place it can
 * live.
 *
 * ## The session key is *the bell that last rang*
 *
 * `lastOpenedMarketSession` is the one function in this product that answers
 * *has the bell rung*, and the owner's decision is that the ladder resets at
 * the bell. So between midnight and 09:30 the key is still the **previous**
 * session's date, which is the intended reading rather than an accident: a
 * pre-market frame that stepped the ladder out on thin extended-hours prices
 * would hand the regular session a scale bought with a few hundred shares, and
 * a reset at midnight would do exactly that. The regular session's first frame
 * is the one that starts the new ladder.
 */
export interface SectorLadderRatchet {
  /**
   * The rung for these figures at this instant, stepping outward within the
   * session and starting again at the bell.
   *
   * The instant is an **argument**, never a clock read here — the producer
   * already holds one, and under a replay it is the replay clock's.
   */
  stepFor(figures: readonly WireOverviewFigure[], asOf: Date): SectorLadderStep;

  /** What is held, for a test and for a diagnostic. `undefined` before the first frame. */
  held(): SectorLadder | undefined;
}

export function createSectorLadderRatchet(): SectorLadderRatchet {
  let held: SectorLadder | undefined;

  return {
    stepFor(figures, asOf) {
      held = ratchetSectorLadder(held, sessionKeyAt(asOf), figures);
      return held.step;
    },
    held() {
      return held;
    },
  };
}

/**
 * The session the ladder is keyed on — and **it must not throw**.
 *
 * This is called from the producer the socket's own callback reaches, where an
 * unhandled rejection is a crashed process (`live-bar-writer.ts` is the
 * standing precedent, and `CLAUDE.md` records the two days of
 * `CrashLoopBackOff` that taught it). `lastOpenedMarketSession` propagates
 * `MarketCalendarRangeError` by design — the calendar covers 2024–2028 and
 * walking off it is a real answer to a real question — so the day this
 * deployment outlives the checked-in calendar, every frame would throw inside
 * the callback.
 *
 * The fallback is `marketDateAt`, which converts and cannot fail. It is a
 * **worse key and not a wrong one**: it resets at midnight rather than at the
 * bell, so the ladder's one load-bearing property — *nothing survives the
 * night* — holds either way, and what is lost is the pre-market nicety the
 * interface's note describes. `CALENDAR.md` §3's rule is that the caller who
 * must not propagate says so; this is that caller.
 */
function sessionKeyAt(asOf: Date) {
  try {
    return lastOpenedMarketSession(asOf).date;
  } catch {
    return marketDateAt(asOf);
  }
}
