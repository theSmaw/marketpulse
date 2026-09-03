// Where a render failure is reported, and the only place in this application
// that does it.
//
// **There is nowhere to send it.** The backend writes structured JSON to
// stdout and an aggregator collects it; a browser has the console and nothing
// else until something on the server is listening, and nothing is — re-checked
// in Task 1.12.2, see the reversal trigger at the foot of this comment.
// `console.error` with the component stack is the honest stopping
// point, and this module exists so that when there *is* a destination there is
// one function to change rather than three call sites and a class.
//
// **Why wire React's root options at all, given the console already gets the
// error.** Because providing them **replaces** React's own default logging
// rather than adding to it — measured in the browser, not assumed: with
// `onCaughtError` wired, React's own "The above error occurred in ..." message
// is gone and only this one remains. So the choice is not between one message
// and two, it is between React's wording and ours. Ours says which of the three
// kinds of failure it was, which is the distinction the rest of this file is
// about.
//
// **The three are not three severities of one thing.** They are different
// events and the names are React's:
//
//   - `caught` — a boundary handled it. The user is looking at a fallback, the
//     rest of the screen is fine, and this is the contained case Task 1.7.5
//     would recognise: something failed and the program carried on.
//   - `uncaught` — a render error that reached the root with no boundary above
//     it. React unmounts the whole tree, so the user is looking at a blank
//     page. This should be unreachable in this application: `App` puts a
//     boundary around the chrome and another around the route outlet, and the
//     regions have their own inside that. If one of these ever appears, a
//     boundary is missing rather than a fallback being ugly.
//   - `recoverable` — React recovered by itself, usually by falling back to a
//     client render. Not a product failure and not a fallback; it is here so
//     that it is distinguishable from the two that are, rather than silently
//     folded in with them.
//
// **The `StrictMode` double-report did not happen, and it was expected to.**
// Story 1.7's own notes and this task's brief both warned that `StrictMode`
// double-invokes render in development, so anything counting or reporting an
// error would see it twice locally and once in production — and that it would
// look like a duplicate-logging defect the first time it was seen. Measured
// instead: a render throw caught by a boundary produced **exactly one**
// `onCaughtError` report in the development server with `StrictMode` on. The
// constructor does run twice; the first throw aborts that render pass, and
// React reports the failure once. So the warning stands for anything counting
// renders and does not stand for this, which is why there is no de-duplicator
// here — adding one would have been a fix for a problem nobody had.
//
// **What is deliberately not here: a `window` error listener.** That would be
// the true analogue of Task 1.7.5's `process.on("uncaughtException")` — the
// only thing that sees an error thrown in an event handler, a `setTimeout` or a
// promise callback, which is precisely what an error boundary does not catch.
// It was decided against, and the reason is that the backend's parallel does
// not carry over. Those handlers earned their place by moving a crash from raw
// stderr, which no aggregator indexes, into the log stream every other record
// goes to — the change was the *stream*, not the silence. A browser has no
// second stream: an uncaught error already arrives in the console with its
// stack, which is the same destination this function writes to, so a listener
// would re-report what is already there while also catching every browser
// extension and third-party script on the page.
//
// **Re-taken in Task 1.12.2, and the answer is still no.** Story 1.12 was named
// as the reversal trigger and that story is now most of the way through, so the
// note is settled here rather than left pointing at something that has closed.
// The trigger was never "Story 1.12" — it was *a server endpoint to send a
// report to*, and this story does not build one. It builds a client that
// **reads** `GET /health`; the backend's whole surface is still that one route,
// there is nothing that accepts a report, and inventing one to justify a
// listener would be scaffolding ahead of the iteration that needs it.
//
// One thing this story did change, and it is worth knowing because it looks
// like it should count and does not. `apps/frontend/src/api-client.ts` now
// turns every transport failure into a *result* rather than a thrown error, so
// the class of failure a `window` listener would most plausibly have caught
// here — an unhandled rejection from a request nobody awaited — is structurally
// gone from this application rather than merely unreported. That narrows what a
// listener would add to third-party scripts and genuinely unhandled application
// bugs, which weakens the case rather than strengthening it.
//
// The reversal trigger is restated so the next reader inherits a condition
// rather than a story number: **an endpoint that accepts a client error
// report**. Epic 10's agent event stream is the first thing that plausibly
// brings one.

export type RenderErrorKind = "caught" | "uncaught" | "recoverable";

/**
 * Report a render error.
 *
 * @param kind which of React's three root-level error events this was
 * @param error whatever was thrown — `unknown`, because a thrown value is not
 * required to be an `Error` and pretending otherwise is how a report ends up
 * saying `undefined`
 * @param componentStack React's own stack of component names, when it has one
 */
export function reportRenderError(
  kind: RenderErrorKind,
  error: unknown,
  componentStack?: string,
): void {
  console.error(
    `[marketpulse] render error (${kind})`,
    error,
    componentStack ?? "(no component stack)",
  );
}
