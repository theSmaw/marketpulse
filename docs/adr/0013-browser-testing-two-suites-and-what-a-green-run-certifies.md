# ADR 0013 — Browser testing: one tool, two suites, and what a green run certifies

**Status:** Accepted
**Date:** 2026-09-04
**Delivered by:** Epic 1, Story 1.13 (Tasks 1.13.1–1.13.6)

## Context

ADR 0009 built four levels of test and drew the line at each one honestly: a
unit test drives a function, an integration test drives `app.inject()`, a
component test renders under jsdom, and a fourth level spawns the real process.
Every one of them stops at a boundary that matters. jsdom is not a browser and
computes no styles. `app.inject()` has no socket. Neither can see the two halves
talking to each other at all.

That boundary had already produced a measured, shipped-shaped failure this
repository could not catch. **With a wrong `CORS_ORIGIN` the browser reports
`TypeError: Failed to fetch` while `curl` with the same `Origin` gets a 200 with
a full body and the server logs `statusCode: 200`.** Every server-side
instrument says the system is healthy while the product is broken for every
user. Task 1.11.7 named that gap and declined to build a check for it, on
grounds that were correct at the time: nothing in the tree could yet produce the
failure, because nothing called the API. ADR 0012 shipped the caller.

So the trigger 1.11.7 wrote down fired, and this ADR is the record of what was
built when it did. It is deliberately a **foundation** rather than a suite: one
tool, one home, ten journeys, a CI position, and a clear statement of what a
green run does and does not certify. The application it drives barely exists.

Three properties of the tree shaped almost every decision below.

- **`packages/shared` is consumed as built output** (ADR 0001). A spec that
  imports the words it asserts on needs a build to have run, and that single
  fact decided where the specs live, what they can import, and — twice — what
  broke first on a machine with no `dist/`.
- **`CORS_ORIGIN` holds exactly one origin** (ADR 0008 §3). A suite pointed at
  any origin but the one the backend names drives a page every backend call of
  which the browser refuses, which is the exact failure this story exists to
  catch, arriving as a property of the harness.
- **The frontend's configuration is substituted at build time** (ADR 0006 §6).
  So `VITE_API_BASE_URL` is not a setting; it is a property of an artefact, and
  the deployed one is not the one `verify` fingerprinted.

## Decisions

### 1. Playwright, with Cypress installed and measured rather than dismissed

**Playwright 1.62.1**, as a root devDependency. Both candidates were installed
into the real tree, run against real browsers, and reverted; the tree finished
byte-identical with `pnpm verify` at exit 0. The full record is
`planning/epic-01-application-foundation/story-13-.../BROWSER-TESTING.md`.

From a true baseline of **400 store entries / 272,324 KB / 4,591 lockfile
lines**, Playwright is **+4 entries** (+3 on Linux; one is the darwin-only
`fsevents@2.3.2`), **+18.3 MB**, **+38 lockfile lines**, `pnpm-workspace.yaml`
byte-unchanged, at exit 0. Cypress 16.0.0 is **+170 entries**, **+48.4 MB**,
**+1,150 lockfile lines** and **exit 1**.

**`allowBuilds` fired, and only for the loser**, which nobody had assumed either
way. Cypress trips `[ERR_PNPM_IGNORED_BUILDS]` and pnpm rewrites the tracked
`pnpm-workspace.yaml` with the invalid `cypress: set this to true or false`
stub, reproducing ADR 0004's documented failure mode exactly. **Playwright ships
no install script anywhere in its chain** — read out of the published tarballs
rather than inferred from a green install — so `esbuild@0.28.2` is still
`allowBuilds`' only entry and Task 1.4.5 is still the only time the policy has
fired in the shipping tree. The mechanism is a design choice: Cypress downloads
its browser in a `postinstall`, Playwright in an explicit command.

Of Cypress's 170 entries, **22 are second copies of packages this workspace
already had** — `@typescript-eslint/*`, `@storybook/*`, `@eslint/*`, `@babel/*`
— because its `supports-color@^8.1.1` dependency re-keys pnpm's peer resolution
for everything that transitively reaches it. A package count hides that.

**The binaries live outside `node_modules` and are the real cost.** Playwright
is 1.1 GB over five directories by default, **554 MB** scoped with `install
chromium` (three artefacts: Chrome for Testing 356 MB, headless shell 196 MB,
FFmpeg 2.5 MB), and ~199 MB with `--only-shell`; Cypress is **640 MB**, one
Electron, **not scopable**. That was measured cold through
`CYPRESS_CACHE_FOLDER`, because the machine already held 1.1 GB of Cypress
binaries whose `postinstall` would have reported the download as free — the
number a spike is most likely to get wrong in the tool's favour.

**Browsers real rather than nominal.** Playwright's WebKit `launch()`es in
129 ms and `newPage()` **never returns** on macOS 14.7.6/arm64, where Playwright
itself warns the build is frozen. Cypress's bundled 640 MB Electron prints
_"deprecated as a test browser and will be removed"_ and `cypress info` detects
the machine's **own unpinned Chrome 152**, where Playwright pins Chrome for
Testing **151.0.7922.34** through the lockfile — the reproducibility argument
that pins every action to a SHA, one layer up.

