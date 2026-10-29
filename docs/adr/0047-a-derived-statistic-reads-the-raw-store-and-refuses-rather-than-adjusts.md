# 0047 — A derived statistic reads the raw store and refuses rather than adjusts

**Status:** Accepted
**Date:** 2026-10-29
**Story:** [5.3 The Baseline, & the Price Percentile](../../planning/epic-05-anomaly-detection/story-03-the-baseline-and-the-price-percentile/STORY.md)
**Recorded at Epic 5's close by [Task 5.7.6](../../planning/epic-05-anomaly-detection/story-07-the-rehearsal-the-sweep-and-the-epic-close/TASK-06-the-gaps-the-mechanisation-and-adr-0047.md), fifteen days after the decision was taken**

## Context

**This decision was taken on 2026-10-14, shipped, validated against the real
store, and recorded in a task file.** It reverses a Gate 1 decision, answers a
standing rule in a subject document, and is the reason five securities in the
tracked universe draw no percentile — and it had **no decision record**.

`grep -n "provider" docs/adr/0044*.md` returns **zero**: ADR 0044 is about
_where_ a derived aggregate is computed (nightly, keyed by the session it is
for), and its four rejected alternatives are a timer in-process, compute-on-
demand with a TTL, memory-only, and keep-only-the-newest. **_Ask the vendor_ is
not among them**, because that is a different question that happened to be
answered in the same task. Task 5.3.1's own done-when list asked for two things —
_the source decision recorded with its alternatives and a reversal trigger_ and
_the ADR written and indexed_ — and the ADR that got written answered the second
for a different subject, leaving the first discharged into a story file.

The question is: **where does a derived statistic get split-adjusted prices
from?**

A return percentile is computed over ~60 trading sessions. An unadjusted
10-for-1 split is a **−90% return** that would sit at the top of every
distribution it touches and produce a permanent, confident and entirely false
anomaly. So the series behind the baseline must be adjusted, or the refusal must
be visible.

**Two live rules pointed the other way.** `PROVIDER.md` §3.1 states _an adjusted
series is obtained by asking a provider for one, not by computing it from stored
raw bars_. And Story 5.1's **Gate 1 decision 1** had already decided this epic
would do exactly that.

## Decision

**The baseline reads this product's own RAW store, and a split guard detects a
session-boundary discontinuity and REFUSES the security.** It does not fetch an
adjusted series, and it does not adjust anything itself.

Two arguments, neither of which had been weighed when Gate 1 decided:

**1. A provider-fetched baseline is not reconstructible from anything we
stored.** This is invariant 4's territory and Epic 13's. Every figure in this
product is supposed to be derivable from data whose provenance we hold; a
percentile computed over bars that existed only inside one nightly job's memory
is a number nobody can ever re-derive, audit or replay. The store is the only
source with that property.

**2. The cost is a metered nightly fetch of roughly 1,172 paged requests against
a ~3.3/s bucket** — for a quantity that changes once a session, over a window
that is 98% identical to yesterday's.

**And the refusal answers `PROVIDER.md` §3.5's objection rather than skirting
it.** That objection is that a **wrong** adjustment is invisible: a series
silently mis-adjusted produces plausible figures and nothing says so. A
**refusal is visible by construction** — the security draws no percentile and
says why — so the failure mode §3.5 is written against cannot occur quietly.

**The bound is a ratio and its reciprocal, not a percentage**, because a split
factor can be either side of 1.0.

## Alternatives rejected

- **Ask the provider for a `split-adjusted` series**, as `PROVIDER.md` §3.1
  requires and Gate 1 decided. Rejected on the two arguments above — chiefly
  that it puts a figure on screen that no stored data can reproduce. **This is
  the decision being reversed**, and §3.1's rule survives for what it was
  written about: an **adjusted series**, which this product still obtains only
  by asking. A statistic that never adjusts anything is outside its scope, and
  §3.1 now carries a dated amendment saying so.
- **Adjust the stored raw bars ourselves.** Rejected: it is precisely the
  computation §3.1 forbids, it would make our arithmetic part of the adjustment
  path, and a wrong adjustment of our own making is exactly the invisible
  failure §3.5 describes.
- **Publish the unadjusted percentile and say nothing.** Rejected: a −90%
  return at the 99th percentile is a _confident_ false claim, which invariant 5
  refuses — `"not enough evidence"` is a first-class outcome and a wrong number
  is not.
- **Refuse the whole nightly pass when any security is discontinuous.** Rejected
  as disproportionate: the guard is per-security, 5 of 516, and 511 correct
  baselines are better than none.

## Consequences

**It is validated rather than argued.** On the real store it refused **5 of
516** — four on **exact** split factors: `CRWD` 0.2501, `APH` 0.5017,
`MNST` 0.5084, `DD` 3.0639. Two of those are **above 1.0**, which is why the
bound is stated as a ratio and its reciprocal.

**A visible absence is the shipped behaviour for those securities**, and
`split-discontinuity` is a member of the refusal vocabulary the surface draws.

**`split-adjusted` now has ONE reader in this product.** Epic 5 was described in
four live places as its _stronger_ reader and is not a reader at all. Story
2.12's multi-year chart is what remains, which touches
`market-provenance.ts`' own rule that each vocabulary member needs a reader —
whether the member keeps its place is a vocabulary decision and is deliberately
**not** taken here.

**And this ADR exists because the decision could not be found.** Four live
documents — `market-bars.ts`, `packages/shared/src/market-provenance.ts`,
`PROVIDER.md` §3.1 and §3.4 — went on asserting the reversed behaviour for
**fifteen days**, and §3.5 was amended while §3.1, in the same file, was not. A
decision recorded only in the story that took it is a decision the next reader
reaches by accident.

## Reversal trigger

**The first reader that needs a TOTAL return rather than a price return.**

A split guard is sufficient because a split is a discontinuity in price with no
economic content. A **dividend** is not: it is a real cash flow, it does not
produce a step a guard can detect reliably, and a total-return series cannot be
assembled from raw prices at all. The vendor's `split` adjustment parameter does
not supply it — `dividend` is a separate adjustment — so the first consumer
needing total return reopens the fetch-versus-store question with a different
answer available, and `PROVIDER.md` §3.4's own vocabulary is where it lands.

**Not a trigger:** a security refused by the guard. That is the mechanism
working.
