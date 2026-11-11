// **Exactly the part of this component jsdom can see, and deliberately nothing
// else** (Task 6.1.3).
//
// Story 6.1's acceptance criterion 7: `loading`, `empty` and `failed` are **DOM
// text beside the frame**, never a sentence painted into the canvas. Painted
// text is unreachable by a screen reader, invisible to
// `overview-degraded-grid.spec.ts` when Story 6.2 puts this region on `/`, and
// unassertable below a browser — so this file asserts the one property that
// distinguishes the two implementations, which is that the words are queryable
// at all.
//
// ## There is deliberately NO test for the drawn graph
//
// jsdom has no WebGL and no 2d context, and `getTokens()` throws in the test
// environment because no stylesheet is applied there — so a `loaded` render
// takes the component's own refusal path and a `renders without crashing`
// assertion over it would be green whatever the renderer did. That is worse
// than its absence: it reads, in a list of test names, as cover this
// component does not have. The frame rate, the geometry, the ink and the eight
// draw calls are `pnpm probe` and `pnpm e2e`'s, and the task record says so.
//
// What that leaves assertable here is the **negative**: in all three absence
// states no canvas element exists at all, which is the difference between a
// reserved box and a half-drawn graph.

import { createRef } from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { toMarketDate, toTicker } from "@marketpulse/shared";
import type { Bar, SecurityLastClose, Ticker } from "@marketpulse/shared";

import type {
  TopologyAnomalyTreatment,
  TopologyFilterCriterion,
  TopologyRendererOptions,
  TopologyHoverTarget,
  TopologyRenderer,
  TopologySelectionSource,
} from "../../topology/index.js";
import { readTopologyFilter } from "../../topology/index.js";
import {
  FIXTURE_REQUEST_ID,
  LOADING_UNIVERSE,
  securitiesFixtureRetryingView,
  securitiesFixtureView,
} from "../../fixtures/securities.js";
import { renderWithContext } from "../../test-render.js";
import type { RelationshipsView } from "../../use-relationships.js";
import type { SecuritiesView } from "../../use-securities.js";
import { SAY_NOTHING_ARRIVED_AFTER_MS } from "../MarketProxyStrip/use-waited.js";
import { Region } from "../Region/Region.js";
import {
  MarketTopology,
  topologyAnnouncement,
  topologyOpenableSymbol,
  topologyReadoutLines,
} from "./MarketTopology.js";
import type { MarketTopologyHandle } from "./MarketTopology.js";

/**
 * **A fake renderer, for the one test below that needs a renderer that does
 * not throw** — jsdom has no 2d context, so `mountCanvasTopology` always
 * throws there (see the file's own note at the top), which is correct for
 * every other test here and useless for this one: proving a re-render does
 * not re-mount needs something to observe staying mounted.
 *
 * `framesDrawn` is a real, independent counter per instance (not a shared
 * constant) — two mount calls produce two renderers with two counters
 * starting at the same real behaviour (`measure()` draws one frame at
 * mount), so a regression that remounted on every re-render would be
 * visible as `mountCanvasTopology` being called more than once, which is
 * what the test below asserts directly.
 */
/**
 * The most recently created fake renderer's `destroy` spy, held outside the
 * `TopologyRenderer`-typed object so a test can read it without tripping
 * `@typescript-eslint/unbound-method` — that rule fires on a reference taken
 * off an interface's method-shorthand member (`destroy(): void`), not on a
 * plain variable, and `renderer?.destroy` is exactly the former.
 */
/**
 * **The relationship state every test here is written against** — no nightly
 * pass has run (Task 6.5.2).
 *
 * CI's permanent state and the one this component must draw identically to
 * the graph it drew before Story 6.5 existed: the measured edges are merged
 * into the graph, so `never-measured` and the pre-6.5 picture are the same
 * nodes and the same membership edges. The three tests that care about the
 * other states say so by passing their own.
 */
const NO_MEASUREMENT: RelationshipsView = { state: "never-measured" };

let lastDestroy = vi.fn();

/** Same reason as {@link lastDestroy}, for `setBands` (Task 6.3.2). */
let lastSetBands = vi.fn();

/**
 * Same reason as {@link lastDestroy}, for `focus` (Task 6.4.4).
 *
 * **A spy rather than a real `canvas.focus()`**, because there is no canvas
 * here at all — jsdom has no 2d context, so the real renderer never mounts in
 * this environment. What this file can prove is *which calls the component
 * makes and when*, which is the half of the focus recovery that is a decision;
 * where focus physically lands is `overview-market-topology-keyboard.spec.ts`'.
 */
let lastFocus = vi.fn();

/** Same reason as {@link lastDestroy}, for `markBurst` (Task 6.7.2). */
let lastMarkBurst = vi.fn();

/** Same reason as {@link lastDestroy}, for `setFilter` (Task 6.8.1). */
let lastSetFilter = vi.fn();

function createFakeRenderer(): TopologyRenderer {
  const frames = 1;
  lastDestroy = vi.fn();
  lastSetBands = vi.fn();
  lastFocus = vi.fn();
  lastMarkBurst = vi.fn();
  lastSetFilter = vi.fn();
  return {
    kind: "canvas",
    resize: vi.fn(),
    reset: vi.fn(),
    setBands: lastSetBands,
    setFilter: lastSetFilter,
    markBurst: lastMarkBurst,
    focus: lastFocus,
    framesDrawn: () => frames,
    destroy: lastDestroy,
  };
}

/**
 * **The mock implementation every suite in this file installs**, extracted at
 * Task 6.8.3 from thirteen copies of `() => createFakeRenderer()`.
 *
 * It exists because a real renderer does one thing at mount that the bare
 * factory did not: it **reports whether the measured-edge layer is drawn at
 * this size** (`TopologyRendererOptions.onCorrelationLayer`, fired from the
 * first drawn frame). `true` is the honest default here — it is what a real
 * canvas reports at 1440, the width every figure in this epic's own probe
 * table is anchored to — and a suite that wants the suppressed answer, or no
 * answer at all, installs its own implementation.
 */
const fakeMount = (
  _container: HTMLElement,
  options: TopologyRendererOptions,
): TopologyRenderer => {
  options.onCorrelationLayer?.(true);
  return createFakeRenderer();
};

const { mountCanvasTopology, FAKE_PALETTE } = vi.hoisted(() => ({
  mountCanvasTopology: vi.fn(),
  FAKE_PALETTE: {
    equity: "black",
    sectorEtf: "black",
    marketProxy: "black",
    membershipEdge: "black",
    hubEdge: "black",
    halo: "black",
    label: "black",
    labelFamily: "sans-serif",
    dataFamily: "monospace",
    labelSizePx: 11,
    labelTrackingEm: 0.08,
    anomalyUnscored: "black",
    anomalyElevated: "black",
    anomalyHigh: "black",
    anomalyExtreme: "black",
    hoverGround: "black",
  },
}));

vi.mock("../../topology/index.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../topology/index.js")>();
  return {
    ...actual,
    mountCanvasTopology,
    // `topologyPalette()` reads `getTokens()`, which throws in this test
    // environment because no stylesheet is applied here — the file's own
    // note at the top. It is an argument **evaluated before**
    // `mountCanvasTopology` is ever called, so leaving it real would throw
    // before the mock below is reached at all, for a reason that has
    // nothing to do with what this one test is proving.
    topologyPalette: () => FAKE_PALETTE,
  };
});

/** The `<canvas>` the renderer mounts, or `null`. */
function canvas(): HTMLCanvasElement | null {
  return document.querySelector("canvas");
}

