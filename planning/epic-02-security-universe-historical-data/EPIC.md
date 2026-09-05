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
- Alpaca credential on the platform — ~~**the first secret this system holds**~~ **the second: the database credential in Story 2.1 arrives five stories earlier, so the mechanism is built there** (2026-09-04)
- Alpaca historical-data integration
- Historical market-data persistence — **a record of what was observed, not a cache** (settled 2026-09-05 in Story 2.7's open decision 1; §36's "displaying data through 10:42:17" is only writable if it was stored, and §24's replay reconstructs what the system knew and did rather than only what the market did)
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

**The database does not exist.** The scope line above — which read "Historical
market-data persistence/cache" when this was written, and was reworded on
2026-09-05 — reads as though one is already there; it is not. Task 1.11.1 chose **Azure
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

~~**This epic is the first thing that puts a credential on the platform**, and two
recorded properties stop being free at that moment. ADR 0011 states that nothing
deployed holds a credential; ADR 0006 draws the secrets boundary on the
assumption that nothing has yet tested it.~~ **Corrected 2026-09-05 by Task 2.1.8,
and the correction is that this prediction was wrong about the story rather than
about the epic.** Story 2.1 wired the deployed backend to a managed Postgres and
**put no secret on the platform at all** — Task 2.1.1 chose Microsoft Entra
authentication with password auth `Disabled`, so the credential is an access
token minted per connection from the container's own managed identity and
nothing is stored. The `secrets` array was read back from the live app **after**
that change, and again by Task 2.1.8 after the diagnostic route deployed: it is
still `null`. **So ADR 0011's claim is confirmed by Story 2.1 rather than
falsified by it, and it expires in Story 2.6**, which is genuinely the first
task in this project to place a bearer secret from a party with no Azure
identity. ADR 0006's boundary is the half that did move: Story 2.1 is the first
thing to test it, and it held — see `docs/adr/0014-*`.

Today the Container App's `secrets`
array is **empty** — measured in Task 1.11.3, which also identified the
mechanism for exactly this key and used none of it, and re-read in Tasks 2.1.6
and 2.1.8. Note the deployed
environment is **public**, accepted in Epic 1 on the stated grounds that nothing
deployed holds a credential and the backend's entire surface is `GET /health`;
~~that argument expires here~~ **that argument expires in Story 2.6 — Story 2.1
left both halves of it standing, and it added one route,
`GET /diagnostics/database`, which is public, unauthenticated, and deliberately
carries no error message, host, port or SQLSTATE for that reason**.

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

## Stories

| #    | Story                                                                                                               | Depends on         |
| ---- | ------------------------------------------------------------------------------------------------------------------- | ------------------ |
| 2.1  | [Managed Postgres Provisioning & the Secrets Boundary](story-01-managed-postgres-and-the-secrets-boundary/STORY.md) | Epic 1 (1.6, 1.11) |
| 2.2  | [Database Schema & Migration Mechanism](story-02-database-schema-and-migrations/STORY.md)                           | 2.1                |
| 2.3  | [Security Domain Model & the Tracked Universe](story-03-security-domain-model-and-tracked-universe/STORY.md)        | 2.2                |
| 2.4  | [Trading Calendar & Market Time Handling](story-04-trading-calendar-and-market-time/STORY.md)                       | 2.3                |
| 2.5  | [Market-Data Provider Abstraction](story-05-market-data-provider-abstraction/STORY.md)                              | 2.4                |
| 2.6  | [Alpaca Historical Data Integration](story-06-alpaca-historical-data-integration/STORY.md)                          | 2.1, 2.5           |
| 2.7  | [Historical Bar Ingestion, Storage & Backfill](story-07-historical-bar-ingestion-and-storage/STORY.md)              | 2.2, 2.3, 2.4, 2.6 |
| 2.8  | [Market Data API](story-08-market-data-api/STORY.md)                                                                | 2.3, 2.7           |
| 2.9  | [Frontend Market-Data Layer & Application State](story-09-frontend-market-data-layer/STORY.md)                      | 2.8                |
| 2.10 | [Security Search & Selection](story-10-security-search-and-selection/STORY.md)                                      | 2.9                |
| 2.11 | [Price Chart](story-11-price-chart/STORY.md)                                                                        | 2.10               |
| 2.12 | [Volume Chart & Time-Window Selection](story-12-volume-chart-and-time-window/STORY.md)                              | 2.11               |
| 2.13 | [Market-Data Provenance, Partial States & Epic Close](story-13-provenance-partial-states-and-epic-close/STORY.md)   | 2.12               |

The sequence is deliberately linear — each story depends on the one before it — and it has
three phases: **2.1–2.2 make a database exist**, **2.3–2.8 make market data exist behind an
API**, and **2.9–2.13 make it visible**. The one place parallel work is genuinely available
is 2.4 and 2.5, which touch nothing each other touches.

**Stories 2.5 to 2.8 are the load-bearing middle.** Story 2.5 lands the provider interface
before any vendor code, which is invariant 7 rather than a preference; Story 2.7 is the
largest engineering story in the epic; and Story 2.8's contract is consumed by three later
epics.

## Three stories are additions to this epic's stated scope

The scope list above names thirteen items and assumes three more. Each addition is recorded
here rather than folded in silently, because Epic 1's experience was that unstated work
lands somewhere by accident and then has no owner.

**Story 2.4 — Trading Calendar & Market Time.** Not named anywhere in the roadmap. Story 2.7
cannot decide which bars ought to exist without a session definition, Story 2.12's "last 5
days" is wrong if it means calendar days, and Epic 13's temporal isolation — invariant 4 —
is a comparison against a market clock. Three stories need it and none of them is the right
place to invent it.

**Story 2.8 — Market Data API.** The scope list names the ingestion and it names the charts,
and assumes the wire between them. That wire is a contract Epics 3, 5 and 8 also consume,
and Epic 1 spent a whole story on how this codebase declares one.

**Story 2.9 — Frontend Market-Data Layer & Application State.** §25 recommends Redux and
RxJS and immediately says not to add heavyweight state libraries before complexity
demonstrates the need. This epic is the first place there is any domain state at all, so it
is where that judgement is exercised. Left unowned, it gets answered three times by three UI
stories.

## Two corrections to this epic's framing

**The Alpaca key is not the first secret this system holds — the database credential is**,
and it arrives in Story 2.1, five stories earlier. ~~So the secrets mechanism is built in 2.1
and Story 2.6 places a second key through a proven path rather than inventing one.~~
**Corrected 2026-09-04 by Task 2.1.1 and confirmed 2026-09-05 by Task 2.1.8: the second half
of that does not follow.** The database credential turned out to need no storage mechanism at
all, so **the path does not transfer** — an Alpaca key is a bearer secret from a party with no
Azure identity, and Story 2.6 will be putting a secret on the platform for the first time
rather than repeating something proven here. What transfers is the **identity**, not the
mechanism, and the `secrets`-array path is **exercised by nothing** in this repository. That
is Story 2.6's largest unknown and it is named here rather than left for 2.6 to discover.

~~**"Historical market-data persistence/cache" is two different products and the epic does
not say which.**~~ **SETTLED 2026-09-05 — a record, and the scope line above now says so.**
The observation stood and was right: §24 wants raw observations stored as append-only
timestamped events, which is a record, while "cache" implies something evictable. It was
settled with the user in Story 2.7's open decision 1, prompted by the fair question of why
this system stores anything at all when the data comes from someone else's API. **The
reframing that answered it: §30 lists ten tables and only `market_bars` comes from Alpaca**
— one more comes from the SEC, and the other eight have no external source, because an
investigation, its findings and its evidence are things this system does rather than things
it fetches. So the database was never the question; whether that one table joined it was.
What settled that one table is §36, whose own worked failure state — _"Live feed
disconnected — displaying data through 10:42:17"_ — is only writable if the data was stored.
Three consequences are now decided rather than open: bars are stored **unadjusted** and
adjusted on read, **nothing is evicted**, and "we do not have that" is an **answer**.

## The decisions this epic must settle with a person

Recorded here so they are visible without opening thirteen files. Each is stated in full,
with its alternatives, in the story that owns it.

| Decision                                             | Story | Why it cannot be defaulted                                                                                                        |
| ---------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------- |
| Postgres networking mode                             | 2.1   | Fixed at creation; private access needs a VNet that cannot be retrofitted                                                         |
| Password or managed-identity auth                    | 2.1   | The second means no secret exists at all — Epic 1 chose that shape twice                                                          |
| Local development database                           | 2.1   | Becomes a prerequisite for every clean clone                                                                                      |
| Migration tool and query layer                       | 2.2   | Every table in §30 arrives through it, across thirteen more epics                                                                 |
| Sector metadata source and taxonomy                  | 2.3   | Alpaca does not provide sectors; Epics 4, 5 and 6 all group by them                                                               |
| **Which ~100 securities**                            | 2.3   | A market-cap-ordered list makes breadth and relative-move structurally dull                                                       |
| Which timeframes and how far back                    | 2.6   | Sizes Story 2.7 and determines whether Epic 5 has enough observations                                                             |
| ~~Cache or record~~ **settled: record**; TimescaleDB | 2.7   | Changed retention, gap semantics and whether bars are stored adjusted; §37 forbids a second data technology without a measurement |
| Redux now, or not yet                                | 2.9   | Epic 11's generative workspace is much easier against an explicit typed state tree                                                |
| Charting library or hand-built; line or candles      | 2.11  | Inherited by Epics 5, 8 and 11                                                                                                    |
| Which time windows                                   | 2.12  | Reaches backwards into ingestion depth and payload size                                                                           |
| Feed-label prominence and wording                    | 2.13  | Invariant 6; read by every visitor                                                                                                |
