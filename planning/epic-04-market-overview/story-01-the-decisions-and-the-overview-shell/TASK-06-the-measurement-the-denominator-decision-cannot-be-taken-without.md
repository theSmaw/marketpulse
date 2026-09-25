# Task 4.1.6 — The measurement the denominator decision cannot be taken without

**Status:** **Instrument built, rehearsed and RUNNING — 2026-09-25. The curve itself is owed to this session's close, ~16:00 ET.** `scripts/coverage-curve.mjs` is subscribed to all 518 securities on the deployed gateway and sampling every minute through today's session; it was rehearsed twice against the shut market first, which is where its three findings came from. **The sentence is drafted.** What is not yet decided is **M**, because the number that decides it is being measured as this is written.
**Story:** [4.1 The Decisions & the Overview Shell](STORY.md)
**Depends on:** 4.1.1

## Objective

**Four stories compute an aggregate over a map that is partially observed, and
nobody has measured the shape of the hole.**

What is already known, first-hand and dated: IEX live coverage is **65.1%
median per symbol and 2.1% worst case**, an ordinary gap of **187 minutes** has
been measured, and about **332 of 518** names have a bar in a median minute
(`LIVE-DATA.md` §7.6, §11.2).

**What is not known is the only thing the decision needs**: given a freshness
window of N minutes, **how many of the 518 have an observation inside it**, and
how that number moves across a session — at the open, mid-morning, over lunch,
and into the close.

> **A denominator chosen without that curve is a number chosen because it
> sounded round.** And `EPIC.md` is explicit that the denominator is a decision
> this epic takes **and states on screen**, not an implementation detail.

## What the user can see when this lands

**Nothing** — and the four regions that follow have a defensible denominator
rather than a plausible one.

## Work

- A throwaway instrument against the **deployed** gateway during a session,
  sampling `observations` and counting, per sample: how many of 518 have an
  observation within 1, 2, 5, 15 and 60 minutes
- Run across a whole session if possible, because the interesting part is the
  **shape** — lunchtime thinness is the case a round number gets wrong
- **Quote at least one frame, body or row verbatim** in the findings, which is
  this repository's rule for a throwaway instrument and was measured at 12 of
  14 needed frames the last time it was honoured
- The curve recorded in the story's document, with its n and its date
- The instrument deleted, and `session-sitting.mjs` checked first — it already
  wraps the page's socket and may need extending rather than replacing

## Done when

1. The curve exists for at least five windows, across a session
2. The denominator decision is taken **against it**, with the alternatives and
   a reversal trigger written as a condition
3. The words the screen will use are drafted here, because a denominator
   nobody can phrase is a denominator that will not be shown

## Amended by Task 4.1.1 — 2026-09-25: the decision is taken, and this task supplies its one number

**The owner chose a stated freshness window**, so the question this task answers
is narrower than it was written: not _what shape should the denominator be_ but
**what should M be**.

> _"Of the 518 we track, N were heard from in the last M minutes."_

**So the curve is the deliverable and M is the output**, and the windows to
sample are the ones a sentence could plausibly carry: **1, 2, 5, 15 and 60
minutes**. What makes M defensible is the **shape across a session** — a window
that covers 90% at the open and 60% over lunch is a window that will embarrass
this screen at 12:30.

## Amended by Task 4.1.5 — 2026-09-25: the sentence this task drafts has a constraint, and the instrument has a deadline

### The wording is bounded, and the boundary is a shipped check

This task drafts the words the screen will use, and Task 4.1.5 established what
they may not be.

**The denominator must not reach for `live`, `stale` or `disconnected`.** Those
are a three-member vocabulary with one home, guarded by
`one-home-for-the-feed-words`, and a coverage sentence borrowing them **would
trip a check that exists for a different reason — and would deserve to.**

**The reason is not the check, it is what the two statements mean.** The chrome
says whether data is **arriving**; the denominator says how much of the market
**one figure could see**. They can legitimately disagree — a healthy `LIVE` feed
with 341 of 518 names heard from in five minutes is the ordinary state of IEX —
and a reader who reads the denominator as a fault report has been told something
false by a true sentence.

**So draft it as a qualification of a figure**, in the register the source note
uses for an adjustment: stated once, calmly, beside the thing it qualifies.

### And the instrument has a deadline the measurement does not

**Write and rehearse the instrument against the shut market, before the bell.**

