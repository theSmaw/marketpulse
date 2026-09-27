import type { Meta, StoryObj } from "@storybook/react-vite";

import type {
  Bar,
  WireMarketOverview,
  WireOverviewFigure,
} from "@marketpulse/shared";

import { sectorPerformance } from "../../market/index.js";
import { Region } from "../Region/Region.js";
import { SectorPerformance } from "./SectorPerformance.js";

// The sector region, in the states the join can actually produce.
//
// `The ranked list.dc.html` §05. **Derived from what is reachable rather than
// from what is imaginable**: `buildMarketOverview` returns a three-member union
// per symbol — `observed`, `stored`, `unknown` — and each state below is built
// by pushing a real frame through the **shipped reader**, so a story holds a
// state the application can reach rather than one somebody typed.
//
// **What to review side by side is height.** `Movers` sits directly below this
// region in the same grid and the two share one `fr` ratio, so a state that is a
// pixel taller than its neighbour moves everything under it. The footer
// therefore reserves two line boxes at every width, whatever sentence is true
// and whichever rung is in force.
//
// **Every one of these is drawn inside a `Region`**, which is how it appears on
// the landing page, because the region's frame is what a reader sees the state
// inside — and a list reviewed without its box hides the one thing the box
// decides, which is whether the content fits.
//
// Task 4.3.7 owns the honest states: the trailing quiet group, the wording of
// each absence, and the guard that says a named region speaks when its subject
// is missing.

const NO_OBSERVATIONS = new Map<string, Bar>();
const NO_SNAPSHOT = new Set<string>();

const observed = (
  symbol: string,
  price: number,
  changePercent: number,
): WireOverviewFigure => ({
  state: "observed",
  symbol,
  at: "2026-09-25T18:01:00.000Z",
  price,
  changePercent,
  changeBasis: "2026-09-24",
});

const stored = (
  symbol: string,
  close: number,
  sessionChangePercent?: number,
): WireOverviewFigure =>
  sessionChangePercent === undefined
    ? { state: "stored", symbol, session: "2026-09-25", close }
    : {
        state: "stored",
        symbol,
        session: "2026-09-25",
        close,
        sessionChangePercent,
      };

/**
 * A live price with **nothing to measure it from** — `changePercent` is omitted
 * rather than zero, which is the wire's own rule: `0` there would claim the
 * market did not move.
 *
 * The key is absent rather than present-as-`undefined`, because
 * `exactOptionalPropertyTypes` makes those different types and the encoder
 * treats them differently.
 */
const observedNoBasis = (
  symbol: string,
  price: number,
): WireOverviewFigure => ({
  state: "observed",
  symbol,
  at: "2026-09-25T18:01:00.000Z",
  price,
});

const unknown = (symbol: string): WireOverviewFigure => ({
  state: "unknown",
  symbol,
});

/**
 * A frame, **in rank order** — the producer ranks and this component does not,
 * so a story that handed it an unsorted array would be drawing a state the
 * gateway cannot send.
 */
const frame = (
  sectors: readonly WireOverviewFigure[],
  sectorLadderStep: 1 | 2 | 5 | 10,
): WireMarketOverview => ({
  computedAt: "2026-09-25T18:01:00.000Z",
  feeds: ["iex"],
  figures: [],
  sectors,
  sectorLadderStep,
});

/** Through the shipped reader, which is the point — see the header. */
const view = (overview: WireMarketOverview) => {
  const read = sectorPerformance(overview, NO_OBSERVATIONS, NO_SNAPSHOT);
  if (read === undefined)
    throw new Error("the story built an unreadable frame");
  return read;
};

const LIVE = frame(
  [
    observed("XLK", 187.67, 1.84),
    observed("XLC", 112.6, 0.96),
    observed("XLY", 112.96, 0.63),
    observed("XLI", 172.37, 0.41),
    observed("XLF", 57.25, 0.31),
    observed("XLV", 148.22, 0.12),
    observed("XLB", 50.95, 0),
    observed("XLP", 83.38, -0.18),
    observed("XLU", 91.04, -0.44),
    observed("XLRE", 43.42, -0.87),
    observed("XLE", 96.11, -1.27),
  ],
  2,
);

const meta = {
  title: "Market/SectorPerformance",
  component: SectorPerformance,
  parameters: { layout: "padded" },
  args: { view: view(LIVE) },
  render: (args) => (
    <Region name="Sector performance">
      <SectorPerformance {...args} />
    </Region>
  ),
} satisfies Meta<typeof SectorPerformance>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Eleven `observed` figures with a change and a basis. The ordinary session. */
export const RankedLive: Story = {};

