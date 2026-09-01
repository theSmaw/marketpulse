# Task 1.8.1 — Baseline the running pair

**Status:** Complete
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

## Outcome

Nothing was changed. Every file touched during the measurements was reverted, `git status` is clean apart from an untracked scratch note, and `pnpm verify` exits 0 on 271 application modules and 299 workshop modules — the figures Task 1.7.6 left.

### Startup: there is no silent stretch, warm or cold

```
   0.238 $ pnpm -r --parallel run dev
   0.459 Scope: 3 of 4 workspace projects
   0.460 apps/backend dev$ sh scripts/dev.sh
   0.460 apps/frontend dev$ vite
   0.460 packages/shared dev$ tsc -b --watch --preserveWatchOutput
   0.558 packages/shared dev: 8:44:38 PM - Starting compilation in watch mode...
   0.560 packages/shared dev: 8:44:38 PM - Found 0 errors. Watching for file changes.
   0.611 apps/frontend dev:   VITE v8.2.2  ready in 114 ms
   0.611 apps/frontend dev:   ➜  Local:   http://localhost:5173/
   0.611 apps/frontend dev:   ➜  Network: use --host to expose
   0.618 apps/backend dev: 8:44:38 PM - Starting compilation in watch mode...
   0.621 apps/backend dev: 8:44:38 PM - Found 0 errors. Watching for file changes.
   0.730 apps/backend dev: [20:44:38.544] INFO (37119): Server listening at http://127.0.0.1:3000
```

Thirteen lines, and both servers are up in **0.73 s**. After `pnpm clean` — every `dist` emptied — it is thirteen lines again and **1.37 s**, the extra 640 ms being the two `tsc` watchers doing a full build instead of finding their `.tsbuildinfo` intact. So the "is there a stretch where nothing is happening?" question has a boring answer and can be dropped: there is not one, and the slow first run is `pnpm install` and `pnpm build`, which Task 1.8.6 owns.

Two details worth keeping. **Vite reports ready before the backend does**, in both cases and by ~120 ms warm and ~730 ms cold, so the first thing that looks finished is the half that cannot yet talk to anything. And the shared package compiles twice, once in its own watcher and once through the backend's project reference, exactly as recorded — but only the first is visible here, because the second finds nothing to do and `tsc` says so under a different prefix.

### What each thing costs the shared terminal

Counted by marking the line count before and after each action against one running instance, not estimated:

| Action                              | Lines |
| ----------------------------------- | ----: |
| One browser page load of `/`        |     0 |
| One `GET /health`                   |    12 |
| One frontend HMR update             |     1 |
| One backend source edit (a restart) |     8 |

A sequence of one page load, three requests, three frontend edits and one backend edit is **47 lines, of which 44 (94%) are the backend and 36 (77%) are the three requests**. That is the whole legibility problem in one number, and Task 1.8.2 owns it: the two halves of the pair are three orders of magnitude apart in how much they say, and the quiet one is the one being worked on.

The **12 lines per request reproduced exactly** — six per record, message plus `reqId` plus a four-line `req` or a `res` plus `responseTime` — and it is 12 for a `curl` and 12 for a browser `fetch` alike, so Task 1.7.2's figure holds and the rendering does not depend on the client. A **browser page load costs nothing** only because the frontend does not call the backend; the moment Task 1.8.3 connects them, every page load costs 12 lines as a floor.

The eight lines of a restart, in full:

```
 671.362 apps/backend dev: 8:55:49 PM - File change detected. Starting incremental compilation...
 671.734 apps/backend dev: 8:55:49 PM - Found 0 errors. Watching for file changes.
 671.945 apps/backend dev: Change detected in '…/apps/backend/dist/routes/health.js'
 671.946 apps/backend dev: Restarting 'dist/index.js'
 671.949 apps/backend dev: [20:55:49.762] INFO (38168): signal received, shutting down
 671.950 apps/backend dev:     signal: "SIGTERM"
 671.952 apps/backend dev: [20:55:49.764] INFO (38168): shutdown complete
 672.077 apps/backend dev: [20:55:49.890] INFO (38174): Server listening at http://127.0.0.1:3000
```

The frontend contributes nothing to it, and the pid changes on every one, which is what makes the restart real rather than a reload.

### Timings

