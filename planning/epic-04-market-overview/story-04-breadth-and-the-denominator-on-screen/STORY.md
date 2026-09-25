# Story 4.4 — Breadth, & the Denominator on Screen

**Status:** Not started
**Epic:** [Epic 4 — Market Overview](../EPIC.md)
**Depends on:** 4.3
**Epic scope covered:** advancers / decliners; market breadth

## Description

**The number this epic's `EPIC.md` was mostly written about.**

> _"'How many securities are negative right now' has a denominator question in
> it: a name with no recent IEX bar is not a name that did not move."_

`PRODUCT_SPEC.md` §9 draws breadth as three percentages — advancing, declining,
unchanged — and §11 uses breadth again as an anomaly factor. **Both are counts
over a universe the live feed only partially observes**: about 332 of 518 names
in a median minute, 65.1% median per-symbol coverage, 2.1% worst case, and an
ordinary gap of 187 minutes.

**Story 4.1 chose the denominator. This story puts it on screen**, and the
choice of how to draw it is the real work: a percentage with a footnote is a
percentage nobody reads the footnote of, and this product's standing rule is
that **a claim about data requires data** (ADR 0029) — each clause renders only
when its own data is present.

> **`unchanged` is a third state and it is not noise.** On a feed where a
> third of names are silent in any minute, _unchanged_ and _unobserved_ are
> different facts with the same appearance, and collapsing them is the exact
> failure this story exists to avoid.

## What the user can see when this story lands

**How broad today's move is**, at a glance: how many of the market's names are
up, how many down, and — stated rather than buried — **how many the figure
could see at all**.

A reader who wants to know whether a 2% index move is _everything_ or _five
names_ can answer it from this region, which is `PRODUCT_SPEC.md` §4's first job
in one line of screen.

**What they still cannot do:** see which names (4.5), or click through (4.6).

## Why it sits here in the sequence

**After sectors, because sectors proved the denominator at a scale a person can
check**, and before the movers, because a mover list is breadth's detail view
and should not disagree with it.

## Acceptance criteria

1. Advancing, declining and unchanged render with their **denominator visible**
   and the words for it agreed in Story 4.1 — one home, one wording
2. **`unchanged` and `unobserved` are distinguishable on screen**, and a
   reader can tell which they are looking at
3. The figure agrees with the sector rows and the movers by construction — one
   computation, not three — with a test that fails if a second one appears
4. With the market shut the region is **honest rather than empty**: it reports
   the last session's close-to-close breadth, or says it is reporting nothing,
   and does not present a stale intraday count as current
5. The three figures never sum to something a reader can see is wrong at any
   rounding
6. A browser spec asserts the structure and **no figure**, per ADR 0029's rule
   for a deployed assertion against a store CI may not have

## Design work

**A breadth meter is the one region on this screen with a shape rather than
rows.** §9 draws it as three labelled percentages; the canvas has no equivalent,
and the nearest relatives are the volume chart's proportional bars
(`Volume and window.dc.html`).

Two things to settle on the canvas rather than in CSS: **whether the three
states are one bar or three figures**, and **how the denominator is drawn** —
it is a fact about the measurement rather than about the market, which in this
product's language means it belongs with the provenance treatment
(`Provenance and the empty answers.dc.html`) rather than with the figures.

## Out of scope

Breadth per sector (a candidate, and it is Epic 5's input rather than this
screen's), and breadth as an anomaly factor (§11, Epic 5).
