import { act, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MOVERS_PER_SIDE } from "@marketpulse/shared";

import {
  directionOf,
  formatChangePercent,
  type MarketMovers,
  type SectorRow,
} from "../../market/index.js";
import { SAY_NOTHING_ARRIVED_AFTER_MS } from "../MarketProxyStrip/use-waited.js";
import { RankedList } from "../RankedList/RankedList.js";
import { Movers, MoversMeta, MoversReservation } from "./Movers.js";

// **What this level cannot see**, which is why `pnpm probe` is the other half
// of this task: no stylesheet is applied in jsdom, so the five tracks, the row
// pitch, the two-line footer reserve and `visibility: hidden` itself are all
// invisible here — a held row's strings are still in `textContent` and the
// region's height is unmeasurable. Colour is structurally unassertable by
// design.
//
// What *is* assertable, and is the whole of what this component owes a reader:
// that there are **two lists**, each named by its own visible heading, each
// ranked from 1; that the quiet group and its reserve do not exist; that the
// padding is in the **list** and out of the **accessibility tree**; and that the
// FLIP still travels correctly with pads present — which is the one thing in
// this task that a wrong answer would leave looking right.

const row = (
  symbol: string,
  label: string,
  percent: number,
  rank: number,
): SectorRow => ({
  symbol,
  label,
  rank,
  move: {
    change: formatChangePercent(percent),
    direction: directionOf(percent) ?? "unchanged",
    percent,
  },
  absent: undefined,
  arrival: undefined,
  basis: "observed:2026-10-07",
});

const GAINERS = [
  row("SMCI", "Super Micro Computer, Inc.", 9.14, 1),
  row("FSLR", "First Solar, Inc.", 6.72, 2),
  row("NVDA", "NVIDIA Corporation", 3.41, 3),
];

const LOSERS = [
  row("MRNA", "Moderna, Inc.", -8.37, 1),
  row("ALB", "Albemarle Corporation", -5.94, 2),
];

const BOTH_ENDS: MarketMovers = { gainers: GAINERS, losers: LOSERS };

const lists = () => screen.getAllByRole("list");

