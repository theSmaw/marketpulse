# Task 5.4.2 — The scored pass, and the frame section

**Status:** Complete — 2026-10-15 — Epic 14's backend condition **fired** and is priced at **0.474–0.509 ms p50 a batch / 946–1,015 ns a security**; ADR 0040's trigger fired but **two of the three consequences it predicted did not happen** (no split, `windowMinutes` still one per frame) and ADR 0038's grain trigger is **unfired**; the frame section is **232 B a row, 303 B empty**, not Gate 1's 223/1,281; and the section was invisible to its own invariant because it was passed by **shorthand**, which no matcher of any kind can read
**Story:** [5.4 `Unusual activity` on the Landing Page](STORY.md)
**Depends on:** 5.4.1

## Objective

Nothing in this product computes a percentile for more than one security at a
time. This task computes it for the **501 equities** every applied batch, ranks
them, and puts the answer on the aggregate frame with the factor values behind
each row.

## What the user can see when this lands

**Nothing.** The frame carries a new section and no surface reads it. Task 5.4.3
draws it. This is the one task in this story with no visible outcome, and it is
a layer rather than a slice on purpose: the alternative is drawing a region
against a frame section invented in the same change.

## Work

- **A second pass plus an intersection — never a split.** There is one call site
  of `eligibleMoves`, pinned by `breadth-is-counted-over-the-equities-alone`.
  This region's predicate is different (a pair exactly five minutes apart in the
  trailing window, **and** a comparable baseline), so it is computed downstream
  and leaves breadth's and movers' array **byte-identical**.
- **Reuse `BREADTH_WINDOW_MINUTES` as the freshness cutoff**, read and never
  spelled, so `windowMinutes` stays one number per frame and
  `one-home-for-the-observation-window` stays green. The **60-session lookback
  ships as section data** read off the cache's own generation, for
  `windowMinutes`' own reason. ADR 0043 is why these are different quantities.
- The section, with each nested object owing its own field map (ADR 0031): the
  rows, plus `tracked` (**read, never typed** — `the-population-is-never-a-literal`),
  `eligible`, `scored`, `windowMinutes`, `spanMinutes`, the baseline's feed,
  session, lookback and minimum sample, and the **refusal counts** split by kind.
- **A refused security is not a row.** No baseline, baseline under 2,500
  samples, split-refused, no window, nothing observed: omitted entirely and
  counted in the difference between `eligible` and `scored`. **No `?? 0`, no
  sentinel, no rank.** A `null` under `"number"` reaches the wire as **`0`** — a
  plausible 0th percentile — so the schema must not admit one.
- **The tie-break is ticker ascending** after the ordinal descending, declared
  and reproducible. Scores are integers over 501 securities so ties are routine;
  two equal at displayed precision must never swap.
- **Price Epic 14's backend condition and record it as FIRED.** It is the first
  computation in that callback deriving a figure **per security**, and it fires
  on every shape — do not look for one that avoids it. Arithmetic before
  measurement: ~60–72 ns a return (from 30.8–37.1 µs for 516 in one batch), a
  map hit, and a bounded ≤101-step walk, plus Story 4.5's measured
  0.118–0.123 ms top-N, giving **~0.25–0.6 ms a batch** against the current
  path's 1.521 ms p50. **Then measure it**, with the two caveats stated
  separately: a gapped Node sample inflates and the calibrator **does not
  divide out**, and **the calibrator goes in its own loop** or the arm measures
  itself (7.2× artefact, Task 5.2.5).
- **ADR 0040 amended** (dated, not rewritten): the primary trigger fired, and
  what did **not** fall due — the pass was not split, `windowMinutes` is still
  one per frame, the `observedAt`/`computedAt` pair still describes the frame.
  **ADR 0038 amended**: the frame-grain trigger **evaluated and unfired**, with
  `lastCloses` as the precedent.

## Done when

1. The section is on the frame for the 501 equities, with the factor values, and
   a unit/`app.inject()` test covers each refusal kind.
2. **Byte count measured rather than estimated**, at the row count 5.4.3 draws,
   and compared against the movers' 124.3 B a row.
3. Breadth's and movers' sections are **proved byte-identical** before and
   after — the assertion is on the producer, because the wire cannot see a
   defect in it.
4. A guard refusing a second comparator for this quantity, keyed on **two
   percentiles either side of one operator** over **every shipped source file in
   three trees** — with its break **hand-performed** (`pnpm break` refuses a
   dirty target) and **proved green on the defect first**: a comparator written
   inline in the section builder, no sort call and no module import, which a
   name-keyed or `.sort(`-keyed check passes wrongly.
