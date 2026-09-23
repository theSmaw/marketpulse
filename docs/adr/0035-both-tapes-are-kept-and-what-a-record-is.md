# 0035 — Both tapes are kept: what a stored bar is a record of, and what that costs

**Status:** Accepted — 2026-09-23
**Deciders:** the developer, on the owner's instruction to recommend
**Supersedes nothing. Amends `0004_market_bars.sql`'s uniqueness decision**, which is an
applied migration and therefore immutable; this record is that amendment.

## Context

Epic 3 is about to write the live session into `market_bars` (Story 3.8). The
table is already filled nightly by a backfill that fetches **complete sessions
from the consolidated tape**, and the live stream carries **one venue, IEX**. So
from the first stored live bar the same minute of the same security can be
claimed by two tapes, and `0004_market_bars.sql` made a decision that forbids
it:

```sql
constraint market_bars_unique_bar
    unique (security_id, timeframe, observed_at)
```

That constraint was argued rather than defaulted, on a premise that was true
when it was written: **a backfilled historical bar is final.** A live bar is
not — it can be superseded about thirty seconds later (`LIVE-DATA.md` §7.8) and
revised later still (§14.1) — and it is not the same observation as the
consolidated one that arrives overnight.

**What is really being decided is what a stored bar is a record of**, and this
repository has a position already, written before the question became urgent:

> _Historical market-data persistence is a record of what was observed, not a
> cache._

`PRODUCT_SPEC.md` §23 is the reason that position has teeth. The flagship
feature asks **"what was knowable at this moment?"** and answers it using only
information available at that timestamp. An IEX bar overwritten at 21:00 by the
consolidated correction leaves **no trace that the observation was ever made**,
so the honest answer to _what was knowable at 11:07_ becomes permanently
unavailable — not wrong, but unanswerable, and unanswerable in a way no reader
could detect.

## The figures, taken 2026-09-23

**One real stored session** — 2026-09-11, the nightly backfill's own product, on
the local store (48,797,343 rows, PostgreSQL 18.6):

| Reading                     |       Value |
| --------------------------- | ----------: |
| Rows in the regular session | **190,483** |
| Securities                  |         518 |
| Mean bars a security        |   **367.7** |

**One live IEX session** — measured first-hand by Task 3.1.9's spike over a full
session in which **390 of 390 regular-session bar minutes were observed**
(`LIVE-DATA.md` §7.6):

| Measure                                             |  min |      p50 |  p95 |   max |
| --------------------------------------------------- | ---: | -------: | ---: | ----: |
| Symbols producing a bar in one minute (n=390)       |  242 |  **321** |  437 |   513 |
| …as a percentage of 518                             | 46.7 | **62.0** | 84.4 |  99.0 |
| Per-symbol minute coverage over the session (n=518) |  2.1 | **65.1** | 99.0 | 105.6 |

**Every one of the 518 symbols produced at least one bar; none sat still all
day.** Coverage above 100% is the extended-hours tail, which arrives on the same
channel with nothing distinguishing it (§7.7) and is kept (§7.11).

**A correction to a figure this decision was nearly taken on.** Story 3.8's task
file said IEX's median minute coverage is **82.8%**. It is not: 82.8% is the
**stored SIP** figure from `ALPACA.md` §5.2, and `LIVE-DATA.md`'s register
**struck** it for the live feed on 2026-09-16 in favour of the first-hand
**65.1%**. The two are not the same measurement — stored coverage is _of SIP_,
the live one is _of minutes_ — and the live one is worse. Taking the wrong one
would have understated this decision's cost by about a fifth.

**So the duplicate set is near-total rather than marginal.** IEX is a
constituent of the consolidated tape, so a minute that printed on IEX all but
certainly printed on the tape: essentially every live bar duplicates a nightly
one. At the median that is **~125,000–132,000 rows a session**; call it
**~130,000 a day**, against the 190,483 the backfill already writes.

### What keeping both costs, against `BARS.md` §8.3–§8.4

| Reading                             | Today    | With both tapes | Change       |
| ----------------------------------- | -------- | --------------- | ------------ |
| Minute rows a year, 518 securities  | 47.7M    | **80.5M**       | **+69%**     |
| Bytes a row (§8.3, amended)         | 199 B    | 199 B           | —            |
| Storage a year                      | 8.66 GiB | **14.7 GiB**    | **+6.1 GiB** |
| Years to read-only, 22.5 GiB usable | ~2.6     | **~1.5**        | **−41%**     |

**And the funder is already in the table.** `market_bars` is 9,097 MB today —
5,081 MB of heap and 4,016 MB of indexes — of which `market_bars_pkey`, the
surrogate `id`'s index, is **1,045 MB with zero scans** (`BARS.md` §8.5, re-read
here). Dropping it recovers that immediately and ~21 B a row thereafter, which
takes the figure above from ~1.5 years to **~1.7**. It is **Epic 14's to do and
not this story's**, and it is named here so the cost is read against the offset
that exists rather than in isolation.

