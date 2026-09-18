# Story 3.2 — The Market-Data Stream Seam & the Alpaca IEX Client

**Status:** Not started — **split into nine tasks 2026-09-18**, see _Tasks_ at the foot
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
   not ship anything that makes a deployed replay reachable.**

   **Read ADR 0030 §7a–7f before implementing this, because the layering is the
   decision.** One mechanism prevents (the deploy reads the configured provider
   and refuses to roll on the wrong one — it **reads**, never sets, because
   `deploy.yml` deliberately does not restate the app's environment variables);
   two detect and bound how long a wrong state lasts (`check-deployed.mjs` after
   a merge, and a scheduled probe within a day, since `deploy.yml` has no
   `schedule:` and nothing looks at production between merges); and one raises
   the count of independent mistakes needed from one to two (a second opt-in key
   that production has never had). **None is a compiler, and the word
   "guaranteed" should not appear in this story's record.**

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

---

## Handed here by Task 3.1.4 — 2026-09-17

**The client must handle `u` (`updatedBars`), and it is not an optional
channel.** The owner decided on 2026-09-17 that the product subscribes it
([`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) §7.11). A bar arrives, and roughly thirty seconds
later a **corrected bar for the same minute** may arrive on `u` — measured at
0.36% of bars on ten liquid names, with **every one of the fourteen changing
something** and three changing the close price.

So the seam's normalisation has a case it did not have: **a `Bar` for a
`(symbol, minute)` that already exists is a replacement, not a duplicate.** A
client that maps `u` to the same shape as `b` and appends will produce two bars
for one minute; one that ignores `u` will be quietly wrong for ever. Neither is
what was decided.

**`t` marks the START of the interval on the stream** — confirmed with an HTTP
control in §7.3, agreeing with `ALPACA.md` §5.3. The state machine's frames are
in §4.1–§4.2 and the 54 s heartbeat in §6.3.

## Handed here by Task 3.1.5 — 2026-09-16, and the first one decides a dependency

**This story cannot use Node's built-in `WebSocket`.** Not a preference, a
measurement: [`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md)
§4.6 established that the built-in client can neither observe a server ping nor
send a pong, and §8.6 measured what this server does about that — **it closes a
client that misses one ping, 5,999 ms later.** A client built on the built-in
would therefore be disconnected roughly **every 61 seconds, for ever**. `ws@8`
is the dependency, and the reason is in the capture rather than in a preference.

**`406 connection limit exceeded` is _wait and retry_, never fatal** (§8.2). The
free plan allows one connection and **the incumbent wins**: an arriving
connection is refused 233 ms after authenticating and closed ten seconds later,
while the incumbent keeps its socket and its subscriptions. A rolling replica
replacement has two processes alive by design and the arriving one is this
client — so a client that maps _the server refused me_ to _stop_ has no feed
after **every deploy** until somebody restarts it by hand.

**Every error is a frame, not a closure, and a refused socket stays OPEN**
(§4.2, §8.4). All four authentication failures leave the connection up
indefinitely; `402 auth failed` is byte-identical for a wrong key, a wrong secret
and no credential at all, so an operator log cannot distinguish them and must not
claim to. `400 invalid syntax` is genuinely distinct and is the one an operator
can act on differently.

**The close code carries nothing; the close latency carries everything** (§8.5).
Five distinct causes all produce `1006` with an empty reason — 1 ms, ~240 ms,
~6 s, ~10 s and ~30 s apart. A state machine branching on the code branches on
nothing.

**Subscriptions are ours to re-assert** (§8.7) — the server remembers none
across a reconnect — and **reconnecting immediately is not penalised**
(717/709/709/722/694 ms, all authenticating). The backoff this story writes is
about being a good citizen and about not hammering a server that is down; it is
**not** paying off a measured penalty, and it should say so.

---

## The five constraints Story 3.1 measured and does not own — 2026-09-17, Task 3.1.9's close

**These are not decisions; they are properties of the vendor.** All five are in
[`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md), and they are gathered here so this story meets them in a
hand-off rather than in a debugging session.

1. **The server heartbeats every 54 seconds** (§6.3) — 53.96–54.85 s across 82
   intervals, on a socket subscribed to nothing as much as on one subscribed to
   all 518. It is a property of the **connection**, not of the subscription. **So
   this product needs no keepalive of its own**, and that heartbeat is the only
   thing that tells a quiet feed from a dead one.
2. **Node's built-in `WebSocket` cannot see a ping or send a pong** (§4.6), and
   that decides the library rather than being trivia. §8.6 measured what this
   server does to a client that does not pong: **it closes 5,999 ms after the
   first unanswered ping.** A client on the global would drop roughly **every 61
   seconds, for ever**. Use `ws@8`.
3. **The close code carries no intent** (§4.2) — a clean close reads `1006`, the
   same as a dropped link. §8.5 supplies the discriminator that does work, and it
   is a **stopwatch rather than a field**: ~1 ms means our own link went,
   ~240 ms a live socket answering, ~6 s the server closing a rude client, ~10 s
   a refused duplicate, ~30 s `ws@8` timing out on a corpse.
4. **A connection can die with no event at all, and `readyState` will not say
   so** (§6.4). A capture held `OPEN` for **4 h 21 min** on a dead socket — no
   error, no close, no reset — and the close it eventually requested took
   **30,016 ms** against **243 ms** for a live one. **So this client owes a
   liveness watchdog on inbound frames** — not on `readyState`, and not on data,
   which is legitimately absent for hours — firing at **165 s**. And
   `FeedStatus.live` must never be derived from _the socket object is open_.
5. **`dailyBars` re-sends an unchanged aggregate every minute out of hours**
   (§6.7) — both a cost trap at universe scale and the reason a staleness rule
   must key on the **observation's own timestamp** rather than on a frame having
   arrived.

**And one that is this story's to build rather than to know:** `replay` is a
`ProviderId` **and** a `MarketFeed` in ADR 0030 §3, and **neither union holds
it** — `PROVIDER_IDS` is `["fixture", "alpaca"]`, `MARKET_FEEDS` is
`["iex", "sip", "synthetic"]`. Adding them is this story's, and the `satisfies`
guard makes a feed added without words a compile error naming the omission.

---

## Tasks

Nine, sequential, each self-contained. **The ordering is load-bearing in three
places** and those three are the reason this is not a flat list:

| #     | Task                                                                                                            | Why it sits here                                                                                  |
| ----- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 3.2.1 | [`replay` enters the two unions](TASK-01-the-replay-vocabulary-and-the-words-on-screen.md)                      | **First**, so every later task's provenance stamping is a compile error rather than a surprise    |
| 3.2.2 | [`MarketDataStream`, written before anything implements it](TASK-02-the-interface-written-before-the-client.md) | **Before the client** — `PROVIDER.md`'s own test of whether a seam is real                        |
| 3.2.3 | [The recorded frame corpus](TASK-03-the-recorded-frame-corpus.md)                                               | Nothing below can be tested without it, and the captures are gone                                 |
| 3.2.4 | [The pure mapping, and the revision case](TASK-04-the-pure-mapping-and-the-revision-case.md)                    | Pure before transport, the `alpaca-mapping.ts` arrangement                                        |
| 3.2.5 | [The Alpaca client and the watchdog](TASK-05-the-alpaca-client-and-the-liveness-watchdog.md)                    | **Before the replay** — "a convenience built first becomes the thing everything is shaped around" |
| 3.2.6 | [The fixture stream](TASK-06-the-fixture-stream.md)                                                             | The second implementation, which is where a fake seam falls over                                  |
| 3.2.7 | [The replay stream over our own bars](TASK-07-the-replay-stream-over-our-own-bars.md)                           | Third, guarded, and the instrument Story 3.4 needs                                                |
| 3.2.8 | [The guards that stop it rotting](TASK-08-the-guards-that-stop-it-rotting.md)                                   | The runtime half, which a credential-free `verify` cannot make                                    |
| 3.2.9 | [Verify, document, and the close](TASK-09-verify-document-and-the-story-close.md)                               | The sweep and the hand-offs                                                                       |

**The three orderings that are decisions rather than convenience:**

1. **3.2.1 before everything — and it is now HALF the size this said, amended
   2026-09-18 after implementing it.** The claim was that widening
   `PROVIDER_IDS` here is what lets later tasks stamp `replay`. **That was
   wrong in a way the implementation caught**: `market-provenance.test.ts` holds
   a standing rule — _a provider id is a member only when something can produce
   it_ — and nothing produces a replay bar until 3.2.7. Since
   `MarketDataProviderSelection` derives from that union, adding it here ships
   `MARKET_DATA_PROVIDER=replay` as a setting that validates and that nothing
   honours.

   **So the split is by kind rather than by convenience.** `MARKET_FEEDS` is a
   **label vocabulary** — no wrong state is reachable, and it lands in 3.2.1 so
   the words exist before anything can render them wrong. `PROVIDER_IDS` is
   **operator-settable configuration** and lands in **3.2.7**, beside the
   producer, which is also where it silently widens `schema.ts`'s insert types —
   **so the window 3.2.8 closes with a runtime guard opens in 3.2.7, not here.**

2. **3.2.2 before 3.2.5.** An interface extracted from a working client is a
   description of that client.
3. **3.2.5 before 3.2.7.** The story's own "what must not rot" item 3. If 3.2.5
   slips, **let it slip** rather than building the replay first.

### A note on visible progress, because this story has none

**Eight of these nine tasks put nothing on a screen, and that is the story's
design rather than a shortfall.** The epic was sequenced so the payoff is close:
**Story 3.3 is next, and it is the first time the product says something true
about the market _now_.** Pulling any of it forward is the scaffolding
`CLAUDE.md` forbids, and the story's _Out of scope_ names Story 3.3 as the owner
of anything reaching a browser.

**The one thing here that produces visible movement is 3.2.7**, and it is for a
**developer** rather than a user: `pnpm dev` outside a session replays real
stored bars, which is the instrument **Story 3.4 needs** to settle the motion
vocabulary against real moving numbers. Invented prices cannot settle it.

**So the honest way to serve the stakeholder interest here is to keep this story
tight**, so 3.3 lands sooner — not to widen it.
