# Task 6.3.4 — The Accessible Account, & the Legend If There's Room

**Status:** Not started
**Story:** [6.3 The Anomaly Encoding, & the Fourth Treatment a Canvas Needs](STORY.md)
**Depends on:** 6.3.3

## Objective

A canvas has no accessible content of its own, and after Task 6.3.3 the
graph's one sentence is the _only_ account a non-sighted reader gets of the
fact that it now encodes something beyond structure. This task writes that
account, and gives sighted readers a key to the vocabulary if the region has
the vertical room for one.

## What the user can see when this lands

**A screen reader gets a real account of the encoding** — the band
vocabulary, and how many securities are in the bands that matter. **Sighted
readers may get a static key** naming the four bands, if `pnpm probe` shows
the room without pushing the sector-label or elevated-ring fit-scale
thresholds.

## Work

- **`topologyDrawnSentence` gains its new content**, in outline (final
  wording is a copy decision, held to these constraints):
  1. Keep the structural clause (sectors, benchmark ETFs, the broad market
     at the centre) — unchanged from Story 6.2.
  2. One clause naming the quantity: each equity also carries how unusual
     its recent behaviour is, on this product's four-band vocabulary —
     name the bands.
  3. One clause of counts for `high`/`extreme` only — the two bands that
     answer "where is it clustering." Never restate `Unusual activity`'s
     own cohort/population sentence.
  4. Point once to `Unusual activity` for the ten named securities. Say it
     once and stop — ADR 0029's one-fact-one-home rule.
  5. The honest-nothing clause where nothing is scored (CI's permanent
     state, and the first ~46s of a cold load) — distinct wording from "the
     structure is drawn but nothing is scored yet," not a silent gap.
  - **No live region.** The band set changes at feed cadence; the sentence
    stays current when read rather than announced when it changes — same
    decision Story 6.2 took for the structural sentence, restated rather
    than re-argued, with its own reversal trigger unchanged (the first
    change a reader must be told about without asking).
  - **Never states the raw score** (AC 8) — band words only.
- **A legend, gated on `pnpm probe`.** If the region's content box has the
  vertical room (measure against the real boxes — 998×425 at 1440 down to
  308×425 at 390 — without lowering the fit scale below the sector-label or
  elevated-ring thresholds Task 6.3.2 derived): a static, non-interactive
  key in the region's existing head slot, following `Unusual activity`'s
  `Top 10 · all extreme` precedent rather than inventing a new block. No
  focusable children, no new tab stop, never a filter control (that is
  Story 6.8's). **If there is no room, defer it explicitly** — state the
  measured shortfall in this task's own record and hand the condition to
  whichever later story first changes the region's chrome height, rather
  than silently dropping it.
- **`amber-appears-once-in-the-rail`'s own claim gets corrected.** Its check
  counts `.module.css` files; the topology reads the same ramp through
  `getTokens()` in TypeScript (`palette.ts`). Either widen the check's
  clause to cover palette token readers, or give the invariant's own claim
  text a dated amendment saying it is `.module.css`-scoped and naming the
  topology as the documented exception — whichever makes the claim true
  rather than merely unfalsified. A check you add or correct owes a
  `pnpm break` entry.

## Done when

1. `topologyDrawnSentence` states the band vocabulary and a `high`/`extreme`
   count, never a raw score, with no live region.
2. A legend exists if `pnpm probe` shows the room; if not, the shortfall is
   measured and stated, with an owner and a condition.
3. `amber-appears-once-in-the-rail` either covers the topology's token
   reads or carries a dated amendment saying why it does not, with a
   `pnpm break` entry proving whichever is true.
4. A component test asserts the sentence's content (band words present, no
   3+ digit numbers that could be a raw score, no cohort restatement).
5. `pnpm build && pnpm lint && pnpm format:check && pnpm test` all exit 0.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — YYYY-MM-DD

## For a stakeholder — a status report, YYYY-MM-DD
