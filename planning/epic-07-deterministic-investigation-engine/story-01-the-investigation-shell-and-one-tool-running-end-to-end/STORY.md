# Story 7.1 — The Investigation Shell, & One Tool Running End to End

**Status:** All four tasks complete, Phase 3 sweep done 2026-11-17 —
awaiting Gate 2. `INVESTIGATIONS.md` written; ADR 0050; `pnpm invariants`
at 89 (three new); `PRODUCT_SPEC.md` §28 and §32, and `HOSTING.md`'s SSE
line, each carry a dated amendment.

**Settled at Gate 1, from six parallel shaping passes (business-analyst,
technical-analyst, ux-architect, technical-architect, tester, designer) —
each finding below corrected something this story's own first draft got
wrong, verified against the real code rather than assumed:**

- **The tool reports no `change`.** The original draft's own Description
  and its AC 3 contradicted each other — `current-market-state.ts`'s read
  carries no change figure, and computing one needs a second data source
  (the stored prior close) and an ADR 0045 cross-tape ruling this story
  does not need to take. The tool reports price, volume, OHLC and the two
  provenance facts (`source`, `ageMs`) only.
- **The tool wraps `read(symbol)`, never `snapshotOf`.** `snapshotOf`
  discards `source` and `ageMs` entirely — using it would silently fail
  AC 3's own provenance requirement.
- **A second `Investigate` press while one is already running for the
  same security does nothing — no second investigation, and the control
  is never disabled.** Unanimous across every shaping pass. A one-step run
  completes in milliseconds; a control that disables and re-enables inside
  that window is a flicker, not feedback. The press is swallowed in the
  orchestration layer, not announced as unavailable.
- **The checklist's headline is the step's own human `description`**
  (`PRODUCT_SPEC.md` §14's own `Measure move`), **not the raw tool
  identifier** (`get_security_snapshot`) — the tool name travels on the
  step but is not what a reader is shown.
- **`Investigation` and `Step` are separate status vocabularies, never
  one shared union.** `queued` exists only on a Step; `awaiting user` only
  on an Investigation. A shared type would let a Step be `awaiting user`
  and an Investigation be `queued`, neither of which this product means.
- **The checklist appears only after a press, at the top of the region,
  never permanently reserved.** Chosen over always-visible-and-reserved:
  a reader who has never pressed `Investigate` sees nothing, avoiding the
  "a reserved region nobody has built" pattern this product has already
  found and routed as a defect once (Story 4.7). The control sits in the
  region's own header; the checklist mounts beneath it on press, pushing
  the score band and ledger down — reader-initiated growth, which this
  product already accepts elsewhere (`TimeWindowControl`, the topology's
  own sector/band filters).
- **The checklist paints synchronously on press, before any server
  confirmation** — a `queued` row appears immediately (client-optimistic),
  named once `STEP_STARTED` arrives. This is what makes `PRODUCT_SPEC.md`
  §28's <500 ms target a claim about the UI's own responsiveness rather
  than a network round trip, and it must be measured as both: press→first
  paint, and press→`INVESTIGATION_STARTED` rendered, reported separately.
- **The in-memory investigation map is bounded at 200 entries**, evicting
  the oldest **completed** investigation first (never an entry that is
  still running) — every other in-memory structure in this product states
  a bound, and this one should not ship without one.
- **A stream that ends with no terminal event renders a named, honest
  sentence** (`Connection lost — investigation state unknown`) rather than
  freezing on `running` forever. This is a frontend-only fact about the
  view, not a new backend lifecycle status — the investigation's own
  domain status is unchanged; only the browser's knowledge of it is
  stale. Full reconciliation (resuming, polling, resubscribing) stays
  Story 7.5's to build; this story only refuses to lie in the meantime.
- **The SSE stream terminates the HTTP response after its terminal
  event.** No keepalive is needed in this story — a one-step investigation
  completes in milliseconds — and `app.inject()` can assert the whole
  event sequence in one call rather than needing a browser. The keepalive
  this product's own `HOSTING.md` already names (every 4 minutes, the
  ingress idle timeout) becomes live the first time a stream is held open
  across steps, which is Story 7.5's or later.
