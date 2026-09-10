import type { ReactNode } from "react";

import { cx } from "../../cx.js";
import styles from "./Badge.module.css";

// A short, square chip carrying a count or a classification — "24 securities",
// "PROXY", "1m bars". The smallest of the refresh's building blocks and the one
// most at risk of becoming a dumping ground, so its scope is written down
// rather than implied.
//
// ## What a badge is for, and what it is not
//
// It is for a **fact about the thing beside it**: how many, what kind, which
// timeframe. It is not for a *state* — not "live", not "degraded", not
// "extreme". Those have components already (`FeedIndicator`,
// `BackendIndicator`, `AnomalyBadge`), each pairing its colour with a marker
// shape or a written band name, because `market.css`'s rule is that colour is
// never the sole encoding. A generic coloured badge is exactly the shape that
// erodes that rule: it makes "just tint it amber" a one-line change.
//
// So the tones here are achromatic, both of them, and there is no `tone="warn"`
// to reach for. A badge that needs to carry market meaning is a component in
// `market.css`'s vocabulary, not a prop on this one.
//
// ## The two tones
//
//   - `neutral` — a sunken ground with secondary ink. The default, and the one
//     that belongs inside dense content.
//   - `selected` — the near-black inversion. It marks the **one** chosen member
//     of a set, which is the reference design's active-filter idiom. Two
//     selected badges in one group means the group has no selection.

export const BADGE_TONES = ["neutral", "selected"] as const;

export type BadgeTone = (typeof BADGE_TONES)[number];

export interface BadgeProps {
  readonly children: ReactNode;
  /** Defaults to `neutral`. See the header for when `selected` is correct. */
  readonly tone?: BadgeTone;
}

const TONE_CLASS: Readonly<Record<BadgeTone, string | undefined>> = {
  neutral: styles.neutral,
  selected: styles.selected,
};

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  return <span className={cx(styles.badge, TONE_CLASS[tone])}>{children}</span>;
}
