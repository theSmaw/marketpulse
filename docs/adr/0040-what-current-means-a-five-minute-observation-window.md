# 0040 — What "current" means: a five-minute observation window, and one eligibility pass for every aggregate

**Status:** Accepted
**Date:** 2026-10-12
**Story:** [4.9 The Rehearsal, the Sweep & the Epic Close](../../planning/epic-04-market-overview/story-09-the-rehearsal-the-sweep-and-the-epic-close/STORY.md), Task 4.9.10

## Context

Four regions on the landing route compute over a map that is **partially
observed**, and every one of them has to answer the same prior question before
it can state a figure: **which securities count as heard from right now.**

`PRODUCT_SPEC.md` §9's sketch asked for an advancers/decliners figure and said
nothing about freshness, because on a consolidated tape the question barely
exists. On the free Alpaca plan it is the whole problem. Three dated
measurements say why, all of them first-hand:

- **IEX per-symbol minute coverage is 65.1% at the median and 2.1% worst
  case** — the worst being `ERIE` — and an ordinary gap of **187 minutes**
  between one security's bars has been measured
  ([`LIVE-DATA.md`](../../planning/epic-03-live-market-data/story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md)
  §7.6, §11.2).
- **A bar arrives ~0.5 s after the minute it describes has ENDED**, so there is
  no partial bar anywhere in this product and the newest observation is always
  about a minute that is already over (§7.3).
- **The by-hour coverage curve**, taken against the deployed gateway on
  2026-09-25 over **390 of a session's 390 minutes with no gap inside it**
  (Task 4.1.6): the 1-minute window is **structurally 0 in all 390 samples**,
  2 minutes reads **57.5% at 13:00**, 5 minutes holds **90% at the median and
  never below 86.1% in any hour**, and 15 minutes buys 8.5 points.

So _current_ is not a property of the market here. It is a property of **our
reach**, it moves across a session, and it has to be a number somebody chose
against that curve.

**This is ADR-sized because it defines _current_ for every aggregate this
product will ever compute**, Epic 5's anomaly scores included. And the two
surfaces that do **not** go through it already produced a shipped
contradiction: `Market proxies` and `Sector performance` mark an entry `live`
for as long as the observation sits in the map, with **no expiry at all**, so a
join taken during an outage drew four live prices and eleven ranked sectors at
the top of `/` above `Of the 503 companies we track, none were heard from in
the last 5 minutes` in the middle — each half correct about its own subject
(Task 4.7.3, and [ADR 0038](0038-the-overview-aggregate-one-join-one-frame.md)'s
second amendment to decision 1, which repairs the **reload** that reached it
rather than the asymmetry itself).

## Decision — one window, measured in minutes, over each bar's own `startsAt`, filtering both halves of one shared pass

An aggregate over the live map counts only securities whose **newest
observation's own `startsAt`** falls inside a window measured in minutes — **5
today**, derived from Task 4.1.6's curve — and that one window filters the
**numerator and the denominator in a single pass whose output is shared**,
rather than two filters that agree. The window travels to the browser as
`windowMinutes` on the frame, so the screen **states** it rather than spelling
it.

Four parts, each of which is somebody's measured defect:

- **`BREADTH_WINDOW_MINUTES = 5` is spelled once**, in
  `apps/backend/src/market-breadth.ts`, named for the region that first needed
  it and not for the only one that uses it. The constant is the producer's half
  of a sentence whose other half is drawn in a browser.
- **The clock is the bar's, never the reader's.** The comparison is
  `bar.startsAt` against the aggregate's own `asOf`, both arguments, so the
  function reads no clock at all — which is what makes invariant 4 structural
  here rather than instructed, by the same argument as ADR 0038's decision 1.
- **One pass, three accumulators, `measured` is their sum.** `eligibleMoves`
  decides _who has a measurable move on which basis_ and is consumed twice: the
  breadth count is its **tally** and the movers are a **selection** from the
  same array. `movers.eligible` is that array's length and `breadth.measured`
  its tally, so the two cannot disagree — and the only legitimate difference
  between them is a figure with no **direction**, which is eligible and in no
  bucket.
- **The window is read off the frame, never re-spelled.** Both grammars of the
  denominator sentence are built from `qualifier.windowMinutes` in
  `measured-set.ts`, which is the one builder `Market breadth`'s footer and
  `Movers`' footer both use. A rollback can put a gateway and a bundle two
  values apart; the figure beside the count is always the one the count was
  taken with.

### Counts, not percentages

Refused, and **not re-argued here**: `PRODUCT_SPEC.md` §9's sketch drew three
figures summing to 100 and carries a dated amendment (2026-10-07, Story 4.4)
saying why the shipped region does not. The short form is that a percentage
hides its denominator and the denominator is the thing this ADR is about.

## Alternatives considered

- **Count the whole map, no expiry.** The state `Market proxies` and `Sector
performance` are still in, and the direct cause of Task 4.7.3's shipped
  contradiction. It is the cheapest thing to write and it is correct about the
  map: the observation **is** there, it is simply no longer about now. The
  defect only becomes visible when a second region on the same screen expires
  its own, which is why it survived two stories.
- **A per-security staleness verdict** — a word or a badge saying this price is
  stale. Rejected **on the measurement**: at 65.1% median coverage, 2.1% worst
  case and an ordinary 187-minute gap, a threshold cries wolf on thin names all
  day, and the product would be marking its own reach as a fault in the
  market. The rule this product already holds, from Story 3.10, is **an age,
  never a verdict** — which is what `Market breadth` and `Movers` ship as of
  Task 4.7.4: the instant the measured window ended, beside the denominator,
  with no threshold and no status word.
