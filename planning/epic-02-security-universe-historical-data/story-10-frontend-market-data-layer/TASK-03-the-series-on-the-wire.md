# Task 2.10.3 — The series on the wire: the predicate, the request, and the window we never compute

**Status:** Complete — 2026-09-10
**Story:** [2.10 Frontend Market-Data Layer & Application State](STORY.md)
**Depends on:** Task 2.10.1

## Objective

Give the frontend a fourth request shape — `GET /market-data/bars` — with the
guard that decides whether a body is a series, and the one function that builds
the query string. No React, no state, no component: this is the transport half
and it ends at a `Promise<ApiResult<BarSeriesResponse>>`.

## What the user can see when this lands

**Nothing.** The payoff is Task 2.10.7. What this buys is that nothing after it
writes a URL by hand or re-decides what a valid series body is.

## Work

- **`isBarSeriesResponse` ships in `packages/shared`, beside the shape it
  checks**, and this is its first reader — which is Task 1.7.3's rule that a
  predicate arrives with one rather than with the contract. `BarSeriesResponse`,
  `BarSeriesPayload`, `SeriesCoveragePayload`, `SeriesProvenancePayload`,
  `TimeWindowPayload` and `BarPayload` already exist there from Task 2.9.3; what
  does not exist is the guard.

  **How strict it is, is a decision with a precedent on each side.**
  `isHealthResponse` deliberately accepts unknown extra fields and an unknown
  `status`, because a newer server is a version skew rather than a broken one.
  `isMarketDataResponse` is deliberately stricter, because a feed slug this
  bundle has no words for cannot be rendered honestly and must not reach a
  component that would print it. A series sits nearer the second on **feed and
  adjustment** — `provenance.sources` carries a `BarSource` whose feed this
  bundle must be able to label, and invariant 6 is that provenance is displayed
  rather than implied — and nearer the first on everything else. Decide it once,
  write the reasoning in the module header the way both precedents do, and note
  what an `unreadable-body` from this endpoint therefore means.

  Two shapes it must **accept**, because both are correct answers rather than
  broken bodies: `bars: []` with provenance and `coverage.requested` present, and
  `coverage.covered` of `null`. A guard that requires a non-empty array turns the
  contract's own empty answer into "something else is answering at this address".

- **`getBarSeries()` in `api-client.ts`, a fourth call to `apiRequest`** for the
  reason `getSecurities` writes out: the base URL, the five-second deadline, the
  composed abort signal, the correlation-id read and the seven outcomes are each
  invisible at a call site. `api-client.ts` remains the only file in
  `apps/frontend/src` that calls `fetch` — acceptance criterion 1 — and this task
  is the one most likely to break that, because a series is the first request
  with parameters.

- **One function builds the query, and the browser's clock is not an input to
  it.** This is `MARKET-DATA-API.md` §2 and it is the trap this task exists to
  close: a browser in Singapore at 09:00 local is on the previous _market_ date in
  New York, so a client that resolves "the last 5 sessions" itself is off by one
  session for roughly half the world for several hours of every day — invisible in
  local testing, and it produces a chart that is plausible and shifted rather than
  an error anybody sees. **Send `sessions=N` and let the server resolve it**; read
  what it meant back out of `coverage.requested`.

  The absolute form exists too and is the primitive (§2), so the builder takes
  both window forms as a discriminated union rather than five optional
  parameters — the same reason the states below are a union. Note there is a
  legitimate reason to send an absolute window: §11 gives an absolute window
  inside closed sessions a five-minute lifetime where a named one has none. That
  is Task 2.10.5's to exploit if it wants to; this task only has to make both
  expressible.

- **The refusals are part of the contract, not surprises.** The cap is 10,000
  bars and is **refused with a 400 that names the number** rather than reduced —
  the server never downsamples (§3, §4) — and the calendar refuses a window
  outside 2024–2028 rather than returning fewer sessions than asked for. Both come
  back as `api-error` with a `code`. This task does not render them; it must not
  swallow them either, and its tests should assert that each survives the guard
  as an `api-error` carrying a readable `code`.

- **Test against recorded bodies, not against a running server.** `pnpm test` is
  fast by contract — no socket, no database, no network. The backend keeps raw
  recorded vendor bodies under `src/fixtures/alpaca/`, excluded from Prettier on
  purpose because formatting them would rewrite evidence; the frontend needs the
  equivalent for **our own** wire shape, and where those live is Task 2.10.6's
  decision. Until then, inline the fixtures in the test file rather than inventing
  a second home for them.

## Done when

- `isBarSeriesResponse` is exported from `@marketpulse/shared`, has a module
  header saying how strict it is and why, and accepts both the empty series and a
  `null` `covered`
- `getBarSeries()` exists, and `grep -rn "fetch(" apps/frontend/src` still returns
  exactly one file
- The query builder takes both window forms and cannot express a half-specified
  one, and **nothing in `apps/frontend/src` reads a clock to build a window** —
  asserted by inspection and stated in the file
- A 400 naming the cap and a calendar refusal both arrive as `api-error` with a
  readable `code`, covered by tests
