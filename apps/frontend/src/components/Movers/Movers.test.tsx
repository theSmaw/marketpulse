import { act, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MOVERS_PER_SIDE } from "@marketpulse/shared";

import {
  RESERVED_MOVERS,
  directionOf,
  formatChangePercent,
  type MarketMovers,
  type MoversClaim,
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

/**
 * A view as the shipped reader produces one — the strings included.
 *
 * The footer clause and the two per-list sentences are `movers.ts`' and are
 * covered there against real wire sections; what this level owes is that the
 * component **draws** them, in the elements the geometry reserved. So the
 * default is the sentence a real `observed` section produces, and a test that
 * cares about a different state passes its own.
 */
const CLAIM =
  "Of the 503 companies we track, 466 were heard from in the last 5 minutes. Both lists are ranked over those.";

const viewOf = (
  gainers: readonly SectorRow[],
  losers: readonly SectorRow[],
  claim: MoversClaim = { drawn: CLAIM, spoken: CLAIM },
  empties: {
    readonly gainersEmpty?: string;
    readonly losersEmpty?: string;
  } = {},
): MarketMovers => ({
  gainers,
  losers,
  claim,
  gainersEmpty: empties.gainersEmpty,
  losersEmpty: empties.losersEmpty,
});

const BOTH_ENDS: MarketMovers = viewOf(GAINERS, LOSERS);

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
    // **No em dash anywhere in THIS view**, and the sentence this comment used
    // to carry was wrong (corrected 2026-10-08, Task 4.5.8): it said *the only
    // thing that draws one is a rank this component is refusing to print*.
    // `PriceChange`'s glyph for the `unchanged` direction is an em dash too, so
    // the region has **two meanings for one glyph** and what keeps the second
    // out of reach is the producer rather than the renderer. The test below
    // owns that state and says what reaches it.
    expect(container.textContent).not.toContain("—");
    expect(lists()).toHaveLength(2);
  });

  it("draws a display-flat row as a ranked row, which is the renderer's deliberate answer to a producer that sent one", () => {
    // **The state no shipped producer can reach, recorded rather than
    // refused** (Task 4.5.8's third finding).
    //
    // `selectMoversBy` classifies each candidate through `directionOf` on the
    // **displayed** figure, so a row that prints `0.00%` is a candidate for
    // neither end and cannot be in either list; and `readMovers` **does not
    // refuse on sign**, which is the owner's Gate 1 decision and stands — a
    // sign check in the reader would be a second classifier, the thing
    // `one-classifier-for-the-direction-of-a-move` exists to refuse, asserting
    // what check 5 already covers in the only grain that matters.
    //
    // So the state is reachable only from a **rolled-back or foreign
    // producer**, and what it draws is this: an ordinary ranked row, the rank
    // printed, the figure `0.00%`, and `PriceChange`'s `unchanged` glyph — an
    // **em dash**, twelve pixels from where `RankedList` draws the same glyph
    // for *not ranked*. That ambiguity is the reason this test exists: the
    // alternative treatments were both worse. Dropping the row leaves a
    // ranked list with four rows and a reader with no account of the fifth,
    // and drawing it as *not ranked* is a claim about data — the figure is
    // there and it is zero.
    //
    // **What the renderer may not do is disagree with the heading quietly**,
    // and it does not: the row reads `0.00%` under `Gainers`, which is a
    // visible contradiction a reader can see and report. A region that hid it
    // would be the furnished-frame defect with the evidence removed.
    const flat = row("KO", "Coca-Cola Company", 0, 4);

    const { container } = render(
      <Movers view={viewOf([...GAINERS, flat], LOSERS)} />,
    );

    const fourth = within(
      screen.getByRole("list", { name: "Gainers" }),
    ).getAllByRole("listitem")[3];
    expect(fourth?.textContent).toContain("0.00%");
    expect(fourth?.textContent).toContain("unchanged");
    // The glyph, and the one thing that tells it apart from the absence glyph
    // is the spoken word beside it — which is the row still being ranked.
    expect(container.textContent).toContain("—");
    expect(container.textContent).not.toContain("Not ranked");
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
    render(<Movers view={viewOf([], [])} />);

    for (const list of lists()) {
      expect(list.children).toHaveLength(MOVERS_PER_SIDE);
      expect(within(list).queryAllByRole("listitem")).toHaveLength(0);
    }
  });

  it("writes the denominator in the footer's reserved room, reachable by a listener", () => {
    // **Task 4.5.6.** The sentence is the region's only denominator and the
    // region draws no ladder, so a listener's only route to it is this
    // element — and three of its siblings legitimately carry `aria-hidden`,
    // which is what makes a sweep the plausible edit.
    const { container } = render(<Movers view={BOTH_ENDS} />);

    const claim = container.querySelector("p");
    expect(claim?.textContent).toBe(CLAIM);
    expect(claim?.closest("[aria-hidden]")).toBeNull();
  });

  it("draws one element when the two renderings are equal, and two when they are not", () => {
    // Equal is the state the region is in today: nothing printed here states
    // the denominator, so the drawn half has nothing to defer to. One element,
    // because an identical string across a hidden span and a spoken one is in
    // `textContent` twice and reads as a duplicate to anything walking the DOM.
    const { container, rerender } = render(<Movers view={BOTH_ENDS} />);

    expect(container.querySelectorAll("p > span")).toHaveLength(0);

    // And the pair is real rather than ornamental: the day a printed figure in
    // this region states the denominator, the drawn half shortens and the
    // spoken half may not.
    rerender(
      <Movers
        view={viewOf(GAINERS, LOSERS, {
          drawn: "Ranked over the names we heard from.",
          spoken: CLAIM,
        })}
      />,
    );

    const [drawn, spoken] = [...container.querySelectorAll("p > span")];
    expect(drawn?.getAttribute("aria-hidden")).toBe("true");
    expect(spoken?.textContent).toBe(CLAIM);
    expect(spoken?.hasAttribute("aria-hidden")).toBe(false);
  });

  it("says what an empty list is, in the room the held rows already hold", () => {
    // The one-sided market: five gainers, no losers. The sentence claims the
    // set we measured rather than the market, and it is a sibling of the list
    // rather than a row in it — so the ten `<li>` elements are untouched and
    // the region's height does not depend on which market turned up.
    const { container } = render(
      <Movers
        view={viewOf(GAINERS, [], undefined, {
          losersEmpty: "None of the names we measured declined.",
        })}
      />,
    );

    expect(
      screen.getByText("None of the names we measured declined."),
    ).toBeDefined();
    expect(container.querySelectorAll("li")).toHaveLength(2 * MOVERS_PER_SIDE);

    // And nothing is said about the side that has rows.
    expect(container.textContent).not.toContain("measured rose");
  });

  it("falls silent in the head slot when nothing was selected", () => {
    // `SectorPerformanceMeta`'s precedent: a bound stated over two empty lists
    // is a claim about a selection that selected nothing, and in that state the
    // footer carries the whole truth. A **short** list keeps it, because the
    // bound is exactly what says the list is not truncated.
    const { container, rerender } = render(
      <MoversMeta view={viewOf([], [])} held={false} />,
    );
    expect(container.textContent).toBe("");

    rerender(<MoversMeta view={viewOf(GAINERS, [])} held={false} />);
    expect(container.textContent).toBe(
      `Top ${String(MOVERS_PER_SIDE)} each way`,
    );
  });

  it("holds room and claims nothing in the reservation", () => {
    // `RESERVED_MOVERS` carries a non-breaking space where the clause goes, for
    // `RESERVED_BREADTH`'s recorded reason: a hidden string is still in
    // `textContent`, and every clause this region can draw is a claim about a
    // set nothing has been counted over.
    expect(RESERVED_MOVERS.claim.drawn).toBe(RESERVED_MOVERS.claim.spoken);
    expect(RESERVED_MOVERS.claim.drawn.trim()).toBe("");
    expect(RESERVED_MOVERS.gainersEmpty).toBeUndefined();
    expect(RESERVED_MOVERS.losersEmpty).toBeUndefined();
  });

  it("says what the lists are a selection of, with the bound interpolated", () => {
    // Never typed: a badge saying five over six rows is a lie with no symptom,
    // which is `the-population-is-never-a-literal`'s rule one scale down.
    render(<MoversMeta view={BOTH_ENDS} held={false} />);

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
        <Movers view={viewOf(inOrder("AAA", "BBB", "CCC"), [])} />,
      );

      const list = container.querySelector("ol");
      if (list === null) throw new Error("the list did not render");
      // Three rows and two pads, which is the arrangement under test.
      expect(list.children).toHaveLength(MOVERS_PER_SIDE);

      const travelled = await travelDuring(list, () => {
        rerender(<Movers view={viewOf(inOrder("CCC", "AAA", "BBB"), [])} />);
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

describe("the hold, at two lists", () => {
  // **One pin across both lists** (Task 4.5.7). What this level can see is the
  // DOM order, which is the order a screen reader is given and the order the
  // FLIP indexes into — it cannot see the motion, which is
  // `overview-movers-hold.spec.ts`'.

  /**
   * A row whose **only** capital letters are its symbol — `the settle with held
   * rows` uses the same trick for the same reason: a real company name is
   * mixed-case and would put the label's capitals in the row's own text.
   */
  const named = (symbol: string, percent: number, rank: number): SectorRow =>
    row(symbol, `${symbol.toLowerCase()} holdings`, percent, rank);

  const UP = [
    named("SMCI", 9.14, 1),
    named("FSLR", 6.72, 2),
    named("NVDA", 3.41, 3),
  ];
  const DOWN = [named("MRNA", -8.37, 1), named("ALB", -5.94, 2)];

  /** Each list's tickers, **in DOM order** — the order a screen reader is given. */
  const tickersIn = (): readonly (readonly string[])[] =>
    screen.getAllByRole("list").map((list) =>
      within(list)
        .getAllByRole("listitem")
        .map((item) => item.textContent.replace(/[^A-Z]/gu, ""))
        .filter((symbol) => symbol !== ""),
    );

  it("applies ONE pin to each list separately, perturbing neither", () => {
    // The frame re-ranked both ends at once: `NVDA` took the gainers' lead and
    // `ALB` the losers'. The reader is holding the order they arrived to, so
    // **neither list moves** — and the fact that the pin holds both lists'
    // symbols is what would show up as a cross-contamination if the `Map` were
    // read per list rather than per symbol.
    const pin = [...UP, ...DOWN].map((entry) => entry.symbol);

    const reranked = viewOf(
      [named("NVDA", 3.41, 1), named("SMCI", 9.14, 2), named("FSLR", 6.72, 3)],
      [named("ALB", -5.94, 1), named("MRNA", -8.37, 2)],
    );

    render(<Movers view={reranked} pinned={pin} />);

    const [gainers, losers] = tickersIn();

    // Gainers occupy pin indices 0..2 and losers 3..4; each list draws its own
    // pinned order and nothing else.
    expect(gainers).toEqual(["SMCI", "FSLR", "NVDA"]);
    expect(losers).toEqual(["MRNA", "ALB"]);
  });

  it("draws a new member of either list in its ranked position", () => {
    // The state 4.3 could not reach: eleven sectors are fixed, so a held list
    // could only permute. A held movers list can have a member **replaced** —
    // 0.22–0.45 a minute, measured — and the pin has never seen the newcomer.
    //
    // Under the rule this replaced (`?? pinned.length + index`) `TSLA` would be
    // drawn **last** with `1` printed beside it, three places below its own
    // number and with no re-order pending for it.
    const pin = [...UP, ...DOWN].map((entry) => entry.symbol);

    const withNewLeader = viewOf(
      [named("TSLA", 11.2, 1), named("SMCI", 9.14, 2), named("FSLR", 6.72, 3)],
      DOWN,
    );

    render(<Movers view={withNewLeader} pinned={pin} />);

    const [gainers, losers] = tickersIn();

    expect(gainers).toEqual(["TSLA", "SMCI", "FSLR"]);
    // And the other list, which had no newcomer, is untouched.
    expect(losers).toEqual(["MRNA", "ALB"]);
  });

  it("holds nothing when no pin is given, which is every state but a reader's", () => {
    // The control. Without this the two assertions above pass against a
    // component that ignores `pinned` and happens to receive a sorted view.
    const reranked = viewOf(
      [named("NVDA", 3.41, 1), named("SMCI", 9.14, 2), named("FSLR", 6.72, 3)],
      [named("ALB", -5.94, 1), named("MRNA", -8.37, 2)],
    );

    render(<Movers view={reranked} />);

    expect(tickersIn()).toEqual([
      ["NVDA", "SMCI", "FSLR"],
      ["ALB", "MRNA"],
    ]);
  });
});

describe("MoversMeta while the order is held", () => {
  it("says `Order held` in the head slot, in place of the bound", () => {
    // **One badge, in the region head, above both lists** — a badge per list
    // would be two speakers who can disagree. And the badge **replaces** the
    // bound rather than joining it, which is `SectorPerformanceMeta`'s decision
    // one region up: the two strings are one idea and the slot holds one.
    render(<MoversMeta view={viewOf(GAINERS, LOSERS)} held />);

    expect(screen.getByText("Order held")).toBeTruthy();
    expect(screen.queryByText(`Top ${String(MOVERS_PER_SIDE)} each way`)).toBe(
      null,
    );
  });

  it("says the bound when nothing is held", () => {
    render(<MoversMeta view={viewOf(GAINERS, LOSERS)} held={false} />);

    expect(screen.queryByText("Order held")).toBe(null);
    expect(
      screen.getByText(`Top ${String(MOVERS_PER_SIDE)} each way`),
    ).toBeTruthy();
  });

  it("says `Order held` even with nothing selected, because the hold is not a claim about data", () => {
    // The bound falls silent at a selection of none (Task 4.5.6) because it
    // reads as a claim about a selection that selected nothing. The badge is
    // **not** a claim about data — it says what the reader is doing — so it
    // speaks wherever the hold is on, and `useOrderHold` cannot pin an empty
    // order anyway.
    render(<MoversMeta view={viewOf([], [])} held />);

    expect(screen.getByText("Order held")).toBeTruthy();
  });
});
