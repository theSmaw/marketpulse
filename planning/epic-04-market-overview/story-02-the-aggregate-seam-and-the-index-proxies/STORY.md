# Story 4.2 — The Aggregate Seam, & the Index Proxies That Move

**Status:** Not started
**Epic:** [Epic 4 — Market Overview](../EPIC.md)
**Depends on:** 4.1
**Epic scope covered:** major ETF/index proxy summary; the one place an aggregate is computed

## Description

**The first live numbers on the landing page, and the seam every later
aggregate goes through.**

`PRODUCT_SPEC.md` §9 puts a market summary at the top of this screen and §6
names the proxies: **SPY, QQQ, DIA, IWM** — four of the universe's 518, already
tracked, already carrying a live price since Story 3.6, and already having
their change measured from the previous session's close by `changeFromClose`,
**which is the one place that arithmetic is written** (`last-close.ts`, Task
3.6.1). Nothing here re-derives it.

**So the visible half of this story is small and the structural half is not.**
Four figures is a morning's work. What takes the story is deciding — and
building — **where an aggregate over the universe is computed**, because
Stories 4.3, 4.4 and 4.5 all go through it and Epic 5's scores will want the
same seam.

> **The index proxies are deliberately the first thing through it**, because
> they are the one "aggregate" that is not an aggregate: four named securities,
> each its own row in the map. If the seam cannot serve four known symbols
> cleanly it will not serve a breadth count, and the failure is visible in
> minutes rather than in a percentage nobody can check by eye.

## What the user can see when this story lands

**Four index proxies at the top of the landing page, moving.** `SPY`, `QQQ`,
`DIA` and `IWM` with their last price, their change from the previous session's
close in both sign and glyph, and the arrival mark this product already uses —
the disc that fires when **a bar arrives** rather than when the price changes.

**And an honest answer when one of them has not been heard from**, which on
IEX is ordinary rather than broken: a proxy with no current observation shows
its last stored close with the instant it belongs to, never a blank and never a
stale number presented as current.

**What they still cannot do:** read sectors (4.3), breadth (4.4) or the movers
(4.5), or click through (4.6).

## Why it sits here in the sequence

**Immediately after the shell and before every other aggregate**, because it is
the cheapest possible test of the seam Story 4.1 decided: four rows, four
figures, and every property of the underlying map exercised — a fresh
observation, a missing one, and a value that arrives while somebody is looking.

## Acceptance criteria

1. Four proxies render with price, change and the shipped arrival mark, from
   live data during a session and from the store outside one
2. The change is computed by **`changeFromClose`** — a second implementation of
   that arithmetic fails the build (`pnpm break` entry)
3. A proxy with no current observation renders its own honest state, and the
   words are the product's existing ones rather than new synonyms
4. The seam Story 4.1 chose exists as **one module or one route**, with a test
   that fails if a second caller computes the same aggregate elsewhere
5. **The feed's provenance is not implied.** These figures come from IEX when
   live and from the consolidated tape when stored, and the screen does not
   suggest they are the same thing (`CLAUDE.md` invariant 6)
6. A browser spec asserts a bar landing in a proxy against a store with zero
   bars, which is the assertion CI can actually make

## Design work

**Four figures side by side is a component this product does not have.** The
identity block's price treatment is the closest relative (`Price region.dc.html`,
`The first price that moves.dc.html`) and it is designed for **one** number
with room around it.

Draw the proxy row on the canvas before building it: at 1440 it is four across,
and at 390 it is the first thing that has to decide between wrapping, scrolling
and dropping to two rows. **Colour is never the sole encoding** — the price
palette differs by 1.04:1 in greyscale, so the sign and the glyph carry the
direction.

## Out of scope

Sector ETFs (4.3), any count over the universe (4.4), ranking (4.5). The proxy
set is the four §6 names and adding a fifth is a universe change, not a
layout choice.

## Amended by Task 4.1.1 — 2026-09-25: the seam is decided, and it is a frame

**The owner chose a new frame on the existing market-stream socket**, over a
browser-side computation and over a polled HTTP route. **This story builds
it**, and three things travel with the decision:

- **One computation for every browser.** The aggregate is computed where
  `currentMarketState` already lives and sent, not recomputed per page.
- **It arrives on the clock it describes.** The gateway already sends one
  `bars` frame a minute; the aggregate belongs on that cadence rather than on a
  poll of its own.
- **The wire widens, and that is governed.** [ADR 0031](../../../docs/adr/0031-what-a-transport-without-a-schema-layer-owes.md)
  says what a transport without a schema layer owes, and
  [ADR 0033](../../../docs/adr/0033-a-send-instant-on-the-wire-for-measurement-only.md)
  is the precedent for adding a field — **a new field rather than a second
  meaning for an existing one**, and `sentAt`'s four constraints are the shape
  to copy.

