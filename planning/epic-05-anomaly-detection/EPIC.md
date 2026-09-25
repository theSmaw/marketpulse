# Epic 5 — Anomaly Detection

**Status:** Not started
**Sequence:** 5 of 15 — follows Epic 4 (Market Overview)
**Spec references:** PRODUCT_SPEC.md §11 (unusual activity detection)

## Goal

Automatically identify market behaviour worth investigating.

## Outcome

MarketPulse continuously assigns explainable anomaly scores to securities.

## Scope

- 5-minute return calculations
- Historical return distributions
- Return percentile calculation
- Intraday volume baseline
- Volume-ratio calculation
- Market-relative movement
- Sector-relative movement
- Composite anomaly score
- Human-readable anomaly explanation
- Unusual-activity ranking

## A decision this epic inherits, and would otherwise re-litigate — 2026-09-25, Epic 3's close

**An anomaly score changes on its own while somebody is looking at it**, which
makes it the second self-changing surface this product has. The first was Epic
3's live price, and the decision it forced is
[**ADR 0032**](../../docs/adr/0032-a-value-that-changes-on-its-own-announces-nothing.md):

> **A value that changes on its own announces nothing**, and the default is
> silence rather than politeness.

**That ADR names this epic in its own Context section** — _"`PRODUCT_SPEC.md`
§11's anomaly scores change on their own as the market moves […] neither epic's
`EPIC.md` knows this decision exists"_ — and it was right for four days.
**Epic 3's close is the thing that told this file**, which is the hand-off rule
working exactly as `CLAUDE.md` describes it.

**What it means here, concretely**: a score that rises does not get a live
region, and the reader is not interrupted. The full statement, its four
reasons and its reversal trigger are in `FRONTEND-STATE.md` §7; the motion
vocabulary that marks an arrival without announcing it is Story 3.4's, and the
rule under it is **work in progress LOOPS, a state PERSISTS, a fact arriving
DECAYS.**

## Exit criteria

MarketPulse can surface securities such as:

> NVDA — Anomaly 91
> Extreme short-term move
> Volume 3.8× normal
> Underperforming semiconductor peers

Every score can be explained from deterministic calculations.

## A condition this epic is most likely to fire, written here so it arrives rather than being rediscovered

