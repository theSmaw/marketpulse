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

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

import { clearBarSeriesCache } from "./market/index.js";

afterEach(() => {
  cleanup();
  clearBarSeriesCache();
});
