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

- **`pnpm verify` is the acceptance command** — `build && lint && format:check && stories && test`, chained with `&&` so the first failure is the exit code. It took its fifth step in Task 1.4.5: `stories` fails if a component has no stories file, and `build` now also produces the Storybook bundle. This story passes it from the repository root. Prettier owns Markdown as well as code, so an unformatted planning document fails it too
- **Six verbs, identical in every package** — `dev`, `build`, `test`, `lint`, `typecheck`, `clean`. Only `test` and `dev` fan out with `pnpm -r`; the rest run their tool once from the root, because the reference graph and ESLint's project service already cover the workspace in one pass. Changing what a verb means in one package means changing it everywhere, or saying why not
- **Shared tooling lives at the workspace root; packages declare only what they actually import.** ESLint, Prettier and TypeScript are root-only devDependencies, and pnpm puts the root's `node_modules/.bin` on every package script's PATH. A library the code imports belongs in the package that imports it — `@types/node` in `apps/backend` is the counter-example that keeps the rule from being over-applied
- **The module setup is ESM-only and single-file-safe** — `"type": "module"`, `module: nodenext`, `isolatedModules`, `verbatimModuleSyntax`, and relative imports carrying `.js` extensions from `.ts` files (TS2835 without one). `packages/shared` is consumed as **built output**, so it must be built before any consumer can be typechecked; `tsc -b` orders that itself, which is why `typecheck` and `build` are the same command

One thing that is true today and will not be forever: until Story 1.9 lands, **`pnpm test` passes because there are no tests** — all three `test` scripts are `echo` placeholders that exit 0, and they are now the only placeholders left. The companion note about both apps' `dev` scripts being placeholders is **no longer true** — Stories 1.2 and 1.3 made all three real.

## What that means for this story

- The health response type is exactly what `packages/shared` exists for — one definition, both sides compiling against it. This story is the first real payoff of creating that package in Story 1.1 rather than deferring it, and the first place the build-before-typecheck ordering has a genuine consequence: change the health shape and both apps must be rebuilt, which `tsc -b` handles and `--noEmit` silently does not
- **The type this story promotes now exists, with names.** `HealthResponse` and `HealthStatus`, exported from `apps/backend/src/routes/health.ts`. Two details worth not guessing at: the uptime field is **`uptimeSeconds`**, not `uptime` — the unit travels in the name so it survives the wire — and `HealthStatus` is a one-member union `"ok"`. So the healthy / degraded / unreachable distinction in the criteria below is **entirely client-side today**: "unreachable" is the absence of a response, which no server can report about itself, and nothing widens the union until Epic 3 adds market-feed state. The union exists so that is an addition rather than a breaking change
- **`apps/backend` declares `@marketpulse/shared` without importing it**, and promoting the health type there is what makes that manifest entry honest again. Worth saying so the dependency is not deleted as dead first. It also makes a latent deployment problem live: because nothing imports the package today, the pnpm symlink into `packages/shared` is never followed at runtime, so a copied package directory runs despite it. The first import from this story starts exercising it — a reason to land Story 1.11's `pnpm deploy` mechanism before, or alongside, rather than after
- **CORS has not been considered by any task in Story 1.2**, deliberately. Nothing in that story proves a browser on another origin can reach `/health`, so this story starts from zero on that rather than from a partial setup. The place to attach it is `buildServer()`, alongside Story 1.7's error handling
- **`/health` has no response schema** (deferred by Task 1.2.3 to Story 1.7), so nothing on the backend validates the shape this story compiles against. If 1.7 has not landed a schema approach by the time this story runs, the shared type is the only contract
- The frontend must reach the backend over HTTP without importing anything server-side. `apps/frontend`'s `types` array enforces that structurally — `process` does not typecheck there — so resist any convenience that requires weakening it. It reads `["vite/client"]` since Task 1.4.2 (2026-08-31) rather than `[]`, and the guard was re-measured after that change: `process` still fails `TS2591`. The explicit list is what keeps auto-discovery off; its contents are not what does the work. Note the shape this takes in practice: the browser's `fetch` is available through the `dom` lib, and **the frontend still has no environment-variable mechanism** — `import.meta.env` typechecks now that `vite/client` is in scope, but nothing uses it and there is no `.env` file. The backend's URL has to come from somewhere this story chooses

### What Story 1.3 hands this story

- **There is a shell to put the indicator in, and it is one component.** `apps/frontend/src/App.tsx` is a single stateless function with a heading and a paragraph. This story adds the application's **first state, first effect and first network call** — which means it is also the first code the React Compiler rule set will have anything to say about. Fifteen of `eslint-plugin-react-hooks`'s 17 rules are at `error`, `exhaustive-deps` is a `warn`, and `lint` runs with `--max-warnings 0`, so a polling effect with a sloppy dependency array fails `verify` rather than merely warning
- **The CORS origin is settled and stable.** Task 1.3.3 adopted `strictPort: true` precisely for this: a busy 5173 exits 1 rather than quietly binding 5174, so an allowlist pinned to `http://localhost:5173` cannot be defeated by a port shifting underneath it. That failure would have surfaced as a browser CORS error naming neither the port nor the cause
- **Watch the loopback family.** The frontend dev server binds `[::1]` and the backend binds `127.0.0.1`, so a browser talking to `http://localhost:3000` is fine while a script pinned to one family may not be. It also means the two origins differ by port only, which is still cross-origin
- **The frontend dev server does not typecheck.** A type error in this story's client code — the most likely place for one, since it compiles against `HealthResponse` from a package built by something else — is applied as an ordinary hot update with no overlay and no console error. `pnpm verify` or the editor is what catches it, and `packages/shared` must be rebuilt before either says anything true
- **Nothing about the deployed half is easier than it was.** The frontend artefact is `dist/` with an **absolute** asset path and no runtime configuration, so "point the frontend at the deployed backend" is a build-time input rather than a deploy-time one unless this story makes it otherwise
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
