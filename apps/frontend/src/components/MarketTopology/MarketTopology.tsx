import { useEffect, useRef } from "react";

import type {
  SecuritiesFailure,
  SecuritiesView,
} from "../../use-securities.js";
import {
  mountCanvasTopology,
  topologyPalette,
  topologySource,
} from "../../topology/index.js";
import type { TopologyRenderer } from "../../topology/index.js";
import { Button } from "../Button/Button.js";
import styles from "./MarketTopology.module.css";

// **The market topology, drawn** (Task 6.1.2).
//
// **There was a second renderer here for the length of one task.** Task 6.1.2
// mounted Sigma.js 4 + graphology and a hand-rolled Canvas2D through this one
// component — one container, one sizing path, one palette, one graph, a
// `renderer` prop as the only difference — measured both, and **deleted the
// loser**, because a comparison harness is not a second implementation to
// maintain. ADR 0048 is the decision and the figures; `renderer-sigma.ts` is
// in that commit's history and nowhere else.
//
// ## The absence states are DOM text, and that is acceptance criterion 7
//
// `loading`, `empty` and `failed` render a paragraph **beside** the frame rather
// than a sentence painted into a canvas. Painted text is unreachable by a screen
// reader, unassertable below a browser, and invisible to
// `overview-degraded-grid.spec.ts` when Story 6.2 puts this region on `/`. And
// `loading` is a reserved box rather than a half-drawn graph: a canvas with
// three nodes on it is indistinguishable from a graph that broke.
//
// ## The renderer is mounted in an effect and the graph is not state
//
// The renderer owns a 2d context, a `ResizeObserver` and several listeners; it is an imperative resource with a lifetime, which is
// exactly what an effect with a cleanup is for. Nothing about it belongs in
// React state — a re-render must not re-mount a context, and the React Compiler
// rules in this repository reject the shapes that would.

export interface MarketTopologyProps {
  /** The universe, in whichever state `use-securities.ts` has it. */
  readonly universe: SecuritiesView;

  /**
   * Called once per **drawn frame**, from inside the renderer's own loop.
   *
   * Story 6.1's acceptance criterion 5: the frame-rate plant must live inside
   * the render loop and never on the DOM, because a canvas mutates no DOM and
   * that channel reads silent for a working graph exactly as it would for one
   * that painted once and died. Nothing in the application passes one; the
   * measurement harness does.
   */
  readonly probe?: (() => void) | undefined;

  /**
   * Ask for the universe again. `useSecurities().retry`, at every call site.
   *
   * **Required rather than optional** (Task 6.1.3), which is `UniverseTable`'s
   * own precedent and is the stronger contract by one failure mode: an
   * optional handler that a caller forgets to pass takes the `Try again`
   * control off a failed screen *silently*, and an absent control is exactly
   * what this product uses to say **trying again will not help**. A caller
   * that has no retry to offer has a decision to make, not a prop to omit.
   *
   * It is called only from the `failed` state and only when that state is
   * `retryable`; see the branch below.
   */
  readonly onRetry: () => void;
}

