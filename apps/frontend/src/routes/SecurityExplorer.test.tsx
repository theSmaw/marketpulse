import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithContext } from "../test-render.js";
import { PATHS } from "./paths.js";
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

function stubFetch(respond: () => Promise<Response>): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => respond()),
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
    stubFetch(() => json(200, { securities: [NVDA, SPY], coverage: [] }));
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
    expect(screen.getByText("NVIDIA Corporation")).toBeTruthy();
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
    stubFetch(() => json(200, { securities: [NVDA, SPY, GILD], coverage: [] }));
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
    stubFetch(() => json(200, { securities: [GILD, NVDA], coverage: [] }));
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
    stubFetch(() => json(200, { securities: [NVDA], coverage: [] }));
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
    stubFetch(() => json(200, { securities: [], coverage: [] }));
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
