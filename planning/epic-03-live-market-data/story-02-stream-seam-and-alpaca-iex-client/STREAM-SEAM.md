# The live stream seam — how a market observation reaches this process

**Subject:** the seam, the client, and the three things behind it.
**Owner:** Story 3.2. **Written:** 2026-09-18, at its close.

## 0. If you read one section

**There is one interface, `MarketDataStream`, and three implementations.** The
Alpaca IEX socket, a generated fixture, and a replay of our own stored bars. The
process starts exactly one, chosen by configuration, and `GET /diagnostics/feed`
reports which.

**This document is about OUR CLIENT. [`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) is about THE VENDOR**,
and the split is deliberate: a figure about what Alpaca does belongs there and is
re-measured rather than cited; a decision about how we respond to it belongs
here.

**The five things most likely to be needed in a hurry:**

|                                                      |                                                                                          |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Connection state is **derived, never stored**        | §6.4 held `readyState === OPEN` for **4 h 21 min** on a dead socket                      |
| The watchdog is on **inbound frames**, at **165 s**  | Not `readyState`, and not data — data is legitimately absent for 76 minutes out of hours |
| **Two clocks**, and merging them is a silent failure | §3 below. It shipped once and made `stale` unreachable                                   |
| `406` is **wait and retry**, never fatal             | It happens on **every deploy** by design                                                 |
| A replayed bar **cannot reach the store**            | A runtime guard, because the compiler stopped preventing it                              |

## 1. The seam, and why it was written before anything implemented it

`MarketDataStream` is a **sibling** of `MarketDataProvider`, not a method on it —
`PROVIDER.md` §12 argues that and it is not re-argued here. It was written in
Task 3.2.2 with **no implementation in the same change**, on that document's own
test: _an interface extracted from a working client is a description of that
client; an interface written first is a constraint on it._

**The test of whether that worked was Task 3.2.6's second implementation, and it
answered in a way nobody predicted.** The fixture stream did not contort — it
compiled first time, with no change to the interface. What it did instead was
**expose a defect in the first implementation** that the first implementation's
own tests structurally could not catch. See §3.

## 2. What the interface does NOT carry, and every absence is a measurement

The shape of this interface is mostly the shape of things it refuses to have:

| Absent                              | Because                                                                                                                                                         |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A `connected` flag                  | A connection can die with no event at all; a flag would have read `connected` for 4 h 21 min (§6.4)                                                             |
| A close **code**                    | Five distinct causes all produce `1006` with an empty reason (§8.5). The `closed` event carries **elapsed time** instead, which is the discriminator that works |
| An `onError` implying disconnection | Every error is a **frame**, and a refused socket stays **open** (§4.2, §8.4)                                                                                    |
| A terminal failure state            | `406` is wait-and-retry; a rolling deploy has two processes alive by design and the arriving one is us (§8.2)                                                   |
| A resubscription protocol           | The server remembers nothing across a reconnect and the upstream set is a **constant** (§8.7, §10.2)                                                            |
| Retry                               | `PROVIDER.md` §8.8's wrapper                                                                                                                                    |
| Anything that recovers a gap        | §14.2: what is missed while away is **gone**. The repair is an HTTP backfill and cannot be a socket feature                                                     |

## 3. Two clocks, and merging them is a silent failure

**This is the most transferable thing in this document, and it shipped broken
once.**

| Threshold                  | Measures                                    | Clock                               |
| -------------------------- | ------------------------------------------- | ----------------------------------- |
| **165 s** → `disconnected` | Elapsed since **any** frame                 | **Monotonic** (`performance.now()`) |
| **60 s** → `stale`         | How old an **observation's own instant** is | **Wall** (`Date.now()`)             |

**What happens if one is used for both.** A monotonic reading is near zero and an
epoch millisecond is about `1.76e12`, so subtracting the second from the first is
hugely negative: the 60 s comparison **can never fire**. The feed reports `live`
or `disconnected` for ever and **never `stale`** — silently, with every test
green.

It shipped that way in Task 3.2.5 and was found by Task 3.2.6's fixture stream,
**the first implementation to generate an observation against a real calendar
while reporting a synthetic monotonic clock**. `FeedStatusInputs` now carries
both, and the type change named all 23 call sites.

**Liveness must not move when the machine sleeps** or a suspended laptop
manufactures a disconnection. **Staleness must use the wall clock** because an
instant carried on a bar only has meaning against a calendar. They are not
interchangeable.

## 4. The three implementations, and what each is for

|                       | Feed        | For                                                                                 | Started by                                    |
| --------------------- | ----------- | ----------------------------------------------------------------------------------- | --------------------------------------------- |
| `createAlpacaStream`  | `iex`       | The real market                                                                     | `MARKET_DATA_PROVIDER=alpaca`                 |
| `createFixtureStream` | `synthetic` | `pnpm test`, no credential, no database                                             | `=fixture` + `NON_LIVE_MARKET_DATA=permitted` |
| `createReplayStream`  | `replay`    | **Story 3.4's motion vocabulary**, which cannot be designed against invented prices | `=replay` + the same permission               |

**`sip` is unreachable by construction.** `StreamBarSource` narrows `feed` to the
literal `"iex"`, so substituting `"sip"` is `TS2322`. **A narrow constant was not
enough** — `BarSource.feed` is the wide `MarketFeed`, so the guard had to be on
the destination. Proven by substitution, after the first attempt compiled happily.

## 5. What a green stream suite certifies, and what it does not

**Certifies:** that the client handles every state the spike recorded, that a
streamed bar maps to the same `Bar` a fetched bar does (by being the **same
function**), that `stale` and `disconnected` are reachable and correctly gated,
and that the process starts, subscribes and closes deliberately.

**Does NOT certify:**

- **The vendor.** Every fixture is **transcribed from a document**, not recorded
  from a wire — Story 3.1's captures were deleted with the harness. `MANIFEST.json`
  tiers each one and **nothing in the corpus is `raw`**.
- **The `u` frame's shape.** No verbatim `updatedBars` frame exists anywhere in
  this repository; two fixtures carry an **inferred envelope**. `docs/GAPS.md`
  entry 7, owned by Story 3.3.
- **That anything is reachable.** `GAPS.md` entry 10 — this story shipped three
  implementations with **no construction site** and a green `verify` throughout.
- **That production is serving the real market.** `GAPS.md` entry 9; `verify` has
  no credentials by design, so that is a runtime check and both are **detective**.

## 6. The asymmetry at startup, which looks inconsistent and is not

- **A replay refused during a session THROWS** and the process exits 1. ADR 0030
  §7f: it catches a developer who left `MARKET_DATA_PROVIDER=replay` in their
  `.env` and is about to build against a recording while believing they are live.
  **Failing visibly is the point.**
- **An Alpaca socket that cannot connect does NOT throw.** §8.2: `406` happens on
  every deploy. A process that exited would fail to start on every rollout, and
  `deploy.yml` fails a rollout whose container restarted.

**One protects a developer from being misled; the other protects a deployment
from a condition that is normal.**

## 7. What is open, with owners

- **The `u` envelope** — Story 3.3, at the first `u` seen in a live session.
- **Whether a half-open socket locks out its successor** — Story 3.11, at the
  first deploy that rolls a replica while the feed is connected. §12.2's outage
  bound rests on an inference, not a measurement.
- **The weekend hold** — Story 3.11.

---

## 8. And how it reaches a browser (2026-09-19, Task 3.3.2)

**The gateway is `/market-stream`**, a WebSocket on the Fastify server. A
browser connects, receives a **snapshot**, then one message per upstream frame.
The protocol is `packages/shared`'s; the wire guard is `wire-serialiser.ts`'s.

### The keepalive obligation INVERTS at this boundary, and that is the finding

|                | The Alpaca socket                                  | The browser socket               |
| -------------- | -------------------------------------------------- | -------------------------------- |
| Direction      | **Outbound** — we dial                             | **Inbound** — a browser dials us |
| Who heartbeats | **Alpaca**, every 54 s (§6.3)                      | **We must**                      |
| Our keepalive  | **None** — a second timer measuring the same thing | **Required**                     |
| The ceiling    | No ingress limit applies                           | **240 s of SILENCE**             |

**`HOSTING.md` had already measured the number and named it correctly**: Azure
Container Apps' ingress has a **240-second idle request timeout** — _idle_ in
the premium settings table, so it is a ceiling on **silence** rather than on
connection age. That document drew the consequence for **Epic 10's SSE stream**
and not for this one, because this one did not exist yet.

**Without a keepalive, `LIVE` would be a lie overnight.** §6.6 measured the feed
legitimately silent for **76 minutes** out of hours — so a gateway that only
forwarded observations would be cut every four minutes all night, and the
chrome would report `disconnected` about a feed that was working perfectly.

**So the gateway emits a `feed` message at least every 120 s** — half the
ceiling, for the same reason the watchdog is three missed heartbeats rather than
one. **An application message rather than a WebSocket ping frame**, because
whether the ingress counts a control frame as activity is undocumented and
cannot be measured from here, while a data frame unambiguously is traffic. It
broadcasts **only when a browser is attached**, so an idle deployment does not
wake itself.

### The goodbye must happen BEFORE `app.close()`, and that was measured

§12.2 says a shutdown owes a connected browser a `feed` message saying the feed
is going away and **then** a close. The closer was first placed _after_
`app.close()`, and **the browser received nothing at all** — no goodbye, no
close, just a socket that stopped.

**The cause is Fastify rather than Node.** A bare `server.close()` does **not**
destroy an upgraded socket — probed directly, it leaves `readyState` at `OPEN`
and does not even resolve while one is attached — but `app.close()` resolves, so
Fastify forces those connections shut. A closer placed after it had nothing left
to speak to.

The shutdown order is now:

```text
market gateway closed → http drained → market stream closed → database pool closed
```

and a process test asserts the browser sees `snapshot` → `feed: disconnected` →
close **1001** _(going away)_. **Not 1006**: §8.5 measured that an abnormal
close carries no intent, and a browser seeing one could not tell a deploy from a
network failure.

### Two scope lines

- **The snapshot is empty**, because Story 3.5 owns the current-state model.
  §11.1 is explicit that `{}` is the **true** answer rather than a degraded one,
  so this is not a placeholder — it is what the deployment currently knows.
- **The gateway is registered whether or not a stream exists.** A browser
  connecting to `MARKET_DATA_PROVIDER=none` gets an honest snapshot saying
  _nothing observed, no feed_ rather than a refused upgrade — **a refused
  connection is indistinguishable from a broken one**, which is the ambiguity
  §11.2 exists to remove.
