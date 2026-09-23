# Task 3.8.2 — The uniqueness rule, and the migration it needs

**Status:** Not started
**Story:** [3.8 Storing the Live Session](STORY.md)
**Depends on:** 3.8.1

## Objective

Make the store able to hold what Task 3.8.1 decided, and **prove the deploy
survives it** before a single live bar is written.

`market_bars` has carried `unique (security_id, timeframe, observed_at)` since
`0004_market_bars.sql` — a constraint that migration argued for deliberately,
because a backfilled historical bar is final. A live bar is not final, and if
3.8.1 chose to keep both tapes then that constraint is the thing standing in the
way.

## What the user can see when this lands

**Nothing.** A store that can hold two rows for one minute, or the same store
with its rule restated, depending on 3.8.1.

## The rules, before the file

Story 3.7 wrote these down the hard way and they apply unchanged:

- **`0011_*`**, four digits, forward-only, no `down`, immutable once applied.
- **Metadata-only at deploy time.** `deploy.yml` runs `timeout 120 pnpm
migrate` on a Burstable B1ms with 10 MiB/s of I/O, where a full scan of this
  table is **~508 s** (ADR 0034). **Dropping and recreating a unique index is
  not metadata-only** — it is an index build over 48.8 million rows, and it must
  be measured against 10 MiB/s before it is written. `create index
concurrently` cannot run inside Kysely's single transaction, which is the
  trap this task has to solve rather than discover.
- **And metadata-only is not the same as free.** `CLAUDE.md`'s _Data layer_
  trap, added by Task 3.7.6: an `ALTER TABLE` takes an `ACCESS EXCLUSIVE` lock
  whatever it costs, and every reader of the table queues behind it — 18.16 s
  and 16.16 s measured, against a 0.09 s baseline.
- **The deploy window.** The migration runs before either half of the code
  rolls, so for a few seconds the old writer meets the new rule. Task 3.7.6
  rehearsed that for a column; rehearse it for a constraint, which is the
  harder case: a **narrowed** rule can refuse a write the old code makes.

## Work

- The migration 3.8.1's shape calls for, with its comment block carrying the
  argument — including, if it drops or replaces `market_bars_unique_bar`, what
  that costs on the tier and how the index is built without holding the
  transaction
- `schema.ts` brought into agreement, with the comment saying what the key means
  now and why
- `market-bars.database.test.ts`: the constraint read back from the catalogue
  and compared against what the code believes, the way `market_bars_feed_check`
  already is
- **Time it against the populated local store and against `marketpulse_bare`**,
  and state the B1ms assumption the way 3.7.2 did
- A `pnpm break` entry for whichever clause carries the decision
- `LIVE-SESSION.md` §on the key: what a row is unique by, and what that lets the
  store hold that it could not before

## Done when

1. The migration applies to a store with rows in it, timed, inside the deploy's
   ceiling with the margin stated — or, if it cannot be, the shape goes back to
   3.8.1 rather than the ceiling being argued with
2. `schema.ts` and the migration agree, proved by `pnpm test:database`
3. The old writer's insert is shown to survive the deploy window
4. `pnpm verify` passes; `pnpm test:database` passes
