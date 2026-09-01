# ADR 0007 — Logging, the error contract, and failure containment

**Status:** Accepted
**Date:** 2026-09-01
**Delivered by:** Epic 1, Story 1.7 (Tasks 1.7.1–1.7.7)

## Context

Both applications run, both are configured, and neither has a story about
failure. The backend logs at Fastify's defaults — a per-process counter for a
request id, pino's inherited request record, Fastify's own error bodies, and a
crash printed to raw stderr by Node. The frontend has no error boundary at all,
so any exception thrown during render unmounts the entire application and
leaves an empty `<body>`.

PRODUCT_SPEC.md §36 is the constraint that makes this a story rather than a
chore: failures must degrade **locally**. A failed analytical tool (Epic 7), an
unavailable SEC endpoint (Epic 9) and an agent that gives up (Epic 10) are all
product states, and every one of them is expected to reuse whatever shape is
established here. So the pattern matters more than the code does.

Three things shaped the decisions more than the logging question did:

- **There is one route.** `GET /health` is the entire API surface. Anything
  justified by "we will have many endpoints" is being bought at the wrong
  scale, and anything claimed about a failure has to be produced by a server
  with one route before it is written down
- **The two halves of the stack have different destinations.** The backend
  writes structured JSON to stdout, which something downstream collects. A
  browser has no second stream — an uncaught error is already in the console.
  The same analysis therefore reaches opposite answers on the two sides, and
  that is the single most useful thing in this document
- **Story 1.6 decided there is no environment concept.** Nothing branches on
  which environment it is in; what differs is where _values_ come from. A log
  format is the first thing that plausibly needs to break that, so it was the
  decision's first real test

## Decisions

### 1. `LOG_LEVEL` and `LOG_FORMAT` are ordinary configuration values, and the environment concept survived

`LOG_FORMAT` is `json` (default) or `pretty`, read by `apps/backend/src/config.ts`
through the same `readEnum` reader and the same precedence rule as `PORT`. What
makes development different is not a branch: it is that
`apps/backend/scripts/dev.sh` — the file that _is_ the development loop —
exports `LOG_FORMAT=pretty`. Nothing in the application asks which environment
it is in.

Two alternatives were rejected for stated reasons, and this section exists
because "surely this is what `NODE_ENV` is for" is the obvious later thought.

- **`NODE_ENV`** would reverse Story 1.6's decision to buy nothing over a value
  the same readers already handle. Task 1.2.5 had already measured that
  `NODE_ENV=production` produces a stream identical to the default run, line for
  line, so there was no inherited behaviour to preserve either
- **Piping `dev.sh` through `pino-pretty`** costs two things the export does
  not. A pipeline's exit status is the last command's, so the server's exit code
  stops propagating — Task 1.2.5 verified that it currently does — and
  `node --watch` stops being the shell's foreground process, which is what
  `dev.sh`'s trap relies on

`LOG_LEVEL` admits pino's whole vocabulary — `fatal`/`error`/`warn`/`info`/
`debug`/`trace` plus `silent` — rather than a curated subset, because a
narrower list is a second vocabulary to keep in step with the logger's own.
`silent` is admitted deliberately for Story 1.9's test runner.

`buildServer()` **takes** `{ logLevel, logFormat }` and defaults neither. A
default there would be a second copy of `config.ts`'s, and two copies of a
default is how they stop agreeing.

### 2. `pino-pretty` is a `dependency`, not a `devDependency`

Nothing `import`s it. The transport resolves the target **by name, at runtime,
from a string**, so a pruned production tree turns the documented
`LOG_FORMAT=pretty` into `ERR_MODULE_NOT_FOUND` at startup — in the one
environment that is hardest to debug.

The rule this refines generalises past this story: **the house test keys on
resolution at runtime, not on the `import` keyword.** 448 kB across 12 packages
is the price of a documented value not being a trap.

### 3. The correlation id is a UUID, an inbound one is honoured but validated, and `requestIdHeader` is deliberately unused

`genReqId` is `crypto.randomUUID()`. Fastify's default is a per-process counter
starting at 1, which looks cheaper until you notice it collides across every
restart and across every instance Story 1.11 might run — the id's whole job is
to be unique in the log somebody is searching.

An inbound `x-request-id` is honoured, validated against
`^[A-Za-z0-9_-]{1,128}$`, and **a failing value is dropped rather than
sanitised, because a repaired id is a different id**. The pattern excludes
whitespace, control characters, quotes and commas; a raw-socket attempt to close
the JSON object and forge a log record (curl refuses to send one) was rejected
by the pattern, with zero forged lines in the log.

Two alternatives, both of which look like improvements:

- **Fastify's own `requestIdHeader`** adopts the header with **no validation at
  all**, and defaults to `false` in 5.12.1 — so nothing was being honoured
  before, and turning it on is a regression dressed as a simplification
- **A W3C `traceparent`** is the standards-compliant-looking answer. It was
  rejected as a propagation _model_ that Epic 10 should adopt whole rather than
  cargo-culting its header. This is the same judgement as §5's rejection of RFC
  9457, and the two together are the general habit: **taking a standard's field
  names without its mechanism is the shape of the thing without the thing**

### 4. The request record is chosen, and `remoteAddress` went for a reason that is not privacy

The `req` serialiser emits **`method` and `url` and nothing else**. `res` is
left as Fastify's one-field default, because restating a one-field default is a
second copy to keep in step for no gain.

`host` went because it is this server's own bind address. `remoteAddress` and
`remotePort` have an obvious privacy dimension — and that is **not** the
deciding argument. Behind Story 1.11's proxy they become the _proxy's_ address,
so they would be a field that is quietly **wrong** rather than one that is
merely absent. That generalises to every field this application ever logs about
its caller: a value that will be right in development and wrong in production is
worse than no value.

