import type { Meta, StoryObj } from "@storybook/react-vite";

import { SECTOR_LADDER_STEPS } from "@marketpulse/shared";

import { directionOf, formatChangePercent } from "../../market/index.js";
import type { SectorRow } from "../../market/index.js";
import gridStyles from "../stories.module.css";
import { RankedList } from "./RankedList.js";

// The ranked list, in the states its anatomy has to survive.
//
// `The ranked list.dc.html` §03 and §04 are the drawings. What is worth
// reviewing side by side here is **geometry** rather than content, and three
// things in particular:
//
//   - **The zero anchor never moves**, whichever rung is in force. The four
//     ladders below are the only whole-list geometry change this component
//     permits, and the rank, the label and the figure columns are identical
//     across all four.
//   - **The figure column is a fixed reserve.** `+0.9%` and `−12.34%` must not
//     move the bar's right edge, and the widest figure this product can produce
//     is drawn below beside the narrowest.
//   - **Direction survives `grayscale(1)`.** The price palette differs by
//     **1.04:1** desaturated, so hue is the entire difference between up and
//     down — and on this component it is carried three further ways: the side of
//     the anchor the bar grows from, `PriceChange`'s glyph and sign, and the
//     printed ordinal. Review this grid in greyscale; that is the acceptance
//     rather than the hope.
//
// **The bar-off story is Story 4.5's use**, drawn here because the whole reason
// this is one component is that the two uses are never on screen at the same
// size, so a treatment written twice would diverge and nobody would ever see
// both versions together to notice.

const row = (
  rank: number | undefined,
  label: string,
  symbol: string,
  percent: number | undefined,
): SectorRow =>
  percent === undefined
    ? {
        symbol,
        label,
        rank: undefined,
        move: undefined,
        absent: "None stored",
        arrival: undefined,
      }
    : {
        symbol,
        label,
        rank,
        move: {
          change: formatChangePercent(percent),
          direction: directionOf(percent),
          percent,
        },
        absent: undefined,
        arrival: undefined,
      };

/**
 * The eleven, ranked — including a reading of **exactly zero**, which draws the
 * anchor tick and nothing else. A zero-length band would be a claim of no
 * movement; the tick is what lets that be told apart from a row with no reading
 * at all, where the bar cell is genuinely empty.
 */
const ELEVEN: readonly SectorRow[] = [
  row(1, "Technology", "XLK", 1.84),
  row(2, "Communication Services", "XLC", 0.96),
  row(3, "Consumer Discretionary", "XLY", 0.63),
  row(4, "Industrials", "XLI", 0.41),
  row(5, "Financials", "XLF", 0.31),
  row(6, "Health Care", "XLV", 0.12),
  row(7, "Materials", "XLB", 0),
  row(8, "Consumer Staples", "XLP", -0.18),
  row(9, "Utilities", "XLU", -0.44),
  row(10, "Real Estate", "XLRE", -0.87),
  row(11, "Energy", "XLE", -1.27),
];

const meta = {
  title: "Market/RankedList",
  component: RankedList,
  parameters: { layout: "padded" },
  args: {
    rows: ELEVEN,
    bar: { kind: "signed", scale: 2 },
    name: "Sectors ranked by today’s move",
  },
} satisfies Meta<typeof RankedList>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The ordinary state: eleven rows against a printed ±2%. */
export const Ranked: Story = {};

/**
 * **The four rungs, and the thing to check is what does NOT move.**
 *
 * The ladder steps outward only within a session and resets at the opening
 * bell, so a reader meets at most one of these changes a day and sees the
 * reason for it. What must be identical across all four: the zero anchor's
 * x-position, the label column's width and the figure column's right edge. The
 * only thing that may change is the bars' lengths and the printed ladder.
 *
 * Note the midpoints. `±2` and `±10` label theirs because half the rung is a
 * whole number; `±1` and `±5` draw the same gridlines unlabelled, because a
 * printed `2.5` reads as precision the picture does not have.
 */
