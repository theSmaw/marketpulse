import { memo } from "react";

import type { SectorLadderStep } from "@marketpulse/shared";

import { cx } from "../../cx.js";
import {
  barFraction,
  ladderTicks,
  type PriceDirection,
  type SectorRow,
} from "../../market/index.js";
import { PriceChange } from "../PriceChange/PriceChange.js";
import styles from "./RankedList.module.css";

// A ranked list of rows with a signed figure — **drawn once, for two uses**
// (Task 4.3.5, `The ranked list.dc.html`).
//
// Sectors (Story 4.3) is this component with `bar: "signed"`; movers (Story 4.5)
// is the same component with `bar: "none"`. The reason to say so before the
// second one exists is that **the two lists are never on screen at the same
// size** — eleven rows in one column against a top-five each way in a split
// region — so a treatment written twice would diverge and nobody would ever see
// both versions together to notice. This product has paid for that drift once,
// when `BarSeriesPanel` grew a second copy of a provenance line a hundred pixels
// above the surface that owned it.
//
// ## Five tracks, four of them fixed, and the one that is not is the bar
//
// That is the load-bearing decision and it is a measurement rather than a
// taste. **If any track left of the bar sized to its content, the bar's left
// edge would depend on which sector happened to be in the row** — so a
// re-order would move all eleven bars' origins, and eleven bars whose origins
// move are eleven bars you cannot compare. Invisible to jsdom, to axe, to every
// unit test and to a screenshot of one state; `RankedList.module.css` states
// every track at every width for that reason.
//
// ## It composes rather than reinvents
//
// `PriceChange` owns the glyph, the sign, the colour and the spoken word, and
// **this list spells none of them** — a second speller is a second thing to
// keep in step with a palette that differs by 1.04:1 in greyscale. The arrival
// mark composes `arrivalMark` from the motion layer and this component supplies
// **position only**, which is that vocabulary's own rule.
//
// ## `<ol>` / `<li>`, and DOM order equal to visual order
//
// The honest markup for a ranking, and it hands a screen reader *"list, 11
// items, item 4"* for free — the rank channel at zero cost. A `<table>` would
// need a column header for a rank that is not data about a sector but a
// statement about the list, and would hand a listener a two-axis grid for
// something with one axis.
//
// The consequence is a hard rule Task 4.3.6 inherits: **never re-order with CSS
// `order` or `grid-row`.** That divorces the accessibility tree from the screen
// and hands a screen reader a *different ranking* — invisible to axe, to jsdom
// and to a screenshot. Rows are keyed by symbol so a row keeps its identity
// across a re-order.
//
// ## No live region, and the trigger is a condition
//
// `/` has **zero** `role="status"` regions today, so `FRONTEND-STATE.md` §7's
// region-count argument does not apply here and a different one carries it: the
// rank is a printed number inside a real `<ol>`, so a listener gets *"item 3 of
// 11"* from the platform rather than from an announcement. **Reversal
// trigger**, as a condition: *the first ranked surface on this screen whose
// order answers something the reader asked for.*
//
// ## And it says nothing about the connection
//
// `live` / `stale` / `disconnected` have one home and it is the status bar
// (Story 3.10); `one-home-for-the-feed-words` covers this route by name. Kill
// the feed and this list is byte-identical to whatever it was, because every
// figure on it was true when it was computed and the region's footer says what
// kind of figure it is.
//
// ## What is deliberately not here
//
//   - **The re-order treatment** (Task 4.3.6). This component draws the anatomy
//     that treatment moves — fixed origins, a printed ordinal, DOM order equal
//     to visual order — and holds no previous order.
//   - **`ORDER HELD`** (Task 4.3.6), which is a badge in the region's head
//     rather than anything in this list.
//   - **No fourth mark.** A mark saying *this row moved* is information a reader
//     can only use by remembering where it was; the movement carries both
//     positions and the ordinal is the persistent record.
//   - **No emphasis on the extreme rows.** First and last against a full-height
//     zero rule are already the two most legible positions. If *at a glance*
//     needs strengthening the lever is **weight**, never ink outside the
//     contrast floor.
//   - **No hover affordance and no pointer cursor.** Nothing here navigates
//     until Story 4.6, and a row that looks clickable and is not is worse than
//     one that plainly is not.

/** The em dash a row with no rank shows. `UniverseTable`'s own constant. */
const NOT_APPLICABLE = "—";

