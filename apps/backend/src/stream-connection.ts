import type { FeedStatus } from "@marketpulse/shared";

/**
 * The live connection, as a pure function of what has been observed.
 *
 * This is the `(state, event) => state` shape `FRONTEND-STATE.md` §1 already
 * uses one layer up, and it is here for the same reason: **a socket is the
 * least testable thing in the system and a reducer is one of the most.**
 * Everything decided here is decided with no network, no timers and no `ws`.
 *
 * ## The events are what the spike SAW, not what a WebSocket API suggests
 *
 * `LIVE-DATA.md` §4.1 records the handshake frame by frame and §4.2 lists six
 * things a state machine written from the documentation would get wrong. Three
 * of them shape this file:
 *
 * 1. **A socket being open means nothing.** `/v2/sip` opens, greets identically
 *    and only then refuses at authentication, leaving the socket open (§4.5).
 *    So {@link SocketOpened} is not a connected state and there is deliberately
 *    no transition from it to anything reporting `live`.
 * 2. **Every error is a frame, not a closure** (§4.2, §8.4). All four
 *    authentication failures leave the connection up indefinitely, so
 *    {@link ErrorFrame} does not imply {@link Closed} and the two are separate
 *    events.
 * 3. **The close code carries nothing; the close latency carries everything**
 *    (§8.5). Five distinct causes all produce `1006` with an empty reason, so
 *    {@link Closed} carries **`elapsedMs`** and no code at all — a field that
 *    cannot discriminate is a field that invites a `switch` on nothing.
 */

/**
 * What the socket has told us. Nothing here is invented: each member is a thing
 * `LIVE-DATA.md` §4 or §8 recorded arriving.
 */
export type StreamEvent =
  /** The TCP/WS upgrade succeeded. **Not** a connected state — see §4.5. */
  | { readonly kind: "socket-opened"; readonly at: number }
  /** `[{"T":"success","msg":"connected"}]` — the server's greeting (§4.1). */
  | { readonly kind: "greeted"; readonly at: number }
  /** `[{"T":"success","msg":"authenticated"}]` (§4.1). */
  | { readonly kind: "authenticated"; readonly at: number }
  /**
   * `[{"T":"error","code":N,…}]`. The socket stays OPEN after this (§8.4).
   *
   * `code` is carried because — unlike a close code — it **does** discriminate:
   * §8.3 measured `402` as byte-identical across a wrong key, a wrong secret
   * and no credential, while `400 invalid syntax` is genuinely distinct, and
   * `406 connection limit exceeded` is the one that must not be fatal (§8.2).
   */
  | { readonly kind: "error-frame"; readonly code: number; readonly at: number }
  /** `[{"T":"subscription",…}]`, carrying what the server says we now hold. */
  | {
      readonly kind: "subscription-acknowledged";
      readonly symbolCount: number;
      readonly at: number;
    }
  /**
   * A data frame carrying at least one observation.
   *
   * `observedAt` is the **observation's own** instant rather than the arrival
   * instant, because §11.2 is explicit that staleness keys on the former: §6.7
   * measured `dailyBars` re-sending a byte-identical aggregate every minute out
   * of hours, and a rule keyed on arrival would call that liveness.
   */
  | {
      readonly kind: "observations";
      readonly observedAt: number;
      readonly at: number;
    }
  /**
   * The server's ping. **The only liveness signal that exists**, measured at
   * 53.96–54.85 s across 82 intervals, on a socket subscribed to nothing as
   * much as on one subscribed to all 518 (§6.3) — a property of the connection
   * rather than of the subscription, which is why no keepalive of our own
   * appears anywhere in this epic.
   */
  | { readonly kind: "heartbeat"; readonly at: number }
  /**
   * The socket closed. **There is deliberately no `code` here.**
   *
   * §8.5: five distinct causes all produce `1006` with an empty reason, and the
   * discriminator that works is a stopwatch — ~1 ms our own link went, ~240 ms a
   * live socket answering, ~6 s the server closing a rude client, ~10 s a
   * refused duplicate, ~30 s `ws@8` timing out on a corpse. A consumer that
   * wants to tell those apart reads `elapsedMs`.
   */
  | {
      readonly kind: "closed";
      readonly elapsedMs: number;
      readonly at: number;
    };

/**
 * Where the handshake has got to.
 *
 * `authenticated` and `subscribed` are separate because §4.4's nine probes
 * showed a subscription can be refused on an authenticated socket — the
 * connection is fine and we are holding nothing.
 */
export type HandshakePhase =
  | "idle"
  | "socket-open"
  | "greeted"
  | "authenticated"
  | "subscribed"
  | "refused"
  | "closed";

/** Everything the reducer knows. Serialisable on purpose: no timers, no socket. */
export interface StreamConnection {
  readonly phase: HandshakePhase;
  /**
   * When ANY inbound frame last arrived — data or control.
   *
   * **This is the watchdog's only input, and it is not `readyState`** (§6.4): a
   * capture held `OPEN` for **4 h 21 min** on a socket that had died, with no
   * error, no close and no reset. It is also not *data*, which is legitimately
   * absent for 76 minutes out of hours (§6.6) and for **187 minutes** on a thin
   * security inside a session (§11.2).
   */
  readonly lastInboundAt: number | undefined;
  /** The newest **observation timestamp** seen, per §11.2's keying rule. */
  readonly lastObservationAt: number | undefined;
  /** What the server last acknowledged us as holding. */
  readonly subscribedSymbols: number;
  /**
   * The last error frame's code, retained because it **does** discriminate and
   * because `406` must be read as _wait and retry_ rather than as fatal (§8.2).
   */
  readonly lastErrorCode: number | undefined;
  /** How long the last close took, per §8.5's stopwatch. */
  readonly lastCloseElapsedMs: number | undefined;
}

