// Runner wiring, not application context — the render helper in
// `test-render.tsx` is the second and describes the providers.
//
// This file exists because two of this workspace's decisions collide.
// `@testing-library/react` registers its own `afterEach(cleanup)` when it can
// see a global `afterEach`, and Vitest's `globals` is deliberately off here so
// that no package's tsconfig `types` array has to gain a `"vitest/globals"`
// entry — `apps/frontend`'s explicit array is the browser boundary's last
// stated guarantee. With `globals` off, that registration does not happen.
//
// The failure it prevents was measured rather than anticipated: two tests each
// rendering one component left `document.body` holding 1 and then 2 children.
// Nothing fails at that point. It surfaces later, in a third test, as
// `getByRole` throwing "found multiple elements" — a message that names neither
// the test that leaked nor the convention that caused it.

// The second thing here is a different collision with the same shape, and it
// arrived with the market module (Task 2.10.6).
//
// `FRONTEND-STATE.md` §2 chose a **module-level bounded `Map`** over a React
// cache provider, so there is no provider for `test-render.tsx` to gain and
// nothing new in the application's context. What arrives instead is shared
// mutable state that outlives a test: a module singleton is imported once per
// worker, so a series cached by one test is visible to the next.
//
// The symptom is specific and lands in a **later** test, exactly as the
// `cleanup` one does. `useBarSeries` reads the cache while rendering so that a
// held series paints in the first commit — so a test inheriting an entry sees
// its first rendered state as `loaded` rather than `loading`, and a request it
// expected to watch go out was answered before it looked. A test asserting only
// the *eventual* state passes either way, which is how this survives into a
// suite; `market/series-cache-isolation.test.ts` is the pair that does not.
//
// It is cleared **after** each test rather than before, alongside `cleanup`, so
// that one rule holds for both: a test leaves nothing behind. Clearing before
// would protect the next test and leave the last one's entries alive for
// whatever runs after the file.

// The third thing here is a **contract**, not a collision, and it arrived with
// the live feed (Task 3.3.6).
//
// `CLAUDE.md` states `pnpm test` is "fast by contract: no build, no socket, no
// database, no network". Until Task 3.3.5 nothing in the application opened a
// socket, so that held by there being nothing to hold. `App` now calls
// `useLiveFeed`, and **every test that renders `App` dialled `localhost:3000`
// for real** — Node's `undici` obliged, the connection failed asynchronously,
// and the failure surfaced as two `Unhandled Errors` attributed to whichever
// test happened to be running when they landed.
//
// **It went unnoticed for two tasks**, which is the part worth recording: an
// unhandled error is not a failed assertion, so the suite reported it and
// still exited 0 until a later change altered the timing enough to fail the
// run. A contract nothing enforces is a contract that expires quietly.
//
// So the contract is now **structural**: the fast suite has no `WebSocket` that
// can reach anything. A test that needs one passes its own through
// `useLiveFeed`'s `open` seam, which is what that seam is for and what
// `market/use-live-feed.test.ts` already does — this stub is never the thing
// under test, it is the thing that makes reaching for the real one impossible.
//
// It is deliberately not `undefined`: the application constructs a `WebSocket`
// unconditionally, and a missing global would turn "no network in this suite"
// into a `TypeError` in every test that renders the chrome.
class UnreachableWebSocket {
  addEventListener(): void {
    // A socket that never opens, never messages and never closes. The hook's
    // reducer therefore stays on its initial state, which is the honest
    // rendering of *we have not connected yet* — and is what these tests are
    // about when they are about the chrome at all.
  }

  close(): void {
    // Nothing to close.
  }
}

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

import { clearBarSeriesCache } from "./market/index.js";

// **Assigned rather than `vi.stubGlobal`, and that is a repair rather than a
// preference.** Several suites here stub `fetch` and clean up with
// `vi.unstubAllGlobals()`, which removes *every* stub including one this file
// installed — so the first draft held for the tests before that teardown and
// handed the real `WebSocket` back to every test after it. A plain assignment
// is outside Vitest's stub registry and cannot be unstubbed by accident.
globalThis.WebSocket = UnreachableWebSocket as unknown as typeof WebSocket;

afterEach(() => {
  cleanup();
  clearBarSeriesCache();
});
