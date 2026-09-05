# Task 2.1.6 — Put the credential on the platform, connect the deployed backend, and prove nothing leaked

**Status:** Not started
**Story:** [2.1 Managed Postgres Provisioning & the Secrets Boundary](STORY.md)
**Depends on:** Tasks 2.1.4, 2.1.5
**Amended:** 2026-09-04 and 2026-09-05, after Tasks 2.1.1 to 2.1.5 — see the five _Amended_ sections below

## Objective

Make the deployed backend execute a query against the managed database over TLS, through whichever credential path Task 2.1.1 chose — and establish the secrets mechanism Story 2.6 will reuse for the Alpaca key, including the leak check that proves it holds.

## Work

- **Fill the `secrets` array, or prove you did not need to.** Task 1.11.3 measured it **empty** and named the mechanism for exactly this arrival. If the decision was a password, this is where the Container App's secret and its `secretRef` on an environment variable land; if it was managed identity, this is where the role assignment and the token acquisition land and the array stays empty — which is the stronger outcome and should be stated as such. Either way, read the deployed configuration back afterwards: `deploy.yml` uses `update` and never `create`, so **the app's environment exists only in the platform**, which is already the largest unchecked-invariant instance in the project and this task makes it larger
- **Nothing new goes in `deploy.yml` as a literal.** That file holds `VITE_API_BASE_URL` as a literal and this file's own record calls that the most dangerous line in it. A database credential is not that shape, and a repository secret is a step backwards from "there is no repository secret at all" — which is the property Task 1.11.6 achieved and which this task must either keep or knowingly spend, in writing
- **Deploy, and prove the query from the deployed environment rather than from a laptop.** The story's second criterion says so explicitly. The evidence that matters is the same shape Task 1.11.5's was: something observed at both ends — the query's result visible from the deployed backend, and the connection visible on the database side — rather than a 200 that could mean anything
- **Now do the leak check, and do it by producing a failure rather than by reading code.** The criterion names four places: the repository, `dist/`, `storybook-static/`, and any log record. The first three are greps — and Story 1.6's measurement is the precedent, where a secret placed in `apps/frontend/.env` was absent from the bundle by name _and_ by value, and where `storybook-static/` was checked because `pnpm build` produces it too. The fourth is the one that needs work: **make a connection fail** — wrong password, wrong host, refused TLS — and read every record the process wrote, in both `json` and `pretty`, including the level-50 and level-60 paths, because a driver that helpfully includes the connection string in an error message is the failure this criterion exists to catch and it only appears when something goes wrong
- **Check the same thing on the platform's own log destination.** Container Apps collects stdout and stderr together — Task 1.11.3 found that a bare configuration-failure line _is_ visible there — so a credential that never reaches our log lines can still reach Log Analytics through a line we did not format. Read the actual records
- **State what the deployed backend does when the database is unreachable**, now against the real one: it must not exit, because the liveness probe restarts a replica that dies and a database blip would become a crash-loop. Produce it — the firewall is the cheapest lever — and watch what the replica does across at least one probe interval
- **Write down the rotation story even if nothing rotates today.** Story 2.6 inherits this path for a key that will eventually need replacing, and "how is this changed without a deploy, and what happens to open connections when it is" is the question that is free to answer now and expensive later

## Done when

- The credential path exists on the platform, was read back from it, and its shape (`secrets` array or managed identity) is recorded with the reason
- The deployed backend executes a query against the managed database over TLS, evidenced from the deployed environment and observed at both ends
- Greps of the repository, `dist/` and `storybook-static/` return nothing, by value and by name
- A connection failure was **produced** and every resulting log record read in both formats and at the platform's destination, with nothing sensitive in any of them
- An unreachable database does not kill the replica, watched across probe intervals
- The rotation procedure is written down
- ~~ADR 0011's "nothing deployed holds a credential" is amended wherever it is stated, rather than left standing as a false claim~~ — **reversed by Task 2.1.1: that claim stays TRUE through this story and must not be amended.** What this task must do instead is _confirm_ it, by reading the deployed `secrets` array back and finding it still empty. See below

## Notes

This is the task that makes two of Epic 1's standing claims stop being true, and the repository's own rule is that a recorded claim which has stopped being true is corrected in every place it stands — Task 1.13.6 found sixteen occurrences of one such sentence across thirteen files and read every one. Budget for that grep here rather than discovering it in Task 2.1.8.

