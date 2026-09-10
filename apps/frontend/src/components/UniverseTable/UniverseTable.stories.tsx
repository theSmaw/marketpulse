import { toMarketDate, toTicker } from "@marketpulse/shared";
import type {
  Security,
  SecurityCoverage,
  SecurityLastClose,
} from "@marketpulse/shared";
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

/**
 * The frontier the local store actually reaches, and the depth every backfilled
 * security shares.
 *
 * Real values rather than round ones, because the column's whole design rests
 * on 515 identical dates and a handful of different ones — a fixture of tidy
 * `2026-01-01`s would look right and would not be the thing being reviewed.
 */
const FRONTIER = "2026-09-04T20:00:00.000Z";
const FULL_DEPTH_START = "2025-09-08T13:30:00.000Z";

function coverageFor(
  symbol: string,
  start: string = FULL_DEPTH_START,
  barCount = 97_530,
): SecurityCoverage {
  return { symbol, timeframe: "1m", start, end: FRONTIER, barCount };
}

/**
 * What the store holds for the fixture universe — **deliberately not all of
 * it.**
 *
 * Three of the six rows are exceptions, which is a far higher proportion than
 * the real store's three in 518 and is the point: a specimen small enough to
 * review has to contain one of each thing worth looking at.
 *
 *   - `HONA` stands for the real benign outlier — a 2026 spin-off that listed
 *     inside the backfill window, so its history genuinely starts later. Task
 *     2.8.8 measured two of these and the local store now holds three; they are
 *     guaranteed rather than unlucky, because the universe is curated from the
 *     index as it stands today.
 *   - `SPY` has no record at all, which is a security nobody has backfilled.
 *   - Everything else sits at full depth, which is what the column looks like
 *     515 times over.
 */
const COVERAGE: readonly SecurityCoverage[] = [
  coverageFor("XLK"),
  coverageFor("AAPL"),
  coverageFor("NVDA"),
  coverageFor("XLV"),
  coverageFor("ABBV", "2026-06-15T13:30:00.000Z", 19_541),
];

/**
 * The last session the local store holds a daily bar for, and the session
 * before it.
 *
 * Not today, and not a round number: the store holds complete sessions only and
 * the nightly catch-up runs before the open, so the last close is always at
 * least a day behind. Reviewing this column against a fixture dated "today"
 * would be reviewing a state the product cannot be in.
 */
const LAST_SESSION = toMarketDate("2026-09-04");

function closeFor(
  symbol: string,
  close: number,
  previousClose: number | null,
  session = LAST_SESSION,
): SecurityLastClose {
  return { symbol, session, close, previousClose };
}

/**
 * Real closes, taken off the local store on 2026-09-09 — **not invented ones.**
 *
 * The reason is the same one the coverage fixture gives and it matters more
 * here: this column's whole visual argument is that a column of two-decimal
 * figures at four different magnitudes lines up under `tabular-nums`, and moves
 * of a fraction of a percent are what the palette's 1.05:1 greyscale problem
 * actually looks like. Tidy `100.00`s would look right and would not be the
 * thing being reviewed.
 *
 * The specimen deliberately carries one of each thing worth looking at, at a
 * proportion far higher than the real store's:
 *
 *   - `NVDA` and `XLK` are up, `AAPL`, `ABBV` and `XLV` are down — so both
 *     directions are on screen together, which is the only way to check that
 *     the glyph and the sign carry them without the colour.
 *   - `SPY` has no close at all, which is a security nobody has backfilled at
 *     the daily timeframe.
 *
 * Every one of them is on the same session, which is what the real store looks
 * like — 518 of 518 on 2026-09-04. The states that are *not* like that get
 * their own stories below, because they are the ones a browser cannot be put
 * into.
 */
const LAST_CLOSES: readonly SecurityLastClose[] = [
  closeFor("XLK", 187.28, 185.97),
  closeFor("AAPL", 319.97, 328.21),
  closeFor("NVDA", 230.36, 228.45),
  closeFor("XLV", 171.45, 173.26),
  closeFor("ABBV", 256.46, 260.21),
];

