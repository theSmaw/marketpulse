# Story 3.3 — The Browser Stream & `LIVE` in the Chrome

**The first vertical slice of this epic.**

**Status:** Not started
**Epic:** [Epic 3 — Live Market Data](../EPIC.md)
**Depends on:** 3.2
**Epic scope covered:** backend-to-browser streaming, live connection state, market timestamp / `LIVE` indicator, the live feed's own honest label

## Description

The story that turns four layers of plumbing into something a stranger can see,
and it is placed third rather than seventh on purpose.

**Epic 2's lesson, written into this epic's sequence rather than learned again.**
That epic was layered — everything backend until Story 2.9, then everything
frontend — which meant nothing a user could see arrived until Story 2.11, seven
stories and roughly fifty-five tasks after the first row reached the database.
Story 2.4 was inserted to repair it. This story is the repair applied in
advance: a thin end-to-end slice through the socket, the gateway, the browser
transport and the chrome, taken while all four are still cheap to change.

**And it is deliberately a connection rather than a price.** `LIVE` appearing
beside provenance is a state change; a number moving is the thing
`VISUAL-LANGUAGE.md`'s Motion section has been deferring to this epic for seven
stories, and Story 3.4 owns it. Shipping a moving price here would settle that
vocabulary by accident, in a task that was about a transport.

## What the user can see when this story lands

**`LIVE`, on every route, and it is true.**

The chrome's status strip is three regions — `Market feed`, `Backend service`,
`Market clock`. The first has read **provenance** since Task 2.6.7 — _which feed
this deployment is configured to read_ — and this story puts a **connection
state beside it rather than instead of it**, because _which venues are in these
numbers_ and _is data arriving right now_ are two facts that fail independently.
That is Task 1.12.4's two-indicators argument, applied for the fourth time, and
it is why `FeedIndicator` still ships with its consumers removed.

So the region reads the venue **and** the state: the stream's own honest label —
a single venue named as a single venue, never Epic 2's `All US exchanges` — and
`LIVE` when observations are arriving, with the instant of the last one.

**A note on the strip's geometry before anything is appended to it:** `.clock` is
`align-items: flex-end` as the end of the strip, so a region added after it takes
that edge away. This belongs **in the market-feed cell**.

What the user still cannot do: **see a single number change.** Prices are the
last stored close, exactly as they were yesterday. The application announces
that it is live and then demonstrates nothing, which is honest and is the point
of a slice — and it is what Story 3.4 fixes.

## Why it sits here in the sequence

Because a slice is worth most while the layers under it are still soft. The
browser protocol, the gateway's shape and the frontend's transport hook are all
decided in this story, and Stories 3.5, 3.6 and 3.7 each push real load through
them. Finding out here that the protocol is wrong costs one story; finding out
in Story 3.7 costs four.

It is also the only honest moment to ship the `LIVE` indicator: after it, the
screen has moving prices and _is it connected_ stops being separable from _is
that number current_.

## Scope

- **The gateway**: a WebSocket endpoint on the Fastify server, serving browsers.
  `PRODUCT_SPEC.md` §31 keeps this separate from Epic 10's SSE stream, and the
  two have different semantics — do not build one thing with a mode flag.
- **The protocol**, settled in Story 3.1 and implemented here: typed messages,
  a version, a subscribe shape, and the same rule the investigation stream will
  need — the client renders from an **ordered stream of typed events**, never
  from anything it has to parse loosely.
- **The response-contract idiom carried across the protocol boundary.** Every
  HTTP route in this repository declares its schema with the `satisfies`
  guard so a field added to a type and forgotten in the schema is `TS1360`
  rather than a value that silently vanishes. A socket message has the same
  failure and none of the same machinery: decide here what plays that role,
  because the trap is worse on a socket — nothing strips an undeclared field, so
  the failure is a **leak** rather than an absence.
- **The frontend transport.** `api-client.ts` is stated to be the only file in
  the application that calls `fetch`; a socket is a second boundary and wants
  the same treatment — one module, one place that knows the URL, and everything
  above it holding domain state. It is configured at **build time** like every
  other frontend value, which means the deployed frontend cannot be pointed at a
  different backend without a rebuild.
- **The connection state in the chrome**, beside provenance, with the last
  observation's instant. Rendered on all five routes, from one hook.
- **The hook's placement, which is already measured.** `useMarketClock` is
  called from `AppHeader` rather than from `App`, and the counterfactual was
  produced: lifting it to `App` re-renders the whole landing route **40 times in
  20 s** against **0**, and the clock as placed produced **0 `longtask`
  entries** over 60 s. A live hook faces exactly that choice at a higher rate.
  Nobody has to argue it again; the measurement exists.
- **The honest label**, per §7.1 and invariant 6: the acronym is not the
  requirement, the sentence under it is. The shipped vocabulary and the rule for
  when a label needs a sentence live in `packages/shared/src/market-provenance.ts`
  and this story adds no second vocabulary.

## Out of scope, and who owns it

- **Any datum moving** — Story 3.4, and this is the one boundary in the epic
  that must not be blurred for convenience
- Subscription management, fan-out to many browsers, coalescing — Story 3.5
- Reconnection and staleness thresholds — Story 3.10. This story shows
  `disconnected` when the socket is down and says nothing it cannot support
- Exchange-supplied time replacing the clock. `MarketClock` renders the
  **viewer's** clock in market time, which is a timezone claim rather than a
  synchronisation claim, and a server-supplied instant is a **new fact beside
  it** rather than a rewiring of it

## Open decisions — settle with the user

1. **What `LIVE` means out of hours**, if Story 3.1 did not already settle it
   with the socket-lifetime question. A socket that is up at 3am on a Sunday is
   connected and nothing is arriving, and those are different sentences.
