# Task 1.8.2 — Make the pair legible in one terminal

**Status:** Not started
**Story:** [1.8 Local Development Environment](STORY.md)
**Depends on:** Task 1.8.1

## Objective

Close the story's one genuinely open presentation problem: three loops and eight processes write to one stream, and the interesting lines are outnumbered. Decide what a developer should see, and change as little as possible to get it.

## Work

- **Start from the friction list, and be willing to change nothing.** "The current output is already fine" is a real outcome and should be recorded as one, with the evidence from Task 1.8.1 beside it. What is not acceptable is leaving it undecided — this criterion has been "making the pair legible together" since Story 1.3 closed the wiring half, and it has never been looked at directly
- **The lever Task 1.8.1's numbers actually indict is the request record's _rendering_, not its severity.** One `GET /health` costs **12 lines** because `pretty` puts each record's message, `reqId` and expanded `req` or `res` object on separate lines — six per record, two records. That is a `pino-pretty` option (`singleLine`, `ignore`, `messageFormat`, `translateTime`), configured where the transport already is, and it collapses a request to a line or two **without touching the severity floor at all**. Try that before reaching for the level, because it does not cost the silence trap below
- **The knob that exists is `LOG_LEVEL`, and turning it down has a trap in it.** At `warn` and above a healthy server is **completely silent**, its `Server listening at …` line included, because nothing in a normal run emits above `info` (ADR 0007 §2). So a quieter dev loop looks exactly like a failed start. If the answer here is a lower default level for development, that trap has to be answered in the same breath — either by something else printing a ready line, or by not taking that option
- **`scripts/dev.sh` is where a development-only value goes, and it already holds one.** `export LOG_FORMAT="${LOG_FORMAT:-pretty}"` is the whole of how "development" exists in this repository: ADR 0007 §1 records that `NODE_ENV` is read nowhere and nothing branches on which environment it is in — the development entrypoint simply passes a value. Extend that file the same way if another value is needed. **Do not introduce a name for the environment**; doing so reverses a recorded decision and has to be written as one
- **Note what that file costs before adding to it.** `pnpm verify` reads `scripts/dev.sh` with nothing — ESLint sees only JS and TS, Prettier has no shell parser and skips it silently, `tsc` has no view of it — and it already carries the only configuration value `pnpm env:check` structurally cannot see. A typo there is not an error; it is a silent fallback to JSON in the one loop that wanted `pretty`. Known and dated 2026-09-01, and Story 1.10 carries the same note. Every value added here makes that gap wider, so a second value needs a better reason than the first one did
- **Two smaller legibility findings from Task 1.8.1, both about the frame rather than the content.** pnpm's prefixes are three different widths — `packages/shared dev: ` at 21 characters, `apps/frontend dev: ` at 19, `apps/backend dev: ` at 18 — so the left edge is ragged and `pretty`'s own indentation starts 18 columns in. And there are **three clocks in one stream**: `tsc` and Vite print 12-hour times without milliseconds (`8:57:35 PM`), pino prints 24-hour with them (`[20:57:36.471]`), and pnpm prints none. `translateTime` answers the second on the pino side; pnpm's reporter is the only lever on the first, and "leave both" is a legitimate answer if the request record shrinks
- **Decide against the terminal Story 1.12 will produce, not the one in front of you.** A browser page load costs **zero** lines today only because the frontend makes no request. Task 1.8.3 establishes that it can, and Story 1.12 makes it actually do so — at which point 12 lines per page load is the floor, and a decision taken against a silent frontend will be wrong within two stories
- **The Ctrl-C misattribution is on the friction list and may not be fixable here.** `pnpm -r` reports the **first** interrupted watcher as `Failed` and names `packages/shared`, then adds `[WARN] Local package.json exists, but node_modules missing`; Vite says nothing at all on the way out. Neither claim is true. If pnpm's reporter cannot be made to say something truthful, say so and hand it to Task 1.8.5 as a documentation problem explicitly — do not leave it looking unexamined
- **`--preserveWatchOutput` is load-bearing and must survive whatever this task does.** Without it a `tsc --watch` clears the terminal on every rebuild and takes the other two packages' output — including the server's log — with it. If the answer involves a supervisor or a different runner, check this specifically rather than assuming the flag still applies
- **A process manager is the obvious big answer and it has an obvious cost.** If one is proposed, it is a dependency at the workspace root, a second place the dev loop is described beside `scripts/dev.sh`, and it has to keep four properties Tasks 1.2.6 and 1.3.5 measured: Ctrl-C leaving zero survivors, both ports released, the child's exit code propagating, and the backend's ~1.1s edit-to-listener. Measure all four against it rather than arguing about them. The bar is high because pnpm's own fan-out already delivers them
- **Storybook stays out of `pnpm dev`, and this task is where that is confirmed or reversed.** It is a fourth server on 6006, run by `pnpm --filter @marketpulse/frontend storybook` — an extra like `start` and `preview`, with no root fan-out. Task 1.4.5 kept it out because the loop is already three loops and eight processes in one terminal. If this task makes the terminal legible, adding the workshop is the first thing anyone will ask for, so answer it here with a reason rather than leaving it as an omission
- **Re-measure whatever changed, against Task 1.8.1's numbers and not against older ones.** Startup to both-ready (0.73 s warm, 1.37 s cold), the per-action line counts (0 / 12 / 1 / 8), both edit timings, and the Ctrl-C survivor count. **A frontend timing is only comparable if `document.visibilityState` was `visible` at the moment the DOM changed** — a hidden tab costs 4–6×, which is what made Task 1.4.6's figures upper bounds. Record the visibility with the number. A legibility change that costs 300 ms of startup is a trade to state, not a free win

## Done when

- The legibility decision is closed, including if the decision is to change nothing, with Task 1.8.1's output as the evidence
- The `warn`-and-above silence trap is answered explicitly if the level was touched, and not answered at all if it was not
- `NODE_ENV` is still read nowhere, or its introduction is written up as a reversal of ADR 0007 §1
- `--preserveWatchOutput` still holds: a rebuild in one package does not clear another's output, checked rather than assumed
- The Storybook question is answered in writing, either way
- The request record's rendering was tried as an option in its own right, before or instead of the severity floor
- The Ctrl-C misattribution is either fixed or handed to Task 1.8.5 in writing
- Startup, per-request line count, both edit timings and the shutdown survivor count are re-taken after the change, each frontend timing carrying the `visibilityState` it was taken at
- `pnpm verify` exits 0

## Notes

The pattern to match rather than redesign is the backend's loop: it restarts in about a second, drains in-flight requests, prints its own shutdown lines, and leaves no orphaned process or held port. This task's job is the pair, not either half.
