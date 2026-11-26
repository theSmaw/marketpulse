import { toTicker } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import {
  createHighlightPeersProducer,
  readWorkspaceCommand,
} from "./workspace-command-pipeline.js";

import type { TopologyLayout, Ticker, ToolOutcome } from "@marketpulse/shared";
import type {
  RelatedSecuritiesAnswerer,
  RelatedSecuritiesReading,
} from "./related-securities.js";

const ASOF = new Date("2026-11-25T14:01:00.000Z");

const layoutWith = (symbols: readonly string[]): TopologyLayout => ({
  placements: symbols.map((symbol, index) => ({
    symbol: toTicker(symbol),
    x: index * 10,
    y: 0,
  })),
  bounds: { minX: 0, minY: 0, maxX: symbols.length * 10, maxY: 0 },
});

const answering = (
  outcome: ToolOutcome<RelatedSecuritiesReading>,
): RelatedSecuritiesAnswerer => ({
  name: "get_related_securities",
  answer: () => Promise.resolve(outcome),
});

const reading = (
  subject: string,
  related: readonly { symbol: string; relations: readonly string[] }[],
): ToolOutcome<RelatedSecuritiesReading> =>
  ({
    kind: "ok",
    value: {
      subject: toTicker(subject),
      related: related.map(({ symbol, relations }) => ({
        symbol: toTicker(symbol),
        relations,
      })),
      correlation: "not-measured",
    },
  }) as unknown as ToolOutcome<RelatedSecuritiesReading>;

// ------------------------------------------------------------- stage 1
describe("readWorkspaceCommand — the validate stage", () => {
  const valid = {
    type: "highlightNodes",
    symbols: ["BBB", "XLK"],
    relations: ["sector_membership"],
    subject: "AAA",
  };

  it("reads a well-formed candidate", () => {
    expect(readWorkspaceCommand(valid)).toEqual({
      type: "highlightNodes",
      symbols: ["BBB", "XLK"],
      relations: ["sector_membership"],
      subject: "AAA",
    });
  });

  // **The non-empty tuples are established HERE and nowhere else.** The TYPE
  // makes an empty highlight untypeable for a caller holding a literal and
  // says nothing whatever about an array that arrived as JSON, which is why
  // this is a real stage rather than a cast.
  it("refuses an empty `symbols` array — an empty highlight is a claim about zero nodes", () => {
    expect(readWorkspaceCommand({ ...valid, symbols: [] })).toBeUndefined();
  });

  it("refuses an empty `relations` array — a highlight the note cannot explain", () => {
    expect(readWorkspaceCommand({ ...valid, relations: [] })).toBeUndefined();
  });

  it("refuses a relation outside the edge-kind vocabulary", () => {
    expect(
      readWorkspaceCommand({ ...valid, relations: ["industry_membership"] }),
    ).toBeUndefined();
  });

  it("refuses an unknown command type", () => {
    expect(
      readWorkspaceCommand({ ...valid, type: "openPriceChart" }),
    ).toBeUndefined();
  });

  it("refuses a missing subject", () => {
    expect(readWorkspaceCommand({ ...valid, subject: "" })).toBeUndefined();
  });

  it("refuses a subject that is a member of its own `symbols`", () => {
    // `HighlightNodesCommand.subject`'s docblock says *never a member of
    // `symbols`* and, until this story's review, nothing enforced it. Today's
    // producer structurally cannot violate it (`neighboursOf` never emits the
    // subject); a producer handing over parsed JSON — Epic 10's — can, and the
    // result is a subject highlighted as its own peer under a note saying it
    // is related to itself.
    expect(
      readWorkspaceCommand({ ...valid, symbols: ["BBB", "AAA"] }),
    ).toBeUndefined();
  });

  it("never throws on anything at all", () => {
    for (const raw of [undefined, null, 7, "highlightNodes", [], {}]) {
      expect(() => readWorkspaceCommand(raw)).not.toThrow();
      expect(readWorkspaceCommand(raw)).toBeUndefined();
    }
  });
});

