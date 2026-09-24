import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { barSeriesFixtureView } from "../../fixtures/bar-series.js";
import {
  LOADING_UNIVERSE,
  securitiesFixtureView,
} from "../../fixtures/securities.js";
import type { MarketFeedView } from "../../use-market-feed.js";
import { SourceNote } from "./SourceNote.js";

// What the note says in each of its shapes, against **recorded** bodies rather
// than hand-built ones (Task 2.14.3) — `BarSeriesPanel.test.tsx`'s rule, and it
// matters more here than anywhere: this component's whole subject is whether a
// claim about the data is true, and a claim checked against a body somebody
// typed is a claim checked against itself.
//
// ## Why these assert a concatenation rather than an element's text
//
// `CLAUDE.md`: *assert the concatenation a screen reader is handed*, never a
// single element's text where a component splits it. This one splits every line
// — a label, a value, a retrieval, a sentence — so `getByText("Unadjusted")`
// would pass against a note whose sentence had silently stopped rendering. The
// definition list is what a listener is handed, so the definition list is what
// is read.

const SIP: MarketFeedView = { state: "configured", feed: "sip" };

/** A security the recorded universe holds. */
const SUBJECT = "NVDA";

/**
 * The universe still in flight, which is what every test below about the
 * **bars** is handed.
 *
 * Not a convenience: the classification clause draws whenever the universe has
 * resolved, so a loaded universe in a test about the feed or the adjustment
 * would put a second claim in every reading and make each assertion about two
 * things. This is a real state — the bars answer first often enough — and it
 * keeps one test to one subject. The clause has its own `describe` below.
 */
const PENDING_UNIVERSE = LOADING_UNIVERSE;

/** The definition beside one term. */
function definitionOf(term: string): HTMLElement {
  const dt = screen.getByText(term, { selector: "dt" });
  const dd = dt.nextElementSibling;

  if (dd === null || !(dd instanceof HTMLElement) || dd.tagName !== "DD") {
    throw new Error(`The ${term} term has no definition beside it.`);
  }

  return dd;
}

/**
 * What a listener is handed for one element.
 *
 * **Not `textContent`**, and the difference is the trap `CLAUDE.md` already
 * names about `e2e/support/app.ts`: `textContent` includes `aria-hidden`
 * content, which no assistive technology reads, and it joins two adjacent
 * elements with nothing at all — so it produced both `Unadjusted·Retrieved`
 * (a decorative separator read as a word) and `2026Prices` (two readings run
 * together) against markup that speaks correctly. This walks the tree the way
 * the accessibility layer does: hidden subtrees skipped, element boundaries
 * worth a space.
 *
 * **With one correction, added by Task 2.14.4 and earned by it.** The
 * classification clause emphasises one word *inside* a sentence, so the walk
 * crosses an element boundary mid-clause and produced `curated , not from the
 * market feed.` — a space before a comma, which no assistive technology
 * inserts and no reader hears. A boundary between two block-ish parts of the
 * note is a real pause; a boundary inside a running sentence is not, and jsdom
 * computes no layout so the walk cannot tell them apart. Dropping whitespace
 * before punctuation is the one rule that separates them and costs nothing
 * elsewhere: none of the other readings has punctuation at a boundary.
 */
function reading(element: Element): string {
  const parts: string[] = [];

  const walk = (node: Node): void => {
    if (
      node instanceof Element &&
      node.getAttribute("aria-hidden") === "true"
    ) {
      return;
    }

    if (node.nodeType === node.TEXT_NODE) {
      parts.push(node.textContent ?? "");
      return;
    }

    for (const child of node.childNodes) walk(child);
  };

  walk(element);

  return parts
    .join(" ")
    .replace(/\s+/gu, " ")
    .replace(/\s+(?=[,.;:])/gu, "")
    .trim();
}

