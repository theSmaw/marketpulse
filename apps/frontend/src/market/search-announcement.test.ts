import type { EquitySecurity } from "@marketpulse/shared";
import { toTicker } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import { matchSecurities } from "./security-match.js";
import { searchAnnouncement } from "./search-announcement.js";

// The four sentences `SEARCH-AND-SELECTION.md` §4 works, plus the property
// that makes the region audible at all.

const equity = (symbol: string, name: string): EquitySecurity => ({
  symbol: toTicker(symbol),
  name,
  exchange: "NASDAQ",
  kind: "equity",
  sector: "technology",
  industry: null,
  status: "active",
  cik: null,
});

const NVDA = equity("NVDA", "NVIDIA Corporation");
const NVR = equity("NVR", "NVR, Inc.");
const UNIVERSE = [NVDA, NVR];

const say = (query: string, universe = UNIVERSE, limit?: number) =>
  searchAnnouncement(query, {
    state: "ready",
    result: matchSecurities(universe, query, limit),
  });

/** The same query, asked before the universe has arrived (Task 2.11.6). */
const sayWhileLoading = (query: string) =>
  searchAnnouncement(query, { state: "loading" });

describe("the sentence the search's live region speaks", () => {
  it("says nothing at all before anything has been typed", () => {
    expect(say("")).toBeNull();
  });

  it("says nothing for a query that is only whitespace", () => {
    expect(say("   ")).toBeNull();
  });

  it("names its subject first, in every sentence it can produce", () => {
    const sentences = [say("nv"), say("nvda"), say("zzz")];

    for (const sentence of sentences) {
      expect(sentence).toMatch(/^Security search: /);
    }
  });

  it("names the top match when there is more than one", () => {
    expect(say("nv")).toBe('Security search: 2 matches for "nv". NVDA first.');
  });

  it("names the only match, without 'first', when there is exactly one", () => {
    expect(say("nvda")).toBe('Security search: 1 match for "nvda". NVDA.');
  });

  it("reports no matches rather than an empty count", () => {
    expect(say("zzz")).toBe('Security search: no matches for "zzz".');
  });

  it("says the list is a slice when it is one, and names no top match", () => {
    expect(say("nv", UNIVERSE, 1)).toBe(
      'Security search: 2 matches for "nv", showing the first 1.',
    );
  });

  // The mechanism §7 measured: a live region whose text does not change
  // announces nothing. A count alone repeats itself; the query does not.
  it("differs between two queries that matched the same number of things", () => {
    const nv = say("nv");
    const n = say("n");

    expect(matchSecurities(UNIVERSE, "n").total).toBe(
      matchSecurities(UNIVERSE, "nv").total,
    );
    expect(n).not.toBe(nv);
  });

  it("quotes the query as typed, trimmed", () => {
    expect(say("  nv  ")).toContain('"nv"');
  });
});

describe("the sentence before the universe has arrived", () => {
  // The corpus is checked before the count, and this is the reason: an empty
  // universe matches nothing, so the *no matches* sentence is reachable here —
  // and it would be a claim about the market made from data nobody has seen.
  it("says the securities are still loading rather than that nothing matched", () => {
    expect(sayWhileLoading("nv")).toBe(
      'Security search: still loading securities. "nv" is kept.',
    );
  });

  it("stays silent when nothing has been typed, like every other state", () => {
    expect(sayWhileLoading("")).toBeNull();
    expect(sayWhileLoading("   ")).toBeNull();
  });

  // Same rule as the four sentences above, for the same reason: a live region
  // whose text does not change announces nothing, and a listener who edits the
  // query while the universe is in flight has changed the only thing that can
  // differ.
  it("quotes the query, so two of them are two sentences", () => {
    expect(sayWhileLoading("nv")).not.toBe(sayWhileLoading("nvi"));
  });

  it("names its subject first, like every other state", () => {
    expect(sayWhileLoading("nv")?.startsWith("Security search:")).toBe(true);
  });
});
