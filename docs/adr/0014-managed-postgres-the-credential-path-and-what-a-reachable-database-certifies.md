# ADR 0014 — Managed Postgres, the credential path, and what a reachable database certifies

**Status:** Accepted
**Date:** 2026-09-05
**Delivered by:** Epic 2, Story 2.1 (Tasks 2.1.1–2.1.8)

## Context

Epic 1 shipped an application with no data. Every route it serves is answerable
from `process.uptime()`, and ADR 0011 rested two live arguments on that: the
deployed environment is public because **nothing deployed holds a credential**,
and the backend's entire surface is `GET /health`. ADR 0006 drew a secrets
boundary and said plainly that nothing had ever tested it.

This story provisions the database Epic 2 writes its first row into. It is the
work with the highest ratio of irreversible decisions to shipped behaviour in the
project so far: the whole story ends at `SELECT 1`, and several of the choices
behind it cannot be revised without rebuilding the server.

**Three framings this story was handed turned out to be wrong, and correcting
them is most of what the record is for.**

- **The brief named four irreversible creation decisions and was wrong in both
  directions.** Exactly one of the four is genuinely irreversible (networking
  mode). Version is forward-only, region is irreversible in practice, and **tier
  is fully reversible**. Meanwhile **storage type, backup redundancy and the data
  encryption key are irreversible and were not on the list at all**, and
  authentication — expected to be the expensive one — turned out to be the _most_
  reversible decision in the set, since `--microsoft-entra-auth` and
  `--password-auth` are both arguments of `az postgres flexible-server update`.
- **The epic predicted that ADR 0011's "nothing deployed holds a credential"
  expires here. It does not.** The authentication decision means the platform ends
  this story holding no secret at all; the `secrets` array was read back from the
  live app after the database was wired, and again after the diagnostic route
  deployed, and is `null` both times. That claim expires in **Story 2.6**.
- **The credential path does not transfer to Story 2.6.** An Alpaca key is a
  bearer secret from a party with no Azure identity. What transfers is the
  _identity_, not the mechanism, and the `secrets`-array path this project has
  never used is Story 2.6's largest unknown rather than something proven here.

## Decisions

### 1. Region is not a decision this project gets to make, and re-reading beats citing

**North Central US**, and it was chosen for us twice in two days.

