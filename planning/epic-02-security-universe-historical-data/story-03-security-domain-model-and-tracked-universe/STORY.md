# Story 2.3 — Security Domain Model & the Tracked Universe

**Status:** In progress
**Epic:** [Epic 2 — Security Universe & Historical Market Data](../EPIC.md)
**Depends on:** Story 2.2
**Epic scope covered:** Security domain model; initial ~100-security universe; ETF/sector metadata

## Description

Decide what a security **is** in this product, and decide which ~100 of them MarketPulse
tracks. The second half is a product decision rather than an engineering one, and it is
the one that quietly determines whether every later epic has anything interesting to show:
Epic 4's sector performance, Epic 5's relative-move calculation, Epic 6's topology
clustering and Epic 7's peer comparison all read this list.

§6 asks for 100–500 liquid US-listed equities plus SPY, QQQ, DIA, IWM and major sector
ETFs, starting at roughly 100, with an architecture that expands without redesign.

## Why it sits here in the sequence

It is the first table with rows, so it exercises Story 2.2's mechanism on something real
and small. Everything downstream needs a symbol list: Story 2.6 cannot request bars
without one, and Story 2.7 cannot size storage without knowing how many securities there
are.

## Scope

- The `Security` type in `packages/shared`, and the vocabulary it fixes: symbol, name,
  exchange, kind (**an equity, a sector ETF and an index ETF are three different things and
  Epic 4 treats them differently** — Task 2.3.1 widened `SECURITY_KINDS` from the two
  members this line originally named), sector, industry, status, and the identifiers that
  let Epic 9 map a security to a CIK later
- The `securities` table and its migration
- **The chosen universe, with the selection rule written down**, so the list can be
  regenerated rather than only edited: liquidity, market-cap spread, and — the criterion a
  naive "top 100 by market cap" list fails — **deliberate sector coverage**, because a
  list that is 40% mega-cap technology makes "relative to sector" and "market breadth"
  structurally uninteresting
- The ETF set, and the distinction between an **index proxy** (SPY, QQQ, DIA, IWM) and a
  **sector proxy** (the sector SPDRs), which Epic 4 and Epic 5 need to tell apart
- The sector taxonomy, and the mapping of each equity to a sector and to its sector ETF
- Where the universe lives: seed data in the repository, versioned and reviewable, versus
  fetched from a provider
- How the list changes: adding a symbol, removing one, and what happens to data already
  stored for a removed symbol
- Expansion to 500 without redesign — demonstrated by argument and by the absence of any
  hard-coded 100, not by actually loading 500

## Out of scope, and who owns it

- Anything about prices — Stories 2.6 and 2.7
- Correlation or graph relationships between securities — Epic 6 owns `relationships`
- CIK mapping and filings — Epic 9
- A user-editable watchlist — not in V1 scope (§37)

## Open decisions — settle with the user

**All four are owned by Task 2.3.1, which settles them and ships nothing**, in the shape
Tasks 1.10.1, 1.11.1, 2.1.1 and 2.2.1 took — because the vocabulary chosen here is read by
Epics 4, 5, 6, 7 and 9 and appears in URLs, chart axes and agent-facing text, and this
story's own Design surface note says renaming it later is expensive. That task also adds
four decisions this list does not name and that would otherwise be answered by accident:
**how an index proxy is distinguished from a sector proxy** (both are ETFs and Epic 4 needs
to tell them apart), **the `status` vocabulary** (`securities.status` ships with no check
constraint precisely because Task 2.2.4 refused to invent it), **the per-field provenance
shape** that acceptance criterion 6 asks for, and **what format the universe file takes** —
where the deciding measurement is that a `.ts` module is inside `tsc -b` and a data file is
read by Prettier for formatting and by nothing for meaning.

**All eight are settled, and the record is [`UNIVERSE.md`](UNIVERSE.md)** — Task 2.3.1
decided them and shipped nothing, finishing with the tree byte-identical. In one paragraph:
the taxonomy is the **eleven GICS-shaped sectors**, each mapped one-to-one onto a sector
SPDR, chosen against the ETFs rather than against familiarity; **`SECURITY_KINDS` widens to
three members** — `equity`, `sector_etf`, `index_etf` — so the proxy distinction is one
column with one source of truth; **`status` gets exactly two members**, `active` and
`untracked`, because those are the two this story can produce, with `delisted` deferred to
its producer in Story 2.6; sector and industry come from a **curated file in this
repository**, with its silent-staleness cost recorded as a gap of this repository's third
kind and a reversal trigger stated; provenance is a **source and a retrieval timestamp per
field group** rather than one column on the row; the universe is a **seed script and not a
migration**, per `apps/backend/migrations/README.md` §7; it lives in a **`.ts` module at
`apps/backend/src/universe.ts`**, on two measurements — a data file is invisible to `tsc`,
and it is also absent from `dist/` and therefore from the container image; and the
**selection rule is a floor of 6 and a ceiling of 12 equities per sector**, which puts the
largest sector at 14.1% of the equities. Only **the actual symbols** remain open, and they
are Task 2.3.4's product conversation. The original wording is kept below rather than
deleted, because it records what was being weighed at the time.

1. ~~**Where sector and industry metadata comes from.**~~ **Settled — a curated file in
   this repository, with the staleness cost recorded rather than glossed.** This is the decision people assume
   is free and is not: **Alpaca's assets endpoint does not carry sector or industry**, so
   the options are a curated dataset checked into the repository, a third-party source
   with its own licence and key, or deriving sector membership from ETF holdings. The
   curated file is the honest V1 answer — ~100 rows, reviewable in a diff, no new
   dependency, no new credential — and its cost is that it goes stale silently. Whatever
   is chosen, **provenance for this metadata is displayed like any other** (invariant 6)
