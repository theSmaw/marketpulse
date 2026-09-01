# Task 1.8.1 — Baseline the running pair

**Status:** Not started
**Story:** [1.8 Local Development Environment](STORY.md)
**Depends on:** Stories 1.2, 1.3 (complete)

## Objective

Find out what `pnpm dev` is actually like to use today, and write the friction down as a list the remaining tasks work from — before changing anything. Everything this story could do is a presentation decision, and a presentation decision taken without the current presentation in front of you is a guess.

## Work

- **Start the pair and paste literal output, not a description of it.** `pnpm dev` from a built tree, and capture the whole terminal from the command to the moment both servers are ready. Three loops and eight processes share that stream: `packages/shared` in `tsc -b --watch --preserveWatchOutput`, `apps/backend` in `scripts/dev.sh` (a second `tsc -b --watch` plus `node --watch dist/index.js`), and `apps/frontend` in `vite`. Note what pnpm prefixes each line with and what it does not
- **Time the startup, and say what the user is looking at while it happens.** How long from the command to the backend's `Server listening at …`, and to Vite's `ready in …`? Which arrives first? Is there a stretch where the terminal is silent and there is nothing to click? Root `pnpm dev` builds `packages/shared` twice — once in its own watcher, once through the backend's `tsc -b --watch` following the project reference — so the shared package's output appears twice and that is expected, not a fault
- **Reproduce the 12-line figure rather than citing it.** Hit `/health` once and count the rendered lines in `pretty` — Task 1.7.2 measured six per record, two records: message, `reqId`, and a four-line `req` or a `res` plus `responseTime`. Then do it in a browser rather than with `curl` and count what a page load costs. That second number is the one this story is up against, and nobody has taken it
- **Do the two edits and time them, in the foreground.** A backend source edit (edit → new listener, ~1.1s baseline) and a frontend component edit. Task 1.4.6's component figures — 177–280 ms warm, 977 ms first-after-start — are **upper bounds** taken in a tab reporting `visibilityState: "hidden"`, which throttles React's scheduler, so a foreground re-measurement is genuinely new information rather than a repeat. Prove the frontend edit was HMR and not a reload with `performance.timeOrigin` unchanged — cheaper than Task 1.3.5's counter component and it answers the same question. Note what the backend's restart does to the shared terminal while the frontend is idle
- **Ctrl-C, and record the whole exit.** The pair now logs `signal received` and `shutdown complete` on the way out (Task 1.7.5). The surrounding noise is unchanged and is **not** a failure: pnpm reports each interrupted watcher as `Failed`, prints `[ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL] … signal "SIGINT"` and adds a spurious `[WARN] Local package.json exists, but node_modules missing`. Count survivors in the process group and check both ports are released rather than trusting the supervisor — that is how Tasks 1.2.6 and 1.3.5 did it
- **Look at the application, not just the terminal.** There are four routes and a not-found route. Visit all four addresses and record what a first-time reader sees: the `FeedIndicator` hard-coded to `disconnected` with the detail "No market data until Epic 3", the four region landmarks on `/` in their 3:1 by 2:1 grid, and three placeholder routes that are deliberately a single area. Which of these look like a broken setup to somebody who has not read the planning tree?
- **Write the friction list.** One line per annoyance, each with the evidence beside it, and each tagged with the task that will own it — 1.8.2 for output legibility, 1.8.3 for the frontend-to-backend gap, 1.8.4 for ports and readiness, 1.8.5 for anything that is a documentation problem rather than a code one. An item with no owner is either out of scope or a missing task, and saying which is part of this task

## Done when

- Startup, one request, both kinds of edit and the shutdown are all captured as literal terminal output
- The per-request rendered-line count is re-measured for `curl` and for a browser page load
- Both edit-to-visible timings are re-taken in a **foreground** tab, with `performance.timeOrigin` proving the frontend half was HMR
- Ctrl-C leaves zero survivors in the process group and both ports released, verified by counting rather than by the supervisor's word
- A friction list exists, each item owned by a numbered task in this story
- No file in the repository has changed; `pnpm verify` exits 0 because nothing was touched

## Notes

This task deliberately fixes nothing. Its output is evidence, and the risk it exists to remove is the one Task 1.7.7 documented one level down: a figure that has moved looks exactly like a figure that was mis-recorded, and only re-taking it tells them apart. Every number this story later claims about the dev loop should trace back to a line captured here.
