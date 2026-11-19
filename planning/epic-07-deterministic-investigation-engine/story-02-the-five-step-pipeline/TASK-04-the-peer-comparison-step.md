# Task 7.2.4 — The peer-comparison step

**Status:** Not started
**Story:** [7.2 The Five-Step Pipeline](STORY.md)
**Depends on:** 7.2.1

## Objective

Wraps `excessMoveFactor` (`apps/backend/src/excess-move-factor.ts`),
using `excessMoveReference` (`packages/shared/src/excess-move.ts`) only
to pick the security's own sector benchmark ETF — `excessMoveReference`
alone is not "the comparison," it only resolves which fund. Described on
screen as **"Compare against sector benchmark"** (resolved at Gate 1),
because the shipped arithmetic is a comparison against the
capitalisation-weighted sector SPDR, and "compare peers" promises an
unweighted peer median this product does not compute.

## What the user can see when this lands

For an equity with a sector, a real `Compare against sector benchmark`
row completing with the security's move, the benchmark's move and the
excess, or an honest refusal. For a sector ETF or a market proxy (which
has no sector of its own, or _is_ the benchmark), the row completes as
`inapplicable` — a different, honest answer from a refusal, because no
future backfill will ever produce a figure for "compare XLK's sector
move against its own sector."

## Work

- Build `compare_securities` as an `AnalyticalTool<Input, Output>`.
  `Input` is `{ symbol }` only — never the benchmark; `excessMoveReference`
  decides it, so accepting it as an argument would be a second home for
  that choice.
- `Output` mirrors `ExcessMoveFactor`'s three arms: scored, refused (with
  reason + bound), and **inapplicable** (`applies: false`, `because`) —
  do not collapse `inapplicable` into `refused`. Confirm with the
  technical architect (flagged at Gate 1 as a wire-format question not yet
  settled) whether `ToolOutcome` gains a third top-level arm or whether
  `inapplicable` maps onto `refused` with a distinct `because` reason —
  decide and record this before shipping, since it is a contract other
  tools (compare-market, Task 7.2.6) also need for their own `inapplicable`
  case.
- Reads both the subject's and the reference's `trailingWindows` and
  `fiveMinuteReturn` at the one `context.asOf`, then
  `excessBaselines.baselineAsOf(...).get(symbol)` → `excessMoveFactor`.
- `reference-split-discontinuity` (the benchmark's own split) stays a
  separate sentence from `split-discontinuity` (the subject's) — do not
  merge them, they refuse different securities and are repaired
  differently.
- `not-tracked` reuses the shared, once-decided mechanism from Task 7.2.2.
- Wire into `investigationTools`.

## Done when

1. `compare_securities` is unit-tested against the real
   `excessMoveFactor`/`excessMoveReference`, independent of any other
   tool's test.
2. A sector ETF or market proxy investigation shows this step as
   `inapplicable`, visibly distinct from a refusal.
3. The `ToolOutcome`/`inapplicable` contract decision is made and
   recorded in this task file (not left implicit), and the shape is
   confirmed reusable by Task 7.2.6's own `inapplicable` need.
4. `pnpm verify` is green; `pnpm store:bare` shows the correct honest
   refusal on a zero-bar store.
