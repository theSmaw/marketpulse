import type { ApiError, BarSeriesResponse } from "@marketpulse/shared";
import { isApiError, isBarSeriesResponse } from "@marketpulse/shared";

import type { BarSeriesView } from "../market/index.js";
import { toBarSeriesView } from "../market/index.js";

// Ten bodies `GET /market-data/bars` answers with, recorded from the real
// endpoint over the real store — the fixture backend Stories 2.11 to 2.13 test
// against instead of each inventing a mock (Task 2.10.6).
//
// ## Why they are recorded and not written
//
// A hand-written body gets a closed vocabulary wrong and nothing notices until
// something unrelated breaks. `securityStatus` is **`active` | `untracked`**,
// and Task 2.10.4 wrote `"tracked"` in an inline fixture: all fourteen of its
// tests passed, and only `tsc -b` in `pnpm verify` caught it — a test run is
// not a typecheck. A recorded body cannot get this wrong, because the server
// produced it.
//
// The same applies one level up. `feed`, `provider`, `adjustment` and
// `timeframe` are closed unions this bundle knows; a body widened by hand to
// "something realistic" is refused by `isBarSeriesResponse`, and the symptom is
// `unreadable-body` in a test that looks like it is about something else. Two
// of the ten below are deliberately in exactly that state, and they are labelled
// as such so nobody reads them as bodies the server sends.
//
// ## How each was recorded, so it can be re-recorded rather than cited
//
// A backend built with `pnpm build` and started on the local store
// (`node dist/index.js` from `apps/backend`, with `pnpm db` up and the
// migrations and universe loaded), then, from this directory:
//
// ```
// B=http://127.0.0.1:3000/market-data/bars
// curl -s "$B?symbol=NVDA&timeframe=1m&start=2026-09-04T13:30:00.000Z&end=2026-09-04T14:00:00.000Z" > bar-series/full.json
// curl -s "$B?symbol=NVDA&timeframe=1m&start=2026-09-04T19:00:00.000Z&end=2026-09-05T20:00:00.000Z" > bar-series/partial.json
// curl -s "$B?symbol=NVDA&timeframe=1m&sessions=1"                                                  > bar-series/empty.json
// curl -s "$B?symbol=NVDA&timeframe=1m&start=2025-09-04T13:30:00.000Z&end=2026-09-04T20:00:00.000Z" > bar-series/refused-cap.json
// curl -s "$B?symbol=NVDA&timeframe=1m&start=2023-09-04T13:30:00.000Z&end=2023-09-04T20:00:00.000Z" > bar-series/refused-calendar.json
// curl -s "$B?symbol=ZZZZ&timeframe=1m&sessions=1"                                                  > bar-series/refused-unknown-symbol.json
// ```
//
// The 503 is the same request against a backend pointed at a port nothing
// listens on — `DATABASE_PORT=59999 node dist/index.js` — which is the
// reproduction `CLAUDE.md` already records for the connection-timeout message.
//
// **`stitched.json` is the one 200 `curl` cannot ask for**, and the reason is
// worth knowing before anyone tries. `serve-series.ts` fetches a live tail only
// for the **current session**, and only when the store is caught up to it: a
// whole session between `covered_end` and where the tail would begin is
// declined as `stale-store`. This store stops at Friday 2026-09-04's close, so
// every request made on 2026-09-10 declines. It was recorded by driving the
// **shipped route** — the same plugin `index.ts` registers, the same store, the
// same Alpaca client, the same response schema — through `app.inject()` with
// the route's own clock seam pinned to Tuesday 2026-09-08 15:00Z. 2026-09-07 is
// Labor Day, so there is no session in the gap and the tail fires. Nothing
// about the body is invented: 60 stored bars, 90 fetched from the vendor, and
// the join is `mergeSeriesProvenance`.
//
// One thing that body does **not** have, and it is a recorded fact rather than
// an omission: its two sources name the **same feed**. Both halves come from
// Alpaca's historical API, which is SIP on this plan. A series naming two
// *different* feeds is what Epic 3's IEX socket produces, and it cannot be
// recorded until that socket exists — so this fixture is the multi-source
// **shape** and Story 2.14 will want a second one for the two-feed **wording**.
// Writing that one by hand now would be inventing a body no server has ever
// sent, which is the thing this file exists not to do.
//
// ## Why they live here and not in `src/market/`
//
// `eslint.config.mjs` forbids anything outside `src/market/` importing anything
// under it except its `index.ts`, so a fixture module inside the module would be
// unreachable from a component test, a story or the browser suite — and the way
// round it is worse than the problem, because re-exporting fixtures through
// `index.ts` puts them in the module's public API and, with them, in the
// application's import graph. They sit beside `test-render.tsx` instead, which
// is test scaffolding `vitest.config.ts` already knows about by name, and they
// import the module's API rather than the other way round.
//
// ## Why they are formatted rather than excluded from Prettier
//
// `apps/backend/src/fixtures/alpaca/` is excluded from Prettier **and** from
// git's line-ending normalisation, and that exclusion is right there: those
// bodies are a **vendor's** bytes, and one of them exists specifically to prove
// that a real Alpaca error body is not JSON. Reformatting it would destroy the
// evidence.
//
// Ours are not that. Every one of them is our own contract, JSON by
// construction, and what makes them evidence is that the **values** came off the
// server rather than out of somebody's head — which whitespace cannot change.
// So they stay in the formatter's hands and `pnpm format:check` reads them like
// anything else. The reversal trigger is the first fixture whose *bytes* are the
// claim: a non-JSON body, or one recorded to prove an encoding.
//
// ## The two that were not recorded, and the single step that made each
//
// `incoherent.json` and `unknown-feed.json` are derived from `full.json`,
// **one field each**, and the recorded original sits beside them so the
// derivation is a one-line diff. They exist because a correct server never
// produces either, which is precisely why a test cannot reach those two branches
// without them:
//
//   - **`incoherent.json`** — the single source's `barCount`, `30` → `29`. Every
//     closed vocabulary stays valid, so `isBarSeriesResponse` **accepts** it and
//     `toBarSeries` refuses it: the sources no longer sum to the bars. That is
//     `answered-badly` by way of the one `try` in this layer, and it is the
//     opposite of the hand-editing this file warns about rather than an exception
//     to it.
//   - **`unknown-feed.json`** — the source's `feed`, `"sip"` → `"darkpool"`, a
//     slug no `MARKET_FEEDS` member spells. `isBarSeriesResponse` refuses it, so
//     it is `unreadable-body`: *something that is not this API is answering at
//     this address*.
//
// ## What is asserted at import, and why it is here rather than only in a test
//
// Every entry declares the outcome it was recorded as, and this module checks
// that claim against the **real** predicates as it loads. A recorded body that
// stops matching its own label — because the contract moved, or because someone
// re-recorded against a different server — throws where it is imported rather
// than failing three stories later as a state nobody asked for. `bar-series.test.ts`
// beside this file asserts the states they collapse to; this is the cheaper half
// that every consumer gets for free.

