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

**A second motive was proposed and rejected by the product owner, and it is
recorded because `PRODUCT_SPEC.md` will keep generating it.** §38 is built around
a five-minute demonstration and §40's criterion is a first-time viewer
understanding the product in about a minute, so a market product that is inert
for three-quarters of every week looks like it fails both — which argues for the
deployed site replaying when the market is shut, so a Saturday visitor sees
something alive.

**That is refused, in one sentence and without qualification: the deployed site
is production, it has real users, and it must only ever tell the absolute truth
about the real market.** A page that is honestly still is not a product defect;
a page that is alive with yesterday's prices is, however well it is labelled,
because the label is the only thing standing between a viewer and a false
impression — and §35 forbids manufacturing observations rather than forbidding
manufacturing them unlabelled. So **replay is a development instrument and never
a deployed one**, and this ADR's decisions 7a–7c exist to make that structural
rather than a habit. What answers §38 and §40 is a demonstration given during a
session, or a separate clearly-labelled surface that is not production at all —
named in the reversal triggers, not built here.

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
as a claim about the **market**. With a replay running on a Saturday afternoon
those two diverge completely, which is precisely why `FeedStatus` and
`MarketSessionStatus` are separate vocabularies — this is the first time that
separation earns its keep on screen.

Three regions, three facts, none of them collapsing into the others: the market
clock still says **closed**, because a replay running does not open a market; the
feed region says **Replay** with its sentence, square and amber, the treatment
`synthetic` already has; the connection region reports arriving observations
honestly.

**These words never render in production** (7a) — a developer's screen is their
only audience. They are specified to the same standard anyway, and the reason is
not tidiness: a screenshot of a local run is the most likely thing to escape into
a README, a slide or a message, and the first draft of this ADR had to carry
"a screenshot cropped above the status strip" as a residual risk. Holding the
development surface to the production standard is what retires it.

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

### 7a. The deployed site never replays. Ever, at any hour

**Production has real users and must only ever tell the absolute truth about the
real market.** The deployed backend is configured `MARKET_DATA_PROVIDER=alpaca`,
and outside a session it shows what it honestly has: stored history, a market
clock reading **closed**, and a feed that is not delivering. A still page that is
true beats a moving page that needs a caption to be true.

This is the strongest form of the objection's answer, because it removes the
premise: **there is no deployed replay to mistake for a live feed.** It also
deletes the residual risk the first draft of this ADR had to carry — a
screenshot cropped above the status strip losing its label — since no such
screenshot can be taken of production.

**And it is configuration, guarded by checks, rather than a physical
impossibility — which is worth saying plainly rather than overclaiming.** ADR
0006 established that there is no `NODE_ENV` and nothing branches on which
environment it is in; what differs between environments is where _values_ come
from. That rule is not reversed here, because "which provider serves prices" is
exactly a value. What it costs is that the guarantee needs two checks rather
than a compiler, and those are 7b and 7c.

### 7a-bis. The process refuses to start — shipped 2026-09-16

**Added after this ADR was written and before it merged, because the honest
answer to "how is this guaranteed?" was "it is not".** The paragraph below 7a
still stands — this is configuration rather than a compiler — but the shape has
changed in the way that matters: **a single wrong value, or any omission, now
stops the process.**

`config.ts` refuses to start when `MARKET_DATA_PROVIDER` names a provider that
`PROVIDER_SERVES` marks `not-the-live-market` and `NON_LIVE_MARKET_DATA` is not
`permitted`. Three properties earn their place:

- **The classification is total.** `PROVIDER_SERVES` is a
  `Record<ProviderId, …>` in `packages/shared`, so a provider added without an
  answer to _is this the live market_ **does not compile**. That is the half
  that holds for providers nobody has thought of yet — `replay` included, when
  Story 3.2 adds it.
- **It never asks which environment it is in.** ADR 0006 decision 4 is honoured
  rather than reopened, and that ADR now carries a dated amendment recording
  that its reversal trigger was examined here and declined. The rule is
  identical everywhere; only the value differs.
- **It is preventive without a new assertion.** `index.ts` exits 1, and
  `deploy.yml` already fails a rollout whose revision has a container that
  restarted. So a wrong configuration is a failed deploy, with the old revision
  serving throughout.

**And it closed a hole that predated the replay entirely.** `fixture` invents
prices, is a member of the documented vocabulary, and was one edit to the
container app away — with nothing in this repository noticing. That is the
first thing this refusal protects, before any replay code exists.

