import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { SECTOR_ETFS } from "@marketpulse/shared";
import type { SecuritiesResponse, Ticker } from "@marketpulse/shared";

import {
  LOADING_UNIVERSE,
  securitiesFixtureBody,
  securitiesFixtureRetryingView,
  securitiesFixtureView,
} from "../../fixtures/securities.js";
import type { TopologyAnomalyTreatment } from "../../topology/index.js";
import type { SecuritiesView } from "../../use-securities.js";
import { toSecuritiesView } from "../../use-securities.js";
import { MarketTopology } from "./MarketTopology.js";

// The market topology, in the states the universe can be in — **and the
// workshop is the only place any of this is reachable** (Task 6.1.2).
//
// Story 6.1 ships no route: `/`'s reserved band is 161 px at 1440x900, which is
// not a graph, and fitting the topology into it is Story 6.2's. So the built
// Storybook is both the review surface and the surface Task 6.1.2's frame-rate
// figures were taken on.
//
// ## There were two whole-universe stories here for the length of one task
//
// Task 6.1.2 compared two renderers over one mount path, one container, one
// palette and one graph — the stories differed by a `renderer` prop and nothing
// else. The measurement is in ADR 0048 and **the loser was deleted in the same
// change**, prop and factory and story together, because a comparison harness
// is not a second implementation to maintain.
//
// ## What this component does NOT need, which is why its state set is short
//
// Only `symbol`, `kind` and `sector` — no price, no bar, no anomaly score. So
// **CI's permanent zero-bars state and "the whole universe" are the identical
// picture here**, and that duplicate is dropped rather than drawn twice. What
// is left is the real `SecuritiesView` union: `loading`, `loaded`, `empty`,
// `failed`.
//
// ## The universe below is 518 and the real one is 516, deliberately
//
// `securities/full.json` is the recorded `GET /securities` body, taken
// 2026-09-11 — **before** the 2026-10-12 curation untracked `PSKY` and `WBD`.
// `packages/shared/src/topology-fixture.ts` records exactly this and says
// asserting 501 against it *"would be red on arrival"*. So this harness draws
// **518 nodes and 514 edges** rather than 516 and 512: two nodes and two edges
// MORE than the deployed universe, which is the conservative direction for a
// frame-rate figure. Re-recording the body is a change to a well-documented
// fixture that six other components' stories read, and it is not this task's.
//
// ## The probe, and why it is in the story rather than in the component
//
// `MarketTopology`'s `probe` is called once per drawn frame from inside the
// renderer's own loop, and nothing in the application passes one. Here it reads
// two globals the measurement harness sets before navigation — a per-frame
// block it can plant, and a frame counter it can read. A canvas mutates no DOM,
// so this is the only channel that can tell a working graph from one that
// painted a single frame and stopped, and it is identical for both candidates.

declare global {
  var __mpTopologyFrames: number | undefined;
  var __mpTopologyPlantMs: number | undefined;
}

function probe(): void {
  globalThis.__mpTopologyFrames = (globalThis.__mpTopologyFrames ?? 0) + 1;

  const planted = globalThis.__mpTopologyPlantMs ?? 0;
  if (planted <= 0) return;

  const until = performance.now() + planted;
  while (performance.now() < until) {
    /* deliberately blocking, inside the render loop */
  }
}

/** The whole recorded universe, through the real transition. */
const WHOLE_UNIVERSE = securitiesFixtureView("full");

/**
 * Every equity symbol in the recorded fixture, in the body's own order —
 * the population {@link MarketTopologyProps.bands} is scoped to (Task
 * 6.3.2, Gate 1 Decision 3). Read from the fixture body directly rather
 * than from a drawn graph, because this module builds the band maps before
 * any renderer exists to ask.
 */
const EQUITY_SYMBOLS: readonly Ticker[] = securitiesFixtureBody("full")
  .securities.filter((security) => security.kind === "equity")
  .map((security) => security.symbol);

/**
 * The real measured distribution (Task 6.3.1, `STORY.md` note 6): **normal
 * 33.4%, elevated 41.4%, high 21.9%, extreme 3.3%** of 485 scored equities
 * on the one local-store instant that story counted. Applied here by
 * contiguous share of {@link EQUITY_SYMBOLS} rather than drawn at random,
 * so the story is deterministic and its own percentages are checkable by
 * counting the symbols assigned to each band.
 *
 * `normal`'s share needs no entry at all — absence from the map **is**
 * `normal` (`TopologyRenderer.setBands`'s own contract) — so only the other
 * three bands are written, in `elevated, high, extreme` order, leaving the
 * first 33.4% of the list with no key and therefore drawn `normal`.
 */
function measuredDistributionBands(): ReadonlyMap<
  Ticker,
  TopologyAnomalyTreatment
