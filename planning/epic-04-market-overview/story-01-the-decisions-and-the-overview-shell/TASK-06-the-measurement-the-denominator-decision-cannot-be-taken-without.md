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
