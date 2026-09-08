# ADR 0019 — The Alpaca client, a measured vendor, and what a recorded fixture certifies

**Status:** Accepted
**Date:** 2026-09-08
**Delivered by:** Epic 2, Story 2.7 (Tasks 2.7.1–2.7.9)

## Context

ADR 0018 built a market-data seam with nothing behind it. This story put something
behind it: `apps/backend/src/alpaca-provider.ts` fetches real bars for real securities
from a real vendor against a real credential, and `pnpm bars NVDA` prints the first real
market numbers this product has ever produced.

**This ADR is unlike the eighteen before it in one respect that governs how it should be
read.** Every previous decision here rests on facts reproducible from a clean clone
forever — a compiler's behaviour, a bundler's output, a database engine's rules. Roughly
half of what follows rests on **a third party's behaviour on one day**. A rate limit, a
history depth, which tape a plan serves and which pages of a vendor's own documentation
are wrong are all that vendor's decisions, and they can change without telling us.

So this document distinguishes throughout between what is **reproducible** and what is an
**observation**, and the working record —
[`ALPACA.md`](../../planning/epic-02-security-universe-historical-data/story-07-alpaca-historical-data-integration/ALPACA.md)
— carries the date its figures were taken beside every heading. **Re-measure rather than
cite.** That distinction is new to this repository and Epic 3 will need it more than this
story did.

Three things about the tree shaped the decisions below.

**`PRODUCT_SPEC.md` §7.1 names the feed the product must display**, and names IEX doing
it. Invariant 6 makes provenance a display requirement rather than a footnote.

**Story 2.6 had already decided everything about shape**, so this story could only be
wrong about facts. The result union, the domain types, the provenance record, the
no-retry-in-a-provider rule and the two-corpora split were all settled before a key
existed — which is why the interesting findings here are all measurements rather than
designs.

**A credential arrives.** ADR 0011 recorded that nothing deployed holds one; that claim
had been confirmed rather than falsified three times, and this is the story where it
expires.

---

## Decisions

### 1. Every limit is MEASURED, and the vendor's own pages disagree with each other

Nothing in `ALPACA.md` is cited. The reason is not diligence — it is that the
documentation is **wrong in ways that would have changed decisions already taken**.

| Question                     | Documented                                     | Measured 2026-09-07                                   |
| ---------------------------- | ---------------------------------------------- | ----------------------------------------------------- |
| WebSocket cap on minute bars | "30 symbols" / "no limit" (two pages disagree) | **No practical limit — 5,000 accepted**               |
| WebSocket cap on trades      | 30 channels                                    | **30. Refused at 60, `code=405`**                     |
| Historical feed              | IEX                                            | **SIP (consolidated tape), delayed 15 min**           |
| Live stream feed             | IEX                                            | **IEX. SIP refused, `409 insufficient subscription`** |
| Request rate                 | 200/min                                        | **~201–207, then `429`**                              |
| Multi-symbol cost            | unstated                                       | **1 per REQUEST, not per symbol**                     |
| History depth                | "since 2016"                                   | **2016 on SIP; ~2022 on IEX**                         |
| `end` parameter              | unstated                                       | **INCLUSIVE. Ours is half-open.**                     |
| Bar timestamp `t`            | unstated                                       | **START of the interval**                             |

**The one that mattered most was the one two of the vendor's own pages disagreed about by
two orders of magnitude.** Its pricing page says the free plan is "Limited to 30 symbols"
flatly; its streaming guide says the cap is "30 channels at a time for trades and quotes"
and that "there is no limit to the number of channels with minute bars". `UNIVERSE.md`
§10 had **parked the size of the entire tracked universe** on which was true, because
every one of `PRODUCT_SPEC.md` §11's four calculations is bar-based. If the flat reading
were right, the 101-security universe was already over the cap and Epic 3 had a blocker
rather than a tuning problem.

**Measured: bars are exempt.** One connection accepted subscriptions at 60, 101, 500,
1,500 and 5,000 symbols — the last being §27's _synthetic_ target, on a free plan, in
867 ms.

**And the measurement is a measurement because of its control.** A server that silently
dropped the thirty-first subscription would look identical to one that accepted it, so
the acknowledgement's accepted **list was counted** rather than checked for the absence of
an error — and on the same connection, seconds apart, a trades subscription at 60 was
**refused** with `code=405 symbol limit exceeded`. The instrument was proved able to see a
cap before the exemption was believed.

