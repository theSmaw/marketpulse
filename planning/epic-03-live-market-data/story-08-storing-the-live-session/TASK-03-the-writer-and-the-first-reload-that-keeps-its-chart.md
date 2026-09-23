# Task 3.8.3 — The writer, and the first reload that keeps its chart

**Status:** **Complete — 2026-09-23.** `live-bar-writer.ts` hangs off the live stream in `index.ts`, so a minute bar arriving on the socket becomes a row in `market_bars` with its tape and the ledger moves with it in the same transaction — measured end to end on CI's bare store, 518 securities written from one socket. The overlap refusal is lifted. The writer claims **only up to the last bar seen**, never the session, which is what keeps tonight's backfill asking. The write transaction is **2.3 ms median per security** and that is the figure a migration queues behind. Both payoffs were **looked at in a browser**: the two-feed source note is real and was photographed, and a cold load serves socket-written bars from the store.
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
  write it into `LIVE-SESSION.md` §3**; Task 3.8.8 rehearses it and asserts
  that the backfill asked at all.
- **The transaction's duration is a deploy decision.** Task 3.7.6 measured that
  a migration queues behind any open transaction on this table and takes every
  reader with it. Today the only writer is a nightly backfill in two cron
  windows; you make it six and a half hours a day. **Measure the transaction
  you ship** and record it in `LIVE-SESSION.md`; prefer short transactions to
  few ones where the choice is free.

## What you inherit from 3.8.2, and the one thing you take away from it

**The key already permits what you are about to write.**
`market_bars_unique_bar` covers the tape since `0011`, and `writeBatch`'s
`on conflict` names all four columns — so a socket series with `alpaca`/`iex`
provenance stores beside the backfill's SIP rows rather than fighting them.
Nothing in the writer needs the key changed; what is left is the **overlap
refusal**, which is 3.8.1's decision and yours to lift.

**And one measurement of 3.8.2's stops being true the moment this ships.**
That task justified a deploy window by proving the old writer's `on conflict`
could not survive it — and then measured why that barely mattered: _the only
caller of `recordSeries` in the tree is `backfill.ts`, which runs from a GitHub
runner with its own checkout and build. The deployed backend never writes
bars._

**This task makes the deployed backend a bar writer.** After it, a migration
that changes how a write is shaped meets a writer that is **running inside the
deploy window**, in the image that is about to be replaced, rather than a
scheduled job that rebuilds itself from `main`. That is a genuinely different
risk and it is the kind that is discovered rather than remembered. So:

- **Say so in `LIVE-SESSION.md`** when you land, and
- **check `migrations/README.md` §9 and `CLAUDE.md`'s _Data layer_ trap** —
  both were written while the backfill was the only writer, and the next
  migration on this table should meet the corrected version.

## One hazard this task opens, closed by the next one

**Nothing breaks on the day this ships**, because the writer fills today's
session and the backfill has not. **The failure arrives the first night.** Once
the consolidated version of the same minutes is stored beside the IEX one, a
window holds two rows for one minute, and `toBarSeries` refuses bars that are
not strictly ascending by instant — it **throws**, so the chart request is a
**500**. Task 3.8.4 is the repair and exists only because of this.

**So between this task and that one: do not run `pnpm backfill` over a
live-written session**, and rebuild the store if you do. Naming it here is
cheaper than meeting it.

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

## What was done — 2026-09-23

### The writer

`apps/backend/src/live-bar-writer.ts`, wired into `index.ts` beside the
gateway:

```ts
const applied = currentMarketState.observe(observations);
gateway.publishObservations(applied);
void liveBarWriter.store(applied).then(…, (error: unknown) => {
  app.log.warn({ err: error }, "live bar write failed");
});
```

Three properties of that shape, each of them a constraint rather than a style.

**It takes the list the current-market state APPLIED, not the list that
arrived.** Task 3.5.1's rule is that the gateway broadcasts what was applied, so
a browser can never receive a revision this process rejected; hanging the writer
off the same list makes the store and every open browser agree by construction.
It also means a revision for a **superseded** minute — which the live path drops
and only the store can apply — does not reach here. That is Task 3.8.6's, and
widening the input here would have taken 3.8.6's decision in passing.

**It never throws into the stream.** `onObservations` runs inside the socket's
own callback, where an unhandled rejection is a crashed process on a
liveness-probed platform. Every refusal is caught **per security**, so one
security the store will not take does not cost the other 517 their minute.

**It never blocks the broadcast.** The gateway publishes first; the write is
`void`-ed after it.

### What it claims as covered — the decision 3.8.1 handed here

**Only up to the last bar seen.** `seriesFor()` claims
`[first.startsAt, last.startsAt + 1 minute)`, never the session close.