/**
 * The ledger's rows, one reading each.
 *
 * **Per row rather than one string for the whole list, and the test said so
 * before this file did.** Asserting the `dd` whole produced
 * `All US exchanges30 bars` — two stretches with nothing between them — which
 * is what `textContent` does at an element boundary and is *not* what a
 * listener gets: a list item is its own announcement, and the count of items is
 * announced before the first one. So the row is the unit a reader receives and
 * the row is what is read here. A separator added to satisfy a naive
 * concatenation would be punctuation on screen for the benefit of a test.
 */
function rowsOf(term: string): readonly string[] {
  return [...definitionOf(term).querySelectorAll("li")].map(reading);
}

describe("SourceNote", () => {
  it("states what has been done to the prices and when they were fetched", () => {
    render(
      <SourceNote
        shown={barSeriesFixtureView("full")}
        feed={SIP}
        securities={PENDING_UNIVERSE}
        symbol={SUBJECT}
      />,
    );

    // The label, its sentence and the retrieval date, in one reading. The
    // sentence is `ADJUSTMENT_DESCRIPTIONS`' and is asserted verbatim: a
    // renderer that re-worded it would be a second vocabulary for one fact.
    // The middle dot is `aria-hidden`, so it is not in this reading: a listener
    // gets the boundary from the elements rather than hearing a punctuation
    // mark read as a word.
    expect(reading(definitionOf("Prices"))).toBe(
      "Unadjusted Retrieved 8 September 2026 Prices as they printed. " +
        "Not restated for stock splits.",
    );
  });

  it("says nothing about the feed the chrome is already naming", () => {
    // `PROVENANCE.md` §1.3's rule as an assertion. The recorded stitch is the
    // interesting case rather than an exception: it has two *sources* and both
    // name `sip`, because both halves came from Alpaca's historical API — so it
    // is one fact about coverage and the chrome is already stating it.
    for (const name of ["full", "stitched"] as const) {
      const { unmount } = render(
        <SourceNote
          shown={barSeriesFixtureView(name)}
          feed={SIP}
          securities={PENDING_UNIVERSE}
          symbol={SUBJECT}
        />,
      );

      expect(screen.queryByText("Source")).toBeNull();
      expect(screen.queryByText("Sources")).toBeNull();
      expect(screen.queryByText(/All US exchanges/u)).toBeNull();
      unmount();
    }
  });

  it("names the split, in contribution order, with the counts", () => {
    // The case invariant 6 exists for. The counts are what make *whichever feed
    // is first* visibly rather than invisibly wrong, and the order is the
    // sources' own — never sorted, never deduplicated to the first.
    render(
      <SourceNote
        shown={barSeriesFixtureView("twoFeed")}
        feed={SIP}
        securities={PENDING_UNIVERSE}
        symbol={SUBJECT}
      />,
    );

    expect(rowsOf("Sources")).toEqual([
      "60 bars All US exchanges",
      "30 bars IEX Trades reported by the IEX exchange only — not the full " +
        "US consolidated tape.",
    ]);
  });

  it("names a single feed the deployment does not claim", () => {
    render(
      <SourceNote
        shown={barSeriesFixtureView("full")}
        feed={{ state: "configured", feed: "iex" }}
        securities={PENDING_UNIVERSE}
        symbol={SUBJECT}
      />,
    );

    // **No count on a single stretch**, which is the count's own argument
    // applied: it exists to make a split visible, there is no split here, and
    // the panel above already says how many bars are held.
    expect(rowsOf("Source")).toEqual(["All US exchanges"]);
  });

  it("names the feed where the chrome claims none", () => {
    // Suppression requires a positive match: a deployment with no provider
    // configured still serves stored bars, and its chrome says *not configured*
    // rather than naming a feed — so this is the note stating what the chrome
    // cannot rather than repeating it.
    render(
      <SourceNote
        shown={barSeriesFixtureView("full")}
        feed={{ state: "not-configured" }}
        securities={PENDING_UNIVERSE}
        symbol={SUBJECT}
      />,
    );

    // **No count on a single stretch**, which is the count's own argument
    // applied: it exists to make a split visible, there is no split here, and
    // the panel above already says how many bars are held.
    expect(rowsOf("Source")).toEqual(["All US exchanges"]);
  });

  it("says nothing at all while the first feed answer is pending", () => {
    // A row that appears on the first frame and is taken away a few hundred
    // milliseconds later is a worse reading than a fact that arrives with
    // everything else on the page.
    render(
      <SourceNote
        shown={barSeriesFixtureView("full")}
        feed={{ state: "checking" }}
        securities={PENDING_UNIVERSE}
        symbol={SUBJECT}
      />,
    );

    expect(screen.queryByText("Source")).toBeNull();
  });

  it("renders nothing at all when the answer holds no bars", () => {
    // §0.1, and the state CI renders on every page: `SOURCE_OF_NOTHING` is a
    // complete and truthful provenance record about **zero numbers**, and four
    // accurate words under an empty frame are read as a claim about the
    // picture. The container is asserted rather than one absent string, because
    // "renders nothing" and "was never rendered" look identical otherwise.
    const { container } = render(
      <SourceNote
        shown={barSeriesFixtureView("empty")}
        feed={SIP}
        securities={PENDING_UNIVERSE}
        symbol={SUBJECT}
      />,
    );

    expect(container.innerHTML).toBe("");
  });

  it("renders nothing for the three states that carry no series", () => {
    for (const shown of [
      { state: "loading" },
      barSeriesFixtureView("refusedCap"),
      barSeriesFixtureView("unavailable"),
    ] as const) {
      const { container, unmount } = render(
        <SourceNote
          shown={shown}
          feed={SIP}
          securities={PENDING_UNIVERSE}
          symbol={SUBJECT}
        />,
      );

      expect(container.innerHTML).toBe("");
      unmount();
    }
  });
});

