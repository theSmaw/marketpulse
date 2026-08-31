import { BrowserRouter, NavLink, Route, Routes } from "react-router";

import { cx } from "./cx.js";
import { InvestigationWorkspace } from "./routes/InvestigationWorkspace.js";
import { MarketOverview } from "./routes/MarketOverview.js";
import { MarketReplay } from "./routes/MarketReplay.js";
import { NotFound } from "./routes/NotFound.js";
import { PATHS } from "./routes/paths.js";
import { SecurityExplorer } from "./routes/SecurityExplorer.js";
import styles from "./App.module.css";

// `App` stopped being a page in Task 1.5.2 and became the router's host. What
// it renders is the route table and, temporarily, the only way to click between
// the routes — everything that used to be here moved to `routes/MarketOverview`
// with the render check it belongs to.
//
// React Router in **declarative mode**: `<BrowserRouter>` plus `<Routes>` and
// `<Route>`, which is a library import and nothing else. Task 1.5.1 chose it
// over TanStack Router on measurements recorded in that task, and deliberately
// did not adopt `@react-router/dev` — there is no plugin, no code generation
// and no root tooling behind any of this.
//
// Route modules live in `src/routes/` rather than `src/components/`: the
// stories check walks the components directory, and a route placeholder with
// one state does not owe a permutation grid. `routes/Placeholder.tsx` carries
// the longer version of that argument.
//
// No `React.lazy` and no dynamic `import()` anywhere here. Every route module
// is a static import, so `dist/` stays three files and the artefact's shape is
// unchanged by this task. Task 1.5.5 owns splitting, as a decision with a
// measurement behind it rather than one taken by reflex.

// Navigation, and it is scaffolding. Task 1.5.3 builds the real chrome — the
// product name, the market clock area and the connection status — at which
// point this strip becomes part of it or is replaced by it. It is here now
// because "reachable by clicking as well as by typing a URL" is one of this
// task's criteria and cannot be met by a route table alone.
//
// Every `to` reads from `PATHS`, which is the whole point of that table: React
// Router's `to` is a plain string, so a literal typed here would be caught by
// nothing until somebody clicked it.
const NAVIGATION = [
  { to: PATHS.overview, label: "Market Overview" },
  { to: PATHS.investigations, label: "Investigation Workspace" },
  { to: PATHS.securities, label: "Security Explorer" },
  { to: PATHS.replay, label: "Market Replay" },
] as const;

export function App() {
  return (
    <BrowserRouter>
      <div className={styles.page}>
        <header className={styles.header}>
          <p className={styles.microLabel}>Application shell</p>
          {/* The product name is not an `<h1>`, and it was one until this
              task. There is a heading on every screen now — the route's own
              name — and two `<h1>`s on one page leaves a screen reader user
              with no single answer to "what is this page?". The route wins,
              because it is the thing that changes. Story 1.5.3 keeps this
              property when it builds the real chrome. */}
          <p className={styles.title}>MarketPulse</p>

          {/* A list of links is a `<nav>` and four `<a>`s. NavLink sets
              `aria-current="page"` on the match itself, which is both the
              accessible answer and what the stylesheet selects on — so there
              is no active-class callback here and no second source of truth
              about which route is showing. `end` on the landing route stops
              `/` matching every path beneath it. */}
          <nav aria-label="Primary" className={styles.nav}>
            {NAVIGATION.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === PATHS.overview}
                /* `cx` for a single class, which looks redundant and is
                   not: a CSS Module class is `string | undefined` under
                   `noUncheckedIndexedAccess`, and NavLink's `className` takes
                   `string` or a render callback. Under
                   `exactOptionalPropertyTypes` that mismatch is a TS2375, not
                   a warning. */
                className={cx(styles.navLink)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>

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