2. **Whether the region shows the last observation's instant always, or only
   when it is not now.** §36's own example — _displaying data through 10:42:17_ —
   is written for the degraded case, and a timestamp that is always on screen is
   either reassuring or noise depending on a judgement no document has taken.

## The design bar

**Four tests, and this screen is at risk on two of them.**

- **Does it look designed rather than defaulted?** A `LIVE` chip is the single
  most defaulted element in market software — a green dot and four capitals.
  This product already refused a green dot once with a reason that still holds:
  **green means price-positive here**, and a live indicator borrowing it would
  be the only other green on the screen. `FeedIndicator` carries the answer:
  the **shape** carries the state, only `stale` takes a colour, and `live` and
  `disconnected` are the same grey told apart by silhouette.
- **Does it feel alive?** This is the epic that owes that answer and this is not
  the story that pays it — but a static word reading `LIVE` on a screen where
  nothing moves is the _worst_ available answer, worse than saying nothing. Keep
  it a statement of fact, keep it small, and leave aliveness to Story 3.4 rather
  than inventing a pulse here that the vocabulary then has to live with.
- **Colour is never the sole encoding of anything**, and the strip is where that
  rule is easiest to break.

## Acceptance criteria

1. A browser open on any route shows the feed's venue **and** its connection
   state, and both are read from the running system rather than hard-coded — the
   defect this region shipped with from Story 1.5 to Story 2.6
2. Closing the backend turns the region to `disconnected` in the browser without
   a refresh, and leaves every other region and every number on the page intact.
   §36 forbids collapsing to a global error screen and this is the first story
   where that is testable
3. The live label names a single venue and does not imply consolidated coverage
4. No datum on any screen changes as a result of this story — asserted, not
   assumed, because it is the boundary Story 3.4 depends on
5. One browser test covers the connected and the disconnected states of the
   region. **Check what CI's store can answer first**: 518 securities and zero
   bars, and a runner with no credential has no upstream socket either
6. No main-thread task over 50 ms attributable to the connection (§28), and the
   render count is measured against the `useMarketClock` baseline above
7. `pnpm verify` passes, and `pnpm probe` was run on the strip at 1440, 1024,
   768 and 390 **before** the browser suite — the masthead is already known to
   clip at 390 and this story adds content to the same chrome

## What this story hands forward

A protocol, a transport and a true `LIVE`. Story 3.4 sends the first price
through it.

---

## Handed here by Task 3.1.8 — 2026-09-17, and this story can now start

**All three decisions Story 3.3 consumes are settled.** [`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md)
§11: the browser protocol, the staleness numbers, and the words on screen.

**The protocol (§11.1):** a **snapshot on connect, then one message per upstream
frame**. The snapshot is the backend's current-state object serialised, and
**absence is expressed by omission** — an entry for every security observed and
**no entry at all** for the rest. After a restart the snapshot is `{}` and that
is the true answer rather than a degraded one. Every entry carries its
observation's own instant; **no `staleSeconds` on the wire**, because that is a
clock read wearing a different name (ADR 0017).

**The numbers (§11.2):** `disconnected` at **165 s** of no inbound frame of any
kind, `stale` at **60 s** with no observation **while the market is open** —
gated on the market clock, because out of hours the same socket is legitimately
silent for 76 minutes. Both are measured; both name their figure.

**And the thing most likely to be got wrong: a SECURITY gets no status word.**
The gap between one security's bars has a p50 of 1 minute and a maximum of
**187** (§11.2), so no threshold separates a quiet security from a broken one.
A security carries **the age of its observation** and the surface renders that.
`STALE` beside a price is a judgement this product cannot support.

**The words (§11.3):** the grid is stated in full, and one row looks wrong and is
correct — **`IEX` / `LIVE` / `CLOSED`** at 03:00. Our connection is healthy; the
market is shut. Three regions, three facts.

**One string this story owes and nobody has written:** the connection sentence
for `live | stale | disconnected`, in a record beside `FEED_STATUSES` with the
same `satisfies` guard `MARKET_FEED_DESCRIPTIONS` uses. §11.3 names it as
unwritten and names this story as its owner. **Not a string in a component.**

`feed-status.ts` already carries the thresholds as a dated amendment.

---

## The two thresholds are on two different clocks — delivered 2026-09-18 by Task 3.2.6

**A constraint this story consumes, written here rather than left in
[`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) §11.2, because a pointer is what a reader follows when they
already know to look.**

| Threshold                  | What it measures                            | Clock                                                                                                                                                       |
| -------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **165 s** — `disconnected` | Elapsed time since _any_ frame arrived      | **Monotonic** (`performance.now()`). It must not move when the machine sleeps or NTP corrects the clock, or a suspended laptop manufactures a disconnection |
| **60 s** — `stale`         | How old an **observation's own instant** is | **Wall clock** (`Date.now()`). An instant carried on a bar only has meaning against a calendar                                                              |

**Using one clock for both is not a simplification, it is a silent failure.** A
monotonic reading is near zero and an epoch millisecond is about `1.76e12`, so
the subtraction is hugely negative and the 60 s comparison **can never fire**:
the feed reports `live` or `disconnected` for ever and **never `stale`**, with
every test green. That shipped in Task 3.2.5 and was caught by 3.2.6's fixture
stream — the first implementation to generate an observation against a real
calendar while reporting a synthetic monotonic clock.

**`FeedStatusInputs` already carries both** (`now` and `wallNow`) and the
compiler names every call site that forgets one. **Anything in this story that
computes a status or an age takes both rather than reading either.**