- **`CurrentObservation.ageMs` as the clock.** The field is right there and it
  is the obvious thing to reach for. Rejected for two separate reasons, both
  already written into `market-breadth.ts`' own comments: it is **computed on
  read with its own wall clock**, so reading it would put a second clock inside
  a pure function and would be wrong under a replay; and an age measured at an
  **arrival** instant is not the age Task 4.1.6's curve measures — that curve
  reads 0 at one minute in all 390 samples precisely because a bar arrives
  after the minute it describes has ended, so a window keyed on anything but
  `startsAt` shifts every figure in the table by a minute.
- **Percentages over a window instead of counts.** See above —
  `PRODUCT_SPEC.md` §9's amendment owns this and it is cross-referenced rather
  than restated, because two homes for one argument is what this repository
  refuses.
- **Two independent filters, one for the count and one for the ranking.**
  Rejected by Task 4.5.4, and it is the alternative with the most plausible
  diff: each region filters the entries it needs, nobody shares anything, every
  number is well-formed. What drifts between two filters is never the loop, it
  is the **predicate** — the window, the `state === "live"` test and the session
  basis all live inside it — and the symptom is a ranked list whose
  denominator disagrees with the count twenty-four pixels below it, with both
  figures individually correct. `breadth-is-counted-over-the-equities-alone`
  holds the pass at exactly one call.

## Consequences

- **Every later aggregate inherits a definition of _current_ rather than
  choosing one.** Epic 5's scores are the first that will compute over this
  map without being a count of it.
- **The screen states the window it was measured over**, in both grammars, from
  one builder. A region that wanted to state a different one would be stating a
  window the count was not taken with.
- **The two un-expiring surfaces are a known, dated asymmetry**, not an
  oversight: `Market proxies` and `Sector performance` are fifteen funds with
  near-total coverage, where the measured curve's hole barely exists, and
  bringing them inside this window is a product decision about what the top of
  the screen says during an outage rather than a correctness repair. Task
  4.7.3's amendment to ADR 0038 removed the **reload** that made the
  contradiction reachable by pressing F5; the asymmetry itself stands.
- **The cost of the window is not the window.** Task 4.4.4 measured the
  widening of the join to the whole universe at 0.118 → 3.497 ms a batch, of
  which the breadth count — the pass this ADR is about — was **0.041 ms, 1.2%**;
  the rest was `marketDateAt` inside `changeFromClose`. Both figures are dated
  measurements of Story 4.4 on a tight loop and neither has been re-taken since
  Task 4.8.7's repair and Task 4.8.11's re-measure of the per-batch path at
  1.521 ms p50 — **re-measure rather than subtract.**
- **What a green run does not certify.** **No gated machine has ever seen this
  window do anything.** CI's store has zero bars, so `measured` is 0, every
  eligibility pass is empty and every region renders its honest-nothing state;
  the window is exercised only against a store with bars and a feed. And the
  curve behind the 5 is a **single session on one deployed gateway**, taken on
  2026-09-25 — it is the best input this decision has and it is one draw.

## The mechanism this ADR owes

**A claim about a mechanism reads identically whether the mechanism is there or
not**, so the one-home rule above is held by `pnpm invariants`:
`one-home-for-the-observation-window`, in three conjuncts, with `pnpm break
a-second-observation-window` behind it.

The clause a re-implementer cannot avoid writing is the **cutoff**: whatever
they build, a window over observations is a minute-scaled quantity subtracted
from an instant, so the check walks every shipped source file in the three
trees for that subtraction and requires exactly one — in
`market-breadth.ts`, naming `BREADTH_WINDOW_MINUTES`. The corpus is
`shippedSourceFiles()` rather than a list of the files that exist today, for
`one-home-for-imperative-navigation`'s reason: **a new region is a new file by
this repository's convention**, so a file list is a corpus that cannot see the
next region.

Two things it cannot see, stated rather than implied. A cutoff spelled as an
**addition** to the bar's instant rather than a subtraction from `asOf` —
`startsAt + window < asOf` — is the same window written the other way round and
is outside the pattern; the pass today is written as a subtraction and a copier
copies. And a window hard-coded in **milliseconds** with no minute factor
(`asOf.getTime() - 300_000`) is invisible to it. Both are recorded in
`scripts/check-invariants.mjs` beside the check.

## Reversal trigger, as a condition

**Primary: the first aggregate on this screen whose honest window is not
breadth's** — an anomaly score over a trailing session, a sector mean over a
day. At that point three things fall due together: `windowMinutes` stops being
one number per frame, the shared eligibility pass has to **split** into one per
window, and the single `observedAt`/`computedAt` pair stops being true of the
whole frame — which is ADR 0038's own frame-grain trigger (_the first overview
region whose cadence must differ from the applied-batch cadence_) firing at the
same instant. Note which way the split goes: two windows is two passes and
**two denominators on one screen**, so the sentence that states the window
becomes per-region rather than per-screen.

**Second, on the value rather than the rule: the first re-measurement of
per-symbol IEX minute coverage that moves Task 4.1.6's curve.** The 5 is
derived from a measurement, so a re-measure is an **input** to this decision
rather than a re-litigation of it: the constant moves, the frame carries the new
value, every sentence on screen follows it, and nothing else in this ADR
changes. The curve is one session old and is owed a re-take by any story that
has a deployed session in front of it.
