# Task 1.2.6 — Verify the story end to end and document

**Status:** Not started
**Story:** [1.2 Backend Service Skeleton](STORY.md)
**Depends on:** Task 1.2.5

## Objective

Walk the story's six acceptance criteria as a single pass rather than trusting five tasks' individual claims, and write down what was decided. The same shape as Task 1.1.8, which is what made Story 1.1 trustworthy.

## Work

### Verify

Run all six of the story's acceptance criteria in one sitting, from a build made after `pnpm clean`, and record what was actually executed rather than what should work:

- Server starts locally on a configurable port
- `GET /health` returns 200 with status, version and uptime
- Development mode restarts on source change
- Production build emits runnable output
- Process shuts down gracefully on `SIGTERM`/`SIGINT`, closing in-flight requests
- `pnpm verify` passes from the repository root

Also re-run the whole documented command set for this package — the six verbs plus `start` — as Task 1.1.8 did, because two of them (`dev`, and whatever `build` now means) changed meaning during this story.

`dev` is the one that needs running rather than reading. Task 1.2.2 verified it against the code as it stood then; the graceful shutdown from Task 1.2.4 now sits in the restart path, so the loop's behaviour has changed since it was signed off. Restart on edit, Ctrl-C leaving no orphan (check the `node dist/index.js` child specifically, not just the `node --watch` supervisor, and check the port is released), and root `pnpm dev` staying legible are all worth re-running here rather than inherited.

Task 1.2.4 measured that restart so this task has a baseline rather than an impression: **140ms from `SIGTERM` to the new listener**, with the drain itself sub-millisecond. If it is now seconds, something regressed, and the likely cause is a route acquiring a dependency that does not close promptly. Task 1.2.4 also changed the Ctrl-C output — the server logs its own `signal received` / `shutdown complete` on the way out where it previously just died — so a silent Ctrl-C is now a symptom rather than the normal case.

### Document

- **Write `docs/adr/0002-backend-framework-and-server-composition.md`** and add its row to `docs/adr/README.md`'s index. The framework choice is exactly the kind of decision PRODUCT_SPEC.md §39 wants recorded, and the reasoning is unusually worth keeping: Fastify was chosen over NestJS partly on the spec's "keep the backend relatively small" and partly because NestJS's decorator-and-metadata model fights `verbatimModuleSyntax` and the ESM-only setup, which would have meant relaxing workspace-wide options for one package. Record the rejected alternative and its cost, not just the winner. The `buildServer()` / entrypoint split and the signal-handling placement belong in the same record — and so does **the development loop**, which is a composition decision with a rejected alternative of its own: `node --watch src/index.ts` on Node 24's native type stripping cannot resolve this repository's `./thing.js` specifiers, and `rewriteRelativeImportExtensions` would fix that at the price of a second import convention in the workspace (Task 1.2.2). That is the same shape of trade as the framework choice — a local simplification paid for with a workspace-wide inconsistency — and it belongs beside it rather than buried in a task file. Two smaller composition decisions from Task 1.2.3 belong in the same record, both with a rejected alternative:
  - **`buildServer()` stays synchronous.** `app.register()` queues and defers loading to `ready()`, so the factory needs no `await`. The rejected alternative is making it `Promise<FastifyInstance>` pre-emptively; the trigger that would force it is the first `await app.register(...)` or explicit `await app.ready()`, and it changes every caller including Story 1.9's tests. Worth recording because the next person to add a plugin will face exactly this question
  - **`version` is read with a JSON import, not `createRequire`.** Task 1.2.3 was written instructing the opposite, on the stated grounds that `package.json` sits outside `rootDir` and so cannot be a program input. That was checked and is false: `module: nodenext` enables `resolveJsonModule`, there is no TS6059, no copy of the manifest is emitted into `dist/`, and the specifier survives compilation for Node to resolve under its own import-attributes support. The JSON import wins on type safety — the compiler reads the real manifest, so `version` is a `string` at build time rather than an `any` needing a runtime shape check. Record the corrected fact, because the wrong version of it is the kind of thing that gets repeated

  Task 1.2.4 adds a third composition decision to the same record, and it is the one with a number in it that someone will otherwise change without knowing what it was chosen against:

  - **The shutdown ceiling is 5 seconds, and the second-signal behaviour is "exit immediately, non-zero".** Record both constraints the number sits between — Docker's 10s stop grace and Kubernetes' 30s `terminationGracePeriodSeconds` above it, and the _absence_ of any supervisor timeout below it, since `node --watch` waits on the child indefinitely. The rejected alternative is an unbounded `await app.close()`, whose cost is a dev loop that stops restarting and a port that is never released. Also record that `forceCloseConnections` is deliberately **unset**: Fastify defaults it to `'idle'` but gates that branch on `options.serverFactory`, so none of its force-close paths run here, and idle sockets are closed by Node's own `server.close()` instead. That is a measured fact about two layers, it is not in either project's documentation, and it is the kind of thing a future Fastify upgrade should be re-measured against rather than assumed

