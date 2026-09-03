# Task 1.10.5 — The backend's process half: a child-process test suite

**Status:** Not started
**Story:** [1.10 Continuous Integration Pipeline](STORY.md)
**Depends on:** Task 1.10.2

## Objective

Close the hole Story 1.9 handed this story by name: signals, exit codes, the shutdown ceiling, the second-signal path, `EADDRINUSE` and both crash handlers — none of which `app.inject()` can reach, and all of which need a real child process against a built tree.

## Work

- **This is inherited work with a stated owner, not a new idea.** Task 1.9.3 recorded the whole class as out of scope rather than half-building one, and the argument was CI-shaped: such a test needs a build to have run, spawns and signals processes, and **its first failure mode is a port held by a previous run** — which is precisely the hazard a shared runner has and a laptop does not. That is why it lands here rather than in Story 1.9, and it means the runner is the environment this suite has to be _designed_ for
- **The behaviours were all verified by hand once already**, in Tasks 1.2.4, 1.2.6 and 1.7.5, by spawning `dist/index.js`, sending signals and reading exit codes. That is the shape to automate, and the measurements are the assertions' baselines rather than the assertions themselves:
  - `SIGTERM` and `SIGINT` both drain and exit **0**, with the port released; the drain itself is sub-millisecond and signal-to-exit is ~100 ms
  - A busy port exits **1** with the `EADDRINUSE` record intact — 16 rendered lines in `pretty`, of which the message is line 4, because the whole record is an `err` object
  - `uncaughtException` and `unhandledRejection` both write a level-**60** record through the logger and exit **1**, with `LOG_LEVEL` deliberately overridden for exactly that one record and **restored afterwards** — the restore is the part that regressed once and silently lost `shutdown complete`, so it is worth an assertion of its own
  - A crash **during** a drain reuses the `shuttingDown` flag: the record is written, the existing drain finishes, the in-flight request is answered 200 and the exit is **0**
  - The shutdown ceiling forces an exit with a level-50 `shutdown timed out, forcing exit`
- **Decide the port strategy first, and know that the obvious one is unavailable.** `PORT=0` — bind an ephemeral port and read it back — is rejected by `config.ts`, whose range is `MIN_PORT = 1` to `MAX_PORT = 65535`. So the options are a per-test port from a range unlikely to collide, a probe that finds a free port before spawning, or widening the config's range to admit 0. The third is a change to the shipping application made for a test's convenience and needs arguing rather than doing; whichever is chosen, **a port held by a previous run must produce a diagnosable failure rather than a flake**, because on a shared runner that is the failure everyone will actually see
- **Do not wait for `Server listening at …`, on any path.** At `LOG_LEVEL=warn` and above a healthy server writes **zero lines**, that one included, so a readiness wait that greps the log hangs rather than fails — the worse failure. Three further reasons the same grep is wrong and all of them apply here: Fastify rewrites `0.0.0.0` to `127.0.0.1` in that line so it is not evidence of the bound interface; Task 1.8.2 changed the `pretty` clock format, so a matcher written against the old shape matches nothing; and `pretty` and `json` render the same record two different ways. **Poll `GET /health`**, and note that **Node's `fetch` tries both address families while `curl` does not** — the backend binds IPv4, so a Node-side probe on `localhost` works and a `curl` line has to name the family
- **Run the suite against the built tree, and make that dependency explicit.** `dist/index.js` is what has the process behaviour in it; a stale `dist` here is a suite testing the previous commit. `pnpm verify` orders the build before the tests, so a suite inside the ordinary `test` run inherits that ordering for free — which is one argument for putting it there
- **Decide where it runs: inside `pnpm test` or beside it.** Story 1.9's warning is explicit — putting spawn-and-signal tests in the same `vitest run` as 48 injected ones makes the fast suite conditional on a build and occasionally flaky, and the fast suite is the one developers run all day. The alternatives are a second Vitest project or config in `apps/backend`, or a separate root script that CI runs as its own step. Each has a cost the repository already has an opinion about: a second config in one package is the shape `@storybook/addon-vitest` was rejected for, and a separate root script is an eighth verb-adjacent command. **Whatever is chosen, it must be runnable locally by one documented command** — a test that only exists in CI is a test nobody can debug
- **Keep the conventions Story 1.9 wrote down.** Tests live in `src/` beside their subject (forced: ESLint's project service only discovers a `tsconfig.json`, and a file outside the package's `include` is a hard parsing error, not a silent skip); `globals` is off and `describe`/`it`/`expect` are imported; relative imports carry `.js`; a helper is file-local in `apps/backend` because that package emits, and a `src/test-support.ts` would ship into `dist/` beside the server. If a fixture is needed, remember `tsc -b --clean` deletes the output of sources that _currently_ exist — a fixture added and deleted by hand orphans its `dist/` files permanently
- **Say what this does to the coverage figure and to the story's own record.** `apps/backend/src/index.ts` is at **0%** by decision and is the file this suite exists to reach. Take the backend's coverage again afterwards and report the movement, because Task 1.10.4's threshold decision depends on which denominator it was taken against
- **Timeouts are the flake surface.** Every assertion here waits on a process — for a listener, for an exit, for a drain. Give each wait a bounded deadline that fails with a message naming what it was waiting for, and expect a CI runner to be several times slower than the laptop the ~100 ms and ~1.1 s figures came from. **Assert on behaviour and exit codes, not on the timings**; the timings are baselines for a human reading a regression, not thresholds

## Done when

- Signals, exit codes, the shutdown ceiling, the second-signal path, `EADDRINUSE` and both crash handlers are covered by tests that spawn a real process against the built tree
- The port strategy makes a leftover listener a diagnosable failure rather than a flake, and the `PORT=0` finding is recorded whichever way it is resolved
- Nothing in the suite waits on a log line
- The suite runs locally with one documented command and runs on the runner
- The suite was seen to fail for each behaviour by breaking it, not only to pass
- The backend's coverage figure is re-taken and the movement recorded

## Notes

The story is right that this is not a pipeline task. It is in this story because CI is where its hazards live and where its value is realised — the process half of this backend has been verified exactly twice in the repository's history, both times by hand, both times by the person who had just written it.
