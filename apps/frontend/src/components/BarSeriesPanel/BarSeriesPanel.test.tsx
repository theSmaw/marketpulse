import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  BAR_SERIES_FIXTURE_NAMES,
  barSeriesFixtureView,
  barSeriesViewScreen,
  staleBarSeriesFixtureView,
  windowChangeFixtureScreen,
} from "../../fixtures/bar-series.js";
import type { BarSeriesView } from "../../market/index.js";
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
 */
const VISIBLE = { ignore: "[role='status'], script, style" } as const;

describe("BarSeriesPanel", () => {
  it("names the security in every state, including the ones with no series", () => {
    for (const name of ["full", "refusedCap", "unavailable"] as const) {
      const { unmount } = render(
        <Panel {...props} view={barSeriesFixtureView(name)} />,
      );
      expect(screen.getByRole("heading", { name: "NVDA" })).toBeTruthy();
      unmount();
    }
  });

  it("says it holds all of a complete window rather than saying nothing", () => {
    render(<Panel {...props} view={barSeriesFixtureView("full")} />);

    // Silence on a complete answer would make "we hold all of it" and "nobody
    // checked" look identical, which is the distinction this panel exists for.
    expect(screen.getByText(/Holding all 30 bars/)).toBeTruthy();
  });

  it("renders a short answer as an answer, naming where it stops", () => {
    render(<Panel {...props} view={barSeriesFixtureView("partial")} />);

    // The two facts a reader acts on: how much, and through when. Both come off
    // the response — `covered.end` — and never from a constant.
    const coverage = screen.getByText(/Holding 60 bars/);
    expect(coverage.textContent).toContain("2026-09-04 16:00:00 EDT");
    expect(coverage.textContent).toContain("less than the window asked for");

    // And it is not a failure: nothing offers to try again.
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows both windows, so the reader can see what was asked for", () => {
    render(<Panel {...props} view={barSeriesFixtureView("partial")} />);

    // Asserted as the concatenation a screen reader is handed rather than as
    // one element's text, because the term and its definition are two nodes.
    const asked = screen.getByText("Asked for").parentElement;
    expect(asked?.textContent).toContain("2026-09-05 16:00:00 EDT");

    const held = screen.getByText("Held").parentElement;
    expect(held?.textContent).toContain("2026-09-04 16:00:00 EDT");
  });

  it("renders market timestamps in market time, with the zone named", () => {
    render(<Panel {...props} view={barSeriesFixtureView("full")} />);

    // The 13:30Z bar is the 09:30 bar. A panel rendering it in the runner's own
    // zone is the same defect as a window resolved from the browser's clock:
    // plausible, shifted, and invisible to anyone not looking for it. The zone
    // abbreviation is what makes it checkable at all.
    const first = screen.getByText("First → last").parentElement;
    expect(first?.textContent).toContain("Sep 4 · 09:30 EDT");
  });

  it("states a daily bar as a session rather than as a midnight event", () => {
    // **The row is two bars and not two windows**, which is why it spells them
    // the way both readout strips do (Task 2.13.6). Before the `1d` window was
    // reachable this row read `2026-06-12 00:00:00 EDT`, which is a whole
    // session's trading wearing the timestamp of the hour it was stamped at —
    // the vendor stamps a daily bar at midnight market time.
    render(<Panel {...props} view={barSeriesFixtureView("daily")} />);

    const first = screen.getByText("First → last").parentElement;
    expect(first?.textContent).toContain("Jun 12");
    expect(first?.textContent).not.toContain("00:00");
  });

  it("states the four prices from the bars it holds", () => {
    render(<Panel {...props} view={barSeriesFixtureView("full")} />);

    for (const label of ["Open", "High", "Low", "Close"]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    // The high is the highest high across the held bars rather than the last
    // bar's — the assertion that would fail if the reduction were a `[0]`.
    const high = screen.getByText("High").parentElement;
    expect(high?.textContent).toMatch(/\d+\.\d\d/);
  });

  it("labels the feed in the shipped vocabulary rather than a slug", () => {
    render(<Panel {...props} view={barSeriesFixtureView("full")} />);

    // `MARKET_FEED_DESCRIPTIONS`' words, and the rule that a label gets a
    // sentence only when it cannot stand alone — `All US exchanges` can, so
    // there is deliberately no second line here.
    expect(screen.getByText("Market feed")).toBeTruthy();
    expect(screen.getByText("All US exchanges")).toBeTruthy();
    expect(screen.queryByText(/sip/i)).toBeNull();
  });

  it("names every distinct feed of a stitched series", () => {
    render(<Panel {...props} view={barSeriesFixtureView("stitched")} />);

    // Both recorded sources are SIP, so this renders **one** label for two
    // sources — which is the correct behaviour and the reason the assertion is
    // on distinctness rather than on a count of sources. Epic 3's IEX socket is
    // what makes this row show two.
    expect(screen.getAllByText("All US exchanges")).toHaveLength(1);
  });

  it("renders an empty series as an answer about a window", () => {
    render(<Panel {...props} view={barSeriesFixtureView("empty")} />);

    expect(screen.getByText(/No bars stored for this window/)).toBeTruthy();
    // It still says what was asked for. A panel that dropped the window would
    // leave "no data" with nothing to be about.
    expect(screen.getByText(/We asked for/).textContent).toContain("EDT");
    expect(screen.queryByRole("button")).toBeNull();
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
    expect(screen.getByText(/Holding 60 bars/)).toBeTruthy();
    expect(screen.getByText("Open")).toBeTruthy();
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
    expect(screen.getByText(/Holding all 30 bars/)).toBeTruthy();
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
  // drawing is **above** the stated facts and has not replaced any of them.
  //
  // It stays `svg` and not `canvas`, which is `CHARTING.md` §1's decision
  // showing through: a canvas here would mean the chart had quietly changed
  // renderer, and nothing else in this repository would notice.
  it("draws the series above the facts, and drops none of them", () => {
    const { container } = render(
      <Panel {...props} view={barSeriesFixtureView("full")} />,
    );

    expect(container.querySelector("canvas")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();

    // An axis is sampled and it is niced, so it never states an exact fact.
    // These are the figures the picture rounds, and `CHARTING.md` §5 dropped
    // none of them.
    for (const fact of ["Open", "Asked for", "Held", "Market feed"]) {
      expect(screen.getByText(fact)).not.toBeNull();
    }
    expect(
      screen.getByText(/Holding all 30 bars of the window asked for/),
    ).not.toBeNull();
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
    expect(screen.getByText(/Holding 60 bars/, VISIBLE)).toBeTruthy();
    expect(screen.getByText("Open", VISIBLE)).toBeTruthy();
  });

  it("names both windows, so the old one cannot be mistaken for the new", () => {
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

    // `VOLUME-AND-WINDOW.md` §6.3's tension resolved: the previous window's
    // series is a true picture of the previous window, and stays true only
    // because the label above says which window it is of.
    expect(
      screen.getByText(
        /Still showing the 5-session window while the 21-session window is read/,
        VISIBLE,
      ),
    ).toBeTruthy();
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
    expect(screen.getByText(/Holding 60 bars/, VISIBLE)).toBeTruthy();
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
    expect(screen.getByText(/Holding 60 bars/, VISIBLE)).toBeTruthy();
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

  it("shows the refreshing rail and the held-window rail never together", () => {
    // Two marks for one fact. A held answer is not about to be refreshed — the
    // request behind it has already been superseded — so the screen says one
    // thing or the other.
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

    expect(screen.getByText(/Still showing/, VISIBLE)).toBeTruthy();
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

    expect(screen.getByText(/Holding 60 bars/, VISIBLE)).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Try again" })).toHaveLength(
      1,
    );
  });
});
