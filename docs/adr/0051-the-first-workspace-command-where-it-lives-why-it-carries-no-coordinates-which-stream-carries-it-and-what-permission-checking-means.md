# 0051 — The first `WorkspaceCommand`: where it lives, why it carries no coordinates, which stream carries it, and what permission-checking means before there is an identity to check

**Status:** Accepted
**Date:** 2026-11-26
**Story:** [7.4 The Graph Lights Up](../../planning/epic-07-deterministic-investigation-engine/story-04-the-graph-lights-up/STORY.md)
**Tasks:** [7.4.1](../../planning/epic-07-deterministic-investigation-engine/story-04-the-graph-lights-up/TASK-01-the-tool-the-wire-and-the-full-command-pipeline.md) (the tool, the wire, and the full command pipeline)

## Context

Architectural invariant 2 has been written down since this repository's first
commit and has never been implemented:

> **The AI manipulates typed application state, never markup or code.**
> Agent-driven UI changes are schema-validated `WorkspaceCommand` objects
> (`focusSymbols`, `openPriceChart`, `compareSymbols`, `setTimeWindow`,
> `pinEvidence`, …) executed against trusted, pre-existing components. No
> LLM-generated HTML, JSX, or executable frontend code, ever. Validate →
> permission-check → execute → record in investigation history.

Task 7.4.1 is the first implementation of that pipeline anywhere in this
product, and **nothing in it is an AI** — which is the whole point of the
sequencing. A deterministic backend step produces the same typed object Epic
10's model-driven producer will, so the pipeline exists, is correct, and has
its own mechanical guards **before** anything that cannot be reasoned about is
allowed to drive it. `PRODUCT_SPEC.md` §18 is explicit that a model choosing
which nodes to highlight is Epic 10/11's territory; a deterministic tool's own
output driving a typed command is not.

Four decisions follow. Each one is the shape Epic 10 inherits rather than a
detail local to this story, which is why they are recorded together.

---

## Decision 1 — The command's home is `packages/shared/src/workspace-command.ts`, its own file

**`packages/shared`, because both ends read it.** The backend mints and
permission-checks a command; the browser executes it against the trusted,
pre-existing topology component Story 6.2 built. That is `market-time.ts`'s
own test — _do two processes read this?_ — and the answer is yes.

**Its own file, not `investigation.ts`.** That module is ~960 lines and has
already been split once (`finding.ts`, Task 7.3.1). A command is not part of
the investigation lifecycle: it is a thing a step can _cause_, and Epic 8's
`pinEvidence` and Epic 11's generative workspace will both produce commands
with no investigation step behind them at all.

**And not `topology.ts`, which is the load-bearing half.** That module must
stay _a pure function of the curated universe alone_, and three readers depend
on it being exactly that — Epic 7's server-side questions, Epic 13's replay
refusal, and Story 6.1's renderer comparison. A command type living there would
make the graph model import the investigation engine's vocabulary, and the
first thing that would cost is `no-renderer-type-in-the-graph-model`'s own
import-closure walk.

**It is deliberately NOT the real-`Symbol` mint-site brand convention.**
`CLAUDE.md`'s TypeScript section names that convention at eight sites and it
is for **a constructed value with an explanation to protect** — `Finding`,
`AnomalyScore`, where the brand is a compile error about _which module minted
this_. A `WorkspaceCommand` has no explanation and performs no arithmetic; its
correctness is **behavioural** (is the type in the producer's capability set,
does every symbol resolve to a placement), which is a question a brand cannot
ask and is no evidence about. It sits closer to `InvestigationId`'s
string-literal tag — a value that only round-trips. The asymmetry is written
into the module's own docblock so nobody copies the weaker guarantee believing
it is the stronger one, or adds the stronger one believing it proves something
it cannot.

What **is** structural is the one thing a type can hold: `symbols` and
`relations` are `readonly [T, ...T[]]`, so an empty highlight — a fully-formed
claim about zero nodes, which ADR 0029 refuses — is **untypeable** rather than
merely untested.

---

## Decision 2 — No coordinates cross the wire, in either direction

A command names **symbols**. Both sides re-derive position by running
`buildTopologyLayout` over `buildTopologyGraph(UNIVERSE)`, and nothing on the
wire carries an `x` or a `y`.

