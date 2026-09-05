# Story 2.7 — Alpaca Historical Data Integration

**Status:** Not started
**Epic:** [Epic 2 — Security Universe & Historical Market Data](../EPIC.md)
**Depends on:** Story 2.6 (and Story 2.1 for the credential mechanism)
**Epic scope covered:** Alpaca historical-data integration; Alpaca credential on the platform (the _key_ half)

## Prerequisite — not a task

An Alpaca account with market-data API keys must exist before this story can be finished.
Epic 1 hit the same shape with the Azure subscription and recorded it as
`ACCOUNT-SETUP.md`, a prerequisite row rather than a task, because nothing between two
tasks owned creating an account. Do the same here: the offline half of this story (client,
mapping, error handling, fixtures) can be built and tested against recorded fixtures with
no account at all, and the account gates only the live verification.

## Description

Implement the provider interface against Alpaca's historical market-data API, and place
the Alpaca key through the credential path Story 2.1 established.

## What the user can see when this story lands

**Nothing on screen, and for the first time in this epic the reason is not "it is backend
work" — it is that this story deliberately fetches into a terminal rather than a database.**
Story 2.8 is what stores anything.

What it unblocks is every number in the product. **The payoff is visible in Story 2.12.**

**One thing here changes what a user is eventually told**, and it should be treated as a
deliverable rather than a footnote: this story is the first to hold a real Alpaca key
against a real account, so it is where the **feed's actual shape** is measured — what IEX
coverage looks like for a thinly traded name, what a missing minute is, and whether the free
tier's 30-channel cap exempts minute bars. `UNIVERSE.md` §10 parks the size of the tracked
universe on that last measurement, so this story either confirms 101 securities or starts a
conversation about the number.

## Why it sits here in the sequence

After the interface exists and before anything stores data. This story is also the first
place the product meets a real external system's real limits, and those limits shape
Story 2.8's ingestion design — so it must precede it.

## Scope

- The client: authentication, base URL, the bars endpoint, pagination, request
  construction, response mapping to Story 2.6's domain types
- **The free tier's actual constraints, measured rather than cited.** Everything commonly
  "known" about Alpaca's free plan — the IEX feed, the request rate, how far back history
  goes, whether recent data is withheld, what a multi-symbol request costs — should be
  established by making the requests and reading the responses. Prices for getting this
  wrong are paid in Story 2.8, which is sized against these numbers, and in Epic 3, which
  is sized against the streaming equivalents
- Rate limiting and backoff, implemented against the measured limit, including what
  happens on a 429 and whether the limit is per-key or per-endpoint
