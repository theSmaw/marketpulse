import type { Meta, StoryObj } from "@storybook/react-vite";

import { scoreAnomaly, toWireAnomalyScore } from "@marketpulse/shared";

import type {
  FactorAnswer,
  FactorRefusal,
  WireAnomalyOutcome,
  WireMarketOverview,
  WireMeasuredReturn,
  WireReturnPercentile,
  WireSymbolReturn,
  WireVolumeComparison,
} from "@marketpulse/shared";

import { Region } from "../Region/Region.js";
import { AbnormalMove } from "./AbnormalMove.js";

// `Abnormal-move indicators`, in the six states the wire can actually produce.
//
// **Every state below is built by handing the shipped component a real
// `return` frame's payload**, so each one holds a state the application can
// reach rather than one somebody typed. That matters most here because four of
// the six are **refusals**: a state built by setting a flag would prove nothing
// about whether the producer can reach it.
//
// **What to review side by side is height.** The region sits in a column of
// three with `Relative performance` directly below it and `Anomaly history`
// under that, so a state a pixel taller than its neighbour moves everything
// below it. `Movers` paid that already — 5 rows → 2 shrank the region by 81 px
// and stepped the whole lower page.
//
// **The second thing to review is greyscale.** The figure's tint is
// `PriceChange`'s and is the **redundant** channel: the glyph and the sign
// carry the direction, because the price palette differs by 1.04:1 desaturated.
//
// **And the third is what is NOT here.** No score, no band word, no 0–100
// figure — Gate 1 decision 4: a band with no score is a verdict this figure
// cannot license. Stories 5.3, 5.5 and 5.6 add their own indicators to this
// region, and nothing is reserved for them.
//
// Every story is drawn **inside a `Region`**, which is how it appears on the
// security page: the box is what decides whether the content fits the rail's
// 419 px of content in a 453 px column at 1440.

// **`WireMeasuredReturn` rather than the union**, so a story can spread it and
// amend an endpoint without narrowing.
const MEASURED: WireMeasuredReturn = {
  measured: true,
  percent: 0.4201680672268908,
  from: { at: "2026-10-14T18:01:00.000Z", price: 119, feed: "iex" },
  to: { at: "2026-10-14T18:06:00.000Z", price: 119.5, feed: "iex" },
  observed: 3,
  spanMinutes: 5,
  // **No baseline**, which is most securities' state, a cold replica's, and
  // every gated run's for ever. The comparison's own stories are at the foot
  // of this file.
  percentile: null,
};

/**
 * **A comparison, as this product's own server sends one** (Task 5.3.3).
 *
 * `n = 4,620` is the measured **maximum** over this universe and the minimum is
 * **737**, which is why the sentence states the count rather than quoting AC
 * 3's nominal 4,680. The tape is the baseline's — `sip`, by the store's own
 * `where` — and is never the numerator's.
 */
const PERCENTILE: WireReturnPercentile = {
  ranked: true,
  rank: 99,
  aboveSample: false,
  sampleCount: 4620,
  spanMinutes: 5,
  feed: "sip",
};

/**
 * **The volume half of a frame about a security we hold no IEX history for**
 * (Task 5.5.4) — which is **every machine that exists today**: the `iex` tape
 * is empty wherever no provider is configured, so the pass writes no row and
 * this is the shipped state of the second indicator everywhere.
 */
const NO_VOLUME_HISTORY: WireVolumeComparison = {
  measured: false,
  refusal: "no-same-tape-baseline",
  sampleCount: 0,
  observed: 5,
  spanMinutes: 5,
};

/** A drawable multiple, which no machine has yet produced. */
const VOLUME: WireVolumeComparison = {
  measured: true,
  ratio: 4.1,
  sampleCount: 2500,
  lookbackSessions: 60,
  bucketMinutes: 5,
  spanMinutes: 5,
  // **The same tape as the numerator** — Gate 1 decision 1, which is why this
  // indicator's tape line reads differently from the one above it.
  feed: "iex",
};

const held = (
  figure: WireSymbolReturn,
  volume: WireVolumeComparison | null = NO_VOLUME_HISTORY,
  // **`null` by default — this gateway sent no score at all** (Task 5.6.5),
  // which draws the score band's room and no ink. Every story written before
  // 5.6 therefore keeps the state it was written for, with the band reserved
  // above it; the score's own states are at the foot of this file.
  score: WireAnomalyOutcome | null = null,
) => ({ symbol: "NVDA", figure, volume, score });

