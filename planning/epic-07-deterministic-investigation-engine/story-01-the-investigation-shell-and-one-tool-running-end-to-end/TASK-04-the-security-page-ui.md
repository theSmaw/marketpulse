# Task 7.1.4 — The security-page UI

**Status:** Not started
**Story:** [7.1 The Investigation Shell, & One Tool Running End to End](STORY.md)
**Depends on:** 7.1.3

## Objective

The one visible change this story makes: a real `Investigate` control and
a live checklist, on the real security page, against the real route Task
7.1.3 built. Every layout, motion and accessibility decision here was
already shaped at this story's own Gate 1 — this task draws the canvas
page implied by those decisions and implements against it, rather than
re-deciding any of them.

## What the user can see when this lands

A real `Investigate` control in `Abnormal-move indicators`'s own header.
Pressing it immediately shows a one-line checklist beneath it (before any
server reply), which then moves from queued to running to complete with
its real duration, drawn from the real security snapshot tool.

## Work

- **Design work first**: `pnpm probe /securities/NVDA --within
"Abnormal-move"` for the region's current box at all four widths, then
  draw the canvas page covering the three glyph states
  (dashed/ring+breathing-ground/check), the control's placement in the
  region's `meta` slot (or, if a probed reading shows that slot's height
  changing with a control added, a control row at the top of the region
  body instead — Gate 1's own stated fallback), and the reserved duration
  column.
- **`apps/frontend/src/investigations/`**: the new feature module (§26's
  established pattern), with its own `index.ts` barrel and a matching
  `no-restricted-imports` block in `eslint.config.mjs`, mirroring
  `market/index.ts`'s own precedent. Holds the `fetch` + `ReadableStream`
  stream client (never `EventSource`), the SSE frame decoder
  (`readInvestigationEvent`, returning a decoded value with an
  `unsupported` member for an unknown type — never throwing), and the
  investigation-state reducer the checklist renders from.
- **`apps/frontend/src/components/InvestigationChecklist/`**: `.tsx` +
  `.module.css` + `.stories.tsx`. One new `Icon` member, `check`, added
  to the closed `ICON_NAMES` union with its own stated argument (§14's
  own example glyph). Queued = `Marker shape="dashed"`; running = static
  `Marker shape="ring"` plus a breathing row-ground only past 160 ms
  (`--motion-duration-pulse`, the existing ADR 0028 cover threshold —
  never a new number); complete = `Icon name="check"`. No glyph is a
  solid disc. The duration column is reserved (`8ch`-style fixed width)
  from first paint, filled with held room until a real duration lands.
- **The `Investigate` control**: `Button size="small" variant="secondary"`
  (never `primary` — zero existing consumers of that variant in this
  product, and spending the crimson accent here is disproportionate),
  placed per the design work's own final answer. Three states only
  (`idle`/`running`/`done`, never a fourth `pressed` state — that is
  `:active`, already owned by the token layer), with the **same label in
  every state**. `Button`'s own loading-state reversal trigger is
  evaluated here and explicitly **declined**, in writing, in `Button.tsx`
  itself — the checklist beneath it is the real answer to "is something
  happening?"
- **The live region**: one new, persistent, visually-hidden `role="status"`
  scoped to the checklist container only (never the whole region) — never
  unmounted once rendered, matching `BarSeriesPanel`/`ChartReading`/
  `MarketTopology`'s own established shape for this. Speaks once on
  completion below the 160 ms threshold, twice (started, then complete)
  above it.
- **The dropped-stream sentence**: if the stream ends with no terminal
  event received, the checklist renders `Connection lost — investigation
state unknown` in the same row the last known step occupied, and the
  live region speaks it once.
- **The second-press guard, client-side mirror**: pressing `Investigate`
  while a checklist for this security is already showing a non-terminal
  state does nothing (the backend's own idempotent `POST` already makes
  this safe even if the guard is somehow bypassed — belt and suspenders,
  not the primary mechanism).
- **The subject-pinning rule**: the checklist renders only when the
  page's current symbol matches the investigation's own `subjectSymbols`
  — if a reader changes the ticker in the search field, the old
  investigation's checklist does not follow the new page.

## Done when

1. `pnpm probe`'s own reading informs the final control placement, and
   the region's box at all four widths is re-measured with the control
   and an empty (post-completion) checklist state present, with no
   regression against the existing nine-state × four-width degraded grid.
2. The checklist is invisible before any press, in every state this
   security page can be in.
3. Pressing `Investigate` paints a `queued` row within the same frame
   (client-optimistic), before any network response — measured, not
   assumed.
4. The glyph sequence (dashed → ring[+ground if >160ms] → check) renders
   correctly from real events, asserted at the component level against
   decoded event fixtures and at the browser level against the real
   route.
5. Colour carries no part of the encoding — confirmed by a greyscale
   simulation showing all three states remain distinguishable.
6. The live region speaks exactly once for a sub-160ms run and exactly
   twice for a longer one, asserted against the two thresholds with a
   controlled fixture.
7. A dropped stream (simulated by closing the connection mid-run in a
   test) renders the named sentence and speaks it once; it does not
   throw and does not blank the page.
8. `Investigate`'s own label is identical across idle/running/done, and
   its loading-state reversal-trigger evaluation is recorded in
   `Button.tsx` as declined, with the reasoning.
9. No new live region, button state or glyph collides with an existing
   one on the same page — specifically: no solid-disc glyph anywhere in
   this component, and the running state's breathing ground is
   confirmed (by a contrast/legibility check, browser-only) not to read
   as flickering beside `ChartPending`'s own identical-period loop
   elsewhere on the page.
10. `pnpm stories` passes (the new component has its states file);
    `pnpm test` and `pnpm e2e` (scoped to this component/route) pass.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->
