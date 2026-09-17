# Story 3.7 — The Live Edge on the Chart & the Two-Feed Ledger

**Status:** Not started
**Epic:** [Epic 3 — Live Market Data](../EPIC.md)
**Depends on:** 3.6
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

## What the user can see when this story lands

**A chart that reaches the current minute**, on `/securities/:symbol` with the
market open, extending as the session runs rather than stopping sixteen minutes
short of it.

**And a source note that tells the truth about a split series** — the stretches
in contribution order with their counts, the consolidated tape for the stored
part and a single named venue for the live part, with the sentence that says
what a single venue is. It is the first time a reader sees that sentence about
real data rather than about a fixture.

What the user still cannot do: reload the page and still have today (Story 3.9 —
today's session is not stored, so a cold load starts from the sixteen-minute
edge again), or see an honest account of a feed that has dropped mid-session
(Story 3.10).

## Why it sits here in the sequence

**After the table, because it is the harder surface**, and after the vocabulary
because a chart redrawing is exactly what `VISUAL-LANGUAGE.md` refused to
specify without a moving number.

**Before Story 3.9, deliberately.** Storing live bars would make today available
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

- Persistence of any of it — Story 3.9
- The degraded states of a live chart — Story 3.10, which owns what the plot
  does when the feed stops mid-session with half a session drawn
- The tape column on `market_bars` — Story 3.8. **Nothing here is stored**,
  which is exactly why this story can precede that migration
- Comparison series, anomaly marks and the filing lane — Epics 5, 8 and 9, each
  of which already has room reserved on this chart

## Open decisions — settle with the user

1. **Whether a partial final bar is drawn as a bar.** It is a real observation
   of an incomplete minute, and drawing it identically to the 389 complete ones
   is a small false impression of the same family `PROVENANCE.md` is built to
   refuse — _a claim about data requires data._
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
   session runs, without a page refresh
2. A two-feed series names both stretches **in contribution order with their
   counts**, and neither is dropped, sorted or deduplicated
3. The live stretch's label names a single venue with the sentence saying what
   that means; **Epic 2's `All US exchanges` appears nowhere on a live tail**
4. `twoFeedStitchView()` is gone from the tree, and the state it simulated is
   reachable from a recorded body — checked by a grep that goes red, with a
   `pnpm break` entry
5. The market-claim sentence is repaired, has **one** home, and a second copy
   fails the build. A check, and the break that proves it
6. No main-thread task over 50 ms while the chart is extending, at the default
   window and at the cap (§28, and `CHARTING.md`'s own figures are the baseline)
7. The reading strip, the crosshair and the keyboard walk all work at the live
   edge, including on the partial final bar
8. `pnpm probe` at all four viewports; a person watched the chart extend during
   a live session before the suite ran
9. `pnpm verify` passes

## What this story hands forward

The first honest two-feed series this product has ever served, and the reason
Story 3.8's migration cannot be deferred any further.

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
