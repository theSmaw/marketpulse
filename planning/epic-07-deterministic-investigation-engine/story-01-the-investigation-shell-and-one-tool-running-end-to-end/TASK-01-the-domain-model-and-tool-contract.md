# Task 7.1.1 — The domain model & tool contract

**Status:** Complete — 2026-11-16. `packages/shared/src/investigation.ts`
ships `Investigation`/`Step` as two separate status vocabularies, a
two-member `ToolOutcome<T>`, all ten event names (six fully typed), and a
totality-checked label stub for both vocabularies.
**Story:** [7.1 The Investigation Shell, & One Tool Running End to End](STORY.md)
**Depends on:** nothing (first task)

## Objective

Everything else in this story is wiring around a handful of types. Get the
types right — as two separate status vocabularies, as a closed outcome
union for a tool's result, as event payloads carrying a monotonic `seq` —
before any backend logic or UI reads them, so the mistakes Gate 1's own
shaping passes found (a shared status union, a tool that could in
principle throw instead of refuse, an unordered event stream) are closed
by the type system rather than caught later by a test.

## What the user can see when this lands

Nothing — this is `packages/shared`'s own new module, consumed by nothing
yet.

## Work

- **`packages/shared/src/investigation.ts`**: `InvestigationStatus`
  (`running`/`awaiting_user`/`completed`/`failed`/`cancelled`) and
  `StepStatus` (`queued`/`running`/`completed`/`failed`/`cancelled`) as
  two separate `as const` tuples + derived types — never one shared
  union. `Investigation` carries `id`, `title`, `createdAt`, `mode`
  (`"live" | "replay"`), `status`, `subjectSymbols`, `currentTime`,
  `steps` — and deliberately **omits** `findings`/`evidence`/
  `workspaceState`/`messages` entirely rather than shipping empty arrays
  (ADR 0029's rule: a fully-formed record about nothing is a false
  impression). `Step` is a **discriminated union on `status`** (not a
  flat record with optional fields) so a `queued` step cannot spell a
  `completedAt` and a `completed` step cannot omit one —
  `exactOptionalPropertyTypes` enforcing this structurally rather than by
  convention.
- **The analytical-tool contract**, backend-facing shape defined here as
  a type only (the concrete interface lives in `apps/backend` — see Task
  7.1.2): `ToolOutcome<T> = { kind: "ok"; value: T } | { kind: "refused";
reason: ToolRefusal }`. `TOOL_REFUSALS` is a closed, shared vocabulary
  (`"nothing-observed" | "not-tracked"`, extended by later tool stories);
  `TOOL_NAMES` is a closed, shared vocabulary with exactly one member for
  this story (`"get_security_snapshot"`).
- **The six event payloads**, each a member of a discriminated union
  on `type`, each carrying `seq` (a positive integer) and
  `investigationId`. `INVESTIGATION_EVENT_TYPES` lists all ten names from
  `PRODUCT_SPEC.md` §33 as a closed vocabulary (so later stories add a
  union member rather than a second list); `TERMINAL_EVENT_TYPES` names
  the subset that ends a stream (`INVESTIGATION_COMPLETED` only, for
  now). No `emittedAt`/`sentAt` field — ADR 0033's own lesson that an
  unread server-clock reading is a cost with no consumer.
- **A `satisfies Record<InvestigationStatus, …>` and a
  `satisfies Record<StepStatus, …>` totality check** somewhere a later
  task's presenter can import, so adding or removing a status member is
  a compile error for whoever renders it, not a runtime gap.
- **Wire projection**: the exact fields of `Investigation`/`Step` a
  browser receives, run through `wire-serialiser.ts`'s own `WireFields`/
  `toWire` idiom rather than a bare `JSON.stringify`, so an undeclared
  field cannot leak the way an SSE frame otherwise would (SSE bypasses
  `fast-json-stringify`'s own stripping entirely — this is the one place
  that protection has to be rebuilt by hand).

## Done when

1. `InvestigationStatus` and `StepStatus` are two separate, closed
   vocabularies; no type in this module can construct a value that mixes
   members of one into the other's position.
