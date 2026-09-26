# 0038 — The overview aggregate: one join, one frame, and what a derived figure on this wire owes

**Status:** Accepted
**Date:** 2026-09-26
**Story:** [4.2 The Aggregate Seam, & the Index Proxies That Move](../../planning/epic-04-market-overview/story-02-the-aggregate-seam-and-the-index-proxies/STORY.md), Task 4.2.9

## Context

`PRODUCT_SPEC.md` §9 puts a market summary at the top of the landing page, and
Stories 4.3 (sectors), 4.4 (breadth), 4.5 (movers) and Epic 5's anomaly scores
all need the same thing from the backend. Story 4.2's visible half is four
figures; its structural half is where that thing lives.

**The story described the seam as "where an aggregate over the universe is
computed", and in the same breath called the proxies "the one aggregate that is
not an aggregate". Both were right, and together they hid what was missing.**
What nothing in this backend could do was **join a live observation to the
previous session's stored close**: `currentMarketState` holds the live map,
`readLastCloses` holds the stored closes, and only `GET /securities` ever read
the second. An advancer is the _sign_ of a change from close; a mover is ranked
_by_ it; a sector's performance is a mean _of_ it. **The join is the primitive
and the aggregate is arithmetic on top of it.**

Two constraints arrived as measurements rather than guesses. The market-stream
wire has **no schema layer at all** — [ADR 0031](0031-what-a-transport-without-a-schema-layer-owes.md)
records what such a transport owes, and the failure mode **inverts**: on HTTP a
field on the object and not the type is stripped, on a socket it leaks. And the
`bars` cadence is **not one frame a minute**: `publishObservations` runs once per
upstream batch, at most ~16 a minute, beside a feed-state path Task 4.1.6
measured at **~332 frames a minute** broadcast to every browser regardless of
subscription. Three stories had carried the wrong figure.

This is also the first **derived** value this wire has carried. Every payload
before it was a raw observation or a connection word.

## Decision 1 — the seam is the JOIN, and it is a pure function

`apps/backend/src/market-overview.ts` is a sibling of `current-market-state.ts`,
not a method on it, and `buildMarketOverview` takes everything as arguments:

```ts
export interface MarketOverviewInputs {
  readonly symbols: readonly Ticker[];
  readonly observations: ReadonlyMap<Ticker, CurrentObservation>;
  readonly closesAsOf: (
    session: MarketDate,
  ) => ReadonlyMap<Ticker, SecurityLastClose>;
  readonly asOf: Date;
}
```

No clock, no socket, no repository handle; the reach into
`current-market-state.ts` is `import type` and erases.

**That purity is what makes invariant 4 structural here rather than
instructed.** A function that reads nothing cannot read something timestamped
after a replay clock — its only temporal inputs are `asOf` and a lookup keyed on
a session, both handed in by a caller that can be made replay-aware without
touching this file. Every later aggregate through this seam inherits the
property, which is the opposite of the usual outcome where each new surface
acquires its own way of asking what time it is.

- **`symbols` is a parameter, not `INDEX_PROXIES`.** The join is the seam; the
  four proxies are its smallest caller. §6's order exists once, derived from
  `UNIVERSE` by `kind === "index_etf"`.
- **`closesAsOf` is synchronous.** An `async` lookup puts an `await` back on the
  socket callback, the one path where an unhandled rejection kills the process.
- **Three states, and the fourth combination is not a fourth member.** A live
  price with no stored close is `observed` carrying `{ percent: null, basis:
null }` — the price is true and only the figure is absent. `unknown` is
  nothing-observed-and-nothing-stored, which is CI's store for all 518.

## Decision 2 — the arithmetic moves to `packages/shared`, and AC 2 got STRONGER

Acceptance criterion 2 required `changeFromClose`; the story's own amendment
required the computation backend-side; `changeFromClose` was a frontend module
inside `UniverseTable/`. **The resolution was to move it rather than weaken
either.** `changeFromClose`, `changePercent` and `LiveChange` are now
`packages/shared/src/live-change.ts` and the backend calls the one
implementation: **one implementation, two processes**, a stronger claim than the
criterion asked for.

