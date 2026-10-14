# Task 5.3.4 — The Refusals & the States

**Status:** Not started
**Story:** [5.3 The Baseline, & the Price Percentile](STORY.md)
**Depends on:** 5.3.3

## Objective

**A percentile is a number nobody can eyeball**, and the states where it must
not be drawn are the ones no machine here can reach. CI's store has zero bars,
so **no gated machine will ever see a percentile** — which means the refusal
path is the only one CI exercises, and that is also the state a cold production
replica is in.

## What the user can see when this lands

**The region is honest about its baseline**, and no two of its states read
alike.

## Work

- **AC 6's refusal is a TYPE, not a document.** The producer returns no
  breakpoints member at all below the minimum, so a caller **physically cannot**
  read a percentile — `exactOptionalPropertyTypes` makes the omission a compile
  error, which is stronger than any test. The check that would be green on the
  defect is one asserting the constant exists; the one that is not is
  `five-minute-return.ts`'s own shape test.
- **One new sentence, replacing a clause rather than adding a row**:

  ```
  Baseline too short to rank — 1,240 of 4,620 returns
  ```

  It covers **two** facts with one string, because `0 of 4,620 returns` is true
  on a store with no baseline — so there is no sixth sentence. No terminal stop,
  no connection word, no status word: the register of the twelve.

- **A second new sentence for the split refusal** from Task 5.3.1's guard, and
  it must not read as the sample refusal — _we have too little history_ and _the
  history we have contains a price break we cannot adjust_ are different facts.
- **The states this story adds, as pictures**: the percentile drawn; drawn **with
  the bias clause** (the row's longest state, and the one the reserve is
  measured from); **refused for sample**, figure drawn and percentile cell
  absent; **refused for a split**; at the **`>99th` clamp**, where a reader is
  most likely to read an over-claim; and beside a **zero return**, which is
  `0.00% —` with a low ordinal and is the pair most easily misread as a refusal.
- **No dash in the percentile cell, ever** — `—` is `unchanged` in `PriceChange`.
- **The percentile's own correctness needs three layers and all three**, because
  it can be wrong in two different ways:
  1. a **golden sample** — a hand-written distribution with a known answer at six
     probe points, including ties and the exact-match case, which catches
     interpolation-convention drift and is the only test a reviewer can verify by
     eye;
  2. an **independent recompute in the test by a different method** — the test
     sorts the magnitudes itself and counts, never calling the producer's sort or
     its breakpoints. **This is the layer that catches a lying producer**, and it
     is `overview-movers-ranking.spec.ts`'s shape;
  3. **properties** — monotone, bounded, permutation-invariant, invariant to
     duplicating the corpus, and **magnitude-symmetric** (`pct(+x) === pct(−x)`),
     which is the one property that catches a signed percentile shipped as a
     magnitude one.

  Properties are permutation-invariant and therefore **blind to a wrong
  convention**; a golden sample is **blind to a producer that breaks at scale**.
  Keep them separate from the database tests of §5.3.2, which test the **input**
  rather than the arithmetic.

- **The browser spec needs a claim grounded OUTSIDE the frame.** A percentile is
  **less** recoverable from the frame than the return was — the return at least
  shipped both instants — so the region trips _an aggregate is checkable by
  nothing_ harder than Story 5.2 did. A pass-through proves fidelity only;
  `docs/GAPS.md` carries the two sufficient shapes.
- **The live-region reversal trigger fires as worded and must be evaluated in
  writing.** `AbnormalMove.tsx` says _the first state in this region that is
  terminal — a word or a figure that will not be replaced by the next batch_, and
  a baseline changes once a night. The expected verdict is that it **still** does
  not warrant one — both are present on first paint rather than arriving, and the
  band's other four lines rewrite 6.8–16.1 times a minute — but an unevaluated
  trigger and one that did not fire read identically.
- **No arrival mark on the percentile**: marking one of two figures in one band
  invents a hierarchy the region does not have.

## Done when

1. The refusal is unrepresentable at the type level below the minimum, with a
   test at `min − 1` asserting the member's absence.
2. Both new sentences exist, each with its recorded reason for not being one of
   the twelve, and **the sample refusal and the split refusal do not read
   alike**.
3. All three correctness layers exist, and the independent recompute does **not**
   call the producer's own sort.
4. The browser spec carries a claim grounded outside the frame, and the break —
   break the producer into fabricating a percentile — is performed in **both**
   directions.
5. The region is one height across every new state at four widths, probed.
6. The live-region trigger is evaluated **in writing**.
7. `pnpm verify` green; `pnpm e2e` green on the specs this touches.

---

## What was done — 2026-10-14

<!-- written at completion -->
