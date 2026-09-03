import { BrowserRouter, Route, Routes } from "react-router";

import { AppHeader } from "./components/AppHeader/AppHeader.js";
import { ErrorBoundary } from "./components/ErrorBoundary/ErrorBoundary.js";
import { InvestigationWorkspace } from "./routes/InvestigationWorkspace.js";
import { MarketOverview } from "./routes/MarketOverview.js";
import { MarketReplay } from "./routes/MarketReplay.js";
import { NotFound } from "./routes/NotFound.js";
import { PATHS } from "./routes/paths.js";
import { SecurityExplorer } from "./routes/SecurityExplorer.js";
import { useBackendHealth } from "./use-backend-health.js";
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
  // The backend health poll, started here and rendered nowhere yet
  // (Task 1.12.3).
  //
  // **The value is deliberately unused for exactly one task.** Task 1.12.4
  // builds the indicator and Task 1.12.5 gives this result a consumer in
  // `AppHeader`; what this line is doing in the meantime is keeping the
  // deployed frontend calling the deployed backend, which is Story 1.11's
  // criterion and which `health-probe.ts` held until this change deleted it.
  // Deleting the probe without starting this loop would leave a merge window
  // with no call at all, and starting the loop from a component that does not
  // exist yet is not available.
  //
  // It lives in `App` rather than in `AppHeader` because the poll is a property
  // of the application rather than of the chrome: `AppHeader` sits inside its
  // own `ErrorBoundary`, and a header that throws would otherwise take the
  // health check down with it — the state would stop updating at the moment it
  // became most interesting. Task 1.12.5 can pass this value down; it should
  // not move the call.
  useBackendHealth();

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className={styles.page}>
        {/*
         * The chrome gets its own boundary, and that was a decision rather than
         * a default (Task 1.7.6). `AppHeader` is outside `<Routes>` and eager,
         * which is what lets a Story 1.12 status indicator survive the thing it
         * is reporting on — and it also means a failure *in* the header has
         * nothing above it. Without this, a header that throws unmounts the
         * whole tree and the user gets a blank document, which is the exact
         * outcome PRODUCT_SPEC.md §36 forbids, reached from the one place
         * nobody looks.
         *
         * `compact` because the strip is a line tall and a stacked block here
         * would push the page down. The cost, stated rather than discovered:
         * this fallback replaces the `<header>`, so a broken chrome takes the
         * banner landmark and the navigation with it. Everything below keeps
         * working and the address bar still works, which is the recovery that
         * is left.
         */}
        <ErrorBoundary
          title="The header could not be displayed"
          detail="Navigation is unavailable; the page below is unaffected."
          compact
        >
          <AppHeader feedStatus="disconnected" feedDetail={FEED_DETAIL} />
        </ErrorBoundary>

        <main className={styles.main}>
          {/*
           * The outer boundary, and it is deliberately not the only one.
           *
           * Task 1.5.5 measured what a boundary *only* here does: a
           * `<Suspense fallback={null}>` at the router blanked the entire
           * `<main>` — four named landmarks and the 70vh grid — under a header
           * that looked perfectly healthy. That is the degenerate case, and the
           * region boundaries inside `Region` are what stop it happening on the
           * landing route: React uses the nearest boundary, so a failure in a
           * region's contents never reaches this one.
           *
           * What this one is for is everything that is not inside a region.
           * On the four routes that are deliberately a single area —
           * investigations, securities, replay and the not-found route — the
           * outlet *is* the affected region, and this is the boundary around
           * it. On the landing route it catches a failure in the route's own
           * frame: the grid, the placeholder, or `Region` itself throwing
           * before its own boundary exists. Both cases leave the chrome.
           */}
          <ErrorBoundary
            title="This page could not be displayed"
            detail="The rest of the application is unaffected — try again, or use the navigation above."
          >
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
          </ErrorBoundary>
        </main>
      </div>
    </BrowserRouter>
  );
}
