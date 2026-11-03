import { useEffect, useId, useImperativeHandle, useRef } from "react";
import type { Ref, RefObject } from "react";

import type { Ticker, TopologyGraph } from "@marketpulse/shared";

import type {
  SecuritiesFailure,
  SecuritiesView,
} from "../../use-securities.js";
import {
  mountCanvasTopology,
  topologyPalette,
  topologySource,
} from "../../topology/index.js";
import type {
  TopologyAnomalyTreatment,
  TopologyRenderer,
} from "../../topology/index.js";
import { Button } from "../Button/Button.js";
import { useWaited } from "../MarketProxyStrip/use-waited.js";
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
//
// ## No `React.memo` boundary here, and the reason is already in the code above
//
// Traced rather than assumed (Task 6.2.5, Story 6.2's acceptance criterion 8):
// the mount effect's own deps are `[topology, probe, sentenceId]`. `topology`
// is `topologySource(securities)`, which memoises on `securities`' own array
// **identity** — and `securities` is a `useState` value `use-securities.ts`
// changes only on a settled `GET /securities` response or a retry, **never**
// on a live-feed batch. `probe` is `undefined` in every application call site.
// So a host re-render from `/`'s 6.8–16.1 batches a minute reconciles one
// `<div>` whose children haven't changed and never re-runs this effect — the
// canvas has no continuous render loop to begin with (it redraws only from
// `invalidate()`, reached by resize, drag or wheel), so there is nothing here
// for a memo boundary to buy. Held by a **producer-side** assertion
// (`MarketTopology.test.tsx`'s own account) rather than a render-count one,
// for this repository's usual reason: a render count is the wire, and the
// wire cannot see a defect in the producer.
//
// **Reversal trigger, a condition**: the first prop this region takes that
// changes at feed cadence (Story 6.3's anomaly band or Story 6.6's
// liquidity-driven size are the likely source) — at that point the mount
// effect's deps would include something that changes every batch, and this
// decision needs re-taking rather than assuming it still holds.
//
// **It did NOT fire, measured rather than assumed, when Task 6.3.3 wired the
// anomaly band live.** The obvious shape — a `bands` prop the route re-passes
// every batch — would have fired it; this component does not take that shape
// on the live path at all. `MarketOverview.tsx` reaches `setBands` through
// `MarketTopologyHandle` (the same imperative-ref shape `resetView` already
// used), called from the ROUTE's own effect, never from a prop this
// component receives. So the live anomaly band changes the picture every
// batch while changing NONE of `MarketTopology`'s own props — the mount
// effect's deps are still exactly `[topology, probe, sentenceId]`, unchanged,
// and this component still never re-renders at feed cadence. The trigger's
// own condition (“the first prop that changes at feed cadence”) remains
// unmet by construction; `MarketTopology.test.tsx`'s “anomaly-band update
// channel” describe block is where this is held.

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
   * Each equity's anomaly treatment, by symbol (Task 6.3.2). Absent from
   * this map entirely draws `normal` — today's shipped node.
   *
   * **The declarative path, for a Storybook story — the real route uses
   * {@link MarketTopologyHandle.setBands} instead, as of Task 6.3.3.** This
   * prop is what makes a fixed state a one-line `arg` (`AnomalyBandsAllExtreme`
   * and its siblings, `MarketTopology.stories.tsx`); the real route's own
   * live-batch policy (AC 4/AC 5: the first absent section draws every
   * equity unscored, a later absent section is held rather than blanked)
   * needs state across renders that a prop re-passed by a parent cannot
   * hold on its own, so `MarketOverview.tsx` keeps that policy in its own
   * `useRef` and calls the handle method directly — see that method's own
   * docblock for why two paths exist for one underlying call. **Omitting
   * this prop and never calling `setBands` are the same picture** — every
   * equity drawn `normal` — which is why every pre-6.3 Storybook story
   * here needed no change.
   *
   * **A second effect, not the mount effect's own deps**, when this prop
   * IS used. The mount effect traced its deps to
   * `[topology, probe, sentenceId]` for Story 6.2's declined memo boundary
   * (this file's own module docblock) specifically because none of them
   * change at feed cadence; `bands` is the one the module docblock's
   * reversal trigger named in advance, and folding it into the SAME effect
   * would re-mount the canvas — destroying a reader's pan and zoom — on
   * every batch. Keeping it separate is what makes `setBands`'s whole
   * redraw-without-remount contract reachable through a prop at all; the
   * handle path below needs no such effect, because it calls the renderer
   * directly from the caller's own effect instead.
   */
  readonly bands?: ReadonlyMap<Ticker, TopologyAnomalyTreatment> | undefined;

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

  /**
   * Imperative access to the mounted renderer — `resetView`, and since
   * Task 6.3.3, `setBands`.
   *
   * **A ref rather than a prop**, because what it carries (`fitView` again,
   * right now) is not state a parent holds and re-passes; it is a command
   * aimed at an imperative resource this component already owns (the module
   * docblock's own argument for why the renderer lives in an effect at all).
   * React 19 takes `ref` as a plain prop, so no `forwardRef` wrapper.
   */
  readonly ref?: Ref<MarketTopologyHandle>;
}

