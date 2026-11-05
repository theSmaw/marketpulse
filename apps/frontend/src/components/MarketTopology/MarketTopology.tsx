import { useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import type { Ref, RefObject } from "react";
import { Link } from "react-router";

import { SECTOR_LABELS } from "@marketpulse/shared";
import type { Ticker, TopologyGraph } from "@marketpulse/shared";

import { cx } from "../../cx.js";
import { securityPath } from "../../routes/paths.js";
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
  TopologyHoverTarget,
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
   *
   * **It does not clear a selection** (Task 6.4.2, and this docblock predates
   * selection existing). It resets pan and zoom and nothing else: the control
   * is named for the **view**, and Gate 1's decision keeps clearing a selection
   * to `Escape` (Task 6.4.3) and to clicking empty canvas. A reader who has
   * selected a security and then lost the market is asking for the market back;
   * silently forgetting their security besides is a second act they did not
   * request, and it would take the plate's one anchor away with it.
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
  /**
   * The readout plate (Task 6.4.1) — **a ref rather than state, which is this
   * task's whole constraint.** Hover changes at pointer-move cadence; the
   * renderer reports it through `onHover` and {@link writeTopologyReadout}
   * writes this element's text content directly, so nothing in this component
   * re-renders when a reader moves the pointer across 516 nodes.
   */
  const plate = useRef<HTMLDivElement>(null);

  /**
   * **The one piece of this surface's interaction state that reaches React,
   * and the reason is that only React can render an `<a>`** (Task 6.4.2).
   *
   * A Canvas2D node has no DOM element of its own, so it cannot hold a
   * `<Link>`, and 516 overlay anchors would trip `CLAUDE.md`'s named Epic 14
   * condition — *the first surface on `/` that renders one element per tracked
   * security*, priced at ≈48 ms of added frame — besides being the wrong shape.
   * The resolution needs **no change** to
   * `one-home-for-imperative-navigation`: **one** anchor, the readout plate's
   * ticker, whose `href` is resolved at render from the selected symbol's own
   * identity. No `navigate()` exists anywhere in the topology's code.
   *
   * **It holds the symbol the plate is currently OFFERING to open, which is
   * the selected symbol exactly when the plate is showing it** — see
   * {@link topologyOpenableSymbol}. It is `null` both when nothing is selected
   * and when the pointer is reading a *different* node, because in that second
   * state the plate's ticker line says `AAPL` while the selection is `NVDA`,
   * and an anchor there would be a destination the reader cannot see. Holding
   * the bare selection instead and conditioning the anchor on it was the first
   * implementation and `MarketTopology.test.tsx` refused it.
   *
   * **A symbol rather than a node**, because `securityPath` is all this is for;
   * the renderer keeps the drawable node it needs to draw the ground disc.
   *
   * **It changes on a click, and on the pointer crossing the selected node's
   * own edge — never at pointer-move cadence.** Hover itself stays a ref
   * (below) and {@link show} writes this only when the answer actually changes,
   * so a reader sweeping the pointer across 516 nodes with something selected
   * re-renders this component at most twice: once entering the selected node,
   * once leaving it. Story 6.2's declined `React.memo` boundary is argued from
   * **feed** cadence, which this is not — the mount effect's deps are still
   * exactly `[topology, probe, sentenceId]`.
   */
  const [openable, setOpenable] = useState<Ticker | null>(null);

  /**
   * **What the plate is CURRENTLY showing, as two refs rather than one**
   * (Task 6.4.2).
   *
   * The plate shows whichever is relevant: the hovered node if one is hovered,
   * otherwise the selected node, otherwise the idle instruction — so the writer
   * needs both and `hovered ?? chosen` is that rule, written once, in
   * {@link show} below.
   *
   * **Refs rather than state for both.** Hover changes at pointer-move cadence,
   * which is Task 6.4.1's whole constraint; and `chosen` holds the node and the
   * band a *sentence* is built from, which is a different fact from the symbol
   * an `href` is built from — deriving one from the other would mean looking the
   * node and its current band back up by symbol, which is exactly the second
   * copy of the band map `TopologyHoverTarget`'s own docblock refuses. Both are
   * written by {@link show}'s two callers and nowhere else, so they cannot
   * disagree.
   *
   * `offered` mirrors {@link openable} so that {@link show} — which lives in the
   * mount effect's closure and would capture the FIRST render's state value
   * for ever — can tell a real change from a repeat without reading state at
   * all.
   */
  const hovered = useRef<TopologyHoverTarget | null>(null);
  const chosen = useRef<TopologyHoverTarget | null>(null);
  const offered = useRef<Ticker | null>(null);

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

    /**
     * **Draw the plate from whichever of the two states is relevant** — the
     * hovered node, else the selection, else the idle instruction (Task
     * 6.4.2).
     *
     * The pointer leaving a node no longer returns the plate to the idle
     * instruction when something is selected; it returns it to the
     * **selection**. That is what makes the anchor's destination and the
     * plate's displayed ticker the same string by construction rather than by
     * agreement — and it is why `TOPOLOGY_READOUT_IDLE` is still reachable
     * only when there is genuinely nothing to say.
     *
     * `setOpenable` is called **only when the answer changes**, compared
     * against `offered` rather than against state: this function lives in the
     * effect's closure, so reading `openable` here would read the first
     * render's value for ever.
     */
    const show = (): void => {
      writeTopologyReadout(plate.current, hovered.current ?? chosen.current);

      const next = topologyOpenableSymbol(hovered.current, chosen.current);
      if (next === offered.current) return;

      offered.current = next;
      setOpenable(next);
    };

    try {
      mounted = mountCanvasTopology(container, {
        graph: topology.graph,
        layout: topology.layout,
        palette: topologyPalette(),
        probe,
        labelledBy: sentenceId,
        /*
         * **The hover channel, and it deliberately adds no effect dependency**
         * (Task 6.4.1). This arrow is created *inside* the effect, so it is not
         * a value the deps array could name; it closes over `plate` (a ref,
         * stable for this component's lifetime) and a module-level function,
         * so there is no stale capture for it to be wrong about either. That
         * is what keeps this effect's deps exactly
         * `[topology, probe, sentenceId]` — the list Story 6.2's declined
         * `React.memo` boundary is argued from, this file's own module
         * docblock.
         */
        /*
         * **One function behind both channels** (Task 6.4.2), because *what
         * the plate shows* is one rule over two inputs and writing it twice is
         * how the hovered line and the anchor's destination would come to
         * disagree. Declared inside the effect for `onHover`'s own reason — it
         * closes over four refs, two module-level functions and `setOpenable`,
         * whose identity `useState` guarantees is stable, so it adds no
         * dependency and the deps stay `[topology, probe, sentenceId]`.
         */
        onHover: (hoveredTarget) => {
          hovered.current = hoveredTarget;
          show();
        },
        /*
         * **The selection channel, and the one place a pointer event on this
         * canvas reaches React state at all** (Task 6.4.2).
         */
        onSelect: (selectedTarget) => {
          chosen.current = selectedTarget;
          show();
        },
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
      // **A new renderer starts with nothing hovered and nothing selected**
      // (Task 6.4.2), so these have to go with it. This effect re-runs only on
      // `topology` identity — a retry that lands a fresh universe — and the
      // symbol selected in the old graph may not be in the new one, which
      // would leave the anchor pointing at a security the picture no longer
      // draws.
      //
      // **`setOpenable(null)` IS called here, found owed on review.** The
      // first draft argued it didn't need to be — that `openable`'s own
      // `useEffect` below would re-read it from a new `topology` anyway — and
      // that effect is keyed on `[openable]`, which does not change just
      // because `topology` did: nulling these three refs updates nothing a
      // re-render would see. Without this line the plate keeps the OLD
      // ticker's text and the OLD symbol's `<Link>` live until the next
      // hover, which is exactly CLAUDE.md's own "a claim about a mechanism
      // reads identically whether the mechanism is there or not." A state
      // write from a cleanup is ordinary React — it schedules a re-render of
      // a still-mounted component — and the React Compiler's own rules raise
      // nothing on it.
      hovered.current = null;
      chosen.current = null;
      offered.current = null;
      setOpenable(null);
    };
  }, [topology, probe, sentenceId]);

  /**
   * **Re-write the plate after React has committed a changed selection** (Task
   * 6.4.2) — and it is load-bearing rather than belt-and-braces.
   *
   * The ticker slot is a `<span>` while nothing is selected and a `<Link>`
   * once something is, so `selected` going from `null` to a symbol makes React
   * **replace that element** — and the `textContent` the `onSelect` callback
   * had just written lands on the node being thrown away. Writing again here,
   * after the commit, is what fills the fresh one.
   *
   * It reads the refs rather than `selected` so there is one rule for what the
   * plate shows (`hovered ?? chosen`) and not a second, nearly-identical one.
   * Idempotent with the synchronous write in the callback: both put the same
   * four strings in the same four slots.
   */
  useEffect(() => {
    writeTopologyReadout(plate.current, hovered.current ?? chosen.current);
  }, [openable]);

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
      {/*
       * **The readout plate — a real DOM element, sibling to the canvas, never
       * painted into it** (Task 6.4.1, and this component's own standing rule:
       * painted text is unreachable by a screen reader, unassertable below a
       * browser and invisible to `overview-degraded-grid.spec.ts`).
       *
       * **Every line is declared here and empty, and filled imperatively.**
       * The children React owns are a constant (nothing), so React's own diff
       * never finds a reason to touch these nodes again after the first
       * commit — exactly the condition `applyAnomalyBands` relies on for the
       * accessible sentence, and the same warning applies: if a future change
       * makes any of these JSX children reactive, this is where it breaks.
       *
       * **`data-readout` rather than a class for each line**, because a
       * browser spec cannot import a CSS module's hashed class names and the
       * four facts are exactly what Done-when 6 asserts.
       *
       * **Five reserved line slots in every state** (`grid-template-rows` in
       * the stylesheet): the ticker, **two** for the name, the sector, and the
       * band — with the idle instruction spanning all five. The second name
       * slot is empty for every name in today's universe (measured; the
       * stylesheet carries the figures and why it is kept anyway). So the
       * plate is one height whatever is in it, which is `Movers`' held-row
       * lesson — a region that changes height steps the whole lower page —
       * carried from rows to lines.
       */}
      <div className={styles.readout} ref={plate} data-topology-readout="idle">
        <p className={styles.readoutIdle} data-readout="idle">
          {TOPOLOGY_READOUT_IDLE}
        </p>
        {/*
         * **The one activatable thing on this surface, and it is an anchor
         * exactly when the ticker on screen IS the selected one** (Task
         * 6.4.2).
         *
         * The plate shows the hovered node if one is hovered and the selection
         * otherwise, so the two cases this condition separates are:
         *
         *   * **hovering the selected node, or nothing hovered with something
         *     selected** — the displayed ticker and the selected ticker are the
         *     same string, and the anchor's destination is what is on screen;
         *   * **hovering an unselected node, or idle with nothing selected** —
         *     plain text, as Task 6.4.1 built it.
         *
         * Which is to say the anchor's `href` and the plate's own ticker line
         * are identical **by construction**: there is no state in which this
         * surface offers to open something other than the thing it is naming.
         * The alternative — an anchor that persists while the plate reads a
         * different node under the pointer — is this screen's own *the figure
         * is never the link* rule broken from the other side: a destination a
         * reader cannot see.
         *
         * **`<Link>` rather than `<a>`**, which is `RankedList`'s precedent and
         * this application's convention for an internal route: a bare `<a>` is
         * a document load that throws the whole SPA away.
         *
         * **No children declared on either branch**, which is the plate's own
         * standing condition — the text is written imperatively, and React's
         * diff must never have a reason to touch these nodes. The effect above
         * is what refills the element React replaces when this condition flips.
         */}
        {openable === null ? (
          <span className={cx(styles.readoutTicker)} data-readout="ticker" />
        ) : (
          <Link
            to={securityPath(openable)}
            className={cx(styles.readoutTicker, styles.readoutTickerLink)}
            data-readout="ticker"
            /*
             * **What a browser spec reads this anchor's identity off**, the
             * same attribute and for the same reason `RankedList`'s rows carry
             * one: the accessible name is the bare ticker, written as text
             * content, and an attribute is what can be asserted without
             * depending on the write having landed.
             */
            data-ticker={openable}
          />
        )}
        <span className={styles.readoutName} data-readout="name" />
        <span className={styles.readoutSector} data-readout="sector" />
        <span className={styles.readoutBand} data-readout="band" />
      </div>
    </div>
  );
}

