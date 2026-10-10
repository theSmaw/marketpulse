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

  > **Amended 2026-10-09 by Task 4.8.6 — the `longtask` half of this command no
  > longer sees the breach, and run verbatim it would report the entry
  > repaired.** Forty interleaved cold loads on a production build with this
  > method plus a `long-animation-frame` observer: `/securities` produced **no
  > `longtask` entry over 50 ms in 10 of 10 loads**, where 2026-09-22 read
  > 50–56 ms on 7 of 10. The breach is unchanged — a long animation frame of
  > **62.8–77.4 ms on 10 of 10 loads**, of which **script 26.2–31.0 ms** and
  > **style, layout and paint 34.2–38.3 ms**, with a worst rAF gap of **p50
  > 66.7 / p95 68.5 ms** against 49–87 then. The work is no longer one task over
  > the line; it is one frame over it whose largest task is not, and the render
  > half that `longtask` cannot see is now the larger half. **So add
  > `long-animation-frame` to the observer, and prove the plant per channel** —
  > a 120 ms block caught by LoAF and missed by `longtask` leaves the
  > tasks-over-50 ms figure unobtainable on an arm that looks proved. The
  > 20-row control re-taken the same session: **0 of 10, gaps 18.5–33.4 ms**,
  > and the document is **10,318 nodes against 765** (was 10,385 against 848 on
  > 2026-09-11). Figures, transcript and the attribution are in
  > [Task 4.8.6](../epic-04-market-overview/story-08-the-overview-at-universe-scale/TASK-06-the-cold-load-of-the-landing-page-against-the-explorer.md).
  >
  > **And the landing page is not this entry.** `/` calls `useSecurities()` too,
  > so both routes pay the same 518-security payload; measured against a
  > 20-row control on **each** route, the payload costs `/` **≈6 ms** of worst
  > frame and the table's markup costs `/securities` **≈48 ms** — `/` draws
  > **447 nodes and no `<tr>`**, identical at 20 securities, and carries **no
  > task over 50 ms and one 50.9 ms frame in ten loads**. The lever for this
  > entry is still DOM size, and the page that has the DOM is still the one
  > named in it.

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

> **Amended 2026-10-09 by Task 4.8.7 — the last clause is false, and the
> candidate is smaller than it was.** The formatters are memoised in
> module-level `let`s, so this path constructs **2 `Intl.DateTimeFormat`
> instances for the life of the process**, not one per entry. Instrumented by
> patching the constructor over 2,590 `marketDateAt` calls (5 batches × 518):
> `constructions: 2`. What the 3.4 ms actually was is **`formatToParts`**:
> `marketDateAt` was `marketWallClockAt(instant).date`, which reads the clock's
> parts, then reads them again inside `marketOffsetAt`, then reads the offset
> formatter's own parts — **three calls per answer, one used**, instrumented at
> **1,554 calls for 518 conversions**. Task 4.8.7 removed the two that were
> discarded: **3.366 ms → 1.288 ms** over 518 instants (n = 398 of 400 after
> 300 warm-up, p95 3.425 → 1.356, tight loop, calibrator reference 1.03 ms
> either side), with the whole wall clock down from three parts reads to two
> (3.365 → 2.176 ms). **The memoised-conversion cache is still this epic's
> candidate and is still declined** for the reason stated below; what it is now
> worth is the remaining 1.29 ms rather than 3.4. `pnpm invariants`'
> `market-date-reads-the-parts-once` keeps the repair.

**It is not a breach today and was not Story 4.4's to fix.** 3.5 ms is well
inside §28 and the path runs ~16 times a minute. It becomes this epic's the
moment either of two things happens: **the cadence rises** — a per-trade or
per-quote subscription rather than per-minute bars — or **a second universe-scale
per-tick computation is added to the same callback**, which Story 4.5's top-N and
Story 4.8's measurement both approach. The obvious repair is a memoised
conversion keyed on the UTC minute, which is one lookup per batch rather than
518; it was deliberately not taken here because a cache inside the one module
that owns market time is an architectural change rather than an optimisation.

