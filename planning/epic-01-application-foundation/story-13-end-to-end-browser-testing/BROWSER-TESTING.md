# Browser testing — MarketPulse

The decision record for Story 1.13's tool and for where its specs live. It is to
Story 1.13 what `HOSTING.md` is to Story 1.11 and `VISUAL-LANGUAGE.md` is to
Story 1.4: the durable copy of what was measured, what it beat, and what the
losing option was better at.

Written by Task 1.13.1 (2026-09-04), which installed nothing permanent, wrote no
test and left the tree byte-identical to where it found it. ADR 0013 is Task
1.13.6's and is written from this document.

## The decision, in one paragraph

**Playwright 1.62.1**, with the specs in a **fourth workspace package at `e2e/`**
reached by a new `pnpm-workspace.yaml` glob, run by a root script named **`e2e`**
that is deliberately **not** a `pnpm verify` step and deliberately **not** the
package's `test` script. Cypress 16.0.0 was installed, allowlisted, run against
two browsers and measured before it was rejected; it lost on four independent
counts, of which only one is cost.

## The measurements, side by side

Every figure is a **fresh-install delta**: `node_modules` was removed and
rebuilt from the baseline lockfile before each spike, and each spike was
reverted before the next began.

### The baseline was wrong before this task took it, and that is finding zero

`ls node_modules/.pnpm | wc -l` on the working tree read **425**. A fresh install
from the same lockfile reads **400**. pnpm never prunes the virtual store —
`pnpm prune` was run and removed nothing — so the count drifts upward as
packages are added and removed across stories, and the 25-entry gap is orphaned
state from earlier spikes. `apps/frontend/node_modules` was 4.7 MB of orphans and
is 4.0 KB after a rebuild.

**A virtual-store count taken on a long-lived tree is not comparable to one
taken on another tree.** Quote it only across a fresh install, which is what
every figure below does.

### Packages

Baseline: **400 store entries**, **272,324 KB** of `node_modules`, **4,591**
lockfile lines.

|                                         | Playwright 1.62.1         | Cypress 16.0.0                     |
| --------------------------------------- | ------------------------- | ---------------------------------- |
| `pnpm add` exit code                    | **0**                     | **1** — `allowBuilds` fired        |
| Store entries                           | 400 → **404** (+4)        | 400 → **570** (+170)               |
| — of which re-keys of existing packages | 0                         | **22**                             |
| `node_modules`                          | +18,756 KB (**+18.3 MB**) | +49,596 KB (**+48.4 MB**)          |
| Lockfile lines                          | +**38**                   | +**1,150**                         |
| `pnpm-workspace.yaml`                   | **byte-unchanged**        | **rewritten** with an invalid stub |
| Install scripts added to the tree       | **0**                     | 1 (`postinstall`)                  |

pnpm's own summary reads `Packages: +4` and `Packages: +168 -14`. The store
count is the repository's convention and the two disagree, exactly as
`CLAUDE.md` already warns for Story 1.9's `+36` against `+22`.

### `allowBuilds` fired for the loser and not for the winner

Story 1.13's brief predicted the policy would fire and it did — but only for
Cypress, which was the outcome nobody had assumed either way. The full failure
mode reproduced exactly as `pnpm-workspace.yaml`'s own comment describes it:

```
[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: cypress@16.0.0
```

at **exit 1**, with pnpm rewriting the tracked file to add

```
allowBuilds:
+  cypress: set this to true or false
   esbuild: true
```

— a stub that is itself invalid until edited. A tracked file changing under you
is part of the failure mode, not a stray edit.

**Playwright ships no install script anywhere in its chain.** That was read out
of the published tarballs rather than inferred from a green install:
`@playwright/test` → `playwright` → `playwright-core`, `"scripts": {}` at every
level. A full sweep of the installed virtual store after the Playwright spike
found **`esbuild@0.28.2` and nothing else** — so `esbuild` remains
`allowBuilds`' only entry and Task 1.4.5 is still the only time the policy has
fired in the shipping tree.

The mechanism behind the difference is a design choice rather than an accident:
Cypress downloads its browser in a `postinstall`, Playwright downloads its
browsers in an **explicit command** you have to run. That is what makes
Playwright's binary cost visible and schedulable and Cypress's implicit.

### Cypress duplicates the workspace's own toolchain, which the package count hides

