# Task 7.2.1 — Orchestrator hardening & the keepalive

**Status:** Complete — 2026-11-18. The one key finding: **a terminal event
for a thrown run did not exist to emit**, so the net needed
`INVESTIGATION_FAILED` added to `TERMINAL_EVENT_TYPES` — a shared-type
change the task file did not anticipate, because `isTerminalEventType` had
exactly one member and both the stream's reader and the route's write loop
wait on it; without it the status would have read `failed` while the SSE
response hung open for ever, which is half the stuck state the task was
written to close.
**Story:** [7.2 The Five-Step Pipeline](STORY.md)
**Depends on:** nothing (lands on top of Story 7.1's shipped pipeline)

## Objective

Two safety properties the five-tool pipeline needs that the one-tool
pipeline never exercised: a thrown tool must not leave an investigation
stuck `running` forever (which, via `POST /investigations`' second-press
idempotency, permanently disables `Investigate` for that symbol until a
backend restart), and the SSE stream must survive being held open across
more than one step without risking Azure Container Apps' 4-minute idle
ingress timeout. Both are cheap now and expensive to retrofit once four
more tools exist with real throw paths (a database read, a calendar
edge) that Story 7.1's single in-memory lookup never had.

ADR 0050's own reversal trigger for the keepalive ("the first tool call
to complete while a second one is still queued") fires literally at this
story — `scripted-agent-provider.ts` mints all five `QueuedStep`s before
the loop starts, so the condition is met on the very first press,
regardless of how fast the tools actually run.

## What the user can see when this lands

Nothing new on screen — this is enabling work. What changes is what
_cannot_ happen: a thrown tool during this story's own development (or
later, in production) can no longer leave `Investigate` permanently dead
for a symbol, and a long-held investigation stream can no longer be
silently closed by the platform's ingress.

## Work

- Add a `finally` (or equivalent) around `runInvestigation`'s per-tool
  loop in `scripted-agent-provider.ts` so any thrown error always results
  in a terminal event and a non-`running` investigation status, rather
  than the loop aborting silently. The reader-facing _sentence_ for a
  failure is explicitly Story 7.5's — this only guarantees the
  investigation reaches a terminal state so it can be evicted and
  retried.
- Add an SSE keepalive to `GET /investigations/:id/events`
  (`routes/investigations.ts`): a comment line (`: keepalive\n\n`)
  written on an interval, cleared in the same `finally` that already ends
  the stream. The interval must be **injectable** (an option on
  `createInvestigationRoutes`, alongside the existing `corsOrigin`) so a
  test can use a short period instead of waiting 30s+; pick a real
  interval with headroom under the 240s ceiling (the market socket's own
  precedent, `KEEPALIVE_INTERVAL_MS = DISCONNECTED_AFTER_MS / 3`, is the
  kind of derived-rather-than-guessed number to match).
- Confirm `investigation-stream.ts`'s hand-rolled SSE parser skips
  comment lines (lines starting `:`) before relying on this. If it
  doesn't, fix the parser first — a frontend defect this story owns.
- Dated corrections: `HOSTING.md`'s "(Story 7.5 or later)" guess,
  `INVESTIGATIONS.md` §9's matching line, and ADR 0050's own
  Consequences/trigger section all need a dated amendment naming Story
  7.2 as the run that fires the trigger, regardless of which way any
  later decision goes.
- Add the `pnpm invariants` entry holding tool-input purity (no tool's
  `run` signature carries a prior step's outcome or an `AbortSignal`-style
  channel to another step) — the stronger, structural form of AC4's
  independence claim, with a `pnpm break` entry planting the parameter a
  future author would write.

## Done when

1. A tool that throws during `runInvestigation` always results in a
   terminal SSE event and a non-`running` investigation status; a second
   `Investigate` press on the same symbol after a throw starts a fresh
   investigation rather than returning the stuck one.
2. The SSE route emits a keepalive comment on an injectable interval,
   verified by a test using a short interval rather than a real wait.
3. `investigation-stream.ts` is confirmed (or fixed) to ignore SSE
   comment lines without disrupting event parsing.
4. `HOSTING.md`, `INVESTIGATIONS.md` §9 and ADR 0050 each carry a dated
   correction/amendment naming Story 7.2.
5. A new `pnpm invariants` entry holds tool-input purity, with a passing
   `pnpm break`.
6. `pnpm verify` is green.
