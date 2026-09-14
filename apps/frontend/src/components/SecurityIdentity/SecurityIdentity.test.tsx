import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  FIXTURE_SESSION,
  FIXTURE_SUBJECTS,
  LOADING_UNIVERSE,
  securitiesFixtureView,
} from "../../fixtures/securities.js";
import { SecurityIdentity } from "./SecurityIdentity.js";

// What this component must not get wrong, and none of it is about colour —
// `getTokens()` throws in this environment by design, so contrast and hue are a
// browser's measurement rather than this file's.

describe("SecurityIdentity", () => {
  it("names the security from the universe rather than from the address", () => {
    render(
      <SecurityIdentity symbol="NVDA" view={securitiesFixtureView("full")} />,
    );

    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("NVDA");
    expect(screen.getByText("NVIDIA Corporation")).toBeTruthy();
  });

  it("prints the symbol at once while the universe is still in flight", () => {
    // The half of the state machine most likely to be built as a skeleton: the
    // symbol comes from the path and is known on the first frame.
    render(<SecurityIdentity symbol="AMD" view={LOADING_UNIVERSE} />);

    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("AMD");
    expect(screen.getByText(/Reading this security/)).toBeTruthy();
  });

  it("qualifies the close with the session it came from", () => {
    // A close is the last session we hold a bar for, not today. The figure is
    // meaningless — and quietly wrong during a live session — without this.
    render(
      <SecurityIdentity symbol="NVDA" view={securitiesFixtureView("full")} />,
    );

    // And it says what the percentage beside it is measured *from*, which is
    // the previous session's close and not the session's own open. The panel
    // below states an open-to-close move across its window, so this page shows
    // two percentages about one session that legitimately disagree — 2026-09-11
    // was -0.03% here and -1.38% there — and each is only readable with its
    // baseline on it. See the note above `Close` in the component.
    expect(
      screen.getByText(`${FIXTURE_SESSION} · change from the previous close`),
    ).toBeTruthy();
  });

  it("drops the baseline clause when there is no previous close to compare", () => {
    // The clause is a claim about a subtraction. Where the store holds one
    // daily bar there is no subtraction, the figure says so itself, and a
    // qualifier repeating it in secondary ink is furniture — so the line falls
    // back to the bare session date rather than describing a comparison that
    // was not made.
    const loaded = securitiesFixtureView("full");
    if (loaded.state !== "loaded") throw new TypeError("fixture is not loaded");

    const close = loaded.lastCloses.get("NVDA");
    if (close === undefined) throw new TypeError("fixture has no NVDA close");

    const lastCloses = new Map(loaded.lastCloses);
    lastCloses.set("NVDA", { ...close, previousClose: null });

    render(<SecurityIdentity symbol="NVDA" view={{ ...loaded, lastCloses }} />);

    expect(screen.getByText(FIXTURE_SESSION)).toBeTruthy();
    expect(screen.queryByText(/change from the previous close/)).toBeNull();
    expect(screen.getByText("No previous session")).toBeTruthy();
  });

  it("says a close is absent rather than rendering a zero", () => {
    render(
      <SecurityIdentity
        symbol={FIXTURE_SUBJECTS.withoutClose}
        // The `gaps` body is where the three gap subjects live; `full` has no
        // gaps in it at all, which is what makes it the control.
        view={securitiesFixtureView("gaps")}
      />,
    );

    expect(screen.getByText("None stored")).toBeTruthy();
    expect(screen.getByText("no daily close stored")).toBeTruthy();
    expect(screen.queryByText("0.00")).toBeNull();
  });

  it("shows an untracked security and marks it", () => {
    // `UNIVERSE.md` §12.2: this screen is a reader that must not filter. A
    // symbol that vanished here would be the failure the schema avoids by
    // having no `deleted_at`.
    render(
      <SecurityIdentity
        symbol={FIXTURE_SUBJECTS.untracked}
        view={securitiesFixtureView("untracked")}
      />,
    );

    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
      FIXTURE_SUBJECTS.untracked,
    );
    expect(screen.getByText("Untracked")).toBeTruthy();
  });

  it("says a symbol is not tracked rather than reporting a failure", () => {
    render(
      <SecurityIdentity symbol="ZZZZ" view={securitiesFixtureView("full")} />,
    );

    expect(
      screen.getByText(/MarketPulse does not track this security/),
    ).toBeTruthy();
  });

  it("distinguishes a universe that could not be read from one that is empty", () => {
    const { unmount } = render(
      <SecurityIdentity
        symbol="NVDA"
        view={securitiesFixtureView("nothingAnswered")}
      />,
    );
    expect(screen.getByText(/could not be read/)).toBeTruthy();
    unmount();

    render(
      <SecurityIdentity symbol="NVDA" view={securitiesFixtureView("empty")} />,
    );
    expect(screen.getByText(/holds no securities at all/)).toBeTruthy();
  });

  it("renders no live region of its own", () => {
    // `SEARCH-AND-SELECTION.md` §4 decided this deliberately: the page's third
    // `role="status"` is search's, on an argument this surface cannot borrow.
    // Nothing else in the tree refuses a fourth, so it is refused here.
    const { container } = render(
      <SecurityIdentity symbol="NVDA" view={securitiesFixtureView("full")} />,
    );

    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(container.querySelector("[aria-live]")).toBeNull();
  });
});
