# Task 4.8.8 — Epic 14's trigger: the verdict, and the second condition

**Status:** Not started
**Story:** [4.8 The Overview at Universe Scale](STORY.md)
**Depends on:** 4.8.2, 4.8.3, 4.8.4, 4.8.6

## Objective

**A trigger evaluated three times without firing, on a page it cannot see.**
The fork is this story's by plan, and the owner took it at Gate 1: **keep the
wording, add a second condition for `/`.**

## What the user can see when this lands

**Nothing.** It is a decision written down, in every place that quotes it.

## Work

### The verdict, and why not a re-wording

The trigger is _"the first time a second surface on this page renders per-row
markup at universe scale."_ **On `/` there is no first surface at universe
scale at all** — four proxies, eleven sectors, twenty movers — so the trigger
as worded cannot fire on the landing page until something there renders 518 of
anything, while the real cost on `/` is a **computation** over 518.

**A reversal trigger is only worth anything if it is answerable WITHOUT taking
a measurement.** The existing one is arithmetic: count the surfaces on
`/securities` rendering one element per row; is it two? The moment it names a
_computation_, answering it requires knowing whether that computation is
expensive — and Epic 14's own file already shows this happening. Its 2026-10-07
clause _"a second universe-scale per-tick computation is added to the same
callback"_ was **met on 2026-10-08** by Story 4.5 and then declared not to have
fired **on the strength of a figure** (0.28–0.41 ms). **That is a figure
wearing a condition's clothes**, and re-wording the main trigger would import
that defect into the one trigger in this repository with a clean three-for-three
record.

### The second condition, two clauses, each answerable by reading the tree

> **A. The first surface on `/` that renders one element per tracked security.**
>
> **B. The first time the overview aggregate is produced on any path other than
> the observations publish — that is, at a cadence the bar feed does not set.**

Clause A mirrors the existing trigger onto the other page and keeps one lever
(DOM size). It is already written as the reversal trigger of Story 4.5's own
verdict, so adopting it costs nothing retroactively.

**Clause B is the one that earns its place, because the check already exists
and is break-verified.** `the-overview-frame-is-not-a-heartbeat` allows exactly
one `type: "overview"` encode site and refuses the word on the feed path — and
**the feed path is ~332 frames a minute against the observations path's ~16.**
At the feed cadence the same join would be **332 × ~3.9 ms ≈ 1.29 s of script a
minute inside the socket callback**, from ~64 ms today. That is the breach, and
it is a routing change away. A condition resting on a mechanism owes something
mechanical that fails when the mechanism goes; here it is free.

**Reversal trigger for this decision itself:** _the first evaluation of either
clause that has to be settled with a stopwatch rather than by reading the
tree_ — at which point the clause has become a budget and belongs in
`PRODUCT_SPEC.md` §28's exception list instead of in a trigger.

### The sweep is thirteen live files, not five, and the count was verified

`grep -rl "per-row markup at universe scale"` returns **19 files, 29
occurrences** — **13 live**, 6 historical task records. The live set:
`CLAUDE.md`, `PRODUCT_SPEC.md` §28's amendment, `planning/EPICS.md`, Epic 14's
`EPIC.md`, Epic 2's, Epic 3's, **Epic 5's `EPIC.md` TWICE**,
`docs/GAPS.md`, `SEARCH-AND-SELECTION.md` ×2, `CHARTING.md`,
`VOLUME-AND-WINDOW.md`, and this story's own file.

