# The market-data API — the namespace, the window, and the four open decisions

The subject document for [Story 2.9](STORY.md), produced by Task 2.9.1, which
**ships no route, no type and no page**. Its whole output is that Tasks 2.9.2 to
2.9.6 do not each answer the same question differently — Task 2.6.1's precedent,
which settled the provider seam's shape a task before anything implemented it.

Every figure below was taken **on 2026-09-09 against the local 48,027,772-row
store**, by the method each table names, or is quoted with its source and date —
**except §11, which was taken on 2026-09-10 against the same store** and says so
under each of its tables. Nothing here is carried forward from `CLAUDE.md`, and
§8 records the one figure that did **not** reproduce.

**Read §8 before quoting anything.** One number this task was handed to work
from is wrong by 24%, and it is wrong in the direction that matters.

---

## 1. The namespace and the path — `GET /market-data/bars`

**Decided: the series endpoint is `GET /market-data/bars`, with the symbol as a
query parameter rather than a path segment.**

`GET /market-data` already exists (Task 2.6.7) and answers _which feed is this
deployment reading_. That task's amendment states the one hard rule and it is
inherited unchanged: **no second endpoint may answer "which feed".** That fact
has one home, and a series' own provenance is a different fact that travels on
the series.

| Option                               | What it buys                                                                                                                  | What it costs                                                                                                                                                        |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A — `/market-data/bars?symbol=…`** | One namespace for everything whose subject is the market rather than the security. Grows to more than one symbol per request. | `/market-data` is then both a resource and a namespace, which reads oddly until you say it out loud once.                                                            |
| **B — `/securities/:symbol/bars`**   | The REST-correct read: bars belong to a security, and it mirrors the frontend route `/securities/:symbol` Story 2.11 adds.    | **Structurally single-symbol.** §18's `OPEN_COMPARISON_CHART` names four symbols in one command, and a path keyed on one symbol cannot answer it without N requests. |
| **C — `/market-data/bars/:symbol`**  | A's namespace with B's readability.                                                                                           | Same single-symbol ceiling as B, with none of B's REST argument. Strictly dominated.                                                                                 |

**A, on two arguments that are about this product rather than about REST.**

**The first is the namespace's subject.** A bar series is a _market-data_ object
that happens to be about a security. Provenance, feed, adjustment and coverage
are all market-data vocabulary; `SeriesProvenance` is what Story 2.14 renders,
and `MarketDataProvider.feed` is where both this route and `/market-data` get
their answer. Epic 3's live channel and Epic 5's snapshots sit in the same
namespace. `/securities` is the tracked-universe resource — a curated list with
a `status` and a coverage summary — and hanging fifty million bars off it makes
one path mean two things.

**The second is the one that actually forecloses something.** §18's worked
example is a comparison chart of NVDA, AMD, AVGO and SPY in a single
`WorkspaceCommand`, and §20's investigation generates exactly that. Option B
cannot ever answer it in one request; option A can, by widening one query
parameter. **This task builds neither** — `CLAUDE.md`'s rule against scaffolding
ahead holds, and Task 2.9.2 types a single `symbol` — but choosing the path that
_can_ grow costs nothing today and choosing the one that cannot is a rename
across three later epics.

**Note what the frontend route does not decide.** `paths.ts` already records that
Story 2.11's security view is `/securities/:symbol`, nested under the list. That
is an argument about **URLs a person types and links they share**, and it does
not follow that the API mirrors it. The two are allowed to differ and here they
do.

**Reversal trigger, as a condition:** the first request in this namespace whose
subject is a security rather than the market — something like "everything we
hold about NVDA" assembled across bars, filings and anomalies. That is a
`/securities/:symbol` resource and it should be one; it does not move the series
endpoint, because a series would still be a market-data object it links to.

---

## 2. Open decision 1 — the window: **both, with the absolute range as the primitive**

**Decided: a request may express its window as an absolute range _or_ as a named
count of sessions, never both, and the named form resolves server-side to an
absolute range that the response reports back.**

Three facts bind this and none of them is reopened here:

- a market instant on the wire is a **UTC ISO 8601 string** with the `Z`, and
  `America/New_York` exists only at the moment of display (`CALENDAR.md` §5);
- a market **date** is a separate wire type, a `YYYY-MM-DD` string, because a
  session is a date rather than an instant;
- `lastMarketSessions(n, endDate)` returns sessions **oldest first** and
  **refuses rather than truncates** outside the calendar's 2024–2028 range
  (ADR 0017 decision 9), and `packages/shared` may not read the wall clock — a
  lint rule — so `today` is resolved in the handler and passed in.

| Option            | What it buys                                                                        | What it costs                                                                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Absolute only** | The dumbest possible server. One code path, one validation.                         | **The client has to resolve "the last 5 sessions" itself, against the browser's clock.** See below — that is a defect class, not an inconvenience. |
| **Named only**    | One definition of a session, and the calendar's refusal on every path.              | Cannot express an arbitrary window, which Story 2.13's scrubber and Epic 13's replay both need. Not a candidate.                                   |
| **Both** ✅       | The frontend sends the named form and never touches a clock; replay sends instants. | Two request shapes to validate, and a request naming both has to be refused rather than silently preferring one.                                   |

**The argument that decides it is the browser's clock, and it is specific rather
than theoretical.** `market-calendar.ts` ships to the frontend bundle, so a
client _could_ resolve five sessions itself. What it cannot do correctly is
supply `today`: a browser in Singapore at 09:00 local is still on the previous
**market** date in New York, and a client that computes "the last 5 sessions"
from its own date is off by one session for roughly half the world for several
hours of every day. That is invisible in local testing, wrong for a subset of
users, and produces a chart that is plausible and shifted. The server knows the
market date; the browser knows a timezone. So `today` is resolved in the handler
— which is where the lint rule already forces it to be — and the named form
exists so a client never has to.

**The absolute range is the primitive and the named form is sugar over it.** The
handler resolves `sessions=5` through `lastMarketSessions(5, marketDateAt(now))`
to `[first.open, last.close)` and then proceeds identically. That is what makes
this two shapes rather than two products: there is one query, one cap check and
one `SeriesCoverage`, and `coverage.requested` always carries the **resolved
absolute range** so a named request and an absolute request are the same answer.

**The calendar's refusal is a 400 and this is where it is settled.** A named
window reaching before 2024-01-01 throws `MarketCalendarRangeError` at
resolution; that is the caller asking for a window this system cannot express,
so it answers `BAD_REQUEST` with a message naming the range — never a 500 and
never a truncated list. Produced rather than assumed: `pnpm bars NVDA 1d --from
2016-01-04` refuses at window construction with no request made (`BARS.md` §2).

**Reversal trigger, as a condition:** the first named window that cannot be
expressed as a count of sessions — "year to date", "since the open", "since the
last earnings". At that point the named form is becoming a query language, and
the answer is to resolve those in the client against a server-supplied market
date rather than to grow a vocabulary here.

---

## 3. Open decision 2 — downsampling: **the server never reduces a series**

**Decided: no server-side reduction. A caller chooses a timeframe, gets exactly
the stored bars in the window, and a request that would exceed §4's cap is
refused rather than quietly made smaller.**

The user delegated this one with the numbers in front of them, so the argument
is recorded in full.

### What it costs, measured

NVDA, the full stored minute depth, serialised in the exact wire shape
(`startsAt` as an ISO 8601 string, five JSON numbers), best of five:

| Window                                 | Timeframe |   Bars |     JSON |    gzip | Query    | Serialise |
| -------------------------------------- | --------- | -----: | -------: | ------: | -------- | --------- |
| One year, 2025-09-08 → 2026-09-05      | `1m`      | 97,530 | 11.08 MB | 1.80 MB | 119.9 ms | 87.3 ms   |
| One month, 2026-08-01 → 2026-09-01     | `1m`      |  8,190 |   927 kB |  149 kB | 8.8 ms   | 8.1 ms    |
| One session, 2026-09-04                | `1m`      |    390 |  44.3 kB | 7.29 kB | 0.7 ms   | 0.3 ms    |
| One year, 2025-09-08 → 2026-09-05      | `1d`      |    251 |  28.8 kB | 6.15 kB | 0.6 ms   | 0.2 ms    |
| The whole stored daily depth, to 09-05 | `1d`      |    672 |  76.8 kB | 16.5 kB | 0.9 ms   | 0.6 ms    |

And what a server-side OHLCV bucketing of that same minute year would cost —
`first(open), max(high), min(low), last(close), sum(volume)` in SQL over
`numeric`, which is the **aggregation** the task asked for rather than a
sampling:

| Bucket |   Bars |    JSON |   gzip | Query    |
| ------ | -----: | ------: | -----: | -------- |
| `5m`   | 19,194 | 2.19 MB | 384 kB | 106.6 ms |
| `15m`  |  6,398 |  731 kB | 134 kB | 76.9 ms  |
| `60m`  |  1,723 |  198 kB |  38 kB | 73.1 ms  |

So a served reduction **works**, is affordable, and preserves the spikes — which
is why it had to be argued down rather than dismissed. Taking every _n_ th bar
was never a candidate: it deletes exactly the extremes §11 exists to notice.

### Why the answer is still no

**`1d` is already the reduction, and it is a stored one that is strictly better
than anything we could compute.** `PROVIDER.md` §9.4 settled it: a vendor's daily
bar is the official session OHLC **including auction prints**, which minute bars
may simply not contain. So a 1m → 1d aggregate is not the same number computed
twice, it is a different and worse number. A year at `1d` is 251 bars and 28.8 kB
— 0.26% of the minute payload — and it is the honest answer to a long window.

**The gap a served reduction would fill is narrower than it looks.** Measured, a
month of minutes is 8,190 bars, 937 kB and 17 ms end to end. So intraday
resolution is comfortably serveable up to about five weeks, and `1d` covers
everything from a few months outward. The band where neither works is roughly
six weeks to three months at intraday resolution, and **no story in this epic
asks for it**: Story 2.12 charts a window a user picks, Story 2.13 adds the
window control, Epic 13 replays a session.

**§35 lists _"manufacture missing observations"_ among the things this product
must not do, and a derived bar has no way to say it is derived.** `Bar` carries
five numbers and an instant; there is no field distinguishing an observed bar
from a computed one, and `BarSeries` says where bars came from but not what was
done to them beyond `adjustment`. Introducing a reduction therefore means either
a new field on the wire or a series whose members are two different kinds of
thing wearing one type. That is a real cost, and it is paid on every consumer.

**And it would put a second source of truth where Epics 5 and 13 need one.**
§11's price anomaly is a five-minute return compared against 60 trading days of
five-minute returns, computed by Epic 5 **from stored minute bars**; §22 requires
replay to reconstruct from what was knowable. A provider-side or read-side
five-minute bar is a second answer to the same question that replay cannot use —
`PROVIDER.md` §9.4's stated reason for making aggregation inexpressible in the
first place. Reversing that here, in the read contract, would reverse it
everywhere.

### What this forecloses, said plainly

**A three-month intraday chart cannot be requested in one call.** Story 2.12
inherits that: its window control offers windows that fit, and a user who wants
three months gets `1d`. If that turns out to be the wrong product answer, §4's
cap is the thing to revisit first, because raising it is a number and adding a
reduction is a contract.

**Reversal trigger, as a condition:** the first screen that must show **intraday
resolution over a window whose stored bar count exceeds the cap** — not "a chart
feels slow", and not a story number. When it fires, the repair is a `reduction`
record on the response naming `from`, `bucket` and `method`, so a reduced series
is self-describing; it is **not** a new member of `TIMEFRAMES`, because that
would make the same interval mean two things in the store and on the wire.

---

## 4. Open decision 3 — the cap: **10,000 bars, refused with a 400 that names the limit**

**Decided: one series response carries at most 10,000 bars. A request that would
exceed it is refused with `BAD_REQUEST`, naming the limit, the count the request
would have produced, and the two ways to fit — a narrower window or the `1d`
timeframe. There is no pagination and no silent reduction.**

