# ADR 0018 — The market-data seam, provenance on screen, and what a fixture-backed test certifies

**Status:** Accepted
**Date:** 2026-09-07
**Delivered by:** Epic 2, Story 2.6 (Tasks 2.6.1–2.6.8)

## Context

`PRODUCT_SPEC.md` §7.1 names a vendor and then, in the same breath, names the problem with
naming one: Alpaca's free tier serves **IEX**, not the US consolidated tape, so the product

> **must not imply that IEX represents every US exchange.**

Invariant 7 turns that into a structural requirement — _"market data sits behind a provider
interface; no vendor SDK types leak into the domain model"_ — and invariant 6 turns it into
a user-facing one: _"market-data provenance is displayed, never implied."_

Story 2.6 builds the seam those two invariants describe, **before any vendor code exists**.
Story 2.7 writes the first Alpaca client against it.

Three properties of the tree shaped every decision below.

**`packages/shared` is consumed as built output and is inlined into the frontend bundle.**
Task 2.3.8 measured the rule: a vocabulary declared as a plain `as const` literal is
tree-shaken **completely**, and one built by _calling_ a function is not — `SECTOR_ETFS`
cost 115 bytes to a page that never reads it, because eleven `toTicker()` calls are not
provably side-effect-free.

**The chrome had been lying for six stories.** From Story 1.5 to Story 2.6 the `Market feed`
region rendered a hard-coded `DISCONNECTED` — honest about there being no market data, and
still an **invented status on a market product**, listed in `README.md` among the things a
correct first run shows that read as faults. A component handed a hard-coded prop renders
perfectly, for ever, and from the outside is indistinguishable from a working one.

**Epic 13 is downstream of a decision taken here.** Replay asks "what was knowable at
11:07", and a split-adjusted price is a value **nobody could have seen at 11:07**, because
the adjustment encodes a corporate action that had not happened yet. That is
future-information leakage arriving through a **number** rather than through a timestamp,
which the temporal query plugin `DATA-LAYER.md` sketches structurally cannot catch — every
row's `observed_at` is correctly in the past.

The full working record is
[`PROVIDER.md`](../../planning/epic-02-security-universe-historical-data/story-06-market-data-provider-abstraction/PROVIDER.md),
which is to Story 2.6 what `CALENDAR.md` is to 2.5 and `HOSTING.md` to 1.11. This ADR is the
decisions; that document is the arguments, the rejected alternatives and the measurements.

---

## Decisions

### 1. The interface is written BEFORE any vendor code, and that is invariant 7 rather than a preference

`apps/backend/src/market-data-provider.ts` exists with **no implementation of a real
provider** and will not acquire one until Story 2.7.

The argument is one sentence and it is worth carrying:

> **An interface extracted from a working client is a description of that client; an
> interface written first is a constraint on it.**

Extraction is the cheaper order and it is how a vendor's shape becomes the domain model by
accident — a field appears because the vendor sends one, a nullable becomes optional because
the vendor sometimes omits it, and the "abstraction" is a rename of a wire format. The test
of whether this file succeeded is **not** whether Story 2.7 _can_ implement it; it is whether
Story 2.7 finds itself wanting to change it, and why.

The cost is stated rather than discovered: an interface designed against no vendor can be
wrong, and Story 2.7 is authorised to change it with a recorded reason.

### 2. The seam is a SPLIT rather than a place, and the line is what the frontend may know

| Thing                                                                                       | Home               |
| ------------------------------------------------------------------------------------------- | ------------------ |
| `Bar`, `BarSeries`, `Timeframe`, `TimeRange`                                                | `packages/shared`  |
| `MarketFeed`, `ProviderId`, `Adjustment`, `SeriesProvenance`, `BarSource`, `SeriesCoverage` | `packages/shared`  |
| The feed → label-and-sentence table                                                         | `packages/shared`  |
| `MarketDataProvider`, `BarsRequest`, `BarsResult`, the error taxonomy                       | `apps/backend/src` |
| Every implementation, including the fixture provider                                        | `apps/backend/src` |

Story 1.12's rule is the test and it is applied honestly rather than as a slogan: **shared
means both sides depend on the same fact, not "shared is where types go"** — and applied
here it cuts through the middle of the story.

