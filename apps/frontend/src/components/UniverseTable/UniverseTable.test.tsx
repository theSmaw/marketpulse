import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type {
  SecuritiesFailure,
  SecuritiesView,
} from "../../use-securities.js";
import { securityPath } from "../../routes/paths.js";
import { renderWithContext } from "../../test-render.js";
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

// `onRetry` is required on the component, and most of these tests are about
// what is on the screen rather than about what a control does. The ones that
// *are* about the control pass their own spy.
const noop = () => undefined;

// The failed state, built rather than spelled out at eleven call sites — the
// member grew two flags in Task 2.10.2 and a literal per test is eleven places
// to edit the next time it grows.
const failed = (
  failure: SecuritiesFailure,
  requestId: string | null,
  retryable: boolean,
  retrying = false,
): SecuritiesView => ({
  state: "failed",
  failure,
  requestId,
  retryable,
  retrying,
});

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
  // Task 2.11.5 — the table stops being a list you read and becomes a way in.
  //
  // Asserted by **role** rather than by tag or class: `getByRole("link")` is
  // exactly the question "does a screen reader hear a link here?", which a
  // `<tr onClick>` would fail while looking identical in a DOM snapshot. The
  // `href` is asserted against `securityPath()` rather than a literal, so a
  // change to the address shape moves one file and this stays true.
  it("makes each row's symbol a link to that security", () => {
    renderWithContext(
      <UniverseTable onRetry={noop} view={loaded([equity(), ABBV])} />,
    );

    const link = screen.getByRole("link", { name: "NVDA" });
    expect(link.getAttribute("href")).toBe(securityPath("NVDA"));
    expect(screen.getByRole("link", { name: "ABBV" })).toBeTruthy();
  });

  // The link's accessible name is the bare symbol and nothing else. The chevron
  // beside it is decoration — `Icon` renders `aria-hidden` — and a name with a
  // trailing artefact is what a listener would hear read out 518 times. A
  // string `name` on `getByRole` is matched **whole** rather than as a
  // substring, which is what makes this an assertion rather than a formality;
  // `textContent` beside it is the visible half of the same claim.
  it("names the link with the symbol alone", () => {
    renderWithContext(
      <UniverseTable onRetry={noop} view={loaded([equity()])} />,
    );

    const link = screen.getByRole("link", { name: "NVDA" });
    expect(link.textContent).toBe("NVDA");
  });

  // The row header is still the row header. Making the symbol a link must not
  // cost the table the `<th scope="row">` a screen reader announces before each
  // cell — which it would, had the cell been replaced by the link rather than
  // filled with one.
  it("keeps the symbol cell a row header with the link inside it", () => {
    renderWithContext(
      <UniverseTable onRetry={noop} view={loaded([equity()])} />,
    );

    const header = screen.getByRole("rowheader", { name: "NVDA" });
    expect(within(header).getByRole("link")).toBeTruthy();
  });

  // `UNIVERSE.md` §12.2 at the point of navigation. A security we stopped
  // tracking is shown and marked, and its stored bars did not stop existing —
  // so it is openable like any other. A version that rendered untracked rows as
  // plain text would be the `status` filter this table refuses, arriving
  // through a door nobody was watching.
  it("opens an untracked security like any other", () => {
    renderWithContext(
      <UniverseTable
        onRetry={noop}
        view={loaded([
          equity({ symbol: toTicker("GILD"), status: "untracked" }),
        ])}
      />,
    );

    expect(screen.getByText("No longer tracked")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "GILD" }).getAttribute("href"),
    ).toBe(securityPath("GILD"));
  });

  it("states the sector once per group rather than once per row", () => {
    renderWithContext(
      <UniverseTable onRetry={noop} view={loaded([XLK, equity(), ABBV])} />,
    );

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
    renderWithContext(
      <UniverseTable onRetry={noop} view={loaded([XLK, equity()])} />,
    );

    const band = screen.getByRole("rowheader", { name: /Technology/ });
    expect(within(band).getByText("Benchmark XLK")).toBeTruthy();
    expect(within(band).getByText("2")).toBeTruthy();
  });

  it("reports the tracked count and says that is what it is counting", () => {
    renderWithContext(
      <UniverseTable
        onRetry={noop}
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
    renderWithContext(
      <UniverseTable onRetry={noop} view={loaded([equity()])} />,
    );

    expect(screen.queryByText("no longer tracked")).toBeNull();
  });

  it("says how much history it holds, as a depth and a start", () => {
    renderWithContext(
      <UniverseTable
        onRetry={noop}
        view={loaded([equity()], [coverageFor("NVDA")])}
      />,
    );

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
    renderWithContext(
      <UniverseTable
        onRetry={noop}
        view={loaded([equity()], [coverageFor("NVDA")])}
      />,
    );

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
    renderWithContext(
      <UniverseTable onRetry={noop} view={loaded([equity()], [])} />,
    );

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
    renderWithContext(
      <UniverseTable
        onRetry={noop}
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
    renderWithContext(
      <UniverseTable
        onRetry={noop}
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
    renderWithContext(
      <UniverseTable
        onRetry={noop}
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
    renderWithContext(
      <UniverseTable
        onRetry={noop}
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
    renderWithContext(
      <UniverseTable onRetry={noop} view={loaded([equity()], [], [])} />,
    );

    const row = screen.getByRole("row", { name: /^NVDA / });
    expect(row.textContent).toContain("No close yet");
    expect(row.textContent).not.toContain("0.00");
  });

  it("states the session once in the heading, not in every row", () => {
    // The furniture argument, and the same one that keeps the timeframe out of
    // the history cells. 518 identical dates under a heading that could carry
    // one is a column of repetition; the heading is where the claim goes while
    // it is true of everything.
    renderWithContext(
      <UniverseTable
        onRetry={noop}
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
    renderWithContext(
      <UniverseTable
        onRetry={noop}
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
    renderWithContext(
      <UniverseTable
        onRetry={noop}
        view={loaded([equity()], [], [closeFor("NVDA", 230.36, 228.45)])}
      />,
    );

    expect(screen.getByRole("status").textContent).toContain(
      "Closing prices are from the 2026-09-04 session.",
    );
  });

  it("reports the store's scale in the summary rather than in every row", () => {
    renderWithContext(
      <UniverseTable
        onRetry={noop}
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
    renderWithContext(
      <UniverseTable
        onRetry={noop}
        view={loaded([equity(), ABBV], [coverageFor("NVDA")])}
      />,
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
    renderWithContext(
      <UniverseTable onRetry={noop} view={loaded([equity()], [])} />,
    );

    expect(screen.getByText("No market history stored yet")).toBeTruthy();
    expect(screen.queryByText("with history")).toBeNull();
  });

  it("marks an untracked security in words rather than by colour alone", () => {
    renderWithContext(
      <UniverseTable
        onRetry={noop}
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
    renderWithContext(
      <UniverseTable onRetry={noop} view={{ state: "empty" }} />,
    );

    expect(screen.getByText("pnpm universe")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  // The failures are separate because they send a reader to different places. A
  // single "something went wrong" would send most of them to check a service
  // that is running perfectly.
  it("tells no response apart from an unexpected one", () => {
    const { unmount } = renderWithContext(
      <UniverseTable onRetry={noop} view={failed("unreachable", null, true)} />,
    );
    expect(screen.getByText("no response")).toBeTruthy();
    expect(screen.queryByText(/Reference/)).toBeNull();
    unmount();

    renderWithContext(
      <UniverseTable
        onRetry={noop}
        view={failed("answered-badly", "3f1c", false)}
      />,
    );
    expect(screen.getByText("unexpected response")).toBeTruthy();
    // The whole id, never a prefix — `api-client.ts` owns that rule.
    expect(screen.getByText("3f1c")).toBeTruthy();
  });

  // The sentence Task 2.10.2 exists for. A service that is up and cannot reach
  // its database answers a 503, and until this task the page rendered it as
  // "unexpected response" — which told a reader nothing would help at the exact
  // moment waiting was the whole answer.
  it("says a temporary failure is temporary, and offers a way to act on it", () => {
    renderWithContext(
      <UniverseTable
        onRetry={noop}
        view={failed("answered-badly", "3f1c", true)}
      />,
    );

    expect(screen.getByText("temporarily unavailable")).toBeTruthy();
    expect(screen.queryByText("unexpected response")).toBeNull();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
    // Still the one internal identifier this product shows.
    expect(screen.getByText("3f1c")).toBeTruthy();
  });

  // A retry button under a failure that will fail again is a lie the user pays
  // for twice. The absence is stated rather than left to be inferred, which is
  // the half of the copy rule that is easy to drop.
  it("offers no retry for a failure that will not fix itself, and says why", () => {
    renderWithContext(
      <UniverseTable
        onRetry={noop}
        view={failed("answered-badly", "3f1c", false)}
      />,
    );

    expect(screen.queryByRole("button")).toBeNull();
    // Twice: once on the page and once in the live region, which is the shape
    // of every sentence in these states — the announcement is written to be
    // heard out of context and repeats what is visible on purpose.
    expect(screen.getAllByText(/would produce the same answer/)).toHaveLength(
      2,
    );
  });

  // The internal discriminator never reaches the screen — `FRONTEND-STATE.md`
  // §4's first prohibition. It cannot: the flag is derived in the hook and the
  // code never travels this far. This asserts the outcome rather than the
  // mechanism, because it is the outcome that would be regressed by somebody
  // "improving" a failure message with the thing that caused it.
  it("never puts an error code on screen", () => {
    const { container } = renderWithContext(
      <UniverseTable
        onRetry={noop}
        view={failed("answered-badly", "3f1c", true)}
      />,
    );

    expect(container.textContent).not.toContain("SERVICE_UNAVAILABLE");
    expect(container.textContent).not.toContain("503");
  });

  it("presses through to the caller, once per press", () => {
    let presses = 0;
    renderWithContext(
      <UniverseTable
        onRetry={() => {
          presses += 1;
        }}
        view={failed("answered-badly", "3f1c", true)}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(presses).toBe(2);
  });

  // The control stays pressable while a retry is in flight, deliberately: a
  // disabled button loses focus in every browser, which would move a keyboard
  // user to the top of the document at the moment they acted. The hook is what
  // makes a second press safe.
  it("says a retry is in flight without taking the control away", () => {
    renderWithContext(
      <UniverseTable
        onRetry={noop}
        view={failed("answered-badly", "3f1c", true, true)}
      />,
    );

    const button = screen.getByRole("button", { name: "Trying again…" });
    expect(button.hasAttribute("disabled")).toBe(false);
  });

  // A live region whose text does not change announces nothing, so a retry that
  // fails the same way would be silent. Passing through a distinct sentence and
  // back out of it is what makes the second failure heard at all.
  it("announces a retry, and announces the answer to it", () => {
    const view = failed("answered-badly", "3f1c", true);

    const { rerender } = renderWithContext(
      <UniverseTable onRetry={noop} view={view} />,
    );
    const announced = screen.getByRole("status").textContent;

    rerender(
      <UniverseTable
        onRetry={noop}
        view={failed("answered-badly", "3f1c", true, true)}
      />,
    );
    expect(screen.getByRole("status").textContent).toBe(
      "Trying the tracked universe again.",
    );

    rerender(<UniverseTable onRetry={noop} view={view} />);
    expect(screen.getByRole("status").textContent).toBe(announced);
    // And it is still the same DOM node throughout, which is the property that
    // makes any of it audible.
    expect(screen.getAllByRole("status")).toHaveLength(1);
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
      failed("unreachable", null, true),
      {
        state: "loaded",
        securities: [equity()],
        provenance: null,
        coverage: new Map(),
        lastCloses: new Map(),
      },
    ] satisfies readonly SecuritiesView[]) {
      const { unmount } = renderWithContext(
        <UniverseTable onRetry={noop} view={view} />,
      );

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
    renderWithContext(
      <UniverseTable onRetry={noop} view={failed("unreachable", null, true)} />,
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
    renderWithContext(
      <UniverseTable onRetry={noop} view={{ state: "loading" }} />,
    );

    expect(screen.getByRole("status").textContent).toBe("");
  });

  // The skeleton is decoration for a screen reader; the sentence is the answer.
  it("offers one sentence to a screen reader while loading, not seven bars", () => {
    const { container } = renderWithContext(
      <UniverseTable onRetry={noop} view={{ state: "loading" }} />,
    );

    expect(screen.getByText(/Loading the tracked universe/)).toBeTruthy();
    expect(container.querySelectorAll("[aria-hidden='true']")).toHaveLength(1);
  });
});

// The band rail and the collapse (Task 2.11.8).
//
// Everything here is reached by **role and accessible name** rather than by the
// ids the control is built on. That is not a style preference: the ids carry a
// `useId()` prefix so that two of these tables on one page do not collide, and
// `e2e/README.md` names a `useId()` value as a thing a test must not assert on.
// Asking for "the link named Technology 74 securities" is also the stronger
// question — it is what a screen reader is handed.
// **The table's own name** (Task 2.11.9).
//
// Measured with Chromium's accessibility tree: this table computed an
// accessible name of `""`. Invisible to a reader browsing the page — the
// `Region` around it is named — and the whole of what a screen reader's table
// list has to go on, which on a page whose content *is* one table is the one
// navigation aid that could go straight to it.
describe("the table's accessible name", () => {
  it("names itself, so a table list can find it", () => {
    renderWithContext(<UniverseTable onRetry={noop} view={loaded([XLK])} />);

    // By role and name, which is the query a table list is: a `<caption>` is
    // what supplies it, and asserting the element rather than the name would
    // pass on a caption that said nothing.
    expect(
      screen.getByRole("table", { name: "Tracked universe" }),
    ).toBeTruthy();
  });
});

describe("the band rail", () => {
  const twoSectors = () =>
    loaded([XLK, equity(), ABBV, SPY]) as SecuritiesView & { state: "loaded" };

  it("offers one link per band, with its count", () => {
    renderWithContext(<UniverseTable onRetry={noop} view={twoSectors()} />);

    const rail = screen.getByRole("navigation", { name: "Jump to a sector" });
    const links = within(rail).getAllByRole("link");

    // Two sectors and the proxies, in `SECTORS` order with the proxies last —
    // the same order the bands themselves are in, because a contents page in a
    // different order from its contents is worse than none.
    expect(links.map((link) => link.textContent)).toEqual([
      "Technology 2 securities",
      "Health Care 1 securities",
      "Market proxies 1 securities",
    ]);
  });

  // The unit is heard and not seen: on screen the figure sits beside a name and
  // says what it counts by being there, and a bare number at the end of a
  // spoken sentence does not. The same split the band heading already makes.
  it("names each link so the count has a unit when it is heard", () => {
    renderWithContext(<UniverseTable onRetry={noop} view={twoSectors()} />);

    expect(
      screen.getByRole("link", { name: "Technology 2 securities" }),
    ).toBeTruthy();
  });

  // The landmark is named by an element on the page rather than by an
  // `aria-label`, which is `Button`'s `iconOnly` argument applied to a
  // landmark: a second name nobody reviewing the screen can see is a name that
  // drifts from the visible one with no way to notice.
  it("is named by the label a reader can see", () => {
    renderWithContext(<UniverseTable onRetry={noop} view={twoSectors()} />);

    const rail = screen.getByRole("navigation", { name: "Jump to a sector" });
    const label = screen.getByText("Jump to a sector");

    expect(rail.getAttribute("aria-labelledby")).toBe(label.id);
  });

  // The market proxies are in the rail. A jump control that cannot reach a band
  // is close enough to a filter to matter, and this is the band most likely to
  // be dropped by an implementation that thinks in sectors.
  it("reaches the band that is not a sector", () => {
    renderWithContext(<UniverseTable onRetry={noop} view={twoSectors()} />);

    expect(
      screen.getByRole("link", { name: "Market proxies 1 securities" }),
    ).toBeTruthy();
  });

  // And it reaches a band holding a security we have stopped tracking, which is
  // the check TASK-08 asked for by name. `groupUniverse` filters on nothing, so
  // the rail is built from every band there is.
  it("reaches a band holding an untracked security", () => {
    renderWithContext(
      <UniverseTable
        onRetry={noop}
        view={loaded([
          equity({ symbol: toTicker("GILD"), status: "untracked" }),
        ])}
      />,
    );

    expect(
      screen.getByRole("link", { name: "Technology 1 securities" }),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "GILD" })).toBeTruthy();
  });
});

describe("collapsing a band", () => {
  const universe = () => loaded([XLK, equity(), ABBV, SPY]);

  // The disclosure is a real button with a real state, which is what a screen
  // reader announces when it is pressed. Nothing else on this page reports the
  // collapse, on purpose — see the summary line's clause for why a live region
  // would be a second announcement of one action.
  it("is a disclosure that reports its own state", () => {
    renderWithContext(<UniverseTable onRetry={noop} view={universe()} />);

    const band = screen.getByRole("button", {
      name: "Technology Benchmark XLK 2 securities",
    });
    expect(band.getAttribute("aria-expanded")).toBe("true");

    fireEvent.click(band);
    expect(band.getAttribute("aria-expanded")).toBe("false");
  });

  it("removes that band's rows and leaves every other band alone", () => {
    renderWithContext(<UniverseTable onRetry={noop} view={universe()} />);

    expect(screen.getByRole("link", { name: "NVDA" })).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Technology Benchmark XLK 2 securities",
      }),
    );

    expect(screen.queryByRole("link", { name: "NVDA" })).toBeNull();
    expect(screen.queryByRole("link", { name: "XLK" })).toBeNull();
    // Health Care is untouched, which is the half of this that a `collapseAll`
    // masquerading as a toggle would quietly break.
    expect(screen.getByRole("link", { name: "ABBV" })).toBeTruthy();
  });

  // The heading survives the collapse, and it has to: it is both the label for
  // the row group and the only way back to the rows.
  it("keeps the band heading and its count", () => {
    renderWithContext(<UniverseTable onRetry={noop} view={universe()} />);

    const band = screen.getByRole("button", {
      name: "Technology Benchmark XLK 2 securities",
    });
    fireEvent.click(band);

    expect(
      screen.getByRole("button", {
        name: "Technology Benchmark XLK 2 securities",
      }),
    ).toBeTruthy();
  });

  it("names the rows it controls, and that element is still there when they are not", () => {
    const { container } = renderWithContext(
      <UniverseTable onRetry={noop} view={universe()} />,
    );

    const band = screen.getByRole("button", {
      name: "Technology Benchmark XLK 2 securities",
    });
    const controls = band.getAttribute("aria-controls");
    expect(controls).not.toBeNull();

    fireEvent.click(band);

    // An `aria-controls` pointing at nothing is worse than none at all, and the
    // collapse is exactly the moment it could start doing so.
    expect(container.querySelector(`#${CSS.escape(controls ?? "")}`)).not.toBe(
      null,
    );
  });

  // Starting shut is reachable, which is what the workshop needs in order to
  // review the state at all. The route passes nothing.
  it("can start with a band already shut", () => {
    renderWithContext(
      <UniverseTable
        onRetry={noop}
        view={universe()}
        initiallyCollapsed={["technology"]}
      />,
    );

    expect(screen.queryByRole("link", { name: "NVDA" })).toBeNull();
    expect(screen.getByRole("link", { name: "ABBV" })).toBeTruthy();
  });
});

describe("collapse all", () => {
  const universe = () => loaded([XLK, equity(), ABBV, SPY]);

  it("shuts every band and then offers to open them again", () => {
    renderWithContext(<UniverseTable onRetry={noop} view={universe()} />);

    fireEvent.click(screen.getByRole("button", { name: "Collapse all" }));

    expect(screen.queryByRole("link", { name: "NVDA" })).toBeNull();
    expect(screen.queryByRole("link", { name: "ABBV" })).toBeNull();
    expect(screen.queryByRole("link", { name: "SPY" })).toBeNull();

    // The same control saying which way it goes. It is never disabled and never
    // absent — a control that disappears at one end of its own range is a
    // control a reader has to hunt for.
    fireEvent.click(screen.getByRole("button", { name: "Expand all" }));
    expect(screen.getByRole("link", { name: "NVDA" })).toBeTruthy();
  });

  // **This comment used to say the label was the control's feedback for a
  // listener — that "a focused button whose accessible name changes is
  // announced". Corrected 2026-09-11 by Task 2.11.9, which walked it.**
  //
  // An accessible name is read when a control is *reached*. One that changes
  // under a listener already standing on it is not reliably re-read by
  // anything, and what the walk actually heard when this button removed 518
  // rows from the page was nothing at all. The label is still right — it is the
  // same control saying which way it goes — but it is a thing a reader sees
  // rather than a thing a listener is told, and the state below is what tells
  // them.
  it("offers to collapse while anything is open", () => {
    renderWithContext(
      <UniverseTable
        onRetry={noop}
        view={universe()}
        initiallyCollapsed={["technology", "health_care"]}
      />,
    );

    expect(screen.getByRole("button", { name: "Collapse all" })).toBeTruthy();
  });

  // **The half a name change cannot carry** (Task 2.11.9).
  //
  // Task 2.11.8 left the summary line out of the live region on the argument
  // that `aria-expanded` is spoken at the moment the listener presses the
  // control and about the thing they pressed. That argument is complete for a
  // band's own disclosure and did not reach this control, because this control
  // had no `aria-expanded` to speak. It has one now — the same mechanism the
  // twelve bands use, rather than a fourth live region on a page
  // `FRONTEND-STATE.md` §7 already counts three on.
  it("says whether the bands are open, and not only what pressing it does", () => {
    renderWithContext(<UniverseTable onRetry={noop} view={universe()} />);

    const toggle = () =>
      screen.getByRole("button", { name: /Collapse all|Expand all/ });

    expect(toggle().getAttribute("aria-expanded")).toBe("true");

    fireEvent.click(toggle());
    expect(toggle().getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(toggle());
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
  });

  // It carries no `aria-controls`, and that is a decision rather than an
  // omission: there are twelve targets and no element containing all of them,
  // so an id list here would be a promise about "move to controlled element"
  // that nothing can keep.
  it("promises no controlled element it does not have", () => {
    renderWithContext(<UniverseTable onRetry={noop} view={universe()} />);

    expect(
      screen
        .getByRole("button", { name: "Collapse all" })
        .hasAttribute("aria-controls"),
    ).toBe(false);
  });
});

// **The sentence this task owes**, and it is written as an assertion about the
// sentence for the reason `SecurityExplorer.test.tsx`'s is: a control that
// genuinely changes which rows are on screen has to change the line above them
// in the same commit, and the way to be sure is to read the line.
//
// The other half of the pair lives in that file and says the opposite about
// search — typing leaves this sentence byte-identical, because search is a
// surface over the page rather than a filter on it.
describe("the summary line, when rows are hidden", () => {
  const universe = () => loaded([XLK, equity(), ABBV, SPY]);

  const sentence = () =>
    screen.getByText("securities tracked").closest("p")?.textContent;

  it("says nothing about rows while every one of them is on screen", () => {
    renderWithContext(<UniverseTable onRetry={noop} view={universe()} />);

    // The asymmetry the `no longer tracked` and `all with history` clauses
    // already have: a line reading `4 of 4 rows shown` at rest is two identical
    // figures a centimetre apart, which reads as a mistake.
    expect(sentence()).not.toContain("rows shown");
  });

  it("reports how many rows are left when a band is shut", () => {
    renderWithContext(<UniverseTable onRetry={noop} view={universe()} />);

    const before = sentence();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Technology Benchmark XLK 2 securities",
      }),
    );

    expect(sentence()).not.toBe(before);
    expect(sentence()).toContain("2 of 4 rows shown");
  });

  it("reports zero when everything is shut, rather than dropping the clause", () => {
    renderWithContext(<UniverseTable onRetry={noop} view={universe()} />);

    fireEvent.click(screen.getByRole("button", { name: "Collapse all" }));

    expect(sentence()).toContain("0 of 4 rows shown");
  });

  // Collapsing hides rows; it does not untrack a security. Every figure that is
  // a claim about the universe has to survive a control that is a claim about
  // the screen.
  it("leaves every other figure exactly where it was", () => {
    renderWithContext(<UniverseTable onRetry={noop} view={universe()} />);

    fireEvent.click(screen.getByRole("button", { name: "Collapse all" }));

    expect(sentence()).toContain("4 securities tracked");
    expect(sentence()).toContain("2 sectors");
  });

  // And the live region is not one of the things that moves. `aria-expanded` on
  // the button is spoken at the moment a listener presses it, about the thing
  // they pressed; a `role=status` re-reading the summary on top of that is two
  // announcements of one action.
  it("does not re-announce the page when a band is shut", () => {
    renderWithContext(<UniverseTable onRetry={noop} view={universe()} />);

    const announced = screen.getByRole("status").textContent;

    fireEvent.click(screen.getByRole("button", { name: "Collapse all" }));

    expect(screen.getByRole("status").textContent).toBe(announced);
  });
});
