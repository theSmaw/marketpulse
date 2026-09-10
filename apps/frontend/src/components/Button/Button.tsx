import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cx } from "../../cx.js";
import { Icon, type IconName } from "../Icon/Icon.js";
import a11y from "../../styles/a11y.module.css";
import styles from "./Button.module.css";

// The first real control in this design language, and the reason it arrived
// three stories late is worth keeping: until the 2026 refresh there were two
// buttons in the whole application — `UniverseTable`'s retry and
// `BarSeriesPanel`'s — and each was "a real `<button>` styled down to this
// language" in its own stylesheet. Two copies is a coincidence; the refresh
// made it four, which is a component.
//
// ## Three variants, and the third is the interesting one
//
//   - `primary` is *the* action on a screen. It is the one place in the
//     interface where `--brand-fill` becomes a surface, and a screen with two
//     of them has no primary action.
//   - `secondary` is every ordinary action: a hairline box on the raised
//     ground. This is the default, and the one to reach for.
//   - `quiet` has no border and no ground until it is hovered. It exists for
//     controls that live *inside* dense content — a retry beside a failed row,
//     an expander on a group header — where a bordered box on every row turns a
//     table into a form.
//
// There is deliberately **no `danger` variant**. A destructive action would
// want red, red means price-down on every screen in this product, and this is
// V1 of a read-only analytical tool — there is nothing to destroy. Adding one
// now would be inventing a colour rule against a case that does not exist.
//
// ## What it does not do
//
// **It is not a link.** `react-router`'s `Link` renders an `<a>`, and an `<a>`
// styled as a button is a keyboard trap in miniature — space does not activate
// it, and a screen reader announces the wrong role. Where the refresh wanted a
// link that *looks* like a control (the "Explore" affordance on a security
// row), the link carries `Button`'s classes through `linkClassName` rather than
// this component rendering an anchor with an `as` prop. That export is the
// narrow, deliberate hole in "one component, one element".
//
// **It has no loading state.** Every asynchronous action in this application so
// far replaces its own surrounding content while it runs — the table becomes a
// skeleton, the panel becomes a state — so a spinner inside the button would be
// a second, smaller answer to "is something happening?" competing with the real
// one. The reversal trigger is the first action whose result does not replace
// the thing that triggered it.

export const BUTTON_VARIANTS = ["primary", "secondary", "quiet"] as const;

export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];

export const BUTTON_SIZES = ["medium", "small"] as const;

export type ButtonSize = (typeof BUTTON_SIZES)[number];

export interface ButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "className" | "type"
> {
  /** The label. Required, even for an icon-only button — see `iconOnly`. */
  readonly children: ReactNode;

  /** Which of the three. Defaults to `secondary`, the ordinary case. */
  readonly variant?: ButtonVariant;

  /** Control height. Defaults to `medium` (36px); `small` is 28px. */
  readonly size?: ButtonSize;

  /**
   * An optional symbol before the label. It is `aria-hidden` like every other
   * `Icon`, so it adds nothing to the accessible name and cannot replace part
   * of it.
   */
  readonly icon?: IconName;

  /**
   * Hide the label visually and keep it for a screen reader.
   *
   * The label stays **required** rather than becoming an `aria-label` prop, and
   * that is the whole design of this flag: an `aria-label` is a second name for
   * the control that nobody reviewing the screen can see, so it drifts from the
   * visible one and there is no way to notice. Here there is one name, and
   * hiding it is a presentation decision.
   *
   * Requires `icon` in practice — a button with neither a visible label nor a
   * symbol is a blank box — but that is not enforced, because the type that
   * enforces it (a discriminated union on two optional props) makes every
   * ordinary call site harder to read for a case nobody has yet written.
   */
  readonly iconOnly?: boolean;
}

const VARIANT_CLASS: Readonly<Record<ButtonVariant, string | undefined>> = {
  primary: styles.primary,
  secondary: styles.secondary,
  quiet: styles.quiet,
};

const SIZE_CLASS: Readonly<Record<ButtonSize, string | undefined>> = {
  medium: styles.medium,
  small: styles.small,
};

/**
 * The class list for something that must be an `<a>` but should look like a
 * control — see the header. Exported rather than duplicated, so a link and a
 * button that sit beside each other cannot drift apart.
 */
export function linkClassName(
  variant: ButtonVariant = "secondary",
  size: ButtonSize = "medium",
): string {
  return cx(styles.button, VARIANT_CLASS[variant], SIZE_CLASS[size]);
}

export function Button({
  children,
  variant = "secondary",
  size = "medium",
  icon,
  iconOnly = false,
  ...rest
}: ButtonProps) {
  return (
    // `type="button"` is set here and removed from the props type above, which
    // is the one piece of HTML this component refuses to let a caller get
    // wrong: the default is `submit`, and a `submit` outside a form is inert in
    // some browsers and reloads the page in others. Nothing in this application
    // has a form yet, which is exactly why it would not be noticed.
    <button
      type="button"
      {...rest}
      className={cx(
        styles.button,
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        iconOnly ? styles.iconOnly : undefined,
      )}
    >
      {icon === undefined ? undefined : <Icon name={icon} />}
      <span className={iconOnly ? a11y.visuallyHidden : undefined}>
        {children}
      </span>
    </button>
  );
}
