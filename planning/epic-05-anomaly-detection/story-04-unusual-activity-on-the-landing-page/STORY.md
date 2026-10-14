# Story 5.4 — `Unusual activity` on the Landing Page

**Status:** Not started
**Epic:** [Epic 5 — Anomaly Detection](../EPIC.md)
**Depends on:** 5.3
**Epic scope covered:** unusual-activity ranking

## Description

**This is the landing page's last reserved region, and it is here rather than
at the end of the epic on the owner's instruction — as early as is honest.**

The owner's Gate 1 decision was to get `/` moving before the composite score
exists, by shipping **band chips rather than a numeric score**. The earliest
point at which that is honest is **after Story 5.3**, not after 5.1: a band is
a classification of how unusual something is, and before the percentile exists
the only figure available is the relative move. Ranking on that and calling the
region `Unusual activity` would be the over-claim this epic is most exposed to.

**So this region ships ranked by the price percentile, saying so**, and Story
5.6 upgrades it to the composite. The region is drawn today in `Panel`'s
`reserved` state with an `EPIC 5` tag and a sentence; it has a name, a landmark
and a place in the grid at every width, and it has to be filled rather than
designed in.

**A measured layout problem has to be solved before a single row is drawn.**
`Unusual activity` sits on `.regions` **row 1**, which is
`calc((82vh - 2 * var(--space-24)) * 7 / 30)` — **a length with no content
floor**, where rows 2 and 3 are `minmax(min-content, 1fr)` and have one. At
**1440×680 the region already scrolls by 4 px with nothing in it but the hatched
placeholder** (`clientHeight 117` against `scrollHeight 121`); at 1440×500 it is
82/121, at 1280×480 the same. **No content fits at 680, including zero rows.** So
the question is not how many rows fit — and **the shortest supported viewport
height for this screen has never been stated**, having been mistaken for a width
question for two stories.

## What the user can see when this story lands

**The landing page's seventh region stops being a placeholder.** `/` draws a
short ranked list of the securities whose recent behaviour is least like their
own history — each row carrying its rank, its **ticker as the only link**, and
its **band** — with the region stating what it ranked over and how many names
it heard from.

**Every row's destination already draws the explanation**, because Stories 5.1
to 5.3 filled the security page first. This is deliberate: a list of names with
nowhere useful to go is the trap Story 4.5 shipped and Story 4.6 had to repair.

## Acceptance criteria

1. **The shortest supported viewport height is declared**, and the row count
   is **taken from a probe at that height with real content in it** rather than
   argued. `pnpm probe / --widths 1440,1024,768,390` plus deliberate runs at
   **1440×700 and 1440×680**. A tolerance is measured, never argued.
2. **No internal scroller.** A ranked list whose cut is invisible is the
   failure `MARKET-OVERVIEW.md` §5.5 exists about — _a ranked list looks
   equally confident whether its input was complete or not_ — and a 117 px
   window showing two of twenty rows layers a second, worse cut on the
   population cut the region must already confess. Whether row 1 gains a
   content floor is a **shared decision with Epic 6**, whose renderer needs a
   resolved box, and it fires `MARKET-OVERVIEW.md` §1.4's own trigger if
   filling this region moves a figure a reader is reading.
3. **The region states its own cut as well as its population** — how many are
   above the line, not just how many were heard from — from the **one builder**
   breadth's and movers' footers already use, in the grammar keyed on the basis
   the wire sent. A second builder is the duplication this repository fails a
   build over.
4. **One tab stop per row, and the ticker is the only activatable thing.** The
   figure is never the link; a reader dragging to select a number must not
   navigate. Destinations are resolved at render from the row's own identity, so
   the activation race is unrepresentable on a re-ordering list.
5. **The ranked-surface treatment is inherited, not re-decided** — ADR 0041:
   the FLIP on transform only, `--motion-duration-settle` twice, one settle for
   the whole list with no stagger, DOM order equal to visual order, rows and
   roving stops keyed on **symbol**, arrows **clamp** rather than wrap, the
   printed ordinal as the record that survives reduced motion, and `ORDER HELD`
   scoped to the region.
6. **The arrival disc keeps its shipped meaning and is not re-pointed at the
   score.** It fires when **a bar arrives for that security** and on nothing
   else. A score is the first figure in this product that can change with **no
   bar for its security at all** — its peers moved, or the window rolled
   forward — and a second meaning for one mark is this product's most-repeated
   defect.
7. **The tie-break is declared and reproducible.** Scores are integers over
   501 securities, so ties are routine rather than rare; two equal at displayed
   precision must never swap, a security with no score has **no rank**, and
   there is no `?? 0` anywhere. **Recommend ticker ascending**, because
   §5.2's checkability depends on the drawn order being reconstructible from
   the frame, and Task 4.5.8 broke a cut while every frame-checkable claim
   stayed green and 271 of 503 securities outranked the weakest row drawn.
8. **The frame section ships the factor values, not just the band.** An
   anomaly top-N is the **first section on this frame that is a reduction
   rather than a selection** — a reader holding the snapshot and the aggregate
   can re-derive which securities were eligible and what their moves were, but
   **cannot re-derive a score that depends on a 60-day baseline the frame does
   not carry**. Shipping the factor values per row (~240 B a row, ~2.4 KB a
   section, against the movers' measured 124.3 B a row) restores the property
   ADR 0038's grain rule exists for.
9. **Three recorded reversal triggers fire together the first time a score
   reaches this frame**, and each is evaluated in writing: ADR 0040's primary
   (_an anomaly score over a trailing session_ — the shared eligibility pass
   **splits**, and the window sentence becomes per-region rather than
   per-screen), ADR 0038's frame-grain (_a cadence that differs from the
   applied batch_), and ADR 0038's narrower one when Epic 7's tools arrive.
