import { memo } from "react";

import { cx } from "../../cx.js";
import {
  NO_RETURN,
  fiveMinuteReturnBand,
  volumeRatioBand,
  type ReturnBand,
  type SymbolReturnView,
  type VolumeBand as VolumeBandView,
} from "../../market/index.js";
import { PriceChange } from "../PriceChange/PriceChange.js";
import { useWaited } from "../MarketProxyStrip/use-waited.js";
import styles from "./AbnormalMove.module.css";

// `Abnormal-move indicators` — **one band, and the region is named for what
// Epic 5 fills it with progressively** (Task 5.2.3).
//
// Story 5.1's hand-off, item 6: this region is filled band by band and this is
// the **first** figure in it, not the story that finishes it. Stories 5.3, 5.5
// and 5.6 each add their own band.
//
// ## It reserves THIS band and not one pixel for the score
//
// The owner's decision, and the arithmetic is why. 5.6's score is unbuilt, so
// reserving for it is a guess that story both **re-measures and steps** —
// paying twice — and an empty reserved band is the picture Story 4.7 routed as
// a defect, where *a gateway that is behind* and *this is next year's* are one
// picture. **The accepted cost is one step per story that adds a band**,
// recorded as a probed figure per width in this task's record so 5.3/5.5/5.6
// amend a measurement rather than inherit a guess.
//
// ## The band is one height in every state, at a width
//
// The region sits in a column of three with `Relative performance` below it, so
// a band that grows when a figure arrives moves that region under the reader —
// `Movers` paid 81 px for discovering it the other way round. Every row
// reserves its own room in `AbnormalMove.module.css`, band by band, which is
// the neighbour's idiom exactly.
//
// ## And it says nothing about the feed
//
// No threshold, no status word, no connection word, no second staleness
// sentence (AC 6). The qualifier states two instants and lets the reader
// subtract; the one home for *the feed has stopped* is the status bar.
//
// ## It has NO LIVE REGION, and that is a decision (Task 5.2.4)
//
// The figure is replaced on each applied batch for the focused security —
// **6.8 to 16.1 times a minute** at the feed's measured cadence — and every
// one of those is **unprompted**: nobody pressed anything. All four lines
// change together, so what a listener would be handed is a twenty-word
// sentence against a **1,500 ms** pacing floor the chart's reading already
// overruns, four to sixteen times a minute. `MarketProxyStrip`'s decision
// exactly, for the same arithmetic, and `SecurityIdentity`'s before it
// (`FRONTEND-STATE.md` §7) — a region that speaks over the sentence in
// progress is worse than one that waits to be read.
//
// **It is not a claim that the silence is right.** Whether a figure nobody is
// told about is discoverable at all is a listener's question and is unanswerable
// from a DOM; it is `docs/GAPS.md`'s standing screen-reader item, tenth entry,
// raised rather than claimed answered.
//
// **Reversal trigger:** the first state in this region that is **terminal** —
// a word or a figure that will not be replaced by the next batch, which a
// reader therefore has to be told about once rather than continuously.
// Story 5.6's band word is the candidate; a changing number is not.
//
// ## That trigger FIRED on 2026-10-14 (Task 5.3.4), and the verdict is still no
//
// Evaluated in writing, because an unevaluated trigger and one that did not
// fire read identically. Task 5.3.4's two refusal sentences **are** terminal
// as the clause is worded: a baseline generation changes **once a night**, so
// `Baseline too short to rank — 737 of 2,500 returns` is the same string on
// every one of the 6.8–16.1 batches a minute until tomorrow's pass, and
// `BASELINE_REFRESH_FLOOR_MS` is fifteen minutes on top of that.
//
// **No live region, for three reasons and one caveat.**
//
// 1. **It is present on first paint rather than arriving.** The gateway
//    answers a browser's `subscribe` with a `return` frame, so the sentence is
//    in the band's first render — there is nothing for a listener to be told
//    about, only something to go and read. A live region exists for a change
//    a reader did not cause and would not revisit.
// 2. **The band is one group and cannot be announced in part.** Scoping a
//    region to the sample row alone would still re-announce on every batch,
//    because the row is re-rendered with the other four; the arithmetic above
//    — a twenty-word sentence against a 1,500 ms pacing floor, four to sixteen
//    times a minute — is unchanged.
// 3. **A refusal does not flip under a reader.** Whether a security has a
//    long enough baseline is fixed for the whole session: the bound is
//    applied to the stored row, and the stored row is tonight's generation.
//
// **The caveat, stated rather than argued away**: a reader attached to a
// **cold replica** in the seconds before `baselines.load` resolves sees
// `0 of 2,500 returns` replaced by a rank, unprompted. That is a transition
// from less information to more, inside the first seconds of a process, in a
// band that rewrites sixteen times a minute — so it does not change the
// answer, and it is the shape the trigger should have been written against.
//
// **So the clause is sharpened rather than re-dated**, which is the honest
// outcome of a trigger that fired without changing anything: *terminal* is
// **necessary and not sufficient**. The condition is now the first state here
// that is terminal **and arrives unprompted after the reader has had time to
// read the region** — Story 5.6's band word, if it lands after the figure
// does, and not a sentence the first frame already carried.

