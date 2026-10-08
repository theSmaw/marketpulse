import { memo, useId, type ReactNode } from "react";

import { MOVERS_PER_SIDE } from "@marketpulse/shared";

import { cx } from "../../cx.js";
import {
  RESERVED_MOVERS,
  rowsInPinnedOrder,
  withHeldRows,
  type MarketMovers,
} from "../../market/index.js";
import { useWaited } from "../MarketProxyStrip/use-waited.js";
import { OrderHeldBadge } from "../OrderHeldBadge/OrderHeldBadge.js";
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
//   - ~~**No denominator sentence.**~~ **It arrived 2026-10-08 (Task 4.5.6)**,
//     in the room this task reserved and in the element this task drew: the
//     footer states what the lists were ranked over, in the grammar of the
//     basis the wire sent, with every figure read off the frame. Beside it came
//     the one-sided market's two sentences — `None of the names we measured
//     rose.` — and the head slot's suppression at a set of none.
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

/**
 * **One side's room, with the sentence that explains it when it is empty** —
 * the one-sided market, Task 4.5.6.
 *
 * ## Why the sentence is laid OVER the list rather than above it
 *
 * The list keeps its five rows in every state — `withHeldRows` pads it, so the
 * room is the row pitch times five and the pitch has exactly one home, in
 * `.row`. A sentence placed **above** the `<ol>` would add a sixth line to the
 * region's 466 px against a 486 px box, and at 768 and 390 the grid row is
 * content-sized, so the whole lower page would step the moment a market went
 * one-sided. Laid over the held rows it costs nothing: the room is already
 * reserved and already empty.
 *
 * It is `MoversReservation`'s two-box shape rather than a fourth idea — the
 * positioned parent holds the room, the sentence is an absolutely-positioned
 * sibling — and the held rows keep their own `aria-hidden`, so a listener
 * reaches the heading and then the sentence with nothing between them.
 *
 * `undefined` draws no element at all. The wrapper is unconditional, because a
 * `position: relative` that comes and goes is a containing block that comes and
 * goes.
 */
const EmptySide = memo(function EmptySide({
  sentence,
  children,
}: {
  readonly sentence: string | undefined;
  readonly children: ReactNode;
}) {
  return (
    <div className={cx(styles.side)}>
      {children}
      {sentence === undefined ? undefined : (
        <p className={cx(styles.empty)}>{sentence}</p>
      )}
    </div>
  );
});

export interface MoversProps {
  /** The two ends, from the movers section of the overview frame (Task 4.5.4). */
  readonly view: MarketMovers;
  /**
   * **The order a reader is holding — ONE pin across BOTH lists**, from
   * `useOrderHold`, absent while nothing is held (Task 4.5.7).
   *
   * ## One pin, two lists, and why that is not a compromise
   *
   * The route pins `[...gainers, ...losers]`, so gainers occupy indices
   * `0..N-1` and losers `N..2N-1`, and each list below applies the **same** pin
   * to itself. Neither list's internal order is perturbed by the other's
   * presence in it, because `rowsInPinnedOrder` only ever reads the positions
   * of the symbols it was handed.
   *
   * **Precondition: the two lists are disjoint**, or the pin's `Map` collides
   * on a symbol and last-write-wins silently reorders a row. It holds by
   * construction — Gate 1's direction-matching rule means a name is in at most
   * one end — and it is **asserted rather than assumed**: at the producer by
   * `readMovers`, and at the reader by `Movers.test.tsx`.
   *
   * ## There is no per-list hold, and that is the decision rather than a limit
   *
   * `Region.onReaderWithin` combines non-bubbling `pointerenter`/`pointerleave`
   * on the region box with bubbling `focusin`/`focusout`, so the signal is the
   * **region's**. A list-scoped hold would need listeners on each `<ol>` — and
   * it is row scoping one level up: it lets the losers list move out from under
   * a pointer that is **approaching** it diagonally across the region, which is
   * the failure the whole treatment exists to prevent. One badge in the head
   * says *this region's order*, for the same reason the region's name says
   * *this region*; a badge per list is two speakers who can disagree.
   */
  readonly pinned?: readonly string[] | undefined;
}

