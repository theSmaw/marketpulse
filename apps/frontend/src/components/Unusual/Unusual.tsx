import { memo, useId } from "react";

import { UNUSUAL_ROWS } from "@marketpulse/shared";

import { cx } from "../../cx.js";
import {
  NOTHING_RANKED,
  RESERVED_UNUSUAL,
  rowsInPinnedOrder,
  withHeldUnusualRows,
  type UnusualActivity,
} from "../../market/index.js";
import { useWaited } from "../MarketProxyStrip/use-waited.js";
import { OrderHeldBadge } from "../OrderHeldBadge/OrderHeldBadge.js";
import { RankedList, type RankedListBar } from "../RankedList/RankedList.js";
import styles from "./Unusual.module.css";

// **The landing page's last reserved region** (Task 5.4.3, `Unusual activity
// on the landing page.dc.html`) — one ranked list of the securities whose
// recent five-minute move sits furthest out in their own 60-session history.
//
// ## The third use of `RankedList`, and the first one in the narrow column
//
// The nearest relative is `Movers`: same component, no bar, ticker leading, a
// ranked selection over the same 501 equities. It stretches in every respect
// but one — **the row**. `Movers`' was designed against 992 px and this one
// has **308**, at the widest viewport this product supports, because the
// region sits in the grid's narrow column. So the whole of the drawing is one
// arithmetic problem: `>99th percentile` is sixteen glyphs and 143.6 px in the
// cold-load face, which on a 308 px row leaves the company name about six
// characters.
//
// The answer is that **the word moves to the list heading and the ordinal
// stays on the row** — drawn short, spoken whole, one fact with two renderings
// (ADR 0029) rather than a concession. See `return-percentile.ts`'
// `percentileOrdinal`, which derives the short form from the long one so the
// two cannot drift.
//
// ## What this region has none of
//
//   - **No bar.** `The ranked list.dc.html` §02 refuses one for a top-N on
//     three grounds and the first is at its absolute strongest here, as
//     arithmetic rather than as a tendency: the figure is an integer ordinal
//     **bounded at 99**, drawn from the extreme end of 455 securities' own
//     distributions, so the top ten read `>99, >99, 99, 99, 99, 98, 98, 97,
//     96, 96` every day there is a market. At 190 px of bar the longest and the shortest would
//     differ by ~7.6 px — less than the 8 px arrival mark beside the ticker.
//     And normalising to the frame's maximum is worse: divide by the leader
//     and a day whose leader is `>99th` and a day whose leader is `71st` draw
//     the identical picture, which costs a reader the only question this
//     region exists to answer.
//   - **No band chip** (Story 5.4's Gate 1 decision 1).
//     `packages/shared/src/anomaly.ts` deliberately holds no score→band
//     boundaries, the four bands are defined for the composite 0–100 score,
//     and this ranks **one factor of four** — so a chip would read `extreme`
//     on price alone, ten times over. It is also a worse picture than the bar
//     it replaces: a top-N selected for extremity, bucketed by extremity,
//     collapses to one bucket. **Reversal condition**: Story 5.6's composite
//     with absolute thresholds, against which a quiet day's top five are all
//     `elevated` and a wild day's all `extreme` — at which point the chip
//     stops being a property of the selection and becomes a property of the
//     day. One consequence travels with the refusal: `market.css` resolves
//     `--anomaly-high`, `--feed-stale`, `--service-degraded` and
//     `--provenance-synthetic` all to `--palette-amber`, and with no chip
//     **no amber appears in this region**, so that collision stays Story
//     5.6's and is unreachable from `/` today.
//   - **No quiet group and not even its reserve.** The list's set **is** the
//     ranking's output — the producer builds no row for a refused security and
//     carries no unranked tail — so the group has zero members in every state
//     there is, and its 25 px heading would cost a row.
//   - **No footer yet.** The three populations, the cut and the age are Task
//     5.4.4's; their room is reserved here (see `.claim`) so the sentences
//     arrive into height this region already holds.
//
// ## And the arrival disc keeps its shipped meaning
//
// It fires when **a bar arrives for that security** and on nothing else. A
// percentile is the first figure in this product that can change with **no bar
// for its security at all** — its peers moved, or the window rolled — and a
// second meaning for one mark is this product's most-repeated defect. The
// right repair for *why did these rows move* is the `ORDER HELD` badge, which
// is why this task repaired it; it is not the disc.

