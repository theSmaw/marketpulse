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

## 9. The reads that assumed one row a minute (Task 3.8.5, 2026-09-23)

**Two reads made the same assumption and neither was written down as making
it.** §8 repaired the first by meeting it; this section is what the audit of the
rest found.

`readLastCloses` takes the newest **two rows** per security and calls them
`(last, previous)`. That was one assumption — _two rows means two minutes_ —
and it was true from Task 2.9.6 until ADR 0035. After it, the newest two rows of
a reconciled window are **one instant twice**, and `previousClose` becomes the
other tape's version of the close it is compared against:

```text
BEFORE: close 218.19 at 2026-09-11T19:59Z,  previousClose 218.38
AFTER : close 301    at 2026-09-14T13:32Z,  previousClose 201
```

`201` is the IEX close for **13:32**, the same instant as `301`. The percentage
is **+49.75%**, drawn with an arrow and a colour like any other move.

### It was latent, and the first draft of the task said otherwise

**Worth recording because the correction cost one grep and the claim had
already been written into three documents.** `readLastCloses` has exactly one
shipped caller and it passes **`1d`**. The live writer writes **`1m`**. Only
the backfill writes daily bars and it only ever asks for `sip`. Confirmed
against the store: `1d` is 347,631 rows, all `sip`.

So no deployed surface was printing a fabricated move, and the reproduction
that found the defect called `readLastCloses("1m")` — a timeframe nothing in
the product passes it.

**It was repaired anyway, and the reason is a date rather than a severity.**
The timeframe is a **parameter**; `1m` can hold two tapes today; and Task 3.8.8
is _The surfaces that now show a stored today_, which is a universe table
reading minute closes. The trap is laid directly in that task's path. Closing
it cost 2.1 ms.

### The shape, and the measurement that chose it

`distinct on (observed_at)` inside the lateral, with `SERVED_TAPE_RANK` as the
tie-break — the same rule §8 serves under, so a table and the chart beside it
cannot disagree about one minute.

`limit 2` is load-bearing: it is what makes this a bounded backwards walk of
`(security_id, timeframe, observed_at)` rather than a ranking of every bar, and
2026-09-09 measured the ranking alternative at **182–279 ms warm**. Measured
2026-09-23 against a store with the newest two minutes of all 518 securities
doubled:

| shape                            | `1m`    | `1d`   |
| -------------------------------- | ------- | ------ |
| today's query, no preference     | 5.2 ms  | 3.4 ms |
| **`distinct on` in the lateral** | 7.6 ms  | 5.5 ms |
| a wider limit, reduced in Node   | 16.6 ms | 6.4 ms |

**The plan is an `Incremental Sort`**, which is the answer the question needed:
the index still supplies the order and only the rows sharing an instant are
sorted. Buffers rise from 12,487 to 31,377 at `1m`. The result sits **inside
the 4.8–8.2 ms band this query has occupied since 2026-09-09** and is 33× clear
of the shape that measurement rejected.

### The audit, written down either way

- **`readSeries`** — repaired by §8.
- **`readBars`** — deliberately not repaired; the replay source wants every row.
- **`readLastCloses`** — repaired here.
- **`readLastBarDates`** — `max(observed_at)` grouped by symbol. **Safe**, and
  checked rather than assumed: a maximum over duplicates is the same maximum.
- **`writeBatch`'s presence check** — tape-scoped since 3.8.2.
- **`store-freshness`** — reads `readLastBarDates`. Safe by the same argument.
- **`pnpm bars:check` — NOT safe, and it is the third instance of this family.**
  It reports _series holding MORE bars than their sessions have minutes_ as an
  anomaly, and `bar_count` counts **rows**. A fully reconciled session holds up
  to two rows a minute, so every reconciled security would be reported as
  over-full. That is a false alarm rather than a defect in the store, and it
  makes the tool's most alarming line meaningless on exactly the night it
  matters. **Handed to Task 3.8.9**, which already owns `bars:check` as
  criterion 9 and has to decide whether it still answers honestly.

## 10. Reading a session that is still being written (Task 3.8.6, 2026-09-23)

**The store now gains a bar a minute while a reader is looking at it.** Every
decision about serving a window was taken against a store that stopped at
yesterday's close. Two were re-read here, and **the one the task expected to be
broken was already right.**

### Criterion 7 was met before Story 3.8 existed

The task described the hazard as _an afternoon window requested at 15:00 and
served again at 15:10 looks closed to the rule and is not_. It does not.
`isClosedWindow` asks whether a window ends before the last **bell that has
rung**, not before **now** — so during a session `closedThrough` is
_yesterday's_ close and any window touching today is `no-cache`. Checked at four
clock positions rather than argued:

