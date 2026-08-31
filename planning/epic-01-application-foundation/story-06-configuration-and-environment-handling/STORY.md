# Story 1.6 — Configuration & Environment Handling

**Status:** Not started
**Epic:** [Epic 1 — Application Foundation](../EPIC.md)
**Depends on:** Stories 1.2, 1.3
**Epic scope covered:** shared configuration, environment handling

## Description

Typed, validated configuration for both packages, with a clear boundary between server-only secrets and values safe to ship to the browser. Epic 2 introduces Alpaca API credentials and Epic 10 introduces LLM provider credentials, so this boundary must be correct before either arrives.

## Conventions from Story 1.1

Story 1.1 is complete, and these four bind this story. They are stated in every Epic 1 story so each one can be read on its own; the full reasoning is in `docs/adr/0001-repository-structure-and-typescript-toolchain.md`.

- **`pnpm verify` is the acceptance command** — `build && lint && format:check && stories && test`, chained with `&&` so the first failure is the exit code. It took its fifth step in Task 1.4.5: `stories` fails if a component has no stories file, and `build` now also produces the Storybook bundle. This story passes it from the repository root. Prettier owns Markdown as well as code, so an unformatted planning document fails it too
- **Six verbs, identical in every package** — `dev`, `build`, `test`, `lint`, `typecheck`, `clean`. Only `test` and `dev` fan out with `pnpm -r`; the rest run their tool once from the root, because the reference graph and ESLint's project service already cover the workspace in one pass. Changing what a verb means in one package means changing it everywhere, or saying why not
- **Shared tooling lives at the workspace root; packages declare only what they actually import.** ESLint, Prettier and TypeScript are root-only devDependencies, and pnpm puts the root's `node_modules/.bin` on every package script's PATH. A library the code imports belongs in the package that imports it — `@types/node` in `apps/backend` is the counter-example that keeps the rule from being over-applied
- **The module setup is ESM-only and single-file-safe** — `"type": "module"`, `module: nodenext`, `isolatedModules`, `verbatimModuleSyntax`, and relative imports carrying `.js` extensions from `.ts` files (TS2835 without one). `packages/shared` is consumed as **built output**, so it must be built before any consumer can be typechecked; `tsc -b` orders that itself, which is why `typecheck` and `build` are the same command

One thing that is true today and will not be forever: until Story 1.9 lands, **`pnpm test` passes because there are no tests** — all three `test` scripts are `echo` placeholders that exit 0, and they are now the only placeholders left. The companion note about both apps' `dev` scripts being placeholders is **no longer true** — Stories 1.2 and 1.3 made all three real.

## What that means for this story

- `.gitignore` already carries `.env`, `.env.*` and `!.env.example`, so the "real secrets are gitignored" criterion is wiring that exists — verify it rather than adding it, and check the negation actually works before relying on it
- **The root-only tooling rule does not apply here.** A schema library (Zod, Valibot) is imported by application code, not invoked as a command, so it is declared in the packages that import it — the same reason `@types/node` stays in `apps/backend`. Shared tooling lives at the root; packages declare what they import
- If configuration types are shared between the apps they belong in `packages/shared`, which is consumed as **built output** — so the config schema must be built before either app can typecheck against it. `tsc -b` orders that itself; nothing else has to know
- **What this story replaces on the backend now exists, and it is slightly more than two `process.env` reads.** `apps/backend/src/index.ts` reads `PORT` and `HOST` inline, and around them Task 1.2.1 added three things whose _behaviour_ this story must keep even as the mechanism changes: a `ConfigError` type, a range check rejecting anything that is not an integer in 1–65535, and a fail-before-the-logger-exists path that writes a plain line to stderr and exits 1. The message names the variable and the value it was given (`PORT must be an integer between 1 and 65535, received "nonsense"`), where a Node bind error names neither. Verified in Task 1.2.6. That failure behaviour is the acceptance criterion below about naming the offending key — it is already met for two keys, and the schema this story picks has to be at least as informative, not merely typed
- **`NODE_ENV` is not read anywhere today.** This story's "distinct configuration for development, test and production" criterion starts from nothing rather than from an existing convention — Task 1.2.5 ran the built server with `NODE_ENV=production` and nothing about its behaviour or its logs differed. Whatever this story does with it is a decision, not an alignment
- `apps/frontend` sets an **explicit** `types` array specifically so `process` does not typecheck in browser code. That is a structural half of this story's whitelisting criterion and it is already in place: an accidental `process.env.SECRET` in the frontend is a compile error today. Do not weaken it to make a config helper convenient. It reads `["vite/client"]` since Task 1.4.2 (2026-08-31) and was empty before that; the guarantee is unchanged, because what does the work is the list being explicit rather than the list being empty. Adding an entry is not weakening it — see the Story 1.3 section below, where this is the first thing this story inherits already solved

