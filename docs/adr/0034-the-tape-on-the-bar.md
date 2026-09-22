# 0034 — The tape on the bar: a per-bar `feed` column, and the decision it reverses

**Status:** Accepted
**Date:** 2026-09-22
**Story:** [3.7 The Tape on the Bar](../../planning/epic-03-live-market-data/story-07-the-tape-on-the-bar/STORY.md), Task 3.7.1

## Context

`market_bars` carries no column saying which tape a bar came from. Provenance
lives one row per `(security, timeframe)` in `bar_coverage`, which holds a
single `provider`/`feed` for the whole window — the shape
`0007_bar_coverage_provenance.sql` chose on 2026-09-09 after the cheaper
alternative was measured false, and the shape `0004_market_bars.sql` decided
**against** a per-bar `feed` column with a named reversal trigger:

> The trigger for a per-bar feed column is a SECOND FEED writing into this
> table, and it is not hypothetical: this story's history is `sip` while
> Epic 3's live stream is `iex`. The day Epic 3 writes a bar here, a series can
> no longer state one feed for its whole range, and the ledger stops being able
> to answer honestly.

Story 3.8 writes that bar. So the trigger has fired, and this ADR is the
decision 0004 said would be needed when it did — written before the migration
exists, because an applied migration is immutable and the argument has to live
somewhere that can be read.

`PROVIDER.md` §2.3's standing objection is arithmetic: four provenance fields on
ten million rows a year is ten million copies of two constants. What this story
needs is narrower — **one field, which of two tapes** — and the objection was
re-measured for that field rather than cited.

## The three candidates, measured against the real table

Taken on 2026-09-22 against the local store — **48,797,343 rows, 5,081 MB of
heap, 9,097 MB in total, PostgreSQL 18.6** — inside a transaction that ended in
`ROLLBACK`, with `\timing` on, on an Apple M3 with 16 GiB. Every figure is
quoted verbatim from the run.

### 1. A per-bar `feed text not null default 'sip'`, with the vocabulary check — **chosen**

```text
alter table market_bars add column feed text not null default 'sip';
ALTER TABLE
Time: 39.290 ms
alter table market_bars add constraint market_bars_feed_check
    check (feed in ('iex', 'sip', 'synthetic', 'replay')) not valid;
ALTER TABLE
Time: 2.968 ms
alter table market_bars validate constraint market_bars_feed_check;
ALTER TABLE
Time: 6180.846 ms (00:06.181)
```

