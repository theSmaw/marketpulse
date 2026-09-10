import type { ReactNode } from "react";

import styles from "./PageHeader.module.css";

// The top of a screen: what this page is, one sentence about it, and the
// figures that qualify it.
//
// ## Why this is a component rather than three elements per route
//
// Before the refresh, five route modules each rendered their own `<h1>` with
// their own margin, and two of them had a micro-label above it with a different
// gap. That is the shape of a design that has a *look* but no *language*: every
// screen is nearly the same and no two are exactly, and the drift is invisible
// because nobody sees two routes at once.
//
// It also puts the product's single most important accessibility rule in one
// place. **Every route renders exactly one `h1`, and it is this one.** The
// application chrome's product name is deliberately a `<p>` for the same reason
// (see `AppHeader`): two `h1`s on a page leave a screen-reader user with no
// single answer to "what is this page?", and a header that promoted itself
// would reintroduce that on every route at once.
//
// ## Why it renders a `<div>` and not a `<header>`
//
// A `<header>` is the semantically obvious element and it is the wrong one
// here, for a reason that was measured rather than reasoned about: HTML maps
// `<header>` to the **banner** landmark unless it is scoped inside `article`,
// `aside`, `main`, `nav` or `section`, and this one *is* inside `<main>` — but
// the accessibility mapping used by the component tests does not implement that
// scoping. `App.test.tsx` asks for `getByRole("banner")` to find the chrome and
// got two, on every route at once.
//
// The disagreement is the point: a real browser and axe scope it correctly, so
// this would have been an application that passes its browser suite and fails
// its component tests, with neither result wrong. A `<div>` has no landmark to
// argue about, the `<h1>` inside it does all the structural work a screen
// reader actually navigates by, and the one thing lost — a redundant banner
// nobody was using — was never worth two mappings' worth of ambiguity.
//
// ## The description is prose, and it is set at the reading size
//
// `type.module.css`'s `.prose` — 15px rather than the product's 13px default.
// A page's opening sentence is read, not scanned, and setting it at a table's
// size is how an interface ends up feeling like a spreadsheet with captions.

export interface PageHeaderProps {
  /**
   * The uppercase micro-label above the title — *what kind of screen this is*.
   * Optional, and it should stay rare: on a screen whose title already says
   * what it is, an eyebrow is decoration.
   */
  readonly eyebrow?: string;

  /** The page's name, and the route's only `h1`. */
  readonly title: string;

  /** One sentence. If it needs two, the second belongs on the thing it is
      about rather than at the top of the screen. */
  readonly description?: ReactNode;

  /** A `MetricStrip`, normally. Rendered under the description, full width. */
  readonly metrics?: ReactNode;

  /** The screen's controls, if it has any, on the title's line. */
  readonly actions?: ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  metrics,
  actions,
}: PageHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.top}>
        <div className={styles.headings}>
          {eyebrow === undefined ? undefined : (
            <p className={styles.eyebrow}>{eyebrow}</p>
          )}
          <h1 className={styles.title}>{title}</h1>
          {description === undefined ? undefined : (
            <p className={styles.description}>{description}</p>
          )}
        </div>
        {actions === undefined ? undefined : (
          <div className={styles.actions}>{actions}</div>
        )}
      </div>
      {metrics === undefined ? undefined : (
        <div className={styles.metrics}>{metrics}</div>
      )}
    </div>
  );
}