This is Epic 3's most expensive lesson, learned at the end of it: Task 3.11.8's
sitting instrument was written and run against a closed market first, and that
rehearsal found **four faults in the instrument** — a broken import, two lint
rules, an observer self-test polluting its own figures, and a screenshot
answering the wrong question — every one of which would otherwise have been
discovered at the one moment nobody could retry it.

**`scripts/session-sitting.mjs` already wraps a page's socket, counts frames by
URL and drains them on a tick.** Check it before writing anything: this task may
be an extension of an instrument that exists rather than a new one, and the
existing one is already rehearsed.

---

## What was done — 2026-09-25

### The route the store cannot take, ruled out before writing anything

**The obvious cheap answer is the database**, and it does not work. `market_bars`
holds every stored IEX row, so an SQL query over a past session looks like it
would give the curve for free and with no clock in it.

**The nightly backfill covers every regular-session minute with consolidated
SIP**, and the served read prefers `sip` where a minute holds both
(`LIVE-SESSION.md` §14). So a query after the backfill **cannot see the IEX
holes at all** — it sees a complete tape, and would report a denominator of 518
with total confidence.

> **The hole is only visible while the session is running**, in the same map a
> browser holds. That is why this measurement needs a clock, and it is the
> whole reason the task exists rather than being an afternoon's SQL.

### The instrument

`scripts/coverage-curve.mjs` — **a second client on our own gateway, never on
Alpaca**, which is the discipline `weekend-watch.mjs` and `session-watch.mjs`
both took: the free plan allows one connection and production has it. A second
gateway client costs a duplicate copy of each frame and nothing scarce.

It subscribes to all 518, tracks each symbol's **newest observation instant**,
and samples every minute: for each of **1, 2, 5, 15 and 60 minutes**, how many
of the universe fall inside that window. It keys on the bar's own `startsAt`
rather than on arrival, because that is what a browser's map holds and what a
denominator would be computed from.

**The summary is computed from the log rather than from memory**, so a run that
is killed still summarises — and it reports **min, median and max** per window
plus the **shape by market hour**, because a mean would hide exactly the
lunchtime thinness this exists to find.

### Rehearsed twice against the shut market, and it found three things

**This is Epic 3's most expensive lesson applied early** — Task 3.11.8's
rehearsal found four faults in its own instrument, every one of which would
otherwise have surfaced at the one moment nobody could retry it.

**1. A dead loop in the summary that lint could not see.** The first draft
carried `for (const line of appendFileSync ? [] : []) rows.push(line)` — a
leftover that iterates nothing, reads as intent, and passes `eslint`
cleanly. Found by running it and reading the output, which is the only thing
that could have.

**2. The summary printed no curve at all**, because the block that computed it
was that loop. A summary with a plausible shape and no numbers in it is exactly
the failure a rehearsal is for.

**3. `held=0/518`.** With the market shut the deployed process's current-state
map is **empty**, which is Story 3.5's property 4 — _an empty map is a
legitimate value rather than a degraded one_ — and the instrument reads it
correctly. **But it means the rehearsal proved the subscribe, the frame reader
and the sampler, and could not prove the observation path.** That is stated
here rather than discovered tonight.

### Two observations the rehearsal produced that are not this task's

**The gateway sends a `feed` frame every 20–50 s, unchanged.** Four in two
minutes, all identical:

```json
{"at":"2026-09-25T11:09:13.237Z","kind":"feed","feed":{"status":"live","feed":"iex","marketOpen":false}}
{"at":"2026-09-25T11:09:34.406Z","kind":"feed","feed":{"status":"live","feed":"iex","marketOpen":false}}
{"at":"2026-09-25T11:10:07.236Z","kind":"feed","feed":{"status":"live","feed":"iex","marketOpen":false}}
{"at":"2026-09-25T11:11:01.244Z","kind":"feed","feed":{"status":"live","feed":"iex","marketOpen":false}}
```

**That is correct and it explains itself**: `LIVE-DATA.md` §11.2 makes
`disconnected` fire after **165 s with no inbound frame of any kind**, so a
quiet market needs the gateway to say something. The feed frame is the
heartbeat. Worth writing down because it looks like chatter until you know why.

**And one subscribe produces TWO snapshots.** One `socket-open`, one
`subscribe`, `reconnects: 0`, `snapshot: 2` — reproduced on both rehearsal
runs. Task 4.1.3's browser observation was three snapshots per page and was put
down to the page subscribing more than once; **this client subscribes exactly
once.** Mid-session a snapshot carries every subscribed security, so a spare
one is not free. **Handed to Story 4.2**, which owns the seam and will be
adding a frame type to this wire.

