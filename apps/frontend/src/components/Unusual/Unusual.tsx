import { memo, useId } from "react";

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
// The answer is that **the noun moves to the list heading and the figure stays
// on the row**, once for the region rather than ten times down the column.
//
// ## THE FIGURE IS THE COMPOSITE SCORE SINCE TASK 5.6.7
//
// It was the price percentile — one factor of three, drawn `>99th` and spoken
// `>99th percentile`. It is now `scoreAnomaly`'s 0–100 score with its band as
// a chip beside it, which is the region and the security page finally agreeing
// about what is ranked. Three things followed and all three are measured:
//
//   - **The score is shorter than the ordinal**, so the figure track went
//     64 → 44 — and that paid for less than half the chip. The rest came out
//     of the **name**, which resolves to 57 px at 1440 against 125 before.
//     `RankedList.module.css`' `.unusual` carries the arithmetic at all four
//     widths and the hierarchy that makes it survivable: the ticker is the
//     identifier and never ellipsises, the name is the confirmation and does.
//   - **The drawn and spoken strings are now the same string**, because a
//     score has no long form — so the cell renders one element rather than
//     putting `61` in `textContent` twice. The scale a reader cannot see from
//     the figure (`max 75`) is in the footer once, which is the cohort rule's
//     own doing.
//   - **The region's own heading changed with the figure**, because it names
//     the comparison and the comparison is a different one.
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
//   - **No band chip on the row — the band is in the HEADING, once.** Story
//     5.4's Gate 1 refused a chip because this region ranked one factor of
//     four; Task 5.6.7 met that condition with the composite and drew one in
//     a fifth track; **the owner removed it the same day, on a measurement,
//     and the reasoning is the chip's own argument carried one step further.**
//     Its stated condition was *a quiet day's top five all `elevated` and a
//     wild day's all `extreme`* — at which point *the chip stops being a
//     property of the selection and becomes a property of the day*. That is
//     exactly what happened: **1 distinct band in the top ten** against the
//     stored composites (16 `extreme` securities in the whole universe), all
//     ten rows sharing one band in **35 of 77** instants and more than three
//     sharing one in **77 of 77**. A property of the day is stated **once**,
//     not ten times down a column — and at **76 px of a 308 px row, 25%**,
//     the ten repetitions were paid for by the company name, which fell to
//     57 px: `Dominio…`, `The Kra…`, `3M Co…`.
//
//     So the band word now sits in the head slot beside `Top 10` —
//     `unusual-activity.ts`' `boundOf`, which carries the wording, the two
//     sentences and the width measurement behind them — **written, never
//     abbreviated** (the ramp's greyscale steps are 1.12 / 1.43 / 1.59,
//     enough to see a change and nowhere near enough to name one) and **with
//     no fill at all**. The second channel the chip provided is still there
//     and is now the heading rather than a colour.
//
//     **And the consequence the original refusal recorded is withdrawn with
//     it: there is no amber on `/` again.** `market.css` resolves
//     `--anomaly-high`, `--feed-stale`, `--service-degraded` and
//     `--provenance-synthetic` all to `--palette-amber`, so a chip here would
//     put this region and the chrome's degraded words in one hue on one
//     screen. The head slot carries the word in `--ink-secondary` and spends
//     none of the ramp, which `amber-appears-once-in-the-rail` also enforces:
//     `AnomalyBadge.module.css` is the only shipped stylesheet allowed to
//     read it. **The collision stays Story 5.6's and is unreachable from `/`**
//     — Task 5.6.8 photographs it on the security page, where the chip is.
//   - **No quiet group and not even its reserve.** The list's set **is** the
//     ranking's output — the producer builds no row for a refused security and
//     carries no unranked tail — so the group has zero members in every state
//     there is, and its 25 px heading would cost a row.
//   - **No feed line, no tape and no instant of its own.** The footer states
//     three populations, the cut, the **scale** and the age (Task 5.4.4, with
//     the scale added at 5.6.7) and says nothing about where the figures came
//     from: the score's numerator is `iex` and both its baselines are `sip`,
//     and that pair is the screen's source note's — one note for the screen,
//     because a region-level feed line is the `BarSeriesPanel` duplicate this
//     product deleted.
//   - **No fourth footer line.** The footer reserves **four** micro lines and
//     the lead clause plus the age line already fill them at 308 px, so the
//     cohort's scale is absorbed into the **cut** sentence rather than given
//     one of its own. A fifth line steps the whole lower page at 390, in the
//     one region that must not step.
//   - **No per-row scale, and no per-row explanation.** Every drawn row
//     shares the ranked cohort by construction — that is what the cohort rule
//     buys — so `2 of 3 · max 75` is a fact about the **region**. The
//     clause-per-factor ledger is the security page's, which every row's
//     ticker opens: §11's *a score carries its explanation* met at the grain
//     each surface can hold, rather than by a popover a reader has to ask.
//
// ## And the arrival disc keeps its shipped meaning
//
// It fires when **a bar arrives for that security** and on nothing else. The
// figure here was already the first in this product that can change with **no
// bar for its security at all** — its peers moved, or the window rolled — and
// the composite makes that **stronger**, not weaker: its excess factor is a
// difference against a sector benchmark, so a security's score moves when the
// benchmark prints a minute and the security does not. A second meaning for
// one mark is this product's most-repeated defect. The right repair for *why
// did these rows move* is the `ORDER HELD` badge; it is not the disc.

