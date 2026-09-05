# Task 2.2.8 — Verify from a clean clone, document, and record ADR 0015

**Status:** Not started
**Story:** [2.2 Database Schema & Migration Mechanism](STORY.md)
**Depends on:** Tasks 2.2.1 to 2.2.7

## Objective

Close the story by re-running all seven acceptance criteria against what shipped, re-taking
every figure rather than citing one, and writing the decision record the next thirteen
epics read instead of re-deriving it.

## Work

- **Re-run every acceptance criterion against the shipped tree**, not against the task
  files that claimed them. The two most likely to have rotted are criterion 2 — a migration
  applied twice is a no-op, which was true of an empty migration in 2.2.2 and of one table
  in 2.2.4 and should be re-taken against everything that now exists — and criterion 7,
  `pnpm verify` with no database, which every task in this story could have broken and only
  the close can prove none did. **Criterion 6 — "the conventions are written where the next
  person writing a migration will look" — is met by `apps/backend/migrations/README.md`, and
  it is the one most likely to have quietly stopped being true rather than never having been
  true**: that document ends with two lists, checked and prose, and Task 2.2.5 is supposed to
  have moved entries from the second to the first. Re-read the lists against what 2.2.5
  actually built and amend the document if they disagree, because a document claiming a
  convention is only prose when a test now checks it is the same class of stale as a wrong
  figure. **Task 2.2.5 did move seven rows and amended both lists in the same change, so
  this is a verification rather than an open question** — what is worth re-reading is the
  one row that did **not** move: "every price column is `numeric(18, 6)`" is recorded as
  untested-because-vacuous, standing on a **tripwire** that asserts there are zero `numeric`
  columns and fails when one arrives. If anything in this story added a `numeric` column
  after that was written, that tripwire is already red and the lists are already wrong.
  **And criterion 5 is now the one to re-run rather than re-read**: "database-backed tests
  run under their own command, exit non-zero when they fail, and are not in `pnpm test`" is
  three separate claims, and the third is guarded only by a glob comment
- **From a clean clone with an empty store**, because that is the only place several of
  these claims are testable: install cold and record packages, store entries,
  `node_modules` size and lockfile lines against Story 2.1's baseline; `pnpm verify` cold
  and warm with the per-step split; the migration mechanism run against a database created
  from nothing; and the **install-script sweep** against the clone's own store, which
  should still return `esbuild@0.28.2` and nothing else. Note what a clean clone still
  cannot prove — a stale `dist`, a nested worktree, and now a database that already has
  migrations in it, which is the state every environment after this story is permanently in
- **Re-take the numbers this story moved**, because they are quoted in several places and
  go stale silently: `pnpm test`'s count and its per-package split, `pnpm verify`'s total
  and step timings both with and without a database, the frontend artefact's four files —
  which should be **byte-identical**, and that is the check rather than a coincidence, since
  this story ships no frontend source — and the new database-backed suite's count and
  duration. **Two counts moved in Task 2.2.4 and are the kind that go stale silently**:
  `packages/shared` gained `security.ts`, which ships **no test** — consistent with
  `feed-status.ts` and `anomaly.ts`, and a decision rather than an omission, because the one
  thing worth asserting about `SECURITY_KINDS` needs a database — so that package's **file
  count** moved while its test count did not, and its **coverage percentage will have
  fallen**, for a file with no test sitting in the denominator. That last figure is exactly
  the one this repository has twice found carried forward as "unchanged" across several
  stories. **Task 2.2.5 added a fourth command that runs tests and a sixth level of test**,
  so `pnpm test:database`'s count (23) and duration join the list, and the levels table in
  `README.md` plus the levels paragraph in `CLAUDE.md` are now **six** rather than five —
  both were amended when the claim was falsified rather than left for this sweep, so check
  they say six and that nothing else in the tree still says five
