import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";

import { PATHS, ROUTE_PATTERNS, securityPath } from "./paths.js";
import { DEFAULT_SYMBOL, useSecuritySymbol } from "./use-security-symbol.js";

// The one place a symbol is read out of the address, driven through a **real**
// router rather than through a mocked `useParams` (Task 2.10.7).
//
// That is the whole point of the file: what is being tested is that the route
// pattern, the path builder and the reader agree, and a mocked `useParams`
// would test the reader against an assumption about the other two. The
// round-trip cases below — a dot in a ticker, a symbol that has to be encoded —
// are only meaningful because a real router does the matching and the decoding.

function Probe() {
  const { symbol, fromAddress } = useSecuritySymbol();
  return (
    <>
      <span data-testid="symbol">{symbol}</span>
      <span data-testid="from-address">{String(fromAddress)}</span>
    </>
  );
}

/** Mount the two real routes at an address and read what the hook saw. */
function at(address: string): { symbol: string | null; fromAddress: boolean } {
  // Unmounted before returning, so a test may call this more than once.
  // `afterEach(cleanup)` runs between *tests*, not between renders, and the
  // symptom of forgetting is "found multiple elements" — which is the exact
  // failure `test-setup.ts` exists to prevent one level up.
  const { unmount } = render(
    <MemoryRouter initialEntries={[address]}>
      <Routes>
        <Route path={PATHS.securities} element={<Probe />} />
        <Route path={ROUTE_PATTERNS.security} element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  );

  const read = {
    symbol: screen.getByTestId("symbol").textContent,
    fromAddress: screen.getByTestId("from-address").textContent === "true",
  };

  unmount();
  return read;
}

describe("useSecuritySymbol", () => {
  it("reads the symbol the address names", () => {
    expect(at("/securities/AMD")).toEqual({
      symbol: "AMD",
      fromAddress: true,
    });
  });

  it("falls back to a default when the address names none", () => {
    // The ordinary case until Story 2.11 ships search: a page that answered
    // "choose a security" with no means of choosing one would be a dead end
    // wearing an empty state.
    expect(at(PATHS.securities)).toEqual({
      symbol: DEFAULT_SYMBOL,
      fromAddress: false,
    });
  });

  it("round-trips a ticker that has to be encoded", () => {
    // Class shares are spelled with a dot by the vendor, and the universe holds
    // them. `securityPath` encodes once and the router decodes once; the point
    // of building the address rather than writing it is that neither end has to
    // be remembered at a call site.
    expect(at(securityPath("BRK.B")).symbol).toBe("BRK.B");
  });

  it("treats an empty or whitespace segment as no symbol at all", () => {
    // A hand-typed URL can produce both, and a route match cannot rule either
    // out. Asking the server about `""` produces a 400 about a malformed ticker
    // where the honest answer is that nothing was asked for.
    expect(at("/securities/").fromAddress).toBe(false);
    expect(at(`/securities/${encodeURIComponent("   ")}`)).toEqual({
      symbol: DEFAULT_SYMBOL,
      fromAddress: false,
    });
  });

  it("does not repair a symbol that is merely unusual", () => {
    // `/securities/nvda` is a real request for a security spelled `nvda`, and
    // the server answers it — with a 404 naming the input if it does not track
    // that spelling. Silently upper-casing would change what the reader typed
    // and then report on something else.
    expect(at("/securities/nvda").symbol).toBe("nvda");
  });
});
