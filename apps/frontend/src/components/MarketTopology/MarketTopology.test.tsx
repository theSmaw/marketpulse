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

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  FIXTURE_REQUEST_ID,
  LOADING_UNIVERSE,
  securitiesFixtureRetryingView,
  securitiesFixtureView,
} from "../../fixtures/securities.js";
import { MarketTopology } from "./MarketTopology.js";

/** The `<canvas>` the renderer mounts, or `null`. */
function canvas(): HTMLCanvasElement | null {
  return document.querySelector("canvas");
}

describe("MarketTopology", () => {
  it("says it is reading the universe, and mounts no canvas while it is", () => {
    render(
      <MarketTopology universe={LOADING_UNIVERSE} onRetry={() => undefined} />,
    );

    expect(screen.getByText("Reading the tracked universe.")).toBeDefined();
    expect(canvas()).toBeNull();
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
});
