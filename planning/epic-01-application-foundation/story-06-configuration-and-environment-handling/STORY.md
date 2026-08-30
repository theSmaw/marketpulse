# Story 1.6 — Configuration & Environment Handling

**Status:** Not started
**Epic:** [Epic 1 — Application Foundation](../EPIC.md)
**Depends on:** Stories 1.2, 1.3
**Epic scope covered:** shared configuration, environment handling

## Description

Typed, validated configuration for both packages, with a clear boundary between server-only secrets and values safe to ship to the browser. Epic 2 introduces Alpaca API credentials and Epic 10 introduces LLM provider credentials, so this boundary must be correct before either arrives.

## Conventions from Story 1.1

Story 1.1 is complete, and these four bind this story. They are stated in every Epic 1 story so each one can be read on its own; the full reasoning is in `docs/adr/0001-repository-structure-and-typescript-toolchain.md`.

- **`pnpm verify` is the acceptance command** — `build && lint && format:check && test`, chained with `&&` so the first failure is the exit code. This story passes it from the repository root. Prettier owns Markdown as well as code, so an unformatted planning document fails it too
- **Six verbs, identical in every package** — `dev`, `build`, `test`, `lint`, `typecheck`, `clean`. Only `test` and `dev` fan out with `pnpm -r`; the rest run their tool once from the root, because the reference graph and ESLint's project service already cover the workspace in one pass. Changing what a verb means in one package means changing it everywhere, or saying why not
- **Shared tooling lives at the workspace root; packages declare only what they actually import.** ESLint, Prettier and TypeScript are root-only devDependencies, and pnpm puts the root's `node_modules/.bin` on every package script's PATH. A library the code imports belongs in the package that imports it — `@types/node` in `apps/backend` is the counter-example that keeps the rule from being over-applied
- **The module setup is ESM-only and single-file-safe** — `"type": "module"`, `module: nodenext`, `isolatedModules`, `verbatimModuleSyntax`, and relative imports carrying `.js` extensions from `.ts` files (TS2835 without one). `packages/shared` is consumed as **built output**, so it must be built before any consumer can be typechecked; `tsc -b` orders that itself, which is why `typecheck` and `build` are the same command

Two more things that are true today and will not be forever. Until Story 1.9 lands, **`pnpm test` passes because there are no tests** — all three `test` scripts are `echo` placeholders that exit 0. Until Stories 1.2 and 1.3 land, both apps' `dev` scripts are placeholders too; only `packages/shared`'s (`tsc -b --watch`) is real.

## What that means for this story

- `.gitignore` already carries `.env`, `.env.*` and `!.env.example`, so the "real secrets are gitignored" criterion is wiring that exists — verify it rather than adding it, and check the negation actually works before relying on it
- **The root-only tooling rule does not apply here.** A schema library (Zod, Valibot) is imported by application code, not invoked as a command, so it is declared in the packages that import it — the same reason `@types/node` stays in `apps/backend`. Shared tooling lives at the root; packages declare what they import
- If configuration types are shared between the apps they belong in `packages/shared`, which is consumed as **built output** — so the config schema must be built before either app can typecheck against it. `tsc -b` orders that itself; nothing else has to know
- **What this story replaces on the backend now exists, and it is slightly more than two `process.env` reads.** `apps/backend/src/index.ts` reads `PORT` and `HOST` inline, and around them Task 1.2.1 added three things whose _behaviour_ this story must keep even as the mechanism changes: a `ConfigError` type, a range check rejecting anything that is not an integer in 1–65535, and a fail-before-the-logger-exists path that writes a plain line to stderr and exits 1. The message names the variable and the value it was given (`PORT must be an integer between 1 and 65535, received "nonsense"`), where a Node bind error names neither. Verified in Task 1.2.6. That failure behaviour is the acceptance criterion below about naming the offending key — it is already met for two keys, and the schema this story picks has to be at least as informative, not merely typed
- **`NODE_ENV` is not read anywhere today.** This story's "distinct configuration for development, test and production" criterion starts from nothing rather than from an existing convention — Task 1.2.5 ran the built server with `NODE_ENV=production` and nothing about its behaviour or its logs differed. Whatever this story does with it is a decision, not an alignment
- `apps/frontend` sets `types: []` specifically so `process` does not typecheck in browser code. That is a structural half of this story's whitelisting criterion and it is already in place: an accidental `process.env.SECRET` in the frontend is a compile error today. Do not weaken it to make a config helper convenient

## Acceptance criteria

- Configuration is parsed and validated at startup, with a declared schema
- The server refuses to start on missing or invalid configuration and names the offending key
- Distinct configuration for development, test and production
- `.env.example` documents every variable, with descriptions and safe placeholder values
- Only explicitly whitelisted variables reach the frontend bundle; secrets cannot leak by accident
- Real secrets are gitignored and never committed

## Notes

Market-data and LLM credentials are server-side only, without exception. The browser talks to the MarketPulse backend, never directly to Alpaca or a model provider.
