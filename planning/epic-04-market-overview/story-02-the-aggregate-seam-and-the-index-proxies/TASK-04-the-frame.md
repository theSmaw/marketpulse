# Task 4.2.4 — The frame: a fourth message type on a wire with no schema layer

**Status:** **In progress — 2026-09-26.**
**Story:** [4.2 The Aggregate Seam, & the Index Proxies That Move](STORY.md)
**Depends on:** 4.2.1, 4.2.3

## Objective

**Task 4.1.1 decided the seam is a new frame on the existing market-stream
socket.** This task builds it, on a transport that has **no schema layer at
all** — and ADR 0031 says exactly what such a transport owes, because the
failure mode **inverts**: on HTTP a field on the object but not the type is
stripped, and on a socket it **leaks**.

This is also the first **derived** value this wire has ever carried. Every
existing payload is a raw observation or a connection word.

## What the user can see when this lands

**Nothing.** A frame arrives in the browser and nothing renders it. Task 4.2.5
is the payoff, and it is the next task.

## Work

- **What the frame carries, settled at Gate 1 and stated here so it is not
  inferred.** The owner chose the **joined figures**, not the basis: Task 4.2.3
  moves `changeFromClose` into `packages/shared`, the backend calls that one
  implementation, and the frame carries the **computed change** per proxy
  alongside the price, the instant it is as of, and an `observed` / `stored`
  discriminant. The browser renders; it does not re-derive. The rejected
  alternative — the frame carries `{session, close, previousClose}` and the
  browser computes — kept `changeFromClose` where it was but left the join in
  the browser, which Stories 4.3–4.5 would have rebuilt server-side within one
  epic. **AC 2 is satisfied more strongly this way, not less**: one
  implementation, now called by two processes.
- **The discriminant is the string literal `"overview"`** — decided here on
  2026-09-26 rather than left to the implementer, because Task 4.2.1's
  `the-overview-frame-is-not-a-heartbeat` guard is already in the tree and
  counts encode sites of `type: "overview"`. A different spelling would make
  that half of the guard match zero **for ever**, silently, which is the exact
  failure mode this repository calls _a grep that matches nothing looks exactly
  like a grep that passes_. If a later task wants a different word, it changes
  the invariant in the same commit and re-runs the break.
- **A fourth member of the protocol union**, in
  `packages/shared/src/market-stream-protocol.ts` beside the other three — it
  cannot live in the backend, because `MARKET_STREAM_MESSAGE_TYPES` is a closed
  `as const` array, `encodeMarketStreamMessage`'s `switch` is exhaustive with a
  `never` guard, and `WireFields<T>` is a mapped type over `keyof T`. All three
  break the build in the right place only if the type is in the union.
- **Built through `toWire`, never `JSON.stringify`** — and **every nested object
  needs its own field map.** This is where ADR 0031's obligation is actually at
  risk: `encodeObservations` exists because a record of observations needs
  per-entry `toWire`, and a per-proxy figure needs the same. A nested object
  passed through `asIs` satisfies the compiler and leaks whatever is on it —
  and a joined figure is exactly the kind of object somebody later hangs a
  diagnostic off.
- **The derived figures must not carry what they were derived from.** The
  backend holds a rich `LiveObservation` and a `LastClose`; the frame carries
  neither.
- **`computedAt` is a new field, not a second meaning for `sentAt`.** ADR 0033's
  first constraint, which generalises completely: `sentAt` is when the gateway
  sent, `computedAt` is when the aggregate was true, and they differ by however
  long the encode-and-broadcast takes. The cadence makes this load-bearing —
  the count is frozen between bursts, bounded at a minute during a session and
  **unbounded when the feed dies**, so the surface must be able to tell.
- **Provenance: per frame for the tapes, per figure for the discriminant.** The
  honest and uncomfortable fact is that a change percentage here has an **IEX
  numerator and a consolidated-SIP denominator** — already true of the universe
  table, but this is the first time it is computed centrally, and a bare
  `changePercent: 1.42` on the wire has no way to say so. One tapes object per
  frame in `market-provenance.ts`'s own vocabulary (~50–70 bytes, once a
  minute); per figure, only `asOf` and a discriminant. **The discriminant must
  not be spelled `live`** — that word has one home and `one-home-for-the-feed-words`
  would trip, deservedly. `observed` / `stored` reads better and cannot collide.
- **Absence is omission**, never `null`, never a present-but-empty object —
  `market-stream-protocol.ts`'s stated rule. With `exactOptionalPropertyTypes`
  on, build the two branches rather than setting a key to `undefined`.
- **The decoder checks `Number.isFinite`, not `typeof === "number"`.**
  `readObservation` already does, because `NaN` and `Infinity` survive
  `JSON.parse`. A **change percentage** is the most `Infinity`-prone number this
  product produces — `last-close.ts` guards a zero basis twice and calls
  `"+Infinity%"` the most alarming figure on the page. A figure that fails the
  check is **omitted**, not defaulted.
