# Story 5.3 — The Baseline, & the Price Percentile

**Status:** In progress — 2026-10-14
**Epic:** [Epic 5 — Anomaly Detection](../EPIC.md)
**Depends on:** 5.2
**Epic scope covered:** historical return distributions, return percentile calculation

## Description

**This is the epic's expensive unknown, de-risked here rather than discovered
in the story that draws the landing page.**

A 60-trading-day baseline of 5-minute returns over 501 equities is
**11,723,400 minute rows ≈ 2.23 GiB of heap** — about **24.6%** of the deployed
store — against a deployed `shared_buffers` of **256 MB, 2.9% of the table**. It
therefore **cannot be warm**, and two independent derivations put a
full-universe cold pass at **4–13 minutes**: 2,286 MB at `HOSTING.md`'s 10 MiB/s
tier bandwidth is ~229 s, and at the measured deployed cold rate of ~2.3–2.7 ms
a block it is ~650–770 s.

**Three contracts follow, and they are consequences rather than preferences:**

- **Not in the socket callback.** `publishObservations` runs up to ~16 times a
  minute and the one join call site is synchronous by design — `closesAsOf` is
  sync precisely so no `await` reaches that path.
- **Not in a request-response route**, cold, under any latency a reader
  tolerates.
- **Not in a migration.** `deploy.yml` gives `pnpm migrate` `timeout 120`.

**So the baseline is precomputed and held, and the precedent is in the tree
already.** `last-closes-cache.ts` is the same shape — a 518-row read that
changes once a night, held in memory so the producer can be called from inside
the socket's own callback without an `await`. A baseline is that object with a
bigger body: **~84 KB** for pooled breakpoints, against `currentMarketState`'s
measured 0.2 MB.

**The 60 trading days is settled by a downstream document quoting an example,
and this story adopts it explicitly.** §11 states no lookback; the only
lookback in the whole spec is §5.1's illustrative
`calculate_return_percentile(NVDA, 5m, 60 trading days)`. `BARS.md` §2 treated
that as settled and **capped daily history at 2024-01-01 on the strength of
it** — so the store was sized for this story two epics ago.

## What the user can see when this story lands

**The percentile appears beside the 5-minute return** in
`Abnormal-move indicators` — the first figure in this product that says how
unusual something is. Still no 0–100 score and still no band.

## Acceptance criteria

1. A baseline is produced by a path that is **neither the socket callback, nor
   a route, nor a migration**, and the choice between the nightly runner and an
   in-process schedule is **recorded with its alternatives** — an in-process
   scheduler is a new pattern in this backend, whose only in-process writer
   today hangs off the socket callback.
2. The baseline is **addressable as-of a session**, not "current" —
   `closesAsOf(session)`'s shape — because a baseline overwritten in place is
   not replayable.
