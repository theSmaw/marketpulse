import { memo, useId } from "react";

import { MOVERS_PER_SIDE } from "@marketpulse/shared";

import { cx } from "../../cx.js";
import {
  RESERVED_MOVERS,
  withHeldRows,
  type MarketMovers,
} from "../../market/index.js";
import { useWaited } from "../MarketProxyStrip/use-waited.js";
import { RankedList, type RankedListBar } from "../RankedList/RankedList.js";
import styles from "./Movers.module.css";

// **Two ranked lists in one region, as peers** — `The movers.dc.html`, Task
// 4.5.3.
//
// ## The distinction that matters most: two peers, not a demotion
//
// The sector region's trailing group is a **demotion**, and every channel it
// uses says so: no ordinal, regular weight, secondary ink, below a rule, words
// where a figure would be. This region takes the **mechanism** — a second
// `h3`, a `--rule-control` rule above it, a separate `<ol>` — and refuses the
// **emphasis**. Both lists draw primary ink, medium weight on the name, a
// printed ordinal and `PriceChange` at full strength.
//
// If the losers list inherited the receding treatment it would read as *losers
// are the leftovers*, which is false — each list is ranked from 1 and each is a
// complete answer to its own question — and tonally wrong on a market surface
// where a −9% name is the most interesting thing on the page.
//
// **It is safe to borrow the mechanism because in the sector region the
// demotion is carried by the rows and not by the heading.** The heading there
// says *which list this is*; so does each of these.
//
// ## Not two panels, and not a bare gap
//
// `Panel` is this language's one strong statement and nesting two gives three
// frames with the region's name competing with two sub-names. A bare gap gives
// two unlabelled columns of signed figures, which is a permutation waiting to be
// misread — and in greyscale the heading is the first and strongest of the three
// non-colour channels, because the price palette differs by 1.04:1 once hue is
// taken away.
//
// ## What this component does NOT have
//
//   - **No bar.** `RankedList`'s `bar: "none"`, and the reason is re-argued on
//     its own terms rather than inherited: a **selected tail has no range**.
//     The eleven sector ETFs are a whole roster, so the ratio of two bars is
//     the ratio of two moves; five names chosen *for being extreme* are near
//     the top of their own scale by construction, so five bars all within a
//     whisker of full length carry almost no information. (The reason the
//     canvas gave until 2026-10-08 — *one quantity versus four* — was borrowed
//     from the proxy strip's refusal and is false here: a mover row carries
//     today's percent change against the previous close, the same quantity on
//     the same basis as a sector row.)
//   - **No quiet group and not even its reserve.** Story 4.5's AC 5 is that a
//     name with no current observation cannot appear in either list, so the
//     group has zero members in every state there is, for ever. At two lists
//     the unconditional reserve would be **50 px held for a group that cannot
//     exist**, which in a 389 px content budget is the difference between five
//     rows and four. `quietGroup="impossible"` is Task 4.5.1's prop and this is
//     the use it was added for.
//   - **No price yet, and its track is reserved.** `.movers`' fourth track is
//     80 px of held room with nothing in it: a price is not on the row type and
//     there is no producer for one until Task 4.5.4 puts a movers section on
//     the wire. A cell added there auto-places into that track and moves
//     nothing. (`RankedList.module.css` attributes the filling of it to *this*
//     task; the row type has no price, so it could not be done here without
//     inventing a figure with no producer.)
//   - **No denominator sentence.** The footer's two-line room is reserved here
//     and left empty; the words — *of the N we track, M were heard from* — are
//     Task 4.5.6's, where the two grammars and the one-sided market are
//     decided together.
//   - **No hold.** `ORDER HELD` at two lists is Task 4.5.7's. The head slot's
//     room is reserved so the badge moves nothing when it arrives.

