# Task 2.2.2 — Install the mechanism and make an empty migration real

**Status:** Not started
**Story:** [2.2 Database Schema & Migration Mechanism](STORY.md)
**Depends on:** Task 2.2.1 (the tool, the direction, and whether anything replaced `pg`)

## Objective

Get the chosen mechanism into the tree and prove it works end to end against the local
database — with a migration that creates **nothing**. The first real table is Task 2.2.4's;
this task is about the machinery, and separating the two means a failure has one cause.

## Work

- **Install exactly what Task 2.2.1 chose**, and re-take the figures against the shipping
  tree rather than citing the spike's — Story 1.13 did this twice and both times the
  install reproduced to the byte, which is what makes the re-take a check rather than a
  formality. Re-run the install-script sweep against the installed store
- **Decide where migrations live and make the answer structural.** The plausible homes are
  `apps/backend/migrations/`, a top-level `migrations/`, or a fifth workspace package. The
  question that decides it is which tool needs to _read_ them and which package's
  dependency the runner is: a directory outside every workspace package is the shape
  `e2e/` was refused as, and Task 1.13.1 found out expensively that a bare root-level
  directory fails twice — `TS1295`, because the nearest `package.json` is the root's, and
  `MODULE_NOT_FOUND` on `@marketpulse/shared`, because pnpm links a workspace package only
  into packages that declare it
- **Fix the naming and ordering rule, and pick the one whose failure is loud.** A
  timestamp prefix and a sequence number differ in exactly one way that matters: two
  developers on two branches. A sequence number **collides**, which is a merge conflict —
  loud, and resolved before it reaches a database. A timestamp **interleaves**, which
  applies in an order neither author tested and nothing complains. Say which is chosen and
  what happens on the case that breaks it
- **The root script is `pnpm migrate` and the pipeline never defines its own steps.** Check
  the name against `pnpm help -a` before claiming it — `clean`, `env`, `config`, `start`
  and `test` are all built-ins, and a root script shadows a built-in repository-wide, which
  was right for `clean` and would be wrong here. Validate the detection in the same run
  against a name you know is a built-in, which is the check Tasks 1.9.5, 1.11.2 and 2.1.2
  each did and which is the only reason the claim is worth anything
- **Whatever the script needs to know about the database, it reads from one place.** The
  address, the credentials and the database name come from `apps/backend`'s built
  `dist/config.js`, exactly as `scripts/local-database.mjs` and `scripts/pair-addresses.mjs`
  do. A migration runner with its own copy of the connection settings has forked the
  definition of where the database is on day one — and it has to work under **both**
  `DATABASE_AUTH` modes, because deployed there is no password to put in a URL. Task 2.2.7
  is where that bites; getting the shape right here is what makes it a non-event
- **Run an empty migration against the local database and then run it again.** Applying it
  twice is a no-op is acceptance criterion 2 and it is cheap to assert now, on a mechanism
  with nothing in it. Read the tracking table by hand afterwards and record what it holds —
  the name, the checksum if there is one, the timestamp, and whether the tool records a
  hash it will later compare, because a tool that checksums applied migrations turns
  "somebody edited an applied file" into an error and a tool that does not turns it into a
  divergence
- **State which of the new files `pnpm verify` reads and which it does not.** A `.sql` file
  is read by nothing here — not Prettier, not ESLint, not `tsc` — so a SQL-file mechanism
  adds a **sixth** kind to `CLAUDE.md`'s gap list and the entry belongs in this task rather
  than being discovered in Story 2.7. Take the reading with `prettier --file-info` and
  `eslint` on a real file rather than assuming it, which is the one-liner that has caught
  this list drifting every time it has been re-run
- **`pnpm verify` still passes with no database running**, which is criterion 7, and it is
  measured here as well as at the close because this is the task that could break it

## Done when

- The mechanism is installed with its cost re-measured against the shipping tree
- Migrations have a home, a naming rule and an ordering rule, each with its reason
- `pnpm migrate` exists, is checked against `pnpm help -a`, and defines the database's
  address nowhere of its own
- An empty migration applies, and applying it twice is a no-op — both observed
- The tracking table's contents are recorded
- Any new file outside `pnpm verify`'s net is in the gap list with its reason
- `pnpm verify` is exit 0 with no database running

## Notes

This task deliberately ships no table. Task 1.11.2's lesson is the one it is built on: the
artefact was run outside the workspace before any platform saw it, because "a platform
failing on an artefact that was never correct is the most expensive failure to read". A
migration mechanism whose first migration is also its first schema is exactly that
artefact.
