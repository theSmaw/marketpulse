# Task 3.11.4 — Every figure re-taken against the real gateway, in one sitting

**Status:** **Partly taken — 2026-09-25, and criterion 2 is answered with a correction rather than a number.** **The 9,750-bar cap is unreachable through the product**: `MAX_MINUTE_SESSIONS = 21`, so the densest chart any window can ask for is **8,190 bars** — measured on the deployed site at **35 plot elements and 41.6 ms**, 84% of the cap rather than the 68% it was extrapolated from. The five frame-driven figures **still need the market open** and are booked with Task 3.11.8's sitting; this task took everything that did not.
**Story:** [3.11 Cost, Performance, the Sweep & the Epic Close](STORY.md)
**Depends on:** 3.11.1, 3.11.2

## Objective

Criterion 4, and the largest single piece of this close. **Every performance
figure this epic published was taken on a developer's machine against a socket
an instrument served.** They are honest about what they measure and none of them
is the deployment.

## What the user can see when this lands

**Nothing**, unless a figure comes back over the line — in which case what they
see is a repair, and it belongs to whichever surface the figure is about.

## The figures, and why each must be re-taken

| Figure                                                               | As taken                              | Why the deployment differs                                                                   |
| -------------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------- |
| §28's **p95 68.1 ms** gateway send → table repainted, 518 subscribed | Task 3.6.4, **loopback**              | server and browser on one machine and **one clock** — the skew this hides is the whole point |
| **7.2–8.1 ms** script a burst at 1,950 bars                          | production build, instrument's socket | no gateway, no network, one machine's CPU                                                    |
| **12.3–13.2 ms** at 6,630 bars                                       | same                                  | and 6,630 is **68% of the 9,750-bar cap**, not the cap                                       |
| **zero** frames over 50 ms across 160 bursts                         | same                                  | the acceptance figure, and the one worth defending                                           |
| **37–40 ms** of script a tick, 518 rows changing                     | Task 3.6.5                            | §28's _routine_ line, repaired there and never re-taken live                                 |
| **36.75–36.83 ms** a tick with 517 instants drawn                    | Task 3.10.4                           | the worst case of Story 3.10's dating                                                        |
| cold load **50–56 ms** (7 in 10), `Expand all` **65–86 ms**          | Task 3.6.5                            | Epic 14's two standing exceptions                                                            |
| the **transition's** own cost                                        | **never taken**                       | Story 3.10 declined it with its reasoning — see below                                        |

## The cap is the gap worth closing, and it is free here

Task 3.9.9 could not reach **9,750 bars**: that machine's store ended
2026-09-11, and backfilling to reach it is a metered vendor write. **The
deployed store is backfilled nightly**, so a deployed re-take reaches the cap
for nothing — ask for 25 sessions of `1m` on a liquid name and the answer _is_
the cap.

The trend measured was **sub-linear** — 3.4× the bars for 1.8× the script — so
the expectation is comfortable. **The point is that expectation is not
measurement**, and ADR 0027's whole argument is a count.

## The transition, which is an argument awaiting a number

A feed dying changes one field on one view and re-renders every surface at once.
Story 3.10 declined to measure it and said why: §28's word is **routine** and a
disconnection is a one-off, so it falls where the cold load falls rather than
where the tick does. **This story is where arguments of that kind get numbers.**

## The method note worth inheriting rather than rediscovering

**A `long-animation-frame` entry only exists for a frame over 50 ms**, so _zero
observed_ and _the observer is broken_ are the same output. Task 3.9.9's first
self-test reported zero because it blocked **outside** an animation frame on an
idle page. **Block inside a `requestAnimationFrame`, with a mutation after it,
and confirm the observer complains before believing any silence it reports.**

And the second, from the same task: hold bars back so the chart has room to
grow, or the timings look plausible while nothing is actually being drawn.

## The constraint on the sitting

The free plan holds **one** Alpaca connection and the deployment has it
(`docs/GAPS.md` entry 10). This sitting needs the **market open** and shares its
window with Task 3.11.8's rehearsal. **Take them together**, and prefer one
instrument that records everything to five that each need their own session.

## Work

- One instrument, run against `pnpm e2e:deployed` during a session, recording
  every figure above with its n
- The cap reached, deliberately, on a liquid name
- The transition measured, or a second recorded refusal with a better reason
- §28's p95 taken as a **distribution** with its n and its skew caveat, never a
  single number — a server clock and a browser clock disagree and a negative
  sample is skew rather than a measurement
- Every figure written where a later reader finds it: `CHARTING.md` §18,
  `STREAM-SEAM.md` §8.9, `PRODUCT_SPEC.md` §28's amendments, Epic 14's file
- Epic 14's two exceptions re-verdicted, and its trigger evaluated in writing
- The instrument deleted, with at least one reading quoted **verbatim**

