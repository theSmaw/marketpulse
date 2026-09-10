import type { Timeframe } from "@marketpulse/shared";

// What this application asks `GET /market-data/bars` for, and the one function
// that spells it as a query string (Task 2.10.3).
//
// **A separate module from `api-client.ts`, for `api-base-url.ts`'s reason.**
// That file stayed out of the client because it answers a different question —
// *where is the API*, against *how do we talk to it* — and this one is the
// third question: *what are we asking for*. Keeping it apart is what lets
// {@link barSeriesQuery} be a pure function of one argument with tests of its
// own, and it gives Story 2.13's window control and Story 2.11's route a type
// to hold that has no transport in it.
//
// ## The trap this module exists to close: the browser's clock is not an input
//
// **Nothing here reads a clock, and nothing in `apps/frontend/src` may resolve
// a window from one.** This is `MARKET-DATA-API.md` §2 and it is a defect class
// rather than a preference. `market-calendar.ts` ships to this bundle, so a
// client *could* resolve "the last 5 sessions" itself. What it cannot supply
// correctly is **today's market date**: a browser in Singapore at 09:00 local is
// still on the previous market date in New York, so a client resolving the
// named form from its own clock is off by one session for roughly half the
// world for several hours of every day. It is invisible in local testing, wrong
// for a subset of users, and it produces a chart that is **plausible and
// shifted** rather than an error anybody sees.
//
// So the named form goes on the wire as `sessions=N` and the server resolves it,
// which is where the market date actually is. What "5 sessions" meant comes back
// in `coverage.requested`, and that is the only way this client can know.
//
// The mechanism is the shape rather than a rule: {@link SeriesWindow} is a
// discriminated union whose named member has no instants in it and whose
// absolute member has no session count, so there is no member a clock could
// contribute to. `barSeriesQuery` is a pure function of its argument. Neither
// this file nor `api-client.ts` constructs a `Date`.
//
// ## Why the window is a union rather than three optional parameters
//
// `?start=…&sessions=5` is **refused** by the server (`series-request.ts`) and
// so is a request naming neither — not "prefer one", because a caller that sent
// both did not know what it was asking for. Three optional fields make both of
// those states constructible at every call site and discoverable only in a 400;
// a union makes them unspellable. It is the same reason every state in this
// layer is a union member rather than a boolean.

/**
 * The window a series is asked for over, in one of its two forms.
 *
 * **The absolute range is the primitive and the named form is sugar over it**
 * (`MARKET-DATA-API.md` §2) — but they are not interchangeable at this layer,
 * and `FRONTEND-STATE.md` §3 is why: the two are different URLs meaning
 * different things, and this application never silently rewrites one into the
 * other. `?sessions=5` is a stable address naming a **moving target**, so a link
 * a user shares means *the last five sessions* when it is opened next week —
 * which is what the person sending it meant. An explicit range means that range
 * forever.
 *
 * The cache behaviour then follows for free rather than being arranged: §11
 * gives an absolute window inside closed sessions `private, max-age=300` and
 * gives a named one no lifetime at all, because the same address means a
 * different window tomorrow.
 */
export type SeriesWindow =
  /**
   * The last `sessions` trading sessions, resolved by the server against the
   * market date.
   *
   * The form this application sends by default, and the form Story 2.13's
   * control will mostly produce.
   */
  | { readonly form: "named"; readonly sessions: number }
  /**
   * An explicit half-open range, `[start, end)`, as two ISO 8601 **UTC**
   * instants with the `Z`.
   *
   * The form Epic 13's replay needs and Story 2.13's scrubber can produce.
   * Strings rather than `Date`s deliberately: a `Date` here would be an
   * invitation to build one from `new Date()` at a call site, which is the one
   * thing this module exists to prevent. Where the instants come from is the
   * caller's problem, and every legitimate source of one today is either the
   * URL a user shared or `coverage.requested` off a previous answer — both of
   * which are the server's own arithmetic coming back.
   *
   * The server refuses a zone-less instant and a numeric offset: `CALENDAR.md`
   * §5 fixed one wire format, and `new Date("2026-09-04T13:30:00")` parses as
   * **local** time, which is correct on a UTC server and wrong by hours on a
   * laptop.
   */
  | { readonly form: "absolute"; readonly start: string; readonly end: string };

/** Everything one series request carries. */
export interface BarSeriesRequest {
  /**
   * The security, as a ticker.
   *
   * A plain `string` rather than a branded `Ticker`, because the value this
   * application has is a path segment out of a URL a user could have typed.
   * `series-request.ts` checks its form and answers a **400 naming the input**
   * — the refusal is part of the contract, so re-checking it here would be a
   * second definition of well-formedness, in the copy that drifts.
   */
  readonly symbol: string;

  /** The interval each bar covers. */
  readonly timeframe: Timeframe;

  /** Which window, in whichever form the user expressed. */
  readonly window: SeriesWindow;
}

/**
 * Spell one request as a query string — **the only place in this application
 * that writes these parameter names.**
 *
 * The point is not the encoding, which `URLSearchParams` does: it is that the
 * parameter names, the two window forms and the rule that they are exclusive
 * exist once. A URL assembled at a call site is a second copy of this contract,
 * and it is the copy that still says `sessions` after the server has learned
 * something else.
 *
 * **The order of the parameters is fixed and that is load-bearing**, because two
 * caches key on the string this produces. The browser's own HTTP cache keys on
 * the whole URL — that is what makes `MARKET-DATA-API.md` §11's `ETag`
 * revalidation and the five-minute lifetime work at all — and
 * `FRONTEND-STATE.md` §2 keys the in-memory series cache on **the request as
 * sent**, so that this string *is* the key. Iterating an object's own keys
 * would make that key depend on construction order, and two spellings of one
 * request are two cache misses and two round trips that look like nothing at
 * all on screen.
 *
 * There is no leading `?`: the caller composes the path, so this returns the
 * query and nothing else.
 */
export function barSeriesQuery(request: BarSeriesRequest): string {
  const query = new URLSearchParams({
    symbol: request.symbol,
    timeframe: request.timeframe,
  });

  // The one branch, and it is exhaustive over the union rather than a pair of
  // `if`s over optional fields — which is what makes a third window form a
  // compile error here rather than a parameter silently never sent.
  if (request.window.form === "named") {
    query.set("sessions", String(request.window.sessions));
  } else {
    query.set("start", request.window.start);
    query.set("end", request.window.end);
  }

  return query.toString();
}
