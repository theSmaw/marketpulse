# Task 2.3.5 — The loader: one documented command, idempotent, and it refuses a bad universe

**Status:** Complete (2026-09-05)
**Story:** [2.3 Security Domain Model & the Tracked Universe](STORY.md)
**Depends on:** Tasks 2.3.3 (the schema) and 2.3.4 (the data)

## Objective

Get the universe into a clean database in one documented command, make re-running it
idempotent in the sense that is actually useful, and make a universe that violates
acceptance criterion 3 **fail the load** rather than arrive silently unclassified.

Acceptance criteria 2 and 3.

## Work

- **Build the loader as a script named by a root command**, in the shape `pnpm migrate`
  already has and for its reasons: the mechanism is TypeScript under `apps/backend/src/`
  so it is typechecked, linted and testable, and `scripts/*.mjs` holds a thin wrapper whose
  jobs are the name, the built-output guard naming `pnpm build`, and **the exit code**.
  Check the name against `pnpm help -a` before claiming it — `clean`, `env`, `config`,
  `start` and `test` are all real pnpm built-ins and a root script shadows a built-in
  repository-wide, which was right once and wrong twice
- **Decide whether it is its own command or a phase of `pnpm migrate`**, and note that
  Task 2.3.1 already settled the larger question (the universe is not a migration). A
  separate command is the shape that follows from that; the reason to state it rather than
  assume it is that a separate command is a **second thing a deploy must remember to run**,
  which is Task 2.3.7's problem and should be visible to it
- **Make idempotent mean "converges on the file", because the other meaning is useless
  here.** Re-running must pick up an edited sector, a corrected name and an added symbol,
  and must not duplicate a row — which is an upsert on `symbol`, the natural key, rather
  than an insert guarded by a count. Two consequences to hold: `updated_at` has **no
  trigger** and is the writer's obligation, so a row that genuinely changed must move it
  and a row that did not must not — which is a real behaviour with a real test, and Task
  2.2.4 named this exact case as the one nothing catches; and `id` is `generated always`,
  so an upsert that touches an unchanged row still consumes an identity value, which Task
  2.2.6 confirmed on a rolled-back migration and which is worth knowing before anybody
  reads a gap in the sequence as a fault
- **Validate the whole list before writing anything**, and validate it as a set rather than
  row by row. **Note what `0003` now backs and what it does not, because the overlap changes
  what this validation is _for_.** The database refuses an unknown `kind`, `status` or
  `sector`, and refuses an equity with no sector or an index proxy carrying one
  (`securities_sector_matches_kind`). So the row-level half of criterion 3 has a backstop,
  and this program's job is no longer to be the only guard — it is to fail **first**, with
  a message naming every offending symbol, because a Postgres constraint error names one
  row, uses the constraint's own identifier, and arrives from inside a transaction the
  operator did not write. A loader that let the database do the refusing would satisfy the
  criterion and be unusable. What has **no** backstop at all is the set-level half, below. Acceptance criterion 3 is two claims: every equity has a sector, and every
  sector present has a corresponding sector ETF. The second is a statement about the whole
  universe — the reason Task 2.2.4 refused to encode it as a row-level `check` — so it is
  this program's job. **A security with neither fails the load**, so the whole load is one
  transaction and a failure leaves the database exactly as it was; say so, and produce it.
  Add the third set-level check Task 2.3.1's mapping decision creates: **every
  `sector_etf` row's `sector` agrees with the `packages/shared` mapping, and every entry in
  that mapping has a row**. The compiler makes the mapping total over the taxonomy and can
  say nothing about whether the universe file's rows match it, which is exactly the seam a
  generated-then-hand-edited row slips through.
  **Amended after 2.3.4: this check is VACUOUS against the shipped file, and that is a
  reason to be careful rather than a reason to skip it.** 2.3.4 took the instruction to
  derive the eleven rows from `SECTOR_ETFS`, mapping over `SECTORS` — so today both halves
  are true by construction and **the check cannot fail no matter how it is written**,
  including if it is written wrongly. That is Task 2.2.5's blind-check problem in a new
  place: a green result that certifies nothing is indistinguishable from one that certifies
  something. So it must be **made to fail against a hand-built list** rather than against
  the universe, and it is still worth having, because it guards the two seams the
  derivation does not cover — somebody replacing the generated block with typed rows, and
  somebody typing a sector proxy's symbol into an equity block
