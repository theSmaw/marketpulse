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
// 101 rows all `active`, so a version of this page that filtered would pass
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
  it("renders the universe as a table of symbol, name, sector and kind", async () => {
    stubFetch(() => json(200, { securities: [NVDA, SPY] }));
    render();

    await waitFor(() => {
      expect(screen.getByRole("table")).toBeTruthy();
    });

    // By role and accessible name rather than by class: the column headings are
    // what a screen reader announces with each cell, and they are the part of
    // this table Task 2.4.4 must not silently drop while restyling it.
    for (const heading of ["Symbol", "Name", "Sector", "Kind"]) {
      expect(screen.getByRole("columnheader", { name: heading })).toBeTruthy();
    }

    expect(screen.getByRole("rowheader", { name: "NVDA" })).toBeTruthy();
    expect(screen.getByText("NVIDIA Corporation")).toBeTruthy();
    expect(screen.getByText("Technology")).toBeTruthy();
    expect(screen.getByText("Company")).toBeTruthy();

    // The sector cell of a security that structurally has no sector says so,
    // rather than being blank — a blank cell reads as data we failed to load.
    expect(screen.getByRole("rowheader", { name: "SPY" })).toBeTruthy();
    expect(screen.getByText("Index ETF")).toBeTruthy();
    expect(screen.getByText("—")).toBeTruthy();
  });

  // Story acceptance criterion 6, in its plainest form: `UNIVERSE.md` §12.2 puts
  // this reader on the *do not filter* side, so a security we no longer track is
  // a row rather than an absence. Marking it visibly is Task 2.4.4's.
  it("renders an untracked security rather than dropping it", async () => {
    stubFetch(() => json(200, { securities: [GILD, NVDA] }));
    render();

    await waitFor(() => {
      expect(screen.getByRole("rowheader", { name: "GILD" })).toBeTruthy();
    });
    expect(screen.getAllByRole("row")).toHaveLength(3);
  });

  it("says there are no prices yet rather than looking broken", async () => {
    stubFetch(() => json(200, { securities: [NVDA] }));
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
    stubFetch(() => json(200, { securities: [] }));
    render();

    await waitFor(() => {
      expect(screen.getByText(/holds no securities/)).toBeTruthy();
    });
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByText(/could not be reached/)).toBeNull();
  });

  it("says the service could not be reached, and keeps the page usable", async () => {
    stubFetch(() => Promise.reject(new TypeError("Failed to fetch")));
    render();

    await waitFor(() => {
      expect(screen.getByText(/could not be reached/)).toBeTruthy();
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
      expect(screen.getByText(/was not this service/)).toBeTruthy();
    });
    expect(screen.getByText(/Reference: 3f1c/)).toBeTruthy();
  });
});
