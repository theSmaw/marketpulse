# Alpaca — what the free plan actually is

**Every figure here was measured against a live account on 2026-09-07**, with the request
that produced it recorded beside it. Nothing in this document is cited from a vendor page,
and where a measurement contradicts the documentation **the measurement wins and the
contradiction is the finding**.

This is Story 2.7's one document, in the shape `HOSTING.md`, `DATA-LAYER.md`, `UNIVERSE.md`,
`CALENDAR.md` and `PROVIDER.md` set: one document per story subject, pointed at from
`CLAUDE.md` rather than copied into it.

**Written for three later readers.** Task 2.7.7 picks retry and backoff numbers out of §6;
Story 2.8 sizes a backfill against §3, §5 and §6; Epic 3 reads §1 before opening a socket.

> **A plan's limits are a vendor's decision and can change without telling us.** That is the
> whole reason this document exists rather than a citation. Every heading carries the date
> its figures were taken. **Re-measure rather than cite** — the harness that produced these
> is described in §11 and is cheap to rebuild.

---

## 0. The headline, for someone who reads one section

| Question                     | Documented                                     | **Measured 2026-09-07**                               |
| ---------------------------- | ---------------------------------------------- | ----------------------------------------------------- |
| WebSocket cap on minute bars | "30 symbols" / "no limit" (two pages disagree) | **No practical limit — 5,000 accepted**               |
| WebSocket cap on trades      | 30 channels                                    | **30. Refused at 60 with `code=405`**                 |
| Historical feed              | IEX                                            | **SIP (consolidated tape), delayed 15 min**           |
| Live stream feed             | IEX                                            | **IEX. SIP refused, `409 insufficient subscription`** |
| Request rate                 | 200/min                                        | **201 exactly, then `429`**                           |
| Multi-symbol cost            | unstated                                       | **1 per REQUEST, not per symbol**                     |
| History depth                | "since 2016"                                   | **2016 on SIP; ~2022 on IEX**                         |
| `end` parameter              | unstated                                       | **INCLUSIVE. Ours is half-open.**                     |
| Bar timestamp `t`            | unstated                                       | **START of the interval**                             |

**Three of these change a decision somebody has already taken.** §1 unblocks the universe
sizing; §2 puts a question to a person that no open decision in this story covers; §4
corrects a mapping trap that would have duplicated a bar at every seam of Story 2.8's
backfill.

---

## 1. The 30-channel cap — ANSWERED. Minute bars are exempt (2026-09-07)

**This is the measurement `UNIVERSE.md` §10 parked the universe sizing on**, and it was
taken first, before anything else in the story.

### The measurement

One connection to `wss://stream.data.alpaca.markets/v2/iex`, authenticated, then two
subscribe messages. **Sixty symbols each — comfortably over any 30-channel cap.**

```
--> subscribe { bars:   [60 symbols] }
<-- T=subscription   bars accepted: 60 of 60

--> subscribe { trades: [60 symbols] }        (the control)
<-- T=error          trades accepted: 0 of 60   code=405  msg=symbol limit exceeded
```

**The trades subscription is the control and it fired.** That matters more than the bars
result: a server that silently drops the thirty-first subscription looks identical to one
that accepted it, so the acknowledgement's **accepted list was counted** rather than checked
for the absence of an error. Trades being refused at 60 while bars are accepted at 60 proves
the instrument can see a cap, so the exemption is real rather than an artefact.

### Escalated, because "more than 30" does not size a universe

`UNIVERSE.md` §10 proposes ~500 with ~1,500 as the architectural target, and
`PRODUCT_SPEC.md` §27 names 500 nodes as the **initial** visualisation target. One fresh
connection per size — the free plan allows one concurrent connection — against a pool of
**12,881 active tradable US equities** read from the assets endpoint:

|                Symbols requested |  Accepted | Ack latency |
| -------------------------------: | --------: | ----------: |
|           101 (today's universe) |   **101** |      358 ms |
|             500 (§10's proposal) |   **500** |      308 ms |
|             1,500 (§10's target) | **1,500** |      305 ms |
| 5,000 (§27's _synthetic_ target) | **5,000** |      867 ms |

### The verdict, and what it does to the parked decision

**Alpaca's streaming guide is right and the pricing page is wrong.** The "Limited to 30
symbols" line applies to trades and quotes; minute-bar channels have no limit this product
can reach.

So:

- **Epic 3 has no blocker.** The 101-security universe is nowhere near a cap, and neither
  is 1,500. The $99/month Algo Trader Plus exit is not needed for subscription capacity.
- **`UNIVERSE.md` §10's trigger has fired in the "bars exempt" direction.** The sizing
  reopens with ~500 proposed and ~1,500 as the architectural target.
- **The sizing is deliberately NOT re-taken here.** §10 is explicit that §5's metadata source
  must be settled before a number is picked, because sector and industry cannot be
  hand-curated for a thousand securities. That is Story 2.8's re-curation. **This task
  records that the trigger fired and hands it on.**
- **§10's taxonomy coarsening is unaffected and should not wait**, exactly as §10 says.

**And the binding constraint on universe size has moved** — see §2, which is a bigger change
to §10's argument than the cap answer is.

---

## 2. The feed is NOT IEX for historical bars, and this needs a person (2026-09-07)

**The most consequential finding in this task, and no open decision in this story covers it.**

### What was measured

The harness initially forced `feed=iex` and found history reaching back only to ~2022. Removing
the parameter reached 2016. That prompted a direct comparison on one real session
(2026-09-03, regular hours, 390 minutes expected):

| Symbol |    `feed` unset |  `feed=iex` |      `feed=sip` |
| ------ | --------------: | ----------: | --------------: |
| NVDA   |      390 (100%) |  390 (100%) |      390 (100%) |
| CCI    | **384 (98.5%)** | 209 (53.6%) | **384 (98.5%)** |
| SRE    | **388 (99.5%)** | 264 (67.7%) | **388 (99.5%)** |

**The default feed is SIP, and SIP is served on the free plan for historical bars.** The
restriction is on _recency_, not on the tape: a SIP request for the last six hours is

```
403  {"message": "subscription does not permit querying recent SIP data"}
```

### The plan is ASYMMETRIC, and that is the thing to carry

|                                          | Feed                             | Evidence                                                    |
| ---------------------------------------- | -------------------------------- | ----------------------------------------------------------- |
| **Historical bars** (older than ~15 min) | **SIP** — full consolidated tape | Default; `feed=sip` accepted                                |
| **Live stream**                          | **IEX only**                     | `wss://.../v2/sip` refused, `409 insufficient subscription` |

### Why this is consequential rather than a curiosity

1. **`PRODUCT_SPEC.md` §7.1 and invariant 6 require the UI to label the feed** and not imply
   full US-market coverage. **`Market feed: IEX` is wrong for stored historical bars.**
   Task 2.7.4 is about to put that word on the deployed page.
2. **`UNIVERSE.md` §10 caps the useful universe on IEX's ~3.8% volume share**, arguing thin
   names gain gaps and pollute breadth. **That argument does not apply to historical data.**
   Measured over the same thin names, mean coverage is **82.8% on IEX against 99.7% on the
   default feed** (§5). The quality ceiling is real for **live** data and largely absent for
   **stored** data.
3. **The architecture already accommodates it, which is a genuine validation.**
   `PROVIDER.md` §2 models provenance **per series** naming a **list** of sources, and §2.4
   makes a **feed** disagreement truthful and reportable while only an **adjustment**
   disagreement is refused. A series stitched from stored SIP bars and live IEX bars is
   exactly the case that design anticipated.

### What is owed, and by whom

**This task does not settle it** — it is a product-truth question about what a user is told,
and this story's five open decisions do not cover it. Three things need deciding:

- Does `MarketFeed`'s vocabulary gain `sip` beside `iex`? (`PROVIDER.md` §4.2 ships one
  member.)
- What does the chrome say when stored bars are SIP and the live stream is IEX?
- Does `UNIVERSE.md` §10's quality ceiling get amended to apply to live data only?

**Task 2.7.4 is the deadline**, because it is the task that puts a feed name on a public
page, and a label that is wrong is worse than a label that is absent.

---

## 3. History depth — and the documented figure is not this plan's (2026-09-07)

`AAPL`, March of each year, `1Day` and `1Min`:

| Year     | `1Day` |  `1Min` |
| -------- | -----: | ------: |
| 2015     |      0 |       0 |
| 2016     |      0 |       0 |
| 2018     |      0 |       0 |
| 2020     |      0 |       0 |
| **2022** | **20** | **100** |
| 2024     |     20 |     100 |
| 2026     |     20 |     100 |

**Those figures were taken with `feed=iex`.** With the feed parameter unset or `sip`,
**2016-03 returns real data** (19 daily bars, verified with an actual close of 100.53 on
2016-03-01). So the "since 2016" figure is a property of the **tape**, not the plan:

- **SIP history reaches at least 2016** — the documented figure, confirmed.
- **IEX history reaches ~2022**, which is when Alpaca's IEX collection begins.

### The dangerous case did not happen, and that is the finding

A range before the floor returns **`200` with an empty `bars` object** — not an error, and
**not a silently clipped answer**. That is the safe shape, and it is worth stating plainly
because the clipped case is the one Story 2.8's backfill could not have detected: a partial
answer wearing the shape of a complete one.

Per `PROVIDER.md` §8.2 an empty answer is a **success**, so a too-deep request needs no error
member.

---

## 4. The `end` parameter is INCLUSIVE, and ours is half-open (2026-09-07)

**A mapping trap that would have duplicated a bar at every seam of Story 2.8's backfill.**

It was found by accident: the first reconciliation run reported **391** bars for a session the
calendar says has 390, and 391 is _more_ than the session's minutes, which no amount of missing
data can explain.

`NVDA`, 2026-08-31, session `13:30:00Z`–`20:00:00Z`:

| Requested range                        |    Bars | First     | Last          |
| -------------------------------------- | ------: | --------- | ------------- |
| `start=13:30`, `end=20:00` (the close) | **391** | 13:30:00Z | **20:00:00Z** |
| `start=13:30`, `end=19:59`             | **390** | 13:30:00Z | 19:59:00Z     |
| `start=13:30`, `end=19:58`             |     389 | 13:30:00Z | 19:58:00Z     |

**Alpaca's `end` is inclusive.** `PROVIDER.md` §9.3 makes our `TimeRange` **half-open**
`[start, end)` precisely so adjacent windows tile without a duplicated bar at the seam.

So a mapping that passes `TimeRange.end` straight through as `end` fetches **one extra bar** —
and since `t` marks the **start** of its interval (§7), the bar stamped at the close covers
16:00–16:01 ET and is **outside the regular session** `CALENDAR.md` §2 scopes V1 to.

**Task 2.7.3's mapping must pass `end - 1 minute`**, or filter the boundary bar after the fact.

---

## 5. What a real IEX/SIP session actually contains — `PROVIDER.md` §6.4's three numbers

These are the assumptions Story 2.6's generated corpus makes and **structurally cannot check**,
because that corpus never touches a vendor. Measured against the **shipped** calendar
(`lastMarketSessions` from `packages/shared`), because `market-session.ts`'s `minuteBars` is
the number under test.

### 5.1 Does a regular session yield 390 bars for a liquid name? **Yes, exactly.**

`NVDA`, five ordinary sessions, default feed, `[open, close)`:

| Session    | Expected |  Actual | Coverage |
| ---------- | -------: | ------: | -------: |
| 2026-08-28 |      390 | **390** |   100.0% |
| 2026-08-31 |      390 | **390** |   100.0% |
| 2026-09-01 |      390 | **390** |   100.0% |
| 2026-09-02 |      390 | **390** |   100.0% |
| 2026-09-03 |      390 | **390** |   100.0% |

**`CALENDAR.md` needs no amendment on the liquid case**, and `minuteBars` **is** a bar count
for a liquid name.

> **A correction worth recording, because the automated verdict got it wrong.** The harness's
> first reading declared "NOT 390, so `minuteBars` is minutes and not bars" — from the 391 in
> §4. It was a boundary artefact of the _request_, not a property of the feed, and writing it
> down unchecked would have put a false amendment into `CALENDAR.md`. **A verdict computed by
> a script is not a measurement either.**

### 5.2 How often does a thin name have no bar? **Rarely — on SIP.**

Six of the thinnest equities in the tracked universe, three sessions each:

| Feed          | Coverage range |      Mean | Longest single gap |
| ------------- | -------------- | --------: | -----------------: |
| `iex`         | 43.1% – 99.7%  | **82.8%** |         **15 min** |
| default (SIP) | 98.5% – 100%   | **99.7%** |          **2 min** |

The worst case on IEX was `CCI` at **43.1%** — a security with a bar for fewer than half the
minutes in the session. On the default feed the same name is **98.5%**.

**Story 2.8's acceptance criterion 4 rests on this**, and the answer depends entirely on §2's
feed question: an absent bar is **ordinary** on IEX and **notable** on SIP. `UNIVERSE.md`
§10's breadth-pollution warning is a live concern for the IEX stream and close to a non-issue
for stored SIP bars.

### 5.3 Which end of the interval does `t` mark? **The START.**

`SPY`, 2026-09-03, session open `13:30:00Z`:

- **First bar `t` = `2026-09-03T13:30:00Z`** — the session open exactly.
- If `t` marked the end, the first bar would be `13:31:00Z`.

**`Bar.startsAt` maps directly from `t` with no shift.** `PROVIDER.md` §9.2 names this as the
trap the field's name exists to catch, and the convention turns out to be the convenient one.

A daily bar on the same date is stamped `2026-09-03T04:00:00Z` — midnight ET, not the session
open. Worth knowing before anyone maps a daily bar's `t` to a session boundary.

---

## 6. Rate limiting — 201, then `429` with NO `Retry-After` (2026-09-07)

### The limit is real and the documented figure is right

**260 sequential requests never hit it**, because at ~280 ms each they took 73 s and spanned
more than one window. Concurrency is what forces the issue:

|                           Burst | Succeeded | `429` |
| ------------------------------: | --------: | ----: |
|   320 concurrent, 1 symbol each |   **201** |   119 |
| 320 concurrent, 50 symbols each |   **203** |   117 |

**Documented 200/min, measured 201.**

### The multi-symbol answer, and it reshapes Story 2.8

**The limit is per REQUEST, not per symbol.** 203 requests of 50 symbols each succeeded in one
window — the same ceiling as 201 single-symbol requests — i.e. **10,150 symbol-fetches per
minute**.

**Story 2.8 should batch aggressively.** The whole 101-security universe is **one request** per
bar-window, so a backfill is bounded by **pagination and history depth** rather than by the
rate limit. That is the single most consequential number for that story's design, and it is
the one this task was most likely to get wrong by assuming.

### What the `429` carries — and it is the absence that matters

```
429  {"message": "too many requests."}
```

**No `Retry-After` header. No rate-limit headers at all on the 429.**

**Task 2.7.7's backoff cannot read a server-supplied delay from this vendor and must use its
own schedule.** `PROVIDER.md` §8.6's optional `retryAfterMs` hint will therefore usually be
**absent** — which is exactly why §8.6 made it a **branch rather than an assignment**, and why
it is a **floor rather than an instruction**. Both decisions are vindicated by measurement.

The `x-ratelimit-remaining` header does appear on **successful** responses, hovering near 199,
but it did not decrement usefully under sequential load and is not a reliable budget.

~~**Open:** whether the limit is per key or per endpoint was **not** established.~~
**ANSWERED 2026-09-07 by Task 2.7.7 — see §6b, and the answer is BOTH, on a line nobody had
drawn.**

---

## 6b. The limiter is a refilling BUCKET, and the budget is per API rather than per key or per endpoint (2026-09-07, Task 2.7.7)

Three things measured in one sitting, each of which changes a decision. Re-take them rather
than citing this section: it is a live third party's behaviour on one day.

### It is a token bucket refilling at ~3.3/s, NOT a punished 60-second window

**This is the finding that reshapes the backoff**, and every previous reading here is
consistent with it without establishing it, because every previous reading stopped at the
`429`.

The burst reproduced exactly — **320 concurrent gave 201 ok / 119 refused**, a fourth reading
against §6's 201, 203 and §9b's 207. What is new is what happens _next_: the very next
request after the burst answered **`200` with `x-ratelimit-remaining: 0`**, and a poll a
second later succeeded on its **first** attempt.

So the bucket was drained and immediately re-measured under continuous load:

| Over 10.2 s of continuous asking | Allowed | Refused |       Rate |
| -------------------------------: | ------: | ------: | ---------: |
|             measured, post-burst |  **33** |       9 | **3.23/s** |

A 200/min bucket predicts **3.33/s**; a fixed 60-second window predicts approximately **zero**.
The measurement is decisive.

**Two consequences.** A backoff only has to outlast a **token**, ~310 ms, rather than a
window — which is why `RETRY_BASE_DELAY_MS` is 300 and not seconds. And **one `429` means one
request refused, not a punished period**, so the vendor does not "stay angry": there is nothing
to wait out beyond the refill.

### Per key across the DATA API; the TRADING API is a separate budget

Driven immediately after a drained burst, on the same key, inside the same window:

| Endpoint                                         |    Status | `x-ratelimit-remaining` |
| ------------------------------------------------ | --------: | ----------------------: |
| `data` `/v2/stocks/bars` (the drained one)       |     `200` |                   **0** |
| `data` `/v2/stocks/snapshots` (a different path) | **`429`** |                    none |
| `paper-api` `/v2/assets/NVDA`                    | **`200`** |                 **199** |

**So the budget is per API and not per path.** A second _data_ endpoint competes for the same
tokens; the trading API has a budget of its own, sitting untouched at 199 while the data
bucket was empty.

**This is directly consequential for Task 2.7.8**, whose assets lookup lives on the trading
API: **it does not compete with bar fetching at all**, which removes the strongest argument
against adopting it and is worth knowing before that task designs around a shared budget it
does not have.

### The wrapper at the limit, and what retries cost — criterion 4

The shipped `withRetry` composed around the shipped Alpaca provider, 320 concurrent calls,
counting every HTTP request actually spent:

| Burst of 320                |    `ok` | `rate-limited` | HTTP requests |   Wall |
| --------------------------- | ------: | -------------: | ------------: | -----: |
| bare provider (the control) |      91 |            229 |       **320** |  1.0 s |
| through the wrapper, 3 s    | **206** |            114 |       **606** |  3.0 s |
| through the wrapper, 20 s   | **263** |             57 |     **1,473** | 19.9 s |

**Read it three ways.**

1. **It works.** Spare deadline is converted into answers — 91 → 206 → 263 successful fetches
   out of the same 320 calls.
2. **Retries count against the limit**, which the request counts settle rather than argue: the
   wrapper spent 1.9× and then 4.6× the requests. Nothing about a retry is free to the bucket.
3. **The return diminishes and the cost does not.** The first 286 extra requests bought 115
   extra answers (**2.5 each**); the next 867 bought 57 more (**15 each**). At the 20-second
   deadline the wrapper sustained **73 requests a second against a 3.3/s refill — 22× the
   limit** — and still left 57 calls refused.

**That third row is the strongest argument in this repository for `PROVIDER.md` §8.8's line
that pacing is Story 2.8's and not this wrapper's.** A hundred concurrent retriers do not
recover from a rate limit, they compete with each other for the same refill and pay for the
privilege. What fixes it is asking less often, which no per-request wrapper can do — and which
Story 2.8 gets cheaply, because the limit is **per request rather than per symbol** (§6), so
the whole universe is one request per window.

---

## 7. Pagination (2026-09-07)

| `limit` | Result                                 |
| ------: | -------------------------------------- |
|   1,000 | 1,000 bars, `next_page_token` present  |
|  10,000 | 10,000 bars, `next_page_token` present |
|  10,001 | **`400`**                              |
|  25,000 | **`400`**                              |

**The documented ceiling of 10,000 is exact**, and exceeding it is a clean `400` rather than a
silent clamp.

`next_page_token` is an opaque base64 string, e.g. `U1BZfE18MTc4MDUwNDY4MDAwMDAwMDAwMA==`.

**On the last page the field is PRESENT and `null`** — walked to exhaustion over five pages. So
a client testing `=== null` is correct here, but one testing for the key's _absence_ would
loop forever. Prefer a nullish check that handles both.

---

## 7b. The withheld recent window — ANSWERED, and it is a CLIFF not a gradient (2026-09-07, Task 2.7.5)

§10 recorded this as unmeasured, because Task 2.7.1's probe ran on Labor Day with the market
shut and its `0 bars` meant nothing. **It is measured now, and the market being shut does not
matter, because what is being measured is the API's refusal rather than the presence of
prints.**

Holding `start` a day back and walking `end` towards now, `feed=sip`, `NVDA`:

| `end`                               | Status    |
| ----------------------------------- | --------- |
| 30 / 20 / 18 / 17 / 16 / 15 min ago | **`200`** |
| 14 / 13 / 12 / 10 min ago           | **`403`** |

`{"message": "subscription does not permit querying recent SIP data"}`.

**Three things this settles, and each one changes a design.**

1. **The refusal keys on `end` ALONE.** `start` 31 and 60 minutes ago against an `end` 30
   minutes ago are both `200`. So it is not "the window overlaps recent data"; it is "the
   window's upper bound is recent".
2. **It refuses the WHOLE request rather than answering partially.** A window from Friday's
   open to now — 6½ hours of perfectly available data plus ~15 minutes that is not — is a flat
   `403`. **Nothing comes back.** Task 2.7.5's brief expected a short answer to clip and there
   is no answer to clip.
3. **It applies to daily too.** A `1Day` request with `end` = now is also `403`.

**The consequence, which is the whole of Task 2.7.5's coverage work.** The naïve backfill —
_"from the last bar I stored, to now"_ — is exactly the refused shape, so it would store
**nothing on every run**. `alpacaServableEnd` clamps `end` to `now − 16 min` before the
request and reports the clamp as `coverage.covered`, which is what `SeriesCoverage` exists
for. The extra minute over the measured 15 is margin: the boundary is exact, so a few seconds
of clock skew is the difference between an answer and a total refusal, and the margin costs at
most one bar where the wrong side costs the request.

**`feed=iex` is NOT subject to it** — the same recent window is `200` on IEX. So this is a SIP
entitlement restriction rather than a general recency rule, which matters for Epic 3, whose
live stream is IEX.

---

## 7c. A real multi-page walk, and the number Story 2.8 is sized against (2026-09-07, Task 2.7.5)

Driven through the **shipped** client at its `limit=10000`, `NVDA`, `1Min`, warm:

| Range       | Sessions | Pages |   Bars | Regular-hours |     Ratio |     Wall |
| ----------- | -------: | ----: | -----: | ------------: | --------: | -------: |
| one session |        1 |     1 |    390 |           390 | **1.00×** | 1,030 ms |
| 10 sessions |       10 |     1 |  8,948 |         3,900 | **2.29×** | 1,042 ms |
| 25 sessions |       25 |     3 | 22,952 |         9,750 | **2.35×** | 1,448 ms |
| 47 sessions |       47 |     5 | 43,515 |        18,330 | **2.37×** | 2,170 ms |

**Two findings, and the first is the one that resizes Story 2.8.**

**A window spanning a night collects extended-hours bars, at ~2.35×.** The regular-hours
column is `market-session.ts`'s `minuteBars` summed over the sessions, and the walk matched it
**exactly** (9,750 of 22,952 bars fall inside a regular session) — so the calendar is right and
the _window shape_ is what differs. `[first.open, last.close)` spans the nights between, and
SIP serves pre- and post-market prints across them: **57.5% of a month's bars are extended
hours.**

That generalises §4's _"a date-only range includes extended-hours bars (217 against a
210-minute half day)"_ from a curiosity into a sizing fact. `UNIVERSE.md` §8's ~1.18 GB/year
assumes 390 bars a session; a backfill using span-shaped windows would store **~2.8 GB/year**.
**A backfill should ask per SESSION**, `[open, close)` per day, which returns exactly
`minuteBars` — measured at 1.00× above. Story 2.8 owns that and it is now a number rather than
a caution.

**Pagination is cheap and the first request dominates.** 5 pages in 2,170 ms is ~434 ms a page
against ~1,030 ms for a single-page fetch, so connection setup is most of a small fetch. But
note the ceiling: a 5-page walk is **72% of `DEFAULT_BARS_DEADLINE_MS` (3,000 ms)**, and that
default was derived for a _single_ request against the browser's 5-second budget. **A
paginated caller must pass its own `deadlineMs`**; one that does not gets a `timeout`, which
is at least loud. Story 2.8 inherits that.

---

## 8. The bar payload and the response envelope (2026-09-07)

**The documented field set is exactly the observed field set** — nothing documented-but-absent,
nothing absent-but-documented:

```
c  h  l  n  o  t  v  vw
```

Envelope keys: `bars`, `next_page_token`. (`currency` is documented but was not present on
these responses.)

`PROVIDER.md` §9.1 takes six of the eight — `n` and `vw` are declined there with triggers, and
nothing measured here disturbs that.

### Sessions, holidays and a trap in date-only ranges

| Case                                                  | Result                                               |
| ----------------------------------------------------- | ---------------------------------------------------- |
| Market holiday (2025-12-25, whole UTC day)            | **0 bars** — an empty answer, a **success** per §8.2 |
| Half day (2025-11-28), `[open, close)`                | **exactly 210**, matching the calendar               |
| **Date-only range** `start=2025-11-28&end=2025-11-28` | **217 bars — 7 outside the regular session**         |

**A date-only range includes extended-hours bars.** On the half day above, the extras ran from
`13:30:00Z` (an hour before the 14:30Z open) to `18:08:00Z` (after the 18:00Z early close).

`CALENDAR.md` §2 scopes V1 to the **regular session**, so **Story 2.8 must request explicit
session bounds and never a bare date**. A date-only backfill would silently store pre- and
post-market bars, and every `PRODUCT_SPEC.md` §11 calculation would then run over a denominator
the calendar says is 390.

The half day matching the calendar **exactly** is also the first time this project's early-close
table has been validated against a third party.

### `adjustment` behaves as `PROVIDER.md` §3.5 records

`NVDA` across its 10-for-1 split (2024-06-10):

|         | First close (2024-05-28) | Last close (2024-06-20) |
| ------- | -----------------------: | ----------------------: |
| `raw`   |             **1140.525** |                  130.78 |
| `split` |               **114.05** |                  130.78 |

Ratio **exactly 10.00** — raw carries the cliff, split is continuous, precisely as §3.5
predicts and §3.6 warns.

**And the assertion that matters in practice:** `JNJ`, which has no split in the range, returns
**identical bars in both modes**. That is what makes `adjustment` safe to send unconditionally.

### Timeframes

`1Min`, `1Day`, `1Week` and `5Min` all return `200`. An unsupported string (`banana`) is a
clean **`400`**. `PROVIDER.md` §9.4 takes only `1m` and `1d`; nothing here disturbs that, and
note that **`5Min` being served does not make aggregation expressible** — §9.4 declines it on
replay-reconstruction grounds, not availability.

---

## 9. Error bodies, verbatim — for Task 2.7.6 to map against (2026-09-07)

**Recorded bytes, not a memory of a screen.**

| Cause                          |    Status | Body                                                                                                            |
| ------------------------------ | --------: | --------------------------------------------------------------------------------------------------------------- |
| **Bad key**                    |     `401` | **`<html>…401 Authorization Required…nginx</html>`**                                                            |
| End before start               |     `400` | `{"message":"end should not be before start"}`                                                                  |
| Malformed date                 |     `400` | `{"message":"Invalid format for parameter start: error parsing 'not-a-date' as RFC3339 or 2006-01-02 time: …"}` |
| Missing `symbols`              |     `400` | `{"message":"Invalid format for parameter symbols: query parameter 'symbols' is required"}`                     |
| Unsupported timeframe          |     `400` | (400, body captured)                                                                                            |
| Rate limited                   |     `429` | `{"message": "too many requests."}`                                                                             |
| ~~**Range in the future**~~    | **`403`** | **CORRECTED 2026-09-07 by Task 2.7.6** — `{"message":"subscription does not permit querying recent SIP data"}`  |
| **Range before history depth** | **`200`** | `{"bars":{},"next_page_token":null}`                                                                            |
| **Unknown symbol**             | **`200`** | `{"bars":{},"next_page_token":null}`                                                                            |

### CORRECTION, 2026-09-07 (Task 2.7.6): a future range is a `403`, not a `200`

Re-produced against the live API while recording these bodies as fixtures. **A range entirely
in the future answers `403 subscription does not permit querying recent SIP data`** — the same
body as §7b's recency cliff, and for the same reason, because the cliff is keyed on `end`
alone and any future `end` is trivially inside the withheld window. The row above is struck
rather than deleted.

The row was taken before Task 2.7.5 discovered the cliff, so nothing was measured carelessly —
it is a measurement whose meaning changed once a second measurement existed. **The general
form is this document's own opening instruction: re-take rather than cite.**

Two consequences, and neither changes the shipped mapping:

- **The `403` is more reachable than the mapping's own reversal trigger assumed.** It was
  believed to need a deliberately wrong plan; it needs only a caller asking about tomorrow.
  That strengthens rather than weakens the trigger written beside the `401`/`403` branch in
  `alpaca-mapping.ts`.
- **The shipped client still cannot produce it**, and now for a second reason: a future window
  is clamped by `alpacaServableEnd` to a `servableEnd` at or before `start`, so `fetchBars`
  returns a costless empty success and makes **no request at all**. Asserted.

There is an argument that the recency `403` should map to `range-not-available` rather than to
`unauthorised` — _"the symbol exists and this provider will not serve this window"_ is §8.1's
definition of that member word for word, and the caller's repair is to narrow the range rather
than to fix a key. **It was not taken here**, because §8.1 also names _"unentitled"_ as
belonging to `unauthorised`, because a `403` on this vendor is ambiguous between a window we
may not ask for and a **feed** we are not entitled to (which narrowing does not repair), and
because the union is not this task's to re-open. Recorded as the open question it is, with the
trigger named in the code.

---

## 9b. The mapping as shipped (2026-09-07, Task 2.7.6)

Every row was **produced against the live vendor** and its body recorded verbatim under
`apps/backend/src/fixtures/alpaca/`, where the offline tests replay it. The fixtures are in
`.prettierignore`: a reformatted `401` page is a fixture that no longer proves the one thing it
was recorded to prove.

| Produced                             | Status | Maps to                | Why                                                             |
| ------------------------------------ | ------ | ---------------------- | --------------------------------------------------------------- |
| Wrong secret / no credential         | `401`  | `unauthorised`         | Byte-identical HTML from nginx, in both cases                   |
| Recency cliff / future range         | `403`  | `unauthorised`         | Unreachable through the client — the clamp precedes the request |
| 320-concurrent burst                 | `429`  | `rate-limited`         | **No hint**: no `Retry-After` on any of 113                     |
| —                                    | `5xx`  | `upstream-unavailable` | Retryable                                                       |
| Refused / DNS / unroutable           | —      | `upstream-unavailable` | `TypeError("fetch failed")`, every class                        |
| A host that hangs                    | —      | `timeout`              | Our deadline fires first, so it never reaches the branch above  |
| Reversed / malformed / bad timeframe | `400`  | **throw**              | A request only this codebase could have built                   |
| A `200` we cannot parse              | `200`  | **throw**              | Our understanding of the vendor is wrong                        |
| Unknown symbol                       | `200`  | **`ok`, empty**        | Indistinguishable from a real symbol with no prints             |
| Before history depth                 | `200`  | **`ok`, empty**        | Not a refusal at all                                            |

**Two of the seven failure members are NOT PRODUCIBLE from this endpoint**, and both are named
rather than left looking implemented: `unknown-symbol` and `range-not-available`. Task 2.7.8's
assets endpoint is the only thing that can produce the first.

### The rate limit, re-measured

**320 concurrent: 207 answered, 113 refused** — against §6's 201 and 203, so the ceiling is
~200/min plus a few, confirmed a third time on a third burst. **Not one of the 113 carried a
`Retry-After` or any `x-ratelimit-*` header**, and all 113 bodies were identical. Task 2.7.7's
backoff must schedule itself.

### What `fetch` rejects with, read whole rather than by message

| Class                 | Constructor | `message`      | `cause.code`              |
| --------------------- | ----------- | -------------- | ------------------------- |
| Connection refused    | `TypeError` | `fetch failed` | `ECONNREFUSED`            |
| DNS does not resolve  | `TypeError` | `fetch failed` | `ENOTFOUND`               |
| Unroutable (RFC 5737) | `TypeError` | `fetch failed` | `UND_ERR_CONNECT_TIMEOUT` |

One shape for all three, so the mapping keys on the **constructor** and deliberately never
reads `cause` — undici's shape is not a contract, and every value it takes means the same thing
to a caller. Under our own composed deadline the unroutable case never arrives here at all: the
deadline fires first and the answer is `timeout`, which is the distinction the two members
exist for.

---

### Three findings a documentation-based mapping would have got wrong

**1. The bad-key body is HTML, not JSON.** It comes from nginx before the application is
reached. A client that assumes a JSON error body will throw a parse error while handling an
auth failure — turning a clear `unauthorised` into a laundered parse failure, which
`PROVIDER.md` §8.5 is explicit must not happen.

**2. `unknown-symbol` is NOT PRODUCIBLE from the bars endpoint.** A symbol that does not exist
returns `200` with an empty `bars` object — **byte-identical** to a valid symbol with no data
in range. Since §8.2 makes an empty answer a **success**, the two are indistinguishable.

> **Task 2.7.~~5~~6 therefore has a union member it cannot produce from this endpoint** (the task number was wrong when written; 2.7.5 is pagination). That is a
> real finding rather than a gap in the measurement, and it feeds directly into **Task 2.7.8's
> assets-endpoint decision** — the assets endpoint is the only thing that can tell an unknown
> symbol from an empty answer, which strengthens the case for adopting it.

**3. ~~Neither a future range nor a too-deep range is an error.~~ Half of this is wrong — see
the correction above.** A **too-deep** range is `200` and empty; a **future** range is a `403`.
The conclusion survives both halves: `range-not-available` is still not producible **through
the shipped client**, because the too-deep case is a success and the future case is clamped
away before a request is made. §8.7's argument for shipping it without sub-reasons looks better
for it, not worse.

---

## 10. What was NOT measured, and why

**Stated rather than quietly omitted.**

- ~~**The 15-minute withheld recent window.**~~ **ANSWERED 2026-09-07 by Task 2.7.5 — see §7b.**
  The original probe measured `0 bars` on Labor Day with the market shut, which was
  meaningless. What that probe got wrong was not the day but the **question**: the thing to
  measure is not where bars stop, it is **whether the API answers at all**, and that is
  measurable with the market shut. It is a `403` cliff at exactly 15 minutes, keyed on `end`
  alone, refusing the whole request.

  **One thing genuinely remains unmeasured here**: where bars actually stop _during a live
  session_, i.e. whether a served window is dense right up to the cliff. That needs the market
  open and this story never had a session — 2026-09-07 is Labor Day. It does not block
  anything, because the clamp is driven by the refusal boundary rather than by the last bar.

- ~~**Whether the rate limit is per key or per endpoint** (§6).~~ **ANSWERED 2026-09-07 by
  Task 2.7.7 — see §6b. Per API: a second `data` path shares the bucket, the trading API does
  not.** The same probe found the limiter is a refilling bucket rather than a punished window,
  which nothing here had established.
- **Anything about the WebSocket stream beyond the subscription cap.** Deliberate: the stream
  is Epic 3's, and the cap was an explicit, narrow exception because another story is parked
  on it. No bar was consumed from the socket, and no reconnection behaviour was touched.
- **A second account.** Every figure is from one free-plan paper account, so anything
  account-scoped (the rate limit especially) is n=1.

---

## 11. How these were taken, so they can be re-taken

A throwaway harness outside the tree — the shape Task 1.13.1 used for two browser tools and
Task 1.13.4 for a renderer probe: run it, record the findings here, delete it. **The tree was
left byte-identical outside `planning/`.**

Six scripts against `https://data.alpaca.markets` and
`wss://stream.data.alpaca.markets/v2/{iex,sip}`, writing **22 JSON captures**, each carrying
the request URL, the instant it was taken, the status, every response header and the body.

**The credential never touched a file in the repository.** It lived in an env file outside the
tree for the length of the task and was deleted at the end. Every capture was swept for the
credential's own bytes before being written, and the writer **refuses** on a match — verified
clean across all 22.

Two measurements carried their **own control**, which is what makes them measurements:

- The cap test subscribed to **trades as well as bars**, so an accepted-everything server
  would have reported inconclusive rather than an exemption.
- The adjustment test asked for a symbol with **no split in range** and asserted both modes
  return identical bars.

**And one automated verdict was wrong** (§5.1) — caught only because 391 > 390 is arithmetically
impossible for missing data. Read the numbers, not the script's conclusion.

---

## 12. The assets endpoint (2026-09-07, Task 2.7.8)

A **different endpoint on a different host** from everything above: the bars endpoint is
`data.alpaca.markets`, this is the **trading** API. §6b measured that as a separate
rate-limit budget, which is why reading it costs Story 2.8's backfill nothing.

`GET https://paper-api.alpaca.markets/v2/assets?status={active|inactive}&asset_class=us_equity`

| Question                           | **Measured 2026-09-07**                                 |
| ---------------------------------- | ------------------------------------------------------- |
| Active US equities, one request    | **14,277** in ~2.0 s                                    |
| Inactive US equities, one request  | **19,188**                                              |
| Cost against the **bars** budget   | **Zero** — separate API, separate bucket (§6b)          |
| Per-symbol lookup needed?          | **No.** The whole catalogue is one response             |
| Does `id` survive a ticker rename? | **NO — six renames checked, six different ids**         |
| Does an inactive row carry a date? | **No.** Identical shape to an active one, no timestamp  |
| Does `inactive` mean delisted?     | **No.** 8% of sampled inactive symbols still print bars |

**Task 2.7.1's 12,881 figure was for active tradable equities; the plain active count is
14,277.** Both are one request. The count moves daily and is not worth citing.

### 12.1 The row, verbatim

```json
{
  "id": "4ce9353c-66d1-46c2-898f-fce867ab0247",
  "class": "us_equity",
  "exchange": "NASDAQ",
  "symbol": "NVDA",
  "name": "NVIDIA Corporation Common Stock",
  "status": "active",
  "tradable": true,
  "marginable": true,
  "maintenance_margin_requirement": 30,
  "margin_requirement_long": "30",
  "margin_requirement_short": "30",
  "shortable": true,
  "easy_to_borrow": true,
  "borrow_status": "easy_to_borrow",
  "fractionable": true,
  "attributes": ["fractional_eh_enabled", "has_options", "overnight_tradable"]
}
```

**An inactive row is the same fifteen fields** with `status: "inactive"`, `tradable: false`
and the margin requirements at 100. **There is no delisting date and no successor symbol
anywhere in the payload** — which is the finding that stops this endpoint from being able to
populate a `delisted` status Epic 13 could use.

Nine of the fifteen fields are facts about **trading through Alpaca** rather than about the
security, so `alpaca-assets.ts` reads six.

### 12.2 `status` is a fact about the VENDOR, measured against the tape

50 active and 50 inactive symbols, sampled deterministically from the catalogue (plain
tickers, listed venues), each asked for daily bars over August 2026 in one multi-symbol
request per group:

| Vendor says | n   |                         Still printing bars |
| ----------- | --- | ------------------------------------------: |
| `active`    | 50  |                               **50 (100%)** |
| `inactive`  | 50  | **4 (8%)** — `LWACU`, `FRSH`, `SEMG`, `ITG` |

So `inactive` means "Alpaca will not trade this", not "this is delisted". The two signals
agree 92% of the time and the 8% is in the direction that matters: it would report a
still-trading security as gone. `UNIVERSE.md` §15.2 is where that decides something.

### 12.3 The `id` does NOT survive a rename — six for six

The measurement that falsified Story 2.7's open decision 5, and the thing most likely to be
assumed rather than checked, because "stable per-asset identifier" is what the word `id`
suggests:

| Rename                    | Old symbol today                                    |
| ------------------------- | --------------------------------------------------- |
| `SQ` → `XYZ` (Block)      | **`404 asset not found`**                           |
| `ANTM` → `ELV` (Elevance) | **`404 asset not found`**                           |
| `RTN` → `RTX` (Raytheon)  | `inactive`, id `a95c8fe1…` ≠ `4d8f7f83…`            |
| `TWTR` → `X` (Twitter)    | `inactive`, id `2e91ded3…` ≠ `4ea43090…`            |
| `FISV` → `FI` (Fiserv)    | both rows exist, different ids                      |
| `FB` → `META` (Meta)      | **`active` — ProShares S&P 500 Dynamic Buffer ETF** |

The vendor issues a **new row with a new id** and retires or drops the old one. The id
identifies an asset **within a response**, not a company **across time**.

**Two traps in that table.** `FB` is the sharp one — an old ticker may be **recycled to an
entirely different company**, so "the old symbol is gone" is not a safe assumption and
neither is "the old symbol still means what it did". **229 tickers** in the current catalogue
carry both an active and an inactive row. And `X` is inactive because United States Steel was
acquired, which is unrelated to Twitter — a reminder that a symbol pair proves nothing
without reading both rows.

**`FISV`/`FI` was cross-checked against the tape** rather than assumed to be vendor staleness:
`FISV` printed 22 daily bars in August 2026 and `FI` printed none, so the catalogue and the
tape agree and the endpoint is not wrong here. Worth recording because the obvious reading —
"the vendor's data is stale" — was the first hypothesis and the control refuted it.

### 12.4 What was NOT measured here

- **Whether the `id` is stable across anything other than a rename.** It is unique within a
  response and never collides between the active and inactive lists (checked: 0 collisions,
  0 duplicates in 14,277). Nothing here establishes that it survives a re-listing, and
  nothing in this product depends on it, because it is never stored.
- **`asset_class` other than `us_equity`.** Crypto and options are `PRODUCT_SPEC.md` §37
  exclusions.
- **The live `api.alpaca.markets` host.** Only `paper-api` was read; the catalogue is
  documented as identical and this product has no reason to hold a live trading credential.
