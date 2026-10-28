import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { Component, type ReactNode } from "react";

import type {
  AnomalyBand,
  WireMarketOverview,
  WireUnusualRow,
} from "@marketpulse/shared";

import { unusualActivity, type UnusualActivity } from "../../market/index.js";
import { Region } from "../Region/Region.js";
import { Unusual, UnusualMeta, UnusualReservation } from "./Unusual.js";

// `Unusual activity`, in every state it can reach.
//
// **What to review side by side is HEIGHT.** `Sector performance` sits beside
// this region on the grid row it shares a `1fr` with, and `Movers` and
// `Market breadth` sit on the row below sharing the same ratio — so a state a
// pixel taller than another raises three regions with it. Measured across six
// of the states below at four widths — re-taken at ten rows on 2026-10-16.
//
// The state that can break it is not a long list but a **short** one, and this
// region reaches short every morning in the first minutes of a session: the
// producer builds no row for a refused security, so `ThreeRanked` is an
// ordinary state rather than an edge case. `NothingRanked` and
// `MarketShut` are CI's permanent state and about 80% of the week.
//
// ## Every view is a real frame put through the shipped reader
//
// `unusualActivity` rather than a typed object, which is every other region's
// rule since Task 4.5.5: a story then holds a state the application can reach
// rather than one somebody typed, and the day the reader changes these move
// with it. The one exception is the reservation, which takes no view.
//
// ## What Storybook cannot show, and it is the point of the region
//
// Whether the ordinal is **right**. Its inputs are sixty sessions of a table
// the browser never reads — 101 breakpoints × 501 securities, ~417 KB, which
// is never going on this wire — so every figure below is one somebody typed
// into a frame. That is `overview-unusual-ranking.spec.ts`', which grounds
// itself out of frame, and ultimately a person with a public five-minute
// chart.

/**
 * One wire row — **a score and a band since Task 5.6.7**, where it was an
 * ordinal and six figures behind it.
 *
 * The band is **passed** rather than derived from the score, which is the same
 * discipline the producer and the reader both keep: `bandOf` is
 * `ANOMALY_BAND_FLOORS`' and a story that re-derived it would be a fourth copy
 * of the thresholds. The stories below pass the band the floors give (32 / 63 /
 * 73 on the raw scale), so a reader comparing a story with the shipped region
 * is comparing like with like.
 *
 * **Every score below is at or under 75**, which is the two-factor maximum and
 * the only scale any machine can produce today — Task 5.6.6 measured 485
 * stored rows with `max = 75` on every one. A story drawing `91` would be a
 * workshop fixture showing a state the product cannot reach, which is the
 * *second, quieter copy of a live claim* `RegionPlaceholder.stories.tsx`' own
 * comment warns about.
 */
const row = (
  symbol: string,
  score: number,
  band: AnomalyBand,
  percent: number,
): WireUnusualRow => ({ symbol, score, band, percent });

const frame = (
  rows: readonly WireUnusualRow[],
  shut = false,
): WireMarketOverview => ({
  computedAt: "2026-10-15T18:00:00.000Z",
  // **Absent exactly when the aggregate holds no observation**, which is the
  // producer's own rule (ADR 0029, decided at the producer) and the reason
  // the footer's age line is **absent rather than empty** in the two states
  // below that rank nothing. A story carrying an instant there would draw a
  // state the server cannot send.
  ...(rows.length === 0
    ? {}
    : { observedAt: "2026-10-15T18:00:00.000Z" as const }),
  feeds: ["iex"],
  figures: [],
  breadth: shut
    ? {
        basis: "session",
        advancing: 284,
        declining: 152,
        unchanged: 15,
        measured: 451,
        tracked: 501,
        session: "2026-10-15",
      }
    : {
        basis: "observed",
        advancing: 284,
        declining: 152,
        unchanged: 15,
        measured: 451,
        tracked: 501,
        windowMinutes: 5,
      },
  unusual: {
    basis: "observed",
    rows,
    tracked: 501,
    eligible: rows.length === 0 ? 0 : 466,
    scored: rows.length === 0 ? 0 : Math.max(rows.length, 455),
    // **The ranked cohort, which is `{price, excess}` and `max 75` on every
    // machine that exists** — Task 5.6.6 measured 485 stored rows and **0
    // single-factor scores**, because the two scored factors refuse for the
    // same root causes. `others: 0` is therefore the shipped value and not a
    // simplification; a story with a non-zero one would show a state no
    // producer can currently reach.
    ...(rows.length === 0
      ? {}
      : {
          cohort: {
            factors: ["price", "excess"] as const,
            max: 75,
            scored: Math.max(rows.length, 455),
            others: 0,
          },
        }),
    windowMinutes: 5,
    spanMinutes: 5,
    baseline: {
      feed: "sip",
      spanMinutes: 5,
      minimumSampleCount: 2500,
      generation: { session: "2026-10-14", lookbackSessions: 60 },
    },
    refusals: {
      figure: {
        "nothing-observed": 35,
        "no-earlier-endpoint": 0,
        "no-basis": 0,
      },
      comparison: { "too-few-samples": 11, "split-discontinuity": 0 },
    },
  },
});

