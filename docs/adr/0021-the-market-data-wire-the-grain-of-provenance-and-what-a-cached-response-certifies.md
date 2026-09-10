# ADR 0021 — The market-data wire: the grain of provenance, and what a cached response certifies

**Status:** Accepted
**Date:** 2026-09-10
**Delivered by:** Epic 2, Story 2.9 (Tasks 2.9.1–2.9.11)

## Context

ADR 0020 put 48.03 million bars in a table. This story is the wire they leave on:
`GET /market-data/bars`, plus the two response headers that decide whether anybody has
to ask for them twice.

**The decision worth recording is not "we added an endpoint."** Five things here are
inherited by Stories 2.10 to 2.14 and by three later epics, and every one of them is a
choice that a later reader would otherwise re-take differently:

1. **how a time window is expressed on this wire**, which Epic 13's replay is the second
   caller of;
2. **the grain at which this product stores provenance**, which turned out to be a
   decision rather than a lookup, and which took a migration this story's scope did not
   anticipate;
3. **how this API distinguishes a dependency being down from this server having failed**,
   which Epic 9's SEC client is the next inheritor of;
4. **what this product treats as immutable, and what it does about the fact that it is
   not quite** — which is the whole of Epic 13's caching argument, since in replay every
   window is closed;
5. **an assumption about the transport that every test was structurally unable to see**,
   found by measuring rather than by reading, and repaired by a change with the same
   silent-failure shape as the thing it repaired.

The working record is [`MARKET-DATA-API.md`](../../planning/epic-02-security-universe-historical-data/story-09-market-data-api/MARKET-DATA-API.md),
which carries every alternative, every measurement and every reversal trigger. This
document carries the decisions.

**Read the dates in that document as a sequence rather than as noise.** §4 has two
amendments, §11 and §12.1 have one each, and §12.5's heading still says _nothing on this
path compresses_ because that is what was true when it was measured. Flattening them into
a single current statement destroys decision 5, which is a finding about the order in
which things were learned.

## Decisions

### 1. A window is expressed BOTH ways, and the absolute range is the primitive

A request carries either an absolute `[start, end)` of two UTC ISO 8601 instants, or a
named `sessions=N` — never both, and a request naming both is refused rather than
silently preferring one. The named form resolves **server-side** through the trading
calendar into an absolute range, and the response reports that resolved range back in
`coverage.requested`.

**What decides it is the browser's clock, and the argument is specific rather than
theoretical.** `market-calendar.ts` ships to the frontend bundle, so a client _could_
resolve five sessions itself. What it cannot do correctly is supply `today`: a browser in
Singapore at 09:00 local is still on the previous **market** date in New York. A client
computing "the last 5 sessions" from its own date is off by one session for roughly half
the world for several hours of every day — invisible in local testing, wrong for a subset
of users, and it produces a chart that is **plausible and shifted** rather than an error
anybody sees.

**Rejected:** _absolute only_ — it pushes that defect onto every client. _Named only_ —
it cannot express an arbitrary window, which Story 2.13's scrubber and Epic 13's replay
both need.

**Two consequences.** The named form is sugar rather than a second product: one query,
one cap check, one `SeriesCoverage`, and a named request and an absolute request are the
same answer. And a named window reaching outside the calendar's 2024–2028 range is a
**400 naming the range**, never a 500 and never a truncated list — the caller asked for a
window this system cannot express.

**Reversal trigger:** the first named window that cannot be expressed as a count of
sessions — "year to date", "since the open", "since the last earnings". At that point the
named form is becoming a query language, and the answer is to resolve those in the client
against a **server-supplied market date** rather than to grow a vocabulary here.

### 2. The server NEVER reduces a series, and the cap is 10,000 bars refused with a 400

A caller chooses a timeframe and gets exactly the stored bars in the window. A request
that would exceed 10,000 bars is refused with a message naming the number, not quietly
made smaller.

**Downsampling is the interesting negative.** A year of minute bars for one symbol is
97,530 rows and **11.08 MB** of JSON, so "send them all" is not an answer — and the
answer is still not to reduce. A server that returns fewer bars than the store holds is a
server that has performed an **undeclared calculation** on data a user is about to draw
conclusions from, which is invariant 1 read from the other side. Every reduction is also a
decision about _which_ extremum survives, and a chart of a downsampled series with an
anomaly score computed from the full one disagrees with itself.

