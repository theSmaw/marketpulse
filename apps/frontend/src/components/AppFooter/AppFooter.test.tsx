// The status bar, and **this file is `AppHeader.test.tsx`'s other half**
// (2026-09-16). Every assertion below was one of that file's; what changed is
// the component under test and the landmark it lives in. Nothing was dropped in
// the move, including the one that is about the two indicators *together* —
// that was always a question about where they sit beside each other, and where
// they sit beside each other is here now.

import { screen, within } from "@testing-library/react";
import { CONNECTION_DESCRIPTIONS } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import { renderWithContext } from "../../test-render.js";
import { AppFooter, type AppFooterProps } from "./AppFooter.js";

/** Nothing observed. §11.1: absence is the answer, and `{}` is the true one. */
const NO_OBSERVATIONS = new Map();
/** Nothing was delivered by a snapshot — Task 3.5.4's baseline/arrival split. */
const NO_SNAPSHOT = new Set<string>();

// A file-local helper rather than a module: this package is `noEmit`, so a
// helper module would be legitimate here — but this one describes *these
// tests'* defaults rather than the application's context, and
// `test-render.tsx` is deliberately the only file that does the latter.
//
// The backend fields default to a settled healthy check so that the tests about
// the feed are about the feed. Every test that is about the backend passes its
// own.
const LAST_SUCCESS = new Date(2026, 8, 4, 10, 42, 17);

function props(overrides: Partial<AppFooterProps> = {}): AppFooterProps {
  return {
    marketFeed: { state: "configured", feed: "iex" },
    liveFeed: {
      status: "live",
      feed: "iex",
      backendReachable: true,
      observedAt: Date.parse("2026-09-16T14:01:00Z"),
      unreadable: 0,
      observations: NO_OBSERVATIONS,
      fromSnapshot: NO_SNAPSHOT,
      resumes: 0,
    },
    backendStatus: "healthy",
    backendDegradedCause: null,
    backendLastSuccessAt: LAST_SUCCESS,
    backendHasChecked: true,
    ...overrides,
  };
}

