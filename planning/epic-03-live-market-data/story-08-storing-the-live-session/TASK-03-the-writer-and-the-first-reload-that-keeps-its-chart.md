# Task 3.8.3 — The writer, and the first reload that keeps its chart

**Status:** Not started
**Story:** [3.8 Storing the Live Session](STORY.md)
**Depends on:** 3.8.2

## Objective

Write the live session down, and **make the payoff visible in the same task**.
This is the story's headline and the first thing a stakeholder can be shown:
open a security during a session, reload, and the chart still reaches the edge
it reached before.

## What the user can see when this lands

**The first genuinely new thing this story gives a user**, and there are two of
them.

**1. A reload no longer costs today.** Before this task, every cold load during
a session drops back to the sixteen-minute embargo cliff and the chart rebuilds
from the socket as frames arrive. After it, the store holds today and the page
paints today's session immediately. The same chart **out of hours** draws
today's completed session in full, before the nightly backfill has run.

**2. The two-feed sentence appears on screen, from real data, for the first
time in this product's life** — and it needs no new code. `SourceNote` already
renders one stretch per `BarSource` when a series names more than one feed, and
Task 3.7.5 made a stored window produce exactly that. So the moment this writer
puts an IEX bar into a window the backfill filled with SIP, the source note at
the foot of the Security Explorer reads its stretches in contribution order with
their bar counts — `All US exchanges`, then `IEX` **with the sentence that says
it is one venue rather than the whole tape**, which is `PRODUCT_SPEC.md` §7.1's
requirement and the sentence `CLAUDE.md`'s invariant 6 exists for.

**Check that claim before relying on it** — it is derived from reading
`namesFeeds` and `describeSeriesFeeds`, not from having seen it — and if it is
true, **photograph it**, because it is the most showable thing in this story.

## The constraints this writer is under, all of them already decided

- **The tape comes from the series' own provenance.** `writeBatch` takes it as
  its fifth argument and `MarketBarsTable.feed` is required on insert, so a
  writer that omits it does not compile (`TAPE.md` §6).
- **The overlap refusal is yours to lift, and it is the only one.**
  `ForeignSourceError`'s three reasons are `stitched`, `provider` and
  `overlap`; the first two stand. Lifting `overlap` is what 3.8.1 decided, and
  `MarketBarsTable.feed`'s update type is `never`, so a shape that moves a
  tape on a correction changes that type **on purpose** (`TAPE.md` §7).
- **`observed_at` is supplied by the writer, always.** It never has a default,
  because `default now()` silently turns _when it was true in the market_ into
  _when we wrote it_ on the column replay keys on — and this is the first row in
  the product where the two differ by **seconds** rather than hours, which is
  exactly the case where the mistake is invisible.
- **Partial minutes are not stored as complete ones.** A bar for the minute in
  progress is not the same object as the 389 finished ones; writing one down as
  final is a false record rather than an early one.
- **Idempotence, three ways.** A reconnection replays bars, a restart
  re-subscribes, and the socket occasionally repeats itself. None may produce a
  second row or a unique violation on an ordinary Tuesday.
- **Extended-hours bars are kept**, and the instant is kept **exactly** — the
  pre-market word is derived from the instant through Story 2.5's calendar and
  must not become a stored boolean (Story 3.4's close).
- **What the writer claims as `coverage.covered` decides whether tonight's
  backfill ever asks** — added 2026-09-23 by Task 3.8.1, which found it while
  pricing the shapes. `planRequests` skips a session wholly inside the covered
  window (`if (session.open >= common.start && session.close <= common.end)
continue;`) and `commonCoverage` takes the **intersection** across symbols.
  A writer that claims today's session as covered therefore stops the
  consolidated version from ever being fetched: the store keeps the thin IEX
  session **permanently, with no collision, no error and nothing on screen to
  see it** — which is worse than any shape the story named and is the default
  if nobody decides. Claiming only up to the last bar seen keeps the ledger
  honest and the backfill asking, at the cost of a `commonCoverage`
  intersection that is the earliest of 518 lagging ends. **Decide it here and
  write it into `LIVE-SESSION.md` §3**; Task 3.8.7 rehearses it and asserts
  that the backfill asked at all.
- **The transaction's duration is a deploy decision.** Task 3.7.6 measured that
  a migration queues behind any open transaction on this table and takes every
  reader with it. Today the only writer is a nightly backfill in two cron
  windows; you make it six and a half hours a day. **Measure the transaction
  you ship** and record it in `LIVE-SESSION.md`; prefer short transactions to
  few ones where the choice is free.

## Work

- The write path: live observations → `market_bars` with their tape, and the
  ledger extended to match. `recordSeries` already extends the ledger inside the
  same transaction, which is what makes the reload payoff fall out
- Whatever the partial-minute rule requires — the feed's own `updatedBars`
  behaviour (§7.8: a bar superseded ~30 s later) is the mechanism, not a clock
- `market-bars.database.test.ts` and a process-level test: the three idempotence
  cases, the partial minute refused, `observed_at` preserved exactly
- A `pnpm break` for the rule that would be silently wrong — the `observed_at`
  default is the obvious candidate
- **Measure the write transaction** and record the figure
- **Open the page and look**, during a session or against the fixture feed:
  reload and confirm the chart holds; then confirm or refute the two-feed
  sentence above and screenshot it either way
- `LIVE-SESSION.md` §on the writer

## Done when

1. A minute bar arriving on the socket is stored with its tape, and the ledger
   agrees — criterion 1
2. A cold load during a session serves today's bars from the store and reaches
   the same edge — criterion 2, **confirmed in a browser rather than in a test**
3. Storing the same bar twice produces one row and no error — criterion 3
4. A bar for the minute in progress is not recorded as complete — criterion 4
5. `observed_at` is supplied in every path and nothing defaults it — criterion 6
6. The write transaction's duration is measured and recorded
7. `pnpm verify` and `pnpm test:database` pass