**The cap is counted from the trading calendar, before any query runs**, in bar _starts_
rather than by dividing a duration — so a half day counts 210 without the counting
function knowing half days exist. The boundary is asserted on one: 26 regular sessions
plus 2026-11-27's early close is 10,350 and refused, 26 sessions is 9,960 and served. A
count that ignored the early close would refuse both and the test would still be green
for the wrong reason.

**Reversal trigger:** a legitimate view whose window genuinely needs more than 10,000
bars at its timeframe. The repair is then a **reduction record on the wire** naming
`from`, `bucket` and `method` — never a new member of `TIMEFRAMES`, and never a silent
one.

### 3. Provenance is stored at the SERIES grain, on the ledger, and that grain is a decision

`market_bars` holds **no** per-bar provenance, on purpose — four provenance columns on
forty-eight million rows are forty-eight million copies of two constants. But a
`BarSeries` cannot exist without provenance: `bar-series.ts` brands it and `toBarSeries`
is the only way to obtain one. So the read had to produce a fact the schema did not hold,
and **the grain at which a product stores provenance is therefore a decision rather than
a lookup**. This story took it at the **series** rather than at the observation:
`0007_bar_coverage_provenance.sql` puts `provider` and `feed` on `bar_coverage` — ~1,036
rows at 518 securities × 2 timeframes — and `retrievedAt` is
`min(market_bars.recorded_at)` over the rows actually returned.

**The free answer was refused because it was MEASURED FALSE, not because it was
fragile.** The recommended candidate was a constant asserted at the read boundary —
everything stored is `alpaca`/`sip` — written as a guard so a second writer would break
it loudly. Implemented that way first, **the guard immediately turned four existing tests
red**: `backfill.database.test.ts` drives the _shipped_ `runBackfill` with the _fixture_
provider into a real PostgreSQL database, in CI, today. A constant would have labelled
**invented prices as the full US consolidated tape** on a chart — invariant 6 failing
with nothing going red, and §5.4's structural guarantee defeated by the store in the
middle.

**`min` rather than `max`** for `retrievedAt`: a window can span several batches — five
sessions of NVDA minute bars is six batches spanning 13 seconds — and `max` reports the
freshest while understating the staleness of the rest. `min` cannot overstate freshness.
The alternative that reports every batch truly, one `BarSource` per batch, is refused
because a year of daily backfill would put ~250 sources on a wire whose `sources` field
exists to say _part IEX, part consolidated tape_. A list that long stops being a
provenance record and becomes a log.

**One `bar_coverage` row holds exactly one source for one window, and that limit is the
enforcement.** `recordSeries` **refuses** a series whose source disagrees with the row it
would extend, and refuses a stitched series naming two sources for one window. So the day
a second feed writes into one series is the day the write throws naming both.

**Reversal trigger:** a second feed writing into one `(security, timeframe)` series — at
which point `0004_market_bars.sql`'s per-bar `feed` column is what is owed, and the write
path is already throwing to say so.

**One convention this bends, reconciled rather than left contradictory.**
`0002_securities.sql` argues that a provenance column takes **no default**, because a
default is the migration inventing a source. `0007` gives its two a default. The rule
that reconciles them is in `migrations/README.md`: the requirement is that a writer
cannot insert without naming a source; `not null` with no default is the usual way to get
that and is unavailable on a **populated** table mid-deploy, so the guarantee moves into
the type system — `schema.ts` declares both columns required on insert, and the
database's default is unreachable from any shipped writer.

### 4. A window ending NOW is stitched from two tapes and the seam is LABELLED

The backfill stores complete sessions only, so a chart window ending _now_ spans a stored
part (SIP) and a live part that is not stored and comes from a different tape. This
product answers "up to now" by **stitching the store to a live tail and reporting both
feeds**, rather than by ending the chart at the last close.

**Rejected:** _serve only what is stored_ — honest, cheapest, and visibly wrong to anybody
who expected today. _Ask the provider for the whole window on demand_ — it makes every
chart a metered vendor request.

This is the first time this application makes a **vendor network call while serving a user
request**, which is a new property of the system rather than a new function in it. It is
safe because decision 5's cache bounds it to one request per resolved window per minute,
and the stitch itself costs **under 20 ms**. A provider failure while fetching the tail is
a **200** carrying the stored part with `covered` ending where the store ends — §36's
incremental degradation, not an error.