// --------------------------------------------------- stages 1 and 2 composed
describe("the highlight-peers producer", () => {
  it("follows the peer-comparison step by TOOL NAME, never by position", () => {
    const producer = createHighlightPeersProducer({
      related: answering(reading("AAA", [])),
      layout: () => layoutWith(["AAA"]),
    });

    expect(producer.afterTool).toBe("compare_securities");
  });

  it("proposes a permitted highlight over the real related set", async () => {
    const producer = createHighlightPeersProducer({
      related: answering(
        reading("AAA", [
          { symbol: "BBB", relations: ["sector_membership"] },
          { symbol: "DDD", relations: ["return_correlation"] },
        ]),
      ),
      layout: () => layoutWith(["AAA", "BBB", "DDD"]),
    });

    const outcome = await producer.propose([toTicker("AAA")], ASOF);

    expect(outcome).toEqual({
      kind: "permitted",
      command: {
        type: "highlightNodes",
        symbols: ["BBB", "DDD"],
        // The SET of kinds present, deduplicated, never one dominant kind —
        // a mixed set is the common case and a singular field over it would
        // be a fully-formed claim that the set is one kind.
        relations: ["sector_membership", "return_correlation"],
        subject: "AAA",
      },
    });
  });

  // **The regression test for a real defect this story's own review found.**
  it("orders `relations` by TOPOLOGY_EDGE_KINDS, not by the input's symbol sort", async () => {
    // The first draft built the set as
    // `[...new Set(related.flatMap((row) => row.relations))]`, which takes
    // FIRST-SEEN order over a symbol-sorted list. A cross-sector correlated
    // peer whose ticker sorts before the first sector-mate — `ABBV` before
    // `BBB`, reachable on the real universe today — therefore produced
    // `["return_correlation", "sector_membership"]`, reversed from what
    // `HighlightNodesCommand.relations`' own docblock promises, with the type
    // and every then-existing test green.
    const producer = createHighlightPeersProducer({
      related: answering(
        reading("NVDA", [
          { symbol: "ABBV", relations: ["return_correlation"] },
          { symbol: "BBB", relations: ["sector_membership"] },
        ]),
      ),
      layout: () => layoutWith(["NVDA", "ABBV", "BBB"]),
    });

    const outcome = await producer.propose([toTicker("NVDA")], ASOF);
    if (outcome?.kind !== "permitted") throw new Error("expected permitted");

    expect([...outcome.command.relations]).toEqual([
      "sector_membership",
      "return_correlation",
    ]);
    // And the symbols keep their own sort, which is a separate order.
    expect([...outcome.command.symbols]).toEqual(["ABBV", "BBB"]);
  });

  it("deduplicates the relation set rather than repeating a kind per symbol", async () => {
    const producer = createHighlightPeersProducer({
      related: answering(
        reading("AAA", [
          { symbol: "BBB", relations: ["sector_membership"] },
          { symbol: "CCC", relations: ["sector_membership"] },
        ]),
      ),
      layout: () => layoutWith(["AAA", "BBB", "CCC"]),
    });

    const outcome = await producer.propose([toTicker("AAA")], ASOF);
    if (outcome?.kind !== "permitted") throw new Error("expected permitted");

    expect([...outcome.command.relations]).toEqual(["sector_membership"]);
  });

  // **No command at all, never an empty payload** (ADR 0029).
  it("proposes NOTHING for a subject with no related securities under any kind", async () => {
    const producer = createHighlightPeersProducer({
      related: answering(reading("QQQ", [])),
      layout: () => layoutWith(["QQQ"]),
    });

    expect(await producer.propose([toTicker("QQQ")], ASOF)).toBeUndefined();
  });

  it("proposes NOTHING for an untracked subject — a refusal of a command never proposed would be a different claim", async () => {
    const producer = createHighlightPeersProducer({
      related: answering({ kind: "refused", reason: "not-tracked" }),
      layout: () => layoutWith(["AAA"]),
    });

    expect(await producer.propose([toTicker("PSKY")], ASOF)).toBeUndefined();
  });

  it("proposes a REFUSAL where a related security has no placement", async () => {
    const producer = createHighlightPeersProducer({
      related: answering(
        reading("AAA", [{ symbol: "BBB", relations: ["sector_membership"] }]),
      ),
      layout: () => layoutWith(["AAA"]),
    });

    expect(await producer.propose([toTicker("AAA")], ASOF)).toEqual({
      kind: "refused",
      because: "symbol-has-no-placement",
    });
  });

  it("threads the investigation's own `asOf` into the answerer rather than reading a clock", async () => {
    const seen: Date[] = [];
    const producer = createHighlightPeersProducer({
      related: {
        name: "get_related_securities",
        answer: (_input: { symbol: Ticker }, asOf: Date) => {
          seen.push(asOf);
          return Promise.resolve(reading("AAA", []));
        },
      },
      layout: () => layoutWith(["AAA"]),
    });

    await producer.propose([toTicker("AAA")], ASOF);

    expect(seen).toEqual([ASOF]);
  });

  it("refuses a command the capability set does not admit", async () => {
    const producer = createHighlightPeersProducer({
      related: answering(
        reading("AAA", [{ symbol: "BBB", relations: ["sector_membership"] }]),
      ),
      layout: () => layoutWith(["AAA", "BBB"]),
      capability: { types: [] },
    });

    expect(await producer.propose([toTicker("AAA")], ASOF)).toEqual({
      kind: "refused",
      because: "type-not-permitted",
    });
  });
});