**This is ADR 0048 Decision 3 being spent rather than a new decision.** That
decision kept the layout closed-form — and, through two later amendments,
weight-blind and filter-blind — and its stated benefit was always _two
processes agree about where a node is from one input_. This is the first
consumer that needed it: the server permission-checks against its own
`placements`, the browser draws from its own call of the same pure function
over the same compiled-in universe, and the two are byte-identical.

**A coordinate on the wire would be a second home for a fact both ends already
compute, and the failure mode is the quiet one.** A server whose ring radius
and a browser whose ring radius differ by a release lands a highlight _beside_
the right node. Nothing errors, no figure is wrong, every structural assertion
stays green, and the only instrument that can see it is a person looking at the
picture — which is the same silence `no-random-in-the-shared-model` was written
against, one process over.

**The backend half is now mechanical**, which it was not before this task:
`the-server-places-a-node-only-through-the-shared-layout` refuses any file
under `apps/backend/src` that names a topology layout constant
(`TOPOLOGY_RING_RADIUS_X`/`_Y`, `TOPOLOGY_NODE_FOOTPRINT`,
`TOPOLOGY_CLUSTER_DENSITY`, `TOPOLOGY_GOLDEN_ANGLE`) or rolls its own
trigonometry, with two `pnpm break` entries behind it — one per clause, because
a constant respelled locally and a bearing re-derived from scratch are written
by different authors. `no-renderer-type-in-the-graph-model` was credited with
covering this and **does not**: its corpus is `packages/shared/src` and that
module's import closure, so it cannot reach the backend at all.
`planning/epic-07-deterministic-investigation-engine/EPIC.md` carries the dated
amendment correcting the instruction that rested on that misreading.

---

## Decision 3 — The SSE investigation stream carries it; the market-stream WebSocket is refused

`WORKSPACE_COMMAND` is a member of `InvestigationEvent`, serialised by
`toWireInvestigationEvent` and delivered on the SSE stream ADR 0050 Decision 2
built. It is **not** a sixth market-stream frame type, and that was considered
rather than assumed.

The market socket is the obvious-looking home: every browser on `/` already
holds one, it is the transport that reaches the topology's own route, and a
highlight is a thing that happens to a graph the market socket already feeds.
**It is refused on three independent grounds, any one of which is sufficient.**

1. **The stack's own stream-separation rule.** `CLAUDE.md`'s _Intended stack_
   states it in as many words: _WebSocket for continuous market data;
   SSE/streaming HTTP for agent investigation events. These two streams have
   different semantics and stay separate._ A `WorkspaceCommand` is an
   investigation event by every property that matters — it is per-investigation,
   it is sequenced in that investigation's own `seq`, it is replayed to a
   client attaching mid-run, and it ends when the investigation does.

2. **Invariant 4's stale-tab replay risk.** Since Task 4.7.6 the gateway serves
   a joining or subscribing browser its **last broadcast** aggregate rather
   than a recomputed one — deliberately, to stop the top and the middle of `/`
   contradicting each other on a reload. A command delivered on that transport
   would inherit that behaviour: a browser reconnecting an hour later would be
   handed a command minted against a universe and a layout that have since
   moved, with nothing on the frame saying so. The SSE stream's own replay is
   bounded by the investigation, which is exactly the right bound for a command
   that belongs to one.

3. **A protocol-version bump's blast radius.** The market socket carries every
   live price on every route. A command type added, renamed or re-shaped there
   is a frame a stale tab may reject — and `market-stream-protocol.ts`'s
   decoder answers `unsupported` per message, so the realistic failure is worse
   than a rejected command: a bundle that cannot read the new protocol version
   stops reading **prices**. The highlight is a feature; the price is the
   product.

**Reversal trigger, as a condition:** _the first `WorkspaceCommand` whose
correct execution depends on market state the SSE stream cannot carry._

---

## Decision 4 — The permission stage ships as a capability allowlist, identity-blind by decision

`permitWorkspaceCommand(command, capability, layout)` answers a
`WorkspaceCommandOutcome` — `permitted` carrying the command, or `refused`
carrying one word from a closed vocabulary. Two conjuncts, both real:

1. the command's `type` is in the **producer's declared capability set**
   (`ORCHESTRATOR_CAPABILITY`, one member: `highlightNodes`);
2. every symbol the command names — and its `subject` — resolves to a
   placement in `buildTopologyLayout(...).placements`.