Of Cypress's 170 added store entries, **22 are second copies of packages this
workspace already had** — `@typescript-eslint/*` (six of them), `@storybook/*`,
`@eslint/*`, `@babel/*`. All 22 carry a `_supports-color@8.1.1` suffix: Cypress
depends on `supports-color@^8.1.1`, which changes pnpm's peer-resolution key for
every package that transitively reaches it, so the lint and build toolchain is
re-keyed and stored twice.

That is not a number a reader would get from "+168 packages", and it is the half
that would keep growing as the workspace does.

### Browser binaries — the real cost, and it lives outside `node_modules`

Neither tool's browsers are in `node_modules`, so neither appears in any figure
above. This is Task 1.13.4's cache problem and the numbers are its input.

|                      | Playwright                                        | Cypress                               |
| -------------------- | ------------------------------------------------- | ------------------------------------- |
| Location             | `~/Library/Caches/ms-playwright/`                 | `~/Library/Caches/Cypress/<version>/` |
| Default install      | **1.1 GB**, 5 directories                         | **640 MB**, 1 directory               |
| Scoped to one engine | **554 MB** (`install chromium`)                   | **not scopable**                      |
| Smallest useful      | **~199 MB** (`--only-shell`)                      | 640 MB                                |
| Cold download time   | 1:24 (chromium), +58 s (rest)                     | ~41 s within the install              |
| Browsers obtained    | Chromium, headless shell, Firefox, WebKit, FFmpeg | Electron only                         |

`playwright install chromium` is **three** artefacts and not one — Chrome for
Testing 356 MB, Chrome Headless Shell 196 MB, FFmpeg 2.5 MB — which is worth
knowing before anyone budgets 356 MB for it. `--only-shell` is the CI-shaped
number.

**A measurement hazard worth recording: this machine already held 1.1 GB of
Cypress binaries** (13.17.0 and 14.5.4) from an unrelated project, and Cypress's
`postinstall` would have found them and reported the download as free. The 640 MB
figure was taken cold by pointing `CYPRESS_CACHE_FOLDER` at an empty directory.
A binary cost measured on a developer's own machine is the one number a spike is
most likely to get wrong in the tool's favour.

### How many browsers are real rather than nominal

- **Playwright: two of three on this machine.** Chromium and Firefox both launch
  headless, open pages and evaluate script. **WebKit does not work here** —
  `launch()` succeeds in 129 ms and `newContext()` in 57 ms, and **`newPage()`
  never returns**, measured with a hard 60-second deadline after ruling out
  process contention. Playwright says why itself during install: _"You are using
  a frozen webkit browser which does not receive updates anymore on
  mac14-arm64"_ (this machine is macOS 14.7.6, arm64). So WebKit is 332 MB of
  disk that is nominal on the development machine; whether it is real on
  `ubuntu-latest` is Task 1.13.4's to find out, and no spec should assume it.
- **Cypress: one, and it is not the one you download.** `cypress info` reports
  _"Detected 1 browser installed: Chrome — Version: 152.0.7977.76 — Executable:
  /Applications/Google Chrome.app"_. The 640 MB Electron that the `postinstall`
  fetches runs, and Cypress 16 prints: _"The Electron browser is deprecated as a
  test browser and will be removed in a future version of Cypress. Switch to
  Chrome or another installed browser to avoid a breaking change when you
  upgrade."_

That last pair is the sharpest argument against Cypress here and it is not about
cost. **You download 640 MB for a browser the tool is removing, and the browser
it steers you to is one your lockfile does not pin.** Playwright's browser
version is a property of `@playwright/test@1.62.1` — pinned Chrome for Testing
151.0.7922.34 — so a lockfile fixes the browser. Cypress's is whatever Chrome
the machine happens to have, which here is 152.0.7977.76 and which auto-updates.
That is the same reproducibility argument that pins every GitHub Action to a
commit SHA and that made `engineStrict` non-negotiable, arriving one layer up.

## `document.visibilityState` — the measurement that decided two later tasks

This was the open question the brief flagged as unknown in both directions, and
it had to be answered before Tasks 1.13.3 and 1.13.5 could be written at all:
Task 1.12.3's poll **stops entirely while the tab is hidden**, so a driven
browser reporting `hidden` gives a page that loads perfectly and never calls the
backend again.

**Every candidate reports `visible`.** Read in each tool's own browser:

