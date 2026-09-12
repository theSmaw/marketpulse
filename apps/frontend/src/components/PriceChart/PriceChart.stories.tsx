import type { Meta, StoryObj } from "@storybook/react-vite";

import { cx } from "../../cx.js";
import { barSeriesFixtureView } from "../../fixtures/bar-series.js";
import type { PriceChartProps } from "./PriceChart.js";
import { PriceChart } from "./PriceChart.js";
import styles from "./PriceChart.stories.module.css";

// The chart at the widths it actually renders at, with **no backend running**
// (Task 2.12.4).
//
// ## Why every story is wrapped in a width
//
// `CHARTING.md` §2's table is the argument: the Price region is 1,019px at a
// 1920 viewport and 342px at 390, and the chart's breakpoints are **the
// region's** rather than the page's. A story rendered at the workshop's own
// width would review the chart at a size the product never shows it at, and
// would review exactly one of the four density treatments.
//
// So the widths below are the region's measured ones. The chart measures
// whatever box it is given, which is why this works at all and is the same
// property that makes it correct inside a grid that reflows.
//
// ## What a reviewer is being asked to judge here
//
// Three things, and each is a rule that a chart quietly breaks:
//
//  - **The frame is one rule.** A bottom hairline and nothing else — no left
//    spine, no right spine, no box. A four-sided frame is the single most
//    default-looking thing a chart can do, and it is what every library ships.
//  - **The line is achromatic whatever the window did.** Direction is not put
//    on the one mark repeated 1,950 times; that is `VISUAL-LANGUAGE.md`'s
//    measurement, where the price washes differ by 1.009:1 under `grayscale(1)`
//    and are therefore the same colour.
//  - **The wash agrees with the geometry everywhere, not just at the end.**
//    Green above the rule, red below it. A window that dips and recovers must
//    show both; one colour across the whole area is the defect this was
//    revised out of on 2026-09-12.
//  - **A frame with nothing in it is still a chart.** `Waiting` is the state
//    `PRODUCT_SPEC.md` §28's 500 ms is satisfied by, and it must read as a
//    scale about to be filled rather than as an empty box.
//
// ## Every state, and the one rule behind them (Task 2.12.7)
//
// The six members are all below, and the thing to read them against is the rule
// that decides all six: **a mark derived from the window runs the full frame; a
// mark derived from the bars stops at the coverage edge.**
//
// `Uncovered` is the one to look at hardest, and it is the state this screen is
// in most of the time — the store is backfilled nightly and the free plan
// withholds the most recent ~15 minutes, so a window reaching towards now is
// routinely covered up to some point and no further. Three things there have to
// be true at once: the axis is the window that was **asked for**, the line
// stops where the data does, and the difference is a region rather than an
// absence. `NoBars` is the same treatment at coverage zero, and `Waiting` is the
// same frame with no wash at all — nothing is known to be missing before
// anything has been answered.
//
// `Refused` and `Failed` render **nothing**, deliberately: neither carries a
// window, so a frame under either would be a picture of something nobody asked
// for. They are stories rather than an omission because *"nobody revisited it"*
// and *"it was decided"* render identically, and this is where the decision is
// visible.
//
// Every story is built by `barSeriesFixtureView` from a body recorded off the
// real endpoint and collapsed through the real state transition. Nothing here
// is a hand-written state: a hand-built `partial` whose coverage disagrees with
// its bars is unreachable in the real layer, and a chart tuned against one
// draws the real thing wrongly.
//
// ## The direction stories, and what they are actually for (Task 2.12.5)
//
// Four windows — one that rose, one that fell, one that closed exactly where it
// opened, and one at the default window's real density of 1,950 bars — and then
// **the same four under `grayscale(1)` and under a deuteranopia simulation**.
//
// That last row is the acceptance criterion rather than a nicety.
// `VISUAL-LANGUAGE.md` measured `--price-positive-wash` against
// `--price-negative-wash` at **1.009:1 in greyscale**: washed back to a fill,
// the two are the same colour, so the tint is decoration and the geometry is the
// channel. The way to know that is true of the *rendered* chart rather than of
// the tokens is to look at the rendered chart with the hue taken out, which is
// what `Greyscale` and `Deuteranopia` do. A reviewer who can still say which way
// each window went is looking at a chart that works; one who cannot is looking
// at a defect the token table could not have shown them.
//
// Roughly one man in twelve needs the second of those, which is why it is a
// story in the workshop rather than a screenshot in a task file.