> {
  const total = EQUITY_SYMBOLS.length;
  const elevatedEnd = Math.round(total * 0.334) + Math.round(total * 0.414);
  const highEnd = elevatedEnd + Math.round(total * 0.219);

  const bands = new Map<Ticker, TopologyAnomalyTreatment>();

  EQUITY_SYMBOLS.forEach((symbol, index) => {
    if (index < Math.round(total * 0.334)) return; // normal — no entry
    if (index < elevatedEnd) bands.set(symbol, "elevated");
    else if (index < highEnd) bands.set(symbol, "high");
    else bands.set(symbol, "extreme");
  });

  return bands;
}

/**
 * CI's permanent state (AC 4): no composite generation at all, so every one
 * of the 501 equities is unscored, for ever. Hollow rather than calm.
 */
function allUnscoredBands(): ReadonlyMap<Ticker, TopologyAnomalyTreatment> {
  return new Map(EQUITY_SYMBOLS.map((symbol) => [symbol, "unscored"]));
}

/**
 * A stress case for AC 1's legibility claim — never a real market state
 * (note 2's own finding: roughly half the universe sits `elevated`-or-above
 * on every session there has ever been, and 16 of 485 were `extreme` on the
 * one instant this story measured), but the top of the scale has to stay
 * legible with every node carrying the loudest treatment at once.
 */
function allExtremeBands(): ReadonlyMap<Ticker, TopologyAnomalyTreatment> {
  return new Map(EQUITY_SYMBOLS.map((symbol) => [symbol, "extreme"]));
}

/**
 * A slice of the recorded universe, **through the real transition**.
 *
 * One helper and not two inline filters: a body has **three** parallel arrays
 * keyed by symbol — `securities`, `coverage`, `lastCloses` — and a second copy
 * of that filter is a second place for one of them to be forgotten. The
 * selector returns the symbols to keep, and this does the rest.
 *
 * `toSecuritiesView` rather than a hand-written `{ state: "loaded", … }` is
 * this repository's standing rule for a story: a state assembled by hand proves
 * a component can render a string, and a state driven through the shipped
 * transition proves the state is reachable.
 */
function filteredUniverse(
  select: (body: SecuritiesResponse) => ReadonlySet<string>,
): SecuritiesView {
  const body = securitiesFixtureBody("full");
  const keep = select(body);

  return toSecuritiesView(LOADING_UNIVERSE, {
    outcome: "ok",
    status: 200,
    requestId: null,
    data: {
      ...body,
      securities: body.securities.filter((security) =>
        keep.has(security.symbol),
      ),
      coverage: body.coverage.filter((record) => keep.has(record.symbol)),
      lastCloses: body.lastCloses.filter((record) => keep.has(record.symbol)),
    },
  });
}

/** One sector, its benchmark and the hub — the design story. */
const ONE_SECTOR = filteredUniverse((body) => {
  const keep = new Set<string>([SECTOR_ETFS.energy, "SPY"]);

  for (const security of body.securities) {
    if (security.kind === "equity" && security.sector === "energy")
      keep.add(security.symbol);
  }

  return keep;
});

/**
 * **The four market proxies alone — the state nobody had named** (Task 6.1.3).
 *
 * Selected by `kind === "index_etf"`, which is a **positive membership test**
 * rather than "everything that is not an equity or a sector ETF": the negative
 * form would silently admit whatever kind a later curation adds, and this story
 * exists to look at exactly the four nodes whose `cluster` is `null`.
 *
 * **What it draws, computed from the real builders rather than guessed:** four
 * nodes, **zero** edges, `SPY` at the origin and `DIA`/`IWM`/`QQQ` in a column
 * at `x = 448` under one `MARKET PROXIES` heading. The extent is **448 × 64**,
 * a flat strip rather than the whole universe's near-square.
 *
 * **Zero edges is the finding, and it is `buildTopologyGraph` behaving
 * correctly.** The task that named this state wanted `SPY` *"distinguished as
 * the one carrying edges"*, and in this universe it carries none: the hub edges
 * are built to each sector ETF **that is present**, and no sector ETF is. That
 * is ADR 0029 applied to a line — an edge to a node nothing drew is a dangling
 * claim — so the state is drawn as named and the discrepancy is recorded in
 * Task 6.1.3's own file rather than reconciled by quietly adding eleven
 * securities this story does not claim to show. What it *does* confirm is the
 * other half: the diamond mark, the `null` cluster, the column, the one
 * heading, and `SPY` sited **apart from** the three it is not joined to.
 */
const MARKET_PROXIES = filteredUniverse(
  (body) =>
    new Set(
      body.securities
        .filter((security) => security.kind === "index_etf")
        .map((security) => security.symbol),
    ),
);

/**
 * **The box, because the workshop is not a layout** (Task 6.2.1).
 *
 * `.frame` is `block-size: 100%` since the `--topology-height` constant was
 * removed, and on `/` the height comes from the grid row through `Panel` and
 * `Region`. Storybook has no grid row, so a story rendered bare would resolve
 * `100%` against an `auto` parent and draw a frame 0 px tall.
 *
 * **520 px, which is the figure ADR 0048's frame-rate arms were taken at**, so
 * every story in this file is the same picture it was before the constant went
 * — the number has simply moved to the one place a typed box is honest.
 * `Unusual.stories.tsx`' own sizing decorator is the precedent.
 */
