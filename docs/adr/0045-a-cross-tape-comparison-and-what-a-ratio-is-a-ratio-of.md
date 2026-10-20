# 0045 — A cross-tape comparison, and what a ratio is a ratio OF

**Status:** Accepted
**Date:** 2026-10-20
**Taken by:** [Story 5.5](../../planning/epic-05-anomaly-detection/story-05-the-volume-factor-and-the-tape-it-rests-on/STORY.md), Task 5.5.5 at its close
**Supersedes nothing. Cites** [0034](0034-the-tape-on-the-bar.md), [0035](0035-both-tapes-are-kept-and-what-a-record-is.md), [0043](0043-two-five-minutes-a-freshness-cutoff-and-a-measurement-span.md), [0044](0044-a-derived-aggregate-is-computed-nightly-and-keyed-by-the-session-it-is-for.md)

## Context

**This product has shipped a cross-tape comparison since 2026-10-14 and had no
decision record for it.** The live five-minute return is computed from the
in-memory trailing window, which holds one tape and whose feed is `iex` by
construction — and it is ranked against a baseline the store reads with
`BASELINE_FEED = "sip"` (`apps/backend/src/index.ts`,
`return-baseline-store.ts`). A reader is told: `Measured on IEX · baseline on
All US exchanges`. **The disclosure was there; the decision was not.**

Story 5.5 then needed a **volume** factor, and the same shape stopped being
safe. The difference is not a matter of degree, and it is now measured rather
than argued.

**Measured against the deployment on 2026-10-20**, over a 60-session window of
which 18 sessions were exposed to two-tape writing and 15 held `iex` rows:

| quantity                                                                            | value                 |
| ----------------------------------------------------------------------------------- | --------------------- |
| IEX's share of volume, on minutes **both** tapes printed                            | **3.54%**             |
| the bias of an `iex` numerator over a `sip` denominator, over **all** `sip` minutes | **2.75%**             |
| IEX's **minute presence** over the same window                                      | **81.6%**             |
| per-minute ratio, p10 / median / p90                                                | 1.60% / 3.17% / 5.83% |

The identity holds to seven places: `0.0353982 × 0.776074 = 0.0274716`, so the
bias factors exactly into **venue share × coverage**.

**And it is not one number — measured across six securities at the close, the
share runs 3.54% to 15.19%, a 4.3× spread, INVERSELY with liquidity**: `NVDA`
3.54% and `AAPL` 4.50% against `NVR` 15.19% and `ERIE` 10.51%, which is the
right direction for a small venue. **So the bias runs 2.20% to 8.32% — a figure
would be 12× to 45× too low depending on which security a reader opened.** That
is the decisive argument against applying a measured share as a correction, and
it is stronger than the within-security dispersion this decision was first
written from. Exposure and presence also come apart at the thin end: `ERIE` has
**7.8%** minute presence but **20.9%** volume exposure, so on the few minutes it
printed, IEX saw a fifth of the shares.

**So an `iex` numerator over a `sip` volume baseline would render `4.1× typical`
as `0.11× typical` — about 36× too low, on an ordinary day.** Story 5.5's own
Description guessed `0.3×`; it understated the error threefold.

## Decision

### 1. The invariance test, which is the general rule

**Before comparing two figures, ask whether the quantity is a RATIO WITHIN one
tape or a LEVEL ACROSS tapes.**

- A **ratio within** one tape — a percentage change, a return, a rank among that
  tape's own history — is **scale-free**, so it survives the tapes disagreeing
  about how much of the market they saw. The live return ranked against a `sip`
  baseline is legitimate for this reason and this reason only.
- A **level across** tapes — a volume, a share count, a trade count — is
  **proportional to how much of the market the tape saw**, so the share _is_ the
  quantity. Comparing one tape's level to another's is not noisy; it is wrong by
  a factor nobody on screen can see.

**A level across tapes is refused.** Not corrected, not annotated, not
multiplied by a measured share: **refused**, because applying a share is
_computing an adjustment_, which is the one thing
[`PROVIDER.md`](../../planning/epic-02-security-universe-historical-data/story-06-market-data-provider-abstraction/PROVIDER.md)
§3.5's objection actually reaches — and because the dispersion makes a single
constant indefensible anyway (p10 1.60% against p90 5.83%, a 3.6× spread).

### 2. What a ratio is a ratio OF, and it must match its label

