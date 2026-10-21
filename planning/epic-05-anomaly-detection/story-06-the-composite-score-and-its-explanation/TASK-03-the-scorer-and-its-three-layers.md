# Task 5.6.3 — The scorer, and its three layers

**Status:** Not started
**Story:** [5.6 The Composite Score, & Its Explanation](STORY.md)
**Depends on:** 5.6.2

## Objective

The combination rule, the type that makes the epic's exit criterion a compile
error, the band boundaries derived from 5.6.2's measured distribution, and the
three correctness layers Story 5.3 proved are not interchangeable.

**It goes in `packages/shared/src/`, and that is the whole purity argument.**
`eslint.config.mjs:374-393` scopes the clock rules to `packages/shared/src/**`
and permits nothing at all, deliberately. Put the scorer there and **AC 12's
_reads no clock, socket or handle_ becomes a lint error** rather than a reading.
`docs/GAPS.md`'s _Nothing checks for `?? 0`, and backend factor purity is held by
prose_ names **"the next story that adds a factor"** as its owner. That is this
story.

## What the user can see when this lands

**Nothing.** Task 5.6.4 draws it. This is the third consecutive task with no
visible change, which is the most this story will accept — said plainly because
a run of invisible tasks is how a product stops being demonstrable.

## Work

- **The combination: a weighted sum in score points, and six things make the
  addition checkable.** Weights are **integers summing to 100 over the full
  factor set** (`_"of its 40"_` is unreadable unless the weight is the term's own
  maximum in the score's unit); each factor maps to `u ∈ [0,100]`; a contribution
  is `c = w × u / 100` so `0 ≤ c ≤ w` **by construction**; the printed precision
  of score and contributions is the same; and the factor's printed figure **is**
  the unit value, so the multiplication is checkable too.
  - **Round each contribution first, then sum; the score IS that sum.** If
    contributions are rounded for display while the score is computed from
    unrounded values, `38 + 12 = 50` can be drawn beside a score of `51` and
    the reader's addition fails **on a correct implementation**. Cost, stated:
    the score can differ by up to ±1 from `round(Σ w·u/100)`. Monotonicity
    survives (`Math.round` is monotone non-decreasing). Record it with a
    reversal trigger.
- **The absent-factor rule, which is the hardest rule in the story.** No
  imputation, no renormalisation: `score = Σ_{i∈P} round(w_i × u_i / 100)`,
  `max = Σ_{i∈P} w_i`. **The number means _at least this unusual, on the evidence
  we have_** — it can only understate. State both halves of the label: the count
  **and** the maximum, because with unequal weights `2 of 3` has different maxima
  depending on **which** two.
- **The bands, derived rather than chosen.** The owner's Gate 1 answer: **raw
  score, with `extreme` above what a reduced-factor score can reach**, so less
  evidence means less claim. Take the cut-points from 5.6.2's measured
  distribution, check the coupling AC 1 states (the region holds **10 rows and
  cannot grow**), and ship with a **condition**: _the first session in which more
  than three of `/`'s ten rows draw the same band_.
  - Amend `anomaly.ts`'s docblock, which currently records the boundaries'
    deliberate absence. **Amend, do not rewrite.**
- **The type.** `declare const brand: unique symbol`, the `ticker.ts` pattern:
  export the **type** only, no exported constructor, no satisfiable interface.
  Clauses branded **per factor**, mintable only in their own module, so
  `{ label: "Volume", figure: 3.8 }` is a type error. `contributing` as
  `[T, ...T[]]` makes a zero-factor score untypeable. `AbsentFactor` is a **two-
  armed union** so _no data_ and _refused_ differ in **shape**, not in a nullable
  word.
  - **State the limit honestly in the record.** TypeScript cannot prove the
    number inside a branded clause came from the calculation it names — that is
    a compile error about **which module minted it** and a test about the value.
    A claimed mechanism that is really prose is this repository's most-recorded
    failure mode.
  - **The brand dies at `JSON.parse`, and the repair is stronger than the type
    claim it replaces.** `readUnusual`'s shape: a total validating reader that
    **re-adds the published contributions and refuses the section when the sum is
    not the score it was sent**. That is a statement about the **value**, which is
    what AC 5 was reaching for. **Exactly two mint sites** — the scorer and the
    reader — held by a `pnpm invariants` conjunct plus a break.
  - **`Object.keys` skips symbol keys**, so a `WireFields` entry for a branded
    member would typecheck and **never be read** — the explanation would silently
    never encode. Two types and a named mapper, never a spread.
- **Three correctness layers, because 5.3 proved they are not interchangeable** —
  a signed-percentile defect caught by **properties only**, `rank + 1` by the
  **golden sample only**, `rank × 0.8 when n > 500` by the **independent
  recompute only, with the golden sample green**.
  - **Properties**: unsignedness (`score(+x) === score(−x)`); weak monotonicity
    **per factor over factor inputs**; `score(P) ≤ score(P ∪ {j})` — the formal
    statement of no-renormalisation and the **only** thing that catches it;
    independence from absent factors' adversarial slot values (`0`, `100`, `NaN`,
    `−1`) — the property that catches `?? 0` **without grepping**; range; band
    tiling exhaustive over `0..100`; explanation totality; determinism.
  - **Golden sample**: ~12 rows, input → `{score, band, every clause verbatim}`,
    chosen adversarially **about boundaries** — one row on each cut-point and one
    either side — with the arithmetic **written out in the task record**. If a
    golden row cannot be verified by addition in the record, the combination rule
    is not the one the story chose.
  - **Independent recompute**: written from the published weights and drawn
    figures, **by hand, in a different file**, over hundreds of synthetic
    securities with **varied factor presence and varied `sampleCount`** — that is
    the axis a conditional rule hides on and a golden sample cannot cover.
