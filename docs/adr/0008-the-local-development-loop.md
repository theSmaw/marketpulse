# ADR 0008 — The local development loop: legibility, the browser boundary, ports and readiness

**Status:** Accepted
**Date:** 2026-09-02
**Delivered by:** Epic 1, Story 1.8 (Tasks 1.8.1–1.8.7)

## Context

`pnpm dev` already started both applications before this story began — Story
1.3 made the last of the three `dev` scripts real, and Task 1.3.5 verified that
Ctrl-C leaves nothing behind. So this story inherited a working command and
almost no decisions about what that command should be like to sit in front of
for a day.

Six of its eight acceptance criteria were annotated as met or partly met before
it started, and two of those annotations had been written by earlier stories.
What was genuinely outstanding was smaller and more awkward than "make it run":

- **The pair is one terminal, and it was not legible.** A single `GET /health`
  wrote **12 rendered lines** into a stream shared with two compilers and a
  bundler, in a third clock format, under a colour-coded package prefix
- **Nothing connected the two halves.** No page had ever called the API, so the
  browser boundary was undecided — proxy or CORS — and the criterion covering
  it had been carried, unmeasured, since Story 1.3
- **There was no way to ask whether the pair was up.** Not a cosmetic gap: a
  busy port 3000 leaves `pnpm dev` running, green-looking and half dead
- **PRODUCT_SPEC.md §40 makes the clean clone a product requirement.** An
  interviewer clones this repository and follows the README. Six clean-clone
  runs had proved the repository _builds_; none had proved it _runs_

Two constraints shaped almost every decision below, and neither is about
development ergonomics:

- **Story 1.12 is what makes this terminal expensive.** Nothing calls the API
  today, so every legibility measurement had to be taken against the terminal
  Story 1.12 will produce rather than the quiet one that exists
- **A development-only convenience is a production decision in disguise.** A
  Vite proxy, a relaxed CORS default and a port that silently moves are all
  cheap locally and all defer a cost to Story 1.11 or 1.12 — in the shape of a
  failure that names neither its cause nor its origin

## Decisions

### 1. The pair is made legible by changing the **rendering**, not the severity

Two `pino-pretty` options on the transport, and nothing else in the workspace
changed:

```
singleLine: true
translateTime: "SYS:h:MM:ss.l TT"
```

`singleLine` is the whole of the fix. A `GET /health` went from **12 rendered
lines to 2** and a 404 from 14 to 3, with **no field dropped and the severity
floor untouched** — the same records, rendered flat. Task 1.8.1's controlled
session (one page load, three requests, three frontend edits, one backend edit)
went from 47 lines to 16.

The obvious alternative is the one to argue against explicitly, because it will
be reached for again. **`LOG_LEVEL` was deliberately not the lever.** Raising
the floor is the cheap-looking quieter dev loop, and it costs the property ADR
0007 §1 established: at `warn` and above a healthy server is _completely_
silent, its `Server listening at …` line included. A quiet loop and a failed
start become the same terminal. Rendering has no such cost — it changes how a
record looks and not whether it exists.

Two more were measured and rejected. **`messageFormat`** applies one template to
every record with no per-record form, so `{req.method} {req.url}` reads well on
the two records that have a `req` and leaves a run of spaces on
`Server listening at …`. **`ignore: "reqId,pid"`** is the only remaining lever
worth anything — it takes the widest request line from 172 columns to 117, which
is the difference between wrapping and not — and it was rejected because
`reqId` exists precisely to survive interleaving and Story 1.12 is what
introduces interleaving. That is a **standing reversal trigger**: if Story 1.12's
requests turn out not to interleave, `ignore` is the lever and it is worth 55
columns.

A process manager was never reached, because two options cleared the bar.

Two consequences belong here rather than in a task file:

- **A stack is still multi-line**, deliberately — that is pino-pretty's own
  behaviour and it is the behaviour a stack reading down the page wants. So the
  `EADDRINUSE` record **did not shrink at all**: it is still 16 lines, and
  `listen EADDRINUSE: address already in use 127.0.0.1:3000` is line 4 of them.
  Shrinking it was considered as an eighth task and rejected — see §4, where the
  measurement says the length was never what made that failure expensive
