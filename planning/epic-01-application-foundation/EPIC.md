# Epic 1 — Application Foundation

**Status:** In progress — Stories 1.1, 1.2 and 1.3 complete (2026-08-30)
**Sequence:** 1 of 15 — first epic, no dependencies
**Spec references:** PRODUCT_SPEC.md §25 (frontend architecture), §29 (backend architecture), §41 Phase 0

## Goal

Establish the development and deployment foundation for MarketPulse.

## Outcome

A working frontend and backend can be run locally and deployed, with shared conventions in place for future development.

## Scope

- React application shell
- TypeScript backend service
- Local development environment
- Basic routing and application layout
- Shared configuration
- Environment handling
- Logging
- Basic error handling
- Unit/integration test foundations
- CI pipeline
- Initial deployment pipeline
- Select UI component library and styling conventions

## Exit criteria

- Frontend and backend run together locally
- A deployed development environment is accessible
- Automated tests run in CI
- Backend health/status can be viewed from the frontend

## Stories

| #    | Story                                                                                                        | Depends on    |
| ---- | ------------------------------------------------------------------------------------------------------------ | ------------- |
| 1.1  | [Repository Structure & TypeScript Toolchain](story-01-repository-structure-and-toolchain/STORY.md)          | —             |
| 1.2  | [Backend Service Skeleton](story-02-backend-service-skeleton/STORY.md)                                       | 1.1           |
| 1.3  | [Frontend Application Shell](story-03-frontend-application-shell/STORY.md)                                   | 1.1           |
| 1.4  | [UI Component Library & Styling Conventions](story-04-ui-component-library-and-styling-conventions/STORY.md) | 1.3           |
| 1.5  | [Application Layout & Routing](story-05-application-layout-and-routing/STORY.md)                             | 1.4           |
| 1.6  | [Configuration & Environment Handling](story-06-configuration-and-environment-handling/STORY.md)             | 1.2, 1.3      |
| 1.7  | [Logging & Error Handling](story-07-logging-and-error-handling/STORY.md)                                     | 1.2           |
| 1.8  | [Local Development Environment](story-08-local-development-environment/STORY.md)                             | 1.2, 1.3      |
| 1.9  | [Automated Testing Foundations](story-09-automated-testing-foundations/STORY.md)                             | 1.2, 1.3      |
| 1.10 | [Continuous Integration Pipeline](story-10-continuous-integration-pipeline/STORY.md)                         | 1.9           |
| 1.11 | [Deployment Pipeline & Development Environment](story-11-deployment-pipeline-and-dev-environment/STORY.md)   | 1.6, 1.10     |
| 1.12 | [Health & Status Vertical Slice](story-12-health-status-vertical-slice/STORY.md)                             | 1.5, 1.7, 1.8 |

Stories 1.2–1.3 can proceed in parallel once 1.1 lands, as can 1.6–1.9 once both skeletons exist. Story 1.12 closes the epic by proving the foundation end to end.

**Stories 1.2 and 1.3 are both complete, so nothing in this epic is blocked on a missing skeleton any more.** Every remaining story's dependencies are satisfied except 1.5 (needs 1.4), 1.10 (needs 1.9), 1.11 (needs 1.6 and 1.10) and 1.12 (needs 1.5, 1.7 and 1.8). Each of 1.4 and 1.6–1.12 has been amended with what the two skeletons actually made concrete, rather than what they were expected to.

Two consequences of Story 1.3 landing that are worth reading before picking the next story. **Story 1.8 is materially smaller than it is written** — its `pnpm dev` and reload criteria are met, and what is left is one genuinely outstanding item (a clean clone reaching a _running_ pair by following `README.md` alone) plus presentation. It is not deleted, because that outstanding item is one of this epic's exit criteria. And **Story 1.7's two halves are no longer equally ready**: the backend half is unblocked today, while its "contains a failure to the affected region" criterion has no regions until Story 1.5. That is a delivery-order note inside the story rather than a dependency change; the story says so.

## Conventions Story 1.1 set for the rest of this epic

Story 1.1 is complete, and the conventions it established bind every story after it. They are recorded in full in `docs/adr/0001-repository-structure-and-typescript-toolchain.md`, and **restated verbatim in every story from 1.2 to 1.12** under a `Conventions from Story 1.1` heading, followed there by a `What that means for this story` section spelling out the consequences for that story in particular. Each story is meant to be readable on its own without this file; the duplication is deliberate, and the wording is identical so that drift is visible in a diff. Change one and change all eleven.

The four, summarised:

- **`pnpm verify` is the acceptance command** — `build && lint && format:check && stories && test`. Every story here should pass it from the root, and Story 1.10 runs it unchanged rather than re-listing the tools. It was a four-step chain until Task 1.4.5 added `stories`, which fails if a component has no stories file; `build` grew a second bundler in the same task
- **Six verbs, identical in every package** — `dev`, `build`, `test`, `lint`, `typecheck`, `clean`. A new package gets all six; a story that changes what a verb means in one package should change it everywhere or explain why not. Only `test` and `dev` fan out with `pnpm -r`; the rest run their tool once
- **Shared tooling lives at the workspace root; packages declare only what they actually import.** A test runner, a bundler or a formatter plugin goes at the root. A library the code imports — React, Fastify, a schema library, `@types/node` — goes in the package that imports it
- **The module setup is ESM-only and single-file-safe** — `"type": "module"`, `module: nodenext`, `isolatedModules`, `verbatimModuleSyntax`, and relative imports carrying `.js` extensions from `.ts` files. This constrains framework and runner choices in Stories 1.2, 1.3 and 1.9, and each of those now says so

