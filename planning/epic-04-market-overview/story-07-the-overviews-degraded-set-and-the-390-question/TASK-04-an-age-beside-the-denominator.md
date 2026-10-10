# Task 4.7.4 — An age beside the denominator

**Status:** Not started
**Story:** [4.7 The Overview's Degraded Set, & the 390 Question Answered](STORY.md)
**Depends on:** 4.7.3

## Objective

**`Market breadth` and `Movers` are the two things on this screen most
confidently wrong when stale, and they carry no instant in any state.**

## What the user can see when this lands

**Each of the two regions says when the window it measured over ended** —
beside the denominator it already states. An age, **not a verdict**.

## Work

### Why these two and not the others

| surface                            | covers                                  | where it sits                       |
| ---------------------------------- | --------------------------------------- | ----------------------------------- |
| the proxy strip's shared qualifier | **the newest of four**                  | under the four figures, top of page |
| `Observed through hh:mm`           | **the newest of 518**                   | the last element before the footer  |
| `Market breadth`'s footer          | states the **window**, never an instant | middle of the page                  |
| `Movers`' footer                   | states the **window**, never an instant | middle of the page                  |

At 390 the page is **2,565 px** and the breadth-first order puts those two
regions near the top, so **the one screen-level instant that would qualify them
is roughly 2,500 px below them, behind three reserved panels.** At 1440 it is
at least on the same screen.

### The rule it follows rather than invents

An instant beside a denominator is **an age, not a verdict** — the same
decision the strip's third row and the universe table's `Live price from 12:07`
already took. **It does not reverse Story 3.10's one-home rule**, and the
owner has held that rule: `/` gets ages and **never** a connection word.

### Where the fact comes from, and the trap in it

`observedAt` is already on the frame (Task 4.8.12) — a bar's own `startsAt`
folded over **the join's whole answer**, so it is the universe-wide instant
rather than a sample of what this route subscribed to. Two mechanics travel
with it: a bar's instant is **the start of the interval it describes**, so
anything comparing it to now must add the interval exactly as `feedStatusFrom`
does, or it re-creates Task 3.3.4's defect one surface over; and **it is absent
when the aggregate holds no observation**, which is CI's permanent state — so
by ADR 0029's defer rule the clause **renders only when its own data is
present.** Say nothing rather than say now.

### One fact, one home

`measured-set.ts` already builds the sentence both footers read, in two
grammars keyed on the basis the wire sent. **The instant joins that builder**,
not each footer — one string, two renderings, and a second copy fails the
build.

### Explicitly NOT in scope

No threshold, no status word, no connection word, and **no per-region
verdict**. A threshold here would be a second staleness verdict on `/`, which
`a-second-staleness-sentence` and `one-home-for-the-strip-staleness-sentence`
already refuse by name.

## Done when

1. Both footers state the instant their window ended, from the one builder
2. The clause renders **nothing** when the aggregate holds no observation —
   asserted in CI's own state
3. The instant is the interval's **end**, not its start, wherever it is
   compared to anything
4. No new word enters the vocabulary, and the existing one-home invariants
   still hold **for their own reasons**
5. `pnpm verify` and `pnpm e2e` green, and the two states photographed
