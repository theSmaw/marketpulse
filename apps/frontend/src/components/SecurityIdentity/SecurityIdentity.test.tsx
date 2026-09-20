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

describe("a live price (Task 3.4.2)", () => {
  const bar = (close: number, startsAt = "2026-09-16T18:01:00Z") => ({
    startsAt: new Date(startsAt),
    open: close,
    high: close,
    low: close,
    close,
    volume: 1,
  });

  it("changes the label, the figure and the qualifier together", () => {
    // **All three lines move, which is what makes this a STATED substitution
    // rather than a silent one.** A live price is not a newer version of a
    // session close — it is a different number, measured from a different
    // thing, true at a different time.
    render(
      <SecurityIdentity
        symbol="NVDA"
        view={securitiesFixtureView("full")}
        live={bar(219.5)}
      />,
    );

    expect(screen.getByText("Latest price")).toBeDefined();
    expect(screen.queryByText("Last session close")).toBeNull();
    expect(screen.getByText("219.50")).toBeDefined();
  });

  it("names the close it is measured from rather than deleting it", () => {
    // The displaced fact becomes the stated reference. *Change from the
    // previous close* was always true; it is now from a close with a date.
    render(
      <SecurityIdentity
        symbol="NVDA"
        view={securitiesFixtureView("full")}
        live={bar(219.5)}
      />,
    );

    expect(screen.getByText(/change from .*'s close/u)).toBeDefined();
  });

  it("says WHEN, because a live price may legitimately be hours old", () => {
    // §10.3: every entry carries its own instant and no reader may render a
    // price without reading it. §7.6 measured `ERIE` producing a bar in 2.1%
    // of minutes — hours-old is the feed working, and only the instant tells
    // that apart from a minute-old one.
    render(
      <SecurityIdentity
        symbol="NVDA"
        view={securitiesFixtureView("full")}
        live={bar(219.5)}
      />,
    );

    expect(screen.getByText(/14:01/u)).toBeDefined();
  });

  it("never puts a status word beside a price", () => {
    // §11.2: a security gets NO status word. The gap between one security's
    // bars has a p50 of one minute and a maximum of 187, so no threshold
    // separates a quiet security from a broken one.
    render(
      <SecurityIdentity
        symbol="NVDA"
        view={securitiesFixtureView("full")}
        live={bar(219.5)}
      />,
    );

    for (const word of ["live", "stale", "disconnected"]) {
      expect(screen.queryByText(word, { exact: true })).toBeNull();
    }
  });

  it("leaves the block alone when there is no live price", () => {
    // The ordinary case: no provider, not connected, or this security has not
    // traded since we connected. Absence is not a failure.
    render(
      <SecurityIdentity symbol="NVDA" view={securitiesFixtureView("full")} />,
    );

    expect(screen.getByText("Last session close")).toBeDefined();
    expect(screen.queryByText("Latest price")).toBeNull();
  });
});
