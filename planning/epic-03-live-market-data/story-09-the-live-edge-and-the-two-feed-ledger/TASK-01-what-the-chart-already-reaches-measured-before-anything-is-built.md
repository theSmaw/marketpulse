# Task 3.9.1 — What the chart already reaches, measured before anything is built

**Status:** Not started
**Story:** [3.9 The Live Edge on the Chart & the Two-Feed Ledger](STORY.md)
**Depends on:** 3.8

## Objective

**Read the screen before building for it.** This story's own file says so in as
many words — _if it is already drawn, your scope is narrower than your file
assumes; read it again rather than building what shipped_ — and Story 3.8 has
just finished four consecutive tasks in which **the written-down hazard was not
the real one**, each settled by one query before a line of code.

This story was written when the store stopped at yesterday's close. It does not
any more.

## What the user can see when this lands

**Nothing.** This task writes down what is true and amends this story's scope to
match it. Every visible thing is 3.9.2 onward, and the point of doing this first
is that it may make some of them unnecessary.

## The five questions, each with the reason it is not obvious

1. **Where does the drawn series actually end today, on a cold load during a
   session?** Before Story 3.8 the answer was the fifteen-minute embargo's edge,
   filled by the read-time stitch to `alpacaServableEnd` — `now − 16 min`. Since
   Task 3.8.3 the **store** holds every complete minute the live feed delivered,
   which is `now − 1 min`. So the stitch may now be **behind** the store rather
   than ahead of it, and criterion 1's first half — _a chart of the current
   session reaches the current minute_ — may already be met on load. Take it
   from the deployed site with the market open; a local store answers a
   different question.

2. **Does anything redraw without a refresh?** Criterion 1's second half. The
   chart's series comes from `useBarSeries`, a fetch; `useLiveFeed` is what the
   identity block and the table read. Nothing wires the second to the first, so
   the expected answer is **no** — but it is one grep and the alternative is
   building a mechanism that exists.

3. **Is the two-feed source note already on screen?** Task 3.8.3 photographed
   it and Task 3.8.8 read it clause for clause against `VISUAL-LANGUAGE.md`. So
   criterion 2 and most of criterion 3 may be **shipped**. What Story 3.8's
   close added, and what this task must confirm rather than assume, is that it
   is a **mid-session** state: after the nightly backfill every regular-session
   minute has a `sip` row, the read prefers it, and the note collapses to one
   source (`LIVE-SESSION.md` §14).

4. **What does the chart do with a gap?** This is the question with the largest
   consequence and nobody has looked. IEX covers **65.1%** of a median name's
   minutes and **2.1%** of `ERIE`'s (`LIVE-DATA.md` §7.6), so a live session's
   series is _already_ full of holes — and `CHARTING.md`'s axis is
   **session-ordinal**, one slot per bar. A missing minute may therefore be
   **invisible**: the line joins 10:04 to 10:09 with no hint that five minutes
   are absent. That is the shape Task 3.5.5 wrote a reversal trigger against —
   _a chart that draws a straight line across four missing minutes as though
   nothing happened_ — and this story is the surface that fires it. Find out
   what is drawn now, with a real thin name, before deciding anything.

5. **What is the last bar, really?** The live writer holds back a bar whose
   minute has not ended (Task 3.8.3), so the store's last row is a **complete**
   minute. The socket, however, delivers a bar for the minute in progress and a
   **revision** of it about thirty seconds later (§7.8). So the partial bar is
   only ever a browser-side object, which narrows open decision 1 considerably.

## Work

- Answer all five against the **deployed** site with the market open, and
  record the answers here with what was asked and when
- `.capture/session/` may already hold most of this: Story 3.8's close ran
  `scripts/session-watch.mjs` over the session of **2026-09-24**, which records
  `provenance.sources` for `sessions=1` and `sessions=5` every fifteen minutes,
  the identity block's label, and a two-tape body byte for byte. **Read it
  before asking production again**
- Amend this story's `STORY.md` — scope, criteria and the two open decisions —
  to say what is true rather than what was true in September
- Say plainly which criteria Story 3.8 has already met, and strike them with a
  date rather than quietly leaving them

## Done when

1. Five answers, each with its evidence and the instant it was taken
2. `STORY.md`'s scope and criteria match the tree
3. Any criterion already met is struck with the task that met it named
