# Task 3.10.2 — A disconnection that can be produced, and the sentence §36 named

**Status:** Not started — **but read the amendment first: HALF OF THIS IS ALREADY BUILT.**
**Story:** [3.10 Disconnection, Staleness & Every Degraded State](STORY.md)
**Depends on:** 3.10.1

## Amended by Task 3.10.1 — 2026-09-24: the sentence ships, so this task is the harness

**The chrome already says it.** Measured by producing the states rather than
reading the code:

```text
DISCONNECTED  The live feed is not connected. Prices shown are the last known.
              Showing data through Sep 24 · 05:05 EDT.

STALE         Connected, but no new data has arrived.
              Showing data through Sep 24 · 05:04 EDT.
```

§36 names _"Live feed disconnected — displaying data through 10:42:17"_. **That
is the same sentence with better words** — ours says which data and why, and
carries the instant in the product's own bar-instant format.

**So what is left of this task is the half that was always the harder one:**

- **The harness**, made permanent. Criterion 7 wants the claim asserted against
  _"a produced disconnection rather than a simulated one"_, and Task 3.10.1's
  throwaway proved the mechanism: the browser takes the **worse** of its own
  reading and the server's, so a stubbed `feed` frame produces `stale` through
  the shipped path, and **closing the socket** produces `disconnected` without
  waiting out 165 s.
- **The assertions**, which do not exist. Criterion 3 was measured by that
  throwaway and is **met**; nothing in the suite holds it.
- **The no-data case**, still undecided: a page that has received nothing at all
  and then disconnects has no instant to show.

**Do not rewrite the sentence.** It is correct, it is shipped, and it is the one
thing in this story a stakeholder has already been promised.

### And one constraint on the harness, which Task 3.10.1 learned by breaking it

**A stub that can send any frame can manufacture states the server cannot, and
those look exactly like findings.** Task 3.10.1's throwaway did it twice: it
modelled a quiet **security** as a silent **connection**, and it produced a
`LIVE` connection word inside a deployment with **no provider configured** — a
combination `createMarketStream` forbids, because a `none` selection constructs
no stream at all. The second was written up as a defect and withdrawn.

**So this harness must be constrained to what the gateway would actually
send**, rather than to what the wire format permits. Concretely: derive the
`feed` frame from the same selection the backend was built with, so a state a
real deployment cannot reach is a state the harness cannot reach either. A
harness that can lie is a harness whose green runs mean less than they look.

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
