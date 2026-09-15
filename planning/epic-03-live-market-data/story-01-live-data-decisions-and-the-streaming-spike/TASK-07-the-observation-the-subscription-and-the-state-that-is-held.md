# Task 3.1.7 — Decisions 1, 3 and 4: what a live observation is, what is subscribed, and what is held

**Status:** Not started
**Story:** [3.1 Live-Data Decisions & the Streaming Spike](STORY.md)
**Depends on:** 3.1.6

## Objective

Settle the three decisions that are all the same arithmetic seen from three
places — **what a live observation is**, **what the browser is subscribed to**,
and **where the current market state lives and how much of it** — now that the
rate, the coverage and the person's answer to question 2 all exist.

They are taken together because taken apart they contradict each other: an
observation type decides the payload, the payload decides the subscription
scope, and the scope decides the size of the object the backend has to hold.

## What the user can see when this lands

**Nothing.** The payoff is Story 3.3 for the first two and Story 3.5 for the
third, and the specific thing this task buys is that Stories 3.5, 3.6 and 3.7 do
not each size themselves differently.

## What is already decided and must not be re-taken

- **Minute bars are exempt from the 30-symbol cap; trades and quotes are not**
  (`ALPACA.md` §1). This very likely settles decision 1, but the consequence is
  a **product** one, not a mechanism, and it must be written as such.
- **The person's answer to _what does a browser subscribe to_** is recorded in
  Task 3.1.6 and is an input here, not a question to re-open.
- **Epic 4's overview, Epic 5's anomaly scores and Epic 7's analytical tools all
  want _the latest observation per security_, and none of them wants to
  subscribe to a socket to get it** (Story 3.5). The current-state object has
  three consumers outside this epic before it has one inside it.
- **Story 3.7's chart needs today's bars unless the store provides them**, which
  is Story 3.9. So decision 4 and Story 3.9's scope are one decision seen twice,
  and whichever way it goes, both must say the same thing.
- **The universe is 518**, and 518 × 390 is the number to reason with for a full
  session per security.

## Work

Settle each in `LIVE-DATA.md`, with alternatives weighed, the measurement that
bears on it named, and a **condition-shaped reversal trigger**.

**Decision 1 — what a live observation is.** Minute bars, trades, or both.
Weigh the cap, the rate, the coverage and what each gives a user. Then write
down the consequence that is not about mechanism at all: **a minute bar means a
price on screen can be up to a minute old and still be live.** Every staleness
sentence this epic writes inherits that, Story 3.4's motion vocabulary is
designed against a number that moves once a minute rather than continuously, and
Story 3.10's thresholds start from it. If the answer is bars, say plainly what
the product loses — and note whether trades for a **small** set (a focused
symbol, the thing under the pointer) is a later option or a closed door, because
the 30-symbol cap makes that a real design space rather than an all-or-nothing.

**Decision 3 — what the browser is subscribed to.** Execute the person's answer
into a design: what the browser asks for, what happens when it asks for
something outside the universe, what happens when a second browser asks for the
same thing, and what a browser that asks for nothing receives. Size it: at the
measured rate, what does a subscribed browser receive per minute, in bytes,
at the open and at midday. **State the number for the whole universe even if the
answer is not the whole universe**, because Epic 4 will ask and the arithmetic
should not be taken twice.

**Decision 4 — where the current market state lives, and how much of it.** The
last bar per security is a small map; today's bars per security is a different
object with a different cost. Decide which exists, where it lives in the backend,
who may read it, and what happens to it on restart. Two things bind it and both
are named above: the three later epics that want the latest-per-security map,
and Story 3.9's store. Be explicit about the **memory arithmetic** at 518 × 390
rather than describing it as large, and about what the object does at 15:59 on a
Friday versus 09:31 on a Monday — a per-session object has a lifecycle and the
lifecycle is the part that gets skipped.

Also record, without deciding it, **what this does to `packages/shared`**: a
live observation that is a `Bar` with a `BarSource` is the shape Story 3.2
normalizes to, and anything new it needs is a shared type with a clock rule
attached (ADR 0017 — `packages/shared` may not read the wall clock).

## Done when

- All three decisions are in `LIVE-DATA.md` with alternatives, the measurement
  behind them, and a condition-shaped reversal trigger each.
- Decision 1 states the **product** consequence of a minute-grain price in a
  sentence Stories 3.4 and 3.10 can quote.
- The payload arithmetic is written out for both the chosen scope and the whole
  universe.
- Decision 4 names the object's home, its readers, its restart behaviour and its
  session lifecycle, with the 518 × 390 arithmetic shown.
- `pnpm verify` passes.

## Notes

The failure mode here is deciding 1 in a sentence because the cap makes it
obvious, and then discovering in Story 3.4 that the motion vocabulary was
designed for a number that ticks continuously. The mechanism is obvious; the
product consequence is not, and it is the consequence that later stories
consume.

---
