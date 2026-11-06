import { describe, expect, it } from "vitest";

import { toTicker } from "@marketpulse/shared";

import { selectStrongestCorrelations } from "./return-correlation-selection.js";
import type { CorrelationCandidate } from "./return-correlation-selection.js";

/**
 * **The strongest-N selection, on the producer** (Task 6.5.1, Story 6.5's AC
 * 8).
 *
 * This is the only level at which these claims can be made. The wire carries
 * the rows a pass **kept**, so a producer that reconstructed a row instead of
 * selecting it, that lost one node's edges entirely, or that answered `0` for
 * a tie and let the enumeration order decide, is **byte-identical downstream**
 * — `docs/GAPS.md`'s own lesson, *the wire cannot see a defect in the
 * producer*, and Task 4.8.11's in as many words.
 *
 * Four of the five assertions below would be green on a defect:
 *
 *   1. **The whole array against a hand-written literal**, never `length === N`
 *      and never `toContain` — a selection that kept the wrong four pairs has
 *      the right length.
 *   2. **Object identity against the input candidates**, which is the half
 *      `toEqual` cannot see: a producer that rebuilt each row from its fields
 *      passes every structural assertion and is a place a figure can quietly
 *      change.
 *   3. **Union recoverability**, stated as its own property over an
 *      ASYMMETRIC case — a pair in one endpoint's top-N and not the other's,
 *      which is the whole reason the union was chosen and the thing an
 *      intersection would drop.
 *   4. **The declared tiebreak, on an engineered exact tie**, constructed so
 *      the tiebreak decides which pair is in the output at all. Both wrong
 *      answers — the reverse order, and a comparator returning `0` — change
 *      the array.
 *   5. **Input immutability and order-independence**: the input is deep-frozen
 *      and the same candidates in a different sequence produce the identical
 *      output.
 */

const candidate = (
  low: string,
  high: string,
  r: number,
  n = 4_620,
): CorrelationCandidate =>
  Object.freeze({ low: toTicker(low), high: toTicker(high), r, n });

/** `(low, high, r)`, for reading a whole array in one assertion. */
const described = (
  selected: readonly CorrelationCandidate[],
): readonly string[] =>
  selected.map((one) => `${one.low}-${one.high} ${String(one.r)}`);

/**
 * **Four nodes, six pairs — every pair that exists over four securities.**
 *
 * `AAA` is the hub (0.9, 0.8, −0.7 to the other three) and the three remaining
 * pairs are weak (0.2, 0.1, 0.05). At `n = 2` that produces exactly the
 * asymmetry the union exists for: `BBB-DDD` is `DDD`'s second-strongest and is
 * only `BBB`'s third.
 */
const SIX = Object.freeze([
  candidate("AAA", "BBB", 0.9),
  candidate("AAA", "CCC", 0.8),
  // **Negative, and it ranks above every weak positive.** The ranking is on
  // the magnitude: an anti-correlation is a real relationship.
  candidate("AAA", "DDD", -0.7),
  candidate("BBB", "CCC", 0.2),
  candidate("BBB", "DDD", 0.1),
  candidate("CCC", "DDD", 0.05),
]);

