import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Bar, WireMarketOverview } from "@marketpulse/shared";

import { sectorPerformance } from "../../market/index.js";
import { SectorPerformance } from "./SectorPerformance.js";

const NO_OBSERVATIONS = new Map<string, Bar>();
const NO_SNAPSHOT = new Set<string>();

const frame = (step: 1 | 2 | 5 | 10): WireMarketOverview => ({
  computedAt: "2026-09-25T18:01:00.000Z",
  feeds: [],
  figures: [],
  sectors: [
    {
      state: "observed",
      symbol: "XLK",
      at: "2026-09-25T18:01:00.000Z",
      price: 187.67,
      changePercent: 1.84,
    },
    { state: "stored", symbol: "XLE", session: "2026-09-25", close: 96.11 },
  ],
  sectorLadderStep: step,
});

const draw = (step: 1 | 2 | 5 | 10 = 2) => {
  const view = sectorPerformance(frame(step), NO_OBSERVATIONS, NO_SNAPSHOT);
  if (view === undefined)
    throw new Error("the fixture built an unreadable frame");
  return render(<SectorPerformance view={view} />);
};

describe("SectorPerformance", () => {
  it("states the weighting caveat, which is the story's own subtitle", () => {
    draw();

    expect(
      screen.getByText(
        /capitalisation-weighted, not the average of its members/u,
      ),
    ).toBeTruthy();
  });

  it("states the rung the bars are drawn against, from the same value the bars use", () => {
    // AC 2: a length is a claim about a quantity, so the quantity is printed —
    // and it is printed in two places (the ladder and the footer) that read the
    // **same** rung off the frame, so they cannot drift apart.
    const { unmount } = draw(2);
    expect(screen.getByText(/bars to ±2%/u)).toBeTruthy();
    unmount();

    draw(10);
    expect(screen.getByText(/bars to ±10%/u)).toBeTruthy();
  });

  it("does not restate the basis, the instant, the feed or the adjustment", () => {
    // All four are the screen's one source note's or the chrome's, and a second
    // home for any of them is the defect this product has shipped twice.
    const { container } = draw();
    const text = container.textContent;

    expect(text).not.toMatch(
      /change from|EDT|EST|split-adjust|dividend|Market feed|IEX|All US exchanges/iu,
    );
  });

  it("makes no claim about the market and none about membership", () => {
    // The eleven partition the S&P 500 exactly, which is a narrower thing than
    // *the market* — `Market proxies` two hundred pixels above is what speaks
    // for the broad indices.
    const { container } = draw();
    const text = container.textContent;

    expect(text).not.toMatch(/\bthe market\b|constituents?\b|S&P/iu);
  });
});