const inABox: Decorator = (Story) => (
  <div style={{ height: 520 }}>
    <Story />
  </div>
);

const meta = {
  title: "Components/MarketTopology",
  component: MarketTopology,
  decorators: [inABox],
  parameters: { layout: "padded" },
  // `onRetry` is required and in the workshop it is a no-op: what the `failed`
  // stories are for is the sentence, the control's two words and the reference,
  // and a real refetch here would ask a server that is not running.
  args: { probe, onRetry: () => undefined },
} satisfies Meta<typeof MarketTopology>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The whole universe: 518 nodes, 514 edges, eleven clusters, three free
 * proxies. **The headline story, and the one Task 6.1.2's figures were taken
 * on.**
 */
export const WholeUniverse: Story = { args: { universe: WHOLE_UNIVERSE } };

/** One sector drawn alone, which is where the node and edge treatment is legible. */
export const OneSector: Story = { args: { universe: ONE_SECTOR } };

/**
 * **The anomaly treatment, at the real measured distribution** (Task
 * 6.3.2). `normal`/`elevated`/`high`/`extreme` across the whole universe at
 * {@link measuredDistributionBands}'s own shares — the ordinary instant AC
 * 2 is about, which must not read as an alarm. Named stories rather than an
 * interactive control, following this file's own idiom of one state per
 * export: a reader reviews all three side by side in the workshop exactly
 * as they would any other state here.
 */
export const AnomalyBandsMeasuredDistribution: Story = {
  args: { universe: WHOLE_UNIVERSE, bands: measuredDistributionBands() },
};

/**
 * **Every equity unscored — CI's permanent state** (AC 4, Task 6.3.2). No
 * composite generation ever runs there, so this is not a stress case; it is
 * the state a gated machine draws for ever. Hollow, achromatic outlines —
 * "we don't know", never "calm".
 */
export const AnomalyBandsAllUnscored: Story = {
  args: { universe: WHOLE_UNIVERSE, bands: allUnscoredBands() },
};

/**
 * **Every equity `extreme` — the top of the scale under stress** (Task
 * 6.3.2's own Work item). Never a real market state (note 2), but the
 * thickest ring and the recoloured fill have to stay legible with every
 * one of 501 equities carrying them at once, which this proves rather than
 * assumes.
 */
export const AnomalyBandsAllExtreme: Story = {
  args: { universe: WHOLE_UNIVERSE, bands: allExtremeBands() },
};

/**
 * The four market proxies and nothing else — **four diamonds, zero edges**.
 *
 * See {@link MARKET_PROXIES}: `SPY` sits at the origin and the other three in
 * their column under one `MARKET PROXIES` heading, and `SPY` carries no edges
 * here because there is no sector ETF present for a hub edge to reach. That is
 * the model refusing to draw a claim it cannot back rather than a defect, and
 * Task 6.1.3 records it against its own wording.
 */
export const MarketProxies: Story = { args: { universe: MARKET_PROXIES } };

/** A reserved box, never a half-drawn canvas. */
export const Loading: Story = { args: { universe: LOADING_UNIVERSE } };

/**
 * The service answered correctly and holds nothing — a migrated database with
 * `pnpm universe` never run, which `CLAUDE.md` records as having **no other
 * symptom**.
 */
export const Empty: Story = {
  args: { universe: securitiesFixtureView("empty") },
};

/**
 * The store unreachable: the one **retryable** failure this client has.
 *
 * A recorded 503, whose `code` `isRetryableApiErrorCode` accepts — so this is
 * the state that draws all three things: the sentence, one `Try again`, and
 * the correlation id the response carried.
 */
export const Failed: Story = {
  args: { universe: securitiesFixtureView("unavailable") },
};

/**
 * The same failure with the retry **already in flight** (Task 6.1.3).
 *
 * Driven through `toRetryingView`, the transition the button itself fires, so
 * this is the state the product reaches rather than one typed into a story.
 * The control stays **pressable and keeps its place** — a disabled button
 * loses focus in every browser — and the only thing that changes is its word.
 */
export const FailedRetrying: Story = {
  args: { universe: securitiesFixtureRetryingView("unavailable") },
};

/**
 * A failure this client will **not** offer to re-ask (Task 6.1.3).
 *
 * A 200 carrying something that is not this API — `VITE_API_BASE_URL` pointed
 * at a static host is the ordinary way in. **No control at all**, and the
 * sentence says why rather than leaving the absence to be read as something
 * missing. The reference is still there, because this one arrived with a
 * correlation id.
 */
export const FailedNotRetryable: Story = {
  args: { universe: securitiesFixtureView("notThisService") },
};

/**
 * Nothing answered at all: no response, and therefore **no correlation id**.
 *
 * The one failure state with a `Try again` and no `Reference` line — which is
 * the pair that makes the reference's conditional rendering visible, ADR 0029's
 * rule that each clause renders only when its own data is present.
 */
export const FailedUnreachable: Story = {
  args: { universe: securitiesFixtureView("nothingAnswered") },
};
