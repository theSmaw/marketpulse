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

## The SIDEWAYS sweep, performed early — 2026-09-27, during Task 4.3.6 rather than at the close

**Done early on purpose.** `CLAUDE.md`'s rule is that a hand-off sweeps sideways
and **a story close does not reach it** — a close sweeps the documents the story
_wrote_, and a constraint one story measures for another lives in a document the
**owning** story does not own. The last time this was left to a close it was got
wrong **in the same document that warned about it**.

**Enumerated by grepping this story's documents for every `Story N.M` and `Owner:`
line**, then checking each against that story's own file. The count, which is the
part worth recording:

| referenced    | times | what that story's `STORY.md` already carried                                            | verdict     |
| ------------- | ----- | --------------------------------------------------------------------------------------- | ----------- |
| **Story 4.5** | 13    | the phrase _"two uses"_, once. **No `RankedList`, no 461, no comparator, no re-order.** | **missing** |
| **Story 4.6** | 3     | one line about the region being `Panel scrollable`. Nothing on the keyboard rule.       | **missing** |
| **Story 4.4** | 1     | **nothing at all**                                                                      | **missing** |
| Story 4.2     | 6     | complete — this story was handed by 4.2's own close                                     | fine        |

**Three of three were missing**, and two of them were about a measurement made
_for_ them: `Movers` and `Market breadth` both rose to **461 px for free** when
4.3.5 filled the sector region, so neither story moves anything when it lands —
which neither story knew.

**Written in, in words those stories can act on**, never a link back:

- **Story 4.4** — the free 461 at 1440/1024, the 103/121 at 768/390 which **will**
  grow the page, the rule that replaced Task 4.1.4's, and the warning that rows 2
  and 3 are tied so a taller breadth region **takes the whole grid with it**.
- **Story 4.5** — `RankedList`'s existence and its `"none"` bar slot; **why the bar
  is refused for movers** (one quantity versus four, not eleven versus ten) with an
  explicit instruction to re-argue rather than inherit; the free 461; the comparator
  and its **absent-key rule**; that `PERCENT_DISPLAY_DECIMALS` is shared so rounding
  elsewhere makes the drawn order contradict the drawn figures; the re-order
  treatment and the 243 ms measurement behind it, with the note that **at 518 the
  synchrony is worse rather than better**; and what CI cannot show.
- **Story 4.6** — owed, and deliberately deferred until Task 4.3.6 reports, because
  the rule it inherits (one tab stop, arrow keys within the list, a roving
  `tabIndex` keyed on the **symbol** never the index, activation resolved against
  **identity** never position) is being written by that task now. **This is the one
  outstanding sideways item and it must not be left to the close.**