// The clause Task 2.14.4 adds, and the four states it has.
//
// It is a separate `describe` because it reads a **different fetch** from every
// test above: the universe, not the series. That is the whole point of it —
// `GET /securities` has carried this claim since Story 2.9 and no screen has
// rendered a character of it, and because its data is the universe's rather
// than the bars', it is the one clause that draws on a page holding no bars.
describe("SourceNote — the curated classification", () => {
  it("says the sector is ours and when the file was last checked", () => {
    render(
      <SourceNote
        shown={barSeriesFixtureView("full")}
        feed={SIP}
        securities={securitiesFixtureView("full")}
        symbol={SUBJECT}
      />,
    );

    // The settled words, verbatim (`PROVENANCE.md` §5.2), read as a listener
    // gets them. `curated` is a `<span>` inside the sentence rather than a
    // hoisted label, so the reading is what proves the sentence survived the
    // split — `getByText("curated")` would pass against a note with the rest of
    // it missing.
    expect(reading(definitionOf("Classification"))).toBe(
      "Sector and industry are curated, not from the market feed. " +
        "Last checked 8 September 2026",
    );
  });

  it("reads the curated date as written rather than as a market instant", () => {
    // **The defect this assertion exists for.** `UNIVERSE_PROVENANCE` holds
    // `checkedOn: "2026-09-08"`, a date a person types and reviews in a diff,
    // and the loader parses it as UTC midnight so a run in any timezone stores
    // the same instant. Put that instant through `marketDateAt` — which is
    // exactly right for the bars' own retrieval three lines above — and it
    // lands at 20:00 on the **7th** in New York. The screen would then read
    // `7 September 2026` against a file, an ADR and four documents that all say
    // the 8th, and nothing on the page would look wrong.
    render(
      <SourceNote
        shown={barSeriesFixtureView("full")}
        feed={SIP}
        securities={securitiesFixtureView("full")}
        symbol={SUBJECT}
      />,
    );

    expect(
      screen.queryByText(/7 September 2026/u, { selector: "dd *" }),
    ).toBeNull();
  });

  it("draws alone on a page holding no bars", () => {
    // **The state this task exists for, and the commonest page in the suite.**
    // CI's store is 518 securities and zero bars, so every chart there is a
    // correct `empty` — and until this clause the note was absent from every
    // page CI has ever rendered. §0.1 is a claim about data requiring data, per
    // clause: the bars have none, the universe has answered.
    render(
      <SourceNote
        shown={barSeriesFixtureView("empty")}
        feed={SIP}
        securities={securitiesFixtureView("full")}
        symbol={SUBJECT}
      />,
    );

    expect(screen.queryByText("Prices")).toBeNull();
    expect(screen.queryByText("Source")).toBeNull();
    expect(reading(definitionOf("Classification"))).toBe(
      "Sector and industry are curated, not from the market feed. " +
        "Last checked 8 September 2026",
    );
  });

  it("keeps the claim and drops the date when the server made none", () => {
    // `provenance` goes absent when the rows stop sharing one pair — not when
    // they stop being ours. The sentence is still true; the date is the only
    // thing we cannot say, and an empty space in its place would read as a
    // rendering fault rather than as an honest absence.
    const loaded = securitiesFixtureView("full");

    if (loaded.state !== "loaded") throw new TypeError("expects a universe");

    render(
      <SourceNote
        shown={barSeriesFixtureView("full")}
        feed={SIP}
        securities={{ ...loaded, provenance: null }}
        symbol={SUBJECT}
      />,
    );

    expect(reading(definitionOf("Classification"))).toBe(
      "Sector and industry are curated, not from the market feed. " +
        "When they were last checked is not recorded.",
    );
  });

  it("carries no marker, in either state", () => {
    // The tension Task 2.14.2 left open, resolved rather than inherited. This
    // surface is entirely typographic: what is missing in the undated state is
    // one date inside a claim that is still being made, and a marker would rank
    // a missing date above a stated one. `SecurityIdentity`'s markers stay
    // where an absence is the whole answer.
    const loaded = securitiesFixtureView("full");

    if (loaded.state !== "loaded") throw new TypeError("expects a universe");

    for (const securities of [loaded, { ...loaded, provenance: null }]) {
      const { container, unmount } = render(
        <SourceNote
          shown={barSeriesFixtureView("full")}
          feed={SIP}
          securities={securities}
          symbol={SUBJECT}
        />,
      );

      expect(container.querySelector("svg")).toBeNull();
      unmount();
    }
  });

  it("says nothing about a security the universe does not hold", () => {
    // There is no sector on this page to disclose the origin of, so the
    // sentence would have no subject — §0.1 again. `SecurityIdentity` has
    // already said what is wrong with the address, in its own words and with
    // its own marker, and a second surface saying it differently is the
    // footnote pile arriving as sympathy.
    const { container } = render(
      <SourceNote
        shown={barSeriesFixtureView("empty")}
        feed={SIP}
        securities={securitiesFixtureView("full")}
        symbol="NOTATICKER"
      />,
    );

    expect(container.innerHTML).toBe("");
  });

  it("says nothing while the universe is unresolved, failed or empty", () => {
    for (const securities of [
      PENDING_UNIVERSE,
      securitiesFixtureView("unavailable"),
      securitiesFixtureView("empty"),
    ]) {
      const { container, unmount } = render(
        <SourceNote
          shown={barSeriesFixtureView("empty")}
          feed={SIP}
          securities={securities}
          symbol={SUBJECT}
        />,
      );

      expect(container.innerHTML).toBe("");
      unmount();
    }
  });

  it("never prints the response's source slug", () => {
    // `FieldGroupProvenance.source` is a free string by design, so no
    // compile-time table can ever give it words — which is exactly why a
    // renderer must not reach for it. The slug stays in the response for an
    // operator.
    const { container } = render(
      <SourceNote
        shown={barSeriesFixtureView("full")}
        feed={SIP}
        securities={securitiesFixtureView("full")}
        symbol={SUBJECT}
      />,
    );

    expect(container.textContent).not.toContain("gics");
    expect(container.textContent).not.toContain("alpaca-assets");
  });
});