- **The frontend consumes the stream via `fetch` + `ReadableStream`, never
  `EventSource`.** `EventSource` reconnects automatically on any drop,
  which would silently start a second investigation on a flaky connection
  — exactly the state the second-press rule above was written to prevent.
  `fetch`-streamed also carries the per-request correlation id and reuses
  this product's own existing reconnect-policy reasoning rather than
  inheriting a second, undocumented one.
- **`AgentProvider` is addressed by investigation id**
  (`streamEvents(id, fromSeq)` / `cancel(id)`), one long-lived provider
  rather than one instance per run — confirmed necessary rather than
  assumed, because Story 7.6's own `Current investigations` region is
  already scoped as a list, meaning more than one investigation exists in
  memory at once. `PRODUCT_SPEC.md` §32's own pseudocode (parameterless
  `streamEvents()`/`cancel()`) presumes one-per-instance and owes a dated
  amendment recording the divergence and why.
- **Every event carries a monotonic `seq` and the stream replays from
  `fromSeq`** — without this, the events emitted between a client's start
  request and its attach to the stream are lost and the checklist draws
  nothing, which is not a corner case but the common one.
- **The glyph set is `queued` = `Marker shape="dashed"` (its own
  documented existing meaning, "not yet"), `running` = a static ring (with
  a breathing row-ground only past the existing 160 ms/ADR 0028 cover
  threshold — never a looping glyph itself), `complete` = a new `Icon
name="check"`.** No glyph is a solid disc of any kind — that shape is
  already spent by the security-identity arrival mark two hundred pixels
  up the same page, and reusing it here would be a fourth meaning for one
  mark, which this product has already refused once.
