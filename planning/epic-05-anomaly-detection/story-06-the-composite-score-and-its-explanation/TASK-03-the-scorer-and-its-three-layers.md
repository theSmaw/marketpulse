# Task 5.6.3 — The scorer, and its three layers

**Status:** **Complete — 2026-10-22**
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

**Nothing.** Task 5.6.5 draws it. This is the third consecutive task with no
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

## What was done — 2026-10-22

**Status: complete.** `pnpm verify` exit **0**, **69 invariants hold** (66 → 69),
`pnpm test:database` **356 passed**, three new breaks each confirmed red for the
right reason.

### The combination rule, and the six things that make the addition checkable

`packages/shared/src/composite-score.ts`. Two scored factors and one stated
absence, per Gate 1 decision 1.

| factor           | weight | why that number                                                                                                                                                                                                                                                               |
| ---------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| price percentile | **40** | the security's own behaviour — the question a reader asked                                                                                                                                                                                                                    |
| excess move      | **35** | corroboration of it, and the five-point gap is **measured**: `excess-move-baseline.ts` records that a sample needs **four** closes, so _"`n` here is strictly below the price baseline's for the same security"_ — less history, less confidence, less weight                 |
| volume           | **25** | ADR 0045 rather than coverage: volume is an **extensive** quantity, measured at **3.54%–15.19%** of consolidated volume, so a percentile of one venue's own history is a weaker statement about _the market's_ volume than the price percentile is about _the market's_ price |

Integers summing to **100 over the full factor set**, so `38 of its 40` is in
the score's own unit. A contribution is `round(w × rank / 100)`, bounded
`[0, w]` by construction. **The unit value IS the drawn ordinal** (`u = rank`),
so the multiplication is checkable from the screen. **The score is the sum of
the rounded contributions**, with the cost stated and **demonstrated rather
than asserted** — a test counts the disagreements against
`round(Σ w·u/100)` and finds them non-zero, because a free decision does not
need a reversal trigger.

### The band floors, DERIVED — and the measurement changed the answer

A throwaway instrument against the local store: the 2026-09-11 session, every
S&P-500 constituent holding both generations, scored at each of the **77**
five-minute grid pairs — **34,983 pairs walked, 34,318 two-factor scores**, 665
with no readable price comparison. Run, recorded, deleted.

```
--- pooled two-factor score distribution (max 75) ---
  p1   3     p50  32    p85  58     p99   73
  p5   7     p60  38    p90  63     p99.5 74
  p10  10    p70  45    p95  69     p99.9 75
  p25  18    p75  49    p97.5 72    min 0  max 75  mean 34.32
  rank correlation (Pearson over ordinals): 0.6756
  mean price rank 45.41, mean excess rank 46.09
```

**The headline finding is that the score is near-uniform over its whole range,
which no amount of arguing would have produced.** The median security at a
random instant scores **32** — because a percentile is uniform on its own
sample by construction — so a band set written from intuition would have put
`extreme` somewhere around the 65th percentile of an ordinary session. The two
factors are **correlated at 0.68**, so the independent-uniform convolution is
also wrong.

| floor      | quantile | value  |
| ---------- | -------- | ------ |
| `elevated` | p50      | **32** |
| `high`     | p90      | **63** |
| `extreme`  | p99      | **73** |

**Gate 1 decision 2 is what selects those three quantiles**, and the arithmetic
is one inequality. A single-factor score reaches at most **40** (`round(40 ×
99/100) = round(39.6) = 40`), so _"`extreme` above what a reduced-factor score
can reach, graduated rather than absolute"_ is

```
elevated ≤ 40 < high
```

— which chose **p50 over p75**: the measured p75 is **49**, above 40, and would
have made **every** reduced-factor score `normal` for ever, saying _ordinary_
about a security at the 99th percentile of its own history. Under the shipped
floors a price-only score needs the **79th** percentile to read `elevated`
(`round(31.6) = 32` against `round(31.2) = 31`) and can never read `high`.

