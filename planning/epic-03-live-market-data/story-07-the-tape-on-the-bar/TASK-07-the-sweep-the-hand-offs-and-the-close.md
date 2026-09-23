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

> **AMENDED 2026-09-23 by Task 3.7.6 — the exemption still holds, and there
> is now a precedent for the form if it ever does not.** Story 3.5's
> exemption fell because two of its tasks were **repairs** that changed a
> surface without appearing in a scope; this story shipped no repair to a
> surface — the only user-visible consequence of anything in it is a served
> answer's `provenance.sources`, which no shipped screen reads until Story
> 3.9. Re-read it against that test rather than against the scope line, and
> if it falls, `LIVE-REHEARSAL.md`'s 2026-09-22 rows are the shape: a
> headless watch recorded as a headless watch, with four notes saying what
> it cannot claim.

## The upward sweep, which this story owes more than most

This story reverses a recorded decision and falsifies sentences in at least
four documents that are **live claims** today:

- **`CLAUDE.md` invariant 6 and _What is settled_**: _the ledger ... is the
  sentence invariant 6 exists for, and **no server this product runs can
  produce it** — all sixteen recorded bar-series bodies carry `sip`, so the
  state is reached through `twoFeedStitchView()`_. After 3.7.5 a server can
  produce it from a store that holds two tapes. Amend, dated.
  **Swept 2026-09-23 by Task 3.7.5's sweep, the same day the read path
  landed**: `CLAUDE.md`'s bullet, `docs/GAPS.md`'s entry and Story 3.9's own
  description all carry a dated amendment — the server produces the list from
  a two-tape store now; no deployed store holds one until 3.8. At the close,
  `grep -rn "no server this product runs"` should find only struck-through or
  amended sites.
- **`0004_market_bars.sql`'s decision and `PROVIDER.md` §2.3**: applied
  migrations are immutable and the ADR is the amendment, but `PROVIDER.md` is
  live and says per-bar provenance is not affordable. It gets a dated
  amendment beside the figure that made it affordable for one field.
- **`BARS.md` §8.3–8.4**: bytes a row and years of headroom move for rows
  written after the column. Re-take the row size on a real row and amend the
  headroom table. **Still owed** — 3.7.1 measured 100 B against 96 B on a
  fresh row and nothing has amended that table.
- **`CLAUDE.md`'s _Data layer_ trap** — the bullet this story wrote said a
  migration on `market_bars` must be metadata-only at deploy time, which is
  true and, after Task 3.7.6, incomplete in a way that misleads: a reader
  concludes _metadata-only is safe_, and an `ALTER TABLE` takes an
  `ACCESS EXCLUSIVE` lock whatever it costs. **Swept 2026-09-23 by Task
  3.7.6's sweep, the same day the rehearsal produced the figures**: the
  bullet now carries the lock half, the 18.16 s / 16.16 s rehearsal and the
  0.09 s baseline. Nothing is owed here at the close beyond checking it
  still reads as one thought.
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
  **Since 3.7.5**: contribution order is defined — one source per contiguous
  run, in the order the bars sit — and `market-bars.test.ts` asserts the run
  reading (`iex, sip, iex` for a tape that occurs twice), so a shape of 3.8's
  that wants a different reading changes that test on purpose; the ledger's
  `feed` column is read by nothing and held so by an invariant, so 3.8's
  write path may write it and must not read it.
  **Since 3.7.6, and this is the one that changes a decision rather than
  informing it — written into its `STORY.md` the same day**: a migration on
  `market_bars` queues behind any open transaction on that table and takes
  every reader down with it (18.16 s and 16.16 s measured, `docs/GAPS.md`).
  Today the only writer is a nightly backfill in two cron windows; **3.8
  makes the backend write to that table throughout the session**, so how
  often it opens a transaction and how long it holds one stops being only a
  throughput question and becomes the bound on how long a deploy can stall
  the site. Decide the write's granularity with that in mind, and record the
  transaction's measured duration the way 3.7.6 recorded the backfill's
  (390 rows, 81–137 ms).
