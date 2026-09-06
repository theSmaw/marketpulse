import { toTicker } from "@marketpulse/shared";
import type { Security } from "@marketpulse/shared";
import type { Meta, StoryObj } from "@storybook/react-vite";

import type { SecuritiesView } from "../../use-securities.js";
import gridStyles from "../stories.module.css";
import { UniverseTable } from "./UniverseTable.js";

// Four states, and two of them cannot be reached in a running browser without
// breaking something first — which is the whole argument for this table being a
// workshop component rather than part of a route.
//
// An empty universe needs a migrated database nobody has seeded; a service that
// answers with the wrong thing needs `VITE_API_BASE_URL` pointed at a static
// host. Task 2.4.4 produced both against the real system, because a state
// reached only by flipping a boolean proves the component and not the wiring —
// but that is a one-off measurement, and this grid is what makes them
// reviewable side by side afterwards, on every future change, with no backend
// running at all.

/**
 * A small, honest fixture: two sectors and the market proxies, with each
 * sector's benchmark ETF present, so the grouping and the `Benchmark XLK` claim
 * are both visible in a specimen small enough to review.
 */
const UNIVERSE: readonly Security[] = [
  {
    symbol: toTicker("XLK"),
    name: "Technology Select Sector SPDR Fund",
    exchange: "NYSEARCA",
    kind: "sector_etf",
    sector: "technology",
    industry: null,
    status: "active",
    cik: null,
  },
  {
    symbol: toTicker("AAPL"),
    name: "Apple Inc.",
    exchange: "NASDAQ",
    kind: "equity",
    sector: "technology",
    industry: "Technology Hardware, Storage & Peripherals",
    status: "active",
    cik: null,
  },
  {
    symbol: toTicker("NVDA"),
    name: "NVIDIA Corporation",
    exchange: "NASDAQ",
    kind: "equity",
    sector: "technology",
    industry: "Semiconductors",
    status: "active",
    cik: null,
  },
  {
    symbol: toTicker("XLV"),
    name: "Health Care Select Sector SPDR Fund",
    exchange: "NYSEARCA",
    kind: "sector_etf",
    sector: "health_care",
    industry: null,
    status: "active",
    cik: null,
  },
  {
    symbol: toTicker("ABBV"),
    name: "AbbVie Inc.",
    exchange: "NYSE",
    kind: "equity",
    sector: "health_care",
    industry: "Biotechnology",
    status: "active",
    cik: null,
  },
  {
    symbol: toTicker("SPY"),
    name: "SPDR S&P 500 ETF Trust",
    exchange: "NYSEARCA",
    kind: "index_etf",
    sector: null,
    industry: null,
    status: "active",
    cik: null,
  },
];

/** The same universe with one security we have stopped tracking. It keeps its
 *  place in Technology rather than moving or vanishing, which is Task 2.3.6's
 *  decision made visible. */
const WITH_UNTRACKED: readonly Security[] = [
  ...UNIVERSE.slice(0, 2),
  {
    symbol: toTicker("GILD"),
    name: "Gilead Sciences, Inc.",
    exchange: "NASDAQ",
    kind: "equity",
    sector: "technology",
    industry: "Biotechnology",
    status: "untracked",
    cik: null,
  },
  ...UNIVERSE.slice(2),
];

function loaded(securities: readonly Security[]): SecuritiesView {
  // The `loaded` state carries a non-empty tuple, so "loaded with zero rows"
  // cannot be constructed at all. The head is asserted rather than checked,
  // because these fixtures are literals in this file.
  const [first, ...rest] = securities;
  if (first === undefined) throw new Error("fixture is empty");

  return { state: "loaded", securities: [first, ...rest], provenance: null };
}

const meta = {
  title: "Market/UniverseTable",
  component: UniverseTable,
  parameters: { layout: "padded" },
  args: { view: loaded(UNIVERSE) },
} satisfies Meta<typeof UniverseTable>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Loaded: Story = {};

/** Acceptance criterion 6, and the only place it can be reviewed: the deployed
 *  table is 101 rows and every one of them is active. */
export const WithUntrackedSecurity: Story = {
  args: { view: loaded(WITH_UNTRACKED) },
};

export const Loading: Story = { args: { view: { state: "loading" } } };

/** A migrated-but-unseeded database. Not a failure, and not a table with a
 *  header and nothing under it. */
export const Empty: Story = { args: { view: { state: "empty" } } };

export const Unreachable: Story = {
  args: {
    view: { state: "failed", failure: "unreachable", requestId: null },
  },
};

/** The other failure, which is a different diagnosis and sends a reader
 *  somewhere else. It is the only state that has an id to offer. */
export const AnsweredBadly: Story = {
  args: {
    view: {
      state: "failed",
      failure: "answered-badly",
      requestId: "0f9c1b4e-7a52-4b1d-9c2e-3d8a6f04b571",
    },
  },
};

/**
 * All six renderings, stacked.
 *
 * `stack` rather than the two-column grid: this is a full-width table, and the
 * grid's `max-content` column would squeeze it to nothing. The order is the
 * order a reader meets them — the ordinary state, then the row-level exception,
 * then the three page-level ones.
 *
 * The two failures are next to each other on purpose. They are two sentences in
 * one treatment, and the thing worth checking here is that they read as the
 * same *kind* of thing rather than as two unrelated error states.
 */
export const AllPermutations: Story = {
  render: () => (
    <div className={gridStyles.stack}>
      {PERMUTATIONS.map(([label, view]) => (
        <div className={gridStyles.stackItem} key={label}>
          <span className={gridStyles.label}>{label}</span>
          <UniverseTable view={view} />
        </div>
      ))}
    </div>
  ),
};

const PERMUTATIONS: readonly (readonly [string, SecuritiesView])[] = [
  ["Loaded", loaded(UNIVERSE)],
  ["Loaded — one no longer tracked", loaded(WITH_UNTRACKED)],
  ["Loading", { state: "loading" }],
  ["Empty", { state: "empty" }],
  [
    "Failed — no response",
    { state: "failed", failure: "unreachable", requestId: null },
  ],
  [
    "Failed — unexpected response",
    {
      state: "failed",
      failure: "answered-badly",
      requestId: "0f9c1b4e-7a52-4b1d-9c2e-3d8a6f04b571",
    },
  ],
];
