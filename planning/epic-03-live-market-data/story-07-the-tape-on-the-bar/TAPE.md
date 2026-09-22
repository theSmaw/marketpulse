# The tape on the bar — what the store claims about where a bar came from

**Opened 2026-09-22 by Task 3.7.1. Every task in Story 3.7 writes into this
file; it is the subject document `CLAUDE.md`'s _Where the record lives_ points
at for this question.**

## 0. If you read one section

`market_bars` will carry one column, `feed`, holding which of the vocabulary's
tapes a bar came from — `sip`, `iex`, `synthetic` or `replay` — defaulting to
`sip` because every bar stored before the column existed came from the
consolidated tape. The column is a **catalogue write** (39 ms on 48.8 million
rows, no row touched) and its vocabulary check is added **`NOT VALID` and
never validated inside a deploy**, because on the deployed tier a full scan of
this table is ~508 s at 10 MiB/s against a 120 s ceiling. The decision, the
two alternatives and their figures are
[ADR 0034](../../../docs/adr/0034-the-tape-on-the-bar.md).

**The ledger keeps its row.** `bar_coverage` still says what window we hold
and how many bars; it stops being the only place a tape is written, and what
replaces its refusal of a second source is Task 3.7.4's. Two tapes inside one
stored window become **two `BarSource` records, in contribution order, through
`mergeSeriesProvenance`** — Task 3.7.5's — which is the sentence Story 3.9
puts on the source note and the first thing a user reads that this column made
true.

## 1. The figures, taken 2026-09-22 (Task 3.7.1)

Against the local store inside a rolled-back transaction, `\timing` on,
PostgreSQL 18.6, Apple M3 / 16 GiB, `shared_buffers` 128 MB:

