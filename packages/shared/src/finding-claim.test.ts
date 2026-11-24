import { describe, expect, it } from "vitest";

import { CLAIM_CEILING, FINDING_TYPES } from "./finding.js";
import {
  FINDING_SUBJECTS,
  TOOL_INAPPLICABILITY_CLAIMS,
  TOOL_REFUSAL_CLAIMS,
  breadthClaim,
  inapplicableClaim,
  refusalClaim,
} from "./finding-claim.js";
import { TOOL_INAPPLICABILITIES, TOOL_REFUSALS } from "./investigation.js";

import type { WireMarketBreadth } from "./market-stream-protocol.js";

const OBSERVED: WireMarketBreadth = {
  basis: "observed",
  advancing: 218,
  declining: 236,
  unchanged: 12,
  measured: 466,
  tracked: 501,
  windowMinutes: 5,
};

const SESSION: WireMarketBreadth = {
  basis: "session",
  advancing: 218,
  declining: 236,
  unchanged: 12,
  measured: 466,
  tracked: 501,
  session: "2026-09-11",
};

describe("the claim vocabulary", () => {
  it("has a subject for every finding type and a phrase for every refusal word", () => {
    expect(Object.keys(FINDING_SUBJECTS).sort()).toStrictEqual(
      [...FINDING_TYPES].sort(),
    );
    expect(Object.keys(TOOL_REFUSAL_CLAIMS).sort()).toStrictEqual(
      [...TOOL_REFUSALS].sort(),
    );
  });

  it("carries no intensity adjective anywhere — `high` is a reserved band word", () => {
    // `measured-set.ts`' existing reservation, inherited: `high` is one of
    // the four `ANOMALY_BANDS`, and from Epic 8 a confidence mark and a band
    // chip sit on one row. A claim reading *volume is high* would put a band
    // word beside a band chip meaning something else — `anomaly.ts`'s own
    // reversal trigger, fired on a surface that does not draw a chip yet.
    const RESERVED = /\b(?:normal|elevated|high|extreme)\b/iu;

    for (const subject of Object.values(FINDING_SUBJECTS)) {
      expect(subject).not.toMatch(RESERVED);
    }
    for (const phrase of Object.values(TOOL_REFUSAL_CLAIMS)) {
      expect(phrase).not.toMatch(RESERVED);
    }
  });

  it("keeps the subject's own two-letter spellings apart — no two finding types share a subject", () => {
    // A shared subject would make two rows' refusal claims identical, which
    // is Done-when 2's pairwise-distinctness risk arriving from the
    // vocabulary rather than from a tool.
    const subjects = Object.values(FINDING_SUBJECTS);
    expect(new Set(subjects).size).toBe(subjects.length);
  });

  it("keeps every refusal phrase distinct, including the two pairs that must never merge", () => {
    const phrases = Object.values(TOOL_REFUSAL_CLAIMS);
    expect(new Set(phrases).size).toBe(phrases.length);

    // The SUBJECT's history against the BENCHMARK's — they refuse different
    // securities and are repaired in different places.
    expect(TOOL_REFUSAL_CLAIMS["split-discontinuity"]).not.toBe(
      TOOL_REFUSAL_CLAIMS["reference-split-discontinuity"],
    );
    // *We have an aggregate and it counted nothing* against *we have no
    // aggregate* — the first has a denominator and the second does not.
    expect(TOOL_REFUSAL_CLAIMS["nothing-observed"]).not.toBe(
      TOOL_REFUSAL_CLAIMS["no-aggregate-yet"],
    );
  });
});

describe("refusalClaim", () => {
  it("is the question that went unanswered, an em dash, and the reason", () => {
    expect(refusalClaim("VOLUME_RATE", "no-distribution")).toBe(
      "Volume rate — no stored distribution to rank against",
    );
    expect(refusalClaim("PRICE_MOVE", "nothing-observed")).toBe(
      "5-minute move — nothing observed to measure",
    );
  });

  it("fits the claim ceiling for EVERY type/refusal pair, which is the worst case this product draws", () => {
    // AC 6's own reasoning: refusal claims are the longest sentences this
    // product draws, and a zero-bar store — CI's permanent state — is where
    // every one of them is reachable. Asserted over the whole cross product
    // rather than over the pairs the six tools happen to reach today, because
    // `TOOL_REFUSALS` is shared and a seventh tool can reach any of them.
    for (const type of FINDING_TYPES) {
      for (const refusal of TOOL_REFUSALS) {
        const claim = refusalClaim(type, refusal);
        expect(
          claim.length,
          `${type} / ${refusal} is ${String(claim.length)} characters`,
        ).toBeLessThanOrEqual(CLAIM_CEILING);
      }
    }
  });

  it("has no terminal stop, and its REASON half carries no figure at all", () => {
    for (const type of FINDING_TYPES) {
      for (const refusal of TOOL_REFUSALS) {
        expect(refusalClaim(type, refusal).endsWith(".")).toBe(false);
      }
    }

    // **AC 9, asserted on the half that could fabricate one.** A refusal
    // read nothing, so the reason it gives can hold no figure and no instant.
    //
    // The SUBJECT half is deliberately not in this assertion and the
    // distinction is the point rather than a convenience: `5-minute move`
    // carries a digit, and that digit is the measurement SPAN — a declared
    // constant naming the question, true whether or not anything was
    // observed. A reading would be `−4.20%` or `94th`, which only an `ok`
    // outcome can produce.
    for (const phrase of Object.values(TOOL_REFUSAL_CLAIMS)) {
      expect(phrase).not.toMatch(/\d/u);
    }
  });
});

