# Task 2.9.6 — The route, and its failures

**Status:** Complete — 2026-09-09
**Story:** [2.9 Market Data API](STORY.md)
**Depends on:** Task 2.9.5

## Objective

Put the series on the wire at the path Task 2.9.1 chose, with every failure
answering in the `ApiError` shape and a quotable request id — the first route in
this application whose response size depends on what the caller asked for.

## What the user can see when this lands

**A URL that returns real price history**, readable in a browser: open it with a
symbol and a window and get NVDA's actual minute bars out of the 48-million-row
store, with provenance attached. That is not a feature and it is not nothing —
it is the first market data this system has ever served, and it is worth showing
on the call the way `/securities` was. **The application renders nothing new**;
the chart is Story 2.12's.

## Work

- **The read is already written and its name is `serveSeries` — added 2026-09-09
  by Task 2.9.5.** `apps/backend/src/serve-series.ts` takes
  `{ bars, provider, log }`, a symbol, a timeframe, a `TimeRange` and `now`, and
  returns `{ series, held, tail }`. The first two fields are `StoredSeries`'
  unchanged, so §6's three-way _unknown symbol / we hold nothing / nothing
  traded_ reading is the same reading it would have made of an unstitched read.
  Four things this route inherits rather than decides:

  - **A failing tail is never a 5xx.** `tail` is a `TailOutcome`, and every
    non-`ok` result has already been logged under the request's `reqId` — the
    module takes a structural logger and the route passes `request.log`. The
    provider's eight-member taxonomy must not reach the client; what reaches it
    is `coverage.covered`, which ends where the store ends. Do not map an
    outcome onto a status code.
  - **`provider: undefined` is not the 503.** `market-data.ts`'s 503 is for a
    route with _nothing_ to serve; a deployment reading no provider still serves
    stored history, and `serveSeries` returns `{ attempted: false, reason:
"no-provider" }` rather than failing. The 503 this route owes is the one for
    an unavailable **database**.
  - **`now` is a parameter.** The route reads the clock once and passes the same
    instant to `parseSeriesRequest` and to `serveSeries`; two readings is how a
    named window and a session bound end up disagreeing at midnight.
  - **`tail` is what Story 2.14's _"displaying data through 15:42"_ is built
    from**, and it is deliberately returned rather than only logged. Whether any
    of it reaches the payload is this task's call — `bar-series-response.ts`
    does not carry it today, and `coverage.covered` may well be enough.

- ~~**Declare `500: apiErrorSchema`**~~ **— the response schema is already
  written. Import it; do not write a second one (amended 2026-09-09 by Task
  2.9.3).** `barSeriesResponseSchema` is exported from
  `apps/backend/src/routes/market-data.ts` — the same file, because `/market-data`
  is the namespace as well as a resource — and it already declares **400, 404,
  503 and 500**, all sharing `apiErrorSchema`, which is `MARKET-DATA-API.md` §6's
  table as a declaration. A second schema written here would be the two-copies
  failure the guard exists to prevent, one layer up.

  The route-table walk still applies and still covers **every route the
  application serves**, including the ones registered from `index.ts` (Task 2.4.2
  closed that gap), so a route registered without the schema is a red test rather
  than a discovery in production.

  **One live trap the declaration creates and this task closes.** The schema
  declares `503: apiErrorSchema` and `SERVICE_UNAVAILABLE` **does not exist yet**
  — so a 503 raised before this task extends `API_ERROR_CODES` and `errors.ts`'s
  status-to-code mapping serialises cleanly through the right _shape_ while
  carrying `INTERNAL_ERROR`, which names the wrong thing. It is a well-formed
  answer that is wrong, which is the failure mode this repository keeps finding.
  Nothing can currently raise it, and this task is where it becomes reachable, so
  the member and the mapping land in the same change as the first `503`.

- **Map the domain object onto the wire, and that mapper is yours — added
  2026-09-09 by Task 2.9.3.** Nothing turns a `BarSeries` into a
  `BarSeriesResponse` today: 2.9.3 shipped the types and the schema and
  deliberately shipped no mapper, under Task 1.7.3's rule that a thing arrives
  with its first reader, and **this task is that reader**. It is the `toBar`
  pattern going outward — one function, never a generic mapper — and it does
  exactly three things worth naming: every `Date` becomes an ISO 8601 UTC string
  with the `Z` (`startsAt`, and both ends of both windows); `coverage.covered`
  becomes `null` rather than an object when the series is empty; and the branded
  `SeriesProvenance` becomes the plain `SeriesProvenancePayload`, losing a
  guarantee the wire cannot keep. Test it against a series built through
  `toBarSeries` rather than a literal, which is the arrangement 2.9.3's own tests
  already use.

