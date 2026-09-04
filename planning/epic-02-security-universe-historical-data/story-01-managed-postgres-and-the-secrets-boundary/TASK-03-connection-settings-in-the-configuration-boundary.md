# Task 2.1.3 — Put the connection settings through the configuration boundary

**Status:** Not started
**Story:** [2.1 Managed Postgres Provisioning & the Secrets Boundary](STORY.md)
**Depends on:** Tasks 2.1.1, 2.1.2

## Objective

Add the database's connection settings to `apps/backend/src/config.ts` — the only file in the workspace that reads `process.env` — so that a missing or malformed one fails at startup naming the variable, and `pnpm env:check` covers them. No connection is opened in this task.

## Work

- **Decide the shape first: one `DATABASE_URL`, or a set of discrete variables.** A URL is one value the platform can hold, is what every Postgres tool already accepts, and puts the password inside a string that is very easy to log by accident. Discrete variables are more keys to keep in step across `CONFIG_VARIABLES`, `.env.example` and the platform, and they make the password a field that can be handled separately from everything that is not secret. Take one and write down which, with the reason — and note that Task 2.1.1's authentication decision may have already forced it, because an Entra token is not a password and does not sit in a URL the same way
- **Follow the module's existing shape rather than inventing a second one.** There are `readString`, `readInt` and `readEnum`, a `present()` treatment of blank-means-absent, an accumulator that reports **every** bad key rather than the first, and a `ConfigError` that is thrown and never exited — `index.ts` owns the exit. A new reader is fine if the type genuinely needs one; a new error path is not
- **Extend `CONFIG_VARIABLES` and both `.env.example` files in the same change**, because `pnpm env:check` compares them — key sets both ways _and_ the documented default of every optional variable, which is the check a grep cannot do and the one that rots first. Get the defaults right at the source: a wrong default here is a plausible wrong number in a file people copy
- **Decide what is required and what has a default, and be honest that "required in production" is not expressible here.** ADR 0007 §1 records that; what replaces it is a documented default `env:check` keeps honest. A database URL defaulting to a local development address is the matched-pair shape `CORS_ORIGIN`'s `http://localhost:5173` already has, and it has the same hazard — a deployment that never sets it silently points at something that is not there — so the failure that produces has to be a startup error rather than a first-query error at 3am
- **The password is a value this module reads and must never render.** `config.ts` already refuses to log the resolved configuration and records why: `redact` was rejected as a denylist whose failure mode is the key nobody added. That decision now has its first real test, and it should be re-read rather than cited — the `ConfigError` messages themselves are the place to check, because an error saying "`DATABASE_URL` is malformed: <the value>" is a credential in a log written by the one file that promised not to write one
- **Make every failure mode happen.** Absent when required, blank, malformed, a port outside range if there is one, and two bad keys at once so the accumulator's multi-line message is seen — `scripts/check-ready.mjs` already had one cosmetic defect found exactly this way. And make `pnpm env:check` fail all four of its ways against the new variables before it passes

## Done when

- The variable shape is decided and recorded with its reason
- `config.ts` reads the settings, throws `ConfigError` naming the variable, and still never logs a resolved value
- `CONFIG_VARIABLES` and both `.env.example` files agree, and `pnpm env:check` was **made to fail** on each of them before passing
- Every startup failure mode was produced and its message read
- No credential appears in any error message produced along the way
- `pnpm verify` passes with no database running

## Notes

This is the story's fifth acceptance criterion in its own task because it is the one piece that can be finished, checked and made to fail with no server anywhere — which is also the property `pnpm verify` has and must keep.
