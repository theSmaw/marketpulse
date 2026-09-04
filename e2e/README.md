# `@marketpulse/e2e` — the browser suite

The only level in this repository that drives a real browser against a real pair
of running servers. Read this before writing a spec: most of what is below is a
decision with a measurement behind it, and every one of them was cheaper to take
once than to rediscover.

```
pnpm dev     # in another terminal — this suite does not start the servers
pnpm e2e     # Chromium, against the origin CORS_ORIGIN names
```

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

## The axe decision: it is a **gate**

Zero violations, on two pages, asserted. `incomplete` results are attached to
the test as an annotation and can never fail anything. The full argument, the
cost (+0 store entries — `axe-core@4.13.0` was already here through
`@storybook/addon-a11y`) and the unchecked version-pin invariant are in
`support/axe.ts`. In short: a browser is the only level that can see contrast at
all — no stylesheet reaches the component tests — and the only level that can
judge whole-document rules, which the workshop's `#storybook-root` scoping
structurally cannot. Contrast is not a hypothetical class here: Task 1.12.4
found a real 2.09:1 violation on the very component these specs exercise.

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
  assertable here** and belong to the post-deploy check.
- **Not the deployed environment.** Nothing in this suite has ever spoken to
  Azure. In CI it drives a pair the runner started, on that runner, and the
  post-deploy check is a different thing.
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