- **Add the set-level check nothing else in the system will catch: a DUPLICATE SYMBOL.**
  **Amended after 2.3.4, and this is the one hole that hole-checking found.** The reflex is
  that `symbol` is `unique` in the database, so a duplicate is refused there and this
  program only has to fail first with a better message — which is what the bullet above
  argues for every other constraint. **That reflex is wrong here, and the reason is the
  upsert.** A loader that upserts on `symbol` — which is what "converges on the file"
  requires — sends the same key twice, the unique index is never violated, the second write
  silently wins, and **the load reports success having applied a row nobody meant**. So the
  duplicate is invisible at every level: the compiler cannot see it (two valid rows), the
  database cannot see it (an upsert is the anti-constraint), and the count is one lower than
  the file's length with nothing saying so. Task 2.3.4 deliberately left every cross-row
  rule here and named this one as unowned; this task owns it, and it should be **made to
  fail** rather than assumed, because a duplicate is the one violation whose test passes
  vacuously if the check is missing
- **Report every violation rather than the first**, in the shape `config.ts`'s accumulator
  already has, because a curated file with three unclassified symbols should take one run
  to fix rather than three. Reuse the existing predicates rather than writing new ones —
  `isTicker` holds the symbol pattern and `packages/shared` deliberately holds no second
  copy of it, which is a stated gap created on purpose.
  **Amended after 2.3.4: the accumulator has a hole it cannot close, and it is better to
  know than to discover.** The universe file wraps every symbol through `toTicker` in its
  constructors, so **a malformed ticker throws a `TypeError` at module load** — produced,
  `Not a valid US equity ticker: "NVDA CORP"` — which is _before_ any validation function
  receives the list. So a bad symbol can never be reported beside the other violations; it
  arrives on its own, as an import failure, naming one value. That is the right trade (a
  boundary check at the boundary, one place to validate) and it means this program must not
  advertise "every violation" without the exception, and its own bad-ticker test cannot be
  written against a list at all without a cast the tree does not otherwise need
- **Write the provenance the schema now carries**, per field, from where the data actually
  came rather than from a constant — a field the loader filled from the curated file and a
  field it filled from a provider are different claims, and Story 2.14 renders the
  difference. **`0003` shipped the four columns `not null` with no default**, so this is
  enforced rather than requested: an insert that omits one is refused by the database
  naming the column, and `pnpm test:database` asserts exactly that. The universe file
  carries none of it — `Security` deliberately does not embed provenance, because a file in
  a repository cannot know when it was retrieved — so all four values originate here
- **Decide what `*_retrieved_at` means on a re-run, which is a real decision nobody has
  taken and which the obvious implementation gets wrong.** The tempting answer is `now()`
  on every load. That makes the timestamp mean _when this program last ran_, which is
  always today and therefore carries no information — and it destroys the one thing
  `UNIVERSE.md` §5 says the column is for. That section records the curated file's silent
  staleness as a gap of this repository's third kind, states the reversal trigger, and names
  `classification_retrieved_at` as the **mitigation**: it "makes the file's age visible on
  screen through Story 2.14 rather than only in git history". A loader that stamps `now()`
  every run makes the file's age permanently invisible and turns the mitigation into
  decoration. So the column has to carry **when the data was last checked against its
  source**, which for a curated file is a value the file states or a date a person moved —
  and that is a decision about where that value lives, taken here and written down.
  Note the same question applies to `profile_retrieved_at` and has a different answer the
  day Story 2.7 fills it from Alpaca, which is a genuine retrieval. Whatever is chosen,
  it must interact correctly with the `updated_at` rule in the bullet above: a row that did
  not change must not move either timestamp
- **Say what it does about a symbol in the database that is not in the file**, and note
  that this is Task 2.3.6's decision to make and this task's to leave a seam for. The three
  answers are delete the row, change its `status`, and refuse — and they are not
  interchangeable, because one of them destroys data Story 2.8 will have stored against it.
  Do not pick silently
- **Make it fail loudly with no database**, the way `pnpm migrate` does, and make the exit
  code real. A loader that reports success having written nothing is the failure mode Task
  2.2.2 spent three deliberate breaks on
