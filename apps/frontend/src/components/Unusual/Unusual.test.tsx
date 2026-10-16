import { act, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { UNUSUAL_ROWS } from "@marketpulse/shared";

import {
  RESERVED_UNUSUAL,
  type SectorRow,
  type UnusualActivity,
} from "../../market/index.js";
import { SAY_NOTHING_ARRIVED_AFTER_MS } from "../MarketProxyStrip/use-waited.js";
// The rows carry ticker links, so these render under a router.
import { renderWithContext } from "../../test-render.js";
import { Unusual, UnusualMeta, UnusualReservation } from "./Unusual.js";

// **What this level cannot see**, stated before anything is asserted, because
// three of this region's four decisions are geometric and jsdom applies no
// stylesheet and computes no layout: the 308 px row, the four restated track
// lists, the 64 px ordinal cell that must not step to 11 px at 390, and the
// one-height claim across every state. Those are `pnpm probe`'s and the
// browser suite's — measured at **342 × 491 / 357 × 491 / 720 × 323 /
// 342 × 323**, identical in six drawn states.
//
// It also cannot see **colour**, structurally: `getTokens()` throws with no
// stylesheet applied. That the direction glyph is tinted and the ordinal is
// not is a browser's claim.
//
// What it CAN see is the markup the accessibility tree is built from, which is
// where this region's two most expensive decisions live: a held pad carries no
// `href`, and the drawn short form has a spoken long twin.

const row = (
  symbol: string,
  rank: number,
  drawn: string,
  direction: "positive" | "negative",
): SectorRow => ({
  symbol,
  label: `${symbol} Corporation`,
  rank,
  move: undefined,
  reading: { drawn, spoken: `${drawn} percentile`, direction },
  absent: undefined,
  basis: "percentile:2026-10-14",
  arrival: undefined,
});

const FIVE: UnusualActivity = {
  rows: [
    row("CTSH", 1, ">99th", "negative"),
    row("NVDA", 2, "99th", "positive"),
    row("AVGO", 3, "98th", "negative"),
    row("CRM", 4, "97th", "positive"),
    row("MNST", 5, "96th", "negative"),
  ],
  nothing: undefined,
};

const THREE: UnusualActivity = {
  rows: FIVE.rows.slice(0, 3),
  nothing: undefined,
};

const NOTHING: UnusualActivity = { rows: [], nothing: "Nothing ranked yet." };

const SHUT: UnusualActivity = {
  rows: [],
  nothing: "Nothing ranked while the market is shut.",
};

describe("the ranked list", () => {
  it("draws one list item per row and pads the rest", () => {
    renderWithContext(<Unusual view={THREE} />);

    // The pads are `aria-hidden` on the `<li>` itself, which is the one place
    // `visibility: hidden` can be stated once for a whole row — and the room
    // is `27N − 1` by construction rather than by a number somebody
    // maintained.
    const items = screen.getAllByRole("listitem", { hidden: true });
    expect(items).toHaveLength(UNUSUAL_ROWS);
  });

  it("makes the ticker the only activatable thing, and a PAD no destination at all", () => {
    // `visibility: hidden` plus `aria-hidden` do nothing whatever to an
    // `href`. `RankedList` leaked eleven invisible `/securities/<slug>`
    // anchors for ten days when one call site passed `held={undefined}` as a
    // hard-coded constant, and the repair needed **two** sites — so the
    // assertion is a COUNT of anchors rather than a check of the attribute.
    renderWithContext(<Unusual view={THREE} />);

    const links = screen.getAllByRole("link", { hidden: true });
    expect(links).toHaveLength(3);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/securities/CTSH",
      "/securities/NVDA",
      "/securities/AVGO",
    ]);
  });

  it("draws the ordinal short and gives a listener the whole phrase", () => {
    renderWithContext(<Unusual view={FIVE} />);

    const list = screen.getByRole("list");

    // Drawn: `>99th`, with no `%` anywhere — one of the four channels that
    // tell a percentile from a price change.
    expect(list.textContent).toContain(">99th");
    expect(list.textContent).not.toContain("%");

    // Spoken: the whole phrase, from the visually-hidden sibling. **Asserted
    // against the CONCATENATION a screen reader is handed** rather than
    // against one element's text, which is this repository's rule for a
    // component that splits a sentence.
    expect(list.textContent).toContain(">99th percentile");
  });

  it("gives the ordinal a direction, which is what tells a crash from a spike", () => {
    // The percentile ranks `Math.abs(percent)`, so without this a −9% and a
    // +9% draw the identical row. **The spoken word is asserted and the
    // glyph is not**: `▲` read aloud is *black up-pointing triangle*, so it
    // is `aria-hidden` and the word carries it — and colour, which jsdom
    // cannot see at all, is only the redundancy.
    renderWithContext(<Unusual view={FIVE} />);

    const rows = screen.getAllByRole("listitem", { hidden: true });
    expect(rows[0]?.textContent).toContain("down");
    expect(rows[1]?.textContent).toContain("up");
  });

  it("names the list by its heading rather than repeating the words", () => {
    // `aria-labelledby` rather than a second copy of the heading's words in
    // an `aria-label` for a listener to meet twice — `RankedList`'s own
    // argument and the reason its `name` prop is a union.
    renderWithContext(<Unusual view={FIVE} />);

    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading.textContent).toMatch(/percentile of its own 60-session/iu);
    expect(screen.getByRole("list").getAttribute("aria-labelledby")).toBe(
      heading.id,
    );
  });

  it("stores the heading in sentence case, because uppercase is the stylesheet's", () => {
    // A string stored uppercase is a string some screen readers spell out a
    // letter at a time.
    renderWithContext(<Unusual view={FIVE} />);
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe(
      "Percentile of its own 60-session history",
    );
  });

  it("draws no band, no chip and no score", () => {
    // Gate 1 decision 1 as markup. The four bands are defined for the
    // composite 0–100 score and this ranks one factor of four, so a chip
    // would read `extreme` on price alone, ten times over.
    renderWithContext(<Unusual view={FIVE} />);

    const text = screen.getByRole("list").textContent;
    for (const band of ["normal", "elevated", "extreme", "score"]) {
      expect(text.toLowerCase()).not.toContain(band);
    }
  });
});

