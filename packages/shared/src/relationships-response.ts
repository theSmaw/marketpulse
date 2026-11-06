/**
 * **The wire contract for `GET /market-data/relationships`** — the measured
 * relationships between two securities, as one nightly pass produced them
 * (Task 6.5.2, ADR 0049).
 *
 * One question, asked once per page load: **which securities move together,
 * and over what population was that decided?** It is here rather than in
 * `apps/backend` for Story 1.6's test — shared means both sides depend on the
 * same fact — and it has two sides from the moment it exists, because the
 * graph's own edge set is drawn from it.
 *
 * ## It is a `/market-data` route and not a `/securities` one
 *
 * A correlation is a **measurement over stored bars**, which is what
 * `MARKET-DATA-API.md` §1 says that namespace is for: *everything whose
 * subject is the market rather than the security*. `/securities` is the curated
 * universe — a fact about what we track, served to every route's chrome — and
 * hanging 1,860 measured pairs off it would make the one request every screen
 * already pays grow by a payload only one region reads, on a store that may
 * not have it at all.
 *
 * ## `pass` ABSENT and `pass` present with `retainedPairs: 0` are different
 * ## answers, and that is the whole shape of this body
 *
 * ADR 0029's first rule — *a claim about data requires data* — applied to a
 * pass rather than to a figure. Three states a reader must be able to tell
 * apart, and nothing but the envelope's own shape tells them apart:
 *
 *   1. **No pass has ever run.** `pass` is **absent** and `correlations` is
 *      empty. This is CI's permanent state (zero bars, no provider, no nightly
 *      generation) and every laptop's before the first `pnpm baselines`.
 *   2. **The pass ran and retained nothing.** `pass` is present, its own
 *      figures say how many pairs it considered and why each was refused or
 *      cut, and `correlations` is empty. Nothing is drawn, and the reason is
 *      **stated** rather than looking identical to never having measured.
 *   3. **The pass ran and retained pairs.** Both are present.
 *
 * **`pass` is an ABSENT field rather than a present `null`**, which is
 * `SecuritiesResponse.provenance`'s own precedent and this repository's
 * measured rule: a nullable *object* is expressible as an omitted key, and
 * every `null` that reaches `fast-json-stringify` under a declared primitive
 * comes out as that primitive's zero value — `""` under `"string"` and, worse,
 * **`0` under `"number"`**, which is a plausible figure rather than a visibly
 * empty one. Nothing in this body is a nullable number for exactly that
 * reason: a coefficient is either a real measurement or there is no row.
 *
 * ## Every figure is the PRODUCER's, and none is derivable from the rows
 *
 * `correlations.length` is *what we kept*, and it answers none of the questions
 * a reader of a sparse graph actually has: how many equities were eligible at
 * all, how many pairs were considered, how many were measured and then **cut**
 * for being indistinguishable from zero. `0018` §5's own argument — *a graph
 * that joins only the row table under-reports and looks correct* — is why the
 * pass row exists, and this payload carries it rather than letting a surface
 * infer a population from the size of a selection.
 */

import { MARKET_FEEDS } from "./market-provenance.js";
import type { MarketFeed } from "./market-provenance.js";

/**
 * One retained pair on the wire.
 *
 * **Two tickers, never two ids.** `security_low_id`/`security_high_id` are
 * row-insertion ordinals that CI's store and the deployed store assign
 * differently (`0018` §3), so an id on this wire would be an identifier that
 * means a different security depending on which deployment answered. The
 * resolution to a symbol happens in the route's own read, against the same
 * `securities` table every other payload resolves through.
 *
 * `low`/`high` are the **ticker** order — the canonical order the row is
 * stored in — and `TopologyCorrelation` takes exactly these three fields, so
 * the graph model's merge needs no mapper between this and itself.
 */