### What Story 1.3 hands this story

The backend half of this story was already concrete after Story 1.2. The frontend half was abstract and now is not — it starts from **nothing**, and one of its criteria turns out to be half-solved by a library default rather than by a decision.

- **There is no environment-variable mechanism in the frontend, and reaching for one is a compile error today.** `import.meta.env.VITE_ANYTHING` fails with `TS2339: Property 'env' does not exist on type 'ImportMeta'` — measured, not assumed, because `types: []` keeps Vite's client types out along with everything else. The standard fix is `"types": ["vite/client"]`, and it **does not weaken the guarantee**: an explicit list is precisely what keeps TypeScript from auto-discovering every reachable `@types` package, so `process` still does not typecheck in browser code after adding it. ~~Add the entry deliberately and keep the array non-empty~~ — **Task 1.4.2 added it first (2026-08-31), for CSS imports.** `apps/frontend/tsconfig.json` now reads `"types": ["vite/client"]`, the comment there names both readers, and the guarantee was re-checked the way this bullet asks: a deliberate `process` reference still fails with TS2591. So this story inherits a solved problem — verify `import.meta.env` typechecks and move on; do not add the entry a second time
- **Vite's `envPrefix` defaults to `VITE_`, which pre-solves the whitelisting criterion by accident.** Only prefixed variables are exposed to client code, so the boundary this story exists to draw is already drawn by a default. Adopt it as a decision rather than inheriting it, and write down the two things that defeat it: widening `envPrefix`, and `define`, which injects whatever it is given with no prefix rule at all. Neither is configured today — `vite.config.ts` sets neither
- **Frontend configuration is inlined at build time, so "distinct configuration for development, test and production" means a rebuild per environment.** There is no runtime read to change: the value is statically substituted into the bundle. This is the same shape as ADR 0003's finding that `base` is a build-time input, and it has the same consequence for Story 1.11 — **one frontend artefact cannot be promoted across environments** unless this story invents a runtime mechanism (a config endpoint, an injected script, a fetched JSON). That is a decision this story owns, and it is a deployment decision as much as a configuration one
- **`.env` files are loaded from the Vite project root, not the repository root.** That is `apps/frontend/`, unless `envDir` says otherwise. `.gitignore`'s `.env` patterns are unanchored, so `apps/frontend/.env` is already ignored — verified, so the "real secrets are gitignored" criterion holds at the new location too
- **The two apps configure their ports differently, and this story may be where that is settled.** The backend reads `PORT` and `HOST` from the environment; the frontend's 5173 and 4173 are literals in `vite.config.ts` with no override. Story 1.8 was handed the question of whether the asymmetry should stand; whichever story runs first owns it. Note that `vite.config.ts` **can** read `process.env` — it runs in Vite's Node process, sits outside the frontend's `include` and so outside that program, and already has its own block in `eslint.config.mjs` giving it Node globals. So the frontend's build configuration and the frontend's client code have genuinely different rules, and conflating them is the mistake to avoid

### What Story 1.5 hands this story

Story 1.5 added no configuration and no environment variable, so nothing here is met that was not met before. It added one build-time input that has to stay in step with an existing one, and it is the kind that fails silently.

