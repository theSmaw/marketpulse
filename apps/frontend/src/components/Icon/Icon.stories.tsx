import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fragment } from "react";

import gridStyles from "../stories.module.css";
import { ICON_NAMES, Icon } from "./Icon.js";

// The whole set, in one column.
//
// The permutation grid here is doing something the other components' grids are
// not: an icon set's defect is **inconsistency** — one glyph drawn at a
// different optical weight, or on a different grid, than the rest — and that is
// invisible one icon at a time and obvious in a row.
//
// There is no size axis, deliberately, and its absence is the component's API
// showing through: an icon is `1em` and takes no size prop, so "at 11px" is not
// a thing this component can be asked for. The place those sizes are reviewable
// is the consuming component's own grid — `Button`'s, where the icon is set at
// the control's type size — which is also where a stroke that goes muddy would
// actually be seen.

const meta = {
  title: "Foundations/Icon",
  component: Icon,
  parameters: { layout: "padded" },
  args: { name: "arrowRight" },
} satisfies Meta<typeof Icon>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Mark: Story = { args: { name: "pulse" } };
export const ArrowRight: Story = { args: { name: "arrowRight" } };
export const Alert: Story = { args: { name: "alert" } };

// The sixth, added 2026-09-11 for `TextField` and the only member added since
// the refresh closed the set. It has a story of its own rather than living only
// in the grid below because it is the one glyph in the set drawn from a
// different source — the canonical 24x24 magnifier every mainstream set ships —
// and "does it sit at the same optical weight as the other five?" is the
// question its addition has to answer.
export const Magnifier: Story = { args: { name: "magnifier" } };

export const AllPermutations: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className={gridStyles.stack}>
      <div className={gridStyles.stackItem}>
        <p className={gridStyles.label}>The set</p>
        <div className={gridStyles.grid}>
          {ICON_NAMES.map((name) => (
            // A `Fragment` with a key rather than `<>`: the grid is a two-column
            // `display: grid`, so the label and the specimen have to be siblings
            // of the grid itself rather than wrapped in an element of their own.
            <Fragment key={name}>
              <span className={gridStyles.label}>{name}</span>
              <span>
                <Icon name={name} />
              </span>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  ),
};
