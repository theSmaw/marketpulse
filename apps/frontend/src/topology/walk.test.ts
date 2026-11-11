import { describe, expect, it } from "vitest";

import {
  SECTORS,
  SECTOR_ETFS,
  TOPOLOGY_HUB,
  buildTopologyGraph,
  buildTopologyLayout,
} from "@marketpulse/shared";
import type {
  Ticker,
  TopologyGraph,
  TopologyLayout,
} from "@marketpulse/shared";

import { securitiesFixtureBody } from "../fixtures/securities.js";
import { narrowTopologyGraph } from "./filter.js";
import { TOPOLOGY_WALK_KEYS, isTopologyWalkKey, topologyWalk } from "./walk.js";

// **The tree walk, over the REAL recorded universe** (Task 6.4.3).
//
// This file is the whole machine-checkable half of this task's Done-when 1:
// jsdom has no 2d context, so the renderer that calls this is unreachable
// below `pnpm e2e`, and *which node is next* is arithmetic whose every
// individual answer looks plausible. `hit-test.test.ts`'s own reasoning, one
// behaviour over.
//
// **The graph is the recorded 518-security body rather than a hand-made
// fixture**, for the reason that matters to two of the assertions below: a
// made-up graph with three equities in each of two sectors cannot tell
// `SECTORS`' declared order from `graph.clusters`' sorted-by-id order, which
// is the one mistake this module exists to not make. The real universe has
// eleven sectors whose two orders disagree, and the tests below assert they
// disagree before asserting which one the walk uses.

const GRAPH: TopologyGraph = buildTopologyGraph(
  securitiesFixtureBody("full").securities,
);
const LAYOUT: TopologyLayout = buildTopologyLayout(GRAPH);

/** Walk one key from one symbol. */
const from = (
  symbol: Ticker | null,
  key: (typeof TOPOLOGY_WALK_KEYS)[number],
): Ticker | null => topologyWalk(GRAPH, LAYOUT, symbol, key);

/** The eleven benchmarks in the ring's own drawn order. */
const RING = SECTORS.map((sector) => SECTOR_ETFS[sector]);

/**
 * One member of an ordered group, by position, or a throw.
 *
 * `noUncheckedIndexedAccess` is on, and the alternative spellings — `?? null`,
 * a non-null assertion — would both turn a group that lost a member into an
 * assertion against something nobody wrote. A throw names the index.
 */
function at(group: readonly Ticker[], index: number): Ticker {
  const symbol = group.at(index);
  if (symbol === undefined)
    throw new Error(`no member at ${String(index)} of ${String(group.length)}`);
  return symbol;
}

/** One cluster's members, by sector. */
const membersOf = (sector: (typeof SECTORS)[number]): readonly Ticker[] => {
  const cluster = GRAPH.clusters.find((candidate) => candidate.id === sector);
  if (cluster === undefined) throw new Error(`no cluster for ${sector}`);
  return cluster.members;
};

describe("isTopologyWalkKey", () => {
  it("claims the six keys the walk answers and nothing else", () => {
    for (const key of TOPOLOGY_WALK_KEYS)
      expect(isTopologyWalkKey(key)).toBe(true);

    // **The keys that must reach the page untouched**, which is the half of
    // `ChartReading.tsx`'s `default: return` arm this guard replaces: `Tab`
    // moves focus, `Enter` activates whatever has it, `f` is a character, and
    // `PageDown` scrolls the landing page a reader is standing on.
    for (const key of ["Tab", "Enter", "Escape", "f", "PageDown", " "]) {
      expect(isTopologyWalkKey(key)).toBe(false);
    }
  });
});