/**
 * **The list's heading: what the rows are ranked by, named once.**
 *
 * Sentence case in the DOM and uppercase on screen — `Movers`' rule and
 * `microLabel`'s, and it is not a preference: a string stored uppercase is a
 * string some screen readers spell out a letter at a time.
 *
 * **It names the comparison rather than repeating the region's name**, which
 * is what the word `percentile` moving off the row bought. It is also what
 * makes the ordinary state readable: a full list of `62nd`, `59th`, `58th` is
 * the honest answer *nothing is unusual right now* (Gate 1 decision 1's own
 * words — a row reading `62nd percentile` is visibly ordinary), and a reader
 * can only take that from it if they know what the figures are percentiles
 * **of**.
 *
 * **The long form is the string and the narrow widths are a rendering of it**
 * — one line, `text-overflow: ellipsis` — rather than two strings behind a
 * breakpoint, which is the same rule the ordinal itself follows one element
 * over.
 *
 * The named form rather than a paraphrase (`how far today's move is from this
 * company's own normal`, 48 characters): this product's rule is that a figure
 * is **named** rather than described, and the paraphrase belongs in the
 * security page's own explanation — which every row of this region links to.
 */
const RANKED_BY = "Percentile of its own 60-session history";

/**
 * **Hoisted so the prop identity is stable**, and `figure: "ordinal"` is the
 * decision rather than a default — see `RankedListBar`, where the 92 px of
 * dead track it closes is measured.
 */
const ORDINAL_AND_NO_BAR: RankedListBar = { kind: "none", figure: "ordinal" };

export interface UnusualProps {
  /** The ranked rows, from the unusual section of the overview frame. */
  readonly view: UnusualActivity;
  /**
   * **The order a reader is holding**, from `useOrderHold`, absent while
   * nothing is held — `Movers`' prop, unchanged, and one pin for the one list.
   *
   * The pin is applied **before** the padding and that order is a correctness
   * requirement rather than a style: `withHeldUnusualRows`' pads are keyed on
   * runs of non-breaking spaces and are positional, so a pin applied after
   * them would place real rows around invented ones.
   */
  readonly pinned?: readonly string[] | undefined;
}

export const Unusual = memo(function Unusual({ view, pinned }: UnusualProps) {
  // `useId` rather than a literal for `Panel`'s reason: the same component can
  // be on a page twice, and the heading is the list's accessible name through
  // `aria-labelledby` — one fact, one home, rather than a second copy of the
  // words in an `aria-label` for a listener to meet twice.
  const headingId = useId();

  return (
    <>
      <h3 className={cx(styles.head)} id={headingId}>
        {RANKED_BY}
      </h3>

      {/*
       * **The sentence is laid OVER the held rows rather than above them** —
       * `Movers`' `EmptySide`, for its measured reason. The list keeps its
       * ten rows in every state because `withHeldUnusualRows` pads it, so the
       * room is the row pitch times ten and the pitch has exactly one home,
       * in `.row`. A sentence placed above the `<ol>` would add a sixth line
       * to this region's content, and at 768 and 390 the grid row is
       * content-sized, so the whole lower page would step the first morning
       * the ranking was short.
       *
       * The wrapper is unconditional, because a `position: relative` that
       * comes and goes is a containing block that comes and goes.
       */}
      <div className={cx(styles.body)}>
        <RankedList
          rows={withHeldUnusualRows(rowsInPinnedOrder(view.rows, pinned))}
          bar={ORDINAL_AND_NO_BAR}
          name={{ labelledBy: headingId }}
          quietGroup="impossible"
        />
        {/*
         * **The sentence is the VIEW's, not a derivation from `rows.length`**
         * — which is why the reservation can render this component and say
         * nothing. The two nouns and the reason there are two are in
         * `unusual-activity.ts`; `undefined` draws no element at all.
         */}
        {view.nothing === undefined ? undefined : (
          <p className={cx(styles.empty)}>{view.nothing}</p>
        )}
      </div>

      {/*
       * **The footer's room, held and empty** — Task 5.4.4 writes the
       * sentences, and the room is reserved **now** because the height budget
       * this region was sized against includes it.
       *
       * **Four reserved lines rather than `Movers`' three**, and that is the
       * one derived term in this region's height ledger. At 308 px the micro
       * size fits roughly 59 characters a line; this region states **three**
       * populations and a cut where `Movers` states one population — about 121
       * characters, so three lines at 308 and one at 686 — and the age line is
       * a fourth everywhere. Sizing to three and discovering four on the first
       * morning the `scored` clause wrapped would step the whole lower page at
       * 390, in the one region that must not step. `Movers` shipped a two-line
       * reserve and had to buy a third at Task 4.7.4 when its age clause
       * arrived; buying the fourth now is 16 px.
       *
       * **Flat rather than keyed on a breakpoint**, which is `Movers`' own
       * decision for its own reason: a `@media` on a footer reserve is a
       * second home for a width the grid already owns, and the 16 px it would
       * save at three widths buys an empty line nobody sees.
       */}
      <p className={cx(styles.claim)} />
    </>
  );
});

