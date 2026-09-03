# Story 1.13 — End-to-End Browser Testing

**Status:** Not started
**Epic:** [Epic 1 — Application Foundation](../EPIC.md)
**Depends on:** Stories 1.10, 1.11, 1.12
**Epic scope covered:** user-journey test foundations — an addition to this epic's scope, see the note at the end

## Description

Give this repository its first test that drives a real browser, against a real pair of running servers, the way a user does. Story 1.9 built the unit, integration and component levels and one process level; every one of them stops at a boundary that matters — jsdom is not a browser, `app.inject()` has no socket, and neither can see the two halves talking to each other at all.

The story exists because that boundary has already produced a measured, shipped-shaped failure this repository cannot catch: **with a wrong `CORS_ORIGIN` the browser reports `TypeError: Failed to fetch` while `curl` with the same `Origin` gets a 200 with a full body and the server logs `statusCode: 200`.** Every instrument in the repository says the system is healthy. Task 1.11.7 named that gap when it declined a browser-driven check, and named Story 1.12 as the first story capable of shipping the failure. Story 1.12 ships it; this story is what can see it.

It is deliberately a **foundation** story rather than a suite: one tool, one place for specs to live, a small number of journeys that are worth the cost, and a clear statement of what a green run does and does not certify.

## Conventions from Story 1.1

Story 1.1 is complete, and these four bind this story. They are stated in every Epic 1 story so each one can be read on its own; the full reasoning is in `docs/adr/0001-repository-structure-and-typescript-toolchain.md`.

- **`pnpm verify` is the acceptance command** — `build && lint && format:check && stories && env:check && test && test:process`, chained with `&&` so the first failure is the exit code. It took its fifth step in Task 1.4.5: `stories` fails if a component has no stories file, and `build` now also produces the Storybook bundle. It took its sixth in Task 1.6.6: `env:check` fails if `.env.example` and `CONFIG_VARIABLES` have drifted apart, which is what makes the documented variable set a checked claim rather than prose. It took its **seventh** in Task 1.10.5: `test:process` runs the backend's ten process-level tests against a spawned `dist/index.js`, which is why the chain building before it runs is load-bearing rather than incidental. This story passes it from the repository root. Prettier owns Markdown as well as code, so an unformatted planning document fails it too
- **Six verbs, identical in every package** — `dev`, `build`, `test`, `lint`, `typecheck`, `clean`. Only `test` and `dev` fan out with `pnpm -r`; the rest run their tool once from the root, because the reference graph and ESLint's project service already cover the workspace in one pass. Changing what a verb means in one package means changing it everywhere, or saying why not
- **Shared tooling lives at the workspace root; packages declare only what they actually import.** ESLint, Prettier and TypeScript are root-only devDependencies, and pnpm puts the root's `node_modules/.bin` on every package script's PATH. A library the code imports belongs in the package that imports it — `@types/node` in `apps/backend` is the counter-example that keeps the rule from being over-applied
- **The module setup is ESM-only and single-file-safe** — `"type": "module"`, `module: nodenext`, `isolatedModules`, `verbatimModuleSyntax`, and relative imports carrying `.js` extensions from `.ts` files (TS2835 without one). `packages/shared` is consumed as **built output**, so it must be built before any consumer can be typechecked; `tsc -b` orders that itself, which is why `typecheck` and `build` are the same command

~~One thing that is true today and will not be forever: until Story 1.9 lands, **`pnpm test` passes because there are no tests** — all three `test` scripts are `echo` placeholders that exit 0, and they are now the only placeholders left.~~ **No longer true as of Story 1.9 (2026-09-03)** — `pnpm test` runs **103 real tests** across 13 files (7 in `packages/shared`, 49 in `apps/backend`, 47 in `apps/frontend`) and there is no `echo` placeholder anywhere in this workspace. A green tick now means those 103 tests passed, and specifically **not** coverage: `pnpm coverage` is the separate command that measures that, and ~~the backend's process half is unreachable by any runner here~~ — **that stopped being true in Task 1.10.5**, which added `pnpm test:process`: ten tests spawning a real server, and a seventh step in the chain. The coverage figure did not move, because a spawned child is invisible to the runner's instrumentation. The companion note about both apps' `dev` scripts being placeholders stopped being true earlier still — Stories 1.2 and 1.3 made all three real.

