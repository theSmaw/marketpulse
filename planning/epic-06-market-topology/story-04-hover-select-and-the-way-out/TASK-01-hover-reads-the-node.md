# Task 6.4.1 — Hover reads the node

**Status:** Not started
**Story:** [6.4 Hover, Select, & the Way Out](STORY.md)
**Depends on:** 6.3

## Objective

A graph nobody can interrogate is a picture. This task gives the topology a
voice for one security at a time: point at a node and it tells you what it
is, in the same words `Unusual activity`'s row already uses. Nothing here
yet lets a reader leave the page — that is Task 6.4.2 — but AC1's facts have
to be right, and reachable, before anything else in this story is built on
top of them.

It also repairs a defect found while shaping this story, in shipped code
from Story 6.1: `nodeAt()`'s hit-test threshold is **8 world units**, while a
node's drawn ink is a **constant 4 CSS px radius**, independent of the
container's fit scale. At 1440 the two happen to be close (≈3.7 px of hit
radius against 4 px of ink); at 390 the hit radius collapses to ≈1.3 px
under an 8 px-wide drawn mark — three times narrower than what a reader can
see. Today this only mis-sets the cursor icon. The moment this task makes a
hover readout depend on what `nodeAt()` returns, a narrow-screen reader
would be shown facts about a node they are not pointing at. This is a
coding defect in existing code, not a product decision, and it is fixed
here before anything is built on the hit-test.

## What the user can see when this lands

Move the pointer over any of the 516 nodes on `/`'s `Market topology` and a
plate at the foot of the region shows that security's ticker, name, sector,
and anomaly band — in the same words the `Unusual activity` region already
uses. Move off, and the plate returns to an idle instruction
("Point at a security, or press Tab and the arrow keys"). The plate's room
is reserved at every width, in every state, so the region never resizes
when it appears (Gate 1 decision: always reserve it).

A reader cannot yet select anything, leave the page from a node, or reach
any of this by keyboard — those are Tasks 6.4.2–6.4.4.

## Work

- **Fix the hit-test unit mismatch.** `nodeAt()` (`renderer-canvas.ts`)
  compares in world units; change it to compare against a radius derived in
  **screen pixels** from the node's own drawn ink (`TOPOLOGY_NODE_INK[kind] *
clampNodeScale(view.zoom)`), plus the 4px annulus Story 6.3 already
  reserves, so the target is at least as generous as the visible mark at
  every fit scale and zoom. Re-measure with `pnpm probe` at all four widths
  — do not carry forward an argued number.
- **Hover state lives inside the renderer, never in React.** A `let
hovered: TopologyNode | null` beside `bands`/`dragging` in
  `renderer-canvas.ts`'s mount closure, updated on every `pointermove` from
  the (now-repaired) `nodeAt()`. This keeps `MarketTopology`'s mount effect
  deps (`[topology, probe, sentenceId]`) unchanged and the region's declined
  `React.memo` boundary closed by construction — hover must never cause a
  re-render at pointer-move cadence.
- **The hovered node's treatment travels out of the renderer with it.**
  Extend whatever reports hover (a new `TopologyRendererOptions` callback,
  or a polled getter — developer's call) to hand back the node **together
  with its current anomaly treatment**, since the renderer already holds
  `bands`. `MarketTopology`/the route must not keep a second copy of that
  map to re-derive the band a second way.
- **Vocabulary, with no new builder where an existing one already answers
  it:**
  - Ticker: `node.symbol`. Name: `node.label`. Neither needs a join —
    both are already on `TopologyNode` (Story 6.1 put them there for
    exactly this).
  - Sector: `graph.clusters.find(c => c.id === node.cluster)?.label` (or
    `SECTOR_LABELS[node.cluster]`) — never a string transform of the slug.
    `node.cluster === null` (the four market proxies) draws **no sector
    line at all**, not a placeholder.
  - Band: the word itself (`"normal" | "elevated" | "high" | "extreme"`),
    rendered verbatim as `AnomalyBadge` does — never re-derived with
    `bandOf()` in the browser; always read from the treatment the renderer
    already computed.
  - `"unscored"` draws as a plain stated absence ("Not scored yet") —
    this is CI's and every deployment's first-~46s permanent state, never
    a blank line and never read as `normal`.
  - The eleven sector ETFs and four market proxies (fifteen landmark
    nodes, excluded from the anomaly encoding since Story 6.3) draw **no
    band line at all** — not "unscored", which would claim a failed
    attempt to score something nobody tried to score. State it plainly
    ("Benchmarks are not scored").
- **The readout is a real DOM element, sibling to the canvas, never
  painted** — per the component's own standing rule (painted text is
  unreachable, unassertable, invisible to the degraded grid). Build it per
  the design canvas page (see below): a fixed plate, bottom-left inside the
  frame, reserved room at every width and in every state, idle instruction
  when nothing is hovered.
- **Design reference:** [`Hover, select, and the way out.dc.html`](https://claude.ai/design/p/727b5b14-fe78-47c1-9d9c-fb84b6ce5280)
  — the hover ground disc (radius 12, `--surface-sunken`), the plate's five
  reserved lines, and the four band spellings (scored / unscored /
  landmark-no-band / idle).
- **Greyscale check**: the hover state's channels (ground value step, the
  plate's own text) must survive `grayscale(1)` — confirm against the
  canvas page's own greyscale specimens.
- Unit tests for the repaired hit-test geometry (pure function, no DOM, no
  canvas) at the four recorded fit scales and across the zoom range.
- A browser spec: hover a known node, assert the plate's four facts
  (grounded against an independently-fetched `GET /securities` for
  ticker/name/sector, and an authored `serveFeed`/`sendOverview` frame for
  the band — reusing Story 6.3's `overview-market-topology-anomaly-bands.spec.ts`
  mechanism rather than inventing a second one); hover a sector ETF and a
  proxy and assert no band line; hover nothing and assert the idle
  instruction; assert the plate's reserved height is constant across all of
  these at 390 and 1440.

## Done when

1. `nodeAt()`'s targetable radius is derived in screen pixels from the
   node's own drawn ink at every fit scale and zoom, measured with
   `pnpm probe`, not argued.
2. Hovering any of the 516 nodes shows the correct ticker/name/sector/band
   (or stated absence) in the reserved plate, sourced from the builders
   named above with no second copy of any fact.
3. The fifteen landmark nodes draw no band line; an `unscored` equity draws
   "Not scored yet"; nothing hovered draws the idle instruction.
4. The plate's height is identical across all states at all four widths —
   measured, not assumed.
5. Hover causes no React re-render of `MarketTopology` (asserted on the
   producer, per this repository's own rule that the wire cannot see a
   defect in the producer).
6. A browser spec drives the pointer and asserts the plate's content
   against independently-sourced ground truth.