The frontend genuinely needs `Bar` and the provenance record: Story 2.12 draws one and
Story 2.14 renders the other, and two copies of those is how they disagree. The frontend has
**no business knowing there is such a thing as a provider** — a `MarketDataProvider`
describes something that makes authenticated network calls, holds a credential and has a
rate limit, and putting that interface in the browser's type graph invites a future author to
implement one there, which is where the key ends up in the bundle.

> **The frontend may know the NAME of a provider, because it renders it, and may not know
> the SHAPE of one.**

That is why `ProviderId` is shared and `MarketDataProvider` is not. The cost of the split is
one extra file boundary; the cost of not splitting is only ever paid once and is
unrecoverable.

### 3. Provenance is PER-SERIES and names a LIST of sources

`SeriesProvenance` carries `adjustment`, `retrievedAt` and `sources: readonly BarSource[]`,
and it is a required, **branded** field on `BarSeries`.

Per-series rather than per-response, because a response envelope is a fact about one HTTP
exchange and a series outlives it: the moment anything passes a `BarSeries` alone into a
chart, a store or an anomaly calculation, an envelope-level record is gone and the claim is
silent. That is the same argument `securities-response.ts` used when it put provenance on the
envelope rather than in a caption — applied one level down, because a bar series is the thing
that travels.

A **list** rather than one record, because Story 2.8 stitches stored bars onto freshly
fetched ones and a single record becomes a lie at that moment.

Per-**bar** was rejected: it is always truthful and it is ten million copies of a constant,
in a table `PROVIDER.md` sizes at ~1.18 GB a year.

**The brand is not decoration and it is not what makes provenance required.** A required
field already makes a series without provenance impossible to construct. What the brand buys
is the half a required field cannot: a hand-written object literal skips every **coherence**
check, and the coherence checks are where the real failures live — `toBarSeries` verifies
that the bars ascend, that the sources' `barCount` values sum to `bars.length`, that
`covered` is null exactly when the series is empty, that every bar starts inside `covered`,
and that `covered` lies inside `requested`. Made to fail: an optional `provenance` is
**`TS2578: Unused '@ts-expect-error' directive`**, and a hand-written literal is
**`TS2741: Property '[brand]' is missing`**.

### 4. Feed disagreement is TRUTHFUL; adjustment disagreement is REFUSED

This is the one place the story treats two apparently symmetric cases differently, and each
has its own reason rather than sharing one.

A stitched series whose halves came from **different feeds** is a fact — two sources, two
`feed` values, and Story 2.14 can say so. That is the entire reason `sources` is a list.

A stitched series whose halves disagree about **adjustment** is refused at construction,
because it is not a series. Raw and split-adjusted prices for one symbol are on two different
**scales**; an array holding both has a cliff in it that is an artefact of our own stitching,
and every percentage change computed across the seam is wrong. So `adjustment` sits on
`SeriesProvenance` and not on `BarSource`: **the type makes the incoherent case
unrepresentable rather than merely reportable.**

The mechanism that makes this a mechanism rather than an instruction: `toSeriesProvenance`
takes **exactly one** source and `mergeSeriesProvenance` takes two or more and performs the
check, so a multi-source record is obtainable **only by merging**. Without that pair,
"unrepresentable" would be a property of the result and would say nothing about how the
result was chosen — a Story 2.8 stitcher would write a literal, pick one of the two
adjustment values, and nothing would notice.

### 5. Bars are stored RAW and never rewritten; adjusted series are ASKED FOR

`Adjustment` has two members, `raw` and `split-adjusted`. The store holds raw. Nothing ever
rewrites a stored price because of a corporate action. An adjusted series is obtained by
asking a provider for one.

**Store adjusted** is irreversible in the strict sense: every bar written before a split is
on a different scale from every bar written after it, nothing in the row says which, and the
factor required to undo it was discarded at write time.

**"Store raw, adjust on read"** is the textbook answer, is what Story 2.8's scope assumed,
and **requires a corporate-actions table that nothing in the plan acquires** — not the bars
endpoint, not the universe loader, not Story 2.7's scope as written. Adopting it silently
means whoever writes the first read path discovers mid-task that the factor is unavailable
and either invents a table or quietly serves raw while the code claims otherwise. `PROVIDER.md`
§13 corrects Story 2.8's file by argument rather than assertion.

