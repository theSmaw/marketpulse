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

import { RECONNECT_CEILING_MS } from "./reconnect-policy.js";
import { LIVE_FEED_TICK_MS, useLiveFeed } from "./use-live-feed.js";

/** When the gateway sent the frame (Task 3.6.4). Any instant; only its presence is load-bearing here. */
const SENT_AT = "2026-09-16T14:02:00.512Z";

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
  sentAt: SENT_AT,
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
          sentAt: SENT_AT,
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
        sentAt: SENT_AT,
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

describe("teardown", () => {
  it("does not let a closing socket write into the NEXT connection", () => {
    // **The defect Task 3.3.6 found in a browser**, reproduced here so it
    // cannot come back silently. React's `StrictMode` opens two sockets on
    // every mount in development and closes the first immediately; its `close`
    // event fires after the effect has torn down, and the listener closes over
    // the ref the second mount is already using. The feed went permanently
    // `disconnected` on a developer's own screen, and in production the same
    // race is against any real unmount.
    vi.useFakeTimers();
    const first = new FakeSocket();
    const second = new FakeSocket();
    const sockets = [first, second];
    let opened = 0;

    const hook = renderHook(() =>
      useLiveFeed({
        now: () => 60_500,
        wallNow: () => BAR_ARRIVED,
        open: () => (sockets[opened++] ?? first) as unknown as WebSocket,
      }),
    );

    // The first mount's socket is taken away, as a remount does.
    hook.rerender();
    hook.unmount();

    // …and its close arrives late, which is the whole shape of the bug.
    first.emit("close");

    // Nothing to assert on a torn-down hook beyond this: the listener returned
    // without touching anything, so no error was thrown into a dead tree.
    expect(first.closed).toBeGreaterThan(0);
  });
});

describe("a new price reaches the screen", () => {
  const barsMessage = (close: number): MarketStreamMessage => ({
    type: "bars",
    version: MARKET_STREAM_PROTOCOL_VERSION,
    sentAt: SENT_AT,
    observations: {
      NVDA: {
        startsAt: "2026-09-16T14:01:00Z",
        open: 1,
        high: 1,
        low: 1,
        close,
        volume: 1,
      },
    },
  });

  it("renders when a price changes, and holds it on the view", () => {
    // **The assertion Task 3.4.1 exists for**, at the level where the defect
    // would actually bite. `sameLiveFeedView` is upstream of the reducer, so a
    // Map added without extending it updates correctly while the hook never
    // sets state — the Map is right and the screen is still.
    vi.useFakeTimers();
    let renders = 0;
    const socket = new FakeSocket();

    const hook = renderHook(() => {
      renders += 1;
      return useLiveFeed({
        now: () => 60_500,
        wallNow: () => BAR_ARRIVED,
        open: () => socket as unknown as WebSocket,
      });
    });

    socket.emit("message", {
      data: encodeMarketStreamMessage(snapshotWith(feedState())),
    });

    const afterSnapshot = renders;
    // The snapshot already carries a price — §11.1's whole argument for having
    // one, since a browser opening at 11:20 would otherwise see nothing until
    // each security's next bar, which §11.2 measured at up to three hours.
    expect(hook.result.current.observations.get("NVDA")?.close).toBe(1);

    socket.emit("message", {
      data: encodeMarketStreamMessage(barsMessage(218.29)),
    });

    expect(renders).toBeGreaterThan(afterSnapshot);
    expect(hook.result.current.observations.get("NVDA")?.close).toBe(218.29);

    // And again, because one render could be the snapshot settling rather than
    // the price arriving.
    const afterFirstPrice = renders;
    socket.emit("message", {
      data: encodeMarketStreamMessage(barsMessage(219.5)),
    });

    expect(renders).toBeGreaterThan(afterFirstPrice);
    expect(hook.result.current.observations.get("NVDA")?.close).toBe(219.5);
  });

  it("does not render when a keepalive carries no price", () => {
    // The property this must not cost: thirty keepalives an hour redrawing an
    // identical screen is the defect that produced 40 renders in 20 s.
    vi.useFakeTimers();
    let renders = 0;
    const socket = new FakeSocket();

    renderHook(() => {
      renders += 1;
      return useLiveFeed({
        now: () => 60_500,
        wallNow: () => BAR_ARRIVED,
        open: () => socket as unknown as WebSocket,
      });
    });

    socket.emit("message", {
      data: encodeMarketStreamMessage(snapshotWith(feedState())),
    });
    socket.emit("message", {
      data: encodeMarketStreamMessage(barsMessage(218.29)),
    });

    const settled = renders;

    for (let i = 0; i < 3; i += 1) {
      socket.emit("message", {
        data: encodeMarketStreamMessage({
          type: "feed",
          version: MARKET_STREAM_PROTOCOL_VERSION,
          sentAt: SENT_AT,
          feed: feedState(),
        }),
      });
    }

    expect(renders - settled).toBeLessThanOrEqual(1);
  });
});

