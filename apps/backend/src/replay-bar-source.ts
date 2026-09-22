import { toTimeRange } from "@marketpulse/shared";
import type { Bar, Ticker } from "@marketpulse/shared";

import type { MarketBarsRepository } from "./market-bars.js";
import type { ReplayBarSource, ReplaySlice } from "./replay-engine.js";

/**
 * A {@link ReplayBarSource} over the **48.4M real minute bars already in
 * `market_bars`** — the same seam the in-memory source implements, with the
 * shipped repository behind it.
 *
 * ## It reads through `readBars` rather than writing its own query
 *
 * `market-bars.ts` is the module that owns this read, and Story 2.9 made
 * `readBars` *the* served read rather than writing a second one. A replay with
 * its own SQL would be a second definition of what a stored bar is, on the
 * table Epic 13's replay also has to read as-of a past instant.
 *
 * ## `status` is not filtered, and that is Story 2.3's rule rather than a
 * choice made here
 *
 * `CLAUDE.md`: *filter on `status` when computing over the market we track
 * **now**; never when showing or replaying something we **stored**.* A replay
 * shows what we recorded, and a security delisted since then was trading on the
 * day being replayed. `readBars` takes a symbol and does not filter, which is
 * the correct shape — this note exists so nobody adds one.
 */
export interface StoredReplaySourceOptions {
  readonly repository: MarketBarsRepository;
  readonly symbols: readonly Ticker[];
  /** The last instant this source will serve. Bounds the read. */
  readonly until: Date;
  /** How much recorded time to fetch per read. */
  readonly windowMs?: number;
}

const ONE_MINUTE_MS = 60_000;

export function createStoredReplaySource(
  options: StoredReplaySourceOptions,
): ReplayBarSource {
  const { repository, symbols, until, windowMs = 15 * ONE_MINUTE_MS } = options;

  // One window held at a time, keyed by the instant it starts at. A replay
  // reads forwards and never rewinds, so a cache of one is the whole need — and
  // a larger one would be a second store beside `market_bars`.
  let buffered: ReplaySlice[] = [];
  let bufferedThrough = Number.NEGATIVE_INFINITY;

  const fill = async (from: Date): Promise<void> => {
    const end = new Date(
      Math.min(from.getTime() + windowMs, until.getTime() + ONE_MINUTE_MS),
    );
    if (end.getTime() <= from.getTime()) {
      buffered = [];
      bufferedThrough = Number.POSITIVE_INFINITY;
      return;
    }

    const range = toTimeRange(from, end);
    // Grouped by the bar's own instant, so a slice is *a minute across
    // symbols* rather than *a symbol across minutes* — which is the shape the
    // engine replays and the shape the live feed arrives in (§7.2: the vendor
    // batches a minute's bars together).
    const byInstant = new Map<number, Map<Ticker, Bar>>();

    for (const symbol of symbols) {
      const stored = await repository.readBars(symbol, "1m", range);
      // The tape each row carries (`StoredBar.feed`) is deliberately dropped
      // here: what a replay emits is labelled `replay` by the engine, whatever
      // tape the bar was observed on, and that word is the engine's to say.
      for (const { bar } of stored) {
        const key = bar.startsAt.getTime();
        const slice = byInstant.get(key) ?? new Map<Ticker, Bar>();
        slice.set(symbol, bar);
        byInstant.set(key, slice);
      }
    }

    buffered = [...byInstant.entries()]
      .sort(([a], [b]) => a - b)
      .map(([instant, bars]) => ({ occurredAt: new Date(instant), bars }));
    bufferedThrough = end.getTime();
  };

  return {
    async next(from: Date): Promise<ReplaySlice | undefined> {
      for (;;) {
        const ready = buffered.find(
          (slice) => slice.occurredAt.getTime() >= from.getTime(),
        );
        if (ready !== undefined) return ready;
        if (from.getTime() > until.getTime()) return undefined;
        if (bufferedThrough === Number.POSITIVE_INFINITY) return undefined;

        // Nothing buffered at or after `from`: advance the window. A stretch
        // with no stored bars at all — a weekend inside the range, a thin
        // security's quiet hour — is a normal answer rather than an end, so
        // this loops rather than returning.
        const nextFrom = new Date(Math.max(from.getTime(), bufferedThrough));
        if (nextFrom.getTime() > until.getTime()) return undefined;
        await fill(nextFrom);
        if (buffered.length === 0 && bufferedThrough > until.getTime()) {
          return undefined;
        }
      }
    },
  };
}
