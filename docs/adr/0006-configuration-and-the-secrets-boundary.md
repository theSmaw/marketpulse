# ADR 0006 — Configuration, environments, and the secrets boundary

**Status:** Accepted
**Date:** 2026-08-31
**Delivered by:** Epic 1, Story 1.6 (Tasks 1.6.1–1.6.7)

## Context

Both applications run and neither reads configuration properly. `apps/backend`
reads `PORT` and `HOST` inline in its entrypoint; `apps/frontend` reads nothing
at all and has no `.env` file anywhere. Epic 2 brings Alpaca API credentials and
Epic 10 brings an LLM provider's, so the boundary between "a value the browser
may have" and "a value that never leaves the server" has to be correct before
either arrives — and it has to be correct in a way that survives the person
adding the credential not having read this document.

Three constraints shaped this more than the validation question did:

- **There are two variables.** Anything whose value scales with the size of the
  configuration surface is being bought at the wrong scale here. The V1 surface
  is a port and an interface
- **The frontend has no runtime.** Its configuration is statically substituted
  into the bundle at build time, so "configuration" there is a property of the
  artefact rather than of a running process. This is the same shape as ADR
  0003's `base` finding, and it has the same consequence
- **A secrets boundary that is only a convention is not a boundary.** Every
  decision below was checked by making it fail, because a rule nobody can
  violate accidentally is worth more than a rule everybody has read

One property of the toolchain sits underneath §5 and §8 and is stated once
here: a **stated invariant is not a checked one**. Story 1.3 wrote down that
`process` does not typecheck in browser code, and it stopped being true in Task
1.4.5 and stayed wrong through two stories. Nothing found it except a task whose
Done-when said to re-measure rather than to cite.

## Decisions

### 1. No schema library. A declared set of readers, plus a table

Settled 2026-08-31 in Task 1.6.1 by spiking **Zod 4.5.4** and **Valibot 1.4.2**
to full parity with what `index.ts` already did, then throwing both away.

The deciding finding is specific to environment variables rather than general:
**a schema over `process.env` is a schema over a record whose values are always
strings.** So the two behaviours that actually matter here have to be
hand-written under either option:

- **Blank means absent.** `PORT=` is the commonest shape in a `.env` file — a
  placeholder nobody filled in, a line copied from the example. Under
  `z.coerce.number()` it parses as **port 0**, which is a real value meaning
  "any free port", so the server starts successfully on the wrong port
- **A message quoting what the operator typed.** `z.coerce.number()` reports
  `NaN` and loses the input. The message Task 1.2.1 already produced by hand —
  `PORT must be an integer between 1 and 65535, received "nonsense"` — is the
  acceptance criterion

A third finding, smaller and structural: `exactOptionalPropertyTypes` makes an
optional key `?: T`, while both libraries infer `?: T | undefined`, so an
inferred config type is a **TS2375** against a declared one. The interface is
declared and the readers are built to fit it, not the other way round.

Cost, recorded so nobody re-derives it: one single-key schema in the frontend
bundle is **+74.88 kB for Zod** and **+3.14 kB for Valibot**, and Zod costs
~19 ms on every server start.

What this is _not_ is an argument against schema libraries. **The reversal
trigger is Epic 11's `WorkspaceCommand` validation** — untrusted, structured,
deeply nested input from a model, which is a different problem and may well want
Zod. The argument here is that `process.env` is a flat record of strings and a
library brings nothing to that shape.

### 2. The environment is read in exactly one file

`apps/backend/src/config.ts` is the only file in the workspace that reads
`process.env`, verified by grep; the single occurrence is the default parameter
of `loadConfig(env = process.env)`.

Three properties of that module, each chosen against the obvious alternative:

- **It throws and never exits.** `index.ts` catches `ConfigError`, writes the
  plain stderr line and calls `process.exit(1)`. A config module that exits
  cannot be tested, and Story 1.9 will want to assert the throwing
- **It validates on call, not on import**, for the same reason `buildServer()`
  does not listen. `env` is a parameter so the readers can be driven with a
  plain object and no process to mutate
