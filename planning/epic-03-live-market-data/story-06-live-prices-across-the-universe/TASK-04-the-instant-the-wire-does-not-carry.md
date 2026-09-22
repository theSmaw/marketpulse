# Task 3.6.4 — The instant the wire does not carry, and §28's p95 at universe scale

**Status:** **Complete — 2026-09-22.** Every frame the gateway sends now carries `sentAt`, the server's own clock at the send ([ADR 0033](../../../docs/adr/0033-a-send-instant-on-the-wire-for-measurement-only.md)); §28's whole journey was taken at 518 subscribed securities on a production build — **p95 68.1 ms** gateway send → universe table repainted, of which the wire leg is **p95 6 ms**, n = 60; `docs/GAPS.md` entry 12 is closed; Stories 3.4 and 3.11 are told in their own files. The stamp costs **36 bytes a frame**, read off the wire. The instrument is deleted; the constraints became a `pnpm invariants` entry and a process-suite assertion, both break-verified.
**Story:** [3.6 Live Prices Across the Tracked Universe](STORY.md)
**Depends on:** 3.6.1

## Objective

Criterion 5: **event → application state under 250 ms p95, excluding provider
latency, measured at universe scale rather than for one row.**

**It cannot be measured today, and this story owns the repair.** That ownership
moved here on 2026-09-21 from Story 3.11, at Story 3.5's close.

## What the user can see when this lands

**Nothing.** One field on a wire message and a published figure.

## Why three stories could not measure it

Task 3.5.8 enumerated **every field on the wire**. The only instant a browser
receives is `WireObservation.startsAt` — **the minute the bar covers**, a fact
about the market rather than about when we sent anything. `WireFeedState`
carries `status`, `feed` and `marketOpen`. The `subscribe` message Task 3.5.6
added carries no timestamp either.

**There is nothing to subtract from**, and §28 excludes provider latency, so
`startsAt` cannot substitute.

**Story 3.4's criterion 5 is the same sentence and that story did not close
because of it.** Story 3.11's criterion 4 is the same measurement a third time.
`docs/GAPS.md` entry 12 carries it. **A criterion three stories cannot meet and
none owns is a criterion that never gets met** — the shape this repository
records against _does it feel alive_, deferred seven times before Task 3.4.4
finally took it.

**The browser half is already measured and is not the problem**: Task 3.4.8 took
frame → price on screen at **52 ms p95**, with 200 ms of the budget unspent.

## The change, and the four constraints on it

**A server-stamped instant is added to the wire** — the moment the backend
_sends_ the frame, from the backend's own clock.

1. **A new field, never a second meaning for `startsAt`.** That field is
   load-bearing in the identity block's qualifier, in the revision rule that
   stops the current market state walking backwards, and in every stored row.
   Giving it a second meaning breaks three things at once.
2. **A third clock reading, for measurement only.** `STREAM-SEAM.md` and Task
   3.2.6 record a measured defect: the **165 s** disconnection threshold is
   **monotonic** and the **60 s** staleness threshold is **wall clock**, and
   using one for both is a silent failure in which `stale` can never fire with
   every test green. **This field must not reach `feed-liveness.ts`.**
3. **The reading is honest only as a distribution.** A server clock and a
   browser clock disagree; a negative sample is **skew**, not negative latency.
   Publish it with its ends named and with n, and never a single reading — this
   repository's own rule is that latency must not be asserted without a large n.
4. **It costs a field on every frame**, 332 times a minute. Size it against the
   **56.9 KiB** the universe already costs and say what it became.

## Work

- Add the field to `packages/shared/src/market-stream-protocol.ts`, stamped
  where the gateway sends rather than where the observation was made
- Subtract it in the browser at the same two ends Task 3.4.8 used, so the two
  halves compose into one figure rather than two incomparable ones
- Take the figure **at universe scale** — 518 subscribed, a real burst, not one
  row
- Publish it: the whole journey, its ends named, its n, and its skew caveat
- **Close `docs/GAPS.md` entry 12**, and tell Stories 3.4 and 3.11: 3.4's
  criterion 5 becomes measurable retroactively, and 3.11 re-takes rather than
  invents
