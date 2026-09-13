import { DEFAULT_WINDOW_SESSIONS, SESSIONS_PARAM } from "../market/index.js";

// Every path in the application, declared once.
//
// This table exists because of the one thing React Router does not give us.
// Task 1.5.1 chose it over TanStack Router knowing the trade: `to` is a plain
// `string`, so `<Link to="/replayy">` typechecks, lints, builds and renders,
// and fails only when somebody clicks it — landing on the not-found state this
// same task builds. TanStack would have made that a `TS2322` naming the valid
// set (verified in the spike) and cost twice the bundle for four static routes.
//
// So the hole is closed here instead, at the only price that is actually cheap:
// the paths are properties rather than literals, and both the `<Route path>`
// declarations and every `<Link to>` read from this object. A typo is then an
// unknown property — `PATHS.overvieww` — which `tsc -b` does catch. It is a
// mitigation and not the guarantee TanStack sells: nothing stops a future
// author writing the string out by hand, and nothing here checks that a
// declared path has a route. Doing it now, with four paths, is what keeps it
// from being retrofitted after Epic 4 has scattered them.
//
// The names are PRODUCT_SPEC.md §8's four primary experiences, in its order.
export const PATHS = {
  // §8.1 — "What is happening?", and the spec calls it the landing screen.
  overview: "/",
  // §8.2 — "Why might this be happening?"
  investigations: "/investigations",
  // §8.3 — "What is happening with this security?"
  //
  // Plural and deliberately so. §8.3 is a view *of a security*, so this route
  // acquires a symbol the moment Epic 4 gives it real data — and the shape that
  // takes is a child, `/securities/:symbol`, nested under this one. Choosing
  // the singular `/security` today would mean renaming the parent then, or
  // living with `/security/:symbol` reading as a category that has one member.
  //
  // **The parameterised form arrived at Task 2.10.7**, earlier than this
  // comment predicted and for the reason it named: there is now something
  // behind it. It is declared in {@link ROUTE_PATTERNS} rather than here — see
  // that export for why the two are separate tables.
  securities: "/securities",
  // §8.4 — "What was knowable at this moment?"
  replay: "/replay",
} as const;

// The union of what the table holds, for anything that needs to accept a path
// rather than read one. Not used yet; exported because the alternative is each
// consumer writing `(typeof PATHS)[keyof typeof PATHS]` out again.
export type Path = (typeof PATHS)[keyof typeof PATHS];

/**
 * Route paths that carry a **parameter**, which is a different kind of thing
 * from everything in {@link PATHS} (Task 2.10.7).
 *
 * ## Why a second table rather than a fifth entry
 *
 * Everything in `PATHS` is a **destination**: a string you can put in a
 * `<Link to>`, type into an address bar, or navigate a browser to and get a
 * page. `/securities/:symbol` is a **pattern** — it matches destinations and is
 * not one, and `<Link to="/securities/:symbol">` navigates to a page about a
 * security called `:symbol`.
 *
 * Conflating them is not a tidiness question, and the cost was measured rather
 * than guessed. Six places walk `PATHS` as a list of real destinations —
 * `App.test.tsx` alone does it four times, once asserting that **every route
 * has a distinct `<h1>`** — and a pattern in that table would either fail that
 * assertion (this route and `/securities` render the same screen, so they share
 * a heading, correctly) or force it to be weakened with a carve-out. Weakening
 * a check that has already caught a real defect, to admit a value that is not
 * what the check is about, is the wrong trade.
 *
 * So: two tables, one file, and the file's promise — *every path, once* — is
 * intact. `tsc -b` still catches a typo, because these are still properties
 * rather than literals.
 *
 * ## What a destination is built with
 *
 * {@link securityPath}, and nothing else. A pattern is not a template: React
 * Router does not export a builder in declarative mode, so the alternative is
 * every call site interpolating the segment itself — which is the string
 * duplication `PATHS` exists to prevent, arriving through the one door it left
 * open.
 */
export const ROUTE_PATTERNS = {
  /**
   * §8.3 for one security. Nested under {@link PATHS.securities}, which is the
   * shape that file predicted.
   */
  security: "/securities/:symbol",
} as const;

/**
 * The address of one security's page, optionally at a given window.
 *
 * `encodeURIComponent` because the value reaching here is a **ticker**, and a
 * ticker is not always the bare alphanumeric it looks like: the tracked
 * universe holds class shares that the vendor spells with a dot (`BRK.B`), and
 * a slash-bearing spelling exists in the wild. A segment is encoded once, here,
 * so that no call site has to remember — and so that a symbol that would
 * otherwise open a second path segment cannot.
 *
 * It deliberately does **not** validate the symbol. `series-request.ts` on the
 * server refuses a malformed one with a 400 naming the input, and re-checking
 * here would be a second definition of well-formedness in the copy that drifts
 * — the same argument `bar-series-query.ts` already makes about
 * `BarSeriesRequest.symbol`.
 */
export function securityPath(symbol: string, sessions?: number): string {
  const path = `${PATHS.securities}/${encodeURIComponent(symbol)}`;

  // **An absent parameter means the default, and this never writes one it did
  // not need** (`FRONTEND-STATE.md` §3, `VOLUME-AND-WINDOW.md` §4c). So
  // `/securities/NVDA` *is* the five-session view and the `5D` cell, pressed
  // from another window, **removes** the parameter rather than setting it. A URL
  // that accretes every default is a session dump rather than a shareable link.
  //
  // Note the consequence, accepted rather than worked around: one view has two
  // addresses, because a hand-typed or shared `?sessions=5` is honoured and left
  // exactly as it was written. This application does not rewrite somebody's
  // address into a different spelling of the same thing.
  if (sessions === undefined || sessions === DEFAULT_WINDOW_SESSIONS) {
    return path;
  }

  // `URLSearchParams` rather than a template, so a count is encoded by the thing
  // that knows how, and `SESSIONS_PARAM` rather than the literal, so the
  // address, the wire and the control cannot learn different spellings of one
  // parameter — it is the same constant `bar-series-query.ts` puts on the wire.
  const query = new URLSearchParams({ [SESSIONS_PARAM]: String(sessions) });

  return `${path}?${query.toString()}`;
}
