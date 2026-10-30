# Task 6.1.1 — The Graph Model, & the Deterministic Layout

**Status:** **Complete — 2026-10-30.** The model and the closed-form layout are
pure, deterministic, and provably renderer-free — and the task's own commissioned
invariant corpus (a `topology*.ts` glob) was proved too narrow before it shipped,
on a planted file neither renderer candidate would recognise as a defect.
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

## What was done — 2026-10-30

**The model** — `packages/shared/src/topology.ts` — ships `TOPOLOGY_HUB`
(`SPY`, kept distinct from the frontend's `BROAD_MARKET` because it is a
structural fact about which fund partitions the sector SPDRs rather than a
measurement-reference choice), `TopologyNode`/`TopologyEdge`/`TopologyCluster`/
`TopologyGraph` exactly as specified (no `weight` field on an edge, with the
reversal trigger recorded as a condition — _the first edge kind whose strength
is a measurement rather than a membership_), and `buildTopologyGraph`: pure,
total, filters on `status === "active"`, and builds **501 membership edges +
11 hub edges = 512 edges** over **516 nodes** (501 equities, 11 sector ETFs, 4
market proxies). The Epic 13 replay hand-off is written into the function's
own docblock with three numbered constraints.

**The layout** — `packages/shared/src/topology-layout.ts` — is the closed-form
radial design: eleven sector wedges in `SECTORS`' declaration order from twelve
o'clock clockwise, angular span proportional to √(member count), members
placed by a golden-angle spiral keyed on a stable sort by symbol. Measured over
a 501/11/4-node universe of the real shape: **closest pair of placements
17.83 units apart** (against a 16-unit footprint — 11% headroom), **closest
pair of cluster circles 28.75 units clear** (against the 25% arc-allocation
slack the wedge formula buys), hub at the origin, three undecomposed proxies
(`QQQ`, `DIA`, `IWM`) in one column outside the ring. No real universe fixture
is reachable from `packages/shared` — the curated universe lives in
`apps/backend`, downstream of this package — so `topology-fixture.ts`
generates a universe of the real **shape** from this package's own vocabulary,
with the eleven per-sector counts taken from the deployed `UNIVERSE` table on
2026-10-30 (`73/59/76/47/22/83/34/21/31/30/25`, summing to 501). **What that
fixture cannot certify — that the real universe still matches those counts —
is now `docs/GAPS.md`'s own entry**, owned by the first task in `apps/backend`
that imports `buildTopologyGraph` for a real purpose.

**Two new `pnpm invariants` entries, each proved wrong before it was fixed.**
`no-random-in-the-shared-model`: the first draft, keyed on the literal
`Math.random`, reported `79 invariants hold.` against a planted
`const { random } = Math; const jitter = () => (random() - 0.5) * 2;` —
caught, and the shipped clause covers a member read, a computed read, a
destructured `random`, and `crypto`'s generators, with a documented exemption
for a `random` parameter passed in (so it never flags `retry-provider.ts`'s
seam). `no-renderer-type-in-the-graph-model`: the task's own specified corpus
(`packages/shared/src/topology*.ts`, a glob) reported `80 invariants hold.`
against a planted `graph-marks.ts` — carrying `host: HTMLElement | null`, a
`#1a1a1a` literal and a `var(--chart-volume)` read — imported by `topology.ts`
but outside the glob's name pattern. Fixed by walking the model's transitive
`./`-relative import closure from its two seed files instead, with its own
anchor (`reached.length === 0` throws) proving the closure cannot silently
collapse back to just the seeds. Both breaks are registered in
`scripts/breaks.mjs` and were run for real, post-commit, confirming genuine
red-for-the-right-reason and byte-identical restoration on both.