- Re-measure the payload and record what the field cost

## Done when

1. A server-stamped instant is on the wire, as a new field, with the four
   constraints above honoured
2. §28's full figure is published at universe scale with its ends, its n and its
   skew caveat — or an honest statement of why it still cannot be taken
3. `docs/GAPS.md` entry 12 is closed or amended with what actually happened
4. Stories 3.4 and 3.11 are told, in their own files, in words they can act on
5. `pnpm verify` passes

---

## What was done — 2026-09-22

### 1. The field: `sentAt`, on every server message, one per frame

`SnapshotMessage`, `BarsMessage` and `FeedMessage` each gained
**`sentAt: string`** — an ISO 8601 instant, the same spelling every other
instant on this wire uses. The gateway stamps it from an injected `wallNow`
(`Date.now()` in production) **at each send, per client**: `publishObservations`
encodes one payload per browser, and a single reading shared across that loop
would put every client after the first on an instant that predates its own
send. The farewell and the 120 s keepalive are stamped too — one rule, every
frame, no frame that is the exception.

**Constraint 4 decided the grain.** One instant per frame rather than per
observation: a frame carries up to 518 securities and the question is about the
frame's journey. Read off the wire rather than computed, the stamp is **36
bytes** — `"sentAt":"2026-09-22T03:10:56.935Z",` — on a universe `bars` frame
of **58,187 bytes** (58,151 without it, 0.06%), at most sixteen frames a minute. Later frames in the same run were 59,402–59,503 bytes as the fixture's generated prices grew a digit; the stamp's 36 held on every one.
The eleven places that say `56.9 KiB` were deliberately not rewritten; Task
3.5.8's amendment already decided that churn on that figure is not worth its
cost, and this one is under a tenth of a percent.

**The decoder refuses a frame without it**, with its own reason (`no send
instant`) and without disturbing the reasons that already exist — an unknown
type is still reported as unknown. The only producer of this protocol is our
own gateway and it stamps everything, so an unstamped frame is a shape this
product does not send; admitting it would make the field optional in every
reader, which is how a measurement-only field quietly becomes one that is
sometimes there. **The protocol version is not bumped**: an older browser
ignores a field it does not know, and the deploy rolls the backend before the
frontend, so no new browser ever meets an old gateway.

**It does not enter application state.** `LiveFeedConnection` holds no
`sentAt`, no latency and no age — §11.1 keeps `staleSeconds` off the wire
because a derived age is a clock read wearing a different name, and the same
argument applies to a field on a view object. The instrument reads the raw
frame; nothing on a screen reads the stamp. ADR 0033's reversal trigger is the
first surface that does.

### 2. Two constraints became mechanical, and both breaks landed

| Constraint                               | Now                                                                                                                                                                                                                                   | Break                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| The stamp is the gateway's clock at send | `market-gateway.process.test.ts`: two assertions over a real socket, with the clock injected — the snapshot, the subscribe's answer and the bars carry the clock's three readings, and two clients published one batch get two stamps | `pnpm break the-gateway-stamps-nothing`       |
| It never reaches the liveness rule       | `pnpm invariants` — `the-send-instant-is-not-a-clock` reads `feed-liveness.ts`, `stream-connection.ts` and `live-feed.ts` through `withoutComments` and refuses the token                                                             | `pnpm break the-send-instant-becomes-a-clock` |

Both went red on the first run and restored byte-identical. The invariant
count is now twenty; the run prints its own figure.

**The compiler did the sweep.** `WireFields` is a mapped type with `-?`, so the
new field on the interface and not on the field map was `TS2741` naming it, and
the required field on the type named **every hand-built frame in the tree** —
three e2e specs, three frontend test files, the backend's codec test and the
protocol's own — seventeen frames, none of which could be missed. That is the
shape ADR 0031 exists for, arriving on the first protocol change since the wire
froze.

### 3. The figure — §28's whole journey, at 518 securities, on a production build