- **It reports every bad key rather than the first**, through an eleven-line
  accumulator. Two `undefined` checks in it are dead at runtime and exist to
  narrow types without a non-null assertion `strictTypeChecked` would reject

There is `readString` and `readInt` and no `readEnum`: Task 1.6.3 went looking
for the first enum variable and there isn't one. **Story 1.7's `LOG_LEVEL` is
the one that brings it**, and it should be written then rather than now.

It costs nothing measurable — start-to-listening is 76 ms median against 77 ms
for the inline version it replaced.

### 3. `process.loadEnvFile()` called from the entrypoint, not `--env-file`

Settled in Task 1.6.3, and every part of it was measured against the
alternative.

**`--env-file` was rejected on two independent counts.** On a missing file it is
`node: .env: not found` and **exit 9 before any application code runs** — and a
missing file is exactly what a fresh clone is, so the documented first run would
fail. `--env-file-if-exists` fixes that and writes a stderr line on every
ordinary start instead. But the deciding argument is the one neither flag
answers: **a flag has to be repeated at every invocation site, and there are
two** — `start` in `package.json`, and `node --watch dist/index.js` inside
`apps/backend/scripts/dev.sh`, which is the one file `pnpm verify` checks with
nothing. Two copies of the loader is precisely the "works in dev, differs in
production" bug this is meant to prevent. `NODE_OPTIONS` cannot hold either
flag; Node rejects them there outright.

In-process there is one call site, so the two entrypoints have nothing to
disagree about and `scripts/dev.sh` was not touched.

The file is resolved from `import.meta.dirname`, **not** the current working
directory — which is what Node's own default and dotenv's would give. Both
entrypoints already run with the package as their cwd, so they agree either way;
resolving from the module means they agree by construction, and
`node apps/backend/dist/index.js` from the repository root then works too.

Three behaviours, all measured and all re-measured in Task 1.6.7:

| Behaviour                   | Result                                                        |
| --------------------------- | ------------------------------------------------------------- |
| Real env var vs. file entry | The **real variable wins**, tested both ways round            |
| `PORT=` (blank) in a file   | Sets an empty string → `present()` treats it as absent → 3000 |
| Missing file                | Silent. ENOENT swallowed                                      |

The first is what a container depends on and is why nothing has to special-case
production. The third is because two of the three environments have no file by
design. Reading a two-line file does not show above run-to-run variance.

### 4. There is no environment variable, and that is a decision

Nothing in the application branches on which environment it is in. There is no
`NODE_ENV` read, no `APP_ENV`, no `isProduction`.

What differs between the three environments is where the **values** come from —
a gitignored `apps/backend/.env` in development, the runner's own process in
test (Story 1.9), the container's environment in production (Story 1.11) — and
one precedence rule covers all three, so no code path has to know. Task 1.2.5
had already run the built server under `NODE_ENV=production` and found nothing
about its behaviour or its logs differed, so this starts from nothing rather
than from an existing convention.

`NODE_ENV`/`APP_ENV` was rejected as **a variable with no reader**: a name that
looks like configuration, is documented like configuration, and changes nothing.

**The reversal trigger is the first thing that has to _behave_ differently
rather than be _configured_ differently.** Story 1.7's log format is the
likeliest — pino-pretty in development and JSON in production would be
introducing that concept rather than inheriting one — and it may turn out to
need only a `LOG_LEVEL`, which is a value and not an environment. Do not add a
variable naming the environment before something branches on it.

### 5. The frontend's boundary is `envPrefix`, and the type-level half is gone

`vite.config.ts` states `envPrefix: ["VITE_"]` and `envDir: "."` as decisions
rather than inheriting them as defaults. Both are Vite's defaults; writing them
down is what makes widening one a visible edit.

The enforcement is **at the reference site, not at the string pool**. With a
realistic secret and a legitimate variable both in `apps/frontend/.env` and both
read from application code, the built bundle contains:

```js
console.log(`probe`, void 0, `https://api.marketpulse.example/v1`);
```

The prefixed value is a literal; the non-prefixed **read** compiles to
`undefined`. Neither the secret's value nor the name `ALPACA` appears anywhere
in `dist/`. The same probe in a `.stories.tsx` gives the identical line in
`storybook-static/` — which matters, because `pnpm build` produces that
directory too and it serves from a dumb static host exactly as `dist/` does.

**Two things defeat this and neither is configured:** widening `envPrefix`, and
`define`, which substitutes whatever it is given with **no prefix rule at all**.

`envDir` is `.` — `apps/frontend/.env`, matching the backend's package-local
file — so a repository-root `.env` is read by **neither** package while
`.gitignore` cheerfully ignores it anyway. And `vite.config.ts` cannot see a
`.env` file: Vite loads env files for client code and does not put them on
`process.env`, so a config file that wants them calls `loadEnv()`.

**The type-level half of this boundary is gone, and lint stands where it did.**
`apps/frontend/tsconfig.json` sets an explicit `types: ["vite/client"]`, which
still stops TypeScript auto-discovering every reachable `@types` package. What
it cannot stop is a `/// <reference types="node" />` inside a declaration file
the program already includes — and Task 1.4.5 put `.stories.tsx` under `src/`,
so the program reaches `@storybook/react-vite`, and both
`storybook/internal/node-logger` and Vite's own node build carry one. Measured
with `--explainFiles`, and re-measured in Task 1.6.7: `process`, `Buffer`,
`__dirname` and `import path from "node:path"` all typecheck in browser code at
exit 0.

**State the scope, because it is narrower than it sounds.** `packages/shared` is
intact — re-measured, still TS2591 on `process`, TS2304 on `__dirname`, TS2591
on `Buffer` — because nothing it imports drags the node types in. The leak is
`apps/frontend` only and its cause is the stories. The general rule is that **a
`types` array is only as narrow as the declaration files the program reaches.**

So `eslint.config.mjs` carries a block scoped to `apps/frontend/src/**` with
`no-restricted-globals` over `process`, `Buffer`, `__dirname`, `__filename`,
`global`, `require`, `setImmediate`, `clearImmediate`, and `no-restricted-imports`
over `node:*`. It is verified firing, and it is the only thing standing there,
because both things downstream of tsc are silent: `process.env.SECRET` compiles
to `{}.SECRET` (Vite defines `process.env` as `{}`), and
`import path from "node:path"` **builds at exit 0** with Rolldown externalising
it — a bundle that fails in the browser from a green build.

**The reversal is a separate tsconfig project for the stories**, making it a type
error again. It was not taken because it is a fourth project and a second place
the workshop's build lives.

### 6. No runtime configuration mechanism in the frontend, so one artefact cannot be promoted

Build-time inlining is proved rather than assumed, by §5's literal. The
consequence is a deployment fact and not only a configuration one: **one
frontend artefact cannot be promoted across environments.** A rebuild per
environment is what "distinct configuration for development, test and
production" means on that side.

A config endpoint, an injected `<script>` or a fetched JSON were all rejected
for the same reason: the frontend reads no configuration at all yet, so building
one now is a mechanism with no consumer, designed against a deployment nobody
has chosen. **The reversal trigger is a deployment that needs one artefact in
two environments**, which is a question about the hosting Story 1.11 picks.

Two corollaries of the same shape, both already true: `base` is a build-time
input (ADR 0003), and so is everything Vite substitutes.

### 7. `base` and `basename` are one input with two readers

`<BrowserRouter basename={import.meta.env.BASE_URL}>` in `App.tsx`, and that is
the whole change. Story 1.5 left these as two build-time inputs describing one
fact with nothing connecting them.

**The broken case was reproduced before it was fixed**, on a plain static host
rather than `vite preview`, whose fallback answers everything. At
`base: "/marketpulse/"` with no `basename`: the assets resolve, React boots, the
chrome renders — and the **not-found route renders at the application's own
address**, with zero of the landing route's four region landmarks under a header
that looks entirely healthy.

