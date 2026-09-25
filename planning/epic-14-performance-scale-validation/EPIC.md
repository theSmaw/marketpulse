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

### Re-taken 2026-09-22 by Task 3.6.5, with the feed running — and the trigger answered in writing

**Both entries stand and stay here.** The same instruments, on a production
build at 1440, on the day the live feed was on the page:

| Entry                              | Before this task                       | After it                                      |
| ---------------------------------- | -------------------------------------- | --------------------------------------------- |
| 1. Cold load of `/securities`, ×10 | 56–83 ms on **8 of 10** loads          | **50–56 ms on 7 of 10**, none on 3            |
| 1. Cold load of `/securities/NVDA` | 52–58 ms on 6 of 6                     | not re-taken after; the repair is route-blind |
| 1. The 20-row control              | none on 5 of 6 (66 ms on first launch) | —                                             |
| 2. `Expand all`, ×5                | 80–88 ms (was 69–87 on 2026-09-11)     | **65–86 ms**                                  |

**What moved them is a fourth lever, taken there because it fell out of other
work and cost nothing visible:** `table-layout: fixed` from 1024 px up. The
`<col>` proportions already decided every width, so the automatic algorithm
was measuring 518 rows to confirm an answer it had been given. It is **not**
one of the three candidates and it does not close either entry — a mount is
still 530 rows built — so the candidates stand exactly as written. It was
photographed at four widths first: at 390 it crushed the columns, which is
why it is gated.

**The trigger, evaluated rather than assumed** — _the first time a second
surface on this page renders per-row markup at universe scale_ — **did not
fire as worded.** Story 3.6's arrival mark is per-row markup, but it is a child
of the price cell on the surface that already existed and was measured not to
cost. What fired instead was a condition this epic's entries do not cover:
**a routine task**, once a minute for ever, from the live feed re-rendering
every row — plus 40 ms every 30 s from the health poll re-rendering the route
with nothing changed. §28's word _routine_ put that ahead of these two, and
Task 3.6.5 repaired it in place with memo boundaries rather than with anything
here: the steady state now has no task over 50 ms on a production build with
every row changing. **The lever for these two entries is DOM size; the lever
for that one was render work.** They are different problems on one component,
and this table now carries two memo boundaries a virtualisation would have to
keep.

## Handed here by Story 3.7's close — 2026-09-23: a measured cost that belongs to the deploy rather than to a page

**The largest single latency figure anywhere in this product's read path is not
a query, and no instrument this epic owns can see it.** A migration on
`market_bars` takes an `ACCESS EXCLUSIVE` lock; Postgres queues later requests
behind a waiting exclusive one; and an ordinary chart read whose own lock
conflicts with nothing that was granted waited **16.16 s** behind a queued
migration in a rehearsal on the populated store, against a **0.09 s** baseline.
The migration itself waited 18.16 s, which was simply the length of the
transaction ahead of it.

It is a fact about a **lock queue**, so it does not appear in a query plan, a
long-task observer, or any p95 taken from a running pair — every instrument in
this epic would read the affected request as a slow one with no cause.
`docs/GAPS.md` carries the figures, the `lock_timeout` cure and why it was not
bought; `CLAUDE.md`'s _Data layer_ trap carries the rule.

**And the row size moved, slightly.** `0010` added 4 bytes to rows written after
2026-09-22 and none to the 48 million already stored — `BARS.md` §8.3's amendment
has the arithmetic. The figure still worth this epic's attention is the one that
was already there: `market_bars_pkey` at **1,029 MB with zero scans** (§8.5),
which is 25× the new column's annual cost.

> **Added 2026-09-24 by Story 3.8's close — that index is now NAMED as the
> funder of a decision that has already shipped, which changes what dropping it
> is.** Story 3.8 keeps **both tapes** for a minute the live feed and the
> nightly backfill both saw (ADR 0035), priced at **+69% rows a year**,
> **+6.1 GiB a year**, and headroom from ~2.6 years to **~1.5**. **Amended 2026-09-25 at Epic 3's close: the store was measured rather than projected — 13.62 GB at 41% of the provisioned disk, which is **~2.1 years** of headroom at today's rate, and the `~1.5` assumed a two-tape growth that has **no signal in the measurement yet**. The figures here are the projection they were; `HOSTING.md` carries the reading.** ADR 0035 names
> `market_bars_pkey` beside that price as where the space comes from.
>
> So this is no longer only _an index nobody reads_: it is the bill for a
> product decision that has been taken, and the reversal trigger on the
> decision — the storage alert firing before the predicted headroom — fires
> **sooner** if this epic does not spend it. What the drop needs is the ordinary
> care (a surrogate key a foreign key or an `ORDER BY` might rely on, and a
> non-concurrent build on this table does not fit `deploy.yml`'s 120 s, which is
> why `pnpm index:prepare` exists — `migrations/README.md` §9). Story 3.11 owes
> the measured rows-and-bytes of a real two-writer day; that figure is the one
> to size this against rather than the 69% ceiling.

## The trigger evaluated a second time — 2026-09-24 by Task 3.10.4

The condition is **the first time a second surface on that page renders per-row
markup at universe scale**. Story 3.10 added a per-row instant to the universe
table — `Live price from 12:07` — for every row whose live price is behind the
newest observation on the page.

**It did NOT fire, and the argument is structural rather than a measurement
that came in under the line.** The instant is drawn into a span the column had
**already reserved**, so there is no second surface and no new element: the
same cell, the same row count, more characters. Measured on a production build
at the worst case — every one of 517 rows behind, every instant drawn —
**36.75–36.83 ms of script a tick** against §28's 50 ms, about **4 ms** for all 517.

**The two exceptions this epic owns are unchanged** and were last re-taken by
Task 3.6.5 with the feed running: the cold load at **50–56 ms** (7 in 10) and
`Expand all` at **65–86 ms**.
