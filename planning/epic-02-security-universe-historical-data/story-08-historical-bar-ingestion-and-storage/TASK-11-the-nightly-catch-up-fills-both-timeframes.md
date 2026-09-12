# Task 2.8.11 — The nightly catch-up fills both timeframes

**Status:** Complete — 2026-09-12
**Story:** [2.8 Historical Bar Ingestion, Storage & Backfill](STORY.md)
**Depends on:** 2.8.7, 2.8.8
**Added:** 2026-09-12, after the story closed

## Why this task exists after the story closed

[`BARS.md`](BARS.md) §8.18 found, on 2026-09-10, that the scheduled catch-up
fills **minute bars only** — `--sessions 10` with no `--timeframe`, against a
`backfill.ts` that defaults to `1m`. It **deliberately did not repair it**, for
a reason that was about ownership rather than difficulty: changing a scheduled
workflow that spends vendor quota is a decision, and the backfill is this
story's subject rather than Story 2.9's. A task reaching across stories to
change a cron is how a story stops having an owner.

It wrote the condition instead:

> **The first screen whose correctness depends on a daily close being current.**
> … Story 2.12's price chart and Epic 5's anomaly detection both are. **Either
> of those firing makes this a task rather than a note.**

**Story 2.12's price chart shipped on 2026-09-12 and the condition fired the
same day.** This is the task that condition named, opened against the story that
owns the file, which is the arrangement §8.18 was protecting.

## What the user could see before it landed

On `/securities/ADI`, three dates and two closes **4.6% apart**:

- **"LAST SESSION CLOSE 362.25 ▲ +1.61%"**, dated `2026-09-04`, from a stored
  daily bar
- **"…minute bars through 2026-09-10"**, from the minute ledger
- **the chart ending at 378.98** on `2026-09-11`

Every figure individually true; the composition not. `LAST SESSION CLOSE` is a
false label once Sep 4 is no longer the last session, and a `+1.61%` from a week
ago sits beside a chart that contradicts it. §8.18 had argued a date-stamped
stale close was "honest, if stale" — which held while it was the only price on
the page and stopped holding the moment a chart was drawn next to it.

## What the user can see now

The identity block and the chart agree, because the daily table is current.
Nothing was added to the screen and nothing moved; a number stopped being wrong.

## Work

- **The scheduled run does two passes, daily first.**
  `--timeframe 1d --sessions 10`, then `--sessions 10`. A `workflow_dispatch`
  still runs its input **verbatim and exactly once** — an operator resuming from
  the ledger is naming a range and must not have a second pass invented for them.

  Daily first is load-bearing: the `1d` pass is minutes, the `1m` pass is the
  heavy one and in steady state plans zero requests, so if the deadline is ever
  reached the pass sacrificed is the one that was already current.

- **One deadline shared across the passes.** Two at 4h50m would be 9h40m against
  a 5h30m job backstop — the `timeout-minutes` failure that block exists to
  avoid. A pass reached with under a minute left is **skipped with a warning and
  status 124** rather than given no time: a graceful stop exits `0`, so without
  that check an out-of-budget pass is indistinguishable from a clean one.

- **`pnpm bars:check` reports both timeframes.** It was hard-coded to
  `--timeframe 1m` — the one instrument that reports staleness honestly, asked
  only about the timeframe that is never stale. This is the half that stops the
  next occurrence being found by a person looking at a page. `check-bars.ts`
  already knew: its own remedy text names `pnpm backfill --timeframe 1d`.

- **The header's stale clauses corrected in place.** The file said "no
  `schedule:`" in a section above the `schedule:` that Task 2.8.7's reversal
  added, and described the catch-up as one timeframe. Both amended; the
  historical account of why the schedule was added is left standing.

## Done when

- The scheduled run fills `1d` and `1m`; a dispatch is unchanged
- The two passes share one deadline and an exhausted budget is reported
- `bars:check` runs for both timeframes in the post-run summary
- `BARS.md` records that §8.18's condition fired and what was done
- `pnpm verify` passes

## How it was verified, and what was not

**Nothing in `pnpm verify` reads this file** — it is on `CLAUDE.md`'s list of
files no tool reads, and a YAML-embedded shell script is checked by nothing. So
the loop was extracted and run as a standalone script against a stub backfill.

Note the first run of that harness proved only that **`timeout` is GNU coreutils
and is absent from macOS**, which is worth knowing before trusting a local
rehearsal of a Linux runner: it exits 127 and every pass "fails". With a stub in
place, four behaviours were confirmed — a scheduled run does two passes daily
first; a dispatch does one verbatim; a failing pass stops the run and propagates
its status; an exhausted budget warns and returns 124.

**Not verified here:** that the catch-up actually fills the missing sessions.
That is a metered run against the vendor and is an operator dispatch rather than
part of this change. The sessions missing at the time of writing were
**2026-09-08, 09, 10 and 11** — four, not eight days, because 2026-09-07 is
Labor Day and is `closed` in the checked-in calendar.

## Notes

**The cheaper condition did not fire first, and that is the lesson worth
keeping.** §8.18 named a second trigger it expected to fire sooner — _the next
change to `backfill.yml` for any reason at all_, on the grounds that the fix is
one line in a file that would already be open. No such change came in the two
days between, so the expensive condition fired first, in front of a user. A
trigger written against "the next time somebody opens this file" is a trigger
with no scheduled fire date.

**What is still true and is deliberately not fixed here.**
`routes/securities.ts` reads its close at `CLOSE_TIMEFRAME = "1d"` and reports
coverage at `REPORTED_TIMEFRAME = "1m"` — two timeframes in one row, with
nothing on screen saying so. That is correct by design and it is a real
performance decision: 345k daily rows against 48M minute ones. With the daily
table current the two agree, so the composition is honest again. **The class of
defect is not removed**, only the instance: any future divergence between the
two tables reappears on that row, and the thing that now catches it is
`bars:check` reporting both timeframes rather than a person.
