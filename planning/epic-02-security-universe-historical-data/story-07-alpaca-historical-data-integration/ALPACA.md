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

**Open:** whether the limit is per key or per endpoint was **not** established. Settling it
needs a second endpoint driven inside the same window; the burst above used one endpoint only.

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
| **Range in the future**        | **`200`** | `{"bars":{},"next_page_token":null}`                                                                            |
| **Range before history depth** | **`200`** | `{"bars":{},"next_page_token":null}`                                                                            |
| **Unknown symbol**             | **`200`** | `{"bars":{},"next_page_token":null}`                                                                            |

### Three findings a documentation-based mapping would have got wrong

**1. The bad-key body is HTML, not JSON.** It comes from nginx before the application is
reached. A client that assumes a JSON error body will throw a parse error while handling an
auth failure — turning a clear `unauthorised` into a laundered parse failure, which
`PROVIDER.md` §8.5 is explicit must not happen.

**2. `unknown-symbol` is NOT PRODUCIBLE from the bars endpoint.** A symbol that does not exist
returns `200` with an empty `bars` object — **byte-identical** to a valid symbol with no data
in range. Since §8.2 makes an empty answer a **success**, the two are indistinguishable.

> **Task 2.7.5 therefore has a union member it cannot produce from this endpoint.** That is a
> real finding rather than a gap in the measurement, and it feeds directly into **Task 2.7.8's
> assets-endpoint decision** — the assets endpoint is the only thing that can tell an unknown
> symbol from an empty answer, which strengthens the case for adopting it.

**3. Neither a future range nor a too-deep range is an error.** Both are `200` and empty. So
`range-not-available` is **also** not producible from this endpoint by either route. §8.7's
argument for shipping it without sub-reasons looks better for it, not worse.

---

## 10. What was NOT measured, and why

**Stated rather than quietly omitted.**

- **The 15-minute withheld recent window.** Measured as `0 bars`, which is meaningless: the
  measurement was taken at 06:59 UTC on **2026-09-07, which is Labor Day** — the market was
  shut. **Re-take during a regular session.** Note the `403` on recent SIP data (§2) does
  independently confirm that _some_ recency restriction is enforced.
- **Whether the rate limit is per key or per endpoint** (§6).
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
