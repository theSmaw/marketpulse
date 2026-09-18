# Task 3.2.2 — `MarketDataStream`, written before anything implements it

**Status:** Not started
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
