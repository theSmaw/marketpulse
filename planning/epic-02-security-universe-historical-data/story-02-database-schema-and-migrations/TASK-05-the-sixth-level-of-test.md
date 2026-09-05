# Task 2.2.5 — The sixth level of test, and what it costs `pnpm test`

**Status:** Not started
**Story:** [2.2 Database Schema & Migration Mechanism](STORY.md)
**Depends on:** Task 2.2.4 (a schema for a test to assert against)

## Objective

Give this repository a level of test that talks to a real database, under its own command,
without letting it near the one developers run all day.

## Work

- **Give it the `test:process` treatment, because it is the same problem.** Epic 1's five
  levels rest on a stated rule: `pnpm test` is fast, needs no build and needs no socket. A
  database-backed test breaks all three. Task 1.10.5 solved exactly this shape with a
  second Vitest config and a second command in the same package, and the argument was that
  the fast suite must not become conditional on a build or able to bind a port. Reuse the
  arrangement rather than re-deriving it, and reuse its trap too: **the two configs'
  globs are one decision** — the unit config excludes what the second config includes —
  and nothing enforces the naming, so a database test named the wrong way runs in the fast
  suite and a correctly named one in another package runs nowhere at all. Write the reason
  in both files, which is the only mitigation there has ever been for that class
- **`skipIf` is not available and the reason is recorded twice.** A skipped test reports
  green, which this repository has already called the worst failure mode available. Task
  2.1.4's answer is the model: the one test that cared whether a database existed **asked
  the question itself** — the same eight-byte SSLRequest `check-ready.mjs` sends — and
  asserted the matching answer, so it is a real assertion in both environments and
  `pnpm test:process` is the same count either way. This suite cannot do that, because it
  genuinely needs a database, so it fails loudly with a message naming `pnpm db` instead
- **Assert something only a database can answer.** The obvious and correct subject is the
  mechanism itself: migrate an empty database, read the resulting schema, migrate again and
  assert nothing changed. That makes acceptance criterion 2 a **test** rather than a
  measurement taken once, and it is the shape this repository already prefers — Task 1.9.3
  closed a gap no `verify` step could by walking the route table from an assembled
  instance, and the rule it wrote is that a test beats another `verify` step whenever the
  thing being checked is reachable from a running instance
- **Assert the second thing too, because Task 2.2.1 handed it over by name: the hand-written
  `Database` interface against `information_schema`.** Kysely generates nothing, so that
  interface is written by hand and **nothing checks it against the schema** — a column
  renamed in a migration and not in the interface typechecks, lints and builds, and fails at
  run time. That is a new gap of this repository's third kind and this suite is the only
  place it is reachable: migrate, read `information_schema.columns`, and assert the two
  agree on names, types and nullability. **And if Task 2.2.2 deferred the checksum gap here
  rather than closing it, this is where it lands too** — Kysely's `kysely_migration` is
  `(name, timestamp)` with no hash, so an applied migration whose file was edited is skipped
  silently, and a test that re-reads the files and compares them to what the schema actually
  looks like is the cheapest thing standing between that and a divergence nobody notices
- **Decide what a test does to the database it ran against**, which is the decision that
  makes this suite either trustworthy or a source of Monday-morning confusion: a
  transaction rolled back per test, a schema per run, a separate database entirely, or
  truncation between tests. Whatever is chosen, the property to protect is that running the
  suite does not destroy the rows a developer was mid-way through debugging — which is the
  same argument Task 2.1.2 used to keep the database out of `pnpm dev`
- **Decide whether CI runs it, and take the consequences out loud.** A second job in
  `verify.yml` with a Postgres service is the obvious shape, and it has three costs that
  are each a decision: it is a **third required check** on `main` if it gates a merge —
  keyed on a job name, which renaming un-requires silently, and which no file in this tree
  records; the service's Postgres version is a **second place the engine version is
  pinned**, against a local pin nothing already compares to the deployed one; and Story
  1.10's founding rule means the job invokes `pnpm migrate` and this command **by name** and
  defines no database step of its own
- **Re-take Task 2.1.2's stated trigger rather than assuming it fired.** That trigger is a
  condition and not a task number: _the first check in `pnpm verify` or `pnpm e2e` that
  fails without a database_. If this suite is its own command and CI job, the trigger has
  **not** fired, `pnpm ready`'s third check stays a reporting `○`, and saying so is the
  answer. Measure it — `pnpm verify` with no database, and the browser suite with one
  stopped — rather than reading the code, which is how 2.1.4 answered the same question
- **`pnpm test` still needs no database, no build and no socket**, measured on a machine
  with the database stopped, and its count is unchanged by everything above

## Done when

- A database-backed suite exists under its own command, with its own config, and its
  reason written beside both
- It exits non-zero when it fails, seen rather than assumed
- It is not in `pnpm test`, and `pnpm test` runs green with no database
- The `Database` interface is asserted against `information_schema`, and the check was made
  to fail before it was believed
- What it does to the database it ran against is decided and stated
- Whether CI runs it is decided, with the required-check and version-pin consequences named
- Task 2.1.2's trigger is re-taken by measurement and its answer recorded either way
- `pnpm verify` is exit 0 with no database running

## Notes

The invariant with no enforcement is worth naming here because this task creates a second
instance of it: Task 1.13.2 recorded that **the only thing keeping the browser suite out of
`pnpm test` is that `e2e/package.json` has no `test` script**, and nothing checks that it
stays absent. This suite adds a second such absence, in a package that _does_ have a `test`
script, so the mitigation is the glob comment rather than a missing file — which is weaker,
and should be said so rather than glossed.
