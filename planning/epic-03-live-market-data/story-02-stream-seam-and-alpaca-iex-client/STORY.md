# Story 3.2 — The Market-Data Stream Seam & the Alpaca IEX Client

**Status:** Not started
**Epic:** [Epic 3 — Live Market Data](../EPIC.md)
**Depends on:** 3.1
**Epic scope covered:** Alpaca WebSocket ingestion, market-data normalization

## Description

The second interface this product's market data sits behind, and the vendor
client that implements it.

**`PROVIDER.md` §12 already settled the shape and this story must not reopen
it.** `MarketDataStream` is a **sibling** interface in `apps/backend/src`,
beside `MarketDataProvider` rather than a `subscribe()` method on it, sharing
every domain type in `packages/shared`. Three arguments are recorded there: the
lifecycles are genuinely different (a fetch has a deadline and a result; a
subscription has connection state, backpressure and reconnection); a single
interface forces the fixture provider to fake a stream and Story 2.7's
historical client to ship a method that throws, which Task 2.6.6 forbids in as
many words; and what the two share is **the data and its provenance, not their
shape**. Composition stays available — one object may implement both — and
`MARKET_DATA_PROVIDER`'s id vocabulary is shared, so **this epic adds no second
configuration variable**.

What this story owes on top of that sketch is everything a sketch cannot carry:
the connection state machine, the normalization from a vendor frame to a `Bar`
with a `BarSource`, and a way to test all of it with no network and no
credential.

## What the user can see when this story lands

**Nothing.** The socket runs inside the backend process and reaches no route and
no screen.

**The payoff is the very next story**, which puts its state in the chrome.

What the user still cannot do: see that anything is live, see a price change, or
see today's session on a chart.

## Why it sits here in the sequence

Because Story 3.3 is a thin slice through every layer, and a slice needs
something to slice through. This is the only story in the epic that is purely a
seam, and it is deliberately narrow: **one connection, a handful of symbols, one
message type, no persistence, no fan-out, no reconnection policy.** Each of
those has a later owner and pulling any of them forward is the scaffolding
`CLAUDE.md` forbids.

## Scope

- **`MarketDataStream`** in `apps/backend/src`, written **before** the client
  rather than extracted from it. `PROVIDER.md`'s opening makes the distinction
  the test of whether a seam is real: _an interface extracted from a working
  client is a description of that client; an interface written first is a
  constraint on it._
- **The connection state machine**, whose failure vocabulary is `FeedStatus` —
  `live | stale | disconnected`, which already exists in `packages/shared` and
  is about a **connection** rather than a feed's identity. That type has been
  waiting for this story since Story 1.5 and its own comment says so.
- **The Alpaca IEX client**: connect, authenticate, subscribe, read frames, map
  them. Split **pure mapping from transport**, which is the arrangement
  `alpaca-mapping.ts` / `alpaca-provider.ts` already established and the reason
  the historical client's mapping is testable at all.
- **Normalization to the domain types that already exist.** A streamed bar is a
  `Bar` — six fields, `startsAt` marking the interval's **start**, `number`
  prices — and the source it arrives from is a `BarSource` with the same
  `provider` and `feed` vocabulary. **`feed` is `iex`**, and that is a fact
  about the data rather than a caption, which is the whole of
  `market-provenance.ts`'s argument.
- **Recorded frames as fixtures**, in the shape `src/fixtures/alpaca/` already
  holds for the HTTP API — **raw vendor bodies, excluded from Prettier and from
  line-ending normalisation on purpose, because both rewrite evidence.** A test
  corpus for a socket is the only way the states below are reachable without a
  market.
- **A fixture stream implementing the same interface**, so `pnpm dev` and
  `pnpm test` have a live feed with no credential and no session. This is the
  `fixture-provider.ts` precedent, including its default: **`none`, and
  emphatically not `fixture`** (`PROVIDER.md` §5.3) — invented prices must never
  be reachable by forgetting to configure something.
- **A replay stream over our own stored bars** — added 2026-09-16 by
  [ADR 0030](../../../docs/adr/0030-replaying-our-own-bars-and-the-mechanisms-that-stop-the-live-feed-rotting.md),
  and it **splits the bullet above rather than replacing it**. `pnpm test` keeps
  the generated stream, because the suite may touch no database; `pnpm dev` gets
  a third implementation reading the 48.4M minute bars already in
  `market_bars` through the shipped `MarketBarsRepository.readBars`. The reason
  is a story three ahead: **Story 3.4 settles the motion vocabulary against
  "real moving numbers"**, and invented prices cannot settle it — the shape of
  real intraday movement is the thing being designed against. One engine over a
  `ReplayBarSource` seam serves both cases, so the pacing, ordering, session
  advance and `BarSource` stamping exist once. **The replay refuses to run while
  `marketSessionStateAt(now)` is `open`**, which is ADR 0030 decision 7 and the
  whole reason this is safe; see "What must not rot" below.
