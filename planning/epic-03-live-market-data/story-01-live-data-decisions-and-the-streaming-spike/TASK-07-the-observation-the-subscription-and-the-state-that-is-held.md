# Task 3.1.7 — Decisions 1, 3 and 4: what a live observation is, what is subscribed, and what is held

**Status:** **Complete — 2026-09-17.** Decisions 1, 3 and 4 are in [`LIVE-DATA.md`](LIVE-DATA.md) §10, each with alternatives, the measurement behind it and a condition-shaped reversal trigger. §2.1, §2.3 and §2.4 are marked answered. **The memory arithmetic was measured rather than estimated: 0.2 MB against 55.6 MB.**
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

## What was decided — 2026-09-17

**A live observation is a minute bar; a browser is subscribed to all 518 of
them; and what the backend holds is the last one per security.** All three are in
[`LIVE-DATA.md`](LIVE-DATA.md) §10.

| Decision                         | Answer                                                   | Trigger                                                                                 |
| -------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1 — what a live observation is   | **A minute bar**, 518, nothing else on the live path     | The first surface needing **intra-minute** movement for one security                    |
| 3 — what a browser subscribes to | **The whole universe, implicitly** — it names no symbols | The first browser surface receiving something **no other browser receives**             |
| 4 — where current state lives    | **Last bar per security**, 0.2 MB, one writer            | The first reader needing more than the latest bar that **cannot** get it from the store |

### The sentence Stories 3.4 and 3.10 were owed

> **A live price is at most about a minute old for a liquid security, may
> legitimately be hours old for a thin one, and both of those are the feed
> working correctly.**

Both halves measured: a bar arrives ~0.5 s after its minute closes (§7.4), and
IEX coverage is 65.1% of minutes for a median symbol and **2.1% for `ERIE`**
(§7.6). **What the product loses, plainly: a number ticks once a minute or less,
never continuously.** A motion vocabulary designed against a streaming tape will
look correct in a mock and dead in production.

### Three questions that dissolved rather than being answered

Decision 3 was written to ask what happens when a browser asks for something
outside the universe, when a second browser asks for the same thing, and when one
asks for nothing. **A browser that names no symbols cannot ask for the wrong
one.** §4.4's two measured traps — Alpaca **accepts** a symbol that does not
exist, and an empty list is a `400` — are hazards for a _dynamic_ subscription,
and this is not one. Both come back the day any per-symbol channel exists, and
§10.2 says so rather than letting them look retired.

**The largest simplification in the epic falls out of it:** the upstream
subscription is a **constant**. §8.7 measured that the server remembers nothing
across a reconnect, so the set is ours to re-assert — and what we re-assert is
always the same 518. Reconciliation reduces to _does the `bars` key hold 518
entries?_

### The memory arithmetic, measured

| Object                                | Bars    | Heap        | Per bar |
| ------------------------------------- | ------- | ----------- | ------- |
| Last bar per security (518 × 1)       | 518     | **0.2 MB**  | 420 B   |
| Today's bars per security (518 × 390) | 202,020 | **55.6 MB** | 288 B   |

Against a **512 MB** replica, today's bars would be **10.9% of the whole
replica** to hold something Story 3.9 is about to store durably. That is the
argument rather than the raw size — and it **obliges Story 3.9** to store the
live session, because between them they are the only two places today's bars
could live.

### Two properties of the state object that are easy to get wrong

- **After a restart it is legitimately empty** and refills unevenly — a minute
  for a liquid name, possibly hours for `ERIE`. _No current observation for this
  symbol_ is an ordinary answer, the same shape §7.2 established for a quiet
  minute. A reader that renders absence as an error will render it constantly.
- **It is not cleared on a session boundary.** At 09:31 on Monday it still holds
  Friday's bars, which is correct — clearing would replace a true-but-old answer
  with no answer. It is only safe because **every entry carries its own
  `startsAt` and no reader may render a price without reading it**.

### One thing checked rather than assumed

Story 3.8 is **"The Tape on the Bar"** and sounds like the trade tape. It is not
— it is a **tape column** on `market_bars`, a schema change for SIP-versus-IEX
provenance. **So no story in Epic 3 delivers trades at all**, and §10.1 records
that rather than letting a later reader find the title in the roadmap and
conclude the option was covered.

## Notes

