import {
  DISCONNECTED_AFTER_MS,
  MARKET_STREAM_PROTOCOL_VERSION,
  OBSERVATION_INTERVAL_MS,
  STALE_AFTER_MS,
  type MarketStreamMessage,
  type WireFeedState,
  encodeMarketStreamMessage,
} from "@marketpulse/shared";
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LIVE_FEED_TICK_MS, useLiveFeed } from "./use-live-feed.js";

// The hook (Task 3.3.4). **Nothing renders it yet** — Task 3.3.5 does — so
// what is under test is the wiring the pure halves cannot cover: that a socket
// is opened once, that silence eventually becomes a state, and that a keepalive
// carrying an unchanged state causes **no render**.

const BAR_START = Date.parse("2026-09-16T14:01:00Z");
const BAR_ARRIVED = Date.parse("2026-09-16T14:02:00.5Z");

class FakeSocket {
  readonly listeners = new Map<string, ((event: unknown) => void)[]>();
  closed = 0;

  addEventListener(kind: string, listener: (event: unknown) => void): void {
    this.listeners.set(kind, [...(this.listeners.get(kind) ?? []), listener]);
  }

  close(): void {
    this.closed += 1;
  }

  emit(kind: string, event: unknown = {}): void {
    act(() => {
      for (const listener of this.listeners.get(kind) ?? []) listener(event);
    });
  }
}

const feedState = (over: Partial<WireFeedState> = {}): WireFeedState => ({
  status: "live",
  feed: "iex",
  marketOpen: true,
  ...over,
});

const snapshotWith = (feed: WireFeedState): MarketStreamMessage => ({
  type: "snapshot",
  version: MARKET_STREAM_PROTOCOL_VERSION,
  feed,
  observations: {
    NVDA: {
      startsAt: "2026-09-16T14:01:00Z",
      open: 1,
      high: 1,
      low: 1,
      close: 1,
      volume: 1,
    },
  },
});

/**
 * Both clocks are controlled and neither is a global mock.
 *
 * The monotonic one advances only when a test says so — which is what makes a
 * 165 s threshold assertable in a millisecond — and the wall one is a fixed
 * instant taken from §7.3's measured arrival rather than from `Date.now()`.
 */