**A partial answer is a 200 and so is an empty one**, and this is where the temptation is
settled: **a 404 is about the security, never about the data.** An empty series _is_ an
answer — we asked, we hold nothing, and here is the window we asked over — and answering
it with a 404 leaves a client unable to tell "no such symbol" from "nothing traded". 204
was refused for the same reason: the body _is_ the answer, because provenance and the
requested window are what an empty series still carries.

### 5. Freshness is decided by the trading CALENDAR and identity by the BODY

The bars of a closed session never change. **The response carrying them does**, in two
ways the calendar cannot see: a vendor correction moves a price and its `recorded_at`, and
`securityStatus` is read from a different table that `pnpm universe` can flip against a
window that closed years ago.

So what shipped is a **validator**, not a lifetime: a weak `ETag` recomputed from the
whole serialised body, on both `/market-data/bars` and `/securities`. No response carries
`immutable`, and none carries a `max-age` longer than **five minutes** — the ceiling on
how long anything in this system can serve an invalidated body. An absolute window inside
closed sessions gets that five minutes; **a named window carries no lifetime at all**,
because `?sessions=5` is a stable URL naming a moving target.

**The cache in front of `serveSeries` is IN-PROCESS, and a shared one was refused rather
than overlooked.** A Redis or a second database bought to save a vendor request the free
plan does not charge for is a database bought for nothing. The consequence is that the
bound is per replica — and the multiplier was **read rather than assumed**: `maxReplicas`
is `1` with no scale rule, so the bound is one vendor request per resolved window per
minute, full stop. That number exists in **no file in this repository**; `HOSTING.md` is
its only durable copy.

**The whole mechanism is two response headers**, which makes it the first thing this
application ships whose correctness depends on a proxy nobody here configures. §13.6's
four deployed readings are the only evidence it works outside `app.inject()`.

**Reversal trigger:** a correction that a client is measured to hold past its usefulness,
or a third mutable field found in an "immutable" response.

**Epic 13 inherits the whole of this**, because in replay every window is closed.

### 6. A dependency being down is a 503, and the classifier errs towards 500

`SERVICE_UNAVAILABLE` is `API_ERROR_CODES`' fourth member and the first added for a
failure that is **not ours**. A 500 says _this server failed_; a database that is down is
a dependency that is unavailable and a client may usefully retry. Those are different
instructions, and answering the second with the first is a well-formed answer naming the
wrong thing.

`isDatabaseUnavailable` is the classifier — an allowlist of Node's connection errors,
SQLSTATE class `08`, the server-shutdown and connection-limit states, and `pg-pool`'s
connection-timeout **message string**. It **errs towards 500**: anything unrecognised
stays ours, because telling a client to retry something that cannot succeed is worse than
the reverse.

It is ADR-shaped rather than task-shaped because **every later epic that adds an
unreliable dependency inherits the question** — Epic 9's SEC client first.

**Reversal trigger:** a failure class repeatedly mis-answered as 500 is a reason to add to
the allowlist — **never** to invert the default.

### 7. The wire is COMPRESSED, and the finding that led there is worth more than the repair

`@fastify/compress` in `buildServer()`, gzip and deflate only, over every response above
1,024 bytes. `/securities` falls from **190,736 to 20,072 bytes**; the at-the-cap series
from 1,104,621 to 178,698.

**The decision is dull. The finding under it is not.** Story 2.9's scope had owed an
encoding choice from the start — _"a year of minute bars is large enough that the encoding
matters; measure it before choosing anything clever"_ — and every payload figure this
story quoted from Task 2.9.1 onward was a **gzipped** number. Task 2.9.9 measured the
actual transfer and found the encoding was `identity`, everywhere, always: neither the
application nor the Azure Container Apps ingress compressed anything, and **nobody had
ever checked**. That is `CLAUDE.md`'s _What `pnpm verify` does not cover_ §6 — behaviour
that exists only on the platform — and it means decision 2's cap had been argued in units
that described a transfer which did not happen.

**So the class of defect is: an assumption about the transport that every test was
structurally unable to see.** `app.inject()` never negotiates an encoding. Nothing in
`pnpm verify` opens a socket. The assumption was not unverified through carelessness; it
was unverifiable by any instrument the repository owned.

