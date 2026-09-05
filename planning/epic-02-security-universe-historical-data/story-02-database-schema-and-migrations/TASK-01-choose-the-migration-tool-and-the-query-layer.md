# Task 2.2.1 — Choose the migration tool and the query layer, installing nothing permanent

**Status:** Not started
**Story:** [2.2 Database Schema & Migration Mechanism](STORY.md)
**Depends on:** Story 2.1 (a reachable database, local and deployed)
**Record:** `DATA-LAYER.md` (in this directory), created by this task — the story's one
document about how this repository describes a database, in the shape
`BROWSER-TESTING.md` has for Story 1.13 and `HOSTING.md` has for Story 1.11. One
document per subject; a second one about the same subject is a copy waiting to disagree

## Objective

Settle the two decisions this story exists for — **how a schema change is described** and
**how a row is read** — by measuring the candidates rather than arguing about them, and
finish with the tree byte-identical to how it started.

These are two decisions and not one, and the most likely way to get this task wrong is to
let a tool that answers both questions answer them together. Prisma and Drizzle each ship
a migrator _and_ a query layer; `node-pg-migrate` ships only a migrator; plain SQL files
with a small runner ship neither. A candidate that bundles them has to win **both**
comparisons, not one and a half.

## Work

- **Measure each candidate the way Story 1.13 measured Playwright and Cypress**, from a
  fresh install against a stated baseline, and revert each one before the next. The
  figures that have decided every dependency question in this repository so far: store
  entries, `node_modules` size, lockfile lines, whether `pnpm-workspace.yaml` stays
  md5-unchanged, and **whether `allowBuilds` fires** — which has fired exactly once in
  this repository's history, and a candidate that trips it is telling you something about
  what it does at install time. Note the baseline rule Task 1.13.1 established the hard
  way: **a virtual-store count is only comparable across a fresh install**, because pnpm
  never prunes
- **Candidates for the migrator**, all worth the spike: plain SQL files with a runner we
  own, `node-pg-migrate`, Kysely's migrator, Drizzle Kit, Prisma Migrate. The precedent
  cuts both ways and both directions should be argued rather than one cited: Story 1.6
  spiked two schema libraries and threw both away because a schema over `process.env` is
  a schema over strings; Task 1.7.6 threw away `react-error-boundary` because it wrapped
  a `key`-based remount you still have to write; and Task 1.8.3 **kept** `@fastify/cors`
  because a hand-rolled version fails in a way that looks like success. **Which of those
  three a migration runner is like is the whole decision**, and the honest answer needs
  the failure mode named: a hand-rolled runner that applies a file twice, or applies files
  out of order, or records a migration as applied when its transaction rolled back, fails
  silently against a database that then diverges from every other copy of it
- **Ask each migrator the question that separates them, and ask it by producing it**:
  what happens on a **partially applied** migration. Does DDL run inside a transaction;
  does the tool wrap the whole file or each statement; does it write its bookkeeping row
  in the same transaction as the change; and what is in the tracking table afterwards. A
  tool whose answer is "the migration is recorded as applied and half of it happened" is
  disqualified regardless of its other properties, and the answer must come from a broken
  migration you ran rather than from a documentation page
- **Candidates for the query layer**: `pg` with hand-written SQL and hand-written row
  types, a query builder with generated types (Kysely, Drizzle), or an ORM (Prisma,
  TypeORM). **The invariant to protect is architectural rather than ergonomic.** Epic 13
  enforces temporal isolation **in the data layer**, so the test is: can "no query may read
  data timestamped after the replay clock" be expressed in **one place** rather than
  remembered at every call site? Write the seam — not the feature — for each candidate and
  see which ones make it a wrapper you cannot go around, which make it a convention, and
  which make it impossible. Invariant 4 says future-information leakage must be
  _structurally_ impossible; a query layer that can only offer a convention is a query
  layer that hands Epic 13 a problem it cannot solve
- **Check the codegen direction against acceptance criterion 7 before falling in love with
  it.** Several candidates generate types by introspecting a **live** database. `pnpm
verify` runs with no database and must keep doing so — Story 2.1 made that a criterion
  twice and measured it twice — so a build step that dials Postgres is disqualifying
  unless the generated output is committed, at which point it needs a staleness answer,
  and this repository has already built a staleness check and deleted it (Task 1.10.5:
  `tsc -b` re-emits from content hashes, so mtimes lie). State which direction generation
  runs, or state that nothing is generated
- **Decide forward-only versus up/down, and decide it rather than inheriting the tool's
  default.** The argument for `down` is that it exists; the argument against is that a
  `down` which has never been executed is a claim rather than a mechanism, and the one
  that matters — reversing a migration that dropped a column with data in it — cannot be
  written at all. Note what makes this cheap to decide **now**: there is no data, so the
  reversal for a mistake in this story is a `DROP`. That stops being true in Story 2.3
- **Decide whether `pg` survives.** `apps/backend/src/database.ts` is the only file that
  knows there is a driver, and Task 2.1.4 measured the two things about `pg` that are
  load-bearing: the credential may be a `() => Promise<string>` called **per connection**,
  which is the shape an Entra token needs, and the two dangerous absences (`pool.on("error")`
  and `connectionTimeoutMillis: 0`). **Any candidate that replaces the pool has to answer
  the per-connection-credential question empirically**, the way 2.1.4 did — three
  concurrent queries against a cold pool of three produced three credential calls — because
  a candidate that mints the credential once at construction is a candidate whose deployed
  connections stop working after 24 hours
- **Revert to a byte-identical tree**, and prove it: `pnpm verify` at exit 0, the lockfile
  and `pnpm-workspace.yaml` restored, the install-script sweep still returning
  `esbuild@0.28.2` and nothing else

## Done when

- Both decisions are recorded in `DATA-LAYER.md` with the rejected candidates, their
  measured costs, and the argument for each rejection
- The partial-migration behaviour of the chosen migrator was **produced**, not read
- The temporal-isolation seam was written for at least two query-layer candidates and the
  difference between them is recorded
- Forward-only versus up/down is decided with its reason and its reversal trigger
- Whether `pg` and `database.ts` survive is stated
- The tree is byte-identical to how the task started, proven rather than assumed

## Notes

This task provisions nothing and ships no schema, deliberately — the same shape as Tasks
1.10.1, 1.11.1 and 2.1.1. The reason is unchanged: this decision is spent across thirteen
more epics and every table in §30 arrives through it, so the first migration in this
repository's history should have one possible cause when it goes wrong.

The thing most likely to be skipped here is the second decision. A migrator is easy to
compare because its job is small; a query layer is easy to defer because `pg` already
works. Deferring it is a legitimate outcome — **"hand-written SQL, and here is where the
temporal seam will go" is a decision** — but it has to be taken rather than arrived at.