The deciding argument is **Epic 13**, above: an adjusted price in replay is
future-information leakage through a number. It is invariant 4 with no structural enforcement
available, which is exactly why it is a decision taken once, here, rather than a default
somebody inherits in whichever task writes the first `INSERT`.

**The named gap, with a repair and a trigger:** Story 2.9's V1 read path serves raw bars, so
a security that splits inside the stored window charts with a step in it that is not a market
event. The first repair is to fetch `split-adjusted` for display — one request, no new table.
The trigger is the first split inside the stored window, which Story 2.8 can check for once
rather than be surprised by. **Until then the product is not lying**, and that is the point of
§3: `provenance.adjustment` reads `raw` and Story 2.14 renders it. A visible step beside a
label saying `raw` is an honest chart; a visible step beside no label is §35's _"hide data
provenance"_.

### 6. Adjustment is EXPLICIT at every call site, with no default

`BarsRequest.adjustment` is required. There is no `DEFAULT_ADJUSTMENT` anywhere, and
`market-provenance.test.ts` sweeps that module's export names for `/default/i` and expects
none, so one added later is a red test rather than a silent regression.

The argument is the failure mode rather than tidiness. **A series that spans no corporate
action returns identical numbers in both modes** — which is almost every series, almost all
the time. So a wrong adjustment argument is **invisible in testing and wrong exactly once**,
on the one name and the one week somebody is looking at. There is no safe default, only a
default whose wrongness is deferred.

The lock is a `@ts-expect-error` and it was made to fail **in both directions**, because
only one of them is the lock: removing the directive reports `TS2741: Property 'adjustment'
is missing`, which proves the field is required _today_; making the field optional reports
**`TS2578: Unused '@ts-expect-error' directive`**, which is what fails the build on the day
somebody adds a default.

The fixture corpus carries a **four-for-one split** so the difference is exercised rather
than asserted by a type signature no test distinguishes, and the direction was engineered
deliberately: **raw** carries the cliff (525.93 → 140.04 at daily resolution) and
`split-adjusted` removes it (131.48 → 140.04). Built the other way round, every test in the
story would have asserted the opposite of what the product means.

### 7. A provider call CANNOT throw, and the line between a result and a defect is a sentence

`fetchBars` returns `Promise<BarsResult>`, an eight-member discriminated union — `ok` plus
seven causes — and no modelled failure rejects.

> **A cause is a union member when it is a fact about the world. It is a thrown defect when
> it is a fact about our code.**

A rate limit is the world. A mapping function that received a shape it did not expect is us
— and laundering that into a tidy `upstream-unavailable` is how a permanent break wears the
costume of a transient one and becomes an invisible degradation nobody investigates.

Two consequences, both easy to get backwards. **The promise not rejecting is a property of
correct code, not of the type**: it does not mean the implementation is wrapped in a `try`
that swallows bugs, and one must not be added. And **Story 2.8's backfill must let a defect
propagate** rather than counting it as a failed symbol, or a vendor shape change presents as
a hundred symbols mysteriously having no data.

**"No data for this range" is NOT an error**, and this is the decision the list does not
contain: a symbol that exists, a range that is valid and a market that was shut is a
successful empty answer, `bars: []` with `covered: null`. Treating it as a failure is how
Story 2.12 shows a failure screen on a public holiday, and it is the single most likely thing
to be got wrong by whoever writes the first `if (bars.length === 0)`.

### 8. What a cause may carry: only what the caller does not already hold

The rule shipped narrower than the one first drafted, and the narrower one is easier to apply
because it has no exception:

> **A member carries only what the caller does not already hold.**

Under it **no member echoes the request back**. `unknown-symbol` does not name the symbol and
`range-not-available` does not repeat the range, because a request is for exactly one symbol
over exactly one window, so a copy can only agree or be wrong. The batch case does not need it
either: a batch returns a `BarsResult` **per symbol**, so the symbol sits beside the cause
structurally.

Exactly two things survive the rule. `timeout` carries `deadlineMs`, because a caller that
omitted one does not know which number it was measured against. `rate-limited` carries an
optional `retryAfterMs` — a **duration and not an instant**, because an absolute vendor time
reconciled against our clock means skew in the unlucky direction retries _early_, against the
service that just asked us to stop; and it is a floor rather than an instruction, so a
nonsensical value is harmless without validating one. It is optional under
`exactOptionalPropertyTypes`, so a provider **branches** the way `apiError()` does; absent
means the vendor did not say, never "immediately".