describe("selectStrongestCorrelations — the whole retained array", () => {
  it("is the union of each node's own top 2, in canonical order", () => {
    // Worked by hand over SIX, at n = 2:
    //   AAA: 0.9 AAA-BBB, 0.8 AAA-CCC   (−0.7 AAA-DDD is third)
    //   BBB: 0.9 AAA-BBB, 0.2 BBB-CCC   (0.1 BBB-DDD is third)
    //   CCC: 0.8 AAA-CCC, 0.2 BBB-CCC   (0.05 CCC-DDD is third)
    //   DDD: 0.7 AAA-DDD, 0.1 BBB-DDD   (0.05 CCC-DDD is third)
    // Union = five of the six. `CCC-DDD` is in nobody's top 2 and is the one
    // pair with no row.
    expect(described(selectStrongestCorrelations(SIX, 2))).toEqual([
      "AAA-BBB 0.9",
      "AAA-CCC 0.8",
      "AAA-DDD -0.7",
      "BBB-CCC 0.2",
      "BBB-DDD 0.1",
    ]);
  });

  it("keeps everything at an N no node can fill", () => {
    // Three candidates per node, so `n = 3` retains all six — and the output
    // is still canonically ordered rather than in arrival order.
    expect(described(selectStrongestCorrelations(SIX, 3))).toEqual([
      "AAA-BBB 0.9",
      "AAA-CCC 0.8",
      "AAA-DDD -0.7",
      "BBB-CCC 0.2",
      "BBB-DDD 0.1",
      "CCC-DDD 0.05",
    ]);
  });

  it("keeps each node's single strongest at N = 1", () => {
    //   AAA: 0.9 AAA-BBB   BBB: 0.9 AAA-BBB
    //   CCC: 0.8 AAA-CCC   DDD: 0.7 AAA-DDD
    // Three rows for four nodes, because `AAA-BBB` is two nodes' answer.
    expect(described(selectStrongestCorrelations(SIX, 1))).toEqual([
      "AAA-BBB 0.9",
      "AAA-CCC 0.8",
      "AAA-DDD -0.7",
    ]);
  });

  it("answers nothing at all for no candidates, which is CI's state", () => {
    expect(selectStrongestCorrelations([], 5)).toEqual([]);
  });
});

describe("selectStrongestCorrelations — it SELECTS rather than reconstructs", () => {
  it("returns the same object references it was given", () => {
    const selected = selectStrongestCorrelations(SIX, 2);

    // Reference equality, pair by pair against the input. A producer that
    // rebuilt each row from its fields satisfies every `toEqual` above and is
    // a place a coefficient can quietly change on the way through.
    for (const one of selected) {
      expect(
        SIX.some((input) => input === one),
        `${one.low}-${one.high} is not one of the input objects`,
      ).toBe(true);
    }

    expect(selected[0]).toBe(SIX[0]);
    expect(selected[1]).toBe(SIX[1]);
    expect(selected[2]).toBe(SIX[2]);
    expect(selected[3]).toBe(SIX[3]);
    expect(selected[4]).toBe(SIX[4]);
  });

  it("holds each retained candidate exactly once", () => {
    const selected = selectStrongestCorrelations(SIX, 2);

    // Every candidate is considered from BOTH its endpoints, so the dedup is
    // load-bearing rather than incidental: `AAA-BBB` is `AAA`'s first answer
    // and `BBB`'s first answer.
    expect(new Set(selected).size).toBe(selected.length);
  });
});

describe("selectStrongestCorrelations — a node's own top-N is recoverable", () => {
  /** The migration's own recovery read: touching rows, by `|r|`, truncated. */
  const recover = (
    retained: readonly CorrelationCandidate[],
    node: string,
    n: number,
  ): readonly string[] =>
    retained
      .filter((one) => one.low === node || one.high === node)
      .toSorted((left, right) => Math.abs(right.r) - Math.abs(left.r))
      .slice(0, n)
      .map((one) => `${one.low}-${one.high}`);

  it("recovers an ASYMMETRIC node's exact top 2 from the stored union", () => {
    const retained = selectStrongestCorrelations(SIX, 2);

    // **The asymmetry, named**: `BBB-DDD` is `DDD`'s second-strongest and only
    // `BBB`'s third. So it is in the union because `DDD` wants it, and an
    // INTERSECTION — mutual top-N only — would have dropped it, leaving `DDD`
    // with one edge where it has two.
    expect(described(retained)).toContain("BBB-DDD 0.1");
    expect(recover(retained, "DDD", 2)).toEqual(["AAA-DDD", "BBB-DDD"]);

    // And the node that does not want it recovers its own two unchanged —
    // the extra row in the union does not corrupt `BBB`'s own ranking,
    // because the recovery read truncates.
    expect(recover(retained, "BBB", 2)).toEqual(["AAA-BBB", "BBB-CCC"]);
  });

  it("recovers every node's top N, for every N, with no redundant row", () => {
    // The property the union's correctness rests on: every member of a node's
    // own top-N is in the union by the definition of a union. Asserted over
    // all four nodes and both interesting values of N rather than once.
    for (const n of [1, 2, 3]) {
      const retained = selectStrongestCorrelations(SIX, n);

      for (const node of ["AAA", "BBB", "CCC", "DDD"]) {
        const fromTheUnion = recover(retained, node, n);
        const fromEverything = recover(SIX, node, n);

        expect(fromTheUnion, `${node} at N = ${String(n)}`).toEqual(
          fromEverything,
        );
      }
    }
  });
});

