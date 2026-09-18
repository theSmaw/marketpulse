# Task 3.2.2 — `MarketDataStream`, written before anything implements it

**Status:** **Complete — 2026-09-18.** `market-data-stream.ts` (the interface) and `stream-connection.ts` (the reducer) exist; **nothing implements the interface**, which is the deliverable. 28 tests, no socket, no clock, no network.
**Story:** [3.2 The Market-Data Stream Seam & the Alpaca IEX Client](STORY.md)
**Depends on:** 3.2.1

## Objective

Write `MarketDataStream` and its connection-state vocabulary in
`apps/backend/src`, **with no implementation in the same change**. The interface
is the deliverable.

## What the user can see when this lands

**Nothing.** A type and a state machine; no socket is opened.

## What is already decided and must not be re-taken

- **It is a SIBLING interface, not a method on `MarketDataProvider`** —
  [`PROVIDER.md`](../../epic-02-security-universe-historical-data/story-06-market-data-provider-abstraction/PROVIDER.md) §12, with three recorded arguments. Do not reopen it. It
  lives in `apps/backend/src`, **deliberately not in `packages/shared`**, which
  is where `market-data-provider.ts` already sits and for the same reason.
- **The failure vocabulary is `FeedStatus`** — `live | stale | disconnected`,
  already in `packages/shared` since Story 1.5 and waiting for this story. It is
  about a **connection**, not a feed's identity. Do not add a fourth member
  without a decision; `REPLAYING` from 3.2.1 is a **feed identity**, not a
  connection state, and conflating them is the trap this bullet exists to name.
- **`FeedStatus.live` must never be derived from _the socket object is open_** —
  [`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) §6.4. On 2026-09-15 that predicate was true for **4 h
  21 min** of a connection to nothing.
- **Every outcome is a value, never a throw** — `PROVIDER.md` §8.5's line
  transfers: a result says what happened, a throw says the program is wrong.
- **No method may throw "not implemented"** — acceptance criterion 1, and Task
  2.6.6 forbids it in as many words.
- **Retry does not live here** — `PROVIDER.md` §8.8 puts it in a **wrapper
  implementing the same interface**.

## Work

- **Write the interface.** What a subscriber gets, how it unsubscribes, how
  connection state is observed, and how an observation is delivered. Let the
  measured facts shape it rather than a guess: the state must be able to express
  _connected but nothing has arrived for 165 s_ and _our socket is fine and the
  market feed behind it is dead_, because [`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) §11.2 says both
  have to be sayable.
- **Write the state machine as a pure function** — the `(state, event) => state`
  shape `FRONTEND-STATE.md` §1 already uses, so it is testable with no socket.
  Its events are the ones the spike actually observed (§4.1, §4.2, §8.5), not the
  ones a WebSocket API suggests.
- **Encode that the close code carries nothing.** §8.5: five distinct causes all
  produce `1006` with an empty reason. **A state machine branching on the code
  branches on nothing** — the discriminator is a stopwatch, so the events must
  carry elapsed time.
- **Take _now_ as an argument.** Anything that wants the wall clock takes it in,
  which is what keeps the state machine testable and keeps `packages/shared`
  honest if any of it moves there later.
- **Write the doc comment that says why this is a sibling**, pointing at
  `PROVIDER.md` §12 rather than restating it.

## Done when

- `MarketDataStream` exists, **nothing implements it**, and `pnpm build` is green
- The state machine is a pure function with unit tests covering every state the
  spike observed, including `406`, the four authentication failures, and a
  silent death
- No method returns `never` or throws a not-implemented error
- `pnpm verify` passes
- The interface's doc comment names `PROVIDER.md` §12 rather than re-arguing it

## Notes

**Written first is the whole point, and it is checkable rather than a good
intention:** `PROVIDER.md`'s opening makes it the test of whether a seam is real
— _an interface extracted from a working client is a description of that client;
an interface written first is a constraint on it._ If a later task finds the
interface awkward, that is the constraint working. Change it deliberately and
record why, rather than quietly shaping it around `ws`.

---

## What was built

**Two files, and the split is the design.**

| File                                     | What it is                                                                                                      |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `apps/backend/src/market-data-stream.ts` | The seam: `MarketDataStream`, `LiveObservation`, `StreamSubscriber`, `Unsubscribe`. **No implementation.**      |
| `apps/backend/src/stream-connection.ts`  | The connection as a pure `(state, event) => state` reducer, plus `feedStatusOf` and the two measured thresholds |

**Nothing implements `MarketDataStream`** — checked with a grep rather than
asserted, and it is the point of the task rather than an omission.

### The interface is shaped by measurements, not by a WebSocket API

Four of Story 3.1's findings are why this does not look like a `ws` wrapper, and
each one removed something a naive version would have had:

| Finding                                                                           | What it removed                                                                             |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| A connection can die with no event, `readyState` `OPEN` for **4 h 21 min** (§6.4) | No stored `isConnected` flag. `status()` is **derived on every call**                       |
| The close code carries no intent — five causes, all `1006` (§4.2, §8.5)           | **No close code anywhere in the interface.** The `closed` event carries `elapsedMs` instead |
| A refused socket stays open; every error is a frame (§4.2, §8.4)                  | No `onError` that implies a disconnection. `error-frame` and `closed` are separate events   |
| `406` is wait-and-retry, never fatal (§8.2)                                       | No terminal failure state. `refused` is a state we are **connected** in                     |

### The three things deliberately absent, each with its owner

