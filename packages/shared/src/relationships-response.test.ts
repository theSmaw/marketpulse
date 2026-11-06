import { describe, expect, it } from "vitest";

import { isRelationshipsResponse } from "./relationships-response.js";
import type {
  RelationshipsPassPayload,
  RelationshipsResponse,
} from "./relationships-response.js";

/** A pass row with every figure present and nesting, as the store writes one. */
const pass: RelationshipsPassPayload = {
  observedAt: "2026-09-11T20:00:00.000Z",
  trackedEquities: 501,
  eligibleEquities: 496,
  splitDiscontinuity: 5,
  absent: 0,
  candidatePairs: 122_760,
  computedPairs: 122_760,
  retainedPairs: 1860,
  tooFewOverlappingSamples: 0,
  zeroVariance: 0,
  belowSignificance: 20_752,
  retainedN: 5,
  lookbackSessions: 60,
  spanMinutes: 5,
  feed: "sip",
};

const body: RelationshipsResponse = {
  correlations: [{ low: "AAPL", high: "MSFT", r: 0.84, n: 4620 }],
  pass,
};

describe("isRelationshipsResponse", () => {
  it("accepts a body with a pass and rows", () => {
    expect(isRelationshipsResponse(body)).toBe(true);
  });

  // The first of the contract's three states, and the permanent state of the
  // only machine that gates a merge: CI has zero bars, so no pass has ever
  // run there and none ever will.
  it("accepts an absent pass with no rows — nothing has ever been measured", () => {
    expect(isRelationshipsResponse({ correlations: [] })).toBe(true);
  });

  // The second, and the whole reason `pass` is absent rather than null: a
  // present pass with zero rows is *we measured and kept nothing*, which is a
  // different answer a reader must be able to draw differently.
  it("accepts a present pass with no rows — measured, and nothing retained", () => {
    expect(
      isRelationshipsResponse({
        correlations: [],
        pass: { ...pass, retainedPairs: 0 },
      }),
    ).toBe(true);
  });

  it("accepts an explicit undefined pass, the way a client-side construction spells absent", () => {
    expect(isRelationshipsResponse({ correlations: [], pass: undefined })).toBe(
      true,
    );
  });

  it("accepts unknown extra fields, because a newer server may grow a key", () => {
    expect(isRelationshipsResponse({ ...body, industries: [] })).toBe(true);
  });

  it("refuses a missing correlations array, which has no second spelling", () => {
    expect(isRelationshipsResponse({ pass })).toBe(false);
  });

  it("refuses a non-object and a null, the last being a static host's own body", () => {
    expect(isRelationshipsResponse(null)).toBe(false);
    expect(isRelationshipsResponse("<!doctype html>")).toBe(false);
  });

  // A `null` under a schema's declared `"number"` reaches the wire as **0**,
  // which is a plausible coefficient rather than a visibly empty one — the
  // trap `routes/securities.ts` measured, refused by name here.
  it("refuses a coefficient that is not a finite number", () => {
    for (const r of [null, "0.8", Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        isRelationshipsResponse({
          correlations: [{ low: "AAPL", high: "MSFT", r, n: 10 }],
        }),
      ).toBe(false);
    }
  });

  it("refuses a coefficient outside [-1, 1], which is arithmetic that did not happen", () => {
    for (const r of [1.0001, -4.2, 42]) {
      expect(
        isRelationshipsResponse({
          correlations: [{ low: "AAPL", high: "MSFT", r, n: 10 }],
        }),
      ).toBe(false);
    }
  });

  it("accepts the two exact bounds, because a perfect pair is a real answer", () => {
    for (const r of [-1, 1, 0]) {
      expect(
        isRelationshipsResponse({
          correlations: [{ low: "AAPL", high: "MSFT", r, n: 10 }],
        }),
      ).toBe(true);
    }
  });

  it("refuses an overlap that is not a count", () => {
    for (const n of [0.5, -1, "4620", null]) {
      expect(
        isRelationshipsResponse({
          correlations: [{ low: "AAPL", high: "MSFT", r: 0.5, n }],
        }),
      ).toBe(false);
    }
  });

  // The empty string is what a nullable field declared plainly `"string"`
  // serialises to — so a row naming no security at all arrives looking
  // well-formed.
  it("refuses an empty ticker on either end", () => {
    expect(
      isRelationshipsResponse({
        correlations: [{ low: "", high: "MSFT", r: 0.5, n: 10 }],
      }),
    ).toBe(false);
    expect(
      isRelationshipsResponse({
        correlations: [{ low: "AAPL", high: "", r: 0.5, n: 10 }],
      }),
    ).toBe(false);
  });

  it("refuses a pass missing any one of its figures", () => {
    for (const name of Object.keys(pass)) {
      // Built by filtering rather than by `delete`, which is both the lint
      // rule's preference and the shape that cannot accidentally leave an
      // `undefined`-valued key behind — a present `undefined` is what the
      // envelope's own `pass === undefined` branch reads as *absent*, so it
      // would make this loop assert the wrong thing for every key.
      const partial = Object.fromEntries(
        Object.entries(pass).filter(([key]) => key !== name),
      );

      expect(isRelationshipsResponse({ correlations: [], pass: partial })).toBe(
        false,
      );
    }
  });

  it("refuses a pass figure that is not a count", () => {
    expect(
      isRelationshipsResponse({
        correlations: [],
        pass: { ...pass, retainedPairs: -1 },
      }),
    ).toBe(false);
    expect(
      isRelationshipsResponse({
        correlations: [],
        pass: { ...pass, candidatePairs: 1.5 },
      }),
    ).toBe(false);
  });

  // Invariant 6: provenance is displayed, never implied. A tape this bundle
  // has no words for cannot be labelled honestly, so the body is refused
  // rather than a slug reaching a source note.
  it("refuses a tape it has no words for", () => {
    expect(
      isRelationshipsResponse({
        correlations: [],
        pass: { ...pass, feed: "otc" },
      }),
    ).toBe(false);
  });
});
