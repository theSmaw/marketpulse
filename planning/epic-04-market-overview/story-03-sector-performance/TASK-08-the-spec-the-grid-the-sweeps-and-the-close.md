# Task 4.3.8 — The spec, the state grid, the sweeps and the close

**Status:** Not started
**Story:** [4.3 Sector Performance, & the Benchmark That Is Not an Average](STORY.md)
**Depends on:** 4.3.7

## Objective

**What the suite can say about a ranked list, what it cannot, and the record.**

## What the user can see when this lands

**Nothing.** The story is finished and the next reader can find out why it is
built this way.

## Work

- **The browser spec**, extending `overview-proxy-live-update.spec.ts`'s harness.
  **Assert a permutation of a captured order, never a literal list** — asserting
  eleven literal positions re-implements the sort in the spec, so a wrong
  comparator is asserted rather than caught. And **serve every fixture in a
  deliberately wrong order**: a fixture already sorted makes an absent sort
  invisible, which is the likeliest actual failure. Delete the comparator, run
  the spec, watch it go red.
- **What CI cannot say, in the spec's header, in the established words**:
  everything about what the browser does with an arrival and nothing about
  whether one arrives. On CI all eleven sectors are `unknown` **for ever** — 518
  securities, zero bars, no provider — so the ranked state this story exists to
  produce occurs on **no gated machine**.
- **Stay out of the two characterised flakes' class**, which is _a byte-identical
  text assertion over a page that is still settling_: wait for a **positive**
  state before capturing a baseline; assert **scoped** to the eleven symbols'
  document order, never whole-`main`; assert a **transition**, not an absence
  across a window; assert no duration and no threshold; and **characterise before
  merging** — `--repeat-each=6` four times on one settled checkout, counting
  failures **per execution**, because at 12% a single run comes back clean 46% of
  the time and reads as proof.
- **The state grid**: every state × four widths, **in greyscale and under a
  deuteranopia matrix**, compared as strings. No two rows may read identically
  and no row's direction may be lost. `docs/GAPS.md` entry 13 is discharged for
  this region by **producing** every row rather than reasoning about it — and its
  second half, walking the **producers** for states with no row, is the half that
  had never been run before Story 4.2 ran it and found two missing from a grid
  four days old.
- **The `docs/GAPS.md` entries**, each with a `Re-measure:` line — the sector↔ETF
  pairings checked against nothing outside this repository; no gated machine
  seeing a ranked order; eleven more figures riding the closes cache's
  two-session window, which can now **re-order a ranking** rather than only skew
  a percentage; two sectors displaying an identical figure ordered by a value
  nobody can see; the region's geometry; and the frame-grain measurement's own
  result. **Amend existing entries rather than writing siblings** where one
  exists.
- **The sweeps.** Upward: any figure this story falsified, same day. Sideways:
  grep this story's documents for every `Story N.M` and `Owner:` line, check each
  against that story's own file, and **record the count that were missing** —
  Story 4.2's close found **six of six** absent.
- **Epic 14's trigger, evaluated in writing.** Its condition is _per-row markup at
  universe scale_; eleven is not that, so **it does not fire**. Record the verdict
  in Epic 14's own file, because somebody will claim it did.
- **`LIVE-REHEARSAL.md`.** Open this story's row when the work opens rather than
  at the close — the ledger's own history is that empty rows accumulate and are
  then filled by a headless browser. And **Story 4.2 has no row at all**: nothing
  in this product has ever watched a **derived** figure move against a real feed,
  and this story is the first where a **rank** moves, which is the first thing a
  person can be wrong about without any number being wrong.

## Done when

1. A browser spec asserts the order changing as a permutation of a captured
   order, and goes red with the comparator deleted
2. Its fixtures are served out of order, and the spec's header says what a green
   run does not certify
3. The grid exists at four widths in greyscale and under a deuteranopia matrix,
   with no two states reading identically
4. Every `docs/GAPS.md` entry has a `Re-measure:` naming a file or a command, and
   existing entries were amended rather than duplicated
5. The sideways sweep's miss count is recorded, and Epic 14's verdict is in Epic
   14's file
