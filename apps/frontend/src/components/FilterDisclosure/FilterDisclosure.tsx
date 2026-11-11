import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";

import { cx } from "../../cx.js";
import { Button } from "../Button/Button.js";
import { Icon } from "../Icon/Icon.js";
import styles from "./FilterDisclosure.module.css";

// **The shape both of the topology's filter controls take** — extracted at
// Task 6.8.2 from `SectorFilter`, which shipped it whole at Task 6.8.1.
//
// ## Why an extraction rather than a second control written beside it
//
// What `SectorFilter` held was a trigger, a panel, and **four dismissals**
// (a press on a destination, `Escape`, focus leaving, a pointer press
// outside), none of which is about sectors. A band control written beside it
// would have been a second copy of all four — and that file's own note about
// using `Button` rather than a `<button>` is the argument against it in as
// many words: *two controls side by side that were built twice are two
// controls that drift*. They sit 8 px apart in one region header.
//
// What is NOT here is anything either control decides: the subject word, the
// current value, how many destinations there are and what they mean. A
// disclosure that knew about `Sector` would be a disclosure with two reasons
// to change.
//
// ## A disclosure, not an ARIA menu, and not a radiogroup
//
// `SectorFilter.tsx`'s reasoning, carried here unchanged. **`role="menu"` is
// refused**: the ARIA menu pattern owes arrow-key navigation, type-ahead and
// a tabindex that roves, and it tells a listener these are *commands*; they
// are **destinations**, and a list of links is what a screen reader already
// knows how to read. `aria-expanded` on the button and a named group around
// the links is the whole of the semantics.
//
// ## Every destination is a `<Link>`, and that is an invariant rather than a
// ## style
//
// This component renders whatever its caller gives it and navigates nowhere
// itself. Both callers resolve their `href`s at render from the address the
// filter was read out of, so `one-home-for-imperative-navigation` — a check
// over every shipped source file in three trees, whose clause is *the call
// that moves the address* — has nothing in this subtree to find. The obvious
// control for a list of values is a `<select>` with an `onChange` that calls
// `setSearchParams`, and that is the one shape this product's own invariant
// exists to refuse.

export interface FilterDisclosureProps {
  /**
   * The word this control is about — `Sector`, `Band`.
   *
   * Drawn on screen and read by both channels, so a listener reaching the
   * trigger hears *"Sector, All sectors, button, collapsed"*: the subject,
   * then the value, then what it is. `aria-label` on the button was the
   * alternative and it is worse by one fact, because it would hide the value
   * from the one reader who cannot see it.
   */
  readonly subject: string;

  /**
   * What is on screen now — `All sectors`, `high or extreme`.
   *
   * The caller's own words. This component never derives it: *which value is
   * current* is the one thing a criterion knows and a disclosure does not.
   */
  readonly value: string;

  /**
   * The destinations, as a function of *how to close the panel*.
   *
   * A render prop rather than plain children, because closing is this
   * component's state and following the link is the caller's `<Link>`: the
   * press has to do both, and neither half can reach the other without this
   * argument. The navigation itself is always the link's.
   */
  readonly children: (close: () => void) => ReactNode;
}

export function FilterDisclosure({
  subject,
  value,
  children,
}: FilterDisclosureProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const box = useRef<HTMLDivElement>(null);

  /*
   * **A pointer press outside closes it**, which is the one dismissal no
   * event on this subtree can see: a press on a non-focusable part of the
   * page fires no `focusout` here at all, so a control left open by it would
   * sit over the graph until the reader came back and pressed the button
   * again.
   *
   * `pointerdown` rather than `click`, so the panel goes at the start of the
   * gesture the way every other dismissible surface in this product behaves,
   * and the listener exists **only while the panel is open** — there is no
   * document listener on this page in the state it is in 99% of the time.
   */
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target;
      if (target instanceof Node && box.current?.contains(target) === true)
        return;

      setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div
      className={styles.control}
      ref={box}
      /*
       * **`Escape` and a focus leaving, on the box rather than on the two
       * children** — one handler for a pair of elements, which is
       * `renderer-canvas.ts`' own reason for listening on its container: the
       * button and the links are both inside this box, and `focusout`
       * bubbles while `blur` does not.
       */
      onBlur={(event) => {
        const to = event.relatedTarget;
        if (to instanceof Node && event.currentTarget.contains(to)) return;
        setOpen(false);
      }}
      onKeyDown={(event) => {
        // Only ours, and only when there is something to close — an `Escape`
        // over a shut control belongs to whatever is above this region, which
        // is `renderer-canvas.ts`' own guard for the same key.
        if (event.key !== "Escape" || !open) return;

        event.preventDefault();
        setOpen(false);
      }}
    >
      {/*
       * **`Button`, not a `<button>` of this component's own** — it sits 8 px
       * from `Reset view` in the same region header, and two controls side by
       * side that were built twice are two controls that drift. `ButtonProps`
       * extends `ButtonHTMLAttributes`, so `aria-expanded`/`aria-controls`
       * reach the element without this component learning anything about how
       * a control is drawn.
       *
       * **The chevron is after the label rather than through `icon`**, which
       * renders before it: a disclosure's indicator belongs on the side the
       * panel opens from, and `Button`'s own `icon` slot is for a symbol that
       * qualifies the verb (`Reset view`'s refresh). It is `chevronRight`
       * rotated by the stylesheet rather than a seventh drawing in
       * `ICON_NAMES`, because it is the same symbol pointing somewhere else —
       * which is also what lets it turn when the panel opens.
       */}
      <Button
        aria-controls={panelId}
        aria-expanded={open}
        onClick={() => {
          setOpen((was) => !was);
        }}
        size="small"
        variant="secondary"
      >
        {/*
         * **A real space between the two spans, not only the margin** —
         * found by reading the accessible name rather than the screen.
         * Accessible-name computation concatenates an element's rendered text
         * and inserts nothing between two inline children, so a CSS margin is
         * a gap a sighted reader sees and a listener does not: the control
         * announced itself as `SectorAll sectors`. The margin is still there
         * for the gap's size; this is what makes the two words two words.
         */}
        <span className={styles.subject}>{subject}</span>{" "}
        <span className={styles.value}>{value}</span>
        <span className={cx(styles.chevron, open ? styles.open : undefined)}>
          <Icon name="chevronRight" />
        </span>
      </Button>

      {open && (
        /*
         * **A named group of links rather than a `role="listbox"`** — see the
         * header. `aria-label` here rather than pointing at the button's own
         * text: the group's name is the subject and the button's name is the
         * subject plus the current value, and a group named *Sector All
         * sectors* would be reporting the value twice.
         */
        <div
          aria-label={subject}
          className={styles.panel}
          id={panelId}
          role="group"
        >
          {children(() => {
            setOpen(false);
          })}
        </div>
      )}
    </div>
  );
}

/** One destination's own class, so a caller does not import the stylesheet. */
export const filterDisclosureOption = (chosen: boolean): string =>
  cx(styles.option, chosen ? styles.chosen : undefined);
