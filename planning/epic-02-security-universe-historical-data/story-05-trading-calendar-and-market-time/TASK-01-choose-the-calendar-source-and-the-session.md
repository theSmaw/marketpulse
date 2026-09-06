# Task 2.5.1 — Choose the calendar source, the session definition and the clock's shape, shipping nothing

**Status:** Complete (2026-09-06)
**Story:** [2.5 Trading Calendar & Market Time Handling](STORY.md)
**Depends on:** Story 2.3

## Objective

Settle the story's three open decisions, plus the two the story does not name and that the
tasks after this one cannot proceed without, and write them down. **Ship no code**, exactly
as Tasks 2.1.1, 2.2.1 and 2.3.1 did.

## What the user can see when this lands

**Nothing, and no file outside `planning/` changes.** The tree finishes byte-identical and
`pnpm verify` is exit 0 — which is the check rather than a formality, because this task is
the one most likely to "just try something" and leave a stray dependency behind.

## Where the record goes

`CALENDAR.md`, beside this file. That is `HOSTING.md`'s, `DATA-LAYER.md`'s and
`UNIVERSE.md`'s arrangement: one document per story subject, in the story that owns it,
pointed at from `CLAUDE.md` rather than copied into it. Epic 13 will read this document
before it writes a replay clock, so write it for that reader.

## The decisions

### 1. Calendar source — and note the shape of the answer is nearly forced

The story offers three: a provider endpoint, a checked-in table, a computed rule set.

- **A provider endpoint is circular here.** Alpaca has a calendar endpoint, but reaching it
  needs the provider abstraction, which is **Story 2.6, and Story 2.6 depends on this
  story**. Adopting it would also break acceptance criterion 5 — fast unit tests, no
  database, no network.
- **A computed rule set fails on one holiday and that holiday is the argument.** Nine of the
  ten US market holidays are nth-weekday or fixed-date rules a hundred lines of code can
  produce. **Good Friday is Easter-derived**, moves on a lunar-solar cycle, and is not in any
  federal holiday list because it is not a federal holiday — it is a market one. A rule set
  that gets nine right and Good Friday wrong is worse than no rule set, because it looks
  correct for eleven months.
- **So the expected answer is a checked-in table**, and the work here is deciding its
  _shape_ rather than its existence: which years it covers, what a date outside that range
  does, and whether half days are rows in the same table or a second one.

Record the reversal: the day the provider's calendar is reachable, this table becomes the
thing you _check against_ it rather than the thing you replace. Name that as a Story 2.7
opportunity rather than an obligation.

### 2. Pre- and post-market — in or out for V1

The story states the cost of each and does not choose. Choose, and state the consequence in
the three places it lands rather than in the abstract:

- **Story 2.8's bars** — whether a missing 08:15 bar is a gap or correct
- **Epic 5's volume baseline** — "4.1× typical volume" is a different number if the
  denominator includes thin pre-market minutes
- **Epic 13's replay** — what the clock's start and end of day are

Note the datum that removes some of the guesswork: **Alpaca's free tier is IEX**
(PRODUCT_SPEC §7.1), and extended-hours IEX volume is thin enough that an anomaly baseline
built on it is measuring the venue rather than the market. Say whether that argument was
used, because Epic 5 will want to know.

### 3. Whether the clock is built now or its seam merely reserved

The story's own middle answer — _one module that answers "what time is it, in market terms",
with a single implementation today_ — is almost certainly right, and Task 2.5.5 assumes it.
What is left to decide here is narrower and sharper: **does that module take an injectable
clock now, or does it read `Date.now()` and get a parameter in Epic 13?**

Prefer the version where **every call site already passes an instant**, and only the very
top of the application reads the wall clock. That is the difference between Epic 13 changing
one module and Epic 13 changing every caller — and invariant 4 is explicit that the retrofit
is the failure mode.

### 4. The one the story does not name: where this code lives

`packages/shared`, `apps/backend`, or a fifth workspace package. It is not a free choice:
**Story 2.8's ingestion (backend) and Story 2.12's chart axis (frontend) both need it**, so
`packages/shared` is the only home that does not produce two copies. Two costs to state
rather than discover:

- `packages/shared` is **consumed as built output**, so a change here means rebuilding
  before either app typechecks against it
- it is **inlined into the frontend bundle**, and Task 2.3.8 measured that a vocabulary
  built by _calling_ a function is not tree-shaken while a plain literal is. A holiday table
  is a literal and should be free when unused; a table built by mapping over a rule is not.
  **Predict the bundle cost here and have Task 2.5.6 measure it.**

### 5. The other one the story does not name: what a market timestamp is on the wire

