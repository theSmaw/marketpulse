# MarketPulse

AI-assisted situational awareness for US equities. MarketPulse detects
statistically unusual market behaviour and lets a human — or an AI agent —
investigate it against primary-source evidence.

It is explicitly **not** a trading system. It never predicts prices,
recommends trades, or produces target prices.

`planning/PRODUCT_SPEC.md` is the authoritative product definition.
`planning/EPICS.md` is the delivery roadmap.

## What exists today

**Epic 1, Stories 1.1, 1.2 and 1.3 complete, and Story 1.4 all but complete —
the repository, its toolchain, a backend, a frontend, a design-token layer and a
component workshop.**

`apps/backend` is a running Fastify service. It starts on a configurable port,
serves `GET /health`, restarts on source change, and shuts down cleanly on
`SIGTERM`/`SIGINT`:

```sh
pnpm build
pnpm --filter @marketpulse/backend start     # or `dev` for the watch loop
curl http://127.0.0.1:3000/health
# {"status":"ok","version":"0.0.0","uptimeSeconds":0.129}
```

`PORT` and `HOST` configure it (defaults 3000 and 127.0.0.1). It is a skeleton
in scope rather than in status: no market data, no database, no domain logic.

`apps/frontend` is a React 19 application built with Vite. It renders a
placeholder shell, reloads edited components in about 100 ms without losing
their state, and builds to static assets:

```sh
pnpm --filter @marketpulse/frontend dev      # http://localhost:5173
pnpm build
pnpm --filter @marketpulse/frontend preview  # http://localhost:4173
```

It is a shell in scope rather than in status: no routing (Story 1.5), no state
management, and it does not talk to the backend yet (Story 1.12). It **does**
have a styling system — CSS Modules over CSS custom properties, with design
tokens, market semantics and five components (Story 1.4). What it does prove is that the toolchain works end to
end — `@marketpulse/shared` resolves through the bundler as well as through
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
stories && test`, in that order, stopping at the first failure. (`stories` fails
if a component has no stories file — see [The component workshop](#the-component-workshop).) It is what CI will run
(Story 1.10). On a clean checkout it takes a few seconds and exits 0.

If `pnpm install` fails complaining about a dependency's install scripts, see
[Install-script policy](#install-script-policy) below — the fix is to
allowlist that one package, never to disable the check.

## Commands

Run from the repository root:

| Command             | What it does                                                          |
| ------------------- | --------------------------------------------------------------------- |
| `pnpm verify`       | `build && lint && format:check && stories && test` — the CI command   |
| `pnpm build`        | `tsc -b` over the solution, then the frontend bundle, then Storybook  |
| `pnpm typecheck`    | The same command as `build`, deliberately — see below                 |
| `pnpm lint`         | `eslint .` over the whole workspace in one process                    |
| `pnpm lint:fix`     | The same, with `--fix`                                                |
| `pnpm format`       | `prettier --write .` — the whole tree, prose included                 |
| `pnpm format:check` | `prettier --check .`                                                  |
| `pnpm stories`      | Fails if a component has no stories file                              |
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

- [`docs/adr/`](docs/adr/) — architecture decision records, newest last
- [`planning/PRODUCT_SPEC.md`](planning/PRODUCT_SPEC.md) — the authoritative
  product definition
- [`planning/EPICS.md`](planning/EPICS.md) — the delivery roadmap
- [`CLAUDE.md`](CLAUDE.md) — working notes for AI coding agents; also the
  fastest description of the repository's sharp edges for a human