export const EveryRung: Story = {
  render: (args) => (
    <div className={gridStyles.stack}>
      {SECTOR_LADDER_STEPS.map((step) => (
        <div className={gridStyles.stackItem} key={step}>
          <span className={gridStyles.label}>{`±${String(step)}%`}</span>
          <RankedList {...args} bar={{ kind: "signed", scale: step }} />
        </div>
      ))}
    </div>
  ),
};

/**
 * **A move past the largest rung saturates, and the row's figure does not.**
 *
 * `XLE` is at −14.62% against a printed ±10%: the bar is clipped at the bottom
 * rung while the figure stays exact. The two therefore disagree in magnitude,
 * and **nothing in the UI says so** — the figure is the claim and the bar is the
 * comparison. Inventing a fifth rung on the day it happens would be a scale
 * nobody has reviewed appearing on the one day the screen matters most.
 */
export const Saturated: Story = {
  args: {
    bar: { kind: "signed", scale: 10 },
    rows: [
      row(1, "Technology", "XLK", 11.4),
      row(2, "Industrials", "XLI", 6.2),
      row(3, "Health Care", "XLV", 0.12),
      row(4, "Utilities", "XLU", -3.9),
      row(5, "Energy", "XLE", -14.62),
    ],
  },
};

/**
 * **The widest and the narrowest figure this product can produce, in one list.**
 *
 * `−12.34%` is eight monospaced glyphs plus `PriceChange`'s 16 px glyph box; the
 * track is a stated 78 px. The thing to check is that the **bar's left edge is
 * in the same place on every row** — if the figure column sized to its content,
 * a re-order would move all eleven bars' origins, which is invisible to jsdom,
 * to axe, to every unit test and to a screenshot of one state.
 *
 * `Communication Services` is here for the same reason one column left: it is
 * the longest label, at a measured 143.75 px against a stated 144.
 */
export const WidestAndNarrowest: Story = {
  args: {
    bar: { kind: "signed", scale: 10 },
    rows: [
      row(1, "Communication Services", "XLC", 9.9),
      row(2, "Energy", "XLE", 0.9),
      row(3, "Real Estate", "XLRE", -0.05),
      row(4, "Consumer Discretionary", "XLY", -12.34),
    ],
  },
};

/**
 * **A row with no move is not ranked**, so it has no number — an em dash and
 * words instead of digits.
 *
 * A rank is a claim, and `rank ?? 0` would place a sector we have heard nothing
 * about among the genuinely flat ones: ADR 0029's false impression expressed as
 * a **position** rather than as a number. The bar cell is empty rather than
 * zero-length, which is what the anchor tick in `Ranked` exists to be told apart
 * from.
 *
 * **This is what every gated machine sees, for ever.** CI's store is 518
 * securities and zero bars, so all eleven sector figures are `unknown` there and
 * the rung is `±1` — the ladder is drawn against a scale with nothing on it,
 * which is the honest answer for a list with nothing to draw. Task 4.3.7 owns
 * the trailing quiet group and the wording of each absence.
 */
export const NothingStored: Story = {
  args: {
    bar: { kind: "signed", scale: 1 },
    rows: ELEVEN.map((entry) =>
      row(undefined, entry.label, entry.symbol, undefined),
    ),
  },
};

/**
 * **Story 4.5's use, and the one real difference between the two.**
 *
 * A top-N over 518 has a far wider dynamic range and its five members are near
 * the top of it by construction, so five bars all within a whisker of full
 * length carry almost no information — and the one thing a reader would take
 * from them, that these five are similar, is an artefact of the selection rather
 * than a fact about the market. The bar track is **absent, not empty**: a track
 * reserved for a picture that is never drawn is 654 px of nothing.
 *
 * Everything else is identical, which is the whole argument for one component.
 */
export const BarOff: Story = {
  args: {
    bar: { kind: "none" },
    name: "Gainers",
    rows: [
      row(1, "NVIDIA", "NVDA", 4.21),
      row(2, "Advanced Micro Devices", "AMD", 3.88),
      row(3, "Broadcom", "AVGO", 2.94),
      row(4, "Micron Technology", "MU", 2.51),
      row(5, "Palantir", "PLTR", 2.4),
    ],
  },
};
