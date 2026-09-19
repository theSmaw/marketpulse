# Task 3.4.4 — The vocabulary, as tokens and as rules

**Status:** Not started
**Story:** [3.4 The Motion Vocabulary & the First Price That Moves](STORY.md)
**Depends on:** 3.4.3

## Objective

Ship the decision: the chosen treatment on the identity block's price, every
duration a token, and the vocabulary written down where the next five stories
will read it.

## What the user can see when this lands

**The first price that moves the way this product has decided prices move.**
Every remaining story in the epic inherits it.

## What is already decided and must not be re-taken

- **The treatment itself** — Task 3.4.3, with the owner. This task implements
  and does not revisit.
- **Every duration is a token; no component hard-codes one.** Three exist —
  `quick` 120 ms, `settle` 240 ms, `pulse` 1400 ms — and `VISUAL-LANGUAGE.md` is
  explicit that they are a thin first cut rather than a system.
- **`prefers-reduced-motion` is answered at the token layer**, as it already is:
  the durations resolve to `0ms` under the preference, so a consumer reading
  tokens honours it **by construction** and a consumer hard-coding `240ms` is
  the only way to get it wrong.
- **A value arriving for the first time is `settle`'s existing job** and
  probably needs nothing new. Say so rather than inventing a fourth token to be
  thorough.

## The rate rule, which is a design problem before it is a performance one

**Two changes inside one animation must produce a defined result, and it must be
the one the document states** — because _every_ answer that does not state it
produces a smear.

At this story's own cadence that is rare: a symbol ticks **once a minute or
less**. But it is not hypothetical — **332 bars land inside 243 ms** once a
minute (§7.4), and Story 3.6 puts 518 of them on one screen. **Decide it here,
at one number, where it is cheap.**

## Work

- **`VISUAL-LANGUAGE.md` carries the vocabulary** with its rationale, its
  **rejected alternatives** and a **reversal trigger as a condition**. The
  rejected options are Task 3.4.3's and must not be lost between the two tasks.
- **`tokens.css` carries the durations**, and the component reads them.
- **The canvas carries it too** — ADR 0026's chain, the right way round for the
  first time on this row.
- **State the two-changes rule**, and assert it.
- **Say what a price changing is**, since the standing rule is that motion means
  work in progress: a price arriving is **a fact, not progress**, and if the
  vocabulary needs those to look different the document says how.

## Done when

- `VISUAL-LANGUAGE.md` carries the vocabulary, its rejected alternatives and a
  reversal trigger; the canvas carries it too
- **Every duration is a token** — a grep proves no component hard-codes one
- Two changes inside one animation produce the stated result, asserted
- The treatment is on the identity block's price and was **looked at** at 1×
- `pnpm verify` passes
