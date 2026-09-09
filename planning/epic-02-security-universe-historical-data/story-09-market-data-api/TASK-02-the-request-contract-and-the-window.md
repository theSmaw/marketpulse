# Task 2.9.2 — The request contract: symbol, timeframe, window

**Status:** Complete — 2026-09-09
**Story:** [2.9 Market Data API](STORY.md)
**Depends on:** Task 2.9.1

## Objective

Turn "a symbol, a timeframe and a window" into a parsed, validated, typed request
— **as a pure function with no route and no database around it** — so the shape
Task 2.9.1 chose is exercised before anything can be served wrongly.

## What the user can see when this lands

**Nothing.** This is the half of the endpoint that decides what a caller is
allowed to ask for.

## Work

- **Parse and validate in one place, returning a result rather than throwing** for
  anything a caller can cause. `toTicker` and `toTimeRange` throw because their
  refusals are programming errors; a query string is the opposite — every refusal
  here is a **client** error and has to become a 400 with a message a person can
  act on. Keep the taxonomy small and name each member for what the caller did
  wrong, following `API_ERROR_CODES`' rule that a member exists when something
  reads it.

- **The timeframe is `TIMEFRAMES` from `@marketpulse/shared`** — `1m` and `1d`,
  and nothing else. Validate against the const array, never against a literal, so
  the vocabulary cannot fork the way the migration's `check` constraint cannot
  fork from it.

- **Resolve a named window through the calendar, in the handler's layer, never in
  `packages/shared`.** `lastMarketSessions(n, endDate)` returns sessions **oldest
  first** — do not reverse it — and throws `MarketCalendarRangeError` when the
  window runs off 2024–2028. **That refusal is a 400, not a 500**: the caller
  asked for a window this system cannot express, and the message names the covered
  range the way `pnpm bars` already does. Prove it: the same request one day
  outside the range and one day inside is the control.

- **The two window forms are mutually exclusive and a request naming both is a
  400** (`MARKET-DATA-API.md` §2). Not "prefer the absolute one", not "prefer the
  named one" — a caller that sent both does not agree with itself, and silently
  picking one is how it stays wrong. The response always reports the **resolved
  absolute** range in `coverage.requested`, so a named request and an absolute
  request are the same answer.

- **Absolute ranges become a `TimeRange`,** which is half-open and already refuses
  reversed and zero-width pairs. A malformed instant, a missing bound and a
  reversed pair are three different messages.

- **Enforce Task 2.9.1's cap here rather than in the query**, so a request that is
  too large is refused before a 48-million-row table is touched. A cap enforced
  after the read is a cap that costs what it was meant to save.

- **Do not resolve `today` inside `packages/shared`** — the two
  `no-restricted-syntax` rules make a zero-argument `new Date()` there a lint
  error, and that rule is the mechanism rather than the reminder. The clock is
  read once, at the edge, and passed in; which is also what makes this function
  testable without freezing time.

- **Unit-test it at the level it lives at.** Every refusal, the oldest-first
  ordering, the half-day session in the 2026-11-30 week (`11-27` closes 13:00 ET),
  and the boundary either side of the calendar's range.

## Done when

- One module turns a raw request into either a typed, validated request or a named
  refusal, with no `fetch`, no pool and no Fastify in it
- Every refusal has a test, and the calendar's range refusal is asserted as a
  **client** error rather than an internal one
- A named window and the equivalent absolute range resolve to the same
  `TimeRange`, asserted
- `pnpm verify` passes with no database running

## Notes

This is the file Epic 13 will read hardest: a replay-mode request is this shape
with a ceiling on it. Do not build the ceiling — invariant 4 says it belongs in
the data layer and Epic 13 owns it — but do not make it awkward either.

---

## What was built

`apps/backend/src/series-request.ts` and its 28 tests. One exported function —
`parseSeriesRequest(query, now)` — turning a raw query string into either a
`SeriesRequest` (`symbol`, `timeframe`, and an always-absolute `range`) or a
`SeriesRefusal` (`reason`, `message`). No `fetch`, no pool, no Fastify, and no
clock: `now` is a parameter.