| clock                      | window                | verdict       |
| -------------------------- | --------------------- | ------------- |
| during the session, 19:00Z | today 13:30Z→19:00Z   | `no-cache`    |
| during the session, 19:00Z | today 13:30Z→15:00Z   | `no-cache`    |
| after the close            | today's whole session | `max-age=300` |
| after the close            | yesterday             | `max-age=300` |

And every **named** window is `no-cache` whatever it resolved to, which is what
the frontend sends. Task 2.9.8 got this right for a reason that outlived its own
premise.

### What was actually wrong: a rolling minute that straddles the boundary

`LIVE_ANSWER_TTL_MS` is the **server-side** lifetime for a window reaching into
the live session, and its argument has two legs. The first — _a second request
inside the same minute cannot be answered with a bar the first one could not
have had_ — is still exactly right. The second — _this TTL is a bound on what we
ask the vendor_ — **stopped being true with Task 3.8.3** (see §5's verdict
below: the vendor request is gone).

And the first leg does not survive contact with its own implementation. A
rolling minute is measured from **the request**, so it straddles the boundary
the argument appeals to:

```text
written 18:00:30   read 18:00:45  HIT
                   read 18:01:05  HIT   <-- the 18:00 bar is in the store
                   read 18:01:29  HIT   <-- and is not being served
                   read 18:01:31  miss
```

**Up to 59 seconds of a chart one bar behind the store**, with nothing on it
saying so. Harmless while the store gained nothing during a session; a defect
the moment Task 3.8.3 made it gain a bar a minute.

**The lifetime now runs to the next minute boundary.** A second request in the
same minute is still a hit — the first leg's whole intent — and the first
request of a new minute is a miss. What remains is a sub-second race: an entry
written after a boundary but before that minute's bar has been stored holds
until the next one. That window is the socket's delivery plus one 2.3 ms write,
and it is stated rather than closed, because closing it means reading the ledger
on every cache hit — the query the cache exists to avoid.

`pnpm break a-live-answer-is-held-across-the-minute-it-changes` proves the red.

### §5's reversal trigger: fired, and half of it was wrong

Measured through `tailWindow` and `alpacaServableEnd`, a reader at 18:00Z asking
for today 13:30Z→18:00Z:

|                   | tail the stitch asks for | after the clamp  | metered request |
| ----------------- | ------------------------ | ---------------- | --------------- |
| before Task 3.8.3 | **270 min**              | 254 servable min | **yes**         |
| after Task 3.8.3  | **1 min**                | 0 servable min   | **NONE**        |

**The stitch's metered request disappears during a session** — not because the
stitch was removed but because the store now covers everything the free plan
would serve.

**But the trigger predicted that rules 2 and 3 would stop being necessary, and
the opposite is true of rule 2.** The 16-minute clamp is _precisely_ what turns
the writer's one-minute tail into no request at all; removing it would restore a
metered request on every cache miss. Rule 3's session bound stands too, because
the live writer fills only **today** and a store stale by a week still needs it.

The trigger's premise was _a stream is not a metered request and is not 16
minutes stale_. True of the **stream** — and the stitch does not read the
stream. It reads the **store the stream writes**, through the same provider
seam. That is the distinction the wording missed, and it is corrected in §5.

### One case left standing, with a trigger rather than a repair

`max-age=300`'s tolerance rested on the **rarity** of a closed window's body
changing. Since Task 3.8.4 the nightly reconciliation changes the **prices** of
an already-closed window — same instants, same count, different numbers — for
every security, every night. Not rare.

It is left because it is **unreachable from this product**: `max-age` applies
only to the **absolute** window form, and the frontend constructs only
`{ form: "named" }`. The absolute variant exists in the type and is built
nowhere. **Reversal trigger: the first client that sends one.**

## 11. Corrections — the revision the live path throws away (Task 3.8.7, 2026-09-23)

**Story 3.5's close handed this story a defect only the store could fix, and
stated the consequence in terms worth keeping:** a revision for a **superseded**
minute is discarded by the live path entirely; §14.1 measured revisions at
**0.064%** of bars with **35.3% of them changing the close**; so without a path
to the store, _"this product's stored history is permanently and knowably wrong
for a small fraction of bars — and nothing will ever report it."_

### The seam: one batch, two lists, two owners

`currentMarketState.observe` applies **two** filters and until this task
returned **one** list that both the gateway and the writer took. The filters
have different owners:

- **The universe gate is everyone's.** A symbol outside the tracked universe
  has no `securities` row, so the store could not write it if it tried.
