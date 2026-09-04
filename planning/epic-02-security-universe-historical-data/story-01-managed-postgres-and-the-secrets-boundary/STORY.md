# Story 2.1 — Managed Postgres Provisioning & the Secrets Boundary

**Status:** In progress — Tasks 2.1.1 to 2.1.4 complete
**Epic:** [Epic 2 — Security Universe & Historical Market Data](../EPIC.md)
**Depends on:** Epic 1 (Stories 1.6, 1.11)
**Epic scope covered:** Managed Postgres provisioning; Alpaca credential on the platform (the _mechanism_ half)

## Description

Provision the database this epic writes its first row into, and — because doing so
requires one — establish how this system holds a credential at all.

Nothing here is a feature. It is the story that spends the two decisions Epic 1
recorded as **irreversible after creation**, and it is the story where two of Epic 1's
standing claims stop being true: ADR 0011's "nothing deployed holds a credential", and
ADR 0006's secrets boundary, which has never been tested because there was nothing to
test it with.

**One correction to this epic's own framing, and it changes the sequencing.** The epic
says the Alpaca key is "the first secret this system holds". It is not — **the database
credential is**, and it arrives here, five stories earlier. That is the argument for
building the secrets mechanism in this story rather than in Story 2.6: the mechanism is
needed either way, and Story 2.6 should be placing a second key through a proven path
rather than inventing one under time pressure.

## Why it sits here in the sequence

Everything else in this epic writes to, reads from, or migrates a database. Provisioning
is also the only work in the epic with decisions that cannot be revised later, and the
free-offer clock started at signup (`2026-09-03T05:32:32Z`), so deferring it spends the
twelve months without using them.

## Scope

- The four irreversible or expensive-to-change creation decisions: **tier**, **networking
  mode**, **region**, **Postgres major version**
- Provisioning the server, the database, and its firewall or private-networking
  configuration
- How the backend authenticates to it, and where that credential lives — the Container
  App `secrets` array, which is **empty today** (measured in Task 1.11.3)
- Configuration surface: the connection settings joining `CONFIG_VARIABLES`,
  `apps/backend/.env.example` and therefore `pnpm env:check` — **done in Task 2.1.3**, as
  seven discrete `DATABASE_*` variables rather than a `DATABASE_URL`, taking the table from
  five to twelve
- A connection pool with a lifecycle: opened once, closed inside Story 1.2's drain, well
  inside the 5-second shutdown ceiling and the platform's 30-second grace — **done in
  Task 2.1.4**, `pg` 8.23.0, closing after `app.close()` resolves and inside the ceiling,
  at a cost of 0–1 ms in-process
- TLS, and what happens when it is not available
- A **local development database**, and what that costs a clean clone following
  `README.md`
- Re-taking the cost question Epic 1 could not answer, now that the environment is old
  enough for Azure's 8–24 hour billing lag to have passed

## Out of scope, and who owns it

- Tables, columns and migrations — **Story 2.2**. This story provisions an empty database
  and proves the backend can reach it
- The Alpaca key itself — **Story 2.6**, through the mechanism this story establishes
- Query layer, ORM or typed access — **Story 2.2**
- Anything about market data — this story ends at `SELECT 1`

## Open decisions — settle with the user before the first `az` command

**Decision 3 was settled by [Task 2.1.2](TASK-02-the-local-development-database.md) on 2026-09-04: a PostgreSQL 18 container through Docker Compose, behind `pnpm db`, outside `pnpm dev`, reported by `pnpm ready` as a third check that does not gate.** Only **decision 4** now remains open, owned by Task 2.1.7.

**Decisions 1, 2 and 5 were settled by [Task 2.1.1](TASK-01-choose-the-creation-decisions.md) on 2026-09-04** and are recorded in
`HOSTING.md` under _The database — the creation decisions_. They are left below with their
original wording, struck where the answer changed them, because the reasoning they asked for
is what the record has to contain. ~~**Decisions 3 and 4 remain open**, owned by Tasks 2.1.2
and 2.1.7 as the table says.~~ **Decision 4 remains open, owned by Task 2.1.7.**

