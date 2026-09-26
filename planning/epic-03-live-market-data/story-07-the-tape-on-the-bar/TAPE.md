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
- **A window's sources** are derived from the rows the read already loads —
  one `BarSource` per **contiguous run of tape**, in the order the bars sit,
  with the run's bar count and the oldest `recorded_at` in the run as its
  `retrievedAt` — and joined through `mergeSeriesProvenance` (Task 3.7.5,
  shipped 2026-09-23; §8). The ledger's `feed` is not consulted for it;
  **each stretch's `provider` is the ledger row's**, because the row carries
  the tape and nothing else and a window has one provider (§7, Task 3.7.4).
- **The ledger row** claims the window, the count and the provider (§7). Its
  `feed` column is the tape the window was **opened** with, claims nothing
  else since Task 3.7.4, and is **read by nothing** since Task 3.7.5 —
  `pnpm invariants` holds that.

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
  overlap is still the re-run and the correction (§7); and **since 3.7.5**
  that a SIP session followed by an IEX session reads back as two sources in
  that order with their counts and two different `retrievedAt`s, the reverse
  order reversed, a one-tape window as one source, and only the asked
  window's stretches (§8). Six breaks prove the load-bearing clauses: `pnpm
break the-tape-check-gets-validated`, `pnpm break
the-tape-default-lies-about-the-past`, `pnpm break
the-writer-stamps-a-constant` (a literal `sip` in the writer reddens the
  `synthetic` read-back), `pnpm break the-second-tape-is-folded-into-the-first`,
  `pnpm break a-second-provider-is-relabelled` and the same break with the run
  split disabled. Two
  more prove `pnpm invariants` rather than a test:
  `the-sources-are-written-by-hand` and `the-ledgers-tape-is-read-again`.
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

> **REPLACED 2026-09-23 by Task 3.8.2, which is Story 3.8 doing what this
> section said it would.** The unique key now **includes the tape**
> (`0011_market_bars_unique_bar_by_tape.sql`, ADR 0035), so the case below is
> no longer a conflict at all: the IEX bar and the consolidated bar for one
> minute are **two rows**, each keeping its own numbers, and neither is the
> other's correction. What still conflicts is a re-store on the **same** tape,
> which is the idempotent re-run and the correction, and those behave exactly
> as described below. The paragraph is left standing because it is the rule
> Task 3.7.3 pinned and the reason the column existed to be widened.

**The conflict rule, as it stood on 2026-09-22 — replaced by Story 3.8.**
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

| Column                        | Claims                                                    | Read by                                                                                                                 | Enforced by                                 |
| ----------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `covered_start`/`covered_end` | The one contiguous window we hold                         | `readSeries`, the backfill's resume point, `MissingCoverageError`                                                       | `CoverageGapError` — unchanged              |
| `bar_count`                   | How many bars inside it                                   | `readCoverage`, the freshness diagnostic                                                                                | extended per batch — unchanged              |
| `provider`                    | **The window's one provider**                             | `readSeries`, and 3.7.5's per-stretch `BarSource.provider`                                                              | `ForeignSourceError`, reason **`provider`** |
| `feed`                        | **The tape the window was opened with, and nothing else** | **Nothing, since 3.7.5** — off `BarCoverage`, not selected; `pnpm invariants` (`stored-sources-only-through-the-merge`) | nothing — withdrawn                         |

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

## 8. Reading — the sources of a window, the order rule, and what the wire says (Task 3.7.5, 2026-09-23)

> **AMENDED 2026-09-24 by Story 3.8's close — the rows this section walks are
> the rows the ANSWER contains, which is narrower than the rows the store
> holds.** When this was written a minute held at most one row, so the two were
> the same set. Since Task 3.8.4 a minute may hold one row per tape and
> `readSeries` picks **one** of them — `distinct on (observed_at)`, ordered by
> a served-tape rank that prefers `sip` — because `toBarSeries` refuses bars
> that are not strictly ascending and the alternative was a 500. So a served
> window's `sources` describe **what was served**, and a window whose every
> minute holds both tapes names **one** source, not two. That is the more
> accurate claim and it is the one to read this section under: nothing here
> promises that a served window names every tape the store holds for it.

**Criterion 2, as shipped.** `readSeries` selects `market_bars.feed` beside
the six bar columns and `recorded_at`, and `toStoredSeries` walks the rows
once — they arrive ascending by `observed_at` — starting a new **stretch**
every time the tape changes. Each stretch becomes one `BarSource`:

| Field         | Comes from                                                                                                                                                                                                  |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider`    | the ledger row's `provider` — the only place it is written (§7)                                                                                                                                             |
| `feed`        | the stretch's tape, off the rows                                                                                                                                                                            |
| `barCount`    | the rows in the stretch                                                                                                                                                                                     |
| `retrievedAt` | the **oldest** `recorded_at` in the stretch — the honest staleness of the run; a correction moves a row's `recorded_at` forward and leaves its tape (§6), so it stays in its run and the minimum is unmoved |

