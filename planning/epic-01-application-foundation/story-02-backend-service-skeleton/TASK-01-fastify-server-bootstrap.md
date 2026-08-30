# Task 1.2.1 — Fastify server bootstrap

**Status:** Not started
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

## Notes

`apps/backend`'s `dev` script is still the `echo` placeholder after this task. Task 1.2.2 replaces it.
