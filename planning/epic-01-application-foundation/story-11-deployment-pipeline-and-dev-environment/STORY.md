# Story 1.11 — Deployment Pipeline & Development Environment

**Status:** Not started
**Epic:** [Epic 1 — Application Foundation](../EPIC.md)
**Depends on:** Stories 1.6, 1.10
**Epic scope covered:** initial deployment pipeline

## Description

Get a deployed, reachable development environment early, so deployment problems surface while the system is trivial rather than after the WebGL topology, streaming and agent services exist.

## Open decisions

- Hosting for the frontend (static) and the backend (long-lived process). The backend eventually needs persistent WebSocket connections to Alpaca (Epic 3) and long-running agent execution (Epic 10) — hosting that sleeps idle instances or caps request duration will become a problem, so weigh that now.
- Whether a managed PostgreSQL instance is provisioned now or in Epic 2

## Conventions from Story 1.1

Story 1.1 is complete, and these four bind this story. They are stated in every Epic 1 story so each one can be read on its own; the full reasoning is in `docs/adr/0001-repository-structure-and-typescript-toolchain.md`.

- **`pnpm verify` is the acceptance command** — `build && lint && format:check && stories && test`, chained with `&&` so the first failure is the exit code. It took its fifth step in Task 1.4.5: `stories` fails if a component has no stories file, and `build` now also produces the Storybook bundle. This story passes it from the repository root. Prettier owns Markdown as well as code, so an unformatted planning document fails it too
- **Six verbs, identical in every package** — `dev`, `build`, `test`, `lint`, `typecheck`, `clean`. Only `test` and `dev` fan out with `pnpm -r`; the rest run their tool once from the root, because the reference graph and ESLint's project service already cover the workspace in one pass. Changing what a verb means in one package means changing it everywhere, or saying why not
- **Shared tooling lives at the workspace root; packages declare only what they actually import.** ESLint, Prettier and TypeScript are root-only devDependencies, and pnpm puts the root's `node_modules/.bin` on every package script's PATH. A library the code imports belongs in the package that imports it — `@types/node` in `apps/backend` is the counter-example that keeps the rule from being over-applied
- **The module setup is ESM-only and single-file-safe** — `"type": "module"`, `module: nodenext`, `isolatedModules`, `verbatimModuleSyntax`, and relative imports carrying `.js` extensions from `.ts` files (TS2835 without one). `packages/shared` is consumed as **built output**, so it must be built before any consumer can be typechecked; `tsc -b` orders that itself, which is why `typecheck` and `build` are the same command

One thing that is true today and will not be forever: until Story 1.9 lands, **`pnpm test` passes because there are no tests** — all three `test` scripts are `echo` placeholders that exit 0, and they are now the only placeholders left. The companion note about both apps' `dev` scripts being placeholders is **no longer true** — Stories 1.2 and 1.3 made all three real.

## What that means for this story

Deployment is where the workspace stops being invisible, and both of these are easier to plan for than to debug on a hosting platform.

Story 1.1 chose a pnpm workspace with `apps/backend` depending on `packages/shared` as a `workspace:*` dependency, consumed as **built output**. Two consequences land here and both are easier to plan for than to debug on a hosting platform:

- **You cannot deploy `apps/backend` alone.** Its `node_modules/@marketpulse/shared` is a symlink into the workspace, and `packages/shared/dist` must exist. `pnpm deploy --filter @marketpulse/backend` exists for exactly this and produces a self-contained directory; a platform that runs `npm install` in a subdirectory will not work
- **The build has to happen before or during deploy, in dependency order.** `pnpm build` is a single `tsc -b` over the root solution and handles the ordering itself — use it rather than per-package builds
- Pin the toolchain in the deploy environment the way CI and local machines do: Node 24.x from `.nvmrc` (`engineStrict` refuses other majors) and pnpm from `packageManager` via Corepack. A platform that supplies its own pnpm will fail the install rather than warn
- The frontend deploys as static assets; the backend as a long-lived process — **both now confirmed by measurement rather than assumed; see the Story 1.3 section below.** The hosting note in the open decisions above matters more than usual because of the persistent WebSocket and long-running agent requirements, so settle it against those rather than against today's health endpoint

### What Story 1.2 measured for this story

The backend now exists, and five of this story's assumptions were checked against it rather than left as plans. Details in `docs/adr/0002-backend-framework-and-server-composition.md`.

