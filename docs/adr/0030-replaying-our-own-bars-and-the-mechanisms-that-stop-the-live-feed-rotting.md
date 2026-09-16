# ADR 0030 — Replaying our own bars, and the mechanisms that stop the live feed rotting behind it

**Status:** Accepted
**Date:** 2026-09-16
**Delivered by:** Epic 3 — decided during Story 3.1, implemented by Story 3.2

## Context

**This product's market is open while its developer is asleep.** The US regular
session is 09:30–16:00 ET; the person building MarketPulse is in Asia/Singapore,
where that is **21:30–04:00**. Every figure in `LIVE-DATA.md` §4 and §6 was taken
in that window, and Task 3.1.3 lost its headline measurement to it — a 5½-hour
capture died four hours in when a laptop lid closed, and the open boundary went
with it.

That is an inconvenience for a measurement task. It is a **product** problem for
three stories that have not started:

- **Story 3.4 settles the motion vocabulary**, the fourth design test, answered
  "not yet" seven times and handed to this epic by name. Its own text requires
  the answer be taken "against real moving numbers" with "the market open". A
  design decision taken at 23:00, once, is how a criterion gets deferred an
  eighth time.
- **Stories 3.6 and 3.7** put motion on the universe table and the chart's live
  edge, and **3.10** is the complete set of degraded states.

There is a second, independent motive. `PRODUCT_SPEC.md` §38 is built around a
five-minute demonstration and §40's success criterion is a first-time viewer
understanding the product in about a minute. **A market product that is inert
for three-quarters of every week fails both** — an interviewer opening the
deployed site on a Saturday sees a historical explorer with a still price.

### What was considered and rejected

**Relocating to an Asian equity market** (SGX, HKEX, ASX, TSE) was rejected on
measured coupling rather than on taste. Alpaca is US-only — `alpaca-assets.ts`
queries `asset_class=us_equity` — so it needs a **new vendor**, and then: a new
ticker grammar (`TICKER_PATTERN` is `/^[A-Z]{1,5}(\.[A-Z])?$/` and is the
branded natural key of the whole system); a second timezone seam where none
exists, `MARKET_TIME_ZONE` in `packages/shared/src/market-time.ts` being a
module-private singleton with no `calendarFor(market)` anywhere; a new calendar
table; a currency concept the product does not have at all, `PRICE_DECIMALS = 2`
being its only answer; and the loss of **SEC EDGAR**, which is Epic 9 and the
product's stated differentiator. It also makes 48.4M stored bars worthless.

**A live 24/7 crypto feed** was rejected for now, and the shape of its cost is
worth recording because it is the opposite of the intuition. It is _cheap on the
wire_ — same vendor, same credential, a separate endpoint, and free data with no
IEX-style venue restriction — and _expensive in the domain_: the ticker grammar
rejects `BTC/USD`; `Security` is a sector-bearing discriminated union mirrored by
`securities_sector_check` and `securities_sector_matches_kind` in SQL and by the
loader's "every sector present has its ETF" rule; and **"session" is the unit of
the public API** (`?sessions=N`), of the ingestion ledger's unique key, of the
completeness model (390 bars) and of the chart's X axis, which ADR 0027 makes
session-ordinal. `PRODUCT_SPEC.md` §37 also excludes crypto outright.

**Generated synthetic prices alone** were rejected as insufficient, while being
kept for `pnpm test`. Invented numbers cannot settle a motion vocabulary,
because the shape of real intraday movement is the thing being designed against.

## Decisions

### 1. A third implementation of the stream seam, replaying bars we already hold

`MarketDataStream` — the sibling interface `PROVIDER.md` §12 and `LIVE-DATA.md`
§1.1 already fix — gains a third implementation beside the Alpaca IEX client and
the generated fixture stream: **`createReplayStream`, over the 48,449,712 minute
bars in `market_bars`** (518 securities, 2025-09-08 to 2026-09-11), read through
the shipped `MarketBarsRepository.readBars`.

All three emit the same `Bar` through the same normalization and fan-out. That
is what makes a replay a **rehearsal of the live path rather than a parallel
one**, and it is why the alternative of a separate "demo mode" was rejected: a
second path is a second thing to keep working.

The engine takes a `ReplayBarSource` rather than a repository, so one engine
serves both the store-backed case and an in-memory one. `pnpm test`'s contract —
no database, no network — survives without a second implementation of the
pacing, ordering and stamping logic.

### 2. Bars are re-stamped onto the wall clock, and `occurredAt` keeps the truth

A replayed observation carries **two** instants: `bar.startsAt`, shifted onto
today's clock, and `occurredAt`, the original recorded instant.

Leaving the recorded timestamps unshifted was considered and is worse in the
direction that looks like a bug: `now − observation` would be months, so the
staleness evaluator, the `LIVE` indicator and the chart's live edge would all be
permanently and silently wrong — the rehearsal would rehearse nothing.

