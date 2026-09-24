# Story 3.9 — The Live Edge on the Chart & the Two-Feed Ledger

**Status:** **Nine tasks — 3.9.1, 3.9.2 and 3.9.3 all complete on 2026-09-24, and 3.9.4 deleted by the third of them.** The chart extends while you watch it, and the treatments for the seam, the arriving bar and the correction were argued against it and all three rejected, each with a measurement and a trigger — so there is nothing left for 3.9.4 to apply. Originally: **Split into ten tasks 2026-09-24; Task 3.9.1 complete the same day, and it did what it was written to do.** Two criteria are **already met** by Story 3.8 and struck below; **open decision 1 is withdrawn** because the case cannot occur — the vendor sends a bar for minute _M_ at the end of _M_, so no partial bar exists anywhere; and the largest finding was on nobody's list: **the chart closes up its own gaps and its spoken sentence claims a cadence it does not have**, shipped today, on stored consolidated data. Previously: The order puts the **headline visible change third from the start and undesigned** — a chart that extends with no vocabulary yet — because Story 3.4 proved that a motion vocabulary argued in front of the real thing moving is a different and better argument from one argued against a mock. Task 3.9.1 comes first and builds nothing: **Story 3.8 may already have met criteria 1 and 2 in part**, and this story's own file says _read it again rather than building what shipped_.
**Epic:** [Epic 3 — Live Market Data](../EPIC.md)
**Depends on:** 3.6, 3.8
**Epic scope covered:** live price updates in the UI (the chart), the two-feed ledger produced rather than simulated, the live feed's own honest label on a series

## Description

The chart reaches **now**, and in doing so this product draws its first series
that came from **two different tapes** — which is the case its provenance
machinery was built for and has never once been able to produce.

Two things land together because they are the same event:

**The live edge.** `GET /market-data/bars` already stitches stored bars to a
tail fetched from the historical API, clamped to `now − 16 min` because the free
plan refuses the most recent fifteen minutes outright — a `403` cliff keyed on
`end` alone. So a chart of today is already **two sources** and is already
sixteen minutes behind. This story extends it past the cliff with the socket's
own bars, which is the only instrument that can see that window at all.

**The ledger, produced for real.** `market-provenance.ts`'s
`describeSeriesFeeds` names each stretch in contribution order with its bar
count and **refuses to sort or deduplicate to the first** — that is the sentence
invariant 6 exists for. **No server this product runs can produce it**: all
sixteen recorded bar-series bodies carry `sip`, `stitched.json` included,
because both halves of that stitch came from Alpaca's historical API. The state
is reached today through **`twoFeedStitchView()`** — the recorded stitch with
one field changed, named and commented so that _deleting it and pointing its
three readers at a real recorded body is the obvious move._ **This story is that
move.**

> **Amended 2026-09-23 by Task 3.7.5 — the server half of that sentence is
> no longer true, and that is this story's good news.** `readSeries` now
> produces the list from stored rows: one `BarSource` per contiguous run of
> tape, in the order the bars sit, each with its bar count and its own
> `retrievedAt`, joined through `mergeSeriesProvenance` — proved in
> `pnpm test:database` against a window the shipped writer wrote as SIP then
> IEX, and on the wire through `app.inject()`. What is still true: no
> **deployed** store holds two tapes until Story 3.8 writes one, and the
> frontend's fixtures are unchanged, so `twoFeedStitchView()` is still how a
> story or a test reaches the state in the browser. Two things this story
> can act on: the real recorded body it deletes the stitch for can be taken
> from a local store the moment 3.8 lands (`TAPE.md` §8); and the note's
> `formatRetrieval` already ranges over every source's date, so a two-stretch
> series retrieved on two days renders `4–8 September 2026` with no change —
> read it against a real body rather than assuming it.

## What the user can see when this story lands

**A chart that reaches the current minute**, on `/securities/:symbol` with the
market open, extending as the session runs rather than stopping sixteen minutes
short of it.

**And a source note that tells the truth about a split series** — the stretches
in contribution order with their counts, the consolidated tape for the stored
part and a single named venue for the live part, with the sentence that says
what a single venue is. It is the first time a reader sees that sentence about
real data rather than about a fixture.

