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

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