So the sizing is **unblocked rather than re-taken**: `UNIVERSE.md` §10 is explicit that
§5's metadata source must be settled before a number is picked, and that is Story 2.8's
re-curation. What is recorded is that the trigger fired and in which direction.

### 2. The plan is ASYMMETRIC, and `PRODUCT_SPEC.md` §7.1's own example is not true of stored bars

**The finding no open decision in this story anticipated.** Historical bars default to
**SIP** — the full consolidated tape — while the live stream is **IEX only**, with
`wss://…/v2/sip` refused outright. The spec's worked example, `Market feed: IEX`, is
therefore wrong for everything this epic stores and right for everything Epic 3 will
stream.

That is not a documentation quibble, because the difference is large and measurable. Six
thin equities, same sessions, same requests:

| Feed          | Coverage range |      Mean | Longest gap |
| ------------- | -------------- | --------: | ----------: |
| `iex`         | 43.1% – 99.7%  | **82.8%** |  **15 min** |
| default (SIP) | 98.5% – 100%   | **99.7%** |   **2 min** |

`CCI` reads **43.1%** on IEX and **98.5%** on SIP for the same session. Choosing `iex` for
consistency with the future live stream would have thrown away most of the data quality
the plan gives us, on every row stored for the life of the product.

**The client sends `feed=sip` explicitly rather than taking the measured-identical
default**, on two arguments. `sort=asc`'s — a default nobody stated is a default that can
move, and this one is a vendor's. And the deciding one: **it makes the provenance record
true by construction.** Whether the default silently falls back to IEX for a window SIP
will not serve is _unmeasured_, where an explicit `feed=sip` cannot fall back and is a
measured `403` the taxonomy maps.

**`MarketFeed` needed no change.** Task 2.6.3 had already shipped `sip` beside `iex` and
`synthetic` — the vocabulary was ready before the question was asked, which is what
writing the seam first buys.

**And `PROVIDER.md` §4.2's reversal trigger is NOT met.** That trigger is _"a provider
serving more than one feed, chosen per request"_; this one serves exactly one. Epic 3's
live stream is a **sibling interface** that will declare `iex`. The standing consequence
is the important half: **a series later stitched from stored SIP bars and live IEX bars
names two feeds at once**, which is precisely the case §2.4 designed for by making a
**feed** disagreement truthful and reportable while refusing only an **adjustment**
disagreement.

### 3. The chrome says `ALL US EXCHANGES`, and getting there taught a rule rather than a string

The deployed status strip reads `MARKET FEED` / **`ALL US EXCHANGES`**, on all five
routes, with **no sentence under it**. `GET /market-data` answers `{"feed":"sip"}`. It
cost **one platform environment variable and no frontend rendering code**, which is what
proves Task 2.6.7 built a reporting mechanism rather than a caption.

**The first string shipped was wrong, and its wrongness is worth more than its
correction.** `sip` went out as label `Consolidated tape` under the sentence _"All US
exchanges, via the consolidated tape."_ — the **jargon** as the big word and the **plain
meaning** as the small print. That inverts a rule this repository had already written down
in three places (`FeedProvenance.tsx`, `PROVIDER.md` §4.4, ADR 0018):

> **The sentence is the requirement; the label is only the affordance.**

Two more strings followed before it landed: the second restated the label and contrasted
it with a feed this deployment never renders, the third was a fact nobody reading a status
strip needs.

**The rule, which is what generalises:** a feed gets a sentence **when its label cannot
stand alone, and not otherwise.** `iex` needs one — three letters teach a non-specialist
nothing. `synthetic` needs one — _"SIMULATED"_ without _"Generated test data. Not a market
feed."_ is a screenshot that can be mistaken for real prices. `ALL US EXCHANGES` **is**
the coverage claim §7.1 asks to be legible, so a sentence under it can only restate it.
`MarketFeedDescription.sentence` is optional as a result, with
`Record<MarketFeed, …>` replacing `as const satisfies` so the no-words guard survives
while `.sentence` widens to `string | undefined` at every reader.

**Two things about how the defect was caught belong in the record.**

**Every automated check passed.** Nine axe readings across three feed states and three
viewports, a permutation grid rendering all six states side by side, and a layout
measurement at five viewports — all green, on a screen whose headline word was jargon. A
grid proves six states render; it cannot tell you the word is wrong. What caught it was a
person reading the running product, in one sentence.

