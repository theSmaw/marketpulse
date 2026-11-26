# Story 7.4 — The Graph Lights Up

**Status:** In progress — 2026-11-26, Task 7.4.1 complete (PR #711) and
Task 7.4.2 started. Four Gate-1 open questions resolved by the Product Owner;
see "Resolved at Gate 1" for the argument behind each change to the
acceptance criteria below.
**Epic:** [Epic 7 — Deterministic Investigation Engine](../EPIC.md)
**Depends on:** 7.2
**Epic scope covered:** `get_related_securities`, `highlight_graph_nodes`
and `set_graph_encoding`; the first `WORKSPACE_COMMAND` event this epic
produces.

## Description

**This is the one story in this epic that makes two separate epics'
finished work visibly agree with each other, which is why it is sequenced
ahead of the risk-reduction stories around it.** Epic 6 closed having
built the market-as-a-graph model specifically so a later, non-browser
consumer could read it — `packages/shared/src/topology.ts`'s own
`no-renderer-type-in-the-graph-model` invariant names its reversal trigger
as _"the first consumer of the graph model that is not a browser"_ in as
many words. This story is that consumer.

**`get_related_securities` is answerable today, directly from
`TopologyGraph`, with no new computation** — a node's sector membership,
its cluster's other members, and the hub-and-spoke relationship to `SPY`
are already graph edges. This story's own peer-comparison step (Story
7.2) is the natural caller: once the tool knows the investigated
security's sector benchmark, this tool answers which other securities
share it.

**`highlight_graph_nodes` needs `TopologyLayout` too**, because
"highlight these nodes" is meaningless without knowing where they are —
this story reads `layout.placements`, never invents a second coordinate
system, and respects `TOPOLOGY_NODE_FOOTPRINT` when deciding how close is
close.

**The emitted command is deterministic, not AI-chosen, which is the
needle this story threads.** `WorkspaceCommand` generation by a model is
explicitly Epic 10/11's territory (`PRODUCT_SPEC.md` §18) — but a
deterministic tool's own output can still drive one: when the
peer-comparison step completes, the investigation orchestrator emits a
`WORKSPACE_COMMAND` whose payload is this tool's own answer, validated
and permission-checked exactly as invariant 2 requires for any
`WorkspaceCommand`, executed against the trusted, pre-existing topology
component. No code is generated; a typed command is, by a deterministic
step, exactly as a database migration or a nightly job is "automatic"
without being AI.