export const Movers = memo(function Movers({ view, pinned }: MoversProps) {
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
      <EmptySide sentence={view.gainersEmpty}>
        <RankedList
          /*
           * **The pin first, the padding second**, and the order is a
           * correctness requirement rather than a style: `withHeldRows`' pads
           * are keyed on a run of non-breaking spaces and are positional, so a
           * pin applied after them would place real rows around invented ones.
           * The pin is over the REAL rows only — it is taken from the view, and
           * a pad is geometry the reader never saw.
           */
          rows={withHeldRows(rowsInPinnedOrder(view.gainers, pinned))}
          bar={NO_BAR}
          name={{ labelledBy: gainersHeadingId }}
          quietGroup="impossible"
        />
      </EmptySide>

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
      <EmptySide sentence={view.losersEmpty}>
        <RankedList
          rows={withHeldRows(rowsInPinnedOrder(view.losers, pinned))}
          bar={NO_BAR}
          name={{ labelledBy: losersHeadingId }}
          quietGroup="impossible"
        />
      </EmptySide>

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
      <p className={cx(styles.claim)}>
        {/*
         * **The denominator, and it is the ranking's honesty rather than a
         * caption** (Task 4.5.6).
         *
         * A top five computed over 446 of 503 looks exactly as confident as one
         * computed over all of them, which is `EPIC.md`'s *an aggregate is the
         * one kind of number that can be wrong while looking right* in its
         * sharpest form. So the region states what it was ranked over, in the
         * grammar of the basis the wire sent, with the window and the set read
         * off the frame — `moversClaimOf` builds both renderings in one place.
         *
         * **It may never carry `aria-hidden`.** Three of this region's
         * siblings legitimately do — `RankedList`'s `.rules`, its `.ladder`,
         * `BreadthLedger`'s `.headlineRule` — so sweeping the attribute onto a
         * footer that sits among them is the plausible edit, and it would leave
         * the only denominator in the region unreachable by a listener while
         * the DOM stays correct. `the-ranking-states-its-own-denominator`
         * refuses it, and the accessibility tree is the only instrument that
         * can see it.
         */}
        {view.claim.drawn === view.claim.spoken ? (
          /*
           * **One string, so one element** — `BreadthLedger`'s decision at the
           * same element, and the state this region is in today: it draws no
           * ladder and prints no denominator, so the drawn half has nothing to
           * defer to and the two renderings are equal. Splitting an identical
           * string across a hidden span and a spoken one would put it in
           * `textContent` twice, which reads as a duplicate to anything walking
           * the DOM.
           */
          view.claim.drawn
        ) : (
          <>
            <span aria-hidden="true">{view.claim.drawn}</span>
            <span className={cx(styles.spoken)}>{view.claim.spoken}</span>
          </>
        )}
      </p>
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
export const MoversMeta = memo(function MoversMeta({
  view,
  held,
}: {
  readonly view: MarketMovers;
  /**
   * From `useOrderHold`. **The same value that pins the order both lists
   * draw** — so there is no state in which the head says `ORDER HELD` over a
   * region that is re-ordering, which is `docs/GAPS.md` entry 13's sibling
   * defect one region up and the reason this is one piece of state rather than
   * two.
   */
  readonly held: boolean;
}) {
  /*
   * **It falls silent when nothing was selected** — Task 4.5.6's decision, on
   * `SectorPerformanceMeta`'s precedent one region up, which speaks only in
   * the mixed state.
   *
   * `Top 5 each way` states the **bound** and is not false with nothing in the
   * lists. But in that state it is the only text on the screen besides two
   * empty headings and the footer's sentence, and it reads as a claim about a
   * selection that selected nothing — two true halves and one contradiction,
   * which is `docs/GAPS.md` entry 13's own shape. The footer says what is
   * actually true there: *of the 503 we track, none were heard from in the
   * last 5 minutes — there is nothing to rank.* A bound stated over that is
   * noise beside it.
   *
   * A **short** list keeps the badge, which is the same judgement taken the
   * other way: five gainers and no losers is a one-sided market rather than an
   * absent answer, and the bound is exactly the fact that tells a reader the
   * list is not truncated.
   *
   * The slot's room is reserved by `.slot` rather than by either string, so
   * nothing moves when the badge goes — which is also what will let Task
   * 4.5.7's `ORDER HELD` arrive without taking the head four pixels taller.
   */
  const selected = view.gainers.length > 0 || view.losers.length > 0;

  return (
    <span className={cx(styles.slot)}>
      {/*
       * **The badge wins the slot while a reader is in the region** (Task
       * 4.5.7), which is `SectorPerformanceMeta`'s precedent unchanged: the two
       * strings are one idea — *what this region is doing* — and the louder one
       * is the one that is only true for as long as somebody is reading.
       *
       * The slot reserves the wider of the two in the stylesheet, so neither
       * moves the other and the head cannot grow on pointer enter.
       */}
      {held ? (
        <OrderHeldBadge />
      ) : selected ? (
        <span className={cx(styles.bound)}>
          {`Top ${String(MOVERS_PER_SIDE)} each way`}
        </span>
      ) : undefined}
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