| Browser                      | `visibilityState` | `hidden` | `hasFocus()` | notes                              |
| ---------------------------- | ----------------- | -------- | ------------ | ---------------------------------- |
| Playwright chromium headless | `visible`         | `false`  | `true`       | `navigator.webdriver: true`        |
| Playwright firefox headless  | `visible`         | `false`  | `true`       |                                    |
| Playwright webkit headless   | —                 | —        | —            | `newPage()` never returns          |
| Cypress Electron headless    | `visible`         | `false`  | `true`       | app under test is in an **iframe** |
| Cypress Chrome 152 headless  | `visible`         | `false`  | `true`       | app under test is in an **iframe** |

**Playwright goes further than "the first page is visible", and it matters.** A
second page opened in the same context does **not** hide the first: both report
`visible` simultaneously, and `bringToFront()` changes nothing for either.
Playwright pages do not compete for a foreground, so a suite can drive several
pages at once and every one of them keeps polling. Chromium and Firefox agree.

**So the repository's recorded observation does not transfer, and the reason is
worth stating precisely.** `CLAUDE.md` records that "an automated tab reports
`hidden` and throttles React's scheduler" — that observation came from driving a
real Chrome tab through the browser-extension harness, where the tab genuinely
is backgrounded. It is a property of _that_ harness, not of automation. Neither
Playwright nor Cypress reproduces it, and **no `visibilityState` override is
needed in either**. Tasks 1.13.3 and 1.13.5 are writable as ordinary specs.

### Proved against the running application rather than a blank page

The table above was taken on a `data:` URL, which proves the flag and not the
product. Playwright was then pointed at the real local pair (`pnpm dev`,
`pnpm ready` green):

```
visibilityState  : visible
t+0.3s region    : Backend service checking
t+2s   region    : Backend service healthy
health requests after 36s: 4
intervals (s): 0.12, 0.00, 30.02
```

The `checking` placeholder clears, the indicator reaches `healthy`, and **the
poll fires on its own**. That is Story 1.12's central behaviour observed through
the tool that has to assert on it, before a line of the suite exists.

**One recorded figure is refined by it.** Tasks 1.12.6 and 1.12.7 measured the
poll cycle at **31.00 s** and **31.05 s** and attributed the extra second to
Chrome aligning timers in a backgrounded automated tab rather than to the
application. Under Playwright the same poll reads **30.02 s** — the interval
`HEALTH_POLL_INTERVAL_MS` actually declares. That confirms the attribution by its
absence: the second was the browser, and it is not there when the page is
genuinely foreground. **A Playwright-based check should expect 30 s, not 31 s**,
and anyone reconciling the two figures should not read the difference as drift.

Note also that page load produced **three** `/health` requests 0.12 s and 0.00 s
apart before the first 30 s gap, which is the dev server plus `StrictMode`
double-invocation rather than the poll. A spec that counts requests from load
will not get 1; count from the first settled state instead.

## Where the specs live

This was the harder half of the task and the answer turned out to be **forced
rather than chosen**, which is the best kind of outcome available here.

### A bare root-level directory is structurally impossible — two independent failures

The brief offered "a root-level directory with its own tsconfig wired into the
solution file" as a candidate. It was built and it fails twice over, for reasons
that are both Story 1.1 conventions doing their job:

1. **`TS1295` — ECMAScript imports cannot be written in a CommonJS file under
   `verbatimModuleSyntax`.** The nearest `package.json` to `e2e/specs/*.ts` is
   the **root** one, and the root deliberately has no `"type": "module"` — that
   is why `eslint.config.mjs` and every root script carries an `.mjs` extension.
   So every `.ts` file in a root-level directory is CommonJS, and every `import`
   statement in it is an error.
2. **`TS2307` / `MODULE_NOT_FOUND` — `@marketpulse/shared` does not resolve.**
   pnpm links a workspace package only into packages that _declare_ it. Proved
   by contrast rather than asserted: from `e2e/` the resolution is
   `MODULE_NOT_FOUND`, and from `apps/frontend/`, which declares the dependency,
   the identical call resolves to `packages/shared/dist/index.js`.

`@types/node` fails the same way a third time (`TS2688: Cannot find type
definition file for 'node'`), because it is a dependency of `apps/backend` and
not of the root.

The second failure is the one that decides it. The strings this suite asserts on
**are** `BackendStatus`'s members, and Story 1.12 put `BACKEND_STATUSES` in
`packages/shared` precisely so nobody writes them out by hand. A specs home that
cannot import the shared vocabulary would force exactly the duplication that
package exists to prevent.

### So it is a fourth workspace package, at `e2e/`