One correction to the second bullet, found in Task 1.2.6 and not worth re-editing eleven verbatim blocks over: the six verbs are right, but **`pnpm --filter <pkg> clean` does not work** — `clean` is also a built-in pnpm 11 command, so the filtered form reaches the built-in and exits 1 with `Unknown option: 'recursive'`. `pnpm --filter <pkg> run clean` works, and root `pnpm clean` is unaffected because the root has a `clean` script to shadow it. `CLAUDE.md` and `README.md` both carry the detail.

One thing to keep visible until Story 1.9 lands: **`pnpm test` passes because there are no tests**, not because tests pass. Story 1.10 will put that tick on every pull request.

The paragraph that follows those four bullets in each story **has drifted once and was re-synced**: five stories still said both apps' `dev` scripts were placeholders after Stories 1.2 and 1.3 had made them real. All eleven now carry the same corrected wording. That is the failure mode the verbatim convention is meant to make visible in a diff, so it is worth knowing it took a deliberate sweep rather than being caught by one.

## What Story 1.2 established for the rest of this epic

Story 1.2 is complete and recorded in `docs/adr/0002-backend-framework-and-server-composition.md`. Four things bind later stories:

- **Fastify, not NestJS**, chosen partly on the spec's "keep the backend relatively small" and partly because NestJS's decorator-and-metadata DI fights this workspace's `verbatimModuleSyntax` and ESM-only setup. The structure NestJS would have supplied is a cost deferred to Epic 7, where Fastify's plugin model is the intended answer
- **`buildServer()` returns an instance without listening**, and everything that concerns the process — environment, socket, signals — lives in `apps/backend/src/index.ts`. Stories 1.7 and 1.12 attach to the factory; Story 1.9 drives it with `app.inject()`
- **The backend is deliberately incomplete in five named ways**, each belonging to a later story: configuration (1.6), structured logging and error shape (1.7), tests (1.9), deployment (1.11), CORS (1.12). Those gaps are documented at the code sites so they are not read as oversights
- **A local run proves nothing about a deployed one.** Every measurement in Story 1.2 was taken against a hand-started process. Story 1.11 owns container signal delivery, host binding and the kill timeout

## What Story 1.3 established for the rest of this epic

Story 1.3 is complete and recorded in `docs/adr/0003-frontend-build-tooling-and-browser-baseline.md`. Five things bind later stories, and the first two are traps rather than decisions:

- **Both local servers have an SPA fallback and a real static host does not.** `vite` and `vite preview` answer _any_ unmatched path with `index.html` and a 200 — a missing asset included, which reaches the browser as a MIME-type error rather than a 404. Story 1.5's "deep-linking works on page reload" therefore passes locally before anyone configures anything, and Story 1.11 inherits the question of whether the deployed host does the same
- **The `.js` import-extension convention has exactly one enforcer in the frontend, and it is `tsc`.** Drop an extension and `tsc -b` fails with TS2835 while `vite build` emits a byte-identical bundle. `pnpm verify` catches it; the dev server and the bundler do not. This matters most in Story 1.5, which adds many small files at once
- **The frontend's deployable unit is `dist/` alone and its configuration is build-time.** Two files, no `package.json`, no `node_modules` — the opposite shape to the backend, where the package directory is the unit. Asset paths are absolute (`base` defaults to `/`) and any environment variable is inlined at bundle time, so **a subpath deployment and a per-environment configuration are both rebuilds, not hosting settings**. Stories 1.6 and 1.11 own the two halves of that
- **`pnpm verify` now runs a bundler, which grew both CI's runtime and its failure surface.** Root `build` is `tsc -b && pnpm --filter @marketpulse/frontend exec vite build` and hardcodes that one package name — a second frontend package would be silently missed. Story 1.10 carries the detail, including Rolldown being this repository's first platform-specific native binding
- **The React Compiler rule set is in force and has never met real code.** `eslint-plugin-react-hooks`'s `recommended` is 17 rules, 15 at `error`, and `lint` now runs with `--max-warnings 0` so a warning fails `verify`. Stories 1.4, 1.5, 1.7 and 1.12 write the first components those rules will actually see

One prediction resolved wrong and worth not re-making: `allowBuilds` was expected to fire for the first time in Story 1.3, via esbuild arriving with Vite. Vite 8 is the **Rolldown** release — there is no esbuild in this toolchain at all — and four sweeps found zero install scripts across the tree.

**Task 1.4.1 has since made that prediction half-right and given the policy its first data point.** Vite 8 lists `esbuild` only in `peerDependenciesMeta` as `optional: true`, so it is absent unless a plugin supplies it — and `@vanilla-extract/vite-plugin` does, through `@vanilla-extract/compiler` → `@vanilla-extract/integration`. Adding it produced `[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: esbuild@0.28.2` and `pnpm install` **exit 1**, confirming the policy fails an install rather than warning. Two things to carry: pnpm **rewrites the tracked `pnpm-workspace.yaml`** with an `esbuild: set this to true or false` stub when this happens, so a dirty workspace file after a failed install is pnpm's edit and not yours; and **Tailwind was the suspected trip and is not one** — a clean-room install of `tailwindcss` + `@tailwindcss/vite` exits 0, oxide's platform binding is prebuilt, and a full sweep found no install scripts. Story 1.4 chose CSS Modules, so nothing from that spike reached the tree.

**Task 1.4.5 then fired it for real, and `allowBuilds` is no longer empty.** Storybook 10's core package depends on `esbuild` directly — not through Vite, which still has none — and produced the identical signature down to the version: `[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: esbuild@0.28.2`, exit 1, and the stub appended to `pnpm-workspace.yaml`. The entry is `esbuild: true`, with the reason written beside it, and a sweep of the installed tree confirms esbuild is the only package here with an install script. The rule for the next one is unchanged: allowlist the specific package, never widen the policy.