- **`Popover` stays unused in this story.** Its own stated reversal
  trigger ("the first surface that needs an explanation a reader asks
  for, on a row too narrow to carry it") does not fire on a three-token
  row; Story 7.3's findings/evidence are the real candidate.
- **`Button`'s own loading-state reversal trigger technically fires here
  and is explicitly declined, in writing, rather than left unevaluated.**
  The checklist is the real answer to "is something happening?" — a
  second, smaller answer inside the button itself is exactly what that
  component's own docblock warns against.
- **A new, persistent, visually-hidden `role="status"` scoped to the
  checklist container (never the whole region) speaks once on completion
  — twice only if the run crosses the existing 160 ms cover threshold**
  (started, then complete). This is a new live region in a product that
  has argued carefully about where it spends them; it is reader-prompted
  (the press causes it) and terminal (it cannot recur under an unchanged
  subject), which is exactly the shape this product's existing live
  regions require.
- **The security's subject is pinned at the investigation's creation.**
  If the ticker on screen changes mid-run, the checklist does not follow
  — it is drawn only where the current page's own symbol matches the
  investigation's subject, and becomes visible again only via Story 7.6's
  cross-security list.
- **`Investigate` is offered for an `untracked` security** (e.g. `PSKY`,
  `WBD`) **as well as a merely-unobserved one, and the tool's refusal
  vocabulary distinguishes the two** (`not-tracked` vs `nothing-observed`)
  — refusing the control for an untracked security would hide a real,
  correct product answer behind a silence.
- **One new ADR (0050)** records the `AgentProvider` shape and its
  divergence from §32's literal pseudocode, the SSE transport decisions,
  and the domain-type split (wire-shape types in `packages/shared`; the
  provider/tool contracts backend-only) — one coherent seam, the same way
  ADR 0048 covered three decisions at Story 6.1's own close rather than
  the epic's.

## Epic

[Epic 7 — Deterministic Investigation Engine](../EPIC.md)
**Depends on:** nothing (first story)
**Epic scope covered:** Investigation domain model; investigation lifecycle;
analytical tool interfaces; the security snapshot tool; investigation
orchestration (the scripted `AgentProvider`); the core subset of streaming
investigation events.

## Description

Nothing in this epic can be proven by building five tools at once. This
story proves the whole pipe — domain model, lifecycle, orchestration,
streaming, and a real UI — against the **single cheapest tool available**:
a security snapshot, which wraps an object this product already has rather
than computing anything new.

**The tool itself is almost free, by design.** `apps/backend/src/
current-market-state.ts`'s `read(symbol)` already returns a bar, its
`source`, and an `ageMs` computed at read time — Epic 7's own `EPIC.md`
hand-off from Story 3.5's close names this object as exactly what an
analytical tool should read directly, no socket, no subscription. The
security snapshot tool is a thin, typed wrapper around that one function,
returning the security's latest price, volume, OHLC and the two provenance
facts (`source`, `ageMs`) every later tool will also have to carry — no
`change`, settled at Gate 1 above. Choosing the tool with the least
arithmetic is deliberate: this story is about whether an investigation can
start, run one step, and finish — not about whether the arithmetic is
right, which the next six tools will each prove on their own.

**The lifecycle is defined completely even though only part of it is
reachable here.** `Investigation.status` is `running` / `awaiting user` /
`completed` / `failed` / `cancelled`, per `PRODUCT_SPEC.md` §13; `Step`'s
own, separate vocabulary is `queued` / `running` / `completed` / `failed` /
`cancelled`, per §14. Both are real types from this story on — but this
story only ever produces Investigation `running` → `completed` and Step
`queued` → `running` → `completed`. `failed` and `cancelled` are Story
7.5's to make reachable; `awaiting user` has no producer anywhere in this
epic and may never gain one here, since nothing in a deterministic
pipeline asks a reader a mid-run question — that is Epic 10/11's territory,
and this story states that honestly rather than building toward a state
nothing triggers.

**The orchestrator is a scripted, deterministic implementation of
`PRODUCT_SPEC.md` §32's `AgentProvider` interface**
(`runInvestigation(context, tools)`, `streamEvents(id, fromSeq)`,
`cancel(id)`), with no model behind it — a fixed script that calls exactly
the tools it is told to, in order. `cancel()` exists on the interface from
this story but is a stub until Story 7.5 makes it do something; the point
of shipping the full interface now is that Epic 10 later swaps in a real,
model-backed implementation against the identical contract, never touching
this story's own callers.

**Streaming rides `PRODUCT_SPEC.md` §33's own event protocol, a subset of
it.** Of the ten named events, this story emits the six that a single
successful tool call needs: `INVESTIGATION_STARTED`, `STEP_STARTED`,
`TOOL_CALL_STARTED`, `TOOL_CALL_COMPLETED`, `STEP_COMPLETED`,
`INVESTIGATION_COMPLETED`, each carrying a monotonic `seq`. `FINDING_CREATED`
and `EVIDENCE_ADDED` wait for Story 7.3's real domain types;
`WORKSPACE_COMMAND` waits for a tool that produces one (Story 7.4);
`INVESTIGATION_FAILED` waits for Story 7.5. This rides Server-Sent Events
over `fetch` + `ReadableStream`, the transport this product's own intended
stack already reserves for agent investigation events, kept structurally
separate from the market-data WebSocket.

**The UI lives where this epic already settled it belongs**: beside
`Abnormal-move indicators` on the security page, not on a row of `/`'s
`Unusual activity` list and not on the dedicated `/investigations` route,
which stays Epic 8's placeholder. An `Investigate` control in that region's
own header starts an investigation for the security on screen; a checklist
mounts beneath it on press — `PRODUCT_SPEC.md` §14's own example shape,
`✓ Measure move 120 ms` — showing the one step as it runs and completes.

## What the user can see when this story lands

A real `Investigate` control on the security page. Pressing it immediately
shows a one-line checklist (client-optimistic, before any server reply),
which then moves from queued to running to complete with its real
duration — against the real security snapshot tool, not a fixture.

## Acceptance criteria

1. `Investigation` and `Step` exist as typed domain objects, as **two
   separate status vocabularies** matching `PRODUCT_SPEC.md` §13/§14's own
   fields exactly — every status named on each, even though only
   `running`/`completed` (Investigation) and `queued`/`running`/`completed`
   (Step) are reachable from this story.
2. A shared analytical-tool contract exists (typed input, typed output
   as a closed outcome union with an `ok`/`refused` discriminant — never a
   thrown error for an honest absence), every tool implements it — not a
   convention, a type every later tool's story is checked against.
3. The security snapshot tool wraps `current-market-state.ts`'s own
   `read(symbol)`; it never computes a figure that function does not
   already carry (no `change`), and it reports the same `source`/`ageMs`
   provenance that function exposes. It distinguishes `nothing-observed`
   from `not-tracked` as two named refusal reasons.
4. A deterministic `AgentProvider` implementation exists
   (`runInvestigation`/`streamEvents(id, fromSeq)`/`cancel(id)`), calling
   exactly the tools it is scripted to call, in order, with no model and
   no network call to one; `cancel()` is a documented no-op that does not
   move an investigation's status.
5. The six named events stream over SSE, each carrying a monotonic `seq`,
   in the correct order, for a successful single-step investigation; a
   client attaching after the start replays from `seq 0`. The frontend
   renders the checklist from these typed, decoded events and parses no
   unstructured text; an unknown event type or a truncated payload is
   ignored rather than throwing.
6. `Investigate` appears in `Abnormal-move indicators`'s own header, not
   on `/`, and opens no new route; the checklist mounts beneath it only
   after a press.
7. The checklist shows each step's own human `description` (never the
   raw tool identifier), its status glyph, and its real measured duration
   once complete — matching `PRODUCT_SPEC.md` §14's own example shape,
   with the duration column's width reserved from first paint.