**It returns a result rather than throwing, which inverts the rule the domain
constructors follow.** `toTicker`, `toTimeRange` and `toBarSeries` all throw
because every refusal they can produce is a programming error. A query string is
the opposite — every refusal is the **client's** mistake, arrives from outside
the process, and has to become a 400 with a sentence a person can act on. An
exception would be control flow for ordinary traffic, and `errors.ts` would map
it to a 500 unless something remembered to catch it. `fetchBarsCommand`'s
`{ problem }` union is the same choice one layer over; this is that shape with a
machine-readable reason added.

**Five refusal reasons**, each named for what the caller did wrong: `symbol`,
`timeframe`, `window`, `calendar-range`, `too-large`. Every one of them is a 400
(`MARKET-DATA-API.md` §6), so the route does not branch on them — the reader
that justifies the union under `API_ERROR_CODES`' rule is the **test suite**,
because a test asserting on prose fails when the prose is improved. That is
`MarketCalendarRangeError`'s own stated reason for carrying its date as a field.

`window` deliberately covers absent, doubly-specified, unparseable and reversed
windows: one mistake with several spellings, and a caller does nothing different
for each. They carry **different messages**, which is where the difference
belongs — a message is read by a person, a reason is read by code.
`calendar-range` is separate for the opposite reason: it is not a malformed
request at all, it is a well-formed one this system cannot express.

### Decisions taken here

- **The named form goes through `windowFor`, not through `[first.open,
last.close)` written out again.** That module already knows the thing that
  makes this expensive to get wrong: a **daily** bar is stamped at midnight ET,
  hours before the open, so a `1d` window framed on the session bounds contains
  no daily bar at all and returns a perfectly well-formed **empty** answer. This
  is its third caller rather than a second copy. Asserted:
  `sessions=5&timeframe=1d` resolves to `2026-08-31T04:00:00Z →
2026-09-08T04:00:00Z`, midnight to midnight, with the upper bound coming from
  `nextMarketSession` and therefore skipping Labor Day.
- **The `Z` is required on an instant.** `CALENDAR.md` §5 fixed the wire format;
  requiring the suffix makes it a mechanism rather than a convention. The failure
  it prevents is invisible in local testing —
  `new Date("2026-09-04T13:30:00")` parses as **local** time, so a zone-less
  instant is right on a UTC server, wrong by hours on a laptop, and produces a
  chart that is plausible and shifted rather than an error anybody sees. A
  numeric offset (`+01:00`) is refused with it: it is unambiguous and accepting
  it would put a second wire format in a contract whose whole point is that there
  is one.
- **Query values are typed `unknown`, not `string | undefined`.** A query string
  can repeat a key, and `?symbol=NVDA&symbol=AMD` reaches a handler as an
  **array**. Typing them as strings is a lie the compiler agrees with, and the
  first thing to notice would be `isTicker` handed an array.
- **No default timeframe**, unlike `pnpm bars`. A caller who mistypes the
  parameter would otherwise be served minute bars over a daily window — a
  plausible-looking wrong chart rather than an error.
- **The calendar's refusal is rewritten rather than passed through.**
  `MarketCalendarRangeError`'s message names `packages/shared/src/market-calendar.ts`
  and the constant to extend, which is correct for a developer reading a stack
  and is internal detail on a wire. `errors.ts` draws that line for 5xx messages
  and it does not stop applying at 400. Two assertions hold it: the message
  names `2024-01-01` and `2028-12-31`, and contains neither `packages/shared`
  nor `MARKET_CALENDAR`.
- **The cap is counted from the calendar, before any query runs**
  (`MARKET-DATA-API.md` §4). Minute bars are counted in **bar starts** — the
  session's minutes are `open + k` for `k` in `[0, minuteBars)`, admitted when
  they fall inside the half-open window — rather than by dividing a duration, so
  a half day is 210 without this function knowing half days exist. A daily
  window is counted as one bar per session, an **upper bound** rather than an
  exact count, because reproducing the midnight-ET stamp here would be a second
  copy of what `windowFor` centralises; it cannot change an answer, since the
  whole covered calendar is ~1,258 sessions against a cap of 10,000.

