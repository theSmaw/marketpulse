import type {
  Bar,
  BarSeries,
  BarSeriesResponse,
  SecurityStatus,
  SeriesCoverage,
  TimeRange,
} from "@marketpulse/shared";
import { isRetryableApiErrorCode } from "@marketpulse/shared";

import type { ApiResult } from "../api-client.js";
import { toDomainSeries } from "./bar-series-payload.js";

// What this application knows about one bar series, as a state (Task 2.10.4).
//
// The third time Story 1.12's `BackendStatus` lesson is applied, and the first
// time it has a state to teach that a static list could not: **loaded and
// partial, which is not failed.** `MARKET-DATA-API.md` §6 makes a partial
// answer a 200 — we asked for five sessions and we hold four and a half — and a
// union with no member for it forces every consumer to choose between calling
// that a failure and rendering it as though it were complete. Both are wrong,
// and the second is wrong invisibly.
//
// ## The shape rules this file is holding, from `FRONTEND-STATE.md` §1
//
//   1. **State lives in the module, not in a component.** A component receives
//      the union whole and renders the member it is given. That is
//      `UniverseTable`'s shape and deliberately the opposite of
//      `BackendIndicator`'s four separate props: a union exists so the
//      impossible combinations cannot be built, and spreading it back into
//      props hands the renderer the boolean space it just removed.
//   2. **Every state is a member, never a boolean.** Consumers `switch`, and
//      `tsc` refuses one that forgets a member — which is what makes adding
//      `partial` a compile error at every call site rather than a silent
//      fall-through.
//   3. **The transition is a pure function, separate from any hook.** A
//      `(state, event) => state` is a reducer that has not been told it is one,
//      and it is the single thing that makes a later move to a store a
//      re-wiring rather than a rewrite. Task 2.10.5 wraps these in a hook and
//      adds nothing to them.
//   4. **The shape stays describable.** Plain serialisable data — no class
//      instances, no closures, no `Map`s, and no callbacks hung off a member.
//      Invariant 2 and Epic 11 want state a `WorkspaceCommand` can act on and
//      Epic 12 persists it; a union carrying a function is un-comparable,
//      un-serialisable and awkward to construct in a story or a test. **State
//      on the union, actions beside it** — `SecuritiesSource` is the precedent
//      and Task 2.10.5's hook returns the same pair.
//
// The `Date`s in a `BarSeries` are the one qualification to rule 4, and they
// are `JSON.parse`'s own asymmetry rather than this union's: an instant
// survives `JSON.stringify` and comes back a string. Whatever persists this in
// Epic 12 goes back through `bar-series-payload.ts`, which is the module that
// already knows how to turn wire instants into domain ones.

/**
 * A series known to have bars in it, and therefore known to cover something.
 *
 * **This is what makes acceptance criterion 2 a compile error rather than a
 * convention.** `BarSeries.bars` may legitimately be empty — an empty series is
 * an answer — so a `loaded` member carrying a plain `BarSeries` would let
 * "loaded with nothing in it" be constructed, which is the exact state the
 * union exists to forbid. An intersection narrows the two fields in place
 * rather than re-declaring the type, so nothing here is a second copy of
 * `BarSeries` that can drift from it.
 *
 * `covered` is narrowed alongside `bars` because the two are one fact:
 * `toBarSeries` refuses a series with bars and a null covered range, and
 * refuses an empty one with a covered range. Carrying that biconditional in the
 * type is what lets Story 2.14's *"we have data through 15:42"* be written
 * without a null check the reader cannot see the reason for.
 */
export type PopulatedBarSeries = BarSeries & {
  readonly bars: readonly [Bar, ...Bar[]];
  readonly coverage: SeriesCoverage & { readonly covered: TimeRange };
};

/**
 * Is this series one with bars in it?
 *
 * A predicate rather than a rebuild, because the alternative is spreading a
 * `BarSeries` into a new object to attach the narrower types — and a spread
 * that satisfies the brand would be a second way to obtain a `BarSeries`,
 * which is precisely what the brand exists to prevent. Narrowing in place
 * changes nothing at runtime and claims nothing that is not already true.
 *
 * The two conditions are checked together because `toBarSeries` has already
 * made them equivalent; testing one and asserting the other would be this
 * module holding an opinion about a check it did not perform.
 */