/**
 * **The region head's right-hand slot: what the list is a selection of.**
 *
 * `Top 10` states the **bound**, which is the one thing about this region that
 * is true in every state and is not a claim about data: ten is the height
 * budget (see `UNUSUAL_ROWS`), and a short list is short because few
 * securities were rankable rather than because the slot said something false.
 *
 * ## The COUNT is not here, and the re-area is what settles it
 *
 * `MoversMeta`'s refusal, inherited and now stronger than when it was
 * written: *a second `N of M` badge at a different denominator over a
 * different set is two correct badges reading as one pattern*. `Sector
 * performance` already says `N of 11 ranked`, and Task 5.4.1's re-area put
 * that region and this one **side by side on grid row 2** — so `N of 11
 * ranked` and `3 of 10 ranked` would be **adjacent** rather than the 200 px
 * apart they were when `BreadthLedger` first refused the pattern. A drafted
 * `N of 10 ranked` shipped for an afternoon on 2026-10-16 and the owner took
 * it out.
 *
 * **Where the counts go is the footer** (Task 5.4.4), and they are three
 * rather than one — tracked, heard from, and how many have a long enough
 * history to rank. A badge cannot carry three, and the one that carried one
 * of them would be the least informative of the three.
 *
 * ## It falls silent when nothing was ranked
 *
 * `MoversMeta`'s and `SectorPerformanceMeta`'s precedent: a bound stated over
 * an empty list reads as a claim about a selection that selected nothing, and
 * the sentence over the held rows already says what is true there. A **short**
 * list keeps the badge, which is the same judgement taken the other way —
 * three ranked out of ten is a thin morning rather than an absent answer, and
 * the bound is exactly the fact that tells a reader the list is not truncated.
 *
 * ## And it does not repeat the list heading
 *
 * `PERCENTILE OF ITS OWN 60-SESSION HISTORY` is 16 px below this slot and
 * names the comparison; this names the **bound**. Two words for one idea in
 * one header is what the region's own name already risks.
 *
 * The slot is shared with `ORDER HELD`, mutually exclusive, in room `.slot`
 * reserves so neither moves the other: Task 4.3.6 measured a four-pixel-taller
 * badge moving eleven rows on pointer enter.
 *
 * **The ten is interpolated, never typed** — `the-population-is-never-a-
 * literal`'s rule one scale down: a badge saying ten over eleven rows is a lie
 * with no symptom.
 */
export const UnusualMeta = memo(function UnusualMeta({
  view,
  held,
}: {
  readonly view: UnusualActivity;
  /**
   * From `useOrderHold`. **The same value that pins the order the list
   * draws**, so the head and the list cannot disagree about which order is
   * held — `docs/GAPS.md` entry 13's sibling defect, and the reason this is
   * one piece of state rather than two.
   */
  readonly held: boolean;
}) {
  return (
    <span className={cx(styles.slot)}>
      {held ? (
        <OrderHeldBadge />
      ) : view.rows.length === 0 ? undefined : (
        <span
          className={cx(styles.bound)}
        >{`Top ${String(UNUSUAL_ROWS)}`}</span>
      )}
    </span>
  );
});

/**
 * **The paint before the first frame: the region's geometry, held and
 * invisible** — `MoversReservation`'s shape, one region across, and a fourth
 * copy of it rather than a fourth idea.
 *
 * It is the real component from {@link RESERVED_UNUSUAL} rather than a
 * measured box, for that component's recorded reason: the height it holds is a
 * heading, ten rows and a four-line claim, and **every one of those numbers
 * already exists exactly once**. A `min-height` here would be a second home
 * for all three, wrong the first time any of them changes and wrong
 * *silently*, because nothing below `pnpm e2e` computes a layout.
 *
 * **Two boxes rather than one, and the nesting is the decision.** The held
 * geometry keeps `visibility: hidden` and `aria-hidden` of its own, in every
 * state; the sentence is a **sibling** in the room that box is holding. The
 * one-box version — `visibility: visible` back on the same element once the
 * floor elapses — is the obvious shape and it **un-hides the geometry with
 * it**, because `visibility` is inherited by children that never set it. It
 * was a live defect for ten days on the sector region and it leaked internal
 * slugs into the accessibility tree.
 */
export const UnusualReservation = memo(function UnusualReservation() {
  // **The floor is the proxy strip's own and not a fifth one.** The
  // reservation is right for the case it was written against — a first frame
  // measured at 124 ms, so the hold is a flash nobody sees. It is wrong for
  // the case a reader actually meets: an unreachable aggregate, a half-rolled
  // deploy, a proxy holding the socket open.
  const waited = useWaited(true);

  return (
    <div className={cx(styles.reservedRoom)}>
      <div className={cx(styles.reserved)} aria-hidden="true">
        <Unusual view={RESERVED_UNUSUAL} />
      </div>
      {/*
       * **The same noun the view uses for an open market, from the same
       * home** — `NOTHING_RANKED`, imported rather than re-spelled. The two
       * states differ (*no frame at all* against *a frame that ranked
       * nothing*) and the sentence does not, because from the reader's side
       * nothing has been ranked either way; the reservation cannot say *while
       * the market is shut* because it has no aggregate to read a basis from.
       */}
      {waited ? (
        <p className={cx(styles.nothingArrived)}>{NOTHING_RANKED}</p>
      ) : undefined}
    </div>
  );
});
