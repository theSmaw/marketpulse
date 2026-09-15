# Task 3.1.1 — Create the subject document, write the eight questions down, and record what may not be re-taken

**Status:** Done (2026-09-15)
**Story:** [3.1 Live-Data Decisions & the Streaming Spike](STORY.md)
**Depends on:** Epic 2 (complete, 2026-09-15)

## Objective

Create **`LIVE-DATA.md`** in this directory — the subject document for _how a
live observation reaches a screen_, and the file the ten stories after this one
cite instead of re-deciding — and put into it two things and no third: the
**constraints this epic inherits and must not re-take**, and the **eight
questions stated as open**, each with its alternatives and with no answer yet.

Tasks 2.6.1, 2.9.1, 2.10.1, 2.11.1, 2.12.1, 2.13.1 and 2.14.1 are the precedent
and it has worked seven times. What is different here is that **six of the eight
answers are measurements this repository does not have**, so this task
deliberately writes the questions without answering them. A question written
down before the instrument runs is a question the instrument gets pointed at; a
question answered from documentation is how three error mappings were wrong last
time (`ALPACA.md` §9b).

## What the user can see when this lands

**Nothing.** No route, no socket, no pixel — and nothing in this whole story is
visible, which is stated once here and honoured in every task below. The payoff
is **Story 3.3**, three stories away, where `LIVE` reaches the chrome. Say
"nothing visible" plainly when reporting it and name Story 3.3.

What the user still cannot do: everything this epic promises.

## What is already decided and must not be re-taken

Read these before writing a line. Each would otherwise be settled here
differently, and each is argued somewhere else.

- **The stream seam's shape.** `PROVIDER.md` §12: `MarketDataStream` is a
  **sibling** interface in `apps/backend/src`, beside `MarketDataProvider`
  rather than a `subscribe()` method on it, sharing every domain type in
  `packages/shared`. Story 3.2 implements it. **This epic adds no second
  configuration variable** — `MARKET_DATA_PROVIDER`'s id vocabulary is shared.
- **WebSocket for market data, SSE for agent events, and the two stay separate**
  — `PRODUCT_SPEC.md` §31. What is open here is the **message protocol** on the
  browser socket, not the choice of protocol.
- **The free Alpaca plan is asymmetric and it is measured, not read off a page.**
  Stored historical bars are consolidated **SIP**; the live stream is **IEX
  only** — `wss://.../v2/sip` is refused with `409 insufficient subscription`
  (`ALPACA.md` §2). Invariant 6's fence stands on **the sentence under the
  acronym**, not on the acronym.
- **Minute-bar channels are exempt from the 30-symbol cap** that applies to
  trades and quotes: 1,500 symbols accepted in 305 ms, 5,000 in 867 ms
  (`ALPACA.md` §1). Capacity upstream is not this epic's problem, and Story 3.5
  already cites those figures.
- **A minute bar's `t` marks the START of the interval** on the **HTTP API**
  (`ALPACA.md` §5.3). That is a finding about a different instrument. It is this
  story's job to check it on the socket, not to assume it.
- **`minReplicas: 1` is a required setting, not a tuning knob** (ADR 0011). The
  Alpaca socket is **outbound**, so no ingress timeout governs it and the only
  thing that can kill it is the replica ceasing to exist.
- **`packages/shared` may not read the wall clock** — four `no-restricted-syntax`
  rules hold the conversion boundary and the clock seam (ADR 0017, decisions 5
  and 7). A live-data module that wants _now_ takes it as an argument or lives
  in an app package.
- **The market clock is Story 2.5's and is done.** A clock is a fact about the
  trading calendar, not about the data feed. Anything this epic puts in the
  header is a **new fact beside it**, never a rewiring of it.
- **The connection state comes back BESIDE provenance, not instead of it.**
  _Which venues are in these numbers_ and _is data arriving right now_ are two
  facts that fail independently — Task 1.12.4's two-indicators argument.
- **`useMarketClock` is called from `AppHeader` rather than `App`, and the
  counterfactual is measured**: lifting it to `App` re-renders the whole landing
  route **40 times in 20 s** against **0**. Any live hook this epic designs
  faces that choice at a much higher rate.