**And a test had locked the inversion in place**, with its own comment stating the rule
its assertion contradicted. That is the sharper half: **a test can make a defect permanent
as easily as it can prevent one**, and a comment agreeing with you is not evidence. Both
halves of the rule are asserted now, so the inversion cannot return silently.

### 4. The key is a Container App secret, and the database credential's path deliberately did not transfer

ADR 0014 recorded a credential path with a strong property: **nothing was stored.** The
deployed backend authenticates to Postgres as its own managed identity, minting a token
per connection, so the platform held no secret at all and ADR 0011's claim survived.

**That path does not transfer, and the reason is worth stating precisely.** An Alpaca key
is a **bearer secret issued by a party with no Azure identity**. There is no principal for
the container to be; there is a string that has to exist somewhere. What transfers is the
_identity_ — not the mechanism.

So `ALPACA_API_SECRET_KEY` is a **Container App secret** referenced by `secretRef`, and
`ALPACA_API_KEY_ID` is a plain `value` beside it.

**Two variables and not one packed string**, and that split is the decision the rest rests
on. Alpaca sends the pair as two headers, and only being two names makes _"exactly one of
these is a secret"_ expressible at all. **The key id is an identifier** — it travels in
the clear in every request header and is printed on the vendor's own dashboard — so
redacting it would hide the one value that tells an operator which key a deployment is
using.

**Key Vault was costed and declined**, with the argument turning on what this secret _is_:
a read-only market-data key on a free paper plan, whose compromise costs nothing and whose
regeneration is free. The reversal trigger is **a credential whose compromise costs
something**; Epic 10's model key is the named one. `HOSTING.md` is the record.

**ADR 0011's "nothing deployed holds a credential" is therefore formally expired**, and
the argument it was load-bearing for has to be replaced rather than quietly dropped. That
claim was one of two grounds on which the deployed environment being **public** was
accepted. What replaces it is narrower and is stated in Epic 2's own file: **no public
route returns anything derived from the credential** — the four are `/health`,
`/diagnostics/database`, `/securities` and `/market-data`, and the last reports a
configured feed _slug_ and never a vendor response. **Story 2.9 is the first thing that
serves vendor-derived data and is where this must be re-argued rather than inherited.**

### 5. A missing key is a startup REFUSAL; a wrong key is a RESULT

Open decision 3 asked what a missing or invalid key does at startup, and offered two
answers. **It turned out to have two halves with different answers, and that is the
finding rather than a compromise.**

**A provider selected without its credential is a startup refusal.** Selecting a provider
is a deliberate act, and `PRODUCT_SPEC.md` §36's degrade-locally principle is about
failures **at run time**, not about a configuration that was never coherent. The message
names the variables:

```
MARKET_DATA_PROVIDER is alpaca but ALPACA_API_KEY_ID and ALPACA_API_SECRET_KEY are
not both set. Alpaca serves nothing without a credential, so this deployment asked
for a provider it cannot use.
```

**Half a credential is refused too**, regardless of provider, on the argument
`DATABASE_PASSWORD`-with-`entra` already established: two opposite readings cannot be
guessed between. Both run through `config.ts`'s accumulator, so a deployment that gets
both wrong is told both things in one run.

**A key that is present but WRONG is deliberately not a startup concern at all.** The only
way to find out is to make a request, and a startup probe against a metered third-party
API puts this process's liveness in a vendor's hands — on a platform whose startup probe
kills a replica at roughly ninety seconds, which is the crash loop ADR 0014 designed the
database probe to avoid. A wrong key surfaces as `unauthorised`, already a non-retryable
member of `BarsResult`, produced against the live API and carrying **nothing at all**:
`{"outcome":"unauthorised"}`.

**And the absence of both is a silent, correct fallback.** With no `MARKET_DATA_PROVIDER`
and no credential the server starts, `/health` is 200 and `/market-data` answers
`{"feed":null}`, which the chrome renders as `NOT CONFIGURED`. That is
`market-data.ts`'s `none` — absence rather than a null object — and it is the safe default
by design. The cost is stated in `CLAUDE.md`'s gap list: a deployment can quietly stop
naming its feed with nothing failing anywhere.

### 6. Retry lives in a WRAPPER, and the numbers say it helps one caller and not a crowd

`PROVIDER.md` §8.8 had already decided this and the story confirmed rather than re-derived
it: a retry **inside** a provider makes the caller's deadline a lie and makes _"how many
times did we ask the vendor"_ a question with a different answer per vendor. `withRetry`
composes around a `MarketDataProvider` and returns one.

