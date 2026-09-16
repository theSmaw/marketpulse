// The chrome. Two things here are decisions rather than markup, and both are
// asserted: the product name is deliberately *not* an `<h1>`, and the current
// route's accessible state and visible state are the same fact.
//
// **The feed and backend assertions moved to `AppFooter.test.tsx` on
// 2026-09-16** with the indicators themselves. Nothing was dropped in the move
// — including the one that is about the two of them *together*, which is now a
// question about the footer rather than about the chrome. What stayed here is
// what is still true of this component: it is a banner, it holds the primary
// navigation, and it holds the clock.

import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PATHS } from "../../routes/paths.js";
import { renderWithContext } from "../../test-render.js";
import { AppHeader } from "./AppHeader.js";

describe("AppHeader", () => {
  it("is a banner containing a named navigation", () => {
    renderWithContext(<AppHeader />);

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
    renderWithContext(<AppHeader />);

    expect(screen.getByText("MarketPulse").tagName).toBe("P");
    expect(screen.queryByRole("heading", { name: "MarketPulse" })).toBeNull();
  });

  it("links to every path in the table, and only those", () => {
    renderWithContext(<AppHeader />);

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
    renderWithContext(<AppHeader />, { at: path });

    const current = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");

    expect(current).toHaveLength(1);
    expect(current[0]?.getAttribute("href")).toBe(path);
  });

  // The region reserved `--:--:--` from Story 1.5 to Story 2.5 and holds a real
  // clock since Task 2.5.5. The placeholder is asserted **absent** as well as
  // the shape being asserted present, because the failure that matters is a
  // clock that renders a placeholder for ever — which is what a hook that never
  // ticks or a `reading` that never arrives looks like from here.
  //
  // The shape rather than a value, and deliberately: this reads the real system
  // clock, so any literal would be wrong a second later. What is asserted about
  // the *value* is asserted in `MarketClock.test.tsx`, against instants, and the
  // fact that it **advances** is asserted in the browser suite, which is the one
  // level that can see a timer run.
  it("renders a real market clock rather than the reserved placeholder", () => {
    renderWithContext(<AppHeader />);

    expect(screen.getByText(/^\d{2}:\d{2}:\d{2}$/)).toBeDefined();
    expect(screen.queryByText("--:--:--")).toBeNull();
    expect(screen.getByText("ET")).toBeDefined();
  });

  // The navigation is untouched by anything the footer reports, which is the
  // "rest of the interface remains usable" criterion at this level — and it is
  // structurally true now rather than asserted-and-hoped, because this
  // component no longer takes the backend's state at all. Kept because the
  // property is what matters, not the mechanism that currently guarantees it.
  it("renders the whole navigation with no application state at all", () => {
    renderWithContext(<AppHeader />);

    expect(
      within(screen.getByRole("navigation", { name: "Primary" })).getAllByRole(
        "link",
      ),
    ).toHaveLength(Object.values(PATHS).length);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
