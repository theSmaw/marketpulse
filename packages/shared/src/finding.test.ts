import { describe, expect, it } from "vitest";

import {
  CLAIM_CEILING,
  CONFIDENCE_LEVELS,
  EVIDENCE_KINDS,
  FINDING_TYPES,
  FINDING_TYPE_FOR_TOOL,
  createEvidencedFinding,
  createUnevidencedFinding,
  toFindingId,
  toWireFinding,
} from "./finding.js";
import { TOOL_NAMES, toStepId } from "./investigation.js";
import { toTicker } from "./ticker.js";

import type { EvidenceFacts, Finding, FindingStamp } from "./finding.js";

const STAMP: FindingStamp = {
  findingId: toFindingId("finding-1"),
  stepId: toStepId("step-1"),
  retrievedAt: new Date("2026-11-23T14:01:00.500Z"),
};

const OBSERVATION: EvidenceFacts = {
  kind: "market_observation",
  source: "alpaca:iex",
  observedAt: new Date("2026-11-23T14:00:00.000Z"),
  security: toTicker("NVDA"),
  rawData: "current-market-state:NVDA",
};

describe("the finding vocabulary", () => {
  it("names six claim kinds, one per step, with no duplicates", () => {
    expect(FINDING_TYPES).toHaveLength(6);
    expect(new Set(FINDING_TYPES).size).toBe(FINDING_TYPES.length);
  });

  it("maps every tool to a claim kind, and uses every claim kind — both directions", () => {
    // **Both directions, because each catches a different author.** A tool
    // with no entry is already a compile error (`satisfies Record<ToolName,
    // …>`); a claim kind no tool produces is NOT, and would be ADR 0029's
    // fully-formed vocabulary about nothing — a surface switching on it would
    // have a branch nobody has ever seen render.
    expect(Object.keys(FINDING_TYPE_FOR_TOOL).sort()).toStrictEqual(
      [...TOOL_NAMES].sort(),
    );
    expect(new Set(Object.values(FINDING_TYPE_FOR_TOOL))).toStrictEqual(
      new Set(FINDING_TYPES),
    );
  });

  it("ships all four confidence levels, strongest first", () => {
    // `CONFIRMED` has no producer in this epic and is reserved for Epic 9's
    // filings — shipped now so the epic that produces one widens no union.
    expect([...CONFIDENCE_LEVELS]).toStrictEqual([
      "CONFIRMED",
      "SUPPORTED",
      "POSSIBLE",
      "UNKNOWN",
    ]);
  });

  it("declares only the two evidence kinds this story can produce", () => {
    // The other six `PRODUCT_SPEC.md` §16 names stay undeclared with their
    // own condition in the type's docblock. A declared member with no
    // producer is a record about nothing.
    expect([...EVIDENCE_KINDS]).toStrictEqual([
      "market_observation",
      "calculated_metric",
    ]);
  });
});

