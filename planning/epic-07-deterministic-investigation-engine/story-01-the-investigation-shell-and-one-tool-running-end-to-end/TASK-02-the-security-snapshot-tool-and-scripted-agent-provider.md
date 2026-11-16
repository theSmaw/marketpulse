# Task 7.1.2 — The security snapshot tool & scripted `AgentProvider`

**Status:** Not started
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