**What Cypress is better at, recorded because it is the reason to reverse.**
Per-command DOM snapshots make interactive failure diagnosis better by default,
where Playwright's trace is a separate artefact somebody has to remember to
record. `cypress open` is a better first run. Assertion retry-ability is built
into every command rather than into specific matchers. And testing in the
machine's own Chrome is a defensible position read the other way round. The
reversal trigger is diagnosis becoming the bottleneck, at which point the price
is 170 store entries and an `allowBuilds` entry.

### 2. The specs' home is forced rather than chosen, and that is the best available outcome

`e2e/` is a **fourth workspace package**, matched by a literal `e2e` glob in
`pnpm-workspace.yaml`, with `{ "path": "e2e" }` in the root solution file. A
bare root-level directory was tried first and fails three ways:

- **`TS1295`** on every `import`, because the nearest `package.json` is the
  root's, which deliberately has no `"type": "module"`, under
  `verbatimModuleSyntax`.
- **`MODULE_NOT_FOUND` on `@marketpulse/shared`**, because pnpm links a
  workspace package only into packages that declare it — proved by contrast
  against `apps/frontend`, where the identical call resolves.
- **`TS2688`** on `@types/node`.

So the package is what the module system demands, and the payoff is the thing
worth having: **the strings the specs assert on are imported from
`packages/shared` rather than written out**, which is what `BACKEND_STATUSES`
exists for.

**Three wirings, and the third has no symptom.** The glob and the solution-file
reference are both required; ESLint and Prettier need nothing at all, which was
proved rather than assumed (`--print-config` reports **168 rules** on a spec,
identical to a covered source file, and `no-floating-promises` was made to fire
on a missing `await page.goto()`). Without the solution-file reference a
deliberate `TS2322` in a spec is **completely silent at exit 0** — the specs
would lint, format and be typechecked by nothing. Root `build` needs no edit,
because `e2e` emits nothing.

The package owes `lint`, `typecheck` and `clean` and must **never** have `test`
— see §9.

### 3. What the local suite runs against is forced by the backend, not chosen for the frontend

`CORS_ORIGIN` holds exactly one origin, so a suite pointed at `vite preview` on
4173 or at a dumb static host drives a page every backend call of which the
browser refuses while the server logs a 200. So the suite drives **the origin
`CORS_ORIGIN` names**, resolved from the running backend's own built config, and
`playwright.config.ts` has **no default base URL at all** — a literal fallback
is the second copy of the port the arrangement exists to prevent. A bare
`playwright test` throws naming `pnpm e2e`.

`scripts/pair-addresses.mjs` is where that resolution lives, and it exists
because a harness with its own copy of `5173` has forked the pair's definition
on day one. It has two readers: `scripts/check-ready.mjs` and
`scripts/run-e2e.mjs`.

The cost is stated rather than discovered: **Story 1.5's deep-link and
`/assets/nope.js` criteria are not assertable against this target**, because the
dev server answers both 200. They belong to the deployed check — see §7.

**Playwright's own `webServer` was rejected on measurement.** It judges
readiness by one URL, and a busy 3000 leaves `pnpm dev` running and looking
entirely healthy (ADR 0008 §5), so a frontend probe passes against half a
system — and the backend is the half this suite watches. `pnpm e2e` gates on
`scripts/check-ready.mjs` **itself** rather than on a copy of its rules. That
was vindicated on the runner: a deliberate `PORT=0` gave `✗ backend …
ECONNREFUSED` beside a ticked frontend and exit 1 in **15.7 s**, where a
one-URL probe would have driven the whole suite against a page with no backend.

### 4. The failure states are produced in the browser, and one measurement shaped the whole suite

**`route.fulfill()` bypasses the browser's CORS check.** Taken two ways against
the running pair, a fulfilled response with the header stripped and one with
**no CORS headers at all** are both accepted by Chromium and read normally by
the page. So route interception can produce every state in this suite **except
the one the story exists for**.

That decided three things at once.

- **Nothing mutates the pair.** `route.abort("connectionrefused")` is a genuine
  `TypeError: Failed to fetch`; both `degraded` causes are genuine `fulfill`s;
  all three are installed before `goto()`, so the first poll is the failing one
  and the state is on screen in **157–172 ms**.
- **The workers question has an answer rather than a default.** There are no
  mutating specs, so Playwright's default of 4 stands. The reversal trigger is a
  state that cannot be produced from inside the browser — of which there is
  already one, which is why it lives in the other suite.
- **The cross-origin criterion is met by _catching_ rather than producing.**
  `backend-health.spec.ts` asserts the healthy path, and its purpose is to go
  red on a wrong allowlist.

**No spec stops the backend**, on ADR 0008's measurement rather than on taste:
freeing a port does not recover a `node --watch` loop, so a spec that stops the
backend locally cannot reliably put it back.

### 5. The suite is a second job in `verify.yml`, in parallel with the chain, and it gates a merge

Not a chain step, not a separate workflow, with the argument for each rejection
written beside the job.

