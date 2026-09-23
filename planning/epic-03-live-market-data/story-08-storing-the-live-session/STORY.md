# Story 3.8 — Storing the Live Session

**Status:** In progress — **eight of TEN tasks done (3.8.1–3.8.8)**, the last of them on 2026-09-23. The deployed backend is a bar writer, the two-feed source note is on screen, and a reconciled session is a chart rather than a 500. Originally **split into eight tasks 2026-09-23**; a ninth was inserted at 3.8.4 that day, and a **tenth at 3.8.5** on the same day with everything after it renumbered — Task 3.8.4 repaired one read that assumed one row a minute and the audit it prompted found a second, `readLastCloses`, which does not throw and whose wrong answer has no tell — latent today, because nothing calls it at a timeframe that can hold two tapes, and waiting directly in Task 3.8.8's path. See _Tasks_ below. The visible payoff is Task 3.8.3, which is as early as the two decisions before it allow.
**Epic:** [Epic 3 — Live Market Data](../EPIC.md)
**Depends on:** 3.5, 3.7
**Epic scope covered:** market-data persistence for live observations, and the reconciliation between two tapes covering one session

## Description

Everything this epic has built so far is **in memory and lost on restart**, and
every chart of today starts again from the sixteen-minute edge on a cold load.
This story writes the session down.

It is also where two tapes meet in one place for the first time. The store is
backfilled nightly by a job that fetches **complete sessions** from the
consolidated tape; this epic writes the **same session** from a single venue as
it happens. So tonight's backfill arrives with a better answer for bars we
already hold — more complete, from a broader tape, and sometimes simply
different. **What happens to the IEX bar is a product decision about what a
record is**, not a database detail.

This repository has a position on that question already: _historical market-data
persistence is a record of what was observed, not a cache._ An observation
overwritten leaves no trace that it was ever made, and Epic 13's replay is built
on the premise that what was knowable at a moment can be reconstructed.

## What the user can see when this story lands

**Today, after a refresh.** Open a security at 14:30, reload, and the chart still
reaches 14:30 — from the store, not from a socket that has been running since
the page opened. Before this story a reload dropped every viewer back to the
sixteen-minute cliff.

And the same chart **out of hours**: today's completed session, drawn in full,
before the nightly backfill has run.

What the user still cannot do: rely on it across a disconnection gap, or read an
honest account of what the feed did while they were away — Story 3.10.

## Why it sits here in the sequence

**After the column exists** (Story 3.7), because writing an IEX bar into a store
that cannot say so is the defect that story was created to prevent. **After the
current-state model** (Story 3.5), because that is what has the bars. And after
the chart's live edge (3.7), because this story changes where that edge's data
comes from, and it is worth having produced the read-time stitch once honestly
before the store starts answering the same question.

## Scope

- **The write path**: minute bars from the socket into `market_bars`, with their
  tape, and the ledger updated to match. Note the constraint that shaped
  Epic 2's read path and now has to be relaxed deliberately rather than by
  accident: **`recordSeries` refuses a series whose source disagrees with the
  ledger row it would extend.** Story 3.7 decides what replaces it; this story
  writes through it.

  > **Decided 2026-09-22 by Task 3.7.4, in words this story can act on.**
  > The refusal is three named reasons on `ForeignSourceError.reason`:
  > **`stitched`** (a series naming two sources — stands), **`provider`** (a
  > different provider from the ledger row's — stands; the row carries the
  > tape and not the provider, so the ledger names one), and **`overlap`**
  > (the series overlaps stored bars from another tape — **yours to lift**,
  > and the only one). A socket series with `alpaca`/`iex` provenance
  > **already stores** as a contiguous extension of the SIP window: the
  > window grows to the union, `readBars` answers both tapes in order, and
  > the ledger's `feed` column is the tape the window was opened with and
  > means nothing else. What lifting `overlap` decides is the three shapes
  > below **and** what _contribution order_ means once a tape can occur in
  > two runs (`TAPE.md` §6 and §7); `MarketBarsTable.feed`'s update type is
  > `never`, so a shape that moves a tape on a correction changes that type
  > on purpose.