**This is `0004_market_bars.sql`'s named trap performed deliberately** — that
migration warns that `default now()` "silently turns one into the other on the
column replay keys on". Doing it on purpose, in memory, is why decision 5's
never-store rule is structural rather than a convention.

### 3. `replay` is a `ProviderId` **and** a `MarketFeed`, with its own words

`PROVIDER_IDS` gains `replay`, breaking the exhaustive switch in
`market-data.ts` by design — the mechanism that has fired once before. It
resolves to `undefined` for the **historical** seam exactly as `none` does, which
`serve-series.ts` already treats as "serves stored history and no tail".

`MARKET_FEEDS` gains `replay` with a sentence of its own. Neither existing member
is honest here: `sip` is the recording's real tape and printing it beside a
live-looking screen is exactly the coverage implication `PRODUCT_SPEC.md` §7.1
forbids, while `synthetic`'s "Generated test data. Not a market feed." invites a
viewer to dismiss numbers that are **real**. The sentence says what it is:

> **Market feed: Replay** — real bars from a past US session, replayed. Not the
> live market.

**It carries a migration, and that was verified rather than assumed.**
`market-bars.database.test.ts` ties `bar_coverage_provider_check` and
`bar_coverage_feed_check` to these two unions and asserts set equality, so
widening a union without widening the SQL check turns `pnpm test:database` — a
required check — red. Weakening that test to a subset assertion was rejected: its
entire value is that the union and the database are one vocabulary, and
weakening it to accommodate a member we never store is how the invariant-6
column drifts.

### 4. The word on screen is `REPLAYING`, never `LIVE`

`FeedStatus.live` is a claim about a **connection**; `LIVE` in the chrome reads
as a claim about the **market**. With a replay running on a Saturday those two
diverge completely, which is precisely why `FeedStatus` and `MarketSessionStatus`
are separate vocabularies — this is the first time that separation earns its keep
on screen.

Three regions, three facts, none of them collapsing into the others: the market
clock still says **closed**, because a replay running does not open a market; the
feed region says **Replay** with its sentence, square and amber, the treatment
`synthetic` already has; the connection region reports arriving observations
honestly.

This adds a **fifth cell** to `LIVE-DATA.md` §2.6's four-cell grid and is
recorded there, because that section owns the words.

### 5. A replayed bar can never be stored, and the guard is a throw

`recordSeries` refuses any series whose provenance names `replay`, by throwing.
`PROVIDER.md` §8.5's line puts it there: a result says what happened to a
request, a throw says the program is wrong, and writing a re-stamped bar into
the column Epic 13 keys on is the program being wrong.

Note what this replaces. Widening `PROVIDER_IDS` widens `schema.ts`'s insert
types, so **the compiler stops preventing the write at the same moment the
database check starts permitting the value**. Both guards move to runtime in one
step, and this throw is the single thing standing there — which is why it owes a
`pnpm break` entry rather than a comment.

### 6. The default stays `none`

`PROVIDER.md` §5.3's rule holds and gets **stronger**: replayed real prices
presented as live are more dangerous than invented ones, because they are
plausible. A default that quietly works is one that quietly ships misleading
data.

## The objection this ADR exists to answer

> _"We might build the app against the dummy feed and forget to have it working
> properly against the real live feed."_

That is the correct objection, it is not answered by intent, and it is the reason
the decisions below are mechanisms rather than practices.

### 7. Replay is structurally incapable of running during a session

**`createReplayStream` refuses to start, and stops if already running, whenever
`marketSessionStateAt(now)` is `open`.** `packages/shared/src/market-session.ts`
already answers that question exactly and already ships.

The consequence is the whole answer: **during market hours the only thing that
can serve is the real IEX socket.** If it is broken, the product shows a broken
live feed — on the developer's machine and on the deployed site, every trading
day, whether or not anyone is watching. There is no configuration in which a
replay covers for a dead socket, so the failure mode the objection describes
cannot be reached by forgetting anything.

It also means the deployed site exercises the real socket for 6½ hours a day,
unattended.

### 8. `GET /diagnostics/feed`, and a deployed check that fails on it

The repository already has this pattern: `GET /diagnostics/freshness` answers
_how many sessions behind is the store_, computed on request so it has no
schedule to miss, and `check-deployed.mjs` fails on it after a merge as a
rollback signal. `verify` has no credentials and no database by design, so a
runtime claim belongs in a runtime check.

`/diagnostics/feed` reports the configured selection, the stream's `id` and
`feed`, the connection state, the newest observation's arrival and its
`occurredAt`, and whether the market is open by our own calendar. The deployed
check then fails when **the market is open and the feed is not `iex`, or is
`iex` and disconnected, or has seen no observation inside the tolerance** — and
out of hours it asserts the complement, because a replay that has quietly died
is also a defect.

That converts "did we forget the live feed?" from something a person must
remember into something that runs on every merge.

### 9. The real transport is buildable at a civilised hour, on real vendor bytes

