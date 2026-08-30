# Story 1.8 — Local Development Environment

**Status:** Not started
**Epic:** [Epic 1 — Application Foundation](../EPIC.md)
**Depends on:** Stories 1.2, 1.3
**Epic scope covered:** local development environment

## Description

Make frontend and backend run together with one command, and make the setup reproducible for someone cloning the repository for the first time — including an interviewer (PRODUCT_SPEC.md §40).

## Conventions from Story 1.1

Story 1.1 is complete, and these four bind this story. They are stated in every Epic 1 story so each one can be read on its own; the full reasoning is in `docs/adr/0001-repository-structure-and-typescript-toolchain.md`.

- **`pnpm verify` is the acceptance command** — `build && lint && format:check && test`, chained with `&&` so the first failure is the exit code. This story passes it from the repository root. Prettier owns Markdown as well as code, so an unformatted planning document fails it too
- **Six verbs, identical in every package** — `dev`, `build`, `test`, `lint`, `typecheck`, `clean`. Only `test` and `dev` fan out with `pnpm -r`; the rest run their tool once from the root, because the reference graph and ESLint's project service already cover the workspace in one pass. Changing what a verb means in one package means changing it everywhere, or saying why not
- **Shared tooling lives at the workspace root; packages declare only what they actually import.** ESLint, Prettier and TypeScript are root-only devDependencies, and pnpm puts the root's `node_modules/.bin` on every package script's PATH. A library the code imports belongs in the package that imports it — `@types/node` in `apps/backend` is the counter-example that keeps the rule from being over-applied
- **The module setup is ESM-only and single-file-safe** — `"type": "module"`, `module: nodenext`, `isolatedModules`, `verbatimModuleSyntax`, and relative imports carrying `.js` extensions from `.ts` files (TS2835 without one). `packages/shared` is consumed as **built output**, so it must be built before any consumer can be typechecked; `tsc -b` orders that itself, which is why `typecheck` and `build` are the same command

Two more things that are true today and will not be forever. Until Story 1.9 lands, **`pnpm test` passes because there are no tests** — all three `test` scripts are `echo` placeholders that exit 0. Until Stories 1.2 and 1.3 land, both apps' `dev` scripts are placeholders too; only `packages/shared`'s (`tsc -b --watch`) is real.

## What that means for this story

`README.md` now exists. It carries prerequisites (Node 24.x — required, not a minimum, because `engineStrict` refuses other majors; `corepack enable`), the setup sequence, the full command table, the layout, the install-script policy and editor setup. Every command in it was executed from a clean clone rather than written from memory.

So this story **extends the README, it does not create one** — and two of its criteria below are already met. What is genuinely outstanding is the part the README says plainly it cannot yet do: get you to a _running application_. Its "What exists today" section says so and names itself as the first thing to change when that stops being true.

## Acceptance criteria

- **`pnpm dev` is the single command, and it already exists** — `pnpm -r --parallel run dev`, one of only two root scripts that deliberately fan out. This story makes it start both services rather than introducing a new command name. **Half of that is now done:** Story 1.2 replaced `apps/backend`'s placeholder with a real loop (`scripts/dev.sh` — `tsc -b --watch --preserveWatchOutput` plus `node --watch dist/index.js`), so root `pnpm dev` today is one placeholder line, two watchers and a running server. Only `apps/frontend`'s `dev` is still an `echo`, and Story 1.3 replaces it. `packages/shared`'s real `tsc -b --watch` must keep running alongside both
- **The backend's dev loop is a pattern to match rather than to redesign.** It restarts in about a second on an edit, drains in-flight requests on the way out, prints its own shutdown lines, and leaves no orphaned process or held port on Ctrl-C — all verified in Task 1.2.6. Whatever the frontend's loop turns out to be, this story's job is making the pair legible together, not replacing what works. Note that `--preserveWatchOutput` is load-bearing under the parallel fan-out: without it a `tsc --watch` clears the terminal and takes the other packages' output with it
- The frontend can call the backend without CORS or proxy errors
- Both services reload on source change
- ~~Prerequisites (runtime versions, package manager) are documented~~ — **done in Task 1.1.8.** Re-check them here rather than rewriting them; add nothing unless this story introduces a new prerequisite
- A clean clone reaches a **running application** by following the README only. Task 1.1.8 proved the clone reaches a repository that installs and verifies, twice, from an empty pnpm store and an empty Corepack home. This story is the other half, and the verification method is the same: clone into an empty directory and follow the written words, not the working tree you already have
- Ports are configurable and conflicts produce a clear message — **half met on the backend.** `PORT` and `HOST` are read, an out-of-range or non-numeric `PORT` exits 1 naming the variable and the value, and a busy port exits 1 with Fastify's `EADDRINUSE` record and a `server failed to start` line. Whether that record counts as "a clear message" is this story's call; the frontend half is untouched

## Notes

No database is required yet — PostgreSQL arrives in Epic 2, at which point this story's setup extends to include it.
