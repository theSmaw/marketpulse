import { fireEvent, screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  barSeriesFixtureResponse,
  stubFetch as stubEveryRequest,
} from "../fixtures/stub-fetch.js";
import { renderWithContext } from "../test-render.js";
import { PATHS, ROUTE_PATTERNS } from "./paths.js";
import { DEFAULT_SESSIONS } from "./SecurityExplorer.js";
import { SecurityExplorer } from "./SecurityExplorer.js";

// The route's tests drive the real component against a stubbed `fetch`, so the
// hook, the client and the shared predicate are all in the path — which is what
// makes this an assertion about the read path rather than about a table
// rendering an array. The four states are asserted by what a user reads, and
// the untracked row is asserted because nothing else can: the deployed table is
// 518 rows all `active`, so a version of this page that filtered would pass
// every other check in this task.

const NVDA = {
  symbol: "NVDA",
  name: "NVIDIA Corporation",
  exchange: "NASDAQ",
  kind: "equity",
  sector: "technology",
  industry: "Semiconductors",
  status: "active",
  cik: null,
};

const SPY = {
  symbol: "SPY",
  name: "SPDR S&P 500 ETF Trust",
  exchange: "NYSEARCA",
  kind: "index_etf",
  sector: null,
  industry: null,
  status: "active",
  cik: null,
};

/** A security we have stopped tracking — Task 2.3.6's status transition, which
 * no deployed row is in today. */
const GILD = { ...NVDA, symbol: "GILD", name: "Gilead", status: "untracked" };

/**
 * Answer `/securities` with the given body, and `/market-data/bars` with a
 * settled one.
 *
 * **The routing is the point** (Task 2.10.7). This page now makes *two*
 * requests — the universe and one security's bar series — and a stub answering
 * every URL with the universe body puts the panel into `unreadable-body` with
 * the same correlation id the table is showing. That is not hypothetical: it
 * broke the reference assertion below the moment the panel landed, with "found
 * multiple elements" naming neither the panel nor the reason.
 *
 * So the series gets a recorded body and stays out of the way, and every
 * assertion in this file remains about the table. The panel's own states are
 * `BarSeriesPanel.test.tsx`'s.
 */
function stubFetch(respond: () => Promise<Response>): void {
  stubEveryRequest((call) =>
    call.url.includes("/market-data/bars")
      ? Promise.resolve(barSeriesFixtureResponse("full"))
      : respond(),
  );
}

const json = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

