# Task 2.10.5 — The hook: cancellation, supersession, and the one thing the browser cannot cache

**Status:** Not started
**Story:** [2.10 Frontend Market-Data Layer & Application State](STORY.md)
**Depends on:** Task 2.10.4

## Objective

The reading half of the layer: one hook that turns a symbol and a window into
the state Task 2.10.4 defined, cancels correctly when either changes or the
component goes away, and keeps a **parsed, typed series in memory across an
unmount** — which is the only part of caching the browser's own HTTP cache
cannot do for us.

## What the user can see when this lands

**Nothing directly** — there is still nothing rendering a series until Task
2.10.7. What lands here is the behaviour a user eventually _feels_: whether
coming back to a security is instant or re-fetches, and whether navigating away
mid-request leaves an error sitting on the previous page.

## Work

- **Cancellation, on both causes, through the signal that already exists.**
  `api-client.ts` composes the caller's `AbortSignal` with its own five-second
  deadline rather than choosing between them, and returns `aborted` as an outcome
  distinct from `timeout` and `unreachable` precisely so a torn-down effect is
  not reported as a fact about the backend. Two things must abort: the effect
  tearing down (navigation, unmount) and the inputs changing under a request in
  flight.

  **Supersession is the half that is easy to get wrong and impossible to see.**
  A request for a window the user has already moved off must not land, even if it
  arrives first — and an out-of-order pair is the failure mode, not a slow one.
  Assert it with two overlapping requests resolved in reverse order, and check
  that the rendered state is the later _request's_, not the later _response's_.

- **The cache: what it holds, and what it is forbidden from holding.** Read
  `MARKET-DATA-API.md` §11 before writing a line of it. Every response carries a
  weak `ETag`, `fetch()` revalidates on its own, and a `304` costs no body — so
  what this cache buys is a round trip and a `JSON.parse`, measured at
  1,060,490 bytes → 0 already saved by the layer beneath it. **It must not have a
  lifetime of its own.** The five-minute ceiling is the ceiling on how long
  anything in this system serves an invalidated body, and a client TTL defeats it
  silently and invisibly.

  So the questions this task actually answers are: keyed on what (symbol,
  timeframe and the _resolved_ window, not the requested one — `?sessions=5`
  means a different window tomorrow); bounded how (a series is up to 10,000 bars
  and a user can visit 518 securities, so unbounded growth is a real leak on a
  long-lived tab); and evicted when. Implement whichever mechanism Task 2.10.1
  chose, and **if the choice was a library, the bundle figure it was chosen on
  gets re-taken here against the real build** rather than carried forward.

- **Do not send a window this client resolved.** Task 2.10.3's rule holds inside
  the hook: `sessions=N` goes out, `coverage.requested` comes back, and the
  resolved absolute range is what the cache keys on. That is also the one honest
  route to §11's five-minute reuse, if this hook chooses to re-ask with the
  absolute form once it knows one — a decision worth taking explicitly here or
  explicitly declining.

- **Refetch policy, stated rather than defaulted.** The story's own framing:
  a closed session's bars never change, so this is mostly a question of what to
  keep and when to re-ask at all. Contrast the two hooks that exist —
  `useBackendHealth` polls every 30 seconds because a health state changes, and
  `useSecurities` fetches once because the universe changes a handful of times a
  year. A bar series is a third thing: immutable once its session closes, and
  moving during one. **Do not build a poll for the live case.** Epic 3 owns
  streaming, and a poll added here is the wrong mechanism arriving early —
  but say what the hook does with an open session's tail, because the answer is
  the seam Epic 3 attaches to.

- **Be honest about React's constraints rather than fighting them.** Effects run
  twice under StrictMode in development, and an abort-on-teardown that is correct
  makes that harmless — which is a useful check rather than an annoyance. The
  React Compiler rules (17 of them, effectively all at error) **have never fired
  on shipped code**, and `CLAUDE.md` records that this is evidence nothing has
  written the shape they dislike rather than evidence the tree satisfies them.
  This hook is the second real test of that, per acceptance criterion 6; if a rule
  fires, that is a finding worth writing down rather than a nuisance to silence.

## Done when

- Changing symbol or window aborts the in-flight request, and a superseded
  response cannot reach the rendered state — asserted with an out-of-order pair
- An unmount aborts, and **no state update happens after it**
- `aborted` renders nothing and is never reported as a failure (acceptance
  criterion 3)
- Leaving a security and returning does not re-`JSON.parse` a series still held,
  demonstrated by a test that counts requests or parses rather than by inspection
- The cache has **no TTL of its own**, is bounded, and its key is the resolved
  window
- The refetch policy is written down with its reversal trigger
- `pnpm verify` passes, including the React Compiler rules