The half that was not predicted is worse: **every link in the chrome pointed off
the deployment**, `/investigations` rather than `/marketpulse/investigations`,
including the not-found route's own recovery link. There was no screen from
which a user recovers.

`BASE_URL` is **exempt from §5's prefix rule** because it is one of Vite's own
built-ins set from `base`, not a `.env` variable — so this is not a hole in the
boundary and does not need one. Checked in the artefact rather than assumed,
because a `void 0` there would be a `basename` of `undefined` and would look
exactly like the bug: `` basename:`/marketpulse/` `` is a real literal and
`basename:void 0` appears **zero** times.

The trailing-slash convention was checked rather than assumed. Vite normalises
`base` to carry one, React Router strips it, and the rendered links are
`/marketpulse/investigations` rather than `/marketpulse//investigations`. Nothing
here trims a slash.

**Route paths stay in `src/routes/paths.ts` and do not become configuration.**
They are the same in every environment, and they live there as an `as const`
object precisely so `tsc -b` catches a typo. The basename is a deployment fact;
a path is not.

Cost at the default `base`: **+0.01 kB**, and `` basename:`/` `` is what ships.

### 8. The documented variable set is a checked claim, not prose

The smallest decision here and the one with the most durable consequence.

`apps/backend/src/config.ts` exports **`CONFIG_VARIABLES`** — a
`{ key, required, default, description }` table — and `scripts/check-env-example.mjs`
walks it as the `env:check` step of `pnpm verify`. Four checks: every variable
the code reads is documented; every documented entry is read by something; **the
default each optional variable documents equals the one in the code**; and every
name in the frontend example carries the `VITE_` prefix.

The third is the one a grep cannot do and the one that rots first — a changed
default leaves a plausible wrong number rather than a missing line. The fourth is
not a leak check: a non-prefixed name there is a variable that silently never
arrives.

**The rejected alternative is two greps run once**, which is what the task's own
Done-when would have accepted. It was rejected because a check run once keeps
nothing in step, and keeping things in step is the entire reason `CONFIG_VARIABLES`
exists as a table rather than as four inline defaults. The table is deliberately
_beside_ the readers rather than _above_ them: making the readers loop over it
would trade four checked call sites for a generic executor, which is the settings
framework this story exists to resist. What keeps the two in step is that there
are two of them on one screen — and now, that a check fails if they diverge.

All four failure modes were made to fail before the story closed, and re-run in
Task 1.6.7:

```
✗ PORT defaults to "3000" in config.ts but apps/backend/.env.example says "8080".
✗ HOST is read by apps/backend but is not in apps/backend/.env.example.
✗ TIMEOUT_MS is in apps/backend/.env.example but nothing in apps/backend reads it.
✗ API_BASE_URL is in apps/frontend/.env.example without the VITE_ prefix, so it
  would never reach the browser — the read compiles to `void 0`.
```

Named `env:check` and not `env` or `config` because both of those are real
pnpm 11 built-ins, and a root script shadows a built-in repository-wide — which
was right for `clean`, whose built-in deletes `node_modules`, and would be wrong
for two commands that are useful.

**Placement: one example per package, beside the file its loader actually
reads, and no root example.** `apps/backend/.env.example` documents `PORT` and
`HOST`; `apps/frontend/.env.example` documents **nothing**, deliberately —
the frontend reads no configuration yet, and the file exists so that the file
open in front of whoever is about to put an Alpaca key in `apps/frontend/.env`
is the one telling them not to. A root example was rejected on a specific hazard:
`cp .env.example .env` at the root produces a file **no loader reads**, silently,
and the corrected instruction is a copy whose source and destination are in
different directories. `cp apps/backend/.env.example apps/backend/.env` is
self-evidently right.

**And the trap that comes with verifying the gitignore negation:
`git check-ignore -v` does not answer the question it is reached for.** It exits
**0** on a negated path, printing the `!.env.example` rule that matched — so read
as an exit code it says "ignored" for a file that is tracked. Task 1.6.7 narrowed
it further: `check-ignore` skips paths already in the index, so the two _tracked_
examples exit 1 with no output while an _untracked_ one exits 0 printing the
negation — which is precisely the case anyone actually checks, before committing
a new example. `--no-index` makes both print the rule and exit 0. Without `-v`
the exit code means what it looks like, and
`git status --porcelain --ignored=matching` states it outright.

