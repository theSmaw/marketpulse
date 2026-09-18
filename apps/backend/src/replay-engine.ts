import type { Bar, Ticker } from "@marketpulse/shared";

/**
 * The pacing, ordering and re-stamping every replayed feed needs, once.
 *
 * `STORY.md` requires **one engine over a `ReplayBarSource` seam** serving both
 * the stored-bar case and the generated one, so that pacing, ordering, session
 * advance and `BarSource` stamping exist in a single place rather than being
 * re-derived per source.
 *
 * ## The one rule this file exists to enforce
 *
 * **No observation is ever emitted ahead of the replay's own clock.**
 *
 * That is invariant 4 — temporal isolation — in miniature, and
 * `PRODUCT_SPEC.md` §22 is emphatic that it belongs in the data layer rather
 * than in an instruction: *"This should be enforced at the tool/data layer
 * rather than merely included in the LLM prompt. That prevents accidental
 * future-information leakage."* Epic 13 builds the full version; **this is the
 * first place in the product where the constraint is real rather than
 * anticipated**, and the shape it takes here is the shape it takes there.
 *
 * ## Two instants, both real, neither invented
 *
 * A replayed bar carries:
 *
 * - **`occurredAt`** — when it was true in the market. The recorded instant,
 *   untouched. This is `market_bars.observed_at`'s concept, and the column
 *   Epic 13's replay keys on.
 * - **`startsAt`** — re-stamped onto the wall clock, because a chart drawing
 *   *now* has to plot it *now*.
 *
 * **Neither is fabricated**: one is when it happened, the other is when we are
 * showing it. What would be fabricated is a single instant claiming to be both.
 */

/** One replayable minute: the instant it really happened, and what happened. */
export interface ReplaySlice {
  /** The recorded instant. Never altered. */
  readonly occurredAt: Date;
  readonly bars: ReadonlyMap<Ticker, Bar>;
}

/**
 * Where a replay's minutes come from.
 *
 * A seam rather than a database call, so the engine is testable with **no
 * database** — which `pnpm test` requires — and so the generated case and the
 * stored case are the same engine with a different source behind them.
 */
export interface ReplayBarSource {
  /**
   * The next minute at or after `from`, or `undefined` when the source is
   * exhausted.
   *
   * **Pull rather than push**, so the engine decides when a minute is due and a
   * source can never run ahead of the replay clock by being eager.
   */
  next(from: Date): Promise<ReplaySlice | undefined>;
}

export interface ReplayEngineOptions {
  readonly source: ReplayBarSource;
  /** Where in the recording to begin. */
  readonly from: Date;
  /** Wall clock, injected — the engine never reads one. */
  readonly wallNow: () => number;
  /**
   * How much recorded time passes per real second. `1` replays in real time,
   * which is what a motion vocabulary has to be designed against.
   */
  readonly speed?: number;
}

export interface ReplayEngine {
  /**
   * Everything due at `wallNow()` and nothing after it.
   *
   * Returns slices **in recorded order**, each carrying the wall-clock instant
   * it is being shown at. A caller that asks twice in the same millisecond gets
   * the second answer empty rather than a repeat.
   */
  due(): Promise<readonly DueSlice[]>;
  /** Where the replay clock has reached, in recorded time. */
  position(): Date;
}

export interface DueSlice extends ReplaySlice {
  /** The wall-clock instant this minute is being presented at. */
  readonly presentedAt: Date;
}

export function createReplayEngine(options: ReplayEngineOptions): ReplayEngine {
  const { source, from, wallNow, speed = 1 } = options;

  const startedWall = wallNow();
  let position = from;
  let pending: ReplaySlice | undefined;

  /** Recorded time that *should* have elapsed by now, at `speed`. */
  const recordedElapsed = (): number => (wallNow() - startedWall) * speed;

  return {
    position: () => position,

    async due() {
      const ceiling = new Date(from.getTime() + recordedElapsed());
      const ready: DueSlice[] = [];

      for (;;) {
        pending ??= await source.next(position);
        if (pending === undefined) break;

        // **The whole point of the file.** A slice recorded later than the
        // replay clock has reached is NOT emitted — it is held, and offered
        // again on a later call. Nothing downstream can see a future price,
        // because nothing downstream is handed one.
        if (pending.occurredAt.getTime() > ceiling.getTime()) break;

        ready.push({ ...pending, presentedAt: new Date(wallNow()) });
        position = new Date(pending.occurredAt.getTime() + 1);
        pending = undefined;
      }

      return ready;
    },
  };
}

/**
 * Re-stamp a recorded bar onto the instant it is being shown at.
 *
 * Kept beside the engine rather than in a stream, because **both** replay
 * sources need it and it is the one operation that must be spelled identically
 * for each: a second copy is how one of them quietly stops re-stamping.
 */
export function restamp(bar: Bar, presentedAt: Date): Bar {
  return { ...bar, startsAt: presentedAt };
}
