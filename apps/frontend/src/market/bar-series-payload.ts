import type {
  Bar,
  BarPayload,
  BarSeries,
  BarSeriesPayload,
  SeriesCoverage,
  SeriesCoveragePayload,
  SeriesProvenance,
  SeriesProvenancePayload,
  TimeRange,
  TimeWindowPayload,
} from "@marketpulse/shared";
import {
  mergeSeriesProvenance,
  toBarSeries,
  toSeriesProvenance,
  toTicker,
  toTimeRange,
} from "@marketpulse/shared";

// The wire body of `GET /market-data/bars`, turned into domain objects — and
// the place the coherence check that `isBarSeriesResponse` deliberately does
// not do actually happens (Task 2.10.4).
//
// ## Why this is here rather than in the predicate
//
// `isBarSeriesResponse` checks **shape and never coherence**: it does not know
// whether the bars ascend, whether the sources' `barCount`s sum to the bars, or
// whether `covered` agrees with either. Task 2.10.3 wrote the argument for that
// split and it is about what an answer would *mean* rather than about cost.
// `api-client.ts` maps a predicate failure to `unreadable-body`, whose
// documented meaning is *something that is not this API is answering at this
// address*. A body shaped exactly like this contract and carrying mis-ordered
// bars is the **opposite** diagnosis — our own server with a bug — and
// reporting it as a stranger at the address sends the next reader to the wrong
// half of the system.
//
// So the check is relocated here, and it is not a second implementation of
// anything: it is `toTimeRange`, `toSeriesProvenance` and `toBarSeries`, the
// same constructors the backend builds its answers with. Nothing below reads a
// payload field into a domain object by hand, and that is the whole obligation
// Task 2.10.3 handed forward.
//
// ## These throw, and that is correct
//
// Every refusal reachable from here is a bug in a server we wrote, never a
// market condition — a market condition is `bars: []`, which is an answer and
// arrives through this module untouched. So the constructors' own rule applies:
// a result a caller might forget to check is worse than an exception nobody can
// ignore. `bar-series-view.ts` catches at exactly one place and decides which
// state a thrown coherence failure becomes.
//
// ## The unparseable-instant hole, and where it was closed
//
// `new Date("nonsense")` is an `Invalid Date` rather than a throw, and an
// invalid instant compares as **neither before nor after anything**. So a bar
// built from one passes `toBarSeries`' ascending check, and passes both of its
// range checks too — `NaN < start` is false and `NaN >= end` is false — which
// makes it a member of every window ever asked for and puts it on a chart as a
// point with no position.
//
// `toTimeRange` has always refused an invalid end. Nothing refused a **bar's**
// instant, and this task found that while writing the three lines below. The
// guard went into `toBarSeries` rather than here, because here is not the only
// call site: `alpaca-mapping.ts` does `new Date(bar.t)` on a vendor field and
// the bar it builds is **stored**. A check written at the call site that
// noticed it would have left the other one open — which is the same argument
// `api-client.ts` makes about predicates, arriving from the other direction.
//
// So every `new Date(...)` below is deliberately bare: the refusal it needs is
// one call further in, in the constructor that already owns every other refusal
// about this shape.
//
// ## One function per domain type, never a generic mapper
//
// `CLAUDE.md`'s data-layer rule, which is not about the data layer: the mapping
// is exactly where a wire value becomes an explicit domain answer, and a
// generic mapper is where that decision gets skipped. Each function below is
// named for the type it produces and every one of them ends in a constructor.

/** A half-open window on the wire as a {@link TimeRange}. */
function toDomainTimeRange(window: TimeWindowPayload): TimeRange {
  return toTimeRange(new Date(window.start), new Date(window.end));
}

/**
 * The coverage record as the domain spells it.
 *
 * `covered` stays `null` when it arrives `null`, unchanged and unexamined: that
 * is *"we hold nothing"*, it is a 200 (`MARKET-DATA-API.md` §6), and
 * {@link toBarSeries} is what checks it against the bars.
 */
function toDomainCoverage(coverage: SeriesCoveragePayload): SeriesCoverage {
  return {
    requested: toDomainTimeRange(coverage.requested),
    covered:
      coverage.covered === null ? null : toDomainTimeRange(coverage.covered),
  };
}

/**
 * The provenance record as the domain spells it, non-emptiness re-established.
 *
 * The wire types `sources` as a plain array because a tuple has no JSON Schema
 * `fast-json-stringify` could enforce, so the non-emptiness the domain type
 * declares has to be checked here rather than assumed. It is checked by
 * **destructuring**, which is what produces the narrowed head under
 * `noUncheckedIndexedAccess` — the guard that satisfies the compiler is the
 * guard that does the work.
 *
 * A multi-source record is built by merging single-source ones rather than by
 * writing the tuple out, so a stitched series arriving from the server is
 * checked by `mergeSeriesProvenance` on the way in exactly as it was on the way
 * out. That refusal — two sources disagreeing about the adjustment — is the one
 * that matters, because raw and split-adjusted prices are on different scales
 * and every percentage change across the seam would be wrong. It cannot happen
 * today, since `adjustment` is one field for the whole record on the wire; it
 * costs one line to keep the check where it will still be true when the wire
 * shape moves.
 */
function toDomainProvenance(
  provenance: SeriesProvenancePayload,
): SeriesProvenance {
  const [first, ...rest] = provenance.sources.map((source) =>
    toSeriesProvenance(provenance.adjustment, source),
  );

  if (first === undefined) {
    throw new RangeError(
      `A series provenance record must name at least one source. An empty ` +
        `list is a series claiming its bars came from nowhere, and the wire ` +
        `type cannot forbid it.`,
    );
  }

  const [second, ...others] = rest;
  return second === undefined
    ? first
    : mergeSeriesProvenance(first, second, ...others);
}

/** One price observation as the domain spells it. */
function toDomainBar(bar: BarPayload): Bar {
  return {
    startsAt: new Date(bar.startsAt),
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume,
  };
}

/**
 * The whole series, coherence-checked.
 *
 * Every check that matters is inside {@link toBarSeries}: the bars ascend
 * strictly, the sources' `barCount`s sum to the bars, `covered` is null exactly
 * when the series is empty, every bar starts inside `covered`, and `covered`
 * lies inside `requested`. This function's job is to hand it typed parts and to
 * stay out of the way.
 *
 * `toTicker` is the one refusal here that is about a *value* rather than a
 * relationship, and it is not a duplicate of the server's check: the server
 * refuses a malformed symbol with a 400 naming the input, and this refuses a
 * malformed symbol the server *echoed back*, which would be a different and
 * much stranger fault.
 */
export function toDomainSeries(series: BarSeriesPayload): BarSeries {
  return toBarSeries({
    symbol: toTicker(series.symbol),
    timeframe: series.timeframe,
    bars: series.bars.map(toDomainBar),
    provenance: toDomainProvenance(series.provenance),
    coverage: toDomainCoverage(series.coverage),
  });
}
