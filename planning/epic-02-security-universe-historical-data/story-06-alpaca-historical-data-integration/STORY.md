# Story 2.6 — Alpaca Historical Data Integration

**Status:** Not started
**Epic:** [Epic 2 — Security Universe & Historical Market Data](../EPIC.md)
**Depends on:** Story 2.5 (and Story 2.1 for the credential mechanism)
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

## Why it sits here in the sequence

After the interface exists and before anything stores data. This story is also the first
place the product meets a real external system's real limits, and those limits shape
Story 2.7's ingestion design — so it must precede it.

## Scope

- The client: authentication, base URL, the bars endpoint, pagination, request
  construction, response mapping to Story 2.5's domain types
- **The free tier's actual constraints, measured rather than cited.** Everything commonly
  "known" about Alpaca's free plan — the IEX feed, the request rate, how far back history
  goes, whether recent data is withheld, what a multi-symbol request costs — should be
  established by making the requests and reading the responses. Prices for getting this
  wrong are paid in Story 2.7, which is sized against these numbers, and in Epic 3, which
  is sized against the streaming equivalents
- Rate limiting and backoff, implemented against the measured limit, including what
  happens on a 429 and whether the limit is per-key or per-endpoint
- Timeframe support, and which timeframes the product actually requests
- Error mapping: every Alpaca failure mode onto Story 2.5's error union, with the ones
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

- Storing anything — Story 2.7
- The WebSocket stream, subscriptions and reconnection — Epic 3
- Trades and quotes, unless a measurement shows bars alone cannot serve Story 2.11's chart

## Open decisions — settle with the user

1. **Which timeframes to request and hold.** Daily bars serve a multi-month chart cheaply;
   minute bars serve intraday and are what Epic 5's five-minute return calculations and
   Epic 13's replay ultimately need. Fetching minute bars now is more data and more
   ingestion time; fetching only daily now means re-running a large backfill later. This
   decision belongs to a person, and Story 2.7 depends on it
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
   of question; or decline it here and hand it to Story 2.7's ingestion, which is the first
   thing that will actually notice bars stopping. Whichever it is, **an honest deferral
   with a named owner beats a mechanism built against no instance** — and note the answer
   is worth taking on evidence, because a symbol whose bars stop arriving and a symbol
   Alpaca reports inactive are two different signals and only one of them needs a request

## Acceptance criteria

1. Real bars for a real symbol are retrieved from Alpaca, and the response is mapped to
   the domain types with provenance recording the IEX feed
2. The measured plan limits are written down as measurements with the date they were taken
3. Each mapped error cause is produced against the live API at least once, including a bad
   key and an unknown symbol
4. Rate limiting is exercised — the client behaves correctly at the limit rather than
   being assumed to stay below it
5. The key is on the platform, is absent from the repository, the bundle and every log
   record, and a deliberate log of the request path is inspected to confirm the last one
6. The application still builds, tests and runs with **no** Alpaca key present
7. `pnpm verify` passes with no network access

## What this story hands forward

Real market data, the numbers Story 2.7 is designed against, and a second credential
placed through a path that has now been used twice.
