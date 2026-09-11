import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RegionPlaceholder } from "./RegionPlaceholder.js";

describe("RegionPlaceholder", () => {
  it("names who fills the region", () => {
    render(<RegionPlaceholder filledBy="Epic 6 — Market Topology" />);

    expect(screen.getByText("Filled by Epic 6 — Market Topology")).toBeTruthy();
  });

  it("supplies the sentence so five call sites cannot write five of them", () => {
    // The prop is a subject, not a sentence. A call site passing
    // "Filled by Epic 6" would read "Filled by Filled by Epic 6" — loud, which
    // is the point of putting the verb here.
    render(<RegionPlaceholder filledBy="Epic 5 — Anomaly Detection" />);

    expect(screen.getByText(/^Filled by /)).toBeTruthy();
  });
});
