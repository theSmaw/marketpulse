import { describe, expect, it } from "vitest";

import { toTicker } from "./ticker.js";
import { TOPOLOGY_EDGE_KINDS } from "./topology.js";
import {
  WORKSPACE_COMMAND_REFUSALS,
  WORKSPACE_COMMAND_TYPES,
  toWireWorkspaceCommand,
  toWireWorkspaceCommandOutcome,
} from "./workspace-command.js";

import type { HighlightNodesCommand } from "./workspace-command.js";

const HIGHLIGHT: HighlightNodesCommand = {
  type: "highlightNodes",
  symbols: [toTicker("BBB"), toTicker("XLK")],
  relations: ["sector_membership", "return_correlation"],
  subject: toTicker("AAA"),
};

describe("the workspace-command vocabulary", () => {
  it("holds exactly one command type this epic", () => {
    // One member deliberately — Story 7.4's Gate 1 settled `set_graph_encoding`
    // as a narrow wrapper around this one highlight. `PRODUCT_SPEC.md` §18's
    // other names arrive as new members here, each with its own producer.
    expect([...WORKSPACE_COMMAND_TYPES]).toEqual(["highlightNodes"]);
  });

  it("names one refusal per conjunct of the permission check", () => {
    expect([...WORKSPACE_COMMAND_REFUSALS]).toEqual([
      "type-not-permitted",
      "symbol-has-no-placement",
    ]);
  });

  it("spells its relations in the graph model's own vocabulary, never a second list", () => {
    for (const relation of HIGHLIGHT.relations) {
      expect(TOPOLOGY_EDGE_KINDS).toContain(relation);
    }
  });
});

describe("toWireWorkspaceCommand", () => {
  it("projects exactly the four declared fields", () => {
    expect(toWireWorkspaceCommand(HIGHLIGHT)).toEqual({
      type: "highlightNodes",
      symbols: ["BBB", "XLK"],
      relations: ["sector_membership", "return_correlation"],
      subject: "AAA",
    });
  });

  it("carries NO coordinate of any kind, even when one is attached to the value", () => {
    // `toWire` walks the MAP's keys, never the value's — which is the whole
    // mechanism, and the reason a bare `JSON.stringify` is forbidden on a
    // transport that bypasses `fast-json-stringify` (SSE). Both sides
    // re-derive the closed-form layout from the symbols alone, which is what
    // keeps ADR 0048 Decision 3's server/browser coordinate agreement a
    // property of the code rather than of a release.
    const leaky = { ...HIGHLIGHT, x: 120, y: -340 } as HighlightNodesCommand;

    const wire = toWireWorkspaceCommand(leaky);

    expect(Object.keys(wire).sort()).toEqual([
      "relations",
      "subject",
      "symbols",
      "type",
    ]);
    expect(JSON.stringify(wire)).not.toMatch(/"[xy]":/u);
  });
});

describe("toWireWorkspaceCommandOutcome", () => {
  it("projects the permitted arm with its command", () => {
    expect(
      toWireWorkspaceCommandOutcome({
        kind: "permitted",
        command: HIGHLIGHT,
      }),
    ).toEqual({
      kind: "permitted",
      command: {
        type: "highlightNodes",
        symbols: ["BBB", "XLK"],
        relations: ["sector_membership", "return_correlation"],
        subject: "AAA",
      },
    });
  });

  it("projects the refused arm under `because`, never `reason`", () => {
    // Mirrors `ToolOutcome`'s own `inapplicable` arm: the two vocabularies are
    // separate on purpose — a tool refusal is *not enough evidence*, and this
    // is *we will not execute that*.
    const wire = toWireWorkspaceCommandOutcome({
      kind: "refused",
      because: "symbol-has-no-placement",
    });

    expect(wire).toEqual({
      kind: "refused",
      because: "symbol-has-no-placement",
    });
    expect(wire).not.toHaveProperty("reason");
  });
});
