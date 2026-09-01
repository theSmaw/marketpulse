import { cx } from "../../cx.js";
import styles from "./ErrorFallback.module.css";

// What stands in the place of something that failed to render.
//
// It is the *visible* half of the containment pattern; `ErrorBoundary` beside
// it is the mechanism. They are two components rather than one because the
// mechanism has no appearance and the appearance has no state — and because a
// class component cannot be reviewed in the workshop by rendering it, whereas
// this can.
//
// **It never shows the error.** Not the message, not the stack, not the name.
// That is the same decision Task 1.7.4 took on the backend and for the same
// reason: a stack was never the whole risk, because a message written for a
// developer is internal detail too, and it is the half that looks harmless.
// The message is already in the browser console with its component stack,
// which is where a developer is, so rendering it into the page buys nobody
// anything and gives a screenshot a life of its own. `detail` below is the
// caller's own sentence and must never be an error's.
//
// **The state is carried by words.** There is one red in this design language —
// `--status-error` and `--price-negative` resolve to the same value — so hue
// cannot be what separates "this failed" from "this fell", and under greyscale
// the two differ by 1.05:1 anyway. What separates them is presentation: this is
// a titled block with a message and a rule down its edge, exactly the shape
// `MarketOverview`'s render check has been demonstrating since Task 1.4.4,
// while a price move is a bare signed figure in a column. Remove all the colour
// and this still reads correctly, which is the requirement.
//
// **It brings no layout of its own.** A region is sized by the grid and scrolls
// its own overflow, which is what stops a failure changing PRODUCT_SPEC.md §9's
// 3:1 and 2:1 proportions or pushing its neighbours around. A fallback with a
// height, a minimum height or a centred flex frame would take that property
// away — so this is padding, three blocks of text and a button, and it is as
// tall as its content.

export interface ErrorFallbackProps {
  /**
   * What failed, named in the product's vocabulary rather than the code's —
   * "Market topology could not be displayed", not "Render error in Region".
   *
   * Required, and it is the word that carries the state. There is no icon-only
   * version of this component on purpose: axe returns `color-contrast` as
   * *inconclusive* on non-text content, so an icon-only error state is
   * precisely the shape automated tooling declines to judge.
   */
  readonly title: string;

  /**
   * One more sentence, from the caller.
   *
   * Its job is to say what still works — "The rest of the screen is
   * unaffected" — because the whole point of containment is invisible
   * otherwise: a user looking at one broken box has no way to know the other
   * three are fine rather than about to break too.
   *
   * **Never the error's own message.** See the note above the component.
   */
  readonly detail?: string;

  /**
   * Recovery, and it is a reset rather than a reload.
   *
   * Reloading the document would discard the rest of a working screen, which
   * is the exact failure mode being avoided — so the affordance re-renders the
   * failed subtree and leaves everything else alone.
   *
   * Required. A fallback with no way out is a dead box, and "offers recovery"
   * is half of this story's criterion; making it optional would make the half
   * that matters the easy one to forget.
   */
  readonly onRetry: () => void;

  /**
   * For the chrome, where the full block does not fit.
   *
   * The header strip is one line tall and a titled block inside it would push
   * the page down — so `compact` lays the same three elements out in a row.
   * It is a density change and not a different component: the words, the rule
   * and the button are the same, which is what stops the two drifting into two
   * error languages.
   */
  readonly compact?: boolean;
}

export function ErrorFallback({
  title,
  detail,
  onRetry,
  compact = false,
}: ErrorFallbackProps) {
  return (
    <div
      // `role="alert"` rather than a plain block: this appears in place of
      // content that was expected to be there, and a screen-reader user who is
      // elsewhere on the page gets no other signal. The one case it does not
      // announce is a failure on the very first render, when the alert is
      // present before the region is — accepted, because the alternative is a
      // live region that fires on page load for every visitor.
      role="alert"
      className={cx(styles.fallback, compact ? styles.compact : undefined)}
    >
      <p className={styles.title}>{title}</p>
      {detail !== undefined && <p className={styles.detail}>{detail}</p>}
      <button type="button" className={styles.retry} onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