- **Extend `pnpm test:database` rather than inventing a place for database-backed tests.**
  Task 2.3.3 left that suite at 37 tests with two things this task should reuse:
  `insertProbe()`, which supplies a valid row and lets a test override only the field it is
  breaking, and the `CLOSED_SETS` table that drives the vocabulary checks. Note the
  arrangement it also left: **every constraint test there is negative**, and one positive
  insert is what stops a constraint that refuses everything passing all of them — a loader
  test that only asserts refusals is in the same position
- **Add tests at the level each thing belongs to.** Validation is a pure function over a
  list — **it takes the list as a parameter and does not import `UNIVERSE`**, which is the
  shape `loadConfig(env)` and `resolveApiBaseUrl(raw)` already have and which is what lets
  the fast suite hand it small deliberately-broken fixtures instead of the real universe.
  A validator that reaches for the module directly can only ever be tested against a list
  that passes. It belongs in the **fast** suite — no database, no build, no socket — which is what
  keeps `pnpm test`'s three stated properties. Anything that needs a real server is
  `pnpm test:database`, which creates and drops its own `marketpulse_vitest` and does
  nothing to the database you are working in. Note the naming trap that partition carries:
  the three `include`/`exclude` globs are one decision, nothing enforces the naming, and a
  database test named `foo.test.ts` lands in the suite developers run all day
- **Document the command in `README.md`**, and check whether the first-run sequence changes
  — it is currently four steps (`pnpm install` → `pnpm build` → `pnpm db` → `pnpm migrate`)
  and this task plausibly makes it five. That fifth step, like the fourth, would have **no
  symptom if skipped**: an unseeded database ticks in `pnpm ready`, passes `pnpm verify` and
  serves `pnpm dev`

## Done when

- One documented command loads the universe into a clean, migrated database
- Running it twice leaves the same rows, and running it after editing the file picks the
  edit up — both observed, and asserted on the **database** rather than on the loader's own
  report, which is the distinction Task 2.2.5 drew about idempotence
- A universe with an unclassified equity, and one with a sector whose ETF is missing, each
  fail the load at a non-zero exit naming every offending symbol, leaving the table
  unchanged — produced, not reasoned about
- Provenance is written per field and a reader can tell where each field came from, and
  what `*_retrieved_at` means on a re-run is decided and written down rather than defaulted
  to `now()`
- `pnpm verify` passes with no database running, and `pnpm test` still needs no database

## Notes

The seam this task must not close is what happens to a symbol removed from the file.
Getting it wrong in the direction of "delete the row" is unrecoverable once Story 2.8 has
stored bars against it, and it is exactly the kind of thing a loader does by default.

---

## Amended after Task 2.3.4 (2026-09-05)

Four edits above, three of them caused by what 2.3.4 actually shipped rather than by what
it was asked to ship. In one line each:

- **A duplicate symbol has no backstop at all**, because an upsert is the one write shape a
  unique index cannot refuse — a new named set-level check, and the strongest finding here.
- **`toTicker` runs at module load**, so a malformed symbol is an import failure rather than
  an accumulated violation; the "every violation" promise has a stated exception.
- **The `sector_etf`-agrees-with-mapping check is vacuous against the shipped file**, because
  the rows are generated from the mapping — so it must be made to fail against a hand-built
  list or it certifies nothing.
- Validation takes the list as a **parameter**, so the fast suite can build bad fixtures.

Two things 2.3.4 did **not** change here, checked rather than assumed. The provenance
bullets stand exactly as written: the file carries none of it, every row has the same
source, so one `profile_source` and one `classification_source` for the whole file is
correct and no per-row override is needed — which is the negative fact 2.3.4 owed and
confirmed in `UNIVERSE.md` §9. And the `*_retrieved_at` decision is untouched and still
open, because nothing in a curated list of symbols answers when it was last checked against
a source.

---

## What shipped (2026-09-05)

**One command, `pnpm universe`**, and the same three-file shape `pnpm migrate` has:
`apps/backend/src/load-universe.ts` is the mechanism (typechecked, linted, tested),
`scripts/load-universe.mjs` is a wrapper whose jobs are the name, the built-output guard
and **the exit code**, and the root script is the name. `universe` was checked against
`pnpm help -a` before being claimed, with the detection validated in the same run against
six known built-ins (`clean`, `test`, `start`, `config`, `env`, `deploy`); `universe`,
`seed` and `load` are all free, and `universe` is the name because there is exactly one of
them and naming the noun is what `pnpm db` already does.