The move was owed independently — `last-close.ts` recorded its own precedent and
condition (`price-format.ts` moved on its third consumer) and this story was the
third. It turned out to be the **fourth**: `SecuritySearch.tsx` already imported
`changePercent` and is named in no plan.

**What the move carries across is the same-session branch**, which is the whole
reason the guard exists. The nightly backfill writes today, so between it and the
next open the store's last session and the live bar's session **meet** — and a
hand-written subtraction then reports ≈0.00% for every security on screen:
well-formed, correctly formatted, correctly coloured numbers saying the market
did not move.

`one-home-for-the-live-change` holds it as a **producer walk** rather than a
call-site count, because more callers is the desired state. Three clauses, and
the third is the one that cannot be evaded: **a division whose denominator is a
close.** TypeScript never requires a re-implementer to write a type name; it does
require them to write the division. That clause is also the only tripwire risk in
the set — a drawdown or a normalise-to-close transform is a legitimate division
by a close — and when it fires the repair is an **exemption by declaration
shape**, never a widening of the regex.

## Decision 3 — one compute per applied batch, broadcast, on a fourth frame type

```ts
export interface OverviewMessage {
  readonly type: "overview";
  readonly version: number; // 1 — deliberately unchanged
  readonly sentAt: string;
  readonly overview: WireMarketOverview;
}
```

Verbatim off the local gateway against the real store, **431 bytes**:

```text
{"type":"overview","version":1,"sentAt":"2026-09-26T02:33:11.611Z","overview":{"computedAt":"2026-09-26T02:33:11.611Z","feeds":[],"figures":[{"state":"stored","symbol":"SPY","session":"2026-09-11","close":764.29},{"state":"stored","symbol":"QQQ","session":"2026-09-11","close":714.88},{"state":"stored","symbol":"DIA","session":"2026-09-11","close":525.79},{"state":"stored","symbol":"IWM","session":"2026-09-11","close":288.89}]}}
```

- **Unlike `bars`, the payload is identical for every browser**, so it is built
  **once per applied batch** before the per-client loop and broadcast — and on
  connect and on subscribe, because the overview is not scoped to a subscription
  and a browser connecting at 11:20 would otherwise have no figures until the
  next burst.
- **Never from the feed-state path.** That path is ~332 frames a minute and its
  own defect is deliberately unrepaired, handed to Story 4.7; the 127-byte `feed`
  frame survives it with `sameLiveFeedView` collapsing the render, and an
  aggregate over 518 securities would inherit the rate and none of the mercy.
  `the-overview-frame-is-not-a-heartbeat` was written **before** the frame it
  guards — the only ordering in which it can be proved against the real defect —
  and its regions are delimited by the file's formatted shape rather than by
  brace counting, because a destructured handler parameter walks straight past
  the obvious version.
- **`computedAt` is a new field, not a second meaning for `sentAt`.** ADR 0033's
  first constraint generalises: `sentAt` is when the gateway sent, `computedAt`
  is when the aggregate was **true**, and the figures are frozen between bursts —
  bounded at a minute during a session and **unbounded when the feed dies**. It
  must never reach `feed-liveness.ts`, for a sharper reason than `sentAt`'s: it
  advances whenever somebody **opens a tab**, with no market data behind it, so a
  threshold keyed on it would read a dead feed as `LIVE` for as long as the
  gateway keeps recomputing.
- **`MARKET_STREAM_PROTOCOL_VERSION` is deliberately not bumped**, and bumping is
  the obvious-looking move that is strictly worse. The deploy rolls the backend
  first, so a tab on the previous bundle meets the new gateway: unbumped it
  ignores one frame, bumped it rejects **every** frame. The decoder gained a third
  disposition instead — neither a message nor a defect, not counted in
  `unreadable` and not re-rendering, because `unreadable` is compared in
  `sameLiveFeedView`.
- **`unsupported` does not swallow a typeless frame.** It is conditional on
  `typeof parsed.type === "string"`; `{"version":1}` is our own gateway
  malfunctioning rather than a newer one and stays `unreadable`. And an
  `unsupported` frame **advances `lastInboundAt`**, because every inbound message
  is evidence the socket is alive.

