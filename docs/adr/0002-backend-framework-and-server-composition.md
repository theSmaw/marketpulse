# ADR 0002 — Backend framework and server composition

**Status:** Accepted
**Date:** 2026-08-30
**Delivered by:** Epic 1, Story 1.2 (Tasks 1.2.1–1.2.6)

## Context

Story 1.2 builds the container every backend feature in Epics 2–10 is added
to: a TypeScript HTTP service that starts, serves `GET /health`, and shuts
down cleanly. No market data, no database, no domain logic.

`PRODUCT_SPEC.md` §29 left the framework at "Fastify or NestJS" and asked for
the backend to stay relatively small. That is a genuine decision rather than a
formality, because the answer constrains every later story — how routes
compose in Epic 7's investigation engine, how the streaming endpoints are
written in Epic 10, and how testable any of it is in Story 1.9.

Story 1.1 also added a technical input that was not neutral, and this record
exists partly to say so: the toolchain settled in ADR 0001 is not framework
agnostic.

## Decisions

### 1. Fastify, not NestJS

The spec's own argument was "keep the backend relatively small", which points
at Fastify on its own. The decision was not made on that alone, because a
preference for small is exactly the kind of reason that gets overturned later
by a preference for structure.

The argument that actually settled it is ADR 0001's module setup. This
workspace is ESM-only and single-file-transpile-safe: `"type": "module"`,
`module: nodenext`, `isolatedModules`, and `verbatimModuleSyntax`. NestJS's
decorator-and-metadata dependency injection wants `experimentalDecorators` and
`emitDecoratorMetadata`, much of its ecosystem is still CommonJS-oriented, and
`verbatimModuleSyntax` in particular interferes with the type-only imports its
DI relies on — a type imported with `import type` is erased, so the metadata
the container reads at runtime is not there.

**The rejected alternative and its cost.** NestJS would have supplied
structure this repository will eventually need: modules, providers, a DI
container, and a conventional place to put the investigation engine's
services. Choosing Fastify means either relaxing workspace-wide compiler
options for one package, or accepting friction in every backend file — and
neither is a price worth paying for structure that is not needed yet. So the
cost is deferred rather than avoided: **Epic 7 is where composition starts to
matter**, and Fastify's plugin and encapsulation model is the intended answer
there. If that answer turns out to be insufficient, this ADR is the thing to
supersede.

### 2. `buildServer()` returns an instance; the process lives in `index.ts`

`src/server.ts` exports `buildServer(): FastifyInstance`, which creates and
configures the application and returns it **without listening**.
`src/index.ts` is the only file that knows there is a process, an environment
and a socket: it reads `PORT`/`HOST`, calls `listen`, and installs the signal
handlers.

The split costs one file today and buys three things that are otherwise
retrofits: Story 1.9 drives an instance with `app.inject()` and no listening
socket; Stories 1.7 and 1.12 attach error handling and CORS to the same
factory; and nothing that builds a second instance inherits a set of
process-wide signal handlers by surprise.

**Signal handling is placed in the entrypoint for that last reason
specifically.** It is a property of this process, not of the application. A
factory that installs `process.on("SIGTERM", ...)` is a trap for the first
test that builds two servers.

### 3. `buildServer()` stays synchronous

It returns `FastifyInstance`, not `Promise<FastifyInstance>`.

`app.register()` is itself synchronous — it queues the plugin and defers
loading to `ready()`/`listen()` — so a caller that listens gets a fully
registered instance without the factory awaiting anything.

The rejected alternative was making it async pre-emptively, on the reasoning
that it will need to be eventually. It was rejected because the change is
mechanical when the trigger arrives and the trigger is unmistakable: **the
first `await app.register(...)` or explicit `await app.ready()`**. At that
point this becomes `Promise<FastifyInstance>` and every caller changes with
it, Story 1.9's tests included. Recorded because the next person to add a
plugin will face exactly this question and should not have to re-derive the
answer.

### 4. The development loop compiles rather than stripping types

`pnpm --filter @marketpulse/backend dev` runs `scripts/dev.sh`: `tsc -b`
once, then `tsc -b --watch --preserveWatchOutput` and `node --watch
dist/index.js` side by side. Two watchers, no dependencies, and the trigger
for a restart is tsc's emit rather than the edit itself.

**The rejected alternative was `node --watch src/index.ts`** on Node 24's
native type stripping — one process, no build step, and the obviously simpler
thing. It does not work here, and the reason is a direct consequence of ADR
0001 §11: this repository's relative imports carry the _emitted_ extension
(`./server.js`), which `nodenext` requires, and Node's type stripping does not
remap `.js` to `.ts`. Verified in Task 1.2.2 — it fails with
`ERR_MODULE_NOT_FOUND` on `src/server.js`.

