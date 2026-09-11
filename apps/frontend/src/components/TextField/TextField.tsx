import type { InputHTMLAttributes, KeyboardEvent, Ref } from "react";
import { useId } from "react";

import { cx } from "../../cx.js";
import { Icon, type IconName } from "../Icon/Icon.js";
import a11y from "../../styles/a11y.module.css";
import styles from "./TextField.module.css";

// The product's first input field, and therefore its input *idiom*.
//
// `VISUAL-LANGUAGE.md` recorded that fields had deliberately never been built —
// "a control designed against no consumer is a control designed against a
// guess" — and named Story 2.11 as the consumer. So this is not one field for
// one screen. Story 2.13's window control, Epic 8's comparison picker and Epic
// 11's symbol switcher are all measured against it, which is why nothing here
// says "search": the only search-shaped thing in the file is that `magnifier`
// is an `icon` a caller may pass.
//
// ## The fence, and it is the reason this is a *field*
//
// **This is not a combobox.** No listbox, no `aria-expanded`, no active
// descendant, no keyboard navigation between results, no matcher. Those are
// Task 2.11.4's, and they are what turn a field into a composite widget with an
// ARIA pattern to satisfy. Keeping the field a field is what lets Story 2.13
// reuse it for something that is not a search at all.
//
// What it does do is leave room for that consumer: every attribute the
// combobox pattern needs is passed straight through to the `<input>`, and
// `inputRef` reaches the element so a consumer can move focus to it.
//
// ## The states, and the one that was dropped
//
// The 2026-08-31 specification asked for **seven** — Empty, Filled, Hover,
// Focus, Error, Disabled, Locked. `Locked` (present, not editable by this
// user) is **dropped**: `PRODUCT_SPEC.md` §37 excludes authentication beyond
// demo needs, so it has no consumer, and a state drawn against no consumer is
// exactly the guess that deferred input fields in the first place. The trigger
// for it is **the first field a person can see and may not edit**; when that
// fires it is added here, not invented at a call site.
//
// So: six, plus the two this consumer adds — `busy` (a request or a
// computation is in flight) and `surfaceOpen` (something is open directly
// beneath the field). **Neither may shift the layout under a cursor**, and that
// constraint is what shapes the markup below more than anything else on this
// list — see the trailing slot and the busy track in the stylesheet.
//
// Note `busy` has no consumer on the screen this was built for either, and it
// is here anyway for the opposite reason to `Locked`: search in this product is
// client-side over a universe the page already holds
// (`SEARCH-AND-SELECTION.md` §2), so it is instant and never in flight — but
// "a field that is waiting" is a shape every one of the later consumers has,
// and the alternative is each of them inventing its own spinner.
//
// ## Four things the design deliverable asked for, and what happened to them
//
//   - **Bordered, not underlined. Taken.** An underlined field on a page of
//     hairline-bordered panels reads as a form field on a document; a bordered
//     box reads as an instrument, and it has a resting silhouette an underline
//     only acquires on focus.
//   - **The input text in the monospace face. Taken.** `--font-data` is the
//     face for "figures and identifiers: tickers", and what a person types into
//     the first consumer is predominantly a ticker. It is the single detail
//     that most makes this read as a command line rather than a web form. The
//     cost is accepted rather than overlooked: a typed company name is also in
//     mono.
//   - **A clear affordance and a visible `ESC` hint inside the field. Taken**,
//     and the hint is made true here rather than left as decoration — see
//     `onClear`.
//   - **A 2px near-black resting border. Declined**, for a concrete reason
//     rather than a stylistic one: the global focus ring is a 2px near-black
//     outline at 2px offset, so a resting border of the same weight and colour
//     leaves the field with **no visible focus state**. The resting border is
//     `--rule-hairline`, which is what the token layer already calls "the
//     ordinary border: panels, controls, inputs, chips".
//
// ## Focus is not this component's job, and proving that took an escalation
//
// There is no `:focus` rule anywhere in this component's stylesheet, exactly as
// there is none in `Button`'s. One global `:focus-visible` owns it, and a
// component declaring its own is answering a question already answered.
//
// A field is the first control in this application where that is not the end of
// the sentence. The element a browser focuses is the bare `<input>` inside the
// box, so the global outline lands **inside** the field, around the text and
// not around the control — measured, not reasoned about. `VISUAL-LANGUAGE.md`
// says the answer to that is an escalation to the token layer rather than a
// local override, so the two classes that hand the ring from the input to the
// box live in `a11y.module.css`, beside `visuallyHidden`, in the same three
// tokens the global rule uses. Every composite control after this one —
// Story 2.13's window control, Epic 8's picker — meets the same problem, and
// the failure mode of solving it here is that each of them solves it again.
//
// ## The error state is not a live region, and that is a decision
//
// `/securities` already has two polite live regions, and the rule
// (`FRONTEND-STATE.md` §7) is one region per subject with every sentence naming
// its subject. A `role="alert"` on a field message would be a third surface
// speaking, queued against the other two in an order nobody controls, at
// whatever rate a person types. So the message is `aria-invalid` plus
// `aria-describedby` — read when the field is reached, silent otherwise — and
// any announcement of *results* belongs to the consumer that owns the results.

