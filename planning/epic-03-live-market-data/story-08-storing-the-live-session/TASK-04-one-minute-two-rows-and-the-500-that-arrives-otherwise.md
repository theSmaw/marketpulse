# Task 3.8.4 — One minute, two rows, and the 500 that arrives otherwise

**Status:** **Complete — 2026-09-23.** `readSeries` serves **one bar a minute**, the consolidated tape winning where it exists and the live one filling what it has not reached (`SERVED_TAPE_RANK`). Applied in the query — `distinct on (observed_at)` — which was **measured** at 22.6 ms against 43.6 ms for reducing in Node, because the second shape puts 19,500 rows on the wire for a window that serves 9,750. `provenance.sources` describes **what was served**: seen on a real page, a store holding 90 IEX rows served an answer naming **45**. `readBars` still answers every row, decided rather than inherited, because replay wants the opposite question. Five database tests, the first failing without this by **throwing**, and `pnpm break the-served-minute-keeps-both-its-rows`.
**Story:** [3.8 Storing the Live Session](STORY.md)
**Depends on:** 3.8.3

## Objective

**Task 3.8.1's decision creates a hard failure in the read path, and this task
is the repair.** Keeping both tapes means a `(security, timeframe,
observed_at)` minute may hold **two rows**. `readSeries` selects them in
`observed_at` order, `toStoredSeries` maps them to bars, and `toBarSeries`
**throws**:

```ts
if (current.startsAt.getTime() <= previous.startsAt.getTime())
  throw new RangeError("Bars must be strictly ascending by startsAt, …");
```

So the first chart request over a session that has been reconciled — a live
session written by Story 3.8's writer and then filled by the nightly backfill —
is a **500 on a page load**, for every reader, for that window. Not a
preference, not a degradation: a thrown error where a chart should be.

**Decide which row a reader is served, and make the read path return one bar a
minute.**

## What the user can see when this lands

**Nothing new — and one thing that never becomes visible, which is the point.**
The chart of a reconciled session draws. Without this task it does not draw at
all.

## Reachable since 2026-09-23, which it was not when this task was written

`0011_market_bars_unique_bar_by_tape.sql` put the tape in
`market_bars_unique_bar`, so **two rows for one minute are now something the
database will accept** — before Task 3.8.2 the old three-column key made this
task's failure impossible to produce at all.

**Amended 2026-09-23 by Task 3.8.3: this is no longer a hazard in waiting, it
is reachable today.** The paragraph here used to end _it is still not reachable
through any shipped writer (the overlap refusal stands …)_. Both halves of that
have gone. **The overlap refusal is lifted** — `ForeignSourceReason` has two
members now, `stitched` and `provider` — and **a shipped writer puts `iex` bars
into `market_bars` every minute the market is open**, because
`live-bar-writer.ts` is wired into the deployed backend. So the two-row state
needs no instrument to produce: one live session plus one `pnpm backfill` over
it, which is what the nightly cron does, and the next chart request for that
window is a **500 for every reader**.

**What that changes for this task:** nothing in its design, and everything
about its urgency. It is the next task rather than a later one, and the window
it is open in is a real one rather than a theoretical one — see the hazard
below, which is now live on any store that has had both writers over one
session.

## Why this is its own task and not a line in the writer's

The writer does not break anything on the day it ships: it writes today's IEX
bars into a window the backfill has not filled, so there are no duplicates and
`toBarSeries` is happy. **The failure arrives the first night**, when the
backfill stores the consolidated version of the same minutes — which is the
moment Task 3.8.1 was created to make deliberate.

**A hazard between the two tasks, stated so it is not discovered — and OPEN
since 2026-09-23.** 3.8.3 has landed, so a store that has both a live-written
session and a backfill run over it **will 500 on that window**. Do not run
`pnpm backfill` over a live-written session until this task lands, and rebuild
the store if you do. On the **deployed** store the clock is the nightly cron:
the first night after a session the live writer has filled is when this
arrives.

## The decision this task takes

**Which tape does a served chart prefer when both cover a minute?** The
candidates, and none is obviously right:

