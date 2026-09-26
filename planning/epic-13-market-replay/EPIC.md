# Epic 13 — Market Replay

**Status:** Not started
**Sequence:** 13 of 15 — follows Epic 12 (Investigation Persistence & Branching)
**Spec references:** PRODUCT_SPEC.md §8.4 (Market Replay), §21 (replay), §22 (temporal consistency), §23 (what did the market know), §24 (replay architecture)

## Goal

Introduce historical replay and enforce temporal correctness.

## Outcome

Users can reconstruct a historical market session and investigate it using only information available at that time.

## Scope

- Replay mode
- Global replay clock
- Play/pause
- Replay speed
- Timeline scrubbing
- Historical market-event playback
- Historical anomaly reproduction
- Timestamp-aware analytical tools
- Timestamp-aware SEC queries
- Data-layer future-information prevention
- "Investigate at this moment"
- Agent replay context
- Replay-state visualization

## Exit criteria

The user can select a historical session, stop the clock at a particular time and ask:

> What appears to be happening right now?

MarketPulse cannot access observations or evidence originating after that timestamp.

**Milestone:** by the end of this epic MarketPulse has its signature capability.

---

## Where temporal isolation is enforced, and what already exists (added 2026-09-06, Task 2.4.6)

Invariant 4 says future-information leakage must be **structurally impossible** rather than
instructed. This section records where that is enforced, because the decision was taken two
epics before this one and the module it depends on already ships.

**The mechanism is a Kysely plugin, and it was measured rather than assumed.** Task 2.2.1
built one in a spike and reverted it. Kysely exposes the query AST to a plugin, so a call
site that asked for **no time filter at all** compiles to one carrying
`observed_at <= $replayClock`, and a raw `` sql`…` `` — which reaches the plugin as an
opaque `RawNode` it cannot rewrite — can be **refused**. Both were produced. So the seam is
_rewrite what it can, refuse what it cannot_. The full write-up is
[`DATA-LAYER.md`](../epic-02-security-universe-historical-data/story-02-database-schema-and-migrations/DATA-LAYER.md),
and it also records **PostgreSQL row-level security** as the fallback nobody chose — genuinely
structural, database-side, and the only mechanism that would survive the query layer being
replaced. **Read that paragraph before assuming the plugin is the only option.**

**The hole is not in the plugin.** `withPlugin` returns a **different object**, so the
plugged handle and the raw one are two values, and the guarantee is worth nothing if there
is an unplugged handle anybody can import. The arrangement that closes it: **a module builds
its own `Kysely` instance, does not export it, and exports functions returning domain
objects.**

### What already exists

`apps/backend/src/securities.ts` (Task 2.4.1) is that arrangement, shipped. Every module
that touches the database takes the same shape — `migrate.ts` and `load-universe.ts`
incidentally, `securities.ts` deliberately — and `database.ts` owns the pool and exports no
handle.

**The honest half, and the reason this section exists rather than a line in a task file: the
seam is ESTABLISHED and NOT YET EXERCISED BY ANYTHING.** `securities` has no `observed_at`
and is not a temporal table, so nothing the shipping code does would be filtered by the
plugin even once it exists. The arrangement was established against a case where breaking it
has **no symptom at all** — which is why it was cheap to get right there, and why a module
that gets it wrong will pass every check anybody can write until this epic arrives.

`market_bars` (Story 2.8) is the first table with an `observed_at`, and **Story 2.9's bar
query is the first place the seam does real work.**

### A replay mechanism lands early, in Epic 3, and this epic inherits it (added 2026-09-16)

**Part of this epic's machinery is being built three epics early, for a reason
that has nothing to do with replay as a feature.** The developer is in
Asia/Singapore, where the US session is 21:30–04:00, so Epic 3's design and
demonstration work would otherwise all happen at night.
[ADR 0030](../../docs/adr/0030-replaying-our-own-bars-and-the-mechanisms-that-stop-the-live-feed-rotting.md)
answers that by replaying the **48.4M minute bars this product already stores**
through Epic 3's live stream seam.

**What this epic inherits, tested rather than planned:**

