# Story 3.10 — Disconnection, Staleness & Every Degraded State

**Status:** Not started
**Epic:** [Epic 3 — Live Market Data](../EPIC.md)
**Depends on:** 3.7, 3.9
**Epic scope covered:** reconnection handling, stale-data detection, live connection state — as a complete set rather than one state at a time

## Description

**A live feed's failure states are product states, and this is the story that
treats them as a set.**

`PRODUCT_SPEC.md` §36 names the sentence this whole epic has been walking
towards — _Live feed disconnected — displaying data through 10:42:17_ — and the
rule around it: degrade incrementally and locally, never collapse into a global
error screen. `FeedStatus` has shipped `live | stale | disconnected` since
Story 1.5 with the two non-live members argued and unreachable, because there
was nothing to disconnect from.

The method matters as much as the subject, and it is borrowed from Task 2.14.7,
which enumerated **every** failure and partial state in Epic 2 and photographed
them together. What that pass found is the reason to repeat it here: **four
defects, and none of them was visible one state at a time.** A state is
correct on its own and wrong beside its neighbour — two empty answers that read
identically while implying different next actions, a confident sentence about
data nobody had read, a region that says nothing when its subject is missing.

## What the user can see when this story lands

**An application that is honest when its feed is not.** The strip stops claiming
`LIVE` and says what it is showing and as of when; prices stop pretending to be
current without disappearing; the chart keeps the session it has drawn and marks
where it stopped; and none of it collapses a page.

And when the feed comes back: the gap filled rather than jumped, so a chart does
not carry a hole from a thirty-second dropout for the rest of the day.

What the user still cannot do — nothing, from this epic. This is the last
feature story; Story 3.11 measures and closes.

## Why it sits here in the sequence

**Last, because a set cannot be enumerated until its members exist.** Every
surface this epic builds has degraded states, and taking them one story at a
time produces five locally-correct answers that disagree with each other — which
is precisely what the Epic 2 pass found when it finally looked at them together.

## Scope

- **Reconnection**, with backoff, against a vendor that allows **one concurrent
  connection** — so a reconnect racing a connection that has not finished dying
  is a real failure mode rather than a hypothetical, and the spike recorded what
  a duplicate connection actually does.
- **The gap.** A reconnection leaves a hole between the last observation and the
  first new one. Filling it is a **historical** fetch against a fifteen-minute
  embargo and a rate limiter that is a refilling bucket at ~3.3/s with **no
  `Retry-After` on a `429`** — so the repair for a two-minute dropout and the
  repair for a two-hour one are different repairs.
- **Staleness, with its number.** A feed that is connected and silent is
  `stale`, and on IEX an absent minute is **ordinary** — median coverage 82.8%,
  worst case 43.1%. A threshold tuned as if silence were alarming will cry wolf
  on thin names all day; one tuned as if it were nothing will show an hour-old
  price as current.
- **The distinction the vocabulary already holds and that this story must not
  collapse**: `FeedStatus` is about the **connection**, `MarketSessionStatus` is
  about the **session**, and they are deliberately separate — the market being
  open does not mean data is flowing, and the market being shut is not a feed
  failure. A quiet socket at 02:00 is correct and must not read as broken.
- **The three-fact strip.** _Which venues are in these numbers_, _is data
  arriving_, and _what time does the market think it is_ fail independently,
  which is the argument that has kept them separate through four stories.
- **The per-datum question, which is the hard one.** A price that was live and
  is now forty minutes old is not the same as a price that was never live. Every
  surface has to answer it: the table's 518 rows, the identity block, the
  chart's edge, and the source note. **The rule that already governs is the one
  to apply**: a claim about data requires data, and a surface that owns nothing
  defers in one line rather than saying nothing.
- **The live row in the provenance ledger, which is already reserved.**
  `VISUAL-LANGUAGE.md` holds room for it by name: the §36 sentence is _a
  provenance claim that changes while somebody is watching_, and it belongs **as
  a first row above the stretches, carrying a marker of its own.** Reserved on
  the reasoning that three retrofits cost more than three sentences — this is
  the story that spends it.
- **The whole set, enumerated and photographed**, in the shape Task 2.14.7 used:
  every state reachable, listed, produced, and looked at together at four
  viewports. **Producing them is most of the work** — a browser suite cannot
  disconnect a vendor, so the states have to be reachable through the fixture
  stream and through a recorded frame rather than by waiting for an outage.
- **The backend's own honesty.** `GET /diagnostics/freshness` answers _how many
  trading sessions behind is the store_, computed on request so it has no
  schedule to miss, and `check-deployed.mjs` fails on it after a merge. A live
  feed is a second freshness claim and the same question applies to it.

## Out of scope, and who owns it

- The cost of holding a socket through a bad week — Story 3.11
- Anything about an agent's failure states — Epic 10, which has its own §36 list
- A listening pass with a real screen reader. A live region that changes on
  disconnection is exactly the case this repository has an unshipped repair for,
  and this story adds to that backlog with its eyes open rather than claiming to
  have discharged it

## Open decisions — settle with the user

1. **The staleness threshold**, in seconds, and whether it differs by security.
   A number that is right for NVDA and wrong for a thin name is the likely first
   answer and it is worth knowing that before shipping one number.
2. **How far back a reconnection fills**, and what it does when the gap is
   larger than the free plan will answer for.
3. **Whether a stale price keeps its last change figure or drops it.** Both are
   defensible and they make different promises.

## The design bar

**A degraded state is where a product's design is actually tested**, and the
failure mode here is specific: five surfaces each inventing their own way to
look sad. The vocabulary exists — `FeedIndicator`'s shapes, the rail, the source
note's clauses — and the work is applying it once rather than five times.

