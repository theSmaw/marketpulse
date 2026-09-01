# Task 1.7.4 — The backend error handler

**Status:** Complete
**Story:** [1.7 Logging & Error Handling](STORY.md)
**Depends on:** Task 1.7.3

## Objective

Make every error response the application produces take the contract's shape, log the detail it does not send, and close criterion 6 — no stack traces or internal detail to clients — with a mechanism rather than with discipline.

## Work

- **This belongs in `buildServer()`, and the file already promises it.** The factory's header comment says Stories 1.7 and 1.12 attach error handling and CORS to it. Handlers registered there are a property of the application, so Story 1.9's `app.inject()` instances get them for free; anything registered in `index.ts` would not be under test. Note the factory now takes `ServerOptions` (`{ logLevel, logFormat }`, no default) since Task 1.7.1 — if this task needs anything else from the process, it goes on that interface rather than into a second parameter, and it stays deliberately narrower than `Config`
- **`setErrorHandler` is only half of it, and the shape it has to replace was measured in Task 1.7.2 rather than predicted.** Fastify answers an unmatched route through `setNotFoundHandler`, which the error handler never sees. The literal bodies today are `{"message":"Route GET:/nope not found","error":"Not Found","statusCode":404}` and `{"statusCode":500,"error":"Internal Server Error","message":"…"}` — note the **key order differs between them**, which is a small sign that they come from different places. "API errors use a single consistent shape" is false the first time anyone types a URL wrong. Register both
- **Registering either handler invalidates Task 1.7.2's header verification, so re-take it here.** 1.7.2 proved `x-request-id` is present on a 200, a 404 and a thrown 500 — but it proved that against Fastify's _own_ not-found and error handling, with no custom handler in the chain. This task replaces both. The `onRequest` hook in `buildServer()` still sets the header, and the expectation is that it survives; the point is that this is now an expectation rather than a measurement. Re-run all three, and watch for a handler that builds its own reply and drops the header, or a `reply.headers()` call that replaces the set rather than merging into it
- **The id for the body comes from `request.id`, and the handler must not mint a second one.** It is the same value the `onRequest` hook already put on the header and the same value pino logs as `reqId` — that identity is the whole criterion, and an error handler generating a fresh id would give a client an id that appears in no log record at all
- **Fastify's own errors are the ones users will actually meet, and they must come out in the contract's shape too.** A malformed JSON body (`FST_ERR_CTP_INVALID_MEDIA_TYPE`, `FST_ERR_CTP_EMPTY_JSON_BODY`), a validation failure if request schemas are adopted (`FST_ERR_VALIDATION`), and a payload over the size limit all arrive at the error handler carrying a `statusCode` and a `code` already. Map them; do not let a framework error code become the product's error code by accident
- **Mapping them means adding to `ApiErrorCode`, and that is this task's call rather than an oversight in 1.7.3.** The union shipped with exactly **two** members, `NOT_FOUND` and `INTERNAL_ERROR`, because those were the two failures the server demonstrably produced — 1.7.3's own Notes forbid inventing codes for failures that do not exist yet. The framework errors above are a third class and none of them is either member, so a `BAD_REQUEST` (or whatever the mapping actually needs) is added **here**, where the failure is real and reachable, with the same test applied: a member per failure that can be produced, not per failure that can be imagined. Adding one is a non-breaking addition by construction, which is why the union exists
- **Editing `ApiErrorCode` means editing `packages/shared`, which is consumed as built output.** Rebuild it before either app typechecks against the change — `pnpm build` and `pnpm verify` order that themselves, but a bare `tsc --noEmit` in `apps/backend` passes against the previous union and will happily accept a code that no longer exists
- **Split the handling by class, not by hue — and note Fastify already does a version of this, so the baseline is not "everything at one level".** Measured in Task 1.7.2: a thrown 500 writes an extra record at **level 50** carrying `err` with the full stack and a repeat of `req`, while a 404 writes an extra record at **level 30** carrying only `Route GET:/nope not found`. Both sit between the ordinary `incoming request` / `request completed` pair, so a 404 is three records and a 500 is three records. What this task decides is whether that split is the right one and whether it survives a custom handler — not whether to introduce one. A 5xx is ours: log at `error` with the full stack and the correlation id, and respond with the code, a generic message and the id. A 4xx is the client's: log at `warn` or `info` — an error-level log line for a user typing a bad path is how a log aggregator becomes noise — and the message may safely say what was wrong with the request. Fastify's `error.statusCode` is the discriminator; state the default for an error carrying none (500, and it should be 500 rather than something reassuring). Watch the record count too: replacing Fastify's handlers without removing its own logging is how one failure becomes four lines
- **What actually leaks today is the message, not the stack, and that is worth having straight before designing against it.** Task 1.7.2 measured a thrown route incidentally: the stack goes to the log and **not** to the client, but the thrown `Error`'s own message goes to the client verbatim — `{"statusCode":500,"error":"Internal Server Error","message":"deliberate failure for the correlation-id measurement"}`. So Fastify's default is already half of criterion 6, and the hole is the half that is easy to miss: an error message written for a developer ("connection to postgres at 10.0.0.4:5432 refused") is internal detail even though it is not a stack. A generic message for every 5xx, with the real one in the log beside the correlation id, is what closes it — the stack was never the whole risk
- **Criterion 6 says "in production" and there is no environment variable, which is the interesting part — and Task 1.7.1 moved this question in both directions.** Task 1.6.3 decided nothing branches on which environment it is in, and 1.7.1 confirmed that decision under the first real pressure on it. Three ways out: never expose a stack to a client at all — the simplest, and probably right, because the stack is already in the log line beside the request id the client was given, so a developer loses nothing; make it a value variable (`ERROR_DETAIL=…`); or introduce the environment concept, which is a recorded reversal.

  Two things changed since this was written. A value variable is now **cheaper** than it was — `readEnum` exists, `LOG_FORMAT` is a working precedent for "a value that differs in development without naming the environment", and `scripts/dev.sh` is an established place to set one. So the argument against it can no longer be that it costs a new reader. And 1.7.1 also set the **precedent that answers it**: `redact` was rejected in favour of never logging the resolved configuration at all, on the ground that a denylist's failure mode is a key nobody added to it, silently, in the place it is hardest to retract from. An `ERROR_DETAIL` variable is that same shape — a switch whose misconfiguration leaks, silently, outward. **Prefer never exposing a stack, and cite 1.7.1's reasoning rather than re-deriving it:** safe by construction beats safe when configured correctly, and the correlation id is what makes it cost nothing