**Three measurements shaped it that a design argument alone would not have produced.**

**The limiter is a token bucket refilling at ~3.23/s, not a punished sixty-second
window.** Every earlier reading here stopped at the `429` and so was consistent with both
models without distinguishing them. Driven continuously immediately after a drained burst,
33 requests were allowed and 9 refused over 10.2 s. A 200/min bucket predicts 3.33/s; a
fixed window predicts approximately zero. **So a backoff has to outlast a token (~310 ms)
rather than a minute**, which is why `RETRY_BASE_DELAY_MS` is 300 — the refill interval and
the measured round trip, two independent numbers, land on the same one. One `429` costs one
request, not a punished period.

**`timeout` is retryable in the taxonomy and unreachable through the wrapper**, which looks
like a contradiction and is not: `isRetryableOutcome` classifies a **cause**, and the
wrapper is bounded by a **budget** — a hung attempt consumes the whole remaining budget by
definition. Slicing the caller's deadline into per-attempt portions would make it reachable
and was rejected, because it invents a second timeout the caller cannot see.

**And the finding that belongs under _what a green run certifies_: retry helps one caller
and does not help a crowd.** 320 concurrent calls through the shipped client, counting
every HTTP request actually spent:

| Burst of 320                |    `ok` | HTTP requests |   Wall |
| --------------------------- | ------: | ------------: | -----: |
| bare provider (the control) |      91 |       **320** |  1.0 s |
| through the wrapper, 3 s    | **206** |       **606** |  3.0 s |
| through the wrapper, 20 s   | **263** |     **1,473** | 19.9 s |

It works — spare deadline becomes answers. Retries plainly count against the limit, which
the request counts settle rather than argue. And **the return diminishes while the cost
does not**: the first 286 extra requests bought 115 answers (2.5 each), the next 867 bought
57 (15 each), sustaining **73 req/s against a 3.23/s refill** and still leaving 57 refused.

That is the strongest evidence in this repository for §8.8's line that **pacing is Story
2.8's and not this wrapper's** — and it is evidence rather than an argument, which is the
difference worth recording. A hundred concurrent retriers do not recover from a rate limit;
they compete for the same refill and pay for the privilege. What fixes it is asking less
often, which no per-request wrapper can do.

**One precondition nothing checks**, recorded here because its failure is invisible: the
wrapper gives up when the delay plus one plausible attempt does not fit in what is left, so
**a caller with a tight deadline silently gets no retries at all**. That is correct, and it
is invisible because the answer is the real cause rather than an error saying "I did not
try". `pnpm bars` honours it by passing its own 20 s; nothing checks that a future caller
does. The two constants that _are_ checkable —
`RETRY_MAX_DELAY_MS + MIN_ATTEMPT_BUDGET_MS < DEFAULT_BARS_DEADLINE_MS` — are asserted by a
test.

### 7. Where the line between a result and a throw actually fell

`PROVIDER.md` §8.5 drew it in the abstract: **a fact about the world is a result; a fact
about our own code is a defect.** Produced against a live vendor, it falls here:

| Produced                             | Status | Maps to                | Why                                                             |
| ------------------------------------ | ------ | ---------------------- | --------------------------------------------------------------- |
| Wrong secret / no credential         | `401`  | `unauthorised`         | Byte-identical **HTML** from nginx, in both cases               |
| Recency cliff / future range         | `403`  | `unauthorised`         | Unreachable through the client — the clamp precedes the request |
| 320-concurrent burst                 | `429`  | `rate-limited`         | **No hint**: no `Retry-After` on any of them                    |
| Refused / DNS / unroutable           | —      | `upstream-unavailable` | `TypeError("fetch failed")`, every class                        |
| A host that hangs                    | —      | `timeout`              | Our deadline fires first                                        |
| Reversed / malformed / bad timeframe | `400`  | **throw**              | A request only this codebase could have built                   |
| A `200` we cannot parse              | `200`  | **throw**              | Our understanding of the vendor is wrong                        |
| Unknown symbol                       | `200`  | **`ok`, empty**        | Indistinguishable from a real symbol with no prints             |
| Before history depth                 | `200`  | **`ok`, empty**        | Not a refusal at all                                            |

**The anticipated `422` split does not exist** — malformed parameters are `400`.