> **Amended 2026-10-09 by Task 4.8.8 — both halves of that clause are repaired
> IN PLACE, because one was met and declined on a figure and the other was
> never answerable by counting anything.** The clause as written above is what
> Story 4.5 was measured against, and the record of that is below; what follows
> replaces it going forward. The repair is deliberately **readable rather than
> numerical** — a condition answered with a stopwatch is a budget wearing a
> condition's clothes, and this file has now produced that defect once.
>
> **Half 1, the cadence — _the first time the subscribe message in
> `apps/backend/src/alpaca-stream.ts` carries a channel other than `bars` and
> `updatedBars`, OR the aggregate is produced from a call site the three
> existing on 2026-10-09 do not include._** Both halves are **counts**. The
> first is two words in one object literal (`bars:` and `updatedBars:`, the
> `subscribe` action); a `trades:` or `quotes:` key beside them is the cadence
> rising, and it is visible in a diff without a measurement. The second is the
> three paths `overviewMessage()` is reached by — **on connect** and **on every
> readable `subscribe` message**, both through `sendSnapshot()`, and **once per
> applied batch** from `publishObservations` — which Task 4.8.3 counted off the
> wire as three joins for a browser opening `/`. `pnpm invariants`'
> **`the-aggregate-has-three-producer-paths`** holds that count, and its own
> claim says in as many words that **three is not endorsed as correct**: a
> fourth path is a decision somebody has to take rather than a defect, and the
> point of the check is that the decision is taken rather than discovered.
>
> **Half 2, the second computation — _the first computation added to that
> callback that DERIVES a figure per security, rather than ranking or counting
> figures the join has already produced._** The old wording was _a second
> universe-scale per-tick computation_, and that is the half that was **met on
> 2026-10-08** and then **declined on a figure**: Story 4.5's top-N is a second
> universe-scale per-tick computation by any reading, and it cost
> **0.28–0.41 ms** (re-taken by Task 4.8.3 on interleaved arms at
> **0.118–0.123 ms**, so about 0.2 ms of Story 4.5's figure was drift between
> blocked arms rather than cost). **The decline was right and the clause was
> wrong.** What made 4.5 cheap is not its row count and not its luck: it
> **ranked** figures the join had already produced, where a per-security
> derivation is the shape that costs — **1.29 ms per 518 conversions** after
> Task 4.8.7's repair of `marketDateAt`, and **3.37 ms** before it. The new
> wording names the thing that differs, so the next author can answer it from
> their own diff: _am I reading a figure the join made, or making one per
> security?_

**These are local figures on a dev machine against a `dist/` build.** Re-take them
with the production build and the instrument up; what they give this epic is
**where to look**, not a number to carry forward.

## Handed here by Story 4.5 — 2026-10-08: a second universe-scale computation in the same callback, and a verdict on the trigger

**The condition this epic's own file wrote on 2026-10-07 has had its second
clause approached, and it did not fire.**

> _"It becomes this epic's the moment either of two things happens: **the
> cadence rises** … or **a second universe-scale per-tick computation is added
> to the same callback**, which Story 4.5's top-N and Story 4.8's measurement
> both approach."_

Story 4.5 added that second computation. **It costs 0.28–0.41 ms**, measured
with a control, because it **ranks the figures the join already produced
rather than re-deriving a move** — which is exactly what Story 4.4's
attribution told it to do. Had it re-derived, it would have been a second
3.4 ms of `Intl` conversions and the condition would have fired.

|                                           | median                       |
| ----------------------------------------- | ---------------------------- |
| the join with breadth and movers          | **3.866 / 4.002 / 3.943 ms** |
| the control, movers' eligible set emptied | **3.494 / 3.722 / 3.534 ms** |
| `selectMovers` alone over 503             | 0.123–0.129 ms               |

~**5–7 ms of script a minute** on top of the ~56 ms already there. The control
reproduces Story 4.4's **3.497 ms** baseline **to 0.1%**. The **maxima are
unusable** — the control moved 3.74 → 25.7 ms between runs while its median
moved 0.23 — and are recorded as unusable rather than quoted.

**So the candidate this epic was handed is unchanged and is still the whole of
the cost**: 3.4 of the 3.5 ms is **518 `marketDateAt` calls** at ~6.6 µs each
inside `changeFromClose`'s same-session branch. Two universe-scale
computations now sit on top of that one conversion loop and **together they
are under 0.4 ms.**

### The trigger: the verdict, and the recommendation not to re-word it

**It does not fire.** _"The first time a second surface on **this** page
renders per-row markup at universe scale"_ — `Movers` renders **ten rows** on
`/`, not per-row markup at universe scale on `/securities`.

**And the recommendation is to leave the wording alone**, recorded here so it
is not re-litigated at a keyboard:

- the trigger is quoted **verbatim in five live places**, so a rewrite changes
  retroactively what this epic was told it owns — `CLAUDE.md`'s rule is a
  **dated amendment beside** a description that has become false, not a
  rewrite;
- a trigger naming _computation_ at universe scale would **already have
  fired**, on Task 4.4.4's widening, making this epic retroactively due for a
  **3.5 ms** cost against a 50 ms line — a trigger re-worded into firing on a
  non-breach is worse than one scoped to a page;
- and **the two costs want different repairs**. This epic's candidates are
  DOM-size levers — `content-visibility`, collapsed bands, virtualisation —
  where `/`'s cost wants memo boundaries and a memoised `marketDateAt`. **One
  condition over two levers is how a trigger stops meaning anything.**

