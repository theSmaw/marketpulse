# Story 3.8 — Storing the Live Session

**Status:** Not started
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
