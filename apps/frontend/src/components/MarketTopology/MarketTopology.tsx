import { useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import type { Ref, RefObject } from "react";
import { Link } from "react-router";

import { SECTOR_LABELS } from "@marketpulse/shared";
import type {
  Ticker,
  TopologyCorrelation,
  TopologyGraph,
} from "@marketpulse/shared";

import { cx } from "../../cx.js";
import { securityPath } from "../../routes/paths.js";
import type { RelationshipsView } from "../../use-relationships.js";
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
//
// **Evaluated a THIRD time, and it did NOT fire, when Task 6.7.2 wired the
// graph-level live-update mark.** The shape most likely to have fired it —
// a boolean or a timestamp prop the route flips on every burst — is exactly
// what was declined: `markBurst()` is a method on `MarketTopologyHandle`,
// reached the same way `setBands` already is, called from
// `MarketOverview.tsx`'s own effect watching `liveFeed.observations`. The
// mount effect's deps are still `[topology, probe, sentenceId]`, and this
// component takes no prop that changes at feed cadence even now that it
// draws a mark on every live batch. `MarketTopology.test.tsx`'s own
// producer-side account (interleaving `setBands` and `markBurst` calls
// across repeated re-renders) is where this is held.

export interface MarketTopologyProps {
  /** The universe, in whichever state `use-securities.ts` has it. */
  readonly universe: SecuritiesView;

  /**
   * Which securities move together, in whichever state
   * `use-relationships.ts` has it (Task 6.5.2).
   *
   * **A second, independent request, and the whole point is that this one
   * failing changes no ink.** The graph is built from {@link universe} and the
   * measured edges are merged into it, so `loading`, `never-measured` and
   * `failed` all draw the picture this region drew before Story 6.5 existed —
   * byte for byte, nodes and membership edges and all. What differs between
   * the four states is **one clause of the accessible sentence**, which is
   * where this region says which of them it is in.
   *
   * That is `PRODUCT_SPEC.md` §36's degrade-locally rule arriving inside one
   * region for the first time. Until this prop existed, this region had
   * exactly one failure state — *the universe request itself failed* — and it
   * blanked the whole graph, correctly, because the universe **is** its
   * subject. A missing measurement is not.
   *
   * **Required rather than optional**, which is {@link onRetry}'s own
   * precedent and the stronger contract by one failure mode: an omitted prop
   * would draw an edge-less graph that says nothing about why, and *nobody
   * asked* and *nothing was measured* are not the same claim.
   */
  readonly relationships: RelationshipsView;

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

  /**
   * Play the graph-level live-update mark, decaying (Task 6.7.2, Open
   * Decision 1) — `TopologyRenderer.markBurst`, reached imperatively for
   * `setBands`'s exact reason: the route calls this from its own effect,
   * watching the live feed's observations for a real arrival, and that is
   * not a value this component could re-derive from its own props — this
   * component takes no prop that changes at feed cadence at all, and a new
   * one for this alone would reopen the declined `React.memo` boundary this
   * file's own module docblock argues for.
   *
   * **A no-op while nothing is mounted**, same contract as `resetView` and
   * `setBands`.
   */
  markBurst(): void;
}

export function MarketTopology({
  universe,
  relationships,
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
   * **The announcement region — a SECOND element, never a write into the
   * sentence `applyAnomalyBands` already owns** (Task 6.4.4).
   *
   * This is the live-region reversal trigger — *the first change to this
   * region a reader must be told about without having asked* — firing a
   * second time, and the answer was settled in advance by Story 6.3's own
   * close: a new node. Two imperative writers on one paragraph is precisely
   * the collision {@link applyAnomalyBands}' safety argument depends on not
   * happening, and the two strings are two different claims anyway — that one
   * is *what the graph is*, reached through `aria-labelledby` by a reader who
   * went looking; this one is *what just changed*, spoken at a reader who did
   * not.
   *
   * **Written imperatively, like the plate and for the same reason.**
   * `onSelect` is called by the renderer on every live `setBands` as well as
   * on a real selection (source `"band"`), so routing this through `useState`
   * would put a render at feed cadence on the one region that has never taken
   * one. A live region announces on a DOM mutation whoever made it; React is
   * not involved either way.
   */
  const announcement = useRef<HTMLParagraphElement>(null);

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

  /**
   * **The one anchor's own element, and why this component has to hold it**
   * (Task 6.4.3).
   *
   * A keyboard reader walking the graph has to end up with DOM focus on the
   * thing they can activate, because that is what makes `Enter` the browser's
   * own native activation of an `<a href>` rather than something this product
   * would have to implement — and
   * `one-home-for-imperative-navigation` is a check over every shipped source
   * file in three trees, so "something this product would have to implement"
   * means a `navigate()` call that check refuses by name. The anchor is
   * rendered here, so the focus call is here.
   */
  const anchor = useRef<HTMLAnchorElement>(null);

  /**
   * **Whether a KEY moved the selection last** — the one bit that decides
   * whether focus follows it (Task 6.4.3).
   *
   * A pointer selection must not move focus: the reader's hand is already
   * where they want it, and pulling the page's focus ring into the plate is a
   * second thing happening for a gesture that asked for one. A keyboard
   * selection must, or `Enter` has nothing to act on.
   *
   * `"band"` — the renderer re-reporting the same node because a live
   * `setBands` changed its word — leaves this alone rather than clearing it,
   * which is the state it describes: a batch arriving on a socket is not the
   * reader changing input device.
   */
  const keyboardSelection = useRef(false);

  /**
   * **Whether the one anchor is the thing currently holding DOM focus** — the
   * bit that makes the focus recovery below precise rather than a grab (Task
   * 6.4.4).
   *
   * Set when {@link anchor} is actually focused and consulted on the way out.
   * Without it the recovery cannot tell *the reader's focus was on the element
   * we just removed* from *nothing was focused at all*, and a pointer-only
   * reader — who never had focus in this region and must not be given it,
   * Task 6.4.3's own rule — would get a focus ring from a mouse gesture.
   *
   * A reader who tabs away themselves leaves this `true` and is unaffected,
   * because the recovery's second condition is that **nobody** holds focus.
   */
  const anchorHeldFocus = useRef(false);

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
  const topology =
    securities === null
      ? null
      : topologySource(securities, measuredPairs(relationships));

  /**
   * **One clause about the measured edges, built at render and read by BOTH
   * writers of the accessible sentence** (Task 6.5.2).
   *
   * The sentence has two authors: this component's own JSX, and
   * {@link applyAnomalyBands}, which overwrites `textContent` imperatively on
   * every live band update. **So a clause that only one of them knew about
   * would be deleted by the other** — the band write would drop it on the
   * next batch, 6.8–16.1 times a minute. Passing it to both is what keeps
   * them from clobbering each other, and it is why this is a string computed
   * here rather than a second imperative writer: there is no live update to
   * this picture's edge layer at all (Story 6.7 owns that), so the clause is
   * **static for the page's lifetime** once the measurement has settled.
   *
   * It is also why React touching this node again is not a problem it would
   * otherwise be: the paragraph's declared children change exactly once, when
   * the measurement settles — and `topology`'s own identity changes in the
   * same render, which re-runs the mount effect and starts the renderer fresh
   * with no bands applied. So the two writers are never out of step: either
   * React has just written `structure + clause` over a freshly mounted canvas
   * with no band to lose, or a batch has written `structure + bands + clause`
   * and React has no reason to touch the node again.
   */
  const correlationClause = topologyCorrelationClause(
    topology?.graph ?? null,
    relationships,
  );

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
        applyAnomalyBands(
          renderer,
          sentence,
          topology.graph,
          treatments,
          correlationClause,
        );
      },
      markBurst: () => renderer.current?.markBurst(),
    }),
    // **`correlationClause` joins `topology` here** (Task 6.5.2): the band
    // write composes the sentence and would otherwise close over the clause
    // this component held when the handle was last made. It is a **string**,
    // so the dependency compares by value and the handle is recreated exactly
    // once — when the measurement settles — rather than on every render.
    [topology, correlationClause],
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

    /*
     * **The announcement element, copied out of its ref for the cleanup**
     * (Task 6.4.4) — `react-hooks/exhaustive-deps`' own instruction, and it is
     * the right one here for a reason worth stating: the `<p>` is rendered
     * unconditionally and is never unmounted, so the node this holds at the
     * end of the effect's life is the same node it held at the start. The rule
     * is guarding against a ref whose target React has replaced, which this
     * one structurally cannot have — but a local is free and the lint rule is
     * at `--max-warnings 0`.
     */
    const live = announcement.current;

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
        describedBy: keyHintIdFor(sentenceId),
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
        onSelect: (selectedTarget, source) => {
          chosen.current = selectedTarget;
          // **The device, remembered rather than acted on here** (Task
          // 6.4.3). Focus can only be moved once React has rendered the
          // anchor this selection makes openable, which is the effect below;
          // calling `focus()` from here would reach the element React is
          // about to replace.
          /*
           * **`"band"` is not a selection change, and this is the one guard
           * that keeps a socket from speaking** (Task 6.4.4).
           *
           * `renderer-canvas.ts` re-reports the already-selected node with
           * source `"band"` after every `setBands`, so the plate's band word
           * does not go stale against the ring beside it. The node is the
           * same node and the reader did nothing — announcing there would
           * mean a feed batch, 6.8–16.1 of them a minute, interrupting a
           * listener who had asked for nothing, which is the whole of the
           * discipline this region has kept since Story 6.2.
           *
           * **Both facts inside one guard because they are one fact**: this
           * call either is a real selection change (so remember the device
           * and say so) or it is a redraw of the current one (so neither).
           * `setSelectedNode` early-returns when the node is unchanged, so
           * every call that reaches here with a pointer or a key source is a
           * node the reader actually moved to — there is no repeat to
           * de-duplicate.
           */
          if (source !== "band") {
            keyboardSelection.current = source === "keyboard";
            writeTopologyAnnouncement(announcement.current, selectedTarget);
          }
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
      // **Emptied rather than announced** (Task 6.4.4). The selection is
      // genuinely gone — a fresh universe may not even contain the symbol —
      // so leaving the old sentence in the accessibility tree would be a
      // stale claim, for `setOpenable(null)`'s own reason one line up. But a
      // retried `GET /securities` is not the reader clearing anything, and
      // `Selection cleared.` here would be this region speaking at a listener
      // about a request they never made. An empty live region has nothing to
      // say, which is the correct amount.
      if (live !== null) live.textContent = "";
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

    // **Focus follows a KEYBOARD selection onto the one anchor** (Task
    // 6.4.3) — the roving-stop idea `RankedList` already uses, with one
    // physical element rather than one per row, and the reason it is here is
    // `Enter`: with focus on a real `<a href>` resolved at render from the
    // selected symbol's own identity, activation is the browser's and this
    // region's code contains no navigation call at all.
    //
    // **After the commit, not in the callback**, for the same reason the
    // write above is here: `openable` going from `null` to a symbol makes
    // React REPLACE the ticker element, so a `focus()` in the `onSelect`
    // callback lands on the node being thrown away.
    //
    // It deliberately does not fire when `openable` is `null`: that is
    // `Escape` (where the renderer has already put focus on the canvas) or a
    // fresh universe (where focus is wherever the reader left it and moving
    // it would be this component taking focus for a request nobody made).
    //
    // **Known asymmetry, routed rather than fixed here** (`docs/GAPS.md`,
    // Task 6.4.4's close): this guard asks only "was the last selection made
    // by a key", never "is focus still somewhere that cares" — so a reader
    // who has since `Tab`bed to an unrelated control, then rests a real
    // pointer near the graph (an ordinary mouse movement, no key pressed),
    // can have focus pulled back here. `keyboardSelection` has no path that
    // clears it short of a fresh pointer selection.
    if (openable !== null && keyboardSelection.current) {
      anchor.current?.focus();
      anchorHeldFocus.current = anchor.current !== null;
      return;
    }

    /*
     * **The reader is put back on the canvas when the anchor is removed from
     * under them** (Task 6.4.4), and this is a REPAIR rather than a new
     * feature — see this task's record and the component test that found it.
     *
     * Task 6.4.3's `Escape` handler says, in as many words, that an element
     * removed while it holds focus drops focus to the body *"which is the
     * state `Region`'s own backstop catches by focusing its `<section>`"*.
     * **It does not.** `Region`'s recovery is a `useLayoutEffect` on
     * `Region`, and the anchor's removal happens in a commit `Region` does
     * not participate in — `openable` is this component's own state, so the
     * re-render that replaces the `<a>` with a `<span>` re-renders this
     * subtree alone and that effect never runs again. Measured: focus lands
     * on `<body>`, which is CLAUDE.md's own named trap — a claim about a
     * mechanism reads identically whether the mechanism is there or not.
     *
     * **And the reachable gesture is not `Escape` at all.** That path was
     * already covered, by the renderer focusing the canvas *before* clearing.
     * What was not is `topologyOpenableSymbol` answering `null` because the
     * **pointer crossed a different node** while a keyboard reader held the
     * anchor: the plate's ticker is then naming a node that is not the
     * selection, the anchor must go (a destination the reader cannot see),
     * and nothing in that gesture moves focus anywhere. A stray mouse
     * movement over a 998 px canvas lands a keyboard reader on the body.
     *
     * **The canvas rather than the section**, which is the one judgement
     * here: it is where `Escape` already puts them, it is inside the region
     * rather than one level further out than anybody asked to go, and the
     * reader can carry straight on walking with the next arrow key.
     *
     * **Two conditions, and the second is why this is not a focus grab.**
     * `anchorHeldFocus` says the focus that was lost was ours;
     * `activeElement === document.body` says nobody has taken it since. With
     * either one missing this would move focus for a reader who never gave
     * it — which is exactly the shape `Region`'s own three conditions have,
     * arriving one level down, the same way ADR 0039's rejected shape did.
     */
    if (openable === null && anchorHeldFocus.current) {
      anchorHeldFocus.current = false;
      if (document.activeElement === document.body) renderer.current?.focus();
    }
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
    applyAnomalyBands(
      renderer,
      sentence,
      topology.graph,
      bands,
      correlationClause,
    );
  }, [bands, topology, correlationClause]);

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
        {/*
         * **One expression and therefore one text node**, which is the
         * standing condition this paragraph lives under: `applyAnomalyBands`
         * owns `textContent`, so React must have exactly one child here to
         * replace rather than two to reconcile. See
         * {@link correlationClause} for why both writers carry the clause.
         */}
        {`${topologyDrawnSentence(topology.graph)}${correlationClause}`}
      </p>
      {/*
       * **What the keyboard does, attached to the thing a key press can
       * reach** (Task 6.4.3).
       *
       * `ChartReading.tsx`'s shape, and its lesson verbatim: a description on
       * an unfocusable element is a sentence nobody is ever read. The canvas
       * takes `aria-describedby` pointing here and `tabIndex={0}` from the
       * renderer, so this is announced when a reader arrives rather than
       * being a hint on screen nobody needs.
       *
       * **A second element rather than a clause on the sentence above.** That
       * paragraph is the drawn graph's text equivalent and is overwritten
       * imperatively by `applyAnomalyBands` on every live batch — appending
       * the key hints to it would put them inside a string a socket rewrites,
       * and they would survive exactly as long as the next batch took to
       * arrive.
       */}
      <p id={keyHintIdFor(sentenceId)} className={styles.keyHint}>
        {TOPOLOGY_KEY_HINT}
      </p>
      {/*
       * **What this region ANNOUNCES, as against what it says when asked**
       * (Task 6.4.4) — see {@link announcement}'s own docblock for why this is
       * a second element rather than a clause on the sentence above.
       *
       * **`role="status"` and never `alert`**, `ChartReading.tsx`'s precedent:
       * a selection is a fact the reader produced, not an emergency, and
       * `alert` is assertive — it interrupts.
       *
       * **Persistent, never conditionally unmounted, and silent on mount.** A
       * live region a browser only discovers at the moment it is filled is a
       * region many readers never announce at all; the mechanism needs the
       * element to have been in the tree before the text arrived. Which is
       * also why it carries no React-declared children — same standing
       * condition as the plate's own lines and the sentence above: React's
       * diff must never find a reason to touch this node, because
       * {@link writeTopologyAnnouncement} owns its text.
       *
       * **Not a target of `aria-labelledby` or `aria-describedby` from
       * anywhere.** The canvas points at the two paragraphs above it; a label
       * that changed under a reader every time they pressed an arrow key
       * would be a third meaning for one element.
       */}
      <p className={styles.announcement} role="status" ref={announcement} />
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
            ref={anchor}
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
 * ~~**Deliberately silent about the keyboard**~~ — **widened 2026-11-05 by
 * Task 6.4.3, which is the condition the original wording named.** It read
 * `Point at a security to see what it is.` while arrow keys did nothing,
 * because "a claim about a mechanism reads identically whether the mechanism
 * is there or not" and a hint naming a key that does nothing is exactly that
 * claim. The keys now walk the graph, so the sentence says so.
 *
 * **The wording is the design canvas's own, verbatim**, which is the string
 * Task 6.4.1 implemented, caught on review and reverted — `Hover, select, and
 * the way out.dc.html` and that task's own brief both spell `Point at a
 * security, or press Tab and the arrow keys`, and ADR 0026 makes the canvas
 * the source of truth where it is not making a false claim. It was the second
 * part that failed then and is true now.
 *
 * **It names the arrow keys and not `Enter`**, which is the division between
 * this string and {@link TOPOLOGY_KEY_HINT}: this one is drawn on screen in a
 * 288 px plate and is read by somebody who has not pressed anything, so it
 * carries the one thing that gets them started; the full account — including
 * `Home`/`End` and what `Enter` opens — is the hidden description attached to
 * the canvas, which is read at the moment a reader arrives with a keyboard.
 */
const TOPOLOGY_READOUT_IDLE =
  "Point at a security, or press Tab and the arrow keys.";

/**
 * What a keyboard reader is told when they reach the canvas (Task 6.4.3) —
 * the visually-hidden description `aria-describedby` points at.
 *
 * **Three sentences for three mechanisms, and no fourth.** The arrow keys walk
 * the tree, `Home`/`End` jump to the ends of whichever group the reader is in,
 * and `Enter` opens. **It names what `Down`/`Up` physically DO — enter,
 * leave — and deliberately not the tree's own vocabulary**: the first draft
 * said *down enters a sector, up leaves it*, and the word `sector` was
 * dropped because the graph's own text equivalent already says it is grouped
 * into sectors around their benchmark ETFs, so naming the grouping a second
 * time, read aloud on every arrival, would be a second account of a structure
 * one sentence already gave. What a listener still needs — which key does
 * what, not what the graph contains — is what the shipped sentence keeps.
 *
 * `Escape` is named because it is the way out of a state a reader can
 * otherwise only leave by selecting something else.
 */
/**
 * The key-hint paragraph's own id, **derived from the graph sentence's rather
 * than minted by a second `useId()`** (Task 6.4.3).
 *
 * The reason is the mount effect's deps list rather than economy: those deps
 * are exactly `[topology, probe, sentenceId]` and that list is load-bearing
 * (this file's module docblock, and Story 6.2's declined `React.memo`
 * boundary, which is argued from it). A second `useId` value is stable for
 * the component's lifetime and would still have to be named in the deps to
 * satisfy the hooks rule — a fourth entry in a list three documents reason
 * about.
 *
 * **A function rather than a `const` in the component body for the same
 * reason**: a local would be a value the effect closes over and the hooks
 * rule cannot see through, so it is reported as a missing dependency. A
 * module-level call of `sentenceId`, which IS in the deps, is one home for
 * the string with nothing added to the list.
 */
function keyHintIdFor(sentenceId: string): string {
  return `${sentenceId}-keys`;
}

const TOPOLOGY_KEY_HINT =
  "Arrow keys walk the graph: down enters, up leaves, left and right move " +
  "between neighbours. Home and End jump to the ends of the current group. " +
  "Enter opens the selected security, and Escape clears it.";

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
 * **The one sentence a selection change is spoken as** (Task 6.4.4).
 *
 * **Built from {@link topologyReadoutLines} and nothing else**, which is this
 * region's one-vocabulary rule taken seriously rather than stated: the four
 * facts a listener gets are the four facts on the plate, the same strings from
 * the same function, so the spoken account and the drawn one cannot drift. A
 * second phrasing here — a prettier sector, a band read as a clause — would be
 * a second home for one fact and `ADR 0029`'s point 4 forbids exactly that.
 *
 * **The empty field is dropped rather than padded.** The four market proxies
 * have no sector (`cluster === null`, a complete answer rather than a missing
 * one), and the plate reserves that line's room silently; a sentence has no
 * room to reserve, so it simply has one clause fewer. There is no corresponding
 * case for the band — {@link topologyReadoutLines} always answers it, with one
 * of the two stated absences where there is no word.
 *
 * **Clearing SPEAKS**, which is Done-when 2's second half and is the one place
 * this differs from the plate: the plate returns to its idle instruction, which
 * is a thing on screen a listener cannot see changing. `Escape` is something
 * the reader did, and a key press that produces silence is indistinguishable
 * from a key press that did not land. It is deliberately **not** what a fresh
 * universe does — see the mount effect's cleanup, which empties this region
 * instead.
 *
 * **It names the act** (`Selected …`), and that is not a fourth fact: without
 * it the sentence is a bare list of four nouns arriving out of nowhere, and the
 * listener has no way to tell *this is now selected* from *this is what you are
 * passing over*. The pair `Selected …` / `Selection cleared.` is what makes the
 * two halves of this region's one gesture read as a pair.
 */
export function topologyAnnouncement(
  selected: TopologyHoverTarget | null,
): string {
  if (selected === null) return "Selection cleared.";

  const { ticker, name, sector, band } = topologyReadoutLines(selected);
  const facts = [ticker, name, sector, band].filter((fact) => fact !== "");

  return `Selected ${facts.join(", ")}.`;
}

/**
 * Write one selection change into the announcement region (Task 6.4.4).
 *
 * **Module-level and taking the element as an argument**, for
 * {@link writeTopologyReadout}'s and `applyAnomalyBands`' own reason: the
 * arrow the mount effect passes as `onSelect` then closes over refs and
 * module-level functions only, so it adds no dependency to an effect whose
 * deps list — `[topology, probe, sentenceId]` — is load-bearing in three
 * documents.
 */
function writeTopologyAnnouncement(
  region: HTMLElement | null,
  selected: TopologyHoverTarget | null,
): void {
  if (region === null) return;

  region.textContent = topologyAnnouncement(selected);
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
  correlationClause: string,
): void {
  renderer.current?.setBands(treatments);

  if (sentence.current !== null) {
    // **The correlation clause is re-appended here**, because this write
    // replaces the whole string. Without it the measured-edge clause would
    // survive exactly as long as the next live batch took to arrive — the
    // two-writers problem `correlationClause`'s own note describes, and the
    // reason the clause is a parameter rather than something this function
    // could work out for itself.
    sentence.current.textContent = `${topologyAnomalySentence(graph, treatments)}${correlationClause}`;
  }
}

/**
 * **What the drawn graph says about the measured edges — one clause, three
 * absence states and one presence state** (Task 6.5.2, Story 6.5's own design
 * work).
 *
 * ## It states a POPULATION and a REACH, never an edge
 *
 * `measured-set.ts`' rule as every other region on `/` applies it, and here
 * the temptation it refuses is specific: a per-edge fact (*AAPL moves with
 * MSFT*) is 1,860 facts in a hidden paragraph, which is a wall rather than a
 * fallback, and it would also be the one claim on this surface a listener
 * could not check against anything. So the clause says **how many pairs are
 * drawn, how many securities they reach, and out of what** — and names no
 * ticker at all, which is also what keeps it stable while a live band update
 * rewrites the sentence around it.
 *
 * ## The figures are read off the DRAWN graph and the PRODUCER's pass, never
 * ## derived from one another
 *
 * `edges` and `reach` come from the merged graph, because that is what is on
 * screen: `withCorrelationEdges` drops a pair naming a security the universe
 * no longer tracks, so `pass.retainedPairs` can legitimately exceed what is
 * drawn and the sentence must not claim the larger number. Everything that is
 * **not** on screen — the candidate population, the window, the `N` — comes
 * off the pass row, because a surface stating its own denominator must state
 * the producer's figure rather than a count of what survived to it
 * (`the-population-is-never-a-literal`'s own rule, one region over).
 *
 * ## Four states, four sentences, and the first three draw identical ink
 *
 * `loading` is the **absence of a clause** rather than a clause about an
 * absence — the discipline `Movers`' age line already follows: nothing has
 * happened yet, and a sentence saying so is a sentence that will be wrong in
 * 200 ms. The other three each say which of them it is, because *we have never
 * measured this*, *we measured and kept nothing* and *we could not read the
 * measurement* are three different facts with three different repairs, and
 * nothing else on the screen distinguishes them.
 */
function topologyCorrelationClause(
  graph: TopologyGraph | null,
  relationships: RelationshipsView,
): string {
  if (graph === null) return "";

  switch (relationships.state) {
    case "loading":
      return "";

    case "failed":
      // **The one sentence this story adds for a degraded read**, and what it
      // does not say is the point: no `Try again`, no correlation id, no
      // status word. The graph beside it is correct and complete about its own
      // subject; one layer of it is missing, and that is the whole claim.
      return (
        " Which securities move together could not be read, so only the" +
        " sector groupings are drawn."
      );

    case "never-measured":
      // CI's permanent state, and every laptop's before the first
      // `pnpm baselines`. **Not "no securities move together"** — which would
      // be a measurement we have not made.
      return (
        " Which securities move together has not been measured here, so no" +
        " security is joined to another."
      );

    case "measured": {
      const { pass } = relationships;
      const measured = graph.edges.filter(
        (edge) => edge.kind === "return_correlation",
      );

      // `toLocaleString("en-US")` for every count, which is this
      // application's own idiom for a counted population in prose
      // (`return-percentile.ts`' `of 4,620 5-minute returns`,
      // `volume-ratio.ts`' `80 IEX minutes`). A bare `122760` in a spoken
      // sentence is a figure a reader has to count the digits of.
      const sessions = `${pass.lookbackSessions.toLocaleString("en-US")} trading sessions`;
      // **`computedPairs` and not `candidatePairs`, because the word beside it
      // is *measured*** (Task 6.5.4, found by this story's own Gate 2).
      // `candidatePairs` is every pair the pass CONSIDERED — `C(eligible, 2)`
      // — and `computedPairs` is the ones that cleared the overlap floor and
      // produced a finite coefficient, which is what being measured means.
      // The two are equal on every store that exists today (zero pair-grain
      // refusals on the deployed pass), so the sentence was accidentally true
      // rather than right, and the first refused pair would have made it
      // over-report its own population — `relationships-response.ts`' own
      // `retainedPairs ≤ computedPairs ≤ candidatePairs` nesting read from the
      // wrong rung.
      const measuredPopulation = pass.computedPairs.toLocaleString("en-US");

      if (measured.length === 0) {
        // **`related closely enough` rather than `moved together closely
        // enough`** (Task 6.6.1), for the same reason the drawn branch below
        // changed: the pass retains on `|r|` through a Fisher-z interval, so
        // the thing it measures is the strength of a relationship and not its
        // direction. `together` would be the wrong word for a pair that moved
        // oppositely and was kept for it.
        return (
          ` No pair of securities was related closely enough to draw:` +
          ` ${measuredPopulation} pairs were measured over` +
          ` ${sessions} and none was kept.`
        );
      }

      const reach = new Set<Ticker>();
      for (const edge of measured) {
        reach.add(edge.from);
        reach.add(edge.to);
      }

      const equities = graph.nodes.filter(
        (node) => node.kind === "equity",
      ).length;

      // `measured.length === 1 ? "pair" : "pairs"` — this application's own
      // idiom for a counted noun in spoken prose (`measured-set.ts`'
      // `count === 1 ? "minute" : "minutes"`), so a store with exactly one
      // retained correlation does not read "1 pairs" to a listener.
      const drawnNoun = measured.length === 1 ? "pair" : "pairs";

      // **`Securities whose movements are measurably related` rather than
      // `Securities that moved together`** (Task 6.6.1, a real wording defect
      // found by counting the sign). The old clause made a universal
      // directional claim and the real retained set falsifies it: the one
      // negative pair on the one store this has been measured against —
      // `AES`/`ERIE` at `r = −0.105952`, 1 of 1,860 — moved **oppositely**,
      // and is joined by exactly the same edge. The pass retains on `|r|`, so
      // *related* is what the measurement supports and *together* is a
      // direction nothing on this canvas encodes. Sign is deliberately not a
      // channel (`edge-strength.ts` carries that decision and its count), so
      // the sentence must not supply one in words either.
      //
      // **And the strength encoding gets its non-visual half here**, in words
      // and never as a number: *drawn heavier where the relationship is
      // stronger* is the whole of what `CORRELATION_EDGE_WIDTH`'s three widths
      // say to a reader who can see them. No coefficient, no band name and no
      // per-edge figure — a listener cannot point at an edge to ask which one
      // this is, and a count per class would be three figures about a picture
      // rather than a fact about the market.
      //
      // The closing clause — *with the strongest N kept for each security* —
      // is Story 6.6's acceptance criterion 5's own requirement and was
      // already here from Task 6.5.2: the drawn set is a **per-security
      // selection**, not everything above a threshold, so a listener cannot
      // infer that an unjoined pair was measured and found weak.
      return (
        ` Securities whose movements are measurably related are joined by a` +
        ` dashed edge, drawn heavier where the relationship is stronger:` +
        ` ${measured.length.toLocaleString("en-US")} ${drawnNoun}, reaching` +
        ` ${reach.size.toLocaleString("en-US")} of the` +
        ` ${equities.toLocaleString("en-US")} equities, from ${measuredPopulation}` +
        ` pairs measured over ${sessions} with the strongest` +
        ` ${pass.retainedN.toLocaleString("en-US")} kept for each security.`
      );
    }
  }
}

/**
 * The measured pairs a `RelationshipsView` carries, or `null` for none.
 *
 * **`null` for all three of the other states**, and that is the structural
 * half of this story's degraded behaviour: `topologySource(securities, null)`
 * is byte-identical to the graph this region drew before Story 6.5, so *the
 * measurement is in flight*, *there is none* and *we could not read it* cannot
 * differ by a pixel. They differ by the clause above and by nothing else.
 */
function measuredPairs(
  relationships: RelationshipsView,
): readonly TopologyCorrelation[] | null {
  return relationships.state === "measured" ? relationships.correlations : null;
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
