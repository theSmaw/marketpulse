# Task 3.2.5 — The Alpaca IEX client: `ws@8`, the handshake, and the watchdog that is the whole point

**Status:** **Complete — 2026-09-18.** `alpaca-stream.ts` implements `MarketDataStream`; `ws@8` added to the backend only; the deliberate `SIGTERM` close is wired into `index.ts` ahead of the pool. **99 tests, no network, no credential, no real timer.** See _What was found_.
**Story:** [3.2 The Market-Data Stream Seam & the Alpaca IEX Client](STORY.md)
**Depends on:** 3.2.4

## Objective

The real client — connect, authenticate, subscribe, read frames, hand them to
3.2.4's mapping — implementing 3.2.2's interface. **The first implementation,
deliberately, and before any convenience.**

## What the user can see when this lands

**Nothing**, and this is the largest task in the story with the least to show.
The socket runs inside the backend process and reaches no route and no screen.

## What is already decided and must not be re-taken — every line below is a measurement

- **`ws@8`, not Node's built-in `WebSocket`.** [`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) §4.6: the
  built-in can neither observe a server ping nor send a pong; §8.6 measured that
  this server closes such a client **5,999 ms** after the first unanswered ping.
  A client on the global would drop roughly **every 61 seconds, for ever.** `ws`
  is a new dependency and this is its justification.
- **Connection state is driven by the `authenticated` FRAME, never by
  `onopen`** (§4.5). The socket to `/v2/sip` opens and is greeted identically
  before the `409` arrives, and **the server leaves it open**.
- **Every error is a frame, not a closure, and a refused socket stays OPEN**
  (§4.2, §8.4). All four authentication failures leave the connection up
  indefinitely.
- **`402 auth failed` is byte-identical** for a wrong key, a wrong secret and no
  credential at all (§8.3). An operator log **cannot** distinguish them and
  **must not claim to.** `400 invalid syntax` is genuinely distinct and is the
  one an operator can act on differently.
- **`406 connection limit exceeded` is _wait and retry_, never fatal** (§8.2).
  The incumbent wins; a rolling replica replacement has two processes alive **by
  design** and the arriving one is this client. **A client that maps _refused_ to
  _stop_ has no feed after every deploy until somebody restarts it by hand.**
- **The close code carries nothing; the close latency carries everything**
  (§8.5). Five causes, all `1006`, empty reason — ~1 ms, ~240 ms, ~6 s, ~10 s,
  ~30 s apart.
- **The server heartbeats every 54 s** (§6.3, 53.96–54.85 s over 82 intervals),
  a property of the **connection** rather than the subscription. **So this
  product needs no keepalive of its own.**
- **A connection can die with no event at all** (§6.4) — `OPEN` for 4 h 21 min,
  no error, no close. **The watchdog is on INBOUND FRAMES, not `readyState` and
  not data**, firing at **165 s**.
- **Subscriptions are ours to re-assert** (§8.7) and the upstream set is a
  **constant** (§10.2) — the server remembers nothing, so there is no
  subscription state to restore. **A client that designs a resubscription
  protocol is designing for a problem this epic does not have.**
- **The socket's lifecycle is the process's** (§12.2): opened at boot, never
  scheduled, and **closed deliberately on `SIGTERM`** — which bounds the
  every-deploy outage at the existing `SHUTDOWN_TIMEOUT_MS` instead of §6.4's
  4 h 21 min.

## Work

- **Add `ws@8` and `@types/ws`** to `apps/backend` — the package declares what
  it imports, and this is a genuine import.
- **Transport only.** Connect, authenticate, subscribe to **a fixed handful of
  symbols** (universe scale is Story 3.5), read frames, hand them to 3.2.4. Drive
  3.2.2's state machine; do not grow a second one here.
- **The 165 s liveness watchdog on inbound frames.** Build it on a **monotonic**
  clock rather than the wall clock — a suspended or time-adjusted machine must
  not manufacture a disconnection.
- **`406` retries; `402` and `400` do not.** Write the backoff and **say in the
  code that it is politeness rather than penalty avoidance** — §8.7 measured
  that immediate reconnection is not penalised (717/709/709/722/694 ms, all
  authenticating). A backoff justified by a penalty that does not exist is a
  number nobody can ever revisit.
- **Close deliberately on `SIGTERM`**, wired into the existing signal handling
  in `index.ts` — which is the only file that exits.
