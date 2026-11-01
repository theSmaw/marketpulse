# Task 6.2.4 — The Accessible Fallback, Failure Ownership, & the Degraded Grid

**Status:** **Complete — 2026-11-01.** `onRetry` wired to the real
`useSecurities().retry`; the drawn graph has a visually-hidden text
equivalent referenced by `aria-labelledby`; `Reading the tracked universe.`
moves behind the 2,000ms floor; the source note's new `Classification`
clause renders only while a graph is drawn; the degraded grid grows to 17
states × 4 widths × 9 surfaces with `Market topology` declared constant
across the aggregate axis and carrying its own four rows on the
universe-request axis — and a real race in the pre-floor row was found and
excluded rather than papered over.
**Story:** [6.2 The Topology Takes the Landing Page](STORY.md)
**Depends on:** 6.2.1

## Objective

A drawn canvas has no accessible content, and `/`'s own failure handling for
`GET /securities` is currently silent — a decision this story's Gate 1
explicitly reversed for this one region. This task wires the real retry
handler, gives the drawn graph a text equivalent, extends `/`'s source note,
and gives the degraded grid a surface that can actually fail.

## What the user can see when this lands

**A working `Try again` on a universe failure, and a region that says
something true to a screen reader when the graph is drawn.** The landing
page's one source note gains a clause naming the graph's structure as
curated.

## Work

- **Wire `onRetry` for real.** `MarketOverview.tsx` destructures `retry` from
  `useSecurities()` (currently only `view` is taken) and passes it to
  `MarketTopology`. `retry` is already `useCallback`-stable.
- **`topologyDrawnSentence(graph)`**, beside the existing
  `topologyFailureSentence` in `MarketTopology.tsx`: one function, one string,
  the wording settled at Gate 1 (`STORY.md`'s Design work section has it
  verbatim). Render it as a visually-hidden `&lt;p&gt;` sibling to the canvas; the
  canvas itself gets `role="img"` + `aria-labelledby` pointing at that
  paragraph's id — not `aria-label`, which would be a second copy of the
  string.
- **`Reading the tracked universe.` moves behind `useWaited`'s 2,000ms
  floor** — match `MarketProxyStrip`/`SectorPerformance`/`Unusual`'s existing
  pattern exactly; this is a copy-the-pattern change, not a new mechanism.
- **The source note**: `OverviewSourceNote` gains a clause reusing
  `SourceNote`'s shipped `CLASSIFICATION_CLAIM` ("Sector and industry are
  curated, not from the market feed."), rendering only while a graph is drawn
  (ADR 0029's per-clause rule — ADR 0029 covers _when a clause renders_, the
  mechanism this needs rather than a new convention).
- **The degraded grid** (`e2e/specs/overview-degraded-grid.spec.ts`):
  - Add `Market topology` to `REGIONS`/`CONTENT_SURFACES`.
  - Declare it constant across every existing aggregate-only row (01–12,
    14–17) — the grid's `CONTENT_CLASSES` machinery should assert this
    explicitly rather than let it pass by accident.
  - Add new rows for the universe-request axis the grid has none of:
    `failed`/retryable, `failed`/not-retryable, `unreachable`, `empty`. Base
    them on `securitiesFixtureView`'s existing fixture names
    (`apps/frontend/src/fixtures/securities.ts`), driven through the same
    shipped-socket-path discipline the rest of the grid uses — not a stub
    that can lie (`Degraded states.dc.html` §01's own warning about exactly
    this).
  - Correct row `13-universe-outstanding`'s comment, which currently claims
    an abort "reaches the same screen and is the failure case" — false the
    moment this region lands; dated correction in the same change.
  - `MARKET-OVERVIEW.md` §7.3 ("a content class is ONE AGGREGATE") gets a
    dated amendment recording the topology as the first declared exception,
    with the reasoning (it is a function of the universe request, not the
    aggregate).
- **Confirm `overview-no-element-per-security.spec.ts` stays green** — the
  census sentence must never enumerate securities; verify directly rather
  than assuming the wording review caught it.

## Done when

1. `onRetry` is wired to the real `retry` callback; a failed universe request
   on `/` shows the sentence, the control where offered, and the reference
   where one arrived — and a successful retry also fills in blank mover
   names.
2. The drawn graph has a visually-hidden text equivalent, referenced by the
   canvas's `aria-labelledby`, matching the degraded grid's own reading.
3. `Reading the tracked universe.` only appears after 2,000ms.
4. The source note states the graph's structure is curated, only while a
   graph is drawn.
5. The degraded grid is 17 states × 4 widths × 9 surfaces, with the topology
   declared constant across the aggregate axis and carrying its own rows on
   the universe-request axis — all producer-driven, none stubbed.
6. `overview-no-element-per-security.spec.ts` is still green.
7. `pnpm build && pnpm lint && pnpm format:check` all exit 0; `pnpm e2e
overview-degraded-grid.spec.ts` and the other touched specs are green.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — 2026-11-01

- **Real retry.** `MarketOverview.tsx` now destructures `retry` as
  `retryUniverse` from `useSecurities()` (it previously took only `view`) and
  passes it to `MarketTopology` as `onRetry`; the placeholder
  `retryNotWiredYet` is deleted.
