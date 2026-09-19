import {
  type FeedStatus,
  type MarketFeed,
  type MarketStreamMessage,
  type WireFeedState,
  feedStatusFrom,
  worseFeedStatus,
} from "@marketpulse/shared";

// What this browser knows about the live market feed, as a pure function of
// what the socket has said (Task 3.3.4).
//
// `FRONTEND-STATE.md` §1's shape, applied to a socket: state is a plain object
// whose transition is a pure function, which is what keeps a later move to a
// store a re-wiring rather than a rewrite (ADR 0023). **There is no store, and
// live state has one writer and many readers** — §12.1 walked that and the walk
// is recorded; do not re-take it because prop-drilling chafes.
//
// ## The thresholds are NOT here, and that is the point
//
// §11.2's 60 s and 165 s live in `packages/shared/src/feed-liveness.ts`, with
// the rule that applies them. Two sockets now ask the same question — the
// backend's client watches Alpaca, this watches the gateway — and a second copy
// of either number is the defect `pnpm break feed-words-in-a-renderer` exists
// to catch one vocabulary over.
//
// ## There are TWO connections and the browser is downstream of both
//
// | Link                  | Who watches it                           |
// | --------------------- | ---------------------------------------- |
// | Alpaca → our backend  | `apps/backend/src/stream-connection.ts`  |
// | our backend → browser | **this file**                            |
//
// Either can fail while the other is perfect, and the chrome shows **one**
// word. So the two answers are combined with `worseFeedStatus`: a browser whose
// own socket is healthy has learned nothing about the market if the backend's
// feed is dead, and the backend's last word of `live` is not evidence of
// anything once we can no longer hear it.
//
// ## Why the status is derived here rather than read off the wire
//
// The gateway sends `WireFeedState.status`, and this file does not take it at
// face value — §11.1 keeps `staleSeconds` off the wire for the same reason. Two
// reasons, and the second is the practical one:
//
//  1. A status computed on the server describes the server's socket, and a
//     browser's socket is a second thing that can fail.
//  2. **The server's word can be up to 120 s old.** Task 3.3.2's keepalive is
//     the rate at which an unchanged feed state is re-sent, so a feed that went
//     stale one second after a `feed` message would be reported as live for
//     nearly two minutes. Deriving here applies the same rule sooner.

/**
 * What the socket has told us. Each member is a thing a browser can actually
 * observe — there is no `authenticated` and no `subscription-acknowledged`,
 * because the vendor handshake is the backend's business and this side of the
 * wire never sees it.
 */
export type LiveFeedEvent =
  /** The WebSocket opened. **Not** a connected state on its own. */
  | { readonly kind: "opened"; readonly at: number }
  /** A message that decoded. */
  | {
      readonly kind: "message";
      readonly message: MarketStreamMessage;
      readonly at: number;
    }
  /** A message that did not decode — a value rather than a throw (Task 3.3.1). */
  | {
      readonly kind: "unreadable";
      readonly reason: string;
      readonly at: number;
    }
  /** The socket closed. No code: §8.5 measured that a close code carries nothing. */
  | { readonly kind: "closed"; readonly at: number };

/** Everything this browser holds about the feed. Serialisable: no socket, no timers. */
export interface LiveFeedConnection {
  readonly socket: "connecting" | "open" | "closed";
  /**
   * When ANY message last arrived, on the **monotonic** clock.
   *
   * **The gateway's 120 s keepalive is what makes this meaningful on this side,
   * and it is a stronger position than the backend's.** Story 3.2's client
   * watches inbound frames because Alpaca's 54 s heartbeat is the only thing
   * distinguishing a quiet feed from a dead one. Here the keepalive plays that
   * role — so a browser that has heard nothing for 165 s has genuinely **lost
   * the socket**, rather than merely watching a quiet market. The same number
   * means something narrower here than it does one layer down.
   */
  readonly lastInboundAt: number | undefined;
  /** The newest observation's own instant, epoch ms — the START of its minute (§7.3). */
  readonly lastObservationAt: number | undefined;
  /** The server's last word about its own feed, or `undefined` before the snapshot. */
  readonly server: WireFeedState | undefined;
  /**
   * How many messages this browser could not read.
   *
   * **The decided disposition for `unreadable`** (Task 3.3.1 made it a value
   * rather than a throw, and this task owed the answer to *and then what*).
   * **Counted, never dropped**: a protocol mismatch after a deploy is otherwise
   * indistinguishable from a quiet feed, which is the same ambiguity §11.2's
   * thresholds exist to remove. It is not *surfaced* — a count in a status
   * strip is developer detail — and it is not thrown, because §36 forbids one
   * malformed message taking the page down.
   */
  readonly unreadable: number;
  /** The most recent reason, for the one report {@link firstUnreadable} licenses. */
  readonly lastUnreadableReason: string | undefined;
}

