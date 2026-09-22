import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import * as ReactRouter from "react-router";

import type { SecuritiesView } from "../../use-securities.js";
import { renderWithContext } from "../../test-render.js";
import { UniverseTable } from "./UniverseTable.js";
import { toMarketDate, toTicker } from "@marketpulse/shared";
import type { Bar, EquitySecurity } from "@marketpulse/shared";

// **What a tick costs, asserted below a browser** (Task 3.6.5).
//
// The live feed re-renders this table once a minute for ever, and on a
// production build that was measured at **47 ms of script per tick** for 518
// rows — against `PRODUCT_SPEC.md` §28's 50 ms line — with a further 40 ms
// every 30 s when the backend health poll re-rendered the whole route from
// `App` with nothing on this page changed. The repair is two memo boundaries:
// a row bails out when none of its inputs changed, and a row that DID change
// re-renders its two live cells and not its four static ones.
//
// ## Why the assertion counts `Link` renders
//
// A duration is not assertable here — jsdom has no layout and a timing on a
// shared runner is noise — but the mechanism is: the symbol cell's `Link`
// is the most expensive thing in a row (two context reads and an href per
// render), it lives in the static half, and it renders **zero** times when
// a price arrives if the boundary holds. Counting it is counting the
// boundary. `pnpm break a-price-re-renders-every-symbol-link` removes the
// memo and proves this goes red.
//
// **A file of its own because `vi.mock` is file-wide.** Wrapping the router's
// `Link` in a counter inside `UniverseTable.test.tsx` would put a mock under
// every presentation test there for the sake of one assertion.

let linkRenders = 0;

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>();
  const CountedLink = (props: ReactRouter.LinkProps) => {
    linkRenders += 1;
    return <actual.Link {...props} />;
  };
  return { ...actual, Link: CountedLink };
});

const equity = (
  symbol: string,
  name: string,
  industry: string,
): EquitySecurity => ({
  symbol: toTicker(symbol),
  name,
  kind: "equity",
  sector: "technology",
  industry,
  status: "active",
  exchange: "NASDAQ",
  cik: null,
});

const NVDA = equity("NVDA", "NVIDIA Corporation", "Semiconductors");
const AMD = equity("AMD", "Advanced Micro Devices", "Semiconductors");
const AAPL = equity("AAPL", "Apple Inc.", "Technology Hardware");

const bar = (close: number): Bar => ({
  startsAt: new Date("2026-09-16T18:01:00Z"),
  open: close,
  high: close,
  low: close,
  close,
  volume: 1_000,
});

const loaded = (): SecuritiesView => ({
  state: "loaded",
  securities: [NVDA, AMD, AAPL],
  provenance: null,
  coverage: new Map(),
  lastCloses: new Map([
    [
      "NVDA",
      {
        symbol: "NVDA",
        session: toMarketDate("2026-09-11"),
        close: 220,
        previousClose: 218,
      },
    ],
  ]),
});

describe("what a tick costs", () => {
  it("a price arriving re-renders no symbol link", () => {
    const view = loaded();
    const nvda = bar(231);
    const amd = bar(150);
    const first = new Map([
      ["NVDA", nvda],
      ["AMD", amd],
    ]);

    const { rerender } = renderWithContext(
      <UniverseTable
        view={view}
        onRetry={() => undefined}
        observations={first}
      />,
    );
    expect(screen.getByText("231.00")).toBeTruthy();
    const afterMount = linkRenders;
    expect(afterMount).toBeGreaterThanOrEqual(3);

    // The tick: a NEW map — `withObservations` always builds one — in which
    // one security has a new bar and the other keeps the same reference,
    // which is exactly what the reducer hands the table.
    const next = new Map([
      ["NVDA", bar(232.5)],
      ["AMD", amd],
    ]);
    rerender(
      <UniverseTable
        view={view}
        onRetry={() => undefined}
        observations={next}
      />,
    );

    // The price moved — so the tick reached the table — and no link rendered.
    expect(screen.getByText("232.50")).toBeTruthy();
    expect(screen.queryByText("231.00")).toBeNull();
    expect(linkRenders).toBe(afterMount);
  });

  it("a re-render with nothing changed re-renders no row at all", () => {
    // The health poll's case: `App` re-renders every 30 s and hands this
    // table the same observations it already had.
    const view = loaded();
    const same = new Map([["NVDA", bar(231)]]);

    const { rerender } = renderWithContext(
      <UniverseTable
        view={view}
        onRetry={() => undefined}
        observations={same}
      />,
    );
    const afterMount = linkRenders;

    rerender(
      <UniverseTable
        view={view}
        onRetry={() => undefined}
        observations={same}
      />,
    );

    expect(linkRenders).toBe(afterMount);
    expect(screen.getByText("231.00")).toBeTruthy();
  });
});
