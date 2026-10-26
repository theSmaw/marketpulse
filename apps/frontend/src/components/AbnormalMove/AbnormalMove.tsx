import { memo } from "react";

import type { WireMarketOverview } from "@marketpulse/shared";

import { cx } from "../../cx.js";
import {
  NO_RETURN,
  anomalyScoreBand,
  fiveMinuteReturnIndicator,
  volumeRatioIndicator,
  type AnomalyScoreBand as ScoreBandView,
  type ReturnIndicator,
  type SymbolReturnView,
  type VolumeIndicator as VolumeIndicatorView,
} from "../../market/index.js";
import { AnomalyBadge } from "../AnomalyBadge/AnomalyBadge.js";
import { PriceChange } from "../PriceChange/PriceChange.js";
import { useWaited } from "../MarketProxyStrip/use-waited.js";
import styles from "./AbnormalMove.module.css";

// `Abnormal-move indicators` — **one indicator, and the region is named for
// what Epic 5 fills it with progressively** (Task 5.2.3).
//
// Story 5.1's hand-off, item 6: this region is filled indicator by indicator
// and this is the **first** figure in it, not the story that finishes it.
// Stories 5.3, 5.5 and 5.6 each add their own indicator.
//
// ## It reserves THIS indicator and not one pixel for the score
//
// **False since 2026-10-23 (Task 5.6.5), and the sentence below is left
// standing because the accepted cost it names is exactly what was paid.** The
// score is the region's FIRST band now, above the three bands it summarises,
// and this story paid the step the paragraph predicted — recorded per width in
// `TASK-05-the-score-draws.md` rather than argued.
//
// The owner's decision, and the arithmetic is why. 5.6's score is unbuilt, so
// reserving for it is a guess that story both **re-measures and steps** —
// paying twice — and an empty reserved indicator is the picture Story 4.7
// routed as a defect, where *a gateway that is behind* and *this is next
// year's* are one picture. **The accepted cost is one step per story that
// adds an indicator**, recorded as a probed figure per width in this task's
// record so 5.3/5.5/5.6 amend a measurement rather than inherit a guess.
//
// ## The indicator is one height in every state, at a width
//
// The region sits in a column of three with `Relative performance` below it, so
// an indicator that grows when a figure arrives moves that region under the
// reader — `Movers` paid 81 px for discovering it the other way round. Every
// row reserves its own room in `AbnormalMove.module.css`, indicator by
// indicator, which is the neighbour's idiom exactly.
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
//    in the indicator's first render — there is nothing for a listener to be told
//    about, only something to go and read. A live region exists for a change
//    a reader did not cause and would not revisit.
// 2. **The indicator is one group and cannot be announced in part.** Scoping a
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
// indicator that rewrites sixteen times a minute — so it does not change the
// answer, and it is the shape the trigger should have been written against.
//
// **So the clause is sharpened rather than re-dated**, which is the honest
// outcome of a trigger that fired without changing anything: *terminal* is
// **necessary and not sufficient**. The condition is now the first state here
// that is terminal **and arrives unprompted after the reader has had time to
// read the region** — Story 5.6's band word, if it lands after the figure
// does, and not a sentence the first frame already carried.
//
// ## The sharpened trigger FIRED on 2026-10-23 (Task 5.6.5). The verdict is
// ## STILL no, and the reasoning is the opposite of the last one's
//
// The clause names this story's band word **by name**, so it fires by its own
// wording: a band word is as terminal as a refusal sentence, and it does
// arrive on the frame that carries the figure rather than before it.
//
// **It is refused on the second conjunct, which the clause's own author did
// not notice is false of a band.** *Arrives unprompted after the reader has
// had time to read the region* is a claim about **one** arrival; a band is a
// **threshold crossing** on a figure that is replaced 6.8–16.1 times a minute,
// and `ANOMALY_BAND_FLOORS` are three floors on a continuous score. A score
// oscillating one point either side of 32 — which the measured distribution
// puts the **median** of this universe at — crosses `normal`/`elevated` on
// every batch, so the announcement a live region would make is not *the
// product has decided something* but *the score is near a floor*, repeated
// four to sixteen times a minute with **nothing having happened**. That is
// strictly worse than the figure's own churn the three reasons above refuse,
// because a word reads as a verdict where a number reads as a reading.
//
// **The second refusal is the measurement.** Task 5.6.3's distribution over
// 34,318 scores puts 219.2 of 484 securities in `normal` and 179.4 in
// `elevated` at a median instant — the two bands either side of the floor hold
// **82%** of the universe — so the oscillating case is the ordinary case
// rather than an edge.
//
// **And the band is present on first paint**, which is reason 1 unchanged: the
// gateway answers a browser's `subscribe` with a `return` frame carrying the
// score, so the word is in this band's first render. What a reader meets is
// something to go and read.
//
// **The clause is sharpened a second time rather than re-dated**, and the
// sharpening is the part a future author needs: the condition is the first
// state here that is terminal, arrives unprompted after the reader has had
// time to read the region, **and cannot recur under an unchanged subject** —
// a threshold crossing can, and a monotone arrival cannot. A `CONFIRMED`
// finding (§5.3) is the shape it was always reaching for.

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
  /**
   * **The aggregate, read for ONE clause: breadth** (Task 5.6.5).
   *
   * Breadth is a stated clause beside the score and never a weight in it
   * (Story 5.1's decision 4) — it is identical for every member of a group, so
   * weighting it correlates a whole sector's scores. It is the same frame
   * `RelativePerformance` one region down already takes whole, and this
   * component reads the `breadth` section's own counts rather than deriving
   * anything from it.
   *
   * `undefined` before the first aggregate, which draws the clause's reserved
   * room and no ink.
   */
  readonly overview: WireMarketOverview | undefined;
}

