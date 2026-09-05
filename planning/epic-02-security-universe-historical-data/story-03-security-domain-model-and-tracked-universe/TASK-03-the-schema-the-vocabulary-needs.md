# Task 2.3.3 — The schema the vocabulary needs: the first migration written by a reader of the conventions

**Status:** Complete
**Story:** [2.3 Security Domain Model & the Tracked Universe](STORY.md)
**Depends on:** Tasks 2.3.1 (the decisions) and 2.3.2 (the types the constraints back)

## Objective

Bring `securities` up to the vocabulary Task 2.3.2 fixed — the `status` check, whatever
the proxy distinction needs, and the provenance columns acceptance criterion 6 asks for —
and extend `pnpm test:database` so the new agreements are checked rather than stated.

This is also the first migration in this repository written by somebody **following**
`apps/backend/migrations/README.md` rather than writing it, which makes it the first
honest test of whether that document is usable. Record anything it failed to answer.

## Work

- **Write `0003_*.sql`** — one migration, following the naming rule (`NNNN_lower_snake_case
.sql`, a four-digit sequence and not a timestamp; a name that does not match is an error
  rather than a skipped file). **It is this repository's first non-additive migration, and
  that has to be argued rather than waved through**: Task 2.2.7 chose a step in
  `deploy.yml` before the container rolls, and that shape is survivable only because a
  migration leaves the database _ahead_ of the code — which is true of an added column and
  is **not** true of the `kind` widening below, which drops `'etf'` from the check
  constraint and so leaves the database able to store strictly less than before. It is
  safe here for two reasons that must both be stated in the file and will not both hold
  next time: `securities` holds **zero rows**, so there is nothing the tightened check can
  reject, and **nothing writes to the table at all** until Task 2.3.5's loader, which ships
  after this migration. Everything else in `0003` is additive. That convention is enforced
  by nothing, so the exception is worth a comment where the next author will read it
- **Add the `check` on `status`**, whose absence Task 2.2.4 recorded as deliberate and
  temporary: `status`'s vocabulary was Story 2.3's and did not exist, so a check would
  have been a vocabulary this story had to migrate rather than choose. It exists now.
  Note the two mechanical findings this constraint has to be written and checked against,
  both already produced: Postgres **rewrites** `check (x in (…))` into
  `CHECK ((x = ANY (ARRAY[…])))`, so a check on the constraint cannot be a string match on
  the migration's own text; and inside one transaction — which is what a migration is here
  — a Postgres `enum` cannot be extended and used, which is why this is `text` + `check`
- **Widen `kind` to `equity | sector_etf | index_etf`**, which is the shape Task 2.3.1
  chose. This is the migration Task 2.2.4's refusal of a Postgres `enum` was specifically
  protecting — inside one transaction an enum value cannot be added _and used_ — so say so
  in the file, because that decision was taken on an argument and this is the first time it
  pays. **There is no backfill**, and the absence is worth writing down rather than leaving
  a reader to look for the `update` this kind of migration usually carries: the table is
  empty, so it is drop-check, add-check, and nothing else. The dropped member is what makes
  it non-additive — see the bullet above
- **Add the two provenance pairs Task 2.3.1 chose** — `profile_source` /
  `profile_retrieved_at` and `classification_source` / `classification_retrieved_at`. Note
  what is deliberately absent and why, so it does not read as an omission: `cik`'s pair
  waits for Epic 9, which is what populates `cik`, because a column null in every row in
  every environment cannot be checked against anything; and `kind` and `status` get no pair
  at all, because "we decided this" is not a retrieval. Their nullability is its own small
  decision — `not null` is available only because the table is empty, and a default would
  be this migration inventing a source. Two things to hold
  while writing it. It is **metadata about a row's fields rather than a fact about the
  market**, so `migrations/README.md` §2's `observed_at` is still not the answer here and a
  defaulted one would still be the leak that convention forbids — but a _retrieval_
  timestamp per source plausibly is exactly what invariant 5 wants, and this is the first
  table with any claim on that pair. Decide it explicitly rather than by omission, the way
  Task 2.2.4 did. And it must be renderable by Story 2.13 without that story having to
  reverse-engineer it, so write down what it will read
- **Expect to create no foreign key, and say so rather than leaving it unmentioned.** Task
  2.3.1 closed both candidates: the sector-to-ETF mapping goes in `packages/shared` as a
  `Record` total over the taxonomy, and the separate `security_field_provenance` table was
  rejected in favour of columns. So the **foreign-key naming rule
  (`<table_singularised>_id`) that Task 2.2.4 recorded as untested stays untested**, and
  Story 2.7 inherits it. Record that explicitly — a convention that is silently still
  untested after the story that looked most likely to exercise it is exactly the kind of
  thing this repository's third class of gap is made of
