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
//  - **A frame with nothing in it is still a chart.** `Waiting` is the state
//    `PRODUCT_SPEC.md` §28's 500 ms is satisfied by, and it must read as a
//    scale about to be filled rather than as an empty box.
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
      <PriceChart view={view} />
    </div>
  );
}

export default meta;

type Story = StoryObj<typeof meta>;

/** The region at a 1920 viewport — five gridlines, dates and times. */
export const Wide: Story = {
  args: { view: barSeriesFixtureView("full") },
  render: (args) => (
    <div className={styles.wide}>
      <PriceChart {...args} />
    </div>
  ),
};

/** The region at a 1024 viewport, which is where the compact pair takes over. */
export const Narrow: Story = {
  args: { view: barSeriesFixtureView("full") },
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
  args: { view: { state: "loading" } },
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
 */
export const NoBars: Story = {
  args: { view: barSeriesFixtureView("empty") },
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
 */
export const Held: Story = {
  args: { view: barSeriesFixtureView("partial") },
  render: (args) => (
    <div className={styles.wide}>
      <PriceChart {...args} />
    </div>
  ),
};

/**
 * **A window that rose.** The line finishes above the dashed rule at the price
 * it opened at, and the area between them carries the positive wash.
 *
 * The thing to check is the order of the two channels: read the picture with
 * the tint ignored and it still says *up*, because the line is on the upper
 * side of a rule that is on the plot. That is the claim `Greyscale` below
 * tests rather than asserts.
 */
export const WindowRose: Story = {
  args: { view: barSeriesFixtureView("full") },
  render: (args) => <Region view={args.view} />,
};

/**
 * **A window that fell** — the recorded `partial`, which is also the ordinary
 * state of this screen on a weekday afternoon.
 */
export const WindowFell: Story = {
  args: { view: barSeriesFixtureView("partial") },
  render: (args) => <Region view={args.view} />,
};

/**
 * **A window that closed at exactly the price it opened at**, which is the
 * third state and not a degenerate one.
 *
 * HD's 13:00–14:00 ET hour on 2026-09-04 traded between 320.31 and 320.97 and
 * ended at 320.705, where it started. So the line wanders, the fill has real
 * area on **both** sides of the rule, and the direction is still none — which
 * is why the wash is achromatic here rather than green. A flat window tinted
 * green would be a chart claiming a move the market did not make.
 *
 * The genuinely degenerate case — every bar identical, a price domain of zero
 * height — is `FLAT_DOMAIN_FRACTION`'s and lives in `chart-value-axis.test.ts`.
 * It does not exist in the store, so it cannot be a recorded body, and
 * inventing one here is what this fixture set exists to refuse.
 */
export const WindowFlat: Story = {
  args: { view: barSeriesFixtureView("flat") },
  render: (args) => <Region view={args.view} />,
};

/**
 * **The density the product actually opens at** — 1,950 bars over five
 * sessions, which is 0.47 px per bar at the region's measured 923 px.
 *
 * Two things to look at, and neither is visible in any other story. The
 * **wash under four session seams**: the fill passes beneath every dashed
 * vertical and beneath every gridline, which is where the grid drops from
 * 1.27:1 to 1.11:1 — the one cost `tokens.css` accepts, and the thing to
 * confirm is that a gridline crossing tinted ground is still a gridline. And
 * the **area path at 1,950 points**, which is the line's own path with two
 * segments and a close appended rather than a second walk over the bars.
 */
export const Dense: Story = {
  args: { view: barSeriesFixtureView("dense") },
  render: (args) => <Region view={args.view} />,
};

/**
 * **All four, with the hue taken out.** This is the acceptance criterion.
 *
 * `--price-positive-wash` and `--price-negative-wash` differ by **1.009:1**
 * under `grayscale(1)`, so the first two panels below are, for practical
 * purposes, tinted the same colour — and the third is too. If direction were
 * carried by the wash, this row would be four identical statements.
 *
 * It is not, because the rule is on the plot and the line is on one side of it.
 * Read top to bottom: up, down, neither, up.
 */
export const Greyscale: Story = {
  args: { view: barSeriesFixtureView("full") },
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
 * as above, for the same reason — the geometry never depended on the hue.
 */
export const Deuteranopia: Story = {
  args: { view: barSeriesFixtureView("full") },
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
    </div>
  ),
};