## Amended after Task 2.1.1 (2026-09-04)

Task 2.1.1 chose **Microsoft Entra authentication only, with password authentication `Disabled` and no admin user created at all**, so several of the branches above have collapsed to one and one instruction had become actively wrong.

- **The `secrets` array stays empty, and this task's job is to prove that rather than to fill it.** The "if it was a password" branch above is dead; the "if it was managed identity" branch is the one that runs. Read the deployed configuration back and record the array as still `null`.
- **ADR 0011's "nothing deployed holds a credential" is NOT falsified by this story and must not be swept.** `EPIC.md` predicted that it expires here; it expires in **Story 2.6**, where a third-party bearer token with no Azure identity behind it genuinely has to be stored. Leaving the original "Done when" item in place would have driven a change that made a true claim false — which is the exact failure mode the repository's sweep habit exists to prevent, arriving from the other direction.
- **The leak check's target changed and it is sharper, not softer.** There is no password to grep for, but **the Entra access token is a bearer credential** — it is used verbatim as the password field, it is valid for up to 24 hours, and anything holding it can connect. So the connection-failure log reading must look for **a JWT**, not for a password: a driver that includes the credential in an error message leaks a live token. Produce the failure with an **expired or malformed token** as well as with a wrong host, because those are different code paths in every driver.
- **Token acquisition is written here, not in Task 2.1.4.** 2.1.4 is local and uses a password, so this is the first task in which the application asks for a token at all. The trap is recorded in `HOSTING.md`: Azure's own managed-identity-for-Postgres page is written for a VM and sends you to `http://169.254.169.254/...`, which **is not how a container app gets a token** — Container Apps uses `IDENTITY_ENDPOINT` with an `X-IDENTITY-HEADER` and `api-version` 2019-08-01 or later.
- **The rotation story is reframed rather than dropped.** There is nothing to rotate: the credential is minted per connection and expires in at most 24 hours. What this task should write down instead is what _replaces_ rotation — what happens to open connections when a token expires (the token is validated at connect time, so an established connection is expected to survive its own token's expiry; **verify that rather than assume it**), and what revocation looks like, which is deleting the database role or the identity rather than changing a value.
- **The `secrets`-array mechanism Story 2.6 needs is therefore NOT exercised by this story.** That is a gap this task should name explicitly rather than let Story 2.6 discover: 2.6 is the first task in the project to put a secret on the platform, and it will be doing it for the first time rather than repeating something proven here.

## Amended after Task 2.1.2 (2026-09-04)

- **The repository now contains a deliberate credential-shaped string, and the leak grep will find it.** Task 2.1.2's local database uses the fixture password `marketpulse` in `scripts/local-database.mjs`, in the repository on purpose: it authenticates a container published on loopback only, holding an empty database whose contents are re-derivable from Alpaca, and treating it as a secret would cost every clean clone a `.env` file before the database starts. **Do not report it as a finding and do not "fix" it.** What this task must not do is let its presence make the grep vacuous — the value to hunt for is a **JWT**, and the local fixture is a different thing living in a different place.
- **The local half of the leak check is now producible without the platform.** `pnpm db down` gives a refused connection and `pnpm db` restores it, so the driver's error-message behaviour — the thing this criterion exists to catch — can be characterised locally before the deployed token exists. That does not replace the deployed reading, because the credential differs, but it means arriving at the platform already knowing whether the driver quotes connection details in errors.
- **The certificate-trust question arrives here for the application, and Task 2.1.5 will have answered it for a client.** 2.1.2 measured that the local Postgres container has **no CA trust store at all** — no `ca-certificates`, a dangling `/usr/lib/ssl/cert.pem`, no `~/.postgresql/root.crt` — which is a fact about that container rather than about the backend's image, but it is the same question one layer along: whether anything has to **ship with the application** for it to verify rather than merely encrypt. If the answer is yes, that is a file in `apps/backend/Dockerfile`'s runtime stage, which is one of the three files no tool in `pnpm verify` reads.

## Amended after Task 2.1.3 (2026-09-04)

Task 2.1.3 changed what this task **sets**, sharpened what it **greps for**, and added a
hazard that did not exist before — one that turns a forgotten variable into a
crash-loop.

### Configuring the deployed backend is now six variables, and two of them check each other

`deploy.yml` uses `update` and never `create`, so the app's environment exists only in
the platform. What has to be set there is:

```
DATABASE_HOST=psql-marketpulse-dev.postgres.database.azure.com
DATABASE_PORT=5432
DATABASE_NAME=marketpulse
DATABASE_USER=marketpulse-backend
DATABASE_AUTH=entra
DATABASE_SSL=verify-full
```

and **`DATABASE_PASSWORD` must not be set at all** — the platform holds no secret, the
`secrets` array stays empty, and this task's job is still to prove that rather than to
fill it.

**The hazard, which is new and is the most important line in this amendment.** Task
2.1.3 added two cross-variable checks to `config.ts`, and both fire at **startup**:
setting `DATABASE_PASSWORD` alongside `DATABASE_AUTH=entra` is a `ConfigError`, and so
is leaving `DATABASE_SSL` at its default `disable` under `entra`. That is the right
behaviour — it is what stops an access token going out in the clear — but the
consequence on this platform is specific: **a revision that sets `DATABASE_AUTH=entra`
and forgets `DATABASE_SSL` does not connect insecurely, it fails to start**, and a
replica that fails to start on a platform whose liveness probe restarts it is
Task 1.11.7's crash-loop, which sits at `Activating` for ten minutes before saying
`ActivationFailed`. So **set all six in one `az containerapp update`**, and read the
configuration back afterwards — which this task's brief already requires for a different
reason.

The compensation is worth stating in the same breath: the failure is **loud, immediate
and names the variable**, on stdout, which Container Apps collects. It is a much better
failure than the one it replaces, which was a token on the wire.

### The leak grep's target moved file, and the fixture is not the thing to hunt

The amendment above says the fixture password lives in `scripts/local-database.mjs`.
**It does not any more.** Task 2.1.3 moved it to `DATABASE_PASSWORD`'s documented
default in **`apps/backend/.env.example`**, where every other default lives, and the
script reads it back out of the built configuration. The instruction is unchanged and
its target is a different file: **do not report `marketpulse` as a finding and do not
"fix" it** — it is a fixture authenticating a loopback-only container, in the repository
on purpose — and **do not let its presence make the grep vacuous**. The value to hunt
for is a **JWT**.

### The leak surface is narrower than it was, and Task 2.1.3 proved which part

Task 2.1.3 confirmed the amendment above's hoped-for result: **`config.ts` never
receives the deployed credential at all**, because the Entra token does not come from
`process.env`. It also asserted — with a test made to fail first — that the one
`ConfigError` message naming `DATABASE_PASSWORD` names the **variable and never the
value**, using a value deliberately unlike the public fixture.

So the configuration module is accounted for, and **this task's log reading should aim
at the two places that genuinely handle the token: the driver and the pool.** A driver
that quotes connection parameters in an error message is the failure this criterion
exists to catch, and the brief's instruction to produce a failure with an **expired or
malformed token** as well as a wrong host is the one that reaches it. Task 2.1.4 will
have characterised the driver's error-message behaviour locally with a password; this
task repeats it with a bearer token, which is a different code path in every driver and
a much worse thing to leak.

### One thing this task inherits as a seam rather than a design

Task 2.1.3 made `DATABASE_AUTH` a named mode and made `password` **structurally absent**
under `entra` — `exactOptionalPropertyTypes`, so a pool reading it without narrowing is
a compile error. Task 2.1.4 fills the `password` branch and leaves the `entra` branch
explicitly unimplemented. **This task fills that branch and nothing else**: the token
acquisition through `IDENTITY_ENDPOINT` and `X-IDENTITY-HEADER` (never
`169.254.169.254`, which is the VM recipe and the trap `HOSTING.md` records) goes behind
the same interface the password branch already satisfies. If filling it requires
reopening the pool's construction, that is Task 2.1.4 having built the seam wrongly and
is worth saying so.

## Amended after Task 2.1.4 (2026-09-05)

This task's work shrank more than any other in the story, because 2.1.4 built the
seam rather than only promising one. **What is left here is one function body and
a great deal of measurement.**

### Token acquisition is now a single named branch, and nothing else moves

`apps/backend/src/database.ts` holds `resolveCredential(config)`, which branches on
`DATABASE_AUTH`. The `password` branch returns the literal; **the `entra` branch
returns a throwing function** naming this task. So the whole of this task's code
change is replacing that function body with one that mints a token — and if
filling it requires touching `createDatabasePool`, its callers, or `index.ts`,
**that is 2.1.4 having built the seam wrongly and is worth saying so out loud**
rather than quietly widening the change.

Three properties of that seam were measured rather than assumed, and each removes
a question this task would otherwise have to answer:

- **`pg` calls the credential function once per _connection_.** Driven against a
  real database: three concurrent queries on a cold pool of three produced
  **three** calls; three more on the warm pool produced **none**. So a token is
  minted per connection and reused for that connection's life, which is exactly
  the shape Task 2.1.1's "valid up to 24 hours" needs. This task does **not** need
  to build a cache; if it adds one, the reason has to be a measured token-endpoint
  cost rather than an assumption about call frequency.
- **The function may be `async`.** `pg` accepts `() => string | Promise<string>`,
  so `IDENTITY_ENDPOINT` can be awaited inside it.
- **A throw inside it surfaces as an ordinary connection failure**, not a crash.
  Verified end to end at `DATABASE_AUTH=entra DATABASE_SSL=verify-full`: the
  server started, `/health` answered 200, the pool reported
  `database unreachable, continuing without it`, and `SIGTERM` exited 0. **So a
  token acquisition that fails on the deployed replica degrades rather than
  crash-loops, and that is already true before this task writes a line.**

### The trap this task must not walk into, restated with what it costs

`HOSTING.md` records that Azure's managed-identity-for-Postgres page is written
for a VM and sends you to `http://169.254.169.254/...`, which **is not** how a
container app gets a token — Container Apps uses `IDENTITY_ENDPOINT` with an
`X-IDENTITY-HEADER` and `api-version` 2019-08-01 or later. What 2.1.4 adds is the
**shape of the failure** if that is got wrong: the VM address does not exist
inside a container app, so the request hangs or is refused, and it hangs
**inside the credential function**, which `pg` calls inside connection
establishment, which `connectionTimeoutMillis` bounds at **5 s**. So the symptom
is a five-second stall followed by `database unreachable` — a slow, silent,
correct-looking failure rather than an error naming the metadata endpoint.
**Log what the token acquisition did**, or that afternoon is spent on the wrong
question.

### The leak check is now half-done, and 2.1.4 did the half that could be done locally

The brief says to characterise the driver's error-message behaviour by producing a
failure. **`pg` was measured and it does not quote the credential**, on both code
paths, with a distinctive value planted as the password:

| Produced failure                 | Message                                                 | Credential present? |
| -------------------------------- | ------------------------------------------------------- | ------------------- |
| Refused connection (closed port) | `connect ECONNREFUSED 127.0.0.1:5599`                   | **no**              |
| Rejected authentication          | `password authentication failed for user "marketpulse"` | **no**              |

Checked in the message **and** across the whole error object
(`JSON.stringify(e, Object.getOwnPropertyNames(e))`), which is the check that
catches a driver attaching the connection options to the error. So this task
arrives already knowing the driver's habit — which is what the previous amendment
asked for — and **the remaining work is the deployed half, which is genuinely
different**: an access token is a JWT, it travels in the same field, and it is
worth far more. Produce the failure with an **expired or malformed token** as well
as a wrong host, because those are different code paths, and re-read the platform's
own log destination as well as ours.

**One more surface 2.1.4 added that the brief does not name.** The pool's
`error` handler logs `{ err: error }` at `warn` on a dropped idle connection —
a record that did not exist when this criterion was written, that fires on a
Postgres restart or a failover, and that is therefore **the record most likely to
be written in production without anyone deliberately provoking it**. Include it in
the reading.

### Two things this task gets for free, and should use rather than rebuild

- **`application_name` is `marketpulse-backend`.** 2.1.4 set it precisely so this
  task can evidence a connection "observed at both ends": the database side is
  `select … from pg_stat_activity where application_name = 'marketpulse-backend'`
  rather than a guess about which row is ours.
- **`pingDatabase()` already is the `SELECT 1`.** The deployed proof needs a
  route or a log record carrying its result, not a second query path.

### One decision 2.1.4 took that this task should confirm rather than re-take

The pool's `ssl` comes from `DATABASE_SSL` and `verify-full` maps to
`{ rejectUnauthorized: true }` **with no `ca` supplied**, which means Node's own
bundled root store. Whether that store contains the authority Azure's certificate
chains to is a question 2.1.4 could not answer — the local container offers no TLS
at all — and **Task 2.1.5 answers it for a client**. If the answer is that a CA
file has to ship, this task is where it reaches the **application**, and that is a
file in `apps/backend/Dockerfile`'s runtime stage: one of the three files no tool
in `pnpm verify` reads.

## Amended after Task 2.1.5 (2026-09-05)

The database exists, and this task's inputs are now values rather than facts to
discover. Three items are new work, and one of them is a lever this task's own brief
names that **no longer works the way it assumes**.

### The six variables, verbatim, and they go in one `az containerapp update`

| Variable        | Value                                              |
| --------------- | -------------------------------------------------- |
| `DATABASE_HOST` | `psql-marketpulse-dev.postgres.database.azure.com` |
| `DATABASE_PORT` | `5432`                                             |
| `DATABASE_NAME` | `marketpulse`                                      |
| `DATABASE_USER` | `marketpulse-backend`                              |
| `DATABASE_AUTH` | `entra`                                            |
| `DATABASE_SSL`  | `verify-full`                                      |

`DATABASE_PASSWORD` must be **absent, not empty** — Task 2.1.3's cross-variable check
rejects a password set alongside `entra`, and Task 2.1.4's checks fire at **startup**, so
a revision that sets `DATABASE_AUTH=entra` and omits `DATABASE_SSL` does not connect
insecurely, it **fails to start**, which on a liveness-probed platform is Task 1.11.7's
crash-loop. **One `update`, all six.**

The role already exists: `pgaadauth_create_principal('marketpulse-backend', false, false)`
was run by Task 2.1.5, and `marketpulse-backend` reads `rolcanlogin: t`, `rolsuper: f`.
So the only code change remains the one 2.1.4 left: `resolveCredential`'s `entra` branch.

### `DATABASE_SSL=verify-full` needs no file, and that is measured rather than assumed

Task 2.1.4 asked whether a Node process using its bundled roots verifies Azure's
certificate with nothing shipped. **It does, and it was confirmed from inside the
deployed East US container** as well as from a laptop — the chain terminates at
`DigiCert Global Root G2`, which is among Node 24.20.0's 118 bundled roots, along with
both Microsoft 2017 roots Azure's published migration moves toward. **So there is no CA
file, and `apps/backend/Dockerfile` does not change.** That removes the contingency this
task was carrying.

### The lever for making the database unreachable has changed, and the obvious command is now refused

The brief says "the firewall is the cheapest lever". **It still is, but not by deletion.**
Task 2.1.5 set a `CanNotDelete` lock on the server and it **inherits to child resources**
— deleting a firewall rule returns `ScopeLocked`, proven. What still works under the lock
is `create` and `update`. So:

- To break connectivity, **`az postgres flexible-server firewall-rule update`** the
  `AllowAllAzureServicesAndResources` rule to an address that is not `0.0.0.0`, and
  update it back afterwards. Do not reach for `delete`.
- If a rule genuinely has to go, the sequence is `az lock delete` → delete → `az lock create`,
  which Task 2.1.5 executed once and documented.

### The leak check gains a place, and loses one

**A new place to look: terminal echo.** Task 2.1.5 passed an Entra token through
`pnpm db exec` and pnpm printed the whole command, putting a **live bearer credential
valid for 70 minutes** into the scrollback. That is not a log record and not a file, and
it is exactly the class of leak this criterion is about. Use `docker exec -e` for local
work, and count "what a command printed" among the four places.

**One place is already half-cleared**: Task 2.1.4 measured that `pg` does **not** quote
the credential on either failure path. What remains genuinely different deployed is that
the credential is a **JWT** rather than a fixture password, so the grep has a stable
shape — `eyJ` — and the token's own claims (`upn`, `oid`, `tid`) are worth grepping for
separately, because a driver or a log line could carry a decoded fragment rather than the
token itself.

### Two smaller facts that save a detour

- **The deployed image already contains `pg`**, verified by exec on revision `0000058`.
- **A connection from the container costs ~150–250 ms** (TCP+TLS measured at 79–111 ms,
  plus startup and auth), against a 5-second `connectionTimeoutMillis` — so a slow first
  connect is not the expected failure and should be investigated rather than tolerated.
