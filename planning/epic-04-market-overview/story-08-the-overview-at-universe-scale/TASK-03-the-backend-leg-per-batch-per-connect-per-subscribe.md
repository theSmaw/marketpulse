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

## Handed here by Task 4.8.1 — 2026-10-09: the harness exists, is proved, and three of your premises about HOW to run it are now different

**Everything below was measured in Task 4.8.1's own proof run; its transcript
is in that file.**

- **Use `scripts/overview-instrument.mjs`.** `startProductionPair()` builds its
  own artefact (`vite build` is **0.6–0.7 s** on rolldown) into
  `.capture/instrument/dist` and serves it on **:4273** with the backend on
  **:3100**, so it runs **beside a running `pnpm dev`** rather than instead of
  it. It asserts the production fingerprint off the wire and prints
  `PRODUCTION BUILD` with the bundle name and size.
- **The 3.6.4/3.6.5 recipe is unsafe as written.** `MARKET_DATA_PROVIDER=fixture`
  against `DATABASE_NAME=marketpulse` makes Story 3.8's live bar writer store
  **invented minute bars in the developer's own store**, 518 a minute. The
  harness defaults the provider to `none` and **refuses** a stream against
  `marketpulse`; name a scratch store (`pnpm store:bare` builds
  `marketpulse_bare`, which is also CI's shape).
- **The load ceiling is ratio 1.0 and it exits non-zero.** `--ceiling <ratio>`
  raises it and the raise is printed in the transcript. It refused twice for
  real during 4.8.1, because a previous run's planted spinners had not decayed
  out of the one-minute average — allow **60–90 s** between runs.
- **Load average alone is not something a browser can feel.** 24 spinning Node
  processes on 8 cores — Story 4.5's measured 23–33 exactly — moved this page's
  calibrator **not at all** (1.2 ms quiet, 1.2 ms loaded). What moved it was
  eight blocked **renderer** processes. So do not read a quiet load average as
  a quiet machine, and do read the calibrator's discard count.
- **The calibrator discriminates at the tail, not the median**: quiet
  `p50 1.2 / p95 1.3 / max 1.5`, loaded `p50 1.3 / p95 2.6 / max 9.7`. Discards
  were **0 / 120** quiet and **24 / 120** loaded. Report the discard count with
  every figure.
- **Four channels are proved and one is new.** The long-frame observer
  (self-test tagged and excluded, then a 180 ms plant caught in the acceptance
  channel), the continuous rAF-gap recorder, **a script clock per burst** — the
  remainder of the delivering task, via a `MessageChannel`, which is the one
  figure LoAF structurally cannot give because it has no entry below 50 ms —
  and a commit counter on `__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot`,
  which production React does call (**16 → 27** on a planted route change).
- **The repaint stamp on `/` is `main`, measured.** Six quiet seconds gave
  **6 mutation records on `body` and 0 on `main`** — the masthead clock and the
  status bar are outside `<main>`. There is **no fallback**: an absent target
  reports nothing, and `distribution()` returns `null` rather than zero
  everywhere.
- **`document.visibilityState` is asserted on every page the harness opens**,
  and the socket wrapper carries `wrapperIntact` — if Playwright's own
  `WebSocket` replaces it, the arm reports nothing rather than n = 0.
