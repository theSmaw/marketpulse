# 0044 — A derived aggregate is computed nightly and keyed by the session it is for

**Status:** Accepted
**Date:** 2026-10-14
**Story:** [5.3 The Baseline, & the Price Percentile](../../planning/epic-05-anomaly-detection/story-03-the-baseline-and-the-price-percentile/STORY.md), Tasks 5.3.1 and 5.3.2

## Context

Epic 5 needs a **60-trading-session distribution of five-minute returns, per
security**, to say how unusual today's move is. It is the first quantity in this
product that **no request path can produce**.

The arithmetic, measured cold on a store holding 48,797,343 bars: a single
security's 60-session read is **538 blocks** and 24,142 rows at **~45 rows a
block**, so the whole universe is **~269,538 blocks ≈ 2,105 MB**. At the
deployed tier's 10 MiB/s that is **~3.5 minutes**; at its **120 provisioned
IOPS** (`HOSTING.md` — not the SKU's advertised 640) with uncorrelated fetches
it is **~37 minutes**. Either way it is minutes, and three paths are therefore
closed:

- **Not the socket callback.** `publishObservations` runs up to ~16 times a
  minute and the one join call site is synchronous **by design** — `closesAsOf`
  is sync precisely so no `await` reaches that path.
- **Not a request-response route**, cold, under any latency a reader tolerates.
- **Not a migration.** `deploy.yml` gives `pnpm migrate` `timeout 120`.

And the planner **under-estimates this read by 212×** (`rows=114` against 24,142
actual), which is what would turn a per-security index scan into a sequential
scan over 5 GB.

## Decision

**A derived aggregate too expensive for any request path is computed by a
nightly runner, persisted in a table keyed by the session it is FOR, and held in
memory for the serving path to read synchronously.**

**The runner is a copy, not a new pattern.** `.github/workflows/backfill.yml`
already carries two crons and `timeout-minutes: 330`, authenticating to the
deployed store as its own federated identity. The baseline is a job **in that
workflow, ordered after the fill** — not a cron of its own, which would race it,
and not a `deploy.yml` step, because the window ends at **the last session the
backfill has completed**, which is a data dependency on the fill rather than on a
deploy.

**Not in-process, and the reasons are properties rather than preferences.** The
container is **0.25 vCPU / 0.5 GiB**, so a 2 GB pass must stream; row
deserialisation would run on the **same single thread** as the live socket's
callback and the deliberately synchronous join; an OOM or a long stall kills
**the only replica** (`minReplicas: 1`, `Single` revision mode), taking the
market socket and the live bar writer with it and holing `market_bars`; it would
hold one of `POOL_MAX = 10` of **35 user connections** for minutes; and a deploy
restarts it mid-pass with no record that it failed. **Reversal trigger, a
condition:** _the first reader that must score a session the nightly runner has
not yet written._

**The table is keyed on `(security_id, as_of_session)` and carries TWO
sessions** — the one it was computed **for** (the window's end, which is the
coordinate a replay keys on) and the instant it was computed **at**. A baseline
overwritten in place is not replayable, and memory is overwritten in place by
definition, so **in-memory alone cannot satisfy _addressable as-of a session_**;
what memory holds is the current generation, as a cache, so the serving path has
nothing to await.

**The window-end column is named in the `observed_at` family, deliberately
diverging from [ADR 0042](0042-membership-is-a-history-and-it-starts-the-day-somebody-writes-it.md)
decision 4.** That ADR refused the name for membership because a membership
change is a fact about **us**, and accepted that Epic 13's temporal plugin would
not cover its table. A baseline's window end **is** a market fact — it names a
session of market data — so the opposite choice is available here, and taking it
makes this table **structurally covered by the plugin** rather than needing an
explicit clock, which is invariant 4's own bar. **No default on that column**,
for `0002`'s decision 3 reason.

**The table is declared DERIVED and recomputable**, in `schema.ts`'s comment and
here, with the recompute command named — or a later reader treats it as primary
and refuses to drop it. It is a cache with a schema.

## Consequences

**The read side copies `last-closes-cache.ts` and repairs its recorded defect
rather than inheriting it.** That cache memoises on **the session it was asked
about rather than the session the data belongs to**, so a refresh after midnight
ET and before the fill stamps today's date on yesterday's closes and can never
fire again that day. The baseline memoises on **the `as_of_session` the row
itself carries**, which a persisted table makes free, because the stored row
**is** the session it is for.

**The query shape decides the cost regime, by two orders of magnitude.** One
ordered pass with the arithmetic in SQL stays in the bandwidth regime; 516
separate index scans at 120 provisioned IOPS does not. Money is `numeric` and
aggregates belong in SQL, which points the same way.

**`PRODUCT_SPEC.md` §28 has nothing to say about a background pass**, and that
silence is now a known gap rather than an assumption. A periodic multi-minute
database pass on a Burstable tier with a CPU-credit model is a new cost class;
Epic 14 owns it and `docs/GAPS.md` carries it.

**What a green check certifies.** `pnpm test:database` can prove the shape, the
tape predicate, the counted `n` and the refusals, against a seeded store. It
proves **nothing** about the cost: CI's store has zero bars, every developer's
store has **zero `iex` rows**, and the deployed measurement is the operator's to
take. The 4–13 minute band this story inherited is **arithmetic over a
sequential full-table pass** and was never a measurement.

## Alternatives rejected

**A timer in the backend process.** Rejected on the five properties above, each
of which is a fact about this deployment rather than a preference.

**Compute on demand with a TTL.** Minutes under a reader, on a path whose first
request pays it. Rejected by the measurement.

**Hold it only in memory.** Cheapest, and it defeats the criterion it exists to
satisfy: addressable is not replayable, and every restart re-pays the pass while
the first reader after a deploy — including a 43-second rollback — sees nothing.

**Keep only the newest generation.** ~105 MB a year is 0.5% of the usable floor,
and keeping every session is what makes a replay of any date after today exact.

## Amended 2026-10-14 by Task 5.3.2 — the pass IS 516 index scans, and the sentence that said otherwise was not a measurement

The Consequences above state that **one ordered pass with the arithmetic in SQL
stays in the bandwidth regime; 516 separate index scans at 120 provisioned IOPS
does not.** The shipped pass is the second shape, deliberately, and the
amendment is here rather than a rewrite because the sentence is a correct
statement about _uncorrelated_ fetches and the shipped read has none.

**What the same section already measured is why.** 538 blocks at **~45 rows a
block** says the heap is _well correlated_, so one security's 60-session read is
an index range scan over physically adjacent blocks — bandwidth, not IOPS. The
37-minute figure prices 269,538 **random** fetches, which no shape in this
implementation issues. The alternative, one pass with no `security_id`
predicate, has to produce `order by security_id, observed_at` over 11.7 M rows
on a tier whose `shared_buffers` is 256 MB, from a planner that under-estimates
this read by two orders of magnitude — a sequential scan plus an external sort,
and a resident set the 0.5 GiB container could not stream even if it ran there.
One scan per security is bounded, resumable, and the unit
`GET /diagnostics/baseline-cost` measures.

**And the arithmetic is in Node rather than in SQL, which README §4's rule does
not reach.** That rule exists because float addition is not associative;
nothing in this computation is summed. Each sample is one division of two
`numeric` closes and the aggregation is a **sort** — order statistics, exact and
order-independent. What _is_ in SQL would have had to be the grid, and which
minute is a 5-minute anchor is a **calendar** question that `market-time.ts` is
the only module permitted to answer.

**Measured on a local store holding 48.8 M bars, 2026-10-14** — the whole pass,
516 tracked securities, 60 sessions ending 2026-09-11:

| Figure                                  | Value                                      |
| --------------------------------------- | ------------------------------------------ |
| whole pass, first run                   | **20.7 s**                                 |
| whole pass, warm, two further runs      | **11.78 s**, **11.73 s**                   |
| securities measured / refused / no rows | **511 / 5 / 0**                            |
| samples total, mean `n`                 | **2,193,087**, mean **4,292**, max `4,620` |
| one security's read (`NVDA`)            | `Index Scan`, 23,400 rows, 15.15 ms        |
| planner estimate against actual         | **105 against 23,400 — 223×**              |

Three things in that table are worth carrying forward. **`4,620` is confirmed as
the per-security ceiling** rather than derived — Gate 1 decision 2's figure,
measured. **The split guard refused 5 of 516** (`APH`, `CRWD`, `DD`, `MNST`,
`MRNA`), which is the ceiling behaving as designed rather than as a tripwire.
And the **223×** under-estimate corroborates the 212× this ADR already carries,
from an independent window.

**Every figure above is LOCAL, on one laptop, against a warm-ish page cache.**
The deployed arm is AC 10's and is `GET /diagnostics/baseline-cost`'s to answer;
nothing here is a measurement of the B1ms tier.

## Amended 2026-10-16 by Task 5.4.5 — the shape was reused twice more, and the second use needed TWO tables rather than one

**The decision is unchanged and this is the record of it being applied again.**
Story 5.4 needed the landing page's `Unusual activity` region to draw something
when the market is shut — about 80% of the week — and the figure it ranks is
process memory with no store-backed fill, so there was nothing to draw. The
answer was this ADR's shape, not a new one.

**What was added.** `0014_session_return_percentiles.sql` holds each security's
closing five-minute move for a session, ranked against the baseline generation
for that same session, keyed by **the session it is for**, with `observed_at`
taking **no default**.

**And a second table nobody anticipated.** A refused security gets **no row** —
and a session on which nothing was rankable therefore has **no rows at all**,
which is exactly the session whose footer has to stay honest. So the three
population counts and the five refusal counts need a per-session row of their
own: `session_return_percentile_passes`. **The generalisation is worth more than
the table**: an aggregate keyed by its session needs a companion row for _what
the pass saw_, because the absence of rows is indistinguishable from the absence
of a pass, and a surface that states its own denominator cannot tell them apart
from the scored rows alone.

**The generation is identified by the shared key rather than copied.** The pass
ranks against the generation whose window **ends at the session being scored**,
so `(security_id, observed_at)` **is** `return_baselines`' own key; storing a
second `timestamptz` holding a copy of `observed_at` would be one fact with two
homes. `baseline_lookback_sessions` is stored because it is the pass's own
parameter rather than a copy of anything.

**One consequence of the self-inclusive window, measured.** The generation's
window _contains_ the sample being ranked, so **`above_sample` is `false` on
every stored row — 0 of 485 on the real store** — while the live arm, which
ranks a _new_ observation against a _past_ distribution, can reach `>99th`. So
the same region can say `>99th` mid-session and never out of hours. The
alternative — ranking against the previous night's generation — makes the first
night after a fresh install produce **no rows at all**, because that generation
does not exist. The self-inclusive option was taken deliberately and the
difference is stated in `0014` §5.

**Both tables are labelled DERIVED and RECOMPUTABLE in three places** — the
migration, `schema.ts` and here — which is this ADR's own rule and `0013` §1's
stated reason: a table nobody has labelled is one the next reader treats as
primary, and the named cost is a later story writing an expensive backfill
against a table whose whole content is a cache.

**The cost, measured rather than projected** (the mistake this epic made once
already, at 20–66×). The migration is **9–14 ms** of catalogue work against
`deploy.yml`'s `timeout 120`, with no `ALTER TABLE` on `market_bars`,
`securities` or `return_baselines`; the FK takes `SHARE ROW EXCLUSIVE` on
`securities`, conflicting with neither a read's `ACCESS SHARE` nor a child
insert's `ROW SHARE`. The nightly pass's **added** cost is **below this
machine's noise floor** — median **13.18 s** with the ranking (n = 9) against a
**13.16 s** control (n = 3), with a new-code block coming out faster than the
control block. One laptop, warm store, blocks rather than alternating samples.

**ADR 0038's frame-grain trigger was evaluated here and did NOT fire**, which is
the second time in two days. A nightly row read on the **batch's** cadence from a
table is `lastCloses`' shape, not a second arrival. It fires only if such a
figure is ever withheld and refreshed by the gateway on its own clock.

## Amended 2026-10-20 by Task 5.5.3 — the shape's FOURTH and FIFTH tables, and the first where the TAPE is in the key

**The decision is unchanged; this records its third application and the one way
it had to be extended.** Story 5.5's volume factor needed a median volume for
the same time of day, per security, **on the same tape as the numerator** — and
`return_baselines` could not be widened to hold it, for three reasons worth
stating because the hand-off that proposed widening got all three wrong. That
table has **no `feed` column** (the tape is a serving-path constant,
`BASELINE_FEED = "sip"`), so one row would hold a `sip` distribution and an
`iex` distribution with nothing saying which; widening would **weaken the
shipped `return_baselines_one_answer` check** and duplicate `sample_count` and
`refusal`, because a security can be price-refused on a split and volume-fine,
or the reverse; and **a second table does not imply a second pass** — adding
`volume` to `windowQuery`'s `select` costs **no extra I/O**, the same 538 blocks
and the same index scan, one more column deserialised.

So `0015_volume_baselines.sql` adds `volume_baselines` and
`volume_baseline_passes`, folded into **one** pass, and **both labelled derived
and recomputable in three places** — the migration, `schema.ts` and here — with
the recompute command stated, as this ADR requires.

**The one extension: the TAPE is in the key.** `(security_id, observed_at,
feed)` and `(observed_at, feed)`, where `0013` and `0014` key on the session
alone. The reason is a property of the decision above it rather than of the
data: Story 5.5's Gate 1 chose a **same-tape `iex`** baseline **with a reversal
trigger**, so the tape is a decision that can flip — and a flip against a
session-only key would **rewrite every row with nothing recording the change**.
A cache may be rebuilt; it may not quietly change what it is a cache _of_.

**The companion row is Story 5.4.5's generalisation, and this is the clearest
case it has had.** On the real store the pass wrote
`tracked_count 516, measured_count 0, absent_count 516` beside an **empty**
`volume_baselines` — because this machine holds **zero `iex` rows**, so every
security refuses `no-same-tape-baseline`. Without the pass row, _the pass ran
and found nothing_ and _the pass never ran_ are _byte-identical_.

**Costs, measured rather than projected.** The DDL is **4.96 / 4.97 / 5.74 ms**
of catalogue work over three runs (`volume_baselines` 3.4–3.7 ms,
`volume_baseline_passes` 1.5–2.1 ms), against `0014`'s 9–14 ms and
`deploy.yml`'s `timeout 120`; `pnpm migrate` end to end **0.540 s**. Nothing
touches `market_bars`, `securities`, `return_baselines` or `0014`'s tables. The
nightly pass's **added** cost is again **below this machine's noise floor** —
median **13.34 s** with the volume half (n = 5) against a **14.40 s** control
(n = 3), the new-code arm faster than the control. **That caveat is not
optional and is weaker than 5.4.5's**: this laptop holds no `iex` rows, so the
516 extra index probes find and deserialise **nothing**. It bounds the
**empty-tape** cost and says nothing about the deployed one.

**And one finding about this repository's own guards rather than about the
schema.** A first draft gave the precision target `double precision`, arguing
this ADR's §5 — and **`pnpm test:database` refused it**, because
`migrate.database.test.ts` carries _has no floating-point column anywhere_ with
**no exemption mechanism**. It is now `numeric(18, 6)` (0.05 is exact). The part
worth keeping: that check reads `information_schema.columns.data_type`, which is
**`ARRAY`** for a `double precision[]` and `double precision` for a scalar — so
`0013`'s `breakpoints` and `0015`'s three arrays **escape it by their type's
shape rather than by anybody's leave**. Recorded in `0015` §6 and `schema.ts`
too, because the next author will reach for the same argument.
