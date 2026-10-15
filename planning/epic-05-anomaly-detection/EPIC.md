# Epic 5 — Anomaly Detection

**Status:** **In progress — decomposed into seven stories on 2026-10-13, none started.** Eight decisions were taken at Gate 1 and five of them shape the stories that follow; the largest was not in this file at all until today — the store holds **raw** bars, and an unadjusted split is a −90% return at the 100th percentile of every distribution it touches.
**Sequence:** 5 of 15 — follows Epic 4 (Market Overview)
**Spec references:** PRODUCT_SPEC.md §11 (unusual activity detection)

**The universe count every figure below assumes — corrected 2026-10-12.** CI's
store holds **516** securities, not 518, and the equity population is **501**,
not 503 (Task 2.3.9 untracked `PSKY` and `WBD`, two tickers the vendor has never
heard of). **Every figure below is a dated measurement taken at 518/503 and is
left standing as one** — the aggregate frame's **928 B** in CI's shape included,
which is now a frame over 516 `unknown` figures and has **not** been re-taken.
The **deployed** store holds 518 rows of which 516 are active, so an entry whose
re-measure counts rows must say which store it means. `UNIVERSE.md` §17 is the
only place to take the count from.

## Goal

Automatically identify market behaviour worth investigating.

## Outcome

MarketPulse continuously assigns explainable anomaly scores to securities.

## Stories — split 2026-10-13

> 5.1 → 5.2 → 5.3 → **5.4** → 5.5 → 5.6 → 5.7