## Done when

1. Every figure in the table has a deployed reading or a recorded reason it has
   none
2. The 9,750-bar cap has a measurement rather than an extrapolation
3. §28's p95 is a distribution with an n, taken against the real gateway

## Amended by Task 3.11.1 — 2026-09-25: the list is elsewhere now, and it is two rows longer

**Do not rebuild the table.** Task 3.11.1 extracted criterion 1's whole re-take
list from thirteen hand-off sections into **one table**, with the instrument
named per figure and the split criterion 1 asks for in the last column:
**eight need a live session, three re-take from a clean clone, three are
quote-only.** The eight are this task's.

**Two figures this task's own table did not carry, and both are cheap once the
socket is open:**

- **The payload.** `sentAt` costs **36 bytes a frame**, read off the wire, and
  the universe frame's own size is in Task 3.6.4's record. **The cost envelope
  should cite the re-measured figure rather than either of the two currently in
  circulation** — the eleven places that say `56.9 KiB` were deliberately not
  rewritten by Task 3.5.8's amendment, so there is no single number to quote
  until this takes one.
- **The fan-out**, which belongs to Task 3.11.5's bill but can only be measured
  here: **38 kB/min per browser** at the whole universe (§9.5), and whether
  concurrent browsers change it.

**And one row is quote-only rather than yours**, in its own section's words: the
cold load at **50–56 ms** and `Expand all` at **65–86 ms** stay Epic 14's and
are quoted from that epic's `EPIC.md` unless the table itself changed.

## Amended by Task 3.11.2 — 2026-09-25: the deployed harness is simpler than this task assumed

**A plain Playwright script pointed at the deployed URL works.** Task 3.11.2
took its deployed reading with about fifteen lines — `chromium.launch()`,
`page.goto("https://…/securities/NVDA")`, listeners, a `waitForTimeout` — and
needed **no `pnpm e2e:deployed`, no config, and no credential**. The deployed
frontend is a static site and the gateway is `wss://…/market-stream`; both are
reachable from a laptop.

**So the instrument for the whole sitting is one script rather than a suite**,
which matters because this task shares its window with Task 3.11.8's rehearsal
and the sitting is bounded by the market's hours rather than by effort.

> **One caveat that bounds what a browser reading can claim, and it caught
> Task 3.11.2 nearly overclaiming.** A browser's socket to **our gateway**
> says the gateway is up and holding. It says **nothing** about the backend's
> upstream socket to **Alpaca** — those are two different connections, and the
> forty-hour outage was the second one with the first working perfectly.
> `GET /diagnostics/feed` is what answers for the upstream, and it is one curl.

---

## What was done — 2026-09-25, 00:05 ET

### The split this task did not have: what needs a session, and what does not

The sitting needs the market open and it was **00:05 ET** — nine and a half
hours away. So the first thing was to ask which figures actually need a
**socket** rather than a **deployment**:

| Figure                                    | Needs                    | Taken                     |
| ----------------------------------------- | ------------------------ | ------------------------- |
| the 9,750-bar cap                         | the **store**, over HTTP | **now**                   |
| the chart's cost at maximum density       | the store and a browser  | **now**                   |
| plot element count at that density        | same                     | **now**                   |
| §28's p95 gateway→repaint                 | **frames**               | the sitting               |
| burst cost at live density                | **frames**               | the sitting               |
| the tick at 518 rows / 517 instants       | **frames**               | the sitting               |
| the frame payload and `sentAt`'s 36 bytes | **frames**               | the sitting               |
| the transition's cost                     | a feed that **dies**     | the sitting               |
| cold load, `Expand all`                   | —                        | **quote-only**, Epic 14's |

**Four of nine came out of the sitting**, which matters because the sitting is
bounded by the market's hours and shared with Task 3.11.8.

### Criterion 2 — the cap has no measurement, because nothing can render one

**The endpoint serves it.** `?symbol=NVDA&timeframe=1m&sessions=25` against the
deployed store returns exactly **9,750 bars**, one `sip` source, covered edge to
edge — Story 3.9's hand-off was right that it is free.

**The application never asks.** `timeframeForSessions` is
`sessions <= MAX_MINUTE_SESSIONS ? "1m" : "1d"` with **`MAX_MINUTE_SESSIONS =
21`**, and the URL carries a session count from which the timeframe is derived.
Measured from outside on the deployed site:

```text
?sessions=5    1,950 bars   19 plot elements   worst script 69.0 ms
?sessions=21   8,190 bars   35 plot elements   worst script 41.6 ms
?sessions=22      22 bars   15 plot elements   worst script 30.6 ms
```

**The boundary is exactly where the constant says**, which is `time-window.ts`'s
own claim — _the mapping is what makes the server's 10,000-bar cap structurally
unreachable_ — confirmed from outside rather than read.