## What that means for this story

- **The six-verb convention and the `pnpm -r` fan-out are the first thing this story can break, and the failure is silent.** Root `test` is `pnpm -r run test` and root `coverage` and `dev` fan out too, so **a fourth workspace package joins all three automatically the moment its directory matches a `pnpm-workspace.yaml` glob**. If that package's `test` script is the browser run, `pnpm test` stops being the fast suite developers run all day and starts needing two servers — which is precisely the argument Story 1.9 used to keep the process suite out of `pnpm test` and Task 1.10.5 honoured with a second command. Decide the package's script names against that, not against the convention alone
- **Root `build` hardcodes a package name — twice — and is the one root script that does.** `tsc -b && pnpm --filter @marketpulse/frontend exec vite build && … storybook build`. `CLAUDE.md` already carries the instruction: read the root `build` whenever a package is added. A fourth package that needs no bundle needs no entry, but that is a decision to take rather than an omission to leave
- **A `.ts` file outside a package's tsconfig `include` is a hard failure, not a silent skip.** ESLint's project service only ever discovers a `tsconfig.json`, and a file it has no program for is `was not found by the project service` at parse time — the whole type-aware pass is lost. That is why Story 1.9's tests live in `src/` beside their subjects, and it is the single biggest constraint on where E2E specs can live. The `disableTypeChecked` block at the end of `eslint.config.mjs` is the escape hatch for config files and it must stay **last**; it already covers seven files and both `.storybook/` entries
- **`allowBuilds` will almost certainly fire, and it is the second time in this repository's history.** `esbuild` is the only entry today, added in Task 1.4.5. A browser runner downloads binaries in an install script; an un-allowlisted one **fails the install outright** with `[ERR_PNPM_IGNORED_BUILDS]` at exit 1, and **pnpm rewrites `pnpm-workspace.yaml` when it fires**, appending a stub that is itself invalid until edited. A tracked file changing under you is part of the failure mode, not a stray edit. Allowlist the specific package; never disable the check
- **`pnpm verify` runs with no servers up, and that is why `pnpm ready` is not a step in it.** Everything this story writes needs a running pair or a deployed URL, so the default answer is that E2E is **not** a `verify` step — the same category as `ready`, `image` and `coverage`. That collides with Story 1.10's rule and the collision is real; see the Story 1.10 section below
- **Do not let the browser become a way to assert the things the other levels deliberately refuse to.** The must-not-assert list is measured rather than stylistic: not colour, not a single element's text where a component splits it, not a `useId()` value, not a DOM snapshot of a route, and **not latency**. A browser makes every one of those easy to write and none of them true
- **The frontend has no runtime configuration.** `VITE_API_BASE_URL` is substituted at build time, so a harness cannot point a built artefact at a different backend — that is a rebuild. A local run and a deployed run are therefore two different artefacts, not one artefact with two settings

### What Story 1.3 hands this story

- **Both frontend servers bind IPv6 loopback and the backend binds IPv4.** `vite` and `vite preview` listen on `[::1]`, so `curl http://127.0.0.1:5173/` is connection-refused while `localhost` works; the backend defaults to `127.0.0.1` and is the reverse. Node's `fetch` tries both families and a browser resolves either, so this bites a harness's readiness probe rather than its page loads — `scripts/check-ready.mjs` already encodes the answer
- **`vite preview` is not a static host and mistaking it for one hides a real failure.** Its SPA fallback answers any unmatched path with `index.html` and a 200 — `/assets/nope.js` included — so a missing asset arrives as a MIME-type error rather than a 404. A suite that proves deep-linking against `preview` proves nothing; `python3 -m http.server` 404s both, and the deployed host is the only thing that answers the real question
- **The dev server does not typecheck**, and a type error is applied as an ordinary hot update with no overlay. A browser run against the dev server is green on a tree that does not compile

### What Story 1.5 hands this story

