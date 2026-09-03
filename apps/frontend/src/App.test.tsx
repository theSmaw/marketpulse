// The route table, driven through the **real** `<BrowserRouter>`.
//
// This is the one file that deliberately does not use `renderWithContext`, and
// the reason is the point of the test. `App` contains its own `BrowserRouter`,
// so wrapping it in the helper's `MemoryRouter` would nest two routers; and
// re-declaring the five `<Route>`s inside a `MemoryRouter` would make this a
// test of a *copy* of the route table, which is exactly the thing that can
// drift from the one that ships. Driving `window.history` instead means the
// subject is `App.tsx` itself, `basename` and all.
//
// The gap this closes is stated in `paths.ts`: React Router's `to` is a plain
// string, so a mistyped path is silent until someone clicks it. `PATHS` narrows
// that to "a typo is an unknown property `tsc -b` catches" — but **nothing
// checks that a declared path has a route**, and this is the only mechanism
// that ever would. It is the third silent-failure class in this frontend,
// beside a misspelled CSS Module class and a missing `.js` import extension.

import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App.js";
import { PATHS } from "./routes/paths.js";

const NOT_FOUND_HEADING = "No such page";

function renderAt(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}

// `App` starts the backend health poll (Task 1.12.3), so rendering it makes a
// request. The stub is a `fetch` that never settles: the route table is what
// this file is about, and a request that resolves would write state after the
// assertions have run for no reason. The hook aborts it on unmount either way.
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise<Response>(() => undefined)),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.pushState({}, "", "/");
});

describe("the route table", () => {
  it.each(Object.entries(PATHS))(
    "renders a real route at PATHS.%s (%s)",
    (_name, path) => {
      renderAt(path);

      // The whole assertion: a declared path that has no `<Route>` falls
      // through to `*` and renders NotFound. Every route renders exactly one
      // `<h1>` — the product name in the header is deliberately a `<p>` — so
      // the heading is what identifies which one rendered.
      expect(
        screen.queryByRole("heading", { level: 1, name: NOT_FOUND_HEADING }),
      ).toBeNull();
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    },
  );

  it("gives every declared path a distinct screen", () => {
    const headings = Object.values(PATHS).map((path) => {
      const { unmount } = renderAt(path);
      const heading = screen.getByRole("heading", { level: 1 }).textContent;
      unmount();
      return heading;
    });

    expect(new Set(headings).size).toBe(Object.values(PATHS).length);
  });

  // `NotFound` is a **route**, not a fallback, so it only renders when the host
  // served `index.html` for an address that matched nothing. On a plain static
  // host a deep link is a 404 before React exists at all — measured in Task
  // 1.5.5, and it is Story 1.11's to configure. This asserts the router's half
  // and cannot assert the host's; do not read a pass here as deep-linking
  // working in production.
  it("renders the not-found route for an address that matches nothing", () => {
    renderAt("/nonsense");

    expect(
      screen.getByRole("heading", { level: 1, name: NOT_FOUND_HEADING }),
    ).toBeDefined();
  });

  it("offers a way back from the not-found route", () => {
    renderAt("/nonsense");

    // Scoped to `<main>`: the chrome's own "Market Overview" nav link is on
    // the page too, so an unscoped query finds two. That the recovery link is
    // inside the failed screen rather than only in the header is the part
    // worth asserting — Task 1.6.5 found a subpath deployment where every
    // chrome link pointed off the deployment, including this one, leaving no
    // screen a user could recover from.
    const main = screen.getByRole("main");
    const back = within(main).getByRole("link", { name: /Market Overview/u });
    expect(back.getAttribute("href")).toBe(PATHS.overview);
  });

  // The chrome renders on every route including the not-found state, which is
  // why route splitting could not move it off the first paint (Task 1.5.5).
  it("renders the chrome on every route, the not-found one included", () => {
    for (const path of [...Object.values(PATHS), "/nonsense"]) {
      const { unmount } = renderAt(path);
      expect(screen.getByRole("banner")).toBeDefined();
      expect(screen.getByRole("navigation", { name: "Primary" })).toBeDefined();
      unmount();
    }
  });
});
