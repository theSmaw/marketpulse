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
// **It does not report, and `componentDidCatch` is deliberately absent.** React
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

  // An arrow property rather than a method, so `this` survives being handed to
  // the fallback as a callback without a `bind` in the constructor.
  private readonly reset = (): void => {
    this.setState((previous) => ({
      caught: false,
      resetCount: previous.resetCount + 1,
    }));
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