**A sum over `n` minutes divided by a median of ONE minute is a rate, and may
only be labelled as one.** The volume factor is
`Σvolume / spanMinutes ÷ median(one minute)`, drawn under **`VOLUME PER
MINUTE`**.

The arithmetic is identical to `Σvolume / (5 × median)` and **the claim is
not**: `5 × median` is _the typical five-minute volume_, and **the median of a
sum is not five times the median of its parts** — the two differ by exactly the
within-bucket dispersion, which this product has measured at a CV of
**0.51–1.02** across buckets. A figure under a label is a claim about what the
label names.

**A partial span is refused rather than scaled**, and three repairs are wrong:
`× 5/k` imputes; `/ k` is the same imputation rearranged **and biased upward**,
because the minutes a single venue misses are systematically the quiet ones;
`/ 5` is the `?? 0` defect. The observed count `k` already travels beside the
return for this reason.

### 3. The tape belongs in the KEY of anything derived from one

Where a derived table holds a quantity whose meaning depends on the tape, the
tape is part of the key — `volume_baselines` is
`(security_id, observed_at, feed)` where
[0044](0044-a-derived-aggregate-is-computed-nightly-and-keyed-by-the-session-it-is-for.md)'s
earlier tables key on the session alone. The reason is a property of the
decision rather than of the data: a tape choice that carries a reversal trigger
can flip, and **a flip against a session-only key rewrites every row with
nothing recording that the meaning changed.** A cache may be rebuilt; it may not
quietly change what it is a cache _of_.

## Consequences

**The volume factor is absent rather than approximate, and for a long time.**
A same-tape `iex` baseline can only be as deep as the live writer's history,
which began **2026-09-23**. Measured on the deployment, `NVDA` — the best case
in the universe — has **80 samples** a bucket, a relative standard error of
**10.65%**, and needs **132 sessions** to support one printed decimal. **On the
better tape at full depth, 38,448 of 40,248 buckets still refuse: 95.5%**, and
173 of 516 securities have no drawable bucket at all.

So this ADR's honest consequence is that **a correct figure we cannot yet draw
replaces an available figure that would have been wrong by 36×** — which is
Story 5.1's refusal doctrine (_each figure is true, only the arithmetic over
them is refused_) applied to a second quantity.

**[ADR 0035](0035-both-tapes-are-kept-and-what-a-record-is.md) is vindicated
rather than tested.** _A record of an observation rather than a cache of the
best number_ is precisely what makes a same-tape `iex` baseline possible at
all; had the store kept one row a minute under `SERVED_TAPE_RANK`, decision 1
would have been unimplementable and the only options would have been a wrong
figure or no factor. **Cite it; it needs no amendment.** **0034** needs none
either — no new per-bar field, so its trigger does not fire.

**And this governs more than volume.** Every factor Epics 6 and 9 hang on a tape
meets decision 1 first: a topology edge weighted by traded value is a **level**,
a filing-day return is a **ratio within**. The test is cheaper to apply than the
measurement that forced it.

## Alternatives rejected

- **Measure the share and apply it.** Rejected on `PROVIDER.md` §3.5 — an
  applied share is a computed adjustment whose error is invisible — and on the
  measured dispersion, which is 3.6× between p10 and p90 and therefore admits no
  single constant.
- **Measure the share and merely disclose it.** Rejected because a disclosed
  bias does not make a cross-tape ratio true; it makes a wrong figure
  annotated. The screen already discloses the tapes and that was not enough.
- **Settled sessions only, `sip` over `sip`.** Defensible and not wrong, and
  rejected on comparability: it puts a figure about yesterday beside a
  five-minute return about **now**, which is Story 5.1's own refusal pointed
  inward, and hands Story 5.6 three live factors and one settled one.
- **Lengthen the volume lookback instead.** Rejected: it is a second lookback
  policy, owes its own constant and conjunct, and does nothing for the `iex`
  tape, which has weeks rather than years.

## Reversal trigger, as a condition

**The first session on which the same-tape baseline's counted `n` meets its
floor for FEWER securities than the previous session.** Depth has then stopped
accruing, which means the live writer is holing, and decision 1's premise — that
absence is a _dated_ condition rather than a permanent one — has failed. At that
point the choice is between the settled-session alternative above and no factor.

**A second, narrower trigger**: the first quantity in this product that is a
**level** and that somebody wants compared across tapes anyway. Decision 1 says
refuse; if that is ever overridden, it is overridden here rather than in a
module.