**A `verify` step is rejected** on the property nine clean-clone runs have
measured: `pnpm verify` runs with nothing listening, which is why `pnpm ready`
is not a step either (ADR 0010 §13). A chain that needs two ports free stops
being runnable from a cold tree.

**A separate workflow is rejected** because all three of `deploy.yml`'s reasons
are properties of a deploy rather than of a check, and two of them argue the
other way: a browser journey going red _is_ a claim about the commit and the
badge should report it, and a cancelled browser run is a cancelled check, which
`verify`'s per-ref concurrency group already handles correctly.

**What keeps the second job honest against ADR 0010 §2** — the pipeline runs
`pnpm verify` by name and defines nothing of its own — is that this job invokes
**`pnpm build`, `pnpm dev` and `pnpm e2e` by name** and defines no port, no
browser command and no readiness rule of its own. That rule was strained here
for the first time and it survived intact: the browser suite is the one check CI
runs that `pnpm verify` does not, and it is still not a second definition of the
tools.

It runs **in parallel** with `verify` rather than `needs:`-ing it — the two
answer different questions and serialising adds ~40 s for feedback that is not
better — and it is a **required status check on `main`** beside `verify`. Zero
retries, decided rather than defaulted: a gate that retries cannot tell a flake
from a defect.

**All ten journeys run, the one-minute recovery journey included, and that is a
stated decision.** `--grep-invert "recovers on the next poll"` is the lever and
it is deliberately not pulled, because skipping it would leave the story's
recovery criterion asserted on a laptop and not in CI.

### 6. The browser cache is a third category, and it is allowed where `dist/` is not

ADR 0010 §7 caches the pnpm store and nothing else, and the reason is that a
restored build output can make a build wrong. **A browser binary is a downloaded
_tool_** — immutable, addressed by version — and a stale one cannot make a build
wrong, because a stale one is a different version Playwright refuses to launch.

Its key carries the runner OS and the **Playwright version rather than the
lockfile hash**, and it has **no restore-key**, which is the deliberate
difference from the store cache: a partial store is a correct store that
installs the rest, where a browser directory restored from another version
_looks_ populated and holds the wrong build — and `actions/cache` reports a
restore-key hit and a total miss identically (ADR 0010 §7). The download step
**runs on a hit too and prints what it did**, which is the only thing separating
a restored cache from a silent re-download.

**The Linux figures are not the macOS ones.** `playwright install --only-shell
chromium` puts **267 MB** on disk in **two** directories (`chromium_headless_shell`
262 MB and **`ffmpeg` 4.9 MB — so `--only-shell` still fetches FFmpeg**);
compressed into the cache it is **108,075,781 B**, the largest single entry this
repository stores.

The store cache is **restored and never saved** in this job, because both jobs
compute the same key and two savers race to a "Cache already exists" warning
that reads like a fault. `verify` owns saving it.

### 7. The post-deploy check is a second CONFIG and a second job, and it gates nothing

Task 1.11.7 declined a browser-driven post-deploy check. That decline was
re-read rather than treated as an oversight, and both halves are stated: **what
changed** is that ADR 0012 shipped a client that polls the backend, so the
failure 1.11.7 named can now be produced; **what still stands** is that there is
no preview environment and deliberately never will be one on this plan, so this
runs **after** a merge and gates nothing. Its output is a rollback decision.

It is a second Playwright **config** over `e2e/specs-deployed/` rather than a
second project, because a project shares `use.baseURL` and the testDir sweep,
and **`pnpm e2e` must never reach production while `pnpm e2e:deployed` must
never need a local pair**. `workers: 1` is the one runtime setting the two
disagree on, so the check's cost on production is one countable sequence.
`support/app.ts` and `support/axe.ts` transfer unchanged; `support/pair.ts`
deliberately does not.

**The addresses are two inputs and never one input and a derivation, and that is
the whole architecture.** Deployed there are **three independent values in three
places** — `VITE_API_BASE_URL`, a literal in `deploy.yml` substituted at build
time; the Static Web App's hostname, a fact about an Azure resource; and
`CORS_ORIGIN`, an environment variable that exists **only in the platform**,
because `deploy.yml` uses `update` and never `create`. All three must agree and
no file compares them. Locally `pair-addresses.mjs` resolves the frontend's
origin _from_ `CORS_ORIGIN`, so the two cannot disagree at all — right locally,
and exactly why deriving one from the other deployed would reproduce the local
harness's happy accident in the one place the accident is the bug.

**Both failures are caught by two different assertions, because they are
indistinguishable on screen.** A wrong `CORS_ORIGIN` is caught by the `healthy`
assertion; a wrong `VITE_API_BASE_URL` is caught at the **cause**, by asserting
which origin the page's own request went to. Task 1.13.5 produced both: the
first against the live Container App (red at exit 1 in **53.2 s**, 3 failed / 7
passed, restored and read back from the platform), the second at the artefact
without touching production. Both pages read `unreachable` / `No successful
check yet.`, byte for byte.

It is a **job and not a step** in `deploy.yml`, `needs: deploy`, because a red
result must not read as "the deploy failed" when the deploy succeeded and the
deployed system is wrong.