- **Confirm the WebSocket subscription cap, even though the stream itself is Epic 3's, and
  do it FIRST.** This is an explicit and narrow exception to the out-of-scope line below,
  added 2026-09-05 because **Story 2.3's universe sizing is parked on the answer** and this
  is the first story in the project that holds an Alpaca key — so it is the first place the
  question can be asked at all. Two sources disagree by two orders of magnitude:
  [the pricing page](https://alpaca.markets/data) says the free plan is
  **"Limited to 30 symbols"** flatly, while
  [Alpaca's own streaming guide](https://alpaca.markets/learn/streaming-market-data) says
  the limit is **"30 channels at a time for trades and quotes"** and that **"there is no
  limit to the number of channels with minute bars"**; the reference documentation states
  neither. **The whole product rests on which is true**, because §11's four calculations —
  price percentile, volume ratio, relative move, breadth — are every one of them bar-based
  and consume no trade and no quote. If bars are exempt, the universe can grow to whatever
  IEX quality supports. **If the cap is 30 across all channels, the current 101-security
  universe is already over it and Epic 3 has a blocker rather than a tuning problem** —
  which is why this is measured here and not discovered in Epic 3. It is one connection,
  one subscribe message and a read of the response; do it before building anything, and
  record it in `UNIVERSE.md` §10, which is where the parked decision lives
- Timeframe support, and which timeframes the product actually requests
- Error mapping: every Alpaca failure mode onto Story 2.6's error union, with the ones
  that matter produced deliberately — bad key, unknown symbol, range in the future, range
  before the plan's history limit, rate limit exceeded
- The credential: on the platform through Story 2.1's mechanism, in `apps/backend/.env`
  locally, in `CONFIG_VARIABLES` and `.env.example` so `env:check` covers it, and
  **structurally unable to reach the browser** — the frontend talks to the MarketPulse
  backend and never to Alpaca (§7.1's provider isolation and ADR 0006's boundary)
- Recording fixtures from real responses, so the fixture provider stays honest
- **Inherited from Story 2.3: this is where `delisted` becomes producible.**
  `SECURITY_STATUSES` ships with exactly two members, `active` and `untracked`, because
  those are the two Story 2.3 could produce — following this repository's own rule that a
  member is added when the thing it names can be produced, the rule `API_ERROR_CODES` has
  now been held to three times. `delisted` is a genuinely different event from `untracked`
  (one is a fact about the market, the other a fact about us, and a symbol we stopped
  tracking is reversible where a delisted one is not), and **Alpaca's assets endpoint is
  the first thing in this product with any opinion about whether a symbol is still
  listed**. Note that this is a _different endpoint_ from the bars endpoint this story is
  otherwise about, so adopting it is a real scope choice rather than a free consequence —
  see open decision 4. `UNIVERSE.md` §3 is the record, and the migration is one of a shape
  proved twice: drop the check, add the member, add the check

## Out of scope, and who owns it

- Storing anything — Story 2.8
- The WebSocket stream, subscriptions and reconnection — Epic 3. **One narrow exception,
  added 2026-09-05: the subscription CAP is measured here**, per the scope bullet above,
  because Story 2.3's sizing is parked on it and this story is the first to hold a key.
  Measuring a limit is not building a stream, and the alternative is a universe sized
  against a documentation sentence that two Alpaca pages disagree about
- Trades and quotes, unless a measurement shows bars alone cannot serve Story 2.12's chart

## Open decisions — settle with the user

1. **Which timeframes to request and hold.** Daily bars serve a multi-month chart cheaply;
   minute bars serve intraday and are what Epic 5's five-minute return calculations and
   Epic 13's replay ultimately need. Fetching minute bars now is more data and more
   ingestion time; fetching only daily now means re-running a large backfill later. This
   decision belongs to a person, and Story 2.8 depends on it
2. **How far back.** History depth drives storage, backfill runtime, and whether Epic 5's
   return distributions have enough observations to be meaningful
3. **What a missing or invalid key does at startup.** Refuse to start, or start degraded
   and report it. The second is more consistent with §36 and with Story 1.12's `degraded`
   vocabulary; the first fails earlier and louder
4. **Whether this story adds the `delisted` status member, and if not, who does.** Story
   2.3 deferred it here by naming the producer rather than by leaving it open, so the one
   thing this story must not do is leave it unanswered — that is how a deferral with an
   owner becomes a deferral with none. Three shapes, and the middle one is probably right:
   call the assets endpoint during ingestion and transition a symbol's status when Alpaca
   says it is no longer active; call it once as a **reporting** check that names symbols
   worth looking at and changes no row, which is Task 2.1.7's shape for exactly this kind
   of question; or decline it here and hand it to Story 2.8's ingestion, which is the first
   thing that will actually notice bars stopping. Whichever it is, **an honest deferral
   with a named owner beats a mechanism built against no instance** — and note the answer
   is worth taking on evidence, because a symbol whose bars stop arriving and a symbol
   Alpaca reports inactive are two different signals and only one of them needs a request

## Acceptance criteria

1. Real bars for a real symbol are retrieved from Alpaca, and the response is mapped to
   the domain types with provenance recording the IEX feed
2. The measured plan limits are written down as measurements with the date they were taken
   — **including the WebSocket subscription cap and specifically whether minute bars are
   exempt from it**, which is the one measurement another story is blocked on
3. Each mapped error cause is produced against the live API at least once, including a bad
   key and an unknown symbol
4. Rate limiting is exercised — the client behaves correctly at the limit rather than
   being assumed to stay below it
5. The key is on the platform, is absent from the repository, the bundle and every log
   record, and a deliberate log of the request path is inspected to confirm the last one
6. The application still builds, tests and runs with **no** Alpaca key present
7. `pnpm verify` passes with no network access

## What this story hands forward

Real market data, the numbers Story 2.8 is designed against, and a second credential
placed through a path that has now been used twice.

**And one answer another story is waiting on**: whether minute-bar subscriptions are exempt
from the free plan's 30-channel cap. `UNIVERSE.md` §10 in Story 2.3 records the universe
sizing as **parked on that measurement**, with both branches written out — if bars are
exempt the universe reopens at ~500 with ~1,500 as the architectural target, and if they
are not then 101 is already over the cap and Epic 3 has a blocker. **The deadline is Story
2.8**, not this story: nothing in the tree encodes the security count, so re-sizing costs
one file edit for exactly as long as no bars have been stored against those rows.