`url` and not `path`, so the query string is logged. That rests on the standing
rule that personal data never goes in a URL, which is load-bearing here now.

The serialisers sit beside `level` and **outside** the conditional `transport`
spread. A serialiser added inside that spread would apply in `pretty` only.

### 5. `ApiError` is flat, and `requestId` is why

The wire contract is `{ code, message, requestId, details? }` — a **wire shape,
not an `Error`** — declared once in `packages/shared`.

Flat rather than `{ error: { … } }`, decided on one question rather than on
taste: **`requestId` is a property of the response, not of the failure.** The
same id is on a successful response as the `x-request-id` header. Inside a
wrapper it is misfiled; outside one, the payload has two levels for four fields.
The HTTP status has already done the wrapper's usual job.

- **RFC 9457 `application/problem+json` was rejected** because its discriminator
  is a `type` **URI** meant to dereference to documentation. Taking the field
  names without the URIs is the shape of the thing without the thing — see §3.
  Its `title`/`detail` pair is also prose where `code` is a union
- **`code` is a union whose every member is measured**, not anticipated: it
  names a failure the server can be _made_ to produce. See §9
- **`details` is `readonly string[]`, never a `Record<string, unknown>`**,
  because an open-ended object is the field a leak arrives through. Every entry
  is a sentence already fit to show a user
- **`statusCode` and `timestamp` are deliberately absent.** Fastify's own
  default body carries a `statusCode`, which is a second place for the status to
  be wrong; the log record already has a timestamp and the correlation id
  already joins them

It is a **transport** error and not a `Finding`. Invariant 5's
`CONFIRMED`/`SUPPORTED`/`POSSIBLE`/`UNKNOWN` and "not enough evidence to explain
this move" are a **successful** response, and conflating the two would be
expensive to unpick.

The contract shipped **unused** for exactly one task. Half-wiring a handler to
avoid that was the alternative and was worse.

`exactOptionalPropertyTypes` bit in real code here for the first time. The
obvious constructor — `return { code, message, requestId, details }` with an
optional parameter — is **TS2375**, because the parameter infers as
`readonly string[] | undefined` and that is not an optional `readonly string[]`.
So `apiError()` branches and builds the object two ways. That is not style: it
is what makes an absent `details` genuinely absent rather than explicitly
unknown, which is the domain distinction the setting exists for.

### 6. `REQUEST_ID_HEADER` moved to `packages/shared`; the generator and the validation did not

Only the **name** moved. Generating an id and validating an inbound one are
server behaviour with a threat model behind them, so they stay in
`apps/backend/src/request-id.ts`, which imports the constant.

The rule this settles generalises: **shared means both sides depend on the same
fact, not "shared is where types go".** Story 1.6 is the contrast that makes it
legible — it declined to put the _configuration_ type there, because the two
apps share no environment variable, so that would have been a shared file with
one consumer.

The cost is real and stated in the file: shared is consumed as **built output**,
so changing the error shape means rebuilding before either app typechecks
against the change. `pnpm build` and `pnpm verify` order that; a bare
`tsc --noEmit` in an app passes against the previous shape.

### 7. Response schemas are Fastify's own JSON Schema, per route, and the reason is the serialiser

ajv and `fast-json-stringify` arrive with Fastify, so this is **zero packages**.

Story 1.6's argument against a schema library does **not** transfer and was not
reused: that was a schema over `process.env`, which is a schema over strings. A
response body is typed data, which is the case a schema is actually good at.

The reason to have one is not validation. Fastify serialises through
`fast-json-stringify`, which **strips every property the schema does not
declare** — measured on a live route: a body carrying `secret: "hunter2"` and
`internalPath` reached the wire as `{"ok":true}` with a schema in place and
verbatim without one. That is a _mechanism_ behind "no internal detail reaches a
client" rather than a habit of remembering.

It is not a tax either: the same route over 20 000 `app.inject()` calls is
11.9 µs with a schema against 14.9 µs without.

### 8. The `satisfies Record<keyof T, JsonSchemaProperty>` guard, which closes a silent-failure class

Add a field to `HealthResponse`, forget the schema, and it disappears at runtime
with a green `tsc -b`, a green lint and a green build. That is the **fourth**
silent-failure class in this repository, beside the misspelled CSS Module class,
the missing `.js` import extension and the unchecked router path.

The other three are recorded as accepted. **This one was closed**, for three
lines and no dependency: declaring the schema's properties
`satisfies Record<keyof HealthResponse, JsonSchemaProperty>` makes a field on the
interface and not in the schema a **TS1360** naming the missing property, and a
property in the schema that is not on the interface an excess-property error.
`required` is `Object.keys(properties)` so it cannot fall behind.

**Copy this idiom for every new route.** `JsonSchemaProperty` lives in
`apps/backend/src/json-schema.ts` precisely so there is one copy of it; two
copies of that type is how two schemas stop agreeing.

The error schema does **not** copy the idiom verbatim, and the one difference is
the trap. `/health` derives `required` from `Object.keys(properties)`, which is
exact only because every field of `HealthResponse` is required. `ApiError.details`
is optional, so the same derivation would mark it required and 500 at runtime on
**every** error without details — which is every error this application produces.
So `required` there is a literal of three, and the `satisfies` guard carries over
unchanged.

What the guard does **not** close, known and dated 2026-09-01, both re-measured
in Task 1.7.7:

- **A declared JSON type disagreeing with the TypeScript one is coerced
  silently.** A `number` declared `"string"` went out as `"1.5"`
