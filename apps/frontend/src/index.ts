// Placeholder. The real React application — Vite, the app shell, the feature
// modules under app/ — is Story 1.3. This file exists to prove that the
// frontend resolves @marketpulse/shared through its `exports` map and that the
// DOM library is in scope, and it should be replaced wholesale rather than
// grown.
import { toTicker, type Ticker } from "@marketpulse/shared";

const ticker: Ticker = toTicker("AAPL");

export function mount(root: HTMLElement): void {
  root.textContent = `@marketpulse/frontend skeleton — shared resolves: ${ticker}`;
}
