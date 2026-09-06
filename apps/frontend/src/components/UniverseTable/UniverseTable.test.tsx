import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { SecuritiesView } from "../../use-securities.js";
import { groupUniverse, summarise, UniverseTable } from "./UniverseTable.js";
import { toTicker } from "@marketpulse/shared";
import type {
  EquitySecurity,
  IndexEtfSecurity,
  SectorEtfSecurity,
  Security,
} from "@marketpulse/shared";

// The table's own tests. `SecurityExplorer.test.tsx` drives the same component
// through the hook, the client and a stubbed `fetch`, which is an assertion
// about the *read path*; these are assertions about the *presentation*, and
// they are separate for the reason the two files are separate — a change to
// what a row looks like should not go red in a test about a transport.

const equity = (over: Partial<EquitySecurity> = {}): EquitySecurity => ({
  symbol: toTicker("NVDA"),
  name: "NVIDIA Corporation",
  exchange: "NASDAQ",
  kind: "equity",
  sector: "technology",
  industry: "Semiconductors",
  status: "active",
  cik: null,
  ...over,
});

// The two ETF kinds are separate members of the union rather than an `equity()`
// with its `kind` overridden, which is the union doing its job: a sector ETF
// must have a sector and an index ETF must not, and neither is expressible as a
// partial override of the other.
const XLK: SectorEtfSecurity = {
  symbol: toTicker("XLK"),
  name: "Technology Select Sector SPDR Fund",
  exchange: "NYSEARCA",
  kind: "sector_etf",
  sector: "technology",
  industry: null,
  status: "active",
  cik: null,
};

const SPY: IndexEtfSecurity = {
  symbol: toTicker("SPY"),
  name: "SPDR S&P 500 ETF Trust",
  exchange: "NYSEARCA",
  kind: "index_etf",
  sector: null,
  industry: null,
  status: "active",
  cik: null,
};

const ABBV = equity({
  symbol: toTicker("ABBV"),
  name: "AbbVie Inc.",
  sector: "health_care",
  industry: "Biotechnology",
});

function loaded(
  securities: readonly [Security, ...Security[]],
): SecuritiesView {
  return { state: "loaded", securities, provenance: null };
}

describe("groupUniverse", () => {
  // The order is `SECTORS`, not the counts and not the order the rows arrived
  // in. Health Care holds two rows here and Technology one, so a size-ordered
  // implementation would put Health Care first and pass a weaker assertion.
  it("orders groups by the declared sector vocabulary, proxies last", () => {
    const groups = groupUniverse([
      ABBV,
      SPY,
      equity(),
      equity({ symbol: toTicker("AMGN"), sector: "health_care" }),
    ]);

    expect(groups.map((group) => group.name)).toEqual([
      "Technology",
      "Health Care",
      "Market proxies",
    ]);
  });

  // The benchmark leads its own sector, which is the position half of the
  // kind encoding: a sector ETF is the first row of the sector it measures.
  it("puts a sector's own ETF at the head of its group", () => {
    const [group] = groupUniverse([equity(), XLK]);

    expect(group?.securities.map((security) => security.symbol)).toEqual([
      "XLK",
      "NVDA",
    ]);
    expect(group?.benchmark).toBe("XLK");
  });

  // A sector with no rows cannot happen in a correctly loaded universe, and a
  // heading with nothing under it would report that in a way nobody can act on.
  it("omits a sector nothing is in, and the proxies group when there are none", () => {
    const groups = groupUniverse([equity()]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.name).toBe("Technology");
  });
});

describe("summarise", () => {
  // The whole point of the summary line: `securities.length` is rows we hold
  // and the active count is securities we track, and they stop being the same
  // number the first time somebody edits the universe file.
  it("counts tracked securities rather than rows held", () => {
    const summary = summarise([
      equity(),
      equity({ symbol: toTicker("GILD"), status: "untracked" }),
      XLK,
      SPY,
    ]);

    expect(summary.tracked).toBe(3);
    expect(summary.noLongerTracked).toBe(1);
    expect(summary.etfs).toBe(2);
  });
});

