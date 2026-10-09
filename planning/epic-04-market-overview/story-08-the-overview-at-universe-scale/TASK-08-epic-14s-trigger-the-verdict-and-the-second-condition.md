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