**It is a separate command and not a phase of `pnpm migrate`**, and the cost is stated
rather than hidden: a deploy now has two things to remember, which is Task 2.3.7's problem.

**Files:** `load-universe.ts`, `load-universe.mjs`, `load-universe.test.ts` (22 fast tests),
`load-universe.database.test.ts` (14 database tests), plus `UNIVERSE_PROVENANCE` in
`universe.ts`. **No dependency and no lockfile change.**

### The decisions

**`*_retrieved_at` is the file's own stated date, not `now()`.** `UNIVERSE_PROVENANCE`
lives in `universe.ts` beside the rows, two groups matching the two `0003` gave columns
to, each a `source` and a `YYYY-MM-DD` `checkedOn` parsed as UTC midnight. `now()` would
make the column mean "when the loader last ran" — always today — and destroy the one
mitigation `UNIVERSE.md` §5 offers against the curated file's silent staleness. The
obligation that creates is recorded as a gap of the third kind **by design**: nothing can
enforce that a person moves the date when they actually re-check, and a check is
structurally impossible because whether somebody read a fact sheet is not observable here.
`profile_retrieved_at` diverges from `classification_retrieved_at` the day Story 2.6 fills
the profile fields from Alpaca, which is a genuine retrieval where `now()` is correct — two
columns rather than one is what makes that expressible.

**Idempotent means converges on the file.** An upsert on `symbol`, with the whole write in
one transaction. The `on conflict … where` row comparison is the load-bearing half rather
than an optimisation: `updated_at` has no trigger, Task 2.2.4 recorded that maintaining it
is the writer's obligation with nothing catching a writer who gets it wrong, and a bare
`set … updated_at = now()` would move all 101 rows on every run. `is distinct from` rather
than `<>`, because `null <> null` is `null` and every row with a null `industry` or `cik`
would otherwise read as unchanged forever.

**Validation takes the list as a parameter and reports every violation.** Set-level rather
than row by row: duplicate symbols, a sector with no proxy, a proxy that disagrees with
`SECTOR_ETFS`, the row shape via `isSecurity`, and criterion 3's first half with a message
that names the criterion rather than saying the row is malformed. The one stated exception
to "every violation" is a malformed ticker, which `toTicker` throws on at **module load**
and which therefore arrives alone.

**A symbol in the database and not in the file is counted, reported and left untouched.**
The seam is left open on purpose: Task 2.3.6 chooses between deleting it, changing its
`status` and refusing, and one of the three destroys data Story 2.7 will have stored.

### What was produced rather than reasoned about

- **All three refusals, through the real command, at exit 1**, with the table's fingerprint
  (`c296fe11…`) identical before and after all three: an unclassified equity — two of them,
  **both named in one run** — a sector whose ETF is missing, and a duplicate symbol.
- **The two vacuous checks were made to fail against hand-built lists.** Disabling the
  duplicate check takes 4 fast tests red; disabling the mapping-agreement check takes 1.
  Neither can fail against the shipped file, which is why they are tested that way.
- **Removing the upsert's `where` clause takes 2 database tests red** — "changes nothing at
  all" and "does NOT move `updated_at` on a row that did not change".
- **The transaction was made to matter.** With the bind-parameter ceiling lowered so 101
  rows became eleven statements and a `check` constraint rejecting a symbol in a middle
  chunk: exit 1, **0 rows**. At today's size the write is a single statement and would be
  atomic anyway — said plainly, because implying otherwise would be a false comfort.
- **An upsert consumes an identity value per row per run whether or not anything changed.**
  After four runs of 101, `securities_id_seq.last_value` read **404** and `max(id)` read
  **101**. Ids are stable across re-runs, which is what Story 2.7 needs; the sequence runs
  ahead of them.

### One premise this task was given, corrected by measuring it

The brief and `STORY.md` both recorded that **a duplicate symbol has no backstop at all**,
because an upsert is the one write shape a unique index cannot refuse. Produced with the
check disabled, that is **half right, and the half that holds is the half you can see
today**:

- **Both copies in the same `insert`** — Postgres refuses it outright, SQLSTATE `21000`,
  _"ON CONFLICT DO UPDATE command cannot affect row a second time"_. Exit 1, nothing
  written. **This is what happens at 101 securities**, because the loader puts 5,461 rows
  in one statement.
