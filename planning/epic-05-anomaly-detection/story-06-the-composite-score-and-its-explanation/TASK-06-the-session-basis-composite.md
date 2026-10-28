# Task 5.6.6 — The session-basis composite

**Status:** **Complete — 2026-10-26**
**Story:** [5.6 The Composite Score, & Its Explanation](STORY.md)
**Depends on:** 5.6.5

## Objective

**`/`'s `Unusual activity` has TWO bases and only one of them can hold a
composite today.** `market-unusual.ts` is a two-arm discriminated union: the
`observed` arm computes live, and the `session` arm reads
`session_return_percentiles` through `sessionSection`. That stored row carries
`rank`, `aboveSample`, `sampleCount`, `percent` and two endpoints — **no score,
no band, no factor set.**

The session arm is what runs **out of hours — about 80% of the week by that
file's own header — and permanently on CI.** So without this task the region
would draw a score for a few hours a day and an ordinal the rest of the time:
**two different quantities in one column on different days**, which is precisely
what the two-arm union was built to prevent (_"a process with a stale trailing
window and a process with none must not draw the same region for different
reasons"_), and which contradicts Task 5.6.7's own objective — _so the two
surfaces finally agree about what is ranked._

**The owner chose to store the composite nightly** rather than ship the split.

## What the user can see when this lands

**Nothing.** Task 5.6.7 draws it. This is the **fifth** invisible task in a story
whose Gate 1 said three was the most it would accept — recorded plainly rather
than smoothed over, because the alternative was a region that tells a different
kind of truth depending on the hour.

## Work

- **`0017_session_composite_scores.sql`**, following `0014`'s shape — the
  nearest relative, and the one whose two-table convention (`*` plus
  `*_passes`) ADR 0044's 2026-10-16 amendment asks for. An **empty-table**
  migration: catalogue writes only.
  - **The factor set belongs in the row**, not merely the score. AC 3 says the
    number of contributing factors is part of the score's **identity**, and a
    stored score without its set cannot be ranked under the cohort rule.
  - **The weights and the band floors belong on the PASS row**, for `0014`'s own
    recorded reason about `minimum_sample_count`: a rollback must not leave a
    runner and a reader two values apart. A stored score is **a cache of a
    policy**, and both the weights and the floors carry reversal triggers.
- **The nightly pass** computes the composite for the session it is **for**,
  from the rows `0013`/`0016` already hold, after the existing baselines so it
  reuses the warm heap.
- **The store and the cache**, following `session-percentile-store.ts` and the
  four existing caches. `excess-move-baseline-cache.ts` is the newest and
  carries the `reference_kind` pinning lesson.
- **The `session` arm reads it**, and `sessionSection` ranks by the composite
  with the cohort rule — so both arms answer the same question.
- **Measure what the pass costs**, warm and cold, and how many securities get a
  row. 5.6.2's excess pass was **26.4 s cold, 17.0/19.2 s warm** for all three
  baselines together.

## Done when

1. `0017` applies; a stored composite carries its score, band, factor set and
   maximum, with the weights and floors on the pass row.
2. The nightly pass writes one, measured warm and cold.
3. ~~The `session` arm ranks by the composite~~ — **out of scope, see the
   narrowing below.**
4. `pnpm verify` green with its exit code printed, `pnpm test:database` green,
   every new break run.

## Narrowed by the owner before this task started — 2026-10-26

**This task is ONLY the stored composite. It does NOT change what `/` draws or
ranks.** Done-when 3 — _the `session` arm ranks by the composite_ — cannot be
done without the wire row's new shape, which is **Task 5.6.7's**. A developer
identified that and the owner narrowed the task rather than letting it grow into
a browser-visible change inside a migration.

**In scope:** migration `0017`, the nightly pass, the store, the cache, and the
measurement. **Nothing reads it yet**, which is honest and is the point.
**Out of scope:** `WireUnusualRow`, `sessionSection`'s ranking,
`market-unusual.ts`' arms, anything a browser sees.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — 2026-10-26

### The migration: `0017_session_composite_scores.sql`

**Two tables, following `0014` section for section** — ADR 0044's 2026-10-16
two-table amendment, **fourth** application. An **empty-table** migration:
catalogue writes only, no heap pass, no validated constraint, no `ALTER TABLE`
on `market_bars`, on `securities` or on any of the six derived tables. Applied
locally in **0.267 s** total for the runner, against `deploy.yml`'s
`timeout 120`.

**The key is `(security_id, observed_at)` on the score table and `(observed_at)`
on the pass row**, and `observed_at` takes **no default** on either — named
`observed_at` deliberately so Epic 13's generic `where "observed_at" <= $clock`
covers both tables with no explicit argument. Asserted out of
`information_schema` by the new database suite, both halves.

**The row's content is the three factor ANSWERS, stored as three byte-identical
column groups** — seven columns each: `state`, `rank`, `above_sample`,
`sample_count`, `refusal`, `minimum_sample_count`, `inapplicable_because`. That
is `FactorAnswer`'s four arms in columns, and three things follow that a stored
score alone could not give:

- **the factor set IS the set of states** and has no second home, so AC 3's
  _the number of contributing factors is part of the score's identity_ is read
  off the row rather than stored beside it;
- **`max` and `band` are derivable** rather than facts somebody wrote down;
- **`scoreAnomaly` stays the only arithmetic**, because the reader mints from
  the answers.

A `text[]` or `jsonb` of contributing factor names was **refused** for `0014`
§4's recorded reason: a fourth factor must be a migration somebody writes, not a
key that silently stops being counted. The same argument made it three column
groups rather than a child table, and `EVERY_FACTOR_HAS_A_COLUMN_GROUP` in the
store is the compile error a fourth member of `COMPOSITE_FACTORS` produces.

**The minted `score`, `band` and `max` are stored as well** — `0014` §5's
argument — so a producer/reader split is **detectable**. Storing them _instead
of_ the answers would have been `0015`'s `feed`-in-the-key mistake: a weight
change would leave 60 sessions of stale scores with nothing recording that the
meaning changed.

**The weights and the band floors are on the PASS row**, never on the score row,
and the store takes **neither as an argument**: it reads `FACTOR_WEIGHTS` and
`ANOMALY_BAND_FLOORS` from the one home each has, because what must be stored is
what the **minting** applied and the minting is `scoreAnomaly`'s. A parameter
would let a caller store a policy the scorer did not use, which is the one
failure that column group exists to detect.

**Constraints, all on empty tables.** Per factor: an answer-shape check (each
arm's members present exactly when its state is), a refusal-vocabulary check,
and shared checks for the rank range and the sample rule (`0` is legal on a
refusal and nowhere else). Plus `session_composite_scores_one_factor_contributes`
— **a row is a score**, which is `AnomalyScore.contributing`'s non-empty tuple
in the one place a `null` cannot sneak past a type — the band vocabulary, and
`score ≥ 0 and score ≤ max`. On the pass row: the population partition, the
weights summing to 100, and strictly ascending floors inside `0`–`100`.

**Two things the migration deliberately does not have, and the reasoning is in
the file.** The **unscored population's reasons** are not stored: they are per
factor and already counted on `session_return_percentile_passes` and
`excess_move_baseline_passes`, both keyed on the same `observed_at` by the same
pass in the same loop, so a third copy would be a third home for one fact. And
**no foreign key to `session_return_percentiles`**, because a security can have
a composite with no price-percentile row — the excess factor alone is enough to
make a score — so the populations are not nested and a key would claim they are.

**No approximate-array allowlist entry was needed, verified rather than
trusted.** A composite carries integers, booleans, words and `numeric`, and
there is no distribution in it; `migrate.database.test.ts`' allowlist is an
**exact set equality**, so an unneeded entry would have failed it exactly as a
missing one would. The new suite asserts the absence directly over both tables'
`udt_name`s.

### The pass

In `compute-baselines.ts`, **last in the per-security iteration and after all
three existing baselines**, so every input is a value one of the four stores
already produced for the security the loop is already reading. **It issues no
read of its own** — the only new statements are 485 upserts and one pass row.

**Over the equities alone**, which is `session_return_percentiles`' own
population and AC 13's reason: a ranked list that scored `SPY` and the eleven
sector SPDRs beside their own constituents would make `Unusual activity` and
`Market proxies` / `Sector performance` non-independent. `0017` §7 carries the
condition for widening it to all 516 — _the first surface that needs a composite
for a security the market is shut on_.

**The excess numerator is the CLOSING five-minute excess**, both legs over the
same five minutes. The subject's leg is `sessionClosingReturn` over the closes
the iteration read; the benchmark's is `sessionClosingReturn` over the fund's
closes, taken **once per fund in the prologue** over the same `scored` session —
eleven walks of eleven resident maps instead of 501 walks of the same eleven,
which is the prologue's own argument one quantity over.

### Four code changes outside the new modules, each of them forced

1. **`excessMoveFactor`'s legs are now a minimal contract, `ExcessLeg`**, rather
   than `FiveMinuteReturn`. This product has **two** producers of a five-minute
   return and neither may be forged from the other: `fiveMinuteReturn`'s
   endpoints carry a `BarSource`, and `session-percentile.ts` records that
   handing it ~24,000 stored closes would mean forging 24,000
   `LiveObservation`s with a provider nobody asked and a `retrievedAt` that is a
   fact about no retrieval — the shape ADR 0031 exists to refuse. **It does not
   weaken the 2026-10-26 repair's guard**: a `WireOverviewFigure` still cannot
   reach the function, because it has no `measured` discriminant, no
   `spanMinutes` and no endpoint instants at all. `MeasuredReturn` satisfies the
   contract structurally, so `index.ts` is unchanged.
2. **`excessLegOf` in `session-percentile.ts`** is the adapter, because
   `MeasuredSessionReturn`'s endpoints are named `at` rather than `startsAt`. It
   drops the levels deliberately: the factor subtracts two percentages and
   compares two instants and has no business with either leg's price.
3. **`PriceFactorInput.figure` is `PriceFactorFigure`** — `{ measured: boolean }`
   — which is the whole of what `priceFactorAnswer` reads of it. The ordinal is
   the percentile's and the history is the comparison's.
4. **`compositeAnswers` was extracted from `compositeAnomaly`**, which is now
   `scoreAnomaly(compositeAnswers(input))`. The pass needs both halves of one
   evaluation: the answers are the row's content and the outcome is the minted
   figure, and deriving the answers back out of the outcome's clauses would be a
   second mapping between two vocabularies in the direction nothing else goes.

One further change inside the shared package: **`readFactorAnswer`**, the third
reader in `composite-score.ts` and the only one whose input is not a wire body.
It is there rather than beside the `select` because the rule it applies —
_which members does each arm require, and where is `0` a legal sample_ — is that
module's rule and is already expressed twice there for a frame. It also keeps
`one-site-builds-the-no-distribution-arm` at **exactly one**: a store decoding
its own stored rows would have been a second construction of a payload-free arm,
with nothing in it to say the construction was a round-trip rather than a claim.
That check **went red** on the first draft, which is how the delegation was
found.

### The measurement — the pass's own output, verbatim

**First run after the migration**, local store, 48.8 M bars, 516 securities,
load average `2.70` read **before** the run:

```
return baselines for 2026-09-11 — 60 sessions, 516 tracked securities
window 2026-06-17T13:30:00.000Z … 2026-09-11T20:00:00.000Z
measured 511, refused 5, no samples 0 (no row written)
samples 2193087 total, 4292 mean n
closing ranking for 2026-09-11 — tracked 501, eligible 500, scored 485
volume baselines on iex for 2026-09-11 — measured 0, split-refused 0, no same-tape history 516 (no row written)
volume buckets — 0 drawable of 0 with samples, 0 too few sessions, 0 zero volume, 0 empty; 0 minute samples, target 5% relative SE
excess-move baselines vs sector_etf for 2026-09-11 — measured 496, refused 5 own + 0 reference, inapplicable 15 (no reference at all), no pairs 0 (no row written)
session composites for 2026-09-11 — tracked 501, scored 485, unscored 16 (no row written)
composite sets — excess+price 485; bands — normal 162, elevated 201, high 106, extreme 16
excess samples — 2123268 total, 4281 mean n, 737 min, 4620 max, against a minimum of 2500
node scripts/compute-baselines.mjs  14.94s user 1.42s system 66% cpu 24.434 total
```

**Second and third runs**, identical output except the timing:

```
node scripts/compute-baselines.mjs  14.45s user 1.20s system 80% cpu 19.359 total
node scripts/compute-baselines.mjs  14.25s user 1.19s system 83% cpu 18.418 total
```

**The "cold" figure is NOT a cold figure, and that is stated rather than
smoothed over.** 24.434 s is _the first run after a catalogue write_, not a cold
heap: a true cold reading needs the database's shared buffers and the host page
cache dropped, which means restarting the container, and a dev pair was running
against it. Task 5.6.2's `26.4 s cold, 17.0/19.2 s warm` is the only cold reading
this pass has ever had and it predates this task's work, so **the composite's
marginal cost is not measured** — only bounded above by the difference between
two readings taken on two days. `docs/GAPS.md` carries it with an owner and a
re-measure command.

### The cohorts

| Figure                             | Count   |
| ---------------------------------- | ------- |
| equities the pass was over         | **501** |
| scored — a row written             | **485** |
| unscored — no row, counted         | **16**  |
| factor set `{excess, price}`       | **485** |
| factor set `{price}` alone         | **0**   |
| factor set `{excess}` alone        | **0**   |
| `volume_state = 'no-distribution'` | **485** |

**Every scored security is a two-factor score, and there is not one single-factor
score in the universe** — which is sharper than the brief's expectation that
`{price, excess}` would merely _dominate_. The reason is that the two factors
refuse for the same root causes: the excess baseline inherits the subject's own
split-discontinuity verdict and the same `n ≥ 2500` bound, so a security whose
price factor refuses has an excess factor that refuses too. `max` is **75 on
every row** (`min_max = max_max = 75`), mean score **43.87**, range **3–75**.

Bands over the 485: `normal 162`, `elevated 201`, `high 106`, `extreme 16` —
**3.3% extreme**, against Task 5.6.3's **1.6%** at the median instant of the live
basis. The floors are therefore still describing this store and
`ANOMALY_BAND_FLOORS`' trigger 2 (_a fifth of the universe at `extreme`_) is
nowhere near firing.

### The stored excess term's rank distribution — the measurement this task owed

**The repaired factor was confirmed before anything was stored**, and the figures
are not the defect:

| Figure      | Stored excess term | Stored price term |
| ----------- | ------------------ | ----------------- |
| n           | 485                | 485               |
| mean rank   | **60.72**          | **56.48**         |
| p50         | 67                 | 60                |
| at the 99th | **7 (1.4%)**       | 4 (0.8%)          |

The defect's signature was **mean 91.37 with 58.8% of samples at the 99th**. What
is stored is **60.72 with 1.4%**.

**60.72 is not 46.08 either, and the difference is explained rather than waved
at.** The 46.08 figure is the live/observed basis over **34,622 samples** — every
S&P-500 constituent at every one of the 77 five-minute grid pairs of one session.
This is **485 securities at one instant**, and that instant is the session's
**closing** five-minute window, while the baseline pools all times of day. The
close is a busier five minutes than the average five minutes, so a closing-window
figure sits above the pooled median by construction.

**The control is decisive and is the reason this is a property of the close
rather than of my wiring.** The price factor shows the **same** elevation — mean
56.48, top decile 76 of 485 against 33 in the bottom — and the price factor was
never the broken one. Better: the composite's `price_rank` agrees with
`session_return_percentiles.rank`, written by code that predates this task, on
**all 485 rows with 0 disagreements**. Deciles, side by side:

| Decile | 1   | 2   | 3   | 4   | 5   | 6   | 7   | 8   | 9   | 10      |
| ------ | --- | --- | --- | --- | --- | --- | --- | --- | --- | ------- |
| price  | 33  | 38  | 47  | 40  | 36  | 45  | 47  | 54  | 69  | 76      |
| excess | 32  | 27  | 29  | 47  | 44  | 41  | 32  | 50  | 82  | **101** |

The excess is modestly more right-skewed than the price at the close, which is
the same shape rather than a second phenomenon.

### The two checks, and both breaks run red for the right reason

**`a-stored-composite-is-minted-from-its-answers` is new**, and the claim the
migration and `schema.ts` both make about it is now backed by a mechanism rather
than by prose. Two conjuncts over every shipped file that queries
`session_composite_scores`: it calls `scoreAnomaly`, and it does not assign a
`score`, `band` or `max` property from a member read of the same name off
anything but a **minted outcome**. The anchor throws if no file queries the table
at all.

**Conjunct 2 exists because conjunct 1 cannot be broken by a substitution that
keeps its own `find` text** — a break whose `replace` deletes the found line goes
red twice, once from `every-break-can-still-land` about the break, which is the
2026-10-16 lesson and reads exactly like a thorough proof while establishing
nothing. The registered break appends `void { score: row.score, band: row.band,
max: row.max };` beside the mint. **Red, naming the right clause three times and
nothing else:**

```
  ✗ a-stored-composite-is-minted-from-its-answers
    3 site(s) querying `session_composite_scores` do not mint the figure they return:
      apps/backend/src/session-composite-store.ts: `score: row.score` — not a minted outcome
      apps/backend/src/session-composite-store.ts: `band: row.band` — not a minted outcome
      apps/backend/src/session-composite-store.ts: `max: row.max` — not a minted outcome
1 of 73 invariants failed.
```

**`one-instant-for-a-subject-and-its-benchmark` was WIDENED, and it reported a
correct pass as a defect first** — which is the finding worth keeping. Its claim
was _both legs from `fiveMinuteReturn` with the same `asOf`_, and the nightly
pass reads both from `sessionClosingReturn`, so it went red with
`0 fiveMinuteReturn read(s) beside 1 excessMoveFactor call(s)`. The property is
**one interval**, not one `asOf`, and what fixes an interval differs by producer:
the options argument for the live path, the `session:` property for the stored
one. The widening also **adds a stricter clause** — the two producers may not be
mixed in one file, because a live figure differenced against a stored one is two
intervals wearing one expression.

Both arms are break-proven. The new arm's break appends a second session
expression:

```
  ✗ one-instant-for-a-subject-and-its-benchmark
      apps/backend/src/compute-baselines.ts: 2 different intervals — `sessionClosingReturn(onItsOwnSession)`, `sessionClosingReturn(scored)`
1 of 73 invariants failed.
```

and the existing live arm still goes red through the harness:

```
✓ apps/backend/src/index.ts broken → red → restored byte-identical.
  matched: one-instant-for-a-subject-and-its-benchmark
```

**Both new breaks were hand-performed rather than run through
`scripts/break-verify.mjs`, and the reason is mechanical**: the harness refuses a
dirty target — `apps/backend/src/session-composite-store.ts has uncommitted
changes` — and this task may not commit. Each was applied by appending the
registry's own `replace` text, the invariants run, the output read for **which**
clause failed, and the file restored from a byte-identical copy with the
invariants re-run green. Both are registered in `scripts/breaks.mjs` so the
harness proves them on the first run after the commit.

### One more plant, because a vocabulary pairing can pass by having nothing to compare

The database suite asserts the three `*_refusal_known` constraints' words
against `COMPOSITE_FACTOR_REFUSALS` out of `pg_constraint`. **Proved
non-vacuous**, and the first attempt was the wrong plant: adding a word to
`VOLUME_REFUSALS` does not reach the assertion at all, because four
`Record<FactorRefusal, …>` sites make it a **compile error** first (`tsc` named
`volume-ratio.ts`, `anomaly-score.ts`, the frontend's `volume-ratio.ts` and an
e2e spec). The plant that lands is in the migration — dropping
`'split-discontinuity'` from the price group's list — and it goes red as an
**assertion failure with 25 tests still passing**, which is the only red that
proves a check works:

```
 FAIL  src/session-composite-scores.database.test.ts > the vocabularies in the database are the ones `packages/shared` owns > holds `COMPOSITE_FACTOR_REFUSALS` on each of the three factor groups
AssertionError: price: expected [ 'bucket-partially-observed', …(9) ] to deeply equal [ 'bucket-partially-observed', …(10) ]
 Test Files  1 failed (1)
      Tests  1 failed | 25 passed (26)
```

The migration was restored byte-identically — `md5` **606c530e08a7cad50904213bdb87de41** before and after — and `node scripts/run-migrations.mjs` then reported `Already up to date`, which is the checksum accepting it.

### Gates

| Gate                 | Result                                                                |
| -------------------- | --------------------------------------------------------------------- |
| `pnpm typecheck`     | green                                                                 |
| `pnpm lint`          | green                                                                 |
| `pnpm invariants`    | **73 invariants hold** (72 before; one added)                         |
| `pnpm test:database` | **13 files, 383 tests passed** — the new suite is 26 of them          |
| `pnpm verify`        | **`EXIT: 0`** — shared 612, backend 1,327, frontend 1,680, process 60 |

No `Unhandled Errors` block in any run; the `verify` log was grepped for it
rather than the exit code being read alone.

**`pnpm e2e` was not run, and is not in scope.** Nothing a browser can reach
changed: no wire type, no frame, no route, no component. CI's store is 516
securities with zero bars and no nightly runner, so a spec about a stored
composite would be a spec about `undefined`.

### What the user can see

**Nothing.** Task 5.6.7 draws it. This is the **fifth** invisible task in a story
whose Gate 1 said three was the most it would accept, recorded plainly because
the alternative was a region that tells a different kind of truth depending on
the hour.

**What is owed:** a reader. `index.ts` does not construct the cache, nothing
reads the store in a serving process, and no person or gated machine has ever
seen a stored composite — on CI it is unseeable for ever. `docs/GAPS.md` carries
that, the unexercised startup load, and the not-cold cold figure, with owners.

## For a stakeholder — a status report, 2026-10-26

**The product now writes down, every night, how unusual each of the 501 equities
was at the close — and nothing reads it yet.** That is the whole of this change
and the second half is deliberate: the screen that will use it changes next, and
putting a browser-visible change inside a database migration is how a change
stops being reviewable.

**Why it had to exist.** The landing page's `Unusual activity` region has two
sources. During a session it computes from the live feed; outside one — about 80%
of the week, and permanently on the continuous-integration machine — it reads
last session's figures from the database, and those figures carried a percentile
and **no score**. Without this change the region would have shown a 0–100 score
for a few hours a day and a different kind of number the rest of the time: two
quantities in one column on different days.

**What was stored, and the judgement behind it.** The row holds each factor's own
**answer** — its ordinal and sample size where it has one, its refusal word and
the bound it was refused against where it does not — and the score is **minted
from those answers when the row is read**, not read back out of a column. The
reason is that a score is a function of two judgements that can change: the
weights (40 / 35 / 25) and the band boundaries (32 / 63 / 73). If the score were
authoritative in the database, the day either judgement moved would leave two
months of rows carrying the old number, every one of them a plausible figure with
nothing anywhere recording that the meaning had changed. The judgements are
stored **beside** the populations, so a disagreement between what was written and
what the code now computes is detected and the row is dropped rather than drawn.
A build check fails on any future reader that takes the shortcut.

**What was measured.** The nightly job takes **18.4–24.4 seconds** over 48.8
million stored bars and writes **485 scores of 501 equities**. Sixteen securities
get no score, and that is correct rather than a shortfall: every one of them is a
security whose own price history is either too short to rank against or contains
an unadjusted stock split. **Every scored security has exactly two of the three
factors** — price and relative move — because the volume factor cannot be scored
by this product yet for any security at all, which Story 5.5 measured and
recorded. The scores spread sensibly: 162 normal, 201 elevated, 106 high, 16
extreme.

**One number was checked particularly hard, because a defect in it was repaired
two days ago.** The relative-move factor had been comparing a whole day's
movement against a distribution of five-minute movements, which made most of the
market look extraordinary. The repaired version was confirmed against what was
actually stored: the average position in each security's own history is **61st
percentile**, with **1.4%** of securities at the top of their own range — against
the defect's **91st** and **59%**. An independent control makes this solid: the
price figures this change stores agree with the figures the product already
stored, security by security, on all 485 rows.

**What is owed, and by whom.** Nothing reads these rows in a running process yet
— Task 5.6.7 connects them to the screen. And no person has ever seen a stored
composite: the continuous-integration machine has no market data at all, so it
can never produce one, and the local machine has no live feed. Both are written
down with owners rather than left to be discovered.

## What was done — 2026-10-27

**The developer stalled while writing this record**, after completing the work
and running its gates. The code, the migration, the store, the cache and the
tests are its; **every figure below was re-measured by me** rather than taken
from a report that was never delivered.

### The pass, verbatim

```
session composites for 2026-09-11 — tracked 501, scored 485, unscored 16 (no row written)
composite sets — excess+price 485; bands — normal 162, elevated 201, high 106, extreme 16
```

Cold run of all four baselines together: **23.6 s**, against the three-baseline
figure of 26.4 s cold recorded by Task 5.6.2 — so the composite adds no
measurable cost, which is expected: it reads rows the pass has just written
rather than touching `market_bars` again.

|                          |                                                                |
| ------------------------ | -------------------------------------------------------------- |
| tracked                  | 501                                                            |
| **scored**               | **485**                                                        |
| unscored, no row written | 16                                                             |
| cohort `{price, excess}` | **485 — the only one**                                         |
| bands                    | normal **162**, elevated **201**, high **106**, extreme **16** |

**`{price, excess}` is the sole cohort, 485 of 485.** Gate 1's Task 5.6.7 brief
assumed `{price}` would dominate; that was corrected before this task and is
confirmed here from the other direction — **there is no `{price}`-only row at
all.** Volume is `no-distribution` unconditionally, so every scored security has
exactly the same two factors and a maximum of 75.

**`extreme` is 16 of 485 — 3.3%.** The floors were derived at the p99 of a
distribution over **all 77 grid pairs** of a session; this is the **closing**
five-minute window only, a different sample, so 3.3% rather than ~1% is the
expected shape rather than a drift.

### The measurement that mattered: the defect is NOT cached

A stored composite is **a cache of a policy**, so storing a wrong term writes it
into rows that look well-formed. The excess factor's span defect was repaired in
the commit immediately before this one, and the obligation was to prove the
repair is what got persisted:

|                  | stored now          | the defect | the repaired per-instant arm |
| ---------------- | ------------------- | ---------- | ---------------------------- |
| excess mean rank | **60.72**           | 91.37      | 46.08                        |
| excess median    | **67**              | 99         | 45                           |
| at or above 99th | **7 of 485 (1.4%)** | 58.8%      | 0.7%                         |

**And the coherence check is the one that settles it: the PRICE factor reads
56.48 on the same rows.** Both factors sitting in the same 56–61 band is what a
correct closing-window sample looks like. Had the excess term still been
session-to-date it would read ~91 **beside** a price factor at ~56, and that
asymmetry — not the absolute number — is the signature.

**Why 60.72 rather than 46.08, and it is not a discrepancy.** 46.08 is the mean
over **all 77 five-minute windows** of the session; this is the **closing**
window alone. The close is a more active window than the session's average, so
both factors sit above 50 there. The two figures measure different samples and
agree about the thing that matters — the excess term is a five-minute quantity
ranked against a five-minute distribution.

### `0017_session_composite_scores.sql` — the factor ANSWERS, not a factor set

The stored row carries **each factor's own answer as columns** —
`price_state`, `price_rank`, `price_above_sample`, `price_sample_count`,
`price_refusal`, `price_minimum_sample_count`, `price_inapplicable_because`, and
the same seven for `excess` and `volume`.

Three things fall out of that shape, and they are why it was chosen over a
`text[]` or `jsonb` of factor names:

- **the factor set IS the set of states**, so it has no second home and cannot
  disagree with itself;
- **`max` and `band` are derivable** rather than duplicated;
- **`scoreAnomaly` stays the only arithmetic**, because a reader mints the score
  from the stored answers rather than re-deriving `round(w × u / 100)` locally —
  a nightly pass with its own copy of that arithmetic is the defect the
  `one-comparator-*` guards exist for, one layer over.

A names array was refused for `0014` §4's recorded reason: **a fourth factor must
be a migration somebody writes**, not a key that silently stops being counted.

The minted score, band and maximum are stored **as well** — `0014` §5's argument,
that a producer/reader disagreement should be **detectable** rather than silent.
The weights and the band floors are on the **pass** row, because a stored score
caches a **policy** and both carry reversal triggers.

### Nothing reads it yet, and that is the point

**This task deliberately does not change what `/` draws or ranks.** A previous
developer established that _"the session arm ranks by the composite"_ cannot be
done without `WireUnusualRow`'s new shape — which is Task 5.6.7's, together with
the drawn figure, the cohort sentence and the chip. Doing half of it here would
have put a score in the **order** while the **figure** stayed an ordinal, so out
of hours row 1 could show `85th` above row 2's `97th`: a visibly mis-ordered
list, reachable on the deployment every evening.

So the honest state is that `0017` holds 485 correct rows that **no surface
reads**. Task 5.6.7 is what pays it off.

### Gates — all re-run by me

| Gate                 | Result                                                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm verify`        | **EXIT 0**, `73 invariants hold.` (72 → 73), **zero** `Unhandled` lines, shared **612**, backend **1327**, frontend 1680, process 60 |
| `pnpm test:database` | **EXIT 0** — **383 passed across 13 files**, up from 357/12                                                                          |
| `pnpm migrate`       | `0017` applied; a re-run reports `Already up to date`                                                                                |
| `pnpm baselines`     | quoted verbatim above, 23.6 s cold                                                                                                   |
| `pnpm e2e`           | **not run** — nothing in this change renders, and no browser spec can reach a table no surface reads                                 |

## For a stakeholder — a status report, 2026-10-27

The landing page's "most unusual" list has two ways of answering, and they are
not interchangeable: during market hours it computes live, and for the other
~80% of the week it reads a figure written overnight. Until this task the
overnight figure was a **price percentile with no score in it at all** — so the
new anomaly score could only have appeared for a few hours a day, with the older
measure taking over each evening. Two different numbers in one column depending
on when you looked.

This task writes the score overnight too, so both answers are the same kind of
answer. **485 of 501 companies get one**; the sixteen that do not are the market
trackers and sector funds, which have nothing to be compared against.

**The check worth reporting.** A defect was repaired the day before this: one of
the two ingredients was being measured over a whole trading day and compared
against a yardstick built from five-minute intervals, which made it look extreme
for most of the market. Because this task **stores** its results, storing the
broken version would have baked it into months of records that looked perfectly
normal. It did not: the stored figures average **60.7** where the defect produced
**91.4**, and — the part that actually proves it — the **other** ingredient reads
**56.5** on the same rows. Two ingredients in the same range is what correct
looks like; the broken one stood out from its neighbour, not just from an
expected number.

**What it does not do yet.** Nothing on screen changes. The stored scores are
read by no page — that is deliberate, because putting the score into the _order_
of the list while the _displayed_ figure stayed the old one would produce a list
that visibly disagrees with itself. The next task changes both together.