Story 2.4 answered the universe's version by having **no page size at all**, on
the argument that _the thing that reaches 500 without an edit is no number rather
than a bigger one_. That argument does not transfer and the story says so: a
curated file's size is ours, a series' size is the caller's.

| Option                   | What happens at the limit                                 | Why not                                                                                                                                                                                                                                                                      |
| ------------------------ | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A — 400 naming it** ✅ | The request is refused and the client is told what to do. | Costs the client one round trip and a branch. That is the whole cost.                                                                                                                                                                                                        |
| **B — silent reduction** | Fewer bars than asked for, unannounced.                   | The one outcome the task names as to-be-avoided. A chart drawn from it is wrong and looks right.                                                                                                                                                                             |
| **C — pagination**       | A cursor, and the client assembles.                       | **Two mechanisms for "you did not get everything"** — `SeriesCoverage`, which is honest and already exists, and a cursor, which is procedural. And `toBarSeries` is coherence-checked over a whole series, so a paged client cannot construct one until the last page lands. |

### Where 10,000 comes from — and what does _not_ set it

The obvious candidate bound was §28's **"no routine main-thread task >50 ms"**,
applied to the client's `JSON.parse`. **Measured, that is not the binding
constraint**, and the negative result is worth recording because it is the one
everybody reaches for first (same V8, Node 24, best of five, on successive slices of the one minute
year — so the 8,190 row is a different stretch of bars from §3's August month,
and the two differ by 1%):

| Bars   |     JSON |    gzip | `stringify` | `parse` |
| ------ | -------: | ------: | ----------: | ------: |
| 390    |  44.5 kB | 7.00 kB |      0.1 ms |  0.1 ms |
| 1,950  |   223 kB | 35.4 kB |      0.7 ms |  0.5 ms |
| 8,190  |   937 kB |  151 kB |      2.7 ms |  2.3 ms |
| 10,000 |  1.14 MB |  184 kB |      3.5 ms |  2.7 ms |
| 20,000 |  2.28 MB |  373 kB |      6.9 ms |  5.3 ms |
| 50,000 |  5.69 MB |  927 kB |     16.5 ms | 13.1 ms |
| 97,530 | 11.08 MB | 1.80 MB |     32.1 ms | 25.4 ms |

Even the whole minute year parses in **25.4 ms**, inside the budget. So parsing
does not refuse anything.

**What refuses it is the wire.** 1.80 MB gzipped is ~1.4 s of transfer on a
10 Mbit/s link and ~290 ms on 50 Mbit/s, against §28's "visible feedback within
500 ms" and §36's requirement that a slow part not stall the workspace. At
**10,000 bars the payload is 184 kB gzipped — about 150 ms on 10 Mbit/s** — and
that is the line.

> **Amended 2026-09-10 by Task 2.9.9, which measured the wire instead of
> assuming it: this paragraph's arithmetic is about a compressed transfer that
> does not happen.** Neither the application nor the Azure Container Apps ingress
> compresses anything — `Accept-Encoding: gzip, deflate, br` returns the full
> body with no `content-encoding`, both locally and deployed (§12.5). The
> at-the-cap response is **1,104,621 bytes on the wire**, and measured from the
> United Kingdom to `eastus` a body of that size takes **1.3–2.7 s** to transfer
> after **~0.8 s** of connection. **The decision stands and its reasoning does
> not**: on the uncompressed figure 10,000 is generous rather than tight, and
> §12.3 re-argues it on what actually admits and refuses the windows Story 2.12
> needs. The repair that would make this paragraph true again is a compression
> plugin, and §12.5 states the condition for it.

> **Amended again 2026-09-10 by Task 2.9.10: the plugin is shipped, and this
> paragraph's original arithmetic is true again.** `@fastify/compress` is
> registered in `buildServer()`, and every response over 1,024 bytes now goes
> out gzipped (§13). Measured on the wire rather than over the body: the
> at-the-cap response is **178,698 bytes**, which is exactly the figure the
> `gzip` column above already carried — hypothetical when it was written, the
> wire now. At 10,000 bars the payload is ~184 kB compressed and "about 150 ms
> on 10 Mbit/s" describes what a client actually receives. **Nothing about the
> cap changed; what changed is that its stated reason is once again its reason.**

The cap is stated **in bars and not in bytes**, and the measurement says it may
be: across eight securities spanning the price and liquidity range, the per-bar
cost varied only from **109.4 to 113.6 bytes** (13.4–18.5 gzipped), a 4% spread.
Bars are what the caller asked for; bytes are what we would have to explain.

| Symbol |   Bars | JSON B/bar | gzip B/bar |
| ------ | -----: | ---------: | ---------: |
| NVDA   | 97,530 |      113.6 |       18.5 |
| PLTR   | 97,530 |      112.8 |       18.3 |
| AAPL   | 97,530 |      112.3 |       17.7 |
| SPY    | 97,530 |      112.1 |       17.9 |
| BRK.B  | 97,488 |      111.5 |       17.5 |
| MMM    | 96,203 |      110.9 |       15.9 |
| F      | 97,526 |      109.6 |       13.4 |
| T      | 97,530 |      109.4 |       13.8 |

**What 10,000 admits and refuses**, against the windows this epic will actually
ask for:

| Request                       |    Bars | Verdict |
| ----------------------------- | ------: | ------- |
| One session, `1m`             |     390 | ✅      |
| Five sessions, `1m`           |   1,950 | ✅      |
| One month, `1m`               |   8,190 | ✅      |
| Six weeks, `1m`               | ~12,090 | ❌ 400  |
| One year, `1d`                |     251 | ✅      |
| The entire stored daily depth |     672 | ✅      |
| One year, `1m`                |  97,530 | ❌ 400  |

**The cap is checked before the query runs, not after.** The bar count of a
window is computable from the calendar — `marketSessionsBetween` plus the
session lengths — so an over-cap request costs a calendar walk rather than a scan
of 97,530 rows that is then thrown away. That also makes the error message able
to say what the count _would_ have been, which is the half that makes it
actionable.

> **Amended 2026-09-10 by Task 2.9.9: true, and the walk was never priced.** It
> costs **~30 µs per session in the window** and it runs on **every** request,
> including a cache hit, because that is how the count is obtained at all. A
> month is 0.7 ms of it and invisible; **the whole stored daily depth is 672
> sessions, 20.6 ms of walking, and the dominant cost of a request whose database
> read is 1.9 ms** (§12.4). The refusal still costs no scan, which is what this
> paragraph claims; the accepted path pays the same walk, which it does not say.

**Reversal trigger, as a condition:** the first screen whose **default** window
is refused by this cap. A user occasionally hitting it is the cap working; a
product view that cannot load without it is the cap being wrong, and the repair
is a bigger number before it is a reduction — 20,000 bars is 373 kB gzipped and
still parses in 5.3 ms.

---

## 5. Open decision 4 — the read-side join: **stitch, and label the seam**

**Decided with the user: the read path stitches, and the response reports every
feed the series came from.** The task recommended serving only what is stored;
the user chose the stitch, and this section records what that means as something
buildable rather than as an intention.

### The measurement that frames it

Taken today against the local store:

| Reading                                      | Value                                    |
| -------------------------------------------- | ---------------------------------------- |
| Newest stored `1m` bar                       | `2026-09-04T19:59:00Z`                   |
| `bar_coverage.covered_end`, `1m`             | `2026-09-04T20:00:00Z` — **for all 518** |
| Newest stored `1d` bar                       | `2026-09-04T04:00:00Z`                   |
| Sessions between that and today (2026-09-09) | **2** — 09-08, and today in progress     |

Every security's coverage ends at the same instant, which is the backfill's
frontier and not a per-name property. Quoted with their source and date rather
than re-taken: a mid-session vendor fetch is **always ~16 minutes stale** and
returned **134 of 390 minutes** at a simulated 12:00 ET, and everything stored is
**SIP** where Epic 3's stream is **IEX** (`BARS.md` §8.13, 2026-09-08).

Note the local store is a **snapshot** left by Task 2.8.8, not a store with the
nightly catch-up running; the deployed one is two sessions less stale. The shape
of the problem is the same and the size of the gap is not a constant.

### What the stitch is, and the bound that makes it safe

`market-provenance.ts` already anticipates this exactly: _"the moment the read
path puts stored bars and freshly fetched bars in one series — which it does the
first time a request runs past what the store holds — the caption is unchanged
and wrong."_ The mechanism is built and unexercised: `SeriesProvenance.sources`
is a list, `mergeSeriesProvenance` is the only way to obtain a multi-source
record, and `toBarSeries` asserts the per-source bar counts sum to the bars it
holds — so a stitch that concatenated two arrays and kept one provenance record
throws rather than lying.

Five rules, and the third is the one that keeps this from being a vendor-budget
accident:

1. **Only the uncovered tail is fetched.** The stored part is read from
   `market_bars`; the provider is asked only for `(covered_end, requestedEnd)`.
   That is what distinguishes this from "ask the provider for the whole window",
   which was the option nobody chose.
2. **The tail is clamped to what the plan will serve** — `now − 16 min` — because
   the recency cliff keys on `end` alone and refuses the **whole** request
   otherwise. The clamp is mandatory rather than polite (`ALPACA.md` §10).
   **Amended 2026-09-09 by Task 2.9.5, which built the read path: the clamp is
   already applied and it is applied one layer DOWN.** `alpaca-provider.ts` has
   called `alpacaServableEnd` before building its first request since Task
   2.7.5, reports the clamp as `coverage.covered`, and costs **no request at
   all** for a window lying entirely inside the withheld minutes. Neither
   `pnpm backfill` nor `pnpm bars` clamps; both get it through the seam. So the
   read path calls it **not at all** — a second call site would put a fact about
   one vendor's free plan inside a provider-agnostic module, and would save a
   request the provider already declines to make. What the read path owes is
   that the clamp be visible in the answer, which it is: the merged
   `coverage.covered` ends where the tail's does. This rule is unchanged as a
   requirement on the system and is no longer a requirement on this story's
   code.
3. **The read path fetches at most the current session's tail.** If the store is
   days behind — as it is locally, by two sessions — a "last 5 sessions" request
   must **not** turn into a multi-day vendor fetch on a page load. Older missing
   data is a gap the backfill owns, and `coverage.covered` reports it honestly.
   Without this bound the stitch is a metered vendor request proportional to how
   stale the store is, which is a cost that grows while nobody is looking.
4. **A failing tail does not fail the request.** §36's rule, and this is its
   first real instance in the epic: a provider that is down, rate-limited or
   refused leaves the stored part served, with `coverage.covered` ending where the
   store ends. It is not a 5xx, and the provider's eight-member error taxonomy
   does not reach the client.
5. **Both parts are fetched at the same `adjustment` or there is no series.**
   `mergeSeriesProvenance` refuses a raw/split-adjusted join, because the two are
   on different price scales and every percentage change across the seam would be
   wrong. The store holds `raw`, so the tail is requested `raw`.

**Today both sources report `sip` and the seam is invisible in the payload; that
is correct and it is not the steady state.** When Epic 3's live tail arrives the
same series carries `sip` and `iex` in one `sources` array, and Story 2.14 renders
both — which is the entire reason that field is a list. §7.1's rule applies to
each part rather than to the response: `MARKET_FEED_DESCRIPTIONS` already refuses
to let `iex` be shown without the sentence saying it is one venue.

**What this costs, stated rather than discovered:** a chart window ending _now_
becomes a metered vendor request on a cache miss. Task 2.9.8's caching is
therefore load-bearing rather than an optimisation — a closed session is
immutable and must be served from cache, so the metered request is bounded to the
open session. If 2.9.8 finds it cannot bound it, that is the condition to bring
this decision back rather than to absorb the cost.

> **Not brought back. Settled 2026-09-10 across Tasks 2.9.8 and 2.9.9.** 2.9.8
> bounded it to one vendor request per resolved window per minute per process,
> and 2.9.9 read the multiplier off the platform — `maxReplicas: 1`, so the bound
> is that, exactly (§12.7). 2.9.9 also priced the join itself, which nothing had:
> the first genuine two-source response this product has served cost **~17 ms**
> more than the same 390 bars read from the store (§12.6). The stitch is
> affordable as chosen.