const meta = {
  title: "Market/PriceChart",
  component: PriceChart,
} satisfies Meta<typeof PriceChart>;

/**
 * The deuteranopia matrix, as an SVG filter the stories below point `filter:` at.
 *
 * Machado, Oliveira and Fernandes (2009) at full severity — the same simulation
 * a browser's own rendering-emulation panel applies, stated here as eleven
 * numbers because a dependency that draws a filter is a dependency in a bundle.
 * It is rendered once, hidden, beside the story that uses it: an SVG filter is
 * referenced by id from anywhere in the document.
 */
function ColourVisionFilters() {
  return (
    <svg aria-hidden="true" className={styles.filters} focusable="false">
      <filter id="deuteranopia" colorInterpolationFilters="linearRGB">
        <feColorMatrix
          type="matrix"
          values="0.367 0.861 -0.228 0 0
                  0.280 0.673  0.047 0 0
                 -0.012 0.043  0.969 0 0
                  0     0      0     1 0"
        />
      </filter>
    </svg>
  );
}

/** One chart at the wide region's measured width, optionally under a filter. */
function Region({
  view,
  treatment,
}: {
  readonly view: PriceChartProps["view"];
  readonly treatment?: string | undefined;
}) {
  return (
    <div className={cx(styles.wide, treatment)}>
      <PriceChart symbol="NVDA" view={view} />
    </div>
  );
}

export default meta;

type Story = StoryObj<typeof meta>;

/** The region at a 1920 viewport — five gridlines, dates and times. */
export const Wide: Story = {
  args: { symbol: "NVDA", view: barSeriesFixtureView("full") },
  render: (args) => (
    <div className={styles.wide}>
      <PriceChart {...args} />
    </div>
  ),
};

/** The region at a 1024 viewport, which is where the compact pair takes over. */
export const Narrow: Story = {
  args: { symbol: "NVDA", view: barSeriesFixtureView("full") },
  render: (args) => (
    <div className={styles.narrow}>
      <PriceChart {...args} />
    </div>
  ),
};

/**
 * Before the first answer — the frame, the scale, and nothing written on it.
 *
 * This is the story the frame-first rule exists for, and the one worth looking
 * at hardest: it has to read as a chart waiting rather than as a chart broken.
 */
export const Waiting: Story = {
  args: { symbol: "NVDA", view: { state: "loading" } },
  render: (args) => (
    <div className={styles.wide}>
      <PriceChart {...args} />
    </div>
  ),
};

/**
 * A 200 with nothing in it, which is an answer and is what CI's store returns
 * for every window.
 *
 * The axis is real and labelled — that window was asked for — and there is no
 * line, because there is nothing to draw. Inventing a price scale for it would
 * be a picture of data this system does not hold.
 *
 * **The whole plot is washed** (Task 2.12.7), because coverage zero is this
 * chart's uncovered treatment at its limit rather than a fourth treatment. Put
 * this beside `Waiting`: the two are the same frame, and the wash is the entire
 * difference between *we asked and hold none of it* and *we have not asked yet*.
 */
export const NoBars: Story = {
  args: { symbol: "NVDA", view: barSeriesFixtureView("empty") },
  render: (args) => (
    <div className={styles.wide}>
      <PriceChart {...args} />
    </div>
  ),
};

/**
 * A held answer with a newer one in flight. **Identical**, deliberately.
 *
 * `FRONTEND-STATE.md` §2's rule is that the mark never touches a number — no
 * dim, no blur, no fade, no skeleton over a price — and a chart that redrew a
 * held series in a second style is that rule's stated reversal trigger. The
 * mark lives on the panel around this, as a dashed rail beside the figures.
 *
 * **Confirmed rather than inherited at Task 2.12.7**, which owned the decision.
 * The mark's subject is the *answer* — the reading above, the drawing and the
 * eight stated facts below are one answer and are one request old as a whole —
 * so a second mark inside the plot would say two things were independently
 * stale. And declining it keeps §2's reversal trigger unfired, which is worth
 * more than the mark would be.
 */
