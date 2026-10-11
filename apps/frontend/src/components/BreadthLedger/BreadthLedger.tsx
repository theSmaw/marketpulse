import { memo, useId } from "react";

import { cx } from "../../cx.js";
import {
  RESERVED_BREADTH,
  type BreadthBucket,
  type MarketBreadth,
} from "../../market/index.js";
import { useWaited } from "../MarketProxyStrip/use-waited.js";
import { PriceChange } from "../PriceChange/PriceChange.js";
import styles from "./BreadthLedger.module.css";

// **The breadth ledger** — three rows of `label · count · band` from a common
// origin on one scale, the remainder below a rule, and one headline figure
// above (Task 4.4.5, `The breadth ledger.dc.html`).
//
// ## A SIBLING of `RankedList`, not a third use of it
//
// It takes that component's geometry whole — a fixed label track, a fixed
// figure track, a `minmax(0, 1fr)` band, one 6 px band in the row's line box,
// one full-height origin rule behind the bands, a printed ladder and a trailing
// quiet group below a rule — and shares none of its code, deliberately.
//
// `RankedList`'s row is `symbol` / `rank` / `move` / `absent` / `arrival` over a
// `SectorRow`, and **breadth has no symbol, no rank, no signed percentage and a
// different scale**. Widening it to cover both would put a union inside it and
// start exactly the drift its own header was written to prevent — and the two
// lists are never on screen at the same size, so nobody would ever see both
// versions together to notice. What keeps them in step instead is that they are
// the same shape in two stylesheets whose arithmetic is stated and measured:
// *a reader who has learned one has learned the other*.
//
// The one visible difference is **where the origin is** — central on the ranked
// list, because a sector move is signed; **left here, because a count is not**.
//
// ## Four things it deliberately does not have
//
// **No glyph in the ledger.** `PriceChange` owns the pairing of a direction
// with a glyph, a hidden spoken word and an ink, and the row's *label* is its
// direction channel — a word, at `--font-weight-medium`, in 80 px of fixed
// track. A glyph beside `Advancing` would be a third rendering of a fact the
// label already states and the band already repeats, and spoken,
// `Advancing up 284` is the redundancy audible. The headline **borrows** the
// one glyph in the region rather than spelling it: a `SignedCount` sibling of
// `PriceChange` would be a second `DIRECTION_GLYPH` table.
//
// **No band on the trailing row.** It is not on the 0–N scale — the three
// bands partition N and the remainder is part of the set — so a fourth band
// from the same origin on the same track would assert a four-part whole that
// does not exist: three sum to N, the fourth to the set, and they reconcile
// only by changing the whole half-way down the list. Two true halves and one
// contradiction, which is `docs/GAPS.md` entry 13's sibling arriving by the one
// door this region has. `--chart-uncovered` was argued for the job and refused
// twice over: it measures **1.108:1** on the raised ground and **1.00:1** on
// the sunken one against a 3:1 floor, and there is no band to put it on.
//
// **No anchor tick.** The ranked list needs one because a sector row with no
// reading and a sector row reading `0.00%` sit adjacent in the same list under
// the same heading, so a mark has to carry the distinction. Breadth has the
// **structural** difference instead — `Unchanged 0` is in the ledger, above the
// rule, with a band track that is present and empty; the remainder is in a
// second `<dl>` below the rule under its own heading with no band track at all.
// Six channels tell them apart (§06) and not one of them is colour.
//
// **No motion.** *Work in progress LOOPS, a state PERSISTS, a fact arriving
// DECAYS* — and a breadth count is a **state of the market**, so the rule's own
// middle clause decides it before anything else is considered. The harder half
// is that the arrival mark's meaning is **per security** and breadth has none:
// a disc beside `Advancing` could only mean *the aggregate was recomputed*,
// which is bookkeeping, and `OverviewSourceNote` has already refused to
// announce exactly that in its own words. So no mark, no transition on a
// band's width, and **no reserved slot** — the reversal trigger is a condition:
// the first time this region carries a per-security fact.
//
// ## Two `<dl>`s, never an `<ol>` and never a `<table>`
//
// Every row is a label and the thing it labels, which is what `dt`/`dd` says
// without a landmark, an ARIA attribute or a heading — the shipped idiom of
// both `SourceNote` and `OverviewSourceNote`. An `<ol>` would be *a false claim
// made by markup* (the ranked list's own words): there is no ranking here, and
// a screen reader announcing *item 2 of 3* would assert a rank over three facts
// that have none. A `<table>` would hand a listener a row-and-column grid for
// something with one axis, and would need a column header for the band, which
// is not data.