2. ~~**Which taxonomy.**~~ **Settled — the eleven GICS-shaped sectors, one per sector
   SPDR.** GICS names are the familiar ones and are proprietary; a plain
   eleven-sector approximation is free and is what the sector SPDRs already imply. Prefer
   the one that matches the ETFs, since Epic 5 compares a security against its sector ETF
3. **The actual 100 — still open, and Task 2.3.4's.** The _rule_ that produces it is
   settled: a floor of 6 and a ceiling of 12 equities per sector. This wants a product conversation, not a generated list. A
   defensible starting shape: the eleven sector SPDRs plus four index proxies, then ~85
   equities allocated across sectors so every sector has enough constituents for a breadth
   number to mean something, weighted toward names with liquid IEX activity and
   recognisable to a demo audience (§38's flagship demo uses NVDA)
4. ~~**Whether the universe is a migration or a seed script**, given Story 2.2's answer~~
   **Settled — a seed script, because "idempotent" here has to mean "picks up an edited
   list", which a migration structurally cannot do.**

## Acceptance criteria

1. `Security` is defined once, in `packages/shared`, and both apps compile against it
2. The universe loads into a clean database in one documented command, and re-running it
   is idempotent
3. Every equity has a sector, and every sector present has a corresponding sector ETF; a
   security with neither fails the load rather than arriving silently unclassified
4. The count, the sector distribution and the selection rule are recorded, and the sector
   distribution is inspected against the "not 40% technology" criterion rather than assumed
5. Adding and removing a symbol are both demonstrated, including what happens to a removed
   symbol's stored data
6. The metadata's source is recorded per-field in a way Story 2.13 can display
7. `pnpm verify` passes

## Tasks

Tackled in order. The story is complete when all eight are done.

2.3.1 decides and ships nothing. 2.3.2 to 2.3.6 are entirely local and come **before** the
deployed database is touched, for Task 1.11.2's reason and doubly so here, because the
managed server carries a `CanNotDelete` lock and "drop it and start again" is not an
available recovery. Inside that run the order is the **type** (2.3.2), then the **schema**
that backs it (2.3.3), then the **data** (2.3.4), then the **loader** (2.3.5), then every
way the list changes (2.3.6). 2.3.7 is the half that gets skipped and then hurts. 2.3.8
closes the story and records ADR 0016 — 0016 and not 0014, which is reserved for Story
2.1's own close, and ADRs are never renumbered.

| #     | Task                                                                                                                                                | Status      |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 2.3.1 | [Choose the vocabulary, the taxonomy and where the metadata comes from, shipping nothing](TASK-01-choose-the-vocabulary-and-the-metadata-source.md) | Complete    |
| 2.3.2 | [`Security` in `packages/shared`, and the vocabularies it fixes](TASK-02-the-security-type.md)                                                      | Complete    |
| 2.3.3 | [The schema the vocabulary needs: the first migration written by a reader of the conventions](TASK-03-the-schema-the-vocabulary-needs.md)           | Not started |
| 2.3.4 | [The universe itself: ~100 securities, and the rule that produced them](TASK-04-the-universe-itself.md)                                             | Not started |
| 2.3.5 | [The loader: one documented command, idempotent, and it refuses a bad universe](TASK-05-the-loader.md)                                              | Not started |
| 2.3.6 | [Change the universe: add one, remove one, and say what expansion costs](TASK-06-change-the-universe.md)                                            | Not started |
| 2.3.7 | [Load the deployed universe, and decide whether that happens on every deploy](TASK-07-load-the-deployed-universe.md)                                | Not started |
| 2.3.8 | [Verify from a clean clone, document, and record ADR 0016](TASK-08-verify-document-and-adr.md)                                                      | Not started |

**Four things about this split are decisions rather than consequences.**

**The type comes before the schema** (2.3.2 before 2.3.3), which inverts the order a
schema-first instinct suggests. `apps/backend/migrations/README.md` requires that a closed
set's source of truth be a TypeScript union and that the `check` constraint be the
database's backstop — `SECURITY_KINDS` is already in that arrangement — so writing the
constraint first would make the database the source of truth for a vocabulary five epics
read from `packages/shared`.

**The data comes before the loader** (2.3.4 before 2.3.5), so that the product decision and
the engineering that consumes it fail separately. The list is a product conversation and
the loader is not, and a list written to fit a loader's convenience is how "deliberate
sector coverage" quietly becomes whatever was easy to fetch.

**Changing the list comes before deploying it** (2.3.6 before 2.3.7), for the reason 2.2.6
came before 2.2.7: what a removal does to stored data is not answerable until a removal has
been produced, and the deployed database is the one place it cannot be produced cheaply.

**And there is deliberately no task for a provider-backed metadata fetch.** If Task 2.3.1
chooses the curated file — the honest V1 answer — then a fetcher is scaffolding ahead of
the iteration that needs it, and its absence is what makes the staleness cost visible
rather than hidden behind a mechanism nobody runs.

**`market_bars` is in none of these tasks**, per Story 2.2's out-of-scope note and this
story's: Story 2.7 owns it, and its shape is driven by measured ingestion.

## Design surface

Sector naming is user-visible from Epic 4 onward, and the equity/ETF distinction will need
a visual treatment as early as Story 2.10's search results. Naming decided here is
expensive to rename later because it appears in URLs, charts and agent-facing text.

## What this story hands forward

The symbol list every later story iterates, and the sector vocabulary Epics 4, 5 and 6
group by.
