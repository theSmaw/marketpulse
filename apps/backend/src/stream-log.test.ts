import { describe, expect, it } from "vitest";

import type { StreamLogEvent } from "./alpaca-stream.js";
import { streamLogLine, streamLogTo } from "./stream-log.js";

// **What an operator is told** (Task 3.11.3).
//
// The thing under test is the **mapping**, not Pino: a test that drove a real
// logger would be asserting about a vendor. `streamLogLine` is pure and total
// and that is what makes it testable at all.

/** Every event the seam can emit, constructed once so the list is the test. */
const EVERY_EVENT: readonly StreamLogEvent[] = [
  { kind: "authenticated", symbols: 518 },
  { kind: "subscribed", acknowledged: 518 },
  { kind: "subscription-shortfall", requested: 518, acknowledged: 500 },
  { kind: "subscription-refused-empty" },
  { kind: "credentials-refused" },
  { kind: "frame-rejected", code: 400 },
  { kind: "connection-limit", retryInMs: 3_000 },
  { kind: "unexpected-error-frame", code: 500 },
  { kind: "liveness-watchdog-fired", silentForMs: 165_000 },
  { kind: "closed", elapsedMs: 4_000 },
  { kind: "closing-deliberately" },
];

describe("streamLogLine", () => {
  // **The defect this task repairs, asserted as the absence it was.** Every
  // event has to produce a line; an event that fell through would be a silence
  // exactly like the eleven silences this file exists to end.
  it("produces a line for every event the seam can emit", () => {
    for (const event of EVERY_EVENT) {
      const line = streamLogLine(event);
      expect(line.message, event.kind).toBeTruthy();
      expect(["info", "warn"], event.kind).toContain(line.level);
    }
  });

  // **`warn` is _something is wrong with the feed_, `info` is _the feed did
  // what it is supposed to do_.** A log where everything is `warn` is a log
  // nobody reads; one where everything is `info` is a log nobody greps.
  it("warns about the five failures and not about the four normal events", () => {
    const level = (event: StreamLogEvent) => streamLogLine(event).level;

    expect(level({ kind: "authenticated", symbols: 518 })).toBe("info");
    expect(level({ kind: "subscribed", acknowledged: 518 })).toBe("info");
    expect(level({ kind: "closed", elapsedMs: 4_000 })).toBe("info");
    expect(level({ kind: "closing-deliberately" })).toBe("info");

    expect(level({ kind: "credentials-refused" })).toBe("warn");
    expect(level({ kind: "connection-limit", retryInMs: 3_000 })).toBe("warn");
    expect(level({ kind: "liveness-watchdog-fired", silentForMs: 1 })).toBe(
      "warn",
    );
    expect(level({ kind: "frame-rejected", code: 400 })).toBe("warn");
    expect(level({ kind: "unexpected-error-frame", code: 500 })).toBe("warn");
  });

  // **`connection-limit` warns even though every deploy meets one**, which is
  // the one place this mapping disagrees with itself on purpose: §8.2's
  // overlap is seconds, and the 2026-09-19 outage was the same frame retried
  // every three seconds for forty hours. **What tells them apart is how many
  // lines there are**, and that is only countable if they are logged.
  it("warns about the connection limit, which is routine and was also the outage", () => {
    const line = streamLogLine({ kind: "connection-limit", retryInMs: 3_000 });

    expect(line.level).toBe("warn");
    expect(line.details).toEqual({ retryInMs: 3_000 });
  });

  // **Nothing that carries a credential.** §8.3 measured `402` as
  // byte-identical for a wrong key, a wrong secret and no credential at all,
  // so a line claiming to distinguish them would be inventing the distinction.
  it("says nothing about WHICH credential was refused, because the wire cannot", () => {
    const line = streamLogLine({ kind: "credentials-refused" });

    expect(line.details).toEqual({});
    expect(JSON.stringify(line)).not.toMatch(/key|secret/iu);
  });
});

describe("streamLogTo", () => {
  it("routes each line to the level it named, and touches nothing else", () => {
    const info: string[] = [];
    const warn: string[] = [];
    const log = streamLogTo({
      info: (_details, message) => info.push(message),
      warn: (_details, message) => warn.push(message),
    });

    for (const event of EVERY_EVENT) log(event);

    // Four normal events, seven that are not.
    expect(info).toHaveLength(4);
    expect(warn).toHaveLength(7);
  });
});

// **Nothing this task adds can crash the process** — the task's own criterion
// 2, asserted rather than argued.
//
// This runs inside the market socket's callback, where an unhandled throw is a
// crashed process. `streamLogLine` is pure, total and exhaustive so it cannot
// throw; the only thing that can is the logger, which is a vendor's.
describe("a logger that throws", () => {
  it("costs a line rather than the feed", () => {
    const log = streamLogTo({
      info: () => {
        throw new Error("the log sink is gone");
      },
      warn: () => {
        throw new Error("the log sink is gone");
      },
    });

    for (const event of EVERY_EVENT) {
      expect(() => {
        log(event);
      }, event.kind).not.toThrow();
    }
  });
});