**The column and the `NOT VALID` check are catalogue writes** — 42 ms between
them on 48.8 million rows, no row touched. PostgreSQL stores a constant default
in the catalogue and materialises it on read, so every existing row answers
`sip` without a rewrite. **Validation is a full scan**: 6.2 s here, from a
warm operating-system cache (`shared_buffers` is 128 MB, so the 5 GB heap was
the kernel's to serve).

**On the deployed tier that scan does not fit, and the figure is
`HOSTING.md`'s own**: Burstable B1ms is _1 vCore, 2 GiB memory, 640 maximum
IOPS, 10 MiB/sec maximum I/O bandwidth_. Reading 5,081 MB at 10 MiB/s is
**~508 s** before a single CPU cycle, against `deploy.yml`'s
`timeout 120 pnpm migrate`. So the check is added `NOT VALID` **and is never
validated inside a deploy**. That costs nothing: `NOT VALID` enforces every
new row, and every existing row's value is the default, which is in the
vocabulary by construction — validation would confirm what the catalogue
already guarantees.

The read path the story's criterion 2 needs — sources in contribution order
with bar counts — is a `group by feed` over the window:

```text
one session, 390 bars:      Index Scan … Execution Time: 0.478 ms
25 sessions, 10,140 bars:   Bitmap Heap Scan … Execution Time: 9.964 ms
```

**The bytes**: a fresh row carrying `iex` is **100 bytes** against **96**
without the column (temporary tables of the same columns, `pg_column_size`),
so **+4 bytes a row**, on rows written after the migration only. Against
`BARS.md` §8.3's 195 B/row all-in, that is +2%; §8.4's ~2.6 years of headroom
at 518 securities becomes **~2.5**. Existing rows cost nothing.

### 2. A nullable per-bar column, `null` meaning _see the ledger_ — rejected

```text
alter table market_bars add column feed text;
ALTER TABLE
Time: 0.101 ms
```

Free, and rejected for the reason the story's open decision names: a `null`
that means `sip` today is a `null` that means _whatever the ledger said_ for
ever, and **every reader carries the rule**. The story's first acceptance
criterion is that a bar's tape is readable **without consulting a constant**;
a nullable column fails it by design. Candidate 1's fast default gives the
same zero-cost backfill without the rule.

### 3. A second ledger grain — one `bar_coverage` row per contiguous stretch from one tape — rejected

```text
select provider, feed, covered_start, covered_end, bar_count from bar_coverage
    where security_id = … and timeframe = '1m';
Index Scan using bar_coverage_unique_series … Execution Time: 0.439 ms
```

The read is trivial and always was; the cost is elsewhere. It needs the
uniqueness rule `bar_coverage_unique_series` relaxed, a write path that
**splits and maintains** windows and their counts as bars arrive, and a
read path that trusts a maintained count rather than counting. Candidate 1's
`group by` derives the same answer **from the bars themselves** in under
10 ms at the cap — which is `PROVENANCE.md`'s rule, _a claim about data
requires data_, applied to the claim's source. The ledger keeps its one row
and its window; it stops being the only place the tape is written.

## Decision

- **`market_bars.feed text not null default 'sip'`**, with
  `market_bars_feed_check` over `MARKET_FEEDS` added **`NOT VALID`** and left
  so. The migration is metadata-only at deploy time.
- **Open decision 1 — backfill — is settled by the shape.** The constant
  default _is_ the backfill: every existing row states `sip` without a rewrite
  and without any reader carrying a rule. It is a dated historical claim —
  every bar stored before this migration came from the consolidated tape —
  which is exactly what an applied migration may contain.
- **The ledger row keeps its window and count**; what replaces its refusal of
  a second source is Task 3.7.4's, and the read path that produces two
  sources through `mergeSeriesProvenance` is Task 3.7.5's.
- **`PROVIDER.md` §2.3 stands for what it measured** — four fields, per bar, on
  the wire and in the browser — and gains a dated amendment for the one field
  this reverses it for, in the store only.

## What this does NOT decide

- Whether `Bar` itself grows a field and reaches the wire — Task 3.7.3, and
  ADR 0033's constraint 4 (one per frame, never one per observation) is the
  precedent that argues it should not.

  > **Decided 2026-09-22 by Task 3.7.3: it does not.** `readBars` answers
  > `StoredBar { bar, feed }` — the tape **beside** the bar — so `Bar` and
  > every `WireObservation` are unchanged, and the replay source drops the
  > tape on the way to the engine, whose emission is labelled `replay`.
  > `TAPE.md` §6.

- What happens when a SIP bar and an IEX bar for the same minute meet — the
  unique key is unchanged, the conflict is Story 3.8's three shapes.
- Whether validation ever runs. If a writer that bypasses the type ever exists,
  `validate constraint` is a maintenance-window command with no deadline, and
  Task 3.7.6 records where that is written.

## Reversal trigger, as a condition

**The first per-bar field beyond the tape** — a per-bar provider, a per-bar
retrieval instant, anything that is not one token from a four-word
vocabulary materialised from a default. This column was affordable because it
is 4 bytes on new rows and 0 on old ones; a second field re-opens §2.3's
arithmetic rather than inheriting this ADR's answer.

And narrower: **the first migration on `market_bars` that is not a catalogue
write** — a rewrite, a validated constraint, an index built without
`concurrently` — must be measured against 10 MiB/s and the 120 s ceiling
before it is written, because on this tier a full scan of this table is
minutes, not seconds.