**Backend, edit to new listener** — five edits to `apps/backend/src/routes/health.ts`, timed from the write to the `Server listening` record: **1198 / 974 / 941 / 963 / 941 ms**, median **963 ms** against the ~1.1 s recorded. Split out of one of them: `tsc` detect-to-compiled **372 ms**, `node --watch` restart **132 ms**, and `SIGTERM` to `shutdown complete` **2 ms**. The drain is still not where the time goes.

**Frontend, edit to updated DOM** — and this is the number the task existed to re-take. All samples are one component edit to `MarketOverview.tsx`, ended by a `MutationObserver`, which fires whether or not the tab is visible, with `document.visibilityState` recorded at the moment of the mutation:

|                                     | Samples                   | Median |
| ----------------------------------- | ------------------------- | -----: |
| Component edit, tab **visible**     | 56, 56, 70, 141, 153, 257 | 105 ms |
| Component edit, tab **hidden**      | 483, 525, 571, 621, 666   | 571 ms |
| CSS-only edit, tab **visible**      | 23, 27, 85, 127, 139, 190 | 106 ms |
| First component edit after the load | 1203                      |      — |

**Task 1.4.6's 177–280 ms was a hidden-tab figure, and it is an upper bound by more than its own note implied.** In the foreground the same edit is **56–257 ms**, and the correction is not a shading — a hidden tab costs roughly **4–6×**. Both bands were taken minutes apart in the same session against the same tree, so this is not two machines.

The consequence is the more interesting half: **in the foreground a component edit and a CSS-only edit are the same number** — medians of 105 and 106 ms, overlapping ranges. Task 1.4.6's finding that the two kinds of edit are different costs was an artefact of measuring one of them in a throttled tab. Compare a foreground component edit against 1.3.3's ~100–140 ms after all, not against 1.4.6's band.

**Every one of the ~25 edits was HMR and not a reload**: `performance.timeOrigin` stayed at `1788266801843.3` and `performance.getEntriesByType("navigation").length` stayed at `1` throughout. That is cheaper than Task 1.3.5's counter component, it needs nothing added to the tree, and it answers the same question — adopt it.

### Ctrl-C

Measured twice, once warm and once cold, by enumerating the process group rather than trusting the supervisor. **Eight processes both times** — `pnpm dev`, `pnpm -r --parallel run dev`, `sh scripts/dev.sh`, `vite`, two `tsc -b --watch`, `node --watch dist/index.js` and the server itself — and after `SIGINT` to the group, **zero survivors and both ports released**, both times.

The exit is as documented, and one detail is not: **only `packages/shared` is named.**

```
[20:57:04.397] INFO (38245): signal received, shutting down
    signal: "SIGINT"
packages/shared dev: Failed
/Users/bensmawfield/WebstormProjects/marketpulse/packages/shared:
[ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL] @marketpulse/shared@0.0.0 dev: `tsc -b --watch --preserveWatchOutput`
Command failed with signal "SIGINT"
[20:57:04.400] INFO (38245): shutdown complete
[WARN]  Local package.json exists, but node_modules missing, did you mean to install?
[ELIFECYCLE] Command failed.
```

`pnpm -r` reports the **first** failure, so a clean shutdown of three watchers is announced as one named package failing. Vite prints nothing on the way out at all. A reader who has just pressed Ctrl-C is told that `packages/shared` failed and that `node_modules` may be missing, and neither is true.

### The application, to somebody who has not read the planning tree

All five routes render — `/`, `/investigations`, `/securities`, `/replay` and the not-found route on an unmatched path. Three things in front of a first-time reader look like a broken setup:

- **`MARKET FEED ○ DISCONNECTED`** in the top-right chrome. The explanation is right beside it — "No market data until Epic 3" — but it is set smaller, to the right, and after the word that carries the alarm.
- **`MARKET CLOCK --:--:-- ET`**, which has no explanatory sentence at all. It is the reserved region Task 1.5.3 left, and it reads as a clock that has stopped.
- **The render check's own table**, which deliberately shows a `STALE` row and a `DISCONNECTED` row because that is what it is demonstrating.

None of these is a fault and all three are one sentence in the README away from being obviously deliberate. Task 1.8.5.

One item with **no owner in this story**: every route serves the same `<title>`, `MarketPulse`, the not-found route included. That is a routing/product concern rather than a development-environment one and it belongs to whichever epic first cares about the browser tab — recorded here so it is not lost, and deliberately not added to Story 1.8.