/**
 * What the plate says when the pointer is over nothing (Task 6.4.1).
 *
 * **Deliberately silent about the keyboard**, though the design canvas
 * (`Hover, select, and the way out.dc.html`) and this task's own brief both
 * spell a sentence naming one. That route does not exist until Task 6.4.3
 * wires arrow-key traversal — "a claim about a mechanism reads identically
 * whether the mechanism is there or not" is this repository's own rule, and
 * a hint naming a key that does nothing is exactly that claim. Task 6.4.3
 * widens this string once `Tab` and the arrow keys actually walk the graph;
 * until then it names only what is true.
 */
const TOPOLOGY_READOUT_IDLE = "Point at a security to see what it is.";

/**
 * **Which symbol, if any, the plate is currently offering to OPEN** (Task
 * 6.4.2) — the whole of the one-anchor rule, as a pure function.
 *
 * The plate shows the hovered node if one is hovered and the selection
 * otherwise, and the ticker is a real anchor **exactly when the shown symbol
 * is the selected symbol**. So there are three answers and two of them are
 * `null`:
 *
 *   * nothing selected — nothing to open, whatever the pointer is reading;
 *   * something selected and the pointer reading a DIFFERENT node — the plate's
 *     ticker line says `AAPL` while the selection is `NVDA`, and an anchor
 *     there would be a destination the reader cannot see. This screen's own
 *     *the figure is never the link* rule, broken from the other side;
 *   * something selected and either nothing hovered or the selected node
 *     hovered — the displayed ticker and the destination are one string.
 *
 * **Stated as a function so that the property is provable rather than
 * inspectable.** `MarketTopology.test.tsx` asserts the third case directly,
 * which is the one a reader meets most: a selection outlives the pointer, so
 * *nothing hovered with something selected* is the state this surface sits in
 * between acts.
 *
 * Compared **by symbol** rather than by object identity: the renderer calls
 * `onSelect` again with a fresh target for the same node when a live `setBands`
 * changes its band, and so does `onHover`.
 */