- **Copies in different statements** — completely silent. The load printed
  **`✓ 102 securities in the universe`** at **exit 0** while the table held **101 rows**,
  counting the second write as _unchanged_.

So the database's protection is **a property of the list being small**, and it disappears
past ~5,461 securities or the first time anybody changes the batching — a performance edit
nobody would review as a correctness one. The check is worth having for that reason rather
than the stated one. Recorded in `UNIVERSE.md` §11 and in the code beside the check.

### Figures

`pnpm verify` **exit 0 in 27.84 s with no database running** and 28.16 s with one —
criterion 7 re-taken on the task that could have broken it. `pnpm test` is **286**
(55 + 128 + 103) and needs no database, no build and no socket. `pnpm test:database` is
**53 across two files**. The load itself is 101 inserted on an empty table and 101
unchanged on a re-run; `securities` holds 86 equities, 11 sector proxies, 4 index proxies,
11 sectors with rows and **0 unclassified equities**. The first run of a clean clone is now
**five** steps, and the last two still have no symptom if skipped.

Nothing is deployed. The managed database is Task 2.3.7's.

---

## For the stakeholders — what this actually did

**In one sentence: MarketPulse now knows which companies it is watching, and there is a
single command that tells it.**

Up to this point the product had a _description_ of its watchlist — 101 companies and
funds, written down and argued over in the previous task — and an empty table in the
database waiting for them. Those were two separate things, and nothing joined them. This
task built the join: type `pnpm universe` and the list becomes real data the rest of the
product can query. It is the moment the "security universe" stops being a document and
starts being something the application can look things up in.

That matters because **almost everything still to come reads this list.** Fetching price
history needs to know which prices to fetch. The sector performance panel needs to know
which companies are in which sector. The "is this move unusual?" score needs to know what
to compare a company against. The market map needs to know which dots to draw. None of
that could start until the list existed as data rather than as prose.

**Three choices worth explaining, because each one prevents a specific kind of quiet
damage.**

**We made re-running the command mean "match the file", not "do nothing".** The obvious
easy version refuses to run twice, so that you cannot accidentally duplicate anything. That
version is safe and useless: the whole reason to keep the watchlist in a reviewable file is
that people will correct it — a company name spelled wrong, a company moved to the right
sector, a new name added. Our version reads the file and makes the database match it, every
time. Fix a typo, run the command, done. Nothing is duplicated and nothing else is touched.

**We were careful about a small column that answers a question nobody has asked yet.** Each
company's sector is recorded by hand, and hand-maintained data goes out of date silently —
a company can be reclassified and nothing anywhere breaks; the product simply compares it
against the wrong peers, indefinitely, while looking entirely correct. There is no cheap fix
for that, so instead we make the _age_ of the information visible: eventually a user
inspecting a company will be able to see "this classification was last checked on such a
date". The obvious implementation stamps today's date every time the command runs — which
would make that display always say "checked today" and be a lie by construction. So the date
comes from the file itself and only moves when a person actually re-checks the list. It is a
small thing that would have been very hard to notice was broken.

**We made a bad watchlist fail loudly, and fail before it touches anything.** If a company
somehow has no sector, or a sector has no benchmark fund to measure it against, or a symbol
is listed twice, the command refuses the whole thing, prints **every** problem it found in
one go, and leaves the database exactly as it was. That last part was tested by actually
breaking it three different ways and checking the database was untouched afterwards — not by
reasoning that it should be. The "every problem at once" part is a small kindness with a real
payoff: a list with three faults takes one round of fixing rather than three.

**One thing we deliberately did not do.** If a company is removed from the file, the command
leaves its existing row alone and simply tells you it is there. It does not delete it. That
looks like an omission and is a decision: once we start storing years of price history
against these companies, deleting a row would throw that history away, and "the loader
quietly deleted it" is exactly how that happens by accident. What _should_ happen to a
dropped company — mark it as no longer tracked, or refuse the change until a human confirms
— is the very next task, and leaving the row untouched is the only option that keeps all the
answers available.

**Where this leaves the product.** The watchlist is loaded on a developer machine, and
everything a future feature needs to look up — company, sector, benchmark, listing venue —
is now queryable. The two remaining steps in this story are changing the list (adding and
removing a company, and saying what that costs) and getting the same list onto the live
production database. After that, the next story starts fetching actual market prices for
these hundred-odd companies, which is when MarketPulse first has something to show a user.