### 8. axe is a GATE before the merge and a REPORT after it, and the asymmetry is the decision

Locally, zero violations are asserted on two pages, with `incomplete` attached
as an annotation that can fail nothing. That is an **adoption rather than a
reversal** of ADR 0009 §13, which declined `@storybook/addon-vitest` because it
would have turned the _workshop's_ visual-review compromises into test fixtures.
None of that argument reaches the assembled application. What decided it is that
a browser is the only level here that can see **contrast** (structurally
unrunnable below — no stylesheet, `getComputedStyle` returns nothing,
`getTokens()` throws, and ADR 0012 found a real 2.09:1 violation on this exact
component) and **whole-document rules** (`landmark-unique`, `landmark-one-main`,
`page-has-heading-one`, `region`, which the addon's `#storybook-root` scoping
structurally cannot judge — ADR 0007 measured 3 violations unscoped against 0
scoped).

**It went red on its first CI run for a reason nobody planned**, and that is the
most transferable thing in the story. `scrollable-region-focusable` on the
landing route: a real WCAG 2.1.1 defect that had stood for five stories, that no
instrument here could ever have seen, and that never fired locally because **the
rule does not fire while the scrolling box happens to contain something
focusable** — `Market topology` holds ADR 0004's render check, which holds a
popover trigger, and the runner reported it on `Current investigations`, which
holds a heading and one sentence. It reproduces on the development machine at a
viewport 160 px shorter, so it is a real defect a taller window was hiding. The
fix is `tabIndex={0}` on **every** region rather than on the ones currently
overflowing, because which one scrolls is a function of the viewport and of what
Epics 4 to 7 put in them.

Deployed, the same rules are a **report**. The question is not whether the
deployed page deserves an accessibility check; it is what a **red** post-deploy
result means, and its red channel is a rollback decision. A page that cannot
reach its backend is a rollback; a contrast ratio is not, and mixing them makes
the one signal that sees what nothing else does indistinguishable from the one
nobody would act on immediately. What makes that affordable rather than a hole
is that the same rules already gate the same source before the merge on a real
renderer, and the deployed artefact differs from the one that gate judged by
exactly one string literal. So it is the **comparison** — and **the reversal
trigger is a divergence**.

The report also **refuses to wait for `healthy`**, a correction the CORS break
produced rather than a preference: written that way, a broken allowlist turned
**three** tests red, one of them labelled accessibility, which tells a reader
something false.

**The local gate deliberately keeps the shape the deployed report rejected, and
the cost was measured rather than assumed.** It waits for `healthy`, because the
0/37/1 baseline is state-dependent and a gate has to judge a page in a known
state; Task 1.13.6 broke `CORS_ORIGIN` locally and read the price — **4 failed /
5 passed**, one of the four labelled accessibility. That is affordable where a
red run blocks a merge and all four reds share one visible cause, and it is not
affordable where a red run is a rollback decision.

**Both pins are the same on purpose.** `axe-core` is declared at **4.13.0** in
`e2e/package.json` to match the version `@storybook/addon-a11y` resolves, and it
is `axe-core` directly rather than `@axe-core/playwright` — two axe versions
would make the workshop and this suite disagree about one page, which makes both
untrustworthy rather than one of them wrong. It cost **+0 store entries** and
**+3 lockfile lines**, because the package was already in the store.

### 9. What the suite must not assert, and why the list lives in `e2e/README.md`

The rules live beside the specs, because a task file is not where the next
person writing a spec looks, and `package.json` cannot hold a comment. The root
documents **point** at it rather than duplicating it — duplicating it is exactly
how this repository's twelve-block sweep problem started.

Two traps a browser makes newly writable belong here because they are new:
**colour**, which would work in a browser and must not be written, because
greyscale separates this palette by 1.05:1 (ADR 0004); and **`innerText()`**,
which reports the CSS-transformed `HEALTHY` where the DOM text and every
Playwright matcher see `healthy`.

One trap arrived from the other direction and is worth stating as a general
rule. ADR 0009 records "do not assert on a single element's text where a
component splits it" — assert the concatenation a screen reader is handed.
Scoping the backend indicator with `toContainText(/\b(healthy|…)\b/)` fails,
because the region's text is **`Backend servicehealthy`** with no separator, so
there is no word boundary. **The concatenation a screen reader is handed is not
the string the elements read as**, and the rule cuts both ways.

`getByRole("alert")` is how "nothing failed to render" is asserted — by role
rather than by title, so one query covers every boundary placement including any
this application grows.

### 10. Waits are derived, and the one copy of a constant is a CHECKED copy

`e2e/support/poll-timings.ts` restates `HEALTH_POLL_INTERVAL_MS` and
`API_TIMEOUT_MS` because importing them is **structurally impossible**: every
path runs through `api-base-url.ts`, which reads `import.meta.env` at module
load and throws `TypeError: Cannot read properties of undefined (reading
'VITE_API_BASE_URL')` under Node. Moving them to `packages/shared` was rejected
as relocating shipped code for a test's convenience — the shape ADR 0010 §"the
process suite" refused with `MIN_PORT`.