describe("createEvidencedFinding", () => {
  it("carries the claim, the confidence and the evidence, stamped with one retrieval instant", () => {
    const finding = createEvidencedFinding(
      {
        type: "PRICE_OBSERVATION",
        claim: "Traded at 184.52 on 12,480 shares in the latest bar",
        confidence: "SUPPORTED",
        evidence: [
          OBSERVATION,
          {
            kind: "calculated_metric",
            source: "alpaca:sip",
            method: "returnPercentileOf",
            security: toTicker("NVDA"),
            rawData: "return_baselines:NVDA",
          },
        ],
      },
      STAMP,
    );

    expect(finding.evidenced).toBe(true);
    expect(finding.id).toBe("finding-1");
    expect(finding.stepId).toBe("step-1");
    expect(finding.confidence).toBe("SUPPORTED");
    expect(finding.evidence).toHaveLength(2);

    // **One instant across every item**, from the one stamp — so a finding's
    // items cannot disagree about when this process recorded the claim.
    for (const item of finding.evidence) {
      expect(item.retrievedAt).toStrictEqual(STAMP.retrievedAt);
    }
  });

  it("keeps an absent observedAt ABSENT rather than present as undefined", () => {
    // `exactOptionalPropertyTypes` makes those different types, and the
    // difference is ADR 0029's at the field level: a `null`/`undefined`
    // `observedAt` is a fully-formed answer to a question nobody could
    // answer. A 60-session baseline has no single instant at which it was
    // true.
    const finding = createEvidencedFinding(
      {
        type: "RETURN_CORRELATION",
        claim: "Positive co-movement with SPY — 48 anchors, 60 sessions",
        confidence: "SUPPORTED",
        evidence: [
          {
            kind: "calculated_metric",
            source: "alpaca:sip",
            method: "pearsonCorrelation",
            rawData: "market_bars:NVDA+SPY",
          },
        ],
      },
      STAMP,
    );

    const [item] = finding.evidence;
    expect("observedAt" in item).toBe(false);
    expect("method" in item).toBe(true);
    expect("security" in item).toBe(false);
  });

  it("does NOT typecheck with an empty evidence tuple", () => {
    // **Declared and never called.** The assertion is the `@ts-expect-error`
    // — `tsc -b` fails if the line it marks compiles — and calling it would
    // only exercise what an impossible value does at run time, which is not
    // the guarantee. `composite-score.test.ts`' own proofs are calls because
    // its subject is a consumer that reads a field; this subject is a
    // constructor that walks a tuple.
    const mintWithNothing = () =>
      createEvidencedFinding(
        {
          type: "PRICE_MOVE",
          claim: "−4.20% over 5 min — 94th of 4,620",
          confidence: "SUPPORTED",
          // @ts-expect-error an evidence-less evidenced finding is
          // untypeable — AC 2, as a compile error rather than a runtime
          // check. This is the assertion that cannot be forgotten: a test
          // over a value would still pass with the tuple widened to an array.
          evidence: [],
        },
        STAMP,
      );

    expect(typeof mintWithNothing).toBe("function");
  });

  it("does NOT typecheck an unbranded, structurally complete finding", () => {
    // The brand is not exported, so no module but `finding.ts` can mint one.
    // A structurally complete object — every field right, the brand the only
    // thing missing — is a type error wherever a `Finding` is wanted, which
    // is what makes `two-mint-sites-for-a-finding` a guard over the one
    // remaining route in (a cast) rather than over the whole shape.
    const takesAFinding = (finding: Finding) => finding.claim;

    // @ts-expect-error — the brand cannot be supplied from outside.
    takesAFinding({
      evidenced: false,
      id: toFindingId("finding-2"),
      stepId: toStepId("step-2"),
      type: "VOLUME_RATE",
      claim: "Volume rate — no stored distribution to rank against",
      confidence: "UNKNOWN",
      because: "no-distribution",
    });

    expect(
      takesAFinding(
        createUnevidencedFinding(
          {
            type: "VOLUME_RATE",
            claim: "Volume rate — no stored distribution to rank against",
            because: "no-distribution",
          },
          STAMP,
        ),
      ),
    ).toBe("Volume rate — no stored distribution to rank against");
  });
});

describe("createUnevidencedFinding", () => {
  it("carries the refusal word, UNKNOWN, and no evidence member at all", () => {
    const finding = createUnevidencedFinding(
      {
        type: "VOLUME_RATE",
        claim: "Volume rate — no stored distribution to rank against",
        because: "no-distribution",
      },
      STAMP,
    );

    expect(finding.evidenced).toBe(false);
    expect(finding.confidence).toBe("UNKNOWN");
    expect(finding.because).toBe("no-distribution");

    // **Never `evidence: []`.** An empty array is a constant and a branch
    // away from the defect the evidenced type exists to forbid, and a surface
    // reading `.length` off one would draw *no evidence gathered* for a step
    // that gathered nothing because there was nothing to gather. AC 9's own
    // *carries nothing it did not actually read*, at the type level.
    expect("evidence" in finding).toBe(false);
  });

  it("does NOT accept a confidence other than UNKNOWN", () => {
    createUnevidencedFinding(
      {
        type: "VOLUME_RATE",
        claim: "Volume rate — no stored distribution to rank against",
        because: "no-distribution",
        // @ts-expect-error AC 3's rule lives in the type: a refused outcome
        // cannot be minted as anything but `UNKNOWN`, so this mint takes no
        // confidence argument at all.
        confidence: "SUPPORTED",
      },
      STAMP,
    );
  });
});

