# Task 2.1.3 — Put the connection settings through the configuration boundary

**Status:** Not started
**Story:** [2.1 Managed Postgres Provisioning & the Secrets Boundary](STORY.md)
**Depends on:** Tasks 2.1.1, 2.1.2
**Amended:** 2026-09-04, after Tasks 2.1.1 and 2.1.2 — see the two _Amended_ sections below

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

## Amended after Task 2.1.2 (2026-09-04)

Task 2.1.2 deliberately did **not** narrow the shape decision above — it prints the local database's connection as parts rather than a URL and adds nothing to `CONFIG_VARIABLES`, precisely so a `DATABASE_URL` with a password inside it was not chosen by accident. That decision is still fully open. What 2.1.2 did do is create a second definition of the same values, and that is this task's new problem.

### The one-definition problem, which is this task's real work and is not in the brief above

`scripts/local-database.mjs` now holds `LOCAL_DATABASE` — host, port, user, password, database and the image major — as **the** definition of where the local database is. It has two readers today: `compose.yaml`, which interpolates every one of them as a **required** variable with no default so it cannot drift, and `scripts/check-ready.mjs`, which dials the address.

The moment this task puts connection settings into `CONFIG_VARIABLES` and `apps/backend/.env.example`, there are **two** places that say where the local database is, and they can disagree silently — a `.env.example` default of `5432` against a `LOCAL_DATABASE.port` somebody moved to `5433` is a backend dialling a port nothing is on, with `pnpm ready` cheerfully reporting the database up because it read the other copy. **This is exactly the fork `scripts/pair-addresses.mjs` exists to prevent**, and this repository has refused it twice: the frontend's origin is read from `CORS_ORIGIN` rather than a second copy of `5173`, and the backend's port is read from the built `dist/config.js` rather than written down again.

So this task owes a decision, and the two shapes are:

- **The configuration module is the definition and `local-database.mjs` reads it**, the way `pair-addresses.mjs` reads `dist/config.js`. This is the arrangement the repository already has and it makes `pnpm db` depend on a **built** tree — which `pair-addresses.mjs` already accepts, reporting "run `pnpm build` first" rather than a resolver stack. Note that a container's `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` are what **creates** the database while config's are what **connects** to it, so this direction makes the compose file's inputs derived from the application's, which is the right way round.
- **`local-database.mjs` stays the definition and supplies `config.ts`'s defaults**, which inverts the dependency and makes a shipped module read a script.

The first is almost certainly right and the second should be rejected in writing rather than by omission. Either way `scripts/check-ready.mjs`'s third check must end up reading **one** of them, and today it reads `LOCAL_DATABASE`; whichever way this lands, that import is part of this task's change and not a follow-up.

**The image major is the one value that does not move**, because nothing in the application's configuration has any business naming a Postgres version. It stays in `local-database.mjs`, still unchecked against the deployed `--version`, still in both gap lists.

### Two facts 2.1.2 measured that are inputs to the shape decision

- **The local server offers no TLS and the managed one enforces it.** `pnpm ready` reports `no TLS offered` against the container, and Task 2.1.1 recorded that "connection encryption is enforced for your network traffic" on the managed server, with the further requirement that the client **verify** rather than merely encrypt. So a TLS/verification setting is part of the connection surface and it genuinely differs between the two environments — which is a second axis beside the credential, and the shape chosen here has to carry both without becoming a switch per environment.
- **The local credential is real and is a fixture.** `marketpulse` / `marketpulse` / `marketpulse`, in the repository on purpose, authenticating a container published on loopback only. So the "password is a value this module must never render" bullet has a **local** subject as well as the deployed token — and the local one is deliberately public, which means a `ConfigError` quoting it is untidy rather than dangerous. Do not let that make the redaction test vacuous: the test that matters is the deployed one, and the honest way to run it locally is with a value that is not the fixture.