export interface CorrelationPayload {
  /** The pair's lexicographically lower ticker. */
  readonly low: string;
  /** The pair's lexicographically higher ticker. */
  readonly high: string;
  /** Pearson's `r` over the two 5-minute return grids, **signed**. */
  readonly r: number;
  /**
   * The counted overlap the coefficient was taken over — how many anchors both
   * securities printed a bar at.
   *
   * **Counted, never a constant**, which is Story 5.3's rule arriving on a
   * pair: the real spread on the one store this has been measured against is
   * 466–4,620, so a surface quoting "60 sessions" as though every pair had the
   * same evidence would be quoting the window rather than the sample.
   */
  readonly n: number;
}

/**
 * What one nightly pass did, at both grains — the pass row's own figures.
 *
 * The security populations **partition** (`eligible + splitDiscontinuity +
 * absent = trackedEquities`) and the pair populations **nest**
 * (`retainedPairs ≤ computedPairs ≤ candidatePairs`), and `0018` holds both
 * arithmetics in the database rather than trusting a writer. A reader may rely
 * on both.
 *
 * `belowSignificance` is deliberately **not** one of the refusals: *we could
 * not measure this pair* and *we measured it and it is not distinguishable
 * from zero* are different facts with different repairs, and the second is a
 * **cut** — the thing Open Decision 3 settled, and the figure that explains
 * why a graph over 122,760 candidates draws 1,860 edges.
 */
export interface RelationshipsPassPayload {
  /**
   * The session this pass is FOR — its window's end, as an ISO instant.
   *
   * ADR 0044's `observed_at`, serialised the way every instant on this
   * product's wire is. **It is the pass's own column and never the request's
   * clock**: a body served from a cache and one read fresh carry the same
   * instant, because the instant is a property of the data.
   */
  readonly observedAt: string;

  /** The active equities the pass was over. */
  readonly trackedEquities: number;
  /** Past the split guard, with at least one grid return. */
  readonly eligibleEquities: number;
  /** Refused by ADR 0047's split guard — forms no pair at all. */
  readonly splitDiscontinuity: number;
  /** No stored grid pair whatever. CI's entire population. */
  readonly absent: number;

  /** `C(eligible, 2)` — every pair the pass could have measured. */
  readonly candidatePairs: number;
  /** Cleared the overlap floor and produced a finite coefficient. */
  readonly computedPairs: number;
  /** In some node's top-N **and** significant. The rows served above. */
  readonly retainedPairs: number;

  /** Too little overlap for the statistic to be defined. */
  readonly tooFewOverlappingSamples: number;
  /** One leg with no variance — a halt, a stub, a repeated close. */
  readonly zeroVariance: number;
  /** Measured, finite, and not distinguishable from zero. The **cut**. */
  readonly belowSignificance: number;

  /** The `N` of *the strongest N per node* this pass applied. */
  readonly retainedN: number;
  /** The window, in trading sessions. */
  readonly lookbackSessions: number;
  /** The return grid's stride, in minutes. */
  readonly spanMinutes: number;
  /**
   * The tape both legs were read on.
   *
   * On this wire because invariant 6 is *market-data provenance is displayed,
   * never implied*, and a correlation's two legs being the same tape is ADR
   * 0045's whole decision: the quantity is scale-free **within one tape** and
   * is refused across two.
   */
  readonly feed: MarketFeed;
}

/** The body `GET /market-data/relationships` serves. See the module docblock. */
export interface RelationshipsResponse {
  /**
   * The retained pairs of the newest pass at or before the instant asked
   * about, in the order the store returned them (by `low` then `high`).
   *
   * **Always present, empty where there is nothing** — `coverage`'s own rule
   * on `/securities`: an absent array would give *nothing was retained* a
   * second spelling, and the whole point of the envelope is that absence has
   * exactly one.
   */
  readonly correlations: readonly CorrelationPayload[];

  /**
   * The pass that produced them, or **absent** where no pass has ever run.
   *
   * See the module docblock: this field's presence is the only thing that tells
   * *we have never measured* from *we measured and kept nothing*.
   */
  readonly pass?: RelationshipsPassPayload;
}

/** Is `value` a finite number? */
function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Is `value` a count — a non-negative integer? */
function isCount(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 0;
}

