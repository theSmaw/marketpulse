import { describe, expect, it } from "vitest";

import {
  FIXTURE_SUBJECTS,
  LOADING_UNIVERSE,
  securitiesFixtureView,
} from "../../fixtures/securities.js";
import { storedHistoryFor } from "./chart-vacancy.js";

// The derivation behind the two empty answers (Task 2.14.6).
//
// Every case here is a sentence somebody reads on a screen, which is why this
// file exists at all: the whole of `PROVENANCE.md` §6 is a decision about what
// this product is entitled to claim, and a unit test is the only instrument
// that can read a claim as a value. The component tests check that the value
// reaches a sentence; this checks the value is right.
//
// **Every state comes from a recorded body through the real transition** —
// `securitiesFixtureView` — rather than from a `SecuritiesView` typed here. The
// rule is Task 2.10.8's and it is load-bearing for this file in particular: the
// property the whole derivation turns on is that a security with no bars is
// **absent** from `coverage` rather than present with a zero, and a hand-built
// view is a second opinion about what the server sends. `ADBE` in the `gaps`
// fixture is that security, with its coverage record removed from a real body.

/** The security the `gaps` fixture holds with nothing stored behind it. */
const NO_BARS = FIXTURE_SUBJECTS.withoutBars;

describe("storedHistoryFor", () => {
  it("reads a symbol present in coverage as history we hold", () => {
    expect(storedHistoryFor(securitiesFixtureView("full"), "NVDA")).toBe(
      "some",
    );
  });

  // The wire contract's own spelling, which is the whole mechanism.
  it("reads a tracked symbol absent from coverage as nothing held", () => {
    expect(storedHistoryFor(securitiesFixtureView("gaps"), NO_BARS)).toBe(
      "none",
    );
  });

  it("answers per symbol rather than per response", () => {
    const view = securitiesFixtureView("gaps");

    expect(storedHistoryFor(view, NO_BARS)).toBe("none");
    expect(storedHistoryFor(view, "NVDA")).toBe("some");
  });

  // A security we no longer follow is still in the universe response and still
  // in the ledger — `listSecurities` does not filter on `status`, which is
  // `UNIVERSE.md` §12.2's *showing rather than computing* side. So an untracked
  // security keeps the window sentence, which is correct: the bars we hold are
  // what was stored while we followed it, and they are still there.
  it("keeps the window answer for a security we no longer track", () => {
    expect(
      storedHistoryFor(
        securitiesFixtureView("untracked"),
        FIXTURE_SUBJECTS.untracked,
      ),
    ).toBe("some");
  });

  // **The degradation rule, and the reason the type has three members.** A
  // failed or in-flight universe must not produce a confident sentence about
  // the store — that is the defect this task removes, arriving from the other
  // side.
  it("claims nothing about the store while the universe is in flight", () => {
    expect(storedHistoryFor(LOADING_UNIVERSE, "NVDA")).toBe("unknown");
  });

  it.each(["unavailable", "notThisService", "nothingAnswered"] as const)(
    "claims nothing about the store when the universe answered %s",
    (name) => {
      expect(storedHistoryFor(securitiesFixtureView(name), "NVDA")).toBe(
        "unknown",
      );
    },
  );

  // Read rather than unread: a universe that answered correctly and holds
  // nothing holds no coverage either, and a migrated database nobody has loaded
  // answers every chart this way.
  it("reads an empty universe as nothing held", () => {
    expect(storedHistoryFor(securitiesFixtureView("empty"), "NVDA")).toBe(
      "none",
    );
  });

  // Unreachable through the address — the bars route answers 404 for a symbol
  // it has never heard of, so the panel is `refused` and no vacancy is drawn —
  // and written the cautious way because the cost of being wrong is asymmetric.
  it("claims nothing about a symbol the universe does not hold at all", () => {
    expect(
      storedHistoryFor(securitiesFixtureView("full"), "NOTASECURITY"),
    ).toBe("unknown");
  });

  // The shipped idiom rather than this function's opinion: `SecurityIdentity`
  // and `source-note.ts` both match the address's symbol exactly, and
  // `/securities/nvda` is a 404 from the server rather than a lowercase NVDA.
  it("matches the symbol exactly", () => {
    expect(storedHistoryFor(securitiesFixtureView("full"), "nvda")).toBe(
      "unknown",
    );
  });
});
