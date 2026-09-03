// The chrome. Two things here are decisions rather than markup, and both are
// asserted: the product name is deliberately *not* an `<h1>`, and the current
// route's accessible state and visible state are the same fact.

import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PATHS } from "../../routes/paths.js";
import { renderWithContext } from "../../test-render.js";
import { AppHeader, type AppHeaderProps } from "./AppHeader.js";

// A file-local helper rather than a module: this package is `noEmit`, so a
// helper module would be legitimate here — but this one describes *these
// tests'* defaults rather than the application's context, and
// `test-render.tsx` is deliberately the only file that does the latter.
//
// The backend fields default to a settled healthy check so that the tests about
// the feed, the navigation and the clock are about those things. Every test
// that is about the backend passes its own.
const LAST_SUCCESS = new Date(2026, 8, 4, 10, 42, 17);

function props(overrides: Partial<AppHeaderProps> = {}): AppHeaderProps {
  return {
    feedStatus: "live",
    backendStatus: "healthy",
    backendDegradedCause: null,
    backendLastSuccessAt: LAST_SUCCESS,
    backendHasChecked: true,
    ...overrides,
  };
}

describe("AppHeader", () => {
  it("is a banner containing a named navigation", () => {
    renderWithContext(<AppHeader {...props({ feedStatus: "disconnected" })} />);

    const banner = screen.getByRole("banner");
    expect(
      within(banner).getByRole("navigation", { name: "Primary" }),
    ).toBeDefined();
  });

  // Task 1.5.2 demoted the product name to a `<p>` on purpose: every route
  // renders its own `<h1>`, and two on a page leaves a screen reader user with
  // no single answer to "what is this page?". Promoting it back would
  // reintroduce that on every route at once, which is why this is a test.
  it("does not make the product name a heading", () => {
    renderWithContext(<AppHeader {...props()} />);

    expect(screen.getByText("MarketPulse").tagName).toBe("P");
    expect(screen.queryByRole("heading", { name: "MarketPulse" })).toBeNull();
  });

  it("links to every path in the table, and only those", () => {
    renderWithContext(<AppHeader {...props()} />);

    const nav = screen.getByRole("navigation", { name: "Primary" });
    const hrefs = within(nav)
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));

    expect(hrefs).toStrictEqual(Object.values(PATHS));
  });

  // `NavLink` sets `aria-current="page"` on the match itself, so there is one
  // fact rather than two — the stylesheet selects on the same attribute a
  // screen reader announces. `end` on the landing route is what stops `/`
  // matching every path beneath it, and that is the half worth asserting.
  it.each(Object.values(PATHS))("marks %s as the current page", (path) => {
    renderWithContext(<AppHeader {...props()} />, { at: path });

    const current = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");

    expect(current).toHaveLength(1);
    expect(current[0]?.getAttribute("href")).toBe(path);
  });

  it("shows the feed state, which is never an error", () => {
    renderWithContext(
      <AppHeader
        {...props({
          feedStatus: "disconnected",
          feedDetail: "No market data until Epic 3",
        })}
      />,
    );

    expect(screen.getByText("disconnected")).toBeDefined();
    expect(screen.getByText("No market data until Epic 3")).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  // A reserved region, not a clock: `--:--:--` rather than a plausible-looking
  // `00:00:00`, which would be a fake time. Epic 3 supplies the real one.
  it("reserves the market clock without inventing a time", () => {
    renderWithContext(<AppHeader {...props()} />);

    expect(screen.getByText("--:--:--")).toBeDefined();
    expect(screen.queryByText("00:00:00")).toBeNull();
  });

  // The whole of Task 1.12.5's visible half: the strip carries **two**
  // indicators, and they report two facts that fail independently. This is the
  // assertion that would fail if somebody collapsed them back into one.
  it("shows the backend service beside the market feed, as two labelled regions", () => {
    renderWithContext(
      <AppHeader
        {...props({ feedStatus: "disconnected", backendStatus: "healthy" })}
      />,
    );

    expect(screen.getByText("Market feed")).toBeDefined();
    expect(screen.getByText("Backend service")).toBeDefined();
    expect(screen.getByText("disconnected")).toBeDefined();
    expect(screen.getByText("healthy")).toBeDefined();
  });

  // Before the first poll settles the hook's `status` reads `unreachable`,
  // which is true and uninteresting. Rendering it would report the client's own
  // startup as a fact about the server on every single page load, which is the
  // opposite of §36 — so the header must pass `hasChecked` through rather than
  // defaulting it.
  it("renders the placeholder rather than a state before the first check", () => {
    renderWithContext(
      <AppHeader
        {...props({
          backendStatus: "unreachable",
          backendLastSuccessAt: null,
          backendHasChecked: false,
        })}
      />,
    );

    expect(screen.getByText("checking")).toBeDefined();
    expect(screen.queryByText("unreachable")).toBeNull();
  });

  // None of the backend's states is an error either — the same property
  // `FeedIndicator` holds, asserted here because this is where the two meet.
  // An unreachable backend must not reach `ErrorBoundary` and must not render
  // as an alert; the interface around it goes on working.
  it("reports an unreachable backend as a state, not an error", () => {
    renderWithContext(
      <AppHeader
        {...props({
          backendStatus: "unreachable",
          backendLastSuccessAt: LAST_SUCCESS,
        })}
      />,
    );

    expect(screen.getByText("unreachable")).toBeDefined();
    expect(screen.getByText("Last confirmed 10:42:17")).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
    // The navigation is untouched by the backend being unreachable, which is
    // the "rest of the interface remains usable" criterion at this level.
    expect(
      within(screen.getByRole("navigation", { name: "Primary" })).getAllByRole(
        "link",
      ),
    ).toHaveLength(Object.values(PATHS).length);
  });
});