This is the whole of the hazard 3.8.1 found while pricing the shapes.
`planRequests` skips a session **wholly inside** the covered window, and
`commonCoverage` takes the intersection across symbols — so a writer that
claimed today's session would have stopped the consolidated version ever being
fetched, and the store would have kept a thin one-venue session **permanently,
with no collision, no error and nothing on any screen**. The cost taken instead
is the one 3.8.1 named: a `covered_end` that lags, so the intersection across
518 symbols is the earliest of 518 lagging ends. Task 3.8.8 asserts the backfill
still asks.

Confirmed twice against real ledgers rather than in a test. Thirty `iex` bars
for NVDA from `2026-09-14T13:30:00Z` moved `covered_end` to `14:00:00Z` — the
last instant plus one minute, exactly. And on CI's bare store the live writer
**created** NVDA's ledger row at `covered_start 13:30`, `covered_end 13:32`,
`bar_count 2` after two socket minutes, with `provider fixture` / `feed
synthetic` taken from the observation rather than from a constant.

### The overlap refusal, lifted

`ForeignSourceReason` had three members; it has two. The `overlap` case is gone
from the union, from `recordSeries`'s branch and from its describer, which is
what 3.8.1 decided and what `0011`'s key had already made safe. The two
remaining refusals stand unchanged: a second **provider** is still refused,
because the ledger is the only record of who was asked; and a **stitched**
series is still refused. Story 3.7's database test that asserted the old
refusal was rewritten to assert the new behaviour — _accepts a second tape
overlapping stored bars, since 0011 makes it a second row_ — rather than
deleted, so the change of mind is legible in the suite.

### The partial-minute rule turned out to be one comparison

The story expected a clock. It is not one. The vendor already sends a bar for
minute _M_ at the end of _M_ (`LIVE-DATA.md` §7.7: the first pre-market bar
carries `t=08:43` and arrived at `08:43:59`), and a later revision is the
**correction** path rather than a completeness test (§7.8's `updatedBars`, about
thirty seconds on). So `isComplete` guards exactly one shape — a bar stamped in
the **future**, which no correction can ever repair because nothing will arrive
to repair it, making it a false record rather than an early one. It has never
been observed.

### The measurement, and the one that was wrong

**2.3 ms median for one security's transaction**, p95 3.2 ms, against the
populated store (48.8 M rows) through the shipped writer. That is the figure
that matters: Task 3.7.6 measured that a migration on `market_bars` queues
behind any **open transaction** and takes every ordinary reader with it, and
this task turns two cron windows a day into a whole session. One transaction per
security is the shortest shape `recordSeries` offers. The batch-of-ten figure,
23 ms median, is throughput and says only that 518 securities fit comfortably
inside the minute they describe.

**The first run of that instrument was invalid and the failure was silent.** It
stamped bars in 2099, outside `market-calendar.ts`'s checked table (2024–2028),
so every write was **refused** and it reported a confident `1.2 ms / 12 ms` —
the refusal path, not the write path. The only tell was one line of its own
output, `cleaned up 0 rows`. Recorded here because a measurement of a write that
wrote nothing is indistinguishable from a very fast write.

### What was looked at in a browser

**The two-feed sentence is real, and needed no new code.** The task asked for
the claim to be checked before being relied on. With thirty `iex` bars stored
beside NVDA's backfilled `sip` window, `/securities/NVDA?sessions=21` renders
three things at once:

