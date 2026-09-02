# Task 1.8.4 — Ports, conflicts, and knowing when the pair is up

**Status:** Complete
**Story:** [1.8 Local Development Environment](STORY.md)
**Depends on:** Task 1.8.3

## Objective

Close the half of the ports criterion that is still open — the frontend's are literals with no override — judge whether the conflict messages are actually clear, and settle how anything (a human, a script, Story 1.10's CI) knows the pair is ready.

## Work

- **The conflict half is met on both services; the job here is to judge it, not to build it.** A busy 5173 exits 1 with `Error: Port 5173 is already in use` because Task 1.3.3 adopted `strictPort: true`; the backend exits 1 with Fastify's `EADDRINUSE` record and a `server failed to start` line. Reproduce both **through root `pnpm dev`** rather than through a single package — that is where a developer meets them, and pnpm's fan-out wraps the failure in its own `ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL` noise. Whether what survives that wrapping counts as "a clear message" is this task's call and it needs the literal output to make it. **Take that output fresh: Task 1.8.2 changed how the backend renders, and the port conflict is the one record it did not shrink.** `EADDRINUSE` is **16 lines and was 16 before**, because the whole of it is an `err` object and `singleLine` deliberately leaves a stack multi-line — so the useful sentence, `listen EADDRINUSE: address already in use 127.0.0.1:3000`, is **line 4 of 16** and everything after it is a Node stack and four numeric fields. That is the thing to judge, and "the request log got 6× shorter and the failure did not" is a legitimate finding to write down. One cosmetic artefact of the same change, noticed and not fixed: a record whose only payload is an `err` renders its message with a **trailing space**, because `singleLine` appends a flattened object that turns out to be empty
- **Decide whether the frontend's ports become configurable, and default to no.** 5173 and 4173 are literals in `vite.config.ts`. Story 1.3 recorded the reasoning and it has not changed: the backend's `PORT`/`HOST` are properties of a deployed process, while these two reach no deployment at all — `dist/` is three static files on somebody else's host and both Vite servers are development tools. **That argument stopped being a forecast in Task 1.8.3 and is now the state of the tree**: `CORS_ORIGIN` defaults to `http://localhost:5173` and the backend really does enforce it, so a dev server that quietly bound 5174 would be a broken pair **today** rather than in two stories' time — and its symptom is the one this story keeps meeting, `TypeError: Failed to fetch` in the page beside a **200** in the log, naming neither the port nor the cause. `strictPort` is what turns that into an exit 1 naming the port. Weigh any reversal against that, and note the reversal is now two edits rather than one: the port and the origin it is pinned to. The stated reversal is two people needing two frontends at once, and it would take `loadEnv()` rather than `process.env`, because `vite.config.ts` **cannot see a `.env` file** — Vite loads env files for client code and does not put them on `process.env`. If this task does reverse it, that is the mechanism and there is no shortcut
- **Do not let 4173 drift.** `preview` inherits `server.strictPort` but **not** `server.port`, measured both ways in Task 1.3.4 — which is why 4173 is written down explicitly rather than left to Vite's default, and why `preview.strictPort` is deliberately absent. Anything this task changes about ports has to re-check both halves of that asymmetry rather than assuming inheritance
- **Settle readiness, and it cannot be a log grep — there are now three independent reasons.** At `LOG_LEVEL=warn` and above a healthy server writes nothing at all, its `Server listening at …` line included, so anything waiting for the server must poll the port or `GET /health`. Fastify's startup line rewrites `0.0.0.0` to `127.0.0.1`, so `HOST=0.0.0.0` logs `http://127.0.0.1:<port>` while the socket really is `*:<port>` — check the socket, not the log. And Task 1.8.1 added the third: **the backend's line arrives _second_**, ~120 ms after Vite's `ready` warm and ~730 ms after it cold, so treating it as "the pair is up" happens to work by luck rather than by design and would stop working the moment the two halves' startup costs swap. Task 1.8.2 gave the line a fourth reason to distrust as a **string**: its clock is now `SYS:h:MM:ss.l TT`, so anything matching on the old `[20:44:38.544]` shape matches nothing
- **A `curl` against the frontend's root is a false positive, and Task 1.8.1 measured it.** With `packages/shared` unbuilt, Vite reports `ready in 96 ms`, `curl http://localhost:5173/` returns a clean **200** of 1258 bytes, and the terminal stays silent — the `vite:import-analysis` failure appears only when a client requests a real module. So a frontend readiness check that fetches `index.html` passes against a server that cannot render the application. Request a module from the graph, or check something that depends on one
- **A readiness check has to name the right address family per service.** The backend answers on `127.0.0.1` and not `[::1]`; both Vite servers are the reverse. A helper that hardcodes one family works for one of the two services and fails confusingly for the other. Re-measured in Task 1.8.3 and unchanged — take the table from there rather than re-running it. **CORS does not complicate a readiness check**: `/health` answers 200 to a caller with no `Origin` header at all, which is what a script is, so nothing here has to send one. The converse is the thing to hold on to — a 200 from `curl -H "Origin: …"` proves **nothing** about whether a browser will accept the response, because the server sends the allowed origin to every caller and the browser is the only party that compares. Do not write a CORS check into a readiness helper; it cannot be one
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

