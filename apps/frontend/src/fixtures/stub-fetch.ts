import { vi } from "vitest";

import type { BarSeriesFixtureName } from "./bar-series.js";
import { BAR_SERIES_FIXTURES } from "./bar-series.js";

// The one `fetch` stub this package's tests share (Task 2.10.6).
//
// ## Why a stubbed global rather than a request-level intercept
//
// Nothing in `apps/frontend` mocks a module — `grep -rn "vi.mock"
// apps/frontend/src` returns nothing. The tests stub the **global `fetch`**,
// which is the transport boundary, and that means the real `apiRequest` runs:
// the deadline, the composed abort signal, the correlation-id read, the
// `isApiError` parse and the whole seven-outcome classification. Three of those
// outcomes — `unreadable-body`, `http-error`, `unreachable` — are therefore
// **produced** rather than asserted, and `api-client.test.ts` produces all
// seven today.
//
// That was the case for MSW, and it does not survive being checked. What a
// request-level intercept genuinely adds over this is **routing** — one handler
// set answering many URLs — which matters for a screen making several requests
// and matters very little for a hook making one.
//
// It was measured rather than reasoned about, in this repository, on
// 2026-09-10. Two probe files were written against the real `useBarSeries` —
// one with `msw@2.15.0`'s `setupServer`, one with the stub below — each loading
// `full.json` and each producing `unreachable` from a network error. Both
// passed. What differed:
//
// | | MSW | this stub |
// | --- | --- | --- |
// | Packages added | **+49** | 0 |
// | `node_modules/.pnpm` | 310,460 kB → **329,524 kB** (+19.1 MB) | unchanged |
// | Install script | **required an `allowBuilds` entry** | none |
// | Import, per test file | 136–161 ms | 90–123 ms |
// | One probe file, wall clock | 639–859 ms | 573–609 ms |
//
// The `allowBuilds` row is the one worth reading twice, because it is a
// property of this workspace rather than of MSW. `msw` runs a `postinstall`,
// installs are denied unless the package is named in `pnpm-workspace.yaml`, and
// until it is, **every subsequent pnpm command fails** — `pnpm exec vitest` was
// measured refusing to start. So adopting it means a permanent entry in the
// allowlist that exists to keep install scripts out, for a dev dependency, to
// buy routing this layer does not use.
//
// Reversal triggers, as conditions:
//
//   - **The first test that needs several URLs answered differently in one
//     render.** A screen with a chart, a volume panel and a search box is three
//     endpoints, and a handler set beats a `switch` on the URL string.
//   - **The first thing that has to be intercepted in a real browser**, where a
//     service worker is the mechanism and a global stub is not. Note the browser
//     suite is already a separate level with its own answer — `e2e/` drives real
//     Chromium against a pair started with `pnpm dev`, and Playwright route
//     interception is how it produces a failure state — so this trigger fires
//     for Storybook or a component harness, not for `e2e/`.
//
// ## What it does not do
//
// It does not touch the browser's own HTTP cache, because there is none here:
// `fetch` is replaced outright. Everything `MARKET-DATA-API.md` §11 measures —
// the `ETag`, the `304`, the five-minute lifetime — happens in a layer no test
// at this level can see, and a test asserting any of it would be asserting its
// own stub. That is `e2e/`'s to observe.

/** One request the stub saw. */
export interface StubbedFetchCall {
  /** The whole URL, as a string, whatever type it arrived as. */
  readonly url: string;

  /** The signal `api-client.ts` composed for it, if it passed one. */
  readonly signal: AbortSignal | undefined;

  /** Which call this was, zero-based. */
  readonly index: number;
}

/** What a stub hands back to the test that installed it. */
export interface StubbedFetch {
  /**
   * Every request so far, in order.
   *
   * A live array rather than a snapshot, so a test can read `calls.length`
   * after an `await` without asking for it again — which is how the
   * "asks once" assertions in four files are already written.
   */
  readonly calls: readonly StubbedFetchCall[];
}

/**
 * Replace `globalThis.fetch` for the duration of one test.
 *
 * The handler is given the call it is answering, so the four shapes the
 * hand-rolled copies had are all reachable through one: ignore the argument for
 * a constant answer, read `index` to answer a poll differently the second time,
 * read `url` to answer two endpoints apart, and read `signal` to reject when the
 * request is aborted.
 *
 * **Undo it with `vi.unstubAllGlobals()`**, which every caller already does in
 * an `afterEach`. This deliberately does not register that itself: a helper
 * that installs its own teardown is a helper whose effects a reader cannot see
 * from the test.
 */
export function stubFetch(
  respond: (call: StubbedFetchCall) => Promise<Response>,
): StubbedFetch {
  const calls: StubbedFetchCall[] = [];

  vi.stubGlobal(
    "fetch",
    vi.fn((input: string | URL, init?: RequestInit) => {
      const call: StubbedFetchCall = {
        url: String(input),
        signal: init?.signal ?? undefined,
        index: calls.length,
      };
      calls.push(call);
      return respond(call);
    }),
  );

  return { calls };
}

/**
 * A `fetch` that answers every request with one recorded bar-series body.
 *
 * The shortest path from a fixture to a rendered state, and the one Stories
 * 2.11 to 2.13 should reach for: `stubBarSeries("partial")` and render the
 * thing. It answers **every** URL, deliberately — a component test that also
 * fetches something else should use {@link stubFetch} and say so, rather than
 * getting a bar series back from `/securities` and wondering why.
 */
export function stubBarSeries(name: BarSeriesFixtureName): StubbedFetch {
  return stubFetch(() => Promise.resolve(barSeriesFixtureResponse(name)));
}

/**
 * One recorded body as a `Response`, with the status it was recorded with.
 *
 * A fresh `Response` per call rather than a shared one, because a body is a
 * stream and reading it twice throws — which would turn a second request in one
 * test into a failure that names neither the fixture nor the reason.
 */
export function barSeriesFixtureResponse(name: BarSeriesFixtureName): Response {
  const { status, body } = BAR_SERIES_FIXTURES[name];

  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * A `fetch` that never answers until the signal it was handed aborts.
 *
 * The socket that accepts and does not reply — the only way to observe a
 * deadline, and the state a component renders as `loading`. The rejection is a
 * plain `Error` rather than the signal's own `DOMException` reason, because
 * `api-client.ts` reads which signal fired off the **signals** rather than off
 * what `fetch` threw; supplying a reason for it to read would let a test assert
 * the wrong mechanism.
 */
export function neverAnswers(call: StubbedFetchCall): Promise<Response> {
  return new Promise((_resolve, reject) => {
    call.signal?.addEventListener("abort", () => {
      reject(new Error("aborted"));
    });
  });
}
