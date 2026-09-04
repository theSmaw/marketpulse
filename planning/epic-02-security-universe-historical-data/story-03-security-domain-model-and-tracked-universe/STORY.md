# Story 2.3 — Security Domain Model & the Tracked Universe

**Status:** Not started
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
  exchange, kind (**equity or ETF — they are not the same thing and Epic 4 treats them
  differently**), sector, industry, status, and the identifiers that let Epic 9 map a
  security to a CIK later
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

1. **Where sector and industry metadata comes from.** This is the decision people assume
   is free and is not: **Alpaca's assets endpoint does not carry sector or industry**, so
   the options are a curated dataset checked into the repository, a third-party source
   with its own licence and key, or deriving sector membership from ETF holdings. The
   curated file is the honest V1 answer — ~100 rows, reviewable in a diff, no new
   dependency, no new credential — and its cost is that it goes stale silently. Whatever
   is chosen, **provenance for this metadata is displayed like any other** (invariant 6)
2. **Which taxonomy.** GICS names are the familiar ones and are proprietary; a plain
   eleven-sector approximation is free and is what the sector SPDRs already imply. Prefer
   the one that matches the ETFs, since Epic 5 compares a security against its sector ETF
3. **The actual 100.** This wants a product conversation, not a generated list. A
   defensible starting shape: the eleven sector SPDRs plus four index proxies, then ~85
   equities allocated across sectors so every sector has enough constituents for a breadth
   number to mean something, weighted toward names with liquid IEX activity and
   recognisable to a demo audience (§38's flagship demo uses NVDA)
4. **Whether the universe is a migration or a seed script**, given Story 2.2's answer

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

## Design surface

Sector naming is user-visible from Epic 4 onward, and the equity/ETF distinction will need
a visual treatment as early as Story 2.10's search results. Naming decided here is
expensive to rename later because it appears in URLs, charts and agent-facing text.

## What this story hands forward

The symbol list every later story iterates, and the sector vocabulary Epics 4, 5 and 6
group by.
