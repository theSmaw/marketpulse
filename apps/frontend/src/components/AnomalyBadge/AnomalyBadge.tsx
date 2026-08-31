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

export interface AnomalyBadgeProps {
  readonly band: AnomalyBand;
}

const BAND_CLASS: Readonly<Record<AnomalyBand, string | undefined>> = {
  normal: styles.normal,
  elevated: styles.elevated,
  unusual: styles.unusual,
  extreme: styles.extreme,
};

export function AnomalyBadge({ band }: AnomalyBadgeProps) {
  return <span className={cx(styles.badge, BAND_CLASS[band])}>{band}</span>;
}