- **`SYS:` is load-bearing and its absence is silent.** Without it,
  `translateTime` formats in **UTC** — a clock that disagrees with tsc's and
  Vite's by a whole timezone while looking entirely plausible. With it, the
  shared stream carries two conventions rather than three, since pnpm stamps
  nothing

### 2. The browser talks to the backend through real CORS on the server, not a Vite proxy

`apps/backend/src/cors.ts` registers `@fastify/cors` 11.3.0 **inside
`buildServer()`** — so Story 1.9's `app.inject()` instances get it — with one
origin from a fifth configuration variable, `CORS_ORIGIN`, and
`exposedHeaders: [REQUEST_ID_HEADER]`. It defaults to `http://localhost:5173`,
so a clean clone with no `.env` file has a working pair.

**The proxy was built and run before it was rejected**, and the measurement that
settled it is not the one the story anticipated. The anticipated argument was
that a proxy leaves Story 1.12's allowlist untested in the one environment
anybody runs. That argument is real and it held. What was not anticipated is
that through a proxy **`x-request-id` reads back with no configuration at all**,
because a same-origin response exposes every header — under real CORS it does
not, since the safelist is short and `x-request-id` is not on it. So a proxy
hides **two** things rather than one: the allowlist, and the fact that the
correlation id ADR 0007 §3 built needs a server to _expose_ it. Re-verified in a
browser for this ADR: a page at `http://localhost:5173` fetching
`http://127.0.0.1:3000/health` sees exactly
`["content-length", "content-type", "x-request-id"]` — the CORS safelist plus
the one header `exposedHeaders` names.

`@fastify/cors` was taken over a hand-rolled hook **against this repository's own
habit** — Story 1.6 threw away two schema libraries and Task 1.7.6 threw away
`react-error-boundary`. The deciding difference is the failure mode. Those would
have been merely verbose if hand-rolled wrong; a hand-rolled CORS is either too
permissive, which is a security bug, or subtly wrong on preflight, which
presents as `TypeError: Failed to fetch` beside a 200 in the log — that is,
**indistinguishable from the bug being fixed**.

Two consequences, both re-measured for this ADR:

- **CORS is not this API's access control.** With a _string_ origin,
  `@fastify/cors` asserts `access-control-allow-origin` unconditionally: a
  request from `https://evil.example` and a request with no `Origin` at all both
  get a **200 carrying the allowed origin**. The browser compares and refuses;
  the server never sees the check fail. So `curl` cannot test it, there is
  correctly no `Vary: Origin` on a simple request because the header is a
  constant, and the router and the error handler — not this — are what control
  access. The allowlist is nonetheless real, proved by making it fail: a second
  instance with `CORS_ORIGIN=https://marketpulse.example` put the page back to
  `TypeError: Failed to fetch` while its own log recorded a 200
- **`methods` defaults to `GET,HEAD,POST`**, read out of the package rather than
  assumed — the plausible guess is the wider CRUD set and it is wrong. A
  preflight for `PUT` is answered **204** with
  `access-control-allow-methods: GET,HEAD,POST`, so the browser refuses a route
  that answers `curl` perfectly. The first route taking a `PUT` needs that line

### 3. The frontend's ports stay literals; only the backend's are configuration

5173 and 4173 remain literals in `vite.config.ts` with no environment override.
**Symmetry with the backend was explicitly rejected as a reason**: `PORT` and
`HOST` are properties of a deployed process, and neither Vite port reaches a
deployment at all — `dist/` is three static files on somebody else's host, and
both Vite servers are development tools.

The argument that used to be a forecast is now the state of the tree.
`CORS_ORIGIN` really is pinned to `http://localhost:5173` and the backend really
does enforce it, so **a dev server that bound 5174 is a broken pair today**, and
`strictPort: true` is what turns that into an exit 1 naming the port instead of
a `TypeError: Failed to fetch` naming nothing.

Two consequences:

- **The reversal is two edits rather than one** — the port in `vite.config.ts`
  and the `CORS_ORIGIN` it is pinned to. That is exactly why
  `scripts/check-ready.mjs` dials the origin `CORS_ORIGIN` names rather than
  keeping a second copy of 5173: forgetting the second edit is then reported by
  name at the command line. The reversal trigger is unchanged — two people
  needing two frontends at once — and its mechanism is `loadEnv()` and **never**
  `process.env`, because `vite.config.ts` cannot see a `.env` file at all
