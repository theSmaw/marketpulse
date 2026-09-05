# Task 2.3.5 — The loader: one documented command, idempotent, and it refuses a bad universe

**Status:** Not started
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