export interface AbnormalMoveProps {
  /** The security this page is about. */
  readonly symbol: string;
  /**
   * The 5-minute return the backend sent, or `undefined` before the first
   * `return` frame.
   *
   * **Not the whole `LiveFeedView`**, which would make this component a second
   * place that decides what the feed's words mean — `RelativePerformance`'s
   * own argument for taking the resolved row rather than the view.
   */
  readonly symbolReturn: SymbolReturnView | undefined;
}

export const AbnormalMove = memo(function AbnormalMove({
  symbol,
  symbolReturn,
}: AbnormalMoveProps) {
  const band = fiveMinuteReturnBand(symbol, symbolReturn);
  // **The second band is built unconditionally**, because the two refuse
  // independently: a window with no bar exactly five minutes back has no
  // return and may hold all five minutes of volume. What they share is the
  // region-level absence below — *no frame about this security has arrived*
  // is one fact about both.
  const volume = volumeRatioBand(symbol, symbolReturn);

  if (band.nothing) return <HeldRoom band={band} volume={volume} />;

  return (
    <div className={cx(styles.region)}>
      <Band band={band} />
      <VolumeBand band={volume} />
    </div>
  );
});

/**
 * **The band's room, held and invisible, with one sentence over it.**
 *
 * `RelativePerformance`'s `HeldRoom` exactly, including the two-box
 * arrangement: a one-box version — `visibility: hidden` with a `visible`
 * override on the same element — un-hides every reserved row along with the
 * sentence, because `visibility` is inherited. That was live for ten days one
 * region over.
 *
 * The sentence is behind the proxy strip's **2,000 ms** floor rather than a
 * second one of this region's: an ordinary load's first frame lands at
 * 174–277 ms, so the ordinary case never shows it, and a region still empty
 * after two seconds says so instead of holding a titled empty box for ever.
 * **On CI this is the permanent state** — 516 securities and zero bars, so the
 * window is empty and no `return` frame can carry a figure.
 */
function HeldRoom({
  band,
  volume,
}: {
  readonly band: ReturnBand;
  readonly volume: VolumeBandView;
}) {
  const waited = useWaited(true);

  return (
    <div className={cx(styles.room)}>
      <div className={cx(styles.reserved)} aria-hidden="true">
        <div className={cx(styles.region)}>
          <Band band={band} />
          {/*
           * **Both bands are reserved, not one** (Task 5.5.4). The room this
           * box holds is what the region occupies before any frame arrives, so
           * a reserve one band short would step the whole lower page the
           * moment the first frame landed — which is `Movers`' 81 px, one
           * region up, arriving by a different route.
           */}
          <VolumeBand band={volume} />
        </div>
      </div>
      {waited ? (
        <p className={cx(styles.nothingArrived)}>{NO_RETURN}</p>
      ) : undefined}
    </div>
  );
}

