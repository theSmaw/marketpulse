import { toInvestigationId, toStepId } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import { createInvestigationStore } from "./investigation-store.js";

import type { Investigation, InvestigationEvent } from "@marketpulse/shared";

const investigationAt = (
  id: string,
  status: Investigation["status"],
): Investigation => ({
  id: toInvestigationId(id),
  title: `Investigate ${id}`,
  createdAt: new Date("2026-11-16T14:00:00.000Z"),
  mode: "live",
  status,
  subjectSymbols: [],
  currentTime: new Date("2026-11-16T14:00:00.000Z"),
  steps: [],
});

describe("the investigation store", () => {
  it("never holds more than its capacity, and never evicts a running one", () => {
    const store = createInvestigationStore(200);

    // The oldest entry is `completed` — every other one of the first 200
    // is `running`, so the only legal eviction target is entry 0.
    store.create(investigationAt("inv-0", "completed"));
    for (let i = 1; i < 200; i += 1) {
      store.create(investigationAt(`inv-${String(i)}`, "running"));
    }
    expect(store.size()).toBe(200);

    store.create(investigationAt("inv-200", "running"));

    expect(store.size()).toBe(200);
    expect(store.get(toInvestigationId("inv-0"))).toBeUndefined();
    // Every running one survives — none of them was eligible for eviction.
    for (let i = 1; i < 200; i += 1) {
      expect(store.get(toInvestigationId(`inv-${String(i)}`))).toBeDefined();
    }
    expect(store.get(toInvestigationId("inv-200"))).toBeDefined();
  });

  it("holds past capacity rather than evict a running investigation", () => {
    // No completed entry exists anywhere in the store — the task's own
    // rule is "never evict a running one", not "always stay at capacity".
    const store = createInvestigationStore(2);
    store.create(investigationAt("inv-0", "running"));
    store.create(investigationAt("inv-1", "running"));
    store.create(investigationAt("inv-2", "running"));

    expect(store.size()).toBe(3);
    expect(store.get(toInvestigationId("inv-0"))).toBeDefined();
  });

  it("evicts a FAILED investigation, not only a completed one", () => {
    // Widened 2026-11-18 (Task 7.2.1). The rule was always "never evict a
    // running one"; the predicate spelled the positive case
    // (`status === "completed"`), which was the same set only while
    // `completed` was the only status a run could reach. Story 7.2's
    // thrown-tool net mints `failed` runs, and a `failed` entry the cap
    // could never reclaim is that same stuck state one layer down.
    const store = createInvestigationStore(2);
    store.create(investigationAt("inv-0", "failed"));
    store.create(investigationAt("inv-1", "running"));

    store.create(investigationAt("inv-2", "running"));

    expect(store.size()).toBe(2);
    expect(store.get(toInvestigationId("inv-0"))).toBeUndefined();
    expect(store.get(toInvestigationId("inv-1"))).toBeDefined();
  });

  it("appends events and replays them from a given seq", () => {
    const store = createInvestigationStore();
    const investigation = investigationAt("inv-1", "running");
    store.create(investigation);

    const events: InvestigationEvent[] = [1, 2, 3].map((seq) => ({
      type: "TOOL_CALL_STARTED",
      seq,
      investigationId: investigation.id,
      stepId: toStepId(`step-${String(seq)}`),
      tool: "get_security_snapshot",
    }));
    for (const event of events) store.appendEvent(investigation.id, event);

    expect(store.eventsFrom(investigation.id, 2)).toStrictEqual(
      events.slice(1),
    );
    expect(store.eventsFrom(investigation.id, 1)).toStrictEqual(events);
    expect(store.eventsFrom(toInvestigationId("unknown"), 1)).toStrictEqual([]);
  });

  it("notifies a live subscriber of events appended after it subscribes", () => {
    const store = createInvestigationStore();
    const investigation = investigationAt("inv-1", "running");
    store.create(investigation);

    const seen: InvestigationEvent[] = [];
    const unsubscribe = store.onEvent(investigation.id, (event) => {
      seen.push(event);
    });

    const event: InvestigationEvent = {
      type: "TOOL_CALL_STARTED",
      seq: 1,
      investigationId: investigation.id,
      stepId: toStepId("step-1"),
      tool: "get_security_snapshot",
    };
    store.appendEvent(investigation.id, event);
    expect(seen).toStrictEqual([event]);

    unsubscribe();
    store.appendEvent(investigation.id, { ...event, seq: 2 });
    // The unsubscribed listener hears nothing further.
    expect(seen).toStrictEqual([event]);
  });
});