/**
 * **The list's heading: what the rows are ranked by, named once.**
 *
 * Sentence case in the DOM and uppercase on screen — `Movers`' rule and
 * `microLabel`'s, and it is not a preference: a string stored uppercase is a
 * string some screen readers spell out a letter at a time.
 *
 * **It names the comparison rather than repeating the region's name**, which
 * is what moving the noun off the row bought. It is also what makes the
 * ordinary state readable: a full list of `18`, `14`, `11` is the honest
 * answer *nothing is unusual right now*, and a reader can only take that from
 * it if they know what the figures are **of** and what the scale **is**.
 *
 * **It states the range, where the percentile heading it replaced stated the
 * history.** `0 to 100` is the structural ceiling rather than the one this
 * tree reaches — two factors cap at 75 — and that is deliberate: the scale a
 * row's score was actually computed over is the **cohort's** and belongs in the
 * footer with its denominators, while the heading says what kind of figure this
 * column holds. A heading reading `0 to 75` would be a constant that silently
 * becomes false the day a volume distribution is stored, which is exactly the
 * guess `AnomalyBadge` refused to make about the band boundaries.
 *
 * `to` rather than an en dash, because this string is spoken: a range written
 * with a dash is read aloud as a subtraction or as nothing at all by different
 * readers, and `0 to 100` is the one spelling every reader says the same way.
 *
 * **The long form is the string and the narrow widths are a rendering of it**
 * — one line, `text-overflow: ellipsis` — rather than two strings behind a
 * breakpoint.
 *
 * The named form rather than a paraphrase (`how unusual this is against the
 * company's own normal`): this product's rule is that a figure is **named**
 * rather than described, and the paraphrase belongs in the security page's own
 * explanation — which every row of this region links to.
 */
const RANKED_BY = "Composite anomaly score, 0 to 100";

/**
 * **Hoisted so the prop identity is stable**, and `figure: "score"` is the
 * decision rather than a default — see `RankedListBar`, where the 92 px of
 * dead track it closes is measured, and where the rename from `"ordinal"` at
 * Task 5.6.7 is argued: the same track now holds a different quantity, so the
 * word changed to put a compile error at every call site rather than let one
 * compile against a meaning that had moved underneath it.
 */
const SCORE_AND_NO_BAR: RankedListBar = { kind: "none", figure: "score" };

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
          bar={SCORE_AND_NO_BAR}
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
       *
       * **Written by Task 5.4.4, into the room sized for it** — and measured
       * rather than assumed: the drawn sentence is three lines at 308 px and
       * the age is the fourth, so the reserve is spent exactly and the region
       * is the height it already was.
       *
       * **It may never carry `aria-hidden`.** Three of this region's siblings
       * legitimately do — `RankedList`'s `.rules` and `.ladder` — so sweeping
       * the attribute onto a footer sitting among them is the plausible edit,
       * and here it would leave the region's **only** denominator unreachable
       * by a listener with the DOM still correct. This region prints no
       * denominator anywhere else: there is no ladder, and the head slot
       * states the bound rather than a count.
       */}
      <p className={cx(styles.claim)}>
        {view.claim === undefined ? undefined : view.claim.drawn ===
          view.claim.spoken ? (
          /*
           * **One string, so one element** — `Movers`' and `BreadthLedger`'s
           * decision at the same element, and the state this region is in
           * today: it draws no ladder and prints no denominator, so the drawn
           * half has nothing to defer to. Splitting an identical string
           * across a hidden span and a spoken one would put it in
           * `textContent` twice.
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
 * ## And since the chip came off the row it carries TODAY'S BAND beside it
 *
 * `Top 10 · all extreme`, or `Top 10 · led by extreme` where the ten do not
 * share one. The string is the **view's** — `unusual-activity.ts`' `boundOf`,
 * which carries the measurement that decided the wording and the width it had
 * to fit — rather than derived here, for `UnusualActivity.nothing`'s reason:
 * the reservation renders this component inside a hidden box and a hidden
 * string is still in `textContent`.
 *
 * It is **a word and not a fill**: the band's name is the channel, the head
 * spends none of the anomaly ramp, and `/` is back to having no amber on it.
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
      ) : view.bound === undefined ? undefined : (
        <span className={cx(styles.bound)}>{view.bound}</span>
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
