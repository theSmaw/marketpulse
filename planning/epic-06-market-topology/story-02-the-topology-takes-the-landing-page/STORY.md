# Story 6.2 — The Topology Takes the Landing Page

**Status:** Not started
**Epic:** [Epic 6 — Market Topology](../EPIC.md)
**Depends on:** 6.1
**Epic scope covered:** Sector clustering · the renderer on the route

**Amended 2026-10-30 at Story 6.1's close: "WebGL renderer" above is this
story's own pre-measurement wording, now false.** Story 6.1 measured two real
candidates and shipped a hand-rolled Canvas2D renderer — Sigma.js/graphology
lost on 334× the gzipped cost for an indistinguishable frame rate, not on
quality. See the hand-off section below before starting AC 3.

## Description

**This is the story the landing page has been reserving a band for since
2026-09-25, and it is the largest visible change in the product since `/`
stopped being a placeholder.** §9 says the visualization _"should be the
product's visual centre of gravity"_ and it has never been drawn at all.

**The first rendered node trips a recorded reversal condition**, so the layout
change is not a side effect — it is this story's main work. The interim grid
reverts to the end state already drawn on the design canvas
(`Market overview.dc.html` §02): the reserved band becomes the **primary** area
and sectors and movers drop to a lower band. **The regions keep their names,
their order and their landmarks across the change**, so nothing a screen reader
or a deep link depends on moves.

**And the band as it stands cannot hold a graph.** Measured 2026-10-15 after
Story 5.4 re-areaed the grid, your region spans both columns and is
**1392 × 161** at 1440×900 — but **the height tracks the viewport**
(`calc((82vh - 2 * var(--space-24)) * 7 / 30)`), so it is **123** at 700 and
**119** at 680. A canvas sized from a remembered `161`, or from the `calc`, is
wrong; one sized from a `ResizeObserver` is not. **Row 1 is the one grid row
with no content floor**, which is why `Market topology` already scrolls by 3 px
at 1440×500 with nothing in it but a hatched placeholder.

## What the user can see when this story lands

**The landing page becomes the product.** A live graph of 516 securities
clustered by sector occupies the primary area of `/`; sector performance, movers,
breadth and unusual activity sit beneath it. This is the screen §38's demo opens
on.

## Acceptance criteria

**Rewritten 2026-10-31 at this story's own Gate 1**, after shaping found 6 of 9
unmeasurable, wrong, or checking the wrong thing as first written — the same
ratio Story 6.1 found in its own eight. Each note below says what changed and
why; nothing here is a correction to work already done, because none had
started.

1. **The grid reverts to the canvas's end state, in its own real columns.** The
   topology takes the full width of the shipped `minmax(0, 3fr) minmax(0, 1fr)`
   primary column (**not** a literal `span 8`/`span 4` re-reading of the
   12-column mockup — see Decisions); sector performance and movers drop into a
   2-up row beneath it, in that same column; the right column (unusual
   activity, breadth, investigations) is untouched. The four displaced regions
   keep their **names, their order and their landmarks**, and so does the
   topology's own.
2. **The before/after displacement is measured at the same thirteen
   width/height pairs AC 3 uses, BEFORE the merge**, and what moved is stated
   for every figure-bearing region — not four widths, because row 1 is a
   `calc()` with no content floor (`MARKET-OVERVIEW.md` §1.6) and this story
   changes row 1. `MARKET-OVERVIEW.md` §1.4's trigger — _the first reserved
   region whose filling would move a figure or a sentence a reader is
   reading_ — fired once already on the other route at **+74 px** (136 at 390)
   and the owner accepted it with the figures recorded. On `/`, this region's
   neighbours are **figures rather than hatch**, so the figure matters more,
   and the Gate-1 decision to take the full 520 px band (see Decisions) is
   taken knowing it costs roughly that again.
3. **The canvas is sized from its resolved box and never from a constant**, at
   the same thirteen width/height pairs Task 4.6.6 measured (not Task 4.9.4 —
   that attribution was wrong in the first draft). **Concretely falsifiable,
   not just named**: `fit.ts`'s own `TopologyPlacement`s and every drawn
   sector-label box sit entirely inside the box at rest, at all thirteen
   pairs — the same arithmetic `docs/GAPS.md`'s label entry already runs,
   pointed at the real resolved box rather than an assumed one. This replaces
   `--topology-height`'s shipped `520px` fallback, which nothing in the
   application sets — found independently by two shaping passes, and the
   first defect this story's first task fixes.
