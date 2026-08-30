# Task 1.2.4 — Graceful shutdown

**Status:** Complete — 2026-08-30
**Story:** [1.2 Backend Service Skeleton](STORY.md)
**Depends on:** Task 1.2.3

## Objective

`SIGTERM` and `SIGINT` stop the server without dropping work in flight: no new connections accepted, existing requests allowed to finish, process exits 0.

## Work

- Handle `SIGTERM` and `SIGINT` in `src/index.ts` — the entrypoint, not `buildServer()`. A process-wide signal handler installed by a factory is a surprise for anything that builds two instances, which Story 1.9's tests will. Task 1.2.1 left a comment at the exact spot, between `buildServer()` and the `listen` call
- **Revisit the listen-failure path while you are there.** Task 1.2.1 ends with `app.log.error(...)` then `process.exit(1)` if `listen` rejects. Once `close()` exists as the orderly stop, decide whether a failed start should also go through it — a port already in use leaves nothing to drain, but the logger has buffered output, and `process.exit` does not flush it
- On signal: `await app.close()`, then exit 0. Fastify's `close` is what stops the listener and drains in-flight requests; do not hand-roll a connection tracker
- **Make the handler idempotent.** A second signal while shutdown is in progress must not start a second close. Conventionally a second Ctrl-C means "I meant it" — exit immediately, and say which behaviour was chosen
- **Put a ceiling on it.** A request that never finishes must not wedge the process forever: after a bounded wait, exit non-zero. Pick the timeout deliberately and write down the number and the reason — an orchestrator's own kill timeout is the constraint this has to sit inside, and Story 1.11 chooses the orchestrator. **Task 1.2.2 added a nearer constraint than that one:** `node --watch` restarts by sending the child `SIGTERM` and then waits for it **indefinitely** — verified, 20 seconds with no force-kill, the old process still alive and still holding the listening port. There is no supervisor timeout to sit inside here because there is no supervisor timeout at all. The ceiling this task picks is the only thing standing between a bug in the handler and a dev loop that never restarts again
- Check Fastify 5's behaviour on **idle keep-alive connections** specifically. A browser holding an idle connection open is not work in flight, and if `close` waits on it the shutdown reads as a hang for reasons that have nothing to do with in-flight requests. **Task 1.2.3 put numbers and a mechanism on this**, so it is a check with a known shape rather than an open question:
  - The server advertises `Keep-Alive: timeout=72` — Fastify 5's default `keepAliveTimeout` of 72 seconds, observed in a real response header. That is the worst case if `close()` does wait on an idle socket, and it is an order of magnitude past any ceiling this task would sensibly pick
  - The relevant option is `forceCloseConnections`, and reading Fastify 5.12.1's source shows the default is `'idle'` **but the `'idle'` branch in its `onClose` hook is gated on `options.serverFactory`** — this server does not supply one. So the idle-connection behaviour here comes from Node's own `server.close()`, not from the Fastify code path that appears to handle it. Measure it against this server rather than inferring it from either the option's default or Fastify's documentation
  - If it does wait, `forceCloseConnections: true` in `buildServer()` is the lever. Note that it is an application-level option, so it would be the first thing this story puts in the factory for the benefit of the process — say so if it is needed
- Log the shutdown: the signal received, and the exit. This is the one place where silence during a deploy is genuinely expensive

## Where this task stops

**`unhandledRejection` and `uncaughtException` are Story 1.7's**, and are listed in that story's acceptance criteria. Signals are an orderly stop; those two are a crash, and they want the structured logging that story brings. Do not install them here.

## Done when