What the floors draw, per instant over the **484** securities scored at a median
anchor: `normal` **219.2**, `elevated` **179.4**, `high` **39.3**, `extreme`
**7.74** — 8.1% and 1.6% of the universe.

### AC 1's coupling to `UNUSUAL_ROWS = 10`, checked — and the story's reversal trigger is ALREADY MET

Across the top ten of each instant under the shipped floors: **7.2 `high`, 2.6
`extreme`, 0.2 `elevated`, 0.0 `normal`** — two bands typically, three
occasionally, never a `normal` row. A reader meets a ladder rather than ten
identical chips.

**But Story 5.6's own condition — _"the first session in which more than three
of `/`'s ten rows draw the same band"_ — is met in 77 of 77 instants, under
every one of six candidate floor sets, and all ten rows share one band in 35 of
77 (45%).** It is not a signal; it is arithmetic. Ten rows selected as _the ten
most unusual_ come from the extreme top of the distribution, so they
concentrate in the top bands **by construction** — that is the ranking working,
not the bands failing. The condition is recorded as **corrected rather than
deleted**, because it was the owner's and the correction is a measurement.

Two conditions replace it, and the first is the one that will fire:

1. **The first score computed over a factor set this derivation did not
   measure** — in practice the first session in which the volume factor
   contributes. Every quantile above was taken over **two** factors with a
   maximum of 75; a three-factor score has a maximum of 100 and a distribution
   shifted up by roughly a third.
2. **The first session whose median instant draws `extreme` for more than a
   fifth of the scored universe.** Measured today at **1.6%**, a 12× margin.
   (The weaker candidate _"more than a fifth in `high` or `extreme`"_ fires in
   **11 of 77** instants already and is not a trigger.)

### A product claim this measurement falsifies — routed, not repaired

`PRODUCT_SPEC.md` §11's _"a quiet day produces no high scores and the product
says so"_ is **false of any composite whose factors are percentiles of each
security's own history**, and this is the demonstration: ~1% of securities sit
at their own 99th at **every instant of every session**, quiet or not, because
a percentile is uniform on its own sample. The only thing that would make a
quiet day quiet in the cross-section is a **cross-sectional** reference, which
§11's decision 5 refused in terms (_absolutely calibrated against each
security's own history_). The two sentences cannot both hold. **For the owner**
— it is a product claim, not a defect in these floors, and the honest repair is
to amend §11 rather than to move a boundary.

### The type — and which half is a compile error, which half is a test

`AnomalyScore` carries `contributing: [T, ...T[]]`, so **a score with no
contributing factor is untypeable**; a security whose every factor refused is
`UnscoredAnomaly`, a different type with **no `score` member to read**, which
is `BaselineComparison`'s mechanism rather than a constant and a branch.
Clauses are branded **per factor**.

**AC 5's two halves, said plainly:**

- **A compile error** — _which module minted the value_. The brand's symbol is
  not exported, so `{ label: "Volume", figure: 3.8 }` is a type error wherever a
  clause is wanted, and so is a **structurally complete** clause with every
  field right. Both are `@ts-expect-error` assertions in the test, which fail
  the **build** if they ever stop erroring.
- **A test** — _that the number is `round(w × u / 100)` of the right inputs_.
  TypeScript cannot prove that and never will.

**One divergence from the `ticker.ts` pattern, produced rather than reasoned
about.** A branded **object** has to be constructed, and a `declare const brand:
unique symbol` has no runtime value — so the first draft used
`as unknown as AnomalyScore`, built clean, and **all 43 tests failed with
`brand is not defined`** the moment the key was written. The shipped brand is a
real non-exported `Symbol`, which makes every mint a **checked** object
construction (a missing field is a compile error naming it) rather than an
assertion that checks nothing beside it. `JSON.stringify` drops symbol keys, so
nothing about the wire changed.