export const TEXT_FIELD_SIZES = ["medium", "small"] as const;

export type TextFieldSize = (typeof TEXT_FIELD_SIZES)[number];

export interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  // Everything this component owns. `size` is the collision worth naming:
  // HTML's is a character count nobody has ever wanted, and ours is the
  // control height that keeps a field the same height as the button beside
  // it.
  | "className"
  | "value"
  | "onChange"
  | "disabled"
  | "type"
  | "id"
  | "size"
  | "aria-invalid"
  | "aria-describedby"
> {
  /**
   * The visible label, above the field at micro-label size.
   *
   * Required, and there is deliberately no way to replace it with a
   * placeholder: **a placeholder masquerading as a label is the single most
   * common accessibility defect in search fields** — it disappears the moment
   * somebody types, it is not read as a name by every screen reader, and it is
   * grey-on-white at a contrast nothing else in this language would pass.
   */
  readonly label: string;

  /** The current value. This is a controlled input; there is no uncontrolled mode. */
  readonly value: string;

  /** Called with the new value on every keystroke. */
  readonly onValueChange: (value: string) => void;

  /**
   * An optional symbol at the leading edge. `magnifier` for a search, and the
   * reason the icon set gained a sixth member.
   */
  readonly icon?: IconName;

  /**
   * A short line under the field — a count, a format, a unit. It is associated
   * with the input through `aria-describedby`, so it is read as part of the
   * control rather than sitting near it.
   */
  readonly hint?: string;

  /**
   * The error message. Its **presence** is the error state; there is no
   * separate boolean, because an invalid field with nothing to say is a dead
   * end for the person looking at it.
   *
   * It is rendered with the `alert` glyph beside it as well as in
   * `--status-error`, because colour is never the sole encoding of anything in
   * this language.
   */
  readonly error?: string;

  /**
   * Valid, but with a caveat worth reading — the canvas's `06 · WARNING`. Its
   * worked example is the one that makes the state worth having: *"Symbol is
   * valid but halted — data may be stale."* Nothing is wrong with what the
   * person typed, so the field is **not** marked `aria-invalid`; there is just
   * something they should know.
   *
   * Drawn with a **dashed** border rather than a second hue, which is the
   * language's own rule doing its job: the difference between an error and a
   * warning is carried by the border's *shape* as well as its colour, so it
   * survives `grayscale(1)`.
   */
  readonly warning?: string;

  /**
   * Checked and good — the canvas's `08 · VALID`. Draws a tick in the trailing
   * slot and sets `aria-invalid="false"`, which is the only standard way to
   * say "this was validated and passed" rather than "this was never checked".
   *
   * The tick is **achromatic**, and that is a deliberate divergence from the
   * canvas — see the stylesheet. Green means price-up on every other screen in
   * this product.
   */
  readonly valid?: boolean;

  /**
   * A value the person may see and select but not edit — the canvas's
   * `09 · READ-ONLY`, whose worked example is a timestamp.
   *
   * **This is not the `Locked` state that Task 2.11.3 dropped**, and the
   * distinction is worth keeping straight because the two look alike. `Locked`
   * was *"not editable by this user"* — a permission, whose trigger is
   * authentication, which `PRODUCT_SPEC.md` §37 still excludes. This is a
   * display state with no permission in it: the value is simply not something
   * anybody edits here. `Locked`'s trigger has **not** fired.
   */
  readonly readOnly?: boolean;

  /**
   * Temporarily unavailable: the control cannot answer, and says why.
   *
   * **It stays in the tab order, and that is a decision this component took
   * for the whole product** (Task 2.11.9). It renders `aria-disabled` and
   * `readOnly` rather than the native `disabled` attribute, which is the
   * difference between a control a listener is told about and one that is not
   * there.
   *
   * The walk that produced it: with the universe unreachable, `SecuritySearch`
   * disables the field and hangs the reason off it with `aria-describedby` —
   * *"Nothing to search yet: the tracked universe did not answer…"*. A
   * description is read **when the control is reached**, and a natively
   * disabled input cannot be reached. Measured in Chromium on 2026-09-11, the
   * tab order in that state ran straight from the fourth navigation link to
   * the first region: the sentence was computed correctly, attached correctly,
   * on screen, and structurally unreachable — for the one person who most
   * needs to be told why tabbing past a search box was the right thing to do.
   *
   * Three answers were available and this is why this one. **`readOnly`
   * alone** was rejected on meaning rather than mechanics: the prop above is a
   * display state — *a value nobody edits here* — and borrowing it for *this
   * control cannot answer* would give one prop two jobs and make the state a
   * listener hears ("read only") say nothing about why. **Leaving it** was
   * rejected because the alternative explanation on screen, the tracked
   * universe's own failure block, is two stops further on and describes a
   * different surface. So: the field keeps the grey, keeps the reason, and
   * keeps its place in the order.
   *
   * The distinction from `readOnly` is therefore no longer focusability —
   * both are focusable now — it is what is announced and whether the value is
   * something anybody was ever meant to edit.
   */
  readonly disabled?: boolean;

  /**
   * A request or a computation is in flight. Draws an indeterminate sweep along
   * the field's inside bottom edge and sets `aria-busy`; shifts nothing.
   */
  readonly busy?: boolean;

  /**
   * Something — a result surface, a calendar — is open directly beneath this
   * field. The field becomes the head of it and its border steps up to the
   * structural near-black.
   *
   * It is deliberately *not* named `expanded`: `aria-expanded` is the combobox
   * pattern's and belongs to the consumer that owns the listbox, and a prop
   * that looked like it would invite this component to set it.
   */
  readonly surfaceOpen?: boolean;

  /**
   * Makes the field clearable. Supplying it does three things at once, and they
   * travel together on purpose: a `×` button appears once there is a value, an
   * `ESC` chip appears beside it, and **Escape in the field calls this** — so
   * the chip is a statement about what the control does rather than a
   * decoration promising something a consumer may or may not have wired up.
   *
   * A consumer's own `onKeyDown` still runs, and runs first, so a combobox can
   * close its surface on the same key.
   */
  readonly onClear?: () => void;

  /**
   * A fixed leading affix inside the box — the canvas's `11 · WITH AFFIX`, a
   * `$` before a price. It never scrolls with the value, which is the whole
   * point of it being an affix rather than typed text.
   */
  readonly prefix?: string;

  /** A fixed trailing affix — `USD`, `%`, `bps`. Same rules as `prefix`. */
  readonly suffix?: string;

  /** Control height. `medium` is 36px and matches `Button`; `small` is 28px. */
  readonly size?: TextFieldSize;

  /** Reaches the `<input>`, so a consumer can move focus to it. */
  readonly inputRef?: Ref<HTMLInputElement>;
}