The failure mode here is deciding 1 in a sentence because the cap makes it
obvious, and then discovering in Story 3.4 that the motion vocabulary was
designed for a number that ticks continuously. The mechanism is obvious; the
product consequence is not, and it is the consequence that later stories
consume.

---

## What this task did, for somebody who does not read code

**Short version: we decided what a "live price" actually is in this product, who
gets sent it, and what the server remembers. All three turned out smaller and
simpler than we expected — and one of them we measured instead of guessing, which
saved us from carrying fifty-five megabytes around for no reason.**

### What counts as a live price

Our data provider offers three levels of detail: every individual trade, every
change in the best bid and offer, or a **one-minute summary** of each company's
trading.

We chose the one-minute summary, and the choice was mostly made for us. The
provider's free plan will only send individual trades for **thirty companies at a
time** — we track 518. There is no version of the detailed feed that covers the
market we watch. The summaries have no such limit.

**The honest consequence, which we have written down in one sentence for the
people building the screens:** a price on screen updates **once a minute at
best**, and for a quietly-traded company it may not update for hours — and
**both of those are the system working correctly**. Our feed only sees one
exchange, and on a full trading day the typical company in our list traded in
about two-thirds of the minutes. One company traded in **2% of them**.

That matters more than it sounds. The next piece of work designs how numbers
_move_ on screen — and a design built for a price that flickers continuously
would look wonderful in a mock-up and dead in the real product, where the number
sits still for a minute and then steps. Better to know now.

**We also checked something rather than assuming it.** There is a piece of
planned work called "The Tape on the Bar", which sounds exactly like the
trade-by-trade feed. It is not — it is a database change about recording which
exchange a price came from. So **nothing currently planned delivers the detailed
trade feed**, and we have said so plainly rather than letting a future reader see
that title and assume it was covered.

### Who gets sent what

Every browser receives **all 518 companies**. The owner chose that yesterday once
we measured the cost — 38 kilobytes a minute, which is nothing.

**The interesting part is what that decision made disappear.** We had three
questions queued up: what happens if a browser asks for a company that does not
exist, what happens if two browsers ask for the same one, what happens if a
browser asks for nothing? **A browser that never names a company cannot name the
wrong one.** All three questions dissolved.

That is not just tidy — one of them was a real trap. We had measured that our
provider will happily **accept a made-up company name** and confirm it back to
us as if it were real. Any design where the browser picks companies has to guard
against that. Ours does not have to, and we have written down that the trap
returns the day we build any feature that lets a browser choose.

The same simplification reaches the server: because the list never changes, the
server's relationship with the provider is a constant. There is no
adding-and-removing to manage, which makes a later piece of planned work
substantially smaller than its name suggests.

### What the server remembers

Two options: remember the **latest price** for each company, or remember **all of
today's prices** for each company.

We measured both rather than arguing about them. The latest price for 518
companies is **0.2 megabytes**. All of today's prices is **55.6 megabytes** —
about **11% of the entire memory** our server is allotted.

We chose the small one. Not mainly because of the size, but because the big one
would be holding a copy of something we are about to write into the database
anyway, and the product already knows how to fetch a chart from the database and
glue the newest few minutes onto the end of it. **That does create an obligation:
the piece of work that saves live prices to the database is now required rather
than optional**, because between the two of them they are the only places today's
prices could live. We have written that into it.

**Two details about the server's memory that are easy to get wrong, and are now
written down.** When the server restarts, it remembers nothing and refills
unevenly — a busy company reappears within a minute, a quiet one might take
hours. So "we have no current price for this company" has to be treated as a
perfectly normal answer, not an error, or the product will show errors
constantly.

And it is **not wiped at the end of the day**. At half past nine on Monday
morning it still holds Friday's closing prices — which is correct, because the
alternative is replacing a true-but-old answer with no answer at all. That is
only safe because **every remembered price carries its own timestamp, and nothing
is allowed to display a price without reading it.** A "last price" with no time
attached is precisely the kind of quiet dishonesty this product spent its whole
previous phase designing out.

### What this unlocks

The screens can now be built against settled answers rather than assumptions:
what a price is, how often it changes, who receives it, and what the server
keeps. One piece of planned work got noticeably smaller, one became mandatory,
and the team designing how prices animate has a measured sentence to design
against instead of an intuition.

**The product remains, today, a historical explorer.** Nothing on screen has
changed. But there is now exactly one planning task left in this phase before the
work turns into code.
