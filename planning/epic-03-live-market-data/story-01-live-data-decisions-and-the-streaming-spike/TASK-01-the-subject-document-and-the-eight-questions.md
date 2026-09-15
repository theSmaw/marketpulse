# Task 3.1.1 — Create the subject document, write the eight questions down, and record what may not be re-taken

**Status:** Not started
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
