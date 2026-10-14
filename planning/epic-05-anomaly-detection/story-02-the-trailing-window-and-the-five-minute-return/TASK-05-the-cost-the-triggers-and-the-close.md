# Task 5.2.5 — The Cost, the Triggers, the Sweeps & the Close

**Status:** Complete — 2026-10-14 — the window costs **1.8–4.1 µs a batch**, Epic 14's three triggers are evaluated and none fired, and the measurement found that a calibrator sampled INSIDE the loop it times reads **7.2× high** — which puts a question mark on the figure this repository cites as authority for _the calibrator does not divide out_
**Story:** [5.2 The Trailing Window, & the 5-Minute Return](STORY.md)
**Depends on:** 5.2.4

## Objective

**An unevaluated trigger and one that did not fire read identically**, and this
story stands next to three of them. It also adds work to the one callback the
whole live path runs through, and AC 8 wants that measured rather than argued.

## What the user can see when this lands

**Nothing.** A story whose figures can be re-taken rather than cited.

## Work

- **AC 8, measured on a production artefact with a calibrator**, and reported as
  **three arms rather than one number**: a **tight-loop Node** figure, which is
  the only defensible absolute and is an **understatement** of production; a
  **gapped** figure labelled _an upper bound on the shape and nothing more_,
  with its own discard rate; and the cadence **furnished** at both ends of
  6.8–16.1 batches a minute, printed beside every figure.
  - **The two caveats are stated separately and neither is optional.** A gapped
    Node sample inflates and the calibrator **does not divide out** — subject
    **4.38×** against calibrator **2.29×**, a factor of ~1.9 apart — while a
    browser figure reads **×1.00**. A browser figure wearing the Node caveat is
    as misleading as a Node figure without it.
  - ~~**Expect the subject to be below the floor and plan to report that.** Task
    4.5.8 measured **0.0 ms net at p50 over 45 bursts** and recorded that the
    instrument cannot see a regression smaller than a millisecond. A bounded
    push plus an eviction scan over a batch of **284–450 bars** (not 516) is
    plausibly ≪1 ms. _Indistinguishable from a fixed-cost control at n=45_ is a
    result, not a failure — say so rather than hunting a number.~~

    > **Both halves of that were wrong, corrected 2026-10-14 by the measurement
    > itself.** `LIVE-DATA.md` §9.5 gives **284–450 as bars a MINUTE** against
    > 6.8–16.1 **frames** a minute — two columns of one table — so a batch is
    > **28–42 bars**. And the subject is **not** below the floor: the Node
    > instrument resolves it at **1.8–4.1 µs** against a 0.04 µs control, with a
    > plant closing to **2.8%** of its predicted size. Task 4.5.8's _0.0 ms at
    > p50_ is a **browser** arm whose 1 ms floor is that channel's property, so
    > citing it here imported a browser floor into a Node measurement.

  - **Read the load average BEFORE each run, never during it.** A suite is its
    own plant.
- **Epic 14's trigger, all THREE conditions, evaluated in writing.** The two in
  `epic-14`'s file (a second surface at universe scale on `/securities`; the
  first surface on `/` rendering one element per tracked security) and the
  **third, backend one** in Epic 5's own file: _the first computation added to
  that callback that **derives a figure per security**, rather than ranking or
  counting figures the join has already produced._
  - **A ring-buffer push is storage rather than derivation**, and the return is
    computed for **one** security on demand — so the expectation is that none of
    the three fires. **Write the verdict either way**, and say what would change
    it: computing the return per security inside the callback so `/`'s frame can
    carry it fires the third, and the moment it reaches `/` it fires the second.
- **The ADR the architect says is owed: the two five minutes.** ADR 0040's is an
  **eligibility cutoff over a population**; this story's is a **measurement span
  between two endpoints of one security**. Two things in this product called a
  five-minute window is exactly the collision this repository's documents keep
  paying for, and the check that would otherwise conflate them was widened in
  Task 5.2.2. The ADR records the distinction, the naming rule, and that
  **ADR 0040's own trigger did not fire**.