/**
 * **What the window held beside a refusal** (Task 5.2.4) — one bar, at one
 * instant, and one of the five minutes heard.
 *
 * Without it, the two states below it differ by four words in one sentence
 * with identical blank room beneath — and `No bars observed yet` is the state
 * every gated run is permanently in, so the pair would be indistinguishable in
 * the one place a reader meets it.
 */
const SEEN_ONE = {
  newest: { at: "2026-10-14T18:06:00.000Z", price: 119.5, feed: "iex" },
  observed: 1,
  spanMinutes: 5,
} as const;

const meta = {
  title: "Market/AbnormalMove",
  component: AbnormalMove,
  parameters: { layout: "padded" },
  args: { symbol: "NVDA", symbolReturn: held(MEASURED), overview: undefined },
  render: (args) => (
    <Region name="Abnormal-move indicators">
      <AbnormalMove {...args} />
    </Region>
  ),
} satisfies Meta<typeof AbnormalMove>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * **State 1 — a measured return.** The figure, the two instants it was measured
 * between with the **older first**, how much of the span was observed, and the
 * tape it was measured on.
 *
 * `observed 3 of 5 minutes` is the ordinary case rather than a degraded one:
 * §7.6 measured IEX covering 65.1% of minutes for a median symbol.
 */
export const Measured: Story = {};

/**
 * **A fall**, which is the state the greyscale review is for: the glyph flips
 * to `▼` and the sign to `−`, so the direction survives with no hue at all.
 */
export const Negative: Story = {
  args: {
    symbolReturn: held({
      ...MEASURED,
      percent: -1.0756302521008403,
      to: { at: "2026-10-14T18:06:00.000Z", price: 117.72, feed: "iex" },
    }),
  },
};

/**
 * **The whole span observed, in the same grammar.** `observed 5 of 5 minutes`,
 * never *all five* — a second grammar at the complete end is two sentences for
 * one fact and destroys the scan between two securities.
 */
export const WholeSpanObserved: Story = {
  args: { symbolReturn: held({ ...MEASURED, observed: 5 }) },
};

/**
 * **State 2 — the refusal this story exists for.** There is a newer bar and no
 * bar whose own instant is exactly five minutes before it.
 *
 * **It states the one instant it has and how much of the span it heard** (Task
 * 5.2.4) — one instant and no `→`, because an arrow with one end is a span
 * whose other end a reader has to guess. Compare it with `NothingObserved`
 * below: that is the pair that must not read alike, and the clause is the
 * difference.
 *
 * `ERIE` at **2.1%** minute coverage would otherwise produce "the 5-minute
 * return" between bars **47 minutes** apart — a well-formed, correctly-signed,
 * correctly-coloured figure wrong by a factor nobody can see. The measured
 * ordinary maximum gap is **187 minutes**.
 *
 * **No dash in the figure slot**: `—` is `unchanged` in `PriceChange`, so a
 * dash here would assert a zero return.
 */
export const NoEarlierEndpoint: Story = {
  args: {
    symbolReturn: held({
      measured: false,
      refusal: "no-earlier-endpoint",
      seen: SEEN_ONE,
    }),
  },
};

/**
 * **State 3 — nothing observed, and CI's permanent state.** 516 securities and
 * zero bars, so the trailing window is empty for ever and no `return` frame on
 * a gated machine can carry a figure. It is also every process's ordinary state
 * for its first five minutes, by Gate 1 decision 3: there is deliberately no
 * store-backed fill at cold start.
 *
 * **It is NOT the state below.** The frame arrived and said there is nothing;
 * *no frame has arrived* is a different fact with different words.
 */
export const NothingObserved: Story = {
  args: {
    symbolReturn: held({
      measured: false,
      refusal: "nothing-observed",
      // **Nothing observed carries nothing**, which is the structural half of
      // *these two must not read alike*: this state has no instant because
      // there is none, rather than because the renderer drew less of it.
      seen: null,
    }),
  },
};

/**
 * **State 4 — no basis.** The older endpoint's close is zero or not finite, so
 * the division has no meaning. Without the refusal the quotient is `Infinity`,
 * which formats and renders as the most alarming figure on the page.
 */
export const NoBasis: Story = {
  args: {
    symbolReturn: held({
      measured: false,
      refusal: "no-basis",
      seen: SEEN_ONE,
    }),
  },
};