/**
 * The two headings — **sentence case in the DOM, uppercase on screen.**
 *
 * `microLabel`'s idiom and `ORDER_HELD`'s, and it is not a preference: a string
 * stored uppercase is a string some screen readers spell out a letter at a
 * time. The stylesheet does the uppercase.
 *
 * **The words are the owner's Gate 1 decision.** They are the two halves of the
 * region's own name said once each, and they are what a listener gets as each
 * `<ol>`'s accessible name — one fact, one home, through `aria-labelledby`
 * rather than a repeated `aria-label`, which is `RankedList`'s own argument at
 * its trailing group and the reason its `name` prop is a union.
 */
const GAINERS = "Gainers";

/** See {@link GAINERS}. */
const LOSERS = "Losers";

/**
 * **What this region has none of, when nothing ever arrives** — the third
 * consumer of `useWaited` rather than a third floor.
 *
 * ## The noun is this region's own
 *
 * `MarketProxyStrip` says `No prices yet.`, `SectorPerformance` says `No sector
 * moves yet.` and `BreadthLedger` says `No count yet.` This region draws
 * neither prices nor a count, and *moves* alone would be the sector region's
 * word for a different quantity — eleven benchmarks against a selection from
 * 503. What it has none of is a **ranking**: there is nothing to rank yet.
 *
 * Four regions, four nouns, one per region — which is what tells a reader
 * **which** region went quiet when two of them do at once.
 *
 * ## And it claims nothing about the market
 *
 * `No moves to rank yet.` says the ranking has no input. It does not say the
 * market is flat, which would be a claim about the market rather than about our
 * store — the one sentence in this product that ever made one is
 * `describeSilence`, and it took a task to make it honest.
 */
const NOTHING_ARRIVED = "No moves to rank yet.";

/**
 * **Hoisted so the prop identity is stable**, which is the only reason it is a
 * module constant: `memo(RankedList)` sees a fresh object for anything built in
 * the render, and the per-tick boundary that actually holds is `memo(Row)` on
 * primitive props. One of the two props here cannot be hoisted — the name
 * carries a `useId` — so the memo on the list is a comment either way; this one
 * is free.
 */
const NO_BAR: RankedListBar = { kind: "none" };

export interface MoversProps {
  /** The two ends, from the movers section of the overview frame (Task 4.5.4). */
  readonly view: MarketMovers;
}

export const Movers = memo(function Movers({ view }: MoversProps) {
  // Two ids rather than one, because two lists on one screen each need their
  // own — and `useId` rather than a literal for `Panel`'s own reason: the same
  // component can be on a page twice.
  const gainersHeadingId = useId();
  const losersHeadingId = useId();

  return (
    <>
      {/*
       * **The first heading carries no rule and no padding-top**, because
       * `Panel`'s own `--rule-strong` is 32 px above it and a hairline a
       * hairline away from the structural rule is a second line nobody asked
       * for.
       */}
      <h3 className={cx(styles.head)} id={gainersHeadingId}>
        {GAINERS}
      </h3>
      <RankedList
        rows={withHeldRows(view.gainers)}
        bar={NO_BAR}
        name={{ labelledBy: gainersHeadingId }}
        quietGroup="impossible"
      />

      {/*
       * **The second heading carries `--rule-control` and `--space-8`**, which
       * is the heavier of the stylesheet's two rules, because it separates two
       * **lists** rather than two rows. The sector region's trailing heading
       * uses the same rule for the same reason — and the difference between the
       * two regions is everything *below* the rule, not the rule itself.
       */}
      <h3 className={cx(styles.head, styles.headSecond)} id={losersHeadingId}>
        {LOSERS}
      </h3>
      <RankedList
        rows={withHeldRows(view.losers)}
        bar={NO_BAR}
        name={{ labelledBy: losersHeadingId }}
        quietGroup="impossible"
      />

      {/*
       * **The footer's room, held and empty** — Task 4.5.6 writes the sentence.
       *
       * Two lines at every width, which is `SectorPerformance.claim`'s measured
       * departure from its drawing and is taken here for the same mechanism
       * rather than for symmetry: the clause's length is a function of values
       * that move — a window on one basis, a session date on the other, and two
       * counts — so a one-line reserve would make the region's height depend on
       * which sentence is true, and at 390 the grid row is content-sized so the
       * whole lower page would step.
       *
       * Reserved **now** rather than when the words arrive, because the height
       * budget this region was sized against includes it: 44 px of the 466.
       */}
      <p className={cx(styles.claim)} />
    </>
  );
});

