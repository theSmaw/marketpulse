# Story 6.3 — The Anomaly Encoding, & the Fourth Treatment a Canvas Needs

**Status:** **In progress — 2026-11-02.** Gate 1 passed the same day: five
tasks, four decisions taken (live updates broadcast to everyone; amber for
`high`/`extreme` only; the fifteen sector-ETF/proxy landmarks excluded from
the encoding entirely; AC 2 reworded to the measurable claim). See
Decisions below.
**Epic:** [Epic 6 — Market Topology](../EPIC.md)
**Depends on:** 6.2
**Epic scope covered:** Node movement/anomaly encoding

## Description

**This is half of the epic's exit criterion** — _unusual securities are visually
obvious_ — and it is the story where this epic meets a problem the DOM
presentation solved by **not using colour at all**.

`AnomalyBadge` draws `normal` as a **bordered chip with no fill**, deliberately:
the step from `--anomaly-normal` to `--anomaly-elevated` is the amber ramp's
weakest at **1.12** in greyscale, so the two states hardest to tell apart by
colour are the two not distinguished by colour. **A canvas cannot do that.** It
colours every node whether interesting or not, and it cannot render _no chip_.

So: **four visible treatments where the chip has three**, and it cannot be hue
alone — the ramp's internal steps are **1.12 / 1.43 / 1.59**. That is this
story's central design problem, and `--anomaly-normal` exists for it.

**And the score it draws has a ceiling of 75, not 100.** `ANOMALY_BAND_FLOORS`
are `elevated 32 · high 63 · extreme 73`, derived from **34,318** measured
scores, with the selecting inequality `elevated ≤ 40 < high` because a one-factor
score caps at 40. **A topology that colours nodes by band fires that constant's
reversal trigger the day the volume factor contributes** — which Epic 7 now owns.

## What the user can see when this story lands

**The unusual securities light up.** On `/`, the graph's nodes carry their
composite anomaly band, so a reader sees _where_ unusual activity is rather than
reading a ranked list of ten names — which is what §9 means by the visualization
being the centre of gravity, and what `Unusual activity` beside it cannot do.

## Acceptance criteria

**Rewritten 2026-11-02 at this story's own Gate 1**, after shaping (BA, TA, UX
in parallel) found AC 2 unmeasurable as written, AC 5's own figures internally
inconsistent, and three real states — the fifteen unscorable landmarks, a
frame with the band section missing, and a live-updating band — that the
first draft had no criterion for at all. Each note below says what changed
and why.

1. **Four distinguishable treatments for four bands, and hue is not the only
   channel.** Measured in **greyscale** as this product requires, because the
   price palette differs by 1.04:1 in greyscale and hue is the entire
   difference — a rule that has already caught a chart that was wrong behind
   four passing simulations. **Settled at Gate 1**: a ring in the node's
   already-reserved 4-unit annulus, absent for `normal`, growing in weight for
   `elevated`/`high`, with `extreme` the only band that also changes the
   node's own fill — never size, opacity or a halo (all three are spoken for
   elsewhere, or redundant with the ring; see Decisions). **Amber is spent for
   `high`/`extreme` only** — `elevated` carries no hue, because the order
   survives on ring weight alone and this screen's chrome already spends amber
   for degraded states.