- A replay engine that paces on **recorded offsets** rather than array position,
  so the quiet minutes survive — and on a feed with **65.1%** median per-symbol
  minute coverage the quiet minutes are most of the signal. (Corrected
  2026-09-24 by Story 3.8's close: this read _82.8%_, `ALPACA.md` §5.2's figure
  for the **stored** endpoint; the live stream is `LIVE-DATA.md` §7.6's 65.1%
  median and 2.1% worst case.)
- The **two-instant discipline**: a replayed observation carries a `startsAt`
  shifted onto the wall clock and an `occurredAt` holding the recorded instant.
  Epic 13 needs exactly this distinction everywhere, and it is the practical
  shape of invariant 4.
- **The first real exercise of temporal isolation.** The section above says the
  seam is "ESTABLISHED and NOT YET EXERCISED BY ANYTHING". A replay stream that
  may never emit a bar after its own clock is the first thing that exercises it,
  with a check and a break behind it.
- A `ReplayBarSource` seam with a store-backed and an in-memory implementation.

**What this epic still owns, and none of it is started:** the replay clock as a
**user-facing** object — play, pause, speed, drag, jump to event — the date
selection, "investigate at this moment", the agent and analytical tools under a
replay clock, and the Kysely temporal plugin that makes invariant 4 structural
rather than arranged (ADR 0015 gap 4). Epic 3 builds a mechanism; this epic
builds the feature.

**One caution, and it is the one this epic should check first.** Epic 3's replay
is deliberately **prevented from running while the market is open** (ADR 0030
decision 7), because its purpose there is to not mask a broken live feed. This
epic's replay has the opposite requirement — a user replaying 11:07 on a past
Tuesday must be able to do so at 11:07 on a live Tuesday. **That is a lifting of
the guard for a different object, not a loosening of it**, and the two must not
end up sharing one flag.

### Two things to check first, before writing any of this epic

1. **Audit the export lists**, not the queries. `grep` for a module that exports a `Kysely`
   instance rather than functions. ADR 0015's gap 4 records that **nothing enforces this** —
   Story 2.4 _honoured_ the convention, which is not the same as it being enforced, and it
   is now load-bearing on modules that ship.
2. **`status` is this schema's one invisible predicate, and replay must NOT filter on it.**
   `UNIVERSE.md` §12.2 is explicit: a security untracked today **was** tracked on the date
   being replayed, so filtering it away is invariant 4's failure arriving through a column
   rather than through a timestamp. Story 2.4 shipped the rendering that keeps such rows
   visible; this epic must keep them in the data.

## Handed here by Story 3.7's close — 2026-09-23: a stored bar now knows which tape it came from

**This is the column _what was knowable at 11:07_ has been waiting for.**
`market_bars.feed` holds `sip`, `iex`, `synthetic` or `replay` per row since
`0010_market_bars_feed.sql` (ADR 0034), stamped by the writer from the series'
own provenance. So the distinction this epic turns on — the **IEX bar that was
observable live** against the **SIP correction that arrived overnight** — is now
a fact in the data rather than one the replay would have to infer.

Three things to pick up, in the words you will need them:

- **The tape reaches you and is dropped on purpose.** `readBars` answers
  `StoredBar { bar, feed }`; `replay-bar-source.ts` maps `.bar` and discards the
  tape, with a comment saying the engine's own emission is labelled `replay`
  whatever the bar was observed on. **That line is where you pick it up** if
  _what was knowable_ needs the tape rather than the numbers.
- **What happens when two tapes claim one minute is Story 3.8's decision, not
  yours, and it is not taken yet.** Today the writer refuses an overlapping
  series from another tape rather than resolving it (`ForeignSourceError`,
  reason `overlap`), and the per-row conflict rule is that the existing row
  keeps its tape and takes the new numbers. `TAPE.md` §6 and §7. Whichever shape
  3.8 chooses is the shape your replay reads, so read it before designing
  around today's.
- **The `status` predicate rule is unchanged** and still yours: never filter
  `securities.status` when replaying something stored.

## Handed here by Task 3.8.1 — 2026-09-23: the decision was taken in your favour, and here is what it cost

Story 3.7's section above said the tape was the column _what was knowable at
11:07_ had been waiting for, and left the collision question open. **It is
settled: both tapes are kept**
([ADR 0035](../../docs/adr/0035-both-tapes-are-kept-and-what-a-record-is.md)).

