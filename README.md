# MarketPulse

[![verify](https://github.com/theSmaw/marketpulse/actions/workflows/verify.yml/badge.svg)](https://github.com/theSmaw/marketpulse/actions/workflows/verify.yml)

**Green means [`pnpm verify`](#commands) passed on a clean Ubuntu runner from a
cold install** — `tsc -b` and both bundlers built, ESLint and Prettier passed
over the whole tree, every component has a stories file, both `.env.example`
files still agree with the configuration table, all **189** fast tests passed, and
the 10-test process suite spawned a real server on a real port, drained it on
`SIGTERM` and watched it exit 0. It is the same command and the same seven steps
this README documents, run by name — CI does not keep its own list of what
"verified" means.

**Since Task 1.13.4 green also means the browser suite passed**, and that half
is the one exception to the paragraph above. `verify.yml` has a second job,
`e2e`, running in parallel with the chain: it builds, starts `pnpm dev` on the
runner and runs [`pnpm e2e`](#pnpm-e2e--the-browser-suite) — ten journeys in
Chromium against a real pair, including an accessibility gate over two assembled
pages. It is a job rather than a chain step because `pnpm verify` runs with
nothing listening, which is a property every clean-clone run in this repository
has measured and one it is not willing to lose. Both jobs are required checks on
`main`. Everything the browser suite does **not** certify is listed in
[`e2e/README.md`](e2e/README.md).

**Green does not mean anything is deployed, either.** Deployment is a second
workflow (`deploy.yml`), keyed on this one succeeding, and it is deliberately
outside the badge: a registry outage or an expired credential must not turn this
tick red for something these paragraphs disclaim. Green means the chain passed;
whether the deploy that follows it worked is its own run.

**Green does not mean the coverage figures are good.** The pipeline publishes a
per-package coverage table in every run's summary and uploads the three HTML
reports, and it gates on neither: there is no threshold, the coverage step
cannot fail the job, and both application entrypoints sit in that table at 0%
on purpose — see [`pnpm coverage`](#pnpm-coverage--on-demand-and-never-in-verify).
More generally, a green tick means every **check** passed, not that every
**claim** in this README holds — the figures in this document are prose, and
nothing reads them. Five things sit outside the net on purpose, and they are
listed in [what `pnpm verify` does not
cover](#what-pnpm-verify-does-not-cover). The badge is documented as reporting the default branch, but do not read it as
a statement about `main` alone: it was watched turning from `no status` to
`passing` on a **pull request** run, before this workflow file had ever existed
on `main`. Follow the link for the run it is actually reporting.

AI-assisted situational awareness for US equities. MarketPulse detects
statistically unusual market behaviour and lets a human — or an AI agent —
investigate it against primary-source evidence.

It is explicitly **not** a trading system. It never predicts prices,
recommends trades, or produces target prices.

`planning/PRODUCT_SPEC.md` is the authoritative product definition.
`planning/EPICS.md` is the delivery roadmap.

## What exists today

**Epic 1 complete through Story 1.9 — the repository and its toolchain, a
backend, a frontend, a design-token layer, a component workshop, navigation and
the application layout, a configuration boundary, structured logging with an
error contract, a development loop that takes a clean clone to a running pair,
and a test suite of **189** fast tests plus a 10-test process suite, with
coverage available on demand.**

One command starts both halves:

```sh
pnpm install
pnpm dev        # http://localhost:5173 and http://127.0.0.1:3000
```

No `.env` file is needed and no database is involved yet. What you get is a
running application — see [Running MarketPulse](#running-marketpulse) for the
four addresses it serves and for the several things a correct first run shows
that look like faults.

`apps/backend` is a running Fastify service. It starts on a configurable port,
serves `GET /health`, restarts on source change, shuts down cleanly on
`SIGTERM`/`SIGINT`, logs structured JSON with a correlation id on every
request, answers every failure in one documented error shape, and allows one
browser origin through CORS:

```sh
pnpm build
pnpm --filter @marketpulse/backend start     # or `dev` for the watch loop
curl http://127.0.0.1:3000/health
# {"status":"ok","version":"0.0.0","uptimeSeconds":0.129}
```

`PORT`, `HOST`, `LOG_LEVEL`, `LOG_FORMAT` and `CORS_ORIGIN` configure it, all
with defaults — see [Configuration](#configuration). It is a skeleton in
**scope** rather than in status: no market data, no database, no domain logic.

`apps/frontend` is a React 19 application built with Vite. It renders the
application chrome and four routes, contains a render failure to the box it
happened in, reloads edited components without losing their state — a
stylesheet edit in 24–130 ms, a component edit in a few hundred — and builds to
static assets:

```sh
pnpm --filter @marketpulse/frontend dev      # http://localhost:5173
pnpm build
pnpm --filter @marketpulse/frontend preview  # http://localhost:4173
```

It is a shell in **scope** rather than in status: no state management, and it
does not call the backend yet (Story 1.12) — the CORS allowlist that will let it
is already configured and enforced. What it does prove is that the toolchain
works end to end: `@marketpulse/shared` resolves through the bundler as well as
through `tsc`, and the built `dist/` renders from a plain static server with no
`package.json` and no `node_modules` beside it.

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

**Docker, for the local database and for nothing else.** Since Task 2.1.2 this
repository has a PostgreSQL 18 container behind `pnpm db`, and Docker is what
runs it. The prerequisite is narrow and it is worth knowing how narrow:
`pnpm install`, `pnpm verify`, `pnpm dev` and `pnpm e2e` all run with no Docker
at all, and nothing in the application opens a database connection yet. If it is
missing, `pnpm db` says so in those terms rather than looking like a broken
checkout.

The alternatives were considered and are recorded in
[HOSTING.md](planning/epic-01-application-foundation/story-11-deployment-pipeline-and-dev-environment/HOSTING.md)
under _The database — the local development database_: a native PostgreSQL 18
install is the standing alternative for anyone who cannot run Docker, and
pointing a developer at the deployed database is rejected on principle.

## Setup

```sh
git clone git@github.com:theSmaw/marketpulse.git
cd marketpulse
corepack enable          # once per machine
pnpm install
pnpm verify
```

`pnpm verify` is the whole acceptance check: `build && lint && format:check &&
stories && env:check && test && test:process`, in that order, stopping at the
first failure.
(`stories` fails if a component has no stories file — see
[The component workshop](#the-component-workshop); `env:check` fails if the
`.env.example` files and the code have drifted apart — see
[Configuration](#configuration).) It is what CI will run (Story 1.10). On a
clean checkout it takes a few seconds and exits 0.

If `pnpm install` fails complaining about a dependency's install scripts, see
[Install-script policy](#install-script-policy) below — the fix is to
allowlist that one package, never to disable the check.

Nothing in that sequence needs a database, and nothing in it needs Docker. The
database is a separate, longer-lived thing:

```sh
pnpm db          # starts PostgreSQL 18 and waits until it is accepting connections
```

Run it once and leave it. See [`pnpm db` — the local database](#pnpm-db--the-local-database).

## Running MarketPulse

```sh
pnpm dev
```

That is the whole thing. It starts three watchers and two servers — the shared
package's compiler, the backend, and the frontend dev server — and prints
thirteen lines in under a second and a half, the last of them the server's
`Server listening at` line. The order the three loops interleave in above that
varies between runs, so where Vite's address lands is not a signal. There is no
silent stretch to wait out and no `.env` file to write first.

| Address                 | What it is                                          |
| ----------------------- | --------------------------------------------------- |
| `http://localhost:5173` | the application                                     |
| `http://127.0.0.1:3000` | the API — `GET /health` is currently the only route |

Note the two addresses are not interchangeable spellings. The dev server binds
IPv6 loopback and the backend binds IPv4, so `curl http://127.0.0.1:5173/` is
refused and `curl http://[::1]:3000/health` is too. A browser resolves both as
`localhost`; a script does not.

If you want that confirmed rather than inferred, in a second terminal:

```sh
pnpm ready
```

It exits 0 only when the backend answers `/health` **and** the frontend's module
graph resolves, and it polls for up to 15 seconds so it can be run in the same
breath as `pnpm dev`. It reports the **database** on a third line and
deliberately does not fail on it — see below for why, and for when that
changes. Read
[`pnpm ready` — knowing the pair is up](#pnpm-ready--knowing-the-pair-is-up)
before trusting a hand-rolled substitute; the obvious ones give false positives.
The reason it exists is below: **a busy port 3000 leaves `pnpm dev` running and
looking healthy**, and the terminal is not a reliable answer.

The component workshop is deliberately **not** part of `pnpm dev` — it is a
different activity, it does not hold its port, and it would leave a second
bundler idling. Start it when you want it:
`pnpm --filter @marketpulse/frontend storybook`.

### What you are looking at

Four routes for `PRODUCT_SPEC.md` §8's four experiences, plus a not-found route.
This is a **shell on purpose** (§40): the structure, the chrome and the design
language are real, and almost none of the content is.

| Route             | What it is for                         | What is there today                                                                                                                                       |
| ----------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`               | Market Overview — "what is happening?" | the only route with regions: four named landmarks, three of them a heading and a sentence naming the epic that fills them, and one holding a render check |
| `/investigations` | Investigation Workspace                | a placeholder — a label, the screen's name and one sentence (Epics 7, 8 and 10)                                                                           |
| `/securities`     | Security Explorer                      | a placeholder (Epics 4 and 9)                                                                                                                             |
| `/replay`         | Market Replay                          | a placeholder (Epic 13)                                                                                                                                   |
| anything else     | the not-found route                    | says what happened and links back to `/`; it is a route, not an error screen                                                                              |

The landing route's first region is the exception. Under **Market topology**,
where Epic 6 will draw the securities graph, is Story 1.4's render check: a
three-row securities table, the four anomaly bands, the three feed states and
one example failure block. It is kept there because it is the only thing in the
application proving the design tokens, the market colours and the components
reach the browser through the bundler rather than only through Storybook.

Deep-linking to `/replay` works here, and that is a property of **Vite** rather
than of the application — see
[Routing and layout](#routing-and-layout) before assuming it survives
deployment.

### What looks broken on a correct first run

~~Five things.~~ ~~**Six**, since Task 1.12.3 gave the page a reason to talk to
the backend.~~ ~~**Seven**, since Task 1.12.5 put the backend's own state in the chrome
and every page load now renders a placeholder for a moment.~~ **Eight**, since Task
2.1.2 gave the repository a database that the application does not use. None of
them is a fault.

- **The `MARKET FEED` indicator says `DISCONNECTED` — and the `BACKEND SERVICE`
  one beside it says `HEALTHY`.** Read the label before the word: these are
  **two** indicators reporting two facts that fail independently, and on a
  correct first run they disagree. The feed is honest: there is no market feed
  until Epic 3, which is what the smaller line beside it says. ~~The frontend
  does not call the backend at all yet (Story 1.12)~~ ~~and since Task 1.12.3 the
  frontend does call the backend, every 30 seconds, but nothing renders the
  result yet.~~ **Since Task 1.12.5 it does render it** — `BACKEND SERVICE` is a
  second indicator rather than a widening of the first, because `FeedStatus` is
  what the backend _reports_ about the market data and `BackendStatus` is what
  the client _concludes_ about whether the backend answered at all. See
  [ADR 0012](docs/adr/0012-client-side-status-what-a-green-indicator-certifies.md)
- **`BACKEND SERVICE` reads `CHECKING` for a moment on every load.** A dashed
  marker and the word `checking`, before the first poll settles — about **50 ms**
  against a local pair, and about **280 ms** against the deployed one, of which
  almost all is the public-internet round trip. It is a neutral placeholder
  rather than the honest `unreachable`, because rendering `unreachable` would
  report the client's own startup as a fact about the server on every page load,
  and rendering nothing would collapse the region and shift the chrome when the
  first result lands. If it **stays** on `checking`, that is not this: it means
  the tab is hidden, and a hidden tab does not poll at all
- **The market clock reads `--:--:-- ET`.** It is a reserved region rather than
  a stopped clock. Epic 3 supplies the live market clock; `--:--:--` is used in
  preference to a plausible `00:00:00`, which would be a fake time
- **The render check deliberately shows a `STALE` row and a `DISCONNECTED` row.**
  Demonstrating those states is what it is for. `PRODUCT_SPEC.md` §36 makes
  stale and disconnected data a product state rather than a failure — still
  shown, still correct as of a stated time — and the table exists to show that
  they read correctly
- **A titled red block reading "Peer comparison failed" is a sample.** It sits
  under the feed states so a real failure can be compared against them; it is
  the reason one red can mean both "price down" and "this did not work"
- **Ctrl-C is noisy.** See [What `pnpm dev` does at the root](#what-pnpm-dev-does-at-the-root)
  — the `Failed` line and the `node_modules missing` warning on the way out are
  what stopping several watchers at once looks like, and nothing is missing
- **The backend logs a `GET /health` every 30 seconds while a page is open**,
  two rendered lines a time, from nobody you can see. That is the frontend's
  health poll (Task 1.12.3) and it starts on mount: `useBackendHealth` in
  `App.tsx`, at `HEALTH_POLL_INTERVAL_MS`. It is per open tab, and a **hidden**
  tab does not poll at all — so the lines stop when you switch away and one
  arrives immediately when you switch back, which reads like a coincidence and
  is the design. The interval has a floor it must stay above: `API_TIMEOUT_MS`,
  5 s, in `api-client.ts`

- **`pnpm ready` says the database is not running, and exits 0 anyway.** The
  line reads `○ database  127.0.0.1:5432  ECONNREFUSED — not running` — a `○`
  rather than a `✗`, because it is a report and not a failure. Nothing in the
  application opens a connection yet, `pnpm verify` has never needed a server,
  and `pnpm e2e` gates on that same check, so failing on a missing database
  would refuse to start a browser suite that has no interest in one. `pnpm db`
  starts it. **This is the item on this list with an expiry date**: Task 2.1.4
  brings the connection pool, and on that day the `○` becomes a `✗` and a
  missing database really is a broken first run. The two other things it can
  say are worth recognising — `NOT_POSTGRES` means something else is on 5432
  (a native PostgreSQL, most likely, which `pnpm db` would fail to bind
  against), and `NO_RESPONSE` means something is holding the port and not
  answering at all

If a **box with a heading and a "Try again" button** appears where content
should be, that is different: something failed to render and was contained to
that box, which is the design. See
[When something fails to render](#when-something-fails-to-render). The one place
it is not local is the chrome itself — the header's own fallback replaces the
`<header>`, so a broken chrome takes the navigation with it while everything
below carries on working.

## Deployed environment

Both halves run on Microsoft Azure. The full record — the platform decision, the
quoted limits, the cost envelope and everything the two deploys measured — is
[`HOSTING.md`](planning/epic-01-application-foundation/story-11-deployment-pipeline-and-dev-environment/HOSTING.md).

| Half     | URL                                                                            | Service                                    |
| -------- | ------------------------------------------------------------------------------ | ------------------------------------------ |
| Frontend | <https://red-smoke-029583a0f.5.azurestaticapps.net>                            | Azure Static Web Apps, Free, East US 2     |
| Backend  | <https://marketpulse-backend.blackgrass-e682fefb.eastus.azurecontainerapps.io> | Azure Container Apps, Consumption, East US |

It is a **development environment and it is public** — no authentication, no
user data, and a backend whose entire surface is `GET /health`. That is
acceptable only for as long as nothing deployed holds a credential.

Five things worth knowing before relying on it:

- **A merge to `main` deploys both halves, with no human action.**
  `.github/workflows/deploy.yml` runs when `verify` completes successfully on a
  push to `main`, and nothing else triggers it — a red `verify` leaves a
  `skipped` deploy run and changes nothing. The whole deploy is about **2 min
  50 s**, so a merge is green in ~90 s and live in ~4 min 20 s. It builds
  nothing of its own: `pnpm build` and `pnpm image` by name, exactly as you
  would run them.
- **It queues rather than races.** Two merges 95 seconds apart produced two
  deploy runs whose jobs did not overlap; the second waited 75 s for the first
  to finish. Deploy runs are never cancelled.
- **`verify`'s artefact fingerprint is not the deployed one, and it says so.**
  The chain builds without `VITE_API_BASE_URL`; the deploy builds with it, and
  prints the fingerprint of what it actually uploaded. The two differ in the
  JavaScript bundle **and** in `index.html`, which changes at identical length
  because it carries the hashed script filename.
- **A frontend deploy is not atomic.** Measured on four deploys, and the window
  holds **two** broken states rather than one: first the incoming `index.html`
  is served while the incoming asset is still a 404, then the outgoing asset is
  withdrawn while the outgoing `index.html` is still being served. The document
  moves ahead of its own asset in both directions, over about **two seconds**,
  and **the window opens at the exact second the deploy step reports success** —
  so anything checking the deployed page after a deploy has to poll rather than
  check once. **Scoped by Task 1.12.7 (2026-09-04): the window is a property of the artefact _changing_, not of deploying.** 174 consecutive CDN samples at 0.4 s across a whole `Deploy the frontend` step of a docs-only merge showed **zero** broken states — a byte-identical Linux rebuild keeps the hashed filenames, so there was no incoming asset to be missing and no outgoing one to withdraw. That is a mechanism explaining an observation and **not a re-test**: the window is real on a changing artefact, and Task 1.12.7 did not re-measure it there. Anyone already on the page is unaffected, and `no-cache` on the
  document means their next navigation revalidates. There is no flag that
  removes it.
- **The two halves talk.** The deployed page calls the deployed `/health` on
  load and reports the result to the browser console, including the
  `x-request-id` that appears in the backend's own log for the same request.
  That is one `fetch`, deliberately — Story 1.12 brings the API client, the
  status indicator and the polling.
- **The frontend's build is bound to the backend's address.**
  `VITE_API_BASE_URL` is substituted into the bundle at build time, so the
  deployed artefact and a local build are different artefacts and pointing the
  frontend at another backend is a **rebuild**, not a setting. A build that
  forgets the variable does not fail — it ships a page dialling
  `http://localhost:3000`, which an HTTPS page blocks as mixed content and
  which reads as an unreachable backend.

### Rolling back

The two halves roll back by different mechanisms, they are about **5× apart in
speed**, and the fast one is the one that expires. All three figures were
measured rather than reasoned about.

| Half     | How                                                | Takes          |
| -------- | -------------------------------------------------- | -------------- |
| Backend  | `az containerapp update --image <previous digest>` | **43 s**       |
| Frontend | A revert commit, merged, through `verify`          | **3 min 42 s** |

Every deploy run prints the digest it rolled out into its own job summary, so
the argument to that command is already written down. Note the shape of it:

- **It is not a traffic shift.** `az containerapp ingress traffic set` is
  refused on this app — _"configured for single revision. Set revision mode to
  multiple in order to set ingress traffic"_ — so traffic splitting and the
  revision-label FQDNs both need the app reconfigured first, during an incident,
  on the thing that is already misbehaving.
- **The backend rollback expires.** It creates a new revision rather than
  reactivating an old one, so **the next merge to `main` silently undoes it**.
  It buys time; the durable fix is a revert commit, exactly as the frontend's
  is.
- **`workflow_dispatch` on `deploy.yml` is a re-deploy, not a rollback.** It
  checks out `main`, so pressing it after a bad merge deploys the bad merge
  again. Re-running a failed deploy is safe but not a no-op either: the same
  commit rebuilds to a different image digest, so a new revision rolls out.

### Where the configuration lives

**The backend's is in the platform**, and nothing in this repository holds it:
`PORT`, `HOST`, `LOG_LEVEL`, `LOG_FORMAT` and `CORS_ORIGIN` are set on the
container app, its `secrets` array is empty because none of them is a
credential, and the three health probes, `minReplicas: 1` and the ingress target
port are platform configuration too. `deploy.yml` uses `update` and never
`create`, so it does not restate any of it. That is the criterion working — and
it means `pnpm verify` cannot see any of it, and a future reader finding one of
these changed cannot tell whether it was deliberate. ADR 0011 and `HOSTING.md`
are the only durable copy.

**The frontend's cannot live there.** `VITE_API_BASE_URL` is substituted into
the bundle at build time, so by the time the platform sees the artefact the
value is a string literal inside it. There is no panel that could change it;
pointing the deployed frontend at a different backend is a rebuild. `README`
says this twice on purpose — it is the single most re-litigated consequence of
the frontend's build.

## Commands

Run from the repository root:

| Command             | What it does                                                          |
| ------------------- | --------------------------------------------------------------------- |
| `pnpm verify`       | The seven steps below, chained — this is what CI runs, by name        |
| `pnpm build`        | `tsc -b` over the solution, then the frontend bundle, then Storybook  |
| `pnpm typecheck`    | The same command as `build`, deliberately — see below                 |
| `pnpm lint`         | `eslint .` over the whole workspace in one process                    |
| `pnpm lint:fix`     | The same, with `--fix`                                                |
| `pnpm format`       | `prettier --write .` — the whole tree, prose included                 |
| `pnpm format:check` | `prettier --check .`                                                  |
| `pnpm stories`      | Fails if a component has no stories file                              |
| `pnpm env:check`    | Fails if `.env.example` and the configuration module disagree         |
| `pnpm test`         | Every package's tests — 189 across the workspace — see below          |
| `pnpm test:process` | The backend's process half — 10 tests that spawn a real server        |
| `pnpm coverage`     | The same tests with coverage — three reports, on demand — see below   |
| `pnpm dev`          | Every package's `dev`, in parallel — see below                        |
| `pnpm db`           | Starts the local PostgreSQL 18 container — see below                  |
| `pnpm ready`        | Is the development pair actually up? Not part of `verify` — see below |
| `pnpm image`        | Builds the backend's `linux/amd64` container image — see below        |
| `pnpm e2e`          | The browser suite, against a pair you started — see below             |
| `pnpm e2e:deployed` | The same browser against the **live** environment — see below         |
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

**Run `pnpm build` first whenever you run one package on its own.** Root
`pnpm dev` does not need it — the shared package's watcher is one of its three
loops — but a filtered command has no such loop beside it, and both apps compile
against `packages/shared/dist`. The frontend's version of that failure is
particularly quiet: after a `pnpm clean`,
`pnpm --filter @marketpulse/frontend dev` starts, reports its usual
`ready in …` line and serves `/` as a clean **200**, and the terminal says
nothing wrong. Only when a
browser requests a module that actually imports the shared package does it
print:

```
Failed to resolve import "@marketpulse/shared" from "src/routes/MarketOverview.tsx"
```

Do not try to check this by hand with a request of your own — Vite's dev server
never 404s, `/src/main.tsx` answers 200 against the broken graph, and a module
path that does not exist at all comes back as `index.html` with a 200. That is
what `pnpm ready` is for; it reads the content type rather than the status for
exactly this reason.

Two more extras have exactly that status, one per app:

```sh
pnpm --filter @marketpulse/backend start          # node dist/index.js
pnpm --filter @marketpulse/frontend preview       # serves dist/ on :4173
pnpm --filter @marketpulse/frontend storybook     # the workshop, on :6006
pnpm --filter @marketpulse/frontend storybook:build  # static build into storybook-static/
```

None is a seventh verb: no root fan-out, no place in `verify`, and
`packages/shared` is not obliged to have one. `test:process` is a third case
again — it _does_ fan out from the root and it _is_ in `verify`, but it exists
in one package and a package added tomorrow owes `test`, not `test:process`
(the same status `coverage` has). Both exist because "production
build emits runnable output" needs a documented way to run it, and **both run
the already-built output and build nothing themselves** — so `pnpm build`
first, or an empty or stale `dist/` gives you a missing server and a stale
page.

One warning about `preview`, because it is easy to mistake for a static host.
Its SPA fallback answers _any_ unmatched path **a browser asks for** with
`index.html` and a 200 — a **missing asset** included, which then arrives in the
browser as a MIME-type error rather than a 404 naming the file. It is the right
way to look at a production build and the wrong way to prove one works.

**The fallback keys on the `Accept` header**, which matters the moment an API
client points at it: `Accept: application/json` gets a **404** where
`Accept: text/html` gets the page. Three hosts, three behaviours —
`python3 -m http.server` 404s both, `vite preview` splits on `Accept`, and the
deployed Azure Static Web App splits on **path**. Never say "the SPA fallback"
without saying which host you mean.

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

### What `pnpm test` covers

Every package has real tests, and there is no `echo` placeholder left anywhere
in this workspace. `packages/shared` runs 37 tests across 4 files,
`apps/backend` 49 across 3, and `apps/frontend` 103 across 12 — **189 in
total**, and a failure in any package makes the root command exit 1.

They are three different kinds of test:

| Package           | What it drives                                                                                       |
| ----------------- | ---------------------------------------------------------------------------------------------------- |
| `packages/shared` | Plain functions with plain arguments                                                                 |
| `apps/backend`    | The assembled Fastify server through `app.inject()` — no listening socket, both error handlers, CORS |
| `apps/frontend`   | The real component tree rendered under jsdom, asserted on roles and accessible names                 |

**There are five levels of test here and `pnpm test` runs three of them.** The
other two have their own commands, deliberately, because each needs something
the fast suite must never need:

| Level             | Command                  | What it needs that `pnpm test` must not           |
| ----------------- | ------------------------ | ------------------------------------------------- |
| Unit              | `pnpm test`              | —                                                 |
| Integration       | `pnpm test`              | —                                                 |
| Component (jsdom) | `pnpm test`              | —                                                 |
| Process           | `pnpm test:process`      | A build, and a free port                          |
| Browser           | `pnpm e2e` / `:deployed` | A build, two servers (or a deployment), a browser |

The browser level is one level pointed at two targets rather than two levels:
`pnpm e2e` drives a local pair and gates a merge, `pnpm e2e:deployed` drives the
live environment after one and gates nothing. Both are below.

**A green tick is not coverage.** And what `pnpm test` does not reach at all
is the backend's process half — signals, exit codes, the shutdown ceiling,
`EADDRINUSE`, the two crash handlers — because `app.inject()` drives a server
with no socket. That is `pnpm test:process`, below.

### `pnpm test:process` — the backend's process half

```sh
pnpm test:process                                    # from the root
pnpm --filter @marketpulse/backend run test:process   # the same suite
```

Ten tests in `apps/backend/src/index.process.test.ts`, run by a second runner
config (`vitest.process.config.ts`) in the same package. They spawn
`dist/index.js` as a real child process on a real port and assert on what it
does: `SIGTERM` and `SIGINT` drain and exit 0 with the port released, a second
signal during a shutdown exits 1 immediately, a drain that outlives the
five-second ceiling is forced out at exit 1 with a level-50 record, a busy port
exits 1 with the `EADDRINUSE` record intact, `PORT=0` is rejected before the
logger exists, and both crash handlers write one level-60 record and exit 1 —
including at `LOG_LEVEL=silent`, and including a crash _during_ a drain, which
leaves the drain to finish and exit 0.

Three things about it worth knowing before changing it.

**It is a separate command because it is a separate cost.** `pnpm test` is 103
tests in a few hundred milliseconds, needs no build and no socket, and is the
one you run all day; this suite takes about 7.6 s, of which 5 s is the shutdown
ceiling being what it says it is. Both are steps in `pnpm verify`, so both gate.

**It needs a build.** `dist/index.js` is what has the process behaviour in it,
so the suite fails with a message telling you to run `pnpm build` if it is
missing. `pnpm verify` orders the build first, so the ordinary path is safe.

**Nothing in it waits for a log line.** Readiness is a `GET /health` poll. At
`LOG_LEVEL=warn` and above a healthy server writes no lines at all — its
`Server listening at …` included — so a readiness grep would hang rather than
fail.

### Running one file, or one test

The `test` script takes arguments straight through, from the repository root
with a filter or from the package directory without one. **The path is relative
to the package**, not to the repository root.

```sh
# One file
pnpm --filter @marketpulse/backend test src/config.test.ts
pnpm --filter @marketpulse/frontend test src/components/PriceChange/PriceChange.test.tsx

# Any substring of the path — usually what you want
pnpm --filter @marketpulse/frontend test PriceChange

# One test by name
pnpm --filter @marketpulse/backend test -t "freezes what it returns"

# The names to match against
pnpm --filter @marketpulse/shared test --reporter=verbose

# Watch mode — `--watch` is required; see below
pnpm --filter @marketpulse/frontend exec vitest --watch
```

From inside a package directory the filter comes off and everything else is the
same — `pnpm test src/config.test.ts`, and `pnpm t` is the same command again.

**Do not write `--` before the arguments.** `pnpm test -- -t "name"` looks
right, forwards the `--` to Vitest literally, and Vitest then ignores the
filter: all 49 backend tests run and it exits **0**, so a command that reads as
a narrow run is a full one. Nothing here needs `--`, `--reporter=verbose`
included, even though `--reporter` is also one of pnpm's own flags.

**A `-t` that matches nothing is also green.** It reports `47 skipped` and exits
**0** — a typo in a test name looks like a pass, so read the skipped count
rather than the exit code. A path that matches nothing is the loud case:
`No test files found`, exit 1.

**Root `pnpm test <path>` is not the way to narrow it.** Root `test` is
`pnpm -r run test`, so the path goes to all three packages and the two that do
not have that file fail. Use `--filter`.

**Watch mode needs an explicit `--watch`.** A bare `vitest` runs once and exits,
the same as `vitest run` — that changed in Vitest 4, and the old habit reads as
watch mode being broken. With `--watch` you get a `DEV` banner,
`PASS Waiting for file changes...`, and a saved file re-runs only that file.
There is no `test:watch` script on purpose: it would be a seventh verb in three
packages for something `exec` already spells.

### `pnpm coverage` — on demand, and never in `verify`

```sh
pnpm coverage                                   # all three packages
pnpm --filter @marketpulse/backend coverage     # one of them
```

It is the same 160 tests with `--coverage` added, fanning out through
`pnpm -r` exactly as `pnpm test` does, so there are **three reports and no
merged one** — each package answers for its own sources. It is deliberately
not part of `pnpm test` and not a `pnpm verify` step of its own: nothing gates
on the number yet, and an instrumentation pass on the acceptance command costs
every developer and every CI run for a figure nobody is reading. CI runs it as
a separate, non-gating step.

**`pnpm test:process` is not in it either, and it would not help if it were.**
V8 coverage accounts for the code the runner's own process loads; that suite's
subject runs in a _child_ process the runner never instruments, and the file it
runs is `dist/index.js` while `coverage.include` is `src/**/*.ts`. Measured:
running the process suite under the backend's own coverage settings reports
**0% of 354 statements** — it instruments nothing at all. So the backend stayed
at **64.33%** with `src/index.ts` at 0% on the day that file got ten tests.
**The testing hole and the coverage figure are two claims, not one**, and
`src/index.ts` sitting at 0% now means "no runner instruments it", not "nothing
tests it".

Each run writes a terminal table and a browsable HTML report to that package's
`coverage/`, which is already ignored by git, Prettier and ESLint. Note the
terminal table lists only files that are **not** fully covered — for
`packages/shared` that is three of its six sources; open
`<package>/coverage/index.html` for every file, and for the lines behind a
number.

Narrowing a coverage run to one test file gives a misleading number rather than
that file's coverage: `coverage.include` fixes the denominator while the
numerator shrinks, so `pnpm --filter @marketpulse/shared coverage
src/api-error.test.ts` reports 20% where the full run reports 30%.

The figures below were taken in Task 1.9.5 and **re-taken in Task 1.9.7**,
where all twelve reproduced to the digit:

| Package           | Statements      | Branches | Functions | Lines           |
| ----------------- | --------------- | -------- | --------- | --------------- |
| `packages/shared` | 30.00% (3/10)   | 50.00%   | 33.33%    | 30.00% (3/10)   |
| `apps/backend`    | 64.33% (92/143) | 75.00%   | 72.72%    | 63.82% (90/141) |
| `apps/frontend`   | 68.25% (43/63)  | 70.83%   | 80.64%    | 67.21% (41/61)  |

**What those numbers structurally exclude matters more than the numbers.**
`apps/backend/src/index.ts` reports **0%** and is deliberately left in the
denominator: it is the process — `listen`, both signal handlers, the shutdown
ceiling, both crash handlers — and `app.inject()` cannot reach any of it, so
that is the same hole the section above names, now visible as a figure rather
than as a caveat. `apps/frontend/src/main.tsx` is 0% for the same reason and is
left in for the same reason. Outside the report entirely, because no test
imports them and no runner reads them: `scripts/*.mjs`, and
`apps/backend/scripts/dev.sh`, which no tool in this workspace reads at all.

**There is no threshold, and that is a decision.** A minimum set against nine
components, one configuration module and no application state would be a number
invented before there is anything to hold it to, and it would be met by testing
what is easy. Story 1.10 owns CI and can set one against the baseline in the
table above, which is what this command exists to provide.

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
a couple of hundred milliseconds — a stylesheet-only edit in well under one —
with the component's state intact. Ctrl-C stops everything and leaves no
orphaned process and no held port.

**A clean Ctrl-C is noisy, and the noise is not a failure.** After the server's
own `signal received` / `shutdown complete` lines, pnpm reports **one** watcher
as `Failed`, quotes
`[ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL] ... Command failed with signal "SIGINT"`,
and usually adds a spurious `[WARN] Local package.json exists, but node_modules
missing, did you mean to install?`:

```
packages/shared dev: Failed
[ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL] @marketpulse/shared@0.0.0 dev: `tsc -b --watch --preserveWatchOutput`
Command failed with signal "SIGINT"
[WARN]  Local package.json exists, but node_modules missing, did you mean to install?
[ELIFECYCLE] Command failed.
```

Nothing is wrong and nothing is missing — do not reinstall a working tree. That
is what interrupting a parallel run looks like: `pnpm -r` reports whichever
watcher exits first, so the package it names is a **race** and varies between
runs. Which one it says is not information — and neither is whether the warning
appears at all. It comes and goes between runs on the same tree, so a Ctrl-C
without it is just as normal as one with it.

It is not fixable for less than it costs. Every pnpm lever was measured:
`--no-bail` prints two `Failed` lines and keeps the false warning, `--loglevel
error` suppresses every child's output including the server's log, and
`--silent` prints nothing at all.

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

### Three ports, and only two of them are decisions

| Port     | What is on it           | Where it is set                                 | Configurable     |
| -------- | ----------------------- | ----------------------------------------------- | ---------------- |
| **3000** | the API                 | `PORT` in `apps/backend/.env`                   | yes              |
| **5173** | the frontend dev server | `server.port` in `apps/frontend/vite.config.ts` | no, deliberately |
| **4173** | `vite preview`          | `preview.port` in the same file                 | no, deliberately |

The backend's port is configurable because it is a property of a **deployed
process** — Story 1.11's container sets `PORT` and `HOST`, and nothing else
can. Neither Vite port reaches a deployment at all: `apps/frontend/dist` is
four static files served by somebody else's host, and both Vite servers are
development tools. Symmetry with the backend is not on its own a reason to make
them configurable, and they are not.

A busy 5173 or 4173 therefore means **editing `vite.config.ts`** rather than
exporting a variable — and editing `CORS_ORIGIN` with it, because the backend's
allowlist is pinned to the dev server's origin. `pnpm ready` dials the origin
`CORS_ORIGIN` names, so forgetting the second edit is reported rather than
discovered in the browser as a `TypeError: Failed to fetch`.

4173 is Vite's own default, written down anyway: `vite preview` inherits
`server.strictPort` but **not** `server.port`. Do not add a `preview.strictPort`
— it is inherited, and a second copy is one more place for the two to disagree
on an upgrade.

### What a port conflict looks like, and why the two are not alike

Both services refuse to move — `strictPort: true` on the frontend, the ordinary
`EADDRINUSE` on the backend — but what happens next is opposite, and the
cheaper-looking failure is the dangerous one.

**A busy 5173 stops everything.** Vite prints seven lines ending in
`Error: Port 5173 is already in use`, exits 1, and pnpm's fan-out takes the
other two loops down with it:

```
apps/frontend dev: error when starting dev server:
apps/frontend dev: Error: Port 5173 is already in use
...
[ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL] @marketpulse/frontend@0.0.0 dev: `vite`
Exit status 1
```

You cannot miss it: the command you just ran has exited.

**A busy 3000 does not stop anything.** The record is sixteen lines, because
the whole of it is an error object and the pretty renderer deliberately leaves
a stack multi-line — so the sentence you need is line 4 of 16:

```
apps/backend dev: [2:40:49.871 PM] ERROR (66870): server failed to start
apps/backend dev:     err: {
apps/backend dev:       "type": "Error",
apps/backend dev:       "message": "listen EADDRINUSE: address already in use 127.0.0.1:3000",
...
apps/backend dev: Failed running 'dist/index.js'. Waiting for file changes before restarting...
```

That last line is the problem. `node --watch` catches the exit, the frontend
carries on serving, `pnpm dev` keeps running, and nothing exits non-zero. Sixteen
lines scroll away behind Vite's banner and what is left on screen is a pair that
looks healthy and is half dead. **This is what `pnpm ready` is for.**

Two things about recovering from it. Freeing the port is **not** enough on its
own — the loop is waiting for a _file_ change, not for the port. And `touch`ing
a source file is not enough either, because tsc's incremental build emits
nothing when the content has not changed and `node --watch` is watching `dist/`.
A real edit brings it back in about a second.

### `pnpm db` — the local database

```sh
pnpm db          # start it, and wait until it is accepting connections
pnpm db down     # stop it; the data survives
pnpm db down -v  # stop it and delete the data
pnpm db ps       # what is running
pnpm db logs -f  # follow its log
pnpm db exec postgres psql -U marketpulse -d marketpulse
```

PostgreSQL **18** in a container, defined by `compose.yaml` at the repository
root and started by `scripts/local-database.mjs`. Arguments are forwarded to
`docker compose` untouched, so anything Docker documents works.

```
  PostgreSQL 18 on 127.0.0.1:5432  database marketpulse  user marketpulse
```

**It is deliberately not part of `pnpm dev`.** The three watchers are a loop you
stop with Ctrl-C several times an hour; a database is a fourth process with a
completely different lifecycle — it holds state, and stopping it with the
watchers would throw away the data you were part-way through debugging. So it is
a separate long-lived command, and `pnpm dev` is unchanged. The cost of that is
the new first-run confusion named in
[What looks broken on a correct first run](#what-looks-broken-on-a-correct-first-run),
and `pnpm ready`'s third line is the answer to it.

**Why 18, and why the pin is in one place.** It is the version Task 2.1.1 chose
for the managed server, and a local 17 against a deployed 18 is a class of bug
that only appears in production. The major is pinned in
`scripts/local-database.mjs` and interpolated into `compose.yaml`; the **minor**
deliberately is not, because Azure patches that under us and a pin it cannot
honour is a pin that lies. The running container reports 18.6. **Nothing checks
that this pin and the deployed server's version still agree** — see
[What `pnpm verify` does not cover](#what-pnpm-verify-does-not-cover).

**The password is in the repository on purpose and is not a secret.** It
authenticates a container published on **loopback only** (`127.0.0.1:5432:5432`,
not the bare `5432:5432` that would put a database on every network this machine
is joined to), holding an empty database. Treating it as a secret would mean a
`.env` file every clean clone has to write before the database starts.

**The local and deployed credentials do not match, and that is a decision.** The
deployed server authenticates with **Microsoft Entra only** — password
authentication is `Disabled` and no admin user exists — which is a mechanism a
laptop structurally cannot have. "Match the deployed environment" applies to the
**engine version** and not to the credential. See
[HOSTING.md](planning/epic-01-application-foundation/story-11-deployment-pipeline-and-dev-environment/HOSTING.md).

**The database is empty and stays empty in this story.** Tables and migrations
are Story 2.2's; there is no seeding mechanism here, deliberately, because one
invented now is one Story 2.2 would have to unpick.

Two things that will otherwise cost an afternoon:

- **`docker compose up` by hand does not work, on purpose.** Every value in
  `compose.yaml` is required with no default, so the file cannot keep a second
  copy of the port that quietly disagrees with the script's. It exits 1 naming
  `pnpm db`. This is the same arrangement `e2e/playwright.config.ts` has with
  `E2E_BASE_URL`
- **Two checkouts share one database, on purpose.** `compose.yaml` sets
  `name: marketpulse`, so a git worktree under `.claude/worktrees/` — or a
  second clone — attaches to the same project rather than starting a second
  container that would collide on 5432. Confirmed by running `pnpm db` in a
  clone and `pnpm db ps` in the original: one container,
  `127.0.0.1:5432->5432/tcp`, loopback only as published. One database per
  machine, not one per checkout
- **The volume is mounted at `/var/lib/postgresql`, not `/var/lib/postgresql/data`.**
  The 18 image moved both its declared volume and `PGDATA`. Every pre-18 snippet
  uses the old path, and with it the container **refuses to start at all**,
  first run, empty volume, with a long message naming the mount and the fix. It
  is a loud failure rather than a silent one, which is the good outcome — but it
  is not what the shape of the mistake suggests

### `pnpm ready` — knowing the pair is up

```sh
pnpm dev      # in one terminal
pnpm ready    # in another
```

```
  ✓ backend   http://127.0.0.1:3000/health  0.0.0, up 0.5s
  ✓ frontend  http://localhost:5173/src/routes/MarketOverview.tsx  module graph resolves
  ✓ database  127.0.0.1:5432  PostgreSQL, no TLS offered

The pair is up, and so is the database.
```

It polls for up to 15 seconds, so it can be run immediately after `pnpm dev`
rather than after guessing how long to wait. It exits 0 when both halves answer
and 1 otherwise, with a line saying which one did not and why.

**The database is the third line and it is reported rather than gated** (Task
2.1.2). It is `○` rather than `✗` when it is down and the exit code does not
change, because the question this exit code answers is _can the application
run?_ and nothing here opens a database connection yet. Task 2.1.4 is the
reversal trigger: on the day the backend needs one, that line becomes a `✗` and
the `e2e` job in CI gains a service.

**It is also the first probe here that is not a `fetch`, and it could not have
been one.** A PostgreSQL port answers an HTTP request by waiting, so the two
checks above would report `NO_RESPONSE` against a perfectly healthy database.
The decision — stated, because a TCP connect was the obvious cheaper option —
is to speak enough of the protocol to get a real answer: an **SSLRequest**,
eight bytes with no credentials and no driver, which every PostgreSQL server
answers with a single byte. A connect proves only a **listener**, and both cases
where that matters were made to happen: a bare `net.createServer()` reads
`NO_RESPONSE` and an HTTP server on 5432 reads `NOT_POSTGRES`, where a connect
check would have called both of them up.

What it does **not** prove is worth knowing: not that the named database exists
and not that the credentials work — both need a driver, and the connection pool
is the right place for that — and not that the server is _ours_, since a native
PostgreSQL on 5432 answers identically. The `no TLS offered` in that line is
real information rather than filler: the container does not offer TLS and the
managed server enforces it.

Unlike the other two it is checked **once, with no polling**, because `pnpm db`
does not return until the server is accepting connections, so there is nothing
to wait for. That is not a detail — with a five-second poll, `pnpm ready`
against a stopped database took 5.1 s instead of 0.093 s, and `pnpm e2e` gates
on this script.

It is **not** a step in `pnpm verify` and must not become one: `verify` runs
with no servers up, where the honest answer to this question is "nothing is
running" rather than a failure. It lives in `scripts/` so ESLint and Prettier
read it.

**It does not hold the pair's addresses itself.** Since the browser suite needed
the same two, they moved into `scripts/pair-addresses.mjs`, which reads the
backend's `PORT`/`HOST` out of its **built** `dist/config.js` and the frontend's
origin out of `CORS_ORIGIN` rather than a second copy of `5173`. Two readers,
one definition — a harness with its own copy of the port has forked the pair's
definition on day one.

Three things it deliberately does not do:

- **It does not grep the log.** At `LOG_LEVEL=warn` and above a healthy server
  writes nothing at all, `Server listening at …` included, so that line is
  absent from a working server; it also rewrites `0.0.0.0` to `127.0.0.1`, so it
  does not state the interface that was bound; and it arrives _after_ Vite's
  banner, so treating it as "the pair is up" works by luck
- **It does not fetch the frontend's `/`.** With `packages/shared` unbuilt, Vite
  starts normally and `GET /` returns a clean 200 from a server that cannot
  render the application. Requesting _a_ module is not enough either —
  `/src/main.tsx` also answers 200, because Vite transforms one module per
  request and the failing import is further down the graph. The check names a
  module with a **value** import of `@marketpulse/shared`, and reads the
  **content type** rather than the status, because the dev server never 404s: a
  module path that does not exist comes back as `index.html` with a 200
- **It does not send an `Origin` header,** and a CORS check cannot be built out
  of one. The server sends the allowed origin to every caller; the browser is
  the only party that compares. A 200 from `curl -H "Origin: …"` proves nothing

If you would rather do it by hand, note that `curl` needs the right address
family per service and Node's `fetch` does not — undici tries both, `curl` takes
what you give it:

```sh
curl http://127.0.0.1:3000/health     # backend: IPv4 only
curl http://localhost:5173/           # dev server: IPv6 only — 127.0.0.1 is refused
```

The second of those is the false positive described above; it tells you a server
is listening and nothing about whether the application resolves.

### `pnpm e2e` — the browser suite

```sh
pnpm dev      # in one terminal
pnpm e2e      # in another
```

```
  ✓ backend   http://127.0.0.1:3000/health  0.0.0, up 4.6s
  ✓ frontend  http://localhost:5173/src/routes/MarketOverview.tsx  module graph resolves

The pair is up.

Driving http://localhost:5173

Running 10 tests using 4 workers

  ✓   3 [chromium] › e2e/specs/backend-health.spec.ts:46:1 › the page reaches the backend across the origin boundary and shows what it said (1.2s)
  ✓   2 [chromium] › e2e/specs/landing-route.spec.ts:60:1 › the landing route serves the chrome and PRODUCT_SPEC §9's four regions (1.4s)
  …
  ✓   1 [chromium] › e2e/specs/backend-recovery.spec.ts:43:1 › the indicator recovers on the next poll, without the page reloading (1.0m)

  10 passed (1.0m)
```

**Ten journeys across four spec files, and nine of them take 3.4 s.** The tenth
is the recovery journey, which waits out two real 30-second poll intervals and
is the whole cost of the run; `pnpm e2e --grep-invert "recovers on the next
poll"` is the fast half. It is deliberately **not** skipped in CI, because
skipping it would leave the recovery criterion asserted on a laptop and nowhere
else.

Playwright, in Chromium, against a pair **you** started. The specs live in
`e2e/`, which is a fourth workspace package rather than a folder, so they lint,
format and typecheck like every other TypeScript file here and can `import` the
vocabulary they assert on from `@marketpulse/shared` instead of writing the
words out.

Four things about it worth knowing before running it:

- **It does not start the servers, and that is deliberate.** It gates on
  `pnpm ready`, which judges **both** halves. Playwright's own `webServer` would
  judge readiness by one URL, and a busy 3000 leaves `pnpm dev` running and
  looking entirely healthy — so a frontend probe passes against half a system,
  and the backend is the half this suite exists to watch
- **It drives the origin `CORS_ORIGIN` names**, resolved from the running
  backend's own configuration rather than from a port written down a second
  time. That is forced rather than tidy: the allowlist holds exactly one origin,
  so a suite pointed at `vite preview` on 4173 would drive a page every one of
  whose backend calls the browser refuses while the server logs a 200
- **Arguments are forwarded**, so `pnpm e2e --headed`, `pnpm e2e --debug` and
  `pnpm e2e -g "regions"` work as Playwright documents them
- **It is not part of `pnpm verify`**, for the same reason `pnpm ready` is not:
  `verify` runs with no servers up. It **is** in CI, as a second job in
  `verify.yml` that starts the pair itself and calls these same commands by
  name, and it is a required check on `main` — so a red journey blocks a merge
  even though it is not a chain step

The browsers are **not** installed by `pnpm install` — Playwright downloads them
in an explicit command, which is why its cost is visible:

```sh
pnpm exec playwright install chromium    # ~554 MB, three artefacts, once per machine
```

A failed run leaves a trace, a screenshot and a page snapshot under
`e2e/test-results/` — about 450 KB for one failure, all of it gitignored, and
cleared at the start of the next run. CI uploads the same directory as an
artefact on failure only, kept for 7 days; there it measured 872,142 B for one
failed assertion, and 577 B when the pair never started at all. Read the trace
with:

```sh
pnpm exec playwright show-trace e2e/test-results/<the directory it named>/trace.zip
```

**Read `e2e/README.md` before writing a spec.** The rules live beside the specs
rather than here — the must-not-assert list (colour, and `innerText()`, which
reports the CSS-transformed `HEALTHY` where every matcher sees `healthy`), why
no spec stops the backend, how waits are derived from the application's own
constants, the axe decision, and the full statement of what a green run does and
does not certify. ADR 0013 is why each of those is the way it is.

In one paragraph: **a green run certifies** that a real browser loaded the real
page, reached the backend **across the origin boundary**, read back the
`x-request-id` the backend sent, rendered all three `BackendStatus` states from
causes produced in the browser, recovered on the next poll without reloading,
kept every route usable with the backend unreachable, and found zero axe
violations on two pages. **What it does not** is anything about a host — the dev
server never 404s, so deep-linking and `/assets/nope.js` cannot be asserted
against it — or anything about the deployed system, whose three addresses it
never sees. Those are `pnpm e2e:deployed`, below.

### `pnpm e2e:deployed` — the same browser against the live environment

```sh
export E2E_DEPLOYED_BASE_URL=https://red-smoke-029583a0f.5.azurestaticapps.net
export E2E_DEPLOYED_BACKEND_ORIGIN=https://marketpulse-backend.blackgrass-e682fefb.eastus.azurecontainerapps.io
pnpm e2e:deployed
```

```
Checking https://red-smoke-029583a0f.5.azurestaticapps.net

  ✓ backend   https://marketpulse-backend.…/health  0.0.0, up 344.2s
  ✓ frontend  https://red-smoke-029583a0f.5.azurestaticapps.net/  document and 2 assets served together

The deployed pair is up and the artefact is coherent.

Running 10 tests using 1 worker
  …
axe — the deployed landing route, backend healthy: 0 violations, 37 passes, 1 inconclusive (color-contrast)

  10 passed (10.5s)
```

**This is the only check in the repository that can fail for a reason nothing
else can see**, and it runs **after** a merge, so it gates nothing — its output
is a rollback decision. `.github/workflows/deploy.yml` runs it as a
`check-deployed` job once the deploy has finished; the two addresses come from
that file and neither is derived from the other.

Five things about it worth knowing:

- **It catches two failures that leave every other instrument reporting
  success.** A wrong `CORS_ORIGIN`: the browser reports `TypeError: Failed to
fetch` while `curl` with the real `Origin` gets a **200 with a full body** and
  the log records **15 requests, every one `statusCode: 200`** — made to happen
  against the live backend, not reasoned about. And a missing
  `VITE_API_BASE_URL`: the build does not fail, it ships a page dialling
  `http://localhost:3000` that an HTTPS document blocks as mixed content. **The
  two look identical on screen** — both read `unreachable` — so each has its own
  assertion, and the second is caught at the cause, by checking which origin the
  page's own request went to
- **It also holds Story 1.5's two host-level criteria at last**: all four routes
  deep-loaded cold as a 200 that is not a redirect, a made-up path rendering the
  not-found **route**, and `/assets/nope.js` a genuine 404. None of them is
  assertable against the dev server, which answers all three with a 200
- **It polls before it starts.** The frontend's upload is not atomic and its
  window opens at the exact second the deploy reports success, so the readiness
  probe waits until the document and every hashed asset it names are served
  **together**
- **It says when it cannot trust itself.** A check running from one machine over
  one link cannot tell its own network from the environment — Task 1.11.7
  produced a 65-second "outage" that was a laptop — so when **both** halves fail
  at once it says to suspect the link first
- **axe runs here as a report rather than a gate**, the opposite of the local
  suite, because a contrast ratio is not a rollback and the same rules already
  gate the same source before the merge. The figures are printed so they can be
  compared: the deployed landing route reads **0 / 37 / 1**, the pre-merge
  gate's numbers exactly

It is deliberately **not** on a schedule. That would make it uptime monitoring,
which nothing in the roadmap owns, and it has a bill attached — a whole green
run costs the deployed backend **5 requests**, against an idle baseline of 4 per
30 s, which is negligible once per merge and is not negligible on a timer. It is
also deliberately not a required check: it runs after a merge, so requiring it
would gate on something that cannot have happened yet.

**It needs `packages/shared` built, and it says so rather than failing
strangely.** It drives nothing local, so there is no `pnpm build` in its path —
but the specs import the vocabulary they assert on, and that package is consumed
as built output. From a fresh checkout it stops with a message naming
`pnpm --filter @marketpulse/e2e typecheck`, which is `tsc -b` over exactly what
the specs import. That is the one failure a laptop with a built tree structurally
cannot reproduce and CI found on its first run. If you deleted `dist/` **by
hand**, run `pnpm clean` first: `tsc -b` decides what to re-emit from
`tsconfig.tsbuildinfo`, which still says the output is current.

The full statement of what a green **deployed** run does and does not certify is
in [`e2e/README.md`](e2e/README.md), and the sharpest limit is worth repeating
here: it compares its two addresses against the live environment and **cannot
detect both being wrong in the same direction.** Pointed at a stale frontend
origin with a matching backend origin, it passes — green — against the wrong
site entirely.

### `pnpm image` — the backend's container image

The backend deploys as a container. `pnpm image` builds it:

```sh
pnpm image     # -> marketpulse-backend:<short commit sha>
```

**The tag tells the truth about what is inside the image**, which took a rule
because it was got wrong once: Task 1.11.2 built before committing, so its image
is tagged with the _parent_ commit while the tree inside it is the child's. So:

| Working tree                     | Tag             | Note                                      |
| -------------------------------- | --------------- | ----------------------------------------- |
| clean                            | `b103e6c`       | the tag means the tree **is** that commit |
| dirty (tracked **or** untracked) | `b103e6c-dirty` | prints a line saying not to push it       |
| `MARKETPULSE_IMAGE_TAG` set      | that value      | for CI, which knows its own commit        |

A dirty tree is never refused — building a throwaway image while editing the
`Dockerfile` is the normal case, and a recipe that blocks it just teaches people
to bypass the recipe.

That is one command rather than a documented incantation because three of its
arguments are load-bearing and all three are easy to leave off:

```sh
docker build -f apps/backend/Dockerfile \
  --platform linux/amd64 \
  --build-arg NODE_VERSION="$(cat .nvmrc)" \
  -t marketpulse-backend:"<tag>" .
```

- **`--platform linux/amd64`** because Azure Container Apps requires it and this
  is an Apple Silicon machine, so a plain `docker build` produces an `arm64`
  image that runs perfectly here and cannot run there at all. It is the one
  thing about the image that a local run will not catch.
- **`--build-arg NODE_VERSION`** from `.nvmrc`, so the runtime Node major is
  written down once in the repository rather than twice. The Dockerfile
  deliberately gives that `ARG` **no default** — a default would silently win
  whenever the flag was forgotten, which is the drift the arrangement exists to
  prevent. Without it the build fails immediately on `node:-alpine`. BuildKit
  warns `InvalidDefaultArgInFrom` on every build; that warning is the
  arrangement working. A wrong major fails later and louder, at
  `pnpm install` in the builder, with `ERR_PNPM_UNSUPPORTED_ENGINE` — that is
  `engineStrict`, and it is a backstop rather than the tie, because it reads the
  `engines` range and would not catch a wrong patch.
- **A commit SHA and never `latest`.** The platform's own guidance is that
  static tags "can lead to caching problems and can make your app difficult to
  troubleshoot".

The build context is the repository root, because pnpm needs the workspace
manifest and the lockfile and neither is in `apps/backend`. `.dockerignore` at
the root is what keeps `node_modules`, every build output, `apps/frontend` and
**`.env`** out of it — that last one matters, because a build context is
assembled from the working tree and not from git, so being gitignored is not
enough.

Running it, the way the platform will:

```sh
docker run --rm -p 3000:3000 \
  -e HOST=0.0.0.0 \
  -e CORS_ORIGIN=https://your-frontend.example \
  --memory 512m --cpus 0.25 \
  marketpulse-backend:$(git rev-parse --short HEAD)
```

`HOST=0.0.0.0` is required in a container and **the startup line will not tell
you whether it took**. Fastify logs one `Server listening at …` line per bound
interface address with loopback first, so the first line reads `127.0.0.1`
whichever value you set, and the line count follows the machine's interfaces
rather than the setting. Read the socket:

```sh
docker exec <container> cat /proc/net/tcp    # 00000000:0BB8 … 0A  = 0.0.0.0:3000 LISTEN
```

`docker stop` sends `SIGTERM` to PID 1, which is `node` itself — the `CMD` is
the exec form and that is deliberate. A clean stop drains in about 4 ms and
exits 0; a held-open connection hits the server's own 5-second ceiling, logs
`shutdown timed out, forcing exit` at level 50 and exits 1. Both are well inside
Container Apps' 30-second grace, so the container always exits on its own rather
than being killed.

Some figures, so a change that doubles something is visible. Uncompressed
rootfs **188,920 KB**, of which the Node base image is 151.6 M and the artefact
`/app` is **16.3 M** — `dist/` is 196 K over 32 files and the rest is the
production dependency graph. Compressed, which is what a registry stores and the
platform pulls, **60,266,496 B**. Cold build 45.3 s, cached 25.3 s. Resident
memory is **62.0 MiB** idle and **70.6 MiB** after 500 requests, measured as the
cgroup working set against a 512 MiB limit — 13.8% of Container Apps'
smallest allocation.

Note that `docker images` and `docker image inspect` reported wildly different
sizes for the same content (254 MB and 60.3 MB) because buildx and the
containerd store mix compressed and uncompressed views. `du -sx /` inside the
container and `docker save | wc -c` are the two that reproduce.

What ships is produced by `pnpm deploy --filter @marketpulse/backend --prod
--legacy`, which copies the **package directory** — `dist/`, `package.json` and
`node_modules/` — and not `dist/` alone. Both halves of that matter: `dist/` on
its own dies at import time on `fastify`, and once `node_modules` is reachable
it dies again on the health route's read of `../../package.json`, so fixing the
obvious failure does not produce a working artefact. `--legacy` is required
because pnpm 10 and later refuse a non-injected workspace deploy; the
alternative, `injectWorkspacePackages: true`, would turn `@marketpulse/shared`
into a hard-linked copy for every developer and break `pnpm dev`'s watch loop.

Each package's `files` field is what keeps its `src/`, its `coverage/` report,
its Vitest configs and its compiled test files out of the artefact — `pnpm
deploy` copies the whole directory otherwise. `files` affects `pnpm deploy` and
`pnpm pack` only; the workspace symlink `pnpm dev` relies on is untouched.

Nothing is pushed anywhere. `pnpm image` builds and tags locally.

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
cp apps/backend/.env.example apps/backend/.env    # PORT, HOST, LOG_LEVEL, LOG_FORMAT, CORS_ORIGIN
cp apps/frontend/.env.example apps/frontend/.env  # VITE_API_BASE_URL
```

Copy the destination as written. A `.env` at the repository root is read by
**neither** package — the backend resolves its file from the configuration
module rather than from the working directory, and the frontend's `envDir` is
its own package root. Both are deliberate, and the failure is silent: the file
exists, nothing reads it, and the application starts on defaults as if it were
not there.

**You do not need either file to run MarketPulse.** Every backend variable has
a default, the frontend's one variable has a default, and a missing `.env` is
swallowed rather than reported — a fresh clone starts on port 3000 and
`127.0.0.1` with no file at all, and its page reaches that backend. That silence is
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

### Talking to the API from the browser

The frontend and the backend are two different origins — `http://localhost:5173`
and `http://localhost:3000` — so a browser applies CORS between them. One
variable says who is allowed:

| Variable      | Values                      | Default                 |
| ------------- | --------------------------- | ----------------------- |
| `CORS_ORIGIN` | One origin, matched exactly | `http://localhost:5173` |

The default is the dev server's own origin, so **a fresh clone works with no
`.env` at all**. A deployment should set this to the site's own origin; the
default is not safe by omission, because it would let a page served from
someone's local dev server call your API.

Three things that will otherwise cost you an afternoon:

- **A blocked request looks like a healthy one in the terminal.** The page says
  `TypeError: Failed to fetch`, which names neither CORS nor the origin, while
  the server logs the request and answers it **200**. The request is not
  blocked — the browser discards a response that was already produced. If the
  page says the call failed and the log says 200, this is why
- **`localhost` and `127.0.0.1` are different origins**, not two spellings of
  one, and the dev server genuinely does not answer on the IPv4 literal — it
  binds IPv6 loopback, while the backend binds IPv4. Set `CORS_ORIGIN` to
  whatever the browser's address bar says
- **`curl` cannot tell you whether CORS works.** The server sends the allowed
  origin to every caller, including one it does not allow; the browser is what
  compares and refuses. A 200 from `curl -H "Origin: …"` proves nothing about
  what a browser will do

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

Three behaviours worth knowing before you set either. All three were
re-measured in Task 1.7.7 rather than carried forward, and the second one had
already stopped being true:

- **At `warn` and above a healthy server is completely silent**, including its
  `Server listening at …` line. Nothing in a normal run emits above `info`.
  Measured at `warn`, `error` and `silent`: a full start → 200 → 404 → clean
  shutdown writes **zero lines** to stdout and zero to stderr. Anything waiting
  on the readiness line to decide the server is up will wait forever, which
  matters more for a deployment than for a terminal.
- **`silent` silences ordinary traffic, not a crash.** It exists for a test
  runner driving `buildServer()` under `app.inject()`, and it does silence
  errors — a 500 answered to a client leaves no log line at `silent`. But a
  process-level crash is a deliberate exception to the level, so a crashing
  server at `silent` writes exactly one line, the `fatal` record, and nothing
  else. The rule is: **ordinary traffic obeys the level; the process dying does
  not** — see below.
- **`LOG_LEVEL=debug` shows nothing that `info` does not.** Fastify's request
  logging is at `info` and nothing in this application emits below it, so the
  variable is real and its lower half is empty. Re-measured: the message sets at
  `info` and `debug` are identical.

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

#### When the process crashes

An `uncaughtException` or an `unhandledRejection` — something that escaped the
request lifecycle entirely, from a timer, a stray promise or a library callback
— is logged as a level-60 `fatal` record and the process exits 1.

```
{"level":60,...,"err":{"type":"Error","message":"boom from a timer","stack":"Error: boom from a timer\n    at …"},"event":"uncaughtException","msg":"process crashed, exiting"}
```

Node already printed that stack before these handlers existed, so this is not
about silence. It is about **which stream**: Node's default writes raw text to
stderr with no level, no timestamp and no pid, while every other record this
process writes is JSON on stdout — so a deployment collecting stdout lost the
crash and kept everything else. Node's two defaults are also indistinguishable
from each other; the `event` field is what tells you which one you had.

Three things follow that are worth knowing before you read a crash log:

- **A crash ignores `LOG_LEVEL`, including `silent`.** Ordinary traffic obeys
  the level; the process dying does not. Without the exception, `silent` would
  give a process that dies leaving nothing at all — not even Node's stderr
  stack, because these handlers replaced it.
- **A crash record has no correlation id**, because there is no request to take
  one from. This is the one case where "quote the `x-request-id` and find the
  log entry" gives an incomplete answer, and it can be actively misleading: a
  request can be answered `200` with a valid id and the process die
  milliseconds later on a rejection that request detached. Measured — the id
  points at a record saying the request succeeded, and it did.
- **In-flight requests are dropped, deliberately.** There is no drain: the
  process state is unknown by definition, so `app.close()` would serve
  remaining requests from a program that has already proved it is not the
  program you thought. A client mid-request gets `curl: (52) Empty reply from
server` and no headers at all — no `ApiError`, no `x-request-id`. That is the
  one hole in the error shape, and it is the reason a crash and a contained
  `500` are different failures rather than two sizes of the same one.

A route that throws is **not** a crash and never reaches these handlers: the
error handler answers an `ApiError`, logs the stack at level 50 under that
request's `reqId`, and the server carries on. See
[The API error contract](#the-api-error-contract).

A crash **during** a shutdown does not start a second one. The record is
written and the drain in progress finishes on its own — measured: a rejection
thrown mid-drain still produced `shutdown complete` and exit 0, with the
in-flight request answered.

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

### The frontend's one variable

`VITE_API_BASE_URL` is where the MarketPulse API lives, and it is the only
configuration the browser half reads. It is **optional**: unset, it falls back
to `http://localhost:3000`, which is `apps/backend`'s own default port and
host, so a clean clone with no `.env` file anywhere has a working pair.

That default and the backend's `CORS_ORIGIN` default of `http://localhost:5173`
are a **matched pair pointing at each other**. Change one without the other and
the local loop fails _in a browser_ while every server log stays green — the
failure shape described under [Talking to the API from the
browser](#talking-to-the-api-from-the-browser).

**It is substituted into the bundle at build time**, so it is not a deployment
setting:

```sh
VITE_API_BASE_URL=https://api.example pnpm build   # bakes the address in
```

One artefact therefore cannot be promoted from one environment to another —
pointing the frontend at a different backend is a rebuild, the same shape as
`base`. A build that forgets it does not fail; it ships a page dialling
localhost.

The name is checked in two independent places. `pnpm env:check` requires the
`VITE_` prefix on every name in `apps/frontend/.env.example`, because a
non-prefixed name is not a leak — it is a variable that silently never arrives.
And `apps/frontend/src/vite-env.d.ts` declares Vite's `strictImportMetaEnv`,
which removes `ImportMetaEnv`'s index signature, so a misspelled name at the
_reading_ site is a compile error (`TS2551`, with tsc suggesting the correct
name) rather than an `any` that evaluates to `undefined`. **Adding a variable
means adding it in both places, and nothing checks that pair.**

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

## The API error contract

Every failed request answers with the same JSON body, declared once in
`packages/shared` as `ApiError` and imported by both apps:

```json
{
  "code": "NOT_FOUND",
  "message": "Route not found.",
  "requestId": "d70b78aa-7cba-4724-80f9-114fd8b0d2c3",
  "details": ["optional, and only when there are several specifics"]
}
```

The three failures the server produces today, verbatim from a running instance:

```
GET /nope                                            -> 404
{"code":"NOT_FOUND","message":"Route not found.","requestId":"91fc8c77-..."}

POST /health  content-type: application/json  body: {oops   -> 400
{"code":"BAD_REQUEST","message":"Body is not valid JSON but content-type is set
to 'application/json'","requestId":"f35067d1-..."}

a route that throws                                  -> 500
{"code":"INTERNAL_ERROR","message":"An unexpected error occurred.",
 "requestId":"bc58ce02-..."}
```

`requestId` is always the same value as the response's `x-request-id` header,
and the same value the log records for that request carry as `reqId`. Quoting
it from a failed response is how you find the log line — which, for a 500, is
the one holding the real message and the stack.

Flat rather than wrapped in an `error` key, because `requestId` is a property
of the response and not of the failure — the same id is on every successful
response too, as `x-request-id` — so a wrapper would either misfile it or need
two levels for four fields. The HTTP status already says that this is an error,
and there is deliberately no `statusCode` in the body repeating it.

`code` is a union rather than a free string, so a client can branch on it
without matching prose that may be improved later. It has three members —
`NOT_FOUND`, `BAD_REQUEST` and `INTERNAL_ERROR` — and every one of them names a
failure the server can actually be made to produce, rather than one somebody
imagined. `BAD_REQUEST` covers every 4xx that is not a 404, including a 413:
both mean "your request was not acceptable, fix it and retry", and the HTTP
status line still carries the specific difference. The union is meant to grow;
a new member is a non-breaking addition.

A **5xx never carries the real message**. The thrown error's own message goes
to the log beside the correlation id and never to the client, because a message
written for a developer — `connection to postgres at 10.0.0.4:5432 refused` —
is internal detail even though it is not a stack. A 4xx passes Fastify's own
message through, because it describes the client's own request.

`details` is a list of strings and never an arbitrary object, because an
open-ended object is the field internal detail leaks through. Every entry is a
sentence already fit to show a user.

This is a **transport** error. "Not enough evidence to explain this move" is a
successful response carrying an uncertain finding, and has nothing to do with
this shape.

The correlation-id header name lives in `packages/shared` beside it, as
`REQUEST_ID_HEADER`. Import it; a mistyped header name is a compile error
nowhere.

Note that `packages/shared` is consumed as **built output**, so changing this
shape means rebuilding it before either app typechecks against the change.
`pnpm build` and `pnpm verify` handle the ordering; a bare `tsc --noEmit` in an
app will pass against the previous shape.

### Response schemas

Routes declare a JSON Schema for their responses, using Fastify's built-in
support — no extra dependency, since ajv and `fast-json-stringify` arrive with
Fastify. `GET /health` is the first.

The reason is not validation, it is that Fastify serialises through
`fast-json-stringify`, which **strips any property the schema does not
declare**. A field that should not reach a client cannot, whether or not
somebody remembered.

That is the second of two mechanisms behind "no internal detail reaches a
client", and it is per-route and opt-in. The first covers everything: error
bodies are built by `apiError()`, which constructs an object with no slot for
anything else. The serialiser is what catches a handler that adds a field
anyway — measured, a body decorated with `stack` and `cause` reached the wire
as the four contracted fields on a route declaring the schema, and with both
extras intact on one that did not. Declare `500: apiErrorSchema` on routes that
can fail; note the not-found handler is not a route and can never have one,
which is why the constructor is the mechanism that has to hold.

The trap is that the stripping is silent: add a field to the response type,
forget the schema, and it disappears at runtime with a green build. The house
idiom closes that without a dependency — the schema's properties are declared
`satisfies Record<keyof TheResponseType, JsonSchemaProperty>`, so a field on
the type and not in the schema is a compile error naming it. Copy that idiom
when adding a route. Two smaller gaps are known and accepted: a declared
property whose JSON type disagrees with the TypeScript one is coerced silently,
and a `required` property the handler omits is a 500 at runtime rather than a
compile error.

## Styling and design tokens

CSS Modules over CSS custom properties, with **Base UI** (`@base-ui/react`)
supplying behaviour for anything interactive. There is no CSS-in-JS: styles are
resolved at build time and shipped as one stylesheet, currently 10.93 kB for
the whole design language, the chrome, the layout and the error fallback. The reasoning is in
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

The addresses, and what is in each of them today, are in
[Running MarketPulse](#what-you-are-looking-at); this section is how they are
wired rather than what they show. The not-found route keeps the chrome intact
like any other route, because it is a route.

The chrome — product name and a status strip of **three** regions (market feed,
backend service, a reserved market clock), then the navigation — is
`components/AppHeader`, rendered once outside the route table so it
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

**Deep-linking works locally for a reason that would not have survived
deployment, so it was configured rather than inherited.** `/replay` typed
straight into the address bar works against `vite` and `vite preview` for a
reason that flatters them: both answer _any_ unmatched path **a browser asks
for** with `index.html` and a 200 (`vite preview` 404s the same path under
`Accept: application/json` — see the warning beside `pnpm preview`). The same build served by a plain static host **404s** every route
but `/`, and the not-found route rests on exactly the same property — it can
only render if the host served `index.html` for an address that matched
nothing.

The deployed host is configured for it, in
**`apps/frontend/public/staticwebapp.config.json`**, and the configuration is
deliberately **not** a blanket catch-all: `navigationFallback` rewrites to
`/index.html` with `exclude: ["/assets/*"]`, so an unmatched route is a 200
carrying the application and a missing asset is a **404 naming itself** rather
than a MIME-type error. Both were read from the deployed site.

**Anything added to `apps/frontend/public/` needs an `exclude` entry in the
same change.** A file there lands at the root of the artefact, outside
`/assets/*`, and a missing one is then answered with `index.html` and a 200 —
the trap above, alive in production. Nothing checks this.

## When something fails to render

The frontend contains a render failure to the box it happened in. There is no
global error screen and there is no reload button — `PRODUCT_SPEC.md` §36 asks
for local degradation, and a page reload discards the rest of a working screen,
which is the thing being avoided.

Three boundaries, and they nest:

```
ErrorBoundary  around AppHeader          a broken chrome leaves the page below working
ErrorBoundary  around the route outlet   the affected area on the four single-area routes
ErrorBoundary  inside each Region        the landing route's four regions fail independently
```

React uses the nearest boundary, so a failure in a region's contents never
reaches the outlet. The region boundary is **inside** the `<section>`, which is
what keeps the heading, the explanatory line and the `region` landmark when the
contents are gone: a failed region is a labelled box with a problem in it,
rather than a hole in the layout.

**The chrome is the one place containment is not local, and the cost is stated
rather than discovered.** The header's fallback replaces the `<header>`, so a
broken chrome takes the banner landmark and the whole navigation with it. What
survives is everything below it and the address bar, which is the recovery that
is left. It is still much better than the alternative: without that boundary a
header that throws leaves `#root` with **zero** children — a blank document.

**The fallback never shows the error.** Not the message, not the stack. It is
the same rule the backend's 5xx follows, for the same reason — a message
written for a developer is internal detail too. The error is in the browser
console with its component stack, which is where a developer already is.

**Recovery is a reset.** "Try again" remounts the failed subtree and nothing
else; the document is not reloaded and the rest of the screen never blinks.
If whatever failed is still failing, the fallback comes straight back, which is
the correct answer rather than a broken button.

### What a boundary does not catch

A React error boundary catches errors thrown **during render**, in **lifecycle
methods** and in **constructors**. It catches nothing thrown in an **event
handler**, a **`setTimeout`**, a **promise callback**, or anything else running
outside the render pass — and neither does React's `onUncaughtError`. Measured:
a button whose `onClick` throws leaves every region rendering normally, no
fallback anywhere, and produces no report at all. The only thing that sees it
is a `window` `error` listener.

That is deliberately not installed. It is the browser's analogue of the
backend's `process.on("uncaughtException")`, and the argument that justified
those handlers does not carry over: they earned their place by moving a crash
out of raw stderr and into the log stream every other record goes to. A browser
has no second stream — an uncaught error is already in the console with its
stack, which is exactly where a report would go — so a listener would repeat
what is there while also catching every browser extension on the page. It
becomes worth having the day there is a server endpoint to send it to.

### Reporting

`createRoot` is given `onCaughtError`, `onUncaughtError` and
`onRecoverableError`, all three routed to `apps/frontend/src/report-error.ts`.
Providing them **replaces** React's own console message rather than adding to
it, so this is a choice of wording and not an extra line of noise; what it buys
is one place to change when there is somewhere to send a report, and a message
that says which of the three events it was.

That replacement is **React's behaviour, not ours**, so it is the claim here
most likely to stop being true on an upgrade. Re-check it rather than trusting
this paragraph: a caught render failure should produce exactly one console
entry, ours, carrying the component stack, with React's "The above error
occurred in …" absent. Verified on React 19.2.8 in both the dev server and the
built artefact — and in development, with `StrictMode` on, it is **one** report
and not two: the constructor does run twice, but the first throw aborts that
render pass and React reports the failure once.

An `uncaught` report means a boundary is missing, and the blank document
described above is what that costs — measured rather than hypothetical.

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

## Continuous integration

The pipeline is [`.github/workflows/verify.yml`](.github/workflows/verify.yml),
one job on `ubuntu-latest`. **Its verification step is `pnpm verify` and nothing
else** — the same command and the same seven steps this README documents, run by
name. CI keeps no list of what "verified" means, which is why `stories`,
`env:check` and `test:process` all reached the pipeline without a workflow edit.

```
Check out → Set up Node from .nvmrc → Enable Corepack → Record the toolchain
  → Resolve the pnpm store path → Cache the pnpm store → Install
  → Confirm the Rolldown binding by name → Confirm esbuild's install script ran
  → Verify → Fingerprint the frontend artefact → Coverage → Upload the reports
```

**When it runs.** On `pull_request` for every branch, on `push` only to `main`,
and on demand through `workflow_dispatch`. A pull request from a branch in this
repository fires both events, so an unrestricted `push:` would run the whole
chain twice for one change — and the two are not the same check: a
`pull_request` run verifies the **merge commit**, which is what would land, and
a push run verifies the branch tip, which is not. The cost is stated rather than
hidden: **a branch with no pull request open is not verified at all.** Use
`workflow_dispatch` for that case. Superseded runs are cancelled on every branch
except `main`, where a run is the record of what that commit does.

**The toolchain comes from the same two pins your machine uses.** Node from
`.nvmrc`, pnpm from `packageManager` through `corepack enable`. There is no pnpm
install step and no version literal in the workflow. `engineStrict` is what
actually catches a wrong Node — the workflow's own version assertion cannot,
because it only catches a runner that disagrees with the pin, never a pin that
is wrong.

**What is cached, and what must never be.** The pnpm **store**, keyed on the
lockfile hash, the runner OS and the Node major. To bust it by hand, bump `v1`
in both the key and the restore-key in the workflow — that is the whole
procedure. Nothing under `dist/`, `storybook-static/` or any `.tsbuildinfo` is
cached, ever: caching the build moves exactly one step by about 2.5 s, and buys
a restored build directory that `tsc -b` may trust and
[`pnpm test`](#what-pnpm-test-covers) will fail against silently. Judge the
cache categorically rather than by the clock — `cache-hit: true` with
`reused 397, downloaded 0` is a hit, `reused 0, downloaded 397` is a miss, and
the runner-to-runner spread on identical work is larger than the whole install.

**Do not read a total as a regression.** Two runners measured 31,075 ms and
21,989 ms on the same commit, and nine runs of one tree spanned
18,589–32,210 ms. Read the per-step split in the job summary and the install
line, not the total.

**What a run publishes.** Every run's summary carries three sections in a
deliberate order: the per-step split of `pnpm verify`, then the frontend
artefact's fingerprint (every file with its size and md5 — that is a record, not
a check, so nothing asserts the hash), then the coverage table last, because it
is the one section the tick does not certify. The three `coverage/` directories
are uploaded as an artefact for **7 days**. `storybook-static/` is not uploaded,
and neither is `dist/`.

**Coverage runs in the pipeline and gates nothing.** It is a separate step,
outside the chain, marked `continue-on-error` — so no coverage outcome can turn
the badge red, and there is no threshold. The one thing it does assert is that
both 0% entrypoints are still **present** in the report: presence, never a
percentage, so a task that makes one of them reachable does not fail it. See
[`pnpm coverage`](#pnpm-coverage--on-demand-and-never-in-verify) for what those
figures do and do not mean.

**The green tick is a required status check on `main`**, and that is repository
configuration no file here can hold — see [the gate
itself](#the-gate-itself-is-configuration-and-no-file-here-can-hold-it).

**Renaming the workflow file means editing the badge URL in the same commit.**
Three identifiers are independent: the badge URL keys on the **file** name, the
required check on the **job** name, and the badge's label on `name:`. A badge
left pointing at a renamed file does not go red — it serves the last conclusion
it ever had for a while, and then becomes a broken image. Both were measured.

The reasoning behind all of it, including what was rejected, is in
[ADR 0010](docs/adr/0010-continuous-integration-what-the-tick-certifies.md).

## What `pnpm verify` does not cover

A green tick means every **check** passed. It does not mean every **claim** in
this repository holds. Five things sit outside the net, deliberately, and they
are listed here rather than left for a reader to assume the badge covers them.
Last re-checked **2026-09-04**, by measurement rather than by reading this list.

**1. `apps/backend/scripts/dev.sh`.** ESLint sees only JavaScript and
TypeScript, Prettier has no shell parser, and `tsc` has no view of it —
`prettier --file-info` reports `"inferredParser": null` for it and ESLint
reports `File ignored because no matching configuration was supplied`. It is
the file that starts the development loop, and since Story 1.7 it carries
`export LOG_FORMAT="${LOG_FORMAT:-pretty}"`, the one configuration value
[`pnpm env:check`](#pnpm-envcheck) cannot see. A typo there is not an error; it
is a silent fallback to JSON logs in the dev loop.

**2. The `rm -rf` fragments in two `clean` scripts** — the root's and
`apps/frontend`'s — unchecked shell inside a JSON string. The other two
packages' `clean` is a bare `tsc -b --clean` and is not a third.

**`shellcheck` is not installed and that is a decision, not an oversight.** One
small shell file and two short strings do not justify a new root dependency and
another step in the chain. If a third shell file appears, revisit it.

**3. A stated invariant that has quietly stopped being enforced.** This is the
one CI structurally cannot help with, and the only kind that has actually
caused a wrong claim to stand. `apps/frontend`'s explicit `types` array was
documented in three places as making `process` a compile error in browser code;
it stopped being one when `.stories.tsx` files entered the program and dragged
`@types/node` in through a triple-slash reference, and it stayed wrong for two
stories with every tool green. Re-measured today and still true: a probe under
`apps/frontend/src/` reading `process.env` and importing `node:path`
typechecks at exit 0, and **only ESLint reports it** — `no-restricted-globals`
and `no-restricted-imports`, both of which exist because of this. Two of the
repository's own checks were built for this reason and both were made to fail
before they were trusted.

Story 1.10 added two more of this kind, inside the test suites:

- **The two-runner partition in `apps/backend` is a naming convention with
  nothing behind it.** Two Vitest configs split `src/**/*.test.ts` between
  them — the unit config excludes `*.process.test.ts`, the process config
  includes exactly that. A process-style test named `src/thing.test.ts` runs in
  the **fast** suite instead, making it conditional on a build; a
  `*.process.test.ts` file added to another package runs **nowhere at all**,
  because no other package has a second config. Both are green
- **[`pnpm test:process`](#pnpm-testprocess--the-backends-process-half) on a
  stale `dist/` tests the previous commit and passes.** What guards it is
  `pnpm verify`'s ordering plus an existence check naming `pnpm build` —
  presence, not freshness. A staleness check was built for this and removed
  after it was measured: `tsc -b` re-emits from content hashes, so a
  `git checkout` makes every source newer than every output without changing a
  byte, and the mtime comparison failed a correct tree on its first run

**Story 2.1 added one, and it is the reason the local database exists at all.**
`LOCAL_DATABASE.version` in `scripts/local-database.mjs` is `18` because Task
2.1.1 chose PostgreSQL 18 for the managed server. **Nothing compares those two
numbers.** The deployed version lives in an `az` argument and in
[HOSTING.md](planning/epic-01-application-foundation/story-11-deployment-pipeline-and-dev-environment/HOSTING.md),
neither of which any tool here reads, and a check would need Azure credentials —
which `pnpm verify` deliberately does not have, so building one would fork the
definition of "verified" in the way the pipeline's founding rule exists to
prevent. A drift is silent in both directions and its whole symptom class is
"works locally, wrong in production", which is exactly what pinning the version
was for. The one-liner is
`docker compose exec postgres postgres --version` against the server's
`az postgres flexible-server show --query version`.

**Story 1.13 added four more, and moved one of them out of this list by
building a check for it.** The full argument — including what separates the ones
worth checking from the ones worth writing down — is in
[ADR 0013](docs/adr/0013-browser-testing-two-suites-and-what-a-green-run-certifies.md).

- **The only thing keeping the browser suite out of `pnpm test` is that
  `e2e/package.json` has no `test` script.** The package joins every `pnpm -r`
  fan-out automatically — measured at "Scope: 4 of 5 workspace projects" — so
  the day somebody adds one, `pnpm test` starts needing two servers, a build and
  a browser binary on a clean clone, which is the outcome two earlier tasks
  spent themselves preventing. Nothing checks the absence, and a manifest cannot
  hold a comment saying why
- **The two `axe-core` pins must match and there is no manifest for them to be
  compared in.** `e2e` declares 4.13.0 to match the version
  `@storybook/addon-a11y` resolves; `apps/frontend`'s arrives transitively. Two
  versions would make the workshop and the browser suite report different
  numbers for the same page, which makes both untrustworthy rather than one of
  them wrong. The one-liner is `ls -d node_modules/.pnpm/axe-core@*`, which must
  print exactly one entry
- **Two jobs now restore the pnpm store or browser cache without saving it**,
  because two savers race to a warning that reads like a fault. `verify`'s
  `verify` job owns saving the store and its `e2e` job owns saving the browser —
  remove either saver and the other jobs install cold forever, silently. The
  ruleset likewise keys on **two** job names now, so renaming either
  un-requires it with no error anywhere
- **The deployed check cannot detect both its addresses being wrong in the same
  direction.** Pointed at a stale frontend origin with a matching backend
  origin, it passes green against the wrong site. The only check for it would be
  a fourth independent copy of the address, which is the thing the two-inputs
  design exists to avoid

**And one that used to be prose and is a check now**, because unlike the four
above it is reachable from an assembled instance. The axe gate's whole value
depends on the browser having computed real styles: a renderer that skipped
style computation reports **zero violations by being blind**, which a green run
structurally cannot tell apart from success. `expectTheRendererComputedStyles`
now asserts that `color-contrast` appears in axe's `passes` with more than zero
nodes, in both the local gate and the deployed report, and it was made to fail
before it was trusted.

**4. The figures in this document, and its internal links.** Nothing reads
either. The two halves are not alike, and the decision differs between them.
The links **are** cheap to check and have been checked six times, most recently
on this document's own last edit: 110 tracked Markdown files, **214** cross-file
links, **22** anchor links, **0 broken** — with a slugger that does not collapse
whitespace, or the correct double-hyphen anchors in this document read as
broken. Note the two counts moved between the fifth reading and the sixth, one
task apart, which is the point of the sentence after this one rather than a
contradiction of it. **The figures cannot be
checked at all**, and they are the half that goes wrong: a stylesheet size
stood stale for two stories, three more figures were wrong in a single reading,
and the heading count recorded for this file one task ago was 42 against an
actual 36 — six `#` comment lines inside fenced code blocks.

**A link checker was built, run and declined.** It would be a gating step
guarding the one thing that has never rotted, while the half that rots every
story stayed open — and its presence in the chain is what would make this
section look covered. The reversal trigger is a broken link actually shipping,
or documentation gaining generated content whose links are not hand-written. If
it is ever built it is an eighth `pnpm verify` step and a script under
`scripts/`, never a CI-only step: a check CI runs and your machine does not
forks the definition of "verified", which is the whole reason the pipeline runs
`pnpm verify` by name.

**5. The workflow files' schema — and this one is only half a gap.**
`.github/workflows/verify.yml` and `deploy.yml` are YAML, and Prettier **does**
read them:
`prettier --file-info` infers the `yaml` parser, and a badly-formatted probe
workflow dropped into that directory fails `pnpm format:check` by name. So its
formatting is inside the net. Its **schema** is not — a misspelled key, an
action reference that does not resolve, or a `runs-on` label GitHub retires are
all green locally and red only on the runner. `actionlint` would close it and
is declined for the same reason `shellcheck` is: a small number of small files.
The same shape covers `.github/dependabot.yml`,
`apps/frontend/public/staticwebapp.config.json` and — since Task 2.1.2 —
**`compose.yaml`**, whose formatting is checked and whose meaning is not. All
three were measured with the same one-liner rather than assumed:
`prettier --file-info compose.yaml` reports `"inferredParser": "yaml"`, and
ESLint reports `File ignored because no matching configuration was supplied`.
So a malformed edit to the local database's definition fails `format:check` by
name, and a misspelled Compose key, a healthcheck that tests the wrong thing or
a volume mounted at a path the image does not use are all green locally.

**Two files that were expected to join this entry and did not.**
`e2e/playwright.config.ts` and `e2e/playwright.deployed.config.ts` are the first
tool configuration files here that are **not a gap of any kind**: `e2e/tsconfig.json`'s
`include` is `**/*.ts`, so they sit inside the project, `--print-config` reports
the same 168 rules on them as on a source file, `no-floating-promises` applies,
and Prettier formats them. Two instances make that a property of that one
`include` line rather than a coincidence.

**`deploy.yml` widens this half-gap rather than adding a sixth entry, and it is
worth knowing which way.** Its schema is unchecked like `verify.yml`'s, and it
additionally contains things no schema could check: an Azure resource name, a
role assignment that lives in nobody's tree, and `VITE_API_BASE_URL`, whose
absence produces a page that loads, renders and cannot reach the backend with
every signal green. The variable is in the workflow file rather than a secret
precisely so a human review is the check.

**Inside that half-gap was the part nothing watched at all, and it is closed
now.** The workflows pin **five** third-party actions to commit SHAs across
**eighteen** uses and **six** distinct `uses:` references —
`actions/checkout`, `actions/setup-node`, `actions/cache`,
`actions/cache/restore` (a sub-action of `actions/cache`, at the same SHA),
`actions/upload-artifact` and `azure/login` — and a SHA does not follow security
releases, which is the point of pinning it. `pnpm outdated` has no view of a
YAML file and the lockfile has no view of GitHub. Task 1.10.7 declined
Dependabot on a one-file argument and named a **fifth action** as the reversal
trigger; `azure/login` is the fifth, so the trigger fired and it is enabled —
`.github/dependabot.yml`, `github-actions` only, weekly. It is a **file**, not
the repository setting that note assumed, so unlike the branch ruleset it is
visible in a diff. It opens pull requests and merges none. npm is deliberately
not enabled. Count the actions out of the files rather than trusting this
paragraph — the number grows whenever a step is added, and it has been wrong
once.

### Two things that read like gaps and are not

**The pipeline's per-step split and its coverage table are diagnostics, not
checks.** Both are _derived_ from pnpm's own output — the step names come from
the `$ pnpm run build && pnpm run lint && …` line the chain announces, and the
per-package coverage rows from `pnpm -r`'s line prefixes. That is what lets a
new step appear in CI with no workflow edit, and the cost is that a pnpm
upgrade changing either format prints nothing, or the wrong names, **on a run
that is still green**. It is harmless by construction: the exit code is the
chain's and never the parser's. A silently empty split is not a failing build.

The one real assertion in the coverage step is that both 0% entrypoints are
still **present** in the report — presence rather than a percentage, so the
task that makes one of them reachable does not fail it.

**A `continue-on-error` step reports `conclusion: success` however it exited.**
The coverage step is marked that way on purpose, so that no coverage outcome
can turn the badge red; the real result is `steps.<id>.outcome`, and a failure
shows up as an annotation rather than a red tick. This looks exactly like CI
swallowing a failure and is not. Two rules follow: never write a later step's
`if:` against a `continue-on-error` step's `conclusion`, and never read the
absence of an annotation as "coverage was fine".

### The gate itself is configuration, and no file here can hold it

`verify` is a **required status check on `main`**, through repository ruleset
`main` (id 22160620) — and since Task 1.13.4 **`e2e` is a second one**, so a red
browser journey blocks a merge exactly as a red chain does. The ruleset requires
a pull request and both checks. Nothing in this repository records it, no tool reads it, and `pnpm verify` cannot see it —
so **the repository has no way to detect its own gate being switched off**, and
a reader who finds it absent cannot tell whether it was removed or never set.
Four things about it are worth knowing:

- It keys on the **job** name, so renaming either job in `verify.yml`
  un-requires it silently. The workflow, its first job and its file are all
  called `verify` for exactly this reason, and the second job is called `e2e`
- A reader finding only `verify` required should read that as the browser gate
  having been **removed**, not as it never having been set
- **Admin bypass is retained**, so a red run is a decision to override rather
  than a wall — and a merged red run leaves no trace in any file
- `require_extra_approval_for_unattributed_changes` is **off**, against
  GitHub's default of on: with no required approvals it would otherwise block
  the maintainer's own pull request over a co-author trailer that resolves to
  no account
- `strict_required_status_checks_policy` is **off**, because a `pull_request`
  run already verifies the merge commit rather than the branch tip

What it binds is the chain, and **nothing about coverage** — the job is green
whatever the coverage step did.

## Editor setup

None required. `.editorconfig` covers indentation, charset and line endings in
any editor that reads it; WebStorm additionally gets `.idea/prettier.xml`
checked in, with format-on-save enabled against the same `prettier.config.mjs`
the CLI uses. VS Code users want the Prettier extension and nothing else.

## Documentation

- [`docs/adr/`](docs/adr/) — architecture decision records, newest last;
  [0010](docs/adr/0010-continuous-integration-what-the-tick-certifies.md) is the
  most recent and covers the section above: why the pipeline runs `pnpm verify`
  by name and defines nothing of its own, why per-step timings are derived from
  the chain's own output rather than declared, why the store is cached and the
  build never is, why coverage runs in the pipeline and gates nothing, and what
  the green tick does not certify.
  [0009](docs/adr/0009-the-test-runner-conventions-and-coverage.md) covers the
  two testing sections above: why the runner is Vitest,
  why test files sit beside their subject inside `src/`, why there is one
  config per package and no root one, why the DOM environment is jsdom when
  every measurement favoured happy-dom, and why coverage is on demand with no
  threshold. [0008](docs/adr/0008-the-local-development-loop.md) covers how the
  pair was made legible in one terminal, why the browser talks to the API
  through real CORS rather than a Vite proxy, why the frontend's ports are
  literals, and why `pnpm ready` is a script and deliberately not a
  `pnpm verify` step.
  [0007](docs/adr/0007-logging-the-error-contract-and-failure-containment.md)
  covers structured logging, the correlation id, the `ApiError` wire contract,
  the crash handlers and the frontend's error boundaries — including why the
  same analysis installs a process-level handler on the server and declines the
  equivalent listener in the browser
- [`planning/PRODUCT_SPEC.md`](planning/PRODUCT_SPEC.md) — the authoritative
  product definition
- [`planning/EPICS.md`](planning/EPICS.md) — the delivery roadmap
- [`CLAUDE.md`](CLAUDE.md) — working notes for AI coding agents; also the
  fastest description of the repository's sharp edges for a human
