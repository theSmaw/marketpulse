import { BrowserRouter, Route, Routes } from "react-router";

import { AppHeader } from "./components/AppHeader/AppHeader.js";
import { InvestigationWorkspace } from "./routes/InvestigationWorkspace.js";
import { MarketOverview } from "./routes/MarketOverview.js";
import { MarketReplay } from "./routes/MarketReplay.js";
import { NotFound } from "./routes/NotFound.js";
import { PATHS } from "./routes/paths.js";
import { SecurityExplorer } from "./routes/SecurityExplorer.js";
import styles from "./App.module.css";

// `App` stopped being a page in Task 1.5.2 and became the router's host. Task
// 1.5.3 took the navigation out of it too: the chrome is `components/AppHeader`
// now, rendered once outside `<Routes>` so it survives navigation rather than
// being remounted by it. What is left here is the route table and the two
// elements that hold the page together.
//
// React Router in **declarative mode**: `<BrowserRouter>` plus `<Routes>` and
// `<Route>`, which is a library import and nothing else. Task 1.5.1 chose it
// over TanStack Router on measurements recorded in that task, and deliberately
// did not adopt `@react-router/dev` — there is no plugin, no code generation
// and no root tooling behind any of this.
//
// Route modules live in `src/routes/` rather than `src/components/`: the
// stories check walks the components directory, and a route placeholder with
// one state does not owe a permutation grid. `AppHeader` is on the other side
// of that line and says why in its own header comment.
//
// Only the landing route has layout regions, and the asymmetry is deliberate
// rather than unfinished. Task 1.5.4 built PRODUCT_SPEC.md §9's structure into
// `MarketOverview`, which is the one screen the spec actually sketches; the
// other three occupy this outlet as a single area. Inventing an Investigation
// Workspace layout here would be scaffolding ahead of Epic 7, and the layout it
// invented would be wrong — §8.2 lists eight kinds of content and says nothing
// about where any of them sits.
//
// No `React.lazy` and no dynamic `import()` anywhere here. Every route module
// is a static import, so `dist/` stays three files and the artefact's shape is
// unchanged by this task. Task 1.5.5 owns splitting, as a decision with a
// measurement behind it rather than one taken by reflex.

// `basename` is read from `import.meta.env.BASE_URL` and is not optional
// (Task 1.6.5). Vite's `base` and React Router's `basename` describe **one**
// fact — the path the application is deployed under — and until this task they
// were two build-time inputs that did not know about each other. `base` fixes
// the asset URLs; React Router goes on matching against the full pathname. Set
// one without the other and the failure looks like success: the assets resolve,
// React boots, and the **not-found route renders at the application's own
// address**, under chrome that looks perfectly healthy. Measured before it was
// fixed — `base: "/marketpulse/"` served from a plain static host gave
// `<h1>No such page</h1>` at `/marketpulse/`, and every link in the header
// pointed at `/investigations` rather than `/marketpulse/investigations`, off
// the deployment entirely.
//
// One input, two readers, is the shape this repository already uses for the
// browser baseline: `target` in tsconfig.json and `build.target` in
// vite.config.ts, which must be equal and say so in both places. The difference
// is that here the second reader can be *derived* rather than restated, so
// there is nothing to keep in step.
//
// `BASE_URL` is exempt from `envPrefix` and does not need a `VITE_` prefix,
// which is why this is not a hole in Task 1.6.4's boundary: it is one of Vite's
// own built-ins, set from `base`, rather than anything a `.env` file can reach.
// The value is substituted at build time like any other, and it was checked in
// the artefact rather than assumed — a `void 0` here would be a `basename` of
// `undefined`, which is exactly the bug this comment is about.
//
// The trailing slash is Vite's (`/marketpulse/`) and React Router accepts it —
// it strips one internally, so `basename="/marketpulse/"` and
// `basename="/marketpulse"` behave identically. Checked rather than assumed,
// because a basename that is off by a slash fails the same way as no basename
// at all. At the default `base` of `/` this is `basename="/"`, which is what
// React Router already assumes, so the default deployment is unchanged.
//
// Route paths are deliberately not part of this. They live once in
// `routes/paths.ts` so `tsc -b` catches a typo, and they are the same in every
// environment — the basename is a deployment fact, a path is not. Nothing here
// turns a path into a string read from the environment, and the next person
// reading "configuration" and "routes" in one file should not either.

// The feed's state, hard-coded, and `disconnected` is the honest value: there
// is no market data in this application until Epic 3, and rendering `live`
// because §9's sketch shows it would be a green tick that means nothing. The
// detail line says which epic changes it. Story 1.12 decides whether the
// backend connection is this same fact or a second indicator beside it.
const FEED_DETAIL = "No market data until Epic 3";

export function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className={styles.page}>
        <AppHeader feedStatus="disconnected" feedDetail={FEED_DETAIL} />

        <main className={styles.main}>
          <Routes>
            <Route path={PATHS.overview} element={<MarketOverview />} />
            <Route
              path={PATHS.investigations}
              element={<InvestigationWorkspace />}
            />
            <Route path={PATHS.securities} element={<SecurityExplorer />} />
            <Route path={PATHS.replay} element={<MarketReplay />} />
            {/* Everything else. `*` is not in PATHS because it is not an
                address — nothing links to it and nothing should. */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