import EMPTY from "./bar-series/empty.json" with { type: "json" };
import FULL from "./bar-series/full.json" with { type: "json" };
import INCOHERENT from "./bar-series/incoherent.json" with { type: "json" };
import PARTIAL from "./bar-series/partial.json" with { type: "json" };
import REFUSED_CALENDAR from "./bar-series/refused-calendar.json" with { type: "json" };
import REFUSED_CAP from "./bar-series/refused-cap.json" with { type: "json" };
import REFUSED_UNKNOWN_SYMBOL from "./bar-series/refused-unknown-symbol.json" with { type: "json" };
import STITCHED from "./bar-series/stitched.json" with { type: "json" };
import UNAVAILABLE from "./bar-series/unavailable.json" with { type: "json" };
import UNKNOWN_FEED from "./bar-series/unknown-feed.json" with { type: "json" };

/**
 * The three transport outcomes these ten bodies can be.
 *
 * A **recorded fact about each fixture, not a computation** — deliberately, so
 * that nothing here becomes a second copy of `api-client.ts`'s classification.
 * The status code and the body were observed together; this field says which
 * pair was observed, and the checks below hold it to it.
 *
 * The other four outcomes `api-client.ts` distinguishes — `timeout`, `aborted`,
 * `unreachable` and `http-error` — are properties of a **transport** rather than
 * of a body, so no recorded body can carry one. A test that wants them stubs
 * `fetch` to behave that way; `stub-fetch.ts` is the helper for it.
 */
export type FixtureOutcome = "ok" | "api-error" | "unreadable-body";

/** One recorded answer: what came back, and what it came back as. */
export interface BarSeriesFixture {
  /** The HTTP status the server answered with. */
  readonly status: number;

