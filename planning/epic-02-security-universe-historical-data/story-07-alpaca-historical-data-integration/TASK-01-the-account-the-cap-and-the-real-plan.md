# Task 2.7.1 — Hold a real key, measure what the free plan actually is, and answer the question another story is parked on — shipping nothing

**Status:** Complete (2026-09-07)
**Story:** [2.7 Alpaca Historical Data Integration](STORY.md)
**Depends on:** Story 2.6, and the account prerequisite

## Objective

Measure Alpaca. Not read about it — **measure it**, with a terminal and a real key, and write
the numbers down with the date they were taken. Then settle the story's open decisions 1 and 2
against those numbers.

**Ship no code**, exactly as Tasks 2.1.1, 2.2.1, 2.3.1, 2.5.1 and 2.6.1 did. Nothing outside
`planning/` changes and `pnpm verify` is exit 0 at the end — the check rather than a
formality, because this task holds a live credential in a shell and the failure mode is a key
in a file.

## Do the WebSocket cap FIRST, before any other measurement in this task

**This is the one measurement another story is blocked on**, and it takes one connection, one
subscribe message and a read of the response. `UNIVERSE.md` §10 parks the size of the tracked
universe on it, with both branches already written out, and the two published sources are two
orders of magnitude apart:

- [Alpaca's pricing page](https://alpaca.markets/data): the free plan is **"Limited to 30
  symbols"**, flatly.
- [Alpaca's streaming guide](https://alpaca.markets/learn/streaming-market-data): the limit is
  **"30 channels at a time for trades and quotes"** and **"there is no limit to the number of
  channels with minute bars"**.
- The reference documentation states neither.

**The whole product rests on which is true.** PRODUCT_SPEC.md §11's four calculations — price
percentile, volume ratio, relative move, breadth — are every one of them bar-based and consume
no trade and no quote. If bars are exempt, the cap does not bind this product at all. If the
pricing page is right, **the 101-security universe is already over the cap** and Epic 3 has a
blocker rather than a tuning problem.

**This is an explicit, narrow exception to "the stream is Epic 3's"**, and the exception is
measuring a limit rather than building a stream. Connect once, subscribe to minute bars for
more than thirty symbols, and read what comes back — an error, a partial acknowledgement
naming what it accepted, or a clean subscription. Then subscribe to trades for more than
thirty and confirm the difference. **Record the acknowledgement payload verbatim**, because
"it seemed to work" is not a measurement and a server that silently drops the thirty-first
subscription looks identical to one that accepted it.

Then write the answer into `UNIVERSE.md` §10, which is where the parked decision lives, and
take the branch it names:

- **Bars exempt** → §10's sizing reopens with ~500 proposed and ~1,500 as the architectural
  target. **Do not re-size the universe in this task** — §10 says the metadata source (§5) has
  to be settled before a number is picked, and that is Story 2.8's re-curation. Record that
  the trigger fired and hand it on.
- **Cap is 30 across all channels** → this is a **blocker on Epic 3**, not a sizing question.
  Say so plainly, in `UNIVERSE.md` §10 and in Epic 3's `EPIC.md`, and name the two exits: the
  universe shrinks, or the product buys Algo Trader Plus at $99/month (which also removes the
  IEX quality ceiling). Do not choose between them here; that is a conversation with a person.

## What the user can see when this lands

**Nothing, and no file outside `planning/` changes.** The payoff is Story 2.12's chart, and
the nearest visible thing is Task 2.7.4, which makes the deployed site say `IEX`.

What this task changes is **what we are allowed to claim**. Every number in `ALPACA.md` after
this replaces a sentence somebody read on a marketing page, and three of them decide how big
the product can get.

## Where the record goes

`ALPACA.md`, beside this file. That is `HOSTING.md`'s, `DATA-LAYER.md`'s, `UNIVERSE.md`'s,
`CALENDAR.md`'s and `PROVIDER.md`'s arrangement: one document per story subject, in the story
that owns it, pointed at from `CLAUDE.md` rather than copied into it.

**Write it for three later readers.** Task 2.7.7 picks retry and backoff numbers out of it,
Story 2.8 sizes a backfill against it, and Epic 3 reads it before opening a socket. Every
figure carries **the date it was taken**, because a plan's limits are a vendor's decision and
can change without telling us — which is exactly why this document exists rather than a
citation.

## The measurements

Each of these is a request and a read, not a search. Where a number contradicts the
documentation, **the measurement wins and the contradiction is the finding.**

### 1. The plan's headline limits

- **Request rate.** Documented at 200/minute on the historical API. Establish it by exceeding
  it: how many requests before a 429, is the window fixed or sliding, is the limit **per key
  or per endpoint**, and what does the 429 body and its headers actually contain. **Capture
  `Retry-After` in whichever of its two forms arrives** — delta-seconds or an HTTP date — and
  note that Task 2.7.6 has to map both onto one duration.
- **History depth.** Documented as "since 2016". Ask for a range before it and read the
  response: an error, an empty answer, or a silently clipped one. The third is the dangerous
  one and it must be found here rather than in Story 2.8's backfill.
- **The withheld recent window.** Documented at the latest 15 minutes on the free plan.
  Confirm it and time it: request a range ending `now` and see where the bars stop.
  **This is not an error condition** and must never map onto one (`PROVIDER.md` §7) — it is
  `SeriesCoverage` doing its job.
- **The multi-symbol request.** One request naming N symbols: does it cost one request against
  the rate limit or N? Is there a cap on N? Does the response envelope change shape? Story
  2.8's backfill is sized entirely on this answer, and it is the single measurement most
  likely to change that story's design.
- **Pagination.** `limit`'s ceiling (documented 10,000, default 1,000), what a
  `next_page_token` looks like, and whether the last page carries `null` or omits the field.

### 2. The three reconciliation numbers `PROVIDER.md` §6.4 hands this story

These are assumptions Story 2.6's generated corpus is making and **structurally cannot check**,
because it never touches a vendor. Each is a number, not an impression.

1. **Does a full regular session actually yield 390 IEX minute bars for a liquid name?**
   Probably not — IEX is one venue, not the consolidated tape. Take it for a heavily traded
   name (say the largest in the universe) across at least five ordinary sessions and report the
   distribution rather than one number. **If it is not 390, then `market-session.ts`'s
   `minuteBars` is the count of minutes in a session and not the count of bars to expect**, and
   that sentence has to be written into `CALENDAR.md` as an amendment, because Story 2.8's gap
   handling is sized against the difference and getting it wrong makes every absent bar look
   like a fault.
2. **How often does a minute have no bar for a thinly traded name?** Take the thinnest
   equities in the tracked universe. This is the number that decides whether an absent bar is
   ordinary or worth reporting, and Story 2.8's acceptance criterion 4 rests on it.
3. **Which end of the interval does `t` mark — the start of the minute or its end?** Settle it
   by evidence rather than by convention: the first bar of a regular session should be
   `13:30Z`/`14:30Z` if `t` is the start and one minute later if it is the end, and a session's
   last bar tells the same story from the other end. Cross-check against a daily bar's `t` on
   the same date. **A one-minute systematic error is invisible on a chart and wrong in every
   §11 calculation**, which is why `Bar`'s field is named `startsAt` — so a mapping that gets
   this backwards reads as a contradiction rather than as a plausible assignment.

### 3. The things Task 2.7.3 needs to write a mapping against

- **The bar payload**, captured verbatim for a liquid name, a thin name, a half day and a
  holiday. `PROVIDER.md` §7 lists the fields from documentation; confirm the list against real
  bodies and note anything documented-but-absent or absent-but-documented.
- **What an unknown symbol actually does.** This is the one most likely to surprise: a vendor
  that answers `200` with an empty `bars` object for a symbol that does not exist has made
  `unknown-symbol` **indistinguishable from an empty answer**, and `PROVIDER.md` §8.2 is
  explicit that an empty answer is a success. If that is what happens, say so here — Task
  2.7.5 then has a member it cannot produce from this endpoint, which is a real finding and
  feeds directly into Task 2.7.8's assets-endpoint decision.
- **`adjustment` in practice.** Pick a security in the universe with a known split inside the
  available history and request the same range as `raw` and as `split`. Confirm the two differ
  in the direction `PROVIDER.md` §3.5 records, and that a security with no split returns
  **identical bars** in both modes. That second one is the assertion that matters in practice.
- **Timeframe strings.** Which of `1Min` and `1Day` this plan serves, and what an unsupported
  one returns.
- **Error bodies**, captured verbatim for every failure this task can reach: bad key, malformed
  range, range in the future, range before history depth, and the 429. Task 2.7.5 maps these,
  and it should be mapping against recorded bytes rather than against a memory of a screen.

## The two open decisions this task settles

### Open decision 1 — which timeframes to request and hold

The tension is stated in the story: daily bars serve a multi-month chart cheaply, minute bars
serve intraday and are what Epic 5's five-minute returns and Epic 13's replay need.
`PROVIDER.md` §9.4 has already reduced the vocabulary to **`1m` and `1d`, with aggregation
deliberately not expressible**, so this decision is not "which of six" — it is whether both
are fetched now and at what depth.

Decide against the arithmetic rather than the intuition: `UNIVERSE.md` §10 has 101 securities
at ~9.9M minute bars a year and 1.2 GB, against ~25k daily bars a year for the whole universe.
**Daily is free by comparison and minute is the whole cost.**

### Open decision 2 — how far back

This drives storage, backfill runtime, and **whether Epic 5's return distributions have enough
observations to mean anything**. §11 computes percentiles over ~60 trading days, so that is the
floor rather than the target; state what the target buys. Note the two depths can differ —
years of daily and months of minute is a legitimate answer and probably the right one.

Both decisions **size Story 2.8** and are recorded there as well as here, because that story
plans a backfill against them.

## Work

- The cap, first, before anything else. Then `UNIVERSE.md` §10's branch
- Every measurement above, with the date, the request that produced it and the response
- `ALPACA.md`, written for Task 2.7.7, Story 2.8 and Epic 3
- Settle open decisions 1 and 2 with the argument, not just the answer, and record them in
  Story 2.8's file as well
- **Amend `CALENDAR.md` if measurement 2.1 says `minuteBars` is not a bar count.** That
  document currently derives 390 and 210 from session bounds and nothing in it says those are
  minutes rather than expected bars, because until today nobody could tell
- **The key never touches a file.** It lives in the shell's environment for the length of this
  task. No `.env`, no scratch script with a literal, no fixture containing an `Authorization`
  or `APCA-` header value. Task 2.7.2 is what gives it a home
- Leave the tree byte-identical outside `planning/`

## Done when

- The 30-channel question is answered by measurement, the payload is recorded verbatim, and
  `UNIVERSE.md` §10's trigger has been taken one way or the other
- `ALPACA.md` exists and every figure in it carries its date and the request that produced it
- `PROVIDER.md` §6.4's three numbers are answered, and the one that contradicts an assumption
  has been written back into the document that made it
- Open decisions 1 and 2 are settled, with the losing option named, in this story's file and in
  Story 2.8's
- Recorded error bodies exist for Task 2.7.5 to map against
- `git status` is clean outside `planning/` and `pnpm verify` is exit 0

## Notes

The temptation is to skip straight to writing the client, because the client is obviously the
point of the story and the documentation obviously says what the plan is. **The reason not to
is that this repository has now been caught four separate times by a documented figure that was
not the measured one** — the pnpm store count, the badge's own branch semantics, the image
size, the `navigationFallback` behaviour that differs between two hosts. A vendor's marketing
page is a weaker source than any of those, and two of its own pages disagree by two orders of
magnitude about the one number a whole story is parked on.

The other temptation is to treat the cap measurement as Epic 3's and do it later. It is not
later: Story 2.8 backfills bars against `security_id`, and after that, re-sizing the universe
costs a re-backfill rather than a file edit. `UNIVERSE.md` §10 names that as the real deadline
and it is worth more than the trigger itself.

---

## What was found (2026-09-07)

The record is [`ALPACA.md`](ALPACA.md); this is the index. **22 JSON captures** were taken,
each carrying the request URL, the instant, the status, every response header and the body.

| Measurement            | Documented                | **Measured**                        | Lands in           |
| ---------------------- | ------------------------- | ----------------------------------- | ------------------ |
| Minute-bar channel cap | "30 symbols" / "no limit" | **None reachable — 5,000 accepted** | `UNIVERSE.md` §10  |
| Trade channel cap      | 30                        | **30** — `code=405` at 60           | Epic 3             |
| Historical feed        | IEX                       | **SIP**                             | Open — see below   |
| Live stream feed       | IEX                       | **IEX** — SIP is `409`              | Epic 3             |
| Request rate           | 200/min                   | **201, then `429`**                 | Task 2.7.7         |
| Multi-symbol cost      | —                         | **1 per REQUEST**                   | Story 2.8          |
| History depth          | since 2016                | **2016 (SIP) / ~2022 (IEX)**        | Story 2.8          |
| `end` parameter        | —                         | **INCLUSIVE**                       | Task 2.7.3         |
| Bar `t`                | —                         | **START of interval**               | Task 2.7.3         |
| 390 bars/session?      | "probably not"            | **Yes, exactly**                    | `CALENDAR.md` §2.2 |

### Documents amended

- **`UNIVERSE.md` §10** — the parked trigger fired: bars exempt, sizing unblocked, and the
  IEX quality ceiling narrowed to live data only
- **`PROVIDER.md` §6.5** — the three owed numbers answered, first prediction recorded as wrong
- **`CALENDAR.md` §2.2** — `minuteBars` confirmed as a bar count, plus two request traps
- **`STORY.md`** — open decisions 1 and 2 settled
- **Story 2.8's `STORY.md`** — the four things that change its design

### Three findings nobody asked for, and one open question

**The feed is SIP, not IEX, for historical bars** (`ALPACA.md` §2). The plan is asymmetric:
historical is the consolidated tape, the live stream is IEX only. **This is not settled here
and needs a person** — `PRODUCT_SPEC.md` §7.1 and invariant 6 require the UI to label the feed,
and **Task 2.7.4 is about to put the word `IEX` on the deployed page.** No open decision in
this story covers it.

**`end` is inclusive where our `TimeRange` is half-open** — worth one bar at every seam of
Story 2.8's tiled backfill, and caught only because a 390-minute session returned 391.

**`unknown-symbol` is not producible from the bars endpoint.** An unknown symbol returns `200`
with an empty `bars` object, byte-identical to a valid symbol with no data — and
`PROVIDER.md` §8.2 makes an empty answer a success. Task 2.7.5 has a member it cannot produce
here, which strengthens the case for Task 2.7.8's assets endpoint.

### What was not measured

The **15-minute withheld window** — the probe ran at 06:59 UTC on Labor Day with the market
shut, so its `0 bars` means nothing. **Re-take during a session.** Also unsettled: whether the
rate limit is per key or per endpoint.

---

## For the stakeholders — what this actually was, in plain terms

### The short version

**We spent this task asking a supplier what we are actually allowed to do, instead of trusting
their sales page — and found four things that were wrong.** One of them would have capped the
product at a fraction of its intended size. Another would have put a false statement on a
public web page. No product code was written, deliberately.

### The question that was blocking us

MarketPulse watches a set of companies and flags unusual trading. A natural question is: **how
many companies can we watch?** We had been planning for about 100, with an ambition of 500 to
1,500 — but nobody knew if our data supplier would allow it.

Their own website said two contradictory things. One page said the free plan is **"limited to
30 symbols"**. Another said the 30 limit applies only to certain kinds of data, and the kind
**we actually use has no limit at all**. These are not small differences — 30 versus unlimited
is the gap between "this product cannot exist as designed" and "build whatever you like".

Everything we need — is this price move unusual, is the whole sector moving, how busy is
trading — is calculated from one-minute summaries of trading activity. If those were capped at
30 companies, our existing list of 101 was **already illegal** and we would have been facing a
$99/month bill just to continue.

### So we asked

We connected and requested 60 companies' worth of minute data. Accepted. Then 101. Then 500.
Then 1,500. Then **5,000** — and it was accepted in under a second.

Then we did the thing that turns a hopeful result into a reliable one: **we asked for something
we expected to be refused.** We requested 60 companies of a different data type, and it was
rejected immediately — _"symbol limit exceeded"_. That refusal is what makes the first result
trustworthy. Without it we could not tell "the supplier allows this" from "the supplier
silently ignored part of our request", and those look identical from the outside.

**The universe size is unblocked.** The limit on how many companies we track is now our own
ability to curate a good list, not the supplier's.

### The finding nobody was looking for

Our whole product design assumed we would receive data from **IEX**, a single US exchange
handling roughly 4% of trading. We had planned to label this prominently, because implying we
see the whole market when we see 4% would be dishonest.

**We are not on IEX for historical data. We are on the full consolidated market feed** — all
US exchanges — for anything more than 15 minutes old. Only the _live_ stream is IEX.

This matters twice over. **The quality is far better than we budgeted for.** For the
less-actively-traded companies, IEX gave us data for as little as **43%** of trading minutes,
with gaps up to 15 minutes. The feed we are actually on gives **99.7%**, with the worst gap
being 2 minutes. Several of our planned concerns about unreliable numbers largely evaporate.

**But we may be about to tell users something untrue.** The very next task puts a "Market feed:
IEX" label on the live website. For stored historical data that label is **wrong**. This needs
a decision from a person, and I have deliberately not made it — it is a question about what we
tell users, not a technical detail. It is flagged prominently in the record, with the next task
named as the deadline.

### Two bugs caught before they were written

**Off-by-one.** We asked for one trading day and got 391 minutes back, when a trading day has 390. Rather than shrug at one extra row, we chased it: the supplier treats the end of a
requested time window as _included_, where our system treats it as _excluded_. Left alone, every
single day we ever download would have carried one duplicate row — and that duplicate would be
a minute from _after_ the closing bell, silently polluting the data. Millions of rows,
plausible-looking, subtly wrong.

**Silent scope creep.** Asking for "a date" rather than "this trading session" quietly includes
before-hours and after-hours trading. On the day we tested, that was 217 rows where the trading
day has 210. Our calculations assume 390 minutes in a day; feeding them 400-odd rows would have
made every "unusual activity" score quietly incorrect.

Neither would have crashed anything. Both would have produced numbers that looked entirely
reasonable and were wrong — the most expensive kind of defect, and the hardest to find later.

### A decision, and why it is smaller than it looks

We settled how much history to download. **Daily summaries: everything available, back to
2016** — about 30 megabytes for all 101 companies, effectively free. **Minute-by-minute data:
one year** — 1.2 GB, about 5% of our storage.

One year rather than two, and the reason is worth stating: **depth and company count multiply.**
One year of minute data still fits if we later expand to 1,500 companies; two years does not.
Since we have _just_ unblocked that expansion, committing to two years now would quietly
cancel the decision we just enabled. Adding more history later is easy; removing companies to
make room is not.

### An honest note about the process

At one point our own measurement script printed a confident conclusion that was **wrong** — it
reported that trading days do not contain the expected number of data points, which would have
sent us amending several documents. It was caught because the number it complained about was
_larger_ than the maximum possible, which no amount of missing data can explain. The real cause
was the off-by-one above.

It is recorded in the write-up, because the lesson generalises: **a conclusion generated
automatically is not a measurement either.** The whole point of this task was refusing to trust
claims without checking them, and that has to include our own.

### Where this leaves the product

**No user-visible change, and that was the plan** — this task was explicitly to measure and
ship nothing. Not one line of application code changed.

What it produced is **permission to build the next eight tasks correctly**: real limits instead
of assumptions, real error messages to handle, two bugs prevented, and a supplier relationship
that is now measured rather than hoped for. The next task puts the credential in place; the one
after fetches real prices; and **the visible payoff is Story 2.12, where actual price charts
appear on screen.**

One thing to be clear about, because a "Market feed" label with no chart behind it invites the
opposite reading: **users still cannot see a price.** This task fetched real market data into a
terminal and deliberately stored none of it. Story 2.8 stores, Story 2.9 serves, Story 2.12
draws.