/**
 * **States 5 AND 1 — no frame about this security, and the security not
 * resolved.** The indicator's room is held and invisible with one sentence
 * over it, and the sentence appears after a **2,000 ms** floor — the proxy
 * strip's own rather than a second one — because an ordinary load's first
 * frame lands at 174–277 ms and a sentence replaced by a figure a quarter of
 * a second later is a promise the next frame breaks.
 *
 * In the workshop this means the box is empty for two seconds and then speaks,
 * which **is** the state.
 */
export const NoFrameYet: Story = {
  args: { symbolReturn: undefined },
};

/**
 * **State 6 — the answer is about another security**, which is the navigation
 * window: the gateway answers the focus a browser last declared, so for one
 * subscribe round trip after moving from NVDA to AMD the last frame is NVDA's.
 *
 * It draws exactly state 5. A figure about the wrong security is a well-formed,
 * correctly-coloured figure under the wrong name, which is the class of defect
 * this whole region exists to avoid at the arithmetic level.
 */
export const AboutAnotherSecurity: Story = {
  args: { symbol: "AMD", symbolReturn: held(MEASURED) },
};

/**
 * **A return of exactly zero, which is a READING and not a refusal.**
 *
 * `—` is `unchanged` in `PriceChange`, which is why no refusal in this region
 * may draw one — and it is exactly the glyph a five-minute span in which the
 * price did not move owes. The two must not be confusable, and what tells them
 * apart is everything a refusal does not have: a signed figure, the spoken
 * direction, both instants, the observed count and the tape.
 *
 * **Review it beside `NothingObserved`**, which is the state it could be
 * mistaken for, and beside `Measured`, whose height it must match exactly.
 */
export const ZeroReturn: Story = {
  args: { symbolReturn: held({ ...MEASURED, percent: 0 }) },
};

/**
 * **A valid figure whose window ended forty minutes ago — and NOTHING
 * changes.**
 *
 * No threshold, no status word, no connection word, no treatment. The instant
 * **is** the age (AC 6): the measured ordinary maximum gap between one
 * security's bars is **187 minutes**, which is what any threshold here would
 * have had to spare, and the one home for *the feed has stopped* is the status
 * bar.
 *
 * So this story is deliberately indistinguishable from `Measured` except for
 * two instants, and it is here because that is a **decision** rather than an
 * omission — a reviewer looking for the missing badge should find this note
 * instead.
 */
export const FortyMinutesOld: Story = {
  args: {
    symbolReturn: held({
      ...MEASURED,
      from: { ...MEASURED.from, at: "2026-10-14T17:21:00.000Z" },
      to: { ...MEASURED.to, at: "2026-10-14T17:26:00.000Z" },
    }),
  },
};

/**
 * **The percentile — the first figure in this product that says how unusual
 * something is** (Task 5.3.3).
 *
 * Two cells on the figure's row and one new footer line. Three things to review
 * side by side with `Measured` above:
 *
 * - **the hierarchy**: the 20px change is still the figure a reader looks at
 *   first and the comparison is secondary, which is `BreadthLedger`'s rule —
 *   one metric figure per indicator, everything else dense or micro;
 * - **the ink**: `--ink-primary` and **never** the price palette. The figure
 *   beside it is already tinted, and that tint is the redundant channel behind
 *   `PriceChange`'s glyph and sign; a second tinted number in one indicator
 *   is where the palette's 1.04:1 greyscale difference becomes two numbers
 *   deep. What separates the two is the ordinal suffix, the absent `%` and
 *   the word;
 * - **the height**, which is the whole review: every state below must be the
 *   same height as every state above, and the reserve is measured against
 *   `InTheOpeningBucket` — the longest string the footer row can hold.
 */
export const WithPercentile: Story = {
  args: { symbolReturn: held({ ...MEASURED, percentile: PERCENTILE }) },
};

/**
 * **A smaller rank, and a smaller `n`** — the ordinary security rather than the
 * densest one.
 *
 * `n` is **counted**, never a constant (Gate 1 decision 2): the measured range
 * over this universe is 737 to 4,620, so quoting AC 3's nominal 4,680 would be
 * wrong for almost every name on the list. The suffix is a function for the
 * same reason this story exists — `2nd`, not `2th`, and `11th`, not `11st`.
 */
export const ALowerRank: Story = {
  args: {
    symbolReturn: held({
      ...MEASURED,
      percent: 0.0840336134453781,
      percentile: { ...PERCENTILE, rank: 42, sampleCount: 737 },
    }),
  },
};