> **So this corrects a hand-off rather than taking a figure.** Story 3.9's close
> told this story _a deployed re-take reaches the cap for free — ask for 25
> sessions of `1m` and the answer is the cap._ True of the endpoint, **false of
> the product**. And the figure that was never takeable is not the one worth
> having: what matters is the densest chart a reader can produce, now measured
> at **84% of the cap** rather than extrapolated from 68%.

**ADR 0027 survives its own worst case and then some.** Its premise is _one
element per bar at the cap is 9,790 plot elements_; the silhouette draws **35 at
8,190**, and §18's sub-linear trend is confirmed at the real maximum rather than
assumed past it.

### The method note was worth inheriting, and the self-test earned its place

```text
SELF-TEST: observer COMPLAINS (3 -> 4)
```

A `long-animation-frame` entry only exists for a frame over 50 ms, so _zero
observed_ and _the observer is broken_ are the same output. Blocking **inside** a
`requestAnimationFrame` with a mutation after it, and confirming the observer
complains, is what makes every number above mean something. Task 3.9.9 learned
this the expensive way; this task paid nothing for it.

### One reading recorded without a conclusion

`?sessions=5` produced a single **69.0 ms** long animation frame on one run of
three; `?sessions=21` did not. That is Epic 14's cold-load region — 50–76 ms,
measured locally on three dates — **appearing off a laptop for the first time**.

**It is one sample, and the invoker is `MessagePort.onmessage`**, the React
scheduler, which cannot attribute it between the 518-row table and the chart.
**It is not evidence the exception moved. It is evidence it is still there.**
Epic 14's two figures stay quote-only and its trigger is Task 3.11.10's to
verdict.

### What the sitting still owes, and it is now five things rather than nine

§28's p95 as a distribution with its n and its skew caveat; the burst cost at
live density; the tick at 518 rows and at 517 instants; the frame payload with
`sentAt`'s 36 bytes; and the transition. **All five need frames**, which means
the socket, which means the market open — booked with Task 3.11.8.

**And the recipe is four lines**, from Task 3.6.4's record: wrap
`window.WebSocket` from an `addInitScript` **without** `routeWebSocket`, stamp
`Date.now()` in the `message` listener, subtract the frame's `sentAt`, and stamp
the table's first mutation through a `MutationObserver`. Two pages double n at
no cost in wall time. **Do not correct for skew by subtracting the minimum** —
that assumes the fastest frame was instantaneous.

### Gates

Documents and a deleted instrument. `pnpm links` green. Every reading above is
quoted verbatim, which is the rule that stopped being followed four days ago and
cost Task 3.11.2 a whole task.

## For a stakeholder — a status report, 2026-09-25

### What this was meant to be

Every performance number this phase has published was measured **on a
developer's laptop, against a fake market feed**. They are honest about what
they measure, and none of them is the real system. This task re-takes them
against the deployed product.

**It was midnight in New York**, so the market was shut and the numbers that
need live prices could not be taken. Rather than wait nine hours, we asked which
of the nine actually need a **live feed** and which only need the **live
system** — and four of the nine came out of the queue immediately.

### The interesting finding is a number that does not exist

We have been carrying a figure — _the chart can be asked for 9,750 price
points, and we have never measured what that costs_ — through three separate
pieces of work, each handing it to the next.

**Nothing in the product can produce that chart.**

The application decides what kind of data to fetch from the length of the period
you pick: up to **21 trading days** it fetches minute-by-minute prices, and
beyond that it switches to one point per day. So the most detailed chart anyone
can ever open is **8,190 points**, not 9,750 — and the larger number is a limit
on our _server_, not on anything a person can see.

We verified the boundary from outside rather than by reading the code: 21 days
gives 8,190 points, 22 days gives **22**.

**So the honest answer to "what does the biggest chart cost" is a measurement of
the biggest chart that exists**: 8,190 points, drawn on the live site, costing
**41.6 milliseconds** — comfortably inside our 50 ms budget.

### And a decision from two years ago paid off very visibly

We chose early to draw price charts as a **single shape** rather than one
element per data point, against an argument that the alternative would put
nearly ten thousand elements on the page.

The live site draws that 8,190-point chart in **35 elements**.

### What is still owed

Five numbers need actual live prices arriving — how fast a price gets from our
server to the screen, what a minute's worth of updates costs, and what happens
at the moment a feed dies. Those need the market open, and they are booked into
the same sitting where a person watches the product work.

**That sitting is now shorter by four numbers**, which matters more than it
sounds: it depends on a connection we are only allowed one of, so everything
that can be done outside it should be.

### Where the product stands

**The last story of the live-market phase, four of ten tasks done** — three
complete and this one partly, with its remainder booked rather than pending.
