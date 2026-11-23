import { PERCENT_DISPLAY_DECIMALS } from "./live-change.js";
import { directionOf } from "./price-direction.js";

// **How this product spells a price, a percentage and a signed count** — moved
// here from `apps/frontend/src/market/price-format.ts` on 2026-11-23 (Task
// 7.3.1), function by function, with that file left as a re-export so no call
// site moved.
//
// ## Why they moved, and the test that decided it
//
// Story 7.3's `Finding.claim` is a sentence the BACKEND prints, carrying
// figures the security page already draws a few centimetres above the
// checklist: a five-minute move, a price, an excess in points. ADR 0029's
// one-fact-one-home rule is at its sharpest there — two spellings of one
// figure on one screen is the defect, and a second `toFixed(2)` in
// `apps/backend/src` is precisely how it arrives.
//
// The per-string test Story 7.3's own Gate 1 settled (B1) is *does the backend
// print this VERBATIM*. These three do: `−4.20%` in a claim is the same string
// `PriceChange` draws. A formatter whose grammar differs between the two
// surfaces — the breadth region's own multi-clause footer against this story's
// one-line claim — stays where it is, and the claim gets its own short grammar
// in `finding-claim.ts` built from the same counted figures.
//
// ## What the original file's own header argued, and why that argument expired
//
// It argued these belong in the market feature module rather than in a
// `shared/formatting` directory, because *"two decimals, a real minus sign and
// a direction decided on the rounded figure are facts about how this product
// renders a market, not component furniture"* — and that is still true. What
// changed is the premise under it: the file also said *"the backend has no
// surface"*, and since Story 7.3 it has one. `price-direction.ts` made exactly
// this move for exactly this reason on 2026-10-07 (Task 4.4.2), and its own
// note predicted the shape of the next one: *"both sides already hold the
// number" is the condition under which two implementations appear, not a
// reason against sharing one.*
//
// `PRICE_DECIMALS` and `MINUS` move with them, because a formatter and its
// precision are one fact and a minus sign nothing may type twice is the whole
// reason the second constant exists.

/**
 * How many decimal places a price is shown to.
 *
 * Two, which is what US equities quote in and what every reader expects. The
 * store holds `numeric(18, 6)` and the extra four places are real — they
 * matter to a sub-dollar security and to Epic 5's arithmetic — so this is a
 * *display* decision and the value it rounds is never fed back into anything.
 */
const PRICE_DECIMALS = 2;

/**
 * The minus sign, U+2212, and not a hyphen.
 *
 * A hyphen-minus is a different width from the digits around it in most faces,
 * so a column of negative figures does not align with the positive ones —
 * which undoes exactly what `tabular-nums` was bought for (Task 1.4.3 measured
 * a 14.3 px spread). The same measurement is why an axis of proportional
 * numerals jitters as the window moves.
 */
export const MINUS = "−";

/**
 * A price, as this product shows it.
 *
 * `toFixed` rather than `Intl.NumberFormat`, and that is a deliberate
 * restriction rather than an oversight: a locale-aware format would render
 * `1,234.56` for one reader and `1.234,56` for another, and a tabular column —
 * or a value axis — depends on every figure being the same shape on every
 * machine. It is also `no-restricted-syntax` territory in this package
 * specifically: `market-time.ts` is the one module in this workspace allowed
 * to construct an `Intl` formatter, because a formatter that reads the
 * environment is a value that differs between two machines rendering the same
 * data.
 *
 * There is no grouping separator for the same reason: `1234.56` and `1,234.56`
 * are different widths, and at four figures the separator buys nothing in a
 * right-aligned figure.
 */
export function formatPrice(price: number): string {
  return price.toFixed(PRICE_DECIMALS);
}

/**
 * A percentage, formatted with its sign — `+0.84%`, `−1.24%`, `0.00%`.
 *
 * The sign is one of the three channels carrying direction (the glyph and the
 * spoken word are the others), so it is part of the string rather than
 * something the colour implies. A move that rounds to zero gets **no sign at
 * all**: `+0.00%` claims a direction the rounding threw away, and `−0.00%` is
 * worse.
 *
 * **The sign is read off the one classifier, never off the raw sign** —
 * `percent > 0` here *is* a second classification of a move, which is the shape
 * `one-classifier-for-the-direction-of-a-move` exists to refuse.
 */
export function formatChangePercent(percent: number): string {
  const figure = `${Math.abs(percent).toFixed(PERCENT_DISPLAY_DECIMALS)}%`;

  const direction = directionOf(percent);
  if (direction === "positive") return `+${figure}`;
  if (direction === "negative") return `${MINUS}${figure}`;
  return figure;
}

/**
 * A signed **count**, formatted — `+132`, `−78`, `0`.
 *
 * The breadth region's headline is `advancing − declining`, which is the one
 * figure on that screen that is signed and is not a percentage. It is spelled
 * here rather than in that region for the two reasons this module exists: the
 * minus sign is {@link MINUS} and nothing outside this module may type one,
 * and the decision about whether a sign is claimed at all is `directionOf`'s.
 *
 * **No decimals and no grouping separator.** A count is an integer, and at
 * three digits a separator buys nothing in a right-aligned figure.
 *
 * A net of zero gets **no sign**, which is `+0.00%`'s rule at a second input: a
 * `+0` over a market where the advancers and the decliners are equal claims a
 * direction the subtraction did not find.
 */
export function formatSignedCount(count: number): string {
  const figure = String(Math.abs(count));
  const direction = directionOf(count);
  if (direction === "positive") return `+${figure}`;
  if (direction === "negative") return `${MINUS}${figure}`;
  return figure;
}

/**
 * **A signed figure in PERCENTAGE POINTS** — `+3.10 pts`, `−1.24 pts`,
 * `0.00 pts` — added 2026-11-23 (Task 7.3.1) beside the three that moved.
 *
 * A difference between two percentages is not a percentage, and this product
 * has said so in words since Story 5.1: a security down 4.2% against a sector
 * down 6.0% is *ahead while falling*, so the excess is drawn in points and
 * never tinted. What it had no spelling for was the **figure** — the drawn
 * region states it in a sentence built from two separate halves — and Story
 * 7.3's `RELATIVE_MOVE` claim needs one string.
 *
 * It takes {@link PERCENT_DISPLAY_DECIMALS}' precision rather than a second
 * constant, because the operands are percentages at that precision and a
 * difference printed finer than its inputs is a precision the inputs cannot
 * support. The sign is {@link directionOf}'s for {@link formatChangePercent}'s
 * reason, and a zero difference claims no direction.
 */
export function formatSignedPoints(points: number): string {
  const figure = `${Math.abs(points).toFixed(PERCENT_DISPLAY_DECIMALS)} pts`;
  const direction = directionOf(points);
  if (direction === "positive") return `+${figure}`;
  if (direction === "negative") return `${MINUS}${figure}`;
  return figure;
}

/**
 * **A count with its thousands separators** — `4,620`, `0`, `1,200`.
 *
 * `toLocaleString("en-US")` with the locale **named**, which is what every
 * shipped caller of it already does (`percentileSample`'s own `of 4,620
 * 5-minute returns`): the locale is pinned so two machines rendering the same
 * count render the same string, which is {@link formatPrice}'s own argument
 * arriving at the one figure where a separator does buy something. A sample
 * size runs to four digits and `4620` reads as a year.
 *
 * It is not `Intl.DateTimeFormat` and spells no timezone, so this package's
 * four scoped `no-restricted-syntax` rules are silent about it.
 */
export function formatCount(count: number): string {
  return count.toLocaleString("en-US");
}
