# 0046 — What a composite score is, what it refuses, and where its guarantee ends

**Status:** Accepted
**Date:** 2026-10-29
**Story:** [5.6 The Composite Score, & Its Explanation](../../planning/epic-05-anomaly-detection/story-06-the-composite-score-and-its-explanation/STORY.md)

## Context

`PRODUCT_SPEC.md` §11 asks for a `0–100` score that is **interpretable rather
than sophisticated**, and requires that **every score carries its explanation**.
Epic 5's exit criterion is `Every score can be explained from deterministic
calculations.`

This is **one** ADR with three parts rather than three ADRs, for ADR 0038's own
recorded reason: _"a second ADR would be a second home for Decision 1 and would
make the misattribution permanent by giving it somewhere plausible to point."_
The three parts below are consequences of one another, which is the test.

## Decision

### 1. The combination is a WEIGHTED SUM, and the alternatives are refused by name

A weighted sum is the only family in which _"this score is 61 because the price
term contributed 38 of its 40"_ is **a sentence a reader can check by addition**.

- **`max` throws away corroboration** — a security unusual on two factors should
  outrank one unusual on a single factor, and a maximum cannot say so.
- **A product lets one absent factor annihilate the score**, which is the
  opposite of the absence rule in part 2.
- **A cross-sectional rank guarantees a 91 exists every day, including a dead
  one** — §11's decision 4, refused there and inherited here.
- **Mahalanobis or PCA is excluded by _interpretable_** and is unexplainable to a
  reader, which §11 asks for in terms.

**Six things make the addition checkable, and all six are load-bearing.** Weights
are **integers summing to 100 over the full factor set**; each factor maps to a
unit value in `[0, 100]`; a contribution is `round(w × u / 100)` so
`0 ≤ c ≤ w` **by construction**; **the score IS the sum of the ROUNDED
contributions** rather than the rounding of an unrounded sum; score and
contributions print at the same precision; and the factor's printed figure **is**
its unit value.

**Round-then-sum costs up to ±1 against `round(Σ w·u/100)`, and that is the right
trade**: the alternative lets `38 + 23 = 61` appear beside a score of `62` **on
correct code**, falsifying the headline sentence in front of the reader.
Monotonicity survives, because `Math.round` is monotone non-decreasing.

**Reversal trigger, as a condition:** _the first factor whose unit cannot be
expressed as a percentile of its own history._ That premise is what the family
rests on — see part 3.

### 2. No imputation, no renormalisation, and the FACTOR COUNT is part of the score's identity

```
score = Σ_{i∈P} round(w_i × u_i / 100)        max = Σ_{i∈P} w_i
```

An absent factor **contributes nothing and reduces the maximum**. The number
therefore means **"at least this unusual, on the evidence we have"** — it can
only understate, never overstate.

**Both halves of the label travel**, because with unequal weights `2 of 3` has
three different maxima depending on **which** two.

**Two scores are comparable iff computed over the same factor set.** A ranked
surface ranks **within** one cohort, names it, and counts the others — ranking
across cohorts systematically promotes the worst-covered securities, which is
what `UNIVERSE.md` rule 4 spent ~19 discretionary curation slots to prevent.

**And the band floors are the second reason, which matters when the first does
not apply.** AC 3's original argument assumes the absence is **uneven**. The
volume factor's absence is **uniform across the entire universe**, so
renormalising it would promote nobody and that argument is silent — but
`ANOMALY_BAND_FLOORS` are **measured quantiles of a max-75, two-factor
distribution**, so renormalising to 100 would **invalidate all three floors on
the day it shipped**.

**The floors are derived, not chosen:** `elevated 32 · high 63 · extreme 73`,
from **34,318 measured scores**, selected by the inequality `elevated ≤ 40 < high`
— because a one-factor score caps at 40 and _less evidence must mean less claim_.
That inequality **rejected p75 = 49**, which would have made every reduced-factor
score `normal` for ever.

**Reversal trigger, as a condition:** _the first surface that must rank a
reduced-factor score against a full-factor one._ And for the floors: _the first
score computed over a factor set this derivation did not measure_ — which fires
the day a third factor contributes, because every quantile behind them is a
two-factor figure.

### 3. The score and its explanation are ONE OBJECT, and the guarantee ENDS AT THE WIRE

`AnomalyScore` cannot be constructed without its explanation. **Said precisely,
because a claimed mechanism that is really prose is this repository's
most-recorded failure mode:**

- **A compile error about WHICH MODULE MINTED IT.** A real non-exported `Symbol`
  brands the value, so no object literal elsewhere satisfies the type; clauses are
  branded **per factor** and mintable only in their own module; and
  `contributing` typed as `[T, ...T[]]` makes a **zero-factor score untypeable**.
  A structurally complete clause with every field right is **still** a type error.
- **A TEST that the number is `round(w × u / 100)` of the right inputs.**
  TypeScript cannot prove that, and saying it can would be the failure above.
- **Nothing at all across `JSON.parse`** — a brand is erased, so inbound bytes
  carry no construction proof.

**What replaces it across the wire is STRONGER than the type claim it loses.**
The reader **re-adds the published contributions, re-derives each from the
published weight and figure, re-adds the maximum, recomputes the band, and
refuses the section when they disagree** — a statement about the **value**, which
a pass-through spec structurally cannot make.

**`declare const brand: unique symbol` does NOT work here**, and the attempt is
recorded because it compiles: a declared symbol has no runtime value, so the
first draft used `as unknown as AnomalyScore`, **built clean**, and failed 43
tests with `brand is not defined` the moment the key was written. The shipped
brand is a real `Symbol`, which makes every mint a **checked construction**
rather than an assertion that validates nothing beside it.

**Reversal trigger, as a condition:** _the first consumer of a score that is not
a renderer_ — Epic 7's deterministic tools, Epic 10's agent — at which point the
explanation may need to be addressable separately and the brand's two mint sites
become three.

## Consequences

**Three correctness layers, and they are not interchangeable** — proved rather
than asserted, twice. A `u = rank + 1` defect is caught by **the golden sample
only**; a `rank × 0.8 when n < 1000` defect by **the independent recompute only,
with the golden sample green**; a renormalisation by **the properties**. The
property that catches the absence rule is `score(P) ≤ score(P ∪ {j})`, and the
one that catches `?? 0` is **independence from an absent factor's adversarial
slot value** — which finds it without grepping for it.

**Two properties are FALSE and must not be written.** Monotonicity over
`|return|` is false **of the pipeline**, because `|return|` feeds both the price
percentile and the excess move, so a larger return in the sector's direction
raises one term and lowers the other — _everything else equal_ is a state of the
**combination function**, not of the pipeline. And monotonicity **across**
differing factor sets is false **by design**, because a reduced-factor score
lives on a lower scale. Both are stated here so the next author does not write
them, find them red, and "fix" them by renormalising.

**A stored score is a cache of a POLICY.** `0017_session_composite_scores.sql`
stores the **factor answers** rather than a factor-set array — so the set has no
second home, `max` and `band` are derivable, and **`scoreAnomaly` remains the
only arithmetic**. The weights and the floors sit on the **pass** row, because
both carry reversal triggers and a rollback must not leave a runner and a reader
two values apart.

**And ADR 0045 permits the composite CONDITIONALLY.** The sum is tape-safe only
because each factor is a **percentile of its own same-tape history**, which
quotients the tape out. An invented curve is calibrated in one tape's units, so
**part 1's reversal trigger and ADR 0045's invariance test are the same rule
arriving from two directions** — which makes _interpretable_ a correctness
constraint rather than a matter of taste.

## Alternatives considered

Each is refused in part 1 by name. The one worth recording separately is
**renormalising over present factors**, which is the only alternative with an
honest case — it is what AC 3's own stated reason fails to cover for a uniform
absence — and it is refused on the band floors instead.