- **Two properties that are FALSE and must not be written** — stated here so the
  next author does not write them, find them red, and "fix" them by
  renormalising:
  1. **Monotonicity over `|return|` is false of the pipeline.** `|return|` feeds
     **both** the price percentile and the excess move, so a larger return in the
     sector's direction raises one term and lowers the other. _Everything else
     equal_ is a state of the **combination function**, not of the pipeline.
  2. **Monotonicity across differing factor sets is false by design.** A 2-of-2
     at the 99th can score below a 2-of-2... and a reduced-factor score lives on
     a lower scale. That is AC 3 working.
- **`?? 0` becomes mechanical**, closing half of `docs/GAPS.md`'s entry: one
  conjunct with an **argued, stated** exemption list (`volume-ratio.ts`'s
  documented `NOTHING_OBSERVED` destructure, plus whatever the grep finds), one
  break, plant written as **the file the next story would write**. The other half
  — widening the clock rules to `apps/backend/src` — stays open **with that said
  explicitly**, because widening catches the gateway reading the clock
  legitimately.
  - **`one-home-for-the-multiple-glyph`'s break plant is `composite-score.ts`**,
    this task's likely filename, and it already has a transcript of a check
    passing wrongly against it. Import `formatMultiple`; do not write a second `×`.
- **A third comparator guard is owed.** `one-comparator-for-the-order-of-a-percentile`
  keys on `\.(?:rank|ordinal|percentile)` and the move guard on
  `(?:percent|change|move)`; a composite comparator on `.score` matches
  **neither**. And the comparator needs a **declared tie-break** — `symbol`
  ascending — because an integer 0–100 over 501 securities makes ties routine,
  and ADR 0041 forbids a ranked surface re-ordering under a reader with nothing
  having changed.

## Done when

1. `scoreAnomaly` is pure, in `packages/shared/src/`, and the clock rules cover it.
2. An `AnomalyScore` without an explanation does not compile; the brand has
   exactly two mint sites, held by an invariant with a break.
3. The reader recomputes the score from the explanation and refuses on disagreement.
4. All three layers exist; the golden sample's arithmetic is written out; the
   recompute's break is confirmed red **with the golden sample green**, transcript kept.
5. The boundaries are derived from 5.6.2's distribution, with a condition.
6. `?? 0` is mechanical with a stated exemption list; the purity half is named as open.
7. `pnpm verify` green, `66+` invariants, every new break run.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — YYYY-MM-DD

## For a stakeholder — a status report, YYYY-MM-DD
