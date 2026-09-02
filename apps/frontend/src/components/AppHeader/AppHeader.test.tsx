// The chrome. Two things here are decisions rather than markup, and both are
// asserted: the product name is deliberately *not* an `<h1>`, and the current
// route's accessible state and visible state are the same fact.

import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PATHS } from "../../routes/paths.js";
import { renderWithContext } from "../../test-render.js";
import { AppHeader } from "./AppHeader.js";

describe("AppHeader", () => {
  it("is a banner containing a named navigation", () => {
    renderWithContext(<AppHeader feedStatus="disconnected" />);

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
    renderWithContext(<AppHeader feedStatus="live" />);

    expect(screen.getByText("MarketPulse").tagName).toBe("P");
    expect(screen.queryByRole("heading", { name: "MarketPulse" })).toBeNull();
  });

  it("links to every path in the table, and only those", () => {
    renderWithContext(<AppHeader feedStatus="live" />);

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
    renderWithContext(<AppHeader feedStatus="live" />, { at: path });

    const current = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");

    expect(current).toHaveLength(1);
    expect(current[0]?.getAttribute("href")).toBe(path);
  });

  it("shows the feed state, which is never an error", () => {
    renderWithContext(
      <AppHeader
        feedStatus="disconnected"
        feedDetail="No market data until Epic 3"
      />,
    );

    expect(screen.getByText("disconnected")).toBeDefined();
    expect(screen.getByText("No market data until Epic 3")).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  // A reserved region, not a clock: `--:--:--` rather than a plausible-looking
  // `00:00:00`, which would be a fake time. Epic 3 supplies the real one.
  it("reserves the market clock without inventing a time", () => {
    renderWithContext(<AppHeader feedStatus="live" />);

    expect(screen.getByText("--:--:--")).toBeDefined();
    expect(screen.queryByText("00:00:00")).toBeNull();
  });
});
