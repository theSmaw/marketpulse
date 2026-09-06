import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MARKER_SHAPES, Marker } from "./Marker.js";

// What is worth asserting about a component whose entire job is a silhouette,
// given that **no stylesheet is applied in this environment** — so the
// silhouette itself is structurally unassertable here, and the workshop and the
// browser suite are where it is judged.
//
// Two things survive that, and both are real.

describe("Marker", () => {
  it("is hidden from the accessibility tree in every shape", () => {
    // The property that matters most, and the one a refactor is most likely to
    // drop. A silhouette read aloud is nothing — "the state is: circle" — so
    // every state this draws has a word beside it carrying the meaning, and a
    // marker that reached the tree would be a second, worse announcement of the
    // same fact. It is not a prop for the same reason.
    for (const shape of MARKER_SHAPES) {
      const { container, unmount } = render(<Marker shape={shape} />);
      const marker = container.firstElementChild;

      expect(marker?.getAttribute("aria-hidden")).toBe("true");
      expect(marker?.textContent).toBe("");
      unmount();
    }
  });

  it("gives every shape its own class, and none of them the same one", () => {
    // Cheap, and it catches the copy-paste this component was extracted to
    // prevent: a `SHAPE_CLASS` entry pointing at the wrong style renders the
    // wrong silhouette, silently, in whichever consumer uses that shape. The
    // assertion is that the four are *distinct*, not what any of them is called
    // — a hashed CSS Module name is not a fact worth pinning.
    const classes = MARKER_SHAPES.map((shape) => {
      const { container, unmount } = render(<Marker shape={shape} />);
      const value = container.firstElementChild?.className ?? "";
      unmount();
      return value;
    });

    expect(new Set(classes).size).toBe(MARKER_SHAPES.length);
    for (const value of classes) expect(value).not.toBe("");
  });
});
