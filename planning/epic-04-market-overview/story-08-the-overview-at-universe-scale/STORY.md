# Story 4.8 — The Overview at Universe Scale, & Epic 14's Trigger

**Status:** Not started
**Epic:** [Epic 4 — Market Overview](../EPIC.md)
**Depends on:** 4.6 — **re-ordered 2026-09-27**, see below
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

## Handed here by Story 4.2's close — 2026-09-26: what the overview costs, and where to look

**1. The aggregate is computed ONCE per applied batch and broadcast**, not per
client — the payload is identical for every browser, unlike `bars`. So the
backend cost does not scale with connections; the **browser** cost does, because
every overview frame is a new object reference and therefore **a render on every
route**, including pages that display no overview. That was accepted
deliberately (the error direction is over-eager renders rather than a silent
miss) and it is a figure you should take rather than inherit.

**2. `bars` is up to ~16 frames a minute, not one.** This was corrected in
Task 4.2.1 after three stories had carried the wrong figure; the arrival mark
fires as one burst a minute, the **frames** do not. Anything sized against "one
frame a minute" is sized against a premise that was false.

**3. The strip's own per-tick cost is small and measured**: the region is
1392×183 at 1440 and 342×269 at 390, ten states all at one height, and a firing
mark shifts nothing. **What is not measured is the landing page with four
aggregates on it** — and Epic 14's trigger is a condition, _the first time a
second surface on that page renders per-row markup at universe scale_, which
`Movers` will be.

**4. `docs/GAPS.md` carries two browser flakes on the security page** that will
muddy any measurement taken with the full suite running —
`security-gap-fill.spec.ts` at **14 failures in 120 executions (~12%)** and
`security-feed-degraded.spec.ts` comparing a live page against a baseline taken
before the state it compares. Count failures per **execution**, not per run.

## Reassessed 2026-09-27 — you run BEFORE 4.7, and your scope widens to all five routes

**You moved ahead of 4.7** because 4.7 needs a phone during a real session and
you need neither, and Epic 3 stayed open for nine stories with that ordering the
wrong way round. The identifiers did not change — `CLAUDE.md` forbids a renumber
without remapping every reference in the same change, and four sibling files plus
`docs/GAPS.md` name `Story 4.7` for the degraded set.

**What that costs you, stated rather than discovered:** 4.7's
~332-`feed`-frames-a-minute repair now lands **after** you measure, so your
decode-side figure is an **upper bound**. That is the safe direction — those
frames are already collapsed by `sameLiveFeedView`, so they cost decode and
comparison but **no render** — and 4.9 re-checks rather than re-measures. Record
the caveat with the repair named.

### Your scope is now all five routes, not `/`

**Story 4.2 introduced a per-tick cost on four routes that display no overview at
all.** `useLiveFeed` is called in `App`; the overview field is compared in
`sameLiveFeedView` **by identity**; the decoder builds a new object per frame and
`computedAt` moves on every rebuild — so **the gate cannot collapse it by
construction**. A security page subscribed to one symbol went from about **one
whole-tree render a minute to up to sixteen**.

That was accepted deliberately and its error direction is the safe one
(over-eager renders, never a silent miss), **but the consequence on four routes
is measured nowhere and owned by nothing.** It is §28's **routine** word — the
same category as the 40 ms-every-30-s health-poll re-render Task 3.6.5 found and
repaired with two memo boundaries — not the once-per-visit cold load Epic 14
owns. `docs/GAPS.md`'s owner for it is a condition: _the first story that
measures a per-tick cost on any route other than `/`_.

**Epic 4 introduced it, so Epic 4 measures it**, which is this story's own
argument: _a figure taken after the epic is called done is a figure nobody
re-takes._ You will already have the instrument up, the production build up and
the feed running; `/securities/:symbol` is minutes more.

The byte cost is not the issue and is recorded so nobody re-derives it: 431 bytes
× ~16 a minute ≈ **6.9 KiB/min per attached browser**, ~12% on top of a
518-subscribed client and roughly **3× the inbound bytes of a one-symbol security
page**.

## Reassessed 2026-10-07 after Story 4.3 shipped — Epic 14's trigger was evaluated a third time, and it exposed a property of the trigger itself

**The verdict is recorded in Epic 14's own file, as your criterion 3 requires, and
is repeated here because you are the story that has to defend it.**

**It did NOT fire.** Story 4.3 put **eleven** sector rows on `/`, each with a rank,
a label, a ticker, a reserved mark slot, a figure and a bar — the first ranked
per-row surface outside `/securities`. Eleven is **2.1% of 518**, so this is not
_universe scale_ by two orders of magnitude, and the condition's own word is what
rules it out rather than a figure arriving under a line.

### The property nobody had noticed, and it is yours to resolve

**The trigger is worded against a page, and every previous evaluation was about the
other one.** Its words are _"the first time a second surface on **this** page
renders per-row markup at universe scale"_, and it was written when `/securities`
and its 518-row table were the subject.

**On `/` there is no first surface at universe scale at all.** The proxy strip is
four rows; the sector list eleven. So **the trigger as worded cannot fire on the
landing page until something there renders 518 of anything** — four aggregate
regions could ship without firing it, because each renders a _summary_ rather than
per-row markup.

**That is the trigger working as designed and it is also a gap**, because this
epic's cost is real and lands on a page the trigger cannot see. **You are where it
gets resolved**: either the trigger is re-worded to name a _computation_ at universe
scale rather than markup, or this epic's cost is owned here and the trigger is left
alone for `/securities`. Record which, in Epic 14's file, with the argument.

### What Story 4.5 will hand you, and why it is not the answer either

`Movers` ranks a **top-N over all 518** — so the **computation** is at universe
scale while the **rendered** rows are ten or twenty. On a strict reading of the
trigger's words that still does not fire it. **That asymmetry is the whole of the
question above.**

### Two figures from Story 4.3 you should not re-derive

- **The sector region's own per-tick cost is measured and is not a breach**: one
  FLIP over eleven rows, 20 re-orders — **1,098 rAF gaps, p50 16.7 ms, p95 17.6,
  worst 37.5, zero over 50 ms, zero long tasks.** Caveats recorded with it and worth
  keeping when you quote it: **a dev server**, and **a frame gap is a proxy for the
  task rather than the task**. Your production-build measurement supersedes it.
- **The `bars` frame count for the eleven sector ETFs is still unmeasured**, and no
  machine available to Story 4.3 could measure it. The vendor batches a minute into
  **8.8 frames at the open** (332 bars), 6.8 at midday, 16.1 at the close, with
  **no coalescing anywhere** in our code — so the eleven land in somewhere between 1
  and 11 frames and **nothing in this repository has ever recorded frame
  COMPOSITION, only counts.** You will have the instrument up and the feed running;
  logging each `bars` frame's **symbol list** is minutes more, and it is the one
  measurement a replay **structurally cannot** produce.