## Outcome

One new file, one new root script, one closed decision, and three findings that
each broke a version of the check before it shipped.

### 1. The two port conflicts are opposite, and the expensive one is the quiet one

Both were reproduced through root `pnpm dev` with a squatter on the port, and
the interesting result is not the message quality the task went looking for.

**A busy 5173 is seven lines and stops everything.** Vite's `strictPort` exits
1, and pnpm's fan-out takes the other two loops down with it:

```
apps/frontend dev: error when starting dev server:
apps/frontend dev: Error: Port 5173 is already in use
apps/frontend dev:     at httpServerStart (…/vite/dist/node/chunks/node.js:11681:10)
…
apps/frontend dev: Failed
[ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL] @marketpulse/frontend@0.0.0 dev: `vite`
Exit status 1
[ELIFECYCLE] Command failed with exit code 1.
```

Judged: **clear.** The sentence is line 2 of 7, it names the port, and the
command you just ran has exited — you cannot fail to notice.

**A busy 3000 is sixteen lines and stops nothing.** The prediction inherited
from Task 1.8.2 held exactly — the record is 16 lines because the whole of it
is an `err` object and `singleLine` deliberately leaves a stack multi-line, so
the useful sentence is line 4 of 16:

```
apps/backend dev: [2:40:49.871 PM] ERROR (66870): server failed to start
apps/backend dev:     err: {
apps/backend dev:       "type": "Error",
apps/backend dev:       "message": "listen EADDRINUSE: address already in use 127.0.0.1:3000",
apps/backend dev:       "stack":
apps/backend dev:           Error: listen EADDRINUSE: address already in use 127.0.0.1:3000
…
apps/backend dev:       "code": "EADDRINUSE",
apps/backend dev:       "errno": -48,
apps/backend dev:       "syscall": "listen",
apps/backend dev:       "address": "127.0.0.1",
apps/backend dev:       "port": 3000
apps/backend dev:     }
apps/backend dev: Failed running 'dist/index.js'. Waiting for file changes before restarting...
```

Judged: **the message is clear and the situation is not.** That last line is
`node --watch` catching the exit. The frontend carries on serving, `pnpm dev`
keeps running, **nothing exits non-zero**, and the sixteen lines scroll away
behind Vite's banner. What is left on screen is a pair that looks healthy and
is half dead — and the failure it produces in the browser is the one this story
keeps meeting, a request that never lands with no line saying why.

That is the finding this task's readiness answer is built on. The verbosity is
a minor complaint; the survival is the problem, and no amount of rendering work
would have fixed it.

