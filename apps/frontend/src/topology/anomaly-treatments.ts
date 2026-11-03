/**
 * **The wire's band arrays, read into the renderer's own map shape** (Task
 * 6.3.3) — the one translation between `WireAnomalyBands` (Task 6.3.1's wire
 * shape, `packages/shared`) and {@link TopologyAnomalyTreatment}
 * (`renderer.ts`'s own update-channel vocabulary, Task 6.3.2).
 */

import { isTicker } from "@marketpulse/shared";
import type { Ticker, WireAnomalyBands } from "@marketpulse/shared";

import type { TopologyAnomalyTreatment } from "./renderer.js";

/**
 * `bands.elevated`/`.high`/`.extreme`, read into a map `setBands` can take
 * directly. `bands.normal` is never walked: a symbol absent from the
 * returned map already draws `normal`
 * ({@link TopologyAnomalyTreatment}'s own contract), so writing one entry
 * per `normal` symbol — roughly 162 of 485 scored equities, measured at
 * Task 6.3.1 — would be work spent reproducing the renderer's own default.
 *
 * **A malformed symbol is DROPPED, never thrown past** — `isTicker` rather
 * than `toTicker`. The caller runs this from inside a `useEffect`, and
 * `CLAUDE.md` records that a throw inside a React effect is a render error
 * nothing above `App` catches: the whole page goes blank. A wire frame this
 * application's own encoder produced should never contain one, but a
 * single dropped node is the honest degrade if it ever does — not a
 * crashed route.
 */
export function anomalyTreatmentsFromWire(
  bands: WireAnomalyBands,
): ReadonlyMap<Ticker, TopologyAnomalyTreatment> {
  const treatments = new Map<Ticker, TopologyAnomalyTreatment>();

  for (const [symbols, treatment] of [
    [bands.elevated, "elevated"],
    [bands.high, "high"],
    [bands.extreme, "extreme"],
  ] as const) {
    for (const symbol of symbols) {
      if (isTicker(symbol)) treatments.set(symbol, treatment);
    }
  }

  return treatments;
}

/**
 * Every one of the given equities, `unscored` (Task 6.3.3, AC 4). The
 * fallback for the first overview frame this route ever reads whose
 * `anomalyBands` section is absent — CI's permanent state (no provider, no
 * composite generation, ever) and the first ~46 s of a cold deploy before
 * its own feed authenticates. "We don't know", drawn hollow, never `normal`
 * — a security with no score must not read as calm.
 */
export function unscoredAnomalyTreatments(
  equities: readonly Ticker[],
): ReadonlyMap<Ticker, TopologyAnomalyTreatment> {
  return new Map(equities.map((symbol) => [symbol, "unscored"]));
}