const render = () =>
  renderWithContext(<SecurityExplorer />, { at: PATHS.securities });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SecurityExplorer", () => {
  it("renders the universe as a table of symbol, name, industry and kind", async () => {
    stubFetch(() =>
      json(200, { securities: [NVDA, SPY], coverage: [], lastCloses: [] }),
    );
    render();

    await waitFor(() => {
      expect(screen.getByRole("table")).toBeTruthy();
    });

    // By role and accessible name rather than by class: the column headings are
    // what a screen reader announces with each cell.
    //
    // **`Sector` is deliberately not among them since Task 2.4.4.** The table
    // groups by sector, so a sector cell would repeat the heading above it down
    // every row of a group; the freed column carries `industry`, which the wire
    // has always sent and nothing had ever rendered. Story acceptance criterion
    // 2's four fields are all still on screen — the sector is now stated once
    // per group instead of once per row.
    for (const heading of ["Symbol", "Name", "Industry", "Kind"]) {
      expect(screen.getByRole("columnheader", { name: heading })).toBeTruthy();
    }

    expect(screen.getByRole("rowheader", { name: "NVDA" })).toBeTruthy();
    // `getAllByText`, and the plural is the assertion: since Task 2.11.7 the
    // company name is on this screen twice — once in the identity block naming
    // the page's subject, once in the row for it in the table. That is a
    // *subject* stated twice, which the self-describing-surface rule requires;
    // it is not two surfaces describing one event in the same words, which is
    // the thing that is forbidden.
    expect(screen.getAllByText("NVIDIA Corporation").length).toBeGreaterThan(0);
    expect(screen.getByText("Semiconductors")).toBeTruthy();
    expect(screen.getByText("Company")).toBeTruthy();

    // The sector reaches the screen as the group heading a row sits under.
    expect(screen.getByRole("rowheader", { name: /Technology/ })).toBeTruthy();

    // An index proxy is not in a sector at all, and the group it is in says so
    // in words rather than leaving a reader to infer it from a blank.
    expect(screen.getByRole("rowheader", { name: "SPY" })).toBeTruthy();
    expect(screen.getByText("Index ETF")).toBeTruthy();
    expect(
      screen.getByRole("rowheader", { name: /Market proxies/ }),
    ).toBeTruthy();
  });

  // The first sentence in this product that states a fact about our own data,
  // and it has to say *which* number it is reporting: rows held and securities
  // tracked stop being the same figure at the first removal.
  it("summarises the universe from the response rather than from a constant", async () => {
    stubFetch(() =>
      json(200, {
        securities: [NVDA, SPY, GILD],
        coverage: [],
        lastCloses: [],
      }),
    );
    render();

    await waitFor(() => {
      expect(screen.getByRole("table")).toBeTruthy();
    });

    const summary = screen.getByText("securities tracked").parentElement;
    expect(summary?.textContent).toContain("2 securities tracked");
    expect(summary?.textContent).toContain("1 no longer tracked");
  });

  // Story acceptance criterion 6, in its plainest form: `UNIVERSE.md` §12.2 puts
  // this reader on the *do not filter* side, so a security we no longer track is
  // a row rather than an absence. Marking it visibly is Task 2.4.4's.
  it("renders an untracked security rather than dropping it", async () => {
    stubFetch(() =>
      json(200, { securities: [GILD, NVDA], coverage: [], lastCloses: [] }),
    );
    render();

    await waitFor(() => {
      expect(screen.getByRole("rowheader", { name: "GILD" })).toBeTruthy();
    });
    // Marked rather than merely present, which is Task 2.4.4's half of
    // acceptance criterion 6.
    expect(screen.getByText("No longer tracked")).toBeTruthy();
    // Two securities, both in Technology: the column headings, the group band
    // and two rows.
    expect(screen.getAllByRole("row")).toHaveLength(4);
  });

  it("says there are no prices yet rather than looking broken", async () => {
    stubFetch(() =>
      json(200, { securities: [NVDA], coverage: [], lastCloses: [] }),
    );
    render();

    await waitFor(() => {
      expect(screen.getByRole("table")).toBeTruthy();
    });
    expect(screen.getByText(/Epic 3/)).toBeTruthy();
  });

  it("shows a loading state before the first response settles", () => {
    // A request that never answers, which is the only way to hold the loading
    // state still long enough to assert on it.
    stubFetch(() => new Promise<Response>(() => undefined));
    render();

    expect(screen.getByText(/Loading the tracked universe/)).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  // A migrated-but-unseeded database. Not a failure and not a table with a
  // header and nothing under it.
  it("distinguishes an empty universe from a failure", async () => {
    stubFetch(() =>
      json(200, { securities: [], coverage: [], lastCloses: [] }),
    );
    render();

    // `getAllByText`, because there are two channels saying it: the visible
    // headline and the `role="status"` region that announces the arrival to a
    // screen reader (Task 2.4.5). Asserting the count is what keeps that
    // deliberate — a third copy would be a mistake.
    await waitFor(() => {
      expect(screen.getAllByText(/has not been loaded/)).toHaveLength(2);
    });
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByText("no response")).toBeNull();
  });

  it("says the service could not be reached, and keeps the page usable", async () => {
    stubFetch(() => Promise.reject(new TypeError("Failed to fetch")));
    render();

    await waitFor(() => {
      expect(screen.getByText("no response")).toBeTruthy();
    });

    // The failure is a value the hook stored rather than an exception, so no
    // boundary caught anything and the region is still the region.
    expect(screen.queryByRole("alert")).toBeNull();
    expect(
      screen.getByRole("region", { name: "Tracked universe" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 1, name: "Security Explorer" }),
    ).toBeTruthy();
  });

  // The other failure, which is a different diagnosis: something answered and
  // it was not this service. A page that said "could not be reached" here would
  // send somebody to check a service that is running perfectly.
  it("distinguishes a wrong answer from no answer, and offers its reference", async () => {
    stubFetch(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            code: "INTERNAL_ERROR",
            message: "no",
            requestId: "3f1c",
          }),
          { status: 500, headers: { "x-request-id": "3f1c" } },
        ),
      ),
    );
    render();

    await waitFor(() => {
      expect(screen.getByText("unexpected response")).toBeTruthy();
    });
    expect(screen.getByText("3f1c")).toBeTruthy();
  });
});

