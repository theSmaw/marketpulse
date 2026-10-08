import type { Meta, StoryObj } from "@storybook/react-vite";
import { Component } from "react";

import { MOVERS_PER_SIDE } from "@marketpulse/shared";

import {
  directionOf,
  formatChangePercent,
  type MarketMovers,
  type SectorRow,
} from "../../market/index.js";
import { SAY_NOTHING_ARRIVED_AFTER_MS } from "../MarketProxyStrip/use-waited.js";
import { Region } from "../Region/Region.js";
import { Movers, MoversMeta, MoversReservation } from "./Movers.js";

// The movers region, in every state the brief enumerates.
//
// `The movers.dc.html` §05. **What to review side by side is height**: `Sector
// performance` and `Market breadth` sit on the two grid rows this region shares
// a ratio with, so a state a pixel taller than its neighbour moves everything
// under it — and the state that can do it is not a long list but a **short**
// one. Each list holds only the rows whose direction matches it, so a one-sided
// day draws one full list and one short one; the comparison these stories exist
// for is that `BothEndsFull`, `AOneSidedDay`, `OneRankableName` and
// `NothingRankable` are all **one box**.
//
// ## These views are typed, and that is a deviation with a date on it
//
// Every other region's stories push a real frame through the **shipped
// reader** — `marketBreadth`, `sectorPerformance` — so a story holds a state the
// application can reach rather than one somebody typed. **There is no movers
// reader yet**: the frame grows a movers section in Task 4.5.4, which owns the
// wire union and the read. So the rows below are built here, and the two things
// that could drift are held down by using the shipped formatter and the shipped
// classifier for every figure: `formatChangePercent` writes the string and
// `directionOf` decides the direction, both from the one percentage, so no
// story can hold a figure whose sign and glyph disagree with its number.
//
// **Task 4.5.4 owes this file a re-point**: when the reader exists, `view`
// below becomes a call to it over a real section, the way the two siblings do.
//
// ## The names are real universe rows
//
// Taken from `apps/backend/src/universe.ts`, including `Cognizant Technology
// Solutions Corporation Class A` — 50 characters, the longest name in the
// universe, which is what the flexible name track was rebuilt for: the drawn
// `144px` fitted eleven sector labels and **41.4% of company names are
// longer**, so the common case painted over its neighbour.

/** One row, with the shipped formatter and the shipped classifier. */
const row = (
  symbol: string,
  label: string,
  percent: number,
  rank: number,
  arrival?: string,
): SectorRow => ({
  symbol,
  label,
  rank,
  move: {
    change: formatChangePercent(percent),
    direction: directionOf(percent) ?? "unchanged",
    percent,
  },
  absent: undefined,
  arrival,
  basis: "observed:2026-10-07",
});

/** A list, ranked from 1 in the order it is written. */
const ranked = (
  entries: readonly (readonly [string, string, number, string?])[],
): readonly SectorRow[] =>
  entries.map(([symbol, label, percent, arrival], index) =>
    row(symbol, label, percent, index + 1, arrival),
  );

const GAINERS = ranked([
  ["SMCI", "Super Micro Computer, Inc.", 9.14, "2026-10-07T18:01:00.000Z"],
  ["FSLR", "First Solar, Inc.", 6.72],
  ["CEG", "Constellation Energy Corporation", 4.08, "2026-10-07T18:01:00.000Z"],
  ["NVDA", "NVIDIA Corporation", 3.41],
  ["CTSH", "Cognizant Technology Solutions Corporation Class A", 2.86],
]);

const LOSERS = ranked([
  ["MRNA", "Moderna, Inc.", -8.37],
  ["ALB", "Albemarle Corporation", -5.94, "2026-10-07T18:01:00.000Z"],
  ["DVN", "Devon Energy Corporation", -4.55],
  ["PLTR", "Palantir Technologies Inc. Class A", -3.12],
  ["MPWR", "Monolithic Power Systems, Inc.", -2.4],
]);

const BOTH_ENDS: MarketMovers = { gainers: GAINERS, losers: LOSERS };

