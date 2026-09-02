# Task 1.9.3 — Backend tests: the injected server, the error contract, and the configuration module

**Status:** Not started
**Story:** [1.9 Automated Testing Foundations](STORY.md)
**Depends on:** Task 1.9.2

## Objective

Make `apps/backend`'s `test` script real, and cover the half of this backend that `app.inject()` can reach — the HTTP layer, the error contract, CORS and the correlation id — plus the configuration module, which was written for this task before this task existed.

## Work

- **Build the server the way the factory was designed to be built.** `buildServer({ logLevel: "silent", logFormat: "json" })` — `silent` is in the vocabulary for this suite specifically, and an `app.inject()` suite at `info` writes two records per request and buries whatever the test was about. The factory defaults neither setting on purpose, so pass both explicitly and do not add a default to `server.ts` to make the tests shorter
- **Know the one constraint the factory carries before writing a helper around it.** `buildServer()` is synchronous today, and the first `await app.register(...)` or explicit `await app.ready()` turns it into `Promise<FastifyInstance>` and changes every caller, tests included (ADR 0002 §3). Decide now whether the suite's helper is `async` from the start — it costs nothing today and it is the difference between one edit and every edit later
- **`/health` is the named criterion.** Assert the status, the body against `HealthResponse`, and — the assertion that is worth more than the shape — that a property **not** declared in the response schema does not reach the wire. That is `fast-json-stringify`'s stripping, measured in Task 1.7.3 with a `secret` field that vanished, and it is the mechanism behind "no internal detail reaches a client" rather than a habit of remembering
- **Exercise all four failure paths, because `buildServer()` registers both handlers and they are two paths rather than one.** A 404 (`setNotFoundHandler`, which `setErrorHandler` never sees), a 400 (`POST /health` with `content-type: application/json` and a malformed body — Fastify's content-type parser runs before the not-found handler), a 413 (a 2 MB body), and a thrown 500. Assert the `{ code, message, requestId }` shape rather than Fastify's defaults, and assert the code mapping: 404 → `NOT_FOUND`, other 4xx → `BAD_REQUEST`, 5xx → `INTERNAL_ERROR`. A 415 is **not** reachable — an unparseable content type resolves to a 404 — so do not write a test expecting one
- **Assert the two things a 5xx must not carry**, because both were real defaults before Task 1.7.4 replaced them: the thrown message must not appear in the body (Fastify's default returned it verbatim), and neither must a decorated `stack` or `cause`. The measured case to copy is an error carrying `cause: { dsn: "postgres://user:hunter2@…" }` — both on the log record, neither on the wire
- **The correlation id has three assertions and they are cheap.** `x-request-id` is on every response including a 404 and a thrown 500; the body's `requestId` equals the header on every failure; and an inbound id is honoured when it matches `^[A-Za-z0-9_-]{1,128}$` and **dropped rather than sanitised** when it does not — a repaired id is a different id, which is the decision the test is protecting
- **CORS is assertable by injection and it is easy to assert the wrong thing.** `@fastify/cors` is registered inside the factory, so an injected instance carries the headers. With a **string** origin the server asserts `access-control-allow-origin` **unconditionally**, so a test that sends an unlisted `Origin` and expects a rejection will fail — the browser is the enforcer and `app.inject()` is not one. What is assertable: the header is present, it equals `CORS_ORIGIN`, and `REQUEST_ID_HEADER` is in `access-control-expose-headers`. Import that constant from `packages/shared` rather than writing `"x-request-id"` out again; that is the rule the move exists for
- **Test `loadConfig(env)` with a plain object, and nothing else.** It takes the environment as a parameter and defaults it to `process.env` — the only occurrence of `process.env` in the workspace — and it validates on call rather than on import, so there is no process to mutate and no module to re-import between cases. `ConfigError` is exported so the type can be asserted as well as the message. The cases worth having are the ones that were hand-written because a schema library got them wrong: `PORT=` is the **default and not port 0**; an out-of-range port is reported with the value the operator typed; and **every** bad key is reported rather than the first, which is what the eleven-line accumulator exists for
- **Do not import `loadEnvFile()` into the suite or create a `.env.test`.** `index.ts` calls the loader, `config.ts` does not, and there is deliberately no test env file — a variable already set in the real environment beats a file entry, so a runner that sets variables in its own process needs no file and cannot be surprised by a developer's `.env`. Task 1.6.3 measured that precedence both ways round; do not re-open it
- **Close the schema gap this story was handed, if it is as cheap as predicted.** Nothing in `pnpm verify` checks that a route which can fail declared `500: apiErrorSchema`, and `setNotFoundHandler` is not a route and can never have one. A test that walks the instance's registered routes and asserts the declaration is the only mechanism that would ever catch it, and it is cheaper than a seventh `verify` step. Write it, or say why the route table is not reachable in a form worth asserting on
- **Say what this suite cannot reach, and hand it forward rather than half-building it.** Injection drives an instance with no listening socket, so signals, exit codes, the 5-second shutdown ceiling, the second-signal path and both process-level crash handlers are all outside it — they need a real child process started against a **built** tree, the shape Tasks 1.2.4 and 1.2.6 used by hand. Decide explicitly whether this story builds one such test as a demonstration or records the whole class as out of scope with an owner. If a fixture route is needed for it, put it in a directory that stays in the tree: a hand-added-then-deleted source orphans its `dist/` output permanently, because `tsc -b --clean` deletes the output of the sources that currently exist
- **Replace the `echo` placeholder** and confirm a failing backend test propagates to the root exit code

## Done when

- `apps/backend`'s `test` script runs real tests; the placeholder is gone
- `/health` is covered, including the schema-stripping behaviour
- All four failure paths answer in the `ApiError` shape, with the status-to-code mapping asserted
- No 5xx body carries a thrown message, a stack or a `cause`
- The correlation id is asserted on a success, a 404 and a 500, and the inbound-validation rule is covered in both directions
- CORS is asserted for what injection can prove, and the write-up says what it cannot
- `loadConfig` is driven by a plain object, `ConfigError` included, with `PORT=` covered
- The process-half gap is either demonstrated once or recorded as out of scope with an owner
- `pnpm verify` exits 0, and the suite runs at `silent` — no log records in the test output

## Notes

The per-request latency figure in `CLAUDE.md` is 13.8 µs against Fastify's own 14.1 µs, which is inside run-to-run variance. If this task is tempted into a performance assertion, it needs a warm-up, a large n and a threshold well outside noise — Task 1.7.7's method — or it will be the flakiest test in the suite. There is no criterion asking for one.
