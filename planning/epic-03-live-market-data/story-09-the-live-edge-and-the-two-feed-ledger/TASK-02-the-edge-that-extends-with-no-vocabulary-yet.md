# Task 3.9.2 — The edge that extends, with no vocabulary yet

**Status:** Not started
**Story:** [3.9 The Live Edge on the Chart & the Two-Feed Ledger](STORY.md)
**Depends on:** 3.9.1

## Objective

**Make the chart grow, and draw the new bar exactly like the old ones.** This is
Story 3.4's shape repeated on purpose: 3.4.2 shipped a price that moved with no
vocabulary at all, and the four treatments in 3.4.4 were then argued **in front
of the real thing moving** rather than against an imagined one. A vocabulary
designed against a static mock is a vocabulary designed against the wrong
problem.

## What the user can see when this lands

**The chart reaches the current minute and keeps going, with no refresh.** Open
`/securities/NVDA` during a session, leave it, and the line is longer a minute
later. It is the single most demonstrable thing in this epic — `PRODUCT_SPEC.md`
§5.6's _it must feel alive_ has an obvious candidate here for the first time —
and it lands before anything is designed, which is deliberate.

**What it will not do yet:** mark the new bar, draw the seam between the stored
and live stretches, or treat the minute in progress differently from the 389
behind it. Those are 3.9.3 and 3.9.4.

## The mechanism, and the two traps in it

**Where the series comes from.** Story 3.5 settled that the backend holds only
the **latest observation per security** — no series, measured at 440 B each and
declined at 518 × 390. So the browser assembles today from two sources: what
`/market-data/bars` served on load (which since Story 3.8 already includes
today's stored minutes) and what has arrived over the socket **since the page
opened**. `held-series.ts` and `use-bar-series.ts` hold the first;
`use-live-feed.ts` carries the second.

**Trap 1 — a revision is not an append.** `toBarSeries` refuses bars that are
not strictly ascending by instant and **throws a `RangeError`**, and Task 3.8.4
paid for learning what that costs: a window holding two rows for one minute was
a **500 on a page load** rather than a chart drawn from the wrong row. The
socket delivers a bar for a minute and then a corrected one about thirty seconds
later (§7.8, measured: 0.064% of bars, 35.3% of them changing the close). So the
merge must **replace in place by instant, last wins**, exactly as
`live-bar-writer.ts`'s `seriesFor` collapses a batch. An append is a crash, and
it is a crash that only happens when a correction arrives, which is rarely, on a
page that has been open a while.

**Trap 2 — the arriving bar may be older than the drawn series.** A page opened
mid-session is answered from the store, which is complete to `now − 1 min`; the
first socket frame may carry a minute the answer already has. Ignore, replace or
crash are three different behaviours and only one is right.

**And the gap, which is Task 3.5.5's reversal trigger and names this surface.**
What is missed while the socket is away is **gone** — measured 2026-09-17 — and
the reconnect resumes rather than fills. Whatever 3.9.1 found the chart does
with an absent minute, this task must not make it _worse_: a line that closes
over a four-minute outage as though nothing happened is the false-impression
family `PROVENANCE.md` exists to refuse. If the honest answer needs a drawn
distinction, that is 3.9.3's to design and this task's to name.

## Work

- Merge live observations into the drawn series, in the market module, as a
  **pure function** with the replace-in-place rule and its own unit tests — the
  hook wires it, the function decides it
- The chart redraws on the merge, at the cadence the feed delivers: **one burst
  a minute**, not a stream (§7.4 — a minute's bars land inside ~243 ms)
- Nothing new is drawn: the last bar looks like every other bar
- A browser assertion that the line grows without a reload, against a stubbed
  feed rather than a real one, because CI has neither bars nor a market
- A `pnpm break` for the replace-in-place rule — the defect it prevents is a
  500, and it is invisible until a correction arrives

## Done when

1. The chart extends during a session with no refresh, seen on the deployed site
2. A correction for a drawn minute replaces it and does not throw, asserted
3. `pnpm verify` passes and the browser suite is green

---

## Amended by Task 3.9.1 — 2026-09-24: half of criterion 1 is already met, and trap 2 has a measured shape

**The chart already reaches the current minute for a liquid security**, because
the live writer puts the store's edge at `now − 1 min` — ahead of the vendor's
`now − 16 min` clamp — so the stitch short-circuits and the answer is the
store's. What is unbuilt is this task's own half: **extending without a
refresh**. Nothing wires `useLiveFeed` to the chart; `SecurityExplorer.tsx`
hands `series.screen` to `BarSeriesPanel` and `live` to `SecurityIdentity`, and
those are different children.

**Trap 1 is confirmed and is the only one of its kind.** There is no partial
bar — the vendor sends a bar for minute _M_ at the end of _M_ — so every
observation the socket delivers is a **finished** minute, and the only reason a
drawn minute ever changes is §7.8's revision, ~30 s later, at 0.064% of bars.
That makes the replace-in-place rule this task's single correctness
requirement rather than one of several.

**Trap 2's answer**, for the first socket frame after a mid-session load: the
store already holds it. A page opened at 10:30 is answered to 10:29 and the
10:30 frame arrives seconds later, so the ordinary case is _newer_, and the
_already have it_ case arrives on a reconnect snapshot. Both go through the same
replace-in-place path and neither is special.

**And the gap is worse than this task assumed, in a way that is not this task's
to fix.** The axis closes gaps up: measured on production, `ERIE` drew 131 bars
and `NVDA` 390 over the same session, both the full width of the frame. So a
chart that extends across a four-minute outage will look exactly like one that
extends across four quiet minutes — and on IEX, quiet is the common case.
**Do not invent a distinction here**; name it, and leave it to Story 3.10, which
owns the difference between _did not trade_ and _we were not told_.