export const Held: Story = {
  args: { symbol: "NVDA", view: barSeriesFixtureView("partial") },
  render: (args) => (
    <div className={styles.wide}>
      <PriceChart {...args} />
    </div>
  ),
};

/**
 * **A window that rose.** The line finishes above the dashed rule at the price
 * it opened at.
 *
 * Two things to check, and the second is the one revised on 2026-09-12. The
 * **order of the channels**: read the picture with the tint ignored and it still
 * says *up*, because the line is on the upper side of a rule that is on the
 * plot. And the **tint's subject**: the early minutes of this window trade below
 * their own open, so that stretch is **red** inside a window that rose. One
 * colour across the whole area would be a window-level fact painted over
 * regions that locally disagree with it.
 */
export const WindowRose: Story = {
  args: { symbol: "NVDA", view: barSeriesFixtureView("full") },
  render: (args) => <Region view={args.view} />,
};

/**
 * **A window that fell** — the recorded `partial`, which is also the ordinary
 * state of this screen on a weekday afternoon.
 */
export const WindowFell: Story = {
  args: { symbol: "NVDA", view: barSeriesFixtureView("partial") },
  render: (args) => <Region view={args.view} />,
};

/**
 * **A window that closed at exactly the price it opened at**, which is the
 * third state and not a degenerate one.
 *
 * HD's 13:00–14:00 ET hour on 2026-09-04 traded between 320.31 and 320.97 and
 * ended at 320.705, where it started. So the line wanders, the fill has real
 * area on **both** sides of the rule, and it finishes exactly on it.
 *
 * **There is no neutral wash here and there is no neutral state to have one.**
 * Since the fill splits at the rule, a flat window is green where it was up and
 * red where it was down — which is more informative than a single achromatic
 * tint was, and is the clearest case for why the split is right: this window's
 * shape is the whole of what there is to say about it.
 *
 * The genuinely degenerate case — every bar identical, a price domain of zero
 * height — is `FLAT_DOMAIN_FRACTION`'s and lives in `chart-value-axis.test.ts`.
 * It does not exist in the store, so it cannot be a recorded body, and
 * inventing one here is what this fixture set exists to refuse.
 */
export const WindowFlat: Story = {
  args: { symbol: "NVDA", view: barSeriesFixtureView("flat") },
  render: (args) => <Region view={args.view} />,
};

/**
 * **The density the product actually opens at** — 1,950 bars over five
 * sessions, which is 0.47 px per bar at the region's measured 923 px.
 *
 * Three things to look at, and none is visible in any other story. The
 * **wash under four session seams**: the fill passes beneath every dashed
 * vertical and beneath every gridline, which is where the grid drops from
 * 1.27:1 to 1.11:1 — the one cost `tokens.css` accepts, and the thing to
 * confirm is that a gridline crossing tinted ground is still a gridline. The
 * **area path at 1,950 points**, which is the line's own path with two segments
 * and a close appended rather than a second walk over the bars — and which is
 * defined once and referenced twice, so the split costs two small elements
 * rather than a second copy of that string. And the **two sessions below the
 * opening rule**: NVDA's first two days of this window trade under where it
 * opened, so a fifth of a window that gained 5.19% is red.
 */
export const Dense: Story = {
  args: { symbol: "NVDA", view: barSeriesFixtureView("dense") },
  render: (args) => <Region view={args.view} />,
};

/**
 * **A window we asked for and hold part of** — the state this screen is in most
 * of the time, and the one Task 2.12.7 exists for.
 *
 * NVDA over Thursday 3 September to Tuesday 8 September: the store holds both
 * complete sessions and stops at Friday's close, so 210 of 990 trading minutes
 * were asked for and are not held. Four things to check, and the third is the
 * one a chart normally gets wrong:
 *
 *  - **The axis is the whole window.** Five tick labels, three sessions, and the
 *    last of them is one the store has nothing in. A frame that shrank to the
 *    data would look complete and disagree silently with the sentence printed
 *    directly beneath it.
 *  - **The ground changes** where the data stops, at 1.107:1 — the quietest
 *    mark in this language, because a short answer is not a fault.
 *  - **The line is clipped rather than shortened**, and so are the wash and the
 *    reference rule. Letting any of them run to the frame renders perfectly and
 *    reads as *flat data*, which is worse than a hole.
 *  - **The edge is a long dash** and it lands on a session seam here, which is
 *    the common case rather than a coincidence: a store caught up to a previous
 *    session's close stops exactly on a session boundary. Ink and rhythm are
 *    what tell the two apart.
 */
