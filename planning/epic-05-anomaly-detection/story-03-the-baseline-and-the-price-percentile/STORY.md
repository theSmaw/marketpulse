# Story 5.3 — The Baseline, & the Price Percentile

**Status:** Not started
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