// The market-data region, added by Task 2.10.7. What is asserted here is the
// *wiring* — that the route reaches the panel, sends the window it says it
// sends, and reads the symbol from the address — rather than what the panel
// renders, which is `BarSeriesPanel.test.tsx`'s and is asserted there against
// recorded bodies.

describe("the market-data region", () => {
  /** Render the route at one address, with both endpoints answered apart. */
  function renderAt(address: string) {
    stubFetch(() =>
      json(200, { securities: [NVDA], coverage: [], lastCloses: [] }),
    );
    return renderWithContext(
      <Routes>
        <Route path={PATHS.securities} element={<SecurityExplorer />} />
        <Route path={ROUTE_PATTERNS.security} element={<SecurityExplorer />} />
      </Routes>,
      { at: address },
    );
  }

  it("asks for the symbol in the address, over the default window", async () => {
    renderAt("/securities/AMD");

    await waitFor(() => {
      // Two headings carry this symbol and both are correct: the identity
      // block's `h2` says whose page this is, and the panel's `h3` says whose
      // bars these are. A panel that stopped naming its own subject would be
      // wrong in the workshop and wrong the day it appears beside a second
      // security's panel.
      expect(screen.getAllByRole("heading", { name: "AMD" })).toHaveLength(2);
    });

    // The window is **named and never resolved here**, which is the property
    // that keeps a browser in another timezone from asking for a different five
    // sessions than a browser in New York. Asserted as the absence of an
    // instant, because that is what the property is.
    const urls = vi
      .mocked(fetch)
      .mock.calls // `fetch`'s first argument is typed `RequestInfo | URL`, and this client
      // always passes a string; the narrowing keeps the assertion off
      // `[object Object]` if that ever stops being true.
      .map(([input]) => (typeof input === "string" ? input : ""))
      .filter((url) => url.includes("/market-data/bars"));

    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain("symbol=AMD");
    expect(urls[0]).toContain(`sessions=${String(DEFAULT_SESSIONS)}`);
    expect(urls[0]).not.toMatch(/start=|end=/);
  });

  it("falls back to a default security and says search is not here yet", async () => {
    renderAt(PATHS.securities);

    await waitFor(() => {
      expect(screen.getByText(/Showing a default security/)).toBeTruthy();
    });
  });

  it("names the region and what it deliberately does not hold", async () => {
    renderAt(PATHS.securities);

    // The region is a landmark with a name, like every other one on this page,
    // so a keyboard or screen-reader user has something to jump to.
    //
    // **`filledBy` said the chart was a story away until 2026-09-12, and now
    // says what it holds and what it still does not.** Task 2.12.4 drew the
    // chart and amended the sentence in the same commit, which is the rule for
    // a live claim that has become false; the assertion moved with it rather
    // than being deleted, because a region whose description stops matching its
    // contents is exactly what nothing else here would catch.
    await waitFor(() => {
      expect(screen.getByRole("region", { name: "Price" })).toBeTruthy();
    });
    expect(
      screen.getByText(/Changing the window arrives with Story 2.13/),
    ).toBeTruthy();
  });
});

// The page as a whole, in the states search can be in (Task 2.11.6).
//
// These are deliberately at the route rather than in `SecuritySearch.test.tsx`:
// every one of them is a claim about **two surfaces at once** — that the field
// and the table agree, that one failing leaves the other standing, that a
// control over the page does not change what the page says about itself. A
// component test cannot see any of that, because it can only see one component.

