# Story 1.6 — Configuration & Environment Handling

**Status:** Not started
**Epic:** [Epic 1 — Application Foundation](../EPIC.md)
**Depends on:** Stories 1.2, 1.3
**Epic scope covered:** shared configuration, environment handling

## Description

Typed, validated configuration for both packages, with a clear boundary between server-only secrets and values safe to ship to the browser. Epic 2 introduces Alpaca API credentials and Epic 10 introduces LLM provider credentials, so this boundary must be correct before either arrives.

## Acceptance criteria

- Configuration is parsed and validated at startup, with a declared schema
- The server refuses to start on missing or invalid configuration and names the offending key
- Distinct configuration for development, test and production
- `.env.example` documents every variable, with descriptions and safe placeholder values
- Only explicitly whitelisted variables reach the frontend bundle; secrets cannot leak by accident
- Real secrets are gitignored and never committed

## Toolchain constraints from Story 1.1

- `.gitignore` already carries `.env`, `.env.*` and `!.env.example`, so the "real secrets are gitignored" criterion is wiring that exists — verify it rather than adding it, and check the negation actually works before relying on it
- **The root-only tooling rule does not apply here.** A schema library (Zod, Valibot) is imported by application code, not invoked as a command, so it is declared in the packages that import it — the same reason `@types/node` stays in `apps/backend`. Shared tooling lives at the root; packages declare what they import
- If configuration types are shared between the apps they belong in `packages/shared`, which is consumed as **built output** — so the config schema must be built before either app can typecheck against it. `tsc -b` orders that itself; nothing else has to know
- `apps/frontend` sets `types: []` specifically so `process` does not typecheck in browser code. That is a structural half of this story's whitelisting criterion and it is already in place: an accidental `process.env.SECRET` in the frontend is a compile error today. Do not weaken it to make a config helper convenient

## Notes

Market-data and LLM credentials are server-side only, without exception. The browser talks to the MarketPulse backend, never directly to Alpaca or a model provider.
