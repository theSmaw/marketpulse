# Task 5.5.3 — The volume baseline, computed and persisted

**Status:** Complete — 2026-10-20 — **95.5% of buckets refuse on the BETTER tape at full depth** (38,448 of 40,248), and **173 of 516 securities have no drawable bucket at all**; the `iex` arm Gate 1 chose is **0 of 0**, all 516 `no-same-tape-baseline`. The **tape is in the key**, because Gate 1's decision carries a reversal trigger and a flip against a session-only key would rewrite every row with nothing recording it. `Done when 3` is met for **four of six** refusal kinds, said plainly rather than finessed. And a draft's `double precision` was refused by a guard with **no exemption mechanism** — which exposed that `double precision[]` escapes that same guard by its type's **shape** rather than by anybody's leave.
**Story:** [5.5 The Volume Factor, & the Tape It Rests On](STORY.md)
**Depends on:** 5.5.2

## Objective

A median volume for the same time of day, per security, **on the same tape as
the numerator** — which Gate 1 decision 1 makes `iex`.

## What the user can see when this lands

**Nothing.** Task 5.5.4 draws it.

## Work

- **`0015_volume_baselines.sql` plus its companion pass row.** Not an extension
  of `return_baselines`, and the hand-off's premise is false in three ways:
  that table has **no `feed` column** (the tape is a serving constant,
  `BASELINE_FEED = "sip"`), so extending means one row holding two
  distributions with nothing saying which; it would weaken the shipped
  `return_baselines_one_answer` check and duplicate `sample_count` and
  `refusal`, because a security can be price-refused and volume-fine or the
  reverse; and a second table does **not** imply a second pass.
  **Both tables labelled DERIVED and RECOMPUTABLE in three places** — the
  migration, `schema.ts` and the ADR — as `0013` §1 and `0014` both do, with the
  recompute command stated. The companion row is Story 5.4.5's generalisation:
  **the absence of rows is indistinguishable from the absence of a pass**, and
  AC 6 puts the depth on screen. `observed_at` takes **no default**.
- **One pass, not two.** Fold the aggregation into `compute-baselines.ts`'
  existing per-security loop. Adding `volume` to `windowQuery`'s `select` costs
  **no extra I/O** — the same 538 blocks, the same index scan, one more column
  deserialised. A second nightly pass doubles 11.78 s warm for nothing.
- **`feed = 'iex'` by name, in the query's own `where`.** Not `readSeries`, not
  `readBars` — **neither takes a feed parameter, so there is nothing to pass**.
  `readSeries`' `distinct on (observed_at)` is correct only because it is
  already filtered to one symbol; copied without that predicate it **collapses
  across securities**. With no tie-break the surviving row per instant is
  arbitrary — mixed tapes inside one distribution. `SERVED_TAPE_RANK` is a
  **preference** for serving the best history; this needs a **restriction**.
- **5-minute buckets sampled per MINUTE** (Gate 1 decision 4), ~322 KB at 78
  buckets × 516. The **bucketing division** is the clause a re-implementer
  cannot avoid and it matches **no existing conjunct** — the three minute-scaled
  ones key on a subtraction from `getTime()`.
- **The lookback is NOT a new quantity**: read `BASELINE_LOOKBACK_SESSIONS` and
  obtain the window by calling **`baselineWindowEndingAt`**, never
  `lastMarketSessions` — the fourth conjunct matches the identifier branch too,
  so its own failure message's advice would fail the check. **No fifth conjunct
  is owed for the lookback**; the bucket width may owe one.
- **The floor is DERIVED from 5.5.2's measured dispersion**, not copied.
  `BASELINE_MINIMUM_SAMPLE = 2500` is unusable: `50/√n ≤ 1` is the precision of
  an **integer percentile ordinal**, not of a median ratio. Do not reuse 2,500 or
  its shape.
