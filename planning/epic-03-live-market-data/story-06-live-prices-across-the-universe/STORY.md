# Story 3.6 — Live Prices Across the Tracked Universe

**Status:** Not started
**Epic:** [Epic 3 — Live Market Data](../EPIC.md)
**Depends on:** 3.4, 3.5
**Epic scope covered:** live price updates in the UI, at the size the product is for

## Description

The `/securities` table has shown a **last stored close and its change** since
Task 2.9.7, which was the first real price this product ever displayed. This
story makes those 518 numbers current.

It is the story where the epic's outcome becomes literally true — _tracked
securities update automatically as live market observations arrive_ — and it is
the first surface in the product where the live feed's scale is visible rather
than described.

## What the user can see when this story lands

**A market**, on `/securities`: 518 rows whose prices and changes move on their
own, in Story 3.4's vocabulary, with the session's own arithmetic under them —
a change measured from the **previous session's close** rather than from
whatever the page happened to load with.

What the user still cannot do: see today's session on a chart (Story 3.7),
reload and still see today (Story 3.9), or be told properly what they are
looking at when the feed stops (Story 3.10).

## Why it sits here in the sequence

**After the vocabulary and after the model**, because it is the first surface
that needs both, and before the chart because it is the cheaper of the two hard
surfaces. A table row is one number changing in a fixed box; a chart's live edge
changes the shape of a drawing.

## Scope

- **The table's prices, live**, and the change beside them re-derived rather
  than left stale — a live price beside a stale change is worse than two stale
  numbers, because one of them looks current.
- **The known performance exception this story sits directly on top of, and the
  trigger it may fire.** `PRODUCT_SPEC.md` §28 is amended with a measured
  breach the product knowingly carries: **every cold load of `/securities` and
  `/securities/:symbol` spends one main-thread task of 50–76 ms, and it is the
  518-row universe table rather than the chart.** It is owned by Epic 14 by
  name, with its figures and three candidate repairs. **Its reversal trigger is
  a condition and it outranks the epic**: _the first time a second surface on
  that page renders per-row markup at universe scale._ This story does not add a
  second surface — but it does make the existing one **re-render on a live
  feed**, which is the same cost paid repeatedly rather than once. If the
  measurement says so, the repair is due here rather than in Epic 14, and that
  is a decision to take with the figures rather than with a preference.
- **Per-row updates without per-row work.** The naive wiring — one subscription
  per row — is 518 subscriptions and 518 re-renders a minute, and the
  counterfactual for exactly this choice has already been produced once in this
  repository: `useMarketClock` placed in `AppHeader` gives **0** whole-route
  re-renders in 20 s where placing it in `App` gives **40**.
- **What a row does when its security has not traded.** On IEX an absent bar is
  **ordinary** — median minute coverage **82.8%**, worst case **43.1%** — so a
  row that shows nothing is the common case rather than an error, and _no
  observation yet this minute_ must not read as _no data_.
- **The expand-all path**, which is the same component and has its own measured
  cost: **69–87 ms in a production build**, and it is named beside the cold-load
  breach as probably the same repair.
- **Sorting and ordering under live data.** A table that re-sorts itself as
  prices move is unusable; a table that never re-sorts is stale in a different
  way. Decide it, and say so.

## Out of scope, and who owns it

- The chart — Story 3.7
- Gainers, losers, breadth, sector performance and anything aggregated across
  the universe — **Epic 4**, which is what this story's data makes possible and
  must not be pre-empted by
- Anomaly scores, which is what the `AnomalyBadge` component is already waiting
  for — Epic 5
- Anything about persistence — Story 3.9

## Open decisions — settle with the user

1. **Whether every row is live, or only the visible ones.** Virtualisation or a
   viewport-scoped subscription is a real answer and it is also a behaviour
   change: a row scrolled past stops updating and then jumps when it returns.
2. **Whether the table re-sorts under live data**, per above.

## The design bar

**This is the screen where _does it feel alive_ is either proved or lost**, and
the risk is the opposite of the usual one: 518 rows each flashing on their own
schedule is not alive, it is noise, and it is the single most likely way this
epic produces something that looks worse than what it replaced.

The vocabulary from Story 3.4 was settled on **one** number for exactly this
reason, and applying it 518 times is a different design act from applying it
once. Expect to need a rule this story adds rather than inherits: something
about density, or about how much of the table may be moving at once.

**And the standing rules do not bend here.** No accent on a datum, ever — that
includes a highlighted row and a featured ticker. Colour is never the sole
encoding. A number must not get harder to read because it is moving.

## Acceptance criteria

1. Prices and changes on `/securities` update without a page refresh while the
   market is open, from the live feed rather than from a poll
2. The change is computed against the previous session's close and is correct
   across the boundary where a live price crosses it
3. A security with no observation this minute is visibly different from a
   security with no data, and neither reads as an error
4. **§28 re-measured on this page with the feed running** — the cold-load task,
   the steady-state task and the frame cost — against the three dated readings
   already recorded, and Epic 14's trigger explicitly evaluated rather than
   assumed not to have fired
5. Event → application state under **250 ms p95**, excluding provider latency,
   measured at universe scale rather than for one row
6. A browser test covers a live update landing in the table. **CI's store is 518
   securities and zero bars and CI has no upstream socket**, so this assertion is
   about a _fixture_ stream or it is about nothing — `pnpm store:bare` answers
   locally in seconds what a six-minute CI round trip otherwise answers
7. `pnpm probe` at all four viewports, and a person looked at the page during a
   live session before the suite ran
8. `pnpm verify` passes

## What this story hands forward

A live market on screen, the data Epic 4's overview aggregates, and a
re-measurement of the one §28 breach this product carries.

---

## Handed here by Task 3.1.4 — 2026-09-17

**The table has roughly 320 of 518 rows moving in any given minute, and about
200 sitting still** ([`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) §7.6). Measured: 321 symbols
p50 per minute, 65.1% median per-symbol coverage across the session, every one
of the 518 producing a bar at some point, worst case `ERIE` at 2.1%. **That is a
product problem with a product answer, not a bug** — a row that has not moved
for eleven minutes must read as a fact rather than as a fault.

**It is worse than this epic was sized against.** `ALPACA.md` §5.2's 82.8%
median came from stored history; the live stream is 65.1%.

**Two decisions taken on 2026-09-17 reach this story's rows** (§7.11):
extended-hours bars are **rendered and marked**, so this table's cells inherit
Story 3.4's mark outside 09:30–16:00; and the product **subscribes
`updatedBars`**, so a cell's value can be corrected about thirty seconds after
it appeared.