- **A `required` property the handler omits is a 500 at runtime**, not a compile
  error. Note this got quieter rather than louder: before Task 1.7.4 it was
  Fastify's `"b" is required!` on the wire; now the error handler catches the
  serialisation failure and answers a generic `INTERNAL_ERROR`, with the detail
  in the log. Better for a client, harder to spot in development

Deriving the type from the schema (`json-schema-to-ts`, or a Fastify type
provider) is the alternative that closes both, at the price of a dependency.
That is the reversal trigger.

### 9. Both of Fastify's failure paths are replaced, because there are two of them

`setErrorHandler` **never sees an unmatched route** — Fastify answers that
through `setNotFoundHandler`. Registering only the first leaves "API errors use
a single consistent shape" false the first time anyone mistypes a URL.

Both are registered on the root instance inside `buildServer()`, which is what
gives Story 1.9's `app.inject()` instances the contract for free. Anything
registered in `index.ts` would not be under test.

The two defaults they replaced were measured first, and their **field order
differs between them** — `{"message":…,"error":…,"statusCode":404}` against
`{"statusCode":500,"error":…,"message":…}` — which is the visible evidence they
came from different places.

The mapping is status-first: 404 → `NOT_FOUND`, any other 4xx → `BAD_REQUEST`,
5xx → `INTERNAL_ERROR`, and an error carrying no `statusCode` (or one outside
400–599) is a **500**. An error handler running at all means something failed,
and a reassuring status would be a lie.

### 10. `BAD_REQUEST` exists because of a measurement, and the measurement is easy to get backwards

The union's test is a member per failure that can be **produced**. With a single
`GET /health` route and nothing in the tree accepting a body:

- `POST /health` with `content-type: application/json` and a malformed body is a
  **400** (`FST_ERR_CTP_INVALID_JSON_BODY`)
- A 2 MB body is a **413** (`FST_ERR_CTP_BODY_TOO_LARGE`)
- An **unparseable content type resolves to a 404**, so a 415 is not reachable
  and `UNSUPPORTED_MEDIA_TYPE` was not added

Both of the first two are reachable because Fastify's content-type parser runs
**before** its not-found handler.

One member covers 400 and 413 together, decided on what a client branches on:
both mean "your request was not acceptable, fix it and retry", and the status
line still carries the difference. **The reversal trigger is a caller that has to
behave differently on a 413.**

### 11. There is no production-detail switch, and the stack was never the whole risk

There is no `ERROR_DETAIL` variable and no environment branch. A switch whose
misconfiguration leaks — silently, outward — is the same shape Task 1.7.1
rejected `redact` for. **Safe by construction beats safe when configured
correctly**, and the correlation id makes withholding free.

The finding that reframed this: Fastify's default already withheld the stack and
returned the thrown **message** verbatim. A route throwing
`connection to postgres at 10.0.0.4:5432 refused` answered with exactly that
string. So a generic 5xx message — not stack suppression — is the change that
actually closed criterion 6. A message written for a developer is internal
detail too, and it is the half that looks harmless.

A 4xx passes Fastify's own message through, because it describes the client's
own request. The line to revisit is the day a 4xx message interpolates request
content, which request schemas would bring.

This is also the **second** consecutive test of Story 1.6's "nothing branches on
the environment", after `LOG_FORMAT`. Two consecutive tests is what makes it a
rule rather than a survival.

### 12. Criterion 6 has two mechanisms and only one of them is universal

- **`apiError()` covers every path.** It builds an object with four slots and no
  room for a fifth, so nothing can leak from anywhere
- **The response schema is per-route and opt-in.** Measured both ways: a body
  the error handler decorated with `stack` and `cause` reached the wire as the
  four contracted fields on a route declaring `500: apiErrorSchema`, and with
  both extras intact on one that did not

The structural gap that follows: **`setNotFoundHandler` is not a route and can
never carry a response schema**, so the serialiser is unavailable on the 404 path
and the constructor is what has to hold there.

Declare `500: apiErrorSchema` on every route that can fail. **Nothing in
`pnpm verify` checks that you did** — see the Consequences section.

End to end: a thrown error carrying `cause: { dsn: "postgres://user:…@…" }` and a
`query` property put both on the level-50 log record with the full stack, and
neither on the wire.

### 13. Log levels split by error class, and the split is Fastify's own

5xx at `error` (50), 4xx at `info` (30), through `request.log` so every record
carries `reqId`. Both were measured on Fastify's defaults before being kept, so
this preserves a split rather than inventing one.

`info` and not `warn` for the 4xx, for a reason beyond aggregator noise: Task
1.7.1's property is that at `LOG_LEVEL=warn` a healthy server is completely
silent, and **a server answering 404s is healthy**. `warn` would break that.

The cost, stated with it: **at `warn` a 404 leaves no trace at all.**

The record count did **not** move — three records per failure before and after —
because Fastify's own error logging lives in the default handler these replace.
The not-found handler logs `route not found` explicitly for that reason: without
it, replacing Fastify's handler would have removed its record and left a 404
nobody could investigate.

### 14. The 404 message does not name the route, and Fastify's did

Reflecting an unvalidated request URL into a response body is a shape worth not
having even where the JSON serialiser makes it harmless. The deciding argument is
smaller and better: **the client already knows which URL it asked for**, so the
reflection buys it nothing, while the log record has the method and the url
beside the same correlation id.

The general habit, worth naming once: unvalidated input does not go back out in a
response body for a benefit the caller already has.

### 15. Two crash handlers, replacing a **stream** rather than a silence

The acceptance criterion says "rather than crashing the process silently", and
the baseline was measured before anything was written: **Node 24 already prints a
stack for both an `uncaughtException` and an `unhandledRejection`, and already
exits 1.**

What it does not do is put that stack in the **log stream**. It is raw stderr
with no level, no timestamp, no pid and nothing an aggregator indexes, while
every other record this process writes is JSON on stdout — so a deployment
collecting stdout loses the crash and keeps everything else. **The change is the
stream.**