**The brand dies at the socket, and the repair is stronger than the type
claim.** `readAnomalyScore` is total and makes five checks, of which the third
is the point: it **re-adds the published contributions and refuses the
explanation when the sum is not the score it was sent**, and **re-derives each
contribution from the published weight and the drawn figure**. Also: distinct
factors, `Σ weight === max`, and the band recomputed from the score rather than
read. That is a statement about the **value**, which is what a pass-through spec
structurally cannot make.

**Exactly two mint sites**, held by `two-mint-sites-for-an-anomaly-score` plus a
break. And **two types with a named mapper, field by field, never a spread**:
`WireFields<AnomalyScore>` is a mapped type over `keyof`, which includes the
brand's **symbol** key — the entry would typecheck and `toWire`'s
`Object.keys` walk would **never read it**, so the explanation would silently
never encode.

### Three correctness layers, and three planted defects — which layer caught which

`composite-score.test.ts` (properties + golden sample) and
`composite-score-recompute.test.ts` (the recompute, in a **different file**).
Each plant was applied alone and both files run.

| plant                                          | properties | golden sample    | recompute       |
| ---------------------------------------------- | ---------- | ---------------- | --------------- |
| **A — `u = rank + 1`**                         | green      | **RED, 13 rows** | green           |
| **B — renormalise `round(100 × score / max)`** | **RED**    | **RED**          | **RED**         |
| **C — `rank × 0.8 when sampleCount < 1000`**   | green      | green            | **RED, 1 test** |

**Plant A** reproduces Story 5.3's `rank + 1` exactly: the properties are blind
because they read the clause's own `rank`, which the plant also moved — a
property that shares the mapping cannot see a defect in it. The **`rank + 1`
row** (`price = 1, excess = 1 → 0`, against `1 + 1 = 2` under the plant) is the
row that pins it. A bonus finding: `readAnomalyScore`'s **contribution
re-derivation also caught it**, which is a mapping defect caught by a runtime
reader rather than by a layer.

**Plant B** was caught by all three, including the `score(P) ≤ score(P ∪ {j})`
property specifically. Stated honestly: renormalisation also breaks the sum and
the maxima, so this one is over-determined — the property is the only layer
that catches a _subtle_ renormalisation, and the crude one trips everything.

**Plant C** is the faithful reproduction of the finding that made this story pay
for three layers: **exactly one test red, in the recompute, with the golden
sample and every property green**. The conditional hid on `sampleCount`, which
every golden row and every property holds at 4,620 and which the recompute
varies from 1 to 4,620. And within the recompute, only the
**count-invariance** test saw it — _"reaches the SAME score"_ was green, because
the recompute reads the **published** rank, which already carried the damping.

### Two properties that are FALSE and are deliberately not written

Written into the test file's own header so the next author does not write them,
find them red, and "fix" them by renormalising.

1. **Monotonicity over `|return|` is false of the pipeline.** `|return|` feeds
   **both** factors, so a larger return in the sector's direction raises the
   price percentile and **lowers** the excess. _Everything else equal_ is a
   state of the **combination function** and not of the pipeline. What is
   written is monotonicity **per factor over factor inputs**.
2. **Monotonicity across differing factor sets is false by design.** A 2-of-3
   at the 99th on both factors is 75; a 1-of-3 at the 99th is 40. That is AC 3
   working, and the true property is the one-directional
   `score(P) ≤ score(P ∪ {j})`.

### There is no `no-data` arm, and that is a correction rather than an omission

The brief asks for _no data_ and _refused_ to differ in shape. **The shipped
factor vocabulary already decided that they do not**, deliberately:
`return-baseline.ts` folds _we hold no distribution at all_ into
`too-few-samples` with a counted `0`, because _"`0 of 2,500 returns` is a true
statement about a cold replica and a second sentence for it would be a second
sentence saying the same thing"_, and `excess-move-factor.ts` repeats it. A
fourth arm would be a **second vocabulary** for one fact. The two arms that do
differ in shape are the two the product distinguishes: **`refused`** (_we will
not answer_) and **`inapplicable`** (_the question does not arise_) — Task
5.6.2's third kind, carried through.

