# Task 2.14.1 — The first read: the query, the mapping, and the seam

**Status:** Not started
**Story:** [2.14 The Tracked Universe On Screen](STORY.md)
**Depends on:** Story 2.3 (rows to read)

## Objective

Write this application's first `selectFrom`, the mapping from a row to a domain object, and
the module arrangement Epic 13's temporal isolation depends on — in that order of
importance, because the third is the one that cannot be retrofitted.

## What the user can see when this lands

**Nothing, and that is correct for this task.** No route changes, no endpoint exists yet,
and the deployed application is byte-identical. What exists afterwards is a function that
returns the tracked universe as `Security[]`, proven by `pnpm test:database` against a real
server.

Say this in the task's own write-up rather than leaving it implied. A task that changes
nothing visible is fine; a task that changes nothing visible **and does not say so** is how
a reader concludes the work was not done.

## Work

- **Write the query, and write the seam around it at the same time.** `CLAUDE.md` records
  that the first `selectFrom` owns "the module whose export list is the whole guarantee":
  Epic 13 attaches a temporal plugin with `withPlugin`, which returns a **different object**,
  so the guarantee holds only while there is no unplugged handle to import. `migrate.ts` and
  `load-universe.ts` both already build a `Kysely` instance and deliberately do not export
  it; this module is the first one whose job is to be _read from_, so it is the first place
  the arrangement is load-bearing rather than incidental
- **Note the one thing that makes this cheap here and expensive later**: `securities` has no
  `observed_at` and is not a temporal table, so nothing here would be filtered by that
  plugin even when it exists. The seam is therefore established against a case where getting
  it wrong has no symptom at all — which is exactly why it must be got right now, and why
  `market_bars` in Story 2.7 is not the place to be discovering the pattern
- **Write the mapping as one function per domain type, beside the query, and never a generic
  row-to-object mapper.** `migrations/README.md` §6 fixes this and gives the reason: the
  mapping is exactly where a nullable column becomes an explicit domain answer, and a
  generic mapper is where that decision gets skipped. Here that is concrete — the row has
  one nullable `sector` column and `Security` is a **discriminated union** in which a null
  sector means two different things depending on `kind`. The mapper is where those separate
  again
- **Decide what happens to a row that does not map**, rather than letting it throw from
  inside a request. A row whose `kind` is not in `SECURITY_KINDS` cannot exist — the database
  refuses it — so the honest question is what the code does if it does anyway. Prefer failing
  the whole read loudly over silently dropping a security from the universe, and say which
- **Filter on `status`, and treat that as the story-level decision it is.** `status` is an
  **invisible predicate**: `UNIVERSE.md` §3's rule is that it is _displayed rather than
  filtered away wherever a human is looking at a security_. So the read should return
  untracked securities and let the page show them as untracked, rather than hiding them —
  and whichever is chosen, it is a decision recorded here and inherited by Story 2.8
- **Test it against a real database**, in `pnpm test:database`, which already creates,
  migrates and drops its own `marketpulse_vitest` and does nothing to the database you are
  working in. Load the universe into it and read it back: the count, one row of each kind,
  and the two meanings of a null sector arriving as the union's two variants

## Done when

- The universe can be read out of Postgres as `Security[]`, asserted against a real server
- The three kinds each round-trip, and an index proxy's null sector arrives as the variant
  that says there is no answer rather than as a missing one
- No unplugged query handle is exported from the module, and the reason is written beside
  the export list rather than in a task file
- `pnpm verify` passes with no database running

## Notes

The temptation is to write four lines that return rows and move on, because the endpoint is
the interesting part and this is plumbing. The seam is the reason not to: it costs almost
nothing to establish now and it is the one thing in this story that Epic 13 cannot repair
from the outside.