## Rejected, with reasons

| Option                                    | Why not                                                                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Zod 4.5.4                                 | +74.88 kB in a browser bundle, ~19 ms per server start, `NaN` messages that lose the operator's input, `PORT=` parses as port 0 |
| Valibot 1.4.2                             | Cheap (+3.14 kB) and still writes blank-means-absent and the message by hand — a dependency for the parts that were free        |
| `--env-file` / `--env-file-if-exists`     | Exit 9 on a missing file (a fresh clone), or a stderr line on every start; and a flag repeated at two invocation sites          |
| dotenv                                    | A dependency for what `process.loadEnvFile()` does in the runtime the repo already pins                                         |
| `NODE_ENV` / `APP_ENV`                    | A variable with no reader. Nothing branches on the environment                                                                  |
| A frontend runtime config mechanism       | No consumer, and designed against a deployment nobody has chosen                                                                |
| Making the frontend's ports configurable  | 5173 and 4173 reach no deployment at all; both Vite servers are development tools                                               |
| A root `.env.example`                     | `cp .env.example .env` there produces a file no loader reads, silently                                                          |
| Two greps run once, for the example check | Satisfies the wording and keeps nothing in step                                                                                 |
| Readers looping over `CONFIG_VARIABLES`   | Trades four checked call sites for a generic executor — the settings framework this story resists                               |

## Consequences worth stating separately

### The port asymmetry stands, deliberately, and it is two kinds of port

The backend reads `PORT` and `HOST` from the environment. The frontend's 5173
and 4173 are literals in `vite.config.ts` with no override, and that is not an
inconsistency to be tidied. The backend's ports are properties of a **deployed
process**; neither of the frontend's survives into a deployment at all, because
`dist/` is three static files on somebody else's host and both Vite servers are
development tools. A busy 5173 means editing a line, which `strictPort` at least
makes immediate, and Story 1.12's CORS allowlist is pinned to that origin.

**The reversal trigger is two people needing two frontends at once**, and it
would take `loadEnv()` rather than `process.env` — Vite does not put `.env`
entries on the process. Story 1.8 no longer owns this question.

### The accumulator's multi-key path is unreachable with the shipped variables

`loadConfig()` reports every bad key rather than the first, and with `PORT` and
`HOST` that cannot be demonstrated: `readString` never throws, so `HOST` has no
invalid value. Task 1.6.2 demonstrated it with a temporary third variable and no
later task added a permanent one. The behaviour is real and is currently
exercised by a single key; **the first variable with a constrained value —
Story 1.7's `LOG_LEVEL`, most likely — is what makes it visible again**, and is
also what brings `readEnum`.

### `.env.example` is tracked by a negation, and it works at all three locations

Six `.env` / `.env.local` paths report `!!` and the untracked root
`.env.example` reports `??` under `git status --porcelain --ignored=matching`;
the two tracked examples are clean tracked files, which is the answer. The
frontend's location had never been checked before Task 1.6.6.

### A `VITE_` prefix is a boundary against accidents, not a permission

Prefixing a credential does not make it safe. It makes it a string literal in a
file every visitor downloads. Market-data and LLM credentials are server-side
only, without exception: the browser talks to the MarketPulse backend, never
directly to Alpaca or a model provider. That rule is written into
`apps/frontend/.env.example` and `README.md`'s `## Configuration` section,
because those are the two places somebody is looking when they are about to
break it.

### A stated invariant is not a checked one

