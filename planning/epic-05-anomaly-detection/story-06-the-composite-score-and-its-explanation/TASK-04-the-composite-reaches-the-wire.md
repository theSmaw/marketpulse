# Task 5.6.4 — The composite reaches the wire

**Status:** **Complete — 2026-10-23** — a composite score reaches a browser at **625 B** measured off this product's own server, the join still has exactly one producer, and the volume factor's fourth arm is **unconditional** rather than the complement of its refusals, because a volume refusal has no sample bound to state and `readAnomalyScore` refuses a `minimumSampleCount` of `0`
**Story:** [5.6 The Composite Score, & Its Explanation](STORY.md)
**Depends on:** 5.6.3

## Objective

**This task exists because Task 5.6.4 as first written was two tasks, and a
developer stopped before changing anything rather than let it grow.** Every
factual claim behind that refusal was verified:

- **`scoreAnomaly` and `excessMoveFactor` have no shipped call site.** The
  scorer appears once outside its own module — a re-export in
  `packages/shared/src/index.ts`. **There is no producer at all.**
- **`ReturnMessage` has no score field**, `returnMessageFields` has no entry,
  and the `case "return"` decode arm reads `symbol`, `return`, `volume` and
  nothing else.
- **`figureOf` and `storedFigureOf` are not exported** from
  `market-overview.ts` (lines 595 and 659), so the excess factor's two
  `WireOverviewFigure` inputs have **no seam**.
- **`buildMarketOverview` has exactly one call site** (`index.ts:840`) and
  `one-producer-of-the-overview-aggregate` enforces it — _"one PLACE the join
  is written"_ — so a second join is forbidden by a **mechanism**, deliberately.
- **There is no `excess-move-baseline-cache.ts`**, while
  `return-baseline-cache.ts`, `volume-baseline-cache.ts` and
  `session-percentile-cache.ts` all exist. `symbolReturn` runs inside the
  socket's own callback and **must not `await`**, so a read with no memo is not
  an option.

So the score cannot be drawn until it can be **produced**, and producing it
crosses a seam a guard was written to protect.

## What the user can see when this lands

**Nothing.** Task 5.6.5 draws it. That is a **fourth** consecutive invisible
task, one more than Gate 1 said this story would accept — said plainly rather
than smoothed over, because the alternative was a task that grew.

## Work

- **The fourth baseline cache.** Copy the three existing caches' shape, and
  check one thing before assuming it is a straight copy: the excess baseline's
  key is `(security_id, observed_at, reference_kind, reference_symbol)` with the
  **reference deliberately in the key**, so a cache keyed only on the session
  would collapse two references into one entry.
- **The per-symbol figure seam**, in whichever shape the architecture settles —
  a per-batch memo of the join's entries, an exported per-symbol figure, or a
  widened `symbolReturn` contract. **Whichever it is, the invariant is either
  honoured or REWORDED so it still forbids what it was written to forbid.**
  `CLAUDE.md` is emphatic that a guard loosened to let today's change through
  stops guarding anything.
- **The wiring**: `excessMoveFactor`, the volume answer, `scoreAnomaly` and
  `toWireAnomalyScore` at **one** site.
- **The frame**: `ReturnMessage.score`, its `returnMessageFields` entry written
  **field by field, never a spread** (ADR 0031), and the decode arm going
  through **`readAnomalyScore`** — the reader that re-adds the published
  contributions and refuses the section on disagreement, which is the guarantee
  that survives `JSON.parse`. **`Object.keys` skips symbol keys**, so the brand
  must never be a declared wire member.
- **`MARKET_STREAM_PROTOCOL_VERSION` stays 1.** The protocol file argues at
  length that a bump makes a stale tab reject **every** frame, and
  `DecodedMessage`'s `unsupported` member is what makes widening free.
