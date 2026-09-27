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

## Amended by Task 4.3.3 — 2026-09-27: two claims for `docs/GAPS.md`, and the second one is a hole in what a replay can prove

**1. The `bars` frame count for the eleven sector ETFs is unmeasured, and no
machine available to this story can measure it.** Task 4.3.3 needed to know
whether the eleven arrive in one frame or several. What it established:

- **Several, structurally.** One upstream Alpaca array → one `onObservations` →
  one `bars` frame, 1:1, no coalescing anywhere (`alpaca-stream.ts`,
  `index.ts`, `market-gateway.ts`), and the type says so —
  _"One upstream frame's worth. Batched because the vendor batches (§7.2)."_
  The vendor batches a minute into **8.8 frames at the open** (332 bars), **6.8 at
  midday** (284) and **16.1 at the close** (450) — `LIVE-DATA.md` §9.5/§10.2 — so
  roughly 7% of the universe per frame. The eleven therefore land in **somewhere
  between 1 and 11** frames.
- **Which of those is unrecorded**, because **nothing in this repository ever
  recorded frame COMPOSITION, only frame counts.** `.capture/coverage/`'s real
  2026-09-25 session has `"frames":{"bars":4113,"observations":130413}` — 31.7
  observations a frame — and cannot answer it, which is why it could not be
  reused.

**What a live sitting has to capture**, so nobody re-derives it: on the deployed
gateway, mid-session, log **every `bars` frame with its receive instant and its
symbol LIST** — not a count. Report the distinct frames carrying ≥1 of the eleven
per minute over **≥60 regular-session minutes**, the first-to-last **receive**
spread of the eleven per minute, and **per-symbol IEX presence for the eleven**.
Take it at the **open, midday and close**, because frames a minute runs 6.8 → 16.1
across them. `LIVE-REHEARSAL.md` is where the sitting is recorded.

**Why the design did not wait for it.** §7.4 (**n=445 minutes**, all 518 symbols)
bounds the intra-minute first-to-last spread at **p50 243 ms, p95 511 ms, p99 616,
max 770** — and the eleven are a **subset**, so their spread is bounded above by
it. Against a **900 ms** decay that means all eleven discs are lit together for
~650 ms **however many frames carried them**, so the frame count cannot change the
treatment. **The gap is a record to complete, not a decision to take.**

**2. Per-symbol IEX coverage for the eleven is unmeasured and the SIP answer does
not transfer.** On the stored consolidated tape there is effectively no quiet
group — **387 of 390 minutes carry all eleven** on 2026-09-11, every ETF 390/390
except `XLRE` at 387. But **the live path is IEX**: §7.6 measured **321 of 518
symbols p50 per minute, 65.1% median per-symbol against 82.8% stored**, and the
local store is **100% `sip`** (48,449,712 rows, zero `iex`) because the live writer
runs on the deployed backend. So a quiet sector is **plausible and unmeasured**,
which is why the trailing-quiet-group state is kept rather than drawn as rare.

**3. And the hole worth an entry of its own: a replay cannot answer a question
about frame grain, structurally.** `replay-bar-source.ts` groups stored rows by
instant and emits **one slice per minute across every symbol**, so a replay returns
_one frame, 0 ms spread_ **100% of the time, at any speed, whatever the market
did** — confirmed at 40 frames at 60× and 4 at 1×, eleven of eleven symbols and
0 ms in every one. And every observation in a replayed frame **shares one
`startsAt`**, the presented instant, so **minute identity is not recoverable from a
replayed frame** and a split minute cannot be expressed at all. The comment that
claimed otherwise was corrected on 2026-09-27; **the entry this owes is the general
form — what a replay certifies is the wiring and never the loop**, which is the
same lesson as the quiet-system rehearsal already in `CLAUDE.md` and has now cost a
second measurement.