5. Epic 14's condition recorded fired, with the measurement and its caveats.
6. `pnpm verify` green; `pnpm test:database` run, because it is the only level
   that exercises the real baseline read and the refusal classes.

## The wire shape, settled at Gate 1 — and the correction Phase 1's own proposal needs

**Reuse the shipped narrowed arms rather than inventing a second percentile
shape.** `WireReturnPercentile` already carries
`ranked / rank / aboveSample / sampleCount / spanMinutes / feed`, and
`WireReturnEndpoint` already exists. A ranked row **is** the `ranked: true` arm
by definition — AC 7: a security with no score has **no rank** — so the row
embeds that arm's fields with the per-frame constants hoisted to the section.

**The correction: Phase 1's proposed row carried `band: AnomalyBand`, and Gate 1
decision 1 removes it.** No band ships in this story. So the row is the
identity, the ordinal, and the factor values behind it — and **the 223 B a row /
1,281 B at five rows figure was measured on the shape WITH the band**, so it is
an **upper bound and must be re-measured**, not carried forward. _Measure rather
than cite_ applies to a figure from four hours ago.

**The endpoints are not optional.** `MeasuredReturn` establishes that this
figure may not be read without the two instants it was measured between —
dropping them takes the row to ~113 B and breaks that rule. They are also what
makes the region's own age claim possible.

**The two per-frame constants stay per-frame**, not per row: `windowMinutes` (the
freshness cutoff, **read** from the producer's own pass) and `spanMinutes` (the
measurement span). ADR 0043 is why these are two quantities sharing a number,
and `one-home-for-the-observation-window` distinguishes them **by name rather
than by shape**. The baseline's **feed differs from the numerator's** — the
return is `iex`-over-`iex` by construction because there is no store fill, while
the baseline prefers consolidated `sip` — so both travel, and that difference is
what Task 5.4.4's third source note exists for.

**The section's counts are three, and they are nested rather than parallel:**
`tracked` (**read, never typed**), `eligible` (heard from inside the cutoff
**and** holding a pair exactly the span apart), and `scored` (also holding a
comparable baseline). `eligible ⊇ scored`, which is the only reason one
sentence can carry them honestly in Task 5.4.4. The **refusal counts split by
kind** — short sample, split-refused, no baseline — because they must not read
alike.

**Absence has one representation and it is omission.** `encodeFigure` and
`encodeMovers` set the idiom and ADR 0038 decision 5 is the rule: a required
non-finite value **drops the whole row** through a `flatMap`. A refused security
is **not a row**; it is the arithmetic difference between `eligible` and
`scored`. No `rank: 0`, no `null` — a `null` under `"number"` reaches the wire
as **`0`**, a plausible 0th percentile, which is the schema trap `CLAUDE.md`
records twice.

**Each nested object owes its own field map** (ADR 0031), and the section is
**non-optional at the producer, optional on the read side** — `breadth`'s own
recorded reason, because a rollback can put a gateway and a bundle two values
apart.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — 2026-10-15

A second pass, downstream of the shared eligibility pass, computing the price
percentile per equity every applied batch, ranking it, and shipping it on the
overview frame. **Nothing reads it** — Task 5.4.3 draws it.

New: `apps/backend/src/market-unusual.ts` (+ 22 tests),
`packages/shared/src/percentile-ranking.ts` (+ 10 tests). Changed:
`market-stream-protocol.ts` (wire types, field maps, `encodeUnusual`;
`returnEndpointFields` hoisted so one endpoint map serves both frames),
`market-overview.ts` (`WireMarketOverviewInputs.unusual`, **non-optional** —
15 existing test call sites became compile errors, which is breadth's mechanism
working), `index.ts` (the baseline generation resolved **once** a batch rather
than 501 times), `check-invariants.mjs`, `breaks.mjs`.

### The section, verbatim off this product's own gateway

CI's and every no-provider deployment's permanent shape:

```
overview frame bytes: 3559
unusual section: {"rows":[],"tracked":501,"eligible":0,"scored":0,"windowMinutes":5,"spanMinutes":5,"baseline":{"feed":"sip","spanMinutes":5,"minimumSampleCount":2500},"refusals":{"figure":{"nothing-observed":0,"no-earlier-endpoint":0,"no-basis":0},"comparison":{"too-few-samples":0,"split-discontinuity":0}}}
section bytes: 303
```