function mounted(startAt = 60_500) {
  // **One socket, made before the hook rather than collected from it**, so
  // nothing here has to index an array it cannot prove is populated.
  const socket = new FakeSocket();
  let opens = 0;
  let monotonic = startAt;
  let wall = BAR_ARRIVED;

  const hook = renderHook(() =>
    useLiveFeed({
      now: () => monotonic,
      wallNow: () => wall,
      open: () => {
        opens += 1;
        return socket as unknown as WebSocket;
      },
    }),
  );

  return {
    hook,
    socket,
    opens: (): number => opens,
    advance: (monotonicMs: number, wallMs = monotonicMs): void => {
      monotonic += monotonicMs;
      wall += wallMs;
      act(() => {
        vi.advanceTimersByTime(LIVE_FEED_TICK_MS);
      });
    },
    send: (message: MarketStreamMessage): void => {
      socket.emit("message", {
        data: encodeMarketStreamMessage(message),
      });
    },
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("the connection", () => {
  it("opens exactly one socket and closes it on unmount", () => {
    vi.useFakeTimers();
    const { hook, socket, opens } = mounted();

    expect(opens()).toBe(1);

    hook.unmount();
    expect(socket.closed).toBe(1);
  });

  it("reports disconnected before anything has arrived", () => {
    vi.useFakeTimers();
    const { hook } = mounted();

    expect(hook.result.current.status).toBe("disconnected");
    expect(hook.result.current.feed).toBeNull();
  });

  it("reports the feed once the snapshot lands", () => {
    vi.useFakeTimers();
    const { hook, send } = mounted();

    send(snapshotWith(feedState()));

    expect(hook.result.current.status).toBe("live");
    expect(hook.result.current.feed).toBe("iex");
    expect(hook.result.current.observedAt).toBe(BAR_START);
  });

  it("turns a closed socket into a STATE rather than a thrown render", () => {
    // §36 forbids collapsing to a global error screen, and this is the first
    // place in the frontend where that is testable rather than true by the
    // absence of a failure path.
    vi.useFakeTimers();
    const { hook, socket, send } = mounted();

    send(snapshotWith(feedState()));
    expect(hook.result.current.status).toBe("live");

    socket.emit("close");

    expect(hook.result.current.status).toBe("disconnected");
    expect(hook.result.current.backendReachable).toBe(false);
  });
});

describe("the two clocks, which is why the timer exists", () => {
  it("notices silence with no event to react to", () => {
    // **Silence has no event.** A feed that stops produces nothing to handle,
    // so the only way to see 165 s of it is to look.
    vi.useFakeTimers();
    const { hook, advance, send } = mounted();

    send(snapshotWith(feedState()));
    expect(hook.result.current.status).toBe("live");

    advance(DISCONNECTED_AFTER_MS);

    expect(hook.result.current.status).toBe("disconnected");
  });

  it("reaches STALE, which is the regression that made it unreachable twice", () => {
    // Once in Task 3.2.5 by merging the two clocks, and once — in the other
    // direction — by measuring an observation's age from the instant that
    // OPENS its minute. This asserts the state is reachable at all, which is
    // why it is an acceptance criterion rather than a nice-to-have.
    vi.useFakeTimers();
    const { hook, advance, send } = mounted();

    send(snapshotWith(feedState()));
    expect(hook.result.current.status).toBe("live");

    // The wall clock runs past the bar's own minute plus §11.2's silence, while
    // the socket stays demonstrably alive on the monotonic one.
    advance(LIVE_FEED_TICK_MS, OBSERVATION_INTERVAL_MS + STALE_AFTER_MS);

    expect(hook.result.current.status).toBe("stale");
    expect(hook.result.current.backendReachable).toBe(true);
  });
});

describe("what a keepalive costs", () => {
  it("causes NO render when the state it carries is unchanged", () => {
    // Task 3.3.2's gateway sends this every 120 s whether or not anything
    // changed, because Azure cuts a socket idle for 240 s and §6.6 measured our
    // own feed legitimately silent for 76 minutes out of hours.
    vi.useFakeTimers();
    let renders = 0;
    const socket = new FakeSocket();
    let monotonic = 60_500;

    renderHook(() => {
      renders += 1;
      return useLiveFeed({
        now: () => monotonic,
        wallNow: () => BAR_ARRIVED,
        open: () => socket as unknown as WebSocket,
      });
    });

    socket.emit("message", {
      data: encodeMarketStreamMessage(snapshotWith(feedState())),
    });

    const afterSnapshot = renders;

    const keepalive = (): void => {
      monotonic += 120_000;
      socket.emit("message", {
        data: encodeMarketStreamMessage({
          type: "feed",
          version: MARKET_STREAM_PROTOCOL_VERSION,
          feed: feedState(),
        }),
      });
    };

    for (let i = 0; i < 3; i += 1) keepalive();
    const afterThree = renders;

    for (let i = 0; i < 3; i += 1) keepalive();

    // **The property that matters is that renders do not GROW with keepalives**,
    // and that is asserted rather than "zero renders" — which was the first
    // draft and is not what React promises. Setting state to a value React
    // considers unchanged bails out of re-rendering the subtree, but React may
    // still call the component itself once before it does. So an hour of
    // keepalives costs a bounded one-off rather than thirty renders, which is
    // the thing the chrome needed.
    expect(renders).toBe(afterThree);
    expect(renders - afterSnapshot).toBeLessThanOrEqual(1);
  });

  it("DOES render when the keepalive carries something new", () => {
    vi.useFakeTimers();
    const { hook, socket, send } = mounted();

    send(snapshotWith(feedState()));
    expect(hook.result.current.status).toBe("live");

    socket.emit("message", {
      data: encodeMarketStreamMessage({
        type: "feed",
        version: MARKET_STREAM_PROTOCOL_VERSION,
        feed: feedState({ status: "disconnected" }),
      }),
    });

    expect(hook.result.current.status).toBe("disconnected");
  });
});

describe("an unreadable message", () => {
  it("is counted, and reported exactly once", () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { hook, socket } = mounted();

    socket.emit("message", { data: "{not json" });
    socket.emit("message", { data: "{not json either" });

    expect(hook.result.current.unreadable).toBe(2);
    expect(warn).toHaveBeenCalledTimes(1);

    warn.mockRestore();
  });

  it("does not take the page down", () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { hook, socket, send } = mounted();

    socket.emit("message", { data: "{not json" });
    send(snapshotWith(feedState()));

    // The feed carries on working, which is the whole reason a decode returns a
    // value rather than throwing.
    expect(hook.result.current.status).toBe("live");

    warn.mockRestore();
  });
});