> **A second offset, banked 2026-09-23 by Task 3.8.2 rather than planned.**
> Putting the tape in the key meant rebuilding `market_bars_unique_bar`, and
> the fresh index is **2,311 MB** against the bloated 2,969 MB it replaced —
> `market_bars` fell from 9,097 MB to **8,439 MB**. That is a **658 MB**
> one-off, about a tenth of this decision's first year, and it does not touch
> the **rate** above. `BARS.md` §8.5 carries it beside the index it corrects.

## Decision

**Both tapes are kept. A stored bar is a record of an observation, and the
observation's tape is part of its identity.**

Concretely:

1. **`market_bars`'s uniqueness gains the tape**, so a `(security, timeframe,
observed_at)` minute may hold one row per tape. Story 3.8's second task
   builds the migration and owns its cost on the deployed tier.
2. **A live-written session is served to every reader, with its label.** The
   source note already renders one stretch per `BarSource` with its bar count,
   and `MARKET_FEED_DESCRIPTIONS` already refuses to let `iex` be shown without
   the sentence saying it is one venue rather than the whole tape — which is
   `PRODUCT_SPEC.md` §7.1's requirement, met per stretch rather than per
   response. Withholding the session would leave a reader looking at yesterday's
   edge during a live session, which is the shortfall this story exists to
   remove.
3. **The consolidated bar is not a correction of the IEX bar.** They are two
   observations of one minute by two instruments. A correction is a revision
   **on the same tape**, which moves numbers and never moves the tape
   (`TAPE.md` §6, and `MarketBarsTable.feed`'s update type is `never`).

### The alternatives, and what each forecloses

- **The consolidated bar replaces the IEX one.** Cheapest in storage and gives
  the best history. It destroys the only record that the live observation was
  made, so §23's question becomes unanswerable rather than merely expensive. The
  product's stated position on persistence is the argument against it, and the
  flagship feature is what that position is protecting.
- **Live bars are never stored.** Cheaper still, and it re-opens `LIVE-DATA.md`
  §10.3 — which declined to hold today's bars in memory (**55.6 MB**, 10.9% of
  the replica) **precisely because the store was about to hold them durably**.
  It is not a smaller version of Story 3.8; it is the cancellation of it, and it
  leaves Story 3.9's chart with nowhere to read today's session from.

## What this decision forced into the open, and it is not a shape

**Today's backfill would never notice the collision at all.** `planRequests`
skips any session wholly inside the covered window:

```ts
if (session.open >= common.start && session.close <= common.end) continue;
```

and `commonCoverage` takes the **intersection** across symbols. The live writer
extends coverage through `recordSeries` as bars arrive. So if it claims today's
session as covered, **tonight's backfill does not fetch it** — and the store
keeps the thin IEX session, permanently, with no collision, no error and nothing
to see. That outcome is worse than any of the three shapes above and is what
happens **by default if nobody decides**.

**So this decision has a second half, and it belongs to the writer**: what the
live writer claims as `coverage.covered` decides whether the nightly backfill
ever asks for the consolidated version. Story 3.8's third task owns it and its
seventh rehearses it; `LIVE-SESSION.md` §3 states it.

## What this does NOT decide

- **The uniqueness rule's exact shape and its migration cost.** A unique index
  over 48.8 million rows is not a catalogue write, `create index concurrently`
  cannot run inside Kysely's single transaction, and the deploy gives it 120 s.
  Story 3.8's second task measures it; if it does not fit, the shape returns
  here rather than the ceiling being argued with.
- **What the read path prefers when a window holds both tapes for one minute.**
  The bars are two rows; which one a chart draws is a read decision, and
  `mergeSeriesProvenance` already reports both stretches honestly either way.

  > **Corrected the same day, 2026-09-23, by Story 3.8's own sweep of this
  > record.** The sentence above is true about the _preference_ and wrong about
  > who owns it, because it assumed the read path degrades gracefully without
  > one. It does not: `toBarSeries` refuses bars that are not **strictly
  > ascending** by instant and **throws a `RangeError`**, so a window holding
  > two rows for one minute is a **500 on a page load** rather than a chart
  > drawn from the less good row. That makes the rule a **precondition of this
  > decision shipping at all**, not a downstream nicety — it is Story 3.8's
  > (Task 3.8.4, inserted for it), and what remains Story 3.9's is the **live
  > edge**, where only one tape can have a bar for the minute in progress.
  > **The general lesson is the one worth carrying**: a decision that widens
  > what the store may hold has to be checked against what the read path
  > _refuses_, not only against what it prefers.

- **Whether the surrogate index is dropped.** Named above as the funder; Epic 14
  owns it.
- **The gap a disconnection leaves**, which is Story 3.10's and is made
  reachable rather than caused by this decision.

## Reversal trigger, as a condition

**The first month in which the live session's rows outgrow the backfill's**, or
**the storage alert firing before the headroom this record predicts**. Either
means the 69% figure was wrong in the direction that matters, and the cheaper
shapes are then worth re-pricing against a product that has shipped replay and
can say what the IEX bars were actually used for.
