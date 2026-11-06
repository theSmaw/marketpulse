// **The memo, and the latent defect it had until Task 6.5.2** — this module's
// first test file, written for one assertion it was missing.
//
// `topologySource` memoises on its inputs' **identities**, and until this task
// it memoised on the securities array alone. The correlation set arrives on a
// second, independent request, so the ordinary sequence on `/` is: the
// universe settles → the graph is built and cached → the measurement settles a
// few hundred milliseconds later with `securities` **unchanged**. Under the
// old key that second settle returned the stale, edge-less graph for ever.
//
// It is invisible to any test where both inputs change together, which is
// every test written from one fixture — so the assertion that matters is the
// one that changes exactly one of them.

import { describe, expect, it } from "vitest";

import { SECTOR_ETFS, toTicker } from "@marketpulse/shared";
import type { Security, TopologyCorrelation } from "@marketpulse/shared";

import { securitiesFixtureBody } from "../fixtures/securities.js";
import { topologySource } from "./graph-source.js";

// The **recorded** `GET /securities` body, which is this package's own
// universe fixture — `packages/shared`'s `topologyFixtureUniverse` is
// deliberately not exported from its index, because nothing outside that
// package's own tests has any business constructing a universe.
const UNIVERSE: readonly Security[] = securitiesFixtureBody("full").securities;

/** Two equities out of the fixture universe, both of them nodes. */
const [FIRST = "A", SECOND = "B"] = topologySource(UNIVERSE)
  .graph.nodes.filter((node) => node.kind === "equity")
  .map((node) => node.symbol);

const PAIR: readonly TopologyCorrelation[] = [
  { low: toTicker(FIRST), high: toTicker(SECOND), r: 0.8 },
];

describe("topologySource", () => {
  it("serves one cached answer for the same two inputs", () => {
    const first = topologySource(UNIVERSE, PAIR);
    const second = topologySource(UNIVERSE, PAIR);

    expect(second).toBe(first);
  });

  // **The regression test for the real defect.** `securities` is the same
  // reference in both calls and only the correlation set changes, which is
  // exactly the sequence a page load produces.
  it("recomputes when the MEASUREMENT changes and the universe does not", () => {
    const edgeless = topologySource(UNIVERSE, null);

    expect(
      edgeless.graph.edges.filter((edge) => edge.kind === "return_correlation"),
    ).toEqual([]);

    const merged = topologySource(UNIVERSE, PAIR);

    expect(merged).not.toBe(edgeless);
    expect(
      merged.graph.edges.filter((edge) => edge.kind === "return_correlation"),
    ).toHaveLength(1);
  });

  it("recomputes when the UNIVERSE changes and the measurement does not", () => {
    const first = topologySource(UNIVERSE, PAIR);
    // A different array with the same contents — the identity is what this
    // cache keys on, because `use-securities.ts` holds one reference stable
    // across every render and replaces it only on a settled response.
    const second = topologySource([...UNIVERSE], PAIR);

    expect(second).not.toBe(first);
    expect(JSON.stringify(second.graph)).toBe(JSON.stringify(first.graph));
  });

  it("holds exactly one entry, so the previous answer is not served again", () => {
    // The module's own stated bound: this screen draws one universe. Asking
    // again for an input the cache has evicted recomputes rather than
    // returning a second held entry.
    const withPair = topologySource(UNIVERSE, PAIR);
    topologySource(UNIVERSE, null);
    const again = topologySource(UNIVERSE, PAIR);

    expect(again).not.toBe(withPair);
    expect(JSON.stringify(again.graph)).toBe(JSON.stringify(withPair.graph));
  });

  it("gives a correlation set and no correlation set the same LAYOUT", () => {
    // `buildTopologyLayout` reads nodes and clusters and no edge, so a
    // measurement arriving late is a redraw rather than a market that moves
    // under the reader. Asserted rather than assumed, because the whole
    // argument for merging before laying out rests on it.
    const edgeless = topologySource(UNIVERSE, null);
    const merged = topologySource(UNIVERSE, PAIR);

    expect(JSON.stringify(merged.layout)).toBe(JSON.stringify(edgeless.layout));
  });

  it("draws no measured edge for an endpoint the universe no longer tracks", () => {
    // The merge's own refusal, reached through this module so the call site's
    // contract is the one under test: a pass that ran last night names every
    // security tracked then.
    const merged = topologySource(UNIVERSE, [
      { low: toTicker(FIRST), high: toTicker("ZZZZ"), r: 0.9 },
    ]);

    expect(
      merged.graph.edges.filter((edge) => edge.kind === "return_correlation"),
    ).toEqual([]);
    // Non-vacuous: the universe this was merged into does have nodes, and
    // every membership edge is still there — eleven sector benchmarks' worth
    // of them plus the hub's own eleven.
    expect(Object.values(SECTOR_ETFS)).toHaveLength(11);
    expect(merged.graph.edges.length).toBeGreaterThan(500);
  });
});
