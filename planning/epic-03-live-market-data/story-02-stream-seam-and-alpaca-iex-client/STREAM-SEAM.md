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

| Threshold                  | Measures                                     | Clock                               |
| -------------------------- | -------------------------------------------- | ----------------------------------- |
| **165 s** → `disconnected` | Elapsed since **any** frame                  | **Monotonic** (`performance.now()`) |
| **60 s** → `stale`         | How old an **observation's own INTERVAL** is | **Wall** (`Date.now()`)             |

> **AMENDED 2026-09-19, Task 3.3.4.** The word `INTERVAL` above was `instant`
> until today, and the difference was a shipped defect: §7.3 measured that a
> bar's `t` marks the **start** of the minute it describes and that the frame
> arrives when that minute closes, so the freshest observation this feed can
> hold is **60.5 s old on arrival** and a threshold applied to the opening
> instant fired on every healthy delivery — `live` was unreachable in session.
> `LIVE-DATA.md` §11.2 carries the full account. **The rule also moved to
> `packages/shared/src/feed-liveness.ts`** when the browser became the second
> thing applying it; what stays in `stream-connection.ts` is the adapter that
> collapses a vendor handshake phase into one boolean.

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

> **AMENDED 2026-09-22, Task 3.6.4 — there is now a THIRD clock reading on the
> wire, and this table deliberately does not gain a row.** Every frame the
> gateway sends carries `sentAt`, the **server's** wall clock at the send, so a
> browser can time `PRODUCT_SPEC.md` §28's leg (§8.9). It is worse than either
> clock above as a threshold input: a server's wall clock read on a viewer's
> machine is skew as readily as latency, so a rule keyed on it would fire on a
> viewer whose clock is a minute out and never on a feed that has stopped.
> **It reaches neither `feed-liveness.ts` nor either adapter over it**, and
> `pnpm invariants` (`the-send-instant-is-not-a-clock`) is what makes that a
> check rather than a sentence — with `pnpm break
the-send-instant-becomes-a-clock` proving the check goes red.
> [ADR 0033](../../../docs/adr/0033-a-send-instant-on-the-wire-for-measurement-only.md)
> carries the decision.

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
- ~~**That a stream left alone in a process produces anything.**~~ **Closed
  2026-09-20 by Task 3.4.3** — see §9.
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

## 8. And how it reaches a browser (2026-09-19, Tasks 3.3.2 to 3.3.7)

> **Story 3.3 decided this is its home rather than writing a second document**
> (Task 3.3.7). The alternative was `BROWSER-STREAM.md` beside this one, and it
> was rejected on the section title: this file is _how a live observation
> reaches this process_ and the browser is **the next hop of the same journey**,
> not a second subject. A reader following an observation from the venue to a
> screen should not change documents halfway. What the story decided that
> **outlives** it is in [ADR 0031](../../../docs/adr/0031-what-a-transport-without-a-schema-layer-owes.md);
> what a reader needs in order to follow the journey is here.

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

### 8.6 The browser's own end, and the second connection (Tasks 3.3.4 to 3.3.6)

**There are TWO connections between a venue and a reader**, and the browser is
downstream of both:

| Link                  | Who watches it                          |
| --------------------- | --------------------------------------- |
| Alpaca → our backend  | `apps/backend/src/stream-connection.ts` |
| our backend → browser | `apps/frontend/src/market/live-feed.ts` |

Either fails while the other is perfect, and the chrome shows **one** word, so
the two answers are combined with `worseFeedStatus` — a chain is as live as its
weakest link.

**The browser derives rather than trusting the transmitted status**, and the
reason has a number in it: the keepalive above is the rate at which an unchanged
feed state is re-sent, so **the server's word can be 120 s old**. A feed that
went stale a second after a `feed` message would be reported live for nearly two
minutes.

**One module opens the socket and knows the address** —
`market/market-stream-client.ts`, held there by `pnpm invariants`'
`one-home-for-the-socket`, which is `api-client.ts`'s rule applied to the second
network boundary. The **path** is in `packages/shared` so the two halves cannot
drift; the **origin** is a build-time fact about a deployment and stays in
`api-base-url.ts`.