`apps/*` and `packages/*` match neither `e2e/` nor a root `tests/`, so this costs
one new glob in `pnpm-workspace.yaml`. It goes at the root rather than under
`apps/` or `packages/` because it is neither: it ships nothing and serves
nothing, and filing it as an app would put a non-application into the directory
that means "a thing we deploy".

Built and proved rather than reasoned about:

- **ESLint reads it, type-aware.** `--print-config` reports **168 rules** on
  `e2e/specs/probe.spec.ts` — identical to the count on
  `packages/shared/src/health.ts` — with the project service active. And it was
  **made to fail**: a missing `await` on `page.goto()` is
  `@typescript-eslint/no-floating-promises` at error, which is a rule that
  cannot fire without type information. That is the single most valuable rule
  this suite could have: Playwright's API is almost entirely promises and a
  forgotten `await` is the classic browser-test flake.
- **Prettier reads it.** `prettier --file-info` reports
  `"inferredParser": "typescript"` for the spec and `"json"` for its tsconfig —
  the same one-liner that reports `null` for `Dockerfile`, `.dockerignore` and
  `scripts/dev.sh`. A badly-formatted spec fails `pnpm format:check` **by name**.
- **The real root scripts reach it**, not just a scoped invocation:
  `pnpm run lint` (`eslint .`) reported the error and `pnpm run format:check`
  reported the file.
- **`pnpm verify` passes with it present** — exit 0, 24.8 s against a 22.4 s
  baseline, the difference being one more `tsc` project.

### The third wiring is the one that is easy to miss

ESLint and Prettier both reach the directory for free. **`tsc` does not.** With
the package created but no `{ "path": "e2e" }` in the root solution file, a
deliberate `TS2322` in a spec is **completely silent** — `pnpm typecheck` exits 0. The specs would lint, format and be typechecked by nothing.

Adding the reference closes it and was proved by the same deliberate error
failing at exit 2. So the home costs **three** wirings and not two, and the
third has no symptom until someone ships a broken spec.

That also answers the brief's question about root `build`: it needs **no** edit.
Root `build` hardcodes `@marketpulse/frontend` twice because that package needs
a bundler; `e2e` emits nothing and `tsc -b` covers it through the reference
graph. The solution file is the entry that matters.

### Which of the six verbs the package owes, and why the others are absent

The package joins **every** `pnpm -r` fan-out the moment its directory matches a
glob — measured, not assumed: `pnpm test`, `pnpm coverage` and
`pnpm test:process` all report **"Scope: 4 of 5 workspace projects"** with it
present. Nothing runs there, and the only reason nothing runs there is that the
scripts do not exist. The 189 fast tests were unchanged.

