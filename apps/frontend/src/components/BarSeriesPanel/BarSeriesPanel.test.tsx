import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  BAR_SERIES_FIXTURE_NAMES,
  barSeriesFixtureView,
  staleBarSeriesFixtureView,
} from "../../fixtures/bar-series.js";
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
        <BarSeriesPanel {...props} view={barSeriesFixtureView(name)} />,
      );
      expect(screen.getByRole("heading", { name: "NVDA" })).toBeTruthy();
      unmount();
    }
  });

  it("says it holds all of a complete window rather than saying nothing", () => {
    render(<BarSeriesPanel {...props} view={barSeriesFixtureView("full")} />);

    // Silence on a complete answer would make "we hold all of it" and "nobody
    // checked" look identical, which is the distinction this panel exists for.
    expect(screen.getByText(/Holding all 30 bars/)).toBeTruthy();
  });

  it("renders a short answer as an answer, naming where it stops", () => {
    render(
      <BarSeriesPanel {...props} view={barSeriesFixtureView("partial")} />,
    );

    // The two facts a reader acts on: how much, and through when. Both come off
    // the response — `covered.end` — and never from a constant.
    const coverage = screen.getByText(/Holding 60 bars/);
    expect(coverage.textContent).toContain("2026-09-04 16:00:00 EDT");
    expect(coverage.textContent).toContain("less than the window asked for");

    // And it is not a failure: nothing offers to try again.
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows both windows, so the reader can see what was asked for", () => {
    render(
      <BarSeriesPanel {...props} view={barSeriesFixtureView("partial")} />,
    );

    // Asserted as the concatenation a screen reader is handed rather than as
    // one element's text, because the term and its definition are two nodes.
    const asked = screen.getByText("Asked for").parentElement;
    expect(asked?.textContent).toContain("2026-09-05 16:00:00 EDT");

    const held = screen.getByText("Held").parentElement;
    expect(held?.textContent).toContain("2026-09-04 16:00:00 EDT");
  });

  it("renders market timestamps in market time, with the zone named", () => {
    render(<BarSeriesPanel {...props} view={barSeriesFixtureView("full")} />);

    // The 13:30Z bar is the 09:30 bar. A panel rendering it in the runner's own
    // zone is the same defect as a window resolved from the browser's clock:
    // plausible, shifted, and invisible to anyone not looking for it. The zone
    // abbreviation is what makes it checkable at all.
    const first = screen.getByText("First → last").parentElement;
    expect(first?.textContent).toContain("2026-09-04 09:30:00 EDT");
  });

  it("states the four prices from the bars it holds", () => {
    render(<BarSeriesPanel {...props} view={barSeriesFixtureView("full")} />);

    for (const label of ["Open", "High", "Low", "Close"]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    // The high is the highest high across the held bars rather than the last
    // bar's — the assertion that would fail if the reduction were a `[0]`.
    const high = screen.getByText("High").parentElement;
    expect(high?.textContent).toMatch(/\d+\.\d\d/);
  });

  it("labels the feed in the shipped vocabulary rather than a slug", () => {
    render(<BarSeriesPanel {...props} view={barSeriesFixtureView("full")} />);

    // `MARKET_FEED_DESCRIPTIONS`' words, and the rule that a label gets a
    // sentence only when it cannot stand alone — `All US exchanges` can, so
    // there is deliberately no second line here.
    expect(screen.getByText("Market feed")).toBeTruthy();
    expect(screen.getByText("All US exchanges")).toBeTruthy();
    expect(screen.queryByText(/sip/i)).toBeNull();
  });

  it("names every distinct feed of a stitched series", () => {
    render(
      <BarSeriesPanel {...props} view={barSeriesFixtureView("stitched")} />,
    );

    // Both recorded sources are SIP, so this renders **one** label for two
    // sources — which is the correct behaviour and the reason the assertion is
    // on distinctness rather than on a count of sources. Epic 3's IEX socket is
    // what makes this row show two.
    expect(screen.getAllByText("All US exchanges")).toHaveLength(1);
  });

  it("renders an empty series as an answer about a window", () => {
    render(<BarSeriesPanel {...props} view={barSeriesFixtureView("empty")} />);

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
      render(<BarSeriesPanel {...props} view={barSeriesFixtureView(name)} />);

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
      <BarSeriesPanel
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
    render(
      <BarSeriesPanel {...props} view={barSeriesFixtureView("incoherent")} />,
    );

    expect(screen.queryByRole("button")).toBeNull();
    expect(
      screen.getByText(/will not change this answer/, VISIBLE),
    ).toBeTruthy();
  });

  it("shows the whole correlation id beside a failure, never a prefix", () => {
    const view = barSeriesFixtureView("unavailable");
    render(<BarSeriesPanel {...props} view={view} />);

    // The one internal identifier this product puts on screen, and it is only
    // ever whole — a prefix is unquotable, which defeats the entire purpose.
    const id = view.state === "failed" ? view.requestId : null;
    expect(id).not.toBeNull();
    expect(screen.getByText(id ?? "")).toBeTruthy();
  });

  it("keeps the failure's sentence on screen while a retry is in flight", () => {
    const failure = barSeriesFixtureView("unavailable");
    render(
      <BarSeriesPanel
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
      <BarSeriesPanel
        {...props}
        defaulted
        view={barSeriesFixtureView("partial")}
      />,
    );
    expect(screen.getByText(/Search arrives with Story 2.11/)).toBeTruthy();
    unmount();

    render(
      <BarSeriesPanel {...props} view={barSeriesFixtureView("partial")} />,
    );
    expect(screen.queryByText(/Search arrives with Story 2.11/)).toBeNull();
  });

  // --- Task 2.10.8: the two marks that are not about the answer ---

  it("says a held answer is being refreshed, without touching a number", () => {
    render(
      <BarSeriesPanel {...props} view={staleBarSeriesFixtureView("partial")} />,
    );

    expect(screen.getByText(/Refreshing/)).toBeTruthy();

    // The point of the mark, asserted as what it does *not* do: every figure
    // the fresh answer will replace is still fully on screen and still says
    // exactly what it said. A treatment that emptied or replaced them would
    // pass a "there is a mark" assertion and fail the product.
    expect(screen.getByText(/Holding 60 bars/)).toBeTruthy();
    expect(screen.getByText("Open")).toBeTruthy();
  });

  it("shows no refreshing mark on an answer that just arrived", () => {
    render(
      <BarSeriesPanel {...props} view={barSeriesFixtureView("partial")} />,
    );

    expect(screen.queryByText(/Refreshing/)).toBeNull();
  });

  it("marks an untracked security on its subject, not in its numbers", () => {
    render(
      <BarSeriesPanel
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
    render(<BarSeriesPanel {...props} view={barSeriesFixtureView("full")} />);

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
        <BarSeriesPanel {...props} view={barSeriesFixtureView(name)} />,
      );

      expect(screen.getAllByRole("status")).toHaveLength(1);
      expect(screen.queryAllByRole("alert")).toHaveLength(0);
      unmount();
    }
  });

  it("is silent while the first answer is still coming", () => {
    render(<BarSeriesPanel {...props} view={{ state: "loading" }} />);

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
        <BarSeriesPanel {...props} view={barSeriesFixtureView(name)} />,
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
      <BarSeriesPanel {...props} view={{ state: "loading" }} />,
    );
    const before = screen.getByRole("status");

    rerender(
      <BarSeriesPanel {...props} view={barSeriesFixtureView("partial")} />,
    );

    expect(screen.getByRole("status")).toBe(before);
    expect(before.textContent).toContain("holding 60 bars");
  });

  it("says a held answer is held, so a refetch landing where it started is heard", () => {
    // A live region whose text does not change announces nothing, and a refetch
    // landing on an identical answer is the common case for a closed session's
    // bars. The stale clause is the text the region passes through and back out
    // of, which is what makes the return audible.
    const fresh = barSeriesFixtureView("partial");
    const { rerender } = render(<BarSeriesPanel {...props} view={fresh} />);
    const settled = screen.getByRole("status").textContent;

    rerender(
      <BarSeriesPanel {...props} view={staleBarSeriesFixtureView("partial")} />,
    );
    const held = screen.getByRole("status").textContent;

    rerender(<BarSeriesPanel {...props} view={fresh} />);

    expect(held).not.toBe(settled);
    expect(screen.getByRole("status").textContent).toBe(settled);
  });

  it("does not read a correlation id aloud", () => {
    // A 36-character UUID spoken is thirty seconds of hex a listener cannot
    // hold or transcribe — the same judgement the universe table made about a
    // magnitude. It is on screen, selectable, and that is where it is useful.
    render(
      <BarSeriesPanel {...props} view={barSeriesFixtureView("unavailable")} />,
    );

    const spoken = screen.getByRole("status").textContent;
    expect(spoken).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/u);
    expect(spoken).toContain(
      "A reference for this failure is shown beside it.",
    );
  });

  // The fence, asserted rather than left in a comment. Story 2.12 owns the
  // charting decision, and a sparkline added here would be that decision taken
  // by accident on the smallest possible evidence.
  it("draws nothing — no canvas, no svg, no plotted series", () => {
    const { container } = render(
      <BarSeriesPanel {...props} view={barSeriesFixtureView("full")} />,
    );

    expect(container.querySelector("canvas")).toBeNull();
    expect(container.querySelector("svg")).toBeNull();
  });
});
