# Task 1.8.2 — Make the pair legible in one terminal

**Status:** Not started
**Story:** [1.8 Local Development Environment](STORY.md)
**Depends on:** Task 1.8.1

## Objective

Close the story's one genuinely open presentation problem: three loops and eight processes write to one stream, and the interesting lines are outnumbered. Decide what a developer should see, and change as little as possible to get it.

## Work

- **Start from the friction list, and be willing to change nothing.** "The current output is already fine" is a real outcome and should be recorded as one, with the evidence from Task 1.8.1 beside it. What is not acceptable is leaving it undecided — this criterion has been "making the pair legible together" since Story 1.3 closed the wiring half, and it has never been looked at directly
- **The knob that exists is `LOG_LEVEL`, and turning it down has a trap in it.** At `warn` and above a healthy server is **completely silent**, its `Server listening at …` line included, because nothing in a normal run emits above `info` (ADR 0007 §2). So a quieter dev loop looks exactly like a failed start. If the answer here is a lower default level for development, that trap has to be answered in the same breath — either by something else printing a ready line, or by not taking that option
- **`scripts/dev.sh` is where a development-only value goes, and it already holds one.** `export LOG_FORMAT="${LOG_FORMAT:-pretty}"` is the whole of how "development" exists in this repository: ADR 0007 §1 records that `NODE_ENV` is read nowhere and nothing branches on which environment it is in — the development entrypoint simply passes a value. Extend that file the same way if another value is needed. **Do not introduce a name for the environment**; doing so reverses a recorded decision and has to be written as one
- **Note what that file costs before adding to it.** `pnpm verify` reads `scripts/dev.sh` with nothing — ESLint sees only JS and TS, Prettier has no shell parser and skips it silently, `tsc` has no view of it — and it already carries the only configuration value `pnpm env:check` structurally cannot see. A typo there is not an error; it is a silent fallback to JSON in the one loop that wanted `pretty`. Known and dated 2026-09-01, and Story 1.10 carries the same note. Every value added here makes that gap wider, so a second value needs a better reason than the first one did
- **`--preserveWatchOutput` is load-bearing and must survive whatever this task does.** Without it a `tsc --watch` clears the terminal on every rebuild and takes the other two packages' output — including the server's log — with it. If the answer involves a supervisor or a different runner, check this specifically rather than assuming the flag still applies
- **A process manager is the obvious big answer and it has an obvious cost.** If one is proposed, it is a dependency at the workspace root, a second place the dev loop is described beside `scripts/dev.sh`, and it has to keep four properties Tasks 1.2.6 and 1.3.5 measured: Ctrl-C leaving zero survivors, both ports released, the child's exit code propagating, and the backend's ~1.1s edit-to-listener. Measure all four against it rather than arguing about them. The bar is high because pnpm's own fan-out already delivers them
- **Storybook stays out of `pnpm dev`, and this task is where that is confirmed or reversed.** It is a fourth server on 6006, run by `pnpm --filter @marketpulse/frontend storybook` — an extra like `start` and `preview`, with no root fan-out. Task 1.4.5 kept it out because the loop is already three loops and eight processes in one terminal. If this task makes the terminal legible, adding the workshop is the first thing anyone will ask for, so answer it here with a reason rather than leaving it as an omission
- **Re-measure whatever changed.** Startup to both-ready, one browser page load's worth of rendered lines, both edit timings, and the Ctrl-C survivor count. A legibility change that costs 300 ms of startup is a trade to state, not a free win

## Done when

- The legibility decision is closed, including if the decision is to change nothing, with Task 1.8.1's output as the evidence
- The `warn`-and-above silence trap is answered explicitly if the level was touched, and not answered at all if it was not
- `NODE_ENV` is still read nowhere, or its introduction is written up as a reversal of ADR 0007 §1
- `--preserveWatchOutput` still holds: a rebuild in one package does not clear another's output, checked rather than assumed
- The Storybook question is answered in writing, either way
- Startup, per-request line count, both edit timings and the shutdown survivor count are re-taken after the change
- `pnpm verify` exits 0

## Notes

The pattern to match rather than redesign is the backend's loop: it restarts in about a second, drains in-flight requests, prints its own shutdown lines, and leaves no orphaned process or held port. This task's job is the pair, not either half.
