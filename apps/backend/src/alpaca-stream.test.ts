import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { toTicker } from "@marketpulse/shared";

import {
  DISCONNECTED_AFTER_MS,
  REFUSED_RETRY_MS,
  createAlpacaStream,
  type StreamLogEvent,
  type WebSocketLike,
} from "./alpaca-stream.js";
import type { LiveObservation } from "./market-data-stream.js";
import type { StreamConnection } from "./stream-connection.js";

const CORPUS = join(import.meta.dirname, "fixtures", "alpaca-stream");
const frame = (name: string): string =>
  readFileSync(join(CORPUS, `${name}.json`), "utf8").trim();

const SYMBOLS = ["AAPL", "NVDA", "SPY"].map(toTicker);

/**
 * A socket that is a script rather than a server. Every test below runs with
 * **no network, no credential and no real timer** — acceptance criterion 6, and
 * what makes this suite a gate rather than an integration test.
 */
class FakeSocket implements WebSocketLike {
  readyState = 1;
  readonly sent: string[] = [];
  closedWith: number | undefined;
  private readonly listeners = new Map<string, ((...a: never[]) => void)[]>();

  send(data: string): void {
    // **`ws` throws SYNCHRONOUSLY when the socket is not `OPEN`**, with exactly
    // this message. A fake that swallowed the write would be a fake that
    // cannot reproduce the production crash, so it throws too.
    if (this.readyState !== 1) {
      throw new Error(
        `WebSocket is not open: readyState ${String(this.readyState)} (CONNECTING)`,
      );
    }
    this.sent.push(data);
  }
  close(code?: number): void {
    this.closedWith = code;
  }
  on(event: string, listener: (...args: never[]) => void): this {
    const existing = this.listeners.get(event) ?? [];
    this.listeners.set(event, [...existing, listener]);
    return this;
  }
  emit(event: string, ...args: unknown[]): void {
    for (const listener of this.listeners.get(event) ?? []) {
      (listener as (...a: unknown[]) => void)(...args);
    }
  }
  /** Deliver a fixture as the server would. */
  deliver(name: string): void {
    this.emit("message", frame(name));
  }
}

interface Harness {
  readonly socket: FakeSocket;
  readonly logs: StreamLogEvent[];
  readonly observations: LiveObservation[];
  readonly connections: StreamConnection[];
  readonly stream: ReturnType<typeof createAlpacaStream>;
  readonly unsubscribe: () => void;
  readonly sockets: FakeSocket[];
  advance(ms: number): void;
  clock(): number;
}

const harness = (): Harness => {
  let time = 1_000;
  const sockets: FakeSocket[] = [];
  const logs: StreamLogEvent[] = [];
  const observations: LiveObservation[] = [];
  const connections: StreamConnection[] = [];
  const timers: { at: number; fn: () => void; id: NodeJS.Timeout }[] = [];
  let nextId = 0;

  const stream = createAlpacaStream({
    keyId: "not-a-real-key",
    secretKey: "not-a-real-secret",
    symbols: SYMBOLS,
    now: () => time,
    setTimer: (fn, ms) => {
      const id = ++nextId as unknown as NodeJS.Timeout;
      timers.push({ at: time + ms, fn, id });
      return id;
    },
    clearTimer: (id) => {
      const index = timers.findIndex((t) => t.id === id);
      if (index >= 0) timers.splice(index, 1);
    },
    connect: () => {
      const socket = new FakeSocket();
      sockets.push(socket);
      return socket;
    },
    onLog: (event) => logs.push(event),
  });

  const unsubscribe = stream.subscribe(SYMBOLS, {
    onObservations: (batch) => observations.push(...batch),
    onConnectionChange: (connection) => connections.push(connection),
  });

  return {
    get socket() {
      const first = sockets[0];
      if (first === undefined) throw new Error("no socket was opened");
      return first;
    },
    sockets,
    logs,
    observations,
    connections,
    stream,
    unsubscribe,
    clock: () => time,
    advance(ms: number) {
      time += ms;
      for (const timer of [...timers]) {
        if (timer.at <= time) {
          timers.splice(timers.indexOf(timer), 1);
          timer.fn();
        }
      }
    },
  };
};

/** The happy path, up to holding a subscription. */
const handshake = (h: Harness): void => {
  h.socket.emit("open");
  h.socket.deliver("greeting");
  h.socket.deliver("authenticated");
  h.socket.deliver("subscription-ack-three");
};

/**
 * The wall clock these tests reason with.
 *
 * **Separate from the monotonic clock on purpose.** Observations carry an EPOCH
 * instant — a bar's `t` — while the liveness watchdog counts monotonic elapsed
 * time, and `FeedStatusInputs` keeps them apart because subtracting one from the
 * other is the defect Task 3.2.6 found: it made `stale` unreachable in
 * production. A minute after the newest bar, so staleness is the thing under
 * test rather than an accident of how far apart the two scales are.
 */