- **The split refusal is READ from `return_baselines`**, not re-derived — the
  guard is a ratio over two **closes** at a session boundary and volume
  legitimately moves 10× day to day. A split breaks volume **harder**: the share
  count multiplies by exactly the factor the price divides by, so an unadjusted
  10:1 split is a **+900%** figure.
- **Six refusal kinds, not five.** `split-discontinuity` (read),
  `too-few-sessions` (per bucket, counted), `no-same-tape-baseline`,
  `zero-volume-baseline` (**a refusal, not an `Infinity`** — `directionOf`'s
  precedent), `no-bar-in-bucket` (absent, **never 0**), and
  **`bucket-partially-observed`**, which `STORY.md` misses: a bucket holding 2
  of 5 minutes has a smaller volume for a **coverage** reason, and scaling by
  5/2 is an imputation. Story 5.2 shipped **four** kinds for exactly this
  distinction. Say which pairs would read alike if collapsed.

## Done when

1. The migration applies locally and in `pnpm test:database`, with its **deployed
   cost measured** against `deploy.yml`'s `timeout 120` and the tier's 10 MiB/s.
2. The nightly pass's total is **re-measured**, not assumed unchanged — this
   epic got that wrong once by 20–66×.
3. Every refusal kind has a test, and the two tapes are exercised by
   `pnpm test:database` **against a hand-built two-tape store**.
4. A guard that the volume read spells its `feed` predicate and never calls
   `readBars`, **proved green on the defect first** — the plant is a reducer
   keyed on the instant with **no tie-break**, which names a tape nowhere,
   typechecks, runs, and takes whichever row the planner returned.
5. `pnpm verify` and `pnpm test:database` green.

## Amended by Task 5.5.2 — 2026-10-20: the floor is settled, and it refuses almost everything at first

**The owner's decision, taken 2026-10-20: one decimal, and refuse per bucket
where the measured dispersion cannot support it.** So `4.1× typical` keeps its
decimal and the floor is **derived from the printed precision**, which is this
epic's own rule (`BASELINE_MINIMUM_SAMPLE`'s `50/√n ≤ 1`) applied to a different
kind of number.

**The arithmetic, and it is a FUNCTION rather than a constant.** Relative
SE ≈ `√(π/2)·CV/√n` for a median, so the floor is
`n ≥ (√(π/2)·CV / target)²` **per bucket**, with `CV` **measured** rather than
assumed. `√(π/2)` is **computed, never typed as 1.253** — Task 5.5.2 already
does this. **Do not reuse `BASELINE_MINIMUM_SAMPLE = 2500` or its shape**: that
is the precision of an **integer percentile ordinal**, and a bucket median's
`n` is a different quantity entirely.

**What it refuses, measured on the full-depth `sip` tape at 60 sessions** —
these are the figures the decision was taken against, so the task should
reproduce them rather than discover them:

| symbol | CV median | achieved rel. SE | sessions for 5% |
| ------ | --------- | ---------------- | --------------- |
| `NVDA` | 0.657     | **4.75%**        | 98              |
| `AAPL` | —         | 6.50%            | 259             |
| `SPY`  | —         | 6.69%            | 311             |
| `XLK`  | —         | 8.19%            | 533             |
| `CCI`  | 1.308     | 9.51%            | 727             |
| `ERIE` | 1.284     | **16.22%**       | 397             |

**Only `NVDA`'s median bucket meets 5% on the better tape.** The `iex` tape
Gate 1 chose has **1.9–24.9%** of that depth and **18 sessions** of history, so
**expect the refusal to be the answer for essentially every security for
weeks** — which the owner accepted explicitly at Gate 1 when choosing same-tape
`iex`, and which `LIVE-REHEARSAL.md` row 5.5 records as _unwatchable_ rather
than unwatched.

**So the refusal sentence is the thing this task mostly ships**, and it must say
which refusal it is. `Not enough history to say how typical this is` is the
depth case and is **not** the same as `no-same-tape-baseline`, which is _we have
no IEX history for this security at all_. Both are in the six kinds above.

