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
  free Alpaca plan's live stream is **IEX only**, and **live** IEX minute
  coverage is **65.1% median, 2.1% worst case** (`ERIE`) against **99.7%** on
  consolidated SIP — `LIVE-DATA.md` §7.6, measured first-hand on the stream,
  2026-09-16. An absent bar is **ordinary** on IEX and **notable** on SIP.

  **Corrected 2026-09-23, and the correction makes this warning bigger rather
  than smaller.** This read _82.8% median, 43.1% worst case (`CCI`)_ and cited
  `ALPACA.md` §5.2 — which is a real measurement of the **stored** `feed=iex`
  REST endpoint and not of the live stream. §7.6 struck it for the live feed on
  2026-09-16 and nothing propagated the strike here. So the denominator problem
  below is **worse than this paragraph claimed**: a median name is missing about
  a **third** of its minutes on the live feed, not a sixth, and the worst name
  is missing **98%** of them rather than 57%. `UNIVERSE.md` calls this **breadth pollution** and
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
   discarded by the live path entirely (**0.1062% of bars, 37.6% of them
   changing the close** — a whole session on 2026-09-24; the spike's 0.064% /
   35.3% is `LIVE-DATA.md` §14.1's first figure and its amendment carries
   both), so the live figure and the stored figure can legitimately disagree
   for a small fraction of bars.

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

---

## Handed here by Story 3.6's close — 2026-09-22: the data the overview aggregates, and two decisions that bound it

**The universe table never re-orders under live data, and that is chosen
rather than inherited** (Task 3.6.3). Its order is `SECTORS`, then the
sector's own ETF, then equities in query order, and nothing in it reads a
price — because a row that moves while it is being read is a row that cannot
be read. **Anything _ranked_ by a live value is yours**: gainers, losers,
breadth, sector performance. A ranked view is a different surface with a
different promise, not that table sorted differently; the reversal trigger on
the table is _the first sort control whose key is a live value_, and it should
not fire from here.

**What you have to aggregate over.** The browser holds one `Map` of the
latest observation per security (`LiveFeedView.observations`), filled by a
snapshot on connect and one `bars` frame a minute, with §7.6's coverage: about
332 of 518 securities in a given minute, 65.1% median per symbol, and every
observation carrying its own `startsAt` — the current-state map never expires
one, so a breadth denominator has to decide what _current_ means rather than
count the map. A change is measured against the **previous session's close**
by `changeFromClose` (Task 3.6.1), which lives in `components/UniverseTable/last-close.ts`
and is the one place that arithmetic is written.

**The render cost is a measured constraint, not a worry.** Re-rendering 518
rows once a minute on a production build cost 46–49 ms of script per tick and
40 ms every 30 s from an unmemoised route (Task 3.6.5), against §28's 50 ms
_routine_ line; two memo boundaries took it to 37–40 ms with every row
changing. **A second universe-scale surface on one page is Epic 14's own
reversal trigger**, and the overview is that page by design: size each
region's per-row work against 518 from the first line, and read
[Task 3.6.5](../epic-03-live-market-data/story-06-live-prices-across-the-universe/TASK-05-the-cold-load-expand-all-and-epic-14s-trigger.md)
for the instrument that names what a tick spends.

### Handed here by Story 3.10 — 2026-09-24: the degraded set exists, inherit it rather than re-inventing it

**Every live surface has degraded states and this product has already
enumerated them once**, produced rather than imagined: nine of them,
photographed at 1440, 1024, 768 and 390, with the text of six surfaces compared
so _do two states read identically_ is answered by strings rather than by eye
(Task 3.10.9). The set, the unreachable cells and why they are unreachable are
in that task's record.

**Three rules travel with it and each is somebody's measured defect:**

- **`FeedStatus` is about the CONNECTION and `MarketSessionStatus` about the
  SESSION**, and they must not be collapsed. The market being open does not
  mean data is flowing, and the market being shut is not a feed failure — a
  quiet socket at 02:00 is correct and must not read as broken.
- **A quiet security is not a broken feed.** IEX's median per-symbol minute
  coverage is **65.1%** and the worst case is **2.1%** (`LIVE-DATA.md` §7.6);
  `LIVE-DATA.md` §11.2 measured an ordinary maximum gap of **187 minutes**.
  Anything that reports silence as a fault will cry wolf on thin names all day.
- **The connection has ONE home** — the status bar — and every other surface
  stays quiet by decision (ADR 0029's fourth rule; Tasks 3.10.3, 3.10.5 and
  3.10.8 each took it with reasons). A second surface reporting the connection
  is the defect this product has produced four times on one screen.

**And one unrepaired consequence, recorded in `docs/GAPS.md`**: because the
connection has one home and that home is sticky at the **foot** of the
viewport, at 390 the distinction between _the feed stopped_ and _the market is
shut_ is below the fold. No check can see it.

**This epic is where it matters most.** The overview's whole subject is _what
is happening right now_, so a feed that has quietly stopped is a worse lie here
than on a security page — and the 390 consequence above is owed a person's
judgement **before** this epic ships a screen.
