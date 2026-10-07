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

## The trigger evaluated a THIRD time — 2026-10-07 by Task 4.3.8, and this is the first evaluation on a different page

The condition is **the first time a second surface on that page renders per-row
markup at universe scale**. Story 4.3 put **eleven sector rows** on `/`, each with
a rank, a label, a ticker, a reserved mark slot, a figure and a bar — the first
ranked, per-row surface this product has shipped outside `/securities`.

**It did NOT fire, and the arithmetic is not close.** Eleven rows is **2.1% of 518**,
so this is not _universe scale_ by two orders of magnitude; the condition's own word
is what rules it out rather than a figure coming in under a line. **The verdict is
recorded here because somebody will reasonably ask** — a per-row ranked list on a
page is exactly the shape the trigger describes, and the only thing that saves it is
the row count.

**Two things make this worth more than a one-line "no".**

**1. The trigger is written against a page, and this is the OTHER page.** Its words
are _"a second surface on **this** page"_, and every previous evaluation was about
`/securities`, where the 518-row table already is. **On `/` there is no first surface
at universe scale at all** — the proxy strip is four rows, the sector list eleven. So
the trigger as worded **cannot fire on the landing page until something there renders
518 of anything**, however many surfaces accumulate. Four aggregate regions over the
whole universe could ship on `/` without firing it, because each renders a _summary_
rather than per-row markup.

**That is the trigger working as designed and it is worth saying out loud**, because
the next reader may assume Epic 4 fired it simply by being Epic 4. It did not, and
the thing that would is named below.

**2. What WOULD fire it is already in this epic's sequence: `Movers`.** Story 4.5
ranks a top-N over all 518 securities. The **rendered** rows are ten or twenty, so
**on a strict reading it still does not fire** — but the _computation_ is at universe
scale, and Story 4.8 (`The Overview at Universe Scale`) exists to measure exactly
that. **Story 4.8 is where this question is properly answered**, with the instrument
up and the production build running, and its own file already carries the figures and
the caveats.

### What this epic should NOT inherit from Story 4.3, stated so it is not re-litigated

- **The per-tick cost on `/` is Story 4.8's**, not this epic's. Epic 4 introduced an
  overview frame that re-renders on four routes that display no overview, and that
  consequence is **owned by name** in Story 4.8's `STORY.md` — it is §28's _routine_
  word, the same category as the 40 ms-every-30-s health poll Task 3.6.5 repaired,
  rather than the once-per-visit cold load this epic owns.
- **The sector region's own cost was measured and is not a breach.** One FLIP over
  eleven rows, 20 re-orders: **1,098 rAF gaps, p50 16.7 ms, p95 17.6, worst 37.5,
  zero over 50 ms, zero long tasks** (Task 4.3.6). Caveats recorded with it: **a dev
  server**, and **a frame gap is a proxy for the task rather than the task**.

**The two exceptions this epic owns are unchanged** and were last re-taken by Task
3.6.5: the cold load at **50–56 ms** (7 in 10) and `Expand all` at **65–86 ms**.

## Handed here by Story 4.4 — 2026-10-07: a named candidate, and it is not the aggregate

**The trigger still has not fired** and nothing here changes that: Story 4.4's
breadth region renders **four rows** — three counts and a remainder — over a
computation across 503 securities, so it is a summary rather than per-row markup,
exactly as the paragraph above predicted of an aggregate region.

**What is new is a measured cost with an attribution, and the attribution names
something that is this epic's rather than Epic 4's.** Task 4.4.4 widened the one
overview call site from fifteen symbols to all 518, inside the socket callback,
~16 applied batches a minute. Measured on `dist/`, 400 timed iterations after 300
warm-up, two reproducible runs, **all 518 observed** — the worst case, against
~332 in a median minute:

|                                          | median       | p95   | max   |
| ---------------------------------------- | ------------ | ----- | ----- |
| before, the fifteen, no breadth          | **0.118 ms** | 0.150 | 0.187 |
| after, 518 + breadth                     | **3.497 ms** | 3.768 | 4.552 |
| **the breadth count alone**, 503 entries | **0.041 ms** | 0.044 | 0.183 |
| join over 518, **nothing** observed      | 0.016 ms     | 0.016 | 0.087 |
| join over 518, observed, **no closes**   | 0.019 ms     | 0.022 | 0.071 |

≈ **56 ms of script a minute**, and **the count is 1.2% of it.**

**The candidate: 518 `Intl` conversions per applied batch.** Nothing observed →
0.016 ms. Observed with no closes, so `changeFromClose` returns before its
session comparison → 0.019 ms. With closes → **3.42 ms**. That 3.4 ms is **518
`marketDateAt` calls at ~6.6 µs each**, one per live entry, inside
`changeFromClose`'s same-session branch — `packages/shared/src/market-time.ts` is
the only module in this repository permitted to construct an
`Intl.DateTimeFormat`, and this path constructs one per entry per batch.

**It is not a breach today and was not Story 4.4's to fix.** 3.5 ms is well
inside §28 and the path runs ~16 times a minute. It becomes this epic's the
moment either of two things happens: **the cadence rises** — a per-trade or
per-quote subscription rather than per-minute bars — or **a second universe-scale
per-tick computation is added to the same callback**, which Story 4.5's top-N and
Story 4.8's measurement both approach. The obvious repair is a memoised
conversion keyed on the UTC minute, which is one lookup per batch rather than
518; it was deliberately not taken here because a cache inside the one module
that owns market time is an architectural change rather than an optimisation.

**These are local figures on a dev machine against a `dist/` build.** Re-take them
with the production build and the instrument up; what they give this epic is
**where to look**, not a number to carry forward.