**Recovering from it has two traps, both measured.** Freeing the port is not
enough — the loop is waiting for a _file_ change, not for the port; the port
was free for six seconds with nothing listening. And `touch`ing a source file
is not enough either: tsc's incremental build emits nothing when the content
has not changed, so `dist/` never changes and `node --watch` never fires. A
real edit brought the listener back in about a second
(`Change detected in '…/dist/index.js'` → `Server listening at
http://127.0.0.1:3000`).

One cosmetic artefact confirmed and still not fixed: `server failed to start `
renders with a trailing space, because `singleLine` appends a flattened object
that is empty on a record whose only payload is `err`.

### 2. The frontend's ports stay literals — closed, not deferred again

No reversal. The reasoning Story 1.3 recorded is unchanged and the argument
that used to be a forecast is now the state of the tree: `CORS_ORIGIN` defaults
to `http://localhost:5173` and Task 1.8.3's allowlist really enforces it, so a
dev server that bound 5174 would be a broken pair **today**. `strictPort` turns
that into an exit 1 naming the port instead of a `TypeError: Failed to fetch`
naming nothing.

Symmetry with the backend was explicitly rejected as a reason, per this task's
own note. The two ports are different kinds of thing: `PORT`/`HOST` are
properties of a deployed process that only Story 1.11's container can set, and
neither Vite port reaches a deployment at all.

The reversal is now **two edits rather than one** — the port and the origin it
is pinned to — and its mechanism is unchanged and still not `process.env`:
`vite.config.ts` cannot see a `.env` file, so it would take `loadEnv()`. The
comment in `vite.config.ts` was rewritten to say the decision is taken rather
than passed on.

**4173's asymmetry re-checked rather than assumed**, since the task requires it
after any change. Unchanged: `vite preview` against a busy 4173 exits 1
(`strictPort` **is** inherited), and on a free one it binds and prints 4173
(`port` is **not** inherited, so the literal is doing work). No
`preview.strictPort` was added.

### 3. Readiness: `pnpm ready`, and it is for both audiences

`scripts/check-ready.mjs`, 317 lines, **no dependency**, wired as a root
`ready` script. Not a step in `pnpm verify` and it must not become one —
`verify` runs with no servers up, where "nothing is running" is the honest
answer rather than a failure. It lives in `scripts/` so that ESLint and
Prettier read it, which is the coverage decision the task asked for: `.mjs` is
covered by both, `apps/backend/scripts/dev.sh` is covered by nothing.

`ready` was checked against `pnpm help -a`'s full command list before being
claimed — it is not a built-in, unlike `clean`, `env`, `config`, `start` and
`test`, so it does not shadow anything.

It polls both services in parallel for up to 15 s at 250 ms, so it can be run
immediately after `pnpm dev` rather than after guessing how long to wait. Warm
it answers in 0.30 s; started in the same breath as `pnpm dev` it answered in
0.87 s having waited out the startup.

```
  ✓ backend   http://127.0.0.1:3000/health  0.0.0, up 0.5s
  ✓ frontend  http://localhost:5173/src/routes/MarketOverview.tsx  module graph resolves

The pair is up.
```

**The backend's address comes from its own configuration module**, imported
from the built `dist/config.js` exactly as `check-env-example.mjs` does, so
`PORT` and `HOST` are respected rather than ignored — verified with
`PORT=3100` (dialled 3100) and `HOST=0.0.0.0` (rewritten to `127.0.0.1`, the
same rewrite Fastify's own startup line performs, because a wildcard is bound
and not dialled). An invalid value is reported as the plain line the server
itself would print rather than as a stack, and is treated as "not ready",
because a server that cannot read its configuration is not listening.

**The frontend's origin is `CORS_ORIGIN`, not a second copy of `5173`.** That
is the least obvious decision in the file and it is deliberate: the port is a
literal in `vite.config.ts` with no override, a copy here would be a second
place to write it down, and `CORS_ORIGIN` is already the origin the pair is
pinned to and already kept honest by `env:check`. The payoff is that a dev
server moved without the allowlist moving with it — the exact failure §2 argues
against — is reported by name instead of appearing in the browser as
`TypeError: Failed to fetch`. Exercised with `CORS_ORIGIN=http://localhost:5174`.

