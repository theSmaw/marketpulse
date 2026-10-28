import type { AnomalyBand } from "@marketpulse/shared";

import { cx } from "../../cx.js";
import styles from "./AnomalyBadge.module.css";

// The anomaly band, as a chip with its own name written inside it.
//
// The name is the component. PRODUCT_SPEC.md §11 requires every score to carry
// its explanation, and an intensity ramp with no label reads as a mood: four
// amber steps are separated by 1.12, 1.43 and 1.59 in greyscale, which is
// enough to see a change and nowhere near enough to name one. So the band's
// name sits inside the fill, and the fill is the redundancy.
//
// The band names come from `@marketpulse/shared` because the backend computes
// and reports them — one vocabulary, not two. The colours do not, and never
// will: nothing about colour is domain knowledge, and the shared package is
// consumed by a Fastify server that renders nothing.
//
// The score-to-band boundaries are deliberately absent here as well as there.
// That is Epic 5's detection policy, and a threshold invented in a styling task
// would outlive the guess.
//
// ## There was a `compact` modifier for one afternoon, and its disposition is
// ## DELETION rather than an orphan
//
// Task 5.6.7 added one — `min-width: 0` and a stepped padding — so the chip
// could sit in a fifth track on `/`'s `Unusual activity` row, whose content
// box is 308 px. The owner removed that chip the same day: the top ten share
// one band (1 distinct band in the top ten, measured), so 76 px of a 308 px
// row repeated one word ten times and left the company name eight characters.
// `/` states the band **once**, in the region's head slot, as a word with no
// fill.
//
// The modifier went with it rather than being kept against a future use. A
// variant with no consumer is a second appearance to keep in step with the
// four fills and the three measured ink contrasts, and nothing would ever
// render it — this product has one orphaned seam already (`Popover`) and
// keeping a second would make that a habit rather than a decision. **The
// reversal condition, as a condition**: the first surface that needs this
// chip in a column narrower than its `6rem` reserve. What it must keep when
// it returns is in `RankedList.module.css`' `.unusual` header, which keeps
// the width table and the 18 px height the row's pitch rests on.

export interface AnomalyBadgeProps {
  readonly band: AnomalyBand;
}

const BAND_CLASS: Readonly<Record<AnomalyBand, string | undefined>> = {
  normal: styles.normal,
  elevated: styles.elevated,
  high: styles.high,
  extreme: styles.extreme,
};

export function AnomalyBadge({ band }: AnomalyBadgeProps) {
  return <span className={cx(styles.badge, BAND_CLASS[band])}>{band}</span>;
}
