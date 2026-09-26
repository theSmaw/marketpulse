# Task 4.2.4 — The frame: a fourth message type on a wire with no schema layer

**Status:** **Complete — 2026-09-26.** A fourth message type, built through `toWire`, with the closes cache 4.2.3 deferred. **The serialiser was putting `null` on a wire whose stated rule is omission** — predicted by `encodeFigure`'s own doc comment as _"a refactor away"_, and it was **one caller away**; the guard now lives in the serialiser and the producer's copy was removed rather than kept. `unsupported` no longer swallows a **typeless** frame, which is our own gateway malfunctioning rather than a newer one. **Three breaks rotted in this change and `every-break-can-still-land` could only see one.**
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

---

## What was done — 2026-09-26

### The frame

```ts
export interface OverviewMessage {
  readonly type: "overview";
  readonly version: number; // 1 — deliberately unchanged
  readonly sentAt: string;
  readonly overview: WireMarketOverview;
}
export interface WireMarketOverview {
  readonly computedAt: string; // when the aggregate was TRUE
  readonly feeds: readonly MarketFeed[]; // observed figures only
  readonly figures: readonly WireOverviewFigure[]; // in reporting order
}
```

with `WireOverviewFigure` a three-member union — `observed` (price, instant,
and an **optional** change and basis), `stored` (session and close), `unknown`.

**Verbatim off the local gateway against the real store, 431 bytes:**

```text
{"type":"overview","version":1,"sentAt":"2026-09-26T02:33:11.611Z","overview":{"computedAt":"2026-09-26T02:33:11.611Z","feeds":[],"figures":[{"state":"stored","symbol":"SPY","session":"2026-09-11","close":764.29},{"state":"stored","symbol":"QQQ","session":"2026-09-11","close":714.88},{"state":"stored","symbol":"DIA","session":"2026-09-11","close":525.79},{"state":"stored","symbol":"IWM","session":"2026-09-11","close":288.89}]}}
```

Three shape decisions: **`overview` is nested rather than spread**, so ADR
0031's field-map obligation has somewhere to land and the browser holds **one**
reference to gate a render on; **`unknown` is a member of the union rather than
an omission**, because _absence is omission_ governs **fields** and `unknown`
is a state — and it is also what carries the **order**, since a renderer cannot
draw four proxies in §6's order from a record that omits the ones we know
nothing about; and the subject is derived from `UNIVERSE` by
`kind === "index_etf"`, so §6's order exists once rather than twice.

### The serialiser was putting `null` on the wire, and its own comment said so

`encodeFigure` carried the line _"a serialiser that returns one is a refactor
away from putting a `null` on a wire whose stated rule is that absence is
omission."_ **It was not a refactor away — it was one caller away.**
`JSON.stringify` writes `null` for a non-finite number, and the only thing
standing there was a `Number.isFinite` check in `toWireMarketOverview`, a
different module in a different package, held by convention. ADR 0031's whole
argument is that the guarantee belongs in the **serialiser**.

Two rules now, split by whether the field is required. **Optional and
non-finite is omitted** — a true price with no measurable move, which the union
already has words for. **Required and non-finite drops the whole figure**,
through a `flatMap` so it is absent rather than a hole: that is `readFigure`'s
rule at the other end, and it avoids `json-schema.ts`'s measured trap arriving
on a transport with no schema to blame — **`"price":null` reads as absent to a
strict reader and as `0` to a lenient one, and `0` is a plausible price.**

**The producer's check was removed rather than kept as a belt.** Two homes for
one rule is what this repository refuses, and the second home is the one that
gets forgotten — it also means the new branch is exercised in situ rather than
shadowed.

**The acceptance criterion had been met by an untested branch.** Nineteen tests
on `toWireMarketOverview` and none of them the non-finite one; the existing
assertion was on the **decoded object**, where an omitted key and a present
`undefined` look identical. Six new tests assert on the **encoded string**, and
the orchestrator re-verified independently against the built module: no `null`
on any path, and a non-finite price leaves `"figures":[]`.

### Two decoder gaps, both about what a stale tab means

**`unsupported` was swallowing our own gateway malfunctioning.** The new
`default` branch returned `unsupported` for _any_ unrecognised type, including
an absent or non-string one, so `{"version":1}` decoded as
`{ kind: "unsupported", type: "" }` and was dropped — where it used to be
counted as `unreadable`. **A typeless frame is not a newer gateway; it is us.**
Now conditional on `typeof parsed.type === "string"`, everything else falling
through to `unreadable`.

**And an `unsupported` frame advanced nothing**, against `advanceLiveFeed`'s
own rule two files away — _"Every inbound message — including one we could not
read — is evidence the socket is alive."_ A fourth event kind now moves
`lastInboundAt` without touching the `unreadable` counter, asserted
behaviourally: a diet of frames this bundle predates for 400 s leaves
`backendReachable` true, where silence for the same period would not.