The proposal is a **second condition for `/`**, beside the first, and that
fork belongs to **Story 4.8** by plan. **Reversal trigger for this verdict, as
a condition**: _the first surface on `/` that renders one element per tracked
security_ — at which point the trigger as worded fires on the landing page too
and the second condition becomes redundant.

> **Amended 2026-10-09 by Task 4.8.8 — that reversal trigger has been PROMOTED
> to the second condition itself**, with its words unchanged. It is now clause
> A of the section below, and it is no longer this verdict's reversal trigger,
> because a condition cannot be its own reversal trigger — the sentence above
> would otherwise read as though the second condition retires on the event that
> fires it. The second condition has its own reversal trigger, two conditions,
> stated below.

## The trigger evaluated a FIFTH time — 2026-10-09 by Task 4.8.8, and this is the evaluation that adds a second condition

**It does not fire. Its wording stands, unchanged, for the fourth consecutive
evaluation.** And the fork Story 4.5 proposed is taken here: **one** further
clause, for `/`, beside the existing trigger rather than instead of it.

**The ordinal first, because the one in circulation is wrong.** This file
records **four** previous evaluations and only **three** of them carry an
ordinal: Task 3.6.5's (2026-09-22, _"the trigger, evaluated rather than
assumed"_), Task 3.10.4's (_"a second time"_), Task 4.3.8's (_"a THIRD
time"_) — and then **Story 4.5's, on 2026-10-08, which has no ordinal at all**
(it is headed _"the verdict, and the recommendation not to re-word it"_). That
is why _"three evaluations"_ is the figure quoted elsewhere, including in this
task's own brief. **This is the fifth.** An unnumbered verdict in a file whose
other verdicts are numbered is a verdict that drops out of the count, and the
count is the only evidence this trigger has of being used rather than quoted.

### The verdict, in the order the argument runs

**1. Nothing was added.** Every previous evaluation had to argue a row count
down — eleven sectors against 518, ten movers against 518, a per-row instant
inside a cell that already existed. **This one has nothing to count.** Story
4.8's only shipped behaviour change is `packages/shared/src/market-time.ts`
(Task 4.8.7), which **removes** two discarded `formatToParts` reads per
conversion and **renders no element at all**. Every other task in the story is
an instrument, a measurement or a document. There is no surface, so there is no
surface at universe scale.

**2. For the first time, the page the trigger cannot see has been measured
against a control, and it is not in breach.** Forty interleaved cold loads on
one session, production build, 1440×900, two 20-row control arms (Task 4.8.6):

| route             | tasks over 50 ms | frames over 50 ms           | worst rAF gap p50 / p95 | nodes      | `<tr>` |
| ----------------- | ---------------- | --------------------------- | ----------------------- | ---------- | ------ |
| `/`               | **0 of 10**      | 1 of 10 (**50.9 ms**)       | **24.7 / 34.7 ms**      | **447**    | **0**  |
| `/securities`     | 0 of 10          | **10 of 10** (62.8–77.4 ms) | **66.7 / 68.5 ms**      | **10,318** | 518    |
| `/ @20 rows`      | 0 of 10          | 0 of 10                     | 18.6 / 18.7 ms          | **447**    | 0      |
| `/securities @20` | 0 of 10          | 0 of 10                     | 18.8 / 33.4 ms          | 765        | 20     |

So the verdict is not _the landing page is probably fine_: `/` draws **447
nodes and zero `<tr>` at 518 securities, identical at 20**, and its worst frame
collapses to the one-frame floor when the payload is trimmed. **The 518-security
payload both routes fetch costs ≈6 ms; the 518-row markup only one of them
draws costs ≈48 ms.**

**3. The breach this epic owns is unchanged, and only the channel that sees it
moved.** `longtask` read 50–56 ms on 7 of 10 loads on 2026-09-22 and reports
**nothing at all** now; the continuous rAF channel read 49–87 then and **50.0–
68.5 on every load** now. Entry 1's own `Re-measure:` line already carries the
dated amendment saying so. **A channel going quiet and a cost going away produce
the same output**, and the zero is a zero only because a 120 ms plant was caught
by both channels on all 40 loads, after each measurement window, on the page that
produced the figure.

**4. And the wording is not touched**, which is Story 4.5's recommendation
adopted rather than restated. Verified on 2026-10-09: `per-row markup at
universe scale` appears **31 times across 20 files** (30 lines — `docs/GAPS.md`
line 142 carries two). A re-wording changes retroactively what this epic was
told it owns, in 20 files, and `CLAUDE.md`'s rule for a description that has
become false is a **dated amendment beside it**, never a rewrite.

### The second condition — ONE clause, for `/`, adopted as written

