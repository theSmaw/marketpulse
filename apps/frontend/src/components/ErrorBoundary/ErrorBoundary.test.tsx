// The only component in this application with behaviour, so the only place a
// test can assert a *decision* rather than a render. Three decisions are
// asserted here and each cost a measurement to arrive at.
//
// One mechanical note that applies to every test in this file: React logs a
// caught error to the console, and `createRoot`'s `onCaughtError` is wired in
// the real application but not under `render()`. The noise is React's own and
// is left alone — silencing it would also silence a genuine unexpected throw.

import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { ErrorBoundary } from "./ErrorBoundary.js";

const MESSAGE = "connection to postgres at 10.0.0.4:5432 refused";

function Throws(): never {
  throw new Error(MESSAGE);
}

describe("ErrorBoundary", () => {
  it("contains a render failure and offers a way back", () => {
    render(
      <ErrorBoundary title="Market breadth could not be displayed">
        <Throws />
      </ErrorBoundary>,
    );

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain(
      "Market breadth could not be displayed",
    );
    expect(screen.getByRole("button", { name: "Try again" })).toBeDefined();
  });

  // `getDerivedStateFromError` is handed the error and deliberately keeps a
  // boolean instead. That is what makes "the fallback never shows the error"
  // structural rather than a habit of remembering — the same move `apiError()`
  // makes on the backend, where the object has four slots and no room for a
  // fifth. A test asserting the absent message is the only thing that would
  // notice if someone "improved" the fallback by passing the error down.
  it("never shows the error's own message", () => {
    render(
      <ErrorBoundary title="Something failed" detail="The rest is unaffected.">
        <Throws />
      </ErrorBoundary>,
    );

    const alert = screen.getByRole("alert");
    expect(alert.textContent).not.toContain(MESSAGE);
    expect(alert.textContent).not.toContain("10.0.0.4");
    expect(alert.textContent).toContain("The rest is unaffected.");
  });

  it("renders its children untouched when nothing throws", () => {
    render(
      <ErrorBoundary title="Unused">
        <p>the real content</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText("the real content")).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  // The decision worth the most, and the one a weaker test would miss.
  //
  // Reset increments a counter used as the children's `key`, so recovery
  // **remounts** rather than re-renders. Clearing the flag alone would
  // re-render a child still holding the state that broke it, and the user would
  // click a button that visibly does nothing. Asserting only that the alert
  // disappeared passes on both implementations; asserting that the child's own
  // state went back to its initial value distinguishes them.
  //
  // This is also what `react-error-boundary` does *not* give for free —
  // Task 1.7.6 built it before rejecting it, and its `resetErrorBoundary()`
  // clears the error state without remounting too.
  it("remounts its children on reset rather than re-rendering them", () => {
    // The child owns both its counter and its own crash, which is what makes
    // this a remount test at all. A first draft put the crash flag in a parent
    // above the boundary and it could not pass: the boundary remounts its
    // children, the parent's state is untouched, and the freshly mounted child
    // throws again on the spot. That is correct behaviour and it is worth
    // knowing — **a boundary reset recovers a child's own state, not the
    // state of whatever above it caused the failure.**
    function Counter() {
      const [count, setCount] = useState(0);
      const [crash, setCrash] = useState(false);

      if (crash) throw new Error(MESSAGE);

      return (
        <>
          <button
            type="button"
            onClick={() => {
              setCount(count + 1);
            }}
          >
            count {count}
          </button>
          <button
            type="button"
            onClick={() => {
              setCrash(true);
            }}
          >
            break it
          </button>
        </>
      );
    }

    render(
      <ErrorBoundary title="Failed">
        <Counter />
      </ErrorBoundary>,
    );

    // Put real state into the child, then break it.
    fireEvent.click(screen.getByRole("button", { name: "count 0" }));
    expect(screen.getByRole("button", { name: "count 1" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "break it" }));
    expect(screen.getByRole("alert")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    // Back to 0 — the child was remounted. A boundary that only cleared its
    // flag would re-render the same instance and show "count 1", and would
    // also throw again immediately, because `crash` would still be true.
    expect(screen.getByRole("button", { name: "count 0" })).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  // Measured in Task 1.7.6 and asserted here so it stays a known limit rather
  // than a surprise: a boundary catches errors thrown during render, in
  // lifecycle methods and in constructors — and nothing thrown in an event
  // handler. Neither does React's `onUncaughtError`. Story 1.12's server
  // endpoint is the reversal trigger for a `window` error listener; until then
  // the browser console is already the report.
  it("does not catch a throw from an event handler", () => {
    function ThrowsOnClick() {
      return (
        <button
          type="button"
          onClick={() => {
            throw new Error(MESSAGE);
          }}
        >
          click me
        </button>
      );
    }

    render(
      <ErrorBoundary title="Would be wrong to see">
        <ThrowsOnClick />
      </ErrorBoundary>,
    );

    // The throw does not come back out of `fireEvent` — React dispatches the
    // handler itself and reports the failure to the environment, so a first
    // draft asserting `expect(...).toThrow()` failed while the error surfaced
    // separately as an unhandled error that failed the whole run. Swallowing it
    // here is what makes the *product* behaviour assertable, and it is scoped
    // to this one click rather than installed for the file.
    //
    // That listener is also the thing the application deliberately does not
    // have: Task 1.7.6 measured that a `window` error listener was the only
    // way to see this throw at all, and declined to install one, because the
    // browser console already has it with its stack and a listener would also
    // catch every extension and third-party script on the page.
    const swallow = (event: ErrorEvent) => {
      event.preventDefault();
    };
    window.addEventListener("error", swallow);
    try {
      fireEvent.click(screen.getByRole("button", { name: "click me" }));
    } finally {
      window.removeEventListener("error", swallow);
    }

    // The boundary never engaged: no fallback, and the tree is intact.
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("button", { name: "click me" })).toBeDefined();
  });
});