describe("the honest-nothing states", () => {
  it("says the ranking is empty, in this region's own noun", () => {
    renderWithContext(<Unusual view={NOTHING} />);

    expect(screen.getByText("Nothing ranked yet.")).toBeDefined();
    // Not `No moves to rank yet.` (`Movers`'), not `No scores yet.` (AC 11's,
    // stale since Gate 1 removed the score). One noun per region is what
    // tells a reader which region went quiet when two do at once.
    expect(screen.queryByText(/No moves to rank/u)).toBeNull();
    expect(screen.queryByText(/No scores/u)).toBeNull();
  });

  it("says something DIFFERENT when the market is shut, because the repair is different", () => {
    renderWithContext(<Unusual view={SHUT} />);

    expect(
      screen.getByText("Nothing ranked while the market is shut."),
    ).toBeDefined();
  });

  it("keeps the whole list's room in both of them", () => {
    // The sentence is laid OVER the held rows rather than above them: placed
    // above, it would add a line to the region's content, and at 768 and 390
    // the grid row is content-sized so the whole lower page would step.
    renderWithContext(<Unusual view={NOTHING} />);
    expect(screen.getAllByRole("listitem", { hidden: true })).toHaveLength(
      UNUSUAL_ROWS,
    );
  });

  it("claims nothing about the market in either sentence", () => {
    // *Nothing ranked* is a fact about this ranking's input. *Nothing is
    // unusual* would be a statement about 501 companies most of which nobody
    // heard from — the mistake `describeSilence` took a task to undo.
    for (const view of [NOTHING, SHUT]) {
      const { unmount } = renderWithContext(<Unusual view={view} />);
      expect(screen.queryByText(/nothing is unusual/iu)).toBeNull();
      expect(screen.queryByText(/the market did not/iu)).toBeNull();
      unmount();
    }
  });
});

