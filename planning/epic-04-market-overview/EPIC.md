# Epic 4 — Market Overview

**Status:** Not started
**Sequence:** 4 of 15 — follows Epic 3 (Live Market Data)
**Spec references:** PRODUCT_SPEC.md §8.1 (Market Overview), §9 (overview layout)

## Goal

Give users an immediate picture of current market conditions.

## Outcome

MarketPulse has a useful landing page rather than requiring users to start with an individual stock.

## Scope

- Major ETF/index proxy summary
- Sector performance
- Advancers / decliners
- Market breadth
- Top gainers / losers
- Unusual-activity placeholder area
- Security selection from the overview
- Live market status indicators

## Exit criteria

A user opening MarketPulse can quickly understand whether the tracked market is broadly rising, falling, mixed, or concentrated in particular sectors.

## What Epic 2 measured that this epic's numbers rest on (added 2026-09-15)

Every headline number on this screen — sector performance, advancers and
decliners, breadth, top gainers and losers — is an aggregate over the tracked
universe, and Epic 2 measured three things that make such an aggregate
**correctly-looking and wrong** if they are not known in advance. They are
recorded here because each lives in a document this epic has no reason to open.

- **A live breadth number is computed over a feed that is missing bars.** The
  free Alpaca plan's live stream is **IEX only**, and IEX minute coverage is
  **82.8% median, 43.1% worst case** (`CCI`) against **99.7%** on consolidated
  SIP — `ALPACA.md` §5.2, measured 2026-09-07. An absent bar is **ordinary** on
  IEX and **notable** on SIP. `UNIVERSE.md` calls this **breadth pollution** and
  names it a live concern for the stream and close to a non-issue for stored
  bars. So "how many securities are negative right now" has a denominator
  question in it: a name with no recent IEX bar is not a name that did not move.
- **The sector SPDRs hold S&P 500 constituents only.** A tracked equity outside
  the index has a sector, has a benchmark, and is **not a constituent of that
  benchmark** (`UNIVERSE.md` §5). That is fine for a relative-move comparison
  and wrong for anything treating the ETF as the sector's complete membership —
  which a sector-performance panel is exactly the shape to assume.
- **A sector reclassification has no symptom at all.** `UNIVERSE.md` §12's drift
  table: a name moving Technology → Communication Services fails nothing, and
  this epic **counts it in the wrong breadth number, indefinitely, and
  correctly-looking**. The mitigation is `classification_retrieved_at`, which
  Story 2.14 puts on screen — the curated classification's age is a fact this
  epic may need to surface beside an aggregate rather than only on a security.

**Two of this epic's scope items already exist and should not be rebuilt.** The
**market clock** shipped in Story 2.5 (`AppHeader`'s status strip, market time in
ET and whether the session is open) and the **feed provenance indicator** in
Story 2.6 — so "live market status indicators" here means the _connection_ state
Epic 3 adds beside them, not a second clock. See
[Epic 3's `EPIC.md`](../epic-03-live-market-data/EPIC.md) for the boundary
argument, which is settled.

**And the landing route is currently a placeholder naming this epic.** Epic 2
filled three of `PRODUCT_SPEC.md` §8.3's seven regions on the security page and
deliberately left the overview alone; what a user sees today at `/` is the epic
that pays it off, by name.