function loaded(
  securities: readonly Security[],
  coverage: readonly SecurityCoverage[] = COVERAGE,
  lastCloses: readonly SecurityLastClose[] = LAST_CLOSES,
): SecuritiesView {
  // The `loaded` state carries a non-empty tuple, so "loaded with zero rows"
  // cannot be constructed at all. The head is asserted rather than checked,
  // because these fixtures are literals in this file.
  const [first, ...rest] = securities;
  if (first === undefined) throw new Error("fixture is empty");

  return {
    state: "loaded",
    securities: [first, ...rest],
    provenance: null,
    coverage: new Map(coverage.map((record) => [record.symbol, record])),
    lastCloses: new Map(lastCloses.map((record) => [record.symbol, record])),
  };
}

const meta = {
  title: "Market/UniverseTable",
  component: UniverseTable,
  parameters: { layout: "padded" },
  // `onRetry` is required, and in the workshop it is a no-op: what these
  // stories review is the *rendering* of a failure a user can act on, and the
  // acting itself is `use-securities.ts`' and is tested where it lives.
  args: { view: loaded(UNIVERSE), onRetry: () => undefined },
} satisfies Meta<typeof UniverseTable>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Loaded: Story = {};

/** Acceptance criterion 6, and the only place it can be reviewed: the deployed
 *  table is 518 rows and every one of them is active. */
export const WithUntrackedSecurity: Story = {
  args: { view: loaded(WITH_UNTRACKED) },
};

/**
 * The universe with no bars behind it at all — a migrated database nobody has
 * backfilled, which is what a clean clone gets and what the deployed store
 * looked like until Task 2.8.8 filled it.
 *
 * Worth its own story because it is the one coverage state a browser cannot be
 * put into without emptying a table, and because the summary line collapses to
 * a sentence here rather than reporting three zeroes.
 */
export const NoHistoryStored: Story = {
  args: { view: loaded(UNIVERSE, []) },
};

/**
 * The state the heading's shared date does not cover: one security's last close
 * is from an earlier session than everybody else's.
 *
 * **It does not exist in the store today** — all 518 securities last closed on
 * the same session — and it is guaranteed to arrive, because a security that
 * stops printing keeps its history and stops extending it. So this is the only
 * place the withdrawal can be reviewed: the heading drops its date and every
 * cell grows one.
 */
export const ClosesFromDifferentSessions: Story = {
  args: {
    view: loaded(UNIVERSE, COVERAGE, [
      ...LAST_CLOSES.filter((close) => close.symbol !== "ABBV"),
      closeFor("ABBV", 256.46, 260.21, toMarketDate("2026-08-28")),
    ]),
  },
};

/**
 * A security we hold exactly one daily bar for — §36's partial answer, one
 * field wide.
 *
 * There is a price and there is nothing to measure it against, which is a
 * different absence from having no price at all and must not render as a zero:
 * a `0.00%` claims the market did not move, and a zero previous close would
 * render as a −100% collapse.
 */
export const OneStoredSession: Story = {
  args: {
    view: loaded(UNIVERSE, COVERAGE, [
      ...LAST_CLOSES.filter((close) => close.symbol !== "NVDA"),
      closeFor("NVDA", 230.36, null),
    ]),
  },
};

/**
 * The universe with no daily bars behind it, so the price column is empty
 * throughout.
 *
 * The state a clean clone meets, and the one that has to read as *nobody has
 * backfilled this* rather than as *these securities are worth nothing*.
 */
export const NoClosesStored: Story = {
  args: { view: loaded(UNIVERSE, COVERAGE, []) },
};

export const Loading: Story = { args: { view: { state: "loading" } } };

/** A migrated-but-unseeded database. Not a failure, and not a table with a
 *  header and nothing under it. */
export const Empty: Story = { args: { view: { state: "empty" } } };

export const Unreachable: Story = {
  args: {
    view: {
      state: "failed",
      failure: "unreachable",
      requestId: null,
      retryable: true,
      retrying: false,
    },
  },
};

/**
 * **The commonest failure this page actually has**, and the one Task 2.10.2
 * exists for: the service is up and cannot reach its database, so it answers a
 * 503 carrying `SERVICE_UNAVAILABLE`.
 *
 * Until this task it rendered as *unexpected response* — a sentence that was
 * false in the direction that matters, because it told a reader nothing would
 * help at the moment when waiting was the entire answer.
 */
