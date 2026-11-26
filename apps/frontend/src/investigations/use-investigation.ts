// The one hook `SecurityExplorer.tsx` calls — starts an investigation,
// subscribes to its stream, and holds the checklist a reader sees (Task
// 7.1.4).
//
// **Subject-pinned by construction.** The checklist this returns is
// `undefined` whenever the page's current `symbol` does not match the
// investigation this hook is holding — Story 7.1's own Gate 1 rule: if a
// reader changes the ticker in the search field, the old investigation's
// checklist does not follow the new page. The investigation itself keeps
// running on the backend regardless; only this browser's rendering of it
// stops.

import { useCallback, useEffect, useRef, useState } from "react";

import {
  applyInvestigationEvent,
  optimisticChecklist,
  resetForNewRun,
  withConnectionLost,
  withInvestigationId,
  type ChecklistState,
  type ChecklistStepView,
} from "./investigation-checklist-state.js";
import {
  startInvestigation,
  streamInvestigationEvents,
} from "./investigation-stream.js";
import { CONFIDENCE_LEVELS, type Confidence } from "@marketpulse/shared";

/**
 * How long a step must be `running` before the live region says so — the
 * same number `use-pending-panel.ts`'s `SHOW_AFTER_MS` is (ADR 0028's cover
 * threshold), restated here rather than imported: that constant is
 * `market/`'s own internal, never re-exported through its barrel, and
 * `eslint.config.mjs`'s feature-module boundary forbids reaching past one.
 * Two homes for one number is the cost of two feature modules wanting the
 * same threshold; the number itself is not re-measured, only re-cited.
 */
const ANNOUNCE_RUNNING_AFTER_MS = 160;

export const CONNECTION_LOST_SENTENCE =
  "Connection lost — investigation state unknown";

/**
 * **The terminal announcement — a count by confidence level, not a
 * transcript** (Task 7.3.3, AC 12). Six claims landing in one sub-second run
 * used to coalesce onto the LAST-completed step's own sentence alone — five
 * of six findings never announced to anyone not reading the screen. A
 * listener now hears what the run actually found: `4 findings supported, 2
 * unknown`.
 *
 * Counts only steps that minted a finding — `confidence !== undefined` — the
 * exact set with something to report; an `inapplicable` step contributes
 * nothing here for the same reason it draws no claim on screen. Ordered by
 * `CONFIDENCE_LEVELS`, so `CONFIRMED` (no producer in this epic) is silently
 * absent rather than printed at zero, and the word "findings" appears once,
 * in the first clause, rather than once per level.
 */
function confidenceCountSummary(steps: readonly ChecklistStepView[]): string {
  const counts = new Map<Confidence, number>();
  for (const step of steps) {
    if (step.confidence === undefined) continue;
    counts.set(step.confidence, (counts.get(step.confidence) ?? 0) + 1);
  }
  if (counts.size === 0) return "Investigation complete — no findings produced";

  const clauses: string[] = [];
  for (const level of CONFIDENCE_LEVELS) {
    const count = counts.get(level);
    if (count === undefined) continue;
    const word = level.toLowerCase();
    clauses.push(
      clauses.length === 0
        ? `${String(count)} finding${count === 1 ? "" : "s"} ${word}`
        : `${String(count)} ${word}`,
    );
  }
  return clauses.join(", ");
}

function startedAnnouncement(step: ChecklistStepView): string {
  return `${step.description ?? "The step"} running`;
}

/**
 * What the live region should say RIGHT NOW, given the checklist and
 * whether the 160 ms "running" announcement has already fired for this run
 * — everything here is a plain derivation of its arguments, computed at
 * render time rather than through an effect, because none of it needs a
 * clock. Only `runningAnnounced` itself does, which is why it is the one
 * piece of state `useInvestigation` manages with a timer.
 *
 * **Reads the step the run is actually AT, not `steps[0]` (Task 7.2.7).**
 * With one step those were the same row and the distinction did not exist;
 * with six, `steps[0]` is the row that finished first, so a terminal
 * investigation would have announced the completion of a step that ended
 * five steps ago. What a listener gets instead is the pipeline's own
 * progress: the sentence of whichever step is `running` while it runs, and
 * the last COMPLETED step's own once the run is terminal.
 *
 * **The terminal branch is a SUMMARY, not the last completed step's own
 * sentence** (Task 7.3.3) — `confidenceCountSummary` above carries the full
 * argument. The pre-terminal, running-step branch below is unchanged.
 */