## Decision 4 — tapes per frame, the discriminant per figure, the screen states both

A change percentage here has an **IEX numerator and a consolidated-SIP
denominator**. That was already true of the universe table; this is the first
surface to compute it centrally, and a bare `changePercent: 1.42` on a wire has
no way to say so.

The frame carries `feeds: readonly MarketFeed[]` in `market-provenance.ts`'s own
vocabulary, describing the **observed** figures only — `["iex"]` deployed during
a session, `[]` with no provider, and **never `["sip"]`**, because a stored
close's tape deliberately does not appear there. Per figure, only `asOf` and an
`observed` / `stored` discriminant, which is **not** spelled `live`: that word
has one home and `one-home-for-the-feed-words` would trip, deservedly.

**So the frame can say _these figures are IEX_ and cannot say _and the
denominators are consolidated_ — and no second wire field was added.** The
resolution is on the screen: one source note at the foot of the region group
states **both** tapes, each tile says only which of the two it is, and neither
repeats the other. A screen-level note cannot say which tape a _particular_ tile
shows, because `SPY` can be a live IEX observation while `DIA` is yesterday's
consolidated close in one strip at one moment — the ordinary state of IEX — and a
region-level note only pushes that down a level.

`one-provenance-note-on-the-landing-route` holds the grain in
`one-caller-of-the-market-clock`'s shape, with **two** conjuncts because
`one-home-for-the-feed-words` catches neither: the note is **rendered** in one
place, and its **terms** are written in one place, so a region assembling a second
note out of the shared vocabulary — spelling no new literal at all — goes red.

## Decision 5 — a non-finite number is the SERIALISER's problem, not the caller's

`encodeFigure` carried a comment saying a serialiser returning one was _"a
refactor away from putting a `null` on a wire whose stated rule is that absence
is omission."_ **It was not a refactor away. It was one caller away** — the only
thing standing there was a `Number.isFinite` check in a different module in a
different package, held by convention. ADR 0031's whole argument is that the
guarantee belongs in the serialiser.

- **Optional and non-finite is omitted** — a true price with no measurable move,
  which the union already has words for. A change percentage is the most
  `Infinity`-prone number this product produces.
- **Required and non-finite drops the whole figure**, through a `flatMap`, so it
  is absent rather than a hole. That is the reader's rule at the other end, and it
  avoids `json-schema.ts`'s measured trap arriving on a transport with no schema
  to blame: **`"price":null` reads as absent to a strict reader and as `0` to a
  lenient one, and `0` is a plausible price.**

**The producer's check was removed rather than kept as a belt.** Two homes for one
rule is what this repository refuses, and the second is the one that gets
forgotten; deleting it also means the new branch is exercised in situ rather than
shadowed. The criterion had been met by an **untested branch** — nineteen tests on
the encoder, none of them this one, with the existing assertion on the **decoded
object** where an omitted key and a present `undefined` are indistinguishable.

## Alternatives considered

- **Compute the aggregate in the browser.** The owner's own rejection, recorded
  rather than re-argued: §5.1 says every number a user sees comes from
  deterministic code and §17's tools are backend tools, so Epic 5's scores cannot
  live in a browser and a seam built there would be rebuilt within one epic. It
  also keeps criteria 2 and 4 contradictory.
- **A polled HTTP route.** Also the owner's rejection. It arrives on a clock of
  its own rather than the clock it describes, so a figure has an age no surface can
  state; and the browser then holds two sources for one screen, which drift.
- **Put the BASIS on the wire and let the browser compute.** Looks smaller. It
  leaves **the join** in the browser, which 4.3–4.5 would rebuild server-side
  inside one epic, and puts the same-session branch back where a second
  implementation is cheapest to write.
- **One frame type per region.** Genuinely arguable: each region gets its own
  cadence and its own `computedAt`, at the cost of four field maps, four decoder
  branches, four `sameLiveFeedView` fields and four chances to get ADR 0031's
  nested-map obligation wrong. The frame nests `overview` as one object precisely
  so a region can be added as a **field** rather than a type. **Story 4.3 re-takes
  this**, and it is named in that story's file.
