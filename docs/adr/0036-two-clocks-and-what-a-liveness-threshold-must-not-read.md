# 0036 — Two clocks, and what a liveness threshold must not read

**Status:** Accepted
**Date:** 2026-09-25
**Story:** [3.11 Cost, Performance, the Sweep & the Epic Close](../../planning/epic-03-live-market-data/story-11-cost-performance-and-the-epic-close/STORY.md), from Story 3.1's decision 5 and the three defects that followed it

## Context

Epic 3 shipped this product's first surface that answers **"is the data still
arriving?"** — a question no epic before it could ask, because nothing arrived
on its own.

**Its full statement lives in `LIVE-DATA.md` §11.2**, with the measurements the
two thresholds were derived from and the three defects that followed. This ADR
exists because that document is _how a live observation reaches a screen_, and
**the next two surfaces to ask this question are not in Epic 3**:

- `PRODUCT_SPEC.md` §31's investigation stream, where `HOSTING.md` has already
  measured an inbound idle timeout that makes **"emit something every four
  minutes"** a requirement — a liveness threshold by another name.
- §11's anomaly scores, which are computed from observations whose own age
  decides whether a score means anything.

**Neither of those epics knows this decision exists**, and the natural thing to
reach for — _one clock, the obvious one_ — is what this decides against.

## Decision — two thresholds, on two different clocks, and neither may read the wire

**The feed gets thresholds; a security gets an age.** Those are opposite answers
on purpose, and both are in §11.2.

| Threshold | What it measures                            | Clock                               |
| --------- | ------------------------------------------- | ----------------------------------- |
| **165 s** | elapsed time since _any_ inbound frame      | **monotonic** (`performance.now()`) |
| **60 s**  | how old an **observation's own instant** is | **wall clock** (`Date.now()`)       |

**A duration is monotonic; an age is wall-clock.** A duration must not move when
the machine sleeps or NTP corrects the clock — a suspended laptop would
otherwise manufacture a disconnection. An age is a claim about a calendar: an
instant carried on a bar only has meaning against one.

**And a threshold never reads a stamp the wire supplied.** `sentAt` exists for
measurement only (ADR 0033) and is held out of `feed-liveness.ts` by
`pnpm invariants`, because a server clock and a browser clock disagree and a
liveness verdict computed across that gap is a verdict about clock skew.

**Where the rule lives in code**: `packages/shared/src/feed-liveness.ts`, with
`worseFeedStatus` — one function, so two surfaces reporting the same feed cannot
disagree about which state is worse.

> **Amended 2026-10-11 (Task 4.7.7) — the 165 s is unchanged, and a THIRD
> number is now derived from it.** The table's 165 s was derived as three
> missed heartbeats of **Alpaca's** 53.96–54.85 s, and it was applied at both
> ends of the chain: the backend's watchdog over its vendor socket, and the
> browser's over its gateway socket. That second application was only sound
> because the vendor's heartbeat was **reaching the browser** — the gateway
> published a `feed` frame on every advance of the vendor connection, ~332 a
> minute (Task 4.1.6), ping included.
>
> Story 4.7 repaired that rate, which removed the vendor's heartbeat from the
> browser's inbound stream, so **the browser's idle floor became the gateway's
> own keepalive**. At the shipped `KEEPALIVE_INTERVAL_MS = 120_000`, 165 s was
> **1.375** keepalives — one delayed message putting a healthy browser on
> `DISCONNECTED`. The owner's decision was to keep 165 s and re-derive the
> keepalive, so `apps/backend/src/market-gateway.ts` now reads
> `KEEPALIVE_INTERVAL_MS = DISCONNECTED_AFTER_MS / 3` (**55 s**) — written as
> the division so the relation cannot decay if either number is re-derived, and
> `pnpm break the-keepalive-stops-being-three-missed-heartbeats` proves the
> test that holds it.
>
> **Two notes for the next reader.** The 240 s Azure ingress idle ceiling was
> the keepalive's **old** derivation (half of it); it is now a constraint the
> new derivation has to clear rather than its source, and 55 s clears it by
> 4.36×. And `DISCONNECTED_AFTER_MS` could not have moved instead: the same
> constant arms the backend's vendor watchdog in `alpaca-stream.ts`, where the
> vendor's 54 s heartbeat still decides it. **One constant, two sockets, and it
> is three missed heartbeats on both — of a different heartbeat each.**