What the user still cannot do: reload the page and still have today (Story 3.8 —
today's session is not stored, so a cold load starts from the sixteen-minute
edge again), or see an honest account of a feed that has dropped mid-session
(Story 3.10).

## Why it sits here in the sequence

**After the table, because it is the harder surface**, and after the vocabulary
because a chart redrawing is exactly what `VISUAL-LANGUAGE.md` refused to
specify without a moving number.

**Before Story 3.8, deliberately.** Storing live bars would make today available
on a cold load and remove the sixteen-minute gap — and it would also make this
story's ledger come out of the database instead of out of the stitch, which
would answer a different question. The read-time stitch is the case the
provenance design was built against and it is worth producing once, honestly,
before the store gets involved.

## Scope

- **The live tail on the series**, past the clamp the historical API enforces.
  Note what that clamp is: **mandatory rather than polite** — the plan refuses
  the whole request, so a served window was already ending short of now and this
  is the first thing that can fill it.
- **The seam, drawn.** `CHARTING.md`'s axis is **session-ordinal**, and its
  coverage rule is already exactly right for this: _a mark derived from the
  window runs the full frame while a mark derived from the bars stops at the
  coverage edge._ A live edge is the coverage edge moving, which is the first
  time that rule has done work.
- **The ledger, out of `describeSeriesFeeds` and onto the source note.**
  `PROVENANCE.md` decision 2 settled the wording: name the split, in
  contribution order, with the counts. It ships and it has never described a
  real series.
- **`twoFeedStitchView()` deleted, and its three readers pointed at a recorded
  body** — a real one, captured from the running system, in the fixture idiom
  `src/fixtures/alpaca/` already holds: **raw, unformatted, excluded from
  Prettier and from line-ending normalisation, because both rewrite evidence.**
- **The sentence that is correct today and becomes false here, with nothing
  mechanical standing between the two.**

  > `No shares changed hands anywhere in the window.`

  It is **the only shipped sentence making a claim about the market rather than
  about our store**. It is true while every stored bar is the consolidated tape;
  the first time a live IEX tail is stitched on, it reports **a single venue's
  silence as the whole market's** — which is precisely the failure §7.1 forbids,
  in the one place a reader would never look for it. On IEX this is ordinary
  rather than theoretical: median minute coverage **82.8%**, worst case
  **43.1%**. It has **two homes today, drawn and spoken**, and one fact has one
  home is already this repository's rule — so the repair is one string with two
  renderings, and a second copy fails the build.

- **The gaps this chart cannot draw, which it turns out it already has.**
  Added 2026-09-24 by Task 3.9.1, measured on the deployed site over one stored
  session: `ERIE` drew **131** bars at **4.3 px** apart and `NVDA` drew **390**
  at **2.1 px**, and **both ran the full width of the frame**. The
  session-ordinal axis closes gaps up by design (`CHARTING.md` §3, whose
  reversal trigger is evaluated there and has **not** fired) — but the chart's
  spoken sentence says `a line of 131 closing prices, **one per trading
minute**` over a 390-minute session, which is a claim about **cadence** with
  nothing behind it. It ships today, on stored consolidated data, with no live
  feed involved. **Handed to Task 3.9.8**, which already owns a drawn-and-spoken
  claim that outruns its data.
- **The chart's own motion, or its absence.** `VISUAL-LANGUAGE.md` is explicit
  that a chart animating its own first paint is decoration rather than a market
  moving. A chart whose **last bar** grows is a different thing and is this
  story's to decide, inside Story 3.4's vocabulary rather than beside it.
- **The volume chart on the same axis.** The two plots share one time axis and
  answer one reading from one crosshair; a live edge that reached one and not
  the other would be a visible defect and an accessibility one.
- **What the crosshair reads at the live edge**, where the last bar is a
  **partial minute**. A partial bar is a real value that is not yet final, and
  whether it is drawn differently is a decision this story owns.

## Out of scope, and who owns it

- Persistence of any of it — Story 3.8
- The degraded states of a live chart — Story 3.10, which owns what the plot
  does when the feed stops mid-session with half a session drawn