- **Task 1.7.3 adopted response schemas, so the strongest form of criterion 6 is available here and should be taken.** A serialiser with no slot for `stack` cannot emit one regardless of what the handler builds. Check it the hard way: throw something with extra properties attached — `error.stack`, an `error.cause`, a `query` field — and confirm they are absent from the wire, rather than confirming the handler did not add them
- **Declare the error schema with 1.7.3's idiom, and note the one place it does not copy verbatim.** `/health` declares its properties `satisfies Record<keyof HealthResponse, JsonSchemaProperty>` and derives `required` from `Object.keys(properties)`, which is exact **because every field of `HealthResponse` is required**. `ApiError` has an optional `details`, so the same derivation would mark it required and produce a **500 at runtime** on every error without one — 1.7.3 measured exactly that failure (`"buildSha" is required!`). So the `satisfies` guard carries over unchanged and `required` becomes a literal of the three non-optional fields. Declare `code` with `enum: API_ERROR_CODES` while you are there, so the serialiser enforces the union it already exports
- **Construct through `apiError()` and not an object literal.** The constructor branches on `details` because `exactOptionalPropertyTypes` makes `{ …, details: undefined }` a different type from an absent key — the naive literal is **TS2375**, measured in 1.7.3. A handler that assembles the object by hand will either hit that error or work around it by always sending `details`, which is the wrong shape
- **Verify with real responses, and remember there is no test runner.** Story 1.9 picks one. Until then, a route that throws — added, exercised with `curl -i`, and removed within this task — plus a genuine 404 and a genuine validation failure if one is reachable. Record the literal response bodies and the matching log lines side by side, because the pairing _is_ the criterion: the client's id appears in the log entry that has the stack
- **Do not give `/health` a failure state.** It returns `"ok"` and there is nothing for it to be degraded about until Epic 2 adds a dependency; `HealthStatus` is a union so that becomes an addition rather than a break. An error handler is not a reason to invent one now

