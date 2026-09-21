# Task 3.5.7 — One process, one socket, and the second subscription nobody noticed

**Status:** Not started
**Story:** [3.5 Subscription Management & the Current Market State](STORY.md)
**Depends on:** 3.5.1

## Objective

Make the lifecycle honest, and collapse a duplication this story created on its
way past.

**There are two subscriptions on one stream today.** `index.ts` calls
`stream.subscribe(STREAM_SYMBOLS, …)` with `onObservations: () => undefined`,
and `market-gateway.ts` separately calls `stream.subscribe([], …)` and
broadcasts. The first exists because Story 3.2 needed the connection to be held
by something before anything consumed it — its own comment says so — and Task
3.5.1 gives it a real consumer. **After 3.5.1 the discard is dead weight; after
this task it is gone.**

## What the user can see when this lands

**Nothing.** The reason it matters is in the story's scope: _the socket belongs
to the process, and `index.ts` is the only thing that exits._

## Why one subscription rather than two

Two is not merely untidy — it makes a question unanswerable. **Which subscriber
owns the upstream connection?** Today the answer is _whichever was registered
first_, which is an accident of file order, and the shutdown path closes one of
them. `registerMarketStreamCloser(unsubscribe)` takes the **`index.ts`** one;
the gateway registers its own closer separately. Two closers, one socket, and
nothing states the order.

This is the same class as the defect fixed on 2026-09-21 in `alpaca-stream.ts`
— **a mutable reference driven by callbacks bound to a previous instance of the
thing it points at** — and that trigger is written into Story 3.10. Worth
reading before touching this.

## The constraints, which are settings rather than tuning knobs

- **One replica, one socket.** Container Apps' documented default is
  `minReplicas: 0` with an HTTP trigger; the Alpaca socket is **outbound**, so
  no ingress timeout governs it and the **only** thing that can kill it is the
  replica ceasing to exist. Set correctly today (ADR 0011). Anything that scales
  this app to zero breaks the epic's exit criterion **in a way that looks like a
  feed that stopped rather than an error**.
- **The free plan allows one concurrent connection**, which makes the same
  constraint true from the vendor's end — and which this session has just seen
  bite: a retry that failed to close its own refused socket put the deployed
  backend into `CrashLoopBackOff` for two days.
- **A socket that delays shutdown shows up as a slower test, not an error.**
  ~5 s of `test:process` **is** the shutdown ceiling elapsing, so a handle left
  open across shutdown is measured in seconds rather than reported.

## Work

- Collapse to **one** subscription, owned by the process, feeding the
  current-state object; the gateway reads that object rather than subscribing
- **One** closer, in a stated order, with the order asserted rather than assumed
- `SIGTERM` closes the upstream socket and the process exits inside the existing
  ceiling — criterion 5, asserted by the **process suite** rather than by a log
  line
- Confirm no handle survives shutdown, by the timing rather than by inspection

## Done when

1. Exactly one `stream.subscribe` exists in shipped serving code, proven by a
   `pnpm invariants` grep — this is a claim that will otherwise quietly stop
   being true
2. `SIGTERM` closes the socket and exits within the ceiling, asserted in
   `test:process`
3. The shutdown does not get **slower**, which is the symptom a leaked handle
   actually produces
4. An ordering assertion has a marker on **each side** of the step it is about,
   and the marker travels with the step — a log line further down the function
   does not move when the step does, and the break passes
5. `pnpm break` behind the invariant
6. `pnpm verify` passes
