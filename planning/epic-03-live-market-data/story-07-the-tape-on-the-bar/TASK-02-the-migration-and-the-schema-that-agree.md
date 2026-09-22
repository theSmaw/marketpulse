# Task 3.7.2 — The migration, and the schema that agrees with it

**Status:** **Complete — 2026-09-22.** `0010_market_bars_feed.sql` ships the column and its `NOT VALID` check; `schema.ts` carries `feed` on `MarketBarsTable`; `market-bars.database.test.ts` describes the column, parses the check back against `MARKET_FEEDS`, asserts it **stays unvalidated**, refuses a tape outside the vocabulary and reads `sip` back for a writer that omits it. `pnpm migrate` applied it in **0.478 s** to the populated store (48,797,343 rows) and **0.456 s** to `marketpulse_bare`, whole process included, against a 120 s ceiling. Two breaks landed red and restored. No applied migration was edited.
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

---

## What was done — 2026-09-22

### 1. The migration — two catalogue writes and a comment that argues

`0010_market_bars_feed.sql` is two statements: `add column feed text not null
default 'sip'` and `add constraint market_bars_feed_check check (feed in
(…)) not valid`. Everything else in the file is the comment block, which is
where the argument lives for anybody who reads the migration alone: `0004`'s
decision against this column and its trigger, the figures 3.7.1 took (39 ms,
3 ms, 6,181 ms), the deployed tier's 10 MiB/s and the 120 s ceiling, **why
`NOT VALID` stays** — in the words _do not "tidy" it_ — and the default as a
dated historical claim about 2026-09-22 rather than an inference about the
future.

**One thing the task file assumed and the file does not do**: it does not
say _where and when the check gets validated, and by whom_, because 3.7.1
decided it is never validated. The comment says that instead, and the test
below makes it a check rather than a request.

### 2. The schema — declared, with one honest interim