- **The deployable unit is the package directory, and that is measured rather than argued.** `dist` + `package.json` + `node_modules`, copied entirely outside the workspace, starts, serves `/health` with the manifest version, and exits 0 on `SIGTERM`. `dist/` alone dies at import time — first on `fastify`, and then, once `node_modules` is reachable, on the health route's read of `../../package.json` one directory above `dist/`. Both are `ERR_MODULE_NOT_FOUND` before `listen`, and **the first error hides the second**, so fixing the obvious half does not produce a working artifact. `pnpm deploy --filter @marketpulse/backend` produces the shape that works, so this story's named mechanism is confirmed. What it still owns: the base image, the **working directory**, which the manifest read depends on, and whether `packages/shared` is bundled or symlinked once something imports it
- **One half of that is currently latent.** Nothing in the emitted tree imports `@marketpulse/shared` — the complete runtime import set is `fastify`, `node:process`, `./server.js`, `./routes/health.js` and `../../package.json` — so the pnpm symlink into `packages/shared` is never followed at runtime and a copied package directory works despite it. Story 1.12's first import from that package is what makes it live, which is an argument for landing this story's `pnpm deploy` mechanism before or alongside 1.12 rather than after
- **The `pnpm start` wrapper is signal-transparent, so the question is whether to keep it, not whether it works.** `pnpm run` forwards `SIGTERM` to the child, **waits** for it to finish stopping (3.002s against a stand-in that took 3s), and propagates its exit code. Both routes were tested separately — `SIGTERM` to the pnpm process, which is what an orchestrator does, and `SIGINT` to the process group, which is what Ctrl-C does — and both exit 0 with the port released. So a container `CMD` of `pnpm start` would not swallow the signal or truncate the drain. It still adds a process, a package manager and a resolution step to a production image for no benefit once the artifact is built, so choose `node dist/index.js` deliberately — as a preference, not as a bug avoided
- **The remaining container-signal question is narrower than it was, not settled.** Signal handling was proved against a process started directly, which still says nothing about a container delivering `SIGTERM` to PID 1: a shell-form `CMD` or a wrapper script that does not `exec` will swallow it, and the symptom is a 10-second pause and a `SIGKILL` rather than an error
- **The shutdown ceiling is 5 seconds and the orchestrator's kill timeout has to be larger.** It was chosen to sit inside Docker's 10s stop grace and Kubernetes' 30s `terminationGracePeriodSeconds`; this story picks the orchestrator, so it owns the comparison. Both ends of the ceiling are exercised: a request finishing inside it exits 0, one exceeding it exits 1 with a `shutdown timed out, forcing exit` record
- **Fastify's startup log is not evidence of the bound interface.** It rewrites `0.0.0.0` to `127.0.0.1` in its `Server listening at` line, so a container that _is_ listening on all interfaces logs as though it is not — confirmed twice with `lsof`. `HOST` is a variable specifically so a container can set `0.0.0.0`; the host-binding question has to be answered by checking the socket, not by reading the log
- **`/health` reports whatever `version` the deployed manifest carries.** Free version reporting if the release process sets it, a permanently `0.0.0` health endpoint if it does not. A decision to make rather than default into

### What Story 1.3 measured for this story

The frontend now exists, and its deployable unit is **the opposite shape to the backend's**. That asymmetry is the useful part: this story ships two artefacts whose only shared property is that they came out of one `pnpm build`.

- **The frontend's deployable unit is `dist/` alone, and this is measured.** Two files — `index.html` and one hashed `assets/*.js` — with no `package.json`, no `node_modules` and **zero bare imports left in the bundle**. Copied outside the workspace and served by `python3 -m http.server`, it renders in a browser with a clean console. Compare the backend, where `dist/` alone does not run at all and the package directory is the unit: one artefact needs a runtime and a dependency tree, the other needs a file server, and `pnpm deploy --filter` is the answer for one of them and meaningless for the other
- **The emitted asset path is absolute, so a subpath deployment is a rebuild.** `base` defaults to `/`, so `index.html` references `/assets/index-<hash>.js`. Hosting the app at `https://host/marketpulse/` requires setting `base` in `vite.config.ts` and **building again** — it is not a hosting setting, a rewrite rule, or something fixable after the fact. Decide the public path before the build, or accept that the artefact is path-specific
- **Rebuilding `packages/shared` does not reach a built frontend.** The shared code is inlined at bundle time and the workspace symlink is not part of the artefact — verified by perturbing shared, rebuilding it alone, and finding the built frontend byte-identical. So the frontend has no runtime equivalent of the backend's latent symlink problem, and instead has a staleness problem: a deploy pipeline that rebuilds shared without rebuilding the frontend ships the old copy silently
- **The host's SPA fallback behaviour has to be stated rather than discovered.** `vite preview` has one and a plain static server does not, and the difference is not only about unknown routes: preview answers a **missing asset** with `index.html` and a 200, which reaches the browser as a MIME-type error rather than a 404 naming the file. There is no router yet (Story 1.5), so nothing needs fallback today — which makes this the cheap moment to decide it deliberately rather than the expensive one
- **The build is reproducible across checkouts.** Two clean builds and a separate clean clone with a cold pnpm store produced the same content hash and the same md5 (`e3fa3b5e…`). So a deploy artefact can be compared against a local build, and a hash that differs means an input differed
- **Nothing has been served by a real static host.** `python3 -m http.server` proves the artefact is self-contained and proves nothing about caching headers, compression, redirects, or fallback on whatever this story picks. Cache policy in particular is untouched: the JS filename is content-hashed and `index.html` is not, which is the shape that wants immutable caching on `assets/` and no caching on `index.html` — a decision this story owns

## Acceptance criteria

- Merging to the main branch deploys automatically
- A development environment is reachable at a documented URL
- Deployed backend `/health` responds successfully
- The deployed frontend communicates with the deployed backend
- Environment configuration is managed by the hosting platform, not committed
- A failed deployment is visible and does not take down the running environment
