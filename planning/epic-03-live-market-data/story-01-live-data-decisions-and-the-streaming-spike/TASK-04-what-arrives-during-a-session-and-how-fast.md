# Task 3.1.4 — What arrives during a live session, how fast, and which end of the minute `t` marks

**Status:** Not started
**Story:** [3.1 Live-Data Decisions & the Streaming Spike](STORY.md)
**Depends on:** 3.1.3

## Objective

The measurement this whole story exists for, and the one that needs a market
session running: **what actually arrives on
`wss://stream.data.alpaca.markets/v2/iex` for 518 symbols, at what rate, how far
behind, and what a minute bar's `t` means.**

Every later story in this epic is currently sized against numbers that do not
exist. This task produces them.

## What the user can see when this lands

**Nothing.** The payoff is Story 3.3, and everything this task measures is
consumed by Decisions 1, 3, 4 and 5 in Tasks 3.1.6–3.1.8.

## What is already decided and must not be re-taken

- **Minute-bar channels are exempt from the 30-symbol cap**: 1,500 symbols
  accepted in 305 ms, 5,000 in 867 ms (`ALPACA.md` §1). Subscribing 518 is not
  in question; what they then **send** is.
- **`t` marks the START of the interval on the HTTP API** (`ALPACA.md` §5.3).
  That is a finding about a different instrument and this task checks it rather
  than inheriting it. **A stream that disagreed would put every live bar a
  minute out, silently** — which is a defect no test in this repository could
  see, because both answers produce a plausible chart.
- **`PRODUCT_SPEC.md` §28: event → application state <250 ms p95, excluding
  upstream-provider latency.** That target is meaningless until the provider's
  own share is known, and **nothing in this repository has ever measured where
  upstream ends**. This task draws that line.
- **IEX coverage is thin and it is measured — on stored history.** 82.8% median,
  43.1% worst case (`ALPACA.md` §5.2). The live stream is the case that figure
  was always about.
- **The universe is 518** — the S&P 500 as published plus eleven sector SPDRs
  and four market proxies. Size against the real figure, never against §6's
  "roughly 100".

## Work

Hold a connection across a full regular session with the whole universe
subscribed, and record:

- **Every message type that arrives**, with a verbatim example of each — `b`,
  `t`, `q`, and every control, status, correction, cancel or subscription frame
  the server emits unprompted. The story's position is that `t` and `q` are
  almost certainly out of scope at 30 symbols, but **the shapes are worth
  recording once**, because Epic 7's analytical tools and Epic 13's replay will
  both ask what a trade looks like and neither wants to reopen a socket to find
  out.
- **The rate, at three points in the session**: the open, midday, and the close.
  Messages per second for 518 symbols, as a distribution rather than an average
  — the open and the close are the cases that size the browser payload and they
  are the ones an average hides. Record bytes per second alongside, because
  Story 3.11's cost envelope needs it and because ADR 0011's idle-vCPU condition
  is **1,000 bytes per second** and this is the measurement that says by how far
  the condition is broken.
- **The p50 and p95 gap between a bar's `t` and its arrival by our clock**, with
  Task 3.1.2's offset applied or declared. This is the provider's share of §28's
  250 ms, and the number every later performance claim in this epic is measured
  against.
- **Which end of the minute `t` marks, with a control.** The check that makes it
  a measurement rather than an assertion: take a symbol's live bars for a window
  and compare them against the **same window fetched from the historical API
  afterwards**, once the 15-minute embargo has passed. Two series of the same
  minutes from two instruments is a control; one series and an argument is not.
- **Whether IEX bars arrive for thin names at all.** Take the coverage across
  the whole universe for the session — how many of 518 produced a bar in a given
  minute, and the per-symbol distribution across the session. Name the worst
  cases. `ALPACA.md` §5.2's 43.1% was `CCI`; whether the live stream agrees is
  the question, and the answer decides whether Story 3.6's table has 518 moving
  numbers or 300 moving and 218 sitting still — **which is a product problem
  with a product answer, not a bug**.
- **What a bar for a symbol with no trades looks like** — absent, zero-volume,
  or repeated. Three different answers, three different charts, and Story 3.7
  inherits whichever is true.

Write all of it into `LIVE-DATA.md`, every figure dated and naming the
instrument, in the shape that lets it be re-taken.

## Done when

- Every observed message type has a verbatim example and a one-line description.
- The rate is recorded at the open, midday and the close, as a distribution, in
  both messages and bytes per second.
- The p50/p95 arrival gap is recorded, and §28's upstream boundary is stated in
  a sentence a later story can quote.
- The `t` question is answered **with a control**, and the answer is compared
  explicitly against `ALPACA.md` §5.3 — agreement or disagreement, said plainly.
- Live IEX coverage across 518 symbols is recorded with its distribution and its
  worst cases, and compared against the 82.8%/43.1% stored figures.
- Anything a single session could not answer is listed as unmeasured with the
  reason, in the shape of `ALPACA.md` §10.
- `pnpm verify` passes. No credential written.

## Notes

Two traps, both of which have already cost this repository something. The first
is **n=1**: one session is one sample, and a Monday in September is not a
Friday in December — say so beside every rate figure rather than letting a
later story quote it as a constant. The second is the script's own verdict:
`ALPACA.md` §11 records an automated conclusion that was **wrong**, caught only
because 391 > 390 is impossible. Read the numbers.

---
