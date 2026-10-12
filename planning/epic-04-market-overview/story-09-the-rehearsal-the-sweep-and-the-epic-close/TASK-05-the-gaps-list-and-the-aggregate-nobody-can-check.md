# Task 4.9.5 — `docs/GAPS.md`, and the aggregate nobody can check

**Status:** Not started
**Story:** [4.9 The Rehearsal, the Sweep, & Epic 4's Close](STORY.md)
**Depends on:** 4.9.3, 4.9.4 — both route candidates here

## Objective

Acceptance criterion 5, and **the one thing this epic owes that Epic 3 did
not.** Its headline numbers are **aggregates**, and an aggregate is checkable by
nothing: a breadth count that is quietly wrong looks exactly like one that is
right, on every screen, in every test. CI's store has zero bars, so **no gated
machine has ever seen a breadth figure at all** — not a wrong one — and the 503
(now 501) securities the counts are computed over are on **no frame the page
can see**.

**The close has to say what would catch that, and _a person looking_ is a
legitimate answer as long as it is written down as one** — with an owner and a
condition rather than an epic number.

## What the user can see when this lands

**Nothing.** A list that says what a green tick does not certify, with one
fewer prose entry in it than it could have had.

## Work

- **An entry that can be made mechanical should be.** A prose entry with a
  re-measure command is a check nobody runs; a `verify` step is one that cannot
  be skipped. Two batches have already left the list that way. Take every
  candidate from Tasks 4.9.3 and 4.9.4 and from this epic's own tasks, and
  make mechanical whatever can be — as a `pnpm invariants` entry.
- **Every check added owes a break, in the same change**, and the break must
  **write the defect somebody ELSE will write** — confirm the check passes
  **wrongly** first, keep the transcript of it passing, then fix, then confirm
  red, then delete. Four consecutive tasks in one story shipped a guard that was
  green on the exact defect it forbids, every one of them with a break that went
  red, because a break edits the file the check was written around. Prefer a
  clause the re-implementer **cannot avoid writing** — the division, not the
  type name.
- **Read the runner's output, not the verdict line.** An assertion failure with
  other tests still collecting is the only red that proves a check works; a
  break that has decayed into a parse error fails loudly and certifies nothing.
- **`scripts/breaks.mjs` is one file of ~4,300 lines of sibling object
  literals, and a squash-merge silently drops a closing brace between entries** —
  a `SyntaxError` rather than a wrong entry. It happened three times inside
  Story 4.7. `the-break-registry-stops-parsing` now guards it; run
  `node --check scripts/breaks.mjs` after any edit regardless.
- **The aggregate question**, written as an entry with an **owner** and a
  **condition**: what would catch a quietly-wrong breadth, sector or movers
  figure. State plainly which of the available answers it is — a person looking,
  an external comparison, a second independent computation, or nothing — and if
  it is a person, say which reading and at what cadence. Story 4.5's row already
  establishes that **ten tickers and ten percentages is the only genuinely
  external check this epic has**, which bears directly on this.
- **Carry forward the two routed product defects unchanged**, with their owners:
  ADR 0028's 160 ms cover drawn over both plots during a refill nobody asked
  for, and the `color-contrast` reading of **4.32:1** on the result surface's
  active option (`#0f7b50` on `#e7e8ef`, 13 px). Confirmed at Gate 1 as out of
  Epic 4's scope. **The residual `security-gap-fill` failures must not be
  counted in a flake rate** — a red there now means something.
- **Record the `changePercent` decision**: it stays unrounded on the wire, taken
  at Gate 1. A consumer that re-ranks needs more precision than the screen
  shows; `moveRankingKey` is keyed on the displayed figure today, so a browser
  is fine and an agent sorting on the raw value would not be. ~350 B a frame,
  9% of the aggregate. Record the alternative and a **reversal trigger** that is
  a condition.
- **Check the entries this epic's files name.** A prose re-measure rots
  silently, and when you touch a file an entry names, check the entry. Note the
  universe count moved to **516/501** on 2026-10-12, which `docs/GAPS.md`
  already carries a dated paragraph about.

## Done when

1. Every mechanisable candidate from 4.9.3 and 4.9.4 is either mechanical or
   has a stated reason why it cannot be.
2. Every check added has a break entry, the break was performed in both
   directions (passing wrongly first, then red), and the transcript of the
   wrong pass is quoted.
3. `node --check scripts/breaks.mjs` passes and the registry's entry count is
   stated.
4. The aggregate question is an entry with an **owner** and a **condition**,
   and names which kind of answer it is.
5. The two routed defects and the `changePercent` decision are recorded with
   owners and reversal triggers that are conditions.
6. `pnpm invariants` green with its own count printed, and `pnpm verify` green.

---

## What was done — 2026-10-12

<!-- written at completion -->