/**
 * One band: a micro label, the figure and its percentile, the qualifier, the
 * sample the percentile was taken against, and the tape.
 *
 * **The label's micro properties are SPELLED rather than composed**, which is
 * `MarketProxyStrip`'s 2026-09-26 defect and both ranked regions' inheritance:
 * `composes: microLabel` followed by a declaration that disagrees with it
 * reads like an override and is not one — `composes` concatenates class names,
 * so which rule wins is **stylesheet order**. This label is a word and a
 * figure, which is exactly the content that makes the failure visible — and
 * `a-compose-never-carries-an-override` refuses the shape by name.
 */
function Band({ band }: { readonly band: ReturnBand }) {
  return (
    <div className={cx(styles.band)}>
      <p className={cx(styles.label)}>{band.label}</p>

      {/*
       * **The figure, or a stated word — never a dash.** `—` is `unchanged` in
       * `PriceChange`, so a dash here asserts a zero return; a refusal has no
       * digits at all (ADR 0029). `PriceChange` carries the sign and the
       * `aria-hidden` glyph, because colour is never the sole encoding: the
       * price palette differs by 1.04:1 in greyscale.
       */}
      <p className={cx(styles.figure)}>
        {band.move === undefined ? (
          <span className={cx(styles.absent)}>{band.absent ?? NBSP}</span>
        ) : (
          <PriceChange
            change={band.move.change}
            direction={band.move.direction}
          />
        )}

        {/*
         * **How unusual it is — a second cell on the figure's own row, and a
         * FLEX ITEM rather than inline text** (Task 5.3.3).
         *
         * The row is a flex row for a reason this cell would otherwise pay
         * again: a micro child inside a metric strut measured **125 px against
         * 122** in Task 5.2.3, a 3 px step at every width, invisible to jsdom
         * and to every unit test. A blockified child's height is its own line
         * box and the row's floor is the one declared in the stylesheet.
         *
         * **`--ink-primary`, never the price palette.** The figure beside it is
         * already tinted and that tint is `PriceChange`'s redundant channel;
         * a second tinted number in one band is where the 1.04:1 greyscale
         * difference becomes two numbers deep. What tells a reader this is not
         * a change is the ordinal suffix, the absent `%` and the word itself.
         */}
        {band.percentile === undefined ? undefined : (
          <>
            {/*
             * **A space, for the listener who gets no margin** (Task 5.3.3).
             *
             * `textContent` runs two sibling spans together with no separator,
             * and the first draft of this component's test read
             * `+0.42%99th percentile` — the gap on screen is `margin-left` and
             * a screen reader cannot see one. A block boundary would give a
             * pause, but the two figures are one row by design.
             *
             * **It costs no layout.** CSS Flexbox §4: a contiguous run of text
             * directly inside a flex container becomes an anonymous flex item,
             * and *an anonymous flex item that contains only white space is not
             * rendered*. So this is a text node the accessibility tree reads
             * and the box model does not — which is also why it is not a
             * drawn `·`: the region's separator vocabulary is for clauses
             * inside one sentence, and these are two figures.
             */}{" "}
            <span className={cx(styles.percentile)}>{band.percentile}</span>
          </>
        )}
      </p>

      {/*
       * **The two instants, oldest first, and how much of the span was
       * observed.** **Two** lines of room are reserved whether or not it draws,
       * because that is what the probe measured — the clause is one line in the
       * rail's 419 px box at 1440 and two at 308 px, and a region whose height
       * depended on whether a pair had been found would step the page every
       * time one was.
       *
       * *(This comment said **three** from Task 5.2.3 until Task 5.3.3 swept
       * it: the probe had corrected the reserve to two and the comment was left
       * behind. The CSS was right throughout.)*
       */}
      <p className={cx(styles.qualifier)}>{band.qualifier ?? NBSP}</p>

      {/*
       * **What the percentile was taken against** — the counted `n`, the span
       * the samples are of, and the pooling.
       *
       * Its own row rather than a clause on the qualifier above, because the
       * two describe different things: that line is about **this observation**
       * and this one is about the **sample** it was ranked in. The room is
       * reserved at the height of the longest string the row can hold, which is
       * the bias clause — so a figure read at 09:40 does not step the page
       * under a reader who was looking at one read at 11:00.
       */}
      <p className={cx(styles.sample)}>{band.sample ?? NBSP}</p>

      {/*
       * **Which tape the figure came from** — invariant 6, one short line for
       * the region rather than a second copy of the chart's source note. The
       * room is kept and the ink is not drawn where there is no figure to
       * attribute.
       */}
      <p className={cx(styles.tape)}>{band.tape ?? NBSP}</p>
    </div>
  );
}