/**
 * Is this the body this route promises?
 *
 * Beside the shape it checks, for the reason `isSecuritiesResponse` and
 * `isMarketDataResponse` are: a validator written at the call site is a second
 * definition of the same judgement and it is the copy that disagrees first.
 *
 * ## What it refuses, and the one thing it deliberately does not
 *
 * Unknown extra fields are accepted — a newer server may grow a key, which is
 * the envelope's own argument. What is refused is a missing `correlations`, a
 * non-array in it, a row with a non-finite `r` or a non-count `n`, a `pass`
 * that is present and malformed, and a non-object, the last being the string
 * body a static host returns.
 *
 * **`r` is bounded to `[-1, 1]` here** rather than only in the database, and
 * that is not ceremony: a correlation outside that range is not a weak claim,
 * it is arithmetic that did not happen — and the surface downstream spends the
 * figure on a drawn weight, where a 4.2 would silently become the strongest
 * edge in the market.
 *
 * **It does NOT check that the populations nest.** `0018`'s `check`
 * constraints enforce that in the one place it can be enforced for every
 * writer, and a second, weaker copy here would reject a body this product
 * cannot produce while telling a reader nothing it can act on. What a client
 * must not do is **derive** one figure from another; that is a rule about
 * reading the body, not about its shape.
 */
export function isRelationshipsResponse(
  value: unknown,
): value is RelationshipsResponse {
  if (typeof value !== "object" || value === null) return false;

  const { correlations, pass } = value as {
    correlations?: unknown;
    pass?: unknown;
  };

  if (!Array.isArray(correlations)) return false;
  if (!correlations.every(isCorrelationPayload)) return false;

  // Absent is a valid body and the whole contract's first state. `undefined`
  // rather than `"pass" in value`, so a key explicitly set to `undefined` by a
  // client-side construction reads the same as an omitted one.
  if (pass === undefined) return true;

  return isRelationshipsPass(pass);
}

/** One row's own shape. See {@link isRelationshipsResponse}. */
function isCorrelationPayload(value: unknown): value is CorrelationPayload {
  if (typeof value !== "object" || value === null) return false;

  const { low, high, r, n } = value as {
    low?: unknown;
    high?: unknown;
    r?: unknown;
    n?: unknown;
  };

  return (
    typeof low === "string" &&
    low !== "" &&
    typeof high === "string" &&
    high !== "" &&
    isFiniteNumber(r) &&
    r >= -1 &&
    r <= 1 &&
    isCount(n)
  );
}

/** The pass row's own shape. See {@link isRelationshipsResponse}. */
function isRelationshipsPass(
  value: unknown,
): value is RelationshipsPassPayload {
  if (typeof value !== "object" || value === null) return false;

  const pass = value as Record<string, unknown>;
  const { observedAt, feed } = value as {
    observedAt?: unknown;
    feed?: unknown;
  };

  if (typeof observedAt !== "string") return false;

  // **This list can go stale, and the `satisfies` below does not stop it.**
  // `as const satisfies readonly (keyof RelationshipsPassPayload)[]` checks
  // only that every NAMED member is a real key — it is not an exhaustiveness
  // check, so a field added to `RelationshipsPassPayload` and forgotten here
  // compiles cleanly and this predicate silently stops checking it. What
  // actually catches that omission is `relationships-response.test.ts`'
  // "refuses a pass missing any one of its figures", which loops
  // `Object.keys(pass)` over a fixture typed as `RelationshipsPassPayload` —
  // a field present on the type and absent from a real fixture is a type
  // error there, which is the exhaustiveness this comment used to (wrongly)
  // attribute to the line below.
  const counts = [
    "trackedEquities",
    "eligibleEquities",
    "splitDiscontinuity",
    "absent",
    "candidatePairs",
    "computedPairs",
    "retainedPairs",
    "tooFewOverlappingSamples",
    "zeroVariance",
    "belowSignificance",
    "retainedN",
    "lookbackSessions",
    "spanMinutes",
  ] as const satisfies readonly (keyof RelationshipsPassPayload)[];

  if (!counts.every((name) => isCount(pass[name]))) return false;

  return (
    typeof feed === "string" &&
    (MARKET_FEEDS as readonly string[]).includes(feed)
  );
}
