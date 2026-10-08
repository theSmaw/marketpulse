import { memo } from "react";

import { cx } from "../../cx.js";
import styles from "./OrderHeldBadge.module.css";

/**
 * **`Order held`, in a region head — one badge, two regions, one home** (Task
 * 4.3.6, moved here by Task 4.5.7).
 *
 * ## Why it is a component rather than two copies of eight declarations
 *
 * It was `SectorPerformanceMeta`'s private `ORDER_HELD` string and
 * `SectorPerformance.module.css`' `.held` and `.disc` until 2026-10-08, which
 * was correct while one region held an order. `Movers` is the second, and a
 * second copy of a badge is the defect this repository has already paid for
 * once: `BarSeriesPanel` drew its own `Market feed · All US exchanges · IEX`
 * line a hundred pixels above the surface that owned it, and nothing mechanical
 * saw it for two years. ADR 0029's fourth rule — **one fact has one home** —
 * and the fact here is *what a held order looks like and what it is called*.
 *
 * It takes **no props**, deliberately. A `label` prop would be the second home
 * with a longer path: the words are the state rather than the region, and a
 * region that wanted different words would be a second speaker for one idea.
 *
 * ## The words are the state and not an instruction
 *
 * Which is the difference between this and a tooltip: the region is not asking
 * to be released, it is saying what is true — the figures and the ranks are
 * current and the order is the one the reader arrived to. Present tense, no
 * verb for the reader, and no mention of the pointer that caused it, because
 * focus causes it too.
 *
 * **Sentence case in the DOM, uppercase on screen** — `microLabel` does the
 * second, which is `Region`'s `awaiting` tag one slot over and the reason it is
 * an idiom rather than a choice: a string stored uppercase is a string some
 * screen readers spell out a letter at a time.
 */
export const OrderHeldBadge = memo(function OrderHeldBadge() {
  return (
    <span className={cx(styles.held)}>
      <span className={cx(styles.disc)} aria-hidden="true" />
      {ORDER_HELD}
    </span>
  );
});

/**
 * What the head says while the order is held.
 *
 * Exported for the two regions' **tests and stories** rather than for their
 * markup — the badge is the only thing entitled to render it, and a region that
 * imported the string to draw its own would be the copy this component exists
 * to prevent.
 */
export const ORDER_HELD = "Order held";
