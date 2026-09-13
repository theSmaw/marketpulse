import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TIME_WINDOWS } from "../../market/index.js";
import { TimeWindowControl } from "./TimeWindowControl.js";

// What the control is, asserted through what a reader and a listener get rather
// than through its implementation (Task 2.13.6).
//
// **What is deliberately not asserted here:** colour, which is structurally
// impossible in this environment — no stylesheet is applied, so the selected
// cell's bar, its weight and its ink are all invisible to every test in this
// file. What holds those is the workshop beside it and the browser suite. What
// *is* holdable here is the part that is semantics: which cell is checked, what
// each one is called, how many tab stops the five of them are, and what a press
// reports.

function renderControl(sessions: number) {
  const onChange = vi.fn<(sessions: number) => void>();
  const result = render(
    <TimeWindowControl onChange={onChange} sessions={sessions} />,
  );

  return { ...result, onChange };
}

const cells = () => screen.getAllByRole("radio");

describe("TimeWindowControl", () => {
  it("offers the five windows, named for the ear rather than the eye", () => {
    renderControl(5);

    // `1D` is what is shown and "1 day" is what is read — §4(d). "One dee" is
    // not a window, and five spelled-out words in a row is a paragraph rather
    // than a control, so the component shows one and names the other. Both come
    // off `TIME_WINDOWS`, which is why this walks it rather than listing them.
    expect(cells()).toHaveLength(TIME_WINDOWS.length);

    for (const window of TIME_WINDOWS) {
      expect(screen.getByRole("radio", { name: window.name })).toBeTruthy();
      expect(screen.getByText(window.label)).toBeTruthy();
    }
  });

  it("checks the window on screen and nothing else", () => {
    renderControl(21);

    expect(screen.getByRole("radio", { name: "1 month" })).toHaveProperty(
      "ariaChecked",
      "true",
    );
    expect(
      cells().filter((cell) => cell.getAttribute("aria-checked") === "true"),
    ).toHaveLength(1);
  });

  it("shows no selection for a count that is not one of the five, and does not snap", () => {
    // §4(b), and the whole reason the readout exists. `?sessions=7` is a
    // well-formed request the product answers, and so is an agent's
    // `setTimeWindow` asking for thirty — snapping either to the nearest offered
    // window would rewrite somebody's address into a different one and silently
    // answer a question they did not ask.
    renderControl(7);

    for (const cell of cells()) {
      expect(cell.getAttribute("aria-checked")).toBe("false");
    }
    expect(screen.getByText("7 sessions")).toBeTruthy();
  });

  it("states the resolved session count beside the labels, in every state", () => {
    // §4(e) made visible: **the label says the approximation and the readout
    // says the fact.** `1M` is not a month, it is twenty-one trading sessions —
    // the number the axis is divided into and the number the chart's spoken
    // description uses. This is the only place on screen that says so.
    const { rerender, unmount } = render(
      <TimeWindowControl onChange={vi.fn()} sessions={21} />,
    );
    expect(screen.getByText("21 sessions")).toBeTruthy();

    rerender(<TimeWindowControl onChange={vi.fn()} sessions={1} />);
    // Singular, because `1 sessions` is the kind of figure that makes a reader
    // stop trusting the other five.
    expect(screen.getByText("1 session")).toBeTruthy();

    rerender(<TimeWindowControl onChange={vi.fn()} sessions={Number.NaN} />);
    // The one state the canvas's `N SESSIONS` cannot express. An address admits
    // anything, `NaN SESSIONS` is a figure this product must never print, and
    // the sentence a reader acts on is the server's refusal rather than this.
    expect(screen.getByText("not a session count")).toBeTruthy();

    unmount();
  });

  // **On the cells rather than on the group, since Task 2.13.8's walk.** The
  // group is a `div` with no `tabindex`: this is a roving-tabindex radiogroup,
  // so the tab stop is the *checked cell* and the container is never focused.
  // A description is read when a control is **reached**, and a description on a
  // container is not part of a child's — so the readout was correct, attached,
  // visible and unreachable by any key press, which is `TextField`'s two-task
  // defect reached by a different route.
  //
  // Asserted on **every** cell rather than on the checked one: a listener
  // arrowing under manual activation must hear the window on screen wherever
  // focus is, which is what a sighted reader sees for the same press.
  it("describes every cell with the readout, so a listener gets the fact on arrival", () => {
    renderControl(7);

    const group = screen.getByRole("radiogroup", { name: "Time window" });
    expect(group.getAttribute("aria-describedby")).toBeNull();

    const cells = screen.getAllByRole("radio");
    expect(cells).toHaveLength(5);

    for (const cell of cells) {
      const description = document.getElementById(
        cell.getAttribute("aria-describedby") ?? "",
      );
      // The half of the no-selection state a sighted reader gets for free from
      // the two sitting side by side. Five unchecked radios announced with no
      // explanation is a control that sounds broken.
      expect(description?.textContent).toBe("7 sessions");
    }
  });

  it("reports the session count it was pressed for, and never the one already on screen", () => {
    const { onChange } = renderControl(5);

    fireEvent.click(screen.getByRole("radio", { name: "1 year" }));
    expect(onChange).toHaveBeenCalledWith(252);

    // Pressing the checked cell is a no-op. The alternative is a history entry
    // and a request that change nothing a reader can see.
    fireEvent.click(screen.getByRole("radio", { name: "5 days" }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("is one tab stop for five cells, held by the checked one", () => {
    renderControl(21);

    // A roving tab stop, and it is **derived from the selection** rather than
    // held in state — which is what makes tabbing out of a half-arrowed control
    // and back return to the window actually on screen.
    const stops = cells().filter((cell) => cell.tabIndex === 0);
    expect(stops).toHaveLength(1);
    expect(stops[0]).toHaveProperty("ariaChecked", "true");
  });

  it("keeps a tab stop when nothing is checked, rather than trapping five", () => {
    renderControl(7);

    const stops = cells().filter((cell) => cell.tabIndex === 0);
    expect(stops).toHaveLength(1);
    expect(stops[0]?.textContent).toContain("1D");
  });

  it("moves focus with the arrows and changes nothing until a press", () => {
    // **Manual activation, and this is the test that holds it.** Selection
    // following focus would make arrowing from `1D` to `1Y` four window changes:
    // four requests, four addresses in the browser's history and four answers
    // announced. One press is one window.
    const { onChange } = renderControl(5);

    cells()[1]?.focus();
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: "ArrowRight",
    });

    expect(document.activeElement).toBe(
      screen.getByRole("radio", { name: "1 month" }),
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it("wraps at both ends and reaches both of them", () => {
    renderControl(5);
    const [first, , , , last] = cells();

    first?.focus();
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: "ArrowLeft",
    });
    // A ring rather than a clamp: `1D` → ← → `1Y` is one press rather than four.
    expect(document.activeElement).toBe(last);

    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Home" });
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(document.activeElement ?? document.body, { key: "End" });
    expect(document.activeElement).toBe(last);
  });

  it("leaves Tab to the browser, so the one stop is still a stop", () => {
    // A handler that swallowed `Tab` would take this control out of the tab
    // order it is in — the failure `SEARCH-AND-SELECTION.md` records as the
    // shape of an unreachable control.
    renderControl(5);

    cells()[1]?.focus();
    const event = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Tab",
    });
    document.activeElement?.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it("stops the arrows scrolling the panel they are inside", () => {
    // This control sits on a `Region`'s heading row, and a `Region` declares
    // `overflow: auto`. An unprevented arrow key scrolls that box under the hand
    // of the person operating the control.
    renderControl(5);

    cells()[1]?.focus();
    const event = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "ArrowRight",
    });
    document.activeElement?.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("takes a shorter set of windows without learning about this page", () => {
    // The props are the vocabulary of a **window** and not of the Security
    // Explorer: Epic 8 reuses this for comparison views and Epic 11 drives it
    // with `setTimeWindow`. A control that read `TIME_WINDOWS` internally would
    // be one both of those had to work around.
    render(
      <TimeWindowControl
        onChange={vi.fn()}
        sessions={5}
        windows={TIME_WINDOWS.slice(0, 2)}
      />,
    );

    expect(cells()).toHaveLength(2);
  });
});