**`MARKET_STREAM_PATH` aside, nothing above the transport knows a URL exists.**
The hook holds a connection record in a ref and only the derived _view_ in
state, so Task 3.3.2's 120 s keepalive costs a bounded one-off render rather
than thirty an hour — measured on a production build at **0 `longtask` entries
and 0 DOM mutations over 60 s**, with the strip's text byte-identical
throughout.

> **AMENDED 2026-09-22, Task 3.6.5 — a subscription sent after a close blanked
> the page, and the guard is now the socket's own state.** Task 3.5.6's
> `subscribe` was gated on an `opened` flag that `open` set and nothing
> cleared, so a subscription change landing in the 500 ms between the
> gateway's `1001` and the retry's dial called `send` on a `CLOSING` socket.
> `WebSocket.send` throws for that; the call came from a React effect; an
> effect's throw is a render error; and nothing above `App` catches one — the
> page went blank until a reload. Found by `market-reconnect.spec.ts`, three
> tests at once, on a developer's machine and not on CI, and bisected to
> `main`. The send is now gated on `readyState === OPEN`, the subscription is
> kept for the next socket as the retry already assumed, and `pnpm break
a-subscription-after-a-close-throws` proves the unit test goes red.

### 8.7 What the strip says when it breaks, and the rate at which it learns

Three states, all produced on a running page rather than drawn:

| What happened                           | Feed cell                                | Backend cell  |
| --------------------------------------- | ---------------------------------------- | ------------- |
| No provider configured                  | `NOT CONFIGURED`, **no connection word** | `healthy`     |
| Backend dies under a loaded page        | venue **retained** · `DISCONNECTED`      | `unreachable` |
| Cold load with the backend already down | `UNKNOWN` · `DISCONNECTED`               | `unreachable` |

**The venue is retained in the second row and that is the design**: provenance
is a fact about the deployment and is true whether or not anything is connected,
so the feed cell is fed by the HTTP answer and never by the socket.

**And the defect the set found** — for up to 30 s the strip read
`feed · disconnected` beside `backend · healthy`, each cell honest and the pair
pointing away from the fault, because **the live feed is the first surface in
this chrome faster than its neighbours**. The repair is a prompt rather than an
answer (ADR 0031, decision 3).

### 8.8 What a green browser suite certifies about this, and what it does not

`market-connection.spec.ts` drives the connection cell in both directions and
covers `LIVE`, `STALE` and `DISCONNECTED`. **It does that by furnishing the
states from inside the browser**, because CI has no credential and therefore no
live feed — which is also the standing limit: **no browser test here has ever
watched a real Alpaca frame reach a screen.** The suite certifies that the page
renders what the protocol says, not that the vendor says it.

### 8.9 `PRODUCT_SPEC.md` §28's figure, whole, and the field that made it takeable (2026-09-22, Task 3.6.4)

**For four days this section could only quote half a journey.** Task 3.4.8
measured _frame delivered to the page → price on screen_ at **p95 52 ms** and
said so; §28's clock starts at _server-received_, and nothing on the wire said
when the server had done anything (`docs/GAPS.md` entry 12, now closed).

**Every frame the gateway sends now carries `sentAt`**, its own wall clock at
the send, per client, on `snapshot`, `bars`, `feed` and the farewell alike
([ADR 0033](../../../docs/adr/0033-a-send-instant-on-the-wire-for-measurement-only.md)).
It is a **third** clock reading and §3's table deliberately gains no row for it:
the field is read by nothing that computes a status, and `pnpm invariants`
holds that.

**Taken at 518 subscribed securities on `/securities`, production build, two
pages, 60 frames each carrying the whole universe** — the conditions and the
verbatim samples are in Task 3.6.4's record:

| Leg                                     | p50   | p95         | max    |
| --------------------------------------- | ----- | ----------- | ------ |
| gateway send → frame in the page (wire) | 4 ms  | **6 ms**    | 84 ms  |
| frame in the page → table DOM updated   | 46 ms | 57.1 ms     | 67 ms  |
| **gateway send → table DOM updated**    | 49 ms | **68.1 ms** | 131 ms |

**Read the ends before the number.** §28's end is _application state_; the
third row's end is _repainted_, which is later, so the row bounds §28's figure
from above. The decode and reducer run synchronously in the listener behind the
instrument's, so _application state_ is the first row plus a sub-millisecond.