**Reversal trigger, as a condition:** the tail's **source** changes when Epic 3
has a live stream worth joining — at that point rule 2's clamp and rule 3's bound
both stop being necessary, because a stream is not a metered request and is not
16 minutes stale. The decision to stitch does not change; the thing being
stitched does. The trigger to reconsider the **decision** is Task 2.9.8 failing to
bound the metered request.

---

## 6. What a partial answer is, in this contract's own words

§36 makes failure and partiality **product states rather than errors**, and
`SeriesCoverage` already has the shape: `requested` is always present, `covered`
is `null` exactly when the series is empty. What was open is which HTTP status
each is, and that is settled here so three later tasks cannot each answer it.

| Situation                                                        | Status  | Body                                                            |
| ---------------------------------------------------------------- | ------- | --------------------------------------------------------------- |
| Bars covering the whole window                                   | **200** | `covered` equals `requested`                                    |
| Bars covering part of it — _"we have data through 15:42"_        | **200** | `covered` narrower than `requested`                             |
| **No bars at all** — _"we have nothing for this symbol"_         | **200** | `bars: []`, `covered: null`, provenance and `requested` present |
| Symbol is not a security this system knows                       | **404** | `NOT_FOUND`                                                     |
| Malformed timeframe, reversed range, both window forms, over cap | **400** | `BAD_REQUEST`                                                   |
| Window outside the calendar's 2024–2028 range                    | **400** | `BAD_REQUEST`, naming the range                                 |
| **The database is unavailable**                                  | **503** | **`SERVICE_UNAVAILABLE`** — a new member, see below             |
| The provider fails while fetching the stitch's tail              | **200** | The stored part, with `covered` ending where the store ends     |
| Anything else uncaught                                           | **500** | `INTERNAL_ERROR`, the correlation id, never the thrown message  |

**The sentence that settles the temptation: a 404 is about the _security_, never
about the _data_.** An empty series is an **answer** — it says we asked, we hold
nothing, and here is the window we asked over — and answering it with a 404
destroys exactly that distinction, leaving a client unable to tell "no such
symbol" from "nothing traded". `SeriesCoverage.requested` is what makes the empty
case informative, and a 404 carries no body of ours at all.

**204 was considered and refused for the same reason.** It has no body, and the
body _is_ the answer here: provenance and the requested window are the two facts
an empty series still carries.

### `API_ERROR_CODES` gains its fourth member here, and that was already decided

**Corrected 2026-09-09, the same day, before any of it was built.** This section
first said no new error code was needed and that an unavailable database was a 500. **Both were wrong, and the decision had already been taken elsewhere** —
`database.ts` records it in terms, for this story to _implement rather than
re-take_:

> The status is **503**, not 500. A 500 says this server failed; a database that
> is down is a dependency that is unavailable and a client may usefully retry,
> which is a different instruction. The code is a new `SERVICE_UNAVAILABLE`
> member of `API_ERROR_CODES`, added by the story that can produce it, with
> `errors.ts`'s status-to-code mapping extended in the same change — today any
> non-404 4xx is `BAD_REQUEST` and every 5xx is `INTERNAL_ERROR`, so a 503 raised
> now would answer with a code that names the wrong thing.

`routes/securities.ts` says the same from the other side: a malformed row is a
500 because the _server_ failed, and _"a connection that fails is that other case
and is **still Story 2.9's**"_. So the member is owed here, and it is owed **with**
the mapping — a 503 raised without extending `errors.ts` answers `INTERNAL_ERROR`,
which names the wrong thing and is the failure that looks like success.

**`/diagnostics/database` is not the precedent, and reading it as one is what
produced the original error.** That route answers **200 whatever the answer is**,
deliberately: _"is the database reachable"_ is a question it answers _correctly_
when the answer is no. A data route is the opposite — it could not answer at all.

**Two consequences worth naming rather than discovering.** The member is added by
the first task that serves data from the database and can produce the failure,
which is Task 2.9.6; and once it exists, **`/securities` should get it too** —
that route has been able to produce this failure since Story 2.4 and answers a 500
today only because the code did not exist. That is a live falsification of
`database.ts`'s _"nothing in this application serves data yet"_, and it is on Task
the close task's sweep list (2.9.11 since 2026-09-10).

`NOT_FOUND` and `BAD_REQUEST` cover every other row, which is `API_ERROR_CODES`'
own test — a member is added when the server can be made to produce a failure the
existing set cannot express.

**Implemented 2026-09-09 by Task 2.9.6, and both consequences were taken in that
change rather than deferred.** `SERVICE_UNAVAILABLE` is `API_ERROR_CODES`' fourth
member; `errors.ts`' `codeFor` maps 503 to it and gives it its own constant
message; and **`/securities` answers it too**, so the sweep item above is
discharged rather than carried. What decides _which_ failures are the database
being unavailable is `isDatabaseUnavailable` in `database.ts` — an allowlist of
Node's connection errors, SQLSTATE class `08`, the server-shutdown and
connection-limit states, and `pg-pool`'s connection-timeout message. It **errs
towards 500**: anything unrecognised stays ours, because telling a client to
retry something that cannot succeed is worse than the reverse. Produced end to
end against a backend pointed at a closed port — both routes answered
`503 SERVICE_UNAVAILABLE`, and `connect ECONNREFUSED 127.0.0.1:59999` reached the
log at `warn` and no part of it reached the body.

---

## 7. `status` is not filtered on this path

Restated here so Task 2.9.4 cannot get it wrong, because it is invisible in a
query that omits it.

`UNIVERSE.md` §12.2's rule: **filter on `status` when computing over the market we
track _now_; never when showing or replaying something we _stored_.** Stories 2.7
and 2.8 filter — paying a rate-limited feed for a symbol nobody tracks is the
clearest case in the list. **This path does not.** A series request for an
`untracked` symbol returns its stored history and the response says the security
is untracked; a 404 there would be a lie about data we hold, and it is the same
answer Epic 7's Security Explorer and Epic 13's replay need.

The consequence for Task 2.9.3: the response has to be **able to say** the
security is untracked. Which field carries it is 2.9.3's to type; that it must
exist is settled here.

---

## 8. One figure that did not reproduce, and the method so it can be re-taken

**`BARS.md` §8.6 records _"a year of minute bars for one symbol is 97,530 rows ≈
8.4 MB of JSON"_ and names it as the number this decision needs. The row count
reproduces exactly. The payload does not: it is 11.08 MB, which is 24% larger.**

Reproduced on the same store, same symbol, same window (2025-09-08 → 2026-09-05):
**97,530 bars, 11,081,764 bytes** — 113.6 bytes per bar. §8.6's figure implies
86.1 bytes per bar. Its method is not recorded, so the two cannot be reconciled
by inspection, and the difference is in the direction that matters: it makes the
case for a cap **stronger**, not weaker.

The method for this one, so the next person re-takes rather than cites:

> Read `observed_at, open, high, low, close, volume` for one `security_id` and
> timeframe over the window, ordered; map each row through the wire shape —
> `startsAt` as `Date.prototype.toISOString()`, the five values through `Number`,
> exactly as `toBar` does; `JSON.stringify` the array; `Buffer.byteLength` the
> result. Gzip figures are `zlib.gzipSync` at its default level. Best of five for
> timings, on the local container, Node 24.

One representative bar on the wire, so the shape behind the arithmetic is
visible:

```json
{
  "startsAt": "2026-08-03T13:30:00.000Z",
  "open": 197.69,
  "high": 198.78,
  "low": 196.85,
  "close": 198.5401,
  "volume": 2315350
}
```

The falsified claim is quoted in three live places — `BARS.md` §8.6, this story's
2026-09-08 amendment, and Task 2.9.1's own brief. All three carry a dated
amendment as of 2026-09-09 rather than a rewrite, which is `CLAUDE.md`'s rule:
amend live claims, leave historical records standing.

---

## 9. What this document deliberately does not decide

- **The request and response types.** Tasks 2.9.2 and 2.9.3. This settles the
  shape; they type it, and the `satisfies` guard has to be applied at **every**
  nesting level — `securities-response.ts` applies it three times because it
  checks top-level keys and does not reach into a nested object, and a series
  response has bars, provenance, sources and coverage nested inside it.
- ~~**Where a stored series' `retrievedAt` comes from.**~~ **Settled by Task
  2.9.4 — see §10**, which took `min(market_bars.recorded_at)` over the rows
  actually returned, and found that the `provider`/`feed` half could not be
  answered by an assertion at all. `0004_market_bars.sql` stores no per-bar
  provenance, so the read path has to produce a `BarSource` for rows that carry
  none, and `market-provenance.ts` warns in terms about the failure mode: a read
  path that stamps `retrievedAt` at serve time turns "these bars were fetched
  three weeks ago" into "these bars are current".
- **Caching.** Task 2.9.8 — and §5 makes it load-bearing rather than optional.
- ~~**Response times against the real row count.** Task 2.9.9. §3 and §4's
  timings are local and single-request; that task takes them properly and
  deployed.~~ **Taken — see §12**, which also carries what those readings
  falsified.
- **The ADR.** Task 2.9.11 — renumbered from 2.9.10 on 2026-09-10, when §12.5
  put Task 2.9.10's compression work ahead of the close.

---

## 10. Where a stored series' provenance comes from — Task 2.9.4

**Decided: `provider` and `feed` are stored on `bar_coverage`
(`0007_bar_coverage_provenance.sql`); `retrievedAt` is
`min(market_bars.recorded_at)` over the rows actually returned; nothing is
stamped at read time.**

A `BarSeries` cannot exist without provenance — `bar-series.ts` brands it and
`toBarSeries` is the only way to obtain one — and `0004_market_bars.sql`
deliberately stores none, because four provenance columns on forty-eight million
rows are forty-eight million copies of two constants. That decision is unchanged.
So the read had to produce a fact the schema does not hold, and the task file
listed four candidates.

### The measurement that chose between them

The recommended answer was the free one: **assert a constant at the read
boundary**, everything stored is `alpaca`/`sip`, with the assertion written where
a second writer would break it loudly. It was implemented that way first, as a
guard on `recordSeries` — and **the guard immediately turned four existing tests
red**, which is the whole value of writing it as a mechanism rather than a
comment:

> `backfill.database.test.ts` drives the **shipped** `runBackfill` with the
> **fixture** provider into a real PostgreSQL database. A store holding
> `fixture`/`synthetic` bars is not a hypothetical for Epic 3. It is something
> this repository creates on purpose, today, in CI, and `pnpm backfill` under
> `MARKET_DATA_PROVIDER=fixture` is one command away from doing it to a store
> something serves.

A constant would therefore label **invented prices as the full US consolidated
tape** on a chart. That is invariant 6 failing with nothing going red, and §5.4's
structural guarantee — a fixture-backed screen advertises itself in the chrome
because the series carries `feed: "synthetic"` — defeated by the store in the
middle. The task file's own words apply: candidate 3 "is the answer if the others
are all dishonest", and this is the measurement that says they are.

### The four candidates, and what each is now

| Candidate                                      | Verdict                                                                                                                                                                                |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. A constant asserted at the read boundary    | **Refused.** Measured false today, not merely fragile later — see above.                                                                                                               |
| 2. `bar_coverage.updated_at` as `retrievedAt`  | **Refused.** Scoped to the whole series, so a catch-up appending today's bars overstates the freshness of a window fetched a year earlier.                                             |
| 3. A migration adding provenance to the ledger | **Taken, for `provider` and `feed`.** ~1,036 rows at 518 securities × 2 timeframes, so the objection that killed per-bar provenance does not reach the ledger.                         |
| 4. `market_bars.recorded_at` as `retrievedAt`  | **Taken, for the timestamp.** Scoped to the window being served, and already per-**batch**: the column defaults to `now()`, which is transaction start, so the batch is the retrieval. |

3 and 4 are complementary rather than competing, which the original list did not
make obvious: provenance has three fields and the schema could answer none of
them.

### `min` rather than `max`, and the alternative that was refused