## Done when

- Both handlers are registered in `buildServer()`, and a filtered `pnpm --filter @marketpulse/backend` start serves the contract's shape for a thrown 500 and for a 404
- Framework errors are mapped, with the mapping written down rather than only coded, and any new `ApiErrorCode` member is justified by a failure that can actually be produced
- The error response carries a JSON schema declared with the `satisfies Record<keyof ApiError, …>` guard, and a thrown error with extra properties attached is shown not to reach the wire
- The production-detail decision is recorded with its reasoning and the rejected alternatives
- A 5xx response is shown alongside the log entry containing its stack and its correlation id, and the response's `x-request-id` header is shown to be that same value with both custom handlers registered
- The 5xx body is shown to carry a generic message rather than the thrown error's own
- Log levels by error class are stated
- `pnpm verify` exits 0, and any temporary throwing route is gone from the tree

## Notes

Later epics extend this rather than replacing it — PRODUCT_SPEC.md §36 makes a failed analytical tool, an unavailable SEC endpoint and a dropped feed **product states**, not exceptions. Anything this handler does that would collapse such a state into a 500 is a mistake to catch here, while there is one route to reason about.

## Outcome

Both of Fastify's failure paths are replaced, every failure the server produces
answers in `ApiError`'s shape, and criterion 6 is closed by two mechanisms
rather than by discipline.

### What landed

| File                                | Change                                                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `apps/backend/src/errors.ts`        | New. The only file that constructs an `ApiError`: both handlers, the mapping, the levels, `apiErrorSchema` |
| `apps/backend/src/json-schema.ts`   | New. `JsonSchemaProperty`, moved out of `health.ts` because a second schema needs it                       |
| `apps/backend/src/server.ts`        | `registerErrorHandling(app)` before the routes                                                             |
| `apps/backend/src/routes/health.ts` | Imports the shared property type; declares `500: apiErrorSchema`                                           |
| `packages/shared/src/api-error.ts`  | `BAD_REQUEST` added to `API_ERROR_CODES`, with the measurement that justifies it                           |

### Decisions

**`BAD_REQUEST`, and no `UNSUPPORTED_MEDIA_TYPE`.** The union's test is a member
per failure that can be produced. Measured against the shipping tree, whose only
route is `GET /health` and which accepts no body anywhere:

| Request                                                        | Status | Reachable? |
| -------------------------------------------------------------- | ------ | ---------- |
| `POST /health`, `content-type: application/json`, body `{oops` | 400    | yes        |
| `POST /health`, `content-type: application/json`, 2 MB body    | 413    | yes        |
| `POST /health`, `content-type: application/xml`                | 404    | —          |
| `GET /health` with a 2 MB body                                 | 200    | —          |

Both 4xx are reachable because Fastify's content-type parser runs **before** its
not-found handler, which is the opposite of the intuition that a route which
does not exist cannot produce a body error. A 415 is not reachable, so no member
was added for it. One member covers 400 and 413 together: a client branches the
same way on both, and the status line still carries the difference. The reversal
trigger is a caller that has to behave differently on a 413.

