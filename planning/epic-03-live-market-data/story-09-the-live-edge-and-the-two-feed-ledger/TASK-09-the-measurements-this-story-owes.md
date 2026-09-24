# Task 3.9.9 — The measurements this story owes

**Status:** Not started
**Story:** [3.9 The Live Edge on the Chart & the Two-Feed Ledger](STORY.md)
**Depends on:** 3.9.5, 3.9.6 (3.9.4 deleted 2026-09-24)

## Inherited from Task 3.9.3 — 2026-09-24

**Task 3.9.4 is deleted and its one real obligation is yours**: `pnpm probe` at
all four viewports with the feed running, which this task already owns. Nothing
was drawn, so there is no treatment to photograph — what the probe is looking at
is a chart extending with no vocabulary on it.

**And one figure is already taken**, so do not re-derive it: an arriving minute
buys **0.4 px** at the default five-session window, **2.1 px** on a single
session, and **14.1 px** on a 57-bar answer, with **0.00 px** of horizontal
movement in every existing point. A new extreme re-scales the value axis and
moves every point vertically — median **2.4 px**, largest **4.9 px** at the
default window. Those are geometry rather than cost; §28's _routine_ line is
still unmeasured and still yours.

## Objective

Criteria 6 and 8. **A chart that extends is `PRODUCT_SPEC.md` §28's word
_routine_ in its purest form**, and Task 3.6.5 paid for learning what that costs:
the universe table re-rendered 518 rows once a minute for ever and crossed 50 ms
on three frames in seven on a production build, while the cold load — once per
visit — was allowed to stand.

## What the user can see when this lands

**Nothing new, and ideally nothing different.** The output is figures and,
if anything breaches, a repair.

## What to measure, and the traps in each

**The per-burst cost, at the default window and at the cap.** `CHARTING.md`'s
own figures are the baseline: one element per bar at the **9,750-bar cap** is
9,790 plot elements and main-thread tasks of **137–254 ms**, and none at the
default window. A redraw that rebuilds the whole path every minute inherits the
first number, not the second.

- **Measure on a production build.** A development build's figures are a
  different product.
- **The instrument is a `long-animation-frame` observer naming the invoker**,
  which is what let Task 3.6.5 attribute a breach to the health poll rather than
  to the feed. It is in that task.
- **The lever is render work rather than data work** — memo boundaries so a
  burst touches only what changed. The table's first two are the precedent.
- **A figure that has moved looks exactly like a figure that was mis-recorded.**
  Only rebuilding the old commit tells them apart.

**`pnpm probe` at all four viewports with the market open** — 1440, 1024, 768, 390. Criterion 8, and it is a different thing from a browser assertion: it is
where a tolerance's number comes from, and this repository's record says five
times over that a defect found by a person opening the page was invisible to
everything mechanical.

**And the rehearsal, which is the half no instrument can take.** Criterion 8
also says _a person watched the chart extend during a live session before the
suite ran_. That needs the deployed site with the market open, and
`LIVE-REHEARSAL.md` is where the row goes. Three stories are already waiting on
that window (`docs/GAPS.md` entry 10 — the free plan holds **one** Alpaca
connection and the deployment has it), so take this story's items in the same
sitting and say so in the ledger rather than spending the scarce thing twice.
`scripts/session-watch.mjs` exists and takes five of the combined items
unattended.

## Work

- Per-burst cost at the default window and at the cap, on a production build,
  attributed from both ends
- Any breach repaired here rather than handed on, unless it is Epic 14's by the
  standing trigger — in which case say so in writing
- `pnpm probe` at four viewports with the feed running
- The `LIVE-REHEARSAL.md` row, or the recorded reason there is none
- Every figure written where a later reader will find it, with its date

## Done when

1. No **routine** main-thread task over 50 ms while the chart extends, measured
   at both densities, or a breach with a named owner and a written argument
2. Four viewports probed with the market open
3. The rehearsal row is written, or its absence is explained