| Verb        | Present?              | Why                                                                                                                                                                                                                             |
| ----------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lint`      | yes                   | Convention; harmless, does not fan out                                                                                                                                                                                          |
| `typecheck` | yes                   | Convention; `tsc -b`                                                                                                                                                                                                            |
| `clean`     | yes                   | Convention; and it has a `.tsbuildinfo` to remove                                                                                                                                                                               |
| `test`      | **no — load-bearing** | Root `test` is `pnpm -r run test`. A `test` script here makes `pnpm test` need two servers and a build, which is exactly the argument Story 1.9 used to keep the process suite out and Task 1.10.5 honoured with `test:process` |
| `dev`       | **no**                | Root `dev` is `pnpm -r --parallel run dev`. `pnpm dev` starts the pair; a fourth loop that wants the pair already running would deadlock against it                                                                             |
| `build`     | **no**                | Nothing to emit. `tsc -b` reaches it through the solution file                                                                                                                                                                  |
| `coverage`  | no                    | Not part of the convention, and V8 coverage cannot see a browser process anyway — the process suite already demonstrated that, reporting 0% while being the best-tested file in the backend                                     |

**The protection against `pnpm test` growing a browser dependency is an absent
script, and nothing checks that it stays absent.** That is a stated invariant of
the third kind `CLAUDE.md` already tracks — the class that quietly stops being
true — and it belongs in Task 1.13.4's write-up and in ADR 0013.

### The command is `pnpm e2e`

Checked against `pnpm help -a`'s **44** built-in commands rather than assumed:
`e2e` is free. The method was validated against known collisions in the same
run — `clean`, `test`, `start`, `config` and `env` were all correctly detected as
built-ins, which is the list `CLAUDE.md` already records. `browser`, `journeys`
and `smoke` are free too.

It is a **root script**, beside `ready`, `image` and `coverage`, and
deliberately **not** a `pnpm verify` step: `verify` runs with no servers up, and
a chain that needs two ports stops being runnable from a cold tree. Where it
sits relative to the pipeline's founding rule is Task 1.13.4's decision, and this
document does not pre-empt it.

## What Cypress was better at

Recorded because ADR 0013 needs it and because a decision stated only in favour
of the winner is not a decision.

- **Failure diagnosis is genuinely better out of the box.** Cypress's runner
  keeps a DOM snapshot per command and lets you step back through them
  interactively. Playwright's answer is the trace viewer, which is excellent but
  is a separate artefact you have to have remembered to record — and recording
  traces is precisely the CI-artefact decision Task 1.13.4 has to take. Cypress
  makes the good behaviour the default.
- **First-run experience.** `cypress open` is a better introduction than
  Playwright's config-first setup, and the spike reached a green run faster.
- **Assertion retry-ability is built into every command** rather than being a
  property of specific matchers, which makes accidental flakiness harder to
  write.
- **It tests in the machine's own Chrome**, which is a defensible position: it
  is closer to what a user actually runs than a pinned Chrome for Testing build.
  This document treats that as a liability for reproducibility, but it is the
  same fact read the other way and reasonable people weigh it differently.
- **Larger body of examples and third-party material**, which matters for a
  repository whose eventual suite will be written by whoever picks this up.

None of that outweighs 640 MB for a deprecated browser, 170 store entries with
22 duplicates of our own toolchain, 1,150 lockfile lines, an `allowBuilds` trip,
and a browser version the lockfile does not pin.

## Two things about Playwright that are costs, stated rather than discovered later

- **`@playwright/test` is CommonJS.** In this ESM-only workspace an ESM script
  importing it needs a default import and destructure; named imports are a hard
  `SyntaxError: Named export 'chromium' not found`. It is a devDependency and
  the specs themselves are unaffected, but anything scripted around it will meet
  this.
- **`playwright` and `playwright-core` are not importable by name**, because only
  `@playwright/test` is declared. That is pnpm's strict linking doing its job —
  the same shape `CLAUDE.md` records for `pino` arriving transitively through
  Fastify — and it is a five-minute confusion for anyone who reaches for the
  wrong package name.
- One package it adds is **`fsevents@2.3.2`**, darwin-only and optional, at a
  _different_ version from the `fsevents@2.3.3` Vite already pulls. So the
  Playwright delta is **+4 store entries on macOS and +3 on Linux**, which is the
  same asymmetry that makes the tree 398 packages on a Mac and 397 on the runner.

## What Task 1.13.2 inherits

- Install `@playwright/test@1.62.1` as a **root devDependency** (it is tooling,
  and the root-only rule applies), and `@types/node` plus
  `@marketpulse/shared` as devDependencies of the `e2e` package, which is what
  imports them.
- Create `e2e/` with `package.json` (`"type": "module"`, name
  `@marketpulse/e2e`, private, scripts `lint`/`typecheck`/`clean` **and no
  `test`**), `tsconfig.json` (extends the base, `noEmit`, `composite`,
  `types: ["node"]`, `lib` including `DOM`, referencing `../packages/shared`),
  and a `pnpm-workspace.yaml` glob.
- **Add `{ "path": "e2e" }` to the root solution file in the same change**, or
  the specs are typechecked by nothing and nothing says so.
- Expect **no** `allowBuilds` prompt. If one appears, something other than
  Playwright arrived with it.
- Run `playwright install chromium` explicitly — it is not a `postinstall` — and
  consider `--only-shell` for CI. It is **~554 MB** locally and **~199 MB**
  shell-only.
- Do **not** write a `visibilityState` workaround. The page is visible, the poll
  runs, and the cycle is 30 s.
- Do not target WebKit on macOS 14 without re-checking it; it is frozen and
  `newPage()` hangs.

## Sources

All figures were taken on 2026-09-04 on macOS 14.7.6 (arm64), Node 24.20.0,
pnpm 11.24.0, against `@playwright/test@1.62.1` and `cypress@16.0.0`. Both spikes
were installed from a freshly rebuilt `node_modules` and reverted afterwards; the
tree finished byte-identical to its baseline (`package.json`, `pnpm-lock.yaml`,
`pnpm-workspace.yaml` and `tsconfig.json` all md5-unchanged) with `pnpm verify`
at exit 0.
