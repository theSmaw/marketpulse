# Story 7.1 — The Investigation Shell, & One Tool Running End to End

**Status:** Not started
**Epic:** [Epic 7 — Deterministic Investigation Engine](../EPIC.md)
**Depends on:** nothing (first story)
**Epic scope covered:** Investigation domain model; investigation lifecycle;
analytical tool interfaces; the security snapshot tool; investigation
orchestration (the `AgentProvider` stub); the core subset of streaming
investigation events.

## Description

Nothing in this epic can be proven by building five tools at once. This
story proves the whole pipe — domain model, lifecycle, orchestration,
streaming, and a real UI — against the **single cheapest tool available**:
a security snapshot, which wraps an object this product already has rather
than computing anything new.

**The tool itself is almost free, by design.** `apps/backend/src/
current-market-state.ts`'s `snapshotOf`/by-symbol read already returns a
bar, its `source`, and an `ageMs` computed at read time — Epic 7's own
`EPIC.md` hand-off from Story 3.5's close names this object as exactly what
an analytical tool should read directly, no socket, no subscription. The
security snapshot tool is a thin, typed wrapper around that read, returning
the security's latest price, change, volume and the two provenance facts
(`source`, `ageMs`) every later tool will also have to carry. Choosing the
tool with the least arithmetic is deliberate: this story is about whether
an investigation can start, run one step, and finish — not about whether
the arithmetic is right, which the next six tools will each prove on their
own.

**The lifecycle is defined completely even though only part of it is
reachable here.** `Investigation.status` is `running` / `awaiting user` /
`completed` / `failed` / `cancelled`, per `PRODUCT_SPEC.md` §13, and all
five are real types from this story on — but this story only ever produces
`running` → `completed`. `failed` and `cancelled` are Story 7.5's to make
reachable; `awaiting user` has no producer anywhere in this epic and may
never gain one here, since nothing in a deterministic pipeline asks a
reader a mid-run question — that is Epic 10/11's territory, and this story
states that honestly rather than building toward a state nothing triggers.

**The orchestrator is a scripted, deterministic implementation of
`PRODUCT_SPEC.md` §32's `AgentProvider` interface**
(`runInvestigation(context, tools)`, `streamEvents()`, `cancel()`), with no
model behind it — a fixed script that calls exactly the tools it is told
to, in order. `cancel()` exists on the interface from this story but is a
stub until Story 7.5 makes it do something; the point of shipping the full
interface now is that Epic 10 later swaps in a real, model-backed
implementation against the identical contract, never touching this
story's own callers.

**Streaming rides `PRODUCT_SPEC.md` §33's own event protocol, a subset of
it.** Of the ten named events, this story emits the six that a single
successful tool call needs: `INVESTIGATION_STARTED`, `STEP_STARTED`,
`TOOL_CALL_STARTED`, `TOOL_CALL_COMPLETED`, `STEP_COMPLETED`,
`INVESTIGATION_COMPLETED`. `FINDING_CREATED` and `EVIDENCE_ADDED` wait for
Story 7.3's real domain types; `WORKSPACE_COMMAND` waits for a tool that
produces one (Story 7.4); `INVESTIGATION_FAILED` waits for Story 7.5. This
rides Server-Sent Events, the transport this product's own intended stack
already reserves for agent investigation events, kept structurally separate
from the market-data WebSocket.

**The UI lives where this epic already settled it belongs**: beside
`Abnormal-move indicators` on the security page, not on a row of `/`'s
`Unusual activity` list and not on the dedicated `/investigations` route,
which stays Epic 8's placeholder. An `Investigate` control starts an
investigation for the security on screen; a live checklist — `PRODUCT_SPEC.md`
§14's own example shape, `✓ Measure move 120 ms` — shows the one step
as it runs and completes.

## What the user can see when this story lands

A real `Investigate` control on the security page. Pressing it starts a
real investigation, and a one-line checklist appears showing a single step
move from queued to running to complete, with its real duration — against
the real security snapshot tool, not a fixture.

## Acceptance criteria

1. `Investigation` and `Step` exist as typed domain objects matching
   `PRODUCT_SPEC.md` §13/§14's own fields, including every lifecycle status
   named even though only two are reachable from this story.
2. A shared analytical-tool contract exists (typed input, typed output,
   every tool implements it) — not a convention, a type every later tool's
   story is checked against.
3. The security snapshot tool wraps `current-market-state.ts`'s own
   by-symbol read; it never computes a figure that read does not already
   carry, and it reports the same `source`/`ageMs` provenance that read
   exposes.
4. A deterministic `AgentProvider` implementation exists
   (`runInvestigation`/`streamEvents`/`cancel`), calling exactly the tools
   it is scripted to call, in order, with no model and no network call to
   one.
5. The six named events stream over SSE, in the correct order, for a
   successful single-step investigation; the frontend renders the
   checklist from these events and parses no unstructured text.
6. `Investigate` appears on the security page beside `Abnormal-move
indicators`, not on `/`, and opens no new route.
7. The checklist shows the step's own tool name, its status, and its real
   duration once complete — matching `PRODUCT_SPEC.md` §14's own example
   shape.
8. `PRODUCT_SPEC.md` §28's investigation target — visible indication an
   investigation has begun in **under 500 ms** — is measured against this
   one-step pipeline and reported, not assumed.
9. An investigation this story starts and does not touch again lives in
   backend memory only; nothing is written to a database, and a backend
   restart loses it — stated as a decision with Epic 12 named as the
   owner of persistence, not silently assumed.
10. Invariant 1 (the model never calculates) is structurally true of this
    tool by construction — confirm there is no path by which a figure
    this tool returns could instead be invented, and record how that is
    enforced (a type, a test, or both).

## Open decisions — for the Product Owner

- **Where exactly does the checklist sit relative to the factor ledger
  `Abnormal-move indicators` already draws?** Above it, below it, or in a
  disclosed panel the `Investigate` control opens — this is a layout
  question for this story's own design work, not decided here.
- **Does pressing `Investigate` a second time while one is already running
  for the same security start a second investigation, or do nothing?** No
  section of `PRODUCT_SPEC.md` answers this for the deterministic case; a
  recommendation will be brought to this story's own Gate 1.

## Out of scope

Every tool but the security snapshot (Story 7.2). Findings and evidence as
real domain objects (Story 7.3 — this story's single step completes with
no rendered finding, only its own status and duration). Cancellation and
failure (Story 7.5). The landing-page region (Story 7.6). Any `WorkspaceCommand`
production, by any tool (Epic 10/11). The `/investigations` route (Epic 8).