export function MarketTopology({
  universe,
  probe,
  onRetry,
}: MarketTopologyProps) {
  const frame = useRef<HTMLDivElement>(null);

  const securities = universe.state === "loaded" ? universe.securities : null;

  useEffect(() => {
    const container = frame.current;
    if (container === null || securities === null) return;

    let mounted: TopologyRenderer | null = null;
    let refusal: HTMLParagraphElement | null = null;

    try {
      const { graph, layout } = topologySource(securities);

      mounted = mountCanvasTopology(container, {
        graph,
        layout,
        palette: topologyPalette(),
        probe,
      });
    } catch (error) {
      // **A throw inside an effect is a render error, and nothing above `App`
      // catches one — the page goes blank.** `CLAUDE.md` records that as a
      // measured defect of this application. A renderer that cannot start
      // (no WebGL2, no 2d context, a token missing from the stylesheet) says so
      // in DOM text instead.
      //
      // **Written into the container rather than into React state**, which is
      // the React Compiler's `set-state-in-effect` rule arriving as a design
      // note rather than as an obstacle — and the repair is simpler than the
      // code it replaced. A `setFailure` here is a cascading render whose only
      // purpose is to re-render the element this effect is already holding; the
      // container IS the external system, and writing to it is what an effect
      // is for. It is DOM text either way, which is acceptance criterion 7's
      // actual requirement.
      refusal = document.createElement("p");
      refusal.className = styles.absence ?? "";
      refusal.textContent = `The market topology could not be drawn in this browser. ${error instanceof Error ? error.message : String(error)}`;
      container.append(refusal);
    }

    return () => {
      mounted?.destroy();
      refusal?.remove();
    };
  }, [securities, probe]);

  if (universe.state === "loading") {
    return (
      <div className={styles.frame}>
        <p className={styles.absence}>Reading the tracked universe.</p>
      </div>
    );
  }

  if (universe.state === "empty") {
    return (
      <div className={styles.frame}>
        <p className={styles.absence}>
          No securities are tracked yet, so there is no market to draw.
        </p>
      </div>
    );
  }

  if (universe.state === "failed") {
    return (
      <div className={styles.frame}>
        {/*
         * **Three things and no more: the sentence, the control, the
         * reference** (Task 6.1.3).
         *
         * Before this task the whole `failed` state was one sentence, which
         * threw away both halves of what `use-securities.ts` had already
         * worked out — whether asking again is worth offering, and the
         * correlation id a reader could quote. `retryable` and `retrying` are
         * **flags on this state rather than two further states** (that
         * module's own account, and `FRONTEND-STATE.md` §4), and what they
         * change here is exactly what they change in `UniverseTable`: the
         * sentence, and whether there is a button.
         *
         * **It is deliberately NOT `UniverseTable`'s `FailedState`.** That
         * surface draws a marker, a lowercase status word, a headline, a
         * cause and a prospect in `BackendIndicator`'s vocabulary, because it
         * *is* the tracked universe and a reader looking at it has nothing
         * else on screen. This is a graph region — one that shares a screen
         * with six others in Story 6.2 — and the five-element treatment would
         * be a second, louder answer to a question the chrome is already
         * reporting. Short words about **this region's own subject**, which
         * is also why they are not a copy of that component's strings: a
         * second copy of one sentence is what this repository's own rule
         * forbids, and *there is no market to draw* is a different sentence
         * from *the tracked universe is not available*.
         */}
        <div className={styles.state}>
          <p className={styles.sentence}>
            {topologyFailureSentence(universe.failure, universe.retryable)}
          </p>
          {universe.retryable && (
            <p className={styles.action}>
              {/*
               * **The subject is in the accessible name**, which is Task
               * 2.14.7's finding and not a flourish: a wholly unreachable
               * backend will put this control on the same screen as another
               * `Try again` the moment Story 6.2 lands this region on `/`,
               * and two controls reading *Try again, button* are two
               * different questions a reader cannot tell apart.
               *
               * **Not disabled while a retry is in flight**, for the reason
               * `UniverseTable` records: a disabled button loses focus in
               * every browser, and the hook supersedes its own request
               * anyway. The word changes; the control stays where the reader
               * left it.
               */}
              <Button
                aria-label={`${universe.retrying ? "Trying again…" : "Try again"} — the market topology`}
                variant="secondary"
                icon="refresh"
                onClick={onRetry}
              >
                {universe.retrying ? "Trying again…" : "Try again"}
              </Button>
            </p>
          )}
          {universe.requestId !== null && (
            /*
             * The whole correlation id and never a prefix — `api-client.ts`
             * owns that rule — labelled, and only ever beside a failure the
             * reader is already being told about. `null` whenever nothing
             * arrived to carry one, which is every `unreachable` case.
             */
            <p className={styles.reference}>
              Reference{" "}
              <span className={styles.command}>{universe.requestId}</span>
            </p>
          )}
        </div>
      </div>
    );
  }

  return <div className={styles.frame} ref={frame} data-topology="canvas" />;
}

/**
 * What this region says when the universe could not be read.
 *
 * One function so the three sentences sit together and the component renders
 * one rather than deciding it — `UniverseTable.failedCopy`'s shape, with that
 * component's own reasoning about why a single "something went wrong" would
 * send two thirds of its readers somewhere useless.
 *
 * **The raw `code` is nowhere near this screen and must not arrive here.** It
 * is an internal discriminator; `requestId` is the only internal identifier
 * this product shows.
 */
function topologyFailureSentence(
  failure: SecuritiesFailure,
  retryable: boolean,
): string {
  if (failure === "unreachable") {
    return "Nothing answered at the service’s address, so there is no market to draw. A service that is starting up looks exactly like this.";
  }

  if (retryable) {
    return "The service answered and could not reach the data it needs, so there is no market to draw. This is usually brief.";
  }

  // The honest half of the same sentence, and the half that is easy to leave
  // out: with no control on screen, a reader who is not told that waiting will
  // not help waits for a page that never comes good.
  return "Something answered at the service’s address and it was not this service, so there is no market to draw. Trying again now would produce the same answer.";
}
