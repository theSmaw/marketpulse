import type { Confidence } from "@marketpulse/shared";

import { cx } from "../../cx.js";
import a11y from "../../styles/a11y.module.css";
import styles from "./ConfidenceMark.module.css";

// How well evidenced a claim is — four levels carried by a 12px leading rule's
// STROKE STYLE, with the level's own word beside it (Task 7.3.2).
//
// ## It is not a chip, and that is the whole decision
//
// Designer and ux-architect converged independently on *no filled chip* at
// Story 7.3's Gate 1. `AnomalyBadge` is a filled, centred lozenge spending this
// product's amber ramp behind a written band name; from Epic 8 onward the two
// sit on one screen — `EPIC.md`'s own hand-off says they must never share a
// component and confidence must never be rendered as four amber fills, because
// the ramp is anomaly INTENSITY and a band says *how unusual* while confidence
// says *how well evidenced*. On this page they are already about 12px apart.
//
// So: no background, no border box, no `min-width`, no shared code with
// `AnomalyBadge` or `Badge`, and **zero colour tokens spent**. Two
// `pnpm invariants` entries hold that rather than this comment —
// `confidence-and-band-never-share-a-component` and
// `the-confidence-mark-spends-no-fill-and-no-colour` — because a claim about a
// mechanism reads identically whether the mechanism is there or not.
//
// ## Why a stroke style rather than a weight ramp alone
//
// It reuses vocabulary this product already has rather than inventing a fifth
// meaning for a shape: **dashed means we do not know** at the chart's coverage
// edge and on this very checklist's own queued glyph (`Marker shape="dashed"`),
// and dotted is one further step along the same axis. The four levels are
// therefore told apart by STROKE and by the WORD — two encodings, neither of
// them hue, which is the standing rule that colour is never the sole encoding
// of anything (the price palette differs by 1.04:1 in greyscale).
//
//   CONFIRMED   ——  solid, 2px
//   SUPPORTED   ——  solid, 1px
//   POSSIBLE    - -  dashed, 1px
//   UNKNOWN     · ·  dotted, 1px
//
// `CONFIRMED` has **no producer anywhere in this epic** — reserved for a
// finding corroborated against a primary source, which is Epic 9's filings.
// It is drawn here anyway, exactly as `CONFIDENCE_LEVELS` declares all four,
// so the epic that produces one adds no treatment.
//
// ## The accessible string is the LONG form, and the word has one home
//
// A listener meets the band chip and this mark as one stream with no spatial
// separation at all, so a bare `SUPPORTED` is ambiguous between *how unusual*
// and *how well evidenced*. The spoken string is `Confidence: SUPPORTED`.
//
// Note what is NOT duplicated: only the **prefix** is visually hidden. The
// level's word is drawn once and read once from the same text node, which is
// ADR 0029's one-fact-one-home rule — a drawn sentence and its spoken twin are
// one string with two renderings, never two copies that can drift.
//
// ## Zero focusable elements and zero handlers (AC 7)
//
// Three `<span>`s, no `tabIndex`, no `role`, no `onClick`/`onKeyDown`. The
// evidence panel and the click-to-focus interaction are Epic 8's by citation,
// and the easiest way to ship them early by accident is one handler here —
// asserted in this component's own test and in the checklist's.

export interface ConfidenceMarkProps {
  readonly confidence: Confidence;
}

/** What a listener hears before the level's own word. Carries its own
 * trailing separation through the explicit `{" "}` below rather than a
 * `gap`, which a screen reader cannot see. */
export const CONFIDENCE_PREFIX = "Confidence:";

const STROKE_CLASS: Readonly<Record<Confidence, string | undefined>> = {
  CONFIRMED: styles.confirmed,
  SUPPORTED: styles.supported,
  POSSIBLE: styles.possible,
  UNKNOWN: styles.unknown,
};

export function ConfidenceMark({ confidence }: ConfidenceMarkProps) {
  return (
    <span className={cx(styles.mark)}>
      {/* The rule carries no text, so it is hidden from the accessible tree
          entirely — the word beside it is the fact, and the stroke is the
          redundancy behind it. */}
      <span
        aria-hidden="true"
        className={cx(styles.rule, STROKE_CLASS[confidence])}
      />
      <span className={cx(a11y.visuallyHidden)}>{CONFIDENCE_PREFIX}</span>
      {/*
       * **A space, for the listener who gets no margin** — `AbnormalMove`'s own
       * idiom, in the two places it already ships (`ScoreBand`'s figure and the
       * percentile cell). `textContent` runs two sibling spans together and the
       * gap on screen is a `gap` a screen reader cannot see.
       */}{" "}
      <span className={cx(styles.word)}>{confidence}</span>
    </span>
  );
}
