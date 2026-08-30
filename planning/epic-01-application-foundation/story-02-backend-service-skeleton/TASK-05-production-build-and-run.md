# Task 1.2.5 — Production build and run

**Status:** Complete — 2026-08-30
**Story:** [1.2 Backend Service Skeleton](STORY.md)
**Depends on:** Task 1.2.4

## Objective

Prove the acceptance criterion "production build emits runnable output" against a clean build, and give the built output a documented way to be started.

## Work

- `pnpm clean` then `pnpm build`, then run the emitted entrypoint directly with `node` and no flags, no loader, no transpiler. If it needs a flag, that is a finding worth recording, not a flag worth adding quietly
- Run it with `NODE_ENV=production` set and confirm nothing changes that should not. Fastify reads very little from `NODE_ENV`; the point is to notice now if something does
- Add a **`start`** script to `apps/backend` that runs the built entrypoint. This is an **extra, not a seventh verb** — the same status `lint:fix` has. It gets no root fan-out and no place in `verify`, and `apps/frontend` is not obliged to have one. Say so where it is added. Keep it a plain `node dist/index.js` in `package.json`: Task 1.2.2 put `dev` in `scripts/dev.sh` because four composed commands each needed a reason attached, and that is a precedent for _explaining_ complexity, not for moving one-line scripts into files
- **Check that a signal survives the `pnpm start` wrapper**, which is new work as of Task 1.2.4 and is the one place this task can find a real problem. `pnpm --filter ... start` does not become `node dist/index.js` — pnpm spawns the script as a child process, so there is a wrapper between the terminal and the server. Task 1.2.4 verified graceful shutdown against `node dist/index.js` directly and against the dev loop's process group; neither of those is this path. Two things to establish, and they are different: `SIGTERM` sent to the pnpm process (what an orchestrator does) and Ctrl-C in the terminal (which signals the whole foreground process group and so reaches `node` regardless of what pnpm forwards). If the first one does not reach the server, the shutdown handler is dead in exactly the deployment this story is building toward — and `start` is not the fix for it, Story 1.11's process model is. Record which of the two works rather than concluding from one of them
- Check the dependency split is honest: `fastify` is a `dependency`, `@types/node` is a `devDependency`, and nothing the built output needs at runtime is declared as dev-only. The test is not reading `package.json` — it is running the thing
- Confirm the emitted output is ESM, matching the package's `"type": "module"`, and that nothing in the build produced CommonJS by accident. This one has been quietly true since Task 1.2.2 — the dev loop runs `dist/index.js` under plain `node`, top-level `await` and all, and has done so on every restart — so treat it as a confirmation rather than a discovery. Task 1.2.3 added a second ESM-only construct to the emitted output, an **import attribute** (`with { type: "json" }`); it ran under plain `node` with no flag and no warning, but it is the newest syntax in the built tree and so the most likely thing to object to an older runtime than the pinned 24.x
- **`apps/backend/scripts/` is new, and is not build output.** Task 1.2.2 added `scripts/dev.sh`. It is a development-only file: `start` must not reference it, and nothing in `dist/` depends on it. Worth one sentence in the outcome, because it is the first non-`src` directory in a package and Story 1.11 will have to decide whether a deployed artifact carries it (it should not)

## The dependency `apps/backend` no longer imports

Task 1.2.1 deleted the placeholder `src/index.ts`, which was the only file in `apps/backend` that imported `@marketpulse/shared`. The package still declares `"@marketpulse/shared": "workspace:*"` and still carries the TypeScript project reference to it, and **nothing in the toolchain notices** — `tsc -b` builds the reference regardless, and ESLint has no view on unused manifest entries.

That is a live exception to the workspace rule that packages declare only what they actually import, so it needs a decision rather than a silence.

**Keep it, and record why.** Story 1.12 promotes the health response type into `packages/shared`, and Epic 2 imports domain types in earnest; removing the dependency and the project reference now means putting both back within two stories, and the reference is what makes `tsc -b` order the build correctly the moment an import returns. Removing it would also be a real regression in one specific way — the stale-`dist` trap in `CLAUDE.md` depends on the backend compiling against shared's emitted declarations.