**What no member may ever carry** is the vendor's response body, the vendor's message, or an
opaque `cause: unknown`. Task 1.7.4 measured why: Fastify's default 500 passed a thrown
message straight through and answered a request with
`connection to postgres at 10.0.0.4:5432 refused`. **A message written for a developer is
internal detail too, and it is the half that looks harmless.** The detail goes to the log,
under the request's correlation id — `errors.ts`'s arrangement, reused by
`/diagnostics/database`, where the body says _whether_ and the log says _why_.

**`range-not-available` ships with no sub-reason** — no `too-old`/`too-wide`/`in-the-future`
— because a fixture produces it one way, and a member nothing can produce is a guess.

### 9. There is no retry and no cache INSIDE a provider — and retry lives in a wrapper

A provider makes **exactly one attempt**. That is what makes a fixture-backed test mean
something: a provider that memoises behaves differently on the second call than the first,
and one that retries makes the caller's deadline a lie by turning five seconds silently into
fifteen. It is the same argument `api-client.ts` records one layer up, in the browser.

**Where retry does live** is the half a later reader actually arrives with, and it is decided
here even though nothing was built:

- **Inside each implementation** — rejected, as above, and every future provider
  re-implements it slightly differently.
- **A wrapper implementing the same interface**, composed around a provider — **chosen.** It
  is testable against the fixture provider with no network at all, it is replaceable, and it
  keeps a provider a thing that makes one attempt.
- **At the call site** — rejected for retry, and **right for pacing**, which is the
  distinction that matters:

> **Per-request retry is the wrapper's. Cross-request pacing across a hundred symbols is
> Story 2.8's backfill.** Conflating them is how a backfill re-fetches ninety-nine symbols
> that answered perfectly because one was rate-limited.

Three constraints bound it and carry **no numbers**: only retryable causes are retried;
a retry must not outlive the caller's deadline or its abort signal; and a retry policy plus a
rate limit is a queue, a queue has a depth, and an unbounded one is a memory leak wearing a
politeness costume. Story 2.7 measures the numbers against the documented limit.

**It was decided and deliberately not built.** There is no real provider to wrap and no
measured latency distribution to pick a backoff from, so a wrapper written now would be
tested only against itself. What the taxonomy owes it and now provides is constraint 1's
input as code: `isRetryableOutcome()` sits beside the union it classifies, for the reason
`isApiError()` sits beside `ApiError`, and it is an **exhaustive `switch` rather than a list
of retryable outcomes** — a list leaves a ninth member silently non-retryable, which is the
_safe_ answer arrived at by silence.

### 10. The feed is a FIELD ON THE PROVIDER, and it removes a copy rather than adding one

`MarketDataProvider` carries `readonly feed: MarketFeed`. This is the decision most likely to
look arbitrary to a Story 2.7 reader, so the argument is recorded in full.

`MARKET_FEEDS` is `["iex", "sip", "synthetic"]`, and provider and feed vary **independently**:
one vendor serves IEX on a free tier and SIP on a paid one, so "which company sold us this"
and "which venues are in it" are two facts, and only the second is what §7.1 requires us to
display. That rule is an argument against **inferring** a feed from a provider id. It turned
out **not** to be an argument against a provider **declaring** one — because the thing that
holds the credential is exactly the thing that knows which plan it is on.

**The field removes a copy.** Before it, `fixture-provider.ts` wrote `feed: "synthetic"` as a
literal inside its own `BarSource`, so the chrome's claim and a series' claim could have been
made to disagree by editing one of them. Two rejected shapes:

- **A second environment variable** — a fourteenth, and a pair nothing checks, which lets an
  operator set two things that cannot both be true.
- **Rendering only the provider until a series exists** — which leaves §7.1 unmet in the state
  that matters, because a deployment reading a single venue would say so nowhere until
  somebody opened a chart.

**The line that keeps the independence rule true:** the provider's `feed` is the **standing
claim about what this deployment is configured to read**; `SeriesProvenance` remains the
authority for what a **particular** series came from, per source. The reversal trigger is a
provider serving more than one feed _chosen per request_, at which point the field stops
being a fact about the implementation and becomes a fact about a call.