- **Populate `securityStatus`, and it comes from the lookup that produces the
  404 — added 2026-09-09 by Task 2.9.3.** The envelope is
  `{ series, securityStatus }`, and the second field is `MARKET-DATA-API.md` §7's
  requirement made concrete: `status` is not filtered on this path, so an
  `untracked` symbol gets its stored history **and is told so**. It is on the
  envelope rather than on the series because it is a fact about the _security_,
  and Task 2.9.4's read cannot supply it — `BarSeries` has no such field and
  `toBarSeries` would not accept one. This route already has to ask whether the
  symbol is in the universe in order to answer the 404 at all, so the status is a
  second field off a lookup it is making anyway rather than a new query. It is
  **never null**: the unknown case is the 404, and §6's sentence is that a 404 is
  about the security, never about the data.

- **Pass the request's own instant to the read — added 2026-09-09 by Task
  2.9.4.** `readSeries(symbol, timeframe, range, now)` takes a clock for exactly
  one purpose: an answer holding **no bars** still owes a `SeriesProvenance` with
  one source, and that source's `retrievedAt` is the only value in the whole read
  that is not taken from a stored row. Everything else comes from
  `min(market_bars.recorded_at)`, deliberately, because a read path that stamps
  `retrievedAt` when it serves stored bars turns "fetched three weeks ago" into
  "current". This handler already resolves `now` for `parseSeriesRequest`'s named
  window — **pass the same instant**, rather than reading the clock twice, so one
  request cannot be answered as of two different moments.

- **Register it where its dependency is constructed**, following the one rule this
  repository settled rather than re-deciding it: `/health` needs nothing and lives
  in `buildServer()`; a route with a dependency is registered where its dependency
  is constructed, which for anything needing the pool is `index.ts`. Do **not**
  attempt to move the pool into `buildServer()` — three ways out are recorded and
  rejected in `routes/securities.ts`, and `database.ts`'s reversal trigger now
  names a **condition** (the repository becoming constructible without the
  application's logger) rather than this story.

- **Decide whether to declare a Fastify `querystring` schema at all, and produce
  the answer rather than assuming it — added 2026-09-09 by Task 2.9.2.** This is
  the first route in this application with a query string: every `schema:` in
  `src/routes/` today is a **response** schema, and `json-schema.ts` says in terms
  that `JsonSchemaProperty` models _"exactly the property shapes this
  application's responses actually use"_, so using it for a request is a widening
  somebody takes on purpose. Two traps, both of which make a green suite:
  a schema that validates the query **runs before the handler**, so a malformed
  timeframe answers with Fastify's message and never reaches `parseSeriesRequest`
  — leaving the five refusal reasons dead code for exactly the cases they were
  written for, and giving one request two error vocabularies. And Fastify's ajv
  **coerces by default**: `series-request.ts` types every query value `unknown`
  precisely so a repeated key (`?symbol=NVDA&symbol=AMD`, which arrives as an
  **array**) is refused, and coercion would quietly collapse that back into a
  string. Produce both before choosing — send the repeated key and the bad
  timeframe at a schema'd route and read what comes back.

- **`errors.ts` records a reversal trigger that this story FIRES, and it is a
  decision rather than a discovery — added 2026-09-09 by Task 2.9.2.** Its 4xx
  branch says: _"The day a 4xx message interpolates request content (a validation
  error naming a value, once request schemas exist), this is the line to revisit:
  it would be the client's own content coming back, which is not a leak, but it is
  reflection and should be a decision."_ That day is this task.
  `parseSeriesRequest` already interpolates the caller's own value into its
  messages — `` `${JSON.stringify(raw)} is not a well-formed US equity ticker` ``
  — and those messages become 400 bodies here. Take the decision, record it beside
  that comment, and note it is **reflection of the client's own input** and never
  server state: the 404 message deliberately does not name the route for the same
  reason, so the two should agree. Put it on Task 2.9.10's sweep list either way.