**And the repair had exactly the same shape, which is why the pair is recorded rather than
the fix.** A compressor registered ahead of the validator removes every `ETag` — with
nothing on screen wrong and every `app.inject()` test green. Both failures were **produced
red first** rather than reasoned about. Two smaller findings came out of producing them:
the entity tag became **weak** (`W/"…"`), and which of the three RFC-legal repairs was
happening had to be found by **asking a running server** rather than by reading a plugin's
documentation; and a compressed size is **platform-dependent** — the deployed linux
container's zlib produces 7,473 bytes where darwin/arm64 produces 7,549 for a
byte-identical body — so a compressed figure is re-taken per environment rather than
carried across one. Every _identity_ figure is byte-identical between the two, which is
the control that says only the encoder differs.

## What a green run certifies here, and what it does not

### What it certifies

- **The contract cannot silently lose a field.** A field added to any of the seven guarded
  response shapes without its schema entry is `TS1360`. Produced at the close on a
  **nested** shape (`BarPayload`), because the guard checks top-level keys and does not
  reach into a nested object — which is why it is applied seventeen times across this
  application rather than four.
- **Every route that can fail declares `500: apiErrorSchema`**, walked by
  `server.test.ts`'s route table.
- **The refusal taxonomy, the window forms and the cap** are exercised by 28 unit tests
  with no pool, no Fastify and no clock in them, and by 39 `app.inject()` tests over the
  assembled server.
- **The partial answer and the empty answer are 200s**, asserted rather than described.

### What it does NOT certify

- **The figures.** Half of this story's acceptance criteria are properties of a
  **populated database** and cannot be re-taken from a clean clone — the same split ADR
  0020 recorded. Criterion 5 is `MARKET-DATA-API.md` §12 and §13, dated, and it is
  re-measured rather than re-read.
- **The vendor.** Every fixture-backed test passes against a corpus we wrote.
- **The transport.** Nothing in `pnpm verify` negotiates a content coding against a
  deployed host, so "the ingress passes `Content-Encoding` through untouched" is a stated
  invariant checked by one `curl` at one moment. It is on `CLAUDE.md`'s list of what
  `verify` does not cover, with its re-measurement, for exactly the reason decision 7
  gives.
- **That the five-minute ceiling stays one number.** It is spelled twice — as
  `CLOSED_ANSWER_SECONDS`' 300 in the header and as the derived `CLOSED_ANSWER_TTL_MS` in
  the cache — and holds by construction today because both derive from one constant.
  Nothing checks that a later edit keeps them derived.

## Consequences

- **Story 2.10** fetches through this contract and inherits three things it should not
  re-decide: send the named window rather than resolving one from a browser clock, treat a
  partial answer as a loaded state rather than a failed one, and **do not build a second
  TTL** over URLs the server already validates.
- **Stories 2.12 and 2.13** inherit decision 2: the server never reduces, so a window
  control that can ask past the cap has to handle a 400 that names the number. §12.4's
  20.6 ms calendar walk is the dominant cost of a full-depth daily window and is paid on
  every cache hit.
- **Story 2.14** renders decision 4's seam — `sources` with a feed each — and decision 3's
  `retrievedAt`.
- **Epic 3** puts a live stream beside this wire rather than through it (§31), and
  inherits decision 3's refusal: its bars are IEX where these are SIP, and the write path
  throws if they meet in one ledger row.
- **Epic 4's Market Overview** inherits `MARKET-DATA-API.md` §15: the cross-sectional
  "what did everything last close at" read is a lateral scan of two rows per security,
  measured at **4.8–8.2 ms warm** against **182–279 ms** for the `row_number()` window
  function everybody writes first.
- **Epic 9** inherits decision 6 for the first dependency that is not ours.
- **Epic 13** inherits decision 5 whole, and decision 1's absolute range as the form a
  replay clock speaks.

## Related

- **ADR 0020** — the store this wire serves, amended 2026-09-10 for the ledger's two new provenance columns
- **ADR 0018** — the provider seam, `BarSeries`, and why provenance travels with a series
- **ADR 0019** — the vendor whose asymmetric free plan makes decision 4's two feeds necessary
- **ADR 0017** — the trading calendar decision 1's named form resolves through
- **ADR 0015** — the migration mechanism decision 3 shipped a migration through, and gap 4, which decision 3's query is the first real test of
- **ADR 0007** — the error contract decision 6 adds a member to
- **[`MARKET-DATA-API.md`](../../planning/epic-02-security-universe-historical-data/story-09-market-data-api/MARKET-DATA-API.md)** — every alternative, every measurement and every reversal trigger this document summarises
