# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

**Epic 1, Story 1.1 complete (8 tasks), Story 1.2 complete (6 tasks), Story 1.3 complete (5 tasks) and Story 1.4 complete (6 tasks).** The pnpm workspace root, the shared TypeScript baseline and all three workspace packages exist, verified from a clean clone with an empty pnpm store (Tasks 1.1.8 and 1.3.5).

**Both apps now run.** `apps/backend` is a Fastify server — it starts on a configurable port, serves `GET /health`, restarts on source change, and shuts down gracefully on `SIGTERM`/`SIGINT`. `apps/frontend` is a React 19 application built with Vite — it renders a placeholder shell, hot-reloads components without losing their state, and builds to static assets that render from a plain static host. Root `pnpm dev` starts the pair, and there are no placeholder `dev` scripts left anywhere.

**Both are skeletons in scope, not in status.** The backend has no market data, no database, no domain logic, no configuration module and no CORS. The frontend has **a router but no routes** — Task 1.5.1 chose React Router 8.3.1 and installed it into `apps/frontend`; nothing imports it yet, so the artefact is unchanged. It has no state management and does not call the backend (Story 1.12). Its styling system is **decided, piped, designed at the token level, carrying the product's own vocabulary, and now built into components**: Story 1.4 picked CSS Modules plus CSS custom properties for styling and **Base UI** (`@base-ui/react`) for behaviour (Task 1.4.1 — Radix was the original choice and was reversed on 2026-08-31, on the intention to swap in a Base-UI-based shared component library later rather than on the measurements, which favour Radix by ~46 kB), Task 1.4.2 got the first stylesheet into the build with no dependency at all, **Task 1.4.3 defined the tokens and the theme**, **Task 1.4.4 layered the market semantics over them** — price direction, a four-band anomaly ramp, and feed status — **Task 1.4.5 built the first five components, the Base UI seam, and the Storybook workshop they are developed in**, and **Task 1.4.6 verified the story from a clean tree and wrote `docs/adr/0004-*`**. The story is closed. Neither app has tests (Story 1.9). Stories 1.4–1.12 can all proceed from here.

**The visual direction is now settled and written down, and it reversed one of the story's original constraints.** `planning/epic-01-application-foundation/story-04-.../VISUAL-LANGUAGE.md` is the design input to Tasks 1.4.3–1.4.6: MarketPulse should read as an internal application at a large financial institution — dense, sober, desktop analyst tooling. Four decisions, all taken 2026-08-31 with the user: **a light theme only in V1** (this reversed "dark theme is the primary theme", which was an inference about market-monitoring software in general rather than a measurement); **neutral chrome with no brand accent**, so colour appears only where it carries market meaning; **the system font stack, no webfont**; and colour never being the sole encoding of anything. The consequence to carry into any styling work: with no brand hue and no distinctive typeface, **the identity is entirely structural** — a warm `#f4f3ee` ground under white surfaces, 1px near-black hairlines rather than grey borders, a single 2px radius, a 4px spacing grid, and right-aligned tabular numerals. Substituting a neutral grey for the warm one, or a light border for the near-black rule, looks like nothing in isolation and produces a generic admin panel. One measurement recorded there and owed to Task 1.4.4: the positive green `#498100` is 4.27:1 on the page ground and so fails AA there while passing at 4.75 on white. **Task 1.4.4 resolved it by darkening the green to `#427400`** (5.07 / 5.63 / 5.34 on the three grounds) rather than by constraining positive values to white surfaces, and recorded the divergence in `VISUAL-LANGUAGE.md` as that document's own rule requires.

`README.md` is the human-facing setup and command reference; `docs/adr/0001-*` records why the toolchain is shaped the way it is, `docs/adr/0002-*` why the backend is, `docs/adr/0003-*` why the frontend build is, and `docs/adr/0004-*` why the styling, the component library and the workshop are. All five were written from the facts below, so a change here usually needs a change there.

```
README.md                          prerequisites, setup, commands — for humans
docs/
  adr/                             architecture decision records (PRODUCT_SPEC §39)
    0001-repository-structure-and-typescript-toolchain.md
    0002-backend-framework-and-server-composition.md
    0003-frontend-build-tooling-and-browser-baseline.md
    0004-styling-approach-component-library-and-the-component-workshop.md
package.json                       private workspace root; pins Node and pnpm;
                                   holds every root script and all shared tooling
pnpm-workspace.yaml                workspace globs (apps/*, packages/*) and pnpm settings
tsconfig.base.json                 the one place shared compiler options live
tsconfig.json                      solution file: no sources, just references —
                                   the entry point for root `tsc -b`
eslint.config.mjs                  the one lint config; ESLint is a root-only dependency
prettier.config.mjs                the one format config; Prettier is root-only too
.prettierignore                    build output, lockfile, tsbuildinfo
.editorconfig                      charset, indentation, line endings, final newline
.gitattributes                     `* text=auto eol=lf`; marks the lockfile generated
.nvmrc                             Node 24.20.0
apps/
  backend/                         @marketpulse/backend — Fastify server (Story 1.2)
    scripts/dev.sh                 the development loop: two watchers. The first
                                   file here that is neither source nor config,
                                   and the only one no tool in `verify` checks
    src/index.ts                   the process: env, listen, signal handlers
    src/server.ts                  buildServer() — the app, without listening
    src/routes/health.ts           GET /health; also exports HealthResponse
  frontend/                        @marketpulse/frontend — React + Vite (Story 1.3)
    .storybook/                    the component workshop's configuration
      main.ts                      framework, story glob, addons, telemetry off.
                                   Reuses vite.config.ts rather than forking it
      preview.ts                   the same three stylesheets main.tsx imports,
                                   in the same order, plus the same getTokens()
                                   startup assertion. Both files are outside
                                   every tsconfig — see eslint.config.mjs
    index.html                     Vite's real entry point. At the package root,
                                   inside no tsconfig — Vite crawls its script
                                   tag to find the module graph
    vite.config.ts                 dev server, preview server, build target,
                                   React plugin. Also outside every tsconfig,
                                   hence its entry in eslint.config.mjs
    src/main.tsx                   the mount: createRoot + StrictMode
    src/App.tsx                    the placeholder shell
    src/App.module.css             the shell's styles — not one literal
                                   colour, length or font in the file
    src/styles/tokens.css          the design tokens and the theming
                                   mechanism (Task 1.4.3). Achromatic
    src/styles/market.css          the chromatic palette and the semantic
                                   market tokens over it (Task 1.4.4).
                                   The only colour with meaning in the app
    src/styles/base.css            color-scheme, the body ground, the default
                                   type, tabular figures, one focus rule
    src/styles/tokens.ts           typed read-once access to the tokens, for
                                   the consumers that are not React components
    src/cx.ts                      class-name composition; three lines that
                                   exist because of noUncheckedIndexedAccess
    src/components/                one directory per component, each holding
                                   <Name>.tsx, <Name>.module.css and
                                   <Name>.stories.tsx. One component per file —
                                   the stories check cannot see a second one
      Popover/                     the ONLY file importing @base-ui/react.
                                   A popover and not a tooltip; see below
      PriceChange/                 signed figure, arrow glyph, hidden word
      AnomalyBadge/                the band chip, its name inside the fill
      FeedIndicator/               marker shape plus word; stale is not an error
      SecurityRow/                 the representative component (Task 1.4.5),
                                   composing the four above into one <tr>
      stories.module.css           workshop furniture: the permutation grid.
                                   Imported only by stories, so never shipped
packages/
  shared/                          @marketpulse/shared — domain types shared by
                                   backend and frontend; builds to dist/ and is
                                   consumed as a TypeScript project reference
scripts/
  check-stories.mjs                the `stories` step of `pnpm verify`. The
                                   first plain-JavaScript file in the workspace,
                                   and the reason eslint.config.mjs has a
                                   globals block for `scripts/`
planning/
  PRODUCT_SPEC.md                  authoritative product definition
  EPICS.md                         epic roadmap and delivery sequence
  epic-NN-<slug>/
    EPIC.md                        goal, scope, exit criteria, story index
    story-NN-<slug>/
      STORY.md                     description, acceptance criteria,
                                   open decisions; tasks live alongside it
```

