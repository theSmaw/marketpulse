import { Popover as BasePopover } from "@base-ui/react/popover";
import type { ReactNode } from "react";

import styles from "./Popover.module.css";

// The seam. This is the only file in the application allowed to import from
// `@base-ui/react`, and that restriction is the entire reason Base UI was
// chosen over a lighter alternative.
//
// Task 1.4.1 reversed a Radix decision here, and not on the measurements —
// Radix was lighter by 37 kB for one primitive and 46 kB for three. It was
// reversed on the intention to plug an existing Base-UI-based shared component
// library into this product later. That swap is only cheap if call sites import
// *this* file rather than the primitive; otherwise the weight is paid for and
// never collected. So: every Base UI usage sits behind a wrapper of ours, and a
// component reaching past one is the mistake to catch in review.
//
// **This was a Tooltip until it was measured, and the swap is the finding of
// Task 1.4.5.** Base UI's tooltip renders no `role="tooltip"` and wires no
// `aria-describedby` — verified in the browser against the built workshop, then
// confirmed as deliberate in the library's own documentation: "Tooltips are
// designed for sighted users and are not a reliable way to deliver important
// information to touch users or assistive technologies. If the description is
// important to understanding the element, don't hide it behind a tooltip."
//
// The first thing this seam carries is an anomaly score's explanation, and
// PRODUCT_SPEC.md §11 requires every score to carry one. That makes the
// explanation important by definition, so the tooltip was the wrong primitive
// and the popover is the right one: its content is in the accessibility tree,
// its `Title` and `Description` parts wire `aria-labelledby` and
// `aria-describedby` onto the popup, and it opens on click and on Enter or
// Space rather than on hover alone.
//
// The cost, stated: a popover is a deliberate interaction where a tooltip was a
// glance. In a dense table that is the right trade for an explanation and the
// wrong one for a hint, so a hint — if one is ever needed — should come back
// here as a second wrapper rather than as a looser version of this one.
//
// The wrapper stays thin. It owns the seam, not behaviour: no state, no side
// effects, no opinion about placement beyond the offset. It does not render
// `Popover.Backdrop` or `Popover.Close`, because neither has a caller yet.

export interface PopoverProps {
  /**
   * The popup's heading. Optional, and it becomes the popup's accessible name
   * through Base UI's `Popover.Title`.
   */
  readonly title?: string;

  /**
   * What the popup says. A node rather than a string because an anomaly
   * explanation will grow a figure and a unit before Epic 5 is done.
   */
  readonly content: ReactNode;

  /**
   * The trigger's content. Base UI renders the trigger as a `<button>`, which
   * is what makes this reachable by keyboard rather than pointer-only.
   */
  readonly children: ReactNode;
}

export function Popover({ title, content, children }: PopoverProps) {
  return (
    <BasePopover.Root>
      <BasePopover.Trigger className={styles.trigger}>
        {children}
      </BasePopover.Trigger>
      <BasePopover.Portal>
        <BasePopover.Positioner sideOffset={8}>
          <BasePopover.Popup className={styles.popup}>
            {title !== undefined && (
              <BasePopover.Title className={styles.title}>
                {title}
              </BasePopover.Title>
            )}
            <BasePopover.Description className={styles.description}>
              {content}
            </BasePopover.Description>
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  );
}