const meta = {
  title: "Market/Movers",
  component: Movers,
  parameters: { layout: "padded" },
  args: { view: BOTH_ENDS },
  render: (args) => (
    /*
     * **Every state is drawn inside a `Region` with its head slot**, which is
     * how it appears on the landing page: the region's frame is what a reader
     * sees the state inside, and two lists reviewed without the box hide the
     * one thing the box decides, which is whether the content fits.
     */
    <Region name="Movers" meta={<MoversMeta />}>
      <Movers {...args} />
    </Region>
  ),
} satisfies Meta<typeof Movers>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * **Both ends full — five each way, and the state the budget was sized
 * against.**
 *
 * Read the two lists against each other. They are **peers**: each ranked from
 * 1, each in primary ink at medium weight with a printed ordinal and
 * `PriceChange` at full strength. The only things the second list has that the
 * first does not are its own heading and the `--rule-control` above it, which
 * separates two lists rather than two rows.
 *
 * Nothing here recedes, and that is the decision: the sector region's trailing
 * group is a demotion carried by **the rows**, so the mechanism transfers and
 * the emphasis does not. A losers list drawn in secondary ink below a rule
 * would read as *losers are the leftovers*, which is false and is tonally wrong
 * where a −8.37% name is the most interesting thing on the page.
 *
 * Two rows a side carry an arrival mark, which is the disc firing off a bar
 * arriving rather than off a figure changing.
 */
export const BothEndsFull: Story = {};

/**
 * **A one-sided day — five gainers and two losers, and the region does not
 * move.**
 *
 * This is the hazard the padding exists for, and it is an ordinary state rather
 * than an edge case: each list holds only the rows whose direction matches it,
 * so a day on which only two names fell draws one full list and one short one.
 *
 * At 1440 and 1024 nothing would move anyway — the landing grid's row is
 * `minmax(min-content, 1fr)` and resolves to 486 whatever the content is.
 * **At 768 and 390 the rows are untied and the region is its content**, so
 * without the padding this state would be 81 px shorter than the one above and
 * would step the whole lower page: three times the 25 px Task 4.3.7 spent a
 * task designing out.
 *
 * So each list is padded to five with **held rows** — `visibility: hidden`,
 * `aria-hidden`, naming nothing — which means the pitch comes from `.row`
 * itself and the arithmetic has no second home. Review it beside
 * {@link BothEndsFull} at 390: the two panels must be the same size to the
 * pixel, and the hairline under the last real row is **not drawn**, because a
 * separator that divides a row from a row that is not there divides nothing.
 */
export const AOneSidedDay: Story = {
  args: {
    view: {
      gainers: GAINERS,
      losers: ranked([
        ["MRNA", "Moderna, Inc.", -1.12],
        ["ALB", "Albemarle Corporation", -0.4],
      ]),
    },
  },
};

/**
 * **Every figure identical — a flat, narrow day, and the ranking is still
 * honest.**
 *
 * Ten names all reading `+0.11%` or `−0.11%`. The ordinals still count from 1
 * in each list, because the order is the comparator's and **two figures equal
 * at displayed precision never swap**: `compareByMove` returns `0` for a
 * display-equal pair, `Array.prototype.sort` has been stable by specification
 * since ES2019, and the bounded selection reproduces that stability by refusing
 * to let a display-equal candidate overtake one it is already holding. So the
 * order a reader sees is the order the producer sent, every frame, and a frame
 * that changes no figure moves no row.
 *
 * What this state is **not** is a defect: a printed ordinal over ten equal
 * figures is a statement about the list rather than a claim that one name moved
 * more than another, which is why the ordinal and the figure are both on the
 * row.
 */
export const EveryFigureIdentical: Story = {
  args: {
    view: {
      gainers: ranked([
        ["NVDA", "NVIDIA Corporation", 0.11],
        ["AMD", "Advanced Micro Devices, Inc.", 0.11],
        ["SMCI", "Super Micro Computer, Inc.", 0.11],
        ["FSLR", "First Solar, Inc.", 0.11],
        ["CEG", "Constellation Energy Corporation", 0.11],
      ]),
      losers: ranked([
        ["MRNA", "Moderna, Inc.", -0.11],
        ["ALB", "Albemarle Corporation", -0.11],
        ["DVN", "Devon Energy Corporation", -0.11],
        ["PLTR", "Palantir Technologies Inc. Class A", -0.11],
        ["MPWR", "Monolithic Power Systems, Inc.", -0.11],
      ]),
    },
  },
};

