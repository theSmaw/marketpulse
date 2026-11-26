import { toTicker } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import {
  ORCHESTRATOR_CAPABILITY,
  permitWorkspaceCommand,
} from "./workspace-command-permission.js";

import type { TopologyLayout, WorkspaceCommand } from "@marketpulse/shared";
import type { WorkspaceCommandCapability } from "./workspace-command-permission.js";

const layoutWith = (symbols: readonly string[]): TopologyLayout => ({
  placements: symbols.map((symbol, index) => ({
    symbol: toTicker(symbol),
    x: index * 10,
    y: 0,
  })),
  bounds: { minX: 0, minY: 0, maxX: symbols.length * 10, maxY: 0 },
});

const HIGHLIGHT: WorkspaceCommand = {
  type: "highlightNodes",
  symbols: [toTicker("BBB"), toTicker("XLK")],
  relations: ["sector_membership"],
  subject: toTicker("AAA"),
};

describe("permitWorkspaceCommand", () => {
  it("permits a command whose type is in the capability set and whose symbols all have placements", () => {
    const outcome = permitWorkspaceCommand(
      HIGHLIGHT,
      ORCHESTRATOR_CAPABILITY,
      layoutWith(["AAA", "BBB", "XLK"]),
    );

    expect(outcome).toEqual({ kind: "permitted", command: HIGHLIGHT });
  });

  // ## Conjunct 1, tested independently of conjunct 2
  it("refuses a command whose type the producer may not emit, with every symbol placed", () => {
    const nothingPermitted: WorkspaceCommandCapability = { types: [] };

    const outcome = permitWorkspaceCommand(
      HIGHLIGHT,
      nothingPermitted,
      layoutWith(["AAA", "BBB", "XLK"]),
    );

    expect(outcome).toEqual({
      kind: "refused",
      because: "type-not-permitted",
    });
  });

  // ## Conjunct 2, tested independently of conjunct 1 — and this is the one
  // ## that catches a wrong highlight
  it("refuses a command naming a symbol with no placement, with the type permitted", () => {
    const outcome = permitWorkspaceCommand(
      HIGHLIGHT,
      ORCHESTRATOR_CAPABILITY,
      // `XLK` is missing — a security untracked since the command was minted.
      layoutWith(["AAA", "BBB"]),
    );

    expect(outcome).toEqual({
      kind: "refused",
      because: "symbol-has-no-placement",
    });
  });

  it("refuses a command whose SUBJECT has no placement, even where every highlighted symbol does", () => {
    // The subject is not highlighted, so it is not in `symbols` — but the note
    // Task 7.4.2 writes names it, and a sentence about a node that is not on
    // the canvas is the same defect one field over.
    const outcome = permitWorkspaceCommand(
      HIGHLIGHT,
      ORCHESTRATOR_CAPABILITY,
      layoutWith(["BBB", "XLK"]),
    );

    expect(outcome).toEqual({
      kind: "refused",
      because: "symbol-has-no-placement",
    });
  });

  it("grants the orchestrator exactly one command type", () => {
    // A value rather than an inline literal at the call site, so there is one
    // place to read what this product's own orchestrator may do to a reader's
    // screen — and so Epic 10's producer arrives as a SECOND capability rather
    // than as a widening of this one.
    expect([...ORCHESTRATOR_CAPABILITY.types]).toEqual(["highlightNodes"]);
    expect(Object.isFrozen(ORCHESTRATOR_CAPABILITY)).toBe(true);
  });
});