describe("selectStrongestCorrelations — the DECLARED tiebreak", () => {
  /**
   * **An engineered exact tie, constructed so the tiebreak decides the
   * OUTPUT.**
   *
   * `AAA` is tied between `BBB` and `CCC` at `|r| = 0.5`, and both of those
   * have a stronger edge elsewhere (0.9 to `DDD`), so neither rescues the
   * loser: whichever side of the tie `AAA` drops has **no row at all**.
   * `DDD` is tied the same way between `BBB` and `CCC` at 0.9.
   */
  const TIED = Object.freeze([
    candidate("AAA", "BBB", 0.5),
    // The same magnitude, opposite sign — so a comparator that ranked the
    // SIGNED coefficient rather than the magnitude would also change the
    // answer here.
    candidate("AAA", "CCC", -0.5),
    candidate("AAA", "DDD", 0.01),
    candidate("BBB", "CCC", 0.01),
    candidate("BBB", "DDD", 0.9),
    candidate("CCC", "DDD", 0.9),
  ]);

  it("breaks a tie on the OTHER endpoint's ticker, ascending", () => {
    // Worked by hand at n = 1:
    //   AAA: |0.5| AAA-BBB vs |0.5| AAA-CCC — tied, so `BBB` < `CCC` wins
    //   BBB: 0.9 BBB-DDD        CCC: 0.9 CCC-DDD
    //   DDD: 0.9 BBB-DDD vs 0.9 CCC-DDD — tied, so `BBB` < `CCC` wins
    //
    // `AAA-CCC` is excluded **purely** by the tiebreak. The reverse direction
    // would put it in and drop `AAA-BBB`; a comparator answering `0` would
    // hand the answer to the array's arrival order.
    expect(described(selectStrongestCorrelations(TIED, 1))).toEqual([
      "AAA-BBB 0.5",
      "BBB-DDD 0.9",
      "CCC-DDD 0.9",
    ]);
  });

  it("gives the identical answer whatever order the candidates arrive in", () => {
    // Four orderings of one set, including reversed. A comparator that
    // answered `0` for the two ties above passes the literal assertion in one
    // of these and fails in another — which is why determinism is a test
    // rather than a comment.
    const reversed = [...TIED].reverse();
    const rotated = [...TIED.slice(3), ...TIED.slice(0, 3)];
    const shuffled = [TIED[2], TIED[5], TIED[0], TIED[4], TIED[1], TIED[3]];

    const expected = described(selectStrongestCorrelations(TIED, 1));

    for (const order of [reversed, rotated, shuffled]) {
      expect(
        described(
          selectStrongestCorrelations(
            order.filter(
              (one): one is CorrelationCandidate => one !== undefined,
            ),
            1,
          ),
        ),
      ).toEqual(expected);
    }
  });
});

describe("selectStrongestCorrelations — it does not touch its input", () => {
  it("leaves the caller's array in the order and the state it arrived in", () => {
    // The array itself is frozen, so an in-place `.sort` throws under the
    // module's own strict mode rather than passing quietly.
    const input = Object.freeze([...SIX]);
    const before = described(input);

    selectStrongestCorrelations(input, 2);

    expect(described(input)).toEqual(before);
    expect(input).toHaveLength(6);
  });

  it("works on an array that is NOT frozen without reordering it", () => {
    // The frozen case proves a throw would be caught; this one proves the
    // absence of a mutation, which is the claim that matters for a producer
    // whose caller reads the candidate list afterwards to tally it.
    const input = [...SIX];
    const before = described(input);

    selectStrongestCorrelations(input, 1);

    expect(described(input)).toEqual(before);
  });
});