What this task should do is verify the removal-free claim honestly: confirm the built output runs with the dependency present and unimported, and note in the outcome that the manifest entry is deliberate and dated rather than left over. If Story 1.12 has not restored an import, this is the note that stops someone deleting it in the meantime.

## The workspace symlink, and what it hides

`@marketpulse/shared` is a `workspace:*` dependency, so at runtime it resolves through a pnpm symlink into `packages/shared/dist`. That works here and would not survive being copied to a server on its own.

**Do not fix that in this task.** `pnpm deploy --filter @marketpulse/backend` is the mechanism, and Story 1.11 owns it — that story already names it. What this task should do is _verify the claim_: run the built server, confirm it works in the workspace, and record that `apps/backend/dist` is not a self-contained artifact. A sentence written now saves Story 1.11 from discovering it during a failing deploy.

## `dist/` now reaches outside itself, which is a simpler version of the same problem

Task 1.2.3 reads the health endpoint's `version` from `apps/backend/package.json`, and does it with a plain JSON import that survives compilation verbatim — `dist/routes/health.js` contains the literal specifier `import manifest from "../../package.json" with { type: "json" }`. Confirm that by reading the emitted file, since it is one grep and it is the whole point.

So `apps/backend/dist` was already not self-contained because of the workspace symlink, and is now not self-contained for a much more basic reason: **copy `dist/` alone to a server and the process does not start at all**, because the manifest one directory above it is missing. That failure is loud (`ERR_MODULE_NOT_FOUND` at import time, before `listen`), which is the good version of this problem, but it happens at startup rather than at the first request.

Two things follow, and both belong in the outcome for Story 1.11 rather than being fixed here:

- The deployable unit is the **package directory**, not `dist/`. `pnpm deploy` produces exactly that, so the mechanism Story 1.11 already names is the right one — this just adds a second, independent reason it is required
- Whatever `version` the deployed manifest carries is what `/health` reports. That is free version reporting if the release process sets it, and a permanently `0.0.0` health endpoint if it does not. Story 1.11's decision, but it should be made rather than defaulted into

While the server is running from `dist/`, curl `/health` and confirm the version matches `apps/backend/package.json`. That single call proves the manifest resolved from the built tree, which is the one resolution case that can actually occur.

## Done when

- From a clean `pnpm build`, `node apps/backend/dist/index.js` starts, serves `/health`, and shuts down on `SIGTERM` — the whole story's behaviour, from built output. "Shuts down" now has a definition to check against rather than a feeling: Task 1.2.4's handler logs `signal received, shutting down` then `shutdown complete` and exits **0**. An exit code of 0 with neither line in the log means the process died on the default signal disposition and the handler never ran
- `pnpm --filter @marketpulse/backend start` does the same — **including the shutdown**, which is the half most likely to differ, because the signal has a wrapper process to cross first
- The run works with a `NODE_ENV=production` environment
- The non-self-contained-artifact finding is written down for Story 1.11 — **both** halves of it: the workspace symlink into `packages/shared/dist`, and the health route's runtime read of `../../package.json`
- `pnpm verify` passes from the repository root

## Outcome

The build emits runnable ESM that starts under plain `node` with no flags, serves `/health`, and shuts down on a signal. `apps/backend` gained one line — `"start": "node dist/index.js"` — and nothing else changed in `src/`.

### The wrapper carries everything, which was the open question

This was the one place the task could find a real problem, because Task 1.2.4 verified shutdown against `node dist/index.js` directly and against the dev loop's process group, and `pnpm start` is neither. `pnpm --filter @marketpulse/backend start` runs `node dist/index.js` as a **child process** of a pnpm process, so the signal has a wrapper to cross.

It crosses. Both routes were tested separately rather than concluded from one:

