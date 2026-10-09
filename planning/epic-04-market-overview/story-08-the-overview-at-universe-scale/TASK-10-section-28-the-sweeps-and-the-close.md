# Task 4.8.10 — §28, the sweeps, and the close

**Status:** Not started
**Story:** [4.8 The Overview at Universe Scale](STORY.md)
**Depends on:** 4.8.2 … 4.8.9

## Objective

**A figure taken after the epic is called done is a figure nobody re-takes**,
and a measurement that falsifies a governing document is swept the same day
rather than at the close. This task is the close that does the sweeping.

## What the user can see when this lands

**Nothing.** The story is finished.

## Work

### §28, amended or explicitly not

AC 6. §28 names two exceptions today, both the universe table, both Epic 14's.
**A third entry is a published admission on the product's front door**; the
alternative is owning it in this epic. If it is not amended, say **where it was
checked** — §28's exception list is also quoted in `planning/EPICS.md`, Epic
14's `EPIC.md` and `CLAUDE.md`.

### The upward sweep, with what is already known to be owed

- Epic 14's **false `Intl` construction claim** (Task 4.8.7 carries it).
- `docs/GAPS.md`'s **stale owner clause** for the four-route re-render, whose
  condition fired on 2026-09-27 (Task 4.8.2).
- The **one-to-sixteen sentence** at three live sites (Task 4.8.2).
- ~~The **431-byte** frame size, and the `6.9 KiB/min` and `12% on top`
  arithmetic derived from it (Task 4.8.4).~~ — **done on 2026-10-09 by Task
  4.8.4**, at **three** live sites (`docs/GAPS.md`, this story's `STORY.md`, and
  a dated amendment beside ADR 0038's verbatim frame) with **one** historical
  site left standing by decision (Story 4.3's `STORY.md` frame-grain table,
  which is shaping text addressed to a story that has shipped). The figures to
  carry are **4,078 B** at the ceiling, **27.1 KiB/min** at 6.8 batches a
  minute and **64.1 KiB/min** at 16.1. What you still owe here is **the sweep
  of the `56.9 KiB`-a-minute family**, which is eleven places by Task 3.5.8's
  own count and was deliberately left: the 12% error came from dividing a
  per-batch figure by one of them.
- The hand-off's **_does not scale with connections_** claim (Task 4.8.3).
- Every inherited figure this story supersedes, with the old one left standing
  where it is a historical record and amended where it is a live claim.

### The sideways sweep — and run BOTH passes

Grep this story's documents for every `Story N.M` and `Owner:` line **and then
walk the epic's own story list asking _did 4.8 measure anything that story acts
on_**. **The second pass is what found three missing hand-offs in Story 4.6 and
two in 4.4, each after the grep found none.** Record the miss count.

Known candidates before you start: **Story 4.7** (its degraded grid runs on the
same instrument, and `/` re-renders on every batch in every degraded state);
**Story 4.9** (the flake characterisation, the code-free control, and the frame
composition); **Epic 5** (clause A and clause B, which Task 4.8.8 writes); and
**Epic 14** (what it still owns after this story, and what it does not).

### `docs/GAPS.md`

An entry for every claim this story leaves standing that nothing mechanical
guards — and **anything that can be made mechanical is made mechanical
instead**, as a `pnpm invariants` entry with a break. The strongest candidate,
already identified: **the cadence** — no offline feed reproduces ~16 batches a
minute, so every local per-tick figure on `/` is a sixteenth of the real render
count.

### And the frame composition, which the owner moved

**Frame composition goes to Story 4.9 with a named condition** — each `bars`
frame's symbol list, which **no replay or fixture can structurally produce** and
which three later stories were told to size against. It expires with every
session that passes. Write it into 4.9's own file.

### The close

`STORY.md`; `CLAUDE.md`'s _Current state_ and its _Where the record lives_ table
if this story added a subject; `LIVE-REHEARSAL.md` if it needs a person. Then
Gate 2.

## Done when

1. §28 amended, or explicitly not with where it was checked
2. Every falsified live claim corrected the same day, historical records left
   standing, and the count stated
3. Both sideways passes run and **the miss count recorded**
4. `docs/GAPS.md` entries written, with anything mechanisable made mechanical
5. Story 4.9 carries the frame composition and whatever 4.8.9 discharged
6. `pnpm verify` and `pnpm e2e` green, and Gate 2 put to the owner

## Handed here by Task 4.8.3 — 2026-10-09

**Three figures the sweep inherits, each measured rather than inherited.**

1. **The aggregate frame's ceiling is 4,078 bytes, not 1,650.** 4.8.2's
   1,648–1,654 is a frame from a store where most of the universe had not been
   heard from; with all 518 observed on the observed basis it is **4,078**, and
   on the session basis **3,142**. CI's shape — nothing observed, no closes — is
   **928**, measured off the wire and agreeing with 4.8.2 exactly. Anything sized
   against 1,650, or against ADR 0038's verbatim 431, is sized against a partial
   market.
2. **The backend leg per applied batch is 3.72 ms** (tight loop, n = 400 after
   300 warm-up, two runs, interleaved control reproducing 4.4.4's 3.497 ms to
   1.4%), of which the join is 3.44 and everything else is 0.22. The per-client
   fan-out beside it is **1.59 ms** at 518 subscribed and **0.67 ms** per
   additional client.
3. **Every absolute figure in this epic needs the tight-loop caveat beside it.**
   At a 250 ms-or-greater gap the same join reads **12.97–15.43 ms** on this
   machine, and a fixed-cost control with no ICU and no allocation inflates by
   the same factor — so the inflation is the machine waking from idle, it applies
   to every figure equally, and no figure taken this way is a production cost.
   §28's line is absolute; this caveat is not optional in a §28 sweep.

**And the claim the sweep must not re-introduce**: _"the backend cost does not
scale with connections"_ is **false of the join** and true of the broadcast
encode. Five live sites were corrected on 2026-10-09 and six historical ones left
standing — the table is in Task 4.8.3.

## Handed here by Task 4.8.4 — 2026-10-09

**Four things for §28 and the sweeps.**

1. **§28's routine 50 ms line is met on `/` with a factor of twenty to spare**,
   and the figures to quote are: **3.7–5.1 ms of main-thread work a batch** net
   of a quiet control at the same cadence, **25–82 ms a minute** at 6.8–16.1
   batches a minute, largest single task **4.5 ms**, `longtask` entries **0**
   in seven arms, worst rAF gap **17.7–17.8 ms** against a 16.7 ms quantum.
   Production build, 1440×900, furnished socket, local, **not deployed**.
2. **Do not carry 4.8.3's tight-loop caveat onto the browser figures.** Its
   own sentence — _no absolute figure in this epic is a measurement of
   production cost_ — is **true of the backend legs and false of the browser
   one**: the same fixed-cost calibrator reads ×2.4–3.5 at a gap in Node and
   **×1.00** in a visible renderer at gaps of 3.7 s and 8.8 s, five arms out of
   five. The sweep needs **two** caveats, not one.
3. **The byte sweep named in your list is done** for the aggregate — three live
   sites, one historical left standing, see Task 4.8.4's record and the entry
   above. What is **not** done and is yours is the **`56.9 KiB`-a-minute
   family, eleven places by Task 3.5.8's own count**: the withdrawn `12% on
top` figure was wrong precisely because it divided a per-**batch** aggregate
   by one of them.
4. **One candidate, recorded and not taken:** `changePercent` crosses the wire
   **unrounded**, so a figure carries `1.6244720133889459` where the screen
   draws `1.62`. That is **~13 bytes a figure, ~350 a frame, 9% of the
   aggregate**. Rounding it is a wire change and a product decision — a
   consumer that re-ranks needs the precision — so it is handed to Story 4.9
   beside the frame-composition question rather than taken here.

## Handed here by Task 4.8.5 — 2026-10-09: §18 needs a sentence saying which EVENT its figure is of, and the sweep is wider than two comments

**`CHARTING.md` §18 is not falsified and is now ambiguous**, which is a
different repair. Its **7.2–8.1 / 12.3–13.2 ms** is the cost of **a bar
arriving** — the `bars` decode, the `withLiveBars` join, `toBarSeries`, both
frame builders, React's render **and** the style, layout and paint of a chart
whose series **changed**. Task 4.8.5's **1.3 / 3.6 ms** is the two frame
builders **only**, with the series unchanged and the join not running. **Two
events now rebuild the same chart and §18 says which it measured nowhere.**
Add the sentence; do not restate the figure.

Note the scaling differs for a reason worth keeping: §18 recorded _3.4× the
bars costs 1.8× the script_, while the builders alone cost **2.8×** — because
they are the linear part and §18 carries the fixed costs ADR 0027's silhouette
dividend applies to.

**And the sweep is wider than the two comments 4.8.5 amended.** It corrected
`ChartReading.tsx` and `PriceChart.test.tsx`, both premised on _nothing
re-renders this chart_ — **false from 2026-09-26 to 2026-10-09**. Its greps:
`Nothing re-render` / `re-rendered the chart` / `never re-render` → **3 hits, 2
live, both amended**; `memois`/`unmemoised` → five further sites, all
describing memos that do exist. **Run the wider grep for comments premised on
_nothing re-renders this_ anywhere in the frontend**, because that premise was
true of the whole tree until Story 4.2 and is now false everywhere.

**The quiet-arm figure belongs in §28's account of what the page costs when
nothing arrives**: 2 chart rebuilds a minute from the health poll, 0 builds
between polls.

## Handed here by Task 4.8.6 — 2026-10-09: §28's cold-load figures, two live claims that have moved, and a harness defect

**1. The figures for §28's account of a cold load**, production build, 1440×900,
`provider=none`, store `marketpulse` (518 securities, 48,797,343 bars), 40
interleaved loads in one session, calibrator ratio ×0.91–×1.09 of a 2.2 ms
reference with 0–3 of 10 discarded:

| route             | tasks over 50 ms | frames over 50 ms           | worst rAF gap p50 / p95 | nodes  |
| ----------------- | ---------------- | --------------------------- | ----------------------- | ------ |
| `/`               | 0 of 10          | 1 of 10 (50.9 ms)           | **24.7 / 34.7 ms**      | 447    |
| `/securities`     | 0 of 10          | **10 of 10** (62.8–77.4 ms) | **66.7 / 68.5 ms**      | 10,318 |
| `/ @20 rows`      | 0 of 10          | 0 of 10                     | 18.7 / 18.7 ms          | 447    |
| `/securities @20` | 0 of 10          | 0 of 10                     | 18.8 / 33.4 ms          | 765    |

**2. Two live claims about `/securities`' cold load have moved, and the sweep
has to correct the channel rather than the number.** `50–56 ms on 7 of 10`
(2026-09-22, Task 3.6.5) is quoted live in **`planning/epic-14-performance-scale-validation/EPIC.md`**
and the band `50–76 ms` in `CLAUDE.md`, `docs/GAPS.md` and
`SEARCH-AND-SELECTION.md` §10 — grep `50–76` and `50–56` before writing. **The
breach stands and is now 10 of 10 rather than 8 of 10 on the continuous
channel** (worst rAF gap 50.0–68.5 ms against 49–87), and `longtask` reports
**nothing**. So the correction is not _the figure fell_ — it is that the figure
is channel-dependent and the single-task reading is no longer the one that can
see it. Epic 14's own `EPIC.md` already carries a dated amendment from this
task saying its prescribed `Re-measure:` command is insufficient as written; the
rest of the family is yours. Task 3.6.5's record and the 2026-09-11 readings
(`10,385 nodes against 848`, re-taken here as **10,318 against 765**) are
historical and stay standing.

**3. `docs/GAPS.md` candidate, and it is mechanisable only in part.** Nothing
below `pnpm e2e` can see either figure, and the gated suite cannot assert
either — CI's store has zero bars and the figure there would be a duration on a
shared runner. What **is** mechanisable is the claim that `/` renders no element
per tracked security: **447 nodes and 0 `<tr>` at 518 securities, identical at
20**, which is clause A of Task 4.8.8's second condition and is checkable from
the DOM without a stopwatch.

**4. A defect in the shared harness, produced for real and deliberately not
repaired by a measurement task.** `startProductionPair()`'s `stop()`/`reap()`
kills `pnpm`, and `vite preview` is its **grandchild** — so after an abnormal
exit the backend is reaped and **port 4273 stays held by a process with PPID
1**, and the next run refuses its own address and reads as a configuration
fault. That is the same symptom Task 4.8.4 repaired for the signal case,
reached by a different route. Beside it: an orphaned
`node scripts/browser-leg.mjs` from Task 4.8.4 was found **spinning at 100% of
a core for 58 minutes with its script file already deleted**, inside every
load-average reading on this machine for an hour. If the close adds a rule, the
rule is: **grep `ps` for this story's own script names before trusting a load
reading** — a dead instrument's process outlives its file.