/** The ink on each band — keyed on the **bucket**, never on a direction. */
const BUCKET_BAND: Readonly<Record<BreadthBucket, string | undefined>> = {
  advancing: styles.advancing,
  declining: styles.declining,
  unchanged: styles.unchangedBand,
};

/**
 * What the headline figure is, said once above it — **and it drops its
 * direction at the one value where that direction is denied.**
 *
 * It prints the one thing the three rows do not — *how one-sided* — and it
 * cannot disagree with them, being `advancing − declining` over two of the
 * three counts the same value produced.
 *
 * ## Why there are two captions — the owner's call, 2026-10-08
 *
 * `Net advancing` is the measure's **name**, and a name that holds at every
 * value is the ordinary way to label one: a thermometer stays labelled
 * *temperature* at zero. But Task 4.4.8's produced state grid drew the value
 * where the name reads as a claim rather than as a label — at
 * `advancing === declining` the headline said **`NET ADVANCING`** over
 * **`— unchanged 0`**, a caption naming a direction the figure beneath it
 * denies. **Two of the eighteen states reach it** (`09` at N = 2 and `12` at
 * 220/220/11) and **neither had ever been drawn** before that walk; every
 * channel was individually correct, which is exactly why nothing mechanical
 * found it.
 *
 * Put to the owner at Gate 2 against *leave it* and against replacing the
 * figure with `evenly split`. The owner chose the neutral caption: **the
 * caption loses its direction, and only at zero.** The figure, the glyph and
 * the word are untouched — they already said `unchanged` — so this is one
 * word changing in one state rather than a second shape for the headline.
 *
 * ## The cost, stated because it is real
 *
 * **The caption now changes under the reader as well as the figure.** On a
 * live feed `advancing − declining` can cross zero, so a reader watching the
 * region sees the label itself flicker between `NET` and `NET ADVANCING` at
 * the crossing. That was the argument for *leave it* and it was heard. It is
 * bounded by how rarely an exact tie occurs across 503 names, and by the fact
 * that the two captions share their first word and their position.
 *
 * **Reversal trigger**: the first sighting of the caption changing more than
 * once in a sitting — which is a thing only the live rehearsal can report, and
 * is written into this story's `LIVE-REHEARSAL.md` row.
 *
 * ## Why the pivot is `direction` and not the digits
 *
 * `direction` is `directionOf(net) ?? "unchanged"`, the one shared comparator
 * (Task 4.4.2), and it is **the same value `PriceChange` renders the word
 * from**. So the caption and the word beneath it cannot disagree: there is no
 * second test of *is this zero* to drift out of step with the first. Reading
 * the digits instead — `change === "0"` — would be that second test, and it
 * would be the defect `one-direction-one-home` exists to forbid.
 */
const NET_CAPTION = "Net advancing";

/**
 * The caption at a net of zero: the measure's name with its direction removed.
 *
 * Not `Net unchanged` — that would be a second word for what the figure beside
 * it already says, and it would read as a count of unchanged securities, which
 * is the `Unchanged` row three lines below. `Net` alone names the quantity and
 * claims nothing about its sign.
 */
const NET_CAPTION_AT_ZERO = "Net";

/**
 * Which caption the headline carries, keyed on the figure's own direction.
 *
 * `undefined` is no headline at all (N = 0, nothing to subtract), and the
 * caller suppresses the whole block there, so the value this returns is never
 * read in that state — it is given the neutral caption rather than a
 * directional one anyway, because a held element should not hold a claim.
 */
function captionFor(net: MarketBreadth["net"]): string {
  return net === undefined || net.direction === "unchanged"
    ? NET_CAPTION_AT_ZERO
    : NET_CAPTION;
}

/**
 * **What this region has none of, when nothing ever arrives** — Task 4.4.6,
 * reusing `useWaited` rather than inventing a second floor.
 *
 * ## The words are breadth's own
 *
 * `MarketProxyStrip` says `No prices yet.` and `SectorPerformance` says `No
 * sector moves yet.`, each naming the quantity it draws. Breadth draws neither:
 * a count of securities is a **third** quantity, so saying *prices* or *moves*
 * here would name something this region has never shown. Three sentences, three
 * nouns, one per region — which is also what tells a reader which region went
 * quiet when two of them do at once.
 *
 * ## And it is a different state from `measured: 0`
 *
 * *We counted and heard nothing* has a count — zero — and a basis saying which
 * question was asked, so it draws the denominator sentence
 * ({@link MarketBreadth.claim}) and the quiet group's real figures. **This**
 * state has no frame at all: no basis, no set size, no window and nothing to
 * subtract, which is why its sentence can only say that there is no count. The
 * two look identical on screen and must not read identically — the brief's
 * third look-alike.
 */
