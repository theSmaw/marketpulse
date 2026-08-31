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

// The feed's state, hard-coded, and `disconnected` is the honest value: there
// is no market data in this application until Epic 3, and rendering `live`
// because §9's sketch shows it would be a green tick that means nothing. The
// detail line says which epic changes it. Story 1.12 decides whether the
// backend connection is this same fact or a second indicator beside it.
const FEED_DETAIL = "No market data until Epic 3";

export function App() {
  return (
    <BrowserRouter>
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
