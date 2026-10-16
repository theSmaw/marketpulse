import { cx } from "../../cx.js";
import type { PriceDirection } from "../../market/index.js";
import styles from "./PriceChange.module.css";

// A signed price change, rendered so that the direction survives the colour
// being removed.
//
// Task 1.4.4 measured what happens when it does not: under `grayscale(1)` the
// positive green and the negative red differ by **1.05:1**, which is no
// difference at all. The hue is the entire distinction between them, so the
// colour cannot be the signal. What carries the direction here is the arrow
// glyph and the sign on the figure; the colour is the redundancy.
//
// **The figure to cite is 1.04:1, and 1.05:1 above is a correct measurement of
// a palette this product no longer ships** (noted 2026-10-13 by Task 5.1.1).
// Task 1.4.4's pair was `#427400` against the pre-refresh red; the 2026 refresh
// re-picked both, and `VISUAL-LANGUAGE.md` re-took the measurement against the
// shipped `#0f7b50` / `#c5221f` on 2026-09-11 at **1.04:1**. The argument is
// unchanged and is the reason the correction is a note rather than a rewrite —
// 1.04 and 1.05 are both *no difference at all*, and nothing on screen was ever
// sized against either. What was wrong is that this header presented a
// superseded figure as the current one.
//
// Note the two figures are not two readings of one number: `market.css` records
// the same ink pair at **1.096:1 by luminance ratio**, which is a different
// method rather than a disagreement (`CHARTING.md` §7 item 5). Only the
// greyscale figure moved, and only because the palette did.
//
// The three directions are not domain vocabulary and are deliberately not in
// `@marketpulse/shared`, unlike `AnomalyBand` and `FeedStatus`. A band name is
// a decision the backend makes and reports; the direction of a move is
// arithmetic on a number both sides already have.
//
// **That argument is why they left this file on 2026-09-11.** `PriceDirection`
// and `PRICE_DIRECTIONS` went to `market/price-format.ts` beside `directionOf`,
// which produces them: arithmetic on a market number is market vocabulary, and
// a function in the market module returning a type owned by a component was the
// coupling pointing the wrong way. What stays here is what this component alone
// decides — the colour, the glyph and the spoken word.
//
// **Amended 2026-10-07 (Task 4.4.2): the first paragraph is now false and is
// left standing because it is the argument that expired.** All three are in
// `@marketpulse/shared` — `price-direction.ts` — and *both sides already have
// the number* turned out to be the condition under which a second
// implementation appears rather than a reason against sharing one: Story 4.4
// counts breadth over 518 figures server-side, where the browser's copy was
// unreachable. `market/index.ts` still publishes the names, so the import below
// is unchanged, and the sentence that still holds is the last one — **the
// colour, the glyph and the spoken word are this component's and are not in
// the shared module.**

// The colour, and the glyph carrying the same information without it. Neither
// is optional, and the pairing lives here rather than at each call site so that
// "colour is never the sole encoding" has a component behind it instead of a
// convention every author has to remember.
const DIRECTION_CLASS: Readonly<Record<PriceDirection, string | undefined>> = {
  positive: styles.positive,
  negative: styles.negative,
  unchanged: styles.unchanged,
};

const DIRECTION_GLYPH: Readonly<Record<PriceDirection, string>> = {
  positive: "▲",
  negative: "▼",
  unchanged: "—",
};

// What a screen reader is given instead of the glyph, which is `aria-hidden`.
// "▲ +12.40" read aloud is a black up-pointing triangle followed by a number.
const DIRECTION_LABEL: Readonly<Record<PriceDirection, string>> = {
  positive: "up",
  negative: "down",
  unchanged: "unchanged",
};

export interface PriceChangeProps {
  /**
   * The already-formatted figure, sign included — `+12.40`, `−34.02`, `0.00`.
   * A string rather than a number on purpose: formatting a price is a locale
   * and precision decision that belongs to the data layer, and Epic 2 is where
   * it gets made. A component that formats is a component that will format
   * differently from the table it sits in.
   */
  readonly change: string;

  /**
   * Derived from the sign by the caller. It is a prop rather than something
   * parsed out of `change` because a formatted string is not a reliable place
   * to recover arithmetic from.
   */
  readonly direction: PriceDirection;
}

export function PriceChange({ change, direction }: PriceChangeProps) {
  return (
    <span className={cx(styles.change, DIRECTION_CLASS[direction])}>
      <DirectionGlyph direction={direction} />
      {change}
    </span>
  );
}

/**
 * **The direction on its own: the tinted glyph, and the word a listener gets
 * instead of it** (Task 5.4.3).
 *
 * ## Why it is here, and why it is exported
 *
 * This component's own header says what it owns — *the colour, the glyph and
 * the spoken word* — and that list is three facts rather than one component.
 * `Unusual activity` draws a direction beside a figure that is **not** a price
 * change: a percentile ranks `Math.abs(percent)`, so the row needs the arrow
 * and must not have the tint, because a tinted ordinal is decoration standing
 * where meaning normally is (`AbnormalMove.module.css`' argument) and because
 * a percentile has no direction of its own to encode.
 *
 * Writing the glyph there instead would be a second home for `▲` / `▼` / `—`
 * and for `up` / `down` / `unchanged` — and the pairing of a hue with a shape
 * is the one thing in this product that may not have two copies, because
 * *colour is never the sole encoding of anything* is a rule nobody can see
 * being broken from a screenshot of one state.
 *
 * So the glyph is the component and {@link PriceChange} is now its first
 * caller. **The tint is on the glyph itself** here, where `PriceChange` puts
 * it on the wrapper and inherits it down: the two renderings are identical
 * when the figure is a change, and different when the caller wants the figure
 * untinted, which is exactly the distinction this split exists for.
 */
export function DirectionGlyph({
  direction,
}: {
  readonly direction: PriceDirection;
}) {
  return (
    <>
      <span
        aria-hidden="true"
        className={cx(styles.glyph, DIRECTION_CLASS[direction])}
      >
        {DIRECTION_GLYPH[direction]}
      </span>
      <span className={styles.visuallyHidden}>
        {DIRECTION_LABEL[direction]}{" "}
      </span>
    </>
  );
}