**Nothing asks who the producer is.** There is no identity, no scope and no
rate limit, and that is a decision taken in front of the Product Owner at
Story 7.4's Gate 1 rather than an absence left for a later reader to discover.
It is stated here in the decision text rather than in a footnote because
whatever ships here is the shape Epic 10's model-driven producer inherits:

> **This is sufficient only while every producer of a `WorkspaceCommand` is
> deterministic backend code in this repository.** A capability set is a
> statement about _what kind of thing may be asked for_. It is not a statement
> about _who is asking_, and the moment the asker is a model — or anything
> whose output is a function of text somebody else wrote — the question
> changes from "is this command type allowed" to "is this command allowed from
> this actor, about these securities, at this rate", which this stage cannot
> express and must not be stretched to.

**Reversal trigger, as a condition:** _the first producer of a
`WorkspaceCommand` that is not deterministic backend code in this repository._

**The second conjunct is the one that earns its keep today.** The first is
unreachable from this epic's single producer and is written as a real check
over a real argument anyway, because a hard-coded `true` is a stage that does
not exist. The second catches a **reachable** defect: a command minted before
a curation change, or against a universe a replica has not reloaded, names a
symbol `buildTopologyLayout` will not place, and the result is a highlight
drawn on nothing with no error raised anywhere.