**Read the conditions before quoting it as the deployed figure.** Server and
browser shared one machine and one clock, so the network leg is a loopback
socket and a negative sample was impossible. Against the deployed gateway the
clocks differ and a negative p50 is the viewer's clock ahead of the server's,
not a frame arriving before it was sent — publish p50 / p95 / max with n and
name both ends every time. Story 3.11's criterion 4 owns that re-take and its
`STORY.md` carries the four-line instrument.

**The cost of the field, read off the wire:** 36 bytes a frame — a universe
`bars` frame of 58,187 bytes against 58,151 without — at most sixteen frames a
minute.

---

## 9. A stream that drives itself (2026-09-20, Task 3.4.3)

**This is §5's list one level further out, and it cost a task.** Story 3.2
shipped three implementations that **nothing constructed**; Task 3.2.9
constructed them; and for two stories after that, **none of them delivered an
observation into a running process** while `pnpm verify` stayed green.

The reason is one sentence: **every test drove them by hand.** A test calls
`tick()`, or injects a `StreamEvent`, so the thing a process actually depends on
— _time passing is enough_ — was asserted nowhere.

> The repair is not finished when a number moves. It is finished when something
> would go red if it stopped.

### 9.1 Two faults, and the one that was expected was innocent

Task 3.4.2 handed this task a suspect by name: `createStoredReplaySource`, with
three of four candidate causes ruled out. **It was the wrong suspect**, and an
instrument settled it in ninety-one milliseconds — the source, driven directly
against the real store, returned the 13:30 slice with five symbols in it.

| Where                  | Fault                                                           |
| ---------------------- | --------------------------------------------------------------- |
| `market-stream.ts`     | `defaultReplayStart` **validated one date and stamped another** |
| `fixture-stream.ts`    | **no clock at all** — `tick()` was the only way a minute passed |
| `replay-bar-source.ts` | none. It was already correct                                    |

**The replay's default start is the finding worth carrying.** Task 3.4.2 added a
calendar walk to stop it landing on a weekend, and the walk asked
`marketSessionOn(marketDateAt(day))` — the candidate's **market** date — then
built the instant from that candidate's **UTC** calendar fields. Those two agree
at midday and disagree before about 04:00 UTC. Measured on 2026-09-20 at
**03:36 UTC**: the market date read Friday **2026-09-11**, a session; the instant
read Saturday **2026-09-12T13:30Z**, a day the store holds nothing for.

**The test could not see it, because the test made the same conversion the code
did.** All four of its cases ran at `12:00:00Z`, and its assertion —
`marketSessionOn(marketDateAt(from))` — converted the answer back along the axis
that was wrong. A check written in the same units as the thing it checks cannot
see a units error.

The repair is that the walk now returns the session's **own `open` instant**,
which closes a second latent bug with it: a hard-coded `13:30Z` is 09:30 **EDT**
only, so every default taken between November and March would have started an
hour before the bell.

### 9.2 Which implementations are meant to drive themselves, and which is not

|           | Driven by                                    | Self-driving                |
| --------- | -------------------------------------------- | --------------------------- |
| `replay`  | its own poll timer, against the replay clock | **yes**                     |
| `fixture` | a timer at **60 s**, §10.1's grain           | **yes, since this task**    |
| `alpaca`  | **frames arriving on a socket**              | **no, and that is correct** |

**A timer on the Alpaca client would be a defect rather than a feature**: a
client that invented minutes the vendor had not sent would be manufacturing
prices. Its equivalent claim — _a frame produces an observation_ — is what
`alpaca-stream.test.ts` already asserts.

**The fixture's timer runs at the product's cadence and not faster.** A
generator emitting every second because a developer is impatient produces a
motion vocabulary designed for a market that does not exist, which is Story
3.4's own warning one level down. A test shortens it by injecting the timer.

### 9.3 What is now asserted, and what proves the assertion

`self-driving-streams.test.ts` starts each self-driving stream **through
`createMarketStream`** — the construction site, not the file — advances an
injected timer, and asserts an observation arrived. **Nothing in it calls
`tick()`**, and that absence is the test.

Two `pnpm break` entries hold it, both restoring the tree exactly as it shipped:

- `pnpm break fixture-stream-drives-itself`
- `pnpm break replay-start-is-a-real-session`