const NOTHING_ARRIVED = "No count yet.";

export interface BreadthLedgerProps {
  /** The counts, the scale and the strings, from `marketBreadth`. */
  readonly view: MarketBreadth;
}

export const BreadthLedger = memo(function BreadthLedger({
  view,
}: BreadthLedgerProps) {
  const quietHeadingId = useId();

  /*
   * **At N = 0 the ledger, the ladder and the headline are all suppressed, and
   * their room is kept** — ADR 0029 in the state where it matters most.
   *
   * Three rows reading `0 0 0` against a scale whose endpoints are both `0` is
   * a fully-formed partition over zero observations: a false impression rather
   * than a courtesy, and a 0–0 scale is undrawable anyway. What is left is the
   * quiet group, which in that state carries the whole truth — the set, and the
   * fact that none of it has been heard from.
   *
   * It is reachable rather than theoretical: the measured five-minute minimum
   * during a session was 5 of 518, so this is an extended-hours or dead-feed
   * state — and it is **CI's permanent state**, where the store holds 518
   * securities and zero bars.
   *
   * `visibility` rather than `display`, which is the entire point: the region's
   * height may not depend on whether anything has been counted.
   */
  const counted = view.measured > 0;

  /*
   * **Whether a proportional PICTURE may be drawn, which is a narrower
   * question than whether anything was counted** (Task 4.4.6).
   *
   * `scale` is `undefined` at N = 0 and at N = 1, and the second one is the
   * interesting case: the arithmetic is sound and the picture lies. One
   * security in one bucket is a fraction of `1`, which draws a band across the
   * **whole** track — *the market is entirely advancing*, from one name. The
   * count beside it says `1`, and `MarketBreadth.scale` records why that is not
   * enough: what a reader takes from a band is proportion, and a full track is
   * the strongest proportional claim the shape can make.
   *
   * So the bands, the origin rule and the printed ladder go together, as one
   * decision with one trigger, and their room is held exactly as it is at
   * N = 0. The three counts stay: `Advancing 1 / Declining 0 / Unchanged 0` is
   * what we know, and the ledger's whole argument is that the count is the
   * claim and the band is a picture of it.
   */
  const scaled = view.scale !== undefined;

  return (
    <div className={cx(styles.plot)}>
      <div className={cx(styles.headline, counted ? undefined : styles.held)}>
        <p className={cx(styles.headlineCaption)}>{captionFor(view.net)}</p>
        <p className={cx(styles.headlineFigure)}>
          {view.net === undefined ? undefined : (
            <PriceChange
              change={view.net.change}
              direction={view.net.direction}
            />
          )}
        </p>
      </div>
      {/*
       * **The rule goes with the headline it separates** (Task 4.4.6). At
       * N = 0 the headline above it and the ledger below it are both suppressed
       * and a hairline across an otherwise empty box is a divider between two
       * things that are not there — the same ADR 0029 clause as the figures,
       * one element over. `.held` rather than removal, so the 1 px and its
       * 16 px margin stay in the budget.
       */}
      <div
        className={cx(styles.headlineRule, counted ? undefined : styles.held)}
        aria-hidden="true"
      />

      {/*
       * **The origin rule: one element for the whole ledger**, a grid item in
       * the band's column spanning the three rows, so it is exactly as tall as
       * the list and exactly as wide as the bands without restating the
       * 135 px the tracks already add up to.
       *
       * It **stops above the quiet row**, which is one of the six channels
       * telling a reading of zero apart from a row we have heard nothing about
       * — and it does the anchor tick's job for free, being full-height and
       * already present in every row.
       */}
      <div
        className={cx(styles.rules, scaled ? undefined : styles.held)}
        aria-hidden="true"
      >
        <span className={cx(styles.origin)} />
      </div>

      <dl className={cx(styles.ledger, counted ? undefined : styles.held)}>
        {view.rows.map((row) => (
          <div className={cx(styles.row)} key={row.bucket}>
            <dt className={cx(styles.label)}>{row.label}</dt>
            <dd className={cx(styles.count)}>{row.count}</dd>
            <dd className={cx(styles.band)} aria-hidden="true">
              {/*
               * **A count of zero draws no band at all** — the row is present,
               * labelled, counted `0`, above the rule, and the origin rule runs
               * through its empty band cell, which is what says this row has a
               * reading and the reading is none.
               *
               * The length is the only inline style in the component, for
               * `RankedList`'s reason: it is the one value that is a function
               * of the data rather than of the design. The 2 px floor is the
               * stylesheet's, and it is load-bearing at this granularity —
               * 0.384 px a security at 1440.
               */}
              {row.fraction === undefined || row.count === 0 ? undefined : (
                <i
                  className={cx(styles.fill, BUCKET_BAND[row.bucket])}
                  style={{ width: `${String(row.fraction * 100)}%` }}
                />
              )}
            </dd>
          </div>
        ))}
      </dl>

      {/*
       * **The printed ladder: two endpoints and nothing between them.**
       *
       * A length is a claim about a quantity, so the quantity is printed — and
       * the right endpoint is **N**, which makes printing the scale and stating
       * the denominator one act. There is no mid rung, neither labelled nor
       * drawn: half of N is a half-integer in almost every session, and an
       * unlabelled gridline on a two-endpoint scale invites a reader to read a
       * value off it.
       *
       * `aria-hidden`, which is the ranked list's decision at its own ladder —
       * and the consequence is recorded rather than hidden: **N reaches no
       * listener from this element**, and the sentence that carries it to one is
       * Task 4.4.6's denominator grammar, whose own shape is *of the N we
       * track, M were heard from*.
       */}
      <div
        className={cx(styles.ladder, scaled ? undefined : styles.held)}
        aria-hidden="true"
      >
        <span className={cx(styles.tick, styles.tickZero)}>0</span>
        <span className={cx(styles.tick, styles.tickFull)}>{view.scale}</span>
      </div>

      {/*
       * **The trailing quiet group** — the `Not ranked` idiom Task 4.3.7
       * shipped, with two departures, both of which are about what the cell
       * holds.
       *
       * Its heading is **always drawn rather than reserved**, because this
       * group's membership is fixed at one: the set always has a size and the
       * remainder is always a number, so there is no state in which the group
       * is absent and no 25 px to hold against a state that cannot happen.
       * 4.3.7 had to reserve its heading because a sector list's quiet group
       * has between nought and eleven members.
       *
       * And **the count column crosses the rule**. 4.3.7's quiet row spans its
       * figure cell to the end of the row and left-aligns, because that cell
       * holds a *sentence* and a column sized for a figure is not sized for one.
       * This cell holds a count of the same kind and width as the three above
       * it, and the alignment is the point: four right-aligned integers in one
       * column is what makes the two sums checkable by eye. Spanning it would
       * hide the arithmetic the shape was chosen for.
       */}
      <h3 className={cx(styles.quietHead)} id={quietHeadingId}>
        {view.setHeading}
      </h3>
      <dl className={cx(styles.quiet)} aria-labelledby={quietHeadingId}>
        <div className={cx(styles.row, styles.quietRow)}>
          <dt className={cx(styles.label, styles.quietLabel)}>
            {view.unheardLabel}
          </dt>
          <dd className={cx(styles.count, styles.quietCount)}>
            {view.unheard}
          </dd>
        </div>
      </dl>

      {/*
       * **The footer, in one clause and three reserved lines** — two until
       * Task 4.7.4 put an age beside the denominator.
       *
       * Sentence case at the micro size rather than the uppercase micro label,
       * because it is prose rather than a stamp — and the two properties are
       * **spelled rather than composed** in the stylesheet, for the reason
       * `MarketProxyStrip` and `SectorPerformance` both record: a
       * `text-transform: none` under `composes: microLabel` is not an override.
       *
       * It defines *heard from* and names no count. Without the window,
       * `451 of 503` is a figure a reader cannot interpret — *heard from when?*
       * is the first question — and a window 500 px below the count it
       * qualifies is a footnote nobody reads the footnote of, which is the
       * sentence this story opens with.
       *
       * **And since Task 4.7.4 it states WHEN** — a second sentence, from the
       * same builder `Movers` reads, saying how far the observations behind
       * the count reach. An age and not a verdict: no threshold, no status
       * word and no connection word, which have one home and it is the status
       * bar. It is on **both** renderings below, because a reader meets the
       * drawn one and a listener the spoken one, and it is absent entirely —
       * not empty — when the aggregate holds no observation, which is the
       * gated machine's permanent state.
       */}
      <p className={cx(styles.claim)}>
        {/*
         * **Two renderings of one string, and the only delivery of N to a
         * listener** (Task 4.4.6).
         *
         * The ladder above is `aria-hidden` — `RankedList`'s decision at its
         * own ladder, inherited correctly — so **N reaches no listener from
         * anywhere else in this region**: read from the accessibility tree, a
         * listener gets the three counts, the set heading, the remainder and
         * this clause. The denominator this story exists to put on screen is
         * not on screen for them, and that is a defect in no file.
         *
         * So the drawn half states the method and defers to the printed
         * endpoint 24 px above it; the spoken half is the owner's whole
         * sentence, because for a listener there is no endpoint to defer to.
         * `marketBreadth` builds both from the same three fields, which is what
         * makes them unable to disagree.
         *
         * **Verified by reading the accessibility tree rather than the DOM**
         * (`Accessibility.getFullAXTree`), which is the only instrument that
         * can see this: the DOM is correct in both versions.
         */}
        {view.claim.drawn === view.claim.spoken ? (
          /*
           * **One string, so one element.** At N = 0 there is no ladder for the
           * drawn half to defer to, so `marketBreadth` makes both renderings
           * the sentence — and splitting an identical string across a hidden
           * span and a spoken one would put it in `textContent` twice, which is
           * one `expect` away from being asserted and reads as a duplicate to
           * anything walking the DOM.
           */
          view.claim.drawn
        ) : (
          <>
            <span aria-hidden="true">{view.claim.drawn}</span>
            <span className={cx(styles.spoken)}>{view.claim.spoken}</span>
          </>
        )}
      </p>
    </div>
  );
});