- **Sweep for claims this story falsified, and read each occurrence rather than replacing
  it.** Story 2.1 closed by finding four, one of which made `CLAUDE.md` contradict itself.
  The candidates here are specific: `apps/backend/src/database.ts` is described as the only
  file that knows there is a driver and as **not a query layer**, `pingDatabase()` is
  described as the whole query surface, `README.md` and `CLAUDE.md` both carry a test count
  and a command list, and the levels-of-test paragraph says five and will say six.
  **Task 2.2.2 already amended two of those and its own amendments are worth re-reading
  rather than trusting**: it moved the counts to 239 (37 + 99 + 103), and it describes
  `migrate.ts` as building "the repository's one `Kysely` instance" — a claim that stops
  being true the moment Story 2.8 writes a query, and exactly the kind of wording that
  hardens from "the only one today" into "the only one" in the retelling. The
  distinction that a naive grep destroys is the one Task 1.12.8 named and Task 1.13.6
  re-proved: a **live** claim gets amended, a **historical record** of what a task measured
  at the time is correct in its own context and stays. **Tasks 2.2.3 and 2.2.4 added two more
  documents that make claims, and both rot rather than break.**
  `apps/backend/migrations/README.md` states that a `.sql` file is read by no tool here — so
  re-run `prettier --file-info` and `eslint` on `0002_securities.sql` rather than citing it —
  and its §6 says the `Database` interface is unchecked against the schema, which **Task
  2.2.5 is supposed to have falsified on purpose**. **Task 2.2.6 added §8 to that same
  document and it is the most figure-dense thing in the story**: a table of eight failure
  classes with their verbatim messages and exit codes, four SQLSTATE values, a
  `position` offset, an advisory lock id and its one-hour timeout. Those were measured
  against PostgreSQL 18.6 through Kysely 0.29.5, so a **Kysely upgrade** moves the lock
  constants and an **engine upgrade** may move the messages — neither of which breaks
  anything, which is exactly why they rot silently. Re-take the ones cheapest to re-take
  rather than all of them, and say which were re-taken. `apps/backend/src/schema.ts` says in its
  own header that _"nothing consumes this interface today"_, which stops being true the moment
  2.2.5 imports it and stops being true again in Story 2.8 — the exact shape of wording that
  hardens from "not yet" into "never" in the retelling. **And one claim to re-read rather than
  wave through**: `database.ts` and `CLAUDE.md` both say that file is the only place this
  application knows there is a database driver. `schema.ts` imports from `kysely`, which is a
  query builder rather than a driver and is types-only, so the claim survives — but it
  survives on a distinction fine enough to be worth checking rather than assuming. **Three more candidates arrived with
  Task 2.2.1, and two of them are claims that task wrote itself.** `DATA-LAYER.md` says the
  query layer is Kysely and that the temporal seam is structural — which stays a **claim**
  until a query exists, and 2.2.1 said so, but a closing task should check the wording did
  not quietly harden in the retelling. `CLAUDE.md` now says `allowBuilds` is keyed on a
  package **name** rather than a version and that the sweep's single line is a property of
  what is installed rather than of the policy — so re-run the sweep and count its lines. And
  2.2.1's costs were measured against a baseline of **418 store entries**, which is exactly
  the kind of figure a clean clone re-takes and the one most likely to have moved
- **Write the conventions into `README.md`'s command reference**, because `pnpm migrate`
  and the database-test command are both things a developer runs and neither is discoverable
  from a task file. Point at Task 2.2.3's document rather than copying it. **And check the
  setup narrative separately from the command table, because they are two documents that
  happen to share a file.** Task 2.2.2 added `pnpm migrate` to the reference and gave it a
  section; what nothing has re-taken is the **first-run sequence** a clean clone follows,
  which is now `pnpm install` → `pnpm build` → `pnpm db` → `pnpm migrate` and was three
  steps when it was last written. A developer following the old sequence gets an empty
  database and a symptom nobody predicted
- **Re-check the two `index.process.test.ts` flakes Task 2.2.2 recorded**, because one of
  them is open and a closing task is where an open thing goes to be forgotten. The
  reachability test was diagnosed and fixed — a fixed 200 ms sleep before asserting a record
  that needs a real connection — and the drain-ordering test failed once with
  `expected 4 to be greater than 7`, did not reproduce in five further runs or under eight
  CPU-saturating background processes, and was left open with the suspicion named. This
  story runs `pnpm verify` many more times before it closes: say whether it recurred, and
  either diagnose it or carry it forward with a count rather than dropping it silently
