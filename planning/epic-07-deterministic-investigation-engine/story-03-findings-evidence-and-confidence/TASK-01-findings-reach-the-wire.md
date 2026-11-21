# Task 7.3.1 — Findings reach the wire, and the checklist shows a plain claim

**Status:** Not started
**Story:** [7.3 Findings, Evidence, & Confidence](STORY.md)
**Depends on:** nothing (lands on top of Story 7.2's shipped six-step pipeline)

## Objective

Every other task in this story styles, places or announces a claim that
has to exist first. This task mints it: the `Finding`/`Evidence` domain
types, the six tools' claim-and-confidence logic, the wire event, and the
plainest possible rendering — so the real value is on screen before any
layout or accessibility work begins.

## What the user can see when this lands

Each completed checklist row grows a second line of plain, unstyled text
stating what was actually measured (e.g. `−4.2% over 5 min — 94th of
4,620`) or why it wasn't (`Volume rate — no history to rank it`). No
confidence mark yet — that is Task 7.3.2's. An `inapplicable` step (SPY
correlating with itself, a sector ETF comparing against its own sector)
shows its own sentence with nothing styled at all.

## Work

- **`packages/shared/src/finding.ts`** (new module, not inside
  `investigation.ts`): `FINDING_TYPES`/`FindingType` (six values, one per
  step — settle the sixth, snapshot-step name between `PRICE_OBSERVATION`
  and `LATEST_PRICE` here), `CONFIDENCE_LEVELS`/`Confidence` (all four,
  `CONFIRMED` documented as having no producer in this epic), the
  two-arm `Finding` union (`EvidencedFinding` with a non-empty-tuple
  `evidence`, `UnevidencedFinding` with a `because` field and no
  `evidence` member), the real-`Symbol` brand, and exactly two exported
  mint functions (`createEvidencedFinding`, `createUnevidencedFinding`).
  Mirror `composite-score.ts`'s `AnomalyScore`/`UnscoredAnomaly` shape
  directly — brand, non-empty tuple, mint-site count — rather than
  re-deriving it.
- `Evidence`'s shape: `kind` (`market_observation` | `calculated_metric`
  only — the other six §16 names stay undeclared, condition in the
  docblock), `source` (the feed), `observedAt?` (absent, never
  `undefined`, where there is no observation), `retrievedAt` (see
  below), `method?`, `security?` (absent for breadth), `rawData`.
- **New invariant `two-mint-sites-for-a-finding`**, mirroring
  `two-mint-sites-for-an-anomaly-score`, with its own `pnpm break` entry.
- **`RunnableTool.run`'s return type widens** from `ToolOutcome<Output>`
  to `{ outcome: ToolOutcome<Output>; finding: Finding | undefined }` —
  `undefined` for the `inapplicable` arm, which mints no Finding (AC 3's
  stated exception). Update `toRunnableTool`'s signature to take a
  fourth argument, `toFinding: (outcome, stamp: FindingStamp) =>
Finding | undefined`, and update all six call sites in `index.ts`.
  `FindingStamp` carries `stepId`, a `findingId`, an `evidenceId`
  generator and `retrievedAt: Date` — supplied by the orchestrator at the
  moment it emits the event, **never** read inside a tool or inside
  `packages/shared` (the clock-reading invariants stay untouched).
- **Per-tool `toFinding` functions**, co-located beside each tool's
  existing `toWire…` function: derive the claim and confidence from the
  tool's own typed `Output` — never from the wired JSON, never from the
  tool's name or description. Confidence rule: `refused` → `UNKNOWN`
  always; `ok` below the tool's own stated sufficiency floor
  (`significant: false`, `measured: 0`, etc.) → `POSSIBLE`; `ok` above it
  → `SUPPORTED`. `inapplicable` → no Finding (return `undefined`).
  Reuse the shipped formatters (`describeMeasuredSet`,
  `percentileOrdinal`, etc.) for every figure a claim states — never a
  second spelling.
- **The orchestrator** (`scripted-agent-provider.ts`): after
  `TOOL_CALL_COMPLETED`, if `finding !== undefined`, emit
  `FINDING_CREATED` carrying the finding (with its evidence inline) and
  stamp `retrievedAt = now()` (the provider's own injected clock, already
  legitimate there) before `STEP_COMPLETED`. No event at all for the
  `inapplicable` (no-finding) case — the row renders the inapplicability
  word Story 7.2 already ships, untouched.
- **Wire shape**: a new `InvestigationEvent` member `FINDING_CREATED`
  carrying `WireFinding` (a **hand-written, field-by-field** mapper —
  never `WireFields<Finding>`, which would silently skip the brand's
  symbol key and encode nothing). `EVIDENCE_ADDED` is **not** added to
  the typed union this story (Gate 1's resolution) — leave it a
  name-only member of `INVESTIGATION_EVENT_TYPES`, as it already is.
- **Frontend**: `WireInvestigationEvent` gains the matching member,
  `readInvestigationEvent`'s decoder gains the case,
  `ChecklistStepView` gains `claim: string | undefined` and `confidence:
Confidence | undefined`, `applyInvestigationEvent`'s `FINDING_CREATED`
  case sets them. The existing `TOOL_CALL_COMPLETED` no-op comment ("this
  event's outcome is Story 7.3's own future reader") is now wrong —
  correct it.
- **New invariant**: every event type the backend's serialiser gives a
  `case` to has a matching `case` in the frontend's decoder (anchored on
  the serialiser's own switch, not on `INVESTIGATION_EVENT_TYPES`, which
  legitimately holds payload-free names) — with its own `pnpm break`
  planting an eighth-event-type defect.
- **Plainest possible rendering**: `InvestigationChecklist.tsx` renders
  `step.claim` as a second `<p>` with no new styling, no confidence mark,
  no layout changes beyond "it fits on a new line underneath the
  description." This is deliberately throwaway visually — Task 7.3.2
  replaces it with the real two-line grid and the `ConfidenceMark`.

## Done when

1. `packages/shared/src/finding.ts` exists with both tests the
   `AnomalyScore` precedent itself has: `@ts-expect-error` proofs that an
   evidence-less evidenced-finding and an unbranded finding do not
   typecheck, and a named test proving what the brand does **not**
   prove (that a claim matches its evidence) — don't let the type
   guarantee be over-trusted.
2. Every tool's `toFinding` is unit-tested across every `ToolOutcome` arm
   it can reach, with an assertion that the claims/confidences produced
   are pairwise distinct (AC 10) — this is the test that would catch a
   claim templated from the tool's name rather than its outcome.
3. A refusal's or inapplicability's `Evidence`/sentence is asserted to
   carry no fabricated `observedAt`, no invented figure, and (for
   `UnevidencedFinding`) no `evidence` member at all (AC 9).
4. Investigating `SPY` shows the correlation step's row with its
   inapplicability sentence and no confidence mark; investigating `XLK`
   shows the same for peer comparison. Investigating `NVDA` shows six
   rows each with a plain claim line (or the volume tool's permanent
   refusal, confidence `UNKNOWN`).
5. `pnpm break two-mint-sites-for-a-finding` and the new event-type/
   decoder-parity break both go red for the right clause and restore
   byte-identical.
6. `pnpm verify` is green.