## Work

Write `LIVE-DATA.md` with three sections and stop.

**§1 — What this epic inherits.** The list above, in the document's own words,
each line naming where its argument lives. This is the section Stories 3.2–3.11
read first, so it is written for a reader who has not read Epic 2.

**§2 — The eight questions, open.** One subsection each, in the story's order,
and each carrying: what the question actually is; the alternatives, stated so
that a reader can tell them apart; **what would settle it** — a measurement with
the instrument named, or a person; and which stories consume the answer. No
answer, and no leaning dressed as an answer. Where a preference is obvious, say
so and say what would have to be true to overturn it.

The eight, restated so the later tasks have a fixed target:

1. **What a live observation is** — minute bars, trades, or both. Note the
   product consequence up front, because it is not a mechanism: a minute bar
   means a price on screen can be **up to a minute old and still live**, and
   every staleness sentence in this epic inherits that.
2. **The browser transport's message protocol** — snapshot-then-deltas or deltas
   only; how a browser says which symbols it wants; whether the server coalesces.
3. **What the browser is subscribed to** — the whole universe, the visible rows,
   or one security. 518 × one bar a minute is a different payload from one.
4. **Where the current market state lives, and how much of it** — the last bar
   per security is a small map; _today's bars_ per security is 518 × 390 and is
   a different object with a different cost.
5. **The staleness vocabulary, in numbers** — `FeedStatus` ships
   `live | stale | disconnected` and says nothing about when one becomes the
   next.
6. **What the live feed is called on screen**, in a sentence rather than an
   acronym.
7. **Whether the frontend gains a store** — `FRONTEND-STATE.md` §1's three
   reversal triggers are conditions, and this epic is the first plausible firing
   of the first one.
8. **The socket's relationship to the process** — and specifically whether it is
   held open outside market hours, which is a cost question as much as an
   engineering one.

**§3 — The register of figures that do not exist.** The honest starting
position, enumerated rather than characterised, because "we have measured the
WebSocket" is the sentence this repository is one careless citation away from.
`ALPACA.md` §10 is explicit: **no bar has ever been consumed from the socket**,
no reconnection behaviour was touched, and every figure in that document is from
the historical HTTP API. List what Stories 3.2–3.11 are currently sized against
that has never been measured, so Tasks 3.1.3 to 3.1.5 have a worklist rather
than a search.

## Done when

- `LIVE-DATA.md` exists in this directory with §1, §2 and §3 as above.
- Every one of the eight questions carries alternatives and a named instrument
  or a named person, and **none of them carries an answer**.
- §3 lists every figure a later story is sized against and nobody has taken.
- `pnpm links` passes; `pnpm verify` passes. No code changed.

## Notes

The temptation is to answer three of these while writing them down — decisions 1
and 6 in particular look settled before the socket is opened. Write the argument
and leave the verdict to the task that has the capture, because the measurement
sometimes moves the product question rather than confirming it: Task 2.7.1's cap
test did exactly that and re-sized the universe from 101 to 518.

---

## What was done (2026-09-15)

[`LIVE-DATA.md`](LIVE-DATA.md) exists in this directory with the three sections
the objective asked for and nothing else.

**§1 — What this epic inherits.** Twelve entries, each in the document's own
words and each naming where its argument lives: the sibling stream seam and the
no-second-configuration-variable rule (`PROVIDER.md` §12); WebSocket/SSE and
what that does _not_ settle (`PRODUCT_SPEC.md` §31); the asymmetric plan and
invariant 6's fence standing on the sentence rather than the acronym
(`ALPACA.md` §2); the minute-bar cap exemption with its control (`ALPACA.md`
§1); `t` marking the start **on the HTTP API only** (`ALPACA.md` §5.3);
`minReplicas: 1` and the outbound socket (ADR 0011); the `packages/shared`
clock ban (ADR 0017); the market clock being a calendar fact rather than a feed
fact; the two-indicators argument; the `useMarketClock` counterfactual; the
three sentences Epic 2 handed forward; and the motion deferral.

**Two things were added to §1 that the task's own list did not carry**, both
because they are inherited facts a later story would otherwise rediscover:

