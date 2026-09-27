/**
 * **The order eleven sector benchmarks are reported in, and the one place a
 * figure's ranking key is read** (Task 4.3.4).
 *
 * ## Why it is here and not in the browser that draws the list
 *
 * Story 4.5 ranks a top-N over 518 securities **server-side**, because a
 * top-N computed in a browser means shipping the 518-figure input to every
 * tab — which is `STORY.md`'s own table (~56 KB a frame, ~875 KiB/min per
 * browser, decoded on all five routes). So the ranking rule cannot be a
 * browser module: adopting one at eleven would set exactly the precedent
 * Story 4.3 is told not to set, and the second implementation would be the
 * one over 518 rows.
 *
 * ADR 0038 decision 2 is the precedent for what happens when a shared
 * computation starts in one package: `changeFromClose` began in
 * `apps/frontend/src/components/UniverseTable/` and its third consumer was a
 * different **process**. This module starts on the far side of that move.
 *
 * ## What the rule actually is, in three sentences
 *
 * **Descending by the figure's own move.** **A figure with no move is not
 * ranked among the ranked** — it sorts after every figure that has one, and
 * never at a position `?? 0` would give it. And **two figures that read the
 * same on screen never swap**, which is decided on the displayed precision
 * rather than on a threshold somebody chose.
 *
 * ## The absent key, which is ADR 0029's false impression as a RANK POSITION
 *
 * This is the part worth being careful about, and it is a new shape of an old
 * defect. A sector we have heard nothing about and hold no close for has **no
 * ranking key at all**. `key ?? 0` places it among the genuinely flat ones —
 * mid-table, between a sector that moved +0.01% and one that moved −0.01% —
 * which is a **claim that it did not move**, expressed as a position rather
 * than as a number. ADR 0029's rule is that a claim about data requires data;
 * a rank is a claim.
 *
 * So the absence is handled by an explicit rule and **never by a default**:
 * every keyless figure sorts **after** every keyed one, and keyless figures
 * hold the order they arrived in — which is `SECTORS`' declared order at the
 * producer. A reader then sees the sectors we can say something about, ranked,
 * followed by the ones we cannot, and the renderer says so per row rather than
 * drawing them as flat.
 */

import { PERCENT_DISPLAY_DECIMALS } from "./live-change.js";
import { SECTOR_ETFS, SECTORS } from "./security.js";

import type { Sector } from "./security.js";
import type { WireOverviewFigure } from "./market-stream-protocol.js";

/**
 * Ticker → sector, **derived from {@link SECTOR_ETFS} rather than written
 * out**.
 *
 * `SECTOR_ETFS` is `Record<Sector, Ticker>` and the frame carries a `symbol`,
 * so somebody needs the inverse. **A hand-written inverse is where a
 * permutation comes from**: one wrong key puts XLV's figure on the Financials
 * row, and *every number on the screen is still right*. That defect satisfies
 * every arithmetic guard in this repository, passes every state grid, and is
 * invisible in greyscale — the only thing on the row that can contradict it is
 * the printed ticker, which is why `STORY.md` put one there.
 *
 * Derived **once**, at module load, by mapping over `SECTORS`: a twelfth
 * sector arrives here with no edit, and it cannot be added to `SECTOR_ETFS`
 * without naming its fund because that record is total over the union.
 *
 * Keyed by `string` rather than by `Ticker` deliberately — the wire's `symbol`
 * is a bare string, and a brand cast at the call site is the sort of thing
 * that gets written once and copied.
 */
export const SECTOR_BY_ETF: ReadonlyMap<string, Sector> = new Map(
  SECTORS.map((sector) => [SECTOR_ETFS[sector] as string, sector] as const),
);

/** Which sector an ETF symbol is the benchmark for, or `undefined`. */
export function sectorOfEtf(symbol: string): Sector | undefined {
  return SECTOR_BY_ETF.get(symbol);
}

/**
 * A figure's move, **or `undefined` for a figure that has none** — the one
 * home for *which field this state's move lives in*.
 *
 * Two states carry a move and they are **different bases**, which is why they
 * are different field names on the wire: an `observed` figure's
 * `changePercent` is live-against-a-close (what a market screen means by
 * *today*), and a `stored` figure's `sessionChangePercent` is the
 * close-to-close move of a session that is over. Both are signed percentages
 * on the same scale, which is what makes ranking them against each other
 * honest; neither is *the other one*, which is what makes reading them through
 * one field name dishonest.
 *
 * **Non-finite is absent.** A `NaN` or an `Infinity` in a comparator is worse
 * than a missing key: `Array.prototype.sort` with a comparator returning `NaN`
 * has no defined result, so the whole order becomes implementation detail.
 * The serialiser drops a non-finite number at the wire (ADR 0031) and
 * `readFigure` refuses one at the other end, but this function is called
 * **in-process, before the encode**, so it is inside that gap and closes it
 * itself.
 */
export function sectorRankingKey(
  figure: WireOverviewFigure,
): number | undefined {
  if (figure.state === "observed") {
    return figure.changePercent !== undefined &&
      Number.isFinite(figure.changePercent)
      ? figure.changePercent
      : undefined;
  }

  if (figure.state === "stored") {
    return figure.sessionChangePercent !== undefined &&
      Number.isFinite(figure.sessionChangePercent)
      ? figure.sessionChangePercent
      : undefined;
  }

  return undefined;
}

/**
 * A percentage as the screen will show it.
 *
 * The rounding is what buys `STORY.md`'s checkable invariant — **the displayed
 * order never contradicts the displayed figures**. Eleven sector ETFs cluster
 * tightly, so two sectors 0.003% apart would trade places on every frame, up
 * to ~16 times a minute, both reading `+0.41%` throughout: a list visibly
 * re-ordering with nothing on it changing.
 *
 * Keyed on the **displayed** precision rather than on a chosen epsilon, which
 * is the difference between a rule a reader can verify by looking and a
 * threshold somebody picked. `PERCENT_DISPLAY_DECIMALS` is shared with
 * `formatChangePercent`, so the two cannot drift apart.
 */
export function displayedPercent(percent: number): number {
  return Number(percent.toFixed(PERCENT_DISPLAY_DECIMALS));
}

/**
 * The comparator itself — strongest first, keyless last, display-equal never
 * swapped.
 *
 * Returning `0` for a display-equal pair is what makes the tie-break the
 * **order it was given**, and `Array.prototype.sort` has been stable by
 * specification since ES2019. That is a stable sort against *the order on
 * screen* rather than against a declared one: the producer hands this the
 * eleven in `SECTORS`' order, so the first list breaks its ties on the
 * declared order, and every subsequent frame breaks them the same way — which
 * is why the order is deterministic without anybody holding the previous one.
 */
export function compareSectorFigures(
  a: WireOverviewFigure,
  b: WireOverviewFigure,
): number {
  const left = sectorRankingKey(a);
  const right = sectorRankingKey(b);

  // The absent-key rule, in three lines and with no default in sight. Two
  // keyless figures are equal to each other — they are not *equally flat*,
  // they are equally unrankable — so they keep the order they arrived in.
  if (left === undefined && right === undefined) return 0;
  if (left === undefined) return 1;
  if (right === undefined) return -1;

  const shown = displayedPercent(left);
  const other = displayedPercent(right);
  if (shown === other) return 0;

  return other - shown;
}

/**
 * The figures in rank order — a **new array**, because the producer's own
 * order is `SECTORS`' and is the tie-break.
 */
export function rankSectorFigures(
  figures: readonly WireOverviewFigure[],
): readonly WireOverviewFigure[] {
  return [...figures].sort(compareSectorFigures);
}
