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

One thing that is true today and will not be forever: until Story 1.9 lands, **`pnpm test` passes because there are no tests** — all three `test` scripts are `echo` placeholders that exit 0, and they are now the only placeholders left. The companion note about both apps' `dev` scripts being placeholders is **no longer true** — Stories 1.2 and 1.3 made all three real.

## What that means for this story

`README.md` now exists. It carries prerequisites (Node 24.x — required, not a minimum, because `engineStrict` refuses other majors; `corepack enable`), the setup sequence, the full command table, the layout, the install-script policy and editor setup. Every command in it was executed from a clean clone rather than written from memory.

So this story **extends the README, it does not create one** — and two of its criteria below are already met. What is genuinely outstanding is the part the README says plainly it cannot yet do: get you to a _running application_. Its "What exists today" section says so and names itself as the first thing to change when that stops being true.

## Acceptance criteria

- ~~**`pnpm dev` is the single command, and it already exists**~~ — **this criterion is now met, and Story 1.3 closed the second half of it.** All three `dev` scripts are real: `packages/shared` in `tsc -b --watch --preserveWatchOutput`, `apps/backend` in `scripts/dev.sh` (a second `tsc -b --watch` plus `node --watch dist/index.js`), and `apps/frontend` in `vite`. Root `pnpm dev` starts the pair — eight processes, backend on 3000 and dev server on 5173 — and Task 1.3.5 verified Ctrl-C leaves zero survivors in the process group with both ports released. What is left for this story is not starting them but **making the pair legible together**, which is a presentation problem rather than a wiring one
- **The backend's dev loop is a pattern to match rather than to redesign.** It restarts in about a second on an edit, drains in-flight requests on the way out, prints its own shutdown lines, and leaves no orphaned process or held port on Ctrl-C — all verified in Task 1.2.6. Whatever the frontend's loop turns out to be, this story's job is making the pair legible together, not replacing what works. Note that `--preserveWatchOutput` is load-bearing under the parallel fan-out: without it a `tsc --watch` clears the terminal and takes the other packages' output with it
- The frontend can call the backend without CORS or proxy errors. **Nothing about this is done and Story 1.3 deliberately did not touch it** — the frontend makes no request at all. Note the decision this story inherits rather than makes: Vite's `server.proxy` and backend CORS are alternative answers, and Story 1.12 configures CORS against `http://localhost:5173`, so choosing a proxy here would leave that configuration testing nothing
- ~~Both services reload on source change~~ — **met, by two different mechanisms with different baselines.** The backend restarts the process in ~1.1s (edit → new listener; ~100–140 ms of that is the signal half). The frontend replaces the module in **~100–140 ms warm** with component state preserved, and does not restart anything; its first edit after a server start is ~850 ms and is not the number to regress against. Re-checking the frontend half needs component state — editing a heading passes identically on a full page reload, which is the trap Task 1.3.5 had to work around by re-creating a counter
- ~~Prerequisites (runtime versions, package manager) are documented~~ — **done in Task 1.1.8.** Re-check them here rather than rewriting them; add nothing unless this story introduces a new prerequisite
- A clean clone reaches a **running application** by following the README only. Task 1.1.8 proved the clone reaches a repository that installs and verifies, and Task 1.3.5 proved it again with the frontend present — cold pnpm store, 200 packages in 1.3s, `pnpm verify` in 7.6s, and a **byte-identical** bundle. Neither started the pair from that clone. **That remains this story's, and it is now the only half outstanding.** The verification method is unchanged: clone into an empty directory and follow the written words, not the working tree you already have
- Ports are configurable and conflicts produce a clear message — **the conflict half is now met on both services, and the configurable half is not.** Task 1.3.3 adopted `strictPort: true`, so a busy 5173 exits 1 with `Error: Port 5173 is already in use` rather than quietly binding 5174; the backend exits 1 with Fastify's `EADDRINUSE` record and a `server failed to start` line. Whether those count as "a clear message" is still this story's call. **Configurability is where the two now differ**: the backend reads `PORT` and `HOST` from the environment, while the frontend's 5173 and 4173 are literals in `vite.config.ts` with no environment override — a deliberate non-decision in Story 1.3, and this story's to settle if it wants one

- **There are now three ports and a fourth thing that reads them.** Backend 3000, dev server 5173, preview 4173 — only the first two are anyone's decision; 4173 is Vite's default written down explicitly because `preview` inherits `server.strictPort` but **not** `server.port`. Story 1.12's CORS allowlist is pinned to the dev-server origin, which is what makes a silently moving port expensive
- **Both frontend servers bind IPv6 loopback and the backend binds IPv4.** `curl http://localhost:5173/` works, `curl http://127.0.0.1:5173/` is connection-refused, and `apps/backend` is the reverse. Both are "localhost" to a browser and are not to a script — so any readiness check, wait-for-port helper or documented `curl` this story writes has to get the family right per service

## Notes

No database is required yet — PostgreSQL arrives in Epic 2, at which point this story's setup extends to include it.
