# Task 7.1.2 — The security snapshot tool & scripted `AgentProvider`

**Status:** Complete — 2026-11-16. The tool, the store and the scripted
provider all ship; `pnpm verify` green with 86 invariants holding and
every test suite passing (1403 of them in `apps/backend`, 15 new).
**Story:** [7.1 The Investigation Shell, & One Tool Running End to End](STORY.md)
**Depends on:** 7.1.1

## Objective

Build the one real tool and the orchestrator that calls it — the backend
half of this story, with no transport and no UI yet. This is where
invariant 1 (the model never calculates) and invariant 4 (no clock read
inside a tool) are actually enforced, not merely stated.

## What the user can see when this lands

Nothing — this is backend logic with no route in front of it yet
(Task 7.1.3 adds the route).

## Work

- **`apps/backend/src/analytical-tool.ts`**: the concrete
  `AnalyticalTool<Input, Output>` interface (`name`, `description`, `run`)
  and `ToolContext` (`investigationId`, `asOf: Date`, `mode`) — `asOf` is
  a required argument to every tool, never read from a clock inside one.
  This interface stays backend-only, mirroring `market-data-provider.ts`'s
  own recorded decision to keep a provider's shape out of the browser's
  type graph.
- **`apps/backend/src/tool-security-snapshot.ts`**: wraps
  `current-market-state.ts`'s `read(symbol)` only (never `snapshotOf`).
  Returns `{ symbol, observedAt: bar.startsAt, price: bar.close, open,
high, low, volume, source, ageMs }` — no `change`. `read(symbol)`
  returning `undefined` for a tracked-but-unobserved symbol maps to
  `{ kind: "refused", reason: "nothing-observed" }`; a symbol absent from
  the curated universe entirely maps to `{ kind: "refused", reason:
"not-tracked" }` — these are genuinely different checks (a map lookup
  vs. a universe-membership check) and must not share one code path that
  happens to produce two labels.
- **`apps/backend/src/investigation-store.ts`**: the in-memory
  `Map<InvestigationId, Investigation>`, bounded at **200 entries**,
  evicting the oldest **completed** investigation first when a 201st is
  created — never evicting a `running` one. Also holds each
  investigation's own append-only event log (for replay — Task 7.1.3
  reads it).
- **`apps/backend/src/scripted-agent-provider.ts`**: the deterministic
  `AgentProvider` implementation. `runInvestigation(context, tools)`
  creates the investigation, runs the given tools in order (one, for
  this story), appends events to the store's log as it goes, and resolves
  once the investigation reaches a terminal status. `streamEvents(id,
fromSeq)` returns an `AsyncIterable<InvestigationEvent>` reading the
  store's log from `fromSeq` forward, live-following until a terminal
  event. `cancel(id)` is implemented as a documented no-op — it exists
  and is callable, but does not change the investigation's status; a unit
  test proves it does not.
- **Mint-site discipline for invariant 1**: the tool's result type
  (`SecuritySnapshot`) is constructible only inside
  `tool-security-snapshot.ts` — no other file builds one from a literal.
  A unit test attempts to construct the all-numeric-fields shape from
  outside that module's own function and confirms there is no path to do
  so without going through `read(symbol)`'s own answer.

## Done when

1. The tool reports exactly the fields `current-market-state.ts`'s
   `read(symbol)` carries, with no `change`, verified by an identity
   (`===`) comparison in a unit test, not approximate equality.
2. `nothing-observed` and `not-tracked` are two distinct, independently
   testable code paths with two distinct unit tests, one per refusal
   reason.
3. The investigation store never holds more than 200 entries and never
   evicts a `running` investigation, proven by a unit test that creates
   201 and inspects which one entry is gone.
4. `cancel()` is callable, returns without error, and a unit test
   confirms the target investigation's status is unchanged by the call.
5. The scripted provider calls the tool exactly once per investigation
   in this story's configuration, proven by a spy-tool invocation count
   — not by inspecting the final result, which cannot distinguish one
   call from two identical ones.
6. A grep-level check (recorded in this task, mechanised at this story's
   own close per Task 7.1.1's totality pattern) confirms no file in this
   task's own module set calls `Date.now()` or a zero-argument
   `new Date()` — `asOf` is always threaded as an argument.
7. `pnpm test` passes for `apps/backend` with every new file included.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — 2026-11-16

Four new `apps/backend/src` files:

- **`analytical-tool.ts`**: `AnalyticalTool<Input, Output>` (`name`,
  `description`, `run`), `ToolContext` (`investigationId`, `asOf`,
  `mode`) — backend-only, mirroring `market-data-provider.ts`'s own
  decision to keep a provider's shape out of the browser's type graph.
  Also `RunnableTool` and `toRunnableTool()`, added beyond the task's own
  Work list: a provider holding several tools at once needs their
  `Input`/`Output` erased to put them in one array, and the alternative —
  `any` on the array element type — is a pattern with zero other
  instances anywhere in this repository. `toRunnableTool` closes over a
  tool's own `Input`/`Output` and its two conversions (how to build its
  input from an investigation's subject symbols, how to turn its output
  into the JSON shape a `TOOL_CALL_COMPLETED` event carries) once, at the
  point each tool is wired up, so nothing downstream needs either type
  again.
