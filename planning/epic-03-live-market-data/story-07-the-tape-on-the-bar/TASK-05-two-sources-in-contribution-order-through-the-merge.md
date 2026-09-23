# Task 3.7.5 — A stored window spanning two tapes produces two sources, through the merge

**Status:** **Complete — 2026-09-23.** A stored window's sources are derived from its rows — one `BarSource` per contiguous run of tape, in the order the bars sit, each with the ledger row's provider, the run's count and its oldest write — and joined through `mergeSeriesProvenance`. `BarCoverage` lost its tape field and the ledger's `feed` column is read by nothing, held by a new `pnpm invariants` entry. Four database tests, four unit tests and one wire test; three breaks red and restored; the route A/B'd against main on one machine and the grouping is not measurable. `pnpm test:database` 188/188, `pnpm verify` green.
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

---

## What was done — 2026-09-23

### 1. The sources come from the rows, one per run, through the merge

`readSeries` now selects `market_bars.feed` beside the bar columns and
`recorded_at`, and `toStoredSeries` walks the rows once — they arrive
ascending by `observed_at` — starting a new **stretch** each time the tape
changes. Each stretch is one `toSeriesProvenance` with the ledger row's
`provider`, the run's tape, its bar count and the **oldest** `recorded_at`
in it; two or more stretches are joined by `mergeSeriesProvenance`, never by
a hand-written array. One tape is exactly what it was before. `TAPE.md` §8
carries the table of where each field comes from.

**Two decisions the task file left open, taken and recorded.**

- **Derived from the rows already loaded, not by a second query.** 3.7.1
  measured the `group by feed` aggregate and 3.7.3's amendment said the rows
  need not carry `feed`; both are reversed here for one reason: the read's
  assembly stays a pure function of one query's rows, so every store the fast
  suite builds through it (the route's, the stitch's) cannot disagree with
  itself, and the wire test for two sources is the real read path with one
  row's tape changed. The rows are loaded for the bars regardless; the tape
  is one column beside them. The aggregate's figures stand as what a second
  query would have cost; the route was measured instead (§4).
- **Contribution order is "one source per run, in the order the bars sit".**
  Until Story 3.8 lifts the overlap refusal a tape is exactly one run, so
  this coincides with "first instant per tape"; the day it does not, the walk
  answers `sip, iex, sip`, which a source note can print without a rule. 3.8
  inherits the definition and a unit test that asserts it.

### 2. The ledger's tape column has no reader, and the type says so

`BarCoverage.source` (`{ provider, feed }`) became `BarCoverage.provider`.
The compiler enumerated the seven test files whose ledger fixtures had to
follow; `readCoverageRow` and the backfill's coverage map no longer select
`bar_coverage.feed`; Task 3.7.4's assertion that the column holds the
opening tape now reads it with raw SQL. `SOURCE_OF_NOTHING` is reached by an
empty answer and nothing else, and its comment says so: a quiet window on a
fixture store now reports the constant for zero bars where it used to report
the ledger's pair, because the ledger no longer carries a tape and a claim
about zero bars is not provenance (ADR 0029). That is the one served answer
this task changed for a one-tape store, and it is written down.

### 3. The invariant, and what it caught on its first run

`pnpm invariants` gained `stored-sources-only-through-the-merge`, which
reads `market-bars.ts` without its comments and fails on a `sources:`
literal, on `mergeSeriesProvenance(` no longer being called, and on any
select of `bar_coverage.feed`. **It went red the first time it ran**: two
selects of the ledger's tape were still in the file — `readCoverageRow`'s
and the backfill's coverage map's — after the domain object had lost the
field, because a select of a column the mapper ignores compiles cleanly.
That is exactly the reader the invariant exists to find, found by the
invariant rather than by review. Three breaks: `the-sources-are-written-by-hand`
and `the-ledgers-tape-is-read-again` prove the invariant's two halves;
`the-second-tape-is-folded-into-the-first` disables the run split and
reddens the database test that reads two sources.

### 4. The route, measured as an A/B rather than against a figure