describe("UniverseTable", () => {
  it("states the sector once per group rather than once per row", () => {
    render(<UniverseTable view={loaded([XLK, equity(), ABBV])} />);

    // The sector is a `colgroup` heading now, not a cell — grouping is what
    // renders it, and the freed column carries the industry instead.
    expect(screen.getByRole("rowheader", { name: /Technology/ })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Industry" })).toBeTruthy();
    expect(screen.queryByRole("columnheader", { name: "Sector" })).toBeNull();
    expect(screen.getByText("Semiconductors")).toBeTruthy();
  });

  // The one domain fact on this page that comes from `SECTOR_ETFS` rather than
  // from the database: XLK is what Technology is measured against.
  it("names each sector's benchmark and how many rows it holds", () => {
    render(<UniverseTable view={loaded([XLK, equity()])} />);

    const band = screen.getByRole("rowheader", { name: /Technology/ });
    expect(within(band).getByText("Benchmark XLK")).toBeTruthy();
    expect(within(band).getByText("2")).toBeTruthy();
  });

  it("reports the tracked count and says that is what it is counting", () => {
    render(
      <UniverseTable
        view={loaded([
          equity(),
          equity({ symbol: toTicker("GILD"), status: "untracked" }),
        ])}
      />,
    );

    expect(screen.getByText("securities tracked")).toBeTruthy();
    expect(screen.getByText("no longer tracked")).toBeTruthy();
    // One of two rows is active, so a version counting rows would read 2.
    const summary = screen.getByText("securities tracked").parentElement;
    expect(summary?.textContent).toContain("1");
  });

  // "We stopped tracking this" is information rather than a failure, so the
  // clause is absent entirely when there is nothing to report — a permanent
  // "0 no longer tracked" would be a running commentary on a non-event.
  it("says nothing about untracked securities when there are none", () => {
    render(<UniverseTable view={loaded([equity()])} />);

    expect(screen.queryByText("no longer tracked")).toBeNull();
  });

  it("marks an untracked security in words rather than by colour alone", () => {
    render(
      <UniverseTable
        view={loaded([
          equity({ symbol: toTicker("GILD"), status: "untracked" }),
        ])}
      />,
    );

    expect(screen.getByText("No longer tracked")).toBeTruthy();
    // Not an alert and not an error: it is a fact about the universe.
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("names the command that fixes an empty universe", () => {
    render(<UniverseTable view={{ state: "empty" }} />);

    expect(screen.getByText("pnpm universe")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  // The two failures are separate because they send a reader to two different
  // places. A single "something went wrong" would send half of them to check a
  // service that is running perfectly.
  it("tells no response apart from an unexpected one", () => {
    const { unmount } = render(
      <UniverseTable
        view={{ state: "failed", failure: "unreachable", requestId: null }}
      />,
    );
    expect(screen.getByText("no response")).toBeTruthy();
    expect(screen.queryByText(/Reference/)).toBeNull();
    unmount();

    render(
      <UniverseTable
        view={{
          state: "failed",
          failure: "answered-badly",
          requestId: "3f1c",
        }}
      />,
    );
    expect(screen.getByText("unexpected response")).toBeTruthy();
    // The whole id, never a prefix — `api-client.ts` owns that rule.
    expect(screen.getByText("3f1c")).toBeTruthy();
  });

  // The skeleton is decoration for a screen reader; the sentence is the answer.
  it("offers one sentence to a screen reader while loading, not seven bars", () => {
    const { container } = render(<UniverseTable view={{ state: "loading" }} />);

    expect(screen.getByText(/Loading the tracked universe/)).toBeTruthy();
    expect(container.querySelectorAll("[aria-hidden='true']")).toHaveLength(1);
  });
});