8. `PRODUCT_SPEC.md` §28's investigation target — visible indication an
   investigation has begun in **under 500 ms** — is measured two ways
   (press→first paint of the queued row; press→`INVESTIGATION_STARTED`
   rendered) and both are reported as a distribution with a real sample
   size, using a paint-anchored browser instrument rather than this
   repository's frame-cost method, which answers a different question.
9. An investigation this story starts lives in backend memory only, in a
   map bounded at **200 entries** evicting the oldest completed
   investigation first (never one still running); nothing is written to
   a database, and a backend restart loses every investigation — stated
   as a decision with Epic 12 named as the owner of real persistence.
10. A stream that ends without a terminal event renders
    `Connection lost — investigation state unknown` rather than freezing
    on `running`; this is asserted at the process level (a spawned-child
    restart) and at the browser level.
11. Invariant 1 (the model never calculates) is structurally enforced for
    this tool: its result type is constructible only from a
    `CurrentObservation`, with no literal-number path, and the event
    payload reaching the wire is serialised from the tool's own return
    value and nothing the orchestrator composes — a type and a test, not
    a sentence.

## Design work

The canvas needs one new page for this story's checklist (queued/running/
complete states, the `Investigate` control inside `Abnormal-move
indicators`'s own header, the reserved duration column, the breathing-
ground treatment past 160 ms) — drawn during this story's own task loop,
once a `pnpm probe` reading of the real region's current height is in
hand, per the design shaping pass's own stated need.

## Out of scope

Every tool but the security snapshot (Story 7.2). Findings and evidence as
real domain objects (Story 7.3 — this story's single step completes with
no rendered finding, only its own status and duration). Real cancellation
and failure behaviour (Story 7.5 — `cancel()` is a stub and no tool in this
story can fail). The landing-page region (Story 7.6). Any
`WorkspaceCommand` production, by any tool (Epic 10/11). The
`/investigations` route (Epic 8). A `change` figure on the snapshot (not
this story's, and not clearly any story's until an ADR 0045 ruling is
taken).
