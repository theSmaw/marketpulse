import type { LiveObservation } from "./market-data-stream.js";
import type { Ticker } from "@marketpulse/shared";

/**
 * **The recent past, per security, in memory** — the epic's one genuinely new
 * structural component (Task 5.2.1).
 *
 * `current-market-state.ts` is **latest-only**, by a decision Story 3.5 took on
 * purpose and measured: _518 latest values, not 518 × 390 minute bars_
 * (`LIVE-DATA.md` §10.3). The consequence lands here. **A 5-minute return needs
 * the bar from five minutes ago and nothing in this process holds it** — not the
 * current state, which has already overwritten it, and not the browser, which
 * holds one symbol and at `3M`/`1Y` holds daily bars with no five-minute
 * endpoint at all.
 *
 * ## It is a SIBLING, and the cost of that is recorded rather than hidden
 *
 * The owner's Gate 1 decision 2, with `market-overview.ts`'s own precedent
 * behind it (ADR 0038 decision 1: _a sibling, never a method on it_). The
 * architect's recommendation was to widen `currentMarketState` instead, for
 * one-home; the owner took the lower risk to a hot path that the socket, the
 * gateway and the live bar writer all stand on.
 *
 * **What that costs: two homes now hold _the newest bar for this security_.**
 * **Reversal trigger, a condition:** the first time this window and
 * `currentMarketState` are observed to disagree about a security's latest bar,
 * or the first writer of either that is not `index.ts`'s `onObservations`.
 *
 * ## What it does NOT do
 *
 * - **It does not compute anything.** Task 5.2.2's return is a **pure function
 *   taking a window and an `asOf` as arguments**, which is what {@link
 *   TrailingWindow.read} exists to make possible. A `returnOf(symbol)` on this
 *   interface would put a figure's definition inside its storage.
 * - **It does not read the store.** Gate 1 decision 3: **no store-backed fill
 *   at cold start.** An empty window is a legitimate value rather than a
 *   degraded one (Story 3.5's property 4) and `observed 0 of 5` has to render
 *   anyway; a fill buys an unmeasured deployed-tier read, a cache, a
 *   `loadedFor`-class defect, and a tape decision — a store-filled window
 *   straddling the nightly backfill gets a `sip` earlier endpoint and an `iex`
 *   later one, and the two closes can differ by more than the move being
 *   measured. **Reversal trigger:** the first restart inside a session where a
 *   reader reports the region blank.
 * - **It never imputes.** A minute nobody observed is an **absence** in the
 *   window, never an interpolated bar. On IEX that is the ordinary case rather
 *   than the exception — §7.6 measured 65.1% minute coverage for a median
 *   symbol and **2.1%** for `ERIE` — and it is why AC 3 makes a missing
 *   endpoint a **refusal** rather than a stretch to the nearest bar.
 *
 * ## The tape, stated
 *
 * Every bar here arrives from one stream whose feed is `iex`, so a return
 * computed from this window is `iex`-over-`iex` — no mixing, **by
 * construction**, and that is a property of there being no store fill rather
 * than of a check. Invariant 6 then requires the surface that draws the figure
 * to say `IEX` rather than inherit the stored bars' `All US exchanges`; that is
 * Task 5.2.3's and is written there.
 */

/**
 * The span a reader is entitled to ask about: **five minutes**.
 *
 * Exported so Task 5.2.2's pure function and this module agree about the figure
 * by reading one constant rather than by both spelling `300_000`.
 */
export const TRAILING_WINDOW_SPAN_MS = 5 * 60_000;

/**
 * **ε — the slack the window keeps BEYOND the span it serves, and it is chosen
 * rather than rounded to zero.**
 *
 * A revision lands **29.1–30.1 s after the bar it corrects** (`LIVE-DATA.md`
 * §14.1, re-measured over a whole session on 2026-09-24), while bars are 60 s
 * apart. So a window trimmed to exactly five minutes can evict the **earlier
 * endpoint** in the gap between a bar arriving and its revision arriving, and
 * the figure would then refuse — or worse, be computed from a different pair —
 * for reasons no reader could see.
 *
 * **90 s**: three revision latencies of headroom, which at one bar a minute is
 * a worst-case depth of **7** (the five minutes' six endpoints, plus the 90 s
 * tail's one-and-a-half, rounded up). Stated here because the memory figure in
 * this task's record is quoted against that depth.
 */
export const TRAILING_WINDOW_TOLERANCE_MS = 90_000;

export interface TrailingWindowOptions {
  /** The span a reader may ask about. Defaults to {@link TRAILING_WINDOW_SPAN_MS}. */
  readonly spanMs?: number;
  /**
   * ε. Defaults to {@link TRAILING_WINDOW_TOLERANCE_MS}, and a caller that
   * passes `0` is asking for the defect that constant documents.
   */
  readonly toleranceMs?: number;
}

