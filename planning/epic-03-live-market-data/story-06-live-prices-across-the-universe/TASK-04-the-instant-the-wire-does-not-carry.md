# Task 3.6.4 — The instant the wire does not carry, and §28's p95 at universe scale

**Status:** Not started
**Story:** [3.6 Live Prices Across the Tracked Universe](STORY.md)
**Depends on:** 3.6.1

## Objective

Criterion 5: **event → application state under 250 ms p95, excluding provider
latency, measured at universe scale rather than for one row.**

**It cannot be measured today, and this story owns the repair.** That ownership
moved here on 2026-09-21 from Story 3.11, at Story 3.5's close.

## What the user can see when this lands

**Nothing.** One field on a wire message and a published figure.

## Why three stories could not measure it

Task 3.5.8 enumerated **every field on the wire**. The only instant a browser
receives is `WireObservation.startsAt` — **the minute the bar covers**, a fact
about the market rather than about when we sent anything. `WireFeedState`
carries `status`, `feed` and `marketOpen`. The `subscribe` message Task 3.5.6
added carries no timestamp either.

**There is nothing to subtract from**, and §28 excludes provider latency, so
`startsAt` cannot substitute.

**Story 3.4's criterion 5 is the same sentence and that story did not close
because of it.** Story 3.11's criterion 4 is the same measurement a third time.
`docs/GAPS.md` entry 12 carries it. **A criterion three stories cannot meet and
none owns is a criterion that never gets met** — the shape this repository
records against _does it feel alive_, deferred seven times before Task 3.4.4
finally took it.

**The browser half is already measured and is not the problem**: Task 3.4.8 took
frame → price on screen at **52 ms p95**, with 200 ms of the budget unspent.

## The change, and the four constraints on it

**A server-stamped instant is added to the wire** — the moment the backend
_sends_ the frame, from the backend's own clock.

1. **A new field, never a second meaning for `startsAt`.** That field is
   load-bearing in the identity block's qualifier, in the revision rule that
   stops the current market state walking backwards, and in every stored row.
   Giving it a second meaning breaks three things at once.
2. **A third clock reading, for measurement only.** `STREAM-SEAM.md` and Task
   3.2.6 record a measured defect: the **165 s** disconnection threshold is
   **monotonic** and the **60 s** staleness threshold is **wall clock**, and
   using one for both is a silent failure in which `stale` can never fire with
   every test green. **This field must not reach `feed-liveness.ts`.**
3. **The reading is honest only as a distribution.** A server clock and a
   browser clock disagree; a negative sample is **skew**, not negative latency.
   Publish it with its ends named and with n, and never a single reading — this
   repository's own rule is that latency must not be asserted without a large n.
4. **It costs a field on every frame**, 332 times a minute. Size it against the
   **56.9 KiB** the universe already costs and say what it became.

## Work

- Add the field to `packages/shared/src/market-stream-protocol.ts`, stamped
  where the gateway sends rather than where the observation was made
- Subtract it in the browser at the same two ends Task 3.4.8 used, so the two
  halves compose into one figure rather than two incomparable ones
- Take the figure **at universe scale** — 518 subscribed, a real burst, not one
  row
- Publish it: the whole journey, its ends named, its n, and its skew caveat
- **Close `docs/GAPS.md` entry 12**, and tell Stories 3.4 and 3.11: 3.4's
  criterion 5 becomes measurable retroactively, and 3.11 re-takes rather than
  invents
- Re-measure the payload and record what the field cost

## Done when

1. A server-stamped instant is on the wire, as a new field, with the four
   constraints above honoured
2. §28's full figure is published at universe scale with its ends, its n and its
   skew caveat — or an honest statement of why it still cannot be taken
3. `docs/GAPS.md` entry 12 is closed or amended with what actually happened
4. Stories 3.4 and 3.11 are told, in their own files, in words they can act on
5. `pnpm verify` passes
