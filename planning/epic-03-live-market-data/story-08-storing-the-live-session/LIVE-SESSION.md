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
- **Task 3.8.9 rehearses it** — both paths over one session, in the real order —
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

> **And that argument expires with Task 3.8.3**, which is the next task and
> makes the deployed backend a bar writer for the first time. After it, a
> migration that changes the shape of a write meets a writer **running inside
> the deploy window**, in the image about to be replaced, rather than a
> scheduled job that rebuilds itself from `main`. The reasoning in
> `migrations/README.md` §9 and `CLAUDE.md`'s _Data layer_ trap was written
> while that was not so; 3.8.3 is told to correct both, and 3.8.10's sweep
> checks it.
>
> **Fired 2026-09-23.** Task 3.8.3 shipped `live-bar-writer.ts` and wired it
> into `index.ts`, so the paragraph above this one — _the deployed backend
> never writes bars_ — is now false, and the exposure it called narrow is a
> whole trading session rather than two cron windows. Both documents were
> corrected in that task. §7 is the writer's own record.

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

## 7. The writer, what it claims, and what it costs (Task 3.8.3, 2026-09-23)

**`live-bar-writer.ts` is the mechanism the sections above were written for.**
It hangs off `index.ts`'s single stream subscriber, beside the gateway, and
takes the list the current-market state **applied** rather than the list that
arrived — so the store and every open browser agree by construction rather than
by two code paths happening to make the same decision. The gateway publishes
first; the write runs after, so a slow database cannot hold up a price.

Two rules it may never break, both of them properties of where it is called
from rather than of what it does. **It never throws into the stream**, because
`onObservations` runs inside the socket's own callback and an unhandled
rejection there is a crashed process on a liveness-probed platform; every
failure is caught per security, counted, and logged. **It never blocks the
broadcast.**

### What it claims as covered, and why that is the whole of §3's second half

**The covered window ends at the last bar seen, not at the session close.**
`seriesFor()` claims `[first.startsAt, last.startsAt + 1 minute)`. §3 is the
argument; this is the decision it asked for. Claiming the session would have
stopped `planRequests` ever fetching the consolidated version of those minutes,
and the store would have kept a thin one-venue session permanently with nothing
on any screen to see it. The cost taken instead is the one §3 named: a
per-symbol `covered_end` that lags the session close, so `commonCoverage`'s
intersection across 518 symbols is the earliest of 518 lagging ends. Task 3.8.9
rehearses both paths over one session and asserts that the backfill asked.

Confirmed against the real store on 2026-09-23: thirty `iex` bars written for
NVDA starting `2026-09-14T13:30:00Z` moved `bar_coverage.covered_end` to
`2026-09-14T14:00:00Z` — the last bar's instant plus one minute, exactly — and
no further. Criterion 1, with the ledger agreeing.

### The partial-minute rule is smaller than the story expected

`isComplete(bar, now)` is one comparison and it is **not** a clock deciding
when a minute is finished. The vendor already sends a bar for minute _M_ at the
end of _M_ (`LIVE-DATA.md` §7.7: the first pre-market bar carries `t=08:43` and
arrived at `08:43:59`), and a bar that is later revised is handled by the
correction path rather than by a completeness test (§7.8's `updatedBars`, about
thirty seconds later, which the upsert applies). So the guard exists for the one
shape that would be a **false record rather than an early one** — a bar stamped
in the future, which no correction can ever repair because nothing will arrive
to repair it. It has never been observed.

### The transaction, measured

**One transaction per security, never one per batch.** Task 3.7.6 measured that
a migration on `market_bars` queues behind any open transaction on the table and
takes every ordinary reader down with it, and this task turns two cron windows a
day into a six-and-a-half-hour session. A transaction holding one security's
minute is the shortest shape `recordSeries` offers; a batch-wide one would hold
the table for the length of 518 writes.

