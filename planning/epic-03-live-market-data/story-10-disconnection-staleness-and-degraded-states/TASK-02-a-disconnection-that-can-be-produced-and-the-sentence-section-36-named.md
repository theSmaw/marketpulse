# Task 3.10.2 — A disconnection that can be produced, and the sentence §36 named

**Status:** Not started
**Story:** [3.10 Disconnection, Staleness & Every Degraded State](STORY.md)
**Depends on:** 3.10.1

## Objective

Two things that belong together because neither is worth much alone:

1. **A degraded state a test can PRODUCE**, rather than simulate. Criterion 7
   says the `LIVE` claim must be false _"asserted against a produced
   disconnection rather than a simulated one"_, and a browser suite cannot
   disconnect a vendor. This is the harness every task after this one stands on.
2. **The sentence this entire epic has been walking towards.**

> `Live feed disconnected — displaying data through 10:42:17`

## What the user can see when this lands

**The chrome stops claiming `LIVE` when it is not, and says what it is showing
instead and as of when.** Kill the feed with a real page open and the strip
changes on its own — no reload — while every number, every region and the venue
stay exactly as they were.

**This is the most quotable single change in the epic**, and it is deliberately
second rather than ninth.

## Why the harness is half this task rather than a task of its own

Because a harness with nothing asserted against it is scaffolding, and this
repository's rule is to build the thin slice that works. The sentence is what
proves the harness produces a real state rather than a rendered one.

**What "produced" has to mean here**, and it is three different mechanisms for
three different states:

| State          | How a test reaches it                                                               |
| -------------- | ----------------------------------------------------------------------------------- |
| `disconnected` | Close the gateway socket from the test and let the browser's own policy conclude it |
| `stale`        | Hold the socket **open** and send nothing, past the 60 s wall-clock threshold       |
| reconnected    | Close, then accept the retry — `reconnect-policy.ts` dials at 500 ms on `1001`      |

**`1001` is forbidden unless you mean it** (Task 3.5.7): dropping a client with
`goingAway` produces a tight loop, back in half a second and dropped again.
`MARKET_STREAM_CLOSE` in `packages/shared` is where both ends read the codes.

**And the two thresholds are on two different clocks.** 165 s `disconnected` is
**monotonic**; 60 s `stale` is **wall clock**. Using one for both is not a
simplification, it is a silent failure that shipped once already — the
subtraction goes hugely negative and `stale` can **never** fire, with every test
green. `FeedStatusInputs` carries both and the compiler names any call site that
forgets one.

## The trap in the sentence itself

**`10:42:17` is an instant, and the question is _whose_.** It is the instant the
data on screen was correct as of — the newest observation's own instant — and
**not** the moment the socket died. Those differ by however long the feed was
silent before anybody noticed, which is at least the threshold.

**A second trap: the sentence is a claim about data, so it renders only when
there is data to claim about.** ADR 0029's first rule. A page that has received
nothing at all and then disconnects has no instant to show, and must say
something else rather than an empty slot or an epoch.

## Work

- The harness, in `e2e/support/`, producing all three states through a real
  socket rather than a stubbed status
- The sentence, with its instant, in the chrome's feed cell
- The empty-instant case decided and rendered
- Browser assertions: the claim is false exactly when it should be; every
  number, region and venue survive the transition; nothing collapses
- Unit coverage for the two clocks, so the silent failure cannot return

## Done when

1. A browser test produces a disconnection and asserts the claim goes false
2. The sentence renders with the right instant, and the no-data case is decided
3. Nothing on the page is cleared, blanked or collapsed by the transition
4. `pnpm verify` and `pnpm e2e` pass