> **A. The first surface on `/` that renders one element per tracked
> security.**

**It is answerable by reading the tree and counting, with no stopwatch**, which
is the whole property that makes the original trigger worth having.

**Why _first_ on `/` where the trigger says _second_ on `/securities`, which is
the sentence that stops the next reader harmonising the two.** They are not two
spellings of one condition and must not be merged into one. On `/securities`
the **first** such surface **is already the breach** — the 518-row table is
entry 1 — so the only question left there is **when it doubles**, and _second_
is the right word. On `/` the first such surface **creates** a breach, because
the ≈6 ms shared payload is **already paid** and the ≈48 ms of markup is
**not**. The two conditions differ because their baselines differ, and that is
the only reason they differ.

**The price, attached before it fires, as arithmetic stated as arithmetic.** `/`
sits at a worst frame of **24.7 ms p50**. A 518-element ranked surface on it is
**strictly more than a table row** — since Story 4.6 every ranked row carries
an **anchor** and a **roving `tabIndex`** (`RankedList.tsx`) — so ≈48 ms is a
floor rather than an estimate: **24.7 ms → roughly 60–75 ms of worst frame**,
by arithmetic on this page's own measured numbers rather than by analogy with
the table. That is a second helping of entry 1 on a second page, which is
precisely what the original trigger exists to prevent.

**It is a PROMOTION, not a new clause.** These exact words were already in this
file, as the **reversal trigger** of Story 4.5's verdict (2026-10-08). Nothing
about them is re-litigated; what changed is their job. The amendment beside
that verdict says so, because a file in which a condition also appears as its
own reversal trigger reads as a mistake and invites somebody to delete one of
the two.

### Clause B was proposed, is WITHDRAWN, and is not replaced

Task 4.8.8's brief carried a second clause — _the first time the overview
aggregate is produced on any path other than the observations publish, at a
cadence the bar feed does not set_. **It is withdrawn because it was already
true on both of its readings**, and a condition that has never been false cannot
fire:

- **a cadence the bar feed does not set already exists and is accepted in
  writing** — `App`'s 30 s `/health` poll re-renders the route, measured by
  Task 4.8.5 rebuilding both chart plots twice in 45 seconds with nothing
  arriving, accepted since Task 1.12.3;
- **and the aggregate is already produced off the observations path** —
  `overviewMessage()` has **three** call paths in
  `apps/backend/src/market-gateway.ts` (on connect and on every readable
  `subscribe` message, both via `sendSnapshot()`, plus once per applied batch
  from `publishObservations`), which Task 4.8.3 counted off the wire as **three
  joins for one browser opening `/`**.

**Its content was not discarded**: it is where the repair of this file's own
2026-10-07 clause came from, as a dated amendment in place — half 1 now names
the subscribe channels and the call-site count, half 2 names a per-security
**derivation** rather than a second computation. Both are above.

### Reversal trigger for this decision — two conditions, either sufficient

1. **The first evaluation of clause A that is settled by a duration rather
   than by counting elements.** At that point it has become a budget, and a
   budget belongs in `PRODUCT_SPEC.md` §28's exception list rather than in a
   trigger. This file has produced that defect once already — the 2026-10-07
   clause, met on 2026-10-08 and declined on a figure — and the amendment
   above is the repair.
2. **The first time `/` and `/securities` draw a per-security surface from one
   component.** At that point the two conditions should be **merged**, because
   the two-condition structure exists only because the baselines differ: 6 ms
   paid against 48 ms unpaid. One component means one baseline.

### The mechanism, because a condition keyed on a call-site count reads identically whether anything holds it or not

Half 1's second count is now held by `pnpm invariants`'
**`the-aggregate-has-three-producer-paths`**, with the break
**`a-fourth-path-to-the-aggregate`**. Two checks already stand near this and
**neither counts what half 1 counts**:
`the-overview-frame-is-not-a-heartbeat` holds the **feed path** and the single
**encode site**, and `one-producer-of-the-overview-aggregate` holds one call
site of `buildMarketOverview`. A fourth path added **from a timer outside the
keepalive slice** was green under both.

### What no gated machine can see, and it is the whole of this

**CI's store has 518 securities and zero bars**, so on a gated run the join
reads **0.013 ms** with nothing observed, the aggregate frame is **928 bytes**
for ever, and every figure in this section is unobtainable. Every absolute
figure above is a **tight-loop figure on one laptop** — at a 250 ms gap the same
backend computation inflates ×2.4–3.5 along with a fixed-cost control that does
no work, so the inflation is a Node process waking from idle — while the
**browser** figures carry no such multiplier at all (**×1.00** in a visible
renderer at gaps of 3.7 s and 8.8 s, five arms out of five). **Two caveats, not
one**, and §28's line is an absolute 50 ms.
