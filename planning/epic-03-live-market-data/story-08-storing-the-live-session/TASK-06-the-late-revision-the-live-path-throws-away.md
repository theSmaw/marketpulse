# Task 3.8.6 — The late revision the live path throws away

**Status:** Not started
**Story:** [3.8 Storing the Live Session](STORY.md)
**Depends on:** 3.8.3

## Objective

Story 3.5's close handed this story a defect that **only the store can fix**,
and stated the consequence of not fixing it in terms this task should not soften:

> A revision for a **superseded** minute is discarded by the live path entirely.
> §14.1 measured revisions at **0.064%** of bars, **35.3% of them changing the
> close** — so these are materially wrong numbers rather than noise. The only
> place they can be applied is the **store**.
>
> **If Story 3.8 does not apply them, this product's stored history is
> permanently and knowably wrong for a small fraction of bars — and nothing will
> ever report it**, because the frame that would have corrected it was dropped a
> story earlier.

## What the user can see when this lands

**Nothing.** A small number of stored prices stop being wrong.

## What makes it a task rather than a line

- **The live path's discard is correct and must stay.** Task 3.5.1 decided that
  `currentMarketState` ignores a revision for a minute already passed, because
  applying it would make the latest observation _older than the one it replaced_
  and every reader would watch the price jump backwards. **Do not "fix" that.**
  The case you inherit is specifically the **late** one — §14.1 measured
  revisions arriving **29.1–30.1 s** after their bar, usually inside the same
  minute and not always.
- **So the store needs a path the live surface does not have**, and the seam
  where the revision is dropped is in Story 3.5's code rather than yours. The
  first question is where the store learns about a revision at all: today the
  gateway broadcasts `currentMarketState.observe(...)`'s **return value**, which
  is deliberately the filtered list.
- **A correction moves the numbers and not the tape**, which is 3.7.3's rule and
  a compile-time one: `MarketBarsTable.feed`'s update type is `never`. A
  revision that arrives on the same tape is an ordinary correction; one that
  arrives on another is 3.8.1's decision.
- **`recorded_at` is the record that a correction happened** — it is the only
  signal, and `0004` argued it rather than an `updated_at`. The
  `is distinct from` clause on the writer's `on conflict` is what keeps it
  meaning that, and a revision that changes nothing must not move it.

## Work

- The path from a late revision to the store, without changing what the live
  surface does
- `market-bars.database.test.ts`: a revision for a superseded minute reaches the
  store and moves the numbers; one that changes nothing moves no row and no
  `recorded_at`; the tape does not move
- A `pnpm break` proving the revision is applied rather than dropped
- **Count them** over a real session if one is available, against §14.1's
  0.064% — a figure this product has never taken from its own store
- `LIVE-SESSION.md` §on corrections

## Done when

1. A revision for a superseded minute is applied to the store, proved in
   `pnpm test:database`
2. The live path's behaviour is unchanged, and that is asserted rather than
   assumed
3. `pnpm verify` and `pnpm test:database` pass