The lock is a compile error: removing `feed` from the fixture provider is
`TS2741: Property 'feed' is missing`, so **a provider that does not declare which venues are
in its numbers cannot ship**. That lock is one-directional and it is stated as a gap rather
than hidden: there is no `@ts-expect-error` pinning it, so the day somebody gives `feed` a
default this check goes green. A default feed is a claim about the market rather than a
convenience, and the honest place to catch it is review.

### 11. Invariant 6 is met by a SENTENCE, not an acronym

§7.1 does not ask us to print `Market feed: IEX`. It says we must not imply that IEX
represents every US exchange — and three letters teach a non-specialist nothing at all. So
the vocabulary carries the words:

| Feed  | Label             | Sentence                                                                      |
| ----- | ----------------- | ----------------------------------------------------------------------------- |
| `iex` | IEX               | Trades reported by the IEX exchange only — not the full US consolidated tape. |
| `sip` | Consolidated tape | All US exchanges, via the consolidated tape.                                  |

> **Amended 2026-09-07 (Task 2.7.4) — the decision is unchanged and one string is not.** `sip`'s
> **label** is now `All US exchanges` and its **sentence** `"The full consolidated tape, not a
single venue."` The two had been written the wrong way round: the jargon was the big word and
> the plain meaning was the small print, which inverts this ADR's own rule that _the sentence is
> the requirement and the word is only the affordance_. Nothing about the mechanism, the record's
> `satisfies` guard or the argument above moves; `MARKET_FEED_DESCRIPTIONS` remains the single
> source of both strings.
> | `synthetic` | Simulated | Generated test data. Not a market feed. |

**The sentence is the requirement; the label is the affordance.** They live in
`MARKET_FEED_DESCRIPTIONS` in `packages/shared`, behind a `satisfies` guard that makes a feed
added without words a compile error, and `FeedProvenance` **imports** them rather than
writing them out — a literal in the component would be the copy that keeps passing after
somebody weakened the words. It is rendered rather than hidden in a `title` attribute, which
is unreachable by keyboard and by touch and has been rejected twice already.

`synthetic`'s sentence is the fixture provider's safety mechanism arriving on screen: a
fixture-backed screenshot advertises itself, without anybody remembering to add a banner.

**Nothing is red and nothing is green.** The one amber is on the `synthetic` **marker**,
never on the word — measured, `--palette-amber` on the page ground is **1.73:1** at 12px
against a 4.5 floor, which is _worse_ than the 2.09:1 that caught Task 1.12.4, and the axe
gate found it. Standing out, like receding, is a job for weight and hierarchy and never for
ink below the contrast floor.

### 12. `GET /market-data` is its own route, and `/securities` is STRUCTURALLY unable to serve it

One field, `{ "feed": MarketFeed | null }`.

`/health` stayed closed on Task 2.1.7's terms. `/securities` was rejected for a harder reason
than conflating two provenance records, which is also true: **the chrome renders on all five
routes and `useSecurities` fetches only on `/securities`**, so a field there would leave the
region empty on four routes out of five including the landing route.

`provider` is deliberately absent because nothing reads it — `API_ERROR_CODES`' rule governs a
response's fields as much as a union's members — and because `feed === null` is **exactly**
"no provider configured", every provider declaring a feed. The vendor's name arrives with its
first reader, Story 2.14, off `SeriesProvenance` where it already travels.

`isMarketDataResponse` is deliberately **stricter** than `isHealthResponse`, which tolerates a
`status` it has not been taught: an unrecognised feed slug is refused, because there is
nothing honest to do with one — rendering it raw is the caption problem this story exists to
prevent — and the version-skew window does not exist, since a new slug is a change to
`packages/shared`, which is inlined into the bundle, and `deploy.yml` ships both halves from
one commit.

It is a first cut of Story 2.9's market-data contract, pre-empted in that story's file.

### 13. The default provider is `none`, and `none` is ABSENCE rather than a null object

`MARKET_DATA_PROVIDER` is a `readEnum` in `CONFIG_VARIABLES`, in `.env.example`, covered by
`pnpm env:check`, with its vocabulary **derived from `PROVIDER_IDS`** rather than restated —
so Story 2.7 adding a member makes it selectable with no `config.ts` edit and fails the build
in `createMarketDataProvider` until it is wired up.