Two standing rules carry unusual weight in this story. **None of these three
states is an error**, and rendering stale or disconnected as a failure pushes
the interface toward exactly the global error screen §36 forbids — which is why
only `stale` takes a colour and why `live` and `disconnected` are the same grey,
told apart by silhouette. And **motion in this product means work in progress**:
a reconnecting feed may move, a disconnected one may not, and a stale price
certainly may not.

## Acceptance criteria

1. Every state in the set is enumerated, reachable in the suite, and
   photographed at 1440, 1024, 768 and 390
2. Two states that imply different next actions do not read identically — the
   defect the Epic 2 pass found twice
3. Killing the feed mid-session leaves every number on screen, labelled with the
   instant it was correct as of, and collapses nothing
4. Restoring the feed fills the gap rather than resuming beside it, and the
   chart shows no hole afterwards
5. A quiet socket outside market hours reads as correct rather than as broken
6. A thin name with no trade for nine minutes during a live session is not
   reported as a feed failure
7. The `LIVE` claim is false exactly when it should be — asserted against a
   produced disconnection rather than a simulated one
8. `pnpm verify` passes, and the browser assertions are written against what
   **CI's store and CI's absent credential** can actually answer

## What this story hands forward

An epic whose feature work is complete, and a set of states Epic 4's overview
and Epic 5's scores inherit rather than re-invent.

---

## Handed here by Task 3.1.4 — 2026-09-17

**The silence thresholds are measured, both halves** ([`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md)
§7.9 and §6.6). Inside a session the longest silence of any inbound frame across
518 bar channels was **8.6 seconds**; outside one it is 54.85 s of any frame,
60.1 s with `dailyBars` attached, and ≥76 minutes on bar channels alone. **Nine
seconds of silence inside a session is already unusual; sixty outside one is
evidence of nothing.** The server's ping is every 54 s in both cases, so it is
the floor on silence and the only thing that distinguishes quiet from dead.

**A revised bar is not a gap, and this story's gap-filling would not catch it.**
The owner decided on 2026-09-17 that the product subscribes `updatedBars`
(§7.11): a bar for a minute that already has one arrives about thirty seconds
later and **changes it**. Gap-filling asks _which minutes are missing_; this is a
minute that is present and wrong, which none of that machinery sees.

---

## Handed here by Task 3.1.8 — 2026-09-17

**The thresholds are set and measured** ([`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) §11.2):
`disconnected` at **165 s** of no inbound frame of any kind — three missed
heartbeats, from 53.96–54.85 s across 82 intervals — and `stale` at **60 s** with
no observation while the market is open, which is **seven times** the longest
in-session silence ever measured (8.6 s, §7.9).

**Two things about them that are not obvious:**

- **`stale` is gated on the market clock.** Out of hours the same socket is
  legitimately silent for 76 minutes (§6.6), so an ungated 60 s rule reports a
  healthy overnight feed as stale every minute of every night.
- **Staleness is keyed on the observation's own timestamp, never on "a frame
  arrived".** §6.7 measured `dailyBars` re-sending a **byte-identical** aggregate
  every minute out of hours — a rule keyed on arrival would call that liveness.

**A security gets no status word at all, and that is this story's largest
inherited constraint.** §11.2 measured the gap between one security's bars at a
p50 of 1 minute, a p95 of 4, and a **maximum of 187** — `ERIE` at 187, `AIZ` at
146, against a median symbol at 4. **No threshold separates a quiet security from
a broken one.** A security carries an age; the degraded-state vocabulary applies
to the **feed** and only the feed.

**And two sockets means two states** (§11.1): the browser's own connection is the
browser's to observe, while the upstream feed's state arrives as a **`feed`
message** carrying the status and the instant of the last upstream observation.
_Our socket is fine and the market feed behind it is dead_ is a real state and
needs a way to be said — conflating them is the defect this story exists to
prevent.

---

## What is missed while away is GONE — measured 2026-09-17 by Task 3.1.9

This story's gap-filling scope was written from an unanswered question. **It is
answered**, in [`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) §14.2, and the answer narrows this story
rather than widening it.

A deliberate 3-minute disconnection during a live session, with five liquid
control symbols checked frame by frame against the HTTP API over the same
window: **fifteen bars existed over HTTP and zero were delivered on the socket**
— then or later. No replay, no catch-up, no backfill frame, and no `u` standing
in for a missed `b`. The subscription resumed cleanly at 518 and carried on from
the present.

**Three consequences, and the first is the scope decision:**

1. **Gap-filling is an HTTP backfill and cannot be a socket feature.** There is
   nothing to ask the socket for. This is the third independent route to that
   conclusion — §8.2's every-deploy overlap and §6.4's half-open death already
   created gaps no replay could fill.
2. **The gap's extent is arithmetic, not a diff.** A bar's `t` is its interval
   **start** and the flush is +60 s, so _what am I missing_ is computable from
   the disconnection instants alone. No reconciliation query against the vendor
   is needed to know **what** to ask for.
3. **A revision is not a gap, and the window is bounded.** §14.1 measured every
   revision arriving **29.1–30.1 s** after the bar it corrects, so a bar is not
   final for thirty seconds. Gap-filling that runs inside that window will see a
   bar it is about to be sent a correction for.

**The trap this story will meet, recorded because the analyser walked into it
first.** The question _was this bar missed?_ keys on when the bar was
**flushed**, never on its own timestamp. A naive `gapStart <= t < gapEnd` test
counts a normally-delivered bar as recovered: one stamped `15:03:00Z` begins
inside the gap and is flushed at `15:04:00Z`, after the reconnection. A first
pass over this capture reported 343 "recovered" bars on exactly that error.

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
