# Task 3.10.3 — The price that was live and is now old, on one surface first

**Status:** Not started
**Story:** [3.10 Disconnection, Staleness & Every Degraded State](STORY.md)
**Depends on:** 3.10.1, 3.10.2

## Objective

**The per-datum question, which is the hard one**, taken on the identity block
alone before it is taken 518 times.

> A price that was live and is now forty minutes old is not the same as a price
> that was never live.

## What the user can see when this lands

**The big price on a security page stops silently presenting an old number as a
current one.** What it does instead is 3.10.1's decision; what is certain is
that it stops being indistinguishable from a fresh one.

## Why one surface first, and why this one

**Because the repair is a threshold applied to a rendering, and the table
applies it 518 times.** Task 3.6.2 declined this exact repair on exactly that
ground: choosing a number _"on the surface that has to apply it 518 times,
inside a design pass about a disc"_ would take the epic's hardest decision as a
side effect.

So: **take the decision on one row, see it, then scale it.** The identity block
is one figure with three lines that already change together (`LATEST PRICE`, the
figure, and a qualifier carrying an instant and a change basis), and it already
has the instant this task needs to reason about.

## What is already true and must not be undone

- **The qualifier's instant is the survivor** under `prefers-reduced-motion`
  (Task 3.4.7), asserted in a browser. A degraded feed is the case where that
  instant **stops advancing** — which is information this task can use rather
  than a problem to work around.
- **The block deliberately has no live region** — four reasons and a reversal
  trigger in `FRONTEND-STATE.md` §7. Adding one here is a decision with an
  owner, not a detail.
- **The arrival mark fires on a bar arriving**, says nothing about what silence
  means, and simply stops. §11.2's refusal to give a security a status word is
  the standing decision it respects.

## The listening cost, which must be counted rather than discovered

The block's spoken string is **10 or 11 words across three `<p>` elements**, and
its qualifier can already carry **three clauses**
(`07:42 EDT · pre-market · change from …`). A staleness clause is a **fourth**,
and `docs/GAPS.md`'s standing listening item is at **five entries** with an
owner who is a person with a screen reader.

**Count the words and add the entry in this task rather than at the close.**

## Work

- The state-4 repair on the identity block, per 3.10.1's decision
- Its wording, with the rejected alternatives and a reversal trigger
- Whether the change figure survives — 3.10.1's decision 3, applied here first
- Component and browser assertions per state, including _quiet security_ which
  must **not** read as degraded
- The spoken string counted, and `docs/GAPS.md` amended if it grew

## Done when

1. A live price, a stale live price and a stored close are three renderings
2. A quiet security is not one of them
3. The spoken string's length is recorded