**The default is `none` and emphatically not `fixture`**, because a deployment that forgets to
configure a provider must serve **nothing** rather than serve invented prices. Task 2.6.8
observed that in production: `MARKET_DATA_PROVIDER` is absent from the deployed Container App
entirely, and the deployed page reads `NOT CONFIGURED` / _"No market-data provider is
configured."_ rather than a plausible-looking market feed.

`createMarketDataProvider` returns `undefined` for `none`, and that is a decision. There is no
`BarsResult` member meaning "no provider is configured", because that is a fact about our
**deployment** rather than about the world and fails §7's test for membership; answering
`upstream-unavailable` is the laundering §7 forbids and a retry wrapper would retry it for
ever; and a null object that throws is "a method left throwing" wearing a different hat. The
defined behaviour for a caller with no provider is a **503 carrying `SERVICE_UNAVAILABLE`**,
owned by Story 2.9 — added when a route can produce it, per `API_ERROR_CODES`' own rule.

---

## Rejected, with reasons and reversal triggers

| Rejected                                      | Why                                                                                           | Reversal trigger                                       |
| --------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Extract the interface from Story 2.7's client | An extracted interface describes the client rather than constraining it                       | —                                                      |
| All types in `apps/backend`                   | Story 2.12's chart needs its own `Bar`; a wire contract described twice disagrees with itself | —                                                      |
| All types in `packages/shared`                | Puts a credential-holding interface in the browser's type graph                               | —                                                      |
| Provenance per response envelope              | A `BarSeries` outlives the exchange that produced it; the claim goes silent                   | —                                                      |
| Provenance per bar                            | Always truthful, and ten million copies of a constant                                         | —                                                      |
| Store adjusted prices                         | Irreversible: the factor is discarded at write time                                           | —                                                      |
| Adjust on read                                | Needs a corporate-actions table nothing in the plan acquires                                  | Corporate-action data arriving for another reason      |
| A default `Adjustment`                        | No safe value; only one whose wrongness is deferred                                           | —                                                      |
| Retry inside a provider                       | Makes the caller's deadline a lie                                                             | —                                                      |
| Retry at the call site                        | Conflates per-request retry with cross-request pacing                                         | —                                                      |
| A cache inside a provider                     | Second call behaves unlike the first; a fixture test stops meaning anything                   | —                                                      |
| `bad-range` as a cause                        | `TimeRange`'s constructor makes the call-site-defect reading unreachable                      | —                                                      |
| Sub-reasons on `range-not-available`          | A fixture produces it one way; unproducible members are guesses                               | A caller that repairs a range rather than reporting it |
| A second env var for the feed                 | A pair nothing checks; an operator can set two things that cannot both be true                | —                                                      |
| `Market feed: IEX` as the whole answer        | Satisfies §7.1's letter and fails its intent                                                  | —                                                      |
| Widening `FeedStatus` to carry provenance     | A connection state and a venue list fail independently                                        | —                                                      |
| A `simulateError` hook on the interface       | Test convenience on a shipped type — Task 1.10.5's refusal to widen the port range            | —                                                      |
| Any new dependency                            | Node 24 ships `fetch`; two schema libraries were already measured and thrown away             | —                                                      |

---

## Consequences worth stating separately

### The bundle prediction was made in two halves, and both were checked rather than argued

`PROVIDER.md` §11 predicted that **Tasks 2.6.2 to 2.6.6 move the frontend artefact by zero
bytes** — declared as a **check** rather than a forecast, on the grounds that any movement
would mean something had been declared through a constructor call and should be found and
fixed. Confirmed after each of the five: `369,437 B` / `4f17aff3…`, `17,317 B` /
`eb223e53…`, `1,101 B` / `898733b0…`, 300 B, **388,155 B over four files**, reproducing to
the byte.

Half 2 was Task 2.6.7's movement, and it is **the feature**: JavaScript
369,437 → **371,463 B**, CSS 17,317 → **18,063 B**, for **390,927 B over four files at 300
modules**. Both halves are explained rather than noted — the +2,026 B is the component, the
hook, `getMarketData`, the predicate, and **`MARKET_FEED_DESCRIPTIONS` reaching the browser
for the first time**, which Task 2.6.3 measured at zero because nothing read it; the +746 B
is `FeedProvenance.module.css` entering the artefact.

