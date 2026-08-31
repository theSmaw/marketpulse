import { Placeholder } from "./Placeholder.js";

// PRODUCT_SPEC.md §8.3 — "What is happening with this security?". The path is
// `/securities` and the symbol form is deliberately not declared yet; the
// reasoning is in `paths.ts`, beside the table that would have to carry it.
export function SecurityExplorer() {
  return (
    <Placeholder label="Placeholder" name="Security Explorer">
      One security in detail — price, volume, abnormal-move indicators, relative
      performance and the filings that might explain them. Epic 4 gives it real
      market data and a symbol in the URL; Epic 9 attaches the SEC evidence.
    </Placeholder>
  );
}