const WALL_NOW = Date.parse("2026-09-16T14:02:00Z") + 60_000;

describe("the handshake", () => {
  it("waits for the server's greeting before authenticating", () => {
    // §4.1: the greeting is the ONLY unsolicited frame, and a client that
    // sends `auth` on the `open` event is writing into a socket the server has
    // not greeted yet. It appears to work, which is why this is asserted.
    const h = harness();
    h.socket.emit("open");

    expect(h.socket.sent).toHaveLength(0);

    h.socket.deliver("greeting");
    expect(JSON.parse(h.socket.sent[0] ?? "{}")).toMatchObject({
      action: "auth",
    });
  });

  it("does NOT report live merely because the socket opened", () => {
    // §4.5: `/v2/sip` opens and is greeted identically before refusing at
    // authentication, and the server leaves it open.
    //
    // **The first draft of this test asserted `live` here — contradicting its
    // own name — and the implementation was right to disagree.** §11.2 defines
    // `live`, in session, as *heartbeat current AND an observation within
    // 60 s*. A socket that has only opened has no observation, so it reads
    // `stale` until the first bar arrives.
    //
    // That is the honest reading rather than an awkward one: mid-session a bar
    // arrives at most about a minute after its own minute closes (§10.1), so a
    // fresh connection genuinely has nothing to show for up to a minute, and
    // saying so beats claiming a feed is delivering before it has delivered.
    // Out of hours the same connection reads `live`, because §6.6's silence is
    // a working feed — covered by the watchdog tests below.
    const h = harness();
    h.socket.emit("open");

    expect(h.stream.connection().phase).toBe("socket-open");
    expect(h.stream.connection().phase).not.toBe("authenticated");
    expect(
      h.stream.status({ now: h.clock(), wallNow: WALL_NOW, marketOpen: true }),
    ).not.toBe("live");
  });

  it("subscribes to bars AND updatedBars once authenticated", () => {
    // §7.11: the product subscribes revisions, and §14.1's reversal trigger was
    // evaluated and NOT fired.
    const h = harness();
    handshake(h);

    const subscribe = JSON.parse(h.socket.sent[1] ?? "{}") as {
      action?: unknown;
      bars?: unknown;
      updatedBars?: unknown;
    };
    expect(subscribe.action).toBe("subscribe");
    expect(subscribe.bars).toEqual(SYMBOLS);
    expect(subscribe.updatedBars).toEqual(SYMBOLS);
  });

  it("reads the acknowledgement as the full held state", () => {
    const h = harness();
    handshake(h);

    expect(h.stream.connection().phase).toBe("subscribed");
    expect(h.stream.connection().subscribedSymbols).toBe(3);
  });

  it("survives an acknowledgement with NO `bars` key at all", () => {
    // §4.2: unsubscribing from everything returns `[{"T":"subscription"}]`. A
    // client reading `bars` unconditionally breaks here.
    const h = harness();
    handshake(h);

    expect(() => {
      h.socket.deliver("subscription-ack-empty");
    }).not.toThrow();
    expect(h.stream.connection().subscribedSymbols).toBe(0);
  });
});