- **Two of Story 1.5's acceptance criteria are properties of the host, and they were closed by hand in a browser.** Task 1.11.4 loaded all four routes cold, rendered `NotFound` at a made-up path and confirmed `/assets/nope.js` is a 404 — against the deployed site, because on a dumb host every deep link is a 404 before React exists and **the not-found route rests on the same property**: `NotFound` only renders if the host served `index.html` for the address that matched nothing. Those are the first journeys worth encoding, because they are already known to be worth checking and are currently checked by a person
- **The chrome is eager and outside the router**, so a failure inside `<Routes>` blanks `<main>` while the header keeps rendering — which is a visible, assertable, product-level behaviour rather than an implementation detail
- **`paths.ts` declares every path once and nothing checks that a declared path has a route.** `App.test.tsx` closes half of it under jsdom; a browser closes the other half, because a pass there is not deep-linking working on a real host

### What Story 1.7 hands this story

- **A render failure is contained to the box it happened in, and there are three boxes** — around `AppHeader`, around the route outlet, and inside each `Region`. Every placement was exercised with a temporary throwing probe and then removed. A browser suite is the first thing that could hold one of those assertions permanently, and the question it has to answer is what it throws with, because **this application contains no way to make it fail** — the same problem the process suite solved with an injected crash rather than a shipped route
- **Recovery is a remount, not a reload.** The reset increments a counter used as the children's `key`. The cheap browser-side proof that a reload did not happen is `performance.timeOrigin` unchanged and exactly one `navigation` entry, and it is the same check this repository already uses for HMR
- **A throw from an event handler does not reach a boundary and is not reported at all** — measured. A browser suite will see it as a console error and nothing else, which is the state Task 1.7.6 deliberately left

### What Story 1.8 hands this story

- **`scripts/check-ready.mjs` is the readiness answer and it should be reused rather than re-derived.** It reads the backend's address from the **built** `dist/config.js` so `PORT` and `HOST` are respected, dials the frontend at the origin `CORS_ORIGIN` names rather than a second copy of `5173`, judges the frontend on **content type** because Vite's dev server never 404s, and uses a 2 s `AbortSignal.timeout()` per attempt because a socket that accepts and never answers hangs `fetch` forever. Warm it answers in ~0.3 s and started alongside `pnpm dev` in ~0.87 s. A harness that invents its own port literals has already forked the pair's definition
- **A busy port fails in opposite ways on the two services and the cheap-looking one is the dangerous one.** A busy 5173 exits 1 and takes everything with it; a busy 3000 leaves the pair running and looking healthy with nothing exiting non-zero. A harness that starts servers must treat the second as a failure, or it will run a whole suite against half a system
- **`strictPort: true` is what makes the ports trustworthy** — a silently moved port defeats an allowlist pinned to `http://localhost:5173`

### What Story 1.9 hands this story

- **This story adds a fifth level of test, and the existing four are worth reading as a set before adding one.** Unit (a function with a plain argument), integration (`app.inject()`, no socket), component (the real tree under jsdom), and the process half (a spawned `dist/index.js` under a second runner and a second command). The pattern each time was that **a different cost gets its own command**, not that a different subject gets its own tool
- **jsdom was chosen over happy-dom on failure mode rather than capability**, because a re-implementation's divergences arrive as "the DOM behaved differently from a browser" — silent and indistinguishable from a component bug. That argument is the reason this story exists: a real browser is the only thing that closes it, and the stated reversal trigger was never about replacing jsdom for component tests
- **`@storybook/addon-vitest` was measured and rejected, and the measurement matters here**: it is +1 package, pulls **no Playwright and no `@vitest/browser`**, and runs under jsdom. So no browser runner has ever been installed in this workspace, and this story's cost measurement starts from zero rather than from a partial install
- **Coverage will not see any of this and should not be made to.** V8 coverage accounts for code the runner's own process loads; the process suite already demonstrated the consequence, reporting 0% while being the best-tested file in the backend by behaviour. Do not add a merged-coverage mechanism for a figure nobody gates on
- **A green suite is not evidence the `.js` import convention was followed** — Vitest and Rolldown both resolve a bare specifier happily and only `tsc` objects. A third runner makes it a fourth resolver with an opinion

### What Story 1.10 hands this story

