# Task 2.9.10 — Verify, document, ADR

**Status:** Not started
**Story:** [2.9 Market Data API](STORY.md)
**Depends on:** Task 2.9.9

## Objective

Close the story: re-take every acceptance criterion rather than citing it, finish
`MARKET-DATA-API.md`, add the ADR, and sweep what this story falsified.

## Work

- **Re-take the seven criteria, each against the thing it is about**, and say
  which instrument answered each. Criterion 1 is a compile error **produced**, not
  described — add a field, see `TS1360`, remove it. Criterion 3 is four responses
  quoted with their request ids. Criterion 5 is Task 2.9.9's table. Criterion 6 is
  the route-table walk plus the `app.inject()` suite. Criterion 7 is `pnpm verify`
  at exit 0 **with no database running**.

- **Run the gates this story can break, not only the one this file names**:
  `pnpm verify`, `pnpm test:database` against a real server, and `pnpm e2e`
  against a locally started pair — Task 2.9.7 touches a rendered page, so the
  browser suite is in scope. All three of `verify`, `e2e` and `database` are
  required checks on `main`.

- **Finish `MARKET-DATA-API.md`** as the subject document for this story: the
  namespace, the four decisions with their alternatives and condition-shaped
  reversal triggers, the provenance decision from Task 2.9.4, the caching result
  from 2.9.8, and 2.9.9's measurements with their dates. Add it to `CLAUDE.md`'s
  _Where the record lives_ table, and add nothing else to `CLAUDE.md` — that file
  holds rules and traps, not figures.

- **Write the ADR** — the next free number after 0020, never a reused one. The
  decision worth recording is not "we added an endpoint": it is the pair the rest
  of the product inherits — **how a time window is expressed on this wire**, and
  **what a series says about where it came from when the store deliberately holds
  no provenance** — and, added 2026-09-09, **the read-side join**: that this
  product answers "up to now" by stitching a stored SIP history to a live tail and
  reporting both feeds, rather than by ending the chart at the last close. The cap
  and its measured basis belong in it too; the downsampling decision is the
  interesting **negative**. Index it in `docs/adr/README.md`.

- **Sweep upward, the same day.** Falsification travels from a task to a
  governing document, and nothing sweeps upward on its own: grep for any claim
  this story changed, amend the **live** sites, give an ADR a **dated amendment**
  rather than a rewrite, and leave historical records in story and task files
  standing. Known candidates: `readBars`' comment saying Story 2.9 owns the series
  read; `database.ts`'s reversal trigger; `BARS.md` §8.13's "no owner written
  down" for the read-side join, which **now has one** — Task 2.9.5;
  `PROVIDER.md` §2.4, whose stitch case is no longer hypothetical; and Story
  2.10's and 2.12's files, which should inherit this contract rather than
  rediscover it. **Added 2026-09-09 and certain rather than conditional:**
  `database.ts`'s _"nothing in this application serves data yet"_, false since
  Story 2.4 and doubly so now; `market-provenance.ts`'s module comment
  anticipating the first stitch, which has happened; and `CLAUDE.md`'s
  "no state library yet / four hooks" line if Task 2.9.7 moved it.

- **Write the stakeholder section** in the shape Task 2.4.2 and 2.8.9 established:
  what this actually did in plain terms, why the small decisions went the way they
  did, and where it leaves the product. Say plainly that the visible result is one
  column of real prices and that the chart is next.

## Done when

- All seven criteria re-taken, each with the instrument named and the reading
  quoted
- `pnpm verify`, `pnpm test:database` and `pnpm e2e` all pass, and the numbers
  (`pnpm test`'s three-way split, the database count) are re-read rather than
  carried forward
- `MARKET-DATA-API.md` is complete and linked from `CLAUDE.md`; the ADR is written
  and indexed; the upward sweep is done and its greps recorded
- `STORY.md`'s status is Complete and its open decisions are struck through with
  pointers to where each was settled

## Notes

Half of Story 2.8's criteria could not be re-taken from a clean clone because they
were properties of a populated database, and that story said so criterion by
criterion. The same is true here for criterion 5. Say which half is code and which
half is data.
