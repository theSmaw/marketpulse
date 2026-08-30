import { createRoot } from "react-dom/client";

// The relative import carries a `.js` extension while the file on disk is
// `App.tsx`. This is `nodenext` resolution asking for the *emitted* filename
// rather than the source one, and omitting it is a hard TS2835 — the same rule
// the backend and shared package already follow, one step further because the
// source extension here is `.tsx` rather than `.ts`.
import { App } from "./App.js";

// createRoot, not the legacy ReactDOM.render — the legacy entry point is gone
// in React 19 and `react-dom/client` is the only mount API.
const container = document.querySelector("#root");

if (container === null) {
  throw new Error("index.html is missing its #root element");
}

createRoot(container).render(<App />);
