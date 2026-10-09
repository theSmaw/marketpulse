# Epic 4 — Market Overview

**Status:** **In progress — two of nine complete.** 4.1 (the shell) closed 2026-09-25; 4.2 (the seam and the proxies) closed 2026-09-26.
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

## Stories — split 2026-09-25

**Nine stories, and eight of them put something new on the landing page.** The
order is driven by one property of this epic: **four of its regions are
aggregates over the same map**, so the decisions underneath them are shared and
the screen they sit on has to exist before any of them can be incremental.

| #   | Story                                                                                                                             | Depends on | Visible?                             |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------ |
| 4.1 | [The Decisions This Screen Cannot Be Built Without, & the Overview Shell](story-01-the-decisions-and-the-overview-shell/STORY.md) | Epic 3     | **Yes — the landing page exists**    |
| 4.2 | [The Aggregate Seam, & the Index Proxies That Move](story-02-the-aggregate-seam-and-the-index-proxies/STORY.md)                   | 4.1        | **Yes — four figures, moving**       |
| 4.3 | [Sector Performance, & the Benchmark That Is Not an Average](story-03-sector-performance/STORY.md)                                | 4.2        | **Yes — eleven sectors, ranked**     |
| 4.4 | [Breadth, & the Denominator on Screen](story-04-breadth-and-the-denominator-on-screen/STORY.md)                                   | 4.3        | **Yes — how broad today is**         |
| 4.5 | [The Movers, & the First Surface That Ranks by a Live Value](story-05-the-movers-and-the-first-ranked-surface/STORY.md)           | 4.4        | **Yes — who is actually moving**     |
| 4.6 | [Selection From the Overview](story-06-selection-from-the-overview/STORY.md)                                                      | 4.5        | **Yes — the screen becomes a start** |
| 4.7 | [The Overview's Degraded Set, & the 390 Question Answered](story-07-the-overviews-degraded-set-and-the-390-question/STORY.md)     | **4.8**    | **Yes — honest when the feed stops** |
| 4.8 | [The Overview at Universe Scale, & Epic 14's Trigger](story-08-the-overview-at-universe-scale/STORY.md)                           | **4.6**    | no — and a screen that stays fast    |
| 4.9 | [The Rehearsal, the Sweep, & Epic 4's Close](story-09-the-rehearsal-the-sweep-and-the-epic-close/STORY.md)                        | 4.8        | no                                   |

### Why this order, and not the spec's own listing order

**The shell comes first because it is what makes the next five incremental.**
Without it, every aggregate story owns a piece of layout as well as a
computation, and the epic lands as one big-bang screen at the end. With it,
Stories 4.2–4.5 each fill a region of a page that already exists — which is
four visible increments instead of one.

**The proxies come before every real aggregate** because they are the one
"aggregate" that is not one: four named securities, each its own row in the
map. If the seam cannot serve four known symbols cleanly it will not serve a
breadth count — and a wrong figure is visible in minutes rather than hidden in
a percentage nobody can check by eye.

**Sectors come before breadth** because eleven rows are a denominator problem a
person can sanity-check, and a single percentage over 518 names is not.

**The movers come before selection** because the ranking decision — what
happens to a list while somebody is reading it — has to be settled before
anything on this screen becomes a click target. A target that re-orders between
the decision to click and the click is a defect this screen manufactures every
minute by design.

**The degraded set comes after the screen is complete**, because it is produced
by walking a finished screen through its states; earlier means doing it twice.

**Performance comes after that and before the close**, because a measurement of
half a screen measures nothing, and a figure taken after an epic is called done
is a figure nobody re-takes.

### The four decisions Story 4.1 takes, which four later stories depend on

1. **The denominator** — what _current_ means on a feed that observes about 332
   of 518 names in a median minute. **Stated on screen**, whichever it is.
2. **Where an aggregate is computed** — the backend's `currentMarketState` or
   the browser's `LiveFeedView.observations`. This decides whether Epic 5's
   scores have somewhere to live.
3. **The 390 fold**, which this file already says is owed a person's judgement
   **before this epic ships a screen**. 4.1 asks; 4.7 answers with a phone.
4. **Whether this screen re-orders under live data** — the universe table
   deliberately never does, and this epic ships the first surfaces that must.

### What this epic leaves named rather than built

`PRODUCT_SPEC.md` §9's landing page has **seven** regions — corrected
2026-09-27; this paragraph said _six_ and then named seven, and `CLAUDE.md`,
`landing-route.spec.ts`'s `REGION_NAMES` and the shipped route all say seven —
and **this epic fills
four**. The **market topology** is Epic 6's and the **unusual-activity feed** is
Epic 5's; **current investigations** is Epic 7's. Each renders as a region that
names the epic that fills it, in the idiom the security page already uses for
four of §8.3's seven regions — which is ADR 0029's fourth rule applied to a
whole screen for the first time.

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

- ~~**The sector SPDRs hold S&P 500 constituents only.**~~ — **FALSIFIED
  2026-09-27.** `UNIVERSE.md` §5's amendment of **2026-09-08** says the
  objection is _"dissolved rather than worked around, because the universe IS
  the index"_; §16.3 records 127 of 127 sub-industries mapped and 0 sector
  mismatches. **The surviving caveat is WEIGHTING** — a cap-weighted fund
  against an equal-weighted count of the names we track — and the hand-curated
  classification of the fifteen ETFs themselves. The original text is kept
  below because Story 4.3's decision was taken against it. A tracked equity outside
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
snapshot on connect and a stream of `bars` frames — **up to ~16 a minute, one
per upstream batch, not one a minute** (corrected 2026-09-26 by Task 4.2.1;
`market-stream-protocol.ts` §9.5, and 4,113 frames over 8h49m on 4.1.6's
deployed run) — with §7.6's coverage: about
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

> **Amended 2026-09-25 by Task 4.1.7 — the description was wrong in two ways,
> and what replaces it is worse.** _Below the fold_ is not what happens: the
> status bar is **sticky**, so it is on screen at 390 whatever the scroll
> position, and when the feed drops it **grows from four wrapped lines to six**
> — a size change that moves the page, which is a stronger peripheral signal
> than the word alone.
>
> **What is actually wrong is the timing.** Measured on the deployed site at
> 390: a client that loses its network keeps reading **`LIVE` for exactly
> 165 seconds** before anything changes. The word is driven by the monotonic
> watchdog — no inbound frame for 165 s — not by the socket closing, which the
> browser detects immediately and uses only to start reconnecting.
>
> **So the question this epic inherited is answered and replaced**: nobody
> fails to notice the fold, because for two minutes forty-five seconds there is
> nothing to notice. **Story 4.7 owns the decision**, with the argument and the
> alternatives in its own file.

**This epic is where it matters most.** The overview's whole subject is _what
is happening right now_, so a feed that has quietly stopped is a worse lie here
than on a security page — and the 390 consequence above is owed a person's
judgement **before** this epic ships a screen.

## Reassessed 2026-09-27 after Story 4.2 — four amendments, one re-order, nothing deleted

**The epic's shape survives. Its order had one defect and its governing prose had
three factual errors.** Nothing was split, merged or deleted: no remaining story
was made redundant by 4.2, and the closest candidate — 4.7's state production —
is reduced in **mechanics** (it inherits an 80-photograph grid and the comparison
method) rather than in substance.

### The execution order is now 4.6 → 4.8 → 4.7 → 4.9, and the NUMBERS DO NOT MOVE

**4.7 is the only story in this epic that cannot be finished without an external
event** — a real phone, during a real session, in a booked sitting. Sequenced
ahead of 4.8 it gated a measurement story that runs at any hour on any day.
**Epic 3's record is precisely this failure**: it stayed open for nine stories
because a calendar-dependent obligation sat in front of work that needed no
calendar.

**The numbers are deliberately NOT renumbered.** `CLAUDE.md`: _renumbering a
story means remapping every reference in the same change_, and a blind
substitution corrupts data. `docs/GAPS.md`, ADR 0033's owed amendment,
`LIVE-DATA.md` and four sibling story files all name `Story 4.7` for the
degraded set and the 165-second question. **So the dependency lines moved and
the identifiers did not** — 4.8 depends on 4.6, 4.7 depends on 4.8. A reader
following the table's `Depends on` column gets the execution order; a reader
grepping `Story 4.7` still finds the degraded set.

**What it costs, stated rather than discovered:** 4.7's ~332-frames-a-minute
repair now lands **after** 4.8 measures, so 4.8's decode-side figure is an
**upper bound**. That is the safe direction — the frames are already collapsed by
`sameLiveFeedView`, so they cost decode and comparison but **no render** — and
4.9 re-checks rather than re-measures. Written into 4.8's own file.

### The four decisions Story 4.1 took are all taken, and here is where each landed

This section is written in the present tense above and all four are settled.
Recorded here because three consecutive stories in Epic 3 reached a wrong
conclusion when the sentence that would have prevented it was one file further
than anybody looked.

| Decision                           | Where it landed                                                                                                                                                                                                                          |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The denominator**                | **M = 5 minutes**, taken against a measured by-hour coverage curve (Task 4.1.6). The sentence's three constraints are in 4.4's own file                                                                                                  |
| **Where an aggregate is computed** | **The join**, a pure backend function on a fourth market-stream frame — [ADR 0038](../../docs/adr/0038-the-overview-aggregate-one-join-one-frame.md)                                                                                     |
| **The 390 fold**                   | **The question was wrong and is replaced** (Task 4.1.7): the status bar is sticky and grows from four wrapped lines to six, so nothing is below the fold — but a client reads `LIVE` for **165 seconds** after losing its network. 4.7's |
| **Whether this screen re-orders**  | **It does**, and after 2026-09-27 the treatment is **4.3's** rather than 4.5's — see below                                                                                                                                               |

### Why 4.3 comes before 4.4 — the original argument is FALSE and is replaced

This file said: _"Sectors come before breadth because eleven rows are a
denominator problem a person can sanity-check, and a single percentage over 518
names is not."_ **That is only true if a sector row is an aggregate of our
tracked names.** The owner decided on 2026-09-27 that **a sector row is the
sector ETF's own move, labelled as the benchmark** — eleven named securities
through the existing join, exact, complete, and checkable by eye against any
public quote. So **4.3 has no denominator at all**, and it does not rehearse
4.4's problem.

**The order is still right, for two different reasons.** 4.3 is now small — one
more caller of the join — so it is the cheapest way to prove the seam serves a
set rather than four names. And it is **the first surface in this product ranked
by a live value**, which is the decision 4.4, 4.5 and 4.6 all depend on.

### Story 4.3 gains the re-order treatment, and 4.5 loses it

4.3's acceptance criterion 5 deferred the ranking rule to **Story 4.5, which runs
two stories later** — a backwards dependency that left 4.3 three bad options:
ship an untreated re-order (the defect Task 3.6.3 forbade in as many words — _a
row that moves while it is being read is a row that cannot be read_), ship no
ranking and lose its payoff, or invent a rule and retract it.

**4.3 now owns the ranked-list component and the re-order treatment**; 4.5
applies it and tests it at a mover list's density. Eleven rows is a smaller,
safer set on which to take a motion decision than a top-N over 518.

### Story 4.8 widens from `/` to all five routes

4.2 introduced a cost on four routes that display no overview at all: `useLiveFeed`
is called in `App`, the overview is compared **by identity**, and `computedAt`
moves on every rebuild, so the gate cannot collapse it — ~~**a security page
subscribed to one symbol went from about one whole-tree render a minute to up to
sixteen.**~~ That is §28's **routine** word, not Epic 14's cold load. **Epic 4
introduced it, so Epic 4 measures it**, which is 4.8's own argument — _a figure
taken after the epic is called done is a figure nobody re-takes._

**COUNTED 2026-10-09 by Task 4.8.2, and the struck sentence was wrong twice.**
A security page subscribes to **all 518** — `SecurityExplorer`'s `liveSymbols`
adds every security in the loaded universe, because `UniverseTable` renders on
both of its routes — so it already received a `bars` frame per applied batch
before 4.2 and went **1 → 2** renders a batch, one more rather than fifteen.
And _one a minute_ was the **fixture's** cadence (`tickEveryMs = 60_000`), not
the feed's. Measured on all five routes against the real gateway: **2** renders
per applied batch on `/`, `/securities` and `/securities/:symbol`, **1** on
`/investigations`, `/replay` and the not-found route — which went from **0**,
because they subscribe to nothing and `scopedTo` sends them no `bars` frame at
all. At 6.8–16.1 applied batches a minute that is **13.6–32.2** renders a
minute on the first three and **6.8–16.1** on the last three. The two frames of
a batch are **two tasks**, so the second render is not avoided by browser
batching; whether React coalesces them turns on the inter-frame gap, 4.4–8.4 ms
on `/` and 23.7–33.1 ms on `/securities/:symbol`. The reading is in
`docs/GAPS.md` and the sitting in Task 4.8.2.

### Three additions, each a task inside an existing story rather than a new story

- **The index label in the strip's third row** → a task in **4.3**. Four curated
  labels beside the proxy set, no migration and **no wire field**, because a name
  is a static property of a symbol rather than a reading. Row 3 is permanently
  blank in the ordinary live state today and a cell fills 20–48% of a 325 px
  track at 1440.
- **`AppHeader`'s `composes` defect** → a task in **4.7**. It renders 11px/16px
  against a declared 9px/1 and **it inflated the element whose measured 201 px
  decided what wraps at 390**, which is 4.7's own subject; the repair and the
  re-measure travel together.
- **The focus ring clipped at both sticky edges** → a task in **4.6**, which adds
  the first focusable content inside `.regions` and whose AC 4 (_focus is never
  occluded at any width_) **cannot pass without it**.

## Reassessed 2026-10-07 after Story 4.3 — four amendments, one sequence defect, nothing added or deleted

**Story 4.3 shipped eight tasks and changed what three later stories should do.**
The reassessment is recorded here so the next reader can see that it happened and
what it concluded, rather than finding four unexplained amendments.

| Story    | Verdict                                           | Why                                                                                                                                                                                                                           |
| -------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **4.4**  | **Amended**                                       | It is the next story that adds a region, and 4.3 produced the defect that costs: a region can stay **silent for ever**. Also told which two of its criteria already have mechanisms, and given the corrected 486 px geometry. |
| **4.5**  | **Amended, substantially**                        | **Three of its six acceptance criteria are already met by 4.3**, and its description still presents a decision 4.3 took.                                                                                                      |
| **4.8**  | **Amended**                                       | Epic 14's trigger was evaluated a third time and **did not fire** — and the evaluation exposed that the trigger, as worded, **cannot fire on `/` at all**.                                                                    |
| **4.9**  | **Amended, and a real sequence defect corrected** | It depended on **4.8**, but **4.7 runs after 4.8**. The close was unblocked before the last feature story.                                                                                                                    |
| 4.6, 4.7 | unchanged                                         | 4.6 was swept on 2026-09-27 with the keyboard rule; 4.7 already inherits the degraded-set technique and is unaffected.                                                                                                        |

**Nothing added and nothing deleted**, and both deserve a sentence rather than
silence.

**Why nothing was added.** The obvious candidate is the **three characterised
flakes** that now compound across every merge — one of which failed `verify` on
`main` and caused a `deploy` to be **skipped** on 2026-10-07. That is a real
engineering problem with a real cost, and it is **not market-overview scope**. Two
were repaired the same day; the third is recorded and unowned. Making it a story
here would be scope creep into an epic about a screen, so it is handed to **Story
4.9's close as a verdict to return** — _are this epic's own suites trustworthy_ —
with a named owner outside this epic if the answer is no.

**Why nothing was deleted.** Story 4.5 shrank considerably and is still a story:
the top-N over 518, the agreement with breadth by construction, the bar re-argued
on its own terms, and whether 4.3's treatment survives at its scale. **Its risk is
now the opposite of what it was** — not that the decision is unmade, but that it
will be **inherited without being re-checked** at a scale where the synchrony is
worse rather than better.

### The sequence, stated once, because the numbers no longer match the order

> 4.1 → 4.2 → 4.3 → 4.4 → 4.5 → 4.6 → **4.8 → 4.7** → 4.9

4.7 and 4.8 were swapped on 2026-09-27 and **deliberately not renumbered**, because
a renumber means remapping every reference in the same change and four sibling files
plus `docs/GAPS.md` name `Story 4.7` for the degraded set. The 2026-10-07
reassessment found that the swap **missed 4.9's dependency line** — which is the
cost of not renumbering, landing exactly where that trade-off predicted it would,
and found by reading the chain rather than by anything mechanical. **Nothing checks
a dependency line against the story it names.**