describe("what the brand does NOT prove", () => {
  it("permits a claim that contradicts its own evidence — the guarantee is about the MODULE, not the value", () => {
    // **`composite-score.test.ts`' own precedent, copied in wording as well
    // as in shape, and it is here so the type guarantee is never
    // over-trusted.**
    //
    // The brand is a compile error about which module minted the value.
    // TypeScript cannot prove that the sentence in `claim` states the figure
    // the evidence was read from — that is a TEST, which each tool's own
    // `toFinding` suite holds, and nothing more. Two halves, and they are not
    // the same half.
    //
    // Demonstrated rather than asserted in prose: a mint with a claim about
    // one security and evidence about another succeeds, and the type system
    // is silent.
    const lying = createEvidencedFinding(
      {
        type: "PRICE_OBSERVATION",
        claim: "Traded at 1.00 on 1 share in the latest bar",
        confidence: "CONFIRMED",
        evidence: [{ ...OBSERVATION, security: toTicker("AAPL") }],
      },
      STAMP,
    );

    expect(lying.claim).toContain("1.00");
    expect(lying.evidence[0].security).toBe("AAPL");
    // And `CONFIRMED` — a level this epic has no producer for — is accepted
    // by the mint too. The rule that keeps it off the wire is each tool's
    // own confidence mapping, which is a test.
    expect(lying.confidence).toBe("CONFIRMED");
  });

  it("does not enforce the claim ceiling at the mint, and that is deliberate", () => {
    // The mint is reached from inside the orchestrator's own `try`, so a
    // thrown `RangeError` here would kill a whole run because a refusal
    // sentence was one character too long. The ceiling is asserted in each
    // tool's own unit tests instead — against the producers, which is where a
    // long claim is actually written.
    const long = createUnevidencedFinding(
      {
        type: "PRICE_MOVE",
        claim: "x".repeat(CLAIM_CEILING + 1),
        because: "nothing-observed",
      },
      STAMP,
    );

    expect(long.claim.length).toBeGreaterThan(CLAIM_CEILING);
  });
});

describe("toWireFinding", () => {
  it("encodes an evidenced finding with its evidence inline and its instants as strings", () => {
    const wire = toWireFinding(
      createEvidencedFinding(
        {
          type: "PRICE_OBSERVATION",
          claim: "Traded at 184.52 on 12,480 shares in the latest bar",
          confidence: "SUPPORTED",
          evidence: [OBSERVATION],
        },
        STAMP,
      ),
    );

    expect(wire).toStrictEqual({
      evidenced: true,
      id: "finding-1",
      stepId: "step-1",
      type: "PRICE_OBSERVATION",
      claim: "Traded at 184.52 on 12,480 shares in the latest bar",
      confidence: "SUPPORTED",
      evidence: [
        {
          kind: "market_observation",
          source: "alpaca:iex",
          observedAt: "2026-11-23T14:00:00.000Z",
          retrievedAt: "2026-11-23T14:01:00.500Z",
          security: "NVDA",
          rawData: "current-market-state:NVDA",
        },
      ],
    });
  });

  it("encodes a refusal with `because` and no `evidence` key on the wire", () => {
    const wire = toWireFinding(
      createUnevidencedFinding(
        {
          type: "VOLUME_RATE",
          claim: "Volume rate — no stored distribution to rank against",
          because: "no-distribution",
        },
        STAMP,
      ),
    );

    expect(wire).toStrictEqual({
      evidenced: false,
      id: "finding-1",
      stepId: "step-1",
      type: "VOLUME_RATE",
      claim: "Volume rate — no stored distribution to rank against",
      confidence: "UNKNOWN",
      because: "no-distribution",
    });
  });

  it("carries no symbol-keyed brand through JSON, which is why there is no reader", () => {
    // The brand dies at `JSON.parse` and is never restored — unlike
    // `AnomalyScore`, which has `readAnomalyScore`. The browser declares its
    // own wire shape and reads three fields; AC 2's guarantee is a BACKEND
    // guarantee. Asserted rather than left in a docblock.
    const wire = toWireFinding(
      createEvidencedFinding(
        {
          type: "PRICE_OBSERVATION",
          claim: "Traded at 184.52 on 12,480 shares in the latest bar",
          confidence: "SUPPORTED",
          evidence: [OBSERVATION],
        },
        STAMP,
      ),
    );

    const round = JSON.parse(JSON.stringify(wire)) as Record<string, unknown>;
    expect(Object.getOwnPropertySymbols(round)).toHaveLength(0);
    expect(Object.keys(round).sort()).toStrictEqual([
      "claim",
      "confidence",
      "evidence",
      "evidenced",
      "id",
      "stepId",
      "type",
    ]);
  });
});
