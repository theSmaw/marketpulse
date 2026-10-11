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

  // **The focus its own content drops** (Task 4.7.6). A region's `<section>` is
  // a tab stop in every state (ADR 0039) and its content is not: a ranked row's
  // anchor exists because an aggregate selected that security. `RankedList`
  // catches the row-left-the-list case itself — but when the whole component
  // goes, the hook holding that recovery goes with it.
  //
  // **jsdom can see this one and sees almost none of it.** `document
  // .activeElement` is real here; what is not is the frame that produces the
  // state, the scrollport the section is, or whether the landing position reads
  // as anywhere. `overview-degraded-stops.spec.ts` drives it through the
  // shipped socket.
  it("catches the focus its own content drops when that content unmounts", () => {
    const { rerender } = render(
      <Region name="Movers">
        <a href="/securities/NVDA">NVDA</a>
      </Region>,
    );

    const row = screen.getByRole("link", { name: "NVDA" });
    row.focus();
    expect(document.activeElement).toBe(row);

    // The rollback branch: the region draws no content at all.
    rerender(<Region name="Movers" />);

    expect(document.activeElement).toBe(
      screen.getByRole("region", { name: "Movers" }),
    );
  });

  it("does NOT take focus back when the reader had already moved on", () => {
    // The one of the three conditions that is about somebody else's element,
    // and the one whose guard is invisible when wrong: `<body>` is not `null`,
    // so `if (active !== null) return;` reads like this test's subject and
    // disables the recovery entirely.
    const { rerender } = render(
      <>
        <Region name="Movers">
          <a href="/securities/NVDA">NVDA</a>
        </Region>
        <button type="button">Elsewhere</button>
      </>,
    );

    screen.getByRole("link", { name: "NVDA" }).focus();
    const elsewhere = screen.getByRole("button", { name: "Elsewhere" });
    elsewhere.focus();

    rerender(
      <>
        <Region name="Movers" />
        <button type="button">Elsewhere</button>
      </>,
    );

    expect(document.activeElement).toBe(elsewhere);
  });
});
