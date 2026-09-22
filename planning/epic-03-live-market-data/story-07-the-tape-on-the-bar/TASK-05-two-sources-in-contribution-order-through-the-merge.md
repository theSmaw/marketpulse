# Task 3.7.5 — A stored window spanning two tapes produces two sources, through the merge

**Status:** Not started
**Story:** [3.7 The Tape on the Bar](STORY.md)
**Depends on:** 3.7.4

## Objective

Criterion 2: **a stored window spanning two tapes produces two `BarSource`
records, in contribution order, through `mergeSeriesProvenance` rather than
around it.** This is the column earning its keep, and it is the one part of
the story a later reader can see the shape of: Story 3.9's source-note
sentence — _each stretch, in contribution order, with its bar count_ — is
`describeSeriesFeeds` over exactly this list, and today the only server that
can produce it is `twoFeedStitchView()`, a recorded body with one field
changed.

## What the user can see when this lands

**Nothing yet, and the sentence already exists.** `describeSeriesFeeds` ships
and has never described a real series. After this task a store holding two
tapes produces the list it needs; the first time a user reads it is Story
3.9, and the first store that holds two tapes is Story 3.8's.

## Work

- **`readSeries` derives the sources from the bars** — per tape in the window:
  its first `observed_at` (contribution order), its bar count, and its
  `retrievedAt` from that stretch's `recorded_at` (per batch, the arrangement
  `0007` chose over `updated_at`). One `BarSource` per stretch, in order.
- **Through `mergeSeriesProvenance`**, never by hand-building a two-element
  `sources` array: that function is the only route to a multi-source record,
  and its adjustment check fires whether or not anybody read the rule. One
  tape is `toSeriesProvenance`, as today.

  > **AMENDED 2026-09-22 by Task 3.7.3 — what the read path already carries,
  > and what it still cannot.** `readBars` answers `StoredBar { bar, feed }`
  > since 3.7.3, so the per-row tape is already read back and the test
  > suite's instrument for _which tape is this bar_ exists; what this task
  > adds is the **aggregate** over `readSeries`'s window (`DatedBarRow` does
  > not carry `feed` and need not — the stretches come from the `group by`,
  > not from the rows). **Each stretch's `provider` comes from the ledger
  > row**, which Task 3.7.4 keeps as a read for exactly this reason: the row
  > holds the tape only, ADR 0034 forbids a per-bar provider, and a mapping
  > from feed to provider would be the constant criterion 1 forbids.
  > **`min(recorded_at)` per stretch is safe under 3.7.3's conflict rule**: a
  > correction moves a row's `recorded_at` and leaves its tape, so the row
  > stays in its stretch and the minimum is unmoved. And `SOURCE_OF_NOTHING`'s
  > comment names this task as the one after which only an **empty** answer
  > reaches it — once the sources come from the bars, a window with rows and
  > no ledger row is `MissingCoverageError` before the constant is consulted;
  > confirm that and reword the comment to say so.

- **The query, measured.** 3.7.1 costed a `group by feed` over a window; take
  the real figure here against the cap-sized window (9,750 bars) and the
  default (390), and say what the read path's p95 became against Story 2.9's
  recorded figures.

  > **AMENDED 2026-09-22 by Task 3.7.1 — the figures exist and the shape of
  > the query is settled.** `group by feed` with `min(observed_at)` for
  > contribution order and `count(*)` for the bar count ran in **0.478 ms** for
  > a session (390 bars, index scan) and **9.964 ms** for 10,140 bars (bitmap
  > heap scan, 143 heap blocks), on the index the table already has. What this
  > task re-takes is the **shipped** query through the repository — the
  > `retrievedAt` per stretch (`min(recorded_at)` in the same aggregate) is the
  > one thing 3.7.1's query carried but did not assert — and the p95 of
  > `GET /market-data/bars` against Story 2.9's figures, not the raw SQL again.

- **`market-bars.database.test.ts`**: a window with a SIP stretch followed by
  an IEX stretch reads back as two sources in that order with the right
  counts; the reverse order reads back reversed; a window with one tape reads
  back as one source, unchanged from today; a window whose two stretches
  disagree on adjustment is **refused** by the merge, which is the assertion
  that proves the merge was used.

  > **AMENDED 2026-09-22 by Task 3.7.4 — how the two-tape window is built,
  > what it cannot contain yet, and where the refused case has to live.**
  >
  > **Build it through the shipped writer, not by hand.** Since 3.7.4
  > `recordSeries` accepts a second tape extending a held window
  > contiguously, so a SIP-then-IEX window is two `recordSeries` calls with
  > `seriesFor(symbol, session, { source: { provider: "alpaca", feed: "iex" } })`
  > on the second — the test suite already does exactly that in _accepts a
  > second tape extending a held window contiguously_. The reverse order is
  > the same two calls the other way round. No raw `insertBar` is needed for
  > the happy paths, which means the test proves the read against rows the
  > product can actually write.
  >
  > **Stretches never interleave until Story 3.8 lifts the overlap refusal.**
  > A second tape can only extend the window at an edge, so every tape's
  > bars form one contiguous run and `min(observed_at)` per tape is a total
  > order. State that as the premise the query rests on: the day 3.8 lets an
  > IEX afternoon be corrected by SIP bar-by-bar, a tape can occur in two
  > runs, and _contribution order_ needs a definition (first instant, or one
  > source per run). Write the premise into the query's comment and hand the
  > question to 3.8 (Task 3.7.7's list).
  >
  > **The refused-adjustment case cannot come from the store.** Every stored
  > row is `raw` (`STORED_BAR_ADJUSTMENT`) and the adjustment is attached
  > on the read side, so two stretches read from `market_bars` can never
  > disagree on it. The assertion that proves the merge was used is
  > therefore a **unit test** on the read-side assembly with two hand-built
  > `BarSource`s that disagree — the merge refuses — plus the database test
  > that a stored two-tape window produces a `sources` array of length two,
  > which no hand-built path in `market-bars.ts` may construct (grep it).
  >
  > **And narrow `BarCoverage.source` to the provider.** `readCoverage` still
  > answers `source.feed` — the opening tape, a withdrawn fact — and 3.7.4's
  > own test asserts it only as _the opening tape_. Once this task derives a
  > window's sources from the rows, `toStoredSeries` stops reading
  > `held.source.feed` and nothing in the domain should carry it: make
  > `BarCoverage.source` `{ provider }` (or a `provider` field), drop
  > `bar_coverage.feed` from `readCoverageRow`'s select, and leave the column
  > written by `extendCoverage` alone (required on insert, so the default
  > stays unreachable). That is what makes Task 3.7.6's invariant — _the
  > ledger's `feed` is read by nothing_ — a grep rather than a judgement.

- **Trace it to the wire**: `GET /market-data/bars` for such a window carries
  both sources in `provenance.sources`, asserted with `app.inject()` over a
  stubbed repository — the serialiser's `satisfies` guard is what stops a
  field vanishing here, and the test is what stops the list collapsing.
- `TAPE.md` §on reading: the query, the order rule, and what the wire says.

## Done when

1. Criterion 2 holds in `pnpm test:database`, including the refused
   adjustment case
2. The read path's cost with the grouping is measured against a real window
   and recorded beside Story 2.9's figures
3. `pnpm verify` passes; `pnpm test:database` passes