- **What happens tonight.** The backfill fetches the same session from the
  consolidated tape. Three shapes, none chosen, and this story must take it
  explicitly rather than discover it at the first overnight run:
  1. **The SIP bar wins and the IEX bar is replaced.** Simplest, gives the best
     history, and destroys the record of what was observable live.
  2. **Both are kept**, keyed by tape, and the read path prefers one. Truthful,
     and it is the shape invariant 4 and Epic 13's replay actually want — _what
     was knowable at 11:07_ is the IEX bar, not the SIP correction that arrived
     at 21:00. It costs a uniqueness rule and a read-path decision.
  3. **The IEX bar is never stored at all** and the live session is memory-only.
     Cheapest; makes the payoff above impossible.
- **`observed_at` versus `recorded_at`, which this story is the first real test
  of.** A row carries when it was true in the market and when we wrote it, and
  `observed_at` **never has a default** — `default now()` silently turns one into
  the other on the column replay keys on. A live bar is the first row in this
  product where the two instants differ by seconds rather than by hours, which
  is exactly the case where a mistake is invisible.
- **Idempotence.** A reconnection replays bars, a restart re-subscribes, and a
  socket occasionally repeats itself; the write must tolerate all three without
  producing a second row or a loud unique-violation on a normal Tuesday.
- **Partial minutes are not stored**, or are stored and marked — a bar for the
  minute in progress is not the same object as the 389 complete ones, and
  writing one down as final is a false record rather than an early one.
- **The read path's answer to _today_.** `/market-data/bars` currently stitches
  a live tail because the store stops at yesterday's close; once the store holds
  today, the stitch's own bound changes and the metered vendor request may no
  longer be needed for most windows. `MARKET-DATA-API.md` §5 set a condition for
  keeping the stitch — check it rather than assume it still holds.
- **The caching consequence.** `ETag`s on this path were argued on _a closed
  session's bars never change_, with a qualification already recorded: the bars
  do not change and the **response** does. A session being written to as it
  happens is a third case, and a five-minute freshness lifetime over a series
  that is growing every minute is a stale chart with a valid validator.
- **`status` is not filtered on this path.** Bars stored against a security we
  have since stopped tracking are still what happened. Story 3.5 filters and this
  does not, and the asymmetry is deliberate.

## Out of scope, and who owns it

- The gap a disconnection leaves, and backfilling it on reconnect — Story 3.10
- Replay reading these rows — Epic 13, which is the reason option 2 above is
  worth its cost
- Storage sizing beyond this epic's own session — Story 3.11 measures what a
  live session adds per day

## Open decisions — settle with the user

1. **The three shapes above**, and it is a product decision rather than a
   technical one: it decides whether this product can ever answer _what was
   knowable at 11:07_ with the data that was actually knowable at 11:07, which
   is `PRODUCT_SPEC.md` §23's question and the flagship feature's whole premise.
2. **Whether a live-written session is served to everyone or only re-read by the
   writer**, which is really a question about how much this product trusts a
   single venue's bars as history.

   **Settled 2026-09-23 by Task 3.8.1.** Decision 1 is **shape 2 — both tapes
   are kept**: a minute may hold one row per tape, because a stored bar is a
   record of an observation rather than a cache of the best available number.
   It costs **+69% rows a year**, **+6.1 GiB a year**, and takes the store's
   headroom from ~2.6 years to **~1.5**; the funder named beside it is
   `market_bars_pkey`, **1,045 MB with zero scans**, which is Epic 14's.
   Decision 2 is **served to everyone, with its label** — the session is honest
   but thin (**65.1%** median per-symbol minute coverage, measured first-hand,
   _not_ the 82.8% that is the stored SIP figure), and the source note already
   meets `PRODUCT_SPEC.md` §7.1 **per stretch**. "Only the writer" collapsed on
   inspection: `GET /market-data/bars` has no notion of a caller, so it would
   have had to be a storage rule rather than a serving one.
   [ADR 0035](../../../docs/adr/0035-both-tapes-are-kept-and-what-a-record-is.md)
   carries the alternatives, their prices and the reversal trigger;
   [`LIVE-SESSION.md`](LIVE-SESSION.md) carries the figures.