export function topologyOpenableSymbol(
  hovered: TopologyHoverTarget | null,
  chosen: TopologyHoverTarget | null,
): Ticker | null {
  if (chosen === null) return null;
  if (hovered !== null && hovered.node.symbol !== chosen.node.symbol)
    return null;

  return chosen.node.symbol;
}

/**
 * The four lines the plate draws for one hovered node — **the whole of this
 * task's vocabulary, in one pure function** (Task 6.4.1).
 *
 * Exported so `MarketTopology.test.tsx` can assert the words without a canvas:
 * jsdom has no 2d context, so the renderer that produces a
 * {@link TopologyHoverTarget} is unreachable below `pnpm e2e`, and the
 * vocabulary is the half of this that is checkable here.
 *
 * **No join, anywhere.** `symbol` and `label` are already on `TopologyNode`
 * (Story 6.1 put them there for exactly this); the sector reads
 * `SECTOR_LABELS` directly, never a string transform of the slug, because
 * `"Health Care"` and `"Healthcare"` are the same slug and different words and
 * a transform picks one silently (`security.ts`'s own note). The band is the
 * treatment the renderer already computed and is never re-derived from a score
 * here — there is no score on this surface to re-derive one from.
 *
 * **An empty string is a line that does not draw**, never a placeholder: the
 * four market proxies have `cluster === null`, which is a complete answer
 * (*an index proxy does not belong to a sector*) rather than a missing one, so
 * the sector slot is blank rather than carrying a dash or the word *none*. The
 * slot's room is still reserved, which is the stylesheet's job and not this
 * function's.
 */