Node's two defaults are also **indistinguishable from each other** on stderr
(since Node 15 an unhandled rejection is thrown and prints exactly like an
uncaught exception), which is what the `event` field exists for.

They live in `index.ts` and not in `buildServer()`, for the same reason the
signal handlers do: process-wide handlers installed by a factory are a surprise
for anything building two instances, which Story 1.9 will. They log through
`app.log` because a process-level handler is handed an **error, not a request** —
which is the mechanical reason a crash record has no `reqId`.

### 16. A crash ignores `LOG_LEVEL`, and the exception is exactly one record wide

The rule in two clauses: **ordinary traffic obeys the level; the process dying
does not.** §13's 4xx-at-`info` is the other half of it.

`app.log.level` is set to `fatal`, the record is written, and **the previous
level is restored**. The restore is not tidiness. The first implementation left
it mutated, and a crash-during-drain run silently lost `shutdown complete`; the
ceiling's level-50 `shutdown timed out, forcing exit` would have gone the same
way. The detail that made the loss look _selective_ rather than total: Fastify's
per-request child loggers keep the level they were created with, so request
records carried on appearing while the root logger's went quiet.

Without the exception, `LOG_LEVEL=silent` would give a process that dies leaving
**nothing at all** — not even Node's stderr stack, because these handlers are
what replaced it.

The level is **mutated** rather than a stderr line hand-rolled, so there is one
rendering of a log record: same serialisers, same format, `pretty` still pretty.

### 17. A crash does not drain, deliberately

There is no `app.close()` on this path. Draining would serve remaining requests
from a program that has already proved it is not the program you thought, and it
stacks a second failure on the one being reported. **In-flight requests are
dropped on purpose** — a decision, not an oversight — and the 5-second ceiling
covers only the signal path.

A crash **during** a shutdown reuses the `shuttingDown` flag: the record is
written, the function returns, and the existing drain finishes. Measured against
a deliberately slow route: `shutdown complete`, exit **0**, and the in-flight
request answered 200.

Exit code is **1**, like every other failure path in this file.

### 18. There are three failure experiences, not two

| Experience                                         | What the client gets                                                                                 | What the log gets                                                                           |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Contained 5xx**                                  | `{"code":"INTERNAL_ERROR",…,"requestId":"…"}` + `x-request-id`; the server carries on                | level 50 with the full stack under that `reqId`                                             |
| **Crash with a request in flight**                 | `curl: (52) Empty reply from server` — **no body and no headers at all**, so not even an id to quote | one level-60 record, no `reqId`                                                             |
| **Crash detached from the request that caused it** | **200 with a valid `x-request-id`**, then the process dies milliseconds later                        | a record correctly saying the request succeeded, and a level-60 record beside it with no id |

The second is the one hole in the shape §12 made universal. The third is the one
Story 1.11's operator needs to know exists **before** reading a log with it in:
the id the user holds points at a record saying their request succeeded, because
it did. That is why "quote the id and find the entry" is a rule with a stated
exception rather than a guarantee.

### 19. Three error boundaries, and the region's one is _inside_ the `<section>`

One boundary around `AppHeader`, one around the route outlet, and one **inside**
each `Region`, wrapping the content slot. React uses the nearest boundary, so a
failure in a region's contents never reaches the outlet.

- **Not just one at the router.** Task 1.5.5 already measured that shape with
  `<Suspense fallback={null}>`: `AppHeader` renders perfectly and the **entire**
  `<main>` — four named landmarks and the 70vh grid — goes blank underneath it.
  A boundary at the router blanks the page body; a boundary at a region blanks a
  box. That is the degenerate case the criterion exists to rule out
- **Inside rather than around the `<section>`.** A boundary outside it replaces
  the heading along with the contents, so a failed box loses its name, its
  landmark and its place in §9's grid. Inside, all three survive and a failed
  region is a labelled box with a problem in it
- **The outlet's boundary** is for the four routes that are deliberately a
  single area — there the outlet _is_ the affected region — and for a failure in
  the landing route's own frame
- **The header's boundary reads as optional and is not.** Measured by removing
  it and rebuilding: a throwing `AppHeader` leaves `#root` with **zero
  children** and an empty `<body>`, because it is the one component with nothing
  above it. Its cost is stated rather than discovered — the fallback replaces
  the `<header>`, so a broken chrome takes the banner landmark and the
  navigation with it

### 20. The contained/uncontained split, resolved **oppositely** on the two halves of the stack

This is the section worth carrying forward whole, because the same analysis
produced different answers for a reason that is not arbitrary.

Each half has a mechanism for failures inside its normal flow, and a question
about what escapes it:

|              | Inside the flow                  | What escapes it                                 | Answer              |
| ------------ | -------------------------------- | ----------------------------------------------- | ------------------- |
| **Backend**  | the two error handlers (§9)      | `uncaughtException` / `unhandledRejection`      | **installed** (§15) |
| **Frontend** | the three error boundaries (§19) | event handlers, `setTimeout`, promise callbacks | **declined**        |

The backend's handlers earned their place because the default put a crash on the
**wrong stream**. The browser has no second stream: an uncaught error is already
in the console with its stack, which is exactly where a report would go — so a
`window` error listener would repeat what is already there while also catching
every browser extension and third-party script on the page.

**The deciding fact was the destination, not the mechanism.**

Measured, twice: a button whose `onClick` throws leaves every region rendering
normally, produces **no fallback and no report at all**, and is seen only by a
`window` `error` listener added from the console. React's `onUncaughtError` does
not see it either.

**Story 1.12's server endpoint is the reversal trigger** — it is what would give
a browser report a destination the console is not.

