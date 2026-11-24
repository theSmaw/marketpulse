# Task 7.3.5 — The inapplicability sentence, AC 3's own gap

**Status:** Complete — 2026-11-24. Found during Phase 3's own integrated
verification, not during any of the four decomposed tasks: Gate 1's own
settled decision — "the row draws the inapplicability's own sentence with
no confidence mark at all" — was never actually built. Task 7.3.1's own
record asserted it was ("the row renders the inapplicability sentence
Story 7.2 already ships"), which was simply false — Story 7.2's own
Task 7.2.4 explicitly deferred it, in as many words, to "the first
surface that draws a step's own outcome." Nothing in Tasks 7.3.1–7.3.4's
own unit tests caught this, because every test asserting the inapplicable
case asserted `claim === undefined`, which was consistent with "nothing
shown" and never checked for "a sentence explaining why."
**Story:** [7.3 Findings, Evidence, & Confidence](STORY.md)
**Depends on:** 7.3.1, 7.3.3 (reuses the `stale` interaction that task
built)

## Objective

Close AC 3's own gap: when a comparison tool (`compare_securities`,
`calculate_rolling_correlation`) answers `inapplicable` — the question
does not arise, structurally, for this security (an ETF comparing itself
against its own sector benchmark, or `SPY` comparing itself against the
market proxy it is) — the checklist row must draw a sentence saying why,
with no confidence mark at all, rather than the bare checkmark the
shipped product actually drew.

## How this was found

Phase 3's own integrated verification (re-reading `STORY.md`'s thirteen
acceptance criteria against the merged, integrated codebase, one by one,
with evidence) found AC 3's own text did not match the shipped behaviour:
`InvestigationChecklist.tsx`'s own comment read "a queued row, a running
row and an `inapplicable` step each have nothing to say," which is a
correct description of what the code did and a direct contradiction of
what Gate 1 decided. Traced to its source: Task 7.3.1's technical shaping
cited a prior surface ("Story 7.2 already ships" this sentence) that,
checked against Story 7.2's own task file, never existed — Task 7.2.4
explicitly named this gap and routed it forward by name rather than
building it.

## What the user can see when this lands

Investigating a sector ETF or SPY now shows a real sentence on the
comparison step's row — `Sector comparison — it is the sector benchmark
itself` — with no confidence mark, rather than a bare checkmark with
nothing beside it.

## Work

- **`packages/shared/src/finding-claim.ts`**: a new `TOOL_INAPPLICABILITY_
CLAIMS` (a total record over `ToolInapplicability`, mirroring
  `TOOL_REFUSAL_CLAIMS`'s own shape and register exactly) and
  `inapplicableClaim(type, because)`, built from the same `FINDING_
SUBJECTS` grammar `refusalClaim` uses — never a second vocabulary for
  one register.
- **`investigation-checklist-state.ts`**: `TOOL_CALL_COMPLETED`'s reducer
  case, previously a no-op for every outcome kind, now builds and sets
  the sentence when `outcome.kind === "inapplicable"` — deriving the
  step's `FindingType` from the event's own `tool` field via `FINDING_
TYPE_FOR_TOOL`, both narrowed safely from the wire's loosely-typed
  strings (`isToolName`/`isToolInapplicability`, mirroring
  `investigation-event.ts`'s own `isConfidence` idiom). `ok`/`refused`
  outcomes are untouched — those are still `FINDING_CREATED`'s.
- **A real bug found by this task's own test, before it reached a
  browser**: the first draft set `claim` but did not explicitly clear
  `confidence`, so a second-press row carrying a stale, real confidence
  level forward (Task 7.3.3's own feature) kept that confidence sitting
  beside the new inapplicability sentence. Fixed by setting `confidence:
undefined` explicitly rather than relying on the spread.
- No change to `InvestigationChecklist.tsx` itself — its existing
  rendering (`step.confidence === undefined ? null : <ConfidenceMark />`)
  already drew exactly this shape once the data arrived; the gap was
  entirely in the reducer never producing it.

## Done when

1. `inapplicableClaim`/`TOOL_INAPPLICABILITY_CLAIMS` exist in
   `packages/shared`, tested for the claim ceiling, no terminal stop, no
   figure, and pairwise distinctness across the whole cross-product —
   the same four properties `refusalClaim`'s own suite holds.
2. `TOOL_CALL_COMPLETED` sets the claim (and clears any stale confidence)
   for an `inapplicable` outcome, tested at the reducer level including
   its interaction with a second press's `stale` flag.
3. A component-level test confirms the row draws the sentence with zero
   `ConfidenceMark`.
4. `pnpm verify` is green.

---

## What was done — 2026-11-24

All four Done-when items met. `pnpm invariants` holds **97** (unchanged —
no new invariant needed; the existing total-record pattern already
enforces a fourth inapplicability word is a compile error). `pnpm test`
gained 9 tests (4 in `finding-claim.test.ts`, 4 in
`investigation-checklist-state.test.ts`, 1 in
`InvestigationChecklist.test.tsx`) — 779 + 1518 + 2044 = 4,341 passed,
up from Task 7.3.4's own 4,332.

**The real bug this task's own test caught** (recorded above in Work) is
the kind of thing this repository's own working-loop rules ask for: a
break was not needed here because a unit test already exercised the exact
interaction (stale confidence + new inapplicable claim) and failed loudly
with a clear diff before any manual check was needed.

### Gates

`pnpm build`, `pnpm lint`, `pnpm format:check`, `pnpm stories` (50/50),
`pnpm env:check`, `pnpm links` (0 broken), `pnpm invariants` (97 hold),
`pnpm typecheck`, `pnpm test` (4,341 passed), `pnpm test:scripts` (21
passed), `pnpm test:process` (63 passed), `pnpm coverage:check` — all
green.

**Not run**: `pnpm test:database`, `pnpm e2e` — no Docker on this
development machine for the whole of this session.

## For a stakeholder — a status report, 2026-11-24

While doing the final, whole-story check that every task's work actually
adds up to what was promised, a real gap was found: one of this story's
thirteen acceptance criteria had been agreed at the product-decision
stage but never actually built, because an earlier task's own record
incorrectly stated it already existed from a prior story. Investigating
an ETF or a major index now correctly shows why a comparison step doesn't
apply to it, rather than a blank checkmark with no explanation — closing
the gap before the story was presented as complete, not after.