1. **The consolidated bar always.** It is the better number — a full tape rather
   than one venue — and it is what a chart of a past session should show. But
   during a session the consolidated bar does not exist yet for recent minutes,
   so the rule is _prefer SIP, fall back to IEX_, and a chart drawn at 15:00
   changes shape at 21:00. That is honest and is what the source note is for.
2. **The tape that was observable first.** Draws what a reader would have seen
   live, which is Epic 13's want and `PRODUCT_SPEC.md` §22's rule — but it is
   the **wrong** rule for an ordinary chart of last Tuesday, which should show
   the best available history.
3. **Prefer by coverage per window**, choosing whichever tape covers more of the
   requested range. Stable within one answer and unstable across two; a window
   nudged by one minute could flip tapes and redraw the whole chart.

**Recommendation to argue rather than assume: candidate 1**, because a served
chart is _the best account we have of what happened_, while _what was knowable
at the time_ is a different question the store can still answer because both
rows are kept. Epic 13's replay reads with its own rule; that is precisely why
ADR 0035 kept both.

**And the provenance must not lie about it.** If a window is served as SIP
where SIP exists and IEX elsewhere, `provenance.sources` must describe **what
was served**, not what was stored — the stretches come from the rows the answer
contains (`TAPE.md` §8), so the derivation already does this correctly **if**
the preference is applied before the stretches are computed. Apply it in the
right order and assert it.

## Where the choice goes, and the constraint on it

**In the query or in the mapping, and it is not a free choice.** A `distinct on
(observed_at)` with an `order by` naming the preference does it in one statement
and keeps `toStoredSeries` a pure function of the rows it is handed. Doing it in
JavaScript after the fact means the read still carries both rows over the wire
from the database, at the cap-sized window's 9,750 bars — measure before
choosing.

**`readBars` has the same problem and a different answer.** It answers
`StoredBar { bar, feed }` and its one external caller is the replay source,
which wants **every** row rather than a preferred one. Decide whether the
preference belongs to `readSeries` only, and say so where both are declared.

## Work

- The preference, decided and written into `LIVE-SESSION.md` with its
  alternatives
- The read path returning one bar a minute for `readSeries`, with the
  measurement behind where it is applied
- `market-bars.database.test.ts`: a minute holding both tapes is served once;
  the preference is the one decided; `provenance.sources` describes **what was
  served**; a window with no overlap is unchanged
- **A test that fails without this task** — a stored two-tape minute read back
  through `readSeries` — so the 500 has a mechanical guard rather than a memory
- `readBars`' behaviour decided and stated where it is declared
- A `pnpm break` proving the preference is applied
- `LIVE-SESSION.md` §on serving a minute that has two rows

## Done when

1. A window holding both tapes for one minute is served without throwing, and
   the bar served is the one the decision names
2. `provenance.sources` describes the answer rather than the store
3. The replay source's read is decided explicitly rather than by accident
4. `pnpm verify` and `pnpm test:database` pass

## What was done — 2026-09-23

### The decision: the consolidated tape wins

`SERVED_TAPE_RANK` in `market-bars.ts`, and it is **candidate 1** — the one the
task recommended and asked to be argued rather than assumed.

A served chart is _the best account we have of what happened_. SIP is the full
US tape; IEX is a single venue printing **65.1% of a median name's minutes**
(`LIVE-DATA.md` §7.6). During a session the consolidated bar does not exist yet
for recent minutes, so the rule reads **prefer SIP, fall back to IEX**, and a
chart drawn at 15:00 legitimately changes shape once the backfill has run. The
source note is what makes that honest rather than surprising.

**Only the first comparison is a claim, and the code says so.** `sip` above
`iex` is argued. `replay` and `synthetic` are ordered so the choice is
**deterministic** — neither should ever reach this table on a deployed store,
and leaving them unranked would make `distinct on` pick arbitrarily. The record
is declared `satisfies Record<MarketFeed, number>`, so a feed added to
`MARKET_FEEDS` fails this build rather than silently sorting last.