/**
 * The bar, and the scale it is drawn against — **one prop, so a scale for no
 * bar is not representable**.
 *
 * The drawing states them as two (`bar`, `scale`) with *required when `bar` is
 * `"signed"`, refused otherwise*; a discriminated union is that sentence as a
 * type rather than as a runtime check. `"none"` is **Story 4.5's slot**: a
 * top-N over 518 has a far wider dynamic range and its five members are near
 * the top of it by construction, so five bars all within a whisker of full
 * length carry almost no information — a real difference rather than a taste,
 * and it is already decided.
 *
 * The caller owns the rung and its outward-only ratchet, because the ratchet is
 * **session state** and a component that held it would reset it on every
 * remount.
 */
export type RankedListBar =
  | { readonly kind: "signed"; readonly scale: SectorLadderStep }
  | { readonly kind: "none"; readonly scale?: never };

export interface RankedListProps {
  /**
   * The rows, **in the order they are to be drawn**.
   *
   * The component never sorts. Ordering is where *two figures that read the
   * same on screen never swap* lives, and that rule belongs beside the data —
   * in `packages/shared`, server-side, for the reason Story 4.5 ranks
   * server-side.
   */
  readonly rows: readonly SectorRow[];
  readonly bar: RankedListBar;
  /**
   * The accessible name for the list itself.
   *
   * A `<ol>` inside a named region is already reachable, but the two uses put
   * **two** lists in one region (`Movers`' gainers and losers, each ranked from
   * 1), so the name is the caller's from the first commit rather than added
   * when the second list arrives.
   */
  readonly name: string;
}

export const RankedList = memo(function RankedList({
  rows,
  bar,
  name,
}: RankedListProps) {
  const signed = bar.kind === "signed";

  return (
    <div className={cx(styles.plot, signed ? undefined : styles.plain)}>
      {/*
       * **The zero rule and the ladder gridlines: one element for the whole
       * list**, behind the bars.
       *
       * A *full-height* hairline means one line down all eleven rows rather
       * than eleven 26 px segments with a 1 px break at every separator. It is
       * a grid item in the bar's own column, so it takes that column's
       * geometry from the same track list the rows do and **337.6 px is never
       * typed**.
       *
       * `position: sticky` would do nothing here and would fail silently:
       * `Panel` passes `scrollable` unconditionally, so the panel *is* the
       * nearest scrollport and a sticky element never offsets from its own —
       * measured, the viewport top came back −400 px. The ladder below is
       * therefore an ordinary block.
       */}
      {signed && (
        <div className={cx(styles.rules)} aria-hidden="true">
          <span className={cx(styles.gridline, styles.gridlineLow)} />
          <span className={cx(styles.gridline, styles.gridlineHigh)} />
          <span className={cx(styles.zero)} />
        </div>
      )}

      <ol className={cx(styles.list)} aria-label={name}>
        {rows.map((row) => (
          <Row
            key={row.symbol}
            symbol={row.symbol}
            label={row.label}
            rank={row.rank}
            change={row.move?.change}
            direction={row.move?.direction}
            percent={row.move?.percent}
            absent={row.absent}
            arrival={row.arrival}
            scale={bar.scale}
          />
        ))}
      </ol>

      {/*
       * **The printed ladder, which AC 2 requires rather than offers**: a
       * length is a claim about a quantity, so the quantity is printed. Without
       * it the bar means nothing outside this one screen — and with the
       * frame-max normalisation the drawing rejected, a ±0.1% day and a ±5% day
       * are the same picture.
       */}
      {signed && (
        <div className={cx(styles.ladder)} aria-hidden="true">
          {ladderTicks(bar.scale).map((tick) =>
            tick.label === undefined ? undefined : (
              <span
                key={tick.at}
                className={cx(
                  styles.ladderTick,
                  tick.at === 25 || tick.at === 75
                    ? styles.ladderMid
                    : undefined,
                )}
                style={{ left: `${String(tick.at)}%` }}
              >
                {tick.label}
              </span>
            ),
          )}
        </div>
      )}
    </div>
  );
});

/**
 * One row.
 *
 * **A memo boundary on primitive props, which is AC 6 and Task 3.6.5's
 * precedent.** Its props are strings and numbers rather than the row object,
 * so the boundary actually holds: the gateway rebuilds the aggregate up to
 * sixteen times a minute and a minute's burst moves a handful of the eleven
 * figures, so the rows that did not change do not re-render at all. Handing it
 * `row` instead would make every prop a fresh object identity and the memo a
 * comment.
 */