- Start the server, hold a deliberately slow request open, send `SIGTERM`: the in-flight request completes with its real response and the process then exits 0
- A connection attempted after the signal is refused rather than accepted and dropped. Task 1.2.3 makes this concrete: `GET /health` is a real route with a known 200 response, so "refused" is distinguishable from "404" and from "hung", which it was not while the server served nothing but Fastify's own 404
- `SIGINT` (Ctrl-C in the terminal) behaves identically
- A second signal during shutdown does what the chosen behaviour says, and the timeout ceiling fires when a request refuses to finish
- The Task 1.2.2 dev loop still restarts on edit, and **restarts as quickly as before**. `node --watch` sends `SIGTERM` and blocks until the child exits — it logs `Waiting for graceful termination...` and then `Gracefully restarted` (both verified in Task 1.2.2), so from this task onward the drain time is added to every save. A three-second drain is three seconds on every edit
- Ctrl-C during a dev session is **not** the same path: the terminal signals the whole foreground process group, so the server child receives `SIGINT` directly rather than `SIGTERM` from the watcher. Both routes have to work, and Task 1.2.2 verified the group-signal route leaves nothing behind — this task must not be what changes that
- `pnpm verify` passes from the repository root

## Outcome

`SIGTERM` and `SIGINT` both drain in-flight work and exit 0. The handler is in `src/index.ts`, twenty lines and a constant, and nothing was added to `buildServer()` for it.

### The number: 5 seconds, and why

`SHUTDOWN_TIMEOUT_MS = 5000`. It has to sit inside two constraints and it sits inside both.

Above it: Docker's `stop` grace period is 10s and Kubernetes' `terminationGracePeriodSeconds` is 30s, so a 5s drain finishes before either escalates to `SIGKILL`. Story 1.11 picks the orchestrator and may want this lower; it should not need it higher.

Below it: there is no supervisor timeout to sit inside during development. Task 1.2.2 established that `node --watch` sends `SIGTERM` and then waits **indefinitely**, so this ceiling is the only thing between a bug in the handler and a dev loop that stops restarting. Every drained second is added to every save, and 5s is short enough that a wedged shutdown reads as "something is wrong" rather than as a slow rebuild.

In practice the drain is sub-millisecond — nothing this server serves takes measurable time — so the ceiling exists entirely for the request that never finishes.

### Idle keep-alive connections do not delay `close()`, and Fastify is not the reason

This task inherited a specific suspicion from Task 1.2.3: the server advertises `Keep-Alive: timeout=72`, so if `close()` waited on an idle socket, shutdown would read as a 72-second hang having nothing to do with work in flight. Measured rather than inferred, as the task said to.

A probe held one keep-alive socket open with its request already completed, then called `app.close()`. It resolved in **under a millisecond**. A bare `http.createServer` under the same probe resolved in 1ms, which is the attribution: **Node's own `server.close()` destroys idle connections** (Node 19 onwards), so this is nothing Fastify did.

That matters because Fastify looked like it was handling it and was not. `forceCloseConnections` defaults to `'idle'`, but the `'idle'` branch of Fastify 5.12.1's `onClose` hook is gated on `options.serverFactory`, which this server does not supply — so none of Fastify's three force-close branches run here at all. Reading the option's default would have given the right answer for the wrong reason, and reading the source alone would have given the wrong answer.

So **`forceCloseConnections` is not set**, and `buildServer()` gains no option for the benefit of the process. The measurement and the attribution are recorded as a comment at the point where the option would otherwise go, because "no option here" is invisible and the next person will re-ask this.

### Idempotency: a second signal means "I meant it"

A `shuttingDown` flag guards re-entry. The second signal does **not** start a second close and does **not** wait — it logs and exits immediately with **1**, the conventional double-Ctrl-C behaviour. Non-zero rather than 0 because work in flight was dropped, and a zero exit would claim otherwise.

The ceiling timer is deliberately **not** `unref()`d. An unref'd timer can be skipped if the only other thing holding the loop open is itself unref'd; every path here clears it, so keeping the loop alive costs nothing and the ceiling is guaranteed to fire.

### The listen-failure path was revisited and left alone

Task 1.2.1's `app.log.error(...)` then `process.exit(1)` stays, and does **not** route through `close()`. A failed listen has no bound socket and no requests in flight, so there is nothing to drain; running Fastify's `onClose` hooks against a server that never started would stack a second failure mode on top of the one being reported.

