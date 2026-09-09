import type {
  SecuritiesProvenance,
  SecuritiesResponse,
  Security,
  SecurityCoverage,
} from "@marketpulse/shared";
import { useEffect, useState } from "react";

import { getSecurities } from "./api-client.js";
import type { ApiResult } from "./api-client.js";

// The tracked universe, fetched once (Task 2.4.3).
//
// It sits beside `use-backend-health.ts` and borrows that hook's shape
// deliberately: state and effect here, rendering nowhere, and the collapse from
// the client's seven outcomes onto a small named vocabulary written out as one
// function with a reason per branch.
//
// ## There is no store here, and that is Story 2.10's decision rather than an
// omission
//
// PRODUCT_SPEC.md §25 says to avoid a heavyweight state library until
// complexity demonstrates the need, and **one static list is the weakest
// possible evidence on which to decide how this application holds domain
// state.** Taking the decision here would anchor it against a shape that is
// nothing like Epic 3's streaming bar series — a thing that arrives once and
// never changes, against a thing that changes many times a second. A hook is
// the shape that costs nothing to replace when there is something real to
// decide against.
//
// ## Fetched once, not polled, and the contrast with the health hook is the
// point
//
// `useBackendHealth` polls every 30 seconds because *a health state changes* —
// that is the whole information the indicator carries. The universe changes a
// handful of times a year, when somebody edits `apps/backend/src/universe.ts`
// and a deploy runs `pnpm universe`. A poll would be standing billable traffic
// against the Consumption plan's under-1,000-bytes-per-second idle condition,
// per open tab, to re-learn a fact that has not moved — and this payload is
// 17,299 bytes against `/health`'s 61, so it is not the cheap request the
// health poll is either. A page reload is the refresh.

/**
 * Why the universe could not be read.
 *
 * **Two members and not five, and the collapse is the same judgement
 * `toBackendHealth` makes.** The client distinguishes seven outcomes because
 * they are genuinely different events at the transport; a person looking at an
 * empty page can act on exactly two facts.
 *
 * - `unreachable` — nothing arrived. A refused connection, a name that did not
 *   resolve, the browser-side CORS rejection, or the deadline expiring. The
 *   thing to check is whether the service is up and whether this page is
 *   allowed to call it.
 * - `answered-badly` — something arrived and it was not a readable universe. A
 *   500 from the service itself, a proxy's own 502, or a 200 carrying
 *   `index.html` because `VITE_API_BASE_URL` points at a static host. The thing
 *   to check is what is answering at that address.
 *
 * `api-error` and `http-error` are both the second, for the reason
 * `BackendStatus` merges them: the client tells them apart only by whether the
 * body carried a quotable `requestId`, and that id travels on the state below
 * rather than needing a member of its own.
 */
export const SECURITIES_FAILURES = ["unreachable", "answered-badly"] as const;
export type SecuritiesFailure = (typeof SECURITIES_FAILURES)[number];

/**
 * What this page currently knows about the universe.
 *
 * **Four states as a discriminated union rather than three booleans**, which is
 * Story 1.12's `BackendStatus` precedent applied to a different question. Three
 * booleans have eight combinations of which five are nonsense — loading and
 * failed at once, loaded with no rows and no empty flag — and every consumer
 * has to re-derive which of the three it is looking at, in an order nothing
 * checks. A union has four members, the component renders the one it is given,
 * and `tsc` refuses a `switch` that forgets one.
 *
 * **The fourth is the one nobody plans for.** `empty` is not an error and not a
 * loading state: it is exactly what a migrated-but-unseeded database looks
 * like, and it is reachable in production today by a deploy whose migration
 * step ran and whose `pnpm universe` step did not. Folding it into `loaded`
 * would render a table with a header row and nothing under it, which reads as
 * broken; folding it into `failed` would blame the service for answering
 * correctly.
 *
 * `loaded` carries a **non-empty** tuple, so "loaded with zero rows" cannot be
 * constructed at all rather than being a case each consumer has to remember not
 * to hit.
 */
