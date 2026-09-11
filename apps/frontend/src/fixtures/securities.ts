import type { ApiError, SecuritiesResponse } from "@marketpulse/shared";
import {
  isApiError,
  isSecuritiesResponse,
  toMarketDate,
} from "@marketpulse/shared";

import type { ApiResult } from "../api-client.js";
import type { SecuritiesView } from "../use-securities.js";
import { toSecuritiesView } from "../use-securities.js";

// The bodies `GET /securities` answers with, and the states this page collapses
// them to (Task 2.11.6).
//
// This is `bar-series.ts` beside it applied to the other request this
// application makes, and the reason it exists is the same one Task 2.10.6 gave:
// **a state nobody can produce is a state nobody has looked at.** Search has
// eight of them and exactly two are reachable from the running product — a
// query that matches and a query that does not. The rest need a universe that
// is still loading, one that could not be read, one that is empty, a security
// nobody tracks, a security with no stored bars, and a close from a session
// other than everybody else's. All six are constructed here.
//
// ## Why the whole 518 and not a handful of rows
//
// `SecuritySearch`'s stories could match against ten invented securities and
// most of them would look right. Two states would not be reachable at all:
//
//   - **The cap.** Ten is the matcher's limit and the interesting question is
//     what the surface says when the answer is bigger than it. Typing `a`
//     against the real universe matches **99**; there is no way to ask an
//     invented universe that question and get an answer that means anything.
//   - **The demotion.** An untracked security ranks below a tracked one inside
//     its tier, which with 99 matches pushes it from position 2 to position
//     **50** and off the shown slice — while the total still counts it. That is
//     correct, and on screen it is indistinguishable from the row having been
//     filtered out, which is the one thing this product forbids. It needs a
//     real, crowded tier to happen at all.
//
// So the body below is the real one. It is 190,736 bytes and that is the point
// rather than an accident: it is what a browser is handed (20,072 after
// compression), and a story that matches against it is matching against the
// product.
//
// ## How it was recorded, so it can be re-recorded rather than cited
//
// A backend built with `pnpm build` and started on the local store (`pnpm db`
// up, migrated, `pnpm universe` loaded), then, from this directory:
//
// ```
// curl -s http://127.0.0.1:3000/securities > securities/full.json
// ```
//
// The 503 is the same request against a backend pointed at a port nothing
// listens on — `DATABASE_PORT=59999 node dist/index.js` — which is the
// reproduction `CLAUDE.md` records for the connection-timeout message, and the
// only failure in this system that is **retryable** by contract.
//
// Recorded 2026-09-11: 518 securities, 518 coverage records, 518 closes, every
// one of them `active`, every close from the `2026-09-04` session.
//
// ## The four derived bodies, and why deriving is honest here
//
// Everything else is `full.json` with **one field changed**, each documented
// beside the derivation. That is `bar-series.ts`'s own exception rather than a
// departure from it: a correct server cannot produce three of these from the
// store as it stands, and the fourth needs the store mutated under it.
//
// **The untracked derivation was checked against a recording rather than
// trusted.** `AAPL` was set to `untracked` in the local store, the route was
// recorded again, and the recorded body and the derived one are identical:
//
// ```
// docker exec marketpulse-postgres-1 psql -U marketpulse -d marketpulse \
//   -c "update securities set status='untracked' where symbol='AAPL';"
// curl -s http://127.0.0.1:3000/securities > /tmp/recorded-untracked.json
// docker exec marketpulse-postgres-1 psql -U marketpulse -d marketpulse \
//   -c "update securities set status='active' where symbol='AAPL';"
// ```
//
// The restore is not optional, for the reason `bar-series.ts` gives: an
// untracked row is invisible to every reader that filters on `status`, so
// leaving one behind is a local store quietly missing a security. `pnpm
// universe` converges on the file and would also undo it.
//
// ## What is asserted at import
//
// Every body here is narrowed through the **real** `isSecuritiesResponse` as
// this module loads, so a derivation that stops being this contract throws
// where it is imported rather than rendering as a state nobody asked for.
//
// ## Why this file is not in `src/market/`
//
// Same fence as `bar-series.ts`: nothing outside `src/market/` may import
// anything under it except its `index.ts`, so a fixture module inside the
// module would be unreachable from a story. These sit beside the test
// scaffolding instead. **And they must never reach the shipped bundle** — a
// recorded market body imported by a component ships to every visitor. The
// re-measure is in `CLAUDE.md`: build, then grep `dist/` for a fixture value
// and find nothing.