Two instruments, and the pairing is the point: **replay gives realistic data at
any hour, and it gives nothing at all about the transport.** What covers the
transport is recorded socket frames as fixtures — the `src/fixtures/alpaca/`
shape, raw vendor bodies excluded from Prettier because formatting rewrites
evidence — which Story 3.2 already requires for every observed state including
the unhappy ones, inside `pnpm verify`, with no network and no credential.

Beside it, **Alpaca's own always-on test stream** (`wss://…/v2/test`, symbol
`FAKEPACA`), which the vendor documents as available outside market hours,
exercises the real TLS, handshake, authentication, frame parsing, control frames
and close codes at 2pm Singapore. It is one fake symbol and therefore no
substitute for decision 7 — it is how the transport gets _built_ rather than how
it gets _accepted_. **Unverified as of this date**; Task 3.1.5's window is where
it gets one run before anything relies on it.

### 10. The real client is built first, and a story is never accepted against a replay

Story 3.2 builds `createAlpacaStream` and its recorded-frame tests **before**
`createReplayStream`. A convenience built first becomes the thing everything is
shaped around.

Each visible story in this epic carries a Done-when naming a **dated rehearsal
against the real IEX feed during a session**, recorded as one row in
`LIVE-REHEARSAL.md` in the epic directory. **Story 3.11 cannot close with a
missing row**, and that is a grep rather than a promise — which is exactly why it
is written down here: it is the one process-shaped mechanism in this ADR, so it
is the one most in need of a mechanical backstop.

The rehearsals are short because decision 7 guarantees the real feed is what runs
when the bell rings.

## What a green suite certifies here, and what it does not

**Certifies:** that the replay engine paces on recorded offsets and not array
position; that it never emits a bar after its own clock (invariant 4 in
miniature, and the first place that constraint is real rather than anticipated);
that a replayed series cannot be written to `market_bars`; that the widened SQL
checks and the widened unions are one vocabulary; that a feed without decided
words or a decided visual treatment is a compile error.

**Does not certify:** that the live socket works. Nothing in `pnpm verify` can —
it has no network and no credential by design. That claim is carried by decision
7 (the real feed is the only thing that can run during a session), decision 8
(a runtime check after every merge) and decision 10 (a dated rehearsal per
visible story). **A reader who finds this ADR and concludes the live feed is
covered by CI has misread it.**

It also does not certify anything about the _data characteristics_ of the live
feed — the rate, the arrival gap, what `t` marks, real IEX coverage. Those are
figures 6, 7, 8, 12 and 13 in `LIVE-DATA.md` §3 and they need a session. A
socket replaying our own store has said nothing whatsoever about what Alpaca
does at 09:30:00.

## Reversal triggers

Conditions rather than story numbers:

- **The first time a replayed observation could be mistaken for a live one on
  screen** — reverse decision 4's wording, not the mechanism.
- **The first time the product wants a genuinely 24/7 asset class for its own
  sake**, rather than as a development convenience — reopen the crypto rejection
  in Context, which is about domain cost and not about the wire.
- **The first time a deployment needs one vendor for history and a different one
  for the stream** — that is the first real pressure on `PROVIDER.md` §12's
  single shared `MARKET_DATA_PROVIDER`, and it is not this.
- **The first time a replay runs during a session** by any route — decision 7 has
  been defeated, and everything downstream of it is void.

## Consequences

- The three stories that need moving numbers can be worked in daylight, and
  Story 3.4's design test gets more than one evening.
- The deployed portfolio artefact is alive whenever a viewer opens it, with an
  honest label, and is demonstrably a _replay_ rather than implied to be live.
- Epic 13 inherits a tested replay mechanism and a tested temporal-isolation
  discipline instead of a plan. It still owns everything that makes replay a
  **feature**: the clock UI, the scrubber, play/pause, jump-to-event,
  "investigate at this moment", and the Kysely temporal plugin.
- One additive migration, and a second vocabulary member in two unions.
- **The live feed is exercised more, not less**, than it would have been without
  this — because decision 7 makes the deployed site connect to it every trading
  day rather than only when somebody is watching.

## Related

- [ADR 0027](0027-the-chart-layer-hand-built-svg-and-what-a-green-chart-suite-certifies.md) — the session-ordinal axis a replayed session draws on unchanged
- [ADR 0029](0029-provenance-on-screen-the-partial-states-and-what-an-honest-empty-answer-certifies.md) — a claim about data requires data; the feed's words have one home
- [ADR 0011](0011-deploying-both-halves-and-what-a-green-deploy-certifies.md) — `minReplicas: 1`, which a long-lived in-process stream rests on
- [`LIVE-DATA.md`](../../planning/epic-03-live-market-data/story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) — the subject document, §2.6 for the words and §6 for what a shut socket does
- [`PROVIDER.md`](../../planning/epic-02-security-universe-historical-data/story-06-market-data-provider-abstraction/PROVIDER.md) §12 — the sibling-interface shape this does not reopen