A minute of a security may hold one row per tape. The IEX bar the live stream
observed **survives** the consolidated bar that arrives overnight — they are two
observations of one minute by two instruments, not a bar and its correction —
so the honest answer to _what was knowable at 11:07_ is a row in the table
rather than an inference.

**The argument that won was yours**, quoted from the record so it is not
re-derived: an overwritten IEX bar leaves no trace the observation was ever
made, and `PRODUCT_SPEC.md` §23's question then stops being answerable rather
than becoming expensive.

**What it cost, so you know what you are spending.** Keeping both is **+69%
rows a year** (47.7M → 80.5M), **+6.1 GiB a year**, and takes the store's
headroom from **~2.6 years to ~1.5** against 22.5 GiB usable. **Amended 2026-09-25 at Epic 3's close: the store was measured rather than projected — 13.62 GB at 41% of the provisioned disk, which is **~2.1 years** of headroom at today's rate, and the `~1.5` assumed a two-tape growth that has **no signal in the measurement yet**. The figures here are the projection they were; `HOSTING.md` carries the reading.** ADR 0035's
reversal trigger is a condition — the first month the live rows outgrow the
backfill's, or the storage alert firing early — and **the evidence that would
defend the decision is yours to produce**: what the IEX bars are actually used
for, once replay ships. Until then the cost is carried on the strength of the
premise alone.

**One practical note for the replay's reads.** A window may return two rows for
one minute, and which one a chart draws is a read decision Story 3.9 takes.

> **Amended 2026-09-24 by Story 3.8's close — that decision was reclaimed and
> SHIPPED, and it is the one thing here you must not reuse.** Task 3.8.4 took
> it back from Story 3.9 because `toBarSeries` refuses bars that are not
> strictly ascending and **throws**, so two rows for one minute was a 500 on a
> page load rather than a chart drawn from the less good row. `readSeries` now
> does `distinct on (observed_at)` ordered by `SERVED_TAPE_RANK` —
> `sip, iex, replay, synthetic` — in `apps/backend/src/market-bars.ts`.
>
> **That rank is a SERVING preference and it is the opposite of replay's**, for
> exactly the reason the paragraph below gives. A replay that reads through the
> shipped `readSeries` gets the consolidated bar — the one that arrived
> overnight — for every minute the backfill later covered, which is
> future information reaching a replayed instant through a helper nobody
> thought of as a clock. **Invariant 4 says that constraint belongs in the data
> layer**, so replay needs its own read rather than a flag on this one; the
> rank exists as a named constant so a second ordering is a sibling rather than
> an edit.
> **Replay's answer is not the same one**: a chart may reasonably prefer the
> consolidated bar, and replay must prefer the tape that was **observable at the
> replay clock** — which is the IEX row for a session being replayed live-shaped,
> and the consolidated one only for instants after it arrived. That is invariant
> 4 in a form the column finally makes expressible.

## Handed here by Task 3.8.8 — 2026-09-23: does a replayed bar fire the arrival mark, and the sentence that assumed it should not

**Story 3.4 handed Story 3.8 a constraint with two readings in it, and only one
of them is yours.** The wording was: _a replay of the store must not fire the
arrival mark, because re-reading is not an arrival._

**The reading that is settled.** A page whose prices come from the **store**
because no feed is connected — the deployed default, and CI's — marks nothing.
Asserted in a browser by `security-price-motion.spec.ts`: load, reload, and
`[data-arrival]` has count **0** across the whole page, the 518 universe rows
included. That is the reading the argument fits: scrolling through yesterday is
not an arrival.

**The reading that is yours, and it wants the opposite answer.** Replay
playback is not a re-read; it is a **reproduction against a moving clock**, and
a bar genuinely arrives at the replay instant. Suppressing the mark would make
the reproduction _less_ faithful, and §§21–23 are about showing what was
knowable **as it became knowable**. Story 3.4's own vocabulary — _work in
progress loops, a state persists, **a fact arriving decays**_ — reads in favour
of marking.