/** What a caller can ask this component to do. See {@link MarketTopologyProps.ref}. */
export interface MarketTopologyHandle {
  /**
   * Fit the view fresh — zoom back to 1, pan back to 0 (Task 6.2.3). The
   * `Reset view` control's whole mechanism: a clamped pan means a reader can
   * never lose the market entirely, but it is still a market that has been
   * dragged and zoomed, and this is the way back with no reload.
   *
   * **A no-op while nothing is mounted** (loading, empty, failed, or no
   * renderer could start) — there is nothing to reset, and a caller does not
   * have to ask first.
   */
  resetView(): void;

  /**
   * Redraw the equity nodes with new anomaly treatments, without
   * re-mounting the renderer (Task 6.3.3) — `TopologyRenderer.setBands`,
   * reached imperatively rather than through
   * {@link MarketTopologyProps.bands}.
   *
   * **Two paths to the same call, for two different callers.** The `bands`
   * prop is Task 6.3.2's own declarative path, built for a Storybook story
   * to demonstrate a fixed state with one `arg`; this method is the real
   * route's, because applying a live batch is governed by AC 4/AC 5's own
   * stateful policy (the first absent section draws every equity unscored,
   * every absent section after a real one is held rather than blanked) —
   * that policy lives in a `useRef` the ROUTE owns, not in a value this
   * component could re-derive from its own props alone, so it reaches the
   * renderer the same way `resetView` already does: a command aimed at a
   * resource this component owns, called from an effect rather than
   * re-passed every render.
   *
   * **A no-op while nothing is mounted**, same contract as `resetView`.
   */
  setBands(treatments: ReadonlyMap<Ticker, TopologyAnomalyTreatment>): void;
}