- **Every outcome the spike observed, as a value rather than a throw.** The line
  `PROVIDER.md` §8.5 draws transfers: a result says what happened to a request,
  a throw says the program is wrong.

## What must not rot, and the mechanisms rather than the intentions

**The risk this story creates is that the application gets built against the
replay and the real socket quietly stops working.** It is the objection ADR 0030
exists to answer, and the answers are mechanical:

1. **The replay never reaches production, at any hour.** Production has real
   users and must only ever tell the absolute truth about the real market
   (ADR 0030 decision 7a). The deployed backend is configured
   `MARKET_DATA_PROVIDER=alpaca`; outside a session it shows stored history, a
   clock reading closed, and a feed that is not delivering. **This story must
   not ship anything that makes a deployed replay reachable**, and it is
   configuration guarded by checks rather than a compiler — say so rather than
   overclaiming it.
2. **The replay also cannot run during a session** — `createReplayStream`
   refuses to start, and stops if already running, whenever
   `marketSessionStateAt(now)` is `open`. That is the developer-side guard: it
   catches the person who left `MARKET_DATA_PROVIDER=replay` in their `.env` and
   is building against a recording while believing they are on the live feed.
   **This owes a `pnpm break` entry.**
3. **The real client is written first.** `createAlpacaStream` and its
   recorded-frame tests land **before** `createReplayStream`. A convenience built
   first becomes the thing everything is shaped around.
4. **A replayed bar can never be stored.** `recordSeries` throws on a series
   whose provenance names `replay` — and note _why_ it must be a runtime guard:
   widening `PROVIDER_IDS` widens `schema.ts`'s insert types, so the compiler
   stops preventing the write at the same moment the database check starts
   permitting the value. **This owes a `pnpm break` entry too.**
5. **`GET /diagnostics/feed`**, beside the shipped `/diagnostics/freshness`, so
   `check-deployed.mjs` can fail after a merge — when the market is open and the
   deployed feed is not a connected `iex`, and **at any hour if the deployed feed
   is `replay` at all**. `verify` has no credentials by design, so a runtime
   claim needs a runtime check.
6. **The word `LIVE` must never render while the feed is `replay`.** It reads as
   a claim about the market rather than about the connection. The cell reads
   `REPLAYING`; `LIVE-DATA.md` §2.6 owns the words and carries it as a fifth cell.

## Out of scope, and who owns it

- Subscription management at universe scale, and the current-state model —
  Story 3.5. This story subscribes to a fixed handful
- Reconnection policy, backoff and the gap a reconnection leaves — Story 3.10.
  This story reports `disconnected` honestly and does not yet retry
- Anything reaching a browser — Story 3.3
- Writing a bar to the database — Story 3.9, and it must not happen before
  Story 3.8's migration
- Retry — and note it does not live here at all: `PROVIDER.md` §8.8 puts retry
  in a **wrapper implementing the same interface**, and a retry buried in a
  transport makes a caller's deadline a lie

## Open decisions — settle with the user

None expected: Story 3.1 is where this story's decisions were taken, and a
decision re-opened here is a decision recorded in two places, which is a
decision that will disagree with itself. **If the spike's answers turn out not
to cover something, amend `LIVE-DATA.md` rather than deciding it in a task
file.**

## Acceptance criteria

1. `MarketDataStream` is implemented by two things — the vendor client and a
   fixture stream — and **neither has a method that throws "not implemented"**
2. Every state the spike observed is reachable in a test against recorded
   frames, including the unhappy ones: bad credential, duplicate connection,
   server-side close
3. A streamed bar maps to the same `Bar` a fetched bar maps to, checked against
   a recorded frame rather than against a hand-written object
4. The stream's `BarSource` names `iex`, and nothing in the mapping can produce
   `sip` — the free plan refuses a SIP socket with `409`, so a code path that
   could claim one is a code path that lies
5. Nothing in `packages/shared` reads the wall clock, which lint already holds;
   a stream module that wants _now_ takes it as an argument or lives in an app
   package
6. `pnpm verify` passes with **no network, no credential and no socket** — the
   whole suite runs on fixtures, which is what makes it a gate
7. Any check this story adds has a `pnpm break` entry proving it goes red
8. **The replay stream refuses to start while the market is open**, proven by a
   break rather than asserted — ADR 0030 decision 7, and the single mechanism
   standing between this story and a live feed nobody notices is broken
9. **A replayed series cannot reach `market_bars`**, proven by a break
10. The replay's bars are **re-stamped onto the wall clock while `occurredAt`
    keeps the recorded instant**, and no observation is ever emitted ahead of the
    replay's own clock — invariant 4 in miniature, and the first place in this
    product where that constraint is real rather than anticipated

## The design bar

Not applicable — this story builds no screen. Its contribution to the bar is
that Story 3.3's screen has something true to render.

## What this story hands forward

A live feed inside the process, and the state Story 3.3 puts in the chrome.