Story 2.9's method — n = 15 per cell, miss and hit, medians and p95 — on
`GET /market-data/bars` through the dev pair against the populated store,
with main's `market-bars.ts` overlaid on the running pair first and this
task's second, minutes apart on the same loaded machine. Medians agree to
within a millisecond or two at every window size (7.6 vs 8.3, 17.9 vs 14.4,
50.3 vs 50.3, 52.2 vs 52.4 ms) and the p95s move both ways. **The walk is
not measurable** against the query and the serialisation beside it. Both
arms are slower than 2.9's recorded figures by the same factor — the dev
watcher on a laptop at load 8–10 against a built server on a quiet one —
which is why the A/B is the figure and not the comparison. The table is in
`TAPE.md` §8.

### 5. The tests

- **Unit (`market-bars.test.ts`)**: SIP then IEX → two sources in order with
  counts, provider and per-run `retrievedAt`; the reverse, and a tape that
  occurs twice → three runs; the oldest write per stretch, not the window's;
  the empty answer names the constant whatever the ledger says.
- **Database (`market-bars.database.test.ts`)**: a SIP session followed by an
  IEX session, written through the shipped writer as 3.7.4's accepted case,
  reads back as two sources in that order with two different `retrievedAt`s;
  the reverse reversed; a one-tape window as one source; only the asked
  window's stretches.
- **Wire (`routes/market-data.test.ts`)**: three rows, two tapes, through
  the real `toStoredSeries` and `app.inject()` — two sources in order in the
  body, the serialiser's `satisfies` guard being what keeps the field there.
- **The refused-adjustment case** is the merge's own unit test in
  `packages/shared`; it cannot be produced from a store where every row is
  `raw`, as 3.7.4's amendment said, and the invariant is what proves the
  merge is the route.

### 6. Gates

`tsc -b` clean; `pnpm test:database` **188/188**; `pnpm test` 926 backend;
three breaks red and restored; `pnpm invariants` 21 hold; `pnpm verify` green
after one lint finding (`prefer-optional-chain` on the run split, fixed and
the break retargeted); `pnpm links` 0 broken.

## For a stakeholder — a status report, 2026-09-23

**Where the product is.** Every stored price carries the tape it came from
and the store will hold two tapes for one security side by side. This task
makes the product **read that back**: when a chart is served, its
provenance now says, from the stored rows themselves, "the first 1,170 bars
are the consolidated tape and the last 780 are IEX" — one entry per stretch,
in the order they sit, each with its own retrieval time.

**What was built.** The read path stopped taking the answer to "where did
this chart come from?" from a one-line summary and started taking it from
the prices. It walks the rows it already loads, notices each time the tape
changes, and produces one source entry per stretch. The entries are joined
by the one function in the product that is allowed to join sources, because
that function refuses a join that would put two price scales on one chart.

**Why these decisions.**

- **Read the rows, not a summary.** A summary line that names one tape cannot
  describe a window that holds two, and a summary that tries to becomes a
  second source of truth. The rows are already in hand for the chart, so
  reading the tape off them costs nothing and cannot disagree with the
  chart it sits beside. We measured it against the previous code on the
  same machine: no difference at any window size.
- **The summary's tape column now has no reader at all**, and an automated
  check fails if anyone adds one. That check found two leftover readers on
  its first run, which is the kind of thing a review misses and a check does
  not.
- **"In the order they sit" is the definition of contribution order**, and
  it is written down for the next story, which will decide what happens
  when two tapes claim the same minute.

**What we checked rather than trusted.** Four tests against a real database
build a two-tape window through the shipped writer and read it back; a wire
test proves both entries reach the browser's response; three deliberate
breaks — folding the second tape into the first, writing the list by hand,
reading the summary's tape again — each turned the right check red and were
reverted automatically.

**What a user can see today: nothing.** The sentence this produces already
exists on the source note and has never yet described a real series,
because no deployed store holds two tapes. The next task rehearses the
deploy against a populated store and writes down what nothing checks; the
story after that stores the live session — the first store with two tapes
in it — and Story 3.9 puts this sentence in front of a reader.
