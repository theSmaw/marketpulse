import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  BAR_SERIES_FIXTURE_NAMES,
  barSeriesFixtureResult,
  barSeriesFixtureView,
  barSeriesViewScreen,
  staleBarSeriesFixtureView,
  windowChangeFixtureScreen,
} from "../../fixtures/bar-series.js";
import type { BarSeriesView } from "../../market/index.js";
import { toBarSeriesView } from "../../market/index.js";
import { ChartAxis } from "../PriceChart/ChartAxis.js";
import type { BarSeriesPanelProps } from "./BarSeriesPanel.js";
import { BarSeriesPanel } from "./BarSeriesPanel.js";

// What the panel says in each of its six states, asserted against **recorded**
// bodies rather than hand-built ones (Task 2.10.7).
//
// Every `view` below comes from `barSeriesFixtureView`, which collapses a body
// the real endpoint served through the real `toBarSeriesView`. So these are
// assertions about what a reader sees when the server says a particular thing,
// rather than about what a component does with an object somebody typed — and a
// state this layer cannot actually reach cannot be asserted here by accident.
//
// **What is deliberately not asserted:** colour, which is structurally
// impossible — no stylesheet is applied in this environment, so `getTokens()`
// throws here and a browser is the only instrument that can see contrast. The
// amber-on-the-word defect this panel had was found by measuring in Chrome, not
// here, and no test in this file would have caught it.
//
// The panel renders no router link and no landmark, so `render()` directly
// rather than `renderWithContext` — a component that does not use the router
// should not acquire one.

const props = {
  symbol: "NVDA",
  defaulted: false,
  onRetry: () => undefined,
};

/**
 * The panel inside the axis its chart hangs on — which is how the route renders
 * it, since Task 2.13.4 put a second plot on that axis.
 *
 * `useChartAxis` throws outside a `ChartAxis` on purpose (`chart-axis-context.ts`
 * carries why), so this is the real arrangement rather than a convenience. The
 * axis is built from **what is drawn** since Task 2.13.7, which on a window
 * change is not always the answer to the request being made.
 */
function Screen(panelProps: BarSeriesPanelProps) {
  return (
    <ChartAxis view={panelProps.screen.shown}>
      <BarSeriesPanel {...panelProps} />
    </ChartAxis>
  );
}

/**
 * The same, for the ordinary case: one answer, to the request being made.
 *
 * Kept as a second harness rather than folded into {@link Screen} because it is
 * what nearly every test below is about, and because the screen it builds goes
 * through the **real** `toRequestedBarSeriesState` — so a test written this way
 * cannot hold a `screen` whose halves disagree, which is the combination
 * `barSeriesScreen` exists to make unreachable.
 */
function Panel({
  view,
  ...rest
}: Omit<BarSeriesPanelProps, "screen"> & { readonly view: BarSeriesView }) {
  return <Screen {...rest} screen={barSeriesViewScreen(view)} />;
}

/**
 * Query options that exclude the sentence written for a screen reader.
 *
 * **Needed since Task 2.10.8 gave this panel a live region**, and the reason is
 * worth stating rather than routing around: the announcement deliberately
 * repeats facts that are also on screen — visible text is written to be scanned
 * and an announcement to be heard once, out of context — so a text query that
 * does not say which channel it means now resolves to two elements and fails.
 *
 * That failure is the queries telling the truth. Every assertion about what a
 * *reader* sees says so here; the announcement has its own tests below, which
 * are the only ones that look inside `role="status"`.
 *
 * `aria-hidden` joined the list on 2026-09-13, for the rail's reservation: the
 * slot above the chart lays out a hidden copy of the in-flight sentence so the
 * picture cannot move when a real one appears, which puts a second *Still
 * showing …* in the DOM that no reader can read. Same rule as the live region —
 * a query that does not say which channel it means resolves to both.
 */
const VISIBLE = {
  ignore:
    "[role='status'], [aria-hidden='true'], [aria-hidden='true'] *, script, style",
} as const;

