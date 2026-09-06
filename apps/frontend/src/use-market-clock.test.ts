import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { readMarketClock, useMarketClock } from "./use-market-clock.js";

// The clock seam (Task 2.5.5).
//
// **Nearly all of this needs no fake timers and no clock mocking**, and that is
// the seam paying for itself rather than a convenience: `readMarketClock` is a
// pure function of the instant it is given, so every rendering the header can
// produce — including the one that only happens after 2028 — is reached by
// passing a `Date`. Only the four tests about the *timer* need control of time,
// and they take it through the hook's own `now` option rather than by mocking a
// global.

// Instants chosen from the calendar rather than invented. September is EDT
// (UTC-4) and late November is EST (UTC-5), which is why the two groups below
// use different UTC hours for the same market hour — the exact fact
// `market-time.ts` exists to get right, arriving here as arithmetic somebody
// would otherwise fudge.
const TUESDAY_BEFORE_OPEN = new Date("2026-09-08T12:00:00Z"); // 08:00 ET
const TUESDAY_OPEN = new Date("2026-09-08T14:00:00Z"); // 10:00 ET
const TUESDAY_AFTER_CLOSE = new Date("2026-09-08T21:30:00Z"); // 17:30 ET
const SATURDAY = new Date("2026-09-05T16:00:00Z"); // 12:00 ET
const THANKSGIVING = new Date("2026-11-26T15:00:00Z"); // 10:00 ET
const HALF_DAY_OPEN = new Date("2026-11-27T17:00:00Z"); // 12:00 ET, closes 13:00
const HALF_DAY_AFTER = new Date("2026-11-27T19:00:00Z"); // 14:00 ET
const DAY_OF_MOURNING = new Date("2025-01-09T15:00:00Z"); // 10:00 ET
const BEYOND_THE_CALENDAR = new Date("2029-01-02T15:00:00Z");

describe("readMarketClock", () => {
  it("reads the market's wall clock rather than the viewer's", () => {
    // The assertion that fails if anything here reached for `Date#getHours()`.
    // 14:00Z is 10:00 in New York and something else everywhere else.
    const { time } = readMarketClock(TUESDAY_OPEN);

    expect(time.hour).toBe(10);
    expect(time.minute).toBe(0);
    expect(time.date).toBe("2026-09-08");
  });

  it("reports an open market during the session", () => {
    expect(readMarketClock(TUESDAY_OPEN).session).toMatchObject({
      status: "open",
    });
  });

  it("distinguishes before the open from after the close", () => {
    // The two states a boolean would collapse, and the reason
    // `MarketSessionState` is a union: both mean "not trading" and only one of
    // them means "wait".
    expect(readMarketClock(TUESDAY_BEFORE_OPEN).session).toMatchObject({
      status: "before_open",
    });
    expect(readMarketClock(TUESDAY_AFTER_CLOSE).session).toMatchObject({
      status: "after_close",
    });
  });

  it("reports a weekend as a weekend rather than as a holiday", () => {
    expect(readMarketClock(SATURDAY).session).toMatchObject({
      status: "weekend",
    });
  });

  it("carries the calendar's own name for a closure", () => {
    expect(readMarketClock(THANKSGIVING).session).toMatchObject({
      status: "holiday",
      name: "Thanksgiving Day",
    });
  });

  it("carries a name that is not a holiday", () => {
    // The row no rule set could produce, and the reason the calendar is a table
    // read off a published record. Any copy written around this component has
    // to survive it — see `MarketClock`.
    expect(readMarketClock(DAY_OF_MOURNING).session).toMatchObject({
      status: "holiday",
      name: "National Day of Mourning (President Carter)",
    });
  });

  it("carries the early close on a half day", () => {
    const state = readMarketClock(HALF_DAY_OPEN).session;

    expect(state).toMatchObject({ status: "open" });
    // Narrowed by the assertion above; `expect.fail` returns `never`.
    if (state?.status !== "open") expect.fail("expected an open session");
    expect(state.session.isEarlyClose).toBe(true);
    expect(state.session.minuteBars).toBe(210);
  });

  it("treats a half day as shut after its early close", () => {
    // 14:00 ET on a day that closed at 13:00. A clock that used the regular
    // 16:00 bound would call this open, which is the one thing a half day
    // exists to get wrong.
    expect(readMarketClock(HALF_DAY_AFTER).session).toMatchObject({
      status: "after_close",
    });
  });

  // --- The degradation, asserted by moving the instant rather than by waiting ---

  it("still reads the time past the end of the trading calendar", () => {
    // The half that survives. A timezone conversion has no range; only the
    // calendar does.
    const { time } = readMarketClock(BEYOND_THE_CALENDAR);

    expect(time.hour).toBe(10);
    expect(time.date).toBe("2029-01-02");
  });

  it("declines to claim a session state past the end of the calendar", () => {
    // `null` means "declines to claim", never "closed" — and this is the case
    // that would otherwise throw `MarketCalendarRangeError` into the chrome's
    // ErrorBoundary and replace the entire header, on every route, on New
    // Year's Day 2029.
    expect(readMarketClock(BEYOND_THE_CALENDAR).session).toBeNull();
  });

  it("rethrows anything that is not the calendar running out", () => {
    // A bare `catch` would swallow a `MarketTimeError` and any genuine bug in
    // the session functions, turning "the header degraded honestly" into "the
    // header hides faults". `Invalid Date` is the cheapest instant that makes
    // the machinery below fail for a different reason.
    expect(() => readMarketClock(new Date(Number.NaN))).toThrow();
  });
});

