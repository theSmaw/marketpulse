# Epic 9 — Corporate Filing Evidence

**Status:** Not started
**Sequence:** 9 of 15 — follows Epic 8 (Evidence & Investigation Workspace)
**Spec references:** PRODUCT_SPEC.md §7.2 (SEC EDGAR), §16 (evidence)

## Goal

Add primary-source company information to investigations.

## Outcome

MarketPulse can identify whether relevant SEC filings occurred near a market event.

## Scope

- SEC EDGAR integration
- CIK/security mapping
- Recent-filing retrieval
- Filing metadata
- Filing timeline events
- Selected filing types
- Filing viewer/linking
- Filing evidence records
- Investigation filing-check tool
- Filing-source provenance

## Exit criteria

An investigation can reliably state either:

> A new 8-K was published at 10:31 ET.

or:

> No recent SEC filing was found.

with inspectable primary-source evidence.

## Handed here by Story 5.6's close — 2026-10-29: ADR 0045's test was restated, and it is the one you apply to a filing-day move

**ADR 0045 names this epic as meeting its test**, and the test's wording changed
on 2026-10-21 — so take it from the amendment rather than the original decision.

**The original wording refused a figure this product ships everywhere.** It
offered _a ratio **within** one tape_ (permitted) against _a level **across**
tapes_ (refused), and named _a percentage change_ as the first. But
`changeFromClose` has an **`iex` numerator and a `sip` denominator** (ADR 0038
decision 4), so it is a **ratio across tapes** — in neither category, and
literally refused by a rule nobody intended to refuse it.

**The restated test is EXTENSIVE versus INTENSIVE**: does the quantity scale with
how much of the market the tape saw? **Extensive** — a volume, a share count, a
trade count, a traded value — is refused across tapes, because the share **is**
the quantity. **Intensive** — a price, a return, a percentage change, a rank —
is permitted, because no venue-share factor multiplies it.

**For this epic that means a filing-day RETURN is permitted** — it is intensive,
and ADR 0045 says so by name. **A filing-day VOLUME is not**, and the measured
reason is that IEX's share runs **3.54% to 15.19%** across six securities,
**inversely with liquidity**, so a cross-tape volume comparison is wrong by a
factor between **12 and 45** depending on which security a reader opened. There
is no single multiplier to apply, which is why the ADR refuses rather than
corrects.

## Handed here by Task 5.7.5 — 2026-10-29, at Epic 5's close: the band below the baseline is YOURS, Epic 5's anomaly lane was moved OUT of it, and here is why

**Written here rather than linked, because the two documents that carry this
decision are not documents this epic reads.** They are
`planning/epic-01-application-foundation/story-04-ui-component-library-and-styling-conventions/VISUAL-LANGUAGE.md`
(_Room reserved for what arrives later_, and its 2026-10-13 amendment) and Epic
5's Story 5.6 `STORY.md`. Nothing about either story's close crosses into this
file, and before 2026-10-29 `grep -n "lane"` on it returned nothing at all.

**1. The 14 px band below the plot's baseline and above the time-axis labels is
yours, and it is already a token.** `--chart-filing-lane: 14px` is declared in
`apps/frontend/src/styles/tokens.css:776` and spent today as `margin-top` on the
axis-label row of **both** plots —
`apps/frontend/src/components/PriceChart/PriceChart.module.css:149` and
`VolumeChart.module.css:173`. The labels themselves need about 6 px; the extra
is reserved for your markers. It was made a token on 2026-09-12 for a reason
that still binds: **the volume chart inherits the price chart's axis, and two
plots that disagree about where their labels start cannot be stacked.** Each
plot keeps its own copy of the lane, so a marker can appear under either, and
the token is what stops them diverging.

**2. Epic 5's anomaly lane is NOT in your band. It is a 16 px lane inside the
plot's TOP padding**, at the bar's x, carrying the score as a **number** —
because the amber ramp is a fill behind a _written_ band name and no band name
fits at a bar's width.

**3. It was drawn in your band first, and the correction is the part worth
knowing.** Story 5.1's canvas page put the anomaly lane **below** the plot,
outside it — i.e. in the 14 px you already occupy. That was wrong twice over,
and both reasons are reasons this epic should hold onto: **the space is let**,
and **the plot's top padding is already paid for**, so a lane inside it
**displaces nothing** while anything below the baseline displaces something.
The canvas was corrected to the reserved placement. **So the first filing marker
this epic draws will not land on top of an anomaly mark — but only because that
collision was caught on a canvas rather than on a screen.** If a later story
proposes moving the anomaly lane back down, this is the argument against it.

**4. The one thing that is NOT reserved mechanically, which is a trap with your
name on it.** The anomaly lane is **reserved by prose only**:
`--chart-filing-lane` is a token and **there is no `--chart-anomaly-lane`**
(verified 2026-10-29 — `grep` finds the filing token in `tokens.css` and
`tokens.ts`, and no anomaly-lane token anywhere). The first component that draws
the anomaly lane owes `--chart-anomaly-lane: 16px` in the same change. Until
that lands, **the only record that 16 px of your plot's top padding is spoken
for is a sentence in a document** — and this repository's own lesson is that
reserved space existing only as a number inside one component's stylesheet is
reserved by nobody, and space reserved only in a document is reserved by less.
**If you draw first, do not take the top padding.**

**5. Three constraints travel with Epic 5's lane, and the second is one you
share.** It is derived from the **bars** rather than from the window, so it
**stops at the coverage edge**; its count is bounded by **occasions** rather
than by bars, which is the only reason it is drawable at all at the 9,750-bar
cap, and a mark per bar is refused in advance; and the lane and the security
page's rail share one vocabulary — same four band words, same score out of 100.
**The occasions bound applies to filings for the same reason it applies to
anomalies**: one element per bar at the cap is 9,790 plot elements and
main-thread tasks of 137–254 ms (ADR 0027), and a filing lane that scales with
bars rather than with filings would hit it the same way.
