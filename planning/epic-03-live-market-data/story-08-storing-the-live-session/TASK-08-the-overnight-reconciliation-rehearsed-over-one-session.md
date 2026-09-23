# Task 3.8.8 — The overnight reconciliation, rehearsed over one session

**Status:** Not started
**Story:** [3.8 Storing the Live Session](STORY.md)
**Depends on:** 3.8.6

## Objective

Criterion 5, and it is written to be un-fudgeable: the overnight reconciliation
behaves as 3.8.1's decision states, **proved by running both paths over one
session rather than by reasoning about them**.

This is the first time in this product's life that two writers fill the same
table for the same minutes, and it is the case the whole story was created to
make safe.

## What the user can see when this lands

**Nothing.** Confidence that tonight does not quietly rewrite today.

## The rehearsal

- **One session, both paths, in the real order**: the live writer fills a
  session from the socket (or the fixture feed standing in for it, stated as
  such), then the backfill fetches the same session from the consolidated tape,
  exactly as the nightly cron would.
- **Read the table before and after** with a fingerprint rather than a count —
  the store's own test suite already has `BARS_FINGERPRINT`, and a count hides
  a replacement.
- **Then read the served answer**, because that is what a user meets: how many
  sources does the window name, in what order, with what counts, and what does
  the source note draw.
- **And `pnpm bars:check`** — criterion 9. That script tells the truth about
  what is missing and why, and it was written when one writer filled this table.
  Two writers can make a session look complete when one tape's holes are filled
  by the other's, or incomplete when neither covers a minute nobody traded in.
  Read its output against the session you just built and decide whether it still
  answers honestly.

## What to watch for, named in advance

- **A minute neither tape covers** is not a defect and must not be reported as
  one: **live** IEX's median minute coverage is **65.1%**, worst case 2.1%
  (`LIVE-DATA.md` §7.6, measured on the stream), and SIP's is 99.7%; `BARS.md`
  measured that only 8 of 28 S&P 500 constituents print a full 390 minutes.

  **The figure above was wrong until 2026-09-23** — it read _IEX's median
  minute coverage is 82.8%_, which is `ALPACA.md` §5.2's measurement of the
  **stored** `feed=iex` REST endpoint, struck for the live feed by §7.6 on
  2026-09-16. It matters here more than anywhere: this rehearsal counts the
  minutes the two tapes disagree about, and **a third of a median name's
  minutes are missing from the live tape rather than a sixth.** Sizing the
  expected gap from 82.8% would have made a correct reconciliation look
  broken.

- **A minute both cover with different numbers** is the interesting one, and
  what happens to it is exactly 3.8.1's decision. Count them.
- **The ledger's `covered_end` on the DAILY rows is holding a wall clock, and
  it is yours** — handed here 2026-09-23 by Task 3.8.3, which met it by
  accident. Every `1d` row read `2026-09-14T00:04:38.533Z`, milliseconds and
  all: the moment the backfill ran, not an instant in the market. The `1m` rows
  were honest. `covered_end` is a market-time column sitting on the same row as
  `recorded_at`, which is the confusion `DATA-LAYER.md` separates the two to
  prevent — and it is **the column `planRequests` and `commonCoverage` read to
  decide what to fetch**, which is this task's whole subject. Find the writer
  that sets it (the backfill's daily path is the candidate), say whether the
  value is deliberate, and either correct it or record why a wall clock belongs
  there. Nothing on any screen shows it. `STORY.md` carries the same hand-off.
- **What the live writer claims, which is what makes the backfill ask at all.**
  3.8.3 settled it: `seriesFor()` claims `[first.startsAt, last.startsAt + 1
minute)` and never the session close, so `covered_end` lags the session by
  design. Confirmed against a real ledger — thirty `iex` bars from
  `13:30:00Z` moved it to `14:00:00Z` and no further. **Assert that the
  backfill asked**, which is criterion 5's un-fudgeable half, and assert it
  against a `commonCoverage` intersection that is the earliest of 518 lagging
  ends rather than against one symbol's.
- **The ledger's own claim** after both runs: one contiguous window, a bar count
  that agrees with the rows, and a `provider` that did not change.
  **Assert the bar count against `count(*)` rather than reading it**, added
  2026-09-23 by Task 3.8.2: that task found the writer's presence check
  unscoped to the tape, which made a genuine insert count as a correction and
  never reach `extendCoverage` — the ledger under-reports and **nothing says
  so**. A reconciliation is the first place two tapes meet in volume, so it is
  the first place a residual version of that defect would show. The two
  numbers agreeing is the assertion; either one alone is not.
- **That the backfill asked at all** — added 2026-09-23 by Task 3.8.1.
  `planRequests` skips a session wholly inside the covered window, so a live
  writer that claimed today would make tonight's run report
  `0 fetches, 1 already held` and store nothing, **correctly by its own rules
  and wrongly for the product**. The rehearsal's first assertion is therefore
  not about the rows but about the **request count**: a run that fetched
  nothing has not reconciled anything, and it looks identical to a run that
  reconciled perfectly. `LIVE-SESSION.md` §3.

## Work

- The rehearsal above, with its figures in `LIVE-SESSION.md`
- Whatever `bars:check` needs to stay honest with two writers, or a written
  statement that it is honest unchanged — with the reasoning
- `market-bars.database.test.ts` or `backfill.database.test.ts`: the
  reconciliation asserted end to end, so the rehearsal has a mechanical
  successor rather than being a one-off
- A `pnpm break` for the rule the reconciliation rests on

## Done when

1. Criterion 5 holds, proved by running both paths over one session
2. Criterion 9 holds: `pnpm bars:check` still tells the truth, or is repaired
3. `pnpm verify` and `pnpm test:database` pass
