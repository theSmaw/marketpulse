# Task 1.2.1 — Fastify server bootstrap

**Status:** Complete — 2026-08-30
**Story:** [1.2 Backend Service Skeleton](STORY.md)
**Depends on:** Story 1.1 (complete)

## Objective

Replace the `apps/backend` placeholder with a real Fastify server that starts, binds a configurable port, and logs where it is listening. No routes beyond what Fastify gives you, no shutdown handling, no watcher — those are Tasks 1.2.2 to 1.2.4.

## Work

- Add `fastify` as a **dependency** of `apps/backend` — not a devDependency and not root tooling. It is a library this package's code imports, which is the same rule that keeps `@types/node` in this package. Fastify 5.x ships its own types; do not look for an `@types/fastify`
- Delete `apps/backend/src/index.ts` wholesale. Its own comment says to replace rather than grow it; the `@marketpulse/shared` import in it has done its job and does not need preserving
- Split the entrypoint from the application, in two files:
  - `src/server.ts` exporting `buildServer()` — creates and configures the Fastify instance, registers plugins, and **returns without listening**
  - `src/index.ts` — the entrypoint: reads configuration, calls `buildServer()`, calls `listen`
    This split is not ceremony. Story 1.9 will want an instance to drive with `app.inject()` and no listening socket; Stories 1.7 and 1.12 attach to the same factory. Doing it now costs one file
- Relative imports between them carry `.js` extensions (`./server.js` from `server.ts`). TS2835 without one
- Read exactly two environment variables and no more: `PORT` (default `3000`) and `HOST` (default `127.0.0.1`). Validate the port is an integer in 1–65535 and **fail fast with a message naming the variable and the value** rather than letting Node throw something opaque
- **Default the host to `127.0.0.1`, not `0.0.0.0`.** Local development should not expose the service on every interface. Story 1.11 will need `0.0.0.0` inside a container, which is exactly why `HOST` is a variable now
- Enable Fastify's built-in logger with default settings and stop there. Structured JSON, levels, correlation ids and request logging are Story 1.7's acceptance criteria — do not install `pino-pretty`, custom serializers or a log-level environment variable here
- Verify `import Fastify from "fastify"` resolves under `module: nodenext` with `verbatimModuleSyntax` on. Type-only imports from Fastify (`FastifyInstance` and friends) must use `import type`

## Where this task stops

**Configuration is Story 1.6's story, not this one.** This task reads two variables inline. Do not add a config module, a schema, `.env` loading or a typed settings object — the acceptance criterion here is "a configurable port", and two `process.env` reads satisfy it. Story 1.6 will replace them, and it is much easier to replace two reads than to unpick a premature abstraction.

## Done when

- `pnpm --filter @marketpulse/backend build` emits to `dist/`, and `node apps/backend/dist/index.js` starts and logs the bound address
- `PORT=4100 node apps/backend/dist/index.js` binds 4100; `PORT=notaport` exits non-zero with a message that names `PORT`
- `curl -sS localhost:3000/` returns Fastify's 404 JSON — proof the server is actually serving, before any route of ours exists
- `pnpm verify` passes from the repository root

## Outcome

`apps/backend` runs a real Fastify 5.12.1 server. The placeholder `src/index.ts` is gone and two files replace it: `src/server.ts` exporting `buildServer()`, and `src/index.ts` as the entrypoint.

`fastify` is pinned exactly — `"fastify": "5.12.1"`, no caret — as a `dependency` of `apps/backend`, matching how every other version in this workspace is pinned. It ships its own types; there is no `@types/fastify` and looking for one is a wrong turn.

### The split

`buildServer()` creates the instance, will register plugins, and returns without listening. It knows nothing about the environment or the process. `index.ts` is the only file that imports `node:process`, reads variables, binds a socket, and — from Task 1.2.4 — handles signals. `./server.js` from `index.ts`, with the extension, as `nodenext` requires.

The payoff is deferred but certain: Story 1.9 gets an instance for `app.inject()` with no socket, and Stories 1.7 and 1.12 attach to the same factory.

### Configuration, such as it is

Two `process.env` reads and nothing else. `PORT` defaults to 3000, `HOST` to `127.0.0.1`.

`PORT` is parsed with `Number()`, not `parseInt()`, because `parseInt("3000nonsense")` returns 3000 and would accept a typo silently. It must be an integer in 1–65535 or the process writes one line to stderr naming the variable and the value and exits 1, before the logger exists:

```
$ PORT=notaport node apps/backend/dist/index.js
PORT must be an integer between 1 and 65535, received "notaport"
exit=1
```

`PORT=70000` fails identically. A bare `listen` would have produced a Node bind error naming neither the variable nor what was wrong with it.

### `HOST` binds what it says — but the log line does not

Verified with `lsof`, because the log line is misleading:

| Run                      | Fastify logs                                | Actually listening on |
| ------------------------ | ------------------------------------------- | --------------------- |
| `PORT=4102`              | `Server listening at http://127.0.0.1:4102` | `127.0.0.1:4102`      |
| `HOST=0.0.0.0 PORT=4101` | `Server listening at http://127.0.0.1:4101` | `*:4101`              |

Fastify rewrites `0.0.0.0` to `127.0.0.1` in that message to make it clickable. The binding is correct — the machine's LAN address answered on 4101 and refused on 4102 — but **the startup log cannot be used as evidence of which interface is bound.** Worth knowing in Story 1.11, where the whole question is whether the container is listening on all interfaces; check the socket, not the log.

### `verbatimModuleSyntax` and the Fastify import

`import Fastify from "fastify"` resolves cleanly under `module: nodenext`. The type-only import is a separate `import type { FastifyInstance } from "fastify"` statement rather than an inline `{ type FastifyInstance }` specifier: the inline form is correct but emits `import Fastify, {} from "fastify"`, an empty named-import clause that reads like a bug in the output. Checked in `dist/server.js`.

`@typescript-eslint/dot-notation` also rejected `process.env["PORT"]` in favour of `process.env.PORT`. `noUncheckedIndexedAccess` still types it `string | undefined` either way, so the validation is unaffected.

### Verified

- `pnpm --filter @marketpulse/backend build` emits `dist/{index,server}.{js,d.ts}` and `node apps/backend/dist/index.js` logs its bound address
- `PORT=4100` binds 4100 and 3000 refuses connections
- `curl -sS -i localhost:3000/` returns `404`, `content-type: application/json; charset=utf-8`, body `{"message":"Route GET:/ not found","error":"Not Found","statusCode":404}` — the server is serving before any route of ours exists
- `pnpm verify` exits 0 from the repository root

## Notes

`apps/backend`'s `dev` script is still the `echo` placeholder after this task. Task 1.2.2 replaces it.

`SIGTERM` currently kills the process outright; in-flight requests are dropped and Fastify never closes. That is Task 1.2.4 and not a regression — there was no server to shut down before.

The `description` field in `apps/backend/package.json` still reads "a skeleton until Story 1.2". Task 1.2.6 owns the documentation sweep, so it is corrected there rather than drifted at here.