describe("error frames — messages about a request, on a socket that stays open", () => {
  it("names the CLASS for 402 and does not claim to know which cause", () => {
    // §8.3: byte-identical for a wrong key, a wrong secret and no credential.
    const h = harness();
    h.socket.emit("open");
    h.socket.deliver("greeting");
    h.socket.deliver("error-402-auth-failed");

    expect(h.logs).toContainEqual({ kind: "credentials-refused" });
    // Nothing in the log claims which of the three it was.
    expect(JSON.stringify(h.logs)).not.toMatch(/key|secret|missing/i);
  });

  it("does NOT close the socket on an authentication failure", () => {
    // §8.4: all four authentication failures leave the connection up
    // indefinitely. Tearing it down here would turn a message into an event.
    const h = harness();
    h.socket.emit("open");
    h.socket.deliver("greeting");
    h.socket.deliver("error-402-auth-failed");

    expect(h.socket.closedWith).toBeUndefined();
    expect(h.stream.connection().phase).toBe("refused");
  });

  it("reports 400 distinctly, because it is the one an operator can act on", () => {
    const h = harness();
    handshake(h);
    h.socket.deliver("error-400-invalid-syntax");

    expect(h.logs).toContainEqual({ kind: "frame-rejected", code: 400 });
  });

  it("treats 406 as WAIT AND RETRY and reconnects", () => {
    // §8.2, and this is the branch every deploy depends on: the incumbent
    // wins, a rolling replacement has two processes alive by design, and the
    // arriving one is us. Stopping here means no feed after every deploy.
    const h = harness();
    h.socket.emit("open");
    h.socket.deliver("greeting");
    h.socket.deliver("error-406-connection-limit-exceeded");

    expect(h.logs).toContainEqual({
      kind: "connection-limit",
      retryInMs: REFUSED_RETRY_MS,
    });
    expect(h.sockets).toHaveLength(1);

    h.advance(REFUSED_RETRY_MS);
    expect(h.sockets).toHaveLength(2);
  });

  it("closes the refused socket before asking for its replacement", () => {
    // §8.2's limit is ONE connection. A retry that leaves the refused socket
    // open is itself a cause of the `406` it is retrying — we would be the
    // second connection competing with our own first, forever.
    const h = harness();
    h.socket.emit("open");
    h.socket.deliver("greeting");
    h.socket.deliver("error-406-connection-limit-exceeded");

    expect(h.socket.closedWith).toBe(1000);
  });

  it("a frame on a SUPERSEDED socket does not write to its replacement", () => {
    // **The production crash loop, as a test** — 2026-09-19, six fatal
    // `level: 60` exits between 02:00Z and 06:00Z, `CrashLoopBackOff`, and
    // every rollout refused for two days afterwards.
    //
    // `socket` was a single mutable reference and the handshake read it, while
    // `opened.on("message", …)` closed over the socket that spoke. So a frame
    // delivered by socket A after the retry had repointed `socket` at B called
    // `B.send()` while B was still `CONNECTING`, and `ws` throws
    // synchronously — out of a `message` listener, past nothing, into the
    // process crash handler.
    const h = harness();
    h.socket.emit("open");
    h.socket.deliver("greeting");
    h.socket.deliver("error-406-connection-limit-exceeded");

    h.advance(REFUSED_RETRY_MS);
    const [first, second] = h.sockets;
    if (first === undefined || second === undefined) {
      throw new Error("expected a retry to have opened a second socket");
    }

    // The replacement is dialling. This is the window the crash lived in.
    second.readyState = 0;

    // A late frame from the socket that was superseded. It must not take the
    // process down, and it must not write to a socket that has not opened.
    expect(() => {
      first.deliver("greeting");
    }).not.toThrow();
    expect(second.sent).toEqual([]);
  });

  it("does not retry after 402 or 400", () => {
    const h = harness();
    h.socket.emit("open");
    h.socket.deliver("greeting");
    h.socket.deliver("error-402-auth-failed");
    h.advance(REFUSED_RETRY_MS * 3);

    expect(h.sockets).toHaveLength(1);
  });

  it("survives the sip refusal without closing", () => {
    // §4.5. Nothing in this client can reach the sip endpoint, but the frame is
    // in the corpus and a client that crashed on an unknown code would be worse.
    const h = harness();
    h.socket.emit("open");
    h.socket.deliver("greeting");

    expect(() => {
      h.socket.deliver("error-409-insufficient-subscription");
    }).not.toThrow();
    expect(h.socket.closedWith).toBeUndefined();
  });
});

describe("the liveness watchdog", () => {
  it("fires at 165 s of inbound silence and asks the socket to close", () => {
    // §6.4: a capture held readyState === OPEN for 4h21m on a dead socket. The
    // watchdog is the ONLY thing that notices, and it is on inbound FRAMES.
    const h = harness();
    handshake(h);

    h.advance(DISCONNECTED_AFTER_MS - 1);
    expect(h.logs.some((l) => l.kind === "liveness-watchdog-fired")).toBe(
      false,
    );

    h.advance(1);
    expect(h.logs.some((l) => l.kind === "liveness-watchdog-fired")).toBe(true);
    expect(h.socket.closedWith).toBe(1000);
  });

  it("is restarted by a HEARTBEAT, with no data at all", () => {
    // §6.3: the 54 s ping is a property of the connection, not the
    // subscription — so a socket subscribed to nothing stays alive, and out of
    // hours (§6.6) a feed with no bars for 76 minutes is healthy.
    const h = harness();
    handshake(h);

    for (let elapsed = 0; elapsed < 76 * 60_000; elapsed += 54_000) {
      h.advance(54_000);
      h.socket.emit("ping");
    }

    expect(h.logs.some((l) => l.kind === "liveness-watchdog-fired")).toBe(
      false,
    );
    expect(
      h.stream.status({ now: h.clock(), wallNow: WALL_NOW, marketOpen: false }),
    ).toBe("live");
  });

  it("is restarted by an ERROR frame, which is still evidence of life", () => {
    const h = harness();
    handshake(h);

    h.advance(DISCONNECTED_AFTER_MS - 1_000);
    h.socket.deliver("error-400-invalid-syntax");
    h.advance(DISCONNECTED_AFTER_MS - 1_000);

    expect(h.logs.some((l) => l.kind === "liveness-watchdog-fired")).toBe(
      false,
    );
  });

  it("uses the injected clock, so 165 s costs no real time", () => {
    // The whole suite would otherwise need 165 real seconds per assertion. The
    // production default is `performance.now()` — MONOTONIC, so a suspended
    // machine cannot manufacture a disconnection.
    const started = Date.now();
    const h = harness();
    handshake(h);
    h.advance(DISCONNECTED_AFTER_MS);

    expect(h.logs.some((l) => l.kind === "liveness-watchdog-fired")).toBe(true);
    expect(Date.now() - started).toBeLessThan(1_000);
  });
});

