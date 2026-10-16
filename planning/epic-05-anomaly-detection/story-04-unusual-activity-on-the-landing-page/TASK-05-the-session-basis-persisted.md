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

## Shaped by Tasks 5.4.2–5.4.4 — 2026-10-16: the shape is settled, and `0013` is the pattern to mirror

**`0014` is the schema's SECOND derived table, and it must say so in three
places** — the migration, `schema.ts` and the ADR — exactly as `0013` does. Read
`0013_return_baselines.sql` §1 before writing a line: it states the cost of
omitting the label, which is that _"a later story that wants to change the
breakpoint grid, the lookback, the split ceiling or the sample rule would
believe it had to migrate the rows rather than delete and re-run them."_ The
same applies here to the row count and the ranking rule.

**Keyed by the session it is FOR**, not by when it was written —
[ADR 0044](../../../docs/adr/0044-a-derived-aggregate-is-computed-nightly-and-keyed-by-the-session-it-is-for.md)'s
shape, which this epic has already proved. `observed_at` takes **no default**,
because `default now()` silently turns the column replay keys on into the one
recording when we wrote it (`0002`'s decision 3).

**Metadata-only at deploy time, and measure it against 10 MiB/s before writing
it.** `deploy.yml` gives `pnpm migrate` a `timeout 120`, an `ALTER TABLE` takes
`ACCESS EXCLUSIVE` whatever it costs, and Postgres queues every later request
**behind a waiting exclusive one** — rehearsed at **18.16 s** behind one open
write transaction, with an ordinary chart read waiting **16.16 s** behind _that_
against a 0.09 s baseline. A new table is cheap; adding anything to
`market_bars` is not.

**What the row holds**, settled by what 5.4.2 ships and 5.4.4 draws: the
security, the session, the ordinal, `aboveSample`, the counted `sampleCount`,
the signed `percent` (needed for the **direction glyph** 5.4.3 ships — the
percentile is a magnitude, so the sign is not recoverable from the ordinal), the
two endpoint instants with their tape, and the generation it was ranked against.
A refused security gets **no row**, and the three population counts plus the
**five refusal counts** are stored for the session too — otherwise 5.4.4's
footer cannot be honest out of hours, and it is the same sentence either way.

**The basis switch is read off the frame, never a clock.** `MeasuredQualifier`'s
`session` member already carries a date and `describeMeasuredSet`'s second
grammar already renders it, so **no widening** — that is the whole reason Gate 1
chose persistence over a refusal. The screen must not grow a second clock;
`pnpm invariants` refuses one by name.

**Never ship a held in-memory figure as a session score.** The two must be
distinguishable on the wire, or a process with a stale trailing window and one
with none draw the same thing for different reasons. Note 5.4.2 gates on
`basis === "observed"` precisely so that the in-memory path **cannot** leak out
of hours — do not relax that gate; add the session path beside it.

**Extend the nightly job rather than adding a second one.** It already reads 60
sessions per security in **11.78 s warm / 20.67 s cold**, so the session's
closing figures are a by-product of a pass already running, and it lands in
`backfill.yml` after the fill like the baseline. **Re-measure the pass's total
afterwards rather than assuming it is unchanged** — the epic file's own `4–13
minutes` was a projection that was wrong by 20–66×.

**And this is the task that could fire ADR 0038's frame-grain trigger**, which
Task 5.4.2 recorded **unfired**. It stays unfired only while the session figure
is an **input read on the batch's cadence from a table** — like `lastCloses`. If
it ever becomes a figure the gateway withholds and refreshes on its own clock,
**the trigger fires and the ADR needs amending in the same change**.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — YYYY-MM-DD

## For a stakeholder — a status report, YYYY-MM-DD
