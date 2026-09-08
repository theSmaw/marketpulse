# Task 2.8.3 — `market_bars`: the key, the columns, and the indexes chosen rather than accumulated

**Status:** Complete (2026-09-08)
**Story:** [2.8 Historical Bar Ingestion, Storage & Backfill](STORY.md)
**Depends on:** Tasks 2.8.1, 2.8.2

## Objective

The table. One migration, one `schema.ts` entry, and the database tests that check the
conventions against `information_schema` rather than against the file.

**This is the second table in this schema and the first that exercises three conventions
`securities` could not**: the `observed_at` / `recorded_at` pair, `numeric(18, 6)` for money,
and a foreign key. All three are named in `migrations/README.md` and all three have been
untested since Task 2.2.3 wrote them down.

## What the user can see when this lands

**Nothing.** An empty table. `/securities` is unchanged from Task 2.8.2's re-curation.

## The key, which is the decision the whole story rests on

**What makes a bar the same bar is `(security_id, timeframe, observed_at)`**, and that is what
makes re-running a backfill idempotent instead of duplicating a year. It is a `unique`
constraint beside a surrogate `id`, per `migrations/README.md` §3 — not the primary key
itself — for the reason that section already gives, and with one addition specific to this
table: the natural key is three columns wide and would propagate into every future foreign key
referencing a bar.

**`security_id` and not `symbol`.** Bars are filed against the row, so a symbol change does not
orphan them — except that Task 2.7.8 measured that it does, because a rename creates a new row.
That is Task 2.8.2's decision and this table inherits it; the constraint here is that
`security_id` **means one company forever**, which nothing enforces and which the recycled-ticker
hazard can violate.

**`timeframe` is `text` with a `check` against `TIMEFRAMES`**, not a Postgres enum, per
`migrations/README.md` §1's measured argument: inside one transaction — which is what a
migration is here — adding an enum value _and using it_ is refused outright with `unsafe use of
new value`, so a migration that adds a timeframe and backfills to it **cannot be written at
all**. `SECURITY_KINDS` set this shape and `TIMEFRAMES` in `packages/shared` is the vocabulary,
which creates the same unchecked pair Task 2.2.5 closed for `kind` — so close it the same way,
in `market-bars.database.test.ts`, by parsing the constraint Postgres **rewrote** into
`= ANY (ARRAY[...])` rather than string-matching the migration.

## The two timestamps, which this table is the first to need

`migrations/README.md` §2 defines the pair and Task 2.2.4 named **this table** as the first to
exercise it. Getting it wrong here is the leak invariant 4 exists to prevent.

- **`observed_at`** is the instant the bar's interval **starts** in the market. It is
  `timestamptz`, it has **no default**, and `Bar.startsAt` maps to it directly with **no shift**
  — Task 2.7.3 measured that Alpaca's `t` marks the start of its interval, and `PROVIDER.md`
  §9.2 chose the name `startsAt` precisely so a mapping that gets it backwards reads as an
  obvious contradiction rather than a plausible assignment.
- **`recorded_at`** is when we wrote the row. `default now()`, which is **transaction start
  time** rather than statement time — measured, and it means every bar in one batch shares a
  `recorded_at`, which is correct and is not a bug.

**`default now()` on `observed_at` would be the single most damaging line in this story**, and
it is one word away from being written: it turns "when it happened" into "when we wrote it",
invisibly, on the column Epic 13's temporal plugin filters on. `migrations/README.md` §2 says
so; this table is where it stops being hypothetical.

## The columns

Six from `Bar` plus the key and the bookkeeping. Nothing else, per `API_ERROR_CODES`' rule
applied to a schema: a column exists when something reads it.

