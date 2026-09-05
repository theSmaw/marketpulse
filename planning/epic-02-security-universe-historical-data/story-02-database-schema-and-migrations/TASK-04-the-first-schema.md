# Task 2.2.4 — The first schema: `securities` and nothing more

**Status:** Not started
**Story:** [2.2 Database Schema & Migration Mechanism](STORY.md)
**Depends on:** Tasks 2.2.2 (the mechanism) and 2.2.3 (the conventions it has to follow)

## Objective

Put one real table through the mechanism — enough for Story 2.3 and deliberately not one
column more — and prove the conventions survive contact with something that exists.

## Work

- **Write the migration for `securities`, sized by Story 2.3's stated vocabulary and no
  further**: symbol, name, exchange, kind (equity or ETF — §6 and Epic 4 treat them
  differently, so this is a real column and not a flag), sector, industry, status, and the
  identifier fields that let Epic 9 map a security to a CIK. **Story 2.3 owns what is in
  the rows and this task owns the shape of the table**, and the boundary is worth holding:
  the sector taxonomy, the index-proxy-versus-sector-proxy distinction and the selection
  rule are all 2.3's, and a column invented here to anticipate one of them is a column 2.3
  has to migrate
- **`market_bars` is not in this task and not in this story.** Story 2.7 owns it, because
  its shape is driven by measured ingestion rather than by a guess — the partitioning
  question, the primary key, and whether TimescaleDB is warranted are all decisions with a
  row count behind them, and §37 says do not add a second data technology without a
  measurement. A `market_bars` table created here would be created against no measurement
  at all
- **Apply it to an empty database and check the schema that came out**, by reading the
  database rather than by re-reading the file: column types, nullability, defaults,
  constraints and indexes. That is acceptance criterion 2's first half, and reading it back
  is what catches the difference between what the migration says and what Postgres did with
  it — a `numeric` without precision, a `timestamptz` default evaluated at migration time
  rather than at insert, a unique constraint that quietly became an index
- **Apply it twice.** Criterion 2's second half, now with something to be non-idempotent
  about
- **Ship no seed data**, per Task 2.2.3's decision, and confirm the table is empty
  afterwards. Story 2.3 fills it
- **Exercise the conventions on the one table that can**: at least one `timestamptz`, the
  identifier decision applied to a table with a genuine natural key, and the naming rule
  in a foreign key if there is one to have — and if there is not, say so, because that is a
  convention this story cannot test and Story 2.3 or 2.7 will be the first to
- **Say what a second copy of this database now needs to become correct**, which is one
  command and is the whole point of the mechanism existing

## Done when

- `securities` exists in the local database through the mechanism, with nothing beyond
  Story 2.3's needs
- The schema was verified by reading the database, and the reading is recorded
- Applying the migration twice is a no-op, observed
- The table is empty and seeding is somebody else's task
- Any convention this table could not exercise is named as untested

## Notes

The temptation this task exists to resist is `market_bars`. It is the table the epic is
about, its shape looks obvious, and adding it here would cost Story 2.7 the one thing it
has that this story does not: a measurement.