- **`strictPort` is right either way, and its consequence has a name now.** A
  busy 5173 exits 1 and takes the whole of `pnpm dev` down with it. That is
  loud, immediate and correct; it is also the _opposite_ of what a busy 3000
  does, which is §4's subject

### 4. Readiness is a script, and it is deliberately **not** a `verify` step

`pnpm ready` runs `scripts/check-ready.mjs` — 317 lines, no dependency — polling
both services in parallel for up to 15 s at 250 ms.

It exists because the two services fail in **opposite** ways, and the
cheap-looking one is the dangerous one. A busy 5173 stops everything. **A busy
3000 stops nothing**: the server writes its 16-line `EADDRINUSE` record,
`node --watch` catches the exit and prints
`Failed running 'dist/index.js'. Waiting for file changes before restarting...`,
the frontend carries on serving, and **nothing exits non-zero**. Sixteen lines
scroll away behind Vite's banner and what is left is a pair that looks healthy
and is half dead. The verbosity is the minor complaint; the survival is the
problem, and no amount of rendering work fixes it — which is why the
conflict-record rendering was considered as an eighth task and dropped.

**It must not become a seventh `verify` step**, and this is the instruction
most easily got backwards. `verify` runs with no servers up, where "nothing is
running" is the honest answer rather than a failure. CI (Story 1.10) waits on
`pnpm ready` _around_ the pair; it does not assert it as part of the build.

**There are four independent reasons readiness cannot be a log grep**, not two:

1. At `warn` and above the server never prints its readiness line at all
   (ADR 0007 §1)
2. Fastify rewrites `0.0.0.0` to `127.0.0.1` in that line, so it is not evidence
   of the bound interface
3. The line arrives **second**, after Vite's banner — and which loop lands last
   is a race between three watchers
4. Task 1.8.2 changed its clock format, so a matcher written against the old
   shape matches nothing

Two consequences that generalise past this script:

- **Vite's dev server never 404s, so no HTTP status can judge the frontend.**
  Against a tree with `packages/shared` moved aside, `GET /` is 200,
  `/src/main.tsx` is 200, and `AppHeader.tsx` is 200 — because Vite transforms
  one module per request and `AppHeader`'s `@marketpulse/shared` import is
  _type-only and erased_. Worse, a module path that does not exist comes back
  **200 `text/html`**, the SPA fallback, which passed an earlier version of this
  check outright. So the discriminator is the **content type** of a module with
  a _value_ import of the shared package —
  `src/routes/MarketOverview.tsx` — `text/javascript` for a real module and
  anything HTML for the fallback
- **Node's `fetch` tries both address families and `curl` does not**, so the
  script and the README have _different correct answers_. From `fetch`,
  `localhost` reaches both services; from `curl`,
  `http://127.0.0.1:5173/` is refused and `http://[::1]:3000/health` is too. Any
  documented `curl` names the family explicitly; anything written in Node does
  not have to

Three further properties are deliberate. It reads the backend's address from the
**built** `dist/config.js`, exactly as `check-env-example.mjs` does, so `PORT`
and `HOST` are respected and a wildcard `HOST` is rewritten to `127.0.0.1` for
dialling. It uses a **2 s `AbortSignal.timeout()` per attempt**, because a
socket that accepts and never answers hangs `fetch` forever and an overall
deadline never fires — which is what makes "something is on the port and it is
not this server" a distinct diagnosis from `ECONNREFUSED`. And it is `.mjs`
under `scripts/`, so ESLint and Prettier read it — unlike
`apps/backend/scripts/dev.sh`, which nothing does.

`ready` was checked against `pnpm help -a`'s full command list before being
claimed: unlike `clean`, `env`, `config`, `start` and `test`, it is not a pnpm
built-in.

### 5. Storybook stays out of `pnpm dev`, and the reason is the port

Task 1.4.5 kept the workshop out on a terminal-crowding argument. **That
argument does not survive measurement** and is not the reason to record: the
boxed startup banner survives pnpm's line prefix intact, at 12 startup lines
against Vite's 3, and the workshop is as quiet as Vite afterwards.

What decides it is that **Storybook does not strict-port**. With 6006 held, it
does not fail — it offers 6007. That is the behaviour `strictPort: true` was
chosen to prevent for 5173 and 4173, and §3 is why a silently moved port is
expensive here rather than merely untidy.

