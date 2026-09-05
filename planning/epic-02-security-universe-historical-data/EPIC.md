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
- Historical market-data persistence — **a record of what was observed, not a cache** (settled 2026-09-05 in Story 2.8's open decision 1; §36's "displaying data through 10:42:17" is only writable if it was stored, and §24's replay reconstructs what the system knew and did rather than only what the market did)
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
falsified by it, and it expires in Story 2.7**, which is genuinely the first
task in this project to place a bearer secret from a party with no Azure
identity. ADR 0006's boundary is the half that did move: Story 2.1 is the first
thing to test it, and it held — see `docs/adr/0014-*`.

Today the Container App's `secrets`
array is **empty** — measured in Task 1.11.3, which also identified the
mechanism for exactly this key and used none of it, and re-read in Tasks 2.1.6
and 2.1.8. Note the deployed
environment is **public**, accepted in Epic 1 on the stated grounds that nothing
deployed holds a credential and the backend's entire surface is `GET /health`;
~~that argument expires here~~ **that argument expires in Story 2.7 — Story 2.1
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
| 2.4  | [**The Tracked Universe On Screen** (the first vertical slice)](story-04-tracked-universe-on-screen/STORY.md)       | 2.3                |
| 2.5  | [Trading Calendar & Market Time Handling](story-05-trading-calendar-and-market-time/STORY.md)                       | 2.3                |
| 2.6  | [Market-Data Provider Abstraction](story-06-market-data-provider-abstraction/STORY.md)                              | 2.5                |
| 2.7  | [Alpaca Historical Data Integration](story-07-alpaca-historical-data-integration/STORY.md)                          | 2.1, 2.6           |
| 2.8  | [Historical Bar Ingestion, Storage & Backfill](story-08-historical-bar-ingestion-and-storage/STORY.md)              | 2.2, 2.3, 2.5, 2.7 |
| 2.9  | [Market Data API](story-09-market-data-api/STORY.md)                                                                | 2.3, 2.8           |
| 2.10 | [Frontend Market-Data Layer & Application State](story-10-frontend-market-data-layer/STORY.md)                      | 2.9                |
| 2.11 | [Security Search & Selection](story-11-security-search-and-selection/STORY.md)                                      | 2.10               |
| 2.12 | [Price Chart](story-12-price-chart/STORY.md)                                                                        | 2.11               |
| 2.13 | [Volume Chart & Time-Window Selection](story-13-volume-chart-and-time-window/STORY.md)                              | 2.12               |
| 2.14 | [Market-Data Provenance, Partial States & Epic Close](story-14-provenance-partial-states-and-epic-close/STORY.md)   | 2.13               |

**The number is the position, and it is kept that way deliberately.** Story 2.4 was
inserted on 2026-09-05 and what used to be Stories 2.4 to 2.13 became 2.5 to 2.14. The first
draft avoided that, giving the new story the next free number and delivering it fourth, on
the argument that story numbers are referenced across the tree and renumbering would falsify
those references silently. **It was overruled**, and the reasoning is worth keeping: a
sequence whose numbers do not reflect its order is a trap for every future reader, and the
cost of renumbering is paid once by whoever does it, where the cost of a mismatch is paid by
everybody who reads it afterwards.

**So the rule for this epic is that inserting a story means renumbering the ones after it,
and remapping every reference in the same change.** That is a real cost — the insertion
above moved **505 references across 62 files**, including source comments and ADRs — and it
is a cost with a technique. Do it context-aware rather than by substitution: a blind
find-and-replace of `2.7` turns `jiti@2.7.0` into a version that does not exist,
`eastus2.5.azurestaticapps.net` into a different hostname, `build 2.44 s` into `2.54 s`, and
a `2.14` contrast ratio into `2.4`. Replace only where a `Story`/`Stories` prefix or a list
continuing one puts it beyond doubt, then **read the residue by hand** — that pass found 10
genuine references the rules could not see and 27 measurements they correctly left alone.

**ADRs are still never renumbered.** The two are different: an ADR number is cited in
external notes and in commit messages as a permanent identifier, and ADRs have no order to
disagree with.

The sequence is otherwise linear — each story depends on the one before it — and it has
three phases: **2.1–2.2 make a database exist**, **2.3–2.9 make market data exist behind an
API**, and **2.10–2.14 make it visible**. The one place parallel work is genuinely available
is 2.5 and 2.6, which touch nothing each other touches.

## Story 2.4 is an addition, and it is a delivery decision as much as a technical one

**Added 2026-09-05, after Stories 2.1 to 2.3 had shipped and the shape of the problem was
visible.** The epic as originally planned is layered — everything backend until 2.9, then
everything frontend — which means **nothing a user can see arrives until Story 2.11, seven
stories and roughly fifty-five tasks after Story 2.3.** For that whole stretch the deployed
application shows what it showed when Epic 1 closed: four placeholder routes, and a landing
page whose only market-looking content is Story 1.4's render check, which is **invented
data** including two rows deliberately marked stale and disconnected.

The technical opportunity is what makes the fix cheap rather than cosmetic: **the universe
is in the database as of Story 2.3, and putting it on screen needs none of Stories 2.5 to
2.8.** The calendar, the provider abstraction, Alpaca and bar ingestion are prerequisites
for _charts_, not for _a list of securities_. So 2.4 takes a thin first cut of 2.9, 2.10 and
2.11 — the universe endpoints, one fetch, and the list — and leaves each of those stories
its actual subject. Story 2.11's own file already argued for this shape about itself, calling
a security list "the smallest useful vertical slice through Story 2.10's layer, which is a
good way to find out whether that layer is right while it is still cheap to change."

**What it costs, stated rather than hidden:** it re-orders rather than removes, so it does
not bring the charts closer, and it takes the temporal-seam obligation out of Story 2.9 and
into a story where `securities` — having no `observed_at` — cannot exercise it. That second
one is a real risk and 2.4.1 is written around it.

## Every story and task states what the user will be able to see

**A convention adopted 2026-09-05, and it applies to task files as well as story files.**
Each carries a **What the user can see** section, and the honest answer is often _nothing_ —
Story 2.1 provisioned a database and Story 2.2 built a migration mechanism, and neither
changed a pixel. That is fine and it is not the failure mode. The failure mode is a run of
stories where nobody wrote it down, because then "what has changed for a user?" has no
answer at all and the only available one is a status table.

Three rules for writing it:

- **Say "nothing visible" plainly when that is the answer**, and say what it unblocks and
  which story pays it off. A task that changes nothing visible is fine; a task that changes
  nothing visible and does not say so reads as work that was not done.
- **Describe what is on the screen, not what was built.** "A `/securities` page listing 101
  securities with symbol, name, sector and kind" rather than "a securities endpoint and a
  read path".
- **Say what the user still cannot do**, so a demonstration does not promise more than it
  is. This is the half that protects the next story.

**Stories 2.6 to 2.9 are the load-bearing middle.** Story 2.6 lands the provider interface
before any vendor code, which is invariant 7 rather than a preference; Story 2.8 is the
largest engineering story in the epic; and Story 2.9's contract is consumed by three later
epics.

## Three stories are additions to this epic's stated scope

The scope list above names thirteen items and assumes three more. Each addition is recorded
here rather than folded in silently, because Epic 1's experience was that unstated work
lands somewhere by accident and then has no owner.

**Story 2.5 — Trading Calendar & Market Time.** Not named anywhere in the roadmap. Story 2.8
cannot decide which bars ought to exist without a session definition, Story 2.13's "last 5
days" is wrong if it means calendar days, and Epic 13's temporal isolation — invariant 4 —
is a comparison against a market clock. Three stories need it and none of them is the right
place to invent it.

**Story 2.9 — Market Data API.** The scope list names the ingestion and it names the charts,
and assumes the wire between them. That wire is a contract Epics 3, 5 and 8 also consume,
and Epic 1 spent a whole story on how this codebase declares one.

**Story 2.10 — Frontend Market-Data Layer & Application State.** §25 recommends Redux and
RxJS and immediately says not to add heavyweight state libraries before complexity
demonstrates the need. This epic is the first place there is any domain state at all, so it
is where that judgement is exercised. Left unowned, it gets answered three times by three UI
stories.

## Two corrections to this epic's framing

**The Alpaca key is not the first secret this system holds — the database credential is**,
and it arrives in Story 2.1, five stories earlier. ~~So the secrets mechanism is built in 2.1
and Story 2.7 places a second key through a proven path rather than inventing one.~~
**Corrected 2026-09-04 by Task 2.1.1 and confirmed 2026-09-05 by Task 2.1.8: the second half
of that does not follow.** The database credential turned out to need no storage mechanism at
all, so **the path does not transfer** — an Alpaca key is a bearer secret from a party with no
Azure identity, and Story 2.7 will be putting a secret on the platform for the first time
rather than repeating something proven here. What transfers is the **identity**, not the
mechanism, and the `secrets`-array path is **exercised by nothing** in this repository. That
is Story 2.7's largest unknown and it is named here rather than left for 2.7 to discover.

~~**"Historical market-data persistence/cache" is two different products and the epic does
not say which.**~~ **SETTLED 2026-09-05 — a record, and the scope line above now says so.**
The observation stood and was right: §24 wants raw observations stored as append-only
timestamped events, which is a record, while "cache" implies something evictable. It was
settled with the user in Story 2.8's open decision 1, prompted by the fair question of why
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
| Which timeframes and how far back                    | 2.7   | Sizes Story 2.8 and determines whether Epic 5 has enough observations                                                             |
| ~~Cache or record~~ **settled: record**; TimescaleDB | 2.8   | Changed retention, gap semantics and whether bars are stored adjusted; §37 forbids a second data technology without a measurement |
| Redux now, or not yet                                | 2.10  | Epic 11's generative workspace is much easier against an explicit typed state tree                                                |
| Charting library or hand-built; line or candles      | 2.12  | Inherited by Epics 5, 8 and 11                                                                                                    |
| Which time windows                                   | 2.13  | Reaches backwards into ingestion depth and payload size                                                                           |
| Feed-label prominence and wording                    | 2.14  | Invariant 6; read by every visitor                                                                                                |