function isPopulated(series: BarSeries): series is PopulatedBarSeries {
  return series.bars.length > 0 && series.coverage.covered !== null;
}

/**
 * Why a series could not be read.
 *
 * **Two members and not seven**, which is the collapse `toBackendHealth` and
 * `toSecuritiesView` both make and for the same reason: the client
 * distinguishes seven transport outcomes because they are genuinely different
 * events at the transport, and a person looking at an empty panel can act on
 * exactly two facts.
 *
 * - `unreachable` — nothing arrived. A refused connection, a name that did not
 *   resolve, the browser-side CORS rejection, or the deadline expiring.
 * - `answered-badly` — something arrived and it was not a series we could use.
 *
 * The second one is **wider here than it is on the universe page**, and the
 * difference is worth stating because it is the one thing Task 2.10.3 handed
 * this file. It covers three diagnoses: a 500 from the service, a proxy's own
 * 502, and — new — **our own server answering with a body that is this exact
 * contract and whose numbers disagree with each other**, which is what
 * `toDomainSeries` throws on. Those are different things to *fix* and the same
 * thing to *do*: the panel says the series could not be read and offers the
 * `requestId`, because there is nothing else a reader of this screen can do
 * about any of them. Where the distinction is actionable it is preserved — the
 * thrown error carries its own sentence naming which coherence check failed,
 * and a coherence failure is the one case where the id is certain to be there,
 * since the response was a 200 we read the header off.
 */
export const BAR_SERIES_FAILURES = ["unreachable", "answered-badly"] as const;
export type BarSeriesFailure = (typeof BAR_SERIES_FAILURES)[number];

/**
 * What this application currently knows about one bar series.
 *
 * Six members. Three of them are **answers** — `loaded`, `partial` and `empty`
 * are all 200s and none of them is a failure — one is a **refusal**, which is a
 * well-formed answer about the request rather than about the market, and two
 * states describe the two things that can go wrong: nothing arrived, or what
 * arrived could not be used.
 *
 * ## `stale`, and why it is a flag on three members rather than a seventh
 *
 * Task 2.10.5 shipped the *behaviour* — a held series for the same request
 * paints in the first commit while the fresh answer is in flight — and nothing
 * on the union could say so, which made a cached `loaded` and a
 * freshly-fetched `loaded` the same value. Task 2.10.8's amendment listed three
 * homes for the label and this is the middle one, taken for three reasons:
 *
 *  1. **It is one mark on screen, not a different shape of screen.** That is
 *     exactly `retrying`'s precedent in `FRONTEND-STATE.md` §4 — a flag, not a
 *     state — and the test it states is whether a consumer would render
 *     something structurally different. A stale answer renders the same panel
 *     with a line above it.
 *  2. **A seventh member would land in every consumer's `switch` forever**, and
 *     each one would have to re-derive which answer it is stale *of*. The
 *     member would have to carry the whole answer to be renderable at all,
 *     which is the answer members with a boolean, spelled longer.
 *  3. **A field on `BarSeriesSource` cannot be expressed by
 *     `barSeriesFixtureView`**, which returns a `BarSeriesView` and is the only
 *     sanctioned way to obtain one for a story. A story would be back to
 *     hand-building state, which is the thing the fixture set exists to stop.
 *     Here a stale story is `{ ...barSeriesFixtureView("partial"), stale: true }`.
 *
 * **Only an answer is ever stale.** The cache holds `loaded`, `partial` and
 * `empty` and never a `failed` or a `refused` (`series-cache.ts`), so there is
 * no stale-failure case and no flag on the other three members to get wrong.
 * And a *different* request never shows the previous one's series — a key
 * change resets the view — so the thing marked stale is always the same symbol,
 * timeframe and window as the answer coming to replace it.
 *
 * `toBarSeriesView` sets it `false` on every answer it builds, because an
 * answer that has just arrived is by definition not one. The only thing that
 * sets it `true` is {@link toStaleBarSeriesView}, at the two cache reads.
 *
 * Reversal trigger — a condition, not a story number: **the first consumer that
 * needs to render a stale answer differently in shape rather than in mark** —
 * a chart that draws held bars in a second style, say. At that point the
 * difference has stopped being one mark and the seventh member has earned its
 * cost.
 */
