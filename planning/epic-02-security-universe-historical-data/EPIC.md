# Epic 2 — Security Universe & Historical Market Data

**Status:** Not started
**Sequence:** 2 of 15 — follows Epic 1 (Application Foundation)
**Spec references:** PRODUCT_SPEC.md §6 (initial market universe), §7.1 (Alpaca), §8.3 (Security Explorer), §30 (storage)

## Goal

Create the basic financial-market domain and allow users to explore historical data.

## Outcome

A user can select one of the tracked securities and inspect its historical price and volume data.

## Scope

- Security domain model
- Initial ~100-security universe
- ETF/sector metadata
- Market-data provider abstraction
- Managed Postgres provisioning — **tier and networking mode are irreversible**
- Database schema and migration mechanism
- Alpaca credential on the platform — **the first secret this system holds**
- Alpaca historical-data integration
- Historical market-data persistence/cache
- Security search/select
- Basic price chart
- Basic volume chart
- Time-window selection
- Market-data provenance display

## Exit criteria

A user can search for a security such as NVDA, open it, and inspect recent historical price and volume data.

## What Epic 1 hands this epic (2026-09-04)

Three scope items above were **added after Epic 1 closed**, because Epic 1 named
them and deliberately deferred them here rather than building ahead of the
iteration that needs them. None of this was visible in this file before.

**The database does not exist.** "Historical market-data persistence/cache"
reads as though one is already there; it is not. Task 1.11.1 chose **Azure
Database for PostgreSQL flexible server** and provisioned nothing — the full
record is
`../epic-01-application-foundation/story-11-deployment-pipeline-and-dev-environment/HOSTING.md`.
Two of its decisions **cannot be changed after creation** and so must be taken
before the first `az` command rather than discovered:

- **The tier stays B1MS.** The subscription is a new Azure free account, whose
  offer is 12 months of Burstable B1MS at up to 750 hours a month plus 32 GB of
  storage and 32 GB of backup. Anything else leaves the offer.
- **Networking mode is fixed at creation.** Public access with a firewall rule
  is the cheap path; private access via VNet integration is the correct one and
  costs the Container Apps environment a custom VNet, which is not something to
  retrofit under a running environment.

**The free-offer clock is already running.** It started at signup — the first
resource in the subscription is stamped `2026-09-03T05:32:32Z` — so every month
before this epic lands spends part of the twelve.

**Schema migrations have no owner anywhere in the roadmap.** Epic 12 carries
"Investigation persistence", but a migration mechanism is needed the moment this
epic writes its first row, so it is scoped here.

**This epic is the first thing that puts a credential on the platform**, and two
recorded properties stop being free at that moment. ADR 0011 states that nothing
deployed holds a credential; ADR 0006 draws the secrets boundary on the
assumption that nothing has yet tested it. Today the Container App's `secrets`
array is **empty** — measured in Task 1.11.3, which also identified the
mechanism for exactly this key and used none of it. Note the deployed
environment is **public**, accepted in Epic 1 on the stated grounds that nothing
deployed holds a credential and the backend's entire surface is `GET /health`;
that argument expires here.

Also worth reading before starting: `apps/frontend/.env.example` exists in the
shape it does specifically because it is the file open in front of whoever is
about to put an Alpaca key in `apps/frontend/.env`. A `VITE_` prefix is a
boundary against accidents, not a permission — a prefixed credential is a string
literal in a file every visitor downloads.

**And the cost question Epic 1 could not answer is owned here.** Both billing
APIs refused the subscription, then returned `[]` at exit 0 and `429`; the
whole environment was under six hours old against cost data that lags 8–24
hours. The estimate stands at **$9.21/month** at the idle rate and **$19.04** at
the active rate, against a **$20** budget with alerts at 50/80/100%. Epic 3
re-takes it, for the reason recorded in that epic's own file.