/**
 * **The ceiling: `>99th`, and never `100th`** (Gate 1 decision 2).
 *
 * Above the highest order statistic there is **no sample**, so a `100th` would
 * assert a strict maximum over a distribution that deliberately excludes the
 * window being scored — a claim no reader can falsify. `>99th` says the
 * stronger and more useful thing: the baseline holds nothing as large as this
 * move.
 *
 * **This is the state a reader is most likely to over-read**, which is why it
 * is a story rather than a test alone.
 */
export const AboveEverySample: Story = {
  args: {
    symbolReturn: held({
      ...MEASURED,
      percent: -4.2016806722689,
      to: { at: "2026-10-14T18:06:00.000Z", price: 114, feed: "iex" },
      percentile: { ...PERCENTILE, aboveSample: true },
    }),
  },
};

/**
 * **The bias clause — AC 8, and the longest string the footer row can hold.**
 *
 * The open is structurally the fattest-tailed part of the trading day and the
 * baseline pools all 77 buckets of a session into one distribution, so a
 * percentile taken in the first half hour reads an ordinary open as more
 * unusual than it is. The clause says so where it matters and nowhere else.
 *
 * **The condition is the FIGURE'S own instants** — 13:38Z is 09:38 EDT — and
 * never a clock: a window that *ended* at 09:43 and is read at 11:00 still
 * carries it, and a 09:30–10:00 wall clock would drop it exactly then. That is
 * also what keeps the indicator correct under Epic 13's replay.
 *
 * **This story is the one the reserve is measured from.** Every other state in
 * this file must match its height at all four widths.
 */
export const InTheOpeningBucket: Story = {
  args: {
    symbolReturn: held({
      ...MEASURED,
      from: { at: "2026-10-14T13:38:00.000Z", price: 119, feed: "iex" },
      to: { at: "2026-10-14T13:43:00.000Z", price: 119.5, feed: "iex" },
      percentile: PERCENTILE,
    }),
  },
};

/**
 * **The baseline is too short to rank against** (Task 5.3.4, AC 6) — and the
 * figure draws perfectly well beside it.
 *
 * The minimum is **2,500 samples**, which is `50/√n ≤ 1` solved for `n`: the
 * standard error of a sample percentile is largest at the median, where it is
 * `50/√n` points, so below 2,500 the single printed digit is worth less than
 * one ordinal. Over this machine's own store it refuses **11 of 511**
 * securities, of which `ERIE` at 737 samples is the floor.
 *
 * **Review it as a replacement rather than an addition.** The sentence stands
 * in the row the sample clause uses, there is no percentile cell, and the tape
 * line has lost its baseline clause — because no baseline was used, which is
 * ADR 0029 rather than tidiness.
 */
export const BaselineTooShort: Story = {
  args: {
    symbolReturn: held({
      ...MEASURED,
      percentile: {
        ranked: false,
        refusal: "too-few-samples",
        sampleCount: 1240,
        minimumSampleCount: 2500,
      },
    }),
  },
};

/**
 * **No baseline at all, which is the same sentence with a `0` in it** — a cold
 * replica for its first seconds, a security with no stored `sip` history, and
 * every gated run for ever.
 *
 * `0 of 2,500 returns` is **true** of each, which is why there is no sixth
 * sentence: the two facts differ in a number the sentence already prints.
 */
export const NoBaselineStored: Story = {
  args: {
    symbolReturn: held({
      ...MEASURED,
      percentile: {
        ranked: false,
        refusal: "too-few-samples",
        sampleCount: 0,
        minimumSampleCount: 2500,
      },
    }),
  },
};

/**
 * **The baseline crosses a price break we cannot adjust** — and it must not
 * read like the two above.
 *
 * *We have too little history* and *the history we have contains a price break*
 * are different facts with different repairs: more history fixes the first and
 * would not touch the second. Task 5.3.2 measured **5 of 516** securities over
 * `SPLIT_DISCONTINUITY_RATIO` in one 60-session window, four of them on exact
 * split factors.
 *
 * **It names a price break and never a split**, because the detector cannot
 * know: the fifth of those five is a reverse split *or a genuine event*, and a
 * sentence saying *split* would be a claim about a corporate action nothing
 * here has read a calendar for.
 *
 * **Review it beside `BaselineTooShort`** — that is the pair that must not
 * collapse — and note it carries **no count**, because the count is not the
 * problem.
 */
export const BaselineCrossesAPriceBreak: Story = {
  args: {
    symbolReturn: held({
      ...MEASURED,
      percentile: {
        ranked: false,
        refusal: "split-discontinuity",
        sampleCount: 4620,
        minimumSampleCount: 2500,
      },
    }),
  },
};

