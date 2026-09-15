# Story 3.1 — Live-Data Decisions & the Streaming Spike

**Status:** Not started
**Epic:** [Epic 3 — Live Market Data](../EPIC.md)
**Depends on:** Epic 2 (2.6, 2.7, 2.9, 2.10)
**Epic scope covered:** the decisions under every other story in this epic, and the half of _Alpaca WebSocket ingestion_ that is a measurement rather than a client

## Description

**This story ships no socket, no route and no pixel.** Its whole output is that
the ten stories after it do not each answer the same eight questions
differently, and that the answers are taken against a **measured** vendor rather
than against a documented one.

The precedent is exact and it has now worked three times: Task 2.6.1 settled the
provider seam before any provider existed, Task 2.9.1 settled the wire before
any route served it, and Task 2.10.1 settled how the frontend holds state before
any hook held any. Each produced a subject document that later tasks point at
instead of re-deciding, and in all three cases the document is what stopped four
tasks disagreeing in four places.

Its output is **`LIVE-DATA.md`** in this directory, which becomes the subject
document for _how a live observation reaches a screen_ and the file the rest of
this epic cites.

## What the user can see when this story lands

**Nothing.** Not a pixel, deliberately.

What it unblocks is every story after it, and **the payoff is Story 3.3**, which
is three stories away rather than seven — the shape Story 2.4 had to be inserted
to produce is built into this epic's sequence from the start.

What the user still cannot do: everything this epic promises. The application is
a historical explorer on the day this story closes and on the day it ends.

## Why it sits here in the sequence

Because six of its eight questions are answered implicitly by whichever story
touches them first, and five of those answers would be wrong. _What a live
observation is_ decides the schema (3.8), the socket (3.2), the state model
(3.5) and what a chart may draw (3.7); _which transport reaches the browser_
decides whether the frontend gains a second protocol or a second use of the
first; and _what the browser is subscribed to_ is the difference between a
payload of one security and a payload of 518.

It also holds the one measurement nobody else can take cheaply: **this
repository has never consumed a bar from the socket.** `ALPACA.md` §10 is
explicit that the WebSocket was measured for its subscription cap and for
nothing else — no message was read, no reconnection was touched, and every
figure in it is from the historical HTTP API. Every later story in this epic is
sized against numbers that do not exist yet.

## Scope

- **The spike.** A throwaway harness outside the tree, in the shape `ALPACA.md`
  §11 records and Task 1.13.1 established: run it, write the findings into
  `LIVE-DATA.md`, delete it, leave the tree byte-identical outside `planning/`.
  **The credential never touches a file in the repository**, and every capture
  is swept for its bytes before being written. What it must answer:
  - **What actually arrives on `wss://stream.data.alpaca.markets/v2/iex`**, per
    message type, during a live session and outside one. The `b` (minute bar)
    channel is the candidate; `t` (trade) and `q` (quote) are capped at 30
    symbols and are almost certainly out of scope, but the message _shapes_ are
    worth recording once.
  - **The rate.** Messages per second for 518 symbols at the open, at midday and
    at the close, and the p50/p95 gap between a bar's `t` and its arrival. This
    is the input to `PRODUCT_SPEC.md` §28's _event → application state <250 ms
    p95_, and the target is meaningless until the provider's own share of it is
    known — the target excludes upstream latency and nothing here has ever
    measured where upstream ends.
  - **What a minute bar's `t` means on the stream**, checked against
    `ALPACA.md` §5.3's finding for the HTTP API (it marks the **start**). A
    stream that disagreed would put every live bar a minute out, silently.
  - **What happens when a session is not running** — pre-market, after hours, a
    weekend, a holiday. `CALENDAR.md` owns _is the market open_; this is _does
    the socket say anything_, and the two are not the same question.
  - **What the socket does when it is unhappy**: a duplicate connection (the
    free plan allows **one**), a bad credential, an idle period, a server-side
    close. Verbatim frames and codes, the way `ALPACA.md` §9 recorded the HTTP
    error bodies — a mapping written from documentation got three things wrong
    last time.
  - **Whether IEX bars arrive for thin names at all.** `ALPACA.md` §5.2 measured
    **82.8%** median minute coverage on IEX against **99.7%** on SIP, worst case
    **43.1%**. That was measured on _stored_ IEX history; the live stream is the
    case the figure was always about.
- **Decision 1 — what a live observation is.** Minute bars, trades, or both.
  Bars are exempt from the 30-symbol cap and trades are not, which very likely
  settles it, but the consequence is a product one: a minute bar means a price
  on screen can be **up to a minute old and still live**, and that shapes every
  sentence this epic writes about staleness.
