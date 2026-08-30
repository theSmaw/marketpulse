# Task 1.2.3 — The health endpoint

**Status:** Complete — 2026-08-30
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

## Outcome

`GET /health` is a Fastify plugin in `apps/backend/src/routes/health.ts`, registered by `buildServer()`. Three fields, `status` / `version` / `uptimeSeconds`, and 61 bytes of JSON.

```
$ curl -sS -D - http://127.0.0.1:4321/health
HTTP/1.1 200 OK
content-type: application/json; charset=utf-8
content-length: 61

{"status":"ok","version":"0.0.0","uptimeSeconds":2.019194875}
```

### `buildServer()` stays synchronous

Decided rather than allowed to drift. `app.register()` is synchronous — it queues the plugin and defers loading to `ready()`/`listen()` — so a caller that listens gets a fully registered instance without the factory awaiting anything. The signature is unchanged and Story 1.9's tests inherit it. The comment in `server.ts` states the trigger for revisiting it: the first `await app.register(...)` or explicit `await app.ready()` makes the return type `Promise<FastifyInstance>` and changes every caller.

### The `createRequire` instruction in this task was wrong, and checking it was the point

This task said to read `version` with `createRequire(import.meta.url)`, "which a bare JSON import with `resolveJsonModule` does not [resolve correctly], (`package.json` sits outside `rootDir`)", and then said to verify the claim rather than trust the sentence. Verified — and it does not hold.

A probe module containing exactly `import pkg from "../../package.json" with { type: "json" }` compiles under this workspace's options, runs, and prints the version. Specifically:

- **No TS6059.** `module: nodenext` enables `resolveJsonModule`, and TypeScript admits the manifest as a program input without complaining that it sits outside `rootDir`
- **No copy of `package.json` is emitted into `dist/`** — checked with `ls -a apps/backend/dist`
- **The specifier survives compilation verbatim**, and Node 24 resolves it under its own stable import-attributes support with no flag and no warning

So the reason for reaching for `createRequire` was not real, and the JSON import is the better of the two: the compiler reads the actual manifest, so `version` is typed `string` at build time. The `createRequire` version was written first and thrown away — it returns `any`, which meant an `unknown` narrowing block and a runtime `throw` guarding a field that cannot actually be missing.

**The path is right for the same reason under either approach, and it is a coincidence worth naming.** `src/` and `dist/` are both one directory below the package root, so from `routes/` the manifest is `../../package.json` in both trees. Change `rootDir` or `outDir` depth and that breaks — loudly, at startup, with `ERR_MODULE_NOT_FOUND`, not silently. Only the `dist/` case can occur anyway: Task 1.2.2 rejected running the TypeScript directly, so nothing ever executes `apps/backend/src`.

### The three fields

- **`status`** — `type HealthStatus = "ok"`, a one-member union. No degraded state invented for a server with no dependency to be degraded about. Epic 3 widens the union; that is an addition, not a break
- **`version`** — `manifest.version`, read once at module load
- **`uptimeSeconds`** — `process.uptime()`. The unit is in the field name so it travels with the response rather than living in a comment, and the name says nothing about "since listening" because it is not that: it is process uptime, which today differs by milliseconds and will differ by more once startup does real work

No JSON response schema on the route. Recorded here as a deferral: choosing a schema approach is entangled with Story 1.6's configuration validation and Story 1.7's error shape, and picking one now would pre-empt both. The comment in `server.ts` says so at the registration site.

`FastifyPluginCallback`, not the async form — there is nothing to await, and `require-await` is right about an async function that never does.

### Verified

| Check                                     | Result                                                                                                            |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 200, content type, all three fields       | As above. `application/json; charset=utf-8` is Fastify's own doing for a returned object — confirmed, not assumed |
| `uptime` increases between two calls      | `2.019194875` → `3.551603875` across a 1.5s gap                                                                   |
| `version` tracks the manifest             | Changed `package.json` to `0.0.1-healthcheck` with the loop running; the response followed. Reverted              |
| Route works under the Task 1.2.2 dev loop | One check, not two — the loop runs `dist/index.js`                                                                |
| Live edit without a manual rebuild        | Added a `probe` field to the response object; the new field appeared in the response ~7s later                    |
| Unmatched routes still 404                | `GET /nope` → 404, Fastify's own handler untouched                                                                |
| `pnpm verify` from the root               | Exit 0                                                                                                            |

The live-edit check doubled as a re-run of Task 1.2.2's type-error finding: the probe field was deliberately not in `HealthResponse`, so `tsc -b --watch` printed `src/routes/health.ts(62,40): error TS2353` **and the server restarted with the new field anyway**. That is the intended combination — loud error, server still up — and it is now confirmed against real code rather than a scratch `const broken`.

### One finding for later

**`apps/backend/package.json` is now a TypeScript program input and a file the running process loads.** Two consequences, both observed rather than reasoned about: editing the version triggered a `tsc` rebuild, and `node --watch` restarted the server because the manifest is a file it had loaded. Adding a dependency will therefore bounce the dev server. That is harmless and arguably correct, but it is surprising, and it is the sort of thing that reads as a bug when it happens during unrelated work. Belongs in `CLAUDE.md` alongside the dev-loop description (Task 1.2.6).

## Notes

Epic 3 makes this endpoint the natural place to report market-feed connection state. The union type on `status` is what makes that an addition rather than a breaking change.