Work descends epic → story → task. Read the STORY.md before starting on a story: several carry **open decisions** (framework, UI library, hosting) that are deliberately unresolved and should be settled with the user rather than assumed.

We are building this in **small iterations**. Do not scaffold ahead of the current step: build the thin slice that is asked for, keep it working, then move on. Do not add infrastructure (databases, workers, WebSockets, agent plumbing) before the iteration that needs it.

Keep this section, and the Commands section, updated as things actually land.

## Commands

```
corepack enable    # once per machine — pnpm comes from the repo pin, not a global install
pnpm install

pnpm verify        # build → lint → format:check → stories → test. What CI will run (Story 1.10)

pnpm build         # tsc -b, THEN the frontend bundle, THEN Storybook — see below
pnpm typecheck     # the tsc -b half only; no bundle
pnpm lint          # eslint . over the whole workspace in one process; also lint:fix
pnpm stories       # fails if a component has no stories file
pnpm test          # placeholders until Story 1.9
pnpm dev           # per-package, in parallel; all three are real loops
pnpm clean         # tsc -b --clean, plus the frontend's dist/ and storybook-static/
pnpm format        # prettier --write .  — the whole tree
pnpm format:check  # prettier --check .

# Working on one package — the same six verbs, meaning the same thing:
pnpm --filter @marketpulse/shared build       # or typecheck / lint / lint:fix / test
pnpm --filter @marketpulse/shared dev         # tsc -b --watch
pnpm --filter @marketpulse/shared run clean   # `run` is required here — see below

pnpm --filter @marketpulse/backend dev        # tsc -b --watch + node --watch dist/index.js
pnpm --filter @marketpulse/backend start      # node dist/index.js — runs the built output; build first

pnpm --filter @marketpulse/frontend dev       # vite — http://localhost:5173
pnpm --filter @marketpulse/frontend preview   # vite preview — serves dist/ on :4173; build first
pnpm --filter @marketpulse/frontend storybook # the workshop — http://localhost:6006
pnpm --filter @marketpulse/frontend storybook:build  # static build into storybook-static/
```

Every package exposes `dev`, `build`, `test`, `lint`, `typecheck`, `clean` and they mean the same thing in each. `lint:fix` is an extra, not part of the convention — a local convenience with no root fan-out and no place in `verify`. **`apps/backend`'s `start` (Task 1.2.5), `apps/frontend`'s `preview` (Task 1.3.4) and `apps/frontend`'s `storybook` and `storybook:build` (Task 1.4.5) all have exactly the same status**: an extra, not a seventh verb — no root fan-out, no place in `verify`, and no obligation on the other packages. Both run the built output and build nothing themselves, so a stale or empty `dist/` is a stale or missing server and a stale page. Verified in Task 1.2.5 and again in 1.2.6: `pnpm run` waits for the script to finish and propagates both signals and the child's exit code, so `start` is a real process wrapper rather than a fire-and-forget one. `SIGTERM` to the pnpm process and `SIGINT` to the process group both give a clean exit 0 with the port released; a busy port gives exit 1 with the `EADDRINUSE` record intact. `test` is an `echo` placeholder in all three packages until Story 1.9 and is now the **only** placeholder left in the workspace — all three `dev` scripts are real as of Task 1.3.3.

**`vite preview` is not a static host, and mistaking it for one hides a real failure.** Its SPA fallback answers _any_ unmatched path with `index.html` and a 200 — `/assets/nope.js` included — so a missing asset arrives in the browser as a MIME-type error rather than a 404 naming the file. Measured against `python3 -m http.server`, which 404s both. Use `preview` to look at a build; use something dumb to prove one works.

**`clean` is the one verb that needs an explicit `run` when filtered, and this is a trap with teeth.** `pnpm clean` is a _built-in pnpm 11 command_ (alias `purge`) that removes `node_modules` from every workspace project. pnpm runs a `clean` script instead of the built-in only when the current project has one — which the root does, so root `pnpm clean` correctly runs `tsc -b --clean`. But `pnpm --filter <pkg> clean` dispatches to the built-in and fails with `[ERROR] Unknown option: 'recursive'` (exit 1), because `--filter` implies `--recursive` and the built-in takes no such flag. Verified in Task 1.2.6 for all three packages; the documented one-liner used to list `clean` alongside the other verbs and was simply wrong. **`pnpm --filter <pkg> run clean` works.** The failure is loud and deletes nothing, but do not "fix" it by dropping the root's `clean` script, which is the only thing shadowing a command that deletes `node_modules`.

**A green `pnpm test` means "no tests exist", not "tests pass".** All three placeholders exit 0, and Story 1.10 will put that tick in CI where it looks exactly like coverage. Don't describe it as passing tests anywhere — not in a commit message, not in a PR, not in this file.

**`pnpm dev` at the root is three real loops and eight processes.** `packages/shared` sits in `tsc -b --watch --preserveWatchOutput`; `apps/backend` runs `scripts/dev.sh`, which is a second `tsc -b --watch` plus `node --watch dist/index.js`, so the server's own JSON log lines appear prefixed with `apps/backend dev:`; `apps/frontend` runs `vite`. Ctrl-C takes all of it down and leaves no orphaned `node`, `tsc` or `vite` process, and releases both ports — verified in Task 1.2.6 and re-verified across all three packages in Task 1.3.5, counting survivors in the process group rather than trusting the supervisor.

**A clean Ctrl-C at the root is noisy, and the noise is not a failure.** pnpm reports each interrupted watcher as `Failed`, prints `[ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL] ... Command failed with signal "SIGINT"`, and adds a spurious `[WARN] Local package.json exists, but node_modules missing, did you mean to install?`. Nothing is missing — `node_modules` was checked immediately afterwards. Do not go looking for a broken install.

`--preserveWatchOutput` is load-bearing rather than cosmetic: without it a `tsc --watch` clears the terminal on every rebuild and takes the other packages' output — including the server's log — with it.

**Editing `apps/backend/package.json` bounces the dev server**, which reads as a bug during unrelated work and is not one. That file is now both a TypeScript program input and a file the running process loads, because the health route imports it for `version` — so adding a dependency triggers a `tsc` rebuild _and_ a `node --watch` restart. Both observed, not reasoned about.

**Root `pnpm dev` builds `packages/shared` twice** — once in its own watcher, once through the backend's `tsc -b --watch` following the project reference. Harmless, and worth knowing because the symptom of it going wrong would be a corrupted `.tsbuildinfo` with no obvious cause.

Every command in this section was executed from a clean clone in Task 1.1.8, the backend's were re-run from a clean build in Task 1.2.6, and all of them again from a second clean clone with a cold pnpm store in Task 1.3.5. `README.md` carries the same set for humans; keep the two in step.

**The dev loop's restart timing has a baseline, so a regression is visible.** Edit to new listener is ~1.1s, of which `SIGTERM` to the new listener is ~100ms (Task 1.2.4 measured 140ms) and the rest is tsc's incremental compile. The drain itself is sub-millisecond. Seconds rather than milliseconds in the signal half means a route acquired a dependency that does not close promptly. Note also that a Ctrl-C in the dev loop now logs `signal received` / `shutdown complete` on the way out — a _silent_ Ctrl-C is the symptom, not the normal case.