One stretch is `toSeriesProvenance`, as before. Two or more go **through
`mergeSeriesProvenance`** — never a hand-written `sources` array — because
that function is the only route to a multi-source record and its adjustment
check fires whether or not anybody read the rule. A test cannot tell two
identical arrays apart by which function built them, so `pnpm invariants`
reads the file: `stored-sources-only-through-the-merge` fails on a `sources:`
literal in `market-bars.ts`, on the merge no longer being called, and on any
select of `bar_coverage.feed`. Its two breaks are
`the-sources-are-written-by-hand` and `the-ledgers-tape-is-read-again`; the
behaviour's break is `the-second-tape-is-folded-into-the-first`.

**Derived from the rows already in hand, not by a second query — a reversal
of 3.7.3's note, recorded.** 3.7.1 measured a `group by feed` aggregate
(0.478 ms for a session, 9.964 ms for 10,140 bars) and 3.7.3's amendment to
this task said the rows need not carry `feed`. They do now, for one reason
that outranks the query's elegance: `toStoredSeries` stays a **pure function
of one query's rows**, so every store the fast suite builds through it — the
route's and the stitch's — cannot disagree with itself about where the bars
came from, and the wire test for two sources is the real read path with one
row's tape changed rather than a second stub kept consistent with the first.
The rows are loaded for the bars regardless; the tape is one four-byte
column beside them and the walk is one pass over data already in memory.
The aggregate's figures stand as what a second query _would_ cost; what was
measured instead is the route (below).

**Contribution order is "one source per run, in the order the bars sit" —
and until Story 3.8 it coincides with "first instant per tape".** A second
tape can only reach the store as a contiguous extension of the window (§7's
overlap refusal), so today every tape is exactly one run and the two
readings agree. The day 3.8 lifts that refusal a tape can occur twice — an
IEX afternoon corrected by SIP bar by bar — and the walk answers `sip, iex,
sip`, which is the reading a source note can print without a rule the reader
has to know. 3.8 may choose otherwise; `market-bars.test.ts` asserts the run
reading so a change is a red test rather than a surprise.

**The empty answer names the constant, whatever the ledger says.** Before
this task a quiet window on a fixture store reported `fixture`/`synthetic`
for zero bars from the ledger's pair; now it reports `SOURCE_OF_NOTHING`
(`alpaca`/`sip`) like every other empty answer, because the ledger no longer
carries a tape and a claim about zero bars is not provenance (ADR 0029). The
wire carries the meaning in `bars: []` and `coverage.covered`, and the source
note renders no clause for data that is not there. Stated here because it is
the one served answer this task changed for a one-tape store.

**The domain object lost a field.** `BarCoverage.source` (`{ provider, feed }`)
is `BarCoverage.provider`. Every fixture in the fast suite that built a
ledger row followed the compiler (seven files); `readCoverageRow` and the
backfill's coverage map no longer select the column; Task 3.7.4's test that
the ledger's `feed` is the opening tape now reads it with raw SQL, which is
the honest instrument for a column nothing else reads.

**The route, measured — Story 2.9's method, A/B on one machine, 2026-09-23.**
`GET /market-data/bars` on loopback through the dev pair (tsx, not a
production build), n = 15 per cell, miss = 15 distinct symbols, hit = one
symbol repeated, the store 7 sessions stale so windows are absolute and end
2026-09-11, load average 8–10 from the machine's own processes. Main's read
path overlaid on the running pair first, this task's second, minutes apart:

| Window            |  Bars | main miss median / p95 | 3.7.5 miss median / p95 | main hit median / p95 | 3.7.5 hit median / p95 |
| ----------------- | ----: | ---------------------: | ----------------------: | --------------------: | ---------------------: |
| one session       |   390 |          7.6 / 48.3 ms |           8.3 / 69.2 ms |          3.5 / 5.0 ms |           3.2 / 4.4 ms |
| five sessions     | 1,950 |         17.9 / 37.0 ms |          14.4 / 21.7 ms |         8.8 / 11.6 ms |          8.2 / 12.0 ms |
| 24 sessions       | 9,356 |         50.3 / 58.8 ms |          50.3 / 58.8 ms |        28.2 / 31.2 ms |         30.1 / 38.6 ms |
| 25 sessions (cap) | 9,746 |         52.2 / 91.6 ms |          52.4 / 65.9 ms |        29.5 / 35.8 ms |         29.5 / 33.4 ms |

**The medians agree to within the run-to-run noise at every size, and the
p95s move both ways.** The walk is not measurable against the query and the
serialisation it sits beside. Against Story 2.9's recorded misses (4.9 / 9.7
/ 31.9 ms medians, p95 19.0 / 20.8 / 42.5) both arms here are slower by the
same factor — a loaded laptop through the dev watcher rather than 2.9's built
server on a quiet one — which is why the A/B is the figure and the comparison
to 2.9 is not.

