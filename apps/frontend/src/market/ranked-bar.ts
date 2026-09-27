import type { SectorLadderStep } from "@marketpulse/shared";

// The signed bar's geometry and its printed ladder (Task 4.3.5).
//
// `The ranked list.dc.html` §03. Two functions, both pure, and the reason they
// are here rather than inside the component is that **every number a bar draws
// is a claim about a quantity** — a length that is 3% too long is a lie no
// screenshot can catch and no jsdom test can see, so the arithmetic is
// asserted directly.
//
// ## Neither of these chooses a scale
//
// The rung arrives on the frame, ratcheted server-side with a session lifetime
// (`sector-ladder.ts`, and the owner's 2026-09-27 decision). Nothing here takes
// a maximum over the figures: that is the frame-max normalisation §03 rejected,
// where a ±0.1% day and a ±5% day draw byte-identical pictures and a leader
// ticking from +1.84 to +1.86 redraws all eleven bars up to sixteen times a
// minute for a reason no reader can see.

/**
 * How far a bar reaches from the central anchor, as a **fraction of the bar
 * track's half-width** — `0` to `1`, sign dropped.
 *
 * ## It saturates, and the row's figure does not
 *
 * A sector past the largest rung draws a bar clipped at the top rung while the
 * row's own figure stays exact (the owner's decision, Task 4.3.4). So the
 * printed ladder and a row's figure can disagree in magnitude on an extreme
 * day, and **nothing in the UI says so**: the figure is the claim and the bar
 * is the comparison. A bar that ran past the printed ±10% would be a length
 * against no scale at all.
 *
 * Clamping here rather than in the stylesheet is deliberate. `width: 120%`
 * inside an absolutely-positioned half-track overflows the region and paints
 * over the figure column, which is a broken page rather than a saturated bar —
 * and CSS has no way to know what the rung is.
 */
export function barFraction(percent: number, step: SectorLadderStep): number {
  const reach = Math.abs(percent) / step;
  return reach > 1 ? 1 : reach;
}

/** One printed mark on the ladder. */
export interface LadderTick {
  /** Where it sits across the bar track, `0` to `100`. */
  readonly at: number;
  /** What is printed, or `undefined` for an unlabelled gridline. */
  readonly label: string | undefined;
}

/** The typographic minus, which is the character every figure in this product uses. */
const MINUS = "−";

/**
 * The ladder for a rung — five positions, of which three or five are labelled.
 *
 * ## Why the midpoints are labelled on two rungs and not the other two
 *
 * **A printed `2.5` reads as precision the picture does not have.** The mid
 * gridline sits at half the rung, which is a whole number on ±2 and ±10 and a
 * half on ±1 and ±5 — so the label appears exactly where it can be written
 * without a decimal point, and the gridline is drawn either way. The gridlines
 * are the reading; the labels were the annotation, which is also why the
 * stylesheet drops the midpoints at the one width where the bar is narrowest
 * and keeps the lines.
 *
 * The outer marks carry the unit and the inner ones do not — `−2% −1 0 +1 +2%`
 * — because the unit is stated where the eye lands and repeating it four times
 * is a row of percent signs rather than a scale.
 */
export function ladderTicks(step: SectorLadderStep): readonly LadderTick[] {
  const mid = step / 2;
  const labelled = Number.isInteger(mid);

  return [
    { at: 0, label: `${MINUS}${String(step)}%` },
    { at: 25, label: labelled ? `${MINUS}${String(mid)}` : undefined },
    { at: 50, label: "0" },
    { at: 75, label: labelled ? `+${String(mid)}` : undefined },
    { at: 100, label: `+${String(step)}%` },
  ];
}

/**
 * The ladder's own spoken sentence — what the bars are drawn against, in one
 * clause the region's footer can carry.
 *
 * It exists so that the footer and the ladder cannot describe different scales:
 * both read the same rung, and this is the only place the rung becomes a
 * sentence. `ADR 0029`'s scale clause renders only when the bar does, which is
 * the caller's decision and is why this returns a clause rather than a
 * paragraph.
 */
export function ladderClause(step: SectorLadderStep): string {
  return `bars to ±${String(step)}%`;
}