**The one-line rule that made half 1 come true, and it applies to everything this story added
to `packages/shared`:** no module-scope value is built by calling a function. Declare
literals; if something must be constructed, construct it lazily on first use, which is what
`market-time.ts`'s memoised formatters already do and for exactly this reason.

### The chrome's fault list is one item shorter

`README.md` lists the things a correct first run shows that read as faults. The
`MARKET FEED` region's `DISCONNECTED` is **struck through** — only the second item ever to
leave that list. What replaced it says something true in every state, including the state a
developer with no configuration is in.

### One obligation left the unenforced list, and one joined it

**Left:** "every provider declares its feed" is a compile error rather than a convention —
though only in one direction, see §10.

**Joined:** the aggregate rule. `Bar`'s prices are `number` and not `string`, on the measured
grounds that a single price at scale 6 is exact in a double four orders of magnitude past any
equity price, that nothing in V1 accumulates prices, and that a `string` pushes a parse into
every consumer and buys nothing because a chart axis cannot draw one. What that costs is a
rule nothing checks:

> **An aggregate over prices is computed in SQL over `numeric`, never in JavaScript over the
> domain type.**

That is not a workaround — `numeric(18,6)` was chosen precisely so the exact computation is
available where it is needed. The reversal trigger is a price aggregate that genuinely has to
run in the browser, at which point the honest answer is a `string` on the wire and a decimal
library, and it is a bigger decision than this one.

### The vendor grep needed correcting, and the correction is about the check rather than the code

Criterion 1 is "no vendor reference", and a naive text grep over `packages/shared/src`
returns **eight** hits — every one of them a comment explaining _why_ a vendor-shaped decision
was taken, which is the opposite of a leak and would be destroyed by deleting them. The figure
to quote is the **code-only** one, with comments stripped.

Task 2.6.8 found that figure was no longer zero: `market-data-response.test.ts` used
`"alpaca"` as the _value_ of an unknown extra field in a test about a predicate tolerating
unknown _keys_. Not a leak — a test fixture, in no type, no identifier and nothing shipped.
It was changed anyway, and the reasoning is the general one: **the value carried no
information, and a check that reads "zero except one known-benign hit" is a check that
decays**, because the next reader has to remember to discount it. Changing a comment to make
a grep clean would destroy a record; changing an arbitrary literal does not.

---

## What a green fixture-backed test certifies

- **The types agree with themselves.** A `BarSeries` cannot be constructed without provenance,
  cannot be hand-written past its coherence checks, and cannot hold two adjustment scales.
- **Every one of the eight outcomes is producible, distinguishable, handled and classified.**
  All eight are produced against the fixture provider from a named cause; a caller can branch
  on them through an exhaustive switch; and each one's retryability is asserted against
  `isRetryableOutcome()` rather than described. A ninth member fails the build in **four**
  places across three files.
- **`adjustment` is required at every call site today, and cannot silently acquire a default.**
- **A provider cannot ship without declaring its feed.**
- **The fast suite reaches no network.** All 619 tests pass with `fetch`, `net.connect`,
  `net.createConnection`, `tls.connect`, `http.request`, `https.request` and `dns.lookup`
  replaced by functions that throw — and the blocker was proved to block with a control.
- **The whole of `pnpm verify` reaches no host but this machine**, taken at the machine rather
  than in-process.
- **The chrome renders a real claim about the market feed**, read from the backend, in a
  browser, locally and against the deployed pair.

## What a green fixture-backed test CANNOT certify

- **Anything about a vendor.** Every test in this story passes against a corpus **we wrote**,
  so a green suite certifies internal consistency and not correctness against a market-data
  provider. This is the honest form of criterion 2 and it is the most important sentence in
  this record. Story 2.7 is where it becomes a real claim, and it will only do so if that
  story records **raw HTTP bodies** and tests its **mapping** against them. There are two
  corpora and they are different things: this story's produces domain types and has nothing
  vendor-shaped to be wrong about; Story 2.7's is the only place a vendor's shape can be got
  wrong.
