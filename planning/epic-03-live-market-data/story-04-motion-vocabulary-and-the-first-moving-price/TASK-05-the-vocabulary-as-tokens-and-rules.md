# Task 3.4.5 — The vocabulary, as tokens and as rules

**Status:** Not started
**Amended:** 2026-09-21 after Task 3.4.4 — the decision, the trap inside it, the fourth token, the vocabulary's spine, and the instrument this task disposes of.
**Story:** [3.4 The Motion Vocabulary & the First Price That Moves](STORY.md)
**Depends on:** 3.4.4

## Objective

Ship the decision: the chosen treatment on the identity block's price, every
duration a token, and the vocabulary written down where the next five stories
will read it.

## What the user can see when this lands

**The first price that moves the way this product has decided prices move.**
Every remaining story in the epic inherits it.

## What is already decided and must not be re-taken

- **The treatment itself** — Task 3.4.4, with the owner. This task implements
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
- **Amended 2026-09-21 by Task 3.4.4: a fourth token IS owed, and the bullet
  above is not an argument against it.** That bullet is about the **first
  paint**; the chosen treatment is a **decay**, which is neither `quick` (a
  state change under the pointer), nor `settle` (content arriving), nor a loop.
  It is the only member of the set whose point is that it ends by
  **disappearing** rather than by arriving somewhere. Take the number here; the
  shape was taken on the canvas.

## What Task 3.4.4 decided, and the trap inside it

**The mark fires when a bar ARRIVES, not when the price CHANGES.** Open
decision 2 was answered `yes` in the same sitting, and that is what turns the
mark from _this price moved_ — which `PriceChange` already says with a glyph, a
sign and a hue — into **a bar arrived for this security**, which nothing else on
the screen says.

> **The obvious implementation silently reverses that decision, and every test
> stays green.**

A renderer that compares `close` to the previous `close` implements _mark on
change_. It is the natural thing to write, it looks correct, and **a test that
ticks a different price passes against it** — because the two implementations
only disagree on the quiet minute, which is exactly the case a test is least
likely to write.

**This is Task 3.4.1's `sameLiveFeedView` trap one level on**, and the defence
is the same shape: assert the **negative**.

> **A bar arriving with an UNCHANGED close still fires the mark.**

Two things make it implementable rather than only assertable:

- **The observation's own instant is the trigger, not its value.** §10.3 already
  requires every entry to carry its own `startsAt`, and a re-arrival for a new
  minute carries a new one — so _something arrived_ is readable without
  comparing prices at all.
- **A CSS animation does not restart when the same animation is re-applied to
  the same element.** Task 3.4.4 met this and recorded the repair: alternate two
  animations with **different names**, and do **not** reach for a React `key` on
  the block — `SecurityIdentity` animates its own arrival, so a remount replays
  _the block arriving_ on every price change, which is a fading, sliding panel
  and is the one thing `VISUAL-LANGUAGE.md`'s rule A forbids.

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
  rejected options are Task 3.4.4's and must not be lost between the two tasks.
- **`tokens.css` carries the durations**, and the component reads them.
- **The canvas carries it too** — ADR 0026's chain, the right way round for the
  first time on this row.
- **State the two-changes rule**, and assert it.
- **Say what a price changing is**, since the standing rule is that motion means
  work in progress: a price arriving is **a fact, not progress**, and if the
  vocabulary needs those to look different the document says how. **Task 3.4.4
  answered this and the answer is the vocabulary's spine** — record it rather
  than re-derive it: _work in progress **loops**, a state **persists**, a fact
  arriving **decays**._ It is what lets the status bar's static disc and this
  story's decaying one be the same glyph without colliding, and a fourth
  behaviour added to that set is a change to the vocabulary rather than to a
  component.
- **Dispose of Task 3.4.4's instrument**, which is this task's to do and
  nobody else's. `MotionTreatments.stories.tsx`, `motion-treatments.module.css`
  and the losing three treatments exist only to have been compared; the
  repository's rule is _run it, record the findings, delete it_, and the
  findings are already recorded in Task 3.4.4 and on the canvas. **Keep
  `data-live-figure` and `data-live-price`** — they were added so the chosen
  mark could be attached to them rather than to a generated class name, which is
  what this task now does.

## Done when

- `VISUAL-LANGUAGE.md` carries the vocabulary, its rejected alternatives and a
  reversal trigger; the canvas carries it too
- **Every duration is a token** — a grep proves no component hard-codes one
- Two changes inside one animation produce the stated result, asserted
- **A bar arriving with an unchanged close still fires the mark** — asserted,
  and it fails against a renderer that compares prices
- The treatment is on the identity block's price and was **looked at** at 1×
- **Task 3.4.4's instrument is deleted**, and the two `data-` hooks it left
  behind are what the shipped treatment hangs on
- `pnpm verify` passes