A window can span several batches — measured on 2026-09-09, five sessions of
`NVDA` minute bars are **six** batches spanning 13 seconds — and a single-source
record carries one timestamp for all of them. `max` reports the freshest and
understates the staleness of the rest, which is candidate 2's failure in
miniature. `min` cannot overstate freshness.

The alternative that reports every batch truly is **one `BarSource` per batch**,
and it is refused: a year of daily backfill would put ~250 sources on the wire,
and `sources` is the field Story 2.14 renders to say _part IEX, part consolidated
tape_. A list that long stops being a provenance record and becomes a log.

### What the ledger's one row can and cannot say, and why that is the mechanism

One `bar_coverage` row is one `(security_id, timeframe)` and one contiguous
window, so it holds exactly one source for that window. That limit is also the
enforcement: **`recordSeries` refuses a series whose source disagrees with the
row it would extend**, and refuses a stitched series that names two sources for
one window. So the day a second feed writes into one series is the day the write
throws naming both — which is `0004_market_bars.sql`'s trigger for a per-bar
`feed` column firing **per series, at the moment it happens**, rather than being
noticed later by a person reading a chart.

**The columns carry a database default (`'alpaca'`, `'sip'`) where
`0002_securities.sql` refused one for `profile_source`.** The argument there was
that a default silently attributes one source's data to another and it is right;
this one exists for the **deploy** rather than for the data. `deploy.yml` migrates
before either half of the code rolls, so for the length of that window the
previous backfill is still the writer and does not know the columns exist — a
`not null` with no default would fail its next insert. What stops it becoming
`0002`'s failure is in the type system: `schema.ts` declares both columns
**required on insert**, so a writer that omits one is a compile error and the
database's default is unreachable from any shipped writer. Both halves are
asserted — `market-bars.database.test.ts` reads the defaults out of
`information_schema` and the vocabularies out of `pg_constraint`, comparing the
latter against `PROVIDER_IDS` and `MARKET_FEEDS`.

**Reversal trigger, as a condition:** a second feed writing into one
`(security, timeframe)` series — at which point `0004`'s per-bar `feed` column is
what is owed, and the write path is already throwing to say so.

### The one case the ledger cannot answer

An answer holding **no bars** for a pair the ledger has never had a row for.
`SeriesProvenance.sources` is a non-empty tuple, so such an answer still owes one
source, and its `barCount` is `0` — so what the fields describe is nothing. The
read uses a module constant there and says so. The alternative was making the
field nullable throughout `packages/shared`, which is a change to the domain model
of every series in the product to express a case the wire already distinguishes
with `bars: []` and `coverage.covered: null`.

### What `covered` is, and what it is not

The **intersection of the requested window with the ledger's**, and never the
extent of the bars themselves. `BARS.md` §9.1 requires coverage to be read from
`bar_coverage` rather than counted from `market_bars`; the reason it also has to
be the ledger's _range_ is Task 2.8.5's measurement that only 8 of 28 S&P 500
constituents print a full 390 minutes in a session. A covered range derived from
the bars would report a thinly traded name's quiet hour as a partial answer,
which is exactly the conflation `SeriesCoverage` exists to prevent.

An **empty** answer covers `null` in both directions, which `toBarSeries` already
enforces. The information that would otherwise be lost — _we do cover this window
and nothing traded in it_ — travels beside the series as the ledger row itself,
which is what lets Task 2.9.6 tell the empty answers apart and what Task 2.9.5
stitches against.

### Measured end to end, 2026-09-09, against the local 48,027,772-row store

| Reading                                     | Value                                                           |
| ------------------------------------------- | --------------------------------------------------------------- |
| `NVDA` `1m`, one full session (2026-09-04)  | **390 bars**, `covered` = `requested`, 42 ms cold / 6 ms warm   |
| Its provenance                              | `alpaca` / `sip`, `retrievedAt` **2026-09-08T07:28:40.261Z**    |
| The same window requested through **today** | 390 bars, `requested` ends 09-09T20:00Z, `covered` 09-04T20:00Z |
| `bar_coverage` after the migration          | 1,036 rows, all `alpaca`/`sip`, `sum(bar_count)` **48,027,772** |

The third row is §6's partial answer and §5's seam in one reading: a 200, with the
two windows saying between them exactly what is missing and nothing implied about
it.

### One assumption checked in passing, for Task 2.9.2

`series-request.ts` counts **session minutes** from the calendar to enforce the
cap, which is an upper bound only if the store holds regular-session bars and
nothing else. This is the first task that could look at the rows: **of 47,682,213
stored minute bars, zero fall outside the regular session** — earliest 09:30,
latest 15:59 America/New_York. The assumption holds and the cap is an upper bound
rather than an under-estimate. The method, so it is re-taken rather than cited: a
`count(*) filter` on `(observed_at at time zone 'America/New_York')::time`
against `'09:30'` and `'16:00'`.

---

## 11. Caching, and the one immutable thing this product has — Task 2.9.8

Every figure in this section was taken on **2026-09-10**, against the same local
48,027,772-row store, through the **built backend** on loopback. Method under
each table; re-take rather than cite.

### The mechanism, and why it is a validator

**Decided: an `ETag` recomputed from the whole serialised body carries every
cacheable response, and no response carries a long `max-age` or `immutable`.**

The objective is that the bars of a closed session never change. That is true of
the **bars** and, twice over, not quite true of the **response** — and both
findings arrived after the task was written:

| What moves                                                                       | How often                                                                    | Found by   |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------- |
| A vendor **correction** overwrites a bar and its `recorded_at`                   | Rare; `BarWriteResult.corrected` is the only trigger for noticing            | Task 2.9.4 |
| **`securityStatus`**, which is read from `securities` and not from `market_bars` | One `pnpm universe` away, against a window of sessions that closed years ago | Task 2.9.6 |
| A **close** on `/securities`' `lastCloses`                                       | Once a day, when the nightly catch-up runs                                   | Task 2.9.7 |

A validator survives all three because it does not know which field moved: it
hashes the bytes about to go on the wire. A long `max-age` survives none of
them, and is the one mechanism whose failure a user cannot clear — a promise
made before the change, which nothing can withdraw.

So the shape is: **the calendar decides freshness, the body decides identity.**
`series-cache.ts` owns the first, `http-cache.ts` the second, and neither knows
about the other's subject.

> **Amended 2026-09-10 by Task 2.9.10: the validator is now **weak** (`W/"…"`)
> and every response carrying one also carries `Vary: accept-encoding`.** This
> application compresses since that task, RFC 9110 §8.8.1 makes a content-coding
> a different representation, and the tag is computed **before** compression —
> so one tag covers the gzipped and the identity bytes alike, which is a weak
> claim rather than a strong one. Established by observation:
> `@fastify/compress` suffixes nothing, and the same request with and without
> `Accept-Encoding: gzip` returns the identical tag. Nothing else in this
> section moves — `If-None-Match` uses the weak comparison function regardless,
> the `304` is unchanged, and the hash is still taken over the string
> `fast-json-stringify` produced. §13 has the whole of it.

### What each response carries

| Response                                                                       | `Cache-Control`        | `ETag` |
| ------------------------------------------------------------------------------ | ---------------------- | ------ |
| `/market-data/bars`, **absolute** window, entirely inside closed sessions      | `private, max-age=300` | yes    |
| `/market-data/bars`, **named** window (`?sessions=N`), whatever it resolved to | `private, no-cache`    | yes    |
| `/market-data/bars`, any window reaching into the current session              | `private, no-cache`    | yes    |
| `/securities`                                                                  | `private, no-cache`    | yes    |
| `GET /market-data`, `/health`, `/diagnostics/*`, every `ApiError`              | none                   | no     |

**A named window is a stable URL naming a moving target, and every HTTP cache
keys on the URL.** `?sessions=5` resolves through the calendar against _today's_
market date, so the same address means a different window tomorrow and a
different one again at every session close. A browser holding a `max-age` answer
for it serves yesterday's window under today's address, and the response looks
entirely well-formed — `coverage.requested` reports the resolved range honestly;
it is simply the wrong range. So immutability is a property of the **resolved**
range while the cache key is the **URL**, and only the absolute form's URL and
meaning are the same thing.

Asserted, in `routes/market-data.test.ts`: the same window asked both ways
returns **byte-identical bodies and the same `ETag`**, with `no-cache` on one and
`max-age=300` on the other. The difference between them is a promise about the
future, not a difference in what was served.

**Five minutes is one number used twice** — the browser's `max-age` and the
server-side cache's lifetime for the same answer — and it is a ceiling on how
long _anything in this system_ may serve a body a correction or a status flip
has invalidated. Two numbers would be two answers to one question.

**`private` on both directives.** Two headers on this API are computed per
requester — `access-control-allow-origin` and `x-request-id` — and neither is
safe for a shared proxy to hand to a second client. The deployed frontend's own
host caches nothing on this path, so the browser is the whole audience anyway.

### Where the cache sits, and what that keeps working

**In front of `serveSeries` and behind `findSecurity`**, keyed on the resolved
`(symbol, timeframe, range)`. The cheaper option — caching the whole response —
was refused because three things go with the universe lookup it would skip:

- **The 404 stops being about the security.** §6's sentence is that a 404 is
  about the _security_, never about the _data_; a symbol removed from the
  universe would go on being served from cache, and the 404 would become a
  statement about what was recently asked for.
- **`securityStatus` goes stale** — the second row of the table above.
- **The 503 stops happening.** A database that is down would be invisible behind
  a body we happen to still hold.

The price is one point read of `securities` per request. All three are asserted
against a cache deliberately shared across two servers, so the second server
answers a 404 and a 503 over a warm cache.

### What it saves — bytes

Method: `curl` against the built backend on loopback, `Content-Length` for the
200, `gzip -c | wc -c` for the compressed figure, and a second request carrying
`If-None-Match` for the conditional one.

> **Amended 2026-09-10 by Task 2.9.9: the `gzipped` column is a property of the
> payload, not of the wire.** Nothing on this path compresses — neither the
> application nor the deployed ingress (§12.5) — so that column says what these
> bodies _would_ cost compressed, and the `200 body` column is what a browser
> actually receives today. The method above already said as much; this note
> exists because §4 drew a conclusion from a figure of this kind.

> **Amended again 2026-09-10 by Task 2.9.10: the `gzipped` column is now the
> wire.** With `@fastify/compress` registered, `curl -H 'Accept-Encoding: gzip'`
> against the built backend downloads **20,072 B** for `/securities` and
> **7,549 B** for the single session — the same numbers this column already
> carried, because `zlib.gzipSync` at its default level is what the plugin runs.
> The **`200 body`** column is now what a client that asks for `identity`
> receives. The `Conditional` column is untouched: a `304` is 0 bytes either
> way, and it carries no `Content-Encoding` (§13).

| Window                                                   | 200 body        | gzipped   | Conditional  |
| -------------------------------------------------------- | --------------- | --------- | ------------ |
| `/securities` — 518 securities, coverage and last closes | **190,736 B**   | 20,072 B  | **304, 0 B** |
| `NVDA` `1m`, one closed session (390 bars)               | **44,701 B**    | 7,549 B   | **304, 0 B** |
| `NVDA` `1m`, 24 sessions (9,360 bars)                    | **1,060,490 B** | 171,389 B | **304, 0 B** |
| `NVDA` `1d`, 20 sessions                                 | 2,790 B         | 801 B     | **304, 0 B** |

Against §8's re-measured worst case — a year of minute bars at **11.08 MB** — a
conditional request that hits saves the whole of it. That is the figure the
first draft of this task was asked to weigh against the complexity, and the
answer is unambiguous.

**The 304 goes out with `Content-Length: 0`, which is checked rather than
accepted.** RFC 9110 §15.4.5 says a `304` carries no content, and a length
header on one is a claim about a representation that is not empty.
`reply.removeHeader("content-length")` inside the `onSend` hook **does nothing** —
produced against a running server rather than reasoned about: Fastify computes
the header from the payload after every `onSend` hook has run. Left as it is,
because it is what `@fastify/etag` emits and every client tested handles it.

### What it saves — work

Method: 15 requests each, median reported, `fetch` from Node 24 on loopback. A
**miss** is a distinct window every time, so each one is a real store read; a
**hit** is one window repeated.