**And a refusal is a first-class, countable outcome on the wire** — ADR 0029's
own rule arriving on a gate. The `WORKSPACE_COMMAND` event's payload is
therefore an `outcome` (mirroring `TOOL_CALL_COMPLETED`'s own field name)
rather than a bare `command`, because a field typed `command: WorkspaceCommand`
can only express the permitted half and the refusal would have had to live in a
log — observable to an operator reading stderr and to nobody else. The browser's
decoder reads both arms.

### Where the four stages live, and why the record stage is the event log

| Stage                | Where                                                                                    |
| -------------------- | ---------------------------------------------------------------------------------------- |
| **validate**         | `readWorkspaceCommand(raw: unknown)` in `apps/backend/src/workspace-command-pipeline.ts` |
| **permission-check** | `permitWorkspaceCommand` in `apps/backend/src/workspace-command-permission.ts`           |
| **execute**          | the browser, against the trusted, pre-existing topology component (Task 7.4.2 draws it)  |
| **record**           | the investigation's own append-only event log, through `store.appendEvent`               |

**The validate stage is real rather than a cast, even though V1's one producer
is typed backend code.** Epic 10's producer hands over parsed JSON from a
model, and a stage written as a no-op now is a stage that does not exist when
it is needed. It also closes the one gap the type cannot: `readonly [T, ...T[]]`
makes an empty highlight untypeable for a caller holding a literal and says
nothing whatever about an array that arrived as JSON. The producer builds its
candidate as `unknown` and reads it back, so the validator is on the real path
rather than beside it.

**The record stage is the event log, and a second structure was considered and
refused.** The log is what `eventsFrom(id, 1)` replays, what the SSE route
serves, and what a client attaching mid-run receives — _the investigation's own
history_ in the full sense this product means by that phrase — and **both arms
are in it**, so an audit cannot mistake _we declined_ for _nothing happened_. A
`workspaceCommands: readonly WorkspaceCommand[]` field on `Investigation` was
the obvious alternative and is refused for the reason that type's own docblock
already gives about `findings`/`evidence`: `investigation-store.ts` is a
200-entry process-lifetime cache with no re-reader, so an array there would be
_populated, evicted and never read_. It arrives with **Epic 12's persistence**,
which is the story that gives every one of them a reader — the same condition,
not a new one.

---

## Consequences

- **Invariant 2 has a shipped implementation**, and every later producer —
  including the first model-driven one — composes the same four stages against
  the same types rather than inventing a pipeline under pressure.
- **`pnpm invariants` holds 99**, two more than before this task: the
  layout-coordinate check above and
  `the-analytical-tool-registry-is-one-class`, which asserts that every
  `): AnalyticalTool<` factory under `apps/backend/src` is wired into
  `investigationTools` through `toRunnableTool(` and that the two counts are
  equal. Three `pnpm break` entries behind them.
- **`get_related_securities` is deliberately not an `AnalyticalTool`**, which
  is what let the second check collapse the "two undeclared classes of registry
  member" concern rather than declare a second class. The reason is structural
  and fatal: `FINDING_TYPE_FOR_TOOL` is `satisfies Record<ToolName, FindingType>`
  — a total map checked in both directions by `finding.test.ts` — so a tool in
  `TOOL_NAMES` that makes no claim about the market needs a `FindingType` with
  no real producer. It has its own small interface instead, and its docblock
  states the boundary with `/market-data/relationships` (the live, on-demand
  measured-relation wire) explicitly, so its name does not silently promise
  more than it reads.
- **The command is emitted after the peer step's own `STEP_COMPLETED`,
  regardless of that step's outcome** — derived from the subject's curated
  sector and the stored correlation generation, never from the peer tool's
  measured result. That is what makes this feature **reachable on CI's
  permanently-zero-bar store**, rather than permanently unreachable the way
  most of Epic 5 is: the peer step refuses there for ever and the highlight is
  correct anyway.
- **A subject with no related securities produces no event at all.** `QQQ`,
  `DIA` and `IWM` carry no membership edge of any kind — `buildTopologyGraph`
  refuses to invent one — and an untracked subject refuses before a command
  exists to permit. Neither is an empty payload.
- **What no gated machine and no person has seen**: a `return_correlation` row
  in this tool's answer. CI has zero bars and no provider, so the nightly pass
  never runs there and the correlation half is `not-measured` for ever — a
  stated absence, never _measured as none_. It is the same permanent limit
  every correlation figure in Epic 6 carries.

## Alternatives rejected

- **The market-stream WebSocket as the command channel** — Decision 3, with
  its three grounds and its own reversal trigger.
- **Coordinates on the wire** — Decision 2. Rejected on the silent-failure
  argument, and the agreement it would have papered over is the thing ADR 0048
  Decision 3 was bought for.
- **`relation: TopologyEdgeKind`, singular, on the command.** The draft shape.
  Rejected on measurement: ~82–84% of drawn correlation edges join two
  securities already in the same visible cluster, so a set spanning
  `sector_membership` and `return_correlation` is the **common** case, and a
  singular field over it is a fully-formed claim that the set is one kind — the
  note Task 7.4.2 writes would say _sector peers_ over a set that also holds
  correlated securities. `relations` is the **set of kinds present**, in
  `TOPOLOGY_EDGE_KINDS` declaration order, non-empty by type. A **per-symbol**
  annotation was also rejected, in the other direction: Gate 1 settled the
  treatment as complement de-emphasis — one set-level visual change and one
  note — so a per-symbol relation would be a field with no reader, which is ADR
  0029's first rule arriving on a type. The per-symbol fact is not lost;
  `get_related_securities`' own output carries each related security's kinds, so
  the day a story needs per-node phrasing the command grows a field and the tool
  grows nothing.
- **A `workspaceCommands` array on `Investigation`** — refused above, on
  `Investigation`'s own documented reasoning about `findings`/`evidence`.
- **The brand convention applied to `WorkspaceCommand`** — Decision 1. It would
  cost two mint sites and an invariant and buy nothing a structural validator
  does not already give, while implying a guarantee about _correctness_ the
  brand cannot make.
- **A `pnpm invariants` entry over the four stages' own composition.**
  Considered and declined with a stated condition rather than silently: the
  composition is one nine-line function body, and a grep over it would assert
  the presence of two function names in one file — which a next author bypasses
  by writing a **second** producer elsewhere rather than by editing this one.
  What is mechanical instead is the type: a producer reaches the orchestrator
  only through `WorkspaceCommandProducer.propose`, whose return type is a
  `WorkspaceCommandOutcome` that only `permitWorkspaceCommand` mints, so
  skipping stage 2 means hand-constructing that union member and `tsc -b` is
  what shows it. **Condition for turning it into a real check: a second
  `WorkspaceCommandProducer` in this repository**, at which point the
  composition stops being one body and becomes a convention.

## Reversal triggers, as conditions

- **Decision 2** — the first `WorkspaceCommand` whose correct execution cannot
  be expressed as a set of symbols.
- **Decision 3** — the first `WorkspaceCommand` whose correct execution depends
  on market state the SSE stream cannot carry.
- **Decision 4** — the first producer of a `WorkspaceCommand` that is not
  deterministic backend code in this repository.
- **The pipeline check** — a second `WorkspaceCommandProducer` in this
  repository.
