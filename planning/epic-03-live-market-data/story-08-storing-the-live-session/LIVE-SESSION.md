# Storing the live session — what a stored bar is a record of

**Opened 2026-09-23 by Task 3.8.1. Every task in Story 3.8 writes into this
file; it is the subject document `CLAUDE.md`'s _Where the record lives_ will
point at for this question when the story closes.**

## 0. If you read one section

**Both tapes are kept.** A minute of a security may hold one row per tape:
the IEX bar the live stream observed, and the consolidated bar the nightly
backfill fetched. They are two observations of one minute by two instruments,
not a bar and its correction — a correction is a revision **on the same tape**,
and a tape never moves once written. The decision, its two rejected
alternatives and their prices are
[ADR 0035](../../../docs/adr/0035-both-tapes-are-kept-and-what-a-record-is.md).

**It costs about 69% more rows and roughly 41% of the storage runway**, and the
funder is already in the table: `market_bars_pkey` is 1,045 MB with zero scans.

**And the thing that nearly happened silently**: today's backfill skips a
session it believes is covered, so a live writer that claims today would stop
the consolidated version ever being fetched — no collision, no error, and a
permanently thin session. §3.

## 1. The figures, taken 2026-09-23 (Task 3.8.1)

**One real stored session**, 2026-09-11, the nightly backfill's own product,
on the local store (48,797,343 rows, PostgreSQL 18.6):

| Reading                     |       Value |
| --------------------------- | ----------: |
| Rows in the regular session | **190,483** |
| Securities                  |         518 |
| Mean bars a security        |   **367.7** |

**One live IEX session**, measured first-hand by Task 3.1.9's spike over a
session in which **390 of 390 regular-session bar minutes were observed**
(`LIVE-DATA.md` §7.6):

| Measure                                             |  min |      p50 |  p95 |   max |
| --------------------------------------------------- | ---: | -------: | ---: | ----: |
| Symbols producing a bar in one minute (n=390)       |  242 |  **321** |  437 |   513 |
| …as a percentage of 518                             | 46.7 | **62.0** | 84.4 |  99.0 |
| Per-symbol minute coverage over the session (n=518) |  2.1 | **65.1** | 99.0 | 105.6 |

**~130,000 live rows a session** at the median, against the 190,483 the
backfill writes. Every symbol produced at least one bar; coverage above 100% is
the extended-hours tail, kept on purpose.

**The duplicate set is near-total.** IEX is a constituent of the consolidated
tape, so a minute that printed on IEX all but certainly printed on the tape.
Keeping both is therefore not a marginal cost — it is close to the whole live
session again.

### What it costs, against `BARS.md` §8.3–§8.4

| Reading                             | Today    | With both tapes | Change       |
| ----------------------------------- | -------- | --------------- | ------------ |
| Minute rows a year, 518 securities  | 47.7M    | **80.5M**       | **+69%**     |
| Bytes a row (§8.3, amended)         | 199 B    | 199 B           | —            |
| Storage a year                      | 8.66 GiB | **14.7 GiB**    | **+6.1 GiB** |
| Years to read-only, 22.5 GiB usable | ~2.6     | **~1.5**        | **−41%**     |

**The offset, named so the cost is not read in isolation.** `market_bars` is
9,097 MB — 5,081 MB heap, 4,016 MB indexes — and `market_bars_pkey` is
**1,045 MB with zero scans**. Dropping it recovers that and ~21 B a row
thereafter, which takes ~1.5 years to **~1.7**. **Epic 14's to do, not this
story's**, and its `EPIC.md` already carries the figure.

### A figure that was wrong, and would have understated this by a fifth

Story 3.8's task file said IEX's median minute coverage is **82.8%**. That is
the **stored SIP** figure (`ALPACA.md` §5.2). `LIVE-DATA.md`'s own register
**struck** it for the live feed on 2026-09-16 in favour of the first-hand
**65.1%** — _"the live stream is materially thinner"_. The task file is
corrected. This is `CLAUDE.md`'s _measure rather than cite_ catching a citation
one task after it was written.