- **Measure the frame off this product's own server**, never from arithmetic.
  The reference is **298 B** for `ReturnMessage` today; Task 5.6.3's estimate
  put the score near 520 B. Task 5.4.2's method is the one that worked, and its
  own Gate 1 estimate was wrong by 4%.

## Done when

1. A composite score is produced at exactly one site and reaches a browser.
2. The join still has one producer, or the invariant is reworded with its
   original intent intact and its break re-run.
3. The frame's byte cost is **measured**, not estimated.
4. `pnpm verify` green with its **exit code printed**, `pnpm test:database`
   green, every new break run.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — 2026-10-23

### The seam: a per-batch PASS HANDLE, and the invariant it leaves alone

`OverviewPass` — `{ frame, figureOf(symbol) }`, built by `overviewPassOf` in
`market-overview.ts` — is what the gateway's `overview` producer now answers,
and `symbolReturn(symbol, pass)` is what it hands the figure producer. The
gateway memoises the **pass** (`lastBroadcastPass`) where it memoised the frame,
so a browser joining during an outage is served one aggregate and a score
computed from **that** aggregate.

**`one-producer-of-the-overview-aggregate` is green with no amendment.**
`buildMarketOverview`'s count is still exactly one, at `index.ts`' single call
site, and `71 invariants hold.` — verified rather than assumed, before and after.
That the shape leaves the guard alone is the test it passed.

**Nothing new is computed.** `overviewSymbols` is `trackedTickers()`, so the one
join already produced the focused security's entry and its benchmark's and the
three `filter`s threw ~501 away. `figureOf` is a **lazy linear find** over the
entries the join returned, memoised for the pass's own life — one or two reads a
batch, no `Map` built per batch, no second `asOf`, no second join.

**The encoding trap the brief flagged was real and is covered by a test.**
`figureOf` sinks an observed figure's tape into a `MarketFeed[]` so the frame's
`feeds` describes the figures the frame **carries**; the pass's accessor sinks
into a list of its own that nothing reads, because a focused equity is in no
section of this frame and its tape in the frame's list would give the screen's
source note a provenance from a figure nobody can see.
`market-overview.test.ts` produces exactly that state — only the unsectioned
symbol observed — and asserts `frame.feeds` is `[]`.

### The new invariant, and the naive draft that was GREEN on the defect

**`one-pass-for-a-subject-and-its-benchmark`.** Every call to `excessMoveFactor`
must read both figures off **the same receiver**, in one argument list — the
pairing rather than a type name.

The subject therefore became `WireOverviewFigure | undefined` in
`excess-move-factor.ts` (refusing `no-subject-move`, which is that word's own
meaning), so the two reads can sit side by side with no guard between them.

**The naive draft was run against the plant first and passed wrongly.** Counting
`figureOf(` reads without comparing the **receiver** reports `71 invariants
hold.` with a second pass on disk:

```
$ node hand-break.mjs a-second-pass-for-the-benchmark     # receiver-blind draft
exit: 0
71 invariants hold.
```

The shipped clause, same plant:

```
exit: 1
  ✗ one-pass-for-a-subject-and-its-benchmark
    1 of 2 call(s) to `excessMoveFactor` do not read both figures from one pass:
      apps/backend/src/index.ts: excessMoveFactor({ subject: pass.figureOf(symbol),
      reference: referenceOf.applies ? second.figureOf(referenceOf.symbol) : undefined, … })
1 of 71 invariants failed.
restored byte-identical: true
```

**Every other guard is green on that plant**, which is why the check had to
exist: the plant adds no `buildMarketOverview` call site (it calls
`marketOverview()`, one level up), no encode site in the gateway, and no cast.
And **no spec can see it**: a score from two instants re-adds to itself, so all
five of `readAnomalyScore`'s checks pass on it. The assertion is on the
producer's shape because the wire has no opinion.

### The fourth cache, and a live defect in code merged yesterday