### The sentence, drafted

> **Of the 518 securities we track, 341 were heard from in the last 5 minutes.**

**Three things about it are decisions rather than phrasing:**

- **It names the universe first and the count second**, so the figure a reader
  meets is _how many we track_ rather than _how many are missing_. The same
  fact framed as a shortfall reads as a fault.
- **It does not reach for `live`, `stale` or `disconnected`.** Those are a
  three-member vocabulary with one home (`one-home-for-the-feed-words`), and a
  coverage sentence borrowing them would trip a check written for a different
  reason — and would deserve to. The chrome says whether data is **arriving**;
  this says what **one figure could see**.
- **It qualifies a figure rather than the screen**, in the register the source
  note uses for an adjustment: stated once, calmly, beside the thing it
  qualifies. `5` is a placeholder until the curve returns.

### What is owed, and when

**The run is live.** Started 07:13 ET, 560 minutes, covering pre-market through
the close at 16:00 ET:

```sh
node scripts/coverage-curve.mjs 560
# → .capture/coverage/coverage-<stamp>.jsonl and summary-<stamp>.json
```

**M is chosen from `shapeByMarketHour`**, not from the median: a window that
covers 90% at the open and 60% over lunch is a window that will embarrass this
screen at 12:30, and the by-hour shape is the only view that shows it.

**Then the instrument is deleted**, which is this repository's shape for a
throwaway — and the verbatim frames above are why the findings survive it.

### Gates

`pnpm links` green. `eslint` clean on the new script. No product code changed.

## For a stakeholder — a status report, 2026-09-25

### The question

The landing page will soon say things like **"42% of the market is falling."**

That sentence has a hidden question in it: **out of how many?** Our market feed
is one exchange's view of the market, and on a typical minute only about
two-thirds of the companies we track have reported a price. A percentage
computed over "whatever we happened to hear" is a percentage that changes
meaning throughout the day without saying so.

**We decided earlier this week to say it out loud** — _of the 518 we track, N
were heard from in the last M minutes_. This task measures the one number in
that sentence we cannot guess: **M**.

### Why we could not just look it up

Our database holds every price we have ever stored, so the obvious move is a
query. **It gives the wrong answer, confidently.**

Every night we backfill the day's prices from a complete market feed, which
fills in everything the live feed missed. So a query run today about yesterday
sees a perfect record and would report that we hear from all 518 companies —
**which is true of our archive and false of our live screen.**

> The gap is only visible **while the market is open**. That is why this needed
> a measurement rather than a query, and it is why the answer arrives this
> evening rather than this afternoon.

### What we built, and what rehearsing it caught

A small monitoring script now sits alongside our live market connection,
counting every minute how many of the 518 companies have reported within one,
two, five, fifteen and sixty minutes. It runs through today's session.

**We rehearsed it against the closed market first**, and that caught three
problems — including a block of code that quietly did nothing, which meant the
summary would have printed a beautifully-shaped report **with no numbers in
it**. Discovering that tonight, after the one session we can measure, would
have cost a day.

> This is now the second time this week that rehearsing an instrument before it
> matters has paid for itself. The first found four faults.

### Two things we noticed that were not what we were looking for

Our own server sends a small "still here" message every thirty seconds or so
even when nothing is happening. That is correct — it is how the browser knows
the connection is alive rather than silently dead — and it is the kind of thing
that looks like noise until somebody writes down why it exists.

And **one request for data produces two full replies**, which on a busy screen
is a duplicate of everything. Small, but it is pure waste, and it now has an
owner: the next piece of work touches exactly that part of the system.

### Where this leaves us

**The sentence is written and the number arrives tonight.** After that, the four
summary panels on the landing page can be built against a denominator we can
defend rather than one that sounded round — and each of those is a piece of work
with something visible at the end of it.

## Amended by its own sweep — 2026-09-25: the remaining half, and the way this run can lie

**This task is half done and the half that is left is a reading**, so the thing
worth writing down now is **how the reading can be wrong**.

### The run is on a laptop, and Epic 3 has the precedent

`weekend-watch.mjs`'s 1,065 samples over 55 hours contained `poll-failed`
stretches, and Task 3.11.1's verdict on them was plain: **the watching laptop
was asleep.** This run is nine hours on the same machine.

**So before the curve is read, the log is checked for holes**, and the checks
are cheap because the instrument records what it needs:

- **Sample count against elapsed minutes.** One sample a minute; 560 minutes
  should give ~560 rows. A shortfall is machine sleep, not market silence, and
  the two are indistinguishable in the counts themselves.
- **`socket-close` rows.** Each is a reconnection, and a gap after one is this
  client's rather than the deployment's — the same caveat every watcher in this
  repository has carried.
- **The first sample with a non-zero `held`.** Before it, the numbers are the
  empty-map rehearsal state rather than a measurement.

> **A curve computed over a log with a two-hour hole in it looks exactly like a
> curve computed over a quiet market.** That is the failure this check exists
> to prevent, and it is the same shape as every other instrument caveat this
> product has recorded.

### If the run is holed

**Do not reconstruct it.** Re-run tomorrow — the instrument exists and is
rehearsed, which is the whole point of having built it a day early — and say so
rather than publishing a curve with a caveat nobody will read.

### And the deletion is part of this task, not the close's

`ALPACA.md` §11's shape is **run it, record the findings, delete it**, and the
verbatim frames already in this record are what make that safe. The close
confirms it happened; **this task does it.**

## The curve, first reading — 2026-09-25, the first 25 minutes of the session

**The instrument came alive at the bell and the shape is already decisive.**

| ET    | held | 1 min | 2 min | 5 min | 15 min | 60 min |
| ----- | ---: | ----: | ----: | ----: | -----: | -----: |
| 09:44 |  506 | **0** |   324 |   448 |    506 |    506 |
| 09:49 |  513 | **0** |   340 |   460 |    506 |    513 |
| 09:54 |  513 | **0** |   307 |   443 |    504 |    513 |

### The one-minute window is structurally empty, and that is the finding

**`1m` is not thin. It is zero, and it will always be zero.**

A bar's `startsAt` is **the start of the minute it describes**, and the bar
arrives about half a second after that minute has **ended** — so at any sampling
instant the newest observation's own instant is already **60 to 120 seconds
old**. A window of 60 seconds measured against `startsAt` can never contain
anything.

