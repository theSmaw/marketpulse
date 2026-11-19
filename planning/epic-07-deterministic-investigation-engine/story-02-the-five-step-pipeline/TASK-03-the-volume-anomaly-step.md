# Task 7.2.3 — The volume-anomaly step

**Status:** Not started
**Story:** [7.2 The Five-Step Pipeline](STORY.md)
**Depends on:** 7.2.1

## Objective

The simplest of the five new tools: wraps `volumeFactorAnswer()`
(`apps/backend/src/market-composite.ts`), which takes no parameters and
always returns `{ state: "no-distribution" }` on every store that
exists — `0015_volume_baselines.sql` stores a median and a dispersion,
never a distribution, so there is structurally no figure to rank
against, anywhere, today. This is a permanent, product-wide fact rather
than something about this security, and must read differently from the
price-anomaly tool's below-sample-floor refusal, which is about this
security specifically.

**Deliberately not** Story 5.5's richer, database-backed `volumeRateOf`
ratio (`× typical`, drawable on 4 of 39,928 buckets on the deployment,
with six of its own refusals) — that is a different, later scope. This
tool stays the structural percentile refusal `EPIC.md` named.

## What the user can see when this lands

Pressing `Investigate` always shows a `Check volume anomaly` row
completing with "not enough evidence" (reusing the existing `no history
to rank it` string through a shared builder rather than minting a new
one — one fact, one home with the security page's own ledger cell) —
never a blank, an error, or a skipped row, and identical on every store
that exists, including CI.

## Work

- Build `calculate_volume_ratio` as an `AnalyticalTool<Input, Output>`.
  Declare `Output` as the shape it would carry the day a distribution
  exists (`{ ratio, percentile }` or similar) even though the
  implementation only ever returns the refusal arm — this keeps
  `toRunnableTool`'s `toWire` well-typed and documents the tool's own
  reversal trigger (the `no-distribution` arm is deleted, not widened,
  the same commit `ANOMALY_BAND_FLOORS`' own trigger fires in).
- The refusal wording reuses the existing `no history to rank it` string
  via a shared builder — do not write a second sentence for this fact.
- Wire into `investigationTools`.

## Done when

1. `calculate_volume_ratio` is unit-tested — a single assertion that it
   always refuses with `no-distribution`, needing no database and no
   fixture.
2. The checklist row reads the existing, shared refusal string rather
   than a new one.
3. `pnpm e2e` proves the row renders as a named outcome rather than a
   blank, error or skipped row — the one AC in this story whose
   interesting case CI can actually reach, since the refusal is
   store-independent.
4. `pnpm verify` is green.