- **`SIGTERM` to the pnpm process** — what an orchestrator does, and the one that could have been dead. pnpm forwards it; the server logged `signal received, shutting down` then `shutdown complete`, pnpm exited 0, the port was released
- **`SIGINT` to the process group** — what Ctrl-C does, and which reaches `node` regardless of what pnpm forwards. Identical result, no leftover processes

Two further properties of the wrapper worth having in writing, because a deployment depends on both and neither is obvious from `pnpm start` working:

- **pnpm waits for the child to finish stopping.** Probed with a stand-in script that traps `SIGTERM` and takes 3s to exit: pnpm returned **3.002s** after the signal, not immediately. So a drain is not cut short by the wrapper exiting early
- **pnpm propagates the child's exit code.** The same probe exited 7 and `pnpm` exited 7 (printing `ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL` alongside it). Confirmed against the real server too: `pnpm start` on a busy port exits **1** with the full `EADDRINUSE` record and Task 1.2.1's `server failed to start` line intact

The probe lived in a scratch directory behind a temporary `drain-probe` script, which was removed; `src/` and `dist/` were untouched by it.

### `start` is an extra, not a seventh verb

The same status `lint:fix` has: no root fan-out, no place in `verify`, and `apps/frontend` is not obliged to have one. `package.json` cannot carry a comment saying so, so it is said in `README.md` and in `CLAUDE.md` next to the `lint:fix` sentence it mirrors — which is where `lint:fix` says it too.

It stays a plain one-liner in `package.json`. Task 1.2.2 moved `dev` into `scripts/dev.sh` because four composed commands each needed a reason attached; that is a precedent for explaining complexity, not for filing away a single command.

`start` runs the built output and builds nothing, so an empty `dist/` is a missing server rather than a rebuild. **It does not reference `scripts/dev.sh`, and nothing in `dist/` does either** — proved rather than asserted below, since the isolated copy that ran had no `scripts/` directory at all. `apps/backend/scripts/` is a development-only directory and a deployed artifact should not carry it (Story 1.11).

### The deployable unit is the package directory — measured, not asserted

Copying `dist/` alone somewhere else and running it fails at startup. There are **two independent reasons**, and the first masks the second, so they were separated:

- `ERR_MODULE_NOT_FOUND: Cannot find package 'fastify' imported from .../dist/server.js` — the first import of the first module, before anything else is tried
- With `node_modules` reachable but the manifest absent: `ERR_MODULE_NOT_FOUND: Cannot find module .../package.json imported from .../dist/routes/health.js` — Task 1.2.3's runtime read of `../../package.json`, confirmed present in the emitted file verbatim as `import manifest from "../../package.json" with { type: "json" }`

Both fail loudly at import time, before `listen`, which is the good version of this problem.

The positive result is the useful one: **`dist/` + `package.json` + `node_modules`, copied outside the workspace entirely, starts and serves `/health` with a correct `version` and shuts down on `SIGTERM`.** That is the shape `pnpm deploy --filter @marketpulse/backend` produces, so Story 1.11's named mechanism is confirmed as the right one rather than merely assumed.

One refinement to the workspace-symlink half of that finding. `@marketpulse/shared` resolves through a pnpm symlink into `packages/shared`, and that would not survive a naive copy — but **nothing in the emitted output imports it today**, so the symlink is a latent problem rather than a live one. The complete set of imports in the built tree is `fastify`, `node:process`, `./server.js`, `./routes/health.js` and `../../package.json`. The symlink becomes load-bearing at Story 1.12, when the health response type moves into `packages/shared`.

And whatever `version` the deployed manifest carries is what `/health` reports. It reports `0.0.0` today because that is what `apps/backend/package.json` says. Free version reporting if the release process sets it; a permanently `0.0.0` health endpoint if it does not. Story 1.11's decision, and it should be made rather than defaulted into.

### The unimported `@marketpulse/shared` dependency is deliberate, and dated

`apps/backend` still declares `"@marketpulse/shared": "workspace:*"` and still carries the TypeScript project reference, while importing neither — the state Task 1.2.1 left when it deleted the placeholder entrypoint. Nothing in the toolchain notices, so this note is the only thing standing between it and a tidy-up.

