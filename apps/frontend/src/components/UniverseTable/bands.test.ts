import { describe, expect, it } from "vitest";

import {
  allCollapsed,
  bandButtonId,
  bandRowsId,
  collapseAll,
  expandAll,
  rowsShown,
  toggleBand,
} from "./bands.js";
import type { CountedBand } from "./bands.js";

/** The real shape, at the real proportions: eleven sectors and the proxies,
 *  with the counts the recorded universe actually has. Anything smaller would
 *  let an off-by-one in `rowsShown` pass. */
const BANDS: readonly CountedBand[] = [
  ["technology", 74],
  ["health_care", 60],
  ["financials", 77],
  ["consumer_discretionary", 48],
  ["communication_services", 25],
  ["industrials", 84],
  ["consumer_staples", 35],
  ["energy", 22],
  ["utilities", 32],
  ["real_estate", 31],
  ["materials", 26],
  ["market-proxies", 4],
].map(([key, count]) => ({
  key: key as string,
  securities: Array.from({ length: count as number }, () => null),
}));

const TOTAL = 518;

describe("toggleBand", () => {
  it("shuts a band that was open", () => {
    expect([...toggleBand(new Set(), "technology")]).toStrictEqual([
      "technology",
    ]);
  });

  it("opens a band that was shut", () => {
    expect([
      ...toggleBand(new Set(["technology"]), "technology"),
    ]).toStrictEqual([]);
  });

  it("leaves the other bands alone", () => {
    const next = toggleBand(new Set(["technology", "energy"]), "energy");
    expect([...next]).toStrictEqual(["technology"]);
  });

  it("returns a new set rather than the one it was given", () => {
    // The whole reason this module exists as pure functions: a mutated `Set`
    // handed back to `setState` is the same object, so React renders nothing
    // and the band appears not to respond to a click.
    const before = new Set(["technology"]);
    const after = toggleBand(before, "energy");

    expect(after).not.toBe(before);
    expect([...before]).toStrictEqual(["technology"]);
  });
});

describe("collapseAll and expandAll", () => {
  it("shuts every band on screen, including the market proxies", () => {
    const all = collapseAll(BANDS);

    expect(all.size).toBe(12);
    // The band with no sector is in the set. A control that cannot reach it is
    // a filter wearing a different hat.
    expect(all.has("market-proxies")).toBe(true);
  });

  it("opens everything", () => {
    expect(expandAll().size).toBe(0);
  });
});

describe("allCollapsed", () => {
  it("is false while one band is open", () => {
    const all = new Set(collapseAll(BANDS));
    all.delete("energy");

    expect(allCollapsed(BANDS, all)).toBe(false);
  });

  it("is true when every band on screen is shut", () => {
    expect(allCollapsed(BANDS, collapseAll(BANDS))).toBe(true);
  });

  it("ignores a collapsed key with no band behind it", () => {
    // The stale-key case: the universe is re-fetched and a sector loses its
    // last row. Comparing set sizes would report "all collapsed" over a table
    // with 518 rows in it, and the one control that reads this answer would
    // offer to expand a table nothing had collapsed.
    const stale = new Set([...collapseAll(BANDS), "a_sector_that_left"]);
    const missing = BANDS.filter((band) => band.key !== "energy");

    expect(allCollapsed(missing, stale)).toBe(true);
    expect(allCollapsed(BANDS, new Set(["a_sector_that_left"]))).toBe(false);
  });

  it("is false when there are no bands at all", () => {
    // "Every band is shut" over an empty table is vacuously true and is the
    // wrong answer for the only thing that asks: a control offering to expand
    // nothing.
    expect(allCollapsed([], new Set())).toBe(false);
  });
});

describe("rowsShown", () => {
  it("counts every row while nothing is shut", () => {
    expect(rowsShown(BANDS, new Set())).toBe(TOTAL);
  });

  it("counts nothing when everything is shut", () => {
    expect(rowsShown(BANDS, collapseAll(BANDS))).toBe(0);
  });

  it("subtracts exactly the band that was shut", () => {
    // 518 − 74. The figure the summary line publishes, and the one that is a
    // lie if this is off by one.
    expect(rowsShown(BANDS, new Set(["technology"]))).toBe(444);
  });

  it("subtracts nothing for a collapsed key with no band behind it", () => {
    expect(rowsShown(BANDS, new Set(["a_sector_that_left"]))).toBe(TOTAL);
  });
});

describe("the DOM ids", () => {
  it("carries the caller's prefix, so two tables on one page do not collide", () => {
    expect(bandButtonId("r1", "technology")).not.toBe(
      bandButtonId("r2", "technology"),
    );
  });

  it("gives a band's button and its rows different ids", () => {
    expect(bandButtonId("r1", "technology")).not.toBe(
      bandRowsId("r1", "technology"),
    );
  });
});
