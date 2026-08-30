// The bundler's entry point, named to match the `<script type="module">` in
// ../index.html. Still deliberately not a React application: Task 1.3.1 is the
// toolchain, and Task 1.3.2 is what replaces this file with `main.tsx`.
//
// The @marketpulse/shared import is the load-bearing line. It is the only
// thing proving the workspace dependency resolves through the bundler as well
// as through `tsc`, and the two use entirely different resolvers.
import { toTicker, type Ticker } from "@marketpulse/shared";

const ticker: Ticker = toTicker("AAPL");

const root = document.querySelector("#root");

if (root === null) {
  throw new Error("index.html is missing its #root element");
}

root.textContent = `@marketpulse/frontend — shared resolves through the bundler: ${ticker}`;
