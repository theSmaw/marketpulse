# Story 1.9 — Automated Testing Foundations

**Status:** Not started
**Epic:** [Epic 1 — Application Foundation](../EPIC.md)
**Depends on:** Stories 1.2, 1.3
**Epic scope covered:** unit/integration test foundations

## Description

Establish the testing stack and the conventions later epics follow. PRODUCT_SPEC.md §40 lists "testing non-deterministic systems" as something an interviewer should find a credible answer to, so the foundation needs to be deliberate rather than incidental.

## Conventions from Story 1.1

Story 1.1 is complete, and these four bind this story. They are stated in every Epic 1 story so each one can be read on its own; the full reasoning is in `docs/adr/0001-repository-structure-and-typescript-toolchain.md`.

- **`pnpm verify` is the acceptance command** — `build && lint && format:check && stories && test`, chained with `&&` so the first failure is the exit code. It took its fifth step in Task 1.4.5: `stories` fails if a component has no stories file, and `build` now also produces the Storybook bundle. This story passes it from the repository root. Prettier owns Markdown as well as code, so an unformatted planning document fails it too
- **Six verbs, identical in every package** — `dev`, `build`, `test`, `lint`, `typecheck`, `clean`. Only `test` and `dev` fan out with `pnpm -r`; the rest run their tool once from the root, because the reference graph and ESLint's project service already cover the workspace in one pass. Changing what a verb means in one package means changing it everywhere, or saying why not
- **Shared tooling lives at the workspace root; packages declare only what they actually import.** ESLint, Prettier and TypeScript are root-only devDependencies, and pnpm puts the root's `node_modules/.bin` on every package script's PATH. A library the code imports belongs in the package that imports it — `@types/node` in `apps/backend` is the counter-example that keeps the rule from being over-applied
- **The module setup is ESM-only and single-file-safe** — `"type": "module"`, `module: nodenext`, `isolatedModules`, `verbatimModuleSyntax`, and relative imports carrying `.js` extensions from `.ts` files (TS2835 without one). `packages/shared` is consumed as **built output**, so it must be built before any consumer can be typechecked; `tsc -b` orders that itself, which is why `typecheck` and `build` are the same command

One thing that is true today and will not be forever: until Story 1.9 lands, **`pnpm test` passes because there are no tests** — all three `test` scripts are `echo` placeholders that exit 0, and they are now the only placeholders left. The companion note about both apps' `dev` scripts being placeholders is **no longer true** — Stories 1.2 and 1.3 made all three real.

## What that means for this story

- **The `test` verb exists and is wired; this story makes it real.** All three packages have a `test` script that is an `echo` placeholder exiting 0, root `test` is `pnpm -r run test` — one of only two root scripts that deliberately fan out — and `verify` already runs it last. So this story replaces three placeholders. It does not introduce a script name or a root wiring, and it should not invent a second command that means "run the tests"
- **A green `pnpm test` currently means "no tests exist".** Story 1.10 will put that tick in CI. Removing that ambiguity is this story's real deliverable, not a side effect
- **The runner is a tool, so it is declared at the workspace root** — same rule as ESLint, Prettier and TypeScript, settled in Task 1.1.7: shared tooling lives at the root; packages declare only what they actually import. pnpm puts the root's `node_modules/.bin` on every package script's PATH, so `vitest run` resolves from a package directory without that package declaring it. The counter-example still applies — anything a test _imports_ (a DOM environment package, a matcher library) is a dependency of that package's code and belongs in that package
- **The runner has to survive the module setup**, and this is the constraint most likely to bite: `module: nodenext`, `"type": "module"` in every package, `isolatedModules`, `verbatimModuleSyntax`, and relative imports carrying `.js` extensions from `.ts` files. A runner that assumes CommonJS, or that resolves `./foo.js` differently from Node, will fight all of it. Check this before choosing, not after writing the first test
- **`packages/shared` is consumed as built output**, so a test in either app that touches shared types is testing `dist/*.d.ts`. `verify` builds first; a bare `pnpm test` after editing shared does not. Decide deliberately whether the runner resolves shared through its `exports` (built, correct, needs a build) or through a source alias (fast, and quietly diverges from what ships)
- **`buildServer()` exists and returns an instance without listening**, which is what makes `app.inject()` possible — that split was made in Task 1.2.1 for this story specifically. Note the one constraint it carries: the factory is synchronous today, and the first `await app.register(...)` or explicit `await app.ready()` turns it into `Promise<FastifyInstance>` and changes every caller, tests included (ADR 0002 §3)
- **`app.inject()` cannot test any of the backend's process behaviour**, and that is worth knowing before picking a runner. Injection drives an instance with no listening socket, so it covers the response half of this backend and none of the process half: signals, exit codes, the 5-second shutdown ceiling and the second-signal path all need a **real child process** started, signalled and waited on. Tasks 1.2.4 and 1.2.6 verified them exactly that way — spawning `dist/index.js`, `kill -TERM`, reading the exit code — which is a workable test shape but a slow one, and it needs a **built tree** rather than a compiled instance. The temporary slow route used for it (a `FastifyPluginCallback` in `src/routes/`, deleted afterwards) is the shape a fixture would take; it was deliberately not left in the shipped surface
- **A fixture route added and deleted by hand leaves output behind.** `tsc -b --clean` removes the output of the sources that currently exist, so deleting the fixture first orphans its `dist/` files permanently (Task 1.2.6). If this story leaves fixtures in the tree rather than deleting them, that problem disappears — which is one argument for a `__fixtures__` directory over temporary files
- `coverage/` is already in `.gitignore`, `.prettierignore` and `eslint.config.mjs`'s ignores. Emitting coverage anywhere else means adding it to all three