| Column        | Type              | Note                                                        |
| ------------- | ----------------- | ----------------------------------------------------------- |
| `id`          | `bigint` identity | `generated always`, surrogate, per §3                       |
| `security_id` | `bigint`          | FK to `securities(id)`, named `security_id` per §1          |
| `timeframe`   | `text` + `check`  | `TIMEFRAMES`, rewritten form                                |
| `observed_at` | `timestamptz`     | **no default**                                              |
| `open`        | `numeric(18, 6)`  | per-share, per §4                                           |
| `high`        | `numeric(18, 6)`  |                                                             |
| `low`         | `numeric(18, 6)`  |                                                             |
| `close`       | `numeric(18, 6)`  |                                                             |
| `volume`      | `bigint`          | a count, so **not** numeric — §4 draws that line explicitly |
| `recorded_at` | `timestamptz`     | `default now()`                                             |

**`numeric(18, 6)` and never a float**, and §4's argument is invariant 1 rather than tidiness:
float addition is **not associative**, so `sum()` over `[1e16, 1.0, -1e16]` returns 0 and the
same values reordered return 1 — a percentage change that disagrees with itself between two
renders because a query plan changed the aggregation order. Both edges were produced: excess
scale **rounds silently**, excess precision is **refused**. The scoping is per-share; a market
capitalisation would overflow it, which is why the rule is written that way.

**Provenance is deliberately NOT a column on the bar**, and this is the decision most likely to
be revisited by somebody who has read `PROVIDER.md` §2. Provenance travels with a **series**,
and a `feed`, an `adjustment` and a `retrieved_at` on every one of ten million rows is ten
million copies of a constant. What the store needs instead is a statement per symbol and
timeframe, which is Task 2.8.4's ledger. **If a per-bar feed column is ever wanted, the trigger
is a second feed writing into this table** — which Epic 3 is, since its live stream declares
`iex` where this story's history is `sip`. Write that trigger down now, because Epic 3 is the
task that meets it and it will look like a schema change with no reason attached.

## The indexes, chosen rather than accumulated

Story 2.9's access patterns are what these are for, and they are known: **one symbol, one
timeframe, one window, in ascending time.** That is exactly the unique constraint's own btree,
so the primary access path costs no extra index at all — say that in the migration, because the
reflex is to add one.

What to decide explicitly rather than by accumulation:

- **Column order in the unique constraint matters and `(security_id, timeframe, observed_at)`
  is chosen for the range scan**, since the leading equality columns are what let the third be
  a range.
- **A `(observed_at)`-leading index is what a cross-sectional query wants** — "every security
  at this minute", which is §11's breadth calculation and Epic 5's. It does not exist yet, and
  the decision here is to **not build it against no reader**, with Epic 5 named as the trigger
  and the note that adding it later on a populated table is what `CREATE INDEX CONCURRENTLY`
  is for.
- **Every index is ~50M rows of write amplification.** State the cost in the migration beside
  each one. (~10M when this was written against 101 securities; Task 2.8.2 re-curated the
  universe to 518, so a year of minute bars is **50.5M rows**. That also makes open decision
  2's TimescaleDB trigger — Task 2.8.8's `EXPLAIN` against the real row count — five times
  more likely to fire, and it makes the choice of what NOT to index the more consequential
  half of this task.)

## `CREATE INDEX CONCURRENTLY`, and why it does not bind this task

`DATA-LAYER.md` names this table as the place this project meets it, and names a second
`Migrator` over a separate directory as the answer. **It does not bind here**, and saying why
matters: an index created in the same migration as an empty table takes no meaningful lock,
because there is nothing to lock. The problem arrives when an index is added to a **populated**
table — Epic 5's cross-sectional index above, or anything Task 2.8.8's query measurement turns
up.

So this task **does not build the second `Migrator`**, and records the trigger precisely: the
first index on a populated `market_bars`. Kysely's `disableTransactions` is per-`Migrator` and
all-or-nothing, which is why it is a second directory rather than a flag.

## The `numeric` tripwire, which this task deliberately trips

`migrate.database.test.ts` carries an assertion that there are **zero** `numeric` columns in the
schema, with a message telling whoever added one to replace it. That is Task 2.2.5's answer to a
check that would otherwise pass by having nothing to look at — the blind-renderer problem in a
new place.

