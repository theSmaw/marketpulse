import { useCallback, useEffect, useRef, useState } from "react";

import type { SectorRow } from "../../market/index.js";

// **The hold: the order stands still while a reader is in the region**
// (Task 4.3.6, `The order that changes.dc.html` §07).
//
// ## One boolean, one pin, one state
//
// The badge in the region's head and the order the list draws read **the same
// value**, and that is the whole reason they are one piece of state rather than
// two. `docs/GAPS.md` entry 13's sibling is about two speakers in one box
// disagreeing — the market-feed cell said `not configured` three words from its
// own `REPLAYING` for four days, two true halves and one contradiction — and a
// head saying `ORDER HELD` over a list that was re-ordering would be exactly
// that defect, one region along. Here it is unrepresentable: the badge is
// `pinned !== undefined`, and `pinned` **is** the order the list draws.
//
// **Amended 2026-10-11 (Task 4.7.6): _unrepresentable_ is too strong, and the
// state has been produced in Chromium.** What is unrepresentable is the badge
// being on while **no** order is pinned. The badge is on while a **re-taken**
// pin is in force, and a re-taken pin is a different order with the same truth
// value — so `ORDER HELD` can and does sit over a list whose five rows all just
// moved. Two triggers, both measured in `overview-degraded-stops.spec.ts`:
//
//   - **One arrow press.** `Region` combines non-bubbling `pointerenter` /
//     `pointerleave` with **bubbling** `focusin` / `focusout`, so moving focus
//     from one row to the next fires `focusout` — `setPinned(undefined)` — and
//     then `focusin`, which pins `latest.current` afresh. Measured: a pinned
//     `SMCI FSLR NVDA AMD TSLA` becomes `TSLA AMD NVDA FSLR SMCI` on one
//     `ArrowDown`, and because the key handler read the order that was on
//     screen when the key went down, **a press of ArrowDown moved the reader
//     one row UP the screen** (rank 3 → `AMD`, which is now rank 2).
//   - **The focus recovery, with nothing pressed at all.** Task 4.6.5's
//     recovery calls `focus()` on another element inside the same region, which
//     is the same bubbling pair — so a degradation that empties the list
//     re-pins against the **degraded** frame, and the order moves again when
//     the feed returns.
//
// Story 4.6 handed the first of those over as a known consequence of two
// correct decisions; the second arrived with its own repair. **Neither is
// repaired here**: the hold's behaviour was settled by Task 4.5.7 with
// measurements, and changing it is the owner's. `docs/GAPS.md` carries the
// entry and the recommendation.
//
// ## Why the pin is captured in the handler and not derived
//
// The hold begins on an event, and an event handler is the one place in React
// where writing state is free of doubt. The alternatives were both rules this
// repository enforces at error severity: deriving it during render is
// `set-state-in-render`, and reacting to the `held` prop changing from an effect
// is `set-state-in-effect`. Neither is worth routing around for a value an event
// already knows.
//
// So what is captured is *the order that was on screen when the reader
// arrived*, which is also the exact sentence the drawing uses.
//
// ## The one state it cannot pin
//
// A reader whose pointer is already resting over the region **before the first
// frame arrives** — the region is a reserved panel then, with no list in it —
// enters with nothing to pin, and `pinned` stays absent until the next pointer
// or focus event. What that reader gets is no hold and no badge: the region says
// nothing false, because the badge and the gate are one value. The alternative
// was re-pinning from an effect, which is the rule above, for a case that lasts
// as long as the gateway takes to send the aggregate it sends on connect.

/** The hold, as the region's head and its list both read it. */
export interface OrderHold {
  /**
   * The order to draw — **the pinned one, or absent for the live one**.
   *
   * `rowsInPinnedOrder` takes exactly this, and `undefined` is *nothing is
   * held*: a caller cannot accidentally hold the empty order.
   */
  readonly pinned: readonly string[] | undefined;
  /**
   * What the region's head says, and it is derived rather than stored: there is
   * no state in which the badge is on and **nothing** is pinned.
   *
   * **Amended 2026-10-11 (Task 4.7.6).** This said *no state in which the badge
   * is on and the order is moving*, which is false and was produced: a focus
   * move inside the region releases and re-takes the pin, so the badge stays on
   * across a re-order. See the header.
   */
  readonly held: boolean;
  /** `Region`'s `onReaderWithin`. **Stable**, so the listeners are bound once. */
  readonly onReaderWithin: (within: boolean) => void;
}

/**
 * Hold the order while a reader is in the region.
 *
 * @param rows the rows **in their live ranked order** — the ones that would be
 * drawn if nobody were reading. Absent while the region has no list at all.
 */
export function useOrderHold(
  rows: readonly SectorRow[] | undefined,
): OrderHold {
  const [pinned, setPinned] = useState<readonly string[] | undefined>(
    undefined,
  );

  /*
   * The order as it was last **drawn**, for the handler to pin.
   *
   * Written only in the effect below and read only in the callback, which is
   * the line the React Compiler's `refs` rule draws — a ref read during render
   * is what it rejected in `SecuritySearch`, correctly. Its whole job is to keep
   * the callback's identity stable: a callback that closed over `rows` would be
   * a new function sixteen times a minute, and `Region` binds its listeners to
   * the identity it is given.
   */
  const latest = useRef<readonly string[]>([]);

  useEffect(() => {
    latest.current = rows === undefined ? [] : rows.map((row) => row.symbol);
  }, [rows]);

  const onReaderWithin = useCallback((within: boolean) => {
    setPinned((previous) => {
      if (!within) return undefined;
      // **The first of the two sources to fire owns the pin**, so a reader who
      // hovers and then tabs in does not re-pin an order that has since moved —
      // the hold is one state with two ways in, not two holds.
      if (previous !== undefined) return previous;
      return latest.current.length === 0 ? undefined : latest.current;
    });
  }, []);

  return { pinned, held: pinned !== undefined, onReaderWithin };
}