- **Forward compatibility for a stale tab, and do NOT bump the protocol
  version.** `decodeMarketStreamMessage` returns `unreadable` for an unknown
  type, `live-feed.ts` counts it in a field documented as _"Zero on every
  healthy deployment"_, and `unreadable` is compared in `sameLiveFeedView` — so
  a browser on the previous bundle would re-render on **every** overview frame,
  indefinitely. Bumping the version is the obvious-looking move and is strictly
  worse: it makes every frame unreadable for those tabs. Give the decoder a
  forward-compatible disposition — a third kind that is neither a message nor a
  defect, not counted and not reported.
- **Sent on the observations path only**, and also **on connect and on
  subscribe** — the overview is not scoped to a subscription, so a browser that
  connects at 11:20 otherwise has no figures until the next burst, which is the
  snapshot's own argument one level up. **Never on the keepalive.** 4.2.1's
  `the-overview-frame-is-not-a-heartbeat` is already in place and must stay green.
- **One compute, one broadcast.** Unlike `bars`, whose payload genuinely differs
  per client, the overview is identical for everyone. Build the typed value once
  per applied batch, before the per-client loop.
- **Three frontend consumers change and the compiler will name two of them.**
  `observedIn` reads `message.observations` and must return `NOTHING_OBSERVED`
  for an overview — **an aggregate is not an observation**, and letting it
  advance `lastObservationAt` would make a dead feed read `LIVE` for as long as
  the gateway keeps recomputing. `advanceLiveFeed`'s `server:` ternary must be
  rewritten to name the types that carry `feed` rather than excluding the one
  that does not. And whatever field carries the overview into `LiveFeedView`
  must be added to **`sameLiveFeedView` in the same change**, with a reference
  that changes exactly when the content does — the comment there records what
  happens otherwise: _"updates correctly while the screen never changes — a
  first moving price that does not move, with every test green."_

## Done when

1. A `WireFields` map exists for the frame and for every nested object in it,
   and nothing in the encode path spreads an internal value
2. An absent figure is absent from the encoded **string** — asserted on the
   string, not on the decoded object, which would pass over a `0`
3. A non-finite percentage is omitted rather than encoded
4. A decoder built before this frame existed reports it as neither a message nor
   a defect, and does not re-render the application
5. `MARKET_STREAM_PROTOCOL_VERSION` is unchanged, with the reason recorded
6. The frame is sent once per applied batch, on connect and on subscribe, and
   never from the feed-state path — `the-overview-frame-is-not-a-heartbeat` green
7. `sameLiveFeedView` gates the new field, with a test asserting the negative

## Amended by Task 4.2.3 — 2026-09-26: three things this task inherits from the join

**1. `closesAsOf` is synchronous, session-keyed, and returns `SecurityLastClose`
— and implementing it is yours.** `buildMarketOverview` takes the lookup as an
argument; nothing supplies one yet.

- **Synchronous is load-bearing rather than stylistic.** An `async` lookup puts
  an `await` back on the socket callback, which is the one path where an
  unhandled rejection kills the process.
- **The currency is `SecurityLastClose`, the shared type, and that is
  accepted** rather than a third domain type between `market-bars.ts`'s
  `LastClose` and the wire. One consumer does not earn a third type.
  **Reversal trigger, as a condition: the first consumer of the join that needs
  a field `SecurityLastClose` does not carry.** At that point the third type
  earns its keep and this decision is re-taken.
- **The `observedAt → session` conversion is therefore yours too.** `LastClose`
  carries `observedAt: Date`; `SecurityLastClose` carries a session.
  `toWireLastClose` in `routes/securities.ts` is the existing precedent —
  follow it rather than inventing a second conversion, and remember
  `marketDateAt` is the only module allowed to do it.

**2. The closes cache is this task's, not 4.2.3's — deliberately.** All three
of its rules are about process lifecycle: _load at startup_ is `index.ts`
wiring, _refresh on the first burst whose market date differs_ needs the burst,
and _never empty on a failed refresh_ is a property of the object the publish
path reads. None is decidable without the frame, and building it in 4.2.3 would
have been an exported module nothing imports — the scaffolding-ahead shape
`CLAUDE.md` names by hand. **A stale-but-true denominator beats no figure**, so
a failed refresh keeps what it has.

**3. A `docs/GAPS.md` entry becomes owed the moment you write the production
lookup**, and not before. The implementation will ignore its `session`
argument and return the latest close we hold — correct live, and **future
information under a replay**. Right now there is no claim to guard because
there is no implementation; the moment it lands it is a claim about a
mechanism, and this repository's rule is that such a claim owes something
mechanical in the same change. Do not let it fall between the two tasks.