/**
 * **The paint before the first frame: the region's geometry, held and
 * invisible** — `SectorPerformanceReservation`'s shape, one region across.
 *
 * It is the real component drawn from `RESERVED_BREADTH` rather than a measured
 * box, for that component's recorded reason: the height it has to hold is a
 * headline, three rows, a ladder, a heading, a quiet row and a two-line claim,
 * and **every one of those numbers already exists exactly once**. A
 * `min-height` here would be a second home for all six, wrong the first time
 * any of them changes and wrong silently, because nothing below `pnpm e2e`
 * computes a layout.
 *
 * `visibility: hidden` plus `aria-hidden`, never `display: none` — which is the
 * entire point — and never a skeleton row or an em dash, because a fully-formed
 * placeholder is what invites a reader to read a value that is not there.
 *
 * **It says nothing, and the sentence for the state where nothing ever arrives
 * is Task 4.4.6's.** That task owns the `useWaited` floor and the words; the
 * shipped sibling two regions up is the pattern it reuses, and breadth is a
 * **count**, so its sentence says what breadth has none of rather than what the
 * proxy strip or the sector list has none of.
 */
export const BreadthLedgerReservation = memo(
  function BreadthLedgerReservation() {
    // **The floor is the proxy strip's own and not a second one** (Task 4.4.6,
    // and `SectorPerformanceReservation`'s decision one region across).
    //
    // The reservation is right for the case it was written against — a frame
    // arrives in 174–277 ms, so the hold is a flash nobody sees. It is wrong
    // for the case a reader actually meets: an unreachable aggregate, a
    // half-rolled deploy, a proxy holding the socket open. `overview` is only
    // ever written by an overview frame, so when none arrives this is the
    // **terminal** state and the region sits at its full height saying nothing,
    // while five regions below it each say what they are waiting for. Task
    // 4.3.8 produced exactly that for `Sector performance` — byte-identical at
    // 600 ms and at 12 s — and this region would have inherited it.
    //
    // 2,000 ms against a first frame of 174–277 ms, so the ordinary load never
    // reaches it.
    const waited = useWaited(true);

    /*
     * **Two boxes rather than one, and the nesting is the decision.** The held
     * geometry keeps `visibility: hidden` and `aria-hidden` of its own, in
     * every state; the sentence is a sibling in the room that box is holding.
     *
     * The one-box version — `visibility: visible` back on the same element once
     * the floor elapses — is the obvious shape and it **un-hides the reserved
     * ledger with it**, because `visibility` is inherited and a child that
     * never set it has nothing to lose. A reader would then meet three real
     * row labels, a `0`, a non-breaking space where a heading goes and a
     * sentence on top of them.
     */
    return (
      <div className={cx(styles.reservedRoom)}>
        <div className={cx(styles.reserved)} aria-hidden="true">
          <BreadthLedger view={RESERVED_BREADTH} />
        </div>
        {waited ? (
          <p className={cx(styles.nothingArrived)}>{NOTHING_ARRIVED}</p>
        ) : undefined}
      </div>
    );
  },
);