### 21. Hand-rolled over `react-error-boundary`, and the bytes are not the argument

`react-error-boundary` 6.1.4 was installed and built before it was rejected:
**+932 B and +1 module**, and the tree rebuilt to the same hash afterwards. That
is close to free.

What decided it: its `resetErrorBoundary()` **clears the error state without
remounting**, exactly like clearing a flag — so a real reset still means
supplying `resetKeys` with a counter you increment yourself. It is a well-tested
wrapper around a `key`-based remount you still have to write, plus a second
vocabulary beside four props.

Two properties of the hand-rolled one that are the point of it:

- **It keeps a boolean, not the error.** `getDerivedStateFromError` is handed the
  error and deliberately discards it, which makes "the fallback never shows the
  error" **structural** rather than a habit — the same move `apiError()`'s four
  slots make on the backend. This is the frontend's instance of §12's habit
- **Reset increments a counter used as the children's `key`, so recovery
  remounts.** Clearing the flag alone re-renders a child still holding the state
  that broke it, and the user clicks a button that visibly does nothing.
  Recovery is never a page reload, because a reload discards the rest of a
  working screen

It is the codebase's only class component. React 19 has no hook equivalent.

### 22. Two of this story's own written-down warnings were disproved, and are recorded rather than dropped

An ADR that quietly deletes a prediction measurement killed teaches the wrong
lesson.

- **The `StrictMode` double-report does not happen.** Story 1.7 warned that
  anything reporting an error would see it twice in development. A render throw
  caught by a boundary produced **exactly one** `onCaughtError` report — the
  constructor does run twice, but the first throw aborts that render pass and
  React reports the failure once. Re-verified independently in Task 1.7.7 against
  the dev server. The warning still stands for anything counting **renders**; it
  does not stand for reporting an error, which is what the story actually wrote.
  No de-duplicator exists
- **The landmark conflict does not exist.** Predicted three times — in Story
  1.5's hand-off, in Task 1.7.6's brief, and in the first draft of
  `Region.stories.tsx`, where the `a11y` disable was written before it was
  measured and then removed. Three `region` landmarks in one permutation grid
  report **0 violations**, and `landmark-unique` is in the _passes_ list on all
  three nodes. The rule keys on role **and accessible name together**, so it
  fires on landmarks that are **indistinguishable**, not on landmarks that
  repeat. `AppHeader`'s six banners were six copies of one anonymous thing; a
  grid reviewing regions gives each cell a different name, because that is what a
  region is.
  **Task 1.5.3's general rule was stated too broadly: the permutation grid and
  landmark uniqueness only conflict for a component whose landmark has no name.**
  That disable is still correct; its stated reason was not

## Rejected, with reasons

| Alternative                                                                    | Why not                                                                                                                                                                                  |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV` or an `APP_ENV` to select the log format                            | Buys nothing over a value the same readers already handle, and reverses Story 1.6's decision. `NODE_ENV=production` was measured (Task 1.2.5) to produce an identical stream             |
| Piping `dev.sh` output through `pino-pretty`                                   | Costs the exit-code propagation Task 1.2.5 verified, and breaks the foreground-process assumption `dev.sh`'s trap relies on                                                              |
| `pino-pretty` as a `devDependency`                                             | Resolved by name at runtime; a pruned tree makes a documented setting `ERR_MODULE_NOT_FOUND` at startup                                                                                  |
| pino's `redact` for the resolved configuration                                 | A denylist whose failure mode is a key nobody added to it — silent, in the place secrets are hardest to retract from. The configuration is simply never logged                           |
| Fastify's default counter request id                                           | Collides across every restart and every instance                                                                                                                                         |
| Fastify's `requestIdHeader`                                                    | Adopts the inbound header with **no validation at all**, and defaults to `false` in 5.12.1                                                                                               |
| Sanitising a malformed inbound id                                              | A repaired id is a different id. It is dropped and a fresh one generated                                                                                                                 |
| W3C `traceparent`                                                              | A whole propagation model; Epic 10 should adopt it entire rather than cargo-culting the header                                                                                           |
| Keeping `remoteAddress` / `remotePort`                                         | Behind Story 1.11's proxy they become the proxy's address — wrong rather than absent                                                                                                     |
| RFC 9457 `application/problem+json`                                            | Its discriminator is a `type` URI meant to dereference to documentation; the names without the URIs are the shape without the thing                                                      |
| `{ error: { … } }` envelope                                                    | `requestId` is a property of the response, not the failure, so a wrapper misfiles it                                                                                                     |
| `details` as `Record<string, unknown>`                                         | An open-ended object is the field a leak arrives through                                                                                                                                 |
| `statusCode` / `timestamp` on the body                                         | A second place for the status to be wrong; the log record already has the time and the id joins them                                                                                     |
| A schema library (Zod, Valibot) for response bodies                            | Fastify's ajv and `fast-json-stringify` are already present — zero packages. Story 1.6's argument was about schemas over _strings_ and did not transfer, but the free option won on cost |
| Deriving response types from the schema (`json-schema-to-ts`, a type provider) | Closes the two accepted gaps in §8 at the price of a dependency. Standing reversal trigger                                                                                               |
| `UNSUPPORTED_MEDIA_TYPE` in the code union                                     | A 415 is not reachable — an unparseable content type resolves to a 404                                                                                                                   |
| Separate codes for 400 and 413                                                 | A client branches the same way on both; the status line keeps the difference. Reversal: a caller that must behave differently on a 413                                                   |
| An `ERROR_DETAIL` variable to expose stacks                                    | A switch whose misconfiguration leaks silently outward. The correlation id makes withholding free                                                                                        |
| `warn` for 4xx log records                                                     | Breaks the property that a healthy server is silent at `warn` — and a server answering 404s is healthy                                                                                   |
| Naming the route in the 404 message                                            | Reflects unvalidated input for a benefit the client already has                                                                                                                          |
| Draining on a crash (`app.close()`)                                            | Serves requests from a program already proved wrong, and stacks a second failure on the one being reported                                                                               |
| Distinct exit codes per crash event                                            | Says nothing the `event` field does not; no orchestrator exists yet to want one                                                                                                          |
| `pino.final` or a delay before exiting                                         | Not needed — a `fatal` record followed immediately by `process.exit(1)` survives in both formats, `pretty`'s worker thread included                                                      |
| A single error boundary at the router                                          | Measured in Task 1.5.5: blanks the whole of `<main>` under a healthy-looking header                                                                                                      |
| A boundary _around_ each `<section>`                                           | Replaces the heading too, so a failed box loses its name, its landmark and its grid position                                                                                             |
| No boundary on `AppHeader`                                                     | Measured: `#root` with zero children and an empty `<body>`                                                                                                                               |
| `react-error-boundary` 6.1.4                                                   | +932 B and +1 module, but the real reason is that its reset does not remount either — a wrapper around a `key`-based remount you still have to write                                     |
| A `window` error listener in the browser                                       | A browser has no second stream; it would repeat the console and catch every extension on the page. Reversal: Story 1.12's endpoint                                                       |
| Showing the error in the fallback                                              | The boundary keeps a boolean, so it structurally cannot                                                                                                                                  |
| Recovery by page reload                                                        | Discards the rest of a working screen                                                                                                                                                    |

