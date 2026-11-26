/**
 * **What a highlight's life is made of — the command, the two ways it ends,
 * and the one rule that decides which** (Task 7.4.3).
 *
 * ## Pure, and it is the whole of AC 8 that is not a gesture
 *
 * Story 7.4's AC 8 names four enders: a reader's own gesture, a terminal
 * investigation event, the channel dying, and a later command superseding
 * this one. The gesture is a browser fact and is answered where the canvas
 * is (`components/MarketTopology`, `topology/renderer-canvas.ts`); the other
 * three are **arithmetic over two values**, and this module is where they
 * live so that a test can prove each one without a hook, a DOM or a stream.
 *
 * ## Why the holder needs an id at all
 *
 * `App.tsx` holds one command and two routes have opinions about it: the
 * security page's own hook produces it, and the landing page draws it. A
 * withdrawal has to answer *is the thing I am withdrawing the thing you are
 * holding?* — and position alone cannot answer that once a reader has run
 * two investigations in one session. The concrete case this guards, which is
 * reachable today: a run on `NVDA` places a command; the reader navigates to
 * another security (the hook unmounts, the command deliberately survives —
 * `SecurityExplorer`'s own prop docblock); the reader starts a second run,
 * whose stream drops before it ever produces a command. That second run's
 * withdrawal must leave `NVDA`'s highlight exactly where it is, and the id is
 * the only thing that can say so.
 *
 * The id is a plain `string` rather than `InvestigationId`, which is this
 * directory's standing rule for a fact that arrived over a wire
 * (`WireEventBase.investigationId` and `ChecklistState.investigationId` are
 * both `string`): the brand is a backend guarantee and
 * `CLAUDE.md` records that `InvestigationId` is deliberately forgeable, so
 * importing it here would buy a claim this module cannot make.
 */

import { isTerminalEventType } from "@marketpulse/shared";
import type { InvestigationEventType } from "@marketpulse/shared";

/**
 * **A permitted `highlightNodes` command, as this browser holds it** (Task
 * 7.4.2, moved here from `use-investigation.ts` at Task 7.4.3 and given its
 * id) — invariant 2's typed instruction reaching a surface for the first
 * time.
 *
 * ## It is this module's own type rather than the wire's or the topology's
 *
 * `investigation-event.ts`' own duplication rule, applied one layer out. That
 * module's `WireHighlightNodesCommand` is a fact about **JSON** and stays
 * private to this directory — *a consumer wants a checklist, never a raw
 * frame* (`index.ts`) — and `topology/highlight.ts`' `TopologyHighlight` is a
 * fact about **what a canvas draws at full strength**. This is the third
 * thing: what a run has told this browser, and which run.
 *
 * **Since Task 7.4.3 the three no longer agree field for field, and the
 * direction of the disagreement is the point.** This type is a superset of
 * `TopologyHighlight` by exactly one field, so a route can still hand one
 * straight to `MarketTopologyHandle.setHighlight` with no converter — and
 * that region cannot read the id, because its own type does not declare one.
 * `no-second-affordance-on-a-topology-node` holds the same line in text over
 * every file under `topology/` and `components/MarketTopology/`: what
 * produced a highlight is the route's business, never the canvas's.
 *
 * ## The refused arm is not here, and that is the decision rather than a gap
 *
 * `WorkspaceCommandOutcome`'s `refused` arm is decoded (it is ADR 0029's
 * first-class, countable outcome and the permission stage exists to produce
 * it) and is deliberately **not surfaced**: Story 7.4's Gate 1 settled that a
 * refusal belongs to the surface that asked, and nothing on `/` may draw an
 * error about a command a reader never issued. So a refusal reaches the hook,
 * is counted on the server's own record, and leaves this value exactly as it
 * was — which is the same picture as *no command yet*.
 *
 * **Reversal trigger, as a condition**: the first surface that is supposed to
 * tell a reader a command was refused. At that point this becomes the outcome
 * rather than the command, and the refusal word travels with it.
 */
export interface WorkspaceHighlightCommand {
  /**
   * Which run said so. Not drawn anywhere and never read by the canvas — it
   * exists so a withdrawal can be told from a withdrawal of something else.
   */
  readonly investigationId: string;
  /** The security the run is about. Never a member of {@link symbols}. */
  readonly subject: string;
  /** The securities it is related to. Non-empty — the wire refuses otherwise. */
  readonly symbols: readonly string[];
  /** Which kinds of relationship gathered the set, in the model's own order. */
  readonly relations: readonly string[];
}