Story 2.9's contract and Story 2.8's rows both need this settled before they are written.
The candidates are a UTC ISO 8601 instant, an epoch millisecond, or an ET-local string.
`migrations/README.md` already fixes the _storage_ half (`timestamptz`, always) — this is
the JSON half. State it, and state that an ET-local string on the wire is the one that
cannot represent 2026-11-01 01:30 unambiguously.

## Work

- Answer all five above with the argument, not just the answer
- **Check whether a dependency is needed at all, by measurement rather than reflex.**
  `Intl.DateTimeFormat` with `timeZone: "America/New_York"` and `formatToParts` is present
  in Node 24 and in every browser the §3 baseline admits, and it is what a date library uses
  underneath. Check `Temporal` too — if it is available unflagged in Node 24 _and_ the
  browser baseline, say so; if it is not, say that rather than leaving it as a maybe. This
  repository has thrown away two schema libraries and a CORS hand-roll on measurements like
  this one, and the standing rule is that a library wins when its failure mode is _silent_
  and ours is _loud_. Timezone arithmetic done wrong is silent, so a library is not
  obviously the wrong call — take the measurement and decide
- If a library is proposed, cost it the way Task 2.2.1 costed Kysely: store entries, KB,
  lockfile lines, install scripts, from a **fresh install**, then revert
- **List the named dates the story's criterion 1 will be asserted against**, so Task 2.5.4
  implements against a list somebody chose rather than a list somebody remembered. It needs
  at minimum: a full holiday, a half day, Good Friday, a weekend, both DST transitions, and
  the day _after_ a DST transition
- Leave the tree byte-identical

## Done when

- `CALENDAR.md` exists and answers all five, each with the alternative and why it lost
- The dependency question is answered by a measurement, and if anything was installed the
  lockfile and `pnpm-workspace.yaml` are `diff`-clean afterwards
- The named-date list exists and Task 2.5.4 has nothing left to choose
- `pnpm verify` is exit 0 and `git status` is clean outside `planning/`

## Notes

The temptation is to skip this and start writing `isMarketOpen()`. The reason not to is that
four of the five decisions above are cheap now and expensive in Story 2.8 — and the fifth,
the clock's shape, is the one Epic 13 cannot repair from outside, which is the same position
Task 2.4.1's seam was in.

---

## What was decided (Task 2.5.1, 2026-09-06)

The record is **[`CALENDAR.md`](CALENDAR.md)**, beside this file. All five decisions are
answered there with the alternative and why it lost. In brief: a **checked-in table of
exceptions covering 2024–2028**, **regular session only (09:30–16:00 ET)**, **no injected
clock — pure functions plus one module that reads the wall clock**, **`packages/shared`**,
and **UTC ISO 8601 on the wire** with a market date as a separate `YYYY-MM-DD` type.

**No dependency**, measured rather than assumed: `Intl.DateTimeFormat` does all four
operations identically in Node 24 and Chrome 148, `Temporal` is unflagged in Chrome and
**flagged in Node**, and luxon would add **262 kB** to a 357 kB browser bundle. Three
candidates were installed and reverted; the tree is byte-identical.

**Two downstream task files were amended**, because both carried an instruction that would
have shipped a red test: the 252-sessions-a-year check (it is 251 in four of the five
covered years) and the DST assertion (there is no trading session on a DST transition day —
they are always Sundays).

---

## Status report for stakeholders — what this actually was, in plain terms

### The short version

We spent this task deciding, on paper, **what the word "day" means to MarketPulse** — and
writing the answer down before anyone codes against it. Nothing shipped. No pixel moved. The
next five tasks in this story build on top of it, and the last of those puts a **live market
clock into the header** — the first thing on the screen that moves by itself.

### Why a whole task on something so obvious-sounding

Because "day" is not obvious in a market product, and every wrong answer is expensive later.

The US stock market is open roughly six and a half hours, on about 251 days a year, on a
schedule with genuine oddities in it. It shuts on ten holidays. It shuts _early_ — 1pm
instead of 4pm — on about three afternoons a year. It runs on New York time, which shifts by
an hour twice a year while our servers and our database run on a fixed universal clock. And
one of the ten holidays, Good Friday, moves around the calendar on the same cycle as Easter.

Get any of that wrong and the product does not crash — which is the problem. It draws a
price chart with a bar on Christmas Day. It reports "trading volume was three times normal"
because it quietly divided by a half-day's worth of trading. It tells you the market opened
at 8:30am because the person looking at it is in London. **Every one of those looks like a
working product right up until someone who knows the market glances at it, and then it looks
like a toy.**

### The four decisions worth explaining

**1. We are keeping our own list of market holidays, rather than asking our data provider
for one.** The obvious move is to ask Alpaca — they publish this. Two things stopped us. It
would make our automated tests need a live internet connection to answer "is Christmas a
holiday", which is slow and flaky and exactly what we have spent this project avoiding. And
there is a genuine chicken-and-egg problem: the piece of code that talks to Alpaca is built
_after_ this one, and it needs a definition of a trading day to describe what it is asking
for.

