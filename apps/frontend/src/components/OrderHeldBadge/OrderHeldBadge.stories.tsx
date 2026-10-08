import type { Meta, StoryObj } from "@storybook/react-vite";

import { Region } from "../Region/Region.js";
import { OrderHeldBadge } from "./OrderHeldBadge.js";

// **The badge, in the slot it occupies, in both regions that have one** (Task
// 4.5.7).
//
// It takes no props and has one appearance, so the thing worth reviewing side by
// side is not the badge — it is **the head it sits in**. The defect Task 4.3.6
// found in a browser was four pixels of head height moving eleven rows, and the
// only way to see it is the badge inside a real `Region` head beside the
// region's own name.
//
// Both regions reserve the slot's room in their own stylesheet, so the pair
// below is also the check that the two reserves agree: `Sector performance` and
// `Movers` are the two heads this string ever appears in, and `Movers`' slot was
// re-measured in Task 4.5.7 rather than inheriting the sector figure.
const meta = {
  title: "Overview/OrderHeldBadge",
  component: OrderHeldBadge,
  parameters: { layout: "padded" },
} satisfies Meta<typeof OrderHeldBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The badge alone, which is every state it has. */
export const Badge: Story = {};

/** In the sector region's head, beside the region's name. */
export const InTheSectorHead: Story = {
  render: () => (
    <Region name="Sector performance" meta={<OrderHeldBadge />}>
      <p>Eleven rows, standing still.</p>
    </Region>
  ),
};

/** In the movers region's head — the second home, and the reason it is shared. */
export const InTheMoversHead: Story = {
  render: () => (
    <Region name="Movers" meta={<OrderHeldBadge />}>
      <p>Two lists, both standing still.</p>
    </Region>
  ),
};
