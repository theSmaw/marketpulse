import {
  TOOL_REFUSALS,
  toInvestigationId,
  toTicker,
} from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import { volumeFactorAnswer } from "./market-composite.js";
import { createVolumeRatioTool } from "./tool-volume-ratio.js";

import type { ToolContext } from "./analytical-tool.js";

// **The volume-anomaly tool** (Task 7.2.3, Done-when 1). No database, no
// fixture and no furnished store, because the behaviour is STRUCTURAL: the
// producer it wraps takes no argument and answers `no-distribution` for
// every security at every instant, so the assertion is that nothing about
// the input can change the answer.
//
// Independent of every other tool's test — nothing here imports
// `tool-security-snapshot.ts`, `tool-return-percentile.ts` or the scripted
// provider.

const NVDA = toTicker("NVDA");
const PSKY = toTicker("PSKY"); // untracked since 2026-10-12 — CLAUDE.md §2.
const UNIVERSE = new Set<string>([NVDA]);

const CONTEXT: ToolContext = {
  investigationId: toInvestigationId("inv-1"),
  asOf: new Date("2026-11-19T14:06:00.000Z"),
  mode: "live",
};

describe("createVolumeRatioTool", () => {
  it("names the tool and the step `EPIC.md`'s own second of five", () => {
    const tool = createVolumeRatioTool(UNIVERSE);

    expect(tool.name).toBe("calculate_volume_ratio");
    expect(tool.description).toBe("Measure volume anomaly");
  });

  it("refuses `no-distribution` for a tracked security, always", async () => {
    const tool = createVolumeRatioTool(UNIVERSE);

    await expect(tool.run({ symbol: NVDA }, CONTEXT)).resolves.toStrictEqual({
      kind: "refused",
      reason: "no-distribution",
    });
  });

  // **The structural guarantee, stated as the assertion rather than as a
  // comment.** Nothing about the subject, the instant or the mode can move
  // this answer, because the producer reads none of them — so a run over
  // four different inputs must give four identical outcomes. A future
  // implementation that started branching on any of them would fail here
  // rather than quietly answering a figure for one security and a refusal
  // for the next.
  it("answers identically whatever the symbol, the instant or the mode", async () => {
    const tool = createVolumeRatioTool(new Set<string>([NVDA, "AAPL", "SPY"]));

    const outcomes = await Promise.all([
      tool.run({ symbol: NVDA }, CONTEXT),
      tool.run({ symbol: toTicker("AAPL") }, CONTEXT),
      tool.run({ symbol: toTicker("SPY") }, CONTEXT),
      tool.run(
        { symbol: NVDA },
        { ...CONTEXT, asOf: new Date("2024-01-02T19:30:00.000Z") },
      ),
      tool.run({ symbol: NVDA }, { ...CONTEXT, mode: "replay" }),
    ]);

    for (const outcome of outcomes) {
      expect(outcome).toStrictEqual({
        kind: "refused",
        reason: "no-distribution",
      });
    }
  });

  // Membership is decided FIRST, so an untracked security gets the
  // membership word rather than the product-wide one — two true sentences
  // about `PSKY`, and only one of them is the sentence this step owes.
  it("refuses `not-tracked` ahead of everything else", async () => {
    const tool = createVolumeRatioTool(UNIVERSE);

    await expect(tool.run({ symbol: PSKY }, CONTEXT)).resolves.toStrictEqual({
      kind: "refused",
      reason: "not-tracked",
    });
  });

  // The word is the producer's own, not a synonym minted here (Story 7.2's
  // Gate 1), and it is a member of the closed shared vocabulary a
  // `TOOL_CALL_COMPLETED` event can carry.
  it("reuses the producer's own word, which the tool vocabulary carries", () => {
    expect(volumeFactorAnswer().state).toBe("no-distribution");
    expect(TOOL_REFUSALS).toContain("no-distribution");
  });
});