**Added 2026-09-15 by Task 2.14.8.** Epic 2 ships a measured breach of
`PRODUCT_SPEC.md` §28's _no routine main-thread task over 50 ms_: every cold
load of `/securities` and `/securities/:symbol` spends one task of **50–76 ms**,
and it is the **518-row tracked-universe table** rather than the chart. It is
handed to **Epic 14** by name, with the figures and three candidate repairs in
[that epic's `EPIC.md`](../epic-14-performance-scale-validation/EPIC.md).

**But its reversal trigger is a condition rather than an epic number, and this
epic is the named candidate for firing it: _the first time a second surface on
that page renders per-row markup at universe scale._**

Two of this epic's scope bullets — the composite anomaly score and the
unusual-activity ranking — become a number per security, and the obvious place a
reader wants that number is beside each row of the tracked universe. **That is
the trigger.** Two helpings of a fifty-millisecond task in one page load is a
delay nobody mistakes for a slow laptop.

So if this epic puts an anomaly score in that table, **the table's repair is due
in this epic and not at Epic 14's convenience** — and the honest alternative,
which is cheaper and may well be the right product answer, is to rank into a
**top-N feed** (`PRODUCT_SPEC.md` §9's _Unusual Activity_ panel is a short list,
not 518 rows) and leave the universe table alone. Either is fine; deciding by
accident is not.

**Re-measure rather than cite**: the figures above are dated observations of one
laptop, and the method is in Epic 14's `EPIC.md`.

## What Epic 2 measured that every score here rests on (added 2026-09-15)

An anomaly score is a comparison, and Epic 2 measured three properties of the
data being compared that decide whether a score means anything. Each is recorded
in a document this epic has no reason to open, and each produces a number that
looks right.

- **Volume ratio and return percentile over a live tail are computed on IEX.**
  Median minute coverage is **82.8%**, worst case **43.1%** (`CCI`), against
  **99.7%** on the consolidated tape — `ALPACA.md` §5.2, measured 2026-09-07.
  **Those are the STORED endpoint's figures; the live stream is worse, and this
  bullet is about a live tail** — `LIVE-DATA.md` §7.6 measured **65.1%** median
  per-symbol and **2.1%** worst case, which is the pair item 3 below already
  quotes (noted 2026-09-24 by Story 3.8's close). An
  absent bar is **ordinary** on IEX and **notable** on SIP, so "volume 3.8×
  normal" computed with a live IEX numerator over a stored SIP baseline is
  comparing two different tapes. `UNIVERSE.md` rule 4 already pulled on this
  once: **liquidity means liquid _on IEX_**, because a name liquid on the
  consolidated tape and thin on IEX "gives an anomaly score computed over
  noise", and ~19 discretionary slots in the curation exist for it.
- **"Relative to sector" has a benchmark; "relative to industry" does not.**
  The taxonomy is eleven sectors chosen on the criterion that each has a free
  ETF; **`industry` is a column with no benchmark attached, and `UNIVERSE.md` §5
  says in so many words that this epic must not assume one.** That matters
  because `PRODUCT_SPEC.md` §11's own breadth example — _82% of semiconductor
  securities currently negative_ — and §38's demo conclusion are **industry**-level
  claims. The curation guarantees one industry group deep enough for that
  sentence to be true of something (semiconductors); it guarantees no ETF to
  measure it against.
- **The sector SPDRs hold S&P 500 constituents only**, so a tracked equity
  outside the index is measured against a benchmark it is not in
  (`UNIVERSE.md` §5). Fine for a relative move; wrong for anything treating the
  ETF as the sector's membership.

**And the floor exists for this epic's sake**: a minimum of six equities per
sector, because below that a breadth percentage is arithmetic over so few names
that "67% of the sector is negative" means four securities, and a relative-move
score has no peers to be relative to.

**Re-measure rather than cite.** The coverage figures are dated observations of
a third party; `ALPACA.md`'s own header says to re-take them.

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

   > **Added 2026-09-24 by Story 3.8's close — and a fourth property arrived
   > with it: SOME STORED MINUTE BARS ARE NOW A SINGLE VENUE'S.** Since
   > 2026-09-23 the deployed backend writes live IEX bars into `market_bars`
   > beside the nightly consolidated ones, and both are kept (ADR 0035). The
   > served read prefers `sip` where a minute holds both, so a **settled**
   > session still computes on the consolidated tape — but two stretches do
   > not: the **minutes in progress** before that night's backfill, and
   > **extended hours**, which the backfill never asks for and which are
   > therefore the live tape's permanently.
   >
   > So the trap this section opens with — _a volume ratio computed with a live
   > IEX numerator over a stored SIP baseline is comparing two different
   > tapes_ — is no longer only about a live tail. **It can now happen entirely
   > inside the store.** A score computed over a window that reaches into
   > today, or into pre-market, is mixing tapes without anything on the query
   > saying so. `market_bars.feed` is on every row; read it rather than assume
   > one tape.

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

**For this epic specifically:** a score wants a security observed _continuously_,
which is why Story 3.5 subscribes to the whole universe rather than to what
somebody is looking at — that capacity is already bought and is not yours to
build. But property 3 means continuity is the **feed's**, not ours: a 5-minute
return over a security with 2.1% coverage is arithmetic over two bars an hour
apart. **Every score this epic emits owes an explanation, and "how much of the
window was actually observed" belongs in it.**

---

## Handed here by Story 3.6's close — 2026-09-22: a score on every row is the trigger's own example

**Epic 14's reversal trigger names you.** _The first time a second surface on
`/securities` renders per-row markup at universe scale_ was written with a
per-security anomaly score in mind — Epic 14's `EPIC.md` says so in as many
words — and Task 3.6.5 evaluated it against Story 3.6's arrival mark and
found it **not fired as worded**, because the mark is a child of a cell that
already existed. An `AnomalyBadge` in every row is the thing it was written
for. If you put one there, the cold-load repair (virtualisation or its two
cheaper candidates, `SEARCH-AND-SELECTION.md` §10) is due with it rather than
in Epic 14.

**And the row is memoised now, on purpose.** Task 3.6.5 split each row into
`RowIdentity` — four static cells memoised on `security` — and two live cells,
because a tick re-rendering 518 whole rows crossed §28's 50 ms line on a
production build. A score that changes on its own is a third live cell:
either it joins the live half with its own memo input, or it re-renders the
static half on every tick and undoes the repair. The render-count test
(`UniverseTable.render-cost.test.tsx`) asserts a price arriving re-renders no
symbol link; a score arriving must satisfy the same test.

**The score's own motion is the vocabulary's third surface**: work in
progress loops, a state persists, a fact arriving decays — and a score
changing is a fact arriving, marked with the same `[data-arrival]` rule the
figure and the row already share.

## Handed here by Story 3.9's close — 2026-09-24: the series you compute over ends at a moving edge

**The security page's charts extend on their own during a session**, once a
minute, with no refresh (Story 3.9). Three consequences for anomaly marks, each
a design constraint rather than a warning:

- **The last bar is not stable.** A revision lands on about **0.1% of bars**
  roughly 30 s after the bar it corrects, and **rather more than a third of
  those change the close** (`LIVE-DATA.md` §14.1 and its 2026-09-24
  amendment: 0.064% / 35.3% over a spike's window, **0.1062% / 37.6%** over a
  whole session — take the figure, do not cite this line). So a score computed on the newest minute can be
  recomputed from different numbers half a minute later. Decide whether a mark
  **holds its instant** or follows the edge — the chart's reading strip already
  took that decision and **holds** (Task 3.9.6), and a mark that behaved
  differently from the crosshair on the same axis would be two answers about one
  bar.
- **The window's last slot arrives on its own.** `ChartAxis` computes the frame
  once and both plots read it; a mark rendered inside that provider inherits the
  growth for free. **A mark rendered outside it does not** — and that is ADR
  0023's reversal trigger verbatim: _the first piece of state two features must
  agree about that neither owns_. Task 3.9.5 evaluated it and it has **not**
  fired, with the condition sharpened to name you: an anomaly lane in its own
  region, outside `ChartAxis`'s provider, is what fires it.
- **The room is reserved and the cost is known.** The chart is **13 drawn
  elements at 6,630 bars** (ADR 0027's silhouette regime), and a burst costs
  **7–13 ms of script**. Per-bar markup at that density is the thing that budget
  cannot absorb: Epic 14 already owns a per-row breach on this page, and its
  reversal trigger is _the first time a second surface renders per-row markup at
  universe scale_.

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

**What this epic must not do with it:** compute a score over a window whose
data stopped arriving and present it as current. A score is a claim about _now_
and the series behind it can be degraded in any of the ways above — including
a gap in the middle that is **indistinguishable from a quiet security**, by
decision and with the measurement behind it (Task 3.10.5). `PRODUCT_SPEC.md`
§11's _every score must carry its explanation_ is where that belongs.