`excess-move-baseline-cache.ts` is `return-baseline-cache.ts`' shape, including
its repair of `last-closes-cache.ts`' `loadedFor` defect — it memoises on the
**rows' own `observed_at`** — with the 15-minute floor, no `status` filter, no
throw on the read path, and `heldThrough()` exposed. A test asserts the
memoisation key directly: asked about a later session, `heldThrough()` is the
**stored** window's and not the one asked about.

**The store repair, in both reads.** `readNewestGeneration` filtered neither
key column, so the frontier was `max(observed_at)` across **all** reference
forms and the generation read returned every form for that instant ordered by
symbol alone — a `Map<Ticker, …>` keeping whichever row came last, with no
defined tie-break. `volume-baseline-store.ts`' precedent is pinned in both
statements, and that is what `reference_kind` now does here.

**Where the brief is wrong about the tree, and it matters:**
`reference_symbol` **cannot** be pinned to a constant, because it is per
security — each equity's own benchmark — rather than one value for the whole
generation. That is where this table's key stops resembling `volume_baselines`'.
So the fourth column gets a **deterministic order** instead
(`order by securities.symbol, reference_symbol`), driven in
`excess-move-baselines.database.test.ts`, and the protection the brief asked for
is completed at the **reader**: `excessMoveFactor` treats a row whose
`referenceSymbol` is not this comparison's as **absent** — `too-few-samples` at
`sampleCount: 0`, no invented word, because nobody can act on _we hold a
baseline against a different benchmark_.

### The fourth `FactorAnswer` arm, and it is UNCONDITIONAL

`{ readonly state: "no-distribution" }`, payload-free, with the owner's sentence
recorded verbatim at the arm for Task 5.6.5 to draw once: `Measured, but no
history to rank it against.`

**It is not the complement of the volume refusals, and the reason is
arithmetic.** A volume refusal cannot become a `refused` clause at all: that arm
carries a `minimumSampleCount`, the volume baseline's bound is a **function** of
a per-bucket measured dispersion (`n ≥ (√(π/2)·CV / target)²`) rather than a
count, and `readAbsentClause` refuses `minimumSampleCount === 0`. There is no
number to put there, in principle and not only in this tree. So **every** volume
state maps to this arm, the word is **not** lost — it travels on the same frame,
on the `volume` half, with the two counts its sentences need — and the drawn
sentence is composed at the draw, where the volume half sits beside the score.

Two consequences recorded rather than smoothed over. `volumeFactorAnswer()`
takes **no argument**: a parameter read for nothing is a parameter the next
reader looks for a branch on, and the lint rule that refused `_volume` forced
the honest shape. And `CompositeInput` therefore has **two** members for three
factors, while `scoreAnomaly`'s record is still over all three — so a fourth
factor is a compile error at the producer.

**Its guard, and its naive draft.** `one-site-builds-the-no-distribution-arm`
requires exactly one construction outside `composite-score.ts`, in the file
declaring `volumeFactorAnswer`. The draft that checks the arm is **declared** in
its home was green with a second construction site on disk:

```
$ node hand-break.mjs a-second-site-builds-the-no-distribution-arm   # anchor-only draft
exit: 0
71 invariants hold.
```

Shipped clause, same plant — a **price** answer reaching for the arm when its
figure is missing:

```
exit: 1
  ✗ one-site-builds-the-no-distribution-arm
    2 shipped construction(s) of the `no-distribution` arm outside
    packages/shared/src/composite-score.ts:
      apps/backend/src/market-composite.ts: return { state: "no-distribution" };
      apps/backend/src/market-composite.ts: return { state: "no-distribution" };
1 of 71 invariants failed.
restored byte-identical: true
```

