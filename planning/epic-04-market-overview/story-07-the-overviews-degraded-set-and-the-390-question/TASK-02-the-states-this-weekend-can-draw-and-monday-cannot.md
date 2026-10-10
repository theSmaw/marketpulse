# Task 4.7.2 — The states this weekend can draw, and Monday cannot

**Status:** Not started
**Story:** [4.7 The Overview's Degraded Set, & the 390 Question Answered](STORY.md)
**Depends on:** 4.7.1

## Objective

**One axis of this story's grid is producible today and unproducible from
Monday morning**, because the masthead reads the real wall clock — which is
Task 3.10.9's own recorded fifth instrument limitation.

## What the user can see when this lands

**Nothing.** It is the row the previous grid could not take.

## Work

### Why today

**`market shut × feed stopped`** needs the masthead to say the market is shut,
and the masthead reads the wall clock rather than a frame. 2026-10-10 is a
Saturday and `market-calendar.ts` has no October exception, so the next regular
session is **Monday 2026-10-12 09:30 ET**. **Three of Task 3.10.9's nine states
were told apart by the chrome alone, and two of those three would have been
told apart by two surfaces on a genuinely shut market — which that instrument
could not produce.**

### The states to take, and all of them are free

- `overview` absent **before** the 2,000 ms floor — every cold load.
- `overview` absent **after** the floor, terminal — **the screen's worst state,
  and it is in no grid.** Four regions silent, the strip saying `No prices
yet.`, the footer reading `LIVE` for 165 s.
- **518 `unknown`, `measured: 0`, `eligible: 0`, two empty lists, `observedAt`
  absent** — 928 bytes, **free on every gated run**, and the one state nobody
  has photographed because **its new source-note clause is an absence** and
  absences are what photographs are worst at.
- Closes present, nothing observed — a populated store with no provider,
  2,042 bytes.
- The session basis — 3,142 bytes.
- `market shut × feed stopped`, **the row that expires**.
- The backend unreachable, where the status bar **grows four wrapped lines to
  six at 390**.

### At four widths and in greyscale, and greyscale at every width

Story 4.2's grid greyscales **1440 only**. **The 390 column is where the
degraded sentences are longest**, and the price palette differs by **1.04:1** in
greyscale — four greyscale simulations once passed against a chart that was
wrong.

### Read the page, not the document

`/` re-renders **13.6–32.2 times a minute** in every degraded state, so a state
photographed twice may differ only in which render was caught. Settle the text
before reading it, and **exclude the masthead**: its clock mutates every second,
which is why `overview-instrument.mjs` refuses `document.body` as a target.

## Done when

1. Every state above produced through the harness, at 1440 / 1024 / 768 / 390,
   **greyscale at every width**
2. `market shut × feed stopped` taken **before Monday's open**, with the date
   and the masthead's own words in the record
3. The terminal no-frame state and the `observedAt`-absent state both
   photographed, with the absence stated rather than shown as a gap
4. Each row's text read from a settled page with the masthead excluded, and the
   per-surface strings recorded
