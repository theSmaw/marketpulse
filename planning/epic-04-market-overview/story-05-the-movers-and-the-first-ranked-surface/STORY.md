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

## Amended by Task 4.1.1 — 2026-09-25: the ranking rule is decided, the treatment is not

**The owner chose re-rank, and mark what moved** — from four options including
freezing under the pointer and ranking on a slower cadence.

**So the rule is settled and this story's work is the treatment.** The motion
vocabulary already supplies the grammar — **work in progress LOOPS, a state
PERSISTS, a fact arriving DECAYS** — and a re-order is a fact arriving about a
row, which points at a decaying mark rather than a sustained one.

**What the decision does not settle, and this story must**: what the mark is,
how long it lasts, what happens when several rows move at once, what a reader
with `prefers-reduced-motion` gets, and **what protects a row that is under a
pointer or a focus ring at the moment it moves**. The rule permits re-ordering;
it does not permit a target moving out from under a click.

> **Take it against real movement.** Story 3.4 settled the first motion
> decision in front of four treatments running on the real component at 1×
> against replayed bars, and that is the bar this decision inherits.

## Handed to this story by Task 4.1.8 — 2026-09-25: two decisions this story is missing, and the first one can make a ranking wrong

**The hand-off enumeration found both, and this story's file carried neither.**

### 1. The denominator, and why a RANKING is the worst place to ignore it

**Measured on the deployed gateway across a whole session on 2026-09-25**: of
518 tracked securities, the number heard from inside the last **5 minutes** has
a median of **466** and a worst hour of **446**. At two minutes it is **325**,
and at 13:00 it is **298**.

**So on any given tick this screen has no recent price for roughly 50 of the 518.** For breadth that understates a count. **For a ranking it can be flatly
wrong**: the day's biggest mover may be one of the securities not heard from,
and a top-ten computed over the ~466 that were heard from will show ten names
that are **not** the ten biggest movers, with nothing on screen saying so.

**This is `EPIC.md`'s _an aggregate is the one kind of number that can be wrong
while looking right_ in its sharpest form** — a ranked list looks equally
confident whether its input was complete or not.

**What this story owes, therefore:**

- **State the denominator beside the ranking**, in the words Story 4.4 settles
  — _N of 518 in the last 5 minutes_ — and not in the connection's vocabulary.
  A sentence reaching for `live`, `stale` or `disconnected` would trip
  `one-home-for-the-feed-words`, and **would deserve to**.
- **Decide, in writing, what a mover with no recent price is.** Excluded and
  counted, or included on its last stored close with the staleness shown. Both
  are defensible; silently dropping it is not.
- **M is 5 minutes and is not this story's to re-choose.** The curve, the
  by-hour shape and the argument are in Story 4.4's file.

### 2. Where an aggregate is computed

**Story 4.2 builds the seam and this story uses it.** The decision taken in
Task 4.1.1 is **a new frame on the existing socket** — not a second fetch, not a
poll, and not a computation in the browser over 518 rows. When this story needs
the movers, it reads them off that frame.

> **The reason it is a decision rather than an implementation detail**: a
> browser that ranks 518 securities on every tick is a main-thread task on the
> page `PRODUCT_SPEC.md` §28 is least able to afford one, and this product has
> already paid for that lesson once on the securities table.

## Handed here by Story 4.2's close — 2026-09-26: the fourth design test is live here, and a measurement is owed first

**1. The fourth design test — _does it feel alive_ — is unanswered for a small
set, and a measurement decides it before any judgement can.** `The mark
multiplied by five hundred.dc.html` defends 518 simultaneous arrival marks on
**rate** (332 bars inside a 243 ms burst, so the page is still for 59.7 seconds)
and files the perceptual question under **"THE RISK THAT IS ACCEPTED RATHER THAN
DISPROVED"** — its one perceptual reading is that discs at full density read as
texture, which **needs density that a handful of cells on one line does not
have**.

**Before the rehearsal, read from the gateway whether a small set's bars arrive
in ONE `bars` frame or spread across several of the ~16 a minute.** Four in one
frame is a synchronised wave; four across several is a stagger the data
genuinely has, arriving free. **A sitting that cannot say which the watcher saw
cannot answer anything.** The inherited trigger's second clause is the live one:
_the first surface where the burst stops being once a minute_.

**2. A ranked list over 518 candidates once a minute is a ROUTINE per-tick
cost**, in `PRODUCT_SPEC.md` §28's own word — the same category as the 40 ms
every 30 s that Task 3.6.5 found and repaired with two memo boundaries, not the
once-per-visit cold load Epic 14 owns. Size it against 518 from the first line.

**3. A shared claim inverts on a small set.** On the proxy strip, when one of
four ticks, **three of four cells carry an exception line** — the
shared-claim-with-exceptions idiom makes the exception the majority. It
misstates nothing, but a ranked surface that adopts the idiom should know it
degrades as the set shrinks.