**What it does not do**, stated with the same care as everything else here: two
deliberate values still serve non-live data. `MARKET_DATA_PROVIDER=replay`
_and_ `NON_LIVE_MARKET_DATA=permitted`, both set on purpose, start a replay
anywhere. Nothing in software prevents that, and no mechanism below claims to.

**The residual claim, still owed a measurement.** That a crash-looping new
revision leaves the old one serving is inherited reasoning: Task 1.11.5 measured
it for a rollout, not for an environment variable edited by hand between
deploys. Until somebody takes that reading against the container app, 7b and 7c
are what stand behind the refusal for that case.

### 7b. A deploy READS the configured provider and refuses to roll on the wrong one

**Corrected 2026-09-16, before this ADR merged: an earlier draft said the deploy
should _set_ `MARKET_DATA_PROVIDER=alpaca`, and that contradicts an argued
decision in `deploy.yml` itself** — the update step deliberately does not
re-specify the app's environment variables, because "a deploy step that restated
them would be a second definition of the app's configuration", which is the
failure Story 1.10 forbids for the build. The variables live on the container
app, set out of band. Today's deployed value is `alpaca`, read from the app on
2026-09-16.

So the gate **reads and asserts** rather than sets, which is not a second
definition: `az containerapp show` before the image rolls, and the deploy
**fails if the configured provider is anything but `alpaca`**. This is the only
one of these mechanisms that is genuinely **preventive** — the wrong
configuration never serves a request.

**What it does not cover, stated plainly:** an environment variable changed by
hand on the container app **between** deploys. That creates a new revision and
restarts the app with no workflow running at all, so nothing in 7b sees it. That
gap is 7c's and 7e's.

### 7c. `check-deployed.mjs` fails, unconditionally, if production is ever replaying

Not conditionally on the hour, not tolerantly: **if `/diagnostics/feed` on the
deployed origin reports a `replay` provider or feed, the check fails.** Its
output is a rollback decision (ADR 0011), which is the only kind of runtime claim
`verify` can never make — it has no credentials and no network by design.

**This is detective rather than preventive, and the distinction is the whole
honesty of this section.** `check-deployed` runs after the rollout, so by the
time it goes red the thing it objects to has already served traffic. What it
bounds is the **duration** of a wrong state, not its existence.

### 7d. A daily scheduled probe, because a merge is not the only way to change production

`deploy.yml` triggers on `workflow_run` of `verify` and on `workflow_dispatch`
and **has no `schedule:`**, so between merges nothing in this repository looks at
the deployed app at all. A hand-edited environment variable on a quiet Tuesday
would therefore be invisible until the next merge — which on this project can be
days.

A scheduled run of the same `/diagnostics/feed` assertion closes that to
**one day**. It is the cheapest of these mechanisms and the only one that covers
the gap the other two share.

### 7e. Two keys, so one wrong value cannot do it

`MARKET_DATA_PROVIDER=replay` alone is not sufficient to start a replay: it also
requires a second, separately-named opt-in that production has never had and
that reads unmistakably in a configuration listing — the deployed app must carry
**neither** key, and 7b and 7c check for both.

The point is not that two variables are harder to set than one. It is that the
**first** one is a value in an existing, ordinary vocabulary that somebody could
plausibly change for a reason that seemed good, and the second exists only to
say _this is not production_. A configuration listing that contains it is
self-evidently wrong to a human reading it, which is the property a single
enumerated value does not have.

### 7f. Replay is structurally incapable of running during a session

Unchanged from the first draft of this decision and still worth having, now as
a **developer-side** guard rather than a production one: `createReplayStream`
refuses to start, and stops if already running, whenever
`marketSessionStateAt(now)` is `open`. `packages/shared/src/market-session.ts`
already answers that question exactly and already ships.

What it protects is the case 7a cannot reach: a developer who left
`MARKET_DATA_PROVIDER=replay` in their `.env`, working during a session, quietly
building against a recording while believing they are on the live feed. It is
also the thing that makes a local `pnpm dev` at 22:00 tell the truth about a
broken socket. **It owes a `pnpm break` entry.**

**One consequence worth stating, because it is the opposite of what a reader
expects.** The deployed site now connects to the real IEX socket during every
session and nothing else ever serves there — so the live feed is exercised
_more_ under this ADR than it would be without it, not less.

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
`iex` and disconnected, or has seen no observation inside the tolerance** — and,
per 7c, when the feed is `replay` at **any** hour.

