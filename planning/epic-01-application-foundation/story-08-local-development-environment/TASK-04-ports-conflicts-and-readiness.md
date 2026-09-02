# Task 1.8.4 — Ports, conflicts, and knowing when the pair is up

**Status:** Not started
**Story:** [1.8 Local Development Environment](STORY.md)
**Depends on:** Task 1.8.3

## Objective

Close the half of the ports criterion that is still open — the frontend's are literals with no override — judge whether the conflict messages are actually clear, and settle how anything (a human, a script, Story 1.10's CI) knows the pair is ready.

## Work

- **The conflict half is met on both services; the job here is to judge it, not to build it.** A busy 5173 exits 1 with `Error: Port 5173 is already in use` because Task 1.3.3 adopted `strictPort: true`; the backend exits 1 with Fastify's `EADDRINUSE` record and a `server failed to start` line. Reproduce both **through root `pnpm dev`** rather than through a single package — that is where a developer meets them, and pnpm's fan-out wraps the failure in its own `ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL` noise. Whether what survives that wrapping counts as "a clear message" is this task's call and it needs the literal output to make it. **Take that output fresh: Task 1.8.2 changed how the backend renders, and the port conflict is the one record it did not shrink.** `EADDRINUSE` is **16 lines and was 16 before**, because the whole of it is an `err` object and `singleLine` deliberately leaves a stack multi-line — so the useful sentence, `listen EADDRINUSE: address already in use 127.0.0.1:3000`, is **line 4 of 16** and everything after it is a Node stack and four numeric fields. That is the thing to judge, and "the request log got 6× shorter and the failure did not" is a legitimate finding to write down. One cosmetic artefact of the same change, noticed and not fixed: a record whose only payload is an `err` renders its message with a **trailing space**, because `singleLine` appends a flattened object that turns out to be empty
- **Decide whether the frontend's ports become configurable, and default to no.** 5173 and 4173 are literals in `vite.config.ts`. Story 1.3 recorded the reasoning and it has not changed: the backend's `PORT`/`HOST` are properties of a deployed process, while these two reach no deployment at all — `dist/` is three static files on somebody else's host and both Vite servers are development tools. Story 1.12's CORS allowlist is pinned to the dev-server origin, which is what makes a silently moving port expensive and `strictPort` right. The stated reversal is two people needing two frontends at once, and it would take `loadEnv()` rather than `process.env`, because `vite.config.ts` **cannot see a `.env` file** — Vite loads env files for client code and does not put them on `process.env`. If this task does reverse it, that is the mechanism and there is no shortcut
- **Do not let 4173 drift.** `preview` inherits `server.strictPort` but **not** `server.port`, measured both ways in Task 1.3.4 — which is why 4173 is written down explicitly rather than left to Vite's default, and why `preview.strictPort` is deliberately absent. Anything this task changes about ports has to re-check both halves of that asymmetry rather than assuming inheritance
- **Settle readiness, and it cannot be a log grep — there are now three independent reasons.** At `LOG_LEVEL=warn` and above a healthy server writes nothing at all, its `Server listening at …` line included, so anything waiting for the server must poll the port or `GET /health`. Fastify's startup line rewrites `0.0.0.0` to `127.0.0.1`, so `HOST=0.0.0.0` logs `http://127.0.0.1:<port>` while the socket really is `*:<port>` — check the socket, not the log. And Task 1.8.1 added the third: **the backend's line arrives _second_**, ~120 ms after Vite's `ready` warm and ~730 ms after it cold, so treating it as "the pair is up" happens to work by luck rather than by design and would stop working the moment the two halves' startup costs swap. Task 1.8.2 gave the line a fourth reason to distrust as a **string**: its clock is now `SYS:h:MM:ss.l TT`, so anything matching on the old `[20:44:38.544]` shape matches nothing
- **A `curl` against the frontend's root is a false positive, and Task 1.8.1 measured it.** With `packages/shared` unbuilt, Vite reports `ready in 96 ms`, `curl http://localhost:5173/` returns a clean **200** of 1258 bytes, and the terminal stays silent — the `vite:import-analysis` failure appears only when a client requests a real module. So a frontend readiness check that fetches `index.html` passes against a server that cannot render the application. Request a module from the graph, or check something that depends on one
- **A readiness check has to name the right address family per service.** The backend answers on `127.0.0.1` and not `[::1]`; both Vite servers are the reverse. A helper that hardcodes one family works for one of the two services and fails confusingly for the other
- **Say who the readiness answer is for.** If it is only a human, one documented `curl` per service in the README is the whole deliverable and no code is needed. If Story 1.10 or Story 1.11 will want it, it is a small script and it belongs somewhere `pnpm verify` can see — note that `scripts/*.mjs` files are covered by ESLint and Prettier, while `scripts/dev.sh` is covered by nothing, so the file extension is a coverage decision rather than a taste one
- **Three ports, and only two of them are anyone's decision.** Backend 3000, dev server 5173, preview 4173. Whatever this task concludes, the count and the reasons should end up in one place rather than spread across three config files

## Done when

- Both port conflicts are reproduced through root `pnpm dev` and quoted literally, and "is this a clear message?" is answered rather than assumed
- The frontend port-configurability question is closed either way, with the reasoning and — if reversed — `loadEnv()` rather than `process.env`
- 4173's inherit-`strictPort`-but-not-`port` asymmetry is re-checked after any change
- Readiness is settled, uses the port or `/health` rather than a log line, and names the right address family for each service
- The frontend's readiness check is not a bare `GET /` — a 200 there proves the server is listening and nothing about whether the application resolves
- Any readiness helper is a file some tool in `pnpm verify` actually reads
- `pnpm verify` exits 0

## Notes

The temptation here is to make the frontend's ports configurable because the backend's are, and symmetry is not a reason. The two are configurable for different reasons or for none, and this task should say which.