A populated row, verbatim off the encoder:

```json
{
  "symbol": "NVDA",
  "rank": 99,
  "aboveSample": true,
  "sampleCount": 4620,
  "percent": -2.4137,
  "from": { "at": "2026-09-16T13:56:00.000Z", "price": 178.42, "feed": "iex" },
  "to": { "at": "2026-09-16T14:01:00.000Z", "price": 174.11, "feed": "iex" },
  "observed": 5
}
```

### Bytes — measured, and Gate 1's figure is superseded

Gate 1's **223 B a row / 1,281 B at five rows** was taken on a shape that
carried a `band`, which decision 1 removed. Re-measured off the shipped encoder,
with the assertions in `market-stream-protocol.test.ts` so they rot loudly:

|                                        | bytes                                                    |
| -------------------------------------- | -------------------------------------------------------- |
| fixed section, a generation, zero rows | **370**                                                  |
| CI's / no-provider shape               | **303**                                                  |
| first row                              | **232**                                                  |
| five rows                              | **1,164** (232.8 a row — the separating comma is a byte) |
| section at five rows / at ten          | **1,534 / 2,699**                                        |

**1.9× the movers' measured 124.3 B a row, and 118 of the 232 are the two
endpoints** — `MeasuredReturn`'s rule rather than slack. Against the 3,256 B
frame this replaces: **+9.3% in CI's permanent state** and **+47% with five
rows drawn**, against the **+74%** Gate 1 approved from AC 8's estimate.

### Epic 14's backend condition: FIRED, and priced

