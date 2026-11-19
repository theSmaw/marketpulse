# Task 7.2.6 — The compare-market (correlation) step

**Status:** Not started
**Story:** [7.2 The Five-Step Pipeline](STORY.md)
**Depends on:** 7.2.1, 7.2.4 (for the shared `inapplicable` contract shape)

## Objective

A new on-demand Pearson correlation between the investigated security
and `SPY`, resolved with the Product Owner as this story's reading of
"compare market." Reuses Story 6.5's pure arithmetic only
(`pearsonCorrelation`, `correlationIsSignificant`,
`CORRELATION_MINIMUM_OVERLAP`) and its per-security store reads
(`subjectFor`, `readWindowCloses`, `baselineReturnSeries`,
`seriesIsDiscontinuous`, `baselineWindowEndingAt`) — never its nightly
batch machinery (`selectStrongestCorrelations`,
`accumulateCorrelationInput`, the full-universe sweep), which
structurally excludes every landmark symbol including `SPY` from ever
forming a stored pair. See `STORY.md`'s "Resolved at Gate 1" for the
full reuse record.

## What the user can see when this lands

A row reporting the security's correlation with the broad market — its
**direction** and whether it is statistically **significant**, over a
counted sample of shared five-minute returns — never a raw coefficient
and never an adjective like "strong" or "weak." For `SPY` itself, the
row completes as `inapplicable` (self-correlation is vacuous); for
`QQQ`/`DIA`/`IWM`, a real, computed figure (resolved at Gate 1: `SPY`
only is inapplicable, the other three proxies are genuine measurements).

## Work

- Build `calculate_rolling_correlation` as an `AnalyticalTool<{ symbol,
against }, Output>` — a general pair function, with the `SPY` default
  resolved at the `index.ts` wiring site (`buildInput`), not hard-coded
  inside the tool, so it stays reusable for a later, different pair
  (Epic 10's `get_related_securities`-driven comparisons).
- `Output`: `{ symbol, against, direction, significant, n, lookbackSessions,
feed }` — deliberately **no `r` field on the rendered/wire side**. Keep
  the raw coefficient internal if useful for a unit-test assertion, but
  do not let it reach the wire: printing a coefficient as a figure fires
  `CORRELATION_MINIMUM_OVERLAP`'s own stated reversal trigger, which
  additionally requires a derived precision floor this story does not
  take on.
- Use the `is-the-market-proxy` member of `ToolInapplicability`
  (`packages/shared/src/investigation.ts`), already added by Task 7.2.4
  alongside `no-sector`/`is-benchmark` — the real third `ToolOutcome` arm
  (`{ kind: "inapplicable", because }`), resolved 2026-11-19. Do not
  re-derive the shape; reuse it.
- Reads: resolve the baseline store's covered end → `baselineWindowEndingAt`
  → `subjectFor` for both legs → `readWindowCloses` for both legs →
  **re-run `seriesIsDiscontinuous` on each leg explicitly** (the nightly
  pass inherits this verdict from elsewhere; this on-demand caller must
  take it itself) → `baselineReturnSeries` for both legs →
  `pearsonCorrelation` → `correlationIsSignificant`.
- Derive the window from `context.asOf`, never from the ledger's covered
  end directly, to stay temporally isolated under Epic 13's eventual
  replay — note this is the one input in this tool that needs explicit
  care, since every other tool in this story already reads `asOf` as a
  plain argument.
- Refusal vocabulary: the two existing words (`too-few-overlapping-samples`,
  `zero-variance`) plus whatever this tool needs for "no window exists at
  all" (CI, a cold replica) — fold that into `too-few-overlapping-samples`
  with `n: 0` rather than minting a new word, matching
  `comparableBaseline`'s own established pattern for "no generation
  loaded" sharing a word with "too short."
- Wire into `investigationTools`.

## Done when

1. `calculate_rolling_correlation` is unit-tested against the real
   `pearsonCorrelation`/`correlationIsSignificant`/`baselineReturnSeries`,
   with furnished `ReadonlyMap`s — no database needed for the arithmetic
   itself.
2. A database-backed test (`pnpm test:database`) covers the on-demand
   fetch shape against a real store, including the split-guard re-run.
3. Investigating `SPY` shows this step as `inapplicable`
   (`is-the-market-proxy`); investigating `QQQ`/`DIA`/`IWM` shows a real
   computed figure.
4. No raw coefficient reaches the wire or the screen anywhere in this
   step's output.
5. `a-tool-reads-no-clock` passes — the window is derived from
   `context.asOf`, not a ledger read.
6. `pnpm verify` is green; `pnpm store:bare` shows the correct honest
   refusal (`too-few-overlapping-samples`, `n: 0`) on a zero-bar store.