**And a third thing was found while pricing them, which belongs to the writer
rather than to this list.** Today's backfill skips any session it believes is
covered, so a live writer that claims today would stop the consolidated version
ever being fetched — leaving a permanently thin session with **no collision, no
error and nothing on screen**. `LIVE-SESSION.md` §3; Task 3.8.3 decides what the
writer claims and Task 3.8.9 asserts the backfill asked at all.

## Acceptance criteria

1. A minute bar arriving on the socket is stored with its tape, and the ledger
   agrees with it
2. A cold load during a session serves today's bars from the store, and the
   chart reaches the same edge it reached before the reload
3. Storing the same bar twice produces one row and no error
4. A bar for the minute in progress is not recorded as a complete minute
5. The overnight reconciliation behaves as the decision above states, proved by
   running both paths over one session rather than by reasoning about them
6. `observed_at` is supplied by the writer in every path, and nothing defaults it
7. A response for a growing session is not served stale from a validator written
   for an immutable one
8. `pnpm test:database` passes; `pnpm verify` passes
9. `pnpm bars:check` still tells the truth about what is missing and why, now
   that two writers fill the same table

## Tasks

**Nine, and the third one is the payoff.** This story is mostly a write path,
which is the kind of work that can run for a week with nothing to show — so the
split is ordered to put the visible change as early as the dependencies allow.
Two decisions have to be taken before a row is written (3.8.1) and the store has
to be able to hold what they decided (3.8.2); **3.8.3 then delivers both visible
things at once**, and everything after it makes that correct rather than adding
to it.

| #      | Task                                                                                                                           | Depends on | Visible?                                       |
| ------ | ------------------------------------------------------------------------------------------------------------------------------ | ---------- | ---------------------------------------------- |
| 3.8.1  | [What a record is, decided before a row is written](TASK-01-what-a-record-is-decided-before-a-row-is-written.md)               | 3.7        | No — **done**                                  |
| 3.8.2  | [The uniqueness rule, and the migration it needs](TASK-02-the-uniqueness-rule-and-the-migration-it-needs.md)                   | 3.8.1      | No — **done**                                  |
| 3.8.3  | [The writer, and the first reload that keeps its chart](TASK-03-the-writer-and-the-first-reload-that-keeps-its-chart.md)       | 3.8.2      | **Yes — both, and both seen — done**           |
| 3.8.4  | [One minute, two rows, and the 500 that arrives otherwise](TASK-04-one-minute-two-rows-and-the-500-that-arrives-otherwise.md)  | 3.8.3      | No — the 500 never arrives — **done**          |
| 3.8.5  | [The last close that is the same minute twice](TASK-05-the-last-close-that-is-the-same-minute-twice.md)                        | 3.8.4      | No — a latent lie closed before 3.8.8 meets it |
| 3.8.6  | [A growing session is not an immutable one](TASK-06-a-growing-session-is-not-an-immutable-one.md)                              | 3.8.3      | No — one thing stops being wrong — **done**    |
| 3.8.7  | [The late revision the live path throws away](TASK-07-the-late-revision-the-live-path-throws-away.md)                          | 3.8.3      | No — **done**                                  |
| 3.8.8  | [The surfaces that now show a stored today](TASK-08-the-surfaces-that-now-show-a-stored-today.md)                              | 3.8.3      | **Yes — a claim the store can keep — done**    |
| 3.8.9  | [The overnight reconciliation, rehearsed over one session](TASK-09-the-overnight-reconciliation-rehearsed-over-one-session.md) | 3.8.7      | No                                             |
| 3.8.10 | [The sweep, the hand-offs and the close](TASK-10-the-sweep-the-hand-offs-and-the-close.md)                                     | 3.8.9      | No                                             |

