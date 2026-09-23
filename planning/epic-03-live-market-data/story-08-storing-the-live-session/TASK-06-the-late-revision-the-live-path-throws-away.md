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

  **The seam has a shape now, added 2026-09-23 by Task 3.8.3**, and it is
  three lines in `index.ts`:

  ```ts
  const applied = currentMarketState.observe(observations);
  gateway.publishObservations(applied);
  void liveBarWriter.store(applied).then(…);
  ```

  So the writer is a **second consumer of the same filtered list** rather than
  of the raw one, and that was deliberate: 3.8.3 recorded that widening its
  input _would have taken this task's decision in passing_. The change you
  make is `store(applied)` → the raw list, or a second call carrying the
  revisions the filter dropped — and the reason it is yours is that `applied`
  is what makes the store and every open browser agree by construction. Say
  what replaces that guarantee.

  **Two warnings that cost real time in 3.8.3.** `the-live-stream-loses-its-consumer`
  is anchored on the first of those three lines, and its substitution has to
  **remove the `observe` call** rather than re-spell the broadcast — re-pointing
  it at `publishObservations` leaves `currentMarketState.observe(` on the line
  above, the invariant still passes and the break goes red for the wrong
  reason, which the harness says in as many words. And `live-bar-writer.ts`'s
  header states the applied-list rule twice; a change here that leaves it
  standing is a comment that has become false in the file it governs.

- **A correction moves the numbers and not the tape**, which is 3.7.3's rule and
  a compile-time one: `MarketBarsTable.feed`'s update type is `never`. A
  revision that arrives on the same tape is an ordinary correction; one that
  arrives on another is 3.8.1's decision.
- **A correction is now defined by the tape, and that is mechanical since
  `0011`.** The unique key covers `(security_id, timeframe, observed_at,
feed)`, so a revision arriving on the **same** tape conflicts and upserts —
  an ordinary correction — while one arriving on **another** tape is simply a
  different row. That is ADR 0035 rather than a special case for this task to
  invent, and it means the path you add has to carry the revision's own tape
  rather than assume the stored row's.
- **And take 3.8.2's lesson before you add a query.** Its writer's pre-read of
  _which minutes are already here_ was not scoped to the tape, so a genuine
  insert counted as a correction and the ledger silently under-reported. Any
  query you add that asks _does this bar already exist_ asks it **per tape**;
  `migrations/README.md` §9 carries the general form.
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