## Consequences worth stating separately

### Nothing checks that a route which can fail declared a schema

§12's serialiser only strips on routes that declare `500: apiErrorSchema`.
`grep -rn "satisfies Record<keyof" --include="*.ts"` finds the guard on **two**
sites — `routes/health.ts` and `errors.ts` — which is the expected answer today,
and confirms no schema in the tree is missing the guard.

What that grep does **not** close is the more interesting gap: nothing checks
that a route which _can_ fail declared the error schema at all, and a route with
no schema entry has no serialiser and therefore no stripping. This joins the
known-and-dated list rather than being closed, because `apiError()` already
covers every path structurally — the schema is a second net, not the only one.
**Dated 2026-09-01.**

### `pnpm verify` still does not read `scripts/dev.sh`, and the gap changed in kind

`CLAUDE.md` records two things no tool reads: `apps/backend/scripts/dev.sh`, and
the `rm -rf` fragments inside two `clean` scripts. The first is now worse in
kind rather than in size. `dev.sh` carries
`export LOG_FORMAT="${LOG_FORMAT:-pretty}"` — a **configuration value**, and the
only one in the application that `pnpm env:check` cannot see, because that check
reads `CONFIG_VARIABLES` and the two `.env.example` files and has no view of a
shell script.

A typo there is a silent fallback to JSON in the dev loop: no error, just
unreadable logs. Accepted rather than closed — a `shellcheck` dependency and a
seventh `verify` step for one 60-line file is the wrong trade — but **dated
2026-09-01** so it is a decision rather than an oversight.

### At `warn` and above the server never prints its readiness line

This is a deployment trap, not a logging detail, and Story 1.11 owns it.
Re-measured: at `LOG_LEVEL=warn`, `error` or `silent`, a server that starts,
answers a 200 and a 404 and shuts down cleanly writes **zero lines** to stdout
and zero to stderr — the `Server listening at …` line included. A supervisor or
health check waiting on that line hangs.

`LOG_LEVEL=debug` still shows **nothing `info` does not** — byte-identical
message sets across a full session. No task in this story added a `debug`
record, and the variable's lower half remains empty.

### `silent` no longer means silent, and the README said it did

Task 1.7.1 documented three level behaviours. One of them stopped being true one
task later, inside the same story: §16 makes a crash a deliberate exception, so
at `LOG_LEVEL=silent` a crashing process writes exactly one line — the level-60
record — and nothing else. That is the Task 1.6.4 pattern (a stated invariant
that quietly stopped holding) happening **within a single story**, which is why
this ADR re-measured all three rather than re-confirming them.

### Per-request latency has a baseline now, and it is "not measurable"

