# Task 3.6.5 — §28's cold load, `Expand all`, and Epic 14's trigger evaluated rather than assumed

**Status:** Not started
**Story:** [3.6 Live Prices Across the Tracked Universe](STORY.md)
**Depends on:** 3.6.2, 3.6.3

## Objective

Criterion 4: **§28 re-measured on this page with the feed running** — the cold
load, the steady state and the frame cost — **against the three dated readings
already recorded**, with Epic 14's trigger **explicitly evaluated rather than
assumed not to have fired**.

## What the user can see when this lands

**Nothing**, unless the trigger fired — in which case a page that was spending
one main-thread task of 50–76 ms on every cold load stops doing so, and the
`Expand all` control stops costing 69–87 ms.

## The breach this story sits directly on top of

`PRODUCT_SPEC.md` §28 is **amended with a measured breach the product knowingly
carries**, and it is this page:

| What                                                 | Figure                 | When                               |
| ---------------------------------------------------- | ---------------------- | ---------------------------------- |
| Cold load of `/securities` and `/securities/:symbol` | **50–76 ms**, one task | 2026-09-12, 2026-09-13, 2026-09-15 |
| `Expand all` on this table, production build         | **69–87 ms**           | 2026-09-11                         |

**It is the 518-row universe table rather than the chart**, attributed from both
ends each time. It is owned by **Epic 14** by name, with its figures and three
candidate repairs.

## The trigger, and why this task cannot wave at it

> **The first time a second surface on that page renders per-row markup at
> universe scale.**

It is **a condition rather than an epic number, and it outranks the epic** — if
it fires, the repair is due **here** rather than in Epic 14.

**The story's own reading before the work started** was that it does not fire:
this story adds no second surface, it makes the existing one **re-render on a
live feed**, which is the same cost paid repeatedly rather than once.

**That reading is now questionable and must be re-taken rather than inherited.**
Task 3.6.2 may have put **a mark on every row** — which is per-row markup at
universe scale, added by this story, on this page. Whether that is "a second
surface" is exactly the judgement the trigger exists to force, and **the answer
has to be given in this task, in writing, either way.**

## What to measure, and the traps in measuring it

- **Cold load**, against the three dated readings. A figure that has moved looks
  exactly like a figure that was mis-recorded — only rebuilding the old commit
  tells them apart.
- **Steady state with the feed running**, which none of the three readings
  covers, because there was no feed when they were taken.
- **The frame cost** — and Task 3.4.8's method: a `PerformanceObserver` on
  `longtask`, **unbuffered**. **Buffered returns the cold load**, which on this
  exact page is the 50–76 ms breach arriving inside a measurement about
  something else and reading as a regression this story caused.
- **A production build.** The virtualisation figures on
  `Universe navigation.dc.html` — 100, 66, 51, 44, 48 ms — are explicitly the
  **dev build**, unminified, with the profiler's thumb on the scale, and are a
  pessimistic bound rather than a reading.
- **`Expand all`**, which is the same component and named beside the cold-load
  breach as probably the same repair.

## Work

- The three figures, each with its method beside it, against a production build
- The trigger evaluated in writing, with the reasoning, whichever way it goes
- If it fired: the repair, here, and `PRODUCT_SPEC.md` §28's amendment and
  Epic 14's `EPIC.md` both updated — **falsification travels upward and nothing
  sweeps upward on its own**
- If it did not: say so with the figures, and leave Epic 14's ownership standing
  rather than silently re-taking it

## Done when

1. Cold load, steady state and frame cost measured on a production build with
   the feed running, each against what it is comparable to
2. Epic 14's trigger evaluated **in writing** with a verdict, not an assumption
3. Whatever the verdict implies is done, including the upward sweep if the
   figures falsify a published claim
4. `pnpm verify` passes