**Keep it.** Story 1.12 restores an import and Epic 2 imports domain types in earnest, so removing it means putting both back within two stories, and the project reference is what makes `tsc -b` order the build correctly the moment an import returns. Removing it would also cost the stale-`dist` protection `CLAUDE.md` describes. Verified today rather than argued: the built output runs with the dependency present and unimported. Reviewed 2026-08-30 — if Story 1.12 has landed and there is still no import, ask the question again.

### `NODE_ENV=production` changes nothing, which is the answer wanted

The run under `NODE_ENV=production` produced a log stream identical to the default run line for line, modulo timestamps and pids: same level, same request logging, same shutdown records. Fastify reads very little from `NODE_ENV` and this confirms it reads nothing that matters here. Worth having as a baseline, because Story 1.7 chooses log levels and Story 1.11 sets this variable for real — a difference appearing later will be theirs, not an inherited surprise.

### Verified

Everything below ran from a `pnpm clean` then `pnpm build`, on ports 4321/4322.

| Check                                          | Result                                                                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Runs under plain `node`, no flags or loader    | `node apps/backend/dist/index.js` listened and served `{"status":"ok","version":"0.0.0",...}`. No flag needed, none added      |
| Emitted output is ESM                          | `import` statements throughout, no `require`/`exports` anywhere in `dist`, top-level `await app.listen(...)` at `index.js:116` |
| The import attribute survives an unflagged run | `import ... with { type: "json" }` present verbatim in `dist/routes/health.js`; no flag, no warning, Node 24.20.0              |
| `/health` version matches the manifest         | `0.0.0` from the running server, `0.0.0` from `apps/backend/package.json`                                                      |
| `SIGTERM` to `node dist/index.js`              | Both log lines, exit **0**                                                                                                     |
| `SIGTERM` to the `pnpm start` process          | Both log lines, pnpm exit **0**, port released                                                                                 |
| `SIGINT` to the `pnpm start` process group     | Both log lines, pnpm exit **0**, no leftover processes, port released                                                          |
| pnpm waits for a slow shutdown                 | Stand-in child taking 3s to stop: pnpm returned after **3.002s**                                                               |
| pnpm propagates the exit code                  | Probe child exit 7 → pnpm exit **7**; real server on a busy port → pnpm exit **1** with the `EADDRINUSE` record intact         |
| `NODE_ENV=production`                          | Log stream identical to the default run, line for line                                                                         |
| `dist/` alone is not runnable                  | `ERR_MODULE_NOT_FOUND` for `fastify`, and separately for `../../package.json`, both before `listen`                            |
| The package directory **is** runnable          | `dist` + `package.json` + `node_modules` copied outside the workspace: served `/health`, exited **0** on `SIGTERM`             |
| `pnpm verify` from the root                    | Exit 0                                                                                                                         |

### One stale file, and it was not the build's fault

`pnpm clean` left `dist/routes/slow.js.map` and `slow.d.ts.map` behind — Task 1.2.4's temporary route, whose `.js` and `.d.ts` that task deleted by hand while missing the two `.map` siblings. `tsc -b --clean` was then unable to remove files no longer in its build state.

Chased as the Notes below say to, and `tsc -b --clean` is not the problem: a build and a second clean removed every emitted file including all four `.map` variants. The lesson is about deleting a source file's output by hand, and it argues for `pnpm clean` after removing a source file rather than `rm` on what you remember emitting.

### What this did not prove

`pnpm deploy` was not run — Story 1.11 owns it, and this task only established what shape its output has to have. Nothing here says a container runtime delivers `SIGTERM` to PID 1, or that `pnpm start` is the right thing for a container to run at all; a wrapper that behaves correctly under a signal is not an argument for keeping a wrapper in production.

## Notes

`tsc -b --clean` leaves the `dist/` directories in place but empty — noted in Task 1.1.8. So "clean build" here means empty, not absent; if a stale file survives a clean, that is worth chasing.