The alternative was to _calculate_ the holidays from rules — "third Monday in January", and
so on. Nine of the ten work that way. Good Friday does not, because it follows Easter. **A
system that gets nine right and one wrong looks perfect for eleven months of the year**, and
then produces one unexplainable day of missing data every spring. So: a plain list, checked
in, covering 2024 to 2028, with a note in the file saying who to check it against and when it
needs updating next. It costs about ten minutes of maintenance a year.

**2. If someone asks about a date we have not covered, we refuse to answer.** This sounds
unhelpful and it is the most important safety decision in the task. The tempting behaviour
is to shrug and assume the market was open — which would silently invent a trading day on
every 2029 holiday, and we would find out when a chart showed a price on Christmas. Instead
the system stops and says, in effect, _"my calendar runs out at the end of 2028, here is the
file to update."_ **A loud complaint on the day the list expires beats a quiet wrong answer
a year later.**

**3. We are only covering normal trading hours, not the early-morning and evening sessions.**
This one was decided by a fact about our data. Our market feed is free-tier data from IEX,
which is a single exchange rather than the whole US market — the product already says so on
screen, deliberately. IEX's share of trading is modest during normal hours and very thin
outside them. So if we built our "is this volume unusual?" comparison on pre-market data, the
answer would mostly be measuring _how quiet one exchange happened to be at 7am_ rather than
anything about the market. **An alarm that fires on noise is worse than no alarm**, because
the product is contractually required to explain every score it produces, and there would be
no honest explanation. We wrote down the cost of this choice too: news released before the
open will show up as a jump at 9:30 rather than as a move we can watch happen.

**4. The clock is built so that "time travel" works later.** This is the one that matters
most for the product's headline feature. MarketPulse's showcase capability — the thing the
whole demo builds to — is _Market Replay_: pick a moment last Tuesday, and the system shows
you only what was knowable at that moment, then investigates it as if live. That only works
if nothing anywhere in the codebase secretly peeks at the real current time.

The usual way to prepare for this is to build an elaborate swappable-clock mechanism now.
**We decided the opposite, and it is a stronger answer, not a lazier one.** Every calculation
in this area will be written to take the moment it cares about _as an input_ — so it is
already time-travel-ready, by construction, because you can hand it any moment you like.
Exactly one small piece of code is allowed to ask "what time is it really", and Replay
replaces that one piece. No machinery, one thing to swap, and it costs nothing to build it
this way today.

### What we measured rather than assumed

We do not take this sort of thing on trust, and three checks paid for themselves:

- **We tested whether we needed to buy a date library.** The most popular one would have
  added **262 kB** to a browser bundle that is currently 357 kB — a 73% increase, for date
  handling. We checked whether the browser and server can already do this themselves, and
  they can, identically. **No new dependency.** We did install the candidates to measure them
  properly, then removed them; the project is byte-for-byte where it started.
- **We found a real trap in a new JavaScript date feature.** The modern replacement for all
  this (`Temporal`) is available in Chrome — and _not_ in the version of Node our server
  runs. Since this code is shared by both, using it would have produced something that works
  perfectly in the browser and crashes on the server, and no automated check we have would
  have caught it. We noted the exact condition under which to revisit.
- **We caught two errors in our own future task instructions.** The plan said to check that
  each year has 252 trading days — a widely-repeated figure that turns out to be true of
  2024 and wrong for the next four years running (they are 251). And it said to test the two
  daylight-saving changeover days — which are always Sundays, so the market is shut and there
  is nothing to test. Both would have produced failing tests on correct code. Both task files
  have been corrected.

### Where this leaves the product

Epic 2 is building the historical-data half of MarketPulse. Story 2.4 recently put the **101
tracked companies on screen**, live from the database — the first page a stakeholder can be
sent a link to. This story is the plumbing that everything with a time axis stands on, and
it is deliberately front-loaded so that the three stories that follow (fetching price
history, storing it, charting it) all agree about what a day is instead of inventing three
answers.

**What you will see from this story:** five of its six tasks are invisible groundwork. The
sixth — task five — turns the `--:--:-- ET` placeholder that has been sitting in the header
since the very first version into **a real, ticking market clock that also tells you whether
the market is open, closed, on a holiday, or closing early today**. That is a small feature
and a disproportionately valuable one, because it is the first element on the screen that is
_alive_. Everything so far has been correct and completely static.

**What you still will not be able to do:** see a price, see a chart, or see anything change
because the market changed. That is Stories 2.7 through 2.13, and then Epic 3 for live data.
