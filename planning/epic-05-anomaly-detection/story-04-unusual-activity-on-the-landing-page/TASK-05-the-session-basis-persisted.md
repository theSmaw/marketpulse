# Task 5.4.5 — The session basis, persisted

**Status:** Not started
**Story:** [5.4 `Unusual activity` on the Landing Page](STORY.md)
**Depends on:** 5.4.4

## Objective

**The market is shut about 80% of the week, and a region blank in four of five
screenshots looks broken.** As written AC 12 was unsatisfiable: there is no
score table, and `trailing-window.ts` has no store-backed fill by Epic 5's own
Gate 1 decision 3 — so a restarted replica holds nothing, while a process that
was up at the bell would serve yesterday's 15:55→16:00 pair **for ever**,
because eviction is relative to `newest.bar.startsAt − retainMs` **inside
`record()`** and nothing arrives when the market is shut.

Gate 1 decision 2: persist the session's closing score nightly.

## What the user can see when this lands

**Out of hours `/` draws the last session's ranking, labelled with the session
it describes** rather than an empty region or a figure whose age depends on how
long the process has been up.

## Work

- **Migration `0014`, metadata-only at deploy time.** One row per security per
  session, keyed by the session it is **for** — ADR 0044's shape, which this
  epic has already proved. `observed_at` takes **no default**, because
  `default now()` silently turns the column replay keys on into the one that
  records when we wrote it. Measure it against the tier's **10 MiB/s** before
  writing it, and remember an `ALTER TABLE` takes `ACCESS EXCLUSIVE` whatever
  it costs, queueing every later request behind it.
- **Extend the nightly job rather than adding a second one.** It already reads
  60 sessions per security in **11.78 s warm / 20.67 s cold**, so the closing
  5-minute return is a by-product of a pass that is already running. It lands in
  `backfill.yml` after the fill, like the baseline.
- **The out-of-hours basis is `session`**, which is why this task dissolves the
  AC 3 ↔ AC 12 contradiction rather than trading it: `MeasuredQualifier`'s
  existing `session` member carries a date, so `describeMeasuredSet`'s second
  grammar renders the footer with **no third member and no widening**.
- **Two bases, one region, never both at once**, and the switch is read off the
  frame rather than off a clock — the screen must not grow a second clock, and
  `pnpm invariants` refuses one by name.
- **Never ship a held in-memory figure as a session score.** The two must be
  distinguishable on the wire, or a process with a stale window and a process
  with none draw the same thing for different reasons.

## Done when

1. `pnpm migrate` applies `0014` locally and in `pnpm test:database`, and its
   deployed cost is measured against the 120 s the deploy allows.
2. The nightly job writes the rows; the pass's total cost is **re-measured**
   rather than assumed to be unchanged.
3. Out of hours the region draws the last session's ranking with its session
   named, and in session it draws the observed basis — both asserted.
4. A fresh process with an empty trailing window and a store full of scores
   draws the **session** basis rather than nothing, asserted — this is the state
   every merge produces.
5. `pnpm verify`, `pnpm test:database` and `pnpm e2e` green.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — YYYY-MM-DD

## For a stakeholder — a status report, YYYY-MM-DD
