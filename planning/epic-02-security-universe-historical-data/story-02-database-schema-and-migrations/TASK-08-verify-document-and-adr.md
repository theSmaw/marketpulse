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
  figure
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
  stories
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
  2.2.5 is supposed to have falsified on purpose**. `apps/backend/src/schema.ts` says in its
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
  vocabulary, and whether they agree is either a check Task 2.2.5 built or another entry in
  the second list — which of those it is depends on what 2.2.5 did, so **read that rather than
  assuming either**. The two lists also have a ready-made shape to borrow rather than invent:
  `apps/backend/migrations/README.md` already ends with a checked-versus-prose split, and the
  line it draws — **whether the thing being checked is reachable from an assembled
  instance** — is the line ADR 0013 drew, and is worth stating once in an ADR rather than a
  third time in a directory README
- **Update the gap lists in `CLAUDE.md` by re-measurement**, not by editing the text: re-run
  `prettier --file-info` and `eslint` on whatever this story added, since a `.sql` file is
  read by nothing here and a `.ts` migration is read by everything, and those are two
  different entries. Re-date the existing kinds, which is the only thing that has ever
  caught that list drifting
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
