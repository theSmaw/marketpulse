# Task 1.2.4 — Graceful shutdown

**Status:** Not started
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
- Check Fastify 5's behaviour on **idle keep-alive connections** specifically. A browser holding an idle connection open is not work in flight, and if `close` waits on it the shutdown reads as a hang for reasons that have nothing to do with in-flight requests
- Log the shutdown: the signal received, and the exit. This is the one place where silence during a deploy is genuinely expensive

## Where this task stops

**`unhandledRejection` and `uncaughtException` are Story 1.7's**, and are listed in that story's acceptance criteria. Signals are an orderly stop; those two are a crash, and they want the structured logging that story brings. Do not install them here.

## Done when

- Start the server, hold a deliberately slow request open, send `SIGTERM`: the in-flight request completes with its real response and the process then exits 0
- A connection attempted after the signal is refused rather than accepted and dropped
- `SIGINT` (Ctrl-C in the terminal) behaves identically
- A second signal during shutdown does what the chosen behaviour says, and the timeout ceiling fires when a request refuses to finish
- The Task 1.2.2 dev loop still restarts on edit, and **restarts as quickly as before**. `node --watch` sends `SIGTERM` and blocks until the child exits — it logs `Waiting for graceful termination...` and then `Gracefully restarted` (both verified in Task 1.2.2), so from this task onward the drain time is added to every save. A three-second drain is three seconds on every edit
- Ctrl-C during a dev session is **not** the same path: the terminal signals the whole foreground process group, so the server child receives `SIGINT` directly rather than `SIGTERM` from the watcher. Both routes have to work, and Task 1.2.2 verified the group-signal route leaves nothing behind — this task must not be what changes that
- `pnpm verify` passes from the repository root

## Notes

The dev loop is the thing most likely to catch a mistake here, and Task 1.2.2 made that sharper than it was: a shutdown handler that hangs shows up as a dev server that stops restarting **and** a port that is never released, which reads as an unrelated `EADDRINUSE` on the next attempt rather than as a shutdown bug. Knowing that in advance is worth more than the test that finds it.

The slow-request test needs a route that takes a measurable time. Adding one to the shipped surface for the sake of a test is the wrong trade — use a temporary route, or `app.inject()`, and say in the outcome how it was actually verified so Story 1.9 can turn it into a real test rather than re-deriving it.