### Three invariants, three breaks, and `?? 0` is half mechanical

**`no-imputed-zero-in-a-figure`** — over **every shipped source file in three
trees**, with three argued **shapes** rather than a file list (nine sites, zero
residue): a **cardinality** (`.length ?? 0`), a **tally accumulation**
(`(map.get(k) ?? 0) + 1`), and a **third party's own JSON read by a
diagnostic** (an optional bracket access with a **string-literal** key). The
string literal keeps the third narrow — **an array index is never one**, so
`breakpoints[rank] ?? 0`, Story 5.5's own defect class, is not exempt.

**Writing the check found three more live instances**, which is the
`docs/GAPS.md` entry's own prediction (_the fourth will land unnoticed_) met
three times over. All three were repaired in the same change:

- `breakpointsOf`' `sorted[lower] ?? 0` — would have put a **magnitude of
  zero** into a drawn percentile. Now a throw.
- `heldRowCounts`' `Number(row?.sip ?? 0)` — now a branch, `excess-move-
factor.ts`' shipped idiom.
- `live-series.ts`' `bars[bars.length - 1]?.startsAt.getTime() ?? 0` — would
  have dated a chart's coverage **from 1970**. Now an early return.

**The purity half stays open and is named as open.** Widening
`eslint.config.mjs`' four clock rules to `apps/backend/src` still catches
`index.ts` and `market-gateway.ts`, which read the clock **legitimately**. What
this task did instead was **site the new factor where the rules already
reach** — `packages/shared/src`, which makes AC 12's _reads no clock, socket or
handle_ a lint error for **one** factor, with the five in `apps/backend/src`
still held by prose. `docs/GAPS.md` carries the half-discharge.

**`two-mint-sites-for-an-anomaly-score`** and
**`one-comparator-for-the-order-of-a-composite-score`** — the second a **third**
sibling rather than a widening, because the percentile guard keys on
`\.(?:rank|ordinal|percentile)` and the move guard on
`(?:percent|change|move)`, and `a.score - b.score` matches **neither**. Its home
`score-ranking.ts` declares the tie-break — **score descending, then ticker
ascending** — because the shipped two-factor scale holds **76** values for ~484
scored securities, so some score is shared on every frame.

### Every naive draft was run against the plant first, and all three passed wrongly

The plant is `apps/backend/src/market-composite.ts` — **the file the next story
writes**: a producer with `stored?.sampleCount ?? 0`, `clause?.contribution ??
0`, `} as unknown as AnomalyScore;` and
`candidates.toSorted((a, b) => b.score - a.score)`. Each check was reduced to
its obvious draft in turn, with the plant on disk:

- **`?? 0` scoped to `packages/shared/src`, anchorless** — green, while the
  other two were red: `2 of 69 invariants failed`, naming the other two.
- **the mint check counting declarations of `scoreAnomaly`/`readAnomalyScore`**
  — green, same transcript.
- **the comparator check reduced to clause one** — green, same transcript.

And **one draft went red for the wrong reason**, which reads exactly like
proof. The narrowed `?? 0` scope _with the anchor still in place_ goes red — on
the **anchor**, saying _no line matches one of the three exempt shapes_, because
all nine exempt sites are in `apps/backend`. A reader seeing red there would
have recorded the check as proved and the scope as fine. The first draft of the
mint check also went red on **five innocent files** — `ticker.ts`,
`market-time.ts`, `time-range.ts`, `bar-series.ts`, `market-provenance.ts` —
each declaring a brand of its own; the brand key is now the home's **anchor**
and is not scanned across the corpus.

### The three breaks, verbatim

```
$ pnpm break an-imputed-zero-reaches-a-figure
Breaking apps/backend/src/return-percentile.ts
  $ node scripts/check-invariants.mjs
✓ apps/backend/src/return-percentile.ts broken → red → restored byte-identical.
  matched: no-imputed-zero-in-a-figure