This is the finding in the story that generalises furthest, and it belongs in
Story 1.10's "know what `pnpm verify` does not cover" bullet in a form that is
not the obvious one. The gaps that bullet already lists — `scripts/dev.sh`, the
`rm -rf` fragments in two `clean` scripts — are **files no tool reads**. This one
was a file every tool read, and a guarantee that had quietly stopped being
enforced: `apps/frontend`'s explicit `types` array was described in three
documents as making `process` a compile error in browser code, and it stopped
doing so in Task 1.4.5 and stayed wrong for two stories. Nothing found it except
a task whose Done-when said to re-measure rather than to cite.

The two mechanisms this story added in response are §8's `env:check` and §5's
lint block. Both exist because the corresponding claim had already decayed once.

### Two figures in `CLAUDE.md` were wrong and are corrected here

Re-measuring the workshop artefact from a clean tree gives **289 modules across
52 files, 9.2 MB on disk**, where Task 1.5.6 recorded 227 modules, 50 files and
7.4 MB. Story 1.6 changed none of it: the tree at Story 1.5's close, built in a
worktree with its own lockfile, gives the identical 289 / 52 / 9.2 MB. The size
discrepancy is a unit — 9.2 MB on disk is **7.3 MB apparent**, and 7.4 was the
apparent figure. The module and file counts were simply mis-recorded. Recorded
rather than silently overwritten, because the point of the re-measurement rule
is that copied figures are how this happens.

## Measured

Every figure below is from a clean tree on 2026-08-31 —
`pnpm clean && pnpm install && pnpm verify` — not from a warm one.

| Stage                              | Modules | JS            | CSS     | Files |
| ---------------------------------- | ------- | ------------- | ------- | ----- |
| Pre-story baseline (`b244f15`)     | 265     | 342.00 kB     | 9.82 kB | 3     |
| Task 1.6.4 — the frontend boundary | 265     | 342.00 kB     | 9.82 kB | 3     |
| Task 1.6.5 — `basename`            | 265     | **342.01 kB** | 9.82 kB | 3     |
| Task 1.6.6 — the example files     | 265     | 342.01 kB     | 9.82 kB | 3     |

The whole story is **+0.01 kB**, on unchanged module and file counts. The
stylesheet's content hash (`index-FpotQPsC.css`) is **byte-identical across the
entire story**; only the JavaScript hash moved, and only in Task 1.6.5. That is
the expected result and it was worth confirming rather than assuming: §1
measured what a validator would have cost here, and a meaningful growth would
have meant something had imported one.

Note the baseline is **342.00 kB and not ADR 0005's 342.08 kB** — commit
`b244f15` landed after Story 1.5 closed and dropped `Placeholder`'s
single-valued `label` prop. The 0.08 kB is not this story's, and it was rebuilt
in a worktree at that commit rather than taken from a document.

`pnpm verify` exits 0 in **9.3–9.8s** from a clean tree, against ADR 0005's
11.0s — and the comparison is not like for like, because the chain is six steps
now rather than five:

| Step           | This story | ADR 0005 |
| -------------- | ---------- | -------- |
| `build`        | 3.60s      | 3.2s     |
| `lint`         | 2.98s      | 2.9s     |
| `format:check` | 1.87s      | 1.6s     |
| `stories`      | 0.26s      | 0.25s    |
| `env:check`    | **0.26s**  | —        |
| `test`         | 0.47s      | 0.45s    |

The new step costs **0.26s** and the chain got faster, which is run-to-run
variance rather than an improvement. The cold `build` splits `tsc -b` 1.53s /
`vite build` 0.45s / `storybook build` 1.33s. `env:check` imports the backend's
**built** `dist/config.js`, so it is — with `stories` — one of the steps that
depends on `build` having run; standalone on a clean tree it says
``run `pnpm build` first`` rather than throwing a resolver error.

Configuration failure paths, re-run rather than cited:

| Input                             | Result                                                                     |
| --------------------------------- | -------------------------------------------------------------------------- |
| `PORT=nonsense`                   | `PORT must be an integer between 1 and 65535, received "nonsense"`, exit 1 |
| `PORT=70000`                      | Same message quoting `"70000"`, exit 1                                     |
| `PORT=3000x`                      | Same message quoting `"3000x"`, exit 1 — `Number()`, not `parseInt()`      |
| No `.env` at all                  | Listens on `127.0.0.1:3000`, silently                                      |
| `PORT=` blank in `.env`           | Listens on **3000**, not port 0                                            |
| File `PORT=4010`, no env var      | Listens on 4010                                                            |
| File `PORT=4010`, env `PORT=4020` | Listens on **4020** — the real variable wins                               |
| File `PORT=4020`, env `PORT=4010` | Listens on **4010** — same rule, other way round                           |