- **The free plan allows one concurrent connection**, which is a constraint on
  the _account_. From Story 3.2 onward a developer running `pnpm dev` with real
  credentials and the deployed replica contend for the same socket. Task 3.1.5
  is asked to capture what the loser is told (register line 17).
- **The strip's own layout constraint** — `.clock` is `align-items: flex-end`
  as the end of the strip, so a region appended after it takes that edge away.
  Story 3.3 adds a region to that strip.

**§2 — The eight questions, open.** One subsection each, in the story's order.
Every one carries the question, the alternatives stated so a reader can tell
them apart, what would settle it with the instrument or the person named, and
which stories consume it. **None carries an answer.** Four carry a stated
leaning with the condition that would overturn it, per the objective: §2.1
(bars, overturned by real live coverage looking broken rather than quiet), §2.5
(the session scope is not optional), §2.6 (the words already ship; the grid does
not), §2.8 (always-open, overturned by a measured idle rate or a person).

**§3 — The register of figures that do not exist.** Twenty-four numbered lines
in six tables, each naming what is sized against it and which task takes it.
Lines 1–20 are the spike's worklist; 21–24 are listed separately because they
are _not_ vendor figures and the spike cannot take them — they are named so
their absence is not mistaken for a measurement.

### The three things this task deliberately resisted

1. **Answering decision 1.** The cap exemption makes bars obviously cheaper and
   the note warns about exactly this. What §2.1 records instead is the leaning
   _plus_ the condition that would overturn it — `ALPACA.md` §5.2's 43.1% worst
   case was measured on **stored** IEX history, and the live stream is the case
   that figure was always about. If Task 3.1.4 finds a bar-only feed reads as
   broken rather than quiet, the 30-symbol trade channel comes back into scope
   for the focused case.
2. **Answering decision 6.** The words already ship in
   `MARKET_FEED_DESCRIPTIONS` and `pnpm invariants` holds them to one home — so
   the _vocabulary_ is closed and it would have been easy to write the whole
   question closed with it. What is actually open is the **four-cell grid**
   (connected to IEX, disconnected from IEX, stored SIP with no live tail, and
   a series that is both) and whether `LIVE` claims _the socket is up_ or _data
   is arriving_. Task 2.14.7's finding is that a state is correct alone and
   wrong beside its neighbour, which is why the grid rather than the label is
   the open part.
3. **Answering decision 7 from the shape of the epic.** §2.7 restates
   `FRONTEND-STATE.md` §1's three conditions, restates what is explicitly _not_
   a trigger, and binds Task 3.1.9 to **name which condition fired or state
   that none did** — because a socket is a single writer by construction, and
   "two surfaces read it" is prop-drilling rather than a store.

### One figure the register singles out

**Line 8 — the p50/p95 gap between a bar's `t` and its arrival.**
`PRODUCT_SPEC.md` §28's _event → application state <250 ms p95_ is stated as
excluding provider latency, and **nothing in this repository knows where the
provider ends.** Until that gap is measured, any claim that the target is met is
a claim about a denominator nobody has. It is called out in prose under the
table rather than left as a row.

### Checks

- `pnpm links` — 332 documents, 1,177 cross-file links, 39 anchor links, 0
  broken. **No `#fragment` links were written into the new document on purpose**
  — the checker resolves anchors against headings, and a `§N` citation in prose
  cannot rot into a green pass the way a stale anchor can.
- `pnpm verify` — green end to end. `12 invariants hold`; 1,886 tests across the
  three suites plus 14 process tests. **No code changed**, and the invariant
  checks scope to `apps/*/src` and `packages/shared/src`, so a planning document
  cannot trip a one-home check however many shipped sentences it quotes.

### What the user can see

**Nothing**, exactly as this task's own heading says. No route, no socket, no
pixel. The payoff is **Story 3.3**, three stories away, where `LIVE` reaches the
chrome.

---

## For the stakeholders — what this actually was, in plain words

**Short version: nobody can see anything yet, and that is the plan. This was
the day we wrote down the questions before we started guessing at the answers.**

### Where the product is

