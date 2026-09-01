# MarketPulse

AI-assisted situational awareness for US equities. MarketPulse detects
statistically unusual market behaviour and lets a human — or an AI agent —
investigate it against primary-source evidence.

It is explicitly **not** a trading system. It never predicts prices,
recommends trades, or produces target prices.

`planning/PRODUCT_SPEC.md` is the authoritative product definition.
`planning/EPICS.md` is the delivery roadmap.

## What exists today

**Epic 1, Stories 1.1, 1.2, 1.3, 1.4 and 1.5 complete — the repository, its
toolchain, a backend, a frontend, a design-token layer, a component workshop,
and now navigation and the application layout.**

`apps/backend` is a running Fastify service. It starts on a configurable port,
serves `GET /health`, restarts on source change, and shuts down cleanly on
`SIGTERM`/`SIGINT`:

```sh
pnpm build
pnpm --filter @marketpulse/backend start     # or `dev` for the watch loop
curl http://127.0.0.1:3000/health
# {"status":"ok","version":"0.0.0","uptimeSeconds":0.129}
```

`PORT` and `HOST` configure it (defaults 3000 and 127.0.0.1) — see
[Configuration](#configuration). It is a skeleton in scope rather than in
status: no market data, no database, no domain logic.

`apps/frontend` is a React 19 application built with Vite. It renders the
application chrome and four routes, reloads edited components without losing
their state — a stylesheet edit in 24–130 ms, a component edit in a few hundred
— and builds to static assets:

```sh
pnpm --filter @marketpulse/frontend dev      # http://localhost:5173
pnpm build
pnpm --filter @marketpulse/frontend preview  # http://localhost:4173
```

It is a shell in scope rather than in status: no state management, and it does
not talk to the backend yet (Story 1.12). It **does** have a styling system and
an application shape — see below. What it does prove is that the toolchain
works end to end — `@marketpulse/shared` resolves through the bundler as well as through
`tsc`, and the built `dist/` renders from a plain static server with no
`package.json` and no `node_modules` beside it.

So `pnpm dev` now starts a running pair. Getting a **clean clone** to that pair
by following this file alone is Story 1.8's criterion rather than a claim made
here; what has been verified is that a clean clone installs, verifies and
builds an identical bundle.

The browser baseline is **evergreen desktop** — current Chrome, Edge, Firefox
and Safari — expressed as ES2024 in two places that must agree: `target` in
`apps/frontend/tsconfig.json` and `build.target` in `vite.config.ts`. See
[ADR 0003](docs/adr/0003-frontend-build-tooling-and-browser-baseline.md).

## Prerequisites

**Node 24.x.** Not "24 or later", and not a minimum — `engineStrict` is on, so
pnpm refuses to install under any other major rather than warning. The exact
version is in `.nvmrc` (24.20.0); `nvm use` or `fnm use` will pick it up.

Node 23 in particular cannot bootstrap this repository at all. The Corepack it
bundles (0.29.4) has a stale npm signing keyset and fails to fetch the pinned
pnpm with `Cannot find matching keyid`. That is a hard stop, not a warning.

**Corepack**, which ships with Node:

```sh
corepack enable
```

Once per machine. pnpm comes from the `packageManager` pin in `package.json`,
not from a global install — so do not `npm install -g pnpm`; the pin is what
guarantees everyone runs the same pnpm.

## Setup

```sh
git clone git@github.com:theSmaw/marketpulse.git
cd marketpulse
corepack enable          # once per machine
pnpm install
pnpm verify
```

`pnpm verify` is the whole acceptance check: `build && lint && format:check &&
stories && env:check && test`, in that order, stopping at the first failure.
(`stories` fails if a component has no stories file — see
[The component workshop](#the-component-workshop); `env:check` fails if the
`.env.example` files and the code have drifted apart — see
[Configuration](#configuration).) It is what CI will run (Story 1.10). On a
clean checkout it takes a few seconds and exits 0.

If `pnpm install` fails complaining about a dependency's install scripts, see
[Install-script policy](#install-script-policy) below — the fix is to
allowlist that one package, never to disable the check.

## Commands

Run from the repository root:

| Command             | What it does                                                          |
| ------------------- | --------------------------------------------------------------------- |
| `pnpm verify`       | `build && lint && format:check && stories && env:check && test` — CI  |
| `pnpm build`        | `tsc -b` over the solution, then the frontend bundle, then Storybook  |
| `pnpm typecheck`    | The same command as `build`, deliberately — see below                 |
| `pnpm lint`         | `eslint .` over the whole workspace in one process                    |
| `pnpm lint:fix`     | The same, with `--fix`                                                |
| `pnpm format`       | `prettier --write .` — the whole tree, prose included                 |
| `pnpm format:check` | `prettier --check .`                                                  |
| `pnpm stories`      | Fails if a component has no stories file                              |
| `pnpm env:check`    | Fails if `.env.example` and the configuration module disagree         |
| `pnpm test`         | Placeholders until Story 1.9 — see the warning below                  |
| `pnpm dev`          | Every package's `dev`, in parallel — see below                        |
| `pnpm clean`        | `tsc -b --clean`, plus the frontend's `dist/` and `storybook-static/` |

Working on a single package uses the same six verbs, meaning the same thing:

```sh
pnpm --filter @marketpulse/shared build      # or typecheck / lint / lint:fix / test
pnpm --filter @marketpulse/shared dev        # tsc -b --watch
pnpm --filter @marketpulse/shared run clean  # note the `run` — see below
```

Every package exposes `dev`, `build`, `test`, `lint`, `typecheck` and `clean`.
`lint:fix` is an extra rather than part of the convention — a local convenience
with no root fan-out and no place in `verify`.

Two more extras have exactly that status, one per app:

```sh
pnpm --filter @marketpulse/backend start          # node dist/index.js
pnpm --filter @marketpulse/frontend preview       # serves dist/ on :4173
pnpm --filter @marketpulse/frontend storybook     # the workshop, on :6006
pnpm --filter @marketpulse/frontend storybook:build  # static build into storybook-static/
```

None is a seventh verb: no root fan-out, no place in `verify`, and
`packages/shared` is not obliged to have one. Both exist because "production
build emits runnable output" needs a documented way to run it, and **both run
the already-built output and build nothing themselves** — so `pnpm build`
first, or an empty or stale `dist/` gives you a missing server and a stale
page.

One warning about `preview`, because it is easy to mistake for a static host.
Its SPA fallback answers _any_ unmatched path with `index.html` and a 200 — a
**missing asset** included, which then arrives in the browser as a MIME-type
error rather than a 404 naming the file. It is the right way to look at a
production build and the wrong way to prove one works.

**`clean` is the one verb that needs an explicit `run` when filtered.**
`pnpm clean` is also a built-in pnpm 11 command (alias `purge`) that removes
`node_modules` from every workspace project, and pnpm only prefers a `clean`
script when the current project has one. The root does, so `pnpm clean` runs
`tsc -b --clean` as documented — but `pnpm --filter <pkg> clean` reaches the
built-in and fails with `[ERROR] Unknown option: 'recursive'`. It deletes
nothing; add `run` and it works.

One more thing `clean` does not do: `tsc -b --clean` removes the output of the
sources that currently exist, so deleting a source file first orphans its
`dist/` output permanently. Clean before deleting a file, or remove its output
by hand afterwards.

That trap does not reach `apps/frontend`, whose `dist/` is Vite's rather than
tsc's. Its `clean` is `tsc -b --clean && rm -rf dist`, and `rm -rf` is
content-blind — it does not care which sources exist. The root's `clean` has
the same second half for the same reason.

### `pnpm test` does not yet do what its name suggests

**A green `pnpm test` means "no tests exist", not "tests pass."** All three
packages' `test` scripts are `echo` placeholders that exit 0, until Story 1.9
brings a test runner. Story 1.10 will put that green tick in CI, where it will
look exactly like passing coverage. It is not.

### What `pnpm dev` does at the root

Three real dev loops, with no placeholders left anywhere.
`packages/shared` sits in
`tsc -b --watch --preserveWatchOutput`, the right dev loop for a package whose
consumers compile against its emitted declarations; `apps/backend` runs
`scripts/dev.sh`, which pairs its own `tsc -b --watch` with
`node --watch dist/index.js`; and `apps/frontend` runs `vite`. Output is
prefixed per package, so the server's JSON log lines arrive as
`apps/backend dev: {...}`.

Edit a backend source file and the server restarts in about a second — tsc
emits, `node --watch` notices `dist/` changed, the old process drains and the
new one listens. Edit a frontend component and the change is in the browser in
about 100 ms with the component's state intact. Ctrl-C stops everything and
leaves no orphaned process and no held port.

**A clean Ctrl-C is noisy, and the noise is not a failure.** pnpm reports each
interrupted watcher as `Failed`, prints
`[ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL] ... Command failed with signal "SIGINT"`,
and adds a spurious `Local package.json exists, but node_modules missing`
warning on the way out. Nothing is wrong and nothing is missing; that is what
shutting down three watchers at once looks like.

**Both frontend servers listen on IPv6 loopback and the backend listens on
IPv4.** `curl http://localhost:5173/` works and `curl http://127.0.0.1:5173/`
is connection-refused; `apps/backend` defaults to `127.0.0.1` and is the
reverse. Both are "localhost" to a browser and are not to a script.

Two more things worth knowing before they surprise you. Editing
`apps/backend/package.json` restarts the server, because the health route
imports it for `version` — so **adding a dependency bounces the dev server**.
And a Ctrl-C prints the server's own `signal received` / `shutdown complete`
lines; silence on the way out is the symptom, not the normal case.

The frontend dev server has a failure mode of its own: **it does not
typecheck.** A type error is applied as an ordinary hot update — no overlay, no
console error, state preserved — and is caught only by your editor or
`pnpm verify`. A syntax error, by contrast, fails loudly and leaves the page on
its last good render.

### `typecheck` and `build` are the same command

Both are `tsc -b`, at the root and in all three packages. That is not a
copy-paste error. Packages are consumed as TypeScript project references
**with built output**, so a consumer compiles against
`packages/shared/dist/*.d.ts` — typechecking this workspace _is_ building it,
and there is no cheaper correct pass. Both names are kept so they can diverge
later without a rename.

The consequence worth knowing: `packages/shared` must be built before anything
that imports it can be typechecked. `tsc -b` handles that ordering itself, and
`verify` builds first. See
[ADR 0001](docs/adr/0001-repository-structure-and-typescript-toolchain.md) for
why a per-package `tsc --noEmit` is the wrong instrument here.

## Configuration

Both packages read configuration from a `.env` file **beside their own
`package.json`**, and each ships a documented example:

```sh
cp apps/backend/.env.example apps/backend/.env    # PORT, HOST, LOG_LEVEL, LOG_FORMAT
cp apps/frontend/.env.example apps/frontend/.env  # nothing to set yet
```

Copy the destination as written. A `.env` at the repository root is read by
**neither** package — the backend resolves its file from the configuration
module rather than from the working directory, and the frontend's `envDir` is
its own package root. Both are deliberate, and the failure is silent: the file
exists, nothing reads it, and the application starts on defaults as if it were
not there.

**You do not need either file to run MarketPulse.** Every backend variable has
a default, and a missing `.env` is swallowed rather than reported — a fresh
clone starts on port 3000 and `127.0.0.1` with no file at all. That silence is
deliberate (a container has no file by design) and is documented here precisely
because it is silent.

A real environment variable **beats** an entry in the file:

```sh
PORT=4020 pnpm --filter @marketpulse/backend start   # 4020, whatever .env says
```

A blank value is treated as absent rather than as an empty string, so `PORT=`
gives 3000 rather than "any free port". Anything invalid fails at startup
naming both the key and the value it was given, before the server binds:

```
PORT must be an integer between 1 and 65535, received "nonsense"
```

Every bad key is reported, not just the first:

```
PORT must be an integer between 1 and 65535, received "nope"
LOG_LEVEL must be one of fatal, error, warn, info, debug, trace, silent, received "INFO"
```

### Logging

The server logs structured JSON through Fastify's built-in pino. Two variables
configure it, and neither changes what is in a record — only the severity floor
and how the record is rendered:

| Variable     | Values                                                 | Default |
| ------------ | ------------------------------------------------------ | ------- |
| `LOG_LEVEL`  | `fatal` `error` `warn` `info` `debug` `trace` `silent` | `info`  |
| `LOG_FORMAT` | `json` `pretty`                                        | `json`  |

`pnpm dev` sets `LOG_FORMAT=pretty` for you, because that is the loop with a
human reading it. Everything else — `pnpm --filter @marketpulse/backend start`,
a container, CI — gets JSON, and a real environment variable still wins, so
`LOG_FORMAT=json pnpm dev` gives JSON in the dev loop.

Two behaviours worth knowing before you set either:

- **At `warn` and above a healthy server is completely silent**, including its
  `Server listening at …` line. Nothing in a normal run emits above `info`.
- **`silent` means silent**, errors included. It exists for a test runner
  driving `buildServer()` under `app.inject()`. Anything waiting on the
  readiness line to decide the server is up will wait forever.

`LOG_LEVEL=debug` currently shows nothing that `info` does not — Fastify's
request logging is at `info` and nothing in this application emits below it yet.

#### The correlation id

Every response carries an `x-request-id` header, and the same value is the
`reqId` on every log record for that request. Quote the header from a failure
and the log entry is one grep away:

```
$ curl -si http://127.0.0.1:3000/health | grep -i x-request-id
x-request-id: 670a0de7-1783-44b2-a59e-d0ce84fce79b
```

```
{"level":30,...,"reqId":"670a0de7-1783-44b2-a59e-d0ce84fce79b","req":{"method":"GET","url":"/health"},"msg":"incoming request"}
{"level":30,...,"reqId":"670a0de7-1783-44b2-a59e-d0ce84fce79b","res":{"statusCode":200},"responseTime":5.35,"msg":"request completed"}
```

The header is on **every** response, including 404s and 500s that no route code
produced. `responseTime` is fractional milliseconds over the request lifecycle.

**You may send your own `x-request-id` and it will be honoured**, provided it
matches `[A-Za-z0-9_-]{1,128}`. Anything else — a longer value, a space, a
quote, or the same header sent twice — is dropped without comment and a fresh
UUID is minted, so the id in the response is the authoritative one either way.
Read it back rather than assuming the value you sent was used.

A request record carries the correlation id, the method and the URL, and the
response record the status and the duration. Client address and port are
deliberately not logged: behind a proxy they would be the proxy's, so they would
be wrong rather than missing. No request header is logged at all, which is what
keeps an `Authorization` out of the log.

**The resolved configuration is never logged**, and that is a rule rather than
an oversight. Epic 2's Alpaca credentials and Epic 10's model-provider key
become keys on that object, and a startup line dumping it is how one reaches a
log aggregator. Log the individual non-secret value where it matters instead.

### Secrets live on the server, without exception

Market-data and model-provider credentials belong in `apps/backend/.env` and
nowhere else. The browser talks to the MarketPulse backend; it never talks to
Alpaca or to a model provider directly, so no credential ever needs to reach
`apps/frontend`. Epic 2 brings the first of them.

Only `VITE_`-prefixed names reach the browser (`envPrefix` in
`vite.config.ts`). Everything else is not merely withheld — the read is
substituted away at build time, so `import.meta.env.SOMETHING` compiles to
`void 0` and neither the value nor the name appears anywhere in `dist/`. The
Storybook build behaves the same way, which matters because `pnpm build`
produces `storybook-static/` too.

A `VITE_` prefix is a boundary against accidents, not a permission. Prefixing a
credential makes it a string literal in a file every visitor downloads.

### `pnpm env:check`

A step in `pnpm verify`. It walks `CONFIG_VARIABLES` in
`apps/backend/src/config.ts` and fails if a variable the code reads is missing
from `apps/backend/.env.example`, if the example documents one nothing reads,
if a documented default no longer matches the code, or if a name in
`apps/frontend/.env.example` lacks the `VITE_` prefix. Adding a variable to the
code and not to the example is a failing build rather than stale documentation.

`.env` and `.env.*` are gitignored; `.env.example` is negated back in. Verified
in place at both package roots and the repository root — the six `.env` /
`.env.local` files show as ignored and an example file does not, at every one of
the three locations. There are **two** `.env.example` files, one per package;
there is deliberately no root one, because `cp .env.example .env` there would
produce a file no loader reads.

Check it with `git status --porcelain --ignored=matching` rather than with
`git check-ignore`, which does not answer the question: `-v` exits **0** on a
negated path, printing the `!.env.example` rule, so it reads as "ignored" for a
file that is not.

## Styling and design tokens

CSS Modules over CSS custom properties, with **Base UI** (`@base-ui/react`)
supplying behaviour for anything interactive. There is no CSS-in-JS: styles are
resolved at build time and shipped as one stylesheet, currently 9.82 kB for the
whole design language, the chrome and the layout. The reasoning is in
[ADR 0004](docs/adr/0004-styling-approach-component-library-and-the-component-workshop.md).

```
apps/frontend/src/styles/
  tokens.css    structure — surfaces, ink, rules, spacing, type. Achromatic
  market.css    the palette, and the market semantics over it. The only
                colour in the application that means anything
  base.css      color-scheme, the page ground, default type, tabular
                figures, and the one focus rule
  tokens.ts     typed read-once access, for consumers that are not React
```

Four things to know before writing a component.

- **CSS is the source of truth for tokens.** `tokens.ts` reads them once at
  startup and freezes the result; it does not define them. Every value comes
  back as a string
- **Compose class names with `cx()`**, from `src/cx.ts` —
  `cx(styles.row, styles.negative)`. The template-literal form and the
  `styles["row"]` form are both lint errors, and a **misspelled class name is
  silent**: it typechecks, builds and renders unstyled
- **Colour is never the only signal.** Price direction also carries an arrow
  and a sign, an anomaly band carries its name inside the fill, and a feed
  state carries the shape of its marker. Under greyscale the positive green and
  the negative red are 1.05:1 apart, which is no difference at all — so use the
  components rather than the tokens directly
- **Focus belongs to `base.css`.** There is one global `:focus-visible` rule;
  a component does not add its own

The application renders in a light theme, set as `data-theme="light"` on the
document element. A second palette would be a values-only change to the
themeable block in `tokens.css` — the mechanism ships, the palette does not.

## The component workshop

Components are developed and reviewed in isolation, in Storybook:

```sh
pnpm --filter @marketpulse/frontend storybook   # http://localhost:6006
```

Every component under `apps/frontend/src/components/` lives in a directory of
its own with its stylesheet and its stories beside it, and ships:

- one named story per discrete state, and
- one `AllPermutations` story rendering the cartesian product of its variant
  props in a labelled grid, so completeness is reviewed in one frame rather than
  by clicking down the sidebar.

`pnpm stories` — a step in `pnpm verify` — fails if a component file has no
sibling `.stories.tsx`. It proves the file exists and nothing more: whether the
stories inside it actually cover the permutations is a review question, and the
check says so in its own header.

The a11y panel runs axe against each story and reports; it does not fail the
build. `pnpm build` also produces a static Storybook into
`apps/frontend/storybook-static/`, which serves from any dumb static host.

## Routing and layout

Four routes for the four experiences in `PRODUCT_SPEC.md` §8, plus a not-found
route, using **React Router 8** in declarative mode — a library import, with no
plugin and no build step. The reasoning is in
[ADR 0005](docs/adr/0005-routing-application-layout-and-the-deployable-shape.md).

```
/                 Market Overview — the landing route, and the only one with regions
/investigations   Investigation Workspace
/securities       Security Explorer
/replay           Market Replay
anything else     a not-found route, with the chrome intact
```

The chrome — product name, market feed, a reserved market clock, the navigation
— is `components/AppHeader`, rendered once outside the route table so it
survives navigation rather than being remounted by it.

Two conventions worth knowing before adding a route:

- **Every path is declared once, in `apps/frontend/src/routes/paths.ts`.** Add
  it there and read it from both the `<Route path>` and the `to=`. React
  Router's `to` is an unchecked string, so a hand-written literal is a link
  that fails silently; the table is what turns a typo into a compile error
- **Route modules live in `src/routes/`, not `src/components/`.** A `.tsx`
  under `components/` owes a stories file and `pnpm stories` enforces it. The
  test for which side something belongs on is _does it have states worth
  reviewing side by side?_

**Deploying under a subpath is one edit and a rebuild.** Set `base` in
`vite.config.ts`; `<BrowserRouter basename>` reads `import.meta.env.BASE_URL`,
which Vite sets from `base`, so the router moves with the assets and the two
cannot desynchronise. It used to be two edits, and getting only the first
produced an application that loaded perfectly and then rendered the not-found
route at its own address, with every navigation link pointing off the
deployment. Route paths are not part of this — the basename is a deployment
fact and `paths.ts` is not configuration.

**Deep-linking works locally for a reason that will not survive deployment.**
`/replay` typed straight into the address bar works against `vite`, `vite
preview` and nothing else — both answer any unmatched path with `index.html`
and a 200. The same build served by a plain static host **404s** every route
but `/`, and the not-found route rests on exactly the same property: it can
only render if the host served `index.html` for the address that matched
nothing. A history-API fallback is a hosting concern and Story 1.11 owns it.
When it is configured, it must not be a blanket catch-all — one that answers
_every_ unmatched path with `index.html` answers a missing asset that way too.

## Layout

```
apps/
  backend/     @marketpulse/backend  — Fastify service (Story 1.2)
  frontend/    @marketpulse/frontend — React + Vite application (Story 1.3)
packages/
  shared/      @marketpulse/shared   — domain types shared by both apps
scripts/       root tooling scripts run by `pnpm verify`
docs/
  adr/         architecture decision records
planning/      product spec, epic roadmap, stories and tasks
```

Configuration lives at the root and only at the root: one `tsconfig.base.json`,
one `eslint.config.mjs`, one `prettier.config.mjs`. ESLint, Prettier and
TypeScript are root-only devDependencies; packages declare only what they
actually import.

The test that decides where a dependency goes is "does the package's source
`import` it?", and it gives a counter-intuitive answer for Storybook: story
files import `@storybook/react-vite`, so Storybook itself is a **frontend**
devDependency, while `eslint-plugin-storybook` is a tool and sits at the root
beside the config it extends.

pnpm's own settings live in `pnpm-workspace.yaml`, **not `.npmrc`**. pnpm 10
moved them, and pnpm 11 silently ignores workspace settings left in `.npmrc` —
so a setting that appears to have no effect is probably in the wrong file.

## Install-script policy

Dependencies do not get to execute code at install time unless someone names
them. pnpm runs a dependency's install scripts only if it appears in
`allowBuilds` in `pnpm-workspace.yaml`, and an un-allowlisted one is a **hard
install failure**, not a warning.

`allowBuilds` was empty until Storybook arrived. It now has exactly one entry,
`esbuild`, which Storybook depends on directly and whose install script fetches
the platform binary it cannot ship in one package.

The failure it produced first is worth recognising, because it edits a tracked
file:

```
[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: esbuild@0.28.2
```

`pnpm install` exits 1, and pnpm appends an `esbuild: set this to true or false`
stub to `pnpm-workspace.yaml`. A dirty workspace file after a failed install is
pnpm's edit, not yours — replace the stub with `true` or `false` and say why.

Note this is **not** Vite's esbuild: Vite 8 is the Rolldown release and lists
esbuild only as an optional peer. A sweep of the installed tree finds esbuild is
still the only package here with an install script.

The rule is unchanged for the next one: allowlist that specific package by name
— never disable the check.

## Editor setup

None required. `.editorconfig` covers indentation, charset and line endings in
any editor that reads it; WebStorm additionally gets `.idea/prettier.xml`
checked in, with format-on-save enabled against the same `prettier.config.mjs`
the CLI uses. VS Code users want the Prettier extension and nothing else.

## Documentation

- [`docs/adr/`](docs/adr/) — architecture decision records, newest last;
  [0006](docs/adr/0006-configuration-and-the-secrets-boundary.md) is the most
  recent and covers configuration, the three environments and the boundary
  between a value the browser may have and one that never leaves the server
- [`planning/PRODUCT_SPEC.md`](planning/PRODUCT_SPEC.md) — the authoritative
  product definition
- [`planning/EPICS.md`](planning/EPICS.md) — the delivery roadmap
- [`CLAUDE.md`](CLAUDE.md) — working notes for AI coding agents; also the
  fastest description of the repository's sharp edges for a human