**Conditions, because a figure without them is not re-measurable.** Production
bundle (`vite build`, minified React) served by `vite preview` on `:4173`;
backend `dist/index.js` on `:3000`, `CORS_ORIGIN` pointed at the preview;
**`MARKET_DATA_PROVIDER=fixture`**, `NON_LIVE_MARKET_DATA=permitted`. Chromium
via Playwright, **two pages in two contexts** on `/securities`, each subscribed
to the whole universe by being on that page, **530 `<tr>` in the DOM** (518
rows and twelve sector headings), 1280×720. macOS 14 / arm64, loopback,
2026-09-22 03:10–03:42 UTC. **Server and browser on one machine, so one clock**
— skew is zero by construction here and the caveat is for the deployed re-take.

**Three ends, and which is which.** Every `bars` frame was stamped three times:
`sentAt` by the gateway; `receivedWall` by a `message` listener the instrument
attached in the page's `WebSocket` constructor, ahead of the application's own;
and `domWall` by a `MutationObserver` on the universe table, at the first
mutation after the frame. So:

- **send → received** is the leg §28's clock starts at: the encode, the socket
  and the network. The application's decode and reducer run synchronously in
  the listener registered after this one, so _application state_ is this figure
  plus a sub-millisecond that Task 3.4.8 already measured inside its 52 ms.
- **received → DOM** is Task 3.4.8's leg, re-taken on this surface: decode,
  reduce, gate, render, commit.
- **send → DOM** is the whole journey, and it is **past** §28's end — the
  target says _application state_, this says _repainted_ — so it bounds §28's
  figure from above.

**60 `bars` frames, each carrying all 518 securities, one a minute per page:**

| Leg                    | p50   | p95         | max    | min   |
| ---------------------- | ----- | ----------- | ------ | ----- |
| send → received (wire) | 4 ms  | **6 ms**    | 84 ms  | 2 ms  |
| received → DOM         | 46 ms | 57.1 ms     | 67 ms  | 34 ms |
| **send → DOM (whole)** | 49 ms | **68.1 ms** | 131 ms | 36 ms |

Per page, so a reader can see the two runs agree rather than take a pooled
figure on trust:

| Page | n   | send → received p95 | send → DOM p95 |
| ---- | --- | ------------------- | -------------- |
| 0    | 30  | 5.5 ms              | 64.8 ms        |
| 1    | 30  | 6.1 ms              | 66.8 ms        |

The whole-journey samples from page 0, verbatim, in milliseconds:

```text
58, 68, 52, 55, 48, 56, 43, 42, 52, 52, 55, 54, 46, 56, 46, 49, 60, 59, 51, 61, 53, 48, 45, 47, 48, 49, 44, 41, 48, 131
```

**Against §28's 250 ms p95 the whole journey is 27% of the
budget**, and the leg this task added the instrument for — the gateway, the
socket and the loopback network — is **6 ms at p95**. The browser
leg reproduces Task 3.4.8's 52 ms almost exactly on a surface with 518 rows
rather than one, which is the result Task 3.6.3's controlled pair predicted:
the reducer is not the cost, the rendering is, and on a production build the
rendering of 518 rows is about the same as one identity block.

Two frames, verbatim heads, so the record carries the bytes and not only the
conclusion:

```text
{"type":"snapshot","version":1,"sentAt":"2026-09-22T03:06:48.234Z","observations":{},"feed":{"status":"live","feed":"replay","marketOpen":false}}
{"type":"bars","version":1,"sentAt":"2026-09-22T03:10:56.935Z","observations":{"XLK":{"startsAt":"2026-09-16T13:30:00.000Z","open":100,"high":100.25,"low":99.89
```

The first is the whole of an empty snapshot — **145 bytes with the stamp, 109
without** — and it is the true answer after a restart (§11.1), which is what the
first three seconds of every one of these runs looked like.

### 4. What the burst was, and why it is the heavier shape

§7.4 measured the real feed as **332 bars inside a 243 ms burst**, arriving as
about sixteen frames of twenty. The fixture stream — and ADR 0030's replay, for
that matter — emits a minute's bars as **one frame of 518**. So every sample
above is a **58 KiB frame**, not a 3.6 KiB one, and the wire leg is measured
against the heaviest frame this gateway can send rather than the typical one.
The figure is an upper bound on the wire leg for that reason too.

### 5. Long tasks, and a finding handed to Task 3.6.5

