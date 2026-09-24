# Task 3.10.7 — The gap, filled rather than jumped

**Status:** Not started
**Story:** [3.10 Disconnection, Staleness & Every Degraded State](STORY.md)
**Depends on:** 3.10.1, 3.10.5

## Objective

Criterion 4: **restoring the feed fills the gap rather than resuming beside
it**, and the chart shows no hole afterwards.

## What the user can see when this lands

**A thirty-second dropout stops costing the rest of the day.** The feed comes
back, the missing minutes appear, and the chart is whole.

## The four constraints, all measured, and each one shapes the design

**1. There is nothing to ask the socket for.** A deliberate 3-minute
disconnection produced **fifteen bars over HTTP and zero on the socket** — then
or later, with no replay, no catch-up and no backfill frame (Task 3.1.9). **So
gap-filling is an HTTP backfill.** This is the third independent route to that
conclusion.

**2. The extent is arithmetic, not a diff.** A bar's `t` is its interval
**start** and the flush is **+60 s**, so _what am I missing_ is computable from
the disconnection instants alone. No reconciliation query is needed to know
**what** to ask for.

**3. The most recent ~15 minutes cannot be fetched at all.** The free plan
embargoes them. So the newest part of any gap is unfillable **at the moment it
is noticed**, which makes _when_ to fill a design decision and not a detail.

**4. A bar is not final for 29.1–30.1 s.** A fill that runs inside that window
will see a bar it is about to be sent a correction for. The live edge already
handles corrections by instant (`withLiveBars` replaces in place), so the repair
may be _let it_, but that has to be decided rather than assumed.

## The trap, recorded because the analyser walked into it first

**The question _was this bar missed?_ keys on when the bar was FLUSHED, never
on its own timestamp.** A naive `gapStart <= t < gapEnd` counts a
normally-delivered bar as recovered: one stamped `15:03:00Z` begins inside the
gap and is flushed at `15:04:00Z`, **after** the reconnection. A first pass over
the spike's capture reported **343 "recovered" bars** on exactly that error.

## And the ledger will not help you

`bar_coverage` is extended to the **last bar seen**, so a dropout leaves
minutes **inside a covered window with no rows in them** — indistinguishable in
the store from a security that did not trade. **The socket's own connection
history is the only thing that knows**, and it lives in the browser for the life
of the page.

**`bars:check` will not report it either**: its completeness rule is a count
against the session's expected minutes, and a thin IEX session is already far
below that.

## The rate limiter

A refilling bucket at ~3.3/s with **no `Retry-After` on a `429`**. A fill for
one security after a short dropout is one request; a fill for 518 after a long
one is not, and the repair for a two-minute dropout and a two-hour one are
**different repairs** — which is 3.10.1's decision 2.

## Work

- The gap's extent computed from connection instants, keyed on **flush** time
- The fill, per 3.10.1's decision 2, with the embargo and the limiter respected
- What happens to the unfillable newest minutes, decided and said on screen
- A `pnpm break` for the flush-time trap, because it is a silent wrong answer
- Assertions that a filled gap leaves no hole, using 3.10.2's harness

## Done when

1. A produced dropout, reconnected, leaves a chart with no hole — asserted
2. The embargoed tail has a decided behaviour and an honest sentence
3. The flush-time rule is break-verified
