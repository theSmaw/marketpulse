# Task 3.2.9 — Start the stream in the process, so the story hands forward what it says it does

**Status:** Not started
**Story:** [3.2 The Market-Data Stream Seam & the Alpaca IEX Client](STORY.md)
**Depends on:** 3.2.8

## Why this task exists — added 2026-09-18, after 3.2.8

**The story ships three implementations of `MarketDataStream` and starts none of
them.** Found by grepping for a call site after 3.2.8:

```text
createAlpacaStream(  createReplayStream(  createFixtureStream(  registerMarketStreamCloser(
  → zero matches outside tests
```

**Two things that are false today as a result**, and both are load-bearing rather
than cosmetic:

- [`STORY.md`](STORY.md)'s _What this story hands forward_ says **"a live feed
  inside the process"**. There is no feed inside the process — there are three
  things that could be one, and nothing runs any of them.
- Task 3.2.5 wired `registerMarketStreamCloser` into `index.ts`'s shutdown,
  ahead of the pool, and **nothing ever registers a closer**. The deliberate
  `SIGTERM` close — the mechanism §12.2 says bounds the every-deploy outage at
  `SHUTDOWN_TIMEOUT_MS` instead of §6.4's 4 h 21 min — is **dead code**. Its
  process test passes precisely because it asserts the shutdown path _reaches_
  the close, which it does, with nothing behind it.

**And ADR 0030 §7f's central claim depends on this task**: _"the deployed site
now connects to the real IEX socket during every session and nothing else ever
serves there — so the live feed is exercised **more** under this ADR than it
would be without it."_ That is true only once something connects.

**It is a separate task rather than an item on the close**, because starting a
socket in the process is implementation with its own acceptance criteria — the
first time this process holds a long-lived outbound connection — and folding
implementation into a close task is how closes get skipped.

## What the user can see when this lands

**Nothing on a screen**, and this is the last task in the story of which that is
true in the strong sense: after it, `GET /diagnostics/feed` stops reporting
`status: null` and starts reporting a real connection. **Story 3.3 renders it.**

## What is already decided and must not be re-taken

- **The socket's lifecycle is the process's** (`LIVE-DATA.md` §12.2): opened
  after the server is listening, never scheduled, closed deliberately on
  `SIGTERM` **ahead of the pool** and inside the existing 5,000 ms ceiling. The
  shutdown half is already written and waiting for a registration.
- **`resolveMarketData(config)` is the precedent** for reading a selection once
  at startup rather than per request, and `createMarketDataProvider`'s
  exhaustive `switch` is the shape to copy — a selection added without a stream
  must fail the build, not be silently unserved.
- **`none` serves no stream at all**, and that is the default. Nothing here may
  make a feed reachable by forgetting to configure one.
- **A fixed handful of symbols.** Universe scale is Story 3.5's, and §10.2
  settles that the upstream subscription is a constant, so there is no
  subscription state to design.
- **The replay refuses to start during a session and throws**
  (`ReplayDuringSessionError`). A process that starts one at 10:00 ET must fail
  visibly rather than run without a feed.

## Work

- **Resolve the configured stream once, at startup**, beside
  `resolveMarketData(config)`. An exhaustive `switch` over the selection, so the
  next `ProviderId` fails the build here rather than being silently unserved.
- **Subscribe it, and register the closer** — `registerMarketStreamCloser` is
  already wired into the shutdown sequence and needs a caller.
- **Hand the stream to `readFeedDiagnostic`**, which already takes one
  optionally and reports `null` without it. `GET /diagnostics/feed` then reports
  a real `status`, `feed` and `observedAt`.
- **Decide what a failure to start does**, and write the reason down. A replay
  refused during a session throws; an Alpaca socket that cannot authenticate does
  **not** — §8.4 measured that a refused socket stays open and every error is a
  frame, so the process must keep running and report `disconnected` rather than
  exiting. **These two are different on purpose and the difference should be
  argued in the code.**
- **Extend the process test**: `SIGTERM` now closes a _registered_ closer rather
  than a no-op, so the `market stream closed` record proves something it did not
  before.
- **Do not start a browser fan-out.** Story 3.3's.

### The credentialled opportunity this task creates

**`docs/GAPS.md` entry 7's owner is currently Task 3.2.5, which is complete and
did not discharge it** — an owner that is a finished task never fires, which is
the failure `CLAUDE.md` records for calendar-triggered work arriving in a new
shape. **This task inherits it**, because it is now the first thing that opens a
real socket against the live market.

**The trigger is unchanged: the first `u` frame observed in a live session.**
Record it verbatim, replace the two **reconstructed** fixtures in
`src/fixtures/alpaca-stream/`, and re-tier them to `transcribed` in
`MANIFEST.json`. It needs a session and a credential, so it may not be
dischargeable on the day this task is otherwise done — **if it is not, re-point
the owner rather than leaving a completed task named**.

## Done when

- Exactly one stream is constructed at startup, chosen by an exhaustive `switch`
- `registerMarketStreamCloser` has a caller, and `pnpm test:process` asserts the
  `SIGTERM` close runs against a **registered** closer
- `GET /diagnostics/feed` reports a real `status`, `feed` and `observedAt`
- `MARKET_DATA_PROVIDER` unset still yields **no stream**
- A start failure's behaviour is decided, differs deliberately between the replay
  and the socket, and the difference is argued in the code
- `pnpm verify` passes with no network and no credential
- `docs/GAPS.md` entry 7's owner is **either discharged or re-pointed**, never
  left naming a completed task

## Notes

**The grep that found this is worth repeating at the close.** Three
implementations of an interface and no construction site is not a shape any test
can fail on — every implementation was tested, every guard was proven, and
nothing ran. `pnpm verify` was green throughout.
