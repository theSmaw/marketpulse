# Task 7.2.2 — The price-anomaly step

**Status:** Not started
**Story:** [7.2 The Five-Step Pipeline](STORY.md)
**Depends on:** 7.2.1

## Objective

The first of four new analytical tools: wraps `returnPercentileOf` so
`Investigate` reports how unusual the security's current 5-minute move
is against its own 60-session history — the same arithmetic that already
powers `Abnormal-move indicators` on the security page, read through a
tool contract rather than re-derived.

## What the user can see when this lands

Pressing `Investigate` on a security with a stored baseline shows a real
`Measure price anomaly` row completing with a genuine percentile (e.g.
`99th percentile`), or an honest, specific refusal — never a blank, an
error, or the previous story's single-tool checklist.

## Work

- Build `calculate_return_percentile` as an `AnalyticalTool<Input,
Output>` (`apps/backend/src/tool-return-percentile.ts` or similar),
  following `tool-security-snapshot.ts`'s established shape: a
  module-local brand on the output, a factory taking its dependencies as
  arguments, `run` never throwing.
- **Extract the shared producer rather than duplicating it.** `index.ts`'s
  `symbolReturn` already assembles this exact read-and-rank path
  (`trailingWindows.read` → `fiveMinuteReturn` →
  `baselines.baselineAsOf(...).get(symbol)` → `comparableBaseline` →
  `returnPercentileOf`) for the market-stream wire. Pull that assembly
  into one function both the wire frame and this tool call, so a figure
  never has two homes.
- **The tool distinguishes "no move to rank" from "no baseline to rank
  against."** Reuse `five-minute-return.ts`'s own four refusal kinds for
  the numerator (no bar observed, no bar exactly five minutes back, zero
  basis, the span guard) rather than letting an absent move fall through
  to `comparableBaseline`'s own, unrelated vocabulary.
- Reuse the existing `PercentileRefusal` vocabulary for the baseline half
  unchanged — do not re-spell `too-few-samples` or any other existing
  word.
- `not-tracked` for `PSKY`/`WBD` is decided once, before any tool runs
  (shared with every other tool in this story — confirm the mechanism
  this task establishes is the one Task 7.2.3–7.2.6 all reuse rather than
  each re-deriving it).
- Wire the tool into `investigationTools` in `index.ts`.

## Done when

1. `calculate_return_percentile` is unit-tested against the real
   `returnPercentileOf`/`comparableBaseline`/`fiveMinuteReturn` functions,
   independent of any other tool's test.
2. The checklist shows a real `Measure price anomaly` row on a developer's
   populated store, matching `PRODUCT_SPEC.md` §14's example shape.
3. `symbolReturn` and this tool read the identical extracted producer —
   no duplicated arithmetic.
4. The numerator/denominator refusal distinction is tested: a silent
   security and an under-sampled security produce different sentences.
5. `pnpm verify` is green; `pnpm store:bare` shows the correct honest
   refusal on a zero-bar store.
