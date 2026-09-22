# Task 3.7.7 — The sweep, the hand-offs and the close

**Status:** Not started
**Story:** [3.7 The Tape on the Bar](STORY.md)
**Depends on:** 3.7.6

## Objective

Close the story: walk the six criteria against the tree, sweep upward for the
sentences this story falsified, and push its constraints **sideways** into the
stories that write through what it built.

## What the user can see when this lands

**Nothing new.** This story's rehearsal is not a live-session one —
`LIVE-REHEARSAL.md` exempts 3.7 as backend-only by its own scope — and that
exemption should be re-read against what shipped, the way Story 3.5's was.

## The upward sweep, which this story owes more than most

This story reverses a recorded decision and falsifies sentences in at least
four documents that are **live claims** today:

- **`CLAUDE.md` invariant 6 and _What is settled_**: _the ledger ... is the
  sentence invariant 6 exists for, and **no server this product runs can
  produce it** — all sixteen recorded bar-series bodies carry `sip`, so the
  state is reached through `twoFeedStitchView()`_. After 3.7.5 a server can
  produce it from a store that holds two tapes. Amend, dated.
- **`0004_market_bars.sql`'s decision and `PROVIDER.md` §2.3**: applied
  migrations are immutable and the ADR is the amendment, but `PROVIDER.md` is
  live and says per-bar provenance is not affordable. It gets a dated
  amendment beside the figure that made it affordable for one field.
- **`BARS.md` §8.3–8.4**: bytes a row and years of headroom move for rows
  written after the column. Re-take the row size on a real row and amend the
  headroom table.
- **`LIVE-DATA.md`** line ~2670 (_Story 3.7 is the tape column ... rather than
  the trade tape_) stands; check §11 and the two-feed ledger decision for
  anything the read path now answers differently.
- **`PROVENANCE.md`** §on the two-feed sentence, and the `e2e/README.md` and
  `docs/GAPS.md` entries that say the two-tape state is unreachable on any
  server.
- **`MARKET-DATA-API.md` §_What the ledger's one row can and cannot say_ and
  Story 3.8's scope bullet** — both said `recordSeries` refuses a series
  whose source disagrees with the ledger row. **Amended 2026-09-22 by Task
  3.7.4's sweep, the same day**, with a dated note at each: the refusal is
  now three named reasons (`stitched`, `provider`, `overlap`) and a second
  tape extends a window. Check at the close that nothing else repeats the
  old sentence (`grep -rn "source disagrees"`).

## The hand-offs, enumerated rather than remembered

Grep this story's documents for every `Story N.M`, `Epic N` and `Owner:` line,
check each recipient's own file, and **record the count that were missing**.
Known candidates:

- **Story 3.8** — what replaced the refusal (3.7.4), the conflict rule as it
  stands and that it is 3.8's to change, the write path's shape for a socket
  bar, and the three overnight shapes now that both tapes can coexist.
  **Since 3.7.3, in words 3.8 can act on**: `writeBatch` takes the tape as
  its fifth argument from the series' provenance; `MarketBarsTable.feed`'s
  update type is `never`, so whichever overnight shape moves a tape on a
  correction changes that type **on purpose**; the overlap refusal 3.7.4
  leaves standing is the one 3.8 lifts; and `BAR_COLUMNS` sizes the
  multi-row chunk, so a column the socket writer adds goes in that list or
  the chunk-boundary test goes red (it did, in 3.7.3). **Since 3.7.4, in the
  same words**: what 3.8 lifts is `ForeignSourceError`'s `overlap` reason
  and nothing else — `stitched` and `provider` stand; `reason` is a
  discriminant its tests can assert; lifting the overlap is two decisions,
  the per-row conflict rule (`TAPE.md` §6) and what _contribution order_
  means once a tape can occur in two runs (`TAPE.md` §7, 3.7.5's premise);
  and a socket bar is written through `recordSeries` with `alpaca`/`iex`
  provenance, which the store accepts as a contiguous extension of the SIP
  window today — the test _accepts a second tape extending a held window
  contiguously_ is the shape 3.8's write path lands on
- **Story 3.9** — the ledger comes out of the store now; `twoFeedStitchView()`
  has a real sibling; the read-path cost of the grouping. **Since 3.7.4**:
  every stretch of a stored window carries the ledger row's one `provider`,
  so the source note's two-feed sentence names two tapes and one supplier —
  which is the plan's shape, and the day it is not (`fixture` stitched onto
  `alpaca`) the write is refused, not mislabelled
- **Story 3.10** — nothing this story changes about a degraded state, said
  rather than assumed
- **Story 3.11** — the deferred validation, if any, as a thing the close checks
  was run; the bytes-a-row figure for the bill
- **Epic 13** — replay reads bars that now carry a tape, and _what was knowable
  at 11:07_ is the IEX bar rather than the SIP correction; the `status`
  predicate rule still applies. **Since 3.7.3**: the tape reaches the replay
  source on `StoredBar.feed` and is **dropped on purpose** in
  `replay-bar-source.ts`, with a comment saying the engine's emission is
  labelled `replay` — that line is where Epic 13 picks it up if _what was
  knowable_ needs the tape rather than the numbers
- **Epic 14** — the row size moved, and the index nobody reads is still there

## Work

- Six criteria, six verdicts, each with a test name, a break entry, a
  measurement or an honest _not met_
- The upward sweep above, live claims amended and historical records left
  standing
- The hand-off enumeration, with the missing count recorded including if it is
  zero
- `CLAUDE.md`'s _Current state_ and _Where the record lives_ (`TAPE.md` joins
  the table), and the trap under _Data layer_ that this story's migration
  taught
- `LIVE-REHEARSAL.md`'s exemption for 3.7 re-read against what shipped

## Done when

1. Six criteria, six verdicts, none of them _probably_
2. The hand-off count is recorded
3. `CLAUDE.md` describes the tree as it now is, and every falsified sentence
   above is amended with a date
4. `pnpm verify` passes, `pnpm test:database` passes, and `pnpm links` resolves
   every reference added