- **This story is the first genuine tension with the pipeline's founding rule, and it has to be resolved rather than sidestepped.** The workflow runs `pnpm verify` **by name** and defines nothing of its own, precisely so CI cannot become a second definition of "verified" — and `stories`, `env:check` and `test:process` all arrived in the chain rather than in the workflow for that reason. But E2E needs two servers, and `verify` runs with none. Three shapes are available and each has a stated cost: a `verify` step that starts its own servers (the chain stops being runnable from a cold tree without ports); a separate job in `verify.yml` (a second runner, its own checkout, install and build, and a second thing the required check does not cover); or a separate workflow (which is what `deploy.yml` is, and its three reasons are all properties of a workflow rather than of a job). Pick one and write the argument down
- **Only the pnpm store is cached, and the rule is written beside the step**: nothing under `dist/`, `storybook-static/` or any `.tsbuildinfo`, because a restored build output is a correctness risk taken for ~2.5 s against a **13.6 s runner-to-runner spread on identical work**. Browser binaries are a third category — a downloaded **tool**, not a build output — so caching them is a new decision rather than an application of the rule, and the key must include the runner OS
- **Never read a CI total as a regression.** The seven-step chain has five readings spanning ~9 s, and the install spread overlaps its own cache saving. Read the install summary and the per-step split
- **The required status check keys on the job name `verify` and lives in a repository ruleset that is invisible in a diff** (ruleset `main`, id 22160620). If this story adds a job that should gate a merge, that is a ruleset change nothing in this tree will record, and this story's own documentation becomes the only durable copy — the same shape Story 1.10 accepted and wrote down
- **A pipeline artefact needs a retention number and a reason.** The three coverage reports are uploaded at **7 days** rather than the 90-day default; `storybook-static/` at 9.3 MB per push and `dist/` were both declined, the second in favour of a fingerprint. Traces, screenshots and videos are the largest artefacts this repository would have produced, and they are only worth anything on a failure

### What Story 1.11 hands this story

- **There is no preview environment and there deliberately never will be one on this plan.** `CORS_ORIGIN` holds exactly one string and a wildcard admitting previews would admit every Static Web App in the region, so a preview is a page that loads perfectly and cannot call the backend. **A per-pull-request deployed run is therefore impossible**, which forces the shape of everything below: journeys run against a **local pair**, and anything that must be true of production runs **after** a merge, against the live environment
- **The declined browser smoke check is this story's, by name.** Task 1.11.7 declined it with the gap stated — only a real browser catches a wrong `CORS_ORIGIN` or a missing `VITE_API_BASE_URL`, and `curl` is structurally incapable of it — and named Story 1.12 as the trigger. Story 1.12's Task 1.12.7 takes the decision and hands the build here
- **A post-deploy check must poll, not check once.** The frontend's upload is not atomic and the window opens **at the exact second the deploy step reports success**: ~2 seconds holding two distinct broken states, reproduced across four deploys and accepted deliberately. A check that fires once, immediately, will be red for a reason that is not a defect
- **A check that runs from one machine over one link cannot tell its own network from the environment.** Task 1.11.7 produced a 65-second "outage" that was the laptop, and proved it with a three-host control and the backend's own log records. A red post-deploy check is a claim about the environment that needs the same care
- **A failing deploy does not produce a failing request**, so a post-deploy check has to be able to fail for reasons the platform's own health does not show. Four failure classes were made to happen and no request ever returned a non-200 through any of them
- **Rollback is asymmetric and the fast half expires.** The backend rolls back in **43 s** with `az containerapp update --image <previous digest>` and **the next merge silently undoes it**; the frontend has no revision history at all and its rollback is a revert commit through the pipeline at **3 min 42 s**. A post-deploy check that goes red is reporting something that has already shipped — decide what it is for before building it
- **Polling costs money here, and a suite is a poller.** The Consumption plan's idle rate — ~$9.21/month against ~$19.04 — is conditional on the replica receiving **less than 1,000 bytes per second**. Platform probes are not billable and this suite's requests are

### What Story 1.12 hands this story

Story 1.12 is a dependency and is what makes this story worth doing now rather than in Epic 8.

