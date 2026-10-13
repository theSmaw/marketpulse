# Task 5.1.5 — Point-in-Time Universe Membership

**Status:** **Implemented — 2026-10-13.** `0012_security_memberships.sql`, a
metadata-only `create table` with a real `references securities (id)` and no
`on delete`; `effective_from` carries **no default** and is dated by the curated
file's own `checkedOn`. `pnpm universe` is its only writer and appends one row
per security whose status differs from the last row we hold — **516 opening
intervals on the first run and zero on every run after it, asserted**. The full
cycle (`active` → `untracked` → `active` on one `id`, three intervals, nothing
overwritten) runs through `loadUniverse()` in
`load-universe.database.test.ts`. `pnpm test:database` **237 passed (7 files)**;
build, lint, format:check, test (2,945) and `pnpm invariants` (57) green. Two
plants were produced and both went red for the right reason. **Done-when 4 (the
lock rehearsal) and 7 (Epic 13's `EPIC.md`) are the orchestrator's and are
OPEN.**
**Story:** [5.1 The Decisions, the Adjustment, & `Relative performance` Drawn](STORY.md)
**Depends on:** 5.1.4

## Objective

**`CLAUDE.md`'s invariant 4 gained a dated qualification on 2026-10-12 that
names anomaly scores explicitly, and this task is the only thing in the
roadmap that can discharge it.**

`currentMarketState` and `trackedTickers()` filter on `status = 'active'`
against the universe **as it stands now**, and the store records **no
point-in-time membership at all**. So a replayed aggregate computes over today's
roster while claiming to describe a past session — present information reaching
a replayed past, in the one place the invariant promises it cannot.

**Task 2.3.9 is the first real instance**: `PSKY` and `WBD` were untracked on
2026-10-12, so **a replay of any session before that date computes over 516
names when 518 were tracked.** And for a _ranked list of scored securities_ the
failure is worse than an off-by-two count — it can show a security in a
position implying it was the most unusual thing in a market it was not part of.

**The cost of deferring is not effort.** `CLAUDE.md`'s own words: the data
_"does not exist and cannot be reconstructed: it can only be written from the
day somebody starts writing it, so the cost of deferring is not effort, it is
history that is never recoverable."_

## What the user can see when this lands

**Nothing.** No screen changes and no new figure. It pays off in Epic 13, and
it is scheduled here because every day it is not written is a day of history
that cannot be bought back. The universe last changed on **2026-10-12**.

## Work

- **A history table rather than two columns, and the reason is correctness
  before it is cost.** `tracked_from` / `tracked_to` hold **one** interval, and
  `untrackAbsent`'s own docblock describes a row flipping **back** to `active`
  on its original `id` — so a symbol untracked and re-added needs a second
  interval and the two-column shape would have to lose the first or grow an
  array. **An append-only history is the shape of the fact**, and what a replay
  asks — _which securities were tracked on this date_ — is a range query against
  a history rather than two columns on the current row.
- **The lock profile, which is the second reason.** `ALTER TABLE securities ADD
COLUMN` takes `ACCESS EXCLUSIVE` whatever it costs, and **every
  `insert into market_bars` takes `ACCESS SHARE` on `securities` to validate its
  foreign key** — so the live bar writer, running once a minute for 6.5 hours a
  day **inside the deploy window**, holds locks on the one table every route
  reads. Postgres queues later requests **behind** a waiting exclusive one, and
  neither `lock_timeout` nor `statement_timeout` is set anywhere in this
  repository. `CREATE TABLE` touches `securities` only to install an FK trigger,
  which does not conflict with `ACCESS SHARE`.
- **The exact-list assertions the column shape would have fired**, recorded
  because they are why the cheaper-looking option is not cheaper:
  `migrate.database.test.ts`'s _"describes every column of securities, and no
  column it does not have"_, which would demand four coordinated edits — the
  migration, `SecuritiesTable` in `schema.ts`, `EXPECTED_SECURITIES`, and the
  per-column `it.each` — plus two silent ones: `WRITTEN_COLUMNS` and the
  hand-written `is distinct from` tuple in `load-universe.ts`, whose own comment
  warns that forgetting it means _"an edit to that column stops moving
  `updated_at`."_
- **What the loader writes.** One row per transition, **inside the existing
  transaction**, from information it already selects: it reads
  `before = [{symbol, status}]` and `untrackAbsent` returns exactly the symbols
  that moved. A reactivation is `before.status === "untracked" && symbol ∈ file`.
- **`effective_from` and `recorded_at` are two columns and must not be
  conflated** — invariant 5's event timestamp against the write timestamp, which
  on a daily loader are a day apart. **A `default now()` on `effective_from` is
  the exact leak `0002`'s decision 3 and `market_bars`' convention forbid**: it
  would turn the column a replay keys on into a record of when we ran a script.
- **The loader's steady-state property must survive**: a run over an unchanged
  universe writes **nothing** and moves no `updated_at`.
- **The schema-wide conventions to satisfy**: `id bigint generated always as
identity`, `timestamptz` only, no float, no `created_at` / `deleted_at` /
  `is_deleted` / `archived_at`, counts as `bigint`, money as `numeric(18,6)`.

## Done when

1. A membership history table exists, forward-only, with `effective_from` and
   `recorded_at` as separate columns and **no default on `effective_from`**.
2. `pnpm universe` writes one row per transition inside its existing
   transaction, and **a run over an unchanged universe writes nothing** —
   asserted, not argued.
3. A reactivation — `untracked` → `active` on the original `id` — produces a
   **second interval** rather than overwriting the first, with a database test
   that performs the full cycle.
4. The migration's lock behaviour is **rehearsed against the populated store**
   with the instrument Task 3.7.6 used, and the figure recorded. The lock
   reasoning in this task is from the documented conflict matrix and is **not a
   measurement**; the rehearsal is minutes.
5. The decision between a foreign key and a bare `security_id` is **taken with
   its reason recorded** — the naming convention and three precedents say
   `references securities (id)`; the lock profile prefers none; and `0003`
   already set a no-FK precedent with its reasoning written down.
6. `pnpm test:database` green with its numbers; `pnpm verify` green; the
   migration is **metadata-only at deploy time** and says so.
7. **Epic 13's `EPIC.md` is amended** to say the data now exists from
   2026-10-13 onward and that **sessions before it cannot be answered** — in
   words that epic can act on, not a link back.

---

## What was done — 2026-10-13

### The table

`apps/backend/migrations/0012_security_memberships.sql` —
`security_memberships (id, security_id, status, effective_from, recorded_at)`.
`id bigint generated always as identity primary key`, both timestamps
`timestamptz`, `status text` with a `check` against `SECURITY_STATUSES`, no
`updated_at` (nothing here is ever updated), no float, no banned name. The
schema-wide checks in `migrate.database.test.ts` cover it by construction — it
is inside their sweep rather than beside it.

**Append-only is held in the type system as well as in the prose.** Every column
of `SecurityMembershipsTable` in `schema.ts` has `never` as its update
parameter, so there is no `updateTable("security_memberships")` call that
compiles. A correction is a further row.

### Done-when 5 — the foreign key, decided: TAKE IT

`security_id bigint not null references securities (id)`, **no `on delete`**.
The reasoning is in the migration's §3 and in one line here: the naming
convention plus three precedents (`market_bars`, `bar_coverage`,
`bar_attempts`) mean a bare `security_id` would be the first column in this
schema that _looks_ like a foreign key and is not, which is the worst available
shape because the name is what a reader checks; the lock argument that prefers
none **does not apply to a `create table`**, which takes `SHARE ROW EXCLUSIVE`
on the parent to install triggers and validates nothing (the new table has no
rows), and `SHARE ROW EXCLUSIVE` conflicts with neither the `ACCESS SHARE` of a
read nor the `ROW SHARE` an FK-validating `insert into market_bars` takes; and
what decided it is what the table is _for_ — a row pointing at a `security_id`
that does not exist is a replay computing over a security this product has
never heard of, the same class of silent wrongness the table exists to remove.

**`0003`'s no-FK note is not a precedent against one**, and the task file's
summary of it is worth correcting: read `0003_security_vocabulary.sql`'s closing
section, it records that both _candidates_ were closed by Task 2.3.1 so
`securities` had nothing to reference, and hands the untested naming rule
forward. It declined nothing.

Its consequence is now a fact about the schema rather than a convention:
**`delete from securities` is refused for any security whose membership we have
written down.** §12.1 and `migrations/README.md` §5 already refused that
operation in writing. Two existing tests that deleted a probe row had to learn
it (`forget()` in `load-universe.database.test.ts`).

### What the loader writes, and the one place the task file's plan was wrong

`recordMemberships` in `load-universe.ts`, called **last inside the existing
transaction** so the statuses it reads are the ones this run has just written.

**The rule is a state diff, not the transition feed the task file specified**,
and the difference is decisive rather than stylistic. The task file says to
derive the rows from `before` and `untrackAbsent`'s return value — information
the loader already has. That writes the right rows for every _future_ change and
**writes nothing at all for the 516 securities already in the deployed store**,
because a run over an unchanged universe changes nothing: the table would have
stayed empty until the next universe edit, and a replay of any date would read
no intervals and conclude that nothing was tracked. The opening interval has to
come from the **state** rather than from the diff, and once it does the diff is
redundant — so the shipped rule is one sentence: _append a row for every
security whose status differs from the latest row this table already holds for
it_. It is also self-healing, which the diff is not: a run interrupted before
this point leaves the next run exactly the same work.

The opening rows are written by `pnpm universe` rather than by the migration,
per `migrations/README.md` §7 (data in a migration cannot be corrected) — which
is also what keeps the migration metadata-only.

### `effective_from` — the value, which was a decision the task file left open

**The curated file's own `UNIVERSE_PROVENANCE.profile.checkedOn` at UTC
midnight, never the clock.** It is the instant `profile_retrieved_at` already
carries and the one `load-universe.database.test.ts` already asserts as a
decision — _from the file rather than the clock_. Membership is a fact about the
**list**; the list dates itself, and the deploy that picks an edit up is our
latency rather than a fact about the universe. On the deployed store that makes
the two columns genuinely a day or more apart (`2026-10-12T00:00:00Z` against
today's write), which is the separation the task file asks for.

**No default on the column, which is the whole point**, and two things follow
that are decisions rather than omissions, both argued in the migration's §5:

- **No `unique (security_id, effective_from)`.** It looks like a free integrity
  win and it would fail a deploy: an untrack and a re-add inside one curated
  revision share a `checkedOn` date, and the collision would land on
  `pnpm universe` inside `deploy.yml`. The resolution rule is
  `order by effective_from, id` instead, and a database test asserts that two
  transitions at one instant are accepted and read back in insertion order.
- **No index at all.** `migrations/README.md`'s own rule: the query that will
  want one — the latest row at or before a date, per security — is Epic 13's and
  does not exist, and the table is hundreds of rows, which is `bar_coverage`'s
  argument rather than `market_bars`'. The condition for adding one is the first
  replayed aggregate that reads this table at a cadence, with the query written
  beside it.

### The limit nothing can repair, stated because Epic 13 must not fall back

**Nothing before the first row is answerable.** The 2026-09-08 universe and the
2026-10-12 untracking of `PSKY` and `WBD` are not recoverable from anything this
product holds. A replay of a session before the first `effective_from` must say
so rather than compute over today's roster — which is the whole failure this
table exists to prevent, arriving one step earlier. Done-when 7 puts that in
Epic 13's own words.

And one case the state diff cannot see, recorded rather than discovered: a
`securities.status` changed by something that is not this loader **and changed
back** before the next run leaves no row, because the present and the history
agree. Nothing in shipped code writes that column except the loader
(`UNIVERSE.md` §12.1, §15.3), so the reachable case is a hand-run `update`. An
event feed would not see it either — it would record two rows saying nothing
happened.

### Two names, and why one of them is not `observed_at`

`migrations/README.md` §2 reserves `observed_at` for _when the thing was true in
the market_ and calls it a reserved name rather than a suggestion, "a table that
calls it something else is a table the seam cannot cover". This table calls it
something else **on purpose**: a membership change is a fact about **us**
(`UNIVERSE.md` §3), and there is no instant at which the market decided we track
a symbol. The cost is real and is now written in §2 of that document rather than
left for a reader to hit: **a temporal plugin that filters generically on
`observed_at` does not cover `security_memberships`**, so Epic 13's membership
read has to be passed the replay clock explicitly, the way `closesAsOf` already
is.

### The gates

```
pnpm build          exit 0
pnpm lint           exit 0   (eslint . --max-warnings 0)
pnpm format:check   All matched files use Prettier code style!
pnpm links          557 documents, 1819 cross-file links, 39 anchor links, 0 broken.
pnpm invariants     57 invariants hold.   (plus Epic 4's standing 4.7 waiver line)
pnpm test           packages/shared 440 · apps/backend 1047 · apps/frontend 1458
                    — 160 files, 2945 tests, 0 failed, no `Unhandled Errors` block
pnpm test:database  Test Files 7 passed (7) · Tests 237 passed (237) · 3.71s
```

`pnpm e2e`, `pnpm probe` and `pnpm verify` were not run: no browser behaviour,
no layout and no frontend file is touched by this change.

### Red for the right reason, twice

A check that has never failed has never been tested, and neither of these is a
`pnpm break` entry (no invariant was added), so both were produced by hand and
reverted.

1. **The state diff replaced by `.filter(() => true)`** — the loader writes a
   row for every security on every run. Four tests red with assertion failures
   and the other 17 still collecting: `expected 5676 to be 516`,
   `expected 6708 to be 6192`, `expected [ 'active', 'active', 'active', …(9) ]
to deeply equal [ 'active' ]`, and the output line appearing on a steady-state
   run.
2. **`effective_from timestamptz not null default now()`** — three tests red:
   `expected 'now()' to be null` twice, and
   `promise resolved "Result{ command: 'INSERT', …(9) }" instead of rejecting`
   for the insert that omits the column. The file was restored and its bytes
   re-checked; it has never been applied to any store but the test suite's own.

### Still open, and owned elsewhere

- **Done-when 4 — the lock rehearsal against the populated store.** Not run
  here: it needs the developer's real store, which this suite deliberately never
  touches. Task 3.7.6's instrument was **three concurrent `psql` sessions** —
  A holding an open transaction that had inserted into the subject table, B
  running the migration's statement shape, C an ordinary read arriving two
  seconds later — read through `pg_stat_activity` / `pg_locks` for
  `wait_event_type: Lock`, `wait_event: relation` and the elapsed grant time. It
  was a hand-driven rehearsal rather than a script; nothing in `scripts/`
  survives from it. What is worth rehearsing here is narrower than its subject
  was, because the lock is on `securities` rather than on `market_bars` and the
  statement validates nothing: A = an open `recordSeries`-shaped transaction
  that has inserted into `market_bars` (which takes `ROW SHARE` on `securities`
  for its foreign key), B = `pnpm migrate` applying `0012`, C = a
  `GET /securities`-shaped read. The claim being tested is that B does **not**
  queue behind A, because `SHARE ROW EXCLUSIVE` does not conflict with
  `ROW SHARE` — the reasoning above is from the documented conflict matrix and
  is **not a measurement**.
- **Done-when 7 — Epic 13's `EPIC.md`**, which must say that the data exists
  from 2026-10-13 onward, that earlier sessions cannot be answered, and that the
  read takes the replay clock explicitly because the column is not
  `observed_at`.

### Documents swept the same day

- `apps/backend/migrations/README.md` — §2 gains the fourth timestamp name with
  its reason and its cost; the **Checked** table gains the row for
  `effective_from` having no default.
- `UNIVERSE.md` §12.2 — the **Replay / Epic 13** row's `No` was the whole answer
  and was incomplete. Amended, dated, with the two limits and the delete
  refusal; the original row is left standing.

## The orchestrator's half — 2026-10-13

Done-when 4 and 7, plus the one question the implementation left open.

### Done-when 4 — the lock rehearsal, against the populated store

Task 3.7.6's instrument does not survive in `scripts/` (it was three hand-driven
`psql` sessions), so it was re-performed by hand against the **developer's own
populated store**, 11 migrations deep with `market_bars` loaded:

- **A** — an open transaction that has inserted into `market_bars`, held 30 s.
  What it actually holds, read out of `pg_locks` rather than argued:

  ```
  RowExclusiveLock|market_bars|t
  RowShareLock|securities|t
  AccessShareLock|securities|t
  ```

  **`ROW SHARE`, not `ACCESS SHARE`** — this task's own Work section (line 48)
  says the latter, and it is wrong in the direction of being weaker. The
  conclusion survives untouched, because `SHARE ROW EXCLUSIVE` conflicts with
  neither, but anybody re-deriving the matrix should start from `ROW SHARE`.

- **B** — the migration's statement shape (`create table … references securities
(id)`), run while A held those locks: **granted immediately, 5.324 ms**, in a
  transaction that was then rolled back. The real `pnpm migrate` applying `0012`
  also completed while A was holding.

- **C** — an ordinary `select count(*) from securities where status = 'active'`
  arriving after B: **1.049 ms**, `516`, never blocked.

**Against Task 3.7.6's figures on `market_bars`, which is why the shape of this
migration was chosen**: a migration waited **18.16 s** behind one open write
transaction and an ordinary read waited **16.16 s** behind _it_, against a 0.09 s
baseline. Here it is **5.324 ms** and **1.049 ms**. Nothing queued, because
nothing takes `ACCESS EXCLUSIVE` on `securities`.

### And the loader was rehearsed on the real store, which the suite cannot do

`pnpm test:database` builds its own database; this is the 516-security store with
bars in it.

- **First run after the migration: 518 rows** — 516 `active` and 2 `untracked`
  (`PSKY` and `WBD`, which Task 2.3.9 untracked) — every one dated
  **2026-10-12**, the curated file's own `checkedOn`, not the clock.
- **Second run: nothing**, and no membership line in the report. The steady-state
  property holds on real data rather than on a fixture.

That is also the evidence for the implementation's **first finding**, which is
the one worth carrying: this task's own Work section prescribed writing from
`before` and `untrackAbsent`'s return — _information the loader already selects_
— and **both see only what the run changed**. On a store whose universe has not
moved, that is nothing, so none of the 516 would ever have got an opening
interval and **the table would have shipped empty**, with every replay reading
no rows and concluding nothing was tracked. The shipped rule is a **state diff
against the history**, which produces the opening intervals, is self-healing, and
makes the prescribed rule redundant rather than wrong.

### `effective_from` — the question the implementation could not answer from the documents

**Kept: the curated file's own `UNIVERSE_PROVENANCE.profile.checkedOn`, at UTC
midnight**, rather than the transaction clock. Membership is a fact about the
list, the list carries its own date, and the deploy that picks an edit up is our
latency rather than a fact about the universe — which is also the precedent
`profile_retrieved_at` already sets and that `load-universe.database.test.ts`
already asserts as a decision. The rejected alternative is defensible on a
different argument (membership is a fact about **us**, so the event _is_ the
write) and would be more accurate for a removal deployed a day late; it is one
line and three assertions if it is ever preferred.

**The coupling it creates, which is worth a trigger.** The instant comes from
`profile.checkedOn` and there is a **second** `checkedOn` in the same record —
`classification.checkedOn`, still at 2026-09-08 — so a membership change driven
by anything other than a profile re-check would carry a stale instant.
**Reversal trigger: the first universe edit that changes a security's `status`
without moving `profile.checkedOn`.**

### Done-when 7 — Epic 13

`planning/epic-13-market-replay/EPIC.md` gains a hand-off section beside the one
Epic 4's close left there, in words that epic can act on rather than a link back.
Three things it must do: **refuse** a replay of any session before 2026-10-12
rather than fall back to today's roster, because the history starts there and an
empty read is a refusal and not an empty set; pass the replay clock
**explicitly**, because the column is deliberately not `observed_at` and a
generic temporal plugin will not cover this table; and know that the index its
query will want is deliberately absent, with the condition for adding it stated.

`CLAUDE.md`'s invariant 4 qualification is amended in the same change — the live
claim that the data _does not exist_ is now false in part, and the part that is
still true (history begins on 2026-10-12) is what the amendment keeps.

### Gates

- `pnpm verify` — **exit 0**, `57 invariants hold.`
- `pnpm test:database` — **7 files, 237 tests passed**.
- The lock rehearsal and the two loader runs above, against the populated store.

## For a stakeholder — a status report, 2026-10-13

**Nothing changed on any screen, and this is the task in the story that could not
be deferred.**

The product has always filtered its market-wide calculations to _the securities
we track now_. That is correct for a live screen and wrong for a replay of a past
day: on 12 October two securities were dropped from our list because the data
vendor had never heard of them, so replaying any day before that would compute
over 516 names when 518 were tracked — and for a ranked list of unusual
securities that is worse than an off-by-two, because it can show a security as
the most unusual thing in a market it was not part of.

The fix is a small table recording when each security entered or left the list.
The reason it was built now, two epics before anything reads it, is that **the
answer cannot be reconstructed later** — it can only be written from the day
somebody starts writing it, so every day of delay was a day of history gone for
good. It now holds 518 rows, dated by our own list rather than by the clock.

Two things were checked rather than assumed. The new table was created while a
transaction was deliberately holding locks on the securities table — the
situation that exists for six and a half hours of every trading day, inside the
deploy window — and it completed in **5 milliseconds** with an ordinary read
behind it taking **1 millisecond**. The last time this product measured a
migration in that situation, the migration waited **18 seconds** and the read
behind it waited **16**. And the loader was run twice against the real store: the
first run wrote the history, the second wrote nothing at all, which is the
property that makes it safe to run on every deploy.

**What it deliberately does not do:** it says nothing about any day before 12
October 2026, and the replay epic has been told, in its own file, that it must
refuse those dates rather than quietly use today's list.
