# Story 2.7 — Alpaca Historical Data Integration

**Status:** In progress
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
  happens on a 429 and whether the limit is per-key or per-endpoint. **Amended 2026-09-07 by
  Task 2.6.5: this bullet as written reads as though it lives in the client, which is the one
  home that decision explicitly rejected.** Retry lives in a **wrapper implementing
  `MarketDataProvider`, composed around a provider** (`PROVIDER.md` §8.8, confirmed and
  recorded in `market-data-provider.ts`'s own module comment) — because a retry inside a
  provider makes the caller's deadline a lie and makes _"how many times did we ask the
  vendor"_ a question with a different answer per vendor. **So this story builds the wrapper
  and measures the numbers; it does not add a retry to the Alpaca client.** Three constraints
  are already settled and are not this story's to re-take: only retryable causes are retried,
  and `isRetryableOutcome()` is the source rather than a `switch` written here; a retry must
  not outlive the caller's deadline or its abort signal, so the wrapper gets no budget of its
  own and a `rate-limited` hint is a floor inside that bound rather than an extension of it;
  and a retry policy plus a rate limit is a **queue**, which has a depth, and an unbounded one
  is a memory leak wearing a politeness costume — so state the depth and what happens when it
  is full. **Cross-request pacing across a hundred symbols is Story 2.8's backfill and not
  this**; conflating them is how a backfill re-fetches ninety-nine symbols that answered
  perfectly because one was rate-limited
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
- **Recording fixtures from real responses — and note there are TWO corpora doing two
  different jobs, which `PROVIDER.md` §6.1 settles and which this story must not conflate.**
  Story 2.6's fixture provider produces **domain types** and parses no vendor JSON at all, so
  it has nothing vendor-shaped it could be wrong about and does **not** need re-recording.
  What this story records is the other corpus: **raw HTTP response bodies**, which are the
  only thing that can test the vendor **mapping**, which is the only place a vendor's shape
  can be got wrong. Do not "re-record Story 2.6's fixtures"; that is the wrong instruction
- **And reconcile Story 2.6's generator against one real series — three numbers, each an
  assumption that story is making and structurally cannot check** (`PROVIDER.md` §6.4, added
  2026-09-07 as an obligation rather than a hope):
  1. **Does a full regular session actually yield 390 IEX minute bars for a liquid name?**
     Probably not — IEX is one venue, not the consolidated tape. If it does not, then
     `market-session.ts`'s `minuteBars` is the count of **minutes in a session** and not the
     count of **bars to expect**, and Story 2.8's gap handling is sized against the
     difference. Getting this wrong makes every absent bar look like a fault
  2. **How often does a minute have no bar for a thinly traded name?** This is the number
     that decides whether an absent bar is ordinary or worth reporting, and Story 2.8's
     acceptance criterion 4 rests on it
  3. **Which end of the interval does Alpaca's `t` mark** — the start of the minute or its
     end? Story 2.6 names its own field `startsAt` precisely so a mapping that gets this
     backwards reads as an obvious contradiction rather than a plausible assignment. A
     one-minute systematic error is invisible on a chart and wrong in every §11 calculation
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
- **Also inherited from Story 2.3, added 2026-09-06: this story asks a rate-limited feed for
  symbols, so it filters `status = 'active'`.** Task 2.3.6 made `status` this schema's one
  invisible predicate, and `UNIVERSE.md` §12.2 names its seven readers and which of them
  filter. This is the clearest **yes** in that table: paying a metered API for a security
  nobody tracks is waste with no upside. Note the two halves of the rule, because getting
  the second wrong is the expensive one — **filter when computing over the market we track
  now, never when showing or replaying something we stored**
- **And it owns the ticker change, which Story 2.3 produced and deliberately did not
  solve** (`UNIVERSE.md` §12.6, added 2026-09-06 to this file). Renaming a symbol in the
  curated file gives **two rows, two ids and nothing joining them**: the old row correctly
  `untracked` with all its history, the new one empty — produced against a real database
  rather than reasoned about. `FB` → `META` is the case the surrogate key exists for and
  `0002_securities.sql` names it. It was left as an honest gap because there is no rename in
  the current list and a mechanism built against no instance is one nobody can test, and it
  was handed **here** because this is the first thing in the product with any opinion about
  a symbol's lifecycle — Alpaca's assets endpoint carries a stable per-asset identifier
  beside the status open decision 4 is about, so the migration that adds `delisted` is the
  natural place to decide whether a rename gets an identity too. **Until something does,
  a rename loses the link between the old bars and the new symbol** — which stops being
  cheap the moment Story 2.8 has put bars behind those ids

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

   **SETTLED in Task 2.7.8 (2026-09-07): `delisted` does NOT ship, and the SECOND shape
   does — `pnpm universe:check`, which reports and changes no row.** `UNIVERSE.md` §15 is
   the record. Taken on evidence rather than on cost, which turned out to be zero and
   therefore decided nothing:
   - **The vendor's `inactive` is a fact about the VENDOR**, meaning "we will not trade
     this". Sampled against the tape, **4 of 50 inactive symbols were still printing daily
     bars** — so an automatic transition is 8% wrong, in the direction that reports a live
     security as gone. Importing it as `delisted` is the exact conflation `UNIVERSE.md` §3
     already refuses between a fact about the market and a fact about somebody else.
   - **An inactive row carries no delisting DATE**, so the member could never answer
     _when_ — and Epic 13's replay is the one reader that needs precisely that.
   - **Zero of the 101 are inactive**, so the mechanism would have had no instance.
   - **The second-writer problem was produced rather than argued**: a `status` written by
     anything else is silently reverted by the next deploy's `pnpm universe`.

   The new owner of a future `delisted` is **Story 2.8's ingestion** — bars stopping is a
   better-correlated signal that costs no request and arrives as a consequence of work that
   story is doing anyway. And the command earns its place on a different gap than this
   decision was about: it is the first instrument that can see `UNIVERSE.md` §5's silent
   staleness, and it **found a real defect on the day it was written** — `WMT` carried
   `NYSE` where Walmart moved to NASDAQ in December 2024, corrected in the same commit.

5. **Which feed we claim, now that the plan turns out to serve two.** Added 2026-09-07 by
   Task 2.7.1, which measured that this plan is **asymmetric**: historical bars default to
   **SIP**, the full consolidated tape, while the live stream is **IEX only**
   (`wss://…/v2/sip` is refused, `409 insufficient subscription`). See [`ALPACA.md`](ALPACA.md)
   §2. This was not anticipated by any of the five decisions above, and it is a
   **product-truth** question rather than a technical one, because `PRODUCT_SPEC.md` §7.1 and
   invariant 6 require the UI to label the feed and not imply coverage we do not have. Three
   parts:
   - Does `MarketFeed` gain `sip` beside `iex`? (`PROVIDER.md` §4.2 ships one member.)
   - What does `MarketDataProvider.feed` mean when the deployment reads SIP for history and
     will read IEX live? §4.2's own reversal trigger — _"a provider serving more than one
     feed"_ — is arguably met.
   - Does the client send `feed=iex` for consistency with the future live stream, or take the
     default? **This is not cosmetic**: on the same thin names over the same sessions, `iex`
     gives **82.8%** mean coverage against **99.7%** on the default, and gaps of 15 minutes
     against 2. Choosing `iex` throws away most of the data quality this plan gives us.

   **SETTLED in Task 2.7.3 (2026-09-07): the historical client sends `feed=sip` explicitly
   and declares `sip`.** All three parts, answered:
   - **`MarketFeed` needed no change** — Task 2.6.3 already shipped `sip` beside `iex` and
     `synthetic`, and `MARKET_FEED_DESCRIPTIONS.sip` already reads _"All US exchanges, via
     the consolidated tape."_ The vocabulary was ready before the question was asked.
   - **`MarketDataProvider.feed` is the HISTORICAL provider's standing feed**, and Epic 3's
     live stream is a **sibling** interface (`PROVIDER.md` §12) that will declare `iex`.
     §4.2's reversal trigger — _"a provider serving more than one feed, chosen per
     request"_ — is **not** met: this one serves exactly one. A series later stitched from
     stored SIP bars and live IEX bars is the case §2.4 designed for, where a **feed**
     disagreement across sources is truthful and only an **adjustment** disagreement is
     refused.
   - **`feed=sip` is sent explicitly rather than taking the default**, on two arguments.
     `sort=asc`'s — a default nobody stated is a default that can move, and this one is a
     vendor's. And the deciding one: **it makes the provenance record true by
     construction**, because whether the default silently falls back to IEX for a window SIP
     will not serve is _unmeasured_, where an explicit `feed=sip` cannot fall back and is a
     measured `403` that Task 2.7.6 maps.

   **RENDERED in Task 2.7.4 (2026-09-07), and decision 6 is now closed at both ends.** The
   deployed chrome reads `MARKET FEED` / **`ALL US EXCHANGES`** / _"The full consolidated tape,
   not a single venue."_ on all five routes, `GET /market-data` answers `{"feed":"sip"}`, and it
   cost **one platform variable and no frontend rendering code** — which is what proves Task
   2.6.7 built a reporting mechanism rather than a caption. The layout risk that task carried
   did not materialise: 141.7 px of label inside a 250.7 px measure, one line, 43% headroom, at
   every viewport tested locally and deployed.

6. **Whether a ticker rename gets an identity, and if not, who says so next.** Added
   2026-09-06 from `UNIVERSE.md` §12.6. The candidates are a `previous_symbol` column, a
   rename map, or a `company_id` above `securities`; the fourth answer — accept that a
   rename orphans the old bars and write that down — is legitimate and is what ships today.
   The decision is cheapest **before** Story 2.8 backfills, and it is the same migration as
   `delisted` if the assets endpoint is adopted at all, which is why the two sit together

   **SETTLED in Task 2.7.8 (2026-09-07): the FOURTH answer — a rename orphans the old bars,
   and `UNIVERSE.md` §15.5 is where that is written down.** It ships as a decision rather
   than as a mechanism, and **the premise this decision rested on was falsified**: the
   assets endpoint's "stable per-asset identifier" does **not** survive a ticker rename.
   Six real renames were checked and the id differs in **every one** — `SQ` and `ANTM` 404
   outright, `RTN` and `TWTR` are inactive under different ids, and **`FB` is now an active
   ProShares ETF**. The vendor issues a new row on a rename, so the id identifies an asset
   _within a response_ rather than a company _across time_, and recording it would buy
   nothing.

   That is a stronger result than the decision expected, because the argument evaporates
   **even though the endpoint was adopted**. Of the three mechanisms, the **rename map in
   the curated file** is re-ranked first and is the recommendation if the trigger fires,
   being the only one that does not depend on a vendor identifier that turns out not to
   exist. **The trigger is a rename in the list** — there is none — and the deadline is
   unchanged at Story 2.8.

   One hazard the measurement found that nobody had named: **tickers are recycled** — 229
   in the current catalogue carry both an active and an inactive row — so a recycled ticker
   added to the file would make the loader flip a _different_ company's row back to
   `active` on its old id. Zero of our 101 are affected, and `pnpm universe:check` reports
   it. `UNIVERSE.md` §15.6.

## Open decisions 1 and 2 — SETTLED by Task 2.7.1 (2026-09-07)

Settled against measured numbers rather than intuition; the full record is
[`ALPACA.md`](ALPACA.md). **Both size Story 2.8 and are recorded there as well.**

### Decision 1 — which timeframes: **BOTH, and the arithmetic is not close**

**`1Min` and `1Day`, both fetched and both held.** `PROVIDER.md` §9.4 had already reduced the
vocabulary to two with aggregation deliberately inexpressible, so this was only ever "both or
one, and at what depth".

At 101 securities, 252 sessions/yr, ~120 bytes/row:

| Timeframe |   Rows/yr |     Disk/yr |
| --------- | --------: | ----------: |
| Minute    | 9,926,280 | **1.19 GB** |
| Daily     |    25,452 |  **3.1 MB** |

**Daily is 0.26% of minute — 390× cheaper.** Ten years of daily for the whole universe is
**30 MB** and rounds to nothing against Story 2.1's ~22.5 GiB usable.

**The losing option is "minute only", and it loses on Story 2.12 rather than on cost.** A
multi-month chart built from minute bars reads ~98,000 rows to draw a few hundred pixels, and
`PROVIDER.md` §9.4 forbids aggregating them into daily because replay must reconstruct from
what was stored. Daily bars at 0.26% of the cost remove that entirely.

"Daily only" loses outright: Epic 5's five-minute returns and Epic 13's replay both need
minute bars, and deferring them means re-running a backfill over the same history later.

### Decision 2 — how far back: **daily to the earliest available; minute for 1 year**

**Measured, not documented** (`ALPACA.md` §3): the documented "since 2016" is a property of
the **tape**, not the plan. SIP history — the default feed for historical bars — reaches at
least **2016**, confirmed with real closes. IEX reaches only ~2022.

- **Daily: fetch everything available, ~2016 onward.** ~10 years is **30 MB**. There is no
  argument for taking less; it is free and it is what Story 2.12's multi-year chart draws.
- **Minute: 1 year initially.** **1.19 GB, 5.3% of usable disk.**

**Why 1 year and not 2, which is the interesting part.** The floor is Epic 5's ~60 trading
days for return percentiles, so a year clears it six times over. The ceiling is that **depth
and universe size MULTIPLY, and the universe size has just been unparked** (`UNIVERSE.md`
§10's trigger fired in this same task):

|                 Universe | 1 yr minute | 2 yr minute | 5 yr minute |
| -----------------------: | ----------: | ----------: | ----------: |
|                      101 |      1.2 GB |      2.4 GB |      6.0 GB |
| **500** (§10's proposal) |  **5.9 GB** |     11.8 GB |   29.5 GB ✗ |
| **1,500** (§10's target) | **17.7 GB** |   35.4 GB ✗ |   88.5 GB ✗ |

Against ~24 GB usable, **1 year of minute bars survives a re-size to 1,500 securities and 2
years does not.** Choosing 2 years now would quietly foreclose the sizing decision §10 has
just reopened — and re-sizing after Story 2.8 costs a re-backfill, which §10 names as the real
deadline.

**So the depth is set by the sizing option it must not destroy, not by the storage it uses
today.** Revisit once §5's metadata source and the universe count are settled; extending depth
is an additive backfill, whereas shrinking one is not.

**One thing that makes both decisions cheaper than expected**: the rate limit is **per request,
not per symbol** (`ALPACA.md` §6) — 203 requests of 50 symbols each in one window, the same
ceiling as 201 single-symbol requests. The whole universe is one request per bar-window, so a
backfill is bounded by pagination and history depth rather than by the rate limit.

---

## Acceptance criteria

1. Real bars for a real symbol are retrieved from Alpaca, and the response is mapped to
   the domain types with provenance recording ~~the IEX feed~~ **the feed the request
   actually asked for**

   > **Amended 2026-09-07, after Tasks 2.7.1, 2.7.3 and 2.7.4.** This criterion was written
   > before anyone held a key. Measured, this plan serves **SIP** for historical bars, the
   > client sends `feed=sip` explicitly, and the deployed chrome renders `ALL US EXCHANGES`
   > — so a criterion checked against the word _IEX_ would go red against **correct** code.
   > The wording is deliberately _what the request asked for_ rather than `sip`, because that
   > is the property worth checking: provenance must name the feed we requested rather than
   > a default we assumed. Task 2.7.9's bullet 1 already carries this and it belongs here too,
   > because the criterion is the thing that gets re-run.

2. The measured plan limits are written down as measurements with the date they were taken
   — **including the WebSocket subscription cap and specifically whether minute bars are
   exempt from it**, which is the one measurement another story is blocked on
3. Each mapped error cause is produced against the live API at least once, including a bad
   key and ~~an unknown symbol~~ **an unknown symbol, which turns out not to be an error**

   > **Amended 2026-09-07 by Task 2.7.6, and for the same reason criterion 1 was amended: as
   > written it goes red against CORRECT code.** An unknown symbol _was_ produced against the
   > live API — it answers `200` with `{"bars":{},"next_page_token":null}`, **byte-identical to
   > a real symbol with no prints in the requested window**. `PROVIDER.md` §8.2 makes the second
   > a success, so the two are indistinguishable and there is no error to map. Inventing
   > `unknown-symbol` from an empty answer would mean the product occasionally telling a user
   > that a real security does not exist, which is worse than saying nothing.
   >
   > So the criterion is met by **producing the response and recording that it is not an
   > error**, not by producing a member. The same holds for `range-not-available`: a range
   > before this plan's history depth is also `200` and empty. **Two of the seven failure
   > members are therefore not producible from the bars endpoint**, both named as such in
   > `ALPACA.md` §9b rather than left looking implemented — and the assets endpoint (Task
   > 2.7.8's) is the only thing in this vendor's API that could produce the first.

4. Rate limiting is exercised — the client behaves correctly at the limit rather than
   being assumed to stay below it
5. The key is on the platform, is absent from the repository, the bundle and every log
   record, and a deliberate log of the request path is inspected to confirm the last one
6. The application still builds, tests and runs with **no** Alpaca key present
7. `pnpm verify` passes with no network access

## Tasks

Tackled in order. The story is complete when all nine are done, and one prerequisite is not a
task at all.

**2.7.1 measures and ships nothing**, which is the shape Tasks 2.1.1, 2.2.1, 2.3.1, 2.5.1 and
2.6.1 set — but for a different reason from any of them. Those five settled decisions; this one
settles **facts**, because two of this vendor's own pages disagree by two orders of magnitude
about a number the size of the tracked universe is parked on, and because five of the seven
acceptance criteria are about measurements rather than about code. It takes the cap measurement
first, before anything else in the story.

**2.7.2 gives the key a home** and is kept apart from the client for Task 2.1.3's reason: the
configuration boundary has its own failure modes and its own cross-variable checks, and a
credential read in three places is how one leaks. It is also where ADR 0011's _"nothing deployed
holds a credential"_ formally expires.

**2.7.3, 2.7.5, 2.7.6 and 2.7.7 are the client, split four ways because its four halves fail
differently and three of them fail silently.** A retry inside the transport lies about the
deadline; a swallowed page lies about the data; a laundered parse failure lies about whose fault
it is. Only the happy path fails loudly, which is why it ships first — and why 2.7.3 **throws**
on anything it does not yet handle rather than returning a plausible answer.

**2.7.4 is the visible one and it is fourth rather than last**, which is a delivery decision
stated as one: it is available the moment a provider can declare a feed, it costs one platform
setting and no frontend code, and every task after it is invisible. A story whose only visible
moment is at the end demonstrates nothing if it stops early.

**2.7.8 answers the two lifecycle questions Story 2.3 handed here with named owners** — and its
one obligation is not to defer them a third time. **2.7.9 closes the story and records ADR
0019**, which carries something no previous close has had: figures that are observations from
one day against a live third party, rather than figures reproducible from a clean clone forever.

| #          | Task                                                                                                                                                                                                                                                                          | Status                    |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| **Prereq** | **An Alpaca account with market-data API keys.** Not a task — the same shape as Epic 1's `ACCOUNT-SETUP.md`, because nothing between two tasks owns creating an account. Everything except 2.7.1's measurements can be built against recorded fixtures with no account at all | **Satisfied 2026-09-07**  |
| 2.7.1      | [Hold a real key, measure what the free plan actually is, and answer the question another story is parked on](TASK-01-the-account-the-cap-and-the-real-plan.md)                                                                                                               | **Complete (2026-09-07)** |
| 2.7.2      | [Put the key through the configuration boundary and onto the platform, fetching nothing](TASK-02-the-credential-through-the-boundary.md)                                                                                                                                      | **Complete (2026-09-07)** |
| 2.7.3      | [The client: one request, one page, and the mapping onto the domain types](TASK-03-the-client-and-the-mapping.md)                                                                                                                                                             | **Complete (2026-09-07)** |
| 2.7.4      | [Point the deployed backend at Alpaca and let the chrome name the real feed](TASK-04-the-feed-tells-the-truth-about-a-real-vendor.md)                                                                                                                                         | **Complete (2026-09-07)** |
| 2.7.5      | [Pagination, coverage, and what a real session actually contains](TASK-05-pagination-coverage-and-the-shape-of-a-real-session.md)                                                                                                                                             | **Complete (2026-09-07)** |
| 2.7.6      | [Every failure this vendor can produce, mapped and produced rather than imagined](TASK-06-the-error-taxonomy-against-a-real-vendor.md)                                                                                                                                        | **Complete (2026-09-07)** |
| 2.7.7      | [The retry wrapper, bounded by the caller, with numbers from the measured limit](TASK-07-the-retry-wrapper-and-the-measured-limit.md)                                                                                                                                         | **Complete (2026-09-07)** |
| 2.7.8      | [`delisted`, and whether a ticker rename gets an identity](TASK-08-the-symbols-lifecycle-delisted-and-the-rename.md)                                                                                                                                                          | **Complete (2026-09-07)** |
| 2.7.9      | [Verify, sweep, and record ADR 0019](TASK-09-verify-document-and-adr.md)                                                                                                                                                                                                      | Not started               |

### Where the six open decisions are settled

None is left to a task that happens to trip over it, and none is settled anywhere but in a task
that has the evidence for it.

| Open decision                                    | Settled in    | Why there                                                                                 |
| ------------------------------------------------ | ------------- | ----------------------------------------------------------------------------------------- |
| 1. Which timeframes                              | 2.7.1         | It is an arithmetic decision against measured cost and depth                              |
| 2. How far back                                  | 2.7.1         | Same, and both sizes Story 2.8                                                            |
| 3. Missing or invalid key at startup             | 2.7.2         | It is a configuration behaviour, and it turns out to have **two** answers rather than one |
| 4. Whether `delisted` ships, and if not who does | 2.7.8         | It needs the assets endpoint, which needs a key                                           |
| 5. Whether a rename gets an identity             | 2.7.8         | Same endpoint, same migration, and the deadline is Story 2.8                              |
| 6. Which feed we claim                           | 2.7.3 / 2.7.4 | 2.7.3 writes the first provenance record; 2.7.4 puts the word on screen                   |

### Eight of the nine change nothing a user can see, and the story says so plainly

The same shape Stories 2.5 and 2.6 recorded. What makes it acceptable here is that 2.7.4 is
fourth of nine rather than deferred polish, and that what it puts on screen is the **first true
statement this product has ever made about market data** — the region it fixes read a hard-coded
`DISCONNECTED` for six stories and `NOT CONFIGURED` for one.

**What a user still cannot do at the end of this story is see a price.** There is no chart, no
series and no number on any screen; this story fetches into a terminal, Story 2.8 stores, Story
2.9 serves and Story 2.12 draws. Any demonstration should say that, because a
~~`Market feed: IEX`~~ **`MARKET FEED / ALL US EXCHANGES`** label beside no data invites exactly
the opposite reading — and **more strongly than this sentence was written expecting**, because
the deployed claim turned out to be _every US exchange_ rather than one venue.

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
