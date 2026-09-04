# Task 2.1.3 — Put the connection settings through the configuration boundary

**Status:** Not started
**Story:** [2.1 Managed Postgres Provisioning & the Secrets Boundary](STORY.md)
**Depends on:** Tasks 2.1.1, 2.1.2
**Amended:** 2026-09-04, after Task 2.1.1 — see _Amended after Task 2.1.1_ below

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

## Amended after Task 2.1.1 (2026-09-04)

The brief above says "note that Task 2.1.1's authentication decision may have already forced it". **It has, and the answer is not the one a `DATABASE_URL` assumes.**

- **There is no password in the deployed environment at all.** Task 2.1.1 chose Microsoft Entra authentication with password authentication `Disabled` and **no admin user created**. The deployed credential is an access token, minted per connection, valid up to 24 hours. Locally there _is_ a password, because a local container has no identity.
- **So the settings are not one string that means the same thing in both places.** A single `DATABASE_URL` carrying a password works locally and cannot express the deployed case, where the password field is filled at connect time by code rather than by configuration. The shapes actually available are therefore: **discrete variables** (host, port, database, user, and a credential that is present locally and absent deployed); a `DATABASE_URL` **plus** a separate auth-mode switch; or a URL locally and discrete variables deployed, which is two shapes and should be rejected on sight. Take one and record it — but the decision is now between narrower options than the brief describes.
- **Whatever is chosen has to make "which credential mechanism" explicit rather than inferred.** Inferring it from whether a password variable is set is the shape that fails silently: a deployment that forgets the variable would fall through to the identity path and produce a confusing auth error, and a laptop that has a stale variable set would try a password against a server that refuses passwords. A named mode is cheaper than the failure.
- **The "password is a value this module must never render" bullet still applies and its subject changed.** The thing that must never reach a log is now **the token**, which is a live bearer credential for up to 24 hours. It does not come from `process.env`, so `config.ts` may never hold it at all — which, if true, is a **stronger** result than redaction and should be recorded as such: the module that promised not to log a credential turns out never to receive one.
- **The matched-pair hazard is unchanged and now has a second half.** A defaulted local address that a deployment forgets to override is the `CORS_ORIGIN` shape already recorded. The new half is that a deployment which forgets the **mode** does not fail at startup at all — it fails at first connection, which is Task 2.1.4's "what happens when the database is absent" path and is exactly the 3am failure this bullet exists to prevent.
