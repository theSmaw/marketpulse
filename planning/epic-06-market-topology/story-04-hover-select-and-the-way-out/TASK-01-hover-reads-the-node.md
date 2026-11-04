# Task 6.4.1 — Hover reads the node

**Status:** Complete — 2026-11-04. Repaired a real, pre-existing hit-test unit
mismatch (`nodeAt()` compared layout units against a screen-pixel mark —
narrower than the visible node at every width, not only 390); hover is
renderer-internal and never reaches React state; the readout plate is real,
reserved, grounded DOM.
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

## What was done

- **`apps/frontend/src/topology/hit-test.ts` (new)** — `topologyTargetRadius`
  and `topologyNodeAt`, pure, no DOM and no canvas.
  `renderer-canvas.ts`'s `nodeAt` now delegates to it and the layout-unit
  comparison is gone. `topologyNodeAt` is generic in the candidate so the
  renderer's own `DrawableNode` comes back whole.
- **`renderer.ts`** — `TopologyHoverTarget` (the node **with** the treatment
  the renderer already holds) and a `TopologyRendererOptions.onHover`
  callback.
- **`renderer-canvas.ts`** — `let hovered` beside `bands`/`dragging`, a
  guarded `setHovered` that reports only on a change, a hover ground disc
  (radius 12, `--surface-sunken`) drawn first in the frame, hover tracked
  through a drag, cleared on `pointerleave`, and re-reported from `setBands`
  so a plate cannot disagree with a ring that has just been redrawn.
- **`palette.ts`** — `hoverGround`, from `--surface-sunken`.
- **`MarketTopology.tsx` / `.module.css`** — the readout plate: a real DOM
  element, sibling to the canvas, five reserved line slots, filled
  imperatively through a module-level writer, with `topologyReadoutLines`
  exported as the pure vocabulary.
- **Tests** — `hit-test.test.ts` (14), a hover/vocabulary block in
  `MarketTopology.test.tsx` (+11), and
  `e2e/specs/overview-market-topology-hover.spec.ts` (3).

## What was found

- **The measurement.** `pnpm probe / --within "Market topology"`, 2026-11-04:
  `.content` is **998×413, 570×413, 686×413, 308×413** at 1440/1024/768/390,
  which `fitView` resolves at fit scales **0.4477, 0.3032, 0.3649, 0.1639**
  over the recorded 518-security universe (`spanX 1879.72`, `spanY 922.58`).
  The shipped 8-world-unit threshold was therefore **3.581 / 2.426 / 2.920 /
  1.311 px** of hit radius against a **4 px** drawn ink radius — smaller than
  the visible mark at _every_ width, not only at 390. The repaired radius is
  `(ink/2 + 4) · clampNodeScale(zoom)` and is **identical at all four**,
  because both sides are now screen-space.
- **The repair is visible in a count.** The browser spec's sweep discovers
  **515 of 518 nodes at 1440** and 234 at 390 (crowding: at a fit scale of
  0.1639 many equities share pixels, which is pre-existing node density and
  not a hit-test fault).
- **The plate measures 288×98 at all four widths**, `grid` rows
  `16 16 16 16 16`, and the browser spec holds the height constant across six
  states at 1440 and 390.
- **The second name slot is empty today.** The longest name in the universe,
  `Cognizant Technology Solutions Corporation Class A` (50 characters), fits
  **one** line of the plate's 270 px — found by photographing it at 4×, after
  a comment here had claimed it wrapped. The slot is kept (a longer name
  consumes it rather than pushing the sector and band out of a fixed box) and
  reads on screen as a gap between the identity and the classification.
- **The idle instruction named a keyboard route that did not exist yet, and a
  review before this was committed caught it rather than letting it ship.**
  `Point at a security, or press Tab and the arrow keys` is the design
  canvas's and this task's own wording, implemented verbatim on the first
  pass — flagged honestly in the implementing developer's own docblock
  rather than silently reworded, but still a false sentence on screen for
  the length of Tasks 6.4.2–6.4.3, which is exactly the claim-about-a-
  mechanism rule this repository's own `CLAUDE.md` is about. **Corrected
  before merge**: the shipped idle string is `Point at a security to see
what it is.`, naming only what is true today; Task 6.4.3 (which wires
  arrow-key traversal) widens it once the keyboard route is real, per the
  docblock left on `TOPOLOGY_READOUT_IDLE`.

## Review and what it found

A second developer instance reviewed the diff against this task's own
"Done when" list before anything was committed. Verdict: **ready**, with one
required fix (the idle string above) and three non-blocking notes, all
addressed in the same change rather than deferred:

1. **A stale plate after a `ctrl`/`⌘`-wheel zoom or a resize.** The
   implementation already re-hit-tested during a drag ("a pan moves the
   market under a stationary pointer"), but the identical reasoning applies
   to a zoom or a reflow and neither re-tested. Fixed: `lastHoverClientX`/`Y`
   now track the pointer unconditionally (not only while dragging), and a
   shared `rehover()` re-tests them against the current view from `measure()`
   (resize) and `onWheel` (zoom), cleared to `NaN` on `pointerleave` so there
   is nothing to re-test once the pointer has actually left.
2. **`TOPOLOGY_NODE_TARGET_ANNULUS` mixes a layout-unit constant
   (`TOPOLOGY_NODE_FOOTPRINT`) with a CSS-pixel one
   (`TOPOLOGY_NODE_INK.equity`)** and is only numerically coherent because the
   two share a unit at zoom 1 by this renderer's own convention — the same
   coincidence `ANOMALY_RING_OFFSET` (Task 6.3.2) already rests on. Not
   restructured (consistent with that precedent), but the docblock now says
   so explicitly, including that a future footprint change for the layout's
   own reason (re-spacing the graph) would silently move this screen-space
   target too.
3. **The greyscale check was argued, not recorded.** `palette.ts`'s own
   docblock argues `--surface-sunken` is a pure lightness step with no hue,
   which is sound reasoning; nothing recorded actually looking at the hover
   disc under `grayscale(1)`. Noted here rather than re-opened — the
   argument is the same one this product's `--anomaly-normal` chip and the
   price palette's own 1.04:1 figure already rely on, and the design canvas
   page carries greyscale specimens for the next story to photograph against
   if a doubt ever needs settling with a picture rather than a hex code.
4. **The no-React-re-render proof (Done-when 5) is producer-side rather than
   a render counter** — `MarketTopology.test.tsx` drives `onHover` outside
   `act()` and asserts the DOM updated synchronously with the mount count
   still 1 and no `console.error` (which an act warning would reach). Genuine
   evidence, not strengthened further here: a future change routing hover
   through a parent callback into state would not necessarily trip it, and
   is worth a harder assertion if that shape is ever proposed.

### Gates

Run after the review's fix was applied, on `story-6-4-task-1`:

- `pnpm typecheck` — clean.
- `pnpm lint` — clean (`--max-warnings 0`).
- `pnpm format --check` — clean (one pass needed Prettier's own rewrap of the
  new comments; re-run clean after).
- `pnpm --filter @marketpulse/frontend test` — **1752 passed**, no
  `Unhandled Errors` block.
- `pnpm test` (all four packages) — **667 + 1344 + 1752 passed**.
- `pnpm e2e overview-market-topology-hover.spec.ts overview-market-topology.spec.ts overview-market-topology-anomaly-bands.spec.ts`
  — **7 passed (11.8s)**, against the already-running dev pair.
- `pnpm e2e overview-degraded-grid.spec.ts` — **4 passed (1.9m)**, confirming
  the new DOM plate does not move this region's entry in the degraded grid's
  own text comparison.
- `pnpm verify` — **one flaky failure, re-run and cleared**:
  `src/market-gateway.process.test.ts`'s `leaves a HEALTHY client on the same
process untouched` (Task 3.5.7's own WebSocket-dropping test, unrelated to
  this task's files) failed once at a machine load of 7.84–8.24 on 8 cores,
  then passed cleanly on an immediate re-run of the same suite (60/60) and
  again on a full second `pnpm verify` (exit 0, `80 invariants hold.`).
  Per this repository's own rule — read the load before the run, and a
  settled-machine re-run is the control — this is attributed to contention
  rather than a regression; no file this task touches is anywhere near the
  market-stream gateway's process-level socket handling.
- `pnpm test:database` — not run; no data-layer change in this task.

## For a stakeholder — a status report, 2026-11-04

Point at any of the 516 nodes in `Market topology` on `/` and a plate at the
foot of the region now says what it is — ticker, company name, sector, and
whether it's unusual today — in the same words `Unusual activity`'s own list
already uses. Move off, and the plate says "Point at a security to see what
it is." Nothing resizes when it appears or disappears; the room is always
there.

Along the way this task found and fixed a real, pre-existing bug: the
invisible "clickable area" around each node had drifted out of step with
the visible dot as the screen got narrower, so at the narrowest width tested
a reader's pointer had to land inside roughly a third of the dot's own size
to register at all. That bug had no visible symptom before today (it only
mis-set the mouse cursor), but it would have made the wrong security appear
in the plate — and, from Task 6.4.2 onward, would have opened the wrong
security's page. It's fixed and measured at all four screen widths, not
guessed.

A second developer reviewed the work before anything was merged and caught
one real issue: the idle instruction had been written to mention keyboard
keys that don't do anything yet (that's two tasks away). It's been
corrected to say only what's true today, with a note for whoever builds the
keyboard task to widen it then.

Nothing a reader can select or leave the page from yet — that's the next two
tasks. `pnpm verify` is green.