- **The supersede rule is the live surface's alone.** Dropping a revision for a
  minute already passed is a statement about what is **news about now**. It is
  not a statement about what is **true**, and the store's subject is the second
  one.

So `observe` now returns `ObservedBatch { applied, tracked }`. The gateway takes
`applied`, unchanged in meaning since Task 3.5.2. The writer takes `tracked` —
every observation of a tracked security, including the ones that are not news.

**What that costs is a guarantee narrowed rather than withdrawn.** Task 3.5.2's
rule was that broadcasting the return value makes the store and every browser
agree _by construction_. They still agree about the **latest observation** of
each security — `applied` is still the only thing broadcast — and they now
deliberately differ about **past** minutes, where the store is right. That is
the product's own model rather than a compromise: a live surface reports what is
news, and the record reports what was true.

`index.ts` is the process and no runner instruments a spawned child, so this
wiring sits at 0% coverage by construction. It is held by a grep —
`the-store-takes-what-is-true-not-what-is-news`, which asserts **both** halves,
and `pnpm break the-store-is-told-only-what-is-news` proves the red.

### The defect this found rather than the one it was sent for

**One batch is one socket message.** `observationsIn` flat-maps every
observation frame in a message into a single `onObservations` call, so a bar and
its revision for the same minute can arrive **together**. That pair reached
`toBarSeries` as two bars stamped alike, which throws, and the writer's
per-security catch turned it into a refusal:

```text
warn: live bars refused by the store
      Bars must be strictly ascending by startsAt, but bar 1 starts at …13:30:00.000Z
recordSeries calls: []   inserted: 0
```

**The security lost the bar as well as the revision**, silently, to a `warn`
line. Reproduced against the shipped writer before it was repaired.

`seriesFor` now collapses a batch to one observation per instant, **last
winning** — because within one batch that is what a revision _is_: the frames
arrive in the order the vendor sent them, so a later frame for a minute already
in the batch is the correction to it. It is the same rule the store applies
across batches through `on conflict`, applied before the series is built,
because `toBarSeries` will not hold two bars on one instant long enough for the
store to decide.

**Corrected the same day, and it is the third time this session the stated
reachability was wider than the evidence.** The paragraph above said such a
batch _can_ arrive. That is true of the **types** and is not supported by the
**measurement**: `LIVE-DATA.md` §14.1 put revisions **29.1–30.1 s** after their
bar and §9.5 put the vendor at **8.8 messages/min** at the open — so a revision
is **four to five messages** behind its bar, and the recorded `b` and `u`
fixtures are two separate messages. Nothing observed has ever carried the pair.

So this is a **guard on a shape the types permit** rather than a repair of a
defect anybody has met. It stays, because it costs one `Map` and the failure it
prevents is silent and expensive — the security loses a real bar, not just a
revision. But it is not evidence of a live fault, and the record should not read
as though it were.

### What the store does with a correction, asserted against a real one

| behaviour                                                   | assertion                                      |
| ----------------------------------------------------------- | ---------------------------------------------- |
| a revision for a minute the live path moved past is applied | `corrected: 1`, `inserted: 0`, the close moves |
| a revision that changes nothing moves no row                | `unchanged: 1`, `recorded_at` identical        |
| a correction moves the numbers and never the tape           | the row keeps `iex`                            |

`recorded_at` is the record that a correction **happened** — `0004` argued it
rather than an `updated_at` — and that is only true while a revision changing
nothing leaves it alone. The `is distinct from` clause on the writer's
`on conflict` is what keeps the meaning; the second row above is what holds it.

### The trap Task 3.8.4 left here, asserted rather than met

Since that task a served minute is the **preferred** tape. Revisions arrive on
the **live** tape. So a correction applied to a minute the backfill has already
reconciled is written correctly, changes the stored row correctly, and is
**invisible through `readSeries`** — the reader is being served the other row.

That is the system behaving as designed, and it is a trap for a test: an
assertion reading the revision back through `readSeries` fails on a reconciled
minute and passes on an unreconciled one, which looks like flakiness and is not.
The database suite asserts **both halves** — the consolidated close through
`readSeries`, the corrected live close through `readBars` — and says which and
why. The value of applying it anyway is Epic 13's: replay reads the tape that
was observable, and that is the row being corrected.

### The count is owed and cannot be taken yet

The task asks for corrections to be **counted over a real session** against
§14.1's **0.064%** — a figure this product has never taken from its own store.
It cannot be taken now: 07:31 EDT on 2026-09-23, `before_open`, and the
deployment holds the plan's one connection.

