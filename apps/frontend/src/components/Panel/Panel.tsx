import { useId, type ReactNode } from "react";

import { cx } from "../../cx.js";
import styles from "./Panel.module.css";

// The surface every piece of content in this application sits on, and the one
// component the refresh extracted from the most places at once: `Region`,
// `BarSeriesPanel`, `UniverseTable`'s states and three route modules were each
// drawing "white ground, one hairline, a heading, a body" in their own
// stylesheet.
//
// ## What a panel is, in this design language
//
// A raised ground, a hairline, a shadow that is barely there, and — when it has
// a header — a **near-black rule under the header**. That last one is the whole
// look. `tokens.css` reserves `--rule-strong` for structure, and the line under
// a panel's title is the most common piece of structure in the product: it is
// what makes a panel read as an instrument's readout rather than as a card.
// Substituting the ordinary hairline there looks like nothing in isolation and
// loses it.
//
// ## Why the heading level is a prop and not inferred
//
// A panel does not know how deep in the document it is, and getting this wrong
// is invisible on screen and loud in an outline: a page whose headings run
// h1 → h3 → h2 is a page a screen-reader user cannot navigate by structure.
// Nothing can infer the right level — React has no ancestor context for it —
// so it is stated, and the default is the common case rather than the safe one:
// `2`, because a panel is normally a direct child of a route that owns the
// `h1`.
//
// The union is `2 | 3` rather than `1 | ... | 6` on purpose. There is no
// legitimate panel at `h1` — that is the page's own title — and a panel four
// levels deep is a signal that the page needs restructuring rather than a
// deeper heading.
//
// ## What it deliberately does not do
//
// **It does not contain an `ErrorBoundary`.** `Region` does, because a region
// is a *place on a screen* whose failure must be contained locally
// (PRODUCT_SPEC.md §36). A panel is a surface, and a surface that silently
// swallowed the failure of anything placed on it would make every future
// boundary decision invisible — the boundary would be wherever somebody
// happened to reach for a white background.
//
// **It has no `tone` or `variant`.** The one variation that turns out to be
// real is whether the body has padding, because a table goes edge to edge and
// prose does not. Everything else — a "warning panel", a "muted panel" — would
// be colour deciding meaning, which is `market.css`'s job and not a container's.

export interface PanelProps {
  /**
   * The panel's name. Optional: a panel with no header is a plain surface, and
   * that is a real case — the toolbar strip above a table has nothing to be
   * called.
   */
  readonly title?: ReactNode;

  /**
   * The uppercase micro-label above the title — *what kind of thing this is*,
   * so the title can be the thing's own name. "Region", "Market data",
   * "Placeholder".
   */
  readonly eyebrow?: string;

  /**
   * The right-hand end of the header: a count, a provenance line, a control.
   * Anything that qualifies the panel rather than being its content.
   */
  readonly meta?: ReactNode;

  /** See the header comment. `2` unless the panel is nested inside a section
      that already owns an `h2`. */
  readonly headingLevel?: 2 | 3;

  /**
   * Remove the body's padding, for content that must reach the panel's edges —
   * a table, a chart, a skeleton standing in for either.
   */
  readonly flush?: boolean;

  /**
   * Let the body scroll rather than growing the panel, and make it focusable so
   * that a keyboard user can reach the scroll. **Both halves or neither**: a
   * scrollable region that cannot be focused is content a keyboard user cannot
   * read, which is a real WCAG failure and one that is invisible to everyone
   * who tests with a mouse.
   */
  readonly scrollable?: boolean;

  readonly children: ReactNode;
}

export function Panel({
  title,
  eyebrow,
  meta,
  headingLevel = 2,
  flush = false,
  scrollable = false,
  children,
}: PanelProps) {
  // `useId` rather than a slug of the title: two panels called "Market data" on
  // one page would otherwise share an id, and the second `aria-labelledby`
  // would resolve to the first one's heading. Note the value is deliberately
  // never asserted on in a test — it is React's, and it changes.
  const headingId = useId();
  const Heading = headingLevel === 3 ? "h3" : "h2";
  const labelled = title === undefined ? undefined : headingId;

  return (
    <section
      className={cx(styles.panel, scrollable ? styles.scrollable : undefined)}
      aria-labelledby={labelled}
      tabIndex={scrollable ? 0 : undefined}
    >
      {title === undefined ? undefined : (
        <div className={styles.header}>
          <div className={styles.headings}>
            {eyebrow === undefined ? undefined : (
              <p className={styles.eyebrow}>{eyebrow}</p>
            )}
            <Heading className={styles.title} id={headingId}>
              {title}
            </Heading>
          </div>
          {meta === undefined ? undefined : (
            <div className={styles.meta}>{meta}</div>
          )}
        </div>
      )}
      <div className={cx(styles.body, flush ? styles.flush : undefined)}>
        {children}
      </div>
    </section>
  );
}
