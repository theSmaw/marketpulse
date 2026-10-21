# Task 5.6.4 — The score draws

**Status:** Not started
**Story:** [5.6 The Composite Score, & Its Explanation](STORY.md)
**Depends on:** 5.6.3

## Objective

**The sentence the epic exists for, on screen.** The first 0–100 figure in this
product, with its band and an account beneath it a reader can check by addition.

## What the user can see when this lands

On `/securities/:symbol`, as the **first band** of `Abnormal-move indicators`
(the owner's Gate 1 choice), above the three factor bands it summarises:

```
ANOMALY SCORE
68 / 100   ┃ elevated ┃
2 of 3 factors contributing

   FACTOR          WEIGHT   CONTRIBUTED
   Price               40            38
   Relative move       20            12
   Volume              25             —   no IEX volume history
   Breadth              —   stated as context

312 of 501 equities advancing in the last 5 minutes.
Not a measure of risk or investment opportunity.
```

**And on every machine that exists, most rows are refusals.** That is the shipped
product, not a shortfall.

## Work

- **The explanation is a LEDGER, not prose, and that is the load-bearing
  decision.** The factor figures, their definitions, their counted samples and
  their tapes are **already drawn in this region**, 100 px up. A paragraph
  restating `99th percentile of 4,620 5-minute returns` is two homes for one
  fact — which ADR 0029 forbids by name and `pnpm invariants` has failed a build
  over, and which is the `BarSeriesPanel` duplicate this product already deleted.
  So the ledger holds **only what the factor bands cannot**: the weight, the
  contribution, and a short reason for an absence.
- **Fixed arity is how you reserve for a variable account.** AC 6 wants one
  clause per contributing factor **and** one per absent factor — those are
  exhaustive and mutually exclusive, so the clause set is **total over the
  factors**: **four rows, constant, in every presence vector**. `Movers`' held-row
  lesson generalised from rows to clauses. 3-of-3 and 0-of-3 are **byte-identical
  in height**.
- **The reason cell gets 24 characters and the full sentence stays in the factor's
  own band.** A refusal kind that cannot be told from its neighbour in 24
  characters gets a **wider cell, never a softer word.** The pair hand-off 5.5/3
  names survives the compression: `baseline still filling` (22) against
  `no IEX volume history` (21) — **a wait** against **a gap in our listening**.
- **The figure: `--font-size-metric` (20/26), `--font-data`, `--font-weight-strong`,
  `--ink-primary`, with `/ 100` at micro in `--ink-secondary` on the same
  baseline.** Not display — that size is spent once per screen and
  `SecurityIdentity` already spends it. The denominator does three jobs and the
  third matters most: **it is the cheapest defence against the risk-meter
  misread**, because a needle on an arc says _risk_ and `68 / 100` says _a count
  on a stated scale_.
- **The chip sits on the figure's row, baseline-aligned, and costs 0 px** — a
  13 px glyph on dense 18 px leading sits inside a 20 px metric figure's ascent
  and descent, which `.percentile` and `.comparand` both measured and recorded.
  The canvas's §07 specimen stacks it above and costs two line boxes; that is
  **superseded with a dated correction**, not silently redrawn.
- **Amber appears exactly once** — the chip's fill, behind its **written** name.
  Not the score, not a contribution, not a weight. **One `pnpm invariants` clause
  with a break**, because the tempting edit (tint the score to match the chip) is
  the one that breaks it.
- **AC 11, two channels.** The band's micro label is `HOW UNUSUAL · NOT A RISK
MEASURE` (32 chars, free, **above** the figure so a reader meets it in the same
  glance), plus one reserved line at the foot: `A measure of how unusual, not of
risk or opportunity.` (53 chars). Not in `SourceNote` — that note is about
  _where numbers came from_ and a statement about what a figure **means** is not
  provenance; that is where boilerplate goes to be ignored.
- **`0 of 3` is NOT a score of `0`.** `0` claims _we measured, and nothing is
  unusual_. Words rather than digits, never an em dash — `—` is `unchanged` in
  `PriceChange`, so a dash asserts zero.
- **No popover, no disclosure, no `Why this band?`, no tooltip, zero new tab
  stops.** `SecurityRow.tsx:98` wraps `AnomalyBadge` in `Popover title="Why this
band"` and `Popover.tsx` says the quiet part: _"the first thing this seam
  carries is an anomaly score's explanation."_ Right for a dense table row, wrong
  here: §11 requires every score to **carry** its explanation, not that it can be
  asked for one, and AC 6's elements cannot be audited by walking a DOM that does
  not contain them until a click.
- **No new motion.** A score is a **state**, so it persists; the shipped disc
  means _a bar arrived for this security_ and already fires 200 px above, because
  a revision **is** a bar arrival. A disc here would be a fourth meaning for one
  mark. **But evaluate `AbnormalMove.tsx:100-106`'s trigger in writing** — it
  names _"Story 5.6's band word, if it lands after the figure does"_ by name, and
  an unevaluated trigger reads identically to one that did not fire.
- **Probe before believing any of the above.** The reserve arithmetic predicts
  the band at **≈230 px** and the region at **256 → ≈486**, firing
  `MARKET-OVERVIEW.md` §1.4's trigger a **fourth** time — the largest step any
  band has taken. The method reproduces the two shipped bands exactly (142 and
  114, confirmed against a probe), which is why it is trusted and still not
  believed: `pnpm probe /securities/NVDA --within Abnormal` at four widths, and
  the clause-track budget via `pnpm probe --story … --viewports 374x900`.
- **Author the canvas pages**, pre-authorised. Page A `The score, and the account
beneath it`, and a dated amendment to `The rail that says how unusual`
  correcting §07's specimen on four counts (20-session → 60-session, `normal` →
  `typical`, level → rate, and the stacked arrangement).
  - **Draw the arc to REJECT it.** A meter shape is what makes a figure read as a
    risk meter, and AC 11's sentence cannot out-argue a picture of a needle. If
    the rejection is not drawn, the next author adds one in good faith.

## Done when

1. The score, its chip and the ledger draw, with the ledger's column summing to
   the score **on screen** in every state.
2. The region is **one height in every state at four widths**, probed and recorded
   per width.
3. Every state in the enumerated set is reachable and no two read identically.
4. Amber appears once, held by an invariant with a break.
5. Both reversal triggers evaluated in writing.
6. Canvas pages authored and uploaded; §07 corrected with a date.
7. `pnpm verify`, `pnpm e2e` green at two workers.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — YYYY-MM-DD

## For a stakeholder — a status report, YYYY-MM-DD