describe("the head slot", () => {
  it("states the bound when the list is full", () => {
    renderWithContext(<UnusualMeta view={FIVE} held={false} />);
    expect(screen.getByText(`Top ${String(UNUSUAL_ROWS)}`)).toBeDefined();
  });

  it("keeps the bound while the list is short, and states NO count", () => {
    // **The count is not here**, and the re-area is what settles it:
    // `Sector performance` says `N of 11 ranked` and Task 5.4.1 put it beside
    // this region on grid row 2, so a second `N of M` at a different
    // denominator over a different set would be **adjacent** — two correct
    // badges reading as one pattern, which is `BreadthLedger`'s own refusal.
    // The three counts this region owes live in the footer (Task 5.4.4).
    //
    // The bound stays on a short list, which is the same judgement the other
    // way: three ranked out of ten is a thin morning rather than an absent
    // answer, and the bound is what tells a reader the list is not truncated.
    renderWithContext(<UnusualMeta view={THREE} held={false} />);

    expect(screen.getByText(`Top ${String(UNUSUAL_ROWS)}`)).toBeDefined();
    expect(screen.queryByText(/of \d+ ranked/u)).toBeNull();
  });

  it("falls silent when nothing was ranked", () => {
    // A bound stated over an empty list reads as a claim about a selection
    // that selected nothing — `MoversMeta`'s and `SectorPerformanceMeta`'s
    // precedent — and the sentence over the held rows already says what is
    // true.
    const { container } = renderWithContext(
      <UnusualMeta view={NOTHING} held={false} />,
    );
    expect(container.textContent.trim()).toBe("");
  });

  it("gives the badge the slot while a reader is in the region", () => {
    // The two strings are one idea — *what this region is doing* — and the
    // louder one is the one that is only true for as long as somebody is
    // reading. They are mutually exclusive in room `.slot` reserves.
    renderWithContext(<UnusualMeta view={FIVE} held />);
    expect(screen.getByText(/order held/iu)).toBeDefined();
    expect(screen.queryByText(`Top ${String(UNUSUAL_ROWS)}`)).toBeNull();
  });

  it("interpolates the bound rather than spelling it", () => {
    // `the-population-is-never-a-literal`'s rule one scale down: a badge
    // saying five over six rows is a lie with no symptom.
    renderWithContext(<UnusualMeta view={FIVE} held={false} />);
    expect(screen.getByText(`Top ${String(UNUSUAL_ROWS)}`)).toBeDefined();
  });
});

describe("the reservation, which is the real component in a hidden box", () => {
  it("holds the list's room and says nothing until the floor elapses", () => {
    vi.useFakeTimers();
    try {
      renderWithContext(<UnusualReservation />);

      // The geometry is there from the first paint — `RESERVED_UNUSUAL` is
      // the empty answer with its room held, and the room comes from the same
      // padding every other state uses.
      expect(screen.getAllByRole("listitem", { hidden: true })).toHaveLength(
        UNUSUAL_ROWS,
      );
      expect(screen.queryByText(/Nothing ranked/u)).toBeNull();

      act(() => {
        vi.advanceTimersByTime(SAY_NOTHING_ARRIVED_AFTER_MS);
      });

      expect(screen.getByText("Nothing ranked yet.")).toBeDefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it("writes the sentence ONCE, because a hidden string is still in `textContent`", () => {
    // The two-box shape's own trap read the other way: the held box renders
    // the real component, so a component deriving its own sentence from
    // `rows.length === 0` would put this region's words on the page twice in
    // the one state where neither is true yet.
    vi.useFakeTimers();
    try {
      const { container } = renderWithContext(<UnusualReservation />);
      act(() => {
        vi.advanceTimersByTime(SAY_NOTHING_ARRIVED_AFTER_MS);
      });

      const occurrences = container.textContent.split(
        "Nothing ranked yet.",
      ).length;
      expect(occurrences - 1).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("names no security and offers no destination", () => {
    // A ranking's membership is an answer rather than a roster, so there is
    // no set to get wrong — and the reserved sector region leaked internal
    // slugs into the accessibility tree for ten days when there was.
    const { container } = renderWithContext(<UnusualReservation />);

    expect(container.querySelectorAll("a")).toHaveLength(0);
    expect(RESERVED_UNUSUAL.rows).toEqual([]);
  });

  it("keeps the held box `aria-hidden` of its own, as a box the sentence is NOT inside", () => {
    // `visibility` is inherited by children that never set it, so the
    // one-box version un-hides the geometry when it reveals the sentence.
    vi.useFakeTimers();
    try {
      const { container } = renderWithContext(<UnusualReservation />);
      act(() => {
        vi.advanceTimersByTime(SAY_NOTHING_ARRIVED_AFTER_MS);
      });

      const sentence = screen.getByText("Nothing ranked yet.");
      const hidden = container.querySelector('[aria-hidden="true"]');

      expect(hidden).not.toBeNull();
      expect(hidden?.contains(sentence)).toBe(false);
      // `{ hidden: true }` because the box is `aria-hidden` and that is the
      // point of it: the default query excludes the accessibility tree's
      // hidden subtree, which is exactly where the geometry is meant to be.
      expect(
        within(hidden as HTMLElement).queryByRole("list", { hidden: true }),
      ).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