| Reading                                                | Populated store (48,797,343 rows) | `marketpulse_bare` (0 rows) |
| ------------------------------------------------------ | --------------------------------- | --------------------------- |
| `add column feed text not null default 'sip'`          | **39.290 ms**                     | 5.686 ms                    |
| `add constraint … check (feed in (…)) not valid`       | **2.968 ms**                      | 1.910 ms                    |
| `validate constraint` (a full scan)                    | **6,180.846 ms**                  | 0.113 ms                    |
| `add column feed text` (nullable, candidate 2)         | 0.101 ms                          | —                           |
| Two-tape read, `group by feed`, one session (390 bars) | **0.478 ms**                      | —                           |
| Two-tape read, 25 sessions (10,140 bars)               | **9.964 ms**                      | —                           |
| The ledger walk (candidate 3's read)                   | 0.439 ms                          | —                           |
| A fresh row with `feed = 'iex'` / without the column   | **100 B / 96 B** (+4)             | —                           |

Heap `5081 MB`, total `9097 MB`, `count(*)` itself **15.6 s** — which is the
cheapest possible reminder of what a full scan of this table costs even on a
laptop.

**The runner, end to end (Task 3.7.2, 2026-09-22)** — `pnpm migrate` through
Kysely, Node start-up included, `time` on the whole command:

| Store                       | `pnpm migrate` applying `0010` |
| --------------------------- | ------------------------------ |
| Populated (48,797,343 rows) | **0.478 s** total              |
| `marketpulse_bare` (0 rows) | **0.456 s** total              |

Against `deploy.yml`'s `timeout 120` that is a margin of ~250×, and the two
stores agree to within 22 ms — which is the whole point: the migration does
not read the table. What it left behind, read back from the catalogue:
`market_bars_feed_check | convalidated = f`, `column_default = 'sip'::text`.

## 2. The deploy's ceiling, and why the check is never validated there

`deploy.yml` runs `timeout 120 pnpm migrate` inside Kysely's single
transaction, before either half of the code rolls. `HOSTING.md` records the
tier: **B1ms — 1 vCore, 2 GiB, 640 IOPS, 10 MiB/s I/O bandwidth.** The
validation scan reads the whole heap; at 10 MiB/s that is **~508 s** before
the CPU does anything, and 2 GiB cannot hold a 5 GB heap in cache the way the
laptop did. So:

- the migration is the two catalogue writes and nothing else;
- the check is `NOT VALID`, which enforces every **new** row exactly as a
  validated check would;
- and validating it would prove nothing: every existing row's value is the
  default, and the default is in the vocabulary by construction.

**The trap this leaves for the next migration on this table** is in
`CLAUDE.md`: a rewrite, a validated constraint or a non-concurrent index on
`market_bars` is minutes on this tier, not seconds, and must be measured
against 10 MiB/s before it is written.

## 3. What the store claims, in whose words

- **A bar's `feed`** is the tape the bar was observed on, written by the
  series' own provenance at insert time (Task 3.7.3, shipped 2026-09-22) —
  never by a provider's name and never by a default reachable from shipped
  code. The database's default exists for the deploy window and for rows that
  predate the column, and `schema.ts` declaring the column required on insert
  is what keeps it out of reach otherwise (`0007`'s arrangement, repeated).
  **Read back beside the bar rather than on it**: `readBars` answers
  `StoredBar { bar, feed }`, because `Bar` is shared by the wire and the chart
  and a field on it reaches every `WireObservation` (§6).
- **The vocabulary is `MARKET_FEEDS` in `packages/shared`**, and
  `market_bars_feed_check` is its backstop; `market-bars.database.test.ts`
  parses the constraint back and asserts set equality (Task 3.7.2), asserts
  it is **unvalidated on purpose**, refuses a tape outside the list, and
  reads `sip` back for a writer that omits the column.
- **A window's sources** are derived from the bars — per tape, first
  `observed_at` for order, `count(*)` for the bar count, the stretch's
  `recorded_at` for `retrievedAt` — and joined through `mergeSeriesProvenance`
  (Task 3.7.5). The ledger's `feed` is not consulted for it; **each stretch's
  `provider` is the ledger row's**, because the row carries the tape and
  nothing else and a window has one provider (§7, Task 3.7.4).
- **The ledger row** claims the window, the count and the provider (§7). Its
  `feed` column is the tape the window was **opened** with and claims nothing
  else since Task 3.7.4.

## 4. What a green `pnpm test:database` certifies about this, and what it does not

- **It certifies** that the migration and `schema.ts` agree (both directions,
  and the compiler covers the third — a column on the interface the test does
  not describe is `TS1360`, which is how Task 3.7.2's first typecheck went
  red), that the check's vocabulary is the shared constant, that the check
  stays `NOT VALID`, that a tape outside the vocabulary is refused, that an
  insert omitting the column answers `sip`; **since 3.7.3**, that a series
  recorded with `sip` provenance reads back `sip` on every bar, one with
  `fixture`/`synthetic` provenance reads back `synthetic`, a hand-inserted
  `iex` row reads back `iex` beside its bar, the shipped backfill command
  driven by the fixture provider leaves `synthetic` and nothing else in the
  table (`backfill.database.test.ts`), and a re-store of the same instant from
  another tape leaves the row's tape in both branches (§6); **since 3.7.4**,
  that a second tape extending a held window contiguously is accepted and
  reads back as both tapes in order, that a second provider is refused and
  writes nothing, that a second tape **overlapping** stored bars is refused
  and leaves every row's numbers and tape as they were, and that a same-tape
  overlap is still the re-run and the correction (§7); and, as it lands,
  that a two-tape window produces two sources in order (3.7.5). Five breaks
  prove the load-bearing clauses: `pnpm break the-tape-check-gets-validated`,
  `pnpm break the-tape-default-lies-about-the-past`,
  `pnpm break the-writer-stamps-a-constant` (a literal `sip` in the writer
  reddens the `synthetic` read-back), `pnpm break
a-second-tape-overwrites-the-first` and `pnpm break
a-second-provider-is-relabelled`.
- **It does not certify** that the deployed migration finished inside 120 s —
  the figure above is a laptop's, and Task 3.7.6 owns the tier's; that the
  `NOT VALID` check was ever validated — it is not meant to be; or that the
  ledger's withdrawn columns are read by nothing, which is a grep until an
  invariant holds it (Task 3.7.6).
- **It is not in `pnpm verify`** and has to be run on purpose. Nothing in
  `verify` sees a database.

## 5. Open decision 1 — backfill — settled by the shape on 2026-09-22

**Not backfilled, and not nullable either.** The constant default is a
catalogue entry that every existing row answers with, so _everything before
this migration is SIP_ is a fact each row states for free, and no reader
carries a rule. The alternative was a rewrite of 48.8 million rows on a tier
with 10 MiB/s of bandwidth, for a value the default already gives.

**Settled without the owner in the room, and the reversal is one line.** If
the owner would rather the column be nullable with `null` meaning _see the
ledger_, Task 3.7.2's migration changes one clause and criterion 1's
_readable without consulting a constant_ has to be re-argued.

## 6. The writers — who writes, what each stamps, and the conflict rule as it stands (Task 3.7.3, 2026-09-22)

**One writer, three sources, one rule.** Every row `market_bars` gains goes
through `recordSeries` → `writeBatch`, and `writeBatch` takes the tape as a
parameter — `source.feed`, where `source` is `singleSourceOf(series)`, the
series' own `provenance.sources` — and stamps it on every bar in the chunk.
Nothing consults the provider's name, the ledger, or a constant, and
`MarketBarsTable.feed` is `ColumnType<MarketFeed, MarketFeed, never>`, so a
writer that omits the tape does not compile and the column's `'sip'` default
is unreachable from shipped code.

| Who writes                                   | Series provenance       | What each bar carries     |
| -------------------------------------------- | ----------------------- | ------------------------- |
| The nightly backfill (`backfill.ts`, Alpaca) | `alpaca` / `sip`        | `sip`                     |
| The same command with the fixture provider   | `fixture` / `synthetic` | `synthetic`               |
| Story 3.8's socket writer (not yet written)  | `alpaca` / `iex`        | `iex`                     |
| Anything naming `replay`                     | refused before the trx  | — (`ReplayedSeriesError`) |

**What a read hands back.** `readBars` selects `market_bars.feed` beside the
six bar columns and answers `readonly StoredBar[]`, `{ bar: Bar; feed:
MarketFeed }`. The tape sits **beside** the bar rather than on it because
`Bar` is `packages/shared`'s and reaches the wire, the chart and every
`WireObservation`; Task 3.6.4's constraint 4 refused a field on it for the
send instant and the reasoning is the same here. The replay source maps
`.bar` and drops the tape deliberately — its emission is labelled `replay` by
the engine, whichever tape the bar was observed on. `readSeries` is
**unchanged**: the series-level `feed` it reports is still the ledger's, and
Task 3.7.5 is what derives a window's sources from these rows.

**`SOURCE_OF_NOTHING` is confined, not removed.** It is reached only by a
read with no ledger row, which through the shipped writers is the same thing
as no bars — `recordSeries` writes the ledger in the transaction that writes
the rows. A row with no ledger row is producible only by hand (the test
suite's `insertBar`), and 3.7.5 closes even that when sources come from the
bars.

**The conflict rule, as it stands on 2026-09-22 — Story 3.8's to replace.**
The unique key is `(security_id, timeframe, observed_at)` and does not
include the tape, so a bar re-stored from a different tape is a **conflict**.
Today, in both branches, **the existing row's tape wins**:

- the same numbers from another tape write nothing — the `is distinct from`
  clause compares the five values and not the tape, so the row is neither
  rewritten nor counted;
- different numbers from another tape move the numbers and `recorded_at` and
  **leave the tape as it was** — a correction by the writer's own account,
  and the row then carries one tape's numbers under another tape's label.

That second branch is written down as the honest description of the rule
rather than as a claim that it is right. It is unreachable through the
shipped writers — `recordSeries` refuses a source that disagrees with the
ledger row it would extend (`ForeignSourceError`) before a row is touched —
and Story 3.8's three shapes are about exactly that refusal, so this task
kept the behaviour and asserted it (`market-bars.database.test.ts`, _a
re-store of the same instant from another tape_) rather than deciding it in
passing. **Since Task 3.7.4 the refusal that keeps it unreachable is
narrower and named** — the `overlap` reason in §7 — and it reads the tapes
in the overlapping rows rather than the ledger. `MarketBarsTable.feed`'s update type is `never`, which makes _the
tape does not move on a correction_ a compile-time rule; whichever shape 3.8
takes has to change that type on purpose.

**One thing this task found, and the mechanism that found it.** The chunk
size for the multi-row insert is derived from `BAR_COLUMNS.length` so that a
column added to the writer cannot leave a hard-coded batch size stale — and
adding `feed` to the insert **without adding it to that list** produced
exactly the stale size the derivation exists to prevent (`bind message has
8183 parameter formats but 0 parameters`, at 8,191 rows against a ceiling
now 7,281). It was red within a minute in _writes past the bind-parameter
chunk boundary_, which is the test doing the job the derivation cannot: the
derivation is only as good as the list, and the test is what checks the list
against the statement. The chunk is now **7,281 rows** (nine columns), from
8,191.

## 7. The ledger — what a row claims now, and what it no longer claims (Task 3.7.4, 2026-09-22)

**Candidate 1, narrowed by what 3.7.3 shipped.** `bar_coverage` keeps one row
per `(security, timeframe)` and three of its four facts:

| Column                        | Claims                                                    | Read by                                                           | Enforced by                                 |
| ----------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------- |
| `covered_start`/`covered_end` | The one contiguous window we hold                         | `readSeries`, the backfill's resume point, `MissingCoverageError` | `CoverageGapError` — unchanged              |
| `bar_count`                   | How many bars inside it                                   | `readCoverage`, the freshness diagnostic                          | extended per batch — unchanged              |
| `provider`                    | **The window's one provider**                             | `readSeries`, and 3.7.5's per-stretch `BarSource.provider`        | `ForeignSourceError`, reason **`provider`** |
| `feed`                        | **The tape the window was opened with, and nothing else** | `readSeries` only, until 3.7.5 derives sources from the rows      | nothing — withdrawn                         |

**Why `provider` stays a read and a rule.** The row on `market_bars` carries
the tape and nothing else — ADR 0034's reversal trigger is _the first per-bar
field beyond the tape_ — and a `BarSource` needs a provider as well as a
feed. The ledger is therefore the only place a window's provider is written,
and a window has one: the plan's `sip` and `iex` are both Alpaca, and the
fixture's `synthetic` is never stitched onto either. So a series naming
another provider is refused before a row is touched, and a series naming
another **tape** from the same provider is accepted.

**Why `feed` is withdrawn rather than dropped.** A window may now hold two
tapes and one column cannot say so; the truth is per row. The column stays
because a contract is a second deploy (`migrations/README.md`, expand then
contract) and dropping a column from a live ledger is not this story's to
do. It is still **required on insert** so the database default stays
unreachable, it is written with the first series' tape so it is never blank,
the write path neither reads nor updates it (`schema.ts` keeps update
`never`), and `readSeries` is its last reader — the series-level `feed` it
reports is honest while no shipped writer sends a second tape, and Task
3.7.5 replaces it with sources derived from the rows. Task 3.7.6 owes the
invariant that nothing else reads it.

**The three refusals that stand, each named** (`ForeignSourceReason`):

- **`stitched`** — a series naming two sources is still one write too many:
  the ledger names one provider and a source says how many bars it has but
  not which. Unchanged since Task 2.8.4.
- **`provider`** — above.
- **`overlap`** — a series whose window overlaps the held one is refused
  **if the stored bars in the overlap carry another tape**, read from the
  rows with one indexed `select distinct feed` and never from the ledger.
  This is the guard in front of §6's conflict rule: the unique key does not
  include the tape, so writing through would give the existing row the new
  numbers under the old label, and that is Story 3.8's decision. A same-tape
  overlap is what it always was — the idempotent re-run, or a correction.

**What a stakeholder-visible writer can now do that it could not**: extend a
SIP window with an IEX session. The window grows to the union, the count to
the sum, `readBars` answers `sip, sip, sip, iex, iex` in contribution order,
and the ledger's `provider` is the one both series named. That is the
store's side of Story 3.8's cold load; what 3.8 still has to decide is the
overlap.

**What was measured.** The overlap check is one extra indexed query per
write, and only when the windows intersect — the backfill's nightly walk
never does (it extends from one end), so the shipped writer pays nothing.
`pnpm test:database` 184/184; two breaks — `a-second-tape-overwrites-the-first`
(the guard inverted) and `a-second-provider-is-relabelled` (the provider
check disabled) — each reddened their own test and restored the file.