/**
 * **A zero return with a percentile beside it, which is the pair most easily
 * misread as a refusal.**
 *
 * `0.00%` with `—` as its glyph is a **reading**: the price did not move in
 * those five minutes. Against a pooled distribution of magnitudes that is an
 * ordinary **low** rank rather than an absence — and the dash is `PriceChange`'s
 * `unchanged`, which is exactly why no refusal in this region may draw one.
 *
 * Review the whole row: a signed figure, a rank, both instants, the observed
 * count and two tapes. A refusal has none of them.
 */
export const ZeroReturnRanked: Story = {
  args: {
    symbolReturn: held({
      ...MEASURED,
      percent: 0,
      percentile: { ...PERCENTILE, rank: 3 },
    }),
  },
};

/**
 * **The second indicator drawn — `4.1× typical`, which no machine on earth has
 * produced** (Task 5.5.4).
 *
 * The `iex` tape is empty wherever no provider is configured, so every other
 * story in this file carries the `no-same-tape-baseline` refusal and this one
 * is the only place the figure exists at all. **Review five things in it**, and
 * four of them carry no colour:
 *
 * 1. the `×` is **U+00D7 glued to the digits**, at the same size, weight and
 *    ink — never the letter `x`, never superscript, never a smaller suffix;
 * 2. there is **no sign**, which is the strongest single discriminator on a
 *    screen where every other figure carries a `+` or a `−`;
 * 3. **one decimal, always**;
 * 4. `typical` is the **comparand**, not a unit;
 * 5. and the ink is `--ink-primary` rather than the price palette, because
 *    volume does not encode direction.
 *
 * And review the **tape line against the indicator above it**: this baseline
 * is the **same** tape as its numerator (Gate 1 decision 1), where the
 * percentile's is the consolidated tape against a single-venue numerator.
 */
export const VolumeMultiple: Story = {
  args: { symbolReturn: held({ ...MEASURED, percentile: PERCENTILE }, VOLUME) },
};

/**
 * **Below 1, with no reciprocal and no word.**
 *
 * `0.3× typical` and not `3.3× quieter`: a reciprocal invents a second scale
 * running the other way, and `quiet` / `heavy` collide with Story 5.6's band
 * vocabulary. **The treatment is identical to the story above** — same ink,
 * same weight, same decimal — which is the thing to check side by side.
 */
export const QuieterThanTypical: Story = {
  args: { symbolReturn: held(MEASURED, { ...VOLUME, ratio: 0.34 }) },
};

/**
 * **Exactly typical, which draws `1.0× typical` and never a dash.**
 *
 * `—` is `unchanged` in `PriceChange`, so a dash here would assert **zero
 * volume** — AC 4's lesson in the glyph rather than in the arithmetic.
 */
export const ExactlyTypical: Story = {
  args: { symbolReturn: held(MEASURED, { ...VOLUME, ratio: 1 }) },
};

/**
 * **Above the digit cap**, drawn with the percentile's own `>` glyph.
 *
 * A multiple is unbounded above — a security printing its first shares of the
 * day into a quiet bucket reaches four figures — and `1,482.3×` is a number
 * nobody reads as a number.
 */
export const AboveTheCap: Story = {
  args: { symbolReturn: held(MEASURED, { ...VOLUME, ratio: 1482.3 }) },
};

/**
 * **Below the floor**, which exists because `toFixed(1)` would otherwise draw
 * `0.0× typical`.
 *
 * That string reads as *nothing traded*, which is a claim about a stock
 * exchange rather than about our arithmetic — AC 4 arriving at the last place
 * anybody would look for it, the formatter.
 */
export const BelowTheFloor: Story = {
  args: { symbolReturn: held(MEASURED, { ...VOLUME, ratio: 0.02 }) },
};

/**
 * **Too little history at this time of day to print a decimal.**
 *
 * Measured on the deployment on 2026-10-20, the `iex` tape's median bucket
 * holds **80** minutes and achieves a relative standard error of **10.65%** —
 * so **NVDA, the best case in the universe, cannot draw this figure**, and
 * needs 132 sessions to. **Review it beside `NoVolumeHistory`**: that pair is
 * the one that must not collapse, because one is a wait that resolves itself
 * and the other needs somebody to look at the live writer.
 */
export const VolumeBaselineTooShort: Story = {
  args: {
    symbolReturn: held(MEASURED, {
      measured: false,
      refusal: "too-few-sessions",
      sampleCount: 80,
      observed: 5,
      spanMinutes: 5,
    }),
  },
};