export type BarSeriesView =
  /** A request is in flight and no request has settled yet. */
  | { readonly state: "loading" }
  /**
   * Bars, covering exactly the window that was asked for.
   *
   * `covered` equal to `requested` is not a formality: the server clamps the
   * covered range to the requested one, so equality is what *"we hold all of
   * it"* looks like on the wire and there is no other spelling of it.
   */
  | {
      readonly state: "loaded";
      readonly series: PopulatedBarSeries;
      readonly securityStatus: SecurityStatus;
      readonly stale: boolean;
    }
  /**
   * Bars, over less than the window that was asked for. **An answer, not a
   * failure.**
   *
   * The member Story 2.4's static list could not have taught anyone, and the
   * normal case rather than the exceptional one: the store is backfilled
   * nightly and the free plan withholds the most recent ~15 minutes, so a
   * window reaching towards now is routinely covered up to some point and no
   * further.
   *
   * It carries **both** windows, in `series.coverage`, and a component needs
   * both. *"We have data through 15:42"* is only writable if the state kept
   * `covered.end`; *"you asked for five sessions"* is only writable if it kept
   * `requested`. A state that discarded either would force the panel to invent
   * a sentence or to say nothing.
   */
  | {
      readonly state: "partial";
      readonly series: PopulatedBarSeries;
      readonly securityStatus: SecurityStatus;
      readonly stale: boolean;
    }
  /**
   * We asked, and we hold nothing at all for that window. **Also a 200, also an
   * answer** (`MARKET-DATA-API.md` §6).
   *
   * Distinct from `partial` with no bars, and the distinction is the
   * contract's rather than this union's invention: an empty series is
   * `bars: []` with `covered: null`, a partial one has a `covered` window
   * narrower than `requested`, and a series with no bars covers nothing at all.
   * So *"partial with zero bars"* cannot occur, and there is no third reading.
   *
   * It keeps the series, which still carries the requested window, the symbol,
   * the timeframe and the provenance — everything a panel needs to say *what*
   * was asked for and got nothing.
   */
  | {
      readonly state: "empty";
      readonly series: BarSeries;
      readonly securityStatus: SecurityStatus;
      readonly stale: boolean;
    }
  /**
   * The request itself was not answerable, and the server said why in a
   * sentence written for a person.
   *
   * **Neither a failure the user caused nor a fault of the server**, which is
   * why it is not under the failure members. The 10,000-bar cap is the case
   * that shows why it needs a member of its own: the server refuses rather than
   * downsampling, because a chart drawn from fewer bars than were asked for is
   * wrong and looks right — and its 400 **names the number**. A state that
   * discarded the message would leave the panel saying *"too much data"*
   * instead of *"that window is 98,280 bars and one response carries at most
   * 10,000"*.
   *
   * The message is shown as it arrived. It is the one field on this contract
   * written to be shown to a person (`api-error.ts`), the numbers in it are the
   * server's own arithmetic, and re-writing it here would be this client
   * inventing a sentence about a calculation it did not do.
   *
   * **No `retryable` flag, deliberately.** `FRONTEND-STATE.md` §4 puts that
   * flag on the failure members only, and this member is upstream of it: a
   * refusal is a well-formed answer about the request, so waiting never helps
   * and saying so would imply it might otherwise. The collapse therefore tests
   * for a refusal **before** it reaches the retryable branch.
   *
   * **And no `requestId`.** The rule `api-client.ts` states is that the id
   * appears only beside a failure the user is already being told about; a
   * refusal is not a failure, and an id under *"ask for a narrower window"* is
   * a support reference for a thing that is working correctly.
   */
  | { readonly state: "refused"; readonly message: string }
  /**
   * The series could not be read. See {@link BarSeriesFailure} for what the two
   * members mean and {@link toBarSeriesView} for how seven outcomes reach them.
   */
  | {
      readonly state: "failed";
      readonly failure: BarSeriesFailure;

      /**
       * The whole correlation id where the response carried one, `null`
       * otherwise. `api-client.ts` owns the rule: the whole id, never a prefix,
       * only ever as a labelled reference beside a failure the user is already
       * being told about.
       */
      readonly requestId: string | null;

      /**
       * Whether asking again is worth offering — `FRONTEND-STATE.md` §4's flag,
       * spelled exactly as `SecuritiesView` spells it.
       *
       * The sameness is the point rather than a convenience: two pages
       * disagreeing about what a 503 means is the outcome that decision exists
       * to prevent. Derived from the error's `code` through
       * `isRetryableApiErrorCode` in `packages/shared`, never from the status
       * number — `code` is the closed union a client is meant to branch on.
       */
      readonly retryable: boolean;

      /**
       * Whether a retry this user asked for is in flight right now.
       *
       * Deliberately **not** a return to `loading`: that would take the
       * failure's own sentence off the screen while we find out whether it is
       * still true and put it back a moment later, which reads as the thing
       * breaking twice. The failure stays and the control says it is working.
       */
      readonly retrying: boolean;
    };

