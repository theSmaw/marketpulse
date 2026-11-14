# Story 7.2 — The Five-Step Pipeline

**Status:** Not started
**Epic:** [Epic 7 — Deterministic Investigation Engine](../EPIC.md)
**Depends on:** 7.1
**Epic scope covered:** The return-percentile, volume-anomaly,
peer-comparison, market-breadth and correlation tools; the full checklist
this epic's own exit criterion names.

## Description

**This story is this epic's exit criterion, verbatim, not an example of
it.** `EPIC.md` names five steps — measure price anomaly, measure volume
anomaly, compare peers, compare market, calculate breadth — and this story
builds the tool behind each one and wires all five into the one
orchestrator Story 7.1 proved. After this story, `Investigate` runs the
exact workflow the epic was accepted against.

**Each tool is a thin, typed wrapper over arithmetic this product already
has**, per `EPIC.md`'s own hand-off table from Epic 5's close — this story
adds orchestration and a tool contract, not new arithmetic, except where
named below:

- **Price anomaly** wraps `returnPercentileOf` (`apps/backend/src/
return-percentile.ts`) — already real, already refuses below its own
  sample-size floor (11 of 511 securities today).
- **Volume anomaly** wraps `volumeFactorAnswer()` (`packages/shared/src/
composite-score.ts`) — which **always** returns `{ state:
"no-distribution" }` on every store that exists. This tool therefore
  always answers "not enough evidence," by design, every time it runs —
  invariant 5's first-class `UNKNOWN` outcome rather than a failure, and
  this story ships that refusal honestly rather than hiding the step or
  inventing a number for it.
- **Compare peers** wraps `excessMoveReference` (`packages/shared/src/
excess-move.ts`), which picks the security's own sector benchmark.
- **Compare market** is this story's one new piece of arithmetic: the
  correlation tool (`calculate_rolling_correlation`), computed **on
  demand** between the investigated security and the broad market proxy
  (`SPY`) — distinct from Story 6.5's own nightly, fixed-universe,
  60-session batch correlation, which answers a different question (which
  pairs move together historically) rather than this one (how correlated
  is this specific security with the market, right now). **Confirm at this
  story's own technical shaping whether any part of Story 6.5's pipeline
  is reusable for an on-demand pair, or whether this is wholly new code**
  — `EPIC.md`'s own scope section flagged this as unconfirmed rather than
  assumed, and it is confirmed here rather than in `EPIC.md`.
- **Calculate breadth** wraps `marketBreadth` (`apps/backend/src/
market-breadth.ts`) — already real, already stated with a denominator
  rather than a bare percentage.

**Breadth is a group fact, not a per-security score, and the tool's own
output type says so.** `EPIC.md`'s own hand-off from Epic 5's decomposition
is explicit: breadth is "a stated clause rather than a weighted factor,"
identical for every member of a group. This tool's result type carries no
per-security verdict — a step that calls it is reasoning about the whole
market, and the UI must not render its answer as if it graded the
investigated security specifically.

**The security snapshot from Story 7.1 is not one of the five steps.** It
remains the investigation's own header context (`Investigating NVDA —
$242.18, +0.8%`), established once per investigation rather than re-run as
a numbered step — confirm this placement at this story's own design work
rather than assuming it.

## What the user can see when this story lands

Pressing `Investigate` now runs the full five-step checklist this epic's
own exit criterion describes, each step completing with its real tool's
real answer — including the volume-anomaly step, which completes by
honestly refusing every time, on every store that exists today.

## Acceptance criteria

1. All five tools exist, each implementing Story 7.1's shared analytical-
   tool contract, each wrapping the arithmetic named above rather than
   re-deriving it.
2. The volume-anomaly tool's refusal is rendered as a distinct, named
   outcome in the checklist (not a blank, not an error, not a skipped
   row) — the same `UNKNOWN`-shaped first-class outcome invariant 5
   requires everywhere else in this product.
3. The correlation tool's on-demand calculation is confirmed against the
   real codebase — reusing Story 6.5's own pipeline where it genuinely
   applies, built fresh where it does not — and the decision is recorded
   in this story's own task file rather than left implicit.
4. The orchestrator runs all five tools in the order `EPIC.md` names,
   streaming `STEP_STARTED`/`TOOL_CALL_STARTED`/`TOOL_CALL_COMPLETED`/
   `STEP_COMPLETED` for each, independently where the tools have no
   dependency on each other's output (`PRODUCT_SPEC.md` §12: "tool calls
   run independently where possible").
5. The breadth step's own result renders as a group-level fact, never as
   a verdict on the investigated security, and its own type structurally
   cannot carry a per-security score.
6. The checklist shows all five steps' real tool names, statuses and
   durations, matching `PRODUCT_SPEC.md` §14's own example shape.
7. `PRODUCT_SPEC.md` §28's investigation target is re-measured against
   the full five-step pipeline (not just 7.1's one-step figure) and
   reported.
8. Each tool is independently unit-tested against the real function it
   wraps, with no tool's test depending on another tool's output.

## Open decisions — for the Product Owner

- **Does "compare market" mean on-demand correlation to `SPY`, or a
  second invocation of the peer-comparison logic against the market proxy
  instead of the sector ETF?** This story's own description picks the
  former as the more useful, distinct signal; confirmed at Gate 1 rather
  than assumed silently.

## Out of scope

Findings and evidence as real domain objects — every step in this story
completes with a status and a duration, not yet a rendered finding (Story
7.3). Highlighting peer nodes on the topology graph (Story 7.4). Failure
and cancellation of a multi-step investigation (Story 7.5 — a tool that
throws in this story is an unhandled error, not yet a graceful
degradation).