2. `Step` is a discriminated union; a `queued` step's type has no
   `startedAt`/`completedAt`/`durationMs` fields, and a `completed`
   step's type cannot omit any of them.
3. `ToolOutcome<T>` has exactly two members and no third "thrown" path
   exists in the type.
4. All ten event-type names exist in `INVESTIGATION_EVENT_TYPES`; the six
   this story emits are fully typed with their real payload shape, the
   other four exist as names only (payload shape deferred to the story
   that ships them).
5. A totality-checked presenter stub (even a trivial one, replaced by
   Task 7.1.4's real one) proves the `satisfies Record<…>` pattern
   compiles and fails to compile on a removed member.
6. `pnpm test` and `pnpm typecheck` pass for `packages/shared` with this
   module included, and no `no-restricted-syntax` clock rule fires on it.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — 2026-11-16

`packages/shared/src/investigation.ts` (new module) carries:

- `InvestigationStatus` and `StepStatus` as two separate `as const`
  tuples — `INVESTIGATION_STATUSES` (`running`/`awaiting_user`/
  `completed`/`failed`/`cancelled`) and `STEP_STATUSES` (`queued`/
  `running`/`completed`/`failed`/`cancelled`), with a regression test
  asserting `queued` is absent from the first and `awaiting_user` from
  the second — the exact defect Gate 1's own shaping found in this
  story's first draft.
- `Step` as a five-member discriminated union on `status`
  (`QueuedStep`/`RunningStep`/`CompletedStep`/`FailedStep`/
  `CancelledStep`), each member declaring exactly the timing fields that
  status can carry — verified with `"startedAt" in step`-style assertions
  rather than `toBeUndefined()`, which cannot tell "absent" from "present
  as `undefined`" apart under `exactOptionalPropertyTypes`.
- `Investigation`, carrying §13's fields minus `findings`/`evidence`/
  `workspaceState`/`messages`, omitted entirely per ADR 0029 rather than
  shipped as empty arrays.
- `ToolOutcome<T>` (`ok`/`refused`), `TOOL_REFUSALS`
  (`nothing-observed`/`not-tracked`), `TOOL_NAMES`
  (`get_security_snapshot`).
- `INVESTIGATION_EVENT_TYPES`, all ten names from §33; `InvestigationEvent`
  fully typed for the six this story emits, each carrying a monotonic
  `seq`; `TERMINAL_EVENT_TYPES` and `isTerminalEventType`.
- `INVESTIGATION_STATUS_LABEL`/`STEP_STATUS_LABEL`, the totality-checked
  stub the task's own "Done when" §5 called for (`satisfies
Record<InvestigationStatus, string>` / `Record<StepStatus, string>`),
  for Task 7.1.4's real presenter to extend rather than build from
  nothing.
- `toWireStep`/`toWireInvestigation`, through `wire-serialiser.ts`'s own
  `WireFields`/`toWire` idiom — **one field map per `Step` member**
  (never one map over the union, whose `keyof` is the members'
  intersection and would wave every status-specific field through
  unexamined), switching on `status` exactly as the existing
  `WireMarketBreadth`/`WireOverviewFigure` precedent does.

### Gates

`pnpm --filter @marketpulse/shared build`/`typecheck` clean.
`pnpm --filter @marketpulse/shared test investigation` — **19 passed**.
`eslint --max-warnings 0` clean. `prettier --check` clean. Full
`pnpm verify` (load 6.27/6.09/4.93 before) — green: 86 invariants hold,
664 documents/0 broken links, `packages/shared` 730 tests, `apps/backend`
1,388, `apps/frontend` 1,956, all passed.

## For a stakeholder — a status report, 2026-11-16

This task built the shared vocabulary every later piece of Story 7.1
reads — nothing visible yet. The real value is in what it closes off:
Gate 1's own shaping passes found that this story's first draft would
have shared one status type between an investigation and its steps
(letting a step be "awaiting input" and an investigation be "queued",
neither of which this product means), and that a tool could in principle
throw instead of giving an honest "not enough evidence" answer. Both are
now closed by the type system — the test suite proves the specific
defects found at Gate 1 cannot recur, not just that the new code works.