**Epic 5 is the one that matters most and nobody had named it**: the trigger was
written **about** Epic 5 (_"Epic 5's anomaly score per security is the obvious
candidate"_), and Epic 5 is the epic most likely to fire **both** new clauses —
an anomaly score per security on `/` is clause A; a score recomputed per tick is
clause B. **So the constraint goes into Epic 5's own `EPIC.md` in words it can
act on, never as a link back.**

### Also amend, because leaving it standing arms something that is not armed

Epic 14's 2026-10-07 clause needs a dated note saying it was **met and declined
on a figure**.

## Done when

1. The verdict and both clauses recorded in **Epic 14's own file**, dated,
   beside the existing trigger rather than replacing it
2. The 2026-10-07 clause amended to say it was met and declined, with the figure
3. Every live quoting site swept, the count recorded, and the historical ones
   left standing
4. Epic 5's `EPIC.md` carries the constraint in words that epic can act on
5. The decision carries its alternatives and a condition-shaped reversal trigger

## Handed here by Task 4.8.3 — 2026-10-09

**Two things for the verdict, and the first changes how clause B's arithmetic
should be read.**

**1. Clause B's _"~1.29 s of script a minute"_ was computed from a tight-loop
figure.** Task 4.8.3 measured the producer at **3.73 ms** in a tight loop and
**12.97–15.43 ms** when called once every 250 ms or more — and a fixed-cost
control loop with no ICU, no allocation and no strings inflated by the **same
factor** (×3.3 against ×3.5–3.8), so the cause is this machine waking from idle
rather than the computation. Two consequences for a verdict. The **relative**
figures every clause rests on are safe: 4.4.4's 3.497 ms, 4.5.4's 0.28–0.41 ms
marginal and 4.8.3's 3.72 ms are all tight-loop figures taken against
tight-loop controls. The **absolute** ones are not a measurement of production
cost on any machine, and whether a deployed Container App on a shared vCPU
behaves this way is **unknown and unmeasurable from a laptop** — which is
itself a finding a §28 verdict has to carry, because §28's line is an absolute
50 ms.

**2. A second, cheaper candidate with a one-line repair.** The join runs with
**zero clients attached** — `publishObservations` evaluates `overviewMessage()`
as an argument to `broadcast`, before the client map is consulted — at
**3.708 ms** p50 (n = 300, cached-overview control 0.013 ms, so all of it is the
join). On a deployment with nobody looking that is **25 ms of script a minute at
the 6.8-batch midday floor and 60 ms at the close**, for an aggregate sent to
nobody, against §9.1's idle-rate condition. The guard is the same
`clients.size > 0` test the keepalive already makes twelve lines below. It is a
behaviour change on the socket callback's own path and 4.8.3 deliberately did
not take it.

## Handed here by Task 4.8.4 — 2026-10-09: the browser side of clause B, measured

**Your clause B is _the first time the aggregate is produced at a cadence the
bar feed does not set_, and the arithmetic behind it was a tight-loop backend
figure.** Here is the browser half of the same question, driven at both ends of
the feed's measured range.

| cadence         | the batch's own main-thread work on `/` | a minute  |
| --------------- | --------------------------------------- | --------- |
| 6.8/min, midday | **5.1 ms** a batch                      | **35 ms** |
| 16.1/min, close | **3.7 ms** a batch                      | **60 ms** |

Net of a quiet control arm driven at the same cadence, production build,
`longtask` entries **0** in seven arms out of seven, worst rAF gap
**17.7–17.8 ms** against a 16.7 ms quantum — **no dropped frame anywhere**.
§28's word is **task** and the largest single task measured is **4.5 ms**, so
the landing page clears the routine 50 ms line by a factor of twenty.

**Two things that should change the shape of your verdict.**

1. **The browser leg is not gap-inflated and the backend leg is.** Task
   4.8.3's finding 6 — the same computation reading 3.72 ms tight and
   12.97–15.43 ms at a gap, with a fixed-cost control moving by the same factor
   — is a property of a **Node process waking from idle**. Sampled in a visible
   Chromium renderer at gaps of 3.7 s and 8.8 s, the identical calibrator reads
   **×1.00**, five arms out of five. So clause B's _"~1.29 s of script a
   minute"_ arithmetic is a **backend** worry with a real multiplier on it, and
   the browser figure beside it needs no multiplier at all. Two different
   uncertainties, and a verdict that treats them as one will be wrong about one
   of them.
2. **A mover substitution costs the browser +2.7 ms and +2 commits**, measured
   at 16.1 substitutions a minute — **38× the measured membership rate of
   0.21–0.45 a minute** — and still produced zero long tasks. The gateway pays
   3.72 ms a substitution (4.8.3); the browser pays 2.7. At the real rate that
   is **0.6–1.2 ms a minute** on each side.

## Handed here by Task 4.8.5 — 2026-10-09: clause B as Gate 1 worded it would fire on something accepted in writing since Story 1.12

**Two corrections to the condition you are about to publish, both measured.**

**1. Clause B must name _the overview aggregate_, not _a whole-tree render at a
cadence the bar feed does not set_.** One such cadence **already exists and is
accepted in writing**: `App`'s 30 s `/health` poll re-renders the route, and
Task 4.8.5 measured it rebuilding both chart plots **twice in 45 seconds with
nothing arriving at all**. A clause worded against _a cadence the bar feed does
not set_ is therefore **already true**, which makes it a condition that cannot
fire because it has never been false.

**2. Do NOT add the chart's rebuild to the trigger.** It is **12% of the render
task at 1,950 bars and 27% at 6,630** — and a clause resting on that is
**a figure wearing a condition's clothes**, which is the exact defect this
task's own brief identifies in Epic 14's 2026-10-07 clause. The densest chart
this product can draw is 8,190 bars (§19), ≈4.4 ms at the measured scaling,
**still a quarter of the task**. Task 4.8.5's own trigger is a **ratio** for
this reason — _the first measurement in which the two builders are more than
half the render task containing them_ — and it is deliberately not Epic 14's.

## Handed here by Task 4.8.6 — 2026-10-09: `/` is not in breach, `/securities` still is, and the channel the trigger's own re-measure names can no longer see it

**Three things for the verdict, all from 40 interleaved cold loads on one
session, with two 20-row control arms.**

**1. The landing page clears §28's line on a cold load, and the figure to quote
is a frame rather than a task.** `/` produced **no `longtask` entry over 50 ms
in 10 of 10 loads** and **one** long animation frame in ten loads — 50.9 ms,
script 25.2, render 20.0 — with a worst rAF gap of **p50 24.7 / p95 34.7 ms**
(18.6–34.7). `/securities`, interleaved with it on the same artefact and store,
produced a long animation frame on **10 of 10** loads — **62.8–77.4 ms** — and a
worst rAF gap of **p50 66.7 / p95 68.5**, over 50 on every load. So the verdict
can say that the cold load of the page this story is about is **not** Epic 14
entry 1, and say it with a control rather than by assertion.

**2. The attribution says clause A's lever is the right lever and names its
price in advance.** With `GET /securities` trimmed to twenty rows, `/` draws the
**same 447 nodes** and its worst frame collapses to the one-frame floor
(18.6–18.7 ms), while `/securities` collapses from 66.7 to 18.8. So: **the
518-security payload both routes fetch costs ≈6 ms; the 518-row markup only one
of them draws costs ≈48 ms**, and the long frame's own split agrees from inside
— script **26–31 ms on `/securities` against 25 ms on `/`**, with the whole
difference in **style, layout and paint, 34–38 ms over 9,871 extra nodes
(10,318 against 447), ≈3.9 µs a node**. **Clause A — _the first surface on `/`
that renders one element per tracked security_ — therefore has a measured price
attached to it before it fires: about 48 ms of frame on a cold load, by
arithmetic on this page's own numbers rather than by analogy with the table.**

**3. A caveat the verdict must carry about the trigger's own re-measure.** Epic
14 entry 1's `Re-measure:` line names
`PerformanceObserver({ entryTypes: ["longtask"] })` and an rAF-gap recorder.
Run verbatim today, **the `longtask` half reports nothing at all on
`/securities`** — 0 of 10 loads, where 2026-09-22 read 50–56 ms on 7 of 10 —
because the work is no longer a single task over the line; it is a 63–77 ms
frame whose largest task is not. The breach is unchanged and the instrument
that found it has gone blind, which is a thing a §28 verdict should say in as
many words: **a channel going quiet and a cost going away produce the same
output**. The zero is a zero — a 120 ms plant was caught by **both** channels on
**all 40** loads, after each measurement window, on the page that produced the
figure.

## Handed here by Task 4.8.7 — 2026-10-09: the candidate shrank by 62%, and Epic 14's own premise about it was false

**Every figure the verdict rests on for the join has moved, because the
candidate was repaired rather than deferred.** `marketDateAt` read the market
formatter's parts **three times per answer and used one** — `wallClockParts`
for the clock, then `marketOffsetAt` reading them again plus the offset
formatter's own parts, with the offset then discarded. Instrumented at **1,554
`formatToParts` calls for 518 conversions**. One parts read now:

| over 518 instants, tight loop, n = 398 of 400 after 300 warm-up | p50          | p95   |
| --------------------------------------------------------------- | ------------ | ----- |
| `marketDateAt` as shipped before 2026-10-09                     | **3.366 ms** | 3.425 |
| `marketDateAt` after                                            | **1.288 ms** | 1.356 |
| `marketWallClockAt` before (three parts reads)                  | 3.365 ms     | 3.423 |
| `marketWallClockAt` after (two)                                 | 2.176 ms     | 2.263 |

Calibrator reference 1.025 / 1.053 ms either side of the change, band 1.6×,
2 / 400 discarded — so the two columns were taken on the same machine.

**Four things for the verdict.**

**1. Clause B's arithmetic needs re-doing against 1.29 ms, not 3.4.** Task
4.4.4's attribution was _3.4 of the 3.5 ms a batch is 518 `marketDateAt`
calls_. Two thirds of that term is gone, so the join should now cost ~1.4 ms a
batch tight. **Re-measure it rather than subtracting**: nothing in this task
re-ran `join-cost.mjs`, and the join's other terms were measured with the dear
version of this function underneath them.

**2. Epic 14's stated premise about this path was false and now carries a dated
amendment.** `epic-14-performance-scale-validation/EPIC.md` said the path
_"constructs one `Intl.DateTimeFormat` per entry per batch"_. It constructs
**2 for the life of the process** — the formatters are memoised in module-level
`let`s — instrumented by patching the constructor over 2,590 calls. The cost
was never construction; it was the discarded parts reads. The amendment is in
place; a verdict quoting that sentence should quote the amendment.

**3. The minute-keyed cache is still Epic 14's candidate and is still
declined.** The owner declined it at Gate 1 (module-level mutable state in the
one module this repository appoints by lint rule as a pure conversion seam).
What changed is its **value**: it was worth 3.4 ms a batch and is now worth
1.29, against the same architectural cost.

**4. The absolute-figure caveat from 4.8.3 is unchanged and applies to the
table above.** Both columns are tight-loop figures; at a 250 ms gap the same
before/after pair reads 8.99 ms and 3.82 ms, with the calibrator itself
inflating 3.7×. The **ratio** is gap-invariant (2.70× tight, 2.69× gapped) and
the absolutes are not a production cost.

**And one instrument artefact worth inheriting**: at a non-zero gap, the
**first** arm sampled after the sleep absorbs the wake cost, which reads as
that arm being dearer. Measured: unrotated, the before-arm read 8.989 ms and
the control 10.096 ms in the same burst at gap 250; rotating the arm order per
burst removed it. A/B/A/B per burst is not enough on its own — rotate.