import FULL from "./securities/full.json" with { type: "json" };
import UNAVAILABLE from "./securities/unavailable.json" with { type: "json" };

/**
 * The symbols the derivations below act on, named once.
 *
 * They are real securities and each was chosen because it sits in the same
 * matched tier as the others — typing `ad` returns all three plus `ADP`,
 * `ADSK` and `AMD` — so one query puts the three gap rows on screen beside
 * three ordinary ones. A gap row is only judgeable next to a row that has
 * nothing wrong with it.
 */
export const FIXTURE_SUBJECTS = {
  /** Demoted past the cap when it is untracked: match 2 of 99 becomes match 50. */
  untracked: "AAPL",
  /** Loses its coverage record: in the universe, nothing stored behind it. */
  withoutBars: "ADBE",
  /** Loses its close: a security we hold no daily bar for. */
  withoutClose: "ADI",
  /** Keeps its close and moves it a session back, ending the uniformity. */
  behindSession: "ADM",
} as const;

/** The session every close in the recorded body carries. */
export const FIXTURE_SESSION = "2026-09-04";

/** The session {@link FIXTURE_SUBJECTS.behindSession}'s close is moved to. */
export const FIXTURE_EARLIER_SESSION = "2026-08-28";

/**
 * The correlation id the failures render.
 *
 * Fixed and obviously synthetic rather than the one the recording carried: a
 * story that showed the recorded id would put a different string on screen
 * every time the body is re-recorded, and a screenshot of it would date.
 */
export const FIXTURE_REQUEST_ID = "7f3b1c42-0c1a-4f77-9a55-1b6d2e0f8c31";

/** The recorded body, narrowed through the real predicate. */
function recorded(): SecuritiesResponse {
  if (!isSecuritiesResponse(FULL)) {
    throw new TypeError(
      "securities/full.json is not a securities response. It is a recorded " +
        "body; if it has stopped matching the contract, re-record it rather " +
        "than editing it.",
    );
  }

  return FULL;
}

/** The recorded 503, narrowed the same way. */
function recordedError(): ApiError {
  if (!isApiError(UNAVAILABLE)) {
    throw new TypeError(
      "securities/unavailable.json is not an API error. Re-record it.",
    );
  }

  return UNAVAILABLE;
}

/**
 * `AAPL` marked `untracked`, and nothing else touched.
 *
 * Verified against a recording of the same state — see the header. The row is
 * still in the list, still carries its close, and still matches its own symbol;
 * what changes is where it ranks among equals.
 */
function untracked(body: SecuritiesResponse): SecuritiesResponse {
  return {
    ...body,
    securities: body.securities.map((security) =>
      security.symbol === FIXTURE_SUBJECTS.untracked
        ? { ...security, status: "untracked" as const }
        : security,
    ),
  };
}

/**
 * The three ways a row can be true and look broken, in one body.
 *
 * Each is a deletion or a single field, and each is a state a real deployment
 * reaches the day a backfill is interrupted:
 *
 *   - a security with **no coverage record** holds no bars at all;
 *   - a security with **no close** has no stored daily bar;
 *   - a security whose close is from an **earlier session** than everybody
 *     else's is what a partially caught-up store looks like, and it is the
 *     condition that ends the uniformity the whole surface's footer depends on.
 *
 * They are one fixture rather than three because the bug they exist to catch is
 * a *comparison* — a footer naming one session while a row's close came from
 * another — and a body containing only one of them cannot show it.
 */
function withGaps(body: SecuritiesResponse): SecuritiesResponse {
  return {
    ...body,
    coverage: body.coverage.filter(
      (record) => record.symbol !== FIXTURE_SUBJECTS.withoutBars,
    ),
    lastCloses: body.lastCloses
      .filter((record) => record.symbol !== FIXTURE_SUBJECTS.withoutClose)
      .map((record) =>
        record.symbol === FIXTURE_SUBJECTS.behindSession
          ? { ...record, session: toMarketDate(FIXTURE_EARLIER_SESSION) }
          : record,
      ),
  };
}

/**
 * Every array emptied and the provenance dropped.
 *
 * Both halves are the contract rather than a convenience: the envelope's
 * `provenance` is **absent** when there is nothing to attribute, so a body
 * carrying three empty arrays and a provenance claim is one no server sends.
 * This is what a migrated database nobody has loaded answers with, and it is
 * reachable in production by a deploy whose migration step ran and whose
 * universe step did not.
 */