- `pnpm verify` passes, and `pnpm --filter @marketpulse/shared test` covers the
  guard's accept and reject cases including the two that look like failures

---

## What was done — 2026-09-10

Three files added and two touched. No React, no state, no component, and
nothing on screen.

| File                                              | What it is                                                                                                |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `packages/shared/src/bar-series-response.ts`      | `isBarSeriesResponse`, beside the shape it checks, with its strictness argued in place                    |
| `packages/shared/src/bar-series-response.test.ts` | 15 cases: the accepts, the refusals, and the two answers that look like failures                          |
| `apps/frontend/src/bar-series-query.ts`           | `SeriesWindow`, `BarSeriesRequest`, `barSeriesQuery()` — the only place these parameter names are written |
| `apps/frontend/src/bar-series-query.test.ts`      | Stability, exclusivity, and two compile errors asserted as compile errors                                 |
| `apps/frontend/src/api-client.ts`                 | `getBarSeries()`, a fourth call to `apiRequest`                                                           |

### How strict the guard is, and the line it was decided on

The task named a precedent on each side. The answer is **neither wholesale**:
strict about every **closed vocabulary** and lenient about everything else, on
one question — _would an unrecognised value be rendered?_

- **Refused**: a `feed`, `provider`, `adjustment`, `timeframe` or
  `securityStatus` outside its const array. `feed` is the invariant-6 field and
  `MARKET_FEED_DESCRIPTIONS` is where a feed's words live, so an unknown slug is
  rendered raw or rendered as nothing — the caption problem
  `market-provenance.ts` exists to prevent, arriving through the one door left
  open. The other four are the same argument with a different noun. The skew
  window `isHealthResponse` guards is not open here: every one of these unions
  is in `packages/shared`, **inlined into the frontend bundle**, and `deploy.yml`
  ships both halves from one commit.
- **Refused**: an **empty `sources` array**.
  `SeriesProvenancePayload.sources` names this predicate as the place the
  domain's non-emptiness is re-established, and the empty series is not the
  exception it looks like — `serve-series.ts` gives one exactly one source, with
  `barCount: 0`.
- **Accepted**: unknown extra keys anywhere; any string where the contract says
  instant (`isSecurityCoverage`'s stated asymmetry — a value a consumer
  _renders_ fails locally and visibly, a discriminator it _switches on_ fails
  silently); `symbol` as any string, because `toTicker` is where a branded
  ticker is claimed.
- **Accepted**: both shapes the task named — `bars: []` with provenance and
  `coverage.requested` present, and `coverage.covered` of `null`.

### The finding: the constructors do not belong in the predicate

`bar-series-response.ts` had predicted, at Task 2.9.3, that the guard's work
would be `toTimeRange`, `toSeriesProvenance` and `toBarSeries`. **Its first half
held and its second half was wrong**, and the argument is about what an answer
would _mean_:

`api-client.ts` maps a 2xx whose body fails its predicate to `unreadable-body`,
documented as _something is answering at this address and it is not this API_ —
the static host returning `index.html` at a 200, measured twice in this
repository. A body shaped exactly like this contract that carries mis-ordered
bars is the **opposite** diagnosis: our own server with a bug. Reporting it as a
stranger at the address sends the next reader to the wrong half of the system.
A predicate is also the wrong instrument — it would `try`/`catch` three throwing
constructors, discard what they built, and let the caller build them again.

So the sentence this endpoint's `unreadable-body` now carries: **the body is not
this contract's shape — a wrong host, or a vocabulary this bundle predates. It
never means the numbers disagree with each other.** The coherence check is
`toBarSeries` and it is relocated, not dropped: the module header carries a dated
amendment, and **Task 2.10.4's file was amended to own it** rather than left to
rediscover it.

### The window is never computed here, and the mechanism is the shape

`SeriesWindow` is a discriminated union whose named member holds no instants and
whose absolute member holds no session count, so **there is no member a clock
could contribute to**. `barSeriesQuery` is a pure function of its argument;
neither it nor `api-client.ts` constructs a `Date`. A test asserts the property
as an absence — a named request's URL contains no `start=` and no `end=` — which
is what the property actually is.

Two decisions inside the builder that are not obvious:

- **The parameter order is fixed and load-bearing.** Two caches key on this
  string: the browser's own HTTP cache keys on the whole URL, which is what makes
  §11's `ETag` revalidation and the five-minute lifetime work at all, and
  `FRONTEND-STATE.md` §2 keys the in-memory series cache on _the request as
  sent_. Two spellings of one request are two misses and two round trips, and
  nothing on screen looks wrong while it happens. **Task 2.10.5 should key its
  cache on this string rather than inventing a second spelling.**
- **The window is one union rather than three optional parameters.** A request
  naming both forms is a 400 and so is one naming neither; three optional fields
  make both constructible at every call site and discoverable only in a response.
  Two `@ts-expect-error`s in the test file assert that a half-specified window is
  a **compile** error, which is the only level this property can be checked at.

### Verified

- `pnpm verify` passes — build, lint, format, stories, env, links, 915 tests,
  process tests.
