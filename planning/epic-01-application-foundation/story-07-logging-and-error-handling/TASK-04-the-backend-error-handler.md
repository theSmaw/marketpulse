# Task 1.7.4 — The backend error handler

**Status:** Not started
**Story:** [1.7 Logging & Error Handling](STORY.md)
**Depends on:** Task 1.7.3

## Objective

Make every error response the application produces take the contract's shape, log the detail it does not send, and close criterion 6 — no stack traces or internal detail to clients — with a mechanism rather than with discipline.

## Work

- **This belongs in `buildServer()`, and the file already promises it.** The factory's header comment says Stories 1.7 and 1.12 attach error handling and CORS to it. Handlers registered there are a property of the application, so Story 1.9's `app.inject()` instances get them for free; anything registered in `index.ts` would not be under test
- **`setErrorHandler` is only half of it.** Fastify answers an unmatched route through `setNotFoundHandler`, which the error handler never sees — so a 404 comes back in Fastify's own `{ statusCode, error, message }` shape while everything else comes back in ours. "API errors use a single consistent shape" is false the first time anyone types a URL wrong. Register both
- **Fastify's own errors are the ones users will actually meet, and they must come out in the contract's shape too.** A malformed JSON body (`FST_ERR_CTP_INVALID_MEDIA_TYPE`, `FST_ERR_CTP_EMPTY_JSON_BODY`), a validation failure if Task 1.7.3 adopted request schemas (`FST_ERR_VALIDATION`), and a payload over the size limit all arrive at the error handler carrying a `statusCode` and a `code` already. Map them; do not let a framework error code become the product's error code by accident
- **Split the handling by class, not by hue.** A 5xx is ours: log at `error` with the full stack and the correlation id, and respond with the code, a generic message and the id. A 4xx is the client's: log at `warn` or `info` — an error-level log line for a user typing a bad path is how a log aggregator becomes noise — and the message may safely say what was wrong with the request. Fastify's `error.statusCode` is the discriminator; state the default for an error carrying none (500, and it should be 500 rather than something reassuring)
- **Criterion 6 says "in production" and there is no environment variable, which is the interesting part.** Task 1.6.3 decided nothing branches on which environment it is in. Three ways out: never expose a stack to a client at all — the simplest, and probably right, because the stack is already in the log line beside the request id the client was given, so a developer loses nothing; make it a value variable (`ERROR_DETAIL=…`), which is one more knob and one more way to be misconfigured in the direction that leaks; or introduce the environment concept, which is a recorded reversal. **Prefer the first and say why**, because "safe by construction" beats "safe when configured correctly", and the correlation id is what makes it cost nothing
- **If Task 1.7.3 adopted response schemas, this is where the strongest form of criterion 6 lands.** A serialiser with no slot for `stack` cannot emit one regardless of what the handler builds. Check it: throw something with extra properties attached and confirm they are absent from the wire, rather than confirming the handler did not add them
- **Verify with real responses, and remember there is no test runner.** Story 1.9 picks one. Until then, a route that throws — added, exercised with `curl -i`, and removed within this task — plus a genuine 404 and a genuine validation failure if one is reachable. Record the literal response bodies and the matching log lines side by side, because the pairing _is_ the criterion: the client's id appears in the log entry that has the stack
- **Do not give `/health` a failure state.** It returns `"ok"` and there is nothing for it to be degraded about until Epic 2 adds a dependency; `HealthStatus` is a union so that becomes an addition rather than a break. An error handler is not a reason to invent one now

## Done when

- Both handlers are registered in `buildServer()`, and a filtered `pnpm --filter @marketpulse/backend` start serves the contract's shape for a thrown 500 and for a 404
- Framework errors are mapped, with the mapping written down rather than only coded
- The production-detail decision is recorded with its reasoning and the rejected alternatives
- A 5xx response is shown alongside the log entry containing its stack and its correlation id
- Log levels by error class are stated
- `pnpm verify` exits 0, and any temporary throwing route is gone from the tree

## Notes

Later epics extend this rather than replacing it — PRODUCT_SPEC.md §36 makes a failed analytical tool, an unavailable SEC endpoint and a dropped feed **product states**, not exceptions. Anything this handler does that would collapse such a state into a 500 is a mistake to catch here, while there is one route to reason about.