- **The upward sweep.** Known candidates: `EPIC.md`'s _five properties_ section,
  which says _there is no series in memory_ — true until this story and false
  after it; `LIVE-DATA.md`'s and `STREAM-SEAM.md`'s descriptions of what the
  process holds; and `docs/GAPS.md`'s entry about an aggregate being checkable
  by nothing, whose **second condition this story trips verbatim** — _the first
  aggregate region whose figures cannot be reconstructed from the frame the
  browser received_ — unless the frame carries both endpoints, which Task 5.2.3
  makes it do. Check that and record the count either way.
- **The sideways enumeration.** Grep this story's documents for every
  `Story N.M`, `Epic N` and `Owner:` and check each against the **recipient's
  own** file. Known recipients: **Story 5.3** (the window it reads, its depth,
  the span constant it must not reuse, and the percentile's own lookback firing
  the widened check); **Story 5.4** (the figure it ranks, and that computing it
  for 516 in the callback is what fires Epic 14's third condition); **Story
  5.5** (the volume factor over the same window, and the tape rule);
  **Epic 13** (the window is process memory with no point-in-time bound, and
  must be constructed from replayed bars or not read at all).
- **`docs/GAPS.md`** gains an entry for every claim nothing mechanical guards —
  the memory figure, the cost figures, the cold-start refusal, and every
  behaviour unreachable on a gated machine — each with a `Re-measure:`.
- **`STORY.md` status, the subject document, and `CLAUDE.md`'s _Current state_**,
  because this story changes what a user can see.
- **`LIVE-REHEARSAL.md`**: row **5.2**, written **before** the sitting. The
  figure is unreachable on every gated machine, so a person is the only thing
  that can see it at all. Epic 5 is already in `REHEARSAL_LEDGER_EPICS` and the
  gate will refuse the epic's close with the row unwatched.

## Done when

1. AC 8 is reported as three arms with both caveats stated separately, the
   cadence printed beside every figure, and the load read before each run.
2. **All three** of Epic 14's conditions are evaluated in writing, with what
   would change each verdict.
3. The ADR is written and indexed, recording the two five minutes and
   ADR 0040's unfired trigger.
4. Both sweeps are run and **both counts recorded**, including if either is
   zero.
5. `docs/GAPS.md` is updated and anything mechanisable is mechanical, with a
   break in both directions.
6. `LIVE-REHEARSAL.md` carries row 5.2 with what a sitting must take
   deliberately, each item unobtainable afterwards.
7. The four gates are run **once on the final tree** with their numbers, and
   Gate 2 is put to the owner with what was **not** verified and why.

## Amended by Task 5.2.4 — 2026-10-14: the upward sweep has a named target before you start

**`CLAUDE.md` carries Task 4.3.8's lesson in a form now known to be
incomplete**, and correcting it is this task's first upward-sweep item rather
than something to discover.

The lesson as recorded is _an assertion that serves its own answer proves
nothing — forward the server's own frames_. Task 5.2.4 measured that this is
**necessary and not sufficient**: a pass-through forwards the server's bytes
honestly, so a browser draws a **fabricated** figure exactly as faithfully as a
correct one, and every _the page agrees with the frame_ assertion stays green
when the producer is broken. **Pass-through kills the
fixture-agrees-with-itself defect and does nothing about a wrong producer.**

What catches a lying producer is a claim grounded **outside** the frame — in
`security-abnormal-move.spec.ts` it is `GET /market-data` answering
`{"feed": null}`, which with Gate 1 decision 3 means nothing has ever been
observed, so a measured return is fabricated by construction. The same shape as
`overview-breadth-counts.spec.ts`' `tracked`-against-`GET /securities`.

**Sweep the live sites**, give any ADR a dated amendment rather than a rewrite,
and leave the historical records standing — and note that the four specs Task
4.3.8 repaired may themselves still be in the insufficient form, which is a
count worth taking rather than assuming.

---

## What was done — 2026-10-13

<!-- written at completion -->

## What was done — 2026-10-14

### AC 8 — three arms, and the second one is not reportable as a figure

Measured from the **production artefact** (`apps/backend/dist/trailing-window.js`,
md5 checked before and after every plant), with a fixed-cost calibrator, the
load read **before** every arm, and the cadence printed beside every figure.

**Arm 1 — tight loop. The only defensible absolute, and an UNDERSTATEMENT of
production.** n = 400 after 300 warm-up, A/B/A/B subject against control, four
passes:

| Arm, with its furnished cadence                                 | net p50 (four passes)            | control p50 |
| --------------------------------------------------------------- | -------------------------------- | ----------- |
| **midday** — 6.8 batches/min, 284 bars/min, **42 bars a batch** | **4.13 / 4.04 / — / 4.00 µs**    | 0.04 µs     |
| **open** — 8.8/min, 332 bars/min, **38 bars a batch**           | **2.75 / 2.62 / — / 4.08 µs**    | 0.04 µs     |
| **close** — 16.1/min, 450 bars/min, **28 bars a batch**         | **2.21 / 1.79 / 1.79 / 1.88 µs** | 0.04 µs     |
| **worst case** — all 516 in one batch                           | **37.1 / 30.8 / 32.1 / 33.5 µs** | 0.04 µs     |
| `symbolReturn` per attached client                              | **1.13 / — / — / 1.08 µs**       | 0.13 µs     |

Verbatim, the final midday pass:

```text
LOAD BEFORE THE RUN: Load average 4.59 across 8 cores (ratio 0.573) against a ceiling of 1.00.
CALIBRATOR REFERENCE (tight loop, n=20): 1.1478 ms, band 1.6x
  tight loop / midday
    cadence furnished: 6.8 batches/min, 284 bars/min -> 42 bars a batch
    subject  n=400  p50 0.0040 ms (4.04 us)  p95 0.0080  max 0.8586  min 0.0023
    control  n=400  p50 0.0000 ms (0.04 us)  p95 0.0001  max 0.0175
    net p50  0.0040 ms (4.00 us)
    calibrator p50 1.1011 ms  band [0.72, 1.84] of ref 1.1478  discarded 0 / 100
    window state after the arm: 516 securities, depth(S000) = 4
```

**~0.065–0.098 µs a bar, flat.** Per minute of feed: **27 µs at midday, 30 µs at
the close** — against the overview join's re-measured 1.521 ms a batch, the
window is **0.1–0.3%** of what that one callback already spends. The window
state is production-shaped rather than a formality: **516 securities held, depth
4–6**, so the eviction `splice` executed on every sample. The fixture plants no
revisions, so `insert`'s replace branch is **not** in these figures; at §14.1's
0.1062% that is 1 bar in 940.

**Arm 2 — gapped at the real cadence. NOT reportable as a figure.** n = 45 a gap,
calibrator re-referenced at the gap, two runs: **every sample of both runs was
discarded by its own calibrator** (45/45, 44/45, 44/45, 44/45). The giveaway is
the control — `record([])`, which walks nothing, inflated from 0.04 µs to
**0.62–1.17 µs, 15–29×** — so the arm is measuring a process waking up rather
than a window recording a batch. The honest report is **an upper bound on the
shape and nothing more**, the shape being 32–64× the tight-loop figure. One load
reading in run 2 was **ratio 1.417, above the ceiling**, and is stated rather
than hidden.

**The caveat, stated separately and not optional:** a gapped Node sample inflates
and **the calibrator does not divide out**. Task 4.8.11's precedent is 4.38%
subject against 2.29× calibrator, a factor of ~1.9; this arm is worse — a
calibrator at 2.75–3.26× beside one at **18.0–19.4×** in the same run.

**Arm 3 — the cadence, furnished**, printed beside every figure at both ends of
6.8–16.1 batches a minute. It is furnished because **no offline feed in this
repository produces the real one**, and arm 2 is how far a furnished cadence
gets you.

**The browser caveat has NO SUBJECT here, and saying so is the point.** Nothing
of the window crosses the wire; the only thing a browser receives is the 298 B
symbol-scoped frame, and applying it is a render rather than a window. A caveat
with nothing to attach to is worse than none, so every figure above wears the
**Node** caveat and only that.

**The plant was proved per channel and at its known size.** 20,000 `Math.sqrt` an
observation predicts 479 µs at the calibrator's own rate and measured
**492.3 µs — 2.8%**. A per-**call** plant of ~0.57 ms was caught by **both**
subject and control at 612–619 µs with the net correctly falling back to the
unplanted 6.08 µs, which is the control doing its job rather than decorating the
table.

### Epic 14's trigger — all three conditions, evaluated in writing

1. **`/securities`: _a second surface rendering per-row markup at universe
   scale_ — NOT FIRED.** One figure for one security, in a region that already
   existed. No `AnomalyBadge` in `UniverseTable`; `SecurityRow` is still rendered
   by nothing.
2. **`/`: _the first surface rendering one element per tracked security_ — NOT
   FIRED.** This story's _Out of scope_ excludes `/` entirely.
3. **The backend condition, in Epic 5's own file: _the first computation added
   to that callback that derives a figure per security_ — NOT FIRED, and this is
   the one that was live.** A ring-buffer push is **storage rather than
   derivation**, and the return is computed for **one** security on demand. Now
   priced rather than argued: the window costs **1.8–4.1 µs a batch** and
   **27–30 µs a minute** of feed, which is 0.1–0.3% of the join beside it;
   `symbolReturn` is **1.08–1.13 µs** per attached client. §28 is not in breach
   and no third exception is owed.

**What would change verdict 3**, written down so the next story recognises it:
computing the return **per security inside the callback** so `/`'s frame can
carry it. The worst-case arm prices that today at **30.8–37.1 µs a batch** for
the window alone, and Story 5.4's own hand-off says so in its file.

### The sweeps

**Upward — 4 sites across 3 documents.** `CLAUDE.md` and `MARKET-OVERVIEW.md`
(×2) carried Task 4.3.8's lesson in the form now known to be **incomplete**, and
Epic 5's `EPIC.md` property 1 said _there is no series in memory_, which this
story made false. The first is the substantial one and is in Task 5.2.4's
record; the property is **qualified rather than withdrawn**, because the
sentence's reason survives — six bars is not 390, and anything wanting a series
still assembles it from the store.

**And the count the amendment owed, taken rather than assumed.** Of the five
pass-through overview specs: **three** carry a sufficient shape — an
**independent recompute** (`overview-sector-ranking` sorts the displayed figures
itself; `overview-movers-ranking` recomputes all 503 moves) or an **external
reference** (`overview-breadth-counts` against `GET /securities`) — **one**
asserts a frame contract where the question does not arise, and **one**,
`overview-movers-denominator`, is insufficient **and says so in its own
comment**: _`eligible` is a reduction with no recoverable input on the frame_.
That one is honest rather than broken.

**Two more found while sweeping, neither of them this story's:** `CLAUDE.md`'s
_Where the record lives_ table held **two rows pointing at `MARKET-OVERVIEW.md`**
with overlapping descriptions, one from Epic 4's close and one from Story 4.7's —
merged, which is the one-fact-one-home rule applied to the index itself. And
`pnpm build` was **red on a clean checkout** from a stale `packages/shared/dist`
beside a current `tsbuildinfo` — `CLAUDE.md`'s own documented trap, which reads
exactly like a broken commit; `pnpm clean && pnpm build` is green.

**Sideways — 4 recipients, 4 of which had nothing.** **Story 5.3** (the window it
reads and its two traps, the constant it must not reuse, and that
`one-home-for-the-observation-window` **will** refuse its lookback — the break
for that check is literally a `market-percentile.ts` plant); **Story 5.4** (it is
the story that fires two of Epic 14's three conditions, with the worst-case
price, and ADR 0040's trigger becomes its to evaluate); **Story 5.5** (the
in-memory window holds one tape **by construction** and the store holds two, so
a volume ratio is where that trap becomes real); **Epic 13** (a second in-memory
accumulator fed by the live socket, which must be constructed from replayed bars
or not read at all).

### `docs/GAPS.md`, and what is not mechanisable

Three entries: the return has **no external check** and its two input prices are
on no frame — which trips _an aggregate is checkable by nothing_'s second
condition verbatim, and the mitigation was taken only halfway because nothing on
screen would draw the closes; **a pass-through spec proves fidelity, never
correctness**, with the two sufficient shapes and the count above; and **nothing
measures this window on a machine serving a real market**.

### ADR 0043 — the two five minutes

[Written and indexed](../../../docs/adr/0043-two-five-minutes-a-freshness-cutoff-and-a-measurement-span.md).
`BREADTH_WINDOW_MINUTES` is an **eligibility cutoff over a population** whose
input is a coverage curve; `RETURN_SPAN_MINUTES` is a **measurement span between
two endpoints of one security** whose input is `PRODUCT_SPEC.md` §11. Both
constants now carry a docblock pointing at it, which is the cheapest mechanism
available for a distinction invisible at the call site. **ADR 0040's own
reversal trigger has not fired** and the ADR says so, because an unevaluated
trigger and one that did not fire read identically.

### `LIVE-REHEARSAL.md`

Row **5.2, unwatched, written before the sitting.** This figure is **more**
unreachable than row 5.1's: the window is process memory fed by the live socket
with no store-backed fill, so it has never held one entry on any machine not
serving a real market. Four items, each unobtainable afterwards, and item 4 — the
figure against any public five-minute chart — is **the only external check this
number will ever have**. Proved by plant that the gate now refuses Epic 5's close
with **both** rows unwatched.

## For a stakeholder — a status report, 2026-10-14

**The cost question is answered, and the answer is that it costs nothing worth
worrying about.** Keeping six minutes of price history for all 516 securities
adds about **four millionths of a second** to each batch of market data, which
is roughly **one three-thousandth** of the work that part of the system already
does every minute. Measured four times, on the real build, with a deliberately
planted cost used to prove the stopwatch could see one — it reported the plant's
size to within 3%.

One of the two measurement approaches produced numbers we **threw away rather
than report**: driven at the real once-a-minute rhythm, the machine's own wake-up
cost swamped the thing being measured by a factor of twenty, and the control
proved it. That is recorded as an upper bound rather than dressed up as a figure.

Three performance tripwires set in earlier epics were checked **in writing** and
none has fired — and the one that could have is now priced, so the story that
would fire it knows what it will cost before it starts.

Along the way the measurement found a flaw in **how this repository measures**:
the reference stopwatch we put beside every timing reads seven times too high if
it sits inside the loop being timed, because the compiler folds it in. Two
complete runs were discarded on that basis, and the rule is now written down —
along with an honest note that one earlier figure quoted as authority may have
been affected by the same thing, which cannot now be checked because that
instrument was deleted.

### The four gates on the final tree, and an honest account of the browser suite

| Gate                 | Load before       | Result                                                                                     |
| -------------------- | ----------------- | ------------------------------------------------------------------------------------------ |
| `pnpm verify`        | 4.19              | **exit 0**, `58 invariants hold.`, **3,091 tests** (453 + 1,082 + 1,497 + 59)              |
| `pnpm test:database` | 11.58             | **7 files, 237 tests**                                                                     |
| `pnpm probe`         | —                 | ten story states at four widths and the route; screenshots looked at                       |
| `pnpm e2e`           | 10.97, then 17.17 | **256 passed / 1 failed**, then **255 passed / 1 failed** — a **different** spec each time |

**I did not get a clean full browser run locally and I am not going to claim
one.** Two consecutive runs each produced exactly one failure, and they were
**different specs** — `security-holiday-week`'s listener test (a **30 s
timeout**, not an assertion failure) and `security-window-control`'s tab-stop
test. Both were re-measured on this checkout:

- `what a listener is told about the holiday week` — **24/24**, at load 16.
- `the control is one tab stop and reachable…` — **36/36** (12 repeats × three
  viewports), at load 26.

**The machine is the plant, and it is measured rather than assumed.** The second
run began at load **17.17** and ended at **38.71**; `ps` shows **WebStorm at
127% CPU**, a virtualisation framework at 41% and Teams at 19% — the owner's own
work, none of it mine to stop. `CLAUDE.md`'s own precedent is a suite begun at
5.31 leaving the machine at 31.04, and this is worse.

**One thing in that is a finding rather than noise, and it is worth the line.**
The holiday-week listener test runs at **9.4 s alone and 15.6–18.5 s under
load**, against a **30 s** timeout — so its headroom is thin, and a loaded
machine crosses it. **Whether this story's added region contributed is not
measured**: it enlarges the accessibility tree that test walks, and the way to
settle it is a run against `main` before #582, which was not taken. Recorded as
a condition rather than a conclusion: **the next time that spec times out,
measure it against a checkout without `AbnormalMove` before blaming the
machine.**

Every spec this story touches passes individually, `pnpm verify` and
`pnpm test:database` are green on the final tree, and each of this story's four
merged PRs passed the **full** suite on CI's settled machine.