### 4. Three findings that each broke a version of the check

Each of these was measured after an earlier version of the script had already
been written against the assumption it disproved.

**Vite's dev server never 404s, so the HTTP status cannot judge the frontend.**
The task's own instruction — "request a module from the graph" — is not
sufficient, and neither is requesting the entry. With `packages/shared` moved
aside, `GET /` is 200 (Task 1.8.1's finding), **`/src/main.tsx` is also 200**,
and so is `/src/components/AppHeader/AppHeader.tsx` — because Vite transforms
one module per request and `AppHeader`'s `@marketpulse/shared` import is
**type-only and erased**. The module that actually fails is the first one with
a **value** import of the shared package, `src/routes/MarketOverview.tsx`,
which answers **500**. Worse: a module path that does not exist at all comes
back **200 `text/html`** — the SPA fallback — and passed an earlier version of
this check outright, reporting a renamed probe module as a healthy pair. So the
discriminator is the **content type**: `text/javascript` is a module that
transformed, anything HTML is the fallback dressed up as success. Same
generosity CLAUDE.md already documents for a missing asset, in a new place.

**A socket that accepts and never answers hangs `fetch` forever**, so the
15 s deadline never fires and the check hangs rather than failing. Found by
standing a bare `net.createServer()` on 3000 to simulate a squatter — which is
also a realistic squatter. Fixed with a 2 s `AbortSignal.timeout()` per attempt
and a distinct `NO_RESPONSE` reason, which is a genuinely different diagnosis
from `ECONNREFUSED`: something is on the port and it is not this server.

**Node's `fetch` is not caught by the address-family split and `curl` is.**
Measured against the running pair: from `fetch`, `http://localhost:5173/` and
`http://[::1]:5173/` both work and `127.0.0.1:5173` is refused;
`http://localhost:3000/health` and `127.0.0.1:3000` both work and `[::1]:3000`
is refused. So `localhost` is safe from Node for **both** services — undici
tries both families — while `curl` takes what it is given. The consequence is
that the script and the README's hand-run `curl` lines have _different_ correct
answers, and the README names the family explicitly for that reason.

### 5. Three ports, in one place

`README.md` gained three sections before `### typecheck and build are the same
command`: a **ports table** (which of the three is configurable, where each is
set, and why only the backend's is), **what a port conflict looks like** with
both outputs quoted and the half-pair trap spelled out, and **`pnpm ready`**
with its output, its three deliberate omissions and the hand-run `curl`
alternative. The `pnpm ready` row was added to the command table.

`vite.config.ts`'s port comment was rewritten; nothing else in it changed, and
`preview.strictPort` was not added.

### Cost

- **One new file** (`scripts/check-ready.mjs`), **one root script**, **no
  dependency**, no change to `pnpm verify`'s six steps
- **The frontend artefact is byte-identical**: 343,658 B of JavaScript and
  10,926 B of CSS, md5 `cba2825c…` — the same figures and the same hash as
  Task 1.7.6 and as the clean-clone build recorded in `CLAUDE.md`. Only
  comments in `vite.config.ts` changed
- `pnpm verify` exits **0** in **9.38 s**

### What this task did not do

- It did not make the frontend's ports configurable, and did not add a
  `preview.strictPort`
- It did not add a readiness step to `pnpm verify`, and the script's own header
  says why not
- It did not write a CORS check into the readiness helper. It cannot be one:
  the server sends the allowed origin to every caller and the browser is the
  only party that compares, so a 200 from `curl -H "Origin: …"` proves nothing.
  Task 1.8.3 established this and it is restated in the README rather than
  re-measured
- It did not touch `apps/backend/scripts/dev.sh`, which remains the file no
  tool in `pnpm verify` reads
