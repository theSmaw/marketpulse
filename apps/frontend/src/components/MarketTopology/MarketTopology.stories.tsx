import type { Meta, StoryObj } from "@storybook/react-vite";

import { SECTOR_ETFS } from "@marketpulse/shared";

import {
  LOADING_UNIVERSE,
  securitiesFixtureBody,
  securitiesFixtureView,
} from "../../fixtures/securities.js";
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
 * One sector, its benchmark and the hub — the design story.
 *
 * Built by filtering the recorded **body** and putting it through
 * `toSecuritiesView`, which is this repository's standing rule for a story: a
 * state assembled by hand proves a component can render a string, and a state
 * driven through the shipped transition proves the state is reachable.
 */
const ONE_SECTOR = (() => {
  const body = securitiesFixtureBody("full");
  const benchmark = SECTOR_ETFS.energy;
  const keep = new Set<string>([benchmark, "SPY"]);

  for (const security of body.securities) {
    if (security.kind === "equity" && security.sector === "energy")
      keep.add(security.symbol);
  }

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
})();

const meta = {
  title: "Components/MarketTopology",
  component: MarketTopology,
  parameters: { layout: "padded" },
  args: { probe },
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

/** The store unreachable: the one retryable failure this client has. */
export const Failed: Story = {
  args: { universe: securitiesFixtureView("unavailable") },
};
