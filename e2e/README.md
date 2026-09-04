# `@marketpulse/e2e` — the browser suite

The only level in this repository that drives a real browser against a real pair
of running servers. Read this before writing a spec: most of what is below is a
decision with a measurement behind it, and every one of them was cheaper to take
once than to rediscover.

```
pnpm dev             # in another terminal — this suite does not start the servers
pnpm e2e             # Chromium, against the origin CORS_ORIGIN names

pnpm e2e:deployed    # the SAME browser against the LIVE environment (Task 1.13.5)
```

There are **two** suites here and they are deliberately not one. `pnpm e2e` runs
before a merge against a local pair and gates it; `pnpm e2e:deployed` runs after
one against production and gates nothing. They share `support/app.ts` and
`support/axe.ts` — the locators and the accessibility pass are about the
application, so they transfer unchanged — and share neither their config, their
target, nor how they learn where that target is. `support/pair.ts` explicitly
does **not** transfer: it reads addresses resolved from a running pair's own
configuration, which is the local harness's happy accident and the deployed
environment's bug.

Arguments are forwarded, so `pnpm e2e --headed`, `pnpm e2e --debug`,
`pnpm e2e -g "recover"` and `pnpm e2e specs/backend-health.spec.ts` all work.
The browsers are a separate, explicit install — `pnpm exec playwright install
chromium`, ~554 MB, once per machine.

## What is here

| File                                   | What it is for                                                       |
| -------------------------------------- | -------------------------------------------------------------------- |
| `playwright.config.ts`                 | the decisions the first test settled for every test after it         |
| `specs/landing-route.spec.ts`          | the chrome and PRODUCT_SPEC.md §9's four regions                     |
| `specs/backend-health.spec.ts`         | the two halves talking — the journey this story exists for           |
| `specs/backend-failure-states.spec.ts` | the three states from named causes, and §36's "the rest still works" |
| `specs/backend-recovery.spec.ts`       | recovery across a real poll interval, with no page reload            |
| `support/`                             | locators, timings and the axe pass — not collected as tests          |
| `playwright.deployed.config.ts`        | the post-deploy check's config — a second file, not a second project |
| `specs-deployed/two-halves.spec.ts`    | the two failures no other instrument here can see                    |
| `specs-deployed/host-routing.spec.ts`  | Story 1.5's deep-link and missing-asset criteria, at last            |

## Where it runs in CI

It is a **second job named `e2e` in `.github/workflows/verify.yml`**, alongside
the `verify` job and not inside it, running in parallel with it, and **it gates
a merge** (Task 1.13.4). The argument for each of those three is written beside
the job; the short version is that `pnpm verify` runs with nothing listening —
which is why `pnpm ready` is not a chain step — while `deploy.yml`'s reasons for
being a separate _workflow_ are properties of a deploy rather than of a check.

The job runs three commands by name and defines no port, browser command or
readiness rule of its own: `pnpm build` (which has to come first, because
`pnpm e2e` resolves both addresses from the backend's **built** `dist/config.js`
and exits 1 on an unbuilt tree), then `pnpm dev` in the background, then
`pnpm e2e` — which gates on `pnpm ready` itself.

Four things it measured that are worth not rediscovering.

- **`ubuntu-latest` reports 2 workers, not the laptop's 4** — Playwright's
  default is half the CPU count — so the suite is **69.2–72.6 s** there against
  62–64 s locally. The nine short journeys still finish underneath the recovery
  journey. The whole job is **99–103 s** across three green readings.
- **The browser is `--only-shell chromium` and it is 267 MB on Linux**, in _two_
  directories (`chromium_headless_shell` 262 MB and `ffmpeg` 4.9 MB) — not the
  ~199 MB single artefact macOS shows. Cached under an OS- and
  version-scoped key with **no restore-key**, because a browser directory
  restored from a different Playwright version looks populated and holds the
  wrong build.
- **The shell build is not a lesser renderer.** A control run confirmed it
  reports the page ground exactly and axe's `color-contrast` rule passes on
  **65 nodes**, the same as macOS. That mattered: a shell that skipped style
  computation would turn the axe gate green by making it blind, which is the one
  failure mode a green run cannot distinguish from success.