- **Record `docs/adr/0015-*`** — the fifteenth, and the second outside Epic 1. Written from
  the facts rather than from the task files, in the shape ADR 0013 and 0014 use, and it
  owes the two lists the recent ones have made standard: **what a green migration certifies
  and what it does not**. The candidates for the second list are already known — that the
  local pin and the deployed engine version still agree is checked by nothing, that the
  migration identity's grants live only in the platform, that the two Vitest globs
  partitioning fast tests from database tests are a naming convention with nothing behind
  it, and that a schema matching in two databases says nothing about the third copy nobody
  has migrated. **Task 2.2.1 adds two more and both are structural rather than
  procedural**: Kysely's `kysely_migration` carries no checksum, so an applied migration
  whose file was later edited is skipped in silence unless something this story built checks
  it; and the temporal-isolation seam is a **plugin attached to one handle**, so it holds
  only while no unplugged `Kysely` instance is exported — which nothing enforces, and which
  is the same class as `e2e/package.json`'s missing `test` script. **Task 2.2.2 adds a third
  and it is the cheapest of the three to state**: `pnpm migrate` refuses arguments and is
  forward-only, so nothing in this repository can move a schema backwards — which belongs in
  the first list as a property rather than the second as a gap, while its consequence belongs
  in the second, since it means a rollback of code past a migration has no schema counterpart.
  **Task 2.2.4 adds a fourth, created deliberately and in the open**: `SECURITY_KINDS` in
  `packages/shared` and `securities_kind_check` in the database are two spellings of one
  vocabulary — and **Task 2.2.5 closed it**, parsing the constraint text Postgres rewrote, so
  it belongs in the **first** list as a property rather than the second as a gap. **Task 2.2.6 moves one item into the FIRST list and puts the sharpest item in the story into
  the second.** Into the first: **two concurrent migrations cannot interleave**, because
  Kysely takes a per-database session-level advisory lock — established rather than assumed,
  with a failing first runner shown not to poison the second. Into the second, and it is the
  one sentence ADR 0015 most needs: **a green `pnpm migrate` does not certify that the
  database matches the migration files.** It certifies that every migration _named_ on disk is
  recorded as applied, which is a different claim, and 2.2.6 produced the gap between them —
  an index appended to an applied migration left `pnpm migrate` and `pnpm test:database` both
  at exit 0 over a database missing it. That is precisely the "what a green X certifies and
  what it does not" shape these lists exist for, and it is stronger than the checksum entry
  below because it is a property of the mechanism rather than a gap in tooling. Two smaller
  second-list candidates come with it: the advisory lock's **one-hour** timeout means a hung
  migration blocks another for an hour rather than failing fast, and a failed migration
  **names the file and not the statement**, carrying a `position` only for a syntax error.
  **What 2.2.5
  put into the second list instead is sharper and there are three of them.** The **three-glob
  partition** across that package's Vitest configs is a naming convention with nothing behind
  it, and it is now the _second_ instance of the class Task 1.13.2 named — weaker than that
  one, because there the mitigation is a missing `test` script and here it is only a comment,
  in a package that does have one. The **migration checksum** is still open and is now
  deliberately so, with its reasoning recorded and Task 2.2.7 named as the reversal trigger —
  and it should be written up as a **produced failure rather than a hypothesis**, since 2.2.6
  ran it and 2.2.7 was required to take the decision rather than defer it again; check which
  way 2.2.7 went before describing it.
  And the **third engine pin** — the CI service image — is compared against the local one on
  every pull request, which moves half of an existing gap into the first list while leaving
  the deployed half in the second; ADR 0015 should say which half is which rather than
  repeating the old sentence. The two lists also have a ready-made shape to borrow rather than invent:
  `apps/backend/migrations/README.md` already ends with a checked-versus-prose split, and the
  line it draws — **whether the thing being checked is reachable from an assembled
  instance** — is the line ADR 0013 drew, and is worth stating once in an ADR rather than a
  third time in a directory README
- **Update the gap lists in `CLAUDE.md` by re-measurement**, not by editing the text: re-run
  `prettier --file-info` and `eslint` on whatever this story added, since a `.sql` file is
  read by nothing here and a `.ts` migration is read by everything, and those are two
  different entries. Re-date the existing kinds, which is the only thing that has ever
  caught that list drifting. **One of those kinds moved rather than merely aged and it is
  worth confirming by measurement rather than reading the amended text**: the
  "nothing compares the local pin to the deployed one" entry is now half closed, and the
  paragraph was rewritten to say which half. Re-run the CI job's own comparison step and
  the `az` half by hand, and confirm the three-way split it now describes is the true one
- **Record that the ruleset gained a third required check**, because it is platform state no
  file in this tree can hold and this story is what added it. Ruleset `main` (id 22160620)
  requires `verify`, `e2e` and **`database`** as of Task 2.2.5, read back from the API at the
  time. Re-read it at the close rather than citing that reading — three checks keyed on three
  job names is three ways to un-require a gate silently by renaming a job, which is Task
  1.10.2's failure mode tripled, and `CLAUDE.md` plus ADR 0015 are the only durable copy
- **Say what this story hands forward**, in two halves: the mechanism every table in §30
  arrives through, and — the one that matters more — **where Epic 13's temporal constraint
  will be made structural**. That seam was chosen in Task 2.2.1 and nothing in this story
  uses it, so it is a claim until Story 2.8 writes the first query. Recording it as a claim
  is more useful than recording it as a property

## Done when

- All seven acceptance criteria are re-run against the shipped tree and recorded
- The clean clone's first-run **sequence** is re-taken, not just its command table row
- Every figure is re-taken rather than cited, from a clean clone where that is the only
  honest place
- Claims this story falsified are found by sweep, read individually, and amended or left
  standing with the reason
- `docs/adr/0015-*` exists, with both lists
- `README.md` and `CLAUDE.md` describe what actually shipped
- Story 2.2 is marked complete, and Story 2.3 can add a table without asking a question this
  story should have answered

## Notes

Every closing task in this repository has found recorded claims that had stopped being
true, and the ones that hurt were the ones nobody thought to check because they read as
background. The two to be most suspicious of here are both in `CLAUDE.md`'s own
description of `database.ts`, which was written when nothing queried anything.
