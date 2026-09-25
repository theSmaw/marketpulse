# Story 4.5 — The Movers, & the First Surface That Ranks by a Live Value

**Status:** Not started
**Epic:** [Epic 4 — Market Overview](../EPIC.md)
**Depends on:** 4.4
**Epic scope covered:** top gainers / losers

## Description

**This is the surface the universe table's rule was written against.**

Task 3.6.3 decided that the 518-row table **never re-orders under live data**,
and said why in one sentence: _a row that moves while it is being read is a row
that cannot be read._ Its reversal trigger is **the first sort control whose key
is a live value** — and this story is not that trigger. It is a **different
surface with a different promise**, handed here by Story 3.6's close in as many
words: _"Anything ranked by a live value is yours."_

**So the decision this story owns is what happens to the ranking while
somebody is reading it**, and every option is a real product:

| Option                              | Reads as         | Risk                                                        |
| ----------------------------------- | ---------------- | ----------------------------------------------------------- |
| **Re-rank on every frame**          | genuinely live   | a row moves out from under the pointer once a minute        |
| **Re-rank on a cadence**            | settled          | a figure and its position can disagree                      |
| **Freeze while hovered or focused** | considerate      | two readers see different orders                            |
| **Re-rank, and MARK what moved**    | live and legible | the motion vocabulary has to say what a re-order looks like |

> **The motion vocabulary already has the rule this needs**: work in progress
> LOOPS, a state PERSISTS, **a fact arriving DECAYS**. A re-order is a fact
> arriving about a row — which suggests an answer, and this story has to test
> it against real movement rather than reason its way to it.

## What the user can see when this story lands

**Who is actually moving.** Two short ranked lists — the biggest gainers and
the biggest losers among the names we track — each row carrying its symbol, its
price and its change, updating as the session runs.

**This is the first thing on the landing page that answers _where should I
look_**, which is the whole reason §9 puts it beside the topology, and it is
the screen's most obviously alive region.

**What they still cannot do:** click a mover through to its security page
(4.6 — deliberately the next story, because a list of names nobody can open is
a list that invites the wrong repair).

## Why it sits here in the sequence

**After breadth, because a mover list that disagrees with the breadth count is
worse than either alone**, and both have to come out of one computation.

**Before selection**, because the ranking rule has to be settled before
anything becomes clickable: a target that moves between the decision to click
and the click is a defect the web has known about for thirty years, and this
screen manufactures one every minute by design.

## Acceptance criteria

1. Gainers and losers render, ranked, from the same computation as breadth and
   sectors, at four widths
2. The re-ranking decision is **taken against real moving numbers** — the
   replay or a live session, never a fixture — and recorded with its
   alternatives and a reversal trigger
3. **A row does not move out from under a pointer or a focus ring** without the
   reader being able to tell that it did
4. `prefers-reduced-motion` gets a version of the answer that is still legible,
   asserted in a browser
5. A name with no current observation **cannot appear** in either list, and the
   lists say what they are computed over
6. The per-tick cost of both lists is measured against §28's 50 ms **routine**
   line, on a production build, with every row changing

## Design work

**One ranked-list component, two uses** — this and Story 4.3's sectors. The
canvas gets the component and its states: a full list, a short one, a list
whose rows are re-ordering, and the reduced-motion version.

**The re-order treatment is a genuine addition to the motion vocabulary** and
belongs beside the others in `The motion vocabulary.dc.html` rather than in a
new file, because the vocabulary's value is that it is one page.

## Out of scope

Anomaly-ranked lists (Epic 5 — _unusual_ is not _largest_), sparklines per row
(Epic 6/8), and any sort control on the universe table.
