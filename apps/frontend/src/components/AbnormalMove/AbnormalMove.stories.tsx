import type { Meta, StoryObj } from "@storybook/react-vite";

import type { WireSymbolReturn } from "@marketpulse/shared";

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
// cannot license. Stories 5.3, 5.5 and 5.6 add their own bands to this region,
// and nothing is reserved for them.
//
// Every story is drawn **inside a `Region`**, which is how it appears on the
// security page: the box is what decides whether the content fits the rail's
// 419 px of content in a 453 px column at 1440.

const MEASURED: WireSymbolReturn = {
  measured: true,
  percent: 0.4201680672268908,
  from: { at: "2026-10-14T18:01:00.000Z", price: 119, feed: "iex" },
  to: { at: "2026-10-14T18:06:00.000Z", price: 119.5, feed: "iex" },
  observed: 3,
  spanMinutes: 5,
};

const held = (figure: WireSymbolReturn) => ({ symbol: "NVDA", figure });

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
  args: { symbol: "NVDA", symbolReturn: held(MEASURED) },
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
 * resolved.** The band's room is held and invisible with one sentence over it, and the sentence appears after a
 * **2,000 ms** floor — the proxy strip's own rather than a second one — because
 * an ordinary load's first frame lands at 174–277 ms and a sentence replaced by
 * a figure a quarter of a second later is a promise the next frame breaks.
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