## 2. The decisions, both settled 2026-09-23

**Open decision 1 — what happens tonight: both bars are kept, keyed by tape.**
The product's stated position on persistence is _a record of what was observed,
not a cache_, and `PRODUCT_SPEC.md` §23's _what was knowable at this moment?_ is
what that position protects. An overwritten IEX bar leaves no trace the
observation was made, so the question stops being answerable rather than
becoming expensive. ADR 0035 carries the alternatives and their prices.

**Open decision 2 — a live-written session is served to every reader, with its
label.** A single venue's session is honest but thin, and §7.1's rule is that a
reader must not be misled about coverage — which the source note already
enforces **per stretch**: it names the venue and gives `iex` the sentence saying
it is one exchange rather than the whole tape. Withholding the session would
leave a reader at yesterday's edge during a live session, which is the shortfall
this story exists to remove. "Only the writer" was also not a serving rule —
`GET /market-data/bars` has no notion of a caller — so it would have had to
become a storage rule, which is decision 1 wearing a different hat.

**Both settled by the developer on the owner's instruction to recommend**, with
the figures above in the room. ADR 0035's reversal trigger is the condition
that reopens the first.

## 3. The half of the decision that belongs to the writer — and it was nearly missed

**Today's backfill would never see the collision.** `planRequests` skips a
session wholly inside the covered window:

```ts
if (session.open >= common.start && session.close <= common.end) continue;
```

and `commonCoverage` takes the **intersection** of `covered` across symbols.
The live writer extends coverage through `recordSeries` as bars arrive. So a
writer that claims today's session as covered stops the consolidated version
from ever being fetched: **the store keeps the thin IEX session, permanently,
with no collision, no error and nothing on any screen to see it.**

That is worse than any of the three shapes the story named, and it is the
**default** — it happens if nobody decides. So keeping both tapes has a second
half:

- **Task 3.8.3 decides what the live writer claims as `coverage.covered`**, and
  the choice is not free either way. Claiming the session makes the backfill
  skip it; claiming only up to the last bar seen leaves the ledger honest and
  the backfill asking, but a per-symbol `covered_end` that lags means
  `commonCoverage`'s intersection is the **earliest** of 518 lagging ends.
- **Task 3.8.8 rehearses it** — both paths over one session, in the real order —
  and the thing to assert is not only that the reconciliation behaves, but that
  **the backfill asked at all**.

## 4. The key — what a row is unique by, and what the store can hold now (Task 3.8.2, 2026-09-23)

**`market_bars_unique_bar` is `(security_id, timeframe, observed_at, feed)`**
since `0011_market_bars_unique_bar_by_tape.sql`. A minute of a security may
hold one row per tape. `0004_market_bars.sql` argued the three-column key
deliberately, on a premise true when it was written — _a backfilled historical
bar is final_ — and ADR 0035 is its amendment.

**The measurements that decided how it ships**, on the populated local store
(48,797,343 rows; the deployed table is **49,796,479**):

| Step                                          |               Cost | Lock held while it runs                  |
| --------------------------------------------- | -----------------: | ---------------------------------------- |
| Build the index **non**-concurrently          |             37.3 s | `SHARE` — reads yes, writes no           |
| Build it **concurrently**                     |             42.3 s | `SHARE UPDATE EXCLUSIVE` — both continue |
| **Adopt** a built index as the constraint     |             0.11 s | catalogue only                           |
| `pnpm index:prepare` then `pnpm migrate`      | 42.9 s + **0.6 s** | —                                        |
| `pnpm migrate` alone, the step skipped        |             30.7 s | —                                        |
| `pnpm migrate` on `marketpulse_bare` (0 rows) |             0.47 s | —                                        |
| `pnpm index:prepare` with nothing to do       |              0.4 s | —                                        |