- **The five refusal reasons already exist; do not invent a second taxonomy.**
  `SERIES_REFUSAL_REASONS` is `symbol`, `timeframe`, `window`, `calendar-range`,
  `too-large` (Task 2.9.2), and **all five are 400s** — so the table below is not
  a mapping from those five, it is the mapping from _this route's_ whole failure
  surface, of which they are one row. The refusal carries its own `message`,
  already written for a person and already stripped of the calendar's
  internal "edit this file" instruction; pass it through rather than rewriting it.

- **Map each refusal to its status, and keep the mapping in one table** rather
  than scattered through the handler:
  - a malformed symbol, timeframe, window or a window outside the calendar's
    2024–2028 range → **400** and `BAD_REQUEST`, with a message naming what is
    wrong and, for the calendar, the range it covers;
  - a request over Task 2.9.1's cap → **400**, naming the limit;
  - a symbol that is not in the universe → **404**;
  - a symbol we hold nothing for, and a window nothing traded in → **200 with an
    empty series**, which is §36's whole point. **Task 2.9.4 built the way to tell
    those two apart and it is not on the series (added 2026-09-09):** `readSeries`
    returns `{ series, held }`, and `held` — the ledger row — is `undefined`
    exactly when we hold nothing for that `(symbol, timeframe)` and present when
    the window simply had no prints in it. Both are the same 200 body today, which
    is deliberate; what the distinction is **for** is this route's own logging and
    Story 2.14's wording, and it is available without a second query;
  - the database being unavailable → **503** and a **new `SERVICE_UNAVAILABLE`
    member of `API_ERROR_CODES`**, with `errors.ts`'s status-to-code mapping
    extended **in the same change** — a 503 raised without it answers
    `INTERNAL_ERROR`, which names the wrong thing. This is not a fresh decision:
    `database.ts` records it in terms for this story to _implement rather than
    re-take_, and `routes/securities.ts` says _"a connection that fails … is still
    Story 2.9's"_. **`/diagnostics/database` is NOT the precedent** — it answers
    **200 whatever the answer is**, on purpose, because "is the database
    reachable" is a question it answers correctly when the answer is no. See
    `MARKET-DATA-API.md` §6, whose first draft got this wrong;
  - the provider failing while Task 2.9.5 fetches the tail → **200 with the stored
    part**, coverage ending where the store ends. §36: a partial answer is a
    product state, not an error;
  - anything uncaught → **500**, and **the thrown message never reaches the
    client** (Task 1.7.4's rule) — it goes to the log under the request's `reqId`.

  **One named 500 arrived with Task 2.9.4 and is worth knowing rather than
  discovering (added 2026-09-09).** `toStoredSeries` throws `MissingCoverageError`
  when the store holds bars for a window the ledger makes no statement about — the
  read refuses to fabricate a coverage claim rather than deriving one from the
  bars, because both available derivations are false statements about what we
  hold. It is unreachable through `recordSeries`, which writes bars and ledger in
  one transaction, and reachable by anything that deletes from `bar_coverage`
  alone. So it is an **inconsistent store** rather than a bad request: a 500 is
  the right answer, its message is a developer's and must not reach the client,
  and it belongs in the status table above with the rest.

- **`fast-json-stringify` strips every property the schema does not declare**, so
  assert the stripping property **on the real route** with a `preSerialization`
  hook — an `onSend` hook is handed a string that has already been stripped. And
  remember the trap that makes a green leak test worthless: adding a field to a
  handler leaves the test green until the field is declared in the schema too.

- **Test through `app.inject()`**, which is where this repository's integration
  tests live, over a stub read so the suite needs no database — that property is
  what keeps `pnpm verify` runnable with no server, no network and no credentials,
  and it is worth protecting deliberately rather than by luck.

  **Re-point the six tests you inherit rather than writing a second set — added
  2026-09-09 by Task 2.9.3.** That task's schema tests live in
  `routes/market-data.test.ts` and drive a **throwaway route** registered inside
  the test, because the real one did not exist yet. They cover the round-trip, the
  null `covered` on the raw body, the empty series' surviving facts, a two-source
  stitch, an `untracked` security, and the silent stripping of an undeclared
  field. Once this route exists they should be asserting against **it** — a suite
  that goes on testing a stub path beside a real one is a suite whose green tells
  you about the stub. Two of them cannot simply move and want a decision: the
  stripping test needs the `preSerialization` hook this task's own bullet
  describes, and the two-source stitch needs Task 2.9.5's stub provider rather
  than a hand-built series.

- **Once `SERVICE_UNAVAILABLE` exists, `/securities` should answer it too.** That
  route has been able to produce this failure since Story 2.4 and returns a 500
  today only because the code did not exist — its own comment says so. Taking it
  here is a two-line change in the story that added the member; leaving it is a
  second answer to one question. Record whichever you do.

- **Do not add a search parameter and do not add a second "which feed" field.**
  Search is Story 2.11's and has an open decision this must not settle by accident;
  the feed question has one home already.

## Done when

- The endpoint answers with a real series from the real store, with a matching
  `x-request-id`
- Every row of the status table above has a test, and the 5xx path is asserted to
  carry the `ApiError` shape and **not** the thrown message
- The querystring-schema question is answered with a produced result, and every
  one of Task 2.9.2's five reasons is shown to reach the client as a 400 rather
  than being intercepted upstream
- The route serves `barSeriesResponseSchema` rather than a schema of its own, and
  `securityStatus` is asserted `untracked` against a real untracked security
- `SERVICE_UNAVAILABLE` and `errors.ts`'s mapping land in the same change as the
  first 503, asserted to carry that code rather than `INTERNAL_ERROR`
- Task 2.9.3's six schema tests drive the real route rather than a throwaway one
- The route-table walk sees the route and its `500: apiErrorSchema`
- `pnpm verify` passes with no database running

## Notes

Quote a real response in the task's write-up — a symbol, a window, the byte count
and the timing — rather than describing one. Task 2.9.9 takes the measurements
properly; this one just proves the thing answers.

---

## What was done — 2026-09-09

`GET /market-data/bars` serves a real series out of the 48-million-row store,
and every row of §6's status table has a test and a produced example.

### The response, quoted rather than described

`GET /market-data/bars?symbol=NVDA&timeframe=1m&start=2026-09-04T13:30:00Z&end=2026-09-04T20:00:00Z`
against the local store, backend built and run from `dist/`:

```
status=200  bytes=44,701  total=0.036s
x-request-id: 43d3e1bc-b44d-4c5f-af61-e7bcdff52a43
content-type: application/json; charset=utf-8

bars      390
first     {"startsAt":"2026-09-04T13:30:00.000Z","open":231.14,"high":231.2,
           "low":229.82,"close":230.1875,"volume":2688585}
last      {"startsAt":"2026-09-04T19:59:00.000Z","open":230.28,"high":230.4,
           "low":230.15,"close":230.345,"volume":2151390}
prov      {"adjustment":"raw","sources":[{"provider":"alpaca","feed":"sip",
           "retrievedAt":"2026-09-08T07:28:40.261Z","barCount":390}]}
cov       requested 13:30→20:00, covered 13:30→20:00
status    active
```

A whole session, 390 bars, 44.7 kB, 36 ms end to end including the curl. Task
2.9.9 takes the measurements properly; this one proves the thing answers.

Every failure, from the same running instance:

```
?symbol=NVDA&timeframe=5m&sessions=1        400 {"code":"BAD_REQUEST","message":"\"5m\" is not a timeframe. Expected 1m or 1d."…}
?symbol=nvda&timeframe=1m&sessions=1        400 …"\"nvda\" is not a well-formed US equity ticker…"
?symbol=NVDA&timeframe=1m                   400 …"No window given. Pass ?sessions=5 …"
?symbol=NVDA&symbol=AMD&…                   400 …"The symbol was given more than once. A series is for one symbol."
?…start=2019-01-02…                         400 …"That window reaches 2019-01-02, outside the trading calendar this system covers — 2024-01-01 to 2028-12-31."
?…start=2026-01-02…&end=2026-09-04…         400 …"That window is 66,300 bars and one response carries at most 10,000."
?symbol=ZZZZ&timeframe=1m&sessions=1        404 {"code":"NOT_FOUND","message":"ZZZZ is not a security this system tracks…"}
database unreachable                        503 {"code":"SERVICE_UNAVAILABLE","message":"Market data is temporarily unavailable. Try again shortly."}
```

All five of Task 2.9.2's refusal reasons reach the client in the parser's own
words, which is the property the querystring decision below is about.

### The querystring-schema question, answered with a produced result

**No `querystring` schema.** Both traps were produced against Fastify 5 with its
default ajv, on a throwaway route, before the choice was made:

```
schema'd  ?symbol=NVDA&symbol=AMD&timeframe=1m
          → 400 {"code":"FST_ERR_VALIDATION","message":"querystring/symbol must be string"}
schema'd  ?symbol=NVDA&timeframe=5m
          → 400 {"code":"FST_ERR_VALIDATION","message":"querystring/timeframe must be equal to one of the allowed values"}
bare      ?symbol=NVDA&symbol=AMD&timeframe=5m
          → the handler sees symbol as an ARRAY and timeframe as the string "5m"
coercion  sessions declared `integer`, ?sessions=5 → the handler sees the NUMBER 5
coercion  symbol declared `array`,     ?symbol=NVDA → the handler sees ["NVDA"]
```

The deciding one is the first pair: a schema answers **before the handler**, in
Fastify's vocabulary, and _"must be equal to one of the allowed values"_ does not
say what they are. That would leave five carefully written refusal reasons dead
for exactly the inputs they exist for, and give one request two error
vocabularies. The coercion pair is the second argument: `series-request.ts` types
every query value `unknown` so a repeated key is refused, and a schema would
rewrite the input on its way to the parser that exists to judge it. The reversal
trigger is a query parameter whose validation `parseSeriesRequest` cannot
express.

**Verified by substitution rather than by reasoning**: declaring the obvious
querystring schema on the real route turns two tests red — the bad timeframe and
the repeated key — and nothing else.

### `SERVICE_UNAVAILABLE`, and the classifier that decides who gets it

The member, `errors.ts`' status-to-code mapping and its own constant message
landed in one change, as §6 requires. Substituted to check it: removing the 503
branch from `codeFor` fails on `expected 'INTERNAL_ERROR' to be
'SERVICE_UNAVAILABLE'` — the **code**, not the status, which is the failure that
would otherwise look like success.

The question the task did not settle — _which thrown errors are "the database is
unavailable"_ — is answered by `isDatabaseUnavailable` in `database.ts`, beside
the decision it implements. An allowlist: Node's connection errors, SQLSTATE
class `08`, `57P01`–`57P03`, `53300`/`53400`, and `pg-pool`'s
connection-timeout message. **It errs towards 500** — anything unrecognised stays
ours, because telling a client to retry something that cannot succeed is worse
than the reverse. `MissingCoverageError` reaches its 500 by exactly that route.

One honest gap, recorded rather than hidden: the connection-timeout message is
matched as a **string copied from `pg-pool@3.14.0`**, and nothing re-checks it,
because producing it needs a pool that fails to connect and `pnpm verify` has no
network. An upgrade that rewords it silently downgrades a timed-out pool from 503
to 500. It belongs on CLAUDE.md's _stated invariants nothing checks_ list; the
re-measurement is one `grep` and it is written beside the constant.

**`/securities` took the member too**, rather than leaving it to Task 2.9.10. It
has been able to produce this failure since Story 2.4 and answered a 500 only
because the code did not exist. Both routes now share one wrapper,
`throughDatabase`, so the same outage cannot get two answers. Produced: a backend
pointed at a closed port answers `503 SERVICE_UNAVAILABLE` on both, logs
`connect ECONNREFUSED 127.0.0.1:59999` at `warn` under the request's `reqId`, and
puts none of it in the body.

### The reflection decision `errors.ts` asked for

Taken and recorded beside the 4xx branch: **a 4xx message may reflect what the
client sent, and may never name server state.** The 404 already declines to name
the route, and the two now agree by decision rather than by accident. The
alternative — a generic message with the specifics in the log — was refused
because the caller is the only party who cannot read the log, and it fails at
exactly the moment somebody is holding the API wrongly.

### Decisions the task left to this reader

- **`tail` is not on the payload.** Every non-`ok` outcome is already logged
  under the request's `reqId`, the provider's eight-member taxonomy is internal,
  and what a client needs for _"displaying data through 15:42"_ is
  `coverage.covered` — which ends where the answer ends whether the tail
  succeeded, was declined or failed. One field that is always true beats two that
  can disagree. Asserted: a failing tail leaves no `upstream-unavailable` and no
  vendor message anywhere in the body.
- **`held` is logged, not served.** The two empty answers — _we hold nothing for
  this security_ and _the window had no prints_ — are the same 200 body by §6, and
  the distinction goes to a `debug` record with the ledger's presence on it.
- **Both routes live in one plugin**, because `/market-data` is the namespace as
  well as a resource. `createMarketDataRoutes` now takes a named dependency
  object rather than three positional arguments.
- **`findSecurity` is a new repository function**, not a filter over
  `listSecurities`: the route asks about one symbol, and it returns the whole
  `Security` so `securityStatus` is a second field off a lookup it was making
  anyway. It does not filter on `status`, which is what lets an untracked
  security be served its stored history and be told it is untracked.

### Tests

Task 2.9.3's six schema tests now drive the **real route**; the throwaway path is
gone. Two of them are strictly stronger than before: the stitch is produced by
`serveSeries` against a stub provider declaring `iex` over a store holding `sip`,
rather than assembled by hand, and the stripping test runs on the real payload
through a `preSerialization` hook — with a _declared_ field also changed by the
hook, so a hook that never ran cannot pass it vacuously.

`pnpm verify` passes with no database, no network and no credentials;
`pnpm test:database` passes with 157 tests, three of them new for `findSecurity`.
The route-table walk sees `/market-data/bars` and its `500: apiErrorSchema`.

### Swept upward the same day

- `README.md`: _"Nothing serves data yet"_, the two-route address table, the
  "entire surface" sentence in the security-posture section, _"It has three
  members"_, and the quoted set of failures the server produces.
- ADR 0018: a dated amendment — _"the defined behaviour for a caller with no
  provider is a 503"_ is **narrower than it reads**, and does not cover this
  route, which serves stored history with no provider configured and answers 200.
- ADR 0014: a dated amendment — the code it says does not exist now does;
  `/diagnostics/database` is unchanged and still answers 200 either way.
- `database.ts` and `routes/securities.ts`: the sentences that said the member
  did not exist are marked superseded rather than deleted.
- `MARKET-DATA-API.md` §6 and this story's task table.

---

## For the stakeholders — what this actually did

**In one line: MarketPulse can now be asked for a stock's price history over the
internet, and it answers with real market data.**

Until today the two and a half years of minute-by-minute prices we have been
collecting — about 48 million of them — sat in a database that only our own
maintenance scripts could reach. There was no way for the application, or for
anything else, to ask for them. This task built the door.

You can now type a web address like _"NVDA, one-minute bars, last Friday's
trading session"_ into a browser and get back that day's 390 price bars in about
a thirtieth of a second. That is the first market data this system has ever
served to the outside world. **The screen has not changed** — there is still no
chart, and building one is a later task — but every chart we ever draw will be
fed by what was built today.

Three choices are worth explaining, because they are the difference between a
product and a demo.

**When we only have part of what you asked for, we say so.** Ask for a whole
day and we will tell you not just what we have, but the exact window we were
able to cover. That sounds like a small thing. It is the foundation of the
promise this product makes: a user is never shown a chart that quietly stops
early and looks complete. The alternative — returning what we have and staying
quiet about the gap — is how a market tool misleads somebody who is making a
decision.

**When something goes wrong, we say which kind of wrong it is, in plain
English.** Ask for a timeframe we do not support and you are told _"5m is not a
timeframe. Expected 1m or 1d."_ Ask for a stock we do not follow and you are told
so, with a pointer to the list of ones we do. If our database is unreachable, you
get a distinct answer that means _"this is temporary, try again"_ — which is
genuinely different information from _"this system is broken"_, and worth the
extra care it took to tell them apart correctly. Every one of these answers also
carries a reference code that appears in our logs, so any complaint can be traced
to the exact request that caused it.

**What we tell a user and what we tell ourselves are deliberately different.**
When the database was unreachable, the internal log recorded the server address
and the exact network failure — and the public response said only that market
data was temporarily unavailable. That separation is not politeness; a public
endpoint that reports its own internal plumbing is a public endpoint that helps
somebody attack it. We checked this by actually breaking it and reading what came
out, rather than by assuming.

One more thing worth reporting because it reflects how we work: we deliberately
declined a shortcut. There is a standard, easy way to make a web framework check
incoming requests automatically. We tried it, measured what it did, and found it
would have thrown away the careful, human-readable error messages we wrote last
week and replaced them with generic framework jargon. So we kept our own
checking. The evidence is written down, so nobody has to re-litigate it.

**Where this leaves the product.** The historical data layer is now reachable.
The next task puts the first real price on the screen — the last closing price
beside each of the 518 securities we track — which is the moment this stops being
plumbing and starts being visible. The chart itself follows shortly after. In
terms of the overall plan, this is the last big piece of _"select a security and
explore its historical data"_, which is the base everything else in MarketPulse —
the anomaly detection, the investigations, the replay — is built on top of.