- **No wire at all in this story.** Would have shipped the visible half in a
  morning and bought nothing the story exists for. Rejected explicitly rather
  than by omission.

## Consequences

- **Four stories and one epic have a seam to call.** They add a caller and a
  field, not a mechanism. The cost of the first one tests whether decision 1 was
  right.
- **`packages/shared` gains arithmetic.** ADR 0017's ban on reading a clock there
  is unchanged and `live-change.ts` satisfies it — every instant is an argument.
  `last-close.ts`'s invariant-1 argument now reaches across a process boundary and
  carries a dated amendment saying so.
- **ADR 0031's obligation is now load-bearing at a second grain**: every
  **nested** object needs its own field map, because a joined figure is exactly
  the kind of object somebody later hangs a diagnostic off.
- **The aggregate is rebuilt up to sixteen times a minute over data that changes
  once**, which is why the screen's `COMPUTED` instant is minute-precise. Seconds
  advertised churn that was not information, on a screen whose motion vocabulary
  marks arrivals and marks nothing else.
- **The closes cache holds a stale-but-true denominator in preference to none.**
  `loadedFor` records **what was asked for, not what was read**, so a refresh
  winning a race with the backfill pins a stale denominator for the day. Not
  repaired: every correct condition depends on the backfill's timing, which
  nothing here asserts, and every cheap one degenerates into 518 rows a minute all
  weekend. The window is **observable** instead. Condition for the real repair:
  **the first deployment where `GET /diagnostics/freshness` reports the store a
  session behind after 09:30 ET.**
- **`SecurityLastClose` is the join's currency** rather than a third domain type.
  Condition: **the first consumer of the join that needs a field
  `SecurityLastClose` does not carry.**
- **A replayed aggregate would compute over TODAY's universe, and that is not
  fixable in this story.** `currentMarketState` filters to `status = 'active'`
  against the universe as it stands now, and the store records **no point-in-time
  membership**. `UNIVERSE.md` §12.2's rule is that a computation over the market we
  track _now_ filters and a read of something we _stored_ does not; a replayed
  aggregate is the second and would behave like the first. The join's purity means
  the fix has somewhere to land — `symbols` and `closesAsOf` are arguments — but
  the **data** to answer _which securities were tracked on that date_ does not
  exist. **It may bound what Epic 13 can honestly claim about a replayed breadth
  count or sector mean**, and it is recorded in `docs/GAPS.md`.
- **`STORED_CLOSE_FEED = "sip"` is an argument from the writers, not a read of a
  row.** Condition: **the first writer of a `1d` bar that is not the backfill.**
- **What a green run does not certify.** On CI every proxy is `unknown` for ever —
  518 securities and zero bars — so the states this story exists to produce occur
  on **no gated machine**. `observed`, `stored` and the two-tape source note are
  reachable only on a store with bars, and the two-feed note only **mid-session**.

## Reversal trigger, as a condition

**Primary: the first overview figure whose value depends on something a single
client chose** — a per-client window, a subset of the universe, a scrub position
in a replay. At that point the frame stops being broadcast-identical, decision 3's
_one compute, one broadcast_ is false, and the shape wanted is request/response.
Two things fall due together: `one-producer-of-the-overview-aggregate` stops being
the right claim (it becomes one producer _per request_), and `computedAt` acquires
a per-client meaning the screen's single `COMPUTED` line cannot state.

**Narrower, and likely to fire first: the first consumer of the overview aggregate
that is not a browser.** Epic 7's deterministic investigation tools and Epic 10's
agent cannot attach a WebSocket to call a function. When that lands the **join** is
what they want and the **frame** is not, so `buildMarketOverview` stays put and the
gateway becomes one of several callers — at which point
`one-producer-of-the-overview-aggregate` goes red **on the desired state** and must
be re-scoped to _one producer per transport_ rather than widened silently. **That
the check fires there is intended; it is the trigger's own alarm.**