- `grep -rn "fetch(" apps/frontend/src` returns **one file**, `api-client.ts`,
  at one line. Acceptance criterion 1 holds through the request most likely to
  have broken it.
- The inline fixture was checked against the body the backend actually serves
  rather than against the schema: `routes/market-data.test.ts` asserts a served
  envelope field for field, and the fixture matches it. The empty-series case was
  checked the same way — `market-bars.ts` fills `retrievedAt` from
  `earliestRecordedAt(rows) ?? now`, so a zero-row source still carries one and
  the guard does not refuse a legitimate empty answer.
- Not run: `pnpm e2e`. Nothing rendered changed, no route and no component was
  touched, and the browser suite asserts what is on screen.

---

## For the stakeholders — a status report in plain English

### Where the product is

MarketPulse today shows you a list of 518 companies with a real last price and a
real change, served from about 48 million minute-by-minute price records. It
still cannot draw a chart. The work between "the prices exist on our server" and
"you can look at them" is a run of small, dull, load-bearing pieces, and this was
the third of them.

### What this task built

**The order form and the receipt inspector.** Nothing visible — stated plainly,
as this project requires, and the visible payoff is two tasks away.

Two pieces, and both exist so that nothing built after them has to make the same
decision twice.

**The order form.** There is now exactly one function in the application that
knows how to ask our server for a stretch of price history. Everything that will
ever want prices — the price chart, the volume chart, a comparison between four
companies, the AI's investigation tools — goes through it. The alternative, which
is what most applications do, is that each screen assembles its own request; that
works until the contract changes, and then it works everywhere except the one
screen nobody remembered.

**The receipt inspector.** And there is now one function that decides whether
what came back is actually one of our price responses, rather than something else
that happened to answer at that address. That is not paranoia: this project has
twice measured a web host cheerfully returning a web page, with a success code,
where an application expected data. Without that check, a page renders an empty
chart and reports no problem at all.

### The three decisions worth explaining

**1. We refuse to let the browser decide what "the last 5 sessions" means.**
This is the one that sounds like a technicality and is a real defect we designed
out before it could happen.

If you ask for the last five trading days, somebody has to work out which five
days those are. The obvious place is in your browser — it knows the date. The
problem is that it knows _your_ date. A user in Singapore opening the app at nine
in the morning is, from the New York market's point of view, still on yesterday.
So the browser would ask for the wrong five days — off by one — for roughly half
the world, for several hours of every day.

What makes it dangerous is that it is not an error. Nothing breaks. You get a
chart, it is drawn correctly, all the numbers are real, and it is silently the
wrong week. It never shows up in testing, because everyone testing it is in one
timezone.

So the application sends the words "the last five sessions" and our server — which
knows what the market's date is — decides which days those are and tells us in
the reply. The code is arranged so that this is not a rule someone has to
remember: the way the request is described in the code makes it **impossible** to
put a date in it.

**2. We check the shape of an answer, not its arithmetic.** The inspector asks:
is this one of our price responses? It deliberately does not ask: do these
numbers add up? That looks like a gap and is a decision, and the reason is about
telling two very different problems apart.

If the answer is not the right shape, something other than our service answered —
a misconfigured address, an outdated app. If the answer is the right shape but
the numbers are inconsistent, our own service has a bug. Those need different
people looking in different places. Lumping them together would send whoever
investigates to the wrong half of the system. So the arithmetic check happens at
the next step, where its failure means what it should mean, and we wrote that
obligation into the next task's brief rather than trusting anyone to remember it.

**3. Two answers that look like failures are treated as answers.** "We have no
price data for this company in that period" is a fact, not a fault. So is "we
have data for part of the week you asked for, up to Thursday." Both are things a
user needs told honestly — invented data would be far worse — and both are
answers a naïve check would have thrown away as broken responses, replacing a
truthful "we hold nothing here" with a misleading "something has gone wrong."

There are two refusals from the server on the other side of the same coin, and
this task made sure they survive intact rather than being flattened into
"something went wrong". Ask for a year of minute-by-minute prices and you are
asking for about 98,000 data points and eleven megabytes; our server refuses and
says so, naming the limit — **10,000** — instead of quietly sending you a
thinned-out version. A chart drawn from fewer points than were requested is
wrong and looks right, which is the worst combination available. Similarly, our
trading calendar covers 2024 to 2028 and refuses dates outside it rather than
guessing which days were public holidays. In both cases the user should be told
the actual number and the actual limit, and that is only possible because this
layer carries them through untouched.

### What this unlocks

The next task assembles these pieces into the application's first proper feature
module and defines what the screen says in every state — loading, loaded, partly
loaded, empty, refused, failed. Then cancellation and remembering a series you
just looked at, then a test backend, and then **the payoff: a real price series
for a real company on screen**, showing the window you asked for, the window we
actually hold, the number of bars, the prices, and an honest label for which
market feed the data came from.

That screen deliberately draws no chart. Charting is its own piece of work with
its own decisions, and it should be built against a data layer already known to
be correct rather than debugging both at the same time. After that: search, the
price chart, the volume chart — the point at which this stops being a list of
companies and becomes something worth showing someone.
