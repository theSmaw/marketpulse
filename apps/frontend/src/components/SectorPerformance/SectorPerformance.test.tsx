import { act, renderHook, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Bar, WireMarketOverview } from "@marketpulse/shared";

import { sectorPerformance } from "../../market/index.js";
import {
  SectorPerformance,
  SectorPerformanceMeta,
  SectorPerformanceReservation,
} from "./SectorPerformance.js";
import { useOrderHold } from "../OrderHeldBadge/use-order-hold.js";

// The rows carry ticker links since Task 4.6.4, so these render under a router.
import { renderWithContext } from "../../test-render.js";

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
  return renderWithContext(<SectorPerformance view={view} />);
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
    // **Both rows are ranked here, deliberately.** A row with no rankable
    // figure is in the trailing group whatever a reader is holding — the hold
    // pins a position inside the ranking, and the quiet group is not part of
    // one — so a pin naming a quiet row can only be tested against a ranking it
    // could actually reach.
    const view = sectorPerformance(
      {
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
          {
            state: "stored",
            symbol: "XLE",
            session: "2026-09-25",
            close: 96.11,
            sessionChangePercent: -0.4,
          },
        ],
        sectorLadderStep: 2,
      },
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );
    if (view === undefined) throw new Error("unreadable frame");

    renderWithContext(
      <SectorPerformance view={view} pinned={["XLE", "XLK"]} />,
    );

    const rows = screen.getAllByRole("listitem");
    expect(rows[0]?.textContent).toContain("XLE");
    expect(rows[1]?.textContent).toContain("XLK");
    // XLK is still rank 1 — the strongest figure on this frame — while sitting
    // second.
    expect(rows[1]?.textContent).toContain("1");
  });
});

describe("SectorPerformance, the honest states", () => {
  it("hides the scale clause where no bar was drawn, and keeps its room", () => {
    // ADR 0029: `bars to ±1%` under eleven rows that drew no bar describes a
    // scale for a quantity nothing on screen shows. Hidden rather than removed,
    // so the sentence wraps the same way in every state — which is why this
    // asserts the attribute rather than the absence of the words.
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

    renderWithContext(<SectorPerformance view={nothing} />);

    expect(screen.getByText(/bars to ±1%/u).getAttribute("aria-hidden")).toBe(
      "true",
    );
  });

  it("states the rung where a bar WAS drawn", () => {
    draw(2);

    expect(
      screen.getByText(/bars to ±2%/u).getAttribute("aria-hidden"),
    ).toBeNull();
  });

  it("holds the region's own geometry before the first frame, and says nothing", () => {
    // `SectorPerformanceReservation`: eleven rows, the ladder's room, the
    // group heading's room and the claim, all of it out of the picture and out
    // of the accessibility tree. A reserved panel is 103 px at 768 and 121 at
    // 390 against 461 and 437 filled, so the state this replaces stepped the
    // whole lower page a moment after it painted.
    const { container } = renderWithContext(<SectorPerformanceReservation />);

    // **The held geometry carries its own `aria-hidden`, on its own box.**
    // Amended 2026-10-07 by Task 4.4.6: this asserted the attribute on
    // `firstElementChild`, which was the one box the reservation used to be —
    // and that arrangement put `visibility: hidden` and its override on the
    // same element, so past the floor the eleven rows un-hid along with it.
    // The assertion's INTENT is unchanged and is the thing that matters: the
    // rows are out of the accessibility tree. It now names the box that holds
    // them rather than whichever box happens to be first.
    const held = container.querySelector("[aria-hidden='true']");
    expect(held).not.toBeNull();
    expect(held?.querySelectorAll("li")).toHaveLength(11);
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(container.querySelectorAll("li")).toHaveLength(11);
    // No figure and no absence word: room, and nothing that reads as a value.
    // What the eleven rows carry is a label and the sector's own slug in the
    // ticker column, both invisible and both out of the accessibility tree —
    // which is what the zero `listitem` roles above says.
    expect(container.textContent).not.toMatch(
      /None stored|No stored close|[+−]\d/u,
    );
  });

  it("holds NO destination, because a sector slug is not a security", () => {
    // **Task 4.6.5's done-when 1, and it was a live defect for a fortnight.**
    // `RESERVED_SECTORS`' `symbol` is the sector's own **slug**, and
    // `RankedList` builds a row's destination with `securityPath(row.symbol)`
    // at render — so the first paint of every load carried eleven
    // `<a href="/securities/technology">`-shaped links to addresses that are
    // not securities. `visibility: hidden` and `aria-hidden` kept them off the
    // screen and out of the accessibility tree and did **nothing** to the
    // hrefs, which is why no assertion in this file saw it.
    //
    // The repair is producer-side: the eleven rows are `held`, which is the one
    // predicate for *is this row a place a reader can go*.
    const { container } = renderWithContext(<SectorPerformanceReservation />);

    expect(container.querySelectorAll("a")).toHaveLength(0);
    // By name, because the slugs are what a naive `securityPath(row.symbol)`
    // builds and a count of zero does not say which eleven it is counting.
    for (const slug of ["technology", "health_care", "financials"]) {
      expect(container.innerHTML).not.toContain(`/securities/${slug}`);
    }
  });
});

describe("SectorPerformanceMeta", () => {
  const view = (step: 1 | 2 | 5 | 10 = 2) => {
    const read = sectorPerformance(frame(step), NO_OBSERVATIONS, NO_SNAPSHOT);
    if (read === undefined) throw new Error("unreadable frame");
    return read;
  };

  it("counts the RANKED rows against the rows there are", () => {
    // `11 of 11 ranked` over eleven rows that all say `None stored` would be
    // two true halves and one contradiction — the shape that shipped on the
    // market-feed cell for four days. This fixture has two sectors and one
    // rank, which is the mixed state and the only one the slot speaks in.
    renderWithContext(<SectorPerformanceMeta view={view()} held={false} />);

    expect(screen.getByText("1 of 2 ranked")).toBeDefined();
    expect(screen.queryByText("Order held")).toBeNull();
  });

  it("says nothing when every row is ranked, because a full count is noise", () => {
    // The denominator is what makes it a claim about the region rather than
    // about the list, and `2 of 2` is a fact nobody needs, permanently.
    const complete = sectorPerformance(
      {
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
          {
            state: "stored",
            symbol: "XLE",
            session: "2026-09-25",
            close: 96.11,
            sessionChangePercent: -0.4,
          },
        ],
        sectorLadderStep: 1,
      },
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );
    if (complete === undefined) throw new Error("unreadable frame");

    const { container } = renderWithContext(
      <SectorPerformanceMeta view={complete} held={false} />,
    );

    expect(container.textContent).toBe("");
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

    const { container } = renderWithContext(
      <SectorPerformanceMeta view={nothing} held={false} />,
    );

    expect(container.textContent).toBe("");
  });

  it("replaces the count with the state while the order is held", () => {
    // One slot, one occupant. `stateMark`'s third consumer and its first
    // reader-caused one — *a state PERSISTS*, and the behaviour IS the absence
    // of animation.
    renderWithContext(<SectorPerformanceMeta view={view()} held={true} />);

    expect(screen.getByText("Order held")).toBeDefined();
    expect(screen.queryByText("1 of 2 ranked")).toBeNull();
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