- **Retry** — `PROVIDER.md` §8.8's wrapper, unchanged.
- **Reconnection policy** — Story 3.10's. And §14.2 made this stronger than a
  scoping note: what is missed while away is **gone** (15 bars existed over HTTP,
  zero delivered), so the repair is an HTTP backfill and **cannot be a feature of
  this interface at all**.
- **Holding state for 518 securities** — Story 3.5's. This delivers
  observations; it does not remember them. `LiveObservation.supersedes` carries
  the `u` revision across the boundary and stops there.

### A test caught a conflation, and the conflation is the whole design

The out-of-hours test asserted that 76 minutes of silence still reads `live`,
citing §6.6. **It failed, and the implementation was right.**

§6.6 measured 76 minutes with **no bars** — and the 54 s heartbeat arriving
throughout. My test modelled 76 minutes with **no frames at all**, which is a
dead socket however shut the market is, and `feedStatusOf` correctly said
`disconnected`.

**That is exactly the distinction this module exists to keep apart: silence of
DATA is normal, silence of FRAMES is death.** The test now builds ~84 heartbeats
across the window, asserts there are more than 80 of them, and a second test
covers the other half — the market being shut excuses missing **data**, never
missing **frames**. Recorded rather than quietly fixed, because writing the test
wrong is evidence of how easy the conflation is, and the next person meets it.

### What was checked and found already true

- **`feed-status.ts` already carried the amended gloss** from Task 3.1.8, which
  struck _"still connected"_ as not observable. The reducer honours it: there is
  no predicate anywhere meaning _the socket object is open_.
- **`FEED_STATUSES` needed no fourth member**, and both of §11.2's required
  sentences fall out of the three: _connected but nothing for 165 s_ is
  `disconnected`; _our socket is fine and the feed behind it is dead_ is `stale`.
- **`REPLAYING` is still unwritten and still Story 3.3's.** This task added no
  connection words — only the machine that decides which one applies.

### What this task did NOT decide, stated so 3.2.5 can push back

`PROVIDER.md`'s test is whether the next task finds itself wanting to **change**
this, and two things are most likely to come under pressure:

1. **`subscribe()` takes a fixed symbol set** with no `addSymbol`, because §10.2
   measured the upstream subscription as a constant and §8.7 found the server
   remembers nothing across a reconnect. If Story 3.5 needs dynamism, that is a
   deliberate change with a record, not a quiet widening.
2. **`onObservations` is a batch** because the vendor batches (§7.2). A client
   that finds itself un-batching to satisfy this has found a real defect.

## For a stakeholder — a status report, 2026-09-18

**Where the product is.** A user can explore 518 US companies and their
historical price and volume charts. They still cannot watch a price move. This
epic is what changes that, and this task is its second building block.

**What this task produced: a contract, and deliberately nothing that fulfils
it.**

That sounds like an odd thing to spend a day on, so here is why it is the order
we chose. When you write the thing that talks to an outside company first, and
then describe what you built, **you have not written a standard — you have
written a description of one vendor.** Swapping that vendor later, or testing
without them, then means unpicking assumptions nobody ever wrote down. Writing
the contract first means the connection has to satisfy something decided in
advance — and if it turns out awkward to satisfy, that is **information**, not an
inconvenience. We have said so explicitly in the task: if the next piece of work
wants to change this, it must say so out loud rather than quietly adjusting it.

**The contract is unusual in what it refuses to include, and every refusal came
from something we measured.**

Two weeks ago we spent nine tasks watching the real market feed rather than
reading its documentation, and four of those findings removed things a
conventional design would have had:

- We watched a connection **sit there looking perfectly healthy for four hours
  and twenty-one minutes with nothing behind it.** So this contract has no
  "connected" flag at all. Whether the feed is alive is **worked out fresh every
  time it is asked**, from when something last arrived — because a flag would
  have said "connected" for those four hours.
- We measured that when the connection drops, the reason code the industry
  standard provides is **the same for five completely different causes.** So the
  contract does not carry it. What it carries instead is **how long the
  disconnection took** — one millisecond means our own network went, thirty
  seconds means the connection was already dead — which is a distinction we
  measured rather than guessed.
- We measured that the data provider **refuses us politely without hanging up**,
  and that one particular refusal happens **every single time we deploy new
  software** — because for a few seconds two copies of our system are running
  and only one connection is allowed. So the contract has no "permanently
  failed" state. Being refused is something you recover from, not something you
  stop at.

**A small moment worth reporting, because it shows the safeguards working.** One
of the tests I wrote failed — and **the test was wrong, not the code.** I had
written "if the market is shut, silence is fine" and tested it with total
silence. But the real behaviour is subtler: overnight the feed sends **no market
data** for over an hour while still sending a signal every 54 seconds saying "I
am still here". Total silence is a **dead connection**, whatever time it is. The
code knew the difference; my test did not. I fixed the test, and wrote down that
I got it wrong — because it shows how easy that confusion is, and the next person
will meet it too.

**How this unlocks progress.** The next task builds the real connection to the
market, and it now has something to build **against** rather than something to
invent. Everything the connection must cope with — the silent death, the
meaningless error code, the deploy-time refusal — is already written down and
already has tests proving we handle it, **before a single line of networking
code exists.** That is the difference between discovering those problems in
production at 3am and having already decided what to do about them.

**Two stories from now, a price moves on screen for the first time.** This is the
piece that makes that connection trustworthy when it does.

**What a user can see today: nothing new.** This was a contract and a set of
rules. The screen is unchanged.
