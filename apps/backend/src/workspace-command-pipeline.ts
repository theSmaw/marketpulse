// **Invariant 2's pipeline, whole, in one file** — `validate →
// permission-check → execute → record` (Task 7.4.1, ADR 0051).
//
// This is the first implementation of it anywhere in this product, and it is
// one module on purpose: the four stages are the claim, and a reader checking
// that no stage is skipped should not have to assemble the answer from four
// files. **There is deliberately no `pnpm invariants` entry over the stages
// themselves**, and that is a judgement rather than an omission — the
// composition is `createHighlightPeersProducer`'s own body, nine lines, and a
// grep over it would assert the presence of two function names in one file,
// which a next author bypasses by writing a second producer elsewhere rather
// than by editing this one. What IS mechanical is the thing that cannot be
// bypassed: the orchestrator reaches a producer only through
// `WorkspaceCommandProducer.propose`, whose return type is a
// `WorkspaceCommandOutcome` — a value only `permitWorkspaceCommand` mints —
// so a producer that skipped stage 2 would have to construct that union
// member by hand, and `tsc -b` is what makes it visible. The stated condition
// for turning this into a real check: **a second `WorkspaceCommandProducer`
// in this repository**, at which point the composition stops being one body
// and becomes a convention.
//
//   1. **validate** — {@link readWorkspaceCommand}, over `unknown`. A real
//      structural check rather than a cast, even though V1's one producer is
//      typed backend code: Epic 10's producer hands over parsed JSON from a
//      model, and a stage written as a no-op now is a stage that does not
//      exist when it is needed. It is also the only place the non-empty
//      `symbols` tuple is established from untrusted data — the type cannot
//      do it, so the validator does, and nothing downstream re-checks.
//   2. **permission-check** — `permitWorkspaceCommand`, two real conjuncts.
//   3. **execute** — the browser's, against the trusted, pre-existing topology
//      component. Nothing here generates markup or code; what crosses the wire
//      is a typed object naming symbols, and the thing that draws it was built
//      by Story 6.2 and reviewed by people.
//   4. **record** — the investigation's own append-only event log, which the
//      orchestrator writes through `store.appendEvent`. See the note at the
//      foot of this file for why that IS the record stage rather than a second
//      structure beside it.
//
// ## Why the producer is a seam on the provider rather than a tool
//
// `scripted-agent-provider.ts` knows nothing about topology, sectors or
// correlations, and must not: it is the orchestrator Epic 10 replaces. So it
// takes a list of {@link WorkspaceCommandProducer}s keyed on the tool whose
// step they follow, and this module is the one that knows a highlight is made
// of sector-mates.

import {
  ORCHESTRATOR_CAPABILITY,
  permitWorkspaceCommand,
} from "./workspace-command-permission.js";

import type {
  Ticker,
  ToolName,
  TopologyEdgeKind,
  TopologyLayout,
  WorkspaceCommand,
  WorkspaceCommandOutcome,
} from "@marketpulse/shared";
import type { RelatedSecuritiesAnswerer } from "./related-securities.js";
import type { WorkspaceCommandCapability } from "./workspace-command-permission.js";

/**
 * One source of `WorkspaceCommand`s, as the orchestrator holds it.
 *
 * `afterTool` is a {@link ToolName} rather than a step index, because a step's
 * position in the pipeline is not a fact about why a command follows it —
 * Story 7.2 reordered its own six steps once already, and an index would have
 * moved the highlight onto the wrong step with nothing failing.
 */
export interface WorkspaceCommandProducer {
  /** The step after whose own `STEP_COMPLETED` this producer is asked. */
  readonly afterTool: ToolName;
  /**
   * The outcome to record, or `undefined` for **nothing to say**.
   *
   * `undefined` is not a refusal and the distinction is load-bearing: an
   * untracked subject and a subject with no related securities are both *there
   * is no command here*, and an event carrying a refusal would say *we
   * declined to execute one*, which is a statement about a command that was
   * never proposed. ADR 0029's own rule — a claim about data requires data.
   */
  readonly propose: (
    subjectSymbols: readonly Ticker[],
    asOf: Date,
  ) => Promise<WorkspaceCommandOutcome | undefined>;
}

const WORKSPACE_COMMAND_TYPE_SET = new Set<string>(["highlightNodes"]);