**The frontend has its own baseline, and it is a different mechanism.** HMR edit-to-visible-update is **~100–140 ms warm**; the first edit after a server start is ~850 ms and is not the number to regress against (Task 1.3.3). **Re-measured in Task 1.4.6 with the styling pipeline in it, and the two kinds of edit are not the same number:** a **CSS-only** edit lands in **24–130 ms** (median ~72 ms) and a **component** edit in 177–280 ms, first-edit-after-start 977 ms. Both component figures are upper bounds — the measuring tab reported `visibilityState: "hidden"`, which throttles React's scheduler — so compare the two kinds of edit to each other rather than the component number to 1.3.3's. A cheaper way to prove it was HMR and not a reload than the counter below: check `performance.timeOrigin` is unchanged. Two notes on _how_ this is checked, because the obvious method is wrong twice over. First, **editing a heading and watching it change does not test HMR at all** — it passes identically on a full page reload. The check needs component state: add a counter, click it to a non-zero value, edit a _different_ line, and confirm the number survived (done again in Task 1.3.5, then removed). Second, `clearScreen` cannot be verified through a redirected log — Vite only clears on a TTY, so both settings look identical — and the clear sequence is `ESC[1;1H ESC[0J` rather than the `ESC[2J` a grep reaches for first, which reports zero either way and reads as a pass.

**The frontend dev server does not typecheck, and its two failure modes are opposites.** A **type** error is applied as an ordinary HMR update — no overlay, no console error, state preserved — and is caught only by the editor or `pnpm verify`. A **syntax** error fails the oxc transform loudly, logs source context, and leaves the page on its last good render. The first is the dangerous one: a green-looking dev server is not evidence of a compiling tree, which is why `build` runs `tsc -b` before `vite build`.

**Both frontend servers bind IPv6 loopback; the backend binds IPv4.** `vite` and `vite preview` listen on `[::1]`, so `curl http://localhost:5173/` works while `curl http://127.0.0.1:5173/` is connection-refused. `apps/backend` defaults to `127.0.0.1` and is the reverse. Both are "localhost" to a browser and are not to a script — measured in Task 1.3.5, and it matters for anything Story 1.10 or 1.11 writes as a health check.

**Three ports, two of which are decisions.** Backend 3000 and dev server 5173 were chosen; preview 4173 is Vite's default written down explicitly, because `preview` **inherits** `server.strictPort` but **not** `server.port` — measured both ways. `preview.strictPort` is deliberately absent for the opposite reason: it _is_ inherited, and a second copy is one more place for the two to disagree on an upgrade. `strictPort: true` means a busy 5173 or 4173 exits 1 rather than quietly binding the next port up, matching the backend's `EADDRINUSE` behaviour; the deciding reason was Story 1.12's CORS allowlist, which a silently moved port fails as a browser error naming neither the port nor the cause.

**Most root scripts do not fan out, and `build` is now the exception that proves the rule.** `typecheck` is still a single `tsc -b` over the root solution `tsconfig.json`, because the reference graph already orders the work — `pnpm -r run build` would build `packages/shared` three times. **Root `build` is no longer a bare `tsc -b`**: it is `tsc -b && pnpm --filter @marketpulse/frontend exec vite build`, because the frontend's TypeScript half is `noEmit`, so a plain `tsc -b` would typecheck the frontend, emit no bundle, and let `pnpm verify` pass without the bundler ever running. It names one package rather than fanning out, for the reason above — which means **a second frontend package would be silently missed**. Since Task 1.4.5 it names that package **twice**, because `storybook build` is a third clause on the same line, so there are now two places to miss it. Read the root `build` whenever a package is added; it is the one root script that hardcodes a package name. `lint` is a single root `eslint .` because each package's `eslint .` resolves the same root config, so a fan-out starts three ESLint processes each building its own typescript-eslint project service over the same solution. Only `test` and `dev` are genuinely per-package and use `pnpm -r`. Keep the per-package scripts for working on one package; the root ones are the direct call.

The root `tsconfig.json` is a solution file — `files: []` plus three `references`, compiling nothing itself. It does **not** extend `tsconfig.base.json`, and should not: inheriting compiler options would imply it has sources.

**`typecheck` and `build` are the same command on purpose.** Consumers compile against `packages/shared/dist/*.d.ts`, so typechecking this workspace _is_ building it; there is no cheaper correct pass, and a per-package `--noEmit` fan-out is exactly the thing that passes against stale declarations. Both names are kept because they can diverge later without a rename. `packages/shared`'s `typecheck` was `tsc --noEmit -p tsconfig.json` until Task 1.1.7 and is now `tsc -b` like everything else.

`verify` chains with `&&`, so the first failure is the exit code, and a failing package script propagates up through `pnpm -r` (verified: a package `test` exiting 3 gives root exit 3).

**`tsc -b --clean` deletes the output of the sources that currently exist, so a hand-deleted source orphans its output permanently.** Delete `src/routes/thing.ts` and `dist/routes/thing.{js,d.ts,js.map,d.ts.map}` survive every subsequent `pnpm clean` — the build state is not what drives the deletion. Measured in Task 1.2.6 after the reverse was written down as a guess; Task 1.2.5 found the residue and Task 1.2.6 found the actual mechanism. **Clean before deleting a source file, or delete its output by hand afterwards.** The symptom is stale files in `dist/` that look like a broken build and are not.

**That trap does not reach `apps/frontend`.** Its `dist/` is Vite's, not tsc's, so its `clean` is `tsc -b --clean && rm -rf dist` — and `rm -rf` is content-blind, deleting the directory whatever sources exist. The root's `clean` gained the same second half for the same reason. The worry that motivated re-checking it turned out to be moot anyway: **`build.emptyOutDir` defaults to true** when `outDir` is inside the project root, so Vite empties the directory on every build and hashed assets never accumulate. Measured in Task 1.3.4 after the opposite was assumed. It is a **default rather than a guarantee** — `emptyOutDir: false` brings the whole problem back.

**`apps/backend/dist` is not a runnable artifact on its own, for two independent reasons, and the first hides the second.** Copied elsewhere it fails at import time on `fastify`, before it ever reaches the health route's read of `../../package.json`; give it a reachable `node_modules` and it then fails on the manifest. Both are `ERR_MODULE_NOT_FOUND` before `listen`. The **package directory** — `dist` + `package.json` + `node_modules` — does run outside the workspace, verified. "Copy `dist/` to the server" is the obvious wrong move and the error message names only half the reason. Story 1.11 owns the real answer (`pnpm deploy --filter`).

**`apps/frontend/dist` is the opposite, and the asymmetry is the point.** It _is_ a runnable artefact on its own: **three files** since Task 1.4.2 (it was two until the first stylesheet; the token layer in Task 1.4.3 grew the stylesheet from 0.07 kB to 3.04 kB, the semantic layer in Task 1.4.4 to 6.22 kB and the components in Task 1.4.5 to 7.21 kB, none of them adding a fourth), no `package.json`, no `node_modules`, zero bare imports left in the bundle. Copied outside the workspace and served by `python3 -m http.server`, it renders. Two consequences for Story 1.11 that neither app implies on its own — the emitted asset path is **absolute** (`base` defaults to `/`), so a subpath deployment is a `base` change and a **rebuild** rather than a hosting setting; and rebuilding `packages/shared` does **not** reach a built frontend, because the shared code is inlined at bundle time and the workspace symlink is not part of the artefact. Both measured in Task 1.3.4.

**`pnpm verify` no longer covers every file in the repository, and there are now two gaps.** `apps/backend/scripts/dev.sh` is checked by nothing: ESLint sees only JS and TS, Prettier has no shell parser and skips it silently, and `tsc` has no view of it. It is a file that starts the development server, so a syntax error in it is a real if minor failure mode. The second is smaller and the same shape: two `clean` scripts now contain `rm -rf` fragments — unchecked shell inside a JSON string, and Task 1.4.5 added `storybook-static` to both. Not worth a `shellcheck` dependency and another `verify` step for one small file and two small strings — a known and dated choice (2026-08-30), not something CI quietly catches. Note `scripts/check-stories.mjs` is **not** a third gap: it is JavaScript, so ESLint and Prettier both cover it. Story 1.10 carries the same note.