function liveRegionText(
  checklist: ChecklistState | undefined,
  runningAnnounced: boolean,
): string {
  if (checklist === undefined) return "";
  if (checklist.connectionLost) return CONNECTION_LOST_SENTENCE;

  if (checklist.terminal) {
    return confidenceCountSummary(checklist.steps);
  }
  const runningStep = checklist.steps.find((step) => step.status === "running");
  if (runningAnnounced && runningStep !== undefined) {
    return startedAnnouncement(runningStep);
  }
  return "";
}

interface InvestigationRecord {
  readonly symbol: string;
  readonly checklist: ChecklistState;
}

/**
 * **A permitted `highlightNodes` command, as this browser holds it** (Task
 * 7.4.2) — invariant 2's typed instruction reaching a surface for the first
 * time.
 *
 * ## It is this module's own type rather than the wire's or the topology's
 *
 * `investigation-event.ts`' own duplication rule, applied one layer out. That
 * module's `WireHighlightNodesCommand` is a fact about **JSON** and stays
 * private to this module — *a consumer wants a checklist, never a raw frame*
 * (`index.ts`) — and `topology/highlight.ts`' `TopologyHighlight` is a fact
 * about **what a canvas draws at full strength**. This is the third thing:
 * what a run has told this browser. The three agree structurally today, which
 * is what lets a route hand one to the other with no converter; they are not
 * one type because they would stop agreeing the moment either end grew a
 * field the other has no reader for.
 *
 * ## The refused arm is not here, and that is the decision rather than a gap
 *
 * `WorkspaceCommandOutcome`'s `refused` arm is decoded (it is ADR 0029's
 * first-class, countable outcome and the permission stage exists to produce
 * it) and is deliberately **not surfaced**: Story 7.4's Gate 1 settled that a
 * refusal belongs to the surface that asked, and nothing on `/` may draw an
 * error about a command a reader never issued. So a refusal reaches this hook,
 * is counted on the server's own record, and leaves this value exactly as it
 * was — which is the same picture as *no command yet*.
 *
 * **Reversal trigger, as a condition**: the first surface that is supposed to
 * tell a reader a command was refused. At that point this becomes the outcome
 * rather than the command, and the refusal word travels with it.
 */
export interface WorkspaceHighlightCommand {
  /** The security the run is about. Never a member of {@link symbols}. */
  readonly subject: string;
  /** The securities it is related to. Non-empty — the wire refuses otherwise. */
  readonly symbols: readonly string[];
  /** Which kinds of relationship gathered the set, in the model's own order. */
  readonly relations: readonly string[];
}

export interface UseInvestigationResult {
  /** `undefined` whenever there is nothing to show for the CURRENT
   * `symbol` — before any press, or after the reader has navigated to a
   * different security. */
  readonly checklist: ChecklistState | undefined;
  /** What the checklist's own live region should currently hold. Empty
   * before anything is worth saying. */
  readonly announcement: string;
  /**
   * Has the active run been `running` for more than `ANNOUNCE_RUNNING_AFTER_MS`
   * (ADR 0028's own 160 ms cover threshold)? The SAME flag that gates the
   * live region's "started" announcement, reused rather than duplicated —
   * `InvestigationChecklist`'s own breathing-ground treatment is keyed on
   * this, not on `status === "running"` alone, which is what keeps a run
   * that finishes in a handful of milliseconds from ever breathing at all.
   */
  readonly pastCoverThreshold: boolean;
  /**
   * **The latest permitted `highlightNodes` command this hook has seen, or
   * `undefined`** (Task 7.4.2) — a side channel, not part of the checklist.
   *
   * ## It is NOT subject-pinned, unlike {@link checklist}
   *
   * The checklist is `undefined` the moment the page's symbol stops matching
   * the run it belongs to (Story 7.1's own rule: a reader who changes ticker
   * does not keep the old security's rows). This is the opposite, by Story
   * 7.4's AC 7: *the highlight arrives when the peer-comparison step completes
   * and persists on whichever browser session is watching `/` by then*. A
   * command withdrawn because the reader navigated would be a feature with no
   * reachable state at all — navigating is how a reader gets to the screen
   * that draws it.
   *
   * ## A returned value rather than a callback prop on the hook
   *
   * `onLiveSymbols`/`onLiveFocus`' established shape, which is the route's:
   * the hook answers a value and `SecurityExplorer` reports it upward from an
   * effect. A callback parameter here would have to be stable or it would
   * re-run the subscription, which is the defect `liveSymbols`' own `useMemo`
   * comment records one route over.
   *
   * **It is never set back to `undefined`.** A command is superseded by a
   * later one and cleared by a reader's own gesture or a terminal event —
   * Task 7.4.3's subject, and `App.tsx` is where that will land, because the
   * holder has to outlive this hook for the clearing to mean anything.
   */
  readonly highlight: WorkspaceHighlightCommand | undefined;
  /** Starts an investigation for `symbol`. A no-op if one is already
   * showing for this symbol and has not reached a terminal state — the
   * client-side mirror of the backend's own idempotent `POST`. */
  readonly start: () => void;
}