Re-measured for this ADR, with a **refinement to Task 1.8.2's account**.
Storybook 10.5.10 does not silently bind 6007: it prints
`Port 6006 is not available. / Would you like to run Storybook on port 6007
instead?` with a Yes/No selector **defaulting to Yes**. On a pty that is an
interactive prompt; with no tty it prints the prompt and **waits indefinitely**,
binding nothing — observed for 45 s. So inside `pnpm dev`'s non-interactive
fan-out the outcome is a hang rather than a moved port. Task 1.8.2's "it bound
6007 and said so in a line nobody reads" describes that prompt's default. **The
decision is unchanged and the argument is stronger**: a loop that hangs waiting
for an answer nobody can give is worse than one that moves a port.

Beside that, the workshop and the application are different activities, so
running both always leaves one bundler idling. The reversal trigger is a story
being edited routinely in the same sitting as the application — and the port
question has to be answered first.

### 6. There is still no environment concept, and this story was its third test

ADR 0006 decided nothing branches on which environment it is in; ADR 0007 §1
recorded the log format as its first real test and the decision held. This story
was the second and third, and it held twice more.

`CORS_ORIGIN` is an ordinary configuration value with a default, read by the
same module through the same reader with the same precedence — not a
"development mode". `LOG_FORMAT=pretty` still arrives from
`apps/backend/scripts/dev.sh`, the file that _is_ the development loop, rather
than from a branch. Nothing added here asks which environment it is in, and
`NODE_ENV` is still read nowhere.

The consequence handed forward is **Story 1.11's, and it is not optional**: the
`CORS_ORIGIN` default is not safe by omission. A deployment that never sets it
allows a page at `http://localhost:5173` to call production. Small — `credentials`
is off and there is no cookie to ride along — and real. "Required in production"
is not expressible here, by this same decision; a documented default that
`pnpm env:check` keeps honest is what replaces it.

### 7. The README's prose figures are a **fourth** `pnpm verify` gap, accepted and dated

`CLAUDE.md` records three things `pnpm verify` does not cover:
`apps/backend/scripts/dev.sh`, the `rm -rf` fragments inside two `clean`
scripts, and the class of stated-but-unenforced invariant Task 1.6.4 found.
This story adds a fourth, and it arrives with evidence rather than as a
hypothesis: **Task 1.8.6 found three prose figures wrong in `README.md` in a
single reading**, and Task 1.8.5 had already found a fourth — the stylesheet
documented at 9.82 kB against an actual 10,926 B, stale for two stories with
nothing to catch it.

**The two halves are not alike and the decision differs between them.**

- **Ten intra-document links are cheaply checkable.** Task 1.8.6 wrote a
  ten-line checker to answer the question once, and this task re-ran an
  independent one: 34 headings, 11 links, 10 distinct, **0 broken**
- **A figure in a sentence is checkable by nothing.** It has no counterpart to
  compare itself against. No tool closes this half, so closing the cheap half
  would leave the expensive one open and make the section look covered

An eighth task to build the link checker was considered by the story and
rejected as scaffolding ahead of the iteration that needs it: a new `verify`
step and a new script, for half a problem measured once. **Story 1.10 owns CI
and is where a link check belongs if one is ever wanted.** Recorded as a
decision rather than left implied, and **dated 2026-09-02** alongside the other
three.

## Rejected, with reasons