Out of hours the check asserts the honest still state rather than a moving one:
the provider is `alpaca`, the connection is not delivering, and the market clock
says closed. **A quiet production feed out of hours is correct**, which is why
the assertion is about the feed's identity and the market's state rather than
about observations arriving.

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

- **The first time a replayed observation could be mistaken for a live one on a
  developer's screen** — reverse decision 4's wording, not the mechanism. In
  production this cannot arise, because 7a means there is no replayed
  observation there to mistake.
- **The first time the product wants a genuinely 24/7 asset class for its own
  sake**, rather than as a development convenience — reopen the crypto rejection
  in Context, which is about domain cost and not about the wire.
- **The first time a deployment needs one vendor for history and a different one
  for the stream** — that is the first real pressure on `PROVIDER.md` §12's
  single shared `MARKET_DATA_PROVIDER`, and it is not this.
- **The first time a replay runs during a session** by any route — decision 7f
  has been defeated, and everything downstream of it is void.
- **The first time a replay reaches production** by any route — 7a has been
  defeated and this is the most serious of these triggers, because production
  told a user something untrue. The response is not to weaken the decision but
  to find which of 7b, 7c, 7d and 7e failed to catch it — **and then to take the
  startup-refusal step named in 7a**, because at that point the evidence says
  configuration-plus-checks was not enough.
- **The first time somebody asks for a demonstrable surface that is alive out of
  hours** — the answer is **not** production (7a is not up for renegotiation on
  those grounds, having been decided on exactly that argument). It is a separate
  deployment, on its own hostname, that is not this product's production site
  and says so. Nobody has asked; it is named here so the request arrives at the
  right answer instead of at 7a.

## Consequences

- The three stories that need moving numbers can be worked in daylight, and
  Story 3.4's design test gets more than one evening.
- **The deployed site is unchanged by this ADR**, which is the point. It serves
  the real feed during a session and an honest still page outside one, exactly as
  it would have without any of this. The convenience is a development
  convenience and stops at the deployment boundary.
- **`PRODUCT_SPEC.md` §38 and §40 are not satisfied out of hours**, and that is
  now a recorded consequence rather than a gap. A first-time viewer opening the
  site on a Saturday sees a historical explorer. The answer is a demonstration
  given during a session, and the reversal triggers name the only other route
  that does not touch production.
- Epic 13 inherits a tested replay mechanism and a tested temporal-isolation
  discipline instead of a plan. It still owns everything that makes replay a
  **feature**: the clock UI, the scrubber, play/pause, jump-to-event,
  "investigate at this moment", and the Kysely temporal plugin.
- One additive migration, and a second vocabulary member in two unions.
- **The live feed is exercised more, not less**, than it would have been without
  this — 7a keeps the deployed site on the real socket for every session, and
  7c watches it after every merge, which is more scrutiny than it had before this
  ADR existed.
- **The guarantee is configuration plus two checks, not a compiler.** Stated
  again here because it is the thing a future reader will most want to have been
  told: nothing physically prevents a replay binary from being pointed at
  production. 7b stops the deploy and 7c stops the merge from standing. If a
  third guard is ever wanted, the honest one is making the deployed
  configuration's provider assertion part of the container's own startup refusal
  — and that is the first thing that must _behave_ differently by environment,
  which is ADR 0006's stated reversal trigger and a separate decision.

## Related

- [ADR 0027](0027-the-chart-layer-hand-built-svg-and-what-a-green-chart-suite-certifies.md) — the session-ordinal axis a replayed session draws on unchanged
- [ADR 0029](0029-provenance-on-screen-the-partial-states-and-what-an-honest-empty-answer-certifies.md) — a claim about data requires data; the feed's words have one home
- [ADR 0011](0011-deploying-both-halves-and-what-a-green-deploy-certifies.md) — `minReplicas: 1`, which a long-lived in-process stream rests on
- [`LIVE-DATA.md`](../../planning/epic-03-live-market-data/story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) — the subject document, §2.6 for the words and §6 for what a shut socket does
- [`PROVIDER.md`](../../planning/epic-02-security-universe-historical-data/story-06-market-data-provider-abstraction/PROVIDER.md) §12 — the sibling-interface shape this does not reopen