- **Update `CLAUDE.md`** — the current-state paragraph (the backend is no longer a skeleton; the two apps are no longer symmetrical), the file tree, and the Commands section. The `dev` placeholder sentence is now wrong for `apps/backend` and must change; `start` needs stating as an extra like `lint:fix`. The "`pnpm test` means no tests exist" warning stays exactly as it is — this story adds no tests. Task 1.2.2 left four specific stale claims in that file, and they are easy to miss because only one of them mentions the backend:
  - "`packages/shared`'s `dev` is really `tsc -b --watch`" — the script is now `tsc -b --watch --preserveWatchOutput`, and the flag is load-bearing rather than cosmetic: without it that watcher clears the terminal under root `pnpm dev` and takes the other packages' output with it
  - the sentence describing `pnpm dev` as printing two placeholder lines and then sitting in shared's watcher — it is now one placeholder line and a running server
  - the file tree has no `apps/backend/scripts/dev.sh`, which is the first file in the repository that is neither source nor config
  - `pnpm dev` from the root builds `packages/shared` twice, once in its own watcher and once through the backend's `tsc -b --watch` following the project reference. Harmless and worth a line, since the symptom of it going wrong would be a corrupted `.tsbuildinfo` with no obvious cause

  Task 1.2.3 added a fifth, of the same kind — surprising behaviour with a boring cause:

  - **`apps/backend/package.json` is now both a TypeScript program input and a file the running process loads**, because the health route imports it for `version`. So editing it triggers a `tsc` rebuild _and_ a `node --watch` restart: **adding a dependency bounces the dev server**. Both were observed, not reasoned about. It is harmless and arguably correct, but during unrelated work it reads as a bug, which is exactly what a line in `CLAUDE.md` is for

- **Update `README.md`** to match. It carries the same command set for humans and the two must stay in step
- **Fix `apps/backend/package.json`'s `description`**, which still reads "MarketPulse API server — a skeleton until Story 1.2". Task 1.2.1 deliberately left it rather than half-correcting it mid-story
- **Update this story's `STORY.md`** — status, the resolved framework decision, and the task table
- **Update `EPIC.md`** — Story 1.2's status, and check whether anything this story learned changes what a later story says. Stories 1.6, 1.7, 1.9, 1.11 and 1.12 all make claims about the backend that were written before it existed

### Then check the downstream stories

Story 1.1's follow-up pass found real corrections in eleven stories. Do the same here, narrowly: 1.6 (configuration replaces this story's two `process.env` reads), 1.7 (error shape, `unhandledRejection`, and the logger this story left at Fastify's default), 1.9 (`app.inject()` against `buildServer()`), 1.11 (`pnpm deploy`, the container host binding, the shutdown timeout inside the orchestrator's kill timeout) and 1.12 (promoting the health type into `packages/shared`). Amend those stories where this story made something concrete that they described speculatively.

Specific findings from the tasks, which should reach the stories that need them rather than staying in a task file:

- **Story 1.11 — Fastify's startup log is not evidence of the bound interface.** It rewrites `0.0.0.0` to `127.0.0.1` in its `Server listening at` line, so a container that _is_ listening on all interfaces logs as though it is not (Task 1.2.1, confirmed with `lsof`). That story's whole host-binding question has to be answered by checking the socket
- **Story 1.6 — there is slightly more to replace than two `process.env` reads.** Task 1.2.1 also added a `ConfigError` type, a range check on `PORT`, and a fail-before-the-logger-exists stderr path. Whatever configuration approach 1.6 picks has to keep that failure behaviour, not just the values
- **Story 1.12 — `apps/backend` currently declares `@marketpulse/shared` without importing it** (Task 1.2.5). Promoting the health type there is what makes the manifest entry honest again, which is worth saying in that story so the dependency is not deleted first
- **Story 1.12 — the type it promotes now exists, with names.** `HealthResponse` and `HealthStatus`, exported from `apps/backend/src/routes/health.ts`. Two details that story currently has to guess at: the uptime field is **`uptimeSeconds`**, not `uptime` — the unit travels in the name so it survives the wire — and `HealthStatus` is a one-member union `"ok"`, so the "healthy / degraded / unreachable" distinction that story describes is entirely client-side today. Nothing widens the union until Epic 3
- **Story 1.7 — the health route deliberately carries no JSON response schema** (Task 1.2.3), because choosing a schema approach is entangled with that story's error shape and Story 1.6's configuration validation. Whichever story picks one inherits this route as its first subject; the deferral is recorded at the registration site in `server.ts` so it is not mistaken for an oversight
- **Story 1.11 — `/health` reports whatever `version` the deployed manifest carries.** Free version reporting if the release process sets it, a permanently `0.0.0` health endpoint if it does not. A decision to make rather than default into (Task 1.2.5)
- **Story 1.9 — `app.inject()` cannot test any of Task 1.2.4's behaviour**, and that story should know it before it picks a runner. Injection drives an instance with no listening socket, so it covers the response half of this backend and none of the process half: signals, exit codes, the 5-second ceiling and the second-signal path all need a **real child process** started, signalled and waited on. Task 1.2.4 verified them exactly that way — spawning `dist/index.js`, `kill -TERM`, reading the exit code — which is a workable test shape but a slow one, and it needs a built tree rather than just a compiled instance. The temporary slow route it used (a `FastifyPluginCallback` in `src/routes/`, deleted afterwards) is the shape a fixture would take; it was deliberately not left in the shipped surface
- **Story 1.7 — its crash handlers have to coexist with a shutdown already in progress.** That story installs `unhandledRejection` and `uncaughtException`, which Task 1.2.4 deliberately did not. They will sit alongside a signal handler that owns a `shuttingDown` flag and a timeout, and the interaction needs deciding rather than discovering: a rejection thrown _during_ the drain must not restart the close or cancel the ceiling. The flag is already there to be reused
- **Story 1.11 — the shutdown ceiling is 5 seconds and the orchestrator's kill timeout has to be larger.** That story picks the orchestrator, so it owns the comparison. Also, and separately: Task 1.2.4 proved signal handling against a process it started directly, which says nothing about a container delivering `SIGTERM` to PID 1 — a shell-form `CMD` or a wrapper script that does not `exec` will swallow it, and the symptom is a 10-second pause and a `SIGKILL` rather than an error. Task 1.2.5 checks the nearer version of this question (whether the signal survives the `pnpm start` wrapper) and whatever it finds should reach this story
- **Story 1.10 — `pnpm verify` no longer covers every file in the repository.** `apps/backend/scripts/dev.sh` is checked by nothing: ESLint sees only JS and TS, Prettier has no shell parser and skips it silently, and `tsc` has no view. It is the first file in the workspace outside the tooling net, and it is a file that starts the development server, so a syntax error in it is a real if minor failure mode. **Do not add `shellcheck` in this story** — one small shell file does not justify a new root dependency and a fifth step in `verify`. Say so in that story instead, so the gap is a known and dated choice rather than something CI is quietly assumed to catch

## Done when

- Every acceptance criterion has been executed, and the outcome says what command produced what result
- ADR 0002 exists and is indexed
- `CLAUDE.md`, `README.md`, `STORY.md` and `EPIC.md` agree with each other and with the repository
- `pnpm verify` passes from the repository root
- Story 1.2 is marked complete

## Notes

Task 1.1.8's most useful habit was naming what a verification **could not** prove. Do the same: a local run proves nothing about the deployed environment (Story 1.11), and nothing here proves the frontend can reach this endpoint across an origin boundary (Story 1.12) — CORS has not been considered by any task in this story, which is a deliberate deferral and should be recorded as one.
