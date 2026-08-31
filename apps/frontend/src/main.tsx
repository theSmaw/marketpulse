import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// The relative import carries a `.js` extension while the file on disk is
// `App.tsx`. This is `nodenext` resolution asking for the *emitted* filename
// rather than the source one, and omitting it is a hard TS2835 — the same rule
// the backend and shared package already follow, one step further because the
// source extension here is `.tsx` rather than `.ts`.
import { App } from "./App.js";
import { getTokens } from "./styles/tokens.js";

// The token layer, as three side-effect imports rather than bindings: the
// bundler extracts them into `dist/assets/*.css` and adds the `<link>` to the
// emitted index.html. Nothing here reads a value from any of them.
//
// Order matters and is not alphabetical. It runs outward: `tokens.css`
// declares the structural custom properties, `market.css` layers the semantic
// market colours over them, and `base.css` consumes both at the element level.
// A custom property referenced before it is declared resolves to nothing, so
// the declarations have to reach the cascade first. All three are imported here
// rather than chained through one another so that the order is visible in the
// file that owns it.
//
// Note the specifiers have no `.js` extension, and that is not an oversight.
// The convention this file follows for `./App.js` rewrites relative imports
// *between TypeScript files* to the name tsc will emit; a stylesheet is not
// compiled and these are the real filenames on disk.
import "./styles/tokens.css";
import "./styles/market.css";
import "./styles/base.css";

// Fail fast if the token layer did not reach the browser. `getTokens()` throws
// naming the first token that resolved to nothing, which turns the silent
// failure mode of this stack — an unstyled page that still renders, because a
// missing custom property is not an error to CSS — into a message. It is one
// `getComputedStyle` call at startup and the result is cached for the
// non-React consumers that will need it from Epic 2 onward.
getTokens();

// createRoot, not the legacy ReactDOM.render — the legacy entry point is gone
// in React 19 and `react-dom/client` is the only mount API.
const container = document.querySelector("#root");

if (container === null) {
  throw new Error("index.html is missing its #root element");
}

// StrictMode was deliberately absent until Task 1.3.3, and adding it here is
// the decision that task owed. It double-invokes render, effects and state
// updaters in development to surface impure components — which is exactly the
// signal used to tell a fast refresh from a full reload, so it had to go in
// *after* that measurement rather than before. Adopting it first makes a
// double-render and a lost-state bug look alike.
//
// Measured both ways: the fast-refresh reading is unchanged with it on. It
// costs nothing in production — React strips it from the production build.
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