export function useInvestigation(symbol: string): UseInvestigationResult {
  const [record, setRecord] = useState<InvestigationRecord | undefined>(
    undefined,
  );
  // The ONE thing about the announcement that is not derivable from
  // `record` alone — whether 160 ms of `running` have elapsed. Reset to
  // `false` by every fresh `start()`.
  const [runningAnnounced, setRunningAnnounced] = useState(false);
  /**
   * **The latest permitted command, held beside the checklist rather than in
   * it** (Task 7.4.2) — see {@link UseInvestigationResult.highlight}.
   *
   * Its own `useState` and not a field on `record`, for two reasons that both
   * matter. It is **not subject-pinned**: `record` is replaced wholesale by
   * `start()` and read through a `symbol` equality guard, and a command living
   * there would be withdrawn by the very navigation that makes it visible. And
   * a `WORKSPACE_COMMAND` changes **nothing about the checklist** — the
   * reducer has a case for it that returns its input unchanged, deliberately,
   * because this event is a side channel rather than a step's progress.
   *
   * It is deliberately **not** reset by `start()`: a second press supersedes
   * the command by producing a new one, and blanking it in between would take
   * a correct highlight off `/` for however long the run takes.
   */
  const [highlight, setHighlight] = useState<
    WorkspaceHighlightCommand | undefined
  >(undefined);

  const controllerRef = useRef<AbortController | undefined>(undefined);
  const runIdRef = useRef(0);
  const runningTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const checklist = record?.symbol === symbol ? record.checklist : undefined;

  // Ends whatever run is in flight when this component goes away. It does
  // not touch the investigation itself — aborting the fetch only detaches
  // THIS subscriber, exactly as the backend's own `request.raw.on("close")`
  // promises; the run keeps going on the server regardless.
  useEffect(
    () => () => {
      controllerRef.current?.abort();
      if (runningTimerRef.current !== undefined) {
        clearTimeout(runningTimerRef.current);
      }
    },
    [],
  );

  // The ONE timer this hook owns. Elapsed time since a step started
  // running is not derivable from anything React re-renders on — the same
  // honest use of a timer-in-an-effect `use-pending-panel.ts` argues for.
  // A step that finishes before the timer fires never sets it: `clearTimeout`
  // in the branches above mean `runningAnnounced` stays `false` for the
  // whole run, which is what keeps a sub-160ms run's live region silent
  // until the one, final write.
  useEffect(() => {
    if (checklist === undefined || runningAnnounced) {
      return undefined;
    }
    if (checklist.connectionLost || checklist.terminal) {
      return undefined;
    }
    // ANY step running, not `steps[0]` — the latch fires once per run and
    // the run is "running" for as long as any of its six rows is (Task
    // 7.2.7).
    if (!checklist.steps.some((step) => step.status === "running")) {
      return undefined;
    }
    if (runningTimerRef.current !== undefined) {
      return undefined;
    }

    const timer = setTimeout(() => {
      runningTimerRef.current = undefined;
      setRunningAnnounced(true);
    }, ANNOUNCE_RUNNING_AFTER_MS);
    runningTimerRef.current = timer;

    return () => {
      clearTimeout(timer);
      runningTimerRef.current = undefined;
    };
  }, [checklist, runningAnnounced]);

  const announcement = liveRegionText(checklist, runningAnnounced);

  // Still current, i.e. nothing newer has started for this symbol since —
  // what stops a stale run's events from being applied after a second
  // press superseded it. Reads the ref rather than closing over anything
  // that changes between renders, so it never needs to be in a dependency
  // list.
  function current(runId: number): boolean {
    return runId === runIdRef.current;
  }

  // **Wrapped so `start` below can depend on it honestly.** This function
  // closes over nothing but `setRecord` (stable, from `useState`) and
  // `current` (stable, reads only a ref) — `[]` is therefore its real
  // dependency list, not a suppressed one, and `start`'s own `useCallback`
  // can name it without being invalidated every render.
  const runInvestigation = useCallback(
    async (
      forSymbol: string,
      signal: AbortSignal,
      runId: number,
    ): Promise<void> => {
      const started = await startInvestigation(forSymbol, signal);
      if (!current(runId)) return;

      if (started === undefined) {
        setRecord((previous) =>
          previous?.symbol === forSymbol
            ? {
                symbol: forSymbol,
                checklist: withConnectionLost(previous.checklist),
              }
            : previous,
        );
        return;
      }

      setRecord((previous) =>
        previous?.symbol === forSymbol
          ? {
              symbol: forSymbol,
              checklist: withInvestigationId(previous.checklist, started.id),
            }
          : previous,
      );

      // **Caught, not left to float.** `streamInvestigationEvents` can throw
      // — a network drop mid-stream, same as the one `startInvestigation`
      // above already answers as an absence rather than a rejection — and
      // an uncaught throw here would do two things at once: leave this
      // `Promise` (never awaited by `start()`) rejecting with nobody to
      // report it, and leave the checklist frozen on whatever status it
      // last reached, non-terminal, for ever — which the second-press guard
      // would then read as "still running" and silently refuse every later
      // press for this symbol. Found exactly this way: a transient failure
      // during this task's own manual verification left the control
      // permanently unresponsive until the next full page reload.
      try {
        for await (const decoded of streamInvestigationEvents(
          started.id,
          0,
          signal,
        )) {
          if (!current(runId)) return;
          // `unreadable`/`unsupported` are ignored rather than thrown — Done
          // when 5's own requirement, and `readInvestigationEvent`'s whole
          // reason for existing.
          if (decoded.kind !== "event") continue;

          // **Invariant 2's own event, read beside the reducer rather than
          // through it** (Task 7.4.2). The checklist is unaffected by a
          // command — `applyInvestigationEvent` has a case for this type that
          // returns its input unchanged — so the one thing to do with it is
          // hold the permitted arm and let the route carry it to the surface
          // that executes it. **A refused outcome leaves this alone**, which
          // is the whole of the degraded behaviour Gate 1 settled: no
          // highlight, and no error anywhere a reader did not ask a question.
          if (
            decoded.event.type === "WORKSPACE_COMMAND" &&
            decoded.event.outcome.kind === "permitted"
          ) {
            const { command } = decoded.event.outcome;
            setHighlight({
              subject: command.subject,
              symbols: command.symbols,
              relations: command.relations,
            });
          }

          setRecord((previous) =>
            previous?.symbol === forSymbol
              ? {
                  symbol: forSymbol,
                  checklist: applyInvestigationEvent(
                    previous.checklist,
                    decoded.event,
                  ),
                }
              : previous,
          );
        }
      } catch {
        // Falls through to the same `withConnectionLost` below a clean
        // stream end reaches — a thrown stream and one that simply ended
        // with no terminal event are the same fact from this browser's own
        // point of view: nothing more is coming.
      }

      if (!current(runId)) return;

      // The stream ended — cleanly or by the `catch` above. If its own
      // terminal event already arrived this is a no-op; if not, this is the
      // dropped-stream case the named sentence exists for.
      setRecord((previous) =>
        previous?.symbol === forSymbol
          ? {
              symbol: forSymbol,
              checklist: withConnectionLost(previous.checklist),
            }
          : previous,
      );
    },
    [],
  );

  const start = useCallback(() => {
    // The second-press guard (client-side mirror; the backend's own
    // idempotent `POST` is what actually makes this safe). A checklist
    // already showing a non-terminal state for THIS symbol absorbs the
    // press.
    if (
      record?.symbol === symbol &&
      !record.checklist.terminal &&
      !record.checklist.connectionLost
    ) {
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    runIdRef.current += 1;
    const runId = runIdRef.current;
    setRunningAnnounced(false);

    // The client-optimistic paint: a queued row, in this same commit,
    // before the `POST` below has even been sent. **A second press for the
    // SAME symbol keeps the prior run's claims, dimmed, rather than
    // blanking them** (AC 11) — reaching here with `record.symbol ===
    // symbol` only happens once the guard above has already confirmed the
    // prior run is terminal or connection-lost, so `resetForNewRun` always
    // has a finished run to carry forward. A fresh symbol has nothing of
    // its own to keep, so it gets the plain blank six.
    setRecord({
      symbol,
      checklist:
        record?.symbol === symbol
          ? resetForNewRun(record.checklist)
          : optimisticChecklist(symbol),
    });

    void runInvestigation(symbol, controller.signal, runId);
  }, [record, symbol, runInvestigation]);

  return {
    checklist,
    announcement,
    pastCoverThreshold: runningAnnounced,
    highlight,
    start,
  };
}
