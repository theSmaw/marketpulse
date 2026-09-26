import {
  type Bar,
  type FeedStatus,
  type MarketFeed,
  type MarketStreamMessage,
  type WireFeedState,
  type WireMarketOverview,
  feedStatusFrom,
  fromWireObservation,
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
  /**
   * **A message this bundle has no type for** (Task 4.2.4) — a newer gateway
   * talking to an older tab, which is an ordinary state during every deploy.
   *
   * ## Why it is an event at all, rather than being dropped in the transport
   *
   * Because of the rule three lines into {@link advanceLiveFeed}: *every
   * inbound message — including one we could not read — is evidence the
   * socket is alive.* The first version returned from the transport before
   * `listen`, so an unsupported frame advanced **nothing** — harmless while a
   * stale tab still receives `bars` and the keepalive, and a **false
   * `DISCONNECTED` on a perfectly healthy socket** the day a future frame
   * type carries a meaningful share of such a tab's traffic. §6.4's lesson
   * does not care whether we understood the bytes.
   *
   * It carries no `reason` and is **not counted**: it is not a defect, and
   * the field that counts defects is documented as *"Zero on every healthy
   * deployment"* and is compared in `sameLiveFeedView`.
   */
  | {
      readonly kind: "unsupported";
      readonly at: number;
    }
  /**
   * The socket closed.
   *
   * **`code` was added by Task 3.5.5 and it is not a reversal of §8.5.** That
   * measurement is about the *upstream* socket, where five causes all produced
   * `1006` with an empty reason — a code carrying no intent. **Our own gateway
   * is not a third party**: §12.2 has it send `1001 going away` on shutdown,
   * deliberately, so a browser can tell *we are redeploying* from *your
   * network died* before deciding how eagerly to retry.
   *
   * **Absent for an `error` event**, which fires without a close and therefore
   * has no code to report. That is the shape rather than an omission: a
   * transport failure is exactly the case with no intent behind it.
   */
  | {
      readonly kind: "closed";
      readonly at: number;
      readonly code?: number;
    };

/** Everything this browser holds about the feed. Serialisable: no socket, no timers. */
export interface LiveFeedConnection {
  readonly socket: "connecting" | "open" | "closed";
  /**
   * When this connection was started, on the **monotonic** clock.
   *
   * **It exists so that *we have not connected yet* is not measured as
   * *nothing has arrived for 165 s*.** Without it a socket whose TCP connect
   * simply hangs — no open, no error, no close — would be reported as
   * reachable for ever, because the watchdog had no instant to count from.
   */
  readonly since: number;
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
  /**
   * The latest observation per security. **One Map, newest only** (§10.3).
   *
   * Not a history and not a buffer: a history is Story 3.8's and a chart series
   * is Story 3.9's. This is the browser's half of a decision the backend
   * already took, and it inherits that decision's three rules rather than
   * restating them:
   *
   * - **It is a cache of the socket rather than a source of truth.** After a
   *   reconnect it comes back empty and fills unevenly — a liquid security
   *   reappears within a minute, `ERIE` may not reappear for hours (§7.6) — so
   *   **every reader must treat *no observation for this symbol* as a normal
   *   answer.** A reader that renders absence as an error will render it
   *   constantly.
   * - **Nothing clears it on a session boundary.** At 09:31 on Monday it still
   *   holds Friday's bars, because clearing would replace a true-but-old answer
   *   with no answer at all, and the honest rendering of Monday 09:31 is
   *   Friday's close **labelled Friday's**.
   * - **Which is only safe because every entry carries its own `startsAt`**, and
   *   no reader may render a price without reading it. That is
   *   `PROVENANCE.md`'s *a claim about data requires data* applied to time, and
   *   it is why this holds domain `Bar`s rather than wire objects: a `Date` is
   *   an instant, and a string is text a renderer can print without reading.
   *
   * **The reference is the change signal**, which is what makes the render gate
   * below cheap — see {@link sameLiveFeedView}.
   */
  readonly observations: ReadonlyMap<string, Bar>;
  /**
   * The symbols whose **current** observation was delivered by a snapshot
   * rather than by a bar (Task 3.5.4).
   *
   * **A snapshot is not an arrival**, and this is the only place that
   * distinction survives. Story 3.4's mark means *a bar arrived for this
   * security*; a snapshot is *what we already held when you connected*. The
   * wire says which — §11.1 gives the gateway two message types — and before
   * this field the store collapsed both into {@link observations} one layer
   * later.
   *
   * It matters because the identity block **mounts before the socket delivers
   * anything**. Without this, a snapshot changes the figure from *absent* to
   * *a price*, which is indistinguishable from a bar arriving — so the mark
   * would fire on every page load, on every security at once, announcing as
   * news the thing the reader has just asked to see.
   *
   * **Delivery decides, not content**, which is also what makes it survive a
   * reconnect: Task 3.5.5 sends a snapshot on every reconnection and none of
   * them is 518 bars arriving.
   */
  readonly fromSnapshot: ReadonlySet<string>;
  /**
   * How many **sockets** have greeted this page with a snapshot (Task 3.10.7,
   * corrected by Task 4.2.1).
   *
   * This is the only thing in this store that distinguishes *we have just come
   * back* from *we have been here all along*. A page that watched the feed
   * drop and return has a **hole** in the minutes it accumulated, and the
   * repair needs an edge to fire on rather than a level to poll.
   *
   * **A counter rather than a boolean**, because two reconnections in one
   * minute are two resumes and a flag set by the first is still set when the
   * second lands — which is the same shape as the announcement defect Task
   * 3.10.6 found one file away.
   *
   * ## It counts SOCKETS, and it used to count snapshot MESSAGES
   *
   * **The premise that made those the same number is false.** This field was
   * written under *the gateway sends one snapshot on every connection, first
   * or fiftieth*. It sends **two per connection, plus one per readable
   * `subscribe` message** — one per *message*, not one per *change*: the
   * gateway does not compare symbol sets, so a browser re-asserting an
   * unchanged subscription is answered with another snapshot, which the
   * reconnect path does by design. Task 4.2.1 measured three on an ordinary
   * cold load and quoted
   * the frames: `market-gateway.ts` calls `sendSnapshot()` once in the
   * `upgrade` handler (structurally empty, 149 bytes) and once at the foot of
   * every `message` listener, and `App.tsx` subscribes twice because
   * `liveSymbols` starts `[]` and the route fills it after mount.
   *
   * So `snapshots - 1` read **2 on a page that had never lost anything**,
   * which fired `use-bar-series`'s gap-fill refetch on every cold load —
   * suppressed only by `if (inFlight.current) return`, a timing race.
   *
   * The repair is {@link LiveFeedConnection.greeted}: only the **first**
   * snapshot after a socket opens increments this, so a later `subscribe`
   * on the same socket is not a return. Two reconnections are still two.
   */
  readonly connections: number;
  /**
   * Whether the socket currently open has already sent its snapshot.
   *
   * **The whole of the Task 4.2.1 repair** — it is what turns a count of
   * snapshot *messages* into a count of *connections*. Cleared by `opened`
   * and by `closed`, set by the first snapshot after either.
   *
   * It is on the state rather than in the hook because `advanceLiveFeed` is
   * the only place that sees the event sequence, and a flag held beside the
   * reducer would be a second piece of connection state with a second
   * lifetime — the shape §12.1 walked and refused.
   */
  readonly greeted: boolean;
  /** The server's last word about its own feed, or `undefined` before the snapshot. */
  readonly server: WireFeedState | undefined;
  /**
   * **The market aggregate the backend computed**, or `undefined` before the
   * first overview frame (Task 4.2.4).
   *
   * Held whole and by reference. It is the first **derived** thing this
   * browser has ever been sent — every other payload is a raw observation or
   * a connection word — and the browser deliberately does not re-derive any
   * of it: the change percentage was computed by `changeFromClose` in the
   * backend, from an IEX numerator and a consolidated-SIP denominator the
   * browser cannot see.
   *
   * **`computedAt` is inside it and is not a clock.** It says when the
   * aggregate was **true**, which during a session is bounded at about a
   * minute behind and after a dead feed is unbounded — so a surface that
   * wants to date these figures reads it, and nothing about liveness does.
   */
  readonly overview: WireMarketOverview | undefined;
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

/** A browser that has been told nothing yet, as of a given monotonic instant. */
export function startedLiveFeed(at: number): LiveFeedConnection {
  return { ...initialLiveFeed, since: at };
}

/** A browser that has been told nothing yet. */
export const initialLiveFeed: LiveFeedConnection = {
  socket: "connecting",
  since: 0,
  observations: new Map(),
  fromSnapshot: new Set(),
  connections: 0,
  greeted: false,
  lastInboundAt: undefined,
  lastObservationAt: undefined,
  server: undefined,
  overview: undefined,
  unreadable: 0,
  lastUnreadableReason: undefined,
};

/** What one message added: the bars it carried, and the newest instant among them. */
interface Observed {
  readonly bars: ReadonlyMap<string, Bar>;
  readonly newest: number | undefined;
}

const NOTHING_OBSERVED: Observed = { bars: new Map(), newest: undefined };

/**
 * Read a message's observations, once.
 *
 * **One pass rather than two**, which is not a micro-optimisation: the previous
 * shape parsed each `startsAt` to find the newest instant, and a second parse
 * for the Map would be a **second place the malformed-instant rule could be got
 * wrong**. Now an observation that cannot be dated is skipped exactly once, and
 * it is skipped for both purposes by construction.
 *
 * **A malformed instant is skipped rather than poisoning anything.**
 * `Date.parse` returns `NaN` for what it cannot read; `Math.max` with one `NaN`
 * is `NaN`, which would make the feed permanently stale from one bad string,
 * and `new Date(NaN)` is an `Invalid Date` that **formats without complaining**
 * and reaches a price row as those two words. `fromWireObservation` owns that
 * check so the two ends of the wire cannot disagree about it.
 */
/**
 * Which symbols are currently sitting on a snapshot baseline (Task 3.5.4).
 *
 * A `snapshot` message makes every symbol it carries a baseline; a `bars`
 * message removes exactly the symbols it carries, because those genuinely
 * arrived. Symbols in neither are untouched — a snapshot for AAPL says nothing
 * about whether NVDA's held price was a baseline or an arrival.
 *
 * Returns the **same set** when nothing changed, so the render gate below stays
 * a reference comparison.
 */
function withDelivery(
  current: ReadonlySet<string>,
  bars: ReadonlyMap<string, Bar>,
  type: MarketStreamMessage["type"],
): ReadonlySet<string> {
  // A `feed` message carries no observations, so it can never move a symbol
  // between baseline and arrival — it returns here rather than being excluded
  // by the caller, so a fourth message type cannot be forgotten.
  if (bars.size === 0) return current;

  if (type === "snapshot") return new Set(bars.keys());

  const next = new Set(current);
  let changed = false;
  for (const symbol of bars.keys()) {
    if (next.delete(symbol)) changed = true;
  }
  return changed ? next : current;
}

function observedIn(message: MarketStreamMessage): Observed {
  // **The types that CARRY observations, named** — rather than excluding the
  // ones that do not (Task 4.2.4). A fourth message type turned the old
  // `type === "feed"` exclusion into a compile error here, which is the check
  // working; writing it the other way round is what makes a fifth one fail in
  // the same place instead of quietly reading `undefined`.
  //
  // **An aggregate is not an observation, and `NOTHING_OBSERVED` is the whole
  // point.** The overview frame is a derivation over a map that may not have
  // moved — the gateway recomputes it on connect, on subscribe and on every
  // applied batch. Letting it advance `lastObservationAt` would feed §11.2's
  // 60 s staleness rule with the gateway's own activity, so a **dead feed
  // would read `LIVE`** for as long as somebody kept opening tabs. It may
  // advance `lastInboundAt`, which is a fact about the socket and is true.
  if (message.type !== "snapshot" && message.type !== "bars") {
    return NOTHING_OBSERVED;
  }

  const bars = new Map<string, Bar>();
  let newest: number | undefined;

  for (const [symbol, observation] of Object.entries(message.observations)) {
    const bar = fromWireObservation(observation);
    if (bar === undefined) continue;

    bars.set(symbol, bar);

    const instant = bar.startsAt.getTime();
    if (newest === undefined || instant > newest) newest = instant;
  }

  return { bars, newest };
}

/**
 * Fold a message's bars into what is already held.
 *
 * **A new Map only when something actually arrived**, and the same reference
 * back otherwise. That is the whole mechanism behind {@link sameLiveFeedView}'s
 * observation check: a reference that has not changed means nothing observed
 * has changed, and a keepalive therefore costs a comparison rather than a
 * render.
 *
 * **Newest wins, and a revision is a newer observation for the same symbol**
 * (§7.8) — `updatedBars` replaces the entry for the minute it corrects. Telling
 * a correction apart from a movement is Task 3.4.5's and is deliberately not
 * done here: this decides what is *held*, and that decides what is *said*.
 */
function withObservations(
  held: ReadonlyMap<string, Bar>,
  arrived: ReadonlyMap<string, Bar>,
): ReadonlyMap<string, Bar> {
  if (arrived.size === 0) return held;

  const next = new Map(held);
  for (const [symbol, bar] of arrived) next.set(symbol, bar);
  return next;
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
      // **`greeted` is cleared here, not only on `closed`** (Task 4.2.1). A
      // socket that opens is a new conversation with the gateway whatever the
      // previous one did, and the next snapshot on it is that socket's
      // greeting. Clearing on `closed` alone would miss the case where a
      // close event never arrives.
      return { ...state, socket: "open", greeted: false };

    case "unreadable":
      return {
        ...inbound,
        unreadable: state.unreadable + 1,
        lastUnreadableReason: event.reason,
      };

    // **The socket is alive and we have nothing to do with the contents.**
    // `inbound` is the whole answer: `lastInboundAt` moves, the defect count
    // does not, and no other field is touched.
    case "unsupported":
      return inbound;

    case "closed":
      // **No reconnection.** Story 3.10 owns retry, and this is exactly where
      // somebody adds a loop without noticing it is a policy. Report it
      // honestly and stop.
      return { ...inbound, socket: "closed", greeted: false };

    case "message": {
      const { bars, newest } = observedIn(event.message);

      return {
        ...inbound,
        socket: "open",
        // **The types that carry `feed`, named rather than excluded** — the
        // same repair as `observedIn`'s, forced in the same change by the
        // same fourth message type. `bars` and `overview` say nothing about
        // the feed's state, so the last word stands.
        server:
          event.message.type === "snapshot" || event.message.type === "feed"
            ? event.message.feed
            : state.server,
        // **A new reference exactly when an overview arrives**, and the same
        // one otherwise — `withObservations`' idiom, and the property
        // `sameLiveFeedView` compares by identity.
        overview:
          event.message.type === "overview"
            ? event.message.overview
            : state.overview,
        observations: withObservations(state.observations, bars),
        // **A snapshot sets the baseline; a bar changes it.** A `bars` message
        // clears the flag for exactly the symbols it carries, so the first
        // real observation after a snapshot marks — and every other security
        // stays on its snapshot baseline until its own bar arrives.
        fromSnapshot: withDelivery(
          state.fromSnapshot,
          bars,
          event.message.type,
        ),
        // **The FIRST snapshot on this socket is the connection; the rest
        // are subscribe acknowledgements** (Task 4.2.1). The gateway sends
        // one on connect and one per `subscribe` message, so counting
        // messages counted a cold load as two returns.
        connections:
          event.message.type === "snapshot" && !state.greeted
            ? state.connections + 1
            : state.connections,
        greeted: state.greeted || event.message.type === "snapshot",
        lastObservationAt:
          newest === undefined
            ? state.lastObservationAt
            : Math.max(state.lastObservationAt ?? newest, newest),
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
  /**
   * The latest observation per security — **the same Map the connection holds,
   * not a copy.**
   *
   * A copy per message would be a second allocation of up to 518 entries every
   * minute to produce an object indistinguishable from the one it copied, and
   * it would **destroy the render gate**: `sameLiveFeedView` compares this by
   * reference, so a fresh copy on every derivation would report a change on
   * every keepalive. The reducer already creates a new Map exactly when
   * something arrived, so the reference is the signal and copying here would
   * throw it away.
   *
   * It is `ReadonlyMap` so that handing the connection's own Map out is safe:
   * a consumer cannot write into the state through it.
   */
  readonly observations: ReadonlyMap<string, Bar>;
  /**
   * Symbols whose current observation came from a snapshot (Task 3.5.4).
   *
   * **A snapshot is not an arrival.** A surface that marks *a bar arrived*
   * must not mark what it was simply handed on connect — see
   * {@link LiveFeedConnection.fromSnapshot} for why this cannot be
   * reconstructed from the observation itself.
   */
  readonly fromSnapshot: ReadonlySet<string>;
  /**
   * How many times this feed has come **back**, which is one fewer than the
   * number of sockets that have greeted it with a snapshot (Task 3.10.7,
   * corrected by Task 4.2.1 — it used to be one fewer than the count of
   * snapshot *messages*, and the gateway sends two per connection).
   *
   * `0` while the page has connected at most once, whatever the connection is
   * doing now — a page that has never reached the gateway and a page on its
   * first healthy connection both read `0`, because neither has a hole.
   *
   * **It counts resumptions, not disconnections.** A feed that dropped and has
   * not come back has nothing to fill from: the minutes are still missing and
   * the socket is still the thing that would deliver them. The edge worth
   * acting on is the return.
   */
  readonly resumes: number;
  /**
   * The backend's market aggregate, or `undefined` until the first one lands
   * (Task 4.2.4). **Nothing renders it yet** — Task 4.2.5 is the payoff.
   */
  readonly overview: WireMarketOverview | undefined;
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
  //
  // **`?? state.since` is the correction, and it is not a detail.** The first
  // draft passed `lastInboundAt` straight through, so before the snapshot
  // arrived the rule saw *nothing has ever arrived* and returned
  // `disconnected` — and the chrome would have flashed `DISCONNECTED` on
  // **every page load**, claiming a broken feed before it had finished asking.
  //
  // That is the defect `BackendIndicator`'s `checking` and `MarketFeedView`'s
  // `checking` both exist to prevent, and Task 1.12.1 named it: reporting a
  // client's own ignorance as a fact about the server is the opposite of §36.
  // **We have not connected yet is not we lost the backend** — counting from
  // the moment we started asking is what tells them apart, and it still fails
  // honestly if a connect simply hangs.
  const backendReachable =
    feedStatusFrom(
      {
        closed: state.socket === "closed",
        lastInboundAt: state.lastInboundAt ?? state.since,
        lastObservationAt: undefined,
      },
      { now, wallNow, marketOpen: false },
    ) === "live";

  const common = {
    backendReachable,
    observedAt: state.lastObservationAt,
    unreadable: state.unreadable,
    // **Carried into every branch, including the degraded ones.** A feed that
    // has stopped still holds the last prices it saw, and §36's whole point is
    // that they stay on screen — *displaying data through 10:42:17*. Blanking
    // the Map on `disconnected` would be the product removing true information
    // because a socket died.
    observations: state.observations,
    fromSnapshot: state.fromSnapshot,
    // **Carried into every branch, including the degraded ones**, for the
    // observations' own reason: §36 keeps true figures on screen when a feed
    // stops, labelled rather than blanked. `computedAt` is what labels them.
    overview: state.overview,
    // The first connection is not a return. `Math.max` rather than a
    // subtraction alone so a browser that has been told nothing yet reads
    // `0` rather than `-1`.
    resumes: Math.max(0, state.connections - 1),
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
    a.unreadable === b.unreadable &&
    // **Added with the Map itself, in one change, and that is the whole reason
    // Task 3.4.1 exists as its own task.** This gate is upstream of the
    // reducer, so a Map added without it updates correctly while the screen
    // never changes — a first moving price that does not move, with every test
    // green, because the reducer is right and nothing renders. The test that
    // catches it asserts the **negative**: a new price causes a render.
    //
    // **By reference, and that is sound rather than lucky.** `withObservations`
    // returns a new Map exactly when something arrived and the same reference
    // otherwise, so the reference IS the change signal. A deep comparison would
    // be up to 518 entries every keepalive to answer a question an identity
    // check already answered.
    a.observations === b.observations &&
    a.fromSnapshot === b.fromSnapshot &&
    // **In the gate for the same reason the Map is** (Task 3.10.7). A resume
    // that does not reach a consumer is a gap that is never filled, and it
    // would look exactly like the feed working: every number on screen is
    // correct, and the minutes nobody watched simply stay missing.
    a.resumes === b.resumes &&
    // **Added with the field itself, in the same change** (Task 4.2.4) — the
    // comment above says what happens otherwise, and it happened to the Map:
    // the reducer updates correctly while the screen never changes, with
    // every test green, because nothing renders. The test that catches it
    // asserts the **negative**: an overview frame causes a render.
    //
    // **By reference, and the comparison is DELIBERATELY coarser than the
    // Map's.** `withObservations` returns the same reference when nothing
    // arrived, so its identity check is exact. This one is not:
    // `advanceLiveFeed` stores whatever the decoder built, and the decoder
    // builds a **new object for every overview frame** — so an aggregate
    // whose figures are byte-identical to the last one still reports a
    // change, and the application re-renders.
    //
    // That is accepted rather than overlooked, on two grounds. The frame
    // carries `computedAt`, which moves on every rebuild, so two consecutive
    // aggregates are never genuinely identical — a deep comparison would
    // have to be told to ignore a field that is part of the answer. And the
    // rate is the `bars` cadence, ~16 a minute (§9.5), against a gate whose
    // job is to stop the 120 s keepalive rendering — which it still does,
    // because a keepalive carries no aggregate and leaves this reference
    // alone.
    //
    // **The direction of the error is the safe one**: over-eager renders,
    // never a silent miss. A miss is the defect the comment above records.
    a.overview === b.overview
  );
}