An unbuffered `longtask` observer ran on both pages for the whole run. What it
recorded, attributed by timestamp against each frame's arrival:

| Where                                               | Page 0                            | Page 1                                        |
| --------------------------------------------------- | --------------------------------- | --------------------------------------------- |
| Cold load, before any frame                         | **68 ms** at 64 ms                | none recorded                                 |
| On a `bars` arrival (within 300 ms of receipt)      | **60, 52, 51, 53 ms** — 4 of 30   | **63, 56, 54 ms** — 3 of 30                   |
| The instrument's own 30 s `evaluate`, and the close | 65, 57 ms; 60, 79 ms at the close | 53, 56, 51, 55, 50 ms; 73, 71 ms at the close |

**Fifty-three of sixty frames repainted 518 rows under the 50 ms line** — the
browser leg's p50 is 46 ms — and the seven that did not were 51–63 ms. The
instrument's own `page.evaluate` every 30 s cost a task of about the same size
and is attributed to itself by its cadence; the two largest on each page are
the final dump and the browser closing, which is also where the wire leg's
**84 ms and 38 ms maxima** came from — the sixtieth frame on each page landed
while the instrument was serialising and tearing down. The p95s are untouched
by either.

The cold-load task is Epic 14's known breach (`PRODUCT_SPEC.md` §28's
amendment) and belongs to nobody in this story. **The per-frame task is Task
3.6.5's**, and it is worth its attention because it is a **production-build**
figure for the thing Tasks 3.6.2 and 3.6.3 measured on a development build at
127–265 ms: on the real bundle a 518-row repaint sits **just over §28's 50 ms
line**, not five times over it. That changes the size of 3.6.5's problem
without changing its existence.

### 6. The replay could not run against this store, and that is recorded rather than worked around

The task said _a real burst_, and the first run used ADR 0030's replay of our
own bars. It emitted **nothing** and `GET /diagnostics/feed` read
`disconnected` with `observedAt: null` throughout. `GET /diagnostics/freshness`
said why: the store on this machine holds bars through **2026-09-11**, six
sessions behind, and the replay's default start walks back a week from now to
**2026-09-14's open** — a session this store has no bars for. There is no
configuration key for the start instant, so the honest options were a metered
backfill of six sessions across 518 securities, or the fixture stream, which
produces the identical frame shape for the leg being measured. **The fixture
was chosen and is stated in the conditions above.**

Two things are worth keeping from it. The replay's guard held in the right
direction — it reported `disconnected`, not `live`, about a stream with
nothing to emit, which is the failure ADR 0030 §7f most feared and did not
produce. And a replay that silently has no session to start from is a
developer-side trap with no symptom but an empty table; **the owner is the
first developer it costs an hour**, and the repair is a log line at start
naming the session it chose and whether the store holds it.

### 7. The record swept

- **`docs/GAPS.md` entry 12** is struck and closed at the foot of the entry,
  with what is and is not closed by a loopback take.
- **Story 3.4's `STORY.md`** carries a dated section in its own words:
  criterion 5 is measurable and bounded from above by this figure; 3.4.10 may
  quote rather than re-take; the four-line instrument is written out.
- **Story 3.11's `STORY.md`** carries the re-take recipe, what a loopback take
  could not do, the skew reading to expect against the deployed gateway, and
  the instruction not to correct for skew by subtracting the minimum.
- **`LIVE-DATA.md` §11.1** and **`STREAM-SEAM.md` §3** carry dated amendments;
  **`STREAM-SEAM.md` §8.9** is the standing account of the figure.
- **`PRODUCT_SPEC.md` §28** carries a dated amendment under _Market updates_:
  measured, where, and that it is a loopback figure until Story 3.11.
- **`CLAUDE.md`** gains one settled bullet; **ADR 0033** is written and indexed.

### 8. The instrument, so the next take does not re-derive it

