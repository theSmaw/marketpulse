# Task 1.2.3 — The health endpoint

**Status:** Not started
**Story:** [1.2 Backend Service Skeleton](STORY.md)
**Depends on:** Task 1.2.2

## Objective

`GET /health` returns 200 with a JSON body carrying status, version and uptime. This is the endpoint Story 1.12 displays in the frontend and the one Epic 3 later extends with market-feed connection state, so its shape is worth ten minutes of thought even though the implementation is six lines.

## Work

- Register the route as a Fastify plugin in `src/routes/health.ts`, registered by `buildServer()` — not defined inline in the factory. One route does not need a directory, but the second one will, and this is where the pattern is set
- **Decide, here, whether `buildServer()` stays synchronous.** Task 1.2.1 left it as `buildServer(): FastifyInstance`, returning before anything is registered, which is fine while there is nothing to register. This is the first task that registers a plugin. `app.register()` is itself synchronous and defers loading to `ready()`/`listen()`, so the signature can stay as it is — but if anything ever needs `await app.register(...)` or an explicit `await app.ready()`, the factory becomes `Promise<FastifyInstance>` and every caller changes with it, including Story 1.9's tests. Whichever way it goes, say why in the outcome rather than leaving the next person to re-derive it
- Declare the response type in `apps/backend` for now, next to the route
- The three fields:
  - **`status`** — a string literal union, not a `boolean` and not a free string. Today it only ever emits `"ok"`. Do not invent a degraded state this story cannot produce: there is no dependency to be degraded about until Epic 2 adds one, and Story 1.12's "healthy / degraded / unreachable" distinction is mostly a client-side concern — _unreachable_ is the absence of a response, which no server can report about itself
  - **`version`** — from `apps/backend/package.json` rather than a hardcoded string. `createRequire(import.meta.url)` reading `../package.json` resolves correctly from `dist/`, which a bare JSON import with `resolveJsonModule` does not (`package.json` sits outside `rootDir`). Verify that claim rather than trusting this sentence. The "or from `src/`" half of it stopped mattering in Task 1.2.2: approach A was rejected, so nothing ever executes `apps/backend/src` — the dev loop compiles and runs `dist/index.js` like everything else. One resolution case to get right, not two
  - **`uptime`** — `process.uptime()`. State the unit in the field name or the type, and note that it is _process_ uptime, not time-since-listening; they differ by milliseconds now and could differ by more once startup does real work
- Set the content type correctly (Fastify does this for a returned object; confirm rather than assume) and return 200 explicitly
- No JSON schema on the route yet. Fastify's response schemas are worth having, but picking a schema approach is entangled with Story 1.6's configuration validation and Story 1.7's error shape. Note the omission here so it is a deferral rather than an oversight

## Where this type lives, and when it moves

It stays in `apps/backend` until there is a second consumer. **Story 1.12 promotes it to `packages/shared`** — that story already says the health response type is exactly what the shared package exists for, and it is the point at which the frontend compiles against the same definition. Moving it now would be building a shared contract with one side of it missing.

When it does move, the build-before-typecheck ordering starts to bite: changing the health shape means rebuilding `packages/shared` before either app typechecks against it. `tsc -b` handles that and a bare `tsc --noEmit` in an app silently does not.

## Done when

- `curl -sS localhost:3000/health` returns 200, `content-type: application/json`, and a body with all three fields
- `version` matches `apps/backend/package.json`, verified by changing it and seeing the response change
- `uptime` increases between two calls
- The route works under the Task 1.2.2 dev loop. That is **one** check rather than two: the loop runs `dist/index.js`, so "from `dist/`" and "under the dev loop" are the same execution. Running the built output as a standalone process is Task 1.2.5's job
- Editing the route with the dev loop running produces the new response without a manual rebuild — the first real use of what Task 1.2.2 built, and the cheapest possible confirmation that it works
- `pnpm verify` passes from the repository root

## Notes

Epic 3 makes this endpoint the natural place to report market-feed connection state. The union type on `status` is what makes that an addition rather than a breaking change.
