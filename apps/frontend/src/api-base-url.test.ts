import { describe, expect, it } from "vitest";

import { apiBaseUrl, resolveApiBaseUrl } from "./api-base-url.js";

// `resolveApiBaseUrl` takes its input as a parameter for exactly this reason:
// `import.meta.env` is substituted at build time, so the module-level
// `apiBaseUrl` cannot be varied by a test. The same shape as `loadConfig(env)`
// on the backend, and for the same reason.
describe("resolveApiBaseUrl", () => {
  it("falls back to the local pair when nothing is configured", () => {
    expect(resolveApiBaseUrl(undefined)).toBe("http://localhost:3000");
  });

  // Blank means absent — the rule `present()` applies on the backend. A
  // `VITE_API_BASE_URL=` line in a `.env` file sets an empty string rather than
  // leaving the name unset, and an empty origin would produce a request to the
  // page's own host: a 404 from the static site that looks nothing like a
  // configuration problem.
  it.each(["", "   "])(
    "treats %o as absent rather than as an origin",
    (blank) => {
      expect(resolveApiBaseUrl(blank)).toBe("http://localhost:3000");
    },
  );

  it("uses a configured origin", () => {
    expect(resolveApiBaseUrl("https://api.marketpulse.example")).toBe(
      "https://api.marketpulse.example",
    );
  });

  // So that `${base}/health` cannot produce `//health`, which some hosts answer
  // and some do not.
  it.each([
    ["https://api.marketpulse.example/", "https://api.marketpulse.example"],
    ["https://api.marketpulse.example///", "https://api.marketpulse.example"],
    ["  https://api.marketpulse.example/  ", "https://api.marketpulse.example"],
  ])(
    "strips trailing slashes and surrounding whitespace from %o",
    (configured, expected) => {
      expect(resolveApiBaseUrl(configured)).toBe(expected);
    },
  );

  // A single slash is a legitimate same-origin base, and stripping it to the
  // empty string would silently turn it into the localhost default.
  it("does not turn a bare slash into the default", () => {
    expect(resolveApiBaseUrl("/")).toBe("");
  });
});

describe("apiBaseUrl", () => {
  // The test environment sets no `VITE_API_BASE_URL`, so this asserts the
  // clean-clone path: a developer with no `.env` file gets a working pair.
  it("resolves to the local backend when the build set no variable", () => {
    expect(apiBaseUrl).toBe("http://localhost:3000");
  });
});