What makes the copy safe is that the recovery journey **measures the interval
the running application actually polls at** and asserts it against the copy,
made to fail by setting the copy to 20 s. `API_TIMEOUT_MS`'s copy is explicitly
**unchecked**, and that is said out loud rather than left to be discovered.

### 11. The `visibilityState` hazard does not exist here, and the recorded claim was wrong about its cause

ADR 0012 records that an automated tab reports `hidden`, which makes a page sit
on the `checking` placeholder indefinitely and throttles React's scheduler. That
is a property of the **browser-extension harness** rather than of automation,
and it does **not** transfer: `document.visibilityState` is `visible` in both
candidate tools, no override is needed, and Playwright goes further — a second
page does not hide the first, so several pages can poll simultaneously.

The measurable consequence is a figure that would otherwise be carried forward
wrong: **the healthy poll cycle reads 30.02 s through Playwright**, not the
31.00 / 31.05 s ADR 0012 records. Those readings were right about a driven
Chrome tab, in which Chrome aligns timers to the second because the tab is
genuinely backgrounded — so their attribution of the extra second to the browser
is **confirmed by its absence here**. A Playwright spec should expect 30 s, and
the difference is not drift.

Page load produces **three** `/health` requests 0.12 s apart before the first
gap — the dev server plus `StrictMode`, not the poll — so a spec must not count
requests from load.

## Rejected, with reasons and reversal triggers

| Rejected                                                   | Why, and what would reverse it                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cypress 16.0.0**                                         | +170 store entries, +48.4 MB, +1,150 lockfile lines, exit 1 on `allowBuilds`, a 640 MB non-scopable Electron, and a default browser that is the machine's own unpinned Chrome. Reversed by interactive failure diagnosis becoming the bottleneck                                                                                                                                      |
| **A bare root-level `e2e/` directory**                     | `TS1295`, `MODULE_NOT_FOUND` on the shared package, `TS2688`. Not a preference — three hard errors                                                                                                                                                                                                                                                                                    |
| **Playwright's own `webServer`**                           | Judges readiness by one URL; a busy 3000 leaves the pair looking healthy. Reversed by nothing currently foreseen — `check-ready.mjs` is the definition                                                                                                                                                                                                                                |
| **A `test` script on the `e2e` package**                   | It would make `pnpm test` need two servers, a build and a browser binary — the outcome ADR 0009 and ADR 0010 §14 spent two tasks preventing                                                                                                                                                                                                                                           |
| **A render-failure journey**                               | This application contains no way to produce one, and both precedents fail: a throwing route ships in the bundle every visitor downloads, and a build-time flag makes the artefact under test not the artefact that ships. `getByRole('alert')` at count zero on every page is asserted instead. Reversed by Epic 4's first real data or Epic 6's canvas                               |
| **A hung-socket journey**                                  | 36 s to assert a distinction the user cannot see, against a deadline ADR 0012 already proved wired in a browser. Reversed by a change to `API_TIMEOUT_MS`                                                                                                                                                                                                                             |
| **WebKit and Firefox on Linux**                            | A second browser in the cache and roughly a doubling of the run, for an engine never seen green here — and WebKit's failure mode is a _hanging_ test rather than an error. Reversed by a WebKit- or Gecko-specific defect actually shipping                                                                                                                                           |
| **Retries in CI**                                          | A gate that retries cannot tell a flake from a defect. The zero-retry policy paid for itself in week one — see _Consequences_                                                                                                                                                                                                                                                         |
| **A `schedule:` on the post-deploy check**                 | That is uptime monitoring, which nothing in the roadmap owns, and it has a bill: the Consumption plan's idle rate is conditional on under 1,000 bytes per second, platform probes are not billable and these requests are. A whole green run costs the deployed backend **+5 requests** against an idle baseline of 4 per 30 s — negligible once per merge, not negligible on a timer |
| **Adding the post-deploy check to the ruleset**            | It runs after a merge, so requiring it would gate on something that cannot have happened yet — the same reason `deploy` is not required. Stated because a reader finding it unrequired cannot otherwise tell that from a forgotten step                                                                                                                                               |
| **Reproducing the mixed-content block against production** | Declined on instruction, and the gap is named rather than hidden: the failure was produced at the artefact and caught, and only the browser's block itself went unreproduced, because the only HTTPS host available is production. It changes nothing, because the assertion is on the request's **origin** and needs no response at all                                              |
| **Preview environments**                                   | ADR 0011's decision, unchanged: `CORS_ORIGIN` holds one string, so a preview is a page that loads perfectly and cannot call the backend                                                                                                                                                                                                                                               |

## Consequences worth stating separately

### What a green `pnpm e2e` certifies

- A real Chromium loaded the real dev-server page and rendered the chrome,
  PRODUCT_SPEC §9's four named regions, and the navigation.
- The page **reached the backend across the origin boundary** and rendered what
  it said, so `CORS_ORIGIN` and `VITE_API_BASE_URL` agree for that pair.
- The `x-request-id` the browser can read is the one the backend sent, so
  `exposedHeaders` is doing its job.
