import { CONFIDENCE_LEVELS } from "@marketpulse/shared";
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CONFIDENCE_PREFIX, ConfidenceMark } from "./ConfidenceMark.js";

// **No stylesheet is applied in this environment**, so the stroke ladder — the
// whole visible encoding — is structurally unassertable here; the workshop and
// `pnpm probe` are where it is judged, and two `pnpm invariants` entries hold
// the properties it must never grow. What survives jsdom is the accessible
// string, the distinctness of the four treatments, and the keyboard surface.

describe("ConfidenceMark", () => {
  it("speaks the long form, with the level's word in one home", () => {
    // The reason the prefix exists: a listener meets this mark and
    // `AnomalyBadge` as one stream with no spatial separation, and a bare
    // `SUPPORTED` is ambiguous between *how unusual* and *how well evidenced*.
    //
    // Asserted as the CONCATENATION rather than per element, which is this
    // repository's own rule for a component that splits its sentence — and it
    // is what catches the defect a `gap` would hide, because a flex gap is
    // invisible to a screen reader and `textContent` runs two spans together.
    const { container } = render(<ConfidenceMark confidence="SUPPORTED" />);

    expect(container.textContent).toBe(`${CONFIDENCE_PREFIX} SUPPORTED`);
  });

  it("draws the level's word exactly once", () => {
    // The one-fact-one-home half. A draft that hid `Confidence: SUPPORTED`
    // whole and drew `SUPPORTED` separately reads identically here except for
    // this count, and it is two copies of one word that can drift.
    const { container } = render(<ConfidenceMark confidence="POSSIBLE" />);

    expect(container.textContent.match(/POSSIBLE/gu)?.length).toBe(1);
  });

  it("gives every level its own stroke class, and none of them the same one", () => {
    // `Marker`'s own assertion, for the same reason: a `STROKE_CLASS` entry
    // pointing at the wrong style draws the wrong level, silently, with the
    // correct word beside it — which is worse than drawing nothing. The claim
    // is that the four are DISTINCT, never what any of them is called.
    const classes = CONFIDENCE_LEVELS.map((confidence) => {
      const { container, unmount } = render(
        <ConfidenceMark confidence={confidence} />,
      );
      const rule = container.querySelector("[aria-hidden='true']");
      const value = rule?.className ?? "";
      unmount();
      return value;
    });

    expect(new Set(classes).size).toBe(CONFIDENCE_LEVELS.length);
    for (const value of classes) expect(value).not.toBe("");
  });

  it("adds no focusable element, and a click changes nothing (AC 7)", () => {
    // The evidence panel, the finding card and the click-to-focus interaction
    // are Epic 8's by citation, and the easiest way to ship one early by
    // accident is a handler here.
    //
    // **What this can and cannot see.** The focusable-element half is a real
    // structural assertion: three `<span>`s with no `tabIndex`, no `role` and
    // nothing natively interactive. The handler half is NOT readable from the
    // DOM — React delegates at the root and sets no `onclick` attribute or
    // property — so what is asserted instead is that a click leaves the
    // markup byte-identical, which catches the handler a next author would
    // actually write (one that opens or focuses something) and does not catch
    // one that only calls out. The source-level half of that claim is
    // `ConfidenceMark`'s own two invariants and this component having no
    // props but its level.
    const { container } = render(<ConfidenceMark confidence="UNKNOWN" />);

    expect(
      container.querySelectorAll(
        "a, button, input, select, textarea, [tabindex], [role]",
      ),
    ).toHaveLength(0);

    const before = container.innerHTML;
    for (const element of container.querySelectorAll("*")) {
      fireEvent.click(element);
      fireEvent.keyDown(element, { key: "Enter" });
    }

    expect(container.innerHTML).toBe(before);
  });
});
