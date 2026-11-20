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
  withConnectionLost,
  withInvestigationId,
  type ChecklistState,
  type ChecklistStepView,
} from "./investigation-checklist-state.js";
import {
  startInvestigation,
  streamInvestigationEvents,
} from "./investigation-stream.js";

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

function completionAnnouncement(step: ChecklistStepView): string {
  // `?? 0` would be `no-imputed-zero-in-a-figure`'s own trap: a completed
  // step ALWAYS carries a real duration (`STEP_COMPLETED` is the only
  // event that sets `status: "completed"`, and it always carries one) —
  // `liveRegionText`'s own caller only reaches this branch once that is
  // true, so an absent duration here is this module's own bug, not an
  // honest zero.
  if (step.durationMs === undefined) {
    throw new Error("a completed step must carry its own duration");
  }
  const description = step.description ?? "The step";
  return `${description} complete, ${String(step.durationMs)} ms`;
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
 * **The last completed step rather than the last ROW**, because the two
 * differ in exactly the case that matters: a run that ends without reaching
 * its final step leaves seeded rows still holding room, and keying on the
 * last row would answer that with silence — the one outcome a live region
 * must never produce where something did happen.
 */
function liveRegionText(
  checklist: ChecklistState | undefined,
  runningAnnounced: boolean,
): string {
  if (checklist === undefined) return "";
  if (checklist.connectionLost) return CONNECTION_LOST_SENTENCE;

  if (checklist.terminal) {
    const lastCompleted = checklist.steps.findLast(
      (step) => step.status === "completed",
    );
    return lastCompleted === undefined
      ? ""
      : completionAnnouncement(lastCompleted);
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
    // before the `POST` below has even been sent.
    setRecord({ symbol, checklist: optimisticChecklist(symbol) });

    void runInvestigation(symbol, controller.signal, runId);
  }, [record, symbol, runInvestigation]);

  return {
    checklist,
    announcement,
    pastCoverThreshold: runningAnnounced,
    start,
  };
}