- **That the mapping from a vendor's payload preserves meaning.** `startsAt` is named the way
  it is precisely because both bar-timestamp conventions exist in the wild and a one-minute
  systematic error is invisible on a chart and wrong in every anomaly calculation. No test
  here can catch that; the field **name** is the mechanism, because a mapping that gets it
  backwards has to read as an obvious contradiction rather than as a plausible assignment.
- **That the configured provider is reachable, entitled, or returning anything.** The chrome's
  feed claim is true about **our configuration** and says nothing about the world. A
  deployment reading `IEX` with a revoked key still says `IEX`, correctly, because that is
  what it is configured to read. Story 2.12 renders a failed fetch beside the thing that
  failed to load; **this region never does, deliberately** — the eight-member taxonomy is
  about one _request_, and this claim is true before any request is made and stays true while
  one fails. An ADR that did not say so would invite the first person debugging an outage to
  trust it.
- **That the retry wrapper works.** It was decided and not built.
- **That any price on any screen is right.** Nothing in this story fetches a real bar.

---

## Measured

Every figure re-taken at Task 2.6.8 rather than cited.

| Thing                                                      | Figure                                                                                                                    |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `pnpm verify`, warm, no database                           | exit 0 in **32.94 s**                                                                                                     |
| `pnpm verify`, warm, with a database                       | exit 0 in **31.45 s**                                                                                                     |
| Per-step split (warm)                                      | build 2.60 / lint 6.13 / `format:check` 7.52 / `stories` 0.24 / `env:check` 0.25 / `test` 4.87 / `test:process` 9.49 s    |
| `pnpm verify`, **all off-machine network denied**          | exit 0 in **31.12 s**                                                                                                     |
| `pnpm verify`, cold from a **clean clone**, network denied | exit 0 in **36.73 s**                                                                                                     |
| `pnpm test`                                                | **619** — 206 `packages/shared` / 230 `apps/backend` / 183 `apps/frontend`, 49 files                                      |
| `pnpm test:process`                                        | 14                                                                                                                        |
| `pnpm test:database`                                       | 61 across 3 files                                                                                                         |
| `pnpm e2e`                                                 | **28** across **7** spec files, 1.0 m                                                                                     |
| `pnpm e2e:deployed` (in CI)                                | **15** across 3 spec files, 7.8 s; whole job 26 s                                                                         |
| Frontend artefact                                          | 371,463 B `c8f1c3ad…` / 18,063 B `ed3d1744…` / 1,101 B `7b0075a8…` / 300 B = **390,927 B over four files at 300 modules** |
| Deployed artefact divergence                               | **72 B** (`VITE_API_BASE_URL`), `index.html` 1,101 B at two different hashes                                              |
| Store entries / `node_modules` / lockfile                  | **419 / 285,008 KB / 4,766 lines** — unchanged since Story 2.2                                                            |
| Install-script sweep                                       | `esbuild@0.28.2` and nothing else                                                                                         |
| Storybook                                                  | 76 files / 9.4 MB                                                                                                         |
| axe, landing route, 3 feed states × 3 viewports            | **0 violations / 37 passes / 1 inconclusive (`color-contrast`)**, all nine cells                                          |
| axe, deployed landing route                                | 0 / 37 / 1 — the pre-merge gate's numbers                                                                                 |
| Vendor grep, `packages/shared/src`                         | 8 naive (all comments), **0 code-only**                                                                                   |
| Vendor grep, `apps/backend/src`                            | 7 naive across 4 files, **0 code-only**                                                                                   |

---

## Related

- [`PROVIDER.md`](../../planning/epic-02-security-universe-historical-data/story-06-market-data-provider-abstraction/PROVIDER.md) — the working record: arguments, rejected alternatives, the vendor's shape, and what Story 2.7 and Epic 3 each inherit
- [ADR 0012](0012-client-side-status-what-a-green-indicator-certifies.md) — why the chrome carries several indicators reporting facts that fail independently, and what a green one certifies
- [ADR 0016](0016-the-tracked-universe-what-a-green-load-certifies.md) — provenance on the securities envelope, the shape this story applies one level down
- [ADR 0017](0017-the-trading-calendar-market-time-and-what-a-correct-calendar-certifies.md) — the session definition the fixture corpus is generated from
- [ADR 0015](0015-the-migration-mechanism-the-schema-conventions-and-what-a-green-migration-certifies.md) — `numeric(18,6)` for money, which §"one obligation joined" is downstream of