- **Decision 2 — the browser transport.** `PRODUCT_SPEC.md` §31 says WebSocket
  for market data and SSE for agent events, and says the two stay separate. What
  is open is the message protocol: snapshot-then-deltas or deltas only, how a
  browser says which symbols it wants, and whether the server coalesces.
- **Decision 3 — what the browser is subscribed to.** The whole universe, the
  visible rows, or one security. 518 securities × one bar a minute is a
  different payload from one security, and the answer decides whether Story 3.6
  is affordable at all.
- **Decision 4 — where the current market state lives**, and how much of it.
  The last bar per security is a small map; _today's bars_ per security is
  518 × 390 and is a different object with a different cost. Story 3.7's chart
  needs the second unless the store provides it, which is Story 3.9.
- **Decision 5 — the staleness vocabulary, in numbers.** `FeedStatus` already
  ships `live | stale | disconnected` and says nothing about when one becomes
  the next. A threshold for a feed whose quietest legitimate interval is a
  minute, on a venue where an absent bar is _ordinary_, is a real decision and
  it must not be taken three times.
- **Decision 6 — what the live feed is called on screen**, in a sentence rather
  than an acronym. §7.1 is explicit: `Market feed: IEX` with a sentence saying
  what a single venue is, never Epic 2's `All US exchanges`.
- **Decision 7 — whether the frontend gains a store.** `FRONTEND-STATE.md` §1's
  three reversal triggers are conditions, and this epic is the first plausible
  firing of the first one. Answer it here with the condition in hand rather than
  in whichever story first finds prop-drilling annoying — and note that annoying
  prop-drilling is explicitly **not** a trigger.
- **Decision 8 — the socket's relationship to the process.** One replica, one
  socket, `minReplicas: 1` as a required setting (ADR 0011). What is open is
  whether the socket is held open outside market hours, which is a **cost**
  question as much as an engineering one — see Story 3.11 and the paragraph
  below.

## Out of scope, and who owns it

- The client itself — Story 3.2
- Anything on screen — Story 3.3 onwards
- The motion vocabulary — Story 3.4, against a real moving number, which this
  story does not produce
- The schema change — Story 3.8
- The cost measurement — Story 3.11. This story **estimates** the envelope from
  the measured message rate; only a month of billing reads it

## Open decisions — settle with the user

The eight above are the story's work rather than its blockers, and six of them
are settled by measurement. **Three need a person**, and they should be put
together rather than one at a time:

1. **Whether the socket is held open outside market hours.** The honest default
   is yes — a feed that is up is a feed that can say so — and it is the one that
   costs money for nothing overnight. Related: whether `LIVE` in the chrome
   means _the socket is up_ or _data is arriving_, which are different claims
   at 3am and identical at 10:42.
2. **What a browser subscribes to**, because it trades payload against the
   product's own promise. `PRODUCT_SPEC.md` §9's landing page shows the whole
   market moving at once and Epic 4 builds it, so an answer that only works for
   one security is an answer Epic 4 has to re-take.
3. **The budget.** Epic 1's `$20` alert thresholds sit _above_ the active-rate
   total this epic produces, so the alert that matters would not fire. That is a
   number a person owns.

## Acceptance criteria

1. `LIVE-DATA.md` exists and carries all eight decisions, each with its
   alternatives, its measurement where it has one, and a **reversal trigger
   written as a condition** rather than as a story number
2. Every figure in it is dated, and names the instrument that produced it, so it
   can be re-taken rather than cited
3. The spike's captures are recorded — request, instant, frames, codes — and the
   harness is gone
4. No credential appears anywhere in the repository, checked rather than assumed
5. The three decisions above are put to a person and their answers recorded with
   the reasoning, not just the outcome
6. `pnpm verify` passes — which for a story that changes no code means the
   `links` and `invariants` steps over the new document

## What this story hands forward

The file the next ten stories cite instead of re-deciding, and the first real
numbers this product has about its own live feed.

## Tasks

**Nine tasks, in three groups, and the grouping is about _windows_ rather than
about layers.** 3.1.1–3.1.2 need nothing but a keyboard; 3.1.3–3.1.5 each need a
particular state of the market and cannot be reordered to suit convenience;
3.1.6–3.1.9 are decisions that consume what those captures produced.

**The instrument is built before any window opens (3.1.2)**, because each of the
three capture tasks has a clock running against it and none of them should spend
its window debugging a recorder.