- **Test every state against 3.2.3's corpus**, with **no network and no
  credential**. That is acceptance criterion 6 and what makes the suite a gate.
- **No reconnection policy beyond `406`** — Story 3.10 owns backoff and the gap
  a reconnection leaves. Report `disconnected` honestly and stop.

## Done when

- `createAlpacaStream` implements `MarketDataStream`; no method throws
- Every state in acceptance criterion 2 is reachable in a test against recorded
  frames — bad credential, duplicate connection, server-side close
- The watchdog fires at 165 s of **inbound silence** on a **monotonic** clock,
  proven with a fixture rather than a real wait
- `406` retries and the code says why the backoff is what it is
- `SIGTERM` closes the socket deliberately, and `pnpm test:process` covers it
- `pnpm verify` passes with **no network, no credential, no socket**
- `ws@8` is a declared dependency of `apps/backend` and of nothing else

## Notes

**Written before the replay, and that ordering is a mechanism rather than a
preference** — the story's own "what must not rot" item 3: _a convenience built
first becomes the thing everything is shaped around._ If this task slips, the
correct response is to let it slip rather than to build 3.2.7 first.

---

## What was found

### The client is transport and nothing else

Every decision about _meaning_ was already made: `stream-connection.ts` owns the
state machine, `alpaca-stream-mapping.ts` owns the frames. This file turns socket
events into `StreamEvent`s and hands payloads to the mapper. **It grows no second
state machine**, which was the instruction and is also what let 99 tests run
without a server.

### The whole suite runs with no network, no credential and no real timer

Four things are injected — `connect`, `now`, `setTimer`, `clearTimer` — and the
test harness supplies a scripted socket and a driven clock. **The 165 s watchdog
is asserted in under a millisecond**, and there is a test asserting that the
elapsed wall time to do it is under a second, so a future change that reached for
a real timer fails rather than slows the suite to a crawl.

That is acceptance criterion 6 — _`pnpm verify` passes with no network, no
credential and no socket_ — held by construction rather than by care.

### A test contradicted its own name, and the implementation was right

The test _"does NOT report live merely because the socket opened"_ asserted
`live`. It failed.

**§11.2 defines `live`, in session, as _heartbeat current AND an observation
within 60 s_.** A socket that has only opened has no observation, so it reads
`stale` — and stays `stale` until the first bar arrives. That is the honest
reading rather than an awkward one: mid-session a bar arrives at most about a
minute after its own minute closes (§10.1), so a fresh connection genuinely has
nothing to show for up to a minute. **Saying so beats claiming a feed is
delivering before it has delivered**, and out of hours the same connection reads
`live` because §6.6's silence is a working feed.

Recorded rather than quietly fixed, because the failure was _my assertion
disagreeing with my own test name_ — which is a cheaper thing to catch in a test
than in a status strip.

### `ws`'s `close()` starts a handshake, and §8.5 priced waiting for it

The `SIGTERM` close is **synchronous and not awaited**, and the reason is a
measurement rather than a shortcut. §8.5: a close takes **~240 ms** against a
live socket and **~30 s** against one already dead. `SHUTDOWN_TIMEOUT_MS` is
**5,000 ms** — so awaiting the close event would let a corpse consume **six times
the entire shutdown ceiling**, turning a clean exit into a forced one.

**So the request is what bounds the outage, not its acknowledgement.** The
ceiling covers the rest, and a socket that throws on close is already gone.

### The ordering assertion needed a marker that travels with the step

`index.ts` emits `market stream closed` **immediately beside the close**, which
is the rule its two existing `debug` records were added to establish: _a marker
that does not travel with the step it marks is not a marker._ The process test
asserts `http drained` → `market stream closed` → `database pool closed`.

**The test passes with no stream registered, and that is deliberate.** Nothing
configures a live provider in a test environment, so the closer is a no-op — but
the record still fires, which proves **the shutdown path reaches the close**
rather than proving a socket existed. A test that only passed with a real socket
could not run in `verify`, which has no credentials.

### Two scope lines drawn rather than blurred

- **What a connected browser is owed** — a `feed` message saying the feed is
  going away, then a close (§12.2) — **is not here**, because no browser can
  reach this feed until Story 3.3 builds the fan-out. Stated in the code at the
  point where a reader would otherwise notice it missing.