const Row = memo(function Row({
  symbol,
  label,
  rank,
  change,
  direction,
  percent,
  absent,
  arrival,
  scale,
}: {
  readonly symbol: string;
  readonly label: string;
  readonly rank: number | undefined;
  readonly change: string | undefined;
  readonly direction: PriceDirection | undefined;
  readonly percent: number | undefined;
  readonly absent: string | undefined;
  readonly arrival: string | undefined;
  /** Absent when the bar is off — see {@link RankedListBar}. */
  readonly scale: SectorLadderStep | undefined;
}) {
  return (
    <li className={cx(styles.row)}>
      {rank === undefined ? (
        <span className={cx(styles.rank)}>
          {/*
           * The em dash reads as nothing to a screen reader, which is right for
           * a structurally inapplicable field and is right here too: there is
           * no rank, and the figure column says why in words a listener gets.
           * `UniverseTable` makes the same trade in three columns.
           */}
          <span aria-hidden="true">{NOT_APPLICABLE}</span>
        </span>
      ) : (
        <span className={cx(styles.rank)}>{rank}</span>
      )}

      <span className={cx(styles.label)}>{label}</span>

      <span className={cx(styles.ticker)}>
        <span className={cx(styles.symbol)}>{symbol}</span>
        {/*
         * **The mark's 8 px slot, reserved in every state including the empty
         * one, from the stylesheet rather than from this list.** Geometry C
         * reused — the proxy strip's static inline slot — because every track
         * left of the bar is fixed to the pixel and the one flexible track is a
         * picture, so there is no slack to be absolute into.
         *
         * The universe table's refusal to reserve width inverts here and its
         * own argument is why: at 518 rows a mark is absent 98% of the time, so
         * reserving 8 px is a permanent cost for a rare event. At eleven of the
         * most liquid funds in the market, each marking about once a minute, it
         * is close to the common case — and it is what makes zero layout shift
         * when a mark fires reachable at all.
         */}
        <span className={cx(styles.markSlot)}>
          {arrival === undefined ? undefined : (
            /*
             * `key` is the mechanism rather than a detail: a CSS animation does
             * not restart when the same animation is re-applied to the same
             * element, so React replacing the node is what makes it run again.
             * `aria-hidden` for the same reason the other three surfaces do it —
             * the information is the figure, and the mark only says *look*.
             */
            <span
              key={arrival}
              className={cx(styles.arrival)}
              data-arrival={arrival}
              aria-hidden="true"
            />
          )}
        </span>
      </span>

      <span className={cx(styles.figure)}>
        {change === undefined || direction === undefined ? (
          /*
           * Words instead of digits, which is what tells an absence apart from
           * a figure — weight and hierarchy doing the job rather than ink
           * outside the contrast floor. `--ink-secondary` rather than
           * `--ink-disabled`: this is a sentence a person has to read.
           */
          <span className={cx(styles.absent)}>{absent}</span>
        ) : (
          <PriceChange change={change} direction={direction} />
        )}
      </span>

      {scale === undefined ? undefined : (
        <span className={cx(styles.bar)} aria-hidden="true">
          <Bar percent={percent} direction={direction} scale={scale} />
        </span>
      )}
    </li>
  );
});

/**
 * The bar itself: a band on one side of the anchor, or the anchor tick alone,
 * or nothing.
 *
 * **`0.00%` draws no bar, only the anchor tick**, and a row with no reading at
 * all draws neither. A zero-length band is a claim of no movement; an absent
 * one is not, and the tick is what lets a reading of exactly zero be told apart
 * from a row we have heard nothing about.
 *
 * **The direction is the SAME value `PriceChange` is given**, which is what
 * makes the picture and the number unable to disagree: `directionOf` decides on
 * the **rounded** figure, so a +0.001% move renders `0.00%` with an em dash and
 * draws the anchor tick rather than a 0.025%-wide green sliver beside a figure
 * saying nothing moved. Deciding it here on `percent > 0` was the first draft
 * and was that defect.
 *
 * That is also the single best thing the central anchor buys: **which side of
 * the anchor a bar grows from is a position, not a colour**, so direction
 * survives `grayscale(1)` with the length intact.
 *
 * The fill is `--price-positive` / `--price-negative`, **never the washes**: at
 * 1.15:1 against the page ground an 8 px band of wash is not a light bar, it is
 * an invisible one, and a bar nobody can see is worse than no bar because the
 * layout still says there is one.
 */
function Bar({
  percent,
  direction,
  scale,
}: {
  readonly percent: number | undefined;
  readonly direction: PriceDirection | undefined;
  readonly scale: SectorLadderStep;
}) {
  if (percent === undefined || direction === undefined) return null;
  if (direction === "unchanged") return <i className={cx(styles.anchorTick)} />;

  // Half the track is one side of the anchor, so a full-rung move is 50%.
  const width = `${String(barFraction(percent, scale) * 50)}%`;

  return (
    <i
      className={cx(
        direction === "positive" ? styles.positive : styles.negative,
      )}
      style={{ width }}
    />
  );
}