- The tape column on `market_bars` — Story 3.7. **Nothing here is stored**,
  which is exactly why this story can precede that migration
- Comparison series, anomaly marks and the filing lane — Epics 5, 8 and 9, each
  of which already has room reserved on this chart

## Open decisions — settle with the user

1. ~~**Whether a partial final bar is drawn as a bar.**~~ **WITHDRAWN
   2026-09-24 by Task 3.9.1 — the case cannot occur.** `LIVE-DATA.md` §7
   measured that _a minute bar arrives about half a second after the minute it
   describes has ended_, and `live-bar-writer.ts` says the same from the other
   side: a bar that arrives is a finished minute. There is no partial bar on the
   wire, none in the store and none a browser can hold. The decision as written
   was a rule prepared for a situation that does not exist.

   **What replaces it has a different shape and is not a drawing decision.** The
   last bar _does_ change after it is drawn — §7.8's `updatedBars` revision
   arrives ~30 s later, measured at **0.064% of bars, 35.3% of them changing the
   close**. That is a complete bar being corrected, and it is Task 3.9.2's
   replace-in-place rule. The original text is kept below as the record of what
   was assumed:

   > It is a real observation of an incomplete minute, and drawing it
   > identically to the 389 complete ones is a small false impression of the
   > same family `PROVENANCE.md` is built to refuse — _a claim about data
   > requires data._

2. **What the source note says when the live half is empty** — the market is
   open, the socket is up, and this thin name has not traded for eleven minutes.
   That is three true facts and one of the rules says a clause renders only when
   its own data is present.

## The design bar

**The chart is this product's centrepiece on this screen**, and a live edge is
the single most demonstrable thing in the epic — _is there a moment worth
showing somebody_ has an obvious candidate for the first time.

The risks are specific. A plot that redraws wholesale every minute reads as a
page reloading rather than as a market moving. A seam drawn too loudly turns a
provenance fact into a decoration; drawn too quietly it is a claim the chart is
not making honestly. And the source note is already carefully held to two lines
— a two-feed ledger is more text than it has ever carried, and the rule that
keeps it from becoming a footnote pile is worth re-reading before adding to it.

## Acceptance criteria

1. A chart of the current session reaches the current minute and extends as the
   session runs, without a page refresh — **first half MET for a liquid
   security since 2026-09-23 (Task 3.8.3), and structurally unreachable for a
   thin one**, measured by Task 3.9.1: the live writer puts the store's edge
   ahead of the vendor's clamp, so the stitch costs no request and contributes
   nothing and the answer is the store's. Where the feed reports 2.1% of a
   name's minutes, the missing ones are minutes IEX never sent. **The second
   half — _extends without a refresh_ — is unbuilt**, and is Task 3.9.2
2. ~~A two-feed series names both stretches **in contribution order with their
   counts**, and neither is dropped, sorted or deduplicated~~ — **MET by Task
   3.7.5 and drawn from real rows by Task 3.8.3**; what Task 3.9.7 owes is the
   **photograph** and the proof that the read-time **stitch** produces it too,
   because since the re-order the stored path is the one a user sees
3. ~~The live stretch's label names a single venue with the sentence saying what
   that means~~ — **MET**: `namesFeeds` renders the clause whenever the series'
   feed differs from the configured one, which mid-session on a `1D` window is
   every liquid security (`iex` against a `sip` chrome). **`Epic 2's `All US
   exchanges` appears nowhere on a live tail` is NOT met and stays here** — it
   is a check nothing performs, and Task 3.9.7 owns it
4. `twoFeedStitchView()` is gone from the tree, and the state it simulated is
   reachable from a recorded body — checked by a grep that goes red, with a
   `pnpm break` entry
5. ~~The market-claim sentence is repaired, has **one** home, and a second copy
   fails the build. A check, and the break that proves it~~ — **met 2026-09-24
   by Task 3.9.8**, and it was **two** sentences rather than one: the silent
   window's, repaired by naming its reach off the series' own tapes, and the
   cadence clause handed here by Task 3.9.1, repaired by **deletion**. One
   home is `describeSilence`; the check is
   `the-market-claiming-sentence-has-one-home` and the break is
   `the-market-claiming-sentence-gets-a-second-home`
