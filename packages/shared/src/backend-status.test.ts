import { describe, expect, it } from "vitest";

import { BACKEND_DEGRADED_CAUSES, BACKEND_STATUSES } from "./backend-status.js";
import { HEALTH_STATUSES } from "./health.js";

describe("BACKEND_STATUSES", () => {
  it("names the three states Story 1.12's criterion distinguishes", () => {
    expect(BACKEND_STATUSES).toStrictEqual([
      "healthy",
      "degraded",
      "unreachable",
    ]);
  });

  // The load-bearing assertion in this file. These are two vocabularies for two
  // different facts — what the server said, and what this client concluded —
  // and the failure mode being guarded against is somebody "unifying" them,
  // which would put "unreachable" in a union a server is supposed to report
  // about itself.
  it("shares no member with HEALTH_STATUSES", () => {
    const reported = new Set<string>(HEALTH_STATUSES);
    for (const status of BACKEND_STATUSES) {
      expect(reported.has(status)).toBe(false);
    }
  });
});

describe("BACKEND_DEGRADED_CAUSES", () => {
  // "Degraded" is the state with no server-side producer, so it is the one that
  // rots into a word nobody can test. Each member here names a cause that can
  // actually be made to happen; the count is asserted so adding one is a
  // deliberate act with a producible cause behind it.
  it("names the two producible causes and no more", () => {
    expect(BACKEND_DEGRADED_CAUSES).toStrictEqual([
      "not-ok-status",
      "unreadable-body",
    ]);
  });

  // Latency is deliberately absent: it would need a second threshold below the
  // request deadline with nothing keeping the two ordered, and there is no
  // measurement to set it from while /health does no work. A timeout is
  // `unreachable`, because nothing arrived.
  it("does not treat slowness as degradation", () => {
    expect(BACKEND_DEGRADED_CAUSES).not.toContain("slow");
  });
});