| `NVDA` `1m`, 9,360 bars, 1.06 MB     | median      | range         |
| ------------------------------------ | ----------- | ------------- |
| Miss — store read, then serialise    | **31.3 ms** | 28.9–104.5 ms |
| Hit — cached, then serialise         | **11.6 ms** | 10.7–13.1 ms  |
| Hit + `If-None-Match` — 304, no body | **10.9 ms** | 9.7–11.5 ms   |

The store read alone is **11.1 ms** for those 9,360 rows, timed inside
PostgreSQL (`\timing`, warm local container) — so about two thirds of a miss is
the database and the rest is serialising a megabyte. **The validator saves the
wire and not the work**: the server still reads the cache, serialises the body
and hashes it before discarding it, which is why the 304 row is barely faster
than the hit row _on loopback_. On a real link the megabyte is the whole cost,
and it is exactly what the 304 removes.

`/securities` measures 12.4 ms for the 200 and 11.5 ms for the 304, for the same
reason: 190 kB costs nothing over loopback and is the entire saving over a
network.

> **Measured 2026-09-10 by Task 2.9.9, deployed: 1,153 ms for the 200 against
> 356 ms for the 304 — about 800 ms saved on every repeat page load**, against
> 1.1 ms saved locally (§12.8). The prediction above is confirmed, and the
> deployed body is **190,736 bytes, byte for byte the local figure**.

### What it saves — vendor requests, and §5's condition

**§5's condition does not fire. The metered request is bounded, and this section
says exactly in which dimension.**

Since Task 2.9.5 a window ending _now_ is a metered vendor request on a cache
miss — §5's own words, and the reason that section names this task as the
trigger for bringing the stitch decision back rather than narrowing it. What
bounds it is the live entry's **60-second lifetime**: the finest timeframe this
API serves is `1m`, so a second request inside the same minute cannot be
answered with a bar the first one could not have had.

The bound is therefore **one vendor request per (symbol, timeframe, resolved
window) per minute, per process**, and the dimension that matters is the one it
removes: the cost no longer scales with **how many people are looking**, which is
what §5 was worried about, and no longer scales with page loads.

**"Per process" is load-bearing and was understated when this section was first
written on 2026-09-10; corrected the same day.** The cache is an in-process
`Map`, so the deployed bound is `replicas × 1` per window per minute rather than
`1`. `HOSTING.md` records `minReplicas: 1` as a **required setting** and records
no maximum, because the Container App's scale rule is platform-only
configuration that exists in no file in this repository (`CLAUDE.md`, _What
`pnpm verify` does not cover_ §6). ~~So the deployed multiplier is a number nobody
here can read, which makes it Task 2.9.9's to take rather than this section's to
assert.~~ **Taken 2026-09-10 by Task 2.9.9: `maxReplicas` is `1`, `minReplicas`
is `1`, and there is no scale rule — so the multiplier is exactly 1 and the
deployed bound is one vendor request per resolved window per minute, full stop**
(§12.7). It is recorded in `HOSTING.md` too, because it exists in no file here
and is load-bearing for two claims rather than one. It does not change the shape of the result — the cost is bounded by
replicas and time rather than by traffic — and a shared cache is emphatically
**not** the fix, because that is a second database bought to save a request the
free plan does not charge for.

What it also still scales with is how many distinct windows exist — a client
enumerating windows can mint one request per minute each — and that is stated
rather than left to be discovered. It is not a new exposure: the same client can
already mint one request per page load today.

**Measured, and the method matters because the local store could not produce a
real one.** Counted through the shipping plugin, the shipping cache and the
shipping handler, with a provider stub that increments a counter:
**three identical requests for a live window → one `fetchBars` call.** Without
the cache the same test counts **three**, produced by disabling the cache read
and watching it go red.

Against the **real** Alpaca provider it could not be counted, and why is itself a
reading worth recording: the local store's `covered_end` is **2026-09-04T20:00Z**
and the market date at the time of measurement was 2026-09-09, so §5 rule 3's
session-gap bound declined every tail outright. Both requests logged
`tail: "stale-store"` and **zero** vendor requests were made with or without the
cache. A store that is days behind costs the vendor nothing; the bound above is
what governs a store that is current, which is the deployed one.

### What happens when the store is backfilled underneath a cached answer

**Every entry expires, including one the calendar calls immutable**, and that is
the whole answer. The nightly catch-up fills gaps in sessions that are already
closed, so an honest-and-partial answer can go stale without anything _in the
window_ changing — the calendar cannot see that, because it is a fact about our
store rather than about the market. The 300-second lifetime bounds it without
needing to know.

There is deliberately **no invalidation hook** for the backfill to call. A cache
a writer has to remember to clear is a cache that is wrong on the day somebody
forgets, and the same argument that rejected a long `max-age` rejects a
correctness mechanism that depends on a second process behaving.

### The negative cases, and the breaks that were made

Three assertions exist for things that fail silently, and each was made to fail
once before being put back:

| Assertion                                              | The break                                       | Result                        |
| ------------------------------------------------------ | ----------------------------------------------- | ----------------------------- |
| A live window is never marked reusable                 | Drop `isClosedWindow` from `seriesCacheControl` | red on `private, max-age=300` |
| A live window costs one vendor request, not three      | Make `cache.read` always miss                   | red, 3 calls                  |
| A closed window is read from the store once, not twice | The same break                                  | red, 2 reads                  |

A break that does not go red is equally evidence the break did not land, so all
three substitutions were verified rather than assumed.

### `/securities` is in scope, and only half of it

**Stated either way, because a later reader finding one route cached and the
other not will assume it was an oversight.** The validator is on `/securities`;
a freshness lifetime and the answer cache are not.

**Why the validator is in.** Task 2.9.7 put `lastCloses` there — the close of a
session that has closed, for 518 securities, which is precisely the immutable
thing this task's objective names. It is also the bigger payload of the two this
story serves (190,736 B against 44,701 B for a session of minute bars) and it is
fetched on every page load by `useSecurities`. Leaving it out would mean the
first question a reader asks — _is my price fresh?_ — has one answer on one route
and a different answer on the other, with two rules to keep in step.

**Why no `max-age`.** That response has no window, so there is nothing to
resolve and nothing the immutability predicate can be applied to. It carries the
same envelope trap from the other direction: **immutable in its closes and
mutable in its rows**, because `securities` carries `status`. A lifetime derived
from the calendar would be a promise about the closes covering the rows.

**Why no answer cache.** The cache exists to bound a metered vendor request and
there is no provider on that path. Its four reads are the universe, its
provenance, the ~1,036-row ledger and two daily bars per security — none of which
touch the minute table, all of which Task 2.9.7 measured.

### What Epic 13 gets for free

The rule is written in **sessions that have closed** rather than in "not today",
and `closedThrough(now)` takes the instant as an argument. In replay every window
is closed, so a replay clock substitutes for a wall clock and the whole of this
section applies unchanged. A rule phrased against the wall clock would have been
one replay had to special-case.

---

## 12. Measured against the store, locally and deployed — Task 2.9.9

**Every figure below was taken on 2026-09-10.** Local readings are through the
**built** backend (`node dist/index.js`, `MARKET_DATA_PROVIDER=alpaca`) on
loopback against the 48,027,772-row container store, whose `1m` coverage ends
`2026-09-04T20:00:00Z`. Deployed readings are `curl` and `fetch` from a laptop in
the United Kingdom against `marketpulse-backend` in `eastus`, whose `1m`
coverage ends `2026-09-08T20:00:00Z`. Method under each table; **re-take rather
than cite.**

**Every miss is a real read.** §11's trap is not hypothetical, so the technique
it prescribes is the one used throughout: **the window's start is shifted one
minute earlier per sample**, into pre-market where no bar exists, so every sample
is a distinct cache key and the bar count is constant. A run of identical URLs
would have measured one store read and fourteen cache hits.

### 12.1 The access patterns, local

`fetch` from Node 24 on loopback, n=15 per cell, median reported. `gzip` is
`zlib.gzipSync` at its default level over the served body — see §12.5 for why
that column is a **property of the payload and not of the wire**.

> **Amended 2026-09-10 by Task 2.9.10: the `gzip` column is the wire, and it is
> the same number.** Re-taken with `curl`'s `%{size_download}` against the built
> backend now that `@fastify/compress` is registered, and every figure
> reproduced to the byte — 20,072 for `/securities`, 7,549 for the session,
> 178,698 at the cap. **`Body` is now what an `identity` client receives**, and
> the three timing columns are re-taken below rather than in place, because
> whether the coding costs anything is the question this task exists to answer
> and a single column cannot say it.

| Access pattern                 | Status |  Bars | Body        |      gzip | Miss        | Hit         | 304         |
| ------------------------------ | ------ | ----: | ----------- | --------: | ----------- | ----------- | ----------- |
| `1m`, one session              | 200    |   390 | 44,701 B    |   7,549 B | **4.9 ms**  | **2.6 ms**  | **2.2 ms**  |
| `1m`, five sessions            | 200    | 1,950 | 221,603 B   |  36,656 B | **9.7 ms**  | **3.7 ms**  | **3.8 ms**  |
| `1m`, one month (24 sessions)  | 200    | 9,360 | 1,060,490 B | 171,389 B | **31.9 ms** | **11.6 ms** | **10.8 ms** |
| `1m`, 25 sessions — at the cap | 200    | 9,750 | 1,104,621 B | 178,698 B | —           | —           | —           |
| `1d`, the whole stored depth   | 200    |   671 | 77,098 B    |  16,790 B | **31.4 ms** | **25.9 ms** | **26.5 ms** |
| `1m`, one year — refused       | 400    |     — | 258 B       |         — | **9.7 ms**  | —           | —           |
| `1m`, six weeks — refused      | 400    |     — | 258 B       |         — | **2.4 ms**  | —           | —           |
| Unknown symbol                 | 404    |     — | 173 B       |         — | **2.6 ms**  | —           | —           |
| `/securities`                  | 200    |     — | 190,736 B   |  20,072 B | **12.5 ms** | **12.6 ms** | **11.5 ms** |

The p95 of the miss column is 19.0, 20.8, 42.5, 39.3 and 17.9 ms for the five
200s, over the same n=15. `/securities` has no answer cache (§11), so its "miss"
and "hit" are the same request measured twice and agree to 0.1 ms — which is the
control that says the cache is doing the work in the rows above it.

**One row does not belong to the pattern the others make**, and §12.4 is about it:
the `1d` depth is the _smallest_ 200 in the table and the _slowest_ hit.

#### Re-taken with the coding, 2026-09-10 (Task 2.9.10)

Same method, same machine, same store, n=15 per cell, median. Two arms per row:
`Accept-Encoding: identity` and `Accept-Encoding: gzip`, against **one** server
— so the difference between the arms is the coding and nothing else. Node's
`fetch` sends its own `Accept-Encoding` and decompresses transparently, so the
identity arm has to ask for identity **explicitly** or it is not one; that was
got wrong once and the first run silently measured gzip twice.

| Access pattern                 | Wire, identity | Wire, gzip | Ratio | Miss id → gzip | Hit id → gzip  | 304 id → gzip  |
| ------------------------------ | -------------: | ---------: | ----: | -------------- | -------------- | -------------- |
| `1m`, one session (390)        |       44,701 B |    7,549 B | 16.9% | 6.7 → 9.4 ms   | 3.1 → 6.1 ms   | 3.3 → 4.8 ms   |
| `1m`, five sessions (1,950)    |      221,603 B |   36,656 B | 16.5% | 10.1 → 12.8 ms | 4.0 → 7.3 ms   | 3.6 → 3.7 ms   |
| `1m`, one month (24 sessions)  |    1,060,490 B |  171,389 B | 16.2% | 31.7 → 49.4 ms | 12.0 → 27.8 ms | 11.6 → 11.6 ms |
| `1m`, 25 sessions — at the cap |    1,104,621 B |  178,698 B | 16.2% | 30.2 → 47.0 ms | 11.2 → 27.5 ms | 10.9 → 10.9 ms |
| `1d`, the whole stored depth   |       77,212 B |   16,813 B | 21.8% | 26.8 → 27.3 ms | 26.7 → 27.8 ms | 26.2 → 26.2 ms |
| `1m`, one year — refused       |          258 B |      258 B |  100% | 10.1 → 9.9 ms  | —              | —              |
| Unknown symbol — 404           |          173 B |      173 B |  100% | 1.9 → 1.9 ms   | —              | —              |
| `/securities`                  |      190,736 B |   20,072 B | 10.5% | 12.3 → 13.8 ms | 11.0 → 13.8 ms | 12.0 → 11.4 ms |

