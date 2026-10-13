# Story 5.2 — The Trailing Window, & the 5-Minute Return

**Status:** Not started
**Epic:** [Epic 5 — Anomaly Detection](../EPIC.md)
**Depends on:** 5.1
**Epic scope covered:** 5-minute return calculations

## Description

**This is the epic's one genuinely new structural component, and it exists
because of a decision Story 3.5 took on purpose.**

`currentMarketState` is **latest-only** — _"518 latest values, not 518 × 390
minute bars"_ — chosen as the cheap option because Story 3.8 makes the **store**
hold today's session. The consequence lands here: **a 5-minute return needs the
bar from five minutes ago and nothing in this process holds it.** Property 1 of
that hand-off says anything wanting a series _"assembles it from the store plus
what has arrived since"_, and this is the first computation in the product that
needs a **trailing window per security in memory**.

**And there is no 5-minute bar to ask for.** `TIMEFRAMES = ["1m", "1d"]`, and
`bar.ts` records Epic 5 computing them from stored minute bars as a decision
with two reasons: Epic 13's replay must reconstruct them from what was
**stored**, so a provider-side aggregate would be a second source of truth
replay could not use; and provider-side and our-side aggregation disagree at a
session boundary. **Adding a `5m` member is not the answer** — it reintroduces
exactly that second source of truth.

**Why this story ships a return and not a percentile.** The return is
computable from the window alone. The percentile needs the 60-day baseline,
which is Story 5.3's measured 4–13 minute problem — and separating them means
the window's correctness is established before anything depends on a figure
computed over it.

## What the user can see when this story lands

**`Abnormal-move indicators` draws its first figure.** For the selected
security: its **5-minute return**, the two instants it was measured between,
and **how much of the window was actually observed** — not a score, and no
band. A security the window cannot answer for says so in its own words.

## Acceptance criteria

1. A bounded per-security window of recent bars exists in the backend process,
   keyed on each bar's own `startsAt`, with its **depth, its eviction rule and
   its memory cost stated and measured** against `currentMarketState`'s 0.2 MB
   at universe scale.
2. **It never walks backwards and never imputes.** A revision for a minute
   already superseded is handled the way the live path handles it — discarded —
   and the window records what arrived rather than filling gaps. Measured
   context: **0.1062% of bars are revisions and 37.6% of those change the
   close.**
3. **Endpoint integrity is a refusal, not a stretch.** A 5-minute return is
   measured between two bars whose own `startsAt` are five minutes apart. If
   the earlier endpoint is absent the figure is **refused** — never substituted
   with the nearest available bar. `ERIE` at **2.1%** minute coverage would
   otherwise produce "the 5-minute return" between bars **47 minutes** apart,
   and the measured ordinary maximum gap is **187 minutes**.
4. **The drawn figure states how much of the window it saw** — _observed k of
   the 5 minutes_ — and the instant of the **oldest** endpoint, because that is
   the only thing distinguishing a 5-minute return from a 47-minute one. This
   is `EPIC.md`'s own instruction: _"how much of the window was actually
   observed belongs in it."_
5. **It dates the observation, never the computation.** This product has
   shipped the opposite defect and repaired it: the overview note drew
   `COMPUTED · Oct 9 · 21:42 EDT` under four-week-old closes, and that instant
   was when the page was opened. `the-overview-note-dates-an-observation` holds
   the repair; this figure owes the same rule.
6. **It says nothing about the feed.** The connection has one home, the status
   bar, and a quiet security is **an age rather than a verdict** — no
   threshold, because the 187-minute maximum is what any threshold would have
   had to spare. Held by `a-second-staleness-sentence` and
   `one-home-for-the-strip-staleness-sentence`.
7. The window is loaded or filled by a path that **does not put an `await` in
   the overview join's socket callback** — an unhandled rejection there is a
   crashed process. If a store read is involved it is cached, the way
   `last-closes-cache.ts` is, and the cache's recorded defect is not inherited:
   `loadedFor` records **what was asked for rather than what was read**.
8. The window's cost per applied batch is **measured on a production artefact
   with a calibrator**, and reported with both caveats stated separately: a
   **Node** figure at a gap is an upper bound and the calibrator **does not
   divide out** (subject 4.38× against calibrator 2.29×, a factor of ~1.9
   apart), while a **browser** figure reads ×1.00.

## Design work

One figure and one honest-absence sentence in a reserved region, in the column
Story 5.1 set the idiom for. The absence sentence is the fifth of its kind on
this product and must name its own region — four already read `No prices yet.` /
`No count yet.` / `No sector moves yet.` / `No moves to rank yet.`

## Out of scope

The baseline, the percentile, the volume factor, any band, any 0–100 figure,
and anything on `/`.
