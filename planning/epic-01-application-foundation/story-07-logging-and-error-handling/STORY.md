# Story 1.7 — Logging & Error Handling

**Status:** Not started
**Epic:** [Epic 1 — Application Foundation](../EPIC.md)
**Depends on:** Story 1.2
**Epic scope covered:** logging, basic error handling

## Description

Structured logging and a consistent error contract across the stack. PRODUCT_SPEC.md §36 requires that failures degrade locally rather than collapsing the application, so the error handling established here sets the pattern for every later partial-failure state.

## Conventions from Story 1.1

Story 1.1 is complete, and these four bind this story. They are stated in every Epic 1 story so each one can be read on its own; the full reasoning is in `docs/adr/0001-repository-structure-and-typescript-toolchain.md`.

- **`pnpm verify` is the acceptance command** — `build && lint && format:check && test`, chained with `&&` so the first failure is the exit code. This story passes it from the repository root. Prettier owns Markdown as well as code, so an unformatted planning document fails it too
- **Six verbs, identical in every package** — `dev`, `build`, `test`, `lint`, `typecheck`, `clean`. Only `test` and `dev` fan out with `pnpm -r`; the rest run their tool once from the root, because the reference graph and ESLint's project service already cover the workspace in one pass. Changing what a verb means in one package means changing it everywhere, or saying why not
- **Shared tooling lives at the workspace root; packages declare only what they actually import.** ESLint, Prettier and TypeScript are root-only devDependencies, and pnpm puts the root's `node_modules/.bin` on every package script's PATH. A library the code imports belongs in the package that imports it — `@types/node` in `apps/backend` is the counter-example that keeps the rule from being over-applied
- **The module setup is ESM-only and single-file-safe** — `"type": "module"`, `module: nodenext`, `isolatedModules`, `verbatimModuleSyntax`, and relative imports carrying `.js` extensions from `.ts` files (TS2835 without one). `packages/shared` is consumed as **built output**, so it must be built before any consumer can be typechecked; `tsc -b` orders that itself, which is why `typecheck` and `build` are the same command

Two more things that are true today and will not be forever. Until Story 1.9 lands, **`pnpm test` passes because there are no tests** — all three `test` scripts are `echo` placeholders that exit 0. Until Stories 1.2 and 1.3 land, both apps' `dev` scripts are placeholders too; only `packages/shared`'s (`tsc -b --watch`) is real.

## What that means for this story

- The error shape is the first genuinely shared contract between the two apps, so it belongs in `packages/shared` — which is consumed as **built output**. Editing it means rebuilding shared before either app typechecks against the change; `pnpm build` and `pnpm verify` do that, a bare `tsc --noEmit` in an app does not and will pass against the previous shape
- A logger is a library the backend imports, so it is declared in `apps/backend`. The frontend's error boundary is a React concern and belongs to `apps/frontend`; neither is root tooling
- **`exactOptionalPropertyTypes` is on**, which matters here more than anywhere else so far: an error object with `cause` absent and one with `cause: undefined` are different types. The domain reason is the same one that put the setting there — a missing field and an explicitly unknown one are different states, and this story is where that first shows up in real code
- `*.log` is already gitignored. Logs go to stdout as structured JSON, not to files in the repository

## Acceptance criteria

- Backend emits structured (JSON) logs with configurable levels
- Every request is logged with a correlation id, method, path, status and duration
- The correlation id is returned to the client so a user-visible error can be traced to a log entry
- API errors use a single consistent shape
- Unhandled errors and promise rejections are caught and logged rather than crashing the process silently
- Stack traces and internal detail are not exposed to clients in production
- The frontend has an error boundary that contains a failure to the affected region and offers recovery, rather than replacing the whole screen

## Notes

Later epics extend this pattern rather than replacing it — failed analytical tools (Epic 7), SEC unavailability (Epic 9) and agent failures (Epic 10) are all _product states_, not exceptions.
