# Task 3.3.2 — The gateway: a WebSocket endpoint that serves browsers

**Status:** **Complete — 2026-09-19.** `market-gateway.ts`, wired into `index.ts` and the shutdown sequence. **The idle-socket question was already measured in `HOSTING.md` — and the obligation INVERTS at this boundary.** A defect was found by probing the built server and fixed. 19 process tests.
**Story:** [3.3 The Browser Stream & `LIVE` in the Chrome](STORY.md)
**Depends on:** 3.3.1

## Objective

A WebSocket endpoint on the Fastify server that accepts a browser, sends the
snapshot, and forwards the connection state. **One browser is enough**; fan-out
at scale is Story 3.5's.

## What the user can see when this lands

**Nothing.** A socket a developer can connect to with a command-line client.

## What is already decided and must not be re-taken

- **Separate from Epic 10's SSE stream** (§31). Market data is continuous and
  wants bidirectional subscription management; agent execution is an ordered
  stream of server-generated events. **Two things, not one with a flag.**
- **The inbound HTTP idle timeout is four minutes** (`CLAUDE.md`'s intended
  stack), which is a fact about **Epic 10's** stream rather than this one — but
  it is the reason to check what the platform does to an idle **WebSocket**
  before assuming it is exempt.
- **What a shutdown owes a connected browser** (§12.2): a **`feed` message**
  saying the feed is going away, **then** a close. Dropping the socket silently
  leaves the browser inferring a state from an absence, which is the ambiguity
  §11.2's thresholds exist to remove.
- **`registerMarketStreamCloser` already runs on `SIGTERM`**, ahead of the pool
  and inside the 5,000 ms ceiling. This gateway's own shutdown hangs off the
  same sequence rather than inventing a second one.

## Work

- **The endpoint**, registered like the other routes and **not** inside
  `buildServer()` if it needs the stream — `index.ts`'s existing ordering
  comment explains which side of that line a dependency puts it on.
- **Send the snapshot on connect**, then forward. §11.1's shape exactly.
- **Forward the CONNECTION STATE as its own message**, because §11.2 requires
  _our socket is fine and the market feed behind it is dead_ to be sayable, and
  a browser that only ever receives observations cannot distinguish a quiet feed
  from a dead one.
- **Say goodbye before closing.** The `feed` message, then the close.
- **Measure what the platform does to an idle socket**, and write the figure
  down. If it kills one at four minutes, this story's `LIVE` is a lie overnight
  and Story 3.10's reconnection becomes this story's problem instead.
- **No fan-out design.** One browser, one subscription, no coalescing — Story
  3.5 owns all three and §9.5 already settled that a browser subscribes to the
  **whole universe**, so there is no per-browser filter to build.

## Done when

- A browser can connect and receives the snapshot
- Connection state reaches the browser as its own message
- A `SIGTERM` sends the `feed` goodbye **before** the close, asserted in
  `pnpm test:process`
- **What the platform does to an idle socket is measured and recorded**, not
  assumed
- `pnpm verify` passes with no socket opened by the suite

---

## What was found

### The idle-socket measurement already existed, and the finding is the INVERSION

The task said to measure what the platform does to an idle socket and warned
that a four-minute kill would make this story's `LIVE` a lie overnight.
**`HOSTING.md` had already measured it** — Azure Container Apps' ingress carries
a **240-second idle request timeout**, named as _idle_ in the premium settings
table, so it is a ceiling on **silence** rather than on connection age.

**What was not recorded is that the obligation inverts at this boundary:**

|                | The Alpaca socket                                                                          | The browser socket               |
| -------------- | ------------------------------------------------------------------------------------------ | -------------------------------- |
| Direction      | **Outbound** — we dial                                                                     | **Inbound** — a browser dials us |
| Who heartbeats | **Alpaca**, every 54 s (§6.3)                                                              | **We must**                      |
| Our keepalive  | **None** — `LIVE-DATA.md` says adding one would be a second timer measuring the same thing | **Required**                     |

`HOSTING.md` drew the consequence for **Epic 10's SSE stream** and not for this
one, because this one did not exist when it was written. **The task's fear was
correct**: §6.6 measured the feed legitimately silent for **76 minutes** out of
hours, so a gateway that only forwarded observations would be cut every four
minutes all night and the chrome would report `disconnected` about a feed
working perfectly.

**The keepalive is 120 s** — half the ceiling, for the same reason the watchdog
is three missed heartbeats rather than one. **An application message rather than
a ping frame**, because whether the ingress counts a control frame as activity
is undocumented and unmeasurable from here, while a data frame unambiguously is
traffic. It broadcasts **only when a browser is attached**, so an idle
deployment does not wake itself for nobody.

### A real defect, found by probing the built server rather than by reasoning

**§12.2's goodbye did not arrive.** The closer was placed after `app.close()`,
following the pattern Task 3.2.5 established for the Alpaca socket — and a
browser received **nothing at all**: no goodbye, no close, just a socket that
stopped.

**The cause is Fastify rather than Node, and I probed it rather than guessing.**
A bare `server.close()` does **not** destroy an upgraded socket — it leaves
`readyState` at `OPEN` and **does not even resolve** while one is attached — but
`app.close()` resolves, so Fastify forces those connections shut. By the time a
closer placed after it ran, there was nothing left to speak to.

