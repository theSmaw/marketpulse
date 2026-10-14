# 0043 — Two five minutes: a freshness cutoff and a measurement span

**Status:** Accepted
**Date:** 2026-10-14
**Story:** [5.2 The Trailing Window, & the 5-Minute Return](../../planning/epic-05-anomaly-detection/story-02-the-trailing-window-and-the-five-minute-return/STORY.md), Tasks 5.2.2 and 5.2.5

## Context

This product now spells **five minutes** twice, in two modules, for two
different quantities, and the two are easy to mistake for one because they share
a number, a unit and a word.

**`BREADTH_WINDOW_MINUTES = 5`** (`apps/backend/src/market-breadth.ts:84`) is an
**eligibility cutoff over a population**. [ADR 0040](0040-what-current-means-a-five-minute-observation-window.md)
defines it as what `current` means on the landing page: a security whose newest
observation is older than the cutoff is **not counted**, in one shared pass whose
output is the numerator and the denominator of everything on that screen, and it
travels on the frame as `windowMinutes` so the sentence beside a count is always
the window that count was taken with. **Its input is a coverage curve** — Task
4.1.6 measured it — so a re-measure of that curve legitimately moves it.

**`RETURN_SPAN_MINUTES = 5`** (`apps/backend/src/five-minute-return.ts:90`) is a
**measurement span between two named endpoints of one security**. The two bars'
own `startsAt` must be **exactly** that far apart; if the earlier endpoint is
absent the figure is **refused** rather than taken from the nearest bar, because
`ERIE` at 2.1% minute coverage would otherwise produce _"the 5-minute return"_
between bars 47 minutes apart. **Its input is `PRODUCT_SPEC.md` §11**, which
asks for a five-minute return, and nothing about a coverage curve may move it.

Different subject (a population against one security), different arity (a filter
against a pair), different failure mode (excluded against **refused**), different
input, different owner.

**And the check that was supposed to prevent a second window could not tell them
apart.** `one-home-for-the-observation-window` matches
`getTime() - <anything> * MS_PER_MINUTE` across **every shipped source file** and
required **exactly one**, in `market-breadth.ts`. The endpoint lookup is that
shape, so the obvious implementation went red — and the check's own docblock
names `market-unusual.ts` with `RECENT_MINUTES = 5` as the plant it was built
against, so a future reader would have read that red as _Story 5.2 introduced a
second definition of `current`_, which is false.

## Decision

**A freshness cutoff and a measurement span are different quantities, spelled
differently, and the one-home check distinguishes them by NAME rather than by
shape.**

`one-home-for-the-observation-window` carries a third conjunct: beside **exactly
one** eligibility cutoff in `market-breadth.ts`, **exactly one** measurement span
in `five-minute-return.ts`, naming a constant of its own. Its failure message
routes the next author rather than only refusing — _if it is not a freshness
window at all but a SPAN between two endpoints of one security, it belongs beside
`fiveMinuteReturn` rather than in a third module_.

**Three rules follow, and each is a thing a later story would otherwise
re-litigate.**

1. **The span must never reuse `BREADTH_WINDOW_MINUTES`**, however tidy that
   looks. The day somebody re-measures the coverage curve and moves the
   eligibility window, the return's span would move with it **silently**, and
   every figure would still be well-formed. The break
   `a-span-spelled-as-the-observation-window` performs exactly that edit.
2. **`eligibleMoves` must not gate the return.** The return refuses on **endpoint
   absence**, not on freshness — a pair 187 minutes old is still a correct
   five-minute return of two bars five minutes apart, and AC 6 forbids this
   surface a staleness threshold precisely because the 187-minute maximum is what
   any threshold would have had to spare.
3. **A third window is a third module and the check refuses it.** Story 5.3's
   percentile lookback is the next candidate; it is neither of these two and owes
   its own conjunct, its own constant and its own argument.

**And `one-home-for-the-live-change` needed widening in the same change**, which
nobody anticipated. Its third clause refuses any shipped file that **divides by a
close**, because the defect it guards is an author who holds the live map and the
stored closes and writes the subtraction himself, losing the same-session branch.
`five-minute-return.ts` divides **a minute bar's close by another minute bar's
close**, five minutes apart, on one live tape, and reads no stored close at all.
The exemption is **named and anchored in both directions**: that file must still
divide by a close — an exemption nothing uses is a hole nobody is watching — and
must **not** mention `SecurityLastClose`, `readLastCloses`, `closesAsOf` or
`previousClose`, so the day it reaches for the session-close side the exemption
stops covering it.

## Consequences

**ADR 0040's own reversal trigger has NOT fired, and this ADR says so because an
unevaluated trigger and one that did not fire read identically.** That trigger is
_the first aggregate on this screen whose honest window is not breadth's_, where
**this screen is `/`**. The five-minute return is **not an aggregate** — it is one
security's two endpoints — and it is **not on `/`**. What would fire it is Story
5.4 putting a ranked list of these figures on the landing page with a window that
is not breadth's.

**Two numbers that are equal today are not required to stay equal.** Nothing
couples them, and that is the point: if §11's return becomes ten minutes, or the
coverage curve moves the eligibility window to seven, each moves alone.

**A reader who sees `5` twice is owed this file.** Both constants carry a
docblock pointing here, which is the cheapest mechanism available for a
distinction that is invisible at the call site.

## Alternatives rejected

**Reuse `BREADTH_WINDOW_MINUTES` for both.** Tidy, one constant, and it couples a
product requirement to a measurement of our own feed's coverage. Rejected; it is
the break.

**Narrow the one-home check's claim** so it stops seeing the span at all — for
example by matching only within `market-breadth.ts`. Rejected because the check's
value is that it sees the **whole tree**: narrowing it to the file it already
trusts makes it an assertion about one file rather than about the product.

**Spell the span without a minute-scaled subtraction** so the regex does not
match it. Rejected by the check's own comment, which names that as the invisible
residue it exists to prevent.