**The shut-market capture comes first (3.1.3)**, which is Epic 2's lesson
inverted. Task 2.7.1 ran on Labor Day and lost a measurement to a closed market;
what it got wrong was not the day but the question. Everything a shut market can
answer is taken while it is shut, so the live session (3.1.4) is spent only on
what needs a live session.

**Amended 2026-09-15, after Task 3.1.2.** That argument is unchanged and still
right — everything a shut market can answer is still taken while it is shut.
What was wrong was reading it as a **linear dependency**: 3.1.3 owns an
overnight hold and a weekend, and a weekend is five days from this story's
start. A strict `3.1.4 depends on 3.1.3` parks the story's single most
consequential measurement behind a window that has not opened yet, and 3.1.5
behind that. So **3.1.3's _short_ windows come first where the calendar allows,
and its long holds do not block 3.1.4.** The instrument, which is the only thing
3.1.4 genuinely needs from upstream, exists as of 3.1.2. The grouping is about
windows; a window nobody can open yet is not an ordering.

**The three human decisions are asked once, together, and late (3.1.6)** —
because two of them are unanswerable without the measured rate. A budget is a
number about a bill and a bill is a number about bytes per second.

**The eight decisions are split three ways by who consumes them**, not by
subject: 3.1.7 holds the three that are one piece of arithmetic seen from three
places, 3.1.8 holds the three **Story 3.3 needs to exist**, and 3.1.9 holds the
two that are about this process and this tree, beside the close.

| Task                                                                                  | What it does                                                                                      | Visible? |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------- |
| [3.1.1](TASK-01-the-subject-document-and-the-eight-questions.md)                      | `LIVE-DATA.md` created: what is inherited, the eight questions open, the figures that don't exist | No       |
| [3.1.2](TASK-02-the-harness-the-credential-and-the-capture-format.md)                 | The harness, the credential boundary, the capture format, and the handshake verbatim              | No       |
| [3.1.3](TASK-03-what-the-socket-says-when-the-market-is-shut.md)                      | Pre-market, after hours, overnight, a weekend — and the longest legitimate silence                | No       |
| [3.1.4](TASK-04-what-arrives-during-a-session-and-how-fast.md)                        | 518 symbols live: message shapes, the rate, the arrival gap, what `t` marks, real IEX coverage    | No       |
| [3.1.5](TASK-05-what-the-socket-does-when-it-is-unhappy.md)                           | Duplicate connection, bad credential, idle, server close, reconnect — frames and codes verbatim   | No       |
| [3.1.6](TASK-06-the-three-questions-for-a-person-and-the-cost-envelope.md)            | The cost envelope from the measured rate, and the three questions put to a person together        | No       |
| [3.1.7](TASK-07-the-observation-the-subscription-and-the-state-that-is-held.md)       | Decisions 1, 3, 4 — what an observation is, what is subscribed, what the backend holds            | No       |
| [3.1.8](TASK-08-the-browser-protocol-the-staleness-numbers-and-the-name-on-screen.md) | Decisions 2, 5, 6 — the browser protocol, the staleness numbers, the words on screen              | No       |
| [3.1.9](TASK-09-the-store-the-process-the-harness-is-gone-and-the-document-lands.md)  | Decisions 7, 8 — the store and the process — then the harness gone, the sweep, the close          | No       |

**Every row says No, and that is the story rather than a disappointment.** The
epic's sequence is built so that the wait is short: `LIVE` reaches the chrome in
Story 3.3 and the first price moves in Story 3.4, which is two and three stories
away rather than seven. What this story buys is that those two stories are
**implementations rather than arguments**.

**Two tasks are load-bearing for the UI in particular.** Task 3.1.8 settles the
words, the four-cell honest-label grid and the staleness numbers that Story 3.3
puts on every route in the product; and Task 3.1.9 checks the **design canvas is
reachable** — EPIC.md records that it was not, from the session that planned this
epic, and Story 3.4 owes a sync before it designs anything. Answering that here
costs minutes and is the difference between Story 3.4 designing forwards and
discovering a broken chain on the day.

**The subject document is `LIVE-DATA.md`** in this directory, created by 3.1.1
and finished by 3.1.9. It is not a section of `PROVIDER.md` — that document is
the historical provider seam and its outcome taxonomy — and it is not a section
of `MARKET-DATA-API.md`, which is the HTTP wire. This one is **how a live
observation reaches a screen**, which every story in this epic and Epic 4's
overview both read.
