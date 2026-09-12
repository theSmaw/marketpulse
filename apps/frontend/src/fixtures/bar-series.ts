import type { ApiError, BarSeriesResponse } from "@marketpulse/shared";
import { isApiError, isBarSeriesResponse } from "@marketpulse/shared";

import type { BarSeriesView } from "../market/index.js";
import { toBarSeriesView, toStaleBarSeriesView } from "../market/index.js";

// Thirteen bodies `GET /market-data/bars` answers with, recorded from the real
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
// of the thirteen below are deliberately in exactly that state, and they are labelled
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
// curl -s "$B?symbol=HD&timeframe=1m&start=2026-09-04T17:00:00.000Z&end=2026-09-04T18:00:00.000Z"  > bar-series/flat.json
// curl -s "$B?symbol=NVDA&timeframe=1m&start=2026-08-31T13:30:00.000Z&end=2026-09-04T20:00:00.000Z" > bar-series/dense.json
// ```
//
// The last two were added by Task 2.12.5 and the **symbol and window in each is
// the recording**, not an arbitrary choice: HD's hour opened and closed at the
// same price, which no other recorded body does, and NVDA's five sessions are
// 1,950 bars, which is the density the default window actually has. Their
// entries below say how each was found.
//
// **`untracked.json` needed the universe changed under it**, which is the one
// recording here with a side effect, so both halves are written down. The
// loader untracks a row rather than deleting it, and the direct route is what
// `market-bars.database.test.ts` already does twice for the same reason:
//
// ```
// docker exec marketpulse-postgres-1 psql -U marketpulse -d marketpulse \
//   -c "update securities set status='untracked' where symbol='AMD';"
// curl -s "$B?symbol=AMD&timeframe=1m&start=2026-09-04T13:30:00.000Z&end=2026-09-04T14:00:00.000Z" > bar-series/untracked.json
// docker exec marketpulse-postgres-1 psql -U marketpulse -d marketpulse \
//   -c "update securities set status='active' where symbol='AMD';"
// ```
//
// The restore is the third line and is not optional: an untracked row is
// invisible to every reader that filters on `status`, so leaving one behind is
// a local store quietly missing a security. Recorded 2026-09-10 and restored in
// the same command; `pnpm universe` converges on the file and would also undo
// it.
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

import DENSE from "./bar-series/dense.json" with { type: "json" };
import EMPTY from "./bar-series/empty.json" with { type: "json" };
import FLAT from "./bar-series/flat.json" with { type: "json" };
import FULL from "./bar-series/full.json" with { type: "json" };
import INCOHERENT from "./bar-series/incoherent.json" with { type: "json" };
import PARTIAL from "./bar-series/partial.json" with { type: "json" };
import REFUSED_CALENDAR from "./bar-series/refused-calendar.json" with { type: "json" };
import REFUSED_CAP from "./bar-series/refused-cap.json" with { type: "json" };
import REFUSED_UNKNOWN_SYMBOL from "./bar-series/refused-unknown-symbol.json" with { type: "json" };
import STITCHED from "./bar-series/stitched.json" with { type: "json" };
import UNAVAILABLE from "./bar-series/unavailable.json" with { type: "json" };
import UNKNOWN_FEED from "./bar-series/unknown-feed.json" with { type: "json" };
import UNTRACKED from "./bar-series/untracked.json" with { type: "json" };