describe("observations", () => {
  it("delivers a mapped bar", () => {
    const h = harness();
    handshake(h);
    h.socket.deliver("bar-nvda");

    expect(h.observations).toHaveLength(1);
    expect(h.observations[0]?.bar.close).toBe(214.75);
    expect(h.observations[0]?.source.feed).toBe("iex");
    expect(h.observations[0]?.supersedes).toBe(false);
  });

  it("delivers a revision flagged as superseding", () => {
    const h = harness();
    handshake(h);
    h.socket.deliver("bar-nvda");
    h.socket.deliver("bar-nvda-revision-close-changed");

    expect(h.observations).toHaveLength(2);
    expect(h.observations[1]?.supersedes).toBe(true);
    expect(h.observations[1]?.bar.startsAt).toEqual(
      h.observations[0]?.bar.startsAt,
    );
  });

  it("delivers nothing for a frame that is not a bar", () => {
    const h = harness();
    handshake(h);

    expect(h.observations).toHaveLength(0);
  });

  it("does not throw on unparseable data", () => {
    const h = harness();
    handshake(h);

    expect(() => {
      h.socket.emit("message", "{not json");
    }).not.toThrow();
  });
});

describe("closing", () => {
  it("records the close latency and no code, because the code says nothing", () => {
    // §8.5: five causes, all 1006, empty reason. The discriminator is elapsed
    // time — ~240 ms a live socket answering, ~30 s a corpse.
    const h = harness();
    handshake(h);
    h.unsubscribe();
    h.advance(243);
    h.socket.emit("close");

    expect(h.logs).toContainEqual({ kind: "closed", elapsedMs: 243 });
    expect(h.stream.connection().lastCloseElapsedMs).toBe(243);
  });

  it("closes deliberately on unsubscribe and stops retrying", () => {
    // §12.2: the deliberate close is what bounds the every-deploy outage at
    // SHUTDOWN_TIMEOUT_MS instead of §6.4's 4h21m.
    const h = harness();
    h.socket.emit("open");
    h.socket.deliver("greeting");
    h.socket.deliver("error-406-connection-limit-exceeded");
    h.unsubscribe();
    h.advance(REFUSED_RETRY_MS * 3);

    expect(h.logs).toContainEqual({ kind: "closing-deliberately" });
    expect(h.socket.closedWith).toBe(1000);
    expect(h.sockets).toHaveLength(1);
  });

  it("reports disconnected once closed", () => {
    const h = harness();
    handshake(h);
    h.socket.emit("close");

    expect(
      h.stream.status({ now: h.clock(), wallNow: WALL_NOW, marketOpen: true }),
    ).toBe("disconnected");
  });

  it("is idempotent", () => {
    const h = harness();
    handshake(h);

    expect(() => {
      h.unsubscribe();
      h.unsubscribe();
    }).not.toThrow();
  });
});

describe("what the client declares", () => {
  it("is alpaca on iex, and cannot be sip", () => {
    const h = harness();

    expect(h.stream.id).toBe("alpaca");
    expect(h.stream.feed).toBe("iex");
  });

  it("implements every method without throwing", () => {
    const h = harness();

    expect(() => h.stream.connection()).not.toThrow();
    expect(() =>
      h.stream.status({ now: 0, wallNow: WALL_NOW, marketOpen: false }),
    ).not.toThrow();
  });
});

describe("no network, no credential", () => {
  it("never constructs a real WebSocket in this suite", () => {
    // Acceptance criterion 6, asserted rather than assumed: the whole suite
    // runs on the injected `connect`, so a `verify` with no network still
    // exercises every state above.
    const h = harness();
    handshake(h);

    expect(h.sockets.every((s) => s instanceof FakeSocket)).toBe(true);
    expect(h.sockets.length).toBeGreaterThan(0);
  });
});