### The cross-origin failure, established rather than assumed

`fetch("http://localhost:3000/health")` from the page at `http://localhost:5173/`:

```
page:     TypeError: Failed to fetch
terminal: incoming request  … "method": "GET", "url": "/health"
          request completed … "statusCode": 200
```

**The request reaches the backend and is answered 200; the browser discards the response.** The page's own error names neither CORS nor the origin, and the terminal — the thing a developer looks at next — shows a perfectly healthy request. Task 1.8.3 starts from this, and the deciding consideration written into that task stands unaltered: a Vite proxy makes the browser same-origin and would leave Story 1.12's CORS allowlist testing nothing in the one environment anybody runs.

### Two things in `CLAUDE.md` that are now wrong

Both found by re-measuring rather than citing, which is the whole point of this task.

**The filtered-frontend message has changed.** `CLAUDE.md` records that `pnpm --filter @marketpulse/frontend dev` on a tree with no `packages/shared/dist` prints `Failed to run dependency scan … @marketpulse/shared … could not be resolved. Are they installed?`. It does not. It prints:

```
[vite] (client) Pre-transform error: Failed to resolve import "@marketpulse/shared"
  from "src/routes/MarketOverview.tsx". Does the file exist?
  Plugin: vite:import-analysis
  File: …/apps/frontend/src/routes/MarketOverview.tsx:7:7
```

Better in one way — it names the file and the line rather than pointing at the install — and worse in another: **it does not appear at server start.** Vite reports `ready in 96 ms`, `curl http://localhost:5173/` returns a clean 200 of 1258 bytes, and the terminal stays silent until a client requests a real module. So the server looks healthy right up until somebody opens it in a browser. Task 1.8.5 owns the documentation; Task 1.8.7 owns the correction to `CLAUDE.md`.

**And `Server listening at …` is not the readiness signal it looks like** for a third reason beyond the two already recorded. Task 1.7.1's silence above `warn` and Fastify's `0.0.0.0` rewrite are both about the line lying; this is about the line arriving _second_. Vite is ready ~120 ms before it warm and ~730 ms before it cold, so anything that waits for the backend's line as "the pair is up" is waiting on the slower half by luck rather than by design. Task 1.8.4.

### Friction list

Every item carries the task that owns it. Nothing here is unowned except where it says so.

| #   | Friction                                                                                                                                     | Evidence                         | Owner                                         |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | --------------------------------------------- |
| 1   | The backend's request log dominates the shared terminal — 94% of a mixed session, 77% of it three requests                                   | 47-line controlled sequence      | 1.8.2                                         |
| 2   | Three prefix widths (21 / 19 / 18 chars) leave a ragged left edge, and push `pretty`'s indented JSON 18 columns right                        | raw capture of the prefixes      | 1.8.2                                         |
| 3   | Three clocks in one stream: `tsc` and Vite in 12-hour without milliseconds, pino in 24-hour with them, pnpm none                             | `8:57:35 PM` vs `[20:57:36.471]` | 1.8.2                                         |
| 4   | Ctrl-C blames `packages/shared` and warns `node_modules missing`; Vite says nothing at all                                                   | shutdown capture above           | 1.8.2                                         |
| 5   | The frontend cannot call the backend, and the failure shows a 200 in the terminal beside "Failed to fetch" in the page                       | cross-origin probe above         | 1.8.3                                         |
| 6   | Nothing says when the pair is ready; the obvious signal is a log line that is silent at `warn`, misreports the interface, and arrives second | startup captures + Task 1.7.1    | 1.8.4                                         |
| 7   | The frontend's ports are literals, so a busy 5173 means editing `vite.config.ts`                                                             | `strictPort: true`, unchanged    | 1.8.4                                         |
| 8   | `DISCONNECTED` and a dead market clock read as a broken setup on the screen the product opens on                                             | screenshots of all five routes   | 1.8.5                                         |
| 9   | `pnpm --filter … frontend dev` looks healthy and fails only when a browser asks for a module                                                 | filtered-run capture above       | 1.8.5                                         |
| 10  | Every route serves the same `<title>`                                                                                                        | five routes read                 | **none** — out of scope, recorded not adopted |

Two items the brief anticipated and that measurement dismissed: there is **no silent stretch at startup** (0.73 s warm, 1.37 s cold), and the shared package's double build is invisible rather than noisy. Neither needs a task.
