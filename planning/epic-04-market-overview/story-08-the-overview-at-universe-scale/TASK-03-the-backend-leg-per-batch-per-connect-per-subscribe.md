# Task 4.8.3 — The backend leg: per batch, per connect, and per subscribe

**Status:** Not started
**Story:** [4.8 The Overview at Universe Scale](STORY.md)
**Depends on:** 4.8.1

## Objective

**The 518 in this story is entirely server-side**, and the join does not run
only where everybody assumed.

## What the user can see when this lands

**Nothing.**

## Work

### The thing nobody had priced: the join runs per connect and per subscribe

`sendSnapshot()` ends with `send(client, overviewMessage())`, and
`overviewMessage()` calls an **unmemoised** `marketOverview()`. `sendSnapshot()`
runs once in the `upgrade` handler **and at the foot of every `message`
listener**, without comparing. So:

- Task 4.2.1 measured **three snapshots on an ordinary cold load** → roughly
  **three full 518-joins per browser opening `/`**. n browsers = 3n joins.
- On `/` there is a **feedback loop**: the movers ranking changes → `symbolKey`
  changes → a resubscribe → the gateway answers with a snapshot **and another
  join** → the observations identity changes → a re-render. The route's own
  comment names _"the point at which the resubscribes overtake the gateway's
  own cadence"_ as a known hazard and nothing measures it.
- **The join also runs with zero clients attached**: `publishObservations`
  evaluates `overviewMessage()` as an **argument** to `broadcast`, before the
  client map is consulted.

**So the inherited claim _"the backend cost does not scale with
connections"_ is false of the join.** It is true of the broadcast encode only.
Correct the hand-off rather than measuring around it.

### What to measure, and the control that makes it attributable

The join per applied batch on a **production build**, with Story 4.5's control
arm — the same pipeline with movers' eligible set emptied — because **that
control reproduced Story 4.4's 3.497 ms baseline to 0.1%**, and that is what
makes a difference attributable rather than merely adjacent. **A/B/A/B per
burst, not arm-then-control**: 4.5's control max moved 3.74 → 25.7 ms between
runs while its median moved 0.23.

Then the joins per cold load, and the joins per minute on an idle backend with
**no browser attached** — which nobody has priced against the idle-rate
condition.

### The branch that decides what tonight's figures even mean

`eligibleMoves` picks its arm from `isMarketOpen(asOf)`, read off the trading
calendar. **Out of hours `sessionMoves` runs, not `observedMoves`** — a
different computation, a different denominator (~503 with a close, not the ~466
heard from in five minutes) and a different grammar on screen. **The 3.4 ms of
`marketDateAt` IS reproduced out of hours**, because it sits in
`buildMarketOverview`'s `changeFromClose` call, upstream of the branch; the
breadth and movers legs are not. **Every figure this task takes tonight is the
session-basis arm and must say so.** There is no seam in `index.ts` that
injects `marketOpen`.

### Report medians and p95, and maxima as unusable

Established on this machine by measurement rather than by taste — see the
control above.

## Done when

1. The join's cost per applied batch on a production build, with the
   interleaved control, medians and p95, n stated, maxima marked unusable
2. The per-connect and per-subscribe joins counted and priced, and the
   resubscribe loop on `/` either measured or recorded as unmeasured with a
   condition
3. The zero-clients case priced
4. Every figure labelled **session basis**, with what the observed-basis arm
   would differ by stated
5. The hand-off's _does not scale with connections_ claim corrected where it
   is live
