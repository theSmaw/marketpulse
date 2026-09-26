import type { Bar, WireMarketOverview } from "@marketpulse/shared";

import { cx } from "../../cx.js";
import { marketProxyStrip, type ProxyCell } from "../../market/index.js";
import { PriceChange } from "../PriceChange/PriceChange.js";
import styles from "./MarketProxyStrip.module.css";
import { useWaited } from "./use-waited.js";

// The four index proxies, side by side and moving (Task 4.2.5).
//
// `Market proxies.dc.html` is the drawing and it is the source of truth
// (ADR 0026). What follows is the part of it that is a decision rather than a
// value, restated where the next author will be standing.
//
// ## Three rows, and every one of them reserved
//
// `Price region.dc.html`'s governing rule, applied: **the frame is never
// conditional on the data.** A proxy with a figure and a proxy without one
// occupy the same box, in the same three rows, with the same slots — because
// `.regions` begins immediately below in a flex column, so the strip's height
// moves the entire seven-region grid. Nothing here is allowed to appear and
// push.
//
//   row 1   the symbol, and the arrival mark's 8 px slot
//   row 2   the figure, and the change beside it
//   row 3   the per-proxy exception, or nothing
//
// ## And therefore not `MetricStrip` with props
//
// Its own header declines the job — *"a metric here is a state of the world,
// not a move"* — and the structural reason is the one that settles it: a `<dl>`
// pair is a term and a value, and this cell has **three** parts in a fixed
// vertical order, which is only reachable through `display: contents`, the one
// thing `MetricStrip`'s comment refuses. This borrows the arrangement and the
// type (`.dataMetric`) and not the element.
//
// ## The strip names no feed, no venue and no connection word, in any state
//
// `LIVE` / `STALE` / `DISCONNECTED` have one home and it is the status bar
// (Story 3.10). Killing the feed leaves every figure here exactly as it was and
// changes nothing in this component — byte-identical output, which is a
// decision three tasks took with measurements behind them rather than an
// omission. What the strip states is an instant, an age and a change basis,
// all three true of either tape, which is the only answer to invariant 6
// available without a second venue word on a screen that already has one.
//
// ## No live region, and the reversal trigger is a condition
//
// `FRONTEND-STATE.md` §7's four reasons hold *a fortiori* here: four subjects
// nobody asked for, on the most unprompted screen in the product. **The trigger
// is the first surface on this screen where a change is the answer to something
// the user asked for** — a filter, a ranking they chose, a security they typed.
// Until then nothing here is announced, and what is open is whether it is
// pleasant to go and read, which is a listener's question rather than a DOM's.

// The reserved strip's cell count — see `NoFigures`. It is the stylesheet's
// `repeat(4, …)` expressed in markup, not `PRODUCT_SPEC.md` §6's list.
const RESERVED_SLOTS = [0, 1, 2, 3] as const;

// **A NON-BREAKING space, and the character is the mechanism.** Every reserved
// row holds one so that filling it costs no height; a plain space in a `<p>`
// collapses to nothing, and the reservation would then rest on however a
// browser resolves an empty line box. Named rather than inlined so that it
// cannot be "tidied" into `" "` by somebody who cannot see the difference —
// which is the whole hazard with this character.
const NBSP = "\u00a0";

export interface MarketProxyStripProps {
  /**
   * The aggregate the backend computed, or `undefined` before the first frame.
   *
   * **`undefined` is first paint and it should be rare and short**: the gateway
   * sends an overview on connect, unscoped, so a browser has one before it has
   * subscribed to anything. It is drawn anyway, because *rare* is not *absent*.
   */
  readonly overview: WireMarketOverview | undefined;
  /** The socket's own map, for the mark. Never for the figures. */
  readonly observations: ReadonlyMap<string, Bar>;
  /** Which of those arrived in a snapshot. A snapshot is not an arrival. */
  readonly fromSnapshot: ReadonlySet<string>;
}