const NAMES = new Map([
  ["GOOGL", "Alphabet Inc. Class A"],
  ["FICO", "Fair Isaac Corporation"],
  ["BRK.B", "Berkshire Hathaway Inc. Class B"],
  ["CMCSA", "Comcast Corporation Class A"],
  ["KO", "The Coca-Cola Company"],
  ["GIS", "General Mills, Inc."],
  ["CL", "Colgate-Palmolive Company"],
  ["K", "Kellanova"],
  ["CPB", "The Campbell’s Company"],
  ["CTSH", "Cognizant Technology Solutions Corporation Class A"],
  ["AVGO", "Broadcom Inc."],
  ["MNST", "Monster Beverage Corporation"],
  ["NVDA", "NVIDIA Corporation"],
  ["CRM", "Salesforce, Inc."],
  ["PSA", "Public Storage"],
  ["MKC", "McCormick & Company, Incorporated"],
  ["PEP", "PepsiCo, Inc."],
  ["MO", "Altria Group, Inc."],
  ["L", "Loews Corporation"],
]);

const read = (rows: readonly WireUnusualRow[], shut = false): UnusualActivity =>
  unusualActivity(frame(rows, shut), new Map(), new Set(), NAMES) ?? {
    rows: [],
    claim: undefined,
    nothing: undefined,
    bound: undefined,
  };

/**
 * The ordinary mid-session state, and the one the geometry was sized against.
 *
 * **Ten rows, which is what the owner took on 2026-10-16**: five left 168 px
 * of empty region in a 491 px box at the two widest widths and none at the
 * two narrow ones. What the second five buy a reader is the second half of
 * the tail — at ~455 scored securities an integer ordinal holds at most 100
 * values, so a top five is roughly the `>99th` and `99th` band alone while
 * this list reaches `96th`.
 */
const FULL = read([
  row("CTSH", 75, "extreme", -4.12),
  row("NVDA", 72, "high", 3.88),
  row("AVGO", 68, "high", -2.4),
  row("CRM", 64, "high", 2.02),
  row("GOOGL", 61, "elevated", 1.4),
  row("MNST", 58, "elevated", -1.77),
  row("FICO", 54, "elevated", -1.22),
  row("BRK.B", 49, "elevated", 1.05),
  row("CMCSA", 44, "elevated", -0.98),
  row("PSA", 40, "elevated", 0.9),
]);

/**
 * The region's box, so every story is reviewed at the width the row was
 * designed against: **308 px of content at 1440**, which is the narrowest
 * region on the screen sitting at the widest viewport.
 *
 * A **named** type on the decorator, which is `SecurityRow.stories.tsx`'
 * recorded workaround: an inline arrow makes `tsc` reach for
 * `PartialStoryFn` from inside Storybook's internals to name the inferred
 * `meta` and fail with TS2883.
 *
 * **It reads the STORY's own view, and `held={false}`** — neither of which
 * it did until the band moved into the slot. The head now carries the
 * region's one statement of today's band, so a decorator pinned to one
 * fixture would print `led by extreme` over ten `normal` rows: the two
 * halves of the region would disagree in the workshop while agreeing in the
 * product, which is the one thing a workshop must not do. The string is
 * measured rather than admired: it has **171.7 px** at this width and the
 * widest it can be is 166.5, with the title wrapping and the region growing
 * if that is ever exceeded. `ORDER HELD` keeps its own stories file, where
 * it is reviewed against the room `.slot` reserves.
 */