/**
 * **One rankable name in the whole universe.**
 *
 * Reachable rather than theoretical: it is the first minute of an extended-hours
 * session, or a feed coming back after an outage, and Task 4.1.6 measured a
 * five-minute minimum of **5 of 518** during a regular session — so single
 * figures are an extended-hours or dying-feed reading.
 *
 * One list holds one row and the other holds none, and **the region is the same
 * height as it is with ten**. The heading over the empty list is still drawn,
 * because `LOSERS` labels a list that is empty rather than claiming anything
 * about the market: a heading is not a figure, and what a reader needs to know
 * is *which* of the two ends has nothing in it.
 */
export const OneRankableName: Story = {
  args: {
    view: {
      gainers: ranked([["NVDA", "NVIDIA Corporation", 1.08]]),
      losers: [],
    },
  },
};

/**
 * **Nothing rankable at all — and this is what every gated machine sees, for
 * ever.**
 *
 * CI's store is 518 securities and **zero bars**, so no equity there has ever
 * had a move, every figure is `unknown`, and `selectMovers` filters on the
 * ranking key **before** it selects — so both lists are empty rather than five
 * arbitrary names we have heard nothing about. That filter is AC 5 rather than
 * tidiness: ordering keyless figures last does not remove them, and a `slice`
 * would have presented them as the day's biggest movers.
 *
 * **It is also most of a weekend and every process restart.** The region holds
 * its full height, both headings are drawn, and what says *why* is the footer —
 * whose words are Task 4.5.6's and whose room is reserved here and left empty.
 * Until then this state is a named region saying nothing about a missing
 * subject, which is `docs/GAPS.md` entry 13 exactly and is owed by name.
 */
export const NothingRankable: Story = {
  args: { view: { gainers: [], losers: [] } },
};

/**
 * **The paint before the first frame: the region's geometry, held and
 * invisible.**
 *
 * The real component from `RESERVED_MOVERS` — two headings, ten held rows, the
 * rule and the two-line claim — with the whole subtree taken out of both the
 * picture and the accessibility tree. Never a `min-height`: every number in
 * that height already exists exactly once, and a second copy is wrong the first
 * time any of them changes and wrong silently, because nothing below
 * `pnpm e2e` computes a layout.
 *
 * **The reserved rows name no security**, which is the one way this reservation
 * differs from the two siblings'. `RESERVED_SECTORS` can hold the eleven real
 * sector labels because the set is known from the universe; a movers list's
 * membership is an **answer**, so naming tickers here would put invented
 * securities with no figures on the landing page. Breadth's precedent instead: a
 * non-breaking space where a word goes.
 *
 * It looks empty **on purpose**, and what is being reviewed is that the box is
 * the same box as every state above it. It stops looking empty after two
 * seconds — which is the story below.
 */
export const BeforeTheFirstFrame: Story = {
  render: () => (
    <Region name="Movers" meta={<MoversMeta />}>
      <MoversReservation />
    </Region>
  ),
};

/**
 * **Nothing ever arrived — the same component, two seconds later.**
 *
 * `MoversReservation` says nothing for the first 2,000 ms, because for a few
 * hundred milliseconds a sentence would be a promise the next frame breaks — a
 * first frame was measured at 174–277 ms. Past the floor it is the **terminal**
 * state: an unreachable aggregate, a half-rolled deploy, a proxy holding the
 * socket open. Task 4.3.8 produced exactly that for `Sector performance`,
 * byte-identical at 600 ms and at 12 s, while a region 200 px above it
 * explained itself.
 *
 * **The noun is this region's own.** The strip has no *prices*, sectors have no
 * *moves*, breadth has no *count*, and this region has nothing **to rank**.
 * Four sentences, four nouns, one per region — which is what tells a reader
 * which region went quiet when two do at once. And it claims nothing about
 * whether the market is flat.
 *
 * The sentence sits in room the reservation **already holds**, which is what is
 * being reviewed against {@link BeforeTheFirstFrame}: nothing moves when it
 * appears, and the ten held rows stay hidden — the sentence is a sibling of the
 * held box rather than a child of it, because `visibility` is inherited by
 * children that never set it.
 */