Writing `./server.ts` instead does resolve, and TypeScript's
`rewriteRelativeImportExtensions` exists to make that legal. Both were
rejected for the same reason: they buy a local simplification with a
workspace-wide inconsistency — a second import convention that applies in one
package and not the other two. **That is the same shape of trade as the
framework choice above**, which is why it belongs in this record rather than
in a task file.

Two consequences of compiling instead of stripping, both deliberate:

- The loop **typechecks**. `tsc -b --watch` reports errors on every edit, and
  still emits when it finds them (`noEmitOnError` is not set), so the server
  restarts with erroring code and the error is above it in the log. A type
  error should not silently stop the server you are looking at.
- `--preserveWatchOutput` is load-bearing, not cosmetic. Without it the
  watcher clears the terminal on every rebuild, taking the server's own log
  output with it under root `pnpm dev`.

### 5. `version` is read with a JSON import, not `createRequire`

`src/routes/health.ts` does `import manifest from "../../package.json" with {
type: "json" }`.

Task 1.2.3 was written instructing the opposite, on the stated grounds that
`package.json` sits outside `rootDir` and therefore cannot be a program input.
**That was checked rather than trusted, and it is false.** `module: nodenext`
enables `resolveJsonModule`; TypeScript admits the file with no TS6059, emits
no copy of it into `dist/`, and rewrites nothing — the specifier survives
compilation verbatim and Node resolves it under its own import-attributes
support, unflagged, on the pinned Node 24.

The corrected fact is recorded here because the wrong version of it is exactly
the kind of thing that gets repeated. The payoff over `createRequire` is type
safety: the compiler reads the real manifest, so `version` is a `string` at
build time rather than an `any` needing a runtime shape check.

**Its cost, measured in Task 1.2.5.** Because the specifier survives
compilation, `dist/routes/health.js` reads a file one directory _above_
`dist/` at import time. A `dist/`-only copy therefore dies with
`ERR_MODULE_NOT_FOUND` before `listen` — see the deployment consequence below.
`createRequire` would have had exactly the same runtime reach and less type
safety, so the decision does not change; the consequence is recorded so
Story 1.11 does not have to rediscover it.

### 6. The shutdown ceiling is 5 seconds, and a second signal exits non-zero

`SIGTERM` and `SIGINT` both run one handler: log, `await app.close()`, exit 0.
A `setTimeout` of `SHUTDOWN_TIMEOUT_MS = 5000` logs and exits 1 if the drain
does not finish. A **second** signal during a shutdown already in progress
exits 1 immediately — the conventional Ctrl-C behaviour, and non-zero because
work in flight was dropped and exit 0 would claim otherwise.

The number sits between two constraints, and both belong here because someone
will otherwise change it without knowing what it was chosen against:

- **Above it:** Docker's default `stop` grace period is 10s and Kubernetes'
  `terminationGracePeriodSeconds` is 30s, so a 5s drain finishes well before
  either escalates to `SIGKILL`. Story 1.11 picks the orchestrator and may
  lower this; it should not need to raise it.
- **Below it: nothing.** `node --watch` sends `SIGTERM` and then waits for the
  child _indefinitely_ (Task 1.2.2), so there is no supervisor timeout for
  this to sit inside. The ceiling is the only thing standing between a bug in
  the handler and a dev loop that stops restarting.

The rejected alternative was an unbounded `await app.close()`. Its cost is
precisely that dev loop: a hung close means a watcher that never restarts and
a port never released, with no error to read.

Both ends were exercised in Task 1.2.6 rather than assumed: a 2s in-flight
request completed with 200 and the process exited 0 after 1.7s; an 8s one hit
the ceiling at 5.054s and exited 1 with the `shutdown timed out, forcing exit`
record; a second signal mid-drain exited 1 immediately.

**`forceCloseConnections` is deliberately unset**, and that is a measured
decision rather than an omission. Fastify 5 documents a default of `'idle'`,
but the `'idle'` branch of its onClose hook is gated on
`options.serverFactory`, which this server does not supply — so none of
Fastify's force-close paths run here at all. It does not matter, because
Node's own `server.close()` destroys idle connections (Node 19+):
`app.close()` resolved in under a millisecond with an idle keep-alive socket
held open, measured against both Fastify and a bare `http.createServer` to
confirm the attribution. This matters because the server advertises
`Keep-Alive: timeout=72`; if `close()` _did_ wait on idle sockets, shutdown
would read as a 72-second hang having nothing to do with work in flight. It is
in neither project's documentation, and a future Fastify upgrade should
re-measure it rather than assume it still holds.

