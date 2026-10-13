# Story 5.6 — The Composite Score, & Its Explanation

**Status:** Not started
**Epic:** [Epic 5 — Anomaly Detection](../EPIC.md)
**Depends on:** 5.4, 5.5
**Epic scope covered:** composite anomaly score, human-readable anomaly explanation

## Description

**This is the story where the product says the sentence the epic exists for**,
and the first time a 0–100 figure appears anywhere.

Three factors are scored — the price percentile, the volume ratio and the
relative move — and **breadth is a stated clause rather than a weight** (Story
5.1's decision 4). The score is **absolutely calibrated** against each
security's own history (decision 5), so a quiet day produces no high scores and
the product says so.

**The combination rule has one honest family.** A weighted sum is the only one
where _"this score is 91 because the price term contributed 38 of its 40"_ is a
true sentence a reader can check by addition — which is what §11's
_interpretable rather than sophisticated_ asks for. The alternatives were each
refused for a stated reason: **max** throws away corroboration; a **product**
lets one absent factor annihilate the score; **rank-based cross-sectional**
guarantees a 91 on a dead day; **Mahalanobis or PCA** is excluded by
_interpretable_ and is unexplainable to a reader.

**Every factor must be in the same unit before combining, and exactly one unit
needs no invented constant: a percentile of that factor's own history.** The
price factor is already one. A volume **ratio** and an **excess move** are not
0–100 and need a mapping — and any curve (a log cap at 10×, a sigmoid, a chosen
knee) is a constant somebody invented that would outlive the guess, which is
exactly what `AnomalyBadge` refused to do with the band boundaries.

**And the score and its explanation should be one thing rather than two.** §11's
last line and invariant 1 are strongest expressed as a type: **`AnomalyScore`
cannot be constructed without its explanation, and the explanation cannot hold
a figure that was not produced by a named calculation.** That makes _every score
can be explained from deterministic calculations_ a compile error rather than a
test.

## What the user can see when this story lands

**`ANOMALY 91` — or more often `ANOMALY 12` — on the security page**, with its
band, and its own account beneath it: one clause per contributing factor with
the figure in the product's own units, one clause per **absent** factor, how
much of the window was observed, the tape each figure came from, and the
breadth clause as context.

**And `/`'s `Unusual activity` upgrades from band-only to the composite**, so
the two surfaces finally agree about what is ranked.

## Acceptance criteria

1. **The four band boundaries are decided and recorded with their
   alternatives.** `anomaly.ts` and `AnomalyBadge` have deliberately omitted
   them because _"a threshold invented in a styling task would outlive the
   guess"_. They are **coupled to Story 5.4's measured row count**: the
   boundaries decide how many rows typically qualify, and the region cannot
   grow.
2. **The weights are published on screen in the explanation**, so their
   arbitrariness is visible rather than hidden.
3. **No imputation, and no silent renormalisation over the present factors.**
   Renormalising raises the variance of a score computed from fewer factors,
   which **systematically promotes the worst-covered securities into the
   top-N** — the opposite of what `UNIVERSE.md` rule 4 spent ~19 discretionary
   curation slots to prevent. **The number of contributing factors is part of
   the score's identity**: a 2-of-4 score is reported, labelled, and not ranked
   against a 4-of-4 score.
4. **The score is unsigned and carries no direction.** A score higher for falls
   than rises is a risk signal, which §11 forbids in terms.
5. **`AnomalyScore` cannot be constructed without its explanation** (above),
   and every figure in an explanation traces to a named calculation — asserted
   by walking the explanation rather than by reading it.
6. **The explanation carries all nine required elements**: the score and band;
   one clause per contributing factor with its figure and definition; one clause
   per absent factor distinguishing _no data_ from _refused_; how much of the
   window was observed for **this** security; the instant the figures were
   observed **through**, never the instant the score was computed; the tape or
   tapes; the population every group-level figure was counted over, as counts
   rather than percentages, from the one shared builder; the
   **`classification.checkedOn` date** wherever a sector or industry is named;
   and **no causal language** — causality is §5.3's confidence vocabulary and
   belongs to findings, not scores.
7. **Factor clauses carry figures, not intensity adjectives.** `99th percentile
of 4,680 five-minute returns` rather than `Extreme` — because `extreme` is
   also a band name, and the word for one factor's clause disagreeing with the
   word for the whole security's band is a collision waiting to render.
8. **`AnomalyBadge` and `SecurityRow` are adopted or deleted, and the
   disposition is recorded.** Both are currently rendered by nothing shipped,
   `pnpm verify` cannot see it, and the decisions in them — four named bands
   rather than a gradient, deliberately, because a band can be labelled — must
   not be thrown away silently.
9. **The relative-move factor's reference is decided**: the capitalisation-
   weighted sector ETF, or the unweighted **industry peer median**. The ETF's
   weighting means a mega-cap is largely compared with itself, so **scores
   computed from that ratio are not comparable across securities of different
   weight and nothing has measured the effect** — which makes a top-N over it a
   top-N of small constituents. The peer median removes the bias and makes the
   group reference the same population as the breadth clause.
10. **A score is never silently re-based onto a newer minute while a reader is
    looking at it.** It names the bar instant it was computed from, and a
    revision for that instant **recomputes in place** — the crosshair's own
    decision (Task 3.9.6), because a mark behaving differently from the
    crosshair on the same axis would be two answers about one bar.
11. One sentence, once, on the security page and not on the list: **the score
    does not represent risk or investment opportunity.** A 0–100 figure on an
    amber ramp beside a price is read as a risk meter by every stranger, and
    §40's criterion is a first-time viewer understanding the product in a
    minute.
12. The gated criteria are the ones a zero-bar store can prove: a score cannot
    exist without its explanation; identical inputs give an identical score
    byte-for-byte; the scorer reads no clock, socket or handle; **monotonicity**
    — a larger |return| with everything else equal never scores lower; and on
    CI's permanent state **every score is absent and every region draws its
    honest sentence**.

## Design work

The 0–100 figure, its band chip and its explanation, in the region whose
reserved sentence already promises exactly this: _"How unusual this security's
behaviour is right now, scored 0–100 with the reason beside it."_ **The canvas
needs a page for it** — there is none — and the explanation is the first
multi-clause account of a figure this product has drawn.

## Out of scope

`Anomaly history`, any score in the universe table, and Epic 7's `Investigate`.