4. **At ≤860 the one-column ORDER is unchanged** —
   `breadth, sectors, movers, topology, unusual, investigations`, verified
   byte-identical at 768 by Task 5.4.1 — **and the topology draws there too,
   sized from its own resolved box**, with sector labels dropped below the
   fit-scale threshold Decision 4 sets. "Nothing moves" is not achievable as
   first written: real content replacing a hatched placeholder necessarily
   changes that row's height, because `grid-template-rows: none` makes it
   content-sized. What is checkable, and is this AC's real claim, is the
   **order**, and the displacement is AC 2's to report.
5. **The region adds no second clock, session word or connection word.**
   `one-caller-of-the-market-clock` and `one-home-for-the-feed-words` fail the
   build by name, and the connection's one home is the status bar. Already
   satisfied by the shipped component as built — confirm after any new copy
   lands, not before.
6. **`Market topology` becomes the degraded grid's ninth named surface, on a
   SECOND axis the grid does not yet have — not merely "a row".**
   `e2e/specs/overview-degraded-grid.spec.ts` is a kept spec, now **17 states ×
   4 widths × 8 surfaces** (Task 5.4.6 added the eighth; the original "thirteen
   × seven" was already stale before this story). The topology's text is a
   function of the **universe request** (`useSecurities`), not of the overview
   **aggregate** — the first surface on `/` for which that is true — so it must
   be: (a) **declared constant across every aggregate-only state** (feed down,
   stale, market shut, rollback all draw the identical, healthy graph, and
   `MARKET-OVERVIEW.md` §7.3's "a content class is ONE AGGREGATE" gets a dated
   amendment recording the exception rather than a silent break), and (b) given
   its **own** new rows for the universe-request states the grid has none of
   today (`failed`/retryable, `failed`/not-retryable, `unreachable`, `empty`) —
   row `13-universe-outstanding`'s own comment, that an abort "reaches the same
   screen and is the failure case," is false the moment this region lands and
   needs its own dated correction. The fallback text must be **derived from the
   graph** (a census, not a static sentence) so the surface has real
   discriminating power rather than contributing one constant string to all 17
   rows, and it must **not enumerate securities** — `overview-no-element-per-
security.spec.ts` asserts `/`'s element count is equal between the full
   universe and a 27-row sample, and a 516-line text alternative is exactly the
   defect its break plants.
7. **`Market topology`'s reserved panel is deleted**, including its own
   `filledBy` sentence (_"in WebGL … sized by liquidity … moving with the
   market"_ — three claims this epic has since falsified or not yet built) and
   the matching sibling string in `e2e/specs/security-explorer-shell.spec.ts`.
   **A degraded topology never draws the hatch** — see Decisions — so after
   this story the hatch means exactly one thing on `/`: nobody has built this
   yet.
8. **A memo boundary at the region, or a measured reason not to — and the
   reason is already in the shipped code, not still open.** Traced precisely:
   `MarketTopology`'s mount effect depends on `[securities, probe]`; `securities`
   is a `useState` value that changes only on a settled `GET /securities`
   response or a retry, never on a live-feed batch; `probe` is `undefined` in
   application use. **The canvas has no continuous render loop** — it redraws
   only from `invalidate()`, reached by resize, drag or wheel — so a host
   re-render from `/`'s 6.8–16.1 batches a minute reconciles one unchanged
   `&lt;div&gt;` and touches the renderer not at all. **Decline the boundary**,
   record it with a reversal trigger (_the first prop this region takes that
   changes at feed cadence_ — Story 6.3's band or Story 6.6's size are the
   likely source), and hold the claim with a **producer-side** assertion
   (`framesDrawn()` unchanged across N applied batches) rather than a render
   count, because the wire cannot see a defect in the producer and neither can
   a renders-per-batch figure.
9. **`/`'s cold load is re-measured on three channels, each proved by a plant,
   against the 447-node / 24.7 ms baseline — as two separate claims, not one.**
   The **cold-load** claim is a route-level measurement this story owes for
   real, via `overview-instrument.mjs`'s `pageInstrument()` against the built
   pair, with the production-build assertion and the per-channel plant this
   repository's own discipline requires (a channel going quiet and a cost going
   away are one output). The **frame-rate-under-interaction** claim has **no
   entry point on the real route today** — `probe` is wired only in
   `MarketTopology.stories.tsx` — so it stays a **Storybook-measured, stated
   bound** (ADR 0048's own figures) rather than a route claim invented for this
   story. If `/` crosses §28's 50 ms, the figure is handed to Epic 14 by name,
   with the three channels and the plant, exactly as `/securities`' was — the
   decision to ship anyway belongs to the Product Owner before the number is
   taken, not after (see Decisions).

## Decisions — settled 2026-10-31 at this story's Gate 1

Eight questions, batched in two rounds, every one taken with the recommendation
offered:

1. **Region height at 1440: 520 px, not 420.** The fuller band (+27.2 px of
   label clearance against +14.1, the graph filling 97% of the band's height
   against 83%) costs roughly another +100 px of displacement on the four
   regions below — measured and reported under AC 2 rather than assumed.
2. **The label-collision defect is fixed in this story, both halves** — the
   ring re-derivation (free, see below) and a renderer-side fit-scale
   threshold for widths no ring shape can clear. `docs/GAPS.md`'s own "the next
   story that fits this layout into a real box" condition has fired; shipping
   the known defect on the product's new visual centre of gravity was rejected.
3. **The topology owns "the tracked universe is not available," loudly.** `/`'s
   existing rule for this exact failure is silence (no sentence, no retry); the
   topology is the one region whose entire subject is the universe, so it
   becomes the owner under ADR 0029's one-fact-one-home rule. `MarketTopology`'s
   `onRetry` was already built required rather than optional, anticipating
   this. A successful retry here also fills in blank mover names, which were
   the same request's silent consumer since Task 4.5.5.
4. **A degraded topology never draws the hatch.** Its degradations reuse the
   white-box-plus-muted-sentence vocabulary the four filled regions already use
   when they have nothing. After this story the hatch means exactly one thing
   on `/`: nobody has built this yet (Open decision 2, closed).
5. **The page scrolls; zoom needs `ctrl`/`⌘` + wheel.** The shipped component's
   unconditional `preventDefault()` on `wheel` and `touch-action: none` were
   built for an isolated Storybook iframe with nothing to scroll; moved onto
   `/` unmodified they make the primary area a scroll trap. Vertical touch drag
   scrolls the page (`touch-action: pan-y`); wheel scrolls; zoom takes a
   modifier.
6. **The region gets a `Reset view` control**, in `Region`'s `meta` slot. It is
   the only recovery from an unclamped pan (today: a page reload), it is a
   genuine keyboard-reachable control pending Story 6.4's node interaction, and
   it gives the degraded grid's ninth surface a stable, assertable string.
7. **The shipped `minmax(0, 3fr) minmax(0, 1fr)` columns stay** — the canvas's
   own literal `span 8`/`span 4` 12-column mockup was taken as intent rather
   than as a track spec. Reading it literally widens the right column
   342 → 448 px, re-wrapping three regions (notably `Unusual activity`'s
   company-name column, already tuned to 145 px by Task 5.6.7) that both the
   canvas's own prose and AC 1 call untouched.
8. **Sector labels are dropped below a fit-scale threshold rather than drawn
   colliding.** Swept: no ring shape (circular or elliptical) clears the
   longest label at the ≤860 one-column width — `CONSUMER DISCRETIONARY` is
   163 CSS px on a ~342 px box, wider than its own neighbourhood. Below
   **≈0.365** fit scale the renderer draws clusters with no label at all; the
   sector names are already in the accessible fallback text at every width
   (AC 6), and Story 6.4 is where a reader gets close enough to read one on
   screen.

**Not asked of the Product Owner, decided as a design-system reconciliation
instead**, per ADR 0026's own rule (where the document and the canvas
disagree, the document is wrong): the canvas's end-state groups sector
performance and movers with the topology in the primary column, with breadth
in the right column — `PRODUCT_SPEC.md` §9's own sketch instead puts breadth
directly beneath the topology. The canvas is newer, drawn specifically for
this screen's real regions rather than §9's illustrative one, and the grouping
it draws is the more coherent of the two (the primary column reads _the
market's structure, then where in that structure the move sits_ — cluster,
sector, mover — while the right column reads _aggregate state, what to look
at, work in flight_). §9 takes a dated amendment in the same change that
builds AC 1.

## Handed here by Story 6.1's close — 2026-10-30: the renderer, the ring's real extent, and an unfinished label problem

**The renderer is decided, and it is not the one this story's own scope line
named.** A hand-rolled Canvas2D module, zero dependencies, mounted via
`mountCanvasTopology` (`apps/frontend/src/topology/renderer-canvas.ts`),
reading `TopologyGraph`/`TopologyLayout` from `packages/shared` through
`apps/frontend/src/topology/graph-source.ts`'s `topologySource`. The whole
mount path — fit, palette, pan/zoom — already exists in
`apps/frontend/src/components/MarketTopology/`; this story's own work is
**fitting that existing component into `/`'s real, narrower region**, not
building a renderer.

**The extent is bigger than the design canvas's own figure, and the reason is
load-bearing.** `The graph at rest.dc.html` names an 886 × 826 extent at
`TOPOLOGY_RING_RADIUS = 335`; Task 6.1.3 raised that constant to **400** to
reduce (not eliminate — see below) a real label-collision defect Task 6.1.2
found, so the layout's real extent is now **≈1000 × 928**
(`packages/shared/src/topology-layout.ts`'s own docblock has the figure and
the reasoning). **Re-derive this story's elliptical-ring numbers from 1000 ×
928, not from 886 × 826** — `R_x ≈ 540, R_y ≈ 185` was computed against the
smaller extent and is now stale.

**The open label-collision defect is this story's to close, not merely to
inherit — and Gate 1 found the real fix.** `communication_services`'s sector
label visibly crosses into `consumer_discretionary`'s cluster on the shipped
circular ring (measured **−28 px** of clearance at `1392 × 520`). The fix is
**not** a further radius increase — `docs/GAPS.md`'s own entry shows raising
`R` buys almost nothing in a box this shape — it is the ring's **aspect**: see
Design work below for the derivation.

## Design work

`Market overview.dc.html` §02 holds the end-state grid (amended 2026-10-30 at
this story's own Gate 1 to correct four stale "WebGL"/"sized by liquidity"
claims — ADR 0048 and this epic's shipped node ladder had already falsified
both). `The graph at rest.dc.html` remains the authority for the node, edge
and label treatment itself; nothing here reopens it.

### The elliptical ring, re-derived and verified against the shipped figures

Re-derived from the real layout (`TOPOLOGY_RING_RADIUS = 400`, extent
`1000.3 × 928.4`, control-checked against `topology-layout.test.ts`'s own
clearance arithmetic — reproduces its figures exactly) rather than from the
canvas's stale `886 × 826`/`R_x≈540, R_y≈185`.

**The canvas's own circular-to-elliptical recommendation is wrong in kind, not
only in its numbers.** Squashing the ring (`R_y ≈ 185`, well below `R_x`)
starves the three-and-nine-o'clock sectors of arc length under the existing
angle-proportional wedge allocation — arc speed on an ellipse is
`R_x` at twelve o'clock and **`R_y` at three o'clock**, so at 540/185 a sector
sitting near three o'clock receives **34%** of the arc a circle would give it.
Measured: `R_x = 540, R_y = 185` with the shipped allocation produces a
**−53.2-unit cluster-to-cluster overlap** — `health_care` and `financials`
physically interleave, falsifying `TOPOLOGY_RING_RADIUS`'s own "genuinely,
unconditionally true" disjointness claim. The canvas's recommendation cannot
be built as drawn.

**The fix is a stretch along `x`, combined with allocating each sector's wedge
by arc length along the ellipse rather than by angle** — the same closed-form,
deterministic, no-simulation shape, re-expressed so the "25% more arc than
occupied" argument holds independent of `R_x`/`R_y` rather than only at
`R_x = R_y`.

**Recommended: `TOPOLOGY_RING_RADIUS_X = 800`, `TOPOLOGY_RING_RADIUS_Y = 340`,
arc-length allocation.** Swept against the real recorded fixture:

|                                                                               | shipped circular `R = 400` | **recommended `800 × 340`** |
| ----------------------------------------------------------------------------- | -------------------------- | --------------------------- |
| fitted extent (aspect)                                                        | 1080 × 1008 (1.07)         | **1880 × 923 (2.04)**       |
| worst cluster-circle gap                                                      | 56.8 u                     | **130.3 u**                 |
| closest node pair                                                             | 17.83 u                    | **17.83 u — unchanged**     |
| label clearance @ 1026×520 (this story's primary column at 1440, 520 px band) | **−26.7 px**               | **+27.2 px**                |
| label clearance @ 1026×420                                                    | **−33.3 px**               | **+14.1 px**                |
| label clearance @ 708×420 (≤1180 primary column)                              | **−33.3 px**               | **+2.6 px**                 |
| band width spent on the graph @ 1026×420                                      | 44%                        | **83%**                     |

Closest node pair is bit-identical because nothing inside a cluster moves —
the golden-angle spiral, the member hole and `topologyClusterRadius` are all
independent of the ring shape. This is the canvas's own stated approach,
_node size fixed, ring deformed_, correctly executed. Below **≈690 × 337 px**
no ring shape clears the label (the box itself is too small for the
longest label at any aspect, let alone a legible graph) — that is the ≤860
case, closed by Decision 8's renderer threshold rather than by geometry.

**Explicitly rejected: an anisotropic scale inside `fit.ts` instead of a
shaped layout.** Cheaper to write, and wrong — it squashes node spacing along
with the ring, dropping the closest-pair clearance below
`TOPOLOGY_NODE_FOOTPRINT` at the vertical factor this box wants, and it breaks
the circular node footprint Story 6.3's annulus and Story 6.4's focus ring
both need. The shape belongs in the layout, not the fit.

**Where the shape lives**: `buildTopologyLayout(graph, { ringRadiusX,
ringRadiusY })`, defaulting to `800 × 340` — an aspect ratio is not a pixel,
so `packages/shared` still learns nothing about a viewport, and a later story
with a different box (a taller one, say) has a parameter rather than a second
model. `topologySource`'s memo key widens from array identity alone to array
plus the radii pair.

**Mechanical consequence, owed in the same change**: `TOPOLOGY_RING_RADIUS`'s
"genuinely, unconditionally true" disjointness claim is **conditional on the
allocation rule** the moment the ring is not circular. ADR 0048's Decision 3
needs a dated amendment, and the property needs an actual test (asserting
disjointness at the shipped radii) rather than a paragraph — this
repository's own rule that a claim about a mechanism reads identically
whether the mechanism is there or not.

### The proxy column

`PROXY_CLEARANCE`'s own docblock hands its compass direction to this story
("arbitrary, and is Story 6.2's to re-site when the ring deforms"). At
`R_x = 800` the column's `x = 800 + 106 + 48 = 954`, clear of every cluster
circle by construction — the property to preserve, undisturbed. **Decision:
keep the right-hand column.** Three diamonds beyond the widest point of a
2.04-aspect ellipse is a wider gap from the ring than today's near-circular
one, which reads as more clearly separate — correctly, since they are
benchmarks the product has not decomposed — rather than less composed.

### The accessible fallback — extend the shipped vocabulary, invent one new state

`MarketTopology.tsx` already carries four absence sentences and a renderer
refusal, all DOM text sibling to the canvas — Story 6.1's own AC 7, taken
anticipating this story's name in as many words. This story **adds one state
and changes none of the existing five**:

- **The drawing itself needs a text equivalent**, because nothing before this
  story has needed one — a canvas has no accessible content by default. A
  visually-hidden `&lt;p&gt;`, sibling to the canvas, carrying one sentence built
  by a new `topologyDrawnSentence(graph)` (beside `topologyFailureSentence`, so
  Story 6.3 has one named place to amend when the picture stops being free of
  measurement): _"A graph of every security we track, grouped into 11 sectors
  around their benchmark ETFs, with the broad market at the centre. Nothing in
  it is a measurement — it is a picture of how the market is organised."_ The
  canvas takes `role="img"` and `aria-labelledby` pointing at that paragraph —
  not `aria-label`, which would be a second copy of the string the one-fact-
  one-home rule forbids. **No live region**: the picture is static for the
  page's lifetime (built once from a `useState` value that changes only on a
  settled response), so there is nothing to announce — reversal trigger, a
  condition: _the first change to this region a reader must be told about
  without having asked_ (Story 6.4's selection answering an agent's
  `highlight_graph_nodes`, not a repaint).
- **The sentence states no count another surface already owns** (`516` has one
  home already, in `measured-set.ts`) **and names no ticker** — the cluster
  count is this region's own fact and nothing else on `/` states it; 516
  symbols in a hidden paragraph is a wall, not a fallback.
- **`Reading the tracked universe.` moves behind `useWaited`'s existing
  2,000 ms floor**, matching `MarketProxyStrip`/`SectorPerformance`/`Unusual`'s
  own pattern — the measured 174–277 ms response time means drawing the
  sentence immediately would flash it in the primary area on every cold load,
  the exact defect those three siblings were built to avoid.
- **The failure sentences keep their existing wording** (`"Nothing answered at
the service's address…"` etc.) rather than being rewritten around "the
  service" — Decision 3 makes the topology this fact's owner, and the existing
  sentences already name their own subject correctly.

### The source note

`/`'s one source note (`OverviewSourceNote`) gains a clause reusing
`SourceNote`'s shipped `CLASSIFICATION_CLAIM` vocabulary ("Sector and industry
are curated, not from the market feed."), rendering only while a graph is
drawn — the precedent is Story 5.4 adding a term for the baselines' `sip`
tape. Without it, a healthy graph beside regions in an aggregate-degraded
state makes an unlabelled claim about market data; the graph's structure is
curated, not observed.

## Out of scope

The anomaly encoding (6.3), interactions (6.4), correlation edges (6.5).