> **This product has hit that exact shape before and paid for it.** Task 3.3.4
> found `live` **unreachable in session** because the 60 s staleness comparison
> was measured from the interval's **start** rather than its end
> (`LIVE-DATA.md` §11.2's second amendment). The same offset, one surface over,
> found again by an instrument that did not know to look for it.

### So the sentence has a decision in it that nobody had noticed

**The window means different things depending on what it is measured against**,
and both are defensible:

| Measured against                   | Reads as                                         | Smallest honest M |
| ---------------------------------- | ------------------------------------------------ | ----------------- |
| the bar's own instant (`startsAt`) | _we have a price from within the last M minutes_ | **2 minutes**     |
| when the observation **arrived**   | _we heard from it within the last M minutes_     | under a minute    |

**The first is what a browser's map actually holds** and what every figure on
this screen is computed from, so it is the one the sentence should mean — and
the sentence must therefore never offer a window shorter than two minutes,
because such a window is not thin, it is empty.

**Handed to Story 4.4** along with M itself.

### Where the curve is heading

At 25 minutes into the session, against 518 tracked: **2 min ≈ 62%**, **5 min ≈
87%**, **15 min ≈ 97%**, **60 min ≈ 99%**. The 2-minute figure lines up with
`LIVE-DATA.md` §7.6's **65.1% median per-symbol minute coverage**, measured
first-hand on the stream a fortnight ago and from an entirely different angle,
which is the best kind of agreement.

**The reading that decides M is still owed**: the lunchtime trough is the case a
round number gets wrong, and it has not happened yet.

### The summariser was rehearsed against the partial log, and it found a trap in its own output

**The arithmetic that produces the final answer was run mid-flight**, against
the log as it stood at 122 samples, rather than trusted to work at 20:00 when
the run ends and the process exits. It works. But reading its output early is
what exposed the trap:

```text
curve: 1m {median 0}  2m {median 1}  5m {median 3}  15m {median 9}  60m {median 19}
by market hour:
  07  1m 0   2m 0     5m 0     15m 0     60m 0
  08  1m 0   2m 0     5m 2     15m 6     60m 13
  09  1m 0   2m 4     5m 8     15m 13    60m 24
  10  1m 0   2m 361   5m 447   15m 504   60m 515
```

**The aggregate `curve` is not merely less informative than the by-hour shape —
against this log it is actively wrong.** A run started at 07:13 ET spends
**two hours and seventeen minutes before the bell**, during which the honest
answer is zero at every window, and those samples are in the same median as the
session's. `2m`'s aggregate median of **1** and its `10` o'clock median of
**361** are the same window on the same day.

**So M is chosen from `shapeByMarketHour`, restricted to the hours 09:30–16:00**,
and the aggregate line is quoted only with its start time beside it. This is the
same failure the socket count made — _count by URL, never by event_ — with the
denominator changed: **a median is a claim about its population, and an
instrument that samples outside the thing it measures has a population nobody
chose.**

## The instrument found something it was not looking for — 2026-09-25

**The gateway sends a `feed` frame per inbound VENDOR ITEM, to every attached
browser, regardless of what that browser subscribed to.** Found by reading the
coverage log's own frame counts, confirmed in source, and then re-measured from
a second socket subscribed to **one** symbol.

### The measurement

Over 3h48m on the deployed gateway, from a client subscribed to all 518:

```text
feed frames: 30541      by status: { live: 30531, disconnected: 10 }
distinct payloads: 3
consecutive payloads identical: 30865      different: 21
per-minute rate, pre-market (n=89 minutes):  median 2
per-minute rate, session   (n=90 minutes):  median 332   min 3   max 385
```

**They arrive as one burst at the top of the minute.** In the five minutes from
14:00 UTC, **1,734 of 1,746 frames landed in second `:00`**, nine of sixty
seconds were occupied at all, and the median inter-frame gap was **0 ms**.

### And the subscription does not scope them

A second socket, subscribed to **`NVDA` alone**, for 75 seconds:

```text
feed frames in 75.0s with ONE symbol subscribed: 310
```

**119 bytes each**, verbatim:

```json
{"type":"feed","version":1,"sentAt":"2026-09-25T15:04:22.667Z","feed":{"status":"live","feed":"iex","marketOpen":true}}
```

So a phone on a security page showing one number receives **~250 identical
frames a minute** — **~30 KB/min, ~1.8 MB/hour, ~11.6 MB over a session**, of
which the information content is three distinct payloads in 3h48m.

### The mechanism, in source rather than inferred

`alpaca-stream.ts:255` calls `apply(...)` **inside the per-item loop** over the
inbound vendor message. `apply` (line 214) advances the connection and then
notifies **unconditionally**:

```ts
connection = advanceStreamConnection(connection, event);
subscriber?.onConnectionChange(connection);
```

`index.ts:791` answers `onConnectionChange` with `gateway.publishFeedState()`,
which `broadcast`s `feedMessage()` to every client. The keepalive is
`KEEPALIVE_INTERVAL_MS = 120_000` and accounts for **0.5 frames a minute** of
the 332 measured; the other ~331 are one per vendor item.

**The connection genuinely changed** — `lastFrameAt` moved — so nothing here is
lying. What is wrong is that a change to the **watchdog's** private bookkeeping
is published as a change to the **browser's** feed state, and those are not the
same object.

### Why nobody has seen it, which is the part that generalises

**`sameLiveFeedView` suppresses the render.** The frontend already collapses a
feed view that has not changed, so 250 no-op frames a minute cost a browser
almost no script and produce no visible symptom. **The mitigation for the
symptom was built before anybody measured the cause**, and it made the cause
invisible for the whole of Epic 3.

This is the deferral pattern `PROVENANCE.md` §14 recorded, with the arrow
turned: there, a surface armed itself for a day that had already come; here, a
suppression worked so well that the thing it suppresses was never counted.

### It contradicts a stated constraint

**ADR 0033's fourth constraint on `sentAt` is _one per frame, 36 bytes
measured, never one per security._** That rule was written about the field.
The **frame carrying it** is, in this path, one per security — so the constraint
holds in the letter and fails in the spirit, and the ADR owes a dated amendment
rather than a rewrite.

### What was NOT done, deliberately

**Nothing was repaired.** Epic 3 is closed, this is shipped behaviour on the
live feed, and the change — notify only when the published view differs — is a
product decision with a measurement behind it, not an overnight edit. It is
handed to **Story 4.7** with the figures above, in that story's own words,
because 4.7 owns the degraded set and already owns the browser-side liveness
question this sits beside.

> **And it sharpens 4.7's other number.** The "browser's own heartbeat" row in
> that story's decision table reads _every 20–50 s_. The honest statement is
> **bimodal**: ~2 frames a minute out of hours, ~332 during a session. A
> browser-side liveness threshold must be derived from the **quiet** case,
> because that is the floor — the session rate is an artefact of this defect
> and will drop to the keepalive's 0.5/min the moment it is repaired.