/**
 * **IEX printed in only some of the five minutes**, so the figure is refused
 * rather than scaled.
 *
 * Three wrong answers and no right one: `× 5/2` imputes the minutes IEX did
 * not print, `/ 2` is the same imputation rearranged, and `/ 5` reads them as
 * zero shares. **Review it beside `NoVolumeBars`** — a venue fact and a reach
 * fact, and only the second tempts a re-implementer.
 */
export const PartiallyObserved: Story = {
  args: {
    symbolReturn: held(MEASURED, {
      measured: false,
      refusal: "bucket-partially-observed",
      sampleCount: 2500,
      observed: 2,
      spanMinutes: 5,
    }),
  },
};

/** **No IEX bar at all in the five minutes** — absent, never zero. */
export const NoVolumeBars: Story = {
  args: {
    symbolReturn: held(MEASURED, {
      measured: false,
      refusal: "no-bar-in-bucket",
      sampleCount: 2500,
      observed: 0,
      spanMinutes: 5,
    }),
  },
};

/**
 * **A typical minute of this time of day printed nothing**, so the denominator
 * is zero — a refusal, never an `Infinity`.
 */
export const ZeroVolumeBaseline: Story = {
  args: {
    symbolReturn: held(MEASURED, {
      measured: false,
      refusal: "zero-volume-baseline",
      sampleCount: 2500,
      observed: 5,
      spanMinutes: 5,
    }),
  },
};

/**
 * **The volume history crosses a price break**, read from the price pass's own
 * verdict rather than re-derived.
 *
 * A split breaks volume **harder** than price: the share count multiplies by
 * exactly the factor the price divides by, so an unadjusted 10:1 split is a
 * +900% figure. **It must not read like the indicator above's split sentence** —
 * that one says the ranking is not comparable, this one says the shares are.
 */
export const VolumeCrossesAPriceBreak: Story = {
  args: {
    symbolReturn: held(MEASURED, {
      measured: false,
      refusal: "split-discontinuity",
      sampleCount: 4620,
      observed: 5,
      spanMinutes: 5,
    }),
  },
};

/**
 * **The gateway sent no volume comparison at all** — a browser holding a bundle
 * across a deploy.
 *
 * It draws the label and nothing else, which is ADR 0029's defer rule: we were
 * not told there is an absence, so a sentence explaining one would be a claim
 * of its own. **It is not the same state as a refusal**, which has a word and
 * gets a sentence — review it beside `NoVolumeHistory`.
 */
export const NoVolumeComparison: Story = {
  args: { symbolReturn: held(MEASURED, null) },
};

/*
 * --- The score band (Task 5.6.5) ---
 *
 * **Every payload below is produced by the SHIPPED SCORER**, `scoreAnomaly`
 * over a set of factor answers, and serialised by `toWireAnomalyScore` — the
 * two functions the gateway itself calls. So each story holds a state the
 * producer can reach, the published contributions are the ones the arithmetic
 * produced, and **the addition on screen closes because it is the same
 * addition**. A story that typed `contribution: 38` beside `rank: 95` would be
 * a picture of a ledger rather than a ledger.
 *
 * **What to review, in order.** The height first: every story in this file
 * must be the same height, and the score band's own states — a figure, a
 * refusal, a gateway that sent nothing — must not differ by a pixel. Then the
 * chip, which is **the one amber position in the rail** and sits behind its
 * own written name. Then the addition: the contributed column sums to the
 * figure above it, on screen, in every scored state.
 */

/** A ranked factor, as the backend's own factor modules answer. */
const ranked = (rank: number, sampleCount = 4620): FactorAnswer => ({
  state: "ranked",
  rank,
  aboveSample: false,
  sampleCount,
});

/** The volume factor's permanent answer on every machine that exists. */
const NO_DISTRIBUTION: FactorAnswer = { state: "no-distribution" };

/** A refusal, in the vocabulary the factor that refused owns. */
const refusedFactor = (refusal: FactorRefusal): FactorAnswer => ({
  state: "refused",
  refusal,
  sampleCount: 0,
  minimumSampleCount: 2500,
});

/**
 * **A score, through the shipped scorer and the shipped serialiser.**
 *
 * `toWireAnomalyScore` is the mapping the gateway applies before the frame
 * leaves the process, field by field and never a spread — so what a story
 * hands the component is byte-for-byte what a browser decodes.
 */
const scored = (
  price: FactorAnswer,
  excess: FactorAnswer,
  volume: FactorAnswer = NO_DISTRIBUTION,
): WireAnomalyOutcome =>
  toWireAnomalyScore(scoreAnomaly({ price, excess, volume }));

