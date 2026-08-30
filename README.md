# MarketPulse

AI-assisted situational awareness for US equities. MarketPulse detects
statistically unusual market behaviour and lets a human — or an AI agent —
investigate it against primary-source evidence.

It is explicitly **not** a trading system. It never predicts prices,
recommends trades, or produces target prices.

`planning/PRODUCT_SPEC.md` is the authoritative product definition.
`planning/EPICS.md` is the delivery roadmap.

## What exists today

**Epic 1, Stories 1.1 and 1.2 — the repository, its toolchain, and a backend.**

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

`apps/frontend` is still a typed skeleton that imports from
`@marketpulse/shared` and nothing more; the React application arrives in
Story 1.3. So the instructions below get you to a working backend and a
repository that installs, builds, lints, formats and typechecks — not yet to a
running _application_. When they do, this section is the first thing that
should change.

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
test`, in that order, stopping at the first failure. It is what CI will run
(Story 1.10). On a clean checkout it takes a few seconds and exits 0.

If `pnpm install` fails complaining about a dependency's install scripts, see
[Install-script policy](#install-script-policy) below — the fix is to
allowlist that one package, never to disable the check.

## Commands

Run from the repository root:

| Command             | What it does                                               |
| ------------------- | ---------------------------------------------------------- |
| `pnpm verify`       | `build && lint && format:check && test` — the CI command   |
| `pnpm build`        | `tsc -b` over the solution; builds `packages/shared` first |
| `pnpm typecheck`    | The same command as `build`, deliberately — see below      |
| `pnpm lint`         | `eslint .` over the whole workspace in one process         |
| `pnpm lint:fix`     | The same, with `--fix`                                     |
| `pnpm format`       | `prettier --write .` — the whole tree, prose included      |
| `pnpm format:check` | `prettier --check .`                                       |
| `pnpm test`         | Placeholders until Story 1.9 — see the warning below       |
| `pnpm dev`          | Every package's `dev`, in parallel — see below             |
| `pnpm clean`        | `tsc -b --clean`; removes emitted output and build state   |

Working on a single package uses the same six verbs, meaning the same thing:

```sh
pnpm --filter @marketpulse/shared build      # or typecheck / lint / lint:fix / test
pnpm --filter @marketpulse/shared dev        # tsc -b --watch
pnpm --filter @marketpulse/shared run clean  # note the `run` — see below
```

Every package exposes `dev`, `build`, `test`, `lint`, `typecheck` and `clean`.
`lint:fix` is an extra rather than part of the convention — a local convenience
with no root fan-out and no place in `verify`.

`apps/backend` has a second extra with exactly that status, added in Task 1.2.5:

```sh
pnpm --filter @marketpulse/backend start     # node dist/index.js — needs pnpm build first
```

`start` runs the already-built output and builds nothing itself. It is not a
seventh verb: no root fan-out, no place in `verify`, and the other two packages
are not obliged to have one. It exists because "production build emits runnable
output" needs a documented way to run it. An empty or stale `dist/` is a
missing or stale server, so build first.

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

### `pnpm test` does not yet do what its name suggests

**A green `pnpm test` means "no tests exist", not "tests pass."** All three
packages' `test` scripts are `echo` placeholders that exit 0, until Story 1.9
brings a test runner. Story 1.10 will put that green tick in CI, where it will
look exactly like passing coverage. It is not.

### What `pnpm dev` does at the root

One placeholder line, two watchers and a server. `apps/frontend`'s `dev` is
still an `echo` naming Story 1.3; `packages/shared` sits in
`tsc -b --watch --preserveWatchOutput`, the right dev loop for a package whose
consumers compile against its emitted declarations; and `apps/backend` runs
`scripts/dev.sh`, which pairs its own `tsc -b --watch` with
`node --watch dist/index.js`. Output is prefixed per package, so the server's
JSON log lines arrive as `apps/backend dev: {...}`.

Edit a backend source file and the server restarts in about a second — tsc
emits, `node --watch` notices `dist/` changed, the old process drains and the
new one listens. Ctrl-C stops everything and leaves no orphaned process and no
held port.

Two things worth knowing before they surprise you. Editing
`apps/backend/package.json` restarts the server, because the health route
imports it for `version` — so **adding a dependency bounces the dev server**.
And a Ctrl-C now prints the server's own `signal received` / `shutdown
complete` lines; silence on the way out is the symptom, not the normal case.

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

## Layout

```
apps/
  backend/     @marketpulse/backend  — Fastify service (Story 1.2)
  frontend/    @marketpulse/frontend — skeleton until Story 1.3
packages/
  shared/      @marketpulse/shared   — domain types shared by both apps
docs/
  adr/         architecture decision records
planning/      product spec, epic roadmap, stories and tasks
```

Configuration lives at the root and only at the root: one `tsconfig.base.json`,
one `eslint.config.mjs`, one `prettier.config.mjs`. ESLint, Prettier and
TypeScript are root-only devDependencies; packages declare only what they
actually import.

pnpm's own settings live in `pnpm-workspace.yaml`, **not `.npmrc`**. pnpm 10
moved them, and pnpm 11 silently ignores workspace settings left in `.npmrc` —
so a setting that appears to have no effect is probably in the wrong file.

## Install-script policy

Dependencies do not get to execute code at install time unless someone names
them. pnpm runs a dependency's install scripts only if it appears in
`allowBuilds` in `pnpm-workspace.yaml`, and an un-allowlisted one is a **hard
install failure**, not a warning.

Nothing installed so far has an install script, so there is nothing allowlisted
yet. The first package to trip this is likely esbuild, arriving with Vite in
Story 1.3. When it fires, allowlist that specific package — never disable the
check.

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