## 9. The deploy — what it cost, what it waits for, and what nothing checks (Task 3.7.6, 2026-09-23)

**The deployed figure exists and is not an extrapolation.** `0010` rolled to
the B1ms instance on 2026-09-22 in the deploy for `b9772d1`, and the runner's
own log is the measurement: the migrate step's process started at
`10:01:53.090Z` and its last line printed at `10:01:54.341Z` — **1.251 s** for
Node's boot, a TLS connection from a GitHub runner to Azure, Kysely's advisory
lock, the bookkeeping read, both catalogue writes and the commit. Against
`timeout 120` that is a margin of **~96×**, and against 3.7.2's local 0.478 s
the difference is the network and the runner, not the table.

```text
2026-09-22T10:01:53.0896729Z $ node scripts/run-migrations.mjs
2026-09-22T10:01:54.3213260Z   Pending: 0010_market_bars_feed
2026-09-22T10:01:54.3214224Z   ✓ 0010_market_bars_feed
2026-09-22T10:01:54.3214851Z   Applied 1 migration.
```

The three lines are 96 µs apart because `runMigrations()` returns its lines and
the script prints them at the end — so read the **step**, not the gap between
them. Criterion 4's figure is that step, with its assumption stated: a constant
default is a catalogue write, which 3.7.2 proved is O(1) in the table's size by
measuring 0.478 s on 48.8 million rows and 0.456 s on none.

**What the deploy actually risks on this table is the lock, and it is
measured.** `ALTER TABLE` takes an `ACCESS EXCLUSIVE` lock; a rehearsal on the
populated store with a write transaction in flight had the migration waiting
**18.16 s** and an ordinary chart read, whose own lock conflicts with nothing
that was granted, waiting **16.16 s** behind it against a **0.09 s** baseline.
The full table, the `lock_timeout` contrast and the decision not to ship a
bound are `docs/GAPS.md`'s entry _A migration on `market_bars` waits for as
long as the longest open transaction_. The exposure on this product is small —
one `recordSeries` transaction is 390 rows and **81–137 ms** — and the deploy
fails safely when it is not: exit 124, nothing applied, no code rolled.

**One thing was repaired rather than recorded.** `deploy.yml`'s message for exit
124 told the reader the likeliest cause was another migration holding Kysely's
advisory lock, and to look for `wait_event: advisory`. Since `0010` that is the
wrong row: a migration queued on this table shows `wait_event: relation`, and
so does every reader stuck behind it. The message now names both, in the order
a reader should check them.

**The old writer, rehearsed against the migrated table.** The last build that
does not know the column is `main` at `b9772d1`; built in a worktree and run
against `marketpulse_bare` after `0010`, its backfill stored **9,750 bars over
25 sessions** and every row came back `feed = 'sip'` from the database default,
with the ledger reading `alpaca`/`sip` beside them. That is the deploy window
demonstrated rather than asserted: between the migrate step and the code roll
the previous revision keeps writing, its insert names eight columns against a
nine-column table, and the default is true of every bar it can produce.

**Two precisions the rehearsal added.** The shipped backfill calls
`recordSeries` **once per session**, so the largest statement it ever issues is
390 rows — the 8,191-row chunk boundary the old build computed is reachable only
by a caller that hands the writer a multi-session series, which nothing does.
And `pnpm backfill` takes its provider from `createAlpacaProvider` directly
rather than from `MARKET_DATA_PROVIDER`: the rehearsal was run with
`MARKET_DATA_PROVIDER=fixture` set and went to the real vendor anyway, spending
25 metered requests. That is defensible — a backfill's job is real history, and
`backfill.database.test.ts` reaches the seam by passing a provider as a
dependency — but the variable is silently ignored rather than refused.

**What nothing checks, in one place.** Three entries went into `docs/GAPS.md`:
the lock wait above; that `bar_coverage.feed` is written, described and read by
nothing with no trigger for the contract deploy that would drop it; and that
everything this story asserts about the schema lives in `pnpm test:database`,
which is a required CI job and **not** part of `pnpm verify`, so a later
`validate constraint` would pass every unit-level check and reach the deploy's
120 s ceiling before anything went red.

**Two things the task expected to leave open closed instead.** The invariant
`stored-sources-only-through-the-merge` now also asserts that **no module but
`market-bars.ts` builds a query against `bar_coverage`** — eleven files mention
the table and none of the others queries it — which is what makes its one-file
grep sound rather than lucky (`pnpm break a-second-module-queries-the-ledger`).
And the empty answer's `SOURCE_OF_NOTHING` cannot reach a reader: `source-note.ts`
applies ADR 0029 **per clause**, and the feed, adjustment and retrieval clauses
are properties of the bars, so a series with no bars renders none of them.