describe("MarketTopology", () => {
  describe("while the universe is loading", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("says nothing for the wait a real universe request takes — Task 6.2.4", () => {
      render(
        <MarketTopology
          universe={LOADING_UNIVERSE}
          relationships={NO_MEASUREMENT}
          onRetry={() => undefined}
        />,
      );

      act(() => {
        vi.advanceTimersByTime(SAY_NOTHING_ARRIVED_AFTER_MS - 1);
      });

      // Measured 174–277 ms, five runs against a local pair (the same figure
      // `use-waited.ts`'s own account cites) — the ordinary load never
      // reaches here, and drawing the sentence immediately would flash it on
      // every cold load of `/`.
      expect(screen.queryByText("Reading the tracked universe.")).toBeNull();
      expect(canvas()).toBeNull();
    });

    it("says it is reading the universe past the floor, and mounts no canvas", () => {
      render(
        <MarketTopology
          universe={LOADING_UNIVERSE}
          relationships={NO_MEASUREMENT}
          onRetry={() => undefined}
        />,
      );

      act(() => {
        vi.advanceTimersByTime(SAY_NOTHING_ARRIVED_AFTER_MS);
      });

      expect(screen.getByText("Reading the tracked universe.")).toBeDefined();
      expect(canvas()).toBeNull();
    });
  });

  it("says an empty universe has no market to draw, as DOM text", () => {
    render(
      <MarketTopology
        universe={securitiesFixtureView("empty")}
        relationships={NO_MEASUREMENT}
        onRetry={() => undefined}
      />,
    );

    // `getByText` reads the accessibility-visible text of the document, so it
    // finds this sentence only because it is a real `<p>`. A string painted
    // into a canvas is not text to anything that is not a human eye.
    const sentence = screen.getByText(
      "No securities are tracked yet, so there is no market to draw.",
    );

    expect(sentence.tagName).toBe("P");
    expect(sentence.closest("canvas")).toBeNull();
    expect(sentence.closest("svg")).toBeNull();
    expect(canvas()).toBeNull();
  });

  it("offers one Try again and the correlation id on a retryable failure", () => {
    const onRetry = vi.fn();

    render(
      <MarketTopology
        universe={securitiesFixtureView("unavailable")}
        relationships={NO_MEASUREMENT}
        onRetry={onRetry}
      />,
    );

    const sentence = screen.getByText(/could not reach the data it needs/);
    expect(sentence.tagName).toBe("P");
    expect(sentence.closest("canvas")).toBeNull();
    expect(canvas()).toBeNull();

    // **One control, and its accessible name carries its subject** — two
    // `Try again` buttons on one screen with one name are two different
    // questions a reader cannot tell apart (Task 2.14.7).
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);

    const retry = screen.getByRole("button", {
      name: "Try again — the market topology",
    });
    expect(retry.textContent).toContain("Try again");

    retry.click();
    expect(onRetry).toHaveBeenCalledTimes(1);

    expect(screen.getByText(FIXTURE_REQUEST_ID)).toBeDefined();
  });

  it("keeps the control pressable while a retry is in flight and changes its word", () => {
    const onRetry = vi.fn();

    render(
      <MarketTopology
        universe={securitiesFixtureRetryingView("unavailable")}
        relationships={NO_MEASUREMENT}
        onRetry={onRetry}
      />,
    );

    // Not `disabled`: a disabled button loses focus in every browser, which
    // would take a keyboard reader to the top of the document at the moment
    // they acted. The word is the whole difference.
    const retry = screen.getByRole("button", {
      name: "Trying again… — the market topology",
    });

    expect(retry.hasAttribute("disabled")).toBe(false);

    retry.click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("offers no control at all where trying again would not help, and says so", () => {
    render(
      <MarketTopology
        universe={securitiesFixtureView("notThisService")}
        relationships={NO_MEASUREMENT}
        onRetry={() => undefined}
      />,
    );

    expect(screen.queryByRole("button")).toBeNull();

    // The absence of a control is this product's way of saying *waiting will
    // not help*, so the sentence has to say it too — otherwise the missing
    // button reads as something that failed to render.
    expect(
      screen.getByText(/Trying again now would produce the same answer/),
    ).toBeDefined();
    expect(canvas()).toBeNull();
  });

  it("exposes resetView on the ref as a no-op while nothing is mounted — Task 6.2.3", () => {
    // **What jsdom can prove and no more.** jsdom has no 2d context, so a
    // `loaded` universe here takes the component's own refusal path (see the
    // file's own note at the top) and no renderer ever mounts — which is
    // exactly the state `resetView`'s own contract names as a no-op. Calling
    // it drawing a graph is `pnpm probe`'s job; this is the plumbing: the
    // ref resolves to a real object with a callable `resetView`, in every
    // state this component can reach in a test environment, and calling it
    // throws nothing.
    const ref = createRef<MarketTopologyHandle>();

    render(
      <MarketTopology
        ref={ref}
        universe={LOADING_UNIVERSE}
        relationships={NO_MEASUREMENT}
        onRetry={() => undefined}
      />,
    );

    expect(ref.current).not.toBeNull();
    expect(() => ref.current?.resetView()).not.toThrow();
  });

  it("draws no reference where nothing answered to carry one", () => {
    render(
      <MarketTopology
        universe={securitiesFixtureView("nothingAnswered")}
        relationships={NO_MEASUREMENT}
        onRetry={() => undefined}
      />,
    );

    // ADR 0029: each clause renders only when its own data is present. There
    // was no response, so there is no `requestId` and no `Reference` line —
    // beside a `Try again`, which this failure does offer.
    expect(screen.queryByText(/Reference/)).toBeNull();
    expect(screen.getByRole("button", { name: /Try again/ })).toBeDefined();
    expect(screen.getByText(/Nothing answered at the service/)).toBeDefined();
  });

  it("gives the drawn graph a text equivalent naming no count or ticker another surface owns — Task 6.2.4", () => {
    // jsdom has no 2d context, so the mount effect throws and a DIFFERENT
    // paragraph (`The market topology could not be drawn…`) is appended
    // imperatively — but the sentence under test is part of this
    // component's own SYNCHRONOUS render output, before that effect ever
    // runs, so it is reachable here regardless.
    render(
      <MarketTopology
        universe={securitiesFixtureView("full")}
        relationships={NO_MEASUREMENT}
        onRetry={() => undefined}
      />,
    );

    const sentence = screen.getByText(/A graph of every security we track/);

    expect(sentence.tagName).toBe("P");
    // The real fixture has all eleven sectors, read off the graph rather
    // than hard-coded a second place.
    expect(sentence.textContent).toContain("11 sectors");
    // `516` has one home already (`measured-set.ts`) and no ticker belongs
    // in a hidden paragraph — a wall of symbols is not a fallback.
    expect(sentence.textContent).not.toMatch(/\d{3}/);
    expect(sentence.textContent).not.toMatch(/\b[A-Z]{2,5}\b/);
  });

  describe("the declined memo boundary — Task 6.2.5, Story 6.2's acceptance criterion 8", () => {
    beforeEach(() => {
      mountCanvasTopology.mockReset();
      mountCanvasTopology.mockImplementation(fakeMount);
    });

    it("does not re-mount the renderer across several applied batches", () => {
      // **One `universe`, held across every render** — exactly what
      // `use-securities.ts` gives `/` between live-feed batches: the same
      // object by identity, not a fresh one each tick. A test that called
      // `securitiesFixtureView("full")` again per render would prove
      // nothing, because a NEW array would be a real reason to re-mount.
      const universe = securitiesFixtureView("full");

      const { rerender } = render(
        <MarketTopology
          universe={universe}
          relationships={NO_MEASUREMENT}
          onRetry={() => undefined}
        />,
      );

      expect(mountCanvasTopology).toHaveBeenCalledTimes(1);
      const renderer = mountCanvasTopology.mock.results[0]?.value as
        TopologyRenderer | undefined;
      expect(renderer).toBeDefined();
      const framesBefore = renderer?.framesDrawn();

      // **Several applied batches** — a parent re-render with every prop
      // this component reads unchanged, which is what `/`'s 6.8–16.1
      // batches a minute actually do to this region: `onRetry` is a fresh
      // closure each time (as a real `useCallback`-stable one would not be,
      // but the mount effect does not depend on it either way), `universe`
      // is the same reference.
      for (let batch = 0; batch < 5; batch += 1) {
        rerender(
          <MarketTopology
            universe={universe}
            relationships={NO_MEASUREMENT}
            onRetry={() => undefined}
          />,
        );
      }

      // **The producer, not the wire**: a render-count assertion cannot
      // see a remount that happens to draw the same picture, but the mount
      // call count and the renderer's own identity can. Unchanged across
      // five re-renders is the claim Story 6.2's AC 8 makes.
      expect(mountCanvasTopology).toHaveBeenCalledTimes(1);
      expect(lastDestroy).not.toHaveBeenCalled();
      expect(renderer?.framesDrawn()).toBe(framesBefore);
    });

    it("is never handed a second layout across setBands, markBurst AND setObservations interleaved — AC 6's own producer-side test, Task 6.7.4", () => {
      // **AC 6: the graph does not re-layout under live data.** Already
      // true by construction — `securities`' own array identity gates the
      // mount effect — and what this test adds is proof that Story 6.7's
      // THREE new live-update mechanisms, used together exactly as a real
      // live batch uses them (a band update, the graph-level mark, and the
      // plate's live facts all fire from the same `MarketOverview.tsx`
      // effects on the same `observations`/`overview` change), introduce
      // no renderer-side nudge the model-level invariants
      // (`the-topology-layout-reads-no-edge`,
      // `the-topology-view-reads-no-arrival`) cannot see from their own
      // static text alone.
      const universe = securitiesFixtureView("full");
      const handle = createRef<MarketTopologyHandle>();

      render(
        <MarketTopology
          ref={handle}
          universe={universe}
          relationships={NO_MEASUREMENT}
          bands={new Map([[toTicker("NVDA"), "elevated"]] as const)}
          onRetry={() => undefined}
        />,
      );

      expect(mountCanvasTopology).toHaveBeenCalledTimes(1);
      const renderer = mountCanvasTopology.mock.results[0]?.value as
        TopologyRenderer | undefined;
      expect(renderer).toBeDefined();

      for (let batch = 0; batch < 5; batch += 1) {
        act(() => {
          handle.current?.setObservations(new Map());
          handle.current?.markBurst();
        });
      }

      // **The producer, not the wire**, same reason the test above reads
      // this way: one mount, the SAME renderer instance throughout, no
      // `destroy()` — proof that nothing along this path ever re-mounts
      // with a fresh `graph`/`layout`, whichever of the three mechanisms
      // fired.
      expect(mountCanvasTopology).toHaveBeenCalledTimes(1);
      expect(mountCanvasTopology.mock.results[0]?.value).toBe(renderer);
      expect(lastDestroy).not.toHaveBeenCalled();
    });
  });

  describe("the anomaly-band update channel — Task 6.3.2", () => {
    beforeEach(() => {
      mountCanvasTopology.mockReset();
      mountCanvasTopology.mockImplementation(fakeMount);
    });

    it("never calls the renderer's setBands when no bands prop was given — Task 6.3.3's tightened contract", () => {
      render(
        <MarketTopology
          universe={securitiesFixtureView("full")}
          relationships={NO_MEASUREMENT}
          onRetry={() => undefined}
        />,
      );

      // **Omitting `bands` must not call `setBands(new Map())`** — that
      // would silently revert whatever the renderer already has back to
      // `normal`, which is the "blanked on a quiet frame" defect AC 5
      // forbids. The renderer's own mount-time default already draws
      // `normal` for everyone, so skipping the call changes nothing visible
      // while leaving a later real update free to hold.
      expect(lastSetBands).not.toHaveBeenCalled();
    });

    it("redraws through setBands on a changed map, without re-mounting the renderer", () => {
      const universe = securitiesFixtureView("full");
      const first = new Map([[toTicker("NVDA"), "elevated"]] as const);

      const { rerender } = render(
        <MarketTopology
          universe={universe}
          relationships={NO_MEASUREMENT}
          bands={first}
          onRetry={() => undefined}
        />,
      );

      expect(mountCanvasTopology).toHaveBeenCalledTimes(1);
      expect(lastSetBands).toHaveBeenLastCalledWith(first);

      const second = new Map([[toTicker("NVDA"), "extreme"]] as const);

      rerender(
        <MarketTopology
          universe={universe}
          relationships={NO_MEASUREMENT}
          bands={second}
          onRetry={() => undefined}
        />,
      );

      // **The producer, not the wire** — same reason the memo-boundary test
      // above reads the mount count rather than a render count: a redraw
      // that happens to draw the same picture is invisible to anything but
      // the call itself.
      expect(mountCanvasTopology).toHaveBeenCalledTimes(1);
      expect(lastSetBands).toHaveBeenLastCalledWith(second);
      expect(lastDestroy).not.toHaveBeenCalled();
    });

    it("does not call setBands again across a re-render where the bands map is unchanged by identity", () => {
      const universe = securitiesFixtureView("full");
      const bands = new Map([[toTicker("NVDA"), "high"]] as const);

      const { rerender } = render(
        <MarketTopology
          universe={universe}
          relationships={NO_MEASUREMENT}
          bands={bands}
          onRetry={() => undefined}
        />,
      );

      expect(lastSetBands).toHaveBeenCalledTimes(1);

      rerender(
        <MarketTopology
          universe={universe}
          relationships={NO_MEASUREMENT}
          bands={bands}
          onRetry={() => undefined}
        />,
      );

      expect(lastSetBands).toHaveBeenCalledTimes(1);
    });
  });

  describe("the live-update mark channel — Task 6.7.2", () => {
    beforeEach(() => {
      mountCanvasTopology.mockReset();
      mountCanvasTopology.mockImplementation(fakeMount);
    });

    it("exposes markBurst on the ref as a no-op while nothing is mounted", () => {
      // The same contract `resetView`'s own test names, at the same state:
      // a universe still loading has no renderer, and `markBurst()` must
      // not throw reaching for one.
      const ref = createRef<MarketTopologyHandle>();

      render(
        <MarketTopology
          ref={ref}
          universe={{ state: "loading" }}
          relationships={NO_MEASUREMENT}
          onRetry={() => undefined}
        />,
      );

      expect(() => ref.current?.markBurst()).not.toThrow();
    });

    it("calls the renderer's markBurst, reached through the ref rather than a prop", () => {
      const handle = createRef<MarketTopologyHandle>();

      render(
        <MarketTopology
          ref={handle}
          universe={securitiesFixtureView("full")}
          relationships={NO_MEASUREMENT}
          onRetry={() => undefined}
        />,
      );

      act(() => {
        handle.current?.markBurst();
      });

      expect(lastMarkBurst).toHaveBeenCalledTimes(1);
    });

    it("does not re-mount the renderer across interleaved setBands and markBurst calls — the declined memo boundary's third evaluation", () => {
      // **The producer-side account this module's own docblock points
      // to.** `markBurst` is called through the SAME ref `setBands` already
      // is, so this interleaves the two across several re-renders — the
      // shape a real live batch actually produces, since Task 6.7.1's
      // widened subscription means almost every batch touches both the
      // anomaly bands AND the observation map `markBurst`'s own caller
      // watches.
      const universe = securitiesFixtureView("full");
      const handle = createRef<MarketTopologyHandle>();

      const { rerender } = render(
        <MarketTopology
          ref={handle}
          universe={universe}
          relationships={NO_MEASUREMENT}
          bands={new Map([[toTicker("NVDA"), "elevated"]] as const)}
          onRetry={() => undefined}
        />,
      );

      expect(mountCanvasTopology).toHaveBeenCalledTimes(1);

      for (let batch = 0; batch < 5; batch += 1) {
        act(() => {
          handle.current?.markBurst();
        });

        rerender(
          <MarketTopology
            ref={handle}
            universe={universe}
            relationships={NO_MEASUREMENT}
            bands={
              new Map([
                [toTicker("NVDA"), batch % 2 === 0 ? "high" : "extreme"],
              ] as const)
            }
            onRetry={() => undefined}
          />,
        );
      }

      expect(mountCanvasTopology).toHaveBeenCalledTimes(1);
      expect(lastDestroy).not.toHaveBeenCalled();
      expect(lastMarkBurst).toHaveBeenCalledTimes(5);
      expect(lastSetBands).toHaveBeenCalledTimes(6); // the mount-time bands prop, plus the five re-renders
    });
  });

  describe("the accessible sentence's anomaly content — Task 6.3.4", () => {
    beforeEach(() => {
      mountCanvasTopology.mockReset();
      mountCanvasTopology.mockImplementation(fakeMount);
    });

    /** The sentence `setBands`/`applyAnomalyBands` rewrites in place. */
    const sentence = () =>
      screen.getByText(/^A graph of every security we track/u);

    it("states the band vocabulary and the high/extreme counts, never elevated's count or a cohort restatement", () => {
      const bands = new Map([
        [toTicker("AAPL"), "elevated"],
        [toTicker("MSFT"), "high"],
        [toTicker("NVDA"), "high"],
        [toTicker("TSLA"), "extreme"],
      ] as const);

      render(
        <MarketTopology
          universe={securitiesFixtureView("full")}
          relationships={NO_MEASUREMENT}
          bands={bands}
          onRetry={() => undefined}
        />,
      );

      const text = sentence().textContent;

      // All four band words, because the sentence names the vocabulary.
      for (const word of ["normal", "elevated", "high", "extreme"]) {
        expect(text).toContain(word);
      }

      // **Counts for `high`/`extreme` only** — two `high`, one `extreme`,
      // read off the same map rather than hard-coded.
      expect(text).toContain("2 are high");
      expect(text).toContain("1 is extreme");

      // **Never `elevated`'s own count** — STORY.md note 2's reading: it is
      // usually close to half the scored universe and would read as an
      // alarm if stated as a number here.
      expect(text).not.toMatch(/\d+ are elevated/u);

      // **Never a cohort restatement** — `Unusual activity`'s own
      // "Of the N companies we track, M were heard from…" sentence, which
      // ADR 0029's one-fact-one-home rule forbids a second home for.
      expect(text).not.toMatch(/Of the \d+ companies/u);

      // **Never a raw score** (AC 8) — no "NN/100" and no bare 2-digit
      // number standing in for a 0–100 reading the way `Unusual activity`'s
      // own rows draw one.
      expect(text).not.toMatch(/\/\s?100/u);
      expect(text).not.toMatch(/\bscore\b/iu);

      // Still points to the one surface that names the ten, once.
      expect(text).toContain("Unusual activity");
    });

    it("states the honest-nothing clause, distinct from 'calm', when every equity is unscored", () => {
      const bands = new Map([
        [toTicker("AAPL"), "unscored"],
        [toTicker("MSFT"), "unscored"],
      ] as const);

      render(
        <MarketTopology
          universe={securitiesFixtureView("full")}
          relationships={NO_MEASUREMENT}
          bands={bands}
          onRetry={() => undefined}
        />,
      );

      const text = sentence().textContent;

      // **"Unscored" is stated plainly, and "calm" appears only inside the
      // NEGATIVE claim that nothing is drawn that way** — AC 4's own
      // distinction, restated here: an absent score must not read as
      // nothing-unusual.
      expect(text).toContain("unscored");
      expect(text).toMatch(/not? .*calm/iu);
      expect(text).not.toContain("are high");
      expect(text).not.toContain("are extreme");
    });

    it("states the unscored count beside the high/extreme counts for a MIXED population — Task 6.7.3, AC 7, corrected from a bug this fixture would have hidden", () => {
      // **The defect this test exists to catch**: the old check was
      // `.some(unscored)`, which fires on a SINGLE unscored equity in an
      // otherwise fully-scored map — exactly this map — and would have
      // drawn the all-unscored sentence about a population that is 3/4
      // scored. Story 6.3.1's own measured session puts this state at
      // real scale: 11 of 496 equities "too short a baseline" beside 485
      // real bands.
      const bands = new Map([
        [toTicker("AAPL"), "elevated"],
        [toTicker("MSFT"), "high"],
        [toTicker("TSLA"), "extreme"],
        [toTicker("NVDA"), "unscored"],
      ] as const);

      render(
        <MarketTopology
          universe={securitiesFixtureView("full")}
          relationships={NO_MEASUREMENT}
          bands={bands}
          onRetry={() => undefined}
        />,
      );

      const text = sentence().textContent;

      // The scored population's own counts, unchanged by the one unscored
      // entry sharing the map.
      expect(text).toContain("1 is high");
      expect(text).toContain("1 is extreme");

      // **The new clause**: the unscored equity is named as a count, never
      // silently dropped — the AC 7 fix.
      // **`has` rather than `have`** (Task 6.8.3) — the counted noun agrees
      // with its count, which this clause did not do either.
      expect(text).toContain("1 has not been scored yet");

      // And this is NOT the all-unscored sentence — the scored population
      // is real and the sentence must not claim otherwise.
      expect(text).not.toMatch(/Nothing has been scored yet/u);
    });

    it("omits the unscored clause entirely when nothing is unscored — the cut-over-nothing rule", () => {
      const bands = new Map([[toTicker("TSLA"), "extreme"]] as const);

      render(
        <MarketTopology
          universe={securitiesFixtureView("full")}
          relationships={NO_MEASUREMENT}
          bands={bands}
          onRetry={() => undefined}
        />,
      );

      expect(sentence().textContent).not.toContain("have not been scored");
    });

    it("leaves the plain structural sentence when no bands have ever been applied", () => {
      render(
        <MarketTopology
          universe={securitiesFixtureView("full")}
          relationships={NO_MEASUREMENT}
          onRetry={() => undefined}
        />,
      );

      const text = sentence().textContent;

      expect(text).not.toContain("elevated");
      expect(text).not.toContain("unscored");
    });
  });

  describe("the hover readout — Task 6.4.1", () => {
    beforeEach(() => {
      mountCanvasTopology.mockReset();
      mountCanvasTopology.mockImplementation(fakeMount);
    });

    /** The plate itself, which exists in the `loaded` state only. */
    const plate = (): HTMLElement => {
      const found = document.querySelector("[data-topology-readout]");
      if (found === null) throw new Error("no readout plate was rendered");
      return found as HTMLElement;
    };

    /** One of the plate's four fact lines, by its own `data-readout`. */
    const line = (field: string): string =>
      plate().querySelector(`[data-readout="${field}"]`)?.textContent ?? "";

    /**
     * The `onHover` the component handed the renderer at mount — **the
     * channel itself**, which is what Done-when 5 is about: hover arrives
     * through a mount option rather than through a prop or a state setter, so
     * there is no path by which it could re-render this component.
     */
    const hoverChannel = (): ((
      hovered: TopologyHoverTarget | null,
    ) => void) => {
      const options = mountCanvasTopology.mock.calls[0]?.[1] as
        { onHover?: (hovered: TopologyHoverTarget | null) => void } | undefined;
      const channel = options?.onHover;
      if (channel === undefined)
        throw new Error("the renderer was mounted with no onHover channel");
      return channel;
    };

    const mount = (): void => {
      render(
        <MarketTopology
          universe={securitiesFixtureView("full")}
          relationships={NO_MEASUREMENT}
          onRetry={() => undefined}
        />,
      );
    };

    it("reserves the plate and draws the idle instruction before anything is hovered", () => {
      mount();

      expect(plate().dataset.topologyReadout).toBe("idle");
      expect(
        screen.getByText(
          "Point at a security, or press Tab and the arrow keys.",
        ),
      ).toBeTruthy();
      // The four fact slots exist and are empty — reserved room rather than a
      // plate that grows when a reader points at something.
      for (const field of ["ticker", "name", "sector", "band"]) {
        expect(line(field)).toBe("");
      }
    });

    it("writes a hovered equity's four facts without re-rendering or re-mounting anything", () => {
      const errors = vi.spyOn(console, "error").mockImplementation(() => {
        /* a React act() warning would land here */
      });

      mount();
      expect(mountCanvasTopology).toHaveBeenCalledTimes(1);

      // **Called OUTSIDE `act()`, deliberately.** If hover went through React
      // state this would both fail to update the DOM synchronously and log
      // React's own "not wrapped in act(...)" error — so the two assertions
      // below are the producer-side evidence that it does not.
      hoverChannel()({
        node: {
          symbol: toTicker("NVDA"),
          label: "NVIDIA Corporation",
          kind: "equity",
          cluster: "technology",
        },
        treatment: "extreme",
      });

      expect(plate().dataset.topologyReadout).toBe("reading");
      expect(line("ticker")).toBe("NVDA");
      expect(line("name")).toBe("NVIDIA Corporation");
      expect(line("sector")).toBe("Technology");
      expect(line("band")).toBe("extreme");

      expect(mountCanvasTopology).toHaveBeenCalledTimes(1);
      expect(lastDestroy).not.toHaveBeenCalled();
      expect(errors).not.toHaveBeenCalled();

      errors.mockRestore();
    });

    it("returns to the idle instruction when the pointer leaves every node", () => {
      mount();
      const hover = hoverChannel();

      hover({
        node: {
          symbol: toTicker("AAPL"),
          label: "Apple Inc.",
          kind: "equity",
          cluster: "technology",
        },
        treatment: "normal",
      });
      expect(line("ticker")).toBe("AAPL");

      hover(null);

      expect(plate().dataset.topologyReadout).toBe("idle");
      // **Cleared rather than left behind**: a plate still naming the last
      // node a pointer passed over reads as a selection, which this story
      // does not have yet.
      expect(line("ticker")).toBe("");
      expect(line("band")).toBe("");
    });
  });

  describe("selection, and the one way out — Task 6.4.2", () => {
    beforeEach(() => {
      mountCanvasTopology.mockReset();
      mountCanvasTopology.mockImplementation(fakeMount);
    });

    const plate = (): HTMLElement => {
      const found = document.querySelector("[data-topology-readout]");
      if (found === null) throw new Error("no readout plate was rendered");
      return found as HTMLElement;
    };

    const line = (field: string): string =>
      plate().querySelector(`[data-readout="${field}"]`)?.textContent ?? "";

    /** The ticker slot, whatever element it currently is. */
    const tickerSlot = (): HTMLElement => {
      const found = plate().querySelector('[data-readout="ticker"]');
      if (found === null) throw new Error("no ticker slot was rendered");
      return found as HTMLElement;
    };

    /**
     * The two channels the renderer was mounted with. Read off the mount
     * options rather than through a prop, which is the producer-side evidence
     * that selection arrives the same way hover does — see
     * {@link hoverChannel}'s own note in the block above.
     */
    const channels = (): {
      readonly hover: (hovered: TopologyHoverTarget | null) => void;
      readonly select: (
        selected: TopologyHoverTarget | null,
        source?: TopologySelectionSource,
      ) => void;
    } => {
      const options = mountCanvasTopology.mock.calls[0]?.[1] as
        | {
            onHover?: (hovered: TopologyHoverTarget | null) => void;
            onSelect?: (
              selected: TopologyHoverTarget | null,
              source: TopologySelectionSource,
            ) => void;
          }
        | undefined;
      const hover = options?.onHover;
      const select = options?.onSelect;
      if (hover === undefined || select === undefined)
        throw new Error("the renderer was mounted without both channels");
      // **The source defaults to `"pointer"` here and nowhere in the
      // application** (Task 6.4.3): the renderer always states it, and a
      // default in the harness is what keeps Task 6.4.2's own call sites
      // reading as the pointer selections they were written as. The tests
      // that care pass it explicitly.
      return {
        hover,
        select: (selected, source = "pointer") => {
          select(selected, source);
        },
      };
    };

    const target = (
      symbol: string,
      label: string,
      treatment: TopologyAnomalyTreatment | null = "normal",
    ): TopologyHoverTarget => ({
      node: {
        symbol: toTicker(symbol),
        label,
        kind: "equity",
        cluster: "technology",
      },
      treatment,
    });

    const NVDA = target("NVDA", "NVIDIA Corporation", "extreme");
    const AAPL = target("AAPL", "Apple Inc.", "normal");

    const mount = (): void => {
      renderWithContext(
        <MarketTopology
          universe={securitiesFixtureView("full")}
          relationships={NO_MEASUREMENT}
          onRetry={() => undefined}
        />,
      );
    };

    it("draws no link at all until something is selected", () => {
      mount();

      expect(screen.queryAllByRole("link")).toHaveLength(0);
      expect(tickerSlot().tagName).toBe("SPAN");
    });

    it("turns the ticker into one anchor at the selected security's own path", () => {
      mount();

      act(() => {
        channels().select(NVDA);
      });

      const links = screen.getAllByRole("link");
      expect(links).toHaveLength(1);
      expect(links[0]?.getAttribute("href")).toBe("/securities/NVDA");
      // **The href and the displayed ticker are one string**, which is the
      // property the conditional is written for: there is no state in which
      // this surface offers to open something other than what it is naming.
      expect(line("ticker")).toBe("NVDA");
      expect(links[0]?.dataset.ticker).toBe("NVDA");
    });

    it("keeps the four facts on the plate after React replaces the ticker element", () => {
      // **The defect this is written against is invisible without it.** The
      // callback writes `textContent` and THEN sets state; React replaces the
      // `<span>` with an `<a>`, and the text lands on the node being thrown
      // away. The plate would read blank with a correct `href` beside it.
      mount();

      act(() => {
        channels().select(NVDA);
      });

      expect(plate().dataset.topologyReadout).toBe("reading");
      expect(line("ticker")).toBe("NVDA");
      expect(line("name")).toBe("NVIDIA Corporation");
      expect(line("sector")).toBe("Technology");
      expect(line("band")).toBe("extreme");
    });

    it("keeps naming the selected node when the pointer leaves every node", () => {
      mount();

      act(() => {
        channels().select(NVDA);
      });
      // Hover somewhere else, then off the canvas entirely. **In `act()`,
      // unlike the hover block above**: crossing the selected node's own edge
      // is the one hover transition that legitimately changes whether there is
      // an anchor, so it is the one that re-renders. See the last test in this
      // block for the claim that no OTHER hover does.
      act(() => {
        channels().hover(AAPL);
      });
      expect(line("ticker")).toBe("AAPL");
      act(() => {
        channels().hover(null);
      });

      // **Selection PERSISTS** (Done-when 1): the plate returns to the
      // selection rather than to the idle instruction, which is what makes
      // the anchor's ticker and the drawn ticker the same string even with the
      // pointer gone.
      expect(plate().dataset.topologyReadout).toBe("reading");
      expect(line("ticker")).toBe("NVDA");
      expect(screen.getAllByRole("link")).toHaveLength(1);
    });

    it("draws the hovered node as plain text while a DIFFERENT node is selected", () => {
      mount();

      act(() => {
        channels().select(NVDA);
      });
      act(() => {
        channels().hover(AAPL);
      });

      // The plate reads AAPL and there is no anchor on it, because the anchor
      // exists exactly when the shown ticker IS the selected one. An anchor
      // reading `AAPL` and pointing at NVDA is the state this rules out —
      // a destination a reader cannot see, which is this screen's own *the
      // figure is never the link* rule broken from the other side.
      expect(line("ticker")).toBe("AAPL");
      expect(screen.queryAllByRole("link")).toHaveLength(0);
    });

    it("re-reads the anchor when the hovered node IS the selected one", () => {
      mount();

      act(() => {
        channels().select(NVDA);
      });
      act(() => {
        channels().hover(NVDA);
      });

      const links = screen.getAllByRole("link");
      expect(links).toHaveLength(1);
      expect(links[0]?.getAttribute("href")).toBe("/securities/NVDA");
      expect(line("ticker")).toBe("NVDA");
    });

    it("moves the selection to a different node rather than adding to it", () => {
      mount();

      act(() => {
        channels().select(NVDA);
      });
      act(() => {
        channels().select(AAPL);
      });

      const links = screen.getAllByRole("link");
      expect(links).toHaveLength(1);
      expect(links[0]?.getAttribute("href")).toBe("/securities/AAPL");
      expect(line("ticker")).toBe("AAPL");
    });

    it("clears the selection and returns to the idle instruction", () => {
      mount();

      act(() => {
        channels().select(NVDA);
      });
      act(() => {
        channels().select(null);
      });

      expect(screen.queryAllByRole("link")).toHaveLength(0);
      expect(tickerSlot().tagName).toBe("SPAN");
      expect(plate().dataset.topologyReadout).toBe("idle");
      expect(line("ticker")).toBe("");
      expect(
        screen.getByText(
          "Point at a security, or press Tab and the arrow keys.",
        ),
      ).toBeTruthy();
    });

    it("re-reads a selected node's band without moving the anchor", () => {
      // What `setBands` reaches: the renderer calls `onSelect` again with the
      // SAME node when a live batch changes its band, because the plate is
      // usually showing the selection and a stale word there would disagree
      // with the ring on screen.
      mount();

      act(() => {
        channels().select(target("NVDA", "NVIDIA Corporation", "unscored"));
      });
      expect(line("band")).toBe("Not scored yet");

      act(() => {
        channels().select(NVDA);
      });

      expect(line("band")).toBe("extreme");
      expect(screen.getAllByRole("link")).toHaveLength(1);
      // One mount throughout — a band change must not re-mount the canvas.
      expect(mountCanvasTopology).toHaveBeenCalledTimes(1);
      expect(lastDestroy).not.toHaveBeenCalled();
    });

    it("still does not re-render on an ordinary hover, because nothing is openable", () => {
      // **The producer-side half of the memo-boundary claim, re-taken for this
      // task** (Story 6.2's AC 8). Selection added one `useState` to this
      // component, so the question *does a pointer move re-render the landing
      // page\'s primary content area* had to be asked again. It does not while
      // nothing is selected: `topologyOpenableSymbol` answers `null` for every
      // hover, so `show()` never reaches `setOpenable`.
      //
      // Called OUTSIDE `act()` deliberately — a state update here would both
      // fail to appear synchronously and log React\'s own "not wrapped in
      // act(...)" error, which is what the spy below reads.
      const errors = vi.spyOn(console, "error").mockImplementation(() => {
        /* a React act() warning would land here */
      });

      mount();
      const { hover } = channels();

      hover(NVDA);
      hover(AAPL);
      hover(null);

      expect(errors).not.toHaveBeenCalled();
      expect(mountCanvasTopology).toHaveBeenCalledTimes(1);
      expect(lastDestroy).not.toHaveBeenCalled();

      errors.mockRestore();
    });

    it("leaves a selection alone when the view is reset", () => {
      // Done-when 4. `resetView` is named for the VIEW; clearing is `Escape`'s
      // (Task 6.4.3) and empty canvas's.
      const handle = createRef<MarketTopologyHandle>();
      renderWithContext(
        <MarketTopology
          ref={handle}
          universe={securitiesFixtureView("full")}
          relationships={NO_MEASUREMENT}
          onRetry={() => undefined}
        />,
      );

      act(() => {
        channels().select(NVDA);
      });

      act(() => {
        handle.current?.resetView();
      });

      expect(screen.getAllByRole("link")).toHaveLength(1);
      expect(line("ticker")).toBe("NVDA");
    });

    /**
     * **AC 6's second bounded claim: the controls, by ENUMERATION rather than
     * by the absence of a name** (Task 6.4.2).
     *
     * The invariant `no-second-affordance-on-a-topology-node` catches a second
     * affordance that is NAMED; this catches one that is not, by counting. It
     * is an exhaustive list over this component's own subtree — `Reset view`
     * lives in `Region`'s `meta` slot in `MarketOverview.tsx`, outside this
     * tree entirely (that file's own note), so the browser spec is where the
     * region's full set is counted and this is where the component's is.
     */
    describe("the exhaustive control enumeration — AC 6", () => {
      /** Every activatable thing in the rendered tree, as `role · name`. */
      const controls = (): readonly string[] =>
        [...screen.queryAllByRole("link"), ...screen.queryAllByRole("button")]
          .map(
            (element) =>
              `${element.tagName === "A" ? "link" : "button"} · ${(element.getAttribute("aria-label") ?? element.textContent).trim()}`,
          )
          .sort();

      it("offers nothing at all before a selection", () => {
        mount();
        expect(controls()).toStrictEqual([]);
      });

      it("offers exactly the one ticker anchor once a node is selected", () => {
        mount();

        act(() => {
          channels().select(NVDA);
        });

        expect(controls()).toStrictEqual(["link · NVDA"]);
      });

      it("offers nothing while the pointer is reading a different node", () => {
        mount();

        act(() => {
          channels().select(NVDA);
        });
        act(() => {
          channels().hover(AAPL);
        });

        expect(controls()).toStrictEqual([]);
      });

      it("offers exactly Try again where the universe failed, and no link", () => {
        renderWithContext(
          <MarketTopology
            universe={securitiesFixtureView("unavailable")}
            relationships={NO_MEASUREMENT}
            onRetry={() => undefined}
          />,
        );

        expect(controls()).toStrictEqual([
          "button · Try again — the market topology",
        ]);
      });
    });
  });

  /**
   * **The keyboard's React-side half** (Task 6.4.3) — the two things that are
   * not in the renderer and therefore not below `pnpm e2e`.
   *
   * The walk itself is `topology/walk.test.ts`, pure and over the real
   * universe; the keys reaching it, the drawn focus ring and where focus lands
   * in a real browser are `overview-market-topology-keyboard.spec.ts`'s. What
   * is left here is the half this component owns: the hidden description the
   * canvas is pointed at, and **focus following a keyboard selection onto the
   * one anchor**, which is what makes `Enter` the browser's own activation
   * rather than a navigation call.
   */
  describe("the keyboard model — Task 6.4.3", () => {
    beforeEach(() => {
      mountCanvasTopology.mockReset();
      mountCanvasTopology.mockImplementation(fakeMount);
    });

    /** The mount options the renderer was handed. */
    const options = (): {
      labelledBy?: string;
      describedBy?: string;
      onSelect?: (
        selected: TopologyHoverTarget | null,
        source: TopologySelectionSource,
      ) => void;
    } => {
      const found = mountCanvasTopology.mock.calls[0]?.[1] as
        | {
            labelledBy?: string;
            describedBy?: string;
            onSelect?: (
              selected: TopologyHoverTarget | null,
              source: TopologySelectionSource,
            ) => void;
          }
        | undefined;
      if (found === undefined)
        throw new Error("the renderer was never mounted");
      return found;
    };

    const select = (
      selected: TopologyHoverTarget | null,
      source: TopologySelectionSource,
    ): void => {
      const channel = options().onSelect;
      if (channel === undefined)
        throw new Error("the renderer was mounted with no onSelect channel");
      act(() => {
        channel(selected, source);
      });
    };

    const NVDA: TopologyHoverTarget = {
      node: {
        symbol: toTicker("NVDA"),
        label: "NVIDIA Corporation",
        kind: "equity",
        cluster: "technology",
      },
      treatment: "normal",
    };

    const AAPL: TopologyHoverTarget = {
      node: {
        symbol: toTicker("AAPL"),
        label: "Apple Inc.",
        kind: "equity",
        cluster: "technology",
      },
      treatment: "normal",
    };

    const mount = (): void => {
      renderWithContext(
        <MarketTopology
          universe={securitiesFixtureView("full")}
          relationships={NO_MEASUREMENT}
          onRetry={() => undefined}
        />,
      );
    };

    it("points the canvas at a hidden description of the keys, by a SECOND id", () => {
      mount();

      const { labelledBy, describedBy } = options();
      expect(labelledBy).toBeDefined();
      expect(describedBy).toBeDefined();
      // **Two ids, not one**: the label is what the picture is and the
      // description is what a reader can do to it. One element cannot carry
      // both.
      expect(describedBy).not.toBe(labelledBy);

      const hint = document.getElementById(describedBy ?? "");
      expect(hint).not.toBeNull();
      // The three mechanisms, and `Escape` beside them. Asserted on the
      // rendered element rather than on the constant, because the id and the
      // text being on the SAME element is the whole claim.
      expect(hint?.textContent).toContain("Arrow keys walk the graph");
      expect(hint?.textContent).toContain("Home and End");
      expect(hint?.textContent).toContain("Enter opens the selected security");
      expect(hint?.textContent).toContain("Escape");
    });

    it("says the keyboard route exists in the drawn idle instruction too", () => {
      mount();

      // Task 6.4.1 shipped this string naming only the pointer, with a
      // docblock saying this task widens it once the keys do something. The
      // wording is the design canvas's own, which 6.4.1 reverted because it
      // was a claim about a mechanism that did not exist.
      expect(
        screen.getByText(
          "Point at a security, or press Tab and the arrow keys.",
        ),
      ).toBeTruthy();
    });

    it("moves focus onto the one anchor when a KEY produced the selection", () => {
      mount();

      select(NVDA, "keyboard");

      const link = screen.getByRole("link");
      // **This is what makes `Enter` the browser's own activation of an
      // `<a href>`** — and therefore what keeps every topology source file
      // free of the `navigate()`/`location.*` calls
      // `one-home-for-imperative-navigation` refuses. A keyboard walk that
      // left focus on the canvas would need this component to implement
      // activation itself.
      expect(document.activeElement).toBe(link);
    });

    it("leaves focus exactly where it was when a POINTER produced it", () => {
      mount();

      select(NVDA, "pointer");

      const link = screen.getByRole("link");
      expect(document.activeElement).not.toBe(link);
      // The reader's hand is already where they want it; pulling the page's
      // focus ring into the plate is a second thing happening for a gesture
      // that asked for one.
      expect(document.activeElement).toBe(document.body);
    });

    it("stops following once the reader goes back to the pointer", () => {
      mount();

      select(NVDA, "keyboard");
      expect(document.activeElement).toBe(screen.getByRole("link"));

      // A click on a different node. The anchor is the SAME element with a new
      // `href`, so a naive implementation that only asked *is something
      // openable* would hold focus there for ever once a keyboard selection
      // had happened.
      (document.activeElement as HTMLElement).blur();
      select(AAPL, "pointer");

      expect(screen.getByRole("link").getAttribute("href")).toBe(
        "/securities/AAPL",
      );
      expect(document.activeElement).toBe(document.body);
    });

    it("does not move focus when the selection is cleared", () => {
      mount();

      select(NVDA, "keyboard");
      select(null, "keyboard");

      // `Escape` is the renderer's: it focuses the canvas BEFORE clearing,
      // precisely because removing a focused element drops focus to the body.
      // There is no anchor left here to focus, and this component must not
      // reach for anything else.
      expect(screen.queryAllByRole("link")).toHaveLength(0);
    });
  });

  /**
   * **What this region ANNOUNCES, and the three things it must not** (Task
   * 6.4.4).
   *
   * The three negatives are the whole risk in this change and each one is a
   * defect somebody would otherwise ship: announcing on a `"band"` re-report
   * (a socket speaking at a listener 6.8–16.1 times a minute), announcing on
   * hover (pointer-move cadence), and writing into the paragraph
   * `applyAnomalyBands` already owns imperatively (two writers, one node).
   * None of the three is visible on screen and none is reachable above jsdom —
   * a browser can see that a `role="status"` element exists and what is in it,
   * but not which of two writers put it there.
   */
  describe("the announcement region — Task 6.4.4", () => {
    beforeEach(() => {
      mountCanvasTopology.mockReset();
      mountCanvasTopology.mockImplementation(fakeMount);
    });

    /** The announcement region itself — the one `role="status"` here. */
    const region = (): HTMLElement => {
      const found = document.querySelectorAll('[role="status"]');
      // **Counted rather than taken first.** The claim is that there is
      // exactly one live region in this component; a second one appearing is
      // `FRONTEND-STATE.md` §7's two-regions hazard arriving here, and a
      // `querySelector` would pick a winner and say nothing about it.
      expect(found).toHaveLength(1);
      const first = found[0];
      if (first === undefined)
        throw new Error("no announcement region was rendered");
      return first as HTMLElement;
    };

    const spoken = (): string => region().textContent;

    /** The structural sentence — `applyAnomalyBands`' own target. */
    const sentence = (): HTMLElement =>
      screen.getByText(/^A graph of every security we track/u);

    const options = (): {
      labelledBy?: string;
      describedBy?: string;
      onHover?: (hovered: TopologyHoverTarget | null) => void;
      onSelect?: (
        selected: TopologyHoverTarget | null,
        source: TopologySelectionSource,
      ) => void;
    } => {
      const found = mountCanvasTopology.mock.calls[0]?.[1] as
        | {
            labelledBy?: string;
            describedBy?: string;
            onHover?: (hovered: TopologyHoverTarget | null) => void;
            onSelect?: (
              selected: TopologyHoverTarget | null,
              source: TopologySelectionSource,
            ) => void;
          }
        | undefined;
      if (found === undefined)
        throw new Error("the renderer was never mounted");
      return found;
    };

    const select = (
      selected: TopologyHoverTarget | null,
      source: TopologySelectionSource,
    ): void => {
      const channel = options().onSelect;
      if (channel === undefined)
        throw new Error("the renderer was mounted with no onSelect channel");
      act(() => {
        channel(selected, source);
      });
    };

    const hover = (hovered: TopologyHoverTarget | null): void => {
      const channel = options().onHover;
      if (channel === undefined)
        throw new Error("the renderer was mounted with no onHover channel");
      act(() => {
        channel(hovered);
      });
    };

    const equity = (
      symbol: string,
      label: string,
      treatment: TopologyAnomalyTreatment | null = "normal",
    ): TopologyHoverTarget => ({
      node: {
        symbol: toTicker(symbol),
        label,
        kind: "equity",
        cluster: "technology",
      },
      treatment,
    });

    const NVDA = equity("NVDA", "NVIDIA Corporation", "extreme");
    const AAPL = equity("AAPL", "Apple Inc.", "normal");

    const mount = (
      ref?: ReturnType<typeof createRef<MarketTopologyHandle>>,
    ): void => {
      renderWithContext(
        <MarketTopology
          universe={securitiesFixtureView("full")}
          relationships={NO_MEASUREMENT}
          onRetry={() => undefined}
          {...(ref === undefined ? {} : { ref })}
        />,
      );
    };

    it("renders one persistent, silent live region on mount, distinct from the structural sentence", () => {
      mount();

      const live = region();

      // **`status`, never `alert`** — a selection is a fact the reader
      // produced, not an interruption they need.
      expect(live.getAttribute("role")).toBe("status");
      // **Silent on arrival.** A region with a sentence already in it on
      // mount announces that sentence on some readers, for a page the reader
      // has only just opened.
      expect(spoken()).toBe("");
      // **A second element, which is this task's whole shape.**
      expect(live).not.toBe(sentence());
      // **And not either of the canvas's own referents.** A live region that
      // is also a label is one element with three meanings.
      const { labelledBy, describedBy } = options();
      expect(live.id).toBe("");
      expect(labelledBy).not.toBe("");
      expect(labelledBy).toBe(sentence().id);
      expect(describedBy).not.toBe(labelledBy);
    });

    it("speaks a pointer selection as the plate's own four facts, in one sentence", () => {
      mount();

      select(NVDA, "pointer");

      // **The same strings as the plate**, read back through the same pure
      // function rather than re-spelled here: a second expected phrasing in
      // this test would be the second vocabulary the implementation refuses.
      const { ticker, name, sector, band } = topologyReadoutLines(NVDA);
      expect(spoken()).toBe(`Selected ${ticker}, ${name}, ${sector}, ${band}.`);
      // Spelled once, flatly, so a reader of this test can see what a
      // listener gets.
      expect(spoken()).toBe(
        "Selected NVDA, NVIDIA Corporation, Technology, extreme.",
      );
    });

    it("speaks a keyboard selection, which is the one a listener actually reaches", () => {
      mount();

      select(AAPL, "keyboard");

      expect(spoken()).toBe("Selected AAPL, Apple Inc., Technology, normal.");
    });

    it("speaks the clear, because a key press that produces silence reads as a key press that did not land", () => {
      mount();

      select(NVDA, "keyboard");
      select(null, "keyboard");

      expect(spoken()).toBe("Selection cleared.");
      // And the plate went back to its idle instruction, which is the half of
      // the same gesture a listener cannot see.
      expect(
        document
          .querySelector("[data-topology-readout]")
          ?.getAttribute("data-topology-readout"),
      ).toBe("idle");
    });

    it("says NOTHING on hover, at either of hover's two cadences", () => {
      mount();

      hover(NVDA);
      expect(spoken()).toBe("");

      hover(AAPL);
      hover(null);
      expect(spoken()).toBe("");

      // And hover over a node while something is selected leaves the
      // SELECTION's sentence standing — the announcement is about what was
      // committed to, not about what the pointer is passing over.
      select(NVDA, "pointer");
      const announced = spoken();
      hover(AAPL);
      hover(null);
      expect(spoken()).toBe(announced);
    });

    it("says nothing on a band re-report — a feed batch is not a reader", () => {
      mount();

      select(NVDA, "keyboard");
      const announced = spoken();

      // **What `setBands` reaches** (`renderer-canvas.ts`: `if (selected !==
      // null) onSelect?.(targetOf(selected), "band")`). The same node, with a
      // different treatment, because the plate's band word must not go stale
      // against the ring beside it.
      select(equity("NVDA", "NVIDIA Corporation", "high"), "band");

      // The plate followed it…
      expect(document.querySelector('[data-readout="band"]')?.textContent).toBe(
        "high",
      );
      // …and the listener was not interrupted. This is the assertion that
      // stops a live feed speaking: without the `source !== "band"` guard it
      // reads `Selected NVDA, NVIDIA Corporation, Technology, high.` here,
      // 6.8–16.1 times a minute.
      expect(spoken()).toBe(announced);
      expect(spoken()).toBe(
        "Selected NVDA, NVIDIA Corporation, Technology, extreme.",
      );
    });

    it("drops the sector clause for a market proxy rather than padding it", () => {
      mount();

      select(
        {
          node: {
            symbol: toTicker("SPY"),
            label: "SPDR S&P 500 ETF Trust",
            kind: "index_etf",
            cluster: null,
          },
          treatment: null,
        },
        "keyboard",
      );

      // Four slots, three facts — the plate reserves the sector line's room
      // silently and a sentence has no room to reserve.
      expect(spoken()).toBe(
        "Selected SPY, SPDR S&P 500 ETF Trust, Benchmarks are not scored.",
      );
    });

    it("empties rather than announcing when a fresh universe takes the selection away", () => {
      // **A retried `GET /securities` landing a new array**, which is the one
      // thing that re-runs the mount effect — and it is not the reader
      // clearing anything, so `Selection cleared.` here would be this region
      // speaking at a listener about a request they never made.
      const universe = securitiesFixtureView("full");
      const { rerender } = renderWithContext(
        <MarketTopology
          universe={universe}
          relationships={NO_MEASUREMENT}
          onRetry={() => undefined}
        />,
      );

      select(NVDA, "keyboard");
      expect(spoken()).not.toBe("");

      rerender(
        <MarketTopology
          // A NEW array by identity, which is what a retry produces.
          universe={securitiesFixtureView("full")}
          relationships={NO_MEASUREMENT}
          onRetry={() => undefined}
        />,
      );

      expect(spoken()).toBe("");
      expect(mountCanvasTopology).toHaveBeenCalledTimes(2);
    });

    /**
     * **The two imperative writers, exercised in one sequence** (Task 6.4.4's
     * own Work item 2).
     *
     * Both write `textContent` outside React's reconciliation, on two
     * paragraphs rendered side by side with no declared children. The failure
     * this is written against is not subtle in its effect and is completely
     * invisible on screen: one writer reaching the other's node leaves a
     * listener either told the graph's structure every time they press an
     * arrow key, or told about a selection when they asked what the picture
     * is.
     */
    it("leaves both sentences correct when a band update lands while a node is selected", () => {
      const handle = createRef<MarketTopologyHandle>();
      mount(handle);

      const structureBefore = sentence().textContent;
      expect(structureBefore).toContain("grouped into");
      expect(structureBefore).not.toContain("extreme");

      select(NVDA, "keyboard");
      const announcedBefore = spoken();

      // **The real route's own path** — `MarketOverview.tsx` reaches
      // `setBands` through this handle on every applied batch, never through
      // a prop.
      act(() => {
        handle.current?.setBands(
          new Map([
            [toTicker("MSFT"), "high"],
            [toTicker("NVDA"), "extreme"],
          ] as const),
        );
      });

      // **The structural sentence moved**, which is what makes the line below
      // a claim about independence rather than about a batch that did
      // nothing.
      const structureAfter = sentence().textContent;
      expect(structureAfter).not.toBe(structureBefore);
      expect(structureAfter).toContain("1 is high");
      expect(structureAfter).toContain("1 is extreme");
      // **And it is still only the structure.** No selection leaked into it.
      expect(structureAfter).not.toContain("Selected");
      expect(structureAfter).not.toContain("NVIDIA Corporation");

      // **The announcement did not move**, and it is still only the
      // selection. The band map above contains `NVDA` — the selected
      // symbol — so a writer that confused the two nodes would be visible
      // here and nowhere else.
      expect(spoken()).toBe(announcedBefore);
      expect(spoken()).toBe(
        "Selected NVDA, NVIDIA Corporation, Technology, extreme.",
      );
      expect(spoken()).not.toContain("grouped into");

      // One mount throughout: neither writer touched the renderer's lifetime.
      expect(mountCanvasTopology).toHaveBeenCalledTimes(1);
      expect(lastDestroy).not.toHaveBeenCalled();
    });
  });

  /**
   * **Where focus goes when the one anchor is removed from under a reader**
   * (Task 6.4.4) — and this block is a **repair** rather than the
   * confirmation it was written to be.
   *
   * It was written to confirm that `Region`'s dropped-focus backstop (Task
   * 4.7.6 — when the element that last held focus inside the region is removed
   * while `document.activeElement` is the body, the region focuses its own
   * `<section>`) still fires now that this region has two focusable things, one
   * of which comes and goes with the selection. **It does not fire, measured,
   * and `renderer-canvas.ts`' `Escape` handler carried a comment saying it
   * does.** `Region`'s recovery is a layout effect on `Region`; the anchor's
   * removal is driven by `openable`, which is `MarketTopology`'s own state, so
   * the re-render that replaces the `<a>` with a `<span>` re-renders this
   * subtree alone and that effect never runs again. Focus lands on `<body>`.
   *
   * **The gesture that reaches it is the pointer crossing a different node
   * while a keyboard reader holds the anchor**, which is this story's own
   * interleaved case and is why the task that added an interleaved spec is the
   * task that found this. `Escape` was already covered — the renderer focuses
   * the canvas *before* clearing — and a click on empty canvas is covered by
   * the browser focusing the `<canvas tabindex="0">` the pointer went down on.
   * Neither covers a plain mouse movement over a 998 px canvas.
   *
   * The recovery is in `MarketTopology`'s `[openable]` effect and is asserted
   * on the renderer's `focus()` call, because jsdom has no canvas to land on.
   * It renders the REAL composition (`MarketOverview.tsx`'s own `<Region
   * name="Market topology">`) rather than a stand-in, because the claim that
   * `Region` does not reach this is a claim about two components' effects.
   */
  describe("the focus the one anchor drops — Task 6.4.4", () => {
    beforeEach(() => {
      mountCanvasTopology.mockReset();
      mountCanvasTopology.mockImplementation(fakeMount);
    });

    const channels = (): {
      onHover?: (value: TopologyHoverTarget | null) => void;
      onSelect?: (
        value: TopologyHoverTarget | null,
        from: TopologySelectionSource,
      ) => void;
    } => {
      const found = mountCanvasTopology.mock.calls.at(-1)?.[1] as
        | {
            onHover?: (value: TopologyHoverTarget | null) => void;
            onSelect?: (
              value: TopologyHoverTarget | null,
              from: TopologySelectionSource,
            ) => void;
          }
        | undefined;
      if (found === undefined)
        throw new Error("the renderer was never mounted");
      return found;
    };

    const select = (
      selected: TopologyHoverTarget | null,
      source: TopologySelectionSource,
    ): void => {
      const onSelect = channels().onSelect;
      if (onSelect === undefined)
        throw new Error("the renderer was mounted with no onSelect channel");
      act(() => {
        onSelect(selected, source);
      });
    };

    const hover = (hovered: TopologyHoverTarget | null): void => {
      const onHover = channels().onHover;
      if (onHover === undefined)
        throw new Error("the renderer was mounted with no onHover channel");
      act(() => {
        onHover(hovered);
      });
    };

    const node = (symbol: string, label: string): TopologyHoverTarget => ({
      node: {
        symbol: toTicker(symbol),
        label,
        kind: "equity",
        cluster: "technology",
      },
      treatment: "normal",
    });

    const NVDA = node("NVDA", "NVIDIA Corporation");
    const AAPL = node("AAPL", "Apple Inc.");

    const composed = (universe: SecuritiesView) => (
      <Region name="Market topology">
        <MarketTopology
          universe={universe}
          relationships={NO_MEASUREMENT}
          onRetry={() => undefined}
        />
      </Region>
    );

    it("puts a keyboard reader back on the canvas when a pointer crossing a different node removes their anchor", () => {
      renderWithContext(composed(securitiesFixtureView("full")));

      select(NVDA, "keyboard");
      // Named by its own ticker — `writeTopologyReadout` wrote the text
      // content as part of the same selection.
      const anchor = screen.getByRole("link", { name: "NVDA" });
      expect(document.activeElement).toBe(anchor);
      expect(lastFocus).not.toHaveBeenCalled();

      // **The reachable gesture.** `topologyOpenableSymbol` answers `null`
      // because the plate is now naming a node that is not the selection, so
      // the anchor must go — and nothing about a pointer move puts focus
      // anywhere.
      hover(AAPL);

      expect(anchor.isConnected).toBe(false);
      expect(screen.queryAllByRole("link")).toHaveLength(0);
      // **Back on the canvas**, which is where `Escape` already puts them.
      expect(lastFocus).toHaveBeenCalledTimes(1);
    });

    it("does not reach Region's own backstop, which is why this repair exists", () => {
      // **The negative that made this a repair.** Asserted rather than
      // described, because the comment that described it was wrong for three
      // days: `Region`'s layout effect does not run in the commit that
      // removes the anchor, so focus is on `<body>` at the moment the
      // recovery is asked for. If a future change ever does make `Region`
      // catch this, THIS test goes red and the recovery can be reconsidered —
      // which is the only way that reconsideration ever gets prompted.
      renderWithContext(composed(securitiesFixtureView("full")));

      select(NVDA, "keyboard");
      hover(AAPL);

      const section = screen.getByRole("region", { name: "Market topology" });
      expect(document.activeElement).not.toBe(section);
    });

    it("takes no focus from a pointer-only reader, who never had any to drop", () => {
      // Task 6.4.3's rule, from the side this repair could have broken: a
      // pointer selection must not move focus, so a pointer gesture that
      // removes the anchor must not produce a focus ring either.
      renderWithContext(composed(securitiesFixtureView("full")));

      select(NVDA, "pointer");
      expect(document.activeElement).toBe(document.body);

      hover(AAPL);

      expect(screen.queryAllByRole("link")).toHaveLength(0);
      expect(lastFocus).not.toHaveBeenCalled();
    });

    it("leaves focus alone where the reader had already moved it elsewhere", () => {
      // The second of the recovery's two conditions: *nobody holds focus*
      // tells the removal having dropped it from the reader having tabbed
      // away under their own steam.
      renderWithContext(
        <>
          {composed(securitiesFixtureView("full"))}
          <button type="button">Somewhere else</button>
        </>,
      );

      select(NVDA, "keyboard");
      const elsewhere = screen.getByRole("button", {
        name: "Somewhere else",
      });
      act(() => {
        elsewhere.focus();
      });

      hover(AAPL);

      expect(document.activeElement).toBe(elsewhere);
      expect(lastFocus).not.toHaveBeenCalled();
    });

    it("puts the reader on the fresh graph's canvas when a retry replaces the universe under them", () => {
      // The second way the anchor goes: the mount effect's cleanup, which
      // destroys the renderer and nulls `openable` together. **Unreachable in
      // a browser today** — a retry is offered only from the failed state,
      // where there is no canvas to have selected anything on — so this is
      // the only level it can be produced at, and it is produced because the
      // recovery is one rule rather than two.
      const { rerender } = renderWithContext(
        composed(securitiesFixtureView("full")),
      );

      select(NVDA, "keyboard");
      const anchor = screen.getByRole("link", { name: "NVDA" });
      expect(document.activeElement).toBe(anchor);

      // A NEW array by identity, which is what a retry produces.
      rerender(composed(securitiesFixtureView("full")));

      expect(anchor.isConnected).toBe(false);
      expect(mountCanvasTopology).toHaveBeenCalledTimes(2);
      // The SECOND renderer's spy — `createFakeRenderer` re-mints `lastFocus`
      // per instance, so this is the new canvas rather than the dead one.
      expect(lastFocus).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * The announced sentence as a pure function (Task 6.4.4) — the vocabulary
   * half, which is checkable without a renderer.
   */
  describe("topologyAnnouncement — Task 6.4.4", () => {
    it("names the act, so a list of four nouns is not all a listener gets", () => {
      expect(
        topologyAnnouncement({
          node: {
            symbol: toTicker("NVDA"),
            label: "NVIDIA Corporation",
            kind: "equity",
            cluster: "technology",
          },
          treatment: "high",
        }),
      ).toBe("Selected NVDA, NVIDIA Corporation, Technology, high.");
    });

    it("states an unscored equity's absence, in the plate's own words", () => {
      expect(
        topologyAnnouncement({
          node: {
            symbol: toTicker("AAPL"),
            label: "Apple Inc.",
            kind: "equity",
            cluster: "technology",
          },
          treatment: "unscored",
        }),
      ).toBe("Selected AAPL, Apple Inc., Technology, Not scored yet.");
    });

    it("says the clear is a clear, rather than saying nothing at all", () => {
      expect(topologyAnnouncement(null)).toBe("Selection cleared.");
    });

    it("spends no second vocabulary — every clause is topologyReadoutLines'", () => {
      // The property rather than the strings: whatever the plate says about a
      // node, the sentence is made of exactly those words.
      const target: TopologyHoverTarget = {
        node: {
          symbol: toTicker("XLK"),
          label: "Technology Select Sector SPDR Fund",
          kind: "sector_etf",
          cluster: "technology",
        },
        treatment: null,
      };

      const lines = topologyReadoutLines(target);
      const announced = topologyAnnouncement(target);

      for (const fact of Object.values(lines)) {
        if (fact !== "") expect(announced).toContain(fact);
      }
    });
  });

  /**
   * The one-anchor rule, as a pure function — three answers, two of them
   * `null` (Task 6.4.2).
   */
  describe("topologyOpenableSymbol — Task 6.4.2", () => {
    const at = (symbol: string): TopologyHoverTarget => ({
      node: {
        symbol: toTicker(symbol),
        label: `${symbol} Inc.`,
        kind: "equity",
        cluster: "technology",
      },
      treatment: "normal",
    });

    it("offers nothing while nothing is selected, whatever the pointer reads", () => {
      expect(topologyOpenableSymbol(null, null)).toBeNull();
      expect(topologyOpenableSymbol(at("NVDA"), null)).toBeNull();
    });

    it("offers the selection when the pointer has left the canvas", () => {
      // **The state this surface sits in between acts**, because a selection
      // outlives the pointer. If this answered `null` the anchor would vanish
      // the moment a reader moved their hand.
      expect(topologyOpenableSymbol(null, at("NVDA"))).toBe("NVDA");
    });

    it("offers the selection when the selected node is the one being read", () => {
      // Compared by SYMBOL, not identity: `onHover` and `onSelect` each mint a
      // fresh target for the same node when a live `setBands` lands.
      expect(topologyOpenableSymbol(at("NVDA"), at("NVDA"))).toBe("NVDA");
    });

    it("offers NOTHING while the pointer reads a different node", () => {
      // An anchor here would point at NVDA under a line reading AAPL — a
      // destination the reader cannot see.
      expect(topologyOpenableSymbol(at("AAPL"), at("NVDA"))).toBeNull();
    });
  });

  /**
   * The vocabulary, as a pure function — the half of this surface jsdom can
   * check, since the renderer that produces a `TopologyHoverTarget` needs a
   * 2d context (this file's own note at the top).
   */
  describe("topologyReadoutLines — Task 6.4.1", () => {
    /** An equity, with the band under test. */
    const equity = (
      treatment: TopologyAnomalyTreatment | null,
    ): TopologyHoverTarget => ({
      node: {
        symbol: toTicker("JNJ"),
        label: "Johnson & Johnson",
        kind: "equity",
        cluster: "health_care",
      },
      treatment,
    });

    it("takes the ticker and the name off the node, with no join", () => {
      const lines = topologyReadoutLines(equity("normal"));

      expect(lines.ticker).toBe("JNJ");
      expect(lines.name).toBe("Johnson & Johnson");
    });

    it("writes the sector as SECTOR_LABELS writes it, never a transform of the slug", () => {
      // `"Health Care"` and `"Healthcare"` are the same slug and different
      // words, and a string transform picks one silently — `security.ts`'s own
      // note, and the reason this reads the map.
      expect(topologyReadoutLines(equity("normal")).sector).toBe("Health Care");
      expect(topologyReadoutLines(equity("normal")).sector).not.toBe(
        "Health care",
      );
    });

    it("renders each band word verbatim, exactly as AnomalyBadge does", () => {
      for (const band of ["normal", "elevated", "high", "extreme"] as const) {
        expect(topologyReadoutLines(equity(band)).band).toBe(band);
      }
    });

    it("states an unscored equity's absence rather than leaving a blank or reading it as normal", () => {
      // CI's permanent state and every deployment's first ~46 seconds, so the
      // most-drawn line on this surface rather than an edge case.
      expect(topologyReadoutLines(equity("unscored")).band).toBe(
        "Not scored yet",
      );
      expect(topologyReadoutLines(equity(null)).band).toBe("Not scored yet");
      expect(topologyReadoutLines(equity("unscored")).band).not.toBe("normal");
    });

    it("says the fifteen landmarks are not scored, which is a different claim from unscored", () => {
      // Gate 1's Decision 3 excludes them from the encoding entirely, so
      // `unscored` here would claim a failed attempt to score something
      // nobody tried to score.
      const sectorEtf = topologyReadoutLines({
        node: {
          symbol: toTicker("XLK"),
          label: "Technology Select Sector SPDR Fund",
          kind: "sector_etf",
          cluster: "technology",
        },
        treatment: null,
      });

      expect(sectorEtf.band).toBe("Benchmarks are not scored");
      expect(sectorEtf.sector).toBe("Technology");
    });

    it("draws no sector line at all for a market proxy, and no placeholder", () => {
      // `cluster === null` is a COMPLETE answer — an index proxy does not
      // belong to a sector — so the slot is empty rather than carrying a dash
      // or the word "none". Its room is still reserved; that is the
      // stylesheet's job.
      const proxy = topologyReadoutLines({
        node: {
          symbol: toTicker("QQQ"),
          label: "Invesco QQQ Trust",
          kind: "index_etf",
          cluster: null,
        },
        treatment: null,
      });

      expect(proxy.sector).toBe("");
      expect(proxy.band).toBe("Benchmarks are not scored");
      expect(proxy.ticker).toBe("QQQ");
    });
  });

  describe("topologyReadoutLines' live facts — Task 6.7.3", () => {
    const bar = (startsAt: string, close: number): Bar => ({
      startsAt: new Date(startsAt),
      open: close,
      high: close,
      low: close,
      close,
      volume: 1_000,
    });

    /**
     * A PRIOR session's close, deliberately — `changeFromClose`'s own
     * same-session branch reads `previousClose` instead, which this helper
     * does not supply, and the point of this test is the sign rather than
     * which of the two branches produced it.
     */
    const lastClose = (close: number): SecurityLastClose => ({
      symbol: "NVDA",
      session: toMarketDate("2026-11-06"),
      close,
      previousClose: null,
    });

    const equity = (
      treatment: TopologyAnomalyTreatment | null,
    ): TopologyHoverTarget => ({
      node: {
        symbol: toTicker("NVDA"),
        label: "NVIDIA Corporation",
        kind: "equity",
        cluster: "technology",
      },
      treatment,
    });

    it("states an empty staleness line for a node this browser has never heard from", () => {
      expect(
        topologyReadoutLines(equity("extreme"), {
          observations: new Map(),
          lastCloses: new Map(),
        }).staleness,
      ).toBe("");
    });

    it("states the observation INTERVAL'S END, not its start — Task 3.3.4's own fixed defect", () => {
      // A bar stamped 14:01 covers 14:01–14:02 and so has reached us whole a
      // minute later than its own `startsAt` — `measured-set.ts`'s discipline.
      const lines = topologyReadoutLines(equity("extreme"), {
        observations: new Map([
          [toTicker("NVDA"), bar("2026-11-09T19:01:00Z", 101)],
        ]),
        lastCloses: new Map(),
      });

      expect(lines.staleness).toBe("Heard from 14:02");
      expect(lines.staleness).not.toContain("14:01");
    });

    it("states direction for a high/extreme node, never for normal/elevated/unscored", () => {
      const observations = new Map([
        [toTicker("NVDA"), bar("2026-11-09T19:01:00Z", 110)],
      ]);
      const lastCloses = new Map([[toTicker("NVDA"), lastClose(100)]]);

      for (const treatment of ["high", "extreme"] as const) {
        expect(
          topologyReadoutLines(equity(treatment), { observations, lastCloses })
            .direction,
        ).toBe("up");
      }

      for (const treatment of [
        "normal",
        "elevated",
        "unscored",
        null,
      ] as const) {
        expect(
          topologyReadoutLines(equity(treatment), { observations, lastCloses })
            .direction,
        ).toBe("");
      }
    });

    it("reads the sign from changeFromClose, not from a magnitude", () => {
      const fallen = topologyReadoutLines(equity("extreme"), {
        observations: new Map([
          [toTicker("NVDA"), bar("2026-11-09T19:01:00Z", 90)],
        ]),
        lastCloses: new Map([[toTicker("NVDA"), lastClose(100)]]),
      });

      expect(fallen.direction).toBe("down");
    });

    it("states no direction when the sign cannot be read — no observation, or no stored close", () => {
      const noObservation = topologyReadoutLines(equity("extreme"), {
        observations: new Map(),
        lastCloses: new Map([[toTicker("NVDA"), lastClose(100)]]),
      });
      expect(noObservation.direction).toBe("");

      const noLastClose = topologyReadoutLines(equity("extreme"), {
        observations: new Map([
          [toTicker("NVDA"), bar("2026-11-09T19:01:00Z", 110)],
        ]),
        lastCloses: new Map(),
      });
      expect(noLastClose.direction).toBe("");
    });

    it("omits both new lines entirely when no live facts are given — every pre-6.7.3 call site", () => {
      const lines = topologyReadoutLines(equity("extreme"));

      expect(lines.staleness).toBe("");
      expect(lines.direction).toBe("");
    });
  });
});

describe("the per-node live facts channel — Task 6.7.3", () => {
  beforeEach(() => {
    mountCanvasTopology.mockReset();
    mountCanvasTopology.mockImplementation(fakeMount);
  });

  const plate = (): HTMLElement => {
    const found = document.querySelector("[data-topology-readout]");
    if (found === null) throw new Error("no readout plate was rendered");
    return found as HTMLElement;
  };

  const line = (field: string): string =>
    plate().querySelector(`[data-readout="${field}"]`)?.textContent ?? "";

  /** See the "selection, and the one way out" describe block's own copy. */
  const channels = (): {
    readonly select: (
      selected: TopologyHoverTarget | null,
      source?: TopologySelectionSource,
    ) => void;
  } => {
    const options = mountCanvasTopology.mock.calls[0]?.[1] as
      | {
          onSelect?: (
            selected: TopologyHoverTarget | null,
            source: TopologySelectionSource,
          ) => void;
        }
      | undefined;
    const select = options?.onSelect;
    if (select === undefined)
      throw new Error("the renderer was mounted without the onSelect channel");
    return {
      select: (selected, source = "pointer") => {
        select(selected, source);
      },
    };
  };

  const NVDA: TopologyHoverTarget = {
    node: {
      symbol: toTicker("NVDA"),
      label: "NVIDIA Corporation",
      kind: "equity",
      cluster: "technology",
    },
    treatment: "extreme",
  };

  it("exposes setObservations on the ref as a no-op while nothing is mounted", () => {
    const ref = createRef<MarketTopologyHandle>();

    render(
      <MarketTopology
        ref={ref}
        universe={{ state: "loading" }}
        relationships={NO_MEASUREMENT}
        onRetry={() => undefined}
      />,
    );

    expect(() => ref.current?.setObservations(new Map())).not.toThrow();
  });

  it("rewrites the plate with fresh staleness when a node is already selected", () => {
    const handle = createRef<MarketTopologyHandle>();

    renderWithContext(
      <MarketTopology
        ref={handle}
        universe={securitiesFixtureView("full")}
        relationships={NO_MEASUREMENT}
        onRetry={() => undefined}
      />,
    );

    act(() => {
      channels().select(NVDA);
    });

    expect(line("staleness")).toBe("");

    act(() => {
      handle.current?.setObservations(
        new Map([
          [
            toTicker("NVDA"),
            {
              startsAt: new Date("2026-11-09T19:01:00Z"),
              open: 101,
              high: 101,
              low: 101,
              close: 101,
              volume: 1_000,
            },
          ],
        ]),
      );
    });

    expect(line("staleness")).toBe("Heard from 14:02");
  });

  it("does not re-mount the renderer across repeated setObservations calls", () => {
    const universe = securitiesFixtureView("full");
    const ref = createRef<MarketTopologyHandle>();

    render(
      <MarketTopology
        ref={ref}
        universe={universe}
        relationships={NO_MEASUREMENT}
        onRetry={() => undefined}
      />,
    );

    expect(mountCanvasTopology).toHaveBeenCalledTimes(1);

    for (let batch = 0; batch < 5; batch += 1) {
      act(() => {
        ref.current?.setObservations(new Map());
      });
    }

    expect(mountCanvasTopology).toHaveBeenCalledTimes(1);
    expect(lastDestroy).not.toHaveBeenCalled();
  });
});

describe("the accessible sentence's measured-edge clause — Task 6.5.2", () => {
  beforeEach(() => {
    mountCanvasTopology.mockReset();
    mountCanvasTopology.mockImplementation(fakeMount);
  });

  const sentence = () =>
    screen.getByText(/^A graph of every security we track/u);

  /** The pass row's own figures, from Task 6.5.1's recorded run. */
  const PASS = {
    observedAt: "2026-09-11T20:00:00.000Z",
    trackedEquities: 501,
    eligibleEquities: 496,
    splitDiscontinuity: 5,
    absent: 0,
    candidatePairs: 122_760,
    computedPairs: 122_760,
    retainedPairs: 2,
    tooFewOverlappingSamples: 0,
    zeroVariance: 0,
    belowSignificance: 20_752,
    retainedN: 5,
    lookbackSessions: 60,
    spanMinutes: 5,
    feed: "sip",
  } as const;

  const measured = (
    correlations: readonly { low: Ticker; high: Ticker; r: number }[],
  ): RelationshipsView => ({ state: "measured", correlations, pass: PASS });

  const universe = () => securitiesFixtureView("full");

  it("says nothing at all while the measurement is in flight", () => {
    // An absence of a clause rather than a clause about an absence: nothing
    // has happened yet, and a sentence saying so is one that will be wrong in
    // 200 ms.
    render(
      <MarketTopology
        universe={universe()}
        relationships={{ state: "loading" }}
        onRetry={() => undefined}
      />,
    );

    expect(sentence().textContent).toBe(
      "A graph of every security we track, grouped into 11 sectors around " +
        "their benchmark ETFs, with the broad market at the centre.",
    );
  });

  it("says the measurement has not been made where no pass has run", () => {
    render(
      <MarketTopology
        universe={universe()}
        relationships={{ state: "never-measured" }}
        onRetry={() => undefined}
      />,
    );

    expect(sentence().textContent).toContain(
      "Which securities move together has not been measured here",
    );
  });

  // Two states, identical ink, different sentences — the distinction ADR
  // 0029's first rule asks this surface to keep, and the whole reason the wire
  // omits `pass` rather than zeroing it.
  it("tells a pass that kept nothing apart from a pass that never ran", () => {
    render(
      <MarketTopology
        universe={universe()}
        relationships={measured([])}
        onRetry={() => undefined}
      />,
    );

    const text = sentence().textContent;

    expect(text).toContain("No pair of securities was related closely");
    // The PRODUCER's population, not a count of what survived to the screen.
    expect(text).toContain("122,760 pairs were measured over 60 trading");
    expect(text).not.toContain("has not been measured here");
  });

  it("states the drawn pairs, the reach and the population it was cut from", () => {
    const pairs = [
      { low: toTicker("AAPL"), high: toTicker("MSFT"), r: 0.8 },
      { low: toTicker("AAPL"), high: toTicker("NVDA"), r: 0.7 },
    ];

    render(
      <MarketTopology
        universe={universe()}
        relationships={measured(pairs)}
        onRetry={() => undefined}
      />,
    );

    const text = sentence().textContent;

    // Two pairs reaching three securities — read off the drawn graph rather
    // than off `pass.retainedPairs`, which is why this is 2 and 3 and not the
    // pass row's own figures.
    expect(text).toContain("2 pairs, reaching 3 of the");
    expect(text).toContain("122,760 pairs measured over 60 trading sessions");
    expect(text).toContain("the strongest 5 kept for each security");
  });

  // **The population beside the word *measured* is the pairs that WERE
  // measured** (Task 6.5.4, found by this story's own Gate 2). Every store
  // that exists today refuses nothing at pair grain, so `candidatePairs` and
  // `computedPairs` coincide and the two fixtures above cannot tell the two
  // figures apart — which is exactly why this one makes them differ. A
  // candidate refused for too little overlap or for zero variance never
  // produced a coefficient, so counting it as measured over-reports the
  // population the cut was made from.
  it("counts the pairs that produced a coefficient, not every candidate", () => {
    const refusing: RelationshipsView = {
      state: "measured",
      correlations: [{ low: toTicker("AAPL"), high: toTicker("MSFT"), r: 0.8 }],
      pass: {
        ...PASS,
        candidatePairs: 122_760,
        computedPairs: 120_000,
        tooFewOverlappingSamples: 2_000,
        zeroVariance: 760,
      },
    };

    render(
      <MarketTopology
        universe={universe()}
        relationships={refusing}
        onRetry={() => undefined}
      />,
    );

    const text = sentence().textContent;

    expect(text).toContain("120,000 pairs measured over 60 trading sessions");
    expect(text).not.toContain("122,760");
  });

  // **Never a per-edge fact and never a ticker.** 1,860 named pairs in a
  // hidden paragraph is a wall rather than a fallback, and it is the one claim
  // on this surface a listener could not check against anything.
  it("names no security in the clause", () => {
    render(
      <MarketTopology
        universe={universe()}
        relationships={measured([
          { low: toTicker("AAPL"), high: toTicker("MSFT"), r: 0.9 },
        ])}
        onRetry={() => undefined}
      />,
    );

    const text = sentence().textContent;
    const clause = text.slice(
      text.indexOf("Securities whose movements are measurably related"),
    );

    expect(clause).not.toContain("AAPL");
    expect(clause).not.toContain("MSFT");
  });

  it("does not count a pair whose endpoint this universe no longer draws", () => {
    // `withCorrelationEdges` drops it, so the sentence must report what is on
    // screen rather than what the pass retained — a reachable state, because a
    // pass that ran last night names every security tracked then.
    render(
      <MarketTopology
        universe={universe()}
        relationships={measured([
          { low: toTicker("AAPL"), high: toTicker("MSFT"), r: 0.8 },
          { low: toTicker("AAPL"), high: toTicker("ZZZZ"), r: 0.9 },
        ])}
        onRetry={() => undefined}
      />,
    );

    expect(sentence().textContent).toContain("1 pair, reaching 2 of the");
  });

  /**
   * **Task 6.6.1, and it is a real wording defect rather than a style
   * preference.** The clause said *Securities that moved together*, which is a
   * universal directional claim the data falsifies: the real retained set
   * holds one negatively-correlated pair (`AES`/`ERIE`, `r = −0.105952`, 1 of
   * 1,860) that moved **oppositely** and is joined by exactly the same edge.
   * The pass retains on `|r|`, so the sentence may claim a relationship and
   * must not claim a direction — and `together`, `in the same direction` and
   * `in step` all do.
   */
  it("claims a relationship rather than a direction, for every drawn pair", () => {
    render(
      <MarketTopology
        universe={universe()}
        relationships={measured([
          // Both signs present, which is the whole point: one sentence covers
          // the pair that rose together and the pair that did not.
          { low: toTicker("AAPL"), high: toTicker("MSFT"), r: 0.9 },
          { low: toTicker("AAPL"), high: toTicker("NVDA"), r: -0.6 },
        ])}
        onRetry={() => undefined}
      />,
    );

    const text = sentence().textContent;

    expect(text).toContain(
      "Securities whose movements are measurably related are joined by a dashed edge",
    );
    expect(text).toContain("2 pairs, reaching 3 of the");

    for (const direction of [
      "moved together",
      "move together are",
      "same direction",
      "in step",
      "opposite",
    ]) {
      expect(text).not.toContain(direction);
    }
  });

  /**
   * **AC 3's non-visual half for the strength encoding** (Task 6.6.1): a
   * weight drawn as a stroke width is invisible to a listener unless the
   * sentence says it exists. In **words** and never as a number — no
   * coefficient, no class name, no count per class: a listener cannot point at
   * one edge to ask which it is, so a per-class figure would be three facts
   * about the picture rather than one about the market.
   */
  it("states the strength encoding in words, and no coefficient anywhere", () => {
    render(
      <MarketTopology
        universe={universe()}
        relationships={measured([
          { low: toTicker("AAPL"), high: toTicker("MSFT"), r: 0.9 },
        ])}
        onRetry={() => undefined}
      />,
    );

    const text = sentence().textContent;

    expect(text).toContain("drawn heavier where the relationship is stronger");
    // The floors, the coefficient and the class vocabulary all stay off the
    // sentence. `0.9` would be this pair's own `r` reaching a listener.
    for (const figure of ["0.9", "0.4139", "0.5496", "correlation", "r ="]) {
      expect(text).not.toContain(figure);
    }
  });

  /**
   * AC 5's second half, which was already satisfied by Task 6.5.2's own
   * closing clause and is asserted here rather than assumed: the drawn set is
   * a **per-security selection**, so a listener cannot infer that an unjoined
   * pair was measured and found weak.
   */
  it("says the drawn set is a per-security selection, not a threshold", () => {
    render(
      <MarketTopology
        universe={universe()}
        relationships={measured([
          { low: toTicker("AAPL"), high: toTicker("MSFT"), r: 0.9 },
        ])}
        onRetry={() => undefined}
      />,
    );

    expect(sentence().textContent).toContain(
      "with the strongest 5 kept for each security",
    );
  });

  it("names the gap when the measurement could not be read, and keeps the graph", () => {
    render(
      <MarketTopology
        universe={universe()}
        relationships={{ state: "failed" }}
        onRetry={() => undefined}
      />,
    );

    expect(sentence().textContent).toContain(
      "Which securities move together could not be read",
    );

    // **The graph is still mounted and the region offers no repair for this**
    // — no second `Try again`, because the universe is fine and nothing on
    // this screen is broken.
    expect(mountCanvasTopology).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: /Try again/u })).toBeNull();
  });

  // **The two-writers defect this task had to avoid.** `applyAnomalyBands`
  // replaces `textContent` wholesale on every live batch, so a clause only the
  // JSX knew about would survive exactly as long as the next batch took to
  // arrive — 6.8–16.1 times a minute on `/`.
  it("survives a live band update rewriting the whole sentence", () => {
    const ref = createRef<MarketTopologyHandle>();

    render(
      <MarketTopology
        ref={ref}
        universe={universe()}
        relationships={measured([
          { low: toTicker("AAPL"), high: toTicker("MSFT"), r: 0.8 },
        ])}
        onRetry={() => undefined}
      />,
    );

    expect(sentence().textContent).toContain("1 pair, reaching 2 of the");

    act(() => {
      ref.current?.setBands(new Map([[toTicker("NVDA"), "high"]]));
    });

    const text = sentence().textContent;

    // Both facts, in one sentence, after the imperative write.
    expect(text).toContain("1 is high");
    expect(text).toContain("1 pair, reaching 2 of the");
  });
});

// **The width-blind over-claim, which is a real defect this story found and
// fixed** (Task 6.8.3, Story 6.8's acceptance criterion 7).
//
// `renderer-canvas.ts` has suppressed the whole correlation batch below
// `TOPOLOGY_SECTOR_LABEL_MIN_SCALE` since Task 6.5.4 — three of the four
// widths this product tests — while the clause beside the canvas went on
// saying *are joined by a dashed edge, drawn heavier where the relationship is
// stronger* at every one of them. A description of ink that is not on the
// canvas, read by the one reader who cannot check it against the picture.
//
// **Everything below is reachable here because the renderer is mocked**: the
// real one needs a 2d context, so the suppression itself is unassertable at
// this level and is `pnpm probe`'s and the degraded spec's. What IS assertable
// is the half that was wrong — that the component asks the renderer, and that
// each of the three answers produces its own words over an identical account.
describe("the measured-edge clause is width-aware — Task 6.8.3", () => {
  beforeEach(() => {
    mountCanvasTopology.mockReset();
  });

  /** A renderer that reports the given answer at mount, or none at all. */
  const mountReporting = (drawn: boolean | null) => {
    mountCanvasTopology.mockImplementation(
      (_container: HTMLElement, options: TopologyRendererOptions) => {
        if (drawn !== null) options.onCorrelationLayer?.(drawn);
        return createFakeRenderer();
      },
    );
  };

  const PASS = {
    observedAt: "2026-09-11T20:00:00.000Z",
    trackedEquities: 501,
    eligibleEquities: 496,
    splitDiscontinuity: 5,
    absent: 0,
    candidatePairs: 122_760,
    computedPairs: 122_760,
    retainedPairs: 2,
    tooFewOverlappingSamples: 0,
    zeroVariance: 0,
    belowSignificance: 20_752,
    retainedN: 5,
    lookbackSessions: 60,
    spanMinutes: 5,
    feed: "sip",
  } as const;

  const MEASURED: RelationshipsView = {
    state: "measured",
    correlations: [
      { low: toTicker("AAPL"), high: toTicker("MSFT"), r: 0.8 },
      { low: toTicker("AAPL"), high: toTicker("NVDA"), r: 0.7 },
    ],
    pass: PASS,
  };

  /** The account of the measurement — the tail all three heads share. */
  const ACCOUNT =
    "2 pairs, reaching 3 of the 503 equities, from 122,760 pairs measured " +
    "over 60 trading sessions with the strongest 5 kept for each security.";

  const sentence = () =>
    screen.getByText(/^A graph of every security we track/u);

  const renderMeasured = () => {
    render(
      <MarketTopology
        universe={securitiesFixtureView("full")}
        relationships={MEASURED}
        onRetry={() => undefined}
      />,
    );
  };

  it("asks the renderer whether the layer is drawn at all, rather than assuming it is", () => {
    mountReporting(true);
    renderMeasured();

    const options = mountCanvasTopology.mock.calls[0]?.[1] as {
      onCorrelationLayer?: (drawn: boolean) => void;
    };

    // **The channel itself**, because the whole defect was its absence: a
    // component that never asks cannot be told, and the sentence it writes is
    // then right at one width out of four by coincidence.
    expect(typeof options.onCorrelationLayer).toBe("function");
  });

  it("claims the dashed edges where the renderer says it drew them", () => {
    mountReporting(true);
    renderMeasured();

    const text = sentence().textContent;

    expect(text).toContain(
      "Securities whose movements are measurably related are joined by a " +
        "dashed edge, drawn heavier where the relationship is stronger:",
    );
    expect(text).toContain(ACCOUNT);
  });

  /**
   * **The test that would have caught the shipped defect.** At 1024, 768 and
   * 390 the real renderer draws no correlation edge at all, and before this
   * task the sentence said it did.
   */
  it("claims no edge at all where the renderer suppressed the layer, and keeps the whole account", () => {
    mountReporting(false);
    renderMeasured();

    const text = sentence().textContent;

    expect(text).toContain(
      "Securities whose movements are measurably related are not drawn at " +
        "this size, where the sector clusters are unlabelled too:",
    );
    // **The measurement is still stated in full** — it is a fact about last
    // night's pass rather than about this viewport, which is the half of the
    // old argument that was right.
    expect(text).toContain(ACCOUNT);
    expect(text).not.toContain("joined by a dashed edge");
    expect(text).not.toContain("drawn heavier");
  });

  /**
   * **`null` is a third answer rather than a default**, and it is permanent
   * for a renderer that threw: jsdom's own state here, and a browser with no
   * 2d context. *Joined by a dashed edge* would be the falsest of the three
   * on a page with no canvas at all.
   */
  it("claims neither where no frame has reported yet", () => {
    mountReporting(null);
    renderMeasured();

    const text = sentence().textContent;

    expect(text).toContain(
      "Securities whose movements are measurably related were measured here:",
    );
    expect(text).toContain(ACCOUNT);
    expect(text).not.toContain("joined by a dashed edge");
    expect(text).not.toContain("not drawn at this size");
  });

  /**
   * **The two-writers collision, a third time** — this file's own standing
   * hazard and Story 6.8's AC 7 in as many words. The clause is composed at
   * render and handed to both writers, so a band batch rewriting
   * `textContent` must not drop the width the renderer reported.
   */
  it("survives a live band update, with the suppressed wording intact", () => {
    mountReporting(false);
    const ref = createRef<MarketTopologyHandle>();

    render(
      <MarketTopology
        ref={ref}
        universe={securitiesFixtureView("full")}
        relationships={MEASURED}
        onRetry={() => undefined}
      />,
    );

    act(() => {
      ref.current?.setBands(new Map([[toTicker("NVDA"), "high"]]));
    });

    const text = sentence().textContent;

    expect(text).toContain("1 is high");
    expect(text).toContain("are not drawn at this size");
    expect(text).not.toContain("joined by a dashed edge");
  });

  /**
   * **A report crossing the threshold rewrites the sentence without
   * re-mounting**, which is what makes this safe to hold in state at all: a
   * reader zooming in at 390 crosses the threshold and the words must follow
   * the picture, with the renderer the reader's pan and zoom live in left
   * exactly where it was.
   */
  it("follows the renderer across a zoom that crosses the threshold, without re-mounting", () => {
    mountReporting(false);
    renderMeasured();

    expect(sentence().textContent).toContain("are not drawn at this size");

    const report = (
      mountCanvasTopology.mock.calls[0]?.[1] as {
        onCorrelationLayer?: (drawn: boolean) => void;
      }
    ).onCorrelationLayer;

    act(() => {
      report?.(true);
    });

    expect(sentence().textContent).toContain("joined by a dashed edge");
    expect(mountCanvasTopology).toHaveBeenCalledTimes(1);
    expect(lastDestroy).not.toHaveBeenCalled();
  });

  /**
   * **The three absence states say nothing about a width**, because there is
   * no ink to be absent: the clause is about a measurement that was never
   * made, kept nothing, or could not be read.
   */
  it("says nothing about a size in any state with no measurement to draw", () => {
    for (const relationships of [
      { state: "loading" },
      { state: "never-measured" },
      { state: "failed" },
    ] as const) {
      mountReporting(false);
      const view = render(
        <MarketTopology
          universe={securitiesFixtureView("full")}
          relationships={relationships}
          onRetry={() => undefined}
        />,
      );

      expect(sentence().textContent).not.toContain("at this size");
      view.unmount();
    }
  });
});

// **The sector filter's channel into this component** (Task 6.8.1).
//
// What this level can prove is *which calls this component makes and when*,
// plus the two strings it writes — which is the half of this behaviour that is
// a decision. jsdom has no 2d context, so what the renderer DRAWS under a
// filter is `overview-market-topology-filter.spec.ts`', and what it hides is
// `topology/filter.test.ts`' (the narrowing is pure) and `walk.test.ts`'
// (the keyboard agrees with it).
describe("the sector filter channel — Task 6.8.1", () => {
  beforeEach(() => {
    mountCanvasTopology.mockReset();
    mountCanvasTopology.mockImplementation(fakeMount);
  });

  /**
   * **One universe, held across every render in this block** — exactly what
   * `use-securities.ts` gives `/` between batches. A fresh
   * `securitiesFixtureView("full")` per render is a NEW array, which is a real
   * reason to re-mount, and a test that built one per render would prove
   * nothing about a filter press. (Found by writing it the other way first:
   * the no-remount assertion below failed with two mounts.)
   */
  const UNIVERSE = securitiesFixtureView("full");
  const universe = () => UNIVERSE;

  /** The structural sentence, by its one stable opening. */
  const sentence = (): HTMLElement =>
    screen.getByText(/^A graph of every security we track/u);

  /** The `role="status"` region — the one live region in this component. */
  const spoken = (): string => {
    const found = document.querySelectorAll('[role="status"]');
    expect(found).toHaveLength(1);
    return found[0]?.textContent ?? "";
  };

  const mountOptions = (): { filter?: TopologyFilterCriterion } =>
    (mountCanvasTopology.mock.calls[0]?.[1] ?? {}) as {
      filter?: TopologyFilterCriterion;
    };

  const selectChannel = (): ((
    selected: TopologyHoverTarget | null,
    source: TopologySelectionSource,
  ) => void) => {
    const found = (
      mountCanvasTopology.mock.calls[0]?.[1] as {
        onSelect?: (
          selected: TopologyHoverTarget | null,
          source: TopologySelectionSource,
        ) => void;
      }
    ).onSelect;
    if (found === undefined)
      throw new Error("the renderer was mounted with no onSelect channel");
    return found;
  };

  const NVDA: TopologyHoverTarget = {
    node: {
      symbol: toTicker("NVDA"),
      label: "NVIDIA Corporation",
      kind: "equity",
      cluster: "technology",
    },
    treatment: "extreme",
  };

  it("mounts with the criterion already in hand, so a shared link's first frame is the narrowed one", () => {
    // **The reason the mount effect reads a ref** — see `sectorFilter`'s own
    // docblock. Without it a cold `/?sector=energy` paints 516 nodes and then
    // removes 480 of them, which is a flash no assertion below a browser
    // would see and every reader of a shared link would.
    renderWithContext(
      <MarketTopology
        universe={universe()}
        relationships={NO_MEASUREMENT}
        filter={readTopologyFilter("?sector=energy")}
        onRetry={() => undefined}
      />,
    );

    expect(mountOptions().filter).toStrictEqual({
      sector: "energy",
      bands: [],
    });
  });

  it("mounts with no criterion when the address names none", () => {
    renderWithContext(
      <MarketTopology
        universe={universe()}
        relationships={NO_MEASUREMENT}
        onRetry={() => undefined}
      />,
    );

    expect(mountOptions().filter).toStrictEqual({ sector: null, bands: [] });
  });

  it("narrows through setFilter rather than re-mounting, and a press does not reset the frame counter", () => {
    // **Story 6.8's rewritten AC 3, on the producer side.** The wire cannot
    // see a re-mount that happens to draw the same picture; the mount call
    // count, the renderer's own identity and `framesDrawn()` can.
    const { rerender } = renderWithContext(
      <MarketTopology
        universe={universe()}
        relationships={NO_MEASUREMENT}
        onRetry={() => undefined}
      />,
    );

    const renderer = mountCanvasTopology.mock.results[0]?.value as
      TopologyRenderer | undefined;
    const framesBefore = renderer?.framesDrawn();

    rerender(
      <MarketTopology
        universe={universe()}
        relationships={NO_MEASUREMENT}
        filter={readTopologyFilter("?sector=energy")}
        onRetry={() => undefined}
      />,
    );

    expect(lastSetFilter).toHaveBeenCalledWith({
      sector: "energy",
      bands: [],
    });
    expect(mountCanvasTopology).toHaveBeenCalledTimes(1);
    expect(mountCanvasTopology.mock.results[0]?.value).toBe(renderer);
    expect(lastDestroy).not.toHaveBeenCalled();
    expect(renderer?.framesDrawn()).toBe(framesBefore);
  });

  it("states the population it narrowed to, in the sentence AND on screen, from one builder", () => {
    renderWithContext(
      <MarketTopology
        universe={universe()}
        relationships={NO_MEASUREMENT}
        filter={readTopologyFilter("?sector=energy")}
        onRetry={() => undefined}
      />,
    );

    const line =
      document.querySelector("[data-topology-filter-line]")?.textContent ?? "";
    expect(line).toContain("Energy");
    expect(line).toContain("we track");

    // **The two FIGURES are what has one home, not the string.** The drawn
    // line and the spoken clause are two renderings of one builder's one
    // answer — the line is the criterion and the count, the clause is that
    // plus what happened to everything else — so the assertion is that the
    // counts agree, which is the thing that could drift.
    const figures = line.match(/\d[\d,]*/gu) ?? [];
    expect(figures).toHaveLength(2);
    expect(sentence().textContent).toContain("Narrowed to Energy");
    for (const figure of figures) {
      expect(sentence().textContent).toContain(figure);
    }
  });

  it("draws no note at all for the whole market", () => {
    renderWithContext(
      <MarketTopology
        universe={universe()}
        relationships={NO_MEASUREMENT}
        onRetry={() => undefined}
      />,
    );

    expect(document.querySelector("[data-topology-filter]")).toBeNull();
    expect(sentence().textContent).not.toContain("Narrowed to");
  });

  it("offers a way back to the whole market, as a link resolved at render", () => {
    renderWithContext(
      <MarketTopology
        universe={universe()}
        relationships={NO_MEASUREMENT}
        filter={readTopologyFilter("?sector=energy&sessions=21")}
        onRetry={() => undefined}
      />,
    );

    const back = screen.getByRole("link", { name: "Show all" });
    // The filter goes and nothing else in the address does.
    expect(back.getAttribute("href")).toBe("/?sessions=21");
  });

  it("draws the whole market and says so when the address names something that is not a sector", () => {
    renderWithContext(
      <MarketTopology
        universe={universe()}
        relationships={NO_MEASUREMENT}
        filter={readTopologyFilter("?sector=Energy")}
        onRetry={() => undefined}
      />,
    );

    expect(mountOptions().filter).toStrictEqual({ sector: null, bands: [] });
    expect(
      document.querySelector("[data-topology-filter-line]")?.textContent,
    ).toBe("Not a sector we track — the whole market is drawn");
    expect(sentence().textContent).toContain("Not a sector we track");
  });

  it("keeps the filter clause through a live band update — the two-writers collision, a third time", () => {
    // AC 7's own named risk: the sentence has two authors, and a clause only
    // the JSX knew about is deleted by the next batch, 6.8–16.1 times a
    // minute.
    const ref = createRef<MarketTopologyHandle>();

    renderWithContext(
      <MarketTopology
        ref={ref}
        universe={universe()}
        relationships={NO_MEASUREMENT}
        filter={readTopologyFilter("?sector=energy")}
        onRetry={() => undefined}
      />,
    );

    act(() => {
      ref.current?.setBands(new Map([[toTicker("NVDA"), "high"]]));
    });

    const text = sentence().textContent;
    expect(text).toContain("1 is high");
    expect(text).toContain("Narrowed to Energy");
  });

  it("announces a selection the filter excluded by NAME, never the generic clearing", () => {
    renderWithContext(
      <MarketTopology
        universe={universe()}
        relationships={NO_MEASUREMENT}
        onRetry={() => undefined}
      />,
    );

    const select = selectChannel();
    act(() => {
      select(NVDA, "pointer");
    });
    expect(spoken()).toContain("Selected NVDA");

    act(() => {
      select(null, "filter");
    });

    expect(spoken()).toBe(
      "NVDA is not in this filter, so the selection was cleared.",
    );
    expect(spoken()).not.toBe("Selection cleared.");
  });

  it("says nothing when a filter clears nothing", () => {
    // A reader who narrows the graph having selected nothing has had nothing
    // taken from them, and a live region speaking about it would be this
    // surface announcing a non-event.
    renderWithContext(
      <MarketTopology
        universe={universe()}
        relationships={NO_MEASUREMENT}
        onRetry={() => undefined}
      />,
    );

    act(() => {
      selectChannel()(null, "filter");
    });

    expect(spoken()).toBe("");
  });

  it("does not drop a keyboard reader to the body when the filter takes their anchor away", () => {
    // **Verified rather than assumed**, which is this task's own Work item:
    // the dropped-focus recovery (`anchorHeldFocus` + `activeElement ===
    // document.body`) was written for the pointer crossing a different node,
    // and a filter clearance is a NEW trigger for the same removal. The
    // reader's hands are on the filter control in the region's chrome, so the
    // correct behaviour is that focus is left exactly where they put it — and
    // the one thing that must not happen is `<body>`.
    renderWithContext(
      <MarketTopology
        universe={universe()}
        relationships={NO_MEASUREMENT}
        onRetry={() => undefined}
      />,
    );

    const select = selectChannel();
    act(() => {
      select(NVDA, "keyboard");
    });

    // The anchor exists and holds focus, which is the state the recovery is
    // written against.
    // Queried by its attribute rather than by role: the anchor's accessible
    // name is written imperatively (the plate's own standing condition, so
    // React's diff never touches these nodes), so at this instant it has none
    // for `getByRole` to match on. `data-ticker` is what the browser specs
    // read it by, for the same reason.
    const anchor = document.querySelector("a[data-ticker]");
    expect(anchor).not.toBeNull();
    expect(document.activeElement).toBe(anchor);

    act(() => {
      select(null, "filter");
    });

    // **The anchor is gone and the existing recovery fired** — which is the
    // answer this test was written to find out rather than to confirm: both
    // of its conditions (`anchorHeldFocus`, and nobody holding focus since)
    // are met by this new trigger, so the reader is put back on the canvas
    // rather than left on `<body>`.
    //
    // **In the real product this path is usually NOT taken, and that is also
    // correct**: a reader who pressed the filter control has focus on that
    // control, so the second condition fails and focus stays where they put
    // it. jsdom has no control here — the press is simulated at the renderer's
    // own callback — so what this level reaches is the `<body>` branch, which
    // is the one that would be the defect.
    //
    // `lastFocus` is a spy, so `document.activeElement` does not actually
    // move here; where focus physically lands is
    // `overview-market-topology-keyboard.spec.ts`'.
    expect(document.querySelector("a[data-ticker]")).toBeNull();
    expect(lastFocus).toHaveBeenCalledTimes(1);
  });
});

// **The band filter's channel into this component** (Task 6.8.2).
//
// A separate block from the sector's because the thing being tested is
// different in kind: a sector criterion is a pure function of the prop, and a
// band criterion's own FIGURES are a cut over the live treatment map — so
// everything here is about the **two writers** of one population note, one at
// reader cadence and one at feed cadence, and about the live region staying
// quiet across both.
//
// What this level cannot reach is which nodes the renderer DRAWS under a band
// cut (jsdom has no 2d context) and whether a selection survives one
// (`renderer-canvas.ts`'s own `renarrow`) — those are
// `topology/filter.test.ts`' and `overview-market-topology-filter.spec.ts`'.
describe("the band filter channel — Task 6.8.2", () => {
  beforeEach(() => {
    mountCanvasTopology.mockReset();
    mountCanvasTopology.mockImplementation(fakeMount);
  });

  const UNIVERSE = securitiesFixtureView("full");
  const universe = () => UNIVERSE;

  const sentence = (): HTMLElement =>
    screen.getByText(/^A graph of every security we track/u);

  const line = (): string =>
    document.querySelector("[data-topology-filter-line]")?.textContent ?? "";

  const spoken = (): string => {
    const found = document.querySelectorAll('[role="status"]');
    expect(found).toHaveLength(1);
    return found[0]?.textContent ?? "";
  };

  const selectChannel = (): ((
    selected: TopologyHoverTarget | null,
    source: TopologySelectionSource,
  ) => void) => {
    const found = (
      mountCanvasTopology.mock.calls[0]?.[1] as {
        onSelect?: (
          selected: TopologyHoverTarget | null,
          source: TopologySelectionSource,
        ) => void;
      }
    ).onSelect;
    if (found === undefined)
      throw new Error("the renderer was mounted with no onSelect channel");
    return found;
  };

  const NVDA: TopologyHoverTarget = {
    node: {
      symbol: toTicker("NVDA"),
      label: "NVIDIA Corporation",
      kind: "equity",
      cluster: "technology",
    },
    treatment: "extreme",
  };

  /** Two real tickers out of the recorded universe, banded. */
  const twoHigh = (): ReadonlyMap<Ticker, TopologyAnomalyTreatment> =>
    new Map([
      [toTicker("NVDA"), "high"],
      [toTicker("AAPL"), "extreme"],
      [toTicker("MSFT"), "normal"],
    ]);

  it("REFUSES before any batch has arrived, rather than drawing an empty market", () => {
    // **The state every fresh mount and every gated run is in**: this browser
    // has been told nothing about scoring, so the cut has no cohort to apply
    // itself to. What React commits is the band-blind account, and it is
    // correct rather than a placeholder.
    renderWithContext(
      <MarketTopology
        universe={universe()}
        relationships={NO_MEASUREMENT}
        filter={readTopologyFilter("?band=high,extreme")}
        onRetry={() => undefined}
      />,
    );

    expect(line()).toBe(
      "Nothing here has been scored yet, so the graph can't be narrowed by band.",
    );
    expect(sentence().textContent).toContain(
      "Nothing here has been scored yet",
    );
    // Never a figure where the refusal belongs.
    expect(line()).not.toMatch(/\d/u);
  });

  it("states the band's own population once a batch has been applied — the FEED-cadence writer", () => {
    const ref = createRef<MarketTopologyHandle>();

    renderWithContext(
      <MarketTopology
        ref={ref}
        universe={universe()}
        relationships={NO_MEASUREMENT}
        filter={readTopologyFilter("?band=high,extreme")}
        onRetry={() => undefined}
      />,
    );

    act(() => {
      ref.current?.setBands(twoHigh());
    });

    // Two of the three banded securities are in the cut, read off the map
    // this component was handed rather than from anything typed.
    expect(line()).toMatch(
      /^2 of the \d+ companies we track are high or extreme$/u,
    );
    expect(sentence().textContent).toContain("Narrowed to high or extreme");
    // And the note is NOT re-mounted, which is the memo boundary's own claim:
    // a batch reaches the renderer imperatively and nothing re-renders.
    expect(mountCanvasTopology).toHaveBeenCalledTimes(1);
  });

  it("rewrites the population on a PRESS, without waiting for the next batch — the reader-cadence writer", () => {
    // **The defect this writer exists to prevent.** React's committed string
    // is band-blind, so without a reader-cadence rewrite a press would read
    // *nothing here has been scored yet* until the next batch arrived — up to
    // nine seconds at the feed's measured cadence, and for ever out of hours.
    const ref = createRef<MarketTopologyHandle>();

    const { rerender } = renderWithContext(
      <MarketTopology
        ref={ref}
        universe={universe()}
        relationships={NO_MEASUREMENT}
        onRetry={() => undefined}
      />,
    );

    act(() => {
      ref.current?.setBands(twoHigh());
    });

    rerender(
      <MarketTopology
        ref={ref}
        universe={universe()}
        relationships={NO_MEASUREMENT}
        filter={readTopologyFilter("?band=extreme")}
        onRetry={() => undefined}
      />,
    );

    // No second `setBands` call anywhere — this is the press alone.
    expect(line()).toMatch(/^1 of the \d+ companies we track are extreme$/u);
    expect(sentence().textContent).toContain("Narrowed to extreme");
  });

  it("puts the band clause INSIDE the sector's population when both are named", () => {
    const ref = createRef<MarketTopologyHandle>();

    renderWithContext(
      <MarketTopology
        ref={ref}
        universe={universe()}
        relationships={NO_MEASUREMENT}
        filter={readTopologyFilter("?sector=technology&band=high,extreme")}
        onRetry={() => undefined}
      />,
    );

    act(() => {
      ref.current?.setBands(twoHigh());
    });

    // `NVDA` and `AAPL` are both technology in the recorded universe, so the
    // intersection is the same two.
    expect(line()).toMatch(
      /companies we track are in Technology, and 2 of those are high or extreme$/u,
    );
  });

  it("says NOTHING in the live region when a live band update moves the population", () => {
    // **The one claim in this task that is about a LISTENER.** The population
    // note is a figure a reader can go and read; a `role="status"` write would
    // interrupt somebody who asked for nothing, 6.8–16.1 times a minute. The
    // note and the live region are two elements and no writer touches both.
    const ref = createRef<MarketTopologyHandle>();

    renderWithContext(
      <MarketTopology
        ref={ref}
        universe={universe()}
        relationships={NO_MEASUREMENT}
        filter={readTopologyFilter("?band=high,extreme")}
        onRetry={() => undefined}
      />,
    );

    act(() => {
      ref.current?.setBands(twoHigh());
    });
    expect(line()).toContain("high or extreme");
    expect(spoken()).toBe("");

    // A second batch with a genuinely different population — the note moves
    // and the region is still silent.
    act(() => {
      ref.current?.setBands(new Map([[toTicker("NVDA"), "high"]]));
    });

    // The CRITERION has not moved — still `high or extreme` — only the
    // population inside it has, which is the whole point of this arm.
    expect(line()).toMatch(
      /^1 of the \d+ companies we track are high or extreme$/u,
    );
    expect(spoken()).toBe("");
  });

  it("does not re-report a SELECTION when a live band update re-reports the same node", () => {
    // `renderer-canvas.ts` calls `onSelect` with source `"band"` after every
    // batch so the plate's word cannot go stale. With a band cut in force
    // that call also carries *your selection survived the recomputation* —
    // and it must still not speak, for the reason one test up.
    renderWithContext(
      <MarketTopology
        universe={universe()}
        relationships={NO_MEASUREMENT}
        filter={readTopologyFilter("?band=extreme")}
        onRetry={() => undefined}
      />,
    );

    const select = selectChannel();
    act(() => {
      select(NVDA, "pointer");
    });
    expect(spoken()).toContain("Selected NVDA");

    const after = spoken();
    act(() => {
      select({ ...NVDA, treatment: "normal" }, "band");
    });

    // **Byte-identical**, which is what *did not speak* means for a live
    // region: a re-written identical string is still a mutation a screen
    // reader may announce, so the assertion is on the write not happening
    // rather than on the text being right.
    expect(spoken()).toBe(after);
    // And the selection is still the reader's — the node did not go with its
    // band.
    expect(
      document.querySelector("a[data-ticker]")?.getAttribute("data-ticker"),
    ).toBe("NVDA");
  });

  it("clears both cuts from one `Show all`", () => {
    renderWithContext(
      <MarketTopology
        universe={universe()}
        relationships={NO_MEASUREMENT}
        filter={readTopologyFilter("?sector=energy&band=high&sessions=21")}
        onRetry={() => undefined}
      />,
    );

    expect(
      screen.getByRole("link", { name: "Show all" }).getAttribute("href"),
    ).toBe("/?sessions=21");
  });

  it("draws the whole market and names the PARAMETER when the address says a band we do not score", () => {
    renderWithContext(
      <MarketTopology
        universe={universe()}
        relationships={NO_MEASUREMENT}
        filter={readTopologyFilter("?band=HIGH")}
        onRetry={() => undefined}
      />,
    );

    expect(mountOptionsOf()).toStrictEqual({ sector: null, bands: [] });
    expect(line()).toBe("Not a band we score — the whole market is drawn");
  });

  /** The mount criterion, read off the one mount call in this block. */
  function mountOptionsOf(): TopologyFilterCriterion | undefined {
    return (
      mountCanvasTopology.mock.calls[0]?.[1] as {
        filter?: TopologyFilterCriterion;
      }
    ).filter;
  }
});
