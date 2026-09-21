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

---

## Handed here by Task 3.1.7 — 2026-09-17, and this story meets the empty cell first

**518 rows is where _we have no price for this_ stops being a theoretical state.**
[`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) §10.3: the backend's current-state object comes back
**legitimately empty after every restart** and refills unevenly — within a minute
for a liquid name, possibly hours for `ERIE` at 2.1% coverage (§7.6). **Every
deploy produces an empty table, and the thin tail of the universe stays empty for
a long time afterwards.**

**That state is none of `live`, `stale` or `disconnected`** — the feed is
healthy, the connection is up, nothing is wrong, and there is no price. Task
3.1.8's decision 5 owns whether it gets a word of its own or is rendered as an
absence; **this story is the surface that will show 518 of them at once**, so
whatever that decision produces has to work at that scale rather than in a
single cell.

**A reader that renders absence as an error will render errors constantly.**
That is §10.3's rule and it is the same shape §7.2 established for a quiet
minute: a bar that does not exist produces **no frame at all**, not a zero.

**And the rows tick once a minute, not continuously** (§10.1) — about **332 bars
landing inside a 243 ms burst**, once a minute (§7.4). The difficulty in this
story is **render cost rather than payload**: the whole universe is 38 kB/min
(§9.5), which is nothing, and the burst is the thing to design against.

---

## The two thresholds are on two different clocks — delivered 2026-09-18 by Task 3.2.6

**A constraint this story consumes, written here rather than left in
[`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) §11.2, because a pointer is what a reader follows when they
already know to look.**

| Threshold                  | What it measures                            | Clock                                                                                                                                                       |
| -------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **165 s** — `disconnected` | Elapsed time since _any_ frame arrived      | **Monotonic** (`performance.now()`). It must not move when the machine sleeps or NTP corrects the clock, or a suspended laptop manufactures a disconnection |
| **60 s** — `stale`         | How old an **observation's own instant** is | **Wall clock** (`Date.now()`). An instant carried on a bar only has meaning against a calendar                                                              |

**Using one clock for both is not a simplification, it is a silent failure.** A
monotonic reading is near zero and an epoch millisecond is about `1.76e12`, so
the subtraction is hugely negative and the 60 s comparison **can never fire**:
the feed reports `live` or `disconnected` for ever and **never `stale`**, with
every test green. That shipped in Task 3.2.5 and was caught by 3.2.6's fixture
stream — the first implementation to generate an observation against a real
calendar while reporting a synthetic monotonic clock.

**`FeedStatusInputs` already carries both** (`now` and `wallNow`) and the
compiler names every call site that forgets one. **Anything in this story that
computes a status or an age takes both rather than reading either.**

---

## Handed here by Task 3.4.4 — 2026-09-21: the motion vocabulary is decided, and its one open cost is yours

**Story 3.4 settled what a changing price does, on one number, and you inherit
it.** The decision is on the design canvas — `The motion vocabulary.dc.html` §05
— and the short version is:

> **A small disc appears beside the figure and decays.** It fires **when a bar
> arrives**, not when the price changes — so it does not say _this price moved_,
> which the `▲` already says. It says **a bar arrived for this security**.

**That is a claim about the feed rather than about the price**, and it is the
only thing on the screen that makes it per security. It does not breach §11.2's
refusal to give a security a status word, because it makes **no threshold
judgement**: it marks an event that happened and says nothing about what silence
means.

### The cost this story has to act on rather than rediscover

**It fires once a minute for every security it is applied to, for ever** —
through a completely flat afternoon, with nothing to report. That was put as an
objection when the decision was taken and was overruled deliberately, **on one
number**.

**You have 518.** The same rule on the universe table is **up to 518 marks a
minute on one page**, and _calm_ and _twitching_ may not survive that
multiplication. Three things follow, and none of them is "decide it differently":

- **The vocabulary is not yours to re-take.** A vocabulary is one decision and
  three surfaces would make it three; Stories 3.6 and 3.7 inherit it. What is
  open is **whether it applies unchanged at universe scale**, which is a
  different question from what the mark means.
- **The reversal trigger is already written and one half of it is aimed at
  you**: _the first time a reader reports the mark as noise, or the first
  surface where it fires more than once a second._ At 518 rows a minute that is
  **8.6 marks a second** across the page. Read that as the trigger having fired
  unless you can show it has not.
- **If it needs a rule at scale, the rule is yours and it belongs on the
  canvas**, beside the decision it qualifies — not in a component. Candidates
  worth having on the table before you start: mark only rows in the viewport,
  mark only rows whose value changed, or mark nothing per row and let the
  chrome's connection word carry it.

**And the shape rule travels with it**: work in progress **loops**, a state
**persists**, a fact arriving **decays**. That is what lets this mark and the
status bar's disc be the same glyph without colliding, and a fourth behaviour
added to that set is a change to the vocabulary rather than to a component.
