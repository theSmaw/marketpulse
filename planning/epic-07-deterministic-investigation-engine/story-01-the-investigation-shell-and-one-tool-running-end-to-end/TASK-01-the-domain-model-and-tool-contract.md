# Task 7.1.1 — The domain model & tool contract

**Status:** In progress — 2026-11-16
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