### The measurement worth keeping: `new Date` is inconsistent about unreal dates

Taken on Node 24 while writing the malformed-instant test, which was written
expecting a NaN and did not get one:

| Input                  | `new Date(…)`            |
| ---------------------- | ------------------------ |
| `2026-13-01T00:00:00Z` | `Invalid Date`           |
| `2026-01-32T00:00:00Z` | `Invalid Date`           |
| `2026-09-04T25:00:00Z` | `Invalid Date`           |
| `2026-02-30T13:30:00Z` | **2026-03-02T13:30:00Z** |
| `2026-04-31T00:00:00Z` | **2026-05-01T00:00:00Z** |

So a month of 13, a day of 32 and an hour of 25 are all refused, and **February
30th silently becomes March 2nd**. The shape check cannot see it and the NaN
check cannot see it. `parseInstant` therefore round-trips the parsed instant's
date back against the input and refuses a mismatch.

The rollover is the more dangerous of the two failures, which is the opposite of
the intuition: an invalid `Date` compares as neither before nor after anything,
so it survives the ordering check and produces an **empty** answer nobody can
explain, while a date that quietly moved by two days produces a **plausible**
answer over a window nobody asked for.

### The cap's boundary is asserted on a half day, on purpose

Twenty-seven sessions back from Monday 2026-11-30 is 26 regular sessions plus
2026-11-27's 13:00 ET half day: **26 × 390 + 210 = 10,350**, refused.
Twenty-six is 9,960 and is accepted. The half day is what the boundary turns on
— 27 _regular_ sessions would be 10,530 and 26 would be 10,140, so a count that
ignored the early close would refuse both and the test would still be green for
the wrong reason. The assertion is on the number in the message.

### The calendar-range control

The same request one session inside the covered range and one session outside
it, from an instant on 2024-01-03: `sessions=2` resolves to a window opening
`2024-01-02T14:30:00Z` (the first session of the range), and `sessions=3`
refuses with `calendar-range`. An absolute window reaching 2023-12-29 refuses
the same way, through the cap's own calendar walk rather than through the named
form's resolution.

## What the user can see

**Nothing, as the task said.** No route calls this yet — Task 2.9.6 does.

## Notes for the next task

- `SeriesRequest` is named to not collide with `market-data-provider.ts`'s
  `BarsRequest`, which is a different thing one layer down: that one carries an
  `adjustment` and is what we ask a **vendor**; this is what a client asks
  **us**. Task 2.9.5 holds both at once and they must not be confusable.
- **There is no `adjustment` query parameter.** Nothing reads one: the store
  holds `raw`, and `MARKET-DATA-API.md` §5 rule 5 requires the stitch's tail to
  be fetched at the same adjustment or there is no series. A parameter would be
  a choice the read path cannot honour.
- **No recency ceiling, deliberately.** Invariant 4 puts temporal isolation in
  the data layer so it is structurally impossible to bypass, and Epic 13 owns
  it. What this module owes Epic 13 is to not be in the way, and it is not: the
  window is resolved from an instant it is **handed**, so a replay clock
  substitutes for a wall clock with no change here.
- The minute count assumes the store holds **regular-session bars only**, which
  is what the backfill writes. If that stops being true the count
  under-estimates and the cap admits a larger response than it means to — stated
  in the code rather than left to be discovered.

---

## For the stakeholders — what this actually was, in plain terms

### The one-sentence version

We built the doorman for the price-history service: the piece of code that reads
what a caller is asking for — _which company, what resolution, over what stretch
of time_ — and either turns it into a precise, checked instruction, or turns it
away with a sentence explaining what to fix.

### Why a doorman is worth its own piece of work

The database now holds around **48 million individual price observations**. The
service that reads them is the thing every chart in this product will be built
on, and the questions people will ask it are not all sensible. Some will be
typos. Some will be requests for a year of minute-by-minute data, which is eleven
megabytes and would make the page crawl. Some will ask for dates before the
system's trading calendar begins. Some will ask two contradictory things at once.