describe("the walk's two sibling orders", () => {
  it("is not the same order as graph.clusters, and the two really do disagree", () => {
    // **Asserted rather than assumed**, because if the fixture's two orders
    // ever agreed every ring assertion below would pass with the wrong source
    // read. `graph.clusters` is sorted by `id`; the ring is `SECTORS`'.
    const sorted = GRAPH.clusters.map((cluster) => SECTOR_ETFS[cluster.id]);
    expect(sorted).not.toStrictEqual(RING);
  });

  it("walks the ring in SECTORS' declared order, which is the drawn wedge order", () => {
    for (const [index, benchmark] of RING.entries()) {
      const next = at(RING, (index + 1) % RING.length);
      expect(from(benchmark, "ArrowRight")).toBe(next);
      expect(from(next, "ArrowLeft")).toBe(benchmark);
    }
  });

  it("wraps the ring at both ends, because it is drawn as a closed ellipse", () => {
    const first = at(RING, 0);
    const last = at(RING, -1);
    expect(from(first, "ArrowLeft")).toBe(last);
    expect(from(last, "ArrowRight")).toBe(first);
  });

  it("walks a cluster in ticker order and CLAMPS at both of its ends", () => {
    const members = membersOf("energy");
    expect(members.length).toBeGreaterThan(2);

    // Ticker order, which is what `TopologyCluster.members` already is — and
    // never band order, because the band map changes at feed cadence and a
    // reader's position must not move under stationary hands.
    expect([...members]).toStrictEqual(
      [...members].sort((left, right) => (left < right ? -1 : 1)),
    );

    for (const [index, member] of members.entries()) {
      const next = members[index + 1];
      // **`null` at the end rather than the other end of the group**: a
      // ranking is not a ring.
      expect(from(member, "ArrowRight")).toBe(next ?? null);
    }

    expect(from(at(members, 0), "ArrowLeft")).toBeNull();
    expect(from(at(members, -1), "ArrowRight")).toBeNull();
  });

  it("walks the four market proxies clamped, with the hub first", () => {
    // **Clamped rather than wrapped, and the reason is the drawing**: the
    // three undecomposed proxies are a vertical column outside the ring and
    // the hub is at the centre of the market, so there is no closed figure for
    // a wrap to follow — a step from the last of the column back to the hub
    // would cross the whole picture with nothing drawn between them. The
    // sector ring wraps precisely because it IS a closed figure.
    const walked: Ticker[] = [TOPOLOGY_HUB];
    let cursor: Ticker | null = TOPOLOGY_HUB;

    while (cursor !== null) {
      cursor = from(cursor, "ArrowRight");
      if (cursor !== null) walked.push(cursor);
    }

    expect(walked[0]).toBe(TOPOLOGY_HUB);
    expect(walked).toHaveLength(4);
    // The column's own drawn top-to-bottom order, read off the layout.
    const columnY = walked.slice(1).map((symbol) => {
      const placement = LAYOUT.placements.find(
        (candidate) => candidate.symbol === symbol,
      );
      if (placement === undefined) throw new Error(`${symbol} is not placed`);
      return placement.y;
    });
    expect([...columnY]).toStrictEqual([...columnY].sort((a, b) => a - b));

    expect(from(TOPOLOGY_HUB, "ArrowLeft")).toBeNull();
    expect(from(at(walked, -1), "ArrowRight")).toBeNull();
  });
});

describe("down enters and up leaves, and they are exact reverses", () => {
  it("enters the ring from the hub at the first drawn wedge", () => {
    expect(from(TOPOLOGY_HUB, "ArrowDown")).toBe(at(RING, 0));
  });

  it("enters a cluster from its benchmark at the first member", () => {
    for (const sector of SECTORS) {
      const members = membersOf(sector);
      if (members.length === 0) continue;
      expect(from(SECTOR_ETFS[sector], "ArrowDown")).toBe(at(members, 0));
    }
  });

  it("leaves an equity to its own benchmark, and that benchmark to the hub", () => {
    for (const sector of SECTORS) {
      for (const member of membersOf(sector)) {
        expect(from(member, "ArrowUp")).toBe(SECTOR_ETFS[sector]);
      }
      expect(from(SECTOR_ETFS[sector], "ArrowUp")).toBe(TOPOLOGY_HUB);
    }
  });

  it("round-trips every cluster: down then up is where you started", () => {
    for (const sector of SECTORS) {
      const entered = from(SECTOR_ETFS[sector], "ArrowDown");
      if (entered === null) continue;
      expect(from(entered, "ArrowUp")).toBe(SECTOR_ETFS[sector]);
    }
  });

  it("answers null where the tree ends, rather than inventing a step", () => {
    const equity = at(membersOf("energy"), 0);

    // Nothing below an equity: it is a leaf.
    expect(from(equity, "ArrowDown")).toBeNull();
    // Nothing above the centre of the market.
    expect(from(TOPOLOGY_HUB, "ArrowUp")).toBeNull();

    // **And nothing below `QQQ`, `DIA` or `IWM`** — `buildTopologyGraph`
    // refuses to draw an edge for a constituent list this product does not
    // store, so a `Down` that handed back a sector ETF here would be the walk
    // claiming a relationship the picture deliberately does not.
    for (const node of GRAPH.nodes) {
      if (node.kind !== "index_etf" || node.symbol === TOPOLOGY_HUB) continue;
      expect(from(node.symbol, "ArrowDown")).toBeNull();
      expect(from(node.symbol, "ArrowUp")).toBeNull();
    }
  });
});

describe("Home and End, and the arrival", () => {
  it("jumps to the ends of whichever group Left and Right are walking", () => {
    const members = membersOf("utilities");
    const middle = at(members, Math.floor(members.length / 2));

    expect(from(middle, "Home")).toBe(at(members, 0));
    expect(from(middle, "End")).toBe(at(members, -1));

    expect(from(at(RING, 5), "Home")).toBe(at(RING, 0));
    expect(from(at(RING, 5), "End")).toBe(at(RING, -1));

    expect(from(TOPOLOGY_HUB, "Home")).toBe(TOPOLOGY_HUB);
  });

  it("seeds at the centre on the first key, whichever key it is", () => {
    // Gate 1's own clause — *focus is never a state with nothing in it*. Every
    // key seeds rather than only an arrow, because a reader whose first press
    // is `End` has still arrived.
    for (const key of TOPOLOGY_WALK_KEYS) {
      expect(from(null, key)).toBe(TOPOLOGY_HUB);
    }
  });

  it("seeds at the centre from a symbol this graph does not hold", () => {
    // A retry that lands a fresh universe can leave a selection naming a
    // security the new picture does not draw. Seeding is the only answer that
    // is about what is on screen; stepping from a ghost would be arithmetic
    // over a node nobody can see.
    expect(from("ZZZZ" as Ticker, "ArrowRight")).toBe(TOPOLOGY_HUB);
  });
});