**One fact this epic's own model cannot answer, named so this story does
not try to invent it.** `EPIC.md`'s own amendment from Epic 6's close
states that a reader's current filter (Story 6.8) and the live anomaly
band (Story 6.3/6.7) are not in the shared graph model at all — the
filter lives in the URL, the band is frontend-only live state. This story
highlights nodes **regardless of the reader's current filter and
regardless of band** — the command still names a filtered-out peer, and
`buildTopologyLayout` still runs over the whole universe unchanged (ADR
0048 Decision 3's filter-blind **layout** is untouched) — but Story 6.8
shipped filtering as a draw-time **mask** in which an excluded equity
draws no ink and is not hit-testable, so a filtered-out highlighted peer
is honestly invisible, with the population note stating the count. This
story does not change Story 6.8's masking decision, only states the
consequence truthfully where the two meet.

## What the user can see when this story lands

Running an investigation highlights the investigated security's real
peers on `/`'s topology graph — arriving when the peer-comparison step
completes and persisting until the reader clears it, navigates away and
the channel dies, or a later investigation replaces it — the first moment
in this product where starting an investigation on one page visibly
changes another, provided the reader is actually looking at that other
page by the time it happens.

## Acceptance criteria

**Four of these are rewritten from their original Gate-1 draft wording;
see "Resolved at Gate 1" for the argument behind each change.**

1. `get_related_securities` answers from `TopologyGraph` and the stored
   correlation generation, with no new graph computation, for the three
   relationship kinds already present as edges (`sector_membership`,
   `index_membership`, `return_correlation`), each row carrying its own
   typed relation. A security with no node in the graph (untracked) or
   no related securities under any kind (the three non-sector-ETF market
   proxies, today) is a named, honest outcome — never an empty payload.
2. `highlight_graph_nodes` reads `TopologyLayout`'s own placements and
   respects `TOPOLOGY_NODE_FOOTPRINT`; it invents no second coordinate
   system, and no coordinate ever crosses the wire in either direction.
3. The investigation **orchestrator** — not the peer-comparison tool
   itself — calls `get_related_securities` after that step's own
   `STEP_COMPLETED`, including when the step's own outcome is
   `inapplicable` or refused (deriving the command from the step's
   subject and curated sector, not from its measured outcome, so this is
   reachable on CI's permanently-zero-bar store). The result becomes a
   `WORKSPACE_COMMAND` event carrying a `highlightNodes`-shaped payload,
   validated and permission-checked through the same pipeline invariant 2
   requires of any `WorkspaceCommand`.
4. The highlight command still names a peer the reader has filtered out
   of view (the layout stays filter-blind, per `ADR 0048` Decision 3,
   unchanged by this story) — but Story 6.8's existing draw-time mask
   still hides that node, so the highlight is honestly invisible for it,
   with the population note stating how many of the highlighted peers are
   hidden and a `Show all` link to clear the cut. The highlight is drawn
   regardless of any node's live anomaly band.
5. `set_graph_encoding` ships as a narrow, explicitly-scoped tool whose
   schema admits exactly the one highlight encoding this story builds —
   an unsupported encoding is a validation failure at the schema
   boundary, not a runtime branch. Reversal trigger, as a condition: _the
   first caller that needs an encoding this story did not ship_.
6. No code or markup is generated anywhere in this path — the command is
   a typed object the topology component already knows how to execute,
   and `pnpm invariants` confirms no new call site bypasses the full
   validate → permission-check → execute → **record** pipeline (a
   permitted command is recorded onto the `Investigation`'s own history;
   a refused command is an observable, countable outcome, never a silent
   drop).
7. The highlight arrives when the peer-comparison step completes and
   persists — on whichever browser session is watching `/` by then, not
   necessarily the one that started the investigation — until it is
   cleared or superseded (AC 8).
8. The highlight clears on the reader's own gesture (`Escape`, or
   clicking empty canvas — reusing Story 6.4's existing gestures, no new
   affordance), on any terminal investigation event, if the investigation's
   own channel dies, or when a later investigation's command supersedes
   it — leaving the topology exactly as a reader would have left it
   themselves in every case.

## Out of scope

Any encoding choice not already covered by the peer-comparison highlight.
A model choosing which nodes to highlight (Epic 10/11). Persisting a
highlight past the investigation's own session. Identity-aware
permission-checking (the V1 permission check is a capability allowlist,
identity-blind by decision — see "Resolved at Gate 1"). A `Stop` control
for a running investigation (Story 7.5's).

## Resolved at Gate 1 — 2026-11-25

Four parallel shaping passes (business-analyst, technical-analyst,
ux-architect, technical-architect — the fourth re-launched after a first
attempt stalled with no output), followed by four Product-Owner
decisions. Nothing below is open; this is the record.

### The real problem all three independent passes found before any of them were asked

AC 7 ("visible while the peer-comparison step is running") and AC 8
("completion clears it") specify a highlight with a visible lifetime
under one rendered frame — Story 7.2's own measured figures put the
whole six-step pipeline at **p50 32.0 ms**, with every step's completion
landing in one `requestAnimationFrame` tick. No reader, on one tab or
two, would ever see the literal reading. Separately, `use-investigation.ts`'s
SSE subscription and all its state live inside a hook mounted by
`/securities/:symbol`; navigating to `/` unmounts it and aborts the
fetch — the investigation keeps running server-side, but the browser
loses both the stream and the _id_ needed to re-attach.

### The four decisions put to the Product Owner

- **The highlight's lifetime is investigation-scoped, not step-scoped.**
  It arrives when the peer-comparison step completes and persists until
  the reader clears it (AC 8's gestures), a later investigation's command
  supersedes it, or the channel it depends on dies — never until the
  investigation's own _completion_, which would close the window before
  any reader could navigate to see it. AC 7 and AC 8 are rewritten above
  to say this plainly rather than leaving the original, unsatisfiable
  wording standing.
- **The cross-route mechanism is lifting `{ investigationId, command }`
  into `App.tsx`**, outside `<Routes>`, via an upward callback mirroring
  the existing `onLiveSymbols` pattern — not a second database, because
  `App.tsx` already holds three facts two routes must agree about and
  neither owns (`liveFeed`, `marketFeed`, `liveSymbols`), so this is a
  fourth instance of an existing mechanism rather than ADR 0023's
  state-library reversal trigger firing. **The checklist itself is not
  lifted** — it stays pinned to the security page per Story 7.1's own
  decision. A command arriving after the reader has already navigated
  away is lost (the stream that would have delivered it is aborted);
  accepted as a currently-vacuous bound at today's ~32 ms measured
  latency, with a reversal trigger stated as a condition rather than a
  story or epic name: _the first investigation step whose measured p95
  duration exceeds the time a reader takes to reach `/` from a security
  page_.
- **The V1 permission check ships as a capability allowlist, identity-
  blind by decision.** The technical architect escalated this explicitly
  rather than signing off alone, because this story is the first-ever
  implementation of invariant 2's pipeline and whatever ships here is the
  shape Epic 10's model-driven producer inherits. Accepted on four
  conditions, all folded into Task 7.4.1 rather than left as prose: the
  missing **record** stage is built (a permitted command is written onto
  the `Investigation`'s own history — invariant 2's fourth stage, absent
  from every report until the architect's review caught it); a refused
  command is an observable, countable outcome; the `pnpm invariants`
  entry AC 6 already promised is a real check over the pipeline's call
  sites, not a test over today's one producer; and the ADR states in its
  decision text, not a footnote, that this is sufficient only while every
  producer is deterministic backend code in this repository, with the
  reversal trigger: _the first producer of a `WorkspaceCommand` that is
  not deterministic backend code in this repository_.
- **`set_graph_encoding` ships as a narrow wrapper around this story's
  one highlight.** All four shaping passes converged independently: no
  reachable scenario in this story's scope needs a second encoding — band
  and correlation-strength are each already owned elsewhere (live
  frontend state, and Story 6.6's shipped stroke-width encoding) or
  already refused for this canvas (node size). Reversal trigger rewritten
  from the original draft's story-name form into a condition: _the first
  caller that needs an encoding this story did not ship_.

### Smaller decisions taken on the shaping passes' unanimous convergence, not separately escalated

- **Correlation relation = every retained edge touching the node**
  (unbounded, ~7.4 average at deployed figures), not a separately
  invented top-5 — it is the shipped meaning of "correlated" and agrees
  with what the canvas already draws.
- **The market-stream WebSocket is refused as a command channel**, on
  three independent grounds (the stack's own stream-separation rule;
  invariant 4's stale-tab replay risk, since the gateway serves a
  reconnecting browser its last broadcast rather than a fresh compute; a
  protocol-version bump's blast radius, which would make a stale tab
  reject every frame including live prices) — recorded as a rejected
  alternative in the ADR rather than a standalone one, with its own
  reversal trigger: _the first `WorkspaceCommand` whose correct execution
  depends on market state the SSE stream cannot carry_.
- **The visual treatment is complement de-emphasis** (dim the non-peers;
  add zero new ink to the peers) rather than a sixth per-node mark or a
  new hue — both budgets are measurably exhausted on this canvas (the
  0–13 CSS px radius budget is fully allocated across five existing
  treatments with ~1.8 layout units of spare between the closest node
  pair; the whole palette is already spent on chrome, price and the
  anomaly ramp). Reusing an already-declared achromatic ink step needs no
  ADR 0026 canvas round-trip; mining a new value step would. Task 7.4.2
  owes a `pnpm probe` check before this is accepted as finished, because
  Story 6.8 already ships a de-emphasis treatment on this same surface
  for a different fact (a filtered-out landmark) and the two must be
  shown distinguishable, not assumed to be.
- **No screen-reader announcement** — the fact lives in the existing
  structural sentence, read on demand; no new live region, and no
  extension of the existing selection-announcement region, which has
  exactly one subject by design.
- **`get_related_securities` keeps its name** despite answering both
  curated membership and the stored correlation measurement, because it
  genuinely covers both facts — its docblock states the boundary with
  `/market-data/relationships` (the live, on-demand measured-relation
  wire) explicitly, so the name does not silently promise more than it
  reads.

### What was found and corrected along the way

**AC 4's original wording was already wrong about the shipped product,
independent of anything this story decided.** It said the topology's
"own filter-blind layout … still draws" a filtered-out highlighted peer.
Story 6.8 shipped filtering as a **draw-time mask**, not merely a
filter-blind layout — an excluded equity draws no ink and is not
hit-testable. The layout stays filter-blind (unchanged, correct); the
_drawing_ does not. AC 4 is rewritten to state the real consequence (an
honestly invisible highlight, counted in the population note) rather
than a claim that was never true of the code it was describing.

**`no-renderer-type-in-the-graph-model`'s own corpus does not reach the
new backend tool**, and `EPIC.md` line 599's instruction to "confirm it
still reaches your new file" rests on a misreading of that check's own
scope (`CORPUS = "packages/shared/src"` in `scripts/check-invariants.mjs`).
Task 7.4.1 owes `EPIC.md` a dated amendment there, and a **new** invariant
— the server's answer about where a node is comes from
`buildTopologyLayout` and nowhere else — to cover what the existing one
was mistakenly credited with covering.
