# Task 3.10.1 — What the tree already does in every degraded state, and the four decisions this story cannot start without

**Status:** Not started
**Story:** [3.10 Disconnection, Staleness & Every Degraded State](STORY.md)
**Depends on:** nothing

## Objective

**Build nothing.** Two outputs: an audit of what each surface _already_ does in
each degraded state, and **four decisions put in front of the owner** with the
measurements that bear on them.

This story's file carries **eleven** hand-off sections from seven sibling
stories. Some of what it asks for is already built, some was fixed on its behalf
before it started, and at least one figure in its own scope is **known stale and
corrected in a sibling's file**. Reading first is this epic's most reliably
profitable half-hour: Story 3.9 did it four times and it removed work every
time — a third of one story already built, one task deleted outright, one
feature already shipped, one criterion already met.

## What the user can see when this lands

**Nothing.** The output is a table, four questions and their answers.

## The audit — every surface × every state, filled in from the tree

Produce the grid. The columns are the states; the rows are the surfaces that
`PRODUCT_SPEC.md` §36 and this story's scope name:

| Surface                       | `live` | `stale` | `disconnected` | market shut | security quiet |
| ----------------------------- | ------ | ------- | -------------- | ----------- | -------------- |
| The chrome's market-feed cell |        |         |                |             |                |
| The identity block's price    |        |         |                |             |                |
| The universe table's 518 rows |        |         |                |             |                |
| The chart's edge              |        |         |                |             |                |
| The source note               |        |         |                |             |                |
| The volume strip              |        |         |                |             |                |

**Fill it by rendering, not by reading.** A cell that says _"probably defers"_
is the thing this task exists to replace.

**Three cells are already known and should be confirmed rather than
discovered**, because three siblings wrote them into this file:

- **Nothing clears the prices on a degraded feed** — Story 3.4 keeps the
  numbers through `disconnected` deliberately; blanking them would remove true
  information because a socket died.
- **The arrival mark simply stops.** There is no _stopped_ state in the motion
  vocabulary and there should not be one.
- **The chart's stopped edge is a straight line that says nothing** — Story
  3.9's close, and the three noes behind it.

## The four decisions, each with the measurement that constrains it

**Ask the owner. Do not choose any of these on the way past.**

### 1. The staleness threshold, in seconds, and whether it varies by security

This is **the hardest decision in the epic** and two tasks have already refused
it with a measurement. `LIVE-DATA.md` §11.2 declined to give a security a status
word; Task 3.6.2 declined to repair the table's state 4 because _"the repair is
a threshold"_ and taking it inside a design pass about a disc would be taking
this decision as a side effect.

What bears on it:

| Figure                                                                    | Source              |
| ------------------------------------------------------------------------- | ------------------- |
| IEX per-symbol minute coverage: **65.1% median, 2.1% worst (`ERIE`)**     | `LIVE-DATA.md` §7.6 |
| Gap between one security's consecutive bars: **p50 one minute, max 187**  | §11.2               |
| The shipped `stale` threshold for the **connection**: **60 s** wall clock | Task 3.2.6          |
| The shipped `disconnected` threshold: **165 s** monotonic                 | Task 3.2.6          |

**The trap to state when asking:** a maximum ordinary gap of **187 minutes**
means no single number separates a quiet security from a broken feed. So the
honest options are probably _(a)_ no per-security staleness at all, keeping the
distinction at the connection where it already lives, _(b)_ a number that will
be wrong for thin names and saying so, or _(c)_ something derived per security
from its own observed cadence — which is a model, and models are Epic 5's.

### 2. How far back a reconnection fills, and what it does when the gap is too large

Constraints, all measured:

- **What is missed while away is GONE** (Task 3.1.9): a deliberate 3-minute
  disconnection produced **fifteen bars over HTTP and zero on the socket**,
  then or later. So filling is an **HTTP backfill** and cannot be a socket
  feature.
- The free plan embargoes the most recent **~15 minutes** of historical bars.
  **So the most recent part of any gap cannot be filled at the moment it is
  noticed**, which makes _when_ to fill a decision as well as _how far_.
- The rate limiter is a refilling bucket at ~3.3/s with **no `Retry-After` on a
  `429`**.
- **A revision is not a gap** and a bar is not final for **29.1–30.1 s**.

### 3. Whether a stale price keeps its last change figure or drops it

Both defensible, and they make different promises. The change figure is
_"change from the previous close"_ — arithmetic over two numbers, one of which
is now old. Keeping it is a true statement about a stale price; dropping it
refuses to compute over data we have stopped trusting.

### 4. The venue word beside the connection word — and this one has been seen wrong on the deployed site

The 2026-09-22 rehearsal read `MARKET FEED ● ALL US EXCHANGES ● LIVE` while
every live number on the page was **IEX**. That is `CLAUDE.md` invariant 6's own
sentence breached on every route. The cell has two subjects and this story owns
what it says in **every connection state**.

The options that file already names: the cell names the **live** tape, or
**both**, or **defers to the source note** (`PROVENANCE.md` §1.3 — the chrome
says what it can and the source note says what the chrome cannot). Story 3.9's
two-feed sentence is the other half and is now shipped, which narrows it.

> **When answered, write the rule into `market-feed-grid.test.ts`**, which today
> asserts that a connection word has _a_ feed word beside it and not that it is
> the right one. That is why nothing went red for four days.

## One correction to make in this file before anything else

**This story's own scope and criterion 6 reason from the wrong figures.** They
cite median coverage **82.8%**, worst case **43.1%** — which are `ALPACA.md`
§5.2's and came from **stored history**. The live stream is worse: **65.1%
median, 2.1% worst**. The correction has been sitting in a sibling's file since
2026-09-17 and this file records it further down without amending the scope
above it. **Fix the live claims; leave the historical records standing.**

## Work

- The grid, every cell filled by rendering the state
- The four decisions put to the owner, each with its figures and its trap
- The stale coverage figures corrected in this story's scope and criterion 6
- Anything the audit finds already built, struck from the criteria with the
  test or component that meets it named

## Done when

1. The grid has no empty cells and no cell reading _probably_
2. The four decisions are answered by the owner and written down with their
   rejected alternatives
3. Any criterion already met is struck, with its evidence named