**One consequence for the floor's own honesty.** The floor is computed from a
`CV` measured over the **same window** whose `n` it then judges — so on a thin
window both the estimate and its own precision bound are noisy. Say so beside
the constant; do not pretend the bound is exact.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — 2026-10-20

### What shipped

**`0015_volume_baselines.sql` — two tables, the schema's fourth and fifth
derived ones**, both labelled DERIVED AND RECOMPUTABLE in three places (the
migration's §1, `schema.ts`, and ADR 0044's amendment is owed by the story
close) with the recompute command stated, and `observed_at` taking **no
default** on both.

- `volume_baselines`, keyed `(security_id, observed_at, feed)` — **the tape is
  in the key**, which is where this diverges from `0013` (no tape at all) and
  `0014` (tape as a pass attribute). Gate 1 decision 1's reversal trigger is
  why: a flip from `iex` to `sip` would otherwise update every row in place
  with nothing recording that the distribution changed tape, and no widening
  migration is ever needed this way.
- `volume_baseline_passes`, keyed `(observed_at, feed)` — ADR 0044's own
  generalisation, and it bites harder here than at `0014`: a security with no
  `iex` bar gets **no row**, so the ordinary state of the table beside it is
  **empty** for weeks. Proved on the real store below.

**Three parallel arrays rather than a row per bucket** — `bucket_medians`,
`bucket_samples`, `bucket_errors`, all held to `bucket_count` by
`volume_baselines_bucket_arity`. The arithmetic: 78 × 516 is ~322 KB an array
and **~966 KB for three** (three times Gate 1's figure, which priced one),
against **40,248 rows a session** and ~10 M a year for the per-bucket shape,
which would break the no-index argument `0013` §6 rests on.

**`apps/backend/src/volume-baseline.ts`** — pure, reads nothing: the grid's
division, the per-bucket median through `breakpointsOf`, the derived precision
bound, the six-member refusal vocabulary, and `comparableVolumeBaseline`, which
is `comparableBaseline`'s shape and applies the bound **when the row is read**
so moving the target is a deploy rather than a recompute of 516 securities.
`MEDIAN_SE_FACTOR`, `TARGET_RELATIVE_STANDARD_ERROR` and
`coefficientOfVariation` **moved here from `volume-share.ts`**, and
`volumeBucketOf` is now the one home for _which time of day is this minute_ —
the dispersion instrument that measured the floor is a reader of the policy
rather than its owner, and `(MEDIAN_SE_FACTOR * cv) / Math.sqrt(n)` existed in
two copies before.

**`apps/backend/src/volume-baseline-store.ts`** — the fifth instance of
`market-bars.ts`' seam, and the module that spells
`.where("market_bars.feed", "=", VOLUME_BASELINE_FEED)` in the query's own
`where`. Its header records why each of the four alternatives was refused
rather than only that it was: `readSeries`' `distinct on` is correct only while
filtered to one symbol, `readBars` answers every row by design, neither **takes
a feed parameter at all**, and `SERVED_TAPE_RANK` is a preference where this
needs a restriction.

**One pass, not two.** Folded into `compute-baselines.ts`' existing
per-security loop, immediately after the close read so the 538 blocks are hot,
and the split verdict is **read** from the price generation already in hand
(`VOLUME_REFUSAL_FOR_A_PRICE_REFUSAL` is a `Record` over the closed union, so a
second stored price refusal is a compile error rather than a verdict silently
not inherited).

### The lookback owes no conjunct, and the bucket width owes none either

`BASELINE_LOOKBACK_SESSIONS` is read and the window obtained by calling
**`baselineWindowEndingAt`**, never `lastMarketSessions` — so
`one-home-for-the-observation-window`'s fourth conjunct still finds exactly one
shipped file fixing a session lookback. And the **bucket width is
`SAMPLE_SPAN_MINUTES`**, the anchor grid's own stride (Gate 1 decision 4: _one
span serves both_), reached through one exported division that `volume-share.ts`
now also goes through. It is not a new quantity, so it owes no fifth conjunct;
what it would owe one for is a **second** stride, and there is one home for it
by construction instead.