- **Story 3.9** — the ledger comes out of the store now; `twoFeedStitchView()`
  has a real sibling; the read-path cost of the grouping. **Since 3.7.4**:
  every stretch of a stored window carries the ledger row's one `provider`,
  so the source note's two-feed sentence names two tapes and one supplier —
  which is the plan's shape, and the day it is not (`fixture` stitched onto
  `alpaca`) the write is refused, not mislabelled
  **Since 3.7.5, written into its `STORY.md` the same day**: the list is
  produced from stored rows and proved on the wire; the grouping's cost is
  not measurable (`TAPE.md` §8's A/B); each stretch carries its **own**
  `retrievedAt`, and the note's `formatRetrieval` already renders two dates
  as a range — 3.9 reads that against a real body rather than assuming it;
  and the real recorded body that retires `twoFeedStitchView()` can be taken
  from a local store the moment 3.8 lands.
- **Story 3.10** — nothing this story changes about a degraded state, said
  rather than assumed
- **Story 3.11** — ~~the deferred validation, if any, as a thing the close
  checks was run~~ — **settled: there is none and there never will be**
  (ADR 0034; `market_bars_feed_check` stays `NOT VALID`, asserted by
  `pg_constraint.convalidated` and `pnpm break the-tape-check-gets-validated`).
  What it inherits instead, **since 3.7.6**: the bytes-a-row figure for the
  bill, still owed by the `BARS.md` item above; and `docs/GAPS.md`'s lock
  entry, whose owner is a condition the epic close is well placed to
  evaluate — _the first migration on `market_bars` that is not two catalogue
  writes, or the first deploy that reports exit 124 with `wait_event:
relation`_
- **Epic 13** — replay reads bars that now carry a tape, and _what was knowable
  at 11:07_ is the IEX bar rather than the SIP correction; the `status`
  predicate rule still applies. **Since 3.7.3**: the tape reaches the replay
  source on `StoredBar.feed` and is **dropped on purpose** in
  `replay-bar-source.ts`, with a comment saying the engine's emission is
  labelled `replay` — that line is where Epic 13 picks it up if _what was
  knowable_ needs the tape rather than the numbers
- **Epic 14** — the row size moved, and the index nobody reads is still there.
  **Since 3.7.6**: there is now a measured performance property of the
  **deploy** rather than of a page — an ordinary chart read behind a queued
  migration cost 16.16 s against a 0.09 s baseline, which is the largest
  single number anywhere in this product's read path and is invisible to
  every instrument Epic 14 owns, because it is a fact about a lock queue
  rather than about a query

## Work

- Six criteria, six verdicts, each with a test name, a break entry, a
  measurement or an honest _not met_

  > **AMENDED 2026-09-23 by Task 3.7.6 — four of the six already have their
  > evidence, and the close should cite rather than re-derive.** Criterion 3
  > (schema and migration agree) is `pnpm test:database`'s column
  > description and `TS1360`; criterion 4 (applies to a store with rows in
  > it, timed against the real table) is the **deployed** migrate step at
  > **1.251 s** inside `timeout 120`, read from the runner's log for
  > `b9772d1`; criterion 5 (no applied migration edited, the migrate step
  > still additive-only) is the checksum test plus the `b9772d1` rehearsal
  > that stored 9,750 bars through the old writer on the new column; and
  > criterion 6 is the gate list. **Criteria 1 and 2 are the story's own** —
  > 3.7.3's per-bar tape and 3.7.5's two sources through the merge — and
  > both are database tests with breaks. So the walk is an assembly, and
  > what it must not do is re-take a figure that has a dated home.

- The upward sweep above, live claims amended and historical records left
  standing
- The hand-off enumeration, with the missing count recorded including if it is
  zero

  > **AMENDED 2026-09-23 by Task 3.7.6 — `docs/GAPS.md` is already written
  > and the close must not write it twice.** Three entries landed with the
  > rehearsal: the lock wait; `bar_coverage.feed` written, described and
  > read by nothing with no contract trigger; and this story's schema
  > evidence living in `pnpm test:database`, a required CI job outside
  > `pnpm verify`. Two further items that earlier tasks predicted for the
  > list **closed instead** and should not reappear: the invariant's
  > one-file scope became an assertion of the ledger's seam
  > (`pnpm break a-second-module-queries-the-ledger`), and
  > `SOURCE_OF_NOTHING` was read against `source-note.ts` and cannot reach a
  > reader, because ADR 0029 is applied per clause. The close's job here is
  > to check the three for accuracy and to add only what the close itself
  > finds.

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