MarketPulse today is a **historical explorer**. You can search 518 US companies,
open one, and look at real price and volume charts built from about 48 million
minute-by-minute records, over windows from one day to one year — and the screen
tells you honestly where those numbers came from and how far they reach. That
all shipped with Epic 2.

What it cannot do is show you a market that is **moving**. Every number on every
screen is from the past. Epic 3 is the epic that fixes that, and it is a big one
— eleven chunks of work that end with prices ticking on their own, a chart that
reaches the current minute, and an application that tells you the truth when the
data stops arriving instead of quietly showing you stale numbers.

### What this particular piece of work was

Before any of that gets built, there are **eight decisions** that every one of
those eleven chunks depends on. Things like: what counts as a "live" price —
every individual trade, or a summary once a minute? Does your browser receive
the whole market or just the company you are looking at? How long can the data
stop arriving before we stop calling it live?

The problem with decisions like these is that if you don't take them
deliberately, they get taken **by accident** — by whichever piece of work
happens to touch them first, in whatever way was convenient that afternoon. And
then the next four pieces of work each answer the same question slightly
differently, and you end up with a product where the price on one screen means
something subtly different from the price on another. That is the kind of defect
that is cheap to prevent and horribly expensive to unpick later.

So this task created a single document — `LIVE-DATA.md` — that is now the one
place those eight questions live. Every future piece of work in this epic reads
it instead of re-deciding.

### The unusual bit: the document answers nothing

This is the decision worth explaining, because on the face of it "we wrote down
eight questions and answered none of them" doesn't sound like progress.

**Six of the eight can only be answered by pointing an instrument at Alpaca's
live data feed, and we have never done that.** Not once. We have tested their
historical data service extensively — that is where the 48 million records came
from — but the live streaming connection has been opened exactly once, for
thirty seconds, to check one specific thing, and no actual market data was ever
read from it.

We could answer the questions from Alpaca's documentation. We have tried that
before, on the historical service, and **the documentation was wrong about three
separate things** — including one case where the documentation said we would get
an empty result and we actually got an outright refusal. If we had written our
error handling from the docs, three failure paths would have been wrong in
production.

So the document deliberately records the questions, the realistic options for
each, and **what specifically would settle it** — which measurement, taken with
which instrument, or which decision only a person can make. The next few pieces
of work go and take those measurements against the real thing during real market
hours, and the answers get written in with their dates.

There is a precedent for this being the right call. Earlier in the project we
ran a similar measurement expecting it to confirm a limitation, and instead it
**overturned a product decision** — the universe went from 100 companies to 518
on the back of it. A measurement doesn't always confirm what you assumed; it
sometimes changes the question. Writing the verdict before taking the reading
would have thrown that away.

### The other half: an honest list of what we don't know

The document's third section is a numbered list of **24 figures that don't
exist** — things like how many messages a second arrive at market open, how far
behind real time the data is, how often a smaller company actually produces a
price on this feed, and what the connection says at three in the morning. Each
line names which future piece of work is currently being planned against a
number nobody has taken.

This is less dry than it sounds. One of them matters a great deal: we have a
published performance target for how fast a market event reaches your screen,
and it's written as _excluding the delay caused by our data provider_. **We have
never measured our data provider's delay.** Which means that until we do, we
literally cannot tell whether we are meeting our own target — we'd be measuring
against a number we don't have. That is now flagged in writing rather than
discovered in six weeks' time when someone asks.

There is also a genuine cost question sitting in this list. Running a permanently
open connection to a market feed changes how our hosting is billed — the current
estimate moves from roughly $4 a month to roughly $14, and our spend alert is set
at $20, which means **the alert would not fire on the single change most likely
to move the bill**. That is now a question with a named owner rather than a
surprise waiting on an invoice.

### What it unlocks, and when you'll see something

This piece is pure groundwork, but the wait is deliberately short. The epic was
sequenced so that the first visible change lands **three steps from here**, not
seven — a `LIVE` indicator appearing in the header, truthfully, because a real
connection is open. The step after that is the first number in this product's
history that **moves on its own while you watch it**.

What this document buys is that those two steps are **implementations rather
than arguments**. The hard questions will already have been settled, against
measurements rather than assumptions, in one place, once.