**Task 3.8.3 carries a second visible change that costs nothing to build, and
it is the one worth showing.** `SourceNote` already renders one stretch per
`BarSource` when a series names more than one feed, and Task 3.7.5 already made
a stored window produce exactly that from its rows. So the first time this
story's writer puts an IEX bar into a window the backfill filled with SIP, the
source note at the foot of the Security Explorer should read its stretches in
contribution order with their bar counts — `All US exchanges`, then `IEX` **with
the sentence saying it is one venue rather than the whole tape**. That is
`PRODUCT_SPEC.md` §7.1's requirement, the sentence `CLAUDE.md`'s invariant 6
exists for, and a thing this product has shipped the code for and never once
been able to show. **It is derived from reading the code rather than from having
seen it**, so 3.8.3 confirms or refutes it and photographs the result either way.

**Why the decision is the first task.** `0004_market_bars.sql` made a
uniqueness decision deliberately — one row per `(security, timeframe,
observed_at)` — on the premise that a backfilled historical bar is final. A live
bar is not final, and the three shapes in _Open decisions_ above differ in
whether that constraint survives. Writing the writer first and discovering the
constraint at the first overnight run is the failure this order exists to
prevent, and Story 3.7 took the same shape for the same reason.

**Two constraints from Story 3.7 shape the split and are worth restating here.**
The store already accepts a second tape extending a window contiguously, so a
socket series with `alpaca`/`iex` provenance **stores today** — what 3.8.1
decides is the **overlap**, which is the one refusal left. And Task 3.7.6
measured that a migration on `market_bars` queues behind any open transaction
and takes every reader with it, which makes this story's write transaction a
deploy decision rather than only a throughput one (the section at the foot of
this file).

**The design canvas could not be walked, for the second time in two days.** On
2026-09-23 `DesignSync` listed two writable design-system projects for this
login — `Ida's / Charlotte Puxley Design System` and `Design System` — and
**neither is the MarketPulse canvas**, exactly as Story 3.7's split found on
2026-09-22. ADR 0026's chain is canvas → `VISUAL-LANGUAGE.md` → `tokens.css` →
components, so with the canvas unreachable the document is the working source
of truth for this story, which is a **downgrade of the chain rather than a
break** — nothing in this story adds a token or a surface. **Two occurrences
make it a pattern rather than an accident**: whoever owns the canvas should
confirm whether this login can still reach it, because Story 3.9 is the next
story that genuinely needs it and it has been told to check twice now.

## What this story hands forward

A store that holds today, and the first rows in this product whose provenance
was not decided by a constant.

---

## Handed here by Task 3.1.4 — 2026-09-17