**Read the last two rows of the wire columns first: the refusal and the 404 are
unchanged.** They are 258 and 173 bytes, below the 1,024-byte threshold, so they
are never coded — no `Content-Encoding`, no `Vary`, no cost. That is the
threshold doing its job and it is the control for everything above it.

**The CPU cost is real, it is bounded, and the `hit` column is where to read
it** — the `miss` column has a store read in it and the `304` column has no
body to code. Isolated that way, the coding costs **+16.3 ms on the 1.10 MB
at-the-cap series**, which is the only row big enough to be read confidently:
the 44.7 kB and 190,736 B rows come out at +3.0 and +2.8 ms here and at +1.2 and
+1.0 ms on a separate n=21 run of the same three URLs, so **anything under about
five milliseconds on this machine is inside run-to-run variance and should be
re-taken rather than quoted**. What is bought is not ambiguous: **925,923,
1,084,549 and 170,664 bytes removed from the wire** on those three rows. §12.5
priced the deployed link at 116–415 kB/s; at the low end `/securities` alone is
about 1.5 seconds of transfer bought for a few milliseconds of server.

**The `304` column does not move, in any row, and that is a check rather than a
result.** A conditional request that hits serialises a body, hashes it and
discards it; there is nothing left to compress, so a coding that changed those
numbers would mean something was compressing an empty payload — which is
exactly the failure §13 produced deliberately at `threshold: 0`.

**The `1d` depth row does not move either**, for §12.4's reason and not for this
one: 20.6 ms of that row is the calendar walk, which no coding touches.

### 12.2 The three queries on the served read, separately

Round trip from Node against the repository handle, n=15, median. `EXPLAIN
(ANALYZE, BUFFERS)` beside it, warm, run in the container.

| Query                                    | Round trip   | In-engine   | Plan                                              |
| ---------------------------------------- | ------------ | ----------- | ------------------------------------------------- |
| `findSecurity('NVDA')` — the 404 lookup  | **1.00 ms**  | **0.22 ms** | Index Scan `securities_symbol_key`, 3 buffers     |
| `readCoverage('NVDA','1m')` — the ledger | **0.45 ms**  | **0.26 ms** | Nested Loop, two unique index scans, 6 buffers    |
| `readSeries` `1m`, one session (390)     | **2.25 ms**  | **0.14 ms** | Index Scan, 16 buffers                            |
| `readSeries` `1m`, five sessions (1,950) | **7.79 ms**  | —           | —                                                 |
| `readSeries` `1m`, one month (9,360)     | **20.75 ms** | **6.85 ms** | Bitmap Index Scan + quicksort, 209 buffers        |
| `readSeries` `1m`, at the cap (25 sess.) | **20.66 ms** | —           | —                                                 |
| `readSeries` `1d`, the whole depth (671) | **1.92 ms**  | —           | —                                                 |
| `readLastCloses('1d')` — `/securities`   | **3.98 ms**  | 17.1 ms †   | **one** statement, 518 index searches, 1,036 rows |
| `listSecurities()` — the universe        | **4.58 ms**  | —           | —                                                 |

**No query nobody meant to write.** Both point reads are index scans on three and
six buffers; neither is the sequential scan the task warned about. The bar query
is the plan `BARS.md` §8.6 recorded — a bitmap scan plus a sort for a bounded
window, not the "already sorted" the migration claims, which §8.6 already
corrected.

**The per-row cost is the client, not the server.** The month's query is 6.85 ms
in PostgreSQL and 20.75 ms by the time the rows are in JavaScript: ~14 ms of `pg`
protocol decode and Kysely mapping for 9,360 rows carrying the extra
`recorded_at` column. That is the cost of the column §10 added, and it is
invisible at 390 bars (0.14 ms of query) and worth ~1.5 ms per thousand bars at
the cap.

† **`readLastCloses`' in-engine figure is larger than its round trip, and that is
the instrument rather than the query.** `EXPLAIN ANALYZE` times every one of 518
lateral loops; the instrumentation is the difference. The round trip is the
honest number and the plan is what the reading was for.

**Criterion: `/securities`' close query is one statement, not 518 round trips.**
Confirmed on the plan — a single `Nested Loop` whose inner side reports
`Index Searches: 518`, in one statement, in one round trip. Deployed, the same
route answers a conditional request in **356 ms against a ~250 ms link RTT**, so
about **106 ms** of server work for all **four** of its reads. 518 sequential
round trips to a database across the container's own link could not fit in that.

### 12.3 The cap, re-validated against the endpoint

**10,000 stays**, and both halves of §4's argument were re-taken against the
served body rather than against an array.

**The parse budget is still not the binding constraint.** `JSON.parse` of the
real 25-session response — the largest one this API will emit — is **2.8 ms**,
best of five, against §28's 50 ms. §4's negative result reproduces on the wire
shape (envelope included) that §8's array method could not see.

**The boundary is exactly where §4 says.** 25 sessions is 9,750 bars and is
served; 26 sessions is 10,140 and is refused with the count named. The refusal
costs no scan.

**But §4's positive argument does not survive §12.5, and the cap survives for a
different reason.** §4 sets the line at "184 kB gzipped, ~150 ms on 10 Mbit/s".
Nothing on this path compresses, so the real figure is **1,104,621 bytes**, and
measured from the United Kingdom against `eastus` a body of that size takes
**1.3–2.7 s to transfer** after a **~0.8 s** connection. On the uncompressed
number the cap is if anything **generous**, not tight — which is the direction
that leaves the decision standing while falsifying its reasoning. **Re-argued:
10,000 is right because it is the largest window Story 2.12 has a use for
(a month is 24 sessions) and because the payload at that size is already a second
of transfer uncompressed.** The reversal trigger in §4 is unchanged and is now
also the trigger for compression, whichever fires first.

### 12.4 The cap check runs on every request, and it is not free

**§4 says an over-cap request "costs a calendar walk rather than a scan". True,
and the walk's cost was never measured. It is ~30 µs per session in the window,
on every request including a cache hit.**

`marketSessionsBetween(marketDateAt(start), marketDateAt(end))`, best of 200:

| Window                 | Sessions | Walk         | µs/session |
| ---------------------- | -------: | ------------ | ---------: |
| One session            |        1 | 0.046 ms     |       45.7 |
| Five sessions          |        5 | 0.165 ms     |       32.9 |
| One month              |       24 | 0.715 ms     |       29.8 |
| One year               |      251 | **7.47 ms**  |       29.7 |
| The whole stored depth |      672 | **20.62 ms** |       30.7 |
| The whole calendar     |    1,254 | **39.32 ms** |       31.4 |

It grows with the window's **session count**, exactly as the task predicted, and
not with the number of bars. The consequence the task did not predict is the
`1d` row of §12.1: **the whole stored daily depth is 671 bars and 1.92 ms of
database, and it takes 31.4 ms to serve, because 20.6 ms of it is counting
sessions to decide that 671 is under 10,000.** It is the dominant cost of that
request and it is paid again on every cache hit — which is why that row's hit
(25.9 ms) is barely cheaper than its miss.

**Where the time goes, so the fix has a target rather than a guess:**
`marketSessionOn` is **28.25 µs** on a trading day and **6.42 µs** on a weekend
day, so the cost is constructing each session's open and close instants through
the timezone conversion, not walking the days. The two point measurements are
what make that an attribution rather than an inference.

**Not fixed here, deliberately, and the condition is written as a condition.**
The repair is a memoised session table — the calendar is a checked-in file of
1,254 sessions and could be built once — and it is a change to
`packages/shared`'s hottest module with its own tests and its own argument.
**The trigger is the first screen whose default window is a daily series over
more than ~200 sessions**, which is Story 2.12's "1 year" and "max" controls if
it offers them. Below that the walk is under 6 ms and invisible; at the full
depth it is the request.

### 12.5 Nothing on this path compresses

**Measured both ways round.** `Accept-Encoding: gzip, deflate, br` against the
built backend on loopback returns **no `content-encoding` and no `vary`**, and
the same request against the deployed backend returns `content-length: 190736`
— the full body. So the application registers no compression plugin and the
Azure Container Apps ingress adds none.

That is **not** a defect in anything Task 2.9.8 measured: §11's method says
`gzip -c | wc -c`, which is honestly labelled as compressing the body after the
fact. It is a falsification of the **inference** §4 draws from such a figure, and
§4 now carries a dated amendment saying so.

What it costs, measured. `curl` from the United Kingdom to `eastus`, three
samples, new connection each time:

| Response          | Body        | `time_appconnect` | TTFB   | Total         | Effective    |
| ----------------- | ----------- | ----------------- | ------ | ------------- | ------------ |
| 404, no body      | 173 B       | 0.52 s            | 0.82 s | **0.82 s**    | —            |
| `1m`, one session | 44,693 B    | 0.52 s            | 0.85 s | **1.10 s**    | 40 kB/s      |
| `/securities`     | 190,736 B   | 0.51 s            | 0.88 s | **1.64 s**    | 116 kB/s     |
| `1m`, one month   | 1,016,540 B | 0.52 s            | 1.13 s | **2.4–3.8 s** | 265–415 kB/s |

The link's RTT is **~250 ms** (`time_connect`) and TLS doubles it to ~520 ms
before a byte of application data moves, so the small rows are almost entirely
connection. The large row is almost entirely transfer, and it is the one
compression would change — **1.0 MB against 164 kB is the difference between
~1.9 s and ~0.4 s of transfer at the same measured rate.**

**Recommended, not built here: register a response-compression plugin.** It is
the single largest improvement available to this API and it is one dependency —
but it interacts with §11's validator in a way that has to be got right (the
`ETag` must be computed over the same representation the client validates, so
plugin order is the whole of the work), and it is a change to shipped behaviour
rather than a measurement. ~~**The condition: the first screen that serves a
minute series over a link**, which is Story 2.12 the moment it is deployed.~~

> **The condition was met before it was written. Resolved 2026-09-10, the same
> day: this is Task 2.9.10 rather than a trigger.** The screen that serves a
> payload over a link is not Story 2.12's chart — it is `/securities`, which is
> **already deployed, already rendered and already 190,736 bytes** on every cold
> page load, measured at **1,153 ms** in §12.8. So it is a repair to something
> shipped rather than work done ahead of a need, which is the distinction
> `CLAUDE.md` draws when it says not to scaffold ahead of the current step.
> Story 2.9's scope has owed the choice from the start — _"the encoding
> matters. Measure it before choosing anything clever"_ — and this section is
> the measuring.

> **Built 2026-09-10 by Task 2.9.10, and this section's title is now false.**
> `@fastify/compress` is registered in `buildServer()` and every response over
> 1,024 bytes on this path is gzipped: `/securities` falls from **190,736 to
> 20,072 bytes**, the at-the-cap series from **1,104,621 to 178,698**, a single
> session from **44,701 to 7,549**. The two rows in the table above that are
> almost entirely connection stay almost entirely connection — a 173-byte 404
> is below the threshold and is not coded at all. **The heading is left
> standing rather than rewritten**, because it is what was true when it was
> measured; §13 is where the coding lives and §12.1 carries the re-taken
> figures.
>
> **One thing this did not have to change: the ingress.** §12.5's other finding
> was that Azure Container Apps adds no coding of its own, and it does not have
> to — the application's `Content-Encoding` reaches the client through it
> untouched. That is a reading rather than an assumption and it is taken in the
> deployed table below.

### 12.6 The stitch costs under 20 ms, and §5's condition still does not fire