6. ~~No main-thread task over 50 ms while the chart is extending, at the default
   window and at the cap~~ — **met 2026-09-24 by Task 3.9.9 at the default
   window and at 6,630 bars: 7.2–8.1 ms and 12.3–13.2 ms of script a burst,
   zero frames over 50 ms across 160 bursts.** The **cap itself is
   unmeasured** — this machine's store ends 2026-09-11 and the densest real
   body it serves is 68% of the cap. `CHARTING.md` §18 carries the figures
7. The reading strip, the crosshair and the keyboard walk all work at the live
   edge, ~~including on the partial final bar~~ — **there is no partial final
   bar** (Task 3.9.1); what the edge does instead is **change under the reader**
   when a revision lands, which is the harder half and is Task 3.9.6's
8. `pnpm probe` at all four viewports; a person watched the chart extend during
   a live session before the suite ran
9. `pnpm verify` passes

## Tasks

**Ten, and the first one builds nothing on purpose.** This story was written
when the store stopped at yesterday's close; Story 3.8 changed that on
2026-09-23, and four of that story's ten tasks found that **the written-down
hazard was not the real one** — each settled by a single query before any code.
Task 3.9.1 is that query for this story, and it may retire a criterion or two
before the first line is written.

**After it, the visible change is as early as the dependency graph allows.** A
chart that reaches the current minute and keeps going is the most demonstrable
thing in this epic, and it ships **undesigned** in 3.9.2 — the same shape Story
3.4 used, where 3.4.2 shipped a price that moved with no vocabulary and the four
treatments were then argued in front of it. Everything from 3.9.3 on makes that
correct, honest and readable rather than adding to it.

| #         | Task                                                                                                                                             | Depends on   | Visible?                                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ | ------------------------------------------ |
| 3.9.1     | [What the chart already reaches, measured before anything is built](TASK-01-what-the-chart-already-reaches-measured-before-anything-is-built.md) | 3.8          | No — and it may shrink this story          |
| 3.9.2     | [The edge that extends, with no vocabulary yet](TASK-02-the-edge-that-extends-with-no-vocabulary-yet.md)                                         | 3.9.1        | **Yes — the headline, and it is early**    |
| 3.9.3     | [The seam, the partial bar, and treatments on a real edge](TASK-03-the-seam-the-partial-bar-and-treatments-on-a-real-edge.md)                    | 3.9.2        | No — the argument and the artefacts        |
| ~~3.9.4~~ | ~~The vocabulary applied to the edge~~ — **DELETED 2026-09-24 by Task 3.9.3**: three decisions, three noes, so there is nothing to apply         | —            | —                                          |
| 3.9.5     | [The volume chart, which must move with it](TASK-05-the-volume-chart-which-must-move-with-it.md)                                                 | 3.9.2        | **Yes — both plots, one axis**             |
| 3.9.6     | [What the crosshair reads at a minute that is not finished](TASK-06-what-the-crosshair-reads-at-a-minute-that-is-not-finished.md)                | 3.9.5        | **Yes — the edge becomes readable**        |
| 3.9.7     | [The two-feed ledger, and the stitch nothing exercises](TASK-07-the-two-feed-ledger-and-the-stitch-nothing-exercises.md)                         | 3.9.1        | **Maybe — Story 3.8 may have drawn it**    |
| 3.9.8     | [The sentence that claims something about the market](TASK-08-the-sentence-that-claims-something-about-the-market.md)                            | 3.9.7        | **Yes — one sentence stops being a lie**   |
| 3.9.9     | [The measurements this story owes](TASK-09-the-measurements-this-story-owes.md)                                                                  | 3.9.5, 3.9.6 | No — figures, and a repair if one breaches |
| 3.9.10    | [The sweep, the hand-offs and the close](TASK-10-the-sweep-the-hand-offs-and-the-close.md)                                                       | 3.9.9        | No                                         |