$ pnpm break a-third-mint-site-for-an-anomaly-score
Breaking apps/backend/src/excess-move-factor.ts
  $ node scripts/check-invariants.mjs
✓ apps/backend/src/excess-move-factor.ts broken → red → restored byte-identical.
  matched: two-mint-sites-for-an-anomaly-score

$ pnpm break a-second-order-for-a-composite-score
Breaking apps/backend/src/market-unusual.ts
  $ node scripts/check-invariants.mjs
✓ apps/backend/src/market-unusual.ts broken → red → restored byte-identical.
  matched: one-comparator-for-the-order-of-a-composite-score
```

Every plant **keeps the found line and appends the defect beside it**, so the
registry's own `find` survives its own break. Two of them had to be **repointed
to files outside this change**, because `pnpm break` refuses on a dirty target
and `composite-score.ts` is new — stated because it means the plants exercise
the **corpus** rather than the home, which is the stronger direction.

### What is NOT here, and why

- **The wire frame and the producer.** `WireAnomalyScore`, `toWireAnomalyScore`
  and `readAnomalyScore` exist and are tested; **nothing sends one**. The frame
  field, the gateway's call are Task 5.6.4's and the draw is Task 5.6.5's. The reader is here
  because done-when item 3 asks for it and because it is what makes AC 5 a
  statement about a value.
- **The band floors as a parameter.** The brief asks for them as a parameter
  first; they were a parameter **in the throwaway instrument**, which spelled
  its own candidate sets, and are a published constant in the shipped module. A
  parameter nobody passes is a second home for the floors.
- **The region's own `score / max` label, the chip and the sentences.** 5.6.4's.

### What the user can see

**Nothing.** Task 5.6.5 draws it. Third consecutive invisible task, which the
story says is the most it accepts.

### Gates

| gate                    | result                                                                       |
| ----------------------- | ---------------------------------------------------------------------------- |
| `pnpm verify`           | **exit 0** — `69 invariants hold.`, `0` lines matching `Unhandled`           |
| `packages/shared` tests | `28 files, 594 tests passed` (was 536)                                       |
| `apps/backend` tests    | `65 files, 1287 passed`                                                      |
| `apps/frontend` tests   | `94 files, 1651 passed`                                                      |
| `pnpm test:database`    | `12 files, 356 passed` — run because the data layer was touched              |
| `pnpm break` ×3         | each red, each `matched:` the check under test, tree restored byte-identical |
| `pnpm e2e`              | **not run** — out of scope by the brief; nothing in this change renders      |

## For a stakeholder — a status report, 2026-10-22

The product can now **score** how unusual a security's behaviour is, on a 0–100
scale, with an account of itself that a reader can check by addition. Nothing
draws it yet; the next task does.

Two things are worth a stakeholder's attention.

**The thresholds for _normal_, _elevated_, _high_ and _extreme_ were measured
rather than chosen**, over 34,318 real scores from one trading session across
the whole tracked universe. That matters because the measurement contradicted
the intuition: an unusualness score built from each security's own history is
**evenly spread over its whole range**, so the obvious boundaries would have
labelled roughly a third of an ordinary market _extreme_. The shipped
boundaries put 8% of the market in _high_ and 1.6% in _extreme_ at any moment.

**One claim in the product specification is now known to be false**, and it is
recorded for the owner rather than quietly worked around: the spec says a quiet
day produces no high scores. It cannot, by the arithmetic the spec itself
chose — about 1% of securities are at the top of their own history at every
moment of every session, calm or not. Making that sentence true would require
comparing securities against **each other**, which the same spec section
explicitly rules out. It is a sentence to amend, not a number to move.

**Where the score is still absent: everywhere a person can look.** The volume
factor is refused on every machine that exists, so every score today is two
factors of three, and the figure is labelled with how much evidence is behind
it — it can only understate. No gated machine and no person has seen a
composite score, because the test environment holds no market history at all.
