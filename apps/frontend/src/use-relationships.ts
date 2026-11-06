import { useEffect, useState } from "react";

import type {
  CorrelationPayload,
  RelationshipsPassPayload,
  RelationshipsResponse,
  TopologyCorrelation,
} from "@marketpulse/shared";
import { isTicker } from "@marketpulse/shared";

import { getRelationships } from "./api-client.js";
import type { ApiResult } from "./api-client.js";

// Which securities move together, fetched once (Task 6.5.2).
//
// The fourth hook, and it borrows `use-market-feed.ts`' shape rather than
// `use-securities.ts`' : state and effect here, rendering nowhere, the
// client's seven outcomes collapsed onto a small named vocabulary with a
// reason per branch, and **no retry** — because this is a measurement that
// changes once a night, so there is nothing a second request a moment later
// could learn.
//
// ## It is a SECOND request beside the universe, and that is the whole shape
//
// `MarketTopology` already fetches `GET /securities`, and the obvious
// alternative — hanging these rows off that response — was rejected where the
// wire contract is argued (`relationships-response.ts`): the universe is the
// one request every screen in this product already pays, and one region's
// 1,860 measured pairs have no business inside it.
//
// The consequence is the state this task exists to get right: **the universe
// can arrive without the measurement, and the drawn graph must not care.**
// A failure or a delay here leaves the nodes and the membership edges exactly
// as they were, because the graph is built from the universe and the
// correlation set is merged into it — `withCorrelationEdges(graph, [])` is
// `graph`. That is this product's own degrade-locally rule
// (`PRODUCT_SPEC.md` §36) arriving inside one region for the first time: until
// now this region had exactly one failure state, *the universe request
// itself failed*.
//
// ## Fetched once, not polled
//
// `useBackendHealth` polls because a health state changing *is* the
// information it carries. This is a nightly pass: the newest generation cannot
// change while a tab is open except at one instant a night, and Story 6.7 owns
// live updates to this picture. A poll would be standing traffic per open tab
// to re-learn a figure that has not moved. A page reload is the refresh.

/**
 * What this page currently knows about the market's measured relationships.
 *
 * **Four states as a discriminated union**, `SecuritiesView`'s precedent and
 * its stated reason — the impossible combinations must not be constructible —
 * and the division between the middle two is the one this union exists for.
 *
 * `never-measured` and `measured` are **not** one state with a count in it:
 * *no nightly pass has ever run here* and *a pass considered 122,760 pairs and
 * kept none of them* are different facts with different sentences, and a
 * reader of a graph with no edges on it is owed the right one. ADR 0029's
 * first rule, and the reason the wire omits `pass` rather than zeroing it.
 */
export type RelationshipsView =
  /** The request is in flight, and no request has settled yet. */
  | { readonly state: "loading" }
  /**
   * No nightly pass has ever run against this store.
   *
   * **CI's permanent state** — zero bars, no provider, no generation, for ever
   * — and every laptop's before the first `pnpm baselines`.
   */
  | { readonly state: "never-measured" }
  /**
   * A pass ran. `correlations` is what it retained, which may be **empty**.
   *
   * `pass` travels whole rather than reduced to the figures one sentence
   * happens to need: a surface stating its own population must state the
   * **producer's** figures, and `correlations.length` answers none of the
   * questions a reader of a sparse graph has.
   */
  | {
      readonly state: "measured";
      readonly correlations: readonly TopologyCorrelation[];
      readonly pass: RelationshipsPassPayload;
    }
  /**
   * The measurement could not be read.
   *
   * One member for every producible cause, which is the collapse
   * `SecuritiesFailure` makes and is narrower here for a reason that is not
   * narrower judgement: there is nothing to act on differently and **nothing
   * on screen to repair**. The graph is already drawn from the universe, so
   * this state costs a reader one sentence rather than a region — which is why
   * there is no `retryable`, no `requestId` and no `Try again`. A reader is
   * not being asked to report anything; they are being told that one layer of
   * the picture is missing.
   */
  | { readonly state: "failed" };

