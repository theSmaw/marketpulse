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
  one: IEX's median minute coverage is 82.8% and SIP's 99.7%, and `BARS.md`
  measured that only 8 of 28 S&P 500 constituents print a full 390 minutes.
- **A minute both cover with different numbers** is the interesting one, and
  what happens to it is exactly 3.8.1's decision. Count them.
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
