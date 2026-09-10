import type {
  SecuritiesProvenance,
  SecuritiesResponse,
  Security,
  SecurityCoverage,
  SecurityLastClose,
} from "@marketpulse/shared";
import { isRetryableApiErrorCode } from "@marketpulse/shared";
import { useCallback, useEffect, useRef, useState } from "react";

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
// 190,736 bytes against `/health`'s 61 (17,299 at the 101 securities, no
// coverage array and no closes this was first written against), so it is not
// the cheap request the health poll is either. A page reload is the refresh.
//
// **The figure moved on 2026-09-10 and the argument did not.** Task 2.9.10
// registered response compression, so what a browser actually pulls is
// **20,072 bytes**, not 190,736 — the number above is what an
// `Accept-Encoding: identity` client receives. Still ~330x `/health`'s 61
// bytes, per open tab, forever, to re-learn a fact that has not moved. Recorded
// rather than substituted, because a figure that has moved looks exactly like a
// figure that was mis-recorded.

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

      /**
       * The last stored close for each security that has one, keyed by symbol.
       *
       * **A map for `coverage`'s reason and no other**: 518 rows scanning a
       * 518-record array is a quarter of a million comparisons per render, and
       * this page now has two such arrays. A symbol **absent from this map has
       * no stored daily bar**, which is the wire contract's spelling carried
       * through unchanged — `undefined` is the honest answer and a zero would
       * be an invented price.
       *
       * The map holds the wire record as it arrived, prices and a session date.
       * Nothing here computes the change: that is arithmetic on two numbers,
       * done where the claim is made, which is `last-close.ts` beside the table
       * that renders it.
       */
      readonly lastCloses: ReadonlyMap<string, SecurityLastClose>;
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

      /**
       * Whether asking again is worth offering (Task 2.10.2).
       *
       * **A flag on this state rather than a fifth member**, which is
       * `FRONTEND-STATE.md` §4's decision and its reasoning is worth having
       * here: only one of the two instructions a failure carries is an action
       * on *this page*. "Wait and try again" is a button and a sentence;
       * "check what is answering at that address" is something an operator
       * does elsewhere, with the `requestId` above. The page's shape is the
       * same either way — a word, a sentence, and possibly a control — so a
       * fifth member would grow every consumer's `switch` for a difference of
       * one sentence and one button, and grow it again at the next code.
       *
       * Derived from the error's **`code`** and never from the status number:
       * `code` is the closed union a client is meant to branch on, and reading
       * the status line is reading where the contract did not put the answer.
       * The derivation itself is `isRetryableApiErrorCode` in
       * `packages/shared`, beside `API_ERROR_CODES`, because the meaning of a
       * code is part of the contract rather than this client's opinion.
       */
      readonly retryable: boolean;

      /**
       * Whether a retry this user asked for is in flight right now.
       *
       * **Also a flag rather than a state, and for a different reason.** A
       * fifth member would be a state whose whole content is the failed state
       * it replaces — the same word, the same sentence, the same reference —
       * and every consumer would have to carry both. What actually changes is
       * the control: it stops being pressable and says so.
       *
       * It is deliberately **not** a return to `loading`. The skeleton would
       * take the failure's own sentence off the screen while we find out
       * whether it is still true, and put it back a moment later — which reads
       * as the page breaking twice.
       */
      readonly retrying: boolean;
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
        lastCloses: new Map(
          result.data.lastCloses.map((record) => [record.symbol, record]),
        ),
      };
    }

    case "api-error":
      // The one branch that has a contract to read. Everything else below
      // decides retryability from the *absence* of one.
      return {
        state: "failed",
        failure: "answered-badly",
        requestId: result.requestId,
        retryable: isRetryableApiErrorCode(result.error.code),
        retrying: false,
      };

    case "unreadable-body":
      // Something is answering at this address and it is not this API. Waiting
      // does not change what is deployed there.
      return {
        state: "failed",
        failure: "answered-badly",
        requestId: result.requestId,
        retryable: false,
        retrying: false,
      };

    case "http-error":
      // **Not retryable on purpose, and this is the interesting one.** A
      // non-2xx whose body is not an `ApiError` is often an ingress answering
      // its own 503 while the replica behind it is not serving — genuinely
      // temporary. But it carries no `code`, and the fence is that we promise
      // on the code. An answer we cannot read the contract from is one we
      // cannot make a promise about, so this understates rather than guesses.
      //
      // There is a second, non-obvious path into this branch: `isApiError`
      // declines a `code` it has not been taught, so a server that later
      // learns a retryable code reads as non-retryable here until
      // `packages/shared` learns it too. A version skew degrading in the safe
      // direction — `FRONTEND-STATE.md` §4 records it because nothing checks
      // it.
      return {
        state: "failed",
        failure: "answered-badly",
        requestId: result.requestId,
        retryable: false,
        retrying: false,
      };

    case "timeout":
    case "unreachable":
      // Nothing arrived, so there is no response to have carried an id — and
      // nothing to read a code off either. These are retryable on the client's
      // own judgement rather than the contract's: a refused connection, a name
      // that did not resolve, or a deadline that expired are all statements
      // about this moment rather than about the request.
      return {
        state: "failed",
        failure: "unreachable",
        requestId: null,
        retryable: true,
        retrying: false,
      };

    case "aborted":
      return previous;
  }
}

