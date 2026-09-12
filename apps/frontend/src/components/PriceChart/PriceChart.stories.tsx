import type { Meta, StoryObj } from "@storybook/react-vite";

import { barSeriesFixtureView } from "../../fixtures/bar-series.js";
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

const meta = {
  title: "Market/PriceChart",
  component: PriceChart,
} satisfies Meta<typeof PriceChart>;

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