- **`tool-security-snapshot.ts`**: `get_security_snapshot`, wrapping
  `current-market-state.ts`'s `read(symbol)` only. `not-tracked` (a
  universe-membership check) and `nothing-observed` (`read` answering
  `undefined`) are two separately tested code paths, decided in that
  order so the universe check never even reaches `current-market-state.ts`.
  `SecuritySnapshot`'s mint-site discipline is `composite-score.ts`'s own
  pattern — a module-private `Symbol` brand, never exported — so a
  literal matching every public field is still a type error outside this
  file (`tool-security-snapshot.test.ts` proves it with a
  `@ts-expect-error`). `toWireSecuritySnapshot` names every field by
  hand rather than running through `wire-serialiser.ts`'s `WireFields`/
  `toWire`: that idiom's mapped type would have to include the brand's
  own symbol key too, a worse reader for no protection `Object.keys`
  was not already giving a hand-written version.
- **`investigation-store.ts`**: the bounded in-memory map plus each
  investigation's append-only event log, both behind one `InvestigationStore`.
  Eviction scans in `Map` insertion order (the oldest entry first) and
  evicts the first `completed` one it finds; if none exists — every held
  investigation is `running` — it holds past the 200 cap rather than
  break the "never evict a running one" rule, which is a real,
  documented state rather than an oversight. `onEvent`/`appendEvent`
  (via a per-investigation `node:events` `EventEmitter`) is what lets
  `scripted-agent-provider.ts`'s `streamEvents` live-follow without a
  poll — not named in the task's own Work list, but required for
  `streamEvents` to do anything beyond replay a finished run.
- **`scripted-agent-provider.ts`**: `createScriptedAgentProvider({store,
now})` — `now` is a REQUIRED dependency rather than a default reading
  `Date.now()` internally, which is the one way this file measures a
  step's own `durationMs` without itself violating Done-when 6.
  `runInvestigation` mints each `StepId` via `node:crypto`'s
  `randomUUID()`, runs the given `RunnableTool[]` in order, and emits the
  same six events `investigation.ts` already types
  (`INVESTIGATION_STARTED` → `STEP_STARTED` → `TOOL_CALL_STARTED` →
  `TOOL_CALL_COMPLETED` → `STEP_COMPLETED` → `INVESTIGATION_COMPLETED`).
  `streamEvents` replays `store.eventsFrom(id, fromSeq)` and then
  live-follows via `store.onEvent` until a terminal event.
  `cancel()` takes no parameter at all (satisfying the `AgentProvider`
  type, which TypeScript permits for a function with fewer parameters)
  rather than naming and ignoring one.

### Gates

`pnpm --filter @marketpulse/backend typecheck` clean (`tsc -b`, cleaned
and rebuilt from scratch first to rule out a stale cache).
`pnpm --filter @marketpulse/backend lint` clean (`--max-warnings 0`).
`pnpm --filter @marketpulse/backend test` — **1403 passed**, 74 files
(15 of them new, across the four new test files). Full `pnpm verify` —
green: 86 invariants hold (two pre-existing, owned waivers printed and
unrelated to this task), 664 documents / 0 broken links, 48
components / 48 stories, `packages/shared` 730 tests, `apps/backend`
1,403, `apps/frontend` 1,956, `scripts/*.test.mjs` 21, `test:process` 60.

A manual grep (Done-when 6) confirms neither `Date.now()` nor a
zero-argument `new Date()` appears in any of the four implementation
files — the one match `grep` finds is inside a comment explaining why.
This task's own "mechanised at this story's own close" note is
unaddressed here on purpose; Task 7.1.1 already established the
mechanism (`a-tool-reads-no-clock`-shaped) is a Phase 3 concern, not a
per-task one.

## For a stakeholder — a status report, 2026-11-16

Still nothing visible — this is backend logic with no route in front of
it (Task 7.1.3 adds the route next). What exists now, for the first
time, is a real tool that answers from the same live data the
`/securities` table shows, an orchestrator that can run a list of such
tools and narrate the run as a stream of typed events, and a bounded
place to hold the result. The scripted provider is deliberately not an
AI yet — `CLAUDE.md`'s own ordering rule ("do not start with the AI")
means this story proves the engine works end to end with a fixed,
predictable script before anything is asked to decide what to run.
Both refusal paths ("this security isn't tracked" vs. "we're tracked
but haven't heard from it") and the no-op `cancel()` are proven by
their own tests rather than left to be discovered later.