Production artefact, 501 equities inside the cutoff with a six-bar window each
and 490 rankable (Story 5.3's 11-refusal shape), 400 samples after 300 warm-up,
three runs:

```
unusualActivity   : p50 0.509 ms  p95 1.413 ms  min 0.430  max 5.300  n=400
breadth + movers  : p50 0.177 ms  p95 0.434 ms  min 0.155  max 2.606  n=400
calibrator (own)  : p50 0.602 ms  p95 1.171 ms  min 0.568  max 1.669  n=100
ratio subject/control p50: 2.88x        per security: 1015 ns
```

Runs 2 and 3: `0.493 / 0.176 / 0.595` (984 ns) and `0.474 / 0.171 / 0.572`
(946 ns). **0.474–0.509 ms p50 a batch, 946–1,015 ns a security, 2.8× the
breadth-plus-movers work the path already does**, landing inside the task's
pre-measurement arithmetic of 0.25–0.6 ms. The **nothing-observed floor** —
CI, every gated run, the first five minutes of every deployment — is
**0.001 ms p50, 3 ns a security**.

**Four caveats, and they are not optional.** (1) **Tight loop**: a gapped Node
sample on this machine inflates and the calibrator **does not divide out**, so
this is an upper bound on the _shape_, not what it costs at production's
6.8–16.1 batches a minute. (2) The **calibrator ran in its own loop**, never
inside the measured one — Task 5.2.5's 7.2× artefact — and read 0.572–0.602 ms
standing alone across three runs, so **0 samples were discarded** and the in-loop
step did not recur. (3) Local, one laptop, synthetic entries; **no real feed has
ever driven this pass**. (4) The 1.521 ms p50 per-batch reference is Task
4.8.11's and was **not re-taken**, so the new total is unmeasured and is **not**
reported by subtraction.

### Breadth's and movers' output is unchanged — asserted on the PRODUCER

Because the wire cannot see a defect in a producer (Task 4.8.11). For one
`EligibleMoves`, before and after the new pass runs: the `moves` array
**identity** (`toBe`), `JSON.stringify(pass)` byte-identical, and
`JSON.stringify(marketBreadth(pass))` and `JSON.stringify(topMovers(pass, …))`
byte-identical — over both bases. Structurally the module **cannot** take a
second pass: it has no entries, no membership set and no freshness filter, and
`breadth-is-counted-over-the-equities-alone` still holds `eligibleMoves(` to one
call site.

### Two guards, and both passed WRONGLY first

**`one-comparator-for-the-order-of-a-percentile`**, over `shippedSourceFiles()`
in three trees, keyed on **two ordinals either side of one operator**. Planted
the file the next story writes — a top-N with
`if (above.ordinal >= candidate.ordinal) break;`, **no sort call and no
import**. Against the obvious one-clause draft: `60 invariants hold.` with the
plant on disk. The `.sort(`-keyed draft was measured too and is **worse in both
directions** — red on two innocent files (`sector-performance.ts`,
`return-baseline.ts`) and **blind to the plant**. With the second clause in, red
for the right reason:

```
  ✗ one-comparator-for-the-order-of-a-percentile
    1 shipped line(s) order one ordinal against another outside the one comparator:
      apps/backend/src/market-unusual-top.ts: if (above.ordinal >= candidate.ordinal) break;
1 of 60 invariants failed.
```

Two costs recorded in the check itself: each operand must be a **member access
ending in the ordinal's name**, because `rank` names three unrelated orderings
in this tree plus two literal bounds checks, and a clause over the bare word is
red on all five; and the home writes `return b.rank > a.rank ? WEAKER :
STRONGER;` as two property reads **on purpose**, because a first draft bound
them to locals and the pattern could not see it.

**`each-overview-section-names-its-own-set` — and the real defect was not what
the orchestrator thought.** The new section had been left outside it, with the
claim held "structurally", on the grounds that Prettier wraps the line. **That
diagnosis was wrong.** The section was being passed by **shorthand** —
`unusual,` — so it had **no value beside its name and no matcher of any kind
could read it**. It is now written inline, with a comment saying why it is not
bound above, and the `found.length !== 1` message names shorthand as the reason a
count of zero happens.

The matcher now reads each section's **whole value** by a balanced walk from the
colon over `()`, `{}` and `[]`, stopping at the first depth-0 comma. Deliberately
**not** "first `{` to its matching `}`" — that is the shape `CLAUDE.md` records
being walked past by a destructured parameter, and **every** section's value here
contains one. Residue stated in the check rather than implied: a depth-0 comma
inside a string literal would truncate a value early, no section's value holds a
string today, and a truncation makes the positive clause **fail** rather than
pass — the one direction a reader can afford.

**And the naive repair was proved red on the CORRECT code**, which is the
transcript that makes the walk necessary rather than cosmetic — with the row
added but the old end-of-line matcher kept:

```
  ✗ each-overview-section-names-its-own-set
    the overview's `unusual:` section does not name its own set: unusual: unusualActivity({
```

That is the failure mode in which the honest-looking repair is to make the check
say less. With the walk in and the plant on disk, the message quotes the **whole
wrapped section**, which is only possible because it read past the first line.

**The pre-existing break was re-performed**, because rewriting the matcher could
have weakened the three rows it already covered:
`the-proxy-section-is-taken-negatively` still lands, and restored to an identical
checksum.

### Decisions taken at review, which the implementation routed up

- **Five refusal counts, not six.** `comparableBaseline` deliberately collapses
  _no baseline row at all_ into `too-few-samples` with `sampleCount: 0` — Story
  5.3 recorded that "`0` and _too short_ share a word on purpose". _No row_ vs
  _row too short_ is not a distinction a reader can act on; _too short_ vs
  _crosses a split_ is.
- **`eligible − scored` equals the comparison refusals over the REACHABLE
  states, and that is accepted as the bound.** `returnPercentileOf` also refuses
  a distribution that is not 101 points and a non-finite magnitude **with no word
  at all**; `0013`'s constraint forbids the first and the division the second.
  Inventing a refusal word no reader could act on was refused. Written into Task
  5.4.4, whose sentence depends on it.
- **The pass gates on `basis === "observed"`**, so the region is empty out of
  hours and in extended hours. Not an omission: `eligibleMoves` answers on the
  `session` basis when the regular session is shut, and eviction in
  `trailing-window.ts` is relative to each security's **own** newest bar — so a
  pass ignoring the basis would rank **yesterday's 15:55→16:00 pair as unusual
  activity right now, for ever**. Task 5.4.5 writes the nightly row; until then
  the region is empty ~80% of the week, by sequencing rather than by accident.
- **`UNUSUAL_ROWS = 5` is provisional**, in `packages/shared` beside the
  comparator on `MOVERS_PER_SIDE`'s argument. 5.4.3 owns the probe; the byte cost
  of moving it is linear and measured at five and ten.
- **No `ranked: true` discriminant on a row** — there is no other arm in this
  list, so it is 14 B a row restating the array's own membership.
- **Refusals are two `Record`s over closed vocabularies**, not five flat keys, so
  a new refusal kind is a compile error at the accumulator **and** at
  `WireFields`.
- **`baseline.generation` is nested and optional**, read off a row the pass
  actually read, so _session with no lookback_ is unrepresentable.
- **Nothing was added to `readOverview`** — the decoder drops the section
  silently, and Task 5.4.3 owes `readUnusual` with the cross-field checks
  `readMovers` has (`rows ≤ scored ≤ eligible ≤ tracked`, order, uniqueness).

### Gates

`pnpm verify` green — `All matched files use Prettier code style!`,
`44 components, 44 stories files.`, `576 documents, 1861 cross-file links, 39
anchor links, 0 broken.`, **`60 invariants hold.`**, shared `490 passed`,
backend `1161 passed`, frontend `1549 passed`, `test:process 60 passed`, and the
`Unhandled Errors` block checked rather than inferred from the exit code.

`pnpm test:database` — **`259 passed`**. It exercises no new code (no store or
query was touched), so it is regression cover here; the refusal kinds are
covered by the 22 unit tests.

`pnpm probe / --widths 1440` — no page error, `areaUnusual 342×491` still
reserved, as expected of a layer task.

`pnpm e2e overview-frame-sections.spec.ts` — `4 passed (4.9s)`.

**The full browser suite was not clean, in either of two runs, and that is the
documented distribution rather than this change.** Run 1 (load 4.3 before, 37.8
after — the suite is its own plant): `4 failed, 16 skipped, 253 passed`, all four
passing on scoped re-runs. Run 2, settled (load 3.55): `1 failed, 16 skipped,
256 passed` — `security-holiday-week.spec.ts:203`, `Test timeout of 30000ms
exceeded`. That spec passes **8/8 at one worker** and **12/12 at the default
worker count** in isolation, 20/20 against a 30 s budget, and 0/2 inside a full
suite.

`docs/GAPS.md` already carries this, from Task 4.8.9: **0 of 3 settled full runs
clean**, and `security-holiday-week:217` is **second** in the ranked list of
tests nearest their own timeout at **16.1 / 47.4 / 29.8 s** against 30 s —
_"a clean full run is still not the common case, and a settled machine is not the
cure"_, because four Chromium processes on eight cores **are** the load. Every
failure in both runs is in that named front-of-margin family, all on
`/securities/:symbol`, which this change does not touch. **CI is the arbiter for
the suite as a whole and it produced a clean `e2e` for 5.4.1 in 12m6s.**

**One honest loss**: re-running overwrote run 1's other three failure artefacts,
so only one failure message survives verbatim.

### What is owed

Two `pnpm break` registry runs on a clean tree, post-commit:
`unusual-ranked-by-a-second-comparator` and
`a-section-is-built-from-a-pass-of-its-own`.

## For a stakeholder — a status report, 2026-10-15

**Nothing is on screen, and that is the whole intent of this step.** The backend
now works out, for every one of the 501 companies we track and every time new
prices arrive, how unusual that company's last five minutes looks against its
own sixty sessions of history — ranks them, and sends the answer to the browser
along with the figures behind it, so a reader could later check the arithmetic
rather than take it on trust. The next step draws it.

**What it costs is measured rather than estimated, and it is cheaper than
approved.** Half a millisecond per batch of prices, about a microsecond per
company — around two and a half times the work the page was already doing for
its other two computed regions, and nowhere near any published performance
limit. The extra data sent to each browser is **9%** more while the market is
shut and **47%** more with five rows drawn, against the **74%** the plan
budgeted for. Every figure carries its conditions: one laptop, a tight loop, and
**no real market feed has ever driven this code**.

**Two safety checks were added and both were deliberately proved useless
first** — the house rule is to write the mistake the _next_ person will make,
confirm the new check waves it through, and only then fix the check. Both did
wave it through, and both now catch it.

**The more interesting of the two found a real hole in an existing check.** A
guard meant to confirm that every computed region on the landing page states
what population it measured over was **silently not covering the new region at
all** — and the reason was not the one I had diagnosed. The region was being
passed into the frame under a shorthand that left it with no value to inspect, so
**no check of any kind could have read it**. It reads as covered either way,
which is precisely the failure this repository fails builds over.

**One measurement in the plan is now superseded**: the per-row data cost was
budgeted from an earlier shape and is 232 bytes rather than 223, of which **half
is the two timestamps** the product's own rules require a figure like this to
travel with.

**Honest limits.** The region will be empty for about four-fifths of the week
until the next-but-one step writes a nightly record — a deliberate sequencing
choice, because the alternative was ranking yesterday's closing minutes as
_unusual right now_, for ever. And the full browser suite did not come back clean
on either run; every failure is in a family this repository has already measured
as timing out under its own load, on a screen this change does not touch, and
none recurred when run on its own.
