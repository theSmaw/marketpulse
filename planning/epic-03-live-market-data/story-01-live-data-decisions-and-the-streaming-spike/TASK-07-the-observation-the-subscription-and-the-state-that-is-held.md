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

**Added 2026-09-15 by Task 3.1.2** — [`LIVE-DATA.md`](LIVE-DATA.md) §4.4.
Decision 3 asks _what happens when a browser asks for something outside the
universe_, and the upstream half of that is now measured rather than open:

- **Alpaca accepts a symbol that does not exist** and echoes it back as held, so
  a subscription acknowledgement is **not** evidence a symbol is real.
  Validation against our own universe is the only thing that can tell a typo
  apart from a genuinely quiet security, and it has to happen **before** the
  frame is sent. Design decision 3 around validation we own, never around a
  refusal we expect.
- **An empty symbol list is a `400`** — exactly the frame a scope that resolves
  to nothing produces. "Subscribe to whatever the selection resolves to" is a
  bug on the empty selection, and decision 3 must say what is sent instead.
- **The subscription acknowledgement is the full current state, not a delta**,
  and when it is empty the channel key is **absent** rather than `[]`. So the
  server is authoritative about what we hold: decision 4's state object should
  **reconcile against the ack** rather than maintain a count and hope.

**Added 2026-09-15 by Task 3.1.3** — [`LIVE-DATA.md`](LIVE-DATA.md) §6.8. It
sharpens the reconciliation rule immediately above rather than contradicting it,
and the sharpening is the difference between a reconciler that works and one
that reports a permanent mismatch:

- **The acknowledgement contains channels nobody asked for.** A subscription to
  `trades` comes back holding `corrections` and `cancelErrors` for the same
  symbols, attached by the server and never requested. So the ack is still the
  authoritative full state, but **a reconciler that diffs the whole ack against
  the request is wrong on the very first subscription, every time**. Reconcile
  **per channel this product cares about**, and ignore keys we never asked for.
- **And it is one more small argument for decision 1 settling on bars.** A
  `trades` subscription silently carries two message types this product has
  never seen and cannot easily provoke — a correction and a cancellation need a
  real one to occur. Under bars, none of it is reachable.

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

> **Added 2026-09-16 by Task 3.1.5 — one measured fact reaches both decision 3
> and decision 4.** [`LIVE-DATA.md`](LIVE-DATA.md) §8.7: **the upstream server
> remembers no subscriptions across a reconnect.** Five were held, the socket
> was closed and reopened, and the acknowledgement came back naming only the one
> symbol newly asked for.
>
> For **decision 3** that settles a question this task would otherwise have had
> to guess: the upstream subscription set is **authoritative state we hold and
> re-assert**, never a thing the server keeps for us. A browser's subscription
> and the upstream subscription are therefore two different objects with two
> different lifetimes, and the mapping between them is ours.
>
> For **decision 4** it reaches the restart lifecycle directly — _what happens
> to it on restart_ is not only a question about our own memory. After any
> reconnect the upstream set is **empty** until we re-send it, so the state
> object and the subscription set come back by two different mechanisms and can
> disagree while they do.

> **Added 2026-09-17 by Task 3.1.6 — the person has answered, and one
> instruction below is already discharged.**
> [`LIVE-DATA.md`](LIVE-DATA.md) §9.5: **a browser subscribes to the whole
> universe, all 518.** Decision 3 executes that; it does not re-open it.
>
> **The sizing this task was told to do is done.** Decision 3's Work says to
> state the per-minute payload _for the whole universe even if the answer is not
> the whole universe_. It is measured: **38.8 kB/min at the open, 32.8 at
> midday, 52.9 at the close**, 38.4 mean across the session — under 1 kB/s at
> the worst. **Do not re-take it**; quote §9.5.
>
> **And the reframing matters more than the number.** The payload objection this
> decision was written to weigh **does not survive measurement** — the
> constraint is **render cost**, not bandwidth: 332 bars land inside a **243 ms**
> burst, once a minute (§7.4). A decision 3 that spends its argument on bytes is
> arguing about the term that was never binding.
>
> **Two consequences reach the other two decisions on this task:**
>
> - **Decision 4** must hold state for **all 518**, not for a visible subset —
>   a browser subscribed to everything needs a snapshot of everything on
>   connect, which is Task 3.1.8's decision 2. The memory arithmetic this task
>   already owes is therefore against the full universe rather than a window
>   onto it.
> - **Decision 1** gains a cost input it did not have. §9.1 measured that
>   **trades for ten symbols cost 2.9× the bars for 518** — 18.9 MB against
>   15.4 MB. So the _trades for a small set_ option this task is told to keep
>   open or close is **expensive relative to bars**, and that is a measured
>   statement rather than an intuition about volume.

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
