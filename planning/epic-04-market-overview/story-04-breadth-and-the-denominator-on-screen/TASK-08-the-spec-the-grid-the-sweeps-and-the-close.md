# Task 4.4.8 — The spec, the state grid, the sweeps and the close

**Status:** Not started
**Story:** [4.4 Breadth, & the Denominator on Screen](STORY.md)
**Depends on:** 4.4.7

## Objective

**What the suite can say about a count over securities the frame does not carry,
and what it cannot.**

## What the user can see when this lands

**Nothing.** The story is finished and the next reader can find out why it is
built this way.

## Work

- **The browser spec is a PASS-THROUGH, not a furnished fixture**, for the reason
  Story 4.3 paid to learn: four overview specs passed against a server with the
  ranking deleted, because each furnished the data it then checked. **Breadth is
  worse** — it is a _reduction_, so the browser receives counts and draws counts
  and there is no recoverable input on the frame at all. Copy
  `overview-sector-ranking.spec.ts`'s `openWithRecordedStream`.
- **The assertions that survive a bare store**, and they are real: the identity
  `advancing + declining + unchanged === measured` read off the recorded frame
  (on CI every term is 0 and the identity still holds, and `0 !== 503` is a real
  distinction); `measured <= 503`; `figures` has exactly **four** entries — the
  one assertion that catches the negative-filter regression; and the screen equals
  the latest recorded frame, converged with `expect.poll`, **scoped to the
  region**.
- **One genuine cross-check exists and is worth having**: the four proxies and
  eleven sectors ride on the **same frame** and are inside the 518, so the number
  of those fifteen that are `observed` with a positive move is a **lower bound** on
  `advancing`. One-sided and weak — and it goes red on an inverted sign, a
  transposed bucket, or breadth computed over the wrong symbol set.
- **Stay out of the three flakes' class.** Wait for a positive state; assert
  **scoped**, never whole-`main`; assert a **transition**, not an absence across a
  window; no durations and no thresholds; and characterise with `--repeat-each=6`
  four times on one settled checkout, counting per execution.
- **The state grid**: every state × four widths, in greyscale **and** under a
  deuteranopia matrix, compared as strings, **produced** through the shipped socket
  path. **Run the producer walk** — entry 13's second half — because it has found
  something every time it has been run: two states in Story 4.2, five in 4.3.
- **AC 5's adversarial case is arithmetic**, and tidy fixtures pass it. Enumerate
  exhaustively rather than sampling: every `(a, d, u)` summing to N, for N from 0
  to 503, asserting the displayed identity. ~23M triples runs in seconds in Node,
  and exhaustive is the only honest answer to _at any rounding_.
- **The `docs/GAPS.md` entries**, each with a `Re-measure:` — the counts checked
  against nothing outside this repository; no gated machine ever seeing a breadth
  figure; the heard-from-but-unmeasurable set; the denominator sentence's clipping
  risk at 390 (**mechanically invisible**, because the DOM holds the full string);
  and the ≤860 reorder, which has **no entry at all** today.
- **The sweeps.** Upward: `PRODUCT_SPEC.md` §9 draws percentages and this story
  ships counts — it owes a **dated amendment**, not a rewrite, the way §8.1 already
  carries Story 4.1's. Sideways: grep for every `Story N.M` and `Owner:` line and
  **record the count that were missing** — Story 4.3's sweep found three of three.
- **`LIVE-REHEARSAL.md`**: open this story's row when the work opens, not at the
  close. **The most valuable sitting item is whether a frozen count is noticed by
  somebody who was not told to look for it.**

## Done when

1. A pass-through spec asserts the identity and the four-figure bound, and goes
   red when the producer stops counting
2. Its fixtures are the server's own, and the header says what a green run does
   not certify
3. The grid exists at four widths in greyscale and deuteranopia, with the producer
   walk run and its findings recorded
4. AC 5 is proved exhaustively rather than by sample
5. The sideways sweep's miss count is recorded, and §9 carries its dated amendment