> **And the reason it is not the browser**, recorded so it is not re-argued:
> `PRODUCT_SPEC.md` §5.1 — the LLM never calculates and every number a user
> sees comes from deterministic code. §17's analytical tools are backend tools,
> so **Epic 5's anomaly scores cannot live in a browser**, and an aggregate
> seam built there would be rebuilt within one epic.

## Amended by Task 4.1.6 — 2026-09-25: one subscribe produces TWO snapshots, and this story owns the wire

**Measured while rehearsing a coverage instrument**, on the deployed gateway:
one `socket-open`, one `subscribe`, `reconnects: 0` — and **`snapshot: 2`**.
Reproduced on both rehearsal runs.

**Task 4.1.3 saw the browser-side version and mis-attributed it.** A page
opened three snapshots, and that was put down to the application subscribing
more than once as components mounted. **This client subscribes exactly once**,
so at least one of them is the gateway's.

**Why it matters here rather than as a curiosity**: mid-session a snapshot
carries **every subscribed security** — the eleven places that say `56.9 KiB`
are about a frame of that shape — so a spare snapshot per connection is a
duplicate of the largest frame on the wire, per browser, at exactly the moment
the market opens and every browser connects at once.

**This story is the one that touches this wire**, adding the overview frame
(Task 4.1.1's decision 2). **Find out why before adding to it**, because a
protocol whose existing frames are not understood is a protocol that grows
another one nobody understands. It may be correct — an initial snapshot plus
one on the first subscribe acknowledgement — and if it is, say so where the
next reader looks.

## Decomposed 2026-09-26 — nine tasks, and four decisions the owner took first

**The shaping pass falsified two of this story's own premises**, both corrected
by Task 4.2.1 rather than quoted: the spare snapshot is the **empty**
connect-time one (~120 bytes, not 56.9 KiB — the first `sendSnapshot()` runs
one line after `clients.set(client, new Set())`, so it filters against an empty
subscription and cannot carry anything), and the gateway sends **up to ~16
`bars` frames a minute**, not one. The arrival mark is one burst a minute; the
frames are not.

**Four decisions, taken by the owner at decomposition:**

1. **The seam is the JOIN, and `changeFromClose` moves to `packages/shared`.**
   AC 2 and AC 4 could not both hold while the function was frontend-only. The
   backend now calls the one implementation, and AC 2 is **stronger** than it
   was — one implementation, two processes. What nothing in this backend could
   do before is join a live observation to the previous session's stored close,
   and 4.3, 4.4, 4.5 and Epic 5 all need exactly that. `last-close.ts`'s own
   invariant-1 argument owes a dated amendment, because it now reaches across a
   process boundary.
2. **The strip uses an ABSOLUTE staleness rule**, keyed on ADR 0028's _last
   session whose bell has rung_, not the universe table's relative one. The
   table's rule fails closed when the whole map is uniformly old — every
   weekend and every evening — leaving four undated figures spoken as
   `Live price` at the top of a screen about what is happening right now. The
   difference from the table is the strip's prominence, and it is recorded as a
   reason rather than left as an inconsistency.
3. **Four adjacent repairs are in scope**: ADR 0038; the repair of two
   **hard-coded invariant file lists** (verified — a new component spelling
   `All US exchanges` is in neither list and both checks stay green, so AC 5 is
   guarded by a check that cannot see the file AC 5 is about); the `resumes`
   defect (`resumes = snapshots - 1` against a gateway that sends two per
   connection plus one per subscribe, firing a spurious gap-fill on every cold
   load, suppressed only by an `inFlight` race); and the replay `asOf` seam.
4. **The region is renamed `Market summary` → `Market proxies`**, with the
   sweep in Task 4.2.5 rather than deferred. It is already the product's word
   for these four, and on a screen where three later regions summarise all 518
   `Market summary` promises the broadest view and delivers the narrowest.

**Taken from the record without a question**, and recorded so they are not
re-opened: the order is `SPY, QQQ, DIA, IWM` (§6, `INDEX_PROXIES`, and already
on screen in the reserved region's sentence); **no coverage/denominator
sentence on the proxies** (four named securities have no population, and 4.1.5's
table makes the denominator a property of a figure's coverage); **no live
region** (`FRONTEND-STATE.md` §7's four reasons hold _a fortiori_ at four
unprompted subjects); the arrival mark **fires four at once with no stagger**,
because a stagger encodes an order the data does not have; the disc moves to
the label row, because neither shipped geometry has a margin to be absolute
into; **`MARKET_STREAM_PROTOCOL_VERSION` is not bumped**, because the deploy
rolls the backend first and bumping makes a stale tab reject every frame rather
than ignore one; and the empty connect-time snapshot **stays**, being the only
frame an unsubscribed browser gets before the 120 s keepalive.
