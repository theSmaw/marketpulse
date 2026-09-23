# Task 3.8.4 — One minute, two rows, and the 500 that arrives otherwise

**Status:** Not started
**Story:** [3.8 Storing the Live Session](STORY.md)
**Depends on:** 3.8.3

## Objective

**Task 3.8.1's decision creates a hard failure in the read path, and this task
is the repair.** Keeping both tapes means a `(security, timeframe,
observed_at)` minute may hold **two rows**. `readSeries` selects them in
`observed_at` order, `toStoredSeries` maps them to bars, and `toBarSeries`
**throws**:

```ts
if (current.startsAt.getTime() <= previous.startsAt.getTime())
  throw new RangeError("Bars must be strictly ascending by startsAt, …");
```

So the first chart request over a session that has been reconciled — a live
session written by Story 3.8's writer and then filled by the nightly backfill —
is a **500 on a page load**, for every reader, for that window. Not a
preference, not a degradation: a thrown error where a chart should be.

**Decide which row a reader is served, and make the read path return one bar a
minute.**

## What the user can see when this lands

**Nothing new — and one thing that never becomes visible, which is the point.**
The chart of a reconciled session draws. Without this task it does not draw at
all.

## Why this is its own task and not a line in the writer's

The writer does not break anything on the day it ships: it writes today's IEX
bars into a window the backfill has not filled, so there are no duplicates and
`toBarSeries` is happy. **The failure arrives the first night**, when the
backfill stores the consolidated version of the same minutes — which is the
moment Task 3.8.1 was created to make deliberate.

**A hazard between the two tasks, stated so it is not discovered.** Between
3.8.3 landing and this task landing, a local store that has both a live-written
session and a backfill run over it **will 500 on that window**. Do not run
`pnpm backfill` over a live-written session in that window, or rebuild the store
if you do.

## The decision this task takes

**Which tape does a served chart prefer when both cover a minute?** The
candidates, and none is obviously right:

1. **The consolidated bar always.** It is the better number — a full tape rather
   than one venue — and it is what a chart of a past session should show. But
   during a session the consolidated bar does not exist yet for recent minutes,
   so the rule is _prefer SIP, fall back to IEX_, and a chart drawn at 15:00
   changes shape at 21:00. That is honest and is what the source note is for.
2. **The tape that was observable first.** Draws what a reader would have seen
   live, which is Epic 13's want and `PRODUCT_SPEC.md` §22's rule — but it is
   the **wrong** rule for an ordinary chart of last Tuesday, which should show
   the best available history.
3. **Prefer by coverage per window**, choosing whichever tape covers more of the
   requested range. Stable within one answer and unstable across two; a window
   nudged by one minute could flip tapes and redraw the whole chart.

**Recommendation to argue rather than assume: candidate 1**, because a served
chart is _the best account we have of what happened_, while _what was knowable
at the time_ is a different question the store can still answer because both
rows are kept. Epic 13's replay reads with its own rule; that is precisely why
ADR 0035 kept both.

**And the provenance must not lie about it.** If a window is served as SIP
where SIP exists and IEX elsewhere, `provenance.sources` must describe **what
was served**, not what was stored — the stretches come from the rows the answer
contains (`TAPE.md` §8), so the derivation already does this correctly **if**
the preference is applied before the stretches are computed. Apply it in the
right order and assert it.

## Where the choice goes, and the constraint on it

**In the query or in the mapping, and it is not a free choice.** A `distinct on
(observed_at)` with an `order by` naming the preference does it in one statement
and keeps `toStoredSeries` a pure function of the rows it is handed. Doing it in
JavaScript after the fact means the read still carries both rows over the wire
from the database, at the cap-sized window's 9,750 bars — measure before
choosing.

**`readBars` has the same problem and a different answer.** It answers
`StoredBar { bar, feed }` and its one external caller is the replay source,
which wants **every** row rather than a preferred one. Decide whether the
preference belongs to `readSeries` only, and say so where both are declared.

## Work

- The preference, decided and written into `LIVE-SESSION.md` with its
  alternatives
- The read path returning one bar a minute for `readSeries`, with the
  measurement behind where it is applied
- `market-bars.database.test.ts`: a minute holding both tapes is served once;
  the preference is the one decided; `provenance.sources` describes **what was
  served**; a window with no overlap is unchanged
- **A test that fails without this task** — a stored two-tape minute read back
  through `readSeries` — so the 500 has a mechanical guard rather than a memory
- `readBars`' behaviour decided and stated where it is declared
- A `pnpm break` proving the preference is applied
- `LIVE-SESSION.md` §on serving a minute that has two rows

## Done when

1. A window holding both tapes for one minute is served without throwing, and
   the bar served is the one the decision names
2. `provenance.sources` describes the answer rather than the store
3. The replay source's read is decided explicitly rather than by accident
4. `pnpm verify` and `pnpm test:database` pass