Task 1.7.2 measured `randomUUID` in isolation (34 ns against the counter's 11 ns)
and never compared the same route before and after. Taken here: the shipping
server against a Fastify instance with the same route and Fastify's own defaults
for everything this story changed, 20 000 `app.inject()` calls each after a 2 000
warm-up.

**13.8–14.1 µs per request, and the shipping server is 0.25–1.44 µs _faster_
across four runs** — i.e. inside run-to-run noise, in the direction of the
narrowed serialiser saving more fields than the UUID costs. There is no
per-request cost to report.

### The log record's byte figures are machine-dependent; the line counts are not

The finding reproduces: **the record got smaller despite a 36-character id.**
The exact numbers do not, and should not be quoted as constants — `pid` width,
`hostname` length and `responseTime`'s digits all move them.

|                            | Fastify defaults | Shipping  |
| -------------------------- | ---------------- | --------- |
| JSON request pair          | 431 B            | **422 B** |
| `pretty` lines per request | 15               | **12**    |

Task 1.7.2 recorded 427 → 416 and 15 → **9**. The byte pair is the same 9-byte
saving measured on a different pid width; the line count of 9 does not reproduce
and **12 is the measured figure** — 6 lines for `incoming request` (message,
`reqId`, and a 4-line `req` object) and 6 for `request completed`.

### axe's scope changes the answer in Storybook, and the difference is not a finding

Run against the whole story iframe, `Region`'s `AllPermutations` reports **3
violations** — `landmark-one-main`, `page-has-heading-one` and `region`. Scoped
to `#storybook-root`, which is what `@storybook/addon-a11y` does, it reports
**0**. All three are page-level rules that a story fragment structurally cannot
satisfy. Do not "fix" them, and do not compare a whole-document axe run against
an addon figure.

### Three figures in `CLAUDE.md` were wrong, and two of them were _corrections_

The frontend artefact line was corrected twice during this story, and both
corrections were themselves wrong. Re-built at four commits in this task rather
than cited:

| Commit                  | Modules | JS bytes    | Hash                |
| ----------------------- | ------- | ----------- | ------------------- |
| Story 1.5.6 (`a22b13a`) | 265     | 342,080     | `index-z9p5vXHu.js` |
| Story 1.6.7 (`ebf495d`) | 265     | **342,017** | `index-BAidohu3.js` |
| Pre-1.7.3 (`dd043cd^`)  | 265     | 342,017     | `index-BAidohu3.js` |
| Post-1.7.5 (`1c2b6f9`)  | **267** | 342,017     | `index-BAidohu3.js` |
| Task 1.7.6 (now)        | **271** | **343,658** | `index-C-Puqfnm.js` |

So Story 1.5's recorded 265 and 342.08 kB were **both correct**. Story 1.6
changed the bundle by **−63 bytes** with the module count unchanged (its lockfile
is byte-identical to Story 1.5's, so the change is source-attributable), and
**Task 1.7.3 added +2 modules while changing zero bytes and keeping the same
hash** — `api-error.ts` and `request-id.ts` enter the graph through the shared
barrel and are tree-shaken entirely out of the output. `INTERNAL_ERROR` appears
in neither `dist/` nor `storybook-static/`.

Task 1.7.3 saw its own tree at 342,017, compared it against Story 1.5's recorded
342.08 kB and blamed the record. Task 1.7.6 saw 267, compared it against the
recorded 265 and blamed the record again. Both were the same mistake: **a figure
that has moved looks exactly like a figure that was mis-recorded, and only
rebuilding the old commit tells them apart.**

The rule at the top of Task 1.7.7's brief is therefore not a style note. It
earned its keep three times in one story, on one line.

### A module can join the graph and cost nothing

The corollary of the row above, worth naming because it is counter-intuitive:
between pre-1.7.3 and post-1.7.5 the artefact gained **two modules** while
producing a **byte-identical file with the same content hash**. "Modules
transformed" counts the graph; the bundle counts what survives shaking. Do not
treat the two as one number.

### The `@base-ui/react` importer count needs an import-aware grep

The figure worth watching is **1** — `src/components/Popover/Popover.tsx`. A
plain `grep -rl "@base-ui/react"` answers **2**, because `AppHeader.tsx` names it
in a comment explaining why it does not import it. Count `import` lines, not
mentions.

## Measured

Every figure below was taken in Task 1.7.7, from a clean tree, on
`darwin 23.6.0` / Node 24.20.0 / pnpm 11.24.0 / Fastify 5.12.1 / React 19.2.8 /
axe-core 4.13.0.

### Acceptance criteria

| #   | Criterion                                                                           | Evidence                                                                                                                                                                                |
| --- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Structured JSON logs, configurable levels                                           | One JSON object per line on stdout; `LOG_LEVEL` across `info`/`debug`/`warn`/`error`/`silent` measured, `LOG_FORMAT=pretty` renders the same records                                    |
| 2   | Every request logged with id, method, path, status, duration                        | `{"level":30,…,"reqId":"362142fd-…","req":{"method":"GET","url":"/health"},"msg":"incoming request"}` and `…,"res":{"statusCode":200},"responseTime":5.22…,"msg":"request completed"`   |
| 3   | The id is returned to the client                                                    | `x-request-id` header equals the body's `requestId` on a 200, 404, 400, 413 and a thrown 500 — re-taken against the **custom** handlers, since Task 1.7.2 measured it against Fastify's |
| 4   | One consistent error shape                                                          | `{"code":…,"message":…,"requestId":…}` on all five                                                                                                                                      |
| 5   | Crashes caught and logged **— wording annotated, see §15**                          | stderr is **empty** on every crash; the level-60 record is on stdout; exit 1                                                                                                            |
| 6   | No internal detail to clients                                                       | A thrown error carrying a DSN with a password in `cause` and a `query` property: both on the level-50 log record with the full stack, neither on the wire                               |
| 7   | Frontend contains a failure to the affected region **— wording annotated, see §19** | One region shows its fallback while three render and the chrome is intact; recovery is a remount                                                                                        |

### Backend

| Measurement                                     | Result                                                                                |
| ----------------------------------------------- | ------------------------------------------------------------------------------------- |
| Start to listening, `LOG_FORMAT=json`           | 81 ms median (78–120), n=15                                                           |
| Start to listening, `pretty`                    | 87 ms median (85–92) — the transport costs **+6 ms**, reproducing Task 1.7.1 exactly  |
| SIGTERM to exit, raw process, json              | **2.1 ms** median (1.7–2.7), exit 0                                                   |
| SIGTERM to exit, raw process, pretty            | 3.4 ms median (3.3–4.0), exit 0                                                       |
| Per-request latency, before vs after this story | 14.1 µs vs **13.8 µs** over 20 000 injections — no measurable cost                    |
| Records per failure (404, 400, 413, thrown 500) | **3** each — unchanged from Fastify's own                                             |
| Levels                                          | 4xx at **30**, 5xx at **50**, crash at **60**                                         |
| JSON request pair                               | 422 B (Fastify's defaults: 431 B)                                                     |
| `pretty` lines per request                      | 12 (Fastify's defaults: 15)                                                           |
| Response schema strips undeclared fields        | `{ok, secret, internalPath}` → `{"ok":true}`; without a schema, all three on the wire |
| Coercion gap still open                         | `1.5` declared `"string"` → `"1.5"`                                                   |
| Missing required property                       | 500, now answering `INTERNAL_ERROR` rather than Fastify's `"b" is required!`          |
| 415 reachable?                                  | **No** — unparseable content type resolves to 404                                     |
| Crash: stderr / stdout                          | **0 stderr lines** in every configuration; one level-60 record on stdout              |
| Crash at `LOG_LEVEL=silent`                     | The level-60 record is the **only** line the process produces, in both formats        |
| Crash during drain                              | `shutdown complete` present, exit **0**, in-flight request answered **200**           |
| Silence at `warn` / `error` / `silent`          | 0 stdout and 0 stderr lines for a full start → 200 → 404 → shutdown session           |
| `debug` vs `info`                               | Identical message sets                                                                |

### Frontend

| Measurement                                                  | Result                                                                                                                                                |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Artefact                                                     | **271 modules, 343,658 B JS, 10,926 B CSS, 3 files**, `index-C-Puqfnm.js`                                                                             |
| Pre-1.7.6 baseline (rebuilt)                                 | 267 / 342,017 / 9,825 / 3, `index-BAidohu3.js`                                                                                                        |
| Cost of Task 1.7.6                                           | +4 modules, +1,641 B JS, +1,101 B CSS, **still three files**                                                                                          |
| `react-error-boundary` 6.1.4, built then reverted            | +932 B, +1 module; same hash after reverting                                                                                                          |
| Rebuild determinism                                          | Identical hash and byte count after every probe was reverted                                                                                          |
| `pnpm stories`                                               | **9 components, 9 stories files** (was 6 / 6)                                                                                                         |
| Files importing `@base-ui/react`                             | **1**                                                                                                                                                 |
| axe, `/` healthy                                             | **0 violations / 37 passes / 1 inconclusive**                                                                                                         |
| axe, other four routes                                       | 0 / **26** / 0 each (Task 1.5.4 recorded 25; passes rose, no violations)                                                                              |
| axe, `/` with the primary region failed                      | 0 / 33 / 0 — the inconclusive is _inside_ that region, so failing it removes the arrows                                                               |
| axe, `/` with the header failed                              | 0 / 37 / 1, `<header>` and `<nav>` absent, all four regions present                                                                                   |
| The single inconclusive, unmoved for four tasks              | `color-contrast` over **2** nodes: `<span aria-hidden="true">▲</span>` and `▼`, "Element content contains only non-text characters"                   |
| `landmark-unique` on the built page                          | **PASS on 7 nodes**                                                                                                                                   |
| `landmark-unique` on `Region`'s permutation grid             | **PASS on 3 nodes**, 0 violations scoped to `#storybook-root`                                                                                         |
| Storybook grids (`Region`, `ErrorFallback`, `ErrorBoundary`) | 0 violations each                                                                                                                                     |
| Containment                                                  | One region's fallback; three regions, the header, the nav and all four landmark names intact                                                          |
| Recovery                                                     | `[role="alert"]` 0 after clicking; `performance.timeOrigin` unchanged; **one** navigation entry; a `window` marker survived — a remount, not a reload |
| Header boundary removed                                      | `#root` **0 children**, `document.body` text length **0**                                                                                             |
| Event-handler throw                                          | **No fallback and no report at all**; only a `window` `error` listener saw it; all four regions still rendering                                       |
| `StrictMode` double-report                                   | **One** `onCaughtError` report in development; React's "The above error occurred in …" absent in both dev and the built artefact                      |

### Workspace

| Measurement                             | Result                                                                                                                          |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm verify`, warm                     | **8.77 s**, exit 0 — build 3.69 / lint 3.17 / `format:check` 2.20 / `stories` 0.27 / `env:check` 0.27 / `test` 0.48             |
| Cold build split                        | `tsc -b` 1.57 s / `vite build` 0.46 s / `storybook build` 1.37 s                                                                |
| Clean clone, cold store                 | install **3.2 s**, `pnpm verify` **13.2 s** exit 0                                                                              |
| Clean-clone artefact                    | md5 `cba2825c87721779927b2f385df406e9` — **byte-identical** to the working tree's                                               |
| `storybook-static/`                     | **299 modules, 59 files, 9.3 MB on disk** (7.3 MB apparent); pre-1.7.6 291 / 52 / 9.2 MB; Story 1.6 289 / 52 / 9.2 MB           |
| New dependencies across the whole story | **one** — `pino-pretty` 13.1.3. The error contract, both handlers, both schemas and all three boundaries cost **zero packages** |
| `allowBuilds`                           | still one entry, `esbuild`                                                                                                      |
| Dev pair from a clean clone             | backend `127.0.0.1:3000`, frontend `[::1]:5173`, 9 processes in the group                                                       |
| SIGINT to the process **group**         | **0 survivors**, both ports released, `signal received` / `shutdown complete` both present                                      |

Task 1.6.7 measured `pnpm verify` at 9.3–9.8 s and Task 1.7.6 at 10.1 s; this
task measures 8.77 s on the same six steps with more code in the tree. The total
is run-to-run variance and should not be read as a trend — take the per-step
split.

## Related

- ADR 0002 — the server factory, the signal handlers and the shutdown ceiling
  these crash handlers coexist with
- ADR 0005 — the region landmarks the boundaries are drawn around, and Task
  1.5.5's blank-`<main>` measurement
- ADR 0006 — the configuration readers, and the "nothing branches on the
  environment" decision this story tested twice
- PRODUCT_SPEC.md §36 — failures degrade locally, which is the criterion behind
  §19 and §20
- Stories 1.9, 1.10, 1.11 and 1.12 — see each story's own feed-forward section