- **Do not add an index for a query that does not exist.** Story 2.8 writes the first read.
  The exception worth arguing rather than assuming: the loader itself is about to look rows
  up by `symbol` on every run, and `symbol` already has a unique constraint with a btree
  behind it — which Task 2.2.4 verified is a `UNIQUE CONSTRAINT` and not a bare index, a
  distinction that matters to anything reading `pg_constraint`. So the loader probably
  needs nothing new; check rather than add
- **Update `apps/backend/src/schema.ts` in the same change**, because the compiler holds
  interface → spec (`TS1360` on a column added to the interface and not described in the
  test's expectation) and `pnpm test:database` holds spec → database, and the two together
  are the only thing standing between a renamed column and a run-time failure
- **Extend `pnpm test:database`**, which is where the checked-versus-prose line for this
  schema now lives. At minimum: the new columns' types, nullability and defaults read back
  from `information_schema`; the new `check` constraints parsed out of `pg_constraint` and
  compared against their `packages/shared` source of truth, the way `SECURITY_KINDS` already
  is. Note the two traps that suite already carries: **do not count `pg_constraint` rows**,
  because PostgreSQL 18 materialises `NOT NULL` as rows there and older majors do not, so
  the count is a statement about the engine rather than the schema; and read nullability
  from `information_schema`, which is stable across majors
- **Watch for a vacuous check.** Task 2.2.5 found that three of its conventions would have
  passed by having nothing to look at, and left a **tripwire** asserting zero `numeric`
  columns so the money rule fails open the moment `market_bars` arrives. Anything added
  here that is checked against an empty table is in the same position — say so, and prefer
  a check that fails loudly to one that certifies nothing
- **Apply it to an empty database and read the result back off the database**, not off the
  file, and apply it twice. Then confirm the checksum path is still clean, because this is
  the first migration added since Task 2.2.7 built it: `migration_checksum` should gain
  one row and the two existing ones should be untouched

## Done when

- `0003_*.sql` applies to a database holding `0001` and `0002`, and applying it again is a
  no-op — both observed
- Every closed vocabulary in `packages/shared` that the database also constrains is
  compared against the constraint's rewritten text by `pnpm test:database`
- `schema.ts` and the migration agree, held by the compiler in one direction and the
  database suite in the other
- The `observed_at` question is answered explicitly for the provenance columns, either way
- Any convention this table still cannot exercise is named as untested
- `pnpm verify` passes with no database running

## Notes

The failure this task is most likely to produce is a migration that is correct and a
`schema.ts` that is not, because the two are edited in one change and only one of them is
read by `tsc`. That is the whole reason Task 2.2.5's suite exists; run it before believing
the migration.

---

## What shipped

`apps/backend/migrations/0003_security_vocabulary.sql` (new),
`apps/backend/src/schema.ts`, `apps/backend/src/migrate.database.test.ts` and
`apps/backend/migrations/README.md`. **No dependency, no lockfile change, no new
script, no new `verify` step.** `pnpm verify` is **exit 0 with the database
stopped**; `pnpm test:database` is **37**, up from 23.

The migration does four things: widens `kind`, adds the `status` check `0002`
deferred, adds a `sector` check and a cross-column invariant, and adds the two
provenance pairs. It was applied to an empty database, applied again as a no-op,
and **every result read back off the database rather than off the file**.

### The brief's premise about Task 2.2.7 is wrong, and that is the first finding

This task's own Work section says the non-additive `kind` widening "is
survivable only because Task 2.2.7 chose a step in `deploy.yml` before the
container rolls", and tells this task to "confirm the checksum path is still
clean, because this is the first migration added since Task 2.2.7 built it —
`migration_checksum` should gain one row".

**None of that has happened.** Checked rather than assumed:

- `planning/.../story-02-.../TASK-07-migrate-the-deployed-database.md` reads
  **Status: Not started**, as does 2.2.8.
- `.github/workflows/deploy.yml` contains **no migration step**; `grep` for
  `migrat` returns nothing.
- There is **no `migration_checksum` table and no checksum mechanism anywhere** —
  `migrate.ts` has no such string. Task 2.2.5 weighed a stored hash and
  **declined** it as a second bookkeeping mechanism with a bootstrap ordering
  problem, and Task 2.2.6 confirmed the consequence by producing it (an edited
  applied migration reports `Already up to date` at exit 0 over a database
  missing the change).
- The **deployed database has never had a migration applied to it at all.**

Story 2.3's task split put 2.3.2–2.3.6 before the deployed database is touched,
and Story 2.2 was left at 2.2.6, so this task's brief was written against a
future that has not arrived. Two things follow and both are in `0003`'s header
rather than only here. The checksum verification is **unrunnable** and is not
reported as done. And the non-additive statement is **not licensed by a deploy
shape somebody already chose** — it is safe on its own two reasons, and it is a
**constraint on Task 2.2.7** rather than a consequence of it.

### The non-additive migration, argued rather than waved through

Dropping `securities_kind_check` and replacing it with a narrower one removes
`'etf'`, so the database ends this migration able to store strictly **less** than
before. That breaks the usual safety property of migrating ahead of the code: an
added column is invisible to code that has not heard of it, and a tightened
constraint is not.

It is safe here for **two reasons that must both hold and neither of which will
hold next time**, both stated in the file: `securities` holds **zero rows**, so
the constraint's validation of existing rows has nothing to do; and **nothing
writes to this table at all** until Task 2.3.5's loader, which ships after this
migration, so there is no deployed code holding the string `'etf'`. There is
**no backfill**, and the absence is written down rather than left for a reader
to hunt for the `update` such a migration usually carries — the table is empty,
so it is drop-check, add-check, and nothing else. The general rule that survives:
**a migration that narrows what the database accepts is only safe while nothing
deployed writes the values being removed**, which stops being true of this table
the moment 2.3.5 exists.

**Task 2.2.4's refusal of a Postgres `enum` paid for the first time, and it was
confirmed rather than cited.** README.md §1's table says that inside one
transaction an enum value can be added but not added _and used_, and cannot be
removed at all. As an enum the two statements below could not have been written;
as `text` + `check` they are two lines. The decision was taken on that argument
in the abstract; it held.

### Four constraints, and two of them the brief did not name

`kind` and `status` were asked for. The other two were added, and each is
argued in the file rather than slipped in:

- **`securities_sector_check`.** `0002` left `sector` a bare `text` because the
  taxonomy did not exist. It does now — eleven members in `SECTORS` — so by
  README.md §1's own rule it is a closed set and gets a `check`. Leaving it
  unconstrained while `kind` and `status` are constrained would be an
  inconsistency somebody later has to explain, and it is the column with the
  most expensive silent failure: Epic 5 indexes `SECTOR_ETFS` with this value,
  so an unrecognised sector is a security with no benchmark. **`industry`
  deliberately gets no check** — it has no ETF, therefore no benchmark, therefore
  no closed set to be a source of truth for, and a constraint over a list nobody
  maintains refuses correct data.
- **`securities_sector_matches_kind`** — `sector` is null exactly when `kind` is
  `index_etf`. Task 2.3.2 made `Security` a discriminated union precisely because
  the nullability has two meanings; without this the database would permit a
  state the type system says cannot exist, which is the gap `UNIVERSE.md` §2
  rejected the "second nullable column" shape to avoid, arriving through a
  different door.

**This is not acceptance criterion 3, and the file says so.** That criterion's
second half — every sector _present_ has a corresponding sector ETF — is a
statement about the whole table, and Task 2.2.4's refusal to encode it as a
row-level check still stands: a row-level check can express only the first half
and would read as though it enforced the rule. What `securities_sector_matches_kind`
expresses is the **union's own shape**, which is a row-level fact. The
table-level half stays Task 2.3.5's.

### Provenance: `not null`, no default, and two groups deliberately absent

`profile_source` / `profile_retrieved_at` and `classification_source` /
`classification_retrieved_at`.

**`not null` with no default is the enforcement half of acceptance criterion 6.**
A `default 'curated'` would make the schema a place provenance _can_ go rather
than one that requires it, and would silently attribute a provider's row to a
file. The consequence is deliberate: **Task 2.3.5's loader cannot insert a row
without saying where the data came from**, and a test asserts exactly that. Note
also what this shape costs later — `not null` with no default is only available
against an empty table, so a future table gets its provenance columns in its own
`create table`, and that is now in README.md §2.

`identity` (`cik`) and `ours` (`kind`, `status`) get **no columns**, and their
absence is asserted rather than merely intended: a test checks that
`cik_source`, `kind_source` and `status_source` do not exist, with a message
pointing at the migration. `cik`'s pair waits for Epic 9 because a column null in
every row in every environment cannot be checked against anything; `kind` and
`status` get none because "we decided this" is not a retrieval and a
`retrieved_at` on a judgement is a timestamp pretending to be evidence.

**The `observed_at` question is answered explicitly, in the migration, in
`schema.ts` and in README.md §2.** There is still none, and the reasoning is
unchanged: a security's sector is not a fact about the market at an instant.
What _is_ new is that `*_retrieved_at` is the first thing in this schema with a
real claim on invariant 5's evidence pair and it takes only half — a retrieval
timestamp with **no event timestamp beside it, because there is no event**. That
is a genuine half-pair rather than an omission. It is also not `recorded_at`:
that is when we wrote the **row**, and a loader re-run against an unchanged
curated file is exactly when the two differ. A test asserts `observed_at` is
absent and `recorded_at` present, and it is written so that Story 2.7's
`market_bars` makes whoever adds `observed_at` read the comment.

### No foreign key, and the naming rule is now recorded as still untested

Task 2.2.4 recorded `<referenced_table_singularised>_id` as untested and Story
2.3 looked like the story that would exercise it. **It did not**, and both
candidates were closed deliberately by Task 2.3.1: the sector-to-ETF mapping went
to `packages/shared` as a `Record` total over the taxonomy rather than becoming a
`sectors` table, and `security_field_provenance` was rejected in favour of
columns. So `market_bars.security_id` in Story 2.7 inherits it, and that is now a
paragraph in README.md's prose list rather than an omission — a convention that
quietly survives the story that should have tested it is exactly this
repository's third class of gap.

### No index, checked rather than assumed

README.md's rule is that an index chosen before there is a query to serve is a
guess with a write cost. The one candidate was checked: Task 2.3.5's loader looks
rows up by `symbol` on every run, and `symbol` already carries a `unique`
constraint with a btree behind it — which Task 2.2.4 verified is a `UNIQUE
CONSTRAINT` rather than a bare index. **The loader needs nothing new.** Story
2.8 writes the first read and can size an index against a query that exists.

### What the database suite gained, and every check was made to fail first

**23 → 37 tests.** The single-vocabulary `SECURITY_KINDS` describe became
**table-driven** over all three closed sets, because `0003` took this schema from
one to three and the next table will add more; the spec array is the thing to
extend. `insertProbe()` supplies a valid equity and each test overrides only the
field it is trying to break, which is what stops a constraint test passing
because a _different_ constraint refused the row first — and every one asserts on
the **constraint's own name**.

Four deliberate breaks, each seen to fail and reverted:

| Break                                                   | Result             |
| ------------------------------------------------------- | ------------------ |
| `securities_status_check` removed from the migration    | **3 failed** \| 34 |
| A twelfth sector in `packages/shared` with no migration | **1 failed** \| 36 |
| Provenance columns made nullable                        | **2 failed** \| 35 |
| `securities_sector_matches_kind` removed                | **3 failed** \| 34 |

Two of those are worth reading. The nullable break fails **twice** — the
provenance-required test and `schema.ts`'s nullability agreement — which is the
two directions working. And the cross-column break fails a **third** test,
because with the constraint gone the two probe rows that should have been refused
_succeed_ and the positive test's row count reads 4; that was tightened
afterwards so the positive test clears the table first, since a wrong count
pointing at the wrong test is worse than one failure.

**The vacuity trap was watched for.** Every constraint test above is negative,
and a constraint that refused _everything_ would pass all of them. The positive
test — an index proxy with no sector and a sector ETF with one, both inserted and
accepted — is what stops that, and it is the same class of blind-green result
Task 2.2.5's `numeric` tripwire exists for. That tripwire is untouched and still
green: `securities` gained two `timestamptz` columns and no `numeric`.

### Read back off the database rather than off the file

Applied to a database holding `0001` and `0002`: `✓ 0003_security_vocabulary` /
`Applied 1 migration.` at exit 0. Applied again: `Already up to date` at exit 0.
`kysely_migration` holds exactly the three names, and `securities` holds **0
rows** — seeding is Task 2.3.5's.

The four constraints as Postgres holds them, which is not what the migration
says:

```
securities_kind_check          | CHECK ((kind = ANY (ARRAY['equity'::text, 'sector_etf'::text, 'index_etf'::text])))
securities_sector_check        | CHECK ((sector = ANY (ARRAY['technology'::text, … 'materials'::text])))
securities_sector_matches_kind | CHECK ((((kind = 'index_etf'::text) AND (sector IS NULL)) OR ((kind <> 'index_etf'::text) AND (sector IS NOT NULL))))
securities_status_check        | CHECK ((status = ANY (ARRAY['active'::text, 'untracked'::text])))
```

Fifteen columns, with the four new ones `NO` on `is_nullable` and `column_default`
empty. **One mechanical detail worth knowing:** `alter table … add column`
appends, so the provenance columns sit _after_ `updated_at` in the database while
`schema.ts` lists them before `recorded_at`. The suite compares column **sets**
rather than ordinals, so this is harmless — but a check written against
`ordinal_position` would be asserting the order migrations happened to run in.

### What the conventions document failed to answer

The brief asks this, as the first honest test of README.md by somebody following
it rather than writing it. It answered nearly everything; three gaps:

1. **It has no rule for a cross-column constraint.** §1 covers closed sets, §2
   timestamps, §3 identifiers — nothing says whether an invariant spanning two
   columns belongs in the database, in the type, or in the loader. `0003` needed
   one and had to argue it from first principles. A row was added to the checked
   list.
2. **It says nothing about provenance columns**, which is understandable —
   `securities` is the first table with any — but it meant the `not null`,
   no-default and naming decisions had to be taken against `UNIVERSE.md` §4
   rather than against a convention. §2 now carries them, including the
   consequence that the shape is only available on an empty table.
3. **Its §5 still lists `delisted` as an example `status` member** (`active`,
   `delisted`, …), written before Task 2.3.1 deferred that member to Story 2.6.
   Left as it is: it is an illustration of what a status column holds rather than
   a claim about this one, and the vocabulary's real source of truth is
   `SECURITY_STATUSES`.

## Status report for a non-technical reader

**In one sentence: the database now enforces the vocabulary we agreed last step,
so a wrong value is refused rather than stored.**

The previous step wrote the dictionary — what a "security" is, the eleven
sectors, the two ways we can be tracking something. That dictionary lived only in
the code. This step taught the database the same words, so there are now two
independent guards rather than one: the code refuses bad data when it is written,
and the database refuses it if anything ever gets past the code.

**Four rules the database now enforces on its own:**

1. **A security is a company, a sector fund or a market fund** — nothing else.
   The old, vaguer word "ETF" has been removed.
2. **A security is either actively tracked or explicitly untracked.** Nothing
   else, and in particular the database will not accept "delisted" yet, because
   we have no way to _know_ a company has been delisted until we start talking to
   the market-data provider. Saying so out loud in the database is better than
   accepting a word nothing can produce.
3. **A sector must be one of our eleven.** This is the one that quietly matters
   most: every sector we track is paired with a benchmark fund, so a
   made-up sector would be a company with nothing to compare it to — and the
   product's central question is exactly that comparison.
4. **A company must have a sector, and a whole-market fund must not.** This is
   the rule that stops a company slipping in unclassified. It is deliberately
   two-sided: the database also refuses a market fund that arrived carrying a
   sector, because that would mean somebody had misunderstood which kind of thing
   they were adding.

**And one new obligation.** Every security row now has to say **where its
information came from and when we looked it up** — separately for its name and
exchange, and for its sector and industry, because those genuinely come from
different places. There is no default. That is deliberate and it is slightly
inconvenient on purpose: whoever writes the loading program _cannot_ skip it. One
of MarketPulse's founding principles is that evidence is shown rather than
implied, and that principle is worth nothing if the very first table can hold
data of unknown origin. It also gives us something honest to display later: "this
company's sector was last checked on such-and-such a date."

**Two things we chose not to do, so they are not mistaken for oversights.** We
added no speed-up indexes, because nothing reads this table yet and an index
built for an imaginary query costs something on every write for nothing. And we
recorded, in writing, that one of our own naming conventions is _still_ untested
after the story we expected would test it — better to write that down than to let
it quietly look covered.

**One planning correction worth flagging.** This task's instructions assumed an
earlier piece of work had already been done: deciding how migrations run against
the live production database, and adding a safety checksum. Neither has happened
— that work was deferred while we got the security list right first. So we
checked rather than assumed, and recorded it: this change is safe on its own
merits (the table is empty and nothing writes to it yet), and it now sets a
constraint on that deferred work rather than depending on it. The live database
is untouched and remains untouched by design until later in this story.

**Where this sits in the plan.** Epic 2 is the foundation: a list of companies to
watch, and their price history. The dictionary exists, and now the database
enforces it. The next step is the genuinely commercial one — choosing the roughly
100 companies MarketPulse will actually track, which decides whether the finished
demo has anything interesting to show. After that comes the program that loads
them, and then price history.