**Two decisions taken on 2026-09-17 change what is stored**
([`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) §7.11).

**Extended-hours bars are rendered and marked**, so they are also **kept**:
pre-market and after-hours bars arrive on the same channel with nothing
distinguishing them (§7.7), and a store that filtered them by market time would
be discarding real data on a boundary the feed does not assert.

**The product subscribes `updatedBars`**, and this is the sharper one for a
store: a bar written for a `(symbol, minute)` may be **superseded about thirty
seconds later** by a corrected one (§7.8). An insert-only path produces two rows
for one minute. `market_bars` has a uniqueness decision to take that Epic 2
never needed, because a backfilled historical bar is final and a live one is not
— and `observed_at` versus `recorded_at` is the pair that already exists to
express it.

---

## Handed here by Task 3.1.7 — 2026-09-17, and this is the other half of a decision

**Decision 4 and this story's scope are one decision seen twice, and the first
half is now taken.** [`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) §10.3: the backend holds **only the
last bar per security** in memory — 0.2 MB — and **not** today's bars, which were
measured at **55.6 MB**, 10.9% of the replica's entire memory.

**So this story is obliged to store the live session durably.** Story 3.9's chart
needs today's bars; §10.3 declines to hold them in memory precisely because this
story is about to hold them in the store, and the read path already exists —
Epic 2 built `GET /market-data/bars` and a read-time stitch of stored bars with a
live tail (§1.11). **If this story's scope narrows, §10.3 has to be re-taken**,
because between them they are the only two places today's bars could live.

**And §7.11's `updatedBars` decision reaches the schema directly.** A bar written
for a `(symbol, minute)` may be **superseded about thirty seconds later** by a
corrected one — measured at 0.36% of bars, with three of fourteen changing the
close price (§7.8). An insert-only path produces two rows for one minute.
`market_bars` needs a uniqueness decision Epic 2 never required, because a
backfilled historical bar is final and a live one is not; `observed_at` versus
`recorded_at` is the pair that already exists to express it.

**Extended-hours bars are kept**, per §7.11: they arrive on the same channel with
nothing distinguishing them (§7.7), and a store that filtered them by market time
would be discarding real data on a boundary the feed does not assert.

---

## Story 3.9 may depend on this story — raised 2026-09-18 by Task 3.2.10's audit

**[`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) §10.3 names this story as the other half of a decision it
took**, and the epic table does not reflect it:

> Story 3.9's chart uses it, and **Story 3.8 stores the live session so that it
> can.** Decision 4 and Story 3.8's scope are **one decision seen twice** — this
> half says _not in memory_, and that obliges Story 3.8's half to say _durably in
> the store_, **on the same day**.

§10.3 chose to hold **only the latest observation per security** in the backend,
not today's 390 bars — so any surface wanting today's _shape_ reads it from
somewhere else, and §10.3's rejected alternative says that somewhere is this
store: _"Story 3.8 — storing the live session — is a **dependency of Story 3.9**
rather than a story after it."_

**Story 3.9's own file argues the opposite ordering** and for a different reason
— it wants its two-feed ledger produced from the read-time **stitch** rather than
from the database, once, honestly. **Both arguments are good and they are about
different things**: one about where today's bars come from, one about where the
ledger comes from.

**Unresolved on purpose, and named in both files.** Whoever schedules 3.7 should
settle it rather than discover it. The full statement of the question is in
[Story 3.9's `STORY.md`](../story-09-the-live-edge-and-the-two-feed-ledger/STORY.md).

---

## Handed here by Story 3.4's close — 2026-09-21: what a stored observation has to keep, and what it must not make fire

**Story 3.4 shipped two marks that are derived rather than stored**, and both
constrain what this story writes down.

**1. The extended-hours mark is derived from the bar's own instant.** §7.7
measured that **nothing on the frame distinguishes** a pre-market bar from a
regular-session one, so `extendedHoursAt` takes the instant and asks Story 2.5's
calendar. **It is not a field on the wire and must not become one in the
store.** A stored observation therefore has to keep its instant **exactly** — a
bar re-read tomorrow must produce the same word it produced live, and a stored
`pre_market` boolean would be a second home for a fact the calendar already
owns. Stories 3.6 and 3.9 consume the same mark from the same derivation.

**2. The arrival mark must not fire on a replay of your own store.** It means
**a bar arrived for this security** — an event — and re-reading a stored session
is not one. Story 3.4's vocabulary is _work in progress loops, a state persists,
**a fact arriving decays**_, and a mark that fired while a user scrolled through
yesterday would be the vocabulary's own sentence made false.

**The mechanism to check rather than rebuild**: the mark keys on the
observation's **content**, and `SecurityIdentity` remembers the instant it
mounted with so a first paint marks nothing. Whether that still holds when the
prices come from a store rather than a socket is this story's to confirm — and
it is the one thing that would be invisible until somebody watched it.

**And §10.3's Map is deliberately not a history.** Story 3.4 held **the latest
observation per symbol and nothing else**, on the arithmetic that 518 × 390 bars
is **55.6 MB** against 518 × 1 at **0.2 MB** — _to hold a thing the store is
about to hold durably_. That store is yours; the browser's Map is not where a
history goes.

## Handed here by Story 3.5's close — 2026-09-21: a correction the live path throws away

**Task 3.5.1 decided that the current market state ignores a revision for a
minute already passed**, and the reasoning is sound: applying it would make the
latest observation _older than the one it replaced_, and every reader would
watch the price jump backwards for no reason a user could understand.

**The consequence is yours, and nothing else can pick it up.**

> A revision for a **superseded** minute is discarded by the live path
> entirely. §14.1 measured revisions at **0.064%** of bars, **35.3% of them
> changing the close** — so these are materially wrong numbers rather than
> noise. The only place they can be applied is the **store**.
>
> **If Story 3.8 does not apply them, this product's stored history is
> permanently and knowably wrong for a small fraction of bars — and nothing
> will ever report it**, because the frame that would have corrected it was
> dropped a story earlier.

**A revision for the minute currently held IS applied** and reaches a browser,
so the case you inherit is specifically the late one: §14.1 measured revisions
arriving **29.1–30.1 s** after their bar, which is usually inside the same
minute but not always.

### And the `status` asymmetry is deliberate — do not "fix" it

`currentMarketState` filters on `status` to `active` only, through
`trackedSymbols()` in `universe.ts`. **Your read path deliberately does not.**

`UNIVERSE.md` §12.2's rule: filter when computing over _the market we track
now_, never when showing or replaying something we **stored**. A security we
stopped tracking today was tracked when its bars were written.

**A reader who makes the two agree breaks one of them**, and which one depends
on which way they made them agree. The reason is written beside the filter in
`current-market-state.ts` for exactly this.

---

## Re-ordered 2026-09-21: this story was 3.9 and now runs BEFORE the chart

**You are now a dependency rather than a follow-up, and the thing depending on
you is the live chart edge (Story 3.9).**

`LIVE-DATA.md` §10.3 decided that the backend holds **one `Map<symbol, Bar>`**
and that today's bars are **not** held in memory, and it drew the consequence in
the same breath — _this half says not in memory, and that obliges this story's
half to say **durably in the store**, on the same day._ **Story 3.5 built the
first half** (Task 3.5.1, `currentMarketState`, latest-only, break-verified), so
the obligation is now live rather than anticipated.

**What changes for you:** the chart cannot draw today's session from anywhere
else. A gap between the session open and the latest observation is not a
cosmetic shortfall in a later story — it is a **hole in the first chart a user
sees during a session**, and this story is the only thing that can close it.

**What does NOT change:** your own scope, your three shapes, and both open
decisions. The store's read path stays **unfiltered** on `status` while the live
path filters — that asymmetry is deliberate and is argued in the section above.

**And your dependency renumbered with you.** The tape column is **Story 3.7**
now (it was 3.8). Its deadline was always _before the first stored live bar_,
which is yours, and that is unchanged — it simply sits immediately before you in
the sequence rather than two places back.

---

## Handed here by Story 3.6's close — 2026-09-22: a dating rule you will blur

**The universe table dates a stored close and does not date a live price**
(Task 3.6.1). Every cell in the `Last` column used to be one kind of number —
a close from the consolidated tape, all from one session, so the date was
stated once in the heading. A live price is a different kind of number from a
different feed, so once any row is live the heading withdraws its shared claim
and **each stored row carries its own session date**, while a live row carries
none and is spoken as `Live price`. Measured on the local store: the exception
set went from 3 of 518 to about 197, and it is the correct set.

**Storing the live session blurs the line the rule draws.** After you, a
reload shows today's bars as _stored_; a row that was live before the reload
and is stored after it should not change what it claims. Decide, in your
file, what a stored bar from **today's** session says in that cell and
whether it is dated — and keep the two things the table already guards: the
spoken word tells the two kinds apart, and a claim about a session is made
only while it is true of the whole column.

**Two more facts about the surface you will feed:** the current-state map
never expires an observation, so a "live" price can be hours old (Task 3.6.2
handed that state to Story 3.10, not to you); and the table is memoised on
the observation's identity (Task 3.6.5), so a stored bar handed to it under a
new object for the same minute is a re-render of that row.

## Handed here by Task 3.7.6 — 2026-09-23: writing during the session changes what a deploy costs, and the number is yours to keep small

**This is a constraint on a decision you have not taken yet**, which is why it
is here rather than in a document you would have to know to open.

**The measurement.** `ALTER TABLE market_bars` takes an `ACCESS EXCLUSIVE`
lock. It waits behind any open transaction on that table, and Postgres queues
everything that arrives afterwards **behind the waiter** — including plain
reads whose own locks conflict with nothing that was granted. Rehearsed on the
local populated store (48,797,343 rows) with a write transaction held open: the
migration waited **18.16 s**, and an ordinary chart read arriving two seconds
later waited **16.16 s** against a **0.09 s** baseline. Both showed
`wait_event_type: Lock`, `wait_event: relation`. `lock_timeout` and
`statement_timeout` are `0` and `migrate.ts` sets neither; the bound was
measured (`lock_timeout = '3s'` fails clean in 3.13 s) and deliberately not
bought — `docs/GAPS.md`, _A migration on `market_bars` waits for as long as the
longest open transaction_.

**Why it is yours rather than the deploy's.** Today the only thing that writes
to `market_bars` is the nightly backfill, in **two cron windows a day**
(`backfill.yml`: `0 21` and `0 8` UTC), each about ten minutes, and each
transaction is one session — 390 rows, **81–137 ms** measured. So a merge has
to land inside a twenty-minute window and then inside a hundred-millisecond
transaction, and the deploy fails safely if it does not (`timeout 120`, exit
124, nothing applied, no code rolled).

**This story makes the backend write to that table throughout the trading
session.** That turns two narrow windows into six and a half hours a day, and
it puts the transaction's duration on the critical path of every deploy that
merges while the market is open — which, for a developer in Asia/Singapore, is
the evening. **So the granularity of your write is also a deploy decision**: a
transaction per minute-batch across 518 securities is a different exposure from
a transaction per security per bar, and the difference is measured in how long
the whole site's charts can stall.

**What to do with it, concretely:**

- **Measure the transaction you ship**, the way 3.7.6 measured the backfill's,
  and record the figure in this story's subject document. A write path whose
  transaction duration is unmeasured is one nobody can reason about here.
- **Prefer short transactions to few ones** where the choice is free. The
  store's own writer already batches by session because that is what
  `recordSeries` takes; a live writer has a real choice.
- **Do not reach for `lock_timeout` without reading why it was not bought** —
  `createDatabasePool` is shared with the serving pool and `POOL_MAX` is 10,
  so a `SET` is not reliably the connection the DDL runs on. If your
  measurement makes the bound worth buying, that entry's owner condition is
  met and the repair belongs with it.
- **The diagnostic is already correct**: `deploy.yml`'s exit-124 message names
  `wait_event: relation` beside the advisory lock since 3.7.6, so an incident
  points at the right row.

## A ninth task, inserted 2026-09-23 at 3.8.4 — the decision created a 500 and the split did not have a task for it

**Task 3.8.1 settled that both tapes are kept, and that makes a minute able to
hold two rows.** `toBarSeries` refuses bars that are not **strictly ascending**
by instant — it throws a `RangeError` — so the first chart request over a
session that has been live-written and then backfilled is a **500 on a page
load**, for every reader, for that window.

**The original split handed this to Story 3.9** as _which row does a chart
draw_, on the reading that it was a preference. It is not: without a rule there
is no chart at all. ADR 0035's _What this does NOT decide_ carries a dated
correction saying so.

**So a task was inserted rather than a line added to another**, because it
takes a decision (which tape a served chart prefers), it needs its own tests,
and it has to land before the first overnight reconciliation. The tasks from
_A growing session_ onward each moved up one number; nothing else changed, and
every reference to them was remapped in the same change.

## Handed here by Task 3.8.3 — 2026-09-23: the daily ledger's `covered_end` is holding a wall clock, and Task 3.8.9 owns it

**`bar_coverage.covered_end` is a market-time column, and on every `1d` row it
was a write time.** Found by accident on a developer's store while cleaning up
after the writer measurement: all 518 daily rows read
`2026-09-14T00:04:38.533Z` — milliseconds and all, the instant the backfill ran
— where the minute rows read `2026-09-11T20:00:00Z`, which is the last stored
bar plus a minute and is correct.

**Why this is Task 3.8.9's and not a tidy-up.** That task owns the overnight
reconciliation, and the two functions that decide whether tonight's backfill
asks for anything — `planRequests`, which skips a session wholly inside the
covered window, and `commonCoverage`, which intersects `covered` across symbols
— **both read this column**. A `covered_end` that drifts forward to the write
time claims coverage the store does not hold, which is the same failure mode
`LIVE-SESSION.md` §3 made Task 3.8.3 decide the live writer's claim to avoid.
It is the daily timeframe rather than the minute one, so it does not touch the
live session directly; it touches whether the reconciliation can trust the
number it is reconciling against.

**What 3.8.9 owes on it:** find which writer sets it (the backfill's daily path
is the candidate), say whether the value is deliberate, and either correct it or
record why a wall clock belongs on that column. `DATA-LAYER.md`'s rule is that
`observed_at` is when it was true in the market and `recorded_at` is when we
wrote it, and a market-time column carrying a write time is exactly the
confusion that rule exists to prevent.

## A tenth task, inserted 2026-09-23 at 3.8.5 — the second read that assumed one row a minute, and this one does not throw

**Task 3.8.4 fixed `readSeries` and the same defect was sitting in
`readLastCloses`.** That read takes the newest **two rows** per security and
calls them `(last, previous)` — an assumption from Task 2.9.6 that two rows
means two minutes. Since ADR 0035 a minute may hold a row per tape, so on a
reconciled session the two newest rows are the **same minute twice**.

Measured rather than reasoned, on the populated store, **at the `1m`
timeframe**:

```text
BEFORE: close 218.19 at 2026-09-11T19:59Z,  previousClose 218.38
AFTER : close 301    at 2026-09-14T13:32Z,  previousClose 201
```

`201` is the IEX close for **13:32**, the same minute as `301`. The change that
produces is about **+49.8%**, drawn with an arrow and a colour like any other.

**Corrected 2026-09-23, before the task was implemented.** The paragraph here
claimed this would print on all 518 universe rows on the first night after a
live session. **It would not.** `readLastCloses` has one shipped caller and it
passes **`1d`**; the live writer writes **`1m`** and nothing else; only the
backfill writes daily bars and only ever on `sip`. The reproduction called it
at `1m`, which nothing in the product does. **The defect is latent.**

**It still ranks here, for a different reason than the one first given.** The
function takes a timeframe as a parameter and is wrong for any that can hold two
tapes — and `1m` can, today. Task 3.8.8 is _The surfaces that now show a stored
today_, and a universe table showing today's close is a table reading minute
bars. This is a trap laid directly in that task's path, it is cheap to close
now, and its wrong answer has **no tell**: a well-formed, correctly-coloured
percentage with an arrow, computed between two versions of one minute.
`PRODUCT_SPEC.md` §35 forbids exactly that twice over — no **manufacturing
missing observations**, and **every generated conclusion distinguishable from an
observed fact**.

**It is not a one-liner, which is why it is a task.** The lateral's `limit 2` is
what makes that query a bounded backwards index walk — 518 searches, 2,597
buffers, 21.4 ms cold against 830 ms for the `row_number()` shape it beat in
2026-09-09's measurement. `distinct on` needs a sort, and whether the planner
still streams it off the index is a question for `explain (analyze, buffers)`.
The task carries the table the repair is held to.

**And it names the wider sweep**: every other read of `market_bars` that assumes
one row a minute. Two have been found by being met rather than by looking.