**So the build is a deploy step and the migration only adopts it.** Against
`deploy.yml`'s `timeout 120` the migration has a **200× margin**; a build
inside it would not fit on the deployed tier, where one pass over the heap is
~508 s at 10 MiB/s (ADR 0034). `migrations/README.md` §9 is the convention this
established.

**The index got smaller, which pays part of ADR 0035's bill.** The old
three-column index was **2,969 MB**; the fresh four-column one is **2,311 MB**,
because the old one carried years of backfill-upsert bloat. `market_bars` went
from **9,097 MB to 8,439 MB** — a **658 MB reclaim** on a migration that added
a column to a key.

**The old writer does not survive the deploy window, and that was demonstrated
rather than assumed.** `ON CONFLICT (security_id, timeframe, observed_at)`
needs a unique index on exactly those columns; after `0011` there is none. Run
verbatim against a migrated store:

```text
ERROR:  there is no unique or exclusion constraint matching the ON CONFLICT specification
```

**Why that is narrow here**: the only caller of `recordSeries` in the tree is
`backfill.ts`, which runs from a GitHub runner with its own checkout and build.
The deployed backend never writes bars. So the exposure is a backfill run
**already in flight** when the deploy lands — a ten-minute job twice a day —
and it fails loudly, writes nothing, and is correct on its next run.

**One defect the new key exposed, found by a test rather than by review.**
`writeBatch`'s pre-read that decides `inserted` against `corrected` was not
scoped to the tape, so a genuine insert on a second tape matched the first
tape's row, was counted as a **correction**, and never reached
`extendCoverage`'s `bar_count`. The ledger would have under-reported — one of
the two silent failures `market-bars.ts` exists to prevent — with nothing on
any screen to see it. `pnpm break the-presence-check-forgets-the-tape` is what
holds it now, and `migrations/README.md` §9 carries the general form: **when a
key gains a column, grep for every query that assumed the old one.**

## 5. The read path REFUSES two rows for one minute, and that made a ninth task

**Found 2026-09-23, the same day the decision was taken, by checking what the
read path does rather than what it prefers.** Keeping both tapes makes a minute
able to hold two rows. `readSeries` selects them in `observed_at` order and
`toStoredSeries` maps them to bars, and `toBarSeries` does this:

```ts
if (current.startsAt.getTime() <= previous.startsAt.getTime())
  throw new RangeError("Bars must be strictly ascending by startsAt, …");
```

So the first chart request over a session that has been live-written **and then
backfilled** is a **500 on a page load** — for every reader, for that window.
Not the less good bar drawn: no chart at all.

**ADR 0035 had handed this to Story 3.9** as _which row does a chart draw_, on
the reading that it was a preference. It is a precondition. Both the ADR and
Story 3.9's file carry a dated correction, and **Task 3.8.4 was inserted** to
take the decision, make `readSeries` return one bar a minute, and leave a test
that fails without it. What stays Story 3.9's is the **live edge**: for the
minute in progress only one tape can have a bar, so the preference has nothing
to choose between.

**The general lesson, which is the part worth carrying past this story:** a
decision that widens what the store may **hold** has to be checked against what
the read path **refuses**, not only against what it would prefer. The refusal
was three lines away in a file nobody had reason to open.

**The hazard window, stated so it is not met.** Between Task 3.8.3 shipping and
Task 3.8.4 shipping, a local store with a live-written session that is then
backfilled will 500 on that window. Do not run `pnpm backfill` over a
live-written session in that window, or rebuild the store.

## 6. What a green `pnpm test:database` will certify about this, and what it will not

Nothing yet: this task wrote a decision, not a mechanism. The sections above are
what the later tasks are held to, and each will add its own row here.

**What no test can certify, today or later:** that keeping both tapes was worth
41% of the storage runway. That is a product judgement with a named reversal
trigger (ADR 0035), and the evidence that would settle it does not exist until
Epic 13 has shipped replay and can say what the IEX bars were used for.
