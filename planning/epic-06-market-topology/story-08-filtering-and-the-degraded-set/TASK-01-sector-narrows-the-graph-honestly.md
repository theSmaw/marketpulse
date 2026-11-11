# Task 6.8.1 — Sector narrows the graph, honestly

**Status:** Complete — 2026-11-11
**Story:** [6.8 Filtering, & the Degraded Set](STORY.md)
**Depends on:** nothing (first task)

## Objective

The topology draws all 516 nodes, always. A reader who wants to look at one
sector has no way to narrow the picture, and `PRODUCT_SPEC.md`'s own filtering
scope item for this epic has never been built. This task ships the first,
simpler axis — sector — end to end: a control, a URL, a population sentence,
and a renderer that hides what is excluded without ever re-laying out the
graph or losing the reader's pan, zoom or selection.

## What the user can see when this lands

A control beside the topology lets a reader narrow the graph to one sector.
Picking one redraws the graph to that sector's equities (the eleven sector
ETFs and the four proxies and the hub stay visible, visibly muted where their
own sector is excluded), states `N of 501 companies we track — <Sector>`, and
is shareable: the address carries the filter, so a reload or a shared link
reproduces the same narrowed picture. Clearing it returns the whole market.

## Work

- **The filter control.** Lives in the region's own chrome (not the canvas, not
  the plate) — exact placement and its behaviour at 390 (where the existing
  legend is already hidden for want of room) is for the implementing developer
  and designer to settle with `pnpm probe`'s real numbers, not assumed from the
  shaping reports' own competing suggestions. Twelve values (`All sectors` plus
  eleven), accessible name `Sector`, never "Filter by sector," never "Showing."
- **The URL.** One query param, `?sector=<slug>`, using the `Sector` type's own
  slug (`SECTOR_LABELS` keys in `packages/shared/src/security.ts`), never the
  display label. A sibling of `use-time-window.ts`: one reader, one builder,
  living beside the feature rather than in `routes/paths.ts`. An unrecognized
  slug in the address draws the **whole market** and says so in the population
  sentence — never a silent snap, never zero nodes from an unparseable
  address. Resolve the `one-home-for-imperative-navigation` question the
  shaping pass raised: controls are `<Link>`s resolved at render from the
  computed path, not an imperative `setSearchParams` call, so the invariant
  holds by construction rather than by a gap in what it greps for.
- **The population sentence.** One builder, read off the graph
  (`graph.nodes.filter(kind === "equity").length`, never a literal — this
  repository's own `the-population-is-never-a-literal` rule), passed to both
  of `MarketTopology`'s existing sentence writers (the JSX structural sentence
  and the imperative batch writer) exactly the way `correlationClause` already
  is, so a live update cannot silently drop the filter clause. No-match state
  (a filter yielding zero equities) states the criterion and the population it
  was applied to, with a visible way back (`Show all`).
