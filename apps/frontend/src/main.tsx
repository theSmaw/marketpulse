import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// The relative import carries a `.js` extension while the file on disk is
// `App.tsx`. This is `nodenext` resolution asking for the *emitted* filename
// rather than the source one, and omitting it is a hard TS2835 — the same rule
// the backend and shared package already follow, one step further because the
// source extension here is `.tsx` rather than `.ts`.
import { App } from "./App.js";

// The repository's first CSS, and a side-effect import rather than a binding:
// the bundler extracts it into `dist/assets/*.css` and adds the `<link>` to the
// emitted index.html. Nothing here reads a value from it.
//
// Note the specifier has no `.js` extension, and that is not an oversight. The
// convention above rewrites relative imports *between TypeScript files* to the
// name tsc will emit; a stylesheet is not compiled and `./throwaway.css` is the
// real filename on disk. Over-applying TS2835 to the first non-TypeScript
// import in the repository is the easy mistake.
//
// Throwaway, deliberately: Task 1.4.3 replaces its contents with the token
// definitions. It exists so that when a token then fails to apply, "the CSS
// never reached the browser" is already ruled out.
import "./throwaway.css";

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
