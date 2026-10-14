import { asInstant } from "@marketpulse/shared";

import type {
  WireObservedSpan,
  WireReturnComparison,
  WireReturnEndpoint,
  WireSymbolReturn,
} from "@marketpulse/shared";
import type {
  FiveMinuteReturn,
  ObservedSpan,
  ReturnEndpoint,
} from "./five-minute-return.js";
import type { PercentileAnswer } from "./return-percentile.js";

/**
 * **The 5-minute return, on the wire** (Task 5.2.3).
 *
 * ## Why this is a module of its own and not two more lines in
 * ## `five-minute-return.ts`
 *
 * Two reasons, and the first is somebody's check rather than a preference.
 * **That module's own suite asserts it exports exactly ONE function**, on the
 * argument that *pick the endpoints* and *subtract them* must not be two
 * separable steps a caller can re-assemble — a second exported function there
 * weakens a guard Task 5.2.2 wrote deliberately, and the honest answer to a
 * guard in the way is to satisfy it rather than to widen it.
 *
 * And the pure function **reads no clock, no socket and no protocol**, which is
 * what makes invariant 4 structural in it: Epic 13's replay calls it and sends
 * no frame. A transport import in that file is the first thread back to a
 * wire it has no business knowing about.
 */
/**
 * One endpoint, on the wire.
 *
 * **The `feed` and nothing else off the {@link ReturnEndpoint.source}.**
 * `BarSource` also carries a `provider` — not a claim about venues — and a
 * `retrievedAt`, which is a fact about **this process** rather than about the
 * market, and §11.1's rule is that a frame carries what a surface needs rather
 * than an internal shape. What the surface needs is invariant 6's field.
 *
 * **Nothing is added to the instant.** `startsAt` is the start of the minute
 * the bar describes and both ends are bar instants, so adding
 * `OBSERVATION_INTERVAL_MS` — which `describeMeasuredReach` does, because it
 * claims *reach* — would make a five-minute return print a six-minute span.
 */
const toWireEndpoint = (endpoint: ReturnEndpoint): WireReturnEndpoint => ({
  at: asInstant(endpoint.startsAt),
  price: endpoint.close,
  feed: endpoint.source.feed,
});

/**
 * **The figure, as it travels** (Task 5.2.3).
 *
 * ## The refusal is carried rather than collapsed, and the mapping is the check
 *
 * `refusal: figure.refusal` compiles only while {@link ReturnRefusal} is a
 * subset of `WireReturnRefusal`, so **a fourth refusal in this module is a
 * compile error here** rather than a refusal the browser silently cannot name.
 * That is the same mechanism `createMarketDataProvider`'s exhaustive switch
 * uses, pointed at a union crossing a wire.
 *
 * ## It is a separate function rather than a field on the figure
 *
 * {@link fiveMinuteReturn} reads no handle, no clock and no protocol, which is
 * what makes invariant 4 structural in it. A wire shape is a transport
 * concern; keeping the two apart is why the pure function can be called by a
 * replay that never sends a frame.
 */
/**
 * **What the window held, where it held something** (Task 5.2.4).
 *
 * `undefined` becomes `null` and that is a wire decision rather than a
 * translation: the field crosses a socket, and an absent key and an explicit
 * `null` are the same thing to a decoder while a `undefined` is not a JSON
 * value at all. See {@link WireRefusedReturn.seen}.
 */
const toWireSeen = (seen: ObservedSpan | undefined): WireObservedSpan | null =>
  seen === undefined
    ? null
    : {
        newest: toWireEndpoint(seen.newest),
        observed: seen.observed,
        spanMinutes: seen.spanMinutes,
      };

/**
 * **How unusual the magnitude is, as it travels** (Task 5.3.3).
 *
 * `undefined` becomes `null` for {@link toWireSeen}'s reason — an absent key
 * and an explicit `null` are the same thing to a decoder while `undefined` is
 * not a JSON value at all.
 *
 * **It is a field-for-field copy of BOTH arms and deliberately so.** Nothing
 * is derived here: the rank, the ceiling flag, the counted `n`, the grid
 * stride, the baseline's tape, the refusal word and the bound it was measured
 * against are all answers {@link comparableBaseline} and
 * {@link returnPercentileOf} already gave, and a transport that recomputed any
 * of them would be a second producer for a figure invariant 1 says has exactly
 * one. **Amended 2026-10-14 (Task 5.3.4): the union has a refused arm**, so
 * `null` now means only *this gateway sent no comparison*.
 */
const toWirePercentile = (
  answer: PercentileAnswer | undefined,
): WireReturnComparison | null => {
  if (answer === undefined) return null;

  if (!answer.ranked) {
    return {
      ranked: false,
      refusal: answer.refusal,
      sampleCount: answer.sampleCount,
      minimumSampleCount: answer.minimumSampleCount,
    };
  }

  const { percentile } = answer;

  return {
    ranked: true,
    rank: percentile.rank,
    aboveSample: percentile.aboveSample,
    sampleCount: percentile.sampleCount,
    spanMinutes: percentile.spanMinutes,
    feed: percentile.feed,
  };
};

/**
 * The figure and — where there is a baseline to compare it with — its
 * percentile.
 *
 * **The percentile is a SECOND argument rather than a field on the figure**,
 * and that is the same seam this module exists for. `fiveMinuteReturn` is pure
 * over a trailing window and knows nothing about a 60-session distribution
 * held in memory; the join of the two is the wiring site's, in `index.ts`,
 * which is the one place that holds both. A `percentile` on `MeasuredReturn`
 * would put a stored aggregate inside the one function Epic 13's replay calls
 * with nothing but bars.
 *
 * **A refusal never carries one**, by construction rather than by a branch
 * somebody has to remember: there is no magnitude to rank, and
 * {@link WireMeasuredReturn.percentile} is the only member that has the field.
 *
 * **Since Task 5.3.4 the second argument is a `PercentileAnswer` rather than a
 * percentile** — a rank, or the refusal and the two numbers its sentence needs.
 * Omitting it still means *no comparison at all*, which is the one state a
 * frame reaches when the distribution it was handed was malformed.
 */
export function toWireSymbolReturn(
  figure: FiveMinuteReturn,
  comparison?: PercentileAnswer,
): WireSymbolReturn {
  if (!figure.measured) {
    return {
      measured: false,
      refusal: figure.refusal,
      seen: toWireSeen(figure.seen),
    };
  }

  return {
    measured: true,
    percent: figure.percent,
    from: toWireEndpoint(figure.from),
    to: toWireEndpoint(figure.to),
    observed: figure.observed,
    spanMinutes: figure.spanMinutes,
    percentile: toWirePercentile(comparison),
  };
}
