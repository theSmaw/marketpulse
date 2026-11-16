import { toInvestigationId, toTicker } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import { createCurrentMarketState } from "./current-market-state.js";
import {
  createSecuritySnapshotTool,
  toWireSecuritySnapshot,
} from "./tool-security-snapshot.js";

import type { ToolContext } from "./analytical-tool.js";
import type { LiveObservation } from "./market-data-stream.js";
import type { BarSource } from "@marketpulse/shared";

const NVDA = toTicker("NVDA");
const PSKY = toTicker("PSKY"); // untracked since 2026-10-12 — CLAUDE.md §2.

const SOURCE: BarSource = {
  provider: "fixture",
  feed: "iex",
  retrievedAt: "2026-11-16T14:01:30.000Z",
  barCount: 1,
};

const OBSERVATION: LiveObservation = {
  symbol: NVDA,
  bar: {
    startsAt: new Date("2026-11-16T14:00:00.000Z"),
    open: 181.2,
    high: 181.9,
    low: 180.8,
    close: 181.5,
    volume: 1_234_567,
  },
  source: SOURCE,
  supersedes: false,
};

const READ_AT = Date.parse("2026-11-16T14:01:00.000Z");

const CONTEXT: ToolContext = {
  investigationId: toInvestigationId("inv-1"),
  asOf: new Date(READ_AT),
  mode: "live",
};

describe("the security snapshot tool", () => {
  it("reports exactly current-market-state's own fields, with no change", () => {
    // Done-when 1: identity, not approximate equality — a snapshot that
    // happened to carry the right numbers through a recomputation would
    // still pass a `toBeCloseTo`.
    const state = createCurrentMarketState({ now: () => READ_AT });
    state.observe([OBSERVATION]);

    const tool = createSecuritySnapshotTool(state, new Set([NVDA]));
    const observedDirectly = state.read(NVDA);
    if (observedDirectly === undefined) throw new Error("test setup");

    return tool.run({ symbol: NVDA }, CONTEXT).then((outcome) => {
      if (outcome.kind !== "ok") throw new Error("expected ok");

      expect(outcome.value.symbol).toBe(NVDA);
      expect(outcome.value.observedAt).toBe(observedDirectly.bar.startsAt);
      expect(outcome.value.price).toBe(observedDirectly.bar.close);
      expect(outcome.value.open).toBe(observedDirectly.bar.open);
      expect(outcome.value.high).toBe(observedDirectly.bar.high);
      expect(outcome.value.low).toBe(observedDirectly.bar.low);
      expect(outcome.value.volume).toBe(observedDirectly.bar.volume);
      // The SAME source object, passed through rather than copied.
      expect(outcome.value.source).toBe(observedDirectly.source);
      expect(outcome.value.ageMs).toBe(observedDirectly.ageMs);
      // No `change` field anywhere on the outcome — Gate 1's own settled
      // decision.
      expect("change" in outcome.value).toBe(false);
    });
  });

  it("refuses with not-tracked for a symbol outside the curated universe", async () => {
    // A universe-membership check, decided before current-market-state.ts
    // is consulted at all — this universe does not even contain PSKY.
    const state = createCurrentMarketState({ now: () => READ_AT });
    const tool = createSecuritySnapshotTool(state, new Set([NVDA]));

    const outcome = await tool.run({ symbol: PSKY }, CONTEXT);

    expect(outcome).toStrictEqual({ kind: "refused", reason: "not-tracked" });
  });

  it("refuses with nothing-observed for a tracked symbol with no current bar", async () => {
    // A different check from the one above: NVDA IS in the universe here,
    // and current-market-state.ts simply has never heard from it.
    const state = createCurrentMarketState({ now: () => READ_AT });
    const tool = createSecuritySnapshotTool(state, new Set([NVDA]));

    const outcome = await tool.run({ symbol: NVDA }, CONTEXT);

    expect(outcome).toStrictEqual({
      kind: "refused",
      reason: "nothing-observed",
    });
  });

  it("cannot be constructed outside this module from a plain literal", () => {
    // Mint-site discipline for invariant 1 — the whole mechanism: the
    // brand's own symbol is declared and never exported, so a literal
    // matching every PUBLIC field of `SecuritySnapshot` is still a type
    // error here, with no route around it short of an unsafe cast.
    type Snapshot = import("./tool-security-snapshot.js").SecuritySnapshot;
    // @ts-expect-error — no access to the module-private brand symbol.
    const attempted: Snapshot = {
      symbol: NVDA,
      observedAt: new Date(),
      price: 1,
      open: 1,
      high: 1,
      low: 1,
      volume: 1,
      source: SOURCE,
      ageMs: 0,
    };
    expect(attempted.symbol).toBe(NVDA);
  });

  it("projects to a wire shape naming every field explicitly", async () => {
    const state = createCurrentMarketState({ now: () => READ_AT });
    state.observe([OBSERVATION]);
    const tool = createSecuritySnapshotTool(state, new Set([NVDA]));

    const outcome = await tool.run({ symbol: NVDA }, CONTEXT);
    if (outcome.kind !== "ok") throw new Error("expected ok");

    const wire = toWireSecuritySnapshot(outcome.value);

    expect(wire).toStrictEqual({
      symbol: "NVDA",
      observedAt: "2026-11-16T14:00:00.000Z",
      price: 181.5,
      open: 181.2,
      high: 181.9,
      low: 180.8,
      volume: 1_234_567,
      source: {
        provider: "fixture",
        feed: "iex",
        retrievedAt: "2026-11-16T14:01:30.000Z",
        barCount: 1,
      },
      ageMs: 60_000,
    });
  });
});