- All three `BackendStatus` states render from causes produced in the browser,
  and both `degraded` causes render different sentences.
- The indicator **recovers on the next poll** without the page reloading, and
  the application polls at the interval `poll-timings.ts` says it does.
- Every route stays usable with the backend unreachable, with **zero** error
  fallbacks anywhere.
- axe found **zero violations** on the landing route healthy and on the
  not-found route unreachable, at one viewport, on a renderer that provably
  computed styles.

### What a green `pnpm e2e` does **not** certify

- **The deployed system.** This drives the dev server against a local backend.
  `VITE_API_BASE_URL`, the Static Web App's hostname and the platform's
  `CORS_ORIGIN` are three values it never sees.
- **Deep-linking or a missing asset.** The dev server answers both 200; those
  are properties of a host and belong to `pnpm e2e:deployed`.
- **Accessibility.** Two pages, one viewport, one browser. **0 violations at one
  viewport is not 0 violations** — the CI gate's first finding proves that
  outright — and axe returns `color-contrast` inconclusive on exactly the
  non-text elements this product encodes with. Epic 15 still owns the review.
- **A render failure being contained.** Nothing here can produce one; the suite
  asserts only that none happened.
- **Any browser but Chromium**, and any engine's own rendering bugs.
- **Coverage of the application**, which barely exists. Ten journeys are a
  harness, not a suite.

### What a green `pnpm e2e:deployed` certifies

- The live document and every hashed asset it names were served **together**,
  which the frontend's non-atomic upload makes a real claim rather than a
  formality.
- Four routes **deep-load cold as a 200 that is not a redirect**, a made-up path
  renders the not-found **route**, and `/assets/nope.js` is a genuine 404 — so
  `navigationFallback` and its `exclude` are both doing what they say. These are
  Story 1.5's two host-level criteria, asserted by a check for the first time.
- The deployed page **dials the backend it was built to dial**, so
  `VITE_API_BASE_URL` in `deploy.yml` and the resource actually deployed agree.
- The two live halves **talk across the origin boundary**, so the platform-only
  `CORS_ORIGIN` and the Static Web App's hostname agree.
- The deployed backend's `access-control-allow-origin` equals the frontend's
  origin — a second, independent instrument, deliberately kept because two
  instruments disagreeing is diagnostic.
- The deployed landing route's axe figures **match the pre-merge gate's**.

### What a green `pnpm e2e:deployed` does **not** certify

- **That the two inputs are right.** It compares them against the live
  environment and **cannot detect both being wrong in the same direction.**
  Pointed at a stale `FRONTEND_ORIGIN` with a matching `VITE_API_BASE_URL` it
  would pass — green — against the wrong site entirely. That is a real limit of
  an instrument whose whole value is catching values that disagree.
- **That the deploy that just ran is the one it tested.** It polls for
  coherence, and a redeploy landing mid-run is not detected.
- **That the environment is healthy now.** It has no `schedule:`; it is a
  post-merge reading, not a monitor.
- **Accessibility**, which is a report here and can fail nothing.
- **That a rollback is unnecessary if it is green.** A green run means the two
  halves agree, not that the release is correct.

### Six invariants nothing checks, and two that are checked now

ADR 0006 named a third kind of gap: a file every tool reads carrying a guarantee
that has quietly stopped being enforced. This story created six, and they are
worth listing together because **the interesting claim is not the count — it is
what separates the ones worth checking from the ones worth writing down.**

1. **The `e2e` package joins every `pnpm -r` fan-out automatically**, measured at
   "Scope: 4 of 5 workspace projects" for `test`, `coverage` and `test:process`,
   and the _only_ thing keeping the browser suite out of `pnpm test` is that the
   package has no `test` script. **Prose**, because a check would have to assert
   the absence of a key in a manifest — a check whose failure mode is somebody
   deleting the check. The durable copy is this section, `CLAUDE.md`, and the
   comment on `pnpm-workspace.yaml`'s glob.
2. **The two `axe-core` pins must match** and there is no manifest for them to be
   compared in, because `apps/frontend`'s arrives transitively. **Prose**, with a
   one-liner anyone can run: `ls -d node_modules/.pnpm/axe-core@*` must print
   exactly one entry. It printed exactly `axe-core@4.13.0` when this was written.
3. **The ruleset requires two checks keyed on two job names**, so renaming either
   job in `verify.yml` un-requires it silently — ADR 0010 §17's failure, doubled.
   And the `e2e` job **restores the pnpm store cache and never saves it**, so it
   depends on `verify` continuing to save it. **Prose**, for ADR 0010 §17's
   reason: no file here can hold a repository ruleset.
4. **The axe gate's value depends on the browser computing real styles.**
   **Checked**, and this is the one that was moved. A renderer that skipped style
   computation turns the gate green **by being blind**, which a green run
   structurally cannot distinguish from success — the worst failure mode
   available to a check. Task 1.13.4 confirmed the property with a throwaway
   probe and deleted it; `expectTheRendererComputedStyles` now asserts that
   `color-contrast` appears in `passes` with **more than zero nodes**, in
   `expectNoAxeViolations` **and** in `reportAxe`, because a check on one leaves
   the other blind. It asserts presence-with-nodes rather than the 65 the runner
   measured, because 65 is a property of this page and would fail on the next
   component. It was made to fail first.