**A fourth answer nobody asked for: the region.** East US is `OfferRestricted` for this
subscription and offers no Postgres at all, so the database is in **East US 2** — the second
resource this subscription has been unable to place in East US.

1. **Settled: public access with the `0.0.0.0` "allow Azure services" rule.** The `321` outbound IPs measured on the deployed backend make a single-IP rule impossible, and private access means re-creating the Container Apps environment and with it the backend FQDN. ~~Public access with a firewall rule is cheap and retrofittable to
   nothing; private access via VNet integration is correct and costs the Container Apps
   environment a custom VNet, which cannot be retrofitted under the running environment.
   **This is the single most expensive decision in the epic to get wrong.** Note the
   trap that makes the cheap path less cheap than it looks: a Consumption-plan Container
   App's outbound IPs are **not stable**, so "allow this IP" is not available and the
   realistic public-path rule is "allow Azure services", which is a materially wider
   allowlist than it sounds~~
2. **Settled: Microsoft Entra only, password authentication `Disabled`, no admin user created — the platform holds no secret. And it is the most _reversible_ decision here, not the most expensive: both flags exist on `az postgres flexible-server update`.** ~~Authentication: password, or Microsoft Entra with the container's managed
   identity. The second is the shape Epic 1 already chose twice — `acrPull` on a managed
   identity, and OIDC for the deploy — and its payoff is the same: **no secret exists to
   leak or rotate**. Its cost is token acquisition in the connection path and a harder
   local-development story~~ — all three of which held on measurement
3. **The local development database.** A container via Docker (a new prerequisite for
   every clean clone, where Epic 1 needs Docker only for `pnpm image`), a native install,
   or pointing developers at the deployed database (rejected on principle — it is
   production). Whatever is chosen becomes part of `pnpm dev`, `pnpm ready` and the
   README's first-run narrative
4. **Does `/health` report the database?** Beware the Epic 1 property: the liveness probe
   hits `/health` and a failing liveness probe **kills the replica**, so a database blip
   would become a crash-loop. The likely answer is that `/health` stays a cheap liveness
   answer and database reachability is a separate readiness or diagnostic surface — but
   it is a decision, and Story 1.12's `BackendStatus` vocabulary has a `degraded` state
   that was designed for exactly this kind of arrival
