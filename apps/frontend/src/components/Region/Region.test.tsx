// A region is a named landmark with a boundary *inside* it, and that placement
// is the decision this file protects.

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Region } from "./Region.js";

function Throws(): never {
  throw new Error("the contents failed");
}

describe("Region", () => {
  // The name comes from the heading through `aria-labelledby`, with the id from
  // `useId()` so two regions of the same name cannot collide. Asserted through
  // the accessible name rather than the attribute value: `useId()` emits
  // `«r1»`-style output that depends on where the component sits in the render
  // tree, so an assertion on the id itself would break whenever anything above
  // it moved.
  it("is a landmark named by its own heading", () => {
    render(<Region name="Market breadth" filledBy="Epic 4 fills this." />);

    const region = screen.getByRole("region", { name: "Market breadth" });
    expect(
      within(region).getByRole("heading", { name: "Market breadth" }),
    ).toBeDefined();
  });

  it("gives two regions of different names two distinct landmarks", () => {
    render(
      <>
        <Region name="Market breadth" filledBy="Epic 4." />
        <Region name="Unusual activity" filledBy="Epic 5." />
      </>,
    );

    // Distinct ids from `useId()` — the reason the heading id is generated
    // rather than derived from the name.
    const ids = screen
      .getAllByRole("region")
      .map((region) => region.getAttribute("aria-labelledby"));

    expect(new Set(ids).size).toBe(2);
    expect(
      screen.getByRole("region", { name: "Unusual activity" }),
    ).toBeDefined();
  });

  it("says which epic fills it, and renders no content area when empty", () => {
    render(
      <Region
        name="Current investigations"
        filledBy="Epic 7 lists them here."
      />,
    );

    expect(screen.getByText("Epic 7 lists them here.")).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("renders its children when given them", () => {
    render(
      <Region name="Market topology" filledBy="Epic 6.">
        <p>the graph</p>
      </Region>,
    );

    expect(screen.getByText("the graph")).toBeDefined();
  });

  // The placement decision, and the reason `Region` moved from `src/routes/`
  // into `src/components/` in Task 1.7.6. A boundary *outside* the `<section>`
  // replaces the heading along with the contents, so a failed box loses its
  // name, its landmark and its place in §9's grid — and a keyboard user loses
  // something to jump to. Inside, all three survive and a failed region is a
  // labelled box with a problem in it.
  //
  // This is the assertion that would catch someone moving the boundary out,
  // which reads as a simplification and is a regression.
  it("keeps its name and its landmark when its contents fail", () => {
    render(
      <Region name="Market topology" filledBy="Epic 6 draws it here.">
        <Throws />
      </Region>,
    );

    const region = screen.getByRole("region", { name: "Market topology" });
    expect(
      within(region).getByRole("heading", { name: "Market topology" }),
    ).toBeDefined();
    // The failure is contained to the slot, and it is inside the region.
    expect(within(region).getByRole("alert")).toBeDefined();
  });

  it("contains a failure to the region it happened in", () => {
    render(
      <>
        <Region name="Market topology" filledBy="Epic 6.">
          <Throws />
        </Region>
        <Region name="Market breadth" filledBy="Epic 4.">
          <p>still here</p>
        </Region>
      </>,
    );

    expect(screen.getAllByRole("region")).toHaveLength(2);
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getByText("still here")).toBeDefined();
  });

  it("shows the awaiting tag only while empty, and the meta slot only while filled", () => {
    // **One slot, one occupant, and the two can never disagree.** A tag naming
    // the work that will fill a region cannot outlive that work — the day
    // Story 4.3 landed, a forgotten `awaiting="Story 4.3"` beside real sector
    // data would have promised work already shipped, which is exactly the kind
    // of claim nothing in this repository can read.
    const { rerender } = render(
      <Region
        name="Sector performance"
        awaiting="Story 4.3"
        meta={<i>11</i>}
      />,
    );

    expect(screen.getByText("Story 4.3")).toBeDefined();
    expect(screen.queryByText("11")).toBeNull();

    rerender(
      <Region name="Sector performance" awaiting="Story 4.3" meta={<i>11</i>}>
        <p>eleven rows</p>
      </Region>,
    );

    expect(screen.getByText("11")).toBeDefined();
    expect(screen.queryByText("Story 4.3")).toBeNull();
  });

  it("reports a reader entering and leaving it, by pointer and by focus alike", () => {
    // `:hover` and `:focus-within` on the region's **own box**, as one boolean,
    // because they are one fact: somebody is reading this. Scoped to the region
    // and never to a row — a row-scoped hold lets rows move out from under an
    // *approaching* pointer — and the section is the region's only tab stop
    // today, because `Region` passes `scrollable`.
    const within_ = vi.fn<(value: boolean) => void>();
    render(
      <Region name="Sector performance" onReaderWithin={within_}>
        <p>eleven rows</p>
      </Region>,
    );

    const region = screen.getByRole("region", { name: "Sector performance" });

    fireEvent.pointerEnter(region);
    expect(within_).toHaveBeenLastCalledWith(true);

    // **Focus arriving while the pointer is still there is not a second
    // hold**, and the pointer leaving afterwards must not release one the
    // keyboard is still holding.
    fireEvent.focusIn(region);
    expect(within_).toHaveBeenLastCalledWith(true);

    fireEvent.pointerLeave(region);
    expect(within_).toHaveBeenLastCalledWith(true);

    fireEvent.focusOut(region);
    expect(within_).toHaveBeenLastCalledWith(false);
  });

  it("releases the reader when it unmounts, so no pin outlives the region", () => {
    // Without this a consumer unmounting mid-hover — a rollback replacing the
    // frame, a route change — leaves a held order nobody can release, and the
    // list is frozen with no pointer anywhere near it.
    const within_ = vi.fn<(value: boolean) => void>();
    const { unmount } = render(
      <Region name="Sector performance" onReaderWithin={within_}>
        <p>eleven rows</p>
      </Region>,
    );

    fireEvent.pointerEnter(
      screen.getByRole("region", { name: "Sector performance" }),
    );
    expect(within_).toHaveBeenLastCalledWith(true);

    unmount();
    expect(within_).toHaveBeenLastCalledWith(false);
  });
});

// **The head's claim against its content's state, walked rather than
// rendered** (Task 4.7.5).
//
// ## What this is a walk OVER
//
// `market-feed-grid.test.ts` is the precedent and the shape is the same one:
// it enumerates **every selection a deployment can be configured with** and
// asserts the coherence rule across the two producers, because every other
// test in the repository renders a combination somebody *named* — and the
// defect it found was a row the grid contained and no named combination
// reached.
//
// A region's head and its content are the two producers here, and the
// content's state space is exhaustively three: **absent**, **drawn**,
// **thrown**. The first two are what the route computes `meta` from
// (`movers !== undefined`), and they are the only two anybody has ever
// written a test for. The third is not a state the route can compute at all —
// a throw during render is not something upstream knows about — and it is the
// one where the head went on reading `Top 5 each way`, or `ORDER HELD`, over
// a box saying the region could not be displayed. Two true halves and one
// contradiction.
//
// **A fourth cell is reachable and is not a state of the content: the
// RETRY.** `ErrorFallback`'s `Try again` remounts the subtree, so a head
// suppressed on the way into the failure must come back on the way out. That
// cell exists because the obvious repair — *suppress the head once it has
// thrown* — passes the other three and leaves the figures restored under a
// head that never returns. Its transcript is in Task 4.7.5's record.
//
// ## Why it is not an invariant
//
// The rule is about what reaches the accessibility tree from two slots of one
// component, which no grep over the source can read: the claim can be
// suppressed from `Region`, from `Panel`, or by the caller, and all three are
// green against a text search for any one of them. What cannot be faked is
// the string's absence from the rendered head.
describe("a region's head cannot claim what its content no longer has", () => {
  /** The claim a filled region puts in its head — `ORDER HELD`'s slot. */
  const CLAIM = "Top 5 each way";

  /** The tag an empty region puts there instead — the work that will fill it. */
  const TAG = "Story 4.9";

  /** Every state the content slot has, and there are exactly these three. */
  const CONTENT = ["absent", "drawn", "thrown"] as const;

  const contentOf = (state: (typeof CONTENT)[number]) => {
    if (state === "absent") return undefined;
    return state === "drawn" ? <p>five rows</p> : <Throws />;
  };

  /**
   * What the head is allowed to say, per state.
   *
   * `absent` → the tag, because the region is reserved and the tag names the
   * work. `drawn` → the claim, because there are figures to qualify.
   * `thrown` → **neither**: the tag would promise work that has landed and
   * the claim would describe figures that are gone.
   */
  const ALLOWED: Record<(typeof CONTENT)[number], string | undefined> = {
    absent: TAG,
    drawn: CLAIM,
    thrown: undefined,
  };

  it.each(CONTENT)("says nothing untrue over %s content", (state) => {
    render(
      <Region name="Movers" awaiting={TAG} meta={<i>{CLAIM}</i>}>
        {contentOf(state)}
      </Region>,
    );

    const region = screen.getByRole("region", { name: "Movers" });
    const allowed = ALLOWED[state];

    for (const said of [TAG, CLAIM]) {
      const drawn = within(region).queryByText(said) !== null;

      expect(
        drawn,
        drawn
          ? `over ${state} content the head claims something its content no ` +
              `longer has: ${said}`
          : `over ${state} content the head should say ${said} and does not`,
      ).toBe(said === allowed);
    }
  });

  it("gives the claim back when the retry succeeds", () => {
    // The cell that is not a state of the content. Without it, suppressing
    // the head permanently on the first throw passes every case above — and
    // a reader who presses `Try again` gets the figures back under a head
    // that has gone silent for the life of the page.
    const { rerender } = render(
      <Region name="Movers" meta={<i>{CLAIM}</i>}>
        <Throws />
      </Region>,
    );

    const region = screen.getByRole("region", { name: "Movers" });
    expect(within(region).queryByText(CLAIM)).toBeNull();

    // The content that will mount when the boundary remounts its subtree.
    // Rerendered first: the boundary is still caught, so the fallback is
    // still what is on screen and nothing has recovered yet.
    rerender(
      <Region name="Movers" meta={<i>{CLAIM}</i>}>
        <p>five rows</p>
      </Region>,
    );
    expect(within(region).queryByText(CLAIM)).toBeNull();

    fireEvent.click(
      within(region).getByRole("button", { name: /try again/iu }),
    );

    expect(within(region).getByText("five rows")).toBeDefined();
    expect(
      within(region).queryByText(CLAIM),
      "the content came back and the head did not",
    ).not.toBeNull();
  });
});
