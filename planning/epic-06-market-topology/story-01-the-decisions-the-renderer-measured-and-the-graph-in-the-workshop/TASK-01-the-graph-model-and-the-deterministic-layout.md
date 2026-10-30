# Task 6.1.1 — The Graph Model, & the Deterministic Layout

**Status:** Not started
**Story:** [6.1 The Decisions, the Renderer Measured, & the Graph in the Workshop](STORY.md)
**Depends on:** nothing

## Objective

Everything else in this story reads this task's output. If the model carries a
renderer type, or the layout is non-deterministic, both renderer candidates in
Task 6.1.2 are comparing something other than drawing — which is exactly the
confound the story's own shaping found in a force-directed layout. Build the
domain model and the layout as pure, testable, browser-free code first, so the
renderer choice is a clean comparison.

## What the user can see when this lands

**Nothing.** This is `packages/shared` — no route, no Storybook story, no
pixel. The payoff is Task 6.1.3.

## Work

- **`packages/shared/src/topology.ts`** — the model, flat, barrel-exported from
  `index.ts` following the existing convention (see `return-baseline.ts` /
  `index.ts` for the shape: data types, a pure builder function, nothing else).
  - `TopologyNode` — `{ symbol: Ticker; label: string; kind: SecurityKind;
cluster: Sector | null }`. `cluster` is `null` for the four market
    proxies; do **not** invent a twelfth pseudo-sector for them — `SECTORS`
    owns that vocabulary.
  - `TOPOLOGY_EDGE_KINDS = ["sector_membership", "index_membership"] as const`
    and `TopologyEdgeKind`.
  - `TopologyEdge` — `{ from: Ticker; to: Ticker; kind: TopologyEdgeKind }`.
    **No `weight` field** — a membership has no strength, and a field whose
    only value is `1` has no producer. Record in the module's own docblock
    that a weight arrives with Story 6.5's correlation edges, as a condition
    (_the first edge kind whose strength is a measurement rather than a
    membership_), not a story number.
  - `TopologyCluster` — `{ id: Sector; label: string; members: readonly
Ticker[] }`, `label` from `SECTOR_LABELS`.
  - `TopologyGraph` — `{ readonly nodes; readonly edges; readonly clusters }`,
    all `readonly` arrays, every array **sorted by `symbol`/`id`** so output is
    byte-comparable between runs of the same input.
  - `buildTopologyGraph(securities: readonly Security[]): TopologyGraph` — pure
    and total. Filters on `status === "active"` (this is a _computing-over-the-
    market-we-track-now_ reader, which `UNIVERSE.md` §12.2 already permits).
    Builds the 501 membership edges (equity → its sector's `SECTOR_ETFS` entry)
    and the 11 hub edges (each sector ETF → `SPY`). `QQQ`, `DIA`, `IWM` get no
    edges — see the design work in `STORY.md` for why. **Write Epic 13's bound
    into this function's own docblock as a hand-off, in words that epic can
    act on**, not a link: `security_memberships` begins 2026-10-12, so a
    replayed topology of an earlier session must refuse rather than fall back
    to today's roster.
- **`packages/shared/src/topology-layout.ts`** — the layout, also pure, also
  flat.
  - `TopologyPlacement` — `{ symbol: Ticker; x: number; y: number }`.
  - `TopologyLayout` — `{ readonly placements: readonly TopologyPlacement[];
readonly bounds: { minX; minY; maxX; maxY } }`. A sorted array, not a
    `Map` — this crosses a wire in Epic 7 and a `Map` does not serialise.
  - **Coordinates are normalised abstract units, never pixels.** Fitting to a
    viewport is the frontend's job (Task 6.1.3 / Story 6.2), from a
    `ResizeObserver`.
  - `buildTopologyLayout(graph: TopologyGraph): TopologyLayout` — the
    closed-form radial layout from the design work: eleven sector wedges from
    twelve o'clock clockwise in `SECTORS`' own declaration order; angular span
    proportional to `√(memberCount)` so no two clusters collide by
    construction; members placed within a wedge by a deterministic
    (golden-angle) rule keyed on a **stable sort by `symbol`**, never on
    insertion order or an index; the four market proxies and `SPY` placed at a
    fixed centre/corner per the design work, outside the radial ring. **No
    `Math.random()` anywhere in this file or in `topology.ts`.**
- **The clock-purity rule is free here**: `eslint.config.mjs`'s
  `no-restricted-syntax` under `packages/shared/src/**` already refuses
  `Date.now()` and zero-argument `new Date()`. Confirm it fires on these two
  new files (it will, with no action needed) rather than assuming.
- **New `pnpm invariants` entry: no `Math.random()` in `packages/shared/src`.**
  Unguarded anywhere in this repository today, and it is this layout's likeliest
  real non-determinism source. Grep-shaped, with a `pnpm break` entry — plant
  the defect (a `Math.random()` call inside `topology-layout.ts`) and confirm
  it is caught before the invariant is considered proven, per this repository's
  own four-guards-green-on-the-defect-they-forbid lesson.
- **New `pnpm invariants` entry: the graph model holds no renderer type.** Over
  `packages/shared/src/topology*.ts`, refuse `sigma`, `graphology`, `canvas`,
  `webgl`, `HTMLElement`, `#rrggbb`-shaped literals and `var(--`. With a
  `pnpm break` entry, proved the same way.
- **Tests, in `packages/shared`, no browser**:
  - `buildTopologyGraph` over the recorded universe fixture: exactly 501
    equity nodes, 11 sector-ETF nodes, 4 market-proxy nodes (`cluster: null`);
    exactly 501 membership edges + 11 hub edges = 512; `QQQ`/`DIA`/`IWM` appear
    in `nodes` and in no edge.
  - `buildTopologyLayout`: **every node placed exactly once; no two placements
    coincident; cluster centroids in `SECTORS`' own declared order** — these
    are the structural, cross-engine-safe assertions the story's shaping
    settled on, **not** a checked-in exact-coordinate fixture (floats are not
    required to be bit-identical between Node and a browser engine).
  - Same universe twice → identical `TopologyLayout`, compared by deep
    equality within one process (the strong, safe half of determinism).

## Done when

1. `packages/shared/src/topology.ts` and `topology-layout.ts` exist, are
   barrel-exported from `index.ts`, and `packages/shared` has zero new
   dependencies.
2. The two new invariants (`Math.random()` ban, no-renderer-type) hold, each
   with a `pnpm break` entry proved red on a planted defect first.
3. `pnpm --filter @marketpulse/shared test` is green with the new test files,
   and the three tests above are present and pass.
4. `pnpm build && pnpm lint && pnpm format:check` all exit 0.
5. The Epic 13 hand-off is written into `buildTopologyGraph`'s own docblock.

---

## What was done — YYYY-MM-DD

## For a stakeholder — a status report, YYYY-MM-DD