/**
 * **The region head's right-hand slot: what the lists are a selection of.**
 *
 * `Top 5 each way` states the **bound**, which is the one thing about this
 * region that is true in every state and is not a claim about data: five is the
 * height budget (see `MOVERS_PER_SIDE`), and a short list is short because the
 * market was one-sided rather than because the slot said something false. What
 * the lists were computed **over** is a different and much sharper fact, and it
 * is the footer's — Task 4.5.6's denominator, where `of the N we track, M were
 * heard from` is written in one place and read off the frame.
 *
 * **The count is not here, deliberately.** `N of 11 ranked` already occupies
 * this slot one region up, and a second `N of M` badge 200 px away at a
 * different denominator over a different set is two correct badges reading as
 * one pattern — `BreadthLedger`'s own refusal, inherited.
 *
 * **The five is interpolated, never typed**, which is `the-population-is-never-
 * a-literal`'s rule applied one scale down: a badge saying five over six rows
 * is a lie with no symptom.
 *
 * The slot reserves the width of **Task 4.5.7's `ORDER HELD` badge** as well as
 * its own string, so the head cannot move when the badge appears — the defect
 * Task 4.3.6 found in a browser, where a four-pixel taller badge moved all
 * eleven rows on pointer enter. The badge itself is not built here.
 */
export const MoversMeta = memo(function MoversMeta() {
  return (
    <span className={cx(styles.slot)}>
      <span className={cx(styles.bound)}>
        {`Top ${String(MOVERS_PER_SIDE)} each way`}
      </span>
    </span>
  );
});

/**
 * **The paint before the first frame: the region's geometry, held and
 * invisible** — `BreadthLedgerReservation`'s shape, one region across.
 *
 * It is the real component from `RESERVED_MOVERS` rather than a measured box,
 * for that component's recorded reason: the height it holds is two headings,
 * ten rows, a rule and a two-line claim, and **every one of those numbers
 * already exists exactly once**. A `min-height` here would be a second home for
 * all four, wrong the first time any of them changes and wrong *silently*,
 * because nothing below `pnpm e2e` computes a layout.
 *
 * `visibility: hidden` plus `aria-hidden`, never `display: none` — which is the
 * entire point — and the reserved rows **name no security**, because a movers
 * list's membership is an answer rather than a roster.
 */
export const MoversReservation = memo(function MoversReservation() {
  // **The floor is the proxy strip's own and not a fourth one.** The
  // reservation is right for the case it was written against — a first frame
  // measured at 174–277 ms, so the hold is a flash nobody sees. It is wrong for
  // the case a reader actually meets: an unreachable aggregate, a half-rolled
  // deploy, a proxy holding the socket open. Task 4.3.8 produced exactly that
  // for `Sector performance` — a titled, empty, full-height box, byte-identical
  // at 600 ms and at 12 s — and this region would have inherited it.
  const waited = useWaited(true);

  /*
   * **Two boxes rather than one, and the nesting is the decision.** The held
   * geometry keeps `visibility: hidden` and `aria-hidden` of its own, in every
   * state; the sentence is a **sibling** in the room that box is holding.
   *
   * The one-box version — `visibility: visible` back on the same element once
   * the floor elapses — is the obvious shape and it **un-hides the geometry
   * with it**, because `visibility` is inherited by children that never set it.
   * It was a live defect for ten days on the sector region and it leaked
   * internal slugs into the accessibility tree; `BreadthLedgerReservation` is
   * the corrected shape and this is a third copy of it rather than a fourth
   * idea.
   */
  return (
    <div className={cx(styles.reservedRoom)}>
      <div className={cx(styles.reserved)} aria-hidden="true">
        <Movers view={RESERVED_MOVERS} />
      </div>
      {waited ? (
        <p className={cx(styles.nothingArrived)}>{NOTHING_ARRIVED}</p>
      ) : undefined}
    </div>
  );
});
