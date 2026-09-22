# Task 3.7.6 — The deploy rehearsed against a populated store, and what nothing checks

**Status:** Not started
**Story:** [3.7 The Tape on the Bar](STORY.md)
**Depends on:** 3.7.5

## Objective

Criteria 4 and 5, taken as a rehearsal rather than a reading: **the migration
applied to a store with rows in it, timed, under the deploy's own ceiling and
with the deploy's own ordering** — schema first, then the code — and the
window between them shown survivable. Then the residue: what `pnpm verify`
cannot see about this story, written into `docs/GAPS.md`.

## What the user can see when this lands

**Nothing.** Confidence that the next merge does not stall on a 45-million-row
scan.

## Why a rehearsal and not the figure from 3.7.2

3.7.2 timed the migration alone. **The deploy runs it inside `timeout 120`,
under Kysely's single transaction and a session-level advisory lock with a
one-hour timeout, on a Burstable B1ms instance rather than a laptop**, and then
rolls the backend while the previous revision is still writing. Three things
can go wrong there that a local timing cannot show: the scan exceeding the
budget, the lock held by a stalled earlier run, and the old writer meeting the
new column.

## Work

- **Rehearse the ordering locally**: apply the migration to the populated
  store, then run the _previous_ build's backfill path against it (the
  writer that does not know the column) for one symbol, and confirm the
  insert succeeds on the default — the additive rule, demonstrated rather
  than asserted
- **Take the B1ms figure honestly.** If the deferred validation from 3.7.1 is
  the only scan and it runs out of band, document the command, who runs it,
  and what happens if nobody does (a `NOT VALID` check still enforces every
  new row — say so). If a scan is inside the migration, extrapolate the
  laptop figure to the tier and state the assumption; if it does not fit in
  120 s with margin, the migration is wrong and goes back to 3.7.1
- **`check-deployed.mjs`** — decide whether the post-merge check should read
  the column's presence (it reads freshness already), and add it or record
  why not
- **`docs/GAPS.md`**: the claims this story leaves standing that nothing
  mechanical guards — at least: that the deferred validation was ever run;
  that the ledger's withdrawn columns are not read by anything (a grep
  re-measure, or an invariant if it can be one); and that a bar's tape and
  its ledger row agree, which only a database test can see and only when
  somebody runs it
- **`pnpm invariants`** for anything above that is a single grep, with its
  `pnpm break` entry

## Done when

1. The deploy's ordering is rehearsed against rows, and the old writer's insert
   on the new column is shown to succeed
2. The deploy-time cost is stated for the B1ms tier with its assumption, and
   fits the ceiling with margin
3. `docs/GAPS.md` carries this story's residue, each with a re-measure
4. `pnpm verify` passes; `pnpm test:database` passes