/**
 * **The volume band — a multiple, what it was taken against, and the tape**
 * (Task 5.5.4).
 *
 * ## A second BAND rather than a third cell on the figure's row
 *
 * Gate 1 decision 3, and the rejected shape is the one that fits: a third cell
 * costs **0 px** and was measured to sit with 23 px of slack at 390. It is
 * wrong anyway — `▲ +0.42%  99th percentile  4.1× typical` under one label
 * reading `5-MINUTE RETURN` asserts that the **return** is 4.1× typical, which
 * is the exact misreading this story exists to prevent. The separator above and
 * the band's own label are what carry the subject change.
 *
 * ## It has no qualifier row, and that is the data rather than a choice
 *
 * The return band states two instants because a return is measured **between**
 * them. This figure is a rate over the same five minutes, and the five minutes
 * are named in the row beneath it — so a second pair of instants would be the
 * same fact drawn twice. A refusal that is about coverage says `2 of 5` in its
 * own sentence, which is the one place that count is informative.
 *
 * ## The multiple is NOT a `PriceChange`
 *
 * No sign, no glyph, no tint — a multiple has no direction, so the component
 * whose whole job is to carry one redundantly would be carrying a direction
 * this figure does not have. What it borrows instead is the size seam:
 * `.multiple` composes `dataCell` and states no size, so the figure sits in
 * `.figure`'s metric line box exactly as `PriceChange.change` does.
 */
function VolumeBand({ band }: { readonly band: VolumeBandView }) {
  return (
    <div className={cx(styles.band, styles.secondBand)}>
      <p className={cx(styles.label)}>{band.label}</p>

      {/*
       * **The figure, or a stated sentence — never a dash.** `—` is
       * `unchanged` in `PriceChange`, and here it would assert **zero
       * volume**, which on IEX is a claim about a stock exchange rather than
       * about our listening (AC 4).
       */}
      <p className={cx(styles.figure)}>
        {band.multiple === undefined ? (
          <span className={cx(styles.absent)}>{band.absent ?? NBSP}</span>
        ) : (
          <>
            <span className={cx(styles.multiple)}>{band.multiple}</span>
            {/*
             * **A space, for the listener who gets no margin** — the
             * percentile cell's own note one band up: `textContent` runs two
             * sibling spans together, and the gap on screen is a `margin-left`
             * a screen reader cannot see. It costs no layout, because an
             * anonymous flex item holding only white space is not rendered
             * (CSS Flexbox §4).
             */}{" "}
            <span className={cx(styles.comparand)}>{band.comparand}</span>
          </>
        )}
      </p>

      {/*
       * **What the multiple was taken against** — the span, the median, the
       * lookback, the bucket width and the exclusion of today, in one row.
       *
       * Two lines of room whether or not it draws, measured rather than
       * argued: a region whose height depended on which state it was in would
       * step the page under a reader.
       */}
      <p className={cx(styles.sample)}>{band.sample ?? NBSP}</p>

      {/*
       * **Which tapes the two halves came from** — and here they are the
       * **same** tape, which is the whole of Gate 1 decision 1 on screen. The
       * band above says `baseline on All US exchanges`; invariant 6 wants the
       * difference displayed rather than implied.
       */}
      <p className={cx(styles.tape)}>{band.tape ?? NBSP}</p>
    </div>
  );
}

/** Room and nothing else, where a line would be. */
const NBSP = " ";
