# Story 4.7 — The Overview's Degraded Set, & the 390 Question Answered

**Status:** Not started
**Epic:** [Epic 4 — Market Overview](../EPIC.md)
**Depends on:** 4.6
**Epic scope covered:** live market status indicators, on the screen where they matter most

## Description

**Epic 3 enumerated the degraded set once, produced rather than imagined —
nine states, four widths, six surfaces compared by string. This story inherits
it rather than re-inventing it**, which is what this epic's `EPIC.md` says in
as many words.

**Three rules travel with it**, each somebody's measured defect: `FeedStatus`
is about the **connection** and `MarketSessionStatus` about the **session**,
and they must not be collapsed; **a quiet security is not a broken feed**; and
**the connection has one home** — the status bar — with every other surface
quiet by decision.

**But this screen is different from a security page in one way that matters.**
A security page showing a stale price is wrong about one name. **An overview
showing stale aggregates is wrong about the market**, and its whole claim is
_right now_. So the question this story answers is not _does the chrome say
the feed stopped_ — that is settled — but **what should four regions of
aggregates do when the thing they aggregate has stopped arriving?**

> **And the item `EPIC.md` says is owed a person BEFORE this epic ships a
> screen**: at 390 the status bar is the only surface that tells _the feed
> stopped_ apart from _the market is shut_, and it is at the foot of the
> viewport. Story 4.1 asked the question; **this story answers it**, with a
> real phone during a session, and repairs it if the answer is that nobody
> notices.

## What the user can see when this story lands

**A landing page that is honest when its data is not arriving**, in the
product's established words: the figures that were true stay on screen with the
instant they were true at, nothing pretends to be current, and no region
becomes an error message because a feed dropped.

**And on a phone, a reader can tell the difference between a quiet market and a
broken feed** — which today they cannot, and nothing mechanical can see it.

## Why it sits here in the sequence

**After the screen is complete and before anybody rehearses it.** The degraded
set is produced by walking a finished screen through its states; doing it
earlier means doing it twice, and doing it later means shipping a screen whose
worst states nobody has seen.

## Acceptance criteria

1. The overview's degraded states are **produced** — through the shipped socket
   path, not furnished — and photographed at 1440, 1024, 768 and 390, including
   in greyscale
2. **No two states read identically**, compared by string rather than by eye
3. Killing the feed changes no figure and raises no page error; every region
   keeps what it had with the instant it belongs to
4. The connection still has **one home**, and this screen adds no second
   connection word — or, if it must, the decision is recorded against ADR
   0029's fourth rule with a measurement behind it
5. **The 390 question has an answer from a real phone during a session**, and
   either a repair or a written statement of why the current shape is right
6. `pnpm break` entries for anything this story adds, run and red

## Design work

Inherit `Degraded states.dc.html` and `Failure and partial states.dc.html`
rather than starting a new vocabulary; **add only the states the overview has
that a security page does not** — chiefly a region whose aggregate is over a
map that has stopped growing.

## Out of scope

Changing the thresholds (165 s monotonic, 60 s wall — ADR 0036), and the
connection's home.