`MarketBarsTable.feed` is `ColumnType<MarketFeed, MarketFeed | undefined,
never>`. The read side is the union, the update side is `never` (a bar's tape
does not change after observation — `BarCoverageTable.feed`'s reason), and
**the insert side is optional for exactly one task**. The task file asked for
`BarCoverageTable.feed`'s arrangement — required on insert, so the database's
default is unreachable from shipped code — and that is the arrangement Task
3.7.3 delivers with the writers. Between this task and that one the shipped
writer omits the column and the default answers `sip`, which is true of every
bar it can write today. The comment on the column says so, names 3.7.3, and
names the narrowing.

**The compiler did the first check before a test ran.** Adding the column to
the interface without describing it in `EXPECTED_MARKET_BARS` was `TS1360`
on the first typecheck — the `satisfies Record<keyof MarketBarsTable,
ExpectedColumn>` idiom doing the job it was written for.

### 3. The tests — four assertions in the table's own suite

They went into `market-bars.database.test.ts` rather than
`migrate.database.test.ts`, because that is where `market_bars`'s columns and
`bar_coverage`'s vocabulary checks already live; the migration suite owns
`securities` and the mechanism.

- **`EXPECTED_MARKET_BARS.feed`** — `text`, not null, default `'sip'::text` —
  compared against `information_schema` in both directions by the existing
  column tests.
- **`market_bars_feed_check` permits exactly the members of `MARKET_FEEDS`** —
  parsed back from `pg_get_constraintdef`, set equality, the ledger's
  arrangement one table over.
- **It stays `NOT VALID`, on purpose** — `pg_constraint.convalidated` is
  `false`, with the reason in the test: a validated check is a full read of
  the heap inside a deploy that gives it two minutes.
- **It refuses a tape outside the vocabulary, `NOT VALID` notwithstanding** —
  `insertBar({ feed: "nyse" })` rejects naming the constraint, which is the
  proof that `NOT VALID` is about the past and not the future.
- **It answers `sip` for a writer that does not know the column exists** —
  the deploy window's writer, inserting without the column, reads back `sip`.

`BARS_FINGERPRINT` gained `feed`, because a bar's tape is content and the
idempotence assertions should see it.

### 4. Timed, twice, and read back

```text
$ time pnpm migrate                              # populated: 48,797,343 rows
  Pending: 0010_market_bars_feed
  ✓ 0010_market_bars_feed
  Applied 1 migration.
pnpm migrate  0.38s user 0.07s system 94% cpu 0.478 total

$ time DATABASE_NAME=marketpulse_bare pnpm migrate   # bare: 0 rows
  ✓ 0010_market_bars_feed
  Applied 1 migration.
  0.40s user 0.05s system 99% cpu 0.456 total

market_bars_feed_check | convalidated = f
column_default         | 'sip'::text
```

**The two stores agree to within 22 ms, and that agreement is the finding**:
the migration does not read the table, so a store with 48.8 million rows and a
store with none cost the same. Against `timeout 120` the margin is ~250×.
3.7.1's raw `ALTER`s were 42 ms between them; the rest of the 478 ms is Node
starting and Kysely taking its advisory lock, which the deploy pays whatever
the migration says.

### 5. Two breaks, both red

| Break                                  | What it changes in `0010`                       | Test that went red                          |
| -------------------------------------- | ----------------------------------------------- | ------------------------------------------- |
| `the-tape-check-gets-validated`        | drops `not valid` — the tidy-up that stalls     | _stays NOT VALID, on purpose_               |
| `the-tape-default-lies-about-the-past` | `default 'iex'` — relabels 48.8 M rows for free | _answers `sip` for a writer that does not…_ |

The task file asked for a break that removes the column; that one makes the
following statement fail to parse, which reddens the whole suite's setup
rather than one named test, so the two clauses that carry a decision were
broken instead. Both need a database and live outside `verify`, as every
`test:database` break does.

### 6. Criterion 5, read rather than assumed

`migrate.database.test.ts`'s _refuses to migrate when an applied migration no
longer matches its record_ is what says no applied migration was edited, and
it is green. `0010` is additive — a column with a default and an unvalidated
check — so the deploy's ordering (schema first, code after) is survivable by
construction and rehearsed by Task 3.7.6.

## For a stakeholder — a status report, 2026-09-22

**Where the product is.** Live prices reach the screen and 518 of them move
on their own. The next story lets the product **remember** a live session, so
a page reloaded mid-day still shows today. That story needs the database to
be able to say, for every stored price, which source it came from. The
previous task decided how; this one built it.

**What was built.** One new column on the price table, plus the rule that
says what values it may hold. Every price stored before today automatically
answers "the consolidated tape of all US exchanges", which is true of all of
them; every price stored from now on will carry its own answer. The database
also refuses any answer that is not on the agreed list.

**Why it took care, and what we checked rather than trusted.**

- **It had to be instant, and it was.** A change to a table of 48.8 million
  rows is the kind of thing that can lock a database for minutes, and our
  deploy gives it two before giving up. Measured end to end, the whole
  operation took **under half a second** — and took the same half-second on an
  empty copy of the database, which is the proof that it never read the
  table at all.
- **We deliberately left one safety check "unverified", and wrote down why.**
  The database can be asked to re-check every old row against the allowed
  list. That re-check would take about eight and a half minutes on our
  production server and would find nothing, because every old row holds the
  default, which is on the list by construction. So it is switched off, the
  file says so in plain words, and an automated test now **fails if anyone
  switches it back on** — because the way that mistake would show up is a
  failed deploy at merge time.
- **The default is a statement about the past, not a guess about the
  future.** It is true today that every stored price came from the
  consolidated tape. The next task makes every new price state its own source
  explicitly, so the default is never relied on by the software we ship; it
  exists for the few seconds during a deploy when old code is still writing.
- **We proved the tests can fail.** Two deliberate breaks — switching the
  re-check on, and changing the default to a wrong tape — each turned the
  right test red, and the file was restored automatically. A test that has
  never failed has never been tested.

**What a user can see today: nothing.** The store holds exactly what it held.
What this unlocks: the next task makes every writer stamp its tape, the one
after lets the store accept a second source, and the read path that follows
can tell a reader, from real stored data, which exchange each stretch of a
chart came from — which is the sentence the product promised never to fake.