/**
 * **What a run has to say about the highlight, as one value** (Task 7.4.3).
 *
 * One value rather than two fields on the hook's result, because the two arms
 * are **one fact in sequence** — *this is in force now* / *the run that said
 * so can no longer account for it* — and two fields would be two things a
 * route has to remember to report, with the clearing being the one that gets
 * forgotten (which is this task's entire subject).
 */
export type WorkspaceHighlightState =
  | { readonly kind: "commanded"; readonly command: WorkspaceHighlightCommand }
  | { readonly kind: "withdrawn"; readonly investigationId: string };

/**
 * **What `App.tsx`'s holder becomes — the whole of supersession and the
 * whole of the id-keyed withdrawal, as one expression per arm** (Task 7.4.3).
 *
 * `commanded` **replaces, wholesale**. Never a merge, never a union of two
 * peer sets: Story 7.4's AC 8 forbids a state in which two investigations'
 * peers are highlighted at once, and the reason is that nothing on screen
 * could say which was whose — the note names one subject and counts one set.
 * The replacement needs no id comparison at all, because order is the
 * producer's: `useInvestigation`'s `runIdRef` guard drops a superseded run's
 * events before they reach this value, so the latest arrival is the latest
 * run by construction.
 *
 * `withdrawn` clears **only what it placed**. See this module's header for
 * the reachable case where the two differ.
 */
export function applyWorkspaceHighlight(
  held: WorkspaceHighlightCommand | undefined,
  next: WorkspaceHighlightState,
): WorkspaceHighlightCommand | undefined {
  if (next.kind === "commanded") return next.command;

  return held?.investigationId === next.investigationId ? undefined : held;
}

/**
 * **Does a highlight outlive the end of the stream that delivered it?** (Task
 * 7.4.3, AC 8's third and fourth clauses, and the one decision in this task
 * that is a product decision rather than a mechanism.)
 *
 * The argument is the **last event the stream carried** before it ended, or
 * `undefined` where it carried none. A terminal event is always the last one
 * — the backend's own SSE route calls `raw.end()` after it — so this one
 * reading tells the two endings apart:
 *
 *   - **The run finished** (`INVESTIGATION_COMPLETED`, `INVESTIGATION_FAILED`,
 *     and whatever Story 7.5 adds to `TERMINAL_EVENT_TYPES`). The highlight
 *     **survives**: a finished run is the most settled state its claim can
 *     have, and ADR 0029's false-impression rule is not engaged by a claim
 *     whose backing is *known and complete*.
 *   - **The run is unaccounted for** — the stream threw, or ended with no
 *     terminal event (`CONNECTION_LOST_SENTENCE`'s own state, *investigation
 *     state unknown*). The highlight is **withdrawn**: ~70 dimmed nodes are a
 *     claim about a peer set with nothing standing behind it, which is exactly
 *     the impression ADR 0029 forbids.
 *
 * ## It reads `isTerminalEventType` and never a list of names
 *
 * Story 7.5's cancellation becomes a member of `TERMINAL_EVENT_TYPES` and
 * this function's answer follows with no change here — the task file's own
 * requirement, and `workspace-highlight.test.ts` iterates that exported array
 * rather than spelling any event name.
 *
 * ## QUESTION FOR THE PRODUCT OWNER, and it is why this is a function
 *
 * Story 7.4's **AC 8 says a terminal event CLEARS the highlight**; Gate 1's
 * own recorded decision, four lines of the same `STORY.md`, says the lifetime
 * is investigation-scoped and the highlight persists *"never until the
 * investigation's own completion, which would close the window before any
 * reader could navigate to see it"*. Those two cannot both hold, and the
 * measurement settles which one is reachable rather than leaving it to taste:
 * Story 7.2 measured the whole six-step pipeline at **p50 32.0 ms**, the
 * command is emitted at step 3 of 6, and a terminal event therefore lands
 * tens of milliseconds after it — before a reader's hand has left the
 * `Investigate` control, and always before they can reach `/`. Clearing there
 * would make the highlight **unobservable on every machine**, which is the
 * same defect Gate 1 caught in AC 7's original step-scoped wording and fixed,
 * arriving a second time through the clause beside it. It would also turn
 * `overview-investigation-highlight.spec.ts` — the merged headline journey of
 * this story — red, because that spec navigates to `/` *after* waiting for a
 * step's own duration to paint.
 *
 * So the shipped answer is the one above, and the reversal is this function's
 * `true` becoming `false`: one expression, one named home, with the test
 * beside it to flip.
 */
export function highlightOutlivesChannelEnd(
  lastEventType: InvestigationEventType | undefined,
): boolean {
  return lastEventType !== undefined && isTerminalEventType(lastEventType);
}
