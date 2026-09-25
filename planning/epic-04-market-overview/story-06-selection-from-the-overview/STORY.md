# Story 4.6 — Selection From the Overview

**Status:** Not started
**Epic:** [Epic 4 — Market Overview](../EPIC.md)
**Depends on:** 4.5
**Epic scope covered:** security selection from the overview

## Description

**The story that turns four regions of figures into a place you start from.**

Until now this screen answers _what is happening_ and offers no way to act on
the answer. `PRODUCT_SPEC.md` §8.1 calls the overview the **landing screen**
and §4's first job ends with a reader who has found something worth looking at
— and then has to type the symbol into the Security Explorer's search field to
see it.

**Every figure on this screen is about a security or a group of them**, so
every figure is a potential destination: a proxy, a sector, a mover, and — if
Story 4.4 chose an aggregate that names them — the counts.

> **The URL rule is already settled and this story inherits it rather than
> re-deciding it.** `/securities/:symbol` is a real address, a cold link works,
> and the selection lives in the URL (`SEARCH-AND-SELECTION.md`). What is new
> is a screen full of **many** origins for that one destination, and the
> keyboard path through them.

## What the user can see when this story lands

**A landing page you can leave from.** Click a mover and the Security Explorer
opens on it. Click a proxy and the same. Tab through the screen and the reach
is the same as the pointer's, in an order that matches what a reader sees.

**This is the first moment MarketPulse works the way §8.1 describes it** —
start at the market, notice something, go and look at it — and it is the
epic's exit criterion in a single interaction.

**What they still cannot do:** see what a sector opens (there is no sector
page in V1 — this story decides whether a sector row is a destination at all),
or investigate anything (Epic 7+).

## Why it sits here in the sequence

**After the movers, because the movers are the reason to leave**, and after
the ranking decision, because a target that re-orders under a pointer is the
one thing that makes this interaction feel broken rather than alive.

## Acceptance criteria

1. Every security-bearing figure on the overview reaches `/securities/:symbol`,
   by pointer and by keyboard, with one tab stop per region rather than one per
   row where a region is a list
2. The destination is the **existing** route and the existing URL rule — no
   second selection mechanism
3. **A sector row's destination is decided in writing**, including "nothing,
   and it is not a link" if that is the answer; a row that looks clickable and
   is not is worse than a row that does not
4. Focus is never occluded by the sticky chrome at any width — this product has
   two sticky edges and a measured history of exactly this defect
5. A browser spec walks the journey: land on `/`, reach a mover, open it, and
   read a figure on the security page
6. Nothing on this screen announces the navigation; the destination page's own
   heading is the announcement (`FRONTEND-STATE.md` §7's rule)

## Design work

**The hit target and the hover state are the design work here**, and the
canvas has the input idiom (`Universe navigation.dc.html`) for a table row that
opens a security. What it does not have is **a figure that is also a link** —
the proxies and the movers are numbers first and destinations second, and a
number that grows an underline on hover is the wrong answer for a screen whose
figures move on their own.

## Out of scope

Investigation entry points (Epic 7+), the topology's own selection (Epic 6),
and multi-select or comparison (Epic 8).
