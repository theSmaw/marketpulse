# Story 6.3 — The Anomaly Encoding, & the Fourth Treatment a Canvas Needs

**Status:** Not started
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

1. **Four distinguishable treatments for four bands, and hue is not the only
   channel.** Measured in **greyscale** as this product requires, because the
   price palette differs by 1.04:1 in greyscale and hue is the entire
   difference — a rule that has already caught a chart that was wrong behind
   four passing simulations.
2. **`normal` is the quiet state.** Whatever the fourth treatment is, a market
   where nothing is unusual must not look like a Christmas tree — 219 of 484
   securities are `normal` at a median instant.
3. **The band is read off the frame, never recomputed.** The composite already
   crosses the wire with its explanation, and `readAnomalyScore` **re-adds the
   published contributions and refuses the whole explanation when the sum is not
   the score it was sent**. A renderer that derives a band from a raw figure
   bypasses the one mechanism that survives the socket.
4. **A security with no score is not drawn as `normal`.** CI's store has zero
   bars, no provider and no composite generation, so `0 of 3 factors` is its
   permanent state and **every node is unscored there, for ever**. An unscored
   node and a calm node are different claims, and conflating them is ADR 0029's
   false impression on 516 nodes at once.
5. **The measured distribution is stated beside the design, not discovered
   after it.** Per instant over 484 scored securities: `normal` **219.2**,
   `elevated` **179.4**, `high` **39.3**, `extreme` **7.74**. So roughly
   **8 nodes in 500** carry the strongest treatment on an ordinary day, and the
   design has to work at that ratio rather than at an even split.
6. **No invented curve.** A log cap, a sigmoid or a chosen knee mapping score to
   a visual magnitude is **calibrated in one tape's units** and breaks ADR 0045's
   invariance: a knee at `3× typical` means a different thing at 3.54% venue
   share than at 15.19%, and that spread is measured. _No invented constant_ and
   ADR 0045's test are the same rule from two directions.
7. **Colour is never the sole encoding** (ADR 0026's standing rule), and the
   token chain holds: canvas → `VISUAL-LANGUAGE.md` → `tokens.css` → renderer.
8. **A photograph per band at all four widths**, in colour and in greyscale.

## Open decisions — for the Product Owner

1. **What is the fourth treatment?** Candidates with precedent in this product:
   a ring versus a fill (the chip's own distinction, which a canvas _can_ do at
   node scale), size, opacity, or a halo. Each has a cost at 500 nodes and only
   one of them survives greyscale cheaply. This is a canvas question (ADR 0026)
   and the canvas has no page for it.
2. **Does an unscored node read as absent, or as present-and-unknown?** Both are
   honest; they look entirely different at 516 nodes, and CI shows only one.

## Design work

The four states on the canvas, in colour and greyscale, at node scale rather
than at chip scale. `The rail that says how unusual.dc.html` is the nearest
relative and it is a **DOM** page — its band word beside every entry is exactly
the affordance a canvas cannot borrow.

## Out of scope

Node sizing and edge strength (6.6) — this story encodes **one** quantity and
says so, because `PRODUCT_SPEC.md` §10 lists five possible encodings and
shipping them together makes none of them legible.
