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

## Handed here by Story 3.5's close — 2026-09-21: the object this epic reads instead of opening a socket

**Story 3.5 built `currentMarketState` for the three epics outside Epic 3 that
want the latest observation per security** — this one among them — **and none of
you wants to subscribe to a socket to get it.** Written into this file rather
than left in Epic 3's documents, because a constraint one story measures for
another lives where the owner does not read.

`apps/backend/src/current-market-state.ts` — one `Map<Ticker, LiveObservation>`
in the backend process, **0.2 MB** at universe scale. `snapshotOf(state)` gives
the whole thing; a read by symbol gives the bar, its `source`, and an `ageMs`
computed **at read time** rather than stored. Reading it costs nothing and opens
nothing.

**Five properties that will shape what you build on it:**

1. **It is LATEST-ONLY. There is no series in memory.** 518 latest values, not
   518 × 390 minute bars — decided in Story 3.5 as the cheap option because
   Story 3.8 makes the **store** hold today's session. Anything wanting a series
   assembles it from the store plus what has arrived since.
2. **It is `status`-filtered** to the 518 `active` securities
   (`UNIVERSE.md` §12.2 — a computation over _the market we track now_ filters;
   a read of something we **stored** does not). Story 3.8's read path is
   deliberately unfiltered, and that asymmetry must not be "fixed".
3. **An absent entry is normal, not an error.** Median minute coverage on the
   IEX feed is **65.1%**, and `ERIE` is **2.1%** — a security can be legitimately
   silent for a long stretch. A gap of **187 minutes** was measured. Treat
   "no current observation" as a first-class answer with its own words, never as
   a failure.
4. **It is in memory and dies with the process.** After a restart the true
   answer is an empty map, and an empty map is a **legitimate value rather than a
   degraded one** — which is exactly the trap `docs/GAPS.md` records: a
   placeholder indistinguishable from a real answer hides whatever was built on
   top of it until the day it stops being empty.
5. **It never walks backwards.** A revision for a minute already superseded is
   discarded by the live path entirely (0.064% of bars, **35.3% of them changing
   the close**), so the live figure and the stored figure can legitimately
   disagree for a small fraction of bars.

**And the feed it comes from is IEX, not the consolidated tape the stored bars
carry** — invariant 6 in `CLAUDE.md`. A number from this object and a number
from the store do not have the same provenance, and the UI must not imply they
do.

**For this epic specifically:** advancers/decliners and breadth are counts over
the whole universe at one instant, so property 3 is the one that bites — a
breadth percentage computed over "everything in the map" is computed over
whatever happened to be observed, which is roughly two-thirds of the universe on
a median minute. **The denominator is a decision this epic has to take and
state on screen**, not an implementation detail.