**TWO of the seven failure members are not producible from the bars endpoint**, and both
are named as such rather than left looking implemented. `unknown-symbol`: a symbol that
does not exist returns `200` with an empty `bars` object, **byte-identical** to a valid
symbol with no prints in range, and §8.2 makes the second a success. Inventing the member
from an empty answer would mean the product occasionally telling a user that a real
security does not exist, which is worse than saying nothing. `range-not-available`: the
too-deep case is a success and the future case is clamped away before a request is made.

> **Note for a reader coming from an earlier draft.** _"Both range failures are `200` with
> an empty body"_ is **half wrong** and was corrected during the story. A range before the
> plan's history depth is `200` and empty; a range entirely in the future is a **`403`**,
> carrying the recency cliff's body word for word, because that cliff keys on `end` alone.
> The conclusion survives intact.

**Three things a documentation-based mapping would have got wrong**, each produced:

1. **The bad-key body is HTML**, from nginx, before the application is reached. A client
   that assumes a JSON error body throws a parse error while handling an auth failure —
   turning a clear `unauthorised` into a laundered parse failure, which §8.5 forbids
   explicitly. The mapping therefore never reads the body.
2. **`fetch` rejects with one shape for three causes.** Connection refused, DNS failure and
   an unroutable address are all `TypeError("fetch failed")`, differing only in
   `cause.code`. The mapping keys on the **constructor** and deliberately never reads
   `cause` — undici's shape is not a contract, and all three mean the same thing to a
   caller.
3. **`next_page_token` is PRESENT and `null` on the last page.** A client testing `=== null`
   is correct; one testing for the key's absence loops forever.

### 8. The `403`-to-`range-not-available` question is recorded OPEN rather than settled

This is the one place in the story where a measured response and the taxonomy's own wording
point in different directions, and it is recorded as a live question rather than smoothed
over.

`PROVIDER.md` §8.1 defines `range-not-available` as _"the symbol exists and this provider
will not serve this window"_. That describes the recency `403` **word for word**, and the
caller's repair is to narrow the range rather than to fix a key. It maps to `unauthorised`
instead, for the three reasons recorded in `ALPACA.md` §9 and in a comment beside the
branch.

**The trigger for revisiting is a caller that has to behave differently** — one that would
narrow its window on `range-not-available` and stop entirely on `unauthorised`. Story 2.8's
backfill is the plausible first one, and it does not reach the branch today because
`alpacaServableEnd` clamps the window before the request is made.

### 9. Two corpora, doing two different jobs, and only one of them can be wrong about a vendor

`apps/backend/src/fixtures/alpaca/` holds **eleven raw HTTP response bodies**, 356 KB,
recorded from the live API. Story 2.6's fixture provider is the other corpus and is not
this one: it produces **domain types**, parses no vendor JSON, and therefore has nothing
vendor-shaped it could be wrong about. _"Re-record Story 2.6's fixtures"_ is the wrong
instruction.

Three properties of this corpus are decisions.

**Every fixture was recorded through the shipped mapping's own request builder**, so the
corpus is what the client actually sends rather than what somebody thought it sent.

**They are read with `readFileSync` from `src/` and never `import`ed.** `resolveJsonModule`
would compile 356 KB of test data into `dist/`, which `files` ships into the container
image.

**Two of them are controls rather than samples.** `JNJ` has no split in the recorded range
and returns **byte-identical** bodies under both adjustments, which is what makes
`adjustment` safe to send unconditionally. And the `end`-at-close body is recorded
_because the domain type refuses it_ — a stronger statement of the inclusive-`end` trap
than any assertion about a query string.

**They are excluded from Prettier and from `.gitattributes`' line-ending normalisation, on
purpose**, and that is the first entry in this repository's first gap category that is
excluded deliberately rather than because a tool declines to read it. Prettier infers an
`html` parser for the `401` page and `* text=auto eol=lf` would normalise it — **nginx
really does send CRLF**, confirmed with `xxd`. **Neither would have failed a test**, which
is the part worth recording: the tooling would have degraded the evidence without degrading
the green tick.

### 10. Two lifecycle questions, and BOTH answers are refusals taken on evidence

Story 2.3 handed this story two questions with named owners. Both were answered **no**, and
the arguments matter more than the outcomes.

**`delisted` does not ship as a `SECURITY_STATUSES` member.** The argument that decided it
is a new one:

> **A vendor's status field is a fact about the VENDOR.**

