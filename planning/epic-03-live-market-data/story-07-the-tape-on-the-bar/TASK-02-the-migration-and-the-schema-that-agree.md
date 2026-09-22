# Task 3.7.2 — The migration, and the schema that agrees with it

**Status:** Not started
**Story:** [3.7 The Tape on the Bar](STORY.md)
**Depends on:** 3.7.1

## Objective

Write the migration the decision calls for — **forward-only, four-digit,
additive, and metadata-only at deploy time** — bring `schema.ts` into
agreement, and prove the agreement with `pnpm test:database` rather than with
the compiler.

## What the user can see when this lands

**Nothing.** A column that every existing row answers with its default, on a
store that holds exactly what it held.

## The rules, before the file

- **`0010_*`**, because the sequence is the number after the last applied
  migration and two branches adding the same number is a merge conflict a
  human resolves — the trap a timestamp hides.
- **Immutable once applied.** The checksum hashes the whole file including
  comments. Write the comment block as a dated historical claim — _on
  2026-09-2x every stored bar came from the consolidated tape_ — because that
  is exactly what an applied migration is allowed to contain and will be
  wrong later.
- **Additive across the deploy.** The migration runs before either half of the
  code rolls; for that window the previous backfill is still the writer and
  does not know the column exists. A `not null` with no default would make its
  next insert fail. **The default is what keeps the window survivable**, and
  `schema.ts` declaring the column required on insert is what stops the
  default being reachable from shipped code — `0007`'s own arrangement.
- **Inside 120 seconds.** `deploy.yml`'s `timeout 120 pnpm migrate` is the
  ceiling, and 3.7.1's figures say what fits. If the vocabulary check is added
  `NOT VALID`, say in the migration's comment where and when it gets validated,
  and by whom.

  > **AMENDED 2026-09-22 by Task 3.7.1 — decided, and the answer is _never
  > inside a deploy, and not otherwise either_.** The check is `NOT VALID` and
  > stays so: it enforces every new row, every existing row's value is the
  > default and the default is in the vocabulary by construction, and the scan
  > that validation runs is ~508 s on the deployed tier's 10 MiB/s (ADR 0034).
  > The migration's comment says that, in those words, so nobody "tidies" it
  > with a `VALIDATE` in a later deploy. What this task times is **the runner**
  > — `pnpm migrate` through Kysely, not the raw `ALTER`s 3.7.1 already timed
  > at 39 ms and 3 ms — against the populated store and against `marketpulse_bare`.

- **The vocabulary is `MARKET_FEEDS` in `packages/shared`**, and the database's
  `check` is its backstop — `migrate.database.test.ts` already parses
  `bar_coverage_feed_check` back and compares it to the constant so the two
  cannot drift. The new constraint joins that test.

## Work

- `apps/backend/migrations/0010_market_bars_feed.sql` — or the name 3.7.1's
  shape calls for — with its comment block carrying the decision's summary and
  a pointer to ADR 0034, so a reader of the migration alone gets the argument
- `schema.ts` — the column on `MarketBarsTable`, declared the way
  `BarCoverageTable.feed` is (`ColumnType<MarketFeed, MarketFeed, never>`),
  with its own comment saying why it exists and what it replaces
- `migrate.database.test.ts` — the column described, the constraint parsed
  back against `MARKET_FEEDS`, an insert outside the vocabulary refused
- **Time it against the populated local store**, with `\timing`, and record
  the figure in `TAPE.md` beside the empty-store figure (criterion 4)
- **Run it against `marketpulse_bare`** — `pnpm store:bare` rebuilds CI's
  shape in seconds — because that is the store the deploy's migrate step and
  the `database` CI job actually see
- A `pnpm break` entry that removes the column from the migration and proves
  the database test goes red — and note in the entry that this break needs a
  database, so it lives outside `verify`

## Done when

1. The migration applies to an empty store and to the populated one, timed,
   and the time fits the deploy's ceiling with the margin stated
2. `schema.ts` and the migration agree, proved by `pnpm test:database`
3. The check constraint's vocabulary is the shared constant, parsed back
4. No applied migration was edited (`pnpm test:database`'s checksum test is
   what says so)
5. `pnpm verify` passes; `pnpm test:database` passes against a real server
