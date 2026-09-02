// A region is a named landmark with a boundary *inside* it, and that placement
// is the decision this file protects.

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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
});