| Alternative                                               | Why not                                                                                                                                                                               |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Raising `LOG_LEVEL` to quieten the dev loop               | At `warn` and above a healthy server is completely silent, its readiness line included — a quiet loop and a failed start become the same terminal                                     |
| `messageFormat` for the request records                   | One template applies to every record with no per-record form; it reads well on the two with a `req` and leaves a run of spaces on `Server listening at …`                             |
| `ignore: "reqId,pid"`                                     | Worth 172 → 117 columns, but `reqId` exists to survive interleaving and Story 1.12 is what introduces it. **Standing reversal trigger** if 1.12's requests turn out not to interleave |
| `translateTime` without the `SYS:` prefix                 | Formats in **UTC** — silently, and plausibly, a whole timezone away from tsc's and Vite's clocks                                                                                      |
| Shrinking the 16-line `EADDRINUSE` record                 | `singleLine` deliberately leaves a stack multi-line, and that is the behaviour worth keeping. The measurement says length was never what made that failure expensive — survival was   |
| A process manager over the two `pino-pretty` options      | Never reached; two options cleared the bar                                                                                                                                            |
| A Vite `server.proxy` to the backend                      | Leaves Story 1.12's allowlist testing nothing, **and** exposes `x-request-id` for free because a same-origin response exposes every header — so it hides two things, not one          |
| A hand-rolled CORS hook                                   | Against the house habit, but its failure mode is a security bug or a preflight error indistinguishable from the bug being fixed. 2 packages and ~1.5 µs is the right price            |
| `credentials: true` on CORS                               | Nothing authenticates yet; it is the setting that turns a permissive origin into a real exposure                                                                                      |
| Making 5173/4173 configuration, for symmetry              | `PORT`/`HOST` are properties of a deployed process; neither Vite port reaches a deployment. Symmetry is not a reason                                                                  |
| `process.env` in `vite.config.ts` if they ever become one | That file cannot see a `.env` file at all. The mechanism is `loadEnv()`                                                                                                               |
| Dropping `strictPort`                                     | A silently moved 5173 is a broken pair _today_, and its symptom is a browser error naming neither the port nor the cause                                                              |
| A second copy of `5173` inside `scripts/check-ready.mjs`  | `CORS_ORIGIN` is already the pin and `env:check` already keeps it honest; a second copy drifts silently in the direction that matters                                                 |
| Grepping the dev-loop log for readiness                   | Four independent reasons it cannot work — see §4                                                                                                                                      |
| Judging the frontend on an HTTP status                    | Vite's dev server never 404s; `/`, `/src/main.tsx` and a type-only importer all answer 200 against a broken graph, and a nonexistent path answers 200 `text/html`                     |
| An overall deadline instead of a per-attempt timeout      | A socket that accepts and never answers hangs `fetch` forever, so the deadline never fires                                                                                            |
| Making `pnpm ready` a seventh `verify` step               | `verify` runs with no servers up, where "nothing is running" is the honest answer rather than a failure                                                                               |
| Adding Storybook to `pnpm dev`                            | It does not strict-port: with 6006 held it prompts for 6007 and, with no tty, hangs — the behaviour `strictPort` exists to prevent                                                    |
| Keeping Task 1.4.5's terminal-crowding reason for that    | Measured and false: the banner survives pnpm's prefix intact, 12 startup lines, quiet afterwards                                                                                      |
| `NODE_ENV` / an `APP_ENV` for CORS or the log format      | Third and fourth tests of ADR 0006's decision; nothing here needs to _behave_ differently, only to be _configured_ differently                                                        |
| An eighth task building a README link checker             | Half a problem, measured once, for a new script and a new `verify` step. Story 1.10 owns CI and is where it belongs                                                                   |

## Consequences worth stating separately

### A clean Ctrl-C is noisy, the noise is not a failure, and two parts of it are non-deterministic

pnpm reports **one** interrupted watcher as `Failed` and prints
`[ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL] … Command failed with signal "SIGINT"`.
**Which** watcher it names is a race — whichever exits first. Task 1.8.2 saw
`packages/shared` three times and `apps/frontend` once; this task saw
`apps/frontend` on a clean Ctrl-C and `packages/shared` on the busy-3000 run.
There is nothing truthful for it to say.

The spurious `[WARN] Local package.json exists, but node_modules missing, did
you mean to install?` is **also non-deterministic** — new here, and worth
knowing because it is the line most likely to send a first-timer to reinstall a
working tree. It appeared on the busy-3000 shutdown and **not** on the clean
Ctrl-C in the same session. Nothing is missing either way.

Every lever was measured and each costs more than the message does: `--no-bail`
drops the error block but prints **two** `Failed` lines, keeps the false
warning, and stops a genuinely broken dev script aborting the run;
`--loglevel error` drops the warning and suppresses _every_ child's streamed
output, the server's log included; `--silent` prints nothing at all. The
remaining option is a SIGINT-trapping shell wrapper per package — two new files
in the part of this repository `pnpm verify` reads with nothing. So it stays,
and `README.md` documents it.

### Root `pnpm dev` really does build `packages/shared` twice, and this was nearly "corrected" into being wrong

Task 1.8.1 read the dev-loop transcript and concluded that the second compile
finds nothing to do, and Task 1.8.7 was briefed to correct `CLAUDE.md`
accordingly. **Measured, the original sentence is right and the correction was
wrong.**

