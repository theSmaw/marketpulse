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
  series' own provenance at insert time (Task 3.7.3) — never by a provider's
  name and never by a default reachable from shipped code. The database's
  default exists for the deploy window and for rows that predate the column,
  and `schema.ts` declaring the column required on insert is what keeps it
  out of reach otherwise (`0007`'s arrangement, repeated).
- **The vocabulary is `MARKET_FEEDS` in `packages/shared`**, and
  `market_bars_feed_check` is its backstop; `market-bars.database.test.ts`
  parses the constraint back and asserts set equality (Task 3.7.2), asserts
  it is **unvalidated on purpose**, refuses a tape outside the list, and
  reads `sip` back for a writer that omits the column.
- **A window's sources** are derived from the bars — per tape, first
  `observed_at` for order, `count(*)` for the bar count, the stretch's
  `recorded_at` for `retrievedAt` — and joined through `mergeSeriesProvenance`
  (Task 3.7.5). The ledger's `provider`/`feed` are not consulted for it.

## 4. What a green `pnpm test:database` certifies about this, and what it does not

- **It certifies** that the migration and `schema.ts` agree (both directions,
  and the compiler covers the third — a column on the interface the test does
  not describe is `TS1360`, which is how Task 3.7.2's first typecheck went
  red), that the check's vocabulary is the shared constant, that the check
  stays `NOT VALID`, that a tape outside the vocabulary is refused, that an
  insert omitting the column answers `sip`; and, as they land, that a stored
  bar reads back with its own tape (3.7.3) and a two-tape window produces two
  sources in order (3.7.5). Two breaks prove the migration's two load-bearing
  clauses: `pnpm break the-tape-check-gets-validated` and
  `pnpm break the-tape-default-lies-about-the-past`.
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