### The migration's measured cost

Three runs of the two `CREATE TABLE`s on a scratch database holding only
`securities`, through `psql \timing`:

| run | `volume_baselines` | `volume_baseline_passes` | total       |
| --- | ------------------ | ------------------------ | ----------- |
| 1   | 3.425 ms           | 1.534 ms                 | **4.96 ms** |
| 2   | 3.504 ms           | 1.467 ms                 | **4.97 ms** |
| 3   | 3.651 ms           | 2.086 ms                 | **5.74 ms** |

**4.96–5.74 ms of catalogue work**, against `0014`'s 9–14 ms and `deploy.yml`'s
`timeout 120`. Every statement is a catalogue write: two `CREATE TABLE`s on new
relations, one foreign key installing two triggers on `securities`
(`SHARE ROW EXCLUSIVE`, conflicting with neither a read's `ACCESS SHARE` nor a
child insert's `ROW SHARE`), two unique constraints and the checks on empty
tables. **Nothing touches `market_bars`, `securities`, `return_baselines` or
either of `0014`'s tables**, so README §9's 10 MiB/s arithmetic is not engaged.
`pnpm migrate` end to end was **0.540 s** including Node's own startup.

### The nightly pass, RE-MEASURED rather than assumed

Local store, 48.8 M bars, window ending 2026-09-11, 516 tracked securities.
Blocks rather than interleaved samples, because each arm needs a rebuild —
`0014` §'s own arrangement and its own caveat.

| arm                             | samples                             | median      |
| ------------------------------- | ----------------------------------- | ----------- |
| with the volume half (n = 5)    | 13.34, 14.50, 12.65, 13.27, 14.42 s | **13.34 s** |
| control, volume removed (n = 3) | 19.65, 13.97, 14.40 s               | **14.40 s** |

**The added cost is below this machine's noise floor** — the new-code arm's
median is _faster_ than the control's, which is 5.4.5's finding arriving again.
**And the figure has a caveat that is not optional:** this laptop holds **zero
`iex` rows**, so the 516 extra index range scans find nothing and deserialise
nothing. What is measured is the **empty-tape** case, which is every laptop's
and CI's permanent state and not the deployed one. On a store with real `iex`
depth the read returns rows and the cost is unmeasured — named here rather than
projected, because this epic got a derived cost wrong once by 20–66×.

The summary, verbatim, from the run after the re-applied migration:

```
return baselines for 2026-09-11 — 60 sessions, 516 tracked securities
window 2026-06-17T13:30:00.000Z … 2026-09-11T20:00:00.000Z
measured 511, refused 5, no samples 0 (no row written)
samples 2193087 total, 4292 mean n
closing ranking for 2026-09-11 — tracked 501, eligible 500, scored 485
volume baselines on iex for 2026-09-11 — measured 0, split-refused 0, no same-tape history 516 (no row written)
volume buckets — 0 drawable of 0 with samples, 0 too few sessions, 0 zero volume, 0 empty; 0 minute samples, target 5% relative SE
```

And the pass row that run wrote, which is the whole argument for the second
table — an empty `volume_baselines` beside a row saying **why** it is empty:

```
observed_at                    | 2026-09-11 20:00:00+00
feed                           | iex
tracked_count                  | 516
measured_count                 | 0
split_discontinuity_count      | 0
absent_count                   | 516
target_relative_standard_error | 0.050000
```

### What the floor refuses ON THE REAL STORE

The `iex` arm is **0 of 0**: the tape is empty on this machine, so all 516
securities are `no-same-tape-baseline` and no row is written. That is Gate 1
decision 1's accepted outcome rather than a fault, and it is the only answer
this laptop can give for the shipped tape.

So the floor was measured on the **only arm that exists here**, the full-depth
`sip` tape, with a throwaway read-only instrument running the shipped
`volumeBaselineOf` and `comparableVolumeBaseline` over the same window
(`run it, record the findings, delete it` — the instrument is gone):

```
window 2026-09-11, 60 sessions, tape sip
target relative SE 0.05
securities: 516 tracked, 516 measured, 0 no samples
securities with at least one DRAWABLE bucket: 343
buckets: 40248 with samples — 1800 drawable, 38448 too few sessions, 0 zero volume; 0 empty
top 8 by drawable buckets:
  INTC  drawable 61  best bucket rel.SE 3.08%
  MU  drawable 54  best bucket rel.SE 3.09%
  NVDA  drawable 48  best bucket rel.SE 3.01%
  TSLA  drawable 47  best bucket rel.SE 3.83%
  AMD  drawable 41  best bucket rel.SE 3.56%
  STX  drawable 40  best bucket rel.SE 3.74%
  CVX  drawable 36  best bucket rel.SE 3.15%
  LITE  drawable 35  best bucket rel.SE 3.72%
worst: PCG drawable 0 best bucket rel.SE 7.81%
```

**The floor refuses 38,448 of 40,248 buckets — 95.5% — on the BETTER tape at
full depth**, and **173 of 516 securities have no drawable bucket at all**.
Three things in that worth carrying forward. **It corroborates the amendment's
table rather than discovering something new**: `NVDA` is the third-best name
here and only 48 of its 78 buckets clear 5%, which is what a median bucket at
4.75% predicts. **`zero_volume` is 0 and `empty` is 0** — every session between
2026-06-17 and 2026-09-11 is a regular one, so the grid is exactly 78 × 516 and
the consolidated tape has a bar in every bucket of it; the zero-volume refusal
is reachable in a test and has not been reached on real data. And **the ranking
is liquidity**, which is the right shape for a precision bound over a
heavy-tailed quantity.

### Why this task's session figures differ from Task 5.5.2's, which is not a contradiction

**Task 5.5.2 reports `sessionsForTargetError` from the p90 bucket; the figures
here are the median bucket.** `NVDA` is **98** sessions there and **54** here,
and both are right:

|                              | CV    | samples needed | sessions |
| ---------------------------- | ----- | -------------- | -------- |
| `NVDA`, p90 bucket (5.5.2)   | 0.881 | 487            | **98**   |
| `NVDA`, median bucket (here) | 0.657 | 271            | **54**   |

Same formula — `n ≥ (√(π/2)·CV / 0.05)²` at 5 samples a session — different
bucket. **The p90 figure is the conservative one and is the right one to quote
for "can this security be drawn at all"**; the median figure says how the
_typical_ bucket fares. Verified independently: the ceiling is **CV ≤ 0.691** at
300 samples, which is why `NVDA` (0.657) clears and `AAPL` (0.898), `ERIE`
(1.284) and `CCI` (1.308) do not. A future reader comparing 98 against 54 should
read the column headings rather than infer an error.

### Six refusal kinds, and which pairs would read alike

`VOLUME_BASELINE_REFUSALS` is a closed six-member union so the story that draws
the figure cannot collapse two of them without a compile error.
`VOLUME_BASELINE_STORED_REFUSALS` is the one-member subset the database backs,
with the `PercentileRefusalIsASuperset` type-level assertion copied.

| kind                        | producer                       | tested here |
| --------------------------- | ------------------------------ | ----------- |
| `split-discontinuity`       | read from the price generation | yes         |
| `too-few-sessions`          | the read-time precision bound  | yes         |
| `no-same-tape-baseline`     | the absence of a row           | yes         |
| `zero-volume-baseline`      | a bucket median of `0`         | yes         |
| `no-bar-in-bucket`          | **the numerator — Task 5.5.4** | **no**      |
| `bucket-partially-observed` | **the numerator — Task 5.5.4** | **no**      |

**Done when 3 is met for four of six and not for six, said plainly.** The last
two are facts about the **numerator's** bucket, and this task ships no
numerator — the word is declared so it cannot be folded away, and producing it
is the drawing story's. Inventing a producer here to satisfy the criterion
would have meant committing to the numerator's contract, which is a real
product decision (a five-minute sum against a per-minute median is a **rate**,
never five times this median) and is 5.5.4's to take.

Which pairs would read alike if collapsed, in the order they cost most:

- **`too-few-sessions` / `no-same-tape-baseline`** — _we have 18 sessions and
  need 98_ is a **wait**; _we have never heard IEX for this security_ is a
  **gap in our listening**. One resolves itself on a date nobody controls, the
  other needs somebody to look at the live writer. `PERCENTILE_REFUSALS` went
  the other way with `too-few-samples` and could, because `0 of 2,500 returns`
  is a true sentence about both; here the tape makes them different facts.
- **`no-bar-in-bucket` / `bucket-partially-observed`** — _IEX printed nothing in
  these five minutes_ and _IEX printed in two of them_. A venue fact and a reach
  fact, and only the second tempts a re-implementer into multiplying by `5/2`,
  which is an imputation. Story 5.2 shipped four kinds for this distinction.
- **`zero-volume-baseline` / `too-few-sessions`** — a thin bucket's median is
  routinely `0`, so both hold at once. The precision question is asked **first**
  because it is the informative one; the order has its own test.
- **`split-discontinuity` / `no-same-tape-baseline`** — alike to a reader,
  different for an operator: 60 sessions of refusal against no rows at all.

### The check, proved GREEN on the defect first

`the-volume-baseline-reads-one-tape-by-name`, four conjuncts: the constant is
assigned exactly once; **exactly one** shipped query restricts a `market_bars`
read to `VOLUME_BASELINE_FEED` in its own `where` (zero is a failure); every
volume-selecting query in that module carries a `feed` predicate; and nothing
that computes a volume baseline reaches `readBars` or `readSeries`. Break:
`a-volume-read-that-names-no-tape`.

The plant is the edit a re-implementer makes —
`.where("market_bars.feed", "in", ["iex", "sip"])` over a mapper keyed on the
bar's instant with no tie-break, which reads as _be explicit about the tapes_
and is the opposite. It **typechecks and lints clean**:

```
$ tsc -b
$ eslint . --max-warnings 0
```

and it **runs and is wrong**, against the two-tape fixture:

```
× answers ONLY `iex` minutes, and the count alone separates it from a feed-blind read
× takes the `iex` volume and NOT whichever row the planner returned
× stores three aligned arrays with the grid's arity, and the tape in the key
× writes a refusal with no buckets at all, which the database enforces
AssertionError: expected 8 to be 7
AssertionError: expected 9000000 to be 100
AssertionError: expected 7 to be 6
AssertionError: expected '7' to be '6'
      Tests  4 failed | 11 passed (15)
```

**The draft check reported this, with that tree on disk:**

```
65 invariants hold.
```

The draft's conjunct was _the store module still names `VOLUME_BASELINE_FEED`_
— green, because the constant is still named by the row's own `feed` column and
by the `none` refusal's message, **neither of which is a predicate**. The real
check, same tree:

```
✗ the-volume-baseline-reads-one-tape-by-name
  0 shipped files restrict a `market_bars` read to `VOLUME_BASELINE_FEED` in the query's own `where`, expected exactly 1:
    (none at all)
1 of 65 invariants failed.
```

The target was restored and the checksum matched either side —
`4a272ee3835aadebd1eaecd271d637e05ddd45ee1dbf170e94061d33928574df` before and
after — and `65 invariants hold.` again.

**The found conjunct was DELETED rather than kept, and that is the opposite of
Task 5.5.1's call on the same rule.** 5.5.1 kept its weak line because it was
one of two conjuncts and deleting it would have tripped the other; 5.5.2 deleted
its own because a single-behaviour gate that cannot fail _is_ the defect. This
is 5.5.2's case: there is no second behaviour for _the module mentions the
constant_ to guard, and a conjunct satisfied by an insert's column value can
never fail for the reason it was written.

`pnpm break a-volume-read-that-names-no-tape` **refuses**, correctly —
`apps/backend/src/volume-baseline-store.ts has uncommitted changes` — because
the harness restores by overwriting and the file is new in this change. The
hand-performed transcript above, with the checksum either side, is the proof;
the registry entry is in place and `every-break-can-still-land` holds, so the
break is runnable the moment this lands.

### A real find: this repository forbids a floating-point SCALAR outright

The first draft gave the pass row's precision target `double precision`, with a
comment arguing `0013` §5's case — not money, not a price, nothing summed.
**`pnpm test:database` refused it**: `migrate.database.test.ts` carries _has no
floating-point column anywhere_, over every non-bookkeeping column, **with no
exemption mechanism**.

```
- []
+ [ { "column_name": "target_relative_standard_error",
+     "data_type": "double precision",
+     "table_name": "volume_baseline_passes" } ]
  Test Files  1 failed | 10 passed (11)
       Tests  1 failed | 332 passed (333)
```

The column is now `numeric(18, 6)`, which 0.05 is exact at. **The part worth
recording is why `0013`'s `breakpoints` survives that check**: it reads
`information_schema.columns.data_type`, which is `ARRAY` for a
`double precision[]` and `double precision` for a scalar. So `0013` §5's
argument and this file's three arrays escape **by their type's own shape rather
than by anybody's leave**, and a scalar float is refused outright. Both the
migration's §6 and `schema.ts` now say so, because the next author writing a
derived scalar will reach for the same argument and the same suite will refuse
it.

### What was run, and what it said

| command                                                               | result                                                                                                                                                                                                            |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm migrate`                                                        | `✓ 0015_volume_baselines`, **0.540 s**                                                                                                                                                                            |
| `psql \timing` over the DDL, ×3                                       | **4.96 / 4.97 / 5.74 ms**                                                                                                                                                                                         |
| `pnpm --filter @marketpulse/backend test src/volume-baseline.test.ts` | **24 passed**                                                                                                                                                                                                     |
| `pnpm test:database`                                                  | **11 files, 333 passed**                                                                                                                                                                                          |
| `pnpm baselines`, ×5 with and ×3 without                              | median **13.34 s** against **14.40 s**                                                                                                                                                                            |
| `pnpm verify`                                                         | **exit 0** — `65 invariants hold.`, `45 components, 45 stories files.`, shared **509**, backend **1224**, frontend **1629**, scripts **21** (`skipped 0`, `todo 0`), process **60**. No `Unhandled Errors` block. |
| `node scripts/check-invariants.mjs` on the plant                      | **1 of 65 failed**, naming this check                                                                                                                                                                             |
| `pnpm break a-volume-read-that-names-no-tape`                         | refused — uncommitted target; hand-performed instead                                                                                                                                                              |

**`pnpm e2e` was NOT run**, deliberately: this change touches no frontend file,
adds no route and alters no rendered string, and the brief asked for it to be
skipped on a memory-starved machine.

### What a reader can see

**Nothing.** Task 5.5.4 draws it. And what **no gated machine and no person has
ever seen is a volume baseline with a single row in it**: `live-bar-writer.ts`
only runs where a provider is configured, so the `iex` tape is empty on CI and
on every laptop, the pass writes 516 absences and one pass row, and the figure
becomes available on a **date nobody controls**. `LIVE-REHEARSAL.md` row 5.5 is
**unwatchable** rather than unwatched, which is what Gate 1 already recorded.

### What is false in the task file or the brief, said plainly

1. **The brief's `0015` §3-ish premise that `double precision` is available for
   a scalar is false** — see the find above. Both the task file's framing (via
   `0013` §5) and my own first draft reasoned correctly about the _mechanism_
   and wrongly about what this repository mechanically allows.
2. **Gate 1's `~322 KB at 78 buckets × 516` prices ONE array and the shipped row
   holds three** — ~966 KB. The median alone cannot carry a counted `n` or a
   measured precision, and both are required: `n` because the surface states it,
   and the error because the bound has to be applicable at read time. The figure
   is not wrong, it is answering a narrower question than the shipped shape asks.
3. **`STORY.md`'s hand-off item 4 says a floor is "derived, not chosen"; the
   shipped floor is derived AND has one chosen input**, and it is
   `TARGET_RELATIVE_STANDARD_ERROR`. The owner chose one decimal; everything
   multiplied by it is measured. Saying the floor is purely derived would
   over-claim, and `volume-share.ts` already said so for the dispersion block.
4. **The task file's "Say which pairs would read alike if collapsed" has a
   fourth pair the brief does not list** — `split-discontinuity` against
   `no-same-tape-baseline`, which are one sentence to a reader and two different
   operator actions.
5. **The brief's "Re-measure the pass's total afterwards" cannot see what it is
   aimed at on this machine.** The re-measure is honest and the number is real,
   but with zero `iex` rows locally it measures 516 index probes that find
   nothing — so it bounds the _empty-tape_ cost and says nothing about the
   deployed one. Recorded as a caveat rather than quietly presented as the
   answer.
6. **`VOLUME_BASELINE_REFUSALS` is in `apps/backend/src` and not in
   `packages/shared`**, against the shape `RETURN_BASELINE_REFUSALS` set. The
   precedent followed is `ReturnRefusal` in `five-minute-return.ts`: the
   vocabulary goes to `packages/shared` when the **wire** carries it, which is
   5.5.4. Putting it there now would be scaffolding ahead of the step.

## For a stakeholder — a status report, 2026-10-20

**The product now computes, every night, what a typical minute of trading looks
like at each five minutes of the day, for every security we track — and it
writes down why it cannot, security by security, whenever it cannot.**

Nothing is on screen yet; the next task draws it. What this one settled is the
two hard questions underneath the figure.

**The first is which tape.** The volume number a reader will see is measured on
IEX, one venue, because that is where our live feed comes from — and comparing a
single venue's volume against the whole market's history would make every
security look permanently quiet. So the baseline is built from the same venue,
by name, in the database query itself, and a guard in the build refuses a change
that quietly drops that restriction. That guard was deliberately tested against
the wrong version first: with the restriction removed the code compiled, passed
every style check, ran, and produced a figure **30,000× too large** — and a
weaker draft of the guard said everything was fine. The shipped guard says it is
not.

**The second is when we are allowed to print the number at all.** A figure drawn
as "4.1× typical" claims its first decimal place is real, and whether it is
depends on how much history we have and how erratic that security's volume is.
The answer is arithmetic rather than a judgement, and it is uncomfortable:
measured against the **best** data we hold, at full depth, **95.5% of these
time-of-day slots cannot support one decimal**, and 173 of 516 securities have
none that can. On the venue the figure will actually use — which has existed
only since late September — the honest answer today is that **not one security
qualifies**. The product says so rather than printing a number it cannot stand
behind, in four distinct sentences depending on which thing is missing, because
"we need more history" and "we have never heard this venue for this security"
are a wait and a fault and should not look the same.

**What it cost.** The database change is **five milliseconds**, against a
two-minute deployment budget. The nightly job's total is unchanged within
measurement noise. Neither figure flatters anything: the nightly measurement was
taken on a machine with none of the venue data the job will eventually read, and
that is written down beside it rather than left to be assumed.