Alpaca's `inactive` means _"we will not trade this"_. Importing it as `delisted` labels a
third party's fact about **itself** as a fact about the market — which is exactly the
conflation `UNIVERSE.md` §3 was already built on refusing, arriving through a door §3 did
not have a third slot for. That generalises well past this vendor and is the reusable half.

Measured rather than asserted: **4 of 50 sampled `inactive` symbols were still printing
daily bars**, so an automatic transition is 8% wrong in the direction that reports a live
security as gone. And **an inactive row carries no delisting date**, so the member could
never answer _when_ — which is precisely what Epic 13's replay needs.

**Cost decided neither**, and the file says so four times over: the endpoint turned out to
be free, on a **separate rate-limit budget** (the trading API's, measured sitting at 199
while the data bucket was empty), and both decisions still went the other way. Worth
recording as a decision nearly taken on the wrong axis.

**A ticker rename orphans the old bars, and that is written down rather than mechanised.**
**The premise this decision rested on was falsified by measurement even though the endpoint
was adopted** — which is not the branch anybody anticipated. Open decision 6 assumed the
assets endpoint carries a stable per-asset identifier surviving a rename. Six real renames
were checked and the id differs in **every one**: `SQ` and `ANTM` 404 outright, `RTN` and
`TWTR` are inactive under different ids, and **`FB` is now an active ProShares ETF**. The
vendor issues a new row on a rename, so the id identifies an asset _within a response_
rather than a company _across time_. Of the three mechanisms, the **rename map in the
curated file** is re-ranked first, being the only one not depending on an identifier that
turns out not to exist. The trigger is a rename appearing in the list — there is none — and
the deadline is Story 2.8, because after it backfills a rename costs a re-backfill.

**And the transferable engineering lesson is the second writer**, produced rather than
argued: **a column written from a file on every deploy cannot have a second writer without
a precedence rule, and a precedence rule nothing checks is one somebody later simplifies.**
A hand-written `untracked` on `GILD` was silently reverted by the very next `pnpm universe`
— reported as an ordinary `1 updated`, and `pnpm universe` is a step in `deploy.yml` on
every deploy. So adopting `delisted` was never one decision but two, and all three ways out
of the second are worse than not needing them.

**What ships instead is `pnpm universe:check`** — Task 2.1.7's shape, where the instrument
says _whether_ and a person decides _what to do_. It earns its place on a **different gap
than the decision was about**: `UNIVERSE.md` §5 records the curated file's silent staleness
as an unenforceable invariant, nothing had ever been able to see any of it, and **it found
a real defect on the day it was written** — `WMT` carried `NYSE` where Walmart moved its
listing to NASDAQ in December 2024.

A finding does **not** change its exit code: the exit code answers _did the check run_,
never _did it find something_, which is `/diagnostics/database`'s rule and the guard against
somebody wiring a network-dependent check into CI where it would go red on a vendor's house
style. It is not and can never be a `pnpm verify` step, because `verify` runs with no
network and no credential.

---

## What a green run certifies, and what it does not

This repository's most-read section, and this story is the first where the honest answer
has an external party in it.

### What `pnpm verify` certifies

Both bundlers, lint, format, the stories check, `env:check`, `pnpm links`, **750 fast
tests** across 54 files and the 14-test process suite — with **no network access at all**.

That is a real property and it was taken at the machine rather than in-process: under a
sandbox denying every off-machine socket while allowing loopback, `pnpm verify` is exit 0,
and three controls prove the blocker blocks. Note the criterion's wording is ambiguous and
the honest reading is **"reaches no host but itself"** — a blanket `deny network*` profile
takes 13 of 14 process tests red, because that suite has bound loopback by design since
Task 1.10.5.

### What a green test run does NOT certify — and this is the sentence to carry

**Every mapping test in this story runs against recorded bodies.** So a green suite says
the mapping is consistent with **what the vendor sent on the day the fixtures were
recorded**, and says nothing whatever about what the vendor sends today.

That is the honest counterpart to ADR 0018's _"a green suite certifies internal consistency
and nothing about a vendor"_, and it is strictly weaker than it sounds:

- **A vendor changing a field name, a status code, or an error body shape is invisible
  here.** The suite is green and the deployed client is broken.
- **A vendor changing a limit is invisible twice over** — the fixtures do not encode limits
  at all, and `ALPACA.md`'s figures are prose that nothing reads.
- **A key that has been revoked is invisible**, because nothing in `verify` authenticates.