The buffered-output worry that prompted the question was checked directly rather than reasoned about: starting a second server on a busy port prints the full `EADDRINUSE` log record before the process leaves. Nothing is lost to `process.exit`, so there is no problem to fix.

### Verified

Every row below was executed against `dist/index.js` on port 4321. The slow route was a temporary `FastifyPluginCallback` in `src/routes/slow.ts` — `/slow` sleeping 3s and `/never` sleeping 10 minutes — registered by `buildServer()` and **deleted afterwards**, along with its emitted output. Story 1.9 should turn these into real tests rather than re-deriving them; `app.inject()` covers the response half but not the process half, and the process half is what this task is.

| Check                                      | Result                                                                                                                                       |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| In-flight request survives `SIGTERM`       | Signal sent 0.5s into a 3s request; the client got `{"sleptMs":3000}` and `HTTP 200 in 3.011634s`. Process exited **0**                      |
| Connection after the signal is refused     | `curl` to `/health` 0.5s after the signal: `Failed to connect ... Couldn't connect to server`. Refused, not 404, not hung                    |
| `SIGINT` behaves identically               | Same test: `HTTP 200 in 3.011918s`, exit **0**, log records `"signal":"SIGINT"`                                                              |
| The ceiling fires                          | `/never` in flight, `SIGTERM`: `shutdown timed out, forcing exit` and exit **1** after **5.0s** measured wall-clock                          |
| Second signal during shutdown              | `SIGTERM` then `SIGINT` 0.7s later with `/never` in flight: `second signal during shutdown, exiting immediately`, exit **1**, no 5s wait     |
| Idle keep-alive does not delay `close()`   | `close()` resolved in **0ms** with an idle keep-alive socket open; bare `http.createServer` 1ms. Node 24.20.0                                |
| Listen failure still logs before exiting   | Second server on a busy port: full `EADDRINUSE` record on stdout, exit **1**                                                                 |
| Dev loop still restarts on edit            | Edited `health.ts`; `Restarting 'dist/index.js'`, drain logged at the same millisecond it started, new listener **140ms** after the signal   |
| Ctrl-C during a dev session leaves nothing | `SIGINT` to the loop's process group: all four processes gone, port released, and the server logged its own graceful shutdown on the way out |

The dev-loop row is the one worth reading twice. The drain is not perceptible — `signal received` and `shutdown complete` carry the same timestamp — so the "three-second drain is three seconds on every edit" risk this task was written to watch for did not materialise. It would the moment a route acquires a real dependency, which is Epic 2.

The process-group row also **improved** on Task 1.2.2 rather than merely preserving it: Ctrl-C previously killed the server outright, and now the server shuts down deliberately and says so before it goes.

### What this did not prove

Nothing here says anything about a container runtime actually sending `SIGTERM` to PID 1, which is Story 1.11's problem and a classic place for shells to swallow signals. And the ceiling was only proved to fire — not that 5 seconds is the right number for a workload that does not exist yet.

## Notes

The dev loop is the thing most likely to catch a mistake here, and Task 1.2.2 made that sharper than it was: a shutdown handler that hangs shows up as a dev server that stops restarting **and** a port that is never released, which reads as an unrelated `EADDRINUSE` on the next attempt rather than as a shutdown bug. Knowing that in advance is worth more than the test that finds it.

The slow-request test needs a route that takes a measurable time. Adding one to the shipped surface for the sake of a test is the wrong trade — use a temporary route, or `app.inject()`, and say in the outcome how it was actually verified so Story 1.9 can turn it into a real test rather than re-deriving it. Task 1.2.3 established the shape a route takes here — a `FastifyPluginCallback` in `src/routes/`, registered by `buildServer()` — so a temporary one follows that pattern and is deleted afterwards rather than invented ad hoc inline.

Task 1.2.3 also confirmed the dev loop is a genuinely fast feedback channel for this: editing the route produced the new response in about seven seconds with no manual rebuild. Since `node --watch` restarts by sending `SIGTERM`, every one of those saves will exercise the handler this task writes.
