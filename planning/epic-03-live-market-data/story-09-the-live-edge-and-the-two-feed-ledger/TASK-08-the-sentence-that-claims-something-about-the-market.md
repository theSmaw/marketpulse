# Task 3.9.8 — The sentence that claims something about the market

**Status:** Not started
**Story:** [3.9 The Live Edge on the Chart & the Two-Feed Ledger](STORY.md)
**Depends on:** 3.9.7

## Objective

Criterion 5, and it is one sentence:

> `No shares changed hands anywhere in the window.`

**It is the only shipped sentence making a claim about the market rather than
about our store.** It is true while every bar is the consolidated tape; the
first time a single venue's bars are what the window holds, it reports **one
exchange's silence as the whole market's** — which is precisely what
`PRODUCT_SPEC.md` §7.1 forbids, in the one place a reader would never look for
it.

## What the user can see when this lands

**A sentence that is true**, in the case where the old one was a lie. On IEX
this is ordinary rather than theoretical: median per-symbol minute coverage is
**65.1%** and the worst case is **2.1%** (`ERIE`), so a thin name over a short
window can legitimately produce a live stretch with no volume in it at all.

## Why it is a whole task

**Because the repair has a structural half.** The sentence has **two homes
today — drawn and spoken** — and _one fact has one home_ is this repository's
rule (ADR 0029): a drawn sentence and its spoken twin are one string with two
renderings, and a second copy must fail the build. So this is a string, a check
and a break, not a wording change.

And the wording itself is a real decision rather than a formality. The honest
sentence depends on what the window holds, which is now one of three things —
all consolidated, all one venue, or both — and ADR 0029's rule is that **each
clause renders only when its own data is present**. A single reworded sentence
that is vague enough to be true in all three cases is the failure mode to avoid;
so is a third sentence nobody can find.

## Work

- The wording, per tape state, with the rejected alternatives
- One string, two renderings, and a check that a second copy fails — `pnpm
invariants` plus a `pnpm break`
- A unit assertion per tape state, including the case this task exists for: a
  window whose bars are all `iex` and whose volume is zero
- Grep for every other sentence on this screen that claims something about the
  market rather than about the store, and record the count — this one was found
  by somebody reading, not by a check

## Done when

1. The sentence is true in all three tape states, asserted per state
2. It has one home, and a second copy fails the build — check and break
3. The count of other market-claiming sentences is recorded, even if it is zero

---

## Handed here by Task 3.9.1 — 2026-09-24: a SECOND sentence, of the same family, already shipping

**`a line of 131 closing prices, one per trading minute`** — from the price
chart's spoken alternative, `chart-alternative.ts`'s `describeSeries`, read off
the deployed site on 2026-09-23 over a 390-minute session.

**The clause is a claim about cadence and it is false by a factor of three.** It
is not a live-feed problem: `ERIE` traded in 131 of that session's minutes on
the **consolidated** tape, and the sentence has said _one per trading minute_
since Story 2.12. On IEX it gets worse rather than different — 65.1% median
coverage, 2.1% at the worst.

**Why it lands here rather than in a task of its own.** It is the same shape as
this task's own subject — a drawn-and-spoken claim that outruns its data — and
the repair is the same mechanism: the honest wording, one home, and a check that
a second copy fails the build. Two sentences through one mechanism is one task;
two tasks would be the mechanism twice.

**What is NOT handed here** is the picture. The axis closes gaps up by design
and `CHARTING.md` §3's reversal trigger was evaluated by Task 3.9.1 and has
**not** fired. This is about what the sentence says, not about what the line
draws.

**One thing to check while wording it**: the neighbouring _runs the full width
of the window asked for_ clause is **correct** and must not be swept up. It
compares the **requested** window with the ledger's **covered** range, both of
which are the whole session — the coverage rule doing its job. Only the density
clause has nothing behind it.
