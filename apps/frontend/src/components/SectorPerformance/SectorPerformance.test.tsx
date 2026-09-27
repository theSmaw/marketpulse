import { act, render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Bar, WireMarketOverview } from "@marketpulse/shared";

import { sectorPerformance } from "../../market/index.js";
import {
  SectorPerformance,
  SectorPerformanceMeta,
} from "./SectorPerformance.js";
import { useOrderHold } from "./use-order-hold.js";

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

  it("draws a held order and keeps each row's own rank with it", () => {
    // **The hold gates the movement, not the ranking**, and this is that
    // sentence as a render: the rows stand where the reader found them and
    // their printed ordinals are current, so the disagreement between the two
    // IS the pending re-order. It is also the same disagreement every other
    // reader sees for 240 ms and does not notice.
    const view = sectorPerformance(frame(2), NO_OBSERVATIONS, NO_SNAPSHOT);
    if (view === undefined) throw new Error("unreadable frame");

    render(<SectorPerformance view={view} pinned={["XLE", "XLK"]} />);

    const rows = screen.getAllByRole("listitem");
    expect(rows[0]?.textContent).toContain("XLE");
    expect(rows[1]?.textContent).toContain("XLK");
    // XLK is still rank 1 — the only ranked row on this frame — while sitting
    // second.
    expect(rows[1]?.textContent).toContain("1");
  });
});

describe("SectorPerformanceMeta", () => {
  const view = (step: 1 | 2 | 5 | 10 = 2) => {
    const read = sectorPerformance(frame(step), NO_OBSERVATIONS, NO_SNAPSHOT);
    if (read === undefined) throw new Error("unreadable frame");
    return read;
  };

  it("counts the RANKED rows rather than the rows", () => {
    // `11 · Ranked` over eleven rows that all say `None stored` is two true
    // halves and one contradiction — the shape that shipped on the market-feed
    // cell for four days. This fixture has two sectors and one rank.
    render(<SectorPerformanceMeta view={view()} held={false} />);

    expect(screen.getByText("1 · Ranked")).toBeDefined();
    expect(screen.queryByText("Order held")).toBeNull();
  });

  it("says nothing at all when nothing is ranked", () => {
    // ADR 0029 as a clause: a claim about data requires data. The **reserve**
    // is the stylesheet's, so an empty slot is the same width as a full one and
    // the badge still moves nothing when it arrives.
    const nothing = sectorPerformance(
      {
        computedAt: "2026-09-25T18:01:00.000Z",
        feeds: [],
        figures: [],
        sectors: [{ state: "unknown", symbol: "XLK" }],
        sectorLadderStep: 1,
      },
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );
    if (nothing === undefined) throw new Error("unreadable frame");

    const { container } = render(
      <SectorPerformanceMeta view={nothing} held={false} />,
    );

    expect(container.textContent).toBe("");
  });

  it("replaces the count with the state while the order is held", () => {
    // One slot, one occupant. `stateMark`'s third consumer and its first
    // reader-caused one — *a state PERSISTS*, and the behaviour IS the absence
    // of animation.
    render(<SectorPerformanceMeta view={view()} held={true} />);

    expect(screen.getByText("Order held")).toBeDefined();
    expect(screen.queryByText("1 · Ranked")).toBeNull();
  });
});

describe("useOrderHold", () => {
  const rows = (...symbols: readonly string[]) =>
    symbols.map((symbol) => ({
      symbol,
      label: symbol,
      rank: 1,
      move: undefined,
      absent: "None stored",
      arrival: undefined,
      basis: "observed:2026-09-25",
    }));

  it("pins the order the reader arrived to, and releases it when they leave", () => {
    const { result, rerender } = renderHook(
      (props: { readonly symbols: readonly string[] }) =>
        useOrderHold(rows(...props.symbols)),
      { initialProps: { symbols: ["XLK", "XLE"] } },
    );

    expect(result.current.held).toBe(false);
    expect(result.current.pinned).toBeUndefined();

    act(() => {
      result.current.onReaderWithin(true);
    });
    expect(result.current.pinned).toEqual(["XLK", "XLE"]);
    expect(result.current.held).toBe(true);

    // The list goes on re-ranking underneath; the pin does not follow it.
    rerender({ symbols: ["XLE", "XLK"] });
    expect(result.current.pinned).toEqual(["XLK", "XLE"]);

    act(() => {
      result.current.onReaderWithin(false);
    });
    expect(result.current.pinned).toBeUndefined();
  });

  it("does not re-pin while the reader is still there", () => {
    // A reader who hovers and then tabs in is one reader, not two holds — the
    // first of the two sources owns the pin, or the order would jump once
    // under a pointer that never left.
    const { result, rerender } = renderHook(
      (props: { readonly symbols: readonly string[] }) =>
        useOrderHold(rows(...props.symbols)),
      { initialProps: { symbols: ["XLK", "XLE"] } },
    );

    act(() => {
      result.current.onReaderWithin(true);
    });
    rerender({ symbols: ["XLE", "XLK"] });
    act(() => {
      result.current.onReaderWithin(true);
    });

    expect(result.current.pinned).toEqual(["XLK", "XLE"]);
  });

  it("holds nothing when there is no list to hold", () => {
    // The badge and the gate are one value, so a hold that cannot pin an order
    // says nothing rather than claiming one: a reader whose pointer is already
    // over the reserved panel when the first frame arrives gets no hold and no
    // badge, and nothing on screen is false.
    const { result } = renderHook(() => useOrderHold(undefined));

    act(() => {
      result.current.onReaderWithin(true);
    });

    expect(result.current.held).toBe(false);
  });
});
