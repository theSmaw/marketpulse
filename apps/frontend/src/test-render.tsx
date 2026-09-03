// The one place the application's context is described for tests.
//
// It is the **third** such description and deliberately the last: `App.tsx` is
// the first (`<BrowserRouter>`, reading `import.meta.env.BASE_URL`), and
// `.storybook/preview.tsx` is the second (a `MemoryRouter` decorator taking its
// entry from a story parameter). Every provider Epic 2 adds — a Redux store, an
// RxJS scheduler — lands here rather than in each test file, which is the whole
// reason this is a module and not a copied three-line wrapper.
//
// It gets its own module even though Task 1.9.3 refused a `src/test-support.ts`
// in `apps/backend`, and that is a divergence rather than an inconsistency: the
// backend's objection is that test files sit inside the package's tsconfig
// `include` and therefore emit, so a helper module there would be scaffolding
// shipped into `dist/` beside the server. `apps/frontend` is `noEmit`, so
// nothing emits, and this file is unreachable from `index.html` exactly as the
// stories files are — verified against the artefact, which is unchanged at
// three files.
//
// `MemoryRouter` for the reason the workshop uses it: there is no address bar
// here, and a component handed the browser's history can navigate the runner's
// own document. The one place that rule is deliberately broken is `App.test.tsx`,
// which drives the *real* `BrowserRouter` through `window.history` — see the
// comment there, and note it is why this helper must not be used for it.

import { render } from "@testing-library/react";
import type { RenderResult } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";

import { PATHS } from "./routes/paths.js";

/**
 * Render `ui` with the application's context around it.
 *
 * `AppHeader` uses `NavLink` and every route module may use `Link`, so
 * rendering either bare throws; that is what this exists for. A leaf component
 * with no router dependency — `PriceChange`, `AnomalyBadge`, `FeedIndicator` —
 * should call `render()` directly rather than acquire a router it does not use.
 */
export function renderWithContext(
  ui: ReactNode,
  { at = PATHS.overview }: { at?: string } = {},
): RenderResult {
  return render(<MemoryRouter initialEntries={[at]}>{ui}</MemoryRouter>);
}