const SIZE_CLASS: Readonly<Record<TextFieldSize, string | undefined>> = {
  medium: styles.medium,
  small: styles.small,
};

export function TextField({
  label,
  value,
  onValueChange,
  icon,
  hint,
  error,
  warning,
  valid = false,
  readOnly = false,
  prefix,
  suffix,
  disabled = false,
  busy = false,
  surfaceOpen = false,
  onClear,
  size = "medium",
  inputRef,
  ...rest
}: TextFieldProps) {
  // `useId` rather than a caller-supplied id: two fields with the same label on
  // one screen is an ordinary thing, and two elements with the same id is a
  // broken label association that renders perfectly.
  const id = useId();
  const hintId = `${id}-hint`;
  const messageId = `${id}-message`;
  const prefixId = `${id}-prefix`;
  const suffixId = `${id}-suffix`;

  // Precedence, stated once: **error, then warning, then valid.** They are
  // three additive props rather than one union because every call site has
  // either a message or nothing, and a union would make the common case
  // construct an object to say so — but they are not independent, and a field
  // that was handed all three must pick one. Something wrong outranks
  // something worth knowing, which outranks something confirmed fine.
  const invalid = error !== undefined;
  const warned = !invalid && warning !== undefined;
  const message = invalid ? error : warning;
  const showValid = valid && !invalid && !warned;

  const showClear =
    onClear !== undefined && value !== "" && !disabled && !readOnly;

  // Described by whichever of these exist, the message first — the thing that
  // is wrong, or worth knowing, is read before the thing that is merely useful. `undefined` rather
  // than an empty string when there is neither: `aria-describedby=""` points at
  // an element with no id and is a validity error, not an absence.
  const describedByIds = cx(
    message === undefined ? undefined : messageId,
    // The affixes carry meaning — `$`, `USD`, `%` — so they are described
    // rather than `aria-hidden`. A unit that is visible and unspoken is a
    // number read without its unit.
    prefix === undefined ? undefined : prefixId,
    suffix === undefined ? undefined : suffixId,
    hint === undefined ? undefined : hintId,
  );
  const describedBy = describedByIds === "" ? undefined : describedByIds;

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // **Nothing happens in an unavailable field, and this guard is what the
    // native attribute used to do for free.** Since Task 2.11.9 the input is
    // `aria-disabled` and `readOnly` rather than `disabled`, so it receives
    // keystrokes — `readOnly` stops them reaching the value, and this stops
    // Escape emptying a field the person is not editing.
    if (disabled) return;

    // The consumer first, and unconditionally: a combobox closing its surface
    // on Escape must not be pre-empted by the field emptying itself, and it is
    // the consumer that knows which of the two should happen.
    rest.onKeyDown?.(event);

    if (
      onClear !== undefined &&
      event.key === "Escape" &&
      !event.defaultPrevented
    ) {
      onClear();
    }
  }

  return (
    <div className={cx(styles.field)}>
      <label className={cx(styles.label)} htmlFor={id}>
        {label}
      </label>

      <div
        className={cx(
          styles.box,
          // The box draws the focus ring the `<input>` below hands to it. See
          // the header, and `a11y.module.css` for what this is and is not.
          a11y.focusRingHost,
          SIZE_CLASS[size],
          invalid ? styles.invalid : undefined,
          warned ? styles.warned : undefined,
          disabled ? styles.disabledBox : undefined,
          readOnly ? styles.readOnlyBox : undefined,
          surfaceOpen ? styles.open : undefined,
        )}
      >
        {/* The leading affix sits outside the icon, hard against the box's
            edge, with its own ground — so it reads as part of the control
            rather than as the first character of the value. */}
        {prefix === undefined ? undefined : (
          <span className={cx(styles.affix, styles.affixStart)} id={prefixId}>
            {prefix}
          </span>
        )}

        {icon === undefined ? undefined : (
          <span className={cx(styles.leading)}>
            <Icon name={icon} />
          </span>
        )}

        <input
          {...rest}
          ref={inputRef}
          id={id}
          // `type="text"` rather than `type="search"`: the search type brings a
          // user-agent clear button with it, in a shape and position this
          // language does not control, beside the one drawn below. Two clear
          // buttons is worse than either.
          type="text"
          className={cx(styles.input, a11y.focusRingSource)}
          value={value}
          // **`aria-disabled` rather than `disabled`** — see the prop's own
          // documentation for the walk that decided it. `readOnly` alongside
          // is what actually stops the value changing, since an
          // `aria-disabled` input is an ordinary editable one as far as the
          // user agent is concerned.
          aria-disabled={disabled ? true : undefined}
          readOnly={readOnly || disabled}
          // `false` rather than absent when the field has been checked and
          // passed: absent means "never validated", and those are different
          // things to anybody listening. A warning leaves it absent on
          // purpose — nothing is wrong with the value.
          aria-invalid={invalid ? true : showValid ? false : undefined}
          aria-describedby={describedBy}
          aria-busy={busy ? true : undefined}
          onChange={(event) => {
            onValueChange(event.target.value);
          }}
          onKeyDown={handleKeyDown}
        />

        {suffix === undefined ? undefined : (
          <span className={cx(styles.affix)} id={suffixId}>
            {suffix}
          </span>
        )}

        {/*
         * The validated tick. `aria-hidden` because `aria-invalid="false"` on
         * the input already carries this to a screen reader, and a bare glyph
         * read aloud is noise.
         */}
        {showValid ? (
          <span className={cx(styles.validTick)} aria-hidden="true">
            &#10003;
          </span>
        ) : undefined}

        {/*
         * The trailing slot, present only when there is something to clear.
         *
         * **Measured rather than assumed, because the obvious worry here is
         * real and the obvious fix for it is worse.** The slot appearing does
         * narrow the input — by 70px at the default width — and the first
         * instinct is to reserve its width permanently so nothing ever moves.
         * That is the wrong trade: it leaves a `min-width` of dead space in
         * every field that is merely *capable* of being cleared, sized by a
         * number somebody measured once.
         *
         * It is unnecessary as well as ugly. The slot can only appear as the
         * value goes from zero characters to one, and only disappear as it goes
         * back to zero — so the input is empty or nearly so at both moments,
         * the text is left-aligned against an edge that does not move
         * (measured: the input's left edge is at the same pixel in every
         * specimen of the grid), and there is nothing in the narrowing part of
         * the field for a person to have been reading. What must never move is
         * what `busy` and `surfaceOpen` touch, and neither of those changes a
         * single measurement.
         */}
        {showClear ? (
          <span className={cx(styles.trailing)}>
            <span className={cx(styles.escHint)} aria-hidden="true">
              Esc
            </span>
            {/*
             * A bare `<button>` rather than `Button`: this sits *inside* a 36px
             * control, and `Button`'s smallest is 28px with its own ground and
             * border. A control inside a control has to be smaller than the
             * thing containing it.
             */}
            <button
              type="button"
              className={cx(styles.clear)}
              onClick={() => {
                onClear();
              }}
            >
              {/* The visible glyph is decorative; the name is the word. */}
              <span aria-hidden="true">&times;</span>
              {/*
               * The name carries the field's own label rather than reading
               * "Clear" alone, because a screen reader's button list shows this
               * out of context and a screen with two clearable fields would
               * otherwise offer two identical buttons.
               */}
              <span className={cx(a11y.visuallyHidden)}>Clear {label}</span>
            </button>
          </span>
        ) : undefined}

        {/*
         * The busy sweep, and the reason it is a bar rather than a spinner in
         * the icon slot: it is inside the border box and absolutely positioned,
         * so it occupies no space at all and cannot move a character of what
         * somebody is reading. `aria-hidden` because `aria-busy` on the input
         * already says this to a screen reader.
         */}
        {busy ? (
          <span className={cx(styles.busyTrack)} aria-hidden="true" />
        ) : undefined}
      </div>

      {message === undefined ? undefined : (
        <p
          className={cx(styles.message, invalid ? styles.errorText : undefined)}
          id={messageId}
        >
          {/*
           * The glyph, because `market.css`'s rule is that colour is never the
           * sole encoding: under `grayscale(1)` this message is the same tone
           * as the hint it replaces.
           *
           * Error and warning share `alert` rather than the warning gaining a
           * seventh icon. The set was closed at six on 2026-09-11 with the rule
           * that the next addition needs its own argument in its own task, and
           * this is not that argument: the two states are already told apart by
           * the border's *shape* — dashed against solid — which is a
           * non-colour encoding the glyph would only duplicate.
           */}
          <Icon name="alert" />
          {message}
        </p>
      )}

      {hint === undefined ? undefined : (
        <p className={cx(styles.hint)} id={hintId}>
          {hint}
        </p>
      )}
    </div>
  );
}