export interface TrailingWindow {
  /**
   * Record a batch. **The only writer**, and it is `index.ts`'s
   * `onObservations` — the same single-writer shape `currentMarketState` has,
   * for the same reason: two writers over one stream is two policies that
   * disagree the moment anything reads both (Task 3.5.2's defect).
   *
   * **It is handed `observed.applied`, and that is AC 2's decision rather than
   * a preference.** `applied` is the list `current-market-state.ts` has already
   * dropped every superseded bar from, so **the never-walk-backwards rule is
   * inherited here rather than re-implemented**. A window fed `tracked` would
   * receive revisions for minutes already passed and would have to make that
   * judgement a second time.
   *
   * **Synchronous, and no I/O at all.** AC 7 is satisfied by there being
   * nothing to await rather than by a `.catch()`: this runs inside the socket's
   * own callback, where an unhandled rejection is a crashed process on a
   * liveness-probed platform.
   */
  record: (observations: readonly LiveObservation[]) => void;

  /**
   * One security's window, **oldest first**, or an empty array for *nothing
   * observed* — an ordinary answer rather than an error, exactly as
   * `CurrentMarketState.read` returns `undefined` rather than inventing a zero.
   *
   * The observations are returned as they arrived, each carrying its own
   * `startsAt` and its own `source`. **There is no way to read a price here
   * without receiving its instant**, which is `currentMarketState`'s property 2
   * held by shape rather than by documentation.
   */
  read: (symbol: Ticker) => readonly LiveObservation[];

  /** How many bars are held for one security. `0` for a security never observed. */
  depth: (symbol: Ticker) => number;

  /** How many securities have a non-empty window. */
  size: () => number;
}

/**
 * **Eviction is by each bar's own `startsAt`, never by count.**
 *
 * A count of six on a security at `ERIE`'s measured **2.1%** minute coverage
 * holds six bars spanning *hours*, and AC 3 then has to refuse a figure from a
 * window that **looks full** — which is the shape that produces "the 5-minute
 * return" between bars 47 minutes apart. Keyed on the instants instead, a
 * sparse security simply holds fewer bars, and the refusal is readable.
 *
 * The cutoff is taken from the **newest bar held for that security**, not from
 * the wall clock. Two reasons: nothing on this path reads a clock, so the
 * window is driven entirely by what arrived; and a quiet security's window must
 * not quietly empty itself between bars, because the figure's own refusal
 * depends on knowing what the last pair actually was.
 */
export function createTrailingWindow(
  options: TrailingWindowOptions = {},
): TrailingWindow {
  const {
    spanMs = TRAILING_WINDOW_SPAN_MS,
    toleranceMs = TRAILING_WINDOW_TOLERANCE_MS,
  } = options;

  const retainMs = spanMs + toleranceMs;

  /** One array per security, **ascending by `startsAt`**, newest last. */
  const windows = new Map<Ticker, LiveObservation[]>();

  const insert = (held: LiveObservation[], observation: LiveObservation) => {
    const arriving = observation.bar.startsAt.getTime();

    // Walk from the newest end, which is where every production arrival lands:
    // `applied` has already dropped anything older than the latest, so the
    // common case is one comparison and a `push`.
    for (let index = held.length - 1; index >= 0; index -= 1) {
      const candidate = held[index];
      if (candidate === undefined) continue;

      const at = candidate.bar.startsAt.getTime();

      // **The revision case.** One minute holds one bar, and the later
      // observation of it wins — §14.1 measured 37.6% of revisions changing the
      // close and **not one** changing nothing. Appending would hold two bars
      // for one minute, which is a return computed over a duplicate endpoint.
      if (at === arriving) {
        held[index] = observation;
        return;
      }

      if (at < arriving) {
        held.splice(index + 1, 0, observation);
        return;
      }
    }

    held.unshift(observation);
  };

  const evict = (held: LiveObservation[]) => {
    const newest = held[held.length - 1];
    if (newest === undefined) return;

    const cutoff = newest.bar.startsAt.getTime() - retainMs;

    let drop = 0;
    while (drop < held.length) {
      const candidate = held[drop];
      if (candidate === undefined) break;
      if (candidate.bar.startsAt.getTime() >= cutoff) break;
      drop += 1;
    }

    if (drop > 0) held.splice(0, drop);
  };

  return {
    record(observations) {
      for (const observation of observations) {
        // No universe gate here, deliberately: `applied` has already passed
        // through `currentMarketState`'s `status` filter, and a second copy of
        // that predicate is how one of them quietly stops filtering (Task
        // 3.5.3's own note).
        let held = windows.get(observation.symbol);
        if (held === undefined) {
          held = [];
          windows.set(observation.symbol, held);
        }

        insert(held, observation);
        evict(held);
      }
    },

    read(symbol) {
      // **A copy, not the held array.** The writer `splice`s this array on
      // every eviction, so handing the reader the live one would mutate a
      // window a pure function was already part-way through — and at a depth of
      // 7 the copy is seven references. `currentMarketState.all()` builds a
      // snapshot for the same reason.
      const held = windows.get(symbol);
      return held === undefined ? [] : [...held];
    },

    depth(symbol) {
      return windows.get(symbol)?.length ?? 0;
    },

    size: () => windows.size,
  };
}