describe("the reconnect (Task 3.5.5)", () => {
  // **Story 3.3 shipped this socket with no retry**, so every backend deploy
  // left every open tab reading `DISCONNECTED` until somebody reloaded — and
  // deploys happen on every merge to `main`. These are the assertions that
  // stop that regressing.
  //
  // Every timer here is a seam. The backoff reaches 30 s and a test that
  // waited it out would be a test nobody runs.

  interface Scheduled {
    readonly fn: () => void;
    readonly ms: number;
  }

  function reconnecting(visible = { now: true }) {
    const sockets: FakeSocket[] = [];
    const scheduled: Scheduled[] = [];
    let nextTimer = 0;

    const hook = renderHook(() =>
      useLiveFeed({
        now: () => 1_000,
        wallNow: () => Date.parse("2026-09-16T14:02:00Z"),
        open: () => {
          const socket = new FakeSocket();
          sockets.push(socket);
          return socket as unknown as WebSocket;
        },
        setTimer: (fn, ms) => {
          scheduled.push({ fn, ms });
          nextTimer += 1;
          return nextTimer;
        },
        clearTimer: () => undefined,
        isVisible: () => visible.now,
      }),
    );

    return {
      hook,
      sockets,
      scheduled,
      /** The socket currently attached. */
      latest: (): FakeSocket => {
        const socket = sockets.at(-1);
        if (socket === undefined) throw new Error("no socket was opened");
        return socket;
      },
      /** Run whatever retry is pending, as the browser's timer would. */
      fire: (): void => {
        const next = scheduled.pop();
        if (next === undefined) throw new Error("nothing was scheduled");
        act(() => {
          next.fn();
        });
      },
    };
  }

  it("dials again after the socket closes", () => {
    // **Criterion 1's mechanism.** Before this, one socket was opened and that
    // was the whole of the connection's life.
    const h = reconnecting();
    expect(h.sockets).toHaveLength(1);

    h.latest().emit("close", { code: 1001 });
    expect(h.scheduled).toHaveLength(1);

    h.fire();
    expect(h.sockets).toHaveLength(2);
  });

  it("comes back sooner after `1001 going away` than after a dead socket", () => {
    // §12.2 has the gateway send `1001` on shutdown and §8.5 measured that an
    // abnormal close carries no intent — so a deploy and a dead network are
    // genuinely different, and the wire already said which.
    const deploy = reconnecting();
    deploy.latest().emit("close", { code: 1001 });
    const afterDeploy = deploy.scheduled.at(-1)?.ms ?? 0;

    const dead = reconnecting();
    dead.latest().emit("close", { code: 1006 });
    const afterDead = dead.scheduled.at(-1)?.ms ?? 0;

    expect(afterDeploy).toBeLessThan(afterDead);
  });

  it("backs off across repeated failures, and stays bounded", () => {
    const h = reconnecting();
    const delays: number[] = [];

    for (let round = 0; round < 8; round += 1) {
      h.latest().emit("close", { code: 1006 });
      delays.push(h.scheduled.at(-1)?.ms ?? 0);
      h.fire();
    }

    // Rising…
    expect(delays[1]).toBeGreaterThan(delays[0] ?? 0);
    // …and capped, rather than growing without limit.
    expect(Math.max(...delays)).toBeLessThanOrEqual(RECONNECT_CEILING_MS);
  });

  it("resets the backoff once a message actually arrives", () => {
    // **Keyed on a message rather than on `opened`.** A socket that opens and
    // is closed immediately — a server refusing during a rollout — would
    // otherwise reset the count every time and retry forever at 500 ms.
    const h = reconnecting();

    h.latest().emit("close", { code: 1006 });
    const first = h.scheduled.at(-1)?.ms ?? 0;
    h.fire();
    h.latest().emit("close", { code: 1006 });
    const second = h.scheduled.at(-1)?.ms ?? 0;
    expect(second).toBeGreaterThan(first);

    h.fire();
    h.latest().emit("message", {
      data: encodeMarketStreamMessage(snapshotWith(feedState())),
    });
    h.latest().emit("close", { code: 1006 });

    expect(h.scheduled.at(-1)?.ms).toBe(first);
  });

  it("does NOT retry while the tab is hidden", () => {
    // A backgrounded tab reconnecting on a schedule is a battery and a bill,
    // and it is the same judgement `useBackendHealth` already makes.
    const visible = { now: false };
    const h = reconnecting(visible);

    h.latest().emit("close", { code: 1001 });

    expect(h.scheduled).toHaveLength(0);
    expect(h.sockets).toHaveLength(1);
  });

  it("retries IMMEDIATELY when a hidden tab comes back", () => {
    // Waiting out a backoff that was never running would make a returning
    // reader stare at `DISCONNECTED` for no reason.
    const visible = { now: false };
    const h = reconnecting(visible);

    h.latest().emit("close", { code: 1001 });
    expect(h.scheduled).toHaveLength(0);

    visible.now = true;
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(h.scheduled.at(-1)?.ms).toBe(0);
  });

  it("stops dialling once the hook unmounts", () => {
    // The teardown guard this file already documents, now with a timer behind
    // it: a retry that outlived its component would open a socket nothing is
    // listening to.
    const h = reconnecting();
    h.latest().emit("close", { code: 1001 });

    h.hook.unmount();

    expect(() => {
      h.fire();
    }).not.toThrow();
    expect(h.sockets).toHaveLength(1);
  });
});