function emptied(body: SecuritiesResponse): SecuritiesResponse {
  // The key is *removed* rather than set to `undefined`: with
  // `exactOptionalPropertyTypes` those are different types, and on the wire the
  // difference is a body no server sends.
  const rest = { ...body };
  delete (rest as { provenance?: unknown }).provenance;
  return { ...rest, securities: [], coverage: [], lastCloses: [] };
}

/**
 * What this page can be handed, by name.
 *
 * The four bodies plus the three answers that are **not** bodies at all.
 * `unreachable` and `unreadable-body` are properties of a transport rather than
 * of a payload — nothing arrived, or something arrived that is not this API —
 * so no recording can carry one, which is the same distinction `bar-series.ts`
 * draws.
 */
export const SECURITIES_FIXTURES = {
  /** The real universe: 518 securities, all active, one session. */
  full: "the recorded universe — 518 securities, every one of them tracked",
  /** The same, with one security untracked. */
  untracked:
    "the same universe with AAPL untracked, which demotes it past the cap",
  /** The same, with one gap of each kind. */
  gaps: "a partially backfilled universe: a security with no bars, one with no close, one a session behind",
  /** Migrated and never loaded. */
  empty: "a service that answered correctly and holds no securities",
  /** The store unreachable: the one retryable failure. */
  unavailable: "the store unreachable — a 503 this client may retry",
  /** Something else is answering at this address. */
  notThisService: "a 200 that is not this API — waiting will not help",
  /** Nothing answered at all. */
  nothingAnswered: "no response: refused, unresolved, or the deadline expiring",
} as const satisfies Record<string, string>;

/** The name of one fixture. */
export type SecuritiesFixtureName = keyof typeof SECURITIES_FIXTURES;

/** Every name, for a grid or a `describe.each`. */
export const SECURITIES_FIXTURE_NAMES = Object.keys(
  SECURITIES_FIXTURES,
) as readonly SecuritiesFixtureName[];

/**
 * One fixture as the contract, for a caller that knows it is holding a body.
 *
 * Throws for the three that are not bodies, rather than inventing one — which
 * is the whole reason the transport outcomes are named in the same union: a
 * caller that wants "a universe" and asks for `nothingAnswered` has made a
 * mistake that should be loud.
 */
export function securitiesFixtureBody(
  name: SecuritiesFixtureName,
): SecuritiesResponse {
  switch (name) {
    case "full":
      return recorded();
    case "untracked":
      return untracked(recorded());
    case "gaps":
      return withGaps(recorded());
    case "empty":
      return emptied(recorded());
    case "unavailable":
    case "notThisService":
    case "nothingAnswered":
      throw new TypeError(
        `The ${name} fixture is a transport outcome rather than a body. ` +
          `Ask for its view instead.`,
      );
  }
}

/** One fixture as the client's own result type. */
export function securitiesFixtureResult(
  name: SecuritiesFixtureName,
): ApiResult<SecuritiesResponse> {
  switch (name) {
    case "full":
    case "untracked":
    case "gaps":
    case "empty":
      return {
        outcome: "ok",
        status: 200,
        data: securitiesFixtureBody(name),
        requestId: null,
      };

    case "unavailable":
      return {
        outcome: "api-error",
        status: 503,
        error: recordedError(),
        requestId: FIXTURE_REQUEST_ID,
      };

    case "notThisService":
      return {
        outcome: "unreadable-body",
        status: 200,
        requestId: FIXTURE_REQUEST_ID,
      };

    case "nothingAnswered":
      return {
        outcome: "unreachable",
        cause: new TypeError("Failed to fetch"),
      };
  }
}

/** The state this page is in while it is still asking. */
export const LOADING_UNIVERSE: SecuritiesView = { state: "loading" };

/**
 * The state one fixture collapses to, **through the real transition**.
 *
 * This is the shape a story wants, and the rule it exists to enforce is Task
 * 2.10.8's: a story that sets `state: "failed"` by hand proves a component can
 * render a string, and a story that drives `toSecuritiesView` over a recorded
 * body proves the state is reachable and that the copy is what somebody
 * actually sees. The only thing assembled here is the result wrapper, whose
 * shape is decided by the status that was recorded with the body.
 */
export function securitiesFixtureView(
  name: SecuritiesFixtureName,
): SecuritiesView {
  return toSecuritiesView(LOADING_UNIVERSE, securitiesFixtureResult(name));
}