### What Story 1.4 changed for this story

One thing, and it is evidence rather than a decision.

**Vitest and Testing Library are already in the lockfile**, as transitive dependencies of Storybook 10 — `@vitest/expect`, `@vitest/spy`, `@testing-library/dom`, `@testing-library/jest-dom` and `@testing-library/user-event` all arrived with `storybook` in Task 1.4.5. That makes one candidate runner cheaper to adopt than the others, and it is deliberately **not** a choice this story has to honour: Task 1.4.5 adopted no test runner, ran no interaction tests, and did not install `@storybook/addon-vitest`. This story still picks the runner on its own criteria, and "it is already downloaded" is the weakest of them.

What it does mean is that the Storybook side of a decision to use Vitest is nearly free, and that the reverse choice leaves an unused assertion library in the tree. Both are worth stating; neither settles anything.

Task 1.4.6 added three things to that, and the first is a decision waiting rather than evidence.

- **There are five components with stories covering their permutations, and nothing runs them.** `@storybook/addon-vitest` would turn each existing story into a smoke test — renders without throwing — for close to no authoring cost, and the a11y addon's per-story axe run would gain a way to _fail_ rather than merely report. Both are Vitest-shaped and neither exists today. That is the strongest form of the "cheaper to adopt" argument above and it is still not a reason on its own
- **`pnpm stories` proves a file exists and nothing more**, and its own header says so: it cannot tell whether the stories inside cover the component's permutations, because a variant set is a type and the check does not typecheck. If this story wants that gap closed, a test runner is the thing that could close it — but only for the permutations someone wrote down
- **The a11y addon never fails a build**, and the parameter that would make it do so drives the same Vitest integration. Note before treating an axe pass as coverage: Task 1.4.6 found axe returns `color-contrast` as **inconclusive** on non-text content — 24 direction arrows on one grid — so it declines to judge the exact elements carrying this product's non-colour encoding. An automated accessibility check is a floor here, not the measurement

### What Story 1.3 changed for this story

- **A frontend component test needs a DOM environment, which is a different decision from the backend's.** `app.inject()` needs no environment at all; rendering `<App />` needs jsdom, happy-dom or a real browser runner. That is a second runtime to configure, a second set of globals, and — under ADR 0001 §6 — a **package** dependency rather than a root one, because the test code imports it. Decide it deliberately rather than taking whatever the runner's default template ships
- **Vite is already here, which makes Vitest the obvious candidate and is worth stating as an argument rather than a reflex.** It reuses `vite.config.ts`, so the resolver that builds the app is the resolver that runs the tests — which matters more than usual here, because ADR 0003 records that `tsc` and Rolldown resolve the `.js`-extension convention by different routes. A runner with a third resolver is a third opinion about what `./App.js` means
- **`apps/frontend`'s TypeScript half is `noEmit`.** A runner that expects to execute compiled output will find none; it has to transform sources itself, which is what every frontend runner does anyway. Worth knowing before debugging an empty `dist/`
- **The `types` array in `apps/frontend/tsconfig.json` is load-bearing and test setup is where it gets weakened by accident.** It reads `["vite/client"]` since Task 1.4.2 (2026-08-31), not `[]` — and the correction matters here, because a runner that wants its own globals (`vitest/globals`, say) is an _addition_ to that list rather than a reason to abandon it. What does the work is that the list is explicit, not that it is empty. A test file reaching for `process.env` or a Node global will still fail to typecheck there, and the correct fix is not to add `"node"` to that array — it exists specifically so server-side APIs do not typecheck in browser code
- **The React Compiler rule set applies to test files under `apps/frontend/src/**`,** and `--max-warnings 0` means a warning fails `verify`. If tests live outside `src`, they get neither those rules nor the browser globals block — decide where they live with that in mind
- **`vite preview` is not a fixture for a static-asset test.** Its SPA fallback answers any unmatched path with `index.html` and a 200, so an assertion that a missing asset 404s passes against a plain static server and fails against preview

