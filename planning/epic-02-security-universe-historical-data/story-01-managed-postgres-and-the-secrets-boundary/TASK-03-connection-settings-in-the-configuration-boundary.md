# Task 2.1.3 — Put the connection settings through the configuration boundary

**Status:** Complete — 2026-09-04
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

## What was done (2026-09-04)

**The shape is discrete variables and not a `DATABASE_URL`**, and the decision was
taken away rather than taken — the amendment above was right. Seven variables join
`CONFIG_VARIABLES`, taking it from five to twelve:

| Variable            | Default       | Why it is not part of a URL                       |
| ------------------- | ------------- | ------------------------------------------------- |
| `DATABASE_HOST`     | `127.0.0.1`   |                                                   |
| `DATABASE_PORT`     | `5432`        |                                                   |
| `DATABASE_NAME`     | `marketpulse` |                                                   |
| `DATABASE_USER`     | `marketpulse` | Deployed, this is the managed identity's own name |
| `DATABASE_AUTH`     | `password`    | `password` or `entra` — the mode, **named**       |
| `DATABASE_PASSWORD` | `marketpulse` | Read only under `password`; absent under `entra`  |
| `DATABASE_SSL`      | `disable`     | `disable`, `require`, `verify-full`               |

No dependency, no lockfile change, no new `pnpm verify` step, and **nothing opens a
connection** — that is Task 2.1.4's.

### The shape, and the two alternatives rejected

A single `DATABASE_URL` assumes the credential is a string that sits inside it. Task
2.1.1 made that false: the deployed server is Entra only, password authentication
`Disabled`, **no admin user created at all**, so the deployed password field is filled
at connect time by code minting a token per connection. There is no string to put in.
A URL **plus** an auth switch was the runner-up and loses because it makes one value
mean different things depending on another; a URL locally and discrete variables
deployed is two shapes and was rejected on sight, as the amendment asked.

**`DATABASE_AUTH` names the mechanism rather than letting it be inferred**, which is
the amendment's third bullet implemented rather than restated. Inferring from whether a
password is set fails silently in both directions, and both are now startup errors.

### The two cross-variable checks, which are this module's first

1. **`DATABASE_PASSWORD` set alongside `DATABASE_AUTH=entra`.** The two readings are
   opposite — wrong mode, or a left-over variable — and guessing between them produces
   an authentication error nobody can attribute. It keys on the variable being
   **present in the environment**, not on the resolved value, which always exists
   because it has a default; a blank value is absent, so it does not fire, and there is
   a test for that.
2. **`DATABASE_SSL=disable` under `DATABASE_AUTH=entra`.** An access token is a bearer
   credential valid up to 24 hours, and `entra` is only ever the managed server, which
   enforces encryption anyway — so `disable` there cannot be deliberate.

Both go through the same accumulator as the readers. A run with `PORT`,
`DATABASE_PORT` and both cross-checks wrong reports **four lines**:

```
PORT must be an integer between 1 and 65535, received "abc"
DATABASE_PORT must be an integer between 1 and 65535, received "-5"
DATABASE_PASSWORD is set but DATABASE_AUTH is entra, which authenticates with a
  Microsoft Entra access token and never reads a password. …
DATABASE_SSL is disable but DATABASE_AUTH is entra, which sends an access token as
  the password. That is a bearer credential in the clear. …
```

### The credential, and a result stronger than redaction

**No credential appears in any message produced along the way.** `readInt` and
`readEnum` quote what the operator typed, which is right for a port and wrong for a
credential, so the one message naming `DATABASE_PASSWORD` names the **variable** and
never the value. Asserted rather than trusted, with a value that is deliberately **not**
the local fixture — the fixture is public, so a test written against it would pass while
leaking a real one — and the assertion was made to fail first, by having the message
interpolate the value.

**And the amendment's fourth bullet is confirmed in the direction it hoped for:
`config.ts` never holds the deployed credential at all.** The Entra token does not come
from `process.env`, so the module that promised never to log a credential turns out
never to receive one. That is structural rather than disciplined. The rule stays exactly
as written, because Story 2.7's Alpaca key is a bearer secret with no identity behind it
and **will** arrive through here; and the deployed half of the promise now belongs to
Task 2.1.4's pool, which is where the leak check should live.

### The one-definition problem, closed in the direction the amendment called right

