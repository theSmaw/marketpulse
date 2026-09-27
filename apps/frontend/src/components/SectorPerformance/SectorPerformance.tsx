import { memo } from "react";

import { cx } from "../../cx.js";
import {
  RESERVED_SECTORS,
  SECTOR_CLAIM,
  ladderClause,
  rowsInPinnedOrder,
  type SectorPerformance as SectorPerformanceView,
} from "../../market/index.js";
import { RankedList } from "../RankedList/RankedList.js";
import styles from "./SectorPerformance.module.css";

// Eleven sectors, ranked, with the region's footer under them (Task 4.3.5).
//
// **The thin half.** `RankedList` draws the rows, the bar and the ladder;
// `sector-performance.ts` reads the frame; what is left here is the footer and
// the decision to compose the two. It is its own component rather than five
// lines in the route for one reason: the region has states worth reviewing side
// by side, and a stateful component dropped into `src/routes/` escapes the
// stories rule silently.
//
// ## Two subjects in one box, produced from one value
//
// `docs/GAPS.md` entry 13's sibling wants **two speakers to agree**, and this
// region has two: the ranking and the footer. States where they can contradict
// each other are exactly the ones where some rows have no move — eight ranked
// rows under a line claiming something about all eleven is two true halves and
// one contradiction, which is the shape that shipped on the market-feed cell for
// four days.
//
// The repair is the one that worked there: **the footer says nothing the rows
// disagree with**. It states what a row *is* (a benchmark ETF) and what the bar
// is drawn against (the rung), and both are true of every row including the ones
// with nothing to draw. The basis, the instant and the session are the screen's
// one source note's, and per-row absences are the row's own words. Task 4.3.7
// owns the honest states and the guard.

export interface SectorPerformanceProps {
  /** The rows and the rung, from `sectorPerformance`. */
  readonly view: SectorPerformanceView;
  /**
   * The order a reader is holding, from `useOrderHold` — absent while nothing
   * is held.
   *
   * **The hold is applied here rather than in `RankedList`**, and that is what
   * keeps it one code path: the list draws the order it is handed, so a held
   * list is a props order that did not change, the FLIP does nothing, and the
   * release is one ordinary re-order carrying every pending move. `RankedList`
   * knows nothing about holds and `rowsInPinnedOrder` reads no figure, so *two
   * figures equal at displayed precision never swap* stays a property of the one
   * comparator in `packages/shared`.
   */
  readonly pinned?: readonly string[] | undefined;
}

export const SectorPerformance = memo(function SectorPerformance({
  view,
  pinned,
}: SectorPerformanceProps) {
  /*
   * **Whether any row drew a bar, which is what licenses the scale clause**
   * (ADR 0029, Task 4.3.7).
   *
   * `bars to ±1%` under eleven rows that drew no bar describes a scale for a
   * quantity nothing on screen shows — the fully-formed record about zero rows,
   * and on CI it is the permanent state. `RankedList` takes the same decision
   * about the printed ladder from the same fact, and the two agree because they
   * are the same predicate read off the same rows rather than two thresholds.
   */
  const anyBar = view.rows.some((row) => row.move !== undefined);

  return (
    <>
      <RankedList
        rows={rowsInPinnedOrder(view.rows, pinned)}
        bar={{ kind: "signed", scale: view.step }}
        name="Sectors ranked by today’s move"
      />
      {/*
       * **The footer, in two clauses and one line box.**
       *
       * Sentence case at the micro size rather than the uppercase micro label,
       * because it is prose rather than a stamp — `MarketProxyStrip`'s
       * `.qualifier` idiom, one region above, and the two properties are
       * **spelled rather than composed** for the reason that file records: a
       * `text-transform: none` under `composes: microLabel` is not an override,
       * and the first word ever put into one rendered `2026-09-11 · CLOSING
       * PRICES` on this page.
       *
       * The scale clause is its own element so the stylesheet can drop it where
       * it drops the bar — ADR 0029's rule that a clause renders only when its
       * own data is present, and below 37rem there is no bar for it to describe.
       */}
      <p className={cx(styles.claim)}>
        {SECTOR_CLAIM}{" "}
        {/*
         * **Hidden rather than removed where there is no bar to describe.** The
         * clause keeps its inline room, so the sentence wraps the same way in
         * every state and the region's height cannot depend on whether the feed
         * has spoken — which is the whole point of `.claim`'s two-line reserve
         * one rule below, taken here for the same reason.
         */}
        <span
          className={cx(
            styles.scale,
            anyBar ? undefined : styles.scaleReserved,
          )}
          aria-hidden={anyBar ? undefined : true}
        >
          · {ladderClause(view.step)}
        </span>
      </p>
    </>
  );
});