export const Uncovered: Story = {
  args: { symbol: "NVDA", view: barSeriesFixtureView("uncovered") },
  render: (args) => <Region view={args.view} />,
};

/**
 * **The server declined to answer, so there is nothing here.** That is the
 * story.
 *
 * A refusal is an answer about the *request*: this member carries no series and
 * therefore no window, and a frame under it would have to invent one to be a
 * picture of. The sentence and the server's own arithmetic are rendered by
 * `BarSeriesPanel` beneath, where they belong.
 *
 * It is a story rather than an omission because the alternative was weighed and
 * declined — an empty frame would hold the region's height so the page below
 * did not jump when a retry succeeded, and that is paid for instead by the
 * sentence, its detail and the retry occupying the region.
 */
export const Refused: Story = {
  args: { symbol: "NVDA", view: barSeriesFixtureView("refusedCap") },
  render: (args) => <Region view={args.view} />,
};

/**
 * **Nothing arrived, so there is nothing here either** — and the rest of the
 * page is untouched, which is the property the browser suite asserts because it
 * is the only level where a boundary can be observed.
 */
export const Failed: Story = {
  args: { symbol: "NVDA", view: barSeriesFixtureView("unavailable") },
  render: (args) => <Region view={args.view} />,
};

/**
 * **All four, with the hue taken out.** This is the acceptance criterion.
 *
 * `--price-positive-wash` and `--price-negative-wash` differ by **1.009:1**
 * under `grayscale(1)`, so every tinted region below is, for practical
 * purposes, the same grey — including the two sides of the same chart. If
 * direction were carried by the wash, this row would say nothing at all.
 *
 * It is not, because the rule is on the plot and the line is on one side of it.
 * Read top to bottom: up, down, finished where it started, up, up.
 *
 * **The fifth row is Task 2.12.7's** and it is here for a second claim: the
 * uncovered treatment carries no hue either. Every contrast pair in it moves by
 * less than a hundredth of a ratio under this filter, so the coverage edge and
 * the ground behind it read exactly as they do in colour — there is nothing in
 * them for a colour-vision difference to take away.
 */
export const Greyscale: Story = {
  args: { symbol: "NVDA", view: barSeriesFixtureView("full") },
  render: () => (
    <div className={styles.stack}>
      <Region
        view={barSeriesFixtureView("full")}
        treatment={styles.greyscale}
      />
      <Region
        view={barSeriesFixtureView("partial")}
        treatment={styles.greyscale}
      />
      <Region
        view={barSeriesFixtureView("flat")}
        treatment={styles.greyscale}
      />
      <Region
        view={barSeriesFixtureView("dense")}
        treatment={styles.greyscale}
      />
      <Region
        view={barSeriesFixtureView("uncovered")}
        treatment={styles.greyscale}
      />
    </div>
  ),
};

/**
 * **The same four under a deuteranopia simulation**, which is what roughly one
 * man in twelve sees.
 *
 * Greyscale is the harsher test and this is the more honest one: a red-green
 * difference does not vanish for a deuteranope so much as collapse toward a
 * single yellowish axis, and washes this pale collapse completely. Same reading
 * as above, for the same reason — the geometry never depended on the hue. The
 * fifth row is the uncovered treatment, which never had a hue to lose.
 */
export const Deuteranopia: Story = {
  args: { symbol: "NVDA", view: barSeriesFixtureView("full") },
  render: () => (
    <div className={styles.stack}>
      <ColourVisionFilters />
      <Region
        view={barSeriesFixtureView("full")}
        treatment={styles.deuteranopia}
      />
      <Region
        view={barSeriesFixtureView("partial")}
        treatment={styles.deuteranopia}
      />
      <Region
        view={barSeriesFixtureView("flat")}
        treatment={styles.deuteranopia}
      />
      <Region
        view={barSeriesFixtureView("dense")}
        treatment={styles.deuteranopia}
      />
      <Region
        view={barSeriesFixtureView("uncovered")}
        treatment={styles.deuteranopia}
      />
    </div>
  ),
};