/** A browser that has been told nothing yet. */
export const initialLiveFeed: LiveFeedConnection = {
  socket: "connecting",
  lastInboundAt: undefined,
  lastObservationAt: undefined,
  server: undefined,
  unreadable: 0,
  lastUnreadableReason: undefined,
};

/**
 * The newest observation instant in a message, or `undefined` if it carries
 * none.
 *
 * **A malformed instant is skipped rather than poisoning the maximum.**
 * `Date.parse` returns `NaN` for anything it cannot read, and `Math.max` with
 * one `NaN` is `NaN` — which would make the feed permanently stale from one bad
 * string. That is `alpaca-stream-mapping.ts`'s rule about `Number.isFinite`,
 * arriving at the same hazard from the other end of the wire.
 */
function newestObservationIn(message: MarketStreamMessage): number | undefined {
  if (message.type === "feed") return undefined;

  let newest: number | undefined;

  for (const observation of Object.values(message.observations)) {
    const instant = Date.parse(observation.startsAt);
    if (!Number.isFinite(instant)) continue;
    if (newest === undefined || instant > newest) newest = instant;
  }

  return newest;
}

/**
 * Advance by one observed event. Pure, total, and it never throws — the socket
 * is a third party and `PROVIDER.md` §8.5's line applies: a throw says **our**
 * program is wrong.
 */
export function advanceLiveFeed(
  state: LiveFeedConnection,
  event: LiveFeedEvent,
): LiveFeedConnection {
  // Every inbound message — including one we could not read — is evidence the
  // socket is alive. §6.4's lesson, one layer up: a message that arrived is a
  // fact about the connection whatever its contents turn out to be.
  const inbound: LiveFeedConnection = { ...state, lastInboundAt: event.at };

  switch (event.kind) {
    case "opened":
      return { ...state, socket: "open" };

    case "unreadable":
      return {
        ...inbound,
        unreadable: state.unreadable + 1,
        lastUnreadableReason: event.reason,
      };

    case "closed":
      // **No reconnection.** Story 3.10 owns retry, and this is exactly where
      // somebody adds a loop without noticing it is a policy. Report it
      // honestly and stop.
      return { ...inbound, socket: "closed" };

    case "message": {
      const observedAt = newestObservationIn(event.message);

      return {
        ...inbound,
        socket: "open",
        server:
          event.message.type === "bars" ? state.server : event.message.feed,
        lastObservationAt:
          observedAt === undefined
            ? state.lastObservationAt
            : Math.max(state.lastObservationAt ?? observedAt, observedAt),
      };
    }

    default: {
      const unhandled: never = event satisfies never;
      return unhandled;
    }
  }
}

/** Whether this is the first unreadable message, which is the only one worth reporting. */
export function firstUnreadable(
  before: LiveFeedConnection,
  after: LiveFeedConnection,
): boolean {
  return before.unreadable === 0 && after.unreadable === 1;
}

/**
 * What a surface reads. **Everything here is derived**, and `age` deliberately
 * is not among it — §11.1 keeps `staleSeconds` off the wire because a derived
 * age is a clock read wearing a different name, and the same argument applies
 * to a field on a view object.
 */
export interface LiveFeedView {
  readonly status: FeedStatus;
  /** Which venues are in the numbers, or `null` for a deployment with no provider. */
  readonly feed: MarketFeed | null;
  /** Whether this browser can still hear the backend. See `connectionWordFor`. */
  readonly backendReachable: boolean;
  /** The newest observation's own instant, for §36's *displaying data through …*. */
  readonly observedAt: number | undefined;
  /** Messages this browser could not read. Zero on every healthy deployment. */
  readonly unreadable: number;
}

/** What {@link liveFeedView} needs from the world, passed in rather than read. */
export interface LiveFeedInputs {
  /** Monotonic now — `performance.now()`. */
  readonly now: number;
  /** Wall-clock now as epoch milliseconds — `Date.now()`. */
  readonly wallNow: number;
}