| #   | Story                                                                                                                                    | Depends on | Visible?                                                                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------ |
| 5.1 | [The Decisions, the Adjustment, & `Relative performance` Drawn](story-01-the-decisions-the-adjustment-and-relative-performance/STORY.md) | nothing    | **Yes** — the first of three reserved regions on the security page fills |
| 5.2 | [The Trailing Window, & the 5-Minute Return](story-02-the-trailing-window-and-the-five-minute-return/STORY.md)                           | 5.1        | **Yes** — `Abnormal-move indicators` draws its first figure              |
| 5.3 | [The Baseline, & the Price Percentile](story-03-the-baseline-and-the-price-percentile/STORY.md)                                          | 5.2        | **Yes** — the percentile appears beside the return                       |
| 5.4 | [`Unusual activity` on the Landing Page](story-04-unusual-activity-on-the-landing-page/STORY.md)                                         | 5.3        | **Yes** — **`/`'s last reserved region fills**                           |
| 5.5 | [The Volume Factor, & the Tape It Rests On](story-05-the-volume-factor-and-the-tape-it-rests-on/STORY.md)                                | 5.3        | **Yes** — `volume 4.1× typical`, with its tape named                     |
| 5.6 | [The Composite Score, & Its Explanation](story-06-the-composite-score-and-its-explanation/STORY.md)                                      | 5.4, 5.5   | **Yes** — **`ANOMALY 91`** and its account                               |
| 5.7 | [The Rehearsal, the Sweep, & Epic 5's Close](story-07-the-rehearsal-the-sweep-and-the-epic-close/STORY.md)                               | 5.6        | no                                                                       |

### Why this order

**Every story from the first one onward puts something new on a screen**, which
is the instruction this split was given. The reserved regions make that cheap:
there are **four** already drawn, named and holding their place — one on `/` and
**three on the security page**, whose own sentences decompose §11's factors
one-to-one and were written by an earlier story that nobody had acted on.

**The two expensive unknowns are de-risked in the middle rather than discovered
at the end.** The 60-day baseline is **11.72M minute rows ≈ 2.23 GiB** against a
256 MB `shared_buffers`, so a full-universe cold pass is **4–13 minutes** and
cannot live in the socket callback, a route or a migration — that lands in 5.3.
**The cost band above is FALSE and is left standing as the dated projection it
was — corrected 2026-10-15 by Story 5.4's Phase 1, which found this file had
never been swept.** Story 5.3 measured the shipped pass over the real store at
**11.78 s warm and 20.67 s cold** (`TASK-02`, two further runs 11.78 / 11.73 s;
[ADR 0044](../../docs/adr/0044-a-derived-aggregate-is-computed-nightly-and-keyed-by-the-session-it-is-for.md)
carries the table), because **516 index scans over a correlated heap is the
bandwidth regime** rather than the random-read regime the projection assumed —
a factor of **20–66×**. The _conclusion_ this premise was used for survives
untouched and is the reason the error is cheap: 11.78 s still cannot live in a
socket callback, a route or a migration, so the nightly shape 5.3 shipped is
unchanged. What the band did distort is the **risk framing** — this was called
one of _"the two expensive unknowns"_ and it is not expensive. Story 5.3's close
propagated the figure **sideways** into Story 5.5 correctly and missed it
**upward** here, which is `CLAUDE.md`'s _falsification travels upward_ rule
failing in the one direction nothing sweeps by itself.
The volume factor rests on **IEX's share of volume, which nothing in this
repository has measured** — that lands in 5.5, which opens by measuring it.

**`Relative performance` is first because it needs no history at all.** The join
already computes `changeFromClose` for all 516 every batch, so the security's
move, its benchmark's and `SPY`'s are three reads from figures already on the
wire — the 0.118–0.123 ms shape rather than the 1.29 ms per-security derivation.

**`/` fills at 5.4 rather than 5.6, and that is as early as is honest.** The
owner asked for the landing page sooner, with bands rather than a numeric score.
The earliest defensible point is **after the percentile exists**, because a band
classifies how unusual something is, and ranking on the relative move alone
while calling the region `Unusual activity` is the over-claim this epic is most
exposed to.

### What this epic deliberately does NOT build

- **No anomaly score in the 518-row universe table.** §9 specifies a short
  list, and `SecurityRow` already composes `AnomalyBadge`, so the edit that
  fires Epic 14's original trigger is twenty minutes long. The refusal is
  recorded in Story 5.1 with its reason.
- **`Anomaly history`** — deferred at Gate 1 with a condition rather than a
  slot: _the first surface that needs a score older than the process_. It is
  the only surface needing scores written down, which means a new table and a
  migration against a store with a live per-minute writer. **Its shape is
  nevertheless drawn** (Story 5.1, `The rail that says how unusual.dc.html`
  §07), so whoever fills it inherits the rail's idiom rather than inventing a
  third one — and the two things it inherits are the **band word beside every
  score**, so a reader comparing today with August compares like with like, and
  the **one-height rule**, which this region is the one place in the rail that
  could drift without cost and is therefore the one place it has to be written
  down.
- **`Investigate`** — not in this epic in any form, not even disabled. A
  natively disabled control is not focusable, so anything `aria-describedby`
  hangs off it is unreachable, and this product has shipped that defect once
  already. It belongs on the security page beside the factors it automates, in
  Epic 7, and that is written into Epic 7's own file.

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
- ~~**The sector SPDRs hold S&P 500 constituents only**, so a tracked equity
  outside the index is measured against a benchmark it is not in
  (`UNIVERSE.md` §5). Fine for a relative move; wrong for anything treating the
  ETF as the sector's membership.~~

  > **DISSOLVED 2026-09-08 by Task 2.8.2; struck here 2026-09-27 by Task 4.3.2's
  > sweep, nineteen days late. Read the replacement, because this epic computes
  > `relative move vs. sector` and the caveat it needs is a different one.** The
  > universe **is** the S&P 500, so the equity this warned about — one with a
  > sector and a benchmark it is not in — **does not exist**, and the eleven
  > sector SPDRs partition the tracked list exactly.
  >
  > **The caveat that survives is WEIGHTING, not membership.** A sector SPDR is
  > **capitalisation-weighted**, so **its move is not the average of its members'
  > moves**. For this epic that is the sharper constraint rather than a softer
  > one: _relative to sector_ measures a security against a benchmark its own
  > largest constituents dominate, so **a mega-cap is largely being compared with
  > itself** and its relative move is structurally damped, while a small
  > constituent's is structurally amplified. Anomaly scores computed from that
  > ratio are **not comparable across securities of different weight** unless
  > something accounts for it. Nothing in this repository measures the effect yet;
  > Story 4.3 is subtitled _the Benchmark That Is Not an Average_ for the same
  > reason and states it on the screen rather than quantifying it.

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

   > **Qualified 2026-10-14 by Story 5.2's close, and the sentence above is
   > still true of `currentMarketState` itself.** There is now a **second**
   > in-memory structure beside it — `trailing-window.ts`, six to seven minute
   > bars per security, ~1.02 MB at universe scale — because a 5-minute return
   > needs the bar from five minutes ago and _assemble it from the store_ would
   > have meant a store read inside the socket's own callback. **It is a sibling
   > rather than a widening** (the owner's Gate 1 decision, with
   > `market-overview.ts`'s precedent), which means **two homes now hold _the
   > newest bar for this security_** — the cost is recorded rather than hidden,
   > with a reversal trigger: _the first time the two are observed to disagree,
   > or the first writer of either that is not `onObservations`_. What has **not**
   > changed is the sentence's reason: this is six bars, not 390, and anything
   > wanting a **series** still assembles it from the store.

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

> **Amended 2026-09-25 by Task 4.1.8 — both halves of that were wrong, and the
> entry it names now exists.** _Below the fold_ is false: the status bar is
> **sticky**, on screen at 390 at any scroll, and when the feed drops it
> **grows from four wrapped lines to six** — a size change that moves the page,
> which is a stronger peripheral signal than a word swap. And `docs/GAPS.md`
> held **no such entry** until this task wrote one; four `EPIC.md` files and an
> ADR had pointed at a record that never existed.
>
> **What is actually wrong is the timing**: a client that loses its network
> reads **`LIVE` for exactly 165 seconds** before anything changes, because the
> word is driven by the monotonic watchdog rather than by the socket closing.
> Nobody fails to notice the fold; for two minutes forty-five seconds there is
> nothing to notice. **Owner: Story 4.7**, with four alternatives priced.

**What this epic must not do with it:** compute a score over a window whose
data stopped arriving and present it as current. A score is a claim about _now_
and the series behind it can be degraded in any of the ways above — including
a gap in the middle that is **indistinguishable from a quiet security**, by
decision and with the measurement behind it (Task 3.10.5). `PRODUCT_SPEC.md`
§11's _every score must carry its explanation_ is where that belongs.

## Handed to this epic by Task 4.1.8 — 2026-09-25: a region on the landing page is reserved for you, and two components are being kept for you

**Epic 4 built the market overview at `/` and left a named region — _Unusual
Activity_ — reserved for this epic.** It is drawn today in the product's
`reserved` state, naming this epic as the thing that fills it, which is ADR
0029's defer rule in a component rather than a spinner that never resolves.

**What you inherit, specifically:**

- **The region exists, is named, and holds its place in the grid** at every
  width. It does not have to be designed into the layout; it has to be filled.
- **The regions keep their names, order and landmarks** when the layout changes
  for Epic 6's topology, so nothing you build against them moves.
- **Story 4.5 ranks the day's movers** and settles whether the overview
  re-orders under live data. An unusual-activity feed is the second ranked
  surface on that screen and should not re-take that decision.

**And two components from Story 1.4 are being kept rather than deleted, for
this epic:**

- **`AnomalyBadge`** renders `PRODUCT_SPEC.md` §11's 0–100 band **with its
  explanation**, which is that section's own requirement. It was built with
  **four named bands rather than a gradient**, deliberately, because a band can
  be labelled and a gradient cannot. Deleting it would throw away a decision
  this epic would have to re-take.
- **`SecurityRow`** is the ancestor of `UniverseTable`'s rows and the place the
  anomaly band met a price.

**Both are currently rendered by nothing shipped** — Task 4.1.4 removed their
last consumer — and `pnpm verify` cannot see that, because `pnpm stories`
asserts the opposite direction. **They are knowingly unrendered, not forgotten**,
and the disposition is this epic's: adopt them, or delete them and record where
the decisions went.

## Handed here by Story 4.4 — 2026-10-07: breadth exists, its window is measured, and its denominator problem is already solved

**`PRODUCT_SPEC.md` §11 names breadth as one of the four anomaly factors, and as
of 2026-10-07 this product computes one.** Four things 4.4 settled that this epic
should inherit rather than re-decide.

**1. The module, and it is a sibling of the join rather than part of it.**
`apps/backend/src/market-breadth.ts` exports
`marketBreadth(entries, { asOf, marketOpen })` over `MarketOverviewEntry[]` — a
**pure** function, every input an argument, no clock and no repository handle,
which is what makes invariant 4 structural here. It is called from the one
overview call site in `index.ts` over the **501 equities** (the 516 less the
fifteen proxies, selected by a **positive** membership set). A sector-level or
industry-level breadth is the same function over a filtered `entries`, and it
costs **0.041 ms median over 503 entries** — measured, and **about 3%** of the per-batch join as
re-measured on 2026-10-10 (1.521 ms p50, Task 4.8.11) — the **1.2%** this line
carried until 2026-10-12 was 0.041 against Story 4.4's **pre-repair** 3.497 ms.
Eleven calls is still ~0.45 ms and still cheap; take the share from a
re-measure rather than from this sentence.

**2. The window is 5 minutes and it was MEASURED, not chosen.**
`BREADTH_WINDOW_MINUTES = 5`, from Task 4.1.6's 390 sampled minutes of a session.
The window is applied to each bar's **own instant** (`bar.startsAt`) against the
aggregate's `asOf` — **never `CurrentObservation.ageMs`**, which is computed on
read with its own wall clock and would both put a second clock in a pure function
and be wrong under a replay. A bar arrives ~0.5 s **after** the minute it
describes has ended, so a window keyed on anything but `startsAt` shifts every
figure by a minute.

**3. The same window must filter the numerator AND the denominator, and this is
the failure the whole story exists to prevent.** `marketBreadth` is one pass with
three accumulators whose **sum is `measured`**. If the buckets folded over the
whole map while `measured` was windowed, the surplus would land in `unchanged` —
**collapsing _unchanged_ into _not heard from_**, invisibly, with every number
well-formed. Any breadth this epic computes over a subset owes the same property,
and the cheapest way to have it is to compute the denominator as the sum rather
than as a second measurement.

**4. §11's example is a PERCENTAGE and this product ships COUNTS, deliberately.**
§11's wording is _82% of semiconductor securities currently negative_, and §9's
sketch drew three percentages. **The shipped region draws counts with a stated
population** — _"Of the 503 companies we track, 451 were heard from in the last
5 minutes"_ — and §9 now carries a dated amendment saying why. The reason
transfers directly to an anomaly factor: **a percentage hides its denominator**,
and the denominator here is not the sector's membership but _the part of it we
heard from in the window_, which on IEX is a fact about our reach rather than
about the market. If this epic's breadth factor is normalised into a 0–100 score,
the score's **explanation** — which invariant 1's _every score carries its
explanation_ requires — has to state the population it counted over, or `82% of
semiconductors are negative` will be said about however few of that industry
group were heard from — and the floor this epic already owns is **six equities
per sector**, so the arithmetic can be over a handful by design.
`docs/GAPS.md` carries the entry on the four distinct reasons a security can be
in the unheard remainder; three of the four are facts about our tape.

**And `directionOf` is in `packages/shared`** since Task 4.4.2 — the single
definition of what _up_, _down_ and _unchanged_ mean, keyed on the **displayed**
percentage rather than the raw one, so a figure that renders `0.00%` counts as
unchanged. A breadth factor that classifies with its own comparator will disagree
with every glyph on every screen at the rounding boundary.

## Handed here by Story 4.5 — 2026-10-08: the ranking rule has one home, and it is not named for sectors any more

**Three things exist now that did not when Story 4.4 wrote to this file**, and
all three are things an anomaly-ranked list would otherwise re-invent.

**1. The comparator is renamed and is about a MOVE rather than a sector.**
`sectorRankingKey` → **`moveRankingKey`** and `compareSectorFigures` →
**`compareByMove`**, in `packages/shared/src/sector-ranking.ts`
(`rankSectorFigures` keeps its name — it genuinely ranks the eleven roster).
The rule is unchanged and is the one to reuse rather than re-derive:
**descending by the figure's own move; a figure with no ranking key is not
ranked among the ranked; two figures equal at displayed precision never
swap**. No default and no `?? 0` anywhere.

**2. There is a bounded two-ended selection, and a reason not to sort.**
`selectMovers(figures, limit)` returns disjoint `{ gainers, losers }` in one
pass. Measured over 503: **0.155 ms against a full sort's 0.57** — and the
residue is _the price of one rule_, because the comparator takes two
**figures**, so every comparison re-reads and re-rounds the key. **Caching
that would need a comparator over keys, which is the second comparator the
check below forbids**, and the cost is bought deliberately.

**3. A second comparator is now refused by `pnpm invariants`.**
`one-comparator-for-the-order-of-a-move` keys on **two moves either side of
one operator** — subtraction or inequality, with a 32-character window on each
side. Deliberately not keyed on `.sort(`: a second ranking needs neither the
comparator nor the figure type nor `.sort(` (a heap, a `reduce`, a
hand-rolled insert all qualify), **but every one of them puts two moves either
side of an operator**. There is no exemption list, so there is no escape
hatch.

**What that means for an anomaly score.** If this epic ranks securities by a
score rather than by a move, it is ranking a **different quantity** and the
check will not see it — which is correct, and is also the moment to ask
whether the score's ordering rule should share the three properties above.
**The two that transfer regardless**: a security with no score has no rank
(`?? 0` is ADR 0029's false impression expressed as a position), and two
scores equal at displayed precision must not swap, or the drawn order
contradicts the drawn figures.

**And the denominator problem is sharper for a score than it was for a
ranking.** `Movers` states _"Of the 503 companies we track, 466 were heard
from in the last 5 minutes. Both lists are ranked over those."_ — because a
top ten over an incomplete population **may not be the top ten**, and a ranked
list looks equally confident either way. An anomaly list inherits that whole
problem **plus** invariant 1's requirement that every score carries its
explanation: the explanation has to state the population it was computed over,
or `82% of semiconductors are negative` gets said about whatever few of that
industry group were heard from.

## Handed here by Task 4.8.8 — 2026-10-09: Epic 14's trigger now has a SECOND condition, for `/`, and this epic can fire it and the backend one in the same story

**This file already quotes Epic 14's trigger twice** — in _"A condition this
epic is most likely to fire"_ and again under Story 3.6's close — and both
quotations are still exactly right. **What is new is that there are now two
conditions rather than one**, because the original is written against
`/securities` and cannot fire on the landing page at all. Written here in words
this epic can act on rather than as a link, because this is the epic the
trigger was written **about**.

### The two conditions, as they stand on 2026-10-09

**The original, unchanged, for `/securities`** — _the first time a **second**
surface on that page renders per-row markup at universe scale_. An
`AnomalyBadge` in every row of the tracked-universe table is the thing it was
written for, and this file has said so since 2026-09-22.

**The new one, for `/`** — _**the first surface on `/` that renders one element
per tracked security**_. **First**, not second, and that is deliberate: on
`/securities` the first such surface **is already the breach**, so the question
there is when it doubles; on `/` the first one **creates** a breach, because the
518-security payload both routes fetch is **already paid** (≈6 ms) and the
518-row markup is **not** (≈48 ms). Do not harmonise the two wordings — the
words differ because the baselines differ.

**And a third condition, on the backend, which is where a score per security
would actually be computed** — the overview join's own callback. It has two
halves, both counts:

- _the first time the subscribe message in `apps/backend/src/alpaca-stream.ts`
  carries a channel other than `bars` and `updatedBars`, **or** the aggregate is
  produced from a call site the three existing on 2026-10-09 do not include_
  (held by `pnpm invariants`' `the-aggregate-has-three-producer-paths`);
- _the first computation added to that callback that **derives a figure per
  security**, rather than ranking or counting figures the join has already
  produced._

### Why this epic can fire two of them in ONE story, and what that costs

**1. `AnomalyBadge` already exists, and so does its row.**
`apps/frontend/src/components/AnomalyBadge/` ships with stories and tests, and
`apps/frontend/src/components/SecurityRow/SecurityRow.tsx` **already composes
it** (`<AnomalyBadge band={band} />`). Neither is in any route — `SecurityRow`
is referenced by its own stories, its own test and one CSS comment, nothing
else — so **the edit that fires the trigger is far smaller than the condition
sounds**: a band per row, into a component that already draws one. That is the
whole warning. A condition that takes a day to fire gets noticed; one that takes
twenty minutes does not.

**2. The cold-load repair comes with it, and it is measured rather than
asserted.** `/securities` draws a long animation frame of **62.8–77.4 ms on 10
of 10 cold loads** today (Task 4.8.6, production build, 1440×900, 40
interleaved loads). **≈48 ms of it is the 518-row markup** — the attribution is
licensed by a **20-row control on the same artefact in the same session**, which
collapses the worst frame to the one-frame floor, and the frame's own split
agrees from inside: script 26–31 ms on both routes, and the whole difference in
**style, layout and paint, 34–38 ms over 9,871 extra nodes (10,318 against
447), ≈3.9 µs a node**. A per-row badge is markup over the same row count on
the same page. **If this epic puts a score in that table, the repair
(`SEARCH-AND-SELECTION.md` §10's three candidates) is due in this epic and not
at Epic 14's convenience.**

**3. The cheap product answer and the cheap performance answer are the same
answer.** `PRODUCT_SPEC.md` §9's _Unusual Activity_ panel is **a short list, not
518 rows** — and `/`'s reserved region for this epic is that panel. A top-N
ranked list fires **neither** condition: `Movers` renders ten rows on `/` and
Story 4.5's verdict on exactly that question was recorded in Epic 14's file and
did not fire. So the version of this feature that §9 already specifies is also
the version that costs nothing to draw. Choosing the other one is fine;
**choosing it by accident is not**, and this paragraph exists so that it is a
choice.

**4. On the backend: rank what the join produced; do not re-derive it there.**
This is the sharpest number this epic inherits. Story 4.5's top-N over 503
securities, inside the same socket callback, cost **0.28–0.41 ms** (re-taken by
Task 4.8.3 on interleaved arms at **0.118–0.123 ms**) because it **ranked
figures the join had already produced**. A **per-security derivation** in that
callback is a different shape entirely: the one this product has measured is
`marketDateAt` over 518 instants, at **1.29 ms** after Task 4.8.7's repair and
**3.37 ms** before it — an order of magnitude more than the ranking, for one
conversion per security. A score per security computed in that callback is that
shape, not Story 4.5's. The join's own entries already carry a price, a
`change` and a `direction`; read them.

### Two measurement rules this epic will otherwise rediscover

**No gated machine has ever seen any of this cost, and none can.** CI's store
is 518 securities and **zero bars**, so the join reads **0.013 ms** with nothing
observed and the aggregate frame is **928 bytes** for ever. `pnpm e2e` cannot
assert any figure here, and jsdom computes no layout so nothing below it can see
the cold load either. Every performance claim in this epic will have to be taken
locally against a populated store, with the instrument proved by a plant on the
page that produced the figure.

**And every absolute figure above is a tight-loop figure on one laptop.** At a
250 ms gap the same backend computation reads ×2.4–3.5 higher — and so does a
fixed-cost control that does no ICU work and no allocation, so the inflation is
this machine waking from idle rather than the computation. The **ratios** are
safe and the **absolutes** are not a production cost on any machine.

> **Amended 2026-10-10 by Task 4.8.10, sweeping Task 4.8.11 — _the ratios are
> safe_ is withdrawn.** Re-taken on one arm with the calibrator
> **re-referenced at the gap** and the arms rotated per burst: the calibrator
> inflated **2.29×** (1.217 → 2.792 ms) while the subject inflated **4.38×**
> (1.521 → 6.662 ms) on the same bursts — two ratios a factor of ~1.9 apart.
> So a gapped figure corrected by the calibrator's own inflation would have
> **under-reported by nearly half**. **A gapped absolute is an upper bound on
> the shape and nothing more**, and this epic should not plan to recover a
> production figure from a gapped one by division. The browser half below is
> unaffected and still reads ×1.00. (That arm also discarded **19 / 60**
> windows at load ratio 0.744, which is its own warning about what a gapped
> Node arm can be asked for.) The
> **browser** side carries **no such multiplier**: the identical calibrator reads
> **×1.00** in a visible renderer at gaps of 3.7 s and 8.8 s, five arms out of
> five. **Two caveats, not one** — a verdict that treats them as one will be wrong
> about one of them.

## Handed here by Task 4.7.11 — 2026-10-12, at Story 4.7's close: `Unusual activity` is one of the seven regions, and three measured things govern the day you fill it

Written here rather than linked, because a pointer is what a reader follows
when they already know to look. **The grep-shaped sideways pass does not find
this epic** — Story 4.7's documents name it nowhere. It was found by walking
the epic list and asking _did 4.7 measure anything Epic 5 acts on_.

**1. The region you fill is drawn today in `Panel`'s `reserved` state, and the
degraded set found that treatment doing two jobs.** At 1440, with four regions
waiting for a frame, **the three regions this product has NOT built read as
more intentional than the four it has** (Task 4.7.5, photographed): yours is
hatched, carries an `EPIC 5` tag and a sentence saying exactly what will go
there, while a region waiting for data is a plain void with one 12 px grey
sentence. And in the other direction, **a rollback that omits a section draws
the region exactly like yours** (Task 4.7.9, row 08) — the same hatch, the same
muted sentence, differing only in the **absence** of an `EPIC n` badge, which
is an absence rather than a statement. So _this gateway is behind_ and _this is
next year's_ are one picture. Both findings are routed to UX/Design and the
owner rather than repaired; the day you delete your `reserved` panel, **the
second half is still live for Epic 6's**.

**2. Your region joins a kept state grid, not a one-off.**
`e2e/specs/overview-degraded-grid.spec.ts` produces thirteen states at four
widths over **seven surfaces** and asserts the collapse as **declared
collision classes** — the partition of rows by drawn string must equal the
partition by declared class, pairwise, so an accidental collapse **and** a
documented exception that has stopped holding both go red. A new region with
figures means new surfaces in that comparison, and the rule the partition
expresses is worth knowing before you add one: **a content class is ONE
AGGREGATE**, because `main` is a pure function of the aggregate and ADR 0029's
one-home rule keeps the connection, the service and the market session in the
chrome. `DEGRADED_GRID_PHOTOS=1 pnpm e2e overview-degraded-grid.spec.ts`
re-produces all 104 pictures in ~1.4 minutes.

**3. A region that waits adds a fifth apology, and the order is NOT the
repair.** Four regions say `No prices yet.` / `No count yet.` /
`No sector moves yet.` / `No moves to rank yet.` at the 2,000 ms floor. Looked
at on a real page (Task 4.7.5): **at 390 no two of the four are ever
co-visible** — the page is 2,735 px in that state and the gaps between the
sentences are 400–700 px — and the explanation is **not** at the foot of the
page, because the status bar is sticky and sits ~250 px under the first
apology at any scroll. So reordering cannot help, and the four-noun vocabulary
is kept by decision: four nouns is what tells a reader **which** region went
quiet. Whatever sentence your region says when it has nothing, say it in its
own words and make it honest at zero — ADR 0029's defer rule, and
`docs/GAPS.md` entry 13.

**4. One keyboard fact that is now structural.** `Region` remembers the element
that last held focus inside it and focuses its own `<section>` when that
element is removed while `document.activeElement` is the body (Task 4.7.6) — so
a reader whose rows vanish under them lands on the region rather than on
`<body>`. It composes rather than replaces: a child's better landing still
wins. If your region holds its own focusable rows, you inherit the backstop and
owe nothing; if it holds a roving list, read Task 4.6.5 and ADR 0039 first.

### And a fifth thing, handed here by Epic 4's close — 2026-10-12 (Task 4.9.4): `Unusual activity` is the first region on `/` that has ever overflowed, and it does so with a placeholder in it

**Your region sits on the one grid row with no content floor.**
`MarketOverview.module.css` sets `grid-template-rows: calc((82vh - 2 *
var(--space-24)) * 7 / 30) repeat(2, minmax(min-content, 1fr))` — row 1 is a
viewport-derived length, rows 2 and 3 are `minmax(min-content, 1fr)` and have a
floor. `Unusual activity` and `Market topology` are the two on row 1.

**Measured at thirteen width/height pairs** (`clientHeight` against
`scrollHeight`, every `section[aria-labelledby]`, both routes): at **1440×680**
`Unusual activity` is **117 / 121 — it scrolls by 4 px today**, with nothing in
it but the hatched `EPIC 5` placeholder; at **1440×500** it is 82 / 121 and
`Market topology` joins it; at 1280×480 the same. Nothing scrolls at 1440×700,
and **0 of 8** regions scroll on `/securities` at any pair. The earlier claim
_no region on `/` scrolls at any of the four widths_ was four width/height
pairs, not four widths, and is false.

**So a ranked list of scored securities in that region will clip rather than
grow.** Decide, before the region ships: a content floor on row 1, an internal
scroller with its own affordance, or a count that fits the resolved track at the
shortest viewport you support. And note two consequences: **ADR 0039 makes the
region a tab stop unconditionally**, so a scrolling box that contains something
focusable is invisible to axe's `scrollable-region-focusable` for ever —
`expectEveryRegionIsATabStop` in `e2e/support/app.ts` replaced it — and a
region that scrolls at 680 but not at 700 is a state no photograph at four
widths will ever contain.