const EDGE_KIND_SET = new Set<string>([
  "sector_membership",
  "index_membership",
  "return_correlation",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * **Stage 1 — validate.** A candidate from anywhere, as a
 * {@link WorkspaceCommand} or `undefined`.
 *
 * Never throws: a malformed candidate is a refusal to proceed, not an
 * exception a caller has to guess might arrive — `readInvestigationEvent`'s own
 * rule one layer over, and `market-stream-protocol.ts`' before it.
 *
 * **The non-empty tuples are established HERE and nowhere else.** `symbols`
 * and `relations` are `readonly [T, ...T[]]` on the type, which makes an empty
 * highlight untypeable for a caller holding a literal — and says nothing
 * whatever about an array that arrived as JSON. This function is the one place
 * that gap is closed, which is why it is a real stage rather than a cast even
 * while the only producer is typed code in this repository.
 *
 * It does not check that a symbol exists in the universe or has a placement:
 * that is stage 2's second conjunct, deliberately, because *is this shaped like
 * a command* and *may this command be executed against this layout* fail for
 * unrelated reasons and a reader needs to know which.
 */
export function readWorkspaceCommand(
  raw: unknown,
): WorkspaceCommand | undefined {
  if (!isRecord(raw)) return undefined;

  const { type, symbols, relations, subject } = raw;

  if (typeof type !== "string" || !WORKSPACE_COMMAND_TYPE_SET.has(type)) {
    return undefined;
  }
  if (typeof subject !== "string" || subject.length === 0) return undefined;

  if (!Array.isArray(symbols) || symbols.length === 0) return undefined;
  if (
    !symbols.every((value) => typeof value === "string" && value.length > 0)
  ) {
    return undefined;
  }

  if (!Array.isArray(relations) || relations.length === 0) return undefined;
  if (
    !relations.every(
      (value) => typeof value === "string" && EDGE_KIND_SET.has(value),
    )
  ) {
    return undefined;
  }

  // The tuples the type promises, built from the validated arrays. `as` is
  // confined to re-expressing a checked length as a tuple and to the `Ticker`
  // brand — both facts this function has just established by reading, which is
  // the one shape of assertion that is evidence rather than a bypass.
  const [firstSymbol, ...restSymbols] = symbols as string[];
  const [firstRelation, ...restRelations] = relations as string[];
  if (firstSymbol === undefined || firstRelation === undefined) {
    return undefined;
  }

  return {
    type: "highlightNodes",
    symbols: [firstSymbol as Ticker, ...(restSymbols as Ticker[])],
    relations: [
      firstRelation as TopologyEdgeKind,
      ...(restRelations as TopologyEdgeKind[]),
    ],
    subject: subject as Ticker,
  };
}

export interface HighlightPeersProducerOptions {
  readonly related: RelatedSecuritiesAnswerer;
  /**
   * The layout the browser will draw, as a **function** rather than a value.
   *
   * A function because `buildTopologyLayout` over 516 nodes is work this
   * process should do once and keep, and a value here would make the call site
   * decide that — see `index.ts`, where it is memoised beside the graph.
   */
  readonly layout: () => TopologyLayout;
  readonly capability?: WorkspaceCommandCapability;
}

/**
 * The one producer this epic ships: **highlight the investigated security's
 * related securities when the peer-comparison step completes.**
 *
 * `afterTool: "compare_securities"` — matched on tool identity rather than
 * position, and asked **regardless of that step's own outcome**. The command is
 * derived from the subject's curated sector and the stored correlation
 * generation, never from the peer tool's measured result, which is precisely
 * what makes this feature reachable on CI's permanently-zero-bar store: the
 * peer step refuses there for ever, and the highlight is correct anyway.
 */
export function createHighlightPeersProducer(
  options: HighlightPeersProducerOptions,
): WorkspaceCommandProducer {
  const { related, layout, capability = ORCHESTRATOR_CAPABILITY } = options;

  return {
    afterTool: "compare_securities",

    async propose(subjectSymbols, asOf) {
      const [subject] = subjectSymbols;
      if (subject === undefined) return undefined;

      const answer = await related.answer({ symbol: subject }, asOf);

      // An untracked subject has no node and no placement — *there is no
      // command here*, never a refusal of one that was never proposed.
      if (answer.kind !== "ok") return undefined;

      const symbols = answer.value.related.map((row) => row.symbol);
      // **No command at all rather than an empty highlight** (ADR 0029). The
      // three non-sector-ETF market proxies reach this today.
      if (symbols.length === 0) return undefined;

      const relations = [
        ...new Set(answer.value.related.flatMap((row) => row.relations)),
      ];

      // Stage 1. The candidate is built as `unknown` and read back, so the
      // validator is on the real path rather than beside it — a producer that
      // bypassed it would be the defect
      // `the-workspace-command-pipeline-has-four-stages` refuses.
      const candidate: unknown = {
        type: "highlightNodes",
        symbols,
        relations,
        subject,
      };
      const command = readWorkspaceCommand(candidate);
      if (command === undefined) return undefined;

      // Stage 2.
      return permitWorkspaceCommand(command, capability, layout());
    },
  };
}

/**
 * **Stage 4 — record, and why there is no second structure here.**
 *
 * A permitted command is recorded onto the investigation's own history by the
 * orchestrator appending its `WORKSPACE_COMMAND` event through
 * `store.appendEvent` — the same append-only log every other stage of every
 * step writes to, readable back through `store.eventsFrom(id, 1)`, which is
 * what `GET /investigations/:id/events` serves and what a client attaching
 * mid-run replays. So the record is *the investigation's own history* in the
 * full sense this product means by that phrase, and both arms are in it: a
 * refusal is recorded beside a permission, so an audit cannot mistake *we
 * declined* for *nothing happened*.
 *
 * **A `workspaceCommands` array on `Investigation` was considered and refused**,
 * and the reason is that type's own docblock: `findings`/`evidence` are
 * deliberately NOT fields there, because `investigation-store.ts` is a
 * 200-entry process-lifetime cache with no re-reader, so an array there would
 * be *populated, evicted and never read*. A command array would be the
 * identical defect one field over. It arrives with Epic 12's persistence, which
 * is the story that gives every one of them a reader — the same condition, not
 * a new one.
 *
 * This is a documentation anchor rather than code because the stage genuinely
 * is the log; a function here would be a second home for `appendEvent`.
 */
export const WORKSPACE_COMMAND_RECORD_IS_THE_EVENT_LOG = true;