Measured 2026-09-23 through the **shipped** writer against the populated store
(48.8 million rows, a developer's laptop), ten securities a batch, twelve
batches, the first two discarded as warm-up:

| what                           | median | p95    | max    |
| ------------------------------ | ------ | ------ | ------ |
| one security (one transaction) | 2.3 ms | 3.2 ms | 3.2 ms |
| the whole batch of ten         | 23 ms  | 32 ms  | —      |

**Read the first row, not the second.** The lock a migration queues behind is
held for the length of one transaction, and that is 2.3 ms. The batch figure is
throughput and says only that 518 securities' minute is comfortably inside the
minute it describes.

**A first attempt at this figure was invalid and is recorded because the
failure is silent.** The instrument stamped its bars in 2099, which is outside
`market-calendar.ts`'s checked table (2024–2028), so every write was refused and
the run reported a confident `1.2 ms / 12 ms` — **the cost of the refusal path,
not the write path**. The tell was one line of the same output: `cleaned up 0
rows`. A measurement of a write that wrote nothing looks exactly like a fast
write.

### The deployed backend is now a bar writer, and two documents said otherwise

Task 3.8.2 justified a deploy window and then measured why it barely mattered:
the only caller of `recordSeries` was `backfill.ts`, which runs from a GitHub
runner with its own checkout. **That stopped being true here.** A migration that
changes how a write is shaped now meets a writer running **inside the deploy
window**, in the image about to be replaced, rather than a scheduled job that
rebuilds itself from `main`. `migrations/README.md` §9 and `CLAUDE.md`'s _Data
layer_ trap were both written under the old premise and were corrected in this
task.

### What was looked at, in a browser, and what it proved

Both of these were **seen**, not derived, on 2026-09-23 at 1456×835.

**The two-feed sentence is real.** The task predicted it from reading
`namesFeeds` and `describeSeriesFeeds` and asked for it to be checked. With
thirty `iex` bars stored beside NVDA's backfilled `sip` window, `/securities/NVDA?sessions=21`
renders, with **no new code**, three things at once: the Price region's feed
line reads `● All US exchanges  ● IEX  Trades reported by the IEX exchange only
— not the full US consolidated tape.`; the source note at the foot of the region
group reads `5,460 bars All US exchanges` / `30 bars IEX` with the same
qualifier; and the chart's spoken sentence ends `Stitched: 5,460 from All US
exchanges and 30 from IEX.` That is `PRODUCT_SPEC.md` §7.1's requirement and the
sentence `CLAUDE.md`'s invariant 6 exists for, on screen from stored data for
the first time in this product's life.

**Two honest qualifications on that photograph.** The IEX prices in it were
written by an instrument rather than by the socket, because the market was
closed at 23:18 EDT when it was taken — the **path** is the shipped writer and
the **stretching, ordering and counting** are the real read path, but the prices
themselves are invented, which is why the chart shows a cliff at the join.
And the rows were removed afterwards, so reproducing the photograph is one
script rather than a state the store is in.

**Criterion 2, confirmed in a browser.** The socket-to-store-to-reload path was
run end to end against `marketpulse_bare` — CI's store, 518 securities and zero
bars — with the fixture feed, which is the shape Task 3.8.3 sanctioned when a
session is not available. Six minutes arrived on the socket and the writer
stored 518 rows a minute with their tape. A **cold load** of
`/securities/NVDA?sessions=5` then drew all six, `LATEST PRICE 102.39` at
`Sep 16 · 09:35 EDT`, reaching exactly the edge the writer had reached; the
`/market-data/bars` response carried six bars and
`covered { start 13:30, end 13:36 }`. Five of those six minutes had arrived
before that page existed, so they can only have come from the store. The status
bar read `SIMULATED · Generated test data. Not a market feed. · LIVE`
throughout, which is `PROVIDER.md` §5.4's structural labelling doing its job
without anybody remembering to add a banner.

**One more thing the bare store showed that the populated one could not.** The
live writer **created** NVDA's ledger row rather than extending one, and it
created it with `provider fixture` / `feed synthetic` taken from the
observation's own provenance rather than from a constant — which is `TAPE.md`
§6's rule holding on the path that has no prior row to copy from.

## 8. Serving a minute that has two rows (Task 3.8.4, 2026-09-23)

**The decision §4's key made possible had a hard failure on the other side of
it, and this is the repair.** A minute may hold a row per tape. `readSeries`
selected them in `observed_at` order, `toStoredSeries` mapped them to bars, and
`toBarSeries` refused bars that are not **strictly** ascending by instant — it
throws a `RangeError`, which the route answers as a **500 on a page load, for
every reader, for that window**. Not a degradation: a thrown error where a
chart should be.

### The rule

**The consolidated tape wins, and the live one fills what it has not reached.**
`SERVED_TAPE_RANK` in `market-bars.ts` is the whole of it.

A served chart is _the best account we have of what happened_. SIP is the full
US tape; IEX is a single venue printing **65.1% of a median name's minutes**
(`LIVE-DATA.md` §7.6). During a session the consolidated bar does not exist yet
for recent minutes, so the rule reads **prefer SIP, fall back to IEX**, and a
chart drawn at 15:00 legitimately changes shape once the backfill has run. That
is honest rather than awkward, and the source note is what says so.

**Only the first comparison is a claim.** `sip` above `iex` is argued. The other
two members of `MarketFeed` are ordered so the choice is **deterministic**
rather than because anything is known about their worth: neither `synthetic` nor
`replay` should ever reach this table on a deployed store, and leaving them
unordered would make `distinct on` pick arbitrarily. The record is
`satisfies Record<MarketFeed, number>`, so a feed added to the vocabulary fails
this build rather than silently sorting last.

### What was rejected, and why keeping both rows is what makes it safe

**_What was observable at the time_** is the other defensible rule, and it is
`PRODUCT_SPEC.md` §22's — a reader at 11:07 could only have seen the IEX bar,
because the consolidated version did not exist yet. It is the **wrong** rule for
an ordinary chart of last Tuesday, which should show the best history available.

Both questions now get a true answer, and **only because ADR 0035 kept both
rows**. This preference governs `readSeries` and nothing else. `readBars` still
answers every row, so Epic 13's replay source can apply its own rule — and that
is stated at both declarations rather than left to be inferred. A preference
applied there would hand replay a bar nobody could have seen and call it
history, which is invariant 4's failure mode wearing a different hat.

**Prefer by coverage per window** — whichever tape covers more of the requested
range — was rejected for being stable within one answer and unstable across
two: a window nudged by one minute could flip tapes and redraw the whole chart.

### Where it is applied, and the measurement that decided it

**In the query.** `distinct on (observed_at)` with the rank leading the
tie-break, which keeps `toStoredSeries` a pure function of the rows it is
handed rather than giving it a second job.

Measured against the populated store with a **real** two-tape window at the
9,750-bar cap — 9,750 `iex` rows inserted beside the `sip` ones for NVDA, then
removed:

| where the preference is applied   | median      | rows on the wire |
| --------------------------------- | ----------- | ---------------- |
| nowhere — both rows, then a throw | 55.7 ms     | 19,500           |
| in JavaScript, after the fetch    | 43.6 ms     | 19,500           |
| **in the query**                  | **22.6 ms** | **9,750**        |

The wire is the whole difference: reducing in Node means 19,500 rows cross from
Postgres for a window that serves 9,750. The database's own sort costs 6.4 ms of
the 22.6 (quicksort, 2,292 kB).

### The order it is applied in is criterion 2

`provenance.sources` must describe **what was served**, not what is stored. The
stretches are walked over the rows the answer contains (`TAPE.md` §8), so this
is correct **only because the preference is applied before them** — in the query,
which is upstream of everything. Asserted rather than assumed: a window with SIP
over minutes 0–4 and IEX over 3–7 serves eight bars and names
`sip ×5, iex ×3` — not `sip ×5, iex ×5`, which is what the store holds.

### What a green `pnpm test:database` certifies here

Five tests, and the first is the one that fails without this task **by
throwing** rather than by asserting. `pnpm break the-served-minute-keeps-both-its-rows`
removes the `distinct on` and proves the red.

What it does not certify: that any **deployed** store has ever held two tapes
for one minute. It has not yet — the first night after a session the live writer
filled is when that arrives, which is Task 3.8.9's rehearsal.