**Tests: 22, across both files, 654 total in `packages/shared` with the rest
of the package.** `topology.test.ts` (11): node-kind counts, `cluster: null`
on proxies only, edge-kind counts (501 + 11 = 512), a permutation check that
every membership edge's target is the node's own cluster, all 11 ETFs on the
hub and nothing else, `QQQ`/`DIA`/`IWM` present with zero edges, no dangling
edge endpoints, 11 clusters summing to 501 excluding their own benchmark, the
`status === "active"` filter (via an injected untracked row — the curated
file holds none today), sort-order proof by reversed-input byte-comparison,
total-on-empty-universe. `topology-layout.test.ts` (11): every node placed
exactly once, no two coincident (17.83 measured, asserted both `>= 16` and
`toBeCloseTo(17.83, 2)`), cluster centroids strictly increasing clockwise
computed from placements rather than from anything the implementation
exposes, 11 cluster circles disjoint (28.75 clearance), hub at origin, three
proxies in one column outside the ring, bounds contain every placement, all
coordinates finite, same-input-twice byte-equal, reversed-input byte-equal,
total-on-empty-graph.

**Six places where the task's spec needed interpretation, each flagged rather
than silently resolved**, reviewed and accepted as written: no real-universe
fixture reachable from this package (routed to `docs/GAPS.md`); "normalised
abstract units" read as extent-relative rather than rescaled to `[-1, 1]`,
reasoned in the module's own docblock (a unit-square rescale would make the
16-unit footprint invariant data-dependent); specific hub/proxy placement
choices; an edge-direction question resolved by following the task file over
the canvas; and an imputed-zero (`?? 0`) shape that an _existing_ Epic-5
invariant (`nothing-checks-for-0`) already catches, confirmed not present in
the shipped `radiusOf()`, which is a genuine total function.

**A self-contradiction found in `STORY.md` during implementation**, not
before it: AC1 and AC5's headline language said "514-edge" in four places
while the body text and the design work both said 512 (= 501 membership + 11
hub edges, the arithmetically correct figure). The developer built against
512 and flagged the inconsistency rather than guessing; all four headline
occurrences are now corrected to 512 in `STORY.md`.

### Gates

`pnpm build` (tsc -b, frontend bundle, Storybook) — green.
`pnpm lint` — green, zero warnings.
`pnpm format:check` — green (`notes.txt` never touched; the house `prettier
format:check` + explicit-path `--write` split was followed throughout).
`pnpm invariants` — **80 invariants hold.** (up from 78 before this task).
`pnpm stories` — 44 components, 44 stories files.
`pnpm env:check`, `pnpm links` (615 documents, 1966 cross-file links, 0
broken) — green.
`pnpm coverage:check` — green.
`pnpm test` — **654 passed (31 files)** in `packages/shared`, 1344 passed in
`apps/backend`, 1688 passed in `apps/frontend` (one frontend test,
`use-backend-health.test.ts`'s abort-signal case, failed once under full
parallel load and passed 4/4 in isolation — a pre-existing timing flake in
code this task did not touch, re-run clean rather than carried forward).
`pnpm test:scripts` (21 tests) and `pnpm test:process` (60 tests) — green.
`pnpm break a-random-source-in-the-shared-model` and
`pnpm break a-renderer-type-in-the-graph-model` — both run for real after the
commit (the only way to run them: `break-verify.mjs` requires a clean git
status for the target file, which untracked new files cannot satisfy before a
commit), both confirmed red-for-the-right-reason and restored byte-identical.

## For a stakeholder — a status report, 2026-10-30

This task builds no screen — it is the data model and geometry underneath
Story 6.1's market-topology graph, and nothing changes on any page yet. What
it delivers: a description of the market as a graph (516 securities, 512
relationships — each stock linked to its sector's benchmark fund, each of the
eleven sector funds linked to the broad-market fund) and a formula that places
every one of those 516 points on a page with no randomness and no simulation,
so the same market always draws the same picture and two different drawing
techniques can be compared fairly against it next. Two new automated guards
ship alongside it, each deliberately proved wrong once before being fixed, per
this repository's own discipline: a guard against a layout that could jitter
positions for cosmetic reasons (which would make the upcoming renderer
comparison compare two different pictures rather than two drawing techniques),
and a guard against the model quietly picking a drawing technology before the
measurement that is supposed to decide it has even run. One gap is opened
rather than closed: nothing yet checks that the hand-recorded test universe
still matches the real one, which is `docs/GAPS.md`'s and owned by the next
task that has a reason to build that check for real. Next up is Task 6.1.2 —
building the two renderer candidates and measuring which one actually wins.
