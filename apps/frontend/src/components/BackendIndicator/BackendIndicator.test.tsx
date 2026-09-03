// A backend state is a marker *shape* plus a word, and the word is what a test
// can see. Colour is deliberately not asserted anywhere here, and that is
// structural rather than a discipline: no global stylesheet is applied under
// jsdom, so `getComputedStyle` returns nothing and `getTokens()` throws. What
// is assertable is the text, the accessible name and the absence of an alert.
//
// `render()` directly rather than `renderWithContext`: this component uses no
// router, and a leaf that acquires one it does not need is a leaf whose test
// stops being about the leaf.

import { BACKEND_STATUSES } from "@marketpulse/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BackendIndicator } from "./BackendIndicator.js";

const AT = new Date(2026, 8, 4, 10, 42, 17);

describe("BackendIndicator", () => {
  it.each(BACKEND_STATUSES)("names the %s state in text", (status) => {
    render(
      <BackendIndicator
        status={status}
        degradedCause={status === "degraded" ? "not-ok-status" : null}
        lastSuccessAt={AT}
        hasChecked
      />,
    );

    expect(screen.getByText(status)).toBeDefined();
  });

  // §36 makes a lost connection a product state, not a failure. A component
  // that grew an `alert` role would make a working application look broken —
  // which is the global error screen the spec forbids, arriving one strip at a
  // time.
  it("is never announced as an error, in any state", () => {
    for (const status of BACKEND_STATUSES) {
      const { unmount } = render(
        <BackendIndicator
          status={status}
          degradedCause={null}
          lastSuccessAt={AT}
          hasChecked
        />,
      );
      expect(screen.queryByRole("alert")).toBeNull();
      unmount();
    }
  });

  describe("before the first check settles", () => {
    // The whole reason `hasChecked` exists. The hook's `status` reads
    // `unreachable` here, and rendering that word would report the client's own
    // startup as a fact about the server.
    it("renders the placeholder rather than the status it was given", () => {
      render(
        <BackendIndicator
          status="unreachable"
          degradedCause={null}
          lastSuccessAt={null}
          hasChecked={false}
        />,
      );

      expect(screen.getByText("checking")).toBeDefined();
      expect(screen.queryByText("unreachable")).toBeNull();
    });

    it("says nothing about a last successful check", () => {
      render(
        <BackendIndicator
          status="unreachable"
          degradedCause={null}
          lastSuccessAt={null}
          hasChecked={false}
        />,
      );

      expect(screen.queryByText(/successful check/i)).toBeNull();
      expect(screen.queryByText(/Last confirmed/i)).toBeNull();
    });
  });

  describe("the last successful check time", () => {
    it("is an absolute 24-hour clock time, zero-padded", () => {
      render(
        <BackendIndicator
          status="unreachable"
          degradedCause={null}
          lastSuccessAt={new Date(2026, 8, 4, 9, 5, 3)}
          hasChecked
        />,
      );

      expect(screen.getByText("Last confirmed 09:05:03")).toBeDefined();
    });

    it("is shown when degraded and when unreachable", () => {
      const { unmount } = render(
        <BackendIndicator
          status="degraded"
          degradedCause="not-ok-status"
          lastSuccessAt={AT}
          hasChecked
        />,
      );
      expect(screen.getByText("Last confirmed 10:42:17")).toBeDefined();
      unmount();

      render(
        <BackendIndicator
          status="unreachable"
          degradedCause={null}
          lastSuccessAt={AT}
          hasChecked
        />,
      );
      expect(screen.getByText("Last confirmed 10:42:17")).toBeDefined();
    });

    // Healthy means the check that just ran succeeded, so a timestamp beside it
    // is a second copy of the same fact, ageing by up to a poll interval.
    it("is not shown when healthy", () => {
      render(
        <BackendIndicator
          status="healthy"
          degradedCause={null}
          lastSuccessAt={AT}
          hasChecked
        />,
      );

      expect(screen.queryByText(/Last confirmed/i)).toBeNull();
    });

    // The state a wrong `VITE_API_BASE_URL` produces. An empty space where a
    // time should be reads as a component that forgot one.
    it("says so when there has never been a successful check", () => {
      render(
        <BackendIndicator
          status="unreachable"
          degradedCause={null}
          lastSuccessAt={null}
          hasChecked
        />,
      );

      expect(screen.getByText("No successful check yet.")).toBeDefined();
    });
  });

  describe("the degraded cause", () => {
    // The slugs are never rendered — neither is a sentence anybody can act on
    // — but the two causes are genuinely different diagnoses, so each selects
    // its own sentence rather than being collapsed or hidden in a `title`.
    it("selects a different sentence for each cause, and renders no slug", () => {
      const { unmount } = render(
        <BackendIndicator
          status="degraded"
          degradedCause="not-ok-status"
          lastSuccessAt={AT}
          hasChecked
        />,
      );
      const withStatus = screen.getByText(/answered/i).textContent;
      expect(screen.queryByText("not-ok-status")).toBeNull();
      unmount();

      render(
        <BackendIndicator
          status="degraded"
          degradedCause="unreadable-body"
          lastSuccessAt={AT}
          hasChecked
        />,
      );
      const withBody = screen.getByText(/answered/i).textContent;
      expect(screen.queryByText("unreadable-body")).toBeNull();

      expect(withStatus).not.toEqual(withBody);
    });

    it("is not rendered in any other state", () => {
      render(
        <BackendIndicator
          status="healthy"
          degradedCause={null}
          lastSuccessAt={AT}
          hasChecked
        />,
      );

      expect(screen.queryByText(/answered/i)).toBeNull();
    });
  });

  // The rule Task 1.12.2 settled beside the type that carries an id: it is a
  // labelled reference beside a failure the user is being asked to report, and
  // this reports a state. There is nothing here to quote — and no prop that
  // could carry one, which is the structural half of the same answer.
  it("shows no request id and no version", () => {
    const { container } = render(
      <BackendIndicator
        status="degraded"
        degradedCause="not-ok-status"
        lastSuccessAt={AT}
        hasChecked
      />,
    );

    expect(container.textContent).not.toMatch(/request/i);
    expect(container.textContent).not.toMatch(/0\.0\.0/);
  });
});
