// The representative component: it composes `PriceChange`, `AnomalyBadge`,
// `FeedIndicator` and `Popover` into one `<tr>`, so it is where "test through
// the real component tree" means something rather than being a phrase. Nothing
// here is mocked; a failure in any of the four surfaces here.

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { toTicker } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import { SecurityRow } from "./SecurityRow.js";

// The extremes rather than plausible examples, which is the convention Task
// 1.4.5 set for the stories and which is worth as much here: the widest digits
// are what break a tabular column, and Task 1.4.3 measured a 14.3 px spread
// riding on exactly that.
function renderRow() {
  return render(
    <table>
      <tbody>
        <SecurityRow
          ticker={toTicker("NVDA")}
          last="8,888.88"
          change="−34.02"
          direction="negative"
          band="extreme"
          bandExplanation="Far outside the historical distribution"
          status="stale"
        />
      </tbody>
    </table>,
  );
}

describe("SecurityRow", () => {
  it("makes the ticker the row's header", () => {
    renderRow();

    // `<th scope="row">` and not a `<td>`: it is what lets a screen reader
    // announce which security a cell belongs to when reading across.
    const header = screen.getByRole("rowheader", { name: "NVDA" });
    expect(header.tagName).toBe("TH");
    expect(header.getAttribute("scope")).toBe("row");
  });

  it("carries all four encodings in one row", () => {
    renderRow();

    const row = screen.getByRole("row");
    expect(within(row).getByText("8,888.88")).toBeDefined();
    // The direction word, not the colour.
    expect(within(row).getByText(/down/u)).toBeDefined();
    expect(within(row).getByText("extreme")).toBeDefined();
    expect(within(row).getByText("stale")).toBeDefined();
  });

  // §11 makes every score carry its explanation, and Task 1.4.5 found that a
  // *tooltip* would not deliver one: Base UI's tooltip renders no
  // `role="tooltip"` and wires no `aria-describedby`, deliberately. That is why
  // the band chip is a popover — a real button, reachable by keyboard, whose
  // content reaches a screen reader. This asserts the finding, not the markup.
  it("puts the band's explanation behind a real button", async () => {
    renderRow();

    const trigger = screen.getByRole("button");
    expect(within(trigger).getByText("extreme")).toBeDefined();

    fireEvent.click(trigger);

    const dialog = await waitFor(() => screen.getByRole("dialog"));
    expect(within(dialog).getByText("Why this band")).toBeDefined();
    expect(
      within(dialog).getByText("Far outside the historical distribution"),
    ).toBeDefined();
    // Both wired, which is the measured difference from a tooltip.
    expect(dialog.getAttribute("aria-labelledby")).toBeTruthy();
    expect(dialog.getAttribute("aria-describedby")).toBeTruthy();
  });

  it("does not show the explanation until it is asked for", () => {
    renderRow();

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