/**
 * The pure transition into a retry that has just been asked for.
 *
 * Separate from {@link toSecuritiesView} because it is a transition on an
 * *action* rather than on a result, and pure for the same reason that one is:
 * a `(state, event) => state` is a reducer that has not been told it is one,
 * and it is the single thing that makes a later move to a store a re-wiring
 * rather than a rewrite (`FRONTEND-STATE.md` §1).
 *
 * A retry asked for from any other state leaves it alone. Nothing offers one
 * today, and a state that quietly changed shape because a caller pressed
 * something it should not have would be a worse answer than doing nothing.
 */
function toRetryingView(previous: SecuritiesView): SecuritiesView {
  return previous.state === "failed" && previous.retryable
    ? { ...previous, retrying: true }
    : previous;
}

/**
 * What a consumer of this hook gets: the state, and the one action there is.
 *
 * Two values rather than a callback hung off the state itself. A function on
 * the `failed` member would make the union un-comparable, un-serialisable and
 * awkward to write in a story or a test — and every one of those is a property
 * this repository actually uses: `UniverseTable`'s stories construct the union
 * as data, and Epic 11 wants application state describable.
 */
export interface SecuritiesSource {
  readonly view: SecuritiesView;

  /**
   * Ask again.
   *
   * Safe to call at any time, including twice in a row while a request is in
   * flight: the second call supersedes the first, and the superseded answer is
   * discarded rather than rendered. See the hook for the mechanism.
   */
  readonly retry: () => void;
}

/**
 * Read the tracked universe on mount, and again whenever somebody asks.
 *
 * No `try`/`catch` anywhere below, and its absence is deliberate for the reason
 * it is deliberate in `useBackendHealth`: `getSecurities` never throws in any
 * branch, so a rejection here would be a bug in the client rather than a
 * service that is down — and swallowing it is how that bug would stay
 * invisible. It is also what keeps an unreachable backend out of
 * `ErrorBoundary` entirely, which is why "the rest of the page stays usable" is
 * structural rather than something the boundaries happen to allow.
 *
 * ## The retry is a real request, and the reload it replaces was not
 *
 * Before Task 2.10.2 the only recovery from a failed universe was reloading the
 * document, which throws away every other thing on the screen to re-ask one
 * question — the opposite of PRODUCT_SPEC.md §36's incremental degradation.
 * This goes through `api-client.ts` like the first request did, so it inherits
 * the deadline, the composed abort signal, the correlation-id read and the
 * seven outcomes rather than reimplementing four of them.
 *
 * **There is deliberately no automatic retry and no backoff.** A poll is what a
 * status indicator does — `useBackendHealth` polls every 30 seconds because a
 * health state changing *is* the information it carries — and a page of content
 * is the other thing: a user reading a failure should not have it replaced
 * under them, and a page that re-asks on a timer makes a request per open tab
 * forever against a service that is already unwell. And it stays out of the
 * transport for the reason `apiRequest` states: a retry buried there would make
 * the five-second deadline a lie.
 *
 * ## How a superseded answer is kept off the screen
 *
 * One ref holds the controller for the request that *should* win. Starting a
 * request aborts the previous one and takes ownership of that ref; a result
 * arrives from a request that no longer owns it — because it had already
 * resolved when the abort landed, which no amount of aborting can prevent — and
 * is dropped. So the state can only ever move to the newest answer, and the
 * `aborted` outcome stays what `api-client.ts` says it is: not a fact about the
 * service, and never a failure to render.
 */
export function useSecurities(): SecuritiesSource {
  const [view, setView] = useState<SecuritiesView>({ state: "loading" });

  // `null` between requests, and set to the controller of the one whose answer
  // this hook will accept.
  const current = useRef<AbortController | null>(null);

  const request = useCallback(() => {
    // Supersession, first: whatever was in flight is no longer the answer this
    // hook is waiting for.
    current.current?.abort();

    const controller = new AbortController();
    current.current = controller;

    const read = async (): Promise<void> => {
      const result = await getSecurities({ signal: controller.signal });

      // The teardown case, written nowhere. Under `StrictMode` the development
      // double-invoke aborts the first mount's request immediately, and it
      // comes back `aborted` and leaves the state alone — designed behaviour
      // rather than something to suppress.
      if (result.outcome === "aborted") return;

      // The race the abort above cannot win: a request that had already
      // resolved before it was superseded. Identity rather than a boolean,
      // because the question is *is this still the request we are waiting for*
      // and nothing else answers it.
      if (current.current !== controller) return;

      setView((previous) => toSecuritiesView(previous, result));
    };

    void read();
  }, []);

  useEffect(() => {
    request();

    return () => {
      current.current?.abort();
      // Cleared as well as aborted, so a request that had already resolved
      // cannot set state after this component has gone.
      current.current = null;
    };
  }, [request]);

  const retry = useCallback(() => {
    setView(toRetryingView);
    request();
  }, [request]);

  return { view, retry };
}