/**
 * The three transport outcomes these thirteen bodies can be.
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

  /**
   * **HD's 13:00–14:00 ET hour on 2026-09-04, which opened and closed at
   * 320.705.** → `loaded`, and the third direction.
   *
   * Added by Task 2.12.5, and it had to be found rather than made. The other
   * ten answers are one direction or the other — `full` is +1.48% and `partial`
   * is −0.11% — so the neutral wash, which is a third of that task's whole
   * subject, had no body that produced it. A hand-written flat series was the
   * obvious move and is the thing this module exists to refuse.
   *
   * So it was **selected with a query and then recorded through the route**,
   * which is a procedure worth keeping because the next one of these will want
   * it. Against the local store:
   *
   * ```
   * docker exec marketpulse-postgres-1 psql -U marketpulse -d marketpulse -c "
   *   with w as (
   *     select s.symbol, date_trunc('hour', b.observed_at) as h,
   *            (array_agg(b.open order by b.observed_at))[1] as o,
   *            (array_agg(b.close order by b.observed_at))[60] as c,
   *            count(*) as n
   *     from market_bars b join securities s on s.id = b.security_id
   *     where b.timeframe = '1m'
   *       and b.observed_at >= '2026-09-04T13:30:00Z'
   *       and b.observed_at <  '2026-09-04T20:00:00Z'
   *     group by 1, 2)
   *   select symbol, h, o, c from w where n = 60 and o = c limit 20;"
   * ```
   *
   * It is not a contrived hour. HD traded between 320.31 and 320.97 across it —
   * a real range, a line that wanders — and ended exactly where it began, which
   * is what makes it the interesting flat case rather than a straight line. The
   * *degenerate* flat case, where every bar is identical and the price domain
   * has zero height, does not exist anywhere in this store: it is
   * `FLAT_DOMAIN_FRACTION`'s and is tested in `chart-value-axis.test.ts` where
   * it can be constructed honestly, because that function takes bars rather
   * than a response body.
   */
  flat: {
    status: 200,
    body: FLAT,
    outcome: "ok",
    describes: "a window that closed at exactly the price it opened at",
  },

  /**
   * **1,950 bars — the default window's own density, at the width every figure
   * in `CHARTING.md` was measured against.** → `loaded`, +5.19%.
   *
   * Added by Task 2.12.5. The recorded bodies before it top out at 150 bars,
   * which is 3.5 px per bar at the measured 923 px region — comfortable, and
   * therefore not the case any of §2's arithmetic is about. **0.47 px per bar
   * is the number this product actually opens at**, and a marks-per-pixel
   * decision reviewed only at 3.5 has been reviewed at the easy end.
   *
   * Five sessions of `1m` over a window the store holds **completely**, so it
   * is a `loaded` rather than a `partial`: asking the route for `sessions=5` on
   * a developer's store answers `partial` with 390 bars, which is honest and is
   * a different fixture's job. This one is the picture a user gets once the
   * store is caught up.
   *
   * ```
   * curl -s "$B?symbol=NVDA&timeframe=1m\
   * &start=2026-08-31T13:30:00.000Z&end=2026-09-04T20:00:00.000Z" \
   *   > bar-series/dense.json
   * ```
   *
   * **It is 222 KB and that is the largest single thing in this directory.**
   * Worth stating plainly, because `CLAUDE.md` already lists these fixtures
   * under *what must not reach the shipped bundle* and names the securities
   * corpus as the biggest of them — it is no longer. The re-measure command for
   * this one is `grep -o "2026-08-31T13:3[0-9]" apps/frontend/dist/assets/*.js`,
   * which must find nothing.
   */
  dense: {
    status: 200,
    body: DENSE,
    outcome: "ok",
    describes: "the default window's density — 1,950 bars over five sessions",
  },

  /**
   * 30 bars for a security the universe no longer tracks. → `loaded`, with
   * `securityStatus: "untracked"`.
   *
   * **The eleventh, added by Task 2.10.8, and the reason it had to exist.**
   * `securityStatus` is a field on all three answer members, and the panel has
   * carried a rendering for `untracked` since Task 2.10.7 that nothing had ever
   * executed: all ten bodies recorded before it were `active`, every row in
   * the local store was `active`, and no deployed row has ever been anything
   * else. A field on three members is exactly the shape a states checklist
   * walks past — it is not a member of the union, so *"every state produced"*
   * did not reach it.
   *
   * It is a **populated** answer with a different status rather than an empty
   * one, which is the fact worth keeping: the store keeps an untracked
   * security's bars and the route still serves them, so this is not a 404 and
   * not an absence.
   *
   * Recorded, not written, and the procedure is in the header.
   */
  untracked: {
    status: 200,
    body: UNTRACKED,
    outcome: "ok",
    describes:
      "a populated series for a security the universe no longer tracks",
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
 * The same state, marked as a held answer with a newer one in flight.
 *
 * **A helper rather than a spread at the call site**, and the reason is the one
 * this whole module exists for: `barSeriesFixtureView` returns the union, so
 * `{ ...view, stale: true }` is a literal against a six-member type and `tsc`
 * refuses it — correctly, since `loading`, `refused` and `failed` have no such
 * field. Narrowing by hand at each call site would be a cast, and a cast is how
 * a story ends up rendering a state the layer cannot produce.
 *
 * So it goes through the **real** `toStaleBarSeriesView`, which is the same
 * function `use-bar-series.ts` applies at its two cache reads. A story built
 * this way is showing what a cached paint actually looks like.
 *
 * A name that is not an answer comes back untouched, which is the transition's
 * own behaviour rather than this helper's opinion.
 */
export function staleBarSeriesFixtureView(
  name: BarSeriesFixtureName,
): BarSeriesView {
  return toStaleBarSeriesView(barSeriesFixtureView(name));
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
