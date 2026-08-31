import type { Meta, StoryObj } from "@storybook/react-vite";

import { AnomalyBadge } from "../AnomalyBadge/AnomalyBadge.js";
import gridStyles from "../stories.module.css";
import { Popover } from "./Popover.js";

// The one component here whose permutations are not a finite set of variants,
// and saying so is more useful than pretending otherwise. A popover has no
// `variant` prop: what varies is the trigger it wraps, whether it has a title,
// and the length of what it says.
//
// So `AllPermutations` covers the two axes that can change the rendering —
// trigger shape and title present or absent — while content length is exercised
// as its own story. Reviewing a popover means opening it, which no grid can do
// for you, and that is the honest limit of a permutation grid on a component
// whose whole subject is a state change.
//
// Every story here is also the keyboard check, and it is the reason this
// component is a popover rather than a tooltip. Base UI's tooltip renders no
// `role="tooltip"` and wires no `aria-describedby` — by design, per its own
// documentation — so its content never reaches a screen reader. An anomaly
// explanation is required by PRODUCT_SPEC.md §11, which makes it exactly the
// content that documentation says not to hide in a tooltip. `Tab` reaches this
// trigger, the global `:focus-visible` rule draws the 2px near-black outline at
// 2px offset, and Enter or Space opens a popup that is in the accessibility
// tree.

const SHORT = "Clearly outside the historical distribution";

const LONG =
  "Volume is 4.1× this security's 20-day median for the same point in the " +
  "session, and the move is 3.2 standard deviations against its own history " +
  "rather than against the sector.";

const meta = {
  title: "Primitives/Popover",
  component: Popover,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Popover>;

export default meta;

type Story = StoryObj<typeof meta>;

export const OnText: Story = {
  args: { content: SHORT, children: "AAPL" },
};

export const OnBadge: Story = {
  args: {
    content: SHORT,
    children: <AnomalyBadge band="unusual" />,
  },
};

export const WithTitle: Story = {
  args: {
    title: "Why this band",
    content: SHORT,
    children: <AnomalyBadge band="unusual" />,
  },
};

export const LongContent: Story = {
  args: {
    title: "Why this band",
    content: LONG,
    children: <AnomalyBadge band="extreme" />,
  },
};

// Four cells rather than a mapped product, and deliberately so: `title` is
// optional under `exactOptionalPropertyTypes`, which means "absent" and
// "present as undefined" are different types. Mapping over a table of titles
// would have to pass one of them as `undefined` and fails to typecheck — the
// compiler making the same distinction the component's API does.
export const AllPermutations: Story = {
  args: { content: SHORT, children: "AAPL" },
  render: () => (
    <div className={gridStyles.grid}>
      <span className={gridStyles.label}>text trigger</span>
      <Popover content={SHORT}>AAPL</Popover>

      <span className={gridStyles.label}>text trigger + title</span>
      <Popover title="Why this band" content={SHORT}>
        AAPL
      </Popover>

      <span className={gridStyles.label}>badge trigger</span>
      <Popover content={SHORT}>
        <AnomalyBadge band="unusual" />
      </Popover>

      <span className={gridStyles.label}>badge trigger + title</span>
      <Popover title="Why this band" content={SHORT}>
        <AnomalyBadge band="unusual" />
      </Popover>
    </div>
  ),
};