`scripts/local-database.mjs` is now a **reader** of the built
`apps/backend/dist/config.js` — the `pair-addresses.mjs` arrangement applied to a third
service. The inverse (`config.ts` defaulting from the script) is **rejected in writing**
in that file's header rather than by omission: it inverts the dependency, putting a
shipped module that runs in production behind a development script that starts a
container. The direction taken is also the right way round on its own terms, as the
amendment says: `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` **create** a database
and `DATABASE_*` **connect** to one.

Watched rather than argued. With `DATABASE_PORT=5433` and `DATABASE_NAME=pulse` in
`apps/backend/.env` — one edit, one file:

```
  PostgreSQL 18 on 127.0.0.1:5433  database pulse  user marketpulse
docker ps → 127.0.0.1:5433->5432/tcp
pnpm ready → ✓ database  127.0.0.1:5433  PostgreSQL, no TLS offered
```

`scripts/check-ready.mjs`'s third check reads the same resolver, so its import changed
in this task rather than in a follow-up.

**The cost is stated: `pnpm db` needs a built tree**, which `pair-addresses.mjs` already
accepts. Three refusals fall out of it, two of which no brief predicted and all of which
are correct:

- unbuilt tree → `Cannot read apps/backend/dist/config.js — run \`pnpm build\` first.`
- invalid configuration → the same multi-line message the server prints, **indented per
  line**, which is Task 1.8.7's fix applied to a new reader
- **`DATABASE_AUTH=entra` → a refusal rather than an invented password.** A container is
  created with a password and a laptop has no identity to be. Task 2.1.1's asymmetry
  arriving as a command that says so

**The image major is the one value that did not move**, as instructed —
`LOCAL_DATABASE_VERSION`, still unchecked against the deployed `--version`, still in
both gap lists.

### The two facts 2.1.2 handed over

- **TLS is a variable and it differs between the environments**, which is why
  `DATABASE_SSL` exists with libpq's own vocabulary rather than a boolean. `require` is
  in the set because it is a real libpq mode and refusing to name it would not stop
  anyone reaching for it — Microsoft's own managed-identity sample connection string
  carries `Trust Server Certificate=true`, which is that mode — but it is **never** a
  default, which is Task 2.1.1's warning encoded rather than repeated.
- **The local credential is a fixture**, so it moved from a literal in the script to
  `DATABASE_PASSWORD`'s documented default, where every other default lives. The
  redaction test deliberately does not use it.

### Two shapes the configuration module gained

- **Its first nested value.** `Config.database` is a `DatabaseConfig`, because this is
  one thing with parts rather than seven settings sharing a prefix, and because Task
  2.1.4's pool takes exactly this object. It is frozen **separately** —
  `Object.freeze` is shallow — and that is asserted rather than assumed, because the
  outer assertion passes either way.
- **Its first conditionally present key.** `password` is spread in under `password` mode
  and genuinely **absent** under `entra`, which is the `exactOptionalPropertyTypes`
  idiom `config.ts`'s own interface comment named in advance as "a credential Epic 2
  brings". A pool in `entra` mode that reads it gets a compile error rather than an
  empty string.

### What was made to fail

`pnpm env:check` was made to fail **all four of its ways** before it passed: a key in
the code and not the example (`DATABASE_SSL`), a key in the example nothing reads
(`DATABASE_SSLMODE`), a drifted default (`DATABASE_PORT` 5432→5433, and again on
`DATABASE_AUTH` password→entra), and a non-`VITE_` name in the frontend example. It then
reports `12 backend variables documented, frontend example clean.`

Every startup failure mode was produced and its message read: absent, blank, malformed,
a port outside range at both ends, an unknown auth mode, an unknown TLS mode, both
cross-checks, and four bad keys at once. Three of the seven new tests were **seen to
fail** against deliberate breaks in `config.ts` — a message quoting the credential, a
`password` assigned rather than spread, and an unfrozen nested object.

### Figures

- `pnpm test` **196** (37 + **56** + 103); `apps/backend` went 49 → 56
- `pnpm verify` **exit 0 in 27.9 s with no database running** — criterion 8, and the
  chain gained no step
- `pnpm ready` **0.44 s** on the healthy triple; `pnpm db` unchanged in behaviour
- No dependency, no lockfile change, `pnpm-workspace.yaml` untouched

### One thing observed and not explained

A single `pnpm test` run reported **1 failed | 102 passed** in `apps/frontend`, and the
failure was not captured. It did not reproduce in six subsequent runs (three of
`pnpm test`, three filtered) or in `pnpm verify`. This task shipped no frontend source,
so it is recorded as an unexplained flake rather than attributed.
