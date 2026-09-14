import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  HOLD_FOR_MS,
  SHOW_AFTER_MS,
  usePendingPanel,
} from "./use-pending-panel.js";

// **The timing is the whole design here**, so it is the whole of what is
// asserted (2026-09-14).
//
// Fake timers rather than waiting, because the two numbers are 160 ms and
// 400 ms and a suite that slept through them would add most of a second per
// case for nothing — and because the interesting assertions are about the
// instant *either side* of a boundary, which real time cannot address.
//
// Every case is written in terms of the exported constants rather than the
// numbers. A test spelling `160` is a second home for it, and the one that
// matters is the module's.

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/** Advance the clock inside `act`, so React commits what the timer scheduled. */
function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("usePendingPanel", () => {
  it("shows nothing at all for a wait that ends quickly", () => {
    // The ordinary window change, and the reason the delay exists: measured at
    // 2–9 ms warm and 7–68 ms cold, every one of them lands here.
    const { rerender, result } = renderHook(
      ({ waiting }) => usePendingPanel(waiting),
      { initialProps: { waiting: true } },
    );

    advance(SHOW_AFTER_MS - 1);
    expect(result.current).toBe(false);

    rerender({ waiting: false });
    advance(SHOW_AFTER_MS * 10);

    // Never true at any point, which is stronger than "false at the end": the
    // failure this guards is one frame of panel, and a check only at the end
    // cannot see it.
    expect(result.current).toBe(false);
  });

  it("shows once the wait outlasts the delay", () => {
    const { result } = renderHook(() => usePendingPanel(true));

    advance(SHOW_AFTER_MS - 1);
    expect(result.current).toBe(false);

    advance(1);
    expect(result.current).toBe(true);
  });

  it("stays up for the minimum when the answer lands immediately after", () => {
    // The stutter this prevents: without the hold, a wait of 161 ms is 160 ms of
    // chart, one frame of panel, then the answer — a worse flicker than the one
    // the delay was added to remove.
    const { rerender, result } = renderHook(
      ({ waiting }) => usePendingPanel(waiting),
      { initialProps: { waiting: true } },
    );

    advance(SHOW_AFTER_MS);
    expect(result.current).toBe(true);

    rerender({ waiting: false });
    advance(HOLD_FOR_MS - 1);
    expect(result.current).toBe(true);

    advance(1);
    expect(result.current).toBe(false);
  });

  it("comes down at once when the minimum has already elapsed", () => {
    // The genuinely slow answer. The panel has been up longer than the minimum,
    // so there is nothing left to protect and the data must not be held back.
    const { rerender, result } = renderHook(
      ({ waiting }) => usePendingPanel(waiting),
      { initialProps: { waiting: true } },
    );

    advance(SHOW_AFTER_MS + HOLD_FOR_MS + 1);
    expect(result.current).toBe(true);

    rerender({ waiting: false });
    expect(result.current).toBe(false);
  });

  it("does not restart its clock on a re-render of the same wait", () => {
    // A component re-renders for reasons that have nothing to do with the
    // request. If each one reset the delay, a busy page would never show the
    // panel at all — and the bug would look exactly like the fast case working.
    const { rerender, result } = renderHook(
      ({ waiting }) => usePendingPanel(waiting),
      { initialProps: { waiting: true } },
    );

    advance(SHOW_AFTER_MS - 10);
    rerender({ waiting: true });
    advance(10);

    expect(result.current).toBe(true);
  });

  it("keeps one panel across a second window change during the hold", () => {
    // Press 5D then 1M while the first is still up. The panel must not blink
    // between them, and the minimum must measure from when a reader first saw
    // it rather than from the second press.
    const { rerender, result } = renderHook(
      ({ waiting }) => usePendingPanel(waiting),
      { initialProps: { waiting: true } },
    );

    advance(SHOW_AFTER_MS);
    rerender({ waiting: false });
    advance(10);
    rerender({ waiting: true });
    advance(10);

    expect(result.current).toBe(true);
  });
});