describe("useMarketClock", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("reads the clock once on mount and renders a real time immediately", () => {
    // No `checking` placeholder and no "not yet read" state: reading a clock is
    // synchronous and cannot fail, so the moment where the answer is unknown
    // does not exist.
    const { result } = renderHook(() =>
      useMarketClock({ now: () => TUESDAY_OPEN }),
    );

    expect(result.current.time.hour).toBe(10);
    expect(result.current.session).toMatchObject({ status: "open" });
  });

  it("ticks on the second boundary rather than every 1000 ms", () => {
    vi.useFakeTimers();

    // 10:00:00.250 ET. A boundary-scheduled clock waits 750 ms; a naive
    // `setInterval(…, 1000)` would wait 1000 and drift by a quarter-second on
    // the very first tick — which is how a clock comes to visibly skip a
    // second every minute or so.
    let current = new Date("2026-09-08T14:00:00.250Z");
    const { result } = renderHook(() => useMarketClock({ now: () => current }));

    act(() => {
      current = new Date("2026-09-08T14:00:00.999Z");
      vi.advanceTimersByTime(749);
    });
    expect(result.current.instant.getTime()).toBe(
      new Date("2026-09-08T14:00:00.250Z").getTime(),
    );

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.instant.getTime()).toBe(
      new Date("2026-09-08T14:00:00.999Z").getTime(),
    );
  });

  it("re-anchors on every tick rather than accumulating drift", () => {
    vi.useFakeTimers();

    // Second tick from a .999 instant is 1 ms away, not 1000. An interval-based
    // clock cannot produce that.
    let current = new Date("2026-09-08T14:00:00.999Z");
    const { result } = renderHook(() => useMarketClock({ now: () => current }));

    act(() => {
      current = new Date("2026-09-08T14:00:01.000Z");
      vi.advanceTimersByTime(1);
    });

    expect(result.current.time.second).toBe(1);
  });

  it("does not tick while the tab is hidden, and catches up when it returns", () => {
    vi.useFakeTimers();

    let visibility: DocumentVisibilityState = "visible";
    vi.spyOn(document, "visibilityState", "get").mockImplementation(
      () => visibility,
    );

    let current = new Date("2026-09-08T14:00:00.000Z");
    const { result } = renderHook(() => useMarketClock({ now: () => current }));

    act(() => {
      visibility = "hidden";
      document.dispatchEvent(new Event("visibilitychange"));
    });

    act(() => {
      current = new Date("2026-09-08T14:05:00.000Z");
      vi.advanceTimersByTime(300_000);
    });

    // Five minutes of a hidden tab and not one render. This is the same
    // decision `useBackendHealth` took, for a different reason: a poll costs a
    // request, and a tick costs a render.
    expect(result.current.time.minute).toBe(0);

    act(() => {
      visibility = "visible";
      document.dispatchEvent(new Event("visibilitychange"));
    });

    // Catching up rather than resuming. A clock that showed 10:00 for up to a
    // second after the tab came back is the one thing a clock must never do.
    expect(result.current.time.minute).toBe(5);
  });

  it("schedules nothing at all when it mounts into a hidden tab", () => {
    vi.useFakeTimers();
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");

    let current = new Date("2026-09-08T14:00:00.000Z");
    const { result } = renderHook(() => useMarketClock({ now: () => current }));

    act(() => {
      current = new Date("2026-09-08T14:00:05.000Z");
      vi.advanceTimersByTime(5000);
    });

    // The mount path, and it is a **separate** assertion from the test above
    // rather than a duplicate of it — found by breaking the guard and watching
    // nothing go red. When a *visible* tab is hidden, what stops the loop is
    // the listener's `clearPending()`; when a tab is hidden from the start
    // there is no event to fire, and only `schedule`'s own guard stands there.
    // Removing it left every other test in this file green.
    //
    // A page opened in a background tab therefore renders the time it mounted
    // with and holds it, which is correct: the render it is not doing is the
    // cost, and it catches up the instant the tab is looked at.
    expect(vi.getTimerCount()).toBe(0);
    expect(result.current.time.second).toBe(0);
  });

  it("stops ticking when unmounted", () => {
    vi.useFakeTimers();

    let current = new Date("2026-09-08T14:00:00.000Z");
    const { unmount } = renderHook(() =>
      useMarketClock({ now: () => current }),
    );

    unmount();
    current = new Date("2026-09-08T14:00:05.000Z");

    // No pending timer, so nothing schedules a render into an unmounted tree —
    // the same teardown property `useBackendHealth` holds through its abort.
    expect(vi.getTimerCount()).toBe(0);
  });
});
