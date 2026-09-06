import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { Fragment } from "react";

import gridStyles from "../stories.module.css";
import { MARKER_SHAPES, Marker } from "./Marker.js";
import styles from "./Marker.stories.module.css";

// Four silhouettes, and this is the one place all four are visible at once.
//
// It is worth having for a reason the four consuming components' own grids are
// not: each of them shows the shapes it happens to use, in its own colours,
// mixed in with its own words. This shows the **language** — which is what the
// component owns and what the consumers only borrow.
//
// The colours here are deliberately the neutral ink rather than any of the four
// semantic trios. `Marker` takes no colour prop: it reads `--marker-color` from
// whatever carries the state class above it, so a story has to set one, and
// setting a *market* colour here would suggest this primitive knows about the
// market. It does not, and that is the whole point of the split.

// The custom property has to come from somewhere. In the application it is the
// consumer's state class; here it is one wrapper, so every specimen is the same
// ink and only the silhouette varies — which is the comparison.
//
// **Named rather than written inline**, which is the documented TS2883 idiom:
// an inline decorator makes the inferred type of `meta` unnameable ("cannot be
// named without a reference to `PartialStoryFn` ... this is likely not
// portable") and fails `pnpm build` at exit 2. Written inline here first, and it
// failed exactly as recorded.
const withInk: Decorator = (Story) => (
  <div className={styles.ink}>
    <Story />
  </div>
);

const meta = {
  title: "Status/Marker",
  component: Marker,
  parameters: { layout: "padded" },
  decorators: [withInk],
  args: { shape: "disc" },
} satisfies Meta<typeof Marker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Disc: Story = { args: { shape: "disc" } };
export const Ring: Story = { args: { shape: "ring" } };
export const Dashed: Story = { args: { shape: "dashed" } };
export const Square: Story = { args: { shape: "square" } };

export const AllPermutations: Story = {
  render: () => (
    <div className={gridStyles.grid}>
      {MARKER_SHAPES.map((shape) => (
        <Fragment key={shape}>
          <span className={gridStyles.label}>{shape}</span>
          <span className={styles.ink}>
            <Marker shape={shape} />
          </span>
        </Fragment>
      ))}

      {/*
        The amber, once, on the one silhouette that uses it in the application.
        It is here rather than in the grid above because it is the exception the
        square exists for: `BackendIndicator`'s `degraded` is the only state in
        the product that takes a colour a glance should land on, and the shape
        has to carry it on its own regardless.
      */}
      <span className={gridStyles.label}>square, in use</span>
      <span className={styles.attention}>
        <Marker shape="square" />
      </span>
    </div>
  ),
};