It is **not a figure the store can answer either**, which is worth stating
rather than leaving as an exercise: every row in the store is `sip` from the
backfill, and the backfill does not correct. The count needs the **live** tape
over a session. Written into the shared-sitting list in Task 3.4.10, beside the
rehearsal item it overlaps exactly — _a real correction, both halves_.

## 12. The surfaces that now show a stored today (Task 3.8.8, 2026-09-23)

**Two surfaces were handed here, and the one this task was aimed at turned out
not to move. The one that moved was a third, and its own comment named the
condition.**

### The `Last close` column does not blur, and checking took one query

The task inherited Story 3.6's dating rule and said _storing the live session
blurs the line it draws_. It does not. That column reads **`1d`** —
`CLOSE_TIMEFRAME` in `routes/securities.ts` — and the live writer writes
**`1m`** and nothing else. Confirmed against the store: 676 daily sessions, all
`sip`, newest `2026-09-11`. Daily bars still arrive only from the nightly
backfill, all 518 at once, so `commonSession` still finds one date and the
heading still carries it.

**That is the third task in a row whose stated hazard was not the real one**,
and the third time one query settled it before any code was written.

### What did move: the store's claim about its own depth

`summariseCoverage`'s `through` took the **maximum** end date across the
universe, and the comment above it named exactly what would end that:

> A backfill walks backwards from the most recent session, so **every security
> shares this date**… **If that ever stops being true, this figure becomes the
> optimistic one and the honest thing to do is say so rather than switch it
> silently.**

Storing the live session ended it. The live feed is one venue carrying **65.1%
of a median name's minutes** and 2.1% of the worst, so during a session some
securities hold today and some do not. Simulated on the real ledger at 340 of
518:

|                                              |            |
| -------------------------------------------- | ---------- |
| distinct end days across the universe        | 2          |
| what the line claimed (the maximum)          | 2026-09-14 |
| what is true of all 518 (the minimum)        | 2026-09-11 |
| **securities not reaching the claimed date** | **178**    |

**From the first minute of a session**, one security printing a bar made the
page claim the store reached today while 517 had nothing for it.

### The decision: the reliable date first, the frontier second

`through <min>`, and `, some to <max>` only when they differ.

**Reliability first because that is the line's job.** It is a claim about what
the store can be **trusted** to hold for every security; the other way round it
is a promise 178 rows cannot keep. This is the same asymmetry the table already
applies to the `Last close` heading — _a shared claim is made only when it is
true of everything, and the moment it is not, the page stops making it rather
than making it approximately._ Reused rather than reinvented.

**And it stops hiding a straggler.** A delisted security whose history ends
years ago is invisible behind a maximum and is the first thing a reader meets
under a minimum, which is the honest way round.

**Measured at four viewports, flat against ragged: the extra clause costs no
height** — `1358×22` at 1440 and `308×100` at 390 in both states, because the
line already wraps and the new text fits the last row. Drawn:

```text
518 securities tracked · 11 sectors · 15 ETFs · all with history ·
48.4M minute bars · through 2026-09-11, some to 2026-09-14
```

`pnpm break the-store-claims-one-securitys-frontier-as-its-own` proves the red.

### The arrival mark does not fire on a store re-read, asserted in a browser

Story 3.4's close named this _the one thing that would be invisible until
somebody watched it_. Two halves were already covered — a reconnect's snapshot
fires no mark (`market-reconnect.spec.ts`) and a snapshot at universe scale is
not an arrival (`universe-live-update.spec.ts`). The half that was not is the
task's own sentence: **a page re-read from the store must not pretend prices are
arriving.**

`security-price-motion.spec.ts` now loads `/securities/NVDA` with **no feed
stubbed** — the deployed default and CI's, so every price on the page is a
stored close — reloads it, and asserts `[data-arrival]` has count **0** across
the whole page, both times. Across the whole page rather than the block, because
since Task 3.6.1 the universe table's 518 rows carry the same handle.

### The design reading, and it is a rare positive

The task asked whether the two-feed source note, now that it has had real data
behind it for the first time, matches what the canvas intended.
`VISUAL-LANGUAGE.md`'s provenance section specifies, for more than one source:
_each stretch on its own row, its bar count right-aligned in the data face, its
label beside it and its sentence after that_ — and, from its 2026-09-14
amendment, _the count is drawn only where there is a split to measure_.

Photographed from real stored rows in Tasks 3.8.3 and 3.8.4:

```text
SOURCES   5,505 bars  All US exchanges
             45 bars  IEX
                      Trades reported by the IEX exchange only — not the
                      full US consolidated tape.
```

**It matches, clause for clause**, including the single-source case drawing no
count at all. An arrangement designed against no data, two epics before any
existed, held the first time it had some.