**A 5xx never carries the thrown message.** Not the stack either, but the stack
was never the whole risk — Fastify's default already withheld it and returned
the message verbatim. The generic message plus the correlation id costs a
developer nothing, because the real message is on the log record carrying that
id.

**No `ERROR_DETAIL` variable.** Task 1.7.1's `redact` reasoning applies
unchanged: a switch whose misconfiguration leaks, silently, outward. Task
1.6.3's "nothing branches on the environment" decision therefore held for the
second time in this story.

**The 404 message does not reflect the URL.** The client already knows what it
asked for; the log record has it beside the same id.

**Log levels keep Fastify's own split** — 5xx at `error`, 4xx at `info` — rather
than inventing one. `info` and not `warn` for 4xx because at `LOG_LEVEL=warn` a
healthy server is silent and a server answering 404s is healthy.

### Measurements

| Question                                  | Before                                                                                                           | After                                                                                                                     |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 404 body                                  | `{"message":"Route GET:/nope not found","error":"Not Found","statusCode":404}`                                   | `{"code":"NOT_FOUND","message":"Route not found.","requestId":"…"}`                                                       |
| 500 body                                  | `{"statusCode":500,"error":"Internal Server Error","message":"connection to postgres at 10.0.0.4:5432 refused"}` | `{"code":"INTERNAL_ERROR","message":"An unexpected error occurred.","requestId":"…"}`                                     |
| 400 body                                  | `{"statusCode":400,"code":"FST_ERR_CTP_INVALID_JSON_BODY",…}`                                                    | `{"code":"BAD_REQUEST","message":"Body is not valid JSON but content-type is set to 'application/json'","requestId":"…"}` |
| Log records per failure                   | 3                                                                                                                | 3 — no doubling                                                                                                           |
| Levels                                    | 5xx = 50, 4xx = 30                                                                                               | unchanged                                                                                                                 |
| `x-request-id` header vs body `requestId` | header only                                                                                                      | identical on 200 / 400 / 404 / 413 / 500                                                                                  |
| Inbound `x-request-id: my-own-id-42`      | honoured                                                                                                         | honoured, and on the body                                                                                                 |
| 404 at `LOG_LEVEL=warn`                   | silent                                                                                                           | silent                                                                                                                    |

**The leak test, end to end.** A route throwing an `Error` with
`cause: { dsn: "postgres://user:hunter2@10.0.0.4/db" }` and a `query` property:
both, plus the full ten-frame stack and the real message, appear on the level-50
log record under the same `reqId`; none of them appears on the wire.

**The serialiser's contribution, isolated.** A handler sending a body decorated
with `stack` and `cause`:

- on a route declaring `500: apiErrorSchema` → the four contracted fields only
- on a route declaring no schema → both extras verbatim on the wire

So the schema is a real second mechanism, and it is **per-route and opt-in**.

### The gap this found

**`setNotFoundHandler` is not a route, so it can never carry a response schema.**
The strongest form of criterion 6 is therefore structurally unavailable on the
404 path, and `apiError()` — which builds an object with no slot for a fifth
field — is the mechanism that has to hold everywhere. Nothing in `pnpm verify`
checks that a route which can fail declared the schema; Task 1.7.7 inherits that
as a thing to confirm by hand.

### For Task 1.7.5

- `errors.ts` catches everything **inside** the request lifecycle, so a thrown
  route never reaches a process-level handler and its record keeps its `reqId`.
  What 1.7.5 installs is for what escapes, and those records have no id — the
  asymmetry the brief already predicts
- The 4xx-at-`info` decision is the precedent for the `LOG_LEVEL=silent`
  question: this task chose to respect the level for ordinary traffic, which is
  not the same as respecting it for a crash

### For Task 1.7.7

- The two accepted schema gaps of 2026-09-01 still stand and now apply to two
  schemas rather than one; the coercion gap has not cost anything yet
- `JsonSchemaProperty` living in its own file is what makes "confirm the guard
  is on every schema in the tree" a grep for `satisfies Record<keyof`
