import type { AnomalyBand, Ticker } from "@marketpulse/shared";

import { AnomalyBadge } from "../AnomalyBadge/AnomalyBadge.js";
import { PriceChange } from "../PriceChange/PriceChange.js";
import { Popover } from "../Popover/Popover.js";
import { cx } from "../../cx.js";
import styles from "./SecurityRow.module.css";

// The representative component for Story 1.4 — one row of the security table
// Epic 4 builds an overview out of.
//
// It is a row rather than a button because a button demonstrates nothing that
// is hard in this product. This exercises, in one component: the tabular
// numeric column and the right alignment that makes decimal points line up;
// the price-direction tokens and the glyph that carries direction without
// them; the anomaly ramp and the written band name inside the fill; a feed
// state that is not an error; and a Base UI primitive behind our own wrapper,
// reachable by keyboard, carrying the explanation the score is required to
// have — in a popover rather than a tooltip, for the reason recorded in
// `Popover.tsx`.
//
// It renders a `<tr>` and nothing around it. The table itself — its header, its
// column widths, its virtualisation — is Epic 4's, and a component that owned
// the table would be a component Epic 4 has to take apart. `SecurityRow.module.css`
// carries a `.table` class for the container so that the row's alignment is
// still reproducible in isolation; the stories use it, and Epic 4 may not.
//
// What Story 1.5 should copy from this file: one component per file, in a
// directory named after it, with its stylesheet and its stories beside it;
// props typed as a `readonly` interface exported next to the component;
// variants expressed as a `Record<Union, string | undefined>` of class names
// composed through `cx()` rather than as string concatenation; domain
// vocabulary imported from `@marketpulse/shared` and colour never imported from
// anywhere, because it arrives through the tokens.

// ## The feed column came off on 2026-09-19 (Task 3.3.5)
//
// This row carried a `FeedIndicator` from Story 1.4, when the component was a
// render check with an invented value and `FeedStatus` meant nothing yet. It
// means something now, and **§11.2 forbids exactly this**: the gap between one
// security's consecutive bars has a p50 of one minute and a **maximum of 187**,
// so no threshold separates a quiet security from a broken one. `STALE` beside
// a price is a judgement this product cannot support, and a per-security word
// would have been the epic's first real vocabulary rendering a claim the same
// epic had already decided it could not make.
//
// **What a security gets instead is the AGE of its own observation** — Story
// 3.6, across 518 of them at once. The colour-pairing argument the column was
// here to demonstrate is unaffected: the price change and the anomaly band each
// still pair their colour with a second channel, which is what the row exists
// to prove.

export interface SecurityRowProps {
  readonly ticker: Ticker;

  /** The last trade price, already formatted. See PriceChange on why. */
  readonly last: string;

  /** The signed change, already formatted — `+12.40`, `−34.02`, `0.00`. */
  readonly change: string;

  readonly direction: "positive" | "negative" | "unchanged";

  readonly band: AnomalyBand;

  /**
   * Why the security is in that band. Required, not optional: PRODUCT_SPEC.md
   * §11 says every score carries its explanation, and an optional explanation
   * is one that will be omitted.
   */
  readonly bandExplanation: string;

  /**
   * The state of the feed this row's figures came from — per row, because §36's
   * degradation is local. One security's feed going stale must not take the
   * table with it.
   */
}

export function SecurityRow({
  ticker,
  last,
  change,
  direction,
  band,
  bandExplanation,
}: SecurityRowProps) {
  return (
    <tr className={styles.row}>
      <th scope="row" className={styles.ticker}>
        {ticker}
      </th>
      <td className={cx(styles.cell, styles.numeric)}>{last}</td>
      <td className={cx(styles.cell, styles.numeric)}>
        <PriceChange change={change} direction={direction} />
      </td>
      <td className={styles.cell}>
        <Popover title="Why this band" content={bandExplanation}>
          <AnomalyBadge band={band} />
        </Popover>
      </td>
    </tr>
  );
}