2. **~~`normal` is the quiet state. Whatever the fourth treatment is, a market
   where nothing is unusual must not look like a Christmas tree — 219 of 484
   securities are `normal` at a median instant.~~ — reworded: this market
   state does not exist and the criterion is unmeasurable as first written.**
   `ANOMALY_BAND_FLOORS` are percentiles of their own distribution
   (`elevated` is the **p50**), so roughly half the scored universe sits at
   `elevated`-or-above on every session there has ever been — there is no
   "nothing unusual" day to design against, the same tension
   `PRODUCT_SPEC.md` §11 already carries a dated amendment for. **The real
   claim: the measured ordinary instant (AC 5's own distribution) must not
   read as an alarm.** `elevated` is the ordinary upper half and must read as
   such — ordinary, not warning — which is why it carries no colour. What the
   picture is allowed to read as a hot spot is `high`/`extreme` only, ~10%
   and ~2% of the scored population respectively.
3. **The band is read off the frame, never recomputed.** The composite already
   crosses the wire with its explanation, and `readAnomalyScore` **re-adds the
   published contributions and refuses the whole explanation when the sum is not
   the score it was sent**. A renderer that derives a band from a raw figure
   bypasses the one mechanism that survives the socket. A refused explanation
   draws **unscored**, never a best-effort band.
4. **A security with no score is not drawn as `normal`, and the fifteen
   sector-ETF/proxy nodes are not drawn as unscored either — they are
   excluded from the encoding entirely.** CI's store has zero bars, no
   provider and no composite generation, so `0 of 3 factors` is its permanent
   state and **every one of the 501 equities is unscored there, for ever** —
   drawn hollow (an achromatic outline, no fill), never calm. The eleven
   sector SPDRs, the four market proxies and the hub are a **different
   claim**: the composite's population is the 501 curated equities and
   cannot include them (a sector ETF is its own benchmark; a broad-market
   fund has no sector) — the encoding does not apply to them, so they keep
   Story 6.2's shipped treatment, unchanged, on every store that exists.
   **Settled at Gate 1** — three shaping roles converged on this
   independently.
5. **A frame whose band section is missing or unreadable never blanks what is
   already drawn.** A rollback, a previous image, or two nightly tables a
   session apart (ADR 0044's own "never mix two sessions' halves" rule) all
   produce **no** section rather than a wrong one — and the picture holds the
   last bands it had rather than reverting 501 nodes to hollow on one bad
   frame. This is `/`'s own "an answer already on screen is never blanked by
   a newer request in flight" rule arriving at 501 nodes instead of one.
6. **The measured distribution is stated beside the design, and it is
   RE-MEASURED before this story cites it again.** The figures this story
   inherited (`normal` 219.2, `elevated` 179.4, `high` 39.3, `extreme` 7.74
   per instant over "484 scored securities") sum to **445.6**, not 484 — an
   inconsistency found at shaping, not yet resolved. Task 6.3.1 re-takes this
   figure against real data once the wire section exists, and states the
   population the four numbers actually describe.
7. **No invented curve.** A log cap, a sigmoid or a chosen knee mapping score to
   a visual magnitude is **calibrated in one tape's units** and breaks ADR 0045's
   invariance: a knee at `3× typical` means a different thing at 3.54% venue
   share than at 15.19%, and that spread is measured. _No invented constant_ and
   ADR 0045's test are the same rule from two directions — a four-step band
   ladder is not a curve; a continuous score-to-magnitude map would be.
8. **The graph never states the raw score, only the band — the ceiling of 75
   is invisible on this surface, and that is correct rather than a
   limitation.** `Unusual activity` and `Abnormal-move indicators` both state
   the score with its cohort and its `max`; a bare `75` on a node with no
   qualification would read as three-quarters up a 100-point scale rather than
   the top of a 75-point one. At node scale there is no room for the
   qualification, so the number does not travel — the band word does, and
   only in the accessible sentence (Task 6.3.4), never painted.
9. **Colour is never the sole encoding** (ADR 0026's standing rule), and the
   token chain holds: canvas → `VISUAL-LANGUAGE.md` → `tokens.css` → renderer.
10. **A photograph per band at all four widths**, in colour and in greyscale.

## Decisions — settled 2026-11-02 at this story's Gate 1

Four questions, batched in one round, every one taken with the recommendation
offered:

1. **Bands update live, broadcast to every connected client on the existing
   overview frame** — not a static snapshot, not a subscription-scoped
   section. A snapshot is cheaper (no renderer update channel, no memo
   re-take) but visibly disagrees with the live `Unusual activity` region
   beside it within minutes of a tab being left open, which is the costlier
   defect. ~3.1KB, +76% on the frame's measured ceiling, paid by every route
   including ones that draw no graph — accepted against the alternative's
   correctness cost. **Reversal trigger, a condition:** the first route whose
   own cost budget this frame visibly breaches.
2. **The ring spends amber for `high`/`extreme` only; `elevated` is
   achromatic.** The order survives on ring weight alone in greyscale; amber
   mainly reinforces for colour-sighted readers on the two bands that matter
   most, and this avoids putting colour on ~40% of the graph in a hue this
   screen's chrome already spends on degraded states.
3. **The fifteen sector-ETF/proxy/hub nodes are excluded from the band
   encoding entirely** — not unscored, not drawn specially, Story 6.2's
   shipped treatment unchanged. See AC 4.
4. **AC 2 is reworded to the claim the scoring model can actually be measured
   against** — see AC 2's own note.

## Design work

The four states on the canvas, in colour and greyscale, at node scale rather
than at chip scale. `The rail that says how unusual.dc.html` is the nearest
relative and it is a **DOM** page — its band word beside every entry is exactly
the affordance a canvas cannot borrow. `The graph at rest.dc.html` §03
already reserves the 4-unit annulus this story draws inside and names the
collision with Story 6.4's focus ring explicitly. **Resolved here rather
than left for 6.4 to find**: this story's ring is 516-wide and must stay
cheap and quiet, while 6.4's focus is exactly one node at a time and can
afford a louder treatment — so **this story takes the annulus and 6.4's
focus/selection treatment goes outside the footprint** (`nodeAt`'s hit-test
already targets the 16-unit footprint rather than the 8–12-unit ink, so a
treatment outside it needs no hit-area change). Written into Story 6.4's own
file at this story's close (Task 6.3.5), in words that story can act on.

## Out of scope

Node sizing and edge strength (6.6) — this story encodes **one** quantity and
says so, because `PRODUCT_SPEC.md` §10 lists five possible encodings and
shipping them together makes none of them legible.

## Handed here by Story 6.2's close — 2026-11-01: two reversal triggers this story is the likely source of

**`topologyDrawnSentence`'s own sentence is false the moment this story
ships.** `MarketTopology.tsx`'s accessible text equivalent reads _"Nothing in
it is a measurement — it is a picture of how the market is organised."_ —
true only while the graph encodes nothing but structure. The moment a node's
visual treatment is driven by its anomaly band, that clause is wrong and
needs rewriting alongside the band itself; `topologyDrawnSentence` is named
in `MarketTopology.tsx`'s own docblock as the one place to amend, beside
`topologyFailureSentence`, so there is nowhere else to look for it.

**The declined `React.memo` boundary's own reversal trigger may fire here
too.** Story 6.2's Task 6.2.5 traced the mount effect's deps
(`[topology, probe, sentenceId]`) and found none of them change at feed
cadence, so a memo boundary was declined with the reversal trigger _"the
first prop this region takes that changes at feed cadence"_ — recorded in
`MarketTopology.tsx`'s own docblock. If this story's anomaly band is driven
by a live-updating score (rather than a value read once at mount, as the
rest of the graph is), that is this trigger firing, and the memo decision
needs re-taking with a producer-side measurement rather than assumed to
still hold — `MarketTopology.test.tsx`'s own "the declined memo boundary"
describe block has the test shape to extend or replace.