### What Story 1.5 changed for this story

Story 1.5 added a router, and a router is context — which is the first thing in this frontend that a test cannot render without. It also left the tree with no state at all, so one of this story's likely first subjects still does not exist.

- **Three components now need router context to render, and the workshop already solved it once.** `AppHeader` uses `NavLink`, and `App` is a `<BrowserRouter>`, so rendering either bare throws. `.storybook/preview.tsx` wraps every story in a **`MemoryRouter`** — memory rather than browser, because the workshop is an iframe with no address bar and a story handed real history could navigate the Storybook UI. A test setup is the **third** place the application's context would be described, after `App.tsx` and that decorator. Keeping it to one shared render helper is this story's job, and it is the moment to decide whether a component test renders through `App` or through a helper that supplies the same providers — every provider Epic 2 adds lands in the same place
- **The obvious router assertions are cheap and there is a single source for them.** Every path is declared once in `apps/frontend/src/routes/paths.ts`, so a test that walks the routes reads that object rather than repeating literals — and the gap `paths.ts` explicitly does **not** close is that nothing checks a declared path has a route. That is a test this story could write in three lines and the only mechanism that would ever catch it
- **`useId()` is in the tree and it is snapshot-hostile.** `Region` generates its `aria-labelledby` target with `useId`, whose output (`«r1»`-style) depends on where the component sits in the render tree. Four regions render on the landing route. A DOM snapshot of that route is therefore stable only while nothing above it moves — a reason to assert on roles and accessible names rather than on markup, which is the better assertion anyway
- **The landmark structure is worth asserting and axe will not do it for you.** Task 1.5.4 measured the built landing route at 0 violations / 37 passes / 1 inconclusive, and the four other routes at 0 / 25 / 0 — by hand, against a static host, with axe 4.13.0. If this story adopts `@storybook/addon-vitest` or an axe integration, that becomes repeatable; note the standing caveat that the one inconclusive is `color-contrast` on non-text content, so an axe pass is a floor rather than the measurement
- **There is still no state and no network call anywhere in the frontend.** Story 1.5's six modules hold zero of either, so this story's "frontend component tests render through the real component tree" has five components, four route placeholders and a region label to test — all of them pure. The first asynchronous subject arrives with Story 1.7's error boundary or Story 1.12's polling effect, whichever lands first, which is worth knowing before choosing a runner on its async and fake-timer story
- **Route modules live in `src/routes/` and are inside the React Compiler rule set** just as `src/components/` is. Wherever tests live, the rule about `--max-warnings 0` is unchanged; what Story 1.5 adds is a second directory under `src/` whose files a test might sit beside

## Acceptance criteria

- Unit test runner configured for **all three** packages — `apps/backend`, `apps/frontend` and `packages/shared` — running from the repository root. The original wording said "both packages" and predates `packages/shared`
- Backend integration tests exercise the real HTTP layer, including `/health`
- Frontend component tests render through the real component tree
- Example tests of each kind exist and pass
- Running a single test file, and a single test by name, is documented
- Coverage reporting is available on demand
- Test conventions documented — naming, location, what belongs at each level

## Notes

The commands established here go into `CLAUDE.md`'s Commands section and `README.md`'s command table — both of which now exist and are current, so this is an edit rather than a fill-in. The note here used to say the Commands section was a placeholder; Task 1.1.7 wrote it and Task 1.1.8 verified every command in it from a clean clone.

One item in it is explicitly outstanding and named as this story's to close: **how to run a single test file, and a single test by name.** `CLAUDE.md` says so at the end of its Commands section. It is also an acceptance criterion above.

Both files carry the "a green `pnpm test` means no tests exist" warning, as does ADR 0001 §5. When this story lands, all three sentences become false and must be removed in the same change — leaving a stale warning is as misleading as the thing it was warning about.
