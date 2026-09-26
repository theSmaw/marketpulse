# Task 4.2.4 — The frame: a fourth message type on a wire with no schema layer

**Status:** Not started
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