  /**
   * The body exactly as it arrived, typed `unknown`.
   *
   * `unknown` rather than `BarSeriesResponse`, because that is what a body from
   * outside the process **is**: two of these are deliberately not this contract
   * at all, and a typed literal would be asserting the compiler's opinion over
   * the recording. {@link barSeriesFixtureBody} narrows it where a caller has
   * established which one it is holding.
   */
  readonly body: unknown;

  /** What `api-client.ts` classifies this pair as. */
  readonly outcome: FixtureOutcome;

  /** One sentence on what this body is, for a story's or a test's name. */
  readonly describes: string;
}

/**
 * Every recorded body, by name.
 *
 * The set covers what Task 2.10.4's union can be: the three **answers**, the
 * three **refusals**, the one **retryable** failure, and the two bodies a
 * correct server never sends. `null`-covered is not a separate entry and does
 * not want one — the contract makes `covered: null` and `bars: []` the same
 * fact, `toBarSeries` refuses either without the other, so `empty` is both.
 */
export const BAR_SERIES_FIXTURES = {
  /** 30 bars over exactly the half-hour that was asked for. → `loaded`. */
  full: {
    status: 200,
    body: FULL,
    outcome: "ok",
    describes: "a complete series: covered equals requested",
  },

  /**
   * 60 bars over a window reaching a session past what the store holds, so
   * `covered` stops at Friday's close. → `partial`, and an answer.
   */
  partial: {
    status: 200,
    body: PARTIAL,
    outcome: "ok",
    describes: "a partial series: covered is narrower than requested",
  },

  /**
   * `bars: []`, `covered: null`, provenance and `requested` both present — the
   * session had not opened when this was recorded. → `empty`, and a 200.
   */
  empty: {
    status: 200,
    body: EMPTY,
    outcome: "ok",
    describes: "an empty series: no bars, a null covered range, still a 200",
  },

  /**
   * 150 bars stitched from 60 held and 90 fetched, so provenance names two
   * sources. → `loaded`. See the header for how it was recorded and for the one
   * thing it does not show.
   */
  stitched: {
    status: 200,
    body: STITCHED,
    outcome: "ok",
    describes: "a stitched series whose provenance names two sources",
  },

  /** The 10,000-bar cap, refused rather than reduced, naming the number. */
  refusedCap: {
    status: 400,
    body: REFUSED_CAP,
    outcome: "api-error",
    describes: "a window over the 10,000-bar cap, refused with its arithmetic",
  },

  /** A window outside the checked-in trading calendar, 2024–2028. */
  refusedCalendar: {
    status: 400,
    body: REFUSED_CALENDAR,
    outcome: "api-error",
    describes: "a window outside the trading calendar this system covers",
  },

  /**
   * A well-formed symbol the universe does not hold. A **refusal** rather than
   * a failure — the finding Task 2.10.4 recorded — which is why the set covers
   * three refusals and not two.
   */
  refusedUnknownSymbol: {
    status: 404,
    body: REFUSED_UNKNOWN_SYMBOL,
    outcome: "api-error",
    describes: "a symbol this system does not track",
  },

  /**
   * The database unreachable. The one failure this layer treats differently
   * from every other: `SERVICE_UNAVAILABLE` is the only code
   * `isRetryableApiErrorCode` says yes to, so this is the fixture that produces
   * a `failed` state offering a retry.
   */
  unavailable: {
    status: 503,
    body: UNAVAILABLE,
    outcome: "api-error",
    describes: "the store unreachable — the one retryable failure",
  },

  /**
   * A 200 whose numbers disagree with each other. Derived from `full` in one
   * documented step; see the header. → `failed` / `answered-badly`.
   */
  incoherent: {
    status: 200,
    body: INCOHERENT,
    outcome: "ok",
    describes: "a body this contract admits whose numbers do not add up",
  },

  /**
   * A 200 naming a feed this bundle does not know. Derived from `full` in one
   * documented step; see the header. → `failed` / `answered-badly`, by way of
   * `unreadable-body`.
   */
  unknownFeed: {
    status: 200,
    body: UNKNOWN_FEED,
    outcome: "unreadable-body",
    describes: "a body naming a feed slug this bundle does not know",
  },
} as const satisfies Record<string, BarSeriesFixture>;

/** The name of one recorded body. */
export type BarSeriesFixtureName = keyof typeof BAR_SERIES_FIXTURES;

/** Every fixture name, for a `describe.each` or a stories grid. */
export const BAR_SERIES_FIXTURE_NAMES = Object.keys(
  BAR_SERIES_FIXTURES,
) as readonly BarSeriesFixtureName[];

