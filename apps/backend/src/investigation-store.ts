// The in-memory home for every investigation this process runs, and the
// append-only log of events behind it — Task 7.1.3's SSE route reads both:
// the map for `GET /investigations/:id`-shaped lookups (not yet a route),
// the log for a client attaching mid-run or reconnecting after a drop.
//
// Bounded rather than unbounded on purpose: nothing in this story's own
// scope ever removes an investigation, and a process left running for days
// would otherwise hold every one ever started. 200 is `STORY.md`'s own
// settled figure (Gate 1, "a-stated-cap-200"), not derived from a
// measurement — there is no real agent yet to measure against.

import { EventEmitter } from "node:events";

import type {
  Investigation,
  InvestigationEvent,
  InvestigationId,
} from "@marketpulse/shared";

export const INVESTIGATION_STORE_CAPACITY = 200;

export interface InvestigationStore {
  /** Inserts a new investigation, evicting first if the store is already
   * at capacity. Refuses nothing — the caller mints the id and this is
   * the one place it is first recorded. */
  create: (investigation: Investigation) => void;
  get: (id: InvestigationId) => Investigation | undefined;
  /** Replaces the stored investigation wholesale — this object has no
   * notion of a partial update, because `Investigation` is immutable data
   * and the caller always has the whole next value. */
  update: (id: InvestigationId, investigation: Investigation) => void;
  /** Appends to the investigation's own event log and notifies anything
   * subscribed via {@link InvestigationStore.onEvent}. A no-op, rather
   * than a throw, for an id this store does not hold — the investigation
   * may have been evicted between a producer starting and finishing. */
  appendEvent: (id: InvestigationId, event: InvestigationEvent) => void;
  /** Every logged event from `fromSeq` forward (inclusive), for a client
   * attaching mid-run or replaying after a reconnect. An unknown id
   * answers with an empty list — "nothing observed", not an error. */
  eventsFrom: (
    id: InvestigationId,
    fromSeq: number,
  ) => readonly InvestigationEvent[];
  /** Live-follow: calls `listener` for every event appended to this
   * investigation from the moment of subscription. Returns the
   * unsubscribe function. This is the half `eventsFrom` cannot cover —
   * together they are how `scripted-agent-provider.ts`'s `streamEvents`
   * replays the past and then keeps going without a poll. */
  onEvent: (
    id: InvestigationId,
    listener: (event: InvestigationEvent) => void,
  ) => () => void;
  /** Every held investigation, oldest first — Task 7.1.3's own reason: the
   * second-press idempotency rule (`POST /investigations` for a symbol
   * with an already-running investigation returns the existing one) has
   * to search by subject rather than by id, and there is no id to key a
   * narrower read on. Bounded by `capacity`, so a linear scan here is the
   * same order of work as every other read this object does. */
  list: () => readonly Investigation[];
  size: () => number;
}

export function createInvestigationStore(
  capacity: number = INVESTIGATION_STORE_CAPACITY,
): InvestigationStore {
  // Map iteration order is insertion order, which is what makes "the
  // oldest completed investigation" a plain forward scan rather than a
  // second structure tracking age.
  const investigations = new Map<InvestigationId, Investigation>();
  const logs = new Map<InvestigationId, InvestigationEvent[]>();
  const emitters = new Map<InvestigationId, EventEmitter>();

  function evictOldestCompleted(): void {
    for (const [id, investigation] of investigations) {
      if (investigation.status !== "completed") continue;
      investigations.delete(id);
      logs.delete(id);
      emitters.get(id)?.removeAllListeners();
      emitters.delete(id);
      return;
    }
    // No completed investigation exists to evict — every entry is
    // running (or, once Story 7.5 ships, failed/cancelled). The task's
    // own rule is "never evict a running one", so the store holds more
    // than `capacity` rather than breaking that guarantee. This is a
    // real state and not an oversight: it is exactly as safe as the cap
    // was meant to prevent, until a run actually completes.
  }

  return {
    create(investigation) {
      if (investigations.size >= capacity) evictOldestCompleted();
      investigations.set(investigation.id, investigation);
      logs.set(investigation.id, []);
    },

    get(id) {
      return investigations.get(id);
    },

    update(id, investigation) {
      if (!investigations.has(id)) return;
      investigations.set(id, investigation);
    },

    appendEvent(id, event) {
      const log = logs.get(id);
      if (log === undefined) return;
      log.push(event);
      emitters.get(id)?.emit("event", event);
    },

    eventsFrom(id, fromSeq) {
      const log = logs.get(id);
      if (log === undefined) return [];
      return log.filter((event) => event.seq >= fromSeq);
    },

    onEvent(id, listener) {
      let emitter = emitters.get(id);
      if (emitter === undefined) {
        emitter = new EventEmitter();
        emitters.set(id, emitter);
      }
      emitter.on("event", listener);
      return () => emitter.off("event", listener);
    },

    list: () => [...investigations.values()],

    size: () => investigations.size,
  };
}
