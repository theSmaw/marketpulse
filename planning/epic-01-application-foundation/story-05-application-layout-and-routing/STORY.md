# Story 1.5 — Application Layout & Routing

**Status:** Not started
**Epic:** [Epic 1 — Application Foundation](../EPIC.md)
**Depends on:** Story 1.4
**Epic scope covered:** basic routing and application layout

## Description

Establish navigation and the persistent application chrome. Routes correspond to the four primary experiences in PRODUCT_SPEC.md §8, each rendering a placeholder until its epic delivers it.

## Conventions from Story 1.1

Story 1.1 is complete, and these four bind this story. They are stated in every Epic 1 story so each one can be read on its own; the full reasoning is in `docs/adr/0001-repository-structure-and-typescript-toolchain.md`.

- **`pnpm verify` is the acceptance command** — `build && lint && format:check && test`, chained with `&&` so the first failure is the exit code. This story passes it from the repository root. Prettier owns Markdown as well as code, so an unformatted planning document fails it too
- **Six verbs, identical in every package** — `dev`, `build`, `test`, `lint`, `typecheck`, `clean`. Only `test` and `dev` fan out with `pnpm -r`; the rest run their tool once from the root, because the reference graph and ESLint's project service already cover the workspace in one pass. Changing what a verb means in one package means changing it everywhere, or saying why not
- **Shared tooling lives at the workspace root; packages declare only what they actually import.** ESLint, Prettier and TypeScript are root-only devDependencies, and pnpm puts the root's `node_modules/.bin` on every package script's PATH. A library the code imports belongs in the package that imports it — `@types/node` in `apps/backend` is the counter-example that keeps the rule from being over-applied
- **The module setup is ESM-only and single-file-safe** — `"type": "module"`, `module: nodenext`, `isolatedModules`, `verbatimModuleSyntax`, and relative imports carrying `.js` extensions from `.ts` files (TS2835 without one). `packages/shared` is consumed as **built output**, so it must be built before any consumer can be typechecked; `tsc -b` orders that itself, which is why `typecheck` and `build` are the same command

Two more things that are true today and will not be forever. Until Story 1.9 lands, **`pnpm test` passes because there are no tests** — all three `test` scripts are `echo` placeholders that exit 0. Until Stories 1.2 and 1.3 land, both apps' `dev` scripts are placeholders too; only `packages/shared`'s (`tsc -b --watch`) is real.

## What that means for this story

- The router is a library this package imports, so it is declared in `apps/frontend` — not at the root. Root-only is for tools that are invoked as commands
- Route modules are `.ts`/`.tsx` inside `apps/frontend/src`, so relative imports between them carry `.js` extensions (`./routes/overview.js`). This is the rule most often forgotten in a story that adds many small files at once
- "Deep-linking to a route works on page reload" is a dev-server and hosting concern, not a router one. It needs a history-API fallback in whatever Story 1.3 chose and again in whatever Story 1.11 deploys to — verify it in both, because passing locally proves nothing about the deployed environment
- Adding a route is not a reason to add a package. `apps/frontend` stays one package; the feature modules under `app/` described in the frontend structure are directories, not workspace packages

## Acceptance criteria

- Routes exist for Market Overview (landing), Investigation Workspace, Security Explorer and Market Replay
- Each route renders an identifiable placeholder
- Persistent application chrome — product name, market clock area, connection status area — survives navigation
- An unknown route renders a not-found state rather than a blank screen
- Layout uses desktop-first regions consistent with the PRODUCT_SPEC.md §9 sketch
- Deep-linking to a route works on page reload

## Open decisions

- Router library — React Router is the default assumption

## Notes

The status and clock areas are placeholders here; Story 1.12 fills the status area, and Epic 3 supplies the live market clock.