**So the gateway closes BEFORE the drain**, which is also the more honest order:
a browser is told the feed is going away by a process that still has a feed.

```text
market gateway closed → http drained → market stream closed → database pool closed
```

Verified against the built server: `snapshot:live → feed:disconnected → close 1001`.

**1001 rather than 1006**, deliberately: §8.5 measured that an abnormal close
carries no intent, and a browser seeing one could not tell a deploy from a
network failure. `1001` is _going away_, which is exactly what happened.

### `ws` directly rather than `@fastify/websocket`

**`ws@8` is already a dependency** — Task 3.2.5 added it on a measurement
(§4.6, §8.6) and this repository has its behaviour written down in detail.
`@fastify/websocket` is a wrapper over the same library whose behaviour nobody
here has measured, and `CLAUDE.md` says to resist adding libraries before
complexity demonstrates the need.

**The cost is stated rather than hidden**: ~15 lines of upgrade handling, and
the endpoint does **not** appear in Fastify's route table, so `server.test.ts`'s
walk does not see it — the same situation `/diagnostics/*` is in for its own
reason. A reader looking for every route will not find this one there.

**The path is matched explicitly** rather than by the library, so an upgrade to
any other path is **refused**. Verified: a connection to `/not-the-stream` is
rejected.

### A type mismatch that was worth fixing at the source

`readFeedDiagnostic` types `status` as `string | null` — correct for an HTTP
response schema — but `WireFeedState` wants `FeedStatus`. **A cast would have
compiled and been wrong in the way that matters**: it would have let a future
widening of the diagnostic reach the socket unchecked.

So `readFeedState` was split out, returning **domain types**, and
`readFeedDiagnostic` now derives its wire strings from it. One fact, one home,
and the socket is typed on the narrow end.

### What was deliberately not built

- **No fan-out design.** One browser, no coalescing — Story 3.5 owns both, and
  §9.5 already settled that a browser subscribes to the **whole universe**, so
  there is no per-browser filter to build.
- **The snapshot is empty.** Story 3.5 owns the current-state model, and §11.1
  is explicit that `{}` is the **true** answer rather than a degraded one.
- **The gateway is registered whether or not a stream exists.** A browser
  connecting to `MARKET_DATA_PROVIDER=none` gets an honest snapshot rather than
  a refused upgrade — **a refused connection is indistinguishable from a broken
  one**, which is the ambiguity §11.2 exists to remove and §36 forbids.

## For a stakeholder — a status report, 2026-09-19

**Where the product is.** A user can explore 518 US companies and their
historical charts. They still cannot watch a price move. This was the second of
seven tasks in the story that changes that — **`LIVE` appears on screen at task
five.**

**What this task built: the door a browser comes through.**

The previous task defined the language; this one opens the connection that
speaks it. A browser connects, immediately receives **everything we currently
know**, and then receives updates as they arrive.

**The interesting finding is one of those "we already knew this, in the wrong
place" moments.**

The task asked us to check what our hosting platform does to a connection that
sits quiet. It turns out **we measured that months ago** and wrote it down: our
platform closes any inbound connection that is silent for **four minutes**.

But that note was written about a _different_ future feature, and nobody had
connected it to this one. And the connection matters enormously, because of an
inversion that is easy to miss:

- **Our connection to the market data supplier**: _they_ send us a heartbeat
  every 54 seconds, so we need no keepalive at all. We wrote that down
  explicitly — adding one would be a second timer measuring the same thing.
- **A browser's connection to us**: _we_ are the supplier now, so **we** have to
  send the heartbeat.

**Without it, this would have failed every night.** Our market feed is
legitimately silent for over an hour outside trading hours — so a browser left
open overnight would have been disconnected every four minutes and told the feed
was broken, when it was working perfectly. **Exactly the lie this story exists
to avoid telling.** The fix is a small status message every two minutes.

**And a real defect, found by actually running it rather than reasoning about
it.**

When the server shuts down, we promised it would **tell** connected browsers the
feed is going away rather than just vanishing — because a browser that has to
guess will guess wrong, and will report a five-second deployment as a broken
connection.

I wrote that, followed the pattern from a previous task, and then **connected a
real browser and pulled the plug.** The browser got **nothing**. No goodbye, no
close — just a connection that stopped.

The cause took a direct experiment to find: the web framework we use **forcibly
severs upgraded connections** during its own shutdown, earlier than expected.
(I checked the layer beneath it too — the raw server does _not_ do this — so the
behaviour belongs to the framework.) By the time our goodbye ran, there was
nothing to speak to.

**Fixed by saying goodbye first**, which is also the more honest order: a browser
is told the feed is going away by a system that still _has_ a feed. Verified
end-to-end, and there is now an automated test that fails if the order is ever
changed back.

**One small decision worth reporting.** When we close a browser's connection we
use the code that means _"going away"_ rather than the generic one. We measured
during the spike that the generic code carries **no information at all** — five
completely different causes produce it — so a browser seeing it could not tell a
routine deployment from a network failure.

**How this unlocks progress.** The door is open and the language is spoken
through it. Next comes the words a person reads, then the wiring into the page.
**`LIVE` appears on screen at task five of seven.**

**What a user can see today: nothing new.** The change is behind the screen, and
three tasks from now it is on it.