Task 1.11.1 recorded East US and Epic 2 inherited it. East US returns **zero**
Postgres editions and zero versions for this subscription, with the mechanism
named in the platform's own feature list as `OfferRestricted: Enabled`. Task
2.1.1 therefore chose East US 2 — and **one day later Task 2.1.5 found East US 2
`OfferRestricted` too**, under a different message (`Subscriptions are restricted
from provisioning in this region` against East US's `Provisioning is restricted in
this region`).

So the database is in North Central US, the backend and registry are in East US,
the frontend is in East US 2, and **this subscription spans three regions and
chose none of them**. Moving the backend to join the database was rejected: a
Container Apps environment cannot change region, so it would take the FQDN,
`VITE_API_BASE_URL`, `CORS_ORIGIN`, a frontend rebuild and both published
addresses with it.

**The transferable rule, which earned itself inside 24 hours: re-read
`az postgres flexible-server list-skus` immediately before creating, and never
cite a document — including this one.** Region availability here is a property of
the subscription and the offer, not of the service.

The cost of accepting it is co-location and nothing else: all three price meters
in North Central US are identical to East US 2. **That identity is true of that
pair and false as a general claim** — US regional variation reaches 29% — which
is a correction to Task 2.1.1's own wording. The measured penalty is a
cross-region hop of **19.1–27.8 ms** TCP and **79.2–111.3 ms** TCP+TLS from the
deployed replica.

### 2. Authentication is Microsoft Entra only, and the platform holds no secret

Password authentication is `Disabled`, Entra is `Enabled`, and **no admin user was
created at all** — `administratorLogin` reads `null`, read back from the live
server. The backend authenticates as its own system-assigned managed identity,
minting an access token used verbatim as the PostgreSQL password.

This is the shape Epic 1 chose twice already (`acrPull` on a managed identity,
OIDC for the deploy) and the payoff is the same: **there is no secret to leak or
rotate.** Creating no admin user also disposes of a sixth irreversible decision,
since `--admin-user` "once set, cannot be changed".

**"Rotation" is the wrong word and what replaces it is worth stating.** Nothing is
stored, so nothing rotates. The token is re-minted **per connection** — measured,
not assumed: three concurrent queries against a cold pool of three produce three
credential calls and three more against the warm pool produce none, which is why
the credential stays a _function_ in `pg`'s options rather than a value.
`IDENTITY_HEADER` is rotated by the platform and is therefore read fresh on every
acquisition rather than cached at module load. Revocation is
`DROP ROLE marketpulse-backend` or removing the identity, effective at the next
connection.

**What it costs the connection path**, measured from inside the replica:

- The **first** token mint of a replica's life is **866–889 ms**, 85% of a
  1,023 ms first connection.
- Every mint after that is a **cached read from the platform's own sidecar** —
  461 / 19 / 76 / 5 / 94 / 5 ms across six calls with an identical `expires_on`,
  **24.0 hours** ahead. There is deliberately **no cache in our code**, because
  the thing that would justify one is already caching.
- So a _new connection in steady state_ costs ~**200 ms**, and a pooled query
  ~**20 ms**. Both re-measured deployed at close.

**`apps/backend/src/entra-token.ts` is the second file in the workspace that reads
`process.env`, and it exists to protect that invariant rather than to break it.**
`IDENTITY_HEADER` is itself a bearer credential — it is what authorises a caller
to mint a database token — so routing it through `config.ts` would put a live
credential on the frozen `Config` object, in the module whose own comment records
that its no-credential-in-a-log guarantee is _structural_. Neither identity
variable is in `CONFIG_VARIABLES` or `.env.example`, because `pnpm env:check`
would then demand they be documented as ours.

**The trap worth knowing before anyone copies a documentation page**: Azure's own
managed-identity-for-Postgres guidance is written for a virtual machine and sends
you to `http://169.254.169.254/…`. That address does not appear anywhere inside a
Container App. `IDENTITY_ENDPOINT` reads `http://localhost:12356/…`, a local
sidecar, with an `X-IDENTITY-HEADER`. The cost of copying the VM recipe would have
been a **hang** inside connection establishment rather than an error.

### 3. Create this server through ARM, not through `az postgres flexible-server create`

**The CLI cannot create an Entra-only server**, and its error message describes the
tool rather than the platform: its own documented flag combination fails with
`MissingRequiredParameter: 'AdministratorLoginPassword'`. The identical body sent
to ARM as a `PUT` was **accepted**, and the created server reads back
`administratorLogin: null`.

This is in the ADR rather than only in `HOSTING.md` because it is the reproduction
recipe, and because believing the error message would have bought the immutable
`--admin-user` that decision 2 exists to avoid.

### 4. Networking is public access with the `0.0.0.0` rule, and the alternative was disproved rather than declined

Public access, with `AllowAllAzureServicesAndResources` plus one developer IP.
This is **the one genuine one-way door** in the story.

"Allow this one IP" was **disproved by measurement**: the deployed backend reports
**321 distinct outbound IPv4 addresses across 58 `/16` prefixes**, identical
across two readings three minutes apart, and the environment's `staticIp` is not
among them because it is the _inbound_ address.

The `0.0.0.0` rule is characterised in Microsoft's own words rather than ours — it
"configures the firewall to allow all connections from Azure, **including
connections from the subscriptions of other customers**". Private access is the
correct answer and it is the _same project_ as a stable outbound IP: re-creating
the Container Apps environment, which is the whole reversal-cost list spent on an
empty database. Two permanent consequences are recorded: **every restore is public
forever**, and the server's own outbound access "can't be restricted".

What makes this tolerable rather than reckless is decision 2 — there is no
password for a reachable endpoint to be brute-forced against, and the one role
that can connect is a service principal that only this container's identity can
present.

### 5. TLS is `verify-full` with no CA file, and it was made to fail before being believed

`DATABASE_SSL=verify-full` maps to `{ rejectUnauthorized: true }` with **no `ca`**.
It connects from the laptop _and from inside the deployed East US container_,
because the chain runs `… <- Microsoft TLS RSA Root G2 <- DigiCert Global Root G2`
and Node 24.20.0's 118 bundled roots hold that root plus both Microsoft 2017 roots
Azure's published migration moves toward. **So no CA file goes into
`apps/backend/Dockerfile`.**

Made to fail in both directions rather than trusted: an unrelated CA is refused
(`self-signed certificate in certificate chain`), and dialling by IP is refused
(`Hostname/IP does not match certificate's altnames`). So chain **and** host name
are both checked.

**The server requires encryption rather than merely offering it** — a plaintext
attempt is refused in 538 ms with `no pg_hba.conf entry … no encryption`, SQLSTATE
`28000`. Locally the same attempt fails in 1.1–3.6 ms with `The server does not
support SSL connections`. Both are immediate named refusals rather than hangs.

`verify-ca` is deliberately absent from the vocabulary: it verifies a chain
without verifying who is on the other end of it, which is a state nobody in this
project has a use for.

**One property that does not transfer**: `libpq` cannot do `verify-full` where Node
can. The local Postgres container has no CA store, so `psql` there refuses it while
the backend's Node image verifies the identical certificate with nothing shipped.
"No CA file in the Dockerfile" is a property of the **runtime**, not of the
certificate.

### 6. Storage, backups and the alerts that replace autogrow

**32 GiB, because the free offer's ceiling and the service's floor are the same
number** — so the real decision was **autogrow, which is `Disabled`**. The CLI's
`--storage-size` default is 128, four times the offer, and autogrow's smallest
step is a 2× jump to 64 GiB at $7.36/month that cannot be undone.

**Usable capacity is ~22.5 GiB, not the 32 provisioned**, and not the ~27 Task
2.1.1 predicted: read-only mode triggers under 5 GiB free, and an _empty_ server
already reports `storage_used` of **3.740 GiB** of filesystem overhead. Against
Story 2.7's ~1.18 GB/year of minute bars at an assumed ~120 bytes/row that is
~20 years of headroom, or ~4 at five times the estimate — **a prediction for
Story 2.7 to measure rather than a substitute for measuring**.

**`storage.iops` is 120, not the 640 `list-skus` advertises** for `Standard_B1ms`.
The SKU's ceiling and the provisioned disk's entitlement are different numbers,
and Story 2.7 should size against 120.

Backups are **7 days with geo-redundancy off**, because included backup storage is
100% of provisioned storage, retention is the one knob that moves freely in both
directions, and geo-redundancy is creation-only for data that is entirely
re-derivable from Alpaca.

Autogrow being off means running out of space is a real outcome, so **what replaces
it is an alert**: `psql-storage-80pct`, plus `psql-cpu-credits-low`, on a new
action group `ag-marketpulse-ops` — none of which existed, because this
subscription had **no action groups and no metric alerts at all**.

**An idle Burstable server banks almost nothing.** `cpu_credits_remaining` sits at
its **30** cap while `cpu_percent` reads 10.5–12.1% against a 10% baseline, so
Story 2.7's backfill starts with roughly what it can earn rather than a reservoir.

### 7. The version is 18, pinned in two places that nothing compares

PostgreSQL **18** — supported to 14-Nov-2030 against 17's 2029, GA on Azure for
eleven months, and the extension question does not constrain it (`timescaledb` is
2.24.0 on 15 through 18 alike). An in-place major upgrade carries **no fee**; its
costs are downtime, a precheck that can block, and no automated revert.

The local development database pins **the major only** — `postgres:18`, from
`LOCAL_DATABASE_VERSION` — because Azure patches the minor underneath us and a pin
it cannot honour is a pin that lies. Both report **18.6**, compared by hand for the
first time in Task 2.1.5.

**Nothing checks that those two numbers still agree**, and a check would need Azure
credentials that `pnpm verify` deliberately does not have — so building one would
fork the definition of "verified" in exactly the way ADR 0010's founding rule
exists to prevent. It is recorded as an unchecked invariant, with the symptom class
"works locally, wrong in production", which is the whole thing the pin was for.

### 8. The local development database is a container, and it costs a clean clone Docker

`compose.yaml` plus `scripts/local-database.mjs`, behind `pnpm db`. **Docker
becomes a prerequisite it was not before** — Epic 1 needed it only for
`pnpm image`, which nobody runs on a first day.

What softens that is that the prerequisite is **narrow**, and the narrowness is
stated in the same paragraph that introduces it: `pnpm install`, `pnpm verify`,
`pnpm dev` and `pnpm e2e` all still run without Docker, and the script reports its
absence as exactly that. A native install is the standing alternative for anyone
who cannot run Docker — cheaper at run time, worse at reproducibility, and it puts
the engine version outside this repository's control the day after we pinned one.
**Pointing developers at the deployed database is rejected on principle**, recorded
because somebody will suggest it during the first hour Docker is broken.

**The database is deliberately outside `pnpm dev`.** It is a fourth process with a
different lifecycle: starting it per `pnpm dev` means stopping it per Ctrl-C, which
throws away the data you were mid-way through debugging.

**The credential deliberately does not match the deployed one, and that is not a
wart.** The deployed server is Entra-only, which a laptop structurally cannot be,
so "match the deployed environment" applies to the **engine version** and not to
the credential. The password is a fixture in the repository on purpose,
authenticating a container published on **loopback only**
(`127.0.0.1:5432:5432`, never the bare form that puts a database on every network
the machine has joined) holding an **empty** database — no seeding, because one
invented here is one Story 2.2 unpicks.

Two behaviours worth keeping. **The PostgreSQL 18 image moved its declared volume
and `PGDATA`** to `/var/lib/postgresql`, so every pre-18 snippet's
`/var/lib/postgresql/data` mount is wrong — and it does not silently persist
nothing, it **refuses to start at all** with a twenty-line message naming the
mount, the reason and the fix. The good kind of trap. And **a bare
`docker compose up` refuses by construction**: every interpolated value is required
with no default (`${VAR:?message}`), so the file cannot hold a second copy of the
port and exits 1 naming `pnpm db`. The first draft used `:-default`, which is worse
than it looks — a blank port makes the publish spec `127.0.0.1::5432`, which is
**valid** and binds a random one.

### 9. Seven discrete `DATABASE_*` variables, not a `DATABASE_URL`

`DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`,
`DATABASE_AUTH`, `DATABASE_PASSWORD`, `DATABASE_SSL` — taking `CONFIG_VARIABLES`
from five to **twelve**.

**The shape decision was taken away rather than taken.** Decision 2 means the
deployed password field is filled at connect time by code minting a token, so
there is no string to put inside a URL in the first place.

**`DATABASE_AUTH` names the mechanism rather than letting it be inferred**, and
that is what turns both predicted silent failures into startup errors: a deployment
that forgot the password variable falling through to the identity path, and a
laptop with a stale password sending it to a server that refuses passwords.

**Two cross-variable checks, the first in this module.** A password set alongside
`entra` is rejected, because the two readings of that are opposite and guessing
produces an auth error nobody can attribute. And `DATABASE_SSL=disable` under
`entra` is rejected, because an access token is a bearer credential and that would
put it on the wire in the clear. They go through the same accumulator as the
readers, so a run with four things wrong reports four lines.

**`Config` gained its first nested value and its first conditionally present key**:
`password` is spread in under `password` mode and genuinely **absent** under
`entra`, which is the `exactOptionalPropertyTypes` idiom the module's own comment
predicted. A pool that reads the credential without narrowing is a compile error.

**The one-definition problem is closed in the direction that keeps shipped code
free of development concerns.** `scripts/local-database.mjs` is a **reader** of the
built `dist/config.js`, so `DATABASE_PORT=5433` in `apps/backend/.env` moves the
published container port, the database name, the client and `pnpm ready`'s probe in
one edit. The direction is right because `POSTGRES_USER`/`PASSWORD`/`DB` **create**
a database while `DATABASE_*` **connect** to one; the inverse would put a shipped
module that runs in production behind a development script that starts a container.
The stated cost is that `pnpm db` now needs a built tree, and says so.

**The strongest result here is one nobody planned: `config.ts` never holds the
deployed credential at all.** The Entra token does not come from `process.env`, so
the module that promised not to log a credential turns out never to receive one.
The promise stays as written, because Story 2.6's Alpaca key genuinely will arrive
through there.

### 10. `pg` 8.23.0, and its two most dangerous defaults are absences

The driver is **`pg` 8.23.0** plus `@types/pg`: **+14 store entries, +832 KB,
+116 lockfile lines**. `postgres` (porsager) is markedly cheaper — +1 entry,
+380 KB, +9 lockfile lines, and it ships its own types — and was rejected on the
argument that took `@fastify/cors` over a hand-rolled hook and jsdom over
happy-dom: it is one package doing what thirteen do, and the failure mode of a
re-implementation is a divergence that presents as an application bug.

The hard functional criterion — a credential that may be a function returning a
promise — was checked **empirically rather than from the types**, and both
candidates pass. That check is what produced the per-connection finding in
decision 2.

**Both dangerous defaults are absences rather than wrong values, which is why a
green run cannot see either.**

- **`pg.Pool` is an `EventEmitter`, and an `EventEmitter` with no `error` listener
  throws.** Without `pool.on("error")` a dropped idle connection becomes an
  `uncaughtException`, which `index.ts` turns into a level-60 record and
  `process.exit(1)` — which, on a platform whose liveness probe restarts the
  replica, is **a crash-loop caused by a Postgres restart we had nothing to do
  with**. Produced rather than reasoned about, by terminating the process's own
  backend from a second connection: with no handler the process died; with one, the
  message is logged at `warn`, the dead client is discarded, and **the next query
  succeeds**.
- **`connectionTimeoutMillis` defaults to `0`, meaning wait forever.** Measured
  against a socket that accepts and never answers, `pool.query()` was still pending
  after four seconds. At 5,000 ms it fails in 2,005 ms naming the timeout. This is
  the third door into a trap `check-ready.mjs` already met twice, and it is worse
  inside a startup path than inside a check script.

`new Pool()` is **lazy and opens no socket**, asserted by reading `totalCount` —
which is what lets `database.test.ts` sit in the **fast** suite. Eleven tests about
configuration, no build and no socket, so ADR 0009's property survives.

### 11. The pool is created by `index.ts`, probed after `listen()`, and closed inside the drain

**It deliberately does not enter `buildServer()`.** Nothing serves data yet, so
putting it in `ServerOptions` would be a dependency declared for a route that does
not exist, and every test building a server would have to supply or fake one. The
reversal trigger is **Story 2.8's first route that needs data**, at which point
ADR 0002 §3's warning about the first `await` in the factory applies.

**The startup probe runs once, after `listen()`, and never stops the process.**
After rather than before, so a slow or absent database cannot delay the socket the
platform's startup probe is waiting on. At `warn` rather than `error`, because the
server is still healthy by `/health`'s own definition. And **never an exit**,
because that is the crash-loop again — and a Burstable server can make _itself_
unreachable by exhausting its CPU credits, so this is a state the database can
enter on its own under Story 2.7's backfill.

**The pool closes after `app.close()` resolves and inside the 5-second ceiling.**
With an idle pool the drain is 0–1 ms in-process and 25–30 ms wall, so the pool
costs the shutdown nothing measurable. `pool.end()` **does** wait for a checked-out
client — measured, resolving 311.3 ms after it was called, the instant the client
was released — so a route holding one is a slow shutdown the ceiling turns into a
level-50 record.

**Proving that ordering produced the story's most transferable lesson, and it took
three attempts.** An ordering assertion needs a marker on **each side** of the step
it is about, _and the marker has to travel with the step_. The first version
bounded the close by `signal received` and `shutdown complete` and stayed green
when the close was moved to the wrong side of `app.close()`, because the whole
drain happens between those two. A second `debug` record at the moment the HTTP
side finishes fixed that — and then the break **passed again**, because the record
was a separate statement further down that did not move with the close. Only when
`app.log.debug("database pool closed")` was placed immediately after
`closeDatabasePool()` did the break fail.

Those two lines are the **first records this application has ever emitted below
`info`**, which fills the half of `LOG_LEVEL` ADR 0007 recorded as empty.

### 12. `/health` says nothing about the database, and reachability is `GET /diagnostics/database`

**`/health` is unchanged byte for byte** — three fields, the same schema, the same
`satisfies` guard, the same `HealthResponse`, `isHealthResponse()` and
`BackendStatus`. Database reachability is a **second route**, in the directory ADR
0002 created for a second route that took eleven stories to arrive.

Three shapes were considered and the middle one is rejected for a reason specific
to this deployment rather than the one everyone will assume.

- **A field on `/health`** is rejected on **measured cost**, not principle. All
  three platform probes point at `/health` — startup 2 s/3 s/30, readiness
  10 s/5 s/3, liveness 30 s/5 s/3, read off the live app. The pool holds **zero
  connections at rest**, so a check there pays a new connection nearly every time,
  on a route hit every 2 s at startup, every 10 s by readiness, every 30 s by
  liveness and once per 30 s per **visible browser tab**. It would also widen a
  wire contract with **five** readers for a field with no consumer.
- **A readiness surface** — the shape the story itself guessed at — is rejected
  because this app is **`Single` revision mode at `minReplicas: 1`**. There is one
  replica behind the ingress, so an unready replica is not a degraded service, it
  is **no** service: a readiness probe failing on a database that none of the
  current routes uses would take a working application entirely off the air.
- **Nothing at all** is rejected on a gap that is real rather than anticipated.
  Before this route, reachability was reported in exactly one place — a level-40
  record written at **startup** — so a running replica whose database went away
  afterwards reported nothing anywhere and could not, because nothing queried it
  once the startup connection had aged out. A laptop cannot answer the question
  either: it tests a laptop's network and its own credential, not the East US
  replica → North Central US path as `marketpulse-backend` with a sidecar-minted
  token. **The endpoint is the only instrument standing in that position.**

**The route always answers 200, including when the database is down.** The
question was answered correctly; a 503 would need the `SERVICE_UNAVAILABLE` code
`database.ts` reserves for Story 2.8's first route that actually needs data.

**The body says _whether_, the log says _why_, and `x-request-id` joins them.** No
error message, host, port or SQLSTATE reaches the wire, because the ingress is
public and unauthenticated. **What holds that shut is the schema rather than the
handler** — adding the error message to the body left the leak test **green**,
because `fast-json-stringify` strips a property the schema does not declare, and it
only went red once the field was declared in the schema too. So a green run there
is **not** evidence that a handler could not leak.

**`BackendStatus` deliberately does not move**, and that is a decision watched in a
browser rather than an omission: with the database fully down the `Backend service`
region reads `healthy`. That is correct — `degraded` means _something answered and
it was not a readable health report_, and a backend whose database is down is
answering perfectly about itself, while nothing a user can do today needs the
database. The reversal trigger is Story 2.8's first route that serves data.

### 13. The bound is a TTL plus single flight, and a shorter TTL is cheaper

One query per `DIAGNOSTIC_CACHE_TTL_MS` (5 s) and **one in-flight query whatever
the caller count**. Measured: 300 sequential requests over 1.29 s → **1** query;
25 concurrent on a cold cache → **1**; 2,853 requests over 60 s → **12**, exactly
60 ÷ 5.

**Single flight matters more than the TTL.** Without it, 25 simultaneous requests
to a public unauthenticated endpoint on a cold pool are 25 connections and 25 token
mints, against 35 usable connections of which Azure's own sessions already hold
7–10, with no PgBouncer on this tier.

**The counter-intuitive half, and the thing a future reader will otherwise
"simplify": a SHORTER bound is CHEAPER.** Cost steps at `POOL_IDLE_TIMEOUT_MS`
rather than scaling with frequency. Below it, a check is a pooled ~20 ms round trip
minting no token; at or above it, every check opens a connection. So 10 s under
sustained polling would cost 6 cold connections a minute where 5 s costs 12 warm
round trips and none. `POOL_IDLE_TIMEOUT_MS` now **restates `pg`'s own default
explicitly** so a minor version cannot move it underneath that, and **a test
asserts the ordering** — the third coupled pair `pnpm verify` cannot see, after
`API_TIMEOUT_MS`/`HEALTH_POLL_INTERVAL_MS` and
`TOKEN_TIMEOUT_MS`/`CONNECT_TIMEOUT_MS`.

**There is deliberately no background timer.** That is uptime monitoring, which ADR
0013 already declined, and it would be standing billable traffic against the
Consumption plan's idle condition to answer a question nobody is asking. **A
failure is cached exactly as a success is**, or an unreachable database becomes an
_unbounded_ query rate at the moment the ceiling matters most.

## Rejected, with reasons and reversal triggers

| Rejected                                      | Why                                                                                                           | Reversal trigger                                          |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `DATABASE_URL` as one variable                | Entra-only means there is no password to put in it; discrete variables let `DATABASE_AUTH` name the mechanism | A driver or tool that only accepts a URL                  |
| `postgres` (porsager) over `pg`               | Cheaper, but a re-implementation's divergences present as application bugs                                    | `pg` maintenance stalling, or a measured need for its API |
| `@azure/identity`                             | **32 packages and 46 MB** for one HTTP GET with one header and no cryptography                                | Needing a second credential type, or token caching we own |
| Private networking / a stable outbound IP     | Same project: re-creating the Container Apps environment, spent on an empty database                          | Real data with a real confidentiality requirement         |
| Autogrow                                      | Smallest step is an irreversible 2× to 64 GiB at $7.36/mo; the alert is the cheaper instrument                | Storage genuinely approaching the 80% alert               |
| Geo-redundant backups                         | Creation-only, for data entirely re-derivable from Alpaca                                                     | Data that is not re-derivable                             |
| A database field on `/health`                 | Cost on four probe paths plus a browser poll; widens a five-reader contract for no consumer                   | A route whose failure a user can see                      |
| A readiness probe on the database             | `Single` mode at `minReplicas: 1` means unready = **no** service                                              | Multiple replicas, or multiple-revision mode              |
| A background reachability timer               | Uptime monitoring, already declined; standing billable traffic against the idle condition                     | Something that actually pages a human                     |
| Seeding the local database                    | An invented schema is one Story 2.2 unpicks                                                                   | Story 2.2's migrations                                    |
| A native local Postgres                       | Puts the engine version outside this repository's control the day after we pinned one                         | Docker being unavailable to a contributor                 |
| A check comparing local and deployed versions | Needs Azure credentials `pnpm verify` deliberately does not have — would fork "verified"                      | A second environment worth diffing                        |

## Consequences worth stating separately

**The `secrets`-array mechanism is exercised by nothing.** This is the story's
strongest outcome and Story 2.6's largest unknown at the same time, and naming it
here is the point: 2.6 will be placing a bearer secret on the platform for the
first time, not repeating something proven.

**Whether an open connection outlives its own access token is unverified, and
saying so is the answer.** A token lasts 24 hours and `pg` closes an idle client
after 10 seconds, so the case is **structurally unreachable in this configuration**
rather than untested through neglect. Epic 3's long-lived writer is the first thing
that makes it reachable.

**An operator's own Entra token cannot authenticate as `marketpulse-backend`** —
_"Service principals cannot generate AAD_AUTH_TOKENTYPE_APP_USER tokens for role"_
— because `pgaadauth_create_principal(…, false, false)` created a service-principal
role. A leaked operator credential cannot impersonate the backend, and vice versa.

**The platform-only configuration set roughly doubled, and the sharpest new entry
is not a setting.** Beside the Container App's eleven environment variables, three
probes, revision mode and replica count, the platform now holds the database's two
firewall rules, its Entra administrator, an action group and two metric alerts, a
`CanNotDelete` lock — and the **`marketpulse-backend` role**, which is not a value
that can be re-read and diffed but a **one-off SQL statement that must be re-run by
hand if the server is ever re-created**. `HOSTING.md` is its only copy, and that,
rather than the data, is what the lock protects: everything in the database is
re-derivable from Alpaca; the bootstrap is not.

**The dangerous pair among those variables**: `DATABASE_AUTH=entra` with
`DATABASE_SSL=verify-full`. The cross-variable check fires at **startup**, so a
revision that sets the first and forgets the second does not connect insecurely —
it **fails to start**, which on a liveness-probed platform is ADR 0011's ten-minute
`Activating` crawl. That is the right failure and it names the variable, and it
means **every change to this app's database configuration is one
`az containerapp update` or none**.

**Two traps carried out of provisioning.** The Entra administrator's 65-character
UPN is **silently truncated to 63** by Postgres's `NAMEDATALEN`, losing its final
two characters, though connecting with the full UPN still works. And **`pnpm db
exec` echoes its arguments**, so passing a token that way printed a live bearer
credential into the terminal — use `docker exec -e`, and count **terminal echo** as
a place a credential lands.

**`pnpm ready`'s third check reports and does not gate**, and its stated condition
has still not fired. It speaks the protocol rather than settling for a TCP connect
— an eight-byte SSLRequest, no credentials, no driver, no dependency — because a
bare listener reads `NO_RESPONSE` and an HTTP server on 5432 reads `NOT_POSTGRES`,
and a connect check would have called both of them up. Its limits are written down:
it does not prove the named database exists, that the credentials work, or that the
server is ours. What it does report that is genuinely useful is **`no TLS
offered`**, the real local-versus-deployed difference. The trigger for it becoming
gating is a **condition rather than a task number** — _the first check in
`pnpm verify` or `pnpm e2e` that fails without a database_ — which is Story 2.2's
migrations or Story 2.8's routes.

**The cost question is still unanswered, and its refusal is now two shapes at
once.** `az consumption usage list` returns two shaped records with every cost field
the string `'None'`; the Cost Management query API answers `429`, reproduced four
times. The subscription's resources are nearly two days old, so Task 1.11.8's "the
environment is too young" diagnosis no longer applies. **Whether continuous probing
breaks the Consumption plan's under-1,000-bytes-per-second idle condition therefore
remains open**, owned by Epic 3 — which is the first thing for which the answer
changes a decision rather than a number.

## What a reachable database certifies — and what it does not

**A green `pnpm verify` certifies nothing about the database at all.** The chain
runs with nothing listening, and it still does: exit 0 in 25.37 s with no database
running, and `pnpm test:process` passes **14 tests, the same count, with a database
and without one, with no `skipIf`** — because the one test that cares asks the
question itself, sending the same eight-byte SSLRequest `check-ready.mjs` sends.
A skipped test reports green, which this repository has recorded twice as the worst
failure available.

**A green startup says the database answered `SELECT 1` once, after the server was
already listening.** It does not say the pool will still connect a minute later,
and it deliberately gates nothing.

**A `reachable: true` from `GET /diagnostics/database` certifies exactly this**:
that within the last `ageMs` milliseconds — **up to five seconds ago, and the body
tells you which** — one connection from _this replica_ to the configured host
completed a TLS handshake, presented a token this identity minted, and got an
answer to `SELECT 1`. It says nothing about any other replica, about whether a
_second_ connection would succeed, about the connection ceiling, about whether any
table exists, or about whether the credential will still be accepted in a minute.

**A 200 from `/health` says nothing whatsoever about the database, on purpose**,
and that is the property most likely to be "fixed" by someone who has not read
decision 12.

**Neither route is affected by a `pnpm verify` that never ran.** The gap list is
unchanged in kind and grew by one file: `compose.yaml` joins the fifth kind —
Prettier reads it, **nothing validates its schema** — so a misspelled Compose key, a
healthcheck testing the wrong thing, or a volume mounted at a path the image does
not use are all green locally.

**Three couplings are invisible to the chain, and two of them are now checked by
tests**: `TOKEN_TIMEOUT_MS < CONNECT_TIMEOUT_MS` and
`DIAGNOSTIC_CACHE_TTL_MS < POOL_IDLE_TIMEOUT_MS`. The third — the local Postgres
major matching the deployed one — is **not** checked and structurally cannot be
here.

**What the failing path costs is the number to carry, and it is not the healthy
one.** Against an unroutable host every check costs the **full 5,000 ms
`connectionTimeoutMillis`**, three orders of magnitude more than a locally refused
connection's 1–3 ms. And because that equals the cache TTL, **the cache contributes
nothing on that failure mode** — `ageMs` read 0 on every deployed poll after the
first — leaving single flight as the only thing bounding concurrent callers.

## Measured

### Acceptance criteria, re-run at close (2026-09-05)

| #   | Criterion                                                        | Evidence                                                                                                                                                            |
| --- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Instance exists, four decisions recorded with reasons            | Read back live: North Central US, `Standard_B1ms` Burstable, v18, public access, 32 GiB autogrow `Disabled`, 7-day backups geo off, `administratorLogin` **`null`** |
| 2   | Deployed backend connects over TLS, evidence from the deployment | `GET /diagnostics/database` on revisions `0000065`/`0000067`: `reachable: true`, **193.09 / 220.19 ms** cold and **17.89 / 22.34 / 21.34 ms** warm                  |
| 3   | Clean clone reaches a local database via `README.md`             | `pnpm db` → `pnpm ready` prints `✓ database 127.0.0.1:5432 PostgreSQL, no TLS offered`                                                                              |
| 4   | No credential in repo, `dist/`, `storybook-static/` or a log     | Re-confirmed deployed on the new route: twelve level-40 records carry `Connection terminated due to connection timeout` and **no token**                            |
| 5   | Settings in `CONFIG_VARIABLES`, both `.env.example` agree        | `pnpm env:check` exit 0, **12 backend variables documented**                                                                                                        |
| 6   | Pool closes during shutdown; `test:process` passes both ways     | **14 passed** with a database and **14 passed** without, same count, no `skipIf`                                                                                    |
| 7   | Cost answered or its refusal characterised; budget re-read       | Refused in **two shapes at once**; budget `$20`, 50/80/100%, `currentSpend` `0.0` — **left at $20, deliberately**                                                   |
| 8   | `pnpm verify` passes, and with no database running               | **exit 0 in 25.34 s** with none; **26.82 s** with one                                                                                                               |

### Figures

| Reading                                      | Figure                                                                                                                             |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm verify`, no database                   | **25.34 s** — build 2.39 / lint 4.56 / `format:check` 5.24 / `stories` 0.28 / `env:check` 0.27 / `test` 3.53 / `test:process` 8.95 |
| `pnpm verify`, with a database               | **25.44 s**                                                                                                                        |
| `pnpm test`                                  | **229** — 37 shared, **89** backend, 103 frontend, across 22 files                                                                 |
| `pnpm test:process`                          | **14**, both ways                                                                                                                  |
| Frontend artefact                            | **361,664 B over four files**, reproducing Task 1.13.4 to the byte (`b98aeaa5…`, `134d5dd8…`, `07983678…`)                         |
| Install-script sweep                         | **`esbuild@0.28.2` and nothing else**                                                                                              |
| Deployed diagnostic, healthy                 | cold **193.09 / 220.19 ms**, warm **17.89 / 22.34 / 21.34 ms**                                                                     |
| Deployed diagnostic, unroutable host         | **5,000.58–5,005.02 ms** across twelve polls, `ageMs` **0** on every one after the first                                           |
| `/health` through that break                 | **200 on all twelve**, `uptimeSeconds` **90.6 → 222.1**, never resetting, `restartCount` **0**                                     |
| Connection ceiling                           | **36** opened before the 37th was refused (`53300`); Azure's own sessions hold **7–10**                                            |
| Backend → database round trip                | **19.1–27.8 ms** TCP, **79.2–111.3 ms** TCP+TLS                                                                                    |
| Estimate, re-read from the Retail Prices API | replica **$4.21** idle / **$14.04** active, ACR **$5.00** → **$9.21 / $19.04**; database **$0.00** in-offer, **$16.09** out        |

## Related

- ADR 0006 — configuration and the secrets boundary; §2 is amended here, and this
  is the first thing that tested the boundary
- ADR 0007 — logging and the error contract; the `debug` level's lower half is no
  longer empty
- ADR 0009 — the test conventions; `database.test.ts` is in the fast suite only
  because `new Pool()` is lazy
- ADR 0010 — what the tick certifies; the reason no deployed-configuration check
  can be a `verify` step
- ADR 0011 — deploying both halves; its "nothing deployed holds a credential" is
  **confirmed** by this story and expires in Story 2.6
- ADR 0012 — client-side status; why `BackendStatus` deliberately does not move
- `HOSTING.md`, _The database — the creation decisions_, _the local development
  database_, and _closing the story_ — the full record, including the
  `marketpulse-backend` role bootstrap that exists in no other file
