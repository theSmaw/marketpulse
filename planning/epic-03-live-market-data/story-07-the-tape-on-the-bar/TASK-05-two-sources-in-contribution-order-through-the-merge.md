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