Ports confirmed with `lsof` on the listening process rather than from Fastify's
startup line, which rewrites `0.0.0.0` to `127.0.0.1`.

The secrets boundary, both artefacts, with a realistic secret planted and then
removed:

| Artefact            | Emitted read                                                         | Secret value | Name `ALPACA` |
| ------------------- | -------------------------------------------------------------------- | ------------ | ------------- |
| `dist/`             | ``console.log(`probe`,void 0,`https://api.marketpulse.example/v1`)`` | 0 files      | 0 files       |
| `storybook-static/` | identical                                                            | 0 files      | 0 files       |

The subpath deployment, built at `base: "/marketpulse/"` and served from outside
the workspace two ways — a plain `python3 -m http.server`, and the smallest
correct fallback, scoped to the subpath and declining to rewrite anything whose
last segment contains a dot:

| Request                       | Plain host | Scoped fallback |
| ----------------------------- | ---------- | --------------- |
| `/marketpulse/`               | 200        | 200             |
| `/marketpulse/investigations` | **404**    | 200             |
| `/marketpulse/securities`     | **404**    | 200             |
| `/marketpulse/replay`         | **404**    | 200             |
| `/marketpulse/nonsense`       | **404**    | 200             |
| `/marketpulse/assets/nope.js` | 404        | **404**         |
| `/other/`                     | —          | **404**         |

Deep-loaded cold on the fallback host, `/marketpulse/replay` renders Market
Replay with `aria-current` set and the page ground computed as
`rgb(244, 243, 238)` — the whole cascade arrived under the subpath.
`/marketpulse/` renders Market Overview with all four region landmarks, and the
chrome's links read `/marketpulse/`, `/marketpulse/investigations`,
`/marketpulse/securities`, `/marketpulse/replay`. `/marketpulse/nonsense`
renders `No such page` with its recovery link reading `/marketpulse/` rather
than `/`.

**Deep-linking remains a property of the host**, which is Task 1.5.5's finding
unchanged and Story 1.11's to configure; `basename` does not touch it and was
never going to. That server is scratch and is not committed. It exists because
Story 1.11's "the rewrite must not be a blanket catch-all" constraint now has a
worked example behind it rather than only a warning.

The node-types boundary, re-measured in both packages:

| Package           | `process`      | `__dirname`    | `Buffer`       |
| ----------------- | -------------- | -------------- | -------------- |
| `packages/shared` | TS2591         | TS2304         | TS2591         |
| `apps/frontend`   | **typechecks** | **typechecks** | **typechecks** |

and in `apps/frontend`, ESLint reports both as `no-restricted-globals` errors
naming `envPrefix` and the server-only rule.

## Related

- [ADR 0002](0002-backend-framework-and-server-composition.md) — `buildServer()`
  keeping process concerns out of the application, which is the same separation
  §2 applies to `loadConfig()`
- [ADR 0003](0003-frontend-build-tooling-and-browser-baseline.md) — the
  build-time `base` finding §6 and §7 are the continuation of, and the
  `vite preview` fallback that makes both untestable there
- [ADR 0005](0005-routing-application-layout-and-the-deployable-shape.md) — the
  router §7 wires a basename into, and the deep-linking constraint it inherits
- `planning/epic-01-application-foundation/story-06-configuration-and-environment-handling/`
  — the seven task records, each carrying the measurements this document
  summarises
- Story 1.7 owns `LOG_LEVEL`, `readEnum` and §4's reversal trigger; Story 1.9
  owns test configuration; Story 1.11 owns the host fallback and the promotion
  constraint; Story 1.12 brings the first real frontend variable