5. **The `check-deployed` job restores the browser cache and never saves it**, so
   it depends on `verify`'s `e2e` job saving it under the same key — the same
   shape as (3), now spanning two workflows. **Prose.** It behaved exactly as
   intended on its first run, which is the point: the failure mode is silent and
   slow rather than loud.
6. **The deployed check cannot detect both its inputs being wrong in the same
   direction** — see _What a green deployed run does not certify_. **Prose**,
   because the only check for it is a fourth independent copy of the address,
   which is the thing §7 exists to avoid.

**Two counter-examples belong beside them, because both went the other way.**
`scripts/run-deployed-check.mjs` now **guards on the presence of
`packages/shared/dist`** with a message naming the command — presence and not
freshness, the shape ADR 0010 settled after building a staleness check and
removing it. And the **three-values-must-agree** invariant has existed unnamed
since ADR 0011 and is **the first invariant of this kind in the repository that a
check closes rather than prose describing**.

The line between the two lists is not effort. It is whether the thing being
checked is **reachable from an assembled instance** — the rule
`apps/backend/src/server.test.ts` was written on. (4) is; a ruleset, a manifest's
missing key and a second copy of a hostname are not.

### `playwright.config.ts` is the first tool configuration file here that is not a gap of any kind

ADR 0010 records a class of file whose _formatting_ is checked and whose
_schema_ is not — the workflows, `dependabot.yml`,
`staticwebapp.config.json`. A browser tool's config was expected to be a fifth
instance. It is not: `e2e/tsconfig.json`'s `include` is `**/*.ts`, so the config
sits **inside** the project, `--print-config` reports 168 rules on it identical
to a source file, `no-floating-promises` applies, and Prettier formats it.
`playwright.deployed.config.ts` is a second instance, which makes it a property
of that one `include` line rather than a coincidence.

### The zero-retry policy paid for itself in week one

The `e2e` gate caught a real flake in its first week, and it took a commit rather
than a re-run. **Every page load makes two `/health` requests and one is
aborted**, because `StrictMode`'s first mount cleans up and aborts its own
in-flight request through the `AbortController` `api-client.ts` composes into
every call — measured 5/5 as `["request GET", "request GET", "FAILED
net::ERR_ABORTED", "finished"]`. Locally the abort lands _before_ the response
headers, so the aborted request produces no `response` event at all; on a loaded
runner it can land _after_ them, producing a `response` carrying a 200 whose body
can never be retrieved. `waitForResponse` now requires the response to have
`finished()`.

### `packages/shared` is consumed as built output, and CI is where that bites

The `check-deployed` job went red on its first real execution because **a fresh
checkout has no `dist/`**, arriving from Playwright as `Cannot find module
.../@marketpulse/shared/dist/index.js` then `No tests found`, in 1.7 s, _after_
the readiness probe had passed against a perfectly healthy production. The fix is
the e2e package's **own documented verb** rather than a build step invented in a
workflow: `pnpm --filter @marketpulse/e2e typecheck` is `tsc -b`, and
`e2e/tsconfig.json` references `packages/shared`, so it builds exactly what the
specs import and nothing else.