export function topologyReadoutLines(hovered: TopologyHoverTarget): {
  readonly ticker: string;
  readonly name: string;
  readonly sector: string;
  readonly band: string;
} {
  const { node, treatment } = hovered;

  return {
    ticker: node.symbol,
    name: node.label,
    sector: node.cluster === null ? "" : SECTOR_LABELS[node.cluster],
    band: topologyReadoutBand(node.kind, treatment),
  };
}

/**
 * The band line, and the two absences that are **not** the same absence (Task
 * 6.4.1, Done-when 3).
 *
 * - The **fifteen landmark nodes** — the eleven sector SPDRs and the four
 *   market proxies — carry no band at all. Gate 1's Decision 3 excludes them
 *   from the anomaly encoding entirely, so drawing `"unscored"` here would
 *   claim a failed attempt to score something **nobody tried to score**. The
 *   sentence says which: `Benchmarks are not scored`.
 * - An **equity** with no score draws `Not scored yet` — a stated absence, and
 *   never a blank line and never read as `normal`. This is CI's permanent
 *   state (no bars, no provider, no composite generation) and every
 *   deployment's first ~46 seconds, so it is the most-drawn line on this
 *   surface rather than an edge case.
 *
 * Otherwise it is the band **word itself**, verbatim and lower case, exactly as
 * `AnomalyBadge` renders it — one vocabulary for one scale, so a reader meeting
 * `elevated` on a node and `elevated` in `Unusual activity`'s heading is
 * meeting one word.
 */
