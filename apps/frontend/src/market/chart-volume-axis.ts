import type { Bar } from "@marketpulse/shared";

import { formatVolume } from "./volume-format.js";

// Volume's value domain, and the one label its gutter writes (Task 2.13.3).
//
// The sibling of `chart-value-axis.ts`, and deliberately **not** a reuse of it:
// `priceDomain`'s `PRICE_DOMAIN_PAD` and `FLAT_DOMAIN_FRACTION` exist for a line,
// which is a different problem. A line has no true zero and needs room above and
// below it; a column grows from a baseline, and a bar chart whose baseline is not
// zero misstates every ratio a reader takes off it.
//
// ## Zero to the window's peak, unpadded — and the proportion depends on it
//
// `VOLUME-AND-WINDOW.md` §9.3 decided both ends, and the reason for the top is
// not aesthetic. §9.2 sized the plot at **88 px against the price plot's 280**
// against a specific reading: `PRODUCT_SPEC.md` §11's volume anomaly and §38's
// demo line are both a *multiple* — "Volume 3.8× normal" — so a window whose peak
// is 3.8× its typical bar has to draw that typical bar at one 3.8th of the
// height, which is 23 px and legible. **That arithmetic is only true if the top of
// the domain is the peak.** A padded top silently changes the ratio the plot was
// sized for, and it moves Epic 5's baseline rule off the place §13.2 says it
// lands.
//
// So: no pad, and the peak touches the ceiling. A gridline at the top would read
// as the closed frame this language refuses, and volume draws no gridlines at all
// (§9.4) — it is read comparatively, this bar against its neighbours, rather than
// off a scale.

/**
 * The top of the domain when nothing traded — **one share**.
 *
 * A domain of `[0, 0]` is not a scale: `linearScale` refuses a zero-height domain
 * on purpose, because it divides by zero and produces `NaN` coordinates that SVG
 * draws as nothing at all. So the all-zero window needs an answer, and this is
 * it — a ceiling of one share, against which every bar in the window is zero
 * pixels tall.
 *
 * **That is the honest picture rather than a fallback**: the plot draws its
 * baseline, its seams and its labels, and no columns, because no shares changed
 * hands. It is reachable — a thin security's daily bar, or a window of one — and
 * the alternative, suppressing the plot, would make "nothing traded" look like
 * "we hold nothing", which is a different answer this chart already has a
 * treatment for.
 */
export const FLAT_VOLUME_TOP = 1;

/**
 * The largest volume in the window, or zero when there is nothing in it.
 *
 * Separate from {@link volumeDomain} because it is a separate fact and the two
 * are read by different things: the **scale** needs a usable ceiling, and the
 * **label** needs the figure that was actually observed. On an all-zero window
 * they differ — the scale tops out at one share and the label says `0` — and that
 * is the pair being right rather than a disagreement.
 */
export function volumePeak(bars: readonly Bar[]): number {
  let peak = 0;
  for (const bar of bars) if (bar.volume > peak) peak = bar.volume;
  return peak;
}

/**
 * The bar that traded the peak, or `null` where there are none.
 *
 * **One derivation, two readers** (Task 2.13.5). The volume strip's resting
 * state states the window's peak *and when it happened*, and
 * `chart-alternative.ts`'s `peakClause` states the same pair for a listener —
 * so before this existed the fact was found twice, by two `find`s over the same
 * array, in two files. Two sites deriving one thing is how a strip and a
 * sentence come to disagree about which minute was busiest, and neither is
 * obviously wrong when they do.
 *
 * **The first bar at the peak wins**, which is a decision rather than an
 * accident of `find`: a tie is two minutes that traded exactly the same number
 * of shares, and the earlier one is the one a reader looking for *when the
 * window got busy* is asking about.
 *
 * Returns the bar rather than its instant, because its two callers want
 * different things from it — one spells an instant for the eye and the other
 * for the ear — and a function returning a formatted string would have to pick.
 */
export function volumePeakBar(bars: readonly Bar[]): Bar | null {
  let peak: Bar | null = null;
  for (const bar of bars)
    if (peak === null || bar.volume > peak.volume) peak = bar;
  return peak;
}

/**
 * Zero to the window's peak — the domain, unpadded.
 *
 * Takes the bars rather than a peak so that no caller can hand it a top it
 * computed some other way. The floor is a literal zero and not the smallest
 * volume in the window: a column's height is only readable as a magnitude if its
 * baseline is the origin.
 */
export function volumeDomain(bars: readonly Bar[]): readonly [number, number] {
  return [0, Math.max(volumePeak(bars), FLAT_VOLUME_TOP)];
}

/**
 * What volume's value gutter writes, which is **one label and not a scale**.
 *
 * §9.4: the window's peak, abbreviated, and nothing else — volume keeps price's
 * 56 px gutter for a single label it does not need, because two charts that
 * disagree about where their value scale starts cannot be stacked, and alignment
 * outranks tightness. A volume domain's zero *is* the axis rule and needs no
 * label beside it.
 *
 * `null` when there are no bars: a peak of nothing is not zero shares traded, it
 * is no answer, and the states that have no bars already say so in words.
 */
export function volumePeakLabel(bars: readonly Bar[]): string | null {
  if (bars.length === 0) return null;
  return formatVolume(volumePeak(bars));
}
