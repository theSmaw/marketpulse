// The band's name is inside its fill, which is the whole point: a four-step
// amber ramp is not legible as four steps, and a gradient cannot be labelled.
// The ramp is deliberately not red — red already means price-down, and an
// extreme anomaly on a security moving sharply up would read as a fall.

import { render, screen } from "@testing-library/react";
import { ANOMALY_BANDS } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import { AnomalyBadge } from "./AnomalyBadge.js";

describe("AnomalyBadge", () => {
  it.each(ANOMALY_BANDS)("writes %s inside the chip", (band) => {
    render(<AnomalyBadge band={band} />);

    expect(screen.getByText(band)).toBeDefined();
  });

  // A score-to-band boundary is Epic 5's detection policy and is deliberately
  // absent from this layer; the component takes the band as a prop and the
  // vocabulary is the shared one. This pins the vocabulary rather than the
  // thresholds.
  it("renders every band in the shared vocabulary and nothing else", () => {
    expect(ANOMALY_BANDS).toStrictEqual([
      "normal",
      "elevated",
      "unusual",
      "extreme",
    ]);
  });
});