- **The gate found a real defect on its first run.** `scrollable-region-focusable`
  on the landing route — a WCAG 2.1.1 failure that had stood for five stories,
  invisible on the development machine because which region overflows depends on
  the viewport and on font metrics. It reproduces locally at a viewport 160 px
  shorter. `apps/frontend/src/components/Region/Region.tsx` carries the fix.

Failure artefacts are uploaded **on failure only, for 7 days**; a green run
uploads nothing. Both shapes were made to happen on the runner: one failed
assertion is **872,142 B** (trace, screenshot, error context and the pair's log)
and a pair that never started is **577 B** — the log alone, which is the only
evidence that failure produces.

## The post-deploy check: `pnpm e2e:deployed`

The check Task 1.11.7 declined, built now that its trigger has fired. **Read
which half of that decline changed and which half still stands**, because the
second half is what shapes everything about this check.

- **What changed.** 1.11.7 named the gap exactly — only a real browser catches a
  wrong `CORS_ORIGIN` or a missing `VITE_API_BASE_URL` — and declined to build
  the check on the correct grounds at the time, which were that nothing could
  yet produce the failure. Story 1.12 shipped a client that polls the backend on
  every page load. The failure exists now.
- **What still stands.** There is no preview environment and deliberately never
  will be one on this plan, so this runs **after** a merge, against the live
  environment. It cannot prevent anything.

### Why the addresses are two inputs and not one

Locally, `scripts/pair-addresses.mjs` resolves the frontend's origin **from**
`CORS_ORIGIN`, so the allowlist and where-the-frontend-is cannot disagree — and
`pnpm ready` reports `ENOTFOUND` and exits 1 before a browser starts. That is
right locally and it is exactly what is unavailable here.

Deployed, there are **three independent values in three different places, and
nothing in this repository compares them**:

| Value                         | Where it lives                                                  | What it decides                 |
| ----------------------------- | --------------------------------------------------------------- | ------------------------------- |
| `VITE_API_BASE_URL`           | a literal in `deploy.yml`, substituted at **build** time        | what the page dials             |
| the Static Web App's hostname | a fact about an Azure resource                                  | where the page is served from   |
| `CORS_ORIGIN`                 | an environment variable on the Container App, **platform-only** | which origin the backend admits |

The third is the one no file can hold: `deploy.yml` uses `update` and never
`create`, deliberately. So `support/deployed.ts` takes the first two as separate
inputs and **must never derive one from another** — deriving would reproduce the
local harness's happy accident in the one place where the accident is the bug.

### The two failures, and why they need two different assertions

They are **indistinguishable on screen** — watched, not assumed: both put
`unreachable` and `No successful check yet.` in the status strip, which is also
what a backend that is genuinely down looks like. So each is caught by its own
instrument.

- **A wrong `CORS_ORIGIN`** is caught by the `healthy` assertion. Nothing else
  sees it: made to happen against the live backend, `curl` with the real
  frontend `Origin` got a **200 with the full 62-byte contract body**, and the
  backend's own log recorded **15 requests through the 65-second window, every
  one `statusCode: 200`**.
- **A missing or wrong `VITE_API_BASE_URL`** is caught at the **cause** — by
  asserting the origin the page's own request went to. Caught with the real
  artefact: a build with the variable unset succeeds, ships a bundle containing
  `http://localhost:3000` and no mention of the deployed backend, and the check
  goes red naming both origins. That assertion needs no response at all, which
  is what makes it right: an HTTPS document blocks a `localhost` call as mixed
  content, so there may never be one.

**One recorded claim is corrected by having done this.** This repository says in
several places that `curl` is _structurally_ incapable of catching a wrong
allowlist. Sharper: the **status**, the **body** and the **log** genuinely
cannot, but `access-control-allow-origin` is a readable copy of `CORS_ORIGIN` —
`@fastify/cors` with a string origin asserts the configured value
unconditionally — so an instrument **told the frontend's origin** can compare
them. That value is precisely what no server-side instrument has, and the
comparison is a proxy for the browser's verdict rather than the verdict: it says
nothing at all about the second failure, where the backend is never asked.
`two-halves.spec.ts` makes that comparison anyway, because two instruments
disagreeing is diagnostic — both red is CORS, only the browser red is something
else.

### It polls rather than checking once

`scripts/check-deployed.mjs` is the deployed counterpart of `pnpm ready` and it
gates the browser. It polls for **coherence** rather than a status code: fetch
the document, read every hashed asset out of it, and require all of them to be
served together.

That is the property the frontend's **non-atomic upload** violates, and the
window opens **at the exact second the deploy step reports success**. Task
1.12.7 scoped that finding rather than retiring it — the window is a property of
the artefact _changing_, and a byte-identical rebuild showed zero broken states
across 174 samples — but a merge that ships source does change it. A check that
fires immediately and once is red for a reason that is not a defect, which is
the fastest way to teach everybody to ignore the one check that sees what
nothing else does.

### It cannot tell its own network from the environment, so it says so

Task 1.11.7 produced a 65-second "outage" that turned out to be a laptop. The
control here is the structure the check already has rather than a third host:
the two halves are **different Azure services in different regions on different
infrastructure**. One red with the other green is a claim about that service;
**both** red at once is far more likely to be the runner's link, and the probe
prints that diagnosis rather than leaving it to be guessed. It decides nothing
on that basis — it is a sentence beside a failure, so whoever acts on it starts
from the right question.

### Where a red result goes

**The code has already shipped**, so the output is a rollback decision, and the
`check-deployed` job writes the whole of the following into the summary of the
run that went red — because a task file is not where somebody triaging a red
production check looks.

- **Backend rollback**: `az containerapp update --image <previous digest>`,
  **43 s**; every deploy run prints its digest. It creates a new revision rather
  than reactivating the old one, and **the next merge silently undoes it**.
- **Frontend rollback**: there is no revision history on the Free plan. It is a
  **revert commit through `verify` and the pipeline**, **3 min 42 s**.
- **`workflow_dispatch` on `deploy.yml` is a re-deploy, not a rollback** — it
  checks out `main`.
- **If the cause is `CORS_ORIGIN`, no revert fixes it**, because that value is
  not in this repository.

### It is not required, and it is not a monitor

**Not in the ruleset**, and that is a decision rather than an omission: ruleset
`main` requires `verify` and `e2e`, and this runs after a merge, so requiring it
would gate on something that cannot have happened yet — the same reason `deploy`
itself is not required.

**No `schedule:`, and adding one would quietly make this uptime monitoring**,
which is not this story's and has no owner anywhere in the roadmap. It also has
a bill: the Consumption plan's idle rate is conditional on the replica receiving
under 1,000 bytes per second, and platform probes are not billable while these
requests are. Measured against the log, **a whole green run costs the deployed
backend 5 requests**, against an idle baseline of a precise 4 per 30 s. Once per
merge is negligible; on a schedule it is a decision with an owner.

### axe here is a REPORT, not a gate — the opposite of the local suite

The question is not whether the deployed page deserves the check. It is what a
**red** post-deploy result means, and here that is a rollback decision. A page
that cannot reach its backend is a rollback; a contrast ratio is not, and mixing
them makes the one signal that sees what nothing else does indistinguishable
from the one nobody would act on immediately.

What makes that affordable rather than a hole is that the same rules already
gate the same source **before** the merge, on a real renderer, and the deployed
artefact differs from the one that gate judged by exactly one string literal —
`VITE_API_BASE_URL` — which cannot reach accessibility. So this is the
**comparison**: the figures are printed beside the pre-merge baseline, and the
reversal trigger is a **divergence**. Measured on the shipping deployment, the
deployed landing route reports **0 violations / 37 passes / 1 inconclusive
(`color-contrast`)** — the pre-merge gate's numbers exactly.

The report also refuses to wait for `healthy`, and that is a correction the CORS
break produced rather than a preference: written that way, a broken allowlist
turned **three** tests red, one of them labelled accessibility, which tells a
reader something false. It takes a reading in whichever state the page is in and
names that state.

### What a green DEPLOYED run does not certify

- **Not that the deployed artefact is the artefact `verify` fingerprinted.** It
  is not, and knowably so: the deploy builds with `VITE_API_BASE_URL` and
  `verify` does not.
- **Not accessibility.** axe reports here and gates before the merge, and every
  axe figure this repository holds was taken at **one viewport** — which Task
  1.13.4's defect proves is not the same as a page having no violations.
- **Not the environment a minute later.** It is a reading at one moment from one
  machine over one link, not a monitor, and deliberately so.
- **Not any state it does not produce.** It produces none at all: unlike the
  local suite it never intercepts a route, because everything it asserts is
  about a real environment being really correct.
- **Not recovery, not the poll interval, not the failure states.** Those are
  asserted before the merge and are not re-asserted against production, because
  they are properties of the application rather than of the deployment.

## Why no spec stops the backend

**Every failure state in this suite is produced by intercepting the health
request in the browser.** Nothing stops, restarts or reconfigures the pair.

That is also the answer to "how are specs that mutate the shared pair kept from
running underneath specs that do not?" — **there are none, so the default worker
count stands.** Playwright's default is half the CPU count (4 here) and each test
gets its own page; a page's routes are its own. Had any spec killed the backend,
the answer would have had to be a serial project or `workers: 1`, and
`pnpm e2e`'s readiness gate would not have helped: it runs once, before the
suite, and says nothing about what the suite then does to the pair.

The alternative was rejected on Story 1.8's measurement rather than on taste:
**freeing a port does not recover a `node --watch` loop**, which waits for a
_file_ change and not for the port — measured at six seconds free and still
dead. So a spec that stops the backend locally has no reliable way to put it
back, and every later spec in the run inherits the wreckage.

**The reversal trigger is a state that cannot be produced from inside the
browser.** There is already one, and it is the important one — see below.

## What interception cannot produce, and what catches it instead

**`route.fulfill()` bypasses the browser's CORS check entirely.** Measured
against this pair: a fulfilled response carrying **no CORS headers at all** is
accepted by Chromium and read normally by the page. So the obvious trick —
stripping `access-control-allow-origin` from a real response to reproduce a
wrong allowlist — does not work, and route interception can produce every state
in this suite except the one the story exists for.

That one is caught rather than produced. `specs/backend-health.spec.ts` asserts
the healthy path, and **its purpose is to go red when `CORS_ORIGIN` does not
name the origin this page is served from.** It has been seen to do so, against a
pair started by hand with the wrong value. The reason no cheaper level can:

- the browser reports `TypeError: Failed to fetch`, naming neither CORS nor the
  origin;
- `curl` with the same `Origin` gets a **200 with a full body**;
- the backend's own log records `statusCode: 200`.

The last two are asserted in that spec, from Node, so the mechanism is a checked
fact rather than a paragraph.

## What a spec must not assert

Story 1.9 measured this list at the component level. **A browser makes every
item on it easy to write and none of them true**, and two are worse here than
below, because the thing that made them impossible is gone.

- **Not colour.** In the component tests this is structural — no stylesheet is
  applied, so `getComputedStyle` returns nothing and `getTokens()` throws. Here
  the real cascade is loaded and a colour assertion would work, and it must
  still not be written: under `grayscale(1)` this palette's positive green and
  negative red are **1.05:1** apart, so colour is never the encoding and a
  colour assertion tests the thing that carries no meaning. What carries it is
  the marker's _shape_, the arrow glyph and the sign, and the word.
- **Not a single element's text where a component splits it.** Two directions,
  and the second is the one nobody expects. `getByText("up +12.40")` fails on
  `PriceChange`, because the direction word is a visually-hidden `<span>` and
  the figure is a sibling text node. And `toContainText(/\bhealthy\b/)` on the
  backend indicator's cell _also_ fails, because the cell's text is
  `Backend servicehealthy` with **no separator** — there is no word boundary to
  anchor to. The concatenation a screen reader is handed is not the string the
  elements read as. Match an element whose whole text is the word;
  `support/app.ts` does.
- **Not `innerText()` where the DOM text is what you mean.** The status words
  are lowercase in the DOM and uppercased by CSS. Playwright's text matching
  sees `healthy`; `innerText()` reports `HEALTHY`. Two strings, one element.
- **Not a `useId()` value, and not a DOM snapshot of a route.** Both move when
  anything above them moves.
- **Not latency.** CI's runner-to-runner spread on identical work is 13.6 s, and
  the process suite asserts no timing for the same reason. The one duration this
  suite compares is the poll interval, with a five-second tolerance, and what it
  is checking is that two files hold the same _number_ — not that a timer is
  accurate.
- **Not `checking` as a state.** It is what every page load renders until the
  first poll settles — a fact about this client's own startup, not about the
  server. Wait past it. It is deliberately not a `BackendStatus` member and must
  never become one.

## Waits come from the constants, never from a number that passes

`support/poll-timings.ts` holds `HEALTH_POLL_INTERVAL_MS` and `API_TIMEOUT_MS`,
why they are copies (the modules that own them cannot be imported — measured),
and why the copy is safe (`backend-recovery.spec.ts` measures the interval the
running application actually polls at and asserts it against the copy).

Two numbers to know. The healthy cycle is **30 s under Playwright**, not the
31 s Tasks 1.12.6 and 1.12.7 recorded through a genuinely backgrounded tab —
both are right about their own harness. And a **hung** cycle is 36 s rather than
the 35 s the arithmetic gives, because the next poll is scheduled on _settle_.

Playwright's per-test timeout is 30 s and is deliberately left there; the
`expect` timeout is 10 s rather than the default 5 s, because 5 s _is_ the
request deadline. A test that waits out a poll raises its own timeout and
derives it.

## No `visibilityState` workaround, and none is needed

Task 1.13.1 checked it in two tools and three engines: an automated page here
reports `visible`, `hidden: false`, `hasFocus: true`, and a second page does not
hide the first. **This repository's recorded "an automated tab reports `hidden`
and throttles React's scheduler" is a property of the browser-extension harness
and does not transfer.** If a spec ever does see `hidden`, that is a harness
regression to fix once and state — never a reason to weaken the application's
visibility rule, which exists so a tab somebody forgot is not billed for.

## The axe decision: locally it is a **gate**

Zero violations, on two pages, asserted. `incomplete` results are attached to
the test as an annotation and can never fail anything. The full argument, the
cost (+0 store entries — `axe-core@4.13.0` was already here through
`@storybook/addon-a11y`) and the unchecked version-pin invariant are in
`support/axe.ts`. In short: a browser is the only level that can see contrast at
all — no stylesheet reaches the component tests — and the only level that can
judge whole-document rules, which the workshop's `#storybook-root` scoping
structurally cannot. Contrast is not a hypothetical class here: Task 1.12.4
found a real 2.09:1 violation on the very component these specs exercise.

**Deployed it is a report rather than a gate**, and the asymmetry is argued in
`support/axe.ts` and summarised under the post-deploy section above.

**Epic 15 still owns the accessibility review, and a green axe run is not one.**

## What a green run does not certify

In the same shape ADR 0010 states it for the tick.

- **Not the states it cannot produce.** A wrong `CORS_ORIGIN` is _caught_ here
  and never produced here; a hung socket is not produced at all, and neither is
  a render failure — see below.
- **Not a browser it does not run.** Chromium only. WebKit is excluded rather
  than omitted, because it is frozen on macOS 14/arm64 and `newPage()` never
  returns, so an unsupported engine presents as a hanging test. Firefox is left
  out because this suite exists to catch failures in how the two halves talk,
  which is not an engine difference.
- **Not a host's behaviour.** The target is the origin `CORS_ORIGIN` names,
  which today is the dev server, and it answers a deep link and
  `/assets/nope.js` with a 200. Story 1.5's two host-level criteria are **not
  assertable here**; `specs-deployed/host-routing.spec.ts` is where they now
  live.
- **Not the deployed environment.** Nothing in this suite has ever spoken to
  Azure. In CI it drives a pair the runner started, on that runner. The
  post-deploy check is a different suite with a different target, and it has its
  own list above.
- **Not that the artefact it drove is the artefact that ships.** The dev server
  does not typecheck and does not bundle; `pnpm verify` is what covers that.
- **Not coverage, and not that a journey exists for a behaviour.** There are
  five specs.

## Why there is no render-failure journey

This application contains no way to produce one. Task 1.7.6 exercised every
boundary placement with a temporary throwing probe and removed it; the process
suite faced the same problem and answered it by injecting a crash through a
command-line wrapper rather than shipping a route.

Neither answer transfers cheaply. A browser-side injection would have to reach
_inside_ the React tree — there is no equivalent of an IPC channel to a
component — so it means either shipping a throwing route in the bundle every
visitor downloads, or a build-time flag that makes the artefact under test not
the artefact that ships. Both are worse than the gap. What the suite asserts
instead is the half that can be checked honestly and is the half §36 is about:
**`getByRole("alert")` has a count of zero on every page every spec visits**, in
every state including an unreachable backend, so a fallback appearing where one
should not is caught even though one cannot be caused.

The reversal trigger is application code that can genuinely fail to render —
Epic 4's first real data, or Epic 6's canvas.