export const TemporarilyUnavailable: Story = {
  args: {
    view: {
      state: "failed",
      failure: "answered-badly",
      requestId: "0f9c1b4e-7a52-4b1d-9c2e-3d8a6f04b571",
      retryable: true,
      retrying: false,
    },
  },
};

/**
 * The same state with the retry in flight.
 *
 * The control is still pressable on purpose — a disabled button loses focus in
 * every browser, and the hook is safe to press twice. What the workshop is for
 * here is the thing no test can judge: whether a word swapping under the
 * pointer reads as *working on it* rather than as a control that has broken.
 */
export const Retrying: Story = {
  args: {
    view: {
      state: "failed",
      failure: "answered-badly",
      requestId: "0f9c1b4e-7a52-4b1d-9c2e-3d8a6f04b571",
      retryable: true,
      retrying: true,
    },
  },
};

/** The failure that will not fix itself, which is a different diagnosis and
 *  sends a reader somewhere else. It offers no button, and says so rather than
 *  leaving the absence to be inferred. */
export const AnsweredBadly: Story = {
  args: {
    view: {
      state: "failed",
      failure: "answered-badly",
      requestId: "0f9c1b4e-7a52-4b1d-9c2e-3d8a6f04b571",
      retryable: false,
      retrying: false,
    },
  },
};

/**
 * All twelve renderings, stacked.
 *
 * `stack` rather than the two-column grid: this is a full-width table, and the
 * grid's `max-content` column would squeeze it to nothing. The order is the
 * order a reader meets them — the ordinary state, then the row-level exception,
 * then the four page-level ones.
 *
 * The failures are next to each other on purpose. They are three sentences and
 * one busy state in **one** treatment, and the thing worth checking here is
 * that they read as the same *kind* of thing rather than as unrelated error
 * states — which is the check that keeps Task 2.10.2's third rendering from
 * becoming a third error language.
 */
export const AllPermutations: Story = {
  render: () => (
    <div className={gridStyles.stack}>
      {PERMUTATIONS.map(([label, view]) => (
        <div className={gridStyles.stackItem} key={label}>
          <span className={gridStyles.label}>{label}</span>
          <UniverseTable view={view} onRetry={() => undefined} />
        </div>
      ))}
    </div>
  ),
};

const PERMUTATIONS: readonly (readonly [string, SecuritiesView])[] = [
  ["Loaded", loaded(UNIVERSE)],
  ["Loaded — one no longer tracked", loaded(WITH_UNTRACKED)],
  ["Loaded — no history stored", loaded(UNIVERSE, [])],
  [
    "Loaded — closes from more than one session",
    loaded(UNIVERSE, COVERAGE, [
      ...LAST_CLOSES.filter((close) => close.symbol !== "ABBV"),
      closeFor("ABBV", 256.46, 260.21, toMarketDate("2026-08-28")),
    ]),
  ],
  ["Loaded — no closes stored", loaded(UNIVERSE, COVERAGE, [])],
  ["Loading", { state: "loading" }],
  ["Empty", { state: "empty" }],
  [
    "Failed — no response",
    {
      state: "failed",
      failure: "unreachable",
      requestId: null,
      retryable: true,
      retrying: false,
    },
  ],
  [
    "Failed — temporarily unavailable",
    {
      state: "failed",
      failure: "answered-badly",
      requestId: "0f9c1b4e-7a52-4b1d-9c2e-3d8a6f04b571",
      retryable: true,
      retrying: false,
    },
  ],
  [
    "Failed — temporarily unavailable, retrying",
    {
      state: "failed",
      failure: "answered-badly",
      requestId: "0f9c1b4e-7a52-4b1d-9c2e-3d8a6f04b571",
      retryable: true,
      retrying: true,
    },
  ],
  [
    "Failed — unexpected response",
    {
      state: "failed",
      failure: "answered-badly",
      requestId: "0f9c1b4e-7a52-4b1d-9c2e-3d8a6f04b571",
      retryable: false,
      retrying: false,
    },
  ],
];