A single edit to `packages/shared/src/api-error.ts` under root `pnpm dev`
rewrites `packages/shared/dist/api-error.js` **twice** and
`packages/shared/tsconfig.tsbuildinfo` **twice**. The control settles it: the
same edit with only `pnpm --filter @marketpulse/shared dev` running rewrites
each **once**. Both watchers emit — the second is `apps/backend`'s
`tsc -b --watch` following the project reference — and both announce
themselves, so a shared edit costs four tsc lines under two different package
prefixes rather than two.

This is ADR 0007's lesson arriving a second time, from the other direction:
**a correction to a recorded figure is itself a claim, and it needs the same
measurement the original did.** Task 1.7.7 rebuilt four commits to find that two
"corrections" were wrong; this one was caught before it landed.

### `pnpm dev`'s startup order is a race, and only the listening line is reliably last

Thirteen lines in well under a second and a half. Where Vite's address lands
relative to the compilers' output varies between runs, which is why
`README.md` no longer says the block ends with it — Task 1.8.6 corrected that
claim from the clone, and this task reproduced the interleaving again.

### The foreground-tab instruction cannot be followed by an automated browser

Task 1.8.7 was told to re-take both edit-to-visible timings in a **foreground**
tab, and to evidence "foreground" rather than assert it. The evidence came back
`document.visibilityState === "hidden"` on every sample — an automated tab
cannot be foregrounded, so this instruction needs a hand on the browser or it
cannot be followed. It is recorded as unfollowed rather than quietly asserted.

What that does not prevent is the cheap proof that the updates were **module
replacement and not a reload**, which is unaffected by throttling:
`performance.timeOrigin` unchanged and exactly **one** `navigation` entry on
every sample, for all ten edits.

Measured hidden-against-hidden, the two kinds of edit are **7.6× apart** — a
CSS-only edit at 81–107 ms (median 91) and a component edit at 621–797 ms
(median 696). The useful observation is that **only one of the two numbers is
throttled**: the CSS band sits inside Task 1.4.6's 24–130 ms because a
stylesheet swap never goes through React's scheduler, while the component band
is 2.5–4× Task 1.4.6's 177–280 ms upper bound for exactly the reason 1.4.6
flagged. **Compare hidden against hidden and never a hidden number against a
foreground one** — Task 1.8.2's hidden median of 486 ms and Task 1.8.6's hidden
77–1286 ms band are the comparable figures, and a hidden component measurement
looks exactly like a regression when it is not.

### The two conflict shapes remain opposite, and recovery from the quiet one has two traps

Re-measured. A busy 5173: Vite prints a **seven-line** error block ending in
`Error: Port 5173 is already in use` plus five stack frames, pnpm reports
`ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL`, and the whole command **exits 1** — 20
lines in total and nothing left running. A busy 3000: a **16-line** record with
the message on line 4, `Failed running 'dist/index.js'. Waiting for file
changes before restarting...`, 30 lines in total, and `pnpm dev` **still
running**.

Recovery from the second has two traps that are worth more than the message is.
Freeing the port is not enough — `node --watch` waits for a _file_ change and
not for the port. And `touch`ing a source is not enough either — tsc's
incremental build emits nothing when the content is unchanged, and `node --watch`
watches `dist/`. A real edit brings the listener back in about a second.

`pnpm ready` is the answer to the second shape and it names it precisely:
`✗ backend http://127.0.0.1:3000/health NO_RESPONSE`, followed by "Something is
holding 127.0.0.1:3000 and not answering. That is not this server", exit 1 —
while the frontend row is a tick.

### One cosmetic defect in `scripts/check-ready.mjs`, found in 1.8.6 and fixed here

With two invalid configuration keys, the reported error indented its first line
and not its second, because `config.ts`'s multi-line message was interpolated
after a single fixed indent. Fixed by indenting per line. Reported rather than
inherited, because this is the story that shipped the script; the single-key
case is unchanged.

### The criterion this story met is the one it cannot demonstrate

"The frontend can call the backend without CORS or proxy errors" is met, and
**it is not observable from the running application**. The probe that
demonstrated it was removed before Task 1.8.3 closed, and nothing calls the API
until Story 1.12. `curl` cannot re-check it either, for §2's reason. It was
re-verified here from the browser's own console rather than from the
application, and that is the only way to re-verify it until Story 1.12 lands.

## Measured

