# Task 7.1.4 — The security-page UI

**Status:** Complete — 2026-11-16. A real `Investigate` control and
checklist ship on `/securities/NVDA`. The `pnpm probe` reading measured
the `Panel` `meta` slot growing 47→53 px with a control added, firing
Gate 1's own stated fallback — the control sits as a row in the
region's own body instead. A real CORS gap in Task 7.1.3's route (a
hijacked reply bypasses `@fastify/cors` too, not only the
correlation-id hook) was found and fixed in the same change, since
nothing short of a real browser could have found it.
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

---

## What was done — 2026-11-16

- **Design work**: `pnpm probe /securities/NVDA --within "Abnormal-move
indicators"` measured the region's header at **47px at all four
  widths**, with its content line (`--line-height-subheading`, 22px)
  shorter than `Button size="small"`'s own height
  (`--control-height-sm`, 28px). Adding the control to `Panel`'s `meta`
  slot would grow the header to ~53px — exactly the condition Gate 1's
  own fallback names — so the control ships as a row at the top of the
  region's own body instead, owned by the new component rather than by
  `Panel`'s header. A new canvas page, `The investigation checklist
.dc.html`, records this measurement and the three glyph states.
- **`apps/frontend/src/investigations/`** (new module): `investigation
-event.ts` (`readInvestigationEvent`, a frontend-local `WireInvestigation
Event` type — deliberately not shared with the backend's own domain
  type, which carries `Date`s rather than wire strings — and the
  `event`/`unreadable`/`unsupported` three-member decode result
  `market-stream-protocol.ts`'s `DecodedMessage` already established);
  `investigation-stream.ts` (`fetch` + `ReadableStream`, a real second
  `fetch` call site beside `api-client.ts`, for the one transport that
  is not an ordinary JSON request); `investigation-checklist-state.ts`
  (the pure reducer, `optimisticChecklist`/`applyInvestigationEvent`/
  `withConnectionLost`); `use-investigation.ts` (the hook: the
  client-optimistic paint, the second-press guard, subject-pinning, and
  the 160ms cover-threshold timer that gates both the live region's
  "started" announcement and the checklist's breathing ground); `index
.ts` (the barrel, `market/index.ts`'s own pattern).
- **`apps/frontend/src/components/InvestigationChecklist/`** (new):
  `queued` = `Marker shape="dashed"`, `running` = `Marker shape="ring"`
  (+ a breathing row-ground past 160ms, `--motion-duration-pulse`, no
  new token), `completed` = the new `Icon name="check"`. The control
  (`Button size="small" variant="secondary"`) is always visible; only
  the checklist beneath it is conditional on a press. A persistent
  `role="status"`, scoped to this component, never unmounted.
- **`Icon.tsx`**: a seventh member, `check` — argued in writing against
  `Marker`'s own `disc` (already spent by the security-identity arrival
  mark) rather than defaulted to.
- **`Button.tsx`**: the loading-state reversal trigger evaluated and
  declined, in writing — it technically fires (the checklist's result
  does not replace what triggered it), and is declined on the clause
  the original paragraph left unstated: a spinner here would carry
  strictly less information than the checklist already does.
- **`SecurityExplorer.tsx`**: wires `useInvestigation(symbol)` into the
  new control/checklist, rendered as `Abnormal-move indicators`'s
  sibling (inside the same `Region`, above it) — `AbnormalMove.tsx`
  itself is untouched.
- **`e2e/specs/security-investigate.spec.ts`** (new): three tests
  against the REAL route (not a furnished frame, unlike the region's
  neighbours) — a press reaches a real, measured duration; a second
  press while one is showing adds no second row; the region stays a tab
  stop with the checklist present.

### A real backend defect found and fixed, that only a browser could find

`reply.hijack()` (Task 7.1.3) takes the SSE reply out of Fastify's whole
hook pipeline, which Task 7.1.3's own record already knew for the
correlation-id header and for `@fastify/compress` — and had NOT
connected to `@fastify/cors`, which attaches through the identical
mechanism. A real browser's `fetch()` to the events route failed with
`TypeError: Failed to fetch` while `curl` against the identical request
got a clean `200` — `cors.ts`'s own opening measurement, reproduced on
this route. Fixed by writing both CORS headers onto the hijacked
response by hand, the same way the correlation id already is; a test
now asserts them directly (`routes/investigations.test.ts`), since
`app.inject()` — which never enforces the policy a header only states —
could not have caught this and did not, across two tasks.

### Two sweep corrections taken in the same change

Per `CLAUDE.md`'s own rule that a falsified claim is corrected the same
day: `api-client.ts`'s docblock ("the only file... that calls fetch")
and `CLAUDE.md`'s own repo map line are both amended to name
`investigation-stream.ts` as a second, deliberate call site, with the
reasoning carried rather than just the correction.

### One invariant violation found and fixed before it ever reached `main`

`no-imputed-zero-in-a-figure` failed on `step.durationMs ?? 0` in the
live region's completion sentence. A completed step always carries a
real duration by construction, so the `?? 0` was exactly the false
impression the invariant exists to catch; replaced with a thrown guard
naming the actual invariant this module depends on (`STEP_COMPLETED`
always sets one).

### Gates

`pnpm --filter @marketpulse/backend typecheck`/`lint` clean.
`pnpm --filter @marketpulse/frontend typecheck`/`lint` clean.
`pnpm --filter @marketpulse/backend test` — 1,412 passed.
`pnpm --filter @marketpulse/frontend test` — **2,001 passed** (73 new,
across `investigation-event.test.ts`, `investigation-stream.test.ts`,
`investigation-checklist-state.test.ts`, `use-investigation.test.ts`,
`InvestigationChecklist.test.tsx`, plus the `SecurityExplorer.test.tsx`
fix for the page's now-four `role="status"` regions). `pnpm stories` —
49 components, 49 stories files. Full `pnpm verify` — green: **86
invariants hold**, `packages/shared` 734, `apps/backend` 1,412,
`apps/frontend` 2,001, `scripts/*.test.mjs` 21, `test:process` 63.
`pnpm e2e overview-degraded-grid.spec.ts security-abnormal-move.spec.ts
security-explorer-shell.spec.ts security-investigate.spec.ts` — **18
passed**, confirming no regression against the existing nine-state ×
four-width degraded grid and the new route working end to end in a
real browser. Hand-verified in a real Chrome tab: pressing `Investigate`
against the real dev backend produced a check glyph, "Measure move" and
a real measured duration (`1 ms`), with the control unchanged in place.

### What is NOT separately verified

Done-when 9's contrast/legibility check between the breathing ground
and `ChartPending`'s own identical-period loop was not taken side by
side with both actually looping at once — the two states are hard to
produce simultaneously on one screen without a slow network throttle.
Both read the same `--motion-duration-pulse` token, which is what makes
them synchronised rather than a coincidence; a dedicated visual check is
left as the honest gap rather than claimed.

## For a stakeholder — a status report, 2026-11-16

Story 7.1's one visible change: the security page now has a real
`Investigate` control, and pressing it runs a real, deterministic
investigation against this product's own live-data store — the whole
pipe Epic 7 exists to prove, end to end, on screen. A reader presses
the button, sees a row appear immediately, watches it complete with a
real measured duration, and can press it again for a fresh run.
Everything underneath — the domain model, the tool, the orchestrator,
the HTTP transport — was built and verified in the three tasks before
this one; this task is where it became something a person can actually
see and use. A real cross-origin bug was found and fixed before any
real user could hit it, which is exactly what building the frontend
against the real backend (rather than a mock) is for.