- the Price region's feed line: `● All US exchanges  ● IEX  Trades reported by
the IEX exchange only — not the full US consolidated tape.`
- the source note at the foot of the region group: `5,460 bars All US
exchanges` / `30 bars IEX`, with the same qualifier under the second
- the chart's spoken sentence, ending `Stitched: 5,460 from All US exchanges
and 30 from IEX.`

That is `PRODUCT_SPEC.md` §7.1's requirement and the sentence invariant 6 exists
for, on screen from stored data for the first time in this product's life.
**Two honest qualifications**: the market was closed at 23:18 EDT when it was
taken, so the IEX prices were written by an instrument rather than by the socket
— the write **path** is the shipped writer and the stretching, ordering and
counting are the real read path, but the prices are invented, which is why the
chart shows a cliff at the join — and the rows were removed afterwards.

**The socket-to-store-to-reload path was run end to end** against CI's bare
store (518 securities, zero bars) with the fixture feed, which is the shape the
task sanctioned when a session is not available. Bars arrived on the socket,
`live-bar-writer` stored 518 a minute with their tape, and a cold reload served
them back from the store.

### Checks

- `live-bar-writer.test.ts` — 7 tests: the tape carried from the observation,
  the covered window ending at the last bar, the future-stamped bar held back,
  a refusal costing only its own security, and the writer never throwing.
- `market-bars.database.test.ts` — a new describe, _the live writer, against a
  real store_, covering the three idempotence cases and `observed_at` preserved
  exactly.
- `pnpm break the-live-writer-claims-the-whole-session` — the break for the rule
  that would otherwise be silently wrong, since a writer that claimed the
  session produces no error and nothing on screen.

### Two things found while cleaning up, both recorded rather than tidied away

**The clean-up query over-matched, and it is written down because the shape is
the one this repository keeps meeting.** Removing the instrument's thirty `iex`
rows meant pulling NVDA's ledger back, and the statement that did it —
`where c.covered_end > (last bar + 1 minute)` — was true of **519** rows rather
than one. The 518 extra were every `1d` ledger row. Nothing was lost: the
update set each row's `covered_end` to its own last stored bar plus a minute and
its `bar_count` to its own count, and both timeframes now agree with the bars
they describe on all 518 securities, checked afterwards with zero disagreeing.
This is a developer's store, rebuildable, and no deployed data was touched. The
lesson is the ordinary one: **a clean-up predicate written from the intent
matches whatever else happens to satisfy it**, and the count it reports is the
only warning.

**And it exposed something worth a look: the `1d` ledger's `covered_end` was
holding a WALL CLOCK.** Before the pull-back, every daily row read
`2026-09-14T00:04:38.533Z` — milliseconds and all, the moment the backfill ran,
not an instant in the market. The minute rows were honest
(`2026-09-11T20:00:00Z`, the last bar plus a minute). `covered_end` is a
market-time column on the same row as `recorded_at`, and a value carrying the
write time in it is exactly the confusion `DATA-LAYER.md` separates the two
columns to prevent — on the column `commonCoverage` and `planRequests` read to
decide what to fetch. Nothing on any screen shows it. **Handed to Task 3.8.8**,
which owns reconciliation and already has to read both ends of this column;
written into `STORY.md` rather than only here, because a constraint measured for
a sibling task dies in the document that measured it.

## For a stakeholder — a status report, 2026-09-23

### What changed today, in one sentence

**MarketPulse now keeps what it watches.** Until this morning the product could
show you the market moving live, and it could show you months of history, but
the live part was written on water: it existed only in the browser you were
looking at, and closing the tab or pressing reload threw it away. From today the
minutes arriving on the feed are written to the database as they happen, so
today's session is history the moment after it is present.

### Why that was worth a whole task

Two problems disappear together.

**The reload no longer costs you the day.** Our market-data plan will not sell
us the last fifteen minutes of history — it is the free tier's one real
restriction — so before today, reloading a security during a session dropped the
chart back to a cliff fifteen minutes behind the present and then rebuilt itself
minute by minute as new prices arrived. If you reloaded at two in the afternoon
you waited until the close to get your afternoon back. Now the page reads
today's session out of our own store and paints it immediately. The same chart
after hours shows the whole completed day, hours before the overnight job that
used to be the only way to get it.

**And the product can finally say something true that it has never been able to
say.** MarketPulse's rule is that it tells you where every number came from,
never implying coverage it does not have. Our historical data is the full US
consolidated tape — every exchange. Our live feed is a single exchange, IEX,
which sees roughly two-thirds of the trading in a typical name. Those are
genuinely different things and a serious tool must not blur them. Until today
that distinction was only ever a design intention, because a chart could only
ever contain one of the two. Now a single chart holds both, and the product
labels them — separately, in the order they contributed, with the number of
minutes each supplied, and with a plain sentence under the live one saying it is
one venue and not the whole market.

We checked that claim rather than trusting it, by opening the page and looking.
It works, and it needed no new code at all: the labelling machinery built in the
previous story simply had nothing to label until today.

### The decisions worth knowing about

**We chose the option that costs us storage rather than the one that costs us
truth.** When our live feed and our historical feed both cover the same minute,
we keep both records rather than overwriting one with the other. That decision
was taken two tasks ago and priced: it adds roughly 69% to the rows we store a
year and shortens our storage runway from about two and a half years to about a
year and a half. The alternative was to let the fuller record quietly replace
the thinner one, which would have made the database smaller and the product
dishonest, because nothing on screen would have recorded that a substitution
happened.

**We made the live writer under-claim on purpose.** The database keeps a ledger
of what history we hold, and the overnight job reads that ledger to decide what
to go and fetch. If the live writer had marked today's session as "covered" —
the obvious thing to do — the overnight job would have concluded there was
nothing to fetch, and we would have kept the thinner single-exchange version of
every trading day **forever**, with no error, no collision, and nothing on any
screen to reveal it. That is the worst outcome available and it was the one that
happens if nobody thinks about it. The writer now claims only the minutes it has
actually stored, which keeps the overnight job asking.

**We measured what the writer costs the database before shipping it.** A
previous task found that database maintenance work queues behind any write in
progress, and can take every reader of the table with it while it waits. That
mattered little when the only writer was a job running twice a night; it matters
a great deal now that we write every minute the market is open. So the writer
holds the database for **2.3 milliseconds at a time**, one security at a time,
rather than batching all 518 into one long hold. That figure is recorded so the
next person changing the database can see what they will be queuing behind.

Worth saying plainly, because it is the kind of thing that quietly does not get
said: **our first attempt at that measurement was wrong and we caught it.** The
test harness stamped its data with dates in the year 2099, which our trading
calendar refuses, so every write was rejected and the tool confidently reported
a very fast number — the speed of saying no. A measurement of work that never
happened looks exactly like very fast work. We re-took it properly and wrote
down how the mistake hid, so the next person recognises the shape.

### What you cannot see yet

**Today's payoff is real but it is not yet on the deployed site**, because the
US market was closed when this landed. The mechanism was proven end to end
against a simulated feed — prices arriving on a socket, written to the database,
and served back to a freshly loaded page — and the product labelled that data
`SIMULATED · Generated test data. Not a market feed.` on screen throughout,
which is the honesty rule doing its job unprompted. Seeing it against the real
market is one sitting with the market open.

**And there is a known trap the next task closes.** Tonight's overnight job,
running over a session the live writer has already filled, will produce two
records for the same minute — the single-exchange one and the full-tape one —
and the chart code is not yet prepared for that and will fail. It is understood,
it is the very next task, and it is written down in three places so it cannot be
met by surprise.

### Where this leaves the product

Epic 3 is the live-market epic, and its last structural piece was memory. The
product could see, and it could remember things somebody else had recorded for
it; it could not remember what it had just watched. It can now. Everything the
rest of this epic and the anomaly detection that follows will want to do — "what
did this look like an hour ago", "how does this minute compare with this
morning", replaying a day exactly as it happened — depends on the session being
written down while it happens, and it now is.

### The gates, and the one red that was not this change

`pnpm verify` green. `pnpm test:database` **195 passed**. `pnpm invariants` 21
of 21, after two break entries were repaired — see below. `pnpm e2e` came back
**141 passed, 1 failed**, and the failure was `security-window-change.spec.ts`
at tablet and phone: _pressing a window does not move the chart_, off by 90 px.

**It is `docs/GAPS.md`'s known entry, fired again**, and the entry's own
re-measure settled it on the first attempt rather than the third: green against
`marketpulse_bare`, red against a developer's store seven sessions stale, whose
`1D` answers **0 bars** and `1M` answers **5,460** — so the readout strip is
absent in one state and present in the other and the plot moves between them.
Checkable from the diff as well: this task changed no frontend, shared or route
file and nothing on the read path, only `recordSeries` and `writeBatch`. **A
layout failure from a change that touches no layout is a data failure until
proved otherwise.** The entry was amended with the date and that pairing.

### Two breaks rotted on this change, and `every-break-can-still-land` is why anybody knows

Both were caught by the invariant rather than by review, which is the whole
reason it exists.

**`the-live-stream-loses-its-consumer` needed its anchor MOVED, not re-spelled.**
This task split `gateway.publishObservations(currentMarketState.observe(…))`
into two lines so the writer could take the applied list. Re-pointing the entry
at the broadcast line alone would have left `currentMarketState.observe(` intact
on the line above — so the invariant would still have **passed**, and the break
would have gone red only on `every-break-can-still-land` itself. The harness
says exactly that in its own output: _a command that fails for an unrelated
reason is not evidence either._ The substitution now removes the `observe` call,
which is the wiring the invariant is about, and `pnpm break` was run: red for
the right reason, restored byte-identical.

**`a-second-tape-overwrites-the-first` was RETIRED rather than repaired.** It
proved the overlap refusal, and this task lifted that refusal on purpose — the
defect it described is no longer a defect. Task 3.7.4 wrote it saying the
refusal existed so that Story 3.8's decision would not be taken in passing, and
Story 3.8 has now taken it deliberately. A comment stands where the entry was,
so the deletion is legible rather than silent.

**And one small trap in the tooling, found the expensive way.** `pnpm store:bare`
on a database that already exists reports _already there — bringing it up to
date_ and converges the **universe**; it does **not** empty `market_bars`. So
running the fixture feed against `marketpulse_bare` — which this task did, on
purpose, to watch the writer work — leaves it holding synthetic bars, and the
next spec run against "CI's shape" fails on a store that is no longer bare.
Two runs were spent on that before the count was checked. Clearing it is
`truncate market_bars, bar_coverage`.
