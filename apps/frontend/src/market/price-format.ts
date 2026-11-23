// How this product spells a price and the direction of a move (Task 2.12.3).
//
// **This file exists because a trigger fired rather than because a tidy-up was
// due.** `UniverseTable/last-close.ts` and `BarSeriesPanel/series-facts.ts` each
// carried their own copy of these values, and the note at the bottom of
// `series-facts.ts` named the condition for extracting them: *the third consumer
// that formats a price or a percentage*. Task 2.12.3's value axis is the third —
// every gridline on the price chart is a price, formatted — and the task's own
// brief says it in one line: **do not write a second spelling of a price.**
//
// It lands in `src/market/` and not in a `shared/formatting` directory because
// that is what the note said it would, and the reason is the subject rather than
// the shape: two decimals, a real minus sign and a direction decided on the
// rounded figure are facts about *how this product renders a market*, not
// component furniture. `PRODUCT_SPEC.md` §26 puts market vocabulary in the
// market module.
//
// ## What moved, and the one thing that did not
//
// The note named six values. **Five moved.** `changePercent` stayed where it
// was, in both homes, and that is a decision rather than an oversight: the two
// are not one function. One computes a move between two *sessions'* closes
// from a `SecurityLastClose`; `series-facts.ts` computes a move across the
// *bars of one window* from a `SeriesPrices`. (**Amended 2026-09-26**: the
// first of those left `UniverseTable/last-close.ts` for
// `packages/shared/src/live-change.ts` with `changeFromClose`, when Story
// 4.2's backend join became its third consumer — Task 4.2.3. The judgement
// below is untouched: they are still two functions over two subjects, and
// they are now in two packages.) They share an arithmetic
// shape — `(a − b) / b` — and share no subject, and a single function over both
// would need a parameter type that is the union of two unrelated records. The
// duplication that was worth removing is the one where two files would have
// rendered the same number two ways; that risk is in the *formatting*, which is
// here, and not in a subtraction whose operands are already on screen.
//
// `PriceDirection` moved with them, out of `PriceChange.tsx`. That component's
// own header argues the three directions are "arithmetic on a number both sides
// already have" rather than backend vocabulary — which is an argument for the
// market module, and `directionOf` returning a type owned by a component was
// the coupling pointing the wrong way. `PriceChange` now imports it.
//
// ## Amended 2026-10-07 (Task 4.4.2): the direction left this module
//
// `PRICE_DIRECTIONS`, `PriceDirection` and `directionOf` are now
// `packages/shared/src/price-direction.ts`', and the paragraph above is left
// standing because the argument it makes is the one that **expired**. "Both
// sides already hold the number" is the condition under which two
// implementations appear, not a reason against sharing one: Story 4.4 counts
// breadth over 518 figures **server-side**, which made the bucket rule
// unreachable from the process that needs it. The third consumer is a
// different process — exactly what `changeFromClose`'s own note predicted.
//
// They are re-exported from here, so every component's import is unchanged and
// `market/index.ts` still publishes them. What stays behind is the **spelling**
// — `formatPrice` and `formatChangePercent` — because the backend has no
// surface, and `PRICE_DECIMALS`, which is a price's precision and not a
// percentage's.

// **A re-export rather than a second declaration**, which is what keeps the
// frontend's public surface identical across the move. `pnpm invariants`'
// `one-classifier-for-the-direction-of-a-move` is what holds the other half:
// a re-export is not a second classifier, and a comparison would be.
export { PRICE_DIRECTIONS, directionOf } from "@marketpulse/shared";
export type { PriceDirection } from "@marketpulse/shared";

// ## Amended 2026-11-23 (Task 7.3.1): the SPELLINGS left this module too
//
// `formatPrice`, `formatChangePercent` and `formatSignedCount` — with
// `PRICE_DECIMALS` and `MINUS` beside them — are now
// `packages/shared/src/price-format.ts`', and this is the same move
// `directionOf` made above arriving at the functions that call it. The reason
// is the premise the paragraphs above rest on rather than their argument:
// *"the backend has no surface"* was true until Story 7.3, which makes the
// backend print a `Finding.claim` carrying a five-minute move, a price and an
// excess in points — the same figures the security page draws a few
// centimetres higher. A second `toFixed(2)` in `apps/backend/src` is exactly
// how ADR 0029's one-fact-one-home rule breaks, and `price-direction.ts`'s own
// note predicted the shape: *"both sides already hold the number" is the
// condition under which two implementations appear, not a reason against
// sharing one.*
//
// What this file still is: **this module's public spelling of a market
// figure**, re-exported so every component's import and `market/index.ts`'s
// own barrel are unchanged. The per-string test Story 7.3's Gate 1 settled is
// *does the backend print it verbatim*, and these do.
export {
  MINUS,
  formatChangePercent,
  formatCount,
  formatPrice,
  formatSignedCount,
  formatSignedPoints,
} from "@marketpulse/shared";