**This task is what fires it**, and the work is to replace it with the real rule rather than to
delete it: every money column is `numeric(18, 6)`, asserted through `information_schema` in both
directions, plus `volume` asserted as `bigint` so the counts-are-not-money half is checked too.
Update `migrations/README.md`'s two lists in the same change — the tripwire's own message says
to.

## Work

- `apps/backend/migrations/0004_market_bars.sql`, with the reason for each index beside it
- `apps/backend/src/schema.ts`: the `MarketBarsTable` interface, `id` as `GeneratedAlways<string>`
  and `recorded_at` written long-hand with update `never`, so the type says what SQL cannot
- **The TypeScript consequence, which is not optional**: `pg` hands a `numeric` and a `bigint` to
  JavaScript as **`string`**, deliberately, and it must not be "fixed" with a type parser
  because a JS `number` is a double. `Bar` in `packages/shared` has `number` prices, so the
  mapping from row to domain object is a **parse** and it belongs beside the query, one function
  per domain type, never a generic mapper — `schema.ts`'s own rule, and Task 2.8.4 writes it
- `market-bars.database.test.ts`: every column matched on name, type, nullability and default;
  the `timeframe` check parsed from its rewritten form; the FK asserted; the unique constraint
  asserted as a **constraint** rather than a bare index, which Task 2.2.4 measured is not the
  same thing
- The `numeric` tripwire replaced by the real rule, and `migrations/README.md`'s two lists updated
- The migration applied locally and **deployed**, read back through `information_schema` and its
  checksum compared against `shasum -a 256` of the file — Task 2.2.8's method
- Deliberate breaks, each seen to fail and reverted: `default now()` on `observed_at`, `double
precision` prices, a column renamed in the migration only, and a `numeric` volume

## Done when

- The table exists locally and deployed, with identical `information_schema` output and matching
  checksums
- `pnpm test:database` passes and its count has grown; the tripwire is gone and the money rule is
  a real assertion
- `securities` is untouched, and `PostgreSQL 18`'s `NOT NULL`-as-`pg_constraint` rows are **not**
  counted by anything — Task 2.2.4's trap, which asserts an engine major rather than a schema
- The table holds **zero rows**; writing is Task 2.8.4's
- `pnpm verify` is exit 0 with **no database**, which is criterion 9 and is the property this
  task could most plausibly break

## Notes

**Migrations are immutable once applied.** The checksum hashes the whole file including
comments, and the 2026-09-05 story renumber already proved it by editing two applied files'
comments and getting `2 applied migrations have been edited since they were applied` on the next
deploy. So every comment in this file — every index's justification, every rejected column — has
to be right the first time, because it can never be corrected. That is a stronger reason to
think before writing it than the schema is.

---

## What was built, in plain terms — a status report

**Status: complete (2026-09-08).** Nothing on the screen changed. What changed is
that MarketPulse now has somewhere to put the prices.

### What this actually is

Until today the product knew _which_ 518 companies it watches, but had nowhere at
all to keep _what they did_. This task built that place: a single table called
`market_bars`, where every row is one company's price over one slice of time —
what it opened at, its high, its low, what it closed at, and how many shares
changed hands.

It is empty. Deliberately. Filling it is the next task, and splitting the two
apart matters because they go wrong in completely different ways: a badly shaped
table is a mistake you can only fix by throwing away every price you have
collected and starting again, while a badly written import is a mistake you fix
by running the import again. So the shape gets its own task and its own scrutiny.

### The decision everything else rests on

The hardest question here was deceptively small: **what makes two price
observations "the same"?**

The answer we settled on is _this company, this size of time slice, this
instant_. That is enforced by the database itself, which means the database will
physically refuse to store the same bar twice.

That one rule buys two things the product genuinely needs. If the overnight
import crashes halfway through, we can simply run it again from the start — the
prices already saved are silently rejected as duplicates rather than doubled up.
And a year of history stays a year of history rather than slowly inflating into
two years of the same year. Without it, "did that import work?" becomes a
question nobody can answer by looking.

### Three decisions worth explaining to a non-engineer

