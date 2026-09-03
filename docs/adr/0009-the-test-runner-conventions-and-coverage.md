# ADR 0009 — The test runner, where tests live, and coverage on demand

**Status:** Accepted
**Date:** 2026-09-03
**Delivered by:** Epic 1, Story 1.9 (Tasks 1.9.1–1.9.7)

## Context

Before this story, `pnpm test` was `echo` in all three packages. It exited 0,
`pnpm verify` chained it, and the acceptance command therefore ended on a green
tick that meant **no tests exist**. Story 1.10 was about to put that tick on
every pull request, where it is indistinguishable from passing coverage. ADR
0001 §5 recorded that as a consequence at the time it was written; this story is
what makes it false, and §5 has been amended rather than rewritten.

So the story's real deliverable is not "add a test framework". It is to make one
command mean one thing, and to write down the conventions that keep it meaning
that as nine more epics land on top of it. PRODUCT_SPEC.md §40 lists "testing
non-deterministic systems" as something an interviewer should find a credible
answer to, so the shape had to be deliberate rather than incidental.

Four properties of the workspace constrained almost every decision below, and
none of them is about testing:

- **The module setup is ESM-only and `nodenext`.** `"type": "module"`,
  `module: nodenext`, `verbatimModuleSyntax`, and relative imports carrying `.js`
  extensions from `.ts` files. A runner that cannot resolve `./api-error.js` to
  `api-error.ts` without configuration is disqualified, not inconvenienced
- **`packages/shared` is consumed as built output through its `exports` map**,
  not as source. Anything that resolves it differently for tests is testing a
  package that does not ship
- **ESLint's project service only ever discovers a `tsconfig.json`.** A file
  outside a package's `include` is a hard `was not found by the project service`
  parsing error, not a silent skip. That decides where test files live before
  anyone gets an opinion about it
- **`apps/frontend`'s explicit tsconfig `types` array is the browser boundary's
  last stated guarantee** (ADR 0003 §5, and the regression Task 1.6.4 found).
  Anything that wants an entry in it is paying a price somewhere else

## Decisions

### 1. The runner is Vitest 4.1.11, and the disqualifying measurement was resolution

Vitest resolves `import { apiError } from "./api-error.js"` inside a `.ts` test,
in a package with `"type": "module"` and `module: nodenext`, **unconfigured**.
That is the whole of the decision. The alternatives were Jest — which needs a
`moduleNameMapper` or an ESM preset to undo the `.js` extension this workspace
is required to write — and `node:test`, which runs against **built** output and
so cannot see `apps/frontend` at all, since that package is `noEmit`.

One argument was made during the spike and it is recorded here as the weak one
it was: Vitest is already in the lockfile as a Storybook transitive, so "it is
free". It is not free — it is a root devDependency costing **+22 store entries**,
**+4 MB** and +223 lockfile lines, measured — and a transitive dependency is not
a declared one. The resolution result is what carried the choice; the lockfile
argument would have been true of a runner that could not resolve anything.

**The runner does not typecheck, and that is the property to remember.** It
transpiles and strips types. Task 1.9.1 measured it: a call missing a required
argument ran as two 500s under the runner and was **`TS2345` at exit 2** under
`tsc -b`. This is the same failure mode ADR 0003 records for the Vite dev
server — a green-looking tool that never asked the question — arriving in a
second place, and it is the reason §3 below is not negotiable.

The same asymmetry reaches the `.js`-extension convention itself. Drop the
extension and `tsc -b` is **TS2835 at exit 2** while `vitest run` is **7 passed
at exit 0**. So Vitest is the _third_ resolver in this workspace with an opinion
about that convention's negative case, alongside Rolldown, and it has the wrong
one: **a green suite is not evidence the convention was followed.** `tsc` is
still the only enforcer.

**Reversal triggers**, both recorded in Task 1.9.1 because a decision without one
is an assertion. The frontend leaving Vite, which unwinds §5's argument entirely.
And the backend suite growing to dominate `pnpm test`, where `node:test` against
built output becomes the fallback for the two packages that emit — at the price
of running two runners.

### 2. `@marketpulse/shared` is resolved by tests as built output, through `exports`

The rejected alternative is a Vite/Vitest alias pointing at
`packages/shared/src`, and its failure mode is sharper than "diverges from what
ships". Task 1.9.1 measured it twice: the aliased suite stayed **green with
`packages/shared/dist` deleted entirely**, and green again with the package's
own `exports` map broken. It bypasses the one file that defines the package's
contract, so the thing most likely to break a consumer is the thing the tests
structurally cannot see.

The price is real and is paid at the top of every run: **`pnpm test` does not
pass before a build.** Re-measured on the shipping tree with
`packages/shared/dist` moved aside — `apps/backend` reports `Failed to resolve
entry for package "@marketpulse/shared"` and `apps/frontend` reports `Failed to
resolve import "@marketpulse/shared" from "src/routes/MarketOverview.tsx"`. Both
name the package, which is the good case, and both exit 1.

