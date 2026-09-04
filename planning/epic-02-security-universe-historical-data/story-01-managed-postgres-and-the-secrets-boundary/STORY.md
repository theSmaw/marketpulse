# Story 2.1 — Managed Postgres Provisioning & the Secrets Boundary

**Status:** Not started
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
  `apps/backend/.env.example` and therefore `pnpm env:check`
- A connection pool with a lifecycle: opened once, closed inside Story 1.2's drain, well
  inside the 5-second shutdown ceiling and the platform's 30-second grace
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

1. **Networking mode.** Public access with a firewall rule is cheap and retrofittable to
   nothing; private access via VNet integration is correct and costs the Container Apps
   environment a custom VNet, which cannot be retrofitted under the running environment.
   **This is the single most expensive decision in the epic to get wrong.** Note the
   trap that makes the cheap path less cheap than it looks: a Consumption-plan Container
   App's outbound IPs are **not stable**, so "allow this IP" is not available and the
   realistic public-path rule is "allow Azure services", which is a materially wider
   allowlist than it sounds
2. **Authentication: password, or Microsoft Entra with the container's managed
   identity.** The second is the shape Epic 1 already chose twice — `acrPull` on a managed
   identity, and OIDC for the deploy — and its payoff is the same: **no secret exists to
   leak or rotate**. Its cost is token acquisition in the connection path and a harder
   local-development story
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
5. **Storage size and backup retention**, both inside the 32 GB / 32 GB offer, against
   Story 2.7's ingestion arithmetic

## Acceptance criteria

1. A managed Postgres instance exists, with tier, networking mode, region and version
   recorded **with the reason for each**, in the shape `HOSTING.md` uses
2. The deployed backend connects to it over TLS and can execute a trivial query; the
   evidence is taken from the deployed environment rather than a laptop
3. A developer with a clean clone can reach a working local database by following
   `README.md`, and `pnpm ready` tells them whether it is up
4. No credential appears in the repository, in `dist/`, in `storybook-static/`, or in any
   log record — the last one checked by producing a connection failure and reading what
   was written
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

## What this story hands forward

A reachable database, a credential path that Story 2.6 reuses rather than reinvents, and
a written record of two decisions nobody can revisit.

## Conventions

The Story 1.1 conventions bind this story unchanged — `pnpm verify` is the acceptance
command, six verbs per package, root-only shared tooling, ESM with `.js` import
extensions, and `packages/shared` consumed as built output. They are recorded once in
`docs/adr/0001-*` and `CLAUDE.md` rather than duplicated here, deliberately: Epic 1
finished with twelve near-identical copies of that block and a task spent reconciling
them.