Four lines, and the one trap: wrap `window.WebSocket` from an
`addInitScript` — this only works because nothing calls `routeWebSocket`, which
Task 3.4.8 found replaces the page's `WebSocket` after init scripts run;
record `Date.now()` in a `message` listener added in the constructor, so it
runs ahead of the application's; subtract the frame's `sentAt`; and stamp the
table's first mutation after the frame through a `MutationObserver` scoped to
the `<table>`, with `characterData` on because React updates text nodes in
place. Two pages in two contexts double n at no cost in wall time, and a
`longtask` observer with `buffered: false` runs beside it. The script is
deleted, as `ALPACA.md` §11's shape requires; this section is what survives it.

## For a stakeholder — a status report, 2026-09-22

**Where the product is.** On the securities page, 518 prices move on their own
once a minute, marked as they arrive, and the last two tasks decided how that
table behaves at scale. **This task asked one question about it: how long does
a price take to get from our server to the screen?** We had promised an answer
early on — a quarter of a second, at the slow end — and the honest state was
that **we had never been able to check.**

**Why we could not check, in plain terms.** To time a journey you need to know
when it started. The messages our server sends to a browser carried the time
the market data was _about_ — the minute a price covers — but never the time
the message _left our server_. So the browser could measure how long it took
to draw a price once it arrived (we did that earlier: about a twentieth of a
second) but not how long the message spent getting there. Three different
pieces of work had each written down "check this" and each found it could not.
That is a pattern this project watches for: a promise nobody can verify is a
promise that quietly stops being true.

**What we did: stamped every message with the moment it was sent.** It is one
small field, written by our server at the instant it sends each message, from
its own clock. A browser can now subtract that from its own clock when the
message lands, and again when the table repaints.

**Why it took care rather than a one-line change.** Four rules travelled with
the field, and each one exists because of a mistake this project has already
made once:

- **It is a new field, not a re-use of the old one.** The existing timestamp —
  "which minute is this price about" — is relied on in three places, including
  the sentence under the headline price and the rule that stops an old price
  overwriting a new one. Changing what it means would have broken all three at
  once to save one field.
- **It is used for measurement only, never to decide whether the feed is
  healthy.** We already have two clocks deciding "is the feed alive" and "is
  the data stale", and we once mixed them up so badly that one warning could
  never fire — with every test passing. A server's clock read on a viewer's
  machine is a third clock and the least trustworthy of the three for that
  job, because two computers rarely agree on the time. We added an automatic
  check that fails the build if this field ever reaches that code.
- **The number is only honest as a spread, never a single reading**, for the
  same reason: two clocks disagree, so one reading might be the disagreement
  rather than the delay.
- **It is stamped once per message, not once per company.** A message can
  carry 518 prices; stamping each would have cost 518 copies of the same
  instant. We measured the cost on the wire: **36 bytes** on a message of about
  58,000 — a rounding error.

**The headline: the whole journey takes about a twentieth of a second,
and at the slow end a fifteenth — against a promise of a quarter.** We
measured 60 messages, each carrying every one of the 518 prices, into two
browser windows at once, on the real production build. The part this task
finally made visible — our server encoding the message and sending it down the
socket — takes **6 milliseconds at the slow end**. Nearly all of the
rest is the browser redrawing 518 rows, which we had measured before and which
came out the same again.

**Two honesty notes, written into the record rather than left out.** First,
this was measured on one machine, with the server and the browser sharing a
clock and a network cable that does not leave the building. The deployed
version has a real network and two clocks in it, and the closing work for this
phase re-takes the number there; we wrote it the recipe and told it what a
disagreeing clock will look like so nobody mistakes it for a fault. Second, we
intended to run this against a replay of real recorded prices and could not,
because the recorded data on the measuring machine was six days behind and the
replay had no day to start from. We used the generated test feed instead — the
messages are the same shape and size, which is what matters for this question
— and wrote down the gap.

**One thing we found by accident, handed to the next task.** Redrawing 518 rows
on the real production build takes just over our "no single freeze longer than
a twentieth of a second" line — close to it, not five times over it as the
earlier development-mode readings suggested. The next task owns that figure
and now knows the problem is smaller than it looked.

**What a user can see today: nothing new.** One field on a message and a set
of numbers in this document. What it unlocks is that the speed promise in our
specification is now something we can keep checking rather than something we
had to take on faith — and the mechanism will be on every message from now on,
so anyone can re-take the number at any time, including against the live site
during a real trading session.