**And the 2026-10-16 double-red trap was produced here before it was fixed.**
The first version of that plant duplicated its own `find` line, so
`every-break-can-still-land` went red **about the break** beside the check under
test — two reds, one of them from a check that is not the subject, which reads
exactly like a thorough proof. The substitution now plants **inside** the found
line, so the `find` survives its own break. The check that forbids a construction
also had a real defect caught by running it: `RegExp.prototype.test` on a `/g/`
pattern carries `lastIndex` between calls, so the line-by-line filter skipped
every other match; the pattern is now non-global with a separate global form for
the home's anchor.

**Reversal trigger, as a condition:** _the first nightly pass that stores a
distribution — breakpoints, not a median and a dispersion — of a factor's own
quantity for a factor currently using this arm._ The arm is then **deleted**
rather than re-purposed, and `ANOMALY_BAND_FLOORS`' trigger 1 fires **in the same
commit**, because that is the day the max-75 scale stops existing. Both
conditions are written at the arm and at the floors, as one condition seen from
two sides.

### The adjacent latent defect, fixed: `FactorInapplicability`

`AbsentClause.because` was typed `ExcessMoveInapplicability` — one factor's
vocabulary standing as the **composite's** inapplicability type, so the only
word any factor could ever be inapplicable _for_ was `no-sector`, which the
price factor can never be. It is now `FactorInapplicability`, a union by
reference exactly as `FactorRefusal` is: one member type today, and a vocabulary
added to any factor is a compile error at the builder.

### The frame — measured off this product's own server, and the estimate was high

`ReturnMessage.score: WireAnomalyOutcome | null`, its `returnMessageFields`
entry written field by field through four named maps (one per clause arm, one
per outcome arm), the decode arm through **`readAnomalyScore`** and then back
through `toWireAnomalyScore`, so the field's runtime value carries no symbol key
its type does not declare. `MARKET_STREAM_PROTOCOL_VERSION` **stays 1**.

Measured against a backend started from the built artefact on the local store,
with a declared focus (which is what makes `sendSnapshot` send the frame, so no
live feed is needed):

| focus                    | frame     | `score` member        | without it | the score               |
| ------------------------ | --------- | --------------------- | ---------- | ----------------------- |
| `NVDA`                   | **625 B** | **368 B**             | 257 B      | `35 of 35 · elevated`   |
| `SPY`                    | 549 B     | 293 B                 | 256 B      | unscored, three clauses |
| `XLK`                    | 552 B     | 296 B                 | 256 B      | unscored, three clauses |
| `ZZZZ` (untracked focus) | 265 B     | 13 B (`"score":null`) | 252 B      | none                    |

Verbatim, the `NVDA` frame:

```
{"type":"return","version":1,"sentAt":"2026-10-23T06:54:01.849Z","symbol":"NVDA",
"return":{"measured":false,"refusal":"nothing-observed","seen":null},
"volume":{"measured":false,"refusal":"no-same-tape-baseline","sampleCount":0,"observed":0,"spanMinutes":5},
"score":{"scored":true,"score":35,"band":"elevated","max":35,
"contributing":[{"factor":"excess","weight":35,"rank":99,"aboveSample":true,"sampleCount":4620,"contribution":35}],
"absent":[{"factor":"price","weight":40,"state":"refused","refusal":"no-subject-move","sampleCount":4620,"minimumSampleCount":2500},
{"factor":"volume","weight":25,"state":"no-distribution"}]}}
```

**Three things in that frame are worth more than its size.** The **brief's 298 B
reference is stale** — `ReturnMessage` has been **330 B** since Task 5.5.4 and is
**343 B** with a `"score":null`, which is the 13 B a rollback costs and nothing
else; every figure in `market-stream-protocol.test.ts`' byte test moved by that
same 13 B and carries a dated note saying so. Task 5.6.3's _near 520 B_ for the
score is **high by ~41%**: a one-factor score with a full three-clause
explanation is **368 B**, and the widest reading in the test — two ranked
factors beside a percentile — is `763 − 432 = 331 B`. And **this machine draws a
score**, on the **session** basis: nothing has been observed, so the price factor
refuses, but the subject's and the benchmark's stored close-to-close moves share
a basis, so the excess factor ranks at the 99th and the band reads `elevated` at
`35 of 35`.

