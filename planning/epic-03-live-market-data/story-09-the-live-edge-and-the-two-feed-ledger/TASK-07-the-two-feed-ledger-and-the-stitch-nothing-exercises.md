# Task 3.9.7 — The two-feed ledger, and the stitch nothing exercises

**Status:** Not started
**Story:** [3.9 The Live Edge on the Chart & the Two-Feed Ledger](STORY.md)
**Depends on:** 3.9.1

## Objective

Criteria 2, 3 and 4. **Most of the drawing may already be done** — Task 3.8.3
photographed the two-feed source note from real stored rows and Task 3.8.8 read
it clause for clause against `VISUAL-LANGUAGE.md` and found it matched. What is
certainly **not** done is the obligation the re-order created.

## What the user can see when this lands

**A source note that tells the truth about a split series, on real data** —
the stretches in contribution order with their counts, the consolidated tape for
the stored part and a single named venue for the live part, with the sentence
saying what a single venue is. Possibly unchanged from what Story 3.8 already
drew, in which case this task says so and proves it rather than redrawing it.

## The obligation this story acquired when it moved behind the store

Written into this story's file at the re-order and worth restating, because it
is the whole content of this task:

> prove the read-time stitch **as well as** the stored path, because the stored
> path is now the one a user sees and the stitch is the one the provenance
> design was built for. If only one of them is exercised, the other is a claim
> nothing checks.

`mergeSeriesProvenance` now has **three** routes into it — the stitch, the
stored two-tape read (Task 3.7.5), and `twoFeedStitchView()`. The first is
exercised by nothing user-facing.

## And the narrowing Story 3.8's close found, which this task must honour

A served window's `sources` describe **the rows the answer contains**. The read
prefers `sip` where a minute holds both tapes and the nightly backfill covers
every regular-session minute — so on a deployed store the two-feed state is
**mid-session**, or extended hours, and collapses to one source overnight
(`LIVE-SESSION.md` §14). Every assertion, screenshot and rehearsal of it has a
window, and the window closes when the backfill runs.

## Criterion 4, which is a deletion

`twoFeedStitchView()` is the recorded stitch **with one field changed** — a
state somebody typed rather than one the system produced — and it has three
readers. It goes, replaced by a **real recorded body**, in the fixture idiom
`src/fixtures/alpaca/` already holds: raw, unformatted, excluded from Prettier
and from line-ending normalisation, **because both rewrite evidence**.

`scripts/session-watch.mjs` was taught to capture exactly this during Story
3.8's close: the first poll that sees more than one **tape** writes the raw
response byte for byte. Check `.capture/session/` before asking production for
another one — and note the trigger is distinct tapes rather than stretches,
because Epic 2's read-time stitch already produces two `sip` stretches and a
recording of _that_ would be the wrong state wearing the right shape.

## Work

- Establish what is already drawn, with a photograph, before changing anything
- A test that exercises the **read-time stitch** end to end and names its two
  stretches, so the path the provenance design was built for is not a claim
- `twoFeedStitchView()` deleted and its three readers pointed at the recorded
  body; `pnpm invariants` gains a grep that goes red if it comes back, with a
  `pnpm break` entry
- Criterion 3's harder half checked by walking the producers rather than by
  rendering a state: **`All US exchanges` appears nowhere on a live tail**

## Done when

1. A two-feed series names both stretches in contribution order with counts,
   from both the stored path and the stitch
2. `twoFeedStitchView()` is gone, with a check and a break behind its absence
3. Epic 2's word cannot reach a live stretch, proved by a check