- **The renderer.** `setFilter(criteria)` on `MarketTopologyHandle`/
  `TopologyRenderer`, in its own effect (the `bands` prop's own shape), never
  in the mount effect's deps. The filter narrows the **graph object** itself
  (not a predicate threaded separately through `walk.ts`, `hit-test.ts` and the
  draw loop), so the keyboard walk, the pointer hit-test and the renderer agree
  by construction. `buildTopologyLayout` keeps running over the whole 516-node
  universe on every call; placements are looked up by symbol from the
  unfiltered layout. The viewport never re-fits to the filtered subset.
- **Hide vs. de-emphasize.** An excluded equity draws no ink, is not
  hit-testable, and is skipped by the keyboard walk. The fifteen landmarks and
  the hub are never excluded from the drawn set; one whose own sector is
  filtered out draws a new, visibly distinct, de-emphasized treatment —
  designer's call, and it must survive `grayscale(1)` on a channel that is
  not alpha, and must not read as the existing `unscored` treatment.
- **Selection handling.** If the currently-selected node is excluded by a new
  filter, the selection clears with its own new sentence in the existing
  `role="status"` region (`"<TICKER> is not in this filter, so the selection
was cleared."` — never the generic wording a plain `Escape` uses), and the
  existing dropped-focus recovery (`anchorHeldFocus` / `activeElement ===
document.body`) is verified against this new trigger rather than assumed to
  cover it.
- **No re-mount.** `framesDrawn()` (already exposed for Story 6.7's own
  measurement) proves a filter press does not reset the frame counter the way
  a genuine re-mount would; a pan applied before a filter press must survive
  it.
- **New invariant**: `the-topology-layout-is-built-from-the-whole-universe` —
  exactly one call site of `buildTopologyLayout` under
  `apps/frontend/src/topology/`, in `graph-source.ts`, with no
  `.filter(`/narrowing between the full `securities` array and that call. New
  `pnpm break` entry planting the defect the next author would actually write
  (filtering `securities` before building the graph), confirmed to pass
  wrongly first.
- **AC3's rewrite verified**: a filter press neither re-mounts the renderer nor
  resets pan, zoom or selection, and makes no network request (so ADR 0028's
  cover is recorded as unreachable by construction, not built).

## Done when

1. A reader can narrow the graph to one sector by pointer and by keyboard, see
   the population sentence update, and return to the whole market.
2. `/?sector=<slug>` loads directly into the filtered state; an unrecognized
   slug loads the whole market and says so.
3. A pan applied before a filter press survives the press; `framesDrawn()`
   does not reset.
4. A filter excluding the current selection clears it with its own
   announcement; keyboard focus does not drop to `<body>`.
5. The new invariant and its break are in place, proved red-then-green.
6. Unit, component and e2e tests cover the scenarios above; `pnpm probe` at all
   four widths records the control's real footprint, with no silent width
   where the capability disappears.

## What was done, and what was decided where this file left it open

### The shape, in six files

- **`apps/frontend/src/topology/filter.ts`** — the criterion, the path builder,
  the narrowing and the words, all pure. `walk.ts`' and `hit-test.ts`' own
  reason for being modules of their own: jsdom has no 2d context, so the
  renderer is unreachable below `pnpm e2e`, and _which securities are drawn_ is
  arithmetic whose every individual answer looks plausible.
- **`apps/frontend/src/topology/use-topology-filter.ts`** — the one reader,
  `use-time-window.ts`' sibling. It is under `topology/` rather than in
  `routes/` because it serves exactly one region, every other part of which
  already lives in that module.
- **`apps/frontend/src/components/SectorFilter/`** — the control.
- **`renderer-canvas.ts`** — `setFilter`, a mount-time `sector` option, and the
  partitions.
- **`MarketTopology.tsx`** — the `filter` prop, its own effect, the note, and
  the clause threaded through both sentence writers.
- **`MarketOverview.tsx`** — the reader, the control in the region's chrome,
  and a meta wrapper that wraps.

### The decisions this file left open

1. **The control is a disclosure — a `Button` naming the current value, and a
   panel of twelve `<Link>`s** — not a segmented control (eleven sector names
   are ~900 px of type against a 308 px header at 390) and not a `<select>`
   (whose `onChange` would be the imperative navigation
   `one-home-for-imperative-navigation` exists to refuse). It closes four
   ways: a press on a destination, `Escape`, focus leaving, and a pointer
   press outside. `role="menu"` was refused — these are destinations, and a
   list of links is what a screen reader already knows how to read.
2. **Placement: the region's `meta` slot, first, with the legend between it
   and `Reset view`** — and the two measured consequences are in
   `TOPOLOGY.md` §8.4: the band legend is now hidden at `width <= 1024px`
   (where it measurably does not fit), and at 390 this region's meta wraps,
   costing 36 px of canvas and no page movement. The capability is present at
   all four widths, which is Done-when 6's own clause.
3. **`setFilter` is on `TopologyRenderer` and NOT on `MarketTopologyHandle`**,
   which is a departure from this file's own Work item and is argued rather
   than skipped. The brief's own precedent is the `bands` prop's shape, and
   `setBands`' docblock draws the line: a handle method exists because
   applying a live batch is governed by a stateful policy the ROUTE owns. A
   filter is the opposite in every respect — it is state a parent holds and
   re-passes, the parent holds it in the URL, and there is no policy. A handle
   method would be a second home for a fact whose one home is deliberately the
   address, and it would make a shared link and a press two code paths.
4. **The mount option `sector` exists besides the prop**, for the first frame:
   a cold `/?sector=energy` is an ordinary shared link, and an effect that
   applied the filter after paint would draw all 516 nodes and then remove 480
   of them. It is read from a ref synced by an effect declared _above_ the
   mount effect, so the mount effect's deps stay exactly
   `[topology, probe, sentenceId]`.
5. **A fourth `TopologySelectionSource`, `"filter"`** — the only one that is
   always a clearing, and the two things a caller does differently for it are
   why it is not folded into `"keyboard"`: the sentence names the security that
   went, and focus is left where the reader's hands are.

### What was found by looking, and would have shipped otherwise

Three, all invisible to every level below a browser, all in `TOPOLOGY.md` §8.5:
the trigger's accessible name was **`SectorAll sectors`** (a CSS margin is a
gap a listener does not get); the open panel's twelve names were
**right-aligned**, inherited from `Panel.meta`; and `Show all` ran straight on
from the sentence it follows. A fourth, found by `pnpm probe` rather than by
eye: the control squeezed the region's **title to 10 px over two lines** at
390 and 37 px at 1024.

### What went red, and what that proved

- `overview-market-topology-keyboard.spec.ts`' `tabToCanvas` asserted **2**
  stops before the canvas and is now **3** — the assertion doing exactly what
  its own docblock says it is for. The twelve destinations are not stops,
  because the panel is shut until it is pressed.
- `overview-market-topology-hover.spec.ts`' four exhaustive `regionControls`
  enumerations each gained one entry, for the same reason and with the same
  verdict: a surface whose every affordance is counted noticed a new one.

### The new invariant and its two breaks

`the-topology-layout-is-built-from-the-whole-universe` — three conjuncts: one
`buildTopologyLayout` call site under `apps/frontend/src/topology/`, in
`graph-source.ts`; that file passes `securities` by bare name; and it contains
no narrowing shape. Two break entries rather than one, because the first and
third clauses catch **different authors** — somebody editing the module that
owns the layout, and somebody editing the module that owns the filter with a
narrowed graph already in hand. `pnpm invariants` holds **85**.

### Measured

`pnpm probe / --within "Market topology"` at four widths, before and after the
chrome repair — the table is in `TOPOLOGY.md` §8.4. The pan clamp was measured
rather than assumed while writing the browser spec: a 120/60 drag takes the hub
off the canvas entirely, so the spec drags 40/20 and **searches** for the node
rather than predicting where it landed.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->