### The three existing breaks, and what each reported

Every break on a file this change touches had to be performed **by hand** —
`break-verify.mjs` refuses a dirty target and six of the targets are this
change — through a harness with the same mechanism (apply, run, restore,
checksum either side) and without the dirty check. Each restored byte-identical.

| break                                                                                           | reported                                                                                                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `the-join-runs-with-nobody-attached`                                                            | red for the right reason — `× does NOT build the aggregate when no browser is attached`, `1 failed / 41 passed`. The `clients.size === 0` guard is untouched by this shape, so this is the unchanged claim still holding.                                                                           |
| `the-fresh-join-recomputes-the-aggregate`                                                       | **repointed** (the memo holds a pass and the send reads `.frame`), then red on **three** assertions — `serves a NEW browser what was last broadcast`, `… on SUBSCRIBE too`, `does not call the producer at all on a join after a broadcast` — with `AssertionError`s and 39 tests still collecting. |
| `the-overview-frame-is-not-a-heartbeat` (its break is `the-overview-frame-rides-the-heartbeat`) | red for the right reason — `✗ the-overview-frame-is-not-a-heartbeat … publishFeedState mentions the overview frame`.                                                                                                                                                                                |
| `a-fourth-path-to-the-aggregate` (the fourth cadence)                                           | red on `the-aggregate-has-three-producer-paths`; its substitution was updated to `overviewMessage(overview().frame)` so the plant is type-honest.                                                                                                                                                   |

**One finding beside them, not caused by this change and not repaired here:**
while `the-overview-frame-rides-the-heartbeat` is applied,
`every-break-can-still-land` **also** goes red, naming
`the-feed-frame-is-a-heartbeat-again` — two breaks anchor on overlapping text in
`market-gateway.ts`, so applying the first makes the second unlandable. It is
visible only with a break applied, it reports the wrong subject, and it is
exactly the double-red shape `CLAUDE.md` warns about. Owner: the next task that
touches either entry.

### What is NOT proved, said plainly

- **The two fabrication breaks were repointed and are UNPROVEN as
  substitutions.** `the-percentile-is-fabricated-rather-than-refused` and
  `the-volume-multiple-is-fabricated-rather-than-refused` both anchored on lines
  this task deleted (`symbolReturn` no longer returns early, and the volume is
  mapped once at the `return`). Both were repointed, both now land exactly once
  — `every-break-can-still-land` is green — and both were applied and
  **typechecked clean**, so the plants compile. Their own commands are
  `pnpm e2e security-abnormal-move.spec.ts`, which this task did not run.
- **No gated machine and no person has seen a score.** CI's store is 516
  securities with zero bars and no generation, so every gated run sends
  `scored: false` with three clauses. The 625 B frame above is **one laptop**,
  on the **session** basis, with no live feed — the live basis has never
  produced a score anywhere.
- **The score is drawn by nothing.** Task 5.6.5 draws it; this task's frame is
  received by a browser that ignores the field.

### Gates

| gate                    | result                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------- |
| `pnpm verify`           | **exit 0** — `71 invariants hold.`, `0` lines matching `unhandled`                  |
| `packages/shared` tests | `28 files, 603 passed` (was 594)                                                    |
| `apps/backend` tests    | `67 files, 1312 passed` (was 1287)                                                  |
| `apps/frontend` tests   | `94 files, 1651 passed`                                                             |
| `pnpm test:process`     | `2 files, 61 passed`                                                                |
| `pnpm test:database`    | **exit 0** — `12 files, 357 passed` (was 356); run because the store's read changed |
| `pnpm e2e`              | **not run** — the owner's                                                           |

## Independently re-measured by the orchestrator — 2026-10-23