/**
 * Collapse one of the client's seven transport outcomes onto the six states.
 *
 * A pure function of the previous state and one result, with a comment per
 * branch saying **why** two outcomes merge rather than restating which — the
 * shape `toBackendHealth` and `toSecuritiesView` both have, and the reason both
 * are still readable a year later.
 *
 * `aborted` is the one outcome that produces **no state**: it is not a fact
 * about the backend at all — it is a torn-down effect or a superseded request —
 * and rendering one as a failure is the specific defect Story 2.10's acceptance
 * criterion 3 exists to prevent. The caller filters it too; this branch exists
 * so the union stays exhaustively handled and a new outcome cannot be added
 * silently.
 */
export function toBarSeriesView(
  previous: BarSeriesView,
  result: ApiResult<BarSeriesResponse>,
): BarSeriesView {
  switch (result.outcome) {
    case "ok": {
      const securityStatus = result.data.securityStatus;

      // The coherence check Task 2.10.3 relocated here, and the only `try` in
      // this layer. It is narrow on purpose: everything inside it is one call,
      // and every throw it can catch is a `RangeError` or a `TypeError` from a
      // constructor in `packages/shared` reporting that a body this exact
      // contract admits does not add up.
      let series: BarSeries;
      try {
        series = toDomainSeries(result.data.series);
      } catch (error) {
        // **A failure and not `refused`** — nobody asked for anything wrong —
        // **and not `unreadable-body`'s reading** — this is our API, answering
        // badly, rather than a stranger at the address. The `requestId` is
        // certain to be here, because this was a 200 whose header we read.
        reportIncoherentSeries(error, result.requestId);
        return {
          state: "failed",
          failure: "answered-badly",
          requestId: result.requestId,
          retryable: false,
          retrying: false,
        };
      }

      // Checked before the coverage comparison, because an empty series has no
      // covered range to compare: `covered` is null exactly when there are no
      // bars, so this is the same question asked in the form the type can use.
      if (!isPopulated(series)) {
        return { state: "empty", series, securityStatus, stale: false };
      }

      // The one comparison that separates the two populated answers. Instants
      // by `getTime`, because two `Date`s are two objects and `===` on them
      // asks whether they are the same object rather than the same moment —
      // which would make every complete answer read as partial.
      const { requested, covered } = series.coverage;
      const complete =
        covered.start.getTime() === requested.start.getTime() &&
        covered.end.getTime() === requested.end.getTime();

      // `stale: false` on both, and it is not a formality: this is the only
      // place an answer is built from a response, and a response that has just
      // arrived is the definition of not stale.
      return complete
        ? { state: "loaded", series, securityStatus, stale: false }
        : { state: "partial", series, securityStatus, stale: false };
    }

    case "api-error":
      // **The refusals are tested first**, before anything asks whether waiting
      // would help. Every `BAD_REQUEST` from this endpoint is one of
      // `parseSeriesRequest`'s five refusals and every `NOT_FOUND` is a symbol
      // we do not track: all six are well-formed answers *about the request*,
      // each carrying a sentence written for a person, and none of them is a
      // fault anybody can wait out.
      //
      // The server distinguishes its five 400s internally and does not put the
      // reason on the wire — it logs it — so this client cannot subset them and
      // does not need to: the difference between them is a difference of
      // sentence, and the sentence is the field it is already showing.
      if (
        result.error.code === "BAD_REQUEST" ||
        result.error.code === "NOT_FOUND"
      ) {
        return { state: "refused", message: result.error.message };
      }

      // Everything else with a contract to read. The remaining codes are
      // `INTERNAL_ERROR` — this server failed and will fail again — and
      // `SERVICE_UNAVAILABLE`, the contract's own word for *temporary*, which
      // is the only code `isRetryableApiErrorCode` says yes to.
      return {
        state: "failed",
        failure: "answered-badly",
        requestId: result.requestId,
        retryable: isRetryableApiErrorCode(result.error.code),
        retrying: false,
      };

    case "unreadable-body":
      // A 200 whose body is not this contract at all: a wrong host, a static
      // server answering `index.html`, or a closed vocabulary this bundle
      // predates. Waiting does not change what is deployed at that address.
      return {
        state: "failed",
        failure: "answered-badly",
        requestId: result.requestId,
        retryable: false,
        retrying: false,
      };

    case "http-error":
      // **Not retryable on purpose**, and `FRONTEND-STATE.md` §4 calls this the
      // interesting row. A non-2xx whose body is not an `ApiError` is often an
      // ingress answering its own 503 while the replica behind it is not
      // serving — genuinely temporary — but it carries no `code`, and the fence
      // is that we promise on the code. An answer we cannot read the contract
      // from is one we cannot make a promise about, so this understates rather
      // than guesses.
      return {
        state: "failed",
        failure: "answered-badly",
        requestId: result.requestId,
        retryable: false,
        retrying: false,
      };

    case "timeout":
    case "unreachable":
      // Nothing arrived, so there is no response to have carried an id and no
      // code to read. Retryable on the client's own judgement rather than the
      // contract's: a refused connection, a name that did not resolve and an
      // expired deadline are all statements about this moment rather than about
      // the request.
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
 * Separate from {@link toBarSeriesView} because it is a transition on an
 * **action** rather than on a result, and pure for the same reason that one is.
 * A retry asked for from any other state leaves it alone: nothing offers one
 * from a state that is not a retryable failure, and a state that quietly
 * changed shape because a caller pressed something it should not have would be
 * a worse answer than doing nothing.
 */
export function toRetryingBarSeriesView(
  previous: BarSeriesView,
): BarSeriesView {
  return previous.state === "failed" && previous.retryable
    ? { ...previous, retrying: true }
    : previous;
}

/**
 * The pure transition into *this answer is one request old*.
 *
 * Applied at the two places `use-bar-series.ts` reads the cache — the first
 * commit of a mount, and the commit after a key change — and nowhere else. That
 * is what makes the flag mean what the mark on screen claims: `FRONTEND-STATE.md`
 * §2's rule is that **every read of the cache is accompanied by a request**, so
 * an entry can only ever be painted with a request already in flight behind it,
 * and the two facts are set in the same expression rather than in two places
 * that could drift.
 *
 * Anything that is not an answer is returned untouched rather than refused.
 * There is nothing to mark: a `loading` has nothing on screen to be one request
 * old, and the cache never holds a `refused` or a `failed`, so this branch is
 * unreachable from the call sites and exists so the function is total.
 */
export function toStaleBarSeriesView(view: BarSeriesView): BarSeriesView {
  switch (view.state) {
    case "loaded":
    case "partial":
    case "empty":
      return { ...view, stale: true };

    case "loading":
    case "refused":
    case "failed":
      return view;
  }
}

/**
 * Say, once, what was actually wrong with a series that did not add up.
 *
 * **Because the alternative is swallowing it.** The state above carries a
 * `requestId` and nothing else, deliberately — the constructors' messages name
 * checks, fields and instants, which is developer detail and is exactly what
 * `ErrorFallback` keeps a boolean rather than an error in order to make
 * unshowable. But a coherence failure is a bug in a server we wrote, and the
 * sentence naming *which* check failed is the entire difference between an
 * hour and a minute of finding it. Dropping it on the floor is how that bug
 * stays invisible.
 *
 * `console.error` for `report-error.ts`'s reason rather than through it: that
 * module wires React's root error options and is about *render* failures, and
 * this is not one. The reason the destination is the console is the same one it
 * gives — there is nowhere else to send it until something on the server is
 * listening, and nothing is. If a destination ever arrives, these are the two
 * call sites to change.
 */
function reportIncoherentSeries(
  error: unknown,
  requestId: string | null,
): void {
  console.error(
    "Incoherent bar series from GET /market-data/bars. The body matched the " +
      "contract's shape and its numbers disagree with each other, which is a " +
      "fault in this API rather than in whatever is answering at its address." +
      (requestId === null ? "" : ` Request ${requestId}.`),
    error,
  );
}