/**
 * One recorded body as the contract, for a caller that knows which it holds.
 *
 * Narrows through the **real** `isBarSeriesResponse` rather than by assertion,
 * so a fixture that stops being this contract is a throw at the call site
 * rather than a cast that lies. `unknownFeed` is the one entry this refuses,
 * by construction.
 */
export function barSeriesFixtureBody(
  name: BarSeriesFixtureName,
): BarSeriesResponse {
  const { body } = BAR_SERIES_FIXTURES[name];

  if (!isBarSeriesResponse(body)) {
    throw new TypeError(
      `The ${name} fixture is not a bar-series response. Fixtures are ` +
        `recorded bodies; if this one has stopped matching the contract, ` +
        `re-record it rather than editing it.`,
    );
  }

  return body;
}

/**
 * The state one recorded body collapses to, through the real transition.
 *
 * **For a story, and this is the shape stories want.** Task 2.10.4's rule 4
 * keeps `BarSeriesView` plain serialisable data precisely so a story can hold
 * one; what a story must not do is invent one, because a hand-built `partial`
 * with a `covered` that does not agree with its bars is a state the application
 * cannot produce and a component tuned against it renders the real one wrongly.
 *
 * So the view is built by `toBarSeriesView` — the same function the hook calls,
 * over the same body the server sent. The only thing assembled here is the
 * two-field `ApiResult` wrapper, whose shape is decided entirely by the
 * status code that was recorded alongside the body.
 *
 * `requestId` is `null` for every answer and a fixed, obviously-fake id for the
 * failures, because the recorded bodies carry a real correlation id from the
 * moment of recording and a story rendering one would put a different id on
 * screen every time it is re-recorded.
 */
export function barSeriesFixtureView(
  name: BarSeriesFixtureName,
): BarSeriesView {
  const fixture = BAR_SERIES_FIXTURES[name];

  switch (fixture.outcome) {
    case "ok":
      return toBarSeriesView(LOADING, {
        outcome: "ok",
        status: fixture.status,
        data: barSeriesFixtureBody(name),
        requestId: null,
      });

    case "api-error":
      return toBarSeriesView(LOADING, {
        outcome: "api-error",
        status: fixture.status,
        error: barSeriesFixtureError(name),
        requestId: FIXTURE_REQUEST_ID,
      });

    case "unreadable-body":
      return toBarSeriesView(LOADING, {
        outcome: "unreadable-body",
        status: fixture.status,
        requestId: FIXTURE_REQUEST_ID,
      });
  }
}

/**
 * The correlation id the failure fixtures render with.
 *
 * A fixed value rather than the one in the recorded body, so a re-recording
 * does not change what a story puts on screen. It is deliberately not a
 * plausible one: an id that looked real in a screenshot would be a support
 * reference for a request nobody made.
 */
export const FIXTURE_REQUEST_ID = "00000000-0000-4000-8000-000000000000";

/** The state every request starts from — `use-bar-series.ts`'s own constant. */
const LOADING: BarSeriesView = { state: "loading" };

/** One recorded error body as the contract, narrowed by the real predicate. */
function barSeriesFixtureError(name: BarSeriesFixtureName): ApiError {
  const { body } = BAR_SERIES_FIXTURES[name];

  if (!isApiError(body)) {
    throw new TypeError(
      `The ${name} fixture is labelled api-error and is not an ApiError body.`,
    );
  }

  return body;
}

// Every fixture's declared outcome, held to the real predicates as this module
// loads. See the header: a body that stops matching its own label throws where
// it is imported rather than three stories later.
for (const name of BAR_SERIES_FIXTURE_NAMES) {
  const { status, body, outcome } = BAR_SERIES_FIXTURES[name];

  const observed: FixtureOutcome =
    status >= 200 && status < 300
      ? isBarSeriesResponse(body)
        ? "ok"
        : "unreadable-body"
      : "api-error";

  if (observed !== outcome) {
    throw new TypeError(
      `The ${name} fixture is labelled ${outcome} and reads as ${observed}. ` +
        `Fixtures are recorded, not written: re-record it rather than ` +
        `relabelling it.`,
    );
  }

  if (outcome === "api-error" && !isApiError(body)) {
    throw new TypeError(
      `The ${name} fixture answered ${String(status)} with a body that is ` +
        `not an ApiError. That is a server bug, not a fixture to keep.`,
    );
  }
}