Not taken on report. A throwaway client against the running dev backend,
subscribing with a focus, printing the frame and checking the arithmetic:

```
FRAME BYTES: 625
score: {"scored":true,"score":35,"band":"elevated","max":35,
  "contributing":[{"factor":"excess","weight":35,"rank":99,"aboveSample":true,
    "sampleCount":4620,"contribution":35}],
  "absent":[{"factor":"price","weight":40,"state":"refused",
    "refusal":"no-subject-move","sampleCount":4620,"minimumSampleCount":2500},
   {"factor":"volume","weight":25,"state":"no-distribution"}]}
ADDITION CHECK: 35 = 35, score says 35 -> CLOSES
MAX CHECK: 35 vs max 35 -> ok
```

**625 B reproduced exactly.** The addition closes and the maximum agrees, on the
wire, from a client that shares no code with the producer. The `no-distribution`
arm travels **payload-free**, as the owner's decision requires.

### THE FINDING THAT CHANGES WHAT LATER TASKS MAY ASSUME

**A composite score draws on this laptop**, and four earlier task records expected
that nothing would. The mechanism: **nothing observed** → the price factor refuses
with `no-subject-move`, but the subject's and its benchmark's **stored
close-to-close moves share a basis**, so the excess factor ranks at the 99th and
the score is `35 of 35 · elevated`.

So the composite is **reachable on the SESSION basis without a live feed**, which
no earlier story's figure could be — Story 5.2's return needs process memory,
5.3's percentile needs a live window, 5.5's volume needs an `iex` tape this store
does not have. **The excess factor needs only stored daily closes**, which is
exactly what Task 5.6.2's one-table decision bought without anybody noticing it
bought this too.

Two consequences, both good and both owed forward:

- **Task 5.6.5 can see a drawn score on this machine**, rather than only in
  Storybook — the first figure in this epic that is locally reachable. Its state
  set must therefore be probed against a **real** frame as well as furnished ones.
- **CI still cannot.** Zero bars means no stored closes, so every factor is
  absent there and the `0 of 3` state remains CI's permanent one. The gated
  criteria are unchanged.

### One correction to my own brief, and it was stale rather than wrong

I briefed `ReturnMessage` at **298 B**. It has been **330 B since Task 5.5.4**
and is **343 B** with `"score":null`. Task 5.6.3's "near 520 B" estimate for the
score member is **high by ~41%** against the measured 368 B. Both are the same
lesson this repository keeps paying for: **quote a figure with the date and the
command that produced it**, because the next reader's measurement will disagree.

## For a stakeholder — a status report, 2026-10-23

**The anomaly score now exists on the wire. Nothing on any screen shows it
yet** — that is the next task, and it is the fourth invisible task in a row,
which this story's own file records as one more than it said it would accept.

What changed is that the backend can now produce _how unusual is this security,
0–100, and why_ for the security a reader has open, and send it. On the laptop
this was measured on, the answer for NVIDIA was **35 out of a possible 35, read
as `elevated`** — one factor contributing, one refused because nothing has been
heard from the live feed, and one with no history to rank against. The frame
carrying all of that costs **625 bytes**, sent once per subscription and once
per minute for the one security on screen.

Three things are worth a stakeholder's attention. The score **says what it does
not know**: a factor with no evidence contributes nothing and lowers the
maximum, so the number can only understate, and every absent factor is named on
the frame with its own reason. The **volume** factor cannot be scored at all
today — the product stores a typical volume rather than a distribution of them —
so it is reported as _measured, but no history to rank it against_ rather than
quietly left out, and the day a distribution is stored that wording is deleted
rather than reinterpreted. And **two defects in last week's work were found by
building this**: a database read that could have matched a security's history
against the wrong benchmark with nothing on screen saying so, and a type that
would have forced a second factor to borrow the first one's vocabulary.

Nobody has yet seen a score against a live market, and no automated check can
see one: the test environment holds no price history at all.