What stands against that is not a test. It is `pnpm bars`, run by a person, and the dates in
`ALPACA.md`.

### What the deployed read-back certifies

Taken 2026-09-08 against the running system: `GET /market-data` answers `{"feed":"sip"}`;
the chrome renders `MARKET FEED` / `ALL US EXCHANGES` beside `BACKEND SERVICE ● HEALTHY`
and `MARKET CLOCK ○ CLOSED / Labor Day`; the `secrets` array holds
`alpaca-api-secret-key`; `/health` and `/diagnostics/database` are unaffected; and Log
Analytics returns **zero** for the secret, the key id, `eyJ`, `APCA-`, `Authorization` and
`Bearer` across a non-vacuous **24,216-record** window.

**What it does not certify is that any bar has ever been fetched in production.** Nothing
deployed calls Alpaca. The credential is configured, the provider is selected, the feed is
declared — and the first deployed request is Story 2.8's. A green deployed check here means
_the deployment is correctly configured to fetch_, which is a materially weaker claim than
_fetching works_, and the two will look identical until Story 2.8 lands.

### What the credential sweep certifies

Five producers were swept and all five are clean: the repository, `apps/frontend/dist`,
`storybook-static`, the container image and Log Analytics. **And a sixth check was made with
a control**, which is what makes it worth anything: a deliberate log of the request path,
instrumented to print every outbound request whole, shows the secret **once** — in the
`apca-api-secret-key` header the client deliberately sends — while the application's own 22
lines of output contain **zero** occurrences of either the secret or the key id.

A sweep that finds nothing and cannot be shown capable of finding something is
indistinguishable from a broken sweep. This one was shown.

---

## What Story 2.8 inherits

Stated rather than left to be reconstructed.

- **Both timeframes**, `1Min` and `1Day`. Daily is **0.26%** of minute's storage — 390×
  cheaper — so "minute only" loses on Story 2.12's multi-month chart rather than on cost.
- **Daily to the earliest available (~2016); minute for 1 year.** The depth is set by the
  universe sizing it must not foreclose: against ~24 GB usable, one year of minute bars
  survives a re-size to 1,500 securities and two years does not.
- **The rate limit is a bucket refilling at 3.23/s, per REQUEST rather than per symbol.**
  The whole 101-security universe is one request per bar-window, so a backfill is bounded by
  pagination and history depth rather than by the limit. **Pacing is Story 2.8's**, with
  §6b's measurement attached rather than the assertion alone — a hundred concurrent retriers
  compete for one refill, and what fixes it is asking less often.
- **What a retry re-spends: a retried symbol costs its page count again.** The wrapper
  composes around the interface, so a retry re-runs the walk from page 1 — accepted
  deliberately, because a resumed walk needs a resume point that Task 2.7.5 refused to
  expose.
- **Bar density is feed-dependent**: 99.7% mean on SIP against 82.8% on IEX. That sizes gap
  handling, and the claim holds for stored data and would not on a live IEX stream.
- **THREE request-construction traps, every one of which produces plausible wrong rows
  rather than a failure.**
  1. Alpaca's `end` is **inclusive** where `TimeRange` is half-open — one duplicate bar per
     window seam. Closed in `toAlpacaQuery` by subtracting **one millisecond**, which is the
     exact conversion and needs no table and no DST arithmetic; a backfill that reconstructs
     a bound of its own reopens it.
  2. A **date-only range includes extended-hours bars** — 217 against a 210-minute half day.
  3. **A daily bar is stamped at midnight ET**, hours before the session opens, so a daily
     request framed on `[open, close)` contains **no daily bar at all** and returns a
     perfectly well-formed empty answer.
- **The window shape is a fourth trap and it is not covered by the three above.** A
  multi-day span collects extended-hours bars **with explicit instants too**, at **~2.35×** —
  22,952 bars for a month against 9,750 regular-hours ones, the regular-hours subset matching
  `minuteBars` exactly. **Request per SESSION**, measured at exactly 1.00×. So
  `UNIVERSE.md`'s ~1.18 GB/year is **conditional on per-session requests**; a span-shaped
  backfill stores ~2.8 GB/year.
- **The naïve backfill is the refused shape.** _"From the last bar I stored, to now"_ is a
  flat **`403`** with nothing in it — the recency cliff keys on `end` alone and refuses the
  whole request rather than clipping. `alpacaServableEnd` clamps to `now − 16 min` and
  reports the clamp as `coverage.covered`, so **a backfill that bookmarks `requested.end`
  rather than `covered.end` re-fetches or leaves a permanent 16-minute hole.**
