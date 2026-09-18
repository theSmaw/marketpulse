# Task 3.2.9 — Start the stream in the process, so the story hands forward what it says it does

**Status:** **Complete — 2026-09-18.** `market-stream.ts` resolves one stream by exhaustive switch; `index.ts` starts it after `listen()` and registers the closer. **`GET /diagnostics/feed` now reports a real connection**, verified against the built server. See _What was found_.
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

---

## What was found

### The story now hands forward what it says it does

`market-stream.ts` resolves exactly one stream from the configuration by an
**exhaustive `switch`** — the same mechanism `createMarketDataProvider` uses one
layer over, so **a provider id added without a stream fails the build here**
rather than shipping a configuration value an operator can set and nothing can
honour. That guard has now fired three times in this repository's life and been
right every time.

**Verified against the built server rather than asserted:**

```text
none     {"provider":"none","feed":null,"status":null,…}          "no market stream configured"
fixture  {"provider":"fixture","feed":"synthetic","status":"live",…}  "market stream started"
```

`GET /diagnostics/feed` stops reporting `status: null`. **Story 3.3 renders it.**

### The `SIGTERM` close now closes something, and the test proves it

Until this task `registerMarketStreamCloser` had **no caller** — the deliberate
close §12.2 says bounds the every-deploy outage at `SHUTDOWN_TIMEOUT_MS` instead
of §6.4's **4 h 21 min** was dead code, and its process test passed because it
asserts the shutdown path _reaches_ the close, which it did, with nothing behind
it.

Observed on the built server, and now asserted in `pnpm test:process` against a
**registered** closer:

```text
http drained → market stream closed → database pool closed → shutdown complete
```

Two process tests were added rather than one, because the old assertion was not
wrong, only weak: it still covers the `none` case where the closer is genuinely a
no-op, and the new one covers a stream that really started.

### The asymmetry, argued in the code as the task required

- **A replay refused during a session THROWS and the process exits 1.** ADR 0030
  §7f: the case it catches is a developer who left `MARKET_DATA_PROVIDER=replay`
  in their `.env` and is about to build against a recording while believing they
  are on the live feed. **Failing visibly is the entire point** — a replay that
  quietly did not start leaves them in exactly that state.
- **An Alpaca socket that cannot connect or authenticate does NOT throw.** §8.4
  measured that a refused socket stays **open** and every error is a **frame**;
  §8.2 that `406` happens on **every deploy** by design, because a rolling
  replacement has two processes alive and the arriving one is us. **A process
  that exited on a refused socket would fail to start on every rollout** — and
  `deploy.yml` fails a rollout whose container restarted, so it would turn a
  routine overlap into a failed release.

The asymmetry reads oddly until you say what each protects: the first protects a
**developer from being misled**, the second protects a **deployment from a
condition that is normal**.

### A test caught the one module still reading a clock implicitly

The replay-throws test **passed outside market hours and failed inside them** —
because `createMarketStream` called `Date.now()` rather than taking a clock.
Every other module in this story already injects one; this was the exception, and
a test whose result depends on when the suite runs is not a test.

`MarketStreamDependencies` now takes `wallNow`. Cheap, and it is the difference
between a suite that means something at 06:00 and one that means something at
11:00.

### What was deliberately not built

- **No browser fan-out.** Story 3.3's. `onObservations` is a no-op today and the
  code says so: what the subscription buys now is the **connection** — the
  handshake runs, the 165 s watchdog arms, and the diagnostic reports something
  true.
- **A fixed handful of symbols**, not the universe. Story 3.5 owns 518, and
  §10.2 settles the upstream set is a **constant**, so scaling it changes an
  array rather than designing a protocol. **Liquid names on purpose**: §7.6
  measured IEX coverage at 65.1% of minutes for a median symbol and **2.1% for
  `ERIE`**, so a thin name would look broken while working perfectly.