describe("AppFooter", () => {
  // The landmark, and it is new to this application rather than moved: the
  // chrome had a `banner` and nothing else until this component existed. It
  // matters for the same reason the banner does — a screen-reader user
  // navigating by landmark can reach the two facts about whether the software
  // is working without reading the page.
  it("is a contentinfo landmark", () => {
    renderWithContext(<AppFooter {...props()} />);

    expect(screen.getByRole("contentinfo")).toBeDefined();
  });

  // Task 2.6.7 replaced a hard-coded `DISCONNECTED` with the feed this
  // deployment is actually configured to read. What is asserted is the property
  // §7.1 requires — a reader is told what the feed covers in a **sentence**,
  // because an acronym tells a non-specialist nothing — and that none of it is
  // an error, because a single-venue feed is a product state (§36).
  it("says which feed it reads, in a sentence, and never as an error", () => {
    renderWithContext(
      <AppFooter
        {...props({ marketFeed: { state: "configured", feed: "iex" } })}
      />,
    );

    expect(screen.getByText("IEX")).toBeDefined();
    expect(
      screen.getByText(/not the full US consolidated tape/i),
    ).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  // The value this replaced. A hard-coded status word in the chrome is the one
  // thing Task 2.6.7 exists to remove, and this is what would go red if a
  // future change put a connection state back into this bar without a
  // connection behind it.
  // **This test asserted the opposite until 2026-09-19**, and the change is the
  // whole of Task 3.3.5: the connection word was absent because the only value
  // available for it was invented, and the chrome rendered a hard-coded
  // `disconnected` from Story 1.5 to Story 2.6. It is now read from the running
  // system, so what has to be guarded is that it comes from the shipped record
  // rather than from a string in this component.
  it("renders the connection state, from the shipped vocabulary", () => {
    renderWithContext(<AppFooter {...props()} />);

    expect(screen.getByText(CONNECTION_DESCRIPTIONS.live.label)).toBeDefined();
  });

  it("renders NO connection word where §11.3's grid draws a dash", () => {
    // A deployment with no provider. `DISCONNECTED` here would claim a feed
    // broke when none was ever asked for — and the wire cannot tell the two
    // apart on the status alone, which is why the feed identity decides.
    renderWithContext(
      <AppFooter
        {...props({
          marketFeed: { state: "not-configured" },
          liveFeed: {
            status: "disconnected",
            feed: null,
            backendReachable: true,
            observedAt: undefined,
            unreadable: 0,
            observations: NO_OBSERVATIONS,
            fromSnapshot: NO_SNAPSHOT,
            resumes: 0,
          },
        })}
      />,
    );

    expect(
      screen.queryByText(CONNECTION_DESCRIPTIONS.disconnected.label),
    ).toBeNull();
    expect(screen.getByText("not configured")).toBeDefined();
  });

  // The default deployment, and the state a correct first run shows.
  //
  // **The live feed's own tape is `null` here, and that is not padding**
  // (Task 3.10.6). `createMarketStream` answers `undefined` for a `none`
  // selection, so a deployment with no provider constructs **no stream** and
  // can report no live tape. Leaving the fixture's default `iex` in place
  // builds the pair `market-feed-grid.test.ts` marks unreachable — and since
  // the venue now follows the live tape, this test was asserting against a
  // deployment that cannot exist.
  it("says so when no market-data provider is configured", () => {
    renderWithContext(
      <AppFooter
        {...props({
          marketFeed: { state: "not-configured" },
          liveFeed: { ...props().liveFeed, feed: null },
        })}
      />,
    );

    expect(screen.getByText("not configured")).toBeDefined();
    expect(
      screen.getByText(/No market-data provider is configured/),
    ).toBeDefined();
  });

  // The whole of Task 1.12.5's visible half, and it survived becoming a footer:
  // the bar carries **two** indicators, and they report two facts that fail
  // independently. This is the assertion that would fail if somebody collapsed
  // them back into one.
  it("shows the backend service beside the market feed, as two labelled cells", () => {
    renderWithContext(
      <AppFooter
        {...props({
          marketFeed: { state: "not-configured" },
          // See above: no provider means no stream, so no live tape either.
          liveFeed: { ...props().liveFeed, feed: null },
          backendStatus: "healthy",
        })}
      />,
    );

    expect(screen.getByText("Market feed")).toBeDefined();
    expect(screen.getByText("Backend service")).toBeDefined();
    // The two disagreeing, which is the whole argument for there being two of
    // them: a healthy backend that is reading no market feed at all is the
    // correct rendering of a correct first run.
    expect(screen.getByText("not configured")).toBeDefined();
    expect(screen.getByText("healthy")).toBeDefined();
  });

  // Before the first poll settles the hook's `status` reads `unreachable`,
  // which is true and uninteresting. Rendering it would report the client's own
  // startup as a fact about the server on every single page load, which is the
  // opposite of §36 — so the bar must pass `hasChecked` through rather than
  // defaulting it.
  it("renders the placeholder rather than a state before the first check", () => {
    renderWithContext(
      <AppFooter
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
  // `FeedProvenance` holds, asserted here because this is where the two meet.
  // An unreachable backend must not reach `ErrorBoundary` and must not render
  // as an alert.
  it("reports an unreachable backend as a state, not an error", () => {
    renderWithContext(
      <AppFooter
        {...props({
          backendStatus: "unreachable",
          backendLastSuccessAt: LAST_SUCCESS,
        })}
      />,
    );

    expect(screen.getByText("unreachable")).toBeDefined();
    expect(screen.getByText("Last confirmed 10:42:17 local")).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  // Both facts stay inside the landmark, which is what makes "jump to the
  // status bar" a thing a screen-reader user can do. It would break silently:
  // a cell rendered as a sibling of the `<footer>` rather than a child looks
  // identical on screen.
  it("keeps both facts inside the landmark", () => {
    renderWithContext(<AppFooter {...props()} />);

    const bar = screen.getByRole("contentinfo");
    expect(within(bar).getByText("Market feed")).toBeDefined();
    expect(within(bar).getByText("Backend service")).toBeDefined();
  });
});