export const NothingEverArrived: Story = {
  render: () => (
    <Region name="Movers" meta={<MoversMeta />}>
      <MoversReservation />
    </Region>
  ),
  play: async () => {
    // The floor is a real `setTimeout` in a real browser, so the story waits
    // past it rather than faking a clock there is no seam for.
    await new Promise((resolve) => {
      setTimeout(resolve, SAY_NOTHING_ARRIVED_AFTER_MS + 500);
    });
  },
};

/** A child that fails to render, so the region's own boundary catches it. */
class Throws extends Component {
  constructor(props: Record<string, never>) {
    super(props);
    throw new Error("Story: the region’s contents failed to render");
  }

  override render() {
    return null;
  }
}

/**
 * **The region failed** — the state `Region`'s own `ErrorBoundary` draws, in
 * this box.
 *
 * Nothing here is this component's: the fallback, the words and the containment
 * are `Region`'s, and the reason it is worth a story anyway is what **survives**
 * the failure. The heading, the landmark, the head slot and the box are all
 * still there, because the boundary is inside the `<section>` rather than around
 * it — so a failed `Movers` is a labelled box with a problem in it rather than a
 * hole in §9's grid, and the six regions around it are untouched.
 *
 * Review it beside {@link NothingRankable}: *we have nothing to rank* and *this
 * region broke* must never look alike, and the hatch, the dashed rule and the
 * sentence are three channels saying which is which.
 */
export const TheRegionFailed: Story = {
  render: () => (
    <Region name="Movers" meta={<MoversMeta />}>
      <Throws />
    </Region>
  ),
};

/**
 * **`grayscale(1)` — throw the switch and nothing is lost.**
 *
 * The price palette differs by **1.04:1** in greyscale, so hue is the entire
 * difference between the two price inks and a region of signed figures has to
 * carry direction somewhere else. Here it is carried **four** times over, and
 * not one of them is colour: the heading each list sits under, the sign on every
 * figure, `PriceChange`'s glyph, and the word it hands a screen reader.
 *
 * This is also the clearest argument for the headings over the two shapes that
 * were refused. Two unlabelled columns of signed figures is a permutation
 * waiting to be misread, and in greyscale the heading is the first and
 * strongest of the three non-colour channels — a reader who cannot see hue
 * still knows which list is which before reading a single sign.
 */
export const InGreyscale: Story = {
  render: (args) => (
    <div style={{ filter: "grayscale(1)" }}>
      <Region name="Movers" meta={<MoversMeta />}>
        <Movers {...args} />
      </Region>
    </div>
  ),
};

/**
 * **A sixth row each way, which is what the budget refuses** — drawn once so
 * the ceiling is a picture rather than a comment.
 *
 * `466` against `486` is twenty pixels of slack; a sixth row each way is
 * **520**, over by 34 — and the overflow is not local. Rows 2 and 3 of the
 * landing grid are `repeat(2, minmax(min-content, 1fr))`, so they share one
 * ratio: this does not spill out of the panel, it **raises `Sector performance`
 * and `Market breadth` to match** and takes the source note down the page with
 * it.
 *
 * The story builds six rows by hand, which the shipped path cannot do —
 * `MOVERS_PER_SIDE` bounds both the selection and the padding — so this is the
 * one state here that is deliberately unreachable. It exists because a reader
 * proposing a sixth row should be able to see what it costs, and because
 * `Panel` passes `scrollable`, so the honest answer on screen is that the
 * region scrolls rather than that anything is clipped.
 */
export const ASixthRowEachWay: Story = {
  args: {
    view: {
      gainers: [
        ...GAINERS,
        row("AMD", "Advanced Micro Devices, Inc.", 2.4, MOVERS_PER_SIDE + 1),
      ],
      losers: [
        ...LOSERS,
        row("APA", "APA Corporation", -2.11, MOVERS_PER_SIDE + 1),
      ],
    },
  },
};