## Why this is an ADR rather than a line in a module

**Three defects, each shipped, each invisible to a green suite**, and they are
the argument:

1. **One clock used for both.** A monotonic reading is near zero and an epoch
   millisecond is about `1.76e12`, so the subtraction is hugely negative and the
   60 s comparison **can never fire**. The feed reported `live` or
   `disconnected` for ever and **never `stale`** — silently, every test green
   (Task 3.2.5, found by 3.2.6).
2. **The age measured from the interval's START.** A minute bar's instant is the
   start of the minute it describes, so a bar arriving 0.5 s after a complete
   minute is already 60.5 s old by that reading: **`live` was unreachable in
   session** (Task 3.3.4).
3. **The document already knew.** §4.8 recorded the instrument's own offsets as
   monotonic _"so burst shape survives a wall-clock adjustment mid-run"_ — the
   distinction was made correctly for the **instrument** and never carried into
   the section specifying the **product's** thresholds.

> **A fact can be in a document and still not be where the reader who needs it
> will look.** That sentence is §11.2's own, written after the second defect,
> and it is the whole reason for this file.

## What a green suite certifies about this, and what it does not

**It certifies** that the pure function returns the state the fixture expects,
that `sentAt` does not appear in `feed-liveness.ts` or either adapter
(`pnpm invariants`), and that a produced disconnection reaches the one surface
that reports it (`pnpm e2e`).

**It does not certify** that the numbers are still right. Both were derived from
measurements of a third party on one Wednesday: **165 s** from a 53.96–54.85 s
heartbeat across 82 intervals, three missed; **60 s** from a longest in-session
silence of **8.6 s**, at 7× margin. A vendor that changes its heartbeat makes
the first wrong, and neither number has an instrument watching it.

## Alternatives rejected

**One clock for both.** Simpler, and it is defect 1 — which is not an argument
against the alternative so much as a demonstration that the two quantities are
different kinds of thing.

**A per-security verdict.** Rejected in §11.2 and worth restating here because
it is the tempting symmetry: on a feed with **65.1% median per-symbol minute
coverage** a quiet security is ordinary, so a per-security `stale` would mark a
third of the universe as broken while the feed was healthy. **A security gets an
age and the reader judges it.**

**Reading `sentAt`.** It is the only stamp that describes the sending side, and
that is exactly why it cannot be a threshold input: ADR 0033 publishes it as a
distribution with its n because a negative sample is skew rather than a frame
arriving before it was sent.

## Reversal trigger

> **A second condition, added 2026-10-11 (Task 4.7.7): the first change to
> either heartbeat the thresholds are three of.** `DISCONNECTED_AFTER_MS` is
> three of Alpaca's ~54 s and `KEEPALIVE_INTERVAL_MS` is a third of
> `DISCONNECTED_AFTER_MS` — so a vendor that changes its heartbeat, or a
> gateway that changes its own cadence for a reason of its own, re-derives
> both. The ordering matters and is the trap this amendment exists to flag: the
> browser's threshold is now downstream of **our** cadence, so changing the
> keepalive alone silently changes how long `LIVE` survives a dead connection.

**A condition rather than a story number: the first surface that needs a
liveness verdict on a stream whose heartbeat this product does not control** —
Epic 10's investigation stream is the likely one. At that point the numbers are
re-derived from that stream's own measured heartbeat, and the two-clock rule
either generalises or is shown not to. **The rule is the durable half; the two
figures are dated observations of a vendor.**
