# Story 4.8 — The Overview at Universe Scale, & Epic 14's Trigger

**Status:** Not started
**Epic:** [Epic 4 — Market Overview](../EPIC.md)
**Depends on:** 4.7
**Epic scope covered:** none new — the epic's numbers, measured

## Description

**Epic 14's reversal trigger is a condition, and this epic is built to fire
it.**

> _"The first time a second surface on that page renders per-row markup at
> universe scale."_

That trigger has been carried since Task 2.14.8 and re-evaluated twice without
firing. **This screen is four aggregate regions over 518 securities, updating
once a minute**, and Story 3.6's close handed the constraint here in as many
words: _size each region's per-row work against 518 from the first line._

**What is already measured**, so that nothing here is rediscovered:

| Figure                                                                       | Where it came from |
| ---------------------------------------------------------------------------- | ------------------ |
| **37–40 ms** a tick, 518 rows, production build, after two memo boundaries   | Task 3.6.5         |
| **46–49 ms** before them, plus **40 ms** every 30 s from an unmemoised route | Task 3.6.5         |
| **50–56 ms** cold load, `/securities`, seven loads in ten                    | Task 3.6.5         |
| **§28's line**: no **routine** main-thread task over 50 ms                   | `PRODUCT_SPEC.md`  |
| **p95 68.1 ms** gateway send → table repainted, 518 subscribed, **loopback** | Task 3.6.4         |

**And one instrument note that cost a task**: a `long-animation-frame` entry
only exists above 50 ms, so **zero observed and the observer is broken are the
same output**. Prove the observer before believing any silence.

## What the user can see when this story lands

**Nothing new, and the screen stays fast while the market moves.** The most
likely visible outcome is the absence of something: no stutter once a minute
when 518 observations arrive and four regions recompute.

## Why it sits here in the sequence

**After the screen is complete, because a measurement of half a screen is a
measurement of nothing**, and before the close, because a figure taken after
the epic is called done is a figure nobody re-takes.

## Acceptance criteria

1. The overview's per-tick cost measured on a **production build** with the
   whole universe arriving, against §28's routine 50 ms — the instrument's
   observer proved before any silence is believed
2. The cold load of `/` measured and compared with `/securities`, and the
   comparison stated rather than implied
3. **Epic 14's trigger evaluated in writing** — it fires, it does not, or it
   fires and the repair is due here; whichever, the verdict is recorded in
   Epic 14's own file, not only in this one
4. Any repair is a **memo boundary or a computation moved**, not a reduction in
   what the screen says
5. Figures recorded with their instrument, their n and their caveats, and
   marked **loopback** where they are
6. `PRODUCT_SPEC.md` §28's exception list amended if this screen adds one, or
   explicitly not amended and why

## Design work

**None, unless the repair costs something visible** — in which case the
trade-off is a design decision and goes on the canvas rather than into a
commit message.

## Out of scope

The topology's own performance (Epic 6 and §27's WebGL targets), and Epic 14's
existing two exceptions, which stay quote-only.
