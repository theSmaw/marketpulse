# Epic 14 — Performance & Scale Validation

**Status:** Not started
**Sequence:** 14 of 15 — follows Epic 13 (Market Replay)
**Spec references:** PRODUCT_SPEC.md §27 (high-performance rendering), §28 (performance targets)

## Goal

Demonstrate that the architecture can operate beyond the deliberately constrained live-data universe.

## Outcome

MarketPulse contains measurable evidence of frontend and streaming performance.

## Scope

- Synthetic-market generator
- 5,000+ synthetic securities
- 25,000+ graph relationships
- High-frequency update simulation
- Performance instrumentation
- Frame-rate measurement
- Main-thread task measurement
- Streaming-latency measurement
- Web Worker optimization where justified
- Bottleneck analysis
- Published benchmark results

## Exit criteria

Performance targets are reproducible and documented rather than claimed.

## Measured exceptions this epic inherits, with a named owner

**Handed here deliberately rather than rediscovered.** Both are the same
component — the 518-row tracked-universe table Story 2.11 built — and both are
almost certainly the same repair. `planning/EPICS.md` carries the same two
entries beside this epic's summary; this file is where a person starting the
epic will look.

**Neither is an amendment to `PRODUCT_SPEC.md` §28.** The target is right. These
are measured exceptions to it, with figures, and the work of closing them is
this epic's.

### 1. The cold load of `/securities` and `/securities/:symbol`

**Every cold load of the two most-visited routes spends a main-thread task of
50–76 ms, and it is the table rather than the chart.** Against §28's _no routine
main-thread task over 50 ms_.

Measured three times in real Chromium against the built artefact — 2026-09-12
(Task 2.12.9), 2026-09-13 (Task 2.13.9) and 2026-09-15 (Task 2.14.8) — and
attributed from both ends every time: **the task is present on `/securities`
where no chart exists at all, and absent with a 20-row universe while both plots
are still drawn**. It does not track the bar count; 9,750 bars, 1,950 and zero
produce the same figure.

The continuous instrument is what makes it more than a page marginally over a
line: the largest gap between consecutive `requestAnimationFrame` callbacks is
**20–33 ms on every 20-row page**, which is one to two frames and is the floor,
and **66–84 ms on every 518-row page**. The table costs roughly **35–50 ms of
frame** that a small universe does not spend, over a **10,385-node** document
against 848.

**And a fourth measurement, taken over a network against the deployed store on
2026-09-15 by Task 2.14.9, because none of the other three was.** The breach is
present and **softer**: **52–54 ms on two of six cold loads at 1440**, three per
route — the bottom of the 50–76 ms band, and **intermittent** where locally it is
every cold load. The plausible reading is that an internet round trip spreads the
same work across more frames; it is a reason the deployed number is softer, never
a reason to think the repair is less needed. **No timing assertion was added to
`specs-deployed/`**, deliberately — a duration measured from one machine over one
link cannot tell its own network from the environment.

- **The three candidate repairs, with what is wrong with each**, are in
  [`SEARCH-AND-SELECTION.md` §10](../epic-02-security-universe-historical-data/story-11-security-search-and-selection/SEARCH-AND-SELECTION.md):
  `content-visibility: auto` per band, collapsed bands below a row threshold, or
  virtualisation. The first changes column sizing and the jump control's measured
  offsets; the second reverses a product decision Task 2.11.8 took on its merits;
  the third is the honest fix and is an ADR with a dependency decision inside it.
- **The trigger is a condition and not this epic's number: the first time a
  second surface on this page renders per-row markup at universe scale.** Epic
  5's anomaly score per security is the obvious candidate, and two of these in
  one load is a delay nobody mistakes for a slow laptop. **If it fires before
  Epic 14, the repair is due then.**
- **Re-measure rather than cite.** Nothing below `pnpm e2e` can see this — jsdom
  computes no layout — and the browser suite cannot assert it either, because
  CI's store is 518 securities and zero bars and the figure there would be a
  duration on a shared runner. Load the built artefact in Chromium with
  `PerformanceObserver({ entryTypes: ["longtask"] })` and an rAF-gap recorder
  installed **before** navigation, ten cold loads, then repeat with the universe
  response trimmed to twenty rows. Check `document.visibilityState` first: a tab
  driven over CDP reports `hidden`, which pauses `requestAnimationFrame` and
  makes every figure here small, plausible and meaningless.

### 2. `Expand all` on the tracked universe

**69–87 ms** (12 → 530 rows), against the same target. Taken 2026-09-11 by Task
2.11.8 against a **production** build in Chromium, four runs; `Collapse all` is
17–44 ms and the dev build is 151–222 ms, which is why the production figures are
the ones that count.

The argument for accepting it at the time was that the work is neither **new**
(the same 518 rows are built on every first paint and always have been) nor
**routine** (a deliberate press, once), and that virtualisation was declined with
this measurement behind it rather than in ignorance of it. What this epic owes it
is **a re-take on the then-current universe and a decision**, not a
rediscovery — and the re-take should be taken together with entry 1, because the
"not new" half of that argument is entry 1.