**Fastify's startup log is not evidence of the bound interface.** It rewrites `0.0.0.0` to `127.0.0.1` in its `Server listening at` line, so `HOST=0.0.0.0` logs `http://127.0.0.1:<port>` while the socket really is `*:<port> (LISTEN)`. Confirmed with `lsof` in Tasks 1.2.1 and 1.2.6. Check the socket, not the log — this matters for Story 1.11.

`.claude/worktrees/` is in both `eslint.config.mjs`'s ignores and `.prettierignore`. It holds git worktrees — whole second checkouts nested inside the repo — which root-level `eslint .`/`prettier .` otherwise walk into and report on. Anything else nesting a checkout here needs the same two entries.

**Node 24.x is required, not merely recommended.** `engineStrict` is on, so pnpm refuses to install under another major rather than warning. Node 23 additionally cannot bootstrap the repo at all: the Corepack it bundles (0.29.4) has a stale npm signing keyset and fails to fetch the pinned pnpm.

pnpm settings live in `pnpm-workspace.yaml`, not `.npmrc` — pnpm 10+ moved them, and pnpm 11 silently ignores workspace settings left in `.npmrc`.

Dependencies may not run install scripts unless named in `allowBuilds` in `pnpm-workspace.yaml`; an un-allowlisted one fails the install outright. This is deliberate. When it fires, allowlist the specific package — never disable the check.

**`allowBuilds` has exactly one entry, `esbuild`, added in Task 1.4.5 — the first time the policy has fired in the shipping tree rather than in a spike.** Storybook 10's core package depends on esbuild directly, and its install script fetches the platform binary it cannot ship in one package, so it genuinely needs to run. A sweep of the installed tree confirms esbuild is still the **only** package here with an install script — re-run in Task 1.4.6 with the same result. Note this is not Vite's esbuild, and the paragraph below is why that distinction survives.

**The mechanism was measured first in Task 1.4.1, against a styling library rather than a workshop.** The mechanism is precise and was measured rather than inferred: Vite 8 lists `esbuild` only in `peerDependenciesMeta` as `optional: true`, so there is genuinely **no esbuild in this toolchain** until some plugin supplies it. `@vanilla-extract/vite-plugin` supplies it (via `@vanilla-extract/compiler` → `@vanilla-extract/integration`), and adding it gives `[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: esbuild@0.28.2` with `pnpm install` at **exit 1** — the policy fails the install outright, as documented.

Two things about the failure that are not obvious. **pnpm rewrites `pnpm-workspace.yaml` when it fires**, appending an `allowBuilds:` block with `esbuild: set this to true or false` — a stub that is itself invalid until edited, rewritten on every subsequent failed install. So a tracked file changing under you is part of the failure mode, not a stray edit. And **Tailwind was the suspected trip and is not one**: a clean-room install of `tailwindcss` + `@tailwindcss/vite` exits 0, `@tailwindcss/oxide`'s platform binding is prebuilt like Rolldown's, and a full `preinstall`/`install`/`postinstall` sweep of the installed tree found none. Story 1.3's prediction was right about the package and wrong about the route.

**Rolldown is the first dependency here with a platform-specific native binding.** `@rolldown/binding-darwin-arm64` resolves locally and something else on Linux CI. The lockfile records all fifteen platform variants as optional dependencies, so it should just work — but this is the first time "works on my machine" has a real mechanism behind it in this repo, and CI is where it would surface. Story 1.10 carries the note.

**Shared tooling lives at the workspace root; packages declare only what they actually import.** ESLint, Prettier and TypeScript are all root-only devDependencies — no package declares any of them. pnpm puts the root's `node_modules/.bin` on the PATH of every workspace package script, so `eslint .` and `tsc -b` resolve from a package directory (verified: `pnpm exec tsc --version` reports the pinned 6.0.3 from a package that declares nothing). ESLint's flat config is found by searching upward. `@types/node` is the counter-example and stays in `apps/backend`, because it is a type dependency of that package's code rather than a tool.

Story 1.3 is where this rule is easiest to over-apply, and it splits cleanly: **Vite, `@vitejs/plugin-react` and `eslint-plugin-react-hooks` are tools and live at the root; React, React DOM and their `@types` are imported by `apps/frontend`'s code and live there.** "Does the package's source `import` it?" is the whole test.

Task 1.1.7 considered a pnpm catalog instead — `"typescript": "catalog:"` in each package, version in `pnpm-workspace.yaml` — and rejected it: packages stay self-describing but the workspace ends up with two conventions. One rule is worth more here. Apply the same rule to the next tool.

There is one `eslint.config.mjs` and there should stay one. `.mjs` because the root `package.json` has no `"type": "module"`.

**It now has six kinds of block and the order is load-bearing:** global ignores → `js.configs.recommended` → type-aware TypeScript → per-package globals → React (`apps/frontend/src/**`) → Storybook → tooling files (`disableTypeChecked`, **last**). The React block sits between the globals blocks and the trailing one deliberately: it is scoped to `src` so `vite.config.ts` is never asked React questions, which leaves the trailing block's job unchanged. Flat config is order-sensitive and `disableTypeChecked` has to win over the TypeScript block, so nothing goes after it.

**`eslint-plugin-storybook` is the second plugin here beyond typescript-eslint, and it set the same trap the first one did.** Take the config from `configs["flat/recommended"]`, not `configs.recommended`: both exist, the unprefixed one is still eslintrc-shaped, and ESLint 10 rejects it outright. It carries its own `files` globs — `**/*.stories.@(ts|tsx|…)` and `.storybook/main.*` — so it is spread rather than scoped, and it sits before the trailing block. Ten rules reach a story file, three of them at `warn`, which `--max-warnings 0` makes failures; none of them is a formatting rule, so the measurement that keeps `eslint-config-prettier` uninstalled still holds. It also sets `react-hooks/rules-of-hooks` off for stories, which is why the React block above it is not disturbed.

**`vite.config.ts` is the second file needing that trailing block, and the first that is not `eslint.config.mjs` itself.** It is a `.ts` file inside a package whose tsconfig `include` is `src/**/*`, so the project service has no program for it and type-aware linting fails hard — `Parsing error: ... was not found by the project service`, not a silent skip. It also takes Node globals rather than the browser globals the rest of `apps/frontend` gets, since it runs in Vite's process rather than in a page. That note about the block having to stay last is now protecting **four** files: Task 1.4.5 added `.storybook/main.ts` and `.storybook/preview.ts`, which are the same case for the same reason. Widening the frontend's tsconfig `include` is the wrong fix — it would pull the workshop's configuration into `tsc -b` and into the application's program.

**`eslint-plugin-react-hooks` is the first ESLint plugin here beyond typescript-eslint**, adopted in Task 1.3.2. Two things about it. Take the config from **`configs.flat`**, not the top-level `configs`: both export a `recommended-latest`, the top-level one is still eslintrc-shaped (`plugins: ["react-hooks"]`), and ESLint 10 rejects it outright with "Flat config requires plugins to be an object" and exit 2. Loud, at least. And `recommended` is much wider than the name suggests — 17 rules, most of them the React Compiler's Rules of React (`purity`, `immutability`, `set-state-in-render`) rather than hook ordering. Taken whole on purpose, and **never yet exercised**: 15 of the 17 are at `error` and the tree contains one stateless component. The first time they say something interesting will be in Epic 2, and it may not be welcome then.

**`lint` carries `--max-warnings 0` in all four scripts**, which is a change to what the workspace verb means rather than a frontend detail. `eslint-plugin-react-hooks` brought this repository's first `warn`-severity rules (`exhaustive-deps`, `incompatible-library`, `unsupported-syntax`), and `eslint .` alone does not fail on warnings — so `verify` would have gone green with real findings in it, the same green-tick-that-means-nothing problem as the placeholder `test` scripts. The severities are still the plugin's; what changed is that a warning now costs something.