const inTheRegion: Decorator = (Story, context) => (
  <div style={{ width: 342 }}>
    <Region
      name="Unusual activity"
      meta={
        <UnusualMeta
          view={(context.args as { view?: UnusualActivity }).view ?? FULL}
          held={false}
        />
      }
    >
      <Story />
    </Region>
  </div>
);

const meta = {
  title: "Market/Unusual",
  component: Unusual,
  decorators: [inTheRegion],
  parameters: { layout: "padded" },
} satisfies Meta<typeof Unusual>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Five ranked rows: the state the region is in while a session runs. */
export const Ranked: Story = { args: { view: FULL } };

/**
 * **A full list of ordinary ordinals, and NOT an empty state.**
 *
 * Gate 1 decision 1's own words: *a row reading `62nd percentile` is visibly
 * ordinary*. This is the state most likely to be called a bug and it is the
 * region working — which is what the list heading is for, because a reader
 * can only take *nothing is unusual right now* from these figures if they
 * know what the figures are percentiles **of**.
 *
 * **The head slot is what makes it readable**, and this is the story that
 * shows why the band belongs there: ten `normal` rows would have carried ten
 * identical chips, 76 px of a 308 px row each, saying one thing. The slot
 * says it once — `Top 10 · all normal` — and the rows keep their names.
 */
export const NothingUnusual: Story = {
  args: {
    view: read([
      row("PSA", 18, "normal", 0.21),
      row("MKC", 16, "normal", -0.18),
      row("PEP", 14, "normal", 0.12),
      row("MO", 12, "normal", -0.09),
      row("L", 11, "normal", 0.05),
      row("KO", 9, "normal", 0.04),
      row("GIS", 8, "normal", -0.03),
      row("CL", 6, "normal", 0.03),
      row("K", 4, "normal", -0.02),
      row("CPB", 3, "normal", 0.02),
    ]),
  },
};

/**
 * Three ranked and seven held — reachable every morning in the first minutes of
 * a session, and on any extended-hours visit.
 *
 * The pads are **room**: `aria-hidden`, no `href`, non-breaking spaces where a
 * ticker goes. Compare the box with `Ranked` — it is the same height, which is
 * the whole mechanism.
 */
export const ThreeRanked: Story = { args: { view: read(SHORT()) } };

function SHORT(): readonly WireUnusualRow[] {
  return [
    row("NVDA", 72, "high", 3.88),
    row("AVGO", 64, "high", -2.4),
    row("CRM", 41, "elevated", 2.02),
  ];
}

/**
 * **Nothing ranked, with the market open** — CI's permanent state (516
 * securities, zero bars, no baseline generation) and the first minutes of a
 * cold replica.
 */
export const NothingRanked: Story = { args: { view: read([]) } };

/**
 * **Nothing ranked, with the market shut** — about 80% of the week, and a
 * different sentence because the repair is different: *wait until 09:30* is
 * not a repair at all.
 *
 * It stays this way until Task 5.4.5 writes a nightly row.
 */
export const MarketShut: Story = { args: { view: read([], true) } };

/**
 * The paint before the first frame: the geometry held and invisible, with the
 * sentence arriving as a **sibling** after the floor.
 *
 * The floor is `SAY_NOTHING_ARRIVED_AFTER_MS` — 2 s — so this story is blank
 * for two seconds and then says so. That wait is the story.
 */
export const Reservation: Story = {
  args: { view: read([]) },
  render: () => <UnusualReservation />,
};

/**
 * **The region's head could not outlive its content** (Story 4.7's repair one
 * region over): a thrown region used to leave `Top 5` — or `ORDER HELD` —
 * standing over a box saying the region could not be displayed.
 *
 * The slot's room is kept and its string is not, so nothing moves; the
 * region's own name stays, because it is what tells a reader which of seven
 * boxes failed.
 */
export const Threw: Story = {
  args: { view: FULL },
  render: () => (
    <Throwing>
      <Unusual view={FULL} />
    </Throwing>
  ),
};

/** Throws on mount, so the `Region`'s own boundary catches it. */
class Throwing extends Component<{ readonly children: ReactNode }> {
  override render(): ReactNode {
    throw new Error("Unusual activity could not be drawn");
  }
}
