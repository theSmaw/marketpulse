# Task 3.6.3 — Which rows are live, and whether they move: the story's two open decisions

**Status:** Not started
**Story:** [3.6 Live Prices Across the Tracked Universe](STORY.md)
**Depends on:** 3.6.2

## Objective

Settle both open decisions **with the figures rather than with a preference**,
and implement whatever they produce.

1. **Whether every row is live, or only the visible ones.**
2. **Whether the table re-sorts under live data.**

They are one task because they are one question asked twice: **what does the
reader lose when a row is not where they left it?**

## What the user can see when this lands

**Possibly nothing**, and that is the likely honest answer for decision 2.

If decision 1 narrows the subscription, what a user sees is a row that stops
updating when scrolled past and **jumps when it returns** — which is the cost,
and it is the reason this is a decision rather than an optimisation.

## Decision 1 — every row, or only the visible ones

### The mechanism is already built and is not the argument

Task 3.5.6 made the fan-out per-client. A viewport-scoped subscription is
**`setLiveSymbols(visibleRows)`** — not new plumbing — and it is asserted over a
**real socket at 200 symbols**. The subscription is re-sent when the list
changes, and changing it does **not** reopen the socket.

### So cost is not the argument, and the figure says why

The whole universe is **56.9 KiB a minute** — and since Task 3.5.6 that is the
**ceiling of what one browser could receive** rather than what every browser
does receive. It is small. **Bandwidth does not decide this.**

**What might decide it is render work**, and the relevant measurement is Task
3.6.2's, not a new one: 518 elements, not the reducer, which carried 6,640
observations at **p95 52 ms** with zero long tasks.

### What is genuinely at stake

- **A row scrolled past stops updating and then jumps.** A reader who scrolls
  back to a row they were watching sees it change under them — which is the one
  behaviour a dense table is worst at absorbing.
- **The bands change the question.** This table is **collapsible by sector**,
  and a shut band renders no rows at all. So "visible" already has a cheaper
  meaning here than "in the viewport": **rows in an expanded band.** The
  route passes nothing to `initiallyCollapsed`, so today every band is open and
  all 518 render.
- **Virtualisation was measured and deferred, and the number is on the canvas**
  (`Universe navigation.dc.html`): replacing the whole 530-row table and forcing
  layout in the dev build — **100, 66, 51, 44, 48 ms**. That is the pessimistic
  bound, and it _brushes_ the 50 ms target without clearing it. The canvas's own
  verdict stands: **collapse is the cheaper answer to the same problem**, this
  repository does not add infrastructure before the iteration that needs it, and
  if a measurement says otherwise the work belongs to **Epic 14**.

**The default answer is therefore _every row_**, and narrowing needs a
measurement to justify it rather than the other way round.

## Decision 2 — does the table re-sort?

**Read the table before answering.** It is grouped into **sector bands in a
declared order**, with a benchmark ETF and then its constituents. **There is no
price sort today**, so "re-sorts itself as prices move" may describe a
behaviour this surface does not have.

If that is what the code says, then the decision is:

> **The table does not re-order under live data. Bands keep their declared
> order and rows keep their position; only the numbers inside them change.**

**Say it rather than leave it implied**, because the criterion asks for a
decision and because the next person to add a sort control needs to find the
argument. And the argument is short: a row that moves while being read is a row
that cannot be read, and **gainers, losers and anything ranked by a live metric
are Epic 4's** — which this story's data makes possible and must not pre-empt.

**Reversal trigger, condition-shaped:** the first sort control on this table
whose key is a **live** value.

## Work

- Read the current ordering and state what it is rather than what it might be
- Decision 1 taken against Task 3.6.2's element-count figure; if the answer is
  to narrow, implement it through `onLiveSymbols` and state what a returning row
  does
- Decision 2 recorded, with the Epic 4 boundary named
- Both with alternatives and a condition-shaped reversal trigger
- If either changes behaviour, a test that would go red if it silently reverted

## Done when

1. Both decisions taken **with figures**, recorded with alternatives and a
   reversal trigger that is a condition
2. Whatever they produce is implemented, or explicitly implemented as "no
   change" with the reason
3. The Epic 4 boundary is stated so the next story does not have to rediscover it
4. `pnpm verify` passes