**This could only be measured deployed**, and that is itself the finding §11
predicted: the local store's coverage ends 2026-09-04 and the session-gap bound
declines every tail outright, so a laptop cannot produce a stitch at all. The
deployed store's coverage ends `2026-09-08T20:00:00Z`, so a window reaching into
2026-09-09 is a genuine two-source answer.

Taken deployed, and it is the first multi-source response this product has ever
served to anybody:

| Reading                                  | Value                                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| `NVDA` `1m`, 09-08 13:30Z → 09-09 20:00Z | **780 bars, 88,862 B, `sources` length 2**                                                 |
| Source 1 — the store                     | `alpaca`/`sip`, `retrievedAt` **2026-09-09T12:46:01Z**, 390 bars                           |
| Source 2 — the tail                      | `alpaca`/`sip`, `retrievedAt` **the instant of the request**, 390 bars                     |
| `coverage.covered`                       | the whole requested window — the seam is invisible in the range and visible in the sources |

**One envelope and two sources, not two envelopes**, as Task 2.9.3 said it would
be: 88,862 B for 780 bars is 113.9 B/bar including the whole envelope, against
113.3 B/bar for a single-source body of the same shape.

**The added latency, isolated with a matched control.** Two windows of the same
390 bars, one served entirely from the store (09-08) and one served entirely from
the vendor tail (09-09), n=8 each, reporting `time_starttransfer − time_appconnect`
so the figure is server work plus exactly one RTT:

| Window                                    | Server think + 1 RTT |
| ----------------------------------------- | -------------------: |
| 390 bars, store only                      |           **351 ms** |
| 390 bars, all of it a fetched vendor tail |           **368 ms** |

**~17 ms**, and the ranges overlap. A second control at 780 bars — two stored
sessions against one stored plus one fetched — put the stitched answer at
**529 ms** median end to end against **608 ms** for the store-only equivalent,
which is to say the difference is under the noise of the link.

So: **the read-side join is affordable as chosen.** §5 named this task as the
trigger for bringing the decision back if it were not, and it is not brought
back. The vendor sits close enough to `eastus` that a session of minute bars
costs less than the calendar walk in §12.4 does at the same window size.

### 12.7 The deployed replica count, and §11's bound with its multiplier

**Read from the platform, which is the only place it exists:**

```
az containerapp show -n marketpulse-backend ... --query template.scale
  minReplicas: 1
  maxReplicas: 1
  rules:       null
```

**So the multiplier is exactly 1.** §11's bound — one vendor request per
`(symbol, timeframe, resolved window)` per minute **per process** — is, deployed
today, one vendor request per window per minute, full stop. `az containerapp
replica list` confirms **one** running replica of `marketpulse-backend--0000147`.

This is now also recorded in `HOSTING.md`, whose account of the Container App
previously named `minReplicas: 1` as a required setting and said nothing about a
maximum. **`maxReplicas: 1` is load-bearing for two separate claims** — §11's
vendor bound here, and `CLAUDE.md`'s note that the Epic 3 outbound market socket
is safe only at a minimum replica count of one — and it exists in no file in this
repository. It is precisely the class `CLAUDE.md`'s _What `pnpm verify` does not
cover_ §6 describes.

**The reversal trigger is a scale rule being added**, which is the moment both
claims need re-stating rather than the moment traffic grows. A shared cache
remains the wrong fix (§11).

### 12.8 The deployed readings, and what a single vantage can say

Same script as §12.1, n=10, from one laptop over one link. **These figures are
dominated by that link and are reported with the instrument that separates it
out**: the conditional request, which does the same server work and transfers no
body, is the floor.

| Access pattern                |  Bars | Body        | Miss         | Hit      | 304 (floor) |
| ----------------------------- | ----: | ----------- | ------------ | -------- | ----------- |
| `1m`, one session             |   390 | 44,693 B    | **599 ms**   | 810 ms   | **280 ms**  |
| `1m`, five sessions           | 1,560 | 177,463 B   | **1,217 ms** | 860 ms   | **290 ms**  |
| `1m`, one month               | 8,970 | 1,016,540 B | **2,505 ms** | 1,598 ms | **444 ms**  |
| `1d`, the whole stored depth  |   671 | 77,098 B    | **1,124 ms** | 1,029 ms | **460 ms**  |
| `1m`, one year — refused      |     — | 258 B       | **281 ms**   | —        | —           |
| Unknown symbol — 404          |     — | 173 B       | **280 ms**   | —        | —           |
| `/securities`                 |     — | 190,736 B   | **1,153 ms** | 1,151 ms | **356 ms**  |
| The stitch (780 bars, 2 srcs) |   780 | 88,862 B    | **930 ms**   | 786 ms   | **282 ms**  |

**Read the 404 row first: 280 ms for a response that does one point read and
returns 173 bytes.** That is the link, and every other row contains it. The
`hit` column is not reliably faster than the `miss` column at this distance,
which is not a finding about the cache — §12.1 measured the cache where it can
be seen — it is the measurement saying the server's contribution is inside the
link's variance for everything except the megabyte.

**`/securities` is where the validator pays for itself, and now it is measured
rather than predicted.** §11 said "190 kB costs nothing over loopback and is the
entire saving over a network". Deployed: **1,153 ms for the body against 356 ms
for the 304 — about 800 ms saved on every repeat page load**, against 1.1 ms
saved locally. The deployed body is **190,736 bytes, byte for byte the local
figure**, which is a second confirmation that the two universes agree.

> **Re-taken 2026-09-10 by Task 2.9.10, after the coding was deployed.** The
> table above is the pre-compression reading and is left standing; the one below
> is the same script, same vantage, same link, n=10, with **two arms** —
> `Accept-Encoding: identity` and `gzip` — so the difference between them is the
> coding and nothing else. **The identity arm is the control, and it reproduces
> the table above** (`/securities` 1,004 ms against 1,153; the month 2,606
> against 2,505), which is what says the gzip column is the coding rather than a
> better day.

| Access pattern               | Wire, gzip |    Miss id → gzip |   Hit id → gzip | 304 id → gzip |
| ---------------------------- | ---------: | ----------------: | --------------: | ------------: |
| `1m`, one session            |    7,353 B |     662 → **333** |   515 → **286** |     285 → 310 |
| `1m`, five sessions          |   29,072 B |     821 → **399** |   541 → **306** |     297 → 293 |
| `1m`, one month              |  154,480 B | 2,606 → **1,210** | 1,367 → **783** |     418 → 413 |
| `1d`, the whole stored depth |   16,437 B |     964 → **456** |   922 → **507** |     516 → 435 |
| `1m`, one year — refused     |      258 B |         317 → 331 |               — |             — |
| Unknown symbol — 404         |      173 B |         324 → 308 |               — |             — |
| `/securities`                |   19,902 B |   1,004 → **484** |   794 → **396** |     427 → 376 |

Method note: **the byte columns are single fixed windows read with `curl`'s
`%{size_download}`**, and the timing columns walk the window start one unit per
sample as §12's preamble requires — which for the `1d` row moves the body
between 76,757 and 77,212 B, the one place the two methods do not describe
byte-identical bodies.

**`/securities` is the row this task existed for: 1,153 ms before, 484 ms now,
against its own 376 ms conditional floor.** The prediction on record was that it
would fall from 1,153 towards 356; it did, and what is left above the floor is
about 100 ms of transferring 19,902 bytes. **The month falls from 2,606 to
1,210 ms**, which is the row §12.5 said was almost entirely transfer.

**The `304` column does not move, and that was the stated check.** A conditional
request transfers no body, so a coding cannot touch it; 285/297/418/516/427
identity against 310/293/413/435/376 gzip is one link's noise around a constant.
The two sub-1 kB rows do not move either, for the threshold's reason.

**One row is worth reading against §12.4 rather than against this section.** The
`1d` depth is the smallest 200 in the table and the slowest hit, and compressing
it changed that not at all — 922 → 507 ms on the miss but 507 ms still floors
well above the 404's 308, because 20.6 ms of it is the calendar walk and the
rest is the link.

**What this cannot say.** One machine over one link cannot tell its own network
from the environment, and nothing here is called an outage. What it can say is
that the _shape_ is right everywhere: refusals and 404s are the RTT, small
series are the RTT plus a connection, and the only row that behaves differently
is the megabyte — which is §12.5's subject.

### 12.9 The first request after ten idle seconds pays for a new database connection

`GET /market-data/bars?symbol=NVDA&timeframe=1d&sessions=5` against the deployed
backend, reporting `time_starttransfer − time_appconnect`:

| Sequence                          | Server think + 1 RTT                |
| --------------------------------- | ----------------------------------- |
| Six requests back to back         | **473**, 281, 281, 293, 277, 280 ms |
| After a 15-second pause, two more | **446**, 284 ms                     |

The first request of each burst costs **~165–190 ms more** than the ones behind
it, reproducibly. `database.ts` sets `POOL_IDLE_TIMEOUT_MS = 10_000`, and
deployed the connection it discards is one that must be re-established over TLS
**and re-authenticated by minting a fresh Microsoft Entra token** — the
per-connection credential function `DATA-LAYER.md` describes. `GET
/diagnostics/database` reports **170.39 ms** for its ping, which is the same
number seen from the other side.

**On a low-traffic deployment that is almost every real request.** It is not a
defect and it is not this story's to fix — a ten-second idle timeout against a
per-connection token is a defensible pair — but it is the largest single
component of server-side latency on this API and nothing had named it. **The
condition for revisiting: the first user-facing target this API is held to that
a 170 ms floor breaks.** The candidate repairs are a longer idle timeout, a
minimum pool size, or caching the Entra token across connections; all three
belong to `HOSTING.md`'s subject rather than to the market-data contract.

### 12.10 Against §28's targets, and which of them this path can be held to

**§28's "<250 ms p95, server-received event → application state" is not this
request's target and quoting it here would be the wrong instrument.** It measures
a market event arriving at the server and reaching the browser's state, excluding
provider latency; it is Epic 3's live stream, and this is a historical read
issued by a user.

The two §28 targets this path **can** be held to:

| Target                                         | This path                                                          |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| **No routine main-thread task >50 ms**         | ✅ The largest body this API can emit parses in **2.8 ms** (§12.3) |
| **Visible feedback <500 ms after user action** | ⚠️ Achievable, and **not** by making the request faster            |

The second is Story 2.12's to satisfy and this section is the input it needs. A
month of minute bars is **2.5 s** deployed from this vantage, of which ~0.5 s is
connection and ~1.9 s is an uncompressed megabyte. **No amount of server tuning
brings that under 500 ms**; what satisfies §28 is the chart rendering its frame,
axes and loading state immediately and filling in when the series lands — which
is what §36 requires anyway. The two levers that would move the number itself are
compression (§12.5) and a narrower default window, in that order.

### 12.11 `BARS.md` §8.6's cross-sectional control, re-taken

**Re-taken as the task required, and the finding it justifies is stronger rather
than weaker — but the number did not reproduce.**

`EXPLAIN (ANALYZE, BUFFERS)`, same store, `SELECT security_id, close, volume FROM
market_bars WHERE timeframe='1m' AND observed_at = '2026-09-04T15:00:00Z'`:

| Reading        |     2026-09-08 (§8.6) |            2026-09-10 cold |        2026-09-10 warm |
| -------------- | --------------------: | -------------------------: | ---------------------: |
| Plan           | Index Scan, skip scan |              **identical** |          **identical** |
| Index Searches |                   588 |                    **588** |                **588** |
| Rows           |                   493 |                    **493** |                **493** |
| Buffers        |                     — | hit 1,746 / **read 1,125** | hit **2,862** / read 0 |
| Execution      |           **28.2 ms** |               **408.7 ms** |            **1.93 ms** |

**The 28.2 ms sits between a cold and a warm reading of the same query, which is
what a part-warm buffer cache looks like** — §8.6 does not record whether it was
taken warm, and the two readings here bracket it. That is the more likely reading
than a regression, and it is stated as an inference rather than as a fact,
because only rebuilding the old state could tell them apart.