export function MarketTopology({
  universe,
  probe,
  bands,
  onRetry,
  ref,
}: MarketTopologyProps) {
  const frame = useRef<HTMLDivElement>(null);
  const renderer = useRef<TopologyRenderer | null>(null);
  const sentence = useRef<HTMLParagraphElement>(null);
  const sentenceId = useId();

  const securities = universe.state === "loaded" ? universe.securities : null;

  /**
   * **Built once, read by both the mount effect and the drawn sentence
   * below** (Task 6.2.4). `topologySource` is a pure, memoised function —
   * the same `securities` array gives back the same `{ graph, layout }` by
   * identity — so calling it here rather than only inside the effect is
   * free, and it is what lets {@link topologyDrawnSentence} read the real
   * cluster count from the graph the canvas actually drew rather than
   * hard-coding `11` a second place.
   */
  const topology = securities === null ? null : topologySource(securities);

  /**
   * **`[topology]`, not `[]`** — unlike `resetView`, `setBands` needs the
   * CURRENT graph to rebuild the accessible sentence
   * ({@link applyAnomalyBands}), and `topology` is recomputed per render
   * rather than held in a ref. Recreating the handle object when `topology`
   * changes (a retry that lands a fresh universe, which is rare) keeps the
   * closure fresh without a `topologyRef`-syncing effect to get wrong;
   * `topology.current` on the CALLER's side is reassigned by
   * `useImperativeHandle` itself and the identity change is invisible to it.
   */
  useImperativeHandle(
    ref,
    () => ({
      resetView: () => renderer.current?.reset(),
      setBands: (treatments) => {
        if (topology === null) return;
        applyAnomalyBands(renderer, sentence, topology.graph, treatments);
      },
    }),
    [topology],
  );

  /**
   * **`Reading the tracked universe.` behind `useWaited`'s 2,000 ms floor**
   * (Task 6.2.4) — `MarketProxyStrip`/`SectorPerformance`/`Unusual`'s own
   * pattern, copied rather than re-invented. The measured 174–277 ms
   * response time means drawing the sentence immediately would flash it in
   * the landing page's primary area on every cold load, which is the exact
   * defect those three siblings were built to avoid.
   */
  const waited = useWaited(universe.state === "loading");

  useEffect(() => {
    const container = frame.current;
    if (container === null || topology === null) return;

    let mounted: TopologyRenderer | null = null;
    let refusal: HTMLParagraphElement | null = null;

    try {
      mounted = mountCanvasTopology(container, {
        graph: topology.graph,
        layout: topology.layout,
        palette: topologyPalette(),
        probe,
        labelledBy: sentenceId,
      });
      renderer.current = mounted;
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
      if (renderer.current === mounted) renderer.current = null;
      mounted?.destroy();
      refusal?.remove();
    };
  }, [topology, probe, sentenceId]);

  /**
   * **The redraw-without-remount channel, kept apart from the mount effect
   * above on purpose** (Task 6.3.2) — see {@link MarketTopologyProps.bands}.
   * A no-op while nothing is mounted (`renderer.current` is `null` in every
   * state but `loaded`), same shape as `resetView`'s own no-op contract.
   *
   * **`undefined` skips the call entirely, rather than defaulting to an
   * empty map — the meaning tightened at Task 6.3.3.** An empty map and "no
   * call" draw the same picture at MOUNT, where the renderer's own default
   * is already `normal` for everyone — but they stop agreeing once a real
   * batch has been applied: calling `setBands(new Map())` on every
   * prop-identity render would silently revert whatever was drawn back to
   * `normal`, which is the exact "blanked on a quiet frame" defect AC 5
   * forbids. Harmless for this prop specifically (the real route does not
   * use it — see {@link MarketTopologyProps.bands}'s own note), but the
   * contract is written for whatever calls this prop next.
   */
  useEffect(() => {
    if (bands === undefined || topology === null) return;
    applyAnomalyBands(renderer, sentence, topology.graph, bands);
  }, [bands, topology]);

  if (universe.state === "loading") {
    return (
      <div className={styles.frame}>
        {waited ? (
          <p className={styles.absence}>Reading the tracked universe.</p>
        ) : undefined}
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

  if (topology === null) {
    // **Unreachable rather than asserted away.** Every earlier `return`
    // covers every state `universe` can hold other than `loaded`, which is
    // the only one `topology` is non-null for — so this never actually
    // renders, and it is here so the type this function returns is proven
    // rather than cast past.
    return null;
  }

  return (
    <div className={styles.frame} ref={frame} data-topology="canvas">
      {/*
       * **The drawn graph's text equivalent** (Task 6.2.4, Story 6.1's
       * acceptance criterion 7 arriving at the one state that needed it
       * last).
       */}
      <p id={sentenceId} ref={sentence} className={styles.drawnSentence}>
        {topologyDrawnSentence(topology.graph)}
      </p>
    </div>
  );
}

/**
 * What this region says to a screen reader once the graph is drawn — a
 * canvas has no accessible content of its own, so this is the ONLY account
 * of it one gets (Task 6.2.4, Story 6.1's acceptance criterion 7).
 *
 * **Settled at this story's Gate 1, verbatim** (`STORY.md`'s Design work):
 * states no count another surface already owns (`516` lives in
 * `measured-set.ts`) and names no ticker — 501 symbols in a hidden paragraph
 * is a wall, not a fallback. The sector count is read off the real graph
 * rather than hard-coded a second place, so a curation change that ever
 * altered it would move this sentence with it.
 *
 * **The "nothing in it is a measurement" clause is gone, false since Task
 * 6.3.3.** Every equity's own ring is a measurement now — the clause this
 * docblock is attached to said otherwise while it was still true, before
 * this story wired a real band to a real node. The minimal correct
 * replacement is below; the band vocabulary and counts a full rewrite would
 * add are deliberately NOT here — Task 6.3.4 owns the accessible account,
 * this task only removed what had gone false.
 *
 * **"No live region" is ALSO no longer the true half of that trigger's own
 * condition, and the decision itself is left to Task 6.3.4 rather than
 * retaken here.** The picture is no longer static for the page's lifetime —
 * `setBands` redraws it on a live batch via `MarketTopologyHandle`, outside
 * React state entirely — which is exactly the reversal trigger this
 * docblock named in advance: *the first change to this region a reader must
 * be told about without having asked*. It has fired. Whether that change
 * should be spoken, and how often, given this sentence's own 25-word
 * pacing precedent elsewhere in this product, is a judgement call about a
 * **word**, which is 6.3.4's brief by name — not a consequence of removing
 * one false clause from a sentence that still needs to exist either way.
 */
function topologyDrawnSentence(graph: TopologyGraph): string {
  return (
    `A graph of every security we track, grouped into ${String(graph.clusters.length)} sectors ` +
    `around their benchmark ETFs, with the broad market at the centre.`
  );
}

/**
 * The structural sentence above, extended with the anomaly encoding — the
 * sentence a batch's `setBands` call writes in place of the initial one
 * (Task 6.3.4).
 *
 * **One of two branches, never a third.** `treatments` is built by exactly
 * two producers (`topology/anomaly-treatments.ts`): `anomalyTreatmentsFromWire`
 * never writes `"unscored"`, and `unscoredAnomalyTreatments` writes nothing
 * else — so one entry being `"unscored"` means every entry is, and the
 * branch below reads the first value it finds as the whole population's
 * answer rather than walking every one to confirm it.
 *
 * **States `high`/`extreme` counts only** (STORY.md's Work item 3) — the two
 * bands that answer *where is it clustering*, never `elevated`'s count
 * (which is usually close to half the scored universe, STORY.md note 2, and
 * would read as an alarm) and never the ten named securities, which
 * `Unusual activity` already owns (ADR 0029's one-fact-one-home rule, point
 * 4). **Never a raw score** (AC 8) — only counts and band words.
 */
function topologyAnomalySentence(
  graph: TopologyGraph,
  treatments: ReadonlyMap<Ticker, TopologyAnomalyTreatment>,
): string {
  const structure = topologyDrawnSentence(graph);

  const nothingScored = [...treatments.values()].some(
    (treatment) => treatment === "unscored",
  );

  if (nothingScored) {
    // **Distinct wording from "the structure is drawn but nothing is scored
    // yet"** (STORY.md's Work item 5) — "unscored" rather than "calm" is
    // AC 4's own distinction, restated here in a sentence rather than only
    // in a ring.
    return (
      `${structure} Nothing has been scored yet, so no security is drawn as ` +
      `calm — every one is unscored.`
    );
  }

  let high = 0;
  let extreme = 0;

  for (const treatment of treatments.values()) {
    if (treatment === "high") high += 1;
    else if (treatment === "extreme") extreme += 1;
  }

  return (
    `${structure} Each equity also carries how unusual its recent behaviour ` +
    `is, on a four-band scale from normal through elevated and high to ` +
    `extreme. ${String(high)} are high and ${String(extreme)} are extreme. ` +
    `The ten most unusual are named in Unusual activity.`
  );
}

/**
 * Redraws the renderer AND the accessible sentence together, from one
 * treatment map (Task 6.3.4) — the two callers of
 * `TopologyRenderer.setBands` ({@link MarketTopologyHandle.setBands} and the
 * `bands` prop's own effect) share this rather than each updating the
 * renderer and leaving the sentence to go stale.
 *
 * **A plain function taking its refs as arguments, not a closure held in
 * component state** — so neither caller risks reading a stale `graph` from
 * a `useImperativeHandle` factory whose own deps did not include it.
 *
 * **Mutates `sentence.current.textContent` directly, deliberately
 * outside React's reconciliation of that node's children.** This is safe
 * BECAUSE it is not fighting React: the `<p>`'s declared children
 * (`{topologyDrawnSentence(topology.graph)}`) are a pure function of a
 * value that is stable across re-renders, so React's own diff never finds
 * a reason to touch this node again after the first commit — there is
 * nothing to overwrite. The pattern breaks only if a future change makes
 * that JSX expression itself reactive; if it does, this comment is the
 * warning.
 */
function applyAnomalyBands(
  renderer: RefObject<TopologyRenderer | null>,
  sentence: RefObject<HTMLParagraphElement | null>,
  graph: TopologyGraph,
  treatments: ReadonlyMap<Ticker, TopologyAnomalyTreatment>,
): void {
  renderer.current?.setBands(treatments);

  if (sentence.current !== null) {
    sentence.current.textContent = topologyAnomalySentence(graph, treatments);
  }
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