**Task 3.9.4 was deleted on 2026-09-24, by Task 3.9.3 answering NO three
times.** The seam is not drawn (the source note already says it in words with
counts, and a drawn break would be the only break on a chart that hides dozens
of invisible gaps); the edge does not mark (a new minute buys **0.4 px** at the
default window and **2.1 px** on a single session, and the same event is
already marked by a disc inches above it on the same screen); and a correction
is not drawn (it would mark the quietest version of the event and leave the
loudest — a re-scaling value axis, median 2.4 px and up to 77 px — unnamed).
Each carries a reversal trigger as a condition. Its one real obligation, a look
at four viewports with the feed running, already belongs to Task 3.9.9.

**Why 3.9.7 can run early and out of order.** It depends only on the
measurement, not on the edge: the two-feed ledger comes out of the **store**
since the re-order, and Story 3.8 has already photographed it. Its real content
is the obligation the re-order created — _prove the read-time stitch as well as
the stored path_ — plus a deletion. If 3.9.1 finds the note already drawn, this
becomes a short task and can be taken whenever a session is available, because
**the two-feed state is a mid-session one on a deployed store** and collapses
to one source after the nightly backfill (`LIVE-SESSION.md` §14).

**Why the measurements are ninth rather than spread through.** §28's word is
**routine**, and a chart that redraws on every burst is routine in exactly the
sense Task 3.6.5 paid to learn. Measuring a half-built edge measures the wrong
thing; measuring each task separately measures it five times. What is **not**
deferred is the rehearsal inside 3.9.9 — it needs the deployed site with the
market open, and three stories are already queued for that window.

**What has no task of its own, and why.** The gap a disconnection leaves is
Story 3.10's, and Task 3.5.5's reversal trigger names this story as the surface
that fires it — so it is a named constraint inside 3.9.2 and a hand-off in
3.9.10 rather than a task here. Persistence is Story 3.8's and is done. The
tape column is Story 3.7's and is done.

## What this story hands forward

The first honest two-feed series this product has ever served, and the reason
Story 3.7's migration cannot be deferred any further.

---

## Handed here by Task 3.1.4 — 2026-09-17