export const AbnormalMove = memo(function AbnormalMove({
  symbol,
  symbolReturn,
  overview,
}: AbnormalMoveProps) {
  const indicator = fiveMinuteReturnIndicator(symbol, symbolReturn);
  // **The score band is built unconditionally**, for the volume indicator's
  // reason one line down and one stronger: the score refuses *independently*
  // of the return, and on this laptop it draws while the return does not —
  // nothing observed means the price factor refuses with `no-subject-move`
  // while the excess factor ranks off stored closes.
  const score = anomalyScoreBand(symbol, symbolReturn, overview);
  // **The second indicator is built unconditionally**, because the two refuse
  // independently: a window with no bar exactly five minutes back has no
  // return and may hold all five minutes of volume. What they share is the
  // region-level absence below — *no frame about this security has arrived*
  // is one fact about both.
  const volume = volumeRatioIndicator(symbol, symbolReturn);

  if (indicator.nothing)
    return <HeldRoom indicator={indicator} volume={volume} score={score} />;

  return (
    <div className={cx(styles.region)}>
      <ScoreBand band={score} />
      <Indicator indicator={indicator} />
      <VolumeIndicator indicator={volume} />
    </div>
  );
});

/**
 * **The indicator's room, held and invisible, with one sentence over it.**
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
  indicator,
  volume,
  score,
}: {
  readonly indicator: ReturnIndicator;
  readonly volume: VolumeIndicatorView;
  readonly score: ScoreBandView;
}) {
  const waited = useWaited(true);

  return (
    <div className={cx(styles.room)}>
      <div className={cx(styles.reserved)} aria-hidden="true">
        <div className={cx(styles.region)}>
          {/*
           * **The score band is reserved too** (Task 5.6.5) — Task 5.5.4's
           * note one band down, and the arithmetic is the same: a reserve one
           * band short steps the whole lower page the moment the first frame
           * lands, which is `Movers`' 81 px arriving by a different route.
           */}
          <ScoreBand band={score} />
          <Indicator indicator={indicator} />
          {/*
           * **Both indicators are reserved, not one** (Task 5.5.4). The room this
           * box holds is what the region occupies before any frame arrives, so
           * a reserve one indicator short would step the whole lower page the
           * moment the first frame landed — which is `Movers`' 81 px, one
           * region up, arriving by a different route.
           */}
          <VolumeIndicator indicator={volume} />
        </div>
      </div>
      {waited ? (
        <p className={cx(styles.nothingArrived)}>{NO_RETURN}</p>
      ) : undefined}
    </div>
  );
}

