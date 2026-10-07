/**
 * **The stepped ladder the sector bars are drawn against — state with a
 * session lifetime, never a function of the frame** (Task 4.3.4, the owner's
 * 2026-09-27 decision).
 *
 * ## What was decided, and the two things it rules out
 *
 * The bar's scale is a stepped ladder — `±1 / ±2 / ±5 / ±10%` — the **smallest
 * step containing all eleven figures**, **stepping outward only within a
 * session** and **reset at the opening bell**.
 *
 * It is therefore **not** `Math.max` over the current frame. That is the
 * frame-max normalisation Task 4.3.2's drawing rejected on two grounds: a
 * ±0.1% day and a ±5% day would look identical, and all eleven bars would
 * rescale on every tick — up to ~16 times a minute, since the vendor batches a
 * minute into 8.8 frames at the open and 16.1 at the close and this product
 * adds no coalescing.
 *
 * And it is **not** carried overnight. A step that survived the night would
 * open every quiet Tuesday on the previous Friday's rotation scale — eleven
 * stubs against a printed ±5%, a picture that says *nothing is happening* in
 * the room it takes to say *a lot could*. The accepted cost is one visible
 * step-out somewhere in the first half hour of a heavy day, which is a change
 * a reader can see the reason for. What is given up is comparability across
 * days, and nothing else on this screen is comparable across days.
 *
 * **Reversal trigger**, a condition: *the first reader who asks whether
 * today's bars are drawn at the same scale as yesterday's.*
 *
 * ## Pure, with the state passed through
 *
 * This module holds no `let`. The previous rung arrives as an argument and the
 * new one is returned, which is what keeps it callable from a replay and from
 * a test with no process behind it — `market-overview.ts`'s rule one module
 * over. **The cell that remembers is the caller's**, and in this product that
 * caller is `apps/backend/src/sector-ladder-ratchet.ts`; the reason it is on
 * the server rather than in a browser is argued there.
 */

import { displayedPercent } from "./price-direction.js";
import { sectorRankingKey } from "./sector-ranking.js";

import type { MarketDate } from "./market-time.js";
import type { WireOverviewFigure } from "./market-stream-protocol.js";

/**
 * The rungs, smallest first. Each is the **half-range**: a rung of `2` draws
 * a bar from −2% through +2% with zero in the middle.
 *
 * Four values rather than a formula, because the ladder is a design decision
 * about which scales a reader can hold in their head and not an arithmetic
 * one. `The ranked list.dc.html` prints the rung, which is AC 2: a length is a
 * claim about a quantity, so the quantity is on screen.
 */
export const SECTOR_LADDER_STEPS = [1, 2, 5, 10] as const;

/** One rung of {@link SECTOR_LADDER_STEPS}. */
export type SectorLadderStep = (typeof SECTOR_LADDER_STEPS)[number];

/**
 * The largest rung. A move past it saturates — see {@link fitSectorLadder}.
 *
 * Indexed rather than taken off the end of the array, because a tuple index is
 * the rung's own type (`10`) while `at(-1)` is `SectorLadderStep | undefined`
 * and would need an assertion to become the first.
 */
const LARGEST = SECTOR_LADDER_STEPS[3];

/** Whether a number is one of the four rungs — the wire reader's question. */
export function isSectorLadderStep(value: unknown): value is SectorLadderStep {
  return (SECTOR_LADDER_STEPS as readonly unknown[]).includes(value);
}

/**
 * The rung a set of figures **fits into**, ignoring any previous one.
 *
 * Measured on the **displayed** figure rather than the raw one, so the printed
 * ladder cannot contradict the printed numbers: a raw +1.004% prints `+1.00%`,
 * and stepping out to ±2 for a bar that reads exactly the rung below it is the
 * ladder disagreeing with the row beside it.
 *
 * **A figure with no move contributes nothing**, which is the absent-key rule
 * again: a sector we have heard nothing about has not moved 0%, so it must not
 * hold the ladder down at ±1 — and equally must not be counted as anything
 * else. Eleven keyless figures therefore fit the smallest rung, which is the
 * honest answer for a list with nothing to draw.
 *
 * **A move past ±10% saturates at ±10%.** The ladder is the four rungs the
 * owner named; a sector benchmark moving more than 10% in a session is a
 * market event, and the alternative — inventing a fifth rung on the day it
 * happens — is a scale nobody has reviewed appearing on the one day the screen
 * matters most. The bar is clamped by the drawing and the printed rung stays
 * true to the ladder.
 */
export function fitSectorLadder(
  figures: readonly WireOverviewFigure[],
): SectorLadderStep {
  let widest = 0;
  for (const figure of figures) {
    const key = sectorRankingKey(figure);
    if (key === undefined) continue;
    widest = Math.max(widest, Math.abs(displayedPercent(key)));
  }

  return SECTOR_LADDER_STEPS.find((step) => widest <= step) ?? LARGEST;
}

/**
 * The rung in force, and the session it is in force for.
 *
 * The session is part of the value rather than held beside it, because the two
 * are one fact: *this rung, for this session*. A holder that kept them apart
 * could reset one and not the other.
 */
export interface SectorLadder {
  /** The session this rung belongs to — the bell that last rang. */
  readonly session: MarketDate;
  readonly step: SectorLadderStep;
}

/**
 * Step the ladder, or start a new one.
 *
 * Two frames in the same session may produce different rungs and the later one
 * is **never smaller**; the first frame of a new session starts again at the
 * smallest rung that fits. That asymmetry is the whole decision: within a
 * session a reader's mental scale is only ever invalidated outward, once, and
 * overnight it is invalidated deliberately.
 */
export function ratchetSectorLadder(
  previous: SectorLadder | undefined,
  session: MarketDate,
  figures: readonly WireOverviewFigure[],
): SectorLadder {
  const fits = fitSectorLadder(figures);

  // A new session — or the first frame this process has ever built — starts
  // again. Nothing about the previous rung survives the bell.
  if (previous?.session !== session) {
    return { session, step: fits };
  }

  return {
    session,
    step: fits > previous.step ? fits : previous.step,
  };
}