Linting is **type-aware** (`strictTypeChecked` + `stylisticTypeChecked`, via typescript-eslint's project service). Two consequences: `packages/shared` must be built before lint is meaningful, same as typecheck; and `no-undef` is off for `.ts` files, so the per-package `globals` in the lint config change nothing on TypeScript. Undefined-global errors in `.ts` come from tsc, not ESLint. **The JS tooling file they were written in anticipation of arrived in Task 1.4.5**: `scripts/check-stories.mjs` is the first plain JavaScript in this workspace, `no-undef` _is_ an error there, and without a `globals.node` block for `scripts/**/*.mjs` it is eight errors on `console` and `process` and a failing `verify`. That block is the first one in the file that changes a result rather than documenting an intention.

`tsconfig.base.json` deliberately omits `noUnusedLocals`/`noUnusedParameters`: `@typescript-eslint/no-unused-vars` owns that, so one problem is not reported by two tools with different escape hatches. Don't add them back.

**TypeScript is held at 6.0.3 while npm's `latest` is 7.x**, in the root `package.json` and nowhere else — raising the pin is a one-line edit. TS 7 is the native compiler; `typescript-eslint` does not support it yet (peer range `<6.1.0`), and this repo relies on type-aware linting. Don't raise the pin until typescript-eslint's peer range admits TS 7 — check it, don't assume it. Last checked 2026-08-30: still `>=4.8.4 <6.1.0` at typescript-eslint 8.68.0. Note `@eslint/js` does _not_ share a version line with `eslint` (10.0.1 vs 10.9.1) — don't pin them in lockstep.

Packages are consumed as **TypeScript project references with built output**, not raw source. So a consumer can only be typechecked after `packages/shared/dist/*.d.ts` exists — build before you typecheck. `tsc -b` handles the ordering itself.

**Typecheck a consumer with `tsc -b`, never `tsc --noEmit`.** Because consumers compile against emitted declarations, editing `packages/shared/src` changes nothing for an app until shared is rebuilt, and `--noEmit` reports success against the stale `.d.ts`. Verified: renaming a shared export leaves `--noEmit` at exit 0 in `apps/backend` while `tsc -b` correctly fails. This is why every package's `typecheck` script — and the root's — is `tsc -b`. Note the precise failure mode: the silent pass needs a _stale_ `dist`, not a missing one. On a tree with no `dist` at all, `--noEmit` does report the cross-package error; `tsc -b` is right in both cases, which is why it is the one wired up.

The apps override exactly **six** compiler options between them — it was four until Story 1.3 — and each is load-bearing. The backend sets `types: ["node"]` (with `@types/node` pinned to the runtime major, 24.x — not npm's `latest`). The frontend sets `types: ["vite/client"]` — it was `[]` until Task 1.4.2 — plus `target`/`lib` with `"dom"`, and adds two more:

- **`noEmit`** (Task 1.3.1), which is what resolves the `dist/` collision — `tsc -b` and Vite both default to writing there, so a producer was removed rather than the directories separated. Safe **only** because `apps/frontend` is a composite project referenced by nothing; it would be actively wrong for `packages/shared`, whose declarations are its entire contract. `composite` still applies alongside it and is still required, and that combination was an error in older TypeScript versions — re-check it on an upgrade
- **`jsx: "react-jsx"`** (Task 1.3.2), the modern transform, so a `.tsx` file needs no `import React`. That matters more than it looks: `verbatimModuleSyntax` makes imports literal, so an `import React` kept only for the classic transform would be a real unused runtime import rather than something erased. Note this is what tsc _typechecks_ against, not what runs — the bundler produces the JavaScript, so a disagreement shows up in the browser rather than in a compile error

The frontend's `types` array is not redundant, and **what makes it work is that it is explicit, not that it is empty** — the distinction stopped being academic in Task 1.4.2, which put `vite/client` in it. Without an explicit list TypeScript auto-discovers every reachable `@types` package, and pnpm's linking puts `@types/node` in reach, so `process` would typecheck in browser code. It still does not: a deliberate `process.env` reference fails `TS2591` with `vite/client` present, measured. **Adding `@types/react` did not change it either** — React's types arrive through `import` statements rather than global auto-inclusion, so the array is for _globals_. Adding an entry there is the wrong reflex for any library that is imported rather than ambient; `vite/client` qualifies because `import "./x.css"` and `import.meta.env` are both ambient declarations with no import to hang them on.

**That one entry has two readers and only one of them is Story 1.4.** A side-effect CSS import without it is `TS2882` (not the `TS2307` a `.module.css` default import gives — both codes are real and they are not interchangeable), and Story 1.6's `import.meta.env` is `TS2339`. Task 1.4.2 added it first; Story 1.6 inherits it and its STORY.md says so. Do not add it twice.

**CSS Modules have a house idiom and both halves of it are forced by lint.** `vite/client` types a stylesheet as `{ readonly [key: string]: string }`, so `noUncheckedIndexedAccess` makes every class `string | undefined` — the obvious ``className={`${styles.a} ${styles.b}`}`` is one `restrict-template-expressions` error per interpolation, and `--max-warnings 0` makes that a failing `verify`. Reaching for `styles["a"]` instead is a `dot-notation` error. The answer is `cx(styles.a, styles.b)` from `apps/frontend/src/cx.ts`: dot access, composed through the helper. And the cost that has no answer — **a class-name typo is completely silent.** It typechecks, lints, builds, and renders unstyled, because an index signature has no key set to check against. Nothing in `pnpm verify` catches it; per-file generated types would, at the price of a build step and a `.gitignore` entry.

**Design tokens are CSS custom properties, and CSS is the source of truth — `apps/frontend/src/styles/tokens.ts` is a typed reader over it, not a second definition.** Task 1.4.3 rejected the generated pair (TypeScript source, emitted CSS) because it costs a build step, a generated file and a staleness check in `verify` for a benefit nothing needs yet. Four consequences worth knowing before reaching for a value from JavaScript: every token reads back as a **string** (`"4px"`, `"#f4f3ee"`), so Epic 6's WebGL renderer will need a parse layer; `getComputedStyle` runs **once** at startup and the result is frozen and cached, which is the whole reason that module exists rather than each consumer calling it; the read has to happen after the stylesheet is applied, which the built artefact guarantees because a pending `<link>` blocks script execution; and a second theme would invalidate the cache, so `readTokens()` is exported uncached. The one thing it buys back is a **checked name** — a token is a union member, unlike a CSS Module class — which is why `main.tsx` calls `getTokens()` before rendering: a token declared in TypeScript but missing from the stylesheet is a startup throw naming it, rather than a page that renders unstyled in silence.

**The theming mechanism is `:root, [data-theme="light"]`, and both halves of that selector were measured rather than reasoned about.** Themeable values (surfaces, ink, rules, the one shadow) sit in that block; geometry, spacing and type sit on bare `:root`, because a second palette would change none of them. Injecting a `[data-theme="dark"]` block of **eight values and nothing else** and flipping the attribute moved the whole page — ground, surfaces, ink and hairline — with no selector, component or markup change; removing the attribute entirely still gives the correct light page, so a missing or misspelled `data-theme` is not a themeless render. `index.html` sets the attribute anyway, so the theme is out of the first-paint path. The cost, if a second palette ever arrives: the `:root` half has to pick a side. Note also that `color-scheme: light` in `base.css` changes no pixel today — it is there so the light appearance of a native `<select>`, a scrollbar and the pre-paint background is a stated choice rather than a coincidence.

**Colour lives in exactly one file, and that is a property of the layout rather than a habit.** `tokens.css` is structural and **achromatic**; `apps/frontend/src/styles/market.css` (Task 1.4.4) holds every colour that carries meaning. The shape is a chromatic palette block plus a semantic block over it, and **exactly one indirection**: `--price-negative` resolves to `--palette-red-strong`, never to a hex, and never through another semantic token. The achromatic semantics deliberately do **not** get palette entries of their own — `--price-unchanged` is `var(--ink-secondary)`, because a second definition of `#5a5d5c` is a value waiting to drift. The palette is themeable and sits in the `[data-theme="light"]` block; the semantic mapping is not, because positive is green in every theme and only the green changes. Cascade order in `main.tsx` is `tokens.css` → `market.css` → `base.css`, and it is not alphabetical.

**No market state is legible by colour alone, and this was measured rather than asserted.** Under `grayscale(1)` the positive green and the negative red differ by **1.05:1** — they are the same tone, so the hue is the entire difference and nothing about direction survives desaturation. What actually carries it is the arrow glyph and the sign on the figure; an anomaly band is a **written name inside its fill**; a feed state is the **shape** of its marker, filled or hollow. Deuteranopia and protanopia projections of the built page separate the two price directions by 2.99:1 and 2.31:1, both olive. Task 1.4.5 is where this pairing gets a component behind it instead of relying on each author remembering. Two related notes: the anomaly ramp is amber and **deliberately not red**, because red already means price-down and an extreme anomaly on a security moving sharply up would read as a fall; and the direction glyph sits in a fixed-width box because arrows are not in the font's tabular set and would otherwise undo the column alignment.

**The names are domain and live in `packages/shared`; the colours are not and stay in `apps/frontend`.** `AnomalyBand` (`normal` / `elevated` / `unusual` / `extreme`) and `FeedStatus` (`live` / `stale` / `disconnected`) are there because the backend computes and reports both, and the alternative was two vocabularies for one thing. **The score-to-band boundaries are deliberately absent** — that is Epic 5's detection policy, and a threshold invented in a styling task would outlive the guess. Note also that `--status-error` and `--price-negative` resolve to the **same red**: there is one red, and "price down" and "this failed" are separated by presentation — a bare signed figure in a column versus a titled block with a message — rather than by hue. A stale or disconnected feed is neither, and is achromatic apart from the amber on `stale`; PRODUCT_SPEC.md §36 makes it a product state, not a failure.

**One property of `tokens.ts` that only appears once there is a semantic layer:** `getPropertyValue` returns the **substituted** value, so `--price-unchanged` and `--ink-secondary` both read back as `"#5a5d5c"`. The indirection is source-level and does not survive into JavaScript — right for a consumer that wants the colour, and worth knowing before anyone tries to verify the indirection through that module. The eleven market tokens are in `TOKEN_NAMES` because Epic 6's topology colours a node by its band and a canvas cannot read a CSS class.

**`font-variant-numeric: tabular-nums` is set once on `body` and is load-bearing rather than cosmetic.** Measured on the built page at the product's default 14px: `1,111.11`, `8,888.88` and `1,088.18` all render at **60.023 px** with tabular figures and at 44.570 / 58.844 / 53.969 px without — a 14.3 px spread, about a third of the column. Epic 3 updates these continuously, so losing it turns a live price column into visible noise. It is inherited, so a component that needs alignment should not re-declare it; a component that breaks alignment has overridden it.

**Components live in `apps/frontend/src/components/<Name>/`, one component per file, with its stylesheet and its stories beside it.** The layout is not a preference — `scripts/check-stories.mjs` depends on it, and the one-component-per-file half is what keeps that check honest: it cannot see a component declared inside another component's file, so the convention is the thing that makes the limitation harmless. Every component ships **one named story per discrete state plus an `AllPermutations` story** rendering the cartesian product in a labelled grid. Where the product is unbounded, the story fixes representative **extremes** rather than plausible examples — the widest digits, the longest ticker, a negative sign — because those are what break a tabular column, and Task 1.4.3 measured a 14.3 px spread riding on exactly that.

**`pnpm stories` proves a file exists and nothing more, and its own header says so.** It does not prove the stories inside cover the permutations; nothing cheap can, because a variant set is a type and the check does not typecheck. It has been seen to fail — move a `.stories.tsx` aside and it exits 1 naming the file and the path it wanted. That matters: a check that has never failed is a check that has never been tested, which is the same problem as the placeholder `test` scripts one paragraph up.

**The workshop loads the same cascade the application does, and this is deliberate rather than incidental.** `.storybook/preview.ts` imports `tokens.css` → `market.css` → `base.css` in that order — not alphabetical, same as `main.tsx` — sets `data-theme="light"` on the document element, and calls `getTokens()` as the same startup assertion. So `getTokens()` now runs in two places, and a token declared in TypeScript but missing from the stylesheets throws in the workshop exactly as it does in the application. A component that renders correctly in one and wrongly in the other is a cascade problem, and it should not be possible to have one without seeing it.

**The a11y panel reports, and its tab badge does not mean what it looks like.** `@storybook/addon-a11y` runs axe per story and never fails a build — the `test` parameter that would do so drives Storybook's Vitest integration, which Story 1.4 deliberately did not adopt. On `SecurityRow`'s 36-row grid: **0 violations, 17 passes, 1 inconclusive** — and the `1` on the tab is the _inconclusive_, not a violation. The inconclusive is the interesting part: it is `color-contrast` over 24 nodes, every one of them a direction arrow (`<span aria-hidden="true">▲</span>`), with axe's reason "Element content contains only non-text characters". **Automated tooling declines to judge the exact element carrying the non-colour encoding.** That is why Task 1.4.4's manual contrast and colour-blindness measurements are the record, and why Epic 15's review cannot be an axe run.

**`pnpm --filter @marketpulse/frontend dev` needs `packages/shared` built first, and says so obliquely.** After a `pnpm clean` it starts, serves, and prints `Failed to run dependency scan … @marketpulse/shared … could not be resolved. Are they installed?` — which points at the install and means the project reference has no `dist`. Root `pnpm dev` does not have the problem because the shared watcher is one of its three loops. Build, then filter.

**Stories are inside `tsc -b`'s program and outside the bundle, and the invariant is worth re-checking after anything that touches the entry graph.** `.stories.tsx` files sit under `src/`, so they typecheck, they lint under the full type-aware pass and the React Compiler rules, and the `.js` import-extension rule applies to them. They are unreachable from `index.html`, so `vite build` still emits **three files** and no story string appears in the output — verified by grepping the emitted JavaScript for `AllPermutations`, the story titles and the workshop stylesheet's class names, all zero. `src/components/stories.module.css` is the file to watch: it is workshop furniture, and the day it appears in `dist/assets/*.css` something has imported a story from application code.

**The Base UI seam is a popover and not a tooltip, and that is a finding rather than a preference.** `src/components/Popover/Popover.tsx` is the only file in the application that imports `@base-ui/react`. It was written as a tooltip first; measured against the built workshop, Base UI's tooltip renders **no `role="tooltip"`** and wires **no `aria-describedby`** — deliberately, and its own documentation says as much: a tooltip is for sighted users, and "if the description is important to understanding the element, don't hide it behind a tooltip". The first thing behind this seam is an anomaly score's explanation, which PRODUCT_SPEC.md §11 makes mandatory and therefore important by definition. The popover measures `role="dialog"` with both `aria-labelledby` and `aria-describedby` present. The cost is that an explanation is a click rather than a glance; if a genuine _hint_ is ever needed, it comes back as a **second** wrapper rather than as a looser version of this one. The general lesson, which Epic 15 should inherit: "accessible primitives" is a property of each primitive, not of a library.

**The wrapper rule now stands on its own reason, because the check behind it was retired.** Base UI was chosen over the lighter Radix on an intended later swap to an external shared component library, and that library's exports have never been read — Task 1.5.1 asked directly and they are **not available**, so the check is closed as unresolvable rather than deferred a fourth time. What replaces it: build against Base UI's interfaces and our own, keep every usage behind a thin wrapper in `src/components/<Name>/`, and make a wrapper's props **our** vocabulary rather than a re-export of the primitive's — `Popover` is the model at 30 lines of assembly with nothing of `@base-ui/react` in its public type. The count of files importing `@base-ui/react` is the figure worth watching; it is **one**. The swap cost is then the wrapper files rather than the application, which is the property the wrapper layer was bought for. Radix and react-aria-components remain the standing alternatives if Epic 15 finds against Base UI.

**Base UI's real cost landed here, and it is larger than the story's headline number.** The application bundle went from 196.36 kB to **300.09 kB across 193 modules** when the popover arrived — about 104 kB — against Task 1.4.1's measurement of Radix being lighter by 37 kB for one primitive. That reversal was taken knowingly and on a constraint no spike could produce; the number is recorded so nobody re-derives it or reads the growth as a regression. The stylesheet went 6.22 kB → **7.21 kB** (1.94 kB gzipped — the whole design language, both token layers and five components), and the artefact is still three files. Note Task 1.4.5's own record says 293.06 kB and 7.05 kB: those were measured mid-task, before the last edits it shipped. **Task 1.4.6's clean-build figures above are the story's baseline**, and they reproduce byte-for-byte across rebuilds.

**The router is React Router 8.3.1, and two things about it are traps.** `react-router-dom` is **not** the package — it is stranded at 7.18.3 and v8 ships everything from `react-router` itself, so installing the familiar name gets a major version behind. And it peers `react >=19.2.7` against our 19.2.8, which is the **narrowest peer margin in this repository**: a React downgrade is now a router failure too. It is a dependency of `apps/frontend` and there is **no plugin and no root tooling** — declarative mode is a library import and nothing else, and `@react-router/dev` (framework mode) is deliberately not adopted; if it ever is, it is root tooling beside Vite. Task 1.5.1 measured the cost against the Story 1.4 baseline before installing it, so the number is attributed to the decision rather than discovered later: **+37.73 kB and +60 modules** (300.09 → 337.82 kB, 193 → 253), against TanStack Router's +74.58 kB and +83 modules. Nothing imports it yet, so today's artefact is byte-identical to Task 1.4.6's. `allowBuilds` did not fire — `esbuild@0.28.2` is still the only install script in the tree.

**The one thing React Router does not give us is a checked path.** `to=` is a string, and a typo is silent until someone clicks it. That is the **third** silent-failure class in this frontend, alongside the misspelled CSS Module class and the missing `.js` import extension — and it is the one alternative that would have closed it: TanStack Router's typed routes make a bad path a `TS2322` naming the valid set, verified in the spike. It lost on twice the bundle for four routes, on a generated `routeTree.gen.ts` needing a `.gitignore` entry and a staleness answer, and on half its value being a data layer Epic 2 owns. If mistyped routes become a real recurring defect, that is the reversal trigger and 37 kB is the price.

**Focus is the token layer's, not each component's.** `base.css` carries one global `:focus-visible` rule and no component declares another. Measured on a real control for the first time in Task 1.4.5: `Tab` reaches the popover trigger, which is a genuine `<button>`, `:focus-visible` matches, and the computed outline is `rgb(28, 28, 28) solid 2px` at `outline-offset: 2px`. A component that adds its own focus style is answering a question the tokens already answered.

**The React Compiler rule set fired for the first time in Task 1.5.1, and it was state rather than the router.** It had never fired through five components — nothing in the tree was stateful and there were no hooks anywhere, and Task 1.4.5's prediction that components would be the first test was wrong because CSS Modules compute nothing during render. The router spike's `:symbol` route synced state from a URL parameter the obvious way and `react-hooks/set-state-in-effect` failed `lint` at **error**. Neither router candidate provoked a rule on its own: `useParams`, `Link`, `Outlet` and `RouterProvider` are all silent under `strictTypeChecked` and all 17 rules, and the same route written without the effect lints clean. So the rule set is not hostile to routing — it has an opinion about a very common shape, `--max-warnings 0` makes that opinion a failing build, and a route module that derives from the URL rather than mirroring it into state will not meet it.

**Two toolchain behaviours that only appear when writing stories.** `exactOptionalPropertyTypes` makes "prop absent" and "prop present as `undefined`" different types, so a permutation grid mapping over a table of optional values does not compile and has to be written out — the compiler drawing the same distinction the component's API does. And a decorator written inline in a `Meta` object makes the inferred type unnameable: `TS2883`, "cannot be named without a reference to `PartialStoryFn` … this is likely not portable". Naming the decorator (`const withTable: Decorator = …`) fixes it.

**`apps/frontend`'s `target` has a second reader.** `build.target` in `vite.config.ts` must equal it: tsc's `target` decides what the language allows, Vite's decides what ships after downlevelling. Vite 8's default is `baseline-widely-available`, which is _lower_ than es2024 — so leaving it unset is a silent disagreement, not a neutral default. The baseline itself is evergreen desktop per PRODUCT_SPEC.md §3; see ADR 0003 §4.

Relative imports inside a package carry explicit `.js` extensions from `.ts` files (`./ticker.js`, and `./App.js` for an `App.tsx`). It looks wrong; `nodenext` resolution requires the _emitted_ filename and errors (TS2835) without it. Every package also needs `"type": "module"`.

**In `apps/frontend` the convention has exactly one enforcer, and it is `tsc`.** Both producers accept the extension, for different reasons — tsc maps the emitted name back under `nodenext`, Rolldown tries TypeScript source extensions for a `.js` specifier — but they do not agree on the _negative_ case. Drop the extension and `tsc -b` fails with TS2835 and exit 1 while `vite build` resolves `./App` to `App.tsx` and emits a **byte-identical** bundle (measured in Task 1.3.5). So a violation is caught by `build` and by nothing the dev server or the bundler does. Re-check this on a bundler upgrade rather than trusting it.

Every shared compiler option lives in `tsconfig.base.json` and nowhere else. Packages extend it and add only `include`, `outDir`/`rootDir`, project `references`, and the frontend's `target`/`lib`. Each option in that file carries a comment explaining why it is there — if you change one, change the comment. `lib` is intentionally unset so it follows `target`.

Prettier follows the root-only tooling rule above, and there is one `prettier.config.mjs`. `.mjs` rather than `.prettierrc.json` so each option carries the reason it is set. Every option in it is explicit even where it restates a Prettier default — a Prettier upgrade must not quietly restyle the tree.

**Formatting is Prettier's, correctness is ESLint's, and the two do not overlap.** `eslint-config-prettier` is deliberately **not** installed: of the 138 rules the lint config enables on a `.ts` file, zero are formatting rules, and the only `eslint-config-prettier` "special rule" enabled is `no-unexpected-multiline`, which guards hand-written code rather than fighting Prettier's output. Measured with `eslint --print-config`, not assumed — re-run it rather than trusting this paragraph, and if a real conflict ever appears, `eslint-config-prettier` goes **last** in the flat config array.

`tsconfig.base.json` has no Prettier `overrides` entry and does not need one. Prettier infers the plain `json` parser for it (the `.base.` infix misses Prettier's JSONC filename list), and that parser preserves comments anyway — verified. Don't add one.

LF is stated in three places and all three must agree: `endOfLine: "lf"` in the Prettier config, `end_of_line = lf` in `.editorconfig`, and `* text=auto eol=lf` in `.gitattributes`. `.editorconfig` binds editors only — git still normalises on checkout by its own rules, so `.gitattributes` is what actually prevents CRLF diffs.

Prettier owns the Markdown in `planning/` too, not just code — the docs were normalised in Task 1.1.6 (`*` bullets to `-`, `*emphasis*` to `_emphasis_`, padded tables). Write prose however you like and let `pnpm format` settle it; `format:check` covers those files.

WebStorm needs no per-machine setup: `.idea/prettier.xml` is checked in with `AUTOMATIC` mode plus format-on-save and format-on-reformat, so WebStorm resolves the same `prettier` package and the same config file the CLI does.

All of the above was verified from a clean clone in Task 1.1.8 — fresh `git clone`, empty pnpm store, empty Corepack home — and again in Task 1.3.5 with the frontend in place: 200 packages installed cold in 1.3s, `pnpm verify` exits 0 in 7.6s, and the emitted bundle is **byte-identical** to the working tree's (md5 `e3fa3b5e…`). **Task 1.4.6 re-ran `clean`/`install`/`verify` with the workshop in the chain and it is 10.5s** — warm, the steps are build 2.2s, lint 3.3s, `format:check` 1.4s, `stories` 0.24s, `test` 0.45s, and cold the build splits `tsc -b` 1.54s / `vite build` 0.49s / `storybook build` 1.38s. Storybook is the slower bundler and the workshop's own output is 227 modules and 7.4 MB across 50 files. The reasoning behind each decision is collected in `docs/adr/0001-repository-structure-and-typescript-toolchain.md` and `docs/adr/0003-frontend-build-tooling-and-browser-baseline.md`; this file is the operational summary and those are the record of _why_. Two things a fresh checkout deliberately does **not** prove: the stale-`dist` trap above (a clean clone has no stale `dist` — the evidence is in Tasks 1.1.4 and 1.1.7), and the nested-worktree problem (a clean clone has no worktrees). A third it does not prove either: **that a clean clone reaches a running application by following `README.md` alone.** That is Story 1.8's criterion, and 1.3.5 checked install-and-verify rather than the running pair.

Still missing here, and it should be added the moment it exists: how to run a **single** test. Story 1.9 picks the runner.

## What MarketPulse is

An AI-assisted situational-awareness tool for US equities. It detects statistically unusual market behaviour and lets a human or an AI agent investigate it against primary-source evidence. `planning/PRODUCT_SPEC.md` is the authoritative product definition — read the relevant section before implementing a feature. Each `planning/epic-NN-*/EPIC.md` states that epic's goal, scope, exit criteria and the spec sections behind it; read the current epic's file before starting work on it.

It is explicitly **not** a trading system. It never predicts prices, recommends trades, or produces target prices.

## Non-negotiable architectural invariants

These are the load-bearing decisions. They are cheap to honour up front and very expensive to retrofit — treat a change to any of them as a design discussion, not an implementation detail.

**1. The LLM never calculates.** Every number a user sees comes from deterministic code (an analytical tool or service). The model chooses _what_ to investigate and explains results; it must not produce figures from its own reasoning. If a feature needs a number the tool layer can't produce, add the tool — don't let the model estimate it.

**2. The AI manipulates typed application state, never markup or code.** Agent-driven UI changes are schema-validated `WorkspaceCommand` objects (`focusSymbols`, `openPriceChart`, `compareSymbols`, `setTimeWindow`, `pinEvidence`, …) executed against trusted, pre-existing components. No LLM-generated HTML, JSX, or executable frontend code, ever. Validate → permission-check → execute → record in investigation history.

**3. The product works with the AI switched off.** Every analytical capability must be reachable through direct user interaction. AI accelerates investigation; it is never the only path to a feature.

**4. Temporal isolation is enforced in the data/tool layer, not the prompt.** In replay mode, no component may read data timestamped after the replay clock. This constraint belongs in the data-access and tool implementations so future-information leakage is structurally impossible — never rely on instructing the model to behave. Design data access with this in mind from the first query, even before replay exists.

**5. Confidence and provenance are part of the domain model, not prose.** Findings carry an explicit confidence level — `CONFIRMED` / `SUPPORTED` / `POSSIBLE` / `UNKNOWN`. Evidence records source, event timestamp, retrieval timestamp, calculation method, and a raw-data reference. "Not enough evidence to explain this move" is a correct, first-class outcome, not a failure.

**6. Market-data provenance is displayed, never implied.** Alpaca's free tier is IEX, not consolidated SIP. The UI must label the feed (e.g. `Market feed: IEX`) and must not suggest full US-market coverage.

**7. Provider abstractions at the edges.** Market data sits behind a provider interface; the LLM sits behind an `AgentProvider` interface (`runInvestigation` / `streamEvents` / `cancel`). No vendor SDK types leak into the domain model.

## Domain model

The core objects, in dependency order — `Investigation` → `Step` → `Finding` → `Evidence`. An **Investigation is a persisted, first-class, long-running object**, not a chat session: it outlives any single AI response and has explicit status (`running` / `awaiting user` / `completed` / `failed` / `cancelled`). Steps have observable status so the UI shows real progress rather than a generic spinner.

The frontend renders investigation state from an ordered stream of typed backend events (`STEP_STARTED`, `TOOL_CALL_COMPLETED`, `FINDING_CREATED`, `WORKSPACE_COMMAND`, `INVESTIGATION_COMPLETED`, …) — never by parsing unstructured model text. This is what makes streaming, cancellation, retries, replay and testing tractable.

Anomaly detection is deterministic and deliberately interpretable: price percentile, volume ratio, relative move vs. sector and market, and breadth, normalised into a 0–100 score. **Every score must carry its explanation.** The score measures "how unusual is this?" — never risk or opportunity.

## Intended stack

React + TypeScript, Redux for domain state, RxJS for streaming pipelines and cancellation. Node + TypeScript backend (Fastify or NestJS). PostgreSQL, optionally TimescaleDB. Sigma.js/WebGL for the market topology, with the graph model kept separate from the renderer.

WebSocket for continuous market data; SSE/streaming HTTP for agent investigation events. These two streams have different semantics and stay separate.

Resist adding libraries before complexity demonstrates the need, and don't introduce a second database in V1 without a measurement justifying it.

## Frontend structure

Feature modules under `app/`: `market`, `topology`, `charts`, `anomalies`, `investigations`, `replay`, `filings`, `shared`. Modules expose domain-level APIs; they do not reach into each other's stores. Create a module when the iteration needs it, not before.

## Delivery order

Fifteen epics, delivered in sequence — see `planning/EPICS.md`. Condensed: foundation → historical data → live data → overview → anomaly detection → topology → **deterministic investigations** → evidence workspace → SEC evidence → AI investigations → generative workspace → persistence → replay → performance → portfolio release.

Checkpoints: by end of Epic 8 MarketPulse is a credible non-AI product; Epic 10 makes it agentic; Epic 11 delivers the AI/frontend interaction the portfolio is built around; Epic 13 delivers its signature capability.

**Do not start with the AI.** The investigation engine, its analytical tools, and its event stream must work end-to-end without an LLM first. Only once the Investigation model feels correct should a model be allowed to drive it. This ordering exists specifically to prevent the architecture collapsing into `chat box → LLM → miscellaneous API calls`.

First milestone: display ~100 securities, receive live price updates, calculate an explainable anomaly score, click through to underlying price/volume evidence.

## Failure handling

Agentic failures are normal product states, not exceptions. Degrade incrementally and locally — a failed SEC lookup, analytical tool, or dropped market socket must leave the rest of the workspace and any already-gathered evidence intact and clearly labelled (e.g. "Live feed disconnected — displaying data through 10:42:17"). Never collapse to a global error screen.

## Performance targets

Measured, and published in the repo. Event → application state <250 ms p95 (excluding provider latency); 60 FPS at 500 nodes / 5k edges; >45 FPS in synthetic mode at 5k nodes / 25k edges; no routine main-thread task >50 ms; visible investigation feedback <500 ms after user action, streaming incrementally.

## Out of scope for V1

Brokerage integration, trade execution, portfolios, options, crypto, price predictions, buy/sell recommendations, social sentiment, news aggregation, real authentication, mobile UX, tick-level replay. Don't build toward these.
