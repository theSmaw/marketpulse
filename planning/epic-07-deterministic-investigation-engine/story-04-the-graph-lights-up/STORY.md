# Story 7.4 — The Graph Lights Up

**Status:** Complete — 2026-11-28, accepted by the Product Owner at Gate 2,
AC 8's terminal-event clause struck. All four tasks — 7.4.1 (PR #711), 7.4.2
(PR #713), 7.4.3 (PR #715), 7.4.4 (PR #716) — plus a Phase 3 fix round (PR
#718) and a documentation sweep with a real e2e root-cause fix (PR #719).
**Phase 3 story verification done, 2026-11-27,
which found four defects in shipped behaviour: three fixed in one round and one
recorded as a gap.** The three fixed are all in what this surface _says_ (two
de-emphases sharing one verb phrase and reading as a contradiction; the filter's
clause about the highlight spoken before the highlight's own clause; a
landmark-only highlight explaining nothing at all) and were found by reading the
real route rather than by anything mechanical. The fourth — a tracked subject
with no related securities (`QQQ`, `DIA`, `IWM`) getting no sentence on either
surface — is **not cleanly fixable today**: the wire's own silence has three
indistinguishable causes, and the one browser-side alternative would be a second
home for the tool's answer missing its measured half. `docs/GAPS.md` carries it
with Story 7.5 as owner; `TOPOLOGY.md` §11.3 and `INVESTIGATIONS.md` §14 carry
the full account of all four. Four
Gate-1 open questions resolved by the Product Owner; see "Resolved at Gate 1"
for the argument behind each change to the acceptance criteria below.

**AC 8's terminal-event clause is struck, decided by the Product Owner at
Gate 2 on 2026-11-28.** AC 8 had said a terminal investigation event clears
the highlight; the Gate-1 record below said the lifetime is
investigation-scoped and the highlight persists _"never until the
investigation's own completion, which would close the window before any reader
could navigate to see it"_ — the file contradicted itself. Task 7.4.3 found
that the measurement settles which of those is reachable rather than taste: at
Story 7.2's p50 of 32.0 ms, with the command emitted after step 4 of 6,
clearing on a terminal event makes the highlight **unobservable on every
machine** and turns this story's own merged headline e2e journey red. Gate 1's
reading is what shipped, in one named one-expression home
(`highlightOutlivesChannelEnd`), and the Product Owner's decision — unanimous
across all five Phase 3 reports' own recommendation — ratifies the shipped
behaviour rather than the literal AC text: the clause below is struck, dated
rather than rewritten, and `docs/GAPS.md` carries the closed decision with its
figures.
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

**Four of these were rewritten from their original Gate-1 draft wording; see
"Resolved at Gate 1" for the argument behind each change. Three more are
corrected or verdicted below, per Phase 3's own end-to-end check against the
shipped code; see "Resolved at Phase 3."**

1. `get_related_securities` answers from `TopologyGraph` and the stored
   correlation generation, with no new graph computation, for the three
   relationship kinds already present as edges (`sector_membership`,
   `index_membership`, `return_correlation`), each row carrying its own
   typed relation. A security with no node in the graph (untracked) or
   no related securities under any kind (the three non-sector-ETF market
   proxies, today) is a named, honest outcome — never an empty payload.
2. `highlight_graph_nodes` reads `TopologyLayout`'s own placements; it
   invents no second coordinate system, and no coordinate ever crosses
   the wire in either direction. **The `TOPOLOGY_NODE_FOOTPRINT` clause
   is vacuous by correct design** — Gate 1's complement de-emphasis asks
   no proximity question, and `the-server-places-a-node-only-through-the-
shared-layout` makes a server-side distance test structurally
   unbuildable on purpose (Story 6.9's node-size precedent: refused
   rather than shipped, verdicted rather than ticked).
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
5. **The command vocabulary admits exactly one encoding** — a
   `highlightNodes` command is the only member of `WORKSPACE_COMMAND_TYPES`,
   and an unsupported type is refused at the schema boundary
   (`readWorkspaceCommand`) and at the permission stage
   (`type-not-permitted`), never a runtime branch. **No `set_graph_encoding`
   tool is built**, by the same Gate-1 scope decision this clause always
   described — four independent shaping passes converged on it and Phase
   3 confirmed no such tool exists anywhere in the codebase. Reversal
   trigger, as a condition: _the first caller that needs an encoding this
   story did not ship_.
6. No code or markup is generated anywhere in this path — the command is
   a typed object the topology component already knows how to execute,
   and `pnpm invariants` confirms no new call site bypasses the validate
   → permission-check → execute stages. **The record stage is real and
   tested but not yet invariant-held** — a permitted command is recorded
   onto the investigation's own append-only event log
   (`store.appendEvent`), proven by a test reading it back out of
   `eventsFrom`, and a refused command is an observable, countable
   outcome rather than a silent drop — but no `pnpm invariants` entry
   yet asserts that every `WORKSPACE_COMMAND` outcome reaches a reader
   only through that log. Named rather than closed; see "Resolved at
   Phase 3."
7. The highlight arrives when the peer-comparison step completes and
   persists on the browser session that started the investigation, for
   as long as that session is on `/` — until it is cleared or superseded
   (AC 8). **A second tab or a second browser receives nothing**, and a
   command arriving after the reader has already navigated away is lost
   — both are Gate 1's own accepted, currently-vacuous bound at today's
   measured latency, not a built cross-session capability.
8. The highlight clears on the reader's own gesture (`Escape`, or
   clicking empty canvas — reusing Story 6.4's existing gestures, no new
   affordance), ~~on any terminal investigation event,~~ if the
   investigation's own channel dies, or when a later investigation's
   command supersedes it — leaving the topology exactly as a reader
   would have left it themselves in every case. **Struck at Gate 2,
   2026-11-28, by the Product Owner**: the clause was unreachable by
   construction (Story 7.2's p50 32.0 ms lands a terminal event before
   any reader could navigate to see the highlight clear), and the
   shipped behaviour — `highlightOutlivesChannelEnd` returning `true`
   for every terminal event, so the highlight survives one — is what
   this criterion now describes.

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
under one rendered frame — Story 7.2's own measured figures put
**five of its six steps** completed at **p50 32.0 ms** (the sixth,
the only one reading `market_bars`, has never completed on any
machine with a database reachable — corrected 2026-11-27 at Phase 3's
close, which found three live sites calling this "the whole six-step
pipeline"), with every one of those five steps' completions landing
in one `requestAnimationFrame` tick. No reader, on one tab or two,
would ever see the literal reading, and the sixth step's own duration
against a populated store is unmeasured rather than covered by this
figure. Separately, `use-investigation.ts`'s
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

## Resolved at Phase 3 — 2026-11-27

All four tasks complete and merged (PRs #711, #713, #715, #716), plus a
Phase 3 fix round (PR #718) for three defects Phase 3's own verification
found by actually driving the integrated route. Five specialist reports
(tester, business-analyst, ux-architect, technical-analyst,
technical-architect) checked the combination end to end against every
acceptance criterion above. This is the record of what changed and why.

### What Phase 3 found and fixed before this record was written

Three real, cheap defects — found only by looking, as this repository's
own working-loop rule predicts — were fixed in PR #718, reviewed and
independently re-verified before merging: the accessible sentence
self-contradicted when a filter and a highlight were both in force (two
adjacent claims shared one verb phrase for two different populations —
now `drawn quieter` for Story 6.8's landmark de-emphasis and `set back`
for this story's complement de-emphasis, asserted as distinctness rather
than as two expected strings); a pronoun arrived before its antecedent
(the filter's clause referring to "the highlighted securities" was
composed and drawn before the clause naming what was highlighted — now
reordered, in both the spoken composition and the drawn `.notes` stack);
and a landmark-only highlight (investigating a market proxy like `SPY`)
visibly changed nothing and explained nothing, unlike the same state
under a filter — now a three-way `TopologyHighlightInk` union closes it,
with a fourth outcome a compile error rather than silence. A fourth
finding — a zero-peers subject (`QQQ`/`DIA`/`IWM`) gets no sentence
anywhere — was judged not safely fixable without new wire shape and is
recorded in `docs/GAPS.md`, owned by Story 7.5.

### The acceptance criteria, corrected above rather than left to mislead

**AC 2**'s `TOPOLOGY_NODE_FOOTPRINT` clause is verdicted vacuous by
correct design, not struck: nothing in this story's shipped treatment
asks a proximity question, and a server-side one is now mechanically
forbidden (`the-server-places-a-node-only-through-the-shared-layout`).
**AC 5** is corrected to describe what shipped (a one-member vocabulary
refused at two boundaries) rather than promising a named
`set_graph_encoding` tool that does not exist anywhere in the
codebase — the underlying scope decision is sound and unanimous across
every shaping pass that touched it; only the AC's own wording overclaimed.
**AC 6** is corrected to name the real state of its own bolded clause:
three of the pipeline's four stages are invariant-held, the **record**
stage is real and tested but not yet asserted by `pnpm invariants`.
**AC 7** is corrected to drop the implication that a command reaches
"whichever browser session is watching `/`" — it reaches only the
session that started the investigation, and a second tab or a stale
navigation losing the command are both Gate 1's own named, accepted
bounds, not built capabilities.

### What was left for the Product Owner, and the decision taken at Gate 2

**AC 8's terminal-event clause was the one thing this record did not
settle, because it was not a documentation correction — it was a product
decision Gate 1 never actually took, worded as though it had.** All five
Phase 3 reports independently reached the same reading: AC 8's literal
"clears on any terminal investigation event" and Gate 1's own recorded
reasoning for an investigation-scoped lifetime cannot both hold, the
measurement (Story 7.2's p50 32.0 ms over five of its six steps, with the
command emitted after step 4 of 6) says a terminal event lands before any
reader could navigate to see the highlight, and what shipped —
`highlightOutlivesChannelEnd` always returning `true` for a terminal
event — is the only reading with an observable state. `docs/GAPS.md`
carries the full account with figures.

**Decided 2026-11-28 at Gate 2: the clause is struck**, exactly as every
report recommended. AC 8 above is amended in place with a dated strike
rather than a silent rewrite, and `docs/GAPS.md`'s own entry is closed
with the same date.

### What shipped open, named with owners (not blocking Gate 2, carried forward honestly)

- **The screen-reader premise Gate 1's no-announcement decision rested
  on is confirmed false** — the peer-comparison claim names only the
  sector benchmark, never a peer, and `get_related_securities` reaches no
  text result surface at all. `docs/GAPS.md`'s thirteenth screen-reader
  entry, owned by the Product Owner, with `Connected securities` (an
  existing unowned placeholder) as the natural textual home.
- **The complement de-emphasis does not read as "these are the peers" at
  any width, and is illegible at 390** — on a real scored store it reads
  more clearly than the workshop sitting first suggested (Phase 3's own
  tester re-measured this positively), but a reader still cannot pick the
  investigated subject out of its own highlighted set, and the 390
  picture is dominated by undimmable anomaly rings on ~3 px discs.
  `docs/GAPS.md`, owned by the Product Owner, discharged if a later story
  suppresses the de-emphasis below the existing label fit-scale threshold.
- **No performance figure exists anywhere in this story** for the new
  per-live-batch costs the highlight and filter paths add to `/`'s
  topology region — the one region with a published 60 FPS / 16.7 ms
  median figure (Story 6.7). Both new walks are gated on a command being
  in force and cost exactly zero otherwise, which is why this is a gap
  rather than a defect; `docs/GAPS.md` carries it with a re-measure
  (`scripts/topology-instrument.mjs`'s `--live` arm, with a command
  applied) and no owner yet named.
- **Nobody has watched this feature against a deployed backend.** A
  `LIVE-REHEARSAL.md` row is added for Story 7.4 (empty, naming what a
  sitting would check) rather than left for Story 7.7 to invent after the
  fact — Epic 7 itself is not yet registered in `REHEARSAL_LEDGER_EPICS`,
  which is explicitly Story 7.7's own job per its task file, not this
  story's to take.

### What Phase 3 confirmed was NOT a gap, worth stating so it is not re-litigated

The frontend mint-site invariant Task 7.4.2's own review recommended —
guarding against a hand-constructed `WorkspaceHighlightCommand` bypassing
the decoder — was already built in Task 7.4.3
(`a-highlight-command-is-minted-only-where-the-wire-is-decoded`) and is
break-verified on current `main`. Three independent Phase 3 reports were
asked to check for this gap; all three confirmed it is closed.
