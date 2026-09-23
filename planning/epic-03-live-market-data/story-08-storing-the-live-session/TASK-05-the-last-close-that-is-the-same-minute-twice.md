# Task 3.8.5 — The last close that is the same minute twice

**Status:** Not started
**Story:** [3.8 Storing the Live Session](STORY.md)
**Depends on:** 3.8.4

## Objective

**Task 3.8.4 repaired one read and there is a second one with the same defect,
and this one does not throw — it lies.**

`readLastCloses` takes the newest **two rows** for each security and calls them
`(last, previous)`. It has assumed since Task 2.9.6 that two rows means two
minutes. Since ADR 0035 and `0011` a minute may hold a row per tape, so on a
reconciled session the two newest rows are **the same minute on two tapes**, and
`previousClose` becomes the other tape's version of the close it is being
compared against.

Measured on the populated store, 2026-09-23, by inserting a three-minute live
session and a backfill over it:

```text
BEFORE: close 218.19 at 2026-09-11T19:59Z,  previousClose 218.38
AFTER : close 301    at 2026-09-14T13:32Z,  previousClose 201
```

`301` is the consolidated close for 13:32. `201` is the **IEX close for
13:32** — the same minute. The change this produces is roughly **+49.8%**, and
it is drawn as an ordinary price move.

**Make the last close and the previous close two different minutes again.**

## What the user can see when this lands

**A number that is currently a lie stops being one.** `readLastCloses` feeds
`GET /securities`, which feeds the universe table's `LAST CLOSE` and `CHANGE`
columns for **all 518 rows** on `/securities` and on every route that renders
the table. On the first night after a live session, every security the live
writer touched would print a fabricated double-digit move with an arrow and a
colour, indistinguishable from a real one.

`PRODUCT_SPEC.md` §35 lists what this product must not do, and two of its lines
are this defect exactly: it must not **manufacture missing observations**, and
**every generated conclusion should be distinguishable from an observed fact**.
A change computed between two versions of one minute is neither.

## Why it is worse than the 500 it is a sibling of

Task 3.8.4's failure was a thrown error: loud, total, and obviously a fault.
**This one renders.** It produces a plausible number in the right format, in the
right place, on the product's most-populated surface — and nothing anywhere says
it is wrong. A reader would have no reason to doubt it, which is the whole of
why it ranks ahead of the tasks it was inserted before.

## The decision this task takes

**Does `readLastCloses` adopt `SERVED_TAPE_RANK`, and is "the last two rows"
still the right shape?** Two questions, and the second is the one with teeth.

The obvious repair is `distinct on (market_bars.observed_at)` inside the lateral
with the rank as the tie-break, exactly as 3.8.4 did for `readSeries` — one
decision, one home, already argued and already break-verified.

**What makes it a task is the cost.** That lateral's shape is load-bearing and
measured, and the comment above it says so: `limit 2` is what makes the planner
take a bounded backwards walk of `(security_id, timeframe, observed_at)` — 518
index searches returning two rows each, **2,597 buffers** — rather than ranking
every bar. Measured 2026-09-09 at full depth:

| shape                                        | rows  | time       |
| -------------------------------------------- | ----- | ---------- |
| this query, cold                             | 1,036 | 21.4 ms    |
| this query, warm, whole round trip from Node | 1,036 | 4.8–8.2 ms |
| `row_number() over (partition by …)`, cold   | 1,036 | 830.1 ms   |
| the same, warm                               | 1,036 | 182–279 ms |

**That is a 40× margin and it is not to be spent by accident.** `distinct on`
needs a sort; whether the planner can still stream it off the index or falls
back to ranking is a question for `explain (analyze, buffers)` rather than for
reasoning. **Re-measure against the table above and record the new figures
beside the old**, and if the repair is not affordable in that shape, the
alternatives are worth naming rather than assuming:

1. **`distinct on` in the lateral.** One home for the preference. Measure it.
2. **Read more rows and reduce in Node** — `limit` 3 or 4 and take the first two
   distinct minutes. Cheap for the planner and correct, but the number is a
   magic one: it holds while a minute can carry two tapes and breaks silently
   on a third. If this is chosen, the limit is derived from the count of
   `MARKET_FEEDS` rather than typed.
3. **Ask for two distinct instants directly**, which is a different query and
   probably the `row_number()` shape the measurement above rejected.

**Whichever is chosen, `SERVED_TAPE_RANK` is the tie-break** — a table showing
the IEX close while the chart beside it shows the consolidated one would be two
surfaces disagreeing about one minute, which is the defect class
`docs/GAPS.md` entry 13 already carries.

## What to check while you are in here

**Every other read of `market_bars` that assumes one row per minute.** Two were
found by Task 3.8.4 and this task; the sweep is worth finishing rather than
waiting for the third to be found in production:

- `readLastBarDates` — `max(observed_at)` grouped by symbol. **Safe**: a
  maximum over duplicates is the same maximum. Confirm rather than assume.
- `readSeries` — repaired by 3.8.4.
- `readBars` — deliberately unrepaired, for the replay source.
- `writeBatch`'s presence check — tape-scoped since 3.8.2.
- `scripts/bars-check.mjs` and `GET /diagnostics/freshness` — do either count
  rows or compare a count against an expected number of minutes? A count that
  doubles on a reconciled session reports a session as over-complete.

## Work

- The repair, with the **measurement** behind the shape chosen, recorded beside
  the existing table rather than replacing it
- `market-bars.database.test.ts`: a security whose newest minute holds two
  tapes has a `previousClose` from the **minute before**, not the other tape;
  a security with one tape is unchanged
- **A test that fails without this task**, asserting the two instants differ
- A `pnpm break` for it — the defect is silent, which is the whole reason
- The `market_bars` reads audited, with the result written down either way
- `LIVE-SESSION.md` §on the reads that assume one row a minute

## Done when

1. `readLastCloses` answers two different instants for a security whose newest
   minute holds two tapes
2. The tie-break is `SERVED_TAPE_RANK`, so the table and the chart cannot
   disagree about one minute
3. The lateral's measured cost is re-taken and recorded; a regression past the
   2026-09-09 figures is a decision rather than a discovery
4. The remaining `market_bars` reads are audited and the answer recorded
5. `pnpm verify` and `pnpm test:database` pass