- **`base` now has a partner, and neither knows about the other.** `<BrowserRouter>` in `apps/frontend/src/App.tsx` takes **no `basename`**. Deploying under a subpath is already a `base` change and a rebuild (ADR 0003, and Story 1.11's section says so); with a router in the tree it is now _two_ edits, because Vite's `base` fixes the asset paths while React Router still matches against the full pathname. Set one without the other and the page loads its JavaScript correctly and then renders the not-found route at its own address — an application that looks deployed and is not. If this story builds a configuration module, `basename` reading from `import.meta.env.BASE_URL` is the one-line way to make the pair impossible to desynchronise, and it is cheaper now than after Epic 4 has scattered routes
- **Route paths are not configuration and should not become configuration.** They live once in `apps/frontend/src/routes/paths.ts` as an `as const` object precisely so `tsc -b` catches a typo. Anything that turns them into strings read from the environment gives that back for nothing, since they are the same in every environment
- **The frontend still has no environment-variable mechanism at all.** `import.meta.env` typechecks (Task 1.4.2 put `vite/client` in the `types` array) and nothing reads it; there is no `.env` file anywhere. Story 1.5 did not change that and had no reason to — the frontend makes no request and reads no host. This story is still starting from nothing on the frontend half, with one more consumer waiting for it than there was

## Acceptance criteria

- Configuration is parsed and validated at startup, with a declared schema
- The server refuses to start on missing or invalid configuration and names the offending key
- Distinct configuration for development, test and production
- `.env.example` documents every variable, with descriptions and safe placeholder values
- Only explicitly whitelisted variables reach the frontend bundle; secrets cannot leak by accident
- Real secrets are gitignored and never committed

## Open decisions

- ~~**The validation approach**~~ — **closed by Task 1.6.1 on 2026-08-31: no schema library.** The hand-rolled reader wins, generalised into `readString`/`readInt`/`readEnum` plus an accumulator that reports every bad key. Zod 4.5.4 and Valibot 1.4.2 were both spiked to parity and thrown away. The deciding measurement is that a schema over `process.env` is a schema over strings, so blank-means-absent and a message quoting the value the operator typed have to be written by hand either way — `z.coerce.number()` reports `NaN` and loses the input, and `PORT=` parses as **port 0** rather than as the default. Bundle cost, recorded so it is not re-derived: one single-key schema in the frontend is +74.88 kB for Zod and +3.14 kB for Valibot. The reversal trigger is Epic 11's `WorkspaceCommand` validation, which is a different problem and may well want Zod
- **Whether the frontend gets a runtime configuration mechanism** — build-time inlining means one artefact cannot be promoted across environments. Task 1.6.4 states the consequence; inventing a config endpoint or an injected script is a deployment decision and Story 1.11 should be the one to want it
- **Whether the frontend's ports become configurable** — the backend reads `PORT` and `HOST`, the frontend's 5173 and 4173 are literals. Story 1.8 was handed the same question; whichever story runs first owns it, and Task 1.6.4 is the first at it

## Tasks

Tackled in order. The story is complete when all seven are done.

| #     | Task                                                                                          | Status      |
| ----- | --------------------------------------------------------------------------------------------- | ----------- |
| 1.6.1 | [Choose the validation approach](TASK-01-choose-the-validation-approach.md)                   | Complete    |
| 1.6.2 | [The backend configuration module](TASK-02-backend-configuration-module.md)                   | Not started |
| 1.6.3 | [Environments, and how a `.env` file is loaded](TASK-03-environments-and-env-file-loading.md) | Not started |
| 1.6.4 | [The frontend's environment boundary](TASK-04-frontend-environment-boundary.md)               | Not started |
| 1.6.5 | [`base` and `basename` as one input](TASK-05-base-and-basename.md)                            | Not started |
| 1.6.6 | [`.env.example` and the secrets boundary](TASK-06-env-example-and-the-secrets-boundary.md)    | Not started |
| 1.6.7 | [Verify, document and record the decision as ADR 0006](TASK-07-verify-document-and-adr.md)    | Not started |

Each task leaves the repository installable, typechecking and passing `pnpm verify`, so the tree is never broken between tasks — the same rule Stories 1.1 to 1.5 followed.

## Notes

Market-data and LLM credentials are server-side only, without exception. The browser talks to the MarketPulse backend, never directly to Alpaca or a model provider.