/**
 * **The composite score, its band and the account beneath it** (Task 5.6.5) —
 * the first 0–100 figure this product has drawn, and the first band of this
 * region because the region reads summary-then-evidence (Gate 1 decision 3).
 *
 * ## The account is a LEDGER, and the addition closes on screen
 *
 * `38 + 23 = 61` with every addend and the sum drawn. It closes **by
 * construction** rather than by a test: each contribution is
 * `round(weight × rank / 100)` and the score **is** the sum of the rounded
 * contributions, so there is no rounding residue to hide and no second
 * arithmetic to disagree. Nothing in this component or in `anomaly-score.ts`
 * adds anything — `readAnomalyScore` has already refused any frame whose
 * published contributions do not re-add to the score beside them.
 *
 * ## Fixed arity, so a variable account has a constant height
 *
 * AC 6 wants one clause per contributing factor **and** one per absent factor,
 * which is a clause set **total over the factors** — so the ledger is a row
 * per factor in every presence vector, plus the breadth row, and **`3 of 3`
 * and `0 of 3` are the same height.** `Movers`' held-row lesson generalised
 * from rows to clauses.
 *
 * ## No new interaction and no new motion
 *
 * **No popover, no disclosure, no `Why this band?`, no tooltip, zero new tab
 * stops.** `SecurityRow` wraps `AnomalyBadge` in a `Popover` and `Popover.tsx`
 * says *"the first thing this seam carries is an anomaly score's
 * explanation"* — right for a dense table row and wrong here, because §11
 * requires every score to **carry** its explanation rather than to be able to
 * be asked for one, and AC 6's elements cannot be audited by walking a DOM
 * that does not contain them until a click. `SecurityRow`'s own disposition
 * is Task 5.6.6's and is deliberately untouched.
 *
 * And a score is a **state**, so it persists: the shipped arrival disc means
 * *a bar arrived for this security* and already fires 200 px above, because a
 * revision **is** a bar arrival. A second mark here would be a fourth meaning
 * for one disc.
 *
 * ## The figure is a metric and never the display size
 *
 * That size is spent once per screen and `SecurityIdentity` already spends it
 * twice. `.score` composes `dataCell` and declares **no size**, so it sits in
 * `.figure`'s metric line box exactly as `PriceChange.change` and
 * `.multiple` do — the size seam `MarketProxyStrip` established.
 */