- **It ships the first behaviour in this application that is not a static render.** A poll, three states, a last-successful-check time and automatic recovery — every one of which is a user-visible sequence over time rather than a rendered output, which is the thing no level below a browser can assert
- **It ships the failure that `curl` cannot see.** A wrong `CORS_ORIGIN` or a missing `VITE_API_BASE_URL` produces `TypeError: Failed to fetch` in the page and a 200 in every server-side instrument
- **Its recovery criterion is a timing fact and the interval is a test input.** "Recovery is automatic when the backend returns — no page reload required" cannot be observed faster than the next poll. Read the interval Task 1.12.3 chose rather than hardcoding a wait, and prove the absence of a reload with `performance.timeOrigin` rather than with a wait
- **Its three states have named, producible causes**, defined in Task 1.12.1 and produced by hand in Task 1.12.6. A suite that cannot produce them is asserting on the healthy path only

## Acceptance criteria

- One browser-driven test tool is chosen, with the alternative measured rather than dismissed, and the specs have one stated home
- A user journey through the running application is asserted in a real browser, and it has been seen to fail for the right reason
- The two-halves-talking failure that `curl` cannot see is caught by this suite, demonstrated by making it happen
- The suite runs in CI, and where it sits relative to `pnpm verify` is a written decision rather than a default
- A green run's meaning is stated: what it certifies, and what it does not
- Adding the suite does not make `pnpm test` slower, conditional on a build, or dependent on a port

## Tasks

Tackled in order. The story is complete when all six are done, and it is the last story in Epic 1.

1.13.1 chooses the tool and decides where specs live, installing nothing permanent — the same shape as Task 1.10.1 proving the toolchain and stopping, and Task 1.11.1 choosing a platform and deploying nothing. 1.13.2 installs it and makes exactly one journey real against a local pair, including the part that is easy to skip: seeing it fail. 1.13.3 writes the journeys worth having and states the ones deliberately not written. 1.13.4 puts it in CI and resolves the tension with the pipeline's founding rule. 1.13.5 builds the post-deploy check Task 1.11.7 declined, now that its trigger has fired. 1.13.6 closes the story, writes ADR 0013 and closes Epic 1.

| #      | Task                                                                                                                 | Status      |
| ------ | -------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1.13.1 | [Choose the browser tool and decide where the specs live](TASK-01-choose-the-tool-and-where-specs-live.md)           | Not started |
| 1.13.2 | [Install it and make one journey real against a local pair](TASK-02-first-journey-against-a-local-pair.md)           | Not started |
| 1.13.3 | [Write the journeys worth having, and state the ones deliberately not written](TASK-03-the-journeys-worth-having.md) | Not started |
| 1.13.4 | [Run it in CI, and settle where it sits relative to `pnpm verify`](TASK-04-run-it-in-ci.md)                          | Not started |
| 1.13.5 | [Build the post-deploy browser check Task 1.11.7 declined](TASK-05-post-deploy-browser-check.md)                     | Not started |
| 1.13.6 | [Verify, document, record ADR 0013, and close Epic 1](TASK-06-verify-document-adr-and-close-the-epic.md)             | Not started |

Each task leaves the repository installable, typechecking and passing `pnpm verify`, leaves the pipeline green, and leaves the deployed environment up.

## Notes

**This story is an addition to Epic 1's scope and that should be visible rather than smoothed over.** The epic's scope line reads "Unit/integration test foundations", deliberately narrow, and Story 1.9 delivered exactly that. `PRODUCT_SPEC.md` §41 puts "E2E tests" in **Phase 6 — Portfolio polish**, whose home in `EPICS.md` is Epic 15 — and Epic 15's scope list carries "Testing strategy documentation" rather than the tests themselves, so **the suite has no owner anywhere in the roadmap**. That divergence is recorded and deliberately **not** resolved here: where the eventual suite lives is a roadmap question against a product that does not exist yet.

What justifies a story in Epic 1 is narrower than that and is a measurement rather than a preference: **Story 1.12 is the first story capable of shipping a failure that every existing instrument in this repository reports as healthy.** Task 1.11.7 found it, named it, and declined to build the check — on the correct grounds at the time, which were that nothing could yet produce the failure. Story 1.12 produces it. Leaving the check unbuilt after that is a different decision from the one 1.11.7 took.

The scope to resist is the suite. Six tasks buy a tool, a home, a handful of journeys, a CI position and a post-deploy check — not coverage of the application, which has almost none of one yet. Epic 8 is the checkpoint where there are user journeys worth asserting on in quantity, and this story's whole value there is that the harness already exists and the decisions behind it are recorded.
