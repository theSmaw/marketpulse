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
  // The parameterised route is deliberately *not* declared yet: there is
  // nothing behind it, and an empty route with a parameter is a promise about a
  // data shape this story has no business making.
  securities: "/securities",
  // §8.4 — "What was knowable at this moment?"
  replay: "/replay",
} as const;

// The union of what the table holds, for anything that needs to accept a path
// rather than read one. Not used yet; exported because the alternative is each
// consumer writing `(typeof PATHS)[keyof typeof PATHS]` out again.
export type Path = (typeof PATHS)[keyof typeof PATHS];