3. **The percentile is a magnitude percentile over a pooled session
   distribution** (Story 5.1's decisions 2 and 3), computed from
   **non-overlapping** 5-minute returns aligned to the same minute-of-session
   grid as the numerator, with **n stated** — 78 buckets × 60 sessions =
   **4,680** samples. Overlapping samples are serially correlated, so printing
   `n = 23,340` would over-claim.
4. **The baseline window is split-adjusted** by asking the provider (Story
   5.1's decision 1), and the baseline **excludes the window being scored**, so
   the anomaly is not in its own baseline.
5. **One tape per comparison.** The baseline window is `feed = 'sip'` only and
   **ends at the last session the backfill has completed**, not at `now` —
   because minutes in progress and extended hours are the live IEX tape's
   permanently, and a `distinct on` baseline would include them silently, with
   the proportion depending on the time of day. The **two-tape row inflation in
   a 60-session window is unmeasured** (ADR 0035 projected +69% a year with no
   signal in the data yet), so 11.72M is a **floor**; this story measures it.
6. **A percentile is refused rather than printed below a stated minimum
   sample**, and never printed at a precision the sample cannot support.
7. **Percentiles are never spelled with `%`.** A percentile and a change
   formatted by the same `PERCENT_DISPLAY_DECIMALS` are visually the same kind
   of number and are not — `99th percentile of 4,680 five-minute returns`.
8. The pooled distribution's known bias is **stated on screen where it
   matters**: the open is structurally the fattest-tailed bucket, so a pooled
   percentile reads a market open as more unusual than it is.
9. The baseline read keeps its temporal predicate as a **Kysely builder
   predicate rather than raw SQL**, and the module **exports no handle** —
   Epic 13's plugin must be able to rewrite it, and ADR 0015's gap 4 is still
   open.
10. The pass's real cost is **measured on the deployed store**, not derived:
    one `EXPLAIN (ANALYZE, BUFFERS)` of the 60-session read for one security,
    and one timed full-universe pass. The 4–13 minute band above is arithmetic
    over published block rates and is **an upper bound on the shape, not a
    measurement**.

## Gate 1 — the task list approved, 2026-10-14, and four decisions

Five tasks, approved as proposed. Four roles shaped it, and between them they
found **seven false premises in this story's own acceptance criteria** — two of
which stopped the story as written. They are listed here rather than quietly
corrected, because each was load-bearing.

### The four decisions

**1. The baseline reads the STORE, with a split guard.** AC 4 inherited Story
5.1's Gate 1 decision — _ask the provider for split-adjusted bars_ — while AC 5,
AC 9 and AC 10 and **the entire cost argument** describe a store read. Both
cannot be the source. The owner took the store, and the price is a mechanism
rather than a hope: **a single unadjusted 10:1 split inside the window injects a
−90% five-minute return** that breaks no percentile property, changes no `n`,
keeps the tape pure, and makes every percentile for that security read far too
low for 60 sessions — with a known trigger date. So the baseline **detects a
session-boundary discontinuity above a stated ceiling and refuses that
security's percentile**. `PROVIDER.md` §3.5's refusal is answered rather than
skirted: it forbids **computing** an adjustment, and this detects and refuses.

**2. `n` is COUNTED, percentiles are INTEGER, and `>99th` is the ceiling.** AC
3's `78 × 60 = 4,680` is wrong twice: 78 grid anchors yield **77** increments
(4,620), an early close yields **41**, and median stored coverage is **82.8%** so
grid pairs are routinely absent. At n = 4,620 the binomial SE at the 99th is
**0.146 points**, so a first decimal is below the sample's resolving power —
`PRODUCT_SPEC.md` §11's own `99.1st percentile` example gains a dated amendment,
the way §9 carries Story 4.4's refusal of percentages. Above the highest order
statistic there is no sample, so **`100th` is never printed**.

**3. AC 10's deployed arm is the owner's to run.** The deployed store is
Entra-only. Two commands are written out exactly in Task 5.3.1 — an
`EXPLAIN (ANALYZE, BUFFERS)` and a timed pass — to be run after `az login` and
pasted back. **The `EXPLAIN` matters for plan shape more than for
milliseconds**, because the planner under-estimates this read by **212×**
(`rows=114` against 24,142 actual), which is what would turn a per-security index
scan into a sequential scan over 5 GB.

**4. Five tasks**, two of them with nothing visible and named as such, with 5.3.3
paying them off.

### The cost, measured rather than derived

The Description's **4–13 minutes** is arithmetic over a sequential full-table
pass. Measured cold on a store holding 48,797,343 bars and **255 sessions** of
minute history:

| Measured, cold, local                         | Figure                                                     |
| --------------------------------------------- | ---------------------------------------------------------- |
| one security, ~62 sessions                    | `Buffers: shared hit=8 read=538`, **58.4 ms**, 24,142 rows |
| rows a block                                  | **~45**, so the heap is **well correlated**                |
| 501 equities, extrapolated                    | ~269,538 blocks ≈ **2,105 MB**                             |
| at 10 MiB/s sequential                        | **~3.5 minutes**                                           |
| at the **120 provisioned IOPS**, uncorrelated | **~37 minutes**                                            |

**`HOSTING.md` provisions 120 IOPS rather than the SKU's advertised 640**, and
the story's band is bandwidth arithmetic — so **which regime applies is the
single biggest cost question in this story**, and the query shape decides it.

### The seven false premises

1. **Two sources for one set of numbers** — resolved by decision 1 above.
2. **`n` is 4,620 and per-security, not 4,680** — decision 2.
3. **`~84 KB` is ~21 breakpoints**, a vigintile grid, which **cannot express a
   99th percentile at all** — the one reason pooling was chosen. 101 breakpoints
   is **417 KB** over 516 securities, about 2× `currentMarketState`.
4. **`BARS.md` §2's 2024-01-01 cap is the DAILY depth**, and this baseline reads
   **minute** bars, whose depth is one year by the same section. The conclusion
   held; the mechanism quoted did not.
5. **"One tape per comparison" is not achievable as worded.** The numerator is
   `iex`-over-`iex` by construction and the baseline is `sip` only, so **every
   comparison this story ships is a SIP baseline against an IEX numerator**.
   AC 5 is satisfiable as _the baseline window is one tape_, and invariant 6
   then has something to say on screen.
6. **`one-home-for-the-observation-window` will NOT refuse the lookback, which
   is worse than refusing it.** Its regex matches minute-scaled subtraction from
   an instant; a 60-**trading-session** lookback goes through the calendar with
   no `getTime()` and no minute factor, so it matches neither half. Story 5.2's
   hand-off said the opposite and is corrected by date in Task 5.3.5 — **the
   conjunct must key on the session count**, or this story ships a guard green on
   its own defect.
7. **A nightly runner is a COPY, not a new pattern.** `backfill.yml` already
   carries two crons and `timeout-minutes: 330`. The accurate version of AC 1's
   note is that **no timer in this process does database work, or work longer
   than a tick** — `market-gateway.ts` already runs a `setInterval` keepalive.

### And one thing nobody can measure here

**The two-tape inflation AC 5 asks this story to measure is unmeasurable on any
developer's store.** The local store holds **48,449,712 `sip` rows and zero
`iex`**, because the live writer only runs where a provider is configured — so
it is asked for in the same deployed sitting as AC 10, by an index-only query,
with the caveat that the live writer started **2026-09-23** and a 60-session
window today exposes ~15 of 60 sessions, making any figure **~25% of steady
state**.

## Design work

One figure added beside an existing one, plus the bias sentence. No new region.

## Out of scope

The volume factor, the composite, bands, and `Unusual activity` on `/`.

## Handed here by Story 5.2's close — 2026-10-14: the window you read, the constant you must not reuse, and the check that will refuse your lookback

**1. The trailing window exists and it is NOT a series.** `trailing-window.ts`
holds **six to seven minute bars per security** — `span + ε`, where ε is 90 s —
evicted on each bar's **own `startsAt`**. It is not a baseline and cannot become
one: a 60-trading-day baseline is ~23,400 bars a security against the seven this
holds, and the measured marginal cost is **283–284 B a bar**, so depth alone
makes your baseline a store read rather than a widening of this.

**2. Two properties you must not assume away**, both of which bit Task 5.2.2:

- **`read()` returns the ε tail**, so some of what you are handed is **outside**
  the five minutes by construction. Bound your own `asOf − lookback`.
- **Eviction is relative to that security's own newest bar, never to now.** A
  security silent for 187 minutes keeps seven bars from 187 minutes ago, so a
  full window is **not** evidence of a recent one.

**3. `one-home-for-the-observation-window` WILL refuse your lookback, and that
is the check working.** It permits **exactly two** minute-scaled cutoffs: the
eligibility cutoff in `market-breadth.ts` and the measurement span in
`five-minute-return.ts`. A percentile lookback is **neither** — it is a third
quantity — and the break
`pnpm break a-span-spelled-as-the-observation-window` was proved against a
plant that is literally `market-percentile.ts` with a
`PERCENTILE_LOOKBACK_MINUTES = 60`. **You owe a fourth conjunct, your own
constant and your own argument**, in the same change.
[ADR 0043](../../../docs/adr/0043-two-five-minutes-a-freshness-cutoff-and-a-measurement-span.md)
is why these are not one quantity, and **never reuse `BREADTH_WINDOW_MINUTES`
or `RETURN_SPAN_MINUTES`**.

**4. `one-home-for-the-live-change` may refuse you too**, for a reason that is
not obvious: its third clause refuses any shipped file that **divides by a
close**, and a percentile over returns divides minute closes. `five-minute-
return.ts` carries a **named, doubly-anchored exemption** — it must still divide,
and must not mention `SecurityLastClose`, `readLastCloses`, `closesAsOf` or
`previousClose`. Copy that shape rather than widening the clause.

**5. The region you draw into is filled progressively and is 106 px today**, in
every state at every width, with content boxes 419 / 446 / 318 / 308. **One step
per story that adds a band is the accepted cost** — recorded as a probed figure
per width so you amend a measurement rather than inherit a guess — and
`MARKET-OVERVIEW.md` §1.4's trigger has already fired once on this route.

**6. Four absence sentences are already approved and named** in
`apps/frontend/src/market/five-minute-return.ts`, with eight more in
`relative-performance.ts`. The register is set: short, no connection word, no
terminal full stop except on the one region-level sentence. **A fifth refusal
kind needs words of its own and a recorded reason for not being one of the
twelve.**