**1. We store prices in a format that cannot drift.** There is a fast, common way
for computers to store decimal numbers, and it has a notorious flaw: adding the
same set of numbers in a different order can give a different answer. That sounds
academic until you picture the consequence here — the same percentage change
showing two different values on two different screens, with no bug to find and
nothing to blame. MarketPulse's entire promise is that _the numbers come from
code, not from an AI's guesswork_ (§5.1 of the spec), so a number that disagrees
with itself is not a small defect, it is the promise failing. We use the slower,
exact format instead. Share volumes, being whole numbers of shares, are stored as
whole numbers — no rounding to worry about.

**2. Every bar records two different times, and mixing them up would quietly
destroy the flagship feature.** One timestamp is _when this happened in the
market_; the other is _when we wrote it down_. They are the same kind of thing to
a computer and completely different things to the product.

The reason this matters more here than anywhere else is Market Replay — the
feature the whole portfolio is built around, where you wind the clock back to
11:07 on some past morning and the system shows you only what was knowable _at
that moment_ (§21–§23). That filter runs entirely on the first timestamp. There
is a single word we could have added to this table's definition — a convenience
that would have filled that timestamp in automatically — and it would have
silently replaced "when it happened" with "when we imported it". Every replay
would then have shown a whole day's prices arriving at once, at the moment of the
import, and it would have looked plausible. We left it out, and there is now an
automated test whose only job is to fail if anyone ever adds it.

**3. We deliberately built almost no indexes.** An index is a shortcut that makes
one kind of question fast and makes every single write a bit slower. At fifty
million rows a year, "a bit slower" is a real cost, and it is the sort of thing
that gets added one at a time by well-meaning people until writing is slow and
nobody remembers why.

So the table has exactly one, and it is not an extra — it is a free side effect
of the duplicate rule above, and it happens to be arranged in precisely the order
the charts will want ("this company, this timeframe, this date range, oldest
first"). The obvious _second_ index — the one that answers "what did the whole
market do at 10:42?" — was left out on purpose, with a note naming the exact
future feature that will need it. There is a test that fails if an index appears
that nobody asked for.

### Two long-standing promises that are now actually checked

This repository keeps a written list of its own database conventions, split into
"things a machine checks" and "things only a human reviewer can catch". Two rules
had been sitting on the wrong side of that line for months, simply because
`securities` — the only table that existed — had no prices in it and no links to
other tables.

Rather than leaving them as good intentions, a previous task had planted a
**tripwire**: an automated test asserting that the database contained _no_ price
columns at all, with a message aimed at whoever eventually added one. This task
is what set it off. Both rules are now real, enforced checks rather than
paragraphs of prose — and the price check keeps a guard so it can never quietly
go back to passing by having nothing to look at, which is the failure mode the
tripwire existed to prevent in the first place.

### How we know it works

The table's definition, its interface in code, and the database's own report of
what it built are three separate descriptions of one thing, and they are all
compared against each other automatically. The database-backed test suite grew
from **61 tests to 96**.

More importantly, every one of those checks was **deliberately broken first** and
watched to fail. We added the dangerous automatic timestamp — four tests went
red. We switched the prices to the imprecise format — fourteen went red. We
renamed a column in one place and not the other — fourteen went red. We stored
share volume as money — four went red. Each break was then undone and the file
confirmed byte-for-byte identical. A test that has never been seen to fail is not
evidence of anything.

### One thing worth flagging for the record

The migration file that creates this table can never be edited again. The system
verifies that applied migrations have not changed since they ran, by fingerprint,
and it will refuse to deploy if one has — a safeguard that has already caught a
real mistake. That includes the comments. So the reasoning behind every column
and every rejected alternative had to be written correctly the first time, and it
lives permanently inside the file it describes.

### What this unlocks

- **Next task:** the import path that actually writes prices into this table.
- **Then:** a full year of history for all 518 companies (~50 million rows), and
  the first screen in the product that can honestly say _what data we hold_.
- **After that:** price and volume charts (§8.3), the anomaly detection that
  compares today's move against sixty days of history (§11), and eventually
  Market Replay.

Every one of those reads from this table. Getting its shape right today is what
stops all of them from being rebuilt later.
