import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { SecuritiesView } from "../../use-securities.js";
import { groupUniverse, summarise, UniverseTable } from "./UniverseTable.js";
import { toMarketDate, toTicker } from "@marketpulse/shared";
import type {
  EquitySecurity,
  IndexEtfSecurity,
  SectorEtfSecurity,
  Security,
  SecurityCoverage,
  SecurityLastClose,
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

function coverageFor(
  symbol: string,
  start = "2025-09-08T13:30:00.000Z",
  barCount = 97_530,
): SecurityCoverage {
  return {
    symbol,
    timeframe: "1m",
    start,
    end: "2026-09-04T20:00:00.000Z",
    barCount,
  };
}

/**
 * A stored close, at the last session the local store actually holds.
 *
 * `toMarketDate` rather than a bare literal, because `MarketDate` is branded:
 * a cast would assert a check that never happened, and the branding is what
 * carries "this went through `market-time.ts`" across the wire.
 */
function closeFor(
  symbol: string,
  close = 230.36,
  previousClose: number | null = 228.45,
  session = "2026-09-04",
): SecurityLastClose {
  return {
    symbol,
    session: toMarketDate(session),
    close,
    previousClose,
  };
}

function loaded(
  securities: readonly [Security, ...Security[]],
  coverage: readonly SecurityCoverage[] = [],
  lastCloses: readonly SecurityLastClose[] = [],
): SecuritiesView {
  return {
    state: "loaded",
    securities,
    provenance: null,
    coverage: new Map(coverage.map((record) => [record.symbol, record])),
    lastCloses: new Map(lastCloses.map((record) => [record.symbol, record])),
  };
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

  it("says how much history it holds, as a depth and a start", () => {
    render(<UniverseTable view={loaded([equity()], [coverageFor("NVDA")])} />);

    // Asserted on the row's accessible name rather than on two elements,
    // because that is the string a screen reader is handed and it is where a
    // depth separated from its date would show up as wrong.
    const row = screen.getByRole("row", { name: /^NVDA / });
    expect(row.textContent).toContain("1y");
    expect(row.textContent).toContain("from 2025-09-08");
  });

  // The timeframe appears once, in the heading, and never in a cell — the same
  // argument that removed the Sector column. A version repeating "minute" down
  // 518 rows would pass a looser assertion.
  it("names the timeframe once, in the column heading", () => {
    render(<UniverseTable view={loaded([equity()], [coverageFor("NVDA")])} />);

    expect(
      screen.getByRole("columnheader", { name: "Minute-bar history" }),
    ).toBeTruthy();
    // Not in the row. The summary line does say "minute bars" once, which is
    // the other half of the same decision: the word is stated where it costs
    // one occurrence rather than 518.
    const row = screen.getByRole("row", { name: /^NVDA / });
    expect(row.textContent).not.toContain("minute");
  });

  // The honest answer for a security nobody has backfilled: no zero, no bar
  // count, and — the half that needs a test — a sentence rather than an em
  // dash a screen reader reads as nothing.
  it("renders a security with no bars as no history rather than as a zero", () => {
    render(<UniverseTable view={loaded([equity()], [])} />);

    const row = screen.getByRole("row", { name: /^NVDA / });
    expect(row.textContent).toContain("No history yet");
    expect(row.textContent).not.toContain("0");
  });

  // --- The price column (Task 2.9.7) ---

  it("renders the last close and its move against the session before", () => {
    // The first real price this product shows anybody, asserted on the string a
    // screen reader is handed rather than on two elements: the figure and its
    // direction are one claim, and a version that separated them would pass a
    // per-element assertion.
    render(
      <UniverseTable
        view={loaded([equity()], [], [closeFor("NVDA", 230.36, 228.45)])}
      />,
    );

    const row = screen.getByRole("row", { name: /^NVDA / });
    expect(row.textContent).toContain("230.36");
    expect(row.textContent).toContain("+0.84%");
    // The spoken word, which is the third channel. The glyph is `aria-hidden`
    // — read aloud it is the name of a triangle — so `up` is what a listener
    // gets, and it is the half that survives both the colour and the glyph.
    expect(row.textContent).toContain("up");
  });

  it("carries a fall as a sign and a word, not only as a colour", () => {
    // Task 1.4.4 measured this palette's positive green and negative red at
    // 1.05:1 under `grayscale(1)`, which is no difference at all. A test cannot
    // see colour — no stylesheet is applied here — and that is the point: what
    // it *can* see is the sign and the word, which is exactly the encoding that
    // has to be there.
    render(
      <UniverseTable
        view={loaded([equity()], [], [closeFor("NVDA", 319.97, 328.21)])}
      />,
    );

    const row = screen.getByRole("row", { name: /^NVDA / });
    expect(row.textContent).toContain("−2.51%");
    expect(row.textContent).toContain("down");
  });

  it("renders a move that rounds away as unchanged, with no sign", () => {
    // The two channels agreeing. By raw sign this is a rise; rendered it is
    // `0.00%`, and an up arrow beside a figure saying nothing moved is the one
    // disagreement `PriceChange` exists to make impossible.
    render(
      <UniverseTable
        view={loaded([equity()], [], [closeFor("NVDA", 230.36, 230.3598)])}
      />,
    );

    const row = screen.getByRole("row", { name: /^NVDA / });
    expect(row.textContent).toContain("0.00%");
    expect(row.textContent).toContain("unchanged");
    expect(row.textContent).not.toContain("+0.00%");
  });

  it("renders a single stored session as no comparison rather than as flat", () => {
    // Two different absences, and they send a reader to different conclusions:
    // "we hold one session of this" is not "this security did not move". The
    // price is still shown, because we have it.
    render(
      <UniverseTable
        view={loaded([equity()], [], [closeFor("NVDA", 230.36, null)])}
      />,
    );

    const row = screen.getByRole("row", { name: /^NVDA / });
    expect(row.textContent).toContain("230.36");
    expect(row.textContent).toContain("No previous session to compare against");
    expect(row.textContent).not.toContain("0.00%");
    expect(row.textContent).not.toContain("unchanged");
  });

  it("renders a security with no close as an absence rather than as a zero", () => {
    // §36 again, and the half that needs a test: the em dash reads as nothing
    // to a screen reader, so the sentence is what is announced. A `0.00` here
    // would be an invented price.
    render(<UniverseTable view={loaded([equity()], [], [])} />);

    const row = screen.getByRole("row", { name: /^NVDA / });
    expect(row.textContent).toContain("No close yet");
    expect(row.textContent).not.toContain("0.00");
  });

  it("states the session once in the heading, not in every row", () => {
    // The furniture argument, and the same one that keeps the timeframe out of
    // the history cells. 518 identical dates under a heading that could carry
    // one is a column of repetition; the heading is where the claim goes while
    // it is true of everything.
    render(
      <UniverseTable
        view={loaded(
          [equity(), ABBV],
          [],
          [closeFor("NVDA", 230.36, 228.45), closeFor("ABBV", 256.46, 260.21)],
        )}
      />,
    );

    expect(
      screen.getByRole("columnheader", { name: /Last close 2026-09-04/ }),
    ).toBeTruthy();
    expect(
      screen.getByRole("row", { name: /^NVDA / }).textContent,
    ).not.toContain("2026-09-04");
  });

  it("withdraws the heading's date and dates every row when they disagree", () => {
    // The asymmetry `coverage.ts` and the summary line already have: a shared
    // claim is made while it is true of everything and is then withdrawn rather
    // than approximated. This state does not exist in the store today — 518 of
    // 518 share a session — and it is guaranteed to arrive, because a security
    // that stops printing keeps its history and stops extending it.
    render(
      <UniverseTable
        view={loaded(
          [equity(), ABBV],
          [],
          [
            closeFor("NVDA", 230.36, 228.45),
            closeFor("ABBV", 256.46, 260.21, "2026-08-28"),
          ],
        )}
      />,
    );

    expect(
      screen.getByRole("columnheader", { name: "Last close" }),
    ).toBeTruthy();
    expect(screen.getByRole("row", { name: /^NVDA / }).textContent).toContain(
      "2026-09-04",
    );
    expect(screen.getByRole("row", { name: /^ABBV / }).textContent).toContain(
      "2026-08-28",
    );
  });

  it("tells a listener which session the prices are from", () => {
    // The column heading answers this for a reader, and a listener meeting a
    // table of prices cannot get it from a column header until they land on a
    // cell. It is the one sentence keeping a stale number from being heard as a
    // live one.
    render(
      <UniverseTable
        view={loaded([equity()], [], [closeFor("NVDA", 230.36, 228.45)])}
      />,
    );

    expect(screen.getByRole("status").textContent).toContain(
      "Closing prices are from the 2026-09-04 session.",
    );
  });

  it("reports the store's scale in the summary rather than in every row", () => {
    render(
      <UniverseTable
        view={loaded(
          [equity(), ABBV],
          [coverageFor("NVDA"), coverageFor("ABBV")],
        )}
      />,
    );

    // Both rows are covered, so the clause is words rather than a figure that
    // would repeat the count beside it.
    expect(screen.getByText("all with history")).toBeTruthy();
    // The total is a scale claim and appears exactly once, in the summary.
    expect(screen.getByText("195k")).toBeTruthy();
    expect(screen.getByText("minute bars")).toBeTruthy();
    expect(screen.getByText("2026-09-04")).toBeTruthy();
  });

  // The figure comes back the moment it says something the count beside it does
  // not — which is the only case where comparing the two is the point.
  it("counts securities with history when some have none", () => {
    render(
      <UniverseTable view={loaded([equity(), ABBV], [coverageFor("NVDA")])} />,
    );

    expect(screen.getByText("with history")).toBeTruthy();
    expect(screen.queryByText("all with history")).toBeNull();
    const clause = screen.getByText("with history").parentElement;
    expect(clause?.textContent).toContain("1");
  });

  // A migrated database nobody has backfilled. One sentence rather than three
  // zeroes, because `0 with history · 0 minute bars` reads as a fault where
  // this reads as a fact.
  it("says the store is empty in words rather than in zeroes", () => {
    render(<UniverseTable view={loaded([equity()], [])} />);

    expect(screen.getByText("No market history stored yet")).toBeTruthy();
    expect(screen.queryByText("with history")).toBeNull();
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

  // A live region in every state, so a state change can be announced at all
  // (Task 2.4.5). The property that matters is one a browser test cannot see
  // and this one can: the element is present in *all four* states, because a
  // live region that is added or removed with the content it describes
  // announces nothing — which is what Task 2.4.3 shipped and this replaced.
  it("carries a live region in every state", () => {
    for (const view of [
      { state: "loading" },
      { state: "empty" },
      { state: "failed", failure: "unreachable", requestId: null },
      {
        state: "loaded",
        securities: [equity()],
        provenance: null,
        coverage: new Map(),
        lastCloses: new Map(),
      },
    ] satisfies readonly SecuritiesView[]) {
      const { unmount } = render(<UniverseTable view={view} />);

      expect(
        screen.getByRole("status"),
        `no live region in the ${view.state} state`,
      ).toBeTruthy();
      unmount();
    }
  });

  // It is `status` and never `alert`: PRODUCT_SPEC.md §36 makes an unreachable
  // service a product state rather than a failure of the application, and
  // `role="alert"` is what `ErrorFallback` carries — the one thing the browser
  // suite looks for on every route to decide that nothing failed to render.
  it("announces a failure politely and never as an alert", () => {
    render(
      <UniverseTable
        view={{ state: "failed", failure: "unreachable", requestId: null }}
      />,
    );

    expect(screen.getByRole("status").textContent).toContain(
      "The tracked universe is not available.",
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });

  // Nothing is announced on arrival at the page, because there was no
  // transition into it — see `announce` for why that is a decision rather than
  // an omission, and why the region is present anyway.
  it("announces nothing while loading, and is present to announce later", () => {
    render(<UniverseTable view={{ state: "loading" }} />);

    expect(screen.getByRole("status").textContent).toBe("");
  });

  // The skeleton is decoration for a screen reader; the sentence is the answer.
  it("offers one sentence to a screen reader while loading, not seven bars", () => {
    const { container } = render(<UniverseTable view={{ state: "loading" }} />);

    expect(screen.getByText(/Loading the tracked universe/)).toBeTruthy();
    expect(container.querySelectorAll("[aria-hidden='true']")).toHaveLength(1);
  });
});