describe("search, and the rest of the page around it", () => {
  function loadedUniverse() {
    stubFetch(() =>
      json(200, {
        securities: [NVDA, SPY, GILD],
        coverage: [],
        lastCloses: [],
      }),
    );
  }

  const field = () => screen.getByRole<HTMLInputElement>("combobox");

  it("puts the field on the page before the universe arrives, rather than after", () => {
    // Never settles, so this is the loading state and nothing else.
    stubFetch(() => new Promise<Response>(() => undefined));
    render();

    // The control that used to appear only on success. A field that is absent
    // while a page loads is indistinguishable from a product with no search.
    expect(field().disabled).toBe(false);
    expect(screen.getByLabelText("Find a security")).toBeTruthy();
  });

  it("keeps the field on the page when the universe cannot be read", async () => {
    stubFetch(() => Promise.reject(new TypeError("Failed to fetch")));
    render();

    await waitFor(() => {
      expect(screen.getByText("no response")).toBeTruthy();
    });

    // §36: the page degrades locally. Search says it cannot answer, the table
    // says why and offers the retry, the heading and both regions are intact,
    // and nothing collapsed to a global error screen.
    //
    // `aria-disabled` rather than the native attribute since Task 2.11.9: the
    // control stays in the tab order so that the sentence saying why it cannot
    // answer — attached with `aria-describedby`, which is read *when a control
    // is reached* — can be reached at all. `TextFieldProps.disabled` carries
    // the walk that found it.
    expect(field().getAttribute("aria-disabled")).toBe("true");
    expect(field().disabled).toBe(false);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("region", { name: "Price" })).toBeTruthy();
    expect(
      screen.getByRole("region", { name: "Tracked universe" }),
    ).toBeTruthy();
  });

  // The other half of that sentence, and the one a component test cannot make:
  // the two surfaces read the same fetch, so exactly one control asks again.
  it("offers one retry for one failure", async () => {
    stubFetch(() => Promise.reject(new TypeError("Failed to fetch")));
    render();

    await waitFor(() => {
      expect(screen.getByText("no response")).toBeTruthy();
    });

    expect(screen.getAllByRole("button", { name: /try again/i })).toHaveLength(
      1,
    );
  });

  // The market-data region fetches separately, so a universe that fails must
  // not take the series with it. This is the "rest of the page survives" claim
  // with something on the other side of it rather than an empty page.
  it("leaves the series panel rendering when the universe fails", async () => {
    stubEveryRequest((call) =>
      call.url.includes("/market-data/bars")
        ? Promise.resolve(barSeriesFixtureResponse("full"))
        : Promise.reject(new TypeError("Failed to fetch")),
    );
    render();

    await waitFor(() => {
      expect(screen.getByText("no response")).toBeTruthy();
    });
    // The panel answered, and says so with a figure only a real body carries.
    expect(screen.getByText("30 × 1m")).toBeTruthy();
  });

  // `SEARCH-AND-SELECTION.md` §6: the summary line says which of two numbers it
  // is reporting, and **any control that changes what is on screen has to
  // change that line in the same commit**. Search does not — it is a surface
  // over the page rather than a filter on the table — and this is the assertion
  // that would go red the day somebody wires the field to the rows.
  it("does not make the summary line a lie by typing in the field", async () => {
    loadedUniverse();
    render();

    await waitFor(() => {
      expect(screen.getByRole("table")).toBeTruthy();
    });

    const summary = () => screen.getByText("securities tracked").parentElement;
    const before = summary()?.textContent;

    field().focus();
    fireEvent.change(field(), { target: { value: "nv" } });

    // One row matched out of three, and the sentence about the universe is
    // still about the universe.
    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(summary()?.textContent).toBe(before);
    expect(summary()?.textContent).toContain("2 securities tracked");
    // The rows underneath are untouched too: the surface floats over them.
    expect(screen.getAllByRole("row").length).toBeGreaterThan(3);
  });
});

