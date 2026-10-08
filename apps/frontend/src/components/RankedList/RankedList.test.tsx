import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  CONNECTION_DESCRIPTIONS,
  FEED_STATUSES,
  MARKET_FEED_DESCRIPTIONS,
} from "@marketpulse/shared";

import type { SectorRow } from "../../market/index.js";
import { RankedList } from "./RankedList.js";

// What a test here can and cannot see, because this component's whole subject
// is a layout.
//
// **No stylesheet is applied in this environment.** jsdom computes no boxes,
// resolves no grid tracks and renders a 144 px label column identically to a
// `max-content` one — so every claim about the tracks, the 8 px mark slot, the
// bar's length and the zero anchor is `pnpm probe`'s and `pnpm e2e`'s, and none
// of it is asserted below.
//
// What is left is what a **screen reader** is handed and what the **structure**
// commits to: the list semantics, DOM order equal to visual order, the printed
// ordinal, the ticker that is the only defence against a permutation, and the
// absence of any connection word.

/** The one basis these rows share — see {@link SectorRow.basis}. */
const BASIS = "observed:2026-09-15";

const row = (
  symbol: string,
  label: string,
  rank: number | undefined,
  percent: number | undefined,
): SectorRow =>
  percent === undefined
    ? {
        symbol,
        label,
        rank: undefined,
        move: undefined,
        absent: "None stored",
        arrival: undefined,
        basis: undefined,
      }
    : {
        symbol,
        label,
        rank,
        move: {
          change: `${percent > 0 ? "+" : "−"}${Math.abs(percent).toFixed(2)}%`,
          direction:
            percent > 0 ? "positive" : percent < 0 ? "negative" : "unchanged",
          percent,
        },
        absent: undefined,
        arrival: undefined,
        // One basis for every ranked row here — a list whose rows disagree about
        // what they measured from is `sector-performance.ts`'s to produce and
        // this file's to draw.
        basis: BASIS,
      };

const THREE: readonly SectorRow[] = [
  row("XLK", "Technology", 1, 1.84),
  row("XLB", "Materials", 2, 0),
  row("XLE", "Energy", 3, -1.27),
];

/** The same three after a frame in which energy ran — every row changes place. */
const REORDERED: readonly SectorRow[] = [
  row("XLE", "Energy", 1, 2.4),
  row("XLK", "Technology", 2, 1.85),
  row("XLB", "Materials", 3, 0.01),
];

const draw = (rows: readonly SectorRow[] = THREE) =>
  render(
    <RankedList
      rows={rows}
      bar={{ kind: "signed", scale: 2 }}
      name="Sectors"
      quietGroup="possible"
    />,
  );

/** The movers use: the bar off, the mover anatomy, no quiet group. */
const drawMovers = (
  rows: readonly SectorRow[] = THREE,
  name: string | { readonly labelledBy: string } = "Gainers",
) =>
  render(
    <RankedList
      rows={rows}
      bar={{ kind: "none" }}
      name={name}
      quietGroup="impossible"
    />,
  );

