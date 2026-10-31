# Task 6.2.4 — The Accessible Fallback, Failure Ownership, & the Degraded Grid

**Status:** Not started
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

## What was done — YYYY-MM-DD

## For a stakeholder — a status report, YYYY-MM-DD
