import process from "node:process";

// The two addresses a spec is allowed to know, and the one place it learns them
// (Task 1.13.3).
//
// `scripts/pair-addresses.mjs` is where the pair is *defined* — the backend's
// from its own built `dist/config.js`, the frontend's from `CORS_ORIGIN` rather
// than a second copy of `5173` — and `scripts/run-e2e.mjs` passes both in as
// environment variables. This module is the reading end of that, and it exists
// so that no spec ever contains a port.
//
// It cannot import `pair-addresses.mjs` directly, and that is a property of the
// boundary rather than an oversight: this package's tsconfig `include` is
// `**/*.ts` under `e2e/`, so a `.mjs` file two directories up is outside the
// program, and pulling it in would mean `allowJs` and a second source of truth
// about which files this project compiles. One environment variable per address
// is the cheaper edge.
//
// **Both throw rather than defaulting**, for the reason `playwright.config.ts`
// has no default `baseURL`: a literal fallback is the second copy of the port
// that the whole arrangement exists to prevent, and it would be silently wrong
// rather than loud.

function required(name: string): string {
  const value = process.env[name];

  if (value === undefined || value === "") {
    throw new Error(
      `${name} is not set. Run the suite with \`pnpm e2e\`, which resolves the ` +
        `pair's addresses from the running backend's own configuration rather ` +
        `than from a literal in a spec.`,
    );
  }

  return value;
}

/**
 * The origin the browser drives — the one `CORS_ORIGIN` names.
 *
 * Specs navigate with relative paths and Playwright's `baseURL`, so this is
 * needed only where the origin itself is the subject: proving that *this*
 * origin is the one the backend admits.
 */
export const frontendOrigin = required("E2E_BASE_URL");

/**
 * The backend's origin as a *script* should dial it.
 *
 * Note this is deliberately not the string the browser uses. The backend binds
 * IPv4 only, so this resolves to `http://127.0.0.1:3000`, while
 * `apps/frontend/src/api-base-url.ts` sends the browser to
 * `http://localhost:3000` because a browser resolving `localhost` tries both
 * families and a script pinned to one may not (Task 1.8.4). Two spellings of
 * one server, each correct for its own caller — which is exactly why a spec
 * must never assert that the page called *this* string.
 */
export const backendOrigin = required("E2E_BACKEND_ORIGIN");

/** The health endpoint, dialled from Node. */
export const backendHealthUrl = `${backendOrigin}/health`;

/**
 * A URL pattern matching the health endpoint **whatever host it is on**.
 *
 * Every route interception in this suite uses this rather than an origin,
 * and that is load-bearing twice over. The browser dials `localhost` where a
 * script dials `127.0.0.1`, so an origin-anchored pattern would silently match
 * nothing and the spec would quietly assert the healthy state under a name that
 * promised a broken one. And `VITE_API_BASE_URL` moves the address at build
 * time, so a pattern pinned to any origin at all is a third copy of a value
 * this repository has spent two stories reducing to one.
 */
export const HEALTH_ROUTE_PATTERN = "**/health";

/**
 * A predicate matching the **tracked universe endpoint** and not the page that
 * renders it (Task 2.4.5).
 *
 * `HEALTH_ROUTE_PATTERN` above is a glob because it can afford to be: this
 * application has no `/health` route, so a `**` glob over `/health` matches exactly one
 * thing. **`/securities` is a route.** A glob written the same way matches the
 * document navigation `page.goto("/securities")` performs, so the first version
 * of this fulfilled the *page* with a JSON body — and the spec then reported
 * five whole-document axe violations (`document-title`, `html-has-lang`,
 * `landmark-one-main`, `page-has-heading-one`, `region`) against a state it
 * believed it was rendering. Green in the sense that it ran, and about nothing.
 *
 * The port is what separates them, and it is derived rather than written: both
 * sides of the comparison come from the backend's own built configuration, so
 * there is no second copy of `3000` here. Matching on the *origin* would not
 * work — the browser dials `localhost` where this module holds `127.0.0.1`,
 * which is the two-spellings-of-one-server trap recorded above.
 */
const backendPort = new URL(backendOrigin).port;

export const SECURITIES_ROUTE_PATTERN = (url: URL): boolean =>
  url.pathname === "/securities" && url.port === backendPort;

/**
 * A URL pattern matching the market-feed endpoint **whatever host it is on**.
 *
 * A glob rather than the predicate `SECURITIES_ROUTE_PATTERN` needs, and the
 * distinction is the one recorded above: this application has no `/market-data`
 * *route*, so a `**` glob over it matches exactly one thing and cannot fulfil a
 * document navigation by accident. `/securities` is a route, which is why that
 * one is a predicate keyed on the port.
 */
export const MARKET_DATA_ROUTE_PATTERN = "**/market-data";

/**
 * A URL pattern matching the bar-series endpoint, whatever host it is on.
 *
 * A glob for the same reason as the one above and with the same fence: this
 * application has no `/market-data/bars` **route**, so the glob cannot fulfil a
 * document navigation by accident. The trailing `*` is what admits the query
 * string, which every real request to this endpoint carries.
 */
export const BARS_ROUTE_PATTERN = "**/market-data/bars*";