### `GAPS.md` entry 7 was re-pointed rather than left naming a finished task

The task required it **discharged or re-pointed, never left naming a completed
task**. It could not be discharged: this ran at **06:10 ET with the market
`before_open`**, and a `u` frame only occurs during a session.

**It has now been re-pointed twice, and the second time is the informative one.**
It named Task 3.2.5, which built the client — but nothing constructed one, so it
never opened a socket. It then named this task, which starts one — at the wrong
hour. It now names **Story 3.3**, the first story that will be developed against
a running feed _during_ sessions, so the trigger is something somebody meets
rather than something to remember.

**What changed here is that the capture is possible at all.** Before this task
nothing in the repository opened a socket against the live market; today
`MARKET_DATA_PROVIDER=alpaca` with a credential does, and a session is the only
other ingredient.

### One honest note about the verification

A `pnpm verify` failed once and did not reproduce. The cause was mine: a **stray
server from manual probing** still holding port 3099, which one process test
needed. Killed, and a clean run is green. Recorded because _a failure that does
not reproduce is worth attributing rather than shrugging at_ — and the
attribution here is my own leftover process, not a flake.

## For a stakeholder — a status report, 2026-09-18

**Where the product is.** A user can explore 518 US companies and their
historical charts. They still cannot watch a price move. But **for the first
time, the running system actually connects to the market.**

**What this task did, and why it existed at all.**

This task was not in the original plan. It was added yesterday, after a routine
review asked a simple question: _does anything actually start the market
connection we spent a week building?_

**Nothing did.** We had built three different ways to supply live prices — the
real market connection, a stand-in for tests, and a replay of recorded days —
tested each one thoroughly, proved every safety mechanism by deliberately
breaking it, and had a completely green build throughout. **And not one line of
code anywhere started any of them.**

**That is worth dwelling on, because it is a genuinely hard failure to catch.**
Every individual piece worked and was tested. The gap was the _absence_ of a
connection between pieces — and absence is not something a test can fail on. It
took someone grepping for whether a particular function was ever called.

A second thing had gone quietly dead alongside it. Two tasks ago we added a
careful shutdown step: when the server stops, it deliberately hangs up on the
market rather than vanishing, which turns a potential multi-hour outage on every
deployment into a five-second one. **That code was running against nothing** — it
dutifully hung up a connection that was never opened. Its test passed, because
the test checked that the shutdown _reached_ that step, which it did.

Both are now real. I confirmed it by running the actual built server and reading
its output, rather than trusting the tests.

**One design decision is worth explaining, because it looks inconsistent and
isn't.**

Two things can go wrong at startup, and we treat them **oppositely**:

- If someone tries to run the **replay** during market hours, the system
  **refuses to start at all**. That is deliberate. The danger it guards against
  is a developer building against a recording while believing they're watching
  the live market — and a replay that silently failed to start would leave them
  in exactly that state.
- If the **real market connection** is refused, the system **starts anyway** and
  reports itself as disconnected. Also deliberate, for a measured reason: our
  data plan allows one connection, and **every single deployment briefly runs two
  copies of our software**, so the arriving one is refused as a matter of course.
  A system that refused to start on that would fail to deploy, every time.

One protects a person from being misled; the other protects a deployment from a
condition that is entirely normal.

**And a test caught something small but real.** One test passed in the morning
and failed in the afternoon — because it depended on whether the market happened
to be open when it ran. That is not a test, it is a coin flip. The underlying
cause was that this one module was reading the clock directly instead of being
told the time, which every other part of this work already does. Fixed, and the
suite now means the same thing at any hour.

**How this unlocks progress.** The system connects to the market and can be asked
what it is serving. **The next task closes this story**, and then **the story
after that puts the feed's state on screen — the first time the product says
anything true about the market right now.**

**What a user can see today: nothing new.** The screen is unchanged. The
difference is behind it, and the next story is where it surfaces.