**The deferral stands and is re-argued, not merely re-stated.**
`0004_market_bars.sql` defers an `(observed_at)`-leading index and
`market-bars.database.test.ts` enforces the deferral by asserting the table has
exactly two indexes. §8.6's argument was that Postgres 18's skip scan already
answers this query at 28.2 ms. **Warm it answers in 1.93 ms**, so the argument is
better than it was. The cold figure is worse than §8.6's — 408.7 ms against a
local container — and it is the same finding §8.15 recorded deployed at 3,213 ms
cold and 4.2 ms warm: **the cross-sectional query is a disk problem, not an index
problem**, and a hypertable does not fix a disk problem either. The reversal
trigger is unchanged: **Epic 5 issuing this query in anger**, at which point the
plain index is the cheap experiment.

### 12.12 What moved, and what it falsified

| Finding                                                                     | What it falsified                        | Swept                                         |
| --------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------- |
| Nothing on the path compresses (§12.5)                                      | §4's "184 kB gzipped… is the line"       | §4, dated amendment; §11's columns relabelled |
| The cap check is ~30 µs/session and 20.6 ms at the full daily depth (§12.4) | §4's implied cost of the pre-query walk  | §4, dated amendment                           |
| `maxReplicas: 1` (§12.7)                                                    | §11's "a number nobody here can read"    | §11 and `HOSTING.md`                          |
| §8.6's 28.2 ms is 1.93 ms warm / 408.7 ms cold (§12.11)                     | `BARS.md` §8.6's timing, not its finding | `BARS.md` §8.6, dated amendment               |
| The stitch adds ≲20 ms (§12.6)                                              | nothing — §5's condition does not fire   | §5, a pointer                                 |

**Nothing here falsifies `PRODUCT_SPEC.md`, an ADR or `CLAUDE.md`.** The one
sentence that came close is `CLAUDE.md`'s note that the outbound market socket is
safe because of a minimum replica count of one; §12.7 confirms it and supplies
the maximum it did not have.

---

## 13. Compressing the wire — Task 2.9.10

**Decided: `@fastify/compress` is registered in `buildServer()`, gzip and
deflate only, over every response above 1,024 bytes; the entity tag is computed
before the coding and is therefore weak; and every response carrying a validator
carries `Vary: accept-encoding`.** `apps/backend/src/http-compression.ts` is
the whole of the registration and carries the arguments beside the numbers.

Story 2.9's scope has owed this choice from the start — _"a year of minute bars
is large enough that the encoding matters — measure it before choosing anything
clever"_ — and §12.5 is the measuring. What it found was that the encoding was
`identity`, everywhere, always.

### 13.1 The hook order, and both failures it can take

`http-cache.ts` installs an `onSend` hook whose **first guard is `typeof payload
!== "string"`**. A compressor is also an `onSend` hook, so there are two orders
and each has a failure in it. **Both were produced and seen red before an order
was chosen**, because a break that does not go red is equally evidence the break
did not land:

| Order                  | The failure                                                                                         | Produced                                                                                                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Compression first**  | The validator sees a `Buffer`, takes its early return, and **no response carries an `ETag` at all** | An instance-level `onSend` returning a gzipped `Buffer` ahead of the validator: **no `etag` on the 200, and the conditional request answered `200` with the whole body** |
| **Compression second** | The compressor is handed the validator's output, which for a `304` is the empty string              | At `threshold: 0` the shipped arrangement emits **a `304` carrying `content-encoding: gzip` and a 20-byte body** — gzip's framing of nothing                             |

**The first is the one to be afraid of, and it is silent.** Nothing 404s,
nothing 500s, and every one of Task 2.9.8's assertions goes on passing, because
they all run through `app.inject()` and **none of them negotiates an encoding**.
Every client would simply re-download a body it already held. That is why the
four assertions added in `http-cache.test.ts` ask for gzip and then ask for the
`304`: the substitution above turns three of them red.

**What the experiment actually found is that the first order is not reachable
through this plugin, which is the opposite of what the task expected.**
`@fastify/compress` adds no instance-level hook: it listens on `onRoute` and
attaches its `onSend` to each **route**, and Fastify runs route-level hooks
after instance-level ones. Registered at the root, registered before the
validator inside a plugin, and registered after it inside a plugin all produced
the identical tag over the identity bytes. The ordering argument is written down
anyway, in the module and here, because the alternative is that the next reader
has to re-derive that a line they could move is safe to move.

The plugin is registered in `buildServer()` beside CORS and the error contract,
because like both of those it is a property of the application rather than of
any route. It must stay **above** the route registrations, for a reason that is
not the usual one: an `onRoute` listener only hears the routes registered after
it.

### 13.2 What the `ETag` validates, established by observation

RFC 9110 §8.8.1 makes a content-coding a **different representation**, so a
strong validator covering both the gzipped and the identity bytes is, read
strictly, wrong. There are three honest repairs and **which one is happening was
found by asking a running server rather than by reading a README**:

| Repair                                           | Happening? | How it was established                                                                  |
| ------------------------------------------------ | ---------- | --------------------------------------------------------------------------------------- |
| Hash before the coding, mark the validator weak  | **Yes**    | Chosen. `strongETag` is now `weakETag` and emits `W/"…"`                                |
| Let the compressor **suffix** the tag per coding | No         | The same request with and without `Accept-Encoding: gzip` returns the **identical** tag |
| Hash **after** the coding and emit `Vary`        | No         | Would need the validator to run last, which §13.1 shows it structurally cannot          |

A weak validator is exactly the claim that is true: the two codings are
semantically equivalent, and the tag identifies the pair rather than either.
`If-None-Match` uses the weak comparison function regardless, so the `304` is
unaffected — `matchesETag` already stripped `W/`, and did before this changed.

**The property `http-cache.ts`'s header argues for survives unchanged.** The
hash is still taken over the string `fast-json-stringify` produced, after every
undeclared field has been stripped; the coding happens strictly downstream of it
and cannot change what two responses differing only in a stripped field hash to.
That paragraph is amended rather than rewritten, and only where it claimed the
bytes reach the socket untransformed.

### 13.3 `Vary: accept-encoding`, and whether `private` already covers it

The plugin sets `Vary` **only on a response it actually compressed** — verified:
an identity `200` and a `304` came back with none. Those are the two a cache is
most likely to store and re-serve, so the header is set in the validator
instead, on every response that carries a tag. The plugin de-duplicates against
an existing value, so it adds nothing on top rather than emitting the token
twice.

**Whether it is load-bearing, said rather than assumed: it is not.** §11's
argument for `private` is that two of this API's headers are computed per
requester, so no shared cache should hold these bodies at all — and if that
holds, the only cache is the browser's, which keys the coding it asked for. So
`Vary` here is belt-and-braces. It is set anyway because _"we said `private`, so
`Vary` cannot matter"_ is a claim about every intermediary between this server
and a browser, and §12.5 is the section that exists because an assumption of
exactly that shape turned out to be wrong.

### 13.4 The two numbers, both measured rather than defaulted

**The threshold is 1,024 bytes**, which is also the plugin's default and is
restated explicitly for the reason every option in `tsconfig.base.json` is: an
upgrade must not be able to quietly change what goes on the wire. It is one of
the two guards keeping `Content-Encoding` off a `304`, the other being that a
`304`'s payload is the empty string. Every response this API serves below it is
a refusal, a 404 or `GET /market-data` — 173 to 258 bytes, where §12.8 says the
round trip is the entire cost.

**The synchronous path is disabled** (`syncThreshold: 0`), so every coded body
goes through a stream and onto libuv's threadpool. Two reasons, both
measurements:

- The plugin's default is derived from `availableParallelism()`, so the same
  code compresses synchronously on a small host and through a stream on a large
  one — 4,096 bytes on the laptop that took these figures. **A behaviour that
  differs by host is a figure that cannot be re-taken.**
- Serially the two paths cost the same: +16.2 ms on the 1.10 MB series either
  way, because the coding is the coding. **Under load they are not the same.**
  Four concurrent at-the-cap requests, with a `/health` probe running beside
  them, on loopback through the built server:

  | Path              | 32 × 1.10 MB | `/health` p95 | `/health` max | Probes answered |
  | ----------------- | -----------: | ------------: | ------------: | --------------: |
  | Synchronous       |       798 ms |   **92.7 ms** |       93.8 ms |              42 |
  | Streamed (`0`) ✅ |   **487 ms** |   **29.7 ms** |       40.6 ms |         **143** |

  On a **single replica** — `maxReplicas: 1`, measured in §12.7 — the event loop
  is the whole server, and the platform's liveness probe is one of the things
  that queues behind a synchronous coding.

**The price, stated because it is a real one:** a compressed response carries no
`Content-Length` and goes out `Transfer-Encoding: chunked`, so a client cannot
show determinate progress and §12.5's method of reading a size off that header
does not work on one. `curl`'s `%{size_download}` does, and it is what every
re-taken figure above uses.

**`br` is declined.** Brotli compresses this JSON a little better and costs
materially more CPU on the request path, and the deployed replica is 0.25 vCPU.
Where the saving is entirely transfer and the budget is entirely CPU, the cheap
coding is the right one. **Reversal trigger, as a condition:** the first
measurement showing the server rather than the link is the constraint on this
path.

### 13.5 The frontend needed no change, and that was confirmed

`api-client.ts` uses `fetch`, browsers negotiate and decompress transparently,
and `useSecurities` sees the same JSON. Not assumed: **`pnpm e2e` passes against
a locally started pair, 30 specs including the three that render the tracked
universe from the real pair and the three axe runs over it.** Task 2.9.7 put a
rendered page on this path, which is what makes that run the check rather than a
formality.

### 13.6 The deployed gate — taken 2026-09-10, all four pass

**Taken against the deployed backend after the merge that carried this change,
and treated as a gate rather than a reading.** The Azure Container Apps ingress
is configured by no file in this repository, and one that stripped, re-encoded
or buffered `Content-Encoding` would make the whole of this section inert with
every test green.

| #   | Reading                                           | Result                                                                                                         |
| --- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | `/securities`, `Accept-Encoding: gzip`            | `200`, **`content-encoding: gzip`**, `vary: accept-encoding`, `etag: W/"…"`, `private, no-cache`, **19,902 B** |
| 2   | `/securities`, `Accept-Encoding: identity`        | `200`, no coding, **`content-length: 190736`**, the same weak `ETag` — the identity body unchanged             |
| 3   | The same, conditional, negotiating gzip           | **`304`**, `0 B`, carrying `cache-control` and `etag`, and **no `content-encoding`**                           |
| 4   | `/market-data/bars`, absolute closed window, gzip | **`private, max-age=300`**, an `etag`, `content-encoding: gzip`, **7,473 B**                                   |

§11's four header readings hold with compression in front of them, and nothing
here falsifies §11 or §12.5. §12.8 carries the re-taken timings.

#### One discrepancy, chased rather than filed

**The deployed coding produced 7,473 bytes where the local server produced 7,549
for a body that is byte-identical** — the gzip decompresses to exactly the 44,701
identity bytes. That is not any `gzipSync` level of those bytes on the machine
that took the local figure (level 6 gives 7,549, level 9 gives 7,218), and it is
precisely the shape of _the ingress re-encoded it_. So it was tested rather than
explained away:

| `Accept-Encoding` | Deployed answer                                        |
| ----------------- | ------------------------------------------------------ |
| `deflate`         | **`content-encoding: deflate`**, 7,461 B               |
| `br`              | **no coding at all — the full 44,701 B identity body** |
| `br, gzip`        | `gzip` — this application's allowlist choosing         |
| `zstd`            | no coding                                              |

**`deflate` is offered by nothing in this stack but `http-compression.ts`, and
`br` alone comes back uncompressed** — an ingress compressing on its own behalf
would have served brotli there, since every modern proxy prefers it. So §12.5's
finding survives with the application's coding in front of it: **the ingress adds
none, and passes ours through untouched.**

The 76 bytes are our own zlib on a different platform — a linux container against
darwin/arm64, whose Node reports zlib 1.2.12. **Which is a rule worth stating on
its own: a compressed size is platform-dependent, so it is re-taken per
environment rather than carried across one.** Every _identity_ figure is
byte-identical between the two (44,693 / 177,463 / 190,736), which is the control
that says the stores agree and only the encoder differs.
