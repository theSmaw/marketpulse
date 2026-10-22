import type { WireOverviewFigure } from "./market-stream-protocol.js";

/**
 * **What a move was measured FROM, and whether two of them may be subtracted —
 * one implementation, two processes** (Task 5.6.2).
 *
 * ## Why this moved out of the browser
 *
 * Both functions below shipped in `apps/frontend/src/market/` — `basisOf` in
 * `sector-performance.ts` since Task 4.5.5, `sharedBasis` in
 * `relative-performance.ts` since Story 5.1 — and both were correct there for
 * a **drawn** figure. A **scored** factor cannot read them there: invariant 1,
 * and ADR 0038's rejected alternative *"compute the aggregate in the browser"*
 * was refused on the recorded grounds that *"Epic 5's scores cannot live in a
 * browser."*
 *
 * ADR 0038 decision 2 is the precedent for the move and for its shape:
 * `changeFromClose` went to `packages/shared` as **one implementation, two
 * processes**, and the browser kept calling it. That is exactly what happened
 * here — the two call sites in `src/market/` are unchanged, re-exported from
 * the files that used to declare them, so `relativePerformance`'s drawn output
 * is byte-identical and the backend's scorer cannot disagree with it.
 *
 * ## A module of its own rather than a fourth member of `sector-ranking.ts`
 *
 * That file carries `moveRankingKey`, `compareByMove`, `selectMovers` and
 * `selectMoversBy`, and its own header says the **file name is the residue** of
 * a rename, with a reversal trigger: *the first consumer of the move half that
 * is in neither the sector region nor the movers region.* The backend's
 * excess-move factor is that consumer, so adding a fifth member to the file
 * whose trigger this fires would have been the wrong direction. The basis rule
 * gets a home named for what it is instead, and the trigger is left standing
 * for the move half proper. (Noted 2026-10-21: `fitSectorLadder` in
 * `sector-ladder.ts` arguably fired it already and nobody recorded it.)
 */

/**
 * **The identity of what a move was measured from** — a string, deliberately,
 * with a kind in it.
 *
 * Two states carry a move and they are **different bases**:
 *
 * - `observed:<the named close, or empty>` — live against a close, what a
 *   market screen means by *today*. `changeBasis` is **omitted** on the
 *   same-session case, which is a real value rather than a gap
 *   (`LiveChange.basis`), so the empty string stands for *the previous close,
 *   unnamed* and is still a basis this figure shares with every other figure
 *   measuring from it.
 * - `stored:<session>` — the close-to-close move of a session that is over.
 *
 * **It is derived from the same two members `moveRankingKey` reads**, which is
 * what makes it unable to disagree with the figure: the state decides which
 * field carries the move, and the session decides what the move is measured
 * from. A third thing to keep in step would be a third thing to get wrong.
 */
export function basisOf(figure: WireOverviewFigure): string | undefined {
  if (figure.state === "observed") {
    return `observed:${figure.changeBasis ?? ""}`;
  }
  return figure.state === "stored" ? `stored:${figure.session}` : undefined;
}

/**
 * **Whether two moves may be subtracted.**
 *
 * Two moves are comparable iff they are the **same kind of move measured from
 * the same close**, which {@link basisOf} already encodes as one identity
 * string. So there are exactly four outcomes and three of them are refusals:
 *
 *   - both `observed` and the basis agrees — comparable;
 *   - both `observed` and the basis disagrees — refused, two different closes;
 *   - both `stored` and the session agrees — comparable; disagrees — refused;
 *   - **one of each — refused.** The prefix is what carries this, and it is why
 *     the identity is a string with a kind in it rather than a bare date.
 *
 * `undefined` on either side is a figure with no move at all, which is refused
 * for a different reason and is not a basis disagreement — hence the explicit
 * guard rather than `a === b`, which would read two keyless figures as a
 * comparable pair.
 *
 * **It is reachable every day between the overnight backfill and the next
 * bell**, so it is an ordinary state rather than an edge: a scored factor that
 * silently scored a mixed-basis difference would produce a well-formed,
 * correctly-coloured number that is wrong in exactly the way the region above
 * it declined to be.
 */
export function sharedBasis(
  left: string | undefined,
  right: string | undefined,
): boolean {
  if (left === undefined || right === undefined) return false;
  return left === right;
}