/**
 * Derive what the chrome should say.
 *
 * ## Whose `marketOpen` gates staleness: the SERVER's, and the reason is whose
 * feed is being described
 *
 * Task 3.3.1 put `marketOpen` on the wire, so a browser has two answers — the
 * server's, and `useMarketClock`'s reading of the viewer's own machine. **They
 * can disagree and the disagreement is the point rather than a bug**:
 * `marketSessionStateAt` takes an instant (ADR 0017), so it is only as good as
 * the clock supplied, and a viewer an hour out would compute a different
 * session state from the server's.
 *
 * The status describes the **server's** feed, so the server's gate is the one
 * that decides. A viewer with a wrong clock would otherwise suppress or invent
 * a staleness warning about a feed the server can see perfectly well.
 *
 * **It also arrives at exactly the right moment**, which is the practical half:
 * `marketOpen` travels on the same message as the state it gates, so there is
 * never a window where staleness is computable and the gate is not.
 *
 * **`MarketClock` keeps rendering the viewer's own clock** — that region is a
 * timezone claim about the person reading it, and this story's `Out of scope`
 * refuses to turn it into a synchronisation claim. They are two readings of two
 * clocks for two purposes, and this comment exists so they never quietly become
 * one variable.
 */
export function liveFeedView(
  state: LiveFeedConnection,
  { now, wallNow }: LiveFeedInputs,
): LiveFeedView {
  // Reachability is liveness with the staleness gate switched off — which is
  // precisely what `marketOpen: false` means to the shared rule. Spelled this
  // way rather than re-writing the 165 s comparison here, so there is one
  // implementation of *has anything arrived recently enough*.
  const backendReachable =
    feedStatusFrom(
      {
        closed: state.socket === "closed",
        lastInboundAt: state.lastInboundAt,
        lastObservationAt: undefined,
      },
      { now, wallNow, marketOpen: false },
    ) === "live";

  const common = {
    backendReachable,
    observedAt: state.lastObservationAt,
    unreadable: state.unreadable,
  } as const;

  // We cannot hear the backend, so nothing it last said is evidence of
  // anything. `STORY.md` open decision 3: this is reported as `disconnected`
  // whatever the feed identity, because §36 requires a dropped connection to be
  // labelled rather than inferred from an absence.
  if (!backendReachable) {
    return {
      ...common,
      status: "disconnected",
      feed: state.server?.feed ?? null,
    };
  }

  // Before the snapshot arrives we have been told nothing. Honest rather than
  // optimistic: §11.2 makes a fresh connection's default the absence of
  // evidence, not the presence of health.
  if (state.server === undefined) {
    return { ...common, status: "disconnected", feed: null };
  }

  // **A deployment with no provider has no feed to age.** Running §11.2's
  // staleness over one produces a transition between two states that both mean
  // *nothing is configured*, so the server's own word stands unmodified.
  if (state.server.feed === null) {
    return { ...common, status: state.server.status, feed: null };
  }

  return {
    ...common,
    feed: state.server.feed,
    status: worseFeedStatus(
      feedStatusFrom(
        {
          closed: false,
          lastInboundAt: state.lastInboundAt,
          lastObservationAt: state.lastObservationAt,
        },
        { now, wallNow, marketOpen: state.server.marketOpen },
      ),
      state.server.status,
    ),
  };
}

/**
 * Whether two views say the same thing.
 *
 * **This is what stops the keepalive re-rendering the application.** Task
 * 3.3.2's gateway sends a `feed` message every 120 s whether or not anything
 * changed — it has to, because Azure's ingress cuts a socket idle for 240 s and
 * §6.6 measured our own feed legitimately silent for 76 minutes out of hours.
 * Thirty messages an hour is not a lot, but a hook that notifies on every
 * *message* rather than on every *change* is the defect that lifted
 * `useMarketClock` to `App` and produced **40 re-renders in 20 s against 0**,
 * at a lower rate. It is free to avoid, so it is avoided.
 */
export function sameLiveFeedView(a: LiveFeedView, b: LiveFeedView): boolean {
  return (
    a.status === b.status &&
    a.feed === b.feed &&
    a.backendReachable === b.backendReachable &&
    a.observedAt === b.observedAt &&
    a.unreadable === b.unreadable
  );
}
