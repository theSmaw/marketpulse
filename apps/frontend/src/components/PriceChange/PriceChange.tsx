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
// The three directions are not domain vocabulary and are deliberately not in
// `@marketpulse/shared`, unlike `AnomalyBand` and `FeedStatus`. A band name is
// a decision the backend makes and reports; the direction of a move is
// arithmetic on a number both sides already have.
//
// **That argument is why they left this file on 2026-09-11.** `PriceDirection`
// and `PRICE_DIRECTIONS` now live in `market/price-format.ts` beside
// `directionOf`, which produces them: arithmetic on a market number is market
// vocabulary, and a function in the market module returning a type owned by a
// component was the coupling pointing the wrong way. What stays here is what
// this component alone decides — the colour, the glyph and the spoken word.

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
      <span aria-hidden="true" className={styles.glyph}>
        {DIRECTION_GLYPH[direction]}
      </span>
      <span className={styles.visuallyHidden}>
        {DIRECTION_LABEL[direction]}{" "}
      </span>
      {change}
    </span>
  );
}