export function MarketProxyStrip({
  overview,
  observations,
  fromSnapshot,
}: MarketProxyStripProps) {
  /*
   * **Two ways to have no figures, and they were one guard apart.**
   *
   * `overview === undefined` is *no frame has arrived*. `figures: []` is *a
   * frame arrived and is about nothing* — and it fell straight through to the
   * ordinary path, where the grid rendered at height **0**, `nothingStored` was
   * false because of its own `length > 0` conjunct, the qualifier was
   * `undefined`, and the region drew one hidden paragraph and **said nothing at
   * all** — taking 70–112 px out from under `.regions` with it.
   *
   * They are one state on screen, because what a reader can see is identical:
   * this strip has no figures. They differ only in how long it is honest to
   * wait before saying so, which is {@link useWaited}'s whole subject.
   */
  const nothingArrived = overview === undefined;
  const waited = useWaited(nothingArrived);

  if (nothingArrived) return <NoFigures saying={waited} />;

  const { cells, qualifier, nothingStored } = marketProxyStrip(
    overview,
    observations,
    fromSnapshot,
  );

  if (cells.length === 0) return <NoFigures saying />;

  return (
    <>
      <div className={cx(styles.strip)}>
        {cells.map((cell) => (
          <Cell key={cell.symbol} cell={cell} />
        ))}
      </div>
      {nothingStored ? (
        /*
         * **The qualifier changes shape rather than going missing**, and this
         * sentence is deliberately distinct from both of the security page's
         * empty answers — neither *no history stored for NVDA yet* nor *no bars
         * stored for this window*. Four named securities have no window to
         * change, so the sentence must not suggest one.
         *
         * Sentence case rather than the micro caps: it is prose, not a stamp.
         */
        <p className={cx(styles.sentence)}>
          No prices stored for these four yet.
        </p>
      ) : qualifier === undefined ? (
        /*
         * Room held, nothing drawn — `.rail`'s idiom and the repair the figures
         * block needed on 2026-09-23. `visibility: hidden` rather than an em
         * dash, because a fully-formed line about nothing is a false impression
         * rather than a courtesy (ADR 0029), and never a skeleton of a sentence.
         */
        <p className={cx(styles.qualifierReserved)} aria-hidden="true">
          {NBSP}
        </p>
      ) : (
        <p className={cx(styles.qualifier)}>{qualifier}</p>
      )}
    </>
  );
}

function Cell({
  cell: { symbol, reading, arrival },
}: {
  readonly cell: ProxyCell;
}) {
  const note = reading.kind === "unknown" ? undefined : reading.note;

  return (
    <div className={cx(styles.cell)}>
      <p className={cx(styles.term)}>
        <span className={cx(styles.symbol)}>{symbol}</span>
        {/*
         * **The mark's slot, reserved statically and in the flow** — the third
         * geometry, and the first that is not absolute.
         *
         * Both shipped positions hang the disc off a right-hand slack that
         * already existed: the identity block's measured 26 px gutter, and the
         * table's right-aligned column. A four-across grid of left-aligned
         * `minmax(0, 1fr)` columns has neither, so there is nothing to be
         * absolute into and the 8 px is held whether or not a mark is running.
         *
         * The universe table's 98% argument inverts here: at 518 rows a mark is
         * absent almost always, so reserving width is a permanent cost for a
         * rare event; at four of the most liquid ETFs in the market, marking
         * every minute, it is close to the common case.
         */}
        <span className={cx(styles.markSlot)}>
          {arrival === undefined ? undefined : (
            /*
             * `key` is the mechanism rather than a detail: a CSS animation does
             * not restart when the same animation is re-applied to the same
             * element, so React replacing the node is what makes it run again.
             * That is also the answer to two changes inside one animation —
             * **restart, never queue or overlap** — because there is only ever
             * one node, and a correction replaces the minute it corrects.
             *
             * `aria-hidden`, and that is the same call the other two surfaces
             * make: the information is the figure, which is already on screen.
             * The mark only says *look*, which is what makes the reduced-motion
             * answer honest rather than a degradation.
             */
            <span
              key={arrival}
              className={cx(styles.arrival)}
              data-arrival={arrival}
              aria-hidden="true"
            />
          )}
        </span>
      </p>

      <p className={cx(styles.valueRow)}>
        {reading.kind === "unknown" ? (
          /*
           * **This product's existing words**, from `SecurityIdentity`, at
           * `--ink-secondary` rather than `--ink-disabled` — measured at Epic 2,
           * because `#74777f` is 4.48:1 and this is a sentence a person has to
           * read rather than a greyed-out control. It is told apart from a
           * figure by saying words instead of digits, which is weight and
           * hierarchy doing the job rather than ink outside the contrast floor.
           */
          <span className={cx(styles.absent)}>None stored</span>
        ) : (
          <span className={cx(styles.figure)}>{reading.price}</span>
        )}
        {reading.kind === "observed" && reading.change !== undefined && (
          /*
           * **The strip spells neither the sign nor the glyph itself.**
           * `PriceChange` keeps that pairing inside itself so that *colour is
           * never the sole encoding* has a component behind it instead of a
           * convention every author has to remember — the palette differs by
           * 1.04:1 in greyscale, so hue is the entire difference. A second
           * speller here would be the fourth.
           */
          <PriceChange
            change={reading.change.change}
            direction={reading.change.direction}
          />
        )}
      </p>

      {/*
       * Row 3, and it is reserved in every state — the universe table's
       * `sessionReserved` idiom, a non-breaking space behind `aria-hidden`, so
       * that a proxy falling behind or a stored close arriving costs no height.
       *
       * When it is filled it is **an age or a session, never a verdict**: no
       * threshold word, and the shared claim above never bends to accommodate
       * it.
       */}
      {note === undefined ? (
        <p className={cx(styles.noteReserved)} aria-hidden="true">
          {NBSP}
        </p>
      ) : (
        <p className={cx(styles.note)}>{note}</p>
      )}
    </div>
  );
}