Every figure below was taken in Task 1.8.7, on the shipping tree, on
`darwin 23.6.0` / Node 24.20.0 / pnpm 11.24.0 / Vite 8.2.2 / Fastify 5.12.1 /
Storybook 10.5.10.

### Acceptance criteria

| #   | Criterion                                             | Evidence                                                                                                                                                                 |
| --- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `pnpm dev` is the single command                      | 3 watchers, 2 servers, **8 processes**, **13 lines**, **786 ms** to the listening line                                                                                   |
| 2   | The backend's dev loop is the pattern to match        | Edit → new listener **1061 ms median** (958–1270, n=5), against the ~1.1 s baseline. `signal received` / `shutdown complete` on every restart                            |
| 3   | The frontend calls the backend, no CORS or proxy      | Browser at `http://localhost:5173` fetching `http://127.0.0.1:3000/health`: **200**, `x-request-id` readable, headers visible = safelist + `x-request-id` **only**       |
| 4   | Both services reload on source change                 | Backend as above. Frontend **hidden-tab**: CSS 81–107 ms (median 91), component 621–797 ms (median 696); `timeOrigin` unchanged and **1** navigation entry on all ten    |
| 5   | Storybook is deliberately not in `pnpm dev`           | With 6006 held on both families it **prompts for 6007** and, with no tty, waits indefinitely — it never binds                                                            |
| 6   | Prerequisites documented                              | Unchanged since Task 1.1.8; no new prerequisite in this story                                                                                                            |
| 7   | A clean clone reaches a running application           | Re-run: **327 packages cold in 3.52 s**, `pnpm verify` **13.56 s** exit 0, artefact byte-identical                                                                       |
| 8   | Ports configurable, conflicts produce a clear message | Backend `PORT`/`HOST` configurable; frontend literal by decision. Busy 5173 = 7-line Vite block, exit 1, nothing survives. Busy 3000 = 16-line record, **nothing exits** |

### The running pair

| Measurement                              | Result                                                                                                           |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `pnpm dev` startup                       | **13 lines**, **786 ms** to `Server listening at` (Task 1.8.2: 830 ms; Task 1.8.6, in a clone: 1,159 ms)         |
| Startup order                            | A **race** between the three loops; only the listening line was reliably last in this run                        |
| Rendered lines, browser page load        | **0** — nothing in the application calls the API yet                                                             |
| Rendered lines, `GET /health`            | **2**                                                                                                            |
| Rendered lines, 404                      | **3**                                                                                                            |
| Backend edit → new listener              | **1061 ms** median (958, 1034, 1061, 1192, 1270)                                                                 |
| Frontend CSS-only edit, **hidden** tab   | 81, 84, 91, 100, 107 ms — median **91 ms**                                                                       |
| Frontend component edit, **hidden** tab  | 621, 671, 696, 767, 797 ms — median **696 ms**                                                                   |
| HMR, not a reload                        | `performance.timeOrigin` unchanged, **1** navigation entry, on all 10 samples                                    |
| `pnpm ready`, warm                       | **0.29 s** median (0.29–0.33, n=5) — Task 1.8.4: 0.30 s, Task 1.8.6: 0.33 s                                      |
| `pnpm ready`, started with `pnpm dev`    | **0.87 s** twice, exactly reproducing Task 1.8.4's 0.87 s (Task 1.8.6: 0.86 s); one 1.40 s first-run outlier     |
| `pnpm ready` against a half-pair         | `✗ backend … NO_RESPONSE`, `✓ frontend`, exit **1**, naming the port and the unrelated process                   |
| Ctrl-C                                   | **8 processes → 0 survivors**, both ports released                                                               |
| Ctrl-C, watcher pnpm blames              | `apps/frontend` here; `packages/shared` on the busy-3000 run — a **race**                                        |
| Ctrl-C, `node_modules missing` warning   | **Intermittent** — absent on the clean Ctrl-C, present on the busy-3000 shutdown, same session                   |
| Busy 5173                                | 7-line Vite error block, 20 lines total, `pnpm dev` **exits 1**, nothing left running                            |
| Busy 3000                                | 16-line record, `EADDRINUSE` on **line 4**, 30 lines total, `pnpm dev` **still running**, nothing exits non-zero |
| `server failed to start ` trailing space | Still present — `singleLine` appends a flattened object that is empty on a record whose only payload is `err`    |
| `packages/shared` emits per shared edit  | **2** under root `pnpm dev`; **1** under the shared watcher alone (control)                                      |