describe("BarSeriesPanel", () => {
  // **This asserted the opposite until 2026-09-14**, and the inversion is the
  // change rather than a relaxation: the panel carried an `h3` with the ticker
  // in it in every state, and it was a third statement of a fact the page
  // already made twice — `SecurityIdentity` sets the symbol at display size two
  // blocks above, and `Region` names this landmark `Price`. Neither of those is
  // this panel's to remove, so what went was the copy that was nobody's answer
  // to anything.
  //
  // Asserted as absence rather than deleted, because a panel that regrows its
  // own ticker is the two-surfaces-one-fact defect this repository has paid for
  // three times, and it would regrow silently.
  it("restates no symbol of its own, in any state", () => {
    for (const name of ["full", "refusedCap", "unavailable"] as const) {
      const { unmount } = render(
        <Panel {...props} view={barSeriesFixtureView(name)} />,
      );
      expect(screen.queryByRole("heading", { name: "NVDA" })).toBeNull();
      unmount();
    }
  });

  it("states no window figures of its own, because three surfaces already do", () => {
    // **2026-09-14 took four blocks off this panel**: the coverage sentence, the
    // `Asked for` / `Held` / `Bars` / `First → last` list, the chart's resting
    // invitation and — where it can be right — the feed row. What is left is the
    // picture, the four prices and the states that have no picture.
    //
    // None of it was the *only* home of anything. Coverage is drawn, as the
    // uncovered ground and the coverage edge, and spoken, in the chart's text
    // alternative, which counts it in the axis's own trading minutes; the window
    // is in the address and on the control; the bar count and the instants are
    // in the reading a pointer or an arrow key produces.
    //
    // The assertion is absence, which is worth one test rather than none: a
    // panel that grew a second copy of a figure the chart already states is the
    // two-surfaces-one-fact defect this repository has paid for three times.
    render(<Panel {...props} view={barSeriesFixtureView("partial")} />);

    expect(screen.queryByText(/Holding \d/, VISIBLE)).toBeNull();
    expect(screen.queryByText("Asked for", VISIBLE)).toBeNull();
    expect(screen.queryByText("Held", VISIBLE)).toBeNull();
    expect(screen.queryByText("First → last", VISIBLE)).toBeNull();

    // And it is still an answer rather than a failure: nothing offers to try
    // again.
    expect(screen.queryByRole("button")).toBeNull();
  });

  // **Four again since 2026-09-15, and the day `Close` spent out of the strip
  // is the whole point of this comment.** It left because the headline beside
  // the strip *is* the close, set at display size — a restatement in the
  // quietest type on the row. It came back because the redundancy was only
  // redundant while this panel's close was the only close on the screen: the
  // identity block two inches above states the *session's* official close from
  // a stored daily bar, this one is the last *minute* bar of the window, and on
  // 2026-09-11 they read 218.29 and 218.19. `5D Close`, in the same window
  // vocabulary as the other three, is what says which of the two this is.
  //
  // So the label is asserted **with its window qualifier** rather than as the
  // bare word: an unqualified `Close` here would be the defect this re-add
  // exists to repair, spelled the way it was before the repair.
  it("states the four prices from the bars it holds, close included", () => {
    render(<Panel {...props} view={barSeriesFixtureView("full")} />);

    for (const label of ["5D Open", "5D High", "5D Low", "5D Close"]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(screen.queryByText("Close", VISIBLE)).toBeNull();
    // The high is the highest high across the held bars rather than the last
    // bar's — the assertion that would fail if the reduction were a `[0]`.
    const high = screen.getByText("5D High").parentElement;
    expect(high?.textContent).toMatch(/\d+\.\d\d/);
  });

  it("says nothing about the feed where the chrome's own label is right", () => {
    // The masthead carries `FeedProvenance` on every screen. For a series whose
    // sources all name one feed, this row was that fact a second time — and the
    // recorded stitch is exactly that case rather than an exception: both of its
    // halves came from Alpaca's historical API, so two sources are one feed.
    for (const name of ["full", "stitched"] as const) {
      const { unmount } = render(
        <Panel {...props} view={barSeriesFixtureView(name)} />,
      );

      expect(screen.queryByText("Market feed", VISIBLE)).toBeNull();
      expect(screen.queryByText("All US exchanges", VISIBLE)).toBeNull();
      unmount();
    }
  });

  it("names both feeds when one series carries two", () => {
    // **The case invariant 6 exists for, and the one body no fixture can be.**
    // The free Alpaca plan is asymmetric — stored history is consolidated SIP
    // and the live stream is IEX — so from Epic 3 a stitched series genuinely
    // names two feeds and one page-level label is wrong about half of it. No
    // recorded body has two, because no shipped endpoint produces one yet.
    //
    // So this is the recorded stitch with **one field changed**, through the
    // real transition, rather than a view typed by hand: the shape, the bars and
    // the coverage are all the server's. The field is named here so the day a
    // two-feed body is recorded, this test is replaced by it rather than kept.
    const recorded = barSeriesFixtureResult("stitched");
    if (recorded.outcome !== "ok") throw new Error("the stitch is an answer");

    const [stored, tail] = recorded.data.series.provenance.sources;
    if (stored === undefined || tail === undefined) {
      throw new Error("the stitch has two sources");
    }

    render(
      <Panel
        {...props}
        view={toBarSeriesView(
          { state: "loading" },
          {
            ...recorded,
            data: {
              ...recorded.data,
              series: {
                ...recorded.data.series,
                provenance: {
                  ...recorded.data.series.provenance,
                  sources: [stored, { ...tail, feed: "iex" }],
                },
              },
            },
          },
        )}
      />,
    );

    expect(screen.getByText("Market feed", VISIBLE)).toBeTruthy();
    expect(screen.getByText("All US exchanges", VISIBLE)).toBeTruthy();
    expect(screen.getByText("IEX", VISIBLE)).toBeTruthy();
  });

  // The sentence this used to assert moved into the plot on 2026-09-14 —
  // `PriceChart.test.tsx` and `VolumeChart.test.tsx` now own it. What is left
  // here is the panel's own half of the state, and it is worth an assertion
  // rather than a deletion: `empty` is the one answer whose body is nothing, and
  // "renders nothing" is indistinguishable from "was never rendered" unless the
  // panel around it is checked at the same time.
  it("renders an empty series with a heading and no body of its own", () => {
    render(<Panel {...props} view={barSeriesFixtureView("empty")} />);

    // The panel rendered rather than collapsing: the chart's own text
    // alternative is there, which is the one thing an `empty` answer always
    // produces. (No visible heading — the panel stopped carrying one on
    // 2026-09-14, two changes earlier the same day.)
    expect(screen.getByText(/no line is drawn/)).toBeTruthy();

    // And it offers nothing to press. A window holding no bars is a correct
    // answer about the request rather than a failure to retry, so a button here
    // would be one that cannot work.
    expect(screen.queryByRole("button")).toBeNull();

    // The sentence is not in the panel's own body any more. Asserted, because
    // two copies is a Playwright strict-mode failure across the browser suite
    // and this is the level that catches it in milliseconds rather than in six
    // minutes. `pnpm invariants` holds the same claim over the source.
    expect(screen.queryByText(/We asked for/)).toBeNull();
  });

  it.each([
    ["refusedCap", "10,000"],
    ["refusedCalendar", "2028-12-31"],
    ["refusedUnknownSymbol", "ZZZZ"],
  ] as const)(
    "shows %s's own sentence, with no retry and no reference",
    (name, fragment) => {
      render(<Panel {...props} view={barSeriesFixtureView(name)} />);

      expect(
        screen.getByText(
          new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
          VISIBLE,
        ),
      ).toBeTruthy();

      // A refusal is a well-formed answer about the request: waiting never helps,
      // so a control would be a lie, and an id would be a support reference for
      // something that is working correctly.
      expect(screen.queryByRole("button")).toBeNull();
      expect(screen.queryByText(/Reference/)).toBeNull();
    },
  );

  it("offers a retry only where the contract says waiting will help", () => {
    const onRetry = vi.fn();
    render(
      <Panel
        {...props}
        onRetry={onRetry}
        view={barSeriesFixtureView("unavailable")}
      />,
    );

    const button = screen.getByRole("button", { name: "Try again" });
    button.click();
    expect(onRetry).toHaveBeenCalledTimes(1);

    expect(screen.getByText(/usually temporary/, VISIBLE)).toBeTruthy();
  });

  it("offers no retry for a failure that will happen again, and says so", () => {
    render(<Panel {...props} view={barSeriesFixtureView("incoherent")} />);

    expect(screen.queryByRole("button")).toBeNull();
    expect(
      screen.getByText(/will not change this answer/, VISIBLE),
    ).toBeTruthy();
  });

  it("shows the whole correlation id beside a failure, never a prefix", () => {
    const view = barSeriesFixtureView("unavailable");
    render(<Panel {...props} view={view} />);

    // The one internal identifier this product puts on screen, and it is only
    // ever whole — a prefix is unquotable, which defeats the entire purpose.
    const id = view.state === "failed" ? view.requestId : null;
    expect(id).not.toBeNull();
    expect(screen.getByText(id ?? "")).toBeTruthy();
  });

  it("keeps the failure's sentence on screen while a retry is in flight", () => {
    const failure = barSeriesFixtureView("unavailable");
    render(
      <Panel
        {...props}
        view={{
          ...failure,
          state: "failed",
          failure: "answered-badly",
          requestId: null,
          retryable: true,
          retrying: true,
        }}
      />,
    );

    // Returning to `loading` would take the failure off the screen while we
    // find out whether it is still true, and put it back a moment later — which
    // reads as the thing breaking twice.
    expect(screen.getByText(/usually temporary/, VISIBLE)).toBeTruthy();
    const button = screen.getByRole("button", { name: "Trying again…" });
    expect(button.hasAttribute("disabled")).toBe(true);
  });

  it("says search is a story away only when nobody named a security", () => {
    const { unmount } = render(
      <Panel {...props} defaulted view={barSeriesFixtureView("partial")} />,
    );
    expect(screen.getByText(/Showing a default security/)).toBeTruthy();
    unmount();

    render(<Panel {...props} view={barSeriesFixtureView("partial")} />);
    expect(screen.queryByText(/Showing a default security/)).toBeNull();
  });

  // --- Task 2.10.8: the two marks that are not about the answer ---

  it("says a held answer is being refreshed, without touching a number", () => {
    render(<Panel {...props} view={staleBarSeriesFixtureView("partial")} />);

    expect(screen.getByText(/Refreshing/)).toBeTruthy();

    // The point of the mark, asserted as what it does *not* do: every figure
    // the fresh answer will replace is still fully on screen and still says
    // exactly what it said. A treatment that emptied or replaced them would
    // pass a "there is a mark" assertion and fail the product.
    expect(screen.getByText("5D Open")).toBeTruthy();
    expect(screen.getAllByText(/\d+\.\d\d/).length).toBeGreaterThan(0);
  });

  it("shows no refreshing mark on an answer that just arrived", () => {
    render(<Panel {...props} view={barSeriesFixtureView("partial")} />);

    expect(screen.queryByText(/Refreshing/)).toBeNull();
  });

  it("marks an untracked security on its subject, not in its numbers", () => {
    render(
      <Panel
        {...props}
        symbol="AMD"
        view={barSeriesFixtureView("untracked")}
      />,
    );

    // A badge beside the ticker, because it qualifies the security rather than
    // this answer — it is still true under a partial series, an empty one, or
    // one being refreshed.
    expect(screen.getByText("Untracked")).toBeTruthy();
    expect(
      screen.getByText(/MarketPulse no longer tracks this security/, VISIBLE),
    ).toBeTruthy();

    // And the bars are still there. An untracked security keeps its history and
    // the route still serves it: this is not a 404 and not an absence.
    expect(screen.getByText("5D Open")).toBeTruthy();
  });

  it("says nothing about tracking for a security we still follow", () => {
    render(<Panel {...props} view={barSeriesFixtureView("full")} />);

    expect(screen.queryByText("Untracked")).toBeNull();
  });

  // --- Task 2.10.8: the live region ---

  it("renders a status region in every state, and never an alert", () => {
    // Both clauses are the mechanism rather than a preference. A live region
    // added at the same moment as its content is not reliably announced, so it
    // has to exist in every state — including the ones with nothing to say. And
    // `role="alert"` is `ErrorFallback`'s, which the browser suite reads as a
    // render failure on every route.
    for (const name of BAR_SERIES_FIXTURE_NAMES) {
      const { unmount } = render(
        <Panel {...props} view={barSeriesFixtureView(name)} />,
      );

      expect(screen.getAllByRole("status")).toHaveLength(1);
      expect(screen.queryAllByRole("alert")).toHaveLength(0);
      unmount();
    }
  });

  it("is silent while the first answer is still coming", () => {
    render(<Panel {...props} view={{ state: "loading" }} />);

    // Arriving at a page is not a change. A sentence here would never be heard
    // as an announcement and would only be a second copy of the visible line.
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("names its subject in every sentence it speaks", () => {
    // The page-level decision, asserted: `/securities` has two polite regions
    // and a screen reader queues them in an order neither component controls.
    // A sentence that names its own subject is complete in either order.
    for (const name of BAR_SERIES_FIXTURE_NAMES) {
      const { unmount } = render(
        <Panel {...props} view={barSeriesFixtureView(name)} />,
      );

      expect(
        screen.getByRole("status").textContent.startsWith("NVDA:"),
        `${name} did not name its subject`,
      ).toBe(true);
      unmount();
    }
  });

  it("keeps the same live region node across a change of state", () => {
    // The property a text assertion cannot see, and the one that decides
    // whether anything is announced at all: React must *update* this element
    // rather than unmount and recreate it. The browser suite asserts the same
    // thing against the real transition; this is the cheap half.
    const { rerender } = render(
      <Panel {...props} view={{ state: "loading" }} />,
    );
    const before = screen.getByRole("status");

    rerender(<Panel {...props} view={barSeriesFixtureView("partial")} />);

    expect(screen.getByRole("status")).toBe(before);
    expect(before.textContent).toContain("holding 60 bars");
  });

  it("says a held answer is held, so a refetch landing where it started is heard", () => {
    // A live region whose text does not change announces nothing, and a refetch
    // landing on an identical answer is the common case for a closed session's
    // bars. The stale clause is the text the region passes through and back out
    // of, which is what makes the return audible.
    const fresh = barSeriesFixtureView("partial");
    const { rerender } = render(<Panel {...props} view={fresh} />);
    const settled = screen.getByRole("status").textContent;

    rerender(<Panel {...props} view={staleBarSeriesFixtureView("partial")} />);
    const held = screen.getByRole("status").textContent;

    rerender(<Panel {...props} view={fresh} />);

    expect(held).not.toBe(settled);
    expect(screen.getByRole("status").textContent).toBe(settled);
  });

  it("does not read a correlation id aloud", () => {
    // A 36-character UUID spoken is thirty seconds of hex a listener cannot
    // hold or transcribe — the same judgement the universe table made about a
    // magnitude. It is on screen, selectable, and that is where it is useful.
    render(<Panel {...props} view={barSeriesFixtureView("unavailable")} />);

    const spoken = screen.getByRole("status").textContent;
    expect(spoken).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/u);
    expect(spoken).toContain(
      "A reference for this failure is shown beside it.",
    );
  });

  // **The fence came down at Task 2.12.4** and this assertion was changed
  // rather than deleted, for the reason the browser spec's was: an instrument
  // that is removed when it goes green stops being an instrument.
  //
  // What it asserted until 2026-09-12 was that this panel plotted nothing — no
  // canvas, no SVG — so that Story 2.12 would take the charting decision
  // against a data layer already known to be right. It now asserts the thing
  // that replaced it, and the thing that is easy to undo by accident: the
  // drawing has not replaced any of the stated facts.
  //
  // **The order inverted on 2026-09-14** and the assertion is now explicit
  // about it. The four prices moved onto the headline's row *above* the
  // picture, so that the volume plot — which hangs on this chart's axis and is
  // the next thing down the page — is not separated from it by a strip of
  // figures. Document order is the one property of this arrangement that jsdom
  // can see: it computes no layout, so nothing below `pnpm e2e` can tell where
  // any of this is drawn, but it does know what comes before what.
  //
  // It stays `svg` and not `canvas`, which is `CHARTING.md` §1's decision
  // showing through: a canvas here would mean the chart had quietly changed
  // renderer, and nothing else in this repository would notice.
  it("states the facts above the drawing, and drops none of them", () => {
    const { container } = render(
      <Panel {...props} view={barSeriesFixtureView("full")} />,
    );

    expect(container.querySelector("canvas")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();

    // An axis is sampled and it is niced, so it never states an exact fact.
    // These are the figures the picture rounds — **the three prices, since
    // 2026-09-14**, which is what is left of `CHARTING.md` §5's list once the
    // windows, the coverage sentence and the feed row came off. The rest of that
    // list did not go missing: it moved to surfaces that were already stating
    // it, which the test above this one asserts as absence here.
    for (const fact of ["5D Open", "5D High", "5D Low"]) {
      expect(screen.getByText(fact)).not.toBeNull();
    }

    // And they are above it. `DOCUMENT_POSITION_FOLLOWING` reads *the drawing
    // comes after the label*, which is the arrangement this change bought and
    // the one a well-meant tidy-up would undo by moving the strip back into the
    // body where it lived for two stories.
    const chart = container.querySelector("svg");
    expect(chart).not.toBeNull();
    expect(
      screen.getByText("5D Low").compareDocumentPosition(chart as Node) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

// --- Task 2.13.7: a window change, in every way it can end ---

describe("a window change", () => {
  // Acceptance criterion 4's second clause, which is the load-bearing one: **a
  // failed window change leaves the previous data visible and labelled rather
  // than blanking the page.** Every screen below is built by
  // `windowChangeFixtureScreen`, which runs the two requests through the real
  // transitions in the order `use-bar-series.ts` runs them — a hand-built
  // `screen` could hold a pair no sequence of requests can produce.

  it("keeps the previous window's figures while the new one is read", () => {
    render(
      <Screen
        {...props}
        screen={windowChangeFixtureScreen({
          held: "partial",
          heldSessions: 5,
          askedSessions: 21,
        })}
      />,
    );

    // The whole point, asserted as what did *not* happen: the figures are still
    // there, at full ink, unblanked.
    expect(screen.getByText("5D Open", VISIBLE)).toBeTruthy();
    expect(screen.getByText("5D High", VISIBLE)).toBeTruthy();
  });

  // **The qualifier follows the picture, not the request** (2026-09-14), and
  // this is the assertion that makes the qualifier safe to have at all.
  //
  // `5D OPEN` over five sessions of held bars is true while a 21-session answer
  // is in flight; `1M OPEN` over the same bars would be a **wrong number** on
  // screen rather than a missing one, and it is what taking the label off the
  // control — or off `screen.asked` alone — produces for as long as the held
  // answer is up. It is the two-windows-one-picture defect this panel exists to
  // make impossible, in the newest place it could appear.
  it("qualifies the held figures with the held window, not the one in flight", () => {
    render(
      <Screen
        {...props}
        screen={windowChangeFixtureScreen({
          held: "partial",
          heldSessions: 5,
          askedSessions: 21,
        })}
      />,
    );

    for (const label of ["5D Open", "5D High", "5D Low"]) {
      expect(screen.getByText(label, VISIBLE)).toBeTruthy();
    }
    expect(screen.queryByText(/^1M /, VISIBLE)).toBeNull();
  });

  // **This asserted the in-flight sentence until 2026-09-14** (§80), and the
  // inversion is the change rather than a relaxation. A window change costs
  // 2–9 ms warm and 7–68 ms cold on a local pair, so that sentence's whole
  // visible life was under a tenth of a second: text appearing and vanishing
  // over a chart that did not visibly change.
  //
  // **What must not go with it is the labelling**, which is the half that was
  // never about reading a sentence. §6.3's tension is resolved by the figures
  // carrying the window they belong to, and a held 5-session chart under
  // `1M Open` is the plausible-and-shifted defect this panel is most careful
  // about. So: no sentence, and the labels unchanged.
  it("labels the held figures with their own window and says nothing about it", () => {
    render(
      <Screen
        {...props}
        screen={windowChangeFixtureScreen({
          held: "partial",
          heldSessions: 5,
          askedSessions: 21,
        })}
      />,
    );

    expect(screen.queryByText(/Still showing/, VISIBLE)).toBeNull();
    expect(screen.getByText("5D Open", VISIBLE)).toBeTruthy();
    expect(screen.queryByText("1M Open", VISIBLE)).toBeNull();
  });

  it("keeps them and says what happened when the new window is refused", () => {
    render(
      <Screen
        {...props}
        screen={windowChangeFixtureScreen({
          held: "partial",
          heldSessions: 5,
          askedSessions: 1000,
          asked: "refusedCalendar",
        })}
      />,
    );

    expect(
      screen.getByText(
        /Still showing the 5-session window\. The 1,000-session window was not answered/,
        VISIBLE,
      ),
    ).toBeTruthy();

    // The server's own sentence, verbatim, beside a chart of a different
    // window — and no control, because waiting never helps.
    expect(screen.getByText(/trading calendar/, VISIBLE)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    expect(screen.getByText("5D Open", VISIBLE)).toBeTruthy();
  });

  it("keeps them and offers exactly one retry when the new window fails", () => {
    render(
      <Screen
        {...props}
        screen={windowChangeFixtureScreen({
          held: "partial",
          heldSessions: 5,
          askedSessions: 21,
          asked: "unavailable",
        })}
      />,
    );

    expect(
      screen.getByText(
        /Still showing the 5-session window\. The 21-session window could not be read/,
        VISIBLE,
      ),
    ).toBeTruthy();

    // **Exactly one.** The rail carries it; the body below it is a correct
    // answer to a window that did not fail, so a second control there would
    // offer to re-read something that worked.
    expect(screen.getAllByRole("button", { name: "Try again" })).toHaveLength(
      1,
    );
    expect(screen.getByText("5D Open", VISIBLE)).toBeTruthy();
  });

  it("drops the previous security's series rather than relabelling it", () => {
    // The fence. A held NVDA series under an AMD heading is plausible and wrong
    // rather than visibly broken — so a change of security blanks, exactly as
    // it did before this task, and the rail does not appear.
    render(
      <Screen
        {...props}
        symbol="AMD"
        screen={windowChangeFixtureScreen({
          held: "partial",
          heldSessions: 5,
          askedSessions: 5,
          askedSymbol: "AMD",
        })}
      />,
    );

    expect(screen.queryByText(/Still showing/, VISIBLE)).toBeNull();
    expect(screen.getByText(/Reading the series…/, VISIBLE)).toBeTruthy();
  });

  it("reserves the rail's slot in a state with no rail in it", () => {
    // **The chart must not move when a window is pressed** (2026-09-13). The rail
    // is rendered above the picture and only while a request is unanswered, so
    // the slot it goes in lays out a hidden copy of its sentence in every state
    // — which is the only reservation that is correct at more than one width,
    // because the sentence wraps at 390px and does not at 1440.
    //
    // jsdom computes no layout, so this asserts the **mechanism** and not the
    // pixels: that the hidden sentence is there, that it is out of the
    // accessibility tree, and that it is shaped like the rail it reserves for.
    // `e2e/specs/security-window-change.spec.ts` is the only instrument that can
    // see the chart's position.
    const { container } = render(
      <Panel {...props} view={barSeriesFixtureView("partial")} />,
    );

    expect(screen.queryByText(/Still showing/, VISIBLE)).toBeNull();

    const reserved = container.querySelectorAll("[aria-hidden='true']");
    const sentence = [...reserved]
      .map((node) => node.textContent)
      .find((text) => text.includes("Still showing"));

    // **The worst case moved on 2026-09-14** (§80): the in-flight sentence no
    // longer renders, so the longest thing that can reach this slot is the
    // failure one — four characters longer than the refusal, and the sentence
    // the slot must therefore be measured against.
    expect(sentence).toMatch(
      /Still showing the .*-session window\. The .*-session window could not be read\./,
    );
  });

  it("shows neither rail while a window is merely in flight", () => {
    // Two marks for one fact, and since §80 the answer is **neither**. A held
    // answer is not about to be refreshed — the request behind it has already
    // been superseded — and the sentence that used to say which window is on
    // screen is gone because nobody could read it. What is left on screen is
    // the previous window's chart, correctly labelled, and no prose at all.
    render(
      <Screen
        {...props}
        screen={windowChangeFixtureScreen({
          held: "partial",
          heldSessions: 5,
          askedSessions: 21,
        })}
      />,
    );

    expect(screen.queryByText(/Still showing/, VISIBLE)).toBeNull();
    expect(screen.queryByText(/^Refreshing/, VISIBLE)).toBeNull();
  });

  it("invents no number for a window the address did not name as a count", () => {
    // `?sessions=abc` reaches the server as `NaN`. The rail says *the window
    // asked for* and prints nothing, because a sentence built around a figure
    // is wrong for every window but one.
    render(
      <Screen
        {...props}
        screen={windowChangeFixtureScreen({
          held: "partial",
          heldSessions: 5,
          askedSessions: Number.NaN,
          asked: "refusedCalendar",
        })}
      />,
    );

    const rail = screen.getByText(/Still showing/, VISIBLE);
    expect(rail.textContent).toContain("The window asked for was not answered");
    expect(rail.textContent).not.toContain("NaN");
  });

  it("keeps a cached answer on screen when the refetch behind it fails", () => {
    // **Not a window change at all**, and the same rule covers it: an answer
    // painted from the cache, followed by a refetch that fails, used to be
    // replaced by a failure with no window in it.
    render(
      <Screen
        {...props}
        screen={windowChangeFixtureScreen({
          held: "partial",
          heldSessions: 5,
          askedSessions: 5,
          asked: "unavailable",
        })}
      />,
    );

    expect(screen.getByText("5D Open", VISIBLE)).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Try again" })).toHaveLength(
      1,
    );
  });
});