## Consequences worth stating separately

### `apps/backend/dist` is not a deployable artifact, for two independent reasons

Copied on its own to a directory outside the workspace, it fails at import
time on `fastify` — before it ever reaches the health route's manifest read.
Give it a reachable `node_modules` and it then fails on
`../../package.json` (decision 5). Both are `ERR_MODULE_NOT_FOUND` before
`listen`, which is the loud version of this failure rather than a subtle one,
but **the first error hides the second**, so fixing the obvious half does not
produce a working artifact.

The **package directory** — `dist` + `package.json` + `node_modules` — does
run outside the workspace: verified in Task 1.2.5 by copying it entirely
outside the repository, where it started, served `/health` with the manifest
version, and exited 0 on `SIGTERM`. That is the shape `pnpm deploy --filter
@marketpulse/backend` produces, so Story 1.11's named mechanism is confirmed
rather than assumed.

One half of this is currently latent: nothing in the emitted tree imports
`@marketpulse/shared`, so the pnpm symlink into `packages/shared` is never
followed at runtime. Story 1.12's first import from that package is what makes
it live.

### The `pnpm start` wrapper is signal-transparent

`apps/backend` has a `start` script — `node dist/index.js` — added in Task
1.2.5 because "production build emits runnable output" needs a documented way
to run it. It is an **extra, not a seventh verb**: the same status `lint:fix`
has, with no root fan-out and no place in `verify`.

Whether a package manager belongs between an orchestrator and a server is
usually asserted rather than measured, so it was measured: `pnpm run` forwards
`SIGTERM` to the child, **waits** for it to finish stopping (3.002s against a
stand-in that took 3s), and **propagates its exit code** (7 from a probe, 1
from the real server on a busy port, with the `EADDRINUSE` record intact).
Both signal routes were tested separately — `SIGTERM` to the pnpm process,
which is what an orchestrator does, and `SIGINT` to the process group, which
is what Ctrl-C does — and both produce a clean exit 0 with the port released.

So a container `CMD` of `pnpm start` would not swallow the signal or truncate
the drain. It still adds a process, a package manager and a resolution step to
a production image for no benefit once the artifact is built, which makes
`node dist/index.js` the better choice in Story 1.11 — but as a preference,
not as a bug being avoided.

### Fastify's startup log is not evidence of the bound interface

It rewrites `0.0.0.0` to `127.0.0.1` in its `Server listening at` line, so a
server that _is_ listening on all interfaces logs as though it is not.
Confirmed twice with `lsof` (Tasks 1.2.1 and 1.2.6): `HOST=0.0.0.0` logs
`http://127.0.0.1:4322` while the socket reads `*:4322 (LISTEN)`. Story 1.11's
host-binding question has to be answered by checking the socket.

### What this story deliberately did not do

Each of these belongs to a later story, and each is a thing a backend skeleton
attracts:

- **Configuration** (Story 1.6) — `PORT` and `HOST` are read inline in
  `index.ts` and nothing else. There is slightly more to replace than two
  `process.env` reads: a `ConfigError` type, a range check on `PORT`, and a
  fail-before-the-logger-exists stderr path that names the variable and the
  value it was given, where a Node bind error names neither
- **Structured logging, error shape, `unhandledRejection`** (Story 1.7) —
  Fastify's default logger, untouched. `NODE_ENV=production` currently changes
  nothing about it: the built server produced a log stream identical to the
  default run, line for line
- **A JSON response schema on `/health`** (Story 1.7) — deliberately absent,
  because choosing a schema approach is entangled with that story's error
  shape and Story 1.6's configuration validation. The deferral is recorded at
  the registration site in `server.ts` so it is not read as an oversight
- **Tests** (Story 1.9) — the `buildServer()` split exists so `app.inject()`
  is possible, but no runner is chosen here. Note that injection covers the
  response half of this backend and none of the process half: signals, exit
  codes, the ceiling and the second-signal path all need a real child process
  started, signalled and waited on
- **Deployment** (Story 1.11) — see above
- **CORS** (Story 1.12) — not considered by any task in this story. Nothing
  here proves a browser on another origin can reach this endpoint, and that is
  a deliberate deferral rather than an oversight

## Related

- [ADR 0001](0001-repository-structure-and-typescript-toolchain.md), whose
  module decisions constrained the framework choice and the development loop
- [Story 1.2](../../planning/epic-01-application-foundation/story-02-backend-service-skeleton/STORY.md)
  and its six task records, which carry the measurements behind each claim
- `PRODUCT_SPEC.md` §29 (backend architecture), §39 (architecture decision
  records)