/**
 * **An aggregate carrying breadth over the last session**, which is what a
 * store with no live feed holds — and is the state the local pair draws.
 */
const BREADTH: WireMarketOverview = {
  computedAt: "2026-10-13T18:01:00.000Z",
  feeds: ["iex"],
  figures: [],
  sectors: [],
  breadth: {
    basis: "session",
    session: "2026-09-11",
    advancing: 334,
    declining: 160,
    unchanged: 7,
    measured: 501,
    tracked: 501,
  },
};

/**
 * **The headline: a composite score, its band and the account beneath it** —
 * the first 0–100 figure this product has drawn.
 *
 * `round(40 × 95 / 100) = 38` and `round(35 × 66 / 100) = 23`, and
 * `38 + 23 = 61` **on screen**. The addition closes by construction rather
 * than by a test: the score **is** the sum of the rounded contributions, so
 * there is no rounding residue for the column to hide.
 *
 * **This is the deployed common case and not the local one** — `2 of 3`, with
 * the volume factor permanently unrankable because migration `0015` stores a
 * median and a dispersion rather than a distribution. On this laptop the state
 * is `1 of 3 · max 35`: nothing is observed, so the price factor refuses with
 * `no-subject-move` while the excess factor ranks off stored closes.
 *
 * **Review `max 75` beside `/ 100`.** They are different facts and both are
 * needed: the scale is 0–100 for every security, and this security's evidence
 * could have produced at most 75. Renormalising the second onto the first is
 * what AC 3 refuses, and it would invalidate all three band floors — measured
 * quantiles of a max-75 distribution — on the day it shipped.
 */
export const Score: Story = {
  args: {
    symbolReturn: held(
      { ...MEASURED, percentile: PERCENTILE },
      NO_VOLUME_HISTORY,
      scored(ranked(95), ranked(66)),
    ),
    overview: BREADTH,
  },
};

/**
 * **`normal` carries no fill at all**, which is `AnomalyBadge`'s own decision
 * adopted rather than re-taken: it is the absence of unusualness and does not
 * need marking, and its step to `elevated` is the ramp's weakest at **1.12** —
 * so the two states hardest to tell apart by colour are the two not
 * distinguished by colour at all. The `calc()` in its rule keeps the bordered
 * chip the same box as the filled ones.
 *
 * **Review it beside `Score`.** That pair is the one a reader meets most
 * often — the measured distribution puts 219.2 of 484 securities in `normal`
 * and 179.4 in `elevated` at a median instant, so 82% of the universe is one
 * of these two.
 */
export const ScoreNormal: Story = {
  args: {
    symbolReturn: held(
      { ...MEASURED, percentile: PERCENTILE },
      NO_VOLUME_HISTORY,
      scored(ranked(41), ranked(18)),
    ),
    overview: BREADTH,
  },
};

/**
 * **`high` — the third band, and the first a two-factor score can reach.**
 *
 * The floors are **measured quantiles** of this product's own distribution
 * (Task 5.6.3): `elevated` at p50 = 32, `high` at p90 = 63, `extreme` at
 * p99 = 73, over 34,318 two-factor scores. They are on the **raw** score, with
 * `elevated ≤ 40 < high`, so a price-only score may say `elevated` and may
 * never say `high` — less evidence, less claim, graduated rather than
 * absolute.
 */
export const ScoreHigh: Story = {
  args: {
    symbolReturn: held(
      { ...MEASURED, percentile: { ...PERCENTILE, rank: 97 } },
      NO_VOLUME_HISTORY,
      scored(ranked(97), ranked(88)),
    ),
    overview: BREADTH,
  },
};

/**
 * **`extreme`, which 1.6% of the scored universe reads at a median instant.**
 *
 * The strongest fill in the ramp, and the name is still written inside it —
 * because four amber steps separated by 1.12, 1.43 and 1.59 in greyscale are
 * enough to see a change and nowhere near enough to name one.
 *
 * **Review the amber.** It appears **once** in this rail and this is it: not
 * the score, not a contribution, not a weight. The tempting edit is to tint
 * the figure to match the chip, and `amber-appears-once-in-the-rail` fails the
 * build on it.
 */
export const ScoreExtreme: Story = {
  args: {
    symbolReturn: held(
      { ...MEASURED, percentile: { ...PERCENTILE, rank: 99 } },
      NO_VOLUME_HISTORY,
      scored(ranked(99), ranked(99)),
    ),
    overview: BREADTH,
  },
};