/**
 * No figures: the box, and either nothing in it or one sentence.
 *
 * **`saying` is the floor rather than a variant.** For the first fraction of a
 * second this is a genuine wait and the honest drawing is an empty reserved
 * box; after `SAY_NOTHING_ARRIVED_AFTER_MS` it is a region that has been
 * sitting at full height with a heading and nothing under it, which is the
 * thing `docs/GAPS.md` entry 13 is about. The sentence goes in the slot the
 * qualifier already reserves, so the floor costs no height.
 *
 * **`No prices yet.` and not one of the other two**, which is the difference
 * between the three empty answers this strip and its neighbours can give.
 * `No prices stored for these four yet.` is a claim about the **store**, and
 * we have not been told anything about the store — making it here would be
 * inventing the very fact that is missing. The security page's *no history
 * stored for NVDA yet* and *no bars stored for this window* both name a
 * subject this region does not have. What is left is the `No … yet` shape the
 * product already uses (`No close yet`, `None stored`) with nothing after it,
 * because nothing after it is what we know.
 *
 * It names **no feed, no venue and no connection word**. Whether the socket is
 * up has exactly one home and it is the status bar; this sentence says only
 * that this region has no figures, which is true however that came about.
 *
 * **The symbols are not known yet**, because the set is served rather than
 * hard-coded — `kind === "index_etf"`, derived in the backend, carried in the
 * frame's own order. So this cannot be four labelled skeletons; it is four
 * reserved cells holding the strip's three rows open.
 *
 * `visibility: hidden` plus `aria-hidden` rather than em dashes or grey bars:
 * the shipped `FiguresReservation` idiom, and the one that does not invite a
 * reader to interpret a placeholder as a value.
 *
 * ## It reserves FOUR cells, and that is the STYLESHEET's four rather than §6's
 *
 * **Measured 2026-09-26, and it was one cell until it was.** At 1440, 1024 and
 * 768 one reserved cell and four are the same 58 px, because the grid puts them
 * all on one row — so the defect is invisible at three of the four widths. At
 * 390 the grid is 2×2: one cell is one row of 58 px and four are two rows of
 * 128, so the strip grew **70 px the instant the first frame landed**, taking
 * the whole seven-region grid with it. `pnpm probe --story` is the only thing
 * that can see it; jsdom computes no layout, and the page is not wrong — only
 * jumping.
 *
 * The count is not a claim about *which* securities the overview is about —
 * those are still entirely the frame's, and nothing here names one. It is the
 * same four the track list in `MarketProxyStrip.module.css` already states,
 * and the day that number stops being right the tracks are wrong in the same
 * change.
 */
function NoFigures({ saying }: { readonly saying: boolean }) {
  return (
    <>
      <div className={cx(styles.strip, styles.reserved)} aria-hidden="true">
        {RESERVED_SLOTS.map((slot) => (
          <div className={cx(styles.cell)} key={slot}>
            <p className={cx(styles.term)}>
              <span className={cx(styles.symbol)}>{NBSP}</span>
              <span className={cx(styles.markSlot)} />
            </p>
            <p className={cx(styles.valueRow)}>
              <span className={cx(styles.figure)}>{NBSP}</span>
            </p>
            <p className={cx(styles.noteReserved)}>{NBSP}</p>
          </div>
        ))}
      </div>
      {saying ? (
        <p className={cx(styles.sentence)}>No prices yet.</p>
      ) : (
        <p className={cx(styles.qualifierReserved)} aria-hidden="true">
          {NBSP}
        </p>
      )}
    </>
  );
}