function ScoreBand({ band }: { readonly band: ScoreBandView }) {
  return (
    <div className={cx(styles.indicator)}>
      <p className={cx(styles.label)}>{band.label}</p>

      {/*
       * **The figure, the scale and the chip, on one row.**
       *
       * `0 of 3` draws **words** rather than a `0`: a zero claims *we
       * measured, and nothing is unusual*, which is a statement about the
       * security, where this state is a statement about us. And never a dash —
       * `—` is `unchanged` in `PriceChange`, so a dash in this slot asserts a
       * zero score.
       */}
      <p className={cx(styles.figure, styles.scoreFigure)}>
        {band.score === undefined ? (
          <span className={cx(styles.absent)}>{band.absent ?? NBSP}</span>
        ) : (
          <>
            <span className={cx(styles.score)}>{band.score}</span>
            {/*
             * **A space, for the listener who gets no margin** — the
             * percentile cell's own note two bands down. `textContent` runs
             * two sibling spans together and the gap on screen is a
             * `margin-left` a screen reader cannot see. It costs no layout: an
             * anonymous flex item holding only white space is not rendered
             * (CSS Flexbox §4).
             */}{" "}
            <span className={cx(styles.scale)}>{band.scale}</span>
          </>
        )}

        {/*
         * **The band chip, baseline-aligned on the figure's own row.**
         *
         * `AnomalyBadge` is **adopted rather than re-written** (AC 8): it is
         * four named bands with the name written inside the fill, which is the
         * decision that must not be thrown away silently — an intensity ramp
         * with no label reads as a mood, and its four amber steps are
         * separated by 1.12, 1.43 and 1.59 in greyscale.
         *
         * **This is the one amber position in the rail.** Not the score, not a
         * contribution, not a weight — `amber-appears-once-in-the-rail` fails
         * the build on a second one, because the tempting edit is to tint the
         * figure to match the chip.
         */}
        {band.band === undefined ? undefined : (
          <>
            {" "}
            <span className={cx(styles.chip)}>
              <AnomalyBadge band={band.band} />
            </span>
          </>
        )}
      </p>

      {/*
       * **How many factors are in the sum, and the most they could have
       * produced.** Both halves, because AC 3's own amendment says the count
       * loses its discriminating power while the volume factor is permanently
       * unrankable — `2 of 3` has three different maxima depending on *which*
       * two.
       */}
      <p className={cx(styles.summary)}>{band.summary ?? NBSP}</p>

      {/*
       * **The ledger's room, held whether or not the ledger draws.**
       *
       * The deferred state — this gateway sent no score at all — draws **no
       * ink at all**, headings included, which is ADR 0029's defer rule: we
       * were not told there is an absence. So the room is a `min-height` on
       * this box rather than a set of blank rows, and the region's height is
       * the same in every state.
       */}
      <div className={cx(styles.ledgerRoom)}>
        {band.rows.length === 0 ? undefined : (
          <table className={cx(styles.ledger)}>
            <caption className={cx(styles.ledgerCaption)}>
              How this score was reached
            </caption>
            <thead>
              <tr>
                <th
                  className={cx(styles.heading, styles.nameColumn)}
                  scope="col"
                >
                  Factor
                </th>
                <th
                  className={cx(styles.heading, styles.figureColumn)}
                  scope="col"
                >
                  Weight
                </th>
                <th
                  className={cx(styles.heading, styles.contributed)}
                  scope="col"
                >
                  Contributed
                </th>
              </tr>
            </thead>
            <tbody>
              {band.rows.map((row) => (
                <tr key={row.factor}>
                  <th
                    className={cx(styles.rowName, styles.nameColumn)}
                    scope="row"
                  >
                    {row.factor}
                  </th>
                  <td className={cx(styles.weight)}>{row.weight}</td>
                  {/*
                   * **The reason REPLACES the figure rather than sitting
                   * beside it** — `return-percentile.ts`' own idiom two bands
                   * down, and forced by a measurement as well: a fourth column
                   * left the reason 97 px at 390, against a 22-character
                   * vocabulary, so every refused row wrapped and the ledger's
                   * height became a function of the viewport.
                   *
                   * It is also why there is **no em dash anywhere in this
                   * band**: a `—` where a figure would go asserts a zero
                   * contribution, which is `unchanged` in `PriceChange`.
                   */}
                  <td className={cx(styles.contributed)}>
                    {row.contributed === undefined ? (
                      <span className={cx(styles.reason)}>{row.reason}</span>
                    ) : (
                      <span className={cx(styles.contribution)}>
                        {row.contributed}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/*
       * **Breadth as context, never as a term** — Story 5.1's decision 4. It
       * is identical for every member of a group, so weighting it correlates a
       * whole sector's scores and fills a ranked list with one industry on the
       * day that industry moved together.
       */}
      <p className={cx(styles.context)}>{band.context ?? NBSP}</p>

      {/*
       * **AC 11's sentence, and its room is reserved in every state.** There
       * is nothing to disclaim over a refusal, so the line is blank where
       * there is no figure — and the reserve is what keeps `0 of 3` the same
       * height as `3 of 3`.
       */}
      <p className={cx(styles.disclaimer)}>{band.disclaimer ?? NBSP}</p>
    </div>
  );
}

/**
 * One indicator: a micro label, the figure and its percentile, the qualifier, the
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
function Indicator({ indicator }: { readonly indicator: ReturnIndicator }) {
  return (
    <div className={cx(styles.indicator)}>
      <p className={cx(styles.label)}>{indicator.label}</p>

      {/*
       * **The figure, or a stated word — never a dash.** `—` is `unchanged` in
       * `PriceChange`, so a dash here asserts a zero return; a refusal has no
       * digits at all (ADR 0029). `PriceChange` carries the sign and the
       * `aria-hidden` glyph, because colour is never the sole encoding: the
       * price palette differs by 1.04:1 in greyscale.
       */}
      <p className={cx(styles.figure)}>
        {indicator.move === undefined ? (
          <span className={cx(styles.absent)}>{indicator.absent ?? NBSP}</span>
        ) : (
          <PriceChange
            change={indicator.move.change}
            direction={indicator.move.direction}
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
         * a second tinted number in one indicator is where the 1.04:1 greyscale
         * difference becomes two numbers deep. What tells a reader this is not
         * a change is the ordinal suffix, the absent `%` and the word itself.
         */}
        {indicator.percentile === undefined ? undefined : (
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
            <span className={cx(styles.percentile)}>
              {indicator.percentile}
            </span>
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
      <p className={cx(styles.qualifier)}>{indicator.qualifier ?? NBSP}</p>

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
      <p className={cx(styles.sample)}>{indicator.sample ?? NBSP}</p>

      {/*
       * **Which tape the figure came from** — invariant 6, one short line for
       * the region rather than a second copy of the chart's source note. The
       * room is kept and the ink is not drawn where there is no figure to
       * attribute.
       */}
      <p className={cx(styles.tape)}>{indicator.tape ?? NBSP}</p>
    </div>
  );
}

/**
 * **The volume indicator — a multiple, what it was taken against, and the tape**
 * (Task 5.5.4).
 *
 * ## A second INDICATOR rather than a third cell on the figure's row
 *
 * Gate 1 decision 3, and the rejected shape is the one that fits: a third cell
 * costs **0 px** and was measured to sit with 23 px of slack at 390. It is
 * wrong anyway — `▲ +0.42%  99th percentile  4.1× typical` under one label
 * reading `5-MINUTE RETURN` asserts that the **return** is 4.1× typical, which
 * is the exact misreading this story exists to prevent. The separator above and
 * the indicator's own label are what carry the subject change.
 *
 * ## It has no qualifier row, and that is the data rather than a choice
 *
 * The return indicator states two instants because a return is measured **between**
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
function VolumeIndicator({
  indicator,
}: {
  readonly indicator: VolumeIndicatorView;
}) {
  return (
    <div className={cx(styles.indicator)}>
      <p className={cx(styles.label)}>{indicator.label}</p>

      {/*
       * **The figure, or a stated sentence — never a dash.** `—` is
       * `unchanged` in `PriceChange`, and here it would assert **zero
       * volume**, which on IEX is a claim about a stock exchange rather than
       * about our listening (AC 4).
       */}
      <p className={cx(styles.figure)}>
        {indicator.multiple === undefined ? (
          <span className={cx(styles.absent)}>{indicator.absent ?? NBSP}</span>
        ) : (
          <>
            <span className={cx(styles.multiple)}>{indicator.multiple}</span>
            {/*
             * **A space, for the listener who gets no margin** — the
             * percentile cell's own note one indicator up: `textContent` runs two
             * sibling spans together, and the gap on screen is a `margin-left`
             * a screen reader cannot see. It costs no layout, because an
             * anonymous flex item holding only white space is not rendered
             * (CSS Flexbox §4).
             */}{" "}
            <span className={cx(styles.comparand)}>{indicator.comparand}</span>
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
      <p className={cx(styles.sample)}>{indicator.sample ?? NBSP}</p>

      {/*
       * **Which tapes the two halves came from** — and here they are the
       * **same** tape, which is the whole of Gate 1 decision 1 on screen. The
       * indicator above says `baseline on All US exchanges`; invariant 6 wants the
       * difference displayed rather than implied.
       */}
      <p className={cx(styles.tape)}>{indicator.tape ?? NBSP}</p>
    </div>
  );
}

/** Room and nothing else, where a line would be. */
const NBSP = " ";