/**
 * **Outside a session — the state the region is in for roughly 80% of the
 * week**, and the one in which it is the only surface answering this epic's
 * exit criterion.
 *
 * A `stored` figure's move is `sessionChangePercent`, **not** `changePercent`:
 * the last completed session's own close-to-close move, a number that will never
 * change again, against a live-against-a-close figure that moves while somebody
 * watches it. Same units on the same scale, which is what makes ranking one
 * against the other honest; different claims, which is why they are different
 * field names and why a renderer reaching for the wrong one finds nothing.
 *
 * There is **no arrival mark in this state, ever**: no bar is arriving.
 */
export const OutsideASession: Story = {
  args: {
    view: view(
      frame(
        [
          stored("XLE", 96.11, 1.02),
          stored("XLU", 91.04, 0.55),
          stored("XLB", 50.95, 0.37),
          stored("XLP", 83.38, 0.35),
          stored("XLF", 57.25, 0.21),
          stored("XLRE", 43.42, 0.08),
          stored("XLV", 148.22, -0.11),
          stored("XLI", 172.37, -0.24),
          stored("XLY", 112.96, -0.41),
          stored("XLC", 112.6, -0.6),
          stored("XLK", 187.67, -0.74),
        ],
        2,
      ),
    ),
  },
};

/**
 * **Eleven `unknown` figures — what every gated machine sees, for ever.**
 *
 * CI's store is 518 securities and zero bars, so no sector figure there has ever
 * had a move, `sessionChangePercent` never occurs, and the rung is `±1`
 * permanently. Eleven rows still render, **in the order the producer sent
 * them** — which with nothing to rank is `SECTORS`' declared order, because
 * every keyless figure sorts after every keyed one and there are no keyed ones.
 *
 * The ladder is drawn against a scale with nothing on it, which is the honest
 * answer rather than a degraded one, and the footer's claim is still true of
 * every row: each of them **is** that sector's benchmark ETF, whether or not we
 * hold a figure for it.
 */
export const NothingStored: Story = {
  args: {
    view: view(
      frame(
        [
          "XLK",
          "XLV",
          "XLF",
          "XLY",
          "XLC",
          "XLI",
          "XLP",
          "XLE",
          "XLU",
          "XLRE",
          "XLB",
        ].map(unknown),
        1,
      ),
    ),
  },
};

/**
 * **Some ranked, some not** — a developer's store mid-backfill, and the shape
 * Task 4.3.7 turns into the trailing quiet group.
 *
 * Three things to read here. The unranked rows carry an **em dash** rather than
 * a number, because a rank is a claim and `?? 0` would place them among the
 * genuinely flat ones. Their bar cell is **empty rather than zero-length**,
 * which is what `XLB`'s anchor tick in `RankedLive` exists to be told apart
 * from. And their absences are **three different sentences**, because three
 * different things are missing: a stored close with nothing before it names its
 * session, a live price with no basis says so, and a sector we have heard
 * nothing about says `None stored`.
 */
export const PartiallyRanked: Story = {
  args: {
    view: view(
      frame(
        [
          observed("XLK", 187.67, 1.84),
          observed("XLI", 172.37, 0.41),
          stored("XLC", 112.6, 0.22),
          observed("XLP", 83.38, -0.18),
          stored("XLE", 96.11, -0.93),
          observedNoBasis("XLV", 148.22),
          stored("XLU", 91.04),
          stored("XLRE", 43.42),
          unknown("XLY"),
          unknown("XLF"),
          unknown("XLB"),
        ],
        2,
      ),
    ),
  },
};

/**
 * **A heavy day, and the only whole-list geometry change this component
 * permits.**
 *
 * The rung has ratcheted to ±5. Read it against `RankedLive`: the zero anchor,
 * the label column and the figure column are in exactly the same places, the
 * bars are shorter, and the footer says which scale it is — because a length is
 * a claim about a quantity, so the quantity is printed in two places that read
 * the same rung and cannot drift apart.
 *
 * The ladder's midpoints are unlabelled here: half of 5 is 2.5, and a printed
 * `2.5` reads as precision the picture does not have. The gridlines are still
 * drawn, because the lines are the reading and the labels were the annotation.
 */
export const HeavyDay: Story = {
  args: {
    view: view(
      frame(
        [
          observed("XLE", 96.11, 4.36),
          observed("XLF", 57.25, 2.18),
          observed("XLI", 172.37, 1.4),
          observed("XLB", 50.95, 0.92),
          observed("XLP", 83.38, 0.31),
          observed("XLV", 148.22, 0.04),
          observed("XLU", 91.04, -0.22),
          observed("XLRE", 43.42, -1.11),
          observed("XLY", 112.96, -2.04),
          observed("XLC", 112.6, -3.17),
          observed("XLK", 187.67, -4.88),
        ],
        5,
      ),
    ),
  },
};
