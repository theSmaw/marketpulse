import { describe, expect, it } from "vitest";

import {
  barSeriesFixtureRequest,
  barSeriesFixtureResult,
  barSeriesFixtureView,
} from "../fixtures/bar-series.js";
import type { BarSeriesState } from "./held-series.js";
import {
  barSeriesScreen,
  toBarSeriesState,
  toRequestedBarSeriesState,
} from "./held-series.js";

// **What stays on screen when the question changes** (Task 2.13.7).
//
// The three transitions and the one rule, at the level they can actually be
// held to. Everything below is over **recorded** bodies collapsed through the
// real functions — the rule this repository has for states is the rule for
// sequences of them, and a hand-built `BarSeriesState` could hold a `held` that
// no sequence of requests could produce.
//
// What this file cannot see, and two other levels do: that the rail says the
// right sentence (`BarSeriesPanel.test.tsx`) and that a window change in a real
// browser leaves a chart on screen (`e2e/specs/security-window-change.spec.ts`).

const NOTHING: BarSeriesState = { view: { state: "loading" }, held: null };

/** The state after one window's answer has landed. */
function answered(name: "dense" | "partial" | "empty", sessions: number) {
  return toRequestedBarSeriesState(
    NOTHING,
    barSeriesFixtureRequest(sessions),
    barSeriesFixtureView(name),
  );
}

describe("toRequestedBarSeriesState", () => {
  it("keeps the last answer when only the window changes", () => {
    const before = answered("dense", 5);
    const after = toRequestedBarSeriesState(
      before,
      barSeriesFixtureRequest(21),
      {
        state: "loading",
      },
    );

    // The view resets — nothing is known about twenty-one sessions yet — and
    // the picture does not. That is acceptance criterion 4 at its narrowest.
    expect(after.view.state).toBe("loading");
    expect(after.held?.view.state).toBe("loaded");
    expect(after.held?.request.window).toEqual({ form: "named", sessions: 5 });
  });

  it("drops the last answer when the security changes", () => {
    // The fence, and the whole reason the held request carries a symbol. A held
    // NVDA series under an AMD heading is plausible and wrong rather than
    // visibly broken, which is the failure mode this layer exists to prevent.
    const before = answered("dense", 5);
    const after = toRequestedBarSeriesState(
      before,
      { ...barSeriesFixtureRequest(5), symbol: "AMD" },
      { state: "loading" },
    );

    expect(after.held).toBeNull();
  });

  it("treats a cache hit for the new window as the answer, not as a hold", () => {
    // The distinction that decides whether a rail appears: a held entry for the
    // key being asked for *is* this window's answer, so there is no previous
    // window on screen to name.
    const before = answered("dense", 5);
    const request = barSeriesFixtureRequest(21);
    const after = toRequestedBarSeriesState(
      before,
      request,
      barSeriesFixtureView("daily"),
    );

    expect(after.held?.request).toBe(request);
    expect(barSeriesScreen(after, request).previous).toBeNull();
  });
});

describe("toBarSeriesState", () => {
  it("keeps the previous window's answer through a refusal", () => {
    const request = barSeriesFixtureRequest(1000);
    const changing = toRequestedBarSeriesState(answered("dense", 5), request, {
      state: "loading",
    });

    const after = toBarSeriesState(
      changing,
      request,
      barSeriesFixtureResult("refusedCalendar"),
    );

    expect(after.view.state).toBe("refused");
    expect(after.held?.view.state).toBe("loaded");
  });

  it("keeps it through a failure too", () => {
    const request = barSeriesFixtureRequest(21);
    const changing = toRequestedBarSeriesState(answered("dense", 5), request, {
      state: "loading",
    });

    const after = toBarSeriesState(
      changing,
      request,
      barSeriesFixtureResult("unavailable"),
    );

    expect(after.view.state).toBe("failed");
    expect(after.held?.view.state).toBe("loaded");
  });

  it("replaces it the moment a newer answer lands", () => {
    const request = barSeriesFixtureRequest(63);
    const changing = toRequestedBarSeriesState(answered("dense", 5), request, {
      state: "loading",
    });

    const after = toBarSeriesState(
      changing,
      request,
      barSeriesFixtureResult("daily"),
    );

    // Not merely *a* newer answer: the held one is now the answer to the window
    // that was asked for, which is what takes the rail off the screen.
    expect(after.held?.request).toBe(request);
    expect(barSeriesScreen(after, request).previous).toBeNull();
  });

  it("keeps it through a failure that lands on a stale cached answer", () => {
    // **The second blanking, and nobody had reported it.** A cached answer
    // paints on mount and the refetch behind it fails; before this task the
    // correct chart was replaced by a failure with no window in it. Same shape,
    // same rule, and it is not a window change at all.
    const request = barSeriesFixtureRequest(5);
    const cached = toRequestedBarSeriesState(
      NOTHING,
      request,
      barSeriesFixtureView("dense"),
    );

    const after = toBarSeriesState(
      cached,
      request,
      barSeriesFixtureResult("unavailable"),
    );

    expect(after.view.state).toBe("failed");
    expect(barSeriesScreen(after, request).shown.state).toBe("loaded");
  });

  it("leaves both fields alone when an answer is superseded", () => {
    // `aborted` has no branch of its own — `toBarSeriesView` returns the
    // previous view for it — and this asserts the consequence rather than the
    // implementation: a request this hook stopped waiting for changes nothing.
    const request = barSeriesFixtureRequest(5);
    const before = answered("dense", 5);

    const after = toBarSeriesState(before, request, { outcome: "aborted" });

    expect(after).toEqual(before);
  });
});

describe("barSeriesScreen", () => {
  it("draws the answer itself whenever there is one", () => {
    const request = barSeriesFixtureRequest(5);

    for (const name of ["dense", "partial", "empty"] as const) {
      const screen = barSeriesScreen(answered(name, 5), request);

      expect(screen.shown).toBe(screen.view);
      expect(screen.previous).toBeNull();
    }
  });

  it("draws nothing extra when a state with no picture has nothing held", () => {
    // A cold load that is refused draws no frame, exactly as it did before this
    // task. The rail exists only where there is something for it to be about.
    const request = barSeriesFixtureRequest(1000);
    const screen = barSeriesScreen(
      toBarSeriesState(
        NOTHING,
        request,
        barSeriesFixtureResult("refusedCalendar"),
      ),
      request,
    );

    expect(screen.shown.state).toBe("refused");
    expect(screen.previous).toBeNull();
  });

  it("names both windows when a held answer is on screen", () => {
    const request = barSeriesFixtureRequest(21);
    const changing = toRequestedBarSeriesState(answered("dense", 5), request, {
      state: "loading",
    });

    const screen = barSeriesScreen(changing, request);

    expect(screen.asked.window).toEqual({ form: "named", sessions: 21 });
    expect(screen.previous?.window).toEqual({ form: "named", sessions: 5 });
    expect(screen.shown.state).toBe("loaded");
    expect(screen.view.state).toBe("loading");
  });
});
