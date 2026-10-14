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
