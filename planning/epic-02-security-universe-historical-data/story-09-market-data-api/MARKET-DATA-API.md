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
2.9.10's sweep list.

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
- **Response times against the real row count.** Task 2.9.9. §3 and §4's timings
  are local and single-request; that task takes them properly and deployed.
- **The ADR.** Task 2.9.10.

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
`pnpm verify` does not cover_ §6). So the deployed multiplier is a number nobody
here can read, which makes it Task 2.9.9's to take rather than this section's to
assert. It does not change the shape of the result — the cost is bounded by
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
