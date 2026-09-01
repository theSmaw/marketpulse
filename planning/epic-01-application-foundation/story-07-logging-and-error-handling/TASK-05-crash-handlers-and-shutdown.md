# Task 1.7.5 — Crash handlers, and their interaction with shutdown

**Status:** Not started
**Story:** [1.7 Logging & Error Handling](STORY.md)
**Depends on:** Task 1.7.4

## Objective

Catch and log what escapes the request lifecycle entirely, without breaking the drain that is already there.

## Work

- **Measure what happens today before writing anything, because the criterion's wording is slightly wrong about it.** `unhandledRejection` and `uncaughtException` have no handlers, but Node has defaults: since Node 15 an unhandled rejection is thrown and exits the process non-zero, and an uncaught exception prints a stack to stderr and exits. So the process does not crash _silently_ — it crashes **outside the log stream**, as raw stderr with no level, no timestamp, no correlation id and nothing a log aggregator can index. Quote both defaults as literal output; that is what this task is actually replacing
- **The handlers go in `index.ts`, not `buildServer()`.** They are process-wide, and a factory that installs process-wide handlers is a surprise for anything constructing two instances — which Story 1.9's tests will. This is the same reason the signal handlers live there, and the file's comment already says so
- **The `shuttingDown` flag exists to be reused, and this is the interaction to decide rather than discover.** A shutdown owns the flag and a 5-second ceiling (ADR 0002 §6). A rejection thrown _during_ the drain must not start a second `app.close()`, must not clear or restart the ceiling, and must not turn a clean exit 0 into a race. Reuse the flag: if `shuttingDown` is already true, log and let the existing path finish. Test it, by throwing during a drain rather than reasoning about it
- **Decide log-and-exit versus log-and-continue, for each of the two events separately.** After an `uncaughtException` the process state is unknown by definition, so continuing serves requests from a program that has already proved it is not the program you thought — exit. An unhandled rejection is arguably softer, but treating the two differently means two behaviours to remember and Node's own default already treats them the same. Recommend exiting on both and say what would change that
- **The flush worry was measured in Task 1.7.1 and did not materialise — but the shape of the question changed, so re-take it rather than citing it.** Two things 1.7.1 established. First, **the default path has no worker thread at all**: `transport` is set only for `LOG_FORMAT=pretty`, so a production process logging JSON is writing through pino's ordinary destination and the worker-thread hazard is a _development_ hazard here. Second, 5000 records followed immediately by `process.exit(0)` lost nothing in **either** mode, to a file or to a pipe. So the precedent is stronger than Task 1.2.1's surviving `EADDRINUSE` record — but this task adds exit paths 1.7.1 did not have, and the crash line is the one line whose loss is unrecoverable. Check both modes explicitly. If either loses it, `pino.final` or an explicit flush is the answer rather than a delay
- **Decide whether a crash respects `LOG_LEVEL`, and this is a new question Task 1.7.1 created.** `silent` is an admitted value and was admitted deliberately for Story 1.9's test runner; `warn` and above already make a healthy server completely silent, `Server listening at …` included. If the crash handlers log through `app.log.fatal`/`app.log.error`, then `LOG_LEVEL=silent` gives a process that dies leaving **nothing at all** — no stack on stderr either, because these handlers are what replaced Node's default stderr behaviour. That is a strictly worse failure mode than the one this task exists to fix. Three ways out: log the crash through pino regardless of level (a deliberate exception to the level, which has to be written down as one), refuse `silent` after all, or accept it as the operator's stated choice. **Prefer the first** — an operator asking for quiet logs is not asking for a silent death — and say what the exception costs. Whichever way, exercise it under `LOG_LEVEL=silent` rather than reasoning about it
- **Keep the exit codes consistent with what is already there.** Every existing failure path exits 1 — bad configuration, failed listen, shutdown timeout, second signal. A crash is another 1; inventing a distinct code buys nothing that the log line does not already say, unless Story 1.11's orchestrator wants one, and it does not exist yet
- **`node --watch` waits for the child indefinitely (Task 1.2.2), so a handler that hangs stops the dev loop rather than slowing it.** Whatever this task installs must reach `process.exit()` on every path, the same property the shutdown handler's `Promise<never>` signature encodes
- **Consider whether the 5-second ceiling should also cover a crash-triggered close**, if the chosen behaviour drains at all before exiting. If it does not drain — exit immediately after the log — say so, because "we deliberately drop in-flight requests when the process is already broken" is a decision and not an oversight

## Done when

- Both handlers are installed, and both produce a structured log record rather than raw stderr — including under `LOG_LEVEL=silent`, or with a recorded reason why not
- A rejection thrown during a drain is exercised, and the drain's outcome and exit code are recorded
- The flush question is settled by observation in **both** log formats — the crash line is shown to survive the exit under JSON and under pretty
- Node's pre-existing defaults are recorded as the baseline, so the change is attributable
- `pnpm verify` exits 0, and the dev loop's Ctrl-C still gives a clean exit 0 with both ports released

## Notes

This is the last backend task in the story. After it, criteria 1–6 are all backend-side and satisfied; criterion 7 is Task 1.7.6's and touches no file in `apps/backend`.