**The dangerous case is a _stale_ `dist`, not a missing one.** Removing one
export from the built `index.js` without rebuilding gives **13 failing backend
tests whose messages name nothing about staleness** — `expected 500 to be 200`,
over and over. `pnpm verify` orders the build before the tests; a bare
`pnpm test` does not, and Story 1.10 inherits that ordering requirement. One
detail that makes it look milder than it is: the missing-`dist` run still
reported **16 passed**, because `config.test.ts` imports nothing shared. A
partial pass is what this looks like from a distance.

### 3. Test files live in `src/` beside their subject, and that is forced rather than preferred

`<subject>.test.ts` beside `<subject>.ts`, `.tsx` where the test renders JSX.
Inside the package's tsconfig `include`, which buys the whole type-aware pass:
tests typecheck under `tsc -b`, lint under `strictTypeChecked` and
`stylisticTypeChecked`, take the 17 React Compiler rules, and fail on a warning
because `lint` carries `--max-warnings 0`.

The alternative was **built before it was rejected**: a
`packages/shared/tsconfig.test.json` with `noEmit`, referencing
`./tsconfig.json`, with tests excluded from the main project. It **typechecks
correctly** — `tsc -b` on it is exit 0, and a deliberate type error is TS2322 at
exit 2 — and it **fails `pnpm lint` on every test file**, because nothing points
the project service at it and there is no per-package way to. So a test file
gets type-aware linting or a clean `dist/`, and this workspace takes the
linting.

That the linting is worth having is a measurement rather than a preference.
`@typescript-eslint/non-nullable-type-assertion-style` failed the first backend
suite twice, both times on the idiom of catching an error into an `unknown` and
casting it; the answer needing no cast and no `!` is to narrow with `instanceof`
and then `if (x === undefined) { expect.fail("…") }`, because **`expect.fail`
returns `never`** and so narrows as well as fails.

**The consequence belongs beside the decision.** In the two packages that emit,
`tsc -b` emits a compiled copy of every test into `dist/` — 8 files for 2 test
files in `packages/shared`, 12 for 3 in `apps/backend`, in the directory that
_is_ those packages' contract. Measured, they are unreachable to a consumer:
`import("@marketpulse/shared/dist/api-error.test.js")` is
**`ERR_PACKAGE_PATH_NOT_EXPORTED`**, because the `exports` map declares `"."`
and nothing else. And the `tsc -b --clean` orphan rule from ADR 0001 now applies
to tests too — deleting a test file without cleaning first leaves its four
`dist/` files behind permanently.

**A test helper is a module in `apps/frontend` and file-local everywhere else**,
and the line is whether the package emits. A `src/test-support.ts` in
`packages/shared` or `apps/backend` would be scaffolding shipped into `dist/`
beside the application; `apps/frontend` is `noEmit`, so it gets
`src/test-render.tsx` as a real module.

### 4. Configuration is one `vitest.config.ts` per package, and there is deliberately no root config

Root `test` is `pnpm -r run test`, one of only two verbs that genuinely fan out.
A root config with a `projects` list would be a **second entry point meaning
"run the tests"** — the thing Story 1.9 was told explicitly not to introduce.

This is the one place the testing stack departs from `eslint.config.mjs` and
`prettier.config.mjs` being single root files, and the reason those two do not
share is worth stating rather than leaving implicit: **their tools run once from
the root and this one does not.** Where the tool's unit of work is the tree,
the config belongs at the root; where it is the package, so does the config.

The files are `.ts` and not the `.mts` Task 1.9.1 called for, and that finding
is now a **conditional rather than a rule**: it was about the _root_, whose
`package.json` has no `"type": "module"` and which therefore loads a `.ts`
config as CommonJS and warns. Every workspace package is ESM, so a `.ts` config
there warns about nothing — verified, zero warnings. If a root config is ever
added, it must be `.mts`.

They are the **fifth, sixth and seventh** files needing `eslint.config.mjs`'s
trailing `disableTypeChecked` block, for the identical reason `vite.config.ts`
and the two `.storybook/` files are.

### 5. `test.include` is scoped to `src`, because Vitest 4 excludes almost nothing

`defaultExclude` is **`['**/node_modules/**', '**/.git/**']` and nothing more** —
read out of the package rather than assumed, and shorter than Vitest 3's.
`dist/` is not on it, and §3 puts a compiled copy of every test there.

Left unconfigured, `packages/shared` collects **4 files and 14 tests** against
the 2 and 7 that exist, and the second copy comes from whatever the last build
emitted rather than from the source just edited — so a test edited and re-run
shows its old and new selves side by side. `apps/backend` reproduces it worse:
the shipping config collects 3 files and 49 tests, an empty config collects **6
and 98**, and the duplicate is a second `buildServer()` running against a stale
`dist/`.

It is an **allowlist and not an `exclude` of `dist/`**, for the reason
`config.ts` gives for rejecting `redact` (ADR 0007): a denylist's failure mode is
the entry nobody added.

**The glob is not identical across the three, and copying it verbatim is the
mistake that fails silently.** `apps/frontend`'s admits `.tsx`, because a
component test renders JSX. Under a `.ts`-only glob a component test is simply
not collected — measured, a deliberately failing `.test.tsx` dropped into
`apps/backend/src/` left `vitest run` reporting 3 files / 49 passed, unchanged.
The wholly-empty case is loud (`No test files found`, exit 1); the partial one
is not.

### 6. The runner is a root devDependency; the DOM environment is not

