# Story 1.12 — Health & Status Vertical Slice

**Status:** Not started
**Epic:** [Epic 1 — Application Foundation](../EPIC.md)
**Depends on:** Stories 1.5, 1.7, 1.8
**Epic scope covered:** epic exit criterion — backend health/status viewable from the frontend

## Description

The story that closes the epic: prove the whole foundation works end to end by having the frontend display real backend status. Small in scope, but it exercises configuration, routing, layout, the API contract, error handling and deployment together.

It also establishes the connection-state pattern that Epic 3 reuses for the live market feed.

## Conventions from Story 1.1

Story 1.1 is complete, and these four bind this story. They are stated in every Epic 1 story so each one can be read on its own; the full reasoning is in `docs/adr/0001-repository-structure-and-typescript-toolchain.md`.

- **`pnpm verify` is the acceptance command** — `build && lint && format:check && test`, chained with `&&` so the first failure is the exit code. This story passes it from the repository root. Prettier owns Markdown as well as code, so an unformatted planning document fails it too
- **Six verbs, identical in every package** — `dev`, `build`, `test`, `lint`, `typecheck`, `clean`. Only `test` and `dev` fan out with `pnpm -r`; the rest run their tool once from the root, because the reference graph and ESLint's project service already cover the workspace in one pass. Changing what a verb means in one package means changing it everywhere, or saying why not
- **Shared tooling lives at the workspace root; packages declare only what they actually import.** ESLint, Prettier and TypeScript are root-only devDependencies, and pnpm puts the root's `node_modules/.bin` on every package script's PATH. A library the code imports belongs in the package that imports it — `@types/node` in `apps/backend` is the counter-example that keeps the rule from being over-applied
- **The module setup is ESM-only and single-file-safe** — `"type": "module"`, `module: nodenext`, `isolatedModules`, `verbatimModuleSyntax`, and relative imports carrying `.js` extensions from `.ts` files (TS2835 without one). `packages/shared` is consumed as **built output**, so it must be built before any consumer can be typechecked; `tsc -b` orders that itself, which is why `typecheck` and `build` are the same command

Two more things that are true today and will not be forever. Until Story 1.9 lands, **`pnpm test` passes because there are no tests** — all three `test` scripts are `echo` placeholders that exit 0. Until Stories 1.2 and 1.3 land, both apps' `dev` scripts are placeholders too; only `packages/shared`'s (`tsc -b --watch`) is real.

## What that means for this story

- The health response type is exactly what `packages/shared` exists for — one definition, both sides compiling against it. This story is the first real payoff of creating that package in Story 1.1 rather than deferring it, and the first place the build-before-typecheck ordering has a genuine consequence: change the health shape and both apps must be rebuilt, which `tsc -b` handles and `--noEmit` silently does not
- The frontend must reach the backend over HTTP without importing anything server-side. `apps/frontend`'s `types: []` enforces that structurally — `process` does not typecheck there — so resist any convenience that requires weakening it
- Closing the epic means `pnpm verify` passes and the slice works in the **deployed** environment, not only locally. Verifying against a running local pair is the thing this story exists to go beyond

## Acceptance criteria

- The frontend queries backend health and displays it in the application chrome
- Status distinguishes healthy, degraded and unreachable
- When the backend is unreachable the indicator reports it along with the last successful check time, and the rest of the interface remains usable
- Recovery is automatic when the backend returns — no page reload required
- Behaviour is verified against the deployed environment, not only locally
- Polling is deliberate about frequency and does not spam logs

## Notes

This is the first appearance of PRODUCT_SPEC.md §36's core principle: report what is known and when it was known, and degrade locally. The eventual live-feed equivalent is "Live feed disconnected — displaying data through 10:42:17".