5. **Settled: 32 GiB with autogrow `Disabled` (the floor and the offer's ceiling are the same number, so the real decision was autogrow), 7-day backups, geo-redundancy off.** ~~Storage size and backup retention~~, both inside the 32 GB / 32 GB offer, against Story 2.7's ingestion arithmetic

## Acceptance criteria

1. A managed Postgres instance exists, with tier, networking mode, region and version
   recorded **with the reason for each**, in the shape `HOSTING.md` uses
2. The deployed backend connects to it over TLS and can execute a trivial query; the
   evidence is taken from the deployed environment rather than a laptop
3. A developer with a clean clone can reach a working local database by following
   `README.md`, and `pnpm ready` tells them whether it is up
4. No credential appears in the repository, in `dist/`, in `storybook-static/`, or in any
   log record — the last one checked by producing a connection failure and reading what
   was written. **Amended 2026-09-04: the credential to hunt for is an Entra access token,
   not a password.** Task 2.1.1's decision means no password exists deployed, which makes
   the repository and bundle greps close to vacuous and the **log** half sharper — a token
   is a live bearer credential for up to 24 hours, so a driver that puts it into a
   connection error leaks a working key
5. Connection settings are in `CONFIG_VARIABLES` and both `.env.example` files agree, so
   `pnpm env:check` covers them; a missing or malformed setting fails at startup with a
   message naming the variable
6. The pool closes during shutdown: `SIGTERM` still drains and exits 0, and the
   `test:process` suite still passes with a database configured and with one absent
7. The cost question is answered with a real figure, or its refusal is characterised
   again; the $20 budget and its 50/80/100% alerts are re-read and adjusted if the
   database changes the arithmetic
8. `pnpm verify` passes, and it still passes **with no database running** — the chain has
   never needed a server and must not start now

## Tasks

Tackled in order. The story is complete when all eight are done.

2.1.1 decides and provisions nothing, deliberately — the same shape as Tasks 1.10.1 and 1.11.1, so the first failed provisioning attempt in this repository's history has one possible cause, and because this story's two one-way doors are both in it. 2.1.2 to 2.1.4 are entirely local and come **before** the managed instance exists, for Task 1.11.2's reason: a platform failing on something that was never correct is the most expensive failure to read, and a connection pool that has never opened a connection is exactly that. 2.1.5 is the deploy half with no application in front of it. 2.1.6 is the only task where both halves are unknown at once, which is why it comes after both, and it is where the secrets mechanism and its leak check land. 2.1.7 answers the `/health` question with something running, because the liveness-probe trap cannot be reasoned about safely. 2.1.8 closes the story and takes the cost question Epic 1 handed forward.

| #     | Task                                                                                                                                         | Status      |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 2.1.1 | [Choose the four irreversible decisions, and the credential shape, provisioning nothing](TASK-01-choose-the-creation-decisions.md)           | Complete    |
| 2.1.2 | [Give a clean clone a local database, and say what it costs](TASK-02-the-local-development-database.md)                                      | Complete    |
| 2.1.3 | [Put the connection settings through the configuration boundary](TASK-03-connection-settings-in-the-configuration-boundary.md)               | Complete    |
| 2.1.4 | [The connection pool, `SELECT 1`, and closing inside the drain](TASK-04-the-pool-and-its-lifecycle.md)                                       | Complete    |
| 2.1.5 | [Provision the managed instance, and reach it over TLS from outside the application](TASK-05-provision-the-managed-instance.md)              | Not started |
| 2.1.6 | [Put the credential on the platform, connect the deployed backend, and prove nothing leaked](TASK-06-the-credential-on-the-platform.md)      | Not started |
| 2.1.7 | [Decide what `/health` says about the database, and where reachability is actually reported](TASK-07-what-health-says-about-the-database.md) | Not started |
| 2.1.8 | [Re-take the cost question, verify from a clean clone, document, and record ADR 0014](TASK-08-cost-verify-document-and-adr.md)               | Not started |

**Tasks 2.1.5 to 2.1.8 were each amended again on 2026-09-05 after Task 2.1.4 landed**, and
for the fourth round running **no task was added, deleted or re-ordered**. This round
shrinks 2.1.6 the most: the credential seam it was promised is built, so its code change
is **one function body** — `resolveCredential`'s `entra` branch, which today returns a
throwing function naming that task — and if filling it means touching anything else,
that is 2.1.4 having built the seam wrongly. Three properties of the seam were measured
rather than assumed, and each removes a question 2.1.6 would have had to answer: `pg`
calls the credential **once per connection** (three concurrent queries on a cold pool of
three gave three calls; three more on a warm pool gave none), the function may be
`async`, and a throw inside it degrades rather than crash-loops — verified end to end.
Its leak check is also half-done, because `pg` was measured **not** to quote the
credential on either failure path, so what remains is the genuinely different deployed
half with a JWT. **2.1.5** gains a question it must now answer for the _application_
rather than for a client: `verify-full` maps to `rejectUnauthorized: true` with **no
`ca`**, so the real question is whether a Node process using its bundled roots verifies
Azure's certificate with nothing shipped — and if not, that is a file in the Dockerfile's
runtime stage. **2.1.7** gains the number that decides its cost question: the 5-second
connection deadline, which a health check can only pay by causing a **new** connection.
**2.1.8** gains a recorded claim this story falsified outright — `LOG_LEVEL=debug` no
longer "shows nothing `info` does not", since the drain writes two `debug` records — with
its two live occurrences already corrected and its one historical occurrence deliberately
left, which is a worked example of Task 1.13.6's read-every-occurrence rule.

**Tasks 2.1.4 to 2.1.8 were each amended again on 2026-09-04 after Task 2.1.3 landed**, and
for the third round running **no task was added, deleted or re-ordered** — the
local-before-deployed sequence has now survived three tasks intact. This round is unusual in
that it **shrinks** more work than it adds. **2.1.4** loses two decisions: the pool now takes
a `DatabaseConfig` rather than deciding where the database is, and the `pnpm ready` reversal
trigger it was told to re-take was already corrected in 2.1.2's shipped code, so it confirms
rather than decides — what it gains is a credential seam that is half-built, with
`DATABASE_AUTH` as a discriminator and `password` **structurally absent** under `entra`, so a
pool that reads the credential without narrowing is a compile error. **2.1.6** gains the
round's one genuine hazard: the two new cross-variable checks fire at **startup**, so a
deployed revision setting `DATABASE_AUTH=entra` and forgetting `DATABASE_SSL` does not connect
insecurely — it **fails to start**, which on a liveness-probed platform is Task 1.11.7's
crash-loop, so all six variables go in one `az containerapp update`. **2.1.5** gains a named
set of values to produce rather than facts to record, and a question to answer: `verify-ca` is
deliberately absent from the shipped TLS vocabulary. **2.1.8** gains the sweep target this
repository has got wrong most often — `pnpm test` is **196** where every Epic 1 convention
block says **189**, in ~30 occurrences across 25 files of which only the present-tense ones
are live claims. **2.1.7** is barely touched, which is itself worth recording.

**Tasks 2.1.3 to 2.1.8 were each amended again on 2026-09-04 after Task 2.1.2 landed**, and
again **no task was added, deleted or re-ordered** — the local-before-deployed sequence was
executed once and worked. Four of the six amendments are new work rather than context:
**2.1.3** inherits a one-definition problem, because `scripts/local-database.mjs` now defines
where the local database is and putting connection settings into `CONFIG_VARIABLES` creates a
second copy of exactly the kind `pair-addresses.mjs` exists to prevent; **2.1.4** owns
_re-taking_ a decision 2.1.2 made about it rather than executing it, because 2.1.2's stated
reversal trigger named a task and a condition that are not the same day; **2.1.5**'s recorded
`psql`-is-not-installed prerequisite is answered by the local container, which ships psql 18.6
and has working DNS — but has **no CA trust store at all**, measured, so it can encrypt and
cannot verify, which lands squarely on that task's hardest bullet; and **2.1.6** must not
report the local fixture password as a leak.

**Tasks 2.1.2 to 2.1.8 were each amended on 2026-09-04 after Task 2.1.1 landed**, and every
one carries an _Amended after Task 2.1.1_ section saying what changed. **No task was added,
deleted or re-ordered** — the local-before-deployed sequence survived the decisions intact.
Two of the amendments are corrections rather than additions, and they matter most: Tasks
2.1.6 and 2.1.8 were both instructed to sweep ADR 0011's "nothing deployed holds a
credential" as a claim this story falsifies, and **that claim stays true through this
story** — so following the original wording would have made a true claim false.

**The five open decisions above are not spread across the eight tasks evenly.** Four of them — networking mode, authentication, storage and backup — are settled together in **2.1.1**, because they are creation arguments and a creation argument decided late is a server rebuilt. The local-database decision is **2.1.2**'s, because its real cost is what a clean clone has to install and that cannot be judged apart from doing it. The `/health` decision is **2.1.7**'s and deliberately last, because it is the only one whose answer depends on watching a real replica survive a real outage.

## What this story hands forward

A reachable database, ~~a credential path that Story 2.6 reuses rather than reinvents~~ and
a written record of ~~two decisions~~ the decisions nobody can revisit.

**Both halves of that sentence were corrected by Task 2.1.1 (2026-09-04).** The credential
path **does not transfer**: an Alpaca key is a bearer secret from a party with no Azure
identity, so Story 2.6 is genuinely the first task in this project to put a secret on the
platform, and it will be doing it for the first time rather than repeating something proven
here. What transfers is the **identity**, not the mechanism. And there are not two
irreversible decisions but **one** — networking mode — with version forward-only, region
irreversible in practice, tier and authentication both fully reversible, and **three**
irreversible decisions this story never named at all: storage type, backup redundancy and
the data encryption key.

## Conventions

The Story 1.1 conventions bind this story unchanged — `pnpm verify` is the acceptance
command, six verbs per package, root-only shared tooling, ESM with `.js` import
extensions, and `packages/shared` consumed as built output. They are recorded once in
`docs/adr/0001-*` and `CLAUDE.md` rather than duplicated here, deliberately: Epic 1
finished with twelve near-identical copies of that block and a task spent reconciling
them.
