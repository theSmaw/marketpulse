// Where the MarketPulse API lives, resolved once (Task 1.11.5).
//
// This is the whole of the frontend's knowledge of the backend's address, and
// it is deliberately a function of one input rather than a constant, so it can
// be tested without a build.
//
// **The address is a build-time literal, and that is the sentence this story
// has to carry.** `VITE_API_BASE_URL` is substituted into the bundle by Vite,
// measured against the artefact in Task 1.6.4: a prefixed value becomes a
// string literal and a non-prefixed read becomes `void 0`. So **one artefact
// cannot be promoted from one environment to another** — pointing the frontend
// at a different backend is a *rebuild*, not a setting, exactly as `base` is.
// A deploy pipeline therefore has to set this variable at build time or it
// ships a bundle that dials localhost.
//
// The escape hatch, if a rebuild per environment ever becomes genuinely
// painful, is recorded in ADR 0006 §6 and is a small run-time configuration
// endpoint or a generated `config.js` fetched before boot. It is **not**
// widening `envPrefix` and it is **not** `define`, both of which move the
// security boundary rather than the configuration mechanism.

// The local pair's backend, matching `apps/backend/src/config.ts`'s own
// defaults of `PORT=3000` and `HOST=127.0.0.1`.
//
// `localhost` rather than `127.0.0.1`, and that is a measured choice rather
// than a habit: the backend binds IPv4 only, the frontend's dev server binds
// IPv6 loopback, and a *browser* resolving `localhost` tries both families
// while a script pinned to one may not (Task 1.8.4). This string is only ever
// read by a browser.
//
// It exists so that a clean clone with no `.env` file has a working pair, which
// is the same reason `CORS_ORIGIN` defaults to `http://localhost:5173` on the
// other side of the same boundary. The two defaults are a matched pair: change
// one and the local loop breaks in a browser while every server log stays
// green.
const LOCAL_API_BASE_URL = "http://localhost:3000";

/**
 * Resolve the API's origin from a build-time value.
 *
 * Takes the raw value rather than reading `import.meta.env` itself, because
 * `import.meta.env` is substituted at build time and so cannot be varied by a
 * test. The one caller that reads it is `apiBaseUrl` below.
 */
export function resolveApiBaseUrl(configured: string | undefined): string {
  // Blank means absent, which is the same rule `present()` applies on the
  // backend and for the same reason: `VITE_API_BASE_URL=` in a `.env` file
  // sets an empty string rather than leaving the name unset, and an empty
  // origin would produce a request to the page's own host — a 404 from the
  // static site that looks nothing like a configuration problem.
  const trimmed = configured?.trim();

  if (trimmed === undefined || trimmed === "") {
    return LOCAL_API_BASE_URL;
  }

  // A trailing slash is removed here rather than at every call site, so that
  // `${base}/health` cannot produce `//health`. Some hosts answer that and
  // some do not, which is the worst kind of difference.
  return trimmed.replace(/\/+$/, "");
}

/**
 * The API's origin for this build. Resolved once, at module load.
 */
export const apiBaseUrl = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