describe("RankedList", () => {
  it("is a real list, so a listener is told how many items and which one", () => {
    // The rank channel at zero cost — *"list, 3 items, item 2"* from the
    // platform rather than from an announcement, which is one of the three
    // reasons this region has no live region at all.
    draw();

    const list = screen.getByRole("list", { name: "Sectors" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
  });

  it("puts the rows in DOM order equal to the order it was given", () => {
    // **A correctness requirement rather than a preference.** Re-ordering with
    // CSS `order` or `grid-row` would divorce the accessibility tree from the
    // screen and hand a screen reader a *different ranking* — invisible to axe,
    // to jsdom and to a screenshot. Task 4.3.6 inherits this.
    draw();

    const items = screen.getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining("Technology") as unknown as string,
      expect.stringContaining("Materials") as unknown as string,
      expect.stringContaining("Energy") as unknown as string,
    ]);
  });

  it("prints the rank and the ticker on every row", () => {
    // The ordinal is the one channel that survives greyscale, reduced motion, a
    // screenshot and a reader who looked away; the ticker is the only thing on
    // the row that can contradict a **permutation** — eleven correct figures
    // against eleven wrong labels satisfies every arithmetic guard and is
    // invisible in greyscale.
    draw();

    const first = screen.getAllByRole("listitem")[0];
    expect(first?.textContent).toContain("1");
    expect(first?.textContent).toContain("XLK");
  });

  it("hands the direction to a listener in words, and never as a glyph", () => {
    // `PriceChange`'s, not this list's — a second speller is a second thing to
    // keep in step with a palette that differs by 1.04:1 in greyscale.
    draw();

    expect(screen.getAllByRole("listitem")[0]?.textContent).toContain("up ");
    expect(screen.getAllByRole("listitem")[2]?.textContent).toContain("down ");
  });

  it("says words rather than a number where there is no move, and draws no bar", () => {
    // The bar cell is **empty** rather than zero-length: a zero-length band is a
    // claim of no movement, and telling that apart from *we have heard nothing*
    // is the whole job of the anchor tick beside it.
    const { container } = draw([row("XLB", "Materials", undefined, undefined)]);

    expect(screen.getByText("None stored")).toBeTruthy();
    expect(container.querySelectorAll("i")).toHaveLength(0);
  });

  it("draws the anchor tick and nothing else for a reading of exactly zero", () => {
    const { container } = draw([row("XLB", "Materials", 2, 0)]);

    const drawn = container.querySelectorAll("i");
    expect(drawn).toHaveLength(1);
    expect(drawn[0]?.getAttribute("style")).toBeNull();
  });

  it("draws no bar cell at all when the bar is off", () => {
    // Story 4.5's use. The track is absent rather than empty — a track reserved
    // for a picture that is never drawn is 654 px of nothing.
    const { container } = drawMovers();

    expect(container.querySelectorAll("i")).toHaveLength(0);
    expect(screen.getByRole("list", { name: "Gainers" })).toBeTruthy();
  });

  it("names no feed, no venue and no connection word, in any state", () => {
    // Story 3.10's one-home rule. `one-home-for-the-feed-words` guards the
    // literals in the source; this guards the **rendered** output, which is the
    // half a grep cannot see.
    const { container } = draw([
      ...THREE,
      row("XLV", "Health Care", undefined, undefined),
    ]);

    const text = container.textContent;
    for (const status of FEED_STATUSES) {
      expect(text.toLowerCase()).not.toContain(
        CONNECTION_DESCRIPTIONS[status].label.toLowerCase(),
      );
    }
    expect(text).not.toContain(MARKET_FEED_DESCRIPTIONS.iex.label);
    expect(text).not.toContain(MARKET_FEED_DESCRIPTIONS.sip.label);
  });

  it("puts a row with no rank in a SECOND list, never at the tail of the ordered one", () => {
    // Positions 10 and 11 of an `<ol>` are a claim made by markup rather than
    // by prose — a listener is told *item 10 of 11* over a row this product is
    // refusing to rank, and nothing drawn in the rank column reaches that
    // announcement.
    draw([...THREE, row("XLV", "Health Care", undefined, undefined)]);

    const ranked = screen.getByRole("list", { name: "Sectors" });
    expect(within(ranked).getAllByRole("listitem")).toHaveLength(3);
    expect(ranked.tagName).toBe("OL");

    const quiet = screen.getByRole("list", { name: "Not ranked" });
    expect(quiet.tagName).toBe("UL");
    expect(within(quiet).getAllByRole("listitem")).toHaveLength(1);
    expect(within(quiet).getByText("None stored")).toBeTruthy();
  });

  it("draws no ordered list at all when nothing is ranked", () => {
    // CI's permanent state — 518 securities and zero bars, so all eleven are
    // `unknown` there for ever. The eleven rows still render: the set is known
    // from the universe and does not depend on any observation.
    const { container } = draw(
      THREE.map((entry) =>
        row(entry.symbol, entry.label, undefined, undefined),
      ),
    );

    expect(container.querySelector("ol")).toBeNull();
    expect(
      within(screen.getByRole("list", { name: "Not ranked" })).getAllByRole(
        "listitem",
      ),
    ).toHaveLength(3);
  });

  it("prints no ladder tick where no bar was drawn, and keeps the ladder's room", () => {
    // ADR 0029 one clause wider than the figure column: a printed ±2% under
    // rows that drew no bar is a scale for a quantity nothing on screen shows.
    const { container } = draw([row("XLB", "Materials", undefined, undefined)]);

    expect(container.textContent).not.toContain("+2%");
    expect(container.querySelector("i")).toBeNull();
  });

  it("says nothing about a rank in the trailing group beyond the group's own heading", () => {
    // The em dash in the rank column is `aria-hidden`, so what a listener gets
    // from a quiet row is a label, a ticker and the words that stand where a
    // figure would — and the group heading, once.
    draw([...THREE, row("XLV", "Health Care", undefined, undefined)]);

    const quiet = screen.getByRole("list", { name: "Not ranked" });
    const drawn = within(quiet).getAllByRole("listitem")[0]?.textContent ?? "";

    // No ordinal anywhere on the row, in any form — done-when 2, as a rank
    // position rather than as a `0.00%`.
    expect(drawn).not.toMatch(/\d/u);
    expect(drawn).toContain("Health Care");
    expect(drawn).toContain("None stored");
  });

  it("moves a row's own DOM node to its new place rather than rewriting it", () => {
    // **Keyed by `symbol`, never by index**, and this is the assertion that
    // says so: keyed by index React would recycle row 1's element into row 2's
    // content, so the element a reader is hovering would become a different
    // sector under their pointer — and the FLIP would measure a box that never
    // moved. It also destroys any in-flight decay, on exactly the row the
    // reader was looking at.
    //
    // **Nothing here can see the travel**: jsdom computes no layout, so every
    // `offsetTop` is 0 and the treatment inverts nothing. What this level CAN
    // see is the identity of the node, which is what the travel is applied to.
    const { rerender } = draw();

    const energy = screen
      .getAllByRole("listitem")
      .find((item) => item.textContent.includes("XLE"));

    rerender(
      <RankedList
        rows={REORDERED}
        bar={{ kind: "signed", scale: 2 }}
        name="Sectors"
        quietGroup="possible"
      />,
    );

    const after = screen.getAllByRole("listitem");
    expect(after[0]).toBe(energy);
    expect(after[0]?.textContent).toContain("XLE");
  });

  it("leaves no row under a transform, and the DOM order is the new order", () => {
    // The worst outcome of the whole treatment is a row left sitting on its
    // neighbour's line with every printed ordinal correct — which is what
    // would make it survive a review. This level can only see the inline style
    // the effect writes and removes; `overview-sector-order.spec.ts` is where
    // it is seen **at rest in a browser**, in both motion preferences, because
    // jsdom applies no stylesheet and runs no animation.
    const { rerender } = draw();

    rerender(
      <RankedList
        rows={REORDERED}
        bar={{ kind: "signed", scale: 2 }}
        name="Sectors"
        quietGroup="possible"
      />,
    );

    const after = screen.getAllByRole("listitem");
    expect(after.map((item) => item.style.transform)).toEqual(["", "", ""]);
    expect(after.map((item) => item.textContent.includes("XLE"))).toEqual([
      true,
      false,
      false,
    ]);
  });
  it("holds the quiet group's heading room when the group is POSSIBLE and every row is ranked", () => {
    // The reserve, and this is the assertion that says it is **room rather
    // than words**: a hidden string is still in `textContent`, so a reserve
    // reading `Not ranked` in the state where every row *is* ranked would be a
    // false impression one `expect` away from being asserted.
    const { container } = draw();

    const reserved = container.querySelectorAll("p[aria-hidden='true']");
    expect(reserved).toHaveLength(1);
    expect(reserved[0]?.textContent).toBe("\u00a0");
    expect(container.textContent).not.toContain("Not ranked");
  });

  it("draws neither the quiet group nor its reserve when the group is IMPOSSIBLE", () => {
    // Task 4.5.1. Movers' AC 5 says a name with no current observation cannot
    // appear, so the group has zero members in every state there is — and the
    // unconditional reserve is 25 px per list, 50 across two, held for a state
    // that cannot occur. At 390 that is the difference between five rows and
    // four.
    const { container } = drawMovers();

    expect(container.querySelector("p")).toBeNull();
    expect(container.querySelectorAll("ul")).toHaveLength(0);
    expect(container.textContent).not.toContain("Not ranked");
    expect(container.textContent).not.toContain("\u00a0");
  });

  it("draws no quiet row at all under IMPOSSIBLE, rather than ranking one", () => {
    // A keyless row handed to a list that has declared the group impossible is
    // a producer defect, and the two alternatives are both worse than not
    // drawing it: at the tail of the `<ol>` a listener is told *item 4 of 4*
    // over a row this product is refusing to rank, and a second list is the
    // 25 px the declaration exists to refuse.
    const { container } = drawMovers([
      ...THREE,
      row("MU", "Micron Technology", undefined, undefined),
    ]);

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(container.textContent).not.toContain("Micron");
  });

  it("names the list with aria-label for a string and aria-labelledby for a reference", () => {
    // **A union rather than two optional props**, so a caller cannot pass both
    // and no list can carry two names. The reference form exists because
    // movers draws two visible headings: the string form would put a second
    // copy of each heading's words in the markup, which is the duplication this
    // component already refuses for the trailing group's own heading.
    const { unmount } = drawMovers(THREE, "Gainers");
    const named = screen.getByRole("list");
    expect(named.getAttribute("aria-label")).toBe("Gainers");
    expect(named.getAttribute("aria-labelledby")).toBeNull();
    unmount();

    render(<h3 id="losers">Losers</h3>);
    drawMovers(THREE, { labelledBy: "losers" });
    const referenced = screen.getByRole("list");
    expect(referenced.getAttribute("aria-labelledby")).toBe("losers");
    expect(referenced.getAttribute("aria-label")).toBeNull();
    // The words reach a listener from the heading rather than from a second copy.
    expect(screen.getByRole("list", { name: "Losers" })).toBe(referenced);
  });

  it("puts the ticker before the name on a mover row, and after it on a sector row", () => {
    // **DOM order equal to visual order, which is why this is a re-order of the
    // cells rather than a `grid-column`.** The movers row inverts the sector
    // row — `NVDA` means something and `XLK` does not — and placing the cells
    // from CSS instead would draw ticker-then-name while handing a listener
    // name-then-ticker, invisibly to axe, to jsdom and to a screenshot.
    const mover = drawMovers([row("NVDA", "NVIDIA Corporation", 1, 4.21)]);
    const moverCells = [...mover.container.querySelectorAll("li > span")].map(
      (cell) => cell.textContent,
    );
    expect(moverCells.slice(0, 3)).toEqual(["1", "NVDA", "NVIDIA Corporation"]);
    mover.unmount();

    const sector = draw([row("XLK", "Technology", 1, 1.84)]);
    const sectorCells = [...sector.container.querySelectorAll("li > span")].map(
      (cell) => cell.textContent,
    );
    expect(sectorCells.slice(0, 3)).toEqual(["1", "Technology", "XLK"]);
  });
});