The temptation is to let the price-reading code sort all that out as it goes. The
reason we did not is cost, and it is a specific cost rather than a tidiness
argument: **a request that is too large is now refused before the database is
touched at all.** We work out how many bars a window would contain by walking the
trading calendar — a few hundred small records — instead of asking a 48-million-row
table for the data and then deciding it was too much. A limit enforced after the
work is done is a limit that costs exactly what it was meant to save.

### The two ways of asking for a window, and why we support both

A caller can name an exact stretch of time, or say **"the last five trading
sessions"** and let our server work out what that means.

That second option exists because of a bug we would otherwise have shipped and
not noticed. If the browser worked out "the last five trading sessions" itself,
it would have to know what today's date is _in New York_. A browser in Singapore
at nine in the morning is still on the previous market day in New York — so for
several hours of every day, for a large part of the world, the chart would be
shifted by one session. It would look completely normal. Our server knows the
market date; a browser only knows its own timezone. So the server does that
sum, always.

Both forms produce **the same answer in the same shape**: whichever way you ask,
the response tells you the exact stretch of time it resolved to. There is one
thing the system can do, with two ways to say it, rather than two products.

**Asking both ways at once is refused rather than guessed at.** If a request
names an exact range _and_ a number of sessions, we do not quietly pick one. A
caller that sent both does not agree with itself, and silently choosing is how
it stays wrong — the request that was answered and the request that was written
are different, and nothing would say so.

### The mistakes we now catch, and one nobody expected

The trading calendar is a checked-in table covering 2024 to 2028, and it
**refuses** to guess outside that rather than pretending there were no holidays
in 2029. That refusal now reaches the caller as _"you asked for a window we
cannot express, here is the range we cover"_ — a normal, explainable answer,
rather than looking like our server broke. We deliberately strip out the part of
the internal message that tells a developer which source file to edit; that is
for us, not for the wire.

Two catches are worth naming because they are the kind that ship silently:

**Times must state that they are in UTC.** A timestamp without a timezone marker
is read by JavaScript as the reader's _local_ time — which is correct on our
server and wrong by hours on a developer's laptop. The result is not an error
message; it is a chart that looks entirely reasonable and is shifted. So we
require the marker.

**And a date that does not exist can silently become a different date.** While
writing the tests we measured something we had assumed was safe: JavaScript
rejects a 13th month, a 32nd day and a 25th hour, but reads **February 30th as
March 2nd** without complaint. A nonsense date that becomes an error is
annoying; a nonsense date that becomes a _real but different_ date produces a
believable answer to a question nobody asked. We now check that the date we
parsed is the date that was sent.

### How this connects to the product you were shown

MarketPulse is meant to answer "what is happening, what is unusual, and what
evidence explains it" — and the fifth workflow, the one meant to be the
signature feature, is _"take me back to 11:07 AM and show me what was knowable at
that moment."_

That feature is several epics away, but it constrains what we build now. This
module never reads the clock; it is **handed** the current time as an input.
That sounds like a small stylistic choice and it is the thing that makes replay
possible later: to replay a moment in the past, you hand this same code a past
instant instead of the present one, and everything downstream is correct by
construction rather than by everybody remembering. It is also why the tests need
no fake clock and are therefore stable.

We also declined to add the one thing that would have been easy and wrong: a
rule here saying "you may not ask for data after the replay moment". That rule
belongs deeper in the system, where nothing can go around it. A guard at the
front door is a guard you can walk past.

### What this unlocks

This is the second of ten tasks in the story that makes price history readable
over the web. It ships nothing on screen — the honest answer, and the story says
so. The next steps are the shape of the answer (2.9.3), reading the actual rows
(2.9.4), topping the stored history up with today's trading (2.9.5), and the web
address itself (2.9.6).

**The first thing you will actually see is task seven**: the last traded price
and its change, on the securities table that already exists. That will be the
first real market price this product has ever displayed. The charts follow in
Story 2.12.