/**
 * Collapse one of the client's seven outcomes onto the four states.
 *
 * **Exported for the fixture module and for no other reason**
 * (`toSecuritiesView`'s own rule): a story holding a state the application can
 * actually reach is worth more than one somebody typed. Nothing in
 * `src/components/` or `src/routes/` may call it — a component that transitions
 * its own state is a component that fetches.
 *
 * `aborted` maps to **no state at all**: a torn-down effect is not a fact about
 * the service, so it leaves the previous state where it was. The caller filters
 * it too; this branch exists so the union stays exhaustively handled and a new
 * outcome cannot be added silently.
 */
export function toRelationshipsView(
  previous: RelationshipsView,
  result: ApiResult<RelationshipsResponse>,
): RelationshipsView {
  switch (result.outcome) {
    case "ok": {
      const { pass } = result.data;

      // **An absent `pass` is the contract's own spelling of *never
      // measured***, and the only thing that distinguishes it from a pass that
      // kept nothing. The predicate has already refused a malformed one.
      if (pass === undefined) return { state: "never-measured" };

      return {
        state: "measured",
        correlations: toCorrelations(result.data.correlations),
        pass,
      };
    }

    // Everything that is not an answer is one state. The case worth knowing
    // about is `unreadable-body`: a coefficient outside `[-1, 1]`, a `NaN`, or
    // a `null` that reached the wire as a `0` all arrive here, because the
    // shared predicate refuses the body rather than letting an invented figure
    // reach a drawn edge.
    case "unreadable-body":
    case "api-error":
    case "http-error":
    case "timeout":
    case "unreachable":
      return { state: "failed" };

    case "aborted":
      return previous;
  }
}

/**
 * The wire's rows, as the graph model takes them.
 *
 * **A malformed symbol is DROPPED, never thrown past** — `isTicker` rather
 * than `toTicker`, which is `anomaly-treatments.ts`' rule and its recorded
 * reason: this runs inside a `useEffect`'s own settle, and `CLAUDE.md` records
 * that a throw inside a React effect is a render error nothing above `App`
 * catches, so the whole page goes blank. A body this product's own route
 * produced cannot contain one; a single dropped edge is the honest degrade if
 * it ever does, and `withCorrelationEdges` would drop it one step later
 * anyway.
 *
 * Nothing else happens here. The orientation is **not** re-sorted, the
 * coefficient is not re-ranged and no pair is de-duplicated, because
 * `withCorrelationEdges` owns all three and a second copy of any of them is a
 * second home for a rule.
 */
function toCorrelations(
  rows: readonly CorrelationPayload[],
): readonly TopologyCorrelation[] {
  return rows.flatMap<TopologyCorrelation>((row) =>
    isTicker(row.low) && isTicker(row.high)
      ? [{ low: row.low, high: row.high, r: row.r }]
      : [],
  );
}

/**
 * Read the market's measured relationships, once, on mount.
 *
 * No `try`/`catch`, for the reason its absence is deliberate in all three
 * sibling hooks: `getRelationships` never throws in any branch, so a rejection
 * here would be a bug in the client rather than a service that is down — and
 * it is what keeps a failure out of `ErrorBoundary` entirely, which is why
 * *the rest of the page stays usable* is structural rather than something the
 * boundaries happen to allow.
 */
export function useRelationships(): RelationshipsView {
  const [view, setView] = useState<RelationshipsView>({ state: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    const read = async (): Promise<void> => {
      const result = await getRelationships({ signal: controller.signal });

      // The teardown case. Under `StrictMode` the development double-invoke
      // aborts the first mount's request immediately and it comes back
      // `aborted`, leaving the state alone — designed behaviour rather than
      // something to suppress.
      if (result.outcome === "aborted") return;

      setView((previous) => toRelationshipsView(previous, result));
    };

    void read();

    return () => {
      controller.abort();
    };
  }, []);

  return view;
}