describe("inapplicableClaim (Task 7.3.5)", () => {
  it("is the question that does not arise, an em dash, and why not", () => {
    expect(inapplicableClaim("RELATIVE_MOVE", "is-benchmark")).toBe(
      "Sector comparison — it is the sector benchmark itself",
    );
    expect(inapplicableClaim("RETURN_CORRELATION", "is-the-market-proxy")).toBe(
      "Market correlation — it is the market benchmark itself",
    );
  });

  it("fits the claim ceiling for EVERY type/inapplicability pair", () => {
    for (const type of FINDING_TYPES) {
      for (const because of TOOL_INAPPLICABILITIES) {
        const claim = inapplicableClaim(type, because);
        expect(
          claim.length,
          `${type} / ${because} is ${String(claim.length)} characters`,
        ).toBeLessThanOrEqual(CLAIM_CEILING);
      }
    }
  });

  it("has no terminal stop, and carries no figure — this is a structural fact, never a measurement", () => {
    for (const type of FINDING_TYPES) {
      for (const because of TOOL_INAPPLICABILITIES) {
        expect(inapplicableClaim(type, because).endsWith(".")).toBe(false);
      }
    }
    for (const phrase of Object.values(TOOL_INAPPLICABILITY_CLAIMS)) {
      expect(phrase).not.toMatch(/\d/u);
    }
  });

  it("keeps every inapplicability phrase distinct", () => {
    const phrases = Object.values(TOOL_INAPPLICABILITY_CLAIMS);
    expect(new Set(phrases).size).toBe(phrases.length);
  });
});

describe("breadthClaim", () => {
  it("opens with the population and never with a ticker", () => {
    expect(breadthClaim(OBSERVED)).toBe(
      "218 up, 236 down, 12 flat of 466 measured in the last 5 min",
    );
    expect(breadthClaim(OBSERVED)).toMatch(/^\d/u);
  });

  it("gives the two bases two tails, because they answer different questions", () => {
    expect(breadthClaim(SESSION)).toBe(
      "218 up, 236 down, 12 flat of 466 measured on 2026-09-11",
    );
    expect(breadthClaim(OBSERVED)).not.toBe(breadthClaim(SESSION));
  });

  it("states `measured` and never `tracked`, which is a different scale", () => {
    // The three counts partition `measured`; `tracked − measured` is *not
    // heard from*, and a one-line claim cannot carry two scales without a
    // rule between them.
    expect(breadthClaim(OBSERVED)).toContain("466");
    expect(breadthClaim(OBSERVED)).not.toContain("501");
  });

  it("draws three zeroes over a zero denominator, which is CI's TRUE sentence", () => {
    // Zero bars means `measured: 0, tracked: 516` for ever on every gated
    // run. *We counted and heard nothing* is a measurement, not a degraded
    // state — which is why the tool answers `ok` here and the confidence is
    // `POSSIBLE` rather than the row refusing.
    expect(
      breadthClaim({
        basis: "observed",
        advancing: 0,
        declining: 0,
        unchanged: 0,
        measured: 0,
        tracked: 516,
        windowMinutes: 5,
      }),
    ).toBe("0 up, 0 down, 0 flat of 0 measured in the last 5 min");
  });

  it("fits the ceiling at a four-digit population, which the universe cannot reach", () => {
    // **Both tails, because they are not the same length** (Task 7.3.2):
    // `on 2026-09-11` is four characters SHORTER than `in the last 5 min`, so
    // the `observed` basis is the actual worst case and a stress test of
    // `session` alone understates it — both are asserted here rather than
    // leaving the longer one unmeasured.
    const stress = {
      advancing: 1048,
      declining: 1048,
      unchanged: 1048,
      measured: 3144,
      tracked: 4000,
    };

    const session = breadthClaim({
      ...stress,
      basis: "session",
      session: "2026-09-11",
    });
    const observed = breadthClaim({
      ...stress,
      basis: "observed",
      windowMinutes: 5,
    });

    expect(session.length).toBeLessThanOrEqual(CLAIM_CEILING);
    expect(observed.length).toBeLessThanOrEqual(CLAIM_CEILING);
    expect(observed.length).toBeGreaterThan(session.length);
  });

  it("separates its figures with commas and its clauses with `of` — no counted word is a bare number beside another", () => {
    // The breadth region's own lesson: *unchanged* and *not heard from* are
    // different facts, and a reader who meets four figures in a row cannot
    // tell which is which. Three counts, one denominator, in that order.
    expect(breadthClaim(OBSERVED)).toMatch(
      /^\d+ up, \d+ down, \d+ flat of \d+ measured/u,
    );
  });
});