**Candidate 2 — _what was observable at the time_ — is not wrong, it is a
different question**, and it is `PRODUCT_SPEC.md` §22's rule. A reader at 11:07
could only have seen the IEX bar. That is exactly why this preference governs
`readSeries` and **nothing else**: both questions get a true answer only
because ADR 0035 kept both rows. Candidate 3, preferring by coverage per
window, was rejected for being stable within one answer and unstable across two
— a window nudged by a minute could flip tapes and redraw the whole chart.

### Where it is applied, measured rather than argued

**In the query**, which the task said to measure before choosing. Against the
populated store with a **real** two-tape window at the 9,750-bar cap — 9,750
`iex` rows inserted beside NVDA's `sip` ones, then removed:

| where the preference is applied   | median      | rows on the wire |
| --------------------------------- | ----------- | ---------------- |
| nowhere — both rows, then a throw | 55.7 ms     | 19,500           |
| in JavaScript, after the fetch    | 43.6 ms     | 19,500           |
| **in the query**                  | **22.6 ms** | **9,750**        |

The wire is the whole difference. The database's own sort is 6.4 ms of the 22.6
(quicksort, 2,292 kB), and `toStoredSeries` stays a pure function of the rows it
is handed rather than gaining a second job.

**On the raw `sql` this module's header warns about.** The rank reaches the
query as a `case` expression built from the record, so the two cannot drift.
The header's concern is Epic 13's plugin being unable to rewrite a read's
`observed_at` filter; this is an `order by` expression, and the `where` beside
it stays an ordinary builder predicate and remains rewritable. That is written
beside the declaration rather than left for the next reader to worry about.

### `readBars` answers every row, and that is decided

Its one shipped caller is `replay-bar-source.ts`. A preference applied there
would hand Epic 13 a bar **nobody could have seen** and call it history — the
IEX row is what existed at 11:07, and the consolidated version arrived that
night. Both declarations now say which read does what and why, so the next
reader does not have to infer it from a diff. A caller that maps `readBars`
straight into `toBarSeries` will still throw on a reconciled window, and that
is correct: it is asking a question this read does not answer.

### Looked at, on the shape production actually reaches

Built in the local store: **90 minutes of IEX** for 2026-09-14, as the live
writer would have written them, then a backfill storing **45 minutes of SIP**
over the first half of the same session — so 45 minutes are held twice and 45
are IEX only. That is the first night after a live session, exactly.

- `GET /market-data/bars?symbol=NVDA&timeframe=1m&sessions=21` → **HTTP 200**,
  5,550 bars. Before this task the same request threw `RangeError` and the
  route answered **500**.