// The shell (Task 2.11.7) — the grid PRODUCT_SPEC.md §8.3's seven contents sit
// on, and the two things about it that nothing else would catch.
describe("the Security Explorer shell", () => {
  /** §8.3's seven contents, in the reading order the grid holds them. */
  const REGIONS = [
    "Price",
    "Abnormal-move indicators",
    "Volume",
    "Relative performance",
    "Connected securities",
    "Relevant filings",
    "Anomaly history",
    "Tracked universe",
  ] as const;

  it("renders §8.3's seven contents plus the universe, each a named landmark", async () => {
    stubFetch(() =>
      json(200, { securities: [NVDA, SPY], coverage: [], lastCloses: [] }),
    );
    render();

    await waitFor(() => {
      expect(screen.getByRole("region", { name: "Price" })).toBeTruthy();
    });

    for (const name of REGIONS) {
      expect(screen.getByRole("region", { name })).toBeTruthy();
    }

    // Named, every one of them, which is what makes them `region` landmarks at
    // all: a `<section>` without an accessible name is not a landmark, and
    // several unnamed ones are what axe reports as `landmark-unique`.
    expect(screen.getAllByRole("region")).toHaveLength(REGIONS.length);
  });

  it("names the epic that fills every empty region", async () => {
    stubFetch(() =>
      json(200, { securities: [NVDA, SPY], coverage: [], lastCloses: [] }),
    );
    render();

    await waitFor(() => {
      expect(screen.getByRole("region", { name: "Price" })).toBeTruthy();
    });

    // Six placeholders — the five later epics own, plus Story 2.13's volume —
    // and each says who fills it. Story 1.5's convention, and the reason it is
    // asserted here rather than trusted: a placeholder whose label is dropped
    // renders a dashed box with nothing in it, which reads as broken and goes
    // red nowhere.
    expect(screen.getAllByText(/^Filled by /)).toHaveLength(6);

    for (const plan of [
      "Filled by Story 2.13 — Volume Chart",
      "Filled by Epic 6 — Market Topology",
      "Filled by Epic 9 — Corporate Filing Evidence",
    ]) {
      expect(screen.getByText(plan)).toBeTruthy();
    }

    // Epic 5 fills three of them, which is why this one is `getAllBy`.
    expect(
      screen.getAllByText("Filled by Epic 5 — Anomaly Detection"),
    ).toHaveLength(3);
  });

  it("gives every region its own sentence", async () => {
    stubFetch(() =>
      json(200, { securities: [NVDA, SPY], coverage: [], lastCloses: [] }),
    );
    render();

    await waitFor(() => {
      expect(screen.getByRole("region", { name: "Price" })).toBeTruthy();
    });

    // Task 2.11.6's rule, learned three times in one afternoon: two surfaces
    // describing one screen must not open on the same clause. Eight regions
    // arrived at once here, and the cheap check is exactly this — a locator
    // that resolves to two nodes means two surfaces are saying one thing.
    for (const opening of [
      "One security's closes over the default window",
      "How unusual this security's behaviour",
      "Traded volume across the same window",
      "This security measured against",
      "Which securities move with this one",
      "Primary-source evidence from SEC EDGAR",
      "Every earlier occasion this security",
      "The securities MarketPulse follows",
    ]) {
      expect(screen.getAllByText(new RegExp(opening))).toHaveLength(1);
    }
  });

  it("names the security above the grid, from the universe rather than the address", async () => {
    stubFetch(() =>
      json(200, {
        securities: [NVDA, SPY],
        coverage: [],
        lastCloses: [],
      }),
    );
    renderWithContext(
      <Routes>
        <Route path={ROUTE_PATTERNS.security} element={<SecurityExplorer />} />
      </Routes>,
      { at: "/securities/SPY" },
    );

    await waitFor(() => {
      // The name is on screen twice — the identity block and the table row —
      // which is the subject being stated by two surfaces rather than one
      // event being described by two.
      expect(screen.getAllByText("SPDR S&P 500 ETF Trust")).toHaveLength(2);
    });

    // A market proxy belongs to no sector, and the classification line omits
    // that rather than printing "no sector" for a thing sectors do not apply
    // to. `NYSEARCA` is the exchange, which is the part that is never null.
    expect(screen.getByText(/NYSEARCA/)).toBeTruthy();
  });

  it("keeps the identity block silent — the page's third live region is search's", async () => {
    stubFetch(() =>
      json(200, { securities: [NVDA, SPY], coverage: [], lastCloses: [] }),
    );
    render();

    await waitFor(() => {
      expect(screen.getByRole("region", { name: "Price" })).toBeTruthy();
    });

    // `FRONTEND-STATE.md` §7's trigger fires on a fourth asynchronously-filled
    // surface, and `SEARCH-AND-SELECTION.md` §4 records why this one is allowed
    // to fill without speaking. Nothing else in the tree refuses a fourth
    // `role="status"`, so this is where that decision is held.
    expect(screen.getAllByRole("status")).toHaveLength(3);
  });
});