**A quiet minute is ABSENT** — not a zero-volume bar and not a repeat. 0 of
129,481 bars carried `v: 0` and no `(symbol, t)` arrived twice on `b`
([`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) §7.2). This story's chart inherits absence, and
§2.5's staleness vocabulary has to tell _no bar_ from _no connection_ without
help from the feed.

**Two decisions taken on 2026-09-17 reach the live edge directly** (§7.11):

- **Extended-hours bars are rendered and marked.** The live edge now runs
  outside 09:30–16:00, using Story 3.4's mark. Epic 2's charts never met this
  because stored bars were fetched per session.
- **The product subscribes `updatedBars`.** The bar at the live edge is the one
  most likely to be corrected — a correction arrives about thirty seconds after
  the bar, which is while that bar is still the edge.

---

## An ordering question this story and §10.3 answer differently — raised 2026-09-18 by Task 3.2.10's audit

**Not resolved here, because it is an epic-ordering decision rather than this
story's to take.** Recorded in both files so neither proceeds unaware.

**What this story says**, above: _Before Story 3.8, deliberately._ Storing live
bars would make today available on a cold load and would make this story's ledger
come out of the **database** rather than out of the **stitch** — _"the read-time
stitch is the case the provenance design was built against and it is worth
producing once, honestly, before the store gets involved."_

**What [`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) §10.3 says**, decided later during the spike:
the backend holds **one `Map<symbol, Bar>` — the latest observation per security.
Today's bars are NOT held in memory.** And it draws the consequence explicitly:

> Story 3.9's chart uses it, and **Story 3.8 stores the live session so that it
> can.** Decision 4 and Story 3.8's scope are **one decision seen twice** — this
> half says _not in memory_, and that obliges Story 3.8's half to say _durably in
> the store_, **on the same day**.

Its rejected alternative said the same thing from the other side: choosing _last
observation only_ means _"Story 3.8 — storing the live session — is a
**dependency of Story 3.9** rather than a story after it."_

**The epic table has neither.** 3.7 depends on 3.6; 3.9 depends on 3.5 and 3.8.
So the dependency §10.3 names was decided and never propagated.

**The real question, stated so it can be answered rather than re-derived:** with
today's bars not in memory, **where does this story's chart get the minutes
between the session open and the latest observation?** Three answers, and they
are genuinely different stories:

1. **From Story 3.8's store** — which makes 3.9 a dependency and re-orders the
   epic.
2. **From the current-state map alone** — a chart with one live bar on the end of
   stored history, and a visible hole for today's earlier minutes.
3. **From a read of the vendor's HTTP API** — which is Story 3.10's gap-filling
   arriving early, and §14.2 already establishes that shape.

**This story's argument for going first is about the LEDGER and is untouched by
any of them** — producing the two-feed stitch honestly, once, before the store is
involved. What is in question is only where today's _shape_ comes from.

## Handed here by Story 3.5's close — 2026-09-21: the live edge has no series to draw

**Story 3.5's open decision was _today's-bars-in-memory_, and it was settled the
cheap way — which makes the consequence yours.**

`currentMarketState` is a `Map<symbol, LiveObservation>`: **the latest
observation per security and nothing else.** No history, no series, no today.
Measured at **222.8 KiB** for 518 securities — 440 B each — precisely because it
holds one bar apiece, and a full session of replacements leaves it still holding
518 entries under 1 MiB.

**So there is no in-memory series for your chart to reach for**, and that was a
decision rather than an omission: 518 × 390 minute bars is a materially
different object, and Story 3.8 changes the answer by making the store hold
today — which is the reason to prefer the cheap option now rather than build a
second home for the same bars.

### What that leaves you, concretely

**Assemble today's series from two sources**: what the store already serves, and
what has arrived over the socket **since the page opened**. The second is in
the browser, not the server — `LiveFeedConnection.observations` holds the
latest per symbol, so a page that wants a _series_ has to accumulate it itself
or wait for Story 3.8.

**And the gap is real.** What is missed while the socket is away is **gone**
(measured 2026-09-17), and Task 3.5.5's reconnect resumes rather than fills. A
chart that draws a straight line across four missing minutes as though nothing
happened is exactly the reversal trigger 3.5.5 recorded — **and you are the
surface that fires it.**

**Reversal trigger for the memory decision, as a condition:** the first reader
that needs more than the latest bar per security from the _server_. If that is
you, say so — the object was built knowing this question would come back.

---

## Re-ordered 2026-09-21: this story was 3.7 and now runs after the store

**The question this file has carried since Story 3.2's close is answered, and
the answer moved the story.**

Section _Where does today's shape come from_ above lists three candidates.
**Answer 1 was taken**: this story reads today's session from **Story 3.8's
store**. So 3.8 is now a dependency rather than a later story, and the epic runs
**3.6 → 3.7 (the tape) → 3.8 (the store) → 3.9 (this) → 3.10**.

**What forced it was Story 3.5 shipping rather than any new argument.**
`LIVE-DATA.md` §10.3's rejected alternative already said that choosing _last
observation only_ makes the store _"a **dependency of** this story rather than a
story after it"_ — and §10.3 was a decision on paper. Task 3.5.1 built it:
`currentMarketState` is a `Map<Ticker, LiveObservation>` holding **one bar per
security**, break-verified, with **no series in memory anywhere in the process**.
The open question became a fact, and the epic table was the last place still
carrying the old shape.

### What this story LOSES by moving, stated plainly

**Its own argument for going first.** This file said it, and it was a good
argument:

> the read-time stitch is the case the provenance design was built against and
> it is worth producing once, honestly, before the store gets involved.

**That is gone.** With the store holding today's session, this story's two-feed
ledger comes out of the **database** rather than out of the read-time stitch, so
the stitch is no longer exercised by the first surface that needs it. The cost
is real and was accepted with the re-order rather than overlooked:

- `mergeSeriesProvenance` and `twoFeedStitchView()` remain the only path to a
  genuine two-feed sentence, and **nothing user-facing will exercise them**.
  _Amended 2026-09-23: the store's read path is now a third — Task 3.7.5
  joins a two-tape window through `mergeSeriesProvenance` — and it is still
  exercised by nothing user-facing until 3.8 stores a second tape._
- `CLAUDE.md`'s two shipped sentences that _"become false the first time an IEX
  tail is stitched on"_ are still owed an answer, and this story still owes it —
  it just gets the tail from a different place.

**So this story acquires an obligation it did not have**: prove the read-time
stitch **as well as** the stored path, because the stored path is now the one a
user sees and the stitch is the one the provenance design was built for. If only
one of them is exercised, the other is a claim nothing checks.

### And the alternative that was rejected

**Fetching today's earlier minutes over the vendor's HTTP API** (candidate 3) was
declined: it is Story 3.10's gap-filling arriving early, against a fifteen-minute
embargo and a rate limiter that is a refilling bucket at ~3.3/s with **no
`Retry-After` on a `429`** — a policy this story does not own and should not
invent. Drawing the hole (candidate 2) was declined because a chart that silently
omits the first hours of a session is the false-impression family
`PROVENANCE.md` exists to refuse.

---

## Handed here by Story 3.6's close — 2026-09-22: what the table settled that the chart inherits

**You are the second surface to apply the motion vocabulary at scale, and the
first decision is already taken: it applies unchanged.** Task 3.6.2 measured
the mark at 518 rows — rendered and not rendered, same machine, same feed —
and found no difference that survives the noise; the mark is not the cost.
The rate that looked like 8.6 marks a second was a division: §7.4's burst
lands a minute's bars inside ~243 ms, so the mark fires **once a minute** and
the page is still for the rest of it. A live edge that redraws on every bar
inherits that shape: one burst, one redraw, not a stream.

**The handle is shared.** The identity block's mark and the table's row marks
both carry `[data-arrival]`, and a page-wide count on `/securities/:symbol`
already counts two. If the chart's live edge marks, it is the same attribute
and the same `composes:`d rule (`styles/motion.module.css`), and any spec
counting marks scopes to its own region.

**§28's word _routine_ is the rule you are measured against, and Task 3.6.5
paid for learning it.** The table re-rendered 518 rows once a minute for ever
and crossed 50 ms on three frames in seven on a production build; the cold
load, once per visit, was allowed to stand. A chart edge that redraws every
tick is routine in exactly that sense. The lever there was render work — memo
boundaries so a tick touches only what changed — and the instrument is a
`long-animation-frame` observer naming the invoker; both are in
[Task 3.6.5](../story-06-live-prices-across-the-universe/TASK-05-the-cold-load-expand-all-and-epic-14s-trigger.md).

**The reading in which a live price and a stored close meet is yours.** The
table dates a stored close and does not date a live price, and its heading
stops claiming one session over the column the moment any row is live — a
shared claim is made only while it is true of everything (Task 3.6.1). The
reversal trigger written there names you: _the first surface that has to
compare a live price and a stored close in the same reading_. A chart with a
stored tail and a live edge is that surface, and the two-feed ledger is where
the two provenances are said.

**And the gateway's `sentAt`** (Task 3.6.4, ADR 0033) is on every frame you
will receive: a measurement field, never a clock for staleness, honest only as
a distribution.

## Handed here by Task 3.8.1 — 2026-09-23: the two-feed sentence will have real data behind it, and it may arrive before you do

**Both tapes are kept** ([ADR 0035](../../../docs/adr/0035-both-tapes-are-kept-and-what-a-record-is.md)).
A minute of a security may hold one row per tape — the IEX bar the live stream
observed and the consolidated bar the nightly backfill fetched — because a
stored bar is a record of an observation rather than a cache of the best
available number, and `PRODUCT_SPEC.md` §23's _what was knowable at this
moment?_ is what that protects.

**Three consequences, in the order you will meet them.**

1. **Your sentence stops being hypothetical.** Task 3.7.5 already derives a
   served window's `provenance.sources` from the stored rows, one entry per
   contiguous run of tape. Once Story 3.8's writer stores an IEX bar into a
   window the backfill filled with SIP, a real server produces the two-feed
   record — so `twoFeedStitchView()` is no longer the only route to the state,
   and the real recorded body that retires it can be taken from a local store.
2. **It may be on screen before this story starts.** `SourceNote` already
   renders one stretch per `BarSource` with its bar count, and `namesFeeds`
   returns true as soon as a series names more than one feed. Task 3.8.3 is
   asked to confirm or refute that and to photograph the result. **If it is
   already drawn, your scope is narrower than your file assumes** — read it
   again rather than building what shipped.
3. **A live-written session is served to every reader, with its label.** It is
   honest but thin — **65.1% median per-symbol minute coverage** measured
   first-hand (`LIVE-DATA.md` §7.6), not the 82.8% that is the stored SIP
   figure. So the chart a reader sees during a session is sparser than the same
   chart tomorrow, and the label is what keeps that from misleading them. §7.1's
   rule is met **per stretch** rather than per response.

**And the window may hold two rows for one minute.** Which one a chart draws is
a read decision ADR 0035 deliberately does not take — `mergeSeriesProvenance`
reports both stretches honestly either way, but a line has to pick a number.
~~**That is yours**, and it is the first question to answer rather than the
last.~~

> **Corrected the same day, 2026-09-23 — it is NOT yours, and the reason is
> worth knowing.** `toBarSeries` refuses bars that are not strictly ascending by
> instant and **throws**, so a window holding two rows for one minute is a
> **500 on a page load** rather than a chart drawn from the wrong row. That
> makes the rule a precondition of Story 3.8 shipping at all, and it took it
> back: **Task 3.8.4** decides which tape a served chart prefers and makes the
> read return one bar a minute.
>
> **What is left for you is the live edge**, and it is a narrower and more
> interesting question: for the minute **in progress** only one tape can have a
> bar at all, so the preference rule has nothing to choose between and the
> chart's last point is whatever arrived. Whether that point is drawn
> differently from a settled one — and what happens to it when the consolidated
> version lands minutes later — is the live edge this story is named for.

---

## Handed here by Story 3.8's close — 2026-09-24: today comes from the store, and the two-feed note is narrower than this story assumed

**Three things this story reasoned about are now facts rather than plans, and
one of them shrinks a scope.**

**1. Today's bars are in the store.** `live-bar-writer.ts` writes every complete
minute bar with its tape, every minute the market is open, on the deployed
backend (Task 3.8.3). `LIVE-DATA.md` §10.3's obligation — _not in memory,
durably elsewhere_ — is discharged. So this story's chart assembles today from
**the store plus what has arrived since**, and a reload mid-session keeps its
chart without this story doing anything.

**2. The two-feed source note is already on screen from real data, and this
story did not draw it.** Task 3.8.3 photographed `All US exchanges` over `IEX`
with the one-venue sentence, from rows the shipped writer wrote, and Task 3.8.8
read it clause for clause against `VISUAL-LANGUAGE.md`'s provenance section and
found it matches. **Re-read this story's ledger scope against that** rather than
assuming it is unbuilt.

**3. And the narrowing, which is the part to act on.** A served window's
`sources` are derived from **the rows the answer contains**, not from every tape
the store holds for it — since Task 3.8.4 the read picks one row per minute and
prefers `sip`. The nightly backfill then covers every regular-session minute. So
on a deployed store:

| When a reader looks                                   | What the note says                   |
| ----------------------------------------------------- | ------------------------------------ |
| a window whose last session is **today, market open** | two stretches, in contribution order |
| the same window **after that night's backfill**       | **one** stretch, `sip`               |

Measured against production on 2026-09-23 after the backfill: `NVDA`, `1m`, one
session — 390 bars, one source, `alpaca`/`sip`, 390 bars. Rehearsed end to end
in Task 3.8.9, which got the same answer and explains why it is the **right**
one: every live minute had a consolidated version, so nothing of the live tape
survives into the answer.

**What that means for this story**: the two-feed ledger is a **mid-session**
state on real data, and any assertion, screenshot or rehearsal of it has to be
taken while the market is open. The stretches that survive the night are the
minutes the backfill never asks for — **extended hours** — which the writer
keeps and the session fetch does not cover.