export type SecuritiesView =
  /** The request is in flight, and no request has settled yet. */
  | { readonly state: "loading" }
  /**
   * At least one security came back.
   *
   * `provenance` is `null` when the server declined to make one claim about the
   * whole list — which from Story 2.7 onward is the normal case for a populated
   * response, because Alpaca will fill the profile fields on different days
   * than the curated file filled the classification ones.
   */
  | {
      readonly state: "loaded";
      readonly securities: readonly [Security, ...Security[]];
      readonly provenance: SecuritiesProvenance | null;

      /**
       * How much market history the store holds, keyed by symbol.
       *
       * **A map rather than the array the wire sends**, built once here rather
       * than in the component, because the alternative is a linear scan per row
       * — 518 rows against 518 records is a quarter of a million comparisons to
       * render a list, on every re-render.
       *
       * A symbol **absent from this map holds no bars**, which is the wire
       * contract's own spelling carried through unchanged: `undefined` is the
       * honest answer and a zero would be an invented one. Empty is a real and
       * correct state — a migrated database nobody has backfilled — and it is
       * why this is not optional.
       */
      readonly coverage: ReadonlyMap<string, SecurityCoverage>;
    }
  /** The service answered correctly and holds nothing. */
  | { readonly state: "empty" }
  /**
   * The universe could not be read. `requestId` is the whole correlation id
   * where the response carried one and `null` otherwise — `api-client.ts` owns
   * the rule that it may only ever appear as a labelled reference beside a
   * failure the user is already being told about, and this is the first state
   * in the application that has one to offer.
   */
  | {
      readonly state: "failed";
      readonly failure: SecuritiesFailure;
      readonly requestId: string | null;
    };

/**
 * Collapse one of the client's seven outcomes onto the four states.
 *
 * `aborted` is the fifth case and maps to **no state at all**: a torn-down
 * effect is not a fact about the service, so it leaves `loading` where it was
 * rather than rendering a failure the user caused by navigating away. The
 * caller filters it too; this branch exists so the union stays exhaustively
 * handled and a new outcome cannot be added silently.
 */
function toSecuritiesView(
  previous: SecuritiesView,
  result: ApiResult<SecuritiesResponse>,
): SecuritiesView {
  switch (result.outcome) {
    case "ok": {
      // Destructured rather than tested with `.length`, because that is what
      // produces the non-empty tuple the `loaded` state is typed with —
      // `noUncheckedIndexedAccess` makes the head `Security | undefined`, and
      // the guard that narrows it *is* the empty check.
      const [first, ...rest] = result.data.securities;
      if (first === undefined) return { state: "empty" };

      return {
        state: "loaded",
        securities: [first, ...rest],
        provenance: result.data.provenance ?? null,
        coverage: new Map(
          result.data.coverage.map((record) => [record.symbol, record]),
        ),
      };
    }

    case "unreadable-body":
    case "api-error":
    case "http-error":
      return {
        state: "failed",
        failure: "answered-badly",
        requestId: result.requestId,
      };

    case "timeout":
    case "unreachable":
      // Nothing arrived, so there is no response to have carried an id.
      return { state: "failed", failure: "unreachable", requestId: null };

    case "aborted":
      return previous;
  }
}

/**
 * Read the tracked universe, once, on mount.
 *
 * No `try`/`catch` anywhere below, and its absence is deliberate for the reason
 * it is deliberate in `useBackendHealth`: `getSecurities` never throws in any
 * branch, so a rejection here would be a bug in the client rather than a
 * service that is down — and swallowing it is how that bug would stay
 * invisible. It is also what keeps an unreachable backend out of
 * `ErrorBoundary` entirely, which is why "the rest of the page stays usable" is
 * structural rather than something the boundaries happen to allow.
 */
export function useSecurities(): SecuritiesView {
  const [view, setView] = useState<SecuritiesView>({ state: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    const read = async (): Promise<void> => {
      const result = await getSecurities({ signal: controller.signal });

      // The teardown case, written nowhere. Under `StrictMode` the development
      // double-invoke aborts the first mount's request immediately, and it
      // comes back `aborted` and leaves the state alone — designed behaviour
      // rather than something to suppress.
      if (result.outcome === "aborted") return;

      setView((previous) => toSecuritiesView(previous, result));
    };

    void read();

    return () => {
      controller.abort();
    };
  }, []);

  return view;
}