describe("a graph with no hub", () => {
  it("seeds on the ring rather than leaving the keyboard dead", () => {
    const withoutHub = buildTopologyGraph(
      securitiesFixtureBody("full").securities.filter(
        (security) => security.symbol !== TOPOLOGY_HUB,
      ),
    );
    const layout = buildTopologyLayout(withoutHub);

    expect(topologyWalk(withoutHub, layout, null, "ArrowDown")).toBe(
      at(RING, 0),
    );
    // And the ring's own exit answers `null` rather than a hub that is not
    // there — the same *claim nothing that is not drawn* rule as the three
    // edgeless proxies.
    expect(topologyWalk(withoutHub, layout, at(RING, 0), "ArrowUp")).toBeNull();
  });
});

// **The walk over a NARROWED graph** (Task 6.8.1).
//
// Story 6.8's Gate 1 decision is that an excluded equity *is skipped by the
// keyboard walk*, and this module needed **no change at all** to honour it:
// the renderer hands it `narrowTopologyGraph(graph, sector)` rather than the
// graph it was mounted with, so the walk's own presence filters
// (`indexGraph`'s `nodes.has`, `groupOf`'s `cluster.members`) already answer
// about the picture. That is a claim about a mechanism, which reads identically
// whether the mechanism is there or not — so it is asserted here rather than
// argued in the renderer's own docblock.
describe("a graph narrowed to one sector", () => {
  const NARROWED_TO: (typeof SECTORS)[number] = "energy";
  const narrowed = narrowTopologyGraph(GRAPH, NARROWED_TO);
  const step = (
    symbol: Ticker | null,
    key: (typeof TOPOLOGY_WALK_KEYS)[number],
  ): Ticker | null => topologyWalk(narrowed, LAYOUT, symbol, key);

  it("walks the whole eleven-ETF ring, because a landmark is never excluded", () => {
    // The ring is the way OUT of a narrowed sector. A reader who filtered to
    // `ENERGY` and could only reach `XLE` would be trapped in their own
    // criterion.
    expect(step(TOPOLOGY_HUB, "ArrowDown")).toBe(at(RING, 0));
    for (const [index, benchmark] of RING.entries()) {
      expect(step(benchmark, "ArrowRight"), benchmark).toBe(
        at(RING, (index + 1) % RING.length),
      );
    }
  });

  it("enters the drawn sector and stops at its own ends", () => {
    const members = membersOf(NARROWED_TO);
    expect(step(SECTOR_ETFS[NARROWED_TO], "ArrowDown")).toBe(at(members, 0));
    expect(step(at(members, -1), "ArrowRight")).toBeNull();
    expect(step(at(members, 0), "End")).toBe(at(members, -1));
  });

  it("refuses to enter a sector whose equities are not drawn", () => {
    // **The assertion this whole describe block exists for.** `ArrowDown` on a
    // filtered-out benchmark answers `null` rather than entering a cluster
    // whose 70 members draw no ink, are not hit-testable and have no
    // placement a focus ring could be drawn at.
    for (const sector of SECTORS) {
      if (sector === NARROWED_TO) continue;
      expect(step(SECTOR_ETFS[sector], "ArrowDown"), sector).toBeNull();
      // `Home`/`End` move within the group `ArrowLeft`/`ArrowRight` moves in,
      // which for a benchmark is the RING rather than its own members — so
      // they are unaffected by the filter, and asserting that is what proves
      // the refusal above is scoped to *entering* and has not quietly
      // deadened the ring a reader leaves by.
      expect(step(SECTOR_ETFS[sector], "Home"), sector).toBe(at(RING, 0));
      expect(step(SECTOR_ETFS[sector], "End"), sector).toBe(at(RING, -1));
    }
  });

  it("seeds at the centre from a security the filter has excluded", () => {
    // The reachable sequence: a reader selects a `TECHNOLOGY` equity, then
    // narrows to `ENERGY`. The renderer clears the selection in the same call
    // (`setFilter`'s own `"filter"` source), so this is the belt behind that
    // brace — and `null` from a ghost would leave the keyboard dead.
    const outside = at(membersOf("technology"), 0);
    expect(step(outside, "ArrowRight")).toBe(TOPOLOGY_HUB);
  });

  it("leaves a drawn equity by the way it came in", () => {
    expect(step(at(membersOf(NARROWED_TO), 0), "ArrowUp")).toBe(
      SECTOR_ETFS[NARROWED_TO],
    );
  });
});