function topologyReadoutBand(
  kind: TopologyHoverTarget["node"]["kind"],
  treatment: TopologyAnomalyTreatment | null,
): string {
  if (kind !== "equity") return "Benchmarks are not scored";
  if (treatment === null || treatment === "unscored") return "Not scored yet";

  return treatment;
}

/**
 * Write one hovered node — or the idle instruction — into the plate (Task
 * 6.4.1).
 *
 * **Module-level and taking the element as an argument**, for
 * `applyAnomalyBands`' own reason: the arrow the mount effect passes as
 * `onHover` then closes over a ref and this function and nothing else, so it
 * adds no dependency to an effect whose deps list is load-bearing.
 *
 * **`textContent`, outside React's reconciliation**, and the condition that
 * makes it safe is in the plate's own JSX comment: the nodes written to here
 * have no React-declared children to overwrite.
 *
 * The `data-topology-readout` attribute carries the state rather than a class,
 * so the stylesheet switches between the instruction and the four facts on one
 * attribute and a browser spec can read which state the plate is in without
 * knowing a hashed class name.
 */
function writeTopologyReadout(
  plate: HTMLElement | null,
  hovered: TopologyHoverTarget | null,
): void {
  if (plate === null) return;

  plate.dataset.topologyReadout = hovered === null ? "idle" : "reading";

  const lines =
    hovered === null
      ? { ticker: "", name: "", sector: "", band: "" }
      : topologyReadoutLines(hovered);

  for (const [field, value] of Object.entries(lines)) {
    const line = plate.querySelector(`[data-readout="${field}"]`);
    if (line !== null) line.textContent = value;
  }
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