10. **The region's states join the kept grid** — thirteen states × four widths
    × seven surfaces, partition by drawn string equal to partition by declared
    class, failing in both directions. New surfaces mean new declared classes,
    and the rule is that **a content class is one aggregate**.
11. **The ordinary case is not an apology.** The region draws its rows
    whenever anything is scored, with the band carrying the verdict per row, so
    _nothing is unusual right now_ is read off the band names rather than off a
    sentence. `No scores yet.` remains for the genuinely unscored state, in the
    region's own words and honest at zero.
12. **Out of hours, the last session's closing scores are drawn and labelled
    with their instant.** An anomaly score has **no session basis** the way
    breadth and movers do, and the market is shut about 80% of the week — a
    region blank in four of five screenshots looks broken.
13. Scoring is over the **501 equities**, by the same positive-membership
    selection breadth and movers use, and the region says so. Scoring the
    fifteen proxies would make this region and `Market proxies` /
    `Sector performance` non-independent.

## Design work

**The region has never been drawn, and the canvas has no anomaly page at all** —
27 files and none on this subject. What exists to build from: the amber ramp as
tokens, with greyscale separations measured at **1.12, 1.43 and 1.59**, which is
_why_ the band name is written inside the fill; the constraint that the ramp is
**fills, never text, at any size**; and `AnomalyBadge`'s four named bands.

**One token-level collision to take to Design rather than inherit:**
`market.css` says the amber ramp is _"for anomaly intensity **and** for the
stale-data marker"_ — so from this story amber means _unusual_ in one place and
_stale_ in another, **on the same screen**. Colour is never the sole encoding, so
it stays correct; two meanings for one ramp is still a decision worth taking.

**And deleting this region's `reserved` panel leaves a finding live for Epic
6's.** Task 4.7.9 row 08 found that a rollback omitting a section draws a region
**exactly like one this product has not built yet** — same hatch, same muted
sentence, differing only by the **absence** of an `EPIC n` badge.

## Out of scope

The composite 0–100 score and the numeric figure on this list (Story 5.6), the
volume factor, and any score in the universe table.

## Handed here by Story 5.2's close — 2026-10-14: you are the story that fires two triggers, and one of them is in Epic 5's own file

**1. The figure you will rank already exists and is computed for ONE security on
demand.** `fiveMinuteReturn(window, { asOf })` is pure, takes the trailing window
and an `asOf` as arguments, and refuses rather than stretching. Nothing computes
it for 516 securities, and that is the line.

**2. Computing it per security in the socket callback fires Epic 14's THIRD
condition**, which lives in `EPIC.md` rather than in Epic 14's file: _the first
computation added to that callback that **derives a figure per security**, rather
than ranking or counting figures the join has already produced._ Story 5.2
evaluated it and it did **not** fire, for exactly one reason — a ring-buffer push
is storage, and the return is computed on demand for the security on screen.
**You are the story that changes that**, and the trigger is written against you
in all but name.

**3. And putting it on `/` fires the SECOND condition too** — _the first surface
on `/` that renders one element per tracked security_ — unless you rank into a
short list, which `PRODUCT_SPEC.md` §9's _Unusual activity_ panel already is.
Epic 5's `EPIC.md` says the honest alternative is a **top-N feed** and leaving the
universe table alone; Story 4.5 shipped the ranking-is-a-SELECTION idiom
(`moveRankingKey`, `compareByMove`, `selectMovers`, with
`one-comparator-for-the-order-of-a-move` refusing a second comparator) and you
should inherit it rather than write a second.

**4. Measure before you merge, not after.** Story 5.2's window costs are in Task
5.2.5's record with their caveats; the thing nobody has measured is **the return
computed 516 times a batch**, which is your arm. The two caveats are not optional
and are stated separately: a gapped Node sample inflates and the calibrator
**does not divide out** (4.38× subject against 2.29× calibrator), while a browser
figure reads ×1.00.

**5. ADR 0040's reversal trigger is yours to evaluate.** _The first aggregate on
this screen whose honest window is not breadth's_ — Story 5.2 recorded that it
did not fire, because a five-minute return is not an aggregate and is not on `/`.
**A ranked list of these figures on `/` is both.** If its honest window is not
breadth's five minutes, that trigger fires and the frame grain goes with it.
[ADR 0043](../../../docs/adr/0043-two-five-minutes-a-freshness-cutoff-and-a-measurement-span.md)
is why the return's span and breadth's cutoff are different quantities that
happen to share a number.

**6. A pass-through spec will not catch a wrong ranking.** Task 4.3.8's repair is
necessary and **not sufficient** — proved by Task 5.2.4, which broke a producer
into fabricating a figure and watched a pure pass-through stay green. Your spec
needs an **independent recompute** (`overview-movers-ranking.spec.ts` recomputes
all 503 moves) or an **external reference**; `docs/GAPS.md` carries both shapes
and the count of which existing specs have one.
