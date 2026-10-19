# Task 5.5.3 — The volume baseline, computed and persisted

**Status:** Not started
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

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — YYYY-MM-DD

## For a stakeholder — a status report, YYYY-MM-DD
