# Story 1.9 — Automated Testing Foundations

**Status:** Not started
**Epic:** [Epic 1 — Application Foundation](../EPIC.md)
**Depends on:** Stories 1.2, 1.3
**Epic scope covered:** unit/integration test foundations

## Description

Establish the testing stack and the conventions later epics follow. PRODUCT_SPEC.md §40 lists "testing non-deterministic systems" as something an interviewer should find a credible answer to, so the foundation needs to be deliberate rather than incidental.

## Conventions from Story 1.1

Story 1.1 is complete, and these four bind this story. They are stated in every Epic 1 story so each one can be read on its own; the full reasoning is in `docs/adr/0001-repository-structure-and-typescript-toolchain.md`.

- **`pnpm verify` is the acceptance command** — `build && lint && format:check && test`, chained with `&&` so the first failure is the exit code. This story passes it from the repository root. Prettier owns Markdown as well as code, so an unformatted planning document fails it too
- **Six verbs, identical in every package** — `dev`, `build`, `test`, `lint`, `typecheck`, `clean`. Only `test` and `dev` fan out with `pnpm -r`; the rest run their tool once from the root, because the reference graph and ESLint's project service already cover the workspace in one pass. Changing what a verb means in one package means changing it everywhere, or saying why not
- **Shared tooling lives at the workspace root; packages declare only what they actually import.** ESLint, Prettier and TypeScript are root-only devDependencies, and pnpm puts the root's `node_modules/.bin` on every package script's PATH. A library the code imports belongs in the package that imports it — `@types/node` in `apps/backend` is the counter-example that keeps the rule from being over-applied
- **The module setup is ESM-only and single-file-safe** — `"type": "module"`, `module: nodenext`, `isolatedModules`, `verbatimModuleSyntax`, and relative imports carrying `.js` extensions from `.ts` files (TS2835 without one). `packages/shared` is consumed as **built output**, so it must be built before any consumer can be typechecked; `tsc -b` orders that itself, which is why `typecheck` and `build` are the same command

Two more things that are true today and will not be forever. Until Story 1.9 lands, **`pnpm test` passes because there are no tests** — all three `test` scripts are `echo` placeholders that exit 0. Until Stories 1.2 and 1.3 land, both apps' `dev` scripts are placeholders too; only `packages/shared`'s (`tsc -b --watch`) is real.

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