- **A paginated caller must pass its own `deadlineMs`.** A 5-page walk is 72% of
  `DEFAULT_BARS_DEADLINE_MS`, which was derived for a single request against the browser's
  5-second budget.
- **Story 2.8 is the named owner of a future `delisted`**, on a new argument rather than a
  deferral: bars stopping is better correlated with reality than the vendor's flag (100%
  against 92% on a 50/50 sample), costs no request, and arrives as a consequence of
  ingestion it is doing anyway. If it adopts the member, `UNIVERSE.md` §15.3's produced
  overwrite is the thing it has to solve first.
- **The recycled-ticker hazard is Story 2.8's**, because it is the story that files bars
  against `security_id`. **229** tickers in the current catalogue carry both an active and an
  inactive row. The loader keys on `symbol`, so a recycled ticker added to the file would
  flip a **different** company's row back to `active` on its old id and land two companies'
  bars on one row. Zero of the 101 are affected today, and `pnpm universe:check` reports it —
  but only when a person runs it.
- **The universe sizing is unblocked rather than re-taken**, and re-sizing after this story
  backfills costs a **re-backfill** rather than a file edit. That is the real deadline.

## What Epic 3 inherits

- **`ALPACA.md` §1 before opening a socket**: minute-bar subscriptions have no practical
  cap, trades are capped at 30, and the free plan allows one concurrent connection.
- **The live stream is IEX and will declare `iex`**, as a **sibling** interface rather than
  a second method here. So a series stitched from stored SIP bars and live IEX bars names
  two feeds, which `PROVIDER.md` §2.4 makes truthful and reportable.
- **`iex` already has its words** in `MARKET_FEED_DESCRIPTIONS` and will be the first thing
  to render them, which is where §3's label-and-sentence rule gets its next real test. The
  two assertions locking that rule are **per-feed and name their feeds by hand**,
  deliberately, because _"the label is plain English"_ is not generically assertable — so a
  feed added later gets **no** check unless somebody writes one. A stated gap rather than an
  oversight.
- **The recency cliff does not apply to IEX**, so it is a SIP entitlement restriction rather
  than a general recency rule.

---

## Consequences

**Good.** The product has real market data behind a seam that was written before it. The
vendor's actual limits are recorded as measurements with dates rather than as citations,
and three of them contradicted the vendor's own pages in ways that would have cost a
later story a redesign. The universe sizing is unblocked. The chrome makes a true, legible
coverage claim on a public URL. And two lifecycle questions were answered **no** on
evidence, with new owners and new arguments, rather than by building mechanisms against no
instance.

**Bad, and stated rather than discovered later.** Half this document is a third party's
behaviour on one day, and nothing in `pnpm verify` can notice any of it changing. The
deployment holds its first bearer secret, so the argument for a public environment had to
be narrowed and now has to be re-argued at Story 2.9. Two members of `BarsResult` are not
producible from this endpoint and are carried as named gaps. And `PRODUCT_SPEC.md` §7.1's
own worked example is not true of what this epic stores, which Story 2.14 has to reckon
with as **two claims rather than one**.

**Ugly.** Nothing deployed fetches a bar. Every measurement in this document was taken from
a laptop against a metered plan, and the deployed system's Alpaca configuration is
correct-looking and completely unexercised until Story 2.8.

---

## Related

- ADR 0018 — the market-data seam this story implements. Its _"a green suite certifies
  internal consistency and nothing about a vendor"_ is what §9's fixture rule is the
  counterpart to.
- ADR 0017 — the trading calendar. `minuteBars` was confirmed against a real vendor here
  (exactly 390, exactly 210), and `CALENDAR.md` §2.4's reversal trigger was re-stated
  because its condition had silently already fired.
- ADR 0016 — the tracked universe. §10's parked sizing is unblocked by this story, and §3's
  fact-about-the-market / fact-about-us distinction gained a third slot.
- ADR 0014 — the managed-Postgres credential path, whose _stored nothing_ property this
  story could not reuse and says why.
- ADR 0011 — deploying both halves. Its _"nothing deployed holds a credential"_ expired
  here, exactly where §10 predicted it would.
- ADR 0006 — the configuration and secrets boundary, which this story's two variables are
  the first credential to pass through.