Writing the guard found a **new face of a recorded trap**. ADR 0001 records that
`tsc -b --clean` deletes the output of the sources that _currently_ exist; the
mirror is that **deleting `dist/` by hand and leaving `tsconfig.tsbuildinfo`
makes `tsc -b` emit nothing at all**, because it still believes the output is
current — so the guard's own suggested fix silently does nothing there and `pnpm
clean` is what is needed. A fresh checkout has no `.tsbuildinfo` and is
unaffected, which is exactly why CI can find that failure and a laptop cannot.

### Two figures corrected outside this story, and one rule that had never been stated

- **A store-entry count is only comparable across a fresh install.** The working
  tree read **425** entries where a fresh install from the same lockfile reads
  **400**, because pnpm never prunes the virtual store — `pnpm prune` removes
  nothing — so the count drifts upward as packages come and go, and
  `apps/frontend/node_modules` was 4.7 MB of orphans against 4.0 KB rebuilt.
  That affects every `+N entries` figure this repository has recorded.
- **The poll cycle is 30.02 s under Playwright**, against ADR 0012's 31.00 /
  31.05 s — see §11. A scoping clause on those, not a strike-through.
- **The install count is 400 on Linux against 402 on macOS**, superseding ADR
  0010 §7's 397/398 pair. The difference is now **two** darwin-only optional
  packages rather than one: `fsevents@2.3.3` via Vite, and `fsevents@2.3.2`
  reached through Playwright.

### Do not read this as coverage

Ten local journeys and ten deployed ones are a harness. Epic 8 is the checkpoint
with journeys worth asserting on in quantity, and what it inherits is that the
tool, the home, the CI position and the post-deploy position are already decided
and recorded. **Where the eventual suite lives in the roadmap is still an open
question** — `PRODUCT_SPEC.md` §41 puts E2E tests in Phase 6 while Epic 15's
scope carries only "Testing strategy documentation", so the suite has no owner
anywhere in the roadmap. Story 1.13 deliberately did not resolve that.

## Measured

### Acceptance criteria, re-run at close (2026-09-04)

| #   | Criterion                                                               | Evidence                                                                                                                                                                                                                                                        |
| --- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | One tool chosen, alternative measured, specs have a stated home         | §1 and §2; `BROWSER-TESTING.md`; both candidates installed, run and reverted                                                                                                                                                                                    |
| 2   | A journey asserted in a real browser, seen to fail for the right reason | Re-taken at close: a wrong local `CORS_ORIGIN` gave **4 failed / 5 passed** at exit 1, and the new renderer check was made to fail with its own message                                                                                                         |
| 3   | The two-halves failure `curl` cannot see is caught, by making it happen | Re-taken at close: `curl` with the real `Origin` got **200 with the full body** carrying the wrong `access-control-allow-origin`, the log recorded **12 requests, every one `statusCode: 200`**, and the browser suite went red naming `getByText(/^healthy$/)` |
| 4   | Runs in CI, position is a written decision                              | §5, §6, §7; the argument is beside the job. `verify` and `e2e` are both required checks on ruleset `main` (id 22160620), re-read at close                                                                                                                       |
| 5   | A green run's meaning is stated                                         | Four lists above, and `e2e/README.md`                                                                                                                                                                                                                           |
| 6   | `pnpm test` not slower, not conditional on a build, not port-dependent  | `pnpm test` is **"Scope: 4 of 5 workspace projects"**, **189 tests in 3.21–3.39 s**, unchanged                                                                                                                                                                  |

### The suites

| Reading                          | Figure                                                                                              |
| -------------------------------- | --------------------------------------------------------------------------------------------------- |
| `pnpm e2e`, laptop               | **10 passed in 1.0m** (62.95 s wall); nine journeys run underneath the ~62 s recovery journey       |
| `pnpm e2e`, runner               | 69.2–72.6 s; **2 workers** where the laptop reports 4                                               |
| `e2e` job, whole                 | 99 / 102 / 103 s across three green readings — a 4 s spread                                         |
| `pnpm e2e:deployed`, clean clone | **10 passed in 10.8 s** (14.40 s wall including readiness)                                          |
| `check-deployed` job, runner     | **37 s**; the suite itself 6.5 s — faster than the laptop, which is geography                       |
| Failure artefacts                | 872,142 B on a spec failure; **577 B** on a dead pair, because there is no Playwright output at all |

### Clean clone, empty pnpm store (the tenth such run)

| Reading                      | Figure                                                                                                                                                    |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cold install                 | **402 packages, 31.2 s**; **404 store entries**, 280,732 KB, 4,641 lockfile lines                                                                         |
| Install-script sweep         | **`esbuild@0.28.2` and nothing else** — Playwright adds none                                                                                              |
| `pnpm verify` from the clone | **exit 0 in 29.28 s**                                                                                                                                     |
| `pnpm verify` warm, worktree | **24.33 s** — build 2.63 / lint 4.48 / `format:check` 4.41 / `stories` 0.24 / `env:check` 0.25 / `test` 3.21 / `test:process` 7.78                        |
| Tests                        | 37 + 49 + 103 = **189**, plus **10** process tests. 10 components, 10 stories files                                                                       |
| Frontend artefact            | 348,135 B `b98aeaa5…`, 12,128 B `134d5dd8…`, `index.html` 1,101 B `07983678…`, 300 B — **361,664 B over four files**, reproducing Task 1.13.4 to the byte |
| Storybook                    | 63 files, 9.3 MB                                                                                                                                          |
| Browser download             | **not** part of `pnpm install` — `pnpm exec playwright install chromium` is a separate explicit command, 554.3 MB on this machine over three artefacts    |
| `pnpm e2e:deployed` guard    | Fires from a fresh-checkout shape (no `dist/`, no `.tsbuildinfo`) naming the command; `tsc -b` in **0.87 s** fixes it                                     |

### Actions

**Five distinct actions across eighteen uses and six distinct `uses:`
references** — `actions/cache/restore` being a sub-action of `actions/cache` at
the same SHA. Counted out of `.github/workflows/` at close, not copied. No new
action was needed for either job.

## Related

- ADR 0001 — the workspace shape, the `.js` extension rule, and built output
- ADR 0004 — the workshop, the a11y addon, and the greyscale measurement
- ADR 0008 — `CORS_ORIGIN`, `pnpm ready`, and the busy-3000 half-pair
- ADR 0009 — the four levels this is the fifth of, and the axe-as-coverage rejection
- ADR 0010 — the pipeline's founding rule, the cache policy, and the ruleset
- ADR 0011 — the two hosts, the non-atomic upload, and the rollback asymmetry
- ADR 0012 — the poll, the three states, and the failure this story exists to catch
- `e2e/README.md` — the rules for writing a spec
- `planning/epic-01-application-foundation/story-13-.../BROWSER-TESTING.md` — the tool comparison in full