The root-only tooling rule from ADR 0001 §6 applies to `vitest` and to
`@vitest/coverage-v8`: neither is imported by any package's source, both are
resolved by the runner, and all three packages need them. `vitest run` resolves
from a package directory without that package declaring it.

**The counter-example keeps the rule from being over-applied, exactly as
`@types/node` does for `apps/backend`.** `jsdom`, `@testing-library/react` and
its `@testing-library/dom` peer are devDependencies of `apps/frontend` and of no
other package. `@testing-library/react` is imported by test code, and `jsdom` is
resolved by name from a string by the runner — the same shape that made
`pino-pretty` a real dependency of `apps/backend` in ADR 0007.

**The DOM environment is jsdom 30.0.1, and happy-dom was built and measured
before being rejected.** Every measurement ran the _other_ way: happy-dom is
cheaper (+7 packages against jsdom's +22 store entries) and about **3× faster to
set up** (environment 130 ms against 380–410 ms), and **no fidelity difference
was found in either direction** — both rendered the Base UI popover through its
portal, resolved `useId()`-generated `aria-labelledby` identically, computed the
same accessible names, and produced identical hashed CSS Module class names. The
one difference found favours happy-dom too: jsdom 30 has no
`Element.checkVisibility()`.

jsdom was taken on the **failure mode** rather than on a capability. It is the
reference implementation every library in this stack is tested against, and a
re-implementation's divergences arrive as "the DOM behaved differently from a
browser" — silent, and indistinguishable from a component bug. That is the same
argument shape ADR 0008 §2 used to take `@fastify/cors` over a hand-rolled hook,
and it is the shape to reuse. **Reversal trigger:** the frontend suite growing
to dominate `pnpm test`, where ~275 ms of setup per run stops being free.

### 7. A figure's provenance is part of the figure

Task 1.9.1 recorded jsdom plus Testing Library at **"+36 packages"**. That is
pnpm's own `+36 -1` install summary, which counts links into `node_modules`
trees. The virtual-store count — this repository's convention everywhere else —
is **+22**. Both are true measurements of different things.

This is recorded as a decision because quoting one where the other is meant is
exactly how the two wrong "corrections" happened that Task 1.7.7 had to rebuild
four commits to disprove. **A figure that has moved looks exactly like a figure
that was mis-recorded**, and only re-taking it with the _same_ method tells them
apart. Task 1.9.6 found one of its own inside this story: Task 1.9.5 recorded
`packages/shared`'s coverage table as "three files out of seven" where `src/`
holds **six** non-test modules. State the method with the number.

### 8. `globals` is off, and it has a consequence nobody predicted

`describe`, `it` and `expect` are imported by name in every test file. The
alternative is a `"vitest/globals"` entry in every package's tsconfig `types`
array, and `apps/frontend`'s explicit array is the browser boundary's last
stated guarantee — this story added nothing to it, and neither did any other
package's.

**The consequence belongs here rather than in a footnote, because the two
decisions collide silently.** `@testing-library/react` registers its own
`afterEach(cleanup)` **only when it can see a global `afterEach`**. With
`globals` off it does not, and nothing fails at that point: measured, two tests
each rendering one component left `document.body` holding **1 and then 2**
children. It surfaces later, in a third test, as `getByRole` throwing "found
multiple elements" — in a test that did nothing wrong, with a message naming
neither the test that leaked nor the convention that caused it.

`apps/frontend/src/test-setup.ts` is what replaces it, through `setupFiles`. It
is deliberately **not** the render helper: a leaf-component test calls
`render()` directly and needs the cleanup just as much.

### 9. One render helper, and it is the third and last description of the application's context

`apps/frontend/src/test-render.tsx` — `MemoryRouter` plus an initial entry.
`App.tsx` is the first description (`<BrowserRouter>` reading
`import.meta.env.BASE_URL`) and `.storybook/preview.tsx` the second (a
`MemoryRouter` decorator taking its entry from a story parameter). **Every
provider Epic 2 adds — a Redux store, an RxJS scheduler — lands here**, which is
the whole reason it is a module rather than a copied three-line wrapper.

`MemoryRouter` for the reason the workshop uses it: there is no address bar, and
a component handed the browser's history can navigate the runner's own document.
**The one deliberate exception is `App.test.tsx`**, which drives the _real_
`BrowserRouter` through `window.history.pushState()`, because `App` contains its
own router — the helper would nest two — and re-declaring the five `<Route>`s
inside a `MemoryRouter` would test a **copy** of the route table, which is the
thing that can drift from the one that ships.

### 10. There are three levels with a runner behind them, and a fourth without one

A **unit** test drives a function with a plain argument, and `loadConfig(env)` is
the model: it takes the environment as a parameter specifically so no process
has to be mutated. An **integration** test drives the real HTTP layer through
`app.inject()`, with both error handlers and CORS already registered by
`buildServer()` — which is why they are registered inside the factory and the
signal handlers are not. A **component** test renders the real tree through the
one helper and asserts on roles and accessible names.

The helper that builds a server is **`async` from its first line** even though
`buildServer()` is synchronous today. `await app.ready()` is required in its own
right — plugin registration is deferred, so the routes do not exist until it
resolves — and writing it `async` before it needs to be pre-pays ADR 0002 §3's
warning that the first `await` inside the factory changes every caller: one edit
rather than every edit.

**The fourth level is the one people assume is covered.** The backend's process
half — signals, exit codes, the shutdown ceiling, the second-signal path,
`EADDRINUSE`, both crash handlers — needs a real child process against a
**built** tree, and no runner here reaches it. Task 1.9.3 settled it as **out of
scope with Story 1.10 as its owner** rather than half-demonstrating one, and the
argument belongs beside the decision: such a test needs a build to have run,
spawns and signals processes, and its first failure mode is a port held by a
previous run — so one of them in the same `vitest run` as 48 injected tests
makes the fast suite conditional on a build and occasionally flaky.

### 11. A test can close a gap no `verify` step could

This is the story's one structural finding beyond its conventions. Nothing in
`pnpm verify` checks that a route which can fail declared `500: apiErrorSchema`
(ADR 0007), and forgetting it is silent until something throws.

The route table **is** reachable in a form worth asserting on. An `onRoute` hook
added by the caller _after_ `buildServer()` returns still sees every route,
because `app.register(healthRoutes)` inside the factory has not run yet —
registration is deferred to `ready()`. `apps/backend/src/server.test.ts` walks
the table and asserts identity against `apiErrorSchema`.

**Its first run found a route nobody here wrote**: `OPTIONS *`, the wildcard
preflight handler `@fastify/cors` registers, which answers 204 with no body — so
there is nothing for a schema to strip and requiring one would mean forking the
library's route. It is exempted **by its exact signature** rather than by
"anything OPTIONS", so a preflight route we ever declare ourselves is still
checked.

**The rule: when the thing being checked is reachable from an assembled
instance, a test beats a seventh `verify` step.** Its limit belongs beside it —
`setNotFoundHandler` is not a route and can never carry a response schema, so
`apiError()`'s four-slot object is what holds there, asserted separately.

### 12. Coverage is on demand, fans out, and has no threshold

`pnpm coverage` is `pnpm -r run coverage`, and each package's script is its own
`test` with `--coverage` appended — so it cannot disagree with `test` about
which files are tests, and the "no root Vitest config" decision in §4 holds for a
second reason. Running it once from the root was the alternative and it is not a
flag: it means creating the `projects` list §4 declined, with the frontend's
entry having to point at a `mergeConfig` over `vite.config.ts` rather than
replace it, in exchange for one merged percentage over three packages that share
no code. **Three tables is the honest shape** when the three suites drive three
different things.

**The provider is `@vitest/coverage-v8`, and `@vitest/coverage-istanbul` was
installed and measured before being rejected.** From an identical clean
baseline: v8 is **+31 store entries, +20 MB, +110 lockfile lines** and istanbul
**+29, +20 MB, +94**; neither trips `allowBuilds`, and runtime is a wash. What
they report is a wash too — they agree exactly on `packages/shared`, and on
`apps/frontend` they agree on statements, functions and lines to the unit and
differ by **one branch**, because istanbul counts a default parameter
(`compact = false` in `ErrorFallback.tsx`) as a branch and v8 does not. v8 was
taken because it is Vitest's own and **does not rewrite the sources it
measures**, which matters most in `apps/frontend`, whose Vitest config _is_ its
build config — istanbul's instrumentation would sit inside the same plugin chain
that produces `dist/`. **The undercount is the recorded reversal trigger** if
branch coverage ever gates anything.

**An explicit `coverage.include` is the whole point, and Vitest 4's defaults are
the trap — the same allowlist argument as §5, arriving in a third place.**
`coverageConfigDefaults.exclude` is **`[]`** and `coverage.include` is
**undefined**, which means "only the files some test loaded". Left at that
default, `packages/shared` reports **100% with an empty file table**, because
`ticker.ts`, `anomaly.ts` and `feed-status.ts` are simply not in the
denominator. That is the green tick that means nothing, rebuilt inside the
command that exists to remove it.

**Two entrypoints are deliberately left in the denominator at 0%**, and that is
the most important configuration decision here.
`apps/backend/src/index.ts` is the process half §10 hands to Story 1.10, and
`app.inject()` reaches none of it; `apps/frontend/src/main.tsx` is the mount and
no jsdom test calls it. Excluding an entrypoint because nothing tests it is how
a coverage number stops describing the application — so **the hole Story 1.10
owns is visible as a figure rather than as a caveat**. The frontend's stories
_are_ excluded, with the measurement beside the exclusion: statements are
**27.04% with them counted against 68.25% without**, and the lower number
describes the workshop rather than the application.

**There is no threshold, and that is stated rather than omitted.** A minimum over
nine components, one route table, one configuration module and no application
state would be a number invented before there is anything to hold it to, and it
would be met by testing what is easy. **Story 1.10 owns CI and can set one
against the baseline in `Measured` below**, which is what this command exists to
produce.

### 13. `@storybook/addon-vitest` was rejected, and the predicted blocker did not materialise

Story 1.9 expected `@vitest/browser` and a Playwright download. Measured:
`pnpm add -D -E @storybook/addon-vitest@10.5.10` is **+1 package**, pulls no
Playwright and no `@vitest/browser`, and trips no install script. It then
**works under jsdom**, running all 9 story files as **47 smoke tests** — but
only with `css: true`, because `.storybook/preview.tsx` calls `getTokens()` and
that throws with no stylesheet applied. `css: true` itself costs nothing
measurable.

So **the rejection rests on shape rather than cost.** It needs a `projects`
array making `apps/frontend` the only package with two test projects, and a
second source for §12's coverage to reconcile. The deciding argument is that
**the stories are a workshop, not assertions**: `AppHeader`'s `AllPermutations`
has two a11y rules disabled on it deliberately, because a grid of six banners is
not a page, and adopting the addon makes the workshop's visual-review
compromises into test fixtures. "Renders without throwing" is also the weakest
assertion available on ten components that now have written tests.

**Reversal trigger:** a component shipping without a written test, or Epic 15
wanting axe to fail rather than report. The cost is +1 package and one
`css: true`, recorded here so nobody re-derives it.

### 14. The test environment applies no global stylesheet, and CSS Modules are real anyway

Both halves come from `apps/frontend/vitest.config.ts` merging
`vite.config.ts`, and both matter. A rendered `PriceChange` carries
`class="_change_ea28d5 _positive_ea28d5"` — Vite's own scoped names, not the
identity proxy an unconfigured runner hands back. But `getTokens()` **throws** in
a test (`Design token --surface-page resolved to nothing`), because
`tokens.css`, `market.css` and `base.css` are never injected, so
`getComputedStyle` on `:root` returns empty.

The consequence is better than the discipline it replaces: **"never assert on
colour" is a structural impossibility here rather than a rule to remember.** It
is also what would have broken §13's addon.

### 15. Argument forwarding needs no `--`, and the form that adds one fails green

`test` **is** a pnpm built-in (`t, test` in `pnpm help -a`), but unlike `clean`
the built-in runs the package's script, so there is no collision and no explicit
`run` is needed. **The `clean` trap does not generalise**, which is worth
recording because this repository's own documentation is the reason someone would
expect it to. `--filter` and trailing arguments reach Vitest untouched,
`--reporter=verbose` included, even though `--reporter` is one of pnpm's own
flags. The path is relative to the **package**, not the repository root.

**The consequence that earns its keep is the failure mode, and it is the same
class as §1's `.js`-extension finding — the runner is green where it should not
be.**

- `pnpm test -- -t "name"` forwards the `--` literally, Vitest ignores the
  filter, **all 49 backend tests run and it exits 0** — a command that reads as
  a narrow run is a full one
- A **non-matching `-t`** reports `47 skipped` (or `49 skipped`, per package) and
  exits **0** — a typo in a test name looks like a pass
- Only a **non-matching path** is loud: `No test files found`, exit 1

**The rule that falls out of it: read the skipped count, not the exit code.** Its
coverage-side twin is the same shape — narrowing a coverage run to one test file
reports **20% against the full run's 30%**, because `coverage.include` fixes the
denominator while the numerator shrinks. A single-file coverage number is not
that file's coverage.

### 16. There is no `test:watch` script, and that is a verb decision

Watch mode is `pnpm --filter <pkg> exec vitest --watch`. A script would be a
seventh verb in three packages for something `exec` already spells, and this
workspace has held the six-verb convention through `start`, `preview`,
`storybook` and `coverage`. `coverage` is the one thing admitted beside them, and
it earned that by fanning out from the root, which a watch loop cannot.

**The measurement that makes the documentation necessary: Vitest 4's bare
`vitest` does not watch.** It prints the same `RUN` banner as `vitest run`,
executes once and exits 0 — verified under a real pseudo-terminal both through
`pnpm exec` and by invoking `node_modules/.bin/vitest` directly, so it is the
runner's behaviour and not pnpm's. Anyone carrying the Vitest 3 habit reads that
as watch mode being broken.

### 17. `README.md` carries the commands, `CLAUDE.md` the conventions, this ADR the reasoning

A documentation decision this story had to take explicitly, because the obvious
default is to put all three in all three places. That was rejected on this
epic's own evidence: **four consecutive tasks in this story spent part of their
budget correcting copies of the same sentence**, and Story 1.8 recorded prose
figures as a `pnpm verify` gap precisely because nothing checks them.

The split held through Task 1.9.6 and was re-checked here: no convention has
been restated in the README, and no command form has been re-derived in
`CLAUDE.md`.

## Rejected, with reasons

| Option                                       | Why not                                                                                                                                                           |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Jest                                         | Needs a `moduleNameMapper` or ESM preset to undo the `.js` extensions `nodenext` requires this workspace to write                                                 |
| `node:test`                                  | Runs against built output; `apps/frontend` is `noEmit`, so it cannot see the frontend at all. Kept as the fallback if the backend suite ever dominates            |
| A source alias for `@marketpulse/shared`     | Stayed green with `dist` deleted **and** with the `exports` map broken — it bypasses the file that defines the package's contract                                 |
| A root `vitest.config.mts` with `projects`   | A second entry point meaning "run the tests", beside a `pnpm -r` fan-out that already means it                                                                    |
| `tsconfig.test.json` with `noEmit`           | Typechecks correctly and **fails `pnpm lint` on every test file** — ESLint's project service only discovers a `tsconfig.json`                                     |
| An `exclude` of `dist/` instead of `include` | A denylist's failure mode is the entry nobody added — the same reason ADR 0007 rejected `redact`                                                                  |
| `globals: true`                              | A `"vitest/globals"` entry in every tsconfig `types` array, including the one that is the browser boundary's last stated guarantee                                |
| happy-dom                                    | Cheaper and faster with no fidelity difference found; rejected on the failure mode — a re-implementation's divergences are indistinguishable from a component bug |
| `@vitest/coverage-istanbul`                  | Indistinguishable in cost and near-identical in output; v8 does not rewrite the sources it measures, which matters where the test config **is** the build config  |
| Merged root coverage                         | One percentage over three packages that share no code, bought with the `projects` list §4 declined                                                                |
| A coverage threshold now                     | A number invented before there is anything to hold it to, met by testing what is easy. Story 1.10 owns it                                                         |
| `@storybook/addon-vitest`                    | Cheap (+1 package, no Playwright) and works — rejected on shape: the workshop's visual-review compromises would become test fixtures                              |
| A `test:watch` script                        | A seventh verb in three packages for something `pnpm exec vitest --watch` already spells                                                                          |
| A process-level test in this suite           | Needs a build, spawns and signals; its first failure mode is a held port. Would make the fast suite conditional on a build. **Story 1.10 owns it**                |
| axe in the frontend suite                    | Epic 15 owns the accessibility review; axe returns `color-contrast` **inconclusive** on exactly the non-text elements this product encodes with                   |

## Consequences worth stating separately

### What a test must not assert, each item traceable to a measurement

- **Not colour.** Structural, per §14 — `getTokens()` throws in a test. (The
  separate desaturation finding still stands: the two price directions differ by
  1.05:1 in greyscale.)
- **Not a single element's text where a component splits it.**
  `getByText("up +12.40")` fails on `PriceChange`: the direction word is a
  visually-hidden `<span>` and the figure is a sibling text node. Assert the
  concatenation, which is what a screen reader is handed
- **Not a `useId()` value**, only the accessible name it produces — and for the
  same reason, not a DOM snapshot of a route
- **Not a boundary reset recovering state that lives _above_ the boundary.** It
  remounts its children; a parent's state is untouched, so a freshly mounted
  child throws again on the spot
- **Not a throw escaping `fireEvent` from an event handler.** React dispatches
  the handler itself and reports the failure to the environment, so `toThrow()`
  fails while the error separately fails the whole run. A scoped `window`
  `error` listener calling `preventDefault()` is what makes it assertable — and
  that listener is precisely what ADR 0007 §6 declined to install in the
  application
- **Not the `.js`-extension convention**, per §1
- **Not a CORS rejection through `app.inject()`.** With a string origin the
  server asserts the allowed origin unconditionally; the browser is the only
  enforcer (ADR 0008 §2)
- **Not a 415 from this backend.** An unparseable content type resolves to a 404
  and no request produces one
- **Not an axe pass as coverage**, and **not latency** unless warmed up with a
  large n and a threshold well outside variance

### The coverage table is not the denominator

The terminal table lists only files that are **not** fully covered — a file at
100% on all four metrics is omitted. `packages/shared`'s shows **three of its
six** sources. `<package>/coverage/index.html` lists every file in the
denominator, and is where the lines behind a number are.

### `pnpm stories` had to be narrowed, and it narrowed what it reads rather than what it demands

Putting a test beside its subject under `src/components/` collided with the
stories check: `scripts/check-stories.mjs` treated every non-`.stories.tsx`
`.tsx` there as a component owing stories, so `PriceChange.test.tsx` was reported
as wanting a `PriceChange.test.stories.tsx` and `pnpm verify` exited 1. It now
skips `.test.tsx`. A real component with no stories still fails, which is the one
direction that check has ever enforced.

### The React Compiler rules met real state for the first time and said nothing

They had never fired outside a spike, and the stated reason was that nothing
shipped here has state. `ErrorBoundary.test.tsx` contains this tree's first
stateful components — a counter with `useState` and two `setState` handlers —
and all 17 rules were silent under `--max-warnings 0`. What did fire, twice, is
ordinary type-aware lint on the tests themselves. **Test files are source here,
and they are linted like it.**

### The frontend artefact did not move, and the warning was worth checking

271 modules, 343,658 B of JavaScript, 10,926 B of CSS, three files, md5
`cba2825c…` — byte-identical to Task 1.7.7's and unchanged for the fifth story
running. The two helper modules and eleven test files are unreachable from
`index.html`, exactly as the stories files are; a grep of the emitted JavaScript
and CSS for `renderWithContext`, `test-render` and `@testing-library` returns
zero. Note ADR 0005's lesson still applies in the other direction: **a module
can join the graph and cost nothing**, so module count and emitted bytes are two
figures rather than one.

### This story enlarged a known `pnpm verify` gap rather than leaving it level

ADR 0008 §7 recorded `README.md`'s prose figures and intra-document links as the
fourth gap in `pnpm verify`'s coverage, accepted and dated. **Story 1.9 made it
bigger, twice, and knowingly.** Task 1.9.5 published a three-row table of
coverage percentages into both `README.md` and `CLAUDE.md` that nothing
regenerates and nothing checks; Task 1.9.6 added a whole section of executed
command forms plus more figures nothing reads — the 49-tests-at-exit-0 `--`
result, the `47 skipped`, the 20%-against-30% coverage comparison.

Every one of those was re-taken in Task 1.9.7 rather than cited, and every one
reproduced. **They go stale the moment a test is added.** Building a checker was
rejected again for the reason Story 1.8 rejected it: it is scaffolding ahead of
the iteration that needs it, and Story 1.10 owns CI. Re-dated 2026-09-03.

### The other gaps are unchanged, and one of them is now a model

`apps/backend/scripts/dev.sh` is still read by nothing — ESLint sees only JS and
TS, Prettier has no shell parser and skips it silently, and it carries the one
configuration value `pnpm env:check` cannot see. The two `clean` scripts still
carry unchecked `rm -rf` fragments inside JSON strings. Both re-dated
2026-09-03 rather than deleted.

What changed is that **§11 closed one gap of this kind with a test rather than a
`verify` step**, and that is the model for the others: when the thing being
checked is reachable from an assembled instance, write the test.

### And one gap this story opened

Per §3, `packages/shared` and `apps/backend` now emit a compiled copy of every
test file into `dist/`. Unreachable to a consumer through the `exports` map,
invisible to the runner through the scoped `include`, and real — with the
`tsc -b --clean` orphan rule applying to them. Recorded here rather than left to
be discovered.

## Measured

Every figure below was re-taken in Task 1.9.7 on the shipping tree, on
`darwin 23.6.0` / Node 24.20.0 / pnpm 11.24.0 / TypeScript 6.0.3 / Vitest 4.1.11
/ jsdom 30.0.1.

### Acceptance criteria

| #   | Criterion                                             | Evidence                                                                                                              |
| --- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1   | A runner in all three packages, from the root         | `pnpm test` = `pnpm -r run test`; **13 files, 103 tests**, exit 0. No `echo` script left in the workspace             |
| 2   | Backend integration tests through the real HTTP layer | 3 files / **49 tests** via `app.inject()`, `/health` included — status, body, response-schema stripping, CORS headers |
| 3   | Frontend component tests through the real tree        | 8 files / **47 tests** under jsdom, asserted on roles and accessible names; `App.test.tsx` drives the real router     |
| 4   | Example tests of each kind exist and pass             | Unit (`loadConfig(env)`), integration (`app.inject()`), component (`renderWithContext`) — all three green             |
| 5   | Single file and single test by name documented        | **Eight forms, all re-executed here** — see the table below. Two of them fail green and are documented as such        |
| 6   | Coverage on demand                                    | `pnpm coverage` = `pnpm -r run coverage`, **2.92 s**, three reports, no threshold, not in `test` and not in `verify`  |
| 7   | Test conventions documented                           | Eight rules in `CLAUDE.md`, the reasoning in §§3–9 here, the commands in `README.md` — the split §17 records          |

### The suite

| Measurement                                         | Result                                                                                           |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `pnpm test`, whole workspace                        | **13 files, 103 tests**, exit 0                                                                  |
| `packages/shared`                                   | 2 files, **7 tests** — 93 ms reported duration                                                   |
| `apps/backend`                                      | 3 files, **49 tests** — 499 ms reported duration                                                 |
| `apps/frontend`                                     | 8 files, **47 tests** — 1.43 s reported, of which the jsdom environment is 4.32 s across workers |
| Emitted test copies in `dist/`                      | 8 files for 2 tests (`packages/shared`), 12 for 3 (`apps/backend`)                               |
| Those copies, reachable to a consumer?              | **No** — `ERR_PACKAGE_PATH_NOT_EXPORTED`                                                         |
| `pnpm test` with `packages/shared/dist` moved aside | Both apps fail **naming the package**; backend still reports **16 passed**                       |
| `pnpm test` against a **stale** `dist`              | **13 failed / 36 passed**, messages naming nothing about staleness (`expected 500 to be 200`)    |

### Running less than everything (criterion 5, re-executed)

| Form                                                                      | Result                                                                                   |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `pnpm --filter @marketpulse/backend test src/config.test.ts`              | 1 file, **16 tests**, exit 0                                                             |
| `pnpm --filter @marketpulse/frontend test PriceChange`                    | 1 file, **5 tests**, exit 0                                                              |
| `pnpm --filter @marketpulse/backend test -t "freezes what it returns"`    | **1 passed / 48 skipped**, exit 0                                                        |
| `pnpm --filter @marketpulse/shared test --reporter=verbose`               | 7 named tests listed, exit 0                                                             |
| `pnpm --filter @marketpulse/frontend exec vitest --watch`                 | `DEV` banner, `PASS Waiting for file changes…`, `RERUN src/api-error.test.ts x1` on save |
| Bare `vitest` under a real pty                                            | **`RUN` banner, runs once, exits** — does not watch                                      |
| `pnpm --filter @marketpulse/backend test apps/backend/src/config.test.ts` | `No test files found`, exit **1** (loud)                                                 |
| `pnpm --filter @marketpulse/backend test -- -t "…"`                       | **49 passed, exit 0** — the filter was ignored (green failure)                           |
| `pnpm --filter @marketpulse/backend test -t "no such name"`               | **49 skipped, exit 0** (green failure)                                                   |
| `pnpm --filter @marketpulse/frontend test -t "no such name"`              | **47 skipped, exit 0** (green failure)                                                   |
| Root `pnpm test src/config.test.ts`                                       | Fans out to all three; the two without it fail, exit 1                                   |

### Coverage

| Package           | Statements      | Branches       | Functions      | Lines           |
| ----------------- | --------------- | -------------- | -------------- | --------------- |
| `packages/shared` | 30.00% (3/10)   | 50.00% (2/4)   | 33.33% (1/3)   | 30.00% (3/10)   |
| `apps/backend`    | 64.33% (92/143) | 75.00% (42/56) | 72.72% (24/33) | 63.82% (90/141) |
| `apps/frontend`   | 68.25% (43/63)  | 70.83% (17/24) | 80.64% (25/31) | 67.21% (41/61)  |

Identical to Task 1.9.5's, re-taken rather than copied. `apps/backend/src/index.ts`
and `apps/frontend/src/main.tsx` are in those denominators at 0% by decision
(§12). Narrowing a run to one test file gives **20% against the full run's 30%**
on `packages/shared`. `pnpm coverage` fans out in **2.92 s** and leaves
`git status` clean.

### Workspace

| Measurement                       | Result                                                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm verify`, warm               | **11.78 s**, exit 0 — build 2.44 / lint 3.66 / `format:check` 2.79 / `stories` 0.25 / `env:check` 0.25 / `test` 2.36           |
| The step this story owns          | `test`: **0.45 s → 2.36 s**. `apps/frontend` is the expensive third, and the jsdom environment is most of it                   |
| Artefact                          | **271 modules, 343,658 B JS, 10,926 B CSS, 3 files**, md5 `cba2825c87721779927b2f385df406e9`                                   |
| Artefact, against Task 1.8.7      | **Byte-identical.** This story added nothing reachable from `index.html`                                                       |
| `storybook-static/`               | **299 modules, 59 files, 9.3 MB on disk** — unchanged since Task 1.7.6                                                         |
| New dependencies, whole story     | **five** — `vitest`, `@vitest/coverage-v8` (root); `jsdom`, `@testing-library/react`, `@testing-library/dom` (`apps/frontend`) |
| Install scripts in the whole tree | **`esbuild@0.28.2` and nothing else** — `allowBuilds` still has one entry, and `pnpm-workspace.yaml` is byte-unchanged         |
| `pnpm stories`                    | 9 components, 9 stories files — unchanged; the check now skips `.test.tsx`                                                     |
| tsconfig `types` arrays           | **Untouched** in all three packages                                                                                            |

The `pnpm verify` total has now gone up and down across five consecutive stories
while the tree only grew — 9.3–9.8 s, 10.1 s, 8.77 s, 9.25 s, 11.78 s. Read the
per-step split, not the total; the step that genuinely moved here is `test`.

### Clean clone, the ninth

Fresh `git clone`, empty pnpm store (`--store-dir`, because **pnpm 11 ignores
`npm_config_store_dir` and `NPM_CONFIG_STORE_DIR`** — an install meant to be
cold is not without the flag).

| Measurement                      | Result                                                                                                                        |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Packages downloaded, cold        | **398 in 3.13 s** — Task 1.8.7's figure was 327, and this story's five dependencies plus their transitives are the difference |
| `pnpm verify` from the clone     | **16.41 s**, exit 0 — cold, after the install                                                                                 |
| `pnpm verify` warm, in the clone | build 2.09 / lint 3.36 / `format:check` 2.82 / `stories` 0.24 / `env:check` 0.24 / `test` **2.26**                            |
| Cold build split                 | `tsc -b` **1.48 s** / `vite build` **0.41 s** / `storybook build` **1.31 s**                                                  |
| `pnpm test` from the clone       | **103 tests**, all three packages, exit 0 — after the build the chain orders                                                  |
| Artefact from the clone          | **Byte-identical**: 271 modules, 343,658 B, 10,926 B, 3 files, md5 `cba2825c87721779927b2f385df406e9`                         |
| `allowBuilds`                    | Did not fire; `esbuild` remains its only entry                                                                                |

## Related

- ADR 0001 — the six verbs, the fan-out table, the root-only tooling rule §6
  extends, and §5, whose "a green `pnpm test` means no tests exist" consequence
  this story makes false and which is amended rather than rewritten
- ADR 0002 — `buildServer()` returning an instance without listening, which is
  what makes §10's integration level possible, and the `async`-from-the-start
  warning §10 pre-pays
- ADR 0003 — the Vite dev server not typechecking, the same failure mode §1
  records for the runner; and the `types` array §8 protects
- ADR 0004 — the workshop §13 declines to turn into a test suite, and the
  `check-stories.mjs` convention this story narrowed
- ADR 0007 — the error contract §11's route audit asserts, the `redact` denylist
  argument §5 and §12 reuse, and the `window` listener the frontend deliberately
  does not install
- ADR 0008 — the `@fastify/cors` failure-mode argument §6 reuses for jsdom, the
  `OPTIONS *` route §11 found, and the prose-figure `verify` gap this story
  enlarged
- PRODUCT_SPEC.md §40 — testing non-deterministic systems
- Story 1.10 — CI, the process half §10 hands it, the threshold §12 declines to
  set, and the build ordering §2 requires