### The browser boundary

| Measurement                              | Result                                                                                                    |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Cross-origin `GET /health` from the page | **200**; body `{status, version, uptimeSeconds}`                                                          |
| Headers readable from JavaScript         | `content-length`, `content-type`, **`x-request-id`** — the safelist plus the one `exposedHeaders` names   |
| No `Origin` header at all                | 200 with `access-control-allow-origin: http://localhost:5173`                                             |
| `Origin: https://evil.example`           | **200**, same allowed origin asserted — the server never refuses; the browser does                        |
| `Vary: Origin` on a simple request       | **Absent**, correctly — with a string origin the header is a constant                                     |
| Preflight `OPTIONS` for `PUT`            | **204**, `access-control-allow-methods: GET,HEAD,POST`, `vary: Access-Control-Request-Headers`            |
| Allowlist proved by failing it           | `CORS_ORIGIN=https://marketpulse.example` → `TypeError: Failed to fetch` in the page, **200** in that log |

### Workspace

| Measurement                       | Result                                                                                                                                 |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm verify`, warm               | **9.25 s**, exit 0 — build 3.04 / lint 3.56 / `format:check` 2.77 / `stories` 0.27 / `env:check` 0.27 / `test` 0.50                    |
| `pnpm verify`, after `pnpm clean` | build 4.03 / lint 3.50 / `format:check` 2.66 / `stories` 0.26 / `env:check` 0.27 / `test` 0.49                                         |
| Cold build split                  | `tsc -b` **1.78 s** / `vite build` **0.53 s** / `storybook build` **1.55 s**                                                           |
| Clean clone, cold store           | **327 packages downloaded in 3.52 s**; `pnpm verify` **13.56 s** exit 0                                                                |
| Artefact                          | **271 modules, 343,658 B JS, 10,926 B CSS, 3 files**, `index-C-Puqfnm.js`, md5 `cba2825c87721779927b2f385df406e9`                      |
| Clean-clone artefact              | **Byte-identical** — same md5, same module count, same file count                                                                      |
| Unchanged by this story           | The artefact did not move at all: Task 1.7.7, Task 1.8.4 and this task all read 343,658 B and `cba2825c…`. The frontend gained nothing |
| `storybook-static/`               | **299 modules, 59 files, 9.3 MB on disk** — unchanged since Task 1.7.6                                                                 |
| New dependencies, whole story     | **one** — `@fastify/cors` 11.3.0, **+2 packages** (with `fastify-plugin`), 172 kB, no install script, ~**+1.5 µs** on a ~13 µs request |
| `allowBuilds`                     | Still one entry, `esbuild`                                                                                                             |
| `pnpm stories`                    | **9 components, 9 stories files** — unchanged                                                                                          |
| Files importing `@base-ui/react`  | **1** (a plain `grep -rl` still answers 2 — `AppHeader.tsx` names it in a comment)                                                     |
| Root scripts                      | 13, of which `ready` is the seventh non-tooling verb and deliberately outside `verify`                                                 |
| README intra-document links       | 34 headings, 11 links, **10 distinct, 0 broken** — with a slugger that does **not** collapse whitespace                                |
| The double-hyphen trap            | Reproduced a third time: a collapsing slugger reports `#pnpm-ready--knowing-the-pair-is-up` as broken. It is correct                   |

The `pnpm verify` total has now gone up and down across four consecutive
stories while the tree only grew — 9.3–9.8 s, 10.1 s, 8.77 s, 9.25 s. **Stop
reading the total as a trend and read the per-step split.**

## Related

- ADR 0002 — the server factory and the signal handlers the dev loop's restart
  timing measures
- ADR 0003 — `strictPort`, the three ports, and why `vite preview` is not a
  static host
- ADR 0006 — the configuration readers `CORS_ORIGIN` joins, the `loadEnv()`
  mechanism, and the "nothing branches on the environment" decision this story
  tested twice more
- ADR 0007 — the `pretty` transport §1 configures, the correlation id §2's
  `exposedHeaders` exists for, and the `warn`-and-above silence that disqualifies
  a log grep
- PRODUCT_SPEC.md §40 — the clean clone as a product requirement
- Stories 1.9, 1.10, 1.11 and 1.12 — see each story's own feed-forward section