### The cache, and one limitation stated rather than repaired

`closesAsOf(session)` triggers its own refresh — no second method and no second
caller to forget — replacing `held` only after a successful read, so a failure
has nothing to undo. **A test caught a design defect in the first version**: it
stamped every read, so the 60 s floor throttled _successes_ and a session
change within a minute of startup was ignored. It is a **backoff** cleared on
success, not a poll interval.

**`loadedFor` records what was asked for, not what was read**, because the
query has no `observed_at` bound. A refresh that wins a race with the backfill
would pin a stale denominator for the rest of the day. **Not repaired, and the
reasoning is the deliverable**: the only correct condition depends on the
backfill's timing, which nothing in this repository asserts, and every cheaper
condition becomes a poll — the obvious one (retry when a read did not advance
the newest session) behaves on a weekday and **degenerates on a Sunday**, 518
rows once a minute all day, which is the schedule rule 2 refuses. The window is
made **observable** instead, with a warning when a refresh does not move the
newest session, and `docs/GAPS.md`'s entry gained a section. Reversal trigger,
as a condition: **the first deployment where `GET /diagnostics/freshness`
reports the store a session behind after 09:30 ET.**

### Three breaks rotted, and the registry check could only see one

`the-send-instant-becomes-a-clock`'s `expect` rotted on a reworded claim;
`a-resume-does-not-reach-the-page`'s `find` took a bare comparison and left a
trailing `&&` in a comment; and `the-proxies-do-their-own-arithmetic` was
swallowed by a new exemption. **`every-break-can-still-land` asserts the text
is still present, not that the substitution still expresses the defect** — its
own documented limit, confirmed twice in one change. The second of those went
red as a **parse error**, which proves nothing; the review re-ran it at the
runner rather than the verdict line and confirmed an assertion failure with 47
other tests collecting.

**71 of 92 registry entries were re-run and all passed**, so the rot was this
change's rather than a standing decay.

### Gates

`pnpm verify` **exit 0**, `32 invariants hold.`, shared 345 / backend 973 /
frontend 1,156 / `test:process` 41, no unhandled errors.
`pnpm test:database` **211 passed** — run despite no schema or query change,
because the cache reads the data layer and it costs 4 s.
`pnpm e2e` **166 passed, 15 skipped**. The first run had two failures under a
load average of **31.1 across 8 cores**; rather than accept a scoped re-run —
this repository records a flake that read as contention for four bisecting runs
and was not — the **whole suite** was re-run at load 10.95 and passed clean.
All 18 breaks touching a changed file re-run red and restored byte-identical.

## For a stakeholder — a status report, 2026-09-26

### What this was

**The message that carries the four index figures to the browser** — the last
piece of plumbing before anything appears on screen.

### What we found

**Our own code had written down the bug a year before it happened.** A comment
in the message-building code warned that a future change was "a refactor away"
from putting an empty value onto a wire whose entire rule is that missing
things are left out rather than sent as blanks. It turned out not to be a
refactor away: it was one step away, and the only thing preventing it was a
check in a different part of the system entirely, kept there by habit rather
than by anything enforcing it.

Left alone, the failure would have looked like this: a price that could not be
calculated arrives at the browser as an empty value, and a lenient reader turns
an empty value into **zero** — a plausible-looking price of nothing. We moved
the protection into the message builder itself, and deleted the old one rather
than keeping both, because two copies of a rule is how one of them gets
forgotten.

**We also found the acceptance test for this was not testing it.** Nineteen
tests covered the surrounding code and none covered this case.

### The part worth telling

**Three of our deliberate self-sabotage checks silently stopped working during
this change, and the safeguard that watches them could only see one.** Those
checks exist to prove our safeguards actually fail when something is wrong; the
watcher confirms the sabotage text is still present, but not that it still
_means_ anything. One of them had degraded to breaking the file outright, which
fails for the wrong reason and would have read as success.

We re-ran 71 of the 92 to confirm the damage was confined to this change, and
the limitation is now written down as a known gap rather than assumed away.

### One thing we chose not to fix

There is a narrow overnight window — after a failed evening data refresh — in
which yesterday's comparison figure could be held a day too long. The correct
fix depends on stating exactly what our data store is expected to contain and
when, which nothing currently does, and every shortcut turns into a query
running once a minute all weekend for nothing. **We made the window visible
instead**, with a warning when it occurs and a written condition for when the
real repair becomes necessary.

### Where this leaves the work

**The next task puts four live index figures on the landing page.** Everything
behind them is now built, guarded and measured.