- **No reconnection policy beyond `406`.** Story 3.10's, and §14.2 makes it
  stronger than scope: what is missed while away is **gone**, so the repair is an
  HTTP backfill and cannot live in a socket client at all.

### What was checked and found already true

- **`ws` is declared in `apps/backend` and nowhere else**, verified by grepping
  every `package.json`. The package declares what it imports.
- **`402` logs a class and nothing more.** A test asserts the log contains no
  mention of _key_, _secret_ or _missing_ — because §8.3 measured the three
  causes as byte-identical, and a log claiming to tell them apart would be
  inventing the distinction.
- **`406` retries; `402` and `400` do not**, and the retry constant's comment
  says it is **politeness, not penalty avoidance** — §8.7 measured five
  back-to-back reconnections at 717/709/709/722/694 ms, every one
  authenticating. A backoff justified by a penalty that does not exist is a
  number nobody can ever revisit.

### Still open, and now owned here

**The `u`-frame envelope is still inferred** (`docs/GAPS.md` entry 7). This task
was named as its owner, with the trigger _the first `u` frame observed in a live
session_. **That has not happened** — this client has never been pointed at the
real socket, because nothing in `verify` may hold a credential. The trigger
stands and the owner is unchanged.

## For a stakeholder — a status report, 2026-09-18

**Where the product is.** A user can explore 518 US companies and their
historical charts. They still cannot watch a price move — **but the piece that
connects us to the live market now exists**, and this was the largest task in the
current story.

**What this task built:** the actual connection to the market data service. It
dials in, identifies itself, asks for the companies we track, and hands every
incoming price to the translator built last time.

**Three decisions are worth explaining, and all three come from things we
measured rather than assumed.**

**1. We had to use a specific networking library, and that is not a preference.**
Modern Node.js has a built-in tool for this kind of connection. We measured that
it **cannot answer the market service's "are you still there?" signal** — and we
separately measured that the service **hangs up on a client that does not answer,
six seconds later.** Since it asks roughly every 54 seconds, using the built-in
tool would mean being disconnected about **once a minute, for ever** — and it
would look like a flaky network rather than a wrong choice. We use the library
that can answer.

**2. The system now notices a connection that has died silently.** During the
spike we watched a connection that had been dead for **four hours and
twenty-one minutes** still reporting itself as perfectly healthy. Nothing about
the connection itself revealed it. So the client now watches for **any** incoming
signal and, after 165 seconds of complete silence, declares the connection dead
regardless of what it claims about itself.

The subtlety is _what_ it watches. It cannot watch for **prices**, because a
quiet company legitimately sends nothing for hours, and overnight the whole feed
is legitimately silent for over an hour. It watches for **any** message including
the routine keep-alive — and that distinction is the difference between a
watchdog that works and one that cries wolf every night.

**3. The server now hangs up on the market deliberately when it shuts down.**
This one prevents an outage on **every single deployment.** Our plan permits
exactly one connection, and we measured that when a second tries, **the existing
one wins**. A deployment briefly runs two copies of our software — so the new
copy is refused until the old one lets go. If the old one just vanishes without
hanging up, the market service can take **hours** to notice, and the new copy has
no data that whole time.

Hanging up deliberately turns a potentially multi-hour outage into one bounded by
a five-second limit we already had. **We also chose not to wait for the hang-up
to complete**, and that is measured too: saying goodbye to a healthy connection
takes about a quarter of a second, but to an already-dead one it takes **thirty
seconds** — six times our entire shutdown budget. So we ask, and move on.

**A small thing that shows the tests earning their keep.** One test failed, and
**the test was wrong.** I had written a test called _"does not report the feed as
live merely because the connection opened"_ — and then asserted that it reported
live. The code disagreed and was right: a brand-new connection during trading
hours has not received a price yet, so it honestly reports _stale_ until one
arrives. My assertion contradicted my own test's name. Much cheaper to catch
there than in a status indicator telling somebody a feed is healthy before it has
delivered anything.

**Everything here is tested without touching the real market**, with no password
and no network — all 99 tests run in about a second, including the one that waits
165 seconds for a dead connection. The clock is fed to the code rather than read
from the machine, which is what makes that possible.

**How this unlocks progress.** The connection exists. **The next story puts its
state on screen** — the first time the product says anything true about the
market _right now_ — and the story after that is the first moving price.

**What a user can see today: nothing new.** The screen is unchanged, and this is
the last task in this story of which that will be quite so emphatically true.
