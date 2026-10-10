import { Component, Fragment, type ReactNode } from "react";

import { ErrorFallback } from "../ErrorFallback/ErrorFallback.js";

// The containment mechanism: a subtree that fails renders a fallback instead of
// taking the page with it.
//
// **This is the codebase's first class component, and React 19 has not changed
// that.** There is still no hook equivalent for `getDerivedStateFromError`, so
// a boundary is a class or it is a dependency. Both were measured against the
// artefact before this one was written — see the outcome of Task 1.7.6 — and
// hand-rolling won on a count rather than on principle: `react-error-boundary`
// is a well-tested reset API for a component this repository needs exactly one
// of, and its own `resetKeys`/`onReset` vocabulary is a second one to learn
// beside the four props below.
//
// **It knows nothing about the error.** `getDerivedStateFromError` is handed
// one and deliberately does not keep it: the state is a boolean. That is what
// makes "the fallback never shows the error" structural rather than a habit —
// there is no reference to render even by mistake — and it is the same move
// `apiError()` makes on the backend, where the constructor has four slots and
// no room for a fifth. Reporting is somebody else's job; see below.
//
// **It does not report, and ~~`componentDidCatch` is deliberately absent~~ —
// amended 2026-10-11 by Task 4.7.5: the method exists and still reports
// nothing.** It takes no parameter, so it cannot be handed the error, and all
// it does is pass one bit to `onCaught` so a head drawn ABOVE this boundary
// can stop claiming what the subtree below it no longer has. Everything in
// the paragraph below is unchanged — there is still exactly one report of a
// caught error in this application and it is `main.tsx`'s. React
// 19 added `onCaughtError` to `createRoot`, and `main.tsx` wires it, so an
// error caught here is already logged with its component stack from one place
// that every boundary shares — adding `componentDidCatch` on top would be a
// second report of the same failure. Measured on the running application: one
// console entry per caught error, ours, with the full component stack, and
// React's own "The above error occurred in ..." message absent, because
// providing `onCaughtError` **replaces** the default rather than adding to it.
//
// ## What this does not catch
//
// Stated explicitly, because a boundary looks like it catches everything and
// catches four kinds of thing. It catches errors thrown **during render**, in
// **lifecycle methods** and in **constructors**, anywhere below it.
//
// It catches nothing thrown in an **event handler**, a **`setTimeout`**, a
// **promise callback**, or any code that runs outside the render pass. Nor does
// React's `onUncaughtError`: that one is for a render error no boundary caught,
// which is a different thing. An event handler that throws leaves a screen that
// looks perfectly healthy, a console entry nobody is reading, and no region
// showing a fallback — verified in the browser rather than inferred.
//
// That is the same split Task 1.7.5 drew on the backend: a route that throws is
// **contained** — the error handler answers, the process lives — and work that
// escapes the request lifecycle needed a second mechanism entirely. This is the
// contained half and only the contained half. The backend's answer to the other
// half was `process.on("uncaughtException")`; the browser's equivalent is a
// `window` error listener, and Task 1.7.6 decided against one for a reason
// worth reading before adding it: the backend's handlers moved a crash from
// raw stderr into the log stream, and a browser has no second stream to move
// anything into.
//
// ## The reset
//
// Recovery re-renders the subtree; it does not reload the document, because a
// reload discards the rest of a working screen and that is the failure mode
// this whole component exists to avoid.
//
// Clearing the flag alone is not enough. A child holding its own bad state
// would throw again immediately on the next render, and the user would click a
// button that visibly does nothing. So the children are keyed on a counter that
// the reset increments, which unmounts the failed subtree and mounts a fresh
// one — the same `key`-based remount `react-error-boundary` implements, in the
// two lines it takes here.

export interface ErrorBoundaryProps {
  /** Passed straight to {@link ErrorFallback} — what failed, in product words. */
  readonly title: string;

  /** Passed straight to {@link ErrorFallback} — what still works. */
  readonly detail?: string;

