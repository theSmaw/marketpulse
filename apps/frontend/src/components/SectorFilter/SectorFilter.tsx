import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router";

import { SECTORS, SECTOR_LABELS } from "@marketpulse/shared";

import { cx } from "../../cx.js";
import { topologySectorPath } from "../../topology/index.js";
import type { TopologyFilter } from "../../topology/index.js";
import { Button } from "../Button/Button.js";
import { Icon } from "../Icon/Icon.js";
import styles from "./SectorFilter.module.css";

// **The control that narrows the market topology to one sector** (Task 6.8.1).
//
// ## Twelve `<Link>`s and no imperative navigation anywhere
//
// Every destination is resolved **at render** from the address this filter was
// read out of (`topologySectorPath`), so `one-home-for-imperative-navigation`
// — a check over every shipped source file in three trees, whose clause is
// *the call that moves the address* — has nothing here to find. That is the
// decision `STORY.md`'s Work item asked for rather than a style: the obvious
// control for twelve mutually exclusive values is a `<select>` with an
// `onChange` that calls `setSearchParams`, and that is the one shape this
// product's own invariant exists to refuse, because a destination computed in
// a handler is a destination a frame can land in the middle of.
//
// `TimeWindowControl` is the near-precedent and it is deliberately NOT copied:
// that control takes an `onChange` and the ROUTE navigates, because the route
// in question is `SecurityExplorer`, the one file in this application allowed
// to. `/` is not that file.
//
// ## A disclosure, not an ARIA menu, and not a radiogroup
//
// Twelve values do not fit a segmented control: the eleven sector names are
// ~900 px of type and the region's whole header is 308 px at 390, where the
// band legend is already hidden for want of room (`MarketOverview.module.css`
// carries that measurement). So the shipped shape is a disclosure — a button
// that names the current value, and a panel of twelve links.
//
// **`role="menu"` is refused.** The ARIA menu pattern owes arrow-key
// navigation, type-ahead and a tabindex that roves, and it tells a listener
// these are *commands*; they are **destinations**, and a list of links is what
// a screen reader already knows how to read. `aria-expanded` on the button and
// a named group around the links is the whole of the semantics.
//
// ## It closes four ways, and each one is somebody's real gesture
//
// A press on a destination (the navigation is the `<Link>`'s; closing is this
// component's), `Escape`, focus leaving the control, and a pointer press
// outside it. The last two are the ones a bare `<details>`/`<summary>` does
// not give — which is why this holds one piece of open/closed state rather
// than using the native element, and the state is a reader's own press rather
// than anything at feed cadence.

export interface SectorFilterProps {
  /**
   * The criterion the address names — `useTopologyFilter()`.
   *
   * Carried whole rather than as a bare `Sector | null`, because this control
   * builds twelve destinations and each of them has to preserve whatever else
   * the query string holds; {@link TopologyFilter.search} is that address.
   */
  readonly filter: TopologyFilter;
}

export function SectorFilter({ filter }: SectorFilterProps) {
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

  const chosen =
    filter.sector === null ? ALL_SECTORS : SECTOR_LABELS[filter.sector];

  return (
    <div
      className={styles.control}
      ref={box}
      /*
       * **`Escape` and a focus leaving, on the box rather than on the two
       * children** — one handler for a pair of elements, which is
       * `renderer-canvas.ts`' own reason for listening on its container: the
       * button and the twelve links are both inside this box, and `focusout`
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
       * **The accessible name is `Sector`, and the value is read after it**
       * (STORY.md's Work item: never *Filter by sector*, never *Showing*).
       *
       * The word is drawn on screen and read by both channels — one string,
       * one home — so a listener reaching this control hears *"Sector, All
       * sectors, button, collapsed"*: the subject, then the value, then what
       * it is. `aria-label="Sector"` was the alternative and it is worse by
       * one fact, because it would hide the value from the one reader who
       * cannot see it.
       */}
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
        <span className={styles.subject}>Sector</span>{" "}
        <span className={styles.value}>{chosen}</span>
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
          aria-label="Sector"
          className={styles.panel}
          id={panelId}
          role="group"
        >
          {[null, ...SECTORS].map((sector) => {
            const current = sector === filter.sector;

            return (
              <Link
                aria-current={current ? "true" : undefined}
                className={cx(
                  styles.option,
                  current ? styles.chosen : undefined,
                )}
                key={sector ?? "all"}
                onClick={() => {
                  setOpen(false);
                }}
                to={topologySectorPath(filter.search, sector)}
              >
                {sector === null ? ALL_SECTORS : SECTOR_LABELS[sector]}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * The twelfth value — **the whole market**.
 *
 * `All sectors` rather than `All`, which reads as an answer to no question in
 * a control whose own name is already `Sector`; and rather than
 * `Every sector`, because this is the value a reader returns to and the note
 * over the graph says `Show all` for the same act. Two strings for one act is
 * accepted here and is not a second home for a fact: one is a **value in a
 * list of twelve** and the other is a **control that undoes something**, and
 * `All sectors` as a link over the graph would read as a filter rather than as
 * the way out of one.
 */
const ALL_SECTORS = "All sectors";
