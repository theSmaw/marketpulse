# Task 5.7.3 — The exit criterion rewritten as a shape, in both its homes

**Status:** **Complete — 2026-10-29. `91` is not merely unproducible on demand — on the shipped scale it is UNREACHABLE**, because the volume arm is `no-distribution` unconditionally and the ceiling is 75, so §9's `91/84/79` are all above it. The shape is written into **both** homes in one change, after finding `EPICS.md` was the **fourth** live site of a 2026-10-20 correction. And the owner's quiet-day decision landed on **Epic 7's file**, not §11 — §11 had already been amended, and the scorer's own note pointed at the repaired site while the real one went unamended for a week.
**Story:** [5.7 The Rehearsal, the Sweep, & Epic 5's Close](STORY.md)
**Depends on:** —

## Objective

Epic 5's exit criterion is a worked example and **five of its five clauses**
cannot be checked as written. The story says four; that was true when it was
written and became false on 2026-10-21, when Story 5.6's Gate 1 established that
`Extreme short-term move` uses a **band name** as a factor adjective. Only the
trailing sentence — _Every score can be explained from deterministic
calculations_ — survives intact.

So the criterion is rewritten as a **shape**, the original is quoted and left
standing as the record of what was asked for, and the rewrite is verdicted.

## What the user can see when this lands

**Nothing.**

## Work

- **The rewrite lands in BOTH homes.** `planning/epic-05-anomaly-detection/EPIC.md:143`
  and **`planning/EPICS.md:186-200`**, which is the epic ledger and carries a
  second copy. `EPICS.md` received Story 5.6's `Extreme` note and **never
  received** Task 5.5.5's `3.8× normal` → `4.1× typical` correction, so it is
  already a disagreeing copy; rewriting one home makes a third.
- **Corrections that are settled and must not be re-litigated**: a factor clause
  carries a **figure**, never a band name and never an intensity adverb;
  `typical`, never `normal`; the volume figure is a **rate** per minute, not a
  five-minute total (ADR 0045 decision 2); `exceeds` is the measurement verb and
  is the keeper, while `substantially` and the uncounted `related securities` are
  refused; a reference must be **named** and must be something the product can
  point at, which an industry group with no benchmark ETF is not.
- **`91` is not merely unproducible on demand — on the shipped scale it is
  unreachable.** `FACTOR_WEIGHTS` is 40/35/25 and the volume arm is
  `no-distribution` unconditionally, so the ceiling is **75**. State the
  arithmetic once, here, and let the other sites point at it.
- **The quiet-day amendment, decided at Gate 1: amend the promise.**
  `PRODUCT_SPEC.md` §11's _"a quiet day produces no high scores and the product
  says so"_ is false of any composite whose factors are percentiles of each
  security's own history — measured, `high` 39.3 and `extreme` 7.74 of 484 at
  every instant. A dated amendment says an `extreme` on a calm day is a
  **correct** answer to _how unusual is this for this security_, with the
  measurement quoted. **Epic 7's `EPIC.md:219` repeats the false promise as a
  product-integrity claim** and is corrected in the same change (it is also
  Task 5.7.5's recipient, so the two must not collide).
- **Verdict the rewrite clause by clause**, quoting the shipped string verbatim
  and naming the store the reading came from.
- **One divergence to state rather than hide**: `behind by 2.20 pts against XLK`
  is **not a shipped string** — it is asserted as one at `PRODUCT_SPEC.md:786`
  and at this story's own `STORY.md:43`. The shipped clause is `behind by 2.20
pts` under the label `Against its sector`, with the benchmark's ticker on the
  adjacent row. Correct the documents; do not inline the ticker.

## Done when

1. The shape is written in `EPIC.md` and `planning/EPICS.md`, the original quoted
   and left standing in both, and the two agree.
2. Every clause carries a verdict with a verbatim shipped string and a named store.
3. §11's quiet-day promise and Epic 7's copy both carry the dated amendment with
   the measurement.
4. The `against XLK` claim is corrected in both documents that assert it.

---

## What was done — 2026-10-29

### The shape, in both homes, in one change

`planning/epic-05-anomaly-detection/EPIC.md` and **`planning/EPICS.md`** both
now carry the rewrite, with the original quoted and left standing in each. Eight
clauses, each verdicted, with the shipped string quoted verbatim and the store
named — the full text is in both files rather than here, because a third copy is
a third thing to keep true.

**Writing it into both at once was not caution, it was the finding.** `EPICS.md`
turned out to be the **fourth live site** of Task 5.5.5's 2026-10-20 correction
(`normal` → `typical`): that sweep reached `PRODUCT_SPEC.md` §11 and Epic 5's
own `EPIC.md` and stopped, and then **Story 5.6's Gate 1 amended the line two
above it in that same block** without noticing the one below. So the sweep was
**3 of 4, by the same failure mode, one epic later** — and a rewrite landing in
one home would have made a third disagreeing copy rather than closing the gap.
That amendment is written there now, beside the shape.

### `91` is unreachable, not merely unproducible

The story's reason for the rewrite was that `91` is _not producible on demand_
under absolute calibration. The stronger fact: on the shipped scale it is
**arithmetically unreachable**. `FACTOR_WEIGHTS` is `price 40 · excess 35 ·
volume 25`, the volume arm is `no-distribution` **unconditionally** — `0015`
stores a median and a dispersion, not a distribution, so **no security has a
rankable volume figure anywhere** — and the ceiling is therefore **75**.
`PRODUCT_SPEC.md` §9's sketch draws `91`, `84` and `79`; all three are above it.
Stated once, in the shape, with the other sites pointing at it.

### Five of five clauses, not four

The story's description says four of five cannot be checked as written. That was
true when written and became false on 2026-10-21, when Story 5.6's Gate 1
established that `Extreme short-term move` uses a **band name** as a factor
adjective. Only the trailing sentence survives intact — and it is strengthened
in the shape from _can be explained_ to **carries its explanation**, which is
§11's own wording and is what `SecurityRow`'s deletion was argued on.

### The quiet-day amendment landed somewhere other than where it was aimed

The owner's Gate 1 decision was **amend the promise**. The obvious target was
`PRODUCT_SPEC.md` §11 — and §11 **had already been amended**, on 2026-10-22 by
Task 5.6.3, which falsified its own prediction (_"on a quiet day the highest
score in the universe may be 40"_) with the arithmetic.

**So the live site was elsewhere, and it was worse.**
`planning/epic-07-deterministic-investigation-engine/EPIC.md` carried the
sentence almost verbatim, unamended, as a **hand-off** to the epic that
orchestrates investigations — with a second clause §11 never had: _"an
investigation triggered by a score cannot be manufactured for a demo."_ Both
halves are false for the same reason, and **the second is the one that matters
to Epic 7**: a score-triggered investigation is available on any day, including
a dead one, so the trigger cannot be _the score is high_ alone. Amended there
with the measurement — `normal` 219.2, `elevated` 179.4, `high` **39.3**,
`extreme` **7.74** of 484 scored securities per instant — and the calibration
sentence above the strike left unchanged, because it is correct and it is only
the consequence that does not follow.

**And `composite-score.ts`' own note pointed at the repaired site.** It read
_"`PRODUCT_SPEC.md` §11's «a quiet day produces no high scores and the product
says so» is false"_ and said the finding was _routed rather than repaired… for
the owner_. The quoted sentence is **not §11's verbatim**; §11's prediction is
different and was already fixed. So the note read as though nothing had
happened while the document that actually carried the claim went unamended for a
week. Corrected in place: **routed to the owner was true, and recorded where the
owner would find it was not.** The record went into a task file, the measurement
into a docblock, and the governing document went untouched.

### A string two documents called shipped, that the product never emits

`behind by 2.20 pts against XLK` was asserted as _the shipped clause_ in
`PRODUCT_SPEC.md` §11 **and** in this story's own `STORY.md:54`.
`git grep "against XLK"` over `apps/` and `packages/` returns **nothing** — the
ticker is never inlined. The shipped clause is `behind by 2.20 pts` under the
label `Against its sector`, with the benchmark's ticker **on the row beside
it**, which satisfies _the reference is named_ and avoids a second copy of a
fact the adjacent row already carries. Both documents corrected; the
**requirement is unchanged and met**, only the quotation was invented.

Found by going to verdict it. That is the only way this class is found, and it
is the same class as the `split-adjusted` sentence Task 5.7.4 is about to
correct in three places.

### One divergence stated rather than smoothed over

**`exceeds` is not the shipped verb.** The story settled that `exceeds` is the
measurement word and the keeper, and the shipped pair is `ahead` / `behind` /
`level`, from one `directionOf` so the three channels cannot disagree. Those are
measurement words too and are **strictly better on the case that matters** — a
security down 4.2% against a sector down 6.0% is _ahead while falling_, which
`exceeds` does not express and a tinted cell would get actively wrong. Verdicted
**met in a different form** with the divergence named, rather than recorded as
met and quietly different.

### Gates

```
pnpm build         exit 0
pnpm lint          exit 0
pnpm format:check  All matched files use Prettier code style!
pnpm links         exit 0   (the new ADR 0045 relative link from planning/EPICS.md resolves)
```

`pnpm verify`, `pnpm e2e` and `pnpm test:database` are deliberately **not** run
here — AC 7 wants them once on the final tree.

## For a stakeholder — a status report, 2026-10-29

Epic 5's exit criterion was a worked example — a specific security with specific
numbers beside it. Every one of its clauses turned out to be uncheckable, for
reasons the epic chose deliberately: the score is calibrated against each
security's own history rather than against the day's market, so no particular
number can be produced to order. This task replaced the example with a
**shape** — what the product must draw, in what form, with what stated beside
it — and then judged the epic against that, clause by clause, quoting what
actually ships.

The sharpest finding is arithmetic. The example promises an anomaly score of
**91**. The highest score this product can currently produce is **75**, because
one of the three factors cannot be scored for any security at all. So the
headline number in the specification was not merely optimistic; it was
impossible, and nothing had noticed.

Three corrections of a kind worth naming. A sentence describing what the product
displays was quoted as shipped in two governing documents and **the product has
never emitted it** — the requirement behind it is met, but the quotation was
invented. A promise that _a quiet day produces no high scores_ was found to be
false by measurement, and the fix had been written into one document while the
document that actually carried the promise — a hand-off to a future epic, with a
stronger claim attached about demos not being fakeable — went unamended for a
week. And a correction made on the 20th had reached three of its four homes,
with the fourth sitting two lines below another correction made a day later by
somebody who did not look down.

All three are the same shape: writing something down and propagating it are two
different jobs, and only going to **use** a claim ever finds the gap.