- The Price region's feed line reads `● All US exchanges  ● IEX  Trades
reported by the IEX exchange only — not the full US consolidated tape.`
- **The source note is criterion 2 made visible**: `5,505 bars All US
exchanges` / `45 bars IEX`. **The store holds 90 IEX rows.** The note names
  45 — what was served, not what is stored. The arithmetic checks: 5,460
  backfilled SIP bars through 2026-09-11, plus the 45 SIP minutes of
  2026-09-14, plus the 45 IEX minutes SIP never reached.

The rows were removed afterwards and the ledger restored to the figure it held
before — 48,797,343 rows, zero `iex`, and `bar_count` agreeing with `count(*)`
on all 518 securities in both timeframes, checked rather than assumed.

### Checks

Five tests in `market-bars.database.test.ts`, under _one minute, two rows, and
what a reader is served_:

1. **The one that fails without this task, and it fails by THROWING** — a
   window whose every minute holds two tapes is served rather than raising
   `RangeError`. That is the 500, with a mechanical guard instead of a memory.
2. The consolidated tape is the one served, asserted through the **prices**
   rather than a feed label, since the bars do not carry one.
3. `provenance.sources` describes the answer: SIP over minutes 0–4 and IEX over
   3–7 serves eight bars naming `sip ×5, iex ×3` — **not** `sip ×5, iex ×5`,
   which is what the store holds. This only holds because the preference is
   applied **before** the stretches are walked.
4. A window with no overlap is unchanged.
5. `readBars` still answers both tapes, ten rows for five minutes.

`pnpm break the-served-minute-keeps-both-its-rows` removes the `distinct on`
and proves the red. `pnpm verify` green, `pnpm test:database` **200 passed**.

### The hazard this closes

The window this task opened on 2026-09-23 is shut. `pnpm backfill` over a
live-written session is safe again, and the deployed store's first night after
a live session is no longer a 500 waiting to happen.

## For a stakeholder — a status report, 2026-09-23

### What this was, in one sentence

**Yesterday's decision to keep two versions of the truth would have broken every
chart the first night it happened, and today we made the product choose between
them.**

### The problem, without the jargon

MarketPulse gets its market data from two places, and they are genuinely
different things. The **live feed** we watch during the day reports trades from
a single exchange, IEX — about two-thirds of the trading in a typical company.
The **historical feed** we fetch overnight is the full US consolidated tape:
every exchange, the complete picture.

Two tasks ago we decided to **keep both**, rather than letting the fuller one
quietly overwrite the thinner one. That was the honest choice and we still think
it was right. It also meant that for any given minute of any given day, our
database could end up holding **two records of the same minute** — the one we
watched arrive, and the better one that came in overnight.

Our charting code had never been told that could happen. It assumed one record
per minute, and when handed two it did not draw a slightly odd chart — **it
stopped, and the page returned an error.** Not a degraded chart, not a warning:
a broken page, for every user, for that day. And it would have arrived on its
own schedule, the first night after a trading session, with nobody touching
anything.

That is what this task fixed.

### The decision we took, and why

**When both versions of a minute exist, we show the fuller one.**

The reasoning is that a chart should be _the best account we have of what
happened_. If the complete record of 2:15pm exists, that is what a person
looking at 2:15pm should see. Where the complete record has not arrived yet —
which during a live session is every recent minute — we show what we watched,
and the screen says so.

There was a real alternative and we want to be clear that we did not dismiss it.
You could argue a chart should show **what was visible at the time** rather than
what we know now. That is a legitimate and important question — it is precisely
the question our Market Replay feature exists to answer, and it will need the
opposite rule. **We can serve both answers truthfully only because we kept both
records**, which is what the earlier decision bought us. So this rule applies to
ordinary charts, and Replay will be free to apply its own. We wrote that down in
both places rather than leaving it to be discovered.

We also rejected a third option — picking whichever version covers more of the
window — because it was unstable: nudging a chart's time range by one minute
could flip the entire picture to a different source and redraw it. A chart that
changes because you scrolled slightly is a chart people stop trusting.

### The bit we are most pleased with

**The screen does not just avoid breaking — it tells the truth about what it
did.** We built the exact situation in our own database: ninety minutes of
live-feed data for a session, then an overnight fetch that filled in the first
forty-five of them from the full tape.

The page now draws, and the note at the bottom reads:

> **5,505 bars** All US exchanges · **45 bars** IEX — trades reported by the IEX
> exchange only, not the full US consolidated tape.

**The database holds ninety live-feed records. The note says forty-five.** It
describes what the chart is actually made of, not what we happen to have in
storage. That distinction is the whole reason this product labels its data at
all, and it is the sort of thing that is very easy to get subtly wrong and never
notice.

### A decision made by measuring rather than by preference

There were two places we could have made the product choose: in the database
query, or in our own code after fetching everything. We measured both against a
realistic worst case — a full-size chart where every single minute had two
records.

Doing it in the database took **22.6 milliseconds**. Doing it in our code took
**43.6 milliseconds**, because that shape drags 19,500 records across for a
chart that displays 9,750. We chose the database. The point is not the
milliseconds; it is that we now have a figure rather than an opinion, written
down for whoever changes this next.

### Where the product stands

The live session is now **written down, served correctly, and honestly
labelled** — three tasks that together turn "the market moves on screen" into
"the market moves on screen and the product remembers it". A reload no longer
costs you the day, and the first night's reconciliation no longer costs you the
chart.

**What is left in this story** is mostly about being careful with the thing we
have just built: making sure a chart of a session still being written is not
served from a stale cache, applying the small corrections the live feed sends a
few seconds late, updating the two screens that now show a stored "today", and
finally rehearsing a full overnight reconciliation end to end before we trust it
on the real deployment.

**What you still cannot see** is any of this on the live site during market
hours. The mechanism is proven against our own database; watching it happen
against the real market is one sitting with the market open, and it is on the
list.