/** A connection that has been told nothing yet. */
export const initialStreamConnection: StreamConnection = {
  phase: "idle",
  lastInboundAt: undefined,
  lastObservationAt: undefined,
  subscribedSymbols: 0,
  lastErrorCode: undefined,
  lastCloseElapsedMs: undefined,
};

/**
 * Advance the connection by one observed event. Pure, total, and it never
 * throws — an event that makes no sense in the current phase leaves the phase
 * alone rather than raising, because the socket is a third party and
 * `PROVIDER.md` §8.5's line applies: a throw says **our** program is wrong.
 */
export function advanceStreamConnection(
  state: StreamConnection,
  event: StreamEvent,
): StreamConnection {
  // Every inbound frame — including an error frame and including a heartbeat —
  // is evidence the connection is alive. That is the whole of §6.4's lesson.
  const inbound: StreamConnection = { ...state, lastInboundAt: event.at };

  switch (event.kind) {
    case "socket-opened":
      // Deliberately NOT a connected state (§4.5).
      return { ...inbound, phase: "socket-open" };
    case "greeted":
      return { ...inbound, phase: "greeted" };
    case "authenticated":
      return { ...inbound, phase: "authenticated" };
    case "error-frame":
      // The socket stays open (§8.4), so this changes the phase and not the
      // liveness. `refused` is a state we are still connected in.
      return { ...inbound, phase: "refused", lastErrorCode: event.code };
    case "subscription-acknowledged":
      return {
        ...inbound,
        phase: "subscribed",
        subscribedSymbols: event.symbolCount,
      };
    case "observations":
      return {
        ...inbound,
        lastObservationAt: Math.max(
          state.lastObservationAt ?? Number.NEGATIVE_INFINITY,
          event.observedAt,
        ),
      };
    case "heartbeat":
      return inbound;
    case "closed":
      return {
        ...inbound,
        phase: "closed",
        lastCloseElapsedMs: event.elapsedMs,
        subscribedSymbols: 0,
      };
    default: {
      const unhandled: never = event satisfies never;
      return unhandled;
    }
  }
}

/**
 * No inbound frame of ANY kind for this long means the connection is dead.
 *
 * Three missed heartbeats, from §6.3's measured 53.96–54.85 s across 82
 * intervals. §8.8 confirms it is the **only** signal available for a half-open
 * socket, which is the fault with no event at all.
 */
export const DISCONNECTED_AFTER_MS = 165_000;

/**
 * Heartbeat current but no **observation** for this long, **while the market is
 * open**, means the feed behind a healthy socket has stopped.
 *
 * §7.9 measured the longest in-session silence of any inbound frame at 8.6 s;
 * 60 s is 7× that and well under the 165 s above.
 */
export const STALE_AFTER_MS = 60_000;

/** What {@link feedStatusOf} needs from the world, passed in rather than read. */
export interface FeedStatusInputs {
  /**
   * Now. **An argument rather than a `Date.now()`**, which is what makes every
   * threshold in this file testable without waiting 165 real seconds — and what
   * would let this module move into `packages/shared`, where reading the wall
   * clock is a lint error (ADR 0017), without changing a line.
   */
  readonly now: number;
  /**
   * Whether the market is open, from Story 2.5's calendar.
   *
   * **`stale` is gated on it and the gate is not optional** (§11.2): out of
   * hours the same socket is legitimately silent for **76 minutes** on bar
   * channels (§6.6), so an ungated 60 s rule would report a healthy overnight
   * feed as stale every minute of every night.
   */
  readonly marketOpen: boolean;
}

/**
 * The three words the product says about a connection — `packages/shared`'s
 * {@link FeedStatus}, derived rather than stored.
 *
 * **Derived is the point.** §6.4 is the reason this function exists at all: a
 * socket object reported `OPEN` for 4 h 21 min while dead, so `live` can never
 * be a flag something sets on connect. It is a conclusion drawn from *when a
 * frame last arrived*, every time it is asked.
 *
 * **The two questions §11.2 requires be separately sayable** both fall out of
 * this without a fourth word:
 *
 *  - *connected but nothing has arrived for 165 s* → `disconnected`, because
 *    inbound silence is the only thing that distinguishes a dead socket.
 *  - *our socket is fine and the market feed behind it is dead* → `stale`, with
 *    the heartbeat current and no observation inside the session.
 */
export function feedStatusOf(
  state: StreamConnection,
  { now, marketOpen }: FeedStatusInputs,
): FeedStatus {
  // Nothing has ever arrived, or the socket is closed: there is no evidence of
  // a live connection, and absence of evidence is exactly what this word means.
  if (state.phase === "closed" || state.lastInboundAt === undefined) {
    return "disconnected";
  }

  if (now - state.lastInboundAt >= DISCONNECTED_AFTER_MS) {
    return "disconnected";
  }

  // Out of hours a silent feed is a working feed (§6.6). No gate, no `stale`.
  if (!marketOpen) {
    return "live";
  }

  // Keyed on the OBSERVATION's own instant, never on a frame having arrived —
  // §6.7 measured `dailyBars` re-sending a byte-identical aggregate every
  // minute out of hours, and arrival-keyed staleness would call that liveness.
  if (
    state.lastObservationAt === undefined ||
    now - state.lastObservationAt >= STALE_AFTER_MS
  ) {
    return "stale";
  }

  return "live";
}