**What happens today, read off the code rather than run.** `useArrival` in
`SecurityIdentity.tsx` keys on `(symbol, observation signature, fromSnapshot)`
and **has no feed input at all**, so a replayed bar is indistinguishable from a
live one and **the mark fires**. `MARKET_DATA_PROVIDER=replay` ships now, so
this is the behaviour a developer sees today rather than a future question.

**The decision is one line and it is a design decision, not a bug fix:** is the
motion vocabulary a claim about **the wall clock** or about **the clock the
reader is watching**? Two things that make the second answer cheap to defend:
the chrome already says `REPLAYING` beside the figure, so nobody is being told a
stale thing is live; and the mark says _a bar arrived for this security_ rather
than _this price just moved_, which is true of a replayed bar at its own
instant.

**If you choose to suppress it**, note what that costs: `useArrival` would need
the feed, which it deliberately does not take — the flag it does take,
`fromSnapshot`, comes **down from the store rather than being inferred**,
because _ignore whichever observation arrives first_ would also suppress a
genuine first bar for a thin security. Any feed-aware suppression needs the same
care, and `LIVE-DATA.md` §7.6's 2.1% minute coverage for `ERIE` is why.

**Where the rest of it is written:** Story 3.4's Task 3.4.10 carries the audit
this came out of, and records the count as **two and a half of three** rather
than three, so the open half is not mistaken for finished work.

### Handed here by Story 3.10 — 2026-09-24: the degraded set exists, inherit it rather than re-inventing it

**Every live surface has degraded states and this product has already
enumerated them once**, produced rather than imagined: nine of them,
photographed at 1440, 1024, 768 and 390, with the text of six surfaces compared
so _do two states read identically_ is answered by strings rather than by eye
(Task 3.10.9). The set, the unreachable cells and why they are unreachable are
in that task's record.

**Three rules travel with it and each is somebody's measured defect:**

- **`FeedStatus` is about the CONNECTION and `MarketSessionStatus` about the
  SESSION**, and they must not be collapsed. The market being open does not
  mean data is flowing, and the market being shut is not a feed failure — a
  quiet socket at 02:00 is correct and must not read as broken.
- **A quiet security is not a broken feed.** IEX's median per-symbol minute
  coverage is **65.1%** and the worst case is **2.1%** (`LIVE-DATA.md` §7.6);
  `LIVE-DATA.md` §11.2 measured an ordinary maximum gap of **187 minutes**.
  Anything that reports silence as a fault will cry wolf on thin names all day.
- **The connection has ONE home** — the status bar — and every other surface
  stays quiet by decision (ADR 0029's fourth rule; Tasks 3.10.3, 3.10.5 and
  3.10.8 each took it with reasons). A second surface reporting the connection
  is the defect this product has produced four times on one screen.

**And one unrepaired consequence, recorded in `docs/GAPS.md`**: because the
connection has one home and that home is sticky at the **foot** of the
viewport, at 390 the distinction between _the feed stopped_ and _the market is
shut_ is below the fold. No check can see it.

> **Amended 2026-09-25 by Task 4.1.8 — both halves of that were wrong, and the
> entry it names now exists.** _Below the fold_ is false: the status bar is
> **sticky**, on screen at 390 at any scroll, and when the feed drops it
> **grows from four wrapped lines to six** — a size change that moves the page,
> which is a stronger peripheral signal than a word swap. And `docs/GAPS.md`
> held **no such entry** until this task wrote one; four `EPIC.md` files and an
> ADR had pointed at a record that never existed.
>
> **What is actually wrong is the timing**: a client that loses its network
> reads **`LIVE` for exactly 165 seconds** before anything changes, because the
> word is driven by the monotonic watchdog rather than by the socket closing.
> Nobody fails to notice the fold; for two minutes forty-five seconds there is
> nothing to notice. **Owner: Story 4.7**, with four alternatives priced.

**And the question this epic has to answer rather than inherit: a replay has no
feed to disconnect.** Several states above are **unrepresentable** under a
replay clock — there is no socket, so no `disconnected`, no `stale`, no gap to
fill on reconnection — and the honest rendering of a replay's chrome is already
decided (ADR 0030: `REPLAYING`, and a deployment configured to replay fails
before it rolls). What is **not** decided is what a replay says when its own
stored data runs out mid-session, which is the nearest thing it has to a
degraded feed and is this epic's to name.