/**
 * **The paint before the first frame: the region's own geometry, held and
 * invisible** (Task 4.3.7, `The ranked list.dc.html` §05 state 6).
 *
 * ## Why it is the real component rather than a measured box
 *
 * Because the height it has to hold is eleven rows, a ladder, a reserved group
 * heading and a two-line claim, and **every one of those numbers already exists
 * exactly once**. A `min-height` here would be a second home for all four, wrong
 * the first time any of them changes and wrong silently — nothing below
 * `pnpm e2e` computes a layout. So the reservation *is* `SectorPerformance`,
 * drawn from `RESERVED_SECTORS`, with the whole subtree taken out of both the
 * picture and the accessibility tree.
 *
 * `visibility: hidden` plus `aria-hidden`, never `display: none` — which is the
 * entire point — and never a skeleton row, a grey bar or an em dash, because a
 * fully-formed placeholder is what invites a reader to read a value that is not
 * there.
 */
export const SectorPerformanceReservation = memo(
  function SectorPerformanceReservation() {
    return (
      <div className={cx(styles.reserved)} aria-hidden="true">
        <SectorPerformance view={RESERVED_SECTORS} />
      </div>
    );
  },
);

/**
 * **The region head's right-hand slot: the count, or `Order held`** — one slot,
 * two strings, and the wider of them is reserved so neither moves the other.
 *
 * ## Why they share a slot
 *
 * Because they are one idea: *what this list is doing*. Opening `Region`'s head
 * twice — once for a count in Task 4.3.5 and once for a badge here — would have
 * been two changes to a shared component for that one idea, which is why 4.3.5
 * deliberately built neither. `The ranked list.dc.html` §05 state 7 draws it.
 *
 * ## The count is the RANKED rows, and it says nothing in the two states where
 * it would be noise
 *
 * `11 of 11 ranked` over a complete list is a fact nobody needs and a permanent
 * one; `0 of 11 ranked` over eleven rows that all say `None stored` is two true
 * halves and one contradiction — the shape `docs/GAPS.md` entry 13's sibling is
 * about — and in that state the trailing group's own heading already says
 * `Not ranked` over every row there is. So the slot speaks **only in the mixed
 * state**, which is the only state in which the count is news. ADR 0029's rule as
 * a clause: a claim about data requires data, and a surface that owns nothing
 * defers.
 *
 * **`N of 11 ranked` rather than a bare `N`** because the denominator is what
 * makes it a claim about the region rather than about the list — Story 4.3's own
 * *a figure over 24 of 30 names is a different claim from one over 30*, with the
 * total read off the rows rather than typed. The reserve is the stylesheet's, so
 * an empty slot is the same width as a full one and the badge still moves nothing
 * when it appears.
 *
 * ## The badge's ink, and the value that was refused
 *
 * `The ranked list.dc.html` drew this in `#9a6400`, which is in no stylesheet in
 * this repository, and **no amber this product has could carry it**:
 * `--palette-amber` measures 1.73:1 on the page ground and 1.92:1 at 12 px, and
 * `--palette-amber-deep` is not a text ink. So the intent is adopted and the
 * value is not — ADR 0026's standing exception, for the fifth time — and what
 * carries it instead is the settled rule: standing out, like receding, is a job
 * for **weight and hierarchy**, never for ink outside the contrast floor.
 *
 * ## `stateMark`'s third consumer, and its first reader-caused one
 *
 * *A state PERSISTS*: the disc is still, and the behaviour **is** the absence of
 * animation. The first two consumers were the product saying something about the
 * data; this one says something about **what the reader is doing**, which is a
 * widening of the limb rather than a new one — a fourth consumer should be
 * checked against both readings.
 */
export const SectorPerformanceMeta = memo(function SectorPerformanceMeta({
  view,
  held,
}: {
  readonly view: SectorPerformanceView;
  /** From `useOrderHold`. The same value that pins the order the list draws. */
  readonly held: boolean;
}) {
  const ranked = view.rows.filter((row) => row.rank !== undefined).length;
  const total = view.rows.length;

  return (
    <span className={cx(styles.slot)}>
      {held ? (
        <span className={cx(styles.held)}>
          <span className={cx(styles.disc)} aria-hidden="true" />
          {ORDER_HELD}
        </span>
      ) : ranked === 0 || ranked === total ? undefined : (
        <span className={cx(styles.count)}>
          {`${String(ranked)} of ${String(total)} ranked`}
        </span>
      )}
    </span>
  );
});

/**
 * What the head says while the order is held.
 *
 * **Sentence case in the DOM, uppercase on screen** — `microLabel` does the
 * second, which is `Region`'s `awaiting` tag one slot over and the reason it is
 * an idiom rather than a choice: a string stored uppercase is a string some
 * screen readers spell out a letter at a time.
 *
 * **The words are the state and not an instruction**, which is the difference
 * between this and a tooltip: the region is not asking to be released, it is
 * saying what is true — the figures and the ranks are current and the order is
 * the one the reader arrived to. Present tense, no verb for the reader, and no
 * mention of the pointer that caused it, because focus causes it too.
 */
const ORDER_HELD = "Order held";
