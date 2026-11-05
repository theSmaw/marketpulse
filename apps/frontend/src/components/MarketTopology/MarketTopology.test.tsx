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

import { toTicker } from "@marketpulse/shared";

import type {
  TopologyAnomalyTreatment,
  TopologyHoverTarget,
  TopologyRenderer,
} from "../../topology/index.js";
import {
  FIXTURE_REQUEST_ID,
  LOADING_UNIVERSE,
  securitiesFixtureRetryingView,
  securitiesFixtureView,
} from "../../fixtures/securities.js";
import { renderWithContext } from "../../test-render.js";
import { SAY_NOTHING_ARRIVED_AFTER_MS } from "../MarketProxyStrip/use-waited.js";
import {
  MarketTopology,
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
let lastDestroy = vi.fn();

/** Same reason as {@link lastDestroy}, for `setBands` (Task 6.3.2). */
let lastSetBands = vi.fn();

function createFakeRenderer(): TopologyRenderer {
  const frames = 1;
  lastDestroy = vi.fn();
  lastSetBands = vi.fn();
  return {
    kind: "canvas",
    resize: vi.fn(),
    reset: vi.fn(),
    setBands: lastSetBands,
    framesDrawn: () => frames,
    destroy: lastDestroy,
  };
}

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
      mountCanvasTopology.mockImplementation(() => createFakeRenderer());
    });

    it("does not re-mount the renderer across several applied batches", () => {
      // **One `universe`, held across every render** — exactly what
      // `use-securities.ts` gives `/` between live-feed batches: the same
      // object by identity, not a fresh one each tick. A test that called
      // `securitiesFixtureView("full")` again per render would prove
      // nothing, because a NEW array would be a real reason to re-mount.
      const universe = securitiesFixtureView("full");

      const { rerender } = render(
        <MarketTopology universe={universe} onRetry={() => undefined} />,
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
          <MarketTopology universe={universe} onRetry={() => undefined} />,
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
  });

  describe("the anomaly-band update channel — Task 6.3.2", () => {
    beforeEach(() => {
      mountCanvasTopology.mockReset();
      mountCanvasTopology.mockImplementation(() => createFakeRenderer());
    });

    it("never calls the renderer's setBands when no bands prop was given — Task 6.3.3's tightened contract", () => {
      render(
        <MarketTopology
          universe={securitiesFixtureView("full")}
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
          bands={bands}
          onRetry={() => undefined}
        />,
      );

      expect(lastSetBands).toHaveBeenCalledTimes(1);

      rerender(
        <MarketTopology
          universe={universe}
          bands={bands}
          onRetry={() => undefined}
        />,
      );

      expect(lastSetBands).toHaveBeenCalledTimes(1);
    });
  });

  describe("the accessible sentence's anomaly content — Task 6.3.4", () => {
    beforeEach(() => {
      mountCanvasTopology.mockReset();
      mountCanvasTopology.mockImplementation(() => createFakeRenderer());
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
      expect(text).toContain("1 are extreme");

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

    it("leaves the plain structural sentence when no bands have ever been applied", () => {
      render(
        <MarketTopology
          universe={securitiesFixtureView("full")}
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
      mountCanvasTopology.mockImplementation(() => createFakeRenderer());
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
          onRetry={() => undefined}
        />,
      );
    };

    it("reserves the plate and draws the idle instruction before anything is hovered", () => {
      mount();

      expect(plate().dataset.topologyReadout).toBe("idle");
      expect(
        screen.getByText("Point at a security to see what it is."),
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
      mountCanvasTopology.mockImplementation(() => createFakeRenderer());
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
      readonly select: (selected: TopologyHoverTarget | null) => void;
    } => {
      const options = mountCanvasTopology.mock.calls[0]?.[1] as
        | {
            onHover?: (hovered: TopologyHoverTarget | null) => void;
            onSelect?: (selected: TopologyHoverTarget | null) => void;
          }
        | undefined;
      const hover = options?.onHover;
      const select = options?.onSelect;
      if (hover === undefined || select === undefined)
        throw new Error("the renderer was mounted without both channels");
      return { hover, select };
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
        screen.getByText("Point at a security to see what it is."),
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
});