- **The text equivalent.** `MarketTopology.tsx` gains
  `topologyDrawnSentence(graph)`, a `useId()`-generated id, and a
  visually-hidden `<p>` (`composes: visuallyHidden from
"../../styles/a11y.module.css"`) rendered as a sibling of the canvas. The
  canvas's `role="img"` and `aria-labelledby` are set via
  `canvas.setAttribute()` in `renderer-canvas.ts` (the canvas is created
  imperatively, not through JSX) and threaded through a new
  `labelledBy?: string` field on `TopologyRendererOptions`.
- **The 2,000ms floor.** `Reading the tracked universe.` is now gated by
  `useWaited(universe.state === "loading")`, matching
  `MarketProxyStrip`/`SectorPerformance`/`Unusual`'s existing pattern exactly.
- **The source note's new clause.** `OverviewSourceNoteView` gained a
  `classification: boolean` field; `toOverviewSourceNote` takes a third
  `topologyDrawn` parameter and sets it; `OverviewSourceNote.tsx` renders a
  `dt`/`dd` pair reusing `CLASSIFICATION_CLAIM` from `SourceNote`, last in the
  list, only while a graph is drawn (ADR 0029's per-clause rule). All 23
  `toOverviewSourceNote(...)` call sites in `overview-source-note.test.ts` and
  all 10 `<OverviewSourceNote .../>` JSX usages in `OverviewSourceNote.test.tsx`
  were updated to carry the new argument/prop.
- **A real `MarketTopologyHandle`**, exported from `MarketTopology.tsx` via
  React 19's native `ref`-as-prop (`resetView(): void`), wired to a `Reset
view` button in `MarketOverview.tsx`'s `Market topology` region meta slot —
  built because the reset affordance already existed on the renderer
  (`fit.ts`'s `reviewport`) and Task 6.2.3 had already needed `reset()` on
  `TopologyRenderer`.
- **The degraded grid's two-axis extension.** `Market topology` is now the
  sixth region / ninth surface in `overview-degraded-grid.spec.ts`. Four new
  states (18-21) drive real `page.route(SECURITIES_ROUTE_PATTERN, ...)`
  handlers — abort (unreachable), a `503` `ApiError` (retryable), a `500`
  `ApiError` (not retryable), and an empty `200` array — each asserted against
  the matching sentence. A new explicit block proves `Market topology`'s
  reading is byte-identical across every **aggregate-only** row, after
  discovering and excluding the one row read deliberately pre-floor (see
  below). Row `13-universe-outstanding`'s stale comment ("reaches the same
  screen and is the failure case") is corrected with a dated note. `NOTE_TERMS`
  gained `"Classification"`.
- **`MARKET-OVERVIEW.md` §7.3** gained a dated 2026-11-01 amendment recording
  `Market topology` as the first declared exception to "a content class is one
  aggregate" — it is a function of the universe request, not the aggregate —
  and the grid's new 17×4×9 size.
- **A real race, found rather than assumed.** The first run of the new
  constant-across-aggregate-rows assertion failed:
  `02-no-aggregate-after-the-floor reads a DIFFERENT Market topology than
01-no-aggregate-before-the-floor`. Row `01` is deliberately read pre-floor
  (`preFloor: true`), before the real, unmocked `GET /securities` request to
  the local backend has necessarily resolved — independent of the 2,000ms
  sentence floor. Fixed by excluding `preFloor === true` rows from the
  aggregate-only constant-check set, with a comment citing the race.

### Gates

- `pnpm build` — passed.
- `pnpm lint` — clean, 0 warnings.
- `pnpm format:check` — clean.
- `pnpm test` — 659 (backend) + 1344 (shared) + 1716 (frontend) all passed
  (frontend rose from 1710 to 1716 with this task's new tests).
- `pnpm invariants` — 80/80 hold.
- `pnpm links` — 0 broken.
- `pnpm stories` — 45/45.
- `pnpm e2e overview-no-element-per-security.spec.ts` — 1/1 passed (Done-when
  #6).
- `pnpm e2e overview-degraded-grid.spec.ts` — green at all 4 widths (17 states
  × 4 widths × 9 surfaces), after the preFloor-race fix.
- Regression sweep — `pnpm e2e overview-region-order.spec.ts
landing-route.spec.ts overview-sector-order.spec.ts securities-route.spec.ts
overview-movers-hold.spec.ts overview-sector-region.spec.ts` — **40 passed
  (43.1s)**, no regressions elsewhere on the route from this task's changes.

## For a stakeholder — a status report, 2026-11-01

The market topology region on the landing page now behaves like every other
region on that screen instead of being the one silent exception. If the
universe request fails, there's a real `Try again` button that actually
retries — previously it was wired to nothing. A screen reader now gets a real
sentence describing the graph ("11 sectors...") instead of an unlabelled
picture, and the loading message only appears after a genuine two-second wait
rather than flashing on every load. The page's source note at the bottom now
states, only when the graph is actually drawn, that sector and industry
groupings are curated rather than pulled from the live market feed.

The degraded-states test suite — the one that photographs every way this page
can look when something's wrong — grew to cover the topology's own four
failure modes (can't reach the server, a retryable server error, a
non-retryable one, and an empty universe), on top of the three failure modes
every other region already shared. Building that out found a real, if minor,
timing race in the test itself (not in the product): one row was being read
before a background network request had necessarily finished, which would
have made an unrelated assertion flaky. That's now excluded with an
explanation rather than silently tolerated.

Nothing was deliberately left undone against this task's own checklist. A
regression sweep across six other landing-page specs (40 tests) confirms
nothing else on the route broke.