  /** Passed straight to {@link ErrorFallback} — the chrome's density. */
  readonly compact?: boolean;

  /**
   * Called with `true` when the subtree below throws and with `false` when a
   * reset clears it — **so a surface ABOVE this boundary can stop claiming
   * things the subtree no longer has** (Task 4.7.5).
   *
   * ## It is a notification, not a report, and the distinction is the reason
   * `componentDidCatch` is still absent above
   *
   * The note above argues that this component does not report, because
   * `main.tsx`'s `onCaughtError` already logs every caught error with its
   * component stack from one place. That is unchanged and this does not
   * weaken it: nothing here is handed the error, the state is still a
   * boolean, and there is still no reference a fallback could render even by
   * mistake. What crosses is one bit — *the thing below me is not on the
   * screen* — which is a fact about **layout** rather than about a failure.
   *
   * ## Why a caller needs it at all
   *
   * `Region` draws a head above this boundary and content inside it. The head
   * carries `meta`: a count, `Top 5 each way`, `ORDER HELD` — claims about
   * figures. A boundary that contains the content and not the head leaves
   * those claims standing over a box saying the region could not be
   * displayed, which is two true halves and one contradiction, the same
   * family as the market-feed cell's. A caller cannot derive the bit: a throw
   * during render is not a state anything upstream computed.
   *
   * ## The `false` is load-bearing
   *
   * `ErrorFallback`'s `Try again` remounts the subtree. A caller told only
   * about the failure would suppress its head for ever, so a successful retry
   * would restore the figures under a head that never comes back — which is
   * the first repair anybody writes and is why `Region.test.tsx`' walk runs
   * the retry.
   *
   * Called during the error commit and during the reset, never on an ordinary
   * render, so a `useState` setter is a stable identity to pass here and the
   * boundary does not re-notify what it already said.
   */
  readonly onCaught?: (caught: boolean) => void;

  readonly children?: ReactNode;
}

interface ErrorBoundaryState {
  /**
   * Whether the subtree below has thrown. A boolean and not the error, on
   * purpose — see the note above.
   */
  readonly caught: boolean;

  /**
   * Bumped by every reset, and used as the children's `key`, so recovery
   * remounts rather than re-renders.
   */
  readonly resetCount: number;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = { caught: false, resetCount: 0 };

  static getDerivedStateFromError(): Pick<ErrorBoundaryState, "caught"> {
    return { caught: true };
  }

  /**
   * **The one lifecycle method this class has, and it reports nothing** — see
   * {@link ErrorBoundaryProps.onCaught}. The error is not a parameter here on
   * purpose: `componentDidCatch` is handed one and this signature refuses it,
   * so the *it knows nothing about the error* property above survives the
   * method existing at all.
   */
  override componentDidCatch(): void {
    this.props.onCaught?.(true);
  }

  // An arrow property rather than a method, so `this` survives being handed to
  // the fallback as a callback without a `bind` in the constructor.
  private readonly reset = (): void => {
    this.setState((previous) => ({
      caught: false,
      resetCount: previous.resetCount + 1,
    }));
    this.props.onCaught?.(false);
  };

  override render(): ReactNode {
    const { title, detail, compact = false, children } = this.props;

    if (!this.state.caught) {
      return <Fragment key={this.state.resetCount}>{children}</Fragment>;
    }

    // The branch is `exactOptionalPropertyTypes` again, and it is the same
    // shape `apiError()` takes in packages/shared: `detail` arrives here as
    // `string | undefined`, which is not an optional `string`, so spreading it
    // through would be TS2375. Constructing the element two ways is what keeps
    // "absent" and "present as undefined" different states all the way down.
    return detail === undefined ? (
      <ErrorFallback title={title} onRetry={this.reset} compact={compact} />
    ) : (
      <ErrorFallback
        title={title}
        detail={detail}
        onRetry={this.reset}
        compact={compact}
      />
    );
  }
}