describe("Movers", () => {
  it("draws two lists, each named by its own visible heading", () => {
    // **`aria-labelledby` rather than a repeated `aria-label`** — the heading is
    // on screen and a listener gets the same words from the same string, which
    // is `RankedList`'s own argument at its trailing group and the reason its
    // `name` prop is a union. A string here would put a second copy of each
    // heading's words in the markup for a listener to meet twice.
    render(<Movers view={BOTH_ENDS} />);

    expect(screen.getByRole("list", { name: "Gainers" })).toBeDefined();
    expect(screen.getByRole("list", { name: "Losers" })).toBeDefined();

    // Sentence case in the DOM, uppercase on screen — a string stored
    // uppercase is one some screen readers spell out a letter at a time, and
    // the stylesheet owns the appearance.
    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings.map((heading) => heading.textContent)).toEqual([
      "Gainers",
      "Losers",
    ]);
  });

  it("ranks both lists from 1, so neither is subordinate to the other", () => {
    // **The distinction this component is about.** The sector region's trailing
    // group is a demotion — no ordinal at all — and these two are peers: each
    // is a complete answer to its own question, so each counts from 1.
    render(<Movers view={BOTH_ENDS} />);

    const ordinals = (name: string) =>
      within(screen.getByRole("list", { name }))
        .getAllByRole("listitem")
        .map((item) => /^\d+/u.exec(item.textContent)?.[0]);

    expect(ordinals("Gainers").slice(0, 3)).toEqual(["1", "2", "3"]);
    expect(ordinals("Losers").slice(0, 2)).toEqual(["1", "2"]);
  });

  it("renders neither the quiet group nor its reserve", () => {
    // `quietGroup="impossible"`, which is Task 4.5.1's prop and this is the use
    // it was added for: AC 5 says a name with no current observation cannot
    // appear in either list, so the group has zero members in every state there
    // is — and at two lists the unconditional reserve is 50 px held for a group
    // that cannot exist, which in a 389 px budget is five rows against four.
    const { container } = render(<Movers view={BOTH_ENDS} />);

    expect(container.textContent).not.toContain("Not ranked");
    // No em dash anywhere: the only thing that draws one is a rank this
    // component is refusing to print, and it refuses to draw the row instead.
    expect(container.textContent).not.toContain("—");
    expect(lists()).toHaveLength(2);
  });

  it("pads a short list to the bound in the LIST and not in the accessibility tree", () => {
    // **The one-sided day**, which is an ordinary state rather than an edge
    // case. At 768 and 390 the grid row is content-sized and the region **is**
    // its content, so 5 → 2 would shrink it by 81 px and step the whole lower
    // page. The pads are real `<li>`s so the pitch comes from `.row` itself —
    // and they are `aria-hidden` so the padding stays geometry rather than
    // becoming a claim about how many names were ranked.
    render(<Movers view={BOTH_ENDS} />);

    const losers = screen.getByRole("list", { name: "Losers" });

    expect(losers.children).toHaveLength(MOVERS_PER_SIDE);
    expect(within(losers).getAllByRole("listitem")).toHaveLength(LOSERS.length);

    const pads = [...losers.children].filter(
      (child) => child.getAttribute("aria-hidden") === "true",
    );
    expect(pads).toHaveLength(MOVERS_PER_SIDE - LOSERS.length);

    // **They name nothing.** A movers list's membership is an answer, so a pad
    // naming a ticker would put an invented security on the landing page — the
    // failure the sector reservation shipped for ten days, one state over.
    // Every character a pad holds is a non-breaking space or its slot's own
    // ordinal.
    for (const pad of pads) {
      expect(pad.textContent.replace(/[\u00a0\d]/gu, "")).toBe("");
    }
  });

  it("is the same list length with five rows and with none", () => {
    // The height claim as far as this level can see it: the number of `<li>`
    // elements in each list does not depend on the data. The height **itself**
    // is `pnpm probe`'s — jsdom computes no layout.
    render(<Movers view={{ gainers: [], losers: [] }} />);

    for (const list of lists()) {
      expect(list.children).toHaveLength(MOVERS_PER_SIDE);
      expect(within(list).queryAllByRole("listitem")).toHaveLength(0);
    }
  });

  it("holds the footer's room and writes no sentence in it", () => {
    // The denominator is Task 4.5.6's; the 44 px is in this task's budget, so
    // the element exists and is empty. A region that grows when a sentence
    // arrives is the movement three tasks of Story 4.3 designed out.
    const { container } = render(<Movers view={BOTH_ENDS} />);

    const claim = container.querySelector("p");
    expect(claim).not.toBeNull();
    expect(claim?.textContent).toBe("");
  });

  it("says what the lists are a selection of, with the bound interpolated", () => {
    // Never typed: a badge saying five over six rows is a lie with no symptom,
    // which is `the-population-is-never-a-literal`'s rule one scale down.
    render(<MoversMeta />);

    expect(screen.getByText(`Top ${String(MOVERS_PER_SIDE)} each way`));
  });

  it("takes the held geometry out of the accessibility tree", () => {
    const { container } = render(<MoversReservation />);

    // Two boxes, never one: the hidden box is the inner one and is hidden in
    // every state, and the sentence is a sibling in the room it holds —
    // `visibility` is inherited by children that never set it, so showing the
    // sentence on the same element would un-hide ten rows and two headings.
    const hidden = container.querySelector('[aria-hidden="true"]');
    expect(hidden?.firstElementChild).not.toBeNull();
    expect(hidden?.parentElement).toBe(container.firstElementChild);

    // Ten rows of room, and no security named in any of them.
    expect(container.querySelectorAll("li")).toHaveLength(2 * MOVERS_PER_SIDE);
    expect(container.textContent).not.toContain("NVDA");
  });

  it("says nothing until the floor has elapsed, and then says what it has none of", async () => {
    // `useWaited`'s floor reused rather than a fourth one invented — 2,000 ms
    // against a first frame measured at 174–277 ms, so the ordinary load never
    // shows it. What it guards is the terminal state: an unreachable aggregate,
    // where no overview frame is ever written and the reservation is not a
    // flash.
    vi.useFakeTimers();
    try {
      render(<MoversReservation />);
      expect(screen.queryByText("No moves to rank yet.")).toBeNull();

      await act(async () => {
        vi.advanceTimersByTime(SAY_NOTHING_ARRIVED_AFTER_MS + 1);
        await Promise.resolve();
      });

      // **Four regions, four nouns.** The strip has no *prices*, sectors have
      // no *moves*, breadth has no *count*, and this region has nothing to
      // **rank** — which is what tells a reader which region went quiet when
      // two do at once.
      expect(screen.getByText("No moves to rank yet.")).toBeDefined();
      expect(screen.queryByText("No prices yet.")).toBeNull();
      expect(screen.queryByText("No sector moves yet.")).toBeNull();
      expect(screen.queryByText("No count yet.")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

/**
 * **The FLIP with held rows present**, which is the one claim in this task that
 * is wrong invisibly.
 *
 * `useSettle` indexes into `element.children` and reads one array of
 * `offsetTop`s for both ends of the movement, so the array it is handed must be
 * **exactly** the `<ol>`'s children. Hand it the real rows while the list draws
 * real rows plus pads and every `to` position is read off the wrong row: rows
 * travel to places they were never in, with every printed ordinal correct,
 * which is what would make it survive a review.
 *
 * ## Why this is not the existing level's test
 *
 * `RankedList.test.tsx` says in as many words that *nothing here can see the
 * travel*: jsdom computes no layout, so every `offsetTop` is 0 and the
 * treatment inverts nothing. That is true of jsdom and not of the arithmetic —
 * so this test gives `offsetTop` a layout, one row pitch per slot, and reads
 * the transform the effect writes.
 *
 * **The transform is written and removed in one commit**, so there is nothing
 * left to observe afterwards (that is the treatment's own design — no
 * `transitionend`, nothing left under a transform). A `MutationObserver` with
 * `attributeOldValue` is what can see it: each record's `oldValue` is the style
 * attribute *before* that write, so the value written by the inversion appears
 * as the next record's old value. No jsdom internals and no monkey-patched CSS
 * declaration.
 *
 * The browser half of this — a row **at rest** after the travel, in both motion
 * preferences — is `overview-sector-order.spec.ts`'s, and is reachable for
 * movers only once Task 4.5.5 puts the region on a route.
 */
describe("the settle with held rows in the list", () => {
  const PITCH = 27;

  /**
   * A row whose **only** capital letters are its symbol, so a mutation record
   * can be attributed to a row from its own text. A real company name is
   * mixed-case and would put the label's capitals in the same string.
   */
  const identifiable = (
    symbol: string,
    percent: number,
    rank: number,
  ): SectorRow =>
    row(symbol, `${symbol.toLowerCase()} holdings`, percent, rank);

  /** Three rows in the order given, ranked from 1. */
  const inOrder = (...symbols: readonly string[]): readonly SectorRow[] =>
    symbols.map((symbol, index) => identifiable(symbol, 3 - index, index + 1));

  /** A layout: each child sits one pitch below its previous sibling. */
  const giveEveryRowALayout = () => {
    const original = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "offsetTop",
    );

    Object.defineProperty(HTMLElement.prototype, "offsetTop", {
      configurable: true,
      get(this: HTMLElement): number {
        const parent: HTMLElement | null = this.parentElement;
        if (parent === null) return 0;
        return [...parent.children].indexOf(this) * PITCH;
      },
    });

    return () => {
      if (original === undefined) {
        // @ts-expect-error -- jsdom does not implement `offsetTop`, so there
        // is nothing to restore and `delete` is the restoration.
        delete HTMLElement.prototype.offsetTop;
        return;
      }
      Object.defineProperty(HTMLElement.prototype, "offsetTop", original);
    };
  };

  /**
   * Every `translateY` the settle writes during `reorder`, by symbol.
   *
   * The transform is written and removed in **one commit**, so there is
   * nothing left to observe afterwards — that is the treatment's own design.
   * A `MutationObserver` with `attributeOldValue` is what can see it: each
   * record's `oldValue` is the style attribute *before* that write, so the
   * value the inversion wrote appears as the next record's old value.
   */
  const travelDuring = async (
    list: Element,
    reorder: () => void,
  ): Promise<ReadonlyMap<string, readonly string[]>> => {
    const travelled = new Map<string, string[]>();
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        const distance = /translateY\((-?\d+px)\)/u.exec(record.oldValue ?? "");
        const written = distance?.[1];
        if (written === undefined) continue;

        const symbol = (record.target.textContent ?? "").replace(
          /[^A-Z]/gu,
          "",
        );
        // **Distinct values, because one inversion produces two records.** The
        // effect writes the transform and then removes it in the same commit,
        // and the removal's `oldValue` still carries it — so a row inverted
        // once is seen twice. What the assertion is about is the distance, and
        // a row inverted twice by *different* distances would still be caught.
        const seen = travelled.get(symbol) ?? [];
        if (!seen.includes(written)) travelled.set(symbol, [...seen, written]);
      }
    });
    observer.observe(list, {
      attributes: true,
      attributeFilter: ["style"],
      attributeOldValue: true,
      subtree: true,
    });

    reorder();

    // `MutationObserver` delivers on a microtask; every write has already
    // happened synchronously inside the layout effect.
    await Promise.resolve();
    observer.disconnect();

    return travelled;
  };

  /**
   * **The arithmetic the two tests below must both produce.**
   *
   * The third row goes to the top, so it is inverted *down* by two pitches and
   * travels up; the two it overtook were each one slot higher than they are
   * now, so each is inverted up by one pitch.
   */
  const EXPECTED = new Map([
    ["CCC", [`${String(2 * PITCH)}px`]],
    ["AAA", [`-${String(PITCH)}px`]],
    ["BBB", [`-${String(PITCH)}px`]],
  ]);

  it("inverts each moved row by its own distance with pads in the list", async () => {
    const restore = giveEveryRowALayout();

    try {
      const { rerender, container } = render(
        <Movers view={{ gainers: inOrder("AAA", "BBB", "CCC"), losers: [] }} />,
      );

      const list = container.querySelector("ol");
      if (list === null) throw new Error("the list did not render");
      // Three rows and two pads, which is the arrangement under test.
      expect(list.children).toHaveLength(MOVERS_PER_SIDE);

      const travelled = await travelDuring(list, () => {
        rerender(
          <Movers
            view={{ gainers: inOrder("CCC", "AAA", "BBB"), losers: [] }}
          />,
        );
      });

      // **A list whose pads were missing from the array handed to the FLIP
      // would produce none of these three numbers** — every `to` position
      // would be read off the wrong row.
      expect(new Map(travelled)).toEqual(EXPECTED);

      // **No pad ever travels**: two of the five slots are room rather than
      // rows, and a pad holds a position no reader could have read.
      expect([...travelled.keys()].toSorted()).toEqual(["AAA", "BBB", "CCC"]);

      // And nothing is left under a transform — the inverse and its release
      // are one commit, which is why there is no `transitionend` anywhere.
      const after = [...list.children].filter(
        (child): child is HTMLElement => child instanceof HTMLElement,
      );
      expect(after.map((item) => item.style.transform)).toEqual([
        "",
        "",
        "",
        "",
        "",
      ]);
    } finally {
      restore();
    }
  });

  it("reads the same distances with no pads at all", async () => {
    // **The control**, and it is what makes the test above evidence rather
    // than a transcript: the same permutation over an unpadded list must
    // produce the same three distances, because the pads sit at the tail and a
    // row's slot does not depend on how many slots follow it. If this pair
    // ever disagrees, the padding has started to move the rows.
    const restore = giveEveryRowALayout();

    try {
      const list = (rows: readonly SectorRow[]) => (
        <RankedList
          rows={rows}
          bar={{ kind: "none" }}
          name="Gainers"
          quietGroup="impossible"
        />
      );

      const { rerender, container } = render(
        list(inOrder("AAA", "BBB", "CCC")),
      );
      const drawn = container.querySelector("ol");
      if (drawn === null) throw new Error("the list did not render");
      expect(drawn.children).toHaveLength(3);

      const travelled = await travelDuring(drawn, () => {
        rerender(list(inOrder("CCC", "AAA", "BBB")));
      });

      expect(new Map(travelled)).toEqual(EXPECTED);
    } finally {
      restore();
    }
  });
});