/**
 * **`1 of 3`, which is this laptop's own state and the one a probe can
 * photograph against a real frame** (Task 5.6.4's finding).
 *
 * Nothing is observed, so the price factor refuses with `no-subject-move` —
 * but the subject's and its benchmark's **stored close-to-close moves share a
 * basis**, so the excess factor ranks. The composite is reachable on the
 * session basis with no live feed at all, which no other figure in Epic 5 is.
 *
 * **`max 35` is the part to read.** One factor contributed and it was the
 * 35-point one, so this score could not have exceeded 35 — which is why the
 * count alone is not the label.
 */
export const ScoreOneFactor: Story = {
  args: {
    symbolReturn: held(
      { measured: false, refusal: "nothing-observed", seen: null },
      NO_VOLUME_HISTORY,
      scored(refusedFactor("no-subject-move"), ranked(99)),
    ),
    overview: BREADTH,
  },
};

/**
 * **`0 of 3` — and it is NOT a score of `0`** (CI's permanent state, 516
 * securities and zero bars).
 *
 * A `0` claims *we measured, and nothing is unusual*, which is a statement
 * about the security; this is a statement about **us**. So the figure slot
 * draws **words**, and never an em dash — `—` is `unchanged` in `PriceChange`,
 * so a dash here would assert a zero score.
 *
 * **Review its height against `Score` above.** They must be byte-identical:
 * the ledger is a row per factor in every presence vector, and the
 * disclaimer's line is reserved and blank here because there is nothing to
 * disclaim over a refusal.
 */
export const NoScore: Story = {
  args: {
    symbolReturn: held(
      { measured: false, refusal: "nothing-observed", seen: null },
      NO_VOLUME_HISTORY,
      scored(
        refusedFactor("no-subject-move"),
        refusedFactor("too-few-samples"),
      ),
    ),
    overview: BREADTH,
  },
};

/**
 * **A factor whose question does not arise, which must not read like a
 * refusal.**
 *
 * A sector SPDR **is** the fund its own sector is measured against, so the
 * comparison would be with itself and the excess would be exactly `0` for
 * ever — 11 of 516 securities, plus the four market proxies with no sector at
 * all. No waiting, backfilling or repairing will ever produce this figure,
 * which is exactly what separates it from `baseline still filling` one row up.
 */
export const ScoreInapplicableFactor: Story = {
  args: {
    symbol: "XLK",
    symbolReturn: {
      symbol: "XLK",
      figure: { ...MEASURED, percentile: PERCENTILE },
      volume: NO_VOLUME_HISTORY,
      score: scored(ranked(95), {
        state: "inapplicable",
        because: "is-benchmark",
      }),
    },
    overview: BREADTH,
  },
};

/**
 * **The breadth clause over a live window rather than a session** — the state
 * during market hours.
 *
 * It is **context and never a term**: breadth is identical for every member of
 * a group, so weighting it correlates a whole sector's scores and fills a
 * ranked list with one industry on the day that industry moved together
 * (Story 5.1's decision 4, this story's Gate 1 false premise 3). **The
 * denominator is 3**, and the ledger says so by giving breadth a row with no
 * weight.
 *
 * **The denominator in the sentence is `measured`, not `tracked`**, which is
 * a correction to the canvas specimen: 312 is counted over the securities we
 * heard from, and stating it against the 501 we track would be a count over
 * one set wearing another's denominator.
 */
export const ScoreWithObservedBreadth: Story = {
  args: {
    symbolReturn: held(
      { ...MEASURED, percentile: PERCENTILE },
      NO_VOLUME_HISTORY,
      scored(ranked(95), ranked(66)),
    ),
    overview: {
      ...BREADTH,
      breadth: {
        basis: "observed",
        windowMinutes: 5,
        advancing: 312,
        declining: 140,
        unchanged: 14,
        measured: 466,
        tracked: 501,
      },
    },
  },
};

/**
 * **No aggregate at all, so the breadth clause holds its room and says
 * nothing** — the first seconds of any page, and a browser whose gateway sends
 * no breadth section.
 *
 * ADR 0029's defer rule: we were not told there is an absence, so a sentence
 * explaining one would be a claim of its own. **Review it beside `Score`** —
 * the heights must match, because the clause's two lines are reserved whether
 * or not they draw.
 */
export const ScoreWithoutBreadth: Story = {
  args: {
    symbolReturn: held(
      { ...MEASURED, percentile: PERCENTILE },
      NO_VOLUME_HISTORY,
      scored(ranked(95), ranked(66)),
    ),
    overview: undefined,
  },
};
