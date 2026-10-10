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
composition); **Epic 5** (~~clause A and clause B~~ — **clause A only, plus the repaired
backend condition; clause B was withdrawn, see the hand-off below** — which
Task 4.8.8 wrote on 2026-10-09, into Epic 5's own `EPIC.md`); and
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

## Handed here by Task 4.8.7 — 2026-10-09: the one shipped-code change in this story, and three figures §28's sweep must not carry forward

**Task 4.8.7 repaired `marketDateAt`, so three figures this epic's documents
state as current are now historical.** It read the market formatter's parts
three times per answer and used one; it reads them once. Over 518 instants,
tight loop, n = 398 of 400 after 300 warm-up, calibrator reference 1.03–1.05 ms
either side: **3.366 → 1.288 ms** p50 (p95 3.425 → 1.356), and
`marketWallClockAt` **3.365 → 2.176 ms** because the offset now comes from the
clock's own parts read.

**The three live claims to sweep, each a figure about the join rather than
about this function:**

1. **_"3.4 of the 3.5 ms a batch is 518 `marketDateAt` calls at ~6.6 µs
   each"_** — Story 4.4's attribution, repeated in
   `epic-14-performance-scale-validation/EPIC.md` (twice), in `CLAUDE.md`'s
   current-state section (_"the rest being 518 `marketDateAt` calls inside
   `changeFromClose`, handed to Epic 14 by name"_) and in Task 4.8.3's
   hand-offs. The per-call figure is now ~2.5 µs. **The attribution is still
   correct about WHERE the cost is; the magnitude is a third of what it says.**
2. **The 3.497 ms / 3.72 ms per-batch join figures** (Story 4.4.4, Task 4.8.3)
   were taken with the three-read version underneath them. Nothing re-ran
   `join-cost.mjs` after the repair — **re-measure rather than subtract**, and
   if the close cannot afford a re-run, say in as many words that the figure
   predates 2026-10-09.
3. **`CLAUDE.md`'s _"the widening cost 0.118 → 3.497 ms a batch"_** is a dated
   historical measurement of Story 4.4 and should be left standing as such,
   with the repair noted beside it rather than the figure edited.

**One premise correction has already been made upward**: Epic 14's file said
this path _"constructs one `Intl.DateTimeFormat` per entry per batch"_ and it
constructs **2 for the life of the process**. That claim now carries a dated
amendment; if §28's sweep quotes it, quote the amendment.

**And §28 itself needs nothing from this task.** No threshold moved and no
breach was created or cleared — this is 2 ms of script a batch recovered well
inside a 50 ms line. What the sweep gains is a guard worth naming beside the
figures: `pnpm invariants`' **`market-date-reads-the-parts-once`**, whose break
is `the-market-date-takes-the-offset-path-again`, because the repair is
**invisible in every rendered string** and the delegation that undoes it is the
better-looking code.

## Handed here by Task 4.8.8 — 2026-10-09: §28 is amended, eight sites are swept, and the rest of the `50–76` family is still yours

**Three things, and the first saves you a decision.**

**1. §28 took NO third exception, and what was amended is the METHOD and one
UNIT.** The owner's decision. `PRODUCT_SPEC.md` §28 now carries a dated line
saying the target is measured on **three channels** — `longtask`,
`long-animation-frame` and an rAF-gap recorder — **each proved by a plant on
the page that produced the figure**, because _a channel going quiet and a cost
going away produce the same output_. The first exception's **unit** is
corrected and its **number** is not: the breach is _one frame over the line on
every cold load_ rather than _one main-thread task of 50–76 ms_. The second
condition for `/` is recorded there beside the reversal trigger. **So AC 6 is
discharged; what you owe is the check that nothing else needs it.**

**2. The sweep rule, and exactly what was touched, so you do not re-sweep it.**
The rule: the **verdict** goes only to the file that owns the trigger; the
**second condition** goes only to sites whose subject includes `/` or whose
subject is Epic 14's ownership in general; every other site is a dated record
of an evaluation or a close and is left **byte-identical**. Verified count:
`per-row markup at universe scale` appears **31 times across 20 files** (30
lines — `docs/GAPS.md` line 142 carries two on one line). **16 occurrences in 8
files touched; 15 occurrences in 12 files left standing**, including Epic 2's
and Epic 3's close tables, `SEARCH-AND-SELECTION.md` §10 (×2),
`CHARTING.md` §16.1 and `VOLUME-AND-WINDOW.md`'s close table — each of which
says something still true about `/securities`.

**3. What is still yours, named rather than implied.** Task 4.8.8 corrected the
**unit** at the four live sites **outside `planning/`** that the planning sweep
would never reach — `docs/adr/0029-*.md` §8 (a dated amendment, never a
rewrite), `e2e/specs-deployed/security-explorer-journey.spec.ts`,
`scripts/overview-instrument.mjs` and
`apps/frontend/src/components/UniverseTable/UniverseTable.module.css` — plus
`docs/GAPS.md` at both of its sites. **It deliberately touched NO figure in
`CLAUDE.md` and none in `SEARCH-AND-SELECTION.md` §10**, which are the family
Task 4.8.6 handed you: `50–76` is **40 hits in 26 files** and `50–56` is **29
hits in 18 files** (3 of the `50–76` hits are a different figure, `250–768` in
`market-data-provider.ts` and `PROVIDER.md`, and are not yours either).
**Also untouched and yours: `CLAUDE.md`'s current-state sentence** _"the rest
being 518 `marketDateAt` calls inside `changeFromClose`, handed to Epic 14 by
name"_ and the `0.118 → 3.497 ms` figure beside it — Task 4.8.7's hand-off
already names both, the attribution is still correct about **where** the cost
is, and the magnitude is now a third of what the sentence implies.

**And one thing to carry into `docs/GAPS.md`**: the count Epic 14's repaired
clause rests on is now mechanical. `pnpm invariants`'
**`the-aggregate-has-three-producer-paths`** holds _at most three paths to
`overviewMessage()`_, with the break **`a-fourth-path-to-the-aggregate`** — and
it was produced against the shipped tree first: a fourth path from a timer one
line outside the keepalive slice reported **`50 invariants hold.`** before the
check existed. It is the third check on this seam and the only one that counts
**paths**; the other two count the feed path plus one encode site, and one call
site of `buildMarketOverview`.

## Handed here by Task 4.8.11 — 2026-10-10: the per-batch join is 1.521 ms and not 3.708, the idle figure is now ZERO, and 4.8.3's _the ratio travels_ needs a caveat of its own

**Four corrections, and the fourth is a correction to an instrument RULE rather
than to a number.**

**1. The backend leg per applied batch, re-taken after 4.8.7.** Measured inside
the real gateway from `apps/backend/dist` with the producer composed as
`index.ts` composes it, all 518 observed with closes, arms **rotated** per burst,
calibrator paired:

| tight loop, zero clients                     | p50          | p95   | n       |
| -------------------------------------------- | ------------ | ----- | ------- |
| `publishObservations(518)` **before** 4.8.11 | **1.521 ms** | 1.620 | 298/300 |
| the same **after** the guard                 | **0.000 ms** | 0.000 | 298/300 |
| `publishObservations([])` — the floor        | 0.000 ms     | 0.000 | 298/300 |

Calibrator reference **1.217 ms** before and **1.137 ms** after, bands
`[0.76, 1.95]` and `[0.71, 1.82]`, **2 / 300** discarded each, load ratio 0.324
and 0.800 under the unraised 1.0 ceiling.

**So `3.708 ms` and `3.72 ms` are both pre-4.8.7 and must not be carried into
§28's sweep.** The figure for the per-batch path on today's tree is **1.521 ms**
tight, and **zero** when nobody is attached.

**2. Every figure in this epic derived from `3.72 ms` a join is now wrong by the
same factor, and the arithmetic must be re-run rather than scaled by eye.** The
ones in circulation that this task inherits: **11.2 ms** of server script per
browser opening `/` (three joins), **7.4 ms** for `/investigations` and for a
reconnect, and **3.72 ms** per mover resubscribe. A naive rescale at 1.521/3.708
puts the cold load of `/` near **4.6 ms** — **quoted here as an estimate and not
as a measurement**, because 1.521 ms is the whole `overviewMessage()` on an
all-observed fixture rather than `buildMarketOverview` alone, and the three
snapshot joins run against whatever the live map actually holds. If §28's sweep
needs those numbers, re-take them; the instrument is a throwaway and the recipe
is in Task 4.8.11.

**3. The idle-deployment figure is discharged, not corrected.** 4.8.3's _25 ms of
script a minute at the 6.8-batch midday floor and 60 ms at the close_ was
re-taken at 1.521 ms as **10.3 ms** and **24.5 ms** — and then taken to **zero**
by the guard, with **0 joins counted over 500 bursts**. If §28's sweep carries an
idle-rate line against `PRODUCT_SPEC.md` §9.1, this is the entry that closes
rather than moves.

**4. The instrument rule: _the ratio travels and the absolute does not_ is
itself only approximately true, and this arm is the counter-example.** Re-taken
at a 250 ms gap with the calibrator re-referenced at that gap and the arms
rotated: the **calibrator** inflated **2.29×** (1.217 → 2.792 ms) while the
**subject** inflated **4.38×** (1.521 → 6.662 ms) — the two ratios differ by a
factor of ~1.9 on the same bursts. 4.8.3's finding 6 and 4.8.7's gapped pair both
read as though the inflation is a property of the machine that divides out; on
this arm it is not, and a gapped figure corrected by the calibrator's own
inflation would have under-reported by nearly half. **The gapped absolute is an
upper bound on the shape and nothing more**, and §28's caveat sentence should say
that rather than _the ratio travels_. The after-run at the gap discarded
**19 / 60** windows at load ratio 0.744, and its only usable figure is the one
that cannot be noise: 0 joins, arm 0.004 ms against a floor of 0.003 ms.

**And one sweep this task should check rather than assume.** The invariant
`the-aggregate-has-three-producer-paths` had its **claim** amended on 2026-10-10
— the third path now says _only when a browser is attached_ — and its note now
states that the check **cannot see the condition and is not asked to**. If §28's
sweep enumerates what each green check certifies, that is the sentence to read.
