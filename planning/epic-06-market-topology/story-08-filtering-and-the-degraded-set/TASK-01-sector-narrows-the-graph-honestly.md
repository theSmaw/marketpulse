# Task 6.8.1 — Sector narrows the graph, honestly

**Status:** Not started
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

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->
